
// === Utilities ===
const $ = (sel) => document.querySelector(sel);
const reciterSelect = $('#reciterSelect');
const surahSelect   = $('#surahSelect');
const ayahSelect    = $('#ayahSelect');
const ayahTextEl    = $('#ayahText');
const micBtn = $('#micBtn'), stopBtn = $('#stopBtn'), playback = $('#playback');
const transcribeBtn = $('#transcribeBtn'), transcriptPre = $('#transcript');
const toggleViewBtn = $('#toggleViewBtn'), copyTextBtn = $('#copyTextBtn'), downloadTextBtn = $('#downloadTextBtn');
const diagBtn = $('#diagBtn'), diagRecBtn = $('#diagRecBtn'), diagOut = $('#diagOut'), diagPlayback = $('#diagPlayback');
const playCorrectBtn = $('#playCorrectBtn'), referenceAudio = $('#referenceAudio');
const quizSection = $('#quizSection'), traineeName = $('#traineeName');
const buildQuizBtn = $('#buildQuizBtn'), buildFullQuizBtn = $('#buildFullQuizBtn'), showLastReportBtn = $('#showLastReportBtn');
const openExercisesBtn = $('#openExercisesBtn'), quizDiv = $('#quiz');
const showSummaryBtn = $('#showSummaryBtn'), resetSummaryBtn = $('#resetSummaryBtn');
const exportJsonBtn = $('#exportJsonBtn'), exportCsvBtn = $('#exportCsvBtn'), importJsonBtn = $('#importJsonBtn');
const darkToggle = $('#darkToggle');

// Dark mode toggle
darkToggle?.addEventListener('click',()=>{
  document.documentElement.classList.toggle('dark');
});

// === Reciters (direct sources; each maps to a known CDN pattern or playlist API) ===
const RECITERS = [
  { id:'alfasy', label:'مشاري العفاسي', base:'https://everyayah.com/data/Alafasy_64kbps/' },
  { id:'husr', label:'محمود خليل الحصري', base:'https://everyayah.com/data/Husary_64kbps_Mujawwad/' },
  { id:'minsh', label:'محمد صديق المنشاوي', base:'https://everyayah.com/data/Minshawy_Mujawwad_128kbps/' },
  { id:'basit_mj', label:'عبدالباسط (مجود)', base:'https://everyayah.com/data/Abdul_Basit_Mujawwad_128kbps/' },
  { id:'basit_mr', label:'عبدالباسط (مرتل)', base:'https://everyayah.com/data/Abdul_Basit_Murattal_64kbps/' },
  { id:'sudais', label:'السديس', base:'https://everyayah.com/data/Abdurrahmaan_As-Sudais_192kbps/' },
  { id:'shatri', label:'أبو بكر الشاطري', base:'https://everyayah.com/data/Abu_Bakr_Ash-Shaatree_128kbps/' }
];

// Populate reciters
function fillReciters(){
  reciterSelect.innerHTML = RECITERS.map((r,i)=>`<option value="${i}">${r.label}</option>`).join('');
}
fillReciters();

// Surahs list
const SURAHS = [
  "الفاتحة","البقرة","آل عمران","النساء","المائدة","الأنعام","الأعراف","الأنفال","التوبة","يونس",
  "هود","يوسف","الرعد","إبراهيم","الحجر","النحل","الإسراء","الكهف","مريم","طه","الأنبياء","الحج",
  "المؤمنون","النور","الفرقان","الشعراء","النمل","القصص","العنكبوت","الروم","لقمان","السجدة","الأحزاب",
  "سبأ","فاطر","يس","الصافات","ص","الزمر","غافر","فصلت","الشورى","الزخرف","الدخان","الجاثية","الأحقاف",
  "محمد","الفتح","الحجرات","ق","الذاريات","الطور","النجم","القمر","الرحمن","الواقعة","الحديد","المجادلة",
  "الحشر","الممتحنة","الصف","الجمعة","المنافقون","التغابن","الطلاق","التحريم","الملك","القلم","الحاقة",
  "المعارج","نوح","الجن","المزمل","المدثر","القيامة","الإنسان","المرسلات","النبأ","النازعات","عبس",
  "التكوير","الانفطار","المطففين","الانشقاق","البروج","الطارق","الأعلى","الغاشية","الفجر","البلد","الشمس",
  "الليل","الضحى","الشرح","التين","العلق","القدر","البينة","الزلزلة","العاديات","القارعة","التكاثر",
  "العصر","الهمزة","الفيل","قريش","الماعون","الكوثر","الكافرون","النصر","المسد","الإخلاص","الفلق","الناس"
];
function pad3(n){ return String(n).padStart(3,'0'); }

function fillSurahs(){
  surahSelect.innerHTML = '<option value="">— اختر —</option>' +
    SURAHS.map((name,i)=>`<option value="${i+1}">${i+1} — ${name}</option>`).join('');
}
fillSurahs();

// Fetch ayah count from a static table (to avoid remote API limits)
const AYAH_COUNTS = {1:7,2:286,3:200,4:176,5:120,6:165,7:206,8:75,9:129,10:109,11:123,12:111,13:43,14:52,15:99,16:128,17:111,18:110,19:98,20:135,21:112,22:78,23:118,24:64,25:77,26:227,27:93,28:88,29:69,30:60,31:34,32:30,33:73,34:54,35:45,36:83,37:182,38:88,39:75,40:85,41:54,42:53,43:89,44:59,45:37,46:35,47:38,48:29,49:18,50:45,51:60,52:49,53:62,54:55,55:78,56:96,57:29,58:22,59:24,60:13,61:14,62:11,63:11,64:18,65:12,66:12,67:30,68:52,69:52,70:44,71:28,72:28,73:20,74:56,75:40,76:31,77:50,78:40,79:46,80:42,81:29,82:19,83:36,84:25,85:22,86:17,87:19,88:26,89:30,90:20,91:15,92:21,93:11,94:8,95:8,96:19,97:5,98:8,99:8,100:11,101:11,102:8,103:3,104:9,105:5,106:4,107:7,108:3,109:6,110:3,111:5,112:4,113:5,114:6};

surahSelect.addEventListener('change', () => {
  const s = Number(surahSelect.value);
  if(!s){ ayahSelect.innerHTML=''; ayahTextEl.textContent=''; return; }
  const count = AYAH_COUNTS[s] || 1;
  ayahSelect.innerHTML = Array.from({length:count}, (_,i)=>`<option value="${i+1}">${i+1}</option>`).join('');
  loadAyahText(s,1);
});
ayahSelect.addEventListener('change', ()=>{
  const s = Number(surahSelect.value), a = Number(ayahSelect.value);
  if(s && a) loadAyahText(s,a);
});

// Load ayah text in Uthmani script via cdn.jsdelivr cached mushaf (lightweight local fallback if fails)
async function loadAyahText(surah, ayah){
  try{
    const url = `https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/quran-uthmani/${surah}/${ayah}.json`;
    const res = await fetch(url);
    if(!res.ok) throw new Error('fetch_fail');
    const j = await res.json();
    ayahTextEl.textContent = j.text || j.data?.text || '';
  }catch(e){
    ayahTextEl.textContent = 'نص الآية (عثماني)';
  }
}

// Reference audio based on everyayah file naming {SURA}{AYA}.mp3
function buildAyahAudioUrl(reciterIndex, surah, ayah){
  const r = RECITERS[reciterIndex]; if(!r) return null;
  return `${r.base}${pad3(surah)}${pad3(ayah)}.mp3`;
}
playCorrectBtn.addEventListener('click',()=>{
  const s = Number(surahSelect.value), a = Number(ayahSelect.value), r = Number(reciterSelect.value||0);
  if(!s||!a){ alert('اختر السورة والآية'); return; }
  const u = buildAyahAudioUrl(r,s,a);
  if(!u){ alert('تعذّر جلب الصوت من الخادم. جرّب قارئًا آخر.'); return; }
  referenceAudio.src = u; referenceAudio.play().catch(()=>alert('تعذّر تشغيل الصوت.'));
});

// MediaRecorder for recording
let mediaRecorder, chunks=[];
micBtn.addEventListener('click', async ()=>{
  const stream = await navigator.mediaDevices.getUserMedia({audio:true});
  mediaRecorder = new MediaRecorder(stream);
  chunks=[];
  mediaRecorder.ondataavailable = e=> chunks.push(e.data);
  mediaRecorder.onstop = e=>{
    const blob = new Blob(chunks,{type:'audio/webm'});
    playback.src = URL.createObjectURL(blob);
    transcribeBtn.disabled = false;
  };
  mediaRecorder.start();
  micBtn.disabled = true; stopBtn.disabled = false;
});
stopBtn.addEventListener('click', ()=>{
  try{ mediaRecorder?.stop(); }catch{}
  micBtn.disabled = false; stopBtn.disabled = true;
});

// Transcribe via Netlify Function
transcribeBtn.addEventListener('click', async ()=>{
  const src = playback.src;
  if(!src){ alert('سجّل أولًا'); return; }
  const blob = await (await fetch(src)).blob();
  const fd = new FormData();
  fd.append('file', blob, 'speech.webm');
  fd.append('language','ar');
  transcriptPre.dataset.mode = transcriptPre.dataset.mode || 'text';
  try{
    const r = await fetch('/.netlify/functions/transcribe', { method:'POST', body: fd });
    const j = await r.json();
    if(!j.ok){ transcriptPre.textContent = JSON.stringify(j,null,2); return; }
    transcriptPre.textContent = j.text;
    transcriptPre.dataset.raw = JSON.stringify(j,null,2);
  }catch(err){
    transcriptPre.textContent = String(err);
  }
});

// Toggle view
toggleViewBtn.addEventListener('click',()=>{
  const mode = (transcriptPre.dataset.mode = (transcriptPre.dataset.mode==='raw'?'text':'raw'));
  transcriptPre.textContent = mode==='raw' ? (transcriptPre.dataset.raw||'') : (transcriptPre.textContent||'');
});
copyTextBtn.addEventListener('click', async ()=>{
  await navigator.clipboard.writeText(transcriptPre.textContent||'');
  alert('تم النسخ.');
});
downloadTextBtn.addEventListener('click', ()=>{
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([transcriptPre.textContent||''], {type:'text/plain'}));
  a.download = 'transcript.txt'; a.click();
});

// Diagnostic buttons (simple pings)
diagBtn.addEventListener('click', async ()=>{
  try{
    const ping = await fetch('/.netlify/functions/transcribe');
    const t = await ping.text();
    diagOut.style.display='block'; diagOut.textContent = t.slice(0,800);
  }catch(e){ alert('تعذر الاتصال بالدالة'); }
});
diagRecBtn.addEventListener('click', async ()=>{
  // Make a 3s tone to test the pipeline (no mic permission needed)
  const ctx = new (window.AudioContext||window.webkitAudioContext)();
  const o = ctx.createOscillator(); o.frequency.value = 440;
  const d = ctx.createDynamicsCompressor(); o.connect(d).connect(ctx.destination); o.start();
  await new Promise(res=>setTimeout(res,3000)); o.stop();
  const dest = ctx.createMediaStreamDestination();
});

// Very small placeholder quiz to keep structure (full bank attaches separately in your repo)
buildQuizBtn.addEventListener('click',()=>{
  const q = quizSection.value;
  const q1 = (q==='madd')? 'ما المد المتصل؟' : (q==='meem_sakinah'?'ما الإخفاء الشفوي؟':'ما الإقلاب؟');
  quizDiv.innerHTML = `
  <div class="card" style="background:#fafafa">
    <p>١) ${q1}</p>
    <label><input type="radio" name="q1"> خيار ١</label>
    <label><input type="radio" name="q1"> خيار ٢</label>
    <label><input type="radio" name="q1"> خيار ٣</label>
    <div style="margin-top:8px"><button id="finishQuiz">إنهاء الاختبار</button></div>
  </div>`;
  $('#finishQuiz').onclick = ()=> alert('النتيجة: ١/١ (تجريبي)');
});

// Summary stubs
showSummaryBtn.addEventListener('click',()=>{
  $('#summary').innerHTML = '<div class="badge">لا توجد بيانات بعد</div>';
});
resetSummaryBtn.addEventListener('click',()=>{
  localStorage.clear(); alert('تمت إعادة التعيين.');
});
exportJsonBtn.addEventListener('click',()=>{
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify({progress:[]},null,2)],{type:'application/json'}));
  a.download = 'tajweedy-data.json'; a.click();
});
exportCsvBtn.addEventListener('click',()=>{
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['date,section,score\n'],{type:'text/csv'}));
  a.download = 'tajweedy-data.csv'; a.click();
});
importJsonBtn.addEventListener('click',()=>alert('استيراد JSON: ارفع لاحقًا من لوحة المعلومات.'));
