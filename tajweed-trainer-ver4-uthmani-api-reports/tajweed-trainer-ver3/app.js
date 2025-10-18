// Tajweed Trainer app.js (full, with option fix)
(function(){
  const normalizeSection = (sec) => {
    if (!sec) return 'other';
    sec = sec.toString().trim();
    if (/مد|المدود|madd|ahkam_almad|ahkam/i.test(sec)) return 'madd';
    if (/النون|تنوين|noon/i.test(sec)) return 'noon';
    if (/الميم|mim/i.test(sec)) return 'mim';
    return 'other';
  };

  const defaultOptions = {
    madd: ['مد طبيعي','مد متصل','مد منفصل','مد لازم'],
    noon: ['إظهار حلقي','إدغام بغنة','إدغام بغير غنة','إخفاء حقيقي','إقلاب'],
    mim:  ['إظهار شفوي','إدغام شفوي','إخفاء شفوي']
  };

  window.__tt_applyOptionsHotfix = function(QUESTIONS){
    if (!Array.isArray(QUESTIONS)) return QUESTIONS;
    QUESTIONS.forEach(q => {
      const secType = normalizeSection(q.__section || q.section || q.category);
      if (!q.options || q.options.length === 0){
        const m = q.question && q.question.match(/مد طبيعي|مد متصل|مد منفصل|مد لازم/g);
        if (m && m.length >= 2){ q.options = [...new Set(m)]; return; }
        if (defaultOptions[secType]) q.options = defaultOptions[secType].slice(0);
      }
    });
    return QUESTIONS;
  };
})();

// Example usage after loading question bank:
// QUESTIONS = __tt_applyOptionsHotfix(QUESTIONS);
