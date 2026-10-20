import {context,checked,requireValue,uuid} from '../_shared/security.ts';
import {validateWav,validateBatch,MAX_IMAGE_BYTES} from '../_shared/media-validation.ts';
import {collectMedia} from '../_shared/media-gc.ts';
import jpeg from 'npm:jpeg-js@0.4.4';
import {Buffer} from 'node:buffer';
Deno.serve(async req=>{
 const c=await context(req,11500000);if(c.early)return c.early;const {admin,profile,user,reply}=c;
 if(profile.must_change_password)return reply({error:'Change your initial password first'},403);
 const paths:string[]=[];
 try{
 if(req.headers.get('content-type')?.includes('application/json')){
 const b=await req.json();requireValue(b.action==='collect'&&profile.role==='admin','Administrator required');const owner=checked(await admin.rpc('chat_owner_id'));requireValue(owner===user.id,'Owner required');return reply({ok:await collectMedia(admin)});
 }
 // Bound streaming body even when Content-Length is omitted.
 const reader=req.body?.getReader();requireValue(reader,'Upload body required');const chunks:Uint8Array[]=[];let total=0;while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>11500000){await reader.cancel();throw Error('Upload too large.');}chunks.push(value);}
 const form=await new Response(new Blob(chunks),{headers:{'Content-Type':req.headers.get('content-type')||''}}).formData();
 const classId=form.get('class_id');requireValue(uuid(classId),'Invalid class');const kind=String(form.get('kind'));const files=form.getAll('files');validateBatch(kind,files.length);
 const cl=checked(await admin.from('chat_classes').select('*').eq('id',classId).single());requireValue(!cl.archived,'Class is archived');if(profile.role!=='admin'){const m=await admin.from('chat_memberships').select('user_id').eq('user_id',user.id).eq('class_id',classId).single();requireValue(!m.error&&m.data,'Class access denied');}
 requireValue(kind==='image'?cl.image_upload:profile.role==='admin'?cl.teacher_voice:cl.student_voice,'This media option is disabled for your class.');
 const attachments=[];
 for(const file of files){requireValue(file instanceof File,'File required');let bytes=new Uint8Array(await file.arrayBuffer());let meta:any={kind};
 if(kind==='voice'){meta.duration=validateWav(bytes);meta.mime='audio/wav';}else{
 requireValue(file.type==='image/jpeg'&&bytes.length<=MAX_IMAGE_BYTES&&bytes[0]===255&&bytes[1]===216,'Please select a supported image.');
 const decoded=jpeg.decode(Buffer.from(bytes),{useTArray:true,maxResolutionInMP:12,maxMemoryUsageInMB:96});requireValue(decoded.width<=2560&&decoded.height<=2560,'Image dimensions too large');bytes=new Uint8Array(jpeg.encode(decoded,88).data);requireValue(bytes.length<=MAX_IMAGE_BYTES,'Image is too large after optimization');meta={...meta,mime:'image/jpeg',width:decoded.width,height:decoded.height};
 }
 const path=classId+'/'+user.id+'/'+crypto.randomUUID()+(kind==='voice'?'.wav':'.jpg');paths.push(path);
 checked(await admin.from('chat_media_gc').insert({path,not_before:new Date(Date.now()+3600000).toISOString()}));
 const upload=await admin.storage.from('alnoor-chat-media').upload(path,bytes,{contentType:meta.mime,upsert:false});requireValue(!upload.error,'Upload failed. Please try again.');attachments.push({...meta,path,size:bytes.length});
 }
 const body=String(form.get('body')||'');const replyTo=form.get('reply_to');requireValue(!replyTo||/^\d+$/.test(String(replyTo)),'Invalid reply');
 const message=checked(await admin.rpc('chat_publish_media',{p_actor:user.id,p_class:classId,p_body:body,p_files:attachments,p_reply:replyTo?Number(replyTo):null,p_announcement:form.get('announcement')==='true'}));
 await collectMedia(admin);
 return reply({data:message});
 }catch(e){if(paths.length){try{await admin.storage.from('alnoor-chat-media').remove(paths);}catch{}}return reply({error:e instanceof Error?e.message:'Media could not be sent'},400);}
});
