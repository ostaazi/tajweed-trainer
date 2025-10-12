import { initMode } from './util.js';initMode('modeBtn');
function hashStem(s){return (s||'').trim().replace(/\s+/g,' ').toLowerCase()}
async function loadJSON(n){const r=await fetch(n,{cache:'no-store'});if(!r.ok)throw new Error(n+' غير موجود');return r.json()}
document.getElementById('run').onclick=async()=>{const out=document.getElementById('out');out.textContent='جارِ الفحص...';try{const MAIN=await loadJSON('questions_bank.json');const EX=await loadJSON('exercises_bank.json');
const stems=new Set();Object.values(MAIN).forEach(sec=>Object.values(sec).forEach(arr=>arr.forEach(q=>stems.add(hashStem(q.stem)))));
const overlaps=[];Object.entries(EX).forEach(([sec,sub])=>Object.entries(sub).forEach(([sr,arr])=>arr.forEach(q=>{if(stems.has(hashStem(q.stem)))overlaps.push({sec,sr,stem:q.stem})})));
out.textContent=overlaps.length?('تكرارات: '+overlaps.length+'\\n'+overlaps.map(o=>' - ['+o.sec+'/'+o.sr+'] '+o.stem).join('\\n')):'لا توجد أسئلة مكررة ✔️'}catch(e){out.textContent='خطأ: '+e.message}}