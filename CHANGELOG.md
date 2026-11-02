# Changelog

Versions before 1.0.0 (3.0 to 5.0) are described in their own README sections, kept below the 1.0.0 notes in git history (`git show ff7bac9:README.md`).

## 1.0.0: Engine v6 (2026-11-02)

**Sensitivity engine v6**
- **One posterior combines all the evidence.** The result is a single probability distribution over cm/360, built from three things, each weighted by how reliable it is:
  - a population prior: 5,330 players (`research/population_v6`), centred at 0.30 sens at 800 DPI;
  - a physics likelihood: its weight is estimated from 995 players with known pad width (`scripts/build_prior.js`);
  - a measured likelihood from the new aim test.
- **v5's bell-curve layer is gone.** It amplified physical effects about 2.4×.
- **Physics fixes:**
  - a continuous cost for travel beyond comfortable reach (wrist aimers no longer get slower results than arm aimers);
  - signal-dependent endpoint noise;
  - cached spline cost tables (about 7× faster).
- **Personal constants:** the aim test measures hand steadiness, correction time, peak speed, lift time, pad width and reach, and these replace population values.
- **Honest uncertainty:** every result has a real 50% and 80% interval. The progression rule uses the posterior.
- **Questions:** age only widens the interval, glasses is removed, and rank sets the prior width.

**Aim test (new)**
- `aim.js` and `ui/aimtest.js`. It runs a credit-card DPI check (which also flags mouse acceleration), pad and reach swipes, then flick, small-correction, turn and tracking targets at 5 sensitivities across ±1 octave.
- Blocks follow a Latin-square order, and an adaptive extra block can follow. Raw input is used where the browser supports it.

**Validation**
- `test/scorecard.js` scores the engine on simulated players (`sim/player.js`). Median error:
  - prior only: 0.39 octave;
  - questionnaire: 0.33;
  - questionnaire + 6-min aim test: 0.225;
  - questionnaire + 12-min aim test: 0.20.
- 80% intervals cover the true optimum 77–87% of the time.
- **The 0.15-octave target is not met yet.** The engine's physics and the simulator disagree, and real-player data is needed.

**App**
- `index.html` is split into `ui/*.js` files, still with no build step.
- Start screen with Quick / Full / Continue paths, an aim-test part, and a rank question.
- The bell curve replaces the distribution chart on the results screen, with the 80% range and a "Why this number" panel.
- Results files move to format 2 (aim-test data); format 1 still imports.
- The highlight vision test uses QUEST+: 16 trials per colour, the same precision as the old 20.

**Project**
- CI workflow, GitHub Pages workflow and engine snapshot grid (`test/snapshot.js`).
- The original multiplier version moved to `legacy/`.

**Not done in 1.0.0** (see `.claude/delegation/v1-engine-v6/PLAN.md`)
- (T12 and T14 landed in minimal form; the UI e2e was not re-run after them.)
- Accessibility, copy and mobile pass; opt-in local memory; "contribute results" export.
- Real-player validation.
