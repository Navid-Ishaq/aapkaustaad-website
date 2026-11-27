import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../learning/app.js',import.meta.url),'utf8');
const editor=readFileSync(new URL('../learning/mcq-editor.js',import.meta.url),'utf8');
const fn=app.slice(app.indexOf('function applyTeacherEdits('),app.indexOf('function questionPanel('));
function setup(teacher=true){const a={t:{id:'test'},index:0,all:true,questions:[{imgs:['old'],correct:0},{imgs:[]}],answers:{0:0}};let renders=0;const ctx={account:{teacher},attempt:a,$:()=>({getBoundingClientRect:()=>({top:10})}),window:{scrollY:30,scrollBy(){},scrollTo(){}},render(){renders++}};vm.createContext(ctx);vm.runInContext(fn,ctx);return {a,ctx,apply:(x)=>ctx.applyTeacherEdits(a,x),renders:()=>renders};}
const change={testId:'test',index:0,question:{imgs:['private-new'],refs:[],correct:1,feedback_text:'new'},previews:{imgs:['signed-new'],refs:[]}};
test('saved image replaces original in teaching overlay without changing scoring',()=>{const h=setup();h.apply([change]);assert.equal(h.a.teacherEdits[0].question.imgs[0],'signed-new');assert.equal(h.a.questions[0].imgs[0],'old');assert.equal(h.a.answers[0],0);assert.equal(h.renders(),1)});
test('student cannot receive teaching overlay',()=>{const h=setup(false);h.apply([change]);assert.equal(h.a.teacherEdits,undefined)});
test('unrelated test and stale attempt ignored',()=>{const h=setup();h.apply([{...change,testId:'other'}]);h.ctx.attempt={};h.apply([change]);assert.equal(h.renders(),0)});
test('multiple saves and image removal replace overlay',()=>{const h=setup();h.apply([change,{...change,index:1}]);h.apply([{...change,previews:{imgs:[],refs:[]}}]);assert.equal(h.a.teacherEdits[0].question.imgs.length,0);assert.equal(h.a.teacherEdits[1].question.imgs[0],'signed-new')});
test('editor notifies on close after save or restore, not on draft editing',()=>{assert.match(editor,/if\(savedQuestions.size\)onSaved\?\.\(\[\.\.\.savedQuestions.values\(\)\]\)/);assert.equal((editor.match(/rememberSaved\(\);/g)||[]).length,2)});
