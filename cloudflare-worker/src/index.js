const ALLOWED_ORIGIN = "https://www.tidybytabb.com";
const ALLOWED_ACTIONS = new Set([
  "create",
  "update",
  "delete",
  "uploadimage",
]);
const MAX_BODY_BYTES = 15 * 1024 * 1024;
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

      const url = new URL(request.url);

      if (
        request.method === "GET" &&
        url.pathname === "/admin/api/health"
      ) {
        return await handleHealthRequest(env, origin);
      }

      if (
        request.method === "GET" &&
        url.pathname === "/admin/api/clients"
      ) {
        return await handleClientsListRequest(url, env, origin);
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
        (SELECT COUNT(*) FROM clients WHERE deleted_at IS NULL) AS client_count,
        (SELECT COUNT(*) FROM services WHERE deleted_at IS NULL) AS service_count
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

function escapeLikePattern(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

function corsHeaders(origin) {
  const headers = new Headers({
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
