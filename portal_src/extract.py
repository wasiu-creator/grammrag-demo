import json, sys, collections, re
sys.path.insert(0,'/sessions/great-amazing-cannon/deck')
import _metrics as M
ROOT='/sessions/great-amazing-cannon/mnt/codebase/'
H=ROOT+'Jetstream2_Exosphere/grammrag_handoff/'
PARSE=ROOT+'Jetstream2_Exosphere/Grammrag_backup/gramm-rag-mmlongbench/cache/parsed/'

g  = json.load(open(H+'gramm-rag-3benchmarks/data/mmlongbench/gramm_mmlongbench_s42.json'))
k2 = json.load(open(H+'gramm-rag-3benchmarks/data/mmlongbench/baseline_vector_mmlb.json'))
k3 = json.load(open(H+'gramm-rag-colpali/generation/flatk3_gen_mmlongbench.json'))
qm = json.load(open(H+'gramm-rag-3benchmarks/data/mmlongbench/qmeta_mmlb.json'))['rows']
corp=json.load(open(H+'gramm-rag-mmlongbench/data/mmlongbench/mmlongbench_doc.json'))

def nearby(a,b,th=20.0):
    if len(a)<4 or len(b)<4: return False
    return min(abs(a[3]-b[1]), abs(b[3]-a[1])) < th

def rebuild_edges(els):
    """Deterministic edge rules of src/graph/edges.py, applied to the shipped parse."""
    cnt=collections.Counter(); ex=collections.defaultdict(list)
    ordered=sorted(range(len(els)), key=lambda i: els[i]['reading_order'])
    # reading_order: consecutive text/section in reading order
    ts=[i for i in ordered if els[i]['type'] in ('text','section')]
    for a,b in zip(ts, ts[1:]):
        cnt['reading_order']+=1
        if len(ex['reading_order'])<3: ex['reading_order'].append([els[a]['id'],els[b]['id']])
    # hierarchy: most recent section -> child
    cur=None
    for i in ordered:
        t=els[i]['type']
        if t=='section': cur=i
        elif t in ('text','table','figure','equation') and cur is not None:
            cnt['hierarchy']+=1
            if len(ex['hierarchy'])<3: ex['hierarchy'].append([els[cur]['id'],els[i]['id']])
    # spatial: text/section/equation -> table/figure within 20pt on the same page
    for i,a in enumerate(els):
        if a['type'] not in ('text','section','equation'): continue
        for j,b in enumerate(els):
            if b['type'] not in ('table','figure') or a['page_no']!=b['page_no']: continue
            if nearby(a.get('bbox',[]), b.get('bbox',[])):
                cnt['spatial']+=1
                if len(ex['spatial'])<3: ex['spatial'].append([a['id'],b['id']])
    # caption: neighbouring text starting with figure/table -> the figure/table
    seq=[els[i] for i in ordered]; idxs=ordered
    for k,e in enumerate(seq):
        if e['type'] not in ('figure','table'): continue
        for off in (-1,1):
            j=k+off
            if 0<=j<len(seq):
                nb=seq[j]
                if nb['type']=='text' and nb['page_no']==e['page_no'] and \
                   (nb.get('text') or '').lower().strip().startswith(('figure','fig.','table','tab.')):
                    cnt['caption']+=1
                    if len(ex['caption'])<3: ex['caption'].append([nb['id'],e['id']])
    # temporal: text/section sharing a resolved marker
    t2e=collections.defaultdict(list)
    for i,e in enumerate(els):
        if e['type'] not in ('text','section'): continue
        for m in (e.get('temporal_markers') or []):
            t2e[(m.get('resolved_text') or m['text']).upper()].append(i)
    for key,grp in t2e.items():
        if len(grp)<2: continue
        cnt['temporal'] += len(grp)*(len(grp)-1)
        if len(ex['temporal'])<3 and len(grp)>=2:
            ex['temporal'].append([els[grp[0]]['id'],els[grp[1]]['id'],key])
    return dict(cnt), {k:v for k,v in ex.items()}

def anls(pred,gold): return round(M.compute_anls([pred],[gold]),4)

def build(i, doc_hash, title, blurb):
    els=json.load(open(PARSE+doc_hash+'.pdf.json'))['elements']
    meta, rec = qm[i], corp[i]
    gold_pages=sorted(set(g['gold_pages'][i] or []))
    edges, ex = rebuild_edges(els)
    gp=gold_pages[0]
    onpage=[{'id':e['id'],'type':e['type'],'ro':e['reading_order'],
             'text':(e.get('text') or '')[:230]} for e in els if e['page_no']==gp]
    arms={}
    for name,d in (('gramm',g),('k3',k3),('k2',k2)):
        ctx=sorted(set(d['context_pages'][i] or []))
        arms[name]=dict(context=ctx, pred=d['predictions'][i],
                        anls=anls(d['predictions'][i], d['golds'][i]),
                        hit=bool(set(ctx)&set(gold_pages)))
    return {
      'qidx': i,
      'doc': {'hash':doc_hash,'title':title,'blurb':blurb,'pages':meta['doc_pages'],
              'type':meta['doc_type'],'elements':len(els),
              'by_type':dict(collections.Counter(e['type'] for e in els)),
              'by_page':{str(k):v for k,v in sorted(collections.Counter(e['page_no'] for e in els).items())},
              'temporal_elems':sum(1 for e in els if e.get('temporal_markers'))},
      'question': {'text':rec['question'].strip(),'gold':g['golds'][i],
                   'gold_pages':gold_pages,'evidence_sources':meta['evidence_sources'],
                   'answer_format':rec['answer_format']},
      'parse': {'gold_page':gp,'elements_on_gold_page':onpage},
      'graph': {'nodes':len(els),'edges':edges,'total':sum(edges.values()),'examples':ex},
      'retrieve': {'ranked_raw':g['retrieved_pages'][i],
                   'ranked':list(dict.fromkeys(g['retrieved_pages'][i])),
                   'route':g['routes'][i]},
      'score': {'U':round(g['reward_scores'][i],4),'tau':0.0,
                'decision':'answer','refused':bool(g['refused_flags'][i])},
      'arms': arms,
    }

out={'cases':{
 'q507': build(507,'8dfc21ec151fb9d3578fc32d5c4e5df9',
   'College Board Search — Help &amp; Reference',
   'US non-profit reference manual. Page 8 is the EPS geographic-market lookup table.'),
 'q823': build(823,'698bba535087fa9a7f9009e172a7f763',
   'Hamilton County — Nebraska Historic Buildings Survey',
   'US state historic-preservation survey. Page 11 carries a captioned location map.'),
}}
json.dump(out, open('portal_cases.json','w'), indent=1)
for k,v in out['cases'].items():
    print(k, v['doc']['title'], '|', v['doc']['elements'],'elements', v['graph']['total'],'edges', v['graph']['edges'])
    for a,d in v['arms'].items(): print('   ',a, d['context'], d['anls'], repr(d['pred'])[:70])
