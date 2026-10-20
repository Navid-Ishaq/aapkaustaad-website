export function setupAdminNavigation(getProfile){
 const bar=document.getElementById('admin-shortcuts'),panel=document.getElementById('admin-panel'),toggle=document.getElementById('admin-toggle'),header=document.querySelector('.detleng-nav');
 function measure(){const top=Math.ceil(header.getBoundingClientRect().bottom);document.documentElement.style.setProperty('--sc-header-bottom',top+'px');document.documentElement.style.setProperty('--sc-management-offset',(top+(bar.hidden?0:bar.offsetHeight)+16)+'px');}
 function sync(){const enabled=getProfile()?.role==='admin'&&!panel.hidden&&!document.getElementById('workspace').hidden;bar.hidden=!enabled;toggle.setAttribute('aria-expanded',String(enabled));toggle.setAttribute('aria-controls','admin-panel');bar.querySelectorAll('[data-owner-shortcut]').forEach(link=>link.hidden=document.getElementById('owner-badge').hidden);document.querySelectorAll('.sc-back-top').forEach(link=>link.hidden=!enabled);measure();}
 const observer=new MutationObserver(sync);for(const id of ['admin-panel','workspace','owner-badge'])observer.observe(document.getElementById(id),{attributes:true,attributeFilter:['hidden']});
 const resize=new ResizeObserver(measure);resize.observe(header);resize.observe(bar);window.addEventListener('resize',measure);
 function jump(link){const target=document.getElementById(link.hash.slice(1));if(!target||bar.hidden||link.hidden)return;if(target.tagName==='DETAILS')target.open=true;measure();if(target===bar){window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});target.focus({preventScroll:true});return;}target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});target.focus({preventScroll:true});}
 bar.tabIndex=-1;document.querySelectorAll('#admin-shortcuts a,.sc-back-top').forEach(link=>link.addEventListener('click',e=>{e.preventDefault();jump(link);}));sync();
}

