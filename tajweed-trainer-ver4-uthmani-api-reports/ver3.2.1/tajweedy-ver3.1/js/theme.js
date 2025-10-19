
(function(){
  const KEY='tajweedy:theme';
  const saved = localStorage.getItem(KEY);
  if(saved==='dark') document.documentElement.classList.add('dark');
  const btn = document.getElementById('toggleTheme');
  if(btn){
    btn.addEventListener('click', ()=>{
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem(KEY, isDark?'dark':'light');
    });
  }
  if(!saved){
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if(prefersDark){
      document.documentElement.classList.add('dark');
      localStorage.setItem(KEY,'dark');
    }
  }
})();
