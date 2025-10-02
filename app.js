
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
      return js.data.map(s => ({ number: s.number, name: s.name, ayahs: s.ayahs }));
    }
  }catch(e){ console.warn(e); }
  return [{number:1,name:"الفاتحة",ayahs:7},{number:2,name:"البقرة",ayahs:286},{number:3,name:"آل عمران",ayahs:200}];
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
    aSel.innerHTML = Array.from({length: s.ayahs}, (_,i)=>`<option value="${i+1}">${i+1}</option>`).join('');
    aSel.value = "1"; await setAyah(sn, 1);
  };
  aSel.onchange = async () => { await setAyah(Number(sSel.value), Number(aSel.value)); };
  sSel.value = "1";
  aSel.innerHTML = Array.from({length: list[0].ayahs}, (_,i)=>`<option value="${i+1}">${i+1}</option>`).join('');
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
async function transcribeCloud(blob){
  try{
    const buf = await blob.arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    const res = await fetch('/.netlify/functions/transcribe', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ audio_b64: b64, mime:'audio/webm', language:'ar' })
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  }catch(err){
    console.error(err);
    alert("فشل التفريغ السحابي. تحقق من المفتاح أو جرّب وضع دون إنترنت.");
    return null;
  }
}

// --- Offline (optional / Vosk) ---
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
  $("referenceAudio").src = buildEveryAyahUrl(state.current.surah, state.current.ayah);
  $("referenceAudio").play();
}

// --- Quiz ---
async function loadBank(){
  const r = await fetch('data/quiz_bank.json'); state.bank = await r.json();
}
function pickRandom(arr, n){
  const a=[...arr]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a.slice(0, Math.min(n, a.length));
}
function renderQuiz(picked){
  const cont = $("quiz"); cont.innerHTML = "";
  picked.forEach((q, idx) => {
    const card = document.createElement('div'); card.className="q";
    const title = `<div class="q-title">س${idx+1}: ${q.text}</div>`;
    const verse = q.verse ? `<div class="muted">﴾${q.verse}﴿</div>` : "";
    const opts = q.choices.map((o,i)=>`<label><input type="radio" name="q${idx}" value="${i}"> ${o}</label>`).join('');
    card.innerHTML = `${title}${verse}<div class="q-opts">${opts}</div><div class="q-ans" id="ans${idx}" hidden></div>`;
    cont.appendChild(card);
  });
  const btn = document.createElement('button'); btn.textContent="صحّح الاختبار";
  btn.onclick = () => {
    picked.forEach((q, idx) => {
      const sel = [...document.querySelectorAll(`input[name="q${idx}"]`)].find(i=>i.checked);
      const box = document.getElementById(`ans${idx}`); box.hidden=false;
      const ok = sel && Number(sel.value)===Number(q.correct);
      const label = q.choices[q.correct];
      box.textContent = ok ? "إجابة صحيحة" : `إجابة خاطئة. الصحيح: ${label}`;
      box.className = "q-ans " + (ok ? "ok" : "bad");
    });
  };
  cont.appendChild(btn);
}
function buildQuiz(section){
  const pool = state.bank[section] || []; renderQuiz(pickRandom(pool, 5));
}
function buildFullQuiz(){
  const p1 = pickRandom(state.bank["noon_tanween"]||[],5);
  const p2 = pickRandom(state.bank["meem_sakinah"]||[],5);
  const p3 = pickRandom(state.bank["madd"]||[],5);
  renderQuiz([...p1,...p2,...p3]);
}

// --- Wire UI ---
async function init(){
  await initQuran(); await loadBank();
  $("micBtn").onclick = async()=>{ $("micBtn").disabled=true; $("stopBtn").disabled=false; await startRecording(); };
  $("stopBtn").onclick = ()=>{ $("micBtn").disabled=false; $("stopBtn").disabled=true; stopRecording(); };
  $("transcribeBtn").onclick = async()=>{
    const blob = new Blob(state.chunks, { type:'audio/webm' });
    const out = (document.getElementById('sttMode').checked) ? await transcribeCloud(blob) : await transcribeOffline(blob);
    if (out){ document.getElementById('transcript').textContent = JSON.stringify(out,null,2); renderFeedback(state.current.text, out.text||""); }
  };
  $("playCorrectBtn").onclick = playReference;
  $("buildQuizBtn").onclick = ()=> buildQuiz($("quizSection").value);
  $("buildFullQuizBtn").onclick = buildFullQuiz;
  $("surahSelect").onchange = async()=>{ const s=Number($("surahSelect").value); const aSel=$("ayahSelect"); const r=await fetch('https://api.alquran.cloud/v1/surah'); const js=await r.json(); const sur=js.data.find(x=>x.number===s); aSel.innerHTML = Array.from({length: sur.ayahs}, (_,i)=>`<option value="${i+1}">${i+1}</option>`).join(''); aSel.value="1"; await setAyah(s,1); };
  $("ayahSelect").onchange = async()=> await setAyah(Number($("surahSelect").value), Number($("ayahSelect").value));
}
window.addEventListener('DOMContentLoaded', init);
