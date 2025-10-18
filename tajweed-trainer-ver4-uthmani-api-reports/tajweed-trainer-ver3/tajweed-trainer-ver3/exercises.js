import { saveAttempt } from './storage.js';
async function loadJSON(n){const r=await fetch(n,{cache:'no-store'});if(!r.ok)throw new Error(n+' غير موجود');return r.json()}
function pickNFromSection(o,n=5){const pool=Object.keys(o).flatMap(k=>(o[k]||[]).map(q=>({...q,subRule:k})));const idx=shuffle([...pool.keys()]);const t=Math.min(n,pool.length);const p=[];for(let i=0;i<t;i++)p.push(pool[idx[i]]);return p}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function el(h){const t=document.createElement('template');t.innerHTML=h.trim();return t.content.firstElementChild}
function hashStem(s){return (s||'').trim().replace(/\s+/g,' ').toLowerCase()}
function build(list,qs){qs.forEach((q,i)=>{const ch=q.choices.map((c,ci)=>`<label><input type="radio" name="q${i}" value="${ci}"> ${c}</label>`).join("");
list.append(el(`<div class="q" data-i="${i}" data-ans="${q.answer}" style="border-bottom:1px solid var(--ring);padding:12px 0">
<h4 style="margin:0 0 8px 0">${i+1}. ${q.stem} <span class="badge" style="border:1px solid var(--ring);padding:2px 8px;border-radius:999px">${q.subRule||''}</span></h4>
<div class="choices">${ch}</div><div class="muted" style="margin-top:6px">${q.note?('معلومة: '+q.note):''}</div></div>`))})}
function score(list,qs){let r=0;[...list.querySelectorAll('.q')].forEach((wrap,i)=>{const sel=wrap.querySelector('input:checked');wrap.querySelectorAll('label').forEach(l=>l.classList.remove('correct','wrong'));
const c=Number(qs[i].answer);if(sel){const p=Number(sel.value);if(p===c){r++;sel.closest('label').style.background='#e8f7f0'}else{sel.closest('label').style.background='#fff1f2';const corr=wrap.querySelector(`input[value="${c}"]`);if(corr)corr.closest('label').style.background='#e8f7f0'}}});return r}
let MAIN=null,EX=null,PAPER=[];document.addEventListener('DOMContentLoaded',async()=>{
const mb=document.getElementById('modeBtn');const apply=()=>{const d=localStorage.getItem('taj_MODE')==='dark';document.documentElement.classList.toggle('dark',d);mb.innerText=d?'🌞':'🌓'};apply();mb.onclick=()=>{localStorage.setItem('taj_MODE',localStorage.getItem('taj_MODE')==='dark'?'light':'dark');apply()};
try{MAIN=await loadJSON('questions_bank.json');EX=await loadJSON('exercises_bank.json')}catch(e){alert(e.message);return}
const stemsMain=new Set();Object.values(MAIN).forEach(sec=>Object.values(sec).forEach(arr=>arr.forEach(q=>stemsMain.add(hashStem(q.stem)))));
const overlaps=[];Object.entries(EX).forEach(([sec,sub])=>Object.entries(sub).forEach(([sr,arr])=>arr.forEach(q=>{if(stemsMain.has(hashStem(q.stem)))overlaps.push({sec,sr,stem:q.stem})})));
if(overlaps.length){console.warn('Overlap detected',overlaps);alert('تنبيه: هناك أسئلة مكررة بين بنك التدريب والبنك الرئيسي. افتح صفحة المدقق لإصلاحها.');}
const start=document.getElementById('start'),more=document.getElementById('more'),sectionSel=document.getElementById('section'),paper=document.getElementById('paper'),list=document.getElementById('list'),finish=document.getElementById('finish'),reset=document.getElementById('reset');
function begin(){const sec=sectionSel.value,secObj=EX[sec];if(!secObj){alert('بنك التدريب لا يحتوي هذا القسم');return}PAPER=pickNFromSection(secObj,5);list.innerHTML='';build(list,PAPER);paper.style.display='block'}
function addMore(){const sec=sectionSel.value,secObj=EX[sec];if(!secObj){alert('بنك التدريب لا يحتوي هذا القسم');return}const extra=pickNFromSection(secObj,5);PAPER.push(...extra);build(list,extra)}
start.onclick=begin;more.onclick=addMore;finish.onclick=()=>{if(PAPER.length===0)return;const right=score(list,PAPER),total=PAPER.length,scorePct=Math.round((right/total)*100);
saveAttempt({name:'',mode:'exercise',section:({noon_tanween:'النون الساكنة والتنوين',meem_sakinah:'الميم الساكنة',madd:'أحكام المدود'})[sectionSel.value]||'',subRule:'—',when:new Date().toLocaleString('ar-EG'),ts:Date.now(),right,total,score:scorePct});
const summ=document.getElementById('summary');summ.style.display='block';summ.textContent=`نتيجة التدريب: ${right}/${total} (${scorePct}%)`;window.scrollTo({top:summ.offsetTop-80,behavior:'smooth'})};
reset.onclick=()=>{PAPER=[];list.innerHTML='';document.getElementById('summary').style.display='none'};});