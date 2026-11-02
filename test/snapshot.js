// Engine snapshot grid: records recommend() for 60 fixed profiles.
// Run: node test/snapshot.js            (diff against the stored snapshot, always exits 0)
//      node test/snapshot.js --update   (write test/snapshots/engine.json)
//      node test/snapshot.js --check    (exit 1 if any cm moved more than 0.5% or a profile is missing)
"use strict";
const fs = require("fs");
const path = require("path");
const M = require("../model.js");

const SNAP = path.join(__dirname, "snapshots", "engine.json");
const TOL = 0.005;   // 0.5%

// Base for the extra profiles. The spec leaves these fields open; they match the first cartesian group.
const BASE = { dpi: 800, pad: 45, limb: "wf", role: "d", weapon: "rifle", experience: "new" };

function sig4(x) {
  return typeof x === "number" && isFinite(x) ? Number(x.toPrecision(4)) : null;
}
function baseId(p) {
  return "pad" + p.pad + "-" + p.limb + "-" + p.role + "-" + p.weapon + "-" + p.experience;
}

function profiles() {
  const out = [];
  for (const pad of [25, 45, 90]) for (const limb of ["wrist", "forearm"]) for (const role of ["d", "c"])
    for (const weapon of ["rifle", "sniper"]) for (const experience of ["new", "comp"]) {
      const input = { dpi: 800, pad, limb, role, weapon, experience };
      out.push({ id: baseId(input), input });
    }
  const add = (suffix, extra) => {
    const input = Object.assign({}, BASE, extra);
    out.push({ id: baseId(input) + suffix, input });
  };
  for (const name of ["Jett", "Omen", "Sova", "Chamber"]) add("-agent-" + name, { agents: [name] });
  for (const cm of [25, 50, 90]) add("-cur" + cm, { current: { cm } });
  for (const region of ["na", "kr"]) add("-region-" + region, { region });
  add("-age-35p", { age: "35p" });
  add("-mouse95", { mouseG: 95 });
  add("-grip-fingertip", { grip: "fingertip" });
  return out;
}

function computeAll() {
  const list = profiles();
  const seen = new Set();
  const rows = list.map((p) => {
    if (seen.has(p.id)) throw new Error("duplicate profile id " + p.id);
    seen.add(p.id);
    const r = M.recommend(p.input);
    const ci = r.posterior && Array.isArray(r.posterior.ci80) ? r.posterior.ci80.map(sig4) : null;
    return {
      id: p.id,
      input: p.input,
      cm: sig4(r.cm),
      lo: sig4(r.lo),
      hi: sig4(r.hi),
      ci80: ci,
      cModel: sig4(r.cModel),
      label: r.confidence ? r.confidence.label : null,
    };
  });
  rows.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return rows;
}

function readOld() {
  if (!fs.existsSync(SNAP)) return null;
  return JSON.parse(fs.readFileSync(SNAP, "utf8"));
}

function pct(oldCm, newCm) {
  return (newCm / oldCm - 1) * 100;
}

function median(xs) {
  if (!xs.length) return 0;
  const s = xs.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const mode = process.argv.includes("--update") ? "update" : process.argv.includes("--check") ? "check" : "diff";
const fresh = computeAll();

if (mode === "update") {
  fs.mkdirSync(path.dirname(SNAP), { recursive: true });
  fs.writeFileSync(SNAP, JSON.stringify(fresh, null, 2) + "\n");
  console.log("wrote " + fresh.length + " profiles to " + path.relative(process.cwd(), SNAP));
  process.exit(0);
}

const old = readOld();

if (mode === "check") {
  if (!old) { console.log("no snapshot yet"); process.exit(0); }
  const oldById = new Map(old.map((r) => [r.id, r]));
  const newById = new Map(fresh.map((r) => [r.id, r]));
  const problems = [];
  for (const [id, o] of oldById) {
    const n = newById.get(id);
    if (!n) { problems.push(id + ": missing from current run"); continue; }
    const ch = Math.abs(pct(o.cm, n.cm));
    if (ch > TOL * 100) problems.push(id + ": cm " + o.cm + " -> " + n.cm + " (" + pct(o.cm, n.cm).toFixed(2) + "%)");
  }
  for (const id of newById.keys()) if (!oldById.has(id)) problems.push(id + ": not in snapshot (run --update)");
  if (problems.length) {
    console.log("snapshot check FAILED (" + problems.length + "):");
    for (const p of problems) console.log("  " + p);
    process.exit(1);
  }
  console.log("snapshot check ok (" + fresh.length + " profiles)");
  process.exit(0);
}

// diff mode
if (!old) { console.log("no snapshot yet"); process.exit(0); }
const oldById = new Map(old.map((r) => [r.id, r]));
const newById = new Map(fresh.map((r) => [r.id, r]));
const ids = Array.from(new Set([...oldById.keys(), ...newById.keys()])).sort();
const changes = [];
const allAbs = [];
for (const id of ids) {
  const o = oldById.get(id), n = newById.get(id);
  if (o && n) {
    const p = pct(o.cm, n.cm);
    allAbs.push(Math.abs(p));
    if (Math.abs(p) > TOL * 100) changes.push({ id, oc: String(o.cm), nc: String(n.cm), p: p.toFixed(2) + "%" });
  } else {
    changes.push({ id, oc: o ? String(o.cm) : "-", nc: n ? String(n.cm) : "-", p: "n/a" });
  }
}
const cols = ["id", "old cm", "new cm", "% change"];
const width = cols.map((c, i) => Math.max(c.length, ...changes.map((r) => [r.id, r.oc, r.nc, r.p][i].length)));
const line = (vals) => vals.map((v, i) => v.padEnd(width[i])).join("  ");
if (changes.length) {
  console.log(line(cols));
  for (const r of changes) console.log(line([r.id, r.oc, r.nc, r.p]));
}
console.log("");
console.log("changed (|change| > 0.5%): " + changes.length + " of " + ids.length);
console.log("median |change| over all " + allAbs.length + " compared profiles: " + median(allAbs).toFixed(2) + "%");
console.log("max |change|: " + (allAbs.length ? Math.max(...allAbs).toFixed(2) : "0.00") + "%");
process.exit(0);
