// ver3.2 — absolute BANK_URL
const BANK_URL = window.__TAJ_BANK_URL__ || 'questions_bank.json';

const quizArea = document.querySelector('#quizArea');
const sectionSelect = document.querySelector('#sectionSelect');
const countRange = document.querySelector('#countRange');
const countBadge = document.querySelector('#countBadge');
const btnStart = document.querySelector('#btnStart');
const btnFinish = document.querySelector('#btnFinish');
const btnToggleRef = document.querySelector('#btnToggleRef');
const themeToggle = document.querySelector('#themeToggle');

let BANK = null;
let QUESTIONS = [];
let KEY = [];
let showRefs = true;

const OPTIONS_SETS = {
  'النون الساكنة والتنوين': ['إظهار','إدغام','إخفاء','إقلاب'],
  'الميم الساكنة': ['إظهار شفوي','إدغام شفوي','إخفاء شفوي','قلب'],
  'أحكام المدود': ['مد طبيعي','مد متصل','مد منفصل','مد لازم'],
  'noon_tanween': ['إظهار','إدغام','إخفاء','إقلاب'],
  'meem_sakinah': ['إظهار شفوي','إدغام شفوي','إخفاء شفوي','قلب'],
  'ahkam_madud': ['مد طبيعي','مد متصل','مد منفصل','مد لازم'],
};

function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]} return a; }
function pickN(arr, n){ return shuffle([...arr]).slice(0, n); }
function setTheme(dark){ document.body.classList.toggle('theme-dark', dark); }
function toggleStartFinishButtons(started){ btnStart.hidden = !!started; btnFinish.hidden = !started; }

function extractAyahText(qText){
  const m = (qText||'').match(/﴿([^﴿﴾]+)﴾/);
  return m ? m[1].trim() : '';
}
function highlightTargetBrackets(text){
  return (text||'').replace(/\[\[([\s\S]+?)\]\]/g, '<span class="target-word">$1</span>');
}

function getOptionsForItem(item){
  if (Array.isArray(item['الاختيارات']) && item['الاختيارات'].length) return item['الاختيارات'];
  const sec = item['القسم'] || item['sectionKey'] || item['section'];
  return OPTIONS_SETS[sec] || [];
}

async function loadBank(){
  const res = await fetch(`${BANK_URL}?v=${Date.now()}`, { cache:'no-store' });
  if(!res.ok) throw new Error('تعذّر تحميل بنك الأسئلة');
  return await res.json();
}

function normalizeBank(bank){
  if (Array.isArray(bank)) return bank;
  if (bank.sections){
    const out = [];
    for(const [secKey, secObj] of Object.entries(bank.sections)){
      const label = secObj.titleAr || secObj.nameAr || secObj.title || secKey;
      const parts = secObj.parts || {};
      for(const [pKey, arr] of Object.entries(parts)){
        for(const q of arr){
          out.push({ 'القسم': label, ...q });
        }
      }
    }
    return out;
  }
  return [];
}

function fillSectionsSelect(items){
  const uniq = Array.from(new Set(items.map(x=>x['القسم']).filter(Boolean)));
  sectionSelect.innerHTML = ['(جميع الأقسام)', ...uniq].map((name, i)=>{
    return `<option value="${i===0?'__ALL__':name}">${name}</option>`;
  }).join('');
}

function buildCard(item, idx){
  const ayahFull = item['الآية'] || item['ayah'] || item['question'] || '';
  const ayahInside = extractAyahText(ayahFull) || ayahFull;
  const ayahHtml = highlightTargetBrackets(ayahInside);
  const refHtml = (showRefs && (item['السورة'] || item['رقم_الآية'])) 
    ? `<span class="ref-badge">${(item['السورة']||'')}${item['رقم_الآية']?' • '+item['رقم_الآية']:''}</span>`
    : '';

  const options = getOptionsForItem(item);
  const correctText = (item['الإجابة'] || item['answer'] || '').trim();
  const correctIndex = Math.max(0, options.findIndex(o => (o+'').trim() === correctText));
  const finalCorrect = correctIndex >= 0 ? correctIndex : 0;

  const html = `
    <div class="question-card">
      <div class="q-header">
        <span class="q-number">${idx+1}.</span>
        ${refHtml}
        <span class="ayah ayah-uthmani">${ayahHtml || '—'}</span>
      </div>
      <div class="q-options">
        ${options.map((o,i)=>`
          <label class="opt">
            <input type="radio" name="q${idx}" value="${i}">
            <span>${o}</span>
          </label>
        `).join('')}
      </div>
    </div>
  `;
  return { html, correctIndex: finalCorrect };
}

function draw(items){
  quizArea.innerHTML = '';
  QUESTIONS = [];
  KEY = [];
  items.forEach((it, i)=>{
    const view = buildCard(it, i);
    quizArea.insertAdjacentHTML('beforeend', view.html);
    QUESTIONS.push(it);
    KEY.push(view.correctIndex);
  });
}

async function startQuiz(){
  if(!BANK) BANK = normalizeBank(await loadBank());
  const n = parseInt(countRange.value, 10) || 20;
  const secVal = sectionSelect.value;
  const pool = (secVal && secVal !== '__ALL__') ? BANK.filter(x=>x['القسم']===secVal) : BANK;
  const chosen = pickN(pool, n);
  draw(chosen);
  toggleStartFinishButtons(true);
}

function finishQuiz(){
  let score = 0;
  QUESTIONS.forEach((q, i)=>{
    const chosen = document.querySelector(`input[name="q${i}"]:checked`);
    const chosenIdx = chosen ? +chosen.value : -1;
    const correct = KEY[i];
    if(chosenIdx === correct) score++;

    const labels = [...document.querySelectorAll(`input[name="q${i}"]`)].map(inp=>inp.parentElement);
    labels.forEach((lab, j)=>{
      lab.style.opacity = '.9';
      lab.style.borderRadius = '10px';
      lab.style.padding = '4px 8px';
      if(j === correct){ lab.style.background = 'rgba(5,150,105,.12)'; }
      if(chosenIdx === j && j !== correct){ lab.style.background = 'rgba(220,38,38,.12)'; }
    });
  });
  alert(`نتيجتك: ${score} / ${QUESTIONS.length}`);
  toggleStartFinishButtons(false);
  quizArea.scrollIntoView({behavior:'smooth'});
}

function initTheme(){
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  setTheme(prefersDark);
}

countRange.addEventListener('input', ()=>{
  countBadge.textContent = `${countRange.value} ●`;
});
btnStart.addEventListener('click', startQuiz);
btnFinish.addEventListener('click', finishQuiz);
btnToggleRef.addEventListener('click', ()=>{
  showRefs = !showRefs;
  btnToggleRef.textContent = showRefs ? 'إخفاء اسم السورة والآية' : 'إظهار اسم السورة والآية';
  if(QUESTIONS.length){
    const current = QUESTIONS.map((q,i)=>q);
    draw(current);
  }
});
themeToggle.addEventListener('click', ()=>{
  const dark = !document.body.classList.contains('theme-dark');
  setTheme(dark);
});

(async function init(){
  try{
    const raw = await loadBank();
    BANK = normalizeBank(raw);
    fillSectionsSelect(BANK);
    countBadge.textContent = `${countRange.value} ●`;
    toggleStartFinishButtons(false);
    initTheme();
  }catch(e){
    alert(e.message || 'تعذّر التهيئة');
    console.error(e);
  }
})();
