// quiz.js — تلوين الكلمة المستهدفة (غير حساس للتشكيل) + عرض بسيط للسؤال
(function(){
  const AR_DIAC = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
  const stripDiac = s => (s||'').replace(AR_DIAC, '');

  function makeInsensitiveRegex(raw){
    const letters = stripDiac(raw).split('');
    if (!letters.length) return null;
    const spacer = '[\\u0610-\\u061A\\u064B-\\u065F\\u0670\\u06D6-\\u06ED]*';
    const body = letters.map(ch => ch.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + spacer).join('');
    return new RegExp(body, 'g');
  }

  window.highlightTargetWord = function(text, target){
    if (!target) return text;
    try{
      const rx = makeInsensitiveRegex(target);
      if (!rx) return text;
      return text.replace(rx, (m)=>`<span class="target-word">${m}</span>`);
    }catch(e){ return text; }
  };

  // عرض بسيط للسؤال دون تغيير في تصميمك العام
  window.renderQuestion = function(q){
    const host = document.getElementById('quizContainer');
    const ayahHTML = `<div class="q-ayah">${highlightTargetWord(q.question, q.targetWord)}</div>`;
    const opts = (q.options||[]).map((o,i)=>`
      <div class="form-check" style="max-width:600px;margin:0.35rem auto;">
        <input class="form-check-input" type="radio" name="opt" id="o${i}">
        <label class="form-check-label" for="o${i}">${o}</label>
      </div>`).join('');
    host.innerHTML = ayahHTML + '<div style="margin-top:10px;">' + opts + '</div>';
  };
})();
