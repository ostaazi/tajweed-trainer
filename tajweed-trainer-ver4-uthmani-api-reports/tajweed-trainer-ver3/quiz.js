// quiz.js — Logic-only helpers (no CSS/layout changes)
// Use applyUthmaniFont(el) on the ayah node; it only sets font-family.
// Use highlightTargetWord(text, target) and assign to innerHTML.
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

  // Only color + bolder; NO size/margins/padding to keep layout intact.
  window.highlightTargetWord = function(text, target, color){
    if (!target) return text;
    try{
      const rx = makeInsensitiveRegex(target);
      if (!rx) return text;
      const col = color || '#0d6efd'; // you may pass your theme color
      return text.replace(rx, (m)=>`<span class="target-word" style="color:${col};font-weight:700">${m}</span>`);
    }catch{ return text; }
  };

  // Apply Uthmani font family only (keeps original sizes/line-height)
  window.applyUthmaniFont = function(el){
    if (!el) return;
    el.style.fontFamily = `'KFGQPC Uthmanic Script HAFS','Uthmanic Hafs',serif`;
  };
})();
