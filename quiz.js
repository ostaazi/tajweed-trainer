// === Helpers ===
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const el = (h) => { const t=document.createElement('template'); t.innerHTML=h.trim(); return t.content.firstElementChild; };
const clamp = (x,a,b)=>Math.max(a,Math.min(b,x));

let QUESTIONS = [];
let PAPER = [];
const OPTS = { highlight:true, shuffle:true, incNoon:true, incMeem:true, incMadd:true, showCounts:false, triX1:33, triX2:66 };

function loadOpts(){
  try{ const raw=localStorage.getItem('tajweed_opts'); if(raw){ Object.assign(OPTS, JSON.parse(raw)); } }catch(e){}
  $('#optHighlight').checked = OPTS.highlight;
  $('#optShuffle').checked   = OPTS.shuffle;
  $('#incNoon').checked      = OPTS.incNoon;
  $('#incMeem').checked      = OPTS.incMeem;
  $('#incMadd').checked      = OPTS.incMadd;
  $('#optCounts').checked    = OPTS.showCounts;
  tri.x1 = OPTS.triX1; tri.x2 = OPTS.triX2; tri.showCounts = OPTS.showCounts;
}
function saveOpts(){
  Object.assign(OPTS, {
    highlight: $('#optHighlight').checked,
    shuffle:   $('#optShuffle').checked,
    incNoon:   $('#incNoon').checked,
    incMeem:   $('#incMeem').checked,
    incMadd:   $('#incMadd').checked,
    showCounts:$('#optCounts').checked,
    triX1: tri.x1, triX2: tri.x2
  });
  localStorage.setItem('tajweed_opts', JSON.stringify(OPTS));
  const s = $('#saveNote'); s.textContent='تم الحفظ'; setTimeout(()=> s.textContent='', 1500);
}
function resetOpts(){ localStorage.removeItem('tajweed_opts'); location.reload(); }

async function loadBank(){ const res = await fetch('questions_bank.json', {cache:'no-cache'}); QUESTIONS = await res.json(); }

let QURAN_UTH = null;
async function loadUthmani(){ if(QURAN_UTH) return QURAN_UTH; try{ const r=await fetch('quran_uthmani.json',{cache:'no-cache'}); if(r.ok){ QURAN_UTH = await r.json(); return QURAN_UTH; } }catch(e){} return null; }
function normalizeArabic(s){ if(!s) return ''; return s.replace(/[ًٌٍَُِّْـۚۛۗۘۙۚۖۜ۝۞۟۠ۡۢۤ]/g,'').replace(/[ٰ]/g,'').replace(/\s+/g,' ').trim(); }
function getAyahByRef(uth, ref){ const m=String(ref||'').match(/^(\d+):(\d+)$/); if(!m||!uth) return null; const s=m[1],a=m[2]; return uth[s]&&uth[s][a]?uth[s][a]:null; }
async function getAyahFromAPI(ref, fb){ const m=String(ref||'').match(/^(\d+):(\d+)$/); if(!m) return fb||null; const s=m[1],a=m[2]; try{ const u=`https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${s}`; const r=await fetch(u); const j=await r.json(); const v=(j.verses||[]).find(v=>String(v.verse_key)===`${s}:${a}`); return v?(v.text_uthmani||v.text):(fb||null); }catch(e){ return fb||null; } }
function findAyahByText(uth, plain){ if(!uth||!plain) return null; const t=normalizeArabic(plain); let best=null,len=0; for(const s in uth){ for(const a in uth[s]){ const txt=uth[s][a]; const n=normalizeArabic(txt); if(n.includes(t)||t.includes(n)){ if(n.length>len){best=txt;len=n.length;} } } } return best; }
function highlightTargetWord(text, target){ if(!OPTS.highlight || !target) return text; const esc=target.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); const re=new RegExp(`(${esc})`,'g'); return text.replace(re, `<span class="target-word">$1</span>`); }
async function replaceAyahInStem(stem, ref, target){ const m=(stem||'').match(/\{([^}]+)\}/); if(!m) return stem; const within=m[1]; const uth=await loadUthmani(); let ay=null; if(ref){ ay=uth?getAyahByRef(uth,ref):null; if(!ay) ay=await getAyahFromAPI(ref,null); } if(!ay){ ay=uth?findAyahByText(uth,within):null; if(!ay) ay=within; } const hi=highlightTargetWord(ay,target||null); return stem.replace(m[0], `<span class="ayah">${hi}</span>`); }

const sumTarget = $('#sumTarget'), totalRange=$('#totalRange'), totalQ=$('#totalQ');
function getTotal(){ return Math.max(5, Math.min(100, Number(totalQ.value||20))); }
function syncTargets(){ const T=getTotal(); sumTarget.textContent=T; totalRange.value=T; }
function onTotalChange(v){ totalQ.value=v; syncTargets(); triLayout(); }
totalRange?.addEventListener('input', e=> onTotalChange(e.target.value));

const tri = {
  wrap: document.getElementById('triBar'),
  segNoon:null, segMeem:null, segMadd:null,
  h1:document.getElementById('h1'), h2:document.getElementById('h2'),
  pctNoon:document.getElementById('pctNoon'),
  pctMeem:document.getElementById('pctMeem'),
  pctMadd:document.getElementById('pctMadd'),
  x1:33, x2:66,
  showCounts:false
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
  const inc=[$('#incNoon').checked,$('#incMeem').checked,$('#incMadd').checked]; let arr=[n,m,d];
  for(let i=0;i<3;i++){ if(!inc[i]){ const share=arr[i]; arr[i]=0; const idx=[0,1,2].filter(j=>inc[j]); if(idx.length){ const per=Math.round(share/idx.length); idx.forEach(j=> arr[j]+=per); } } }
  const fix=T-(arr[0]+arr[1]+arr[2]); if(fix!==0){ arr[0]+=fix; }
  return {n:arr[0],m:arr[1],d:arr[2],T};
}
function triInit(){
  tri.segNoon=$('#triBar .seg-noon'); tri.segMeem=$('#triBar .seg-meem'); tri.segMadd=$('#triBar .seg-madd');
  $('#triBar').addEventListener('click',(e)=>{ if(e.target.classList.contains('handle')) return; tri.showCounts=!tri.showCounts; $('#optCounts').checked = tri.showCounts; triLayout(); });
  let dragging=null;
  const onDown=e=>{ dragging=e.target.id; document.body.style.userSelect='none'; };
  const onUp=()=>{ dragging=null; document.body.style.userSelect=''; saveOpts(); };
  const onMove=x=>{ if(!dragging) return; const r=tri.wrap.getBoundingClientRect(); const pct=Math.max(0,Math.min(100,(x-r.left)/r.width*100)); if(dragging==='h1') tri.x1=pct; else tri.x2=pct; triLayout(); };
  tri.h1.addEventListener('mousedown',onDown); tri.h2.addEventListener('mousedown',onDown);
  window.addEventListener('mouseup',onUp); window.addEventListener('mousemove',e=>onMove(e.clientX));
  tri.h1.addEventListener('touchstart',onDown,{passive:true}); tri.h2.addEventListener('touchstart',onDown,{passive:true});
  window.addEventListener('touchend',onUp,{passive:true}); window.addEventListener('touchmove',e=>onMove(e.touches[0].clientX),{passive:true});
  ['incNoon','incMeem','incMadd','optCounts'].forEach(id=> document.getElementById(id).addEventListener('change', ()=>{ if(id==='optCounts'){ tri.showCounts=$('#optCounts').checked; } triLayout(); saveOpts(); }));
  document.getElementById('btnReset').addEventListener('click', resetOpts);
  document.getElementById('btnSave').addEventListener('click', saveOpts);
  document.getElementById('optHighlight').addEventListener('change', saveOpts);
  document.getElementById('optShuffle').addEventListener('change', saveOpts);
  $$('.pbtn[data-preset]').forEach(btn=> btn.addEventListener('click', ()=>{ const [a,b,c]=btn.dataset.preset.split(',').map(Number); tri.x1=a; tri.x2=a+b; triLayout(); saveOpts(); }));
  loadOpts();
  triLayout();
}

function shuffleArray(arr){ for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; }

async function buildPaper(qs){
  const list=$('#list'); list.innerHTML='';
  for(let i=0;i<qs.length;i++){
    const q=qs[i];
    let choices=(q.options||q.choices||[]).map((c,ci)=>({text:c,idx:ci}));
    let correct=q.answer;
    if(OPTS.shuffle){ choices=shuffleArray(choices); correct=choices.findIndex(c=>c.idx===q.answer); }
    const choicesHTML = choices.map((c,ci)=>`<label><input type="radio" name="q${i}" value="${ci}"> ${c.text}</label>`).join("");
    const stem0=q.stem||q.question||''; const stemU=await replaceAyahInStem(stem0, q.ref||q.ayahRef||null, q.targetWord||null);
    const node=el(`<div class="q" data-i="${i}" data-ans="${correct}" style="border-bottom:1px solid var(--ring);padding:12px 0">
      <h4 style="margin:0 0 8px 0">${i+1}. ${stemU}</h4>
      <div class="choices">${choicesHTML}</div>
      <div class="muted explain" style="margin-top:6px;display:none"></div>
    </div>`);
    list.append(node);
  }
  window.scrollTo({top: document.body.scrollHeight, behavior:'smooth'});
}
function gradePaper(){
  const items=$$('#list .q'); let right=0;
  items.forEach(wrap=>{
    const sel=wrap.querySelector('input[type="radio"]:checked'); const expEl=wrap.querySelector('.explain');
    if(sel){
      const p=Number(sel.value), c=Number(wrap.dataset.ans);
      if(p===c){ right++; sel.closest('label').style.background='#e8f7f0'; if(expEl) expEl.style.display='none'; }
      else{ sel.closest('label').style.background='#fff1f2'; const corr=wrap.querySelector(`input[value="${c}"]`); if(corr) corr.closest('label').style.background='#e8f7f0'; const note=''; if(expEl){ expEl.textContent=note; expEl.style.display= note?'block':'none'; } }
    }
  });
  $('#result').innerHTML=`<strong>النتيجة:</strong> ${right} / ${PAPER.length}`;
}

function pickRandom(arr,n){ const a=[...arr]; const out=[]; while(out.length<n && a.length){ const k=Math.floor(Math.random()*a.length); out.push(a.splice(k,1)[0]); } return out; }
function bySection(sec){ return QUESTIONS.filter(q=> (q.section||q.category||'').toLowerCase().includes(sec)); }

document.getElementById('btnShort')?.addEventListener('click', async ()=>{
  await loadBank();
  const sec=$('#sectionSelect').value; const pool=bySection(sec);
  PAPER=pickRandom(pool, Math.min(5,pool.length||5)); await buildPaper(PAPER);
});

document.getElementById('btnComprehensive')?.addEventListener('click', async ()=>{
  await loadBank();
  const {n,m,d,T}=triCounts();
  let blocks=[];
  if($('#incNoon').checked) blocks.push(...pickRandom(bySection('noon'), n));
  if($('#incMeem').checked) blocks.push(...pickRandom(bySection('meem'), m));
  if($('#incMadd').checked) blocks.push(...pickRandom(bySection('madd'), d));
  if(blocks.length<T){ blocks=[...blocks, ...pickRandom(QUESTIONS, T-blocks.length)]; }
  PAPER=pickRandom(blocks, T); await buildPaper(PAPER);
});
document.getElementById('btnGrade')?.addEventListener('click', gradePaper);

document.addEventListener('DOMContentLoaded', ()=>{ triInit(); syncTargets(); });
