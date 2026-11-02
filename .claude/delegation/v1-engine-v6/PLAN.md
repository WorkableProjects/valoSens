# valoSens 1.0.0 / Engine v6: delegation plan

Product plan: `docs/V1_ENGINE_V6_PLAN.md` (approved 2026-11-02). Shared interfaces: `CONTRACTS.md` (this folder).

## Goal
Ship valoSens 1.0.0 with Engine v6. That means a Bayesian sensitivity engine, an in-browser aim test that measures the player, a validation scorecard, UI 1.0, QUEST+ for the vision test, and release docs and CI.

## Mode
**DELEGATE-MULTI**, hybrid. Opus (the planner) keeps the engine core in `model.js`, because it is high-judgment, tightly coupled and on the critical path. The surrounding bulk goes to subagents with exclusive file ownership.

## Decisions (user said "research quickly and make a judgement")
1. **Aim test is in scope for 1.0.** It is on the critical path.
2. **Population prior uses pros plus general players** (D1). The user's rank selects the group when the data supports it. Otherwise the prior is the pro distribution, widened.
3. **Glasses question removed** from the questionnaire. `session.js` still accepts the key from old files. **Age stays as a question, with every shift's mean set to 0** and a prior SD of 0.1 SD-units: it widens the interval only.
4. **"Contribute results"** is an opt-in, manual export: a stripped JSON plus a pre-filled GitHub issue link. There is no server, and nothing is sent automatically.
5. **VOD task-mix study (D4) is deferred to after 1.0.** Subagents can't watch video reliably.
6. **Cut from 1.0:**
   - X1 real map palettes: no reliable access to licensed screenshots.
   - X4 display check: browser gamma checks are unreliable.
   - U8 Web Worker: only if `recommend()` exceeds 300 ms in the browser.
7. **Browser raw input:** use `requestPointerLock({ unadjustedMovement: true })` where supported (Chromium). Elsewhere fall back to plain pointer lock and rely on the credit-card DPI check to flag acceleration.
8. **Engine units:** the posterior is computed on the existing log grid (8–160 cm/360, step 0.01 ln).
9. **No git tag push.** The release is prepared on the branch; tagging happens on merge to main.

## Waves
| Wave | Tasks |
|---|---|
| 1 | **O1** (Opus: engine core S1/S2/S9/S10 in model.js), **T01** sim/player.js (Sonnet), **T02** aim.js (Sonnet), **T03** UI code split (Sonnet), **T05** population + physics data (Sonnet, web), **T06** v6 literature (Sonnet, web) |
| 2 | **O2** (Opus: physics fixes S3, QMC S4, build_prior D3), **T07** session format 2 (Sonnet), **T08** aim-test browser UI (Sonnet), **T09** QUEST+ (Sonnet), **T10** CI + snapshot grid (Haiku) |
| 3 | **O3** (Opus: calibrate v2 S6, personal params S5), **T11** scorecard V1 (Sonnet), **T12** results redesign U3 (Sonnet), **T13** flow U1 (Sonnet), **T14** crosshair motion X3 (Sonnet) |
| 4 | **T15** a11y + copy + mobile pass (Sonnet), **O4** local memory/contribute (Opus) |
| 5 | **T16** README/CHANGELOG/legacy (Sonnet), **T17** Pages workflow (Haiku), **O5** integration, full verification, version bump |

Specs for wave N+1 are written after wave N is verified, with the actual interfaces pasted in.

## Verification
- Unit: `node test/model.test.js`, `node test/xhair.test.js`, `node test/session.test.js`, plus new `test/*.test.js`.
- Browser: `node test/ui.e2e.js` (~3 min, Playwright + Chromium preinstalled).

## Log
- 2026-11-02: plan written; wave 1 dispatched.
- 2026-11-02 wave 1: T01 DONE (8 tests; verified), T02 DONE (20 tests; verified), T03 DONE (e2e passed on re-run by planner with the v6 engine), T06 DONE (DOIs spot-checked), O1 DONE (model 62 tests).
  - Integration check T01→T02: lifts and times agree exactly; nSub agrees in ~50–70% of trials; estimatePersonal recovers vPeak/tSub/tLift closely but sigma0 high (0.034 vs 0.020 truth with 25 micro trials). → O3.
  - Note for T08: a browser recorder must emit zero-movement samples every frame, or pauses read as lifts (sim emits stationary samples).
  - O1 behaviour change: questionnaire-only results now shrink toward the population median (physics weight ≈ 0.37 with sigmaModel 0.40); spread of results is much narrower than v5. The aim test is what individualises.
  - recommend() is ~330 ms in Node (243 scenarios evaluated twice) → O2 must cache per-scenario cost vectors.
- 2026-11-02 wave 2: T07 DONE (session format 2; 15 tests), T08 DONE (aim-test component; e2e 14 checks; screenshots checked by planner), T09 PARTIAL→fixed by planner (QUEST+ at 12/colour was 20% less precise; planner set 16/colour = same precision as the old 20, tests updated), T10 DONE (CI + snapshot; planner added aimtest e2e to CI), T05 DONE (5,330 population rows; 995 with pad width).
  - O2 DONE: per-scenario cost tables + spline (recommend 330 → ~48 ms; model suite 4 min → 23 s); continuous excess-reach cost replaces the step switch cost (limb order fixed: wrist ≥ wf ≥ forearm ≥ arm); signal-dependent endpoint noise kEnd; scripts/build_prior.js: prior SD 0.41 general / 0.33 pro (rank imm/rad or experience comp), physics weight 0.38 (pad-width slope 0.72 ± 0.67 combined with prior belief 0.35 ± 0.20), sigmaModel 0.50.
  - Team note (Dutch, in docs plan): prior centred at 0.30 @800; bell curve must replace the distribution chart on the results screen → T12.
