
(function(){
  'use strict';

  // ======== Helpers ========
  const $ = sel => document.querySelector(sel);
  const $$ = sel => document.querySelectorAll(sel);
  const byId = id => document.getElementById(id);

  function getTraineeName(){
    var el = byId('traineeName');
    var v = el && el.value ? String(el.value).trim() : '';
    if (v){ try{ localStorage.setItem('trainee_name', v); }catch(_){} }
    return v || (localStorage.getItem && localStorage.getItem('trainee_name')) || '';
  }

  // ======== Elements ========
  const reciterSelect = byId('reciterSelect');
  const surahSelect = byId('surahSelect');
  const ayahSelect = byId('ayahSelect');
  const ayahTextEl = byId('ayahText');
  const playCorrectBtn = byId('playCorrectBtn');
  const referenceAudio = byId('referenceAudio');

  const micBtn = byId('micBtn');
  const stopBtn = byId('stopBtn');
  const transcribeBtn = byId('transcribeBtn');
  const playback = byId('playback');
  const transcriptPre = byId('transcript');

  const quizSectionSel = byId('quizSection');
  const buildQuizBtn = byId('buildQuizBtn');
  const buildFullQuizBtn = byId('buildFullQuizBtn');
  const quizDiv = byId('quiz');

  const showSummaryBtn = byId('showSummaryBtn');
  const resetSummaryBtn = byId('resetSummaryBtn');
  const summaryDiv = byId('summary');

  // ======== Reciters (alquran.cloud handles audio per ayah) ========
  const RECITERS = [
    { id: 'ar.alafasy', name: 'مشاري العفاسي' },
    { id: 'ar.husary', name: 'الحُصري' },
    { id: 'ar.minshawi', name: 'المِنشاوي' },
    { id: 'ar.abdulbasit', name: 'عبد الباسط' }
  ];

  // ======== State ========
  let mediaRecorder = null;
  let recordedChunks = [];

  // ======== Init Reciters ========
  function initReciters(){
    reciterSelect.innerHTML = RECITERS.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
  }

  // ======== Fetch Surahs/Ayahs from Quran.com API ========
  async function loadSurahs(){
    const res = await fetch('https://api.quran.com/api/v4/chapters?language=ar');
    const data = await res.json();
    const chapters = data.chapters || [];
    surahSelect.innerHTML = chapters.map(c => `<option value="${c.id}">${c.id} — ${c.name_arabic}</option>`).join('');
    await loadAyahs();
  }

  async function loadAyahs(){
    const sid = Number(surahSelect.value || 1);
    ayahSelect.innerHTML = '';
    ayahTextEl.textContent = '';
    // Get verses Uthmani for that chapter
    const res = await fetch(`https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${sid}`);
    const data = await res.json();
    const verses = data.verses || [];
    ayahSelect.innerHTML = verses.map(v => `<option value="${v.verse_number}">${sid}:${v.verse_number}</option>`).join('');
    updateAyahText();
  }

  async function updateAyahText(){
    const sid = Number(surahSelect.value || 1);
    const aid = Number(ayahSelect.value || 1);
    const res = await fetch(`https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${sid}`);
    const data = await res.json();
    const verse = (data.verses || []).find(v => Number(v.verse_number)===aid);
    ayahTextEl.textContent = verse ? (verse.text_uthmani || '') : '';
  }

  // ======== Play Correct Recitation (alquran.cloud) ========
  async function playCorrect(){
    const sid = Number(surahSelect.value || 1);
    const aid = Number(ayahSelect.value || 1);
    const rec = reciterSelect.value || 'ar.alafasy';
    // e.g., https://api.alquran.cloud/v1/ayah/2:1/ar.alafasy
    try{
      const res = await fetch(`https://api.alquran.cloud/v1/ayah/${sid}:${aid}/${rec}`);
      const data = await res.json();
      const url = data && data.data && data.data.audio;
      if (!url) throw new Error('Audio not available.');
      referenceAudio.src = url;
      referenceAudio.play().catch(()=>{});
    }catch(err){
      alert('تعذّر جلب الصوت من الخادم. جرّب قارئًا آخر.');
    }
  }

  // ======== Recording / Transcription ========
  async function startRecording(){
    recordedChunks = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    mediaRecorder.ondataavailable = e => { if (e.data.size>0) recordedChunks.push(e.data); };
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'audio/webm' });
      playback.src = URL.createObjectURL(blob);
      transcribeBtn.disabled = false;
    };
    mediaRecorder.start();
    micBtn.disabled = true; stopBtn.disabled = false;
  }
  function stopRecording(){
    if (mediaRecorder && mediaRecorder.state !== 'inactive'){
      mediaRecorder.stop();
      stopBtn.disabled = true; micBtn.disabled = false;
    }
  }
  async function sendToTranscribe(){
    const blob = new Blob(recordedChunks, { type: 'audio/webm' });
    const fd = new FormData();
    fd.append('file', blob, 'read.webm');
    // Frontend expects your serverless endpoint at /api/transcribe (Netlify function or similar)
    // It should forward the audio to OpenAI Whisper or Realtime as configured on your backend.
    const res = await fetch('/api/transcribe', { method:'POST', body:fd });
    const text = await res.text().catch(()=>'');
    transcriptPre.textContent = text || '—';
  }

  // ======== QUIZ ========
  const BANK = (window.TAJWEED_BANK || {});
  function pickRandom(arr, n){
    const a = arr.slice(); const out=[];
    while (a.length && out.length<n){
      const i = Math.floor(Math.random()*a.length);
      out.push(a.splice(i,1)[0]);
    }
    return out;
  }

  function buildQuiz(sectionKey){
    let questions = [];
    if (sectionKey==='noon_tanween' || sectionKey==='meem_sakinah' || sectionKey==='madd'){
      const src = BANK[sectionKey] || [];
      questions = pickRandom(src, 5);
    }else if (sectionKey==='full'){
      questions = [
        ...pickRandom(BANK.noon_tanween||[], 5),
        ...pickRandom(BANK.meem_sakinah||[], 5),
        ...pickRandom(BANK.madd||[], 5),
      ];
    }else{
      questions = pickRandom(BANK.noon_tanween||[], 5);
    }
    renderQuiz(questions, sectionKey);
  }

  function renderQuiz(questions, sectionKey){
    quizDiv.innerHTML = '';
    const form = document.createElement('form');
    questions.forEach((q,qi)=>{
      const wrap = document.createElement('div');
      wrap.className='quiz-q card';
      wrap.style.marginTop='10px';

      const qtext = document.createElement('div');
      qtext.innerHTML = `<strong>س${qi+1}.</strong> ${q.text||''}`;
      wrap.appendChild(qtext);

      (q.options||[]).forEach((opt,oi)=>{
        const line = document.createElement('label');
        line.className='quiz-choice';
        line.style.display='block';
        line.style.padding='6px 8px';
        line.style.border='1px solid var(--tj-border)';
        line.style.borderRadius='8px';
        line.style.marginTop='6px';

        const inp = document.createElement('input');
        inp.type='radio';
        inp.name=`q${qi}`;
        inp.value=oi;
        inp.style.marginLeft='6px';
        line.appendChild(inp);

        const span = document.createElement('span');
        span.textContent = opt;
        line.appendChild(span);

        wrap.appendChild(line);
      });

      const fb = document.createElement('div');
      fb.className = 'quiz-feedback';
      wrap.appendChild(fb);

      form.appendChild(wrap);
    });

    const submit = document.createElement('button');
    submit.type='button';
    submit.textContent='تصحيح الإجابات';
    submit.style.marginTop='12px';
    form.appendChild(submit);

    quizDiv.appendChild(form);

    submit.onclick = () => {
      let correct = 0, total = questions.length;
      const rows = [];

      questions.forEach((q, idx)=>{
        const wrap = form.children[idx];
        const choiceEls = wrap.querySelectorAll('.quiz-choice');
        const ans = (typeof q.answer === 'number') ? q.answer : -1;
        const chosen = form.querySelector(`input[name="q${idx}"]:checked`);
        const chosenIdx = chosen ? Number(chosen.value) : -1;

        choiceEls.forEach((el,i)=>{
          el.classList.remove('is-correct','is-wrong');
          el.style.pointerEvents='none';
          if (i===ans) el.classList.add('is-correct');
          if (i===chosenIdx && i!==ans) el.classList.add('is-wrong');
        });

        const fb = wrap.querySelector('.quiz-feedback');
        if (chosenIdx===ans){ correct++; fb.textContent = (q.why? `✓ إجابة صحيحة — ${q.why}` : '✓ إجابة صحيحة'); }
        else {
          const corr = q.options && q.options[ans] ? q.options[ans] : '—';
          fb.textContent = (q.why? `✗ الإجابة الصحيحة: ${corr} — ${q.why}` : `✗ الإجابة الصحيحة: ${corr}`);
        }

        rows.push({
          index: idx+1,
          text: q.text||'',
          options: q.options||[],
          correctIndex: ans,
          chosenIndex: chosenIdx,
          why: q.why||''
        });
      });

      recordQuizResult(sectionKey, correct, total);
      // Build detailed report for any section
      const payload = {
        traineeName: (getTraineeName && getTraineeName()) || '',
        title: (sectionKey==='full' ? 'اختبار شامل (١٥ سؤالًا)' : 'اختبار'),
        sectionKey: sectionKey || 'custom',
        total: total,
        correct: correct,
        ts: Date.now(),
        rows: rows
      };
      try{ localStorage.setItem('tajweed_last_report', JSON.stringify(payload)); }catch(_){}
      alert(`النتيجة: ${correct} / ${total}`);
      window.location.href = 'report.html';
    };
  }

  function recordQuizResult(sectionKey, correct, total){
    try{
      const key='tajweed_progress';
      const now = new Date().toISOString();
      const name = getTraineeName();
      const rec = { when: now, who: name||'', section: sectionKey, correct, total };
      const arr = JSON.parse(localStorage.getItem(key) || '[]');
      arr.push(rec);
      localStorage.setItem(key, JSON.stringify(arr));
    }catch(_){}
  }

  function showSummary(){
    try{
      const arr = JSON.parse(localStorage.getItem('tajweed_progress') || '[]');
      if (!arr.length){ summaryDiv.textContent = 'لا توجد سجلات بعد.'; return; }
      const lines = arr.map(r => {
        return `التاريخ: ${new Date(r.when).toLocaleString('ar-EG')} — القسم: ${r.section} — النتيجة: ${r.correct}/${r.total} — ${r.who||''}`;
      });
      summaryDiv.textContent = lines.join('\n');
    }catch(_){
      summaryDiv.textContent = '—';
    }
  }
  function resetSummary(){
    try{ localStorage.removeItem('tajweed_progress'); }catch(_){}
    summaryDiv.textContent = 'تمت إعادة الضبط.';
  }

  // ======== Events ========
  reciterSelect.addEventListener('change', ()=>{});
  surahSelect.addEventListener('change', loadAyahs);
  ayahSelect.addEventListener('change', updateAyahText);
  playCorrectBtn.addEventListener('click', playCorrect);
  micBtn.addEventListener('click', startRecording);
  stopBtn.addEventListener('click', stopRecording);
  transcribeBtn.addEventListener('click', sendToTranscribe);
  buildQuizBtn.addEventListener('click', ()=>{
    getTraineeName();
    const section = quizSectionSel.value==='full' ? 'noon_tanween' : quizSectionSel.value;
    buildQuiz(section);
  });
  buildFullQuizBtn.addEventListener('click', ()=>{
    getTraineeName();
    buildQuiz('full');
  });
  showSummaryBtn.addEventListener('click', showSummary);
  resetSummaryBtn.addEventListener('click', resetSummary);

  // ======== Bootstrap ========
  initReciters();
  loadSurahs().catch(()=>{});
})();