# Vision test for the enemy highlight color (v3.0)

**Research date:** 2026-11-01. Confidence key: **[V]** checked against the source or its abstract this session; **[M]** standard reference cited from the literature, not re-opened; **[U]** unverified.

## Why the old test was replaced
- **What the old test did:** v2 flashed outlined enemies and scored click reaction time divided by hit rate (the inverse efficiency score).
- **Why that was a problem:**
  - Reaction time also includes motor speed, mouse and display latency, input lag and browser event jitter. None of these depend on the outline color.
  - With 6 trials per color, those sources of noise were larger than any difference between colors.
- **How v3 fixes it:**
  - The test now measures a **visual threshold**: the weakest outline at which the player can still tell where the highlighted enemy was.
  - The player answers with **no time limit**.
  - Response time is never stored.

## Design
| Element | Choice | Basis |
|---|---|---|
| Task | Four-way forced choice. Four identical dark figures appear and one has the highlight outline. The player answers 1–4, or clicks. Chance = 25%. | Forced-choice localisation removes response bias [M: Green & Swets 1966] |
| What varies | Outline **opacity**, in log10 units (−2 to 0). Exposure is fixed. | On a 60 Hz screen duration can only change in 16.7 ms steps, too coarse for a staircase. Varying opacity is finer and works the same on every refresh rate (research brief). |
| Exposure | `round(58 ms / frame)` frames, at least 2. Catch trials use 4× that. | Inspection-time paradigm: brief forced-choice exposure followed by a mask [V: Vickers, Nettelbeck & Willson 1972, *Perception* 1:263] |
| Mask | 350 ms of outline fragments in all three test colors plus dark and light neutrals, drawn over every slot | A backward mask stops iconic memory from extending the exposure [M: Sperling 1960; Breitmeyer & Ogmen 2000]. Using every color equally means the mask favors none. |
| Staircase | Weighted up-down rule: −0.05 log10 after a correct answer, +0.15 after a wrong one. Steps are doubled until 2 reversals. Converges near 75% correct. | Kaernbach 1991, *Percept. Psychophys.* 49:227 [V]. 75% sits well above the 25% guess rate, unlike the 70.7% of a 1-up-2-down rule. |
| Interleaving | One staircase per color, mixed together in random order. All colors get the same scene sequence (8 scenes: sand, concrete, shadow, cool blue, foliage, purple utility, fire, yellow utility). | Fatigue, learning and scene difficulty hit every color equally |
| Length | 20 trials per color plus 7 catch trials = 67 trials, about 2 minutes. "Finish early" keeps whatever is enough to fit (≥ 6 per color). | This is a compromise. The research brief suggests 160–240 trials for lab-grade thresholds. The shortfall is handled by shrinkage (below). |
| Fit | Maximum likelihood: `p = γ + (1−γ−λ) / (1 + e^(−s(x−α_c)))`, with γ = 0.25 and λ = 0.03. Each color has its own α; the slope s is shared (grid 3–20 with a weak prior). The threshold is reported at 75% correct. The uncertainty is the half-width of the profile-likelihood interval (Δ log L = 0.5). | Wichmann & Hill 2001 [M]. Fitting all trials is better than averaging reversals, because short staircases are biased (García-Pérez 1998 [V]). |
| Score | `d_c` = a color's threshold minus the mean threshold (log10). Shrink it toward zero: `d·τ²/(τ²+se²)` with τ = 0.25. Bonus = `−6 × shrunk d`, capped at ±2.5 points. | Empirical-Bayes shrinkage: an uncertain estimate moves the result less |

## Timing and reliability checks
- **Refresh rate**
  - Measured from 40 `requestAnimationFrame` intervals before the test starts. The median interval is used.
- **Drawing**
  - Every stimulus is pre-rendered to an offscreen canvas. Frames are only swapped inside `requestAnimationFrame` callbacks, never on `setTimeout`.
  - Garaizar & Reips 2019, *BRM* 51:1441 [V]: pre-render, and count frames.
- **Actual exposure**
  - Measured as the mask frame's timestamp minus the stimulus frame's timestamp.
- **Dropped frames**
  - A trial counts as dropped if:
    - the exposure is off by more than half a frame;
    - any interval is longer than 1.5 frames;
    - or the tab was hidden during the trial.
  - A dropped trial is **repeated and not scored**.
  - If more than 5% of trials are dropped, the test bonus is halved.
- **Lapses**
  - Catch trials are at full strength with 4× the exposure.
  - Scoring below 85% on them (more than 1 of 7 missed) means the player wasn't attending, so the test is ignored (weight 0).
- **Threshold at the edge**
  - If a threshold lands at the edge of the tested range, the player is told.
- **Browser accuracy in published work**
  - Anwyl-Irvine et al. 2021, *BRM* 53:1407 [V]: duration accuracy is reasonable but varies by browser and OS.
  - Bridges et al. 2020, *PeerJ* 8:e9414 [V]: close to millisecond precision on the best browser and OS combinations.
  - **Caveat [U]:** whether rAF timestamps match the moment the screen actually updates depends on the compositor.

## Validation (simulated observers, `test/xhair.test.js`)
- **True difference** (yellow threshold 0.3–0.4 log units below red and purple): yellow ranks first in ≥ 27 of 30 runs.
- **No true difference:** a bonus above 1.5 points appears in ≤ 3 of 30 runs.
- **Catch trials answered at 30%:** the result is voided.
- **15% dropped frames:** the weight is halved, and every dropped trial is repeated, so 60 scored trials remain.
- **Real-player validation:** none yet. Results depend on the monitor (brightness, gamma) and on how close the drawn colors are to the in-game ones.

## Highlight colors used
- **Community-posted values [U]:** Yellow `#FFFF00` (both yellows), Red `#FF0000`, Purple `#A907E4` (pastebin list cited in the research brief). Riot publishes none.
- **How the test handles the two yellows:** they render identically, so the test treats them as one color, "yellow".

## Sources
- Kaernbach 1991 https://link.springer.com/article/10.3758/BF03214307
- García-Pérez 1998 https://pubmed.ncbi.nlm.nih.gov/9797963/
- Vickers et al. 1972 https://journals.sagepub.com/doi/10.1068/p010263
- Garaizar & Reips 2019 https://link.springer.com/article/10.3758/s13428-018-1126-4
- Anwyl-Irvine et al. 2021 https://link.springer.com/article/10.3758/s13428-020-01501-5
- Bridges et al. 2020 https://peerj.com/articles/9414/
- Mullen & Kingdom 2002 https://pubmed.ncbi.nlm.nih.gov/12180855/
- Hansen et al. 2009 https://jov.arvojournals.org/article.aspx?articleid=2193447
- Machado et al. 2009 https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html · DaltonLens review https://daltonlens.org/opensource-cvd-simulation/
