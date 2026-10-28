export function voicePlayer({url,duration=0,load,status,label='Voice message'}){
 const box=document.createElement('div');box.className='sc-voice-player';box.setAttribute('role','group');box.setAttribute('aria-label',label);
 const audio=document.createElement('audio');audio.preload='metadata';audio.hidden=true;const play=document.createElement('button');play.type='button';play.className='sc-voice-play';play.textContent='▶';play.setAttribute('aria-label','Play '+label.toLowerCase());
 const seek=document.createElement('input');seek.type='range';seek.min='0';seek.max='100';seek.step='0.1';seek.value='0';seek.className='sc-voice-seek';seek.setAttribute('aria-label','Seek '+label.toLowerCase());seek.disabled=true;
 const time=document.createElement('span');time.className='sc-voice-time';const fmt=n=>Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0');let known=Number(duration)||0,source=url,request=null,disposed=false;
 const update=()=>{if(Number.isFinite(audio.duration))known=audio.duration;seek.disabled=!known;seek.value=known?String(100*audio.currentTime/known):'0';time.textContent=fmt(audio.currentTime||0)+' / '+fmt(known);};
 const pause=()=>{play.textContent='▶';play.setAttribute('aria-label','Play '+label.toLowerCase());};
 if(url)audio.src=url;
 play.onclick=async()=>{if(!audio.paused){audio.pause();return;}play.disabled=true;try{if(!source){play.textContent='…';request=request||load();source=await request;if(disposed||!source)return;audio.src=source;}await audio.play();}catch{if(!disposed)status?.('Voice message is unavailable or access has changed. Please try again.',true);request=null;pause();}finally{play.disabled=false;}};
 seek.oninput=()=>{if(Number.isFinite(audio.duration)&&audio.duration>0)audio.currentTime=Number(seek.value)/100*audio.duration;};
 audio.addEventListener('play',()=>{document.querySelectorAll('.sc-voice-player audio').forEach(other=>{if(other!==audio)other.pause();});play.textContent='Ⅱ';play.setAttribute('aria-label','Pause '+label.toLowerCase());});audio.addEventListener('pause',pause);audio.addEventListener('ended',pause);audio.addEventListener('timeupdate',update);audio.addEventListener('loadedmetadata',update);audio.addEventListener('error',()=>{pause();});
 update();box.append(play,seek,time,audio);return {element:box,dispose(){disposed=true;audio.pause();audio.removeAttribute('src');audio.load();}};
}
