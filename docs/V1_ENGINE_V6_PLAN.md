# valoSens 1.0.0 / Engine v6: release plan

Status: **plan only**, nothing in here has been built yet. Each task has an ID, the files it touches, what it depends on, a suggested agent tier, and acceptance criteria, so it can be handed off as written.

Priority order: **Sensitivity (S)** > Validation (V) > Data (D) > UI (U) > Crosshair/Highlight (X) > Release (R).

---

## -1. Notes from Dutch

Ensure that the bell curve replaces the "distribution" curve in the final screen, since middle is ~0.3 and makes more sense (not only for visual, but for calculations too)

## 0. Version naming

- **App:** `1.0.0` (first stable release). It replaces the 3.x/5.0 labels in the README and UI.
- **Engine v6:** the sensitivity engine (`model.js`). `ValoModel.ENGINE = "6"`, and `VERSION` follows the app version.
- `xhair.js` becomes Vision engine v4 (see X-tasks). `session.js` results files move to **format 2**, and format 1 files are migrated on import.

---

## 1. What's wrong with the current engine (audit, 2026-11-02)

The numbers below come from running `model.js` at 800 DPI with no other answers.

| # | Problem | Evidence | Impact |
|---|---|---|---|
| A1 | **The bell layer amplifies every physical effect about 2.4×.** `bellTarget` maps the model's z-score straight onto the population SD with `rho ≈ 0.99`. That assumes the physical model explains about all of the variation in real players' sensitivity, and nothing supports that. | Wrist aimer, pad 25 → 90 cm: raw model s800 0.414 → 0.287 (×1.44); after the bell 0.465 → 0.190 (×2.45). | Pad-size and other inputs move results far more than the evidence supports. **Largest accuracy problem today.** |
| A2 | **Limb effect has the wrong sign.** At a 45 cm pad, arm aimers get *faster* sens than wrist aimers (raw 0.344 vs 0.325; bell 0.325 vs 0.282). | `pBeyondReach` is a soft step. Wrist reach (3 cm) is passed at almost any sens, so it adds no gradient. Arm reach (10 cm) rewards speeding up to stay under it. | It goes against both pro data and the common rule that arm aimers play slower. |
| A3 | **Agents are counted twice.** Ability mechanics change the task mix, and on top of that the empirical agent z is added at half weight. | `bellTarget` comments; `BELL.agentWeight = 0.5`. | The half weight is a guess, not an estimate. |
| A4 | **Age shifts are invented.** Up to −0.24 SD with no sensitivity data behind them; they're labelled `estimate`. | `AGE` table. | It pushes an unsupported bias into every result. |
| A5 | **The population prior is normal in s800, clamped to 0.1–0.7.** Sensitivity distributions are right-skewed, roughly log-normal. | `BELL`. | Tails are misplaced, and the clamp hides model errors. |
| A6 | **The uncertainty grid is narrow.** It covers 5 of about 20 constants at 3 points (243 scenarios), and the sensitivity check moves one constant at a time. | `UNCERTAIN`, `sensitivityAnalysis`. | It misses interactions and understates the spread. |
| A7 | **The measured pathway has no UI.** `calibrate()` exists and is tested, but users can't produce trials in the app. | `index.html` has no aim test. | The only pathway backed by real data can't be used. |
| A8 | **Measured data overrides the prior** instead of combining with it. | `recommend()` sets `cm = measured.cm`. | A noisy test throws away all the prior information. |
| A9 | **The population is 147 pros only.** | `research/agent_trends_research.md`. | Pros aren't the users; the prior is biased toward them. |
| A10 | **Nothing is validated on real players** (README "Validation status"). | — | Confidence labels can't be checked. |

---

## 2. Engine v6 architecture (sensitivity)

One Bayesian model in **log cm/360**. Each source of information is a likelihood term with an honest width, so they combine without hand-set weights:

```
posterior(log c) ∝  Prior_population(log c | region, agents, rank…)      ← D-tasks (data)
                  × L_physics(log c | answers, personal params)           ← S2–S5 (physics, with a model-discrepancy width)
                  × L_measured(log c | aim-test trials)                   ← S6–S8 (in-app test)
recommendation = progression rule applied to the posterior (S9)
```

- With no test data, the result is a shrunk blend of population and physics. The physics weight is set by how well physics actually predicts (σ_model). This fixes A1.
- With test data, the measured likelihood narrows the posterior, so the prior is never simply thrown away. This fixes A8.
- Every output carries a real 80% interval, and V-tasks can check its coverage.

### S1. Posterior core and API  *(Opus; blocks S9, U3)*
- `model.js`: new `posterior(input, opts)` → `{ grid, logDensity, median, mean, ci80, ci50, components }` on the existing log grid (8–160 cm).
- Keep `recommend()` as the public entry point. It returns `cm`, `lo`/`hi` (now the posterior 50% interval), the full `posterior`, and `components` (prior, physics, measured: each one's centre and width) for the UI's "why this number".
- Keep `opts.noBell` → rename it `opts.physicsOnly`, and add `opts.priorOnly` for diagnostics.
- **Accept:** with only the prior, the posterior equals the population prior. With σ_model → ∞ physics has no effect, and with σ_model → 0 the result equals the physics optimum. Existing conversion and calibration tests still pass. `recommend()` stays under 150 ms in Node for a full input.

### S2. Physics likelihood with model discrepancy  *(Opus; depends on D2 for calibration)*
- Turn the physics optimum into a likelihood: a Normal in log c, centred on the uncertainty-averaged optimum. Its variance is the spread of scenario optima plus **σ_model²**.
- **σ_model is estimated, not guessed.** Fit it on players whose physical inputs are known (pros with known pad size and arm style, from D2): σ_model² = residual variance of real log sens around the physics prediction, minus prior variance explained. Until D2 lands, use a conservative default (σ_model = 0.30 ln, which keeps physics weight around 0.4) and label it.
- Replaces `BELL.rho`, `muLn` and `sdLn`. `scripts/build_bell.js` is replaced by `scripts/build_prior.js` (D3).
- **Accept:** the pad 25 → 90 cm swing is no larger than the raw physics swing, and it shrinks toward the prior in proportion to the physics weight. Unit test asserts it.

### S3. Physics fixes  *(Opus)*
1. **Reach and joint switching (fixes A2).** Replace the `pBeyondReach × tSwitch` step with a continuous **joint-recruitment cost**: the time cost grows smoothly with excursion beyond the wrist range, `tSwitch · softplus((a − reach)/scale)`, plus the wrist's own lower peak speed (wrist vPeak < arm vPeak). Add the literature value for each joint's throughput (Balakrishnan & MacKenzie 1997, Langolf 1976).
   **Accept:** at a fixed pad, the optimum's s800 is ordered wrist ≥ wf ≥ forearm ≥ arm, and the gaps fall within the pro-data ranges from D2.
2. **Signal-dependent noise.** Endpoint σ = √(σ0² + (k·a)²), with k from Harris & Wolpert / Meyer et al. Today it's a constant floor only, which makes small corrections the only precision cost.
3. **Turn angles as a continuous distribution.** Integrate cost over an angle distribution (log-normal mixture, with parameters per role and agent) instead of 4 fixed tasks at 2°/25°/90°/180°. It smooths the cost curve and removes grid artifacts. Task shares map onto the mixture weights, so agent rules still apply.
4. **Flick term.** Keep NVIDIA's curve, but re-express it as a CD-gain effect on effective target width (Casiez et al. 2008; Nancel et al. 2015 on CD-gain optima), so target size enters naturally instead of through the `^−0.25` patch.
5. **Pitch.** Add a vertical component (head-height corrections; vertical travel is about 20–30% of horizontal, an estimate) so `mouseW`/pad height can matter for tall-pad users. Low priority.
- **Accept:** every change ships with a before/after table over a fixed grid of 60 profiles (V2 snapshot), and no single fix moves the median profile by more than 10% without a written justification in `research/engine_v6_physics.md`.

### S4. Full uncertainty propagation  *(Opus)*
- Give every `PARAMS` entry a prior distribution (log-normal from low/central/high, treated as the 10th/50th/90th percentiles), and propagate with **512-point scrambled Sobol quasi-Monte Carlo** instead of the 3^5 grid.
- Replace one-at-a-time `sensitivityAnalysis()` with **Sobol first-order and total indices**, and keep the toggles.
- Speed: precompute each draw's per-task cost curves once per profile. Run in a Web Worker in the browser (U8).
- **Accept:** the median result differs from the 243-scenario result by under 5% on the V2 grid. Sobol indices are reproducible across seeds (±0.02).

### S5. Personal parameters from measurement  *(Opus; depends on S7)*
- **Big lever:** instead of only fitting a curve to test times, the aim test **estimates the user's own physics constants** (σ0, tSub, vPeak, comfortable reach, lift time, usable pad width) from cursor trajectories. These replace the population constants in S2–S4 for that user and collapse most of the physics uncertainty.
  - σ0: endpoint scatter on micro trials.
  - tSub and submovements: velocity-profile segmentation (zero-crossings of acceleration, Meyer 1988).
  - vPeak: peak speed on 180° turns.
  - Reach: the swipe calibration (S7.2).
  - Lift time: the gap in pointer input during clutches.
- **Accept:** on simulated players (V1) with known constants, each recovered constant is within 15% (median) after a 6-minute test.

### S6. Measured likelihood (calibrate v2)  *(Opus)*
- Rework `calibrate()` as a hierarchical Bayesian quadratic in log₂ c per task: random session intercepts, warm-up term, and a heteroscedastic residual. Its output is a likelihood over log c, not a point estimate.
- Keep the existing safeguards as diagnostics: F-test, held-out check, no extrapolation (the likelihood goes flat outside the tested range), and warnings.
- Add **performance metrics beyond time:** hit rate, path efficiency, overshoot distance and submovement count, combined into one cost per trial in seconds (the weights are stated constants).
- **Accept:** the V1 recovery tests from the current `test/model.test.js` (planted optimum within 0.05 octave, false-positive rate ≤ 7%) still pass, and posterior 80% intervals cover the planted optimum in 75–85% of simulations.

### S7. In-browser sensitivity aim test  *(Sonnet for build, Opus to review the task design; blocks S5, S6 in the UI)*
The single largest accuracy gain in this release: it turns A7's dead pathway into the main one.
1. **Rendering.** A minimal WebGL (or Canvas 2D with true perspective) scene using Valorant's projection: 103° horizontal FOV at 16:9, yaw 0.07°/count × sens. The test's sensitivity is set in **cm/360**, using the user's DPI.
2. **Calibration steps, about 1 minute:**
   - DPI check: move the mouse along a credit card (8.56 cm) or ruler, 3 times. Measured counts/cm vs stated DPI catches wrong DPI and acceleration.
   - Pad width: swipe edge to edge.
   - Comfortable reach: "swipe as far as feels natural without moving your elbow", then the same with arm.
3. **Input:** `requestPointerLock({ unadjustedMovement: true })` (raw input in Chromium). If unavailable, detect it and warn about OS acceleration, using the DPI check to measure it. Record `movementX/Y` with `performance.now()` timestamps, so the polling rate is detected too.
4. **Tasks:** micro (head-sized target, 1–4° away), flick (15–40°), turn (90°/180°, target behind), track (strafing target at 5.4 m/s, 20 m). The task mix is weighted to the user's profile.
5. **Design:**
   - 5 sensitivity levels spanning ±0.6 octave around the prior median, interleaved in a randomised Latin-square order (fixes the warm-up confound).
   - **Adaptive:** after each block, choose the next levels where the expected reduction in posterior variance of the optimum is largest.
   - 6-minute default run, 12-minute "thorough" run.
   - Familiarisation trials at each level are discarded.
6. **Output:** trials in the `calibrate()` format plus raw trajectories (downsampled) for S5, saved in the results file (format 2).
- **Accept:** works in Chromium and Firefox. Frame pacing is logged, and trials with dropped frames are flagged. The e2e test drives a full run with synthetic pointer events. No data leaves the page.

### S8. Simulated-player engine  *(Sonnet; blocks S5–S7 acceptance)*
- Extend `test/synthetic.js` into `sim/player.js`: a virtual player with ground-truth constants and true optimum, who produces trajectories through the S7 task generator. This includes submovements, noise, lifts and fatigue/learning drift.
- It's used by V1 and by S5–S6 acceptance tests.

### S9. Progression rule v2  *(Opus; depends on S1)*
- Keep stages, JND and max step. Replace scenario agreement with the **posterior probability of improvement**, P(cost(target) < cost(current)), computed by integrating over the posterior.
- Satisfaction keeps raising the re-adaptation cost (≤ 2×).
- **Accept:** if the current setting is inside the posterior 50% interval, keep it. The step grows monotonically with the probability of improvement. The existing progression tests are ported over.

### S10. Retire or reweight unsupported adjustments  *(Sonnet)*
- **Age:** set every shift's mean to 0 with a prior SD of 0.1 (it only widens the interval), until D1 finds data. **Glasses:** remove the question from the sensitivity part (no evidence; it saves a screen). Keep the answer key in session for compatibility.
- **Agents:** drop the empirical agent z if the S2 fit shows mechanics already explain it; otherwise estimate the weight in that same fit (fixes A3).
- **Accept:** documented in the README's "What no longer affects the number" section.

---

## 3. Data and research (D)

### D1. Population prior beyond pros  *(Haiku to collect, Sonnet to analyse)*
- Sources to research and cite:
  - ProSettings / EsportsSettings full Valorant lists (pros and streamers, 500+)
  - public community survey threads with eDPI by rank
  - Aim-trainer public leaderboards that publish cm/360 (Kovaak's / Aim Lab, if available)
  - any tracker site showing settings
- Output: `research/population_v6.json` with source, date, rank (if known) and region per row, plus `research/population_v6.md` with a fitted **log-normal by group** (pro, high-elo, general) and shrinkage.
- **Accept:** at least 400 rows, at least 2 non-pro sources, and every source URL recorded with an access date.

### D2. Physics-calibration set  *(Haiku to collect, Opus to fit)*
- For as many pros and streamers as possible, record sensitivity, DPI, **mousepad model → pad width**, mouse weight, and grip/arm style where stated (interviews, setup videos, settings pages).
- Used by S2 (σ_model), S3.1 (limb ordering check) and S10 (agent weight).
- **Accept:** at least 120 players with pad size, at least 40 with arm style. Conflicts are logged the same way as `pro_data_audit.json`.

### D3. `scripts/build_prior.js`  *(Sonnet; depends on D1, D2)*
- Builds the prior constants and σ_model into `model.js` between markers, the same way `build_bell.js` does now. Deterministic and seeded.

### D4. Task-mix measurement from VODs  *(Sonnet with a human spot-check; optional, high value)*
- Sample about 300 engagements from public pro VODs across roles. Classify the angle between the crosshair at first enemy visibility and the kill: micro / flick / turn bins, plus whether the target was strafing.
- This replaces the biggest unsupported assumption (`turnScale`, role mixes and `TRACK_SHARE`) with data.
- **Accept:** a written protocol, inter-rater agreement on a 50-engagement overlap (κ ≥ 0.6), and fitted angle-distribution parameters per role for S3.3.

### D5. Literature pass for v6 constants  *(Sonnet)*
- Targets: signal-dependent noise k, joint-specific peak speeds and throughput, CD-gain optimum studies since 2015, mouse-clutching time, pursuit tracking error in mouse tasks.
- Output: `research/engine_v6_physics.md`, with one table row per constant giving its distribution and source.

---

## 4. Validation (V)

### V1. Simulation scorecard  *(Sonnet; depends on S8)*
- Run 1,000 virtual players. Report MAE (octaves) of the recommendation vs the true optimum for: prior only, questionnaire, and questionnaire + 6-minute test. Also report 50% and 80% interval coverage.
- `node test/scorecard.js` prints the table, and CI fails on regression beyond thresholds.
- **Release gate:** with the test, the median error is ≤ 0.15 octave and 80% coverage falls in 75–85%.

### V2. Snapshot grid  *(Haiku)*
- 60 fixed profiles (pad × limb × role × weapon × experience). It stores `cm`, the interval and the components, and every engine PR shows the diff table.

### V3. Real-player validation kit  *(Sonnet; post-1.0 data collection)*
- An opt-in "contribute anonymised results" button that produces a stripped JSON for the user to attach to a GitHub issue form. There's no server, which keeps the privacy promise.
- A protocol for an A/B check inside the aim test: current vs recommended setting, 3 sessions, blinded order.

---

## 5. UI 1.0 (U)

Goal: a polished, coherent 1.0 that puts the posterior and the aim test at the centre, and keeps the game-client look.

### U1. Flow and information architecture  *(Sonnet)*
- **Start screen:** three clear paths, each with a time estimate:
  - **Quick** (questionnaire, about 3 min)
  - **Full calibration** (questionnaire + aim test + crosshair/highlight tests, about 15 min)
  - **Continue** (import a results file)
- Show a part map of Sensitivity → Aim test → Crosshair → Highlight, where each part can be skipped or re-entered (extends the 5.0 skip feature).
- Cut questions that no longer affect anything (glasses, surface), and move stats to an optional "for your before/after" screen.

### U2. Aim-test UI  *(Sonnet; depends on S7)*
- Fullscreen and pointer-lock flow, with clear "press Esc to pause" handling, a progress ring per block, and a between-block summary.
- **Safety:** frequent short blocks, an opt-out at any time, and a note that changing sensitivity takes several sessions to settle.

### U3. Results redesign  *(Sonnet, Opus to review the copy for accuracy)*
- Headline: the sensitivity at the user's DPI, eDPI and cm/360, with a **posterior band** chart. The bell chart becomes a distribution chart showing the population prior, the physics likelihood, the measured likelihood and the posterior as layered curves (animated in sequence: "here's where players like you are → what your setup says → what your test showed").
- "Why this number": a waterfall from the prior median to the final value, one bar per component, replacing "what moved you".
- Confidence: a real interval ("80% likely between 0.27 and 0.34"), not a heuristic label, for both pathways.
- Progression plan as a timeline (stage 1 now, stage 2 after N sessions), with a "remind me to retest" .ics download (local only).
- Copyable settings block: sens, scoped/ADS, crosshair code, highlight.

### U4. Code split, still no build step  *(Sonnet)*
- `index.html` is 167 KB of mixed HTML/CSS/JS. Split it into `ui/styles.css`, `ui/app.js` and one `ui/screens/*.js` per screen, plus `ui/charts.js`, loaded with plain `<script defer>`. No bundler, so the "open index.html" promise holds.
- Add a design-token sheet (color, type, spacing, motion) and document it in `ui/README.md`.

### U5. Accessibility  *(Sonnet; use the design:accessibility-review skill)*
- WCAG 2.1 AA: contrast on every token, full keyboard path through the questionnaire and results, ARIA for tabs and charts (data-table fallback), and focus management on screen transitions.
- The aim test gets a clear note that it requires a mouse, and the rest of the app works without it.

### U6. Responsive and mobile  *(Haiku)*
- Questionnaire and results work at 360 px width. Tests show a "needs a desktop with a mouse" gate with a QR/link handoff.

### U7. Optional local memory  *(Sonnet)*
- Opt-in "remember my last results on this device" (localStorage, try/catch, one click to clear). The file stays the canonical copy, and nothing is stored without that opt-in.

### U8. Performance  *(Sonnet; depends on S4)*
- Engine in a Web Worker, results rendered progressively, first meaningful results in under 1 s on a mid laptop, and a Lighthouse performance score ≥ 90.

### U9. Copy pass  *(Sonnet; design:ux-copy skill)*
- One voice across all screens, plain language, honest uncertainty wording, and no unsupported claims.

---

## 6. Crosshair and highlight: Vision engine v4 (X)

### X1. Real map palettes  *(Sonnet)*
- Replace the 8 synthetic scenes with color palettes sampled from real map screenshots (k-means, 6–8 colors per area, about 40 areas across the current map pool), weighted by where fights happen.
- **Accept:** `research/map_palettes.json` with the source of each screenshot; the color ranking is stable across bootstrap resamples of areas.

### X2. QUEST+ for the vision test  *(Opus)*
- Replace the weighted up-down staircase with QUEST+ (Watson 2017) over threshold and slope, to reach the same precision in about 40% fewer trials. The simulated-observer tests are kept and tightened.

### X3. Crosshair test in motion  *(Sonnet)*
- Add rounds where the background pans, as in a real flick, since a static scene overstates thin-line visibility. The choice model gains a "motion" covariate.

### X4. Display check  *(Haiku)*
- A short brightness/gamma check (a grey-ramp step visibility test) adjusts contrast scoring for dim or washed-out monitors.

---

## 7. Release engineering (R)

- **R1 CI** *(Haiku):* GitHub Actions running the unit tests, scorecard (V1, fast mode) and Playwright e2e on every PR.
- **R2 Results format 2** *(Sonnet):* adds aim-test trials, trajectories, personal parameters and the engine version. Format 1 is migrated on import, and tests cover the round trip.
- **R3 Docs** *(Sonnet):* rewrite the README for 1.0, organised as Quick start / How it works / Evidence / Validation / Changelog. Move the per-version history to `CHANGELOG.md`, and move `Valorant sensitivity finder.html` to `legacy/`.
- **R4 Hosting** *(Haiku):* GitHub Pages deploy from `main`, with a version stamp in the footer.
- **R5 Release checklist:** V1 gate met, e2e green on Chromium and Firefox, accessibility audit closed, README numbers regenerated from the scorecard, then tag `v1.0.0`.

---

## 8. Order and parallel lanes

```
Wave 1 (parallel, no dependencies)
  D1 population data   D2 physics-calibration data   D5 literature   S8 simulated players
  V2 snapshot grid     U4 code split                 R1 CI           X1 map palettes

Wave 2
  S1 posterior core  →  S2 physics likelihood (default σ_model)  →  S9 progression v2
  S3 physics fixes   S4 Sobol QMC   S7 aim test (engine side)   D3 build_prior (after D1/D2)

Wave 3
  S5 personal params, S6 calibrate v2 (need S7, S8)   V1 scorecard   S2 refit σ_model with D2
  U1 flow, U2 aim-test UI, U3 results (need S1, S7)   X2, X3

Wave 4
  S10 cleanup   U5 a11y   U6 mobile   U7 local memory   U8 worker   U9 copy   X4   R2   R3

Wave 5
  R4, R5 → tag v1.0.0       (D4 VOD study and V3 real-player validation may continue after 1.0)
```

Critical path: **S8 → S7 → S6/S5 → V1 gate → release.** The aim test is the longest and most valuable item.

---

## 9. Decisions needed before delegating

1. **Aim test in scope for 1.0?** Recommended: yes. Without it, Engine v6 can only re-weight guesses; with it, accuracy is bounded by the user's own data.
2. **Population prior:** pros only (current) or pros plus general players (D1)? Recommended: both, with the user's rank choosing the group.
3. **Age and glasses questions:** remove them, or keep them as "widens the interval only"? Recommended: drop glasses, keep age at mean 0.
4. **Data contribution (V3):** is an opt-in GitHub-issue upload acceptable, given the "nothing leaves the page" promise? It stays manual and opt-in.
5. **VOD study (D4):** worth the effort before 1.0, or after?
