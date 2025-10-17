
/**
 * Hybrid Quran Uthmani loader
 * - If an element has [data-verse="S:A"], we fetch the official Uthmani text online (when available).
 * - Otherwise we keep local text but ensure it's wrapped in <span class="ayah"> for the Uthmani font.
 * - Fallback to local quran_uthmani.json when offline/no CORS.
 */
(function () {
  const FETCH_TIMEOUT = 4500;
  function timeout(promise, ms) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("timeout")), ms);
      promise.then((v) => { clearTimeout(t); resolve(v); })
             .catch((e) => { clearTimeout(t); reject(e); });
    });
  }

  async function fetchUthmaniFromQuranCom(verseKey) {
    const url = `https://api.quran.com/api/v4/quran/verses/uthmani?verse_key=${encodeURIComponent(verseKey)}`;
    const res = await timeout(fetch(url, {mode:'cors'}), FETCH_TIMEOUT);
    if (!res.ok) throw new Error("quran.com api status " + res.status);
    const json = await res.json();
    if (json && json.verses && json.verses.length) {
      return json.verses[0].text_uthmani;
    }
    throw new Error("quran.com unexpected payload");
  }

  
  function escapeRegExp(s){return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');}
  function applyHighlights(el, targets){
    if(!targets || !targets.length) return;
    const node = el.querySelector('.ayah') || el;
    let html = node.innerHTML;
    // Sort longer targets first to prevent nested overlaps
    targets.sort((a,b)=>b.length-a.length);
    targets.forEach(t=>{
      if(!t) return;
      const re = new RegExp(escapeRegExp(t), 'g');
      html = html.replace(re, '<span class="ayah-target">$&</span>');
    });
    node.innerHTML = html;
  }

async function fetchUthmaniFromAlquranCloud(verseKey) {
    const url = `https://api.alquran.cloud/v1/ayah/${encodeURIComponent(verseKey)}/uthmani`;
    const res = await timeout(fetch(url, {mode:'cors'}), FETCH_TIMEOUT);
    if (!res.ok) throw new Error("alquran.cloud api status " + res.status);
    const json = await res.json();
    if (json && json.data && json.data.text) {
      return json.data.text;
    }
    throw new Error("alquran.cloud unexpected payload");
  }

  let localQuran = null;
  async function fetchLocal(verseKey) {
    if (!localQuran) {
      try {
        const res = await fetch("./quran_uthmani.json");
        if (res.ok) localQuran = await res.json();
        else localQuran = {};
      } catch (e) {
        localQuran = {};
      }
    }
    const [s,a] = verseKey.split(":");
    return (localQuran[s] && localQuran[s][a]) ? localQuran[s][a] : null;
  }

  async function getUthmani(verseKey) {
    try { return await fetchUthmaniFromQuranCom(verseKey); } catch(e){}
    try { return await fetchUthmaniFromAlquranCloud(verseKey); } catch(e){}
    return await fetchLocal(verseKey);
  }

  async function hydrateAyatByVerseKey() {
    const targets = document.querySelectorAll('[data-verse]');
    for (const el of targets) {
      const key = (el.getAttribute('data-verse') || '').trim();
      if (!key) continue;
      try {
        const text = await getUthmani(key);
        if (text) {
          el.innerHTML = `<span class="ayah">${text}</span>`;
          const list=(el.getAttribute('data-highlight')||'').split('|').map(s=>s.trim()).filter(Boolean);
          applyHighlights(el, list);
          el.setAttribute('data-source', 'uthmani:online_or_local');
        }
      } catch (e) {
        // leave as-is
      }
    }
  }

  // Public hook
  window.__UthmaniHybrid = {
    refresh: async function(){
      try { await hydrateAyatByVerseKey(); } catch(e){}
      // Also re-run the local marker (from previous build) if present
      if (typeof window.markAyatInQuestions === 'function') window.markAyatInQuestions();
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    window.__UthmaniHybrid.refresh();
  });
})();
