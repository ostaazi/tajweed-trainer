
// === Utilities ===
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const el = (h) => {
  const t = document.createElement('template'); t.innerHTML = h.trim();
  return t.content.firstElementChild;
};
const clamp = (x,a,b)=>Math.max(a,Math.min(b,x));

// === State ===
let QUESTIONS = []; // loaded from questions_bank.json
let PAPER = [];     // selected questions for current test

// Load bank
async function loadBank(){
  const res = await fetch('questions_bank.json', {cache:'no-cache'});
  const j = await res.json();
  QUESTIONS = j;
}

// Uthmani text integration
let QURAN_UTH = null;
async function loadUthmani(){
  if(QURAN_UTH) return QURAN_UTH;
  try{
    const r = await fetch('quran_uthmani.json', {cache:'no-cache'});
    if(r.ok){ QURAN_UTH = await r.json(); return QURAN_UTH; }
  }catch(e){}
  QURAN_UTH = null; // fall back to API
  return null;
}
function normalizeArabic(s){
  if(!s) return '';
  return s.replace(/[ًٌٍَُِّْـۚۛۗۘۙۚۖۜ۝۞۟۠ۡۢۤ]/g,'').replace(/[ٰ]/g,'').replace(/\s+/g,' ').trim();
}
function getAyahByRef(uth, ref){
  if(!uth || !ref) return null;
  const m = String(ref).match(/^(\d+):(\d+)$/);
  if(!m) return null;
  const s=m[1], a=m[2];
  return uth[s] && uth[s][a] ? uth[s][a] : null;
}
async function getAyahFromAPI(ref, fallbackText){
  const m = String(ref||'').match(/^(\d+):(\d+)$/);
  if(!m) return null;
  const s=m[1], a=m[2];
  try{
    const u = `https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${s}`;
    const r = await fetch(u);
    const j = await r.json();
    const v = (j.verses||[]).find(v => String(v.verse_key) === `${s}:${a}`);
    return v ? (v.text_uthmani || v.text) : (fallbackText||null);
  }catch(e){ return fallbackText||null; }
}
function findAyahByText(uth, plain){
  if(!uth || !plain) return null;
  const target = normalizeArabic(plain);
  let best=null, bestLen=0;
  for(const s in uth){
    const surah=uth[s];
    for(const a in surah){
      const txt=surah[a];
      const norm=normalizeArabic(txt);
      if(norm.includes(target) || target.includes(norm)){
        if(norm.length>bestLen){ best=txt; bestLen=norm.length; }
      }
    }
  }
  return best;
}
function highlightTargetWord(ayahText, targetWord){
  if(!targetWord) return ayahText;
  const escaped = targetWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'g');
  return ayahText.replace(regex, `<span class="target-word">$1</span>`);
}
async function replaceAyahInStem(stem, ref, targetWord){
  const m = (stem||'').match(/\{([^}]+)\}/);
  if(!m) return stem;
  const bracketText = m[1];
  const uth = await loadUthmani();
  let ay=null;
  if(ref){
    ay = uth ? getAyahByRef(uth, ref) : null;
    if(!ay) ay = await getAyahFromAPI(ref, null);
  }
  if(!ay){
    ay = uth ? findAyahByText(uth, bracketText) : null;
    if(!ay) ay = bracketText; // fallback to given text
  }
  const highlighted = highlightTargetWord(ay, targetWord||null);
  return stem.replace(m[0], `<span class="ayah">${highlighted}</span>`);
}

// === UI ===
const sumTarget = $('#sumTarget');
const totalRange = $('#totalRange');
const totalQ = $('#totalQ');

function getTotal(){ return clamp(Number(totalQ.value||20),5,100); }
function syncTargets(){
  const T=getTotal();
  sumTarget.textContent=T;
  totalRange.value=T;
}
function onTotalChange(v){
  totalQ.value=v; syncTargets();
}
totalRange?.addEventListener('input', e=> onTotalChange(e.target.value));

// Build paper
async function buildPaper(qs){
  const list = $('#list');
  list.innerHTML = '';
  for(let i=0;i<qs.length;i++){
    const q = qs[i];
    const choices = (q.options || q.choices || []).map((c,ci)=>`<label><input type="radio" name="q${i}" value="${ci}"> ${c}</label>`).join("");
    const stem0 = q.stem || q.question || '';
    const stemU = await replaceAyahInStem(stem0, q.ref || q.ayahRef || null, q.targetWord || null);
    const node = el(`
      <div class="q" data-i="${i}" data-ans="${q.answer}" style="border-bottom:1px solid var(--ring);padding:12px 0">
        <h4 style="margin:0 0 8px 0">${i+1}. ${stemU}</h4>
        <div class="choices">${choices}</div>
        <div class="muted explain" style="margin-top:6px;display:none"></div>
      </div>`);
    list.append(node);
  }
}

// Scoring
function gradePaper(){
  const items = $$('#list .q');
  let right=0;
  items.forEach(wrap=>{
    const i = Number(wrap.dataset.i);
    const q = PAPER[i];
    const sel = wrap.querySelector('input[type="radio"]:checked');
    const expEl = wrap.querySelector('.explain');
    if(sel){
      const p = Number(sel.value), c = Number(q.answer);
      if(p===c){
        right++; sel.closest('label').style.background='#e8f7f0'; if(expEl) expEl.style.display='none';
      }else{
        sel.closest('label').style.background='#fff1f2';
        const corr = wrap.querySelector(`input[value="${c}"]`);
        if(corr) corr.closest('label').style.background='#e8f7f0';
        if(expEl){ const note = q.explain || q.note || ''; expEl.textContent = note ? ('تغذية راجعة: ' + note) : ''; expEl.style.display = note ? 'block' : 'none'; }
      }
    }
  });
  $('#result').innerHTML = `<strong>النتيجة:</strong> ${right} / ${PAPER.length}`;
}

// Selectors
function pickRandom(arr, n){
  const a=[...arr]; const out=[];
  while(out.length<n && a.length){
    const k=Math.floor(Math.random()*a.length);
    out.push(a.splice(k,1)[0]);
  }
  return out;
}
function bySection(sec){
  return QUESTIONS.filter(q=> (q.section||q.category||'').toLowerCase().includes(sec));
}

// Start buttons
$('#btnShort')?.addEventListener('click', async ()=>{
  await loadBank();
  const sec = $('#sectionSelect').value; // noon/meem/madd
  const pool = bySection(sec);
  const take = Math.min(5, pool.length||5);
  PAPER = pickRandom(pool, take);
  await buildPaper(PAPER);
  window.scrollTo({top: document.body.scrollHeight, behavior:'smooth'});
});

$('#btnComprehensive')?.addEventListener('click', async ()=>{
  await loadBank();
  const T = getTotal();
  // Simple even split (can be replaced by your tri-slider logic):
  const each = Math.max(1, Math.floor(T/3));
  const extra = T - each*3;
  const n = each + (extra>0?1:0);
  const m = each + (extra>1?1:0);
  const d = each;
  const noon = pickRandom(bySection('noon'), n);
  const meem = pickRandom(bySection('meem'), m);
  const madd = pickRandom(bySection('madd'), d);
  PAPER = [...noon, ...meem, ...madd];
  PAPER = pickRandom(PAPER, T); // ensure exact length
  await buildPaper(PAPER);
  window.scrollTo({top: document.body.scrollHeight, behavior:'smooth'});
});

$('#btnGrade')?.addEventListener('click', gradePaper);

// Init
syncTargets();
