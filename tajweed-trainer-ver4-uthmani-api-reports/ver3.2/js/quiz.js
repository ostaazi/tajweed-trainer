
let STATE={section:'noon_tanween',total:20,started:false,showMeta:false};
async function loadBank(){ const r=await fetch('questions_bank.json?'+Date.now()); return r.json();}
function byId(id){return document.getElementById(id)}
function setButtons(){ const s=byId('btnStart'),e=byId('btnEnd'); if(STATE.started){s.classList.add('hide');e.classList.remove('hide');}else{s.classList.remove('hide');e.classList.add('hide');}}
async function render(){
  setButtons(); byId('btnMeta').textContent=STATE.showMeta?'إخفاء اسم السورة والآية':'إظهار اسم السورة والآية';
  const bank=await loadBank(); const items=(bank.sections[STATE.section]||[]).slice(0,STATE.total);
  const box=byId('questions'); box.innerHTML=''; let i=0;
  for(const q of items){
    const card=document.createElement('div'); card.className='card'; card.style.marginTop='1rem';
    const ay= q.ayah_key ? await QuranAPI.fetchAyah(q.ayah_key) : {text:''};
    // if text contains {...}, display inner as ayah, else fallback to API text
    let base = (q.text.match(/\{(.+?)\}/)||[])[1] || ay.text || q.text;
    base = QuranAPI.colorTargets(base);
    const meta = (STATE.showMeta&&q.ayah_key)?`<div class="badge"><span class="dot"></span>${ay.surah} • ${q.ayah_key}</div>`:'';
    const title = `<div class="q-ayah">${base}</div>${meta}`;
    const ops=(q.options||[]).map((t,ix)=>`<label style="display:flex;gap:.5rem;align-items:center;margin:.35rem 0;">
      <input type="radio" name="q${i}" value="${ix}"><span>${t}</span></label>`).join('');
    card.innerHTML=`<div>${i+1}. ${title}</div><div style="margin-top:.5rem">${ops}</div>`;
    box.appendChild(card); i++;
  }
}
async function startFull(){STATE.started=true; setButtons(); render();}
function endQuiz(){
  const unanswered=[...document.querySelectorAll('[name^=\"q\"]')].filter(x=>!x.checked);
  if(unanswered.length && !confirm('يوجد أسئلة غير مُجابة. هل تود إنهاء الاختبار على أي حال؟')) return;
  alert('تم إنهاء الاختبار.'); STATE.started=false; setButtons(); byId('questions').innerHTML='';
}
document.addEventListener('DOMContentLoaded',()=>{
  byId('selSection').addEventListener('change',e=>{STATE.section=e.target.value;render();});
  byId('rngTotal').addEventListener('input',e=>{STATE.total=+e.target.value;byId('lblTotal').textContent=STATE.total;render();});
  byId('btnMeta').addEventListener('click',()=>{STATE.showMeta=!STATE.showMeta;render();});
  byId('btnStart').addEventListener('click',startFull);
  byId('btnEnd').addEventListener('click',endQuiz);
  render();
});