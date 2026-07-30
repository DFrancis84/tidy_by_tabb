import { body, HttpError, json, page, text, type Env } from "../api";
type Row = Record<string, string | number | null>;
const statuses = new Set(["scheduled","in_progress","completed","cancelled"]);

export async function services(request:Request,env:Env,actor:string,id?:string):Promise<Response>{
  const url=new URL(request.url);
  if(!id&&request.method==="GET"){
    const {limit,offset}=page(url), clientId=url.searchParams.get("clientId"), status=url.searchParams.get("status");
    if(status&&!statuses.has(status))throw new HttpError(400,"status is invalid.");
    const clauses=["deleted_at IS NULL"], values:unknown[]=[];
    if(clientId){clauses.push("client_id=?");values.push(clientId);} if(status){clauses.push("status=?");values.push(status);}
    const result=await env.DB.prepare(`SELECT * FROM services WHERE ${clauses.join(" AND ")} ORDER BY COALESCE(scheduled_start,created_at) DESC LIMIT ? OFFSET ?`).bind(...values,limit,offset).all<Row>();
    return json({items:result.results.map(map),pagination:{limit,offset}});
  }
  if(id&&request.method==="GET"){
    const row=await env.DB.prepare("SELECT * FROM services WHERE id=? AND deleted_at IS NULL").bind(id).first<Row>();
    if(!row)throw new HttpError(404,"Service was not found."); return json(map(row));
  }
  const input=await body(request);
  if(!id&&request.method==="POST"){
    const f=await fields(env.DB,input),newId=crypto.randomUUID();
    await env.DB.prepare("INSERT INTO services (id,client_id,service_type,status,scheduled_start,scheduled_end,completed_at,price_cents,notes,created_by,updated_by) VALUES(?,?,?,?,?,?,?,?,?,?,?)").bind(newId,...f,actor,actor).run();
    return json(map((await env.DB.prepare("SELECT * FROM services WHERE id=?").bind(newId).first<Row>())!),201);
  }
  const version=Number(input.version); if(!Number.isSafeInteger(version)||version<1)throw new HttpError(422,"version is required.");
  if(id&&request.method==="PATCH"){
    const f=await fields(env.DB,input);
    const result=await env.DB.prepare("UPDATE services SET client_id=?,service_type=?,status=?,scheduled_start=?,scheduled_end=?,completed_at=?,price_cents=?,notes=?,updated_at=datetime('now'),updated_by=?,version=version+1 WHERE id=? AND deleted_at IS NULL AND version=?").bind(...f,actor,id,version).run();
    await changed(env.DB,result.meta.changes,id); return json(map((await env.DB.prepare("SELECT * FROM services WHERE id=?").bind(id).first<Row>())!));
  }
  if(id&&request.method==="DELETE"){
    const result=await env.DB.prepare("UPDATE services SET deleted_at=datetime('now'),updated_at=datetime('now'),updated_by=?,version=version+1 WHERE id=? AND deleted_at IS NULL AND version=?").bind(actor,id,version).run();
    await changed(env.DB,result.meta.changes,id); return new Response(null,{status:204});
  }
  throw new HttpError(405,"Method is not allowed.");
}
async function fields(db:D1Database,v:Record<string,unknown>){
  const clientId=text(v.clientId,"clientId",36,true)!,serviceType=text(v.serviceType,"serviceType",150,true)!,status=text(v.status,"status",30,true)!;
  if(!statuses.has(status))throw new HttpError(422,"status is invalid.");
  if(!await db.prepare("SELECT 1 FROM clients WHERE id=? AND deleted_at IS NULL").bind(clientId).first())throw new HttpError(422,"clientId does not identify an active client.");
  const start=date(v.scheduledStart,"scheduledStart"),end=date(v.scheduledEnd,"scheduledEnd"),completed=date(v.completedAt,"completedAt");
  if(start&&end&&end<=start)throw new HttpError(422,"scheduledEnd must be after scheduledStart.");
  if(status==="completed"&&!completed)throw new HttpError(422,"completedAt is required when completed.");
  const price=v.priceCents===null||v.priceCents===undefined?null:Number(v.priceCents);
  if(price!==null&&(!Number.isSafeInteger(price)||price<0))throw new HttpError(422,"priceCents is invalid.");
  return [clientId,serviceType,status,start,end,completed,price,text(v.notes,"notes",5000)] as const;
}
function date(v:unknown,n:string){if(v===undefined||v===null||v==="")return null;const d=new Date(String(v));if(Number.isNaN(d.valueOf()))throw new HttpError(422,`${n} is invalid.`);return d.toISOString();}
async function changed(db:D1Database,count:number,id:string){if(count)return;const exists=await db.prepare("SELECT 1 FROM services WHERE id=? AND deleted_at IS NULL").bind(id).first();throw new HttpError(exists?409:404,exists?"Service was modified by another request. Reload and try again.":"Service was not found.");}
function map(r:Row){return{id:r.id,clientId:r.client_id,serviceType:r.service_type,status:r.status,scheduledStart:r.scheduled_start,scheduledEnd:r.scheduled_end,completedAt:r.completed_at,priceCents:r.price_cents,notes:r.notes,createdAt:r.created_at,updatedAt:r.updated_at,version:r.version};}
