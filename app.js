
window.taj=(function(){
  const KEY_ATTEMPTS='taj_ATTEMPTS', KEY_NAME='taj_TRAINEE_NAME';
  const state={bank:null, therapy:null, attempts:JSON.parse(localStorage.getItem(KEY_ATTEMPTS)||'[]'), name:localStorage.getItem(KEY_NAME)||''};

  function $(s,r=document){return r.querySelector(s)}
  function el(t,a={},h=''){const e=document.createElement(t); for(const[k,v] of Object.entries(a)) e.setAttribute(k,v); if(h) e.innerHTML=h; return e}
  function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]} return a}
  function nowStr(){return new Date().toLocaleString('ar-EG',{hour12:false})}
  function nowTs(){return Date.now()}
  function save(){localStorage.setItem(KEY_ATTEMPTS,JSON.stringify(state.attempts))}

  function initModeToggleFAB(){
    const b=$('#modeBtn');
    const apply=()=>{
      const dark=localStorage.getItem('taj_MODE')==='dark';
      document.documentElement.classList.toggle('dark',dark);
      if(b){ b.innerHTML = dark ? '<i data-lucide="sun"></i>' : '<i data-lucide="moon-star"></i>'; if(window.lucide) lucide.createIcons(); }
    };
    if(b){ apply(); b.onclick=()=>{ localStorage.setItem('taj_MODE', localStorage.getItem('taj_MODE')==='dark'?'light':'dark'); apply(); }; }
  }

  function initTraineeName(inpSel,btnSel){const i=$(inpSel), b=$(btnSel); if(i) i.value=state.name||''; if(b) b.onclick=()=>{state.name=i.value.trim(); localStorage.setItem(KEY_NAME,state.name); alert('تم حفظ الاسم: '+(state.name||'—'))}}

  async function ensure(){ if(!state.bank) state.bank=await fetch('questions_bank.json').then(r=>r.json()); if(!state.therapy) state.therapy=await fetch('therapy_exercises.json').then(r=>r.json()) }
  async function initWorkbench(){ initModeToggleFAB(); $('#who').textContent=state.name||'—'; await ensure(); }

  function renderAllReports(mountId, filters){
    const mount=$('#'+mountId); mount.innerHTML='';
    const rows = state.attempts.slice();
    const fFrom = filters && typeof filters.fromTS==='number' ? filters.fromTS : null;
    const fTo   = filters && typeof filters.toTS==='number' ? filters.toTS : null;
    const fName = filters && filters.name ? String(filters.name).toLowerCase() : '';

    const match = a => {
      if(fName && !(String(a.name||'').toLowerCase().includes(fName))) return false;
      if(fFrom!=null || fTo!=null){
        if(typeof a.ts==='number'){
          if(fFrom!=null && a.ts < fFrom) return false;
          if(fTo!=null && a.ts > fTo) return false;
        }
      }
      return true;
    };
    const filtered = rows.filter(match);
    if(!filtered.length){ mount.textContent='لا توجد سجلات مطابقة للفلاتر.'; return; }

    const t=el('table',{class:'table'});
    t.innerHTML=`<thead><tr><th>#</th><th>التاريخ</th><th>الاسم</th><th>النوع</th><th>القسم</th><th>الحكم الفرعي</th><th>النتيجة</th></tr></thead>`;
    const tb=el('tbody');
    filtered.forEach((a,i)=>{
      const res=(a.right!=null)?`${a.right}/${a.total} (${a.score||Math.round((a.right/a.total)*100)}%)`:'—';
      tb.append(el('tr',{},`<td>${i+1}</td><td>${a.when}</td><td>${a.name||'—'}</td><td>${a.mode||'quiz'}</td><td>${a.section||'—'}</td><td>${a.subRule||'—'}</td><td>${res}</td>`));
    });
    t.append(tb); mount.append(t);
  }

  function exportPDF(sel){ const node=document.querySelector(sel); const opt={margin:0.4,filename:'tajweedy-report.pdf',image:{type:'jpeg',quality:0.98},html2canvas:{scale:2},jsPDF:{unit:'in',format:'a4',orientation:'portrait'}}; html2pdf().set(opt).from(node).save() }
  function exportAttemptsJSON(){ const blob=new Blob([JSON.stringify(state.attempts,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='tajweedy-attempts.json'; a.click() }
  function importAttemptsJSON(e){ const f=e.target.files[0]; if(!f) return; const fr=new FileReader(); fr.onload=()=>{ try{ const data=JSON.parse(fr.result); if(Array.isArray(data)){ state.attempts=data; save(); alert('تم الاستيراد بنجاح.')} else alert('صيغة غير صحيحة.') }catch(err){ alert('خطأ في القراءة')}}; fr.readAsText(f) }

  function saveAttemptObject(obj){ if(typeof obj.ts!=='number') obj.ts = nowTs(); state.attempts.push(obj); save(); }

  return {initModeToggleFAB, initTraineeName, initWorkbench, renderAllReports, exportPDF, exportAttemptsJSON, importAttemptsJSON, __saveAttemptObject: saveAttemptObject};
})();
