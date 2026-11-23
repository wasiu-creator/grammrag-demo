/* ===================== GraMM-RAG portal ===================== */
const $ = s => document.querySelector(s);
const E = (t, c, h) => { const n = document.createElement(t); if (c) n.className = c; if (h != null) n.innerHTML = h; return n; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const f4 = v => Number(v).toFixed(4);
const f3 = v => Number(v).toFixed(3);

const VIEWS = [
  ['overview', 'Overview'],
  ['pipeline', 'End-to-end pipeline'],
  ['mauf', 'Utility function'],
  ['falsify', 'Falsification'],
  ['results', 'Results']
];

let current = 'overview';
function go(id) {
  current = id;
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('on', v.id === 'v-' + id));
  document.querySelectorAll('#nav button').forEach(b => b.setAttribute('aria-current', b.dataset.v === id));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (id === 'mauf') drawTri();
}
function buildNav() {
  const n = $('#nav');
  VIEWS.forEach(([id, label]) => {
    const b = E('button', null, label); b.dataset.v = id;
    b.onclick = () => go(id); n.appendChild(b);
  });
}

/* ---------- PDF modal ---------- */
function openPdf(file, title, sub) {
  $('#pdfTitle').textContent = title;
  $('#pdfSub').textContent = sub;
  $('#pdfFrame').src = 'portal_docs/' + file + '.pdf';
  $('#pdfModal').classList.add('on');
}
function closePdf() { $('#pdfModal').classList.remove('on'); $('#pdfFrame').src = ''; }

/* ================= OVERVIEW ================= */
function viewOverview() {
  const v = E('section', 'view on'); v.id = 'v-overview';
  v.innerHTML = `
  <div class="hero">
    <div class="eyebrow">Doctoral research portal &middot; Bowie State University</div>
    <h1>Graph-Augmented Multimodal Retrieval and the Limits of
      <em>Abstention Prediction</em></h1>
    <p>Every number in this portal is read from the shipped GraMM-RAG runs: three corpora,
       3,143 questions, seven retrieval arms, one shared parse, generator, prompt, page budget,
       scorer, judge and seed. Retrieval alone differs. Nothing here is simulated.</p>
  </div>
  <div class="kpis">
    <div class="kpi"><b>2 of 3</b><span>corpora where graph retrieval still improves answers once the control reads as many pages</span></div>
    <div class="kpi"><b>3&ndash;5&times;</b><span>more gain in evidence localization than in answer quality, where the gain holds</span></div>
    <div class="kpi"><b>0.574 / 0.806</b><span>best retrieval-side answerability score against the generator reading the same pages</span></div>
  </div>
  <div class="tiles" id="tiles"></div>
  <div class="sep"></div>
  <div class="grid g3">
    <div class="card"><h3>Use case</h3>
      <p class="note">Step a real question through all eight stages, flip between two source
      documents, and watch three retrieval arms answer the same question from different pages.</p></div>
    <div class="card"><h3>Computation source</h3>
      <p class="note">Archived run at <span class="mono">seed 42</span>, generator
      <span class="mono">gpt-4.1-mini</span>, parses from the MinerU cache, utility attributes
      recomputed behind a behavioural reproduction gate.</p></div>
    <div class="card"><h3>Disclosure</h3>
      <p class="note">The protocol withdrew a cost advantage, a three-corpus claim and a
      localization leadership claim. All three are in here, with the falsifier that fired.</p></div>
  </div>`;
  const tiles = [
    ['01', 'End-to-end pipeline', 'A real PDF through parse, graph, retrieval, scoring, assembly, generation and evaluation.', 'pipeline'],
    ['02', 'Utility function', 'Every weighting of U = a&middot;C + b&middot;S + c&middot;T, searched. The optimum sits on an edge.', 'mauf'],
    ['03', 'Falsification protocol', 'Seven claims, each with the experiment written down before the measurement.', 'falsify'],
    ['04', 'Results', 'The headline deltas, the localization gap, and the abstention ceiling.', 'results']
  ];
  const t = v.querySelector('#tiles');
  tiles.forEach(([n, title, sub, dest]) => {
    const b = E('button', 'tile', `<b><i>${n}</i>${title}</b><span>${sub}</span>`);
    b.onclick = () => go(dest); t.appendChild(b);
  });
  return v;
}

/* ================= PIPELINE ================= */
let CASE = 'q507', STEP = 0, timer = null;

function pageStrip(total, opts) {
  const gold = opts.gold || [], ctx = opts.ctx || [], ranks = opts.ranks || {};
  let h = '<div class="pstrip">';
  for (let p = 1; p <= total; p++) {
    const cls = ['pg'];
    if (ctx.includes(p)) cls.push('ctx');
    if (gold.includes(p)) cls.push('gold');
    if (ranks[p] && !ctx.includes(p) && !gold.includes(p)) cls.push('rank');
    h += `<div class="${cls.join(' ')}">${p}${ranks[p] ? `<i>${ranks[p]}</i>` : ''}</div>`;
  }
  return h + '</div>';
}
const LEGEND = `<div class="legend">
  <span><b style="background:var(--gold-br)"></b>gold evidence page</span>
  <span><b style="background:var(--black)"></b>page sent to the generator</span>
  <span><b style="background:#fff;border-color:var(--blue)"></b>graph-leg rank</span>
  <span><b style="background:#fff"></b>not retrieved</span></div>`;

function bars(obj) {
  const m = Math.max(...Object.values(obj));
  return '<div class="bars">' + Object.entries(obj).sort((a, b) => b[1] - a[1]).map(([k, v]) =>
    `<div class="bar"><u>${k}</u><div><i style="width:${Math.max(2, 100 * v / m)}%"></i></div><s>${v.toLocaleString()}</s></div>`
  ).join('') + '</div>';
}

const NODE_COL = { section: '#0d1117', text: '#525c6b', figure: '#C8A95C', table: '#2F5FA8', equation: '#A8721B' };
const EDGE_COL = { reading_order: '#b4bcc7', hierarchy: '#2F5FA8', spatial: '#A8721B', caption: '#C8A95C', temporal: '#1C7A4E' };

function subgraphSvg(sg) {
  const N = sg.nodes.length, W = 900, H = 430, cx = W / 2, cy = H / 2 + 4, R = Math.min(132, 44 + N * 7);
  const pt = i => { const a = -Math.PI / 2 + 2 * Math.PI * i / N; return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), a }; };
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Subgraph of the gold evidence page">`;
  sg.edges.forEach(([i, j, t]) => {
    const a = pt(i), b = pt(j), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const qx = cx + (mx - cx) * 0.45, qy = cy + (my - cy) * 0.45;
    s += `<path d="M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${qx.toFixed(1)},${qy.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}"
      fill="none" stroke="${EDGE_COL[t] || '#ccc'}" stroke-width="${t === 'reading_order' ? 1.3 : 1.9}" opacity=".85"/>`;
  });
  sg.nodes.forEach((n, i) => {
    const p = pt(i), out = Math.cos(p.a) >= 0;
    const lx = cx + (R + 16) * Math.cos(p.a), ly = cy + (R + 16) * Math.sin(p.a);
    s += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="9" fill="${NODE_COL[n.t] || '#888'}" stroke="#fff" stroke-width="2"/>`;
    s += `<text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" font-size="11" fill="#525c6b"
      text-anchor="${out ? 'start' : 'end'}">${esc(n.l.length > 26 ? n.l.slice(0, 26) + '…' : n.l)}</text>`;
  });
  s += `<text x="${cx}" y="${cy - 6}" font-size="12" fill="#8a94a2" text-anchor="middle">gold page ${sg.page || ''}</text>
        <text x="${cx}" y="${cy + 13}" font-size="15" font-weight="700" fill="#0d1117" text-anchor="middle">${N} nodes | ${sg.edges.length} edges</text></svg>`;
  const used = [...new Set(sg.edges.map(e => e[2]))];
  return `<div class="gsvg">${s}</div>
    <div class="legend" style="margin-top:9px">
      ${used.map(t => `<span><b style="background:${EDGE_COL[t]}"></b>${t}</span>`).join('')}
      ${Object.entries(NODE_COL).filter(([k]) => sg.nodes.some(n => n.t === k)).map(([k, c]) => `<span><b style="background:${c};border-radius:50%"></b>${k} node</span>`).join('')}
    </div>`;
}

function armBlock(c, key, label, extra) {
  const a = c.arms[key], me = key === 'gramm';
  const ok = a.anls >= 0.5;
  return `<div class="arm ${me ? 'me' : ''}">
    <div class="hd"><b>${label}</b>
      ${me ? '<span class="pill g">system under study</span>' : ''}
      <span class="pill ${a.hit ? 'ok' : 'no'}">${a.hit ? 'gold page in context' : 'gold page missed'}</span>
      <span class="ctxs">pages ${a.context.join(' | ')}</span></div>
    ${extra === 'answer' ? `<div class="ans ${ok ? 'good' : 'bad'}">${esc(a.pred.length > 320 ? a.pred.slice(0, 320) + '…' : a.pred)}</div>` : ''}
    ${extra === 'score' ? `<div class="ans ${ok ? 'good' : 'bad'}">ANLS <b style="color:${ok ? 'var(--good)' : 'var(--bad)'}">${f4(a.anls)}</b> &nbsp;|&nbsp; ${esc(a.pred.length > 150 ? a.pred.slice(0, 150) + '…' : a.pred)}</div>` : ''}
    ${extra === 'ctx' ? pageStrip(c.doc.pages, { gold: c.question.gold_pages, ctx: a.context }) : ''}
  </div>`;
}

function stages(c) {
  const q = c.question, d = c.doc, ranks = {};
  c.retrieve.ranked.forEach((p, i) => { if (!(p in ranks)) ranks[p] = i + 1; });
  const goldRank = ranks[c.parse.gold_page];
  const K = c.components, w = K.w;
  const term = (sym, val, wt, label) => `<div class="tm"><b>${sym} = ${f4(val)}</b><span>${label}<br>weight ${wt.toFixed(2)} &rarr; ${f4(wt * val)}</span></div>`;

  return [
    { t: 'Raw corpus', s: 'The document, before anything is done to it',
      src: '§3.3 | Table 3',
      act: `A single PDF enters the pipeline. No OCR shortcuts, no pre-chunked text: ${d.pages} pages, parsed from the file itself. Every arm in the comparison reads this same file through this same parse, which is what makes a later difference attributable to retrieval.`,
      meas: [['Document', d.hash.slice(0, 12) + '…'], ['Pages', d.pages], ['Corpus', 'MMLongBench-Doc'], ['Questions in corpus', '1,091'], ['Unanswerable', '244 (22.4%)']],
      art: `<h4>Artifact | the page surface</h4>${pageStrip(d.pages, { gold: q.gold_pages })}
        <p class="note" style="margin:0 0 10px"><b style="color:var(--gold)">${d.title}</b><br>${d.blurb}</p>
        <p style="margin:0 0 12px"><button class="act pri" onclick="openPdf('${d.hash}','${d.title.replace(/'/g, '')}','${d.pages} pages | page ${q.gold_pages.join(', ')} holds the answer')">&#128196; Open the source PDF</button></p>
        <div class="quote">${esc(q.text)}</div>
        <p class="note">Gold answer <b class="mono" style="color:var(--gold)">${esc(q.gold)}</b> |
        evidence on page <b class="mono" style="color:var(--gold)">${q.gold_pages.join(', ')}</b> |
        annotated source ${q.evidence_sources.length ? q.evidence_sources.join(', ') : 'not annotated'} |
        answer format ${q.answer_format}</p>`,
      guide: `<b>Start here.</b> The whole demonstration is one question against one document. Open the PDF and look at page ${q.gold_pages.join(', ')}. It is the only page that holds the answer, and three retrieval arms will disagree about whether to send it to the generator.` },

    { t: 'Parse', s: 'MinerU five-model chain into typed elements',
      src: '§3.4 | Figure 2',
      act: `Layout detection, OCR, formula and table extraction produce typed elements with bounding boxes and reading-order indices. Five node types survive into the graph: text, table, figure, equation, section. The temporal annotator runs here too, writing period markers onto elements.`,
      meas: [['Elements parsed', d.elements], ['Text', d.by_type.text || 0], ['Section', d.by_type.section || 0], ['Figure', d.by_type.figure || 0], ['Table', d.by_type.table || 0], ['Carrying a period marker', d.temporal_elems]],
      art: `<h4>Artifact | <span class="mono">parsed_elements.json</span>, page ${c.parse.gold_page}</h4>
        <div class="scroller"><div class="els">${c.parse.elements_on_gold_page.map(e => {
          const key = e.text && (c.evidence_text.slice(0, 24).includes(e.text.slice(0, 18)) || e.text.includes(q.gold));
          return `<div class="el ${key ? 'key' : ''}"><b>${e.type}</b><u>ro ${e.ro}</u><span>${e.text ? esc(e.text) : '<i style="color:var(--faint)">[no text layer, image element]</i>'}</span></div>`;
        }).join('')}</div></div>
        <p class="note" style="margin-top:10px">${c.evidence_note}</p>`,
      guide: `<b>${d.elements} elements, not ${d.pages} pages.</b> The parse is what the graph is built over, and the unit is an element. Everything downstream, from the typed relations to the page the generator finally sees, is derived from this list.` },

    { t: 'Graph', s: 'Heterogeneous graph over the parsed elements',
      src: '§3.5 | Table 4',
      act: `Eight typed relations are defined; seven are deterministic. Reading order and hierarchy are dense and universal. Spatial proximity and caption linking, the two relations most specific to visual layout, turn out to be the two that barely materialise, which is a finding rather than a defect.`,
      meas: [['Nodes', c.graph.nodes], ['Edges rebuilt', c.graph.total], ...Object.entries(c.graph.edges).map(([k, v]) => [k, v])],
      art: `<h4>Artifact | the subgraph induced on the gold page</h4>
        <div class="scroller">${subgraphSvg(c.subgraph)}
        <h4 style="margin-top:14px">Typed relations across the whole document</h4>${bars(c.graph.edges)}
        <p class="note" style="margin-top:12px">Rebuilt from the shipped parse using the same deterministic rules the system builds edges with. The node-level subgraph itself was never saved during the run. Co-reference, cross-page and the model-extracted triplet relation are not reconstructed here.</p>
        ${c.graph.examples.temporal ? `<p class="note">Example temporal edge: <span class="mono">${c.graph.examples.temporal[0][0]} &harr; ${c.graph.examples.temporal[0][1]}</span>, both resolving to <mark>${c.graph.examples.temporal[0][2]}</mark></p>` : '<p class="note">No temporal edges on this document: nothing in it carries a resolvable period marker.</p>'}</div>`,
      guide: `<b>Density is not usefulness.</b> ${c.graph.edges.temporal ? `This document produces ${c.graph.edges.temporal} temporal edges and the period mask runs on every query, yet no corpus here labels which questions depend on a period, so the mechanism is active and unmeasured.` : 'This document produces no temporal edges at all, which is why the temporal attribute sits at its neutral value when the utility function is scored at the next stage.'}` },

    { t: 'Retrieve', s: 'HGT message passing, router, cross-encoder rerank',
      src: '§3.6 | Figure 4',
      act: `A two-layer Heterogeneous Graph Transformer passes messages with per-relation attention. A DeBERTa-v3 router was trained to choose between vector, graph and hybrid paths, then bypassed: ROUTE_ALL_HYBRID sends every question down the hybrid path, so the recorded route is an analysis annotation rather than a control signal.`,
      meas: [['Recorded route', c.retrieve.route], ['Graph-leg top pages', c.retrieve.ranked.slice(0, 6).join(', ')], ['Gold page rank', goldRank ? '#' + goldRank : 'not in the top 10'], ['Rerank pool', '20'], ['HGT layers', '2']],
      art: `<h4>Artifact | the graph leg's page ranking</h4>${pageStrip(d.pages, { gold: q.gold_pages, ranks })}${LEGEND}
        <p class="note">Ranked pages, in order: <span class="mono" style="color:var(--gold)">${c.retrieve.ranked.join(' → ')}</span></p>
        <p class="note">${goldRank === 1
          ? `The graph ranks page <mark>${c.parse.gold_page}</mark> <b>first</b>. This is the measurement APPA scores.`
          : goldRank ? `The graph ranks the gold page <mark>#${goldRank}</mark>.`
          : `The gold page is <b style="color:var(--bad)">not</b> in the graph leg's ranking at all.`}</p>`,
      guide: `<b>Two different quantities start here.</b> APPA scores this ranking. Context hit scores what the generator actually receives after page selection. They diverge the moment selection is not the identity, and the dissertation reports them separately for exactly that reason.` },

    { t: 'Score', s: 'Multi-attribute Utility Function',
      src: '§3.7 | Table 30',
      act: `The retrieved subgraph is scored on entity coverage C, mean cosine similarity S, and three-valued temporal coherence T. If U exceeds the threshold the system answers; below it the system expands and re-scores; below it after expansion the system refuses.`,
      meas: [['U(q, K)', f4(c.score.U)], ['Threshold τ', '0.0000'], ['Decision', c.score.decision], ['Refusals issued', '0 of 2,193'], ['Ceiling on U', '0.560 bal. acc.']],
      art: `<h4>Artifact | the scalar, decomposed</h4>
        <div class="ueq">
          <div class="line">U(q,&nbsp;K) <s>=</s> <i>a</i>&middot;C <s>+</s> <i>b</i>&middot;S <s>+</s> <i>c</i>&middot;T</div>
          <div class="terms">
            ${term('C', K.C, w[0], 'entity coverage')}
            ${term('S', K.S, w[1], 'semantic similarity')}
            ${term('T', K.T, w[2], 'temporal coherence')}
          </div>
          <div class="sum">${f4(w[0] * K.C)} + ${f4(w[1] * K.S)} + ${f4(w[2] * K.T)} = <b>${f4(K.U_recomputed)}</b>
            <s>archived U = ${f4(K.U_archived)} | threshold τ = 0.0000 | decision: answer</s></div>
        </div>
        <p class="note">${K.note}</p>
        <p class="note">${K.C === 0.5 ? 'Coverage returns its neutral 0.5 because the question yields no extractable entities. ' : ''}${K.T === 0.5 ? 'Temporal coherence returns its neutral 0.5 because no retrieved node carries a period marker. ' : ''}${K.T === 0 ? 'Temporal coherence scores 0.0: the retrieved nodes carry periods that do not agree, so the term subtracts. ' : ''}Open the <a href="#" onclick="go('mauf');return false;">utility-function demo</a> to search every weighting of a, b and c yourself.</p>`,
      guide: `<b>This is the stage the dissertation is named for.</b> The scoring function works as a retrieval-quality signal and fails as a refusal signal, and it fails in a way no reweighting repairs, because all three attributes are retrieval-side.` },

    { t: 'Assemble', s: 'Union page context: append, do not replace',
      src: '§3.12 | Proposition 3.1',
      act: `Two cross-encoder pages plus one graph-selected page, appended rather than substituted. Budget: 3 pages, 12,000 characters, up to 3 images. The two control arms reach that budget by different routes. The page-matched control takes a third dense page; the unmatched control takes only two.`,
      meas: [['Budget', '3 pages | 12,000 chars'], ['GraMM-RAG context', c.arms.gramm.context.join(', ')], ['Page-matched control', c.arms.k3.context.join(', ')], ['Unmatched control', c.arms.k2.context.join(', ')], ['Gold page delivered', [c.arms.gramm, c.arms.k3, c.arms.k2].filter(a => a.hit).length + ' of 3 arms']],
      art: `<h4>Artifact | what each arm actually sends to the generator</h4>
        <div class="arms">
          ${armBlock(c, 'gramm', 'GraMM-RAG', 'ctx')}
          ${armBlock(c, 'k3', 'Flat-vector k=3, page-matched', 'ctx')}
          ${armBlock(c, 'k2', 'Flat-vector k=2, unmatched', 'ctx')}
        </div>${LEGEND}
        <p class="note" style="margin-top:10px"><b style="color:var(--gold)">Page ${c.distractor.page}:</b> ${c.distractor.note}</p>`,
      guide: `<b>Equal budget is the whole argument.</b> The unmatched control reads two pages against three, so any margin it loses is partly the page budget rather than the retriever. That confound overstates the gains by 14 to 120 percent across the corpora, and on MP-DocVQA it accounts for the entire advantage.` },

    { t: 'Generate', s: 'gpt-4.1-mini, quote-then-answer, temperature 0',
      src: '§3.8 | Table 5',
      act: `One generator, one prompt, one seed, for every arm. The only thing that differs between these three answers is which pages arrived. Whatever separates them is retrieval and nothing else.`,
      meas: [['Generator', 'gpt-4.1-mini'], ['Temperature', '0'], ['Seed', '42'], ['Prompt', 'quote-then-answer'], ['Page images', 'up to 3 at 120 dpi']],
      art: `<h4>Artifact | three answers to one question</h4>
        <p class="note" style="margin-bottom:10px">Gold: <b class="mono" style="color:var(--gold)">${esc(q.gold)}</b></p>
        <div class="arms">
          ${armBlock(c, 'gramm', 'GraMM-RAG', 'answer')}
          ${armBlock(c, 'k3', 'Flat-vector k=3, page-matched', 'answer')}
          ${armBlock(c, 'k2', 'Flat-vector k=2, unmatched', 'answer')}
        </div>`,
      guide: `<b>${c.headline}</b>` },

    { t: 'Evaluate', s: 'Score, test, and decide what may be claimed',
      src: '§3.10 | Table 8',
      act: `ANLS is a normalized Levenshtein similarity thresholded at 0.5, so a half-right answer scores zero rather than 0.5. Corpus deltas carry a paired bootstrap at 4,000 resamples, seed 42, and an interval excluding zero is the criterion used throughout. No result is called significant on a point estimate alone.`,
      meas: [['GraMM-RAG ANLS', f4(c.arms.gramm.anls)], ['Page-matched control', f4(c.arms.k3.anls)], ['Unmatched control', f4(c.arms.k2.anls)], ['Corpus delta vs matched', '+0.0293'], ['95% interval', '[+0.0083, +0.0506]']],
      art: `<h4>Artifact | the per-question verdict</h4>
        <div class="arms">
          ${armBlock(c, 'gramm', 'GraMM-RAG', 'score')}
          ${armBlock(c, 'k3', 'Flat-vector k=3, page-matched', 'score')}
          ${armBlock(c, 'k2', 'Flat-vector k=2, unmatched', 'score')}
        </div>
        <p class="note" style="margin-top:12px">One question is an anecdote. Across the corpus the matched
        delta is <mark>+0.0293 ANLS</mark> with an interval of [+0.0083, +0.0506], while localization moves
        <mark>+0.1563</mark> context hit, three to five times as much. Getting evidence to the generator
        is necessary and far from sufficient.</p>`,
      guide: c.qidx === 823
        ? `<b>Read all three rows.</b> The two-page control fabricated <mark>552</mark>, a figure that appears nowhere in the document's text. The page-matched control found the same page GraMM-RAG did and answered correctly. The hallucination is real, and it belongs to the page budget rather than to the retriever. That is the confound, visible in one question.`
        : `<b>Same budget, one page apart.</b> Both controls had pages 3 and 11. The page-matched arm spent its third page on navigation and answered with the state; GraMM-RAG spent its third page on the lookup table the graph ranked first. This is the comparison the whole evaluation is built to make.` }
  ];
}

function renderPipeline() {
  const c = DATA.cases[CASE], S = stages(c), s = S[STEP];
  const rail = $('#rail'); rail.innerHTML = '';
  S.forEach((st, i) => {
    const b = E('button', i < STEP ? 'done' : '', `<em>${String(i + 1).padStart(2, '0')}</em><i>${st.t}</i>`);
    b.setAttribute('aria-current', i === STEP);
    b.onclick = () => { stop(); STEP = i; renderPipeline(); };
    rail.appendChild(b);
  });
  $('#qhead').innerHTML = `
    <div class="doc"><span class="pill g">${esc(c.doc.type)}</span>
      <span class="pill">${c.doc.pages} pages</span>
      <span class="pill">${c.doc.elements} parsed elements</span>
      <span class="src">question ${c.qidx} of 1,091 | MMLongBench-Doc | archived run, seed 42</span></div>
    <div class="q">${esc(c.question.text)}</div>
    <div class="gold">Gold answer <b>${esc(c.question.gold)}</b> | evidence page ${c.question.gold_pages.join(', ')}</div>`;
  $('#stageBody').innerHTML = `
    <div class="top"><div class="no">${STEP + 1}</div>
      <div class="ttl"><h2>${s.t}</h2><p>${s.s}</p></div>
      <div class="src">${s.src}</div></div>
    <div class="body">
      <div class="left"><h4>What happens</h4><p>${s.act}</p>
        <h4>Measured</h4><div class="meas">${s.meas.map(([k, v]) => `<div><span>${k}</span><span>${v}</span></div>`).join('')}</div></div>
      <div class="right">${s.art}</div>
    </div>`;
  $('#guide').innerHTML = s.guide;
  $('#prev').disabled = STEP === 0;
  $('#next').disabled = STEP === S.length - 1;
  document.querySelectorAll('.casebtn').forEach(b => b.setAttribute('aria-pressed', b.dataset.c === CASE));
}
function stop() { if (timer) { clearInterval(timer); timer = null; $('#play').innerHTML = '&#9654; Play all'; } }
function play() {
  if (timer) return stop();
  $('#play').innerHTML = '&#10073;&#10073; Pause';
  timer = setInterval(() => {
    if (STEP >= 7) { stop(); return; }
    STEP++; renderPipeline();
  }, +$('#spd').value);
}

function viewPipeline() {
  const v = E('section', 'view'); v.id = 'v-pipeline';
  v.innerHTML = `
    <div style="display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin-bottom:12px">
      <h2 style="font-size:23px">End-to-end pipeline</h2>
      <span class="tiny">eight stages, one real question | three retrieval arms | arrow keys to step</span></div>
    <div class="caserow" id="caserow"></div>
    <div class="qhead" id="qhead"></div>
    <div class="rail" id="rail"></div>
    <div class="stage"><div id="stageBody"></div>
      <div class="transport">
        <button class="act" id="prev">&#9664; Back</button>
        <button class="act pri" id="play">&#9654; Play all</button>
        <button class="act" id="next">Next &#9654;</button>
        <span class="spacer"></span>
        <span class="tiny">pace</span>
        <select id="spd" class="act" style="padding:7px 10px">
          <option value="9000">slow</option><option value="6000" selected>normal</option><option value="3500">brisk</option>
        </select>
      </div></div>
    <div class="guide" id="guide"></div>`;
  return v;
}
function wirePipeline() {
  const row = $('#caserow');
  [['q507', 'q507 | the graph wins at a matched budget', 'Both arms read pages 3 and 11. The third differs: graph-picked page 8, the lookup table, against a dense page 13.'],
   ['q823', 'q823 | a hallucination, and the confound that hides it', 'The two-page control invents a figure found nowhere in the document. The page-matched control finds the answer on its own.']
  ].forEach(([id, t, s]) => {
    const b = E('button', 'casebtn', `<b>${t}</b><span>${s}</span>`);
    b.dataset.c = id;
    b.onclick = () => { stop(); CASE = id; STEP = 0; renderPipeline(); };
    row.appendChild(b);
  });
  $('#prev').onclick = () => { stop(); if (STEP > 0) { STEP--; renderPipeline(); } };
  $('#next').onclick = () => { stop(); if (STEP < 7) { STEP++; renderPipeline(); } };
  $('#play').onclick = play;
  renderPipeline();
}
