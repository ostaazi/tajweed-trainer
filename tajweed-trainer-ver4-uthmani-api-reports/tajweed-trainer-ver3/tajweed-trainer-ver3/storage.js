const UID=localStorage.getItem('taj_UID')||'guest';const K=`taj_ATTEMPTS_${UID}`;export function loadAttempts(){try{return JSON.parse(localStorage.getItem(K)||'[]')}catch(_){return[]}}export function saveAttempt(a){const arr=loadAttempts();arr.unshift(a);localStorage.setItem(K,JSON.stringify(arr))}
export function setLastAttemptTs(ts){ localStorage.setItem('taj_LAST_TS', String(ts)); }
export function getLastAttemptTs(){ const v = localStorage.getItem('taj_LAST_TS'); return v? Number(v): null; }
export function exportAttemptsCSV(attempts){
  const esc = s => ('"'+String(s).replace(/"/g,'""')+'"');
  const rows = [['name','mode','section','subRule','when','ts','right','total','score']];
  attempts.forEach(a=>rows.push([a.name||'',a.mode||'',a.section||'',a.subRule||'',a.when||'',a.ts||'',a.right||0,a.total||0,a.score||0]));
  return rows.map(r=>r.map(esc).join(',')).join('\n');
}
