# GraMM-RAG Interactive Portal

`GraMM-RAG_Portal.html` plus the `portal_docs/` folder beside it. No network, no build step.
Double-click it, or open it full-screen on the demo machine. White ground with black and gold
accents, matching the defense deck.

**Keep `portal_docs/` next to the HTML.** It holds the two source PDFs that the "Open the source
PDF" button on stage 01 loads in a modal. Everything else is inside the single HTML file.

It consolidates and supersedes `BACKUP_pipeline_illustrated.html` and
`BACKUP_MAUF_weight_explorer.html` (the FB revisions were the starting point).

---

## The four demos

**Overview** — three headline numbers and a way into each demo.

**End-to-end pipeline** — one real question through eight stages: raw corpus → parse → graph →
retrieve → score → assemble → generate → evaluate. Each stage shows *what happens*, *what was
measured*, and *the artifact it produced*, with a guide note underneath. Step with the buttons,
the arrow keys, or press **Play all**.

Three stages carry a purpose-built artifact. Stage 01 opens the actual source PDF in a modal.
Stage 03 draws the subgraph induced on the gold evidence page, with its typed edges colour-coded,
above the per-relation census for the whole document. Stage 05 decomposes the utility score into
its three weighted terms, so the sum that produces U is on screen rather than asserted.

Three retrieval arms answer the same question at every stage from assembly onward, so retrieval,
generation and evaluation are all visible side by side:

| arm | budget | role |
|---|---|---|
| GraMM-RAG | 3 pages | system under study |
| Flat-vector k = 3 | 3 pages | **page-matched control** — every delta on the poster and in the dissertation is against this |
| Flat-vector k = 2 | 2 pages | unmatched control — the one that overstates gains by 14–120% |

**Flip the case** with the two buttons at the top:

- **q507** — College Board Search reference, 18 pp. Both controls read pages 3 and 11. The third
  page differs: GraMM-RAG gets graph-picked page 8, the EPS lookup table the graph ranked *first*;
  the page-matched control gets dense page 13, a navigation page. Answers: **"Little Rock"**
  against **"Arkansas (AR)"**. ANLS 1.0 against 0.0 at an equal budget.
- **q823** — Hamilton County, Nebraska Historic Buildings Survey, 20 pp. The two-page control
  invents **552**, a figure that appears nowhere in the document's text. The page-matched control
  finds page 11 on its own and answers **538**, same as GraMM-RAG. This case exists to show the
  hallucination *and* the confound that produces it: at a matched budget there is no difference
  here, which is exactly why the dissertation refuses to quote the unmatched control.

**Utility function** — every weighting of `U = a·C + b·S + c·T` plotted on the weight simplex,
coloured by AUC as a detector of answerability. Drag the sliders, switch corpora, or run the grid
search and watch the optimum walk to the `c = 0` edge. Marginals reproduce Table 31 to four
decimals.

**Falsification** — seven claims, each with the experiment written down before the measurement.
Pick one and press **Run the falsifier**; the four steps reveal in sequence. Below it, the full
28-correction tally and the four error classes.

**Results** — Table 8 as an interval plot, the localization gap, the reference-point comparison,
the abstention ceiling with its three-number reconciliation, and the generator-side signals.

---

## Where every number comes from

Nothing is simulated. The build is reproducible from `portal_src/`.

| shown in the portal | read from |
|---|---|
| contexts, predictions, ANLS, utility score, route, graph-leg ranking | `grammrag_handoff/gramm-rag-3benchmarks/data/mmlongbench/gramm_mmlongbench_s42.json` and `baseline_vector_mmlb.json` |
| page-matched control arm | `grammrag_handoff/gramm-rag-colpali/generation/flatk3_gen_mmlongbench.json` (`PAGE_CONTEXT_N: 3`, mean 3.000 pages/question) |
| question text, gold, evidence pages, doc type | `gramm-rag-mmlongbench/data/mmlongbench/mmlongbench_doc.json`, `qmeta_mmlb.json` |
| element counts, per-page breakdown, gold-page elements, temporal markers | `Grammrag_backup/gramm-rag-mmlongbench/cache/parsed/<doc>.pdf.json` |
| ANLS recomputation | the project scorer, `src/evaluation/metrics.py` |
| MAUF grid and marginals | `attr_components_*.npz`, carried over from the verified weight explorer |
| C, S, T components on stage 05 | `attr_components_mmlongbench.npz`, rows 507 and 823. They reconstruct the archived U to within 1e-4 (q507: 0.325357 against 0.325450; q823: 0.412374 against 0.412375) |
| Table 8, 9, 18, 31, 34, 37 figures; falsifier details | `GraMM-RAG Dissertation v5.3.docx` |

**Edge counts are rebuilt, not archived.** The node-level subgraph was never persisted, so the
graph stage recomputes edges from the shipped parse using the deterministic rules in
`src/graph/edges.py` — reading order, hierarchy, spatial proximity, caption linking and temporal
marker agreement. Co-reference, cross-page and the model-extracted triplet relation are **not**
reconstructed, and the portal says so on the stage. (This differs from the earlier illustrated
walkthrough, which used a looser rebuild; this one follows the shipped source.)

---

## Rebuilding

```
cd portal_src
python extract.py      # reads the archives → portal_cases.json
python builddata.py    # + MAUF grid + dissertation figures → portal_data.json
bash assemble.sh       # head + css + js + data → GraMM-RAG_Portal.html
```

Edit copy and styling in `portal_head.html`, `portal_css2.html`, `portal_css3.html`,
`portal_js.js`, `portal_js2.js`, then re-assemble.

---

## Running it on the demo machine

Full-screen in any modern browser. The layout goes two-column at 1100 px and above, so a
1920 × 1080 projector shows a whole stage without scrolling. Arrow keys step the pipeline.
No network access is needed at any point.
