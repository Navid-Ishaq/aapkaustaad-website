import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const src=stripTypeScriptTypes(read('supabase/functions/chat-admin/index.ts').replace(/^import .*\n/gm,''));
const js=read('student-chat-admin.js'),html=read('student-chat.html');
function harness({role='admin',owner=true}={}){
 let handler;const calls=[];const rows=Array.from({length:65},(_,i)=>({id:'s'+i,role:'student',display_name:i>=35?'Muhammad '+i:'Other '+i}));rows.push({id:'t',role:'admin',display_name:'Muhammad Teacher'});
 const actor='10000000-0000-0000-0000-000000000001';
 const admin={rpc:async()=>({data:owner?actor:'10000000-0000-0000-0000-000000000002'}),auth:{admin:{getUserById:async id=>{calls.push(['auth',id]);return {data:{user:{email:id+'@example.org'}}};}}},from(name){let data=name==='chat_profiles'?rows.slice():[];let count;const q={select(cols,opts){calls.push(['select',name,opts]);return q},eq(k,v){data=data.filter(r=>r[k]===v);return q},ilike(k,v){calls.push(['ilike',k,v]);const needle=v.slice(1,-1).replace(/\\(.)/g,'$1').toLowerCase();data=data.filter(r=>r[k].toLowerCase().includes(needle));return q},order(){return q},range(a,b){count=data.length;data=data.slice(a,b+1);calls.push(['range',a,b]);return q},in(k,ids){calls.push(['in',ids]);return q},then(resolve,reject){return Promise.resolve({data,count}).then(resolve,reject)}};return q;}};
 vm.runInNewContext(src,{Deno:{serve:f=>handler=f},context:async()=>({admin,user:{id:actor},profile:{role},reply:(body,status=200)=>({body,status})}),checked:r=>{if(r.error)throw Error(r.error);return r.data},requireValue:(v,m)=>{if(!v)throw Error(m)},uuid:v=>typeof v==='string',TextEncoder,console:{error(){}}});
 return {calls,request:(extra={})=>handler({text:async()=>JSON.stringify({action:'list-accounts',kind:'students',...extra})})};
}
test('global case-insensitive partial-name search before paging',async()=>{const h=harness();const r=await h.request({search:' mUh '});assert.equal(r.status,200);assert.equal(r.body.data.total,30);assert.equal(r.body.data.accounts.length,25);assert.equal(r.body.data.accounts[0].id,'s35');assert.equal(r.body.data.has_more,true);assert.equal(h.calls.filter(c=>c[0]==='auth').length,25)});
test('second filtered page and total',async()=>{const r=await harness().request({search:'muh',page:1});assert.equal(r.body.data.accounts.length,5);assert.equal(r.body.data.total,30);assert.equal(r.body.data.has_more,false)});
test('empty search preserves normal list',async()=>{const r=await harness().request();assert.equal(r.body.data.total,65);assert.equal(r.body.data.accounts[0].id,'s0')});
test('no results return empty list without auth lookups',async()=>{const h=harness();const r=await h.request({search:'nonexistent'});assert.equal(r.body.data.total,0);assert.equal(r.body.data.accounts.length,0);assert.equal(h.calls.filter(c=>c[0]==='auth').length,0)});
test('wildcard escape and input validation',async()=>{const h=harness();await h.request({search:'%_'});assert.equal(h.calls.find(c=>c[0]==='ilike')[2],'%\\%\\_%');assert.equal((await h.request({search:'x'.repeat(151)})).status,400);assert.equal((await h.request({search:1})).status,400)});
test('student denied; teacher admin can search students; teacher listing owner-only',async()=>{assert.equal((await harness({role:'student'}).request({search:'muh'})).status,403);assert.equal((await harness({owner:false}).request({search:'muh'})).status,200);assert.equal((await harness({owner:false}).request({kind:'teachers'})).status,400);assert.equal((await harness().request({kind:'teachers',search:'muh'})).status,400)});
test('search UI debounce, stale-response guard, current query pagination',()=>{assert.match(html,/id="sc-student-search" type="search"/);assert.match(js,/setTimeout\(\(\)=>loadStudents\(\).*?,300\)/);assert.match(js,/if\(generation!==studentGeneration\)return data/);assert.match(js,/studentPage--;await loadStudents\(\)/);assert.match(js,/studentPage\+\+;await loadStudents\(\)/);assert.match(js,/page,search\}/)});
test('clear resets page, logout clears search and navigation stores no search text',()=>{assert.match(js,/searchInput.value='';changeSearch\(\)/);assert.match(js,/studentSearch=searchInput.value.trim\(\);studentPage=0/);assert.match(js,/function reset\(\)\{clearTimeout\(searchTimer\);studentGeneration\+\+;studentSearch=''/);assert.match(js,/studentPage:studentSearch\?0:studentPage/)});
