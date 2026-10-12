"use strict";
const data = JSON.parse(document.getElementById("progress-data").textContent);
const labels = {unverified:"未確認",running:"処理中（記録確認）",complete:"対象の処理結果確認済み（記録確認）",partial:"一部欠損（記録確認）",failed:"処理失敗（記録確認）",matched:"一致",listed_deliveries_matched:"照合済み納品分のみ"};
const flags = {corrected_batch_id:"試料群IDを根拠に基づき修正",malformed_group_code:"コードの連結・形式を要確認",repeated_group_code:"コードの重複",run_date_without_sample_set_date:"runの日付あり・試料群の日付未報告",overview_sample_set_missing_detail:"run一覧にあり・試料群詳細なし",detail_sample_set_missing_overview:"試料群詳細にあり・run一覧の試料群欄なし"};
const stateFields = new Set(["processing_state","metadata_match","quality_review","db_registration","scientific_release"]);
const countFields = new Set(["delivered_samples","delivered_controls","processed_samples","processed_controls","missing_samples","missing_controls"]);
function lookup(mapping,key){return Object.prototype.hasOwnProperty.call(mapping,key)?mapping[key]:String(key);}
const columns = {
 runs:[["run_id","run"],["notified_date","通知日"],["sample_sets","試料群"],["reported_claident_date","Claident記録日"],["processing_state","処理結果"],["quality_review","品質評価"],["db_registration","DB登録"],["scientific_release","科学データ公開"]],
 sample_sets:[["run_id","run"],["sample_set","試料群"],["group_codes","グループ"],["reported_claident_date","試料群Claident記録日"],["delivered_samples","照合済み試料ライブラリ数"],["delivered_controls","照合済み対照ライブラリ数"],["processing_state","試料群全体の結果"],["flags","要確認"]],
 localities:[["run_id","run"],["sample_set","試料群"],["delivery_id","納品"],["marker","マーカー"],["group_codes","グループ"],["locality_label","地点ラベル"],["delivered_samples","試料ライブラリ数"],["processed_samples","結果確認済みライブラリ数"],["missing_samples","欠損ライブラリ数"],["processing_state","この地点・マーカーの試料結果"],["missing_name_codes","名称内コードなし"]],
 deliveries:[["run_id","run"],["sample_set","試料群"],["delivery_id","納品"],["marker","マーカー"],["delivered_samples","試料ライブラリ数"],["processed_samples","結果確認済み試料数"],["missing_samples","欠損試料数"],["delivered_controls","対照ライブラリ数"],["processed_controls","結果確認済み対照数"],["missing_controls","欠損対照数"],["processing_state","納品・マーカーのジョブと結果"]]
};
const names = {runs:"run別",sample_sets:"試料群別",localities:"地点別（照合済み納品分）",deliveries:"納品・対照別（照合済み納品分）"};
const downloads = {runs:"runs.csv",sample_sets:"sample_sets.csv",localities:"localities.csv"};
let current = "runs";
function node(tag,text){const el=document.createElement(tag);el.textContent=text;return el;}
function display(key,value){if(value===null || value===undefined || value==="")return key.includes("date")?"未報告":(stateFields.has(key)?"未確認":(countFields.has(key)?"未確定":"—"));if(Array.isArray(value))return value.length?value.map(x=>key==="flags"?lookup(flags,x):x).join(" / "):"—";return stateFields.has(key)?lookup(labels,value):String(value);}
function time(value){return new Date(value).toLocaleString("ja-JP",{timeZone:"Asia/Tokyo",hour12:false})+" JST";}
document.getElementById("timestamps").textContent="情報基準: "+time(data.data_cutoff)+" · 表の生成: "+time(data.generated_at)+" · 版: "+data.data_version;
document.getElementById("timestamps").textContent+=" · 進捗原表の更新: "+(data.sheet_modified_at?time(data.sheet_modified_at):"未確認")+" · 原表の取得: "+(data.sheet_acquired_at?time(data.sheet_acquired_at):"未確認");
const age=Math.max(0,Math.floor((Date.now()-Date.parse(data.data_cutoff))/86400000));
document.getElementById("freshness").textContent="自動更新は準備中です。提供記録の基準時刻から "+age+" 日経過しています。更新が未反映の場合があります。基準時刻と表の生成時刻を分けて表示しています。";
for(const run of data.runs){const o=node("option",run.run_id);o.value=run.run_id;document.getElementById("run").append(o);}
const codes=[...new Set([...data.sample_sets,...data.localities].flatMap(x=>x.group_codes))].sort();
for(const code of codes){const o=node("option",code);o.value=code;document.getElementById("group").append(o);}
document.getElementById("issue-count").textContent="("+data.issues.length+"件)";
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
 document.getElementById("view-title").textContent=names[current];document.getElementById("row-count").textContent=rows.length+"件 / 全"+data[current].length+"件";
 document.getElementById("download").href=downloads[current]||"progress.json";
 document.getElementById("download").textContent=current==="deliveries"?"納品・対照を含むJSONをダウンロード":"CSVをダウンロード";
 document.getElementById("empty").hidden=rows.length!==0;
 document.querySelectorAll("[data-view]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.view===current)));
}
document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>{current=b.dataset.view;render();}));
for(const id of ["run","group","search"])document.getElementById(id).addEventListener("input",render);
render();
