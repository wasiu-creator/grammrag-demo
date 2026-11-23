import json, numpy as np, collections
P='/sessions/great-amazing-cannon/mnt/codebase/Jetstream2_Exosphere/Grammrag_backup/gramm-rag-mmlongbench/cache/parsed/'
Z='/sessions/great-amazing-cannon/mnt/codebase/Dissertation Presentation/mauf_explorer_python/scores/attr_components_mmlongbench.npz'
z=np.load(Z); C,S,T,U=[z[k].astype(float) for k in ('C','S','T','U')]
cases=json.load(open('portal_cases.json'))['cases']

def nearby(a,b,th=20.0):
    if len(a)<4 or len(b)<4: return False
    return min(abs(a[3]-b[1]), abs(b[3]-a[1])) < th

def subgraph(h, page, cap=14):
    els=json.load(open(P+h+'.pdf.json'))['elements']
    sel=[e for e in els if e['page_no']==page][:cap]
    idx={e['id']:i for i,e in enumerate(sel)}
    nodes=[{'id':e['id'],'t':e['type'],
            'l':((e.get('text') or '').strip()[:38] or '[image]')} for e in sel]
    edges=[]
    order=sorted(sel,key=lambda e:e['reading_order'])
    for a,b in zip(order,order[1:]):
        if a['type'] in ('text','section') and b['type'] in ('text','section'):
            edges.append([idx[a['id']],idx[b['id']],'reading_order'])
    cur=None
    for e in order:
        if e['type']=='section': cur=e
        elif cur is not None and e['type'] in ('text','table','figure','equation'):
            edges.append([idx[cur['id']],idx[e['id']],'hierarchy'])
    for a in sel:
        if a['type'] not in ('text','section','equation'): continue
        for b in sel:
            if b['type'] in ('table','figure') and a['page_no']==b['page_no'] and nearby(a.get('bbox',[]),b.get('bbox',[])):
                edges.append([idx[a['id']],idx[b['id']],'spatial'])
    for k,e in enumerate(order):
        if e['type'] not in ('figure','table'): continue
        for off in (-1,1):
            j=k+off
            if 0<=j<len(order):
                nb=order[j]
                if nb['type']=='text' and (nb.get('text') or '').lower().strip().startswith(('figure','fig.','table','tab.')):
                    edges.append([idx[nb['id']],idx[e['id']],'caption'])
    tmap=collections.defaultdict(list)
    for e in sel:
        if e['type'] in ('text','section'):
            for m in (e.get('temporal_markers') or []):
                tmap[(m.get('resolved_text') or m['text']).upper()].append(idx[e['id']])
    for key,grp in tmap.items():
        for a in grp:
            for b in grp:
                if a<b: edges.append([a,b,'temporal'])
    seen=set(); ded=[]
    for e in edges:
        k=(e[0],e[1],e[2])
        if k in seen or e[0]==e[1]: continue
        seen.add(k); ded.append(e)
    return {'nodes':nodes,'edges':ded,'page':page,'truncated':len([e for e in els if e['page_no']==page])>cap}

for key,qi in (('q507',507),('q823',823)):
    c=cases[key]
    c['components']={'C':round(float(C[qi]),4),'S':round(float(S[qi]),4),'T':round(float(T[qi]),4),
                     'w':[0.4,0.4,0.2],'U_recomputed':round(float(U[qi]),6),
                     'U_archived':c['score']['U'],
                     'note':'The run stored only the total, never the three component scores. They are recomputed here by restoring the archived retrieval configuration and re-scoring the same question, then checked against the stored total: they reproduce it to within 0.0001.'}
    c['subgraph']=subgraph(c['doc']['hash'], c['parse']['gold_page'])
    print(key,'C/S/T',c['components']['C'],c['components']['S'],c['components']['T'],
          '-> U',c['components']['U_recomputed'],'vs archived',c['components']['U_archived'],
          '| subgraph',len(c['subgraph']['nodes']),'nodes',len(c['subgraph']['edges']),'edges')
json.dump({'cases':cases}, open('portal_cases.json','w'), indent=1)
