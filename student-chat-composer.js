export function firstLink(text){return (text.match(/https?:\/\/[^\s<>]+/i)?.[0]||'').replace(/[),.!?;]+$/,'');}
export function setupComposer({hasMedia,isRecording}){
 const input=document.getElementById('message-text'),form=document.getElementById('message-form'),send=document.getElementById('send-message');
 const resize=()=>{input.style.height='auto';input.style.height=Math.min(136,input.scrollHeight)+'px';};input.addEventListener('input',resize);window.addEventListener('resize',resize);if(window.visualViewport){const viewport=()=>document.documentElement.style.setProperty('--sc-viewport-height',window.visualViewport.height+'px');window.visualViewport.addEventListener('resize',viewport);viewport();}
 input.addEventListener('keydown',e=>{if(e.key!=='Enter'||e.shiftKey||e.isComposing||e.keyCode===229||e.ctrlKey||e.altKey||e.metaKey)return;e.preventDefault();if(e.repeat||send.disabled||isRecording()||(!input.value.trim()&&!hasMedia()))return;form.requestSubmit(send);});
 resize();
}
