// حفظ/استعادة اسم المتدرب
const traineeName = document.getElementById('traineeName');
traineeName.value = localStorage.getItem('tajweed_name') || '';
traineeName.addEventListener('input', () => localStorage.setItem('tajweed_name', traineeName.value));

// تبديل الثيم
const themeBtn = document.getElementById('themeToggle');
const setTheme = (t)=>{
  document.body.classList.toggle('theme-light', t==='light');
  document.body.classList.toggle('theme-dark', t!=='light');
  localStorage.setItem('tajweed_theme', t);
  themeBtn.textContent = t==='light' ? '🌞' : '🌙';
};
setTheme(localStorage.getItem('tajweed_theme') || 'dark');
themeBtn.addEventListener('click', ()=>{
  const now = document.body.classList.contains('theme-light') ? 'dark' : 'light';
  setTheme(now);
});

// شريط عدد الأسئلة
const total = document.getElementById('totalQuestions');
const totalHint = document.getElementById('totalHint');
const updateTotalHint = ()=> totalHint.textContent = total.value;
total.addEventListener('input', updateTotalHint);
updateTotalHint();

// المنزلق الثلاثي (مقبضان)
const tri = document.getElementById('triSlider');
const leftThumb = tri.querySelector('.thumb.left');
const rightThumb = tri.querySelector('.thumb.right');
const segA = tri.querySelector('.seg-a');
const segB = tri.querySelector('.seg-b');
const segC = tri.querySelector('.seg-c');
const chipA = tri.querySelector('.chip-a .val');
const chipB = tri.querySelector('.chip-b .val');
const chipC = tri.querySelector('.chip-c .val');

// الحالة
let showCounts = false; // التبديل بين % وعدد الأسئلة
let left = 33; //%
let right = 66; //%
const clamp01 = v => Math.min(100, Math.max(0, v));

function layout(){
  // عرض الشريط
  const w = tri.clientWidth;
  const pxL = (left/100)*w;
  const pxR = (right/100)*w;
  leftThumb.style.left = (pxL-10)+'px';
  rightThumb.style.left = (pxR-10)+'px';

  segA.style.left = 0; segA.style.width = pxL+'px';
  segB.style.left = pxL+'px'; segB.style.width = (pxR-pxL)+'px';
  segC.style.left = pxR+'px'; segC.style.width = (w-pxR)+'px';

  const a = Math.round(left);
  const b = Math.round(right-left);
  const c = Math.round(100-right);

  const valText = (p)=> showCounts ? Math.round(p*total.value/100) + ' سؤال' : p + '%';
  chipA.textContent = valText(a);
  chipB.textContent = valText(b);
  chipC.textContent = valText(c);
}
window.addEventListener('resize', layout);

// سحب
function dragThumb(e, which){
  e.preventDefault();
  const rect = tri.getBoundingClientRect();
  function move(ev){
    const x = (ev.touches? ev.touches[0].clientX : ev.clientX) - rect.left;
    const percent = clamp01(x/rect.width*100);
    if(which==='left'){
      left = Math.min(percent, right-10); // مسافة دنيا 10%
    }else{
      right = Math.max(percent, left+10);
    }
    layout();
  }
  function up(){
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup', up);
    document.removeEventListener('touchmove', move);
    document.removeEventListener('touchend', up);
  }
  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', up);
  document.addEventListener('touchmove', move, {passive:false});
  document.addEventListener('touchend', up);
}
leftThumb.addEventListener('mousedown', e=>dragThumb(e,'left'));
rightThumb.addEventListener('mousedown', e=>dragThumb(e,'right'));
leftThumb.addEventListener('touchstart', e=>dragThumb(e,'left'), {passive:false});
rightThumb.addEventListener('touchstart', e=>dragThumb(e,'right'), {passive:false});

// التبديل بين النسبة والعدد بالنقر على أي مكان في الشريط
tri.addEventListener('click', (e)=>{
  // تجاهل إذا كان النقر على المقبض نفسه
  if(e.target.classList.contains('thumb')) return;
  showCounts = !showCounts;
  layout();
});

// زر توزيع افتراضي
document.getElementById('resetDist').addEventListener('click', ()=>{
  left = 33; right = 66; layout();
});

// أزرار إنهاء الاختبار (عرض تحذير إن وجِد أسئلة غير مُجابة - توضيحي)
function finish(){
  if(confirm('هل تريد إنهاء الاختبار؟ سيتم حفظ الدرجات وعرض النتيجة.')){
    alert('(عرض توضيحي) تم إنهاء الاختبار.');
  }
}
document.getElementById('finishTop').addEventListener('click', finish);
document.getElementById('finishBottom').addEventListener('click', finish);

// بدء
layout();
