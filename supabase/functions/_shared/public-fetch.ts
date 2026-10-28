import {request} from 'node:https';
import {lookup} from 'node:dns/promises';
import {publicUrl,resolvePublicHost} from './public-address.ts';
// Resolve once, validate all results, then pin the actual socket lookup to a public IP.
// Keep the original hostname for TLS certificate verification and SNI. No proxy or pool.
export async function safePublicFetch(input:URL|string,options:RequestInit={}){
 const url=publicUrl(String(input)),signal=options.signal;if(signal?.aborted)throw Error('Preview timed out');
 let cancelDns=()=>{};const address=await Promise.race([resolvePublicHost(url.hostname,h=>lookup(h,{all:true})),new Promise<never>((_resolve,reject)=>{const abort=()=>reject(Error('Preview timed out'));signal?.addEventListener('abort',abort,{once:true});cancelDns=()=>signal?.removeEventListener('abort',abort);})]).finally(()=>cancelDns());if(signal?.aborted)throw Error('Preview timed out');
 return await new Promise<Response>((resolve,reject)=>{
  const req=request(url,{method:'GET',agent:false,servername:url.hostname,family:address.family,lookup:(_host:any,opts:any,callback:any)=>{if(opts?.all)callback(null,[address]);else callback(null,address.address,address.family);},headers:{Accept:new Headers(options.headers).get('Accept')||'text/html','Accept-Encoding':'identity','User-Agent':'ALNOOR-LinkPreview/1.0'},maxHeaderSize:16384},res=>{
   const headers=new Headers();for(const [key,value] of Object.entries(res.headers))if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(', '):String(value));
   const cleanup=()=>signal?.removeEventListener('abort',abort);if([204,205,304].includes(res.statusCode||0)){cleanup();res.resume();resolve(new Response(null,{status:res.statusCode,headers}));return;}const stream=new ReadableStream<Uint8Array>({start(controller){res.on('data',chunk=>{res.pause();controller.enqueue(new Uint8Array(chunk));});res.on('end',()=>{cleanup();controller.close();});res.on('error',e=>{cleanup();controller.error(e);});},pull(){res.resume();},cancel(){cleanup();res.destroy();req.destroy();}});
   resolve(new Response(stream,{status:res.statusCode||502,headers}));
  });const abort=()=>req.destroy(Error('Preview timed out'));signal?.addEventListener('abort',abort,{once:true});req.setTimeout(7000,abort);req.on('error',e=>{signal?.removeEventListener('abort',abort);reject(e);});req.end();
 });
}
