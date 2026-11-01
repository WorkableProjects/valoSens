// Regenerates the inlined agent table in model.js from research/agent_mechanics.json.
// Only raw, catalogued mechanics are copied; how they change the task mix is decided in model.js.
// Run: node scripts/build_agents.js
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const d = JSON.parse(fs.readFileSync(path.join(root, "research/agent_mechanics.json"), "utf8"));
const ROLE = { Duelist: "d", Initiator: "i", Controller: "c", Sentinel: "s" };
const rows = d.agents.map(a => {
  const repos = [], hold = [], guided = [], weapon = [];
  let adsZoom = null;
  a.abilities.forEach(x => {
    const m = x.mechanics || [];
    if (m.includes("reposition") && Array.isArray(x.reorient_deg)) repos.push({ key: x.key, name: x.name, lo: x.reorient_deg[0], hi: x.reorient_deg[1] });
    if (m.includes("hold")) hold.push(x.name);
    if (m.includes("guided")) guided.push(x.name);
    if (m.includes("weapon_ability")) weapon.push(x.name);
    if (x.zoom) adsZoom = x.zoom;
  });
  const w = (a.engagement && a.engagement.weapons || []).join(" ");
  const operator = /Operator occasionally/i.test(w) ? "sometimes" : /Operator/i.test(w) ? "main" : "rare";
  return { name: a.name, role: ROLE[a.role] || null, release: a.release || null, repos, hold, guided, weapon, adsZoom, operator };
});
const file = path.join(root, "model.js");
let src = fs.readFileSync(file, "utf8");
const re = /\/\*@AGENTS\*\/[\s\S]*?\/\*@END\*\//;
if (!re.test(src)) throw new Error("@AGENTS marker not found in model.js");
src = src.replace(re, "/*@AGENTS*/[\n    " + rows.map(r => JSON.stringify(r)).join(",\n    ") + "\n  ]/*@END*/");
fs.writeFileSync(file, src);
console.log("wrote", rows.length, "agents");
