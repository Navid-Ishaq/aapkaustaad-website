// Local delivery helpers. No API, automatic sending, or persistent phone storage.
export function normalizePhone(value){
 const raw=String(value).trim();
 if(!/^\+?[0-9\s().-]+$/.test(raw))throw Error('Enter the student’s international number, e.g. +34 600 000 000.');
 let digits=raw.replace(/\D/g,'');if(digits.startsWith('00'))digits=digits.slice(2);
 if(!/^[1-9]\d{7,14}$/.test(digits))throw Error('Include the country code and a valid international number.');return digits;
}
export function safeDeliveryText(text,password=''){
 let value=String(text).replace(/^\s*Password\s*:[^\r\n]*/gim,'Password: ');
 if(password)value=value.split(password).join('');return value;
}
export function whatsappText(text,password=''){
 return safeDeliveryText(text,password).split(/\r?\n/).map(line=>{
 const t=line.trim();if(['AL-NOOR Language Academy','Your Journey Towards Success','Your login details','Your Road to Success','English','اردو','Español','Aapka Ustaad'].includes(t)||/^(Access valid until:|Important:|Importante:|اہم:)/.test(t))return '*'+t.replace(/\*/g,'')+'*';
 return line.replace(/^(Email|Password|Courses|Enrollment date):/,'*$1:*');
 }).join('\n');
}
export function whatsappUrl(phone,text,password=''){
 const url=new URL('https://wa.me/'+normalizePhone(phone));url.searchParams.set('text',whatsappText(text,password));return url.href;
}
export function wrapLine(ctx,line,maxWidth){
 const result=[];let current='';
 for(const word of line.split(/\s+/)){
  if(current&&ctx.measureText(current+' '+word).width>maxWidth){result.push(current);current='';}
  if(ctx.measureText(word).width>maxWidth){for(const char of word){if(current&&ctx.measureText(current+char).width>maxWidth){result.push(current);current='';}current+=char;}}
  else current+=(current?' ':'')+word;
 }if(current||!result.length)result.push(current);return result;
}
export async function welcomeImage(text,password=''){
 // Export the edited welcome as a password-free PNG, rendered by the local browser.
 const clean=safeDeliveryText(text,password).replace(/^Password\s*:.*(?:\r?\n|$)/gim,'');
 if(document.fonts?.ready)await document.fonts.ready;
 const canvas=document.createElement('canvas'),width=1080,pad=56;canvas.width=width;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Image rendering unavailable.');
 const rows=[];let y=155,rtl=false;
 for(const line of clean.split(/\r?\n/)){
  const t=line.trim();if(!t){y+=18;continue;}
  if(t==='اردو')rtl=true;else if(t==='English'||t==='Español'||t.startsWith('Kind regards'))rtl=false;
  if(t==='AL-NOOR Language Academy'&&rows.length===0&&y===155)continue;
  if(t==='Your Journey Towards Success'&&rows.length===0&&y===155)continue;
  const heading=['Your login details','Your Road to Success','English','اردو','Español'].includes(t),expiry=t.startsWith('Access valid until:'),warning=/^(Important:|Importante:|اہم:)/.test(t);
  const font=`${heading||expiry||warning?'bold ':''}${heading?32:expiry?38:28}px Arial, sans-serif`;
  ctx.font=font;const wrapped=wrapLine(ctx,t,width-pad*2);const lineHeight=heading?45:expiry?53:43;
  if(heading)y+=15;
  for(const value of wrapped){rows.push({value,y,font,rtl,expiry,heading,color:expiry||warning?'#b91c1c':heading?'#205ba5':'#17243a'});y+=lineHeight;}
  if(heading)y+=9;
 }
 if(y>12000)throw Error('Message too long for one image. Shorten the message or use WhatsApp text.');
 canvas.height=y+55;ctx.fillStyle='#fff';ctx.fillRect(0,0,width,canvas.height);ctx.fillStyle='#103e75';ctx.fillRect(0,0,width,126);ctx.fillStyle='#e9be53';ctx.fillRect(0,126,width,5);
 ctx.direction='ltr';ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='bold 42px Arial, sans-serif';ctx.fillText('AL-NOOR Language Academy',width/2,55);ctx.font='28px Arial, sans-serif';ctx.fillText('Your Journey Towards Success',width/2,98);
 for(const row of rows){ctx.font=row.font;ctx.fillStyle=row.color;ctx.direction=row.rtl?'rtl':'ltr';ctx.textAlign=row.expiry?'center':row.rtl?'right':'left';ctx.textBaseline='top';ctx.fillText(row.value,row.expiry?width/2:row.rtl?width-pad:pad,row.y);}
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('Could not create PNG.');return blob;
}
export function downloadWelcomeImage(blob){const href=URL.createObjectURL(blob);const a=document.createElement('a');a.href=href;a.download='AL-NOOR-Welcome.png';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),30000);}
