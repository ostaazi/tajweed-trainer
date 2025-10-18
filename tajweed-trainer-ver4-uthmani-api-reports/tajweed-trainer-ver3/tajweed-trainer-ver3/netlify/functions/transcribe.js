
// Netlify Function: /.netlify/functions/transcribe
// Requires environment variable OPENAI_API_KEY
export default async function handler(req, context) {
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ ok:false, code:'method_not_allowed', message:'Use POST to transcribe' }), { status:405 });
  }
  try {
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || process.env.OPENAI_APIKEY;
    if(!apiKey){
      return new Response(JSON.stringify({ ok:false, code:'missing_key', message:'OPENAI_API_KEY not configured' }), { status:500 });
    }
    const formData = await req.formData();
    const blob = formData.get('file');
    const language = formData.get('language') || 'ar';

    const upstream = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method:'POST',
      headers:{ 'Authorization':`Bearer ${apiKey}` },
      body: (()=>{
        const fd = new FormData();
        fd.append('file', blob, 'speech.webm');
        fd.append('model','whisper-1'); // or gpt-4o-transcribe when available
        fd.append('response_format','verbose_json');
        fd.append('language', language);
        return fd;
      })()
    });
    const text = await upstream.text();
    if(!upstream.ok){
      return new Response(JSON.stringify({ ok:false, code:'openai_error', message:'OpenAI returned a non-200 response.', openai_text:text, diagnostics:{ stage:'fetch_openai', env_present:true, openai_status: upstream.status } }), { status: upstream.status });
    }
    const j = JSON.parse(text);
    return new Response(JSON.stringify({ ok:true, text:j.text || j.text?.trim?.() || '', raw:j }), { status:200 });
  } catch (err) {
    return new Response(JSON.stringify({ ok:false, code:'exception', message:String(err) }), { status:500 });
  }
}
