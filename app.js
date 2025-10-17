// Utilities
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

// Theme toggle + persisted name
const body = document.body;
const nameInput = $('#traineeName');
const savedName = localStorage.getItem('taj_name');
if (savedName) nameInput.value = savedName;
nameInput.addEventListener('input', ()=> localStorage.setItem('taj_name', nameInput.value));

$('#toggleTheme')?.addEventListener('click', ()=>{
  body.classList.toggle('theme-light');
  body.classList.toggle('theme-dark');
  localStorage.setItem('taj_theme', body.classList.contains('theme-dark') ? 'dark' : 'light');
});
// Apply saved theme
const savedTheme = localStorage.getItem('taj_theme');
if (savedTheme === 'light'){ body.classList.remove('theme-dark'); body.classList.add('theme-light'); }

// Count slider
const countRange = $('#countRange');
const countValue = $('#countValue');
countRange.addEventListener('input', ()=> countValue.textContent = countRange.value);
countValue.textContent = countRange.value;

// Tri slider (noUiSlider with 2 handles to split 3 segments)
const tri = document.getElementById('triSlider');
noUiSlider.create(tri, {
  start: [33, 66],
  connect: [true, true, true],
  range: { min: 0, max: 100 },
  step: 1,
  direction: 'rtl'
});
let showPercent = true;
const pNoon = $('#pNoon'), pMeem = $('#pMeem'), pMadd = $('#pMadd');

function updateBadges(){
  const [h1, h2] = tri.noUiSlider.get().map(v=>Math.round(parseFloat(v)));
  const a = h1;
  const b = h2 - h1;
  const c = 100 - h2;
  const total = parseInt(countRange.value,10);
  const sA = Math.round(total * a/100);
  const sB = Math.round(total * b/100);
  const sC = total - sA - sB;
  if (showPercent){
    pNoon.textContent = a + '%';
    pMeem.textContent = b + '%';
    pMadd.textContent = c + '%';
  }else{
    pNoon.textContent = sA + ' سؤال';
    pMeem.textContent = sB + ' سؤال';
    pMadd.textContent = sC + ' سؤال';
  }
}
tri.noUiSlider.on('update', updateBadges);
countRange.addEventListener('input', updateBadges);
updateBadges();

// Toggle % / count
$('#toggleMode').addEventListener('click', ()=>{
  showPercent = !showPercent;
  $('#toggleMode').textContent = showPercent ? '٪' : '#';
  updateBadges();
});
// Reset distribution
$('#resetDist').addEventListener('click', ()=>{
  tri.noUiSlider.set([33,66]);
});

// End test buttons confirmation
function confirmEnd(){
  const unanswered = $$('.qcard input[type="radio"]').length ?
    $$('.qcard').filter(q => !q.querySelector('input[type="radio"]:checked')).length : 0;
  const warn = unanswered ? `يوجد ${unanswered} سؤال/أسئلة بدون إجابة. هل تريد إنهاء الاختبار؟` : 'هل تريد إنهاء الاختبار؟';
  if (confirm(warn)){
    alert('تم إنهاء الاختبار (عرض توضيحي).');
  }
}
$('#endTop').addEventListener('click', confirmEnd);
$('#endBottom').addEventListener('click', confirmEnd);

// --- Demo questions & highlighting ---
// Minimal demo list. Replace with real loader if needed.
const sample = [
  {q:"قال تعالى: {كَلَّا لَئِن لَمْ يَنتَهِ لَنَسْفَعًا [[بِالنَّاصِيَةِ]]}- أين الكلمة المستهدفة؟", options:["مثال"], answer:1},
  {q:"قال تعالى: {وَأَنزَلَ [[بِهِ]] رُوحُ الأمين}- ما حكم النون الساكنة؟", options:["إظهار","إدغام","إخفاء","إقلاب"], answer:3},
  {q:"قال تعالى: {إِنَّ [[رَبَّهُم]] بِهِمْ}- ما حكم الميم الساكنة؟", options:["إظهار شفوي","إدغام شفوي","إخفاء شفوي قلب","إقلاب"], answer:3},
];

function ayahHighlight(str){
  return str.replace(/\[\[([\s\S]+?)\]\]/g, '<span class="ayah-target">$1</span>');
}

function render(){
  const host = $('#questions');
  host.innerHTML = '';
  const tpl = $('#questionTpl');
  sample.forEach((item, i)=>{
    const node = tpl.content.cloneNode(true);
    node.querySelector('.qnum').textContent = i+1;
    node.querySelector('.qtext').innerHTML = ayahHighlight(item.q);
    const name = 'q_'+i;
    node.querySelectorAll('input[type="radio"]').forEach(r=> r.setAttribute('name', name));
    host.appendChild(node);
  });
}
render();
