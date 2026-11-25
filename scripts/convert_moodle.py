"""Convert the academy's supported Moodle MCQ XML format into private JSON. Review before importing."""
import argparse,base64,json,io
from pathlib import Path
from urllib.parse import unquote
from defusedxml.ElementTree import parse
from bs4 import BeautifulSoup
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('xml',type=Path);p.add_argument('number',type=int);p.add_argument('output',type=Path);p.add_argument('--language',choices=['both','es','en'],default='both');a=p.parse_args()
assert a.number>0

def extract(node):
    if node is None:return [],[]
    soup=BeautifulSoup(node.findtext('text') or '', 'html.parser');imgs=[]
    files={f.get('name'):f.text for f in node.findall('file')}
    for im in soup.find_all('img'):
        src=im.get('src','')
        if src.startswith('@@PLUGINFILE@@/') or src.startswith('data:image/'):
            raw=base64.b64decode(files[unquote(src.split('/')[-1])] if src.startswith('@@PLUGINFILE@@/') else src.split(',',1)[1]);img=Image.open(io.BytesIO(raw));img.thumbnail((1600,1600));buf=io.BytesIO();img.convert('RGB').save(buf,'JPEG',quality=85,optimize=True);imgs.append('data:image/jpeg;base64,'+base64.b64encode(buf.getvalue()).decode())
        elif src.startswith('https://'):imgs.append(src)
        else:raise ValueError('Unsupported image source: '+src[:100])
        im.decompose()
    for br in soup.find_all('br'):br.replace_with('\n')
    blocks=soup.find_all(['p','h1','h2','h3','h4','div'],recursive=False)
    lines=[]
    for b in blocks or [soup]:
        lines.extend(' '.join(x.split()) for x in b.get_text().splitlines() if x.strip())
    return lines,imgs

def pair(lines):
    if a.language=='both':
        if len(lines)!=2:raise ValueError('Expected two language lines, got '+str(lines)[:200])
        return lines
    if not lines:raise ValueError('Missing text')
    txt=' '.join(lines);return [txt,''] if a.language=='es' else ['',txt]

questions=[]
for q in parse(a.xml).getroot().findall('question'):
    if q.get('type')=='category':continue
    if q.get('type')!='multichoice':raise ValueError('Unsupported question type: '+str(q.get('type')))
    lines,imgs=extract(q.find('questiontext'));es,en=pair(lines);opts=[];correct=[]
    for i,ans in enumerate(q.findall('answer')):
        lines,ai=extract(ans)
        if ai:raise ValueError('Answer images require manual adaptation')
        opts.append(pair(lines));fraction=float(ans.get('fraction','0'))
        if fraction==100:correct.append(i)
        elif fraction!=0:raise ValueError('Partial credit not supported')
    if len(correct)!=1 or len(opts)<2:raise ValueError('Expected exactly one correct option')
    _,refs=extract(q.find('generalfeedback'))
    questions.append(dict(es=es,en=en,opts=opts,correct=correct[0],imgs=imgs,refs=refs))
if not questions:raise ValueError('No questions found')
a.output.parent.mkdir(parents=True,exist_ok=True)
a.output.write_text(json.dumps({str(a.number):questions},ensure_ascii=False),encoding='utf-8');print(f'Test {a.number}: {len(questions)} questions; review private JSON before upload.')
