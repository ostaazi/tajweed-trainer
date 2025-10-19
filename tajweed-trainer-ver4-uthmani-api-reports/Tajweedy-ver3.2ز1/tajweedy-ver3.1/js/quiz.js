
import { fetchAyahUthmani, fetchSurahName, cacheGetAyah, cacheSetAyah, highlightTargetSmart } from './quran-api.js';

const btnStart = document.getElementById('btnStartComprehensive');
const btnFinish = document.getElementById('btnFinish');
const btnMeta = document.getElementById('btnToggleMeta');
const host = document.getElementById('quizHost');
let metaShown = false;
let currentList = [];

function showStartHideFinish(){
  btnStart?.classList.remove('hidden');
  btnFinish?.classList.add('hidden');
}
function showFinishHideStart(){
  btnFinish?.classList.remove('hidden');
  btnStart?.classList.add('hidden');
}

const DEFAULT_CHOICES = {
  "النون الساكنة والتنوين": ["إظهار","إدغام","إخفاء","إقلاب"],
  "الميم الساكنة": ["إظهار الشفوي","إدغام شفوي","إخفاء شفوي"],
  "أحكام المدود": ["مد طبيعي","مد متصل","مد منفصل","مد لازم"]
};

function normalizeQuestion(q){
  const section = q.section || q._sec || "";
  let choices = Array.isArray(q.choices) && q.choices.length ? [...q.choices] : (DEFAULT_CHOICES[section] ? [...DEFAULT_CHOICES[section]] : []);
  if(q.answer_text && !choices.includes(q.answer_text)){
    choices.unshift(q.answer_text);
    console.warn("[Tajweedy] Injected missing correct answer into choices:", q);
  }
  if(!q.target && (q.ayah || q.question)){
    const m = String(q.ayah || q.question).match(/\[\[([\s\S]+?)\]\]/);
    if(m) q.target = m[1];
  }
  if(!q.ref && q.verse_ref) q.ref = q.verse_ref;
  q.choices = choices;
  q._sec = section;
  return q;
}

async function buildQuestionCard(q, container){
  let text = q.ref ? cacheGetAyah(q.ref) : null;
  if(!text && q.ref){
    text = await fetchAyahUthmani(q.ref);
    if(text) cacheSetAyah(q.ref, text);
  }
  const ayahText = text || q.ayah || q.question || '—';
  const ayahHTML = q.target ? highlightTargetSmart(ayahText, q.target) : ayahText;

  let metaHTML = '';
  if(q.ref){
    const [sId, vNo] = q.ref.split(':');
    const sInfo = await fetchSurahName(Number(sId));
    metaHTML = `<div class="meta-ayah ${metaShown?'visible':''}" data-ref="${q.ref}">
      السورة: <strong>${sInfo.name||'—'}</strong> — الآية رقم: <strong>${vNo||'—'}</strong>
    </div>`;
  }

  const optionsHTML = (q.choices||[]).map((c,i)=>`
    <label class="option" style="display:block; padding:.25rem 0">
      <input type="radio" name="q_${q._id}" value="${c}"> <span>${c}</span>
    </label>`).join('');

  container.innerHTML = `
    ${metaHTML}
    <div class="ayah">قال تعالى: ${ayahHTML}</div>
    <div class="answers" data-qid="${q._id}">
      ${optionsHTML}
    </div>
  `;
}

function norm(s){ return String(s ?? '').trim(); }

function grade(){
  let correct = 0;
  const items = currentList.map((q,idx)=>{
    const sel = document.querySelector(`input[name="q_${q._id}"]:checked`)?.value || null;
    const ok = !!(sel && norm(sel) === norm(q.answer_text));
    if(ok) correct++;
    return {
      ayah: q.ayah || q.question || '',
      textHtml: (q.ayah || q.question || '').replace(/\[\[([\s\S]*?)\]\]/g, '<span class="ayah-target">$1</span>'),
      choice: sel, correct: q.answer_text, isCorrect: ok, section: q._sec || ''
    };
  });

  const payload = {
    trainee: localStorage.getItem('tajweedy:trainee') || '—',
    dateISO: new Date().toISOString(),
    items
  };
  try{ localStorage.setItem('tajweedy:lastResult', JSON.stringify(payload)); }catch{}
  const total = items.length;
  return {correct, total, items, payload};
}

async function startComprehensive(){
  const res = await fetch('./questions_bank.json', {cache:'no-cache'});
  const BANK = await res.json();
  let all = [];
  if(Array.isArray(BANK.items)){
    all = BANK.items.map(normalizeQuestion);
  }else if(BANK.sections){
    Object.keys(BANK.sections).forEach(sec=>{
      const node = BANK.sections[sec];
      if(Array.isArray(node.items)) node.items.forEach(q=>all.push(normalizeQuestion({...q, section: sec})));
      if(node.pool) node.pool.forEach(q=>all.push(normalizeQuestion({...q, section: sec})));
      if(node.parts) Object.keys(node.parts).forEach(pk => node.parts[pk].forEach(q=>all.push(normalizeQuestion({...q, section: sec, sub: pk}))));
    });
  }
  currentList = all.slice(0,20).map((q,i)=>({...q,_id:i+1}));

  host.innerHTML = '';
  for(const q of currentList){
    const card = document.createElement('div');
    card.className = 'card';
    card.style.marginBottom = '12px';
    host.appendChild(card);
    await buildQuestionCard(q, card);
  }
}

btnMeta?.addEventListener('click', ()=>{
  metaShown = !metaShown;
  btnMeta.textContent = metaShown ? 'إخفاء اسم السورة ورقم الآية' : 'إظهار اسم السورة ورقم الآية';
  document.querySelectorAll('.meta-ayah').forEach(el=>el.classList.toggle('visible', metaShown));
});

btnStart?.addEventListener('click', async ()=>{
  await startComprehensive();
  showFinishHideStart();
});

btnFinish?.addEventListener('click', ()=>{
  const r = grade();
  host.innerHTML = `<div class="card">
    <h3 class="card-title">النتيجة</h3>
    <p>الصحيح: ${r.correct} من ${r.total} (${r.total?Math.round(r.correct*100/r.total):0}%)</p>
    <a class="btn" href="./reports.html">عرض التقارير</a>
  </div>`;
  showStartHideFinish();
});

showStartHideFinish();
