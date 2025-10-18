/* link-bank-patch.js — Smart Bank Loader for GitHub Pages (v2) */
(async function(){
  async function loadJSON(url){
    const r = await fetch(url, {headers:{'Content-Type':'application/json'}});
    if(!r.ok) throw new Error(url+' → '+r.status);
    return r.json();
  }

  function normalizeBank(bank){
    if (Array.isArray(bank)) return bank;
    if (!bank || typeof bank!=='object') return [];

    if (Array.isArray(bank.questions)) return bank.questions;
    if (Array.isArray(bank.data))      return bank.data;
    if (Array.isArray(bank.items))     return bank.items;

    if (Array.isArray(bank.sections)) {
      const merged=[];
      for (const sec of bank.sections){
        if (sec && Array.isArray(sec.questions)) merged.push(...sec.questions);
      }
      if (merged.length) return merged;
    }

    const merged=[];
    for (const k in bank){
      if (Array.isArray(bank[k])) merged.push(...bank[k]);
    }
    return merged;
  }

  async function init(){
    try{
      let bank = await loadJSON('questions_bank.json');
      let questions = normalizeBank(bank);

      if (!questions.length){
        try{
          const alt = await loadJSON('quiz_bank.json');
          questions = normalizeBank(alt);
        }catch(_){}
      }

      const mushaf = await loadJSON('quran_uthmani.json');
      window.QURAN_UTHMANI = mushaf;
      window.QUESTIONS = questions;

      if (typeof window.__tt_applyOptionsHotfix === 'function'){
        window.QUESTIONS = window.__tt_applyOptionsHotfix(window.QUESTIONS);
      }

      if (typeof window.buildQuiz === 'function'){
        window.buildQuiz(window.QUESTIONS);
      } else if (typeof window.initQuiz === 'function'){
        window.initQuiz(window.QUESTIONS);
      }

      console.log('[link-bank-patch] Bank linked. Questions:', window.QUESTIONS.length);
    }catch(e){
      console.error('[link-bank-patch] Error:', e);
    }
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
