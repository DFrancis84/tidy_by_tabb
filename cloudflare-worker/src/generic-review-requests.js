const ADMIN_GENERIC_PATH =
  "/admin/api/review-requests/generic";

const PUBLIC_GENERIC_PREFIX =
  "/api/review/generic/";

const PUBLIC_ACTOR =
  "public-generic-review-request";

const TOKEN_BYTES = 32;
const MAX_BODY_BYTES = 24 * 1024;
const REQUEST_DAYS = 30;

export function isAdminGenericReviewRequestRoute(
  request,
  url
) {
  return (
    request.method === "POST" &&
    url.pathname ===
      ADMIN_GENERIC_PATH
  );
}

export function isPublicGenericReviewRequestRoute(
  request,
  url
) {
  return (
    url.pathname.startsWith(
      PUBLIC_GENERIC_PREFIX
    ) &&
    ["GET", "POST"].includes(
      request.method
    )
  );
}

export async function handleAdminGenericReviewRequestRoute({
  request,
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

  const body =
    await readJsonObject(
      request,
      MAX_BODY_BYTES,
      HttpError
    );

  const allowed =
    new Set([
      "email",
      "name",
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

  const email =
    normalizeEmail(
      body.email,
      HttpError
    );

  const name =
    optionalText(
      body.name,
      "name",
      200,
      HttpError
    );

  const token =
    createRandomToken();

  const tokenHash =
    await hashToken(token);

  const requestId =
    `grr_${crypto.randomUUID()}`;

  const expiresAt =
    new Date(
      Date.now() +
        REQUEST_DAYS *
          24 *
          60 *
          60 *
          1000
    ).toISOString();

  await env.DB.prepare(
    `
      INSERT INTO
        generic_review_requests (
          id,
          recipient_email,
          recipient_name,
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
      email,
      name,
      tokenHash,
      expiresAt,
      actorEmail,
      actorEmail
    )
    .run();

  const reviewUrl =
    `https://www.tidybytabb.com/review.html?mode=generic&token=${encodeURIComponent(
      token
    )}`;

  return jsonResponse(
    {
      success: true,
      message:
        "Generic review request created successfully.",
      data: {
        request: {
          id:
            requestId,
          recipientEmail:
            email,
          recipientName:
            name,
          reviewUrl,
          expiresAt,
          status:
            "pending",
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

export async function handlePublicGenericReviewRequestRoute({
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

  const token =
    readToken(
      url.pathname,
      HttpError
    );

  const tokenHash =
    await hashToken(token);

  const row =
    await env.DB.prepare(
      `
        SELECT
          id,
          recipient_email,
          recipient_name,
          status,
          expires_at
        FROM generic_review_requests
        WHERE token_hash = ?
        LIMIT 1
      `
    )
      .bind(tokenHash)
      .first();

  if (!row) {
    throw new HttpError(
      404,
      "This review request was not found."
    );
  }

  if (
    row.status ===
    "submitted"
  ) {
    throw new HttpError(
      409,
      "This review request has already been completed."
    );
  }

  if (
    row.status !==
    "pending"
  ) {
    throw new HttpError(
      410,
      "This review request is no longer active."
    );
  }

  if (
    Date.parse(
      row.expires_at
    ) <= Date.now()
  ) {
    await env.DB.prepare(
      `
        UPDATE
          generic_review_requests
        SET
          status = 'expired',
          updated_at =
            datetime('now'),
          updated_by = ?
        WHERE id = ?
          AND status =
            'pending'
      `
    )
      .bind(
        PUBLIC_ACTOR,
        row.id
      )
      .run();

    throw new HttpError(
      410,
      "This review request has expired."
    );
  }

  if (
    request.method === "GET"
  ) {
    return jsonResponse(
      {
        success: true,
        message:
          "Review request retrieved successfully.",
        data: {
          request: {
            reviewerName:
              row.recipient_name ||
              "",
            serviceType:
              null,
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
      MAX_BODY_BYTES,
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
            ?,
            NULL,
            NULL,
            ?,
            ?,
            ?,
            NULL,
            ?,
            'draft',
            ?,
            ?
          )
        `
      ).bind(
        reviewId,
        reviewerName,
        rating,
        reviewText,
        now,
        PUBLIC_ACTOR,
        PUBLIC_ACTOR
      ),

      env.DB.prepare(
        `
          UPDATE
            generic_review_requests
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
        PUBLIC_ACTOR,
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
          PUBLIC_ACTOR,
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

function readToken(
  pathname,
  HttpError
) {
  const raw =
    String(pathname || "")
      .slice(
        PUBLIC_GENERIC_PREFIX.length
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
    token.length > 200 ||
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

function createRandomToken() {
  const bytes =
    crypto.getRandomValues(
      new Uint8Array(
        TOKEN_BYTES
      )
    );

  let binary = "";

  bytes.forEach(
    (value) => {
      binary +=
        String.fromCharCode(
          value
        );
    }
  );

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/g, "");
}

async function hashToken(
  token
) {
  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(
        token
      )
    );

  return Array.from(
    new Uint8Array(
      digest
    )
  )
    .map(
      (value) =>
        value
          .toString(16)
          .padStart(2, "0")
    )
    .join("");
}

function normalizeEmail(
  value,
  HttpError
) {
  if (
    typeof value !==
    "string"
  ) {
    throw new HttpError(
      400,
      "email is required."
    );
  }

  const normalized =
    value
      .trim()
      .toLowerCase();

  if (
    !normalized ||
    normalized.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      normalized
    )
  ) {
    throw new HttpError(
      400,
      "email must be a valid email address."
    );
  }

  return normalized;
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

  if (
    typeof value !==
    "string"
  ) {
    throw new HttpError(
      400,
      `${fieldName} must be text.`
    );
  }

  const normalized =
    value.trim();

  if (
    normalized.length >
    maximumLength
  ) {
    throw new HttpError(
      400,
      `${fieldName} cannot exceed ${maximumLength} characters.`
    );
  }

  return normalized || null;
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

  try {
    const body =
      JSON.parse(
        new TextDecoder()
          .decode(bytes)
      );

    if (
      !body ||
      Array.isArray(body) ||
      typeof body !==
        "object"
    ) {
      throw new Error(
        "not object"
      );
    }

    return body;
  } catch {
    throw new HttpError(
      400,
      "Request body must be a JSON object."
    );
  }
}

function requireText(
  value,
  fieldName,
  maximumLength,
  HttpError
) {
  if (
    typeof value !==
    "string"
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
