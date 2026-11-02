#!/usr/bin/env python3
"""Build research/population_v6.{json,md} and research/physics_calibration_v6.{json,md}
from the cached raw extracts in this folder. Deterministic; run: python3 research/raw_v6/build_v6.py
Inputs (all fetched 2026-11-02, see the .md files for URLs):
  list_rows.json            ProSettings Valorant list (parse_prosettings_list.py)
  ps_pages_list.jsonl / ps_pages_senslab.jsonl   ProSettings player pages (ps_pages.py)
  senslab_rows.json         SensLab Valorant table (parse_senslab.py)
  specs_valorant_players.json / specs_profiles.jsonl   specs.gg (specs_enum.py / specs_fetch.py)
  vlr_thread_rows.json      hand-transcribed VLR.gg thread replies
  pad_dims_manual.json      pad sizes from manufacturer / retailer pages seen via search/fetch
"""
import json,math,re,os,statistics as st,collections
HERE=os.path.dirname(os.path.abspath(__file__)); OUT=os.path.dirname(HERE)
ACC='2026-11-02'
def J(n): return json.load(open(os.path.join(HERE,n)))
def JL(n): return [json.loads(l) for l in open(os.path.join(HERE,n))]
def cm360(dpi,sens): return round(914.4/(dpi*sens*0.07),2)
def num(x,kind):
    x=str(x).strip()
    if kind=='dpi' and re.fullmatch(r'\d{1,3}[,.]\d{3}',x): x=x.replace(',','').replace('.','')
    if re.fullmatch(r'\d+,\d+',x): x=x.replace(',','.')   # decimal comma, e.g. '0,3'
    return float(x)
def key(n): return re.sub(r'[^a-z0-9]','',n.lower())
CREATORS={key(x) for x in ['SirMaza','Shanks','PROD','Lothar','Nadeshot','tarik','Mendo','ShahZaM']}
excl=collections.Counter(); excl_examples=collections.defaultdict(list)
def plausible(dpi,sens,name,src):
    s800=dpi*sens/800
    if s800>1.2 or s800<0.08:
        excl[src]+=1; excl_examples[src].append(f'{name} dpi={dpi} sens={sens} s800={s800:.3f}'); return False
    return True
rows=[]; seen={}   # key -> (edpi,source)
def add(name,group,rank,region,dpi,sens,url,src,extra=None):
    if not (dpi and sens): excl[src+':missing_dpi_or_sens']+=1; return
    k=key(name)
    if group=='pro' and k in CREATORS: group='streamer'
    if not plausible(dpi,sens,name,src): return
    e=round(dpi*sens,3)
    if k in seen and k and src!='vlr_thread':
        prev=seen[k]
        excl[f'{src}:duplicate_of_{prev[1]}'+('(same eDPI)' if abs(prev[0]-e)<0.5 else '(DIFFERENT eDPI, kept earlier)')]+=1
        return
    seen[k]=(e,src)
    r=dict(name=name,group=group,rank=rank,region=region,dpi=dpi,sens=sens,cm360=cm360(dpi,sens),source_url=url,accessed=ACC,dataset=src)
    if extra: r.update(extra)
    rows.append(r)
# 1 ProSettings list (+ player page date when we have it)
lst=J('list_rows.json'); pages={}
for fn in ('ps_pages_list.jsonl','ps_pages_senslab.jsonl'):
    for p in JL(fn):
        if p['code']=='200' and p.get('valorant'): pages.setdefault(p['slug'],p)
for r in lst:
    slug=re.search(r'/players/([^/]+)/',r['url']).group(1) if r['url'] else None
    p=pages.get(slug,{})
    add(r['name'],'pro',None,None,int(float(r['dpi'])),float(r['sens']),r['url'] or 'https://prosettings.net/lists/valorant/','prosettings_list',
        dict(team=r['team'],country=r['country'],updated=p.get('updated'),list_url='https://prosettings.net/lists/valorant/'))
# 2 SensLab
for r in J('senslab_rows.json'):
    add(r['name'],'pro',None,None,r['dpi'],r['sens'],r['src_url'],'senslab',
        dict(team=r['team'],updated=r['src_date'],stale=r['outdated'],aggregator_url=r['page'],note='listed as a verified pro on SensLab; tier not independently checked (some listed teams are amateur orgs)'))
# 3 specs.gg
for r in JL('specs_profiles.jsonl'):
    if r.get('code')!='200' or not r.get('dpi'): continue
    try: dpi=int(num(r['dpi'],'dpi')); sens=num(r['sens'],'sens')
    except: excl['specs_gg:unparseable']+=1; continue
    team=r['team'] or None
    add(r['name'],'pro' if team else 'general',None,r['country'] or None,dpi,sens,r['url'],'specs_gg',
        dict(team=team,note=('team listed on specs.gg' if team else 'self-submitted specs.gg profile; rank unknown; may include creators/streamers not on the other lists')))
# 4 VLR thread
v=J('vlr_thread_rows.json')
for r in v['rows']:
    add(r['name'],'general',r['rank'],None,r['dpi'],r['sens'],v['source_url'],'vlr_thread',dict(rank_note=r['rank_note'],note='self-reported forum reply'+(('; '+r['flag']) if r.get('flag') else '')))
pop_method=("Rows come from four sources fetched on %s: ProSettings VALORANT list, SensLab VALORANT pro table (each row's own player-controlled source URL), specs.gg VALORANT profiles "
 "(team-tagged profiles = pro; profiles with no team = general, self-submitted), and replies in a VLR.gg forum thread that give rank, DPI and sens. cm360 = 914.4/(dpi*sens*0.07). "
 "Duplicates across sources are removed by normalised name (earlier source in the order above wins). Implausible rows (s800 = dpi*sens/800 > 1.2 or < 0.08) are excluded and counted."%ACC)
pop=dict(generated=ACC,method=pop_method,rows=rows,binned=[])
json.dump(pop,open(os.path.join(OUT,'population_v6.json'),'w'),indent=1,ensure_ascii=False)
# ---- stats helpers
def q(xs,p):
    xs=sorted(xs); i=(len(xs)-1)*p; lo=math.floor(i); hi=math.ceil(i); return xs[lo]+(xs[hi]-xs[lo])*(i-lo)
def lnfit(xs):
    l=[math.log(x) for x in xs]; return st.mean(l),(st.stdev(l) if len(l)>1 else float('nan'))
def grp_line(name,xs):
    if not xs: return f'| {name} | 0 | | | | | |'
    m,s=lnfit(xs)
    return f'| {name} | {len(xs)} | {st.median(xs):.1f} | {q(xs,.25):.1f} - {q(xs,.75):.1f} | {m:.3f} | {s:.3f} | {math.exp(m):.1f} |'
by=collections.defaultdict(list)
for r in rows: by[r['group']].append(r['cm360'])
by_ds=collections.defaultdict(list)
for r in rows: by_ds[(r['dataset'],r['group'])].append(r['cm360'])
rk=collections.defaultdict(list)
for r in rows:
    if r['dataset']=='vlr_thread': rk[r['rank'] or 'unranked'].append(r['cm360'])
pro_fresh=[r['cm360'] for r in rows if r['group']=='pro' and not r.get('stale')]
md=[]
md.append(f'# Population dataset v6 (D1)\n\nGenerated {ACC} by `research/raw_v6/build_v6.py` from cached extracts in `research/raw_v6/`. Machine-readable rows: `population_v6.json`.\n')
md.append(f'**Rows: {len(rows)}** (target 400; non-pro sources: specs.gg self-submitted profiles and VLR.gg thread replies). Binned/survey data: none found (see Limitations).\n')
md.append('## Method\n\n'+pop_method+'\n')
md.append('## Sources (accessed %s)\n'%ACC)
md.append('- ProSettings VALORANT list: https://prosettings.net/lists/valorant/ (HTML table, 100 rows; fetched with curl and a browser User-Agent, HTTP 200). Player pages https://prosettings.net/players/<slug>/ give the "Last updated" date.\n- SensLab VALORANT pro table: https://senslab.pro/pro-settings/valorant (648 rows; each row links the player-controlled source, usually a stream chat-bot command, with its date; 303 rows are flagged by SensLab as "may be outdated", kept here with `stale: true`).\n- specs.gg: player index via `https://specs.gg/assets/include/advsearch.php?q[2]=valorant&q[6]=<page>` (5373 VALORANT profiles), then each profile `https://specs.gg/<slug>` for DPI/sens/mouse/mousepad. Profiles have no real update date.\n- VLR.gg forum thread: https://www.vlr.gg/245704/rank-and-sensitivity-survey (17 usable replies with rank, DPI and sens).\n')
md.append('## Exclusions\n')
md.append('- Creators removed from "pro" and labelled `streamer`: SirMaza, Shanks, PROD, Lothar, Nadeshot, tarik, Mendo, ShahZaM (same list as `agent_trends_research.md`) wherever they appear in a pro source.\n- Implausible values (s800 > 1.2 or < 0.08), duplicates and missing DPI/sens:\n')
for k,c in sorted(excl.items()): md.append(f'  - `{k}`: {c}')
for s,e in excl_examples.items(): md.append(f'  - examples excluded for implausible value from `{s}`: '+'; '.join(e[:8]))
md.append('\n## Summary statistics (cm/360)\n')
md.append('Log-normal fit = mean and SD (sample, n-1) of ln(cm/360); `exp(mean)` is the geometric mean. IQR is the 25th-75th percentile (linear interpolation).\n')
md.append('| Group | n | Median | IQR | mean ln | SD ln | exp(mean) |\n|---|---|---|---|---|---|---|')
for g in ('pro','streamer','general'): md.append(grp_line(g,by.get(g,[])))
md.append(grp_line('pro, excluding SensLab-stale rows',pro_fresh))
md.append(grp_line('all rows',[r['cm360'] for r in rows]))
md.append('\n### By dataset and group\n\n| Dataset / group | n | Median | IQR | mean ln | SD ln | exp(mean) |\n|---|---|---|---|---|---|---|')
for (d,g),xs in sorted(by_ds.items()): md.append(grp_line(f'{d} / {g}',xs))
md.append('\n### Ranked self-reports (VLR.gg thread only)\n\n| Rank | n | Median | IQR | mean ln | SD ln | exp(mean) |\n|---|---|---|---|---|---|---|')
for g in ('bronze','silver','gold','platinum','diamond','ascendant','immortal','radiant','unranked'):
    if g in rk: md.append(grp_line(g,rk[g]))
md.append('\nRank groups are tiny; do not fit per-rank priors from them.\n')
md.append('## Limitations\n')
md.append('''- **No rank-stratified population data was found.** Searches (reddit, VLR, guide sites) found no published survey or binned eDPI-by-rank table; guide sites quoting "recommended ranges by rank" cite no data. Reddit blocked automated access (HTTP 302). `binned` is therefore empty.
- The only ranked rows are 17 self-reported forum replies from about three years ago (one is a disputed 20,000 DPI claim). They cannot support per-rank priors.
- The "general" group is self-submitted specs.gg profiles. Users who make a profile are not a random sample of players; rank is unknown; profiles are unverified and may include creators or pros missing from team lists, or trolls. Profile data has no update date.
- "Pro" rows come from aggregators. SensLab rows include amateur-org players and 303 rows flagged stale (up to 2020). The tier (pro vs semi-pro) was not verified, so no "semi-pro" group is reported.
- Sources overlap and rows were de-duplicated by normalised handle only. Two different people with the same handle would be merged; the kept row is the earlier source.
- Pros are on average lower sensitivity (higher cm/360) than the general profile group; a prior for ordinary players should lean on the "general" row, with the above selection caveats.
- cm/360 assumes Valorant yaw 0.07 deg/count and ignores Windows scaling, raw-input and scoped sensitivity.
''')
open(os.path.join(OUT,'population_v6.md'),'w').write('\n'.join(md))
print('population rows',len(rows),{g:len(x) for g,x in by.items()})
# ================= physics
man=J('pad_dims_manual.json')['pads']
def dim(s):
    return float(re.sub(r'[^\d.]','',s))
phys=[]; pads={}; pseen=set(); pexcl=collections.Counter()
def pad_from_spec(name,spec,url):
    a=dim(spec['Height']); b=dim(spec['Length']); w,h=max(a,b),min(a,b)
    return w,h
for slug,p in pages.items():
    if not p.get('dpi') or not p.get('sens'): pexcl['ps_page_no_dpi_sens']+=1; continue
    title=re.sub(r' VALORANT Settings.*','',p['title']).replace('&amp;','&')
    k=key(title)
    if k in pseen: pexcl['ps_page_duplicate_name']+=1; continue
    pseen.add(k)
    if not plausible(p['dpi'],p['sens'],title,'physics_ps'): continue
    padn=p.get('pad_name'); w=None; note=None
    if padn and p.get('pad_spec'):
        w0,h0=pad_from_spec(padn,p['pad_spec'],p['url'])
        if w0>100: note=f'ProSettings spec for this pad reads {p["pad_spec"]["Height"]} x {p["pad_spec"]["Length"]}, too large for a desk pad; width set to null'; pexcl['pad_spec_implausible(>100cm)']+=1
        elif w0<30: note=f'ProSettings spec for this pad reads {p["pad_spec"]["Height"]} x {p["pad_spec"]["Length"]}, too small for a desk pad; width set to null'; pexcl['pad_spec_implausible(<30cm)']+=1
        elif padn=='Logitech G740': note='ProSettings spec (%s x %s) conflicts with retailer listings (460 x 600 mm); width set to null'%(p['pad_spec']['Height'],p['pad_spec']['Length']); pexcl['pad_spec_conflict_G740']+=1
        else:
            w=w0; pads.setdefault(padn,dict(width_cm=w0,height_cm=h0,source_url=p['url']))
    elif padn is None: pexcl['ps_page_pad_without_spec']+=1
    mw=None
    if p.get('mouse_weight'):
        m=re.match(r'(\d+(?:\.\d+)?)g',p['mouse_weight']); mw=float(m.group(1)) if m else None
    phys.append(dict(name=title,dpi=p['dpi'],sens=p['sens'],cm360=cm360(p['dpi'],p['sens']),pad_model=padn or p.get('pad_name_nospec'),pad_width_cm=w,
        mouse_model=p.get('mouse_gear_name') or p.get('mouse_name'),mouse_g=mw,aim_style=None,aim_style_source=None,settings_url=p['url'],accessed=ACC,dataset='prosettings_player_page',
        updated=p.get('updated'),**({'pad_note':note} if note else {})))
# specs.gg rows with explicit-size pad names
ps_pad_by_name={n:v for n,v in pads.items()}
ALLOW_PS={'ZOWIE G-SR'}
nsp=0
for r in JL('specs_profiles.jsonl'):
    if r.get('code')!='200' or not r.get('dpi') or not r['mousepads']: continue
    k=key(r['name'])
    if k in pseen: continue
    try: dpi=int(num(r['dpi'],'dpi')); sens=num(r['sens'],'sens')
    except: continue
    pn=None
    for cand in r['mousepads']:
        if cand in man or (cand in ALLOW_PS and cand in ps_pad_by_name): pn=cand;break
    if pn is None: continue
    if not plausible(dpi,sens,r['name'],'physics_specs'): continue
    pseen.add(k)
    if pn in man: w=man[pn]['width_cm']; pads.setdefault(pn,dict(width_cm=w,height_cm=man[pn]['height_cm'],source_url=man[pn]['source_url']))
    else: w=ps_pad_by_name[pn]['width_cm']
    phys.append(dict(name=r['name'],dpi=dpi,sens=sens,cm360=cm360(dpi,sens),pad_model=pn,pad_width_cm=w,mouse_model=r.get('mouse'),mouse_g=None,aim_style=None,aim_style_source=None,
        settings_url=r['url'],accessed=ACC,dataset='specs_gg_profile',pad_source_url=pads[pn]['source_url']))
phys_doc=dict(generated=ACC,pads=pads,rows=phys)
json.dump(phys_doc,open(os.path.join(OUT,'physics_calibration_v6.json'),'w'),indent=1,ensure_ascii=False)
# ---- physics stats
def ranks(x):
    o=sorted(range(len(x)),key=lambda i:x[i]); r=[0]*len(x); i=0
    while i<len(o):
        j=i
        while j+1<len(o) and x[o[j+1]]==x[o[i]]: j+=1
        for t in range(i,j+1): r[o[t]]=(i+j)/2+1
        i=j+1
    return r
def spearman(a,b):
    ra,rb=ranks(a),ranks(b); ma,mb=st.mean(ra),st.mean(rb)
    num=sum((x-ma)*(y-mb) for x,y in zip(ra,rb)); den=math.sqrt(sum((x-ma)**2 for x in ra)*sum((y-mb)**2 for y in rb))
    return num/den if den else float('nan')
def spearman_p(rho,n):
    # permutation-free t approximation
    if n<4 or abs(rho)>=1: return float('nan')
    t=rho*math.sqrt((n-2)/(1-rho*rho)); 
    # two-sided p from t via normal approx of Student t using incomplete beta is overkill; use exact via math (regularized beta by series)
    from math import lgamma
    x=(n-2)/((n-2)+t*t)
    def betacf(a,b,x):
        qab=a+b;qap=a+1;qam=a-1;c=1;d=1-qab*x/qap;d=1/d if abs(d)>1e-30 else 1e30;h=d
        for m in range(1,300):
            m2=2*m;aa=m*(b-m)*x/((qam+m2)*(a+m2));d=1+aa*d;d=1/d if abs(d)>1e-30 else 1e30;c=1+aa/c;h*=d*c
            aa=-(a+m)*(qab+m)*x/((a+m2)*(qap+m2));d=1+aa*d;d=1/d if abs(d)>1e-30 else 1e30;c=1+aa/c;de=d*c;h*=de
            if abs(de-1)<1e-12:break
        return h
    a=(n-2)/2;b=0.5
    bt=math.exp(lgamma(a+b)-lgamma(a)-lgamma(b)+a*math.log(x)+b*math.log(1-x))
    return bt*betacf(a,b,x)/a if x<(a+1)/(a+b+2) else 1-bt*betacf(b,a,1-x)/b
W=[r for r in phys if r['pad_width_cm']]
n=len(W); lw=[math.log(r['pad_width_cm']) for r in W]; lc=[math.log(r['cm360']) for r in W]
rho=spearman(lw,lc); p=spearman_p(rho,n)
def tercile_rows(R):
    ws=sorted(r['pad_width_cm'] for r in R); c1,c2=q(ws,1/3),q(ws,2/3)
    g=[[],[],[]]
    for r in R: g[0 if r['pad_width_cm']<=c1 else (1 if r['pad_width_cm']<=c2 else 2)].append(r)
    return c1,c2,g
c1,c2,g=tercile_rows(W)
def sub(R):
    if len(R)<4: return float('nan'),float('nan')
    return spearman([math.log(r['pad_width_cm']) for r in R],[math.log(r['cm360']) for r in R]),len(R)
srcgroups=collections.defaultdict(list)
for r in W: srcgroups[r['dataset']].append(r)
mg=[r for r in phys if r['mouse_g']]
ml=[math.log(r['mouse_g']) for r in mg]; mc=[math.log(r['cm360']) for r in mg]
rho_m=spearman(ml,mc) if len(mg)>3 else float('nan')
# multivariate (OLS) ln cm360 ~ ln width, pro rows only? small: simple slope of ln cm360 on ln width
def ols(x,y):
    mx,my=st.mean(x),st.mean(y); b=sum((a-mx)*(c-my) for a,c in zip(x,y))/sum((a-mx)**2 for a in x); return my-b*mx,b
a0,b0=ols(lw,lc)
aim=[r for r in phys if r['aim_style']]
pm=[]
pm.append(f'# Physics calibration dataset v6 (D2)\n\nGenerated {ACC} by `research/raw_v6/build_v6.py`. Rows: `physics_calibration_v6.json`; pad table in the same file under `pads`.\n')
pm.append(f'**Rows: {len(phys)}; with pad width: {n}** (target 120); rows with mouse weight: {len(mg)}; rows with aim_style: {len(aim)}.\n')
pm.append('## Method\n')
pm.append('''- **ProSettings player pages** (`https://prosettings.net/players/<slug>/`): one page per player gives VALORANT DPI and sens, the mouse (with weight in g) and the mousepad with its listed dimensions ("Height" and "Length" in cm). Pages were found for the 100 players on the ProSettings VALORANT list and for 600 candidate slugs derived from the SensLab handle list (362 returned 404; the rest were checked to have a VALORANT settings title).
- **Pad width** = the longer of ProSettings' two numbers (they are not consistently ordered; cross-checks: QcK Heavy XXL page 40x90 vs 900x400 mm from SteelSeries/retailers, Artisan FX Zero XL 42x49 vs 490x420 mm from jpgamingusa.com). The page the pad was read from is the row's `settings_url`; the first page per model is `pads[model].source_url`.
- **specs.gg community profiles** (`https://specs.gg/<slug>`) give DPI, sens, mouse and mousepad name but not size. Rows were added only when the pad name states a single known size that was looked up on a manufacturer/retailer page seen during this task (`raw_v6/pad_dims_manual.json`: Artisan FX Zero XL, SteelSeries QcK Heavy Large and XXL, Logitech G640 Large) or equals the ProSettings pad `ZOWIE G-SR`. Pad names without a size (for example "Razer Gigantus V2", "X-Raypad Aqua Control Plus White") were NOT given a width.
- Same exclusions as the population set (s800 > 1.2 or < 0.08). Rows are de-duplicated by normalised name (ProSettings page wins).
- `aim_style` is null in every row: no source found (see Limitations).
''')
pm.append('## Exclusions and nulls\n')
for k,c in sorted(pexcl.items()): pm.append(f'- `{k}`: {c}')
for s,e in excl_examples.items():
    if s.startswith('physics'): pm.append(f'- implausible sens, `{s}`: '+'; '.join(e))
pm.append('\n## Pads\n\n| Pad model | width cm | height cm | source |\n|---|---|---|---|')
for nme,v in sorted(pads.items()): pm.append(f'| {nme} | {v["width_cm"]:g} | {v["height_cm"]:g} | {v["source_url"]} |')
pm.append('\n## Statistics\n')
pm.append(f'- n with pad width: **{n}** (ProSettings pages: {len(srcgroups["prosettings_player_page"])}, specs.gg: {len(srcgroups["specs_gg_profile"])}).')
pm.append(f'- **Spearman correlation of ln cm360 with ln pad width: rho = {rho:.3f}** (n = {n}; two-sided p ~ {p:.3g}, t approximation).')
for d,R in srcgroups.items():
    r_,n_=sub(R); pm.append(f'  - within `{d}`: rho = {r_:.3f} (n = {n_})')
pm.append(f'- OLS slope of ln cm360 on ln pad width: {b0:.3f} (intercept {a0:.3f}); i.e. a 10% wider pad goes with {100*(1.1**b0-1):.1f}% change in cm/360 (descriptive only; pad choice is confounded with player style and region).')
pm.append(f'- Spearman, ln cm360 with ln mouse weight (rows with weight): rho = {rho_m:.3f}, n = {len(mg)}.')
pm.append(f'\n### Median cm/360 by pad-width tercile (cut points {c1:.1f} and {c2:.1f} cm; groups use <= cut)\n\n| Tercile | pad widths (cm) | n | median cm/360 | IQR |\n|---|---|---|---|---|')
for i,nm in enumerate(('low','mid','high')):
    R=g[i]; xs=[r['cm360'] for r in R]; ws=[r['pad_width_cm'] for r in R]
    pm.append(f'| {nm} | {min(ws):g}-{max(ws):g} | {len(R)} | {st.median(xs):.1f} | {q(xs,.25):.1f} - {q(xs,.75):.1f} |')
pm.append('\n### Median cm/360 by exact pad width\n\n| width cm | n | median cm/360 |\n|---|---|---|')
bw=collections.defaultdict(list)
for r in W: bw[r['pad_width_cm']].append(r['cm360'])
for w_,xs in sorted(bw.items()): pm.append(f'| {w_:g} | {len(xs)} | {st.median(xs):.1f} |')
pm.append('\n### By aim_style\n\nNo aim_style values exist in the dataset (0 rows), so no per-group medians can be given.\n')
pm.append('## Limitations\n')
pm.append('''- **Aim style (wrist/arm) was not found for any player.** ProSettings and specs.gg do not record it. Web searches only returned guide articles and forum threads that talk about wrist vs arm aiming in general or give unsourced percentages; none names players. All `aim_style` fields are null.
- Pad width is the pad's listed size, not the usable travel (desk space, mouse-bungee, how far the player actually swipes). Orientation of the ProSettings dimension fields is inconsistent, so the longer side is used as width.
- ProSettings lists a pad model, and ProSettings sizes can disagree with other listings: Logitech G740 (ProSettings 46 x 37.5 cm vs 460 x 600 mm at retailers) and Artisan Ninja FX Zero "Soft Black"/"TenZ" (spec reads 24 x 21 cm) were set to null width.
- Mostly pros (ProSettings pages) plus self-submitted specs.gg profiles with a sized pad name. Pad choice is self-selected, so any correlation measures association, not the effect of pad size on sensitivity.
- Mouse weight is only available from ProSettings pages (spec of the mouse model, not the player's modification).
- The specs.gg rows are unverified and undated.
''')
open(os.path.join(OUT,'physics_calibration_v6.md'),'w').write('\n'.join(pm))
print('physics rows',len(phys),'with width',n,'rho',round(rho,3),'weights',len(mg))
