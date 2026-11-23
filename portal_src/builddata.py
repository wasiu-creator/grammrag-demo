import json, re
FB='/sessions/great-amazing-cannon/mnt/codebase/Dissertation Presentation/FB/'
src=open(FB+'BACKUP_MAUF_weight_explorer.html').read()
m=re.search(r'const DATA=(\{.*?\});\n', src, re.S)
mauf=json.loads(m.group(1))
cases=json.load(open('portal_cases.json'))['cases']

# --- narrative/extra fields per case, all read from the parse or the archives above
cases['q507'].update({
 'label':'q507 · the graph wins at a matched budget',
 'evidence_text':'1. Little Rock AR01   2. Northern Arkansas AR02',
 'evidence_note':'Page 8 is the EPS geographic-market lookup table. The answer is a row in it.',
 'distractor':{'page':13,'text':'Support · College Board Search Help · News · Quick-Start Guide · Introduction to College Board Search…',
   'note':'The page-matched control spent its third page here — a navigation and overview page. It had the state heading from page 3 and no market table, so it answered with the state.'},
 'headline':'Same budget. One page different. That page is the one the graph ranked first.',
})
cases['q823'].update({
 'label':'q823 · the hallucination, and the confound that hides it',
 'evidence_text':'Hamilton County is located in the southeastern part of the state… Hamilton County covers approximately 538 square miles and elevations range from 1,660 feet…',
 'evidence_note':'Page 11 carries both the figure “Figure 1. Location of Hamilton County and its communities.” and the paragraph holding the answer.',
 'distractor':{'page':14,'text':'church in 1887 at a cost of roughly $3,000… Agriculture in Hamilton County…',
   'note':'The two-page control read pages 14 and 17 — church history and vanished settlements. Both are about Hamilton County. Neither carries its area.'},
 'headline':'The two-page control invented 552. The page-matched control found 538 on its own. Both facts matter.',
})

data={
 'cases':cases,
 'mauf':mauf,
 'corpus':{
   'headline':[
     {'bench':'MMLongBench-Doc','n':'1,091','metric':'ANLS','ctrl':0.3229,'gramm':0.3522,'delta':'+0.0293','ci':'[+0.0083, +0.0506]','sig':True},
     {'bench':'DocBench','n':'1,102','metric':'Judge accuracy','ctrl':0.5054,'gramm':0.5327,'delta':'+0.0272','ci':'[+0.0036, +0.0517]','sig':True},
     {'bench':'MP-DocVQA','n':'950','metric':'ANLS','ctrl':0.6983,'gramm':0.6978,'delta':'−0.0005','ci':'[−0.0167, +0.0160]','sig':False}],
   'localization':[
     {'bench':'MMLongBench-Doc','metric':'Context hit (n = 838)','ctrl':0.2780,'gramm':0.4344,'delta':'+0.1563','ci':'[+0.1265, +0.1862]','ratio':'5.3×'},
     {'bench':'DocBench','metric':'Quote recall@5 (n = 730)','ctrl':0.4192,'gramm':0.5096,'delta':'+0.0904','ci':'[+0.0658, +0.1178]','ratio':'3.3×'},
     {'bench':'MP-DocVQA','metric':'Page hit@3 (n = 950)','ctrl':0.7347,'gramm':0.7189,'delta':'−0.0158','ci':'[−0.0358, +0.0032]','ratio':'none'}],
   'ceiling':{'rows':[
     {'k':'C · entity coverage','mm':0.568,'db':0.717},
     {'k':'S · semantic similarity','mm':0.507,'db':0.565},
     {'k':'T · temporal coherence','mm':0.484,'db':0.499},
     {'k':'U as shipped','mm':0.556,'db':0.723},
     {'k':'Joint, 5-fold CV','mm':0.568,'db':0.728},
     {'k':'Generator, same pages','mm':0.806,'db':0.750}],
     'n':{'mm':'1,088','db':'1,102'},
     'three':'0.560 is the best balanced accuracy of any threshold on U. 0.574 is the best AUC from reweighting (0.568 cross-validated). 0.806 is both at once, because a binary decision’s AUC equals (TPR + TNR) / 2.'},
   'generator_side':[
     {'sig':'Sufficiency autorater','auc':'0.543','v':'Fails'},
     {'sig':'Log-probability, mean / min','auc':'0.255 / 0.272','v':'Inverted'},
     {'sig':'Self-consistency, k = 5','auc':'0.379','v':'Inverted'}],
   'register':[['Cost this project a claim it had made',15],
     ['Removed an artifact that would have flattered the project',8],
     ['Neutral or operational',4],
     ['Enabled more work than the error would have permitted',1]],
   'arms':{'gramm':'GraMM-RAG','k3':'Flat-vector k=3 · page-matched control','k2':'Flat-vector k=2 · unmatched control'},
 },
 'falsifiers':[
  {'id':'F1','claim':'Gains hold on all three corpora.',
   'test':'Re-run the dense control at the same three-page budget and re-measure.',
   'reg':'Pre-registered before the matched run.',
   'outcome':'NARROWED','verdict':'Two of three.',
   'detail':'On MP-DocVQA the control’s third page alone is worth +0.0320 ANLS [+0.0171, +0.0477] — almost exactly the +0.0315 the original lead consisted of. The entire original margin was the page budget. The three-corpus claim became a two-corpus claim.'},
  {'id':'F2','claim':'The graph advantage concentrates on cross-page evidence.',
   'test':'Evidence-scope interaction contrast on MMLongBench-Doc.',
   'reg':'Hypothesis and test written down before measurement.',
   'outcome':'FALSIFIED','verdict':'Not supported.',
   'detail':'The interaction is −0.0245 with an interval of [−0.0687, +0.0216]. It includes zero and does not exclude it in the predicted direction. Nothing was corrected, because nothing was wrong — the protocol worked and the idea died.'},
  {'id':'F3','claim':'GraMM-RAG improves localization.',
   'test':'Put a page-image retriever in the same harness.',
   'reg':'Comparator fixed in advance.',
   'outcome':'NARROWED','verdict':'Reference-relative.',
   'detail':'ColPali reaches 0.800 context hit against GraMM-RAG’s 0.434, and +0.1160 ANLS [+0.0852, +0.1499] over it. The claim that survives is narrower and is stated as such: GraMM-RAG leads the dense control, not the field.'},
  {'id':'F4','claim':'The graph complements a strong page-image retriever.',
   'test':'Union arm against a size-matched ColPali control at 5.22 pages.',
   'reg':'The size-matched control was the missing control the register names.',
   'outcome':'FALSIFIED','verdict':'Dilutes.',
   'detail':'Given the same budget of its own next-ranked pages, ColPali reaches 0.5017 answerable ANLS against the union’s 0.4804. The graph’s contribution to the union is dilutive at that budget, not complementary.'},
  {'id':'F5','claim':'The utility function decides abstention.',
   'test':'Per-attribute AUC decomposition plus cross-validated reweighting.',
   'reg':'Both specified before the decomposition ran.',
   'outcome':'FALSIFIED','verdict':'Collapses to coverage.',
   'detail':'Coverage alone equals the joint model on MMLongBench-Doc. Similarity sits at 0.507, chance. Temporal coherence is harmful at 0.484 — dropping it lifts the score to 0.574, against 0.806 for the generator on identical pages.'},
  {'id':'F6','claim':'A generator-side signal beats the retrieval-side ceiling.',
   'test':'Three signals against a failure threshold of 0.614 fixed in advance.',
   'reg':'Threshold and signals registered before measurement.',
   'outcome':'FALSIFIED','verdict':'All fail; two inverted.',
   'detail':'Best is the autorater at 0.543 with an upper bound of 0.5625, which excludes 0.614. Gold pages lift it only to 0.6098. Log-probability and self-consistency run backwards — confidence predicts unanswerable, because the model emits a short near-certain refusal.'},
  {'id':'F7','claim':'RAG-Anything’s localization advantage is an image effect.',
   'test':'Re-run it on a zero-image corpus; the advantage should collapse.',
   'reg':'Prediction recorded before the run.',
   'outcome':'HELD','verdict':'Supported.',
   'detail':'It collapsed: +0.0021 [−0.0074, +0.0116] at the retrieval level and −0.0103 [−0.0232, +0.0018] at the answer level. The interval is tight, so this is evidence of no difference rather than absence of power. Not every falsifier kills a claim.'},
  {'id':'F8','claim':'GraMM-RAG is cheaper to prepare and to serve.',
   'test':'A pre-registered cost falsifier on GPU hours and index size.',
   'reg':'Falsifier written before the measurement.',
   'outcome':'WITHDRAWN','verdict':'The falsifier fired.',
   'detail':'Preparation is 1.50× more expensive on GPU hours, 1.52× including CPU, and the index is 1.57× larger. Both sub-claims are decided against the system under study. The cost advantage was withdrawn.'},
 ],
}
json.dump(data, open('portal_data.json','w'), separators=(',',':'))
print('cases:',list(data['cases']),'| mauf corpora:',list(mauf),'| falsifiers:',len(data['falsifiers']))
print('bytes:',len(open('portal_data.json').read()))
