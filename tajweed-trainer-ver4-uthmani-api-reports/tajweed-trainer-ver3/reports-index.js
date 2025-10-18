
(function(){
  const $ = (s,root=document)=>root.querySelector(s);
  const $$ = (s,root=document)=>[...root.querySelectorAll(s)];
  const KEY_IDX = 'tajweedy:reports:index';
  function getIndex(){ try{ return JSON.parse(localStorage.getItem(KEY_IDX)||'[]'); }catch{ return []; } }
  function setIndex(arr){ try{ localStorage.setItem(KEY_IDX, JSON.stringify(arr)); }catch{} }
  function fmtDate(iso){ try{ return new Date(iso).toLocaleString('ar',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});}catch{return iso||'—';} }
  function buildURL(rid){ const base = location.origin + location.pathname.replace(/[^/]+$/,'') + 'reports.html'; return `${base}?rid=${encodeURIComponent(rid)}`; }
  function render(){
    const q = $('#q').value.trim().toLowerCase();
    const sort = $('#sort').value;
    let idx = getIndex();
    if(q){ idx = idx.filter(x=>(`${x.reportId||''} ${x.trainee||''} ${x.dateISO||''}`).toLowerCase().includes(q)); }
    idx.sort((a,b)=>{
      if(sort==='date_desc') return (b.dateISO||'').localeCompare(a.dateISO||'');
      if(sort==='date_asc')  return (a.dateISO||'').localeCompare(b.dateISO||'');
      if(sort==='name_asc')  return (a.trainee||'').localeCompare(b.trainee||'','ar');
      if(sort==='name_desc') return (b.trainee||'').localeCompare(a.trainee||'','ar');
      if(sort==='count_desc') return (b.total||0)-(a.total||0);
      if(sort==='count_asc')  return (a.total||0)-(b.total||0);
      return 0;
    });
    const tbody = $('#tbl tbody'); tbody.innerHTML=''; $('#empty').hidden = idx.length>0;
    idx.forEach(row=>{
      const tr=document.createElement('tr'), rid=row.reportId, url=buildURL(rid);
      tr.innerHTML = `<td><code>${rid}</code></td><td>${row.trainee||'—'}</td><td>${fmtDate(row.dateISO)}</td><td>${row.total||0}</td>
      <td><a class="btn" href="${url}">فتح</a> <button class="btn" data-copy="${url}">نسخ الرابط</button> <button class="btn warn" data-del="${rid}">حذف</button></td>`;
      tbody.appendChild(tr);
    });
    $$('button[data-copy]').forEach(b=>b.onclick=async()=>{ const link=b.getAttribute('data-copy'); try{await navigator.clipboard.writeText(link); alert('تم نسخ الرابط');}catch{prompt('انسخ الرابط:',link);} });
    $$('button[data-del]').forEach(b=>b.onclick=()=>{ const rid=b.getAttribute('data-del'); if(!confirm(`حذف التقرير ${rid}؟`))return;
      try{localStorage.removeItem(`tajweedy:report:${rid}`);}catch{}; const idx=getIndex().filter(x=>x.reportId!==rid); setIndex(idx); render();
    });
  }
  function exportCSV(){
    const rows=[['reportId','name','date','total','shareURL']];
    getIndex().forEach(x=>rows.push([x.reportId,x.trainee||'',x.dateISO||'',x.total||0, buildURL(x.reportId)]));
    const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='tajweedy-reports.csv'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1500);
  }
  function bind(){
    const TH='tajweedy:theme'; if(localStorage.getItem(TH)==='dark') document.documentElement.classList.add('dark');
    document.getElementById('toggleTheme')?.addEventListener('click', ()=>{ document.documentElement.classList.toggle('dark'); localStorage.setItem(TH, document.documentElement.classList.contains('dark')?'dark':'light'); });
    document.getElementById('q').oninput=render; document.getElementById('sort').onchange=render;
    document.getElementById('exportCSV').onclick=exportCSV;
    document.getElementById('clearAll').onclick=()=>{
      if(!confirm('سيتم حذف جميع التقارير المخزنة محليًا. هل أنت متأكد؟')) return;
      const idx=getIndex(); idx.forEach(x=>{ try{localStorage.removeItem(`tajweedy:report:${x.reportId}`);}catch{} }); setIndex([]); render();
    };
  }
  document.addEventListener('DOMContentLoaded', ()=>{ bind(); render(); });
})();
