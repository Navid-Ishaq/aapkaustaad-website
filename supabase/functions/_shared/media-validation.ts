export const MAX_IMAGE_BYTES=2097152;
export function validateWav(bytes:Uint8Array){
 const d=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);const text=(a:number,b:number)=>String.fromCharCode(...bytes.slice(a,b));
 if(bytes.length<44||bytes.length>3840044||text(0,4)!=='RIFF'||text(8,12)!=='WAVE'||d.getUint32(4,true)+8!==bytes.length)throw Error('Please record a fresh voice message.');
 let format=false,samples=0;
 for(let i=12;i+8<=bytes.length;){const n=d.getUint32(i+4,true);if(i+8+n>bytes.length)throw Error('Invalid voice data');const tag=text(i,i+4);if(tag==='fmt '){if(n<16||d.getUint16(i+8,true)!==1||d.getUint16(i+10,true)!==1||d.getUint32(i+12,true)!==16000||d.getUint16(i+22,true)!==16||d.getUint16(i+20,true)!==2||d.getUint32(i+16,true)!==32000)throw Error('Unsupported voice format');format=true;}if(tag==='data')samples+=n/2;i+=8+n+(n%2);}
 const duration=samples/16000;if(!format||duration<=0||duration>120||!Number.isInteger(samples))throw Error('Voice messages can be up to 2 minutes.');return duration;
}
export function validateBatch(kind:string,count:number){if(kind==='voice'&&count===1)return;if(kind==='image'&&count>=1&&count<=5)return;throw Error('Please select up to 5 images, or one voice recording.');}
