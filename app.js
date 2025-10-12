
window.taj = (function(){
  const state = {
    bank:null, therapy:null,
    attempts: JSON.parse(localStorage.getItem('taj_ATTEMPTS')||'[]')
  };

  // ---------- Utilities
  function $(sel, root=document){ return root.querySelector(sel); }
  function el(tag, attrs={}, html=''){
    const e = document.createElement(tag);
    for (const [k,v] of Object.entries(attrs)) e.setAttribute(k,v);
    if (html) e.innerHTML = html;
    return e;
  }
  function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; }
  function nowStr(){
    const d = new Date();
    return d.toLocaleString('ar-EG',{hour12:false});
  }

  // ---------- Dark mode
  function initModeToggle(){
    const btn = document.getElementById('modeBtn');
    const apply = ()=>{ document.documentElement.classList.toggle('dark', localStorage.getItem('taj_MODE')==='dark');
      if(btn) btn.textContent = localStorage.getItem('taj_MODE')==='dark' ? 'الوضع النهاري' : 'الوضع الليلي';
    };
    apply();
    if(btn) btn.onclick = ()=>{ localStorage.setItem('taj_MODE', localStorage.getItem('taj_MODE')==='dark'?'light':'dark'); apply(); };
  }

  // ---------- Load banks once
  async function ensureBanks(){
    if(!state.bank) state.bank = await fetch('questions_bank.json').then(r=>r.json());
    if(!state.therapy) state.therapy = await fetch('therapy_exercises.json').then(r=>r.json());
  }

  // ---------- QUIZ
  async function initQuiz(){
    await ensureBanks();
    const sectionSel = $('#quizSection');
    const area = $('#quizArea');
    $('#buildQuizBtn').onclick = ()=> buildQuiz(sectionSel.value, 5, area);
    $('#buildFullQuizBtn').onclick = ()=> buildQuizFull(sectionSel.value, area);
  }

  function pickRandomByRule(itemsByRule, countPerRule){
    const out=[];
    const groups = {};
    itemsByRule.forEach(q=>{ groups[q.rule] = groups[q.rule]||[]; groups[q.rule].push(q); });
    Object.entries(groups).forEach(([rule,arr])=>{
      shuffle(arr);
      out.push(...arr.slice(0,countPerRule));
    });
    return shuffle(out);
  }

  function buildQuiz(section, count, mount){
    const items = state.bank[section];
    const chosen = shuffle(items.slice()).slice(0, count);
    renderQuiz(chosen, section, mount);
  }

  function buildQuizFull(section, mount){
    const items = state.bank[section];
    // 5 من كل حكم فرعي داخل القسم
    // نجمع حسب rule:
    const groups = {};
    for(const q of items){ groups[q.rule] = groups[q.rule]||[]; groups[q.rule].push(q); }
    let chosen = [];
    Object.values(groups).forEach(arr=>{ shuffle(arr); chosen.push(...arr.slice(0,5)); });
    chosen = shuffle(chosen);
    renderQuiz(chosen, section, mount);
  }

  function renderQuiz(chosen, section, mount){
    mount.innerHTML = '';
    const list = el('div', {class:'list'});
    chosen.forEach((q,idx)=>{
      // اخلط الخيارات لكن تذكر مؤشر الصحيح الأصلي 0
      const opts = q.options.map((t,i)=>({t, correct:i===q.answer}));
      shuffle(opts);
      const qBox = el('div', {class:'q'});
      qBox.append(el('h3',{},`س${idx+1}. ${q.stem}`));
      opts.forEach((o,oi)=>{
        const id = `q${idx}_o${oi}`;
        const r = el('input',{type:'radio',name:`q${idx}`,id});
        r.dataset.correct = o.correct? '1':'0';
        const lbl = el('label', {for:id, class:'opt'}, o.t);
        const row = el('div',{class:'opt'}); row.append(r,lbl);
        qBox.append(row);
      });
      list.append(qBox);
    });
    const submit = el('button',{},'تصحيح وإظهار النتيجة');
    const result = el('div',{class:'muted'});
    submit.onclick = ()=>{
      let right=0;
      chosen.forEach((_,i)=>{
        const sel = mount.querySelector(`input[name="q${i}"]:checked`);
        if(sel && sel.dataset.correct==='1') right++;
      });
      const total = chosen.length;
      result.innerHTML = `النتيجة: <b>${right}/${total}</b>`;

      // حفظ تقرير مبسط
      const report = { when: nowStr(), section, total, right,
        rows: chosen.map((q,i)=>{
          const sel = mount.querySelector(`input[name="q${i}"]:checked`);
          const picked = sel ? sel.nextSibling.textContent : '—';
          const correctText = q.options[q.answer];
          const ok = (sel && sel.dataset.correct==='1');
          return { stem:q.stem, correct:correctText, picked, ok, why:q.explain, rule:q.rule };
        })
      };
      state.attempts.push(report);
      localStorage.setItem('taj_ATTEMPTS', JSON.stringify(state.attempts));
      alert(`تم حفظ التقرير (${right}/${total}). افتح "التقرير الفردي" للاطلاع التفصيلي.`);
    };
    mount.append(list, el('hr'), submit, result);
  }

  // ---------- THERAPY
  async function initTherapy(){
    await ensureBanks();
    const sec = $('#therapySection'), sub = $('#therapySub'), area=$('#therapyArea');
    const fillSubs = ()=>{
      sub.innerHTML='';
      const obj = state.therapy[sec.value];
      Object.keys(obj).forEach(k=> sub.append(el('option',{value:k},k)));
    };
    fillSubs();
    sec.onchange = fillSubs;
    $('#startTherapyBtn').onclick = ()=>{
      const pack = state.therapy[sec.value][sub.value];
      // ولد 30 سؤالًا من القوالب (نعيد تدويرها مع فهرس n)
      const questions = [];
      let n=1;
      while(questions.length<30){
        for(const t of pack.templates){
          const q = JSON.parse(JSON.stringify(t));
          q.stem = q.stem.replace('{n}', (n++).toString());
          questions.push(q);
          if(questions.length>=30) break;
        }
      }
      renderTherapy(questions.slice(0,30), sec.value, sub.value, area);
    };
  }

  function renderTherapy(questions, section, subRule, mount){
    mount.innerHTML='';
    let idx=0, right=0;
    const header = el('div',{},`التقدّم: <span id="prog">0/${questions.length}</span>`);
    const box = el('div',{class:'q'});
    const nextBtn = el('button',{},'التالي ⏭️');
    const endBtn = el('button',{},'إنهاء التدريب وحفظ النتائج');
    endBtn.disabled=true;
    const renderOne = ()=>{
      const q = questions[idx];
      box.innerHTML='';
      box.append(el('h3',{},`${idx+1}. ${q.stem}`));
      const opts = q.options.map((t,i)=>({t,correct:i===q.answer}));
      shuffle(opts);
      opts.forEach((o,oi)=>{
        const id=`t${idx}_o${oi}`;
        const inp=el('input',{type:'radio',name:`t${idx}`,id});
        inp.dataset.correct = o.correct?'1':'0';
        const lbl=el('label',{for:id,class:'opt'},o.t);
        const row = el('div',{class:'opt'}); row.append(inp,lbl);
        box.append(row);
      });
    };
    renderOne();
    nextBtn.onclick=()=>{
      const sel = mount.querySelector(`input[name="t${idx}"]:checked`);
      if(!sel){ alert('اختر إجابة أولًا'); return; }
      if(sel.dataset.correct==='1') right++;
      idx++;
      $('#prog').textContent = `${idx}/${questions.length}`;
      if(idx<questions.length){ renderOne(); }
      if(idx===questions.length){ nextBtn.disabled=true; endBtn.disabled=false; }
    };
    endBtn.onclick=()=>{
      const total=questions.length;
      const rep = { when: nowStr(), section, subRule, mode:'therapy', total, right };
      state.attempts.push(rep);
      localStorage.setItem('taj_ATTEMPTS', JSON.stringify(state.attempts));
      alert(`تم الحفظ: ${right}/${total}`);
    };
    mount.append(header, box, el('div',{class:'row'},''), nextBtn, endBtn);
  }

  // ---------- Reports
  function renderLastReport(mountId, metaId){
    const mount=$('#'+mountId), meta=$('#'+metaId);
    const last = state.attempts.slice().reverse().find(x=>x.rows);
    if(!last){ mount.textContent='لا يوجد تقرير محفوظ.'; return; }
    meta.textContent = `القسم: ${last.section} — التاريخ: ${last.when} — النتيجة: ${last.right}/${last.total}`;
    const table = el('table',{class:'table'});
    table.innerHTML = `<thead><tr><th>#</th><th>السؤال</th><th>اختياراتك</th><th>الصحيح</th><th>الحكم</th><th>لماذا؟</th><th>✓/✗</th></tr></thead>`;
    const tb = el('tbody');
    last.rows.forEach((r,i)=>{
      const mark = r.ok ? '✓' : '✗';
      const tr = el('tr',{},`<td>${i+1}</td><td>${r.stem}</td><td>${r.picked}</td><td>${r.correct}</td><td>${r.rule}</td><td>${r.why}</td><td style="text-align:center">${mark}</td>`);
      tb.append(tr);
    });
    table.append(tb);
    mount.append(table);
  }

  function renderAllReports(mountId){
    const mount = $('#'+mountId);
    if(!state.attempts.length){ mount.textContent='لا يوجد سجلات.'; return; }
    const table = el('table',{class:'table'});
    table.innerHTML = `<thead><tr><th>#</th><th>التاريخ</th><th>القسم</th><th>وضع</th><th>النتيجة</th></tr></thead>`;
    const tb = el('tbody');
    state.attempts.forEach((a,i)=>{
      const mode = a.mode||'quiz';
      const res = (a.right!=null)? `${a.right}/${a.total}`:'—';
      tb.append(el('tr',{},`<td>${i+1}</td><td>${a.when}</td><td>${a.section}</td><td>${mode}</td><td>${res}</td>`));
    });
    table.append(tb); mount.append(table);
  }

  // ---------- Stats
  function renderStats(canvasId, listId){
    const attempts = state.attempts.filter(x=>x.rows);
    const errorsByRule = {};
    attempts.forEach(rep=>{
      rep.rows.forEach(r=>{
        errorsByRule[r.rule] = errorsByRule[r.rule]||0;
        if(!r.ok) errorsByRule[r.rule]++;
      });
    });
    const labels = Object.keys(errorsByRule);
    const data = labels.map(k=>errorsByRule[k]);
    const ctx = document.getElementById(canvasId).getContext('2d');
    new Chart(ctx, {
      type:'bar',
      data:{labels, datasets:[{data, borderWidth:1}]},
      options:{
        scales:{ x:{ ticks:{ autoSkip:false, maxRotation:0, callback:(v,i)=>labels[i] }, grid:{display:false} },
                 y:{ beginAtZero:true, grid:{color:'rgba(0,0,0,.08)'} } },
        layout:{ padding:{ bottom: 30 } }, // لإظهار التسميات الطويلة بالكامل
        plugins:{ legend:{display:false} }
      }
    });
    const list = document.getElementById(listId);
    const tbl = el('table',{class:'table'});
    tbl.innerHTML='<thead><tr><th>التاريخ</th><th>القسم</th><th>النتيجة</th></tr></thead>';
    const tb = el('tbody');
    state.attempts.forEach(a=> tb.append(el('tr',{},`<td>${a.when}</td><td>${a.section}</td><td>${(a.right!=null)?`${a.right}/${a.total}`:'—'}</td>`)));
    tbl.append(tb); list.append(tbl);
  }

  // ---------- Dashboard cards
  function renderDashboard(mountId){
    const mount = $('#'+mountId);
    const total = state.attempts.length;
    const last = state.attempts[state.attempts.length-1];
    mount.innerHTML = `
      <div class="row">
        <span class="badge">عدد التقارير: ${total}</span>
        <span class="badge">آخر تحديث: ${last? last.when : '—'}</span>
      </div>
      <hr/>
      <div><a href="workbench.html"><button>فتح التدريبات</button></a>
      <a href="report.html"><button>فتح التقرير</button></a>
      <a href="stats.html"><button>فتح الإحصاءات</button></a></div>
    `;
  }

  return {initModeToggle, initQuiz, initTherapy, renderLastReport, renderAllReports, renderStats, renderDashboard};
})();
