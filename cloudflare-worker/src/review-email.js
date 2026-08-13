const RESEND_URL = "https://api.resend.com/emails";
const FROM = "Tidy by Tabb <reviews@tidybytabb.com>";
const SUBJECT = "How did Tidy by Tabb do?";

export function isAdminReviewEmailRoute(request, url) {
  return request.method === "POST" && Boolean(parseRoute(url.pathname));
}

export async function handleAdminReviewEmailRoute({
  request, url, env, actorEmail, origin, jsonResponse, HttpError,
}) {
  if (!env.DB) throw new Error("D1 binding DB is unavailable.");
  if (!String(env.RESEND_API_KEY || "").trim()) {
    throw new Error("RESEND_API_KEY is unavailable.");
  }

  const route = parseRoute(url.pathname);
  if (!route) throw new HttpError(404, "Review email route was not found.");

  const body = await readJson(request, HttpError);
  if (Object.keys(body).some((key) => key !== "reviewUrl")) {
    throw new HttpError(400, "Only reviewUrl may be submitted.");
  }

  const reviewUrl = validateReviewUrl(body.reviewUrl, route.kind, HttpError);
  const token = reviewUrl.searchParams.get("token");
  const tokenHash = await hashToken(token);

  const row = route.kind === "generic"
    ? await loadGeneric(env, route.id)
    : await loadService(env, route.id);

  if (!row) throw new HttpError(404, "Review request was not found.");
  if (row.status !== "pending") {
    throw new HttpError(409,
      row.status === "submitted"
        ? "This review request has already been completed."
        : "This review request is no longer active."
    );
  }
  if (Date.parse(row.expires_at) <= Date.now()) {
    throw new HttpError(410, "This review request has expired.");
  }
  if (!constantTimeEqual(String(row.token_hash || ""), tokenHash)) {
    throw new HttpError(409, "The review link does not match this review request.");
  }

  const to = String(row.recipient_email || "").trim().toLowerCase();
  if (!to) throw new HttpError(409, "The review request has no recipient email.");

  const name = String(row.recipient_name || "").trim();
  const firstName = name.split(/\s+/).filter(Boolean)[0] || "there";
  const serviceType = route.kind === "service"
    ? String(row.service_type || "").trim()
    : "";

  const email = buildEmail(firstName, reviewUrl.toString(), serviceType);
  const sendNumber = Math.max(0, Number(row.email_send_count || 0)) + 1;

  const payload = {
    from: FROM,
    to: [to],
    subject: SUBJECT,
    html: email.html,
    text: email.text,
  };

  const replyTo = String(env.REVIEW_REPLY_TO || "").trim();
  if (replyTo) payload.reply_to = replyTo;

  let providerResponse;
  try {
    providerResponse = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "User-Agent": "tidy-by-tabb-worker/1.0",
        "Idempotency-Key": `review-${route.kind}-${route.id}-${sendNumber}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Resend network failure:", error?.message || "unknown");
    throw new HttpError(502, "The email provider could not be reached.");
  }

  let providerBody = {};
  try { providerBody = await providerResponse.json(); } catch {}

  if (!providerResponse.ok) {
    console.error("Resend send failure:", providerResponse.status, providerBody?.message || "");
    throw new HttpError(
      502,
      providerBody?.message
        ? `Email provider rejected the send: ${providerBody.message}`
        : `Email provider rejected the send (${providerResponse.status}).`
    );
  }

  const providerId = String(providerBody?.id || "").trim();
  if (!providerId) {
    throw new HttpError(502, "The email provider did not return a message ID.");
  }

  const sentAt = new Date().toISOString();
  const table = route.kind === "generic" ? "generic_review_requests" : "review_requests";

  const result = await env.DB.prepare(`
    UPDATE ${table}
    SET
      email_sent_at = ?,
      email_sent_to = ?,
      email_send_count = email_send_count + 1,
      email_provider_id = ?,
      updated_at = datetime('now'),
      updated_by = ?,
      version = version + 1
    WHERE id = ? AND status = 'pending'
  `).bind(sentAt, to, providerId, actorEmail, route.id).run();

  if (Number(result?.meta?.changes || 0) !== 1) {
    console.error("Email sent but tracking update failed:", route.id, providerId);
    throw new HttpError(
      500,
      "The email was sent, but CMS tracking could not be updated. Do not immediately resend."
    );
  }

  return jsonResponse({
    success: true,
    message: "Review email sent successfully.",
    data: {
      email: {
        requestId: route.id,
        requestType: route.kind,
        sentTo: to,
        sentAt,
        sendCount: sendNumber,
        providerId,
      },
    },
    metadata: {},
    timestamp: new Date().toISOString(),
  }, 200, origin);
}

function parseRoute(pathname) {
  const generic = pathname.match(/^\/admin\/api\/review-requests\/generic\/([A-Za-z0-9_-]+)\/send-email$/);
  if (generic) return { kind: "generic", id: generic[1] };

  const service = pathname.match(/^\/admin\/api\/review-requests\/([A-Za-z0-9_-]+)\/send-email$/);
  if (service) return { kind: "service", id: service[1] };

  return null;
}

async function loadService(env, id) {
  return await env.DB.prepare(`
    SELECT
      rr.id, rr.token_hash, rr.status, rr.expires_at, rr.email_send_count,
      c.email AS recipient_email,
      TRIM(COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,'')) AS recipient_name,
      s.service_type
    FROM review_requests rr
    INNER JOIN clients c ON c.id = rr.client_id AND c.deleted_at IS NULL
    INNER JOIN services s ON s.id = rr.service_id AND s.deleted_at IS NULL
    WHERE rr.id = ?
    LIMIT 1
  `).bind(id).first();
}

async function loadGeneric(env, id) {
  return await env.DB.prepare(`
    SELECT
      id, token_hash, status, expires_at, email_send_count,
      recipient_email, recipient_name
    FROM generic_review_requests
    WHERE id = ?
    LIMIT 1
  `).bind(id).first();
}

function validateReviewUrl(value, kind, HttpError) {
  if (typeof value !== "string") throw new HttpError(400, "reviewUrl is required.");

  let url;
  try { url = new URL(value.trim()); }
  catch { throw new HttpError(400, "reviewUrl must be a valid URL."); }

  if (
    url.protocol !== "https:" ||
    url.hostname !== "www.tidybytabb.com" ||
    url.pathname !== "/review.html"
  ) {
    throw new HttpError(400, "reviewUrl must be a Tidy by Tabb review link.");
  }

  const token = String(url.searchParams.get("token") || "");
  if (!token || token.length > 200 || !/^[A-Za-z0-9_-]+$/.test(token)) {
    throw new HttpError(400, "reviewUrl contains an invalid token.");
  }

  const mode = String(url.searchParams.get("mode") || "").toLowerCase();
  if (kind === "generic" && mode !== "generic") {
    throw new HttpError(400, "Generic requests require a generic review link.");
  }
  if (kind === "service" && mode === "generic") {
    throw new HttpError(400, "Service requests require a service review link.");
  }

  return url;
}

async function readJson(request, HttpError) {
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > 24 * 1024) {
    throw new HttpError(413, "Request body is too large.");
  }

  try {
    const body = JSON.parse(new TextDecoder().decode(bytes));
    if (!body || Array.isArray(body) || typeof body !== "object") throw new Error();
    return body;
  } catch {
    throw new HttpError(400, "Request body must be a JSON object.");
  }
}

async function hashToken(token) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let i = 0; i < left.length; i += 1) {
    difference |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return difference === 0;
}

function buildEmail(firstName, reviewUrl, serviceType) {
  const safeName = escapeHtml(firstName);
  const safeUrl = escapeHtml(reviewUrl);
  const safeService = escapeHtml(serviceType);

  const contextHtml = serviceType ? ` for your ${safeService}` : "";
  const contextText = serviceType ? ` for your ${serviceType}` : "";

  const html = `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f7fbfd;font-family:Arial,Helvetica,sans-serif;color:#20324a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7fbfd;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
        style="max-width:600px;background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 18px 45px rgba(21,45,75,.12);">
        <tr><td style="height:8px;background:#e75aa8;"></td></tr>
        <tr><td style="padding:38px 34px 32px;text-align:center;">
          <div style="font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#738496;margin-bottom:12px;">
            Tidy by Tabb
          </div>
          <h1 style="margin:0 0 16px;font-size:30px;color:#20324a;">How did we do?</h1>
          <p style="font-size:16px;line-height:1.65;color:#52687b;">Hi ${safeName},</p>
          <p style="font-size:16px;line-height:1.65;color:#52687b;">
            Thank you for choosing Tidy by Tabb${contextHtml}.
            Your feedback means a lot and helps a local small business grow.
          </p>
          <p style="margin:28px 0;">
            <a href="${safeUrl}" style="display:inline-block;padding:14px 24px;border-radius:999px;background:#20324a;color:#fff;text-decoration:none;font-weight:700;">
              Leave a Review
            </a>
          </p>
          <p style="font-size:13px;color:#82909e;">This secure review link expires after 30 days.</p>
          <p style="font-size:15px;line-height:1.55;color:#52687b;margin-top:26px;">
            Thank you for trusting me with your space!<br>
            <strong>Tabb</strong><br>
            Tidy by Tabb
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    `Hi ${firstName},`,
    "",
    `Thank you for choosing Tidy by Tabb${contextText}.`,
    "Your feedback means a lot and helps a local small business grow.",
    "",
    "Leave a review:",
    reviewUrl,
    "",
    "This secure review link expires after 30 days.",
    "",
    "Thank you for trusting me with your space!",
    "Tabb",
    "Tidy by Tabb",
  ].join("\n");

  return { html, text };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
