// app.js — GitHub Pages READY + Auto-Hotfix Apply (no layout changes)
(function(){
  // 1) Redirect local JSON fetches to /data/
  const _origFetch = window.fetch;
  window.fetch = function(resource, init){
    try{
      const url = (typeof resource === 'string') ? resource : (resource && resource.url) || '';
      let redirected = url;
      if (/(^|\/)questions_bank\.json(\?|$)/.test(url)) redirected = url.replace(/(^|\/)questions_bank\.json(\?|$)/, '$1data/questions_bank.json$2');
      if (/(^|\/)quran_uthmani\.json(\?|$)/.test(url)) redirected = url.replace(/(^|\/)quran_uthmani\.json(\?|$)/, '$1data/quran_uthmani.json$2');
      if (redirected !== url) return _origFetch(redirected, init);
    }catch{}
    return _origFetch(resource, init);
  };

  // 2) Section normalization + options fallback
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

  // 3) Auto-apply once QUESTIONS are loaded (polling, then stop)
  (function autoApply(){
    let tries = 0;
    const maxTries = 80; // ~24s at 300ms
    const t = setInterval(()=>{
      tries++;
      if (Array.isArray(window.QUESTIONS) && window.QUESTIONS.length && !window.__tt_hotfix_applied){
        window.QUESTIONS = window.__tt_applyOptionsHotfix(window.QUESTIONS);
        window.__tt_hotfix_applied = true;
        clearInterval(t);
      }
      if (tries >= maxTries) clearInterval(t);
    }, 300);
  })();
})();
