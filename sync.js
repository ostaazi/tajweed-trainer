const { google } = require('googleapis');
exports.handler = async (event)=>{
  if (event.httpMethod !== 'POST') return { statusCode:405, body:'Method Not Allowed' };
  try{
    const payload = JSON.parse(event.body||'{}');
    const key = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT||'{}');
    const sheetId = process.env.SHEET_ID;
    if (!key.client_email || !key.private_key || !sheetId) return { statusCode:500, body:'Missing Google credentials.' };
    const jwt = new google.auth.JWT(key.client_email, null, key.private_key, ['https://www.googleapis.com/auth/spreadsheets']);
    const sheets = google.sheets({version:'v4', auth: jwt});
    const row = [ new Date(payload.ts||Date.now()).toISOString(), payload.traineeName||'', payload.sectionKey||payload.title||'', `${payload.correct||0}/${payload.total||0}`, (payload.analysis && payload.analysis.text)||'' ];
    await sheets.spreadsheets.values.append({ spreadsheetId: sheetId, range: 'Sheet1!A:E', valueInputOption: 'USER_ENTERED', requestBody: { values: [row] } });
    return { statusCode:200, body: JSON.stringify({ok:true}) };
  }catch(e){ return { statusCode:500, body: JSON.stringify({ok:false, error:String(e)}) }; }
};