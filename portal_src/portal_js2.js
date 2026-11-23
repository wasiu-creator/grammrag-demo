/* ================= MAUF ================= */
let CORP = 'mmlongbench', W = [0.40, 0.40, 0.20], search = null, baseCorp = null;

const TRI = { w: 560, h: 500, pad: 54 };
function bary(a, b, c) {
  const s = a + b + c || 1; a /= s; b /= s; c /= s;
  const W2 = TRI.w - 2 * TRI.pad, H2 = TRI.h - 2 * TRI.pad - 26;
  return { x: TRI.pad + W2 * (b + c / 2), y: TRI.pad + H2 * (1 - c) };
}
function heat(t) { // light grey -> deep gold
  const lo = [238, 240, 243], hi = [143, 111, 30];
  return `rgb(${lo.map((v, i) => Math.round(v + (hi[i] - v) * t)).join(',')})`;
}
function nearestGrid(d, a, b, c) {
  let best = null, bd = 1e9;
  for (const p of d.grid) { const t = (p.a - a) ** 2 + (p.b - b) ** 2 + (p.c - c) ** 2; if (t < bd) { bd = t; best = p; } }
  return best;
}
function drawBase() {
  const d = DATA.mauf[CORP], el = $('#tri'); if (!el) return;
  const lo = Math.min(...d.grid.map(p => p.auc)), hi = Math.max(...d.grid.map(p => p.auc));
  const P = bary(1, 0, 0), Q = bary(0, 1, 0), R = bary(0, 0, 1);
  let s = `<svg viewBox="0 0 ${TRI.w} ${TRI.h}" role="img" aria-label="Weight simplex coloured by AUC">
    <polygon points="${P.x},${P.y} ${Q.x},${Q.y} ${R.x},${R.y}" fill="#fcfcfd" stroke="#dde2e8"/>`;
  for (const p of d.grid) {
    const { x, y } = bary(p.a, p.b, p.c), t = (p.auc - lo) / (hi - lo || 1);
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${p.c === 0 ? 7.5 : 6.5}" fill="${heat(t)}"
      stroke="${p.c === 0 ? '#8F6F1E' : 'none'}" stroke-width="${p.c === 0 ? 1.2 : 0}"/>`;
  }
  const bp = bary(d.best.a, d.best.b, d.best.c), sp = bary(...d.shipped);
  s += `<circle id="mBest" cx="${bp.x}" cy="${bp.y}" r="11" fill="none" stroke="#1C7A4E" stroke-width="2.5"/>
        <circle id="mShip" cx="${sp.x}" cy="${sp.y}" r="9" fill="none" stroke="#2F5FA8" stroke-width="2.5"/>
        <circle id="mCur" cx="${sp.x}" cy="${sp.y}" r="14" fill="none" stroke="#B3332F" stroke-width="3"
          style="transition:cx .09s linear, cy .09s linear"/>
        <text x="${P.x - 4}" y="${P.y + 24}" fill="#525c6b" font-size="13" text-anchor="middle">a = 1 | coverage</text>
        <text x="${Q.x + 4}" y="${Q.y + 24}" fill="#525c6b" font-size="13" text-anchor="middle">b = 1 | similarity</text>
        <text x="${R.x}" y="${R.y - 16}" fill="#525c6b" font-size="13" text-anchor="middle">c = 1 | temporal</text>
        <text x="${(P.x + Q.x) / 2}" y="${P.y + 46}" fill="#8F6F1E" font-size="12" text-anchor="middle" font-weight="600">the c = 0 edge, where every optimum sits</text>
      </svg>`;
  el.innerHTML = s;
  baseCorp = CORP;
}
function drawTri() {
  if (baseCorp !== CORP) drawBase();
  const d = DATA.mauf[CORP], cur = nearestGrid(d, W[0], W[1], W[2]);
  const cp = bary(cur.a, cur.b, cur.c), m = $('#mCur');
  if (m) { m.setAttribute('cx', cp.x.toFixed(1)); m.setAttribute('cy', cp.y.toFixed(1)); }
  $('#auc').innerHTML = `${f4(cur.auc)}<small>AUC | ${CORP === 'mmlongbench' ? 'MMLongBench-Doc' : 'DocBench'}</small>`;
  $('#wlab').innerHTML = `a = ${cur.a.toFixed(2)} | b = ${cur.b.toFixed(2)} | c = ${cur.c.toFixed(2)}`;
  $('#cmp').innerHTML = `
    <div><span>Shipped weights ${d.shipped.join(' / ')}</span><span>${f4(d.shipped_auc)}</span></div>
    <div><span>Best found on the grid</span><span>${f4(d.best.auc)} at ${d.best.a} / ${d.best.b} / ${d.best.c}</span></div>
    <div><span>Coverage C alone</span><span>${f4(d.marginal.C)}</span></div>
    <div><span>Similarity S alone</span><span>${f4(d.marginal.S)}</span></div>
    <div><span>Temporal T alone</span><span>${f4(d.marginal.T)}</span></div>
    <div><span>Generator on identical pages</span><span>${CORP === 'mmlongbench' ? '0.8060' : '0.7500'}</span></div>`;
  $('#verdict').innerHTML = cur.c === 0
    ? 'Temporal term switched off. This edge contains the optimum on <b>both</b> corpora.'
    : (cur.auc < d.best.auc - 0.0005
      ? `Giving the temporal term weight costs <b>${f4(d.best.auc - cur.auc)}</b> AUC against the best point on the c = 0 edge.`
      : 'At this weighting the temporal term is effectively inert.');
}
function runSearch() {
  if (search) { clearInterval(search); search = null; $('#go').innerHTML = '&#8634; Grid search'; return; }
  const d = DATA.mauf[CORP]; let i = 0, bestA = -1, bestP = null;
  $('#go').innerHTML = '&#10073;&#10073; Stop';
  search = setInterval(() => {
    if (i >= d.grid.length) {
      clearInterval(search); search = null; $('#go').innerHTML = '&#8634; Grid search';
      W = [bestP.a, bestP.b, bestP.c]; syncSliders(); labelSliders(); drawTri();
      $('#prog').innerHTML = `search complete | ${d.grid.length} weightings evaluated | best ${f4(bestA)} at c = ${bestP.c.toFixed(2)}`;
      return;
    }
    const p = d.grid[i++];
    if (p.auc > bestA) { bestA = p.auc; bestP = p; }
    W = [p.a, p.b, p.c]; syncSliders(); labelSliders(); drawTri();
    $('#prog').innerHTML = `evaluating ${i} of ${d.grid.length} | best so far ${f4(bestA)} at c = ${bestP.c.toFixed(2)}`;
  }, 55);
}
function syncSliders() { ['a', 'b', 'c'].forEach((k, i) => { const s = $('#s' + k); if (s) s.value = Math.round(W[i] * 100); }); }
function labelSliders() { ['a', 'b', 'c'].forEach((k, i) => { const l = $('#l' + k); if (l) l.textContent = W[i].toFixed(2); }); }
function readSliders() {
  const v = ['a', 'b', 'c'].map(k => +$('#s' + k).value);
  const s = v.reduce((x, y) => x + y, 0) || 1;
  W = v.map(x => x / s); labelSliders(); drawTri();
}
function viewMauf() {
  const v = E('section', 'view'); v.id = 'v-mauf';
  v.innerHTML = `
    <div class="eyebrow">Demo 02 | the construct that collapses</div>
    <h2 style="font-size:26px;margin-bottom:6px">Multi-attribute Utility Function</h2>
    <p class="lead" style="margin:0 0 20px">Every point in the triangle is a real evaluation of
    <span class="mono">U = a&middot;C + b&middot;S + c&middot;T</span> over the archived per-question attributes, scored as a
    detector of answerability. Move the weights, or let the grid search run. The marginals reproduce
    Table 31 to four decimals.</p>
    <div class="corpbtns" style="margin-bottom:14px" id="corpbtns"></div>
    <div class="maufwrap">
      <div class="tri" id="tri"></div>
      <div class="ctrls">
        <div class="readout"><div class="big" id="auc"></div>
          <div class="tiny mono" id="wlab" style="margin-top:6px;color:#aab3bf"></div>
          <div class="cmp" id="cmp"></div></div>
        <div class="card"><h3>Set the weights</h3>
          <div class="sl"><div class="row"><span>a | entity coverage</span><b id="la"></b></div>
            <input type="range" id="sa" min="0" max="100" value="40"></div>
          <div class="sl" style="margin-top:12px"><div class="row"><span>b | semantic similarity</span><b id="lb"></b></div>
            <input type="range" id="sb" min="0" max="100" value="40"></div>
          <div class="sl" style="margin-top:12px"><div class="row"><span>c | temporal coherence</span><b id="lc"></b></div>
            <input type="range" id="sc" min="0" max="100" value="20"></div>
          <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
            <button class="act pri" id="go">&#8634; Grid search</button>
            <button class="act" id="ship">Shipped weights</button>
            <button class="act" id="zero">Jump to the optimum</button></div>
          <p class="tiny mono" id="prog" style="margin:10px 0 0"></p>
          <p class="tiny" style="margin:8px 0 0">The optimum found by the search lies on the c = 0 edge on
          both corpora, so that button also switches the temporal term off.</p></div>
        <div class="card"><h3>What the markers mean</h3>
          <p class="note" style="margin:0">
            <span style="color:#B3332F">&#9679;</span> your weighting &nbsp;
            <span style="color:#2F5FA8">&#9679;</span> shipped &nbsp;
            <span style="color:#1C7A4E">&#9679;</span> best on the grid<br>
            Colour runs light grey to deep gold with AUC. The ringed points along the bottom edge are c = 0.</p></div>
      </div></div>
    <div class="guide" id="verdict" style="margin-top:16px"></div>
    <div class="grid g3" style="margin-top:16px">
      <div class="card"><h3>The significance of C</h3><p class="note">Coverage alone equals the joint
        cross-validated model on MMLongBench-Doc. The cosine term, the one meant to be the
        direct measure of semantic match, sits at 0.507, which is chance.</p></div>
      <div class="card"><h3>Temporal term absence</h3><p class="note">Dropping the temporal term lifts
        the score from 0.556 to 0.574. It contributes 14 to 15 percent of the score's variance while
        costing roughly 0.018 in AUC, so it is harmful rather than merely inert.</p></div>
      <div class="card"><h3>MP-DocVQA has no surface</h3><p class="note">That corpus carries no unanswerable
        stratum at all, so there is no positive class, abstention AUC is undefined, and the threshold is
        recorded as "not tunable (schema)".</p></div>
    </div>`;
  return v;
}
function wireMauf() {
  const cb = $('#corpbtns');
  [['mmlongbench', 'MMLongBench-Doc | n = 1,088'], ['docbench', 'DocBench | n = 1,102']].forEach(([id, t]) => {
    const b = E('button', 'act', t); b.dataset.c = id;
    b.setAttribute('aria-pressed', id === CORP);
    b.onclick = () => {
      if (search) runSearch();
      CORP = id; cb.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x.dataset.c === id));
      drawBase(); drawTri();
    };
    cb.appendChild(b);
  });
  ['a', 'b', 'c'].forEach(k => $('#s' + k).addEventListener('input', readSliders));
  $('#go').onclick = runSearch;
  $('#ship').onclick = () => { if (search) runSearch(); W = DATA.mauf[CORP].shipped.slice(); syncSliders(); labelSliders(); drawTri(); };
  $('#zero').onclick = () => { if (search) runSearch(); const b = DATA.mauf[CORP].best; W = [b.a, b.b, b.c]; syncSliders(); labelSliders(); drawTri(); };
  syncSliders(); labelSliders(); drawBase(); drawTri();
}

/* ================= FALSIFICATION ================= */
let FSEL = 0, ftimer = null;
const FALS = () => DATA.falsifiers.slice(0, 7);
function renderFalsify() {
  const f = FALS()[FSEL];
  document.querySelectorAll('#flist button').forEach((b, i) => b.setAttribute('aria-pressed', i === FSEL));
  $('#fbody').innerHTML = `
    <div class="fstep on" id="fs0"><h5>Step 1 | the claim, as first written</h5><p>${f.claim}</p></div>
    <div class="fstep" id="fs1"><h5>Step 2 | the falsifier, registered before measurement</h5><p>${f.test}<br>
      <span class="tiny" style="color:var(--faint)">${f.reg}</span></p></div>
    <div class="fstep" id="fs2"><h5>Step 3 | run it, and report whichever way it falls</h5><p>${f.detail}</p></div>
    <div class="fstep" id="fs3"><h5>Step 4 | what happened to the claim</h5>
      <div class="verdict"><span class="stamp ${f.outcome}">${f.outcome}</span>
        <b style="font-size:15px">${f.verdict}</b></div>
      <p class="tiny" style="color:var(--faint);margin:0">Register id ${f.id}. Every withdrawal is recorded
      where the evidence that forced it is reported, under the wording it was first recorded in.</p></div>`;
  $('#frun').innerHTML = '&#9654; Run the falsifier';
}
function runFalsifier() {
  if (ftimer) { clearInterval(ftimer); ftimer = null; }
  ['fs1', 'fs2', 'fs3'].forEach(id => { const e = $('#' + id); if (e) e.classList.remove('on'); });
  let i = 1;
  $('#frun').innerHTML = 'running…';
  ftimer = setInterval(() => {
    if (i > 3) { clearInterval(ftimer); ftimer = null; $('#frun').innerHTML = '&#8635; Run again'; return; }
    const e = $('#fs' + i); if (e) e.classList.add('on');
    i++;
  }, 900);
}
function viewFalsify() {
  const v = E('section', 'view'); v.id = 'v-falsify';
  const reg = DATA.corpus.register;
  v.innerHTML = `
    <div class="eyebrow">Demo 03 | claims paired with the experiment most likely to refute them</div>
    <h2 style="font-size:26px;margin-bottom:6px">The falsification protocol</h2>
    <p class="lead" style="margin:0 0 20px">Each claim below was written down with its falsifier
    <em>before</em> the measurement, and the outcome was reported whichever way it fell. Pick one and run it.</p>
    <div class="fgrid">
      <div class="flist" id="flist"></div>
      <div>
        <div class="card" style="margin-bottom:12px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <button class="act pri" id="frun">&#9654; Run the falsifier</button>
          <span class="tiny">Each step appears as the protocol reaches it.</span></div>
        <div id="fbody"></div>
      </div></div>
    <div class="sep"></div>
    <div class="grid g2">
      <div class="card"><h3>What the protocol cost, across all 28 classified corrections</h3>
        <div class="tally" style="margin-top:12px">
          ${reg.map(([k, n]) => `<div class="row"><span>${k}</span><div><i style="width:${100 * n / 15}%"></i></div><s>${n}</s></div>`).join('')}
        </div>
        <p class="note" style="margin-top:12px">Twenty-three of twenty-eight either cost a claim or removed
        something that would have flattered the work. The register holds <b style="color:var(--gold)">81</b>
        entries in total, of which <b style="color:var(--gold)">21</b> would have printed a plausible wrong number.</p></div>
      <div class="card"><h3>Four error classes</h3>
        <p class="note"><b style="color:var(--gold)">Provenance</b>
        failures reuse an input without tracing it. <b style="color:var(--gold)">Referent</b> failures use a
        correct number describing a different quantity. <b style="color:var(--gold)">Coincidence</b> failures
        accept a numerical correspondence as confirmation. And
        <b style="color:var(--gold)">claim-exceeds-computation</b> lives between the artifact and its
        description, the one place a numerical check cannot look, and the class most likely to reach print,
        because reviewers check tables and in every instance here the table was right.</p></div>
    </div>`;
  return v;
}
function wireFalsify() {
  const L = $('#flist');
  FALS().forEach((f, i) => {
    const b = E('button', null, `<b><span class="ostamp ${f.outcome}">${f.outcome}</span> ${f.id}</b><span>${f.claim}</span>`);
    b.onclick = () => { FSEL = i; renderFalsify(); }; L.appendChild(b);
  });
  $('#frun').onclick = runFalsifier;
  renderFalsify();
}

/* ================= RESULTS ================= */
function viewResults() {
  const C = DATA.corpus, LOW = -0.02, HIGH = 0.06, span = HIGH - LOW;
  const pos = x => (100 * (x - LOW) / span).toFixed(2) + '%';
  const parseCI = s => s.replace(/[\[\]]/g, '').split(',').map(x => parseFloat(x.replace(/−/g, '-').trim()));
  const iv = C.headline.map(r => {
    const d = parseFloat(r.delta.replace(/−/g, '-')), ci = parseCI(r.ci);
    return `<div class="iv"><div class="nm"><b>${r.bench}</b><span>${r.metric} | n = ${r.n}</span></div>
      <div class="track"><div class="zero" style="left:${pos(0)}"></div>
        <div class="band ${r.sig ? '' : 'ns'}" style="left:${pos(ci[0])};width:${(100 * (ci[1] - ci[0]) / span).toFixed(2)}%"></div>
        <div class="dot ${r.sig ? '' : 'ns'}" style="left:${pos(d)}"></div></div>
      <div class="val ${r.sig ? '' : 'ns'}"><b>${r.delta}</b><span>${r.ci}</span></div></div>`;
  }).join('');
  const ceilRow = (r) => {
    const bar = (val, cls) => {
      const w = Math.max(1, (val - 0.5) / 0.35 * 100), neg = val < 0.5;
      return `<div class="b"><i class="${neg ? 'neg' : cls}" style="left:${neg ? Math.max(0, 100 + w) : 0}%;width:${Math.abs(w).toFixed(1)}%"></i><s>${f3(val)}</s></div>`;
    };
    const gen = r.k.startsWith('Generator');
    return `<div class="ceil"><span class="nm">${r.k}</span>${bar(r.mm, gen ? 'gen' : '')}${bar(r.db, gen ? 'gen' : '')}</div>`;
  };
  const v = E('section', 'view'); v.id = 'v-results';
  v.innerHTML = `
    <div class="eyebrow">Demo 04 | what held, what did not</div>
    <h2 style="font-size:26px;margin-bottom:6px">Results</h2>
    <p class="lead" style="margin:0 0 22px">Every delta is GraMM-RAG minus the page-matched flat-vector
    control, under a paired bootstrap at 4,000 resamples, seed 42. Per corpus, never pooled.</p>

    <div class="card"><h3>Answer quality at a matched page budget <span class="src" style="margin-left:8px">Table 8</span></h3>
      <div class="ivplot" style="margin-top:14px">${iv}</div>
      <div class="axis" style="margin-top:8px"><span>&minus;0.02</span><span>0</span><span>+0.02</span><span>+0.04</span><span>+0.06</span></div>
      <p class="note" style="margin-top:14px">Two of three corpora improve with intervals excluding zero.
      <b style="color:var(--gold)">An unmatched control overstates these gains by 14 to 120 percent and accounts
      for all of the MP-DocVQA advantage.</b></p></div>

    <div class="grid g2" style="margin-top:16px">
      <div class="card"><h3>Evidence moves more than answers <span class="src" style="margin-left:8px">Table 9</span></h3>
        <table style="margin-top:10px"><thead><tr><th>Corpus</th><th>Localization</th>
          <th class="num">Control</th><th class="num">GraMM</th><th class="num">&Delta;</th><th class="num">Ratio</th></tr></thead>
          <tbody>${C.localization.map(r => `<tr><td>${r.bench}</td><td class="tiny">${r.metric}</td>
            <td class="num">${f4(r.ctrl)}</td><td class="num">${f4(r.gramm)}</td>
            <td class="num" style="color:var(--gold);font-weight:700">${r.delta}</td><td class="num">${r.ratio}</td></tr>`).join('')}</tbody></table>
        <p class="note" style="margin-top:10px">Conversion efficiency on MMLongBench-Doc is
        <b style="color:var(--gold)">0.188</b>, and no pairwise difference across arms is significant.
        Delivered evidence is necessary and far from sufficient.</p></div>

      <div class="card"><h3>The reference point decides the claim <span class="src" style="margin-left:8px">Table 18</span></h3>
        <table style="margin-top:10px"><thead><tr><th>Metric</th><th class="num">Control</th>
          <th class="num">GraMM</th><th class="num">ColPali</th></tr></thead><tbody>
          <tr><td>Context hit | MMLongBench</td><td class="num">0.278</td><td class="num">0.434</td><td class="num" style="color:var(--gold);font-weight:700">0.800</td></tr>
          <tr><td>ANLS | MMLongBench</td><td class="num">0.323</td><td class="num">0.352</td><td class="num" style="color:var(--gold);font-weight:700">0.468</td></tr>
          <tr><td>Judge accuracy | DocBench</td><td class="num">0.505</td><td class="num">0.533</td><td class="num" style="color:var(--gold);font-weight:700">0.774</td></tr></tbody></table>
        <p class="note" style="margin-top:10px">A page-image retriever beats GraMM-RAG by +0.1160 ANLS and
        +0.2414 judge accuracy. A union of both looks complementary until ColPali gets the same 5.22 pages:
        0.5017 against the union's 0.4804. The claim that survives is narrower, and is stated as such.</p></div>
    </div>

    <div class="card" style="margin-top:16px"><h3>The abstention ceiling
      <span class="src" style="margin-left:8px">Table 31 | AUC for detecting answerability</span></h3>
      <div class="ceil" style="margin-top:12px;color:var(--faint);font-size:11px">
        <span></span><span>MMLongBench-Doc | n = ${C.ceiling.n.mm}</span><span>DocBench | n = ${C.ceiling.n.db}</span></div>
      ${C.ceiling.rows.map(ceilRow).join('')}
      <p class="tiny" style="margin-top:6px">Bars start at chance, 0.500. Pink runs below chance.</p>
      <div class="guide" style="margin-top:12px"><b>Three numbers, one gap.</b> ${C.ceiling.three}</div>
      <table style="margin-top:14px"><thead><tr><th>Generator-side signal, pre-registered</th>
        <th class="num">AUC</th><th>Verdict</th></tr></thead><tbody>
        ${C.generator_side.map(r => `<tr><td>${r.sig}</td><td class="num">${r.auc}</td>
          <td><span class="pill no">${r.v}</span></td></tr>`).join('')}</tbody></table>
      <p class="note" style="margin-top:10px">Failure threshold 0.614, fixed in advance. Gold pages lift the
      autorater only to <b style="color:var(--gold)">0.6098</b>, so it is miscalibrated rather than starved.
      Inverted signals detect a refusal already written. Abstention rankings invert between corpora at Kendall
      &tau;-b &minus;0.828, so this is scoped to MMLongBench-Doc.</p>
      <p class="note"><b style="color:var(--gold)">A second, independent witness.</b> Per question, U correlates
      +0.17 with whether the gold page reached context and &minus;0.05 with answer quality. On DocBench, +0.29 against
      +0.06. The score measures retrieval success, not answerability.</p></div>`;
  return v;
}

/* ================= INIT ================= */
(function init() {
  buildNav();
  const m = $('#main');
  m.appendChild(viewOverview());
  m.appendChild(viewPipeline());
  m.appendChild(viewMauf());
  m.appendChild(viewFalsify());
  m.appendChild(viewResults());
  wirePipeline(); wireMauf(); wireFalsify();
  go('overview');
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closePdf();
    if (current !== 'pipeline') return;
    if (e.key === 'ArrowRight') { stop(); if (STEP < 7) { STEP++; renderPipeline(); } }
    if (e.key === 'ArrowLeft') { stop(); if (STEP > 0) { STEP--; renderPipeline(); } }
  });
  $('#pdfModal').addEventListener('click', e => { if (e.target.id === 'pdfModal') closePdf(); });
})();
