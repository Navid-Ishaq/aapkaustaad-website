import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Independent backend: do NOT add any API secret to GitHub Pages files.
const MAX_BODY = 12 * 1024;
const MAX_PER_WINDOW = 5;
const WINDOW_MS = 15 * 60 * 1000;
const requestsByIp = new Map(); // simple first layer; resets if the free Render service restarts

const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0,max + 1) : '';

export function validate(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid enquiry.');
  const value = {
    name:clean(input.name,110), email:clean(input.email,254).toLowerCase(),
    countryCode:clean(input.countryCode,5).replace(/\s/g,''),
    whatsappNumber:clean(input.whatsappNumber,25).replace(/[\s()\-.]/g,''),
    city:clean(input.city,100), language:clean(input.language,35),
    course:clean(input.course,120), question:clean(input.question,3000),
    consent:input.consent === true, companyWebsite:clean(input.companyWebsite,200),
    submissionId:clean(input.submissionId,100)
  };
  if (value.name.length < 2 || value.name.length > 110) throw new Error('Please enter your full name.');
  if (value.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) throw new Error('Please enter a valid email address.');
  if (!/^\+[1-9]\d{0,3}$/.test(value.countryCode) || !/^\d{5,14}$/.test(value.whatsappNumber) ||
    !/^\+[1-9]\d{6,14}$/.test(value.countryCode + value.whatsappNumber)) throw new Error('Please enter a valid WhatsApp number with country code.');
  if (value.city.length > 100 || value.language.length > 35 || !value.language) throw new Error('Invalid language.');
  if (!value.course || value.course.length > 120) throw new Error('Please choose a course.');
  if (value.question.length < 10 || value.question.length > 3000) throw new Error('Please write your question (10–3000 characters).');
  if (!value.consent) throw new Error('Please consent to being contacted about your enquiry.');
  if (!/^[a-zA-Z0-9-]{8,100}$/.test(value.submissionId)) throw new Error('Please refresh and submit again.');
  return value;
}

function section(label,value){return `<tr><td style="padding:13px 14px;vertical-align:top;border-bottom:1px solid #e6e9ee;font-weight:700;color:#203047;white-space:nowrap">${escapeHtml(label)}</td><td style="padding:13px 14px;border-bottom:1px solid #e6e9ee;white-space:pre-wrap;overflow-wrap:anywhere">${escapeHtml(value || '—')}</td></tr>`;}
function layout(heading,content,ref){return `<!doctype html><html><body style="margin:0;background:#f2f6fa;font:15px/1.6 Arial,sans-serif;color:#19263a"><div style="max-width:650px;margin:24px auto;background:#fff;border:1px solid #e0e6ef;border-radius:16px;overflow:hidden"><div style="padding:25px 30px;background:#16385d;color:#fff"><small style="color:#93e4c2;letter-spacing:1.5px;font-weight:700">AL-NOOR ASIAN EDUCATIONAL CENTRE</small><h1 style="font-size:25px;line-height:1.2;margin:12px 0 0;color:#fff">${heading}</h1></div><div style="padding:24px 28px">${content}<p style="font-size:12px;color:#637187;border-top:1px solid #e8eaf0;padding-top:15px">Reference: ${escapeHtml(ref)} · <a href="https://aapkaustaad.com" style="color:#1859a9">aapkaustaad.com</a></p></div></div></body></html>`;}

export function buildEmails(fields, env, reference) {
  const from=env.ALNOOR_FROM_EMAIL;
  const toAdmin=env.ALNOOR_ADMIN_EMAIL;
  const replyTo=env.ALNOOR_REPLY_TO_EMAIL;
  const wa=fields.countryCode + fields.whatsappNumber;
  const table=`<table style="width:100%;border-collapse:collapse;font-size:14px">${section('Course', fields.course)}${section('Your question', fields.question)}${section('Preferred language', fields.language)}</table>`;
  const clientHtml=layout('We received your course enquiry',
    `<p>Dear ${escapeHtml(fields.name)},</p><p>Thank you for contacting AL-NOOR Asian Educational Centre. We are happy to receive your enquiry and will review it as soon as possible.</p><h2 style="font-size:17px;color:#16385d">Your enquiry</h2>${table}<p>Our team will contact you using the details you provided. Meanwhile, you can explore our <a href="https://aapkaustaad.com/courses.html">courses</a> or visit the <a href="https://aapkaustaad.com/contact.html">Contact page</a> for our teachers' WhatsApp links.</p><p>Warm regards,<br><strong>AL-NOOR Team</strong></p>`,reference);
  const adminHtml=layout('New course enquiry',
    `<p>A student submitted the course enquiry form.</p><table style="width:100%;border-collapse:collapse;font-size:14px">${section('Name',fields.name)}${section('Email',fields.email)}${section('WhatsApp',wa)}${section('City / country',fields.city)}${section('Preferred language',fields.language)}${section('Course',fields.course)}${section('Question',fields.question)}</table><p>You can reply to this notification to contact the student by email.</p>`,reference);
  return [
    {from,to:[fields.email],reply_to:replyTo,subject:`We received your AL-NOOR course enquiry — ${reference}`,html:clientHtml},
    {from,to:[toAdmin],cc:[env.ALNOOR_CC_EMAIL || 'talk2bilal77@gmail.com'],reply_to:fields.email,subject:`New AL-NOOR course enquiry — ${reference}`,html:adminHtml}
  ];
}

export async function sendBatch(emails, apiKey, key, fetchImpl=globalThis.fetch) {
  const url='https://api.resend.com/emails/batch';
  const payload=JSON.stringify(emails);
  let lastError;
  for (let attempt=0; attempt<2; attempt++) {
    try {
      const res=await fetchImpl(url,{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json','Idempotency-Key':key},body:payload,signal:AbortSignal.timeout(12000)});
      const response=await res.json().catch(()=>({}));
      if (res.ok && Array.isArray(response.data) && response.data.length===2 && response.data.every(item=>item.id)) return response.data.map(item=>item.id);
      if (res.status===429 && attempt===0) {await new Promise(r=>setTimeout(r,1200));continue;}
      lastError=new Error(`Resend rejected the batch: HTTP ${res.status}`);
      break;
    } catch(e) {lastError=e; if (attempt===0) {await new Promise(r=>setTimeout(r,700));continue;}}
  }
  throw lastError || new Error('Email service did not confirm both messages.');
}
function json(res,status,data,cors={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...cors});res.end(JSON.stringify(data));}
function allowedOrigin(req,env){const allow=(env.ALLOWED_ORIGINS||'https://aapkaustaad.com,https://www.aapkaustaad.com').split(',').map(x=>x.trim());return !req.headers.origin || allow.includes(req.headers.origin);}
function corsHeaders(req){return req.headers.origin?{'Access-Control-Allow-Origin':req.headers.origin,'Vary':'Origin','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST,OPTIONS'}:{};}
function rateLimited(req){
  const ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'unknown').split(',')[0].trim().slice(0,80);
  const now=Date.now();
  for(const [key,times] of requestsByIp) if(times.every(t=>now-t>WINDOW_MS))requestsByIp.delete(key);
  const recent=(requestsByIp.get(ip)||[]).filter(t=>now-t<=WINDOW_MS);
  if (recent.length>=MAX_PER_WINDOW)return true;
  recent.push(now);requestsByIp.set(ip,recent);return false;
}
async function readJson(req){let body='';for await(const chunk of req){body+=chunk.toString('utf8');if(Buffer.byteLength(body)>MAX_BODY)throw new Error('Message too large.');}try{return JSON.parse(body);}catch{throw new Error('Invalid JSON.');}}

export function createApp(env=process.env, fetchImpl=globalThis.fetch){
  return http.createServer(async(req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    if(pathname==='/health' && req.method==='GET')return json(res,200,{ok:true,service:'alnoor-inquiry'});
    if(pathname!=='/api/inquiry')return json(res,404,{error:'Not found.'});
    if(!allowedOrigin(req,env))return json(res,403,{error:'This origin is not allowed.'});
    const cors=corsHeaders(req);
    if(req.method==='OPTIONS'){res.writeHead(204,cors);return res.end();}
    if(req.method!=='POST')return json(res,405,{error:'Method not allowed.'},cors);
    if(rateLimited(req))return json(res,429,{error:'Too many requests. Please try again in 15 minutes.'},cors);
    let fields;
    try{fields=validate(await readJson(req));}catch(error){return json(res,400,{error:error.message},cors);}
    const reference='AN-'+fields.submissionId.slice(0,12).toUpperCase();
    // Bots sometimes fill a hidden field; acknowledge without sending mail.
    if(fields.companyWebsite)return json(res,200,{ok:true,reference},cors);
    if(!env.RESEND_API_KEY||!env.ALNOOR_FROM_EMAIL||!env.ALNOOR_ADMIN_EMAIL||!env.ALNOOR_REPLY_TO_EMAIL){console.error('Missing AL-NOOR mail configuration');return json(res,503,{error:'Email service is being configured. Please try later.'},cors);}
    try{
      const batch=buildEmails(fields,env,reference);
      const ids=await sendBatch(batch,env.RESEND_API_KEY,`alnoor-enquiry/${fields.submissionId}`,fetchImpl);
      console.log('AL-NOOR email batch accepted:',reference,'client:',ids[0],'admin:',ids[1]);
      return json(res,200,{ok:true,reference},cors);
    }catch(error){console.error('AL-NOOR mail batch failed:',reference,error.message);return json(res,502,{error:'We could not send your enquiry right now. Please try again shortly.'},cors);}
  });
}
if(process.argv[1] && fileURLToPath(import.meta.url)===process.argv[1]){
  const port=Number(process.env.PORT||10000);
  createApp().listen(port,'0.0.0.0',()=>console.log(`AL-NOOR inquiry API listening on ${port}`));
}
