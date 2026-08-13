const ADMIN_COLLECTION_PATH =
  "/admin/api/review-requests";

const PUBLIC_PATH_PREFIX =
  "/api/review/";

const PUBLIC_REVIEW_ACTOR =
  "public-review-request";

const TOKEN_BYTES = 32;
const TOKEN_MAX_LENGTH = 200;
const REVIEW_REQUEST_DAYS = 30;
const MAX_PUBLIC_BODY_BYTES = 24 * 1024;
const MAX_ADMIN_BODY_BYTES = 24 * 1024;

export function isAdminReviewRequestsRoute(
  request,
  url
) {
  return (
    url.pathname ===
      ADMIN_COLLECTION_PATH &&
    ["GET", "POST"].includes(
      request.method
    )
  );
}

export function isPublicReviewRequestRoute(
  request,
  url
) {
  return (
    url.pathname.startsWith(
      PUBLIC_PATH_PREFIX
    ) &&
    ["GET", "POST"].includes(
      request.method
    )
  );
}

export async function handleAdminReviewRequestsRoute({
  request,
  url,
  env,
  actorEmail,
  origin,
  jsonResponse,
  HttpError,
}) {
  if (!env.DB) {
    throw new Error(
      "D1 binding DB is unavailable."
    );
  }

  if (request.method === "GET") {
    return await listReviewRequests({
      url,
      env,
      origin,
      jsonResponse,
      HttpError,
    });
  }

  return await createReviewRequest({
    request,
    env,
    actorEmail,
    origin,
    jsonResponse,
    HttpError,
  });
}

export async function handlePublicReviewRequestRoute({
  request,
  url,
  env,
  origin,
  jsonResponse,
  HttpError,
}) {
  if (!env.DB) {
    throw new Error(
      "D1 binding DB is unavailable."
    );
  }

  const token = readTokenFromPath(
    url.pathname,
    HttpError
  );

  const tokenHash =
    await hashToken(token);

  const row =
    await loadRequestByTokenHash(
      env,
      tokenHash
    );

  if (!row) {
    throw new HttpError(
      404,
      "This review request was not found."
    );
  }

  if (row.status === "submitted") {
    throw new HttpError(
      409,
      "This review request has already been completed."
    );
  }

  if (row.status !== "pending") {
    throw new HttpError(
      410,
      "This review request is no longer active."
    );
  }

  if (
    Date.parse(row.expires_at) <=
    Date.now()
  ) {
    await env.DB.prepare(
      `
        UPDATE review_requests
        SET
          status = 'expired',
          updated_at = datetime('now'),
          updated_by = ?
        WHERE id = ?
          AND status = 'pending'
      `
    )
      .bind(
        PUBLIC_REVIEW_ACTOR,
        row.id
      )
      .run();

    throw new HttpError(
      410,
      "This review request has expired."
    );
  }

  if (request.method === "GET") {
    return jsonResponse(
      {
        success: true,
        message:
          "Review request retrieved successfully.",
        data: {
          request: {
            reviewerName:
              buildReviewerName(
                row.client_first_name,
                row.client_last_name
              ),
            serviceType:
              row.service_type,
            completedAt:
              row.completed_at,
            expiresAt:
              row.expires_at,
          },
        },
        metadata: {},
        timestamp:
          new Date().toISOString(),
      },
      200,
      origin
    );
  }

  return await submitReview({
    request,
    row,
    env,
    origin,
    jsonResponse,
    HttpError,
  });
}

async function listReviewRequests({
  url,
  env,
  origin,
  jsonResponse,
  HttpError,
}) {
  const limit =
    parseBoundedInteger(
      url.searchParams.get(
        "limit"
      ),
      25,
      1,
      100,
      "limit",
      HttpError
    );

  const offset =
    parseBoundedInteger(
      url.searchParams.get(
        "offset"
      ),
      0,
      0,
      100000,
      "offset",
      HttpError
    );

  const status =
    normalizeOptionalStatus(
      url.searchParams.get(
        "status"
      ),
      HttpError
    );

  const conditions = [];
  const parameters = [];

  if (status) {
    conditions.push(
      "rr.status = ?"
    );
    parameters.push(status);
  }

  const whereClause =
    conditions.length
      ? `WHERE ${conditions.join(
          " AND "
        )}`
      : "";

  const [rowsResult, countResult] =
    await Promise.all([
      env.DB.prepare(
        `
          SELECT
            rr.id,
            rr.client_id,
            rr.service_id,
            rr.status,
            rr.expires_at,
            rr.submitted_at,
            rr.review_id,
            rr.created_at,
            rr.updated_at,
            rr.version,

            c.first_name
              AS client_first_name,
            c.last_name
              AS client_last_name,
            c.email
              AS client_email,

            s.service_type,
            s.completed_at

          FROM review_requests
            AS rr

          INNER JOIN clients AS c
            ON c.id = rr.client_id
            AND c.deleted_at IS NULL

          INNER JOIN services AS s
            ON s.id = rr.service_id
            AND s.deleted_at IS NULL

          ${whereClause}

          ORDER BY
            datetime(
              rr.created_at
            ) DESC

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
          SELECT
            COUNT(*) AS total
          FROM review_requests
            AS rr
          ${whereClause}
        `
      )
        .bind(
          ...parameters
        )
        .first(),
    ]);

  const requests =
    Array.isArray(
      rowsResult.results
    )
      ? rowsResult.results
      : [];

  const total =
    Number(
      countResult?.total || 0
    );

  return jsonResponse(
    {
      success: true,
      message:
        "Review requests retrieved successfully.",
      data: {
        requests,
      },
      metadata: {
        status,
        limit,
        offset,
        returned:
          requests.length,
        total,
        hasMore:
          offset +
            requests.length <
          total,
      },
      timestamp:
        new Date().toISOString(),
    },
    200,
    origin
  );
}

async function createReviewRequest({
  request,
  env,
  actorEmail,
  origin,
  jsonResponse,
  HttpError,
}) {
  const body =
    await readJsonObject(
      request,
      MAX_ADMIN_BODY_BYTES,
      HttpError
    );

  const unexpected =
    Object.keys(body).filter(
      (key) =>
        key !== "serviceId"
    );

  if (unexpected.length) {
    throw new HttpError(
      400,
      `Unexpected field${
        unexpected.length === 1
          ? ""
          : "s"
      }: ${unexpected.join(", ")}.`
    );
  }

  const serviceId =
    requireIdentifier(
      body.serviceId,
      "serviceId",
      HttpError
    );

  const service =
    await env.DB.prepare(
      `
        SELECT
          s.id,
          s.client_id,
          s.service_type,
          s.status,
          s.completed_at,

          c.first_name
            AS client_first_name,
          c.last_name
            AS client_last_name,
          c.email
            AS client_email

        FROM services AS s

        INNER JOIN clients AS c
          ON c.id = s.client_id

        WHERE s.id = ?
          AND s.deleted_at
            IS NULL
          AND c.deleted_at
            IS NULL

        LIMIT 1
      `
    )
      .bind(serviceId)
      .first();

  if (!service) {
    throw new HttpError(
      404,
      "Service was not found."
    );
  }

  if (
    service.status !==
    "completed"
  ) {
    throw new HttpError(
      409,
      "A review request may only be created for a completed service."
    );
  }

  if (
    !String(
      service.client_email || ""
    ).trim()
  ) {
    throw new HttpError(
      409,
      "The linked client does not have an email address."
    );
  }

  const existingReview =
    await env.DB.prepare(
      `
        SELECT id
        FROM reviews
        WHERE service_id = ?
          AND deleted_at
            IS NULL
        LIMIT 1
      `
    )
      .bind(serviceId)
      .first();

  if (existingReview) {
    throw new HttpError(
      409,
      "A review already exists for this service."
    );
  }

  await env.DB.prepare(
    `
      UPDATE review_requests
      SET
        status = 'revoked',
        updated_at =
          datetime('now'),
        updated_by = ?,
        version =
          version + 1
      WHERE service_id = ?
        AND status = 'pending'
    `
  )
    .bind(
      actorEmail,
      serviceId
    )
    .run();

  const token =
    createRandomToken();

  const tokenHash =
    await hashToken(token);

  const requestId =
    `rr_${crypto.randomUUID()}`;

  const expiresAt =
    new Date(
      Date.now() +
        REVIEW_REQUEST_DAYS *
          24 *
          60 *
          60 *
          1000
    ).toISOString();

  await env.DB.prepare(
    `
      INSERT INTO
        review_requests (
          id,
          client_id,
          service_id,
          token_hash,
          status,
          expires_at,
          created_by,
          updated_by
        )
      VALUES (
        ?, ?, ?, ?,
        'pending',
        ?, ?, ?
      )
    `
  )
    .bind(
      requestId,
      service.client_id,
      service.id,
      tokenHash,
      expiresAt,
      actorEmail,
      actorEmail
    )
    .run();

  const reviewUrl =
    `https://www.tidybytabb.com/review.html?token=${encodeURIComponent(
      token
    )}`;

  return jsonResponse(
    {
      success: true,
      message:
        "Review request created successfully.",
      data: {
        request: {
          id:
            requestId,
          clientId:
            service.client_id,
          serviceId:
            service.id,
          clientName:
            [
              service
                .client_first_name,
              service
                .client_last_name,
            ]
              .filter(Boolean)
              .join(" "),
          clientEmail:
            service.client_email,
          serviceType:
            service.service_type,
          completedAt:
            service.completed_at,
          status:
            "pending",
          expiresAt,
          reviewUrl,
        },
      },
      metadata: {},
      timestamp:
        new Date().toISOString(),
    },
    201,
    origin
  );
}

async function submitReview({
  request,
  row,
  env,
  origin,
  jsonResponse,
  HttpError,
}) {
  const body =
    await readJsonObject(
      request,
      MAX_PUBLIC_BODY_BYTES,
      HttpError
    );

  const allowed =
    new Set([
      "reviewerName",
      "rating",
      "reviewText",
    ]);

  const unexpected =
    Object.keys(body).filter(
      (key) =>
        !allowed.has(key)
    );

  if (unexpected.length) {
    throw new HttpError(
      400,
      `Unexpected field${
        unexpected.length === 1
          ? ""
          : "s"
      }: ${unexpected.join(", ")}.`
    );
  }

  const reviewerName =
    requireText(
      body.reviewerName,
      "reviewerName",
      200,
      HttpError
    );

  const rating =
    parseRating(
      body.rating,
      HttpError
    );

  const reviewText =
    requireText(
      body.reviewText,
      "reviewText",
      10000,
      HttpError
    );

  const reviewId =
    `rev_${crypto.randomUUID()}`;

  const now =
    new Date().toISOString();

  const [
    reviewInsert,
    requestUpdate,
  ] =
    await env.DB.batch([
      env.DB.prepare(
        `
          INSERT INTO reviews (
            id,
            client_id,
            service_id,
            reviewer_name,
            rating,
            review_text,
            source,
            review_date,
            status,
            created_by,
            updated_by
          )
          VALUES (
            ?, ?, ?, ?, ?, ?,
            NULL, ?,
            'draft',
            ?, ?
          )
        `
      ).bind(
        reviewId,
        row.client_id,
        row.service_id,
        reviewerName,
        rating,
        reviewText,
        now,
        PUBLIC_REVIEW_ACTOR,
        PUBLIC_REVIEW_ACTOR
      ),

      env.DB.prepare(
        `
          UPDATE review_requests
          SET
            status =
              'submitted',
            submitted_at = ?,
            review_id = ?,
            updated_at =
              datetime('now'),
            updated_by = ?,
            version =
              version + 1
          WHERE id = ?
            AND status =
              'pending'
        `
      ).bind(
        now,
        reviewId,
        PUBLIC_REVIEW_ACTOR,
        row.id
      ),
    ]);

  if (
    Number(
      requestUpdate
        ?.meta?.changes || 0
    ) !== 1
  ) {
    if (
      Number(
        reviewInsert
          ?.meta?.changes || 0
      ) === 1
    ) {
      await env.DB.prepare(
        `
          UPDATE reviews
          SET
            deleted_at =
              datetime('now'),
            updated_at =
              datetime('now'),
            updated_by = ?
          WHERE id = ?
            AND deleted_at
              IS NULL
        `
      )
        .bind(
          PUBLIC_REVIEW_ACTOR,
          reviewId
        )
        .run();
    }

    throw new HttpError(
      409,
      "This review request changed before submission. Refresh and try again."
    );
  }

  return jsonResponse(
    {
      success: true,
      message:
        "Thank you for your review.",
      data: {
        submitted: true,
      },
      metadata: {},
      timestamp:
        new Date().toISOString(),
    },
    201,
    origin
  );
}

async function loadRequestByTokenHash(
  env,
  tokenHash
) {
  return await env.DB.prepare(
    `
      SELECT
        rr.id,
        rr.client_id,
        rr.service_id,
        rr.status,
        rr.expires_at,

        c.first_name
          AS client_first_name,
        c.last_name
          AS client_last_name,

        s.service_type,
        s.completed_at

      FROM review_requests
        AS rr

      INNER JOIN clients AS c
        ON c.id =
          rr.client_id
        AND c.deleted_at
          IS NULL

      INNER JOIN services AS s
        ON s.id =
          rr.service_id
        AND s.deleted_at
          IS NULL

      WHERE rr.token_hash = ?

      LIMIT 1
    `
  )
    .bind(tokenHash)
    .first();
}

function readTokenFromPath(
  pathname,
  HttpError
) {
  const raw =
    String(pathname || "")
      .slice(
        PUBLIC_PATH_PREFIX.length
      );

  if (
    !raw ||
    raw.includes("/")
  ) {
    throw new HttpError(
      404,
      "Review request was not found."
    );
  }

  let token;

  try {
    token =
      decodeURIComponent(raw);
  } catch {
    throw new HttpError(
      400,
      "Review request token is invalid."
    );
  }

  if (
    !token ||
    token.length >
      TOKEN_MAX_LENGTH ||
    !/^[A-Za-z0-9_-]+$/.test(
      token
    )
  ) {
    throw new HttpError(
      400,
      "Review request token is invalid."
    );
  }

  return token;
}

function buildReviewerName(
  firstName,
  lastName
) {
  const first =
    String(
      firstName || ""
    ).trim();

  const last =
    String(
      lastName || ""
    ).trim();

  if (!last) {
    return first;
  }

  return `${first} ${last[0]}.`
    .trim();
}

function createRandomToken() {
  const bytes =
    crypto.getRandomValues(
      new Uint8Array(
        TOKEN_BYTES
      )
    );

  let binary = "";

  bytes.forEach((value) => {
    binary +=
      String.fromCharCode(
        value
      );
  });

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/g, "");
}

async function hashToken(token) {
  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(
        token
      )
    );

  return Array.from(
    new Uint8Array(digest)
  )
    .map((value) =>
      value
        .toString(16)
        .padStart(2, "0")
    )
    .join("");
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

  const normalized =
    String(value)
      .trim()
      .toLowerCase();

  const allowed =
    new Set([
      "pending",
      "submitted",
      "revoked",
      "expired",
    ]);

  if (
    !allowed.has(
      normalized
    )
  ) {
    throw new HttpError(
      400,
      "status is invalid."
    );
  }

  return normalized;
}

function parseBoundedInteger(
  rawValue,
  defaultValue,
  minimum,
  maximum,
  fieldName,
  HttpError
) {
  if (
    rawValue === null ||
    rawValue === ""
  ) {
    return defaultValue;
  }

  if (
    !/^\d+$/.test(
      rawValue
    )
  ) {
    throw new HttpError(
      400,
      `${fieldName} must be a whole number.`
    );
  }

  const value =
    Number(rawValue);

  if (
    !Number.isSafeInteger(
      value
    ) ||
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

async function readJsonObject(
  request,
  maximumBytes,
  HttpError
) {
  const bodyBytes =
    await request.arrayBuffer();

  if (
    bodyBytes.byteLength >
    maximumBytes
  ) {
    throw new HttpError(
      413,
      "Request body is too large."
    );
  }

  let body;

  try {
    body =
      JSON.parse(
        new TextDecoder()
          .decode(bodyBytes)
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

function requireText(
  value,
  fieldName,
  maximumLength,
  HttpError
) {
  if (
    typeof value !== "string"
  ) {
    throw new HttpError(
      400,
      `${fieldName} is required.`
    );
  }

  const normalized =
    value.trim();

  if (!normalized) {
    throw new HttpError(
      400,
      `${fieldName} is required.`
    );
  }

  if (
    normalized.length >
    maximumLength
  ) {
    throw new HttpError(
      400,
      `${fieldName} cannot exceed ${maximumLength} characters.`
    );
  }

  return normalized;
}

function requireIdentifier(
  value,
  fieldName,
  HttpError
) {
  const normalized =
    String(value || "")
      .trim();

  if (
    !normalized ||
    normalized.length > 100 ||
    !/^[A-Za-z0-9_-]+$/.test(
      normalized
    )
  ) {
    throw new HttpError(
      400,
      `${fieldName} is invalid.`
    );
  }

  return normalized;
}

function parseRating(
  value,
  HttpError
) {
  const rating =
    Number(value);

  if (
    !Number.isInteger(
      rating
    ) ||
    rating < 1 ||
    rating > 5
  ) {
    throw new HttpError(
      400,
      "rating must be a whole number between 1 and 5."
    );
  }

  return rating;
}
