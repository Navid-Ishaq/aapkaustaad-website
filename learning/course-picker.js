// Course permissions use the authenticated Learning function, never a browser service key.
export function coursePicker(p,{edge,status,element}){
 const trigger=element('button','Manage courses ▾','sc-course-trigger');trigger.type='button';trigger.setAttribute('aria-label','Courses for '+p.display_name);
 trigger.onclick=async()=>{
  if(trigger.disabled)return;trigger.disabled=true;
  let dialog;
  try{
   const data=await edge('learning',{action:'student-courses',student:p.id});
   if(!trigger.isConnected){trigger.disabled=false;return;}
   const courses=data.courses;const originals=new Map(courses.map(c=>[c.id,{enabled:c.enabled,en:c.en,es:c.es,expires_on:c.expires_on??null}]));
   const state=new Map(courses.map(c=>[c.id,{...originals.get(c.id)}]));
   dialog=element('dialog',undefined,'sc-course-dialog');dialog.setAttribute('aria-label','Course permissions for '+p.display_name);
   const heading=element('h2','Courses · '+p.display_name);const intro=element('p','Assign entire courses, including future published tests.');
   const notice=element('p',p.active?'Choose course access and languages.':'Master account revoked: course assignments will not restore login.','sc-course-note');
   const list=element('div',undefined,'sc-course-list');const error=element('p','','sc-course-error');error.setAttribute('role','alert');
   const controls=[];
   const policy=data.policy;const policyText=element('p',policy.suspended_at?'Learning suspended for inactivity.':'Learning active · Last access: '+new Date(policy.last_learning_at).toLocaleString(),'sc-course-note');
   const restore=element('button','Restore learning activity');restore.type='button';restore.hidden=!policy.suspended_at;restore.onclick=async()=>{if(!confirm('Restore learning activity? Course expiry and master access are not changed.'))return;restore.disabled=true;try{await edge('learning',{action:'student-learning-restore',student:p.id});policyText.textContent='Inactivity suspension restored. New inactivity period started.';restore.hidden=true;status('Learning activity restored.');}catch(e){error.textContent=e.message;}finally{restore.disabled=false;}};
   for(const c of courses){
    const item=element('section',undefined,'sc-course-item');const v=state.get(c.id);const top=element('label',undefined,'sc-course-name');const enabled=element('input');enabled.type='checkbox';enabled.checked=v.enabled;enabled.disabled=!c.active;
    top.append(enabled,element('strong',c.name+(c.active?'':' · Archived')));item.append(top,element('small',c.source,'sc-muted'));
    const langs=element('div',undefined,'sc-course-languages');const inputs={};
    for(const [key,label] of [['en','English'],['es','Spanish']]){const wrap=element('label');const input=element('input');input.type='checkbox';input.checked=v[key];input.disabled=!v.enabled;input.setAttribute('aria-label',label+' for '+c.name);input.onchange=()=>{v[key]=input.checked;};inputs[key]=input;wrap.append(input,element('span',label));langs.append(wrap);}
    enabled.onchange=()=>{v.enabled=enabled.checked;if(v.enabled&&!v.en&&!v.es){v.en=true;v.es=true;}for(const key of ['en','es']){inputs[key].checked=v[key];inputs[key].disabled=!v.enabled;}};
    const dateLabel=element('label','Course expiry (blank = default)');const date=element('input');date.type='date';date.value=v.expires_on||'';date.disabled=!c.active;date.onchange=()=>{v.expires_on=date.value||null;};dateLabel.append(date);item.append(langs,element('small','Current expiry: '+(c.effective_expiry||'No expiry')),dateLabel);list.append(item);controls.push(enabled,date,...Object.values(inputs));
   }
   if(!courses.length)list.append(element('p','No courses available. Create a course in Learning Administration.'));
   const cancel=element('button','Cancel'),save=element('button','Save course access','sc-course-save');cancel.type=save.type='button';let busy=false;
   cancel.onclick=()=>dialog.close();dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
   dialog.addEventListener('close',()=>{dialog.remove();trigger.disabled=false;});
   save.onclick=async()=>{if(busy||!trigger.isConnected||!dialog.isConnected)return;error.textContent='';const changes=[];for(const [course,v] of state){const old=originals.get(course);if(v.enabled&&!v.en&&!v.es){error.textContent='Select at least one language for each enabled course.';return;}if(['enabled','en','es','expires_on'].some(k=>v[k]!==old[k]))changes.push({course,...v});}
    if(!changes.length){dialog.close();return;}busy=true;save.disabled=cancel.disabled=true;const previous=controls.map(x=>x.disabled);controls.forEach(x=>x.disabled=true);
    try{await edge('learning',{action:'student-courses-save',student:p.id,changes});const n=[...state.values()].filter(x=>x.enabled).length;trigger.textContent=n+' '+(n===1?'course':'courses')+' added ▾';dialog.close();status('Course access saved for '+p.display_name+'.');}
    catch(e){error.textContent=e.message||'Could not save course access.';}finally{busy=false;save.disabled=cancel.disabled=false;controls.forEach((x,i)=>x.disabled=previous[i]);}
   };
   const actions=element('div',undefined,'sc-course-actions');actions.append(cancel,save);dialog.append(heading,intro,notice,policyText,restore,list,error,actions);document.body.append(dialog);dialog.showModal();
   const n=courses.filter(c=>c.enabled).length;trigger.textContent=n+' '+(n===1?'course':'courses')+' added ▾';
  }catch(e){dialog?.remove();trigger.disabled=false;status(e.message||'Could not load courses.',true);}
 };
 return trigger;
}
