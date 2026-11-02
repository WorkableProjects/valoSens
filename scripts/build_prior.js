// Engine v6 (D3): regenerates the population prior and the physics weight in model.js.
//   - PRIOR.sdLn / PRIOR.sdLnPro: SD of ln cm/360 among general players and pros (research/population_v6.json).
//     The centre stays at 0.30 sens @ 800 DPI (team decision, docs/V1_ENGINE_V6_PLAN.md §-1).
//   - BELL.muLn / sdLn: mean and SD of ln(physical optimum) over a synthetic questionnaire population, used to
//     bias-correct the physics term (the average profile sits at the population centre).
//   - PRIOR.sigmaModel: model-discrepancy SD of the physics term. Estimated from research/physics_calibration_v6.json:
//     regress real ln cm/360 on the physics prediction made from each player's pad width (pros: experience "comp").
//     The regression slope is the weight physics deserves (regression of truth on prediction). It is combined with a
//     prior belief N(0.35, 0.20) by inverse-variance weighting, clamped to [0.10, 0.60], and converted to sigmaModel:
//     w = tau^2 / (tau^2 + scenVar + sigmaModel^2).
// Run: node scripts/build_prior.js        (~1 min)
"use strict";
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, ".."), file = path.join(root, "model.js");
const M = require(file);
const r4 = x => Math.round(x * 1e4) / 1e4;
const pop = JSON.parse(fs.readFileSync(path.join(root, "research/population_v6.json"), "utf8")).rows;
const phys = JSON.parse(fs.readFileSync(path.join(root, "research/physics_calibration_v6.json"), "utf8")).rows;
const sdOf = a => { const m = a.reduce((s, x) => s + x, 0) / a.length; return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / (a.length - 1)); };
const meanOf = a => a.reduce((s, x) => s + x, 0) / a.length;

// 1) Prior widths.
const lnGen = pop.filter(r => r.group === "general").map(r => Math.log(r.cm360));
const lnPro = pop.filter(r => r.group === "pro").map(r => Math.log(r.cm360));
const sdGen = r4(sdOf(lnGen)), sdPro = r4(sdOf(lnPro));

// 2) Physics population centre (same synthetic population as v5's build_bell.js).
const SYN = { pad: { 25: .1, 36: .2, 45: .35, 49: .15, 90: .2 }, limb: { wrist: .25, wf: .3, forearm: .3, arm: .15 },
  weapon: { rifle: .7, sniper: .1, close: .2 }, role: { d: .2, i: .2, c: .2, s: .2, f: .2 }, experience: { new: .15, mid: .3, exp: .35, comp: .2 } };
const rows = [];
for (const p in SYN.pad) for (const l in SYN.limb) for (const w in SYN.weapon) for (const r in SYN.role) for (const e in SYN.experience) {
  const c = M.expectedCurve({ pad: +p, limb: l, weapon: w, role: r, experience: e }).cStar;
  rows.push({ x: Math.log(c), w: SYN.pad[p] * SYN.limb[l] * SYN.weapon[w] * SYN.role[r] * SYN.experience[e] });
}
const tw = rows.reduce((s, r) => s + r.w, 0), mu = rows.reduce((s, r) => s + r.w * r.x, 0) / tw;
const sdPhys = Math.sqrt(rows.reduce((s, r) => s + r.w * (r.x - mu) * (r.x - mu), 0) / tw);

// 3) Physics weight from real players with known pad width.
const cache = {};
const pts = phys.filter(r => r.pad_width_cm && r.cm360 && r.pad_width_cm >= 15 && r.pad_width_cm <= 150).map(r => {
  const g = r.mouse_g && r.mouse_g >= 20 && r.mouse_g <= 250 ? Math.round(r.mouse_g / 5) * 5 : null;
  const key = r.pad_width_cm + "|" + g;
  if (!(key in cache)) cache[key] = Math.log(M.expectedCurve({ pad: r.pad_width_cm, experience: "comp", mouseG: g || undefined }).cStar);
  return { x: cache[key], y: Math.log(r.cm360) };
});
const mx = meanOf(pts.map(p => p.x)), my = meanOf(pts.map(p => p.y));
let sxx = 0, sxy = 0; pts.forEach(p => { sxx += (p.x - mx) ** 2; sxy += (p.x - mx) * (p.y - my); });
const beta = sxy / sxx, resid = pts.map(p => p.y - my - beta * (p.x - mx));
const se = Math.sqrt(resid.reduce((s, e) => s + e * e, 0) / (pts.length - 2) / sxx);
// The pad-width data varies little (most pads are 45-50 cm), so its slope is weakly informative. Combine it with a
// prior belief about the physics weight, N(0.35, 0.20) (judgement: the model captures real mechanisms but is unvalidated),
// by inverse-variance weighting, then clamp to [0.10, 0.60].
const W_PRIOR = 0.35, W_PRIOR_SD = 0.20;
const wPost = (W_PRIOR / W_PRIOR_SD ** 2 + beta / se ** 2) / (1 / W_PRIOR_SD ** 2 + 1 / se ** 2);
const wUse = Math.min(0.60, Math.max(0.10, wPost));
// Typical scenario spread of the physics optimum (reference profile), so sigmaModel excludes it.
const ref = M.expectedCurve({ pad: 45 }).scenarioOptima();
const rm = ref.reduce((s, o) => s + o.w * Math.log(o.c), 0), scenVar = ref.reduce((s, o) => s + o.w * (Math.log(o.c) - rm) ** 2, 0);
const tau2 = sdGen * sdGen, sigPh2 = tau2 * (1 - wUse) / wUse, sigmaModel = r4(Math.sqrt(Math.max(0.01, sigPh2 - scenVar)));

let src = fs.readFileSync(file, "utf8");
const put = (tag, v) => { const re = new RegExp("/\\*@" + tag + "\\*/[^/]*/\\*@END\\*/"); if (!re.test(src)) throw new Error("marker " + tag); src = src.replace(re, "/*@" + tag + "*/" + v + "/*@END*/"); };
put("PSD", sdGen); put("PSDPRO", sdPro); put("SIGMOD", sigmaModel); put("MULN", r4(mu)); put("SDLN", r4(sdPhys));
const note = JSON.stringify("Centre 0.30 sens @800 (team decision). Width: SD of ln cm/360 = " + sdGen + " for " + lnGen.length + " general players, " + sdPro + " for " + lnPro.length + " pros (research/population_v6). Physics weight from " + pts.length + " players with known pad width: slope " + r4(beta) + " (SE " + r4(se) + "), combined with a prior weight N(0.35, 0.20) -> " + r4(wUse) + ".");
src = src.replace(/\/\*@PSRC\*\/[\s\S]*?\/\*@END\*\//, "/*@PSRC*/" + note + "/*@END*/");
fs.writeFileSync(file, src);
console.log({ sdGen, sdPro, nGen: lnGen.length, nPro: lnPro.length, physMu: r4(mu), physSd: r4(sdPhys), nPhys: pts.length, beta: r4(beta), se: r4(se), wUse: r4(wUse), scenSd: r4(Math.sqrt(scenVar)), sigmaModel });
