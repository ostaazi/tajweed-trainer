
const el = sel => document.querySelector(sel);
const els = sel => Array.from(document.querySelectorAll(sel));

// Theme toggle
const themeToggle = el('#themeToggle');
const root = document.body;
const THEME_KEY = 'tajweed-theme';
function setTheme(t){ root.classList.toggle('theme-light', t === 'light'); root.classList.toggle('theme-dark', t !== 'light'); localStorage.setItem(THEME_KEY, t); themeToggle.textContent = t === 'light' ? '☀️' : '🌙'; }
setTheme(localStorage.getItem(THEME_KEY) || 'dark');
themeToggle.addEventListener('click', ()=> setTheme(root.classList.contains('theme-light') ? 'dark':'light'));

// Student name
const nameInput = el('#studentName');
const NAME_KEY = 'tajweed-student';
nameInput.value = localStorage.getItem(NAME_KEY) || '';
nameInput.addEventListener('input', ()=> localStorage.setItem(NAME_KEY, nameInput.value.trim()));

// Questions count
const qCount = el('#qCount');
const qCountValue = el('#qCountValue');
const state = {
  total: parseInt(qCount.value,10) || 20,
  dist: [33,33,34],
  mode: 'percent' // 'count'
};
function updateQCount(){ state.total = parseInt(qCount.value,10); qCountValue.textContent = state.total; paintTri(); }
qCount.addEventListener('input', updateQCount); updateQCount();

// Tri-slider with two handles
const tri = el('#triSlider'), segA = el('#segA'), segB = el('#segB'), segC = el('#segC');
const h1 = el('#h1'), h2 = el('#h2'), overlay = el('#overlay');
const labA = el('#labA'), labB = el('#labB'), labC = el('#labC');

function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }
function distToCounts(){ return state.dist.map(p=> Math.round(p * state.total / 100)); }
function countsToDist(counts){
  const s = counts.reduce((a,b)=>a+b,0) || 1;
  state.dist = counts.map(c=> Math.round(100*c/s));
  normalize100();
}
function normalize100(){
  // ensure sum == 100
  let s = state.dist.reduce((a,b)=>a+b,0);
  while(s>100){ // subtract from largest
    const i = state.dist.indexOf(Math.max(...state.dist));
    state.dist[i]--; s--;
  }
  while(s<100){
    const i = state.dist.indexOf(Math.min(...state.dist));
    state.dist[i]++; s++;
  }
}

function paintTri(){
  normalize100();
  // widths
  const [a,b,c] = state.dist;
  segA.style.left='0%'; segA.style.width = a + '%';
  segB.style.left=a+'%'; segB.style.width=b+'%';
  segC.style.left=(a+b)+'%'; segC.style.width=c+'%';
  // handles positions (at boundaries)
  h1.style.left = `calc(${a}% - 9px)`;
  h2.style.left = `calc(${a+b}% - 9px)`;
  const counts = distToCounts();
  labA.textContent = state.mode==='percent' ? `${a}%` : `${counts[0]}س`;
  labB.textContent = state.mode==='percent' ? `${b}%` : `${counts[1]}س`;
  labC.textContent = state.mode==='percent' ? `${c}%` : `${counts[2]}س`;
  overlay.textContent = state.mode==='percent' ? `${a}% | ${b}% | ${c}%` : `${counts[0]} | ${counts[1]} | ${counts[2]}`;
}
paintTri();

// Drag logic
let dragging = null;
function posToDist(x){
  const rect = tri.getBoundingClientRect();
  const pct = clamp((x-rect.left)/rect.width*100, 0, 100);
  const a = clamp(Math.round(pct), 0, 100);
  return a;
}
function onDown(e, which){
  e.preventDefault(); dragging = which;
}
function onMove(e){
  if(!dragging) return;
  const x = (e.touches ? e.touches[0].clientX : e.clientX);
  const p = posToDist(x);
  let [a,b,c] = state.dist;
  if(dragging==='h1'){
    a = clamp(p, 0, a+b+c-1);
    b = clamp(b + (state.dist[0]-a), 0, 100-a);
    c = 100 - a - b;
  }else if(dragging==='h2'){
    const left = state.dist[0];
    const pb = clamp(p-left, 0, 100-left);
    b = pb;
    a = left;
    c = 100 - a - b;
  }
  state.dist = [a,b,c];
  paintTri();
}
function onUp(){ dragging = null; }

[h1,h2].forEach((h,i)=>{
  const id = i===0?'h1':'h2';
  h.addEventListener('mousedown', e=>onDown(e,id));
  h.addEventListener('touchstart', e=>onDown(e,id), {passive:false});
});
window.addEventListener('mousemove', onMove);
window.addEventListener('touchmove', onMove, {passive:false});
window.addEventListener('mouseup', onUp);
window.addEventListener('touchend', onUp);

// Click to toggle mode
tri.addEventListener('click', (e)=>{
  // ignore clicks starting on handles (already processed by drag)
  if(e.target.classList.contains('handle')) return;
  state.mode = state.mode==='percent' ? 'count' : 'percent';
  paintTri();
});

// Reset distribution
el('#resetDist').addEventListener('click', ()=>{ state.dist=[33,33,34]; paintTri(); });

// Sample questions to demonstrate highlighting
const samples = [
  {q:"قال تعالى: {كَلَّا لَئِنْ لَمْ يَنْتَهِ لَنَسْفَعًا بِالنَّاصِيَةِ}- أين الكلمة المستهدفة؟ مثال", opts:[], answer:0, text:"... [[النَّاصِيَةِ]] ..."},
  {q:"قال تعالى: {وَأَنْزَلَ بِهِ رُوحُ الأَمِينِ}- ما حكم النون الساكنة؟", opts:["إظهار","إدغام","إخفاء","إقلاب"], answer:2, text:"... [[أَنْزَلَ]] ..."},
  {q:"قال تعالى: {إِنَّ رَبَّهُمْ بِهِمْ}- ما حكم الميم الساكنة؟", opts:["إظهار شفوي","إدغام شفوي","إخفاء شفوي قلب","إقلاب"], answer:2, text:"... [[بِهِمْ]] ..."}
];
function colorize(text){
  return text.replace(/\[\[([\s\S]+?)\]\]/g, '<span class="ayah-target">$1</span>');
}
function renderSamples(){
  const ul = el('#sampleList'); ul.innerHTML='';
  samples.forEach((s,i)=>{
    const li = document.createElement('li');
    li.className='question';
    li.innerHTML = `<div class="q-text">${s.q.replace('...', colorize(s.text))}</div>`;
    ul.appendChild(li);
  });
}
renderSamples();

// Finish buttons (demo only)
['#finishTop','#finishBottom'].forEach(sel=>{
  el(sel).addEventListener('click', ()=> alert('تم إنهاء الاختبار (عرض تجريبي).'));
});

