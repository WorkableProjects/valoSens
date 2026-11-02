# valoSens scorecard (simulated players)

Written by `node test/scorecard.js --write`. Error is |log2(recommended / true optimum)| in octaves.

| Arm | n ok | median err (oct) | mean err (oct) | p90 err (oct) | 80% coverage | 50% coverage | failures |
|---|---|---|---|---|---|---|---|
| A prior | 60 | 0.390 | 0.390 | 0.769 | 0.87 | 0.52 | 0 |
| B questionnaire | 60 | 0.326 | 0.360 | 0.704 | 0.80 | 0.45 | 0 |
| C + aim test (6 min) | 60 | 0.225 | 0.258 | 0.568 | 0.77 | 0.48 | 0 |
| D thorough (12 min) | 60 | 0.200 | 0.230 | 0.457 | 0.77 | 0.47 | 0 |

Mode: fast; players n = 60 (seeds 1000..1059); N_true = 30 trials per task per cm; true optimum at a range edge: 6/60; cTrue median 54.8 cm/360 (range 29.8-120.0).

Date: 2026-11-02
