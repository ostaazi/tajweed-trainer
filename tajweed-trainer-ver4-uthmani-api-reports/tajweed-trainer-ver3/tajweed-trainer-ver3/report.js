import { loadAttempts, exportAttemptsCSV } from './storage.js';
import { initMode } from './util.js'; initMode('modeBtn');

function fmt(a){
  return `<div class="card" style="margin:10px 0">
    <div><strong>${a.name||'—'}</strong> • <span>${a.mode==='quiz'?'اختبار':'تدريب'}</span> • <span>${a.section||''}</span> • <span>${a.when||''}</span></div>
    <div style="margin-top:6px">النتيجة: <strong>${a.right}/${a.total} (${a.score}%)</strong></div>
    ${a.rows? `<details style="margin-top:8px"><summary>تفاصيل الأسئلة</summary>${tableRows(a.rows)}</details>` : ''}
  </div>`;
}
function tableRows(rows){
  const h = `<table class="table"><thead><tr><th>#</th><th>السؤال</th><th>إجابتك</th><th>الصحيح</th><th>الحكم</th><th>شرح</th><th>✓/✗</th></tr></thead><tbody>`;
  const b = rows.map((r,i)=>`<tr><td>${i+1}</td><td>${r.stem||''}</td><td>${r.picked||'—'}</td><td>${r.correct||''}</td><td>${r.rule||''}</td><td>${r.why||''}</td><td style="text-align:center">${r.ok?'✓':'✗'}</td></tr>`).join("");
  return h+b+"</tbody></table>";
}

function render(){
  const attempts = loadAttempts();
  const mode = document.getElementById('mode').value;
  const sec  = document.getElementById('section').value;
  const filtered = attempts.filter(a=> (!mode || a.mode===mode) && (!sec || a.section===sec));
  const last = filtered[0] || null;
  document.getElementById('last').innerHTML = last ? fmt(last) : '<div class="muted">لا توجد محاولات مطابقة.</div>';
  document.getElementById('list').innerHTML = filtered.slice(0,200).map(fmt).join("") || '<div class="muted">—</div>';
}

document.getElementById('refresh').onclick = render;
document.getElementById('exportCSV').onclick = ()=>{
  const attempts = loadAttempts();
  const mode = document.getElementById('mode').value;
  const sec  = document.getElementById('section').value;
  const filtered = attempts.filter(a=> (!mode || a.mode===mode) && (!sec || a.section===sec));
  const csv = exportAttemptsCSV(filtered);
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='tajweedy_attempts.csv'; a.click(); URL.revokeObjectURL(url);
};
document.getElementById('printBtn').onclick = ()=> window.print();

// initial
render();
