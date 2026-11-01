// Regenerates the inlined pro comparison data in model.js from research/pro_data_audit.json.
// Run: node scripts/build_pros.js
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const audit = JSON.parse(fs.readFileSync(path.join(root, "research/pro_data_audit.json"), "utf8"));
const ROLE = { duelist: "d", initiator: "i", controller: "c", sentinel: "s", flex: "f" };
const rows = audit.players.map(p => {
  const ps = (p.sources || []).find(s => s.source_id === "prosettings_player") || {};
  const creator = p.status === "creator_or_streamer" || p.status === "coach_or_analyst";
  const missing = !(p.dpi > 0 && p.sens > 0);
  return {
    name: p.name, dpi: p.dpi, sens: p.sens, role: ROLE[p.role] || null, roleConfidence: p.role_confidence || null,
    status: p.status, team: p.current_team_2026_11_01 || p.team_2026 || null,
    settingsConflict: !!p.settings_conflict, settingsStale: !!p.settings_stale,
    include: !creator && !missing && !p.duplicate_of && !p.settings_stale,
    excludeReason: creator ? "creator, not a VCT player" : missing ? "missing settings" : p.duplicate_of ? "duplicate" : p.settings_stale ? "stale settings" : null,
    source: ps.url || "https://prosettings.net/lists/valorant/", sourceUpdated: ps.updated || p.prosettings_last_updated || null,
    verified: p.verified_date || null
  };
});
const meta = { generated: audit.generated, verifiedOn: audit.generated,
  sources: audit.sources.map(s => ({ id: s.id, url: s.url, accessed: s.accessed })) };
const file = path.join(root, "model.js");
let src = fs.readFileSync(file, "utf8");
const re = /\/\*@PROS\*\/[\s\S]*?\/\*@END\*\/, \/\*@PROMETA\*\/[\s\S]*?\/\*@END\*\//;
if (!re.test(src)) throw new Error("markers not found in model.js");
const body = "[\n    " + rows.map(r => JSON.stringify(r)).join(",\n    ") + "\n  ]";
src = src.replace(re, "/*@PROS*/" + body + "/*@END*/, /*@PROMETA*/" + JSON.stringify(meta) + "/*@END*/");
fs.writeFileSync(file, src);
console.log("wrote", rows.length, "rows;", rows.filter(r => r.include).length, "in comparison group");
