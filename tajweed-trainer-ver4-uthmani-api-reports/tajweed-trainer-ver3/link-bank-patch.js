// link-bank-patch.js — Minimal, design-safe patch to link the quiz to the questions bank on GitHub Pages.
// Drop this file next to quiz.html and include it AFTER app.js and BEFORE/OR AFTER quiz.js.
// It loads /data/questions_bank.json and /data/quran_uthmani.json, exposes them on window,
// and invokes the existing hotfix (if present). No UI/design changes.

(function(){
  async function loadJSON(url){
    const res = await fetch(url, {headers: {'Content-Type':'application/json'}});
    if (!res.ok) throw new Error('Failed to load '+url+' ('+res.status+')');
    return await res.json();
  }

  async function init(){
    try{
      const [bank, mushaf] = await Promise.all([
        loadJSON('data/questions_bank.json'),
        loadJSON('data/quran_uthmani.json')
      ]);

      // Expose globally for existing code
      window.QUESTIONS = Array.isArray(bank) ? bank : (bank.questions || bank.data || []);
      window.QURAN_UTHMANI = mushaf;

      // Apply the hotfix if available (fills missing options / normalizes sections)
      if (typeof window.__tt_applyOptionsHotfix === 'function'){
        window.QUESTIONS = window.__tt_applyOptionsHotfix(window.QUESTIONS);
      }

      // If your app has an init/build function, call it safely
      if (typeof window.buildQuiz === 'function'){
        window.buildQuiz(window.QUESTIONS);
      } else if (typeof window.initQuiz === 'function'){
        window.initQuiz(window.QUESTIONS);
      }

      console.log('[link-bank-patch] Bank linked. Questions:', window.QUESTIONS.length);
    } catch (e){
      console.error('[link-bank-patch] Error:', e);
    }
  }

  // Start after DOM ready
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
