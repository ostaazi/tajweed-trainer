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
      const pt=PT[pk]||pk.replace(/_/g,' '); const isM=(sk==='ahkam_al_mudood');
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
$('#btnShort')?.addEventListener('click', async ()=>{ await loadBank(); const sec=$('#sectionSelect').value; let pool=bySection(sec); if(!pool.length) pool=QUESTIONS; PAPER=pickRandom(pool, Math.min(5, pool.length)); await buildPaper(PAPER); $('#scoreSummary').style.display='none'; $('#btnShowDetails').style.display='none'; });
$('#btnComprehensive')?.addEventListener('click', async ()=>{ await loadBank(); const {n,m,d,T}=triCounts(); const noon=pickRandom(bySection('noon'),n); const meem=pickRandom(bySection('meem'),m); const madd=pickRandom(bySection('madd'),d); let paper=[...noon,...meem,...madd]; if(paper.length<T) paper=[...paper,...pickRandom(QUESTIONS,T-paper.length)]; if(!paper.length){ alert('لا توجد أسئلة في بنك الأسئلة.'); return; } PAPER=pickRandom(paper,T); await buildPaper(PAPER); $('#scoreSummary').style.display='none'; $('#btnShowDetails').style.display='none'; });
$('#btnFinish')?.addEventListener('click', finishExam);
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
