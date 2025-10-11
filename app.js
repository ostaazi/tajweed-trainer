// ===== app.js (clean transcript + toggle details) =====
const state = { recorder:null, chunks:[], mediaStream:null, current:{surah:1, ayah:1, text:""} };
const $ = id => document.getElementById(id);

// --- Quran helpers ---
async function fetchSurahList(){
  try{
    const res = await fetch('https://api.alquran.cloud/v1/surah');
    const js = await res.json();
    if (js.status === "OK"){
      return js.data.map(s => ({ number:s.number, name:s.name, numberOfAyahs:s.numberOfAyahs }));
    }
  }catch(e){ console.warn(e); }
  // fallback مختصر
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
  state.current = { surah, ayah, text };
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

// --- Recording ---
async function startRecording(){
  try{ state.mediaStream = await navigator.mediaDevices.getUserMedia({audio:true}); }
  catch(e){ alert("تعذّر الوصول للميكروفون."); throw e; }
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

// --- Cloud STT ---
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

// --- Render result (Arabic only by default) + Toggle details button ---
function renderTranscriptClean(result){
  const pre = $("transcript"); if (!pre) return;

  const plain = (result && typeof result.text === "string" && result.text.trim())
    || (Array.isArray(result.segments) ? result.segments.map(s => s.text).join(" ").trim() : "");

  // الوضع الافتراضي: نص عربي فقط
  pre.dir = "rtl"; pre.style.textAlign = "right";
  pre.textContent = plain || "لم يتم التعرّف على نص.";
  pre.setAttribute("data-json", "0");

  // زر التبديل
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
      // ارجع للنص العربي
      pre.dir = "rtl"; pre.style.textAlign = "right";
      pre.textContent = plain || "لم يتم التعرّف على نص.";
      pre.setAttribute("data-json", "0");
      toggleBtn.textContent = "عرض التفاصيل";
    } else {
      // اعرض JSON مفصّل
      pre.dir = "ltr"; pre.style.textAlign = "left";
      pre.textContent = JSON.stringify(result, null, 2);
      pre.setAttribute("data-json", "1");
      toggleBtn.textContent = "إخفاء التفاصيل";
    }
  };

  // نمرّر للنظام المقارن إن وُجد
  if (typeof renderFeedback === "function"){
    try{ renderFeedback(state.current.text || "", plain || ""); }catch(_){}
  }
}

// --- UI wiring ---
async function init(){
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
  if (playCorrectBtn) playCorrectBtn.onclick = ()=>{
    const pad3 = n => String(n).padStart(3,'0');
    const url = `https://everyayah.com/data/AbdulSamad_64kbps_QuranExplorer.Com/${pad3(state.current.surah)}${pad3(state.current.ayah)}.mp3`;
    const audio = $("referenceAudio");
    if (audio){ audio.src = url; audio.play(); }
  };
}
window.addEventListener('DOMContentLoaded', init);
