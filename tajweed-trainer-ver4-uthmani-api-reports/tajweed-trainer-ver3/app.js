// app.js — FINAL (original layout preserved)
// Call once AFTER loading the question bank:  QUESTIONS = __tt_applyOptionsHotfix(QUESTIONS);
(function(){
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
      // Fill missing options from the question text (author order) or sane defaults by section
      if (!q.options || q.options.length === 0){
        const listed = q.question && q.question.match(/مد طبيعي|مد متصل|مد منفصل|مد لازم/g);
        if (listed && listed.length >= 2){ q.options = [...new Set(listed)]; return; }
        if (defaults[secType]) q.options = defaults[secType].slice(0);
      }
    });
    return QUESTIONS;
  };
})();
