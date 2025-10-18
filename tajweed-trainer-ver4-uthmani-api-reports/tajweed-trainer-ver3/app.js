// app.js — GitHub Pages READY (redirect JSONs to /data/ + hotfix + safe DOM writes)
(function(){
  const _origFetch = window.fetch;
  window.fetch = function(resource, init){
    try{
      const url = (typeof resource === 'string') ? resource : (resource && resource.url) || '';
      let redirected = url;
      if (/(^|\/)questions_bank\.json(\?|$)/.test(url)) redirected = url.replace(/(^|\/)questions_bank\.json(\?|$)/, '$1data/questions_bank.json$2');
      if (/(^|\/)quran_uthmani\.json(\?|$)/.test(url)) redirected = url.replace(/(^|\/)quran_uthmani\.json(\?|$)/, '$1data/quran_uthmani.json$2');
      if (/(^|\/)quiz_bank\.json(\?|$)/.test(url)) redirected = url.replace(/(^|\/)quiz_bank\.json(\?|$)/, '$1data/quiz_bank.json$2');
      if (redirected !== url) return _origFetch(redirected, init);
    }catch{}
    return _origFetch(resource, init);
  };

  window.__tt_safeText = function(sel, value){
    var el = document.querySelector(sel);
    if (el) el.textContent = value;
  };

  const normalizeSection = (sec) => {
    if (!sec) return 'other';
    sec = String(sec).trim();
    if (/مد|المدود|madd|ahkam_almad|ahkam/i.test(sec)) return 'madd';
    if (/النون|تنوين|noon/i.test(sec)) return 'noon';
    if (/الميم|mim/i.test(sec)) return 'mim';
    return 'other';
  };
  const defaults = {
    madd: ['مد طبيعي','مد متصل','مد منفصل','مد لازم'],
    noon: ['إظهار حلقي','إدغام بغنة','إدغام بغير غنة','إخفاء حقيقي','إقلاب'],
    mim:  ['إظهار شفوي','إدغام شفوي','إخفاء شفوي']
  };
  window.__tt_applyOptionsHotfix = function(QUESTIONS){
    if (!Array.isArray(QUESTIONS)) return QUESTIONS;
    QUESTIONS.forEach(q => {
      const secType = normalizeSection(q.__section || q.section || q.category);
      if (!q.options || q.options.length === 0){
        const listed = q.question && q.question.match(/مد طبيعي|مد متصل|مد منفصل|مد لازم/g);
        if (listed && listed.length >= 2){ q.options = [...new Set(listed)]; return; }
        if (defaults[secType]) q.options = defaults[secType].slice(0);
      }
    });
    return QUESTIONS;
  };
})();