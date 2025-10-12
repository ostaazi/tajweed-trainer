
/* Tajweedy - App Bootstrap (no visible settings) */
export const App = (()=>{
  const S = {
    modeKey: 'taj_MODE',
    lastTsKey: 'taj_LAST_TS',
    banks: {
      main: 'questions_bank.json',
      exercises: 'exercises_bank.json'
    }
  };
  function initTheme(btnId='modeBtn'){
    const b = document.getElementById(btnId);
    if(!b) return;
    const apply=()=>{
      const dark = localStorage.getItem(S.modeKey)==='dark';
      document.documentElement.classList.toggle('dark', dark);
      b.innerText = dark ? '🌞' : '🌓';
    };
    apply();
    b.onclick=()=>{
      const isDark = localStorage.getItem(S.modeKey)==='dark';
      localStorage.setItem(S.modeKey, isDark? 'light':'dark');
      apply();
    };
  }
  async function pingBanks(){
    const miss = [];
    for(const k of Object.values(S.banks)){
      try{
        const r = await fetch(k, {cache:'no-store'});
        if(!r.ok) miss.push(k);
      }catch(_){ miss.push(k); }
    }
    if(miss.length){
      console.warn('Missing banks:', miss);
    }
    return miss;
  }
  function gotoReport(){
    location.href = 'report.html';
  }
  function printPage(){
    window.print();
  }
  return { initTheme, pingBanks, gotoReport, printPage, S };
})();
/* Usage example (per page):
import {App} from './app.js';
document.addEventListener('DOMContentLoaded', async ()=>{
  App.initTheme('modeBtn');
  const missing = await App.pingBanks();
  if(missing.length){ /* يمكن عرض تنبيه بسيط إن رغبت */ }
});
*/
