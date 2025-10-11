/* Tajweedy Key Shim */
(function(){
  try{
    // migrate old keys to new ones once
    const oldFull = localStorage.getItem('tajweed_progress_full');
    if (oldFull && !localStorage.getItem('tajweedy_progress_full')){
      localStorage.setItem('tajweedy_progress_full', oldFull);
    }
    const oldLast = localStorage.getItem('tajweed_last_report');
    if (oldLast && !localStorage.getItem('tajweedy_last_report')){
      localStorage.setItem('tajweedy_last_report', oldLast);
    }
  }catch(_){}
})();
// Tajweedy app.js — fixes: reciters, ayah list, audio fallback, persistent reports, rich summary
(function(){
  'use strict';
  const $ = s=>document.querySelector(s);
  const byId = id=>document.getElementById(id);

  const reciterSelect=byId('reciterSelect');
  const surahSelect=byId('surahSelect');
  const ayahSelect=byId('ayahSelect');
  const ayahTextEl=byId('ayahText');
  const playCorrectBtn=byId('playCorrectBtn');
  const referenceAudio=byId('referenceAudio');

  const micBtn=byId('micBtn');
  const stopBtn=byId('stopBtn');
  const transcribeBtn=byId('transcribeBtn');
  const playback=byId('playback');
  const transcriptPre=byId('transcript');

  const quizSectionSel=byId('quizSection');
  const buildQuizBtn=byId('buildQuizBtn');
  const buildFullQuizBtn=byId('buildFullQuizBtn');
  const quizDiv=byId('quiz');

  const showSummaryBtn=byId('showSummaryBtn');
  const resetSummaryBtn=byId('resetSummaryBtn');
  const summaryDiv=byId('summary');
  const traineeNameEl=byId('traineeName');

  // Reciters supported by api.alquran.cloud
  const RECITERS=[
    {id:'ar.alafasy', name:'مشاري العفاسي'},
    {id:'ar.husary', name:'الحُصري'},
    {id:'ar.hudhaify', name:'الحذيفي'},
    {id:'ar.minshawi', name:'المِنشاوي'},
    {id:'ar.abdulbasit', name:'عبدالباسط (مجود)'},
    {id:'ar.abdulbasitmurattal', name:'عبدالباسط (مرتل)'},
    {id:'ar.sudais', name:'السديس'},
    {id:'ar.shaatree', name:'الشاطري'}
  ];

  function initReciters(){
    reciterSelect.innerHTML = RECITERS.map(r=>`<option value="${r.id}">${r.name}</option>`).join('');
  }

  // Load surah list
  async function loadSurahs(){
    const r = await fetch('https://api.alquran.cloud/v1/surah');
    const j = await r.json();
    const s = j.data || [];
    surahSelect.innerHTML = s.map(x=>`<option value="${x.number}">${x.number} — ${x.englishName} / ${x.name}</option>`).join('');
    await loadAyahs();
  }

  // Load ayahs for current surah using ar.uthmani text
  async function loadAyahs(){
    const sid = Number(surahSelect.value||1);
    ayahSelect.innerHTML=''; ayahTextEl.textContent='';
    const r = await fetch(`https://api.alquran.cloud/v1/surah/${sid}/ar.uthmani`);
    const j = await r.json();
    const verses = (j.data && j.data.ayahs) || [];
    ayahSelect.innerHTML = verses.map(v=>`<option value="${v.numberInSurah}">${sid}:${v.numberInSurah}</option>`).join('');
    updateAyahText(verses);
  }

  async function updateAyahText(prefetched){
    const sid = Number(surahSelect.value||1);
    const aid = Number(ayahSelect.value||1);
    let verses = prefetched;
    if (!verses){
      const r = await fetch(`https://api.alquran.cloud/v1/surah/${sid}/ar.uthmani`);
      const j = await r.json();
      verses = (j.data && j.data.ayahs) || [];
    }
    const v = verses.find(v=>Number(v.numberInSurah)===aid);
    ayahTextEl.textContent = v? (v.text||'') : '';
  }

  // Play correct recitation with fallback through reciter list
  async function playCorrect(){
    const sid = Number(surahSelect.value||1);
    const aid = Number(ayahSelect.value||1);
    const tryIds = [reciterSelect.value].concat(RECITERS.map(r=>r.id));
    for (let id of tryIds){
      try{
        const r = await fetch(`https://api.alquran.cloud/v1/ayah/${sid}:${aid}/${id}`);
        const j = await r.json();
        const url = j && j.data && j.data.audio;
        if (url){
          referenceAudio.src = url;
          await referenceAudio.play();
          return;
        }
      }catch(e){/* continue */}
    }
    alert('تعذّر جلب الصوت من الخادم. جرّب قارئًا آخر.');
  }

  // Recording & transcribing (front only; backend route must exist)
  let mediaRecorder=null, recordedChunks=[];
  async function startRecording(){
    recordedChunks=[];
    const stream = await navigator.mediaDevices.getUserMedia({audio:true});
    mediaRecorder = new MediaRecorder(stream, {mimeType:'audio/webm'});
    mediaRecorder.ondataavailable = e=>{ if(e.data.size>0) recordedChunks.push(e.data); };
    mediaRecorder.onstop = ()=>{
      const blob = new Blob(recordedChunks, {type:'audio/webm'});
      playback.src = URL.createObjectURL(blob);
      transcribeBtn.disabled = false;
    };
    mediaRecorder.start();
    micBtn.disabled=true; stopBtn.disabled=false;
  }
  function stopRecording(){
    if(mediaRecorder && mediaRecorder.state!=='inactive'){
      mediaRecorder.stop();
      stopBtn.disabled=true; micBtn.disabled=false;
    }
  }
  async function sendToTranscribe(){
    const blob = new Blob(recordedChunks, {type:'audio/webm'});
    const fd = new FormData();
    fd.append('file', blob, 'read.webm');
    const r = await fetch('/api/transcribe', {method:'POST', body:fd});
    const txt = await r.text().catch(()=>'');
    transcriptPre.textContent = txt || '—';
  }

  // Bank & quiz (bank must be loaded to window.TAJWEED_BANK)
  const BANK = (window.TAJWEED_BANK || {});
  const traineeName = ()=>{
    const v=(traineeNameEl && traineeNameEl.value || '').trim();
    if (v) localStorage.setItem('trainee_name', v);
    return v || localStorage.getItem('trainee_name') || '';
  };

  function pickRandom(arr,n){
    const a=arr.slice(), out=[];
    while(a.length && out.length<n){
      out.push(a.splice(Math.floor(Math.random()*a.length),1)[0]);
    }
    return out;
  }

  function buildQuiz(sectionKey){
    let questions=[];
    if (sectionKey==='noon_tanween' || sectionKey==='meem_sakinah' || sectionKey==='madd'){
      questions = pickRandom(BANK[sectionKey]||[], 5);
    } else if (sectionKey==='full'){
      questions = [
        ...pickRandom(BANK.noon_tanween||[], 5),
        ...pickRandom(BANK.meem_sakinah||[], 5),
        ...pickRandom(BANK.madd||[], 5),
      ];
    }
    renderQuiz(questions, sectionKey);
  }

  function renderQuiz(questions, sectionKey){
    quizDiv.innerHTML='';
    const form=document.createElement('form');
    questions.forEach((q,qi)=>{
      const wrap=document.createElement('div'); wrap.className='quiz-q card'; wrap.style.marginTop='10px';
      const qtext=document.createElement('div'); qtext.innerHTML=`<strong>س${qi+1}.</strong> ${q.text||''}`; wrap.appendChild(qtext);

      (q.options||[]).forEach((opt,oi)=>{
        const line=document.createElement('label'); line.className='quiz-choice'; line.style.display='block';
        line.style.padding='6px 8px'; line.style.border='1px solid var(--tj-border)'; line.style.borderRadius='8px'; line.style.marginTop='6px';
        const inp=document.createElement('input'); inp.type='radio'; inp.name=`q${qi}`; inp.value=oi; inp.style.marginLeft='6px';
        line.appendChild(inp);
        const span=document.createElement('span'); span.textContent=opt; line.appendChild(span);
        wrap.appendChild(line);
      });
      const fb=document.createElement('div'); fb.className='quiz-feedback'; wrap.appendChild(fb);
      form.appendChild(wrap);
    });

    const actions=document.createElement('div'); actions.className='row'; actions.style.marginTop='12px';
    const submit=document.createElement('button'); submit.type='button'; submit.textContent='تصحيح الإجابات';
    const openReport=document.createElement('button'); openReport.type='button'; openReport.textContent='فتح التقرير'; openReport.disabled=true;
    actions.appendChild(submit); actions.appendChild(openReport);
    form.appendChild(actions);
    quizDiv.appendChild(form);

    submit.onclick = ()=>{
      let correct=0,total=questions.length;
      const rows=[], weaknessCounter={};
      questions.forEach((q,idx)=>{
        const wrap=form.children[idx];
        const choiceEls=wrap.querySelectorAll('.quiz-choice');
        const ans=(typeof q.answer==='number')?q.answer:-1;
        const chosen=form.querySelector(`input[name="q${idx}"]:checked`);
        const chosenIdx=chosen?Number(chosen.value):-1;

        choiceEls.forEach((el,i)=>{
          el.classList.remove('is-correct','is-wrong');
          el.style.pointerEvents='none';
          if(i===ans) el.classList.add('is-correct');
          if(i===chosenIdx && i!==ans) el.classList.add('is-wrong');
        });

        const fb=wrap.querySelector('.quiz-feedback');
        if (chosenIdx===ans){ correct++; fb.textContent = (q.why?`✓ صحيح — ${q.why}`:'✓ صحيح'); }
        else {
          const corr=(q.options&&q.options[ans])?q.options[ans]:'—';
          fb.textContent = (q.why?`✗ الصحيح: ${corr} — ${q.why}`:`✗ الصحيح: ${corr}`);
          const key = corr.split('،')[0].trim();
          weaknessCounter[key]=(weaknessCounter[key]||0)+1;
        }

        rows.push({
          index: idx+1, text:q.text||'', options:q.options||[],
          correctIndex: ans, chosenIndex: chosenIdx, why: q.why||''
        });
      });

      const payload={
        traineeName: traineeName(),
        title: (sectionKey==='full'?'اختبار شامل (١٥ سؤالًا)':'اختبار'),
        sectionKey: sectionKey||'custom',
        total, correct, ts: Date.now(), rows,
        analysis: analyzeWeakness(weaknessCounter)
      };
      try{
        localStorage.setItem('tajweedy_last_report', JSON.stringify(payload));
        const arr = JSON.parse(localStorage.getItem('tajweedy_progress_full')||'[]'); arr.push(payload);
        localStorage.setItem('tajweedy_progress_full', JSON.stringify(arr));
      }catch(_){}

      alert(`النتيجة: ${correct} / ${total}`);
      openReport.disabled=false;
    };

    openReport.onclick = ()=> window.location.href='report.html';
  }

  function analyzeWeakness(counter){
    const entries = Object.entries(counter).sort((a,b)=>b[1]-a[1]);
    if (!entries.length) return {text:'أداء ممتاز؛ لا توجد أخطاء تذكر.', items:[]};
    const items = entries.map(([k,v])=>`${k}: ${v} خطأ/أخطاء`);
    const top = entries[0][0];
    const tips = {
      'إظهار حلقي':'راجع حروف الحلق (ء هـ ع ح غ خ) وحدّد مواضع الإظهار.',
      'إدغام بغنة':'تدرّب على حروف ينمو (ي ن م و) مع إبقاء الغنة حركتين.',
      'إدغام بغير غنة':'لاحظ إدغام اللام والراء دون غنة.',
      'إخفاء':'احفظ حروف الإخفاء الخمسة عشر وتدرّب على مخرج الغنة.',
      'غنة مشددة':'ثبّت مقدار الغنة في النون/الميم المشددة حركتين.',
      'إظهار شفوي':'تدرّب على الميم الساكنة قبل جميع الحروف عدا الميم والباء.',
      'إدغام شفوي':'أدغم الميم الساكنة في الميم المتحركة مع الغنة.',
      'إخفاء شفوي':'أخفِ الميم الساكنة قبل الباء مع الغنة.',
      'قلب':'اقلب النون/التنوين ميماً مخفاة قبل الباء مع الغنة.',
      'مد طبيعي':'ثبّت المد حركتين دون همز أو سكون.',
      'مد متصل':'مد 4–5 حركات عند الهمز بعد حرف المد في كلمة واحدة.',
      'مد منفصل':'مد غالباً 4 حركات عند الهمز في الكلمة التالية.',
      'مد لازم':'مد 6 حركات لوجود سكون أصلي بعد حرف المد.'
    };
    return { text:`تظهر أخطاء متكررة في: ${top}. ننصح بالخطة المقترحة أدناه.`, items, plan: tips[top]||'' };
  }

  function showSummary(){
    try{
      const arr = JSON.parse(localStorage.getItem('tajweedy_progress_full')||'[]');
      if(!arr.length){ summaryDiv.textContent='لا توجد سجلات بعد.'; return; }
      summaryDiv.innerHTML='';
      arr.slice().reverse().forEach((r)=>{
        const card=document.createElement('div'); card.className='card'; card.style.marginTop='10px';
        const dt=new Date(r.ts||Date.now()).toLocaleString('ar-EG');
        const nameMap={ noon_tanween:'النون الساكنة والتنوين', meem_sakinah:'الميم الساكنة', madd:'أحكام المدود', full:'اختبار شامل', custom:'مخصص'};
        const h=`👤 ${r.traineeName||'متدرّب'} — ${nameMap[r.sectionKey]||r.title} — ${r.correct}/${r.total} — ${dt}`;
        const p=document.createElement('div'); p.textContent=h; card.appendChild(p);

        if (r.analysis){
          const a=document.createElement('div');
          a.className='muted';
          a.textContent=`تحليل: ${r.analysis.text} ${ (r.analysis.items||[]).join('، ') } ${ r.analysis.plan?(' — خطة: '+r.analysis.plan):'' }`;
          card.appendChild(a);
        }

        const open=document.createElement('button'); open.textContent='فتح هذا التقرير'; open.onclick=()=>{
          localStorage.setItem('tajweedy_last_report', JSON.stringify(r));
          window.location.href='report.html';
        };
        card.appendChild(open);
        summaryDiv.appendChild(card);
      });
    }catch(e){ summaryDiv.textContent='—'; }
  }
  function resetSummary(){
    try{ localStorage.removeItem('tajweedy_progress_full'); }catch(_){}
    summaryDiv.textContent='تمت إعادة الضبط.';
  }

  reciterSelect.addEventListener('change', ()=>{});
  surahSelect.addEventListener('change', loadAyahs);
  ayahSelect.addEventListener('change', ()=>updateAyahText());
  playCorrectBtn.addEventListener('click', playCorrect);
  micBtn.addEventListener('click', startRecording);
  stopBtn.addEventListener('click', stopRecording);
  transcribeBtn.addEventListener('click', sendToTranscribe);
  buildQuizBtn.addEventListener('click', ()=>{ (traineeNameEl&&traineeNameEl.value)&&localStorage.setItem('trainee_name', traineeNameEl.value); buildQuiz(quizSectionSel.value==='full'?'noon_tanween':quizSectionSel.value); });
  buildFullQuizBtn.addEventListener('click', ()=>{ (traineeNameEl&&traineeNameEl.value)&&localStorage.setItem('trainee_name', traineeNameEl.value); buildQuiz('full'); });
  showSummaryBtn.addEventListener('click', showSummary);
  resetSummaryBtn.addEventListener('click', resetSummary);

  
  // ===== UI: Dark mode toggle (injected) =====
  (function addDarkToggle(){
    const btn=document.createElement('button');
    btn.id='darkToggle';
    btn.title='وضع داكن/فاتح';
    btn.textContent='🌓';
    Object.assign(btn.style,{position:'fixed',left:'14px',bottom:'14px',zIndex:9999,
      padding:'10px 12px',borderRadius:'12px',border:'1px solid var(--tj-border,#e5e7eb)',background:'#fff'});
    document.body.appendChild(btn);

    const apply=(m)=>{ document.documentElement.dataset.theme=m; localStorage.setItem('tj_theme',m); };
    const saved=localStorage.getItem('tj_theme')||'light'; apply(saved);
    btn.onclick=()=>{ apply(document.documentElement.dataset.theme==='dark'?'light':'dark'); };
  })();

  // ===== Summary: add "عرض الإحصاءات" =====
  (function addStatsLink(){
    const host=document.getElementById('summary');
    const cont=document.createElement('div'); cont.className='row'; cont.style.marginTop='10px';
    const b=document.createElement('button'); b.textContent='عرض الإحصاءات';
    b.onclick=()=>{ window.location.href='stats.html'; };
    cont.appendChild(b);
    host && host.appendChild(cont);
  })();

  initReciters();
  loadSurahs().catch(()=>{});
})();
  (function addSummaryTools(){
    const host=document.getElementById('summary');
    if(!host) return;
    const bar=document.createElement('div'); bar.className='row'; bar.style.marginTop='10px'; bar.style.gap='8px';
    const b1=document.createElement('button'); b1.textContent='تنزيل CSV للسجل';
    b1.onclick=()=>{
      try{
        const arr = JSON.parse(localStorage.getItem('tajweedy_progress_full')||'[]');
        if(!arr.length){ alert('لا يوجد سجل.'); return; }
        let lines=['datetime,section,correct,total,trainee'];
        const map={noon_tanween:'noon_tanween',meem_sakinah:'meem_sakinah',madd:'madd',full:'full',custom:'custom'};
        arr.forEach(r=>{
          const dt=new Date(r.ts||Date.now()).toISOString();
          lines.push([dt,(map[r.sectionKey]||r.sectionKey),r.correct,r.total,(r.traineeName||'')].join(','));
        });
        const blob=new Blob([lines.join('\\n')],{type:'text/csv'});
        const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='tajweedy_progress.csv'; a.click();
      }catch(e){ alert('تعذّر إنشاء CSV'); }
    };
    const b2=document.createElement('button'); b2.textContent='تدريبات علاجية'; b2.onclick=()=>{ location.href='exercises.html'; };
    bar.appendChild(b1); bar.appendChild(b2);
    host.appendChild(bar);
  })();

  // ===== Summary: Cloud sync buttons =====
  (function addCloudSync(){
    const host=document.getElementById('summary');
    if(!host) return;
    const row=document.createElement('div'); row.className='row'; row.style.gap='8px';
    const btn1=document.createElement('button'); btn1.textContent='مزامنة للسحابة (آخر تقرير)';
    const btn2=document.createElement('button'); btn2.textContent='مزامنة جميع السجل';
    async function send(payload){
      try{
        const r=await fetch('/.netlify/functions/sync',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
        const j=await r.json().catch(()=>({}));
        if(r.ok && j.ok) alert('تمت المزامنة بنجاح');
        else alert('فشل في المزامنة');
      }catch(e){ alert('لا يمكن الاتصال بالخادم'); }
    }
    btn1.onclick=()=>{
      const last = localStorage.getItem('tajweedy_last_report');
      if(!last){ alert('لا يوجد تقرير محفوظ'); return; }
      send(JSON.parse(last));
    };
    btn2.onclick=async()=>{
      const arr = JSON.parse(localStorage.getItem('tajweedy_progress_full')||'[]');
      if(!arr.length){ alert('لا يوجد سجل'); return; }
      let ok=0;
      for (const r of arr){ try{ await send(r); ok++; }catch(e){} }
    };
    row.appendChild(btn1); row.appendChild(btn2); host.appendChild(row);
  })();

  (function addConsolidatedLink(){
    const host=document.getElementById('summary'); if(!host) return;
    const d=document.createElement('div'); d.className='row'; d.style.marginTop='10px';
    const b=document.createElement('button'); b.textContent='تقرير مجمّع (PDF)';
    b.onclick=()=>{ location.href='consolidated_report.html'; };
    d.appendChild(b); host.appendChild(d);
  })();

// ===== Auto cloud sync after saving a report =====
(function hookAutoSync(){
  const key='tajweedy_auto_sync';
  // inject toggle in summary header (if summary exists)
  const sum=document.getElementById('summary');
  if(sum){
    const row=document.createElement('div'); row.className='row'; row.style.gap='8px';
    const lbl=document.createElement('label'); lbl.style.display='flex'; lbl.style.alignItems='center'; lbl.style.gap='6px';
    const chk=document.createElement('input'); chk.type='checkbox'; chk.id='autoSync'; chk.checked=localStorage.getItem(key)==='1';
    lbl.appendChild(chk); lbl.appendChild(document.createTextNode('مزامنة تلقائية بعد إنهاء كل اختبار'));
    row.appendChild(lbl);
    sum.appendChild(row);
    chk.onchange=()=> localStorage.setItem(key, chk.checked?'1':'0');
  }
  // expose function window.tj_onSaveReport(payload) to be called by quiz save code
  window.tj_onSaveReport = async function(payload){
    try{
      localStorage.setItem('tajweedy_last_report', JSON.stringify(payload));
      if(localStorage.getItem(key)!=='1') return;
      await fetch('/.netlify/functions/sync',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
    }catch(e){/* silent */}
  };
})();

// ===== Import/Export JSON of progress =====
(function addJsonImportExport(){
  const host=document.getElementById('summary'); if(!host) return;
  const row=document.createElement('div'); row.className='row'; row.style.gap='8px';
  const exp=document.createElement('button'); exp.textContent='تصدير JSON للسجل';
  exp.onclick=()=>{
    const data = localStorage.getItem('tajweedy_progress_full')||'[]';
    const blob=new Blob([data],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='tajweedy_progress.json'; a.click();
  };
  const impLabel=document.createElement('label'); impLabel.className='button'; impLabel.textContent='استيراد JSON للسجل';
  const file=document.createElement('input'); file.type='file'; file.accept='application/json'; file.style.display='none';
  impLabel.appendChild(file);
  file.onchange=()=>{
    const f=file.files[0]; if(!f) return;
    const reader=new FileReader();
    reader.onload=()=>{ try{ localStorage.setItem('tajweedy_progress_full', reader.result); alert('تم الاستيراد'); }catch(e){ alert('فشل الاستيراد'); } };
    reader.readAsText(f,'utf-8');
  };
  row.appendChild(exp); row.appendChild(impLabel); host.appendChild(row);
})();

  (function addDashboardLink(){
    const host=document.getElementById('summary'); if(!host) return;
    const d=document.createElement('div'); d.className='row'; d.style.marginTop='10px';
    const b=document.createElement('button'); b.textContent='لوحة شاملة (PDF)';
    b.onclick=()=>{ location.href='dashboard.html'; };
    d.appendChild(b); host.appendChild(d);
  })();
