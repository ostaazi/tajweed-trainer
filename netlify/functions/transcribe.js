
exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: cors(), body: "" };
  }
  if (event.httpMethod === "GET") {
    const ok = !!process.env.OPENAI_API_KEY;
    return { statusCode: 200, headers: cors(), body: JSON.stringify({ok, hint: ok?"المفتاح مُعدّ":"أضف OPENAI_API_KEY"}) };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: cors(), body: JSON.stringify({ok:false, code:"method_not_allowed", message:"Use POST to transcribe"}) };
  }
  try {
    const boundary = event.headers["content-type"].split("boundary=")[1];
    const bodyBuffer = Buffer.from(event.body, event.isBase64Encoded? "base64":"utf8");
    // Naive parse to get file bytes (works for single file field named 'audio')
    const parts = bodyBuffer.toString("binary").split("--"+boundary);
    const filePart = parts.find(p=>p.includes('name="audio"'));
    if(!filePart) throw new Error("no_file");
    const start = filePart.indexOf("\r\n\r\n")+4;
    const end   = filePart.lastIndexOf("\r\n");
    const audioBytes = Buffer.from(filePart.slice(start,end), "binary");

    // Call OpenAI Whisper
    const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method:"POST",
      headers: { "Authorization": "Bearer "+process.env.OPENAI_API_KEY },
      body: (()=>{
        const fd = new (require("form-data"))();
        fd.append("file", audioBytes, { filename:"audio.webm", contentType:"audio/webm" });
        fd.append("model","whisper-1");
        fd.append("language","ar");
        return fd;
      })()
    });
    const j = await resp.json();
    if(!resp.ok) return { statusCode: resp.status, headers: cors(), body: JSON.stringify({ok:false, code:"openai_error", message:"OpenAI returned a non-200 response.", data:j}) };
    return { statusCode: 200, headers: cors(), body: JSON.stringify({ok:true, text: j.text || "", data:j}) };
  } catch(e){
    return { statusCode: 500, headers: cors(), body: JSON.stringify({ok:false, code:"server_error", message:String(e)}) };
  }
};

function cors(){
  return {
    "Access-Control-Allow-Origin":"*",
    "Access-Control-Allow-Methods":"GET,POST,OPTIONS",
    "Access-Control-Allow-Headers":"Content-Type,Authorization"
  };
}
