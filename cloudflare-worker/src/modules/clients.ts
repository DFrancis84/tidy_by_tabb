import { body, HttpError, json, page, text, type Env } from "../api";
type Row = Record<string, string | number | null>;

export async function clients(request: Request, env: Env, actor: string, id?: string): Promise<Response> {
  const url = new URL(request.url);
  if (!id && request.method === "GET") {
    const { limit, offset } = page(url);
    const search = url.searchParams.get("search")?.trim();
    const sql = search
      ? "SELECT * FROM clients WHERE deleted_at IS NULL AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ?) ORDER BY last_name, first_name LIMIT ? OFFSET ?"
      : "SELECT * FROM clients WHERE deleted_at IS NULL ORDER BY last_name, first_name LIMIT ? OFFSET ?";
    const pattern = `%${search}%`;
    const values = search ? [pattern, pattern, pattern, pattern, limit, offset] : [limit, offset];
    const result = await env.DB.prepare(sql).bind(...values).all<Row>();
    return json({ items: result.results.map(map), pagination: { limit, offset } });
  }
  if (id && request.method === "GET") {
    const row = await env.DB.prepare("SELECT * FROM clients WHERE id=? AND deleted_at IS NULL").bind(id).first<Row>();
    if (!row) throw new HttpError(404, "Client was not found.");
    return json(map(row));
  }
  const input = await body(request);
  if (!id && request.method === "POST") {
    const record = fields(input); const newId = crypto.randomUUID();
    await env.DB.prepare(`INSERT INTO clients
      (id,first_name,last_name,email,phone,address_line1,address_line2,city,state,postal_code,notes,created_by,updated_by)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(newId, ...record, actor, actor).run();
    return json(map((await env.DB.prepare("SELECT * FROM clients WHERE id=?").bind(newId).first<Row>())!), 201);
  }
  const version = Number(input.version);
  if (!Number.isSafeInteger(version) || version < 1) throw new HttpError(422, "version is required.");
  if (id && request.method === "PATCH") {
    const record = fields(input);
    const result = await env.DB.prepare(`UPDATE clients SET first_name=?,last_name=?,email=?,phone=?,address_line1=?,address_line2=?,city=?,state=?,postal_code=?,notes=?,updated_at=datetime('now'),updated_by=?,version=version+1 WHERE id=? AND deleted_at IS NULL AND version=?`).bind(...record, actor, id, version).run();
    await changed(env.DB, result.meta.changes, id);
    return json(map((await env.DB.prepare("SELECT * FROM clients WHERE id=?").bind(id).first<Row>())!));
  }
  if (id && request.method === "DELETE") {
    const result = await env.DB.prepare("UPDATE clients SET deleted_at=datetime('now'),updated_at=datetime('now'),updated_by=?,version=version+1 WHERE id=? AND deleted_at IS NULL AND version=?").bind(actor,id,version).run();
    await changed(env.DB, result.meta.changes, id);
    return new Response(null, { status: 204 });
  }
  throw new HttpError(405, "Method is not allowed.");
}

function fields(value: Record<string, unknown>) {
  const email = text(value.email,"email",254);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(422,"email is invalid.");
  return [text(value.firstName,"firstName",100,true)!,text(value.lastName,"lastName",100,true)!,email?.toLowerCase()??null,text(value.phone,"phone",30),text(value.addressLine1,"addressLine1",200),text(value.addressLine2,"addressLine2",200),text(value.city,"city",100),text(value.state,"state",100),text(value.postalCode,"postalCode",20),text(value.notes,"notes",5000)] as const;
}
async function changed(db:D1Database,count:number,id:string) {
  if(count)return;
  const exists=await db.prepare("SELECT 1 FROM clients WHERE id=? AND deleted_at IS NULL").bind(id).first();
  throw new HttpError(exists?409:404,exists?"Client was modified by another request. Reload and try again.":"Client was not found.");
}
function map(r:Row) {
  return {id:r.id,firstName:r.first_name,lastName:r.last_name,email:r.email,phone:r.phone,addressLine1:r.address_line1,addressLine2:r.address_line2,city:r.city,state:r.state,postalCode:r.postal_code,notes:r.notes,createdAt:r.created_at,updatedAt:r.updated_at,version:r.version};
}
