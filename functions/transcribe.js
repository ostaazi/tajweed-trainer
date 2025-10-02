// /.netlify/functions/transcribe
exports.handler = async (event) => {
  try {
    const baseHeaders = { "Content-Type": "application/json; charset=utf-8" };
    if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: baseHeaders, body: "{}" };
    if (event.httpMethod !== "POST") return { statusCode: 405, headers: baseHeaders, body: JSON.stringify({ error: "Method Not Allowed" }) };

    let audio_b64=null, mime="audio/webm", language="ar";
    try {
      const body = JSON.parse(event.body || "{}");
      audio_b64 = body.audio_b64; if (body.mime) mime=String(body.mime); if (body.language) language=String(body.language);
    } catch { return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: "Invalid JSON body" }) }; }

    if (!audio_b64) return { statusCode: 400, headers: baseHeaders, body: JSON.stringify({ error: "Missing audio_b64" }) };

    const bytes = Buffer.from(audio_b64, "base64");
    const blob = new Blob([bytes], { type: mime });
    const fd = new FormData();
    fd.append("file", blob, "audio.webm");
    fd.append("model", "whisper-1");
    fd.append("response_format", "verbose_json");
    if (language) fd.append("language", language);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return { statusCode: 500, headers: baseHeaders, body: JSON.stringify({ error: "OPENAI_API_KEY not set" }) };

    const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: fd
    });
    const text = await resp.text();
    return { statusCode: resp.status, headers: baseHeaders, body: text };
  } catch (err) {
    return { statusCode: 500, headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify({ error: String(err) }) };
  }
};
