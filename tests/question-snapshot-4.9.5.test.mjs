import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
import {sameVisibleQuestion,wrapText,snapshotFilename} from '../learning/question-snapshot.js';
const src=stripTypeScriptTypes(readFileSync(new URL('../supabase/functions/learning/index.ts',import.meta.url),'utf8').replace(/^import .*\n/gm,''));
const old={es:'Pregunta',en:'Question',opts:[['Uno','One'],['Dos','Two']],correct:1,imgs:['old.jpg'],refs:['reference.jpg'],feedback_text:'Private feedback'};
const latest={...old,correct:0,imgs:['new.jpg']};
function harness(role='admin',owner='actor'){
 let handler;const calls=[];
 const data={learn_attempts:{id:'a',user_id:owner,test_id:'t',test_revision:1},learn_tests:{id:'t',name:'Test 32',number:32,revision:2,questions:[latest]},learn_test_revisions:{questions:[old]}};
 const admin={from(name){calls.push(name);const q={select(){return q},eq(){return q},single:async()=>({data:data[name]})};return q;},storage:{from(){return {createSignedUrl:async path=>({data:{signedUrl:'https://example.org/'+path}}),download:async path=>{calls.push(path);return {data:new Blob([Uint8Array.of(255,216,255,217)])}}}}}};
 vm.runInNewContext(src,{Deno:{serve:f=>handler=f},context:async()=>({admin,user:{id:'actor'},profile:{role},reply:(body,status=200)=>({body,status})}),checked:r=>{if(r.error)throw Error(r.error);return r.data},requireValue:(v,m)=>{if(!v)throw Error(m)},uuid:v=>typeof v==='string',console:{error(){}},Uint8Array,btoa,Blob});
 return {calls,request:(action,extra={})=>handler({text:async()=>JSON.stringify({action,attempt:'a',index:0,...extra})})};
}
test('student denied before reading attempts',async()=>{const h=harness('student');assert.equal((await h.request('question-snapshot')).status,400);assert.equal(h.calls.length,0);});
test('other user attempt denied',async()=>{const h=harness('admin','other');assert.equal((await h.request('question-snapshot')).status,400);});
test('original revision correct answer and images preserved; no reference',async()=>{const h=harness();const r=await h.request('question-snapshot');assert.equal(r.status,200);assert.equal(r.body.question.correct,1);assert.equal(r.body.question.imgs[0],'https://example.org/old.jpg');assert.equal(r.body.question.refs,undefined);assert.equal(r.body.test.revision,1);});
test('edited preview uses latest revision',async()=>{const r=await harness().request('question-snapshot',{edited:true});assert.equal(r.body.question.correct,0);assert.equal(r.body.test.revision,2);});
test('invalid question rejected',async()=>{assert.equal((await harness().request('question-snapshot',{index:2})).status,400);});
test('old image fallback reads same revision',async()=>{const h=harness();const r=await h.request('export-image',{test:'t',revision:1,image:0,field:'imgs'});assert.equal(r.status,200);assert.ok(h.calls.includes('old.jpg'));});
test('image fallback rejects incorrect revision',async()=>{assert.equal((await harness().request('export-image',{test:'t',revision:2,image:0,field:'imgs'})).status,400);});
test('existing backup export still accepts current revision',async()=>{const h=harness();const r=await h.request('export-image',{attempt:undefined,test:'t',revision:2,image:0,field:'imgs'});assert.equal(r.status,200);assert.ok(h.calls.includes('new.jpg'));});
test('visible comparison respects selected language and edited answer',()=>{assert.equal(sameVisibleQuestion({...old,en:''},old,{es:true,en:false}),true);assert.equal(sameVisibleQuestion(old,latest,{es:true,en:true,edited:true}),false);assert.equal(sameVisibleQuestion({...old,es:'Changed'},old,{es:true,en:true}),false);});
test('wrapping handles long words and paragraphs',()=>{const ctx={measureText:s=>({width:s.length})};assert.deepEqual(wrapText(ctx,'abc def\nabcdefgh',5),['abc','def','abcde','fgh']);assert.equal(snapshotFilename({number:32},0),'AL-NOOR-Test-32-Q01.jpg');});
