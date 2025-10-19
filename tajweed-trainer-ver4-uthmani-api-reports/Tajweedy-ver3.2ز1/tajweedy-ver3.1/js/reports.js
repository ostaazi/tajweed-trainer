
(function(){
  const $ = (s,root=document)=>root.querySelector(s);

  function readResult(){
    try{
      const raw = localStorage.getItem('tajweedy:lastResult');
      return raw ? JSON.parse(raw) : null;
    }catch{ return null; }
  }

  function formatDate(iso, lang='ar'){
    try{
      const d = iso ? new Date(iso) : new Date();
      return d.toLocaleString(lang==='ar'?'ar':'en', {year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit'});
    }catch{ return iso || ''; }
  }

  function pct(n,t){ return t? (Math.round(n*100/t)+'%') : '0%'; }

  function buildReportURL(reportId){
    const base = location.origin + location.pathname.replace(/[^/]+$/,'') + 'reports.html';
    return reportId ? `${base}?rid=${encodeURIComponent(reportId)}` : base;
  }

  function fillReportHeader(lang, data){
    const box = (lang==='ar') ? $('#reportHeaderAr') : $('#reportHeaderEn');
    const id = data.reportId || ('TJ-' + new Date().getFullYear() + '-' + (Math.floor(Math.random()*9000)+1000));
    const dt = formatDate(data.dateISO, lang);
    if(lang==='ar'){
      box.innerHTML = `<h2>📄 تقرير المتدرّب</h2>
        <h3>${data.name || '—'}</h3>
        <div class="meta">
          <div>تاريخ التقرير: ${dt}</div>
          <div>نوع التقرير: ${data.typeAr || 'نتائج الاختبار العام في التجويد'}</div>
          <div>رقم التقرير: ${id}</div>
        </div>`;
    }else{
      box.innerHTML = `<h2>📄 Trainee Report</h2>
        <h3>${data.name || '—'}</h3>
        <div class="meta">
          <div>Date: ${dt}</div>
          <div>Report Type: ${data.typeEn || 'General Tajweed Assessment'}</div>
          <div>Report ID: ${id}</div>
        </div>`;
    }
    box.dataset.reportId = id;
  }

  function renderQR(canvasId, reportId){
    const url = buildReportURL(reportId);
    const canvas = document.getElementById(canvasId);
    if(!canvas || !window.QRCode) return;
    QRCode.toCanvas(canvas, url, { width:160, margin:1, color:{dark:'#0f172a', light:'#0000'}}, (err)=>{ if(err) console.error(err) });
  }

  function pill(text){
    const span=document.createElement('span');
    span.className='pill btn'; span.style.borderRadius='999px'; span.style.padding='6px 10px';
    span.innerHTML=text; return span;
  }

  function colorTargets(t){ return (t||'').replace(/\[\[([\s\S]*?)\]\]/g, '<span class="ayah-target">$1</span>'); }

  function fillArabic(r){
    const kpi = $('#kpiAr'); kpi.innerHTML='';
    const total = r?.items?.length||0;
    const correct = r?.items ? r.items.filter(x=>x.isCorrect).length : 0;
    kpi.appendChild(pill(`<b>النتيجة:</b> ${correct}/${total} (${pct(correct,total)})`));
    const tbody = $('#tableAr tbody'); tbody.innerHTML='';
    (r?.items||[]).forEach((it,i)=>{
      const html = colorTargets(it.ayah || it.textHtml || it.text || '');
      const your = it.choice ?? '—';
      const corr = it.correct ?? '—';
      const ok = !!it.isCorrect;
      const tr=document.createElement('tr');
      tr.innerHTML = `<td>${i+1}</td><td class="ayah">${html}</td><td>${your}</td><td>${corr}</td><td>${ok?'✔️ صواب':'❌ خطأ'}</td>`;
      tbody.appendChild(tr);
    });
  }

  function fillEnglish(r){
    const kpi = $('#kpiEn'); kpi.innerHTML='';
    const total = r?.items?.length||0;
    const correct = r?.items ? r.items.filter(x=>x.isCorrect).length : 0;
    kpi.appendChild(pill(`<b>Score:</b> ${correct}/${total} (${pct(correct,total)})`));
    const tbody = $('#tableEn tbody'); tbody.innerHTML='';
    (r?.items||[]).forEach((it,i)=>{
      const html = colorTargets(it.textHtml || it.ayah || it.text || '');
      const your = it.choice ?? '—';
      const corr = it.correct ?? '—';
      const ok = !!it.isCorrect;
      const tr=document.createElement('tr');
      tr.innerHTML = `<td>${i+1}</td><td>${html}</td><td>${your}</td><td>${corr}</td><td>${ok?'✔️ Correct':'❌ Wrong'}</td>`;
      tbody.appendChild(tr);
    });
  }

  function init(){
    const r = readResult() || {name:'—', dateISO:new Date().toISOString(), items:[]};
    const meta = {
      name: r.trainee || r.name || '—',
      dateISO: r.dateISO || r.date || new Date().toISOString(),
      reportId: r.reportId || null,
      typeAr: r.typeAr || 'نتائج الاختبار العام في التجويد',
      typeEn: r.typeEn || 'General Tajweed Assessment'
    };
    fillReportHeader('ar', meta);
    fillReportHeader('en', meta);
    renderQR('qrAr', document.getElementById('reportHeaderAr').dataset.reportId);
    renderQR('qrEn', document.getElementById('reportHeaderEn').dataset.reportId);

    fillArabic(r);
    fillEnglish(r);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
