(function(){
  const key='djokko_theme';
  const root=document.documentElement;
  const saved=localStorage.getItem(key);
  if(saved==='light') root.setAttribute('data-theme','light');

  const btn=document.getElementById('themeToggle');
  if(!btn) return;
  btn.addEventListener('click', ()=>{
    const isLight=root.getAttribute('data-theme')==='light';
    if(isLight){
      root.removeAttribute('data-theme');
      localStorage.setItem(key,'dark');
    }else{
      root.setAttribute('data-theme','light');
      localStorage.setItem(key,'light');
    }
  });
})();

