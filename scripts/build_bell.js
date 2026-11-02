// Regenerates the bell-curve constants in model.js (v5.0):
//   - REGION / AGE / GLASSES tables from research/demographic_shifts.json
//   - AGENT_Z from research/agent_shifts.json
//   - muLn / sdLn: mean and SD of ln(physical optimum) over a synthetic questionnaire population
//   - rho: scales the physical model's z so the whole population (model + shifts) has SD ~1
// Each group's shifts are centred on their population-weighted mean, so the population mean stays 0.3.
// Run: node scripts/build_bell.js            (full, ~4 min: recomputes the population)
//      node scripts/build_bell.js --tables   (tables + rho only, keeps muLn / sdLn)
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const file = path.join(root, "model.js");
const demo = JSON.parse(fs.readFileSync(path.join(root, "research/demographic_shifts.json"), "utf8"));
const ag = JSON.parse(fs.readFileSync(path.join(root, "research/agent_shifts.json"), "utf8"));

// Population weights (ESTIMATES: rough shares of the player base; only used for centring and rho).
const POP = {
  region: { na: .20, latam: .07, br: .08, eu: .25, mena: .05, kr: .05, jp: .07, cn: .05, sea: .10, oce: .03 },
  age: { u16: .10, "16_19": .30, "20_24": .30, "25_29": .17, "30_34": .08, "35p": .05 },
  glasses: { none: .55, glasses: .30, contacts: .15 }
};
const SYN = { pad: { 25: .1, 36: .2, 45: .35, 49: .15, 90: .2 }, limb: { wrist: .25, wf: .3, forearm: .3, arm: .15 },
  weapon: { rifle: .7, sniper: .1, close: .2 }, role: { d: .2, i: .2, c: .2, s: .2, f: .2 }, experience: { new: .15, mid: .3, exp: .35, comp: .2 } };

const r4 = x => Math.round(x * 1e4) / 1e4;
function table(group) {
  const src = demo[group], w = POP[group];
  const tw = Object.keys(w).reduce((s, k) => s + w[k], 0);
  const mean = Object.keys(w).reduce((s, k) => s + w[k] * ((src[k] && src[k].z) || 0), 0) / tw;
  const out = {};
  Object.keys(src).forEach(k => {
    const e = src[k];
    out[k] = { label: e.label, z: k === "unsure" ? 0 : r4((e.z || 0) - mean), basis: e.basis || "estimate" };
    if (e.note) out[k].note = e.note;
  });
  const v = Object.keys(w).reduce((s, k) => s + w[k] * Math.pow(out[k] ? out[k].z : 0, 2), 0) / tw;
  return { out, v };
}
const T = { region: table("region"), age: table("age"), glasses: table("glasses") };
const agentZ = {};
Object.keys(ag.agents).forEach(n => { const a = ag.agents[n]; agentZ[n] = { z: r4(a.z), n: a.n || 0, basis: a.basis || "estimate" }; });
const az = Object.values(agentZ).map(a => 0.5 * a.z), am = az.reduce((s, x) => s + x, 0) / az.length;
const vAgent = az.reduce((s, x) => s + (x - am) * (x - am), 0) / az.length;
const VS = T.region.v + T.age.v + T.glasses.v + vAgent;
const rho = r4(Math.sqrt(Math.max(0.5, 1 - VS)));

let src = fs.readFileSync(file, "utf8");
const demoBlock = "/*@DEMO*/\n" +
  "  var REGION = " + JSON.stringify(T.region.out) + ";\n" +
  "  var AGE = " + JSON.stringify(T.age.out) + ";\n" +
  "  var GLASSES = " + JSON.stringify(T.glasses.out) + ";\n" +
  "  var AGENT_Z = " + JSON.stringify(agentZ) + ";\n  /*@END*/";
src = src.replace(/\/\*@DEMO\*\/[\s\S]*?\/\*@END\*\//, demoBlock);
src = src.replace(/\/\*@RHO\*\/[^/]*\/\*@END\*\//, "/*@RHO*/" + rho + "/*@END*/");

if (!process.argv.includes("--tables")) {
  const M = require(file);
  const rows = [];
  for (const p in SYN.pad) for (const l in SYN.limb) for (const w in SYN.weapon) for (const r in SYN.role) for (const e in SYN.experience) {
    const c = M.expectedCurve({ pad: +p, limb: l, weapon: w, role: r, experience: e }).cStar;
    rows.push({ x: Math.log(c), w: SYN.pad[p] * SYN.limb[l] * SYN.weapon[w] * SYN.role[r] * SYN.experience[e] });
  }
  const tw = rows.reduce((s, r) => s + r.w, 0), mu = rows.reduce((s, r) => s + r.w * r.x, 0) / tw;
  const sd = Math.sqrt(rows.reduce((s, r) => s + r.w * (r.x - mu) * (r.x - mu), 0) / tw);
  src = src.replace(/\/\*@MULN\*\/[^/]*\/\*@END\*\//, "/*@MULN*/" + r4(mu) + "/*@END*/");
  src = src.replace(/\/\*@SDLN\*\/[^/]*\/\*@END\*\//, "/*@SDLN*/" + r4(sd) + "/*@END*/");
  console.log("population:", rows.length, "profiles, muLn", r4(mu), "(" + Math.exp(mu).toFixed(1) + " cm), sdLn", r4(sd));
}
fs.writeFileSync(file, src);
console.log("shift variance", r4(VS), "-> rho", rho);
