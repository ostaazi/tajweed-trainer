
async function diag() {
  const out = document.getElementById('transcript');
  out.textContent = '... جاري التشخيص';
  try{
    const res = await fetch('/.netlify/functions/transcribe?mode=diag');
    const txt = await res.text();
    out.textContent = txt;
    alert('انتهى التشخيص. الحالة: ' + res.status);
  }catch(e){
    out.textContent = 'فشل التشخيص: ' + e.message;
  }
}
document.addEventListener('click', (e)=>{
  if(e.target && e.target.id==='diagBtn'){ diag(); }
});
