
window.taj=(function(){
  const KEY_ATTEMPTS='taj_ATTEMPTS', KEY_NAME='taj_TRAINEE_NAME';
  const state={bank:null, therapy:null, attempts:JSON.parse(localStorage.getItem(KEY_ATTEMPTS)||'[]'), name:localStorage.getItem(KEY_NAME)||''};

  function $(s,r=document){return r.querySelector(s)}
  function el(t,a={},h=''){const e=document.createElement(t); for(const[k,v] of Object.entries(a)) e.setAttribute(k,v); if(h) e.innerHTML=h; return e}
  function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]} return a}
  function nowStr(){return new Date().toLocaleString('ar-EG',{hour12:false})}
  function save(){localStorage.setItem(KEY_ATTEMPTS,JSON.stringify(state.attempts))}

  // Dark-mode FAB bottom-left
  function initModeToggleFAB(){
    const b=$('#modeBtn');
    const apply=()=>{
      const dark=localStorage.getItem('taj_MODE')==='dark';
      document.documentElement.classList.toggle('dark',dark);
      if(b){ b.innerHTML = dark ? '<i data-lucide="sun"></i>' : '<i data-lucide="moon-star"></i>'; if(window.lucide) lucide.createIcons(); }
    };
    if(b){ apply(); b.onclick=()=>{ localStorage.setItem('taj_MODE', localStorage.getItem('taj_MODE')==='dark'?'light':'dark'); apply(); }; }
  }

  // WebAudio feedback (therapy only)
  function playTone(ok=true){
    try{
      const ctx = new (window.AudioContext||window.webkitAudioContext)();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type='sine'; o.frequency.value = ok ? 880 : 220;
      g.gain.value=.08; o.connect(g); g.connect(ctx.destination);
      o.start(); setTimeout(()=>{o.stop(); ctx.close();}, 180);
    }catch(e){/* ignore */}
  }

  function initTraineeName(inpSel,btnSel){const i=$(inpSel), b=$(btnSel); if(i) i.value=state.name||''; if(b) b.onclick=()=>{state.name=i.value.trim(); localStorage.setItem(KEY_NAME,state.name); alert('تم حفظ الاسم: '+(state.name||'—'))}}

  async function ensure(){ if(!state.bank) state.bank=await fetch('questions_bank.json').then(r=>r.json()); if(!state.therapy) state.therapy=await fetch('therapy_exercises.json').then(r=>r.json()) }
  async function initWorkbench(){ initModeToggleFAB(); $('#who').textContent=state.name||'—'; await ensure(); initQuiz(); initTherapy() }

  // ---- Progress helpers
  function setProg(elId, idx, total){ const el=$('#'+elId); if(!el) return; const pct = total? Math.round((idx/total)*100):0; el.style.width = pct+'%'; }

  // ---- QUIZ (with progress bar)
  function initQuiz(){ const s=$('#quizSection'), area=$('#quizArea'), box=$('#quizResult'); $('#buildQuizBtn').onclick=()=>buildQuiz(s.value,5,area,box); $('#buildFullQuizBtn').onclick=()=>buildFull(s.value,area,box) }
  function buildQuiz(section,count,mount,box){const items=state.bank[section]; const chosen=shuffle(items.slice()).slice(0,count); renderQuiz(chosen,section,mount,box,'quiz')}
  function buildFull(section,mount,box){const items=state.bank[section]; const groups={}; items.forEach(q=>{groups[q.rule]=groups[q.rule]||[]; groups[q.rule].push(q)}); let chosen=[]; Object.values(groups).forEach(arr=>{shuffle(arr); chosen.push(...arr.slice(0,5))}); renderQuiz(shuffle(chosen),section,mount,box,'quiz')}

  function renderQuiz(chosen,section,mount,box,mode){
    mount.innerHTML=''; box.style.display='none'; box.innerHTML='';
    let answered=0; setProg('quizProg',0,chosen.length);
    const list=el('div',{class:'list'});
    chosen.forEach((q,idx)=>{
      const opts=q.options.map((t,i)=>({t,correct:i===q.answer})); shuffle(opts);
      const qBox=el('div',{class:'q'}); qBox.append(el('h3',{},`س${idx+1}. ${q.stem}`));
      opts.forEach((o,oi)=>{
        const id=`q${idx}_o${oi}`;
        const r=el('input',{type:'radio',name:`q${idx}`,id}); r.dataset.correct=o.correct?'1':'0';
        r.onchange=()=>{ // update progress on first selection for this question
          if(!qBox._selected){ qBox._selected=true; answered++; setProg('quizProg', answered, chosen.length); }
        };
        const lbl=el('label',{for:id,class:'opt'},o.t);
        const row=el('div',{class:'opt'}); row.append(r,lbl); qBox.append(row);
      });
      list.append(qBox);
    });
    const submit=el('button',{class:'primary'},'تصحيح وإظهار النتيجة');
    submit.onclick=()=>{
      let right=0, rows=[];
      chosen.forEach((q,i)=>{
        const sel=mount.querySelector(`input[name="q${i}"]:checked`);
        const ok=(sel&&sel.dataset.correct==='1'); if(ok) right++;
        const picked=sel? sel.nextSibling.textContent:'—';
        rows.push({stem:q.stem,rule:q.rule,correct:q.options[q.answer],picked,ok,why:q.explain});
      });
      const total=chosen.length, score=Math.round((right/total)*100);
      const rep={when:nowStr(),section,mode,total,right,score,name:state.name||'—',rows};
      state.attempts.push(rep); save();
      box.style.display='block'; box.innerHTML=`<div><b>الاسم:</b> ${rep.name} — <b>القسم:</b> ${section} — <b>النتيجة:</b> ${right}/${total} (${score}%)</div>
      <div class="row"><a href="report.html"><button class="secondary">فتح التقرير الفردي</button></a><a href="stats.html"><button class="secondary">فتح الإحصاءات</button></a></div>`;
    };
    mount.append(list, el('hr'), submit);
  }

  // ---- THERAPY (random 5) with progress, sounds & retry
  function initTherapy(){ const sec=$('#therapySection'), sub=$('#therapySub'), area=$('#therapyArea'), box=$('#therapyResult'); const fill=()=>{ sub.innerHTML=''; const obj=state.therapy[sec.value]; Object.keys(obj).forEach(k=>sub.append(el('option',{value:k},k))) }; fill(); sec.onchange=fill;
    $('#startTherapyBtn').onclick=()=>{
      const pack=state.therapy[sec.value][sub.value]; let t=(pack&&pack.templates)?pack.templates.slice():[];
      if(!t.length){alert('لا توجد قوالب'); return} shuffle(t); const chosen=t.slice(0,5);
      renderTherapy(chosen,sec.value,sub.value,area,box);
    };
  }
  function renderTherapy(questions,section,subRule,mount,box){
    mount.innerHTML=''; box.style.display='none';
    let idx=0,right=0; setProg('therProg',0,questions.length);
    const qBox=el('div',{class:'q'});
    const render=()=>{
      const q=questions[idx]; qBox.innerHTML=''; qBox.append(el('h3',{},`${idx+1}. ${q.stem.replace('{n}',String(idx+1))}`));
      const opts=q.options.map((t,i)=>({t,correct:i===q.answer})); shuffle(opts);
      opts.forEach((o,oi)=>{
        const id=`t${idx}_o${oi}`; const r=el('input',{type:'radio',name:`t${idx}`,id}); r.dataset.correct=o.correct?'1':'0';
        const lbl=el('label',{for:id,class:'opt'},o.t); const row=el('div',{class:'opt'}); row.append(r,lbl); qBox.append(row);
      });
    };
    const next=el('button',{class:'primary'},'التالي ⏭️');
    const end=el('button',{class:'secondary'},'إنهاء التدريب وحفظ النتيجة'); end.disabled=true;
    const retry=el('button',{class:'secondary'},'إعادة التمرين'); retry.style.display='none';
    render();
    next.onclick=()=>{
      const sel=mount.querySelector(`input[name="t${idx}"]:checked`);
      if(!sel){alert('اختر إجابة'); return}
      const ok = sel.dataset.correct==='1'; if(ok) right++; playTone(ok);
      idx++; setProg('therProg', idx, questions.length);
      if(idx<questions.length){ render(); if(idx===questions.length-1) next.textContent='إنهاء'; }
      else{ next.disabled=true; end.disabled=false; }
    };
    end.onclick=()=>{
      const total=questions.length, score=Math.round((right/total)*100);
      const rep={when:nowStr(),section,subRule,mode:'therapy',total,right,score,name:state.name||'—'}; state.attempts.push(rep); save();
      box.style.display='block'; box.innerHTML=`<div><b>الاسم:</b> ${rep.name} — <b>القسم:</b> ${section} — <b>الحكم:</b> ${subRule} — <b>النتيجة:</b> ${right}/${total} (${score}%)</div>
      <div class="row"><a href="consolidated_report.html"><button class="secondary">التقرير الموحد</button></a><a href="stats.html"><button class="secondary">الإحصاءات</button></a></div>`;
      retry.style.display='inline-flex'; retry.onclick=()=>{ renderTherapy(questions,section,subRule,mount,box); };
    };
    mount.append(qBox, el('div',{class:'row'},''), next, end, retry);
  }

  // Reports & Stats & Export — same as previous patch
  function renderLastReport(mountId,metaId){ const mount=$('#'+mountId), meta=$('#'+metaId); const last=state.attempts.slice().reverse().find(x=>x.rows); if(!last){mount.textContent='لا يوجد تقرير'; return}
    meta.textContent=`المتدرّب: ${last.name||'—'} — القسم: ${last.section} — التاريخ: ${last.when} — النتيجة: ${last.right}/${last.total} (${last.score}%)`;
    const table=el('table',{class:'table'}); table.innerHTML=`<thead><tr><th>#</th><th>السؤال</th><th>اختيارك</th><th>الصحيح</th><th>الحكم</th><th>لماذا؟</th><th>✓/✗</th></tr></thead>`;
    const tb=el('tbody'); last.rows.forEach((r,i)=>{const mark=r.ok?'✓':'✗'; tb.append(el('tr',{},`<td>${i+1}</td><td>${r.stem}</td><td>${r.picked}</td><td>${r.correct}</td><td>${r.rule}</td><td>${r.why}</td><td style="text-align:center">${mark}</td>`))}); table.append(tb); mount.append(table) }

  function renderAllReports(mountId){ const m=$('#'+mountId); if(!state.attempts.length){m.textContent='لا يوجد سجلات.'; return} const t=el('table',{class:'table'});
    t.innerHTML=`<thead><tr><th>#</th><th>التاريخ</th><th>الاسم</th><th>النوع</th><th>القسم</th><th>الحكم الفرعي</th><th>النتيجة</th></tr></thead>`;
    const tb=el('tbody'); state.attempts.forEach((a,i)=>{const res=(a.right!=null)?`${a.right}/${a.total} (${a.score||Math.round((a.right/a.total)*100)}%)`:'—'; tb.append(el('tr',{},`<td>${i+1}</td><td>${a.when}</td><td>${a.name||'—'}</td><td>${a.mode||'quiz'}</td><td>${a.section||'—'}</td><td>${a.subRule||'—'}</td><td>${res}</td>`))}); t.append(tb); m.append(t) }

  function renderStatsFiltered(canvasId,listId,kindSel,applyBtn){ const doIt=()=>{ const kind=$(kindSel).value; const rows=(kind==='all')? state.attempts : state.attempts.filter(a=>(a.mode||'quiz')===kind);
      const errors={}; rows.forEach(rep=>{ if(rep.rows){ rep.rows.forEach(r=>{ if(!r.ok) errors[r.rule]=(errors[r.rule]||0)+1 }) } });
      const labels=Object.keys(errors), data=labels.map(k=>errors[k]); const ctx=document.getElementById(canvasId).getContext('2d'); if(window._tajChart) window._tajChart.destroy();
      window._tajChart=new Chart(ctx,{type:'bar',data:{labels,datasets:[{data, borderWidth:1}]},options:{scales:{x:{ticks:{autoSkip:false,maxRotation:0},grid:{display:false}},y:{beginAtZero:true}},layout:{padding:{bottom:36}},plugins:{legend:{display:false}}}});
      const list=document.getElementById(listId); list.innerHTML=''; const tbl=el('table',{class:'table'}); tbl.innerHTML='<thead><tr><th>التاريخ</th><th>الاسم</th><th>النوع</th><th>القسم</th><th>النتيجة</th></tr></thead>'; const tb=el('tbody');
      rows.forEach(a=>tb.append(el('tr',{},`<td>${a.when}</td><td>${a.name||'—'}</td><td>${a.mode||'quiz'}</td><td>${a.section||'—'}</td><td>${(a.right!=null)?`${a.right}/${a.total} (${a.score}%)`:'—'}</td>`))); tbl.append(tb); list.append(tbl) };
    doIt(); $(applyBtn).onclick=doIt }

  function exportPDF(sel){ const node=document.querySelector(sel); const opt={margin:0.4,filename:'tajweedy-report.pdf',image:{type:'jpeg',quality:0.98},html2canvas:{scale:2},jsPDF:{unit:'in',format:'a4',orientation:'portrait'}}; html2pdf().set(opt).from(node).save() }
  function exportAttemptsJSON(){ const blob=new Blob([JSON.stringify(state.attempts,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='tajweedy-attempts.json'; a.click() }
  function importAttemptsJSON(e){ const f=e.target.files[0]; if(!f) return; const fr=new FileReader(); fr.onload=()=>{ try{ const data=JSON.parse(fr.result); if(Array.isArray(data)){ state.attempts=data; save(); alert('تم الاستيراد بنجاح.')} else alert('صيغة غير صحيحة.') }catch(err){ alert('خطأ في القراءة')}}; fr.readAsText(f) }

  return {initModeToggleFAB, initTraineeName, initWorkbench, renderLastReport, renderAllReports, renderStatsFiltered, exportPDF, exportAttemptsJSON, importAttemptsJSON};
})();
