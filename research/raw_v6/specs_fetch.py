"""Fetch specs.gg Valorant profile pages (slugs from specs_valorant_players.json) and extract mouse/DPI/sens/mousepad.
Writes specs_profiles.jsonl (one line per profile). Re-runnable; skips slugs already done."""
import json,re,subprocess,sys,os,html,urllib.parse
from concurrent.futures import ThreadPoolExecutor
players=json.load(open('specs_valorant_players.json'))
out='specs_profiles.jsonl'
done=set()
if os.path.exists(out):
    for l in open(out):
        try: done.add(json.loads(l)['slug'])
        except: pass
def pairs(h):
    return re.findall(r'<span class="__main">([^<]*)</span></div>\s*<div class="col-12"><span class="__sub1">([^<]*)</span>',h)
def fetch(p):
    slug=p['1']
    url='https://specs.gg/'+urllib.parse.quote(slug)
    for _ in range(3):
        r=subprocess.run(['curl','-sSL','-m','30','-A','Mozilla/5.0','-w','\n__CODE__%{http_code}',url],capture_output=True,text=True)
        h=r.stdout; code=h.rsplit('__CODE__',1)[-1].strip() if '__CODE__' in h else '0'
        h=h.rsplit('\n__CODE__',1)[0]
        if code=='200': break
    rec=dict(slug=slug,name=p['0'],team=p['3'],country=p['2'],url=url,code=code)
    if code=='200':
        i=h.find('Mouse Settings'); j=h.find('Crosshair Settings')
        seg=h[i:j] if i>=0 else ''
        pr=dict(pairs(seg)) 
        rec['mouse']=(re.search(r'<img src="/assets/img/gear/mouse/([^"]*?)\.png"',seg) or [0,None])[1]
        rec['dpi']=pr.get('DPI'); rec['sens']=pr.get('Sensitivity'); rec['edpi']=pr.get('eDPI')
        rec['has_valorant']=i>=0
        rec['mousepads']=re.findall(r'<h3 class="gear-name">([^<]*)</h3>\s*<img src="/assets/img/gear/mousepad/',h)
        rec['mice_gear']=re.findall(r'<h3 class="gear-name">([^<]*)</h3>\s*<img src="/assets/img/gear/mouse/',h)
        rec['title']=(re.search(r'<title>([^<]*)',h) or [0,None])[1]
    return rec
todo=[p for p in players if p['1'] not in done]
print(len(todo),'todo',flush=True)
with ThreadPoolExecutor(8) as ex, open(out,'a') as f:
    for k,r in enumerate(ex.map(fetch,todo)):
        f.write(json.dumps(r)+'\n'); f.flush()
        if k%200==0: print(k,flush=True)
