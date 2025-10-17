// حفظ الوضع واسم المتدرب
const root = document.documentElement;
const savedMode = localStorage.getItem("mode") || "dark";
if(savedMode === "light"){ document.body.classList.add("light"); }
const modeBtn = document.getElementById("modeBtn");
modeBtn.onclick = () => {
  document.body.classList.toggle("light");
  localStorage.setItem("mode", document.body.classList.contains("light") ? "light" : "dark");
};

const nameInput = document.getElementById("traineeName");
nameInput.value = localStorage.getItem("traineeName") || "";
nameInput.addEventListener("input", ()=>localStorage.setItem("traineeName", nameInput.value.trim()));

// محدد عدد الأسئلة
const countRange = document.getElementById("countRange");
const countVal = document.getElementById("countVal");
const tri = document.getElementById("triSlider");
countVal.textContent = countRange.value;
countRange.addEventListener("input", ()=>{
  countVal.textContent = countRange.value;
  updateLabels();
});

// المنزلق الثلاثي بقيم نقطتي القطع
const cut1 = document.getElementById("cut1");
const cut2 = document.getElementById("cut2");
const segA = document.getElementById("segA");
const segB = document.getElementById("segB");
const segC = document.getElementById("segC");
const segALabel = document.getElementById("segALabel");
const segBLabel = document.getElementById("segBLabel");
const segCLabel = document.getElementById("segCLabel");

let showPercent = true; // التبديل بين % وعدد الأسئلة بالنقر على الشريط
tri.addEventListener("click", (e)=>{
  // تجاهل النقرات على المقابض
  if(e.target === cut1 || e.target === cut2) return;
  showPercent = !showPercent;
  updateLabels();
});

function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

function updateSegments(){
  // ضبط ترتيب وتداخل النقاط
  let v1 = parseInt(cut1.value,10);
  let v2 = parseInt(cut2.value,10);
  if(v1>v2){ const t=v1; v1=v2; v2=t; cut1.value=v1; cut2.value=v2; }

  // حدود فاصلة لتفادي تطابق تام
  cut1.value = clamp(v1, 5, 95);
  cut2.value = clamp(v2, 5, 95);

  v1 = parseInt(cut1.value,10);
  v2 = parseInt(cut2.value,10);

  const a = v1;
  const b = v2 - v1;
  const c = 100 - v2;

  segA.style.width = a + "%";
  segB.style.left = a + "%";
  segB.style.width = b + "%";
  segC.style.left = (a + b) + "%";
  segC.style.width = c + "%";

  updateLabels();
}

function updateLabels(){
  const total = parseInt(countRange.value,10);
  const a = parseInt(cut1.value,10);
  const b = parseInt(cut2.value,10) - a;
  const c = 100 - parseInt(cut2.value,10);

  if(showPercent){
    segALabel.textContent = a + "%";
    segBLabel.textContent = b + "%";
    segCLabel.textContent = c + "%";
  }else{
    segALabel.textContent = Math.round(total * a/100);
    segBLabel.textContent = Math.round(total * b/100);
    segCLabel.textContent = Math.round(total * c/100);
  }
}

cut1.addEventListener("input", updateSegments);
cut2.addEventListener("input", updateSegments);
updateSegments();

// عيّنة أسئلة للتجربة (مع [[...]] للتلوين)
const sampleQuestions = [
  { text: "قال تعالى: {كَلاَّ لَئِنْ لَمْ يَنْتَهِ [[لَنَسْفَعًا]] بِالنَّاصِيَةِ} - أين الكلمة المستهدفة؟", opts:["مثال"], answer:0 },
  { text: "قال تعالى: {[[أُنْزِل]] بِهِ رُوحُ الْأَمِينِ} - ما حكم النون الساكنة؟", opts:["إظهار","إدغام","إخفاء","إقلاب"], answer:0 },
  { text: "قال تعالى: {إِنَّ رَبَّهُمْ بِهِمْ} - ما حكم الميم الساكنة؟", opts:["إظهار شفوي","إدغام شفوي","إخفاء شفوي قلب","إقلاب"], answer:2 },
];

const qList = document.getElementById("questions");

function highlightAyah(text){
  return text.replace(/\[\[(.+?)\]\]/g, '<span class="ayah-target">$1</span>');
}

function renderQuestions(list){
  qList.innerHTML = "";
  list.forEach((q, i)=>{
    const li = document.createElement("li");
    li.className = "question";
    const qtxt = document.createElement("div");
    qtxt.className = "qtext";
    qtxt.innerHTML = highlightAyah(q.text);
    li.appendChild(qtxt);

    const opts = document.createElement("div");
    opts.className = "options";
    (q.opts.length ? q.opts : ["مثال"]).forEach((o, idx)=>{
      const wrap = document.createElement("label"); wrap.className="opt";
      const radio = document.createElement("input"); radio.type="radio"; radio.name="q"+i; radio.value=idx;
      wrap.appendChild(radio);
      wrap.appendChild(document.createTextNode(" "+o));
      opts.appendChild(wrap);
    });
    li.appendChild(opts);
    qList.appendChild(li);
  });
}

renderQuestions(sampleQuestions);

// أزرار الإنهاء (تحذير إن بقيت أسئلة دون إجابة)
function handleEnd(){
  const total = sampleQuestions.length;
  const answered = Array.from(document.querySelectorAll('.options'))
    .filter(el => el.querySelector('input:checked')).length;
  if(answered < total){
    const ok = confirm("يوجد أسئلة غير مُجابة ("+(total-answered)+"). هل تريد إنهاء الاختبار؟");
    if(!ok) return;
  }
  alert("انتهى الاختبار. سيتم الانتقال إلى صفحة النتائج.");
}

document.getElementById("endTop").onclick = handleEnd;
document.getElementById("endBottom").onclick = handleEnd;

// الأزرار الأخرى (عرض تجريبي)
document.getElementById("shortBtn").onclick = ()=>alert("اختبار قصير — عرض تجريبي");
document.getElementById("fullBtn").onclick = ()=>alert("اختبار شامل — عرض تجريبي");
