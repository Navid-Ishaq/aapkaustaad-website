"""Local graphical Moodle uploader. No background watcher, no stored credentials."""
import json, os, re, subprocess, sys, threading, uuid, webbrowser
from pathlib import Path
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

ROOT=Path(__file__).resolve().parent.parent
PRIVATE=ROOT.parent/'private-learning'
URL='https://wxgtrydzkrlimmlnvhdk.supabase.co'
DEFAULTS=PRIVATE/'uploader-defaults.json'
PRIVATE.mkdir(exist_ok=True)
try: saved=json.loads(DEFAULTS.read_text(encoding='utf-8'))
except (OSError,ValueError): saved={}
if not isinstance(saved,dict): saved={}
root=tk.Tk(); root.title('AL NOOR | Test Manager'); root.geometry('760x680'); root.minsize(580,580)
style=ttk.Style(root); style.theme_use('clam'); style.configure('TButton',padding=8); style.configure('TLabel',font=('Segoe UI',10)); style.configure('Header.TLabel',font=('Segoe UI',19,'bold'),foreground='#102d43')
frame=ttk.Frame(root,padding=24); frame.pack(fill='both',expand=True); frame.columnconfigure(1,weight=1)
vars={k:tk.StringVar(value=v) for k,v in dict(xml='',course='DRV-B',section='General Tests',number='',language='both',minutes='30',errors='3').items()}
status=tk.StringVar(value='Select an XML file from your private folder.'); count=tk.StringVar(value='Not converted'); state={'busy':False,'converted':None}
widgets=[]
def invalidate(*_):
    state['converted']=None; upload.config(state='disabled'); count.set('Not converted')
def pick():
    f=filedialog.askopenfilename(initialdir=PRIVATE,filetypes=[('Moodle XML','*.xml')],parent=root)
    if f:
        vars['xml'].set(f); m=re.search(r'(\d+)$',Path(f).stem)
        if m: vars['number'].set(str(int(m.group(1))))
def load_defaults(*_):
    d=saved.get(vars['course'].get().strip().upper(),{})
    if isinstance(d,dict):
        for k in ('section','language','minutes','errors'):
            if k in d: vars[k].set(str(d[k]))
def row(i,label,key,values=None):
    ttk.Label(frame,text=label).grid(row=i,column=0,sticky='w',pady=6,padx=(0,12))
    w=ttk.Combobox(frame,textvariable=vars[key],values=values,state='readonly') if values else ttk.Entry(frame,textvariable=vars[key]); w.grid(row=i,column=1,sticky='ew',pady=6); widgets.append(w); return w
ttk.Label(frame,text='AL NOOR — Test Manager',style='Header.TLabel').grid(row=0,column=0,columnspan=3,sticky='w')
ttk.Label(frame,text='Private Moodle XML  •  Draft import  •  No duplicate overwrite').grid(row=1,column=0,columnspan=3,sticky='w',pady=(4,16))
row(2,'Moodle XML','xml'); browse=ttk.Button(frame,text='Browse…',command=pick); browse.grid(row=2,column=2,padx=(8,0)); widgets.append(browse)
course_entry=row(3,'Course code','course',sorted({'DRV-B',*saved.keys()})); course_entry.configure(state='normal'); defaults=ttk.Button(frame,text='Load defaults',command=load_defaults); defaults.grid(row=3,column=2,padx=(8,0)); widgets.append(defaults)
row(4,'Collection','section'); row(5,'Test number','number'); row(6,'Language','language',['both','es','en']); row(7,'Exam minutes','minutes'); row(8,'Maximum errors','errors')
ttk.Label(frame,text='Questions detected').grid(row=9,column=0,sticky='w'); ttk.Label(frame,textvariable=count).grid(row=9,column=1,sticky='w')
remember=tk.BooleanVar(value=True); cb=ttk.Checkbutton(frame,text='Save settings for this course (no credentials)',variable=remember); cb.grid(row=10,column=0,columnspan=3,sticky='w',pady=8); widgets.append(cb)
log=tk.Text(frame,height=6,wrap='word',font=('Segoe UI',10),state='disabled'); log.grid(row=13,column=0,columnspan=3,sticky='nsew',pady=10); frame.rowconfigure(13,weight=1)
ttk.Label(frame,textvariable=status,wraplength=650).grid(row=14,column=0,columnspan=3,sticky='w')
def report(text):
    log.config(state='normal'); log.insert('end',text+'\n'); log.see('end'); log.config(state='disabled'); status.set(text.splitlines()[-1] if text else '')
def settings():
    d={k:v.get().strip() for k,v in vars.items()}; d['course']=d['course'].upper(); path=Path(d['xml']).resolve()
    if not path.is_file() or path.suffix.lower()!='.xml' or not path.is_relative_to(PRIVATE.resolve()): raise ValueError('Choose an XML file inside private-learning.')
    if not d['course'] or not d['section']: raise ValueError('Course and collection are required.')
    for k,lo,hi in [('number',1,2147483647),('minutes',1,600),('errors',0,299)]:
        if not d[k].isdigit() or not lo<=int(d[k])<=hi: raise ValueError('Invalid '+k)
    d['number']=str(int(d['number'])); d['xml']=str(path); return d
def set_busy(value):
    state['busy']=value
    for w in widgets: w.configure(state='disabled' if value else ('readonly' if isinstance(w,ttk.Combobox) and w is not course_entry else 'normal'))
    convert.configure(state='disabled' if value else 'normal'); upload.configure(state='normal' if not value and state['converted'] else 'disabled')
def task(args,done,env=None,stdin=None):
    set_busy(True)
    def worker():
        try:
            e=os.environ.copy(); e.pop('ALNOOR_IMPORT_KEY',None); e['PYTHONIOENCODING']='utf-8'; e.update(env or {})
            r=subprocess.run([sys.executable,*map(str,args)],cwd=ROOT,env=e,input=stdin,stdin=None if stdin is not None else subprocess.DEVNULL,capture_output=True,text=True,encoding='utf-8',errors='replace',creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
            output=(r.stdout+'\n'+r.stderr).strip(); secret=(env or {}).get('ALNOOR_IMPORT_KEY'); output=output.replace(secret,'[redacted]') if secret else output
            root.after(0,lambda:finish(r.returncode,output))
        except Exception as exc: root.after(0,lambda msg=str(exc):finish(1,msg))
        finally:
            if env: env.clear()
    def finish(rc,out):
        set_busy(False); report(out); done(rc,out)
    threading.Thread(target=worker,daemon=True).start()
def convert_file():
    try: d=settings()
    except Exception as e: messagebox.showerror('Settings',str(e)); return
    out=PRIVATE/'converted'/('test-'+d['number']+'-'+uuid.uuid4().hex+'.json'); state['converted']=None; count.set('Converting…')
    def done(rc,text):
        if rc: count.set('Conversion failed'); messagebox.showerror('Conversion failed',text[-1500:]); return
        try:
            n=len(json.loads(out.read_text(encoding='utf-8'))[d['number']]); count.set(str(n))
            if int(d['errors'])>=n: raise ValueError('Maximum errors must be less than question count.')
            state['converted']=(d,out,n); upload.configure(state='normal')
            if remember.get():
                saved[d['course']]={k:d[k] for k in ('section','language','minutes','errors')}; DEFAULTS.write_text(json.dumps(saved,indent=2),encoding='utf-8')
            report(f'Ready: Test {d["number"]} · {n} questions · Draft only')
        except Exception as e: messagebox.showerror('Review',str(e))
    task([ROOT/'scripts/convert_moodle.py',d['xml'],d['number'],out,'--language',d['language']],done)
def upload_file():
    if not state['converted']: return
    d,out,n=state['converted']
    if not messagebox.askyesno('Production draft import',f'Upload Test {d["number"]} ({n} questions) to {d["course"]} / {d["section"]} as DRAFT? Existing tests are not overwritten.'): return
    webbrowser.open('https://supabase.com/dashboard/project/wxgtrydzkrlimmlnvhdk/settings/api-keys')
    if not messagebox.askokcancel('Private key','Copy the legacy service_role key from the academy Supabase project, then click OK here. Do not paste it into chat.'): return
    try:
        key=root.clipboard_get().strip()
        if not re.fullmatch(r'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+',key): raise ValueError('Copy the legacy service_role key.')
        import base64
        part=key.split('.')[1]; claims=json.loads(base64.urlsafe_b64decode(part+'='*(-len(part)%4)))
        if claims.get('role')!='service_role' or claims.get('ref')!='wxgtrydzkrlimmlnvhdk': raise ValueError('Wrong key role or project.')
    except Exception as e: messagebox.showerror('Key unavailable','Copy the correct academy legacy service_role key.'); return
    finally:
        try: root.clipboard_clear(); root.update_idletasks()
        except tk.TclError: pass
    def done(rc,text):
        if rc: messagebox.showerror('Upload failed',text[-1500:]); return
        if 'Imported '+d['number']+' draft' in text: messagebox.showinfo('Success','Test '+d['number']+' imported as draft. Review in Learning Administration.')
        elif 'Skipping existing Test' in text: messagebox.showinfo('Duplicate','Test already exists; no overwrite.')
        else: messagebox.showwarning('Review result','Importer finished; verify the output before publishing.')
    task([ROOT/'scripts/import_learning.py',out,'--url',URL,'--course',d['course'],'--section',d['section'],'--minutes',d['minutes'],'--max-errors',d['errors'],'--production'],done,{'ALNOOR_IMPORT_KEY':key},'PRODUCTION\n')
convert=ttk.Button(frame,text='Convert & review',command=convert_file); convert.grid(row=11,column=0,sticky='ew',pady=6)
upload=ttk.Button(frame,text='Upload draft',command=upload_file,state='disabled'); upload.grid(row=11,column=1,sticky='ew',pady=6)
ttk.Button(frame,text='Open Learning Administration',command=lambda:webbrowser.open('https://aapkaustaad.com/learning/')).grid(row=12,column=0,columnspan=3,sticky='w')
for v in vars.values(): v.trace_add('write',invalidate)
load_defaults()
root.protocol('WM_DELETE_WINDOW',lambda:messagebox.showinfo('Busy','Wait for the active import or conversion to finish.') if state['busy'] else root.destroy())
root.mainloop()
