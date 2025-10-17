
const trainee = document.getElementById('trainee');
const sectionSel = document.getElementById('section');
const btnShort = document.getElementById('btnShort');
const btnFull = document.getElementById('btnFull');
const themeBtn = document.getElementById('theme');
const countSlider = document.getElementById('countSlider');
const qCountLabel = document.getElementById('qCount');
const tri = document.getElementById('tri');
const segs = [document.getElementById('seg1'), document.getElementById('seg2'), document.getElementById('seg3')];
const handles = [document.getElementById('h1'), document.getElementById('h2')];
const modeHint = document.getElementById('modeHint');
const qList = document.getElementById('qList');
const endTop = document.getElementById('endTop');

// ---- theme
function loadTheme(){
  const t = localStorage.getItem('tajweed_theme') || 'dark';
  document.documentElement.className = (t === 'light') ? 'light' : 'dark';
}
loadTheme();
themeBtn.addEventListener('click', ()=>{
  const nowLight = document.documentElement.classList.contains('light');
  document.documentElement.className = nowLight ? 'dark' : 'light';
  localStorage.setItem('tajweed_theme', nowLight ? 'dark' : 'light');
});

// ---- trainee
trainee.value = localStorage.getItem('tajweed_trainee') || '';
trainee.addEventListener('input', ()=> localStorage.setItem('tajweed_trainee', trainee.value));

// ---- question count
qCountLabel.textContent = countSlider.value;
countSlider.addEventListener('input', ()=> qCountLabel.textContent = countSlider.value);

// ---- tri-slider state
let total = 100;
let pcts = [33,33,34]; // [noon, meem, madd]
let showCounts = false;

function refreshSegs(){
  for(let i=0;i<3;i++){
    segs[i].style.width = pcts[i]+'%';
    segs[i].textContent = showCounts ? Math.round(pcts[i]*countSlider.value/100) : pcts[i]+'%';
  }
  handles[0].style.left = pcts[0]+'%';
  handles[1].style.left = (pcts[0]+pcts[1])+'%';
  modeHint.textContent = 'الوضع: ' + (showCounts ? 'أعداد الأسئلة' : 'نِسَب مئوية');
}
refreshSegs();

// toggle display
tri.addEventListener('click', (e)=>{
  if(e.target.classList.contains('handle')) return; // ignore when dragging
  showCounts = !showCounts;
  refreshSegs();
});

// drag logic
let dragging = -1, startX=0, startPcts=null;
handles.forEach((h,idx)=>{
  h.addEventListener('mousedown', startDrag(idx));
  h.addEventListener('touchstart', startDrag(idx), {passive:false});
});
function startDrag(idx){
  return (ev)=>{
    ev.preventDefault();
    dragging = idx;
    startX = ('touches' in ev) ? ev.touches[0].clientX : ev.clientX;
    startPcts = [...pcts];
    window.addEventListener('mousemove', onMove, {passive:false});
    window.addEventListener('touchmove', onMove, {passive:false});
    window.addEventListener('mouseup', endDrag);
    window.addEventListener('touchend', endDrag);
  };
}
function onMove(ev){
  if(dragging<0) return;
  const x = ('touches' in ev) ? ev.touches[0].clientX : ev.clientX;
  const dx = x - startX;
  const rect = tri.getBoundingClientRect();
  const dPct = (dx/rect.width)*100;
  if(dragging===0){
    let newP0 = clamp(startPcts[0]+dPct, 5, 95-startPcts[2]); // leave room for others
    pcts[1] = startPcts[1] + (startPcts[0]-newP0);
    pcts[0] = newP0;
  }else{
    let cut = startPcts[0]+startPcts[1];
    let newCut = clamp(cut+dPct, startPcts[0]+5, 95);
    pcts[1] = newCut - pcts[0];
    pcts[2] = 100 - newCut;
  }
  refreshSegs();
}
function endDrag(){
  dragging=-1;
  window.removeEventListener('mousemove', onMove);
  window.removeEventListener('touchmove', onMove);
  window.removeEventListener('mouseup', endDrag);
  window.removeEventListener('touchend', endDrag);
}
function clamp(v,min,max){return Math.max(min, Math.min(max,v));}

// ---- demo questions with [[target]] markers
const BANK = [
  {section:'noon', text:'قال تعالى: {كَلّا لَئِنْ لَمْ يَنْتَهِ لَنَسْفَعًا بِالنَّاصِيَةِ} - ما حكم النون الساكنة؟', target:'[[يَنْتَهِ]]', options:['إظهار','إدغام','إخفاء','إقلاب'], answer:2},
  {section:'noon', text:'قال تعالى: {مِنْ رَبِّهِمْ} - ما حكم النون الساكنة؟', target:'[[مِنْ]]', options:['إظهار','إدغام','إخفاء','إقلاب'], answer:0},
  {section:'meem', text:'قال تعالى: {هُمْ يَسْأَلُونَكَ} - ما حكم الميم الساكنة؟', target:'[[هُمْ]]', options:['إظهار شفوي','إدغام شفوي','إخفاء شفوي','قلب'], answer:2},
  {section:'meem', text:'قال تعالى: {إِنَّهُمْ بِهِ} - ما حكم الميم الساكنة؟', target:'[[هُمْ]]', options:['إظهار شفوي','إدغام شفوي','إخفاء شفوي','قلب'], answer:0},
  {section:'madd', text:'قال تعالى: {قَالُوا يَا أَبَانَا} - ما نوع المد؟', target:'[[قَالُوا]]', options:['مد طبيعي','مد منفصل','مد متصل','مد لازم'], answer:0},
  {section:'madd', text:'قال تعالى: {جَاءَ} - ما نوع المد؟', target:'[[جَاءَ]]', options:['مد طبيعي','مد منفصل','مد متصل','مد لازم'], answer:2},
];

function renderQuestion(q, idx){
  const card = document.createElement('div'); card.className='card';
  const text = document.createElement('div'); text.className='qtext ayah';
  text.innerHTML = colorTarget(q.text, q.target);
  card.appendChild(text);

  const opts = document.createElement('div'); opts.className='opts';
  q.options.forEach((label,i)=>{
    const opt = document.createElement('label'); opt.className='opt';
    const radio = document.createElement('input'); radio.type='radio'; radio.name='q'+idx; radio.value=i;
    const span = document.createElement('span'); span.textContent = label;
    opt.appendChild(radio); opt.appendChild(span); opts.appendChild(opt);
  });
  card.appendChild(opts);
  return card;
}
function colorTarget(text, target){
  const escaped = target.replaceAll('[','\[').replaceAll(']','\]');
  const re = new RegExp(escaped, 'g');
  return (text+' ').replace(re, (m)=>'<span class="ayah-target">'+m.replaceAll('[','').replaceAll(']','')+'</span>');
}

function buildDemo(){
  qList.innerHTML='';
  const N = +countSlider.value;
  // pick N from BANK cycling
  for(let i=0;i<Math.min(N, BANK.length); i++){
    qList.appendChild(renderQuestion(BANK[i%BANK.length], i));
  }
  appendBottomEnd();
}
function appendBottomEnd(){
  const row = document.createElement('div'); row.className='end-row';
  const btn = document.createElement('button'); btn.className='btn end'; btn.textContent='إنهاء الاختبار';
  btn.onclick = handleEnd;
  row.appendChild(btn);
  qList.appendChild(row);
}
function handleEnd(){
  // demo only
  const unanswered = [...document.querySelectorAll('.opts')].filter(x=>!x.querySelector('input:checked')).length;
  if(unanswered>0 && !confirm('لا تزال هناك أسئلة بلا إجابة ('+unanswered+'). هل تريد الإنهاء؟')) return;
  alert('تم الإنهاء (عرض تجريبي). اربط هذه الدالة بمصحّحك.');
}
endTop.onclick = handleEnd;

btnShort.onclick = buildDemo;
btnFull.onclick = buildDemo;
