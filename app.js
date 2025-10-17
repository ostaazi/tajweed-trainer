
// State
const state = {
  total: 20,
  viewMode: 'percent', // percent | count
  parts: [33, 33, 34], // [noon, meem, madd] percent
  defaultParts: [33, 33, 34],
  bank: null,
  trainee: localStorage.getItem('tajweed_name') || '',
};

// Elements
const nameInput = () => document.querySelector('#trainee');
const darkBtn = () => document.querySelector('#darkToggle');
const partBadges = () => document.querySelectorAll('.pills .badge');
const triTrack = () => document.querySelector('.tri-track');
const segA = () => document.querySelector('.seg-a');
const segB = () => document.querySelector('.seg-b');
const segC = () => document.querySelector('.seg-c');
const hA = () => document.querySelector('.handle-a');
const hB = () => document.querySelector('.handle-b');
const totalSlider = () => document.querySelector('#total');
const sampleZone = () => document.querySelector('#sampleZone');

// Dark mode
function initDark() {
  const mode = localStorage.getItem('tajweed_theme') || 'dark';
  document.documentElement.classList.toggle('light', mode === 'light');
  darkBtn().textContent = mode === 'light' ? '🌙' : '🌞';
  darkBtn().onclick = () => {
    const cur = document.documentElement.classList.contains('light') ? 'light' : 'dark';
    const next = cur === 'light' ? 'dark' : 'light';
    document.documentElement.classList.toggle('light', next === 'light');
    darkBtn().textContent = next === 'light' ? '🌙' : '🌞';
    localStorage.setItem('tajweed_theme', next);
  };
}

// Name
function initName() {
  nameInput().value = state.trainee;
  nameInput().addEventListener('input', e => {
    state.trainee = e.target.value;
    localStorage.setItem('tajweed_name', state.trainee);
  });
}

// Total slider
function initTotal() {
  totalSlider().value = state.total;
  totalSlider().addEventListener('input', () => {
    state.total = +totalSlider().value;
    renderBadges();
    renderSegments();
  });
}

// Tri slider (two handles + three segments)
function initTriSlider() {
  const track = triTrack();
  let dragging = null;

  const px = p => (track.clientWidth * p / 100);

  const updateFromHandles = () => {
    const left = parseFloat(hA().style.left) || 0;
    const right = parseFloat(hB().style.left) || 0;

    // Handles constrained
    let p1 = Math.max(0, Math.min(left, track.clientWidth));
    let p2 = Math.max(p1+12, Math.min(right, track.clientWidth)); // keep gap for handles

    const a = Math.round((p1 / track.clientWidth) * 100);
    const b = Math.round(((p2 - p1) / track.clientWidth) * 100);
    const c = 100 - a - b;
    state.parts = [a, b, c];
    renderSegments();
    renderBadges();
  };

  const onDown = (which, e) => {
    dragging = which;
    e.preventDefault();
  };
  const onMove = e => {
    if(!dragging) return;
    const rect = track.getBoundingClientRect();
    let x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;

    if (dragging==='a') {
      x = Math.max(0, Math.min(x, track.clientWidth-24));
      hA().style.left = x + 'px';
    } else {
      // ensure right handle >= left+24
      const leftX = parseFloat(hA().style.left)||0;
      x = Math.max(leftX+24, Math.min(x, track.clientWidth));
      hB().style.left = x + 'px';
    }
    updateFromHandles();
  };
  const onUp = () => dragging = null;

  hA().addEventListener('mousedown', e=>onDown('a',e));
  hB().addEventListener('mousedown', e=>onDown('b',e));
  hA().addEventListener('touchstart', e=>onDown('a',e), {passive:false});
  hB().addEventListener('touchstart', e=>onDown('b',e), {passive:false});
  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchmove', onMove, {passive:false});
  window.addEventListener('mouseup', onUp);
  window.addEventListener('touchend', onUp);

  // click toggles display mode
  track.addEventListener('click', () => {
    state.viewMode = state.viewMode === 'percent' ? 'count' : 'percent';
    renderSegments();
    renderBadges();
  });

  // reset button
  document.querySelector('#resetDist').onclick = () => {
    state.parts = [...state.defaultParts];
    // set handles by parts
    const aLeft = triTrack().clientWidth * (state.parts[0]/100);
    const bLeft = triTrack().clientWidth * ((state.parts[0]+state.parts[1])/100);
    hA().style.left = aLeft + 'px';
    hB().style.left = bLeft + 'px';
    renderSegments();
    renderBadges();
  };

  // initial handles
  const aLeft = px(state.parts[0]);
  const bLeft = px(state.parts[0]+state.parts[1]);
  hA().style.left = aLeft + 'px';
  hB().style.left = bLeft + 'px';

  // initial paint
  renderSegments();
  renderBadges();

  // handle resize
  new ResizeObserver(()=>{
    const total = state.parts[0]+state.parts[1];
    hA().style.left = px(state.parts[0]) + 'px';
    hB().style.left = px(total) + 'px';
    renderSegments();
  }).observe(track);
}

function renderSegments(){
  const [a,b,c] = state.parts;
  const total = triTrack().clientWidth;
  segA().style.left = '0px';
  segA().style.width = (total * a/100) + 'px';

  segB().style.left = (total * a/100) + 'px';
  segB().style.width = (total * b/100) + 'px';

  segC().style.left = (total * (a+b)/100) + 'px';
  segC().style.width = (total * c/100) + 'px';

  const counts = partsToCounts();
  segA().innerHTML = `<span>${state.viewMode==='percent'? a+'%': counts[0]+' س'}</span>`;
  segB().innerHTML = `<span>${state.viewMode==='percent'? b+'%': counts[1]+' س'}</span>`;
  segC().innerHTML = `<span>${state.viewMode==='percent'? c+'%': counts[2]+' س'}</span>`;
}

function partsToCounts(){
  const [a,b,c] = state.parts;
  let n1 = Math.round(state.total * a/100);
  let n2 = Math.round(state.total * b/100);
  let n3 = state.total - n1 - n2;
  return [n1,n2,n3];
}

function renderBadges(){
  const [n1,n2,n3] = partsToCounts();
  const nodes = partBadges();
  if (state.viewMode==='percent'){
    nodes[0].querySelector('.txt').textContent = `${state.parts[0]}%`;
    nodes[1].querySelector('.txt').textContent = `${state.parts[1]}%`;
    nodes[2].querySelector('.txt').textContent = `${state.parts[2]}%`;
  } else {
    nodes[0].querySelector('.txt').textContent = `${n1} سؤال`;
    nodes[1].querySelector('.txt').textContent = `${n2} سؤال`;
    nodes[2].querySelector('.txt').textContent = `${n3} سؤال`;
  }
}

function highlightTargets(str){
  // replace [[...]] with span.ayah-target
  return str.replace(/\[\[([^\]]+)\]\]/g, '<span class="ayah-target">$1</span>');
}

function renderSamples(){
  const samples = [
    {q:`قال تعالى: {كَلَّا لَئِن لَّمْ يَنتَهِ لَنَسْفَعًا بِٱلنَّاصِيَةِ}- أين الكلمة المستهدفة؟`, a:'', opts:['مثال']},
    {q:`قال تعالى: {وَأَنزَلَ بِهِ رُوحُ ٱلْأَمِينِ}- ما حكم النون الساكنة؟`, a:2, opts:['إظهار','إدغام','إخفاء','إقلاب']},
  ];
  sampleZone().innerHTML = samples.map((s,i)=>`
    <div class="section question">
      <div class="qtext"><span class="qspan">${highlightTargets(s.q.replace('[[','[[').replace('ٱلنَّاصِيَةِ','[[ٱلنَّاصِيَةِ]]').replace('وَأَنزَلَ','[[أَنزَلَ]]'))}</span></div>
      ${s.opts.length>1? `<div class="options">` + s.opts.map((o,k)=>`
        <label class="option"><input name="s${i}" type="radio"> ${o}</label>
      `).join('') + `</div>` : ''}
    </div>
  `).join('');
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  initDark();
  initName();
  initTotal();
  initTriSlider();
  renderSamples();
});
