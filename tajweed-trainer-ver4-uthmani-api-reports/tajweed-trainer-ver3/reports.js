
(function(){
  const $ = (s,root=document)=>root.querySelector(s);
  const KEY_LAST = 'tajweedy:lastResult';
  const KEY_IDX  = 'tajweedy:reports:index';

  function getRID(){
    const u = new URL(location.href);
    return u.searchParams.get('rid');
  }
  function readResult(){
    const rid = getRID();
    if(rid){
      try{ const raw = localStorage.getItem(`tajweedy:report:${rid}`); if(raw) return JSON.parse(raw); }catch{}
    }
    try{ const raw = localStorage.getItem(KEY_LAST); return raw? JSON.parse(raw): null; }catch{ return null; }
  }
  function formatDate(iso, lang='ar'){
    try{ const d = new Date(iso||Date.now()); return d.toLocaleString(lang==='ar'?'ar':'en',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}); }catch{ return iso||''; }
  }
  function pct(n,t){ return t? (Math.round(n*100/t)+'%'):'0%'; }
  function pill(text){ const s=document.createElement('span'); s.className='pill'; s.innerHTML=text; return s; }
  function buildURL(rid){ const base = location.origin + location.pathname.replace(/[^/]+$/,'') + 'reports.html'; return rid? `${base}?rid=${encodeURIComponent(rid)}` : base; }

  function fillHeader(lang, meta){
    const box = $(lang==='ar' ? '#reportHeaderAr' : '#reportHeaderEn');
    const id = meta.reportId || ('TJ-' + new Date().getFullYear() + '-' + (Math.random().toString(16).slice(2,6)).toUpperCase());
    const dt = formatDate(meta.dateISO, lang);
    if(lang==='ar'){
      box.innerHTML = `<h2>📄 تقرير المتدرّب</h2><h3>${meta.name||'—'}</h3>
        <div class="meta"><div>تاريخ التقرير: ${dt}</div><div>نوع التقرير: ${meta.typeAr||'نتائج الاختبار العام في التجويد'}</div><div>رقم التقرير: ${id}</div></div>`;
    }else{
      box.innerHTML = `<h2>📄 Trainee Report</h2><h3>${meta.name||'—'}</h3>
        <div class="meta"><div>Date: ${dt}</div><div>Report Type: ${meta.typeEn||'General Tajweed Assessment'}</div><div>Report ID: ${id}</div></div>`;
    }
    box.dataset.reportId = id;
  }
  function renderQR(canvasId, rid){
    const url = buildURL(rid);
    const canvas = document.getElementById(canvasId);
    if(!canvas || !window.QRCode) return;
    QRCode.toCanvas(canvas, url, { width:160, margin:1, color:{dark:'#0f172a', light:'#0000'} }, ()=>{});
  }
  function colorTargets(t){ return (t||'').replace(/\[\[([\s\S]*?)\]\]/g,'<span class="ayah-target">$1</span>'); }

  function fillArabic(r){
    const kpi = document.getElementById('kpiAr'); kpi.innerHTML='';
    const items = r?.items || r?.questions || [];
    const total = r?.total || items.length;
    const correct = r?.correct ?? items.filter(x=>x.isCorrect===true || x.ok===true).length;
    kpi.appendChild(pill(`<b>النتيجة:</b> ${correct}/${total} (${pct(correct,total)})`));

    const tbody = document.querySelector('#tableAr tbody'); tbody.innerHTML='';
    items.forEach((it,i)=>{
      const html = colorTargets(it.textHtml || it.ayah || it.text || '');
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${i+1}</td><td class="ayah">${html}</td><td>${it.choice??it.your??'—'}</td><td>${it.correct??'—'}</td><td>${(it.isCorrect||it.ok)?'✔️ صواب':'❌ خطأ'}</td>`;
      tbody.appendChild(tr);
    });
  }
  function fillEnglish(r){
    const kpi = document.getElementById('kpiEn'); kpi.innerHTML='';
    const items = r?.items || r?.questions || [];
    const total = r?.total || items.length;
    const correct = r?.correct ?? items.filter(x=>x.isCorrect===true || x.ok===true).length;
    kpi.appendChild(pill(`<b>Score:</b> ${correct}/${total} (${pct(correct,total)})`));

    const tbody = document.querySelector('#tableEn tbody'); tbody.innerHTML='';
    items.forEach((it,i)=>{
      const html = colorTargets(it.textHtml || it.ayah || it.text || '');
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${i+1}</td><td>${html}</td><td>${it.choice??it.your??'—'}</td><td>${it.correct??'—'}</td><td>${(it.isCorrect||it.ok)?'✔️ Correct':'❌ Wrong'}</td>`;
      tbody.appendChild(tr);
    });
  }
  function init(){
    const r = readResult() || {};
    const meta = {
      name: r.trainee || r.name || '—',
      dateISO: r.dateISO || new Date().toISOString(),
      reportId: r.reportId || null,
      typeAr: r.typeAr || 'نتائج الاختبار العام في التجويد',
      typeEn: r.typeEn || 'General Tajweed Assessment'
    };
    fillHeader('ar', meta); fillHeader('en', meta);
    renderQR('qrAr', document.getElementById('reportHeaderAr').dataset.reportId);
    renderQR('qrEn', document.getElementById('reportHeaderEn').dataset.reportId);

    fillArabic(r); fillEnglish(r);

    document.getElementById('toggleEn').onclick = ()=>{
      const en = document.getElementById('pageEn');
      en.hidden = !en.hidden;
      document.getElementById('toggleEn').textContent = en.hidden ? 'إظهار الصفحة الإنجليزية' : 'إخفاء الصفحة الإنجليزية';
    };
    const TH='tajweedy:theme'; if(localStorage.getItem(TH)==='dark') document.documentElement.classList.add('dark');
    document.getElementById('toggleTheme').onclick = ()=>{
      document.documentElement.classList.toggle('dark');
      localStorage.setItem(TH, document.documentElement.classList.contains('dark')?'dark':'light');
    };
    document.getElementById('printPDF').onclick = ()=>window.print();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
