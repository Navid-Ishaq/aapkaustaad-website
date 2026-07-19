document.addEventListener('DOMContentLoaded',()=>{
  const current=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  document.querySelectorAll('.menu-links a').forEach(link=>{
    if((link.getAttribute('href')||'').split('#')[0].toLowerCase()===current) link.setAttribute('aria-current','page');
  });
  const toggle=document.getElementById('menu-toggle');
  const menu=document.querySelector('.menu-links');
  const label=document.querySelector('label[for="menu-toggle"]');
  if(toggle&&menu&&label){label.setAttribute('role','button');label.setAttribute('tabindex','0');label.setAttribute('aria-controls','primary-navigation');label.setAttribute('aria-expanded','false');menu.id='primary-navigation';toggle.addEventListener('change',()=>label.setAttribute('aria-expanded',String(toggle.checked)));label.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle.click();}});}
  document.querySelectorAll('img').forEach((img,index)=>{if(index>0)img.loading='lazy';img.decoding='async';if(!img.hasAttribute('alt'))img.alt='';});
  document.querySelectorAll('.detleng-sticky-btn').forEach(link=>link.setAttribute('aria-label','Consult AL-NOOR by email'));
});
