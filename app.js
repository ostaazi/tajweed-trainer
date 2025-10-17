// ------------------------
// بيانات أولية
// ------------------------
const TOTAL_MIN = 5;
const TOTAL_MAX = 100;
const state = {
  unit: "percent", // 'percent' or 'count' — toggled by clicking the slider
  total: 20,
  // القيم الثلاثة: [noon, meem, madd] — مخزنة كنسب، وسنحوّلها للأعداد عند الحاجة
  parts: [33, 33, 34],
  bankCount: 1100
};
window.sectionDistribution = state;

// عناصر DOM
const totalCount = document.getElementById('totalCount');
const totalCountVal = document.getElementById('totalCountVal');
const tri = document.getElementById('triSlider');
const legend = {
  noon: document.getElementById('chip-noon'),
  meem: document.getElementById('chip-meem'),
  madd: document.getElementById('chip-madd')
};
document.getElementById('bankCount').textContent = state.bankCount.toString();

// تحديث عرض العدد الكلي
function renderTotal() {
  totalCountVal.textContent = state.total;
}
totalCount.addEventListener('input', e => {
  state.total = parseInt(totalCount.value, 10);
  renderLegend();
  renderTotal();
});
renderTotal();

// ------------------------
// إنشاء منزلق بثلاث وصلات (مقبضان => ثلاثة أجزاء)
// ------------------------
noUiSlider.create(tri, {
  start: [33, 66], // حدود الجزء الأول والثاني كنسب
  connect: [true, true, true],
  direction: 'rtl',
  range: { min: 0, max: 100 },
  step: 1,
  tooltips: [true, true],
  format: {
    to: v => `${Math.round(v)}%`,
    from: v => Number(String(v).replace('%', ''))
  }
});

// تحويل موضع المقابض إلى ثلاث نسب
function handlesToParts(handles) {
  const a = handles[0], b = handles[1];
  let p1 = a;
  let p2 = b - a;
  let p3 = 100 - b;
  // ضمان ألا تقل أي قيمة عن 0 وأن يجتمعوا إلى 100
  p1 = Math.max(0, Math.min(100, p1));
  p2 = Math.max(0, Math.min(100, p2));
  p3 = Math.max(0, Math.min(100, p3));
  const sum = p1 + p2 + p3 || 1;
  return [p1, p2, p3].map(v => Math.round((v / sum) * 100));
}

// تعيين المقابض وفقًا لنِسَب
function partsToHandles(parts) {
  const [p1, p2, p3] = parts;
  return [p1, p1 + p2];
}

// رندر الشيبس (مع التبديل بين % و عدد)
function renderLegend() {
  const [p1, p2, p3] = state.parts;
  if (state.unit === 'percent') {
    legend.noon.innerHTML = `النون الساكنة والتنوين <b>${p1}%</b>`;
    legend.meem.innerHTML = `الميم الساكنة <b>${p2}%</b>`;
    legend.madd.innerHTML = `أحكام المدود <b>${p3}%</b>`;
  } else {
    const n1 = Math.round(state.total * p1 / 100);
    const n2 = Math.round(state.total * p2 / 100);
    const n3 = state.total - n1 - n2;
    legend.noon.innerHTML = `النون الساكنة والتنوين <b>${n1}</b>`;
    legend.meem.innerHTML = `الميم الساكنة <b>${n2}</b>`;
    legend.madd.innerHTML = `أحكام المدود <b>${n3}</b>`;
  }
}
renderLegend();

// استماع لتغيّر المقابض
tri.noUiSlider.on('update', (vals, handle, raw) => {
  // raw تكون أرقام بدون علامة % حسب الفورمات
  const numbers = tri.noUiSlider.get(true); // true => raw numbers
  state.parts = handlesToParts(numbers);
  renderLegend();
});

// نقرة واحدة على المساحة تبدّل الوحدة (٪ ↔ عدد)
tri.addEventListener('mousedown', (evt) => {
  // لا نبدّل إذا كان السحب على المقبض نفسه (نعتمد target)
  if (evt.target.classList.contains('noUi-handle')) return;
  state.unit = (state.unit === 'percent') ? 'count' : 'percent';
  renderLegend();
});

// زر "توزيع افتراضي"
document.getElementById('resetDefault').addEventListener('click', () => {
  state.parts = [33, 33, 34];
  tri.noUiSlider.set(partsToHandles(state.parts));
  renderLegend();
});

// ضبط البداية على 33/33/34
tri.noUiSlider.set(partsToHandles(state.parts));

// ------------------------
// أمثلة تلوين [[...]] → span.ayah-target
// ------------------------
const DUMMY = [
  "قال تعالى: {كَلَّا لَئِن لَّمْ يَنتَهِ لَنَسْفَعًا بِالنَّاصِيَةِ} - أين الكلمة المستهدفة؟ مثال [[النَّاصِيَةِ]].",
  "قال تعالى: {وَأَنزَلَ بِهِ رُوحُ الْأَمِينِ} - ما حكم النون الساكنة؟ [[أَنزَلَ]]"
];

function colorTargets(text) {
  return text.replace(/\[\[(.+?)\]\]/g, '<span class="ayah-target">$1</span>');
}

const demoList = document.getElementById('demoList');
DUMMY.forEach((q, i) => {
  const li = document.createElement('li');
  li.className = 'q-item';
  li.innerHTML = colorTargets(q);
  demoList.appendChild(li);
});

// حفظ الاسم محليًا
const nameInput = document.getElementById('traineeName');
nameInput.addEventListener('input', () => {
  localStorage.setItem('tajweed_trainee_name', nameInput.value || '');
});
nameInput.value = localStorage.getItem('tajweed_trainee_name') || '';
