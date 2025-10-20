
(async function(){
  const el = sel => document.querySelector(sel);
  const els = sel => Array.from(document.querySelectorAll(sel));
  const state = {
    bank: null,
    pool: [],
    answers:{},
    showRefs:false,
  };

  const BANK_URL = window.BANK_URL;

  const sectionSelect = el('#sectionSelect');
  const qCount = el('#qCount');
  const qCountValue = el('#qCountValue');
  const startBtn = el('#startBtn');
  const endBtn = el('#endBtn');
  const toggleRefBtn = el('#toggleRefBtn');
  const questionsOl = el('#questions');
  const notice = el('#notice');

  // Theme
  const themeBtn = el('#toggleTheme');
  const setTheme = (t)=>{ document.documentElement.setAttribute('data-theme', t); localStorage.setItem('theme',t); }
  setTheme(localStorage.getItem('theme')||'light');
  themeBtn.onclick = ()=> setTheme((localStorage.getItem('theme')||'light')==='light'?'dark':'light');

  qCount.oninput = ()=> (qCountValue.textContent = qCount.value);

  // Fetch bank
  try{
    const resp = await fetch(BANK_URL, {cache:'no-cache'});
    state.bank = await resp.json();
    buildSections(state.bank);
    notice.textContent = 'اختر القسم وابدأ الاختبار.';
  }catch(e){
    console.error(e);
    notice.textContent = 'تعذّر تحميل بنك الأسئلة. رجاءً تحقق من الرابط.';
  }

  function buildSections(bank){
    // Expect structure: { sections: { key: { title, parts: { name: [q...] } } } }
    sectionSelect.innerHTML = '';
    const optAll = new Option('جميع الأقسام', '__ALL__', true, true);
    sectionSelect.add(optAll);
    const sections = bank.sections || bank;
    Object.entries(sections).forEach(([key, val])=>{
      const label = (val && val.title) || translateKey(key);
      sectionSelect.add(new Option(label, key));
    });
  }

  function translateKey(key){
    const m = {
      'noon_tanween':'النون الساكنة والتنوين',
      'meem_sakinah':'الميم الساكنة',
      'mad':'أحكام المدود'
    };
    return m[key] || key;
  }

  function collectPool(){
    const val = sectionSelect.value;
    const bank = state.bank.sections || state.bank;
    let arr = [];
    const addFromNode = (node)=>{
      if(!node) return;
      if(Array.isArray(node)) arr.push(...node);
      else if(node.questions) arr.push(...node.questions);
      else if(node.parts) Object.values(node.parts).forEach(addFromNode);
    };
    if(val==='__ALL__') Object.values(bank).forEach(addFromNode);
    else addFromNode(bank[val]);
    return arr;
  }

  function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

  startBtn.onclick = ()=>{
    state.pool = shuffle(collectPool()).slice(0, parseInt(qCount.value,10));
    renderQuestions();
    // toggle buttons
    startBtn.style.display='none';
    endBtn.style.display='inline-block';
    toggleRefBtn.style.display='inline-block';
  };

  endBtn.onclick = ()=>{
    // show confirm if unanswered
    const unanswered = els('.option input[type="radio"]:not(:checked)').length === els('.option input[type="radio"]').length;
    const total = state.pool.length;
    const answered = Object.keys(state.answers).length;
    if(answered<total){
      if(!confirm(`لم تُجب على ${total-answered} سؤال/أسئلة. هل تود إنهاء الاختبار على أي حال؟`)) return;
    }
    alert('انتهى الاختبار. (مكان نتائج وتقارير لاحقًا)');
    // reset buttons
    startBtn.style.display='inline-block';
    endBtn.style.display='none';
    toggleRefBtn.style.display='none';
  };

  toggleRefBtn.onclick = ()=>{
    state.showRefs = !state.showRefs;
    toggleRefBtn.textContent = state.showRefs?'إخفاء اسم السورة والآية':'إظهار اسم السورة والآية';
    els('.js-ref').forEach(chip=> chip.style.display = state.showRefs ? 'inline-flex':'none');
  };

  function highlightTargets(text){
    // simple: wrap [[...]] with span
    return text.replace(/\[\[(.+?)\]\]/g, '<span class="ayah-target">$1</span>');
  }

  function renderQuestions(){
    questionsOl.innerHTML='';
    notice.remove();
    state.answers = {};

    state.pool.forEach((q,idx)=>{
      const li = document.createElement('li');
      li.className='card';

      // Build ayah & meta
      const ayahHtml = `<div class="ayah">${highlightTargets(q.question.split(' - ')[0].replace('قال تعالى:','').trim())}</div>`;
      const ref = (q.surah && q.ayah) ? `${q.surah} • ${q.ayah}` : (q.ref || '');
      const refHtml = ref ? `<span class="badge js-ref" style="display:${state.showRefs?'inline-flex':'none'}">${ref}</span>` : '';

      // Options from bank exactly
      const opts = q.options || q.choices || [];
      const optsHtml = opts.map((o,i)=>{
        const id = `q${idx}_o${i}`;
        return `<label class="option" for="${id}">
          <input id="${id}" type="radio" name="q${idx}" value="${o}">
          <span>${o}</span>
        </label>`;
      }).join('');

      li.innerHTML = `
        ${ayahHtml}
        <div class="meta">${refHtml}</div>
        <div class="options">${optsHtml}</div>
      `;
      // handle answer
      li.querySelectorAll('input[type="radio"]').forEach(inp=>{
        inp.addEventListener('change',()=>{
          state.answers[idx] = inp.value;
        });
      });

      questionsOl.appendChild(li);
    });
    window.scrollTo({top:0, behavior:'smooth'});
  }
})();
