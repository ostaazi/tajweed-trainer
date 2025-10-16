import { saveAttempt } from './storage.js';

async function loadBank() {
  const r = await fetch('questions_bank.json', { cache: 'no-store' });
  if (!r.ok) throw new Error('questions_bank.json غير موجود');
  return r.json();
}

// Function to pick 5 random questions from a selected section
function pickFiveRandomQuestions(o) {
  const allQuestions = [];
  const k = Object.keys(o);
  k.forEach(sr => {
    const pool = o[sr] || [];
    allQuestions.push(...pool.map(q => ({ ...q, subRule: sr })));
  });
  return shuffle(allQuestions).slice(0, 5);
}

// Function to pick 20 random questions from all sections for a full quiz
function pickFullQuizQuestions(bank) {
  const allQuestions = [];
  const sections = Object.keys(bank.sections);
  sections.forEach(section => {
    const parts = Object.keys(bank.sections[section].parts);
    parts.forEach(part => {
      const pool = bank.sections[section].parts[part] || [];
      allQuestions.push(...pool.map(q => ({ ...q, section: section, subRule: part })));
    });
  });
  return shuffle(allQuestions).slice(0, 20);
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function el(h) {
  const t = document.createElement('template');
  t.innerHTML = h.trim();
  return t.content.firstElementChild;
}

function buildPaper(qs) {
  const list = document.getElementById('list');
  list.innerHTML = '';
  qs.forEach((q, i) => {
    const ch = q.options.map((c, ci) => `<label><input type="radio" name="q${i}" value="${ci}"> ${c}</label>`).join("");
    const node = el(`<div class="q" data-i="${i}" data-ans="${q.answer}" style="border-bottom:1px solid var(--ring);padding:12px 0">
      <h4 style="margin:0 0 8px 0">${i + 1}. ${q.question.replace(/<\/?b>/g, '')} <span class="badge" style="border:1px solid var(--ring);padding:2px 8px;border-radius:999px">${q.subRule || q.rule || ''}</span></h4>
      <div class="choices">${ch}</div>
      <div class="muted" style="margin-top:6px">${q.explain ? ('معلومة: ' + q.explain) : ''}</div></div>`);
    list.append(node);
  });
}

function scorePaper(qs) {
  let r = 0;
  qs.forEach((q, i) => {
    const sel = document.querySelector(`input[name="q${i}"]:checked`);
    const wrap = document.querySelector(`.q[data-i="${i}"]`);
    if (!wrap) return;
    wrap.querySelectorAll('label').forEach(l => l.classList.remove('correct', 'wrong'));
    if (sel) {
      const p = Number(sel.value);
      const c = Number(q.answer);
      if (p === c) {
        r++;
        sel.closest('label').style.background = '#e8f7f0';
      } else {
        sel.closest('label').style.background = '#fff1f2';
        const corr = wrap.querySelector(`input[value="${c}"]`);
        if (corr) corr.closest('label').style.background = '#e8f7f0';
      }
    }
  });
  return r;
}

function updateBar(d, t) {
  document.getElementById('bar').style.width = (Math.round((d / t) * 100)) + '%';
}

let BANK = null, PAPER = [];

document.addEventListener('DOMContentLoaded', async () => {
  const mb = document.getElementById('modeBtn');
  const apply = () => {
    const dark = localStorage.getItem('taj_MODE') === 'dark';
    document.documentElement.classList.toggle('dark', dark);
    mb.innerText = dark ? '🌞' : '🌓';
  };
  apply();
  mb.onclick = () => {
    localStorage.setItem('taj_MODE', localStorage.getItem('taj_MODE') === 'dark' ? 'light' : 'dark');
    apply();
  };

  try {
    BANK = await loadBank();
  } catch (e) {
    alert(e.message);
    return;
  }

  const start = document.getElementById('start');
  const startFull = document.getElementById('startFull');
  const paper = document.getElementById('paper');
  const submit = document.getElementById('submit');
  const reset = document.getElementById('reset');
  const sectionSel = document.getElementById('section');
  const list = document.getElementById('list');

  function beginSection() {
    const sec = sectionSel.value;
    const secObj = BANK.sections[sec];
    if (!secObj) {
      alert('البنك لا يحتوي هذا القسم');
      return;
    }
    PAPER = pickFiveRandomQuestions(secObj.parts);
    document.getElementById('summary').style.display = 'none';
    buildPaper(PAPER);
    paper.style.display = 'block';
    updateBar(0, PAPER.length);
    list.addEventListener('change', onPick, { once: true });
  }

  function beginFull() {
    PAPER = pickFullQuizQuestions(BANK);
    document.getElementById('summary').style.display = 'none';
    buildPaper(PAPER);
    paper.style.display = 'block';
    updateBar(0, PAPER.length);
    list.addEventListener('change', onPick, { once: true });
  }

  function onPick() {
    const total = PAPER.length;
    const done = Array.from(document.querySelectorAll('.q')).filter(q => q.querySelector('input:checked')).length;
    updateBar(done, total);
    list.addEventListener('change', onPick, { once: true });
  }

  start.onclick = beginSection;
  startFull.onclick = beginFull;

  submit.onclick = () => {
    if (PAPER.length === 0) return;
    const right = scorePaper(PAPER);
    const total = PAPER.length;
    const score = Math.round((right / total) * 100);
    const name = (document.getElementById('studentName')?.value || '').trim();
    const rows = PAPER.map((q, i) => {
      const pickedEl = document.querySelector(`input[name="q${i}"]:checked`);
      const picked = pickedEl ? Number(pickedEl.value) : null;
      return {
        stem: q.question.replace(/<\/?b>/g, ''),
        picked: picked != null ? q.options[picked] : null,
        correct: q.options[q.answer],
        rule: q.subRule || q.rule || '',
        why: q.explain || '',
        ok: picked === q.answer
      };
    });
    saveAttempt({
      name,
      mode: 'quiz',
      section: ({
        noon_tanween: 'النون الساكنة والتنوين',
        meem_sakinah: 'الميم الساكنة',
        madd: 'أحكام المدود'
      })[sectionSel.value] || 'شامل',
      subRule: '—',
      when: new Date().toLocaleString('ar-EG'),
      ts: Date.now(),
      right,
      total,
      score,
      rows
    });
    const summ = document.getElementById('summary');
    summ.style.display = 'block';
    summ.textContent = `النتيجة: ${right}/${total} (${score}%)`;
    window.scrollTo({
      top: summ.offsetTop - 80,
      behavior: 'smooth'
    });
  };

  reset.onclick = () => {
    PAPER = [];
    document.getElementById('summary').style.display = 'none';
    document.getElementById('list').innerHTML = '';
    document.getElementById('bar').style.width = '0%';
  };
});
