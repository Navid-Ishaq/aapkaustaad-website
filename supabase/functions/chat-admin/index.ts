import {context,checked,requireValue,strong,uuid} from '../_shared/security.ts';
import {collectMedia} from '../_shared/media-gc.ts';
const validEmail=(v:unknown):v is string=>typeof v==='string'&&v.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
Deno.serve(async req=>{
 const c=await context(req);if(c.early)return c.early;
 const {admin,user,profile,reply}=c;
 if(profile.role!=='admin'||profile.must_change_password)return reply({error:'Administrator required'},403);
 try{
 const ownerId=checked(await admin.rpc('chat_owner_id'));
 requireValue(uuid(ownerId),'Owner setup is missing. Apply the owner migration first.');
 const isOwner=user.id===ownerId;
 const raw=await req.text();requireValue(new TextEncoder().encode(raw).length<=16000,'Request too large');
 const b=JSON.parse(raw);let result:unknown={ok:true};let target='';
 async function managedTarget(){
  requireValue(uuid(b.user_id),'Invalid account');
  requireValue(b.user_id!==ownerId,'Owner account is protected. Use your own password settings.');
  requireValue(b.user_id!==user.id,'Use your own account settings');
  const p=checked(await admin.from('chat_profiles').select('id,role,active,must_change_password').eq('id',b.user_id).single());
  requireValue(p&&(p.role==='student'||(isOwner&&p.role==='admin')),'Only the owner can manage Teacher Admin accounts');
  return p;
 }
 switch(b.action){
 case 'preview-delete-class':
 case 'delete-class':{
  requireValue(isOwner,'Only the owner can delete a class');requireValue(uuid(b.class_id),'Invalid class');
  if(b.action==='preview-delete-class')return reply({data:checked(await admin.rpc('chat_class_delete_preview',{p_actor:user.id,p_class:b.class_id}))});
  requireValue(b.confirmation==='DELETE'&&typeof b.confirm_name==='string'&&Number.isSafeInteger(b.expected_count)&&b.expected_count>=0&&Number.isSafeInteger(b.expected_members)&&b.expected_members>=0&&Number.isSafeInteger(b.expected_revision)&&b.expected_revision>=0,'Preview and confirm class deletion first');
  const deleted=checked(await admin.rpc('chat_class_delete_execute',{p_actor:user.id,p_class:b.class_id,p_name:b.confirm_name,p_count:b.expected_count,p_members:b.expected_members,p_revision:b.expected_revision}));
  return reply({data:{...deleted as object,storage_cleanup_pending:!await collectMedia(admin)}});
 }
 case 'media-settings':{
  requireValue(uuid(b.class_id)&&['teacher_voice','student_voice','image_upload'].includes(b.setting)&&typeof b.enabled==='boolean','Invalid media setting');
  checked(await admin.from('chat_classes').update({[b.setting]:b.enabled}).eq('id',b.class_id).select('id').single());target=b.class_id+':'+b.setting;break;
 }
 case 'delete-account':{
  await managedTarget();
  requireValue(b.confirmation==='DELETE'&&validEmail(b.confirm_email),'Deletion confirmation required');
  const auth=await admin.auth.admin.getUserById(b.user_id);
  requireValue(!auth.error&&auth.data.user?.email?.toLowerCase()===b.confirm_email.trim().toLowerCase(),'Account email changed. Reload and confirm again.');
  // Stop existing sessions first. On any failure, the account stays revoked for a safe retry.
  checked(await admin.from('chat_profiles').update({active:false}).eq('id',b.user_id));
  const deletion=await admin.auth.admin.deleteUser(b.user_id,false);
  requireValue(!deletion.error,'Account deletion failed. Access stays revoked; retry after checking the migration.');
  target=b.user_id;result={ok:true};break;
 }
 case 'preview-cleanup':
 case 'cleanup-history':{
  requireValue(isOwner,'Only the owner can delete class history');
  requireValue(uuid(b.class_id)&&typeof b.before_date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(b.before_date),'Choose a class and valid cutoff date');
  if(b.action==='preview-cleanup')return reply({data:checked(await admin.rpc('chat_cleanup_preview',{p_actor:user.id,p_class:b.class_id,p_before:b.before_date}))});
  requireValue(b.confirmation==='DELETE'&&Number.isSafeInteger(b.expected_count)&&b.expected_count>=0&&Number.isSafeInteger(b.expected_revision)&&b.expected_revision>=0,'Preview and confirm deletion first');
  result=checked(await admin.rpc('chat_cleanup_execute',{p_actor:user.id,p_class:b.class_id,p_before:b.before_date,p_expected_count:b.expected_count,p_expected_revision:b.expected_revision}));
  // Cleanup audit is committed atomically inside the SQL function.
  return reply({data:{...result as object,storage_cleanup_pending:!await collectMedia(admin)}});
 }
 case 'list-accounts':{
  requireValue(b.kind==='students'||(b.kind==='teachers'&&isOwner),'Account list denied');
  const page=b.page??0;requireValue(Number.isInteger(page)&&page>=0&&page<=100000,'Invalid page');
  const people=checked(await admin.from('chat_profiles').select('id,display_name,role,active,must_change_password,created_at')
   .eq('role',b.kind==='teachers'?'admin':'student').order('created_at').order('id').range(page*25,page*25+25));
  requireValue(people,'Account list unavailable');
  const visible=people.slice(0,25);
  const accounts=await Promise.all(visible.map(async p=>{
   const auth=await admin.auth.admin.getUserById(p.id);requireValue(!auth.error&&auth.data.user,'Could not load account email');
   return {...p,email:auth.data.user.email||'',is_owner:p.id===ownerId};
  }));
  const memberships=visible.length?checked(await admin.from('chat_memberships').select('*').in('user_id',visible.map(p=>p.id))):[];
  return reply({data:{is_owner:isOwner,accounts,memberships,has_more:people.length>25}});
 }
 case 'create-class':
 case 'rename-class':{
  requireValue(typeof b.name==='string'&&b.name.trim().length>0&&b.name.trim().length<=100,'Class name must contain 1â€“100 characters');
  if(b.action==='create-class')result=checked(await admin.from('chat_classes').insert({name:b.name.trim()}).select().single());
  else{requireValue(uuid(b.class_id),'Invalid class');result=checked(await admin.from('chat_classes').update({name:b.name.trim()}).eq('id',b.class_id).select().single());}
  target=b.class_id||'new';break;
 }
 case 'archive-class':
  requireValue(uuid(b.class_id)&&typeof b.archived==='boolean','Invalid class');
  checked(await admin.from('chat_classes').update({archived:b.archived}).eq('id',b.class_id));target=b.class_id;break;
 case 'create-student':
 case 'create-teacher':{
  const teacher=b.action==='create-teacher';requireValue(!teacher||isOwner,'Only the owner can create Teacher Admins');
  requireValue(typeof b.name==='string'&&b.name.trim().length>0&&b.name.trim().length<=80,'Name must contain 1â€“80 characters');
  requireValue(validEmail(b.email),'Valid email required');requireValue(strong(b.password),'Use 8â€“128 characters with uppercase, lowercase, number and symbol');
  let ids:string[]=[];
  if(!teacher){
   requireValue(Array.isArray(b.class_ids)&&b.class_ids.length>0&&b.class_ids.length<=100&&b.class_ids.every(uuid),'Choose at least one class');
   ids=[...new Set<string>(b.class_ids)];
   const classes=checked(await admin.from('chat_classes').select('id').in('id',ids).eq('archived',false));
   requireValue(classes&&classes.length===ids.length,'Some classes are unavailable');
  }
  const {data,error}=await admin.auth.admin.createUser({email:b.email.trim(),password:b.password,email_confirm:true});
  requireValue(!error&&data.user,'Account could not be created. Check the email/password; an account may already exist.');
  target=data.user.id;
  try{
   checked(await admin.from('chat_profiles').insert({id:target,display_name:b.name.trim(),role:teacher?'admin':'student',must_change_password:false}));
   if(ids.length)checked(await admin.from('chat_memberships').insert(ids.map(class_id=>({class_id,user_id:target}))));
  }catch(error){await admin.from('chat_profiles').update({active:false}).eq('id',target);await admin.auth.admin.deleteUser(target);throw error;}
  result={id:target};break;
 }
 case 'assign':
 case 'remove':{
  const p=await managedTarget();requireValue(p.role==='student'&&uuid(b.class_id),'Invalid student or class');
  if(b.action==='assign'){
   const cl=checked(await admin.from('chat_classes').select('archived').eq('id',b.class_id).single());requireValue(cl&&!cl.archived,'Class is archived');
   checked(await admin.from('chat_memberships').upsert({class_id:b.class_id,user_id:b.user_id}));
  }else checked(await admin.from('chat_memberships').delete().eq('class_id',b.class_id).eq('user_id',b.user_id));
  target=b.user_id+':'+b.class_id;break;
 }
 case 'revoke':{
  await managedTarget();
  checked(await admin.from('chat_profiles').update({active:false}).eq('id',b.user_id));
  const ban=await admin.auth.admin.updateUserById(b.user_id,{ban_duration:'876000h'});
  target=b.user_id;result={ok:true,auth_ban_applied:!ban.error};break;
 }
 case 'restore':{
  await managedTarget();
  const unban=await admin.auth.admin.updateUserById(b.user_id,{ban_duration:'none'});requireValue(!unban.error,'Login could not be restored. Access remains revoked.');
  checked(await admin.from('chat_profiles').update({active:true}).eq('id',b.user_id));target=b.user_id;break;
 }
 case 'rename-account':{
  await managedTarget();requireValue(typeof b.name==='string'&&b.name.trim().length>0&&b.name.trim().length<=80,'Name must contain 1â€“80 characters');
  checked(await admin.from('chat_profiles').update({display_name:b.name.trim()}).eq('id',b.user_id));target=b.user_id;break;
 }
 case 'change-email':{
  await managedTarget();requireValue(validEmail(b.email),'Valid email required');
  const updated=await admin.auth.admin.updateUserById(b.user_id,{email:b.email.trim(),email_confirm:true});
  requireValue(!updated.error,'Email could not be changed. It may already be in use.');target=b.user_id;break;
 }
 case 'reset-password':{
  await managedTarget();requireValue(strong(b.password),'Use 8â€“128 characters with uppercase, lowercase, number and symbol');
  const updated=await admin.auth.admin.updateUserById(b.user_id,{password:b.password});
  requireValue(!updated.error,'Password reset failed. Please try again; the existing password remains unchanged.');
  checked(await admin.from('chat_profiles').update({must_change_password:false}).eq('id',b.user_id));target=b.user_id;break;
 }
 default:return reply({error:'Unknown action'},400);
 }
 const audit=await admin.from('chat_admin_audit').insert({actor_id:user.id,action:b.action,target});
 return reply({data:result,audit_recorded:!audit.error});
 }catch(e){return reply({error:e instanceof Error?e.message:'Operation failed'},400);}
});
