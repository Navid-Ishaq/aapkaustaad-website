export async function collectMedia(admin:any){
 try{const {data,error}=await admin.from('chat_media_gc').select('path').lte('not_before',new Date().toISOString()).limit(100);if(error)return false;if(!data?.length)return true;const paths=data.map((x:any)=>x.path);const removal=await admin.storage.from('alnoor-chat-media').remove(paths);if(removal.error)return false;const done=await admin.from('chat_media_gc').delete().in('path',paths);return !done.error&&data.length<100;}catch{return false;}
}
