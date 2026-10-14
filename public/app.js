"use strict";
const data = JSON.parse(document.getElementById("progress-data").textContent);
const labels = {unverified:"Not verified",running:"In progress (records)",complete:"All results verified (records)",partial:"Some results missing (records)",failed:"Job failed (records)",matched:"Matched",listed_deliveries_matched:"Listed deliveries only"};
const flags = {corrected_batch_id:"Sample-set ID corrected from checked evidence",malformed_group_code:"Check joined or malformed group codes",repeated_group_code:"Repeated group code",run_date_without_sample_set_date:"Run has a tracker date; sample set has none",overview_sample_set_missing_detail:"Listed in run overview; absent from sample-set details",detail_sample_set_missing_overview:"Listed in sample-set details; absent from run overview"};
const stateFields = new Set(["processing_state","metadata_match","quality_review","db_registration","scientific_release"]);
const countFields = new Set(["delivered_samples","delivered_controls","processed_samples","processed_controls","missing_samples","missing_controls"]);
function lookup(mapping,key){return Object.prototype.hasOwnProperty.call(mapping,key)?mapping[key]:String(key);}
const columns = {
 runs:[["run_id","Run"],["notified_date","Notification date in tracker"],["sample_sets","Sample sets"],["reported_claident_date","Claident date in tracker"],["processing_state","Processing status"],["quality_review","Quality review"],["db_registration","DB registration"],["scientific_release","Scientific data release"]],
 sample_sets:[["run_id","Run"],["sample_set","Sample set"],["group_codes","Group codes"],["reported_claident_date","Claident date in tracker"],["delivered_samples","Sample libraries (matched deliveries)"],["delivered_controls","Control libraries (matched deliveries)"],["processing_state","Whole sample-set status"],["flags","Notes"]],
 localities:[["run_id","Run"],["sample_set","Sample set"],["delivery_id","Delivery"],["marker","Marker"],["group_codes","Group codes"],["delivered_samples","Sample libraries"],["processed_samples","Sample results verified"],["missing_samples","Sample results missing"],["processing_state","Sample-result status"],["missing_name_codes","Names without group code"]],
 deliveries:[["run_id","Run"],["sample_set","Sample set"],["delivery_id","Delivery"],["marker","Marker"],["delivered_samples","Sample libraries"],["processed_samples","Sample results verified"],["missing_samples","Sample results missing"],["delivered_controls","Control libraries"],["processed_controls","Control results verified"],["missing_controls","Control results missing"],["processing_state","Delivery status"]]
};
const names = {runs:"Runs",sample_sets:"Sample sets",localities:"Sample breakdown (matched deliveries)",deliveries:"Deliveries and controls (matched deliveries)"};
const downloads = {runs:"runs.csv",sample_sets:"sample_sets.csv",localities:"localities.csv"};
let current = "runs";
function node(tag,text){const el=document.createElement(tag);el.textContent=text;return el;}
function display(key,value){if(value===null || value===undefined || value==="")return key.includes("date")?"No date recorded":(stateFields.has(key)?"Not verified":(countFields.has(key)?"Count unknown":"—"));if(Array.isArray(value))return value.length?value.map(x=>key==="flags"?lookup(flags,x):x).join(" / "):"—";return stateFields.has(key)?lookup(labels,value):String(value);}
function time(value){return new Date(value).toLocaleString("en-GB",{timeZone:"Asia/Tokyo",year:"numeric",month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false})+" JST";}
document.getElementById("timestamps").textContent="Evidence cutoff: "+time(data.data_cutoff)+" · Page generated: "+time(data.generated_at)+" · Version: "+data.data_version;
document.getElementById("timestamps").textContent+=" · Tracker modified: "+(data.sheet_modified_at?time(data.sheet_modified_at):"Not recorded")+" · Tracker acquired: "+(data.sheet_acquired_at?time(data.sheet_acquired_at):"Not recorded");
const age=Math.max(0,Math.floor((Date.now()-Date.parse(data.data_cutoff))/86400000));
document.getElementById("freshness").textContent="Automatic updates are being prepared. The evidence cutoff is "+age+" days old.";
for(const run of data.runs){const o=node("option",run.run_id);o.value=run.run_id;document.getElementById("run").append(o);}
const codes=[...new Set([...data.sample_sets,...data.localities].flatMap(x=>x.group_codes))].sort();
for(const code of codes){const o=node("option",code);o.value=code;document.getElementById("group").append(o);}
document.getElementById("issue-count").textContent="("+data.issues.length+")";
for(const issue of data.issues)document.getElementById("issues").append(node("li",issue.run_id+" / "+issue.sample_set+": "+lookup(flags,issue.kind)));
function render(){
 const run=document.getElementById("run").value,group=document.getElementById("group").value,query=document.getElementById("search").value.trim().toLowerCase();
 const rows=data[current].filter(r=>{
  const groups=r.group_codes||data.localities.filter(x=>x.run_id===r.run_id&&x.delivery_id===r.delivery_id&&x.marker===r.marker).flatMap(x=>x.group_codes);
  const searchable=columns[current].map(([key])=>display(key,r[key])).join(" ")+" "+Object.values(r).join(" ");
  return (!run||r.run_id===run)&&(!group||groups.includes(group))&&(!query||searchable.toLowerCase().includes(query));
 });
 const head=document.getElementById("table-head"),body=document.getElementById("table-body");head.replaceChildren();body.replaceChildren();const tr=document.createElement("tr");
 for(const [,label] of columns[current]){const th=node("th",label);th.scope="col";tr.append(th);}head.append(tr);
 for(const row of rows){const tr=document.createElement("tr");for(const [key] of columns[current]){const td=node("td",display(key,row[key]));if(key==="processing_state")td.classList.add("state",row[key]);tr.append(td);}body.append(tr);}
 document.getElementById("view-title").textContent=names[current];document.getElementById("row-count").textContent=rows.length+" of "+data[current].length+" rows";
 document.getElementById("download").href=downloads[current]||"progress.json";
 document.getElementById("download").textContent=current==="deliveries"?"Download JSON including controls":"Download CSV";
 document.getElementById("empty").hidden=rows.length!==0;
 document.querySelectorAll("[data-view]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.view===current)));
}
document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>{current=b.dataset.view;render();}));
for(const id of ["run","group","search"])document.getElementById(id).addEventListener("input",render);
render();
