import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../student-chat.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../student-chat.js',import.meta.url),'utf8');
test('loading gate is installed before body and module',()=>{assert.ok(html.indexOf("classList.add('sc-restoring-navigation')")<html.indexOf('<body'));assert.match(html,/sessionStorage.getItem\('alnoor-chat-navigation-v2'\)/);assert.match(html,/student-chat.js\?v=4\.8\.6/);});
test('cover hides paint without collapsing layout',()=>{assert.match(html,/html\.sc-restoring-navigation #student-chat \{visibility:hidden\}/);assert.match(html,/position:fixed;inset:0/);assert.match(html,/scrollRestoration='manual'/);});
test('gate removed after restore and on startup failure',()=>{assert.ok(js.indexOf('window.scrollTo({top:saved.scroll')<js.indexOf("finally{document.documentElement.classList.remove('sc-restoring-navigation')"));assert.match(html,/event.target.id==='sc-chat-entry'/);assert.match(js,/catch\(e\)\{status\('Student Chat could not load:/);});
