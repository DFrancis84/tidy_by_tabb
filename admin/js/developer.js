export class DeveloperPanel{
 constructor(){this.entries=[];this.panel=document.getElementById("developerPanel");this.log=document.getElementById("developerLog")}
 bind(onRefresh){developerToggle.onclick=()=>this.open(!this.panel.classList.contains("is-open"));developerClose.onclick=()=>this.open(false);developerClear.onclick=()=>{this.entries=[];this.render()};developerRefresh.onclick=onRefresh}
 open(v){this.panel.classList.toggle("is-open",v);this.panel.setAttribute("aria-hidden",String(!v))}
 add(entry){this.entries.unshift({time:new Date().toISOString(),...entry});this.entries=this.entries.slice(0,30);developerApiStatus.textContent=entry.success?"Online":"Error";developerLastRequest.textContent=entry.action||"Unknown";developerDuration.textContent=Number.isFinite(entry.duration)?`${entry.duration} ms`:"–";this.render()}
 count(v){developerRecordCount.textContent=v}
 render(){this.log.textContent=this.entries.length?JSON.stringify(this.entries,null,2):"No requests logged."}
}
