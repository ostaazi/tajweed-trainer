// ===== app.js (fixed) =====
const state = {
  recorder: null, chunks: [], mediaStream: null,
  offlineModel: null, recognizer: null,
  current: { surah: 1, ayah: 1, text: "" },
  bank: null
};
const $ = id => document.getElementById(id);

// --- Quran (Uthmani) ---
async function fetchSurahList(){
  try{
    const res = await fetch('https://api.alquran.cloud/v1/surah');
    const js = await res.json();
    if (js.status === "OK"){
      // FIX: use numberOfAyahs (not ayahs)
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
    // FIX: numberOfAyahs
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
  state.mediaStream = await navigator.mediaDevices.getUserMedia({ audio:true });
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
// FIX: improved error logging for easier debugging of API key issues
async function transcribeCloud(blob){
  try{
    const buf = await blob.arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    const res = await fetch('/.netlify/functions/transcribe', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ audio_b64: b64, mime:'audio/webm', language:'ar' })
    });
    const text = await res.text();
    if (!res.ok) { console.error('STT error:', text); throw new Error(text); }
    return JSON.parse(text);
  }catch(err){
    console.error(err);
    alert("فشل التفريغ السحابي. تحقق من المفتاح أو جرّب وضع دون إنترنت.");
    return null;
  }
}

// --- Offline (optional / placeholder) ---
async function transcribeOffline(){ return { text: "(وضع دون إنترنت – تجريبي)" }; }

// --- Compare & Feedback ---
function tokenizeArabic(s){
  return s.replace(/[^\u0600-\u06FF\s\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g,'').replace(/\s+/g,' ').trim().split(' ');
}
function diffTokens(expected, actual){
  const errors=[]; let match=0;
  for (let i=0;i<Math.max(expected.length, actual.length);i++){
    const e = expected[i] || "(—)", a = actual[i] || "(—)";
    if (e===a) match++; else errors.push({ index:i+1, expected:e, got:a });
  }
  return { score: Math.max(0, Math.round((match/expected.length)*100)), errors };
}
function renderFeedback(expectedText, transcriptText){
  const E = tokenizeArabic(expectedText), A = tokenizeArabic(transcriptText);
  const {score, errors} = diffTokens(E, A);
  $("score").innerHTML = `النتيجة التقريبية: <b>${score}%</b>`;
  const list = $("errors"); list.innerHTML="";
  if (errors.length===0){ list.innerHTML = `<li class="ok">لا توجد فروقات نصية واضحة.</li>`; }
  else errors.forEach(e => {
    const li = document.createElement('li'); li.className="bad";
    li.textContent = `اختلاف عند الكلمة ${e.index}: توقّعنا «${e.expected}» وسمعنا «${e.got}».`;
    list.appendChild(li);
  });
}

// --- Reference audio ---
function pad3(n){ return String(n).padStart(3,'0'); }
function buildEveryAyahUrl(s,a){ return `https://everyayah.com/data/AbdulSamad_64kbps_QuranExplorer.Com/${pad3(s)}${pad3(a)}.mp3`; }
function playReference(){
  document.getElementById("referenceAudio").src = buildEveryAyahUrl(state.current.surah, state.current.ayah);
  document.getElementById("referenceAudio").play();
}

// --- Quiz (unchanged logic except progress added in your v4) ---
// assume functions loadBank/pickRandom/renderQuiz/buildQuiz/buildFullQuiz exist in your current file

// --- Wire UI ---
async function init(){
  await initQuran(); // builds surah/ayah lists correctly now
  // keep your existing hooks as-is
}
window.addEventListener('DOMContentLoaded', init);
