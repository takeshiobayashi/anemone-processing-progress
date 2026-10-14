"use strict";
const data = JSON.parse(document.getElementById("progress-data").textContent);
const labels = {unverified:"NV",running:"RUN",complete:"OK",partial:"PART",failed:"FAIL",matched:"MATCH",listed_deliveries_matched:"SEL"};
const stateMeanings = {unverified:"Not verified",running:"Running, supported by execution records",complete:"All expected results verified in records; not species-identification accuracy",partial:"Some expected results missing in records",failed:"Job failed in records",matched:"Metadata matched",listed_deliveries_matched:"Only listed deliveries matched"};
const flags = {corrected_batch_id:"Sample-set ID corrected from checked evidence",malformed_group_code:"Check joined or malformed group codes",repeated_group_code:"Repeated group code",run_date_without_sample_set_date:"Run has a tracker date; sample set has none",overview_sample_set_missing_detail:"Listed in run overview; absent from sample-set details",detail_sample_set_missing_overview:"Listed in sample-set details; absent from run overview"};
const stateFields = new Set(["processing_state","metadata_match","quality_review","db_registration","scientific_release"]);
const countFields = new Set(["delivered_samples","delivered_controls","processed_samples","processed_controls","missing_samples","missing_controls"]);
function lookup(mapping,key){return Object.prototype.hasOwnProperty.call(mapping,key)?mapping[key]:String(key);}
const columns = {
 runs:[["run_id","Run"],["sample_sets","Sets"],["processing_state","State"],["quality_review","QC"],["db_registration","DB"],["scientific_release","Release"]],
 sample_sets:[["run_id","Run"],["sample_set","Set"],["group_codes","Groups"],["delivered_samples","Samp."],["delivered_controls","Ctrl."],["processing_state","State"],["flags","Notes"]],
 localities:[["run_id","Run"],["sample_set","Set"],["delivery_id","Delivery"],["marker","Marker"],["group_codes","Groups"],["delivered_samples","Samp."],["processed_samples","Done"],["missing_samples","Miss."],["processing_state","State"],["missing_name_codes","No code"]],
 deliveries:[["run_id","Run"],["sample_set","Set"],["delivery_id","Delivery"],["marker","Marker"],["delivered_samples","Samp."],["processed_samples","Done"],["missing_samples","Miss."],["delivered_controls","Ctrl."],["processed_controls","C.done"],["missing_controls","C.miss"],["processing_state","State"]]
};
const columnMeanings = {run_id:"Sequencing-run ID",sample_sets:"Associated sample sets",sample_set:"Sample-set ID",group_codes:"Three-letter groups; not necessarily individual sites",delivery_id:"Selected delivery batch",marker:"Assay marker",delivered_samples:"Sample libraries in matched deliveries, per marker",delivered_controls:"Control libraries in matched deliveries, per marker",processed_samples:"Sample-library results verified by execution records",missing_samples:"Expected sample-library results missing after finalized processing",processed_controls:"Control-library results verified by execution records",missing_controls:"Expected control-library results missing after finalized processing",processing_state:"Status for the scope of this view",quality_review:"Quality review",db_registration:"ANEMONE DB registration",scientific_release:"Scientific dataset release",flags:"Source consistency notes",missing_name_codes:"Sample-library names without a recognized group code"};
const names = {runs:"Runs",sample_sets:"Sample sets",localities:"Sample breakdown (matched deliveries)",deliveries:"Deliveries and controls (matched deliveries)"};
const downloads = {runs:"runs.csv",sample_sets:"sample_sets.csv",localities:"localities.csv"};
let current = "runs";
function node(tag,text){const el=document.createElement(tag);el.textContent=text;return el;}
function display(key,value){if(value===null || value===undefined || value==="")return stateFields.has(key)?"NV":(countFields.has(key)?"?":"—");if(Array.isArray(value))return value.length?value.map(x=>key==="flags"?lookup(flags,x):x).join(" / "):"—";return stateFields.has(key)?lookup(labels,value):String(value);}
function time(value){return new Date(value).toLocaleString("en-GB",{timeZone:"Asia/Tokyo",year:"numeric",month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false})+" JST";}
document.getElementById("timestamps").textContent="Data: "+time(data.data_cutoff)+" · Page: "+time(data.generated_at);
const age=Math.max(0,Math.floor((Date.now()-Date.parse(data.data_cutoff))/86400000));
document.getElementById("freshness").textContent="Auto: pending · Data age: "+age+" d";
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
 for(const [key,label] of columns[current]){const th=node("th",label);th.scope="col";th.title=columnMeanings[key]||label;tr.append(th);}head.append(tr);
 for(const row of rows){const tr=document.createElement("tr");for(const [key] of columns[current]){const value=row[key],td=node("td",display(key,value));if(stateFields.has(key)){td.classList.add("state",value||"unverified");td.title=stateMeanings[value]||"Not verified";}if(countFields.has(key)||key==="missing_name_codes"){td.classList.add("numeric");if(value===null||value===undefined)td.title="Count unknown; not zero";}if(value===null||value===undefined||value===""||value==="unverified")td.classList.add("unknown");if(key==="flags")td.classList.add("notes");if(key==="group_codes"||key==="sample_sets")td.classList.add("codes");tr.append(td);}body.append(tr);}
 document.getElementById("view-title").textContent=names[current];document.getElementById("row-count").textContent=rows.length+" of "+data[current].length+" rows";
 document.getElementById("download").href=downloads[current]||"progress.json";
 document.getElementById("download").textContent=current==="deliveries"?"Download JSON including controls":"Download CSV";
 document.getElementById("empty").hidden=rows.length!==0;
 document.querySelectorAll("[data-view]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.view===current)));
}
document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>{current=b.dataset.view;render();}));
for(const id of ["run","group","search"])document.getElementById(id).addEventListener("input",render);
render();
