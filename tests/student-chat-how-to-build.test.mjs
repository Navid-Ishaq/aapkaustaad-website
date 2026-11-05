import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
import {chapterTitles, slugify, safeHref} from '../student-chat-how-to-build-markdown.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read=name=>readFileSync(resolve(root,name),'utf8');

test('student chat banner links to separate public reader and English notice is present',()=>{
 const html=read('student-chat.html');
 assert.match(html,/class="sc-how-built-link" href="student-chat-how-to-build\.html"/);
 assert.match(html,/For admission or registration enquiries, please contact/);
 assert.doesNotMatch(html,/Admission ya registration ke liye/);
 for(const id of ['login-panel','workspace','admin-panel','owner-panel','message-form','class-sidebar','account-actions','status'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/student-chat\.js/);
});

test('new reader includes independent document controls without chat JS or Supabase access',()=>{
 const html=read('student-chat-how-to-build.html');
 for(const key of ['sc-build-progress','sc-build-percent','sc-build-toc-links','sc-build-search','sc-build-mobile-select','sc-build-article'])assert.match(html,new RegExp('id="'+key+'"'));
 assert.match(html,/student-chat-how-to-build\.js/);
 assert.doesNotMatch(html,/src="student-chat\.js"/);
 assert.doesNotMatch(html,/supabase\/functions|chat-media/);
});

test('report is Markdown source of truth, with date, chapters and an update',()=>{
 const md=read('docs/student-chat-development/DEVELOPMENT_JOURNEY.md');
 assert.match(md,/# Building AL-NOOR Student Chat/);
 assert.match(md,/## 18\. What we learned together/);
 assert.match(md,/## Development updates/);
 assert.match(md,/5 November 2026, 12:03 CET/);
 assert.ok(chapterTitles(md).length>=20);
 assert.ok(existsSync(resolve(root,'docs/student-chat-development/MAINTENANCE_GUIDE.txt')));
 assert.ok(existsSync(resolve(root,'.nojekyll')));
});

test('chapter slugs and links are deterministic; unsafe protocols are rejected',()=>{
 assert.equal(slugify('4. “Remove” and “Revoke” exposed a missing recovery journey'),'4-remove-and-revoke-exposed-a-missing-recovery-journey');
 assert.equal(safeHref('javascript:alert(1)'),null);
 assert.equal(safeHref('data:text/html,%3Cscript%3E'),null);
 assert.equal(safeHref('https://github.com/Navid-Ishaq/aapkaustaad-website'),'https://github.com/Navid-Ishaq/aapkaustaad-website');
 assert.equal(safeHref('#chapter-one'),'#chapter-one');
});

test('style isolates public reader and supports reduced-motion and mobile',()=>{
 const css=read('student-chat-how-to-build.css');
 assert.match(css,/\.sc-build-progress\{position:sticky/);
 assert.match(css,/\.sc-build-toc\{position:sticky/);
 assert.match(css,/\.sc-build-mobile-nav\{display:block;position:sticky/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(read('student-chat-build-banner.css'),/\.sc-how-built-link/);
});
