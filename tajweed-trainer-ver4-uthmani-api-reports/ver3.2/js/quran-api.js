
const QuranAPI=(()=>{
  const base='https://api.quran.com/api/v4'; const cache=new Map();
  async function fetchAyah(key){ if(cache.has(key)) return cache.get(key); const [s,a]=key.split(':').map(Number);
    const url=`${base}/verses/by_key/${s}:${a}?language=ar&words=false&field=text_uthmani`;
    try{ const res=await fetch(url); if(!res.ok) throw 0; const js=await res.json(); const v=js.verse;
      const text=v.text_uthmani||v.text_indopak||v.text_simple||'';
      const surah=await fetch(`${base}/chapters/${s}?language=ar`).then(r=>r.json()).then(j=>j.chapter?.name_arabic||'');
      const out={text, surah, ayah:a, key}; cache.set(key,out); return out;
    }catch(e){ return {text:'',surah:'',ayah:a,key}; }
  }
  function colorTargets(html){ return html.replace(/\[\[(.+?)\]\]/g,'<span class="ayah-target">$1</span>'); }
  return {fetchAyah,colorTargets};
})();