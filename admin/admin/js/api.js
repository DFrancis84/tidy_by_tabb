const API_URL="PASTE_YOUR_APPS_SCRIPT_EXEC_URL_HERE";
export class GalleryApi{
 constructor(onRequest=()=>{}){this.onRequest=onRequest}
 async list(){return this.request("list","GET",null,{published:"all"})}
 async diagnostics(){return this.request("diagnostics")}
 async create(record){return this.request("create","POST",{action:"create",record})}
 async update(id,record){return this.request("update","POST",{action:"update",id,record})}
 async delete(id){return this.request("delete","POST",{action:"delete",id})}
 async request(action,method="GET",body=null,query={}){
  if(API_URL.includes("PASTE_YOUR"))throw new Error("Set your Apps Script /exec URL in js/api.js.");
  const url=new URL(API_URL);url.searchParams.set("action",action);Object.entries(query).forEach(([k,v])=>url.searchParams.set(k,v));
  const started=performance.now();let response,payload;
  try{
   response=await fetch(url,{method,headers:method==="POST"?{"Content-Type":"text/plain;charset=utf-8"}:undefined,body:method==="POST"?JSON.stringify(body):undefined,redirect:"follow"});
   payload=await response.json();const duration=Math.round(performance.now()-started);
   this.onRequest({action,method,duration,status:response.status,success:!!payload?.success,response:payload});
   if(!response.ok||!payload?.success)throw new Error(payload?.message||`Request failed (${response.status}).`);
   return payload;
  }catch(error){this.onRequest({action,method,duration:Math.round(performance.now()-started),status:response?.status||0,success:false,error:error.message,response:payload});throw error}
 }
}
