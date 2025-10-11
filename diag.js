
(function(){
  'use strict';
  const out = document.getElementById('diagOut');
  const diagBtn = document.getElementById('diagBtn');
  const diagRecBtn = document.getElementById('diagRecBtn');
  const diagPlayback = document.getElementById('diagPlayback');

  function show(obj){
    if (!out) return;
    out.style.display='block';
    out.textContent = JSON.stringify(obj, null, 2);
  }

  async function ping(){
    try{
      const r = await fetch('/api/transcribe');
      const txt = await r.text();
      show({ get_status: r.status, get_body: txt });
    }catch(e){
      show({ error: String(e) });
    }
  }

  async function quickRecord(ms=3000){
    const stream = await navigator.mediaDevices.getUserMedia({audio:true});
    const rec = new MediaRecorder(stream, {mimeType:'audio/webm'});
    const chunks=[];
    rec.ondataavailable = e => { if (e.data.size>0) chunks.push(e.data); };
    await new Promise(res=>{ rec.onstop = res; rec.start(); setTimeout(()=>rec.stop(), ms); });
    const blob = new Blob(chunks, {type:'audio/webm'});
    diagPlayback.src = URL.createObjectURL(blob);
    diagPlayback.style.display='block';

    const fd = new FormData();
    fd.append('file', blob, 'diag.webm');
    const r = await fetch('/api/transcribe', {method:'POST', body:fd});
    const text = await r.text();
    show({ post_status: r.status, post_body: text, hint: (r.status===400?'✅ الاتصال صحيح والمفتاح صالح (المدخل ليس صوتًا حقيقيًا).':'ℹ️ الحالة: '+r.status) });
  }

  if (diagBtn) diagBtn.addEventListener('click', ping);
  if (diagRecBtn) diagRecBtn.addEventListener('click', ()=>quickRecord(3000));
})();