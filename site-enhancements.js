document.addEventListener('DOMContentLoaded',()=>{
  const current=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  document.body.classList.add(`page-${current.replace('.html','').replace(/[^a-z0-9-]/g,'')}`);
  document.querySelector('.detleng-nav')?.setAttribute('aria-label','Primary navigation');
  document.querySelectorAll('h1,h2').forEach(heading=>{
    heading.childNodes.forEach(node=>{if(node.nodeType===Node.TEXT_NODE)node.textContent=node.textContent.replace(/^[^A-Za-zÀ-ÿÀ-ž\u0600-\u06ff0-9]+/u,'')});
  });
  document.querySelectorAll('.menu-links a').forEach(link=>{if((link.getAttribute('href')||'').split('#')[0].toLowerCase()===current)link.setAttribute('aria-current','page')});
  const toggle=document.getElementById('menu-toggle'),menu=document.querySelector('.menu-links'),label=document.querySelector('label[for="menu-toggle"]');
  if(toggle&&menu&&label){label.setAttribute('role','button');label.setAttribute('tabindex','0');label.setAttribute('aria-controls','primary-navigation');label.setAttribute('aria-expanded','false');menu.id='primary-navigation';toggle.addEventListener('change',()=>label.setAttribute('aria-expanded',String(toggle.checked)));label.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle.click()}});menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{toggle.checked=false;label.setAttribute('aria-expanded','false')}))}
  const content=document.querySelector('.detleng-content');
  if(content){
    content.setAttribute('role','main');
    const direct=[...content.children].filter(el=>el.tagName==='DIV'||el.tagName==='SECTION');
    direct.forEach(el=>{
      const style=(el.getAttribute('style')||'').toLowerCase(),text=(el.textContent||'').trim();
      if(style.includes('darkgreen')&&text.includes('A new day is born'))el.classList.add('thought-strip');
      const heading=el.querySelector('h1,h2');
      if(heading&&text.length>100&&!el.classList.contains('thought-strip'))el.classList.add('content-panel');
      if(/linear-gradient|background:\s*(#0|#1|#2|darkgreen|navy|blue)/.test(style))el.classList.add('section-dark');
      if(/#eef|#eff|#eaf|#edf|lightblue/.test(style))el.classList.add('section-accent');
      if(/#fff[0-9a-f]{3}|#fef|#fffa|gold|yellow/.test(style))el.classList.add('section-warm');
    });
    const heroHeading=content.querySelector('h1')||content.querySelector('h2');
    if(heroHeading){let hero=heroHeading.closest('header,div,section');if(hero&&hero!==content&&content.contains(hero)){while(hero.parentElement!==content&&hero.parentElement?.closest('.detleng-content'))hero=hero.parentElement;hero.classList.add('content-panel','page-hero','section-dark')}}
    const cta=[...content.children].find(el=>el.matches('div')&&el.querySelector(':scope > a[href^="mailto:"]')&&el.textContent.includes('Get Started'));
    if(cta)cta.classList.add('page-cta');
  }
  document.querySelectorAll('a[style*="background"],.btn-blue,.btn-gold,.dublin-btn,.noorButton,.magicButton').forEach(a=>{if(!a.classList.contains('detleng-sticky-btn'))a.classList.add('premium-action')});
  if(current==='contact.html'){
    const firstContact=[...document.querySelectorAll('.detleng-content > div')].find(el=>el.textContent.includes('Contacto con AL-NOOR'));
    if(firstContact){firstContact.classList.add('content-panel');const actionBox=[...firstContact.querySelectorAll('div')].find(el=>el.querySelectorAll('a[href]').length>=2);if(actionBox)actionBox.classList.add('contact-actions')}
  }
  document.querySelectorAll('.alnoor-card').forEach(card=>{card.classList.add('content-panel');card.classList.remove('section-dark')});
  document.querySelectorAll('img').forEach((img,index)=>{if(index>0)img.loading='lazy';img.decoding='async';if(!img.hasAttribute('alt'))img.alt=''});
  document.querySelectorAll('a[target="_blank"]').forEach(a=>a.rel='noopener noreferrer');
  document.querySelectorAll('.detleng-sticky-btn').forEach(a=>a.setAttribute('aria-label','Consult AL-NOOR by email'));
});
