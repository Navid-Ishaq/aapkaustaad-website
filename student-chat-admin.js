// All account reads/changes go through the authenticated, server-authorized Edge Function.
export function createAdminTools({edge,getClasses,status,element,button}) {
 const $=id=>document.getElementById(id);
 let studentPage=0,teacherPage=0,isOwner=false,version=0,edit=null,saveBusy=false;
 const dialog=$('account-dialog');
 const runChange=async fn=>{try{await fn();}catch(e){status(e.message||'Change failed',true);throw e;}};
 function closePopovers(){document.querySelectorAll('.sc-class-popover:popover-open').forEach(p=>p.hidePopover());}
 function reset(){version++;isOwner=false;closePopovers();document.querySelectorAll('.sc-class-popover').forEach(p=>p.remove());$('admin-students').replaceChildren();$('admin-teachers').replaceChildren();$('owner-panel').hidden=true;dialog.close();$('account-edit-form').reset();edit=null;}
 function openEditor(p,kind){
  edit={p,kind};$('account-edit-form').reset();$('edit-error').textContent='';$('edit-title').textContent=(kind==='password'?'Reset password':kind==='email'?'Change email':'Edit name')+' · '+p.display_name;
  $('edit-value-label').textContent=kind==='password'?'New temporary password':kind==='email'?'Email address':'Display name';
  const input=$('edit-value');input.type=kind==='password'?'password':kind==='email'?'email':'text';input.autocomplete=kind==='password'?'new-password':'off';input.minLength=kind==='password'?12:1;input.maxLength=kind==='password'?128:kind==='email'?254:80;input.value=kind==='email'?p.email:kind==='name'?p.display_name:'';
  $('edit-confirm-wrap').hidden=kind!=='password';$('edit-confirm').required=kind==='password';$('edit-help').textContent=kind==='password'?'Use 12–128 characters with uppercase, lowercase, number and symbol. The student/teacher must change this temporary password before using chat.':kind==='email'?'This changes the login email directly. Verify the spelling before saving.':'Existing messages keep the name recorded when they were sent.';
  dialog.showModal();input.focus();
 }
 $('edit-cancel').onclick=()=>{if(!saveBusy)dialog.close();};
 dialog.addEventListener('cancel',e=>{if(saveBusy)e.preventDefault();});
 dialog.addEventListener('close',()=>{$('account-edit-form').reset();edit=null;});
 $('account-edit-form').onsubmit=async e=>{
  e.preventDefault();if(saveBusy||!edit)return;const {p,kind}=edit;const ticket=version;
  if(kind==='password'&&$('edit-value').value!==$('edit-confirm').value){$('edit-error').textContent='Passwords do not match.';return;}
  saveBusy=true;$('edit-save').disabled=true;$('edit-cancel').disabled=true;
  try{await edge('chat-admin',{action:kind==='password'?'reset-password':kind==='email'?'change-email':'rename-account',user_id:p.id,...(kind==='password'?{password:$('edit-value').value}:kind==='email'?{email:$('edit-value').value}:{name:$('edit-value').value})});
   if(ticket!==version)return;dialog.close();await load();status(kind==='password'?'Temporary password set. Share it privately; the account must change it on next login.':'Account updated.');
  }catch(error){if(ticket===version)$('edit-error').textContent=error.message;}finally{saveBusy=false;$('edit-save').disabled=false;$('edit-cancel').disabled=false;}
 };
 function classPicker(p,memberships){
  const assigned=new Set(memberships.filter(m=>m.user_id===p.id).map(m=>m.class_id));
  const trigger=element('button',countLabel(),'sc-class-trigger');trigger.type='button';trigger.setAttribute('aria-label','Classes for '+p.display_name);trigger.setAttribute('aria-expanded','false');
  const pop=element('div',undefined,'sc-class-popover');pop.setAttribute('popover','auto');pop.id='classes-'+p.id;trigger.setAttribute('aria-controls',pop.id);
  pop.append(element('strong','Assign classes'),element('p','Tick to add · untick to remove','sc-muted'));
  function countLabel(){return assigned.size+' '+(assigned.size===1?'class':'classes')+' added ▾';}
  const choices=getClasses().filter(c=>!c.archived||assigned.has(c.id));
  if(!choices.length)pop.append(element('p','Create a class first.','sc-muted'));
  for(const c of choices){const label=element('label',undefined,'sc-class-choice');const input=element('input');input.type='checkbox';input.checked=assigned.has(c.id);input.setAttribute('aria-label',c.name+' for '+p.display_name);label.append(input,element('span',c.name+(c.archived?' · Archived':'')));pop.append(label);
   input.onchange=async()=>{const next=input.checked;input.disabled=true;trigger.disabled=true;const ticket=version;
    try{await edge('chat-admin',{action:next?'assign':'remove',user_id:p.id,class_id:c.id});if(ticket!==version)return;if(next)assigned.add(c.id);else assigned.delete(c.id);trigger.textContent=countLabel();status('Class membership saved for '+p.display_name+'.');}
    catch(e){input.checked=!next;status(e.message||'Membership change failed',true);}finally{input.disabled=false;trigger.disabled=false;}
   };
  }
  $('student-chat').append(pop);
  trigger.onclick=()=>{if(pop.matches(':popover-open')){pop.hidePopover();return;}closePopovers();const r=trigger.getBoundingClientRect();const width=Math.min(350,window.innerWidth-24);pop.style.width=width+'px';pop.style.left=Math.max(12,Math.min(r.left,window.innerWidth-width-12))+'px';const below=window.innerHeight-r.bottom-16;pop.style.top=(below>=180?r.bottom+6:Math.max(12,r.top-Math.min(320,r.top-16)))+'px';pop.style.maxHeight=Math.max(140,Math.min(320,below>=180?below:r.top-24))+'px';pop.showPopover();};
  pop.addEventListener('toggle',()=>trigger.setAttribute('aria-expanded',String(pop.matches(':popover-open'))));return trigger;
 }
 function accessControl(p){const wrap=element('label',undefined,'sc-access');const checkbox=element('input');checkbox.type='checkbox';checkbox.checked=p.active;checkbox.setAttribute('aria-label',(p.role==='admin'?'Admin':'Chat')+' access for '+p.display_name);const text=element('span',p.active?'Enabled':'Revoked',p.active?'sc-enabled':'sc-disabled');wrap.append(checkbox,text);
  checkbox.onchange=async()=>{const next=checkbox.checked;if(!confirm((next?'Restore':'Revoke all')+' '+(p.role==='admin'?'Teacher Admin':'chat')+' access for '+p.display_name+'?')){checkbox.checked=!next;return;}checkbox.disabled=true;const ticket=version;
   try{const response=await edge('chat-admin',{action:next?'restore':'revoke',user_id:p.id});if(ticket!==version)return;p.active=next;text.textContent=next?'Enabled':'Revoked';text.className=next?'sc-enabled':'sc-disabled';status(next?'Access restored. The account can log in again.':response.data?.auth_ban_applied===false?'Chat access revoked. Auth ban failed; database access remains blocked.':'Access revoked. Login and class chat are blocked.');}
   catch(e){checkbox.checked=!next;status(e.message||'Access change failed',true);}finally{checkbox.disabled=false;}
  };return wrap;
 }
 function renderAccounts(container,accounts,memberships,kind,hasMore,page){
  if(kind==='students'){closePopovers();document.querySelectorAll('.sc-class-popover').forEach(p=>p.remove());}
  container.replaceChildren();const table=element('table',undefined,'sc-account-table');table.setAttribute('aria-label',kind==='teachers'?'Teacher Admin accounts':'Student accounts');const head=element('thead'),hr=element('tr');
  for(const title of ['Name','Email','Password',kind==='teachers'?'Role':'Classes',kind==='teachers'?'Admin access':'Chat access'])hr.append(element('th',title));head.append(hr);const body=element('tbody');
  for(const p of accounts){const row=element('tr');row.dataset.accountId=p.id;
   const name=element('td'),email=element('td'),password=element('td'),classes=element('td'),access=element('td');
   if(p.is_owner){name.append(element('strong',p.display_name));email.append(element('span',p.email));password.append(element('span','Use Change password','sc-muted'));classes.append(element('span','Owner','sc-owner-badge'));access.append(element('span','Protected','sc-enabled'));}
   else{name.append(button(p.display_name,()=>openEditor(p,'name'),'sc-text-edit'));email.append(button(p.email||'Set email',()=>openEditor(p,'email'),'sc-text-edit'));password.append(button('Reset password',()=>openEditor(p,'password'),'sc-small-button'));classes.append(kind==='teachers'?element('span','Teacher Admin','sc-muted'):classPicker(p,memberships));access.append(accessControl(p));}
   if(p.must_change_password&&!p.is_owner)name.append(element('small','Password change pending','sc-pending'));row.append(name,email,password,classes,access);body.append(row);
  }
  if(!accounts.length){const row=element('tr'),cell=element('td','No '+(kind==='teachers'?'Teacher Admins':'students')+' on this page.');cell.colSpan=5;row.append(cell);body.append(row);}
  table.append(head,body);const scroll=element('div',undefined,'sc-table-scroll');scroll.append(table);container.append(scroll);
  const pager=element('div',undefined,'sc-pager');const prev=button('Previous',async()=>{if(kind==='students')studentPage--;else teacherPage--;await load();});prev.disabled=page===0;const next=button('Next',async()=>{if(kind==='students')studentPage++;else teacherPage++;await load();});next.disabled=!hasMore;pager.append(prev,element('span','Page '+(page+1),'sc-muted'),next);container.append(pager);
 }
 async function load(){const ticket=version;const response=await edge('chat-admin',{action:'list-accounts',kind:'students',page:studentPage});if(ticket!==version)return;const data=response.data;isOwner=data.is_owner;$('owner-panel').hidden=!isOwner;$('owner-badge').hidden=!isOwner;renderAccounts($('admin-students'),data.accounts,data.memberships,'students',data.has_more,studentPage);
  $('admin-classes').replaceChildren();$('student-classes').replaceChildren();for(const c of getClasses()){
   const row=element('div',undefined,'sc-class-admin-row');row.append(element('strong',c.name+(c.archived?' · Archived':'')));const actions=element('div');actions.append(button('Rename',async()=>{const name=prompt('Class name',c.name);if(name===null)return;await runChange(async()=>{await edge('chat-admin',{action:'rename-class',class_id:c.id,name});window.dispatchEvent(new Event('chat:refresh-admin'));});}),button(c.archived?'Reopen':'Archive',async()=>{if(!confirm((c.archived?'Reopen':'Archive')+' '+c.name+'?'))return;await edge('chat-admin',{action:'archive-class',class_id:c.id,archived:!c.archived});window.dispatchEvent(new Event('chat:refresh-admin'));}));row.append(actions);$('admin-classes').append(row);
   if(!c.archived){const label=element('label');const input=element('input');input.type='checkbox';input.value=c.id;input.name='class';label.append(input,document.createTextNode(' '+c.name));$('student-classes').append(label);}
  }
  if(isOwner){const result=await edge('chat-admin',{action:'list-accounts',kind:'teachers',page:teacherPage});if(ticket!==version)return;renderAccounts($('admin-teachers'),result.data.accounts,[],'teachers',result.data.has_more,teacherPage);}
 }
 $('teacher-form').onsubmit=async e=>{e.preventDefault();if(!isOwner)return;const submit=e.submitter;if(submit.disabled)return;submit.disabled=true;try{await edge('chat-admin',{action:'create-teacher',name:$('teacher-name').value,email:$('teacher-email').value,password:$('teacher-password').value});$('teacher-form').reset();await load();status('Teacher Admin created. Rights remain until you revoke them. Share initial login details privately.');}catch(e){status(e.message,true);}finally{submit.disabled=false;}};
 window.addEventListener('resize',closePopovers);
 return {load,reset};
}
