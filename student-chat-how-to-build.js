import {renderJourney} from './student-chat-how-to-build-markdown.js';

const byId = id => document.getElementById(id);
const nav = document.querySelector('.detleng-nav');
const progress = byId('sc-build-progress');
const article = byId('sc-build-article');
const toc = byId('sc-build-toc-links');
const search = byId('sc-build-search');
const mobileSelect = byId('sc-build-mobile-select');
const progressFill = byId('sc-build-progress-fill');
const percent = byId('sc-build-percent');
const source = 'docs/student-chat-development/DEVELOPMENT_JOURNEY.md';
let chapters = [], current = '', frame = 0;
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function updateDimensions() {
  const navHeight = Math.ceil(nav.getBoundingClientRect().height);
  const progressHeight = Math.ceil(progress.getBoundingClientRect().height);
  const mobileNav = document.querySelector('.sc-build-mobile-nav');
  const mobileHeight = mobileNav && getComputedStyle(mobileNav).display !== 'none' ? Math.ceil(mobileNav.getBoundingClientRect().height) : 0;
  document.documentElement.style.setProperty('--sc-build-nav-offset', navHeight+'px');
  document.documentElement.style.setProperty('--sc-build-progress-height', progressHeight+'px');
  document.documentElement.style.setProperty('--sc-build-content-offset', (navHeight+progressHeight+(mobileHeight ? mobileHeight+22 : 22))+'px');
}
function jump(id, changeHash=true) {
  const target = document.getElementById(id); if (!target) return;
  updateDimensions();
  const top = target.getBoundingClientRect().top + window.scrollY - parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sc-build-content-offset'));
  if (changeHash) history.replaceState(null, '', '#'+encodeURIComponent(id));
  window.scrollTo({top:Math.max(0,top),behavior:reduceMotion()?'instant':'smooth'});
  setCurrent(id);
}
function setCurrent(id) {
  if (!id || id===current) return;current=id;
  for(const a of toc.querySelectorAll('a[data-chapter]')){
    const active = a.dataset.chapter===id;
    a.classList.toggle('is-active',active);
    if(active)a.setAttribute('aria-current','location'); else a.removeAttribute('aria-current');
  }
  if (mobileSelect.value!==id) mobileSelect.value=id;
  const activeLink = [...toc.querySelectorAll('a[data-chapter]')].find(a=>a.dataset.chapter===id);
  if (activeLink && activeLink.offsetParent) {
    const a=activeLink.getBoundingClientRect(), b=toc.getBoundingClientRect();
    if (a.top<b.top+12 || a.bottom>b.bottom-12) toc.scrollTop += a.top-b.top-toc.clientHeight/2+a.height/2;
  }
}
function onScroll() {
  frame=0; if(!chapters.length)return;
  const offset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sc-build-content-offset')) || 160;
  const top=article.getBoundingClientRect().top+window.scrollY;
  const end=top+article.offsetHeight;
  const currentPos=window.scrollY+offset;
  const percentage = Math.round(Math.min(100,Math.max(0,(currentPos-top)/(Math.max(1,end-top-window.innerHeight*.65))))*100);
  percent.textContent=percentage+'% read';progressFill.style.width=percentage+'%';
  let chosen=chapters[0];for(const c of chapters)if(c.element.getBoundingClientRect().top<=offset+28)chosen=c;
  setCurrent(chosen.id);
}
function schedule() {if(!frame) frame=requestAnimationFrame(onScroll);}
function listChapters() {
  toc.replaceChildren();mobileSelect.replaceChildren();
  for(const c of chapters){
    const a=document.createElement('a');a.href='#'+c.id;a.dataset.chapter=c.id;a.textContent=c.title;
    a.addEventListener('click',event=>{event.preventDefault();jump(c.id);});toc.append(a);
    const option=document.createElement('option');option.value=c.id;option.textContent=c.title;mobileSelect.append(option);
  }
  byId('sc-build-chapter-count').textContent=chapters.length+' chapters';
  mobileSelect.addEventListener('change',()=>jump(mobileSelect.value));
  search.addEventListener('input',()=>{
    const q=search.value.toLocaleLowerCase().trim();let visible=0;
    for(const a of toc.querySelectorAll('a')){const match=a.textContent.toLocaleLowerCase().includes(q);a.hidden=!match;if(match)visible++;}
    if(!visible && q)toc.setAttribute('aria-label','No chapters found');else toc.setAttribute('aria-label','Development journey chapters');
  });
}
async function init() {
  try {
    const response=await fetch(source,{cache:'no-store'});
    if(!response.ok)throw Error('Markdown request returned '+response.status);
    const markdown=await response.text();
    if(!markdown.trim()||!markdown.includes('# Building AL-NOOR Student Chat'))throw Error('The Markdown report is missing or invalid.');
    const rendered=renderJourney(markdown);
    if(!rendered.chapters.length)throw Error('The Markdown report contains no chapters.');
    article.replaceChildren(rendered.fragment);chapters=rendered.chapters.map(c=>({...c,element:document.getElementById(c.id)}));
    listChapters();updateDimensions();
    if(location.hash){const id=decodeURIComponent(location.hash.slice(1));if(document.getElementById(id))requestAnimationFrame(()=>jump(id,false));}
    schedule();
  } catch(error) {
    article.replaceChildren();
    const h=document.createElement('h2');h.textContent='The development journey could not be opened.';
    const p=document.createElement('p');p.textContent='Please check your connection or open the source document directly.';
    const a=document.createElement('a');a.href=source;a.textContent='Open the Markdown document';
    const small=document.createElement('p');small.className='sc-build-error-detail';small.textContent='Details: '+error.message;
    article.append(h,p,a,small);
  }
}
window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',()=>{updateDimensions();schedule();},{passive:true});
window.addEventListener('hashchange',()=>{const id=decodeURIComponent(location.hash.slice(1));if(document.getElementById(id))jump(id,false);});
if('ResizeObserver' in window){const observer=new ResizeObserver(()=>{updateDimensions();schedule();});observer.observe(nav);observer.observe(progress);}
updateDimensions();init();
