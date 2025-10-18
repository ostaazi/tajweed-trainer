// quiz.js — highlight + Uthmani font (no layout changes)
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
      return text.replace(rx, (m)=>'<span class="target-word" style="color:#009c47;background:rgba(0,200,120,.18);font-weight:700;border-radius:3px;padding:0 2px">'+m+'</span>');
    }catch{ return text; }
  };
  window.applyUthmaniFont = function(el){
    if (!el) return;
    el.style.fontFamily = "'KFGQPC Uthmanic Script HAFS','Uthmanic Hafs',serif";
  };
})();