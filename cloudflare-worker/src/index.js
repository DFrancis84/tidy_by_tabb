import {
  handlePublicCleaningRequest,
  isPublicCleaningRequest,
} from "./public-cleaning-requests.js";

import {
  handleCleaningRequestsAdminRoute,
  isCleaningRequestsAdminRoute,
} from "./cleaning-requests-admin.js";

import {
  handleCleaningRequestConflictRoute,
  isCleaningRequestConflictRoute,
} from "./cleaning-request-conflicts.js";

import {
  handlePublicReviewsRequest,
  isPublicReviewsRequest,
} from "./public-reviews.js";

import {
  handleAdminReviewRequestsRoute,
  handlePublicReviewRequestRoute,
  isAdminReviewRequestsRoute,
  isPublicReviewRequestRoute,
} from "./review-requests.js";


const ALLOWED_ORIGIN = "https://www.tidybytabb.com";
const ALLOWED_ACTIONS = new Set([
  "create",
  "update",
  "delete",
  "uploadimage",
]);
const MAX_BODY_BYTES = 15 * 1024 * 1024;
const MAX_CLIENT_BODY_BYTES = 64 * 1024;
const JWT_CLOCK_SKEW_SECONDS = 60;
const JWKS_CACHE_TTL_MS = 5 * 60 * 1000;

let jwksCache = {
  url: "",
  expiresAt: 0,
  keys: [],
};

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    try {
      validateConfiguration(env);

      if (request.method === "OPTIONS") {
        if (origin !== ALLOWED_ORIGIN) {
          throw new HttpError(403, "Origin is not allowed.");
        }

        return new Response(null, {
          status: 204,
          headers: corsHeaders(origin),
        });
      }

      const isAllowedOrigin =
        origin === "" ||
        origin === ALLOWED_ORIGIN;

      if (!isAllowedOrigin) {
        throw new HttpError(403, "Origin is not allowed.");
      }

      const url = new URL(request.url);

      if (isPublicCleaningRequest(request, url)) {
        return await handlePublicCleaningRequest(
          request,
          env,
          origin,
          jsonResponse,
          HttpError
        );
      }

      if (isPublicReviewsRequest(request, url)) {
        return await handlePublicReviewsRequest(
          url,
          env,
          origin,
          jsonResponse,
          HttpError
        );
      }
      
      if (isPublicReviewRequestRoute(request,url)) {
        return await handlePublicReviewRequestRoute(
          request,
          url,
          env,
          origin,
          jsonResponse,
          HttpError,
        );
      }
      
      const jwt = request.headers.get("Cf-Access-Jwt-Assertion");
      if (!jwt) {
        throw new HttpError(401, "Authentication is required.");
      }

      const claims = await verifyAccessJwt(jwt, env);
      const actorEmail = normalizeEmail(claims.email);

      if (!actorEmail) {
        throw new HttpError(401, "Authenticated email is required.");
      }

      const allowedEmails = parseAllowedEmails(env.ALLOWED_ADMIN_EMAILS);
      if (!allowedEmails.has(actorEmail)) {
        throw new HttpError(403, "Administrator access is denied.");
      }

      if (
        isCleaningRequestsAdminRoute(
          request,
          url
        )
      ) {
        return await handleCleaningRequestsAdminRoute({
          request,
          url,
          env,
          actorEmail,
          origin,
          jsonResponse,
          HttpError,
        });
      }

      if (
        isCleaningRequestConflictRoute(
          request,
          url
        )
      ) {
        return await handleCleaningRequestConflictRoute({
          request,
          url,
          env,
          actorEmail,
          origin,
          jsonResponse,
          HttpError,
        });
      }

      if (
        request.method === "GET" &&
        url.pathname === "/admin/api/health"
      ) {
        return await handleHealthRequest(env, origin);
      }
      
      if (
        request.method === "GET" &&
        url.pathname === "/admin/api/reviews"
      ) {
        return await handleReviewsListRequest(
          url,
          env,
          origin
        );
      }
      
      if (
        request.method === "POST" &&
        url.pathname === "/admin/api/reviews"
      ) {
        return await handleReviewCreateRequest(
          request,
          env,
          actorEmail,
          origin
        );
      }
      
      if (
        request.method === "GET" &&
        url.pathname === "/admin/api/services"
      ) {
        return await handleServicesListRequest(url, env, origin);
      }

      if (
        request.method === "POST" &&
        url.pathname === "/admin/api/services"
      ) {
        return await handleServiceCreateRequest(
          request,
          env,
          actorEmail,
          origin
        );
      }

      if (
        request.method === "GET" &&
        url.pathname === "/admin/api/clients"
      ) {
        return await handleClientsListRequest(url, env, origin);
      }

      if (
        request.method === "POST" &&
        url.pathname === "/admin/api/clients"
      ) {
        return await handleClientCreateRequest(
          request,
          env,
          actorEmail,
          origin
        );
      }

      const reviewId = getReviewIdFromPath(url.pathname);

      if (
        request.method === "GET" &&
        reviewId
      ) {
        return await handleReviewDetailRequest(
          reviewId,
          env,
          origin
        );
      }
      
      if (
        request.method === "PATCH" &&
        reviewId
      ) {
        return await handleReviewUpdateRequest(
          request,
          reviewId,
          env,
          actorEmail,
          origin
        );
      }

      if (
        request.method === "DELETE" &&
        reviewId
      ) {
        return await handleReviewDeleteRequest(
          request,
          reviewId,
          env,
          actorEmail,
          origin
        );
      }
      
      const serviceId = getServiceIdFromPath(url.pathname);

      if (
        request.method === "GET" &&
        serviceId
      ) {
        return await handleServiceDetailRequest(
          serviceId,
          env,
          origin
        );
      }

      if (
        request.method === "PATCH" &&
          serviceId
        ) {
          return await handleServiceUpdateRequest(
            request,
            serviceId,
            env,
            actorEmail,
            origin
        );
      }  

      if (
        request.method === "DELETE" &&
          serviceId
        ) {
          return await handleServiceDeleteRequest(
            request,
            serviceId,
            env,
            actorEmail,
            origin
        );
      }

      const clientId = getClientIdFromPath(url.pathname);

      if (
        request.method === "GET" &&
        clientId
      ) {
        return await handleClientDetailRequest(
          clientId,
          env,
          origin
        );
      }

      if (
        request.method === "PATCH" &&
        clientId
      ) {
        return await handleClientUpdateRequest(
          request,
          clientId,
          env,
          actorEmail,
          origin
        );
      }

      if (
        request.method === "DELETE" &&
        clientId
      ) {
        return await handleClientDeleteRequest(
          request,
          clientId,
          env,
          actorEmail,
          origin
        );
      }
      
      if (request.method !== "POST") {
        throw new HttpError(405, "Method is not supported for this endpoint.");
      }

      return await handleGalleryRequest(
        request,
        env,
        actorEmail,
        origin
      );
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      const message =
        error instanceof HttpError
          ? error.message
          : "The admin gateway could not process this request.";

      if (!(error instanceof HttpError)) {
        console.error(
          "Admin gateway failure:",
          error?.message || "Unknown error"
        );
      }

      return jsonResponse(
        {
          success: false,
          message,
          data: null,
          metadata: {},
          timestamp: new Date().toISOString(),
        },
        status,
        origin
      );
    }
  },
};

async function handleHealthRequest(env, origin) {
  if (!env.DB) {
    throw new Error("D1 binding DB is unavailable.");
  }

  const result = await env.DB.prepare(
  `
    SELECT
      (SELECT COUNT(*)
       FROM clients
       WHERE deleted_at IS NULL) AS client_count,

      (SELECT COUNT(*)
       FROM services
       WHERE deleted_at IS NULL) AS service_count,

      (SELECT COUNT(*)
       FROM reviews
       WHERE deleted_at IS NULL) AS review_count
  `
).first();

  return jsonResponse(
    {
      success: true,
      message: "Admin API is healthy.",
      data: {
        database: "connected",
        clientCount: Number(result?.client_count || 0),
        serviceCount: Number(result?.service_count || 0),
        reviewCount: Number(result?.review_count || 0),
        },
      metadata: {},
      timestamp: new Date().toISOString(),
    },
    200,
    origin
  );
}

async function handleReviewsListRequest(
  url,
  env,
  origin
) {
  if (!env.DB) {
    throw new Error("D1 binding DB is unavailable.");
  }

  const search = String(
    url.searchParams.get("search") || ""
  ).trim();

  const status = normalizeOptionalReviewStatus(
    url.searchParams.get("status")
  );

  const rating = parseOptionalRating(
    url.searchParams.get("rating")
  );

  const clientId = optionalIdentifier(
    url.searchParams.get("clientId"),
    "clientId"
  );

  const serviceId = optionalIdentifier(
    url.searchParams.get("serviceId"),
    "serviceId"
  );

  const from = normalizeOptionalDateTime(
    url.searchParams.get("from"),
    "from"
  );

  const to = normalizeOptionalDateTime(
    url.searchParams.get("to"),
    "to"
  );

  if (
    from &&
    to &&
    Date.parse(from) > Date.parse(to)
  ) {
    throw new HttpError(
      400,
      "from cannot be later than to."
    );
  }

  const limit = parseBoundedInteger(
    url.searchParams.get("limit"),
    25,
    1,
    100,
    "limit"
  );

  const offset = parseBoundedInteger(
    url.searchParams.get("offset"),
    0,
    0,
    100000,
    "offset"
  );

  const conditions = [
    "r.deleted_at IS NULL",
  ];

  const parameters = [];

  if (search) {
    const searchPattern =
      `%${escapeLikePattern(search)}%`;

    conditions.push(`
      (
        r.reviewer_name
          LIKE ? ESCAPE '\\' COLLATE NOCASE
        OR r.review_text
          LIKE ? ESCAPE '\\' COLLATE NOCASE
        OR r.source
          LIKE ? ESCAPE '\\' COLLATE NOCASE
      )
    `);

    parameters.push(
      searchPattern,
      searchPattern,
      searchPattern
    );
  }

  if (status) {
    conditions.push("r.status = ?");
    parameters.push(status);
  }

  if (rating !== null) {
    conditions.push("r.rating = ?");
    parameters.push(rating);
  }

  if (clientId) {
    conditions.push("r.client_id = ?");
    parameters.push(clientId);
  }

  if (serviceId) {
    conditions.push("r.service_id = ?");
    parameters.push(serviceId);
  }

  if (from) {
    conditions.push(
      "datetime(r.review_date) >= datetime(?)"
    );
    parameters.push(from);
  }

  if (to) {
    conditions.push(
      "datetime(r.review_date) <= datetime(?)"
    );
    parameters.push(to);
  }

  const whereClause =
    conditions.join("\nAND ");

  const reviewsStatement = env.DB.prepare(
    `
      SELECT
        r.id,
        r.client_id,
        r.service_id,
        r.reviewer_name,
        r.rating,
        r.review_text,
        r.source,
        r.review_date,
        r.status,
        r.created_at,
        r.updated_at,
        r.version,

        c.first_name AS client_first_name,
        c.last_name AS client_last_name,

        s.service_type,
        s.status AS service_status,
        s.scheduled_start AS service_scheduled_start

      FROM reviews AS r

      LEFT JOIN clients AS c
        ON c.id = r.client_id
        AND c.deleted_at IS NULL

      LEFT JOIN services AS s
        ON s.id = r.service_id
        AND s.deleted_at IS NULL

      WHERE ${whereClause}

      ORDER BY
        CASE
          WHEN r.review_date IS NULL THEN 1
          ELSE 0
        END ASC,
        datetime(r.review_date) DESC,
        r.created_at DESC

      LIMIT ?
      OFFSET ?
    `
  ).bind(
    ...parameters,
    limit,
    offset
  );

  const countStatement = env.DB.prepare(
    `
      SELECT COUNT(*) AS total
      FROM reviews AS r
      WHERE ${whereClause}
    `
  ).bind(...parameters);

  const [reviewsResult, countResult] =
    await Promise.all([
      reviewsStatement.all(),
      countStatement.first(),
    ]);

  const reviews = Array.isArray(
    reviewsResult.results
  )
    ? reviewsResult.results
    : [];

  const total = Number(
    countResult?.total || 0
  );

  return jsonResponse(
    {
      success: true,
      message: "Reviews retrieved successfully.",
      data: {
        reviews,
      },
      metadata: {
        search,
        status,
        rating,
        clientId,
        serviceId,
        from,
        to,
        limit,
        offset,
        returned: reviews.length,
        total,
        hasMore:
          offset + reviews.length < total,
      },
      timestamp: new Date().toISOString(),
    },
    200,
    origin
  );
}

async function handleReviewCreateRequest(
  request,
  env,
  actorEmail,
  origin
) {
  if (!env.DB) {
    throw new Error("D1 binding DB is unavailable.");
  }

  const body = await readJsonObject(
    request,
    MAX_CLIENT_BODY_BYTES
  );

  const allowedFields = new Set([
    "clientId",
    "serviceId",
    "reviewerName",
    "rating",
    "reviewText",
    "source",
    "reviewDate",
    "status",
  ]);

  const unexpectedFields = Object.keys(body).filter(
    (field) => !allowedFields.has(field)
  );

  if (unexpectedFields.length) {
    throw new HttpError(
      400,
      `Unexpected field${unexpectedFields.length === 1 ? "" : "s"}: ${unexpectedFields.join(", ")}.`
    );
  }

  let clientId = optionalIdentifier(
    body.clientId,
    "clientId"
  ) || null;

  const serviceId = optionalIdentifier(
    body.serviceId,
    "serviceId"
  ) || null;

  const reviewerName = requireText(
    body.reviewerName,
    "reviewerName",
    200
  );

  const rating = parseRequiredRating(
    body.rating
  );

  const reviewText = requireText(
    body.reviewText,
    "reviewText",
    10000
  );

  const source = optionalText(
    body.source,
    "source",
    100
  );

  const reviewDate =
    normalizeOptionalDateTime(
      body.reviewDate,
      "reviewDate"
    ) || null;

  const status =
    normalizeOptionalReviewStatus(
      body.status
    ) || "published";

  if (clientId) {
    const client = await env.DB.prepare(
      `
        SELECT id
        FROM clients
        WHERE id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `
    )
      .bind(clientId)
      .first();

    if (!client) {
      throw new HttpError(
        400,
        "clientId must reference an active client."
      );
    }
  }

  if (serviceId) {
    const service = await env.DB.prepare(
      `
        SELECT
          id,
          client_id
        FROM services
        WHERE id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `
    )
      .bind(serviceId)
      .first();

    if (!service) {
      throw new HttpError(
        400,
        "serviceId must reference an active service."
      );
    }

    if (
      clientId &&
      clientId !== service.client_id
    ) {
      throw new HttpError(
        400,
        "clientId must match the client associated with serviceId."
      );
    }

    clientId ||= service.client_id;
  }

  const reviewId =
    `rev_${crypto.randomUUID()}`;

  await env.DB.prepare(
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  )
    .bind(
      reviewId,
      clientId,
      serviceId,
      reviewerName,
      rating,
      reviewText,
      source,
      reviewDate,
      status,
      actorEmail,
      actorEmail
    )
    .run();

  const review = await env.DB.prepare(
    `
      SELECT
        r.id,
        r.client_id,
        r.service_id,
        r.reviewer_name,
        r.rating,
        r.review_text,
        r.source,
        r.review_date,
        r.status,
        r.created_at,
        r.updated_at,
        r.created_by,
        r.updated_by,
        r.version,

        c.first_name AS client_first_name,
        c.last_name AS client_last_name,
        c.email AS client_email,
        c.phone AS client_phone,

        s.service_type,
        s.status AS service_status,
        s.scheduled_start AS service_scheduled_start,
        s.completed_at AS service_completed_at,
        s.price_cents AS service_price_cents

      FROM reviews AS r

      LEFT JOIN clients AS c
        ON c.id = r.client_id
        AND c.deleted_at IS NULL

      LEFT JOIN services AS s
        ON s.id = r.service_id
        AND s.deleted_at IS NULL

      WHERE r.id = ?
        AND r.deleted_at IS NULL

      LIMIT 1
    `
  )
    .bind(reviewId)
    .first();

  if (!review) {
    throw new Error(
      "Review was created but could not be retrieved."
    );
  }

  return jsonResponse(
    {
      success: true,
      message: "Review created successfully.",
      data: {
        review,
      },
      metadata: {},
      timestamp: new Date().toISOString(),
    },
    201,
    origin
  );
}

async function handleReviewUpdateRequest(
  request,
  reviewId,
  env,
  actorEmail,
  origin
) {
  if (!env.DB) {
    throw new Error("D1 binding DB is unavailable.");
  }

  const body = await readJsonObject(
    request,
    MAX_CLIENT_BODY_BYTES
  );

  const allowedFields = new Set([
    "version",
    "clientId",
    "serviceId",
    "reviewerName",
    "rating",
    "reviewText",
    "source",
    "reviewDate",
    "status",
  ]);

  const unexpectedFields = Object.keys(body).filter(
    (field) => !allowedFields.has(field)
  );

  if (unexpectedFields.length) {
    throw new HttpError(
      400,
      `Unexpected field${unexpectedFields.length === 1 ? "" : "s"}: ${unexpectedFields.join(", ")}.`
    );
  }

  const expectedVersion = parseRequiredVersion(
    body.version
  );

  const existingReview = await env.DB.prepare(
    `
      SELECT
        id,
        client_id,
        service_id,
        reviewer_name,
        rating,
        review_text,
        source,
        review_date,
        status,
        version
      FROM reviews
      WHERE id = ?
        AND deleted_at IS NULL
      LIMIT 1
    `
  )
    .bind(reviewId)
    .first();

  if (!existingReview) {
    throw new HttpError(
      404,
      "Review was not found."
    );
  }

  const editableFields = [
    "clientId",
    "serviceId",
    "reviewerName",
    "rating",
    "reviewText",
    "source",
    "reviewDate",
    "status",
  ];

  const hasEditableField = editableFields.some(
    (field) =>
      Object.prototype.hasOwnProperty.call(
        body,
        field
      )
  );

  if (!hasEditableField) {
    throw new HttpError(
      400,
      "At least one review field must be provided."
    );
  }

  const hasField = (field) =>
    Object.prototype.hasOwnProperty.call(
      body,
      field
    );

  const updatedReview = {
    clientId: hasField("clientId")
      ? (
          optionalIdentifier(
            body.clientId,
            "clientId"
          ) || null
        )
      : existingReview.client_id,

    serviceId: hasField("serviceId")
      ? (
          optionalIdentifier(
            body.serviceId,
            "serviceId"
          ) || null
        )
      : existingReview.service_id,

    reviewerName: hasField("reviewerName")
      ? requireText(
          body.reviewerName,
          "reviewerName",
          200
        )
      : existingReview.reviewer_name,

    rating: hasField("rating")
      ? parseRequiredRating(body.rating)
      : existingReview.rating,

    reviewText: hasField("reviewText")
      ? requireText(
          body.reviewText,
          "reviewText",
          10000
        )
      : existingReview.review_text,

    source: hasField("source")
      ? optionalText(
          body.source,
          "source",
          100
        )
      : existingReview.source,

    reviewDate: hasField("reviewDate")
      ? (
          normalizeOptionalDateTime(
            body.reviewDate,
            "reviewDate"
          ) || null
        )
      : existingReview.review_date,

    status: hasField("status")
      ? normalizeOptionalReviewStatus(
          body.status
        )
      : existingReview.status,
  };

  if (!updatedReview.status) {
    throw new HttpError(
      400,
      "status is required."
    );
  }

  if (updatedReview.clientId) {
    const client = await env.DB.prepare(
      `
        SELECT id
        FROM clients
        WHERE id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `
    )
      .bind(updatedReview.clientId)
      .first();

    if (!client) {
      throw new HttpError(
        400,
        "clientId must reference an active client."
      );
    }
  }

  if (updatedReview.serviceId) {
    const service = await env.DB.prepare(
      `
        SELECT
          id,
          client_id
        FROM services
        WHERE id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `
    )
      .bind(updatedReview.serviceId)
      .first();

    if (!service) {
      throw new HttpError(
        400,
        "serviceId must reference an active service."
      );
    }

    if (
      updatedReview.clientId &&
      updatedReview.clientId !== service.client_id
    ) {
      throw new HttpError(
        400,
        "clientId must match the client associated with serviceId."
      );
    }

    updatedReview.clientId ||= service.client_id;
  }

  const updateResult = await env.DB.prepare(
    `
      UPDATE reviews
      SET
        client_id = ?,
        service_id = ?,
        reviewer_name = ?,
        rating = ?,
        review_text = ?,
        source = ?,
        review_date = ?,
        status = ?,
        updated_at = datetime('now'),
        updated_by = ?,
        version = version + 1
      WHERE id = ?
        AND deleted_at IS NULL
        AND version = ?
    `
  )
    .bind(
      updatedReview.clientId,
      updatedReview.serviceId,
      updatedReview.reviewerName,
      updatedReview.rating,
      updatedReview.reviewText,
      updatedReview.source,
      updatedReview.reviewDate,
      updatedReview.status,
      actorEmail,
      reviewId,
      expectedVersion
    )
    .run();

  if (
    Number(updateResult.meta?.changes || 0) !== 1
  ) {
    const current = await env.DB.prepare(
      `
        SELECT version
        FROM reviews
        WHERE id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `
    )
      .bind(reviewId)
      .first();

    if (!current) {
      throw new HttpError(
        404,
        "Review was not found."
      );
    }

    throw new HttpError(
      409,
      `Review has changed since it was loaded. Current version is ${current.version}.`
    );
  }

  const review = await env.DB.prepare(
    `
      SELECT
        r.id,
        r.client_id,
        r.service_id,
        r.reviewer_name,
        r.rating,
        r.review_text,
        r.source,
        r.review_date,
        r.status,
        r.created_at,
        r.updated_at,
        r.created_by,
        r.updated_by,
        r.version,

        c.first_name AS client_first_name,
        c.last_name AS client_last_name,
        c.email AS client_email,
        c.phone AS client_phone,

        s.service_type,
        s.status AS service_status,
        s.scheduled_start AS service_scheduled_start,
        s.completed_at AS service_completed_at,
        s.price_cents AS service_price_cents

      FROM reviews AS r

      LEFT JOIN clients AS c
        ON c.id = r.client_id
        AND c.deleted_at IS NULL

      LEFT JOIN services AS s
        ON s.id = r.service_id
        AND s.deleted_at IS NULL

      WHERE r.id = ?
        AND r.deleted_at IS NULL

      LIMIT 1
    `
  )
    .bind(reviewId)
    .first();

  if (!review) {
    throw new Error(
      "Review was updated but could not be retrieved."
    );
  }

  return jsonResponse(
    {
      success: true,
      message: "Review updated successfully.",
      data: {
        review,
      },
      metadata: {},
      timestamp: new Date().toISOString(),
    },
    200,
    origin
  );
}

async function handleReviewDeleteRequest(
  request,
  reviewId,
  env,
  actorEmail,
  origin
) {
  if (!env.DB) {
    throw new Error("D1 binding DB is unavailable.");
  }

  const body = await readJsonObject(
    request,
    MAX_CLIENT_BODY_BYTES
  );

  const allowedFields = new Set([
    "version",
  ]);

  const unexpectedFields = Object.keys(body).filter(
    (field) => !allowedFields.has(field)
  );

  if (unexpectedFields.length) {
    throw new HttpError(
      400,
      `Unexpected field${unexpectedFields.length === 1 ? "" : "s"}: ${unexpectedFields.join(", ")}.`
    );
  }

  const expectedVersion = parseRequiredVersion(
    body.version
  );

  const existingReview = await env.DB.prepare(
    `
      SELECT
        id,
        reviewer_name,
        rating,
        status,
        version
      FROM reviews
      WHERE id = ?
        AND deleted_at IS NULL
      LIMIT 1
    `
  )
    .bind(reviewId)
    .first();

  if (!existingReview) {
    throw new HttpError(
      404,
      "Review was not found."
    );
  }

  const deleteResult = await env.DB.prepare(
    `
      UPDATE reviews
      SET
        deleted_at = datetime('now'),
        updated_at = datetime('now'),
        updated_by = ?,
        version = version + 1
      WHERE id = ?
        AND deleted_at IS NULL
        AND version = ?
    `
  )
    .bind(
      actorEmail,
      reviewId,
      expectedVersion
    )
    .run();

  if (
    Number(deleteResult.meta?.changes || 0) !== 1
  ) {
    const current = await env.DB.prepare(
      `
        SELECT version
        FROM reviews
        WHERE id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `
    )
      .bind(reviewId)
      .first();

    if (!current) {
      throw new HttpError(
        404,
        "Review was not found."
      );
    }

    throw new HttpError(
      409,
      `Review has changed since it was loaded. Current version is ${current.version}.`
    );
  }

  return jsonResponse(
    {
      success: true,
      message: "Review deleted successfully.",
      data: {
        review: {
          id: reviewId,
          reviewer_name:
            existingReview.reviewer_name,
          rating:
            existingReview.rating,
          status:
            existingReview.status,
          deleted: true,
          version:
            expectedVersion + 1,
        },
      },
      metadata: {},
      timestamp: new Date().toISOString(),
    },
    200,
    origin
  );
}

async function handleServicesListRequest(
  url,
  env,
  origin
) {
  if (!env.DB) {
    throw new Error("D1 binding DB is unavailable.");
  }

  const clientId = optionalIdentifier(
    url.searchParams.get("clientId"),
    "clientId"
  );

  const status = normalizeOptionalServiceStatus(
    url.searchParams.get("status")
  );

  const from = normalizeOptionalDateTime(
    url.searchParams.get("from"),
    "from"
  );

  const to = normalizeOptionalDateTime(
    url.searchParams.get("to"),
    "to"
  );

  if (
    from &&
    to &&
    new Date(from).getTime() > new Date(to).getTime()
  ) {
    throw new HttpError(
      400,
      "from cannot be later than to."
    );
  }

  const limit = parseBoundedInteger(
    url.searchParams.get("limit"),
    25,
    1,
    100,
    "limit"
  );

  const offset = parseBoundedInteger(
    url.searchParams.get("offset"),
    0,
    0,
    100000,
    "offset"
  );

  const conditions = [
    "s.deleted_at IS NULL",
    "c.deleted_at IS NULL",
  ];

  const parameters = [];

  if (clientId) {
    conditions.push("s.client_id = ?");
    parameters.push(clientId);
  }

  if (status) {
    conditions.push("s.status = ?");
    parameters.push(status);
  }

  if (from) {
    conditions.push(
      "datetime(s.scheduled_start) >= datetime(?)"
    );
    parameters.push(from);
  }

  if (to) {
    conditions.push(
      "datetime(s.scheduled_start) <= datetime(?)"
    );
    parameters.push(to);
  }

  const whereClause = conditions.join("\nAND ");

  const servicesParameters = [
    ...parameters,
    limit,
    offset,
  ];

  const servicesStatement = env.DB.prepare(
    `
      SELECT
        s.id,
        s.client_id,
        s.service_type,
        s.status,
        s.scheduled_start,
        s.scheduled_end,
        s.completed_at,
        s.price_cents,
        s.created_at,
        s.updated_at,
        s.version,
        c.first_name AS client_first_name,
        c.last_name AS client_last_name,
        c.phone AS client_phone
      FROM services AS s
      INNER JOIN clients AS c
        ON c.id = s.client_id
      WHERE ${whereClause}
      ORDER BY
        CASE
          WHEN s.scheduled_start IS NULL THEN 1
          ELSE 0
        END ASC,
        datetime(s.scheduled_start) ASC,
        datetime(s.created_at) DESC
      LIMIT ?
      OFFSET ?
    `
  ).bind(...servicesParameters);

  const countStatement = env.DB.prepare(
    `
      SELECT COUNT(*) AS total
      FROM services AS s
      INNER JOIN clients AS c
        ON c.id = s.client_id
      WHERE ${whereClause}
    `
  ).bind(...parameters);

  const [servicesResult, countResult] =
    await Promise.all([
      servicesStatement.all(),
      countStatement.first(),
    ]);

  const services = Array.isArray(
    servicesResult.results
  )
    ? servicesResult.results
    : [];

  const total = Number(countResult?.total || 0);

  return jsonResponse(
    {
      success: true,
      message: "Services retrieved successfully.",
      data: {
        services,
      },
      metadata: {
        clientId,
        status,
        from,
        to,
        limit,
        offset,
        returned: services.length,
        total,
        hasMore:
          offset + services.length < total,
      },
      timestamp: new Date().toISOString(),
    },
    200,
    origin
  );
}

async function handleReviewDetailRequest(
  reviewId,
  env,
  origin
) {
  if (!env.DB) {
    throw new Error("D1 binding DB is unavailable.");
  }

  const review = await env.DB.prepare(
    `
      SELECT
        r.id,
        r.client_id,
        r.service_id,
        r.reviewer_name,
        r.rating,
        r.review_text,
        r.source,
        r.review_date,
        r.status,
        r.created_at,
        r.updated_at,
        r.created_by,
        r.updated_by,
        r.version,

        c.first_name AS client_first_name,
        c.last_name AS client_last_name,
        c.email AS client_email,
        c.phone AS client_phone,

        s.service_type,
        s.status AS service_status,
        s.scheduled_start AS service_scheduled_start,
        s.completed_at AS service_completed_at,
        s.price_cents AS service_price_cents

      FROM reviews AS r

      LEFT JOIN clients AS c
        ON c.id = r.client_id
        AND c.deleted_at IS NULL

      LEFT JOIN services AS s
        ON s.id = r.service_id
        AND s.deleted_at IS NULL

      WHERE r.id = ?
        AND r.deleted_at IS NULL

      LIMIT 1
    `
  )
    .bind(reviewId)
    .first();

  if (!review) {
    throw new HttpError(
      404,
      "Review was not found."
    );
  }

  return jsonResponse(
    {
      success: true,
      message: "Review retrieved successfully.",
      data: {
        review,
      },
      metadata: {},
      timestamp: new Date().toISOString(),
    },
    200,
    origin
  );
}

async function handleServiceDetailRequest(
  serviceId,
  env,
  origin
) {
  if (!env.DB) {
    throw new Error("D1 binding DB is unavailable.");
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
        s.completed_at,
        s.price_cents,
        s.notes,
        s.created_at,
        s.updated_at,
        s.created_by,
        s.updated_by,
        s.version,
        c.first_name AS client_first_name,
        c.last_name AS client_last_name,
        c.email AS client_email,
        c.phone AS client_phone,
        c.address_line1 AS client_address_line1,
        c.address_line2 AS client_address_line2,
        c.city AS client_city,
        c.state AS client_state,
        c.postal_code AS client_postal_code
      FROM services AS s
      INNER JOIN clients AS c
        ON c.id = s.client_id
      WHERE s.id = ?
        AND s.deleted_at IS NULL
        AND c.deleted_at IS NULL
      LIMIT 1
    `
  )
    .bind(serviceId)
    .first();

  if (!service) {
    throw new HttpError(404, "Service was not found.");
  }

  return jsonResponse(
    {
      success: true,
      message: "Service retrieved successfully.",
      data: {
        service,
      },
      metadata: {},
      timestamp: new Date().toISOString(),
    },
    200,
    origin
  );
}

async function handleServiceCreateRequest(
  request,
  env,
  actorEmail,
  origin
) {
  if (!env.DB) {
    throw new Error("D1 binding DB is unavailable.");
  }

  const body = await readJsonObject(
    request,
    MAX_CLIENT_BODY_BYTES
  );

  const allowedFields = new Set([
    "clientId",
    "serviceType",
    "status",
    "scheduledStart",
    "scheduledEnd",
    "completedAt",
    "priceCents",
    "notes",
  ]);

  const unexpectedFields = Object.keys(body).filter(
    (field) => !allowedFields.has(field)
  );

  if (unexpectedFields.length) {
    throw new HttpError(
      400,
      `Unexpected field${unexpectedFields.length === 1 ? "" : "s"}: ${unexpectedFields.join(", ")}.`
    );
  }

  const clientId = requireIdentifier(
    body.clientId,
    "clientId"
  );

  const serviceType = requireText(
    body.serviceType,
    "serviceType",
    150
  );

  const status =
    normalizeOptionalServiceStatus(body.status) ||
    "scheduled";

  const scheduledStart = normalizeOptionalDateTime(
    body.scheduledStart,
    "scheduledStart"
  ) || null;

  const scheduledEnd = normalizeOptionalDateTime(
    body.scheduledEnd,
    "scheduledEnd"
  ) || null;

  let completedAt = normalizeOptionalDateTime(
    body.completedAt,
    "completedAt"
  ) || null;

  const priceCents = parseOptionalNonNegativeInteger(
    body.priceCents,
    "priceCents"
  );

  const notes = optionalText(
    body.notes,
    "notes",
    5000
  );

  if (
    scheduledEnd &&
    !scheduledStart
  ) {
    throw new HttpError(
      400,
      "scheduledStart is required when scheduledEnd is provided."
    );
  }

  if (
    scheduledStart &&
    scheduledEnd &&
    Date.parse(scheduledEnd) <= Date.parse(scheduledStart)
  ) {
    throw new HttpError(
      400,
      "scheduledEnd must be later than scheduledStart."
    );
  }

  if (
    ["scheduled", "in_progress"].includes(status) &&
    !scheduledStart
  ) {
    throw new HttpError(
      400,
      `scheduledStart is required when status is ${status}.`
    );
  }

  if (status === "completed") {
    completedAt ||= new Date().toISOString();
  } else if (completedAt) {
    throw new HttpError(
      400,
      "completedAt may only be provided for a completed service."
    );
  }

  const client = await env.DB.prepare(
    `
      SELECT
        id,
        first_name,
        last_name
      FROM clients
      WHERE id = ?
        AND deleted_at IS NULL
      LIMIT 1
    `
  )
    .bind(clientId)
    .first();

  if (!client) {
    throw new HttpError(
      400,
      "clientId must reference an active client."
    );
  }

  if (scheduledStart) {
    const possibleDuplicate = await env.DB.prepare(
      `
        SELECT id
        FROM services
        WHERE client_id = ?
          AND deleted_at IS NULL
          AND status <> 'cancelled'
          AND lower(service_type) = lower(?)
          AND scheduled_start = ?
        LIMIT 1
      `
    )
      .bind(
        clientId,
        serviceType,
        scheduledStart
      )
      .first();

    if (possibleDuplicate) {
      throw new HttpError(
        409,
        `A possible duplicate service already exists with ID ${possibleDuplicate.id}.`
      );
    }
  }

  const serviceId = `svc_${crypto.randomUUID()}`;

  await env.DB.prepare(
    `
      INSERT INTO services (
        id,
        client_id,
        service_type,
        status,
        scheduled_start,
        scheduled_end,
        completed_at,
        price_cents,
        notes,
        created_by,
        updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  )
    .bind(
      serviceId,
      clientId,
      serviceType,
      status,
      scheduledStart,
      scheduledEnd,
      completedAt,
      priceCents,
      notes,
      actorEmail,
      actorEmail
    )
    .run();

  const service = await env.DB.prepare(
    `
      SELECT
        s.id,
        s.client_id,
        s.service_type,
        s.status,
        s.scheduled_start,
        s.scheduled_end,
        s.completed_at,
        s.price_cents,
        s.notes,
        s.created_at,
        s.updated_at,
        s.created_by,
        s.updated_by,
        s.version,
        c.first_name AS client_first_name,
        c.last_name AS client_last_name,
        c.email AS client_email,
        c.phone AS client_phone
      FROM services AS s
      INNER JOIN clients AS c
        ON c.id = s.client_id
      WHERE s.id = ?
        AND s.deleted_at IS NULL
        AND c.deleted_at IS NULL
      LIMIT 1
    `
  )
    .bind(serviceId)
    .first();

  if (!service) {
    throw new Error(
      "Service was created but could not be retrieved."
    );
  }

  return jsonResponse(
    {
      success: true,
      message: "Service created successfully.",
      data: {
        service,
      },
      metadata: {},
      timestamp: new Date().toISOString(),
    },
    201,
    origin
  );
}

async function handleServiceUpdateRequest(
  request,
  serviceId,
  env,
  actorEmail,
  origin
) {
  if (!env.DB) {
    throw new Error("D1 binding DB is unavailable.");
  }

  const body = await readJsonObject(
    request,
    MAX_CLIENT_BODY_BYTES
  );

  const allowedFields = new Set([
    "version",
    "clientId",
    "serviceType",
    "status",
    "scheduledStart",
    "scheduledEnd",
    "completedAt",
    "priceCents",
    "notes",
  ]);

  const unexpectedFields = Object.keys(body).filter(
    (field) => !allowedFields.has(field)
  );

  if (unexpectedFields.length) {
    throw new HttpError(
      400,
      `Unexpected field${unexpectedFields.length === 1 ? "" : "s"}: ${unexpectedFields.join(", ")}.`
    );
  }

  const expectedVersion = parseRequiredVersion(
    body.version
  );

  const existingService = await env.DB.prepare(
    `
      SELECT
        id,
        client_id,
        service_type,
        status,
        scheduled_start,
        scheduled_end,
        completed_at,
        price_cents,
        notes,
        version
      FROM services
      WHERE id = ?
        AND deleted_at IS NULL
      LIMIT 1
    `
  )
    .bind(serviceId)
    .first();

  if (!existingService) {
    throw new HttpError(
      404,
      "Service was not found."
    );
  }

  const editableFields = [
    "clientId",
    "serviceType",
    "status",
    "scheduledStart",
    "scheduledEnd",
    "completedAt",
    "priceCents",
    "notes",
  ];

  const hasEditableField = editableFields.some(
    (field) =>
      Object.prototype.hasOwnProperty.call(
        body,
        field
      )
  );

  if (!hasEditableField) {
    throw new HttpError(
      400,
      "At least one service field must be provided."
    );
  }

  const hasField = (field) =>
    Object.prototype.hasOwnProperty.call(
      body,
      field
    );

  const updatedService = {
    clientId: hasField("clientId")
      ? requireIdentifier(
          body.clientId,
          "clientId"
        )
      : existingService.client_id,

    serviceType: hasField("serviceType")
      ? requireText(
          body.serviceType,
          "serviceType",
          150
        )
      : existingService.service_type,

    status: hasField("status")
      ? normalizeOptionalServiceStatus(
          body.status
        )
      : existingService.status,

    scheduledStart: hasField("scheduledStart")
      ? (
          normalizeOptionalDateTime(
            body.scheduledStart,
            "scheduledStart"
          ) || null
        )
      : existingService.scheduled_start,

    scheduledEnd: hasField("scheduledEnd")
      ? (
          normalizeOptionalDateTime(
            body.scheduledEnd,
            "scheduledEnd"
          ) || null
        )
      : existingService.scheduled_end,

    completedAt: hasField("completedAt")
      ? (
          normalizeOptionalDateTime(
            body.completedAt,
            "completedAt"
          ) || null
        )
      : existingService.completed_at,

    priceCents: hasField("priceCents")
      ? parseOptionalNonNegativeInteger(
          body.priceCents,
          "priceCents"
        )
      : existingService.price_cents,

    notes: hasField("notes")
      ? optionalText(
          body.notes,
          "notes",
          5000
        )
      : existingService.notes,
  };

  if (!updatedService.status) {
    throw new HttpError(
      400,
      "status is required."
    );
  }

  if (
    updatedService.scheduledEnd &&
    !updatedService.scheduledStart
  ) {
    throw new HttpError(
      400,
      "scheduledStart is required when scheduledEnd is provided."
    );
  }

  if (
    updatedService.scheduledStart &&
    updatedService.scheduledEnd &&
    Date.parse(updatedService.scheduledEnd) <=
      Date.parse(updatedService.scheduledStart)
  ) {
    throw new HttpError(
      400,
      "scheduledEnd must be later than scheduledStart."
    );
  }

  if (
    ["scheduled", "in_progress"].includes(
      updatedService.status
    ) &&
    !updatedService.scheduledStart
  ) {
    throw new HttpError(
      400,
      `scheduledStart is required when status is ${updatedService.status}.`
    );
  }

  if (updatedService.status === "completed") {
    updatedService.completedAt ||=
      new Date().toISOString();
  } else {
    if (
      hasField("completedAt") &&
      updatedService.completedAt
    ) {
      throw new HttpError(
        400,
        "completedAt may only be provided for a completed service."
      );
    }

    updatedService.completedAt = null;
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
    .bind(updatedService.clientId)
    .first();

  if (!client) {
    throw new HttpError(
      400,
      "clientId must reference an active client."
    );
  }

  if (updatedService.scheduledStart) {
    const possibleDuplicate =
      await env.DB.prepare(
        `
          SELECT id
          FROM services
          WHERE id <> ?
            AND client_id = ?
            AND deleted_at IS NULL
            AND status <> 'cancelled'
            AND lower(service_type) = lower(?)
            AND scheduled_start = ?
          LIMIT 1
        `
      )
        .bind(
          serviceId,
          updatedService.clientId,
          updatedService.serviceType,
          updatedService.scheduledStart
        )
        .first();

    if (possibleDuplicate) {
      throw new HttpError(
        409,
        `A possible duplicate service already exists with ID ${possibleDuplicate.id}.`
      );
    }
  }

  const updateResult = await env.DB.prepare(
    `
      UPDATE services
      SET
        client_id = ?,
        service_type = ?,
        status = ?,
        scheduled_start = ?,
        scheduled_end = ?,
        completed_at = ?,
        price_cents = ?,
        notes = ?,
        updated_at = datetime('now'),
        updated_by = ?,
        version = version + 1
      WHERE id = ?
        AND deleted_at IS NULL
        AND version = ?
    `
  )
    .bind(
      updatedService.clientId,
      updatedService.serviceType,
      updatedService.status,
      updatedService.scheduledStart,
      updatedService.scheduledEnd,
      updatedService.completedAt,
      updatedService.priceCents,
      updatedService.notes,
      actorEmail,
      serviceId,
      expectedVersion
    )
    .run();

  if (
    Number(updateResult.meta?.changes || 0) !== 1
  ) {
    const current = await env.DB.prepare(
      `
        SELECT version
        FROM services
        WHERE id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `
    )
      .bind(serviceId)
      .first();

    if (!current) {
      throw new HttpError(
        404,
        "Service was not found."
      );
    }

    throw new HttpError(
      409,
      `Service has changed since it was loaded. Current version is ${current.version}.`
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
        s.completed_at,
        s.price_cents,
        s.notes,
        s.created_at,
        s.updated_at,
        s.created_by,
        s.updated_by,
        s.version,
        c.first_name AS client_first_name,
        c.last_name AS client_last_name,
        c.email AS client_email,
        c.phone AS client_phone,
        c.address_line1 AS client_address_line1,
        c.address_line2 AS client_address_line2,
        c.city AS client_city,
        c.state AS client_state,
        c.postal_code AS client_postal_code
      FROM services AS s
      INNER JOIN clients AS c
        ON c.id = s.client_id
      WHERE s.id = ?
        AND s.deleted_at IS NULL
        AND c.deleted_at IS NULL
      LIMIT 1
    `
  )
    .bind(serviceId)
    .first();

  if (!service) {
    throw new Error(
      "Service was updated but could not be retrieved."
    );
  }

  return jsonResponse(
    {
      success: true,
      message: "Service updated successfully.",
      data: {
        service,
      },
      metadata: {},
      timestamp: new Date().toISOString(),
    },
    200,
    origin
  );
}

async function handleServiceDeleteRequest(
  request,
  serviceId,
  env,
  actorEmail,
  origin
) {
  if (!env.DB) {
    throw new Error("D1 binding DB is unavailable.");
  }

  const body = await readJsonObject(
    request,
    MAX_CLIENT_BODY_BYTES
  );

  const allowedFields = new Set(["version"]);

  const unexpectedFields = Object.keys(body).filter(
    (field) => !allowedFields.has(field)
  );

  if (unexpectedFields.length) {
    throw new HttpError(
      400,
      `Unexpected field${unexpectedFields.length === 1 ? "" : "s"}: ${unexpectedFields.join(", ")}.`
    );
  }

  const expectedVersion = parseRequiredVersion(
    body.version
  );

  const existingService = await env.DB.prepare(
    `
      SELECT
        id,
        client_id,
        service_type,
        status,
        scheduled_start,
        version
      FROM services
      WHERE id = ?
        AND deleted_at IS NULL
      LIMIT 1
    `
  )
    .bind(serviceId)
    .first();

  if (!existingService) {
    throw new HttpError(
      404,
      "Service was not found."
    );
  }

  const deleteResult = await env.DB.prepare(
    `
      UPDATE services
      SET
        deleted_at = datetime('now'),
        updated_at = datetime('now'),
        updated_by = ?,
        version = version + 1
      WHERE id = ?
        AND deleted_at IS NULL
        AND version = ?
    `
  )
    .bind(
      actorEmail,
      serviceId,
      expectedVersion
    )
    .run();

  if (
    Number(deleteResult.meta?.changes || 0) !== 1
  ) {
    const currentService = await env.DB.prepare(
      `
        SELECT version
        FROM services
        WHERE id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `
    )
      .bind(serviceId)
      .first();

    if (!currentService) {
      throw new HttpError(
        404,
        "Service was not found."
      );
    }

    throw new HttpError(
      409,
      `Service has changed since it was loaded. Current version is ${currentService.version}.`
    );
  }

  return jsonResponse(
    {
      success: true,
      message: "Service deleted successfully.",
      data: {
        service: {
          id: serviceId,
          client_id: existingService.client_id,
          service_type: existingService.service_type,
          status: existingService.status,
          scheduled_start:
            existingService.scheduled_start,
          deleted: true,
          version: expectedVersion + 1,
        },
      },
      metadata: {},
      timestamp: new Date().toISOString(),
    },
    200,
    origin
  );
}

async function handleClientsListRequest(url, env, origin) {
  if (!env.DB) {
    throw new Error("D1 binding DB is unavailable.");
  }

  const search = String(url.searchParams.get("search") || "").trim();
  const limit = parseBoundedInteger(
    url.searchParams.get("limit"),
    25,
    1,
    100,
    "limit"
  );
  const offset = parseBoundedInteger(
    url.searchParams.get("offset"),
    0,
    0,
    100000,
    "offset"
  );

  let whereClause = "deleted_at IS NULL";
  const queryParameters = [];
  const countParameters = [];

  if (search) {
    const searchPattern = `%${escapeLikePattern(search)}%`;

    whereClause += `
      AND (
        first_name LIKE ? ESCAPE '\\' COLLATE NOCASE
        OR last_name LIKE ? ESCAPE '\\' COLLATE NOCASE
        OR email LIKE ? ESCAPE '\\' COLLATE NOCASE
        OR phone LIKE ? ESCAPE '\\' COLLATE NOCASE
        OR city LIKE ? ESCAPE '\\' COLLATE NOCASE
        OR state LIKE ? ESCAPE '\\' COLLATE NOCASE
      )
    `;

    const searchValues = Array(6).fill(searchPattern);
    queryParameters.push(...searchValues);
    countParameters.push(...searchValues);
  }

  queryParameters.push(limit, offset);

  const clientsStatement = env.DB.prepare(
    `
      SELECT
        id,
        first_name,
        last_name,
        email,
        phone,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        created_at,
        updated_at,
        version
      FROM clients
      WHERE ${whereClause}
      ORDER BY
        last_name COLLATE NOCASE ASC,
        first_name COLLATE NOCASE ASC,
        created_at DESC
      LIMIT ?
      OFFSET ?
    `
  ).bind(...queryParameters);

  const countStatement = env.DB.prepare(
    `
      SELECT COUNT(*) AS total
      FROM clients
      WHERE ${whereClause}
    `
  ).bind(...countParameters);

  const [clientsResult, countResult] = await Promise.all([
    clientsStatement.all(),
    countStatement.first(),
  ]);

  const clients = Array.isArray(clientsResult.results)
    ? clientsResult.results
    : [];

  const total = Number(countResult?.total || 0);

  return jsonResponse(
    {
      success: true,
      message: "Clients retrieved successfully.",
      data: {
        clients,
      },
      metadata: {
        search,
        limit,
        offset,
        returned: clients.length,
        total,
        hasMore: offset + clients.length < total,
      },
      timestamp: new Date().toISOString(),
    },
    200,
    origin
  );
}

async function handleClientDetailRequest(
  clientId,
  env,
  origin
) {
  if (!env.DB) {
    throw new Error("D1 binding DB is unavailable.");
  }

  const client = await env.DB.prepare(
    `
      SELECT
        id,
        first_name,
        last_name,
        email,
        phone,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        notes,
        created_at,
        updated_at,
        created_by,
        updated_by,
        version
      FROM clients
      WHERE id = ?
        AND deleted_at IS NULL
      LIMIT 1
    `
  )
    .bind(clientId)
    .first();

  if (!client) {
    throw new HttpError(404, "Client was not found.");
  }

  return jsonResponse(
    {
      success: true,
      message: "Client retrieved successfully.",
      data: {
        client,
      },
      metadata: {},
      timestamp: new Date().toISOString(),
    },
    200,
    origin
  );
}

async function handleClientCreateRequest(
  request,
  env,
  actorEmail,
  origin
) {
  if (!env.DB) {
    throw new Error("D1 binding DB is unavailable.");
  }

  const body = await readJsonObject(
    request,
    MAX_CLIENT_BODY_BYTES
  );

  const allowedFields = new Set([
    "firstName",
    "lastName",
    "email",
    "phone",
    "addressLine1",
    "addressLine2",
    "city",
    "state",
    "postalCode",
    "notes",
  ]);

  const unexpectedFields = Object.keys(body).filter(
    (field) => !allowedFields.has(field)
  );

  if (unexpectedFields.length) {
    throw new HttpError(
      400,
      `Unexpected field${unexpectedFields.length === 1 ? "" : "s"}: ${unexpectedFields.join(", ")}.`
    );
  }

  const clientInput = {
    firstName: requireText(body.firstName, "firstName", 100),
    lastName: requireText(body.lastName, "lastName", 100),
    email: normalizeOptionalEmail(body.email),
    phone: optionalText(body.phone, "phone", 30),
    addressLine1: optionalText(
      body.addressLine1,
      "addressLine1",
      200
    ),
    addressLine2: optionalText(
      body.addressLine2,
      "addressLine2",
      200
    ),
    city: optionalText(body.city, "city", 100),
    state: optionalText(body.state, "state", 50),
    postalCode: optionalText(
      body.postalCode,
      "postalCode",
      20
    ),
    notes: optionalText(body.notes, "notes", 5000),
  };

  const possibleDuplicate = await env.DB.prepare(
    `
      SELECT
        id,
        first_name,
        last_name,
        email,
        phone
      FROM clients
      WHERE deleted_at IS NULL
        AND lower(first_name) = lower(?)
        AND lower(last_name) = lower(?)
        AND (
          (? IS NOT NULL AND lower(email) = lower(?))
          OR
          (? IS NOT NULL AND phone = ?)
        )
      LIMIT 1
    `
  )
    .bind(
      clientInput.firstName,
      clientInput.lastName,
      clientInput.email,
      clientInput.email,
      clientInput.phone,
      clientInput.phone
    )
    .first();

  if (possibleDuplicate) {
    throw new HttpError(
      409,
      `A possible duplicate client already exists with ID ${possibleDuplicate.id}.`
    );
  }

  const clientId = `cli_${crypto.randomUUID()}`;

  await env.DB.prepare(
    `
      INSERT INTO clients (
        id,
        first_name,
        last_name,
        email,
        phone,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        notes,
        created_by,
        updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  )
    .bind(
      clientId,
      clientInput.firstName,
      clientInput.lastName,
      clientInput.email,
      clientInput.phone,
      clientInput.addressLine1,
      clientInput.addressLine2,
      clientInput.city,
      clientInput.state,
      clientInput.postalCode,
      clientInput.notes,
      actorEmail,
      actorEmail
    )
    .run();

  const client = await env.DB.prepare(
    `
      SELECT
        id,
        first_name,
        last_name,
        email,
        phone,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        notes,
        created_at,
        updated_at,
        created_by,
        updated_by,
        version
      FROM clients
      WHERE id = ?
      LIMIT 1
    `
  )
    .bind(clientId)
    .first();

  if (!client) {
    throw new Error("Client was created but could not be retrieved.");
  }

  return jsonResponse(
    {
      success: true,
      message: "Client created successfully.",
      data: {
        client,
      },
      metadata: {},
      timestamp: new Date().toISOString(),
    },
    201,
    origin
  );
}

async function handleClientUpdateRequest(
  request,
  clientId,
  env,
  actorEmail,
  origin
) {
  if (!env.DB) {
    throw new Error("D1 binding DB is unavailable.");
  }

  const body = await readJsonObject(
    request,
    MAX_CLIENT_BODY_BYTES
  );

  const allowedFields = new Set([
    "version",
    "firstName",
    "lastName",
    "email",
    "phone",
    "addressLine1",
    "addressLine2",
    "city",
    "state",
    "postalCode",
    "notes",
  ]);

  const unexpectedFields = Object.keys(body).filter(
    (field) => !allowedFields.has(field)
  );

  if (unexpectedFields.length) {
    throw new HttpError(
      400,
      `Unexpected field${unexpectedFields.length === 1 ? "" : "s"}: ${unexpectedFields.join(", ")}.`
    );
  }

  const expectedVersion = parseRequiredVersion(body.version);

  const existingClient = await env.DB.prepare(
    `
      SELECT
        id,
        first_name,
        last_name,
        email,
        phone,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        notes,
        version
      FROM clients
      WHERE id = ?
        AND deleted_at IS NULL
      LIMIT 1
    `
  )
    .bind(clientId)
    .first();

  if (!existingClient) {
    throw new HttpError(404, "Client was not found.");
  }

  const hasEditableField = [
    "firstName",
    "lastName",
    "email",
    "phone",
    "addressLine1",
    "addressLine2",
    "city",
    "state",
    "postalCode",
    "notes",
  ].some((field) =>
    Object.prototype.hasOwnProperty.call(body, field)
  );

  if (!hasEditableField) {
    throw new HttpError(
      400,
      "At least one client field must be provided."
    );
  }

  const updatedClient = {
    firstName: Object.prototype.hasOwnProperty.call(body, "firstName")
      ? requireText(body.firstName, "firstName", 100)
      : existingClient.first_name,

    lastName: Object.prototype.hasOwnProperty.call(body, "lastName")
      ? requireText(body.lastName, "lastName", 100)
      : existingClient.last_name,

    email: Object.prototype.hasOwnProperty.call(body, "email")
      ? normalizeOptionalEmail(body.email)
      : existingClient.email,

    phone: Object.prototype.hasOwnProperty.call(body, "phone")
      ? optionalText(body.phone, "phone", 30)
      : existingClient.phone,

    addressLine1: Object.prototype.hasOwnProperty.call(body, "addressLine1")
      ? optionalText(body.addressLine1, "addressLine1", 200)
      : existingClient.address_line1,

    addressLine2: Object.prototype.hasOwnProperty.call(body, "addressLine2")
      ? optionalText(body.addressLine2, "addressLine2", 200)
      : existingClient.address_line2,

    city: Object.prototype.hasOwnProperty.call(body, "city")
      ? optionalText(body.city, "city", 100)
      : existingClient.city,

    state: Object.prototype.hasOwnProperty.call(body, "state")
      ? optionalText(body.state, "state", 50)
      : existingClient.state,

    postalCode: Object.prototype.hasOwnProperty.call(body, "postalCode")
      ? optionalText(body.postalCode, "postalCode", 20)
      : existingClient.postal_code,

    notes: Object.prototype.hasOwnProperty.call(body, "notes")
      ? optionalText(body.notes, "notes", 5000)
      : existingClient.notes,
  };

  const possibleDuplicate = await env.DB.prepare(
    `
      SELECT id
      FROM clients
      WHERE id <> ?
        AND deleted_at IS NULL
        AND lower(first_name) = lower(?)
        AND lower(last_name) = lower(?)
        AND (
          (? IS NOT NULL AND lower(email) = lower(?))
          OR
          (? IS NOT NULL AND phone = ?)
        )
      LIMIT 1
    `
  )
    .bind(
      clientId,
      updatedClient.firstName,
      updatedClient.lastName,
      updatedClient.email,
      updatedClient.email,
      updatedClient.phone,
      updatedClient.phone
    )
    .first();

  if (possibleDuplicate) {
    throw new HttpError(
      409,
      `A possible duplicate client already exists with ID ${possibleDuplicate.id}.`
    );
  }

  const updateResult = await env.DB.prepare(
    `
      UPDATE clients
      SET
        first_name = ?,
        last_name = ?,
        email = ?,
        phone = ?,
        address_line1 = ?,
        address_line2 = ?,
        city = ?,
        state = ?,
        postal_code = ?,
        notes = ?,
        updated_at = datetime('now'),
        updated_by = ?,
        version = version + 1
      WHERE id = ?
        AND deleted_at IS NULL
        AND version = ?
    `
  )
    .bind(
      updatedClient.firstName,
      updatedClient.lastName,
      updatedClient.email,
      updatedClient.phone,
      updatedClient.addressLine1,
      updatedClient.addressLine2,
      updatedClient.city,
      updatedClient.state,
      updatedClient.postalCode,
      updatedClient.notes,
      actorEmail,
      clientId,
      expectedVersion
    )
    .run();

  if (Number(updateResult.meta?.changes || 0) !== 1) {
    const current = await env.DB.prepare(
      `
        SELECT version
        FROM clients
        WHERE id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `
    )
      .bind(clientId)
      .first();

    if (!current) {
      throw new HttpError(404, "Client was not found.");
    }

    throw new HttpError(
      409,
      `Client has changed since it was loaded. Current version is ${current.version}.`
    );
  }

  const client = await env.DB.prepare(
    `
      SELECT
        id,
        first_name,
        last_name,
        email,
        phone,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        notes,
        created_at,
        updated_at,
        created_by,
        updated_by,
        version
      FROM clients
      WHERE id = ?
        AND deleted_at IS NULL
      LIMIT 1
    `
  )
    .bind(clientId)
    .first();

  if (!client) {
    throw new Error("Client was updated but could not be retrieved.");
  }

  return jsonResponse(
    {
      success: true,
      message: "Client updated successfully.",
      data: {
        client,
      },
      metadata: {},
      timestamp: new Date().toISOString(),
    },
    200,
    origin
  );
}

async function handleClientDeleteRequest(
  request,
  clientId,
  env,
  actorEmail,
  origin
) {
  if (!env.DB) {
    throw new Error("D1 binding DB is unavailable.");
  }

  const body = await readJsonObject(
    request,
    MAX_CLIENT_BODY_BYTES
  );

  const allowedFields = new Set(["version"]);

  const unexpectedFields = Object.keys(body).filter(
    (field) => !allowedFields.has(field)
  );

  if (unexpectedFields.length) {
    throw new HttpError(
      400,
      `Unexpected field${unexpectedFields.length === 1 ? "" : "s"}: ${unexpectedFields.join(", ")}.`
    );
  }

  const expectedVersion = parseRequiredVersion(body.version);

  const existingClient = await env.DB.prepare(
    `
      SELECT
        id,
        first_name,
        last_name,
        version
      FROM clients
      WHERE id = ?
        AND deleted_at IS NULL
      LIMIT 1
    `
  )
    .bind(clientId)
    .first();

  if (!existingClient) {
    throw new HttpError(404, "Client was not found.");
  }

  const activeService = await env.DB.prepare(
    `
      SELECT
        id,
        service_type,
        status,
        scheduled_start
      FROM services
      WHERE client_id = ?
        AND deleted_at IS NULL
        AND status IN ('scheduled', 'in_progress')
      ORDER BY scheduled_start ASC
      LIMIT 1
    `
  )
    .bind(clientId)
    .first();

  if (activeService) {
    throw new HttpError(
      409,
      `Client cannot be deleted while service ${activeService.id} is ${activeService.status}.`
    );
  }

  const deleteResult = await env.DB.prepare(
    `
      UPDATE clients
      SET
        deleted_at = datetime('now'),
        updated_at = datetime('now'),
        updated_by = ?,
        version = version + 1
      WHERE id = ?
        AND deleted_at IS NULL
        AND version = ?
        AND NOT EXISTS (
          SELECT 1
          FROM services
          WHERE client_id = ?
            AND deleted_at IS NULL
            AND status IN ('scheduled', 'in_progress')
        )
    `
  )
    .bind(
      actorEmail,
      clientId,
      expectedVersion,
      clientId
    )
    .run();

  if (Number(deleteResult.meta?.changes || 0) !== 1) {
    const currentClient = await env.DB.prepare(
      `
        SELECT version
        FROM clients
        WHERE id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `
    )
      .bind(clientId)
      .first();

    if (!currentClient) {
      throw new HttpError(404, "Client was not found.");
    }

    const currentActiveService = await env.DB.prepare(
      `
        SELECT id, status
        FROM services
        WHERE client_id = ?
          AND deleted_at IS NULL
          AND status IN ('scheduled', 'in_progress')
        LIMIT 1
      `
    )
      .bind(clientId)
      .first();

    if (currentActiveService) {
      throw new HttpError(
        409,
        `Client cannot be deleted while service ${currentActiveService.id} is ${currentActiveService.status}.`
      );
    }

    throw new HttpError(
      409,
      `Client has changed since it was loaded. Current version is ${currentClient.version}.`
    );
  }

  return jsonResponse(
    {
      success: true,
      message: "Client deleted successfully.",
      data: {
        client: {
          id: clientId,
          first_name: existingClient.first_name,
          last_name: existingClient.last_name,
          deleted: true,
          version: expectedVersion + 1,
        },
      },
      metadata: {},
      timestamp: new Date().toISOString(),
    },
    200,
    origin
  );
}

async function handleGalleryRequest(
  request,
  env,
  actorEmail,
  origin
) {
  const contentLength = Number(
    request.headers.get("Content-Length") || 0
  );

  if (contentLength > MAX_BODY_BYTES) {
    throw new HttpError(413, "Request body is too large.");
  }

  const bodyBytes = await request.arrayBuffer();

  if (bodyBytes.byteLength > MAX_BODY_BYTES) {
    throw new HttpError(413, "Request body is too large.");
  }

  let body;

  try {
    body = JSON.parse(new TextDecoder().decode(bodyBytes));
  } catch (_error) {
    throw new HttpError(400, "Request body must be valid JSON.");
  }

  if (!body || Array.isArray(body) || typeof body !== "object") {
    throw new HttpError(400, "Request body must be a JSON object.");
  }

  const action = String(body.action || "")
    .trim()
    .toLowerCase();

  if (!ALLOWED_ACTIONS.has(action)) {
    throw new HttpError(400, "Unsupported admin action.");
  }

  const upstreamUrl = validateAppsScriptUrl(env.APPS_SCRIPT_URL);

  const forwardedBody = {
    ...body,
    actorEmail,
    gatewaySecret: env.APPS_SCRIPT_SHARED_SECRET,
  };

  const upstreamResponse = await fetch(upstreamUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(forwardedBody),
    redirect: "follow",
  });

  const responseBody = await upstreamResponse.text();
  const headers = corsHeaders(origin);

  headers.set(
    "Content-Type",
    upstreamResponse.headers.get("Content-Type") ||
      "application/json;charset=utf-8"
  );

  headers.set("Cache-Control", "no-store");

  return new Response(responseBody, {
    status: upstreamResponse.status,
    headers,
  });
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

function validateConfiguration(env) {
  const required = [
    "APPS_SCRIPT_URL",
    "TEAM_DOMAIN",
    "POLICY_AUD",
    "APPS_SCRIPT_SHARED_SECRET",
    "ALLOWED_ADMIN_EMAILS",
  ];

  const missing = required.filter((key) => !String(env[key] || "").trim());
  if (missing.length) {
    throw new Error(`Missing Worker configuration: ${missing.join(", ")}`);
  }

  if (String(env.APPS_SCRIPT_SHARED_SECRET).length < 32) {
    throw new Error("APPS_SCRIPT_SHARED_SECRET must be at least 32 characters.");
  }

  if (!parseAllowedEmails(env.ALLOWED_ADMIN_EMAILS).size) {
    throw new Error("ALLOWED_ADMIN_EMAILS does not contain a valid email.");
  }
}

function validateAppsScriptUrl(value) {
  let url;
  try {
    url = new URL(String(value || "").trim());
  } catch (_error) {
    throw new Error("APPS_SCRIPT_URL is invalid.");
  }

  if (
    url.protocol !== "https:" ||
    url.hostname !== "script.google.com" ||
    !url.pathname.startsWith("/macros/s/") ||
    !url.pathname.endsWith("/exec")
  ) {
    throw new Error("APPS_SCRIPT_URL must be a deployed Google Apps Script /exec URL.");
  }

  return url;
}

async function verifyAccessJwt(token, env) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) {
    throw new HttpError(401, "Authentication token is invalid.");
  }

  let header;
  let claims;
  try {
    header = JSON.parse(decodeBase64UrlText(parts[0]));
    claims = JSON.parse(decodeBase64UrlText(parts[1]));
  } catch (_error) {
    throw new HttpError(401, "Authentication token is invalid.");
  }

  if (header.alg !== "RS256" || !header.kid) {
    throw new HttpError(401, "Authentication token algorithm is invalid.");
  }

  const teamBaseUrl = getTeamBaseUrl(env.TEAM_DOMAIN);
  const expectedIssuer = teamBaseUrl.replace(/\/$/, "");
  const actualIssuer = String(claims.iss || "").replace(/\/$/, "");
  if (actualIssuer !== expectedIssuer) {
    throw new HttpError(401, "Authentication token issuer is invalid.");
  }

  const expectedAudience = String(env.POLICY_AUD || "").trim();
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audiences.includes(expectedAudience)) {
    throw new HttpError(401, "Authentication token audience is invalid.");
  }

  const now = Math.floor(Date.now() / 1000);
  if (
    !Number.isFinite(claims.exp) ||
    claims.exp < now - JWT_CLOCK_SKEW_SECONDS
  ) {
    throw new HttpError(401, "Authentication token has expired.");
  }

  if (
    claims.nbf !== undefined &&
    (!Number.isFinite(claims.nbf) || claims.nbf > now + JWT_CLOCK_SKEW_SECONDS)
  ) {
    throw new HttpError(401, "Authentication token is not active.");
  }

  const jwk = await getSigningKey(
    `${teamBaseUrl}/cdn-cgi/access/certs`,
    header.kid
  );

  let publicKey;
  try {
    publicKey = await crypto.subtle.importKey(
      "jwk",
      jwk,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      false,
      ["verify"]
    );
  } catch (_error) {
    throw new HttpError(401, "Authentication signing key is invalid.");
  }

  const validSignature = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    publicKey,
    decodeBase64UrlBytes(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  );

  if (!validSignature) {
    throw new HttpError(401, "Authentication token signature is invalid.");
  }

  return claims;
}

async function getSigningKey(jwksUrl, keyId) {
  const now = Date.now();
  if (
    jwksCache.url !== jwksUrl ||
    jwksCache.expiresAt <= now ||
    !jwksCache.keys.length
  ) {
    await refreshSigningKeys(jwksUrl, now);
  }

  let key = jwksCache.keys.find((candidate) => candidate.kid === keyId);
  if (!key) {
    await refreshSigningKeys(jwksUrl, now);
    key = jwksCache.keys.find((candidate) => candidate.kid === keyId);
    if (!key) {
      throw new HttpError(401, "Authentication signing key was not found.");
    }
  }

  return key;
}

async function refreshSigningKeys(jwksUrl, now = Date.now()) {
  const response = await fetch(jwksUrl, {
    headers: { Accept: "application/json" },
    cf: { cacheTtl: 300, cacheEverything: true },
  });

  if (!response.ok) {
    throw new HttpError(401, "Authentication signing keys are unavailable.");
  }

  const payload = await response.json();
  if (!Array.isArray(payload.keys)) {
    throw new HttpError(401, "Authentication signing keys are invalid.");
  }

  jwksCache = {
    url: jwksUrl,
    expiresAt: now + JWKS_CACHE_TTL_MS,
    keys: payload.keys,
  };
}

function getTeamBaseUrl(value) {
  const domain = String(value || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");

  if (!domain || !/^[a-z0-9.-]+$/i.test(domain)) {
    throw new Error("TEAM_DOMAIN is invalid.");
  }

  return `https://${domain}`;
}

function parseAllowedEmails(value) {
  return new Set(
    String(value || "")
      .split(/[\s,;]+/)
      .map(normalizeEmail)
      .filter(Boolean)
  );
}

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function decodeBase64UrlText(value) {
  return new TextDecoder().decode(decodeBase64UrlBytes(value));
}

function decodeBase64UrlBytes(value) {
  const normalized = String(value || "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - normalized.length % 4) % 4),
    "="
  );
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function readJsonObject(request, maximumBytes) {
  const contentLength = Number(
    request.headers.get("Content-Length") || 0
  );

  if (
    !Number.isFinite(contentLength) ||
    contentLength < 0 ||
    contentLength > maximumBytes
  ) {
    throw new HttpError(413, "Request body is too large.");
  }

  const bodyBytes = await request.arrayBuffer();

  if (bodyBytes.byteLength > maximumBytes) {
    throw new HttpError(413, "Request body is too large.");
  }

  let body;

  try {
    body = JSON.parse(new TextDecoder().decode(bodyBytes));
  } catch (_error) {
    throw new HttpError(400, "Request body must be valid JSON.");
  }

  if (!body || Array.isArray(body) || typeof body !== "object") {
    throw new HttpError(400, "Request body must be a JSON object.");
  }

  return body;
}

function requireText(value, fieldName, maximumLength) {
  if (typeof value !== "string") {
    throw new HttpError(400, `${fieldName} is required.`);
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new HttpError(400, `${fieldName} is required.`);
  }

  if (normalized.length > maximumLength) {
    throw new HttpError(
      400,
      `${fieldName} cannot exceed ${maximumLength} characters.`
    );
  }

  return normalized;
}

function optionalText(value, fieldName, maximumLength) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (typeof value !== "string") {
    throw new HttpError(400, `${fieldName} must be text.`);
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  if (normalized.length > maximumLength) {
    throw new HttpError(
      400,
      `${fieldName} cannot exceed ${maximumLength} characters.`
    );
  }

  return normalized;
}

function normalizeOptionalEmail(value) {
  const email = optionalText(value, "email", 254);

  if (email === null) {
    return null;
  }

  const normalized = email.toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new HttpError(400, "email must be a valid email address.");
  }

  return normalized;
}

function getReviewIdFromPath(pathname) {
  const match = String(pathname || "").match(
    /^\/admin\/api\/reviews\/([^/]+)$/
  );

  if (!match) {
    return "";
  }

  let reviewId;

  try {
    reviewId =
      decodeURIComponent(match[1]).trim();
  } catch (_error) {
    throw new HttpError(
      400,
      "Review ID is invalid."
    );
  }

  if (
    !reviewId ||
    reviewId.length > 100 ||
    !/^[A-Za-z0-9_-]+$/.test(reviewId)
  ) {
    throw new HttpError(
      400,
      "Review ID is invalid."
    );
  }

  return reviewId;
}

function getServiceIdFromPath(pathname) {
  const match = String(pathname || "").match(
    /^\/admin\/api\/services\/([^/]+)$/
  );

  if (!match) {
    return "";
  }

  let serviceId;

  try {
    serviceId = decodeURIComponent(match[1]).trim();
  } catch (_error) {
    throw new HttpError(400, "Service ID is invalid.");
  }

  if (
    !serviceId ||
    serviceId.length > 100 ||
    !/^[A-Za-z0-9_-]+$/.test(serviceId)
  ) {
    throw new HttpError(400, "Service ID is invalid.");
  }

  return serviceId;
}

function getClientIdFromPath(pathname) {
  const match = String(pathname || "").match(
    /^\/admin\/api\/clients\/([^/]+)$/
  );

  if (!match) {
    return "";
  }

  let clientId;

  try {
    clientId = decodeURIComponent(match[1]).trim();
  } catch (_error) {
    throw new HttpError(400, "Client ID is invalid.");
  }

  if (
    !clientId ||
    clientId.length > 100 ||
    !/^[A-Za-z0-9_-]+$/.test(clientId)
  ) {
    throw new HttpError(400, "Client ID is invalid.");
  }

  return clientId;
}

function requireIdentifier(value, fieldName) {
  if (typeof value !== "string") {
    throw new HttpError(
      400,
      `${fieldName} is required.`
    );
  }

  const normalized = value.trim();

  if (
    !normalized ||
    normalized.length > 100 ||
    !/^[A-Za-z0-9_-]+$/.test(normalized)
  ) {
    throw new HttpError(
      400,
      `${fieldName} is invalid.`
    );
  }

  return normalized;
}

function optionalIdentifier(value, fieldName) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  const normalized = String(value).trim();

  if (
    !normalized ||
    normalized.length > 100 ||
    !/^[A-Za-z0-9_-]+$/.test(normalized)
  ) {
    throw new HttpError(
      400,
      `${fieldName} is invalid.`
    );
  }

  return normalized;
}

function normalizeOptionalReviewStatus(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  const normalized = String(value)
    .trim()
    .toLowerCase();

  const allowedStatuses = new Set([
    "draft",
    "published",
    "hidden",
  ]);

  if (!allowedStatuses.has(normalized)) {
    throw new HttpError(
      400,
      "status must be draft, published, or hidden."
    );
  }

  return normalized;
}

function parseOptionalRating(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const normalized = Number(value);

  if (
    !Number.isInteger(normalized) ||
    normalized < 1 ||
    normalized > 5
  ) {
    throw new HttpError(
      400,
      "rating must be a whole number between 1 and 5."
    );
  }

  return normalized;
}

function parseRequiredRating(value) {
  const rating = parseOptionalRating(value);

  if (rating === null) {
    throw new HttpError(
      400,
      "rating is required."
    );
  }

  return rating;
}

function normalizeOptionalServiceStatus(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  const normalized = String(value)
    .trim()
    .toLowerCase();

  const allowedStatuses = new Set([
    "scheduled",
    "in_progress",
    "completed",
    "cancelled",
  ]);

  if (!allowedStatuses.has(normalized)) {
    throw new HttpError(
      400,
      "status must be scheduled, in_progress, completed, or cancelled."
    );
  }

  return normalized;
}

function normalizeOptionalDateTime(value, fieldName) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  const normalized = String(value).trim();

  const timestamp = Date.parse(normalized);

  if (!Number.isFinite(timestamp)) {
    throw new HttpError(
      400,
      `${fieldName} must be a valid date or date-time.`
    );
  }

  return new Date(timestamp).toISOString();
}

function parseBoundedInteger(
  rawValue,
  defaultValue,
  minimum,
  maximum,
  fieldName
) {
  if (rawValue === null || rawValue === "") {
    return defaultValue;
  }

  if (!/^\d+$/.test(rawValue)) {
    throw new HttpError(
      400,
      `${fieldName} must be a whole number between ${minimum} and ${maximum}.`
    );
  }

  const value = Number(rawValue);

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

function parseRequiredVersion(value) {
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

function parseOptionalNonNegativeInteger(
  value,
  fieldName
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

function escapeLikePattern(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

function corsHeaders(origin) {
  const headers = new Headers({
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "600",
    "X-Content-Type-Options": "nosniff",
    Vary: "Origin",
  });

  if (origin === ALLOWED_ORIGIN) {
    headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  }

  return headers;
}

function jsonResponse(payload, status, origin) {
  const headers = corsHeaders(origin);
  headers.set("Content-Type", "application/json;charset=utf-8");
  headers.set("Cache-Control", "no-store");

  return new Response(JSON.stringify(payload), {
    status,
    headers,
  });
}
