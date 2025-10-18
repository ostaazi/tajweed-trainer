import { loadAttempts, exportAttemptsCSV } from './storage.js';
import { initMode } from './util.js'; initMode('modeBtn');

function agg(){
  const mode = document.getElementById('mode').value;
  const atts = loadAttempts().filter(a=> !mode || a.mode===mode);
  const totalAttempts = atts.length;
  const avg = atts.length? Math.round(atts.reduce((s,a)=>s+a.score,0)/atts.length): 0;

  // by section
  const bySec = {};
  atts.forEach(a=>{
    const key = a.section || 'غير محدد';
    bySec[key] = bySec[key] || {count:0,right:0,total:0};
    bySec[key].count++;
    bySec[key].right += a.right||0;
    bySec[key].total += a.total||0;
  });
  // by subrule (from rows)
  const bySR = {};
  atts.forEach(a=>{
    (a.rows||[]).forEach(r=>{
      const key = r.rule||'—';
      if(!bySR[key]) bySR[key] = {count:0, right:0, total:0};
      bySR[key].count++;
      bySR[key].right += r.ok?1:0;
      bySR[key].total += 1;
    });
  });
  return {atts, totalAttempts, avg, bySec, bySR};
}

function render(){
  const {atts, totalAttempts, avg, bySec, bySR} = agg();
  document.getElementById('kpis').innerHTML = `
    <div>إجمالي المحاولات: <strong>${totalAttempts}</strong></div>
    <div>متوسط الدرجة: <strong>${avg}%</strong></div>
  `;
  // sections table
  const secRows = Object.entries(bySec).map(([k,v],i)=>{
    const pct = v.total? Math.round((v.right/v.total)*100):0;
    return `<tr><td>${i+1}</td><td>${k}</td><td>${v.count}</td><td>${v.right}/${v.total}</td><td>${pct}%</td></tr>`;
  }).join("");
  document.getElementById('bySection').innerHTML = `
    <table class="table">
      <thead><tr><th>#</th><th>القسم</th><th>عدد المحاولات</th><th>إجمالي صحيح/كلّي</th><th>نسبة النجاح</th></tr></thead>
      <tbody>${secRows||'<tr><td colspan="5">—</td></tr>'}</tbody>
    </table>
  `;
  // subrule table
  const srRows = Object.entries(bySR).map(([k,v],i)=>{
    const pct = v.total? Math.round((v.right/v.total)*100):0;
    return `<tr><td>${i+1}</td><td>${k}</td><td>${v.count}</td><td>${v.right}/${v.total}</td><td>${pct}%</td></tr>`;
  }).join("");
  document.getElementById('bySubrule').innerHTML = `
    <table class="table">
      <thead><tr><th>#</th><th>الحكم الفرعي</th><th>عدد الأسئلة</th><th>صحيح/كلّي</th><th>نسبة النجاح</th></tr></thead>
      <tbody>${srRows||'<tr><td colspan="5">—</td></tr>'}</tbody>
    </table>
  `;
}

document.getElementById('refresh').onclick = render;
document.getElementById('exportCSV').onclick = ()=>{
  const attempts = loadAttempts();
  const mode = document.getElementById('mode').value;
  const filtered = attempts.filter(a=> !mode || a.mode===mode);
  const csv = exportAttemptsCSV(filtered);
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='tajweedy_attempts.csv'; a.click(); URL.revokeObjectURL(url);
};
document.getElementById('printBtn').onclick = ()=> window.print();
render();
