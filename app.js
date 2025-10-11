// ===== app.js — Unified + Expanded Reciters + UI notice for fallback =====
(function(){
  // ---------- State & helpers ----------
  const state = { recorder:null, chunks:[], mediaStream:null, current:{surah:1, ayah:1, text:"", reciter:null} };
  const $ = id => document.getElementById(id);
  const pad3 = n => String(n).padStart(3,'0');

  // Small notice below the "play" button
  function showReciterNotice(usedId){
    let el = $("reciterNotice");
    if (!el){
      el = document.createElement('div');
      el.id = 'reciterNotice';
      el.style.marginTop = '8px';
      el.style.fontSize = '0.92rem';
      el.style.color = '#555';
      const after = $("playCorrectBtn");
      if (after) after.insertAdjacentElement('afterend', el);
      else document.body.appendChild(el);
    }
    const found = RECITERS.find(r => r.id === usedId);
    const usedName = found ? found.name : usedId;
    const prefName = (RECITERS.find(r=>r.id===state.current.reciter)||{}).name || state.current.reciter;
    if (state.current.reciter === usedId){
      el.textContent = `تم التشغيل بصوت: ${usedName}`;
    }else{
      el.textContent = `لم تتوفر الآية عند القارئ المختار (${prefName})؛ تم التشغيل بصوت: ${usedName}`;
    }
  }

  // ---------- Reciters (EveryAyah) — expanded ----------
  const RECITERS = [
    { id:"Husary_64kbps",                           name:"الحصري 64kbps" },
    { id:"Husary_Mujawwad_64kbps",                  name:"الحصري (مجوّد) 64kbps" },
    { id:"AbdulSamad_64kbps_QuranExplorer.Com",     name:"محمود خليل الحصري (عبد الصمد) 64kbps" },
    { id:"Abdul_Basit_Murattal_64kbps",             name:"عبد الباسط (مرتّل) 64kbps" },
    { id:"Abdul_Basit_Mujawwad_128kbps",            name:"عبد الباسط (مجوّد) 128kbps" },
    { id:"Abdurrahmaan_As-Sudais_64kbps",           name:"عبد الرحمن السديس 64kbps" },
    { id:"Abu_Bakr_Ash-Shaatree_64kbps",            name:"أبو بكر الشاطري 64kbps" },
    { id:"Ahmed_ibn_Ali_al-Ajamy_64kbps_QuranExplorer.Com", name:"أحمد العجمي 64kbps" },
    { id:"Alafasy_64kbps",                          name:"مشاري راشد العفاسي 64kbps" },
    { id:"Ghamadi_40kbps",                          name:"أبو بكر الغامدي 40kbps" },
    { id:"Maher_AlMuaiqly_64kbps",                  name:"ماهر المعيقلي 64kbps" },
    { id:"Hudhaify_64kbps",                         name:"علي الحذيفي 64kbps" },
    { id:"Minshawi_64kbps",                         name:"محمد صديق المنشاوي 64kbps" },
    { id:"Minshawy_Mujawwad_192kbps",               name:"المنشاوي (مجوّد) 192kbps" },
    { id:"Saood_ash-Shuraym_64kbps",                name:"سعود الشريم 64kbps" }
  ];
  if (!state.current.reciter) state.current.reciter = RECITERS[0].id;

  function initReciters(){
    const rSel = $("reciterSelect");
    if (!rSel) return;
    rSel.innerHTML = RECITERS.map(r => `<option value="${r.id}">${r.name}</option>`).join("");
    rSel.value = state.current.reciter || RECITERS[0].id;
    rSel.onchange = () => { state.current.reciter = rSel.value; };
  }

  async function pickFirstAvailableUrl(surah, ayah, preferredId){
    const order = [preferredId, ...RECITERS.map(r=>r.id).filter(id => id !== preferredId)];
    for (const reciterId of order){
      const testUrl = `https://everyayah.com/data/${reciterId}/${pad3(surah)}${pad3(ayah)}.mp3`;
      try {
        const h = await fetch(testUrl, { method: 'HEAD' });
        if (h.ok) return { url:testUrl, reciterId };
      } catch(_) {}
    }
    return null;
  }

  async function playReference(){
    const surah = state.current.surah;
    const ayah  = state.current.ayah;
    const preferred = state.current.reciter || RECITERS[0].id;
    const found = await pickFirstAvailableUrl(surah, ayah, preferred);
    const audio = $("referenceAudio");
    if (found && audio){
      audio.src = found.url;
      showReciterNotice(found.reciterId); // UI hint (also signals fallback)
      try { await audio.play(); } catch(_){}
    } else {
      alert("تعذّر إيجاد ملف لهذه الآية عند القرّاء المحدّدين.");
    }
  }

  // ---------- Quran API (Uthmani) ----------
  async function fetchSurahList(){
    try{
      const res = await fetch('https://api.alquran.cloud/v1/surah');
      const js = await res.json();
      if (js.status === "OK"){
        return js.data.map(s => ({ number:s.number, name:s.name, numberOfAyahs:s.numberOfAyahs }));
      }
    }catch(e){ console.warn(e); }
    return [{number:1,name:"الفاتحة",numberOfAyahs:7},{number:2,name:"البقرة",numberOfAyahs:286},{number:3,name:"آل عمران",numberOfAyahs:200}];
  }
  async function fetchAyahUthmani(surah, ayah){
    const r = await fetch(`https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/quran-uthmani`);
    const j = await r.json();
    if (j.status === "OK") return j.data.text;
    return "";
  }
  async function setAyah(surah, ayah){
    const text = await fetchAyahUthmani(surah, ayah);
    state.current = { ...state.current, surah, ayah, text };
    const t = $("ayahText"); if (t) t.textContent = text || "تعذّر جلب النص.";
  }
  async function initQuran(){
    const sSel = $("surahSelect"), aSel = $("ayahSelect");
    if (!sSel || !aSel) return;
    const list = await fetchSurahList();
    sSel.innerHTML = list.map(s => `<option value="${s.number}">${s.number}. ${s.name}</option>`).join('');
    sSel.value = "1";
    aSel.innerHTML = Array.from({length:list[0].numberOfAyahs}, (_,i)=>`<option value="${i+1}">${i+1}</option>`).join('');
    aSel.value = "1"; await setAyah(1,1);
    sSel.onchange = async ()=>{
      const sn = Number(sSel.value);
      const s = list.find(x=>x.number===sn);
      aSel.innerHTML = Array.from({length:s.numberOfAyahs}, (_,i)=>`<option value="${i+1}">${i+1}</option>`).join('');
      aSel.value = "1"; await setAyah(sn,1);
    };
    aSel.onchange = async ()=>{ await setAyah(Number(sSel.value), Number(aSel.value)); };
  }

  // ---------- Recording + Cloud STT ----------
  async function startRecording(){
    try{ state.mediaStream = await navigator.mediaDevices.getUserMedia({ audio:true }); }
    catch(e){ alert("تعذّر الوصول للميكروفون. امنح الإذن."); throw e; }
    state.recorder = new MediaRecorder(state.mediaStream, { mimeType:'audio/webm' });
    state.chunks = [];
    state.recorder.ondataavailable = e => { if (e.data.size) state.chunks.push(e.data); };
    state.recorder.onstop = () => {
      const blob = new Blob(state.chunks, { type:'audio/webm' });
      const pl = $("playback"); if (pl) pl.src = URL.createObjectURL(blob);
      const tb = $("transcribeBtn"); if (tb) tb.disabled = false;
    };
    state.recorder.start();
  }
  function stopRecording(){
    if (state.recorder && state.recorder.state!=="inactive") state.recorder.stop();
    if (state.mediaStream) state.mediaStream.getTracks().forEach(t=>t.stop());
  }

  async function transcribeCloud(blob){
    try{
      const buf = await blob.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      const res = await fetch('/.netlify/functions/transcribe', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ audio_b64:b64, mime:'audio/webm', language:'ar' })
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text);
      return JSON.parse(text);
    }catch(err){
      console.error(err);
      alert("فشل التفريغ السحابي. تحقق من الاتصال/المفتاح.");
      return null;
    }
  }

  // ---------- Clean transcript + toggle details ----------
  function renderTranscriptClean(result){
    const pre = $("transcript"); if (!pre) return;

    const plain = (result && typeof result.text === "string" && result.text.trim())
      || (Array.isArray(result.segments) ? result.segments.map(s => s.text).join(" ").trim() : "");

    pre.dir = "rtl"; pre.style.textAlign = "right";
    pre.textContent = plain || "لم يتم التعرّف على نص.";
    pre.setAttribute("data-json", "0");

    let toggleBtn = $("toggleDetails");
    if (!toggleBtn) {
      toggleBtn = document.createElement("button");
      toggleBtn.id = "toggleDetails";
      toggleBtn.textContent = "عرض التفاصيل";
      toggleBtn.style.marginTop = "10px";
      toggleBtn.style.padding = "8px 12px";
      toggleBtn.style.borderRadius = "8px";
      toggleBtn.style.border = "1px solid #ddd";
      toggleBtn.style.background = "#fafafa";
      toggleBtn.style.cursor = "pointer";
      pre.insertAdjacentElement("afterend", toggleBtn);
    }

    toggleBtn.onclick = () => {
      const showingJSON = pre.getAttribute("data-json") === "1";
      if (showingJSON) {
        pre.dir = "rtl"; pre.style.textAlign = "right";
        pre.textContent = plain || "لم يتم التعرّف على نص.";
        pre.setAttribute("data-json", "0");
        toggleBtn.textContent = "عرض التفاصيل";
      } else {
        pre.dir = "ltr"; pre.style.textAlign = "left";
        pre.textContent = JSON.stringify(result, null, 2);
        pre.setAttribute("data-json", "1");
        toggleBtn.textContent = "إخفاء التفاصيل";
      }
    };

    if (typeof window.renderFeedback === "function"){
      try{ window.renderFeedback(state.current.text || "", plain || ""); }catch(_){}
    }
  }

  // ---------- Quiz progress helpers ----------
  const PROGRESS_KEY = 'tajweed_progress';
  function loadProgress(){ try { const s = localStorage.getItem(PROGRESS_KEY); return s ? JSON.parse(s) : []; } catch(_){ return []; } }
  function saveProgress(arr){ try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(arr)); } catch(_){ } }
  function resetProgress(){ try { localStorage.removeItem(PROGRESS_KEY); } catch(_){} if (typeof window.onProgressReset === 'function') { try { window.onProgressReset(); } catch(_){ } } }
  function recordQuizResult(payload){
    const now = Date.now();
    const rec = { section:(payload&&payload.section)||'unknown', total:(payload&&payload.total)||0, correct:(payload&&payload.correct)||0, ts:(payload&&payload.ts)||now };
    const arr = loadProgress(); arr.push(rec); saveProgress(arr); return rec;
  }
  function buildSummary(){
    const arr = loadProgress();
    const sections = ['noon_tanween','meem_sakinah','madd'];
    const names = { noon_tanween:'النون الساكنة والتنوين', meem_sakinah:'الميم الساكنة', madd:'أحكام المدود' };
    const sum = {}; sections.forEach(s => sum[s] = { name:names[s], attempts:0, total:0, correct:0 });
    for (const r of arr){
      if (!sum[r.section]) sum[r.section] = { name:r.section, attempts:0, total:0, correct:0 };
      sum[r.section].attempts++; sum[r.section].total += (r.total||0); sum[r.section].correct += (r.correct||0);
    }
    return sum;
  }
  function showProgressSummary(){
    const sum = buildSummary();
    const lines = [];
    Object.keys(sum).forEach(k => {
      const s = sum[k];
      const acc = s.total ? Math.round((s.correct/s.total)*100) : 0;
      lines.push(`• ${s.name}: محاولات ${s.attempts} — صحيحة ${s.correct}/${s.total} (الدقة ${acc}٪)`);
    });
    const box = $("progressSummary");
    const text = lines.join('\\n') || 'لا توجد بيانات بعد.';
    if (box) { box.textContent = text; } else { alert(text); }
  }
  window.quizProgress = { loadProgress, saveProgress, resetProgress, recordQuizResult, showProgressSummary };

  // ---------- Quiz UI wiring (4 buttons) ----------
  function initQuizUI(){
    const sectionSel = $("quizSectionSelect");
    const btnRandom   = $("startRandomQuizBtn");
    const btnFull     = $("startFullQuizBtn");
    const btnSummary  = $("showSummaryBtn");
    const btnReset    = $("resetProgressBtn");

    if (!sectionSel || !btnRandom || !btnFull || !btnSummary || !btnReset) {
      console.warn('Quiz UI elements not found. Check IDs.');
      return;
    }
    [btnRandom, btnFull, btnSummary, btnReset].forEach(b => b.disabled = false);

    btnRandom.addEventListener('click', () => {
      const section = sectionSel.value;
      if (typeof window.startRandomQuiz === 'function') window.startRandomQuiz(section);
      else if (typeof window.startQuiz === 'function') window.startQuiz({ mode:'random5', section });
      else alert('زر "اختبار ٥ أسئلة" جاهز — اربطه بدالة startRandomQuiz(section).');
    });
    btnFull.addEventListener('click', () => {
      if (typeof window.startFullQuiz === 'function') window.startFullQuiz();
      else if (typeof window.startQuiz === 'function') window.startQuiz({ mode:'full15' });
      else alert('زر "اختبار شامل" جاهز — اربطه بدالة startFullQuiz().');
    });
    btnSummary.addEventListener('click', showProgressSummary);
    btnReset.addEventListener('click', () => { resetProgress(); alert('تمت إعادة تعيين السجل.'); const box = $("progressSummary"); if (box) box.textContent=''; });
  }

  // ---------- Global init ----------
  async function init(){
    initReciters();
    await initQuran();

    const micBtn = $("micBtn");
    const stopBtn = $("stopBtn");
    const transcribeBtn = $("transcribeBtn");
    const playCorrectBtn = $("playCorrectBtn");

    if (micBtn) micBtn.onclick = async ()=>{ micBtn.disabled = true; if (stopBtn) stopBtn.disabled = false; await startRecording(); };
    if (stopBtn) stopBtn.onclick = ()=>{ if (micBtn) micBtn.disabled = false; stopBtn.disabled = true; stopRecording(); };
    if (transcribeBtn) transcribeBtn.onclick = async ()=>{
      const blob = new Blob(state.chunks, { type:'audio/webm' });
      const out = await transcribeCloud(blob);
      if (out) renderTranscriptClean(out);
    };
    if (playCorrectBtn) playCorrectBtn.onclick = playReference;

    initQuizUI();
  }

  if (document.readyState === "loading") {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();