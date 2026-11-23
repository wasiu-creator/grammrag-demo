set -e
cd /sessions/great-amazing-cannon/portal
python3 -I extract.py    >/dev/null
python3 -I extra.py
python3 -I builddata.py  >/dev/null
python3 -I clean_dash.py
python3 -I - <<'PY'
O='/sessions/great-amazing-cannon/mnt/outputs/'
head=open(O+'portal_head.html',encoding='utf8').read()
css=open(O+'portal_css2.html',encoding='utf8').read().strip()+'\n'+open(O+'portal_css3.html',encoding='utf8').read().strip()
js=open(O+'portal_js.js',encoding='utf8').read()+'\n'+open(O+'portal_js2.js',encoding='utf8').read()
data=open('/sessions/great-amazing-cannon/portal/portal_data.json',encoding='utf8').read()
out=head.replace('</head>', css+'\n</head>')+'\n<script>\nconst DATA='+data+';\n'+js+'\n</script>\n</body></html>\n'
assert '—' not in out, 'em dash left in output'
open(O+'GraMM-RAG_Portal.html','w',encoding='utf8').write(out)
import json
D=json.loads(data)
for k,c in D['cases'].items():
    assert 'components' in c and 'subgraph' in c, k+' missing new fields'
print('bytes',len(out),'| cases ok | falsifiers',len(D['falsifiers']))
PY
cp /sessions/great-amazing-cannon/mnt/outputs/GraMM-RAG_Portal.html "/sessions/great-amazing-cannon/mnt/codebase/Dissertation Presentation/GraMM-RAG_Portal.html"
