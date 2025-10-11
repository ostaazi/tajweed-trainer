
export default async function handler(req, context) {
  const key = process.env.OPENAI_API_KEY;
  if (req.method === 'GET') {
    const mode = new URL(req.url).searchParams.get('mode');
    const ok = !!key;
    if (mode === 'diag') {
      return new Response(JSON.stringify({ok, message: ok?'Key detected':'Missing key', hint:'Use POST to transcribe.'}, null, 2), {status: ok?200:500, headers:{'content-type':'application/json'}});
    }
    return new Response(JSON.stringify({ok:false, code:'method_not_allowed', message:'Use POST to transcribe.'}), {status:405, headers:{'content-type':'application/json'}});
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ok:false, code:'method_not_allowed', message:'Use POST'}), {status:405, headers:{'content-type':'application/json'}});
  }
  if (!key) {
    return new Response(JSON.stringify({ok:false, code:'no_key', message:'OPENAI_API_KEY not set'}), {status:500, headers:{'content-type':'application/json'}});
  }
  try{
    const form = await req.formData();
    const file = form.get('file');
    const language = form.get('language') || 'ar';
    if(!file){ return new Response(JSON.stringify({ok:false, code:'no_file', message:'No audio file provided'}), {status:400, headers:{'content-type':'application/json'}}); }
    const oform = new FormData();
    oform.append('file', file, file.name || 'audio.webm');
    oform.append('model','whisper-1');
    oform.append('response_format','json');
    oform.append('language', language);
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method:'POST', headers:{ 'Authorization':'Bearer '+key }, body:oform
    });
    const text = await res.text();
    if(!res.ok){
      return new Response(JSON.stringify({ok:false, code:'openai_error', message:'OpenAI returned a non-200 response.', openai_text:text}), {status:res.status, headers:{'content-type':'application/json'}});
    }
    return new Response(text, {status:200, headers:{'content-type':'application/json'}});
  }catch(e){
    return new Response(JSON.stringify({ok:false, code:'exception', message:e.message}), {status:500, headers:{'content-type':'application/json'}});
  }
}
