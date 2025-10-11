/* diag.js — in-page diagnostics for Netlify function + OpenAI key */
(function(){
  function $(id){ return document.getElementById(id); }
  function printDiag(obj){
    var el = $("diagOut"); if (!el) return;
    el.style.display = "block";
    el.textContent = (typeof obj === "string") ? obj : JSON.stringify(obj, null, 2);
  }
  async function runDiagnostics(){
    try{
      const r1 = await fetch('/.netlify/functions/transcribe');
      const t1 = await r1.text();

      const r2 = await fetch('/.netlify/functions/transcribe', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ audio_b64: btoa('test-audio'), mime:'audio/webm', language:'ar' })
      });
      const t2 = await r2.text();

      let hint = '';
      if (r2.status === 401 || /api_key/i.test(t2))        hint = '❌ المفتاح غير صحيح/غير موجود في Netlify.';
      else if (r2.status === 404)                          hint = '❌ الدالة غير منشورة. تأكد من Functions=functions ثم انشر بدون كاش.';
      else if (r2.status === 422 || r2.status === 400)     hint = '✅ الاتصال صحيح والمفتاح صالح (المدخل ليس صوتًا حقيقيًا).';
      else                                                 hint = 'ℹ️ الحالة: ' + r2.status;

      printDiag({ get_status: r1.status, get_body: t1, post_status: r2.status, post_body: t2, hint });
      alert(hint);
    }catch(e){
      printDiag(String(e));
      alert('فشل الاختبار: تحقق من الاتصال أو اسم المسار.');
    }
  }
  async function blobToB64(blob){
    const buf = await blob.arrayBuffer();
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
  }
  async function runDiagnosticsWithRecord(){
    try{
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
      const rec = new MediaRecorder(stream, { mimeType:'audio/webm' });
      const chunks = [];
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = async () => {
        const blob = new Blob(chunks, { type:'audio/webm' });
        const pb = $("diagPlayback"); if (pb) { pb.src = URL.createObjectURL(blob); pb.style.display = 'block'; }
        const audio_b64 = await blobToB64(blob);
        const r = await fetch('/.netlify/functions/transcribe', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ audio_b64, mime:'audio/webm', language:'ar' })
        });
        const text = await r.text();
        let hint = '';
        if (r.status === 200 && /"text":/.test(text))      hint = '✅ تم التفريغ بنجاح.';
        else if (r.status === 401 || /api_key/i.test(text))hint = '❌ مشكلة مفتاح: OPENAI_API_KEY.';
        else if (r.status === 404)                         hint = '❌ الدالة غير منشورة (Functions=functions + إعادة نشر).';
        else if (r.status === 422)                         hint = 'ℹ️ 422 من OpenAI: تحقق من التنسيق/المدة.';
        else                                               hint = 'ℹ️ الحالة: ' + r.status;
        printDiag({ post_status: r.status, post_body: text, hint });
        alert(hint);
        stream.getTracks().forEach(t=>t.stop());
      };
      rec.start();
      setTimeout(()=> rec.stop(), 3000);
    }catch(e){
      printDiag(String(e));
      alert('تعذّر الوصول إلى الميكروفون. امنح الإذن من المتصفح.');
    }
  }
  function bind(){
    const d1 = $("diagBtn"), d2 = $("diagRecBtn");
    if (d1) d1.onclick = runDiagnostics;
    if (d2) d2.onclick = runDiagnosticsWithRecord;
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
  window.__tajweedDiag = { runDiagnostics, runDiagnosticsWithRecord, printDiag };
})();
