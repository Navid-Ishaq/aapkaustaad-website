// AL-NOOR question snapshot: browser-only JPEG, no permanent image upload.
const colors={navy:'#143d6c',blue:'#28609b',ink:'#183047',gold:'#e9bf58',green:'#146338',line:'#cbd9e6'};
function imageKey(src){try{const u=new URL(src);if(u.pathname.includes('/storage/v1/object/sign/'))return u.origin+u.pathname;return u.href;}catch{return src;}}
export function sameVisibleQuestion(visible,fresh,{es,en,edited=false}){
 if(!visible||!fresh||!Array.isArray(visible.opts)||!Array.isArray(fresh.opts)||visible.opts.length!==fresh.opts.length)return false;
 if(es&&(visible.es!==fresh.es||visible.opts.some((o,i)=>o[0]!==fresh.opts[i][0])))return false;
 if(en&&(visible.en!==fresh.en||visible.opts.some((o,i)=>o[1]!==fresh.opts[i][1])))return false;
 if(edited&&(visible.correct!==fresh.correct||JSON.stringify((visible.imgs||[]).map(imageKey))!==JSON.stringify((fresh.imgs||[]).map(imageKey))))return false;
 return true;
}
export function wrapText(ctx,value,width){
 const out=[];
 for(const paragraph of String(value??'').split(/\r?\n/)){
  let line='';
  for(const word of paragraph.split(/\s+/).filter(Boolean)){
   const candidate=line?line+' '+word:word;
   if(ctx.measureText(candidate).width<=width){line=candidate;continue;}
   if(line){out.push(line);line='';}
   for(const ch of word){if(line&&ctx.measureText(line+ch).width>width){out.push(line);line='';}line+=ch;}
  }
  out.push(line);
 }
 return out;
}
export function snapshotFilename(test,index){return `AL-NOOR-Test-${String(test.number??test.name??'Question').replace(/[^a-z0-9_-]+/gi,'-')}-Q${String(index+1).padStart(2,'0')}.jpg`;}
async function decode(src){const image=new Image();await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{image.src='';reject(Error('Image decoding timed out'));},15000);image.onload=()=>{clearTimeout(timer);resolve();};image.onerror=()=>{clearTimeout(timer);reject(Error('Image cannot be decoded'));};image.src=src;});return image;}
async function loadImage(src){
 if(/^data:image\/(jpeg|png|webp);base64,/i.test(src))return decode(src);
 const response=await fetch(src,{mode:'cors',credentials:'omit',signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Image HTTP '+response.status);
 const blob=await response.blob();if(!blob.size||blob.size>10*1024*1024)throw Error('Invalid image size');const url=URL.createObjectURL(blob);try{return await decode(url);}finally{URL.revokeObjectURL(url);}
}
export async function downloadQuestionJpg(record,settings,fallback,stillAllowed=()=>true){
 const {question:q,test}=record,{index,es,en,side}=settings;
 if(!es&&!en)throw Error('Select a language');if(!Number.isInteger(q.correct)||q.correct<0||q.correct>=q.opts.length)throw Error('Correct answer unavailable');
 const logo=await loadImage(new URL('../logo.png',import.meta.url).href);
 const images=[];for(const [j,src] of (q.imgs||[]).entries()){
  try{images.push(await loadImage(src));}catch{try{images.push(await loadImage(await fallback(j)));}catch(e){throw Error(`Question image ${j+1} unavailable: ${e.message}`);}}
 }
 if(!stillAllowed())return;
 const W=1440,M=48,G=32,bodyW=W-M*2,sideBySide=side&&images.length>0,leftW=sideBySide?Math.floor(bodyW*.63):bodyW,rightW=bodyW-leftW-G;
 const canvas=document.createElement('canvas');canvas.width=W;const ctx=canvas.getContext('2d');
 const size=Math.max(26,Math.min(52,Math.round((Number(settings.fontSize)||22)*1.55))),lineHeight=Math.ceil(size*1.36);
 const commands=[];const rect=(x,y,w,h,fill,stroke)=>commands.push(c=>{c.fillStyle=fill;c.fillRect(x,y,w,h);if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.strokeRect(x+1,y+1,w-2,h-2);}});
 const text=(value,x,y,font,color,maxW,lh=lineHeight)=>{ctx.font=font;const lines=wrapText(ctx,value,maxW);commands.push(c=>{c.font=font;c.fillStyle=color;c.textBaseline='top';for(const [i,line] of lines.entries())c.fillText(line,x,y+i*lh);});return y+lines.length*lh;};
 const fit=(im,x,y,w,h)=>{const ratio=Math.min(w/im.naturalWidth,h/im.naturalHeight);const iw=im.naturalWidth*ratio,ih=im.naturalHeight*ratio;commands.push(c=>c.drawImage(im,x+(w-iw)/2,y+(h-ih)/2,iw,ih));};
 rect(0,0,W,148,colors.navy);rect(0,148,W,5,colors.gold);rect(M,24,100,100,'#fff');fit(logo,M+6,30,88,88);
 text('AL-NOOR Language Academy',M+126,28,'bold 42px Arial', '#fff',bodyW-126,50);
 text('Aapka Ustaad · Learning & Exams',M+126,84,'28px Arial','#e0edff',bodyW-126,34);
 let y=text(`${test.name} · QUESTION ${index+1} / ${record.total}`,M,184,'bold 25px Arial',colors.blue,bodyW,33)+24;
 const startY=y;const headingFont=`bold ${size+4}px Arial`,optionFont=`${size}px Arial`;
 if(es&&q.es)y=text(q.es,M,y,headingFont,colors.ink,leftW,lineHeight+5)+8;
 if(en&&q.en)y=text(q.en,M,y,headingFont,colors.blue,leftW,lineHeight+5)+8;
 y+=16;
 function drawImages(x,top,w){for(const im of images){const h=Math.min(740,Math.round(w*im.naturalHeight/im.naturalWidth));rect(x,top,w,h,'#fff',colors.line);fit(im,x+2,top+2,w-4,h-4);top+=h+18;}return top;}
 if(!sideBySide&&images.length)y=drawImages(M,y,leftW)+8;
 for(const [j,o] of q.opts.entries()){
  const correct=j===q.correct,pad=22,innerW=leftW-pad*2,letter=String.fromCharCode(65+j)+' — ';
  const entries=[...(es&&o[0]?[[letter+o[0],correct?colors.green:colors.ink]]:[]),...(en&&o[1]?[[letter+o[1],correct?colors.green:colors.blue]]:[])];
  ctx.font=optionFont;const h=pad*2+entries.reduce((sum,[v])=>sum+wrapText(ctx,v,innerW).length*lineHeight+6,0)+(correct?38:0);
  rect(M,y,leftW,h,correct?'#e4f5e9':'#f7faff',correct?'#258a50':colors.line);let ty=y+pad;
  if(correct)ty=text(es&&en?'✓ Correct answer / Respuesta correcta':es?'✓ Respuesta correcta':'✓ Correct answer',M+pad,ty,'bold 23px Arial',colors.green,innerW,30)+8;
  for(const [v,col] of entries)ty=text(v,M+pad,ty,optionFont,col,innerW)+6;
  y+=h+14;
 }
 if(sideBySide)y=Math.max(y,drawImages(M+leftW+G,startY,rightW));
 const bottom=y+24,H=bottom+100;if(H>16000)throw Error('Question exceeds the safe JPG height');
 rect(M,bottom,bodyW,3,colors.gold);text('AL-NOOR Language Academy · www.aapkaustaad.com',M,bottom+24,'bold 25px Arial',colors.navy,bodyW,32);
 canvas.height=H;ctx.fillStyle='#ffffff';ctx.fillRect(0,0,W,H);for(const draw of commands)draw(ctx);
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.94));if(!blob)throw Error('Browser could not create JPG');if(!stillAllowed())return;
 const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=snapshotFilename(test,index);document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
