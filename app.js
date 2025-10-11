
// ====== Helpers ======
const $ = (s, p=document) => p.querySelector(s);
const $$= (s, p=document) => [...p.querySelectorAll(s)];
const pad3 = n => String(n).padStart(3,'0');

// Theme
const themeBtn = $("#toggleTheme");
themeBtn?.addEventListener("click", () => {
  document.documentElement.classList.toggle("dark");
  localStorage.setItem("tajweedy_theme", document.documentElement.classList.contains("dark")?"dark":"light");
});
if(localStorage.getItem("tajweedy_theme")==="dark"){document.documentElement.classList.add("dark");}

// ====== Reciters (EveryAyah stable folders) ======
const RECITERS = [
  {id:"alafasy", name:"مشاري العفاسي", folder:"Alafasy_128kbps"},
  {id:"husary", name:"محمود خليل الحصري", folder:"Husary_128kbps"},
  {id:"minshawi", name:"محمد صديق المنشاوي", folder:"Minshawy_Mujawwad_128kbps"},
  {id:"abdulbasit_m", name:"عبدالباسط (مجود)", folder:"Abdul_Basit_Mujawwad_128kbps"}
];
const reciterSelect = $("#reciterSelect");
RECITERS.forEach(r=>{
  const o = document.createElement("option");
  o.value = r.id; o.textContent = r.name;
  reciterSelect.appendChild(o);
});
reciterSelect.value = localStorage.getItem("tajweedy_reciter") || RECITERS[0].id;
reciterSelect.addEventListener("change",()=>{
  localStorage.setItem("tajweedy_reciter", reciterSelect.value);
  loadReference(); // reload with new reciter
});

// ====== Load Surahs & Ayahs (alquran.cloud) ======
const surahSelect = $("#surahSelect");
const ayahSelect  = $("#ayahSelect");
const ayahTextEl  = $("#ayahText");

async function loadSurahs(){
  surahSelect.innerHTML = "";
  const res = await fetch("https://api.alquran.cloud/v1/surah");
  const data = await res.json();
  data.data.forEach(s=>{
    const opt = document.createElement("option");
    opt.value = s.number; opt.textContent = `${s.number} — ${s.englishName}`.replace(" — "," — ");
    surahSelect.appendChild(opt);
  });
  surahSelect.value = "1";
  await loadAyahs(1);
}
async function loadAyahs(surahNum){
  ayahSelect.innerHTML = "";
  ayahTextEl.textContent = "";
  const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahNum}?edition=quran-uthmani`);
  const data = await res.json();
  data.data.ayahs.forEach((a,idx)=>{
    const o=document.createElement("option");
    o.value = a.numberInSurah;
    o.textContent = `${a.numberInSurah}`;
    ayahSelect.appendChild(o);
  });
  ayahSelect.value = "1";
  const firstAyah = data.data.ayahs[0]?.text || "";
  ayahTextEl.textContent = firstAyah;
  ayahSelect.onchange = ()=>{
    const n = parseInt(ayahSelect.value,10)-1;
    ayahTextEl.textContent = data.data.ayahs[n]?.text || "";
    loadReference();
  };
  surahSelect.onchange = async ()=>{
    await loadAyahs(parseInt(surahSelect.value,10));
    loadReference();
  };
}
loadSurahs();

// ====== Reference audio via EveryAyah ======
const refAudio = $("#referenceAudio");
function currentFolder(){
  const r = RECITERS.find(x=>x.id===reciterSelect.value);
  return r?.folder || RECITERS[0].folder;
}
function buildEveryAyahUrl(surah,ayah){
  return `https://everyayah.com/data/${currentFolder()}/${pad3(surah)}${pad3(ayah)}.mp3`;
}
function loadReference(){
  const s = parseInt(surahSelect.value||"1",10);
  const a = parseInt(ayahSelect.value||"1",10);
  const url = buildEveryAyahUrl(s,a);
  refAudio.src = url;
}
$("#playCorrectBtn").addEventListener("click",()=>{
  loadReference();
  refAudio.play().catch(()=>alert("تعذّر جلب الصوت من الخادم. جرّب قارئًا آخر."));
});

// ====== Recording ======
const micBtn = $("#micBtn");
const stopBtn= $("#stopBtn");
const playback = $("#playback");
let media, chunks=[];

micBtn.addEventListener("click", async ()=>{
  media = await navigator.mediaDevices.getUserMedia({audio:true});
  const rec = new MediaRecorder(media);
  chunks=[];
  rec.ondataavailable = e => chunks.push(e.data);
  rec.onstop = ()=>{
    const blob = new Blob(chunks,{type:"audio/webm"});
    playback.src = URL.createObjectURL(blob);
    $("#transcribeBtn").disabled = false;
    $("#toggleModeBtn").disabled = false;
    $("#copyTextBtn").disabled = false;
    $("#downloadTextBtn").disabled = false;
  };
  micBtn.disabled = true; stopBtn.disabled = false;
  stopBtn.onclick = ()=>{rec.stop(); media.getTracks().forEach(t=>t.stop()); stopBtn.disabled=true; micBtn.disabled=false;};
  rec.start();
});

// ====== Transcribe via Netlify function (POST) ======
let showJson = false;
$("#toggleModeBtn").onclick = ()=>{
  showJson = !showJson;
  renderTranscript();
};
let lastTranscript = { text:"", raw:null };

async function transcribe(){
  if(!playback.src){ alert("سجّل صوتًا أولاً."); return; }
  const resp = await fetch(playback.src);
  const blob = await resp.blob();
  const fd = new FormData();
  fd.append("audio", blob, "recording.webm");
  fd.append("language","ar");
  const r = await fetch("/.netlify/functions/transcribe", { method:"POST", body: fd });
  const j = await r.json();
  if(!j.ok){ $("#transcript").textContent = JSON.stringify(j,null,2); return; }
  lastTranscript.text = j.text || j.data?.text || "";
  lastTranscript.raw = j;
  renderTranscript();
}
$("#transcribeBtn").addEventListener("click", transcribe);

function renderTranscript(){
  const pre = $("#transcript");
  pre.textContent = showJson ? JSON.stringify(lastTranscript.raw||{},null,2) : (lastTranscript.text||"");
}
$("#copyTextBtn").onclick = ()=>{
  navigator.clipboard.writeText(lastTranscript.text||"");
};
$("#downloadTextBtn").onclick = ()=>{
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([lastTranscript.text||""],{type:"text/plain"}));
  a.download = "transcript.txt"; a.click();
};

// ====== Diagnostics ======
$("#diagBtn").onclick = async ()=>{
  const ping = await fetch("/.netlify/functions/transcribe", { method:"GET" });
  const jr = await ping.json();
  alert(`حالة المفتاح/الدالة: ${jr.hint || jr.message || ping.status}`);
};

// ====== Quiz (minimal demo with 5 items) ======
const BANK = {
  noon_tanween:[
    {q:"ما حكم التنوين؟ (المستهدف: عليهمۡ) — أَسْمِعْ عليهمْ", a:["إظهار","إدغام","إخفاء"], correct:0, why:"إظهار حلقي."},
    {q:"ما حكم النون الساكنة؟ (المستهدف: منۢ بعد) — منْ بعد", a:["إخفاء","إدغام بغير غنة","إظهار"], correct:0, why:"إخفاء عند الباء."},
    {q:"ما حكم التنوين؟ (المستهدف: غفورٌ رحيمٌ) — غفورٌ رحيمٌ", a:["إدغام بغنة","إظهار","إخفاء"], correct:0, why:"إدغام بغنة مع الراء؟ خطأ؛ الصحيح بغير غنة مع الراء. هنا المثال للتفريق."},
  ],
  meem_sakinah:[
    {q:"حكم (عليهمۡ بِ) ؟", a:["إظهار شفوي","إخفاء شفوي","إدغام شفوي"], correct:2, why:"ميم ساكنة بعدها باء = إخفاء شفوي."},
    {q:"حكم (لكمۡ مَّا) ؟", a:["إظهار شفوي","إدغام شفوي","إخفاء شفوي"], correct:1, why:"ميم ساكنة بعدها ميم = إدغام متماثلين صغير (شفوي)."},
  ],
  madd:[
    {q:"نوع المد في (جاء) ؟", a:["طبيعي","متصل","منفصل"], correct:1, why:"مد متصل: همز بعد المد في كلمة."},
    {q:"نوع المد في (بما أنزل) ؟", a:["منفصل","لازم","طبيعي"], correct:0, why:"مد منفصل: حرف مد آخر الكلمة وهمز أول التالية."},
  ]
};

const quizDiv = $("#quiz");
function buildQuiz(){
  const sec = $("#quizSection").value;
  const traineeName = $("#traineeName").value.trim() || "متدرب";
  const items = [...BANK[sec]];
  while(items.length>5) items.splice(Math.floor(Math.random()*items.length),1);
  quizDiv.innerHTML = "";
  items.forEach((it,idx)=>{
    const wrap = document.createElement("div"); wrap.className="q";
    wrap.innerHTML = `<p>${idx+1}. ${it.q}</p>`+
      it.a.map((opt,i)=>`<label class="opt"><input type="radio" name="q${idx}" value="${i}"> ${opt}</label>`).join("");
    quizDiv.appendChild(wrap);
  });
  const submit = document.createElement("button"); submit.textContent="إنهاء الاختبار";
  submit.onclick = ()=>{
    let score=0; let rows=[];
    items.forEach((it,idx)=>{
      const val = parseInt(($(`input[name="q${idx}"]:checked`, quizDiv)||{}).value || "-1",10);
      const ok = (val===it.correct); if(ok) score++;
      rows.push({q:it.q, your: it.a[val]||"—", correct: it.a[it.correct], why: it.why});
    });
    alert(`النتيجة: ${score} / ${items.length}`);
    const report = { traineeName, section: sec, date: new Date().toISOString(), rows, score, total: items.length };
    localStorage.setItem("tajweedy_last_report", JSON.stringify(report));
  };
  quizDiv.appendChild(submit);
}
$("#buildQuizBtn").addEventListener("click", buildQuiz);
$("#showLastReportBtn").addEventListener("click", ()=>{ location.href="report.html"; });

// Summary
$("#showSummaryBtn").onclick = ()=>{
  const r = JSON.parse(localStorage.getItem("tajweedy_last_report")||"null");
  $("#summary").textContent = r? `آخر نتيجة: ${r.traineeName} — ${r.score}/${r.total}` : "لا يوجد بيانات.";
};
$("#resetSummaryBtn").onclick = ()=>{ localStorage.removeItem("tajweedy_last_report"); $("#summary").textContent="تمت إعادة التعيين."; };
