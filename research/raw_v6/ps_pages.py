"""Fetch ProSettings.net player pages and extract VALORANT settings, mouse weight, and mousepad spec.
usage: ps_pages.py slugs.txt out.jsonl   (slug per line). Skips slugs already in out."""
import re,sys,json,html,subprocess,os
from concurrent.futures import ThreadPoolExecutor
def text(h):
    t=re.sub(r'<script.*?</script>|<style.*?</style>','',h,flags=re.S)
    t=re.sub(r'<(?:/?(?:div|p|li|tr|td|th|h\d|section|dialog|button|a|span))[^>]*>','|',t)
    t=re.sub(r'<[^>]+>','',t);t=html.unescape(re.sub(r'\s+',' ',t));t=re.sub(r'(\| ?)+','| ',t)
    return t
def parse(slug):
    url=f'https://prosettings.net/players/{slug}/'
    h='';code='0'
    for _ in range(3):
        r=subprocess.run(['curl','-sSL','-m','40','-A','Mozilla/5.0','-w','\n__CODE__%{http_code}',url],capture_output=True,text=True)
        o=r.stdout
        if '\n__CODE__' in o: h,code=o.rsplit('\n__CODE__',1); code=code.strip()
        if code in('200','404'): break
    rec=dict(slug=slug,url=url,code=code)
    if code!='200': return rec
    t=text(h)
    rec['title']=(re.search(r'<title>([^<]*)',h) or [0,None])[1]
    rec['valorant']='VALORANT Settings' in (rec['title'] or '')
    m=re.search(r'Last updated: ([A-Za-z]+ \d+, \d{4})',t); rec['updated']=m.group(1) if m else None
    i=t.find('VALORANT Settings| VALORANT Settings|'); seg=t[i:i+1200] if i>=0 else ''
    mm=re.search(r'Mouse\| (.*?)\|(?: More from [^|]*\|)? Check price\| DPI\| (\d+)\| Sensitivity\| ([\d.]+)',seg)
    if mm: rec['mouse_name']=mm.group(1); rec['dpi']=int(mm.group(2)); rec['sens']=float(mm.group(3))
    else:
        m2=re.search(r'DPI\| (\d+)\| Sensitivity\| ([\d.]+)',seg)
        if m2: rec['dpi']=int(m2.group(1)); rec['sens']=float(m2.group(2))
    # gear blocks
    j=t.find('Check price',t.find('Mouse Settings') if 'Mouse Settings' in t else 0)
    blocks=t.split('| Check price')
    for b in blocks:
        toks=[x.strip() for x in b.split('|') if x.strip()]
        if not toks: continue
        cat=toks[-1]
        if cat=='Mousepad':
            jb='| '+' | '.join(toks)
            jb='|'.join(['']+[' '+x for x in toks])
            mp=None
            for mp in re.finditer(r'\| ([^|]+)\| (Height|Length)\| ([\d.]+)cm\| (Height|Length)\| ([\d.]+)cm\| Thickness\| ([\d.]+)mm',jb): pass
            if mp:
                rec['pad_name']=mp.group(1).strip(); rec['pad_spec']={mp.group(2):mp.group(3)+'cm',mp.group(4):mp.group(5)+'cm','Thickness':mp.group(6)+'mm'}
            else: rec.setdefault('pad_name_nospec',toks[0])
        if cat=='Mouse' and 'Weight' in toks and 'Sensor' in toks:
            k=toks.index('Sensor'); rec['mouse_gear_name']=toks[k-1]
            rec['mouse_weight']=toks[toks.index('Weight')+1]
    return rec
if __name__=='__main__':
    slugs=[s.strip() for s in open(sys.argv[1]) if s.strip()]
    done=set()
    if os.path.exists(sys.argv[2]):
        for l in open(sys.argv[2]): done.add(json.loads(l)['slug'])
    todo=[s for s in slugs if s not in done]
    print(len(todo),'todo',flush=True)
    with ThreadPoolExecutor(6) as ex, open(sys.argv[2],'a') as f:
        for k,r in enumerate(ex.map(parse,todo)):
            f.write(json.dumps(r)+'\n'); f.flush()
            if k%50==0: print(k,flush=True)
