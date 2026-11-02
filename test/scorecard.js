// Validation scorecard on simulated players (release gate).
// Run: node test/scorecard.js [--full] [--write] [--gate]
"use strict";
const fs = require("fs");
const path = require("path");
const M = require("../model.js");
const A = require("../aim.js");
const Sim = require("../sim/player.js");

const args = process.argv.slice(2);
const FULL = args.includes("--full"), WRITE = args.includes("--write"), GATE = args.includes("--gate");
const N_PLAYERS = FULL ? 400 : 60, N_TRUE = FULL ? 60 : 30;
const SEED0 = 1000;
const CACHE = path.join(__dirname, ".scorecard-cache.json");
const MIX = { micro: 0.34, flick: 0.34, turn: 0.17, track: 0.15 };
const GRID_CM = Array.from({ length: 13 }, (_, i) => 12 * Math.pow(120 / 12, i / 12));
const t0 = Date.now();

function gaussFn(seed) {
  const r = A._rng(seed);
  return () => Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r());
}

/* ---- true optimum ---- */
function trueCost(player, cm, seed, nTrue) {
  const per = { micro: nTrue, flick: nTrue, turn: nTrue, track: nTrue };
  const blocks = A.schedule({ levels: [cm], perLevel: per, warmupPerBlock: 0, seed, session: "t" });
  const sum = {}, cnt = {};
  blocks.forEach(b => b.specs.forEach(sp => {
    const r = player.run(sp);
    sum[sp.task] = (sum[sp.task] || 0) + r.summary.time; cnt[sp.task] = (cnt[sp.task] || 0) + 1;
  }));
  let c = 0;
  Object.keys(MIX).forEach(k => { c += MIX[k] * sum[k] / cnt[k]; });
  return c;
}
function solve3(m, v) {                                   // Cramer's rule for a 3x3 system
  const det = a => a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1]) - a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0]) + a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]);
  const d = det(m);
  return [0, 1, 2].map(j => det(m.map((row, i) => row.map((x, k) => k === j ? v[i] : x))) / d);
}
function quadMin(xs, ys) {                                // returns { x, edge }
  const lo = xs[0], hi = xs[xs.length - 1];
  const s = [0, 0, 0, 0, 0], tt = [0, 0, 0];
  xs.forEach((x, i) => { for (let p = 0; p < 5; p++) s[p] += Math.pow(x, p); for (let p = 0; p < 3; p++) tt[p] += ys[i] * Math.pow(x, p); });
  const co = solve3([[s[0], s[1], s[2]], [s[1], s[2], s[3]], [s[2], s[3], s[4]]], tt);
  let x;
  if (co[2] > 1e-12) x = -co[1] / (2 * co[2]);
  else x = ys[0] < ys[ys.length - 1] ? lo : hi;
  const xc = Math.min(hi, Math.max(lo, x));
  return { x: xc, edge: xc === lo || xc === hi };
}
function optimum(player, seed, nTrue) {
  const ys = GRID_CM.map((cm, i) => trueCost(player, cm, seed * 31 + i, nTrue));
  const idx = ys.map((y, i) => i).sort((a, b) => ys[a] - ys[b]).slice(0, 5).sort((a, b) => a - b);
  const q = quadMin(idx.map(i => Math.log2(GRID_CM[i])), idx.map(i => ys[i]));
  const bestIdx = ys.indexOf(Math.min.apply(null, ys));
  return { cTrue: Math.pow(2, q.x), edge: q.edge || bestIdx === 0 || bestIdx === ys.length - 1 };
}

/* ---- questionnaire ---- */
function answersFor(truth) {
  return {
    dpi: 800, pad: Math.round(truth.padCm + 6.5),
    limb: truth.reachCm < 5 ? "wrist" : truth.reachCm < 8 ? "wf" : truth.reachCm < 12 ? "forearm" : "arm",
    experience: truth.sigma0 < 0.015 ? "comp" : truth.sigma0 < 0.022 ? "exp" : truth.sigma0 < 0.03 ? "mid" : "new",
    role: "f", weapon: "rifle"
  };
}

/* ---- aim test on the sim ---- */
function aimTest(player, truth, centre, seed, sessions) {
  const levels = A.levelsAround(centre, 5), G = gaussFn(seed + 77);
  const records = [], trials = [];
  for (let s = 1; s <= sessions; s++) {
    const blocks = A.schedule({ levels, perLevel: { micro: 8, flick: 6, turn: 4, track: 2 }, warmupPerBlock: 2, seed: seed * 10 + s, session: "s" + s });
    blocks.forEach(b => b.specs.forEach(sp => {
      const r = player.run(sp), feat = A.features(r.traj, sp);
      records.push({ spec: sp, feat }); trials.push(A.toTrial(sp, feat));
    }));
  }
  const jit = v => v * (1 + 0.05 * G());
  const pad = A.padCheck([jit(truth.padCm), jit(truth.padCm)].map(cm => ({ cm })));
  const reach = A.reachCheck([jit(truth.reachCm), jit(truth.reachCm), jit(truth.reachCm)].map(cm => ({ cm })));
  return { trials, personal: A.estimatePersonal(records, { pad, reach }) };
}

/* ---- stats ---- */
function pct(a, p) { const s = a.slice().sort((x, y) => x - y); if (!s.length) return NaN; const i = (s.length - 1) * p, lo = Math.floor(i); return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (i - lo); }
function inside(c, ci) { return ci && c >= ci[0] && c <= ci[1]; }

function main() {
  let cache = {};
  try { cache = JSON.parse(fs.readFileSync(CACHE, "utf8")); } catch (e) { cache = {}; }
  const arms = { A: [], B: [], C: [], D: [] }, fails = { A: 0, B: 0, C: 0, D: 0 }, failMsgs = {};
  let edges = 0, updated = false;
  const cTrues = [];
  for (let i = 0; i < N_PLAYERS; i++) {
    const seed = SEED0 + i, truth = Sim.randomTruth(seed), player = Sim.createPlayer({ seed, truth });
    const key = seed + "|" + N_TRUE;
    if (!cache[key]) { cache[key] = optimum(player, seed, N_TRUE); updated = true; }
    const cTrue = cache[key].cTrue; if (cache[key].edge) edges++;
    cTrues.push(cTrue);
    const ans = answersFor(truth);
    const record = (arm, fn) => {
      try { const R = fn(); arms[arm].push({ err: Math.abs(Math.log2(R.cm / cTrue)), in80: inside(cTrue, R.posterior.ci80), in50: inside(cTrue, R.posterior.ci50) }); }
      catch (e) { fails[arm]++; failMsgs[arm + ": " + e.message] = (failMsgs[arm + ": " + e.message] || 0) + 1; }
    };
    record("A", () => M.recommend(ans, { priorOnly: true }));
    let Bcm = null;
    record("B", () => { const R = M.recommend(ans); Bcm = R.cm; return R; });
    if (Bcm == null) { fails.C++; fails.D++; continue; }
    [["C", 1], ["D", 2]].forEach(([arm, sess]) => record(arm, () => {
      const t = aimTest(player, truth, Bcm, seed, sess);
      return M.recommend(Object.assign({}, ans, { calibration: { trials: t.trials }, personal: t.personal }));
    }));
    if ((i + 1) % 10 === 0) process.stderr.write("  " + (i + 1) + "/" + N_PLAYERS + " players, " + ((Date.now() - t0) / 1000).toFixed(0) + " s\n");
  }
  if (updated) try { fs.writeFileSync(CACHE, JSON.stringify(cache)); } catch (e) { /* cache is optional */ }

  const names = { A: "A prior", B: "B questionnaire", C: "C + aim test (6 min)", D: "D thorough (12 min)" };
  const rows = Object.keys(arms).map(k => {
    const a = arms[k], errs = a.map(r => r.err), n = a.length;
    return { k, name: names[k], n, med: pct(errs, 0.5), mean: errs.reduce((s, v) => s + v, 0) / (n || NaN), p90: pct(errs, 0.9),
      c80: a.filter(r => r.in80).length / (n || NaN), c50: a.filter(r => r.in50).length / (n || NaN), fail: fails[k] };
  });
  const f = (v, d) => isFinite(v) ? v.toFixed(d) : "n/a";
  const lines = ["| Arm | n ok | median err (oct) | mean err (oct) | p90 err (oct) | 80% coverage | 50% coverage | failures |", "|---|---|---|---|---|---|---|---|"]
    .concat(rows.map(r => `| ${r.name} | ${r.n} | ${f(r.med, 3)} | ${f(r.mean, 3)} | ${f(r.p90, 3)} | ${f(r.c80, 2)} | ${f(r.c50, 2)} | ${r.fail} |`));
  const meta = `Mode: ${FULL ? "full" : "fast"}; players n = ${N_PLAYERS} (seeds ${SEED0}..${SEED0 + N_PLAYERS - 1}); N_true = ${N_TRUE} trials per task per cm; ` +
    `true optimum at a range edge: ${edges}/${N_PLAYERS}; cTrue median ${f(pct(cTrues, 0.5), 1)} cm/360 (range ${f(Math.min.apply(null, cTrues), 1)}-${f(Math.max.apply(null, cTrues), 1)}).`;
  const timing = `Time: ${((Date.now() - t0) / 1000).toFixed(1)} s`;
  const failTxt = Object.keys(failMsgs).map(m => `  ${failMsgs[m]}x ${m}`).join("\n");
  console.log(lines.join("\n")); console.log("\n" + meta); if (failTxt) console.log("Failure reasons:\n" + failTxt); console.log(timing);
  if (WRITE) {
    const md = "# valoSens scorecard (simulated players)\n\nWritten by `node test/scorecard.js --write`. Error is |log2(recommended / true optimum)| in octaves.\n\n" +
      lines.join("\n") + "\n\n" + meta + "\n\nDate: " + new Date().toISOString().slice(0, 10) + "\n" + (failTxt ? "\nFailure reasons:\n\n" + failTxt + "\n" : "");
    fs.writeFileSync(path.join(__dirname, "scorecard.md"), md);
    console.log("wrote test/scorecard.md");
  }
  if (GATE) {
    const C = rows.find(r => r.k === "C");
    const ok = C.med <= 0.15 && C.c80 >= 0.70 && C.c80 <= 0.90;
    console.log("GATE (C median <= 0.15 oct, 80% coverage in [0.70, 0.90]): " + (ok ? "PASS" : "FAIL"));
    if (!ok) process.exit(1);
  }
}
main();
