# Shared contracts (written by the planner, read-only for every task)

All new JS files use the same UMD wrapper as `model.js` (browser global + `module.exports`), ES5-style `var`/`function` code, no dependencies, no build step. `"use strict"` inside the factory.

```js
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ValoAim = factory();             // global name per file, see below
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  ...
  return api;
});
```

Global names: `aim.js` → `window.ValoAim`, `sim/player.js` → `window.ValoSim` (Node: `require("../sim/player.js")`).

Seeded randomness: use the same LCG/mulberry style as `model.js` `rng(seed)` (exported there as `ValoModel._rng`). Do NOT use `Math.random` in testable code; accept a `seed`.

## Units
- Sensitivity is always **cm/360** (`cm`). Mouse travel is in **cm on the pad**. Angles in **degrees**. Times in **seconds**.
- `countsPerCm` = mouse counts per cm of travel (stated DPI / 2.54 if not measured).
- Valorant yaw: 0.07° per count per unit of in-game sens. `cm360 = 360 / (0.07 * sens * countsPerCm)`.
- Valorant camera: 103° horizontal FOV at 16:9. Screen x of a point at yaw offset `d` deg: `x = W/2 + (W/2) * tan(d·π/180) / tan(51.5·π/180)` (only for |d| < 90; otherwise off-screen).
- Head target: 0.25 m wide at 20 m → `headDeg = 2·atan(0.125/20)·180/π ≈ 0.716°`.

## Trajectory (sim output, browser recorder output, aim.js input)
```js
traj = {
  t: number[],      // seconds since trial start (target appears at t = 0), ascending
  x: number[],      // cumulative horizontal mouse travel since trial start, cm (right = +)
  y: number[],      // cumulative vertical mouse travel, cm (up = +)
  cm: number,       // sensitivity (cm/360) used for this trial
  targetDeg: number,// target angular width (deg)
  // target position over time, in degrees of yaw/pitch relative to the start view direction:
  targetYaw: number | function(t) -> number,   // number for static targets; function for 'track'
  targetPitch: number,
  done: number      // time (s) of the hit click, or the trial timeout if no hit
  clicks: [{ t: number, hit: boolean }]        // every click with whether the crosshair was on target
}
```
Mouse lifts appear as **gaps in `t` of ≥ 0.06 s with no samples** while the trial is running. Sample rate is ~1000 Hz in the browser (polling-dependent); the sim emits 1000 Hz.

## Trial spec (aim.js schedule → renderer/sim)
```js
spec = { id: string, task: "micro"|"flick"|"turn"|"track", cm: number, angleDeg: number /* signed yaw offset of target; track: start offset */,
         pitchDeg: number, targetDeg: number, strafeDegS: number /* track only, signed */, durationS: number /* track only, default 2.5 */,
         session: string, block: number, order: number /* index within session */ , warmup: boolean }
```
Task geometry (defaults): micro |angle| 1–4°; flick |angle| 15–40°; turn |angle| 90 or 180 (half each); track start 0–2°, strafe 15.5°/s (5.4 m/s at 20 m) reversing direction at random 0.4–0.9 s intervals. `targetDeg` = 0.716 for micro/flick/track, 2.0 for turn (body-size target after a turn). Pitch offsets ±0–1.5° for micro/flick, 0 for turn/track.

## Trial record (aim.js → model.js `calibrate`) — backwards compatible with v5
```js
trial = { cm, task, time /* s, see below */, misses, overshoots, session, order,
          // v6 optional fields (ignored by v5 code):
          hit: boolean, angleDeg, targetDeg, endErrDeg, nSub, peakCmS, pathEff, lifts, droppedFrames, warmup }
```
`time`: static tasks = time of the hit click (or timeout 4 s with `hit:false`, `misses` counted); track = `0.25 / max(onTargetFraction, 0.05)` capped at 10.

## Personal parameters (aim.js estimatePersonal → model.js input.personal)
Each entry `{ value: number, sd: number, n: number }` (sd = standard error of the estimate, same unit). Missing entries are omitted.
```js
personal = { sigma0 /* cm */, tSub /* s */, vPeak /* cm/s */, reachCm /* cm */, tLift /* s */, padCm /* usable cm */,
             countsPerCm, accel: { suspect: boolean, ratio: number } }
```

## Sim truth (sim/player.js)
```js
truth = { sigma0, k /* signal-dependent noise, fraction of amplitude */, tSub, vPeak, reachCm, tLift, padCm, countsPerCm, rt /* reaction time s */ }
```

## Engine v6 input/output (model.js `recommend`) — added for wave 3
Input additions (all optional):
```js
input.calibration = { trials: [ trial record ... ], options?: {...} }   // aim-test trials (pooled across sessions; session tags distinct)
input.personal    = personal (see above)                                 // from ValoAim.estimatePersonal or session pooled personalLatest
input.rank        = "unsure"|"iron"|"bronze"|"silver"|"gold"|"plat"|"diamond"|"asc"|"imm"|"rad"   // imm/rad (or experience "comp") use the pro prior width
```
Output fields the UI may use:
```js
R.cm, R.reason, R.mode ("questionnaire"|"measured"), R.lo, R.hi (posterior 50% interval, cm/360), R.target (posterior median)
R.posterior = { median, ci50: [lo, hi], ci80: [lo, hi], sdLn, grid: number[] (cm), weights: number[] (posterior mass per grid cm, sums to 1),
                components: { prior: { centre, sdLn, median, parts }, physics: { centre, sdLn, weight, raw } | null, measured: { centre, sdLn, range } | null },
                waterfall: [ { key: "population", label, ln }, { key, label, dLn, basis, note? } ... ] }   // dLn: change in ln cm/360 (negative = faster)
R.bell = { mean, sd, s800, z, percentile, shifts: [{key,label,z,basis}], zModel, ci80s800: [lo, hi], ... }   // sens @ 800 DPI view; mean = 0.30
R.confidence = { type: "posterior"|"measured", label: "high"|"medium"|"low–medium"|"low", interval: [cmLo, cmHi] (80%), halfWidthLn, note }
R.anchor = null | { cm, stay, inLikely, step, stages, plan: [cm...], reason... }
R.personalUsed = null | { key: value } (constants replaced by the user's measured values)
R.measured = null | calibrate() output (validation.curveBeatsFlat, tested, warnings, ...)
```
