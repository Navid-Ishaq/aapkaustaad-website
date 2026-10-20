import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const actor='10000000-0000-0000-0000-000000000001',owner='10000000-0000-0000-0000-000000000009',target='10000000-0000-0000-0000-000000000002',classId='20000000-0000-0000-0000-000000000001';
let actorId=actor,targetRole='student',active=true,first=false,role='admin',handler,calls=[],authFails=false,ownerMissing=false,dbFails=false;
globalThis.Deno={env:{get:n=>({SUPABASE_URL:'https://test.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'server-only'})[n]},serve:fn=>handler=fn};
globalThis.__client=()=>({
 rpc:async()=>({data:ownerMissing?null:owner,error:null}),
 auth:{getUser:async()=>({data:{user:{id:actorId,email:'admin@example.com'}},error:null}),admin:{
  createUser:async b=>{calls.push(['create',b]);return {data:{user:{id:target}},error:null};},
  updateUserById:async(id,b)=>{calls.push(['auth-update',id,b]);return {data:{user:{id}},error:authFails?Error('failed'):null};},
  getUserById:async id=>({data:{user:{id,email:'student@example.com'}},error:null}),deleteUser:async()=>({error:null})
 }},
 from(table){let selectedId,filters={};let mutation=false;
  const b={select(){return b},eq(k,v){filters[k]=v;if(k==='id')selectedId=v;return b},in(){return b},order(){return b},range(){return b},
   insert(v){mutation=true;calls.push(['insert',table,v]);return b},update(v){mutation=true;calls.push(['update',table,v]);return b},upsert(v){mutation=true;calls.push(['upsert',table,v]);return b},delete(){mutation=true;calls.push(['delete',table]);return b},
   single:async()=>({data:table==='chat_classes'?{archived:false}:{id:selectedId,role:selectedId===actorId?role:targetRole,active,must_change_password:first},error:null}),
   then(resolve){const data=mutation?[]:table==='chat_classes'?[{id:classId}]:table==='chat_profiles'?[{id:target,role:filters.role||targetRole,active,display_name:'Student',must_change_password:false}]:[];return Promise.resolve({data,error:dbFails&&mutation?Error('database'):null}).then(resolve)}
  };return b;
 }
});
const read=p=>readFileSync(new URL('../supabase/functions/'+p,import.meta.url),'utf8');
const shared=read('_shared/security.ts').replace("import { createClient } from 'npm:@supabase/supabase-js@2.57.4';",'const createClient=globalThis.__client;');
const sharedURL='data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(shared)).toString('base64');
await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(read('chat-admin/index.ts').replace("'../_shared/security.ts'",JSON.stringify(sharedURL)))).toString('base64'));
async function request(action,extra={}){calls=[];const response=await handler(new Request('https://test/functions/v1/chat-admin',{method:'POST',headers:{Authorization:'Bearer valid',Origin:'https://aapkaustaad.com','Content-Type':'application/json'},body:JSON.stringify({action,user_id:target,...extra})}));return {status:response.status,body:await response.json()};}
const reset=()=>{actorId=actor;targetRole='student';active=true;first=false;role='admin';authFails=false;ownerMissing=false;dbFails=false;};
test('teacher can list student emails through server',async()=>{reset();const r=await request('list-accounts',{kind:'students'});assert.equal(r.status,200);assert.equal(r.body.data.accounts[0].email,'student@example.com');assert.equal(r.body.data.is_owner,false);});
test('teacher cannot list other Teacher Admin accounts',async()=>{reset();assert.equal((await request('list-accounts',{kind:'teachers'})).status,400);});
test('teacher cannot create Teacher Admin even with forged owner flag',async()=>{reset();const r=await request('create-teacher',{is_owner:true,role:'owner',name:'Teacher',email:'t@example.com',password:'Strong-Password123'});assert.equal(r.status,400);assert.equal(calls.length,0);});
test('owner can create confirmed Teacher Admin with fixed role and forced initial password change',async()=>{reset();actorId=owner;assert.equal((await request('create-teacher',{name:'Teacher',email:'t@example.com',password:'Strong-Password123',role:'owner'})).status,200);assert.equal(calls.find(x=>x[0]==='create')[1].email_confirm,true);const p=calls.find(x=>x[0]==='insert'&&x[1]==='chat_profiles')[2];assert.equal(p.role,'admin');assert.equal(p.must_change_password,true);});
for(const action of ['revoke','restore','change-email','reset-password','rename-account']){
 test('teacher cannot '+action+' another admin',async()=>{reset();targetRole='admin';assert.equal((await request(action,{email:'new@example.com',password:'Strong-Password123',name:'Renamed'})).status,400);assert.equal(calls.length,0);});
 test('owner account protected from '+action,async()=>{reset();assert.equal((await request(action,{user_id:owner,email:'new@example.com',password:'Strong-Password123',name:'Renamed'})).status,400);assert.equal(calls.length,0);});
}
test('owner can revoke Teacher Admin',async()=>{reset();actorId=owner;targetRole='admin';assert.equal((await request('revoke')).status,200);assert.equal(calls.find(x=>x[0]==='update')[2].active,false);});
test('teacher can revoke student; database is disabled before Auth ban',async()=>{reset();assert.equal((await request('revoke')).status,200);assert.equal(calls[0][0],'update');assert.equal(calls[0][2].active,false);assert.equal(calls[1][2].ban_duration,'876000h');});
test('restore unbans before enabling database access',async()=>{reset();assert.equal((await request('restore')).status,200);assert.equal(calls[0][0],'auth-update');assert.equal(calls[0][2].ban_duration,'none');assert.equal(calls[1][2].active,true);});
test('failed Auth unban never enables database access',async()=>{reset();authFails=true;assert.equal((await request('restore')).status,400);assert.equal(calls.filter(x=>x[0]==='update').length,0);});
test('password reset gates existing sessions before Auth update',async()=>{reset();assert.equal((await request('reset-password',{password:'Strong-Password123'})).status,200);assert.equal(calls[0][2].must_change_password,true);assert.equal(calls[1][2].password,'Strong-Password123');assert.ok(!JSON.stringify(calls.filter(x=>x[0]==='insert')).includes('Strong-Password123'));});
test('weak reset rejected before database mutations',async()=>{reset();assert.equal((await request('reset-password',{password:'weak'})).status,400);assert.equal(calls.length,0);});
test('email update explicitly confirms new address',async()=>{reset();assert.equal((await request('change-email',{email:'new@example.com'})).status,200);assert.equal(calls[0][2].email,'new@example.com');assert.equal(calls[0][2].email_confirm,true);});
test('membership can be prepared while account revoked; does not reactivate it',async()=>{reset(); // actor remains active, target need not be active to edit membership
assert.equal((await request('assign',{class_id:classId})).status,200);assert.equal(calls[0][0],'upsert');assert.equal(calls.some(x=>x[0]==='update'),false);});
test('missing owner configuration fails closed',async()=>{reset();ownerMissing=true;assert.equal((await request('create-class',{name:'Class'})).status,400);assert.equal(calls.length,0);});
test('student cannot call account-management endpoint',async()=>{reset();role='student';assert.equal((await request('list-accounts',{kind:'students'})).status,403);});
test('database failure while revoking stops before Auth mutation',async()=>{reset();dbFails=true;assert.equal((await request('revoke')).status,400);assert.equal(calls.some(x=>x[0]==='auth-update'),false);});
