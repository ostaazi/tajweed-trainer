// ===== أدوات صغيرة =====
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const el = (h) => { const t=document.createElement('template'); t.innerHTML=h.trim(); return t.content.firstElementChild; };
const clamp = (x,a,b)=>Math.max(a,Math.min(b,x));

let QUESTIONS = [];
let PAPER = [];

// ===== التحميل مع دعم البنية المتشعّبة v3 أو مصفوفة مسطّحة =====
async function loadBank(){
  if (QUESTIONS.length) return;

  const candidates = [
    './questions_bank.json',
    '/tajweed-trainer/questions_bank.json',
    'https://ostaazi.github.io/tajweed-trainer/questions_bank.json'
  ];

  let data = null, used = null, lastErr = null;
  for (const url of candidates){
    try{
      const res = await fetch(url, { cache:'no-cache' });
      if (!res.ok) { lastErr = 'HTTP '+res.status; continue; }
      data = await res.json();
      used = url;
      break;
    }catch(e){ lastErr = e; }
  }

  if (!data){
    alert('تعذر تحميل questions_bank.json');
    console.error('loadBank error:', lastErr);
    return;
  }

  if (Array.isArray(data)){
    // إذا كان مسطّحًا أصلًا
    QUESTIONS = data;
  } else {
    // تحويل v3 المتشعّبة إلى مصفوفة
    QUESTIONS = flattenV3ToArray(data);
  }

  if (!Array.isArray(QUESTIONS) || !QUESTIONS.length){
    alert('ملف بنك الأسئلة لا يحتوي مصفوفة صالحة.');
    console.error('Invalid bank shape. Sample:', data);
    QUESTIONS = [];
    return;
  }

  const diag = document.getElementById('diag');
  if (diag) diag.innerHTML = `تم التحميل: <b>${QUESTIONS.length}</b> سؤالًا`;
  console.log('Loaded questions:', QUESTIONS.length, 'from', used);
}

// ===== محوّل v3 المتشعّبة → مصفوفة مسطّحة =====
function flattenV3ToArray(obj){
  const out = [];
  if (!obj || !obj.sections || typeof obj.sections !== 'object') return out;

  const SECTION_TITLES = {
    "noon_tanween": "النون الساكنة والتنوين",
    "meem_sakinah": "الميم الساكنة",
    "ahkam_al_mudood": "أحكام المدود"
  };

  const PART_TITLES = {
    "idhar_halaqi": "الإظهار الحلقي",
    "idgham_with_ghunnah": "الإدغام بغنة",
    "idgham_without_ghunnah": "الإدغام بغير غنة",
    "ikhfa": "الإخفاء",
    "iqlab": "الإقلاب",
    "idhar_shafawi": "الإظهار الشفوي",
    "idgham_shafawi": "الإدغام الشفوي",
    "ikhfa_shafawi": "الإخفاء الشفوي",
    "madd_tabii": "المد الطبيعي",
    "madd_muttasil": "المد المتصل",
    "madd_munfasil": "المد المنفصل",
    "madd_lazim": "المد اللازم"
  };

  const OPTS_NOON_MEEM = ["إظهار","إدغام","إخفاء","إقلاب"];
  const OPTS_MADD      = ["مد طبيعي","مد متصل","مد منفصل","مد لازم"];

  const normalizeAnswer = (options, rawAns) => {
    // 1..4 → 0..3
    if (typeof rawAns === 'number' && Number.isFinite(rawAns)){
      let idx = rawAns - 1;
      return Math.max(0, Math.min(options.length - 1, idx));
    }
    // إن كانت الإجابة نصًا يطابق أحد الخيارات
    if (typeof rawAns === 'string'){
      const i = options.indexOf(rawAns.trim());
      if (i >= 0) return i;
    }
    return 0;
  };

  for (const [secKey, secVal] of Object.entries(obj.sections)){
    const sectionTitle = secVal?.title || SECTION_TITLES[secKey] || secKey;
    const parts = secVal?.parts || {};

    for (const [partKey, qArr] of Object.entries(parts)){
      const partTitle = PART_TITLES[partKey] || partKey.replace(/_/g,' ');
      const isMadd = (secKey === 'ahkam_al_mudood');

      (Array.isArray(qArr) ? qArr : []).forEach(q => {
        if (!q || typeof q !== 'object') return;

        let options = Array.isArray(q.options) && q.options.length
          ? q.options.slice()
          : (isMadd ? OPTS_MADD.slice() : OPTS_NOON_MEEM.slice());

        const stem = q.stem || q.question || "";

        const answerIdx = normalizeAnswer(options, q.answer);

        out.push({
          section: sectionTitle,
          part: partTitle,
          qnum: q.qnum || null,
          stem,
          options,
          answer: answerIdx,
          explain: q.explain || "",
          ref: q.ref || null,
          targetWord: q.targetWord || q.target || null
        });
      });
    }
  }
  return out;
}

// ===== مساعدو الرسم العثماني (اختياري) =====
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

// ===== منزلق الإجمالي (5–100) + المنزلق الثلاثي =====
const sumTarget = $('#sumTarget'), totalRange=$('#totalRange'), totalQ=$('#totalQ');
const tri = { wrap: $('#triBar'), segNoon:null, segMeem:null, segMadd:null, h1:$('#h1'), h2:$('#h2'), pctNoon:$('#pctNoon'), pctMeem:$('#pctMeem'), pctMadd:$('#pctMadd'), x1:33, x2:66, showCounts:false };
function getTotal(){ return Math.max(5, Math.min(100, Number(totalQ.value||20))); }
function syncTargets(){ const T=getTotal(); sumTarget.textContent=T; totalRange.value=T; }
function onTotalChange(v){ totalQ.value=v; syncTargets(); triLayout(); }
totalRange?.addEventListener('input', e=> onTotalChange(e.target.value));

function triLayout(){
  const a=Math.min(tri.x1,tri.x2), b=Math.max(tri.x1,tri.x2);
  tri.segNoon = tri.segNoon || $('#triBar .seg-noon'); tri.segMeem=tri.segMeem||$('#triBar .seg-meem'); tri.segMadd=tri.segMadd||$('#triBar .seg-madd');
  tri.h1.style.left=`calc(${a}% - 7px)`; tri.h2.style.left=`calc(${b}% - 7px)`;
  tri.segNoon.style.left='0%'; tri.segNoon.style.width=`${a}%`;
  tri.segMeem.style.left=`${a}%`; tri.segMeem.style.width=`${b-a}%`;
  tri.segMadd.style.left=`${b}%`; tri.segMadd.style.width=`${100-b}%`;
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
  let dragging=null;
  const onDown=e=>{ dragging=e.target.id; document.body.style.userSelect='none'; };
  const onUp=()=>{ dragging=null; document.body.style.userSelect=''; };
  const onMove=x=>{ if(!dragging) return; const r=tri.wrap.getBoundingClientRect(); const pct=clamp((x-r.left)/r.width*100,0,100); if(dragging==='h1') tri.x1=pct; else tri.x2=pct; triLayout(); };
  tri.h1.addEventListener('mousedown',onDown); tri.h2.addEventListener('mousedown',onDown);
  window.addEventListener('mouseup',onUp); window.addEventListener('mousemove',e=>onMove(e.clientX));
  tri.h1.addEventListener('touchstart',onDown,{passive:true}); tri.h2.addEventListener('touchstart',onDown,{passive:true});
  window.addEventListener('touchend',onUp,{passive:true}); window.addEventListener('touchmove',e=>onMove(e.touches[0].clientX),{passive:true});
  $('#triBar').addEventListener('click',(e)=>{ if(e.target.classList.contains('handle')) return; tri.showCounts=!tri.showCounts; triLayout(); });
  triLayout(); syncTargets();
}
document.addEventListener('DOMContentLoaded', triInit);

// ===== التصفية حسب القسم (عربي/إنجليزي) =====
const SECTION_MAP = {
  noon: ['noon','النون','النون الساكنة','التنوين','النون الساكنة والتنوين','noon_tanween'],
  meem: ['meem','الميم','الميم الساكنة','meem_sakinah'],
  madd: ['madd','المد','المدود','أحكام المد','أحكام المدود','ahkam_al_mudood']
};
function bySection(key){
  const needles = (SECTION_MAP[key] || [key]).map(s => String(s).toLowerCase().trim());
  return QUESTIONS.filter(q => {
    const sec  = String(q.section || q.category || q.group || '').toLowerCase().trim();
    const tags = Array.isArray(q.tags) ? q.tags.map(t => String(t).toLowerCase().trim()) : [];
    return needles.some(n => sec.includes(n) || tags.includes(n));
  });
}
function pickRandom(arr,n){ const a=[...arr]; const out=[]; while(out.length<n && a.length){ const k=Math.floor(Math.random()*a.length); out.push(a.splice(k,1)[0]); } return out; }

// ===== بناء الاختبار وتصحيحه =====
async function buildPaper(qs){
  const list=$('#list'); list.innerHTML='';
  for(let i=0;i<qs.length;i++){
    const q=qs[i];
    const choices=(q.options||[]).map((c,ci)=>`<label><input type="radio" name="q${i}" value="${ci}"> ${c}</label>`).join("");
    const stem0=q.stem || q.question || "";
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

// ===== الأزرار =====
document.getElementById('btnShort')?.addEventListener('click', async ()=>{
  await loadBank();
  const sec = document.getElementById('sectionSelect').value; // noon/meem/madd
  let pool  = bySection(sec);
  if (!pool.length) pool = QUESTIONS; // سقوط آمن
  PAPER = pickRandom(pool, Math.min(5, pool.length));
  await buildPaper(PAPER);
});
document.getElementById('btnComprehensive')?.addEventListener('click', async ()=>{
  await loadBank();
  const {n,m,d,T} = triCounts();
  const noon = pickRandom(bySection('noon'), n);
  const meem = pickRandom(bySection('meem'), m);
  const madd = pickRandom(bySection('madd'), d);
  let paper = [...noon, ...meem, ...madd];
  if (paper.length < T) paper = [...paper, ...pickRandom(QUESTIONS, T - paper.length)];
  if (!paper.length){ alert('لا توجد أسئلة في بنك الأسئلة.'); return; }
  PAPER = pickRandom(paper, T);
  await buildPaper(PAPER);
});
document.getElementById('btnGrade')?.addEventListener('click', gradePaper);// JS with nested-schema support (see previous cell content)
