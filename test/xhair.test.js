// Unit tests for the crosshair + highlight model. Run: node test/xhair.test.js
const X = require("../xhair.js");
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log("ok   - " + name); } catch (e) { fail++; console.log("FAIL - " + name + ": " + e.message); } }
function eq(a, b, m) { if (a !== b) throw new Error((m || "") + " expected " + JSON.stringify(b) + ", got " + JSON.stringify(a)); }
function ok(c, m) { if (!c) throw new Error(m || "assertion failed"); }

t("decodes real pro codes", () => {
  const tenz = X.decode("0;s;1;P;c;5;o;0;f;0;0l;2;0v;2;0g;1;0o;1;0a;1;0f;0;1b;0");
  eq(tenz.c, 5); eq(tenz["0l"], 2); eq(tenz["0o"], 1); eq(tenz["1b"], 0); eq(tenz.f, 0);
  const aspas = X.decode("0;P;h;0;0l;4;0o;0;0a;1;0f;0;1b;0");
  eq(aspas.c, 0); eq(aspas.h, 0); eq(aspas["0l"], 4);
});
t("encode → decode round trip keeps every field", () => {
  const cfg = { c: 5, h: 1, t: 1, o: 0.5, d: 1, z: 3, a: 1, f: 0, "0b": 1, "0t": 2, "0l": 3, "0o": 2, "0a": 1, "0m": 1, "0f": 0, "1b": 0 };
  const back = X.decode(X.encode(cfg));
  Object.keys(cfg).forEach(k => eq(back[k], cfg[k], k));
});
t("default answers give the research default (cyan small cross, static, no outer lines)", () => {
  const r = X.recommend({});
  eq(r.crosshair.color.key, "cyan"); eq(r.crosshair.code, "0;P;c;5;h;0;f;0;0l;3;0o;2;0a;1;0f;0;1b;0");
  eq(r.highlight.color.key, "yd");
});
t("crosshair and highlight never share a hue", () => {
  const opts = { cvd: ["none", "protan", "deutan", "rg", "tritan"], lose: ["bright", "dark", "util", "never"], hMaps: ["warm", "dark", "cool", "none"] };
  let n = 0;
  opts.cvd.forEach(cvd => opts.lose.forEach(lose => opts.hMaps.forEach(hMaps => [{}, { yellow: 3 }, { pink: 3 }].forEach(visWins => {
    const r = X.recommend({ cvd, lose, hMaps, visWins, hClutter: { fire: hMaps === "dark" } });
    ok(!X.clash(r.crosshair.color, r.highlight.color), cvd + "/" + lose + "/" + hMaps + " → " + r.crosshair.color.key + " + " + r.highlight.color.key); n++;
  }))));
  ok(n === 240);
});
t("red-green colour blindness excludes green, yellow green and red crosshairs and the red highlight", () => {
  ["protan", "deutan", "rg"].forEach(cvd => {
    const r = X.recommend({ cvd, visWins: { green: 3 }, hCur: "red", hKeep: true });
    ok(["green", "yg", "red"].indexOf(r.crosshair.color.key) < 0, cvd + " got " + r.crosshair.color.key);
    ok(r.highlight.color.key !== "red", cvd + " got red highlight");
  });
  eq(X.recommend({ cvd: "protan" }).highlight.color.key, "yp");
  eq(X.recommend({ cvd: "deutan" }).highlight.color.key, "yd");
  eq(X.recommend({ cvd: "tritan" }).highlight.color.key, "purple");
});
t("visibility picks move the crosshair colour", () => {
  eq(X.recommend({ visWins: { white: 2 } }).crosshair.color.key, "white");
  eq(X.recommend({ visWins: { green: 3 } }).crosshair.color.key, "green");
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
t("dot shape hides the lines and shows the dot", () => {
  const c = X.recommend({ shape: "dot" }).crosshair.cfg; eq(c["0b"], 0); eq(c.d, 1);
});
t("detection test: the clearly faster colour wins unless colour vision overrides", () => {
  const fastPurple = { yellow: { rt: 0.62, hit: 4, n: 6 }, red: { rt: 0.6, hit: 4, n: 6 }, purple: { rt: 0.42, hit: 6, n: 6 } };
  eq(X.recommend({ hTest: fastPurple }).highlight.color.key, "purple");
  eq(X.recommend({ hTest: fastPurple, cvd: "deutan" }).highlight.color.key, "yd");
});
t("utility clutter lowers the matching highlight", () => {
  const r = X.recommend({ hCur: "red", hKeep: true, hClutter: { fire: true } });
  const red = r.highlight.ranking.find(h => h.key === "red"), base = X.recommend({ hCur: "red", hKeep: true }).highlight.ranking.find(h => h.key === "red");
  ok(red.s < base.s);
});
console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
