# MiniRiskers Evaluation Framework

Evaluations measure the **deterministic risk engine** and **edge-case handling**.
LLM outputs (BRD extraction, assessment draft) are evaluated separately in manual
demo review and future faithfulness checks.

## Structure

```text
evals/
├── datasets/
│   └── golden.jsonl      # 17 BRDs + sample: expected bands, factor seeds, edge flags
├── results/
│   └── YYYY-MM-DD.md     # Committed run reports
├── run_evals.py          # Main eval runner
└── README.md
```

## Suites

| Suite | What it tests | Requires API? |
|---|---|---|
| **Scoring accuracy** | SME-expected inherent band vs engine output on representative factor seeds | No |
| **Determinism** | Same inputs → identical score on repeat runs | No |
| **Edge cases** | Sparse/contradictory BRDs handled appropriately | No |
| **RAG retrieval** | (Future) hit@k on expected regulation per factor | ChromaDB |
| **AI faithfulness** | (Future) cited regulations exist in retrieved evidence | Gemini |

## Running

```bash
python evals/run_evals.py
```

Exit code 0 = all exact-match scoring tests pass + determinism stress pass.

## Golden dataset methodology

Each row in `golden.jsonl` was labelled by acting as FCRM SMEs reading the
synthetic BRD in `brds/`. `factor_seeds` represent the risk factors we expect
the generator to raise for that change — not a full end-to-end BRD→DB pipeline
(which requires Gemini for extraction).

After methodology weight changes, re-run evals and commit updated results.

## Related

- `tests/` — pytest unit/integration tests
- `docs/requirements/expanded-spec.md` — acceptance criteria
- `Architecture/IMPROVEMENT_ROADMAP.md` §6 — original eval spec
