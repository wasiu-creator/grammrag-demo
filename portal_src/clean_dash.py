import json
p='portal_data.json'; d=json.load(open(p))
def clean(s):
    if not isinstance(s,str): return s
    return s.replace(' — ', ', ').replace('— ',', ').replace(' —',',').replace('—','-')
def walk(o):
    if isinstance(o,dict): return {k:walk(v) for k,v in o.items()}
    if isinstance(o,list): return [walk(v) for v in o]
    return clean(o)
json.dump(walk(d), open(p,'w'), separators=(',',':'))
print('em dashes in data:', open(p,encoding='utf8').read().count('—'))
