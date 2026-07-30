export interface Env {
  DB: D1Database;
  APPS_SCRIPT_URL: string;
  TEAM_DOMAIN: string;
  POLICY_AUD: string;
  APPS_SCRIPT_SHARED_SECRET: string;
  ALLOWED_ADMIN_EMAILS: string;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify({ success: status < 400, data, timestamp: new Date().toISOString() }), {
    status,
    headers: { "Content-Type": "application/json;charset=utf-8", "Cache-Control": "no-store" },
  });

export async function body(request: Request): Promise<Record<string, unknown>> {
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > 64 * 1024) throw new HttpError(413, "Request body is too large.");
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!value || Array.isArray(value) || typeof value !== "object") throw new Error();
    return value as Record<string, unknown>;
  } catch { throw new HttpError(400, "Request body must be a JSON object."); }
}

export function text(value: unknown, name: string, max: number, required = false): string | null {
  if (value === undefined || value === null || value === "") {
    if (required) throw new HttpError(422, `${name} is required.`);
    return null;
  }
  const result = String(value).trim();
  if ((!result && required) || result.length > max) throw new HttpError(422, `${name} is invalid.`);
  return result || null;
}

export function page(url: URL): { limit: number; offset: number } {
  const limit = Number(url.searchParams.get("limit") ?? 50);
  const offset = Number(url.searchParams.get("offset") ?? 0);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0)
    throw new HttpError(400, "Invalid pagination.");
  return { limit, offset };
}
