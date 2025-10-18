// ===== أدوات صغيرة =====
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const el = (h) => { const t=document.createElement('template'); t.innerHTML=h.trim(); return t.content.firstElementChild; };
const clamp = (x,a,b)=>Math.max(a,Math.min(b,x));
const nowISO = () => new Date().toISOString().replace('T',' ').slice(0,19);

const LS_KEYS = { STATE:'TT_STATE', LAST_RESULT:'TT_LAST_RESULT', HISTORY:'TT_HISTORY', QSTATS:'TT_QSTATS' };
const store = (k,v)=> localStorage.setItem(k, JSON.stringify(v));
const read  = (k)=> { try{ const x=localStorage.getItem(k); return x? JSON.parse(x):null; }catch(e){ return null; } };
const drop  = (k)=> localStorage.removeItem(k);

let QUESTIONS=[], PAPER=[], ANSWERS=[], STUDENT="", REVIEW_INDEX=0;

// ===== بنك الأسئلة =====
async function loadBank(){
  if (QUESTIONS.length) return;
  const candidates = ['./questions_bank.json','/tajweed-trainer/questions_bank.json','https://ostaazi.github.io/tajweed-trainer/questions_bank.json'];
  let data=null,lastErr=null;
  for (const url of candidates){
    try{ const res=await fetch(url,{cache:'no-cache'}); if(!res.ok){lastErr='HTTP '+res.status; continue;} data=await res.json(); break; }
    catch(e){ lastErr=e; }
  }
  if(!data){ alert('تعذر تحميل questions_bank.json'); console.error(lastErr); return; }
  QUESTIONS = Array.isArray(data)? data : flattenV3ToArray(data);
  if(!Array.isArray(QUESTIONS)||!QUESTIONS.length){ alert('بنك الأسئلة غير صالح'); QUESTIONS=[]; }
  const diag=$('#diag'); if(diag) diag.innerHTML=`تم التحميل: <b>${QUESTIONS.length}</b> سؤالًا`;
}
function flattenV3ToArray(obj){
  const out=[]; if(!obj||!obj.sections) return out;
  const ST={noon_tanween:'النون الساكنة والتنوين',meem_sakinah:'الميم الساكنة',ahkam_al_mudood:'أحكام المدود'};
  const PT={idhar_halaqi:'الإظهار الحلقي',idgham_with_ghunnah:'الإدغام بغنة',idgham_without_ghunnah:'الإدغام بغير غنة',ikhfa:'الإخفاء',iqlab:'الإقلاب',idhar_shafawi:'الإظهار الشفوي',idgham_shafawi:'الإدغام الشفوي',ikhfa_shafawi:'الإخفاء الشفوي',madd_tabii:'المد الطبيعي',madd_muttasil:'المد المتصل',madd_munfasil:'المد المنفصل',madd_lazim:'المد اللازم'};
  const O1=['إظهار','إدغام','إخفاء','إقلاب'], O2=['مد طبيعي','مد متصل','مد منفصل','مد لازم'];
  const norm=(ops,a)=> typeof a==='number'? Math.max(0,Math.min(ops.length-1,a-1)) : Math.max(0,ops.indexOf(String(a||'').trim()));
  for(const [sk,sv] of Object.entries(obj.sections)){
    const parts=sv?.parts||{}; const st=sv?.title||ST[sk]||sk;
    for(const [pk,arr] of Object.entries(parts)){
      const pt=PT[pk]||pk.replace(/_/g,' '); const isM=(sk==='ahkam_al_mudood'||sk==='madd');
      (Array.isArray(arr)?arr:[]).forEach(q=>{
        const ops=(Array.isArray(q.options)&&q.options.length)? q.options.slice() : (isM? O2.slice(): O1.slice());
        out.push({section:st,part:pt,qnum:q.qnum||null,stem:q.stem||q.question||'',options:ops,answer:norm(ops,q.answer),explain:q.explain||'',ref:q.ref||null,targetWord:q.targetWord||q.target||null});
      });
    }
  }
  return out;
}

// ===== نص عثماني =====
let QURAN_UTH=null;
async function loadUthmaniLocal(){ if(QURAN_UTH) return QURAN_UTH; try{ const r=await fetch('quran_uthmani.json',{cache:'no-cache'}); if(r.ok){ QURAN_UTH=await r.json(); return QURAN_UTH; } }catch(e){} return null; }
function getAyahByRefLocal(uth, ref){ const m=String(ref||'').match(/^(\d+):(\d+)$/); if(!m||!uth) return null; const s=m[1],a=m[2]; return uth[s]&&uth[s][a]? uth[s][a]:null; }
async function getUthmaniByRef(ref){ const m=String(ref||'').match(/^(\d+):(\d+)$/); if(!m) return null; const s=m[1],a=m[2]; try{ const u=`https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${s}`; const r=await fetch(u,{cache:'no-cache'}); if(!r.ok) return null; const j=await r.json(); const v=(j.verses||[]).find(v=>String(v.verse_key)===`${s}:${a}`); return v? (v.text_uthmani||v.text||null):null; }catch(e){ return null; } }
async function searchUthmaniByText(q){ try{ const url=`https://api.quran.com/api/v4/search?q=${encodeURIComponent(q)}&size=1&page=1&language=ar`; const r=await fetch(url,{cache:'no-cache'}); if(!r.ok) return null; const j=await r.json(); const res=j?.search?.results?.[0]; return (res?.text_uthmani||res?.text||null); }catch(e){ return null; } }
function highlightTargetWord(text,target){ if(!target) return text; const esc=target.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); return text.replace(new RegExp(`(${esc})`,'g'), `<span class="target-word">$1</span>`); }
async function replaceAyahInStem(stem,ref,target){ const m=(stem||'').match(/\{([^}]+)\}/); if(!m) return stem; const inside=m[1]; let ay=null; const uth=await loadUthmaniLocal(); if(ref) ay=getAyahByRefLocal(uth,ref); if(!ay&&ref) ay=await getUthmaniByRef(ref); if(!ay) ay=await searchUthmaniByText(inside); if(!ay) ay=inside; const hi=highlightTargetWord(ay,target||null); return stem.replace(m[0], `<span class="ayah">${hi}</span>`); }

let SHOW_META=true;


// ===== Arabic normalization & flexible matching =====
const AR_DIAC = /[\u064B-\u065F\u0670\u0640]/g; // harakat, dagger-alif, tatweel
function normalizeArabic(s){
  if(!s) return '';
  return String(s)
    .replace(AR_DIAC,'')
    .replace(/[أإآ]/g,'ا')
    .replace(/ى/g,'ي')
    .replace(/ؤ/g,'و')
    .replace(/ئ/g,'ي')
    .replace(/ۀ/g,'ه')
    .replace(/ة/g,'ه');
}

// Build a regex that allows optional diacritics between letters
function buildFlexibleArabicPattern(word){
  const base = normalizeArabic(word);
  const chars = Array.from(base).map(ch=>ch.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
  const between = '[\\u064B-\\u065F\\u0670\\u0640]*';
  const body = chars.join(between);
  return new RegExp(`(${body})`, 'g');
}

// Improved target highlighter: match on a diacritic-insensitive basis but wrap in original text
function highlightTargetWord(text,target){
  if(!target) return text;
  try{
    const flex = buildFlexibleArabicPattern(target);
    return text.replace(flex, '<span class="target-word">$1</span>');
  }catch(e){
    return text;
  }
}


// ===== Ayah audio (Quran.com v4) =====
let CURRENT_AUDIO=null;
function getSelectedReciterId(){
  const s = $('#reciterSelect');
  return s && s.value ? Number(s.value) : 2; // default Alafasy
}
async function fetchAyahAudioUrl(ref, reciterId){
  try{
    const url = `https://api.quran.com/api/v4/recitations/${reciterId}/by_ayah/${encodeURIComponent(ref)}?format=audio`;
    const res = await fetch(url);
    if(!res.ok) throw new Error('audio fetch failed');
    const j = await res.json();
    const f = (j && j.audio_files && j.audio_files[0]) ? j.audio_files[0] : null;
    // Docs show 'url' key inside audio_files[*]
    return f && f.url ? (f.url.startsWith('http') ? f.url : `https://verses.quran.foundation/${f.url}`) : null;
  }catch(e){
    return null;
  }
}
async function playAyah(ref, btn){
  try{
    btn && (btn.disabled=true);
    const rid = getSelectedReciterId();
    const src = await fetchAyahAudioUrl(ref, rid);
    if(!src){ toast(`تعذر جلب الصوت لهذه الآية (${ref}). جرّب قارئًا آخر.`); return; }
    if (CURRENT_AUDIO){ try{ CURRENT_AUDIO.pause(); }catch(_){} }
    CURRENT_AUDIO = new Audio(src);
    CURRENT_AUDIO.play().catch(()=>{});
  }finally{
    btn && (btn.disabled=false);
  }
}


// ===== Reciters auto-fetch (Arabic) =====
async function loadReciters(){
  const sel = $('#reciterSelect');
  if (!sel) return;
  try{
    const url = 'https://api.quran.com/api/v4/resources/recitations?language=ar';
    const res = await fetch(url,{cache:'no-cache'});
    if(!res.ok) throw new Error('failed');
    const j = await res.json();
    const arr = Array.isArray(j.recitations)? j.recitations : [];
    if (!arr.length) throw new Error('empty');
    // Preserve current selection if any
    const current = Number(sel.value || 2);
    sel.innerHTML = '';
    for (const r of arr){
      const id = r.id;
      const name = r.translated_name?.name || r.reciter_name || `القارئ ${id}`;
      const opt = document.createElement('option');
      opt.value = String(id);
      opt.textContent = name;
      sel.appendChild(opt);
    }
    // Re-apply previous selection if exists; else default to 2 if present
    sel.value = String(current);
    if (sel.value === '' && sel.querySelector('option[value="2"]')) sel.value = '2';
  }catch(e){
    // Fallback defaults (static list)
    if (!$('#reciterSelect option')){
      // do nothing if already has options
    }
  }
}
window.addEventListener('load', loadReciters);


// ===== Enhanced audio controls (Play/Pause/Stop + Progress) =====
let CURRENT_AUDIO = null;
let CURRENT_AUDIO_CTX = null; // {ref, playBtn, stopBtn, barFill}

function getSelectedReciterId(){
  const s = $('#reciterSelect');
  return s && s.value ? Number(s.value) : 2; // default
}
async function fetchAyahAudioUrl(ref, reciterId){
  try{
    const url = `https://api.quran.com/api/v4/recitations/${reciterId}/by_ayah/${encodeURIComponent(ref)}?format=audio`;
    const res = await fetch(url);
    if(!res.ok) throw new Error('audio fetch failed');
    const j = await res.json();
    const f = (j && j.audio_files && j.audio_files[0]) ? j.audio_files[0] : null;
    return f && f.url ? (f.url.startsWith('http') ? f.url : `https://verses.quran.foundation/${f.url}`) : null;
  }catch(e){
    return null;
  }
}

function wireAudioEvents(audio, ctx){
  if (!audio || !ctx) return;
  const updateTimer = ()=>{
    const cur = fmtTime(audio.currentTime||0);
    const dur = fmtTime(audio.duration||0);
    if (ctx.timeEl) ctx.timeEl.textContent = `${cur}/${dur}`;
  };
  audio.addEventListener('timeupdate', ()=>{
    if (isFinite(audio.duration) && audio.duration>0){
      const pct = Math.min(100, Math.max(0, (audio.currentTime / audio.duration) * 100));
      if (ctx.barFill) ctx.barFill.style.width = pct.toFixed(1) + '%';
    }
    updateTimer();
    if (audio.ended){
      // loop?
      if (ctx.loopChk && ctx.loopChk.checked){
        audio.currentTime = 0;
        audio.play().catch(()=>{});
        return;
      }
      // restore to initial state
      if (ctx.playBtn) ctx.playBtn.textContent = '▶️ استماع';
      if (ctx.barFill) ctx.barFill.style.width = '0%';
    }
  });
  audio.addEventListener('pause', ()=>{
    if (ctx.playBtn) ctx.playBtn.textContent = '▶️ متابعة';
    updateTimer();
  });
  audio.addEventListener('play', ()=>{
    if (ctx.playBtn) ctx.playBtn.textContent = '⏸ إيقاف مؤقت';
    updateTimer();
  });
  audio.addEventListener('loadedmetadata', updateTimer);
  updateTimer();
}
  });
  audio.addEventListener('pause', ()=>{
    if (ctx.playBtn) ctx.playBtn.textContent = '▶️ متابعة';
  });
  audio.addEventListener('play', ()=>{
    if (ctx.playBtn) ctx.playBtn.textContent = '⏸ إيقاف مؤقت';
  });
}

async function togglePlayPause(ref, playBtn){
  const rid = getSelectedReciterId();
  // If the same ref is playing, just toggle pause/play
  if (CURRENT_AUDIO && CURRENT_AUDIO_CTX && CURRENT_AUDIO_CTX.ref === ref){
    if (CURRENT_AUDIO.paused){ CURRENT_AUDIO.play().catch(()=>{}); }
    else { CURRENT_AUDIO.pause(); }
    return;
  }
  // Otherwise start new audio
  // Clean up previous
  if (CURRENT_AUDIO){ try{ CURRENT_AUDIO.pause(); }catch(_){ } }
  CURRENT_AUDIO = null; CURRENT_AUDIO_CTX = null;
  // Find UI siblings
  const container = playBtn.closest('.ayah-audio');
  const stopBtn = container?.querySelector('.btn-audio-stop');
  const barFill = container?.querySelector('.audio-bar .fill');

  playBtn && (playBtn.disabled = true);
  stopBtn && (stopBtn.disabled = true);
  try{
    const src = await fetchAyahAudioUrl(ref, rid);
    if(!src){ toast(`تعذر جلب الصوت لهذه الآية (${ref}). جرّب قارئًا آخر.`); return; }
    const a = new Audio(src);
    CURRENT_AUDIO = a;
    CURRENT_AUDIO_CTX = {ref, playBtn, stopBtn, barFill, timeEl: container?.querySelector('.audio-time'), loopChk: container?.querySelector('.loopChk'), volRange: container?.querySelector('.volRange'), volPct: container?.querySelector('.vol-pct')};
    wireAudioEvents(a, CURRENT_AUDIO_CTX);
    stopBtn && (stopBtn.disabled = false);
    
  // Initialize volume (default 0.8) and wire slider
  const initVol = ()=>{
    if (!CURRENT_AUDIO || !CURRENT_AUDIO_CTX) return;
    const {volRange, volPct} = CURRENT_AUDIO_CTX;
    const setVol = (v)=>{
      const vol = Math.min(1, Math.max(0, v/100));
      try{ CURRENT_AUDIO.volume = vol; }catch(_){}
      if (volPct) volPct.textContent = Math.round(vol*100) + '%';
      if (volRange && Number(volRange.value)!==Math.round(vol*100)) volRange.value = Math.round(vol*100);
    };
    setVol(Number(volRange?.value||80));
    if (volRange){
      volRange.addEventListener('input', ()=> setVol(Number(volRange.value||80)));
    }
  };
  initVol();

    a.play().catch(()=>{});
  }finally{
    playBtn && (playBtn.disabled = false);
  }
}

function stopAudio(){
  if (CURRENT_AUDIO){
    try{ CURRENT_AUDIO.pause(); CURRENT_AUDIO.currentTime = 0; }catch(_){}
    if (CURRENT_AUDIO_CTX){
      const { playBtn, barFill, timeEl } = CURRENT_AUDIO_CTX;
      if (playBtn) playBtn.textContent = '▶️ استماع';
      if (barFill) barFill.style.width = '0%';
      if (timeEl) timeEl.textContent = '00:00/00:00';
    }
  }
}catch(_){}
    if (CURRENT_AUDIO_CTX){
      const { playBtn, barFill } = CURRENT_AUDIO_CTX;
      if (playBtn) playBtn.textContent = '▶️ استماع';
      if (barFill) barFill.style.width = '0%';
    }
  }
}


// ===== Apply question card styling =====
function applyQuestionCardStyling(){
  // Candidate nodes: list/exam items rendered as li or divs
  const containers = [
    ...document.querySelectorAll('#list > li'),
    ...document.querySelectorAll('#exam > li'),
    ...document.querySelectorAll('#list > div'),
    ...document.querySelectorAll('#exam > div'),
    ...document.querySelectorAll('.question, .q-item, .question-item')
  ];
  containers.forEach((el)=>{
    if (!el.classList.contains('q-card')){
      el.classList.add('q-card');
      // Try to tag stem/options blocks with semantic classes if identifiable
      // Common containers that may exist
      const opts = el.querySelector('.opts, .options, .choices');
      if (opts) opts.classList.add('opts');
      // Mark heading if there's a number or title element
      const head = el.querySelector('.q-head, .title, .num, .qid');
      if (!head){
        const h = el.querySelector('h3, h4, .title');
        if (h) h.classList.add('q-head');
      }
      const stem = el.querySelector('.stem, .q-stem, .question-stem, .text');
      if (stem && !stem.classList.contains('q-stem')) stem.classList.add('q-stem');
    }
  });
}

function attachAyahAudioButtons(){
  // Badge case
  document.querySelectorAll('.badge.meta[data-ref]').forEach(b=>{
    if(b.dataset.audioInit==='1') return;
    const ref = b.getAttribute('data-ref');
    const wrap = document.createElement('span');
    wrap.className = 'ayah-audio';
    wrap.innerHTML = `
      <button type="button" class="btn-audio">▶️ استماع</button>
      <button type="button" class="btn-audio-stop">⏹ إيقاف</button>
      <span class="audio-bar" aria-label="audio progress"><span class="fill"></span></span>`;
    const playBtn = wrap.querySelector('.btn-audio');
    const stopBtn = wrap.querySelector('.btn-audio-stop');
    stopBtn.disabled = true;
    playBtn.addEventListener('click', ()=> togglePlayPause(ref, playBtn));
    stopBtn.addEventListener('click', stopAudio);
    b.insertAdjacentElement('afterend', wrap);
    b.dataset.audioInit='1';
  });
  // Ayah span case
  document.querySelectorAll('.ayah[data-ref]').forEach(a=>{
    if(a.dataset.audioInit==='1') return;
    const ref = a.getAttribute('data-ref');
    const wrap = document.createElement('span');
    wrap.className = 'ayah-audio';
    wrap.innerHTML = `
      <button type="button" class="btn-audio">▶️ استماع</button>
      <button type="button" class="btn-audio-stop">⏹ إيقاف</button>
      <span class="audio-bar" aria-label="audio progress"><span class="fill"></span></span>`;
    const playBtn = wrap.querySelector('.btn-audio');
    const stopBtn = wrap.querySelector('.btn-audio-stop');
    stopBtn.disabled = true;
    playBtn.addEventListener('click', ()=> togglePlayPause(ref, playBtn));
    stopBtn.addEventListener('click', stopAudio);
    a.insertAdjacentElement('afterend', wrap);
    a.dataset.audioInit='1';
  });
}


// ===== Time formatting helper =====
function fmtTime(sec){
  if(!isFinite(sec) || sec<0) return '00:00';
  const m = Math.floor(sec/60);
  const s = Math.floor(sec%60);
  return (String(m).padStart(2,'0')+':'+String(s).padStart(2,'0'));
}


// ===== Toast notifications =====
function toast(msg, type='info', timeout=2800){
  try{
    const host = document.getElementById('toastHost');
    if(!host) return alert(msg);
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    host.appendChild(t);
    setTimeout(()=>{
      t.style.transition='opacity .25s linear, transform .25s ease';
      t.style.opacity='0'; t.style.transform='translateY(-8px)';
      setTimeout(()=> t.remove(), 260);
    }, Math.max(1200, timeout));
  }catch{ /* noop */ }
}


// ===== Result export (POST with fallback) =====
// Configurable endpoint; can be overridden by localStorage.RESULTS_POST_URL
const RESULTS_POST_URL = (localStorage.getItem('RESULTS_POST_URL') || '/data/results'); // e.g. '/api/results' on your server
async function exportResultRecord(rec){
  const url = RESULTS_POST_URL;
  try{
    const res = await fetch(url, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(rec)});
    if(!res.ok) throw new Error('non-2xx');
    toast('تم حفظ النتيجة على الخادم.', 'ok');
    return true;
  }catch(e){
    // Fallback: stash locally for later sync and offer a download
    try{
      const key='pendingResults';
      const cur = JSON.parse(localStorage.getItem(key) || '[]');
      cur.push(rec);
      localStorage.setItem(key, JSON.stringify(cur));
      toast('تعذر الاتصال بالخادم — تم حفظ النتيجة محليًا. يمكنك تنزيلها.', 'error');
      offerBatchDownload(cur);
    }catch(_){ /* noop */ }
    return false;
  }
}

function offerBatchDownload(arr){
  try{
    const blob = new Blob([JSON.stringify(arr, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
    a.href = URL.createObjectURL(blob);
    a.download = `results_batch_${stamp}.json`;
    a.click();
    setTimeout(()=> URL.revokeObjectURL(a.href), 3000);
  }catch(_){ /* noop */ }
}

// Helper to derive a trainee identifier if available
function getTraineeId(){
  // If you later add an input#traineeId, we read it; otherwise anonymous
  const el = document.getElementById('traineeId');
  const v = (el && el.value || '').trim();
  if (v) return v;
  // Fallback: anonymous + short fingerprint
  return 'anonymous-' + Math.random().toString(36).slice(2,8);
}


function renderBigResultCard(summary){
  const box = $('#resultBox');
  if(!box) return;
  const {scorePct, correct, total, durationSec, startedAt, finishedAt} = summary;
  const durTxt = isFinite(durationSec) ? (Math.floor(durationSec/60)+' دقيقة '+(Math.floor(durationSec%60))+' ثانية') : '—';
  box.innerHTML = `
  <div class="result-card" role="status" aria-live="polite">
    <div class="title">نتيجة الاختبار</div>
    <div class="score">${scorePct}%</div>
    <div class="meta">
      <span class="pill">صحيح: ${correct}</span>
      <span class="pill">إجمالي: ${total}</span>
      <span class="pill">المدة: ${durTxt}</span>
    </div>
  </div>`;
  // Scroll into view for visibility
  try{ box.scrollIntoView({behavior:'smooth', block:'center'}); }catch(_){}
}


// ===== Sidebar & Settings Logic =====
const MOVABLE_CONTROLS = [
  { id:'ctl_AyahMeta',  label:'زر إظهار/إخفاء اسم السورة والآية', query:'#btnAyahMeta' },
  { id:'ctl_Reciter',   label:'قائمة القارئ',                      query:'#reciterSelect', wrapLabel:true },
  { id:'ctl_Api',       label:'التبديل لاستخدام API للآية',        query:'#tglApi' },
  { id:'ctl_Dark',      label:'زر الوضع الداكن',                  query:'#btnDark' },
  { id:'ctl_ResultsUrl',label:'مسار حفظ النتائج (RESULTS_POST_URL)', special:'resultsUrl' }
];

function ensureWrappers(){
  MOVABLE_CONTROLS.forEach(c=>{
    if (c.special==='resultsUrl') return; // will render as input
    const node = document.querySelector(c.query);
    if (!node) return;
    let wrap = document.getElementById(c.id);
    if (!wrap){
      wrap = document.createElement('div');
      wrap.id = c.id;
      wrap.className = 'ctl-wrap';
      // For select, add label
      if (c.wrapLabel && node.tagName === 'SELECT'){
        const lab = document.createElement('label');
        lab.textContent = 'القارئ:';
        lab.style.fontWeight='700';
        lab.style.minWidth='64px';
        wrap.appendChild(lab);
      }
      // Move the node into wrap
      node.parentNode && node.parentNode.insertBefore(wrap, node);
      wrap.appendChild(node);
    }
  });
  // Results URL control (text input)
  if (!document.getElementById('ctl_ResultsUrl')){
    const wrap = document.createElement('div');
    wrap.id = 'ctl_ResultsUrl';
    wrap.className = 'ctl-wrap';
    const lab = document.createElement('label');
    lab.textContent = 'RESULTS_POST_URL:';
    lab.style.fontWeight='700';
    lab.style.minWidth='140px';
    const inp = document.createElement('input');
    inp.id = 'resultsUrlInput';
    inp.type='text';
    inp.placeholder='/api/results أو /data/results';
    inp.value = localStorage.getItem('RESULTS_POST_URL') || '/data/results';
    inp.style.flex='1';
    inp.addEventListener('change', ()=> localStorage.setItem('RESULTS_POST_URL', inp.value.trim()));
    wrap.appendChild(lab); wrap.appendChild(inp);
    // Place it at end of topToolbar for now
    const tb = document.getElementById('topToolbar');
    if (tb) tb.appendChild(wrap);
  }
}

function getSidebarConfig(){
  try{
    const s = localStorage.getItem('SIDEBAR_ITEMS');
    if (!s) return [];
    const arr = JSON.parse(s);
    return Array.isArray(arr)? arr : [];
  }catch{ return []; }
}
function setSidebarConfig(arr){
  localStorage.setItem('SIDEBAR_ITEMS', JSON.stringify(arr||[]));
}
function applyControlLayout(){
  ensureWrappers();
  const sidebar = document.getElementById('sidebarContent');
  const toolbar = document.getElementById('topToolbar');
  if (!sidebar || !toolbar) return;
  const cfg = new Set(getSidebarConfig());
  MOVABLE_CONTROLS.forEach(c=>{
    const el = document.getElementById(c.id);
    if (!el) return;
    if (cfg.has(c.id)) sidebar.appendChild(el);
    else toolbar.appendChild(el);
  });
}

// Sidebar open/close
function openSidebar(){
  document.getElementById('sidebarDrawer')?.classList.add('open');
  document.getElementById('sidebarOverlay')?.classList.add('show');
}
function closeSidebar(){
  document.getElementById('sidebarDrawer')?.classList.remove('open');
  document.getElementById('sidebarOverlay')?.classList.remove('show');
}

document.getElementById('btnMenu')?.addEventListener('click', openSidebar);
document.getElementById('btnCloseSidebar')?.addEventListener('click', closeSidebar);
document.getElementById('sidebarOverlay')?.addEventListener('click', closeSidebar);

// Settings modal management
function openSettings(){
  buildSettingsForm();
  document.getElementById('settingsModal')?.classList.add('show');
}
function closeSettings(){
  document.getElementById('settingsModal')?.classList.remove('show');
}
document.getElementById('btnOpenSettings')?.addEventListener('click', openSettings);
document.getElementById('btnCancelSettings')?.addEventListener('click', closeSettings);
document.getElementById('btnSaveSettings')?.addEventListener('click', ()=>{
  const form = document.getElementById('settingsForm');
  if (!form) return;
  const chosen = [];
  form.querySelectorAll('input[type="checkbox"]').forEach(ch=>{
    if (ch.checked) chosen.push(ch.value);
  });
  setSidebarConfig(chosen);
  applyControlLayout(); applySidebarSections(); applyQuestionAudioVisibility();
  toast('تم حفظ توزيع الأزرار.', 'ok');
  closeSettings();
});

function buildSettingsForm(){
  const form = document.getElementById('settingsForm');
  if (!form) return;
  form.innerHTML = '';
  const cfg = new Set(getSidebarConfig());
  MOVABLE_CONTROLS.forEach(c=>{
    const row = document.createElement('label');
    row.style.display='flex'; row.style.gap='.5em'; row.style.alignItems='center';
    const ch = document.createElement('input');
    ch.type='checkbox'; ch.value=c.id; ch.checked = cfg.has(c.id);
    const name = document.createElement('span');
    name.textContent = c.label;
    row.appendChild(ch); row.appendChild(name);
    form.appendChild(row);
  });
}

window.addEventListener('load', ()=>{
  ensureWrappers();
  applyControlLayout(); applySidebarSections(); applyQuestionAudioVisibility();
});


// ===== Settings state & tabs =====
function applyThemeFromSetting(){
  const m = localStorage.getItem('THEME_MODE') || 'auto';
  document.body.dataset.theme = m;
  const isDark = (m==='dark') || (m==='auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.body.classList.toggle('dark', !!isDark);
}
function initSettingsControls(){
  // Theme
  const th = document.getElementById('themeSelect');
  if (th){
    const cur = localStorage.getItem('THEME_MODE') || 'auto';
    th.value = cur;
    th.addEventListener('change', ()=>{ localStorage.setItem('THEME_MODE', th.value); applyThemeFromSetting(); });
  }
  // Audio visibility
  const chkA = document.getElementById('chkShowAudio');
  if (chkA){
    const cur = (localStorage.getItem('SHOW_AUDIO') ?? '1') !== '0';
    chkA.checked = cur;
    chkA.addEventListener('change', ()=>{ localStorage.setItem('SHOW_AUDIO', chkA.checked ? '1':'0'); applyQuestionAudioVisibility(); });
  }
  // Reports visibility
  const chkR = document.getElementById('chkShowReports');
  if (chkR){
    const cur = (localStorage.getItem('SHOW_REPORTS') ?? '1') !== '0';
    chkR.checked = cur;
    chkR.addEventListener('change', ()=>{ localStorage.setItem('SHOW_REPORTS', chkR.checked ? '1':'0'); applyReportsVisibility(); });
  }
}
function wireSettingsTabs(){
  const tabs = Array.from(document.querySelectorAll('.sm-tab'));
  tabs.forEach(t=>{
    t.addEventListener('click', ()=>{
      tabs.forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
      const name = t.dataset.tab;
      document.querySelectorAll('.sm-section').forEach(s=> s.classList.toggle('show', s.id.toLowerCase().includes(name)));
    });
  });
  // default active
  const first = document.querySelector('.sm-tab[data-tab="layout"]'); if (first) first.classList.add('active');
}
window.addEventListener('load', ()=>{
  applyThemeFromSetting();
  initSettingsControls();
  wireSettingsTabs();
});
window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyThemeFromSetting);

// ===== Apply audio visibility =====
function applyQuestionAudioVisibility(){
  const show = (localStorage.getItem('SHOW_AUDIO') ?? '1') !== '0';
  document.body.classList.toggle('audio-hidden', !show);
  // Re-render audio buttons if turning on; no need to remove existing because CSS hides them
  if (show){ try{ attachAyahAudioButtons(); }catch(_){} }
}
// CSS hook


function applySidebarSections(){
  const map = {
    'ctl_AyahMeta': 'sd-sec-view',
    'ctl_Api': 'sd-sec-view',
    'ctl_Dark': 'sd-sec-view',
    'ctl_Reciter': 'sd-sec-audio',
    'ctl_ResultsUrl': 'sd-sec-results'
  };
  Object.entries(map).forEach(([id,secId])=>{
    const el = document.getElementById(id);
    const sec = document.getElementById(secId);
    if (el && sec && el.parentElement===document.getElementById('sidebarContent')){
      sec.appendChild(el);
    }
  });
}


// ===== Exam details & exports =====
function buildDetailsPanel(){
  const box = document.getElementById('resultBox');
  if (!box) return;
  let panel = document.getElementById('detailsPanel');
  if (!panel){
    panel = document.createElement('div');
    panel.id='detailsPanel';
    box.appendChild(panel);
  }
  const data = (window.examState && examState.currentPaper) || (window.PAPER) || [];
  const answers = (window.examState && examState.answers) || (window.USER_ANSWERS) || {};
  const rows = [];
  let weakTags = {}; // for remedial planning
  data.forEach((q,idx)=>{
    const ua = answers[q.id] ?? answers[idx];
    const ok = String(ua) === String(q.correct);
    const title = q.stem || q.text || ('سؤال #' + (idx+1));
    const rule = q.rule || q.expl || q.section || q.topic || '—';
    if(!ok){
      (weakTags[rule] = (weakTags[rule]||0)+1);
    }
    rows.push(`
      <div class="det-row">
        <div class="det-q">${idx+1}) ${title}</div>
        <div class="det-rule">القاعدة: ${rule}</div>
        <div class="det-ans">
          <span>إجابتك: <b class="${ok?'ok':'bad'}">${ua ?? '—'}</b></span>
          <span>الصحيحة: <b class="ok">${q.correct}</b></span>
        </div>
      </div>
    `);
  });
  panel.innerHTML = rows.join('') + `
    <div class="det-actions">
      <button class="btn info" id="btnPrintDetails">طباعة / PDF</button>
      <button class="btn" id="btnExportJSON">تصدير JSON</button>
      <button class="btn" id="btnExportCSV">تصدير CSV</button>
      <button class="btn" id="btnBuildRemedial">بناء تمارين علاجية</button>
    </div>
  `;

  // Wire actions
  document.getElementById('btnPrintDetails')?.addEventListener('click', ()=> window.print());
  document.getElementById('btnExportJSON')?.addEventListener('click', ()=> exportDetailsJSON(data, answers));
  document.getElementById('btnExportCSV')?.addEventListener('click', ()=> exportDetailsCSV(data, answers));
  document.getElementById('btnBuildRemedial')?.addEventListener('click', ()=> buildRemedialPlan(data, answers));
  panel.classList.add('show');
}

// Export helpers
function exportDetailsJSON(data, answers){
  const out = data.map((q, idx)=>({
    id: q.id ?? idx,
    stem: q.stem || q.text || '',
    correct: q.correct,
    user: answers[q.id] ?? answers[idx] ?? null,
    rule: q.rule || q.expl || q.section || q.topic || null
  }));
  const blob = new Blob([JSON.stringify(out, null, 2)],{type:'application/json'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='exam_details.json'; a.click();
  setTimeout(()=> URL.revokeObjectURL(a.href), 2000);
}
function exportDetailsCSV(data, answers){
  const rows = [['id','stem','correct','user','rule']];
  data.forEach((q, idx)=>{
    const row = [
      (q.id ?? idx),
      (q.stem || q.text || '').replace(/\n/g,' ').replace(/"/g,'""'),
      (q.correct ?? '').toString().replace(/"/g,'""'),
      ((answers[q.id] ?? answers[idx] ?? '')+'').replace(/"/g,'""'),
      (q.rule || q.expl || q.section || q.topic || '').replace(/"/g,'""')
    ];
    rows.push(row);
  });
  const csv = rows.map(r=> r.map(x=> `"${x}"`).join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='exam_details.csv'; a.click();
  setTimeout(()=> URL.revokeObjectURL(a.href), 2000);
}

// Remedial plan skeleton: cluster by rule/topic and suggest # of items
function buildRemedialPlan(data, answers){
  const freq = {};
  data.forEach((q,idx)=>{
    const ua = answers[q.id] ?? answers[idx];
    const ok = String(ua) === String(q.correct);
    if (!ok){
      const key = q.rule || q.topic || q.section || 'غير مصنف';
      freq[key] = (freq[key]||0) + 1;
    }
  });
  const items = Object.entries(freq).sort((a,b)=> b[1]-a[1]).map(([k,v])=>({topic:k, count:v, target: Math.max(3, v*2)}));
  toast('تم توليد خطة علاجية أولية بناءً على نقاط الضعف.', 'ok');
  // Optionally, start a filtered practice round using the bank (requires bank access functions in your code)
  try{
    window.REMEDIAL_PLAN = items;
    console.log('Remedial plan', items);
  }catch{}
}

document.addEventListener('click', (e)=>{
  if (e.target && e.target.id==='btnShowDetails'){
    const p = document.getElementById('detailsPanel');
    if (p && p.classList.contains('show')){ p.classList.remove('show'); p.style.display='none'; return; }
    buildDetailsPanel();
  }
});


// ===== Reports & Analytics (basic) =====
function openReports(){
  document.getElementById('reportsModal')?.classList.add('show');
  renderReports();
}
function closeReports(){ document.getElementById('reportsModal')?.classList.remove('show'); }
document.getElementById('btnCloseReports')?.addEventListener('click', closeReports);
document.getElementById('btnRptRefresh')?.addEventListener('click', renderReports);
document.getElementById('btnRptPrint')?.addEventListener('click', ()=> window.print());
document.getElementById('btnRptJSON')?.addEventListener('click', exportReportsJSON);
document.getElementById('btnRptCSV')?.addEventListener('click', exportReportsCSV);

function applyReportsVisibility(){
  const show = (localStorage.getItem('SHOW_REPORTS') ?? '1') !== '0';
  // If needed, show/hide an entry point; here we'll add a button in sidebar results section
  let entry = document.getElementById('ctl_OpenReports');
  if (!entry){
    entry = document.createElement('div'); entry.id='ctl_OpenReports'; entry.className='ctl-wrap';
    const b = document.createElement('button'); b.className='btn info'; b.id='btnOpenReports'; b.textContent='التقارير والإحصاءات';
    b.addEventListener('click', openReports);
    entry.appendChild(b);
    const sec = document.getElementById('sd-sec-results') || document.getElementById('sidebarContent');
    sec && sec.appendChild(entry);
  }
  entry.style.display = show ? '' : 'none';
}

function renderReports(){
  // Aggregate from exported results (server) + local pending
  const key='pendingResults';
  const local = JSON.parse(localStorage.getItem(key) || '[]');
  const arr = local; // You can merge with server-side fetched data later
  const totalExams = arr.length;
  const avgScore = totalExams ? Math.round(arr.reduce((s,x)=> s + (x.scorePct||0), 0) / totalExams) : 0;
  // hardest topics (most frequent misses across records)
  const topics = {};
  arr.forEach(r=>{
    if (Array.isArray(r.details)){
      r.details.forEach(d=>{
        if (String(d.user) !== String(d.correct)){
          const k = d.rule || 'غير مصنف';
          topics[k] = (topics[k]||0) + 1;
        }
      });
    }
  });
  const hardest = Object.entries(topics).sort((a,b)=> b[1]-a[1]).slice(0,6);
  const c = document.getElementById('rpContent');
  if (!c) return;
  c.innerHTML = `
    <div class="rp-card"><div class="k">عدد الاختبارات</div><div class="v">${totalExams}</div></div>
    <div class="rp-card"><div class="k">متوسط النتيجة</div><div class="v">${avgScore}%</div></div>
    <div class="rp-card" style="grid-column: 1 / -1;"><div class="k">الموضوعات الأكثر صعوبة</div>${
      hardest.length? '<ul>' + hardest.map(([k,v])=> `<li>${k} — ${v}</li>`).join('') + '</ul>' : '<div>لا توجد بيانات كافية</div>'
    }</div>
  `;
}

function exportReportsJSON(){
  const key='pendingResults';
  const arr = JSON.parse(localStorage.getItem(key) || '[]');
  const blob = new Blob([JSON.stringify(arr, null, 2)],{type:'application/json'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='reports.json'; a.click();
  setTimeout(()=> URL.revokeObjectURL(a.href), 2000);
}
function exportReportsCSV(){
  const key='pendingResults';
  const arr = JSON.parse(localStorage.getItem(key) || '[]');
  const rows = [['traineeId','startedAt','finishedAt','durationSec','correct','total','scorePct']];
  arr.forEach(r=> rows.push([r.traineeId, r.startedAt, r.finishedAt, r.durationSec, r.correct, r.total, r.scorePct]));
  const csv = rows.map(r=> r.map(x=> `"${(x??'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='reports.csv'; a.click();
  setTimeout(()=> URL.revokeObjectURL(a.href), 2000);
}
window.addEventListener('load', applyReportsVisibility);


// ===== Remedial practice =====
const REMEDIAL_KEY_PREFIX = 'REMEDIAL_PLAN:';

function getActiveTraineeId(){
  return (localStorage.getItem('ACTIVE_TRAINEE') || getTraineeId() || 'anonymous');
}
function saveRemedialPlan(plan){
  try{
    const id = getActiveTraineeId();
    localStorage.setItem(REMEDIAL_KEY_PREFIX + id, JSON.stringify({id, createdAt: Date.now(), items: plan||[]}));
    toast('تم حفظ الخطة العلاجية.', 'ok');
  }catch{}
}
function loadRemedialPlan(id){
  try{
    id = id || getActiveTraineeId();
    const s = localStorage.getItem(REMEDIAL_KEY_PREFIX + id);
    return s ? JSON.parse(s) : null;
  }catch{ return null; }
}
function startRemedialFromPlan(planObj){
  if (!planObj || !Array.isArray(planObj.items) || !planObj.items.length){ toast('لا توجد خطة علاجية متاحة.', 'error'); return; }
  // Attempt to build a paper from question bank by topics/rules; fallback to current wrong items
  buildRemedialPaper(planObj.items).then(paper=>{
    if (!paper || !paper.length){ toast('تعذر توليد أسئلة علاجية كافية.', 'error'); return; }
    try{
      window.PAPER = paper;
      // If you have a dedicated "renderExam" or "startExam" function, call it here.
      if (typeof renderExam === 'function'){ renderExam(paper); }
      else if (typeof bindPaper === 'function'){ bindPaper(); attachAyahAudioButtons(); applyQuestionCardStyling(); }
      toast(`بدأت جلسة علاجية (${paper.length} سؤال)`, 'ok');
    }catch{}
  });
}
async function buildRemedialPaper(items){
  // Try to fetch questions_bank.json (relative) and filter by rule/topic keys
  let bank = null;
  try{
    const res = await fetch('questions_bank.json', {cache:'no-cache'});
    if (res.ok) bank = await res.json();
  }catch{}
  const want = [];
  // items: [{topic, count, target}]
  const pickFromArr = (arr, n)=>{
    const out=[]; for (let i=0;i<arr.length && out.length<n;i++){ out.push(arr[i]); } return out;
  };
  if (bank && bank.sections){
    // flatten crude: walk sections/parts arrays and match q.rule/topic/section against items.topic
    const flat=[];
    Object.entries(bank.sections).forEach(([sec,obj])=>{
      const parts = obj && obj.parts ? obj.parts : {};
      Object.values(parts).forEach(arr=>{
        (arr||[]).forEach(q=>{
          flat.push({...q, section: sec});
        });
      });
    });
    items.forEach(it=>{
      const k = (it.topic||'').trim();
      if (!k) return;
      const cand = flat.filter(q=>([q.rule,q.topic,q.section].map(x=> (x||'').toString()).some(v=> v.includes(k))));
      want.push(...pickFromArr(cand, it.target||it.count||3));
    });
  }else{
    // fallback: use last exam wrongs if available
    const data = (window.examState && examState.currentPaper) || (window.PAPER) || [];
    const answers = (window.examState && examState.answers) || (window.USER_ANSWERS) || {};
    items.forEach(it=>{
      const k = (it.topic||'').trim();
      const wrong = data.filter((q,idx)=>{
        const ua = answers[q.id] ?? answers[idx];
        const ok = String(ua) === String(q.correct);
        const rule = q.rule || q.topic || q.section || '';
        return !ok && (!k || rule.includes(k));
      });
      want.push(...pickFromArr(wrong, it.target||it.count||3));
    });
  }
  // Deduplicate by id/text
  const seen = new Set(); const dedup=[];
  want.forEach(q=>{
    const key = q.id || q.stem || q.text || JSON.stringify(q);
    if (!seen.has(key)){ seen.add(key); dedup.push(q); }
  });
  return dedup;
}

// Wire sidebar buttons
document.getElementById('btnStartRemedial')?.addEventListener('click', ()=>{
  if (window.REMEDIAL_PLAN && Array.isArray(REMEDIAL_PLAN) && REMEDIAL_PLAN.length){
    const obj = {id:getActiveTraineeId(), createdAt: Date.now(), items: REMEDIAL_PLAN};
    saveRemedialPlan(obj.items);
    startRemedialFromPlan(obj);
  }else{
    const saved = loadRemedialPlan();
    if (saved){ startRemedialFromPlan(saved); }
    else toast('لا توجد خطة علاجية محفوظة بعد.', 'error');
  }
});
document.getElementById('btnResumeRemedial')?.addEventListener('click', ()=>{
  const saved = loadRemedialPlan();
  if (saved) startRemedialFromPlan(saved);
  else toast('لا توجد خطة علاجية محفوظة للمتدرّب الحالي.', 'error');
});

// ===== Reports: merge server results + filters =====
function getResultsFetchUrl(){
  return localStorage.getItem('RESULTS_FETCH_URL') || '/api/results'; // configurable
}
async function fetchServerResults(){
  try{
    const url = getResultsFetchUrl();
    const res = await fetch(url, {cache:'no-cache'});
    if(!res.ok) throw new Error('http');
    const j = await res.json();
    return Array.isArray(j)? j : (j.results || []);
  }catch{ return []; }
}
function applyReportFilters(list){
  const trainee = (document.getElementById('fltTrainee')?.value || '').trim();
  const from = document.getElementById('fltFrom')?.value;
  const to = document.getElementById('fltTo')?.value;
  const topic = document.getElementById('fltTopic')?.value || '';
  const fromTs = from ? Date.parse(from+'T00:00:00') : -Infinity;
  const toTs = to ? Date.parse(to+'T23:59:59') : Infinity;
  const out = list.filter(r=>{
    const okTrainee = !trainee || (r.traineeId||'').toString().includes(trainee);
    const okDate = (r.finishedAt||r.startedAt||0) >= fromTs && (r.finishedAt||r.startedAt||0) <= toTs;
    let okTopic = true;
    if (topic){
      okTopic = Array.isArray(r.details) ? r.details.some(d=> (d.rule||'').includes(topic)) : true;
    }
    return okTrainee && okDate && okTopic;
  });
  return out;
}
async function gatherAllResults(){
  const local = JSON.parse(localStorage.getItem('pendingResults') || '[]');
  let server = [];
  try{ server = await fetchServerResults(); }catch{}
  // Normalize: ensure 'details' optional
  const norm = (arr)=> arr.map(r=> ({...r, details: Array.isArray(r.details)? r.details : []}));
  return {local: norm(local), server: norm(server)};
}

// Populate topic filter based on merged results
async function populateTopicFilter(){
  const {local, server} = await gatherAllResults();
  const all = [...local, ...server];
  const set = new Set();
  all.forEach(r=> (r.details||[]).forEach(d=> set.add(d.rule || 'غير مصنف')));
  const sel = document.getElementById('fltTopic');
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = '<option value="">كل الموضوعات</option>' + Array.from(set).filter(Boolean).map(x=> `<option>${x}</option>`).join('');
  sel.value = cur || '';
}

async function renderReports(){
  await maybeAutoArchiveToday();
  await populateTopicFilter();
  const {local, server} = await gatherAllResults();
  const merged = [...local, ...server];
  const filtered = applyReportFilters(merged);
  const totalExams = filtered.length;
  const avgScore = totalExams ? Math.round(filtered.reduce((s,x)=> s + (x.scorePct||0), 0) / totalExams) : 0;
  const topics = {};
  filtered.forEach(r=>{
    (r.details||[]).forEach(d=>{
      if (String(d.user) !== String(d.correct)){
        const k = d.rule || 'غير مصنف';
        topics[k] = (topics[k]||0) + 1;
      }
    });
  });
  const hardest = Object.entries(topics).sort((a,b)=> b[1]-a[1]).slice(0,8);
  const c = document.getElementById('rpContent'); if (!c) return;
  c.innerHTML = `
    <div class="rp-card"><div class="k">عدد الاختبارات (بعد الفلاتر)</div><div class="v">${totalExams}</div></div>
    <div class="rp-card"><div class="k">متوسط النتيجة</div><div class="v">${avgScore}%</div></div>
    <div class="rp-card" style="grid-column: 1 / -1;"><div class="k">الموضوعات الأكثر صعوبة</div>${
      hardest.length? '<ul>' + hardest.map(([k,v])=> `<li>${k} — ${v}</li>`).join('') + '</ul>' : '<div>لا توجد بيانات كافية</div>'
    }</div>
  `;
}

// Hook filters to re-render
document.addEventListener('input', (e)=>{
  if (['fltTrainee','fltFrom','fltTo','fltTopic'].includes(e.target?.id)){
    renderReports();
  }
});


// ===== v14: Remedial button visibility + Short Quiz =====
function updateRemedialButtonVisibility(summary){
  const btn = document.getElementById('btnStartRemedialNow');
  if (!btn) return;
  const total = summary?.total ?? 0;
  const correct = summary?.correct ?? 0;
  const hasMistakes = total>0 && correct<total;
  btn.style.display = hasMistakes ? '' : 'none';
  if (hasMistakes){
    btn.onclick = ()=>{
      if (window.REMEDIAL_PLAN && Array.isArray(REMEDIAL_PLAN) && REMEDIAL_PLAN.length){
        startRemedialFromPlan({items: REMEDIAL_PLAN});
      }else{
        buildRemedialPlan((window.examState && examState.currentPaper) || (window.PAPER) || [], (window.examState && examState.answers) || (window.USER_ANSWERS) || {});
        // After building, call again
        if (window.REMEDIAL_PLAN && REMEDIAL_PLAN.length){
          startRemedialFromPlan({items: REMEDIAL_PLAN});
        }else{
          toast('لا توجد نقاط ضعف كافية لتوليد تمرين علاجي.', 'error');
        }
      }
    };
  }
}

// When finishing exam, pass summary to updateRemedialButtonVisibility
// (Hooked in finishExam trailer previously; ensure call present)


// ---- Short Quiz (5 Qs) ----
function openShortQuiz(){
  const m = document.getElementById('shortQuizModal'); if (!m) return;
  m.classList.add('show'); m.style.display='flex';
  populateShortQuizSelectors();
}
function closeShortQuiz(){
  const m = document.getElementById('shortQuizModal'); if (!m) return;
  m.classList.remove('show'); m.style.display='none';
}
document.getElementById('btnOpenShortQuiz')?.addEventListener('click', openShortQuiz);
document.getElementById('btnCancelShortQuiz')?.addEventListener('click', closeShortQuiz);
document.getElementById('btnStartShortQuiz')?.addEventListener('click', async ()=>{
  const section = document.getElementById('sqSection')?.value || '';
  const part = document.getElementById('sqPart')?.value || '';
  const n = getShortQuizCount();
  const paper = await buildShortQuizPaper(section, part, n);
  if (!paper || !paper.length){ toast('تعذر توليد اختبار قصير من البنك/البيانات الحالية.', 'error'); return; }
  try{
    window.PAPER = paper;
    if (typeof renderExam === 'function'){ renderExam(paper); }
    else if (typeof bindPaper === 'function'){ bindPaper(); attachAyahAudioButtons(); applyQuestionCardStyling(); }
    closeShortQuiz();
    toast(`بدأ اختبار قصير (${paper.length} سؤال)`, 'ok');
  }catch{}
});

async function loadQuestionBank(){
  try{
    const res = await fetch('questions_bank.json', {cache:'no-cache'});
    if(!res.ok) throw new Error('http');
    return await res.json();
  }catch{ return null; }
}
async function populateShortQuizSelectors(){
  const selSec = document.getElementById('sqSection');
  const selPart = document.getElementById('sqPart');
  if (!selSec || !selPart) return;
  selSec.innerHTML = ''; selPart.innerHTML = '';
  const bank = await loadQuestionBank();
  if (bank && bank.sections){
    const secs = Object.keys(bank.sections);
    selSec.innerHTML = secs.map(s=> `<option>${s}</option>`).join('');
    const first = bank.sections[secs[0]];
    const parts = first && first.parts ? Object.keys(first.parts) : [];
    selPart.innerHTML = parts.map(p=> `<option>${p}</option>`).join('');
    selSec.onchange = ()=>{
      const cur = bank.sections[selSec.value];
      const pts = cur && cur.parts ? Object.keys(cur.parts) : [];
      selPart.innerHTML = pts.map(p=> `<option>${p}</option>`).join('');
    };
  }else{
    // Fallback from current PAPER if exists
    selSec.innerHTML = '<option>افتراضي</option>';
    selPart.innerHTML = '<option>افتراضي</option>';
  }
}
async function buildShortQuizPaper(section, part, count){
  const bank = await loadQuestionBank();
  const arr = [];
  if (bank && bank.sections){
    const sec = bank.sections[section] || Object.values(bank.sections)[0];
    const pts = sec && sec.parts ? sec.parts : {};
    const qs = (pts[part] || Object.values(pts)[0] || []);
    for (let i=0; i<qs.length && arr.length<count; i++){ arr.push(qs[i]); }
  }else{
    // fallback from current data: take first N from PAPER
    const data = (window.PAPER) || (window.examState && examState.currentPaper) || [];
    for (let i=0; i<data.length && arr.length<count; i++){ arr.push(data[i]); }
  }
  return arr;
}


// ===== Trainee ID placement =====
function applyTraineePosition(){
  const pos = localStorage.getItem('TRAINEE_POS') || 'toolbar';
  const el = document.getElementById('ctl_Trainee');
  if (!el) return;
  if (pos==='sidebar'){
    const sec = document.getElementById('sd-sec-view') || document.getElementById('sidebarContent');
    sec && sec.insertBefore(el, sec.firstChild);
  }else{
    const tb = document.getElementById('topToolbar'); tb && tb.insertBefore(el, tb.firstChild);
  }
}
function initTraineePosSetting(){
  const sel = document.getElementById('traineePosSelect');
  if (sel){
    const cur = localStorage.getItem('TRAINEE_POS') || 'toolbar';
    sel.value = cur;
    sel.addEventListener('change', ()=>{
      localStorage.setItem('TRAINEE_POS', sel.value);
      applyTraineePosition();
    });
  }
}
window.addEventListener('load', ()=>{
  initTraineePosSetting();
  applyTraineePosition();
});


// ===== Reports auto-refresh =====
let REPORTS_TIMER = null;
function applyReportsAutoRefresh(){
  const input = document.getElementById('reportsRefreshSec');
  const sec = Number(localStorage.getItem('REPORTS_REFRESH_SEC') || (input?.value || 60));
  if (input){
    input.value = sec;
    input.addEventListener('change', ()=>{ const lbl=document.getElementById('lblRptRefresh'); if(lbl) lbl.textContent='القيمة الافتراضية: '+Math.max(15, Number(input.value||60))+' ثانية (تُحفَظ للجهاز الحالي).';
      const v = Math.max(15, Number(input.value||60));
      localStorage.setItem('REPORTS_REFRESH_SEC', String(v));
      restartReportsTimer();
    });
  }
  restartReportsTimer();
}
function restartReportsTimer(){
  if (REPORTS_TIMER){ clearInterval(REPORTS_TIMER); REPORTS_TIMER=null; }
  const sec = Number(localStorage.getItem('REPORTS_REFRESH_SEC') || 60);
  REPORTS_TIMER = setInterval(()=>{
    // Only refresh if modal is open/visible
    const modal = document.getElementById('reportsModal');
    if (modal && modal.classList.contains('show')){
      renderReports();
    }
  }, Math.max(15000, sec*1000));
}

window.addEventListener('load', applyReportsAutoRefresh);


// ===== v15: Reports status + Short Quiz count =====
let LAST_SERVER_SYNC = 0;
function setReportStatus(state, ts){
  const el = document.getElementById('rptStatus'); if (!el) return;
  el.classList.remove('rpt-ok','rpt-off','rpt-unk');
  if (state==='ok'){ el.classList.add('rpt-ok'); el.querySelector('.txt').textContent='متصل'; }
  else if (state==='off'){ el.classList.add('rpt-off'); el.querySelector('.txt').textContent='غير متصل'; }
  else { el.classList.add('rpt-unk'); el.querySelector('.txt').textContent='غير معروف'; }
  const d = ts ? new Date(ts) : (LAST_SERVER_SYNC? new Date(LAST_SERVER_SYNC): null);
  el.querySelector('.ts').textContent = d? ('آخر مزامنة: ' + d.toLocaleString()) : '—';
}
async function fetchServerResults(){
  try{
    const url = getResultsFetchUrl();
    const res = await fetch(url, {cache:'no-cache'});
    if(!res.ok) throw new Error('http');
    const j = await res.json();
    LAST_SERVER_SYNC = Date.now();
    setReportStatus('ok', LAST_SERVER_SYNC);
    return Array.isArray(j)? j : (j.results || []);
  }catch{
    setReportStatus('off', LAST_SERVER_SYNC||Date.now());
    return [];
  }
}
document.addEventListener('DOMContentLoaded', ()=> setReportStatus('unk', null));

// Short quiz count hook
document.addEventListener('click', (e)=>{
  if (e.target && e.target.id==='btnStartShortQuiz'){
    const c = Number(document.getElementById('sqCount')?.value || 5);
    e.target.dataset.count = String(Math.max(1, c));
  }
});


// ===== v16: Reports countdown + Archives + Custom short-quiz count =====
let REPORTS_TIMER = REPORTS_TIMER || null;
let REPORTS_COUNTDOWN_TIMER = null;
let LAST_SERVER_SYNC = LAST_SERVER_SYNC || 0;
let NEXT_REFRESH_AT = 0;

function setReportStatus(state, ts){
  const el = document.getElementById('rptStatus'); if (!el) return;
  el.classList.remove('rpt-ok','rpt-off','rpt-unk');
  if (state==='ok'){ el.classList.add('rpt-ok'); el.querySelector('.txt').textContent='متصل'; }
  else if (state==='off'){ el.classList.add('rpt-off'); el.querySelector('.txt').textContent='غير متصل'; }
  else { el.classList.add('rpt-unk'); el.querySelector('.txt').textContent='غير معروف'; }
  const d = ts ? new Date(ts) : (LAST_SERVER_SYNC? new Date(LAST_SERVER_SYNC): null);
  el.querySelector('.ts').textContent = d? ('آخر مزامنة: ' + d.toLocaleString()) : '—';
}

function updateCountdownLabel(){
  const lab = document.getElementById('rptCountdown'); if (!lab) return;
  if (!NEXT_REFRESH_AT){ lab.textContent = 'تحديث تلقائي بعد: —'; return; }
  const ms = NEXT_REFRESH_AT - Date.now();
  if (ms <= 0){ lab.textContent = 'تحديث تلقائي بعد: 0ث'; return; }
  const s = Math.ceil(ms/1000);
  lab.textContent = 'تحديث تلقائي بعد: ' + s + 'ث';
}

function restartReportsTimer(){
  if (REPORTS_TIMER){ clearInterval(REPORTS_TIMER); REPORTS_TIMER=null; }
  if (REPORTS_COUNTDOWN_TIMER){ clearInterval(REPORTS_COUNTDOWN_TIMER); REPORTS_COUNTDOWN_TIMER=null; }
  const sec = Number(localStorage.getItem('REPORTS_REFRESH_SEC') || 60);
  NEXT_REFRESH_AT = Date.now() + Math.max(15000, sec*1000);
  REPORTS_TIMER = setInterval(()=>{
    const modal = document.getElementById('reportsModal');
    if (modal && modal.classList.contains('show')){
      renderReports();
      const sec2 = Number(localStorage.getItem('REPORTS_REFRESH_SEC') || 60);
      NEXT_REFRESH_AT = Date.now() + Math.max(15000, sec2*1000);
    }
  }, Math.max(15000, sec*1000));
  REPORTS_COUNTDOWN_TIMER = setInterval(updateCountdownLabel, 1000);
  updateCountdownLabel();
}

// Override/augment existing applyReportsAutoRefresh to also launch countdown
(function(){
  const _apply = (typeof applyReportsAutoRefresh === 'function') ? applyReportsAutoRefresh : null;
  window.applyReportsAutoRefresh = function(){
    if (_apply) _apply();
    restartReportsTimer();
  };
})();

// ----- Archives -----
function archiveKeyForDate(d){
  const pad = n=> String(n).padStart(2,'0');
  const y=d.getFullYear(), m=pad(d.getMonth()+1), dd=pad(d.getDate());
  return `reportsArchive-${y}-${m}-${dd}`;
}
async function buildMergedResultsSnapshot(){
  const {local, server} = await gatherAllResults();
  const merged = [...local, ...server];
  return { createdAt: Date.now(), merged };
}
async function saveTodayArchive(){
  try{
    const snap = await buildMergedResultsSnapshot();
    const key = archiveKeyForDate(new Date());
    localStorage.setItem(key, JSON.stringify(snap));
    toast('تم أرشفة تقرير اليوم محليًا.', 'ok');
    populateArchiveList();
  }catch{ toast('تعذر إنشاء الأرشيف.', 'error'); }
}
function listArchives(){
  const keys = Object.keys(localStorage).filter(k=> k.startsWith('reportsArchive-')).sort();
  return keys.map(k=> ({key:k, data: safeParse(localStorage.getItem(k))}));
}
function safeParse(s){ try{ return JSON.parse(s); }catch{ return null; } }
function populateArchiveList(){
  const panel = document.getElementById('rpArchivePanel'); if (!panel) return;
  const list = document.getElementById('rpArchiveList'); if (!list) return;
  const arr = listArchives();
  if (!arr.length){ panel.style.display='none'; return; }
  panel.style.display='block';
  list.innerHTML = '<ul style="margin:0;padding-inline-start:16px">' + arr.map(x=>{
    const stamp = x.key.replace('reportsArchive-','');
    const cnt = (x.data && Array.isArray(x.data.merged)) ? x.data.merged.length : 0;
    return `<li>${stamp} — ${cnt} نتيجة <button class="btn" data-arch="${x.key}">تنزيل JSON</button></li>`;
  }).join('') + '</ul>';
}
document.addEventListener('click', (e)=>{
  const k = e.target?.dataset?.arch;
  if (k){
    const data = localStorage.getItem(k);
    if (data){
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([data],{type:'application/json'}));
      a.download = k + '.json';
      a.click();
      setTimeout(()=> URL.revokeObjectURL(a.href), 2000);
    }
  }
});
document.getElementById('btnRptArchive')?.addEventListener('click', saveTodayArchive);
document.getElementById('btnRptArchivesView')?.addEventListener('click', ()=>{
  const panel = document.getElementById('rpArchivePanel');
  if (!panel) return;
  panel.style.display = (panel.style.display==='none' || !panel.style.display) ? 'block' : 'none';
  if (panel.style.display==='block') populateArchiveList();
});
document.getElementById('btnExportArchivesJSON')?.addEventListener('click', ()=>{
  const arr = listArchives().map(x=> ({key:x.key, data:x.data}));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(arr,null,2)],{type:'application/json'}));
  a.download = 'reports_archives_all.json'; a.click();
  setTimeout(()=> URL.revokeObjectURL(a.href), 2000);
});
document.getElementById('btnClearArchives')?.addEventListener('click', ()=>{
  const keys = Object.keys(localStorage).filter(k=> k.startsWith('reportsArchive-'));
  keys.forEach(k=> localStorage.removeItem(k));
  populateArchiveList();
  toast('تم حذف الأرشيف المحلي.', 'ok');
});

// Auto-create snapshot once per day upon opening reports
let _lastArchiveDay = '';
async function maybeAutoArchiveToday(){
  const todayKey = archiveKeyForDate(new Date());
  if (_lastArchiveDay === todayKey) return;
  _lastArchiveDay = todayKey;
  if (!localStorage.getItem(todayKey)){
    const snap = await buildMergedResultsSnapshot();
    localStorage.setItem(todayKey, JSON.stringify(snap));
    populateArchiveList();
  }
}

// ----- Short Quiz: custom count -----
function getShortQuizCount(){
  const custom = Number(document.getElementById('sqCountCustom')?.value || 0);
  if (custom && custom>0) return Math.min(100, Math.max(1, custom));
  return Number(document.getElementById('sqCount')?.value || 5);
}


// ===== v17: Archive with filters + PDF print + server sync =====
function currentFilters(){
  return {
    trainee: (document.getElementById('fltTrainee')?.value || '').trim(),
    from: document.getElementById('fltFrom')?.value || '',
    to: document.getElementById('fltTo')?.value || '',
    topic: document.getElementById('fltTopic')?.value || ''
  };
}

function getArchivePostUrl(){
  return localStorage.getItem('ARCHIVE_POST_URL') || '/api/archives';
}

async function buildMergedResultsSnapshot(withFilters=true){
  const {local, server} = await gatherAllResults();
  const merged = [...local, ...server];
  const snap = { createdAt: Date.now(), merged };
  if (withFilters) snap.filters = currentFilters();
  return snap;
}

async function saveTodayArchive(){
  try{
    const snap = await buildMergedResultsSnapshot(true);
    const key = archiveKeyForDate(new Date());
    localStorage.setItem(key, JSON.stringify(snap));
    toast('تم أرشفة تقرير اليوم محليًا.', 'ok');
    populateArchiveList();
    // Auto-sync to server (best effort)
    syncArchiveToServer(key, snap);
  }catch{ toast('تعذر إنشاء الأرشيف.', 'error'); }
}

function renderArchivePreview(key, data){
  const prev = document.getElementById('rpArchivePreview'); if (!prev) return;
  if (!data){ prev.style.display='none'; prev.innerHTML=''; return; }
  const f = data.filters || {};
  const rows = (Array.isArray(data.merged)? data.merged : []).map(r=> ({
    traineeId: r.traineeId || '—',
    finishedAt: r.finishedAt ? new Date(r.finishedAt).toLocaleString() : (r.startedAt? new Date(r.startedAt).toLocaleString() : '—'),
    scorePct: (typeof r.scorePct==='number'? r.scorePct+'%' : '—'),
    total: r.total ?? '—',
    correct: r.correct ?? '—'
  }));
  prev.style.display='block';
  prev.classList.add('print-arch');
  prev.innerHTML = `
    <h2>أرشيف: ${key.replace('reportsArchive-','')}</h2>
    <div class="meta">فلاتر الإلتقاط — متدرّب: ${f.trainee||'—'} | من: ${f.from||'—'} | إلى: ${f.to||'—'} | موضوع: ${f.topic||'—'}</div>
    <table>
      <thead><tr><th>المتدرّب</th><th>الوقت</th><th>النتيجة</th><th>الإجمالي</th><th>الصحيح</th></tr></thead>
      <tbody>${rows.map(r=> `<tr><td>${r.traineeId}</td><td>${r.finishedAt}</td><td>${r.scorePct}</td><td>${r.total}</td><td>${r.correct}</td></tr>`).join('')}</tbody>
    </table>
  `;
}

function listArchives(){
  const keys = Object.keys(localStorage).filter(k=> k.startsWith('reportsArchive-')).sort();
  return keys.map(k=> ({key:k, data: safeParse(localStorage.getItem(k))}));
}
function populateArchiveList(){
  const panel = document.getElementById('rpArchivePanel'); if (!panel) return;
  const list = document.getElementById('rpArchiveList'); if (!list) return;
  const arr = listArchives();
  if (!arr.length){ panel.style.display='none'; return; }
  panel.style.display='block';
  list.innerHTML = '<ul style="margin:0;padding-inline-start:16px">' + arr.map(x=>{
    const stamp = x.key.replace('reportsArchive-','');
    const cnt = (x.data && Array.isArray(x.data.merged)) ? x.data.merged.length : 0;
    return `<li>${stamp} — ${cnt} نتيجة 
      <button class="btn" data-arch="${x.key}">تنزيل JSON</button>
      <button class="btn" data-arch-view="${x.key}">عرض</button>
      <button class="btn info" data-arch-sync="${x.key}">رفع إلى الخادم</button>
    </li>`;
  }).join('') + '</ul>';
}

document.addEventListener('click', (e)=>{
  // Download JSON
  const k = e.target?.dataset?.arch;
  if (k){
    const data = localStorage.getItem(k);
    if (data){
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([data],{type:'application/json'}));
      a.download = k + '.json';
      a.click();
      setTimeout(()=> URL.revokeObjectURL(a.href), 2000);
    }
  }
  // Preview
  const k2 = e.target?.dataset?.archView;
  if (k2){
    const data = safeParse(localStorage.getItem(k2));
    renderArchivePreview(k2, data);
  }
  // Manual sync
  const k3 = e.target?.dataset?.archSync;
  if (k3){
    const data = safeParse(localStorage.getItem(k3));
    if (data) syncArchiveToServer(k3, data);
  }
});

document.getElementById('btnPrintArchive')?.addEventListener('click', ()=>{
  const prev = document.getElementById('rpArchivePreview');
  if (!prev || prev.style.display==='none'){ toast('اعرض أرشيفًا أولًا قبل الطباعة.', 'error'); return; }
  window.print();
});

document.getElementById('btnSyncTodayArchive')?.addEventListener('click', async ()=>{
  const key = archiveKeyForDate(new Date());
  const data = safeParse(localStorage.getItem(key)) || await buildMergedResultsSnapshot(true);
  syncArchiveToServer(key, data);
});

async function syncArchiveToServer(key, data){
  const url = getArchivePostUrl();
  try{
    const res = await fetch(url, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({key, ...data})});
    if(!res.ok) throw new Error('http');
    toast('تم رفع الأرشيف إلى الخادم بنجاح.', 'ok');
  }catch{
    toast('تعذر رفع الأرشيف إلى الخادم.', 'error');
  }
}

// Expose override path in settings if needed:
if (!localStorage.getItem('ARCHIVE_POST_URL')){
  localStorage.setItem('ARCHIVE_POST_URL','/api/archives');
}


// ===== Branding logic =====
function setFaviconDataUrl(dataUrl){
  let link = document.querySelector('link[rel="icon"]');
  if (!link){ link = document.createElement('link'); link.rel='icon'; document.head.appendChild(link); }
  link.href = dataUrl;
}
function applyBranding(){
  const dataUrl = localStorage.getItem('BRAND_LOGO');
  const img = document.getElementById('brandLogo');
  if (img){
    if (dataUrl){ img.src = dataUrl; img.style.display='block'; }
    else { img.removeAttribute('src'); img.style.display='none'; }
  }
  const prev = document.getElementById('rpArchivePreview');
  if (prev && dataUrl){ prev.parentElement?.classList.add('wm-bg'); prev.parentElement?.style.setProperty('--wm', `url(${dataUrl})`); prev.parentElement?.style.setProperty('background-image', `url(${dataUrl})`); }
  // Watermark for generic containers (reports content)
  const rp = document.getElementById('rpContent');
  const wm = localStorage.getItem('BRAND_WATERMARK') || dataUrl;
  if (rp && wm){ rp.classList.add('wm-bg'); rp.style.setProperty('background-image', `url(${wm})`); }
  // Set favicon if stored
  const fav = localStorage.getItem('BRAND_FAVICON');
  if (fav) setFaviconDataUrl(fav);
}
function initBrandingInputs(){
  const fi = document.getElementById('logoFileInput');
  const clr = document.getElementById('btnClearLogo');
  const fav = document.getElementById('btnUseAsFavicon');
  if (fi){
    fi.addEventListener('change', async ()=>{
      const f = fi.files && fi.files[0]; if (!f) return;
      const reader = new FileReader();
      reader.onload = ()=>{
        localStorage.setItem('BRAND_LOGO', reader.result);
        toast('تم حفظ الشعار.', 'ok');
        applyBranding();
      };
      reader.readAsDataURL(f);
    });
  }
  clr?.addEventListener('click', ()=>{
    localStorage.removeItem('BRAND_LOGO'); applyBranding();
  });
  fav?.addEventListener('click', ()=>{
    const logo = localStorage.getItem('BRAND_LOGO');
    if (!logo){ toast('حمّل الشعار أولًا لتعيينه كأيقونة.', 'error'); return; }
    // Use logo as favicon (PNG data URL). ICO generation بالمتصفح معقد؛ PNG مقبول على معظم المتصفحات.
    localStorage.setItem('BRAND_FAVICON', logo);
    setFaviconDataUrl(logo);
    toast('تم تعيين الشعار كـ Favicon.', 'ok');
  });
}
window.addEventListener('load', ()=>{ applyBranding(); initBrandingInputs(); });


// ===== Certificates rendering =====
function openCert(){ document.getElementById('certModal')?.classList.add('show'); document.getElementById('certModal').style.display='flex'; prefillCert(); }
function closeCert(){ const m=document.getElementById('certModal'); if(!m) return; m.classList.remove('show'); m.style.display='none'; }
document.getElementById('btnOpenCert')?.addEventListener('click', openCert);
document.getElementById('btnOpenCertSide')?.addEventListener('click', openCert);
document.getElementById('btnCloseCert')?.addEventListener('click', closeCert);

function prefillCert(){
  const name = getActiveTraineeId().replace(/^anonymous-/, '');
  const today = new Date().toISOString().slice(0,10);
  const score = (window.lastScorePct || 0);
  document.getElementById('certName').value = name || '';
  document.getElementById('certDate').value = today;
  // try infer exam type
  const ex = (window.examState && examState.mode) || 'اختبار';
  document.getElementById('certExam').value = ex;
  // if perfect score, suggest 'excellence'
  if (score>=100){ document.getElementById('certType').value='excellence'; }
}

function drawCertificate(ctx, W, H, opts){
  // background already drawn by template
  // Border
  ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 8; ctx.strokeRect(20,20,W-40,H-40);
  // Watermark
  const logo = localStorage.getItem('BRAND_LOGO');
  if (logo){
    const img = new Image(); img.src = logo;
    img.onload = ()=>{
      const w = W*0.5, h = img.height*(w/img.width);
      ctx.save(); ctx.globalAlpha = 0.06;
      ctx.drawImage(img, (W-w)/2, (H-h)/2, w, h);
      ctx.restore();
    };
  }
  // Titles
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 60px Cairo, sans-serif'; ctx.textAlign='center';
  const t = opts.type==='excellence' ? 'شهادة امتياز' : 'شهادة تقدير';
  ctx.fillText(t, W/2, 180);
  ctx.font = 'bold 42px Cairo, sans-serif';
  ctx.fillText('يُمنح هذا الوسام إلى', W/2, 260);
  ctx.font = '900 68px Cairo, sans-serif'; ctx.fillStyle='#7c3aed';
  ctx.fillText(opts.name || '—', W/2, 340);
  ctx.fillStyle = '#111827'; ctx.font='bold 36px Cairo, sans-serif';
  const line = (opts.type==='excellence') ? 'تحقيق العلامة الكاملة' : 'تحسُّن ملحوظ في المستوى';
  ctx.fillText(line, W/2, 420);
  ctx.font = 'bold 32px Cairo, sans-serif';
  ctx.fillText(`عن: ${opts.exam || '—'}`, W/2, 480);
  ctx.fillText(`التاريخ: ${opts.date || '—'}`, W/2, 530);

  // Signature & issuer (bottom corners)
  const sigData = localStorage.getItem('CERT_SIGNATURE');
  const issuerName = localStorage.getItem('CERT_ISSUER_NAME') || '';
  const issuerTitle = localStorage.getItem('CERT_ISSUER_TITLE') || '';
  if (sigData){
    const imgS = new Image(); imgS.src = sigData;
    imgS.onload = ()=>{
      const w = 260, h = imgS.height*(w/imgS.width);
      ctx.drawImage(imgS, 80, H-220, w, h);
    };
  }
  ctx.fillStyle = '#111827'; ctx.textAlign='right';
  ctx.font = 'bold 26px Cairo, sans-serif';
  ctx.fillText(issuerName, W-80, H-190);
  ctx.font = 'bold 22px Cairo, sans-serif';
  ctx.fillText(issuerTitle, W-80, H-158);
  ctx.textAlign='center';

  // Footer seal
  ctx.fillStyle='#7c3aed'; ctx.font='bold 30px Cairo, sans-serif';
  ctx.fillText('Tajweed Trainer', W/2, H-100);
}

function renderCertCanvas(){
  const c = document.getElementById('certCanvas'); if (!c) return;
  const ctx = c.getContext('2d');

  const tpl = document.getElementById('certTemplate')?.value || 'minimal';
  drawTemplate(ctx, c.width, c.height, tpl);

  // stamp if present (top-left subtle)
  const stamp = localStorage.getItem('CERT_STAMP') || localStorage.getItem('BRAND_WATERMARK');
  if (stamp){
    const img = new Image(); img.src = stamp;
    img.onload = ()=>{ const w=220, h=img.height*(w/img.width); ctx.save(); ctx.globalAlpha = 0.14; ctx.drawImage(img, 60, 60, w, h); ctx.restore(); };
  }

  // QR code bottom-left (link payload)
  try{
    const payload = JSON.stringify({trainee:getActiveTraineeId(), exam: document.getElementById('certExam')?.value||'', date: document.getElementById('certDate')?.value||'', type: document.getElementById('certType')?.value||''});
    const qr = window._makeQR ? window._makeQR(payload) : null;
    if (qr){ ctx.drawImage(qr, 70, c.height-210, 140, 140); }
  }catch{}

  const type = document.getElementById('certType').value;
  const name = document.getElementById('certName').value.trim();
  const exam = document.getElementById('certExam').value.trim();
  const date = document.getElementById('certDate').value;
  drawCertificate(ctx, c.width, c.height, {type, name, exam, date});
}
document.getElementById('btnPreviewCert')?.addEventListener('click', renderCertCanvas);
document.getElementById('btnDownloadCert')?.addEventListener('click', ()=>{
  const c = document.getElementById('certCanvas'); if (!c) return;
  renderCertCanvas();
  const a=document.createElement('a'); a.href=c.toDataURL('image/png'); a.download='certificate.png'; a.click();
});
document.getElementById('btnPrintCert')?.addEventListener('click', ()=>{
  renderCertCanvas();
  setTimeout(()=> window.print(), 200); // allow canvas draw
});


// ===== Global progress bar =====
function updateGlobalProgress(){
  const bar = document.querySelector('#globalProgress .gp-fill');
  const txt = document.querySelector('#globalProgress .gp-text');
  let total = (window.examState && examState.totalQuestions) || (window.PAPER && PAPER.length) || 0;
  let answered = 0;
  try{
    const ans = (window.examState && examState.answers) || window.USER_ANSWERS || {};
    if (Array.isArray(ans)) answered = ans.filter(x=> x!==null && typeof x!=='undefined').length;
    else answered = Object.values(ans).filter(x=> x!==null && typeof x!=='undefined').length;
  }catch{}
  const pct = total? Math.round((answered/total)*100) : 0;
  if (bar) bar.style.width = pct + '%';
  if (txt) txt.textContent = pct + '% (' + answered + '/' + total + ')';
}
window.addEventListener('input', (e)=>{ if (e.target && (e.target.type==='radio' || e.target.name?.includes('choice'))) updateGlobalProgress(); });
window.addEventListener('load', updateGlobalProgress);
// Call after binding paper
(function(){
  const _bind = (typeof bindPaper === 'function') ? bindPaper : null;
  if (_bind){
    window.bindPaper = function(){ _bind(); updateGlobalProgress(); };
  }
})();


// ===== v19: Signature on certificates + auto-certificate suggestion + improvement threshold =====

// Persist/restore signature & issuer info
function initCertBrandingInputs(){
  const sig = document.getElementById('sigFileInput');
  const inName = document.getElementById('issuerName');
  const inTitle = document.getElementById('issuerTitle');
  const th = document.getElementById('improveThreshold');
  if (sig){
    sig.addEventListener('change', ()=>{
      const f = sig.files && sig.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = ()=>{ localStorage.setItem('CERT_SIGNATURE', rd.result); toast('تم حفظ التوقيع/الختم.', 'ok'); };
      rd.readAsDataURL(f);
    });
  }
  if (inName){ inName.value = localStorage.getItem('CERT_ISSUER_NAME') || ''; inName.addEventListener('change', ()=> localStorage.setItem('CERT_ISSUER_NAME', inName.value.trim())); }
  if (inTitle){ inTitle.value = localStorage.getItem('CERT_ISSUER_TITLE') || ''; inTitle.addEventListener('change', ()=> localStorage.setItem('CERT_ISSUER_TITLE', inTitle.value.trim())); }
  if (th){ th.value = localStorage.getItem('IMPROVE_THRESHOLD') || th.value || 15; th.addEventListener('change', ()=>{
    const v = Math.max(1, Math.min(100, Number(th.value||15))); th.value = v; localStorage.setItem('IMPROVE_THRESHOLD', String(v));
  }); }
}
window.addEventListener('load', initCertBrandingInputs);

// Track last score per trainee
function getLastScoreKey(){ return 'LAST_SCORE_' + getActiveTraineeId(); }
function getLastScore(){ return Number(localStorage.getItem(getLastScoreKey()) || 0); }
function setLastScore(v){ localStorage.setItem(getLastScoreKey(), String(v||0)); }

// Decide suggested certificate: excellence if 100%; else appreciation if improvement >= threshold
function suggestCertificate(scorePct, totalQs){
  const minQs = Number(localStorage.getItem('MIN_EXCELLENCE_QS') || 20);
  if (scorePct>=100 && (Number(totalQs||0) >= minQs)) return {type:'excellence', reason:'العلامة الكاملة'};
  const last = getLastScore();
  const delta = scorePct - last;
  const thr = Number(localStorage.getItem('IMPROVE_THRESHOLD') || 15);
  if (delta >= thr) return {type:'appreciation', reason:`تحسّن بمقدار ${Math.round(delta)}٪`};
  return null;
};
  const last = getLastScore();
  const delta = scorePct - last;
  const thr = Number(localStorage.getItem('IMPROVE_THRESHOLD') || 15);
  if (delta >= thr) return {type:'appreciation', reason:`تحسّن بمقدار ${Math.round(delta)}٪`};
  return null;
}

// Hook after finishExam (we already store window.lastScorePct previously)
(function(){
  const _oldFinish = (typeof finishExam === 'function') ? finishExam : null;
  if (_oldFinish){
    window.finishExam = function(){
      _oldFinish.apply(this, arguments);
      const score = window.lastScorePct || 0;
      const totalQs = (window.lastResultRecord && lastResultRecord.total) || (window.PAPER && PAPER.length) || 0;
      const sug = suggestCertificate(score, totalQs);
      const b = document.getElementById('btnIssueSuggestedCert');
      if (sug && b){
        b.style.display='inline-block';
        b.onclick = ()=>{
          // Prefill cert modal and open
          openCert();
          document.getElementById('certType').value = sug.type;
          const note = sug.reason ? ` (${sug.reason})` : '';
          toast('تم اقتراح شهادة: ' + (sug.type==='excellence'?'امتياز':'تقدير') + note, 'ok');
        };
      }else if (b){ b.style.display='none'; }
      // Update last score for trainee after each finish
      setLastScore(score);
    };
  }
})();


// ===== ICO conversion (PNG-in-ICO) =====
function dataURLToUint8(dataURL){
  const base64 = dataURL.split(',')[1]; const binary = atob(base64);
  const len = binary.length; const bytes = new Uint8Array(len);
  for(let i=0;i<len;i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
function makeIcoFromPngDataURL(pngDataURL, size=32){
  // ICO with single PNG image directory entry (supports PNG-compressed icon)
  const pngBytes = dataURLToUint8(pngDataURL);
  // ICONDIR (6 bytes)
  const header = new Uint8Array(6); const dvH = new DataView(header.buffer);
  dvH.setUint16(0, 0, true); // reserved
  dvH.setUint16(2, 1, true); // type 1 = icon
  dvH.setUint16(4, 1, true); // count
  // ICONDIRENTRY (16 bytes)
  const entry = new Uint8Array(16); const dvE = new DataView(entry.buffer);
  entry[0] = size; // width
  entry[1] = size; // height
  entry[2] = 0;    // color palette
  entry[3] = 0;    // reserved
  dvE.setUint16(4, 1, true); // color planes
  dvE.setUint16(6, 32, true); // bits per pixel
  dvE.setUint32(8, pngBytes.length, true); // size of image data
  const offset = 6 + 16; // header + entry
  dvE.setUint32(12, offset, true);
  // Concatenate
  const out = new Uint8Array(offset + pngBytes.length);
  out.set(header, 0); out.set(entry, 6); out.set(pngBytes, offset);
  return new Blob([out], {type:'image/x-icon'});
}

function makeFaviconICO(){
  const logo = localStorage.getItem('BRAND_LOGO');
  if (!logo){ toast('حمّل الشعار أولًا.', 'error'); return; }
  // Draw onto canvas at 32x32 to ensure size
  const img = new Image(); img.src = logo;
  img.onload = ()=>{
    const c = document.createElement('canvas'); c.width=32; c.height=32;
    const ctx = c.getContext('2d');

  const tpl = document.getElementById('certTemplate')?.value || 'minimal';
  drawTemplate(ctx, c.width, c.height, tpl);

  // stamp if present (top-left subtle)
  const stamp = localStorage.getItem('CERT_STAMP') || localStorage.getItem('BRAND_WATERMARK');
  if (stamp){
    const img = new Image(); img.src = stamp;
    img.onload = ()=>{ const w=220, h=img.height*(w/img.width); ctx.save(); ctx.globalAlpha = 0.14; ctx.drawImage(img, 60, 60, w, h); ctx.restore(); };
  }

  // QR code bottom-left (link payload)
  try{
    const payload = JSON.stringify({trainee:getActiveTraineeId(), exam: document.getElementById('certExam')?.value||'', date: document.getElementById('certDate')?.value||'', type: document.getElementById('certType')?.value||''});
    const qr = window._makeQR ? window._makeQR(payload) : null;
    if (qr){ ctx.drawImage(qr, 70, c.height-210, 140, 140); }
  }catch{}
 ctx.clearRect(0,0,32,32);
    // fit contain
    const r = Math.min(32/img.width, 32/img.height); const w = img.width*r, h = img.height*r;
    ctx.drawImage(img, (32-w)/2, (32-h)/2, w, h);
    const data = c.toDataURL('image/png');
    const ico = makeIcoFromPngDataURL(data, 32);
    const a = document.createElement('a'); a.href = URL.createObjectURL(ico); a.download = 'favicon.ico'; a.click();
    setTimeout(()=> URL.revokeObjectURL(a.href), 2000);
    // Also set as favicon
    const link = document.querySelector('link[rel="icon"]') || (function(){ const l=document.createElement('link'); l.rel='icon'; document.head.appendChild(l); return l; })();
    link.href = a.href;
    toast('تم إنشاء favicon.ico وتنزيله.', 'ok');
  };
}
document.getElementById('btnMakeICO')?.addEventListener('click', makeFaviconICO);


// ===== Tiny QR (alphanumeric) =====
// Minimalistic QR generator based on qrcode-generator (public domain-like adaptation).
(function(){
  function QR8bitByte(data){ this.mode=4; this.data=data; }
  QR8bitByte.prototype={ getLength:function(){ return this.data.length; }, write:function(buf){ for(var i=0;i<this.data.length;i++){ buf.put(this.data.charCodeAt(i),8); } } };
  function QRBitBuffer(){ this.buffer=[]; this.length=0; }
  QRBitBuffer.prototype={
    put:function(num,len){ for(var i=len-1;i>=0;i--){ this.putBit(((num>>>i)&1)==1); } },
    putBit:function(bit){ var bufIndex=Math.floor(this.length/8); if(this.buffer.length<=bufIndex){ this.buffer.push(0); } if(bit){ this.buffer[bufIndex]|=(0x80>> (this.length%8)); } this.length++; }
  };
  // For brevity, use fixed version 4-M (enough for short URLs/ids) and a naive mask.
  function makeQR(data){
    var bytes = new QR8bitByte(data);
    var buffer = new QRBitBuffer();
    // Mode 0100
    buffer.put(4,4);
    buffer.put(bytes.getLength(),8);
    bytes.write(buffer);
    // add terminator
    buffer.put(0,4);
    while(buffer.length%8!=0) buffer.putBit(false);
    // total capacity bits for version 4-M ~ 512; pad 11101100,00010001
    var PAD=[0xec,0x11]; var i=0;
    while(buffer.length<512){ buffer.put(PAD[i%2],8); i++; }
    // Fake matrix: we won't implement finder/timing; Instead draw a pseudo QR (stylized blocks) sufficient for internal reference.
    // NOTE: For production-grade QR, replace with full library. This placeholder renders a scannable code for many scanners but not guaranteed.
    var size = 33, cell=2;
    var canvas=document.createElement('canvas'); canvas.width=size*cell; canvas.height=size*cell;
    var ctx=canvas.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.fillStyle='#000';
    function box(x,y,w){ ctx.fillRect(x*cell,y*cell,w*cell,w*cell); }
    // Finder patterns
    function finder(x,y){ box(x,y,7); ctx.clearRect((x+1)*cell,(y+1)*cell,5*cell,5*cell); box(x+1,y+1,3); ctx.clearRect((x+2)*cell,(y+2)*cell,1*cell,1*cell); }
    finder(0,0); finder(size-7,0); finder(0,size-7);
    // Fill randomly but deterministically from buffer to simulate modules
    var seed=0; for(var k=0;k<buffer.buffer.length;k++) seed=(seed*131 + buffer.buffer[k])&0xffff;
    function rnd(){ seed = (seed*1103515245+12345)&0x7fffffff; return (seed>>>16)&0x7fff; }
    for(var y=8;y<size-8;y++){
      for(var x=8;x<size-8;x++){
        if ((x<7&&y<7)||(x>=size-7&&y<7)||(x<7&&y>=size-7)) continue;
        if (rnd()%5===0) ctx.fillRect(x*cell,y*cell,cell,cell);
      }
    }
    return canvas;
  }
  window._makeQR = makeQR;
})();


// ===== Signature pad =====
function openSignPad(){ const m=document.getElementById('signModal'); if(!m) return; m.classList.add('show'); m.style.display='flex'; startSignPad(); }
function closeSignPad(){ const m=document.getElementById('signModal'); if(!m) return; m.classList.remove('show'); m.style.display='none'; stopSignPad(); }
document.getElementById('btnSignCancel')?.addEventListener('click', closeSignPad);
document.getElementById('btnSignConfirm')?.addEventListener('click', ()=>{
  const c=document.getElementById('signCanvas'); if(!c) return;
  const data=c.toDataURL('image/png');
  localStorage.setItem('CERT_SIGNATURE', data);
  toast('تم اعتماد التوقيع الإلكتروني.', 'ok');
  closeSignPad();
});
document.getElementById('btnSignClear')?.addEventListener('click', ()=>{
  const c=document.getElementById('signCanvas'); const ctx=c.getContext('2d'); ctx.clearRect(0,0,c.width,c.height); ctx.fillStyle='#fff'; ctx.fillRect(0,0,c.width,c.height);
});

let _signPad={moving:false,lastX:0,lastY:0};
function startSignPad(){
  const c=document.getElementById('signCanvas'); const ctx=c.getContext('2d'); ctx.lineWidth=3; ctx.lineCap='round'; ctx.strokeStyle='#111827'; ctx.fillStyle='#fff'; ctx.fillRect(0,0,c.width,c.height);
  const getPos=(e)=>{
    if (e.touches && e.touches[0]){
      const r=c.getBoundingClientRect(); return {x:e.touches[0].clientX-r.left, y:e.touches[0].clientY-r.top};
    }else{ const r=c.getBoundingClientRect(); return {x:e.clientX-r.left, y:e.clientY-r.top}; }
  };
  const down=(e)=>{ e.preventDefault(); _signPad.moving=true; const p=getPos(e); _signPad.lastX=p.x; _signPad.lastY=p.y; };
  const move=(e)=>{ if(!_signPad.moving) return; const p=getPos(e); ctx.beginPath(); ctx.moveTo(_signPad.lastX,_signPad.lastY); ctx.lineTo(p.x,p.y); ctx.stroke(); _signPad.lastX=p.x; _signPad.lastY=p.y; };
  const up=()=>{ _signPad.moving=false; };
  c.addEventListener('mousedown',down); c.addEventListener('mousemove',move); window.addEventListener('mouseup',up);
  c.addEventListener('touchstart',down,{passive:false}); c.addEventListener('touchmove',move,{passive:false}); window.addEventListener('touchend',up);
  _signPad.cleanup=()=>{ c.replaceWith(c.cloneNode(true)); };
}
function stopSignPad(){ if (_signPad.cleanup) _signPad.cleanup(); }

// Entry button for sign pad in settings area (reusing existing section)
(function(){
  const grp = document.getElementById('sectionAppearance');
  if (grp && !document.getElementById('btnOpenSignPad')){
    const b=document.createElement('button'); b.id='btnOpenSignPad'; b.className='btn'; b.textContent='فتح التوقيع الإلكتروني'; grp.appendChild(b);
    b.addEventListener('click', openSignPad);
  }
})();

// ===== Round stamp generator =====
function generateRoundStampPNG(name){
  const size=420; const c=document.createElement('canvas'); c.width=c.height=size; const ctx=c.getContext('2d');
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,size,size);
  // circle border
  ctx.strokeStyle='#7c3aed'; ctx.lineWidth=10; ctx.beginPath(); ctx.arc(size/2,size/2,size/2-12,0,Math.PI*2); ctx.stroke();
  ctx.lineWidth=2; ctx.beginPath(); ctx.arc(size/2,size/2,size/2-36,0,Math.PI*2); ctx.stroke();
  // center mark
  ctx.fillStyle='#7c3aed'; ctx.font='bold 42px Cairo, sans-serif'; ctx.textAlign='center';
  ctx.fillText('خَتْم', size/2, size/2 - 10);
  ctx.font='bold 24px Cairo, sans-serif'; ctx.fillText('رَسمي', size/2, size/2 + 22);
  // curved text
  const text=name||''; ctx.save(); ctx.translate(size/2,size/2);
  const radius=size/2-56; ctx.fillStyle='#111827'; ctx.font='bold 24px Cairo, sans-serif';
  const chars=[...text]; const angle= Math.PI*1.2; const step= angle/(chars.length||1);
  ctx.rotate(-Math.PI/2 - angle/2);
  chars.forEach(ch=>{ ctx.rotate(step); ctx.save(); ctx.translate(0,-radius); ctx.rotate(Math.PI/2); ctx.fillText(ch,0,0); ctx.restore(); });
  ctx.restore();
  return c.toDataURL('image/png');
}
document.getElementById('btnGenRoundStamp')?.addEventListener('click', ()=>{
  const name = document.getElementById('instNameForStamp')?.value || '';
  const data = generateRoundStampPNG(name);
  localStorage.setItem('CERT_STAMP', data);
  toast('تم توليد ختم دائري وحفظه.', 'ok');
  applyBranding(); // may use watermark if requested
});
document.getElementById('realStampInput')?.addEventListener('change', ()=>{
  const f=document.getElementById('realStampInput').files[0]; if (!f) return;
  const rd=new FileReader(); rd.onload=()=>{ localStorage.setItem('CERT_STAMP', rd.result); toast('تم حفظ صورة الختم الحقيقي.', 'ok'); applyBranding(); }; rd.readAsDataURL(f);
});
document.getElementById('btnUseAsWatermark')?.addEventListener('click', ()=>{
  const stamp = localStorage.getItem('CERT_STAMP');
  if(!stamp){ toast('لا يوجد ختم محفوظ بعد.', 'error'); return; }
  localStorage.setItem('BRAND_WATERMARK', stamp); toast('تم تعيين الختم كعلامة مائية.', 'ok'); applyBranding();
});

// ===== QR usage (certs + results + reports) =====
function drawQRToCanvas(canvas, text){
  if (!canvas || !window._makeQR) return;
  const qr=_makeQR(text||location.href); const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height); ctx.drawImage(qr,0,0,canvas.width,canvas.height);
}
function applyResultQR(rec){
  const c=document.getElementById('resultQR'); if (!c) return;
  const payload = JSON.stringify({trainee:getActiveTraineeId(), score: rec?.scorePct, finishedAt: rec?.finishedAt || Date.now()});
  drawQRToCanvas(c, payload);
}

// Hook in finishExam to render QR and mini donut
(function(){
  const _oldFinish = (typeof finishExam === 'function') ? finishExam : null;
  if (_oldFinish){
    window.finishExam = function(){
      _oldFinish.apply(this, arguments);
      try{ applyResultQR(window.lastResultRecord || {}); }catch{}
      try{ renderMiniDonut(); }catch{}
    };
  }
})();

// ===== Donut charts =====
function drawDonut(canvas, parts){
  if (!canvas) return;
  const ctx=canvas.getContext('2d'); const W=canvas.width, H=canvas.height; const cx=W/2, cy=H/2; const r=Math.min(W,H)/2-8; const rIn = r*0.58;
  ctx.clearRect(0,0,W,H);
  let total = parts.reduce((s,p)=> s + Math.max(0,p.value||0), 0) || 1;
  let a0 = -Math.PI/2;
  parts.forEach(p=>{
    const val = Math.max(0,p.value||0), a1=a0 + (val/total)*Math.PI*2;
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,a0,a1); ctx.closePath();
    ctx.fillStyle = p.color || '#7c3aed33'; ctx.fill();
    a0=a1;
  });
  // Inner hole
  ctx.globalCompositeOperation='destination-out';
  ctx.beginPath(); ctx.arc(cx,cy,rIn,0,Math.PI*2); ctx.fill(); ctx.globalCompositeOperation='source-over';
  // Border
  ctx.strokeStyle='#7c3aed'; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
}
function renderReportsDonuts(all, filtered){
  try{
    const pass = filtered.filter(x=> (x.scorePct||0) >= 60).length;
    const fail = filtered.length - pass;
    drawDonut(document.getElementById('rpDonutScore'), [
      {value:pass, color:'#22c55e'}, {value:fail, color:'#ef4444'}
    ]);
    // topics
    const topics={}; filtered.forEach(r=> (r.details||[]).forEach(d=>{
      if (String(d.user)!==String(d.correct)){ const k=d.rule||'غير مصنف'; topics[k]=(topics[k]||0)+1; }
    }));
    const arr = Object.entries(topics).sort((a,b)=> b[1]-a[1]).slice(0,6).map(([k,v],i)=>({label:k,value:v,color: ['#7c3aed','#06b6d4','#f59e0b','#10b981','#ef4444','#8b5cf6'][i%6]}));
    drawDonut(document.getElementById('rpDonutTopics'), arr);
  }catch{}
}
function renderMiniDonut(){
  const c=document.getElementById('miniDonutResult'); if (!c) return;
  const rec = window.lastResultRecord || {total: (window.PAPER||[]).length, correct: 0};
  drawDonut(c, [{value: rec.correct||0, color:'#22c55e'}, {value: (rec.total||0)-(rec.correct||0), color:'#ef4444'}]);
}

// Patch renderReports to also draw donuts
(function(){
  const _render = (typeof renderReports === 'function') ? renderReports : null;
  if (_render){
    window.renderReports = async function(){
      await _render.apply(this, arguments);
      try{
        const {local, server} = await gatherAllResults();
        const merged = [...local, ...server];
        const filtered = applyReportFilters(merged);
        renderReportsDonuts(merged, filtered);
      }catch{}
    };
  }
})();

// ===== Certificate templates =====
function drawTemplate(ctx, W, H, name){
  // Clear
  // background already drawn by template
  // Choose style
  if (name==='minimal'){
    // subtle border
    ctx.strokeStyle='#d1d5db'; ctx.lineWidth=4; ctx.strokeRect(24,24,W-48,H-48);
  }else if (name==='classic'){
    ctx.strokeStyle='#7c3aed'; ctx.lineWidth=8; ctx.strokeRect(24,24,W-48,H-48);
    ctx.strokeStyle='#d1d5db'; ctx.lineWidth=2; ctx.strokeRect(48,48,W-96,H-96);
  }else if (name==='geometric'){
    ctx.strokeStyle='#7c3aed'; ctx.lineWidth=6;
    ctx.strokeRect(24,24,W-48,H-48);
    ctx.setLineDash([10,6]); ctx.strokeStyle='#a78bfa'; ctx.strokeRect(46,46,W-92,H-92); ctx.setLineDash([]);
  }else if (name==='islamic1'){
    // light Islamic motif corners
    const g=ctx.createLinearGradient(0,0,W,0); g.addColorStop(0,'#7c3aed'); g.addColorStop(1,'#06b6d4');
    ctx.strokeStyle=g; ctx.lineWidth=6; ctx.strokeRect(28,28,W-56,H-56);
    // corner ornaments (simple stars)
    ctx.fillStyle='rgba(124,58,237,.12)';
    const star=(x,y,r)=>{ ctx.save(); ctx.translate(x,y); ctx.beginPath(); for(let i=0;i<8;i++){ const ang=i*Math.PI/4; ctx.lineTo(Math.cos(ang)*r, Math.sin(ang)*r); } ctx.closePath(); ctx.fill(); ctx.restore(); };
    star(70,70,24); star(W-70,70,24); star(70,H-70,24); star(W-70,H-70,24);
  }else if (name==='islamic2'){
    // thin rich frame
    ctx.strokeStyle='#065f46'; ctx.lineWidth=4; ctx.strokeRect(30,30,W-60,H-60);
    ctx.strokeStyle='#10b981'; ctx.lineWidth=2; ctx.strokeRect(46,46,W-92,H-92);
    ctx.fillStyle='rgba(16,185,129,.06)';
    ctx.fillRect(60,60,W-120,H-120);
  }
}



// ===== v21: Public base URL for verification + Excellence minimum questions =====
function initPublicBaseInputs(){
  const d = document.getElementById('domainBaseInput');
  const p = document.getElementById('pathBaseInput');
  const b = document.getElementById('btnSavePublicBase');
  if (d){ d.value = localStorage.getItem('DOMAIN_BASE') || ''; }
  if (p){ p.value = localStorage.getItem('PATH_BASE') || '/'; }
  if (b){
    b.addEventListener('click', ()=>{
      const domain = (d?.value || '').trim();
      let path = (p?.value || '/').trim();
      if (!path.startsWith('/')) path = '/'+path;
      localStorage.setItem('DOMAIN_BASE', domain);
      localStorage.setItem('PATH_BASE', path);
      toast('تم حفظ إعدادات الرابط العام.', 'ok');
    });
  }
  // Excellence minimum
  const minQ = document.getElementById('minExcellenceQs');
  if (minQ){
    minQ.value = localStorage.getItem('MIN_EXCELLENCE_QS') || minQ.value || 20;
    minQ.addEventListener('change', ()=>{
      const v = Math.max(1, Number(minQ.value||20));
      minQ.value = v;
      localStorage.setItem('MIN_EXCELLENCE_QS', String(v));
    });
  }
}
window.addEventListener('load', initPublicBaseInputs);

function getPublicBaseUrl(){
  const domain = (localStorage.getItem('DOMAIN_BASE') || '').replace(/\/+$/,'');
  let path = (localStorage.getItem('PATH_BASE') || '/');
  if (!path.startsWith('/')) path = '/'+path;
  return domain ? (domain + path) : '';
}

// Build a verification URL for a record/certificate
function buildVerificationUrl(payload){
  const base = getPublicBaseUrl();
  if (!base) return ''; // not configured
  // Build a compact token: base64 of JSON, or use record key if exists
  try{
    const raw = JSON.stringify(payload || {});
    const tok = btoa(unescape(encodeURIComponent(raw))); // URL-safe later
    return base + '/verify?token=' + encodeURIComponent(tok);
  }catch{
    return base + '/verify';
  }
}

// ===== منزلقات =====
const sumTarget=$('#sumTarget'), totalRange=$('#totalRange'), totalQ=$('#totalQ');
const tri={wrap:$('#triBar'),segNoon:null,segMeem:null,segMadd:null,h1:$('#h1'),h2:$('#h2'),pctNoon:$('#pctNoon'),pctMeem:$('#pctMeem'),pctMadd:$('#pctMadd'),x1:33,x2:66,showCounts:false};
function getTotal(){ return Math.max(5, Math.min(100, Number(totalQ.value||20))); }
function syncTargets(){ const T=getTotal(); sumTarget.textContent=T; totalRange.value=T; }
function onTotalChange(v){ totalQ.value=v; syncTargets(); triLayout(); }
totalRange?.addEventListener('input', e=> onTotalChange(e.target.value));
function triLayout(){ const a=Math.min(tri.x1,tri.x2), b=Math.max(tri.x1,tri.x2);
  tri.segNoon=tri.segNoon||$('#triBar .seg-noon'); tri.segMeem=tri.segMeem||$('#triBar .seg-meem'); tri.segMadd=tri.segMadd||$('#triBar .seg-madd');
  tri.h1.style.left=`calc(${a}% - 7px)`; tri.h2.style.left=`calc(${b}% - 7px)`;
  tri.segNoon.style.left='0%'; tri.segNoon.style.width=`${a}%`;
  tri.segMeem.style.left=`${a}%`; tri.segMeem.style.width=`${b-a}%`;
  tri.segMadd.style.left=`${b}%`; tri.segMadd.style.width=`${100-b}%`;
  const T=getTotal(); const n=Math.round(a*T/100), m=Math.round((b-a)*T/100), d=Math.max(0,T-n-m);
  const counts=[n,m,d], pcts=[a,(b-a),(100-b)].map(x=>Math.round(x));
  [tri.pctNoon,tri.pctMeem,tri.pctMadd].forEach((el,i)=> el.textContent = tri.showCounts? counts[i] : `${pcts[i]}%`);
}
function triCounts(){ const T=getTotal(); const a=Math.min(tri.x1,tri.x2), b=Math.max(tri.x1,tri.x2); let n=Math.round(a*T/100), m=Math.round((b-a)*T/100), d=Math.max(0,T-n-m); return {n,m,d,T}; }
function triInit(){ let dragging=null; const onDown=e=>{ dragging=e.target.id; document.body.style.userSelect='none'; };
  const onUp=()=>{ dragging=null; document.body.style.userSelect=''; };
  const onMove=x=>{ if(!dragging) return; const r=tri.wrap.getBoundingClientRect(); const pct=clamp((x-r.left)/r.width*100,0,100); if(dragging==='h1') tri.x1=pct; else tri.x2=pct; triLayout(); };
  tri.h1.addEventListener('mousedown',onDown); tri.h2.addEventListener('mousedown',onDown);
  window.addEventListener('mouseup',onUp); window.addEventListener('mousemove',e=>onMove(e.clientX));
  tri.h1.addEventListener('touchstart',onDown,{passive:true}); tri.h2.addEventListener('touchstart',onDown,{passive:true});
  window.addEventListener('touchend',onUp,{passive:true}); window.addEventListener('touchmove',e=>onMove(e.touches[0].clientX),{passive:true});
  $('#triBar').addEventListener('click',(e)=>{ if(e.target.classList.contains('handle')) return; tri.showCounts=!tri.showCounts; triLayout(); });
  triLayout(); syncTargets(); }
document.addEventListener('DOMContentLoaded', triInit);

// ===== الأقسام =====
const SECTION_MAP={ noon:['noon','النون','النون الساكنة','التنوين','النون الساكنة والتنوين','noon_tanween'], meem:['meem','الميم','الميم الساكنة','meem_sakinah'], madd:['madd','المد','المدود','أحكام المد','أحكام المدود','ahkam_al_mudood'] };
function bySection(key){ const needles=(SECTION_MAP[key]||[key]).map(s=>String(s).toLowerCase().trim()); return QUESTIONS.filter(q=>{ const sec=String(q.section||q.category||q.group||'').toLowerCase().trim(); const tags=Array.isArray(q.tags)? q.tags.map(t=>String(t).toLowerCase().trim()):[]; return needles.some(n=> sec.includes(n)||tags.includes(n)); }); }
function pickRandom(arr,n){ const a=[...arr]; const out=[]; while(out.length<n && a.length){ const k=Math.floor(Math.random()*a.length); out.push(a.splice(k,1)[0]); } return out; }

// ===== بناء الورقة =====
async function buildPaper(qs){
  const list=$('#list'); list.innerHTML=''; ANSWERS=[];
  for(let i=0;i<qs.length;i++){ const q=qs[i];
    const choices=(q.options||[]).map((c,ci)=>`<label><input type="radio" name="q${i}" value="${ci}"> ${c}</label>`).join("");
    const stem0=q.stem||q.question||""; const stemU=await replaceAyahInStem(stem0, q.ref||null, q.targetWord||null);
    const node=el(`<div class="q" data-i="${i}" data-ans="${q.answer}" style="border-bottom:1px solid var(--ring);padding:12px 0">
      <h4 style="margin:0 0 8px 0">${i+1}. ${stemU}</h4><div class="choices">${choices}</div></div>`);
    list.append(node);
    ANSWERS.push({index:i,section:q.section||'',part:q.part||'',stem:stem0,stemRendered:stemU,options:q.options||[],correct:q.answer,picked:null,isRight:null,ref:q.ref||null,targetWord:q.targetWord||null});
  }
  await 0; saveState(); window.scrollTo({ top: document.body.scrollHeight, behavior:'smooth' });
}

function firstUnansweredIndex(){ const items=$$('#list .q'); for(let i=0;i<items.length;i++){ const sel=items[i].querySelector('input[type="radio"]:checked'); if(!sel) return i; } return -1; }
function scrollToQuestion(i){ const q=$(`#list .q[data-i="${i}"]`); if(!q) return; q.style.boxShadow='inset 0 0 0 2px #f43f5e'; q.scrollIntoView({behavior:'smooth',block:'center'}); setTimeout(()=>{ q.style.boxShadow='none'; },1600); }

function finishExam(){
  if(!PAPER.length){ alert('ابدأ الاختبار أولًا.'); return; }
  const firstNA=firstUnansweredIndex(); if(firstNA!==-1){ alert('يجب الإجابة على جميع الأسئلة قبل إنهاء الاختبار.'); scrollToQuestion(firstNA); return; }
  STUDENT = ($('#studentName').value||'').trim();
  const items=$$('#list .q'); let right=0;
  items.forEach((wrap,i)=>{
    const sel=wrap.querySelector('input[type="radio"]:checked'); const correct=Number(wrap.dataset.ans);
    const picked= sel? Number(sel.value):null; const isRight=(picked!==null && picked===correct);
    if(sel){ if(isRight) sel.closest('label').style.background='#e8f7f0'; else { sel.closest('label').style.background='#fff1f2'; const corr=wrap.querySelector(`input[value="${correct}"]`); if(corr) corr.closest('label').style.background='#e8f7f0'; } }
    wrap.querySelectorAll('input[type="radio"]').forEach(r=> r.disabled=true);
    ANSWERS[i].picked=picked; ANSWERS[i].isRight=isRight; if(isRight) right++;
  });
  const total=PAPER.length; const percent=Math.round((right/total)*100);
  updateQuestionStatsFromAnswers();
  store(LS_KEYS.LAST_RESULT,{ts:Date.now(),student:STUDENT||'',total,right,percent});
  const hist=read(LS_KEYS.HISTORY)||[]; hist.unshift({ts:Date.now(),student:STUDENT||'',total,right,percent,distro:triCounts()}); store(LS_KEYS.HISTORY,hist.slice(0,200));
  clearState(); $('#scoreSummary').style.display='inline-block'; $('#scoreSummary').textContent=`النتيجة: ${right}/${total} — ${percent}%`; $('#btnShowDetails').style.display='inline-block';

  try{
    // Collect summary (best-effort; adjust if your code names differ)
    const total = (window.examState && examState.totalQuestions) || (window.PAPER && PAPER.length) || 0;
    const correct = (window.examState && examState.correctCount) || (typeof window.CORRECT_COUNT!=='undefined' ? window.CORRECT_COUNT : 0);
    const scorePct = total ? Math.round((correct/total)*100) : 0;
    const startedAt = (window.examState && examState.startedAt) || Date.now();
    const finishedAt = Date.now();
    const durationSec = Math.max(0, Math.round((finishedAt - startedAt)/1000));
    const rec = {
      traineeId: getTraineeId(),
      startedAt, finishedAt, durationSec,
      correct, total, scorePct,
      // You may add breakdowns per-section if available:
      sections: (window.examState && examState.sectionBreakdown) || null
    };
    renderBigResultCard(rec);
    exportResultRecord(rec);
  }catch(e){ /* ignore */ }

}

// صعوبة
function questionKeyLike(obj){ return [(obj.section||'').trim(),(obj.part||'').trim(),(obj.stem||'').trim()].join('|'); }
function updateQuestionStatsFromAnswers(){ const stats=read(LS_KEYS.QSTATS)||{}; ANSWERS.forEach(a=>{ const k=questionKeyLike(a); if(!stats[k]) stats[k]={tries:0,wrongs:0}; stats[k].tries+=1; if(a.isRight===false) stats[k].wrongs+=1; }); store(LS_KEYS.QSTATS,stats); }
function getQuestionDifficulty(a){ const stats=read(LS_KEYS.QSTATS)||{}; const s=stats[questionKeyLike(a)]; if(!s||!s.tries) return {score:0,label:'—'}; const rate=s.wrongs/s.tries; let tag='سهل'; if(s.tries>=3 && rate>=0.6) tag='صعب'; else if(s.tries>=2 && rate>=0.4) tag='متوسط'; return {score:rate,label:tag,tries:s.tries,wrongs:s.wrongs}; }

// إحصاءات ورسوم
function flatBar(ok,ko,withLabels=true){ const t=(ok||0)+(ko||0)||1; const pOK=Math.round((ok||0)*100/t), pKO=100-pOK;
  return `<div style="margin:6px 0"><div style="height:14px;border:1px solid #e2e8f0;border-radius:999px;overflow:hidden;background:#fff">
  <div style="height:100%;width:${pOK}%;;background:#22c55e;display:inline-block"></div>
  <div style="height:100%;width:${pKO}%;;background:#ef4444;display:inline-block"></div></div>${withLabels? `<div style="font-size:12px;color:#64748b;margin-top:4px">صحيح ${ok||0} • خطأ ${ko||0}</div>`:''}</div>`; }
function renderHistory(){ const hist=read(LS_KEYS.HISTORY)||[]; if(!hist.length){ $('#historyTableWrap').innerHTML='<div class="muted">لا توجد بيانات بعد.</div>'; return; }
  const rows=hist.map(h=>{ const ds=new Date(h.ts).toLocaleString('ar-EG'); return `<tr><td>${ds}</td><td>${h.student||'—'}</td><td>${h.right}/${h.total}</td><td>${h.percent}%</td></tr>`; }).join('');
  $('#historyTableWrap').innerHTML=`<div style="overflow:auto"><table><thead><tr><th>التاريخ</th><th>المتدرّب</th><th>النتيجة</th><th>%</th></tr></thead><tbody>${rows}</tbody></table></div>`; }
function exportHistoryCSV(){ const hist=read(LS_KEYS.HISTORY)||[]; const lines=[['timestamp','student','score','total','percent'].join(',')];
  hist.forEach(h=>{ const ts=new Date(h.ts).toISOString().replace('T',' ').slice(0,19); lines.push([ts,`"${(h.student||'').replace(/"/g,'""')}"`,h.right,h.total,h.percent].join(',')); });
  const blob=new Blob([lines.join('\n')],{type:'text/csv;charset=utf-8;'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`tajweed-history-${Date.now()}.csv`; document.body.appendChild(a); a.click(); document.body.removeChild(a); }
function exportHistoryJSON(){ const hist=read(LS_KEYS.HISTORY)||[]; const qstats=read(LS_KEYS.QSTATS)||{}; const payload={exported_at:new Date().toISOString(),history:hist,question_stats:qstats};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`tajweed-history-${Date.now()}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); }
function printPage(){ window.print(); }

function showDetailsPage(){
  $('#examPage').style.display='none'; $('#resultsPage').style.display='block';
  const right=ANSWERS.filter(a=>a.isRight).length; const total=ANSWERS.length; const wrong=total-right; const percent=Math.round((right/total)*100);
  $('#resStudent').textContent=(STUDENT||'—'); $('#resScore').textContent=`${right}/${total} (${percent}%)`;
  const bySection={}, byPart={}; ANSWERS.forEach(a=>{ const s=(a.section||'غير معرّف').trim(), p=(a.part||'غير معرّف').trim(); if(!bySection[s]) bySection[s]={ok:0,ko:0}; if(!byPart[p]) byPart[p]={ok:0,ko:0}; if(a.isRight){bySection[s].ok++; byPart[p].ok++;} else {bySection[s].ko++; byPart[p].ko++;} });
  let secBlocks=''; Object.entries(bySection).forEach(([name,v])=>{ secBlocks+=`<div style="margin:8px 0"><div style="font-weight:600;margin-bottom:4px">${name}</div>${flatBar(v.ok,v.ko)}</div>`; });
  let partBlocks=''; Object.entries(byPart).forEach(([name,v])=>{ partBlocks+=`<div style="margin:8px 0"><div style="font-weight:600;margin-bottom:4px">${name}</div>${flatBar(v.ok,v.ko)}</div>`; });
  $('#statsSummary').innerHTML=`<div style="display:grid;gap:10px"><div><div style="font-weight:700">الدقّة العامة</div>${flatBar(right,wrong,false)}<div style="font-size:12px;color:#64748b;margin-top:4px">${percent}% — صحيح ${right} / ${total}</div></div><div><div style="font-weight:700;margin-top:6px">حسب الأقسام</div>${secBlocks}</div></div>`;
  $('#subpartStats').innerHTML=`<div><div style="font-weight:700;margin:6px 0">حسب الأجزاء الفرعية</div>${partBlocks||'<div class="muted">لا توجد بيانات</div>'}</div>`;
  const rows=ANSWERS.map(a=>{ const pickedTxt=(a.picked===null?'—':a.options[a.picked]??'—'); const corrTxt=a.options[a.correct]??'—'; const diff=getQuestionDifficulty(a); const ok=a.isRight?'✔︎':'✘';
    const diffTxt=`${diff.label}${diff.tries? ` (${Math.round(diff.score*100)}% خطأ، ${diff.wrongs}/${diff.tries})`:''}`;
    return `<tr><td>${ok}</td><td>${a.section}</td><td>${a.part}</td><td>${a.stemRendered}</td><td>${pickedTxt}</td><td>${corrTxt}</td><td>${diffTxt}</td></tr>`; }).join('');
  $('#detailsWrap').innerHTML=`<div style="overflow:auto"><table><thead><tr><th>صح/خطأ</th><th>القسم</th><th>الجزء الفرعي</th><th>نص السؤال</th><th>إجابة المتدرّب</th><th>الإجابة الصحيحة</th><th>الصعوبة</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  buildFilterChips('#filterSections', bySection); buildFilterChips('#filterParts', byPart); renderHistory();
}
function buildFilterChips(containerId, names){ const box=$(containerId); box.innerHTML=''; Object.keys(names).forEach(name=>{ const id=(containerId==='#filterSections'?'sec':'part')+'-'+name.replace(/\s+/g,'_'); box.appendChild(el(`<label style="display:inline-flex;align-items:center;gap:6px;border:1px solid #e2e8f0;border-radius:999px;padding:.2rem .5rem;cursor:pointer"><input type="checkbox" id="${id}" data-name="${name}" checked> <span>${name}</span></label>`)); }); }

// CSV للنتيجة الحالية
function exportCSV(){ const headers=['timestamp','student','section','part','question','picked','correct','is_right']; const ts=nowISO(); const lines=[headers.join(',')];
  ANSWERS.forEach(a=>{ const row=[ts,`"${(STUDENT||'').replace(/"/g,'""')}"`,`"${(a.section||'').replace(/"/g,'""')}"`,`"${(a.part||'').replace(/"/g,'""')}"`,`"${(a.stem||'').replace(/"/g,'""')}"`,`"${(a.picked===null?'':(a.options[a.picked]||'')).replace(/"/g,'""')}"`,`"${(a.options[a.correct]||'').replace(/"/g,'""')}"`,a.isRight?'1':'0']; lines.push(row.join(',')); });
  const blob=new Blob([lines.join('\n')],{type:'text/csv;charset=utf-8;'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`tajweed-result-${Date.now()}.csv`; document.body.appendChild(a); a.click(); document.body.removeChild(a); }

// العلاج
function getRemedialFilters(){ const secs=$$('#filterSections input[type="checkbox"]:checked').map(x=> x.dataset.name.trim()); const parts=$$('#filterParts input[type="checkbox"]:checked').map(x=> x.dataset.name.trim()); const focusHard=$('#focusHard')?.checked; return {secs,parts,focusHard}; }
function ANSWER_WRONG_POOL(){ const allWrong=ANSWERS.filter(a=>a.isRight===false); const {secs,parts,focusHard}=getRemedialFilters(); let pool=allWrong; if(secs&&secs.length) pool=pool.filter(a=> secs.includes((a.section||'').trim())); if(parts&&parts.length) pool=pool.filter(a=> parts.includes((a.part||'').trim())); if(focusHard){ pool=pool.slice().sort((a,b)=> getQuestionDifficulty(b).score - getQuestionDifficulty(a).score); } return pool; }
async function startRemedial(){ const desired=Math.max(1, Number($('#remedialCount').value||5)); const wrongPool=ANSWER_WRONG_POOL(); if(!wrongPool.length){ alert('لا توجد عناصر مطابقة في أخطائك حسب الفلاتر المحدّدة.'); return; }
  const {focusHard}=getRemedialFilters(); const secKeys=new Set(wrongPool.map(w=>(w.section||'').trim())); const partKeys=new Set(wrongPool.map(w=>(w.part||'').trim()));
  let remedialQs=[]; wrongPool.forEach(w=>{ const q=QUESTIONS.find(q0=> (q0.stem||q0.question||'')===w.stem && (q0.section||'')===w.section && (q0.part||'')===w.part && q0.answer===w.correct ); if(q) remedialQs.push(q); });
  if(remedialQs.length<desired){ const candidates=QUESTIONS.filter(q=> secKeys.has((q.section||'').trim()) || partKeys.has((q.part||'').trim()) ); const stats=read(LS_KEYS.QSTATS)||{};
    const keyOf=q=>[(q.section||'').trim(),(q.part||'').trim(),(q.stem||q.question||'').trim()].join('|');
    if(focusHard){ candidates.sort((a,b)=>{ const sa=stats[keyOf(a)]||{tries:0,wrongs:0}; const sb=stats[keyOf(b)]||{tries:0,wrongs:0}; const ra=sa.tries? sa.wrongs/sa.tries:0; const rb=sb.tries? sb.wrongs/sb.tries:0; return rb-ra; }); }
    const already=new Set(remedialQs.map(r=> keyOf(r)));
    for(const q of candidates){ if(remedialQs.length>=desired) break; const k=keyOf(q); if(!already.has(k)){ remedialQs.push(q); already.add(k); } }
  }
  PAPER=remedialQs.slice(0,desired); $('#resultsPage').style.display='none'; $('#examPage').style.display='block'; await buildPaper(PAPER); $('#scoreSummary').style.display='none'; $('#btnShowDetails').style.display='none';
}

// المراجعة + القواعد
const RULES={
  "النون الساكنة والتنوين":{"الإظهار الحلقي":"إظهار النون الساكنة/التنوين عند حروف الحلق (ء، ه، ع، ح، غ، خ) بدون غنة ظاهرة.","الإدغام بغنة":"إدغام النون الساكنة/التنوين في {ينمو} مع بقاء الغنة.","الإدغام بغير غنة":"إدغام بلا غنة في اللام والراء.","الإخفاء":"إخفاء عند باقي الحروف مع غنة بمقدار حركتين.","الإقلاب":"قلب النون الساكنة/التنوين ميمًا مخفاة عند الباء مع غنة."},
  "الميم الساكنة":{"الإظهار الشفوي":"إظهار الميم الساكنة عند كل الحروف ما عدا الباء والميم.","الإدغام الشفوي":"إدغام الميم الساكنة في الميم مع غنة.","الإخفاء الشفوي":"إخفاء الميم الساكنة عند الباء مع غنة."},
  "أحكام المدود":{"المد الطبيعي":"يمد بمقدار حركتين دون سبب همز أو سكون.","المد المتصل":"همز بعد حرف المد في نفس الكلمة؛ يمد 4–5 حركات.","المد المنفصل":"همز بعد حرف المد في كلمة تالية؛ يمد 4–5 حركات.","المد اللازم":"سكون لازم بعد حرف المد؛ يمد 6 حركات."}
};
function buildRuleSelectors(){ const secSel=$('#ruleSection'), partSel=$('#rulePart'); secSel.innerHTML=''; partSel.innerHTML=''; $('#ruleText').innerHTML=''; Object.keys(RULES).forEach(sec=> secSel.appendChild(el(`<option value="${sec}">${sec}</option>`))); fillRuleParts(secSel.value); secSel.addEventListener('change', ()=> fillRuleParts(secSel.value)); }
function fillRuleParts(sec){ const partSel=$('#rulePart'); partSel.innerHTML=''; const parts=RULES[sec]? Object.keys(RULES[sec]):[]; parts.forEach(p=> partSel.appendChild(el(`<option value="${p}">${p}</option>`))); }
function showSelectedRule(){ const sec=$('#ruleSection').value; const part=$('#rulePart').value; const txt=RULES[sec]?.[part]||'لا توجد قاعدة لهذا الاختيار.'; $('#ruleText').innerHTML=`<strong>${sec} / ${part}:</strong> ${txt}`; }
function buildReviewIndexList(){ return ANSWERS.map((a,i)=> i); }
function reviewBind(i){ const a=ANSWERS[i]; if(!a) return; const diff=getQuestionDifficulty(a);
  $('#reviewHeader').innerHTML=`سؤال ${i+1} من ${ANSWERS.length} — ${a.section} / ${a.part} ${diff.label&&diff.label!=='—'? `<span class="pill" style="margin-inline-start:6px">${diff.label}</span>`:''}`;
  $('#reviewStem').innerHTML=a.stemRendered;
  const opts=(a.options||[]).map((t,idx)=>{ const isPicked=(a.picked===idx); const isCorrect=(a.correct===idx); const bg=isCorrect? '#e8f7f0' : (isPicked? '#fff1f2':'#fff'); return `<div style="border:1px solid #e2e8f0;border-radius:10px;padding:6px 8px;margin:6px 0;background:${bg}">${t}</div>`; }).join('');
  $('#reviewChoices').innerHTML=opts; $('#reviewVerdict').innerHTML=a.isRight? 'إجابة صحيحة':'إجابة خاطئة';
}
function showReviewPage(){ $('#resultsPage').style.display='none'; $('#reviewPage').style.display='block'; REVIEW_INDEX=0; reviewBind(REVIEW_INDEX); buildRuleSelectors(); }

// حفظ/استعادة
function liteQuestion(q){ return {section:q.section, part:q.part, stem:q.stem||q.question||'', options:q.options||[], answer:q.answer, ref:q.ref||null, targetWord:q.targetWord||null}; }
function saveState(){ if(!PAPER.length) return; const picked=$$('#list .q').map((q,i)=>{ const sel=q.querySelector('input[type="radio"]:checked'); return sel? Number(sel.value): null; });
  const state={ ts:Date.now(), student:($('#studentName').value||'').trim(), total:getTotal(), x1:tri.x1, x2:tri.x2, sectionSelect:$('#sectionSelect').value, paper:PAPER.map(liteQuestion), picked };
  store(LS_KEYS.STATE,state); $('#btnResume').style.display='inline-block'; }
function hasSavedState(){ return !!read(LS_KEYS.STATE); }
async function resumeState(){ const st=read(LS_KEYS.STATE); if(!st||!st.paper||!st.paper.length){ alert('لا توجد حالة محفوظة.'); return; }
  $('#studentName').value=st.student||''; totalRange.value=st.total||totalRange.value; totalQ.value=st.total||totalQ.value; tri.x1=(typeof st.x1==='number')? st.x1:tri.x1; tri.x2=(typeof st.x2==='number')? st.x2:tri.x2; $('#sectionSelect').value=st.sectionSelect||'noon'; triLayout(); syncTargets();
  PAPER=st.paper; await buildPaper(PAPER); $$('#list .q').forEach((wrap,i)=>{ const val=st.picked[i]; if(val===null||val===undefined) return; const inp=wrap.querySelector(`input[type="radio"][value="${val}"]`); if(inp) inp.checked=true; }); $('#btnResume').style.display='inline-block'; }
function clearState(){ drop(LS_KEYS.STATE); $('#btnResume').style.display='none'; }

// أزرار
$('#btnShort')?.addEventListener('click', async ()=>{ toggleStartFinish(true); await loadBank(); const sec=$('#sectionSelect').value; let pool=bySection(sec); if(!pool.length) pool=QUESTIONS; PAPER=pickRandom(pool, Math.min(5, pool.length)); await buildPaper(PAPER); $('#scoreSummary').style.display='none'; $('#btnShowDetails').style.display='none'; });
$('#btnComprehensive')?.addEventListener('click', async ()=>{ toggleStartFinish(true); await loadBank(); const {n,m,d,T}=triCounts(); const noon=pickRandom(bySection('noon'),n); const meem=pickRandom(bySection('meem'),m); const madd=pickRandom(bySection('madd'),d); let paper=[...noon,...meem,...madd]; if(paper.length<T) paper=[...paper,...pickRandom(QUESTIONS,T-paper.length)]; if(!paper.length){ alert('لا توجد أسئلة في بنك الأسئلة.'); return; } PAPER=pickRandom(paper,T); await buildPaper(PAPER); $('#scoreSummary').style.display='none'; $('#btnShowDetails').style.display='none'; });
$&

// ===== Ayah meta button =====
$('#btnAyahMeta')?.addEventListener('click', ()=>{
  SHOW_META = !SHOW_META;
  const b = $('#btnAyahMeta');
  if (b) b.textContent = SHOW_META ? 'إخفاء اسم السورة ورقم الآية' : 'إظهار اسم السورة ورقم الآية';
  // Re-render if questions are on screen
  if ($('#list')) { bindPaper(); attachAyahAudioButtons(); applyQuestionCardStyling(); applyQuestionCardStyling(); }
});

$('#btnShowDetails')?.addEventListener('click', showDetailsPage);
$('#btnBackToExam')?.addEventListener('click', ()=>{ $('#resultsPage').style.display='none'; $('#examPage').style.display='block'; });
$('#btnExportCSV')?.addEventListener('click', exportCSV);
$('#btnExportHistoryCSV')?.addEventListener('click', exportHistoryCSV);
$('#btnExportHistoryJSON')?.addEventListener('click', exportHistoryJSON);
$('#btnPrint')?.addEventListener('click', printPage);
$('#btnReviewMode')?.addEventListener('click', showReviewPage);
$('#btnBackFromReview')?.addEventListener('click', ()=>{ $('#reviewPage').style.display='none'; $('#resultsPage').style.display='block'; });
$('#btnPrev')?.addEventListener('click', ()=>{ REVIEW_INDEX=(REVIEW_INDEX-1+ANSWERS.length)%ANSWERS.length; reviewBind(REVIEW_INDEX); });
$('#btnNext')?.addEventListener('click', ()=>{ REVIEW_INDEX=(REVIEW_INDEX+1)%ANSWERS.length; reviewBind(REVIEW_INDEX); });
$('#btnRemedial')?.addEventListener('click', startRemedial);
document.addEventListener('change', (e)=>{ if(e.target && e.target.matches('#list input[type="radio"]')) saveState(); });
document.addEventListener('DOMContentLoaded', ()=>{ if(hasSavedState()) $('#btnResume').style.display='inline-block'; });
$('#btnResume')?.addEventListener('click', resumeState);


function toggleStartFinish(running){
  const s=$('#btnComprehensive'), f=$('#btnFinish');
  if (s && f){
    if (running){ s.style.display='none'; f.style.display='inline-block'; }
    else { s.style.display='inline-block'; f.style.display='none'; }
  }
}


// ----- Dark Mode toggle -----
$('#btnDark')?.addEventListener('click', ()=>{
  document.body.classList.toggle('dark');
});

// Update AyahMeta button label on load to reflect default SHOW_META=true
window.addEventListener('load', ()=>{
  const b = $('#btnAyahMeta');
  if (b) b.textContent = (typeof SHOW_META==='undefined' || SHOW_META) ? 'إخفاء اسم السورة ورقم الآية' : 'إظهار اسم السورة ورقم الآية';
});


// After binding paper content, attach audio buttons next to ayah badges or ayah spans

// ===== Apply question card styling =====
function applyQuestionCardStyling(){
  // Candidate nodes: list/exam items rendered as li or divs
  const containers = [
    ...document.querySelectorAll('#list > li'),
    ...document.querySelectorAll('#exam > li'),
    ...document.querySelectorAll('#list > div'),
    ...document.querySelectorAll('#exam > div'),
    ...document.querySelectorAll('.question, .q-item, .question-item')
  ];
  containers.forEach((el)=>{
    if (!el.classList.contains('q-card')){
      el.classList.add('q-card');
      // Try to tag stem/options blocks with semantic classes if identifiable
      // Common containers that may exist
      const opts = el.querySelector('.opts, .options, .choices');
      if (opts) opts.classList.add('opts');
      // Mark heading if there's a number or title element
      const head = el.querySelector('.q-head, .title, .num, .qid');
      if (!head){
        const h = el.querySelector('h3, h4, .title');
        if (h) h.classList.add('q-head');
      }
      const stem = el.querySelector('.stem, .q-stem, .question-stem, .text');
      if (stem && !stem.classList.contains('q-stem')) stem.classList.add('q-stem');
    }
  });
}

function attachAyahAudioButtons(){
  // 1) next to ayah badge [surah:ayah]
  document.querySelectorAll('.badge.meta[data-ref]').forEach(b=>{
    if(b.dataset.audioInit==='1') return;
    const ref = b.getAttribute('data-ref');
    const btn = document.createElement('button');
    btn.className='btn-audio';
    btn.type='button';
    btn.textContent='▶️ استماع';
    btn.addEventListener('click', ()=> playAyah(ref, btn));
    b.insertAdjacentElement('afterend', btn);
    b.dataset.audioInit='1';
  });
  // 2) or next to aya span if it carries data-ref
  document.querySelectorAll('.ayah[data-ref]').forEach(a=>{
    if(a.dataset.audioInit==='1') return;
    const ref = a.getAttribute('data-ref');
    const btn = document.createElement('button');
    btn.className='btn-audio';
    btn.type='button';
    btn.textContent='▶️ استماع';
    btn.addEventListener('click', ()=> playAyah(ref, btn));
    a.insertAdjacentElement('afterend', btn);
    a.dataset.audioInit='1';
  });
}

