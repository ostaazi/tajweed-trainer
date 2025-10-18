// uthmani-font.js — apply Uthmani font to ayah text only (no layout changes)
(function(){
  function apply(el){
    if (!el) return;
    el.style.fontFamily = "'KFGQPC Uthmanic Script HAFS', serif";
  }
  function pickAyahNode(){
    return document.querySelector('.ayah, .ayah-text, .question-text, .quiz-ayah, .q-ayah, #ayah, #questionText, [data-ayah]');
  }
  function init(){
    apply(pickAyahNode());
    document.addEventListener('tt:question:render', ()=>apply(pickAyahNode()));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  window.__tt_applyUthmaniFont = apply;
})();
