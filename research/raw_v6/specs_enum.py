import json,subprocess,time
allp=[];seen=set()
for page in range(1,200):
    u=f"https://specs.gg/assets/include/advsearch.php?q[0]=&q[1]=&q[2]=valorant&q[3]=&q[4]=&q[5]=0&q[6]={page}"
    out=subprocess.run(['curl','-g','-sS','-A','Mozilla/5.0',u],capture_output=True,text=True).stdout
    try: d=json.loads(out)
    except Exception as e: print('stop',page,out[:100]);break
    if not d or d[0] is None or not d[0]: print('empty',page);break
    new=0
    for p in d[0]:
        if p['1'] not in seen: seen.add(p['1']);allp.append(p);new+=1
    if new==0: print('no new',page);break
    time.sleep(0.2)
json.dump(allp,open('specs_valorant_players.json','w'))
print(len(allp))
