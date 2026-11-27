import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
const code=stripTypeScriptTypes(readFileSync(new URL('../supabase/functions/learning/index.ts',import.meta.url),'utf8').replace(/^import .*\n/,''));
const question=(text='Original')=>({es:'Pregunta',en:text,opts:[['Sí','Yes'],['No','No']],correct:0,imgs:[],refs:[],feedback_text:'Explanation'});
function harness({teacher=true,foreign=false,conflict=false}={}){
 let handler;const original=question(),current={...question('Updated'),correct:1};const state={learn_tests:{id:'test',section_id:'section',published:true,questions:[current],revision:2,max_errors:0},learn_attempts:{id:'attempt',user_id:foreign?'other':'user',test_id:'test',test_revision:1,mode:'exam',answers:{0:0},started_at:'2020-01-01',finished_at:null},learn_sections:{id:'section',course_id:'course'},learn_courses:{id:'course',active:true},learn_access:{enabled:true,en:true,es:false},learn_test_revisions:{questions:[original],max_errors:0}};
 const writes=[];const admin={from(n){let updated;const q={select(){return q},eq(){return q},is(){return q},order(){return q},limit(){return Promise.resolve({data:[{revision:1,archived_at:'2020-01-01'}]})},single(){return Promise.resolve({data:state[n]})},maybeSingle(){return Promise.resolve({data:updated?(conflict?null:{revision:3}):state[n]})},update(v){updated=v;writes.push([n,v]);return q}};return q;},storage:{from(){return {async createSignedUrls(){return {data:[]}},async createSignedUrl(path){return {data:{signedUrl:'https://signed/'+path}}},async upload(path,bytes){writes.push(['upload',path,bytes.length]);return {data:{path}}}}}}};
 vm.runInNewContext(code,{Deno:{serve:f=>handler=f},context:async()=>({admin,user:{id:'user'},profile:{role:teacher?'admin':'student'},reply:(body,status=200)=>({body,status})}),checked:r=>{if(r.error)throw Error(r.error);return r.data},requireValue:(v,m)=>{if(!v)throw Error(m)},uuid:v=>typeof v==='string',console:{error(){}},atob,Uint8Array,crypto});
 return {writes,request:b=>handler({text:async()=>JSON.stringify(b)})};
}
const save=(extra={})=>({action:'editor-save',test:'test',index:0,revision:2,question:question('Edited'),...extra});
test('admin loads raw question and revision history',async()=>{const h=harness();const r=await h.request({action:'editor-load',test:'test',index:0});assert.equal(r.status,200);assert.equal(r.body.question.correct,1);assert.equal(r.body.history[0].revision,1)});
for(const action of ['editor-load','editor-save','editor-restore','editor-upload'])test('student denied '+action,async()=>{const h=harness({teacher:false});assert.equal((await h.request({...save(),action})).status,400);assert.equal(h.writes.length,0)});
test('save valid edit',async()=>{const h=harness();assert.equal((await h.request(save())).status,200);assert.equal(h.writes[0][1].questions[0].en,'Edited');assert.equal(h.writes[0][1].edited_by,'user')});
test('stale revision rejected',async()=>{const h=harness();assert.equal((await h.request(save({revision:1}))).status,409);assert.equal(h.writes.length,0)});
test('concurrent update conflict',async()=>{const h=harness({conflict:true});assert.equal((await h.request(save())).status,409)});
test('invalid correct answer rejected',async()=>{const h=harness();assert.equal((await h.request(save({question:{...question(),correct:5}}))).status,400);assert.equal(h.writes.length,0)});
test('incomplete bilingual options rejected',async()=>{const h=harness();assert.equal((await h.request(save({question:{...question(),opts:[['Sí',''],['No','No']]}}))).status,400)});
test('arbitrary private image path rejected',async()=>{const h=harness();assert.equal((await h.request(save({question:{...question(),imgs:['other/private.jpg']}}))).status,400)});
test('restore previous question',async()=>{const h=harness();const r=await h.request({action:'editor-restore',test:'test',index:0,revision:2,restore:1});assert.equal(r.status,200);assert.equal(h.writes[0][1].questions[0].en,'Original')});
test('existing exam uses pinned version without answer leak',async()=>{const h=harness({teacher:false});const r=await h.request({action:'questions-batch',attempt:'attempt'});assert.equal(r.status,200);assert.equal(r.body.questions[0].en,'Original');assert.equal(r.body.questions[0].correct,undefined);assert.equal(r.body.questions[0].feedback_text,undefined)});
test('existing exam marked against original answer',async()=>{const h=harness({teacher:false});const r=await h.request({action:'finish',attempt:'attempt'});assert.equal(r.status,200);assert.equal(r.body.result.score,1);assert.equal(r.body.questions[0].correct,0)});
test('invalid image rejected',async()=>{const h=harness();assert.equal((await h.request({action:'editor-upload',image:'abcd'})).status,400);assert.equal(h.writes.length,0)});
