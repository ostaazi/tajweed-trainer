// /.netlify/functions/transcribe
// Improved diagnostics + CORS + strict JSON errors
// Expects body: { audio_b64, mime?: string, language?: "ar" }
// Reads API key from: process.env.OPENAI_API_KEY

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

function jres(status, obj){
  return { statusCode: status, headers: JSON_HEADERS, body: JSON.stringify(obj) };
}

exports.handler = async (event, context) => {
  // Preflight
  if (event.httpMethod === "OPTIONS") return jres(200, { ok: true });

  if (event.httpMethod !== "POST") {
    return jres(405, { ok:false, code:"method_not_allowed", message:"Use POST to transcribe." });
  }

  const diagnostics = {
    stage: "start",
    env_present: !!process.env.OPENAI_API_KEY,
    content_length: (event.headers && (event.headers["content-length"] || event.headers["Content-Length"])) || null,
    user_agent: (event.headers && (event.headers["user-agent"] || event.headers["User-Agent"])) || null
  };

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (e) {
    return jres(400, { ok:false, code:"invalid_json", message:"Request body must be JSON.", details:String(e), diagnostics });
  }

  const audio_b64 = payload && payload.audio_b64;
  const mime = (payload && payload.mime) || "audio/webm";
  const language = (payload && payload.language) || "ar";

  if (!audio_b64 || typeof audio_b64 !== "string") {
    return jres(400, { ok:false, code:"missing_audio_b64", message:"Field 'audio_b64' is required (base64).", diagnostics });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jres(500, { ok:false, code:"api_key_missing", message:"OPENAI_API_KEY is not set in environment.", diagnostics });
  }

  try {
    diagnostics.stage = "prepare_formdata";

    const bytes = Buffer.from(audio_b64, "base64");
    const blob = new Blob([bytes], { type: mime });

    const fd = new FormData();
    fd.append("file", blob, "audio.webm");
    fd.append("model", "whisper-1");
    fd.append("response_format", "verbose_json");
    if (language) fd.append("language", language);

    diagnostics.stage = "fetch_openai";
    const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}` },
      body: fd
    });

    const text = await resp.text();
    diagnostics.openai_status = resp.status;

    if (!resp.ok) {
      // Return OpenAI error surface for easy debugging in browser console
      return jres(resp.status, {
        ok:false, code:"openai_error", message:"OpenAI returned a non-200 response.",
        openai_text: text, diagnostics
      });
    }

    // Success: text is the verbose_json from OpenAI
    try {
      const data = JSON.parse(text);
      return jres(200, data);
    } catch (e) {
      return jres(200, { ok:true, raw:text, diagnostics });
    }

  } catch (err) {
    return jres(500, { ok:false, code:"server_exception", message:String(err), diagnostics });
  }
};
