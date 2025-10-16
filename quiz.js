
// === Helpers ===
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const el = (h) => { const t=document.createElement('template'); t.innerHTML=h.trim(); return t.content.firstElementChild; };
const clamp = (x,a,b)=>Math.max(a,Math.min(b,x));

let QUESTIONS = [];
let PAPER = [];

// === Load bank (robust path: try relative then absolute repo path) ===
async function loadBank(){
  if (QUESTIONS.length) return;
  const candidates = ['./questions_bank.json', '/tajweed-trainer/questions_bank.json'];
  let data = null;
  for (const url of candidates){
    try{
      const res = await fetch(url, { cache:'no-cache' });
      if (!res.ok) continue;
      data = await res.json();
      break;
    }catch(e){ /* try next */ }
  }
  if (!data){
    alert('تعذر تحميل questions_bank.json — تأكد من وجوده بجانب الصفحة أو في جذر المستودع.');
    return;
  }
  QUESTIONS = Array.isArray(data) ? data : (data.questions || data.items || data.data || []);
  if (!Array.isArray(QUESTIONS) || !QUESTIONS.length){
    alert('لم أجد مصفوفة أسئلة صالحة داخل questions_bank.json');
    QUESTIONS = [];
  }
}

// === Uthmani helpers ===
let QURAN_UTH = null;
async function loadUthmani(){
  if(QURAN_UTH) return QURAN_UTH;
  try{ const r=await fetch('quran_uthmani.json',{cache:'no-cache'}); if(r.ok){ QURAN_UTH = await r.json(); return QURAN_UTH; } }catch(e){}
  return null;
}
function normalizeArabic(s){ if(!s) return ''; return s.replace(/[ًٌٍَُِّْـۚۛۗۘۙۚۖۜ۝۞۟۠ۡۢۤ]/g,'').replace(/[ٰ]/g,'').replace(/\s+/g,' ').trim(); }
function getAyahByRef(uth, ref){ const m=String(ref||'').match(/^(\d+):(\d+)$/); if(!m||!uth) return null; const s=m[1],a=m[2]; return uth[s]&&uth[s][a]?uth[s][a]:null; }
async function getAyahFromAPI(ref, fb){ const m=String(ref||'').match(/^(\d+):(\d+)$/); if(!m) return fb||null; const s=m[1],a=m[2]; try{ const u=`https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${s}`; const r=await fetch(u); const j=await r.json(); const v=(j.verses||[]).find(v=>String(v.verse_key)===`${s}:${a}`); return v?(v.text_uthmani||v.text):(fb||null); }catch(e){ return fb||null; } }
function findAyahByText(uth, plain){ if(!uth||!plain) return null; const t=normalizeArabic(plain); let best=null,len=0; for(const s in uth){ for(const a in uth[s]){ const txt=uth[s][a]; const n=normalizeArabic(txt); if(n.includes(t)||t.includes(n)){ if(n.length>len){best=txt;len=n.length;} } } } return best; }
function highlightTargetWord(text, target){ if(!target) return text; const esc=target.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); const re=new RegExp(`(${esc})`,'g'); return text.replace(re, `<span class="target-word">$1</span>`); }
async function replaceAyahInStem(stem, ref, target){ const m=(stem||'').match(/\{([^}]+)\}/); if(!m) return stem; const within=m[1]; const uth=await loadUthmani(); let ay=null; if(ref){ ay=uth?getAyahByRef(uth,ref):null; if(!ay) ay=await getAyahFromAPI(ref,null); } if(!ay){ ay=uth?findAyahByText(uth,within):null; if(!ay) ay=within; } const hi=highlightTargetWord(ay,target||null); return stem.replace(m[0], `<span class="ayah">${hi}</span>`); }

// === Totals ===
const sumTarget = $('#sumTarget'), totalRange=$('#totalRange'), totalQ=$('#totalQ');
function getTotal(){ return Math.max(5, Math.min(100, Number(totalQ.value||20))); }
function syncTargets(){ const T=getTotal(); sumTarget.textContent=T; totalRange.value=T; }
function onTotalChange(v){ totalQ.value=v; syncTargets(); triLayout(); }
totalRange?.addEventListener('input', e=> onTotalChange(e.target.value));

// === Tri slider ===
const tri = {
  wrap: document.getElementById('triBar'),
  segNoon: null, segMeem: null, segMadd: null,
  h1: document.getElementById('h1'), h2: document.getElementById('h2'),
  pctNoon: document.getElementById('pctNoon'),
  pctMeem: document.getElementById('pctMeem'),
  pctMadd: document.getElementById('pctMadd'),
  x1: 33, x2: 66,
  showCounts: false
};
function triLayout(){
  const a=Math.min(tri.x1,tri.x2), b=Math.max(tri.x1,tri.x2);
  tri.segNoon.style.left='0%'; tri.segNoon.style.width=`${a}%`;
  tri.segMeem.style.left=`${a}%`; tri.segMeem.style.width=`${b-a}%`;
  tri.segMadd.style.left=`${b}%`; tri.segMadd.style.width=`${100-b}%`;
  tri.h1.style.left=`calc(${a}% - 7px)`; tri.h2.style.left=`calc(${b}% - 7px)`;
  const T=getTotal(); const n=Math.round(a*T/100), m=Math.round((b-a)*T/100), d=Math.max(0,T-n-m);
  const counts=[n,m,d], pcts=[a,(b-a),(100-b)].map(x=>Math.round(x));
  [tri.pctNoon,tri.pctMeem,tri.pctMadd].forEach((el,i)=> el.textContent = tri.showCounts? counts[i] : `${pcts[i]}%`);
}
function triCounts(){
  const T=getTotal(); const a=Math.min(tri.x1,tri.x2), b=Math.max(tri.x1,tri.x2);
  let n=Math.round(a*T/100), m=Math.round((b-a)*T/100), d=Math.max(0,T-n-m);
  return {n,m,d,T};
}
function triInit(){
  tri.segNoon=$('#triBar .seg-noon'); tri.segMeem=$('#triBar .seg-meem'); tri.segMadd=$('#triBar .seg-madd');
  $('#triBar').addEventListener('click',(e)=>{ if(e.target.classList.contains('handle')) return; tri.showCounts=!tri.showCounts; triLayout(); });
  let dragging=null;
  const onDown=e=>{ dragging=e.target.id; document.body.style.userSelect='none'; };
  const onUp=()=>{ dragging=null; document.body.style.userSelect=''; };
  const onMove=x=>{ if(!dragging) return; const r=tri.wrap.getBoundingClientRect(); const pct=Math.max(0,Math.min(100,(x-r.left)/r.width*100)); if(dragging==='h1') tri.x1=pct; else tri.x2=pct; triLayout(); };
  tri.h1.addEventListener('mousedown',onDown); tri.h2.addEventListener('mousedown',onDown);
  window.addEventListener('mouseup',onUp); window.addEventListener('mousemove',e=>onMove(e.clientX));
  tri.h1.addEventListener('touchstart',onDown,{passive:true}); tri.h2.addEventListener('touchstart',onDown,{passive:true});
  window.addEventListener('touchend',onUp,{passive:true}); window.addEventListener('touchmove',e=>onMove(e.touches[0].clientX),{passive:true});
  document.getElementById('totalRange')?.addEventListener('input', triLayout);
  triLayout();
}
document.addEventListener('DOMContentLoaded', triInit);

// === Section match (Arabic/English) ===
const SECTION_MAP = {
  noon: ['noon','النون','النون الساكنة','التنوين','النون الساكنة والتنوين'],
  meem: ['meem','الميم','الميم الساكنة'],
  madd: ['madd','المد','المدود','أحكام المد','أحكام المدود']
};
function bySection(key){
  const needles = (SECTION_MAP[key] || [key]).map(s => String(s).toLowerCase());
  return QUESTIONS.filter(q => {
    const sec  = String(q.section || q.category || q.group || '').toLowerCase();
    const tags = Array.isArray(q.tags) ? q.tags.map(t => String(t).toLowerCase()) : [];
    return needles.some(n => sec.includes(n) || tags.includes(n));
  });
}

function pickRandom(arr,n){ const a=[...arr]; const out=[]; while(out.length<n && a.length){ const k=Math.floor(Math.random()*a.length); out.push(a.splice(k,1)[0]); } return out; }

// === Build & grade ===
async function buildPaper(qs){
  const list=$('#list'); list.innerHTML='';
  for(let i=0;i<qs.length;i++){
    const q=qs[i];
    const choices=(q.options||[]).map((c,ci)=>`<label><input type="radio" name="q${i}" value="${ci}"> ${c}</label>`).join("");
    const stem0=q.stem||'';
    const stemU=await replaceAyahInStem(stem0, q.ref||null, q.targetWord||null);
    const node=el(`<div class="q" data-i="${i}" data-ans="${q.answer}" style="border-bottom:1px solid var(--ring);padding:12px 0">
      <h4 style="margin:0 0 8px 0">${i+1}. ${stemU}</h4>
      <div class="choices">${choices}</div>
      <div class="muted explain" style="margin-top:6px;display:none"></div>
    </div>`);
    list.append(node);
  }
  window.scrollTo({ top: document.body.scrollHeight, behavior:'smooth' });
}

function gradePaper(){
  const items=$$('#list .q'); let right=0;
  items.forEach(wrap=>{
    const sel=wrap.querySelector('input[type="radio"]:checked'); const expEl=wrap.querySelector('.explain');
    if(sel){
      const p=Number(sel.value), c=Number(wrap.dataset.ans);
      if(p===c){ right++; sel.closest('label').style.background='#e8f7f0'; if(expEl) expEl.style.display='none'; }
      else{ sel.closest('label').style.background='#fff1f2'; const corr=wrap.querySelector(`input[value="${c}"]`); if(corr) corr.closest('label').style.background='#e8f7f0'; if(expEl){ const note=''; expEl.textContent=note; expEl.style.display = note?'block':'none'; } }
    }
  });
  $('#result').innerHTML=`<strong>النتيجة:</strong> ${right} / ${PAPER.length}`;
}

// === Buttons ===
$('#btnShort')?.addEventListener('click', async ()=>{
  await loadBank();
  const sec=$('#sectionSelect').value;
  const pool=bySection(sec);
  if(!pool.length){ alert('لا توجد أسئلة في هذا القسم.'); return; }
  PAPER=pickRandom(pool, Math.min(5, pool.length));
  await buildPaper(PAPER);
});

document.getElementById('btnComprehensive')?.addEventListener('click', async ()=>{
  await loadBank();
  const {n,m,d,T}=triCounts();
  const noon=pickRandom(bySection('noon'), n);
  const meem=pickRandom(bySection('meem'), m);
  const madd=pickRandom(bySection('madd'), d);
  let paper=[...noon, ...meem, ...madd];
  if(paper.length<T) paper=[...paper, ...pickRandom(QUESTIONS, T-paper.length)];
  if(!paper.length){ alert('لا توجد أسئلة في بنك الأسئلة.'); return; }
  PAPER=pickRandom(paper, T);
  await buildPaper(PAPER);
});

document.getElementById('btnGrade')?.addEventListener('click', gradePaper);

// Init totals
syncTargets();
