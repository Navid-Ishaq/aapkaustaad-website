import {context,checked,requireValue,uuid} from '../_shared/security.ts';
Deno.serve(async req=>{
 const c=await context(req,65536);if(c.early)return c.early;
 const {admin,user,profile,reply}=c; const teacher=profile.role==='admin';
 if(profile.must_change_password)return reply({error:'Change password first'},403);
 try{
 const raw=await req.text();requireValue(raw.length<=65536,'Request too large');const b=JSON.parse(raw);
 const table=(n:string)=>admin.from('learn_'+n);
 const id=(v:unknown)=>{requireValue(uuid(v),'Invalid ID');return v as string;};
 const get=async(n:string,v:unknown)=>checked(await table(n).select('*').eq('id',id(v)).single());
 const owner=async()=>requireValue(teacher&&checked(await admin.rpc('chat_owner_id'))===user.id,'Owner required');
 const text=(v:unknown)=>{requireValue(typeof v==='string'&&v.trim().length>0&&v.length<=150,'Invalid text');return (v as string).trim();};
 const access=async(cid:string)=>{
  const course=await get('courses',cid);if(teacher)return {en:true,es:true};requireValue(course.active,'Course unavailable');
  const direct=checked(await table('access').select('*').eq('user_id',user.id).eq('course_id',cid).maybeSingle());
  if(direct){requireValue(direct.enabled&&(direct.en||direct.es),'Course access blocked');return direct;}
  const memberships=checked(await admin.from('chat_memberships').select('class_id,chat_classes!inner(archived)').eq('user_id',user.id).eq('chat_classes.archived',false));
  requireValue(memberships.length>0,'Course not assigned');
  const groups=checked(await table('groups').select('en,es').eq('course_id',cid).in('class_id',memberships.map((m:any)=>m.class_id)));
  const en=groups.some((g:any)=>g.en),es=groups.some((g:any)=>g.es);requireValue(en||es,'Course not assigned');return {en,es};
 };
 const test=async(tid:unknown)=>{const t=await get('tests',tid);const s=await get('sections',t.section_id);const p=await access(s.course_id);requireValue(teacher||t.published,'Test unavailable');return {t,s,p};};
 const images=async(a:string[]=[])=>Promise.all(a.map(async x=>{if(x.startsWith('https://'))return x;const r=checked(await admin.storage.from('alnoor-learning').createSignedUrl(x,3600));return r.signedUrl;}));
 const languages=(qs:any[],p:any)=>({es:!!p.es&&qs.every(q=>!!q.es?.trim()&&q.opts.every((o:any)=>!!o[0]?.trim())),en:!!p.en&&qs.every(q=>!!q.en?.trim()&&q.opts.every((o:any)=>!!o[1]?.trim()))});
 const reference=async(q:any)=>({refs:await images(q.refs),feedback_text:typeof q.feedback_text==='string'?q.feedback_text:''});
 const clean=async(q:any,p:any,reveal=false,showReference=reveal)=>({es:p.es?q.es:'',en:p.en?q.en:'',opts:q.opts.map((o:any)=>[p.es?o[0]:'',p.en?o[1]:'']),imgs:await images(q.imgs),...(reveal?{correct:q.correct}:{}),...(showReference?await reference(q):{})});
 const touch=async(cid:string,p:any)=>{if(!teacher&&p.user_id)checked(await table('access').update({last_activity:new Date().toISOString()}).eq('user_id',user.id).eq('course_id',cid));};
 if(b.action==='home'){
  const all=checked(await table('courses').select('*').order('name'));const courses=[];for(const x of all){try{await access(x.id);courses.push(x);}catch{}}
  return reply({teacher,name:profile.display_name,courses});
 }
 if(b.action==='library'){
  const cid=id(b.course);const p=await access(cid);const sections=checked(await table('sections').select('*').eq('course_id',cid).order('name'));let tests:any[]=[];
  if(sections.length){let query=table('tests').select('id,section_id,number,name,minutes,max_errors,published').in('section_id',sections.map((s:any)=>s.id)).order('number');if(!teacher)query=query.eq('published',true);tests=checked(await query);}
  const statuses:any={};if(tests.length){const rows=checked(await table('attempts').select('test_id,passed,finished_at').eq('user_id',user.id).in('test_id',tests.map(t=>t.id)).not('finished_at','is',null).order('finished_at',{ascending:false}).limit(1000));for(const r of rows)if(!(r.test_id in statuses))statuses[r.test_id]=r.passed;}
  return reply({sections,tests,statuses,permissions:{en:p.en,es:p.es}});
 }
 if(b.action==='start'){
  const {t,s,p:allowed}=await test(b.test);const p=languages(t.questions,allowed);requireValue(p.es||p.en,'No permitted language for this test');requireValue(['exam','practice'].includes(b.mode),'Invalid mode');await touch(s.course_id,p);
  const a=checked(await table('attempts').insert({user_id:user.id,test_id:t.id,mode:b.mode,deadline:b.mode==='exam'&&b.timed===true?new Date(Date.now()+t.minutes*60000).toISOString():null}).select('id,started_at,deadline').single());
  return reply({attempt:a,questions:t.questions.map((q:any)=>({es:p.es?q.es:'',en:p.en?q.en:'',opts:q.opts.map((o:any)=>[p.es?o[0]:'',p.en?o[1]:'']),imgs:[]})),minutes:t.minutes,max_errors:t.max_errors,permissions:p});
 }
 if(['answer','finish','review','question'].includes(b.action)){
  const a=await get('attempts',b.attempt);requireValue(a.user_id===user.id,'Attempt denied');const {t,s,p:allowed}=await test(a.test_id);const q=t.questions;const p=languages(q,allowed);requireValue(p.es||p.en,'No permitted language for this test');
  if(b.action==='question'){const i=b.index;requireValue(Number.isInteger(i)&&i>=0&&i<q.length,'Invalid question');return reply({question:await clean(q[i],p,!!a.finished_at||a.mode==='practice'&&a.answers[i]!==undefined,!!a.finished_at||a.mode==='practice')});}
  if(b.action==='review'){requireValue(a.finished_at,'Finish first');return reply({questions:await Promise.all(q.map((x:any)=>clean(x,p,true))),result:a});}
  requireValue(!a.finished_at,'Attempt already finished');
  if(b.action==='answer'){
   requireValue(a.mode==='practice'||!a.deadline||Date.now()<=Date.parse(a.deadline),'Time expired');const i=b.index,v=b.value;requireValue(Number.isInteger(i)&&i>=0&&i<q.length&&Number.isInteger(v)&&v>=0&&v<q[i].opts.length,'Invalid answer');
   requireValue(a.mode!=='practice'||a.answers[i]===undefined,'Practice answer already recorded');
   checked(await table('attempts').update({answers:{...a.answers,[i]:v}}).eq('id',a.id).eq('answers',JSON.stringify(a.answers)).is('finished_at',null).select('id').single());await touch(s.course_id,p);
   return reply(a.mode==='practice'?{correct:q[i].correct,...await reference(q[i])}:{ok:true});
  }
  const score=q.filter((x:any,i:number)=>a.answers[i]===x.correct).length;const now=Date.now();const result={score,total:q.length,passed:q.length-score<=t.max_errors,seconds:Math.max(0,Math.floor((Math.min(now,a.deadline?Date.parse(a.deadline):now)-Date.parse(a.started_at))/1000)),finished_at:new Date(now).toISOString()};
  checked(await table('attempts').update(result).eq('id',a.id).eq('answers',JSON.stringify(a.answers)).is('finished_at',null).select('id').single());return reply({result:{...a,...result},questions:await Promise.all(q.map((x:any)=>clean(x,p,true)))});
 }
 requireValue(teacher,'Administrator required');
 if(b.action==='student-courses'||b.action==='student-courses-save'){
  const sid=id(b.student);const student=checked(await admin.from('chat_profiles').select('role').eq('id',sid).single());requireValue(student.role==='student','Student required');
  const courses=checked(await table('courses').select('id,name,code,active').order('name'));
  const direct=checked(await table('access').select('*').eq('user_id',sid));
  const memberships=checked(await admin.from('chat_memberships').select('class_id,chat_classes!inner(archived)').eq('user_id',sid).eq('chat_classes.archived',false));
  const groups=memberships.length?checked(await table('groups').select('course_id,en,es').in('class_id',memberships.map((m:any)=>m.class_id))):[];
  const snapshot=()=>courses.map((course:any)=>{const a=direct.find((x:any)=>x.course_id===course.id);const g=groups.filter((x:any)=>x.course_id===course.id);const en=a?!!a.en:g.some((x:any)=>x.en),es=a?!!a.es:g.some((x:any)=>x.es);return {...course,enabled:!!course.active&&(a?!!a.enabled:true)&&(en||es),en,es,source:a?'Individual':(en||es?'Group':'Not assigned')};});
  if(b.action==='student-courses')return reply({courses:snapshot()});
  requireValue(Array.isArray(b.changes)&&b.changes.length>0&&b.changes.length<=100,'Invalid course changes');
  const seen=new Set<string>();const rows=b.changes.map((change:any)=>{const cid=id(change.course);const course=courses.find((x:any)=>x.id===cid);requireValue(!!course&&!seen.has(cid),'Invalid or duplicate course');seen.add(cid);requireValue(typeof change.enabled==='boolean'&&typeof change.en==='boolean'&&typeof change.es==='boolean','Invalid permissions');requireValue(!change.enabled||(course.active&&(change.en||change.es)),'Active course and language required');const old=direct.find((x:any)=>x.course_id===cid);return {user_id:sid,course_id:cid,enabled:change.enabled,en:change.en,es:change.es,last_activity:old?.last_activity??new Date().toISOString()};});
  checked(await table('access').upsert(rows,{onConflict:'user_id,course_id'}));return reply({ok:true});
 }
 if(b.action==='admin'){
  const page=Math.max(0,Math.min(10000,Number(b.page)||0));return reply({courses:checked(await table('courses').select('*').order('name')),sections:checked(await table('sections').select('*')),students:checked(await admin.from('chat_profiles').select('id,display_name,active').eq('role','student').order('display_name').range(page*25,page*25+24)),classes:checked(await admin.from('chat_classes').select('id,name,archived').eq('archived',false)),access:checked(await table('access').select('*').range(0,999)),groups:checked(await table('groups').select('*')),settings:checked(await table('settings').select('*').single()),owner:checked(await admin.rpc('chat_owner_id'))===user.id});
 }
 if(b.action==='course-create')checked(await table('courses').insert({name:text(b.name),code:text(b.code).toUpperCase()}));
 else if(b.action==='course-edit')checked(await table('courses').update({name:text(b.name),active:b.active===true}).eq('id',id(b.course)));
 else if(b.action==='section-create')checked(await table('sections').insert({course_id:id(b.course),name:text(b.name)}));
 else if(b.action==='access'){
  const student=checked(await admin.from('chat_profiles').select('role').eq('id',id(b.student)).single());requireValue(student.role==='student','Student required');
  checked(await table('access').upsert({user_id:b.student,course_id:id(b.course),enabled:b.enabled===true,en:b.en===true,es:b.es===true,last_activity:new Date().toISOString()}));
 }else if(b.action==='group'){
  if(b.enabled===false)checked(await table('groups').delete().eq('class_id',id(b.class)).eq('course_id',id(b.course)));else checked(await table('groups').upsert({class_id:id(b.class),course_id:id(b.course),en:b.en===true,es:b.es===true}));
 }else if(b.action==='test-rename')checked(await table('tests').update({name:text(b.name)}).eq('id',id(b.test)));
 else if(b.action==='publish')checked(await table('tests').update({published:b.published===true}).eq('id',id(b.test)));
 else if(['cleanup','cleanup-preview'].includes(b.action)){
  await owner();requireValue(typeof b.before==='string'&&Number.isFinite(Date.parse(b.before)),'Invalid cutoff');let query=b.action==='cleanup-preview'?table('attempts').select('id',{count:'exact',head:true}):table('attempts').delete({count:'exact'});query=query.lt('finished_at',b.before);if(b.student)query=query.eq('user_id',id(b.student));if(b.course){const sections=checked(await table('sections').select('id').eq('course_id',id(b.course)));const ids=sections.length?checked(await table('tests').select('id').in('section_id',sections.map((x:any)=>x.id))):[];if(!ids.length)return reply({deleted:0});query=query.in('test_id',ids.map((x:any)=>x.id));}if(b.action==='cleanup'&&b.confirm!=='DELETE')return reply({error:'Type DELETE to confirm'},400);const r=await query;if(r.error)throw r.error;return reply({deleted:r.count});
 }else if(b.action==='history'){
  let query=table('attempts').select('id,user_id,test_id,score,total,passed,seconds,finished_at').not('finished_at','is',null).order('finished_at',{ascending:false}).limit(1000);if(b.student)query=query.eq('user_id',id(b.student));if(b.course){const sections=checked(await table('sections').select('id').eq('course_id',id(b.course)));const ids=sections.length?checked(await table('tests').select('id').in('section_id',sections.map((x:any)=>x.id))):[];if(!ids.length)return reply({rows:[]});query=query.in('test_id',ids.map((x:any)=>x.id));}return reply({rows:checked(await query)});
 }else throw new Error('Unknown action');
 return reply({ok:true});
 }catch(e){console.error(String(e));return reply({error:'Operation denied or failed. Check permissions and inputs.'},400);}
});
