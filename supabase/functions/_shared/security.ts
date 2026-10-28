import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
export { createClient };
export const strong = (p: unknown): p is string => typeof p === 'string' && p.length >= 8 && p.length <= 128 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9\s]/.test(p);
export const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export function requireValue(ok: unknown, message: string): asserts ok { if (!ok) throw new Error(message); }
export function checked<T>(result: {data:T;error:unknown}): T { if(result.error) throw new Error('Database operation failed'); return result.data; }
export async function context(req: Request, maxBody=16000) {
 const origin = req.headers.get('origin');
 const allowed = (Deno.env.get('CHAT_ALLOWED_ORIGINS') || 'https://aapkaustaad.com,https://www.aapkaustaad.com').split(',').map(x=>x.trim());
 const headers: Record<string,string> = {'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
 if(origin && !allowed.includes(origin)) return {early:new Response('Origin denied',{status:403})};
 if(origin) headers['Access-Control-Allow-Origin']=origin;
 headers['Access-Control-Allow-Headers']='authorization, apikey, content-type, x-client-info';
 headers['Access-Control-Allow-Methods']='POST, OPTIONS';
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(req.method==='OPTIONS') return {early:new Response(null,{status:204,headers})};
 if(req.method!=='POST') return {early:reply({error:'POST required'},405)};
 const token=req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!token) return {early:reply({error:'Login required'},401)};
 const url=Deno.env.get('SUPABASE_URL')!;
 const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await admin.auth.getUser(token);
 if(error || !user || user.is_anonymous) return {early:reply({error:'Invalid login'},401)};
 const {data:profile}=await admin.from('chat_profiles').select('*').eq('id',user.id).single();
 if(!profile?.active) return {early:reply({error:'Access revoked or not assigned'},403)};
 if(Number(req.headers.get('content-length')||0)>maxBody) return {early:reply({error:'Request too large'},413)};
 return {admin,user,profile,reply,url};
}
