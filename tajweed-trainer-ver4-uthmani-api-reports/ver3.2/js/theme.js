
(function(){
  const root=document.documentElement;
  const apply=(m)=>{m==='dark'?root.classList.add('dark'):root.classList.remove('dark');localStorage.setItem('tjw-theme',m);};
  const cur=localStorage.getItem('tjw-theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');apply(cur);
  window.toggleTheme=()=>apply(root.classList.contains('dark')?'light':'dark');
})();