import {context,createClient,checked,requireValue,strong} from '../_shared/security.ts';
Deno.serve(async req=>{
 const c=await context(req);if(c.early)return c.early;
 const {admin,user,reply,url}=c;
 try{
 const b=await req.json();requireValue(strong(b.password),'Use 12–128 characters with uppercase, lowercase, number and symbol');
 requireValue(typeof b.current_password==='string'&&b.current_password.length<=128,'Current password required');
 requireValue(b.password!==b.current_password,'Choose a different password');
 const verifier=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 const verification=await verifier.auth.signInWithPassword({email:user.email!,password:b.current_password});
 requireValue(!verification.error&&verification.data.user?.id===user.id,'Current password incorrect');
 await verifier.auth.signOut();
 const update=await admin.auth.admin.updateUserById(user.id,{password:b.password});
 requireValue(!update.error,'Password could not be changed');
 checked(await admin.from('chat_profiles').update({must_change_password:false}).eq('id',user.id).eq('active',true));
 return reply({ok:true});
 }catch(e){return reply({error:e instanceof Error?e.message:'Password change failed'},400);}
});
