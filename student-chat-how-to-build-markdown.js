// A small, dependency-free, safe Markdown reader for our own public development log.
// It builds DOM nodes using textContent rather than inserting Markdown as HTML.
const headingPattern = /^(#{1,3})\s+(.+?)\s*$/;
const isTableDivider = line => /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
const isBullet = line => /^\s*[-*+]\s+/.test(line);
const isNumbered = line => /^\s*\d+[.)]\s+/.test(line);
const blockStart = (line, following = '') => !!(headingPattern.test(line) || /^\s*>\s?/.test(line) || isBullet(line) || isNumbered(line) || /^\s*```/.test(line) || /^\s*(?:---|\*\*\*)\s*$/.test(line) || (line.includes('|') && isTableDivider(following)));
export const slugify = value => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0,75) || 'section';
export function safeHref(input, base = 'https://aapkaustaad.com/student-chat-how-to-build.html') {
  const url = String(input || '').trim();
  if (/^#[a-z0-9_-]+$/i.test(url)) return url;
  try { const parsed = new URL(url, base); return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : null; }
  catch { return null; }
}
export function chapterTitles(markdown) {
  return String(markdown).split(/\r?\n/).filter(line => /^##\s+/.test(line) && !/^##\s+A development journey\b/i.test(line)).map(line => line.replace(/^##\s+/, '').trim());
}
function inline(text, parent) {
  const doc = parent.ownerDocument;
  const pattern = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\[[^\]]+\]\([^\s)]+\)|\*[^*\n]+\*|https?:\/\/[^\s<>()[\]]+)/g;
  let last = 0, match;
  while ((match = pattern.exec(text))) {
    parent.append(doc.createTextNode(text.slice(last, match.index)));
    const token = match[0];
    if (token.startsWith('**')) { const e = doc.createElement('strong'); inline(token.slice(2, -2), e); parent.append(e); }
    else if (token.startsWith('`')) { const e = doc.createElement('code'); e.textContent = token.slice(1, -1); parent.append(e); }
    else if (token.startsWith('*')) { const e = doc.createElement('em'); inline(token.slice(1, -1), e); parent.append(e); }
    else {
      const link = token.startsWith('[') ? /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token) : null;
      const label = link ? link[1] : token.replace(/[.,;:!?]+$/, '');
      const target = safeHref(link ? link[2] : label, doc.baseURI);
      if (target) {
        const a = doc.createElement('a'); a.href = target; a.textContent = label;
        if (a.origin !== doc.location?.origin && !target.startsWith('#')) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
        parent.append(a);
        if (!link && label.length !== token.length) parent.append(doc.createTextNode(token.slice(label.length)));
      } else parent.append(doc.createTextNode(token));
    }
    last = pattern.lastIndex;
  }
  parent.append(doc.createTextNode(text.slice(last)));
}
function tableCells(line) {
  let s = line.trim(); if (s.startsWith('|')) s = s.slice(1); if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split(/(?<!\\)\|/).map(t => t.trim().replace(/\\\|/g, '|'));
}
function paragraph(lines, doc, tag = 'p') {
  const p = doc.createElement(tag);
  lines.forEach((line, i) => {
    if (i) p.append(doc.createElement(lines[i - 1].endsWith('  ') ? 'br' : 'span'));
    if (i && !lines[i - 1].endsWith('  ')) p.lastChild.textContent = ' ';
    inline(line.trimEnd(), p);
  });
  return p;
}
export function renderJourney(markdown, doc = document) {
  const lines = String(markdown).replace(/\r\n?/g, '\n').split('\n');
  const fragment = doc.createDocumentFragment();
  const chapters = [], used = new Set();
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]; if (!line.trim()) {i++; continue;}
    const heading = headingPattern.exec(line);
    if (heading) {
      const level = heading[1].length, title = heading[2]; i++;
      // Title and subtitle already appear in the large page masthead.
      if (level === 1 || (level === 2 && /^A development journey\b/i.test(title))) continue;
      const h = doc.createElement('h'+level); inline(title, h);
      if (level === 2) {
        const root = slugify(title); let id = 'chapter-'+root, n=2;
        while (used.has(id)) id = 'chapter-'+root+'-'+n++;
        used.add(id); h.id = id; chapters.push({id,title,element:h});
      }
      fragment.append(h); continue;
    }
    if (/^\s*```/.test(line)) {
      const lang = line.replace(/^\s*```/, '').trim(); const code=[]; i++;
      while (i<lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i++]);
      if(i<lines.length)i++;
      const pre=doc.createElement('pre'), child=doc.createElement('code'); if(lang)child.className='language-'+slugify(lang);child.textContent=code.join('\n');pre.append(child);fragment.append(pre);continue;
    }
    if (/^\s*(?:---|\*\*\*)\s*$/.test(line)) {fragment.append(doc.createElement('hr'));i++;continue;}
    if (line.includes('|') && isTableDivider(lines[i+1]||'')) {
      const wrap=doc.createElement('div');wrap.className='sc-build-table-wrap';wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Scrollable table');
      const table=doc.createElement('table'), thead=doc.createElement('thead'), headrow=doc.createElement('tr');
      for (const cell of tableCells(line)){const th=doc.createElement('th');inline(cell,th);headrow.append(th);}thead.append(headrow);table.append(thead);
      i+=2;const tbody=doc.createElement('tbody');
      while (i<lines.length && lines[i].trim() && lines[i].includes('|')){
        const tr=doc.createElement('tr');for(const cell of tableCells(lines[i++])){const td=doc.createElement('td');inline(cell,td);tr.append(td);}tbody.append(tr);
      }table.append(tbody);wrap.append(table);fragment.append(wrap);continue;
    }
    if (/^\s*>/.test(line)) {const content=[];while(i<lines.length && /^\s*>/.test(lines[i]))content.push(lines[i++].replace(/^\s*>\s?/,''));const block=doc.createElement('blockquote');block.append(paragraph(content,doc));fragment.append(block);continue;}
    if (isBullet(line) || isNumbered(line)) {
      const numbered=isNumbered(line), list=doc.createElement(numbered?'ol':'ul');
      while(i<lines.length && (numbered?isNumbered(lines[i]):isBullet(lines[i]))){const item=doc.createElement('li');inline(lines[i++].replace(numbered?/^\s*\d+[.)]\s+/:/^\s*[-*+]\s+/,''),item);list.append(item);}
      fragment.append(list);continue;
    }
    const group=[line];i++;
    while(i<lines.length && lines[i].trim() && !blockStart(lines[i],lines[i+1]||''))group.push(lines[i++]);
    fragment.append(paragraph(group,doc));
  }
  return {fragment,chapters};
}
