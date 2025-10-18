// Tajweed Trainer quiz.js (full, with highlight fix)
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

  window.renderQuestion = function(q){
    const el = document.getElementById('quizContainer');
    const html = `<div class='q-ayah'>${highlightTargetWord(q.question,q.targetWord)}</div>`;
    el.innerHTML = html + '<hr>' + (q.options||[]).map(o=>`<div><label><input type="radio" name="opt">${o}</label></div>`).join('');
  };
})();
