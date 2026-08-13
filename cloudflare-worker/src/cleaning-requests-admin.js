const REQUEST_COLLECTION_PATH =
  "/admin/api/cleaning-requests";

const REQUEST_STATUSES = new Set([
  "new",
  "needs_review",
  "contacted",
  "accepted",
  "declined",
  "converted",
  "archived",
]);

export function isCleaningRequestsAdminRoute(
  request,
  url
) {
  return (
    url.pathname === REQUEST_COLLECTION_PATH ||
    /^\/admin\/api\/cleaning-requests\/[^/]+(?:\/convert)?$/.test(
      url.pathname
    )
  );
}

export async function handleCleaningRequestsAdminRoute({
  request,
  url,
  env,
  actorEmail,
  origin,
  jsonResponse,
  HttpError,
}) {
  if (!env.DB) {
    throw new Error("D1 binding DB is unavailable.");
  }

  if (
    request.method === "GET" &&
    url.pathname === REQUEST_COLLECTION_PATH
  ) {
    return listRequests(
      url,
      env,
      origin,
      jsonResponse,
      HttpError
    );
  }

  const match = url.pathname.match(
    /^\/admin\/api\/cleaning-requests\/([^/]+)(?:\/(convert))?$/
  );

  if (!match) {
    throw new HttpError(404, "Cleaning request endpoint was not found.");
  }

  const requestId = decodeIdentifier(
    match[1],
    "Cleaning request ID",
    HttpError
  );
  const action = match[2] || "";

  if (request.method === "GET" && !action) {
    return getRequest(
      requestId,
      env,
      origin,
      jsonResponse,
      HttpError
    );
  }

  if (request.method === "PATCH" && !action) {
    return updateRequest(
      request,
      requestId,
      env,
      actorEmail,
      origin,
      jsonResponse,
      HttpError
    );
  }

  if (
    request.method === "POST" &&
    action === "convert"
  ) {
    return convertRequest(
      request,
      requestId,
      env,
      actorEmail,
      origin,
      jsonResponse,
      HttpError
    );
  }

  throw new HttpError(
    405,
    "Method is not supported for this endpoint."
  );
}

async function listRequests(
  url,
  env,
  origin,
  jsonResponse,
  HttpError
) {
  const status = normalizeOptionalStatus(
    url.searchParams.get("status"),
    HttpError
  );
  const search = String(
    url.searchParams.get("search") || ""
  ).trim();
  const limit = boundedInteger(
    url.searchParams.get("limit"),
    25,
    1,
    100,
    "limit",
    HttpError
  );
  const offset = boundedInteger(
    url.searchParams.get("offset"),
    0,
    0,
    100000,
    "offset",
    HttpError
  );

  const conditions = [
    "r.deleted_at IS NULL",
  ];
  const parameters = [];

  if (status) {
    conditions.push("r.status = ?");
    parameters.push(status);
  } else {
    conditions.push("r.status <> 'archived'");
  }

  if (search) {
    const pattern =
      `%${escapeLikePattern(search)}%`;

    conditions.push(`
      (
        r.submitted_first_name
          LIKE ? ESCAPE '\\' COLLATE NOCASE
        OR r.submitted_last_name
          LIKE ? ESCAPE '\\' COLLATE NOCASE
        OR r.submitted_email
          LIKE ? ESCAPE '\\' COLLATE NOCASE
        OR r.submitted_phone
          LIKE ? ESCAPE '\\' COLLATE NOCASE
        OR r.requested_service_type
          LIKE ? ESCAPE '\\' COLLATE NOCASE
        OR r.submitted_city
          LIKE ? ESCAPE '\\' COLLATE NOCASE
      )
    `);

    parameters.push(
      pattern,
      pattern,
      pattern,
      pattern,
      pattern,
      pattern
    );
  }

  const whereClause = conditions.join("\nAND ");

  const [rowsResult, countResult] =
    await Promise.all([
      env.DB.prepare(
        `
          SELECT
            r.id,
            r.client_id,
            r.converted_service_id,
            r.submitted_first_name,
            r.submitted_last_name,
            r.submitted_email,
            r.submitted_phone,
            r.submitted_city,
            r.submitted_state,
            r.requested_service_type,
            r.preferred_date,
            r.preferred_time_window,
            r.preferred_contact_method,
            r.match_status,
            r.status,
            r.mailing_list_opt_in,
            r.created_at,
            r.updated_at,
            r.version
          FROM cleaning_requests AS r
          WHERE ${whereClause}
          ORDER BY
            CASE r.status
              WHEN 'needs_review' THEN 0
              WHEN 'new' THEN 1
              WHEN 'contacted' THEN 2
              WHEN 'accepted' THEN 3
              WHEN 'declined' THEN 4
              WHEN 'converted' THEN 5
              ELSE 6
            END,
            datetime(r.created_at) DESC
          LIMIT ?
          OFFSET ?
        `
      )
        .bind(
          ...parameters,
          limit,
          offset
        )
        .all(),

      env.DB.prepare(
        `
          SELECT COUNT(*) AS total
          FROM cleaning_requests AS r
          WHERE ${whereClause}
        `
      )
        .bind(...parameters)
        .first(),
    ]);

  const requests = Array.isArray(
    rowsResult.results
  )
    ? rowsResult.results
    : [];

  const total = Number(
    countResult?.total || 0
  );

  return jsonResponse(
    {
      success: true,
      message:
        "Cleaning requests retrieved successfully.",
      data: { requests },
      metadata: {
        status,
        search,
        limit,
        offset,
        returned: requests.length,
        total,
        hasMore:
          offset + requests.length < total,
      },
      timestamp: new Date().toISOString(),
    },
    200,
    origin
  );
}

async function getRequest(
  requestId,
  env,
  origin,
  jsonResponse,
  HttpError
) {
  const cleaningRequest =
    await selectRequest(env.DB, requestId);

  if (!cleaningRequest) {
    throw new HttpError(
      404,
      "Cleaning request was not found."
    );
  }

  return jsonResponse(
    {
      success: true,
      message:
        "Cleaning request retrieved successfully.",
      data: {
        request: mapRequestDetail(
          cleaningRequest
        ),
      },
      metadata: {},
      timestamp: new Date().toISOString(),
    },
    200,
    origin
  );
}

async function updateRequest(
  request,
  requestId,
  env,
  actorEmail,
  origin,
  jsonResponse,
  HttpError
) {
  const body = await readJsonObject(
    request,
    64 * 1024,
    HttpError
  );

  const allowed = new Set([
    "version",
    "status",
    "internalNotes",
  ]);

  rejectUnexpectedFields(
    body,
    allowed,
    HttpError
  );

  const version = requiredVersion(
    body.version,
    HttpError
  );

  const existing =
    await selectRequest(env.DB, requestId);

  if (!existing) {
    throw new HttpError(
      404,
      "Cleaning request was not found."
    );
  }

  if (
    !Object.prototype.hasOwnProperty.call(
      body,
      "status"
    ) &&
    !Object.prototype.hasOwnProperty.call(
      body,
      "internalNotes"
    )
  ) {
    throw new HttpError(
      400,
      "Provide status or internalNotes."
    );
  }

  const status =
    Object.prototype.hasOwnProperty.call(
      body,
      "status"
    )
      ? normalizeRequiredStatus(
          body.status,
          HttpError
        )
      : existing.status;

  if (
    existing.status === "converted" &&
    Object.prototype.hasOwnProperty.call(
      body,
      "status"
    )
  ) {
    throw new HttpError(
      409,
      "A converted request's status is managed by its linked service."
    );
  }

  if (status === "converted") {
    throw new HttpError(
      400,
      "Use Accept & Create Service to convert a request."
    );
  }

  const internalNotes =
    Object.prototype.hasOwnProperty.call(
      body,
      "internalNotes"
    )
      ? optionalText(
          body.internalNotes,
          "internalNotes",
          10000,
          HttpError
        )
      : existing.internal_notes;

  const result = await env.DB.prepare(
    `
      UPDATE cleaning_requests
      SET
        status = ?,
        internal_notes = ?,
        updated_at = datetime('now'),
        updated_by = ?,
        version = version + 1
      WHERE id = ?
        AND deleted_at IS NULL
        AND version = ?
    `
  )
    .bind(
      status,
      internalNotes,
      actorEmail,
      requestId,
      version
    )
    .run();

  ensureSingleChange(
    result,
    existing,
    "Cleaning request",
    HttpError
  );

  const updated =
    await selectRequest(env.DB, requestId);

  return jsonResponse(
    {
      success: true,
      message:
        "Cleaning request updated successfully.",
      data: {
        request: mapRequestDetail(updated),
      },
      metadata: {},
      timestamp: new Date().toISOString(),
    },
    200,
    origin
  );
}

async function convertRequest(
  request,
  requestId,
  env,
  actorEmail,
  origin,
  jsonResponse,
  HttpError
) {
  const body = await readJsonObject(
    request,
    64 * 1024,
    HttpError
  );

  const allowed = new Set([
    "version",
    "serviceType",
    "scheduledStart",
    "scheduledEnd",
    "priceCents",
    "notes",
  ]);

  rejectUnexpectedFields(
    body,
    allowed,
    HttpError
  );

  const version = requiredVersion(
    body.version,
    HttpError
  );

  const existing =
    await selectRequest(env.DB, requestId);

  if (!existing) {
    throw new HttpError(
      404,
      "Cleaning request was not found."
    );
  }

  if (!existing.client_id) {
    throw new HttpError(
      409,
      "Resolve the client match conflict before converting this request."
    );
  }

  if (existing.converted_service_id) {
    throw new HttpError(
      409,
      `This request is already linked to service ${existing.converted_service_id}.`
    );
  }

  if (
    ["declined", "archived", "converted"].includes(
      existing.status
    )
  ) {
    throw new HttpError(
      409,
      `A ${existing.status} request cannot be converted.`
    );
  }

  const client = await env.DB.prepare(
    `
      SELECT id
      FROM clients
      WHERE id = ?
        AND deleted_at IS NULL
      LIMIT 1
    `
  )
    .bind(existing.client_id)
    .first();

  if (!client) {
    throw new HttpError(
      409,
      "The linked client is no longer active."
    );
  }

  const serviceType = optionalText(
    body.serviceType,
    "serviceType",
    150,
    HttpError
  ) || existing.requested_service_type;

  if (!serviceType) {
    throw new HttpError(
      400,
      "serviceType is required."
    );
  }

  const scheduledStart = normalizeDateTime(
    body.scheduledStart,
    "scheduledStart",
    true,
    HttpError
  );
  const scheduledEnd = normalizeDateTime(
    body.scheduledEnd,
    "scheduledEnd",
    false,
    HttpError
  );

  if (
    scheduledEnd &&
    Date.parse(scheduledEnd) <=
      Date.parse(scheduledStart)
  ) {
    throw new HttpError(
      400,
      "scheduledEnd must be later than scheduledStart."
    );
  }

  const priceCents = optionalNonNegativeInteger(
    body.priceCents,
    "priceCents",
    HttpError
  );

  if (priceCents === null) {
    throw new HttpError(
      400,
      "priceCents is required when accepting a cleaning request."
    );
  }

  const notes = optionalText(
    body.notes,
    "notes",
    5000,
    HttpError
  );

  const serviceId =
    `svc_${crypto.randomUUID()}`;

  const results = await env.DB.batch([
    env.DB.prepare(
      `
        INSERT INTO services (
          id,
          client_id,
          service_type,
          status,
          scheduled_start,
          scheduled_end,
          price_cents,
          notes,
          created_by,
          updated_by
        ) VALUES (?, ?, ?, 'scheduled', ?, ?, ?, ?, ?, ?)
      `
    ).bind(
      serviceId,
      existing.client_id,
      serviceType,
      scheduledStart,
      scheduledEnd,
      priceCents,
      notes,
      actorEmail,
      actorEmail
    ),

    env.DB.prepare(
      `
        UPDATE cleaning_requests
        SET
          converted_service_id = ?,
          status = 'converted',
          updated_at = datetime('now'),
          updated_by = ?,
          version = version + 1
        WHERE id = ?
          AND deleted_at IS NULL
          AND converted_service_id IS NULL
          AND version = ?
      `
    ).bind(
      serviceId,
      actorEmail,
      requestId,
      version
    ),
  ]);

  const inserted = Number(
    results?.[0]?.meta?.changes || 0
  );
  const converted = Number(
    results?.[1]?.meta?.changes || 0
  );

  if (inserted !== 1 || converted !== 1) {
    await env.DB.prepare(
      `
        UPDATE services
        SET
          deleted_at = datetime('now'),
          updated_at = datetime('now'),
          updated_by = ?
        WHERE id = ?
          AND deleted_at IS NULL
      `
    )
      .bind(actorEmail, serviceId)
      .run();

    const current =
      await selectRequest(env.DB, requestId);

    if (!current) {
      throw new HttpError(
        404,
        "Cleaning request was not found."
      );
    }

    throw new HttpError(
      409,
      `Cleaning request changed while it was being converted. Current version is ${current.version}.`
    );
  }

  const service = await env.DB.prepare(
    `
      SELECT
        s.id,
        s.client_id,
        s.service_type,
        s.status,
        s.scheduled_start,
        s.scheduled_end,
        s.price_cents,
        s.notes,
        s.created_at,
        s.version
      FROM services AS s
      WHERE s.id = ?
        AND s.deleted_at IS NULL
      LIMIT 1
    `
  )
    .bind(serviceId)
    .first();

  const updated =
    await selectRequest(env.DB, requestId);

  return jsonResponse(
    {
      success: true,
      message:
        "Cleaning request accepted and service created.",
      data: {
        request: mapRequestDetail(updated),
        service,
      },
      metadata: {},
      timestamp: new Date().toISOString(),
    },
    201,
    origin
  );
}

async function selectRequest(db, requestId) {
  return db.prepare(
    `
      SELECT
        r.*,
        c.first_name AS client_first_name,
        c.last_name AS client_last_name,
        c.email AS client_email,
        c.phone AS client_phone,
        s.service_type AS converted_service_type,
        s.scheduled_start AS converted_service_start,
        s.status AS converted_service_status
      FROM cleaning_requests AS r
      LEFT JOIN clients AS c
        ON c.id = r.client_id
        AND c.deleted_at IS NULL
      LEFT JOIN services AS s
        ON s.id = r.converted_service_id
        AND s.deleted_at IS NULL
      WHERE r.id = ?
        AND r.deleted_at IS NULL
      LIMIT 1
    `
  )
    .bind(requestId)
    .first();
}

function mapRequestDetail(row) {
  if (!row) {
    return null;
  }

  let addOns = [];

  try {
    const parsed = JSON.parse(
      row.requested_add_ons || "[]"
    );
    addOns = Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    addOns = [];
  }

  return {
    ...row,
    requested_add_ons: addOns,
    mailing_list_opt_in:
      Number(row.mailing_list_opt_in || 0) === 1,
  };
}

function ensureSingleChange(
  result,
  existing,
  entityName,
  HttpError
) {
  if (
    Number(result.meta?.changes || 0) === 1
  ) {
    return;
  }

  throw new HttpError(
    409,
    `${entityName} has changed since it was loaded. Current version is ${existing.version}.`
  );
}

function normalizeOptionalStatus(
  value,
  HttpError
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  return normalizeRequiredStatus(
    value,
    HttpError
  );
}

function normalizeRequiredStatus(
  value,
  HttpError
) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (!REQUEST_STATUSES.has(normalized)) {
    throw new HttpError(
      400,
      "status must be new, needs_review, contacted, accepted, declined, converted, or archived."
    );
  }

  return normalized;
}

function decodeIdentifier(
  encoded,
  label,
  HttpError
) {
  let value;

  try {
    value = decodeURIComponent(encoded).trim();
  } catch {
    throw new HttpError(
      400,
      `${label} is invalid.`
    );
  }

  if (
    !value ||
    value.length > 100 ||
    !/^[A-Za-z0-9_-]+$/.test(value)
  ) {
    throw new HttpError(
      400,
      `${label} is invalid.`
    );
  }

  return value;
}

async function readJsonObject(
  request,
  maximumBytes,
  HttpError
) {
  const bytes = await request.arrayBuffer();

  if (bytes.byteLength > maximumBytes) {
    throw new HttpError(
      413,
      "Request body is too large."
    );
  }

  let body;

  try {
    body = JSON.parse(
      new TextDecoder().decode(bytes)
    );
  } catch {
    throw new HttpError(
      400,
      "Request body must be valid JSON."
    );
  }

  if (
    !body ||
    Array.isArray(body) ||
    typeof body !== "object"
  ) {
    throw new HttpError(
      400,
      "Request body must be a JSON object."
    );
  }

  return body;
}

function rejectUnexpectedFields(
  body,
  allowed,
  HttpError
) {
  const unexpected = Object.keys(body).filter(
    (field) => !allowed.has(field)
  );

  if (unexpected.length) {
    throw new HttpError(
      400,
      `Unexpected field${unexpected.length === 1 ? "" : "s"}: ${unexpected.join(", ")}.`
    );
  }
}

function requiredVersion(value, HttpError) {
  if (
    !Number.isSafeInteger(value) ||
    value < 1
  ) {
    throw new HttpError(
      400,
      "version must be a positive whole number."
    );
  }

  return value;
}

function optionalText(
  value,
  fieldName,
  maximumLength,
  HttpError
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (typeof value !== "string") {
    throw new HttpError(
      400,
      `${fieldName} must be text.`
    );
  }

  const normalized = value.trim();

  if (normalized.length > maximumLength) {
    throw new HttpError(
      400,
      `${fieldName} cannot exceed ${maximumLength} characters.`
    );
  }

  return normalized || null;
}

function normalizeDateTime(
  value,
  fieldName,
  required,
  HttpError
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    if (required) {
      throw new HttpError(
        400,
        `${fieldName} is required.`
      );
    }

    return null;
  }

  const timestamp = Date.parse(
    String(value).trim()
  );

  if (!Number.isFinite(timestamp)) {
    throw new HttpError(
      400,
      `${fieldName} must be a valid date-time.`
    );
  }

  return new Date(timestamp).toISOString();
}

function optionalNonNegativeInteger(
  value,
  fieldName,
  HttpError
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new HttpError(
      400,
      `${fieldName} must be a non-negative whole number.`
    );
  }

  return value;
}

function boundedInteger(
  raw,
  defaultValue,
  minimum,
  maximum,
  fieldName,
  HttpError
) {
  if (raw === null || raw === "") {
    return defaultValue;
  }

  if (!/^\d+$/.test(raw)) {
    throw new HttpError(
      400,
      `${fieldName} must be a whole number.`
    );
  }

  const value = Number(raw);

  if (
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new HttpError(
      400,
      `${fieldName} must be between ${minimum} and ${maximum}.`
    );
  }

  return value;
}

function escapeLikePattern(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}
