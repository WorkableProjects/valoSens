// Run: node test/model.test.js
const assert = require("assert");
const M = require("../model.js");
const base = { dpi: 800, pad: 45, surface: "hybrid", limb: "forearm", role: "f", weapon: "rifle", experience: "mid" };
const rec = (o) => M.recommend({ ...base, ...o });
let n = 0; const t = (name, fn) => { fn(); n++; console.log("ok -", name); };

t("conversion round-trips", () => {
  const cm = M.cmFrom(800, 0.35);
  assert(Math.abs(cm - 46.65) < 0.05);
  assert(Math.abs(M.sensFor(cm, 800) - 0.35) < 1e-9);
});
t("pro data loaded and roles tagged", () => {
  assert.strictEqual(M.PROS.length, 32);
  assert.strictEqual(M.PROS.filter(p => p.role).length, 28);
  assert(Math.abs(M.PRO_STATS.medianEdpi - 192) < 1e-9);
});
t("calibration: reference flex player hits pro median", () => {
  const pr = M.profile({ limb: "forearm", surface: "hybrid", pad: 49, weapon: "rifle", mix: M.ROLE.f.mix, r: M.ROLE_FIT.f.r }, M.LAMBDA);
  assert(Math.abs(M.argmin(pr) - M.PRO_STATS.medianCm) < 0.3);
});
t("calibration: each role hits its shrunk pro target", () => {
  for (const k of ["d", "i", "c", "s"]) {
    const pr = M.profile({ limb: "forearm", surface: "hybrid", pad: 49, weapon: "rifle", mix: M.ROLE[k].mix, r: M.ROLE_FIT[k].r }, M.LAMBDA);
    assert(Math.abs(M.argmin(pr) - M.ROLE_FIT[k].target) < 0.3, k);
  }
});
t("bigger pad never gives a faster result", () => {
  for (const limb of ["wrist", "wf", "forearm", "arm"]) {
    let prev = 0;
    for (let pad = 20; pad <= 120; pad += 5) { const c = rec({ pad, limb }).cm; assert(c >= prev - 1e-6, limb + " " + pad); prev = c; }
  }
});
t("joint ordering: wrist < wf < forearm < arm", () => {
  const c = ["wrist", "wf", "forearm", "arm"].map(limb => rec({ limb }).cm);
  for (let i = 1; i < 4; i++) assert(c[i] > c[i - 1]);
});
t("weapon distance: close < rifle < sniper", () => {
  assert(rec({ weapon: "close" }).cm < rec({}).cm && rec({}).cm < rec({ weapon: "sniper" }).cm);
});
t("anchor weight rises with satisfaction", () => {
  const w = [1, 3, 5].map(sat => rec({ current: { cm: 30 }, satisfaction: sat }).anchor.weight);
  assert(w[0] < w[1] && w[1] < w[2]);
  const c5 = rec({ current: { cm: 30 }, satisfaction: 5 }).cm;
  assert(c5 > 30 && c5 < rec({}).cm);
});
t("good stats tighten trust in current setting", () => {
  const good = rec({ current: { cm: 40 }, satisfaction: 3, stats: { rank: "gold", matches: 100, hs: 28, kd: 1.5, adr: 160 } }).anchor.weight;
  const bad = rec({ current: { cm: 40 }, satisfaction: 3, stats: { rank: "gold", matches: 100, hs: 14, kd: 0.8, adr: 100 } }).anchor.weight;
  assert(good > bad);
});
t("results stay finite and in a sane range across all inputs", () => {
  for (const limb of ["wrist", "wf", "forearm", "arm", "unsure"]) for (const role of ["d", "i", "c", "s", "f"])
    for (const surface of ["control", "hybrid", "speed", "glass"]) for (const weapon of ["rifle", "sniper", "close"]) for (const pad of [20, 45, 120]) {
      const r = rec({ limb, role, surface, weapon, pad });
      assert(isFinite(r.cm) && r.cm >= 15 && r.cm <= 100, JSON.stringify({ limb, role, surface, weapon, pad, cm: r.cm }));
      assert(r.lo < r.cm && r.cm < r.hi && r.band[0] <= r.cModel && r.cModel <= r.band[1]);
    }
});
console.log(n + " tests passed");
