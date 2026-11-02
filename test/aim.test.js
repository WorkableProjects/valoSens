// Run: node test/aim.test.js
"use strict";
const assert = require("assert");
const A = require("../aim.js");
const M = require("../model.js");

let n = 0, failed = 0;
function t(name, fn) {
  try { fn(); n++; console.log("ok   -", name); }
  catch (e) { failed++; console.log("FAIL -", name, "\n      ", e.message); }
}
const close = (a, b, tol, msg) => assert(Math.abs(a - b) <= tol, (msg || "") + " expected " + b + " +-" + tol + ", got " + a);

/* ---- synthetic trajectories: 1000 Hz, min-jerk moves along x ---- */
function build(cm, targetYaw, pieces, extra) {
  const tt = [], x = [], y = [];
  let tc = 0, xc = 0;
  const push = () => { tt.push(+tc.toFixed(6)); x.push(xc); y.push(0); };
  push();
  for (const p of pieces) {
    if (p.hold) { const N = Math.round(p.hold * 1000); for (let i = 0; i < N; i++) { tc += 0.001; push(); } }
    else if (p.gap) { tc += p.gap; push(); }
    else if (p.move) {
      const N = Math.round(p.move * 1000), x0 = xc;
      for (let i = 1; i <= N; i++) { const s = i / N; tc += 0.001; xc = x0 + (p.to - x0) * (10 * s ** 3 - 15 * s ** 4 + 6 * s ** 5); push(); }
    }
  }
  return Object.assign({ t: tt, x, y, cm, targetDeg: A.HEAD_DEG, targetYaw, targetPitch: 0, done: tt[tt.length - 1],
    clicks: [{ t: tt[tt.length - 1], hit: true }] }, extra);
}
const CM = 40, AMP = 20 * CM / 360;      // 20 deg flick -> 2.22 cm
const flickSpec = { task: "flick", cm: CM, angleDeg: 20, pitchDeg: 0, targetDeg: A.HEAD_DEG, session: "s1", block: 0, order: 3, warmup: false };

/* ---------------- geometry ---------------- */
t("screenX: centre, edge, off-screen", () => {
  close(A.screenX(0, 1920), 960, 1e-9);
  close(A.screenX(51.5, 1920), 1920, 1e-6);
  close(A.screenX(-51.5, 1920), 0, 1e-6);
  assert.strictEqual(A.screenX(90, 1920), null);
  assert.strictEqual(A.screenX(-120, 1920), null);
});
t("screenY uses the same focal length, up is smaller y", () => {
  close(A.screenY(0, 1920, 1080), 540, 1e-9);
  assert(A.screenY(5, 1920, 1080) < 540 && A.screenY(-5, 1920, 1080) > 540);
  close(540 - A.screenY(10, 1920, 1080), A.screenX(10, 1920) - 960, 1e-9);
  close(A.degPerCm(40), 9, 1e-12);
});

/* ---------------- levels and schedule ---------------- */
t("levelsAround(40): 5 ascending log-spaced values spanning 40*2^-0.6..40*2^0.6", () => {
  const l = A.levelsAround(40);
  assert.strictEqual(l.length, 5);
  close(l[0], 40 * 2 ** -0.6, 1e-9); close(l[2], 40, 1e-9); close(l[4], 40 * 2 ** 0.6, 1e-9);
  for (let i = 1; i < 5; i++) assert(l[i] > l[i - 1]);
  const r = []; for (let i = 1; i < 5; i++) r.push(l[i] / l[i - 1]);
  r.forEach(x => close(x, r[0], 1e-9));
  const edge = A.levelsAround(10, 5, 2);
  assert(edge.every(v => v >= 8 && v <= 160));
});
t("schedule: each level once per session, unique ids, warmup flags, order counts across session", () => {
  const levels = A.levelsAround(40), per = { micro: 3, flick: 3, turn: 2, track: 2 };
  const b = A.schedule({ levels, perLevel: per, warmupPerBlock: 2, seed: 7, session: "sx" });
  assert.strictEqual(b.length, 5);
  assert.deepStrictEqual(b.map(x => x.cm).sort((p, q) => p - q), levels);
  const specs = [].concat(...b.map(x => x.specs));
  assert.strictEqual(specs.length, 5 * 10);
  assert.strictEqual(new Set(specs.map(s => s.id)).size, specs.length);
  specs.forEach((s, i) => { assert.strictEqual(s.order, i); assert.strictEqual(s.id, "sx-" + i); assert.strictEqual(s.session, "sx"); });
  b.forEach(blk => {
    assert.strictEqual(blk.specs.filter(s => s.warmup).length, 2);
    assert(blk.specs[0].warmup && blk.specs[1].warmup && !blk.specs[2].warmup);
    blk.specs.forEach(s => assert.strictEqual(s.cm, blk.cm));
    ["micro", "flick", "turn", "track"].forEach(k => assert.strictEqual(blk.specs.filter(s => s.task === k).length, per[k]));
  });
  assert.deepStrictEqual(A.schedule({ levels, perLevel: per, seed: 7 }).map(x => x.cm), b.map(x => x.cm));   // deterministic
});
t("schedule: block order is a balanced Latin square (n odd: each level in each position once)", () => {
  const levels = A.levelsAround(40, 5), pos = levels.map(() => [0, 0, 0, 0, 0]);
  for (let seed = 0; seed < 5; seed++) A.schedule({ levels, perLevel: { micro: 1 }, seed }).forEach((blk, p) => pos[levels.indexOf(blk.cm)][p]++);
  pos.forEach(row => assert.deepStrictEqual(row, [1, 1, 1, 1, 1]));
  // odd n, seed + n uses the mirror of the same row
  const a = A.schedule({ levels, perLevel: { micro: 1 }, seed: 2 }).map(x => x.cm);
  const m = A.schedule({ levels, perLevel: { micro: 1 }, seed: 7 }).map(x => x.cm);
  assert.deepStrictEqual(m, a.slice().reverse());
});
t("schedule: Williams design for even n (each ordered adjacent pair once; each position once)", () => {
  const levels = A.levelsAround(40, 4), pairs = {}, pos = levels.map(() => [0, 0, 0, 0]);
  for (let seed = 0; seed < 4; seed++) {
    const seq = A.schedule({ levels, perLevel: { micro: 1 }, seed }).map(x => levels.indexOf(x.cm));
    seq.forEach((l, p) => pos[l][p]++);
    for (let i = 1; i < 4; i++) { const k = seq[i - 1] + ">" + seq[i]; pairs[k] = (pairs[k] || 0) + 1; }
  }
  pos.forEach(row => assert.deepStrictEqual(row, [1, 1, 1, 1]));
  assert.strictEqual(Object.keys(pairs).length, 12);
  Object.values(pairs).forEach(c => assert.strictEqual(c, 1));
});
t("schedule: geometry ranges per task", () => {
  const b = A.schedule({ levels: [30, 40], perLevel: { micro: 20, flick: 20, turn: 20, track: 10 }, seed: 3 });
  const specs = [].concat(...b.map(x => x.specs));
  const turns = specs.filter(s => s.task === "turn");
  specs.forEach(s => {
    const a = Math.abs(s.angleDeg);
    if (s.task === "micro") { assert(a >= 1 && a <= 4); assert(Math.abs(s.pitchDeg) <= 1.5); assert.strictEqual(s.targetDeg, A.HEAD_DEG); }
    if (s.task === "flick") { assert(a >= 15 && a <= 40); assert(Math.abs(s.pitchDeg) <= 1.5); }
    if (s.task === "turn") { assert(a === 90 || a === 180); assert.strictEqual(s.pitchDeg, 0); assert.strictEqual(s.targetDeg, 2.0); }
    if (s.task === "track") { assert(a >= 0 && a <= 2); assert.strictEqual(Math.abs(s.strafeDegS), 15.5); assert.strictEqual(s.durationS, 2.5); assert.strictEqual(s.pitchDeg, 0); }
  });
  assert.strictEqual(turns.filter(s => Math.abs(s.angleDeg) === 90).length, turns.length / 2);
});
t("nextLevel prefers high density and fewer trials", () => {
  const c = [20, 30, 40, 60];
  assert.strictEqual(A.nextLevel(c, {}, cm => (cm === 30 ? 2 : 1)), 30);
  assert.strictEqual(A.nextLevel(c, { 30: 8 }, cm => (cm === 30 ? 2 : 1.5)), 40);   // 30 scores 2/3 < 1.5; 20/40/60 tie -> 40 is nearest the median in log
  assert.strictEqual(A.nextLevel(c, { 40: 3, 30: 3 }, () => 1), 60);               // untested ones win; 20 and 60 tie, 60 is nearer the median (35) in log
  assert.strictEqual(A.nextLevel([30, 40], { 30: 0, 40: 3 }, () => 1), 30);
});

/* ---------------- features ---------------- */
t("features: primary + correction across one lift", () => {
  const traj = build(CM, 20, [{ hold: 0.2 }, { move: 0.12, to: 1.8 }, { hold: 0.02 }, { gap: 0.12 }, { move: 0.1, to: AMP }, { hold: 0.02 }]);
  const f = A.features(traj, flickSpec);
  assert.strictEqual(f.nSub, 2);
  assert.strictEqual(f.lifts, 1);
  assert.strictEqual(f.liftTimes.length, 1);
  close(f.liftTimes[0], 0.12, 0.002);
  assert(f.hit && f.misses === 0 && f.overshoots === 0);
  close(f.time, traj.done, 1e-12);
  assert(f.pathEff <= 1 && f.pathEff > 0.99);
  close(f.primaryAmpCm, 1.8, 0.05);
  close(f.primaryErrCm, 1.8 - AMP, 0.05);
  assert(f.peakCmS > 25 && f.peakCmS < 32, "peak " + f.peakCmS);
  assert(f.endErrDeg < 0.05);
  assert.strictEqual(f.onTarget, undefined);
});
t("features: a single clean move is one submovement, no lift", () => {
  const f = A.features(build(CM, 20, [{ hold: 0.2 }, { move: 0.15, to: AMP }, { hold: 0.02 }]), flickSpec);
  assert.strictEqual(f.nSub, 1); assert.strictEqual(f.lifts, 0); assert.strictEqual(f.overshoots, 0);
  close(f.primaryErrCm, 0, 0.03);
});
t("features: overshoot is counted once, pathEff < 1, miss before hit", () => {
  const traj = build(CM, 20, [{ hold: 0.2 }, { move: 0.12, to: 1.3 * AMP }, { hold: 0.03 }, { move: 0.1, to: AMP }, { hold: 0.02 }]);
  traj.clicks = [{ t: 0.3, hit: false }, { t: traj.done, hit: true }];
  const f = A.features(traj, flickSpec);
  assert.strictEqual(f.overshoots, 1);
  assert.strictEqual(f.nSub, 2);
  assert.strictEqual(f.misses, 1);
  assert(f.pathEff < 0.8 && f.pathEff > 0.5, "pathEff " + f.pathEff);
  assert(f.primaryErrCm > 0.5);
});
t("features: no hit gives timeout 4 s with hit:false and all clicks as misses", () => {
  const traj = build(CM, 20, [{ hold: 0.2 }, { move: 0.12, to: 0.5 * AMP }, { hold: 0.5 }]);
  traj.clicks = [{ t: 0.4, hit: false }, { t: 0.6, hit: false }]; traj.done = 4;
  const f = A.features(traj, flickSpec);
  assert.strictEqual(f.hit, false); assert.strictEqual(f.time, 4); assert.strictEqual(f.misses, 2);
});
t("features: track onTarget fraction and time rule", () => {
  const cm = 40, ty = tt => 15.5 * tt, tt = [], x = [], y = [];
  for (let i = 0; i <= 2500; i++) { tt.push(i / 1000); x.push(ty(i / 1000) * cm / 360); y.push(0); }
  const spec = { task: "track", cm, angleDeg: 0, pitchDeg: 0, targetDeg: A.HEAD_DEG, strafeDegS: 15.5, durationS: 2.5, session: "s1", block: 0, order: 0, warmup: false };
  const base = { t: tt, x, y, cm, targetDeg: A.HEAD_DEG, targetYaw: ty, targetPitch: 0, done: 2.5, clicks: [] };
  const perfect = A.features(base, spec);
  close(perfect.onTarget, 1, 1e-12); close(perfect.time, 0.25, 1e-12);
  const lag = A.features(Object.assign({}, base, { x: x.map((v, i) => v - 0.5 * 40 / 360 * (i % 2)) }), spec);   // half the samples 0.5 deg off
  close(lag.onTarget, 0.5, 0.01);
  close(lag.time, 0.25 / lag.onTarget, 1e-9);
  const lost = A.features(Object.assign({}, base, { x: x.map(() => 0) }), spec);
  assert(lost.onTarget < 0.05); close(lost.time, 5, 1e-12);
});

/* ---------------- toTrial ---------------- */
t("toTrial fills the contract record and keeps warmup", () => {
  const f = A.features(build(CM, 20, [{ hold: 0.2 }, { move: 0.15, to: AMP }, { hold: 0.02 }]), flickSpec);
  const tr = A.toTrial(Object.assign({}, flickSpec, { warmup: true }), f, { droppedFrames: 2 });
  assert.strictEqual(tr.cm, CM); assert.strictEqual(tr.task, "flick"); assert.strictEqual(tr.session, "s1"); assert.strictEqual(tr.order, 3);
  assert.strictEqual(tr.warmup, true); assert.strictEqual(tr.droppedFrames, 2); assert.strictEqual(tr.hit, true);
  ["time", "misses", "overshoots", "endErrDeg", "nSub", "peakCmS", "pathEff", "lifts", "angleDeg", "targetDeg"].forEach(k => assert(k in tr, k));
});
t("toTrial output is accepted by model.js recommend() calibration", () => {
  const levels = A.levelsAround(40, 4), r = A._rng(5);
  const gauss = () => Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r());
  const blocks = A.schedule({ levels, perLevel: { micro: 12, flick: 12, turn: 12, track: 0 }, warmupPerBlock: 2, seed: 4 });
  const trials = [];
  blocks.forEach(b => b.specs.forEach(s => {
    const base = { micro: 0.9, flick: 0.6, turn: 1.1 }[s.task] + 0.12 * Math.log2(s.cm / 40) ** 2 + 0.05 * gauss();
    const feat = { time: Math.max(0.2, base), hit: true, misses: 0, overshoots: 0, endErrDeg: 0.1, nSub: 2, peakCmS: 30, pathEff: 0.9, lifts: 0, liftTimes: [] };
    trials.push(A.toTrial(s, feat));
  }));
  assert(trials.length >= 3 * 8 * 3);
  const res = M.recommend({ pad: 45, calibration: { trials } });
  assert(res && typeof res === "object");
});

/* ---------------- hardware checks ---------------- */
t("dpiCheck: exact data gives ratio 1 and consistent, no accel flag", () => {
  const cpc = 800 / 2.54, s = [0, 1, 2, 3, 4].map(i => ({ counts: 8.56 * cpc, cm: 8.56, durS: 0.3 + 0.1 * i }));
  const d = A.dpiCheck(s, 800);
  close(d.ratio, 1, 1e-9); close(d.countsPerCm, cpc, 1e-9); close(d.effDpi, 800, 1e-9);
  assert(d.consistent && !d.accelSuspect && d.cv < 1e-9);
});
t("dpiCheck: speed-dependent counts are flagged as acceleration", () => {
  const cpc = 800 / 2.54, s = [0.8, 0.5, 0.35, 0.25, 0.18].map(dur => ({ counts: 8.56 * cpc * (1 + 0.4 / dur / 10), cm: 8.56, durS: dur }));
  const d = A.dpiCheck(s, 800);
  assert(d.accelSuspect, "corr rule"); assert(!d.consistent);
  const two = A.dpiCheck(s.slice(0, 2), 800);
  assert(!two.accelSuspect);          // needs >= 3 samples
  assert.strictEqual(A.dpiCheck([], 800), null);
});
t("padCheck / reachCheck: median and standard error", () => {
  const p = A.padCheck([{ cm: 40 }, { cm: 44 }, { cm: 42 }, { cm: 46 }, { cm: 38 }]);
  assert.strictEqual(p.value, 42); assert.strictEqual(p.n, 5); close(p.sd, Math.sqrt(10) / Math.sqrt(5), 1e-12);
  assert.strictEqual(A.reachCheck([{ cm: 20 }, { cm: 30 }]).value, 25);
  assert.strictEqual(A.reachCheck([]), null);
});

/* ---------------- personal parameters ---------------- */
t("estimatePersonal recovers sigma0 within 25% (sigma0 = 0.02, k = 0.05)", () => {
  const r = A._rng(99), sig = 0.02, k = 0.05;
  const gauss = () => Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r());
  const recs = [];
  A.levelsAround(40).forEach(cm => {
    for (let i = 0; i < 80; i++) {
      const ang = 1 + 3 * r(), amp = ang * cm / 360;
      const e = gauss() * Math.sqrt(sig * sig + k * k * amp * amp);
      recs.push({ spec: { task: "micro", cm, warmup: false }, feat: { primaryAmpCm: amp, primaryErrCm: e, subDurS: [0.1, 0.1], liftTimes: [], peakCmS: 10 } });
    }
  });
  const p = A.estimatePersonal(recs, {});
  assert(p.sigma0 && p.sigma0.n === 400);
  assert(Math.abs(p.sigma0.value / sig - 1) < 0.25, "sigma0 " + p.sigma0.value);
  assert(p.sigma0.sd > 0 && p.sigma0.sd < 0.01);
  assert.deepStrictEqual(A.estimatePersonal(recs, {}), p);      // deterministic
});
t("estimatePersonal: tSub, vPeak, tLift and extras", () => {
  const recs = [];
  for (let i = 0; i < 20; i++) {
    recs.push({ spec: { task: "flick", cm: 40, warmup: false }, feat: { subDurS: [0.15, 0.08 + 0.001 * i, 0.07], liftTimes: [0.1 + 0.001 * i], primaryErrCm: null } });
    recs.push({ spec: { task: "turn", cm: 40, warmup: false }, feat: { subDurS: [0.3], liftTimes: [], peakCmS: 50 + i } });
    recs.push({ spec: { task: "turn", cm: 40, warmup: true }, feat: { subDurS: [0.3], liftTimes: [9], peakCmS: 999 } });     // warmup ignored
  }
  const dpi = A.dpiCheck([0, 1, 2].map(i => ({ counts: 8.56 * 800 / 2.54, cm: 8.56, durS: 0.3 + 0.1 * i })), 800);
  const p = A.estimatePersonal(recs, { dpi, pad: A.padCheck([{ cm: 45 }, { cm: 47 }]), reach: A.reachCheck([{ cm: 25 }]) });
  close(p.tSub.value, 0.0775, 0.005); assert.strictEqual(p.tSub.n, 40);
  close(p.vPeak.value, 50 + 0.9 * 19, 1e-9); assert.strictEqual(p.vPeak.n, 20);
  close(p.tLift.value, 0.1095, 0.002);
  assert.strictEqual(p.padCm.value, 46); assert.strictEqual(p.reachCm.value, 25);
  close(p.countsPerCm.value, 800 / 2.54, 1e-9);
  assert.deepStrictEqual(p.accel, { suspect: false, ratio: dpi.ratio });
  assert(!("sigma0" in p));              // no micro trials
});

console.log("\n" + n + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
