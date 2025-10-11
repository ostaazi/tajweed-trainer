
const $ = (sel)=>document.querySelector(sel);
function toggleTheme(){
  const d=document.documentElement;
  d.dataset.theme = d.dataset.theme==='dark' ? '' : 'dark';
}
const RECITERS = [
  { id:'mishari',  label:'مشاري العفاسي' },
  { id:'husary',   label:'محمود خليل الحصري' },
  { id:'minshawi', label:'محمد صديق المنشاوي' },
  { id:'abdlbasit_muj', label:'عبدالباسط (مجود)' }
];
let quranMeta = null;
async function loadQuranMeta(){
  if(quranMeta) return quranMeta;
  quranMeta = await fetch('https://cdn.jsdelivr.net/gh/quran/quran-json@master/dist/chapters.json').then(r=>r.json()).catch(()=>[]);
  return quranMeta;
}
async function fillSurahs(){
  const surahSel = $('#surahSelect');
  surahSel.innerHTML = '<option disabled selected>— اختر —</option>';
  const chapters = await loadQuranMeta();
  chapters.forEach(ch=>{
    const opt=document.createElement('option');
    opt.value = ch.id;
    opt.textContent = `${ch.id} — ${ch.name_arabic}`;
    surahSel.appendChild(opt);
  });
}
function fillReciters(){
  const rSel = $('#reciterSelect'); rSel.innerHTML='';
  RECITERS.forEach(r=>{
    const opt=document.createElement('option'); opt.value=r.id; opt.textContent=r.label; rSel.appendChild(opt);
  });
}
async function fillAyahs(surahId){
  const aSel = $('#ayahSelect'); aSel.innerHTML='';
  let count = 7;
  try{
    const meta = await fetch(`https://cdn.jsdelivr.net/gh/rn0x/quran-json@main/meta/ayah-count.json`).then(r=>r.json());
    count = meta[String(surahId)] || count;
  }catch(e){}
  for(let i=1;i<=count;i++){
    const opt=document.createElement('option'); opt.value=i; opt.textContent=`${i}`; aSel.appendChild(opt);
  }
  aSel.dispatchEvent(new Event('change'));
}
async function loadAyahText(surah, ayah){
  try{
    const url = `https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/quran-uthmani`;
    const r = await fetch(url).then(r=>r.json());
    if(r && r.data && r.data.text){ $('#ayahText').textContent = r.data.text; return; }
  }catch(e){}
  $('#ayahText').textContent = '';
}
async function playReference(){
  const s = $('#surahSelect').value;
  const a = $('#ayahSelect').value;
  const audio = $('#referenceAudio');
  try{
    const url = `https://api.alquran.cloud/v1/ayah/${s}:${a}/ar.alafasy`;
    const r = await fetch(url).then(r=>r.json());
    if(r && r.data && r.data.audio){ audio.src = r.data.audio; await audio.play(); return; }
  }catch(e){}
  alert('تعذّر جلب الصوت من الخادم. جرّب قارئًا آخر.');
}
let media, chunks=[];
const playback = $('#playback');
async function startRec(){
  try{
    media = await navigator.mediaDevices.getUserMedia({audio:true});
    const rec = new MediaRecorder(media);
    chunks = [];
    rec.ondataavailable = (e)=>{ if(e.data.size>0) chunks.push(e.data); };
    rec.onstop = ()=> {
      const blob = new Blob(chunks, {type:'audio/webm'});
      playback.src = URL.createObjectURL(blob);
      $('#transcribeBtn').disabled = false;
    };
    rec.start(); $('#micBtn').disabled = true; $('#stopBtn').disabled = false; window._rec = rec;
  }catch(e){ alert('تعذّر الوصول للميكروفون: '+e.message); }
}
function stopRec(){
  try{ window._rec?.stop(); media?.getTracks()?.forEach(t=>t.stop()); }
  finally{ $('#micBtn').disabled = false; $('#stopBtn').disabled = true; }
}
async function transcribe(){
  const out = $('#transcript'); out.textContent = '... جاري التفريغ';
  const blob = await (await fetch(playback.src)).blob();
  const fd = new FormData(); fd.append('file', blob, 'rec.webm'); fd.append('language','ar');
  try{
    const res = await fetch('/.netlify/functions/transcribe', {method:'POST', body:fd});
    const txt = await res.text();
    try{ const j=JSON.parse(txt); out.dataset.json = JSON.stringify(j,null,2); out.textContent = j.text || '(لا يوجد نص)'; }
    catch(e){ out.textContent = txt; }
  }catch(e){ out.textContent = 'فشل التفريغ: '+e.message; }
}
function saveAttempt(section, rule, correct, wrong){
  const k='tajweedy_attempts'; let arr=[]; try{ arr=JSON.parse(localStorage.getItem(k))||[] }catch(e){}; 
  arr.push({section, rule, correct, wrong, at:new Date().toISOString()}); localStorage.setItem(k, JSON.stringify(arr));
}
const DUMMY_BANK = {
  noon_tanween:[
    {q:'حكم (مِنْ و)؟', opts:['إظهار','إدغام بغنة','إقلاب','إخفاء'], a:1, r:'إدغام بغنة إذا جاء بعد النون/التنوين أحد حروف ينمو.'},
    {q:'حكم (غفورٌ رحيمٌ)؟', opts:['إظهار','إدغام بغير غنة','إقلاب','إخفاء'], a:1, r:'الراء واللام إدغام بغير غنة.'},
    {q:'حكم (مِنْ بَعْد)؟', opts:['إظهار','إقلاب','إخفاء','إدغام'], a:2, r:'الإخفاء مع 15 حرفًا، منها الباء.'}
  ],
  meem_sakinah:[
    {q:'حكم (عليهم م)؟', opts:['إدغام شفوي','إخفاء شفوي','إظهار شفوي'], a:0, r:'يدغم الميمان عند التلاقي.'},
    {q:'حكم (عليهمْ ب)؟', opts:['إظهار شفوي','إخفاء شفوي','إدغام شفوي'], a:1, r:'إخفاء عند الباء.'}
  ],
  madd:[
    {q:'مد (جاء)؟', opts:['طبيعي','منفصل','متصل','لازم'], a:2, r:'الهمزة بعد المد في نفس الكلمة ⇒ متصل.'},
    {q:'مد (بما أنزل)؟', opts:['منفصل','طبيعي','متصل','لازم'], a:0, r:'المد في آخر كلمة والهمزة في أول التي تليها.'}
  ]
};
function buildQuiz(){
  const section = $('#quizSection').value;
  const bank = DUMMY_BANK[section]||[];
  const picked = bank.slice(0,5);
  const wrap = $('#quiz');
  if(!picked.length){ wrap.innerHTML='<div class="muted">لا أسئلة تجريبية.</div>'; return; }
  const trainee = $('#traineeName').value||'';
  let correct=0;
  wrap.innerHTML = picked.map((x,i)=>`
    <div style="border:1px solid var(--ring);border-radius:12px;padding:10px;margin-bottom:8px">
      <div><strong>س${i+1}.</strong> ${x.q}</div>
      ${x.opts.map((o,idx)=>`
        <div><label><input type="radio" name="q${i}" value="${idx}"> ${o}</label></div>
      `).join('')}
      <div class="muted" style="margin-top:6px">${x.r}</div>
    </div>
  `).join('') + `<button class="btn" id="submitQuiz">إنهاء الاختبار</button>`;

  $('#submitQuiz').onclick = ()=>{
    const items=[]; correct=0;
    picked.forEach((x,i)=>{
      const sel = document.querySelector(`input[name="q${i}"]:checked`);
      const chosen = sel?Number(sel.value):-1;
      const ok = chosen===x.a;
      if(ok) correct++;
      items.push({
        no:i+1, question:x.q, options:x.opts, chosen: x.opts[chosen] ?? '—',
        answer:x.opts[x.a], isCorrect:ok, rationale:x.r
      });
    });
    saveAttempt(section,'اختبار قصير',correct,(picked.length-correct));
    const report = {
      traineeName: trainee,
      sectionLabel: $('#quizSection').selectedOptions[0].textContent,
      score: {correct, total:picked.length},
      takenAt: new Date().toISOString(),
      items
    };
    localStorage.setItem('tajweedy_last_report', JSON.stringify(report));
    alert(`النتيجة: ${correct} / ${picked.length}`);
    location.href='report.html';
  };
}
let showJSON=false;
function toggleMode(){
  showJSON = !showJSON;
  const out = $('#transcript');
  if(showJSON && out.dataset.json){ out.textContent = out.dataset.json; }
  else if(out.dataset.json){
    try{ out.textContent = JSON.parse(out.dataset.json).text || '(لا يوجد نص)'; }catch(e){}
  }
}
function copyTranscript(){
  const out = $('#transcript'); const txt = out.textContent || '';
  navigator.clipboard?.writeText(txt).then(()=>alert('تم النسخ')).catch(()=>alert('تعذّر النسخ'));
}
function downloadTranscript(){
  const out = $('#transcript');
  const blob = new Blob([out.textContent||''], {type:'text/plain;charset=utf-8'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'transcript.txt'; a.click(); URL.revokeObjectURL(a.href);
}
document.addEventListener('DOMContentLoaded', ()=>{
  fillReciters(); fillSurahs();
  $('#surahSelect').addEventListener('change', (e)=> fillAyahs(e.target.value));
  $('#ayahSelect').addEventListener('change', ()=> {
    const s=$('#surahSelect').value, a=$('#ayahSelect').value;
    if(s && a) loadAyahText(s,a);
  });
  $('#playCorrectBtn').addEventListener('click', playReference);
  $('#micBtn').addEventListener('click', startRec);
  $('#stopBtn').addEventListener('click', stopRec);
  $('#transcribeBtn').addEventListener('click', transcribe);
  $('#buildQuizBtn').addEventListener('click', buildQuiz);
  $('#toggleModeBtn').addEventListener('click', toggleMode);
  $('#copyTxtBtn').addEventListener('click', copyTranscript);
  $('#dlTxtBtn').addEventListener('click', downloadTranscript);
  $('#playback').addEventListener('loadeddata', ()=> $('#transcribeBtn').disabled=false );
});
