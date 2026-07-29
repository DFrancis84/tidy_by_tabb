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

      if (request.method !== "POST") {
        throw new HttpError(405, "Only POST requests are supported.");
      }

      if (origin !== ALLOWED_ORIGIN) {
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

      const contentLength = Number(request.headers.get("Content-Length") || 0);
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

      const action = String(body.action || "").trim().toLowerCase();
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
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      const message = error instanceof HttpError
        ? error.message
        : "The admin gateway could not process this request.";

      if (!(error instanceof HttpError)) {
        console.error("Admin gateway failure:", error?.message || "Unknown error");
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

function corsHeaders(origin) {
  const headers = new Headers({
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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
