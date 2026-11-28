import {whatsappUrl,welcomeImage,downloadWelcomeImage} from './welcome-delivery.js?v=4.8.3';
// Enrollment form and manual Gmail handoff. No credentials in URLs or persistent storage.
export function madridToday(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const v=k=>parts.find(x=>x.type===k).value;return `${v('year')}-${v('month')}-${v('day')}`;
}
export function addMonths(day,months){const [y,m,d]=day.split('-').map(Number);const date=new Date(Date.UTC(y,m-1+months,1));const last=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();date.setUTCDate(Math.min(d,last));return date.toISOString().slice(0,10);}
const fmt=d=>d?d.split('-').reverse().join('/'):'—';
export function welcomeMessage(name,email,data){
 const courses=data.courses.map(c=>`${c.name} (${[c.en?'English':'',c.es?'Español':''].filter(Boolean).join(' / ')})`).join('; ')||'No learning course assigned';
 const driving=data.courses.some(c=>c.code==='DRV-B'), days=data.inactivity_days;
 return `AL-NOOR Language Academy
Your Journey Towards Success

Dear ${name},
Welcome to AL-NOOR! Your student account is ready.

Your login details
Student Portal: https://aapkaustaad.com/student-chat.html
Learning & Exams: https://aapkaustaad.com/learning/
Email: ${email}
Password: 
Courses: ${courses}
Enrollment date: ${fmt(madridToday())}
Access valid until: ${fmt(data.expires_on)}

Your Road to Success
Please take a moment to read the guidance below for a smooth, successful and timely learning journey, in English, Urdu and Spanish.

English
Study regularly, practise daily and make the most of your course access.${driving?' With consistent preparation, students can generally be ready for the driving theory exam in six weeks. Aim to pass within three months.':''}
${days?`Important: Learning access is suspended after ${days} days of inactivity. Contact the academy for restoration.\n`:''}Change your password after your first login. We wish you every success!

اردو
باقاعدگی سے پڑھائی کریں اور روزانہ ٹیسٹ کی مشق کریں۔${driving?' مسلسل محنت سے عموماً چھ ہفتوں میں ڈرائیونگ تھیوری امتحان کی تیاری ہو سکتی ہے۔ کوشش کریں کہ تین ماہ میں امتحان پاس کر لیں۔':''}
${days?`اہم: اگر آپ ${days} دن تک لرننگ پلیٹ فارم استعمال نہیں کریں گے تو آپ کی رسائی معطل ہو جائے گی۔ بحالی کے لیے اکیڈمی سے رابطہ کریں۔\n`:''}پہلی مرتبہ لاگ اِن کرنے کے بعد اپنا پاس ورڈ تبدیل کریں۔ اللہ تعالیٰ آپ کو کامیابی عطا فرمائے۔ آمین۔

Español
Estudia regularmente, practica todos los días y aprovecha al máximo tu curso.${driving?' Con preparación constante, generalmente puedes estar preparado/a para el examen teórico de conducir en seis semanas. Intenta aprobarlo en un plazo de tres meses.':''}
${days?`Importante: El acceso a la plataforma de aprendizaje se suspende tras ${days} días de inactividad. Contacta con la academia para reactivarlo.\n`:''}Cambia tu contraseña después de iniciar sesión por primera vez. ¡Mucho éxito!

Kind regards / نیک تمناؤں کے ساتھ / Un cordial saludo
AL-NOOR Language Academy
Aapka Ustaad
https://aapkaustaad.com`;
}
const escapeHtml=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function formattedWelcome(text){
 let rtl=false; const lines=text.split(/\r?\n/);const html=lines.map((line,i)=>{
  const safe=escapeHtml(line); const trimmed=line.trim();
  if(!trimmed)return '<div style="height:10px">&nbsp;</div>';
  if(trimmed==='اردو')rtl=true;else if(trimmed==='English'||trimmed==='Español'||trimmed.startsWith('Kind regards'))rtl=false;
  if(i===0&&trimmed==='AL-NOOR Language Academy')return `<div style="background:#103e75;color:#ffffff;font-size:26px;font-weight:bold;text-align:center;padding:18px 12px 4px">${safe}</div>`;
  if(i===1&&trimmed==='Your Journey Towards Success')return `<div style="background:#103e75;color:#ffffff;font-size:17px;text-align:center;padding:4px 12px 18px;border-bottom:3px solid #e9be53">${safe}</div>`;
  if(['Your login details','Your Road to Success','English','اردو','Español'].includes(trimmed))return `<div dir="${rtl?'rtl':'ltr'}" style="font-size:21px;font-weight:bold;color:#205ba5;border-bottom:2px solid #e9be53;margin:14px 0 9px;padding:6px 0">${safe}</div>`;
  if(trimmed.startsWith('Access valid until:'))return `<div style="text-align:center;color:#b91c1c;font-weight:bold;font-size:24px;padding:14px 6px">${safe}</div>`;
  const link=line.match(/^(Student Portal: |Learning & Exams: )?(https:\/\/aapkaustaad\.com(?:\/[a-zA-Z0-9._/-]*)?)$/);
  if(link)return `<div style="margin:5px 0">${escapeHtml(link[1]||'')}<a style="color:#205ba5" href="${escapeHtml(link[2])}">${escapeHtml(link[2])}</a></div>`;
  if(/^(Email|Password|Courses|Enrollment date):/.test(line)){const colon=line.indexOf(':')+1;return `<div style="margin:5px 0"><strong>${escapeHtml(line.slice(0,colon))}</strong>${line.slice(colon).trim()?escapeHtml(line.slice(colon)):'&nbsp;'}</div>`;}
  if(/^(Important:|Importante:|اہم:)/.test(line))return `<div dir="${rtl?'rtl':'ltr'}" style="font-weight:bold;color:#b91c1c;margin:8px 0">${safe}</div>`;
  if(trimmed==='AL-NOOR Language Academy'||trimmed==='Aapka Ustaad')return `<div style="color:#103e75;font-weight:bold;font-size:19px">${safe}</div>`;
  return `<div dir="${rtl?'rtl':'ltr'}" style="text-align:${rtl?'right':'left'};margin:5px 0;white-space:pre-wrap">${safe}</div>`;
 }).join('');return `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#17243a;max-width:760px">${html}</div>`;
}
export function gmailUrl(email,body){const url=new URL('https://mail.google.com/mail/');url.search=new URLSearchParams({view:'cm',fs:'1',to:email,su:'Welcome to AL-NOOR Language Academy | Student access',body}).toString();return url.href;}
export function enrollmentTools({edge,status,element}){
 const $=id=>document.getElementById(id);let ready=false,config=null;const list=$('enrollment-courses');
 const update=()=>{const duration=$('enrollment-duration').value;const custom=duration==='custom';$('enrollment-custom').hidden=!custom;const date=$('enrollment-date');date.required=custom;date.disabled=!custom;date.min=madridToday();$('enrollment-preview').textContent='Valid until: '+fmt(custom?date.value:addMonths(madridToday(),Number(duration)));};
 $('enrollment-duration').onchange=update;$('enrollment-date').oninput=update;update();
 function renderCourses(courses){const previous=new Map([...list.querySelectorAll('[data-course]')].map(x=>[x.dataset.course,[...x.querySelectorAll('input')].map(y=>y.checked)]));list.replaceChildren();for(const c of courses){const row=element('div');row.dataset.course=c.id;const saved=previous.get(c.id)||[false,true,true];for(const [i,label] of [c.name,'English','Spanish'].entries()){const wrap=element('label');const input=element('input');input.type='checkbox';input.defaultChecked=i!==0;input.checked=saved[i];wrap.append(input,document.createTextNode(' '+label+' '));row.append(wrap);}list.append(row);}}
 async function load(){ready=false;const data=await edge('learning',{action:'enrollment-settings'});config=data.settings;renderCourses(data.courses);$('enrollment-inactive').checked=config.auto_block;$('enrollment-expiry').checked=config.expiry_enabled;$('enrollment-days').value=config.inactivity_days;ready=true;update();}
 $('enrollment-policy-save').onclick=async()=>{const btn=$('enrollment-policy-save');btn.disabled=true;try{const days=Number($('enrollment-days').value);if(!Number.isInteger(days)||days<1||days>365)throw Error('Choose 1–365 days.');await edge('learning',{action:'enrollment-settings-save',auto_block:$('enrollment-inactive').checked,expiry_enabled:$('enrollment-expiry').checked,inactivity_days:days});await load();status('Learning access policy saved. Existing inactivity suspensions require manual restoration.');}catch(e){status(e.message,true);}finally{btn.disabled=false;}};
 function values(){if(!ready)throw Error('Enrollment settings not loaded. Reload administration.');const d=$('enrollment-duration').value;const courses=[...list.querySelectorAll('[data-course]')].flatMap(x=>{const [selected,en,es]=[...x.querySelectorAll('input')].map(y=>y.checked);if(selected&&!en&&!es)throw Error('Select a language for every selected course.');return selected?[{course:x.dataset.course,en,es}]:[];});return {duration:d==='custom'?d:Number(d),expires_on:d==='custom'?$('enrollment-date').value:undefined,courses};}
 function reset(){ready=false;config=null;list.replaceChildren();$('enrollment-welcome').close();}
 function welcome({name,email,password,data,popup}){
  popup?.close();const dialog=$('enrollment-welcome'),editor=$('enrollment-message'),preview=$('enrollment-rich-preview'),link=$('enrollment-gmail'),feedback=$('enrollment-copy-status');
  editor.value=welcomeMessage(name,email,data);link.href=gmailUrl(email,'');
  const refresh=()=>{preview.innerHTML=formattedWelcome(editor.value);};editor.oninput=refresh;refresh();
  $('enrollment-copy-password').onclick=async()=>{try{await navigator.clipboard.writeText(password);feedback.textContent='Password copied. Paste after Password: in Gmail or share privately.';}catch{feedback.textContent='Clipboard unavailable. Share the original password privately.';}};
  $('enrollment-copy-message').onclick=async()=>{try{await navigator.clipboard.writeText(editor.value);feedback.textContent='Plain message copied. Paste in Gmail.';}catch{editor.select();feedback.textContent='Press Ctrl+C to copy the selected message.';}};
  $('enrollment-copy-rich').onclick=async()=>{try{await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([formattedWelcome(editor.value)],{type:'text/html'}),'text/plain':new Blob([editor.value],{type:'text/plain'})})]);feedback.textContent='Formatted email copied. Open Gmail and paste into the empty body (Ctrl+V).';}catch{feedback.textContent='Rich clipboard unavailable. Select the formatted preview and copy it manually, or use Copy plain text.';}};
  const phone=$('enrollment-whatsapp-phone'),wa=$('enrollment-whatsapp'),image=$('enrollment-image');phone.value='';
  wa.onclick=()=>{try{const url=whatsappUrl(phone.value,editor.value,password);window.open(url,'_blank','noopener,noreferrer');feedback.textContent='WhatsApp opened with the prepared message. Paste the password manually and review before sending.';}catch(e){feedback.textContent=e.message;phone.focus();}};
  image.onclick=async()=>{image.disabled=true;try{const blob=await welcomeImage(editor.value,password);if(!dialog.open)return;downloadWelcomeImage(blob);feedback.textContent='Welcome PNG prepared. Attach it manually in WhatsApp. No password included.';}catch(e){feedback.textContent=e.message||'Image export failed.';}finally{image.disabled=false;}};
  feedback.textContent='Edit any line, then choose Gmail or WhatsApp. No message sent.';
  dialog.onclose=()=>{password='';link.removeAttribute('href');editor.value='';preview.replaceChildren();editor.oninput=null;phone.value='';for(const id of ['enrollment-copy-password','enrollment-copy-message','enrollment-copy-rich','enrollment-whatsapp','enrollment-image'])$(id).onclick=null;};dialog.showModal();
 }
 return {load,reset,values,welcome,update};
}
