export function setupChatView(){
 const root=document.getElementById('student-chat'),workspace=document.getElementById('workspace'),panel=document.getElementById('admin-panel'),password=document.getElementById('password-panel'),toggle=document.getElementById('admin-toggle');
 let wasSignedIn=false;
 function sync(){const signedIn=!workspace.hidden;if(signedIn&&!wasSignedIn){window.scrollTo({top:0,behavior:"instant"});requestAnimationFrame(()=>{if(!workspace.hidden)window.scrollTo({top:0,behavior:"instant"});});}wasSignedIn=signedIn;const active=!workspace.hidden&&password.hidden;root.classList.toggle('sc-signed-in',active);root.classList.toggle('sc-chat-mode',active&&panel.hidden);root.classList.toggle('sc-management-mode',active&&!panel.hidden);toggle.textContent=panel.hidden?'Manage classes & students':'← Back to chat';}
 const observer=new MutationObserver(sync);[workspace,panel,password].forEach(node=>observer.observe(node,{attributes:true,attributeFilter:['hidden']}));sync();
}
