import re,html,json,sys
h=open(sys.argv[1]).read()
tb=h[h.find('<tbody'):h.find('</tbody>')]
rows=[]
def t(x): return html.unescape(re.sub(r'<[^>]+>','',x)).replace(' ',' ').replace('\xa0',' ').strip()
for tr in re.findall(r'<tr>(.*?)</tr>',tb,re.S):
    th=re.search(r'<th[^>]*>(.*?)</th>',tr,re.S).group(1)
    tds=re.findall(r'<td[^>]*>(.*?)</td>',tr,re.S)
    if len(tds)<6: continue
    href=re.search(r'href="([^"]*)"',th); src=re.search(r'href="([^"]*)"',tds[5])
    rows.append(dict(name=t(th),page=('https://senslab.pro'+href.group(1)) if href else None,team=t(tds[0]),sens=float(t(tds[1]).replace(' ','')),dpi=int(t(tds[2]).replace(' ','')),edpi=float(t(tds[3]).replace(' ','')),cm360=float(t(tds[4])),src_url=src.group(1) if src else None,src_date=t(tds[5]).split('·')[0].strip(),outdated='may be outdated' in tds[5]))
json.dump(rows,open(sys.argv[2],'w'),indent=1)
print(len(rows),sum(r['outdated'] for r in rows),sum(1 for r in rows if r['src_url']))
