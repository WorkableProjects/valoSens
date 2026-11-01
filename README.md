# valoSens: Valorant sensitivity finder

Open `index.html` in a browser. It needs no build step or server, and nothing leaves the page.

- Model: `model.js` (works in the browser and in Node)
- Tests: `node test/model.test.js` (model) and `node test/ui.e2e.js` (browser smoke test, needs Playwright)
- Pro data: regenerate with `node scripts/build_pros.js` after editing `research/pro_data_audit.json`
- `Valorant sensitivity finder.html` is the original multiplier-based version, kept for reference.

## How the number is computed (model v2)

The internal unit is **cm/360**: centimetres of mouse travel per full turn.

### 1. Questionnaire pathway (default, lower confidence, unvalidated)

For each kind of movement in an explicit task mix, the model estimates the **extra time** a sensitivity adds. Each task is costed by exactly one mechanism, so nothing is counted twice. Fitts' law time doesn't depend on sensitivity, because target size and distance scale together, so it isn't a term.

| Task (default share) | Mechanism | Evidence |
|---|---|---|
| Small correction, 2° (40%) | The hand has a constant noise floor σ0 (~0.2 mm) that doesn't shrink with sensitivity. Once the head is smaller than that on the mouse pad, extra corrective submovements are needed: `t_sub·(1−p)/p` with `p = erf(W / (2√2·σ0))`. | σ0: Casiez 2008, Chapuis & Dragicevic 2011. Submovement time: Meyer 1988. Head size is an estimate. |
| Target switch, 25° (40%) | NVIDIA's group flick curve: about +3.5% flick time per octave² away from ~40 cm/360. Smaller targets shift that optimum slightly slower, by one octave across a 16× size range. | Boudaoud et al. 2022/2023: N=13, static flicks only, weak evidence |
| 90° and 180° turns (15% / 5%) | Expected mouse lifts (expected travel past the pad edge ÷ travel regained per lift), the cost of a bigger joint taking over past comfortable reach, and a peak-speed limit. | Lift time, switch time, start position and reach are estimates |

The guessed constants that move the answer most (σ0, the flick optimum, head size, submovement time) are **averaged over their plausible low, central and high values** (81 combinations). No single guess decides the answer this way.

### 2. Measured pathway (optional, `recommend({ …, calibration: { trials } })`)

**Trial format:** `{ cm, task: "micro"|"flick"|"turn", time, misses?, overshoots?, session?, order? }`

**Scoring:** each trial becomes `time + 0.25 s × misses + 0.10 s × overshoots`. Both penalties can be changed.

**Fitting, per task:**
- Session intercepts absorb day-to-day variation.
- A `ln(1+order)` term absorbs warm-up.
- A quadratic in log₂(cm) captures the sensitivity effect.
- The first 2 trials of each session are dropped as warm-up.

**Is the effect real?** Both of these must hold:
- A nested F-test shows the sensitivity terms matter: p < 0.05, or p < 0.01 with a single session.
- They predict **held-out** trials better than a flat model. Held-out means leave-one-session-out, or alternate repetitions when there's only one session.

**Comparisons on held-out data:** the model's pick vs the current setting, and vs a simple baseline (the best raw tested setting).

**Uncertainty:** a 200-run bootstrap within cells gives an interval for the optimum.

**Never extrapolates:** results stay inside the tested range.

**Warnings** for a fixed test order (warm-up confound), a single session, fewer than 3 tested settings, and missing tasks.

### 3. Recommendation rule (both pathways)

**Near-optimal range** = every setting whose cost is within a tolerance of the best:
- Questionnaire: 6 ms per engagement, an estimate.
- Measured: 10 ms, and inside the range in at least half of the bootstrap refits.

**Choosing the result:**
- If your current setting is in that range, **keep it**.
- Satisfaction can widen the "close enough to keep" margin, but at most 2×. It's a preference, not a measurement.
- Otherwise, recommend the point of the range **closest to your current setting**.
- With no current setting, recommend the minimum.

**Confidence:**
- Questionnaire results get a heuristic label (low / low–medium / medium), not a probability.
- Measured results report a bootstrap interval.

### What no longer affects the number, and why

- **Pro settings:** previously the model was forced to equal the pro median. They're now a comparison group only. Pros' choices reflect their pads, arms, habits and team roles, not proof of what's optimal for you.
- **Rank, HS%, K/D, ADR:** previously these changed the precision weight and how much the current setting was trusted. They're now shown as a before snapshot only. Match stats don't show whether your sensitivity suits your hand.
- **20–80 cm/360 penalty:** removed. In NVIDIA's study those were just the grid points where adjacent conditions weren't significantly different. The old penalty was several times the whole cost at the optimum, effectively a wall. See `research/nvidia_paper_review.md`.
- **Surface type:** it previously scaled hand noise and speed with made-up multipliers. It's now recorded but unused, because there's no evidence for it.
- **Role and weapon:** previously role distances were fitted to pro medians. Each now changes the result by about 3% at most, which is inside the near-optimal range (tested).

## Parameter-sensitivity check

Example player: forearm aimer, 45 cm pad, flex role, rifle. The table shows the result with each constant at its low and high value, all others central. The central-only result is 40.9 cm; the uncertainty-averaged result is 46.0 cm.

| Constant | Basis | Low → result | High → result | Swing |
|---|---|---|---|---|
| `sigma0` hand noise floor | research | 28.4 | 56.5 | 69% |
| `cFlick` NVIDIA flick optimum | research | 36.4 | 45.7 | 23% |
| `headM` head width | estimate | 45.8 | 37.1 | 21% |
| `tSub` submovement time | research | 38.6 | 44.0 | 13% |
| `vPeak` peak hand speed | estimate | 38.2 | 41.9 | 9% |
| `tSwitch` joint-switch cost | estimate | 41.9 | 38.4 | 9% |
| `tLift` lift cost | estimate | 41.9 | 39.5 | 6% |
| everything else | — | — | — | ≤ 2% |

Toggles, for a duelist with a sniper:
- Removing the role changes the result by 2.5%.
- Removing the weapon changes it by 3.3%.
- Dropping the NVIDIA flick term changes it by 3.4%.
- Removing big turns from the task mix changes it by **23%**. The task mix is an important assumption with no direct data behind it.

Run it yourself with `ValoModel.sensitivityAnalysis(input)`.

## Validation status

- **Questionnaire pathway: unvalidated.** No real player performance data was available, so there's no evidence that it beats the old model, the player's current setting, or a simple default.
- **Measured pathway, checked on simulated players only:**
  - It recovers a planted optimum within about 0.05 octave.
  - False-positive rate with no real effect is about 2% with 3 sessions and about 7% with 1 session.
  - On held-out trials it beats a badly chosen current setting in 25 of 40 simulated runs, with no reliable difference in the rest.
  - It does **not** beat the simple "best tested setting" baseline: no reliable difference in 40 of 40 runs. Its added value is interpolation between tested values, a near-optimal range, and refusing to recommend changes that are just noise.
  - Real-player validation is still needed.

## Research files

- `research/nvidia_paper_review.md`: what the NVIDIA paper does and doesn't establish
- `research/constants_and_ergonomics.md`: game yaw constants, input limits, hand noise, reach, clutching
- `research/pro_data_audit.json` and `.md`: per-player status, sources, update and verification dates, conflicts
- `research/pro_roles.md`: roles from VLR.gg agent usage
- `research/model_research.md`: earlier background notes (v1)
