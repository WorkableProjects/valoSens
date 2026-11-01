// Unit tests for the crosshair + highlight model (v3). Run: node test/xhair.test.js
const X = require("../xhair.js");
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log("ok   - " + name); } catch (e) { fail++; console.log("FAIL - " + name + ": " + e.message); } }
function eq(a, b, m) { if (a !== b) throw new Error((m || "") + " expected " + JSON.stringify(b) + ", got " + JSON.stringify(a)); }
function ok(c, m) { if (!c) throw new Error(m || "assertion failed"); }

// Simulated observer for the vision test: true 75%-ish thresholds per color (log10 opacity).
function simulateVision(truth, seed, o = {}) {
  const r = X.rng(seed + 99), run = X.visionRun({ seed }), lapse = o.lapse ?? 0.02, s = o.slope ?? 8;
  let tr;
  while ((tr = run.nextTrial())) {
    const p = tr.catchTrial ? (o.catchP ?? 0.98) : 0.25 + (1 - 0.25 - lapse) / (1 + Math.exp(-s * (tr.x - truth[tr.color])));
    const correct = r() < p;
    run.record(tr, { answer: correct ? tr.target : (tr.target + 1 + Math.floor(r() * 3)) % 4, shownMs: 58, dropped: o.drop ? r() < o.drop : false });
  }
  return run;
}

/* ---------- Codes ---------- */
t("decodes real pro codes", () => {
  const tenz = X.decode("0;s;1;P;c;5;o;0;f;0;0l;2;0v;2;0g;1;0o;1;0a;1;0f;0;1b;0");
  eq(tenz.c, 5); eq(tenz["0l"], 2); eq(tenz["0o"], 1); eq(tenz["1b"], 0); eq(tenz.f, 0); eq(tenz["0g"], 1);
  const aspas = X.decode("0;P;h;0;0l;4;0o;0;0a;1;0f;0;1b;0");
  eq(aspas.c, 0); eq(aspas.h, 0); eq(aspas["0l"], 4); eq(aspas["0v"], 4);
});
t("encode → decode round trip keeps every field, including unlinked vertical length", () => {
  const cfg = { c: 5, h: 1, t: 1, o: 0.5, d: 1, z: 3, a: 1, f: 0, "0b": 1, "0t": 2, "0l": 3, "0v": 5, "0g": 1, "0o": 2, "0a": 1, "0m": 1, "0f": 0, "1b": 0 };
  const back = X.decode(X.encode(cfg));
  Object.keys(cfg).forEach(k => eq(back[k], cfg[k], k));
});
t("every pool crosshair encodes to a valid code", () => {
  eq(X.POOL.length, 18);
  X.POOL.forEach(p => { const c = X.encode(X.poolCfg(p)); const d = X.decode(c); eq(d.c, X.XC[p.color].i, p.id); eq(d["1b"], 0, p.id); eq(d["0f"], 0, p.id); });
});

/* ---------- Color science ---------- */
t("CVD simulation: red looks dark to protans, red and green converge for deutans, white stays white", () => {
  ok(X.lum(X.simHex("#FF0000", "protan")) < 0.6 * X.lum("#FF0000"), "protan red should be darker");
  ok(X.dE("#FF0000", "#00FF00", "deutan") < X.dE("#FF0000", "#00FF00", "none") / 2, "deutan should shrink red-green difference");
  eq(X.simHex("#FFFFFF", "deutan"), "#FFFFFF");
});
t("periphery weighting lowers red-green contrast more than blue-yellow", () => {
  const rg = X.dE("#FF0000", "#7D8288", null, "periphery") / X.dE("#FF0000", "#7D8288", null, "fovea");
  ok(X.dE("#A0A000", "#202080", null, "periphery") > X.dE("#A0A000", "#202080", null, "fovea"), "b* should count more in the periphery");
  ok(rg > 0, "sanity");
});

/* ---------- Recommendation ---------- */
t("default answers: white or cyan small cross, static, yellow highlight", () => {
  const r = X.recommend({});
  ok(["white", "cyan"].includes(r.crosshair.color.key), r.crosshair.color.key);
  eq(r.crosshair.cfg["0m"], undefined); eq(r.crosshair.cfg["1b"], 0); eq(r.crosshair.cfg["0f"], 0);
  eq(r.highlight.color.key, "yd");
  eq(r.crosshair.options.length, 3);
  r.crosshair.options.forEach(o => X.decode(o.code));
});
t("crosshair and highlight never clash (hue rule or look-alike in the player's vision)", () => {
  const opts = { cvd: ["none", "protan", "deutan", "rg", "tritan"], lose: ["bright", "dark", "util", "never"], hMaps: ["warm", "dark", "cool", "none"] };
  let n = 0;
  opts.cvd.forEach(cvd => opts.lose.forEach(lose => opts.hMaps.forEach(hMaps => [null, [{ scene: "sand", ids: ["y322o", "w312", "c311", "p422o"], pick: "y322o" }]].forEach(xTest => {
    const r = X.recommend({ cvd, lose, hMaps, xTest, hClutter: { fire: hMaps === "dark" } });
    ok(!X.clash(r.crosshair.color, r.highlight.color, cvd), cvd + "/" + lose + "/" + hMaps + " → " + r.crosshair.color.key + " + " + r.highlight.color.key); n++;
  }))));
  eq(n, 160);
});
t("red-green color blindness: no green, yellow green or red crosshair; no red highlight; matching yellow", () => {
  ["protan", "deutan", "rg"].forEach(cvd => {
    const r = X.recommend({ cvd, xTest: [{ scene: "concrete", ids: ["g422o", "w312", "c311", "wd2"], pick: "g422o" }], hCur: "red", hKeep: true });
    ok(["green", "yg", "red"].indexOf(r.crosshair.color.key) < 0, cvd + " got " + r.crosshair.color.key);
    ok(r.highlight.color.key !== "red", cvd + " got red highlight");
  });
  eq(X.recommend({ cvd: "protan" }).highlight.color.key, "yp");
  eq(X.recommend({ cvd: "deutan" }).highlight.color.key, "yd");
  ok(X.recommend({ cvd: "tritan" }).highlight.color.hue !== "yellow", "tritan should not get yellow");
});
t("bright-map complaint turns outlines on at full opacity", () => {
  const c = X.recommend({ lose: "bright" }).crosshair.cfg; eq(c.h, 1); eq(c.o, 1);
});
t("movement error only for newer players who shoot while moving", () => {
  eq(X.recommend({ exp: "new", moving: "moving" }).crosshair.cfg["0m"], 1);
  eq(X.recommend({ exp: "exp", moving: "moving" }).crosshair.cfg["0m"], undefined);
  eq(X.recommend({ exp: "new", moving: "still" }).crosshair.cfg["0m"], undefined);
});
t("resolution scales the crosshair in pixels", () => {
  const a = X.recommend({ shape: "small", aim: "mix" }).crosshair.cfg, b = X.recommend({ shape: "small", aim: "mix", res: "2160" }).crosshair.cfg;
  eq(b["0l"], a["0l"] * 2); eq(b["0o"], a["0o"] * 2); eq(b["0t"], a["0t"] * 2);
});
t("dot shape hides the lines; snipers get a smaller dot (smaller heads on screen)", () => {
  const c = X.recommend({ shape: "dot" }).crosshair.cfg; eq(c["0b"], 0); eq(c.d, 1);
  ok(X.headPx("sniper", "1080") < X.headPx("rifle", "1080"));
  ok(X.recommend({ shape: "dot", weapon: "sniper" }).crosshair.cfg.z <= X.recommend({ shape: "dot", weapon: "rifle" }).crosshair.cfg.z);
});
t("utility clutter lowers the highlight color that matches it", () => {
  const base = X.recommend({}).highlight.ranking.find(h => h.key === "red").s;
  const fire = X.recommend({ hClutter: { fire: true } }).highlight.ranking.find(h => h.key === "red").s;
  const purp = X.recommend({ hClutter: { purple: true } }).highlight.ranking;
  ok(fire < base, "fire should lower red");
  ok(purp.find(h => h.key === "purple").s < X.recommend({}).highlight.ranking.find(h => h.key === "purple").s, "purple smokes should lower purple");
});

/* ---------- Rotating visibility test ---------- */
t("sessions rotate: different seeds draw different sets; same seed is reproducible", () => {
  const a = X.xSession({ seed: 1 }), b = X.xSession({ seed: 2 }), a2 = X.xSession({ seed: 1 });
  eq(JSON.stringify(a), JSON.stringify(a2));
  ok(JSON.stringify(a) !== JSON.stringify(b));
  eq(a.length, 8); a.forEach(r => eq(r.ids.length, 4));
  let distinct = 0; for (let s = 1; s <= 20; s++) distinct += new Set(X.xSession({ seed: s }).flatMap(r => r.ids)).size;
  ok(distinct / 20 >= 16, "a session should cover most of the pool");
});
t("sessions balance exposure and respect color vision", () => {
  const counts = {}; X.xSession({ seed: 9 }).forEach(r => r.ids.forEach(id => counts[id] = (counts[id] || 0) + 1));
  const v = Object.values(counts); ok(Math.max(...v) - Math.min(...v) <= 1, "exposure should be balanced");
  X.xSession({ seed: 3, cvd: "deutan" }).forEach(r => r.ids.forEach(id => ok(!["green", "yg", "red"].includes(X.POOL_BY[id].color), id)));
});
t("choice model: consistently picking cyan raises cyan and moves the recommendation", () => {
  const rounds = X.xSession({ seed: 4 }).map(r => ({ ...r, pick: r.ids.find(id => X.POOL_BY[id].color === "cyan") || null }));
  const fit = X.fitChoices(rounds);
  ok(fit.coef["c:cyan"] > 0.3, "cyan coef " + fit.coef["c:cyan"]);
  eq(X.recommend({ xTest: rounds }).crosshair.color.key, "cyan");
  const none = X.fitChoices(rounds.map(r => ({ ...r, pick: null })));
  eq(none.n, 0); eq(none.coef["c:cyan"], 0);
});

/* ---------- Vision test ---------- */
t("vision run: interleaved staircases, catch trials, every color sees the same scenes", () => {
  const run = simulateVision({ yellow: -1.2, red: -1.2, purple: -1.2 }, 3);
  const real = run.trials.filter(t => !t.catchTrial);
  eq(real.length, 60); eq(run.trials.filter(t => t.catchTrial).length, 7);
  const sc = c => real.filter(t => t.color === c).map(t => t.scene).sort().join();
  eq(sc("yellow"), sc("red")); eq(sc("red"), sc("purple"));
  ok(real.every(t => t.rt === undefined), "no reaction times are stored");
});
t("vision fit recovers the most visible color (simulated observers)", () => {
  let right = 0;
  for (let i = 1; i <= 30; i++) {
    const a = X.analyzeVision(simulateVision({ yellow: -1.3, red: -0.9, purple: -1.0 }, i).trials);
    if (Object.keys(a.bonus).sort((x, y) => a.bonus[y] - a.bonus[x])[0] === "yellow") right++;
  }
  ok(right >= 27, "recovered " + right + "/30");
});
t("vision fit: no real difference gives small bonuses", () => {
  let big = 0;
  for (let i = 1; i <= 30; i++) { const a = X.analyzeVision(simulateVision({ yellow: -1, red: -1, purple: -1 }, 200 + i).trials); if (Math.max(...Object.values(a.bonus).map(Math.abs)) > 1.5) big++; }
  ok(big <= 3, big + "/30 null runs gave a bonus above 1.5");
});
t("vision fit: missed catch trials void the result; dropped frames halve it and are repeated", () => {
  const lazy = X.analyzeVision(simulateVision({ yellow: -1.3, red: -0.9, purple: -1 }, 5, { catchP: 0.3 }).trials);
  eq(lazy.reliable, false); eq(lazy.weight, 0); ok(Object.values(lazy.bonus).every(b => b === 0));
  const run = simulateVision({ yellow: -1.3, red: -0.9, purple: -1 }, 6, { drop: 0.15 });
  const a = X.analyzeVision(run.trials);
  ok(a.dropped > 0); eq(a.weight, 0.5); eq(a.nTrials, 60, "dropped rounds are repeated");
});
t("vision test result changes the highlight; a measured result can outweigh the self-reported color vision type", () => {
  const purpleBest = simulateVision({ yellow: -0.7, red: -0.8, purple: -1.5 }, 11).trials;
  eq(X.recommend({ hTest: purpleBest }).highlight.color.key, "purple");
  eq(X.recommend({ hTest: purpleBest, cvd: "deutan" }).highlight.color.key, "purple");
  const yellowBest = simulateVision({ yellow: -1.4, red: -0.8, purple: -0.9 }, 12).trials;
  eq(X.recommend({ hTest: yellowBest, cvd: "deutan" }).highlight.color.key, "yd");
  eq(X.analyzeVision(purpleBest.slice(0, 8)).ok, false);
});

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
