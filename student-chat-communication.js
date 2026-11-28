// Admin-only composer. No message or recipient storage; no sending API.
const $=id=>document.getElementById(id);
export const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const signature='AL-NOOR Language Academy\nAapka Ustaad\nhttps://aapkaustaad.com/\nStudent Portal: https://aapkaustaad.com/student-chat.html\nLearning & Exams: https://aapkaustaad.com/learning/';
export function formatted(subject,message){
 const e=escapeHtml;
 const body=String(message).split(/\r?\n\s*\r?\n/).map(p=>`<p dir="auto" style="margin:0 0 16px;line-height:1.6;font-size:16px;white-space:pre-wrap">${e(p).replace(/\r?\n/g,'<br>')}</p>`).join('');
 return `<div style="max-width:760px;font-family:Arial,sans-serif;color:#172c42;background:#fff"><div style="background:#143d6c;color:#fff;padding:24px;text-align:center;border-bottom:3px solid #e9c16b"><div style="font-size:26px;font-weight:bold">AL-NOOR Language Academy</div><div style="font-size:16px;margin-top:8px">Your Journey Towards Success</div></div><div style="padding:20px 0"><h2 dir="auto" style="color:#17529b;font-size:22px;border-bottom:1px solid #e9c16b;padding-bottom:10px">${e(subject)}</h2>${body}<div style="border-top:1px solid #e9c16b;padding-top:16px;font-size:15px;line-height:1.6"><strong style="color:#143d6c">AL-NOOR Language Academy</strong><br>Aapka Ustaad<br><a href="https://aapkaustaad.com/">www.aapkaustaad.com</a><br><a href="https://aapkaustaad.com/student-chat.html">Student Portal</a> · <a href="https://aapkaustaad.com/learning/">Learning &amp; Exams</a></div></div></div>`;
}
// Local PNG export: render the full message, not the scrollable preview viewport.
export async function messageImage(subject,message,doc=document){
 if(!String(subject).trim()||!String(message).trim())throw Error('Enter a subject and message first.');
 if(doc.fonts?.ready)await doc.fonts.ready;
 const canvas=doc.createElement('canvas'),width=1080,pad=48;canvas.width=width;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Image rendering unavailable.');
 const rows=[];let y=195;
 const direction=t=>{for(const c of t){if(/\p{Letter}/u.test(c))return /[\p{Script=Arabic}\p{Script=Hebrew}]/u.test(c)?'rtl':'ltr';}return 'ltr';};
 function add(text,font,color,lineHeight,dir=direction(text)){
  ctx.font=font;ctx.direction=dir;
  const max=width-2*pad;
  for(const line of String(text).split(/\r?\n/)){
   let part='';
   const words=line.match(/\S+|\s+/gu)||[];
   const push=()=>{rows.push({text:part.trimEnd(),y,font,color,dir});y+=lineHeight;part='';};
   for(const word of words){
    if(part&&ctx.measureText(part+word).width>max)push();
    if(/^\s+$/u.test(word)&&!part)continue;
    if(ctx.measureText(word).width>max){
     const chars=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(word)].map(x=>x.segment):[...word];
     for(const c of chars){if(part&&ctx.measureText(part+c).width>max)push();part+=c;}
    }else part+=word;
   }
   push();
  }
 }
 add(subject,'bold 35px Arial, sans-serif','#17529b',49);const subjectRule=y+4;y+=30;
 for(const para of String(message).split(/\r?\n\s*\r?\n/)){add(para,'29px Arial, sans-serif','#172c42',46);y+=18;if(y>11700)throw Error('Message too long for one PNG. Shorten the message and try again.');}
 const footerRule=y+2;y+=28;
 add('AL-NOOR Language Academy','bold 29px Arial, sans-serif','#143d6c',42,'ltr');
 add('Aapka Ustaad','27px Arial, sans-serif','#172c42',40,'ltr');
 add('www.aapkaustaad.com','25px Arial, sans-serif','#17529b',39,'ltr');
 add('Student Portal · Learning & Exams','25px Arial, sans-serif','#17529b',39,'ltr');
 if(y+pad>12000)throw Error('Message too long for one PNG. Shorten the message and try again.');
 canvas.height=y+pad;ctx.fillStyle='#fff';ctx.fillRect(0,0,width,canvas.height);ctx.fillStyle='#143d6c';ctx.fillRect(0,0,width,153);ctx.fillStyle='#e9c16b';ctx.fillRect(0,153,width,5);
 ctx.direction='ltr';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.font='bold 42px Arial, sans-serif';ctx.fillText('AL-NOOR Language Academy',width/2,58);ctx.font='28px Arial, sans-serif';ctx.fillText('Your Journey Towards Success',width/2,112);
 ctx.fillStyle='#e9c16b';for(const line of [subjectRule,footerRule])ctx.fillRect(pad,line,width-2*pad,2);
 ctx.textBaseline='top';for(const row of rows){ctx.direction=row.dir;ctx.textAlign=row.dir==='rtl'?'right':'left';ctx.font=row.font;ctx.fillStyle=row.color;ctx.fillText(row.text,row.dir==='rtl'?width-pad:pad,row.y);}
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Could not create PNG.');return blob;
}
export function downloadMessageImage(blob){const href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download='AL-NOOR-Message.png';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),30000);}
export function gmailUrl(emails,subject){const unique=[...new Set(emails.map(x=>x.trim().toLowerCase()))];if(!unique.length||unique.some(x=>! /^[^\s,@]+@[^\s,@]+\.[^\s,@]+$/.test(x)))throw Error('Select valid student email addresses.');const p=new URLSearchParams({view:'cm',fs:'1',tf:'cm',su:subject});p.set(unique.length===1?'to':'bcc',unique.join(','));const url='https://mail.google.com/mail/?'+p;if(url.length>7000)throw Error('Too many recipients for one Gmail link. Select a smaller group.');return url;}
export async function directory(edge,allowed){const rows=new Map();let page=0;while(true){if(!allowed())throw Error('Administrator access required.');const r=await edge('chat-admin',{action:'list-accounts',kind:'students',page});if(!allowed())throw Error('Administrator access required.');const d=r.data;if(!Array.isArray(d?.accounts)||!Array.isArray(d?.memberships))throw Error('Student directory unavailable.');for(const a of d.accounts){if(a.role!=='student'||!a.email)continue;rows.set(a.id,{...a,classes:d.memberships.filter(m=>m.user_id===a.id).map(m=>m.class_id)});}if(!d.has_more)break;if(++page>100000||!d.accounts.length)throw Error('Directory pagination failed.');}return [...rows.values()].sort((a,b)=>a.display_name.localeCompare(b.display_name));}
export function communicationTools({edge,getProfile,getClasses}){
 const dialog=$('sc-communication'),open=$('sc-communication-open'),subject=$('sc-comm-subject'),message=$('sc-comm-message'),preview=$('sc-comm-preview'),search=$('sc-comm-search'),filter=$('sc-comm-class'),list=$('sc-comm-list'),note=$('sc-comm-status'),count=$('sc-comm-count');
 let students=[],selected=new Set(),ready=false,generation=0,owner=null;
 const allowed=()=>{const p=getProfile();return !!(p?.active&&p.role==='admin'&&!p.must_change_password);};
 const current=()=>allowed()&&getProfile().id===owner&&dialog.open;
 const visible=()=>students.filter(s=>(!filter.value||s.classes.includes(filter.value))&&s.display_name.toLowerCase().includes(search.value.trim().toLowerCase()));
 const updatePreview=()=>{preview.innerHTML=formatted(subject.value,message.value);};
 function render(){list.replaceChildren();const rows=visible();for(const s of rows){const label=document.createElement('label'),check=document.createElement('input'),name=document.createElement('span');check.type='checkbox';check.checked=selected.has(s.id);name.textContent=s.display_name+' · '+s.email+(s.active?'':' · Revoked');check.onchange=()=>{if(check.checked)selected.add(s.id);else selected.delete(s.id);updateCount();};label.append(check,name);list.append(label);}if(!rows.length&&ready)list.textContent='No matching students.';updateCount();}
 function updateCount(){count.textContent=`${selected.size} selected · ${visible().length} matching · ${students.length} total`;for(const id of ['sc-comm-all','sc-comm-matches','sc-comm-clear'])$(id).disabled=!ready;$('sc-comm-gmail').disabled=!ready||!selected.size;$('sc-comm-copy').disabled=!ready;}
 function clear(){generation++;students=[];selected.clear();ready=false;owner=null;subject.value='';message.value='';search.value='';filter.replaceChildren(new Option('All classes',''));note.textContent='';preview.replaceChildren();list.replaceChildren();updateCount();}
 function reset(){if(dialog.open)dialog.close();clear();open.hidden=true;}
 function sync(){if(!allowed()){reset();return;}if(dialog.open&&owner!==getProfile().id)reset();open.hidden=false;}
 dialog.addEventListener('close',()=>{if(!dialog.open)clear();});
 open.onclick=async()=>{if(!allowed())return;clear();owner=getProfile().id;const ticket=generation;for(const c of getClasses().filter(c=>!c.archived))filter.add(new Option(c.name,c.id));dialog.showModal();updatePreview();note.textContent='Loading student directory…';try{const rows=await directory(edge,()=>ticket===generation&&current());if(ticket!==generation||!current())return;students=rows;ready=true;note.textContent='Choose one or more students. Multiple recipients use BCC.';render();}catch(e){if(ticket===generation&&dialog.open)note.textContent=e.message+' Close and reopen to retry.';}};
 search.oninput=render;filter.onchange=render;subject.oninput=message.oninput=updatePreview;
 $('sc-comm-all').onclick=()=>{if(current()&&ready){students.forEach(s=>selected.add(s.id));render();}};
 $('sc-comm-matches').onclick=()=>{if(current()&&ready){visible().forEach(s=>selected.add(s.id));render();}};
 $('sc-comm-clear').onclick=()=>{selected.clear();render();};
 $('sc-comm-copy').onclick=async()=>{if(!current()||!ready)return;if(!subject.value.trim()||!message.value.trim()){note.textContent='Enter a subject and message first.';return;}try{const html=formatted(subject.value,message.value);await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([subject.value+'\n\n'+message.value+'\n\n'+signature],{type:'text/plain'})})]);if(current())note.textContent='Formatted email copied. In Gmail, turn off Plain text mode and paste with Ctrl+V.';}catch{if(current())note.textContent='Rich clipboard unavailable. Select the formatted preview and copy manually.';}};
 $('sc-comm-image').onclick=async()=>{if(!current())return;const control=$('sc-comm-image'),ticket=generation;control.disabled=true;try{const blob=await messageImage(subject.value,message.value);if(ticket!==generation||!current())return;downloadMessageImage(blob);note.textContent='Message PNG prepared. Attach it manually in WhatsApp or email.';}catch(e){if(ticket===generation&&current())note.textContent=e.message||'Image export failed.';}finally{control.disabled=false;}};
 $('sc-comm-gmail').onclick=()=>{if(!current()||!ready)return;try{if(!subject.value.trim()||!message.value.trim())throw Error('Enter a subject and message first.');const url=gmailUrl(students.filter(s=>selected.has(s.id)).map(s=>s.email),subject.value);window.open(url,'_blank','noopener,noreferrer');note.textContent='Gmail opened with recipients and subject. Copy formatted email and paste in the body. Review sender and recipients before Send.';}catch(e){note.textContent=e.message;}};
 return {sync,reset};
}
