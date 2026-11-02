// Run: node test/sim.test.js
"use strict";
const assert = require("assert");
const Sim = require("../sim/player.js");

let n = 0, failed = 0;
function t(name, fn) {
  try { fn(); n++; console.log("ok   -", name); }
  catch (e) { failed++; console.log("FAIL -", name, "\n      ", e.message); }
}
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(v => (v - m) * (v - m)))); };
const mk = (o) => Object.assign({ id: "x", task: "micro", cm: 30, angleDeg: 3, pitchDeg: 0, targetDeg: 0.716, strafeDegS: 0, durationS: 2.5, session: "s", block: 0, order: 0, warmup: false }, o);

t("determinism: same seed and spec give identical trajectories", () => {
  const spec = mk({ id: "a1", task: "flick", angleDeg: 25, cm: 40, pitchDeg: 1 });
  const a = Sim.createPlayer({ seed: 7 }).run(spec), b = Sim.createPlayer({ seed: 7 }).run(spec);
  assert.deepStrictEqual(a.traj, b.traj);
  const c = Sim.createPlayer({ seed: 8 }).run(spec);
  assert.notDeepStrictEqual(a.traj.x, c.traj.x);
});

t("trajectory format: equal arrays, ascending t, ends within target on hits", () => {
  const p = Sim.createPlayer({ seed: 3 });
  let hits = 0;
  for (let i = 0; i < 40; i++) {
    const spec = mk({ id: "f" + i, task: "flick", angleDeg: (i % 2 ? -1 : 1) * (15 + i % 25), cm: 35, targetDeg: 2 });
    const { traj, summary } = p.run(spec);
    assert(traj.t.length === traj.x.length && traj.x.length === traj.y.length && traj.t.length > 10);
    for (let j = 1; j < traj.t.length; j++) assert(traj.t[j] > traj.t[j - 1]);
    assert(traj.done <= 4 + 1e-9 && Array.isArray(traj.clicks) && traj.clicks.length >= 1);
    if (summary.hit) {
      hits++;
      const wCm = spec.targetDeg / 2 / 360 * spec.cm;
      assert(Math.hypot(traj.x[traj.x.length - 1] - spec.angleDeg / 360 * spec.cm, traj.y[traj.y.length - 1]) <= wCm + 1e-9);
      assert(traj.clicks[traj.clicks.length - 1].hit === true);
    }
  }
  assert(hits >= 30, "hits " + hits);
});

t("lifts: 180 turn on a small pad lifts with a gap >= 0.06 s; micro does not", () => {
  const p = Sim.createPlayer({ seed: 5, truth: { padCm: 25 } });
  const r = p.run(mk({ id: "turn", task: "turn", angleDeg: 180, cm: 80, targetDeg: 2 }));
  assert(r.summary.lifts >= 1, "lifts " + r.summary.lifts);
  let gap = 0;
  for (let j = 1; j < r.traj.t.length; j++) gap = Math.max(gap, r.traj.t[j] - r.traj.t[j - 1]);
  assert(gap >= 0.06 - 1e-9, "gap " + gap);
  for (let i = 0; i < 20; i++) assert.strictEqual(p.run(mk({ id: "m" + i, cm: 30, angleDeg: 2 })).summary.lifts, 0);
});

t("noise scaling: first-submovement error SD matches sqrt(sigma0^2+(k*A)^2)", () => {
  const p = Sim.createPlayer({ seed: 11 });
  const errs = [];
  for (let i = 0; i < 200; i++) errs.push(p.run(mk({ id: "n" + i, cm: 30, angleDeg: 3 })).summary.firstErrCm);
  const A = 3 / 360 * 30, expect = Math.sqrt(0.02 ** 2 + (0.05 * A) ** 2);
  assert(Math.abs(sd(errs) / expect - 1) < 0.25, "sd " + sd(errs) + " expect " + expect);
  // and the same quantity grows with amplitude
  const big = [];
  for (let i = 0; i < 200; i++) big.push(p.run(mk({ id: "b" + i, task: "flick", cm: 60, angleDeg: 30, targetDeg: 0.716 })).summary.firstErrCm);
  const A2 = 30 / 360 * 60, e2 = Math.sqrt(0.02 ** 2 + (0.05 * A2) ** 2);
  assert(Math.abs(sd(big) / e2 - 1) < 0.25, "sd " + sd(big) + " expect " + e2);
});

t("higher sigma0 gives more submovements on micro trials at cm=15", () => {
  const run = s0 => {
    const p = Sim.createPlayer({ seed: 21, truth: { sigma0: s0 } });
    const a = [];
    for (let i = 0; i < 150; i++) a.push(p.run(mk({ id: "s" + i, cm: 15, angleDeg: (i % 2 ? -1 : 1) * (1 + i % 4) })).summary.nSub);
    return mean(a);
  };
  const lo = run(0.01), hi = run(0.04);
  assert(hi > lo + 0.3, "lo " + lo + " hi " + hi);
});

t("track: on-target fraction is lower for sigma0=0.04 than 0.01 at cm=15", () => {
  const run = s0 => {
    const p = Sim.createPlayer({ seed: 31, truth: { sigma0: s0 } });
    const a = [];
    for (let i = 0; i < 20; i++) a.push(p.run(mk({ id: "t" + i, task: "track", cm: 15, angleDeg: 1, strafeDegS: 15.5 })).summary.onTargetFraction);
    return mean(a);
  };
  const lo = run(0.04), hi = run(0.01);
  assert(hi > lo + 0.05, "sigma .01: " + hi + " sigma .04: " + lo);
});

t("track output follows the contract (function target, clicks every 0.1 s)", () => {
  const r = Sim.createPlayer({ seed: 2 }).run(mk({ id: "tr", task: "track", cm: 30, angleDeg: 1, strafeDegS: -15.5 }));
  assert.strictEqual(typeof r.traj.targetYaw, "function");
  assert(Math.abs(r.traj.targetYaw(0) - 1) < 1e-9);
  assert(r.traj.clicks.length === 25 && r.summary.time <= 10 && r.summary.time >= 0.25);
});

t("randomTruth stays inside the ranges and createPlayer merges over defaults", () => {
  for (let s = 1; s <= 30; s++) {
    const tr = Sim.randomTruth(s);
    Object.keys(Sim.TRUTH_RANGES).forEach(k => assert(tr[k] >= Sim.TRUTH_RANGES[k][0] - 1e-12 && tr[k] <= Sim.TRUTH_RANGES[k][1] + 1e-12, k));
    assert.strictEqual(tr.countsPerCm, 314.96);
  }
  const p = Sim.createPlayer({ seed: 1, truth: { sigma0: 0.03 } });
  assert.strictEqual(p.truth.sigma0, 0.03); assert.strictEqual(p.truth.tLift, 0.3);
});

console.log(n + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
