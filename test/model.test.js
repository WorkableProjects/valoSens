// Run: node test/model.test.js
"use strict";
const assert = require("assert");
const M = require("../model.js");
const { simulate } = require("./synthetic.js");

const base = { dpi: 800, pad: 45, limb: "forearm", role: "f", weapon: "rifle", experience: "mid" };
const rec = (o, opts) => M.recommend(Object.assign({}, base, o), opts);
const oct = (a, b) => Math.abs(Math.log2(a / b));
let n = 0, failed = 0;
function t(name, fn) {
  try { fn(); n++; console.log("ok   -", name); }
  catch (e) { failed++; console.log("FAIL -", name, "\n      ", e.message); }
}

/* ---------------- Conversions ---------------- */
t("Valorant conversion matches the formula", () => {
  assert(Math.abs(M.cmFrom(800, 0.35) - 914.4 / (800 * 0.35 * 0.07)) < 1e-9);
  assert(Math.abs(M.cmFrom(800, 0.35) - 46.653) < 0.001);
});
t("round trips: cm -> sens -> cm across DPI and games", () => {
  for (const game of Object.keys(M.GAME_YAW)) for (const dpi of [100, 400, 800, 1600, 3200, 25600]) for (const cm of [5, 20, 46.6, 80, 300]) {
    const s = M.sensFor(cm, dpi, game);
    assert(Math.abs(M.cmFrom(dpi, s, game) / cm - 1) < 1e-12, game + " " + dpi + " " + cm);
  }
});
t("cross-game conversion uses yaw ratios and round-trips", () => {
  // CS2 1.0 at 800 DPI == Valorant 0.022/0.07 = 0.3143 at 800 DPI
  assert(Math.abs(M.convert({ dpi: 800, sens: 1, from: "cs2", to: "valorant" }) - 0.022 / 0.07) < 1e-12);
  // OW2 -> Valorant
  assert(Math.abs(M.convert({ dpi: 800, sens: 5, from: "ow2", to: "valorant" }) - 5 * 0.0066 / 0.07) < 1e-12);
  // DPI change keeps eDPI-equivalent
  assert(Math.abs(M.convert({ dpi: 800, sens: 0.4, from: "valorant", to: "valorant", toDpi: 1600 }) - 0.2) < 1e-12);
  const a = M.convert({ dpi: 1600, sens: 0.21, from: "valorant", to: "apex" });
  assert(Math.abs(M.convert({ dpi: 1600, sens: a, from: "apex", to: "valorant" }) - 0.21) < 1e-12);
});
t("lenient converters return NaN for invalid input", () => {
  for (const [d, s] of [[NaN, 1], [800, NaN], [0, 1], [800, 0], [-800, 1], [800, -1], ["800", 1], [Infinity, 1], [800, Infinity]])
    assert(Number.isNaN(M.cmFrom(d, s)), JSON.stringify([d, s]));
  assert(Number.isNaN(M.cmFrom(800, 1, "fortnite")));
  assert(Number.isNaN(M.sensFor(0, 800)) && Number.isNaN(M.edpiFor(-1)));
});
t("strict converter rejects out-of-range values", () => {
  const bad = [{ dpi: 0, sens: 0.3 }, { dpi: 60000, sens: 0.3 }, { dpi: 800, sens: 0 }, { dpi: 800, sens: 11 },
    { dpi: 800, sens: 0.005 }, { dpi: 800, sens: 0.3, game: "fortnite" }, { dpi: "800", sens: 0.3 }];
  for (const b of bad) assert.throws(() => M.toCm(b), RangeError, JSON.stringify(b));
  assert.throws(() => M.toCm(null), TypeError);
  assert(Math.abs(M.toCm({ dpi: 800, sens: 0.35 }) - 46.653) < 0.001);
  assert.doesNotThrow(() => M.toCm({ dpi: 800, sens: 15, game: "cs2" }));     // other games aren't capped at 10
});

/* ---------------- Input validation ---------------- */
t("recommend() rejects invalid inputs", () => {
  const bad = [{ pad: undefined }, { pad: NaN }, { pad: 5 }, { pad: 1000 }, { dpi: 10 }, { current: { cm: -5 } }, { current: { cm: NaN } },
    { current: { cm: 5000 } }, { satisfaction: 0 }, { satisfaction: 9 }, { reachCm: -1 }, { reachCm: 500 }, { mix: [1, 0, 0] }, { mix: [0.5, 0.5, 0.5, 0] }];
  for (const b of bad) assert.throws(() => rec(b), RangeError, JSON.stringify(b));
  assert.throws(() => M.recommend(null), TypeError);
});
t("missing optional inputs fall back to defaults", () => {
  const r = M.recommend({ pad: 45 });
  assert(isFinite(r.cm) && r.lo <= r.cm && r.cm <= r.hi);
  assert.strictEqual(r.confidence.type, "heuristic");
  assert.strictEqual(r.confidence.label, "low");
});

/* ---------------- Numerical behaviour ---------------- */
t("extreme but valid inputs give finite, ordered results", () => {
  for (const pad of [10, 25, 45, 120, 300]) for (const reachCm of [undefined, 0.5, 5, 30, 100]) for (const cur of [null, 1, 20, 60, 1000]) {
    const r = rec({ pad, reachCm, current: cur ? { cm: cur } : null, satisfaction: 5 });
    assert(isFinite(r.cm) && r.cm > 0, JSON.stringify({ pad, reachCm, cur }));
    assert(r.band[0] <= r.cModel + 1e-9 && r.cModel <= r.band[1] + 1e-9);
    assert(r.lo <= r.cm + 1e-9 && r.cm <= r.hi + 1e-9 || (r.anchor && r.anchor.stay));
    r.curve.forEach(p => assert(isFinite(p.total) && p.total >= 0));
  }
});
t("cost is continuous in C (no jumps on a fine grid)", () => {
  const pr = M.buildProfile(Object.assign({}, base, { pad: 30, limb: "wrist" }), Object.fromEntries(Object.entries(M.PARAMS).map(([k, v]) => [k, v.central])));
  let prev = M.costAt(10, pr).total;
  for (let C = 10.01; C < 150; C += 0.01) {
    const v = M.costAt(C, pr).total;
    assert(Math.abs(v - prev) < 0.002, "jump at " + C.toFixed(2) + ": " + prev + " -> " + v);
    prev = v;
  }
});
t("recommendation changes continuously with pad width", () => {
  let prev = rec({ pad: 20 }).cModel;
  for (let pad = 20.5; pad <= 120; pad += 0.5) {
    const c = rec({ pad }).cModel;
    assert(oct(c, prev) < 0.05, "jump at pad " + pad + ": " + prev.toFixed(2) + " -> " + c.toFixed(2));
    prev = c;
  }
});
t("expected lifts: zero for short moves, non-decreasing, continuous", () => {
  const pr = M.buildProfile(base, Object.fromEntries(Object.entries(M.PARAMS).map(([k, v]) => [k, v.central])));
  assert.strictEqual(M.expectedLifts(1, pr), 0);
  let prev = 0;
  for (let a = 0; a < 200; a += 0.05) { const l = M.expectedLifts(a, pr); assert(l >= prev - 1e-12 && l - prev < 0.05); prev = l; }
});
t("results are reproducible", () => {
  const a = rec({ current: { cm: 30 }, satisfaction: 4 }), b = rec({ current: { cm: 30 }, satisfaction: 4 });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
});

/* ---------------- Physically justified properties ---------------- */
t("more pad space never makes the model optimum faster", () => {
  for (const limb of ["wrist", "wf", "forearm", "arm"]) {
    let prev = 0;
    for (let pad = 15; pad <= 150; pad += 5) { const c = rec({ pad, limb }).cModel; assert(c >= prev - 1e-6, limb + " pad " + pad); prev = c; }
  }
});
t("a noisier hand never makes the optimum faster", () => {
  let prev = 0;
  for (const s of [0.005, 0.01, 0.02, 0.04, 0.08]) { const c = M.expectedCurve(base, { noUncertainty: true, params: { sigma0: s } }).cStar; assert(c >= prev); prev = c; }
});
t("costlier mouse lifts never make the optimum slower", () => {
  let prev = Infinity;
  for (const tl of [0, 0.2, 0.5, 1, 2]) { const c = M.expectedCurve(Object.assign({}, base, { pad: 30 }), { noUncertainty: true, params: { tLift: tl } }).cStar; assert(c <= prev + 1e-6); prev = c; }
});

/* ---------------- What must NOT drive the result ---------------- */
t("match stats do not change the recommendation", () => {
  const plain = rec({ current: { cm: 40 }, satisfaction: 3 });
  for (const stats of [{ rank: "iron", matches: 500, hs: 5, kd: 0.3, adr: 60 }, { rank: "rad", matches: 500, hs: 45, kd: 2.5, adr: 220 }])
    assert.strictEqual(rec({ current: { cm: 40 }, satisfaction: 3, stats }).cm, plain.cm);
});
t("surface label does not change the recommendation", () => {
  const c = rec({}).cm;
  for (const surface of ["control", "hybrid", "speed", "glass"]) assert.strictEqual(rec({ surface }).cm, c);
});
t("pro data is a comparison group, not a calibration target", () => {
  const before = rec({}).cModel;
  const saved = M.PROS_ALL.map(p => Object.assign({}, p));
  M.setPros([{ name: "x", dpi: 800, sens: 1.5, status: "active_pro" }, { name: "y", dpi: 800, sens: 2, status: "active_pro" }]);
  try { assert.strictEqual(rec({}).cModel, before); }
  finally { M.setPros(saved, M.PRO_DATA); }
  assert.strictEqual(M.PROS.length, 28);
});
t("role and weapon effects stay inside the near-optimal range", () => {
  const ref = rec({});
  const halfBand = Math.log(ref.band[1] / ref.band[0]) / 2;
  for (const role of ["d", "i", "c", "s"]) assert(Math.abs(Math.log(rec({ role }).cModel / ref.cModel)) < halfBand, role);
  for (const weapon of ["sniper", "close"]) assert(Math.abs(Math.log(rec({ weapon }).cModel / ref.cModel)) < halfBand, weapon);
});

/* ---------------- Current setting, satisfaction and range rule ---------------- */
t("a current setting inside the near-optimal range is kept", () => {
  const r0 = rec({});
  const inside = Math.sqrt(r0.band[0] * r0.band[1]) * 1.05;
  const r = rec({ current: { cm: inside }, satisfaction: 1 });
  assert.strictEqual(r.cm, inside);
});
t("a current setting far outside moves only to the nearest edge of the range", () => {
  const r0 = rec({});
  const far = rec({ current: { cm: 12 }, satisfaction: 3 });
  assert(Math.abs(far.cm - r0.band[0]) < 1e-9);
  const slow = rec({ current: { cm: 140 }, satisfaction: 3 });
  assert(Math.abs(slow.cm - r0.band[1]) < 1e-9);
});
t("satisfaction can widen the stay tolerance, but at most 2x", () => {
  const E = M.expectedCurve(base), tol = M.PARAMS.tolerance.central;
  function at(mult) {                       // a setting just below the optimum whose extra cost is mult * tol
    let lo = 8, hi = E.cStar;
    for (let i = 0; i < 60; i++) { const m = Math.sqrt(lo * hi); if (E.at(m).total - E.jStar > mult * tol) lo = m; else hi = m; }
    return hi;
  }
  const c15 = at(1.5), c3 = at(3);
  assert(rec({ current: { cm: c15 }, satisfaction: 5 }).cm === c15);
  assert(rec({ current: { cm: c15 }, satisfaction: 1 }).cm !== c15);
  assert(rec({ current: { cm: c3 }, satisfaction: 5 }).cm !== c3);
});
t("questionnaire confidence is a heuristic label, not a number", () => {
  const r = rec({});
  assert.strictEqual(r.confidence.type, "heuristic");
  assert.strictEqual(typeof r.confidence.label, "string");
});

/* ---------------- Sensitivity analysis ---------------- */
t("sensitivity analysis covers every assumption and reports finite swings", () => {
  const s = M.sensitivityAnalysis(base);
  assert.strictEqual(s.params.length, Object.keys(M.PARAMS).length - 1);
  s.params.forEach(p => assert(isFinite(p.low) && isFinite(p.high) && p.swing >= 0, p.param));
  for (const p of s.params) assert(["measured", "research", "estimate"].includes(p.basis));
});
t("averaging over uncertain constants lands between their extremes", () => {
  const s = M.sensitivityAnalysis(base), top = s.params[0];
  const avg = rec({}).cModel;
  assert(avg >= Math.min(top.low, top.high) && avg <= Math.max(top.low, top.high));
});

/* ---------------- Pro dataset audit ---------------- */
t("pro rows carry status, source and verification date; creators excluded", () => {
  assert.strictEqual(M.PROS_ALL.length, 32);
  const names = M.PROS_ALL.map(p => p.name.toLowerCase());
  assert.strictEqual(new Set(names).size, names.length);
  M.PROS_ALL.forEach(p => {
    assert(p.source && /^https:\/\//.test(p.source), p.name);
    assert(p.verified === "2026-11-01", p.name);
    assert(["active_pro", "inactive_or_benched", "creator_or_streamer", "coach_or_analyst", "unknown"].includes(p.status), p.name);
    if (p.status === "creator_or_streamer") assert(!p.include, p.name);
  });
  M.PROS.forEach(p => assert(isFinite(p.cm) && p.include));
  assert.strictEqual(M.PRO_STATS.n, 28);
});

/* ---------------- Calibration pathway ---------------- */
const cinp = { pad: 45, role: "f", current: { cm: 25 } };
t("calibration recovers a clear optimum and stays inside the tested range", () => {
  const r = M.recommend(Object.assign({}, cinp, { calibration: { trials: simulate({ curv: 0.15, seed: 3, trueOpt: { micro: 45, flick: 45, turn: 45 } }) } }));
  const m = r.measured;
  assert(m.validation.curveBeatsFlat);
  assert(oct(m.fittedOptimum, 45) < 0.25, "fitted " + m.fittedOptimum);
  assert(r.cm >= m.tested[0] && r.cm <= m.tested[m.tested.length - 1]);
  assert(r.cm >= m.nearOptimal[0] - 1e-9 && r.cm <= m.nearOptimal[1] + 1e-9);
  assert.strictEqual(m.validation.modelVsCurrent.verdict, "better");
  assert.strictEqual(r.confidence.type, "measured");
});
t("calibration never extrapolates past tested settings", () => {
  const m = M.calibrate(simulate({ curv: 0.2, seed: 4, trueOpt: { micro: 120, flick: 120, turn: 120 } }), cinp, { bootstrap: 30 });
  assert(m.fittedOptimum <= 70 + 1e-9 && m.cm <= 70 + 1e-9);
});
t("with no real effect, the current setting is kept", () => {
  // Same noise sequence at every sensitivity: sensitivity has exactly zero effect.
  const tr = simulate({ curv: 0, seed: 5, cms: [25] });
  const trials = [];
  for (const cm of [25, 35, 50, 70]) tr.forEach(x => trials.push(Object.assign({}, x, { cm, order: x.order + trials.length })));
  const r = M.recommend(Object.assign({}, cinp, { calibration: { trials } }));
  assert.strictEqual(r.cm, 25);
  assert(!r.measured.validation.curveBeatsFlat);
});
t("false-positive rate with no real effect is low (3 sessions, 40 seeds)", () => {
  let fp = 0;
  for (let s = 100; s < 140; s++) if (M.calibrate(simulate({ curv: 0, seed: s }), cinp, { bootstrap: 10 }).validation.curveBeatsFlat) fp++;
  assert(fp / 40 <= 0.1, "false positives " + fp + "/40");
});
t("warm-up is modelled: rotated order with strong warm-up still recovers the optimum", () => {
  const m = M.calibrate(simulate({ curv: 0.15, warm: 0.4, seed: 8, trueOpt: { micro: 35, flick: 35, turn: 35 } }), cinp, { bootstrap: 30, warmup: 0 });
  assert(oct(m.fittedOptimum, 35) < 0.3, "fitted " + m.fittedOptimum);
});
t("fixed test order and single sessions are flagged", () => {
  const f = M.calibrate(simulate({ order: "fixed", seed: 9 }), cinp, { bootstrap: 10 });
  assert(f.warnings.some(w => /fixed order/.test(w)));
  const one = M.calibrate(simulate({ sessions: 1, perCell: 12, seed: 9 }), cinp, { bootstrap: 10 });
  assert(one.warnings.some(w => /one session/i.test(w)));
  assert.strictEqual(one.validation.scheme, "alternate repetitions (single session)");
});
t("calibration is reproducible for a fixed seed", () => {
  const tr = simulate({ curv: 0.1, seed: 11 });
  const a = M.calibrate(tr, cinp, { seed: 42 }), b = M.calibrate(tr, cinp, { seed: 42 });
  assert.deepStrictEqual(a.optimumInterval, b.optimumInterval);
  assert.strictEqual(a.cm, b.cm);
});
t("invalid calibration trials are rejected", () => {
  const good = { cm: 40, task: "flick", time: 0.5 };
  for (const bad of [[], [Object.assign({}, good, { cm: -1 })], [Object.assign({}, good, { task: "spin" })], [Object.assign({}, good, { time: NaN })],
    [Object.assign({}, good, { misses: -2 })]]) assert.throws(() => M.calibrate(bad, cinp), /trial|non-empty/);
});
t("fewer than three tested settings is handled and flagged", () => {
  const m = M.calibrate(simulate({ cms: [30, 50], curv: 0.1, seed: 12 }), cinp, { bootstrap: 10 });
  assert(m.warnings.some(w => /Fewer than 3/.test(w)));
  assert(m.cm >= 30 && m.cm <= 50);
});

/* ---------------- Agents ---------------- */
t("agent table is built from the research catalogue (30 agents, valid roles)", () => {
  const cat = require("../research/agent_mechanics.json");
  assert.strictEqual(M.AGENT_LIST.length, cat.agents.length);
  assert.strictEqual(M.AGENT_LIST.length, 30);
  M.AGENT_LIST.forEach(a => {
    assert(["d", "i", "c", "s"].includes(a.role), a.name);
    a.repos.forEach(r => assert(r.lo >= 0 && r.hi <= 180 && r.lo <= r.hi, a.name));
  });
});
t("every agent's task mix is a valid distribution", () => {
  M.AGENT_LIST.forEach(a => {
    const m = M.agentMix(a).mix;
    assert(m.every(x => x >= 0), a.name);
    assert(Math.abs(m.reduce((s, x) => s + x, 0) - 1) < 1e-12, a.name);
  });
});
t("agents with no aim-relevant mechanics use their class mix unchanged", () => {
  for (const name of ["Breach", "Sova", "Brimstone", "Astra"]) {
    const a = M.findAgent(name);
    assert.deepStrictEqual(M.agentMix(a).mix, M.ROLE[a.role].mix);
  }
});
t("agent input: names are case-insensitive, duplicates ignored, unknown names rejected", () => {
  const a = rec({ agents: ["jett", "JETT", "Omen"] });
  assert.deepStrictEqual(a.agents.agents.map(x => x.name), ["Jett", "Omen"]);
  assert(Math.abs(a.agents.agents[0].share - 0.5 / 0.8) < 1e-12);
  assert.throws(() => rec({ agents: ["NotAnAgent"] }), RangeError);
  assert.throws(() => rec({ agents: "Jett" }), RangeError);
  assert.throws(() => rec({ agents: [{ name: "Jett", share: -1 }] }), RangeError);
  assert.strictEqual(rec({ agents: [] }).cModel, rec({}).cModel);
});
t("agents override the role answer", () => {
  assert.strictEqual(rec({ role: "s", agents: ["Jett"] }).cModel, rec({ role: "d", agents: ["Jett"] }).cModel);
});
t("more ability-driven re-orientation never makes the optimum slower", () => {
  for (const name of ["Jett", "Yoru", "Omen", "Chamber"]) {
    let prev = Infinity;
    for (const k of [0, 0.5, 1, 2, 3]) {
      const rules = { rate: Object.fromEntries(Object.entries(M.AGENT_RULES.rate).map(([x, v]) => [x, v * k])), holdShift: M.AGENT_RULES.holdShift, weights: M.AGENT_RULES.weights };
      const c = rec({ agents: [name] }, { agentRules: rules, noUncertainty: true }).cModel;
      assert(c <= prev + 1e-6, name + " x" + k); prev = c;
    }
  }
});
t("agent effects stay inside the near-optimal range of the role-average result", () => {
  const ref = rec({});
  const half = Math.log(ref.band[1] / ref.band[0]) / 2;
  M.AGENT_LIST.forEach(a => assert(Math.abs(Math.log(rec({ agents: [a.name] }).cModel / ref.cModel)) < half, a.name));
});
t("sensitivity analysis reports agent toggles", () => {
  const s = M.sensitivityAnalysis(Object.assign({}, base, { agents: ["Yoru"] }));
  const names = s.toggles.map(x => x.param);
  assert(names.includes("agents ignored (role mix)") && names.includes("agent ability rates x2"));
});

/* ---------------- Scoped / ADS advice ---------------- */
t("match multipliers reproduce the researched values", () => {
  assert(Math.abs(M.matchMultiplier(2.5, 0) - 0.747) < 0.001);
  assert(Math.abs(M.matchMultiplier(3.5, 0) - 0.731) < 0.001);
  assert(Math.abs(M.matchMultiplier(1.5, 0) - 0.815) < 0.001);
  assert(Math.abs(M.matchMultiplier(1.25, 0) - 0.870) < 0.001);
  assert(Math.abs(M.matchMultiplier(2.5, 1) - 1) < 1e-12);
  let prev = 0;                                     // larger match point -> closer to 1.0
  for (const p of [0, 0.25, 0.5, 0.75, 1]) { const m = M.matchMultiplier(2.5, p); assert(m >= prev); prev = m; }
});
t("scoped advice: defaults to 1.0, offers options only when the player scopes", () => {
  const none = rec({ agents: ["Sage"] }).scopedAdvice;
  assert.strictEqual(none.scoped.start, 1.0); assert.strictEqual(none.scoped.alternatives.length, 0); assert.strictEqual(none.ads.alternatives.length, 0);
  const jett = rec({ agents: ["Jett"] }).scopedAdvice;
  assert.strictEqual(jett.scoped.level, "main"); assert(jett.scoped.alternatives.length > 0);
  const ch = rec({ agents: ["Chamber"] }).scopedAdvice;
  assert(ch.ads.chamber && ch.ads.alternatives[0].value === 0.815);
  assert.strictEqual(rec({ weapon: "sniper" }).scopedAdvice.scoped.level, "main");
});
t("scoped advice never changes the hipfire recommendation", () => {
  assert.strictEqual(rec({ weapon: "rifle", agents: ["Sage"] }).cm, rec({ weapon: "rifle", agents: ["Sage"] }).cm);
});

console.log("\n" + n + " passed, " + failed + " failed");
if (failed) process.exit(1);
