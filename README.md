# valoSens 3.1: Valorant settings finder

Version 3.0 is a full release covering all three parts: **1. Sensitivity**, **2. Crosshair** (with a rotating visibility test), and **3. Enemy highlight color** (with a vision-threshold test).

Open `index.html` in a browser. It needs no build step or server, and nothing leaves the page.

**What's new in 3.0**
- **Crosshair test rotates.** Each page load draws a fresh random set from an 18-crosshair pool of pro archetypes: 8 rounds of 4, random slot order, over 7 map and utility scenes. Picks are scored with a choice model.
- **Highlight test measures vision, not reactions.**
  - Four enemies flash for about 58 ms behind a mask, and you say which one was highlighted, with no time limit.
  - A staircase finds the outline strength each color needs before you see it.
  - Reaction time, click latency and input lag are never measured.
- **Color logic is computed.** Crosshair and highlight colors are scored by contrast against map scenes, as your color vision sees them, instead of hand-set points.
- **Sensitivity model:**
  - big-turn share is now averaged over its uncertainty;
  - wrist reach and hand speed are re-sourced;
  - new DPI / pixel-skipping check.
- **Animated results screen:**
  - an "Analysis complete" reveal, with summary cards that rise in sequence and a sweeping top border;
  - a count-up and glow on the sensitivity;
  - crosshair previews that assemble from the center, and enemy outlines that rise and flare;
  - score bars that grow;
  - chart lines that draw in and pro dots that pop each time a tab opens;
  - staggered rows and settings.
  - All of it switches off under `prefers-reduced-motion`.

**Results files and calibration runs (3.1)**
- **Download.** The results screen has **Download results**, which saves `valosens-results-<date>-<n>-sessions.json` to your device. Nothing is kept in browser storage, so the file is the only copy.
- **Import.** On the first screen, **Import results file** loads it, fills in your answers from the latest session, and offers **Skip to the tests**.
- **Pooling.** In the next run:
  - visibility-test picks and vision-test rounds from every session are combined in one fit;
  - the vision test's staircases start near your earlier thresholds;
  - the crosshair test shows crosshairs you haven't seen yet first.
- **On the results screen:**
  - a "Last session" row in the breakdown;
  - a "Sessions" row in the settings card;
  - per-session thresholds in the Highlight tab, so you can see whether runs agree.
- **What a new download contains:** every imported session plus this one, up to the latest 12.
- **Import safety.** `session.js` validates every imported value against the questionnaire's options:
  - unknown answers, crosshair IDs and trial fields are dropped;
  - files over 3 MB, files that aren't valid JSON, and files that aren't valoSens results are rejected with a readable message.

**UI:**
- Dark, minimal, game-client style. One question per screen, with staggered entrances and a thin progress line.
- The results screen is laid out like a match-details page: three summary cards, Sensitivity / Crosshair / Highlight / Model / Vs pros / Test plan tabs, a pro-distribution curve, a factor breakdown, a confidence badge and a settings card.
- Fonts load from Google Fonts (Barlow / Barlow Condensed), with system fallbacks offline.

**Files**
- **Model:** `model.js` (sensitivity), `xhair.js` (crosshair + highlight) and `session.js` (results files); all work in the browser and in Node.
- **Tests:**
  - `node test/model.test.js` (48)
  - `node test/xhair.test.js` (21, including simulated observers for the vision test)
  - `node test/session.test.js` (8: file round trip, appending sessions, rejecting bad files, sanitising, pooling)
  - `node test/ui.e2e.js` (browser test: both tests, the rotation, the animations, and download → import → second run; needs Playwright)
- **Pro data:** regenerate with `node scripts/build_pros.js` after editing `research/pro_data_audit.json`.
- **Agent data:** regenerate with `node scripts/build_agents.js` after editing `research/agent_mechanics.json`.
- `Valorant sensitivity finder.html` is the original multiplier-based version, kept for reference.

## Crosshair and enemy highlight (`xhair.js` 3.0)

Research: `research/crosshair_research.md` §7, `research/highlight_color_research.md` §7, `research/vision_test_method.md`.

### Color scoring (both parts)
- **Scenes:** every color is compared with 8 scenes: bright sand, concrete, shadow, cool blue, foliage, purple utility, fire and yellow utility. Each has three representative surface colors (estimates).
- **Simulation:** the comparison is done after simulating your color vision (Machado, Oliveira & Fernandes 2009).
- **Contrast:** a weighted CIELAB difference, saturated so very large differences stop adding.
  - **Crosshair:** chroma counts a quarter. Thin lines are carried by luminance (Mullen 1985).
  - **Highlight:** red-green counts 0.4 and blue-yellow 0.9. Enemies first appear in the periphery, where red-green sensitivity falls fastest (Mullen & Kingdom 2002; Hansen et al. 2009).
- **Combining scenes:** 60% weighted mean plus 40% worst scene. Your answers set the weights:
  - "lose the crosshair on bright maps";
  - "lose enemies in shadows";
  - "fire / purple / yellow utility clutters my screen".
- **Small priors:** pro use, and a community visibility test.
- **Pairing:** the crosshair and highlight are chosen as a pair. Pairs that share a hue, or look alike in your color vision (ΔE < 12), are not allowed.
- **Color blindness:**
  - Red-green rules out green, yellow green and red crosshairs.
  - The highlight Riot made for your type gets +2.
  - The vision test, which measures your actual vision, can outweigh that.

### Crosshair
- **Visibility test (rotating):**
  - 18 pro archetypes; a new random subset every page load.
  - 8 rounds × 4 crosshairs, balanced exposure, random slot order (position bias).
  - Scored with a ridge-regularised conditional-logit model (Luce choice / Bradley–Terry) on color, outline, outline on bright scenes, shape and thin lines.
  - The color effect adds up to ±2.
  - Outline and shape effects feed those decisions; shape only when you chose "no preference".
- **Outline:** on when it raises the worst-scene visibility enough, or when you report bright maps.
- **Geometry:**
  - Shape and aim style set the size.
  - Head size on screen (from your weapon's fight distance and the 103° FOV) caps dot size and line thickness.
  - Lines 3 px or longer keep a gap of at least 2 (foveal crowding).
  - Values scale ×1.33 at 1440p and ×2 at 4K.
- **Error lines:** firing and movement error stay off (motion onset captures attention). The exception is movement error as a training aid for newer players who shoot while moving.
- **Three to try:** the recommendation, your test favorite (or the other shape), and a pro staple. Each comes with an importable code.

### Enemy highlight vision test
- **Trial:**
  1. Fixation on your recommended crosshair.
  2. Four identical dark figures, one with the outline, shown for `round(58 ms / frame)` frames.
  3. A 350 ms mask of outline fragments in every test color.
  4. You answer 1–4, with no time limit.
- **Staircase:** a weighted up-down staircase per color on outline opacity (−0.05 / +0.15 log10, converging near 75% correct; Kaernbach 1991), interleaved, with the same scenes for every color.
- **Length:** 20 trials per color plus 7 catch trials, about 2 minutes.
- **Fit:** maximum-likelihood psychometric fit (guess rate 25%, lapse 3%, shared slope).
  - The threshold is reported at 75% correct.
  - Its uncertainty comes from the profile likelihood.
  - The difference from the mean is shrunk by its uncertainty (τ = 0.25 log10).
  - Bonus = −6 × shrunk difference, capped at ±2.5.
- **Reliability:**
  - Frames are pre-rendered and swapped on `requestAnimationFrame`.
  - The refresh rate is measured first.
  - Dropped-frame trials are repeated, and more than 5% dropped halves the weight.
  - Missing more than 1 of 7 easy catch trials voids the result.
- **Checked on simulated observers:**
  - It finds the truly easiest color in ≥ 27 of 30 runs.
  - With no real difference, it gives a bonus above 1.5 in ≤ 3 of 30 runs.

## How the number is computed (model v3.0)

The internal unit is **cm/360**: centimetres of mouse travel per full turn.

### 1. Questionnaire pathway (default, lower confidence, unvalidated)

For each kind of movement in an explicit task mix, the model estimates the **extra time** a sensitivity adds. Each task is costed by exactly one mechanism, so nothing is counted twice. Fitts' law time doesn't depend on sensitivity, because target size and distance scale together, so it isn't a term.

| Task (default share) | Mechanism | Evidence |
|---|---|---|
| Small correction, 2° (40%) | The hand has a constant noise floor σ0 (~0.2 mm) that doesn't shrink with sensitivity. Once the head is smaller than that on the mouse pad, extra corrective submovements are needed: `t_sub·(1−p)/p` with `p = erf(W / (2√2·σ0))`. | σ0: Casiez 2008, Chapuis & Dragicevic 2011. Submovement time: Meyer 1988. Head size is an estimate. |
| Target switch, 25° (40%) | NVIDIA's group flick curve: about +3.5% flick time per octave² away from ~40 cm/360. Smaller targets shift that optimum slightly slower, by one octave across a 16× size range. | Boudaoud et al. 2022/2023: N=13, static flicks only, weak evidence |
| 90° and 180° turns (15% / 5%) | Expected mouse lifts (expected travel past the pad edge ÷ travel regained per lift), the cost of a bigger joint taking over past comfortable reach, and a peak-speed limit. | Lift time, switch time, start position and reach are estimates |

The guessed constants that move the answer most (σ0, the flick optimum, head size, submovement time and, new in 3.0, **how many big turns the task mix contains**) are **averaged over their plausible low, central and high values** (243 combinations). No single guess decides the answer this way.

**New in 3.0:**
- Wrist-only reach is ±3 cm (30–40° comfortable wrist deviation, Ryu et al. 1991).
- Peak hand speed of 150 cm/s is now sourced (Casiez et al. 2008: 1.5 m/s at the 97th percentile).
- `dpiAdvice()` warns when one mouse count turns you further than one pixel at your resolution (pixel skipping), and suggests a DPI. Resolution comes from Part 2.
- The test plan's adaptation advice follows Krakauer et al. 2000 and NVIDIA's adaptation data. The 5–10% step size is now labelled a heuristic.

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

### 4. Agents (v2.1)

**Picking agents:** up to three, weighted 50/30/20 and rescaled when fewer are picked. When agents are given, they **replace the role average**.

**Data:** each agent's abilities are catalogued from Riot's official wiki, 30 agents including Miks, Veto and Hush (`research/agent_mechanics.json`). `scripts/build_agents.js` copies only the raw mechanics into `model.js`. One rule set in `model.js` turns them into the task mix:

| Mechanic | Effect on the task mix | Basis |
|---|---|---|
| Reposition (dash, teleport, slide, satchel, Rendezvous…) | Adds re-orientation turns at the catalogued angle, spread over the 25°/90°/180° tasks so the average angle is preserved. Frequency per engagement: signature (E) 15%, other basic 8%, ultimate 3%. | Ability list: Riot wiki. **Angles and frequencies: ESTIMATES** (no usage data exists) |
| Hold (trips, turrets, sensors, Trademark…) | Moves up to 5 points of share from target switches to small corrections | ESTIMATE |
| Placement / map-targeted | No effect: these use the map cursor or aren't time-critical | Riot wiki |
| Guided (Blaze, High Tide, Guiding Light, drones) | No effect: slow steering with normal look sensitivity; no separate setting exists | Riot wiki, patch 9.02 |
| Scoped/ADS kit (Chamber; Operator agents) | Changes the **scoped/ADS advice only**, never hipfire | see below |

The effect on the model optimum (forearm aimer, 45 cm pad, compared with the role average) runs from roughly −18% (Yoru, Waylay) through −10% (Jett), about −6% (Omen, Raze, Neon, Reyna), 0% (pure-utility initiators and controllers, Chamber), to +4–7% (Sage, Cypher, Deadlock, Vyse, Killjoy). It grows on small pads (Yoru: −23% at 30 cm, −13% at 90 cm), because extra big turns cost more lifts there. Every agent's effect stays inside the near-optimal range (tested).

**Uncertainty:** the frequency estimates matter. Halving or doubling them changes Jett's effect from +6% to −24% relative to the central value. `sensitivityAnalysis()` reports these toggles.

**Sanity check, not calibration** (`research/agent_sens_data.md`): no public dataset links agents to sensitivity. The available "eDPI by role" pages rest on 9 or fewer players and contradict each other. In our 28-pro sample, mains of mobility duelists (Jett, Raze, Neon, Yoru, Waylay) run about 15% faster (median 61.5 vs 72.6 cm/360, n = 8 vs 20, permutation p ≈ 0.12). That's the same direction as the model, but not significant. Controllers and sentinels are identical (77 cm, p ≈ 0.69).

### 5. Scoped / ADS multiplier advice

Valorant has separate **Scoped** (Operator 2.5x/5x, Marshal/Outlaw 3.5x, Tour de Force) and **ADS** (rifles, SMGs, Guardian, Headhunter 1.5x) multipliers, both defaulting to 1.0. 1.0 most likely equals a 100% horizontal monitor-distance match (community-verified). See `research/scoped_ads_settings.md`.

**What the tool advises:**
- **Always start at 1.0.** About 70–80% of pros keep it there.
- **If you scope a lot** (Jett or Chamber main, Operator/Marshal/Outlaw players): it lists optional lower values.
  - 75% match: 0.909.
  - Crosshair (focal-length) match: 0.747 for the Operator, 0.731 for the Marshal/Outlaw.
- **Chamber:** it adds the Headhunter crosshair-match ADS value, 0.815. This also changes rifle ADS.

All of these are labelled preferences: no study shows any matching method helps.

### What no longer affects the number, and why

- **Pro settings:** previously the model was forced to equal the pro median. They're now a comparison group only. Pros' choices reflect their pads, arms, habits and team roles, not proof of what's optimal for you.
- **Rank, HS%, K/D, ADR:** previously these changed the precision weight and how much the current setting was trusted. They're now shown as a before snapshot only. Match stats don't show whether your sensitivity suits your hand.
- **20–80 cm/360 penalty:** removed. In NVIDIA's study those were just the grid points where adjacent conditions weren't significantly different. The old penalty was several times the whole cost at the optimum, effectively a wall. See `research/nvidia_paper_review.md`.
- **Surface type:** it previously scaled hand noise and speed with made-up multipliers. It's now recorded but unused, because there's no evidence for it.
- **Role and weapon:** previously role distances were fitted to pro medians. Each now changes the result by about 3% at most, which is inside the near-optimal range (tested).

## Parameter-sensitivity check

Example player: forearm aimer, 45 cm pad, flex role, rifle. The table shows the result with each constant at its low and high value, all others central. The central-only result is 40.5 cm; the uncertainty-averaged result is 45.7 cm.

| Constant | Basis | Low → result | High → result | Swing |
|---|---|---|---|---|
| `sigma0` hand noise floor | research | 28.3 | 56.4 | 69% |
| `cFlick` NVIDIA flick optimum | research | 35.9 | 45.3 | 23% |
| `headM` head width | estimate | 45.5 | 36.5 | 22% |
| `turnScale` big-turn share (new) | estimate | 44.4 | 36.4 | 20% |
| `tSub` submovement time | research | 38.0 | 43.7 | 14% |
| `tSwitch` joint-switch cost | estimate | 41.7 | 37.3 | 11% |
| `vPeak` peak hand speed | research | 37.9 | 41.4 | 9% |
| `tLift` lift cost | estimate | 41.4 | 39.1 | 6% |
| everything else | — | — | — | ≤ 2% |

Toggles, for a duelist with a sniper:
- Removing the role changes the result by 2.5%.
- Removing the weapon changes it by 3.4%.
- Dropping the NVIDIA flick term changes it by 4.0%.
- Removing big turns from the task mix changes it by **24%**. The task mix is an important assumption with no direct data behind it, which is why 3.0 averages over it.

Run it yourself with `ValoModel.sensitivityAnalysis(input)`.

## Validation status

- **Agent effects: unvalidated.** They're derived from ability mechanics with estimated frequencies. The only empirical check is the small, non-significant pro comparison above.
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
- `research/agent_mechanics.json` and `.md`: 30-agent ability catalogue (Riot wiki)
- `research/agent_sens_data.json` and `.md`: pro agent pools and the agent-vs-sensitivity check
- `research/scoped_ads_settings.md`: scoped/ADS multipliers, zoom levels, matching formulas, pro usage
- `research/model_research.md`: earlier background notes (v1)
- `research/vision_test_method.md`: design and validation of the highlight vision test (v3)
- `research/crosshair_research.md` and `research/highlight_color_research.md`: crosshair and highlight evidence, with v3 additions in §7
