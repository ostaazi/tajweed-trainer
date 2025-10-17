// حفظ اسم المتدرّب
const traineeNameEl = document.getElementById('traineeName');
traineeNameEl.value = localStorage.getItem('traineeName') || '';
traineeNameEl.addEventListener('input', ()=>{
  localStorage.setItem('traineeName', traineeNameEl.value.trim());
});

// منزلق عدد الأسئلة
const qCountEl = document.getElementById('qCount');
const qCountValEl = document.getElementById('qCountVal');
qCountValEl.textContent = qCountEl.value;
qCountEl.addEventListener('input', ()=> qCountValEl.textContent = qCountEl.value);

function getTotalQuestions(){ return parseInt(qCountEl.value, 10) || 20; }

// tri slider with noUiSlider
const DEFAULT_DIST = [33, 66];
let triMode = localStorage.getItem('triMode') || 'percent'; // 'percent' | 'count'

const triSliderEl = document.getElementById('triSlider');
const distToggleBtn = document.getElementById('distToggle');
const distResetBtn  = document.getElementById('distReset');
const valA = document.getElementById('valA');
const valB = document.getElementById('valB');
const valC = document.getElementById('valC');

noUiSlider.create(triSliderEl, {
  start: DEFAULT_DIST,
  connect: [true, true, true],
  range: { min: 0, max: 100 },
  step: 1
});

function getPercents() {
  const [p1, p2] = triSliderEl.noUiSlider.get().map(v => Math.round(parseFloat(v)));
  const a = p1, b = p2 - p1, c = 100 - p2;
  return [a,b,c];
}
function countsFromPercents(totalQ) {
  const [a,b,c] = getPercents();
  let A = Math.round(totalQ * a/100);
  let B = Math.round(totalQ * b/100);
  let C = totalQ - A - B;
  return [A,B,C];
}
function renderTriLabels(){
  const totalQ = getTotalQuestions();
  if (triMode === 'percent'){
    const [a,b,c] = getPercents();
    valA.textContent = `${a}%`; valB.textContent = `${b}%`; valC.textContent = `${c}%`;
    distToggleBtn.textContent = '٪';
  }else{
    const [A,B,C] = countsFromPercents(totalQ);
    valA.textContent = `${A} سؤال`; valB.textContent = `${B} سؤال`; valC.textContent = `${C} سؤال`;
    distToggleBtn.textContent = '#';
  }
}
triSliderEl.noUiSlider.on('update', renderTriLabels);
distToggleBtn.addEventListener('click', ()=>{
  triMode = (triMode === 'percent') ? 'count' : 'percent';
  localStorage.setItem('triMode', triMode);
  renderTriLabels();
});
distResetBtn.addEventListener('click', ()=> triSliderEl.noUiSlider.set(DEFAULT_DIST));
qCountEl.addEventListener('input', renderTriLabels);
renderTriLabels();

// مثال: تلوين الكلمات المستهدفة عبر [[...]] إن وجدت
function highlightTargetsInContainer(container){
  const mark = (node)=>{
    if (node.nodeType !== Node.TEXT_NODE) return;
    const text = node.nodeValue;
    if (!text || text.indexOf('[[') === -1) return;
    const parts = text.split(/(\[\[.*?\]\])/g);
    const frag = document.createDocumentFragment();
    parts.forEach(p => {
      const m = p.match(/^\[\[(.*?)\]\]$/);
      if (m){
        const span = document.createElement('span');
        span.className = 'ayah-target';
        span.textContent = m[1];
        frag.appendChild(span);
      }else{
        frag.appendChild(document.createTextNode(p));
      }
    });
    node.parentNode.replaceChild(frag, node);
  };
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(mark);
}

// أمثلة تجريبية: أضف أقواسًا لعرض التأثير
document.addEventListener('DOMContentLoaded', ()=>{
  // في المثال الأول نُبرز كلمة لنسفعاً و أنزل
  const ayahs = document.querySelectorAll('.ayah');
  if (ayahs[0]) ayahs[0].textContent = '﴿كَلَّا لَئِنْ لَمْ يَنْتَهِ لَنَسْفَعًا بِالنَّاصِيَةِ﴾'.replace('لَنَسْفَعًا','[[لَنَسْفَعًا]]');
  if (ayahs[1]) ayahs[1].textContent = '﴿وَأَنزَلَ بِهِ رُوحُ الْأَمِينِ﴾'.replace('أَنزَلَ','[[أَنزَلَ]]');
  document.querySelectorAll('.questions').forEach(highlightTargetsInContainer);
});

// أزرار تجريبية
document.getElementById('btnFinishTop').addEventListener('click', ()=> alert('سيتم إنهاء الاختبار (تجريبي).'));
document.getElementById('btnFinishBottom').addEventListener('click', ()=> alert('سيتم إنهاء الاختبار (تجريبي).'));
