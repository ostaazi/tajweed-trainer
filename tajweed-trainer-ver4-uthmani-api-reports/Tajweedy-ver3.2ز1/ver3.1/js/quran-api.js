
export async function fetchAyahUthmani(ref){
  const urlQ = `https://api.quran.com/api/v4/verses/by_key/${encodeURIComponent(ref)}?fields=text_qpc_hafs,text_uthmani&words=false`;
  try{
    const r = await fetch(urlQ, {cache:'no-cache'});
    if(r.ok){
      const j = await r.json();
      const verse = j?.verse?.text_qpc_hafs || j?.verse?.text_uthmani;
      if(verse) return verse;
    }
  }catch(e){}
  try{
    const urlC = `https://api.alquran.cloud/v1/ayah/${encodeURIComponent(ref)}/quran-uthmani`;
    const r2 = await fetch(urlC, {cache:'no-cache'});
    if(r2.ok){
      const j2 = await r2.json();
      const verse2 = j2?.data?.text;
      if(verse2) return verse2;
    }
  }catch(e){}
  return null;
}

export async function fetchSurahName(chapterId){
  const key = `tajweedy:surah:${chapterId}`;
  const cached = localStorage.getItem(key);
  if(cached){ try{ return JSON.parse(cached); }catch{} }
  const url = `https://api.quran.com/api/v4/chapters/${chapterId}?language=ar`;
  try{
    const r = await fetch(url, {cache:'no-cache'});
    if(r.ok){
      const j = await r.json();
      const name = j?.chapter?.name_arabic || j?.chapter?.name_simple || '';
      const obj = {id:chapterId, name};
      localStorage.setItem(key, JSON.stringify(obj));
      return obj;
    }
  }catch(e){}
  return {id:chapterId, name:''};
}

export function cacheGetAyah(ref){
  try{
    const raw = localStorage.getItem(`tajweedy:ayah:${ref}`);
    if(!raw) return null;
    const o = JSON.parse(raw);
    const TTL = 30*24*60*60*1000;
    if(Date.now() - (o.ts||0) > TTL) return null;
    return o.text || null;
  }catch{return null;}
}
export function cacheSetAyah(ref,text){
  try{ localStorage.setItem(`tajweedy:ayah:${ref}`, JSON.stringify({text, ts: Date.now()})); }catch{}
}

export function stripMarks(s){
  return (s||'').normalize('NFC').replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/g,'');
}
export function highlightTargetSmart(ayahText, target){
  if(!target) return ayahText;
  const cleanAyah = stripMarks(ayahText);
  const cleanTarget = stripMarks(target);
  const idx = cleanAyah.indexOf(cleanTarget);
  if(idx === -1) return ayahText;
  const map = [];
  for(let i=0,j=0;i<ayahText.length;i++){
    const ch = ayahText[i];
    if(!(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/.test(ch))){
      map[j++] = i;
    }
  }
  const start = map[idx] ?? 0;
  const end = map[idx+cleanTarget.length-1] ?? (ayahText.length-1);
  return ayahText.slice(0,start) + `<span class="ayah-target">` + ayahText.slice(start,end+1) + `</span>` + ayahText.slice(end+1);
}
