import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const js=readFileSync(new URL('../student-chat.js',import.meta.url),'utf8');
const admin=readFileSync(new URL('../student-chat-admin.js',import.meta.url),'utf8');
function harness(role='admin',fail=false){const calls=[];let release;const gate=new Promise(r=>release=r);const ctx={profile:{role},adminTools:null,edge:null,classes:[],status:null,element:null,button:null,createAdminTools:()=>({setPages:(s,t)=>calls.push(['pages',s,t]),load:async()=>{calls.push('admin');await gate;if(fail)throw Error('admin failed');}}),enrollment:{load:async()=>{calls.push('enrollment');await gate;}}};vm.createContext(ctx);vm.runInContext(js.slice(js.indexOf('async function loadAdmin('),js.indexOf('async function refreshAdmin(')),ctx);return {calls,release,load:ctx.loadAdmin};}
test('saved pagination applied before first admin request and both loaders start in parallel',async()=>{const h=harness();const promise=h.load({admin:true,studentPage:2,teacherPage:1},true);assert.deepEqual(h.calls,[['pages',2,1],'admin','enrollment']);h.release();await promise;});
test('normal admin operations keep existing sequential loading',async()=>{const h=harness();const promise=h.load();assert.deepEqual(h.calls,['admin']);h.release();await promise;assert.deepEqual(h.calls,['admin','enrollment']);});
test('student cannot load admin data',async()=>{const h=harness('student');await h.load({admin:true},true);assert.deepEqual(h.calls,[]);});
test('startup errors propagate after loaders settle',async()=>{const h=harness('admin',true);const promise=h.load(null,true);h.release();await assert.rejects(promise,/admin failed/);});
test('restore path does not reload default pagination',()=>{assert.match(js,/const saved=await loadAccount\(true\)/);assert.doesNotMatch(js,/await adminTools\?\.restorePages/);assert.match(js,/const saved=restore\?readNavigation\(sessionStorage,profile.id\):null/);assert.ok(js.indexOf('if(!profile?.active)')<js.indexOf('const saved=restore?'));});
test('page setter is synchronous and preserves bounds',()=>{const snippet=admin.slice(admin.indexOf('function setPages('),admin.indexOf(' return {load,reset,getPages'));const c={studentPage:0,teacherPage:0};vm.createContext(c);vm.runInContext(snippet,c);c.setPages(2,1);assert.equal(c.studentPage,2);assert.equal(c.teacherPage,1);c.setPages(-1,Infinity);assert.equal(c.studentPage,0);assert.equal(c.teacherPage,0);});
