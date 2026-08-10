const CONFLICT_PATH =
  "/admin/api/cleaning-request-conflicts";

export function isCleaningRequestConflictRoute(
  request,
  url
) {
  return (
    (request.method === "GET" ||
      request.method === "POST") &&
    /^\/admin\/api\/cleaning-request-conflicts\/[^/]+$/.test(
      url.pathname
    )
  );
}

export async function handleCleaningRequestConflictRoute({
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

  const requestId =
    decodeIdentifier(
      url.pathname.slice(
        `${CONFLICT_PATH}/`.length
      ),
      "Cleaning request ID",
      HttpError
    );

  const cleaningRequest =
    await selectCleaningRequest(
      env.DB,
      requestId
    );

  if (!cleaningRequest) {
    throw new HttpError(
      404,
      "Cleaning request was not found."
    );
  }

  if (request.method === "GET") {
    return getConflict(
      cleaningRequest,
      env,
      origin,
      jsonResponse,
      HttpError
    );
  }

  return resolveConflict(
    request,
    cleaningRequest,
    env,
    actorEmail,
    origin,
    jsonResponse,
    HttpError
  );
}

async function getConflict(
  cleaningRequest,
  env,
  origin,
  jsonResponse,
  HttpError
) {
  if (
    cleaningRequest.match_status !==
    "conflict"
  ) {
    throw new HttpError(
      409,
      "This cleaning request no longer has a client match conflict."
    );
  }

  const candidates =
    await findCandidates(
      env.DB,
      cleaningRequest
    );

  return jsonResponse(
    {
      success: true,
      message:
        "Client conflict candidates retrieved successfully.",
      data: {
        requestId:
          cleaningRequest.id,
        version:
          cleaningRequest.version,
        submitted: {
          firstName:
            cleaningRequest
              .submitted_first_name,
          lastName:
            cleaningRequest
              .submitted_last_name,
          email:
            cleaningRequest
              .submitted_email,
          phone:
            cleaningRequest
              .submitted_phone,
        },
        candidates,
      },
      metadata: {
        candidateCount:
          candidates.length,
      },
      timestamp:
        new Date().toISOString(),
    },
    200,
    origin
  );
}

async function resolveConflict(
  request,
  cleaningRequest,
  env,
  actorEmail,
  origin,
  jsonResponse,
  HttpError
) {
  if (
    cleaningRequest.match_status !==
    "conflict"
  ) {
    throw new HttpError(
      409,
      "This cleaning request no longer has a client match conflict."
    );
  }

  if (
    cleaningRequest
      .converted_service_id
  ) {
    throw new HttpError(
      409,
      "A converted request cannot be relinked."
    );
  }

  const body =
    await readJsonObject(
      request,
      32 * 1024,
      HttpError
    );

  const unexpected =
    Object.keys(body).filter(
      (field) =>
        !new Set([
          "version",
          "clientId",
        ]).has(field)
    );

  if (unexpected.length) {
    throw new HttpError(
      400,
      `Unexpected field${unexpected.length === 1 ? "" : "s"}: ${unexpected.join(", ")}.`
    );
  }

  const version =
    requiredVersion(
      body.version,
      HttpError
    );

  const clientId =
    decodeIdentifier(
      String(
        body.clientId || ""
      ),
      "Client ID",
      HttpError
    );

  if (
    version !==
    cleaningRequest.version
  ) {
    throw new HttpError(
      409,
      `Cleaning request changed since it was loaded. Current version is ${cleaningRequest.version}.`
    );
  }

  const candidates =
    await findCandidates(
      env.DB,
      cleaningRequest
    );

  const selectedClient =
    candidates.find(
      (candidate) =>
        candidate.id === clientId
    );

  if (!selectedClient) {
    throw new HttpError(
      400,
      "Choose one of the clients matched to this request."
    );
  }

  const selectedName = [
    selectedClient.first_name,
    selectedClient.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  const auditNote =
    `Client conflict resolved manually by ${actorEmail}. ` +
    `Linked to ${selectedName || "client"} ` +
    `(${selectedClient.id}).`;

  const oldNotes =
    String(
      cleaningRequest
        .internal_notes || ""
    ).trim();

  const internalNotes =
    oldNotes
      ? `${oldNotes}\n\n${auditNote}`
      : auditNote;

  const nextStatus =
    cleaningRequest.status ===
    "needs_review"
      ? "new"
      : cleaningRequest.status;

  const result =
    await env.DB.prepare(
      `
        UPDATE cleaning_requests
        SET
          client_id = ?,
          match_status = 'unmatched',
          status = ?,
          internal_notes = ?,
          updated_at = datetime('now'),
          updated_by = ?,
          version = version + 1
        WHERE id = ?
          AND deleted_at IS NULL
          AND match_status = 'conflict'
          AND version = ?
      `
    )
      .bind(
        selectedClient.id,
        nextStatus,
        internalNotes,
        actorEmail,
        cleaningRequest.id,
        version
      )
      .run();

  if (
    Number(
      result.meta?.changes || 0
    ) !== 1
  ) {
    const current =
      await selectCleaningRequest(
        env.DB,
        cleaningRequest.id
      );

    if (!current) {
      throw new HttpError(
        404,
        "Cleaning request was not found."
      );
    }

    throw new HttpError(
      409,
      `Cleaning request changed while the conflict was being resolved. Current version is ${current.version}.`
    );
  }

  const updated =
    await selectCleaningRequest(
      env.DB,
      cleaningRequest.id
    );

  return jsonResponse(
    {
      success: true,
      message:
        "Client conflict resolved successfully.",
      data: {
        requestId:
          updated.id,
        clientId:
          updated.client_id,
        status:
          updated.status,
        matchStatus:
          updated.match_status,
        version:
          updated.version,
      },
      metadata: {},
      timestamp:
        new Date().toISOString(),
    },
    200,
    origin
  );
}

async function selectCleaningRequest(
  db,
  requestId
) {
  return db.prepare(
    `
      SELECT
        id,
        client_id,
        converted_service_id,
        submitted_first_name,
        submitted_last_name,
        submitted_email,
        submitted_phone,
        normalized_email,
        normalized_phone,
        match_status,
        status,
        internal_notes,
        version
      FROM cleaning_requests
      WHERE id = ?
        AND deleted_at IS NULL
      LIMIT 1
    `
  )
    .bind(requestId)
    .first();
}

async function findCandidates(
  db,
  cleaningRequest
) {
  const candidates =
    new Map();

  const normalizedEmail =
    String(
      cleaningRequest
        .normalized_email ||
      cleaningRequest
        .submitted_email ||
      ""
    )
      .trim()
      .toLowerCase();

  const normalizedPhone =
    normalizePhone(
      cleaningRequest
        .normalized_phone ||
      cleaningRequest
        .submitted_phone
    );

  if (normalizedEmail) {
    const result =
      await db.prepare(
        `
          SELECT
            id,
            first_name,
            last_name,
            email,
            phone,
            city,
            state
          FROM clients
          WHERE deleted_at IS NULL
            AND lower(trim(email)) = ?
          ORDER BY created_at ASC
          LIMIT 5
        `
      )
        .bind(
          normalizedEmail
        )
        .all();

    for (
      const client of
      (result.results || [])
    ) {
      candidates.set(
        client.id,
        {
          ...client,
          matchedByEmail: true,
          matchedByPhone: false,
        }
      );
    }
  }

  if (normalizedPhone) {
    const result =
      await db.prepare(
        `
          SELECT
            id,
            first_name,
            last_name,
            email,
            phone,
            city,
            state
          FROM clients
          WHERE deleted_at IS NULL
          ORDER BY created_at ASC
        `
      ).all();

    for (
      const client of
      (result.results || [])
    ) {
      if (
        normalizePhone(
          client.phone
        ) !== normalizedPhone
      ) {
        continue;
      }

      const existing =
        candidates.get(
          client.id
        );

      candidates.set(
        client.id,
        {
          ...client,
          matchedByEmail:
            Boolean(
              existing
                ?.matchedByEmail
            ),
          matchedByPhone: true,
        }
      );
    }
  }

  return Array.from(
    candidates.values()
  );
}

function normalizePhone(value) {
  if (!value) {
    return "";
  }

  const digits =
    String(value)
      .replace(/\D/g, "");

  if (
    digits.length === 11 &&
    digits.startsWith("1")
  ) {
    return digits.slice(1);
  }

  return digits;
}

async function readJsonObject(
  request,
  maximumBytes,
  HttpError
) {
  const bytes =
    await request.arrayBuffer();

  if (
    bytes.byteLength >
    maximumBytes
  ) {
    throw new HttpError(
      413,
      "Request body is too large."
    );
  }

  let body;

  try {
    body = JSON.parse(
      new TextDecoder()
        .decode(bytes)
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

function requiredVersion(
  value,
  HttpError
) {
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

function decodeIdentifier(
  encoded,
  label,
  HttpError
) {
  let value;

  try {
    value =
      decodeURIComponent(
        encoded
      ).trim();
  } catch {
    throw new HttpError(
      400,
      `${label} is invalid.`
    );
  }

  if (
    !value ||
    value.length > 100 ||
    !/^[A-Za-z0-9_-]+$/.test(
      value
    )
  ) {
    throw new HttpError(
      400,
      `${label} is invalid.`
    );
  }

  return value;
}
