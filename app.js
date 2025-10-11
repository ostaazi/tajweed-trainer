// ===== app.js (buttons restored + ayah fix + better STT logging) =====
const state = {
  recorder: null, chunks: [], mediaStream: null,
  current: { surah: 1, ayah: 1, text: "" }
};
const $ = id => document.getElementById(id);

// --- Quran (Uthmani) ---
async function fetchSurahList(){
  try{
    const res = await fetch('https://api.alquran.cloud/v1/surah');
    const js = await res.json();
    if (js.status === "OK"){
      // use numberOfAyahs (API schema)
      return js.data.map(s => ({ number: s.number, name: s.name, numberOfAyahs: s.numberOfAyahs }));
    }
  }catch(e){ console.warn(e); }
  // fallback minimal
  return [{number:1,name:"الفاتحة",numberOfAyahs:7},{number:2,name:"البقرة",numberOfAyahs:286},{number:3,name:"آل عمران",numberOfAyahs:200}];
}
async function fetchAyahUthmani(surah, ayah){
  const r = await fetch(`https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/quran-uthmani`);
  const j = await r.json();
  if (j.status === "OK") return j.data.text;
  return "";
}
async function initQuran(){
  const sSel = $("surahSelect"), aSel = $("ayahSelect");
  const list = await fetchSurahList();
  sSel.innerHTML = list.map(s => `<option value="${s.number}">${s.number}. ${s.name}</option>`).join('');
  sSel.onchange = async () => {
    const sn = Number(sSel.value);
    const s = list.find(x=>x.number===sn);
    aSel.innerHTML = Array.from({length: s.numberOfAyahs}, (_,i)=>`<option value="${i+1}">${i+1}</option>`).join('');
    aSel.value = "1"; await setAyah(sn, 1);
  };
  aSel.onchange = async () => { await setAyah(Number(sSel.value), Number(aSel.value)); };
  sSel.value = "1";
  aSel.innerHTML = Array.from({length: list[0].numberOfAyahs}, (_,i)=>`<option value="${i+1}">${i+1}</option>`).join('');
  aSel.value = "1"; await setAyah(1,1);
}
async function setAyah(surah, ayah){
  const text = await fetchAyahUthmani(surah, ayah);
  state.current = { surah, ayah, text };
  $("ayahText").textContent = text || "تعذّر جلب النص.";
}

// --- Recording ---
async function startRecording(){
  try{
    state.mediaStream = await navigator.mediaDevices.getUserMedia({ audio:true });
  }catch(e){
    alert("تعذّر الوصول إلى الميكروفون. امنح الإذن من المتصفح.");
    throw e;
  }
  state.recorder = new MediaRecorder(state.mediaStream, { mimeType: 'audio/webm' });
  state.chunks = [];
  state.recorder.ondataavailable = e => { if (e.data.size>0) state.chunks.push(e.data); };
  state.recorder.onstop = () => {
    const blob = new Blob(state.chunks, { type: 'audio/webm' });
    $("playback").src = URL.createObjectURL(blob);
    $("transcribeBtn").disabled = false;
  };
  state.recorder.start();
}
function stopRecording(){
  if (state.recorder && state.recorder.state!=="inactive") state.recorder.stop();
  if (state.mediaStream) state.mediaStream.getTracks().forEach(t=>t.stop());
}

// --- Cloud STT (Base64 JSON) ---
async function transcribeCloud(blob){
  try{
    const buf = await blob.arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    const res = await fetch('/.netlify/functions/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio_b64: b64, mime:'audio/webm', language:'ar' })
    });
    const text = await res.text();
    if (!res.ok) { console.error('STT error:', text); throw new Error(text); }
    return JSON.parse(text);
  }catch(err){
    console.error(err);
    alert("فشل التفريغ السحابي. تحقق من المفتاح أو جرّب لاحقًا.");
    return null;
  }
}

// --- Reference audio ---
function pad3(n){ return String(n).padStart(3,'0'); }
function buildEveryAyahUrl(s,a){ return `https://everyayah.com/data/AbdulSamad_64kbps_QuranExplorer.Com/${pad3(s)}${pad3(a)}.mp3`; }
function playReference(){
  const url = buildEveryAyahUrl(state.current.surah, state.current.ayah);
  const audio = document.getElementById("referenceAudio");
  audio.src = url; audio.play();
}

// --- Wire UI ---
async function init(){
  await initQuran();

  const micBtn = $("micBtn");
  const stopBtn = $("stopBtn");
  const transcribeBtn = $("transcribeBtn");
  const playCorrectBtn = $("playCorrectBtn");

  if (micBtn) micBtn.onclick = async () => {
    micBtn.disabled = true; if (stopBtn) stopBtn.disabled = false;
    await startRecording();
  };
  if (stopBtn) stopBtn.onclick = () => {
    if (micBtn) micBtn.disabled = false; stopBtn.disabled = true;
    stopRecording();
  };
  if (transcribeBtn) transcribeBtn.onclick = async () => {
    const blob = new Blob(state.chunks, { type: 'audio/webm' });
    const out = await transcribeCloud(blob);
    if (out){
      const pre = document.getElementById('transcript');
      pre.textContent = JSON.stringify(out, null, 2);
      if (typeof renderFeedback === "function"){
        renderFeedback(state.current.text, out.text || "");
      }
    }
  };
  if (playCorrectBtn) playCorrectBtn.onclick = playReference;
}
window.addEventListener('DOMContentLoaded', init);
