import { saveAttempt } from './storage.js';

/* =======================
   Load & Normalize Bank
   ======================= */
async function loadBankRaw(){
  const r = await fetch('questions_bank.json',{cache:'no-store'});
  if(!r.ok) throw new Error('لم يتم العثور على questions_bank.json');
  return r.json();
}

const SUBRULE_TITLES = {
  // النون الساكنة والتنوين
  idhar_halaqi: 'إظهار حلقي',
  idgham_bighunnah: 'إدغام بغنة',
  idgham_bilaghunnah: 'إدغام بغير غنة',
  ikhfa_haqiqi: 'إخفاء حقيقي',
  iqlab: 'إقلاب',
  // الميم الساكنة
  ikhfa_shafawi: 'إخفاء شفوي',
  idgham_shafawi: 'إدغام شفوي',
  idhar_shafawi: 'إظهار شفوي',
  // المدود
  madd_muttasil: 'مد متصل',
  madd_munfasil: 'مد منفصل',
  madd_lazim: 'مد لازم',
  madd_tabi3i: 'مد طبيعي'
};

const CHOICES_SETS = [
  ['إظهار','إدغام','إخفاء','إقلاب'],
  ['إدغام بغنة','إدغام بغير غنة','إظهار','إقلاب','إخفاء'],
  ['إخفاء شفوي','إدغام شفوي','إظهار شفوي'],
  ['متصل','منفصل','لازم','طبيعي']
];

function inferChoicesFromQuestionText(qText){
  const txt=(qText||'').replace(/\s+/g,' ').trim();
  for(const set of CHOICES_SETS){
    const pattern=set.join(' ');
    if(txt.includes(pattern)) return set;
  }
  return ['إظهار','إدغام','إخفاء','إقلاب'];
}

function normalizeEntry(rawItem, subKey, secKey){
  if(!rawItem || rawItem.answer==null) return null;
  const qText=(rawItem.question||'').trim();
  let choices = Array.isArray(rawItem.options) && rawItem.options.length
    ? rawItem.options.slice()
    : inferChoicesFromQuestionText(qText);

  const tailCandidates = CHOICES_SETS.map(s=>s.join(' '));
  let stem=qText;
  for(const tail of tailCandidates){
    const idx=qText.lastIndexOf(tail);
    if(idx>-1){ stem=qText.slice(0,idx).trim(); break; }
  }

  let answerIdx=Number(rawItem.answer)-1;
  if(!(answerIdx>=0 && answerIdx<choices.length)) return null;

  return {
    stem, choices, answer:answerIdx,
    rule: SUBRULE_TITLES[subKey]||subKey,
    sectionKey:secKey, subKey, note: rawItem.explain||''
  };
}

function normalizeBank(raw){
  const out={};
  const sections=raw.sections||{};
  for(const [secKey,secObj] of Object.entries(sections)){
    const parts=(secObj&&secObj.parts)?secObj.parts:{};
    const dst={};
    for(const [subKey,arr] of Object.entries(parts)){
      const list=(Array.isArray(arr)?arr:[])
        .map(item=>normalizeEntry(item,subKey,secKey))
        .filter(Boolean);
      if(list.length) dst[subKey]=list;
    }
    out[secKey]=dst;
  }
  return out;
}

/* ============ Helpers ============ */
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]] } return a }
function sample(a,k){ if(k>=a.length) return shuffle(a.slice()); const idx=[...a.keys()]; shuffle(idx); return idx.slice(0,k).map(i=>a[i]) }
function el(h){ const t=document.createElement('template'); t.innerHTML=h.trim(); return t.content.firstElementChild }
function updateBar(done,total){ const b=document.getElementById('bar'); if(!b) return; b.style.width=(Math.round((done/total)*100))+'%' }
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

/* ============ Sampling per section ============ */
function sampleStratifiedFromSection(secObj, k){
  const subKeys=Object.keys(secObj).filter(sk=>Array.isArray(secObj[sk]) && secObj[sk].length);
  if(!subKeys.length || k<=0) return [];
  const base=Math.floor(k/subKeys.length);
  let rem=k%subKeys.length;
  const picked=[];
  subKeys.forEach(sk=>{
    picked.push(...sample(secObj[sk], Math.min(base, secObj[sk].length)));
  });
  shuffle(subKeys);
  subKeys.forEach(sk=>{
    if(rem<=0) return;
    const pool=secObj[sk].filter(q=>!picked.includes(q));
    if(pool.length){ picked.push(...sample(pool,1)); rem--; }
  });
  if(picked.length<k){
    const all=Object.values(secObj).flat().filter(q=>!picked.includes(q));
    picked.push(...sample(all, Math.min(k-picked.length, all.length)));
  }
  return picked.slice(0,k);
}
function sampleFromSection(secObj,k){
  const pool=Object.values(secObj).flat();
  return sample(pool, Math.min(k, pool.length));
}

/* ============ UI Build & Scoring ============ */
function buildPaper(qs){
  const list=document.getElementById('list');
  list.innerHTML='';
  qs.forEach((q,i)=>{
    const ch=q.choices.map((c,ci)=>`<label><input type="radio" name="q${i}" value="${ci}"> ${c}</label>`).join("");
    const node=el(`
      <div class="q" data-i="${i}" data-ans="${q.answer}" style="border-bottom:1px solid var(--ring);padding:12px 0">
        <h4 style="margin:0 0 8px 0">${i+1}. ${q.stem}
        <span class="badge">${q.rule||''}</span></h4>
        <div class="choices">${ch}</div>
        <div class="muted" style="margin-top:6px">${q.note?('معلومة: '+q.note):''}</div>
      </div>`);
    list.append(node);
  });
}

function scorePaper(qs){
  let right=0;
  qs.forEach((q,i)=>{
    const sel=document.querySelector(`input[name="q${i}"]:checked`);
    const wrap=document.querySelector(`.q[data-i="${i}"]`);
    if(!wrap) return;
    wrap.querySelectorAll('label').forEach(l=>l.classList.remove('correct','wrong'));
    if(sel){
      const p=Number(sel.value), c=Number(q.answer);
      if(p===c){ right++; sel.closest('label').style.background='#e8f7f0'; }
      else{
        sel.closest('label').style.background='#fff1f2';
        const corr=wrap.querySelector(`input[value="${c}"]`);
        if(corr) corr.closest('label').style.background='#e8f7f0';
      }
    }
  });
  return right;
}

/* ============ Global State ============ */
let RAW=null, BANK=null, PAPER=[], segLabelMode='percent';
let p1=33, p2=67; // slider handles

document.addEventListener('DOMContentLoaded', async ()=>{
  const mb = document.getElementById('modeBtn'); // optional if exists
  if(mb){
    const apply=()=>{ const dark=localStorage.getItem('taj_MODE')==='dark'; document.documentElement.classList.toggle('dark',dark); mb.innerText=dark?'🌞':'🌓' };
    apply(); mb.onclick=()=>{ localStorage.setItem('taj_MODE', localStorage.getItem('taj_MODE')==='dark'?'light':'dark'); apply(); };
  }

  try{
    RAW=await loadBankRaw();
    BANK=normalizeBank(RAW);
  }catch(e){
    alert(e.message); return;
  }

  /* Elements */
  const start      = document.getElementById('start');
  const startFull  = document.getElementById('startFull');
  const paper      = document.getElementById('paper');
  const submit     = document.getElementById('submit');
  const reset      = document.getElementById('reset');
  const sectionSel = document.getElementById('section');
  const list       = document.getElementById('list');

  const totalRange = document.getElementById('totalRange');
  const totalQ     = document.getElementById('totalQ');
  const sumTarget  = document.getElementById('sumTarget');
  const sumTarget2 = document.getElementById('sumTarget2');
  const sumNow     = document.getElementById('sumNow');

  const track  = document.getElementById('triTrack');
  const h1     = track.querySelector('.h1');
  const h2     = track.querySelector('.h2');
  const segNoon= track.querySelector('.seg-noon');
  const segMeem= track.querySelector('.seg-meem');
  const segMadd= track.querySelector('.seg-madd');

  const segLblNoon=document.getElementById('segLblNoon');
  const segLblMeem=document.getElementById('segLblMeem');
  const segLblMadd=document.getElementById('segLblMadd');

  const cntNoon= document.getElementById('cntNoon');
  const cntMeem= document.getElementById('cntMeem');
  const cntMadd= document.getElementById('cntMadd');
  const lblNoon= document.getElementById('lblNoon');
  const lblMeem= document.getElementById('lblMeem');
  const lblMadd= document.getElementById('lblMadd');
  const chkStrata = document.getElementById('chkStrata');
  const btnInitBySubparts = document.getElementById('btnInitBySubparts');

  /* Utilities */
  function getTotal(){ return clamp(Number(totalQ.value||20),5,100); }
  function updateHandlesUI(){ h1.style.left = p1+'%'; h2.style.left = p2+'%'; }

  // Subparts count
  const subCounts = {
    noon: Object.keys(BANK['noon_tanween']||{}).length || 1,
    meem: Object.keys(BANK['meem_sakinah']||{}).length || 1,
    madd: Object.keys(BANK['madd']||{}).length || 1
  };

  /* ===== Sync Functions ===== */
  const pctNoon = document.getElementById('pctNoon');
  const pctMeem = document.getElementById('pctMeem');
  const pctMadd = document.getElementById('pctMadd');

  function syncTargets(){
    const T=getTotal();
    sumTarget.textContent=T;
    sumTarget2.textContent=T;
    totalRange.value=T;
    totalQ.value=T;
  }

  function syncCountsFromHandles(forceSnap=false){
    const T=getTotal();
    const rNoon=p1/100;
    const rMeem=(p2-p1)/100;
    const rMadd=1-rNoon-rMeem;

    let n=Math.floor(T*rNoon);
    let m=Math.floor(T*rMeem);
    let d=T-(n+m);

    n=clamp(n,0,T); m=clamp(m,0,T-n); d=clamp(d,0,T-n-m);

    cntNoon.value=n; cntMeem.value=m; cntMadd.value=d;
    if(lblNoon) lblNoon.textContent=n;
    if(lblMeem) lblMeem.textContent=m;
    if(lblMadd) lblMadd.textContent=d;

    if(T>0){
      pctNoon.textContent = `${((n/T)*100).toFixed(0)}%`;
      pctMeem.textContent = `${((m/T)*100).toFixed(0)}%`;
      pctMadd.textContent = `${((d/T)*100).toFixed(0)}%`;
    }

    // in-segment labels (toggle percent/count via click on track)
    if(segLabelMode==='percent' && T>0){
      segLblNoon.textContent=`${((n/T)*100).toFixed(0)}%`;
      segLblMeem.textContent=`${((m/T)*100).toFixed(0)}%`;
      segLblMadd.textContent=`${((d/T)*100).toFixed(0)}%`;
    }else{
      segLblNoon.textContent=String(n);
      segLblMeem.textContent=String(m);
      segLblMadd.textContent=String(d);
    }

    sumNow.textContent = n+m+d;

    segNoon.style.width = p1+'%';
    segMeem.style.left  = p1+'%';
    segMeem.style.width = (p2-p1)+'%';
    segMadd.style.left  = p2+'%';
    segMadd.style.width = (100-p2)+'%';
    if(forceSnap && T>0){
      p1=(n/T)*100; p2=((n+m)/T)*100; updateHandlesUI();
    }
  }

  function syncHandlesFromCounts(){
    const T=getTotal();
    let n=clamp(Number(cntNoon.value||0),0,100);
    let m=clamp(Number(cntMeem.value||0),0,100);
    let d=clamp(Number(cntMadd.value||0),0,100);
    if(n+m+d!==T){ d=clamp(T-(n+m),0,100); cntMadd.value=d; }
    p1=T? (n/T)*100 : 0;
    p2=T? ((n+m)/T)*100 : p1;
    p1=clamp(p1,0,100); p2=clamp(p2,p1,100);
    updateHandlesUI();
    syncCountsFromHandles();
  }

  /* ===== Dragging ===== */
  function attachDrag(handle, which){
    let dragging=false;
    const onDown=e=>{ dragging=true; e.preventDefault(); };
    const onMove=e=>{
      if(!dragging) return;
      const rect=track.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      let pct=((clientX-rect.left)/rect.width)*100; pct=clamp(pct,0,100);
      if(which===1) p1=Math.min(pct,p2); else p2=Math.max(pct,p1);
      updateHandlesUI(); syncCountsFromHandles();
    };
    const onUp=()=> dragging=false;
    handle.addEventListener('mousedown', onDown);
    handle.addEventListener('touchstart', onDown, {passive:true});
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, {passive:true});
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
  }
  attachDrag(h1,1); attachDrag(h2,2);

  [h1,h2].forEach((el,idx)=>{
    el.addEventListener('keydown',(e)=>{
      const step=(e.shiftKey?5:1);
      if(e.key==='ArrowLeft'){
        if(idx===0) p1=clamp(p1-step,0,p2); else p2=clamp(p2-step,p1,100);
      }else if(e.key==='ArrowRight'){
        if(idx===0) p1=clamp(p1+step,0,p2); else p2=clamp(p2+step,p1,100);
      }else return;
      updateHandlesUI(); syncCountsFromHandles();
    });
  });

  /* ===== Total controls ===== */
  function onTotalChange(newV){
    totalQ.value=newV; totalRange.value=newV; syncTargets(); syncCountsFromHandles(true);
  }
  totalRange.addEventListener('input', ()=> onTotalChange(clamp(Number(totalRange.value||20),5,100)));
  totalQ.addEventListener('input', ()=> onTotalChange(clamp(Number(totalQ.value||20),5,100)));

  // Toggle percent/count on click on track (not handles)
  track.addEventListener('click',(e)=>{
    if(e.target.classList.contains('handle')) return;
    segLabelMode = (segLabelMode==='percent') ? 'count' : 'percent';
    syncCountsFromHandles();
  });

  // Auto-distribute based on subparts count (with flash)
  function initBySubparts(){
    const s=subCounts.noon+subCounts.meem+subCounts.madd;
    const wNoon=Math.round((subCounts.noon/s)*100);
    const wMeem=Math.round((subCounts.meem/s)*100);
    let wMadd=100-wNoon-wMeem; if(wMadd<0) wMadd=0;
    p1=clamp(wNoon,0,100);
    p2=clamp(wNoon+wMeem,p1,100);
    updateHandlesUI();
    syncCountsFromHandles(true);
  }
  btnInitBySubparts.addEventListener('click', ()=>{
    initBySubparts();
    [segNoon,segMeem,segMadd].forEach(seg=>{
      seg.classList.remove('flash'); void seg.offsetWidth; seg.classList.add('flash');
      setTimeout(()=> seg.classList.remove('flash'), 900);
    });
  });

  // Initial
  syncTargets();
  initBySubparts();

  /* ===== Quiz flows ===== */
  function onPick(){
    const total=PAPER.length;
    const done=Array.from(document.querySelectorAll('.q'))
                .filter(q=>q.querySelector('input:checked')).length;
    updateBar(done,total);
    document.getElementById('list').addEventListener('change', onPick, { once:true });
  }

  // 5 questions from selected section
  function beginSection(){
    const secKey=sectionSel.value;
    const secObj=BANK[secKey];
    if(!secObj){ alert('البنك لا يحتوي هذا القسم'); return; }
    const pool=Object.values(secObj).flat();
    if(!pool.length){ alert('لا توجد أسئلة متاحة في هذا القسم'); return; }
    PAPER=sample(pool,5);
    document.getElementById('summary').style.display='none';
    buildPaper(PAPER);
    paper.style.display='block';
    updateBar(0,PAPER.length);
    list.addEventListener('change', onPick, { once:true });
  }

  // Full exam with dynamic total and distribution
  function beginFull(){
    const target=getTotal();
    const want={
      noon: clamp(Number(cntNoon.value||0),0,100),
      meem: clamp(Number(cntMeem.value||0),0,100),
      madd: clamp(Number(cntMadd.value||0),0,100)
    };
    const sum=want.noon+want.meem+want.madd;
    if(sum!==target){ // fix quietly
      want.madd = clamp(target - (want.noon+want.meem), 0, 100);
      cntMadd.value = want.madd;
    }

    const S={
      noon: BANK['noon_tanween'],
      meem: BANK['meem_sakinah'],
      madd: BANK['madd']
    };
    const strat = !!chkStrata.checked;
    const take = (secObj,k)=> strat ? sampleStratifiedFromSection(secObj,k)
                                    : sampleFromSection(secObj,k);

    const chosen=[];
    if(want.noon && S.noon) chosen.push(...take(S.noon, want.noon));
    if(want.meem && S.meem) chosen.push(...take(S.meem, want.meem));
    if(want.madd && S.madd) chosen.push(...take(S.madd, want.madd));

    if(!chosen.length){ alert('لا توجد أسئلة متاحة للعدد المطلوب.'); return; }

    PAPER = chosen.slice(0, target);
    document.getElementById('summary').style.display='none';
    buildPaper(PAPER);
    paper.style.display='block';
    updateBar(0, PAPER.length);
    list.addEventListener('change', onPick, { once:true });
  }

  start.onclick = beginSection;
  startFull.onclick = beginFull;

  submit.onclick = ()=>{
    if(PAPER.length===0) return;
    const right=scorePaper(PAPER),
          total=PAPER.length,
          score=Math.round((right/total)*100),
          name=(document.getElementById('studentName')?.value||'').trim();

    const rows=PAPER.map((q,i)=>{
      const pickedEl=document.querySelector(`input[name="q${i}"]:checked`);
      const picked=pickedEl ? Number(pickedEl.value) : null;
      return {
        stem:q.stem,
        picked: picked!=null ? q.choices[picked] : null,
        correct: q.choices[q.answer],
        rule: q.rule||'',
        why: q.note||'',
        ok: picked===q.answer
      };
    });

    saveAttempt({
      name, mode:'quiz',
      section: ({noon_tanween:'النون الساكنة والتنوين', meem_sakinah:'الميم الساكنة', madd:'أحكام المدود'})[document.getElementById('section').value] || 'شامل',
      subRule:'—', when:new Date().toLocaleString('ar-EG'), ts:Date.now(),
      right,total,score,rows
    });

    const summ=document.getElementById('summary');
    summ.style.display='block';
    summ.textContent=`النتيجة: ${right}/${total} (${score}%)`;
    window.scrollTo({top:summ.offsetTop-80, behavior:'smooth'});
  };

  reset.onclick = ()=>{
    PAPER=[];
    document.getElementById('summary').style.display='none';
    document.getElementById('list').innerHTML='';
    document.getElementById('bar').style.width='0%';
  };
});
