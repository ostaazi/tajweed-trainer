// حفظ اسم المتدرّب
const traineeNameEl = document.getElementById('traineeName');
traineeNameEl.value = localStorage.getItem('traineeName') || '';
traineeNameEl.addEventListener('input', () => localStorage.setItem('traineeName', traineeNameEl.value));

// الأزرار
document.getElementById('btnShort').addEventListener('click', () => {
  // هنا مناداة منطق الاختبار القصير الحقيقي لديك
  alert('بدء اختبار قصير للقسم المحدد');
});

document.getElementById('btnFull').addEventListener('click', () => {
  alert('بدء اختبار شامل');
});

// إنهاء الاختبار + تحذير الأسئلة غير المُجابة
function hasUnanswered() {
  return [...document.querySelectorAll('.question')].some(q=>!q.querySelector('input[type=radio]:checked'));
}
function gradeAndShowResults(){
  alert('تم إنهاء الاختبار (مثال توضيحي)');
}
function handleEnd(){
  if (hasUnanswered()){
    if (!confirm('هناك أسئلة غير مُجابة. هل تريد إنهاء الاختبار؟')) return;
  }
  gradeAndShowResults();
}
document.getElementById('btnEndTop').onclick = handleEnd;
document.getElementById('btnEndBottom').onclick = handleEnd;

// عدد الأسئلة
const qRange = document.getElementById('qRange');
const qCountSpan = document.getElementById('qCount');
let totalQuestionsSelected = parseInt(qRange.value,10);
qRange.addEventListener('input', e=>{
  totalQuestionsSelected = parseInt(e.target.value,10);
  qCountSpan.textContent = totalQuestionsSelected;
  renderDistributionBars();
});

// نسب الأقسام الابتدائية
let percents = { noon:33, meem:33, madd:34 };

// وضع العرض
let sliderMode = localStorage.getItem('sliderMode') || 'percent';

function computeAllocation(total, P){ // P: [p1,p2,p3]
  let counts = P.map(p=>Math.floor(total*p/100));
  let sum = counts.reduce((a,b)=>a+b,0);
  let ord = P.map((p,i)=>[p,i]).sort((a,b)=>b[0]-a[0]).map(x=>x[1]);
  for(let i=0;i<total-sum;i++) counts[ord[i%3]]++;
  return counts;
}

function renderDistributionBars(){
  const P = [percents.noon, percents.meem, percents.madd];
  const C = computeAllocation(totalQuestionsSelected, P);

  const bars = document.querySelectorAll('.dist-bar');
  const labels = document.querySelectorAll('.dist-label');
  [0,1,2].forEach(i => {
    bars[i].style.flex = P[i];
    labels[i].textContent = (sliderMode==='percent') ? `${P[i]}%` : `${C[i]}`;
  });

  const badges = document.querySelectorAll('.dist-badge span');
  [0,1,2].forEach(i => {
    badges[i].textContent = (sliderMode==='percent') ? `${P[i]}%` : `${C[i]}`;
  });
}

function toggleSliderMode(){
  sliderMode = (sliderMode==='percent')?'count':'percent';
  localStorage.setItem('sliderMode', sliderMode);
  renderDistributionBars();
}

document.addEventListener('click', (e)=>{
  if (e.target.closest('.dist-bar') || e.target.closest('.dist-badge') || e.target.closest('#dist-mode-toggle')) {
    toggleSliderMode();
  }
});

// تفعيل الوضع الفاتح/الداكن (اختياري بسيط)
function setTheme(mode){
  document.body.classList.toggle('light', mode==='light');
  localStorage.setItem('theme', mode);
}
setTheme(localStorage.getItem('theme') || 'dark');

// بداية
renderDistributionBars();
