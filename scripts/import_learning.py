"""Local trusted importer. Never commit source JSON/XML or credentials."""
import argparse, base64, getpass, hashlib, io, json, os, re, urllib.request, urllib.error
from pathlib import Path
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('file',type=Path);p.add_argument('--course',default='DRV-B');p.add_argument('--section',default='General Tests');p.add_argument('--publish',action='store_true');p.add_argument('--minutes',type=int,default=30);p.add_argument('--max-errors',type=int,default=3);p.add_argument('--url', required=True, help='Explicit Supabase API URL');p.add_argument('--production',action='store_true',help='Allow the academy production endpoint after confirmation');a=p.parse_args()
url=a.url.rstrip('/')
if url not in ('http://127.0.0.1:54321','http://localhost:54321'):
    if url!='https://wxgtrydzkrlimmlnvhdk.supabase.co' or not a.production:raise SystemExit('Refusing non-local target without explicit production approval')
    if input('Type PRODUCTION to authorize production import: ')!='PRODUCTION':raise SystemExit('Cancelled')
key=os.environ.get('ALNOOR_IMPORT_KEY') or getpass.getpass('Supabase service_role / secret key (hidden): ')
if not key:raise SystemExit('Missing key')
def req(path,method='GET',data=None,ctype='application/json',extra=None):
    h={'apikey':key,'Content-Type':ctype,**(extra or {})}
    if not key.startswith('sb_secret_'):h['Authorization']='Bearer '+key
    if data is not None and not isinstance(data,bytes):data=json.dumps(data,ensure_ascii=False).encode()
    try:
        with urllib.request.urlopen(urllib.request.Request(url+path,data=data,headers=h,method=method),timeout=60) as r:
            raw=r.read();return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:raise RuntimeError(f'HTTP {e.code}: {e.read().decode(errors="replace")[:500]}') from None
from urllib.parse import urlencode
rest='/rest/v1/'
def find(table,**kwargs):return req(rest+table+'?'+urlencode({k:'eq.'+v for k,v in kwargs.items()}))
course=find('learn_courses',code=a.course);assert len(course)==1,'Create course in admin first';section=find('learn_sections',course_id=course[0]['id'],name=a.section);assert len(section)==1,'Create collection first';sid=section[0]['id']
source=json.loads(a.file.read_text(encoding='utf-8'))
for number,questions in source.items():
    assert str(number).isdigit() and int(number)>0 and 1<=len(questions)<=300
    assert 0<=a.max_errors<len(questions)
    for q in questions:
        assert isinstance(q['es'],str) and isinstance(q['en'],str) and len(q['opts'])>=2 and all(len(x)==2 and all(isinstance(t,str) for t in x) for x in q['opts']) and type(q['correct']) is int and 0<=q['correct']<len(q['opts'])
    if find('learn_tests',section_id=sid,number=str(number)):
        print(f'Skipping existing Test {number}; no overwrite');continue
    for q in questions:
        for field in ('imgs','refs'):
            out=[]
            for src in q.get(field,[]):
                if src.startswith('https://'):out.append(src);continue
                if not src.startswith('data:image/'):raise ValueError('Unsupported image source')
                raw=base64.b64decode(src.split(',',1)[1],validate=True);im=Image.open(io.BytesIO(raw));im.thumbnail((1600,1600));buf=io.BytesIO();im.convert('RGB').save(buf,format='JPEG',quality=85,optimize=True);raw=buf.getvalue();path=hashlib.sha256(raw).hexdigest()+'.jpg'
                req('/storage/v1/object/alnoor-learning/'+path,'POST',raw,'image/jpeg',{'x-upsert':'true'});out.append(path)
            q[field]=out
    req(rest+'learn_tests','POST',{'section_id':sid,'number':int(number),'name':f'Test {number}','minutes':a.minutes,'max_errors':a.max_errors,'published':a.publish,'questions':questions});print('Imported',number,'published' if a.publish else 'draft')
