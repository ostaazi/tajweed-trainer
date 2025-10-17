import { saveAttempt } from './storage.js';
async function loadBank(){const r=await fetch('questions_bank.json',{cache:'no-store'});if(!r.ok)throw new Error('questions_bank.json غير موجود');return r.json()}
function pickFivePerSubrule(o){const p=[],k=Object.keys(o);k.forEach(sr=>{const pool=o[sr]||[];const idx=shuffle([...pool.keys()]);const t=Math.min(5,pool.length);for(let i=0;i<t;i++){p.push({...pool[idx[i]],subRule:sr})}});return p}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function el(h){const t=document.createElement('template');t.innerHTML=h.trim();return t.content.firstElementChild}
function buildPaper(qs){const list=document.getElementById('list');list.innerHTML='';qs.forEach((q,i)=>{const ch=q.choices.map((c,ci)=>`<label><input type="radio" name="q${i}" value="${ci}"> ${c}</label>`).join("");
const node=el(`<div class="q" data-i="${i}" data-ans="${q.answer}" style="border-bottom:1px solid var(--ring);padding:12px 0">
<h4 style="margin:0 0 8px 0">${i+1}. ${q.stem} <span class="badge" style="border:1px solid var(--ring);padding:2px 8px;border-radius:999px">${q.rule||q.subRule||''}</span></h4><div class="choices">${ch}</div>
<div class="muted" style="margin-top:6px">${q.note?('معلومة: '+q.note):''}</div></div>`);list.append(node)})}
function scorePaper(qs){let r=0;qs.forEach((q,i)=>{const sel=document.querySelector(`input[name="q${i}"]:checked`);const wrap=document.querySelector(`.q[data-i="${i}"]`);if(!wrap)return;
wrap.querySelectorAll('label').forEach(l=>l.classList.remove('correct','wrong'));if(sel){const p=Number(sel.value),c=Number(q.answer);if(p===c){r++;sel.closest('label').style.background='#e8f7f0'}else{sel.closest('label').style.background='#fff1f2';const corr=wrap.querySelector(`input[value="${c}"]`);if(corr)corr.closest('label').style.background='#e8f7f0'}}});return r}
function updateBar(d,t){document.getElementById('bar').style.width=(Math.round((d/t)*100))+'%'}
let BANK=null,PAPER=[];document.addEventListener('DOMContentLoaded',async()=>{const mb=document.getElementById('modeBtn');const apply=()=>{const dark=localStorage.getItem('taj_MODE')==='dark';document.documentElement.classList.toggle('dark',dark);mb.innerText=dark?'🌞':'🌓'};apply();mb.onclick=()=>{localStorage.setItem('taj_MODE',localStorage.getItem('taj_MODE')==='dark'?'light':'dark');apply()};
try{BANK=await loadBank()}catch(e){alert(e.message);return}const start=document.getElementById('start'),startFull=document.getElementById('startFull'),paper=document.getElementById('paper'),submit=document.getElementById('submit'),reset=document.getElementById('reset'),sectionSel=document.getElementById('section'),list=document.getElementById('list');
function beginSection(){const sec=sectionSel.value,secObj=BANK[sec];if(!secObj){alert('البنك لا يحتوي هذا القسم');return}PAPER=pickFivePerSubrule(secObj);document.getElementById('summary').style.display='none';buildPaper(PAPER);paper.style.display='block';updateBar(0,PAPER.length);list.addEventListener('change',onPick,{once:true})}
function beginFull(){const parts=['noon_tanween','meem_sakinah','madd'];PAPER=[];parts.forEach(p=>{const secObj=BANK[p];if(secObj)PAPER.push(...pickFivePerSubrule(secObj).slice(0,5))});document.getElementById('summary').style.display='none';buildPaper(PAPER);paper.style.display='block';updateBar(0,PAPER.length);list.addEventListener('change',onPick,{once:true})}
function onPick(){const total=PAPER.length,done=Array.from(document.querySelectorAll('.q')).filter(q=>q.querySelector('input:checked')).length;updateBar(done,total);list.addEventListener('change',onPick,{once:true})}
start.onclick=beginSection;startFull.onclick=beginFull;submit.onclick=()=>{if(PAPER.length===0)return;const right=scorePaper(PAPER),total=PAPER.length,score=Math.round((right/total)*100),name=(document.getElementById('studentName')?.value||'').trim();
const rows=PAPER.map((q,i)=>{const pickedEl=document.querySelector(`input[name="q${i}"]:checked`);const picked=pickedEl?Number(pickedEl.value):null;return{stem:q.stem,picked:picked!=null?q.choices[picked]:null,correct:q.choices[q.answer],rule:q.rule||q.subRule||'',why:q.note||'',ok:picked===q.answer}});
saveAttempt({name,mode:'quiz',section:({noon_tanween:'النون الساكنة والتنوين',meem_sakinah:'الميم الساكنة',madd:'أحكام المدود'})[sectionSel.value]||'شامل',subRule:'—',when:new Date().toLocaleString('ar-EG'),ts:Date.now(),right,total,score,rows});
const summ=document.getElementById('summary');summ.style.display='block';summ.textContent=`النتيجة: ${right}/${total} (${score}%)`;window.scrollTo({top:summ.offsetTop-80,behavior:'smooth'})};
reset.onclick=()=>{PAPER=[];document.getElementById('summary').style.display='none';document.getElementById('list').innerHTML='';document.getElementById('bar').style.width='0%'};
});

// === Tajweedy patches (non-invasive) ===
(function(){
  // Paint [[...]] into spans (only inside .question-text)
  function paintTargets(root){
    try{
      root = root || document;
      const qs = root.querySelectorAll('.question-text, .q-text, .question');
      qs.forEach(el=>{
        if(el.__painted) return;
        el.innerHTML = el.innerHTML.replace(/\[\[([\s\S]+?)\]\]/g, '<span class="ayah-target">$1</span>');
        el.__painted = true;
      });
    }catch(e){ console.warn('paintTargets error', e); }
  }
  window.paintTargets = paintTargets;

  // Observe question list to repaint when content changes
  const list = document.getElementById('list') || document.querySelector('.questions') || document.body;
  const mo = new MutationObserver(()=>paintTargets(list));
  mo.observe(list,{childList:true, subtree:true});
  document.addEventListener('DOMContentLoaded', ()=>paintTargets());

  // Theme toggle (fallback if site provides App.initTheme)
  const modeBtn = document.getElementById('modeBtn');
  if(modeBtn){
    try{ if(window.App && App.initTheme) App.initTheme('modeBtn'); }catch{}
    modeBtn.addEventListener('click', ()=>{
      document.body.classList.toggle('dark');
      try{ localStorage.setItem('tajweedy-theme', document.body.classList.contains('dark')?'dark':'light'); }catch{}
    });
    try{
      const saved = localStorage.getItem('tajweedy-theme');
      if(saved==='dark') document.body.classList.add('dark');
    }catch{}
  }

  // End-quiz confirmation if unanswered exist
  function countUnanswered(){
    const inputs = Array.from(document.querySelectorAll('input[type="radio"]'));
    const names = [...new Set(inputs.map(i=>i.name))];
    let unanswered = 0;
    names.forEach(n=>{
      const group = inputs.filter(i=>i.name===n);
      if(!group.some(i=>i.checked)) unanswered++;
    });
    return unanswered;
  }
  function wireFinish(id){
    const btn = document.getElementById(id);
    if(!btn) return;
    btn.addEventListener('click', (ev)=>{
      const u = countUnanswered();
      if(u>0){
        ev.preventDefault();
        const modal = document.getElementById('confirmModal');
        const txt = document.getElementById('confirmText');
        if(modal){
          if(txt) txt.textContent = 'هناك '+u+' سؤال/أسئلة غير مُجاب عنها. هل تريد الرجوع لإكمالها، أم الإنهاء على أي حال؟';
          modal.style.display='grid';
          modal.querySelector('#backToQuiz').onclick = ()=>{ modal.style.display='none'; };
          modal.querySelector('#finishAnyway').onclick = ()=>{
            modal.style.display='none';
            actuallyFinish();
          };
          return;
        }
      }
      actuallyFinish();
    });
  }
  function actuallyFinish(){
    if(window.App && App.grade) return App.grade();
    if(typeof window.gradeQuiz === 'function') return window.gradeQuiz();
    // Fallback: submit underlying form if exists
    const f = document.querySelector('form'); if(f) f.submit();
  }
  wireFinish('submit');
  wireFinish('submitBottom');

  // Keep the main question text normal size; target gets emphasis via CSS.
})();
