import re,sys,json,html
h=open(sys.argv[1]).read()
tb=h[h.find('<tbody>'):h.find('</tbody>')]
rows=[]
for tr in re.findall(r'<tr>(.*?)</tr>',tb,re.S):
    tds=re.findall(r'<td>(.*?)</td>',tr,re.S)
    if len(tds)<16: continue
    def t(x): return html.unescape(re.sub(r'<[^>]+>','',x)).strip()
    m=re.search(r'href="([^"]*/players/[^"]*)"',tds[2])
    rows.append(dict(team=t(tds[1]),name=t(tds[2]),url=m.group(1) if m else None,country=(re.search(r'alt="([^"]*)"',tds[2]) or [0,None])[1],mouse=t(tds[3]),hz=t(tds[4]),dpi=t(tds[5]),sens=t(tds[6]),edpi=t(tds[7]),mousepad=t(tds[13])))
json.dump(rows,open(sys.argv[2],'w'),indent=1)
print(len(rows),sum(1 for r in rows if r['mousepad']),sum(1 for r in rows if r['mouse']))
