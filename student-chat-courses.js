// Course permissions use the authenticated Learning function, never a browser service key.
export function coursePicker(p,{edge,status,element}){
 const trigger=element('button','Manage courses ▾','sc-class-trigger sc-course-trigger');trigger.type='button';trigger.setAttribute('aria-label','Courses for '+p.display_name);
 trigger.onclick=async()=>{
  if(trigger.disabled)return;trigger.disabled=true;
  let dialog;
  try{
   const data=await edge('learning',{action:'student-courses',student:p.id});
   if(!trigger.isConnected)return;
   const courses=data.courses;const originals=new Map(courses.map(c=>[c.id,{enabled:c.enabled,en:c.en,es:c.es}]));
   const state=new Map(courses.map(c=>[c.id,{...originals.get(c.id)}]));
   dialog=element('dialog',undefined,'sc-course-dialog');dialog.setAttribute('aria-label','Course permissions for '+p.display_name);
   const heading=element('h2','Courses · '+p.display_name);const intro=element('p','Assign entire courses, including future published tests.');
   const notice=element('p',p.active?'Choose course access and languages.':'Master account revoked: course assignments will not restore login.','sc-course-note');
   const list=element('div',undefined,'sc-course-list');const error=element('p','','sc-course-error');error.setAttribute('role','alert');
   const controls=[];
   for(const c of courses){
    const item=element('section',undefined,'sc-course-item');const v=state.get(c.id);const top=element('label',undefined,'sc-course-name');const enabled=element('input');enabled.type='checkbox';enabled.checked=v.enabled;enabled.disabled=!c.active;
    top.append(enabled,element('strong',c.name+(c.active?'':' · Archived')));item.append(top,element('small',c.source,'sc-muted'));
    const langs=element('div',undefined,'sc-course-languages');const inputs={};
    for(const [key,label] of [['en','English'],['es','Spanish']]){const wrap=element('label');const input=element('input');input.type='checkbox';input.checked=v[key];input.disabled=!v.enabled;input.setAttribute('aria-label',label+' for '+c.name);input.onchange=()=>{v[key]=input.checked;};inputs[key]=input;wrap.append(input,element('span',label));langs.append(wrap);}
    enabled.onchange=()=>{v.enabled=enabled.checked;if(v.enabled&&!v.en&&!v.es){v.en=true;v.es=true;}for(const key of ['en','es']){inputs[key].checked=v[key];inputs[key].disabled=!v.enabled;}};
    item.append(langs);list.append(item);controls.push(enabled,...Object.values(inputs));
   }
   if(!courses.length)list.append(element('p','No courses available. Create a course in Learning Administration.'));
   const cancel=element('button','Cancel'),save=element('button','Save course access','sc-course-save');cancel.type=save.type='button';let busy=false;
   cancel.onclick=()=>dialog.close();dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
   dialog.addEventListener('close',()=>{dialog.remove();trigger.disabled=false;});
   save.onclick=async()=>{if(busy||!trigger.isConnected||!dialog.isConnected)return;error.textContent='';const changes=[];for(const [course,v] of state){const old=originals.get(course);if(v.enabled&&!v.en&&!v.es){error.textContent='Select at least one language for each enabled course.';return;}if(['enabled','en','es'].some(k=>v[k]!==old[k]))changes.push({course,...v});}
    if(!changes.length){dialog.close();return;}busy=true;save.disabled=cancel.disabled=true;const previous=controls.map(x=>x.disabled);controls.forEach(x=>x.disabled=true);
    try{await edge('learning',{action:'student-courses-save',student:p.id,changes});const n=[...state.values()].filter(x=>x.enabled).length;trigger.textContent=n+' '+(n===1?'course':'courses')+' added ▾';dialog.close();status('Course access saved for '+p.display_name+'.');}
    catch(e){error.textContent=e.message||'Could not save course access.';}finally{busy=false;save.disabled=cancel.disabled=false;controls.forEach((x,i)=>x.disabled=previous[i]);}
   };
   const actions=element('div',undefined,'sc-course-actions');actions.append(cancel,save);dialog.append(heading,intro,notice,list,error,actions);document.getElementById('student-chat').append(dialog);dialog.showModal();
   const n=courses.filter(c=>c.enabled).length;trigger.textContent=n+' '+(n===1?'course':'courses')+' added ▾';
  }catch(e){dialog?.remove();trigger.disabled=false;status(e.message||'Could not load courses.',true);}
 };
 return trigger;
}
