/*
 * valoSens crosshair + enemy highlight model (v3.0). Works in the browser (window.ValoXhair) and in Node.
 * Evidence and sources: research/crosshair_research.md, research/highlight_color_research.md,
 * research/vision_test_method.md.
 *
 * What changed in 3.0
 *  - Color scores are computed, not hand-set: every crosshair and highlight color is compared with the
 *    surface colors of eight map/utility scenes in CIELAB, after simulating the player's color vision
 *    (Machado, Oliveira & Fernandes 2009). Crosshair lines are thin and foveal, so luminance contrast
 *    dominates (Mullen 1985). Highlights are first seen in the periphery, where red-green contrast fades
 *    fastest (Mullen & Kingdom 2002; Hansen et al. 2009), so the red-green axis is down-weighted.
 *  - The visibility test draws a fresh random subset from an 18-crosshair pool on every load, shows 4 at a
 *    time in random slots over random scenes, and is scored with a ridge-regularised conditional logit
 *    (Luce choice / Plackett-Luce; Bradley & Terry 1952; Hunter 2004). Random incomplete blocks are fine
 *    for this kind of ranking (Hajek, Oh & Xu 2014).
 *  - The highlight test is a vision test, not a reaction test: a masked, fixed-length flash, four-way
 *    forced-choice localisation with no time limit, and interleaved weighted up-down staircases on outline
 *    opacity (Kaernbach 1991), fitted by maximum likelihood (Wichmann & Hill 2001). Response time is never
 *    recorded. Catch trials and frame-timing checks flag unreliable runs.
 */
(function (root) {
  "use strict";

  /* ======================================================================
   * Palettes
   * ====================================================================== */
  var XCOLORS = [
    { i: 0, key: "white", name: "White", hex: "#FFFFFF", hue: "white" },
    { i: 1, key: "green", name: "Green", hex: "#00FF00", hue: "green" },
    { i: 2, key: "yg", name: "Yellow Green", hex: "#7FFF00", hue: "green" },
    { i: 3, key: "gy", name: "Green Yellow", hex: "#DFFF00", hue: "yellow" },
    { i: 4, key: "yellow", name: "Yellow", hex: "#FFFF00", hue: "yellow" },
    { i: 5, key: "cyan", name: "Cyan", hex: "#00FFFF", hue: "cyan" },
    { i: 6, key: "pink", name: "Pink", hex: "#FF00FF", hue: "purple" },
    { i: 7, key: "red", name: "Red", hex: "#FF0000", hue: "red" }
  ];
  var XC = {}; XCOLORS.forEach(function (c) { XC[c.key] = c; });

  // Enemy highlight options. Riot publishes no values; these are the community-posted ones [unverified],
  // which give both yellows the same RGB. The test treats them as one hue ("yellow").
  var HCOLORS = [
    { key: "yd", name: "Yellow (Deuteranopia)", short: "Yellow", hex: "#FFFF00", hue: "yellow", test: "yellow" },
    { key: "yp", name: "Yellow (Protanopia)", short: "Yellow", hex: "#FFFF00", hue: "yellow", test: "yellow" },
    { key: "red", name: "Red (Default)", short: "Red", hex: "#FF0000", hue: "red", test: "red" },
    { key: "purple", name: "Purple (Tritanopia)", short: "Purple", hex: "#A907E4", hue: "purple", test: "purple" }
  ];
  var HC = {}; HCOLORS.forEach(function (c) { HC[c.key] = c; });
  var TEST_HEX = { yellow: "#FFFF00", red: "#FF0000", purple: "#A907E4" };

  // Pro usage: own ProSettings scrape (2026-11-01; 91 codes, 58 highlight values), cross-checked with the
  // Valorant-Spind database (246 VCT codes, Sep/Oct 2026: white 58%, cyan 21%, dot-only 28%, outlines 52%).
  var PRO = {
    xColor: { white: 0.58, cyan: 0.19, green: 0.11, other: 0.12 },
    xShape: { cross: 0.57, dot: 0.26, crossDot: 0.11, outer: 0.05 },
    outlines: 0.59, errorLines: 0.01, medianLength: 3, typicalGap: "0–2", typicalThickness: 2, nCross: 91, nSpind: 246,
    highlight: { yellow: 0.71, red: 0.22, purple: 0.07 }, nHighlight: 58
  };

  /* ======================================================================
   * Scenes: representative surface colors of map areas and utility (sRGB, sampled by eye from
   * screenshots; ESTIMATES). The UI paints the test backgrounds from the same values.
   * ====================================================================== */
  var SCENES = {
    sand:     { name: "Bright sand",    maps: "Breeze, Bind, Sunset", base: [200, 180, 140], blocks: [[226, 210, 172], [176, 152, 112]], noise: 26 },
    concrete: { name: "Concrete",       maps: "Ascent, Haven, Split", base: [125, 130, 136], blocks: [[150, 154, 158], [96, 100, 108]], noise: 20 },
    shadow:   { name: "Shadow",         maps: "interiors, Abyss, Lotus", base: [31, 42, 54], blocks: [[44, 58, 72], [20, 28, 38]], noise: 12 },
    ice:      { name: "Cool blue",      maps: "Icebox, Pearl", base: [128, 158, 186], blocks: [[178, 204, 226], [78, 106, 136]], noise: 16 },
    foliage:  { name: "Foliage",        maps: "Lotus, Breeze greenery", base: [72, 96, 62], blocks: [[104, 132, 82], [44, 60, 40]], noise: 18 },
    smoke:    { name: "Purple utility", maps: "Omen, Reyna, Astra, Clove", base: [70, 58, 92], blocks: [[122, 72, 162], [52, 38, 80]], noise: 14, blobs: true },
    fire:     { name: "Fire utility",   maps: "Phoenix, Brimstone, Breach", base: [86, 62, 50], blocks: [[222, 122, 44], [164, 66, 34]], noise: 16, blobs: true },
    yutil:    { name: "Yellow utility", maps: "Killjoy, Raze, Gekko, Tejo", base: [84, 80, 66], blocks: [[230, 204, 64], [176, 150, 44]], noise: 16, blobs: true }
  };
  var SCENE_KEYS = Object.keys(SCENES);

  /* ======================================================================
   * Color science
   * ====================================================================== */
  function hexRgb(hex) { var n = parseInt(String(hex).replace("#", "").slice(0, 6), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function toLin(v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  function linRgb(c) { return (typeof c === "string" ? hexRgb(c) : c).map(toLin); }
  function lum(c) { var l = linRgb(c); return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]; }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }

  // Machado, Oliveira & Fernandes 2009 (IEEE TVCG 15:1291), severity 1.0, applied in linear RGB (DaltonLens).
  var CVD_M = {
    protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
    deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
    tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]]
  };
  function cvdType(cvd) { return cvd === "rg" ? "deutan" : CVD_M[cvd] ? cvd : null; }
  function simLin(lin, cvd) {
    var m = CVD_M[cvdType(cvd)]; if (!m) return lin;
    return m.map(function (r) { return Math.max(0, Math.min(1, r[0] * lin[0] + r[1] * lin[1] + r[2] * lin[2])); });
  }
  function simHex(c, cvd) {
    var l = simLin(linRgb(c), cvd);
    return "#" + l.map(function (v) { var s = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; return ("0" + Math.round(s * 255).toString(16)).slice(-2); }).join("").toUpperCase();
  }
  function labLin(l) {
    var X = (0.4124 * l[0] + 0.3576 * l[1] + 0.1805 * l[2]) / 0.95047, Y = 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2], Z = (0.0193 * l[0] + 0.1192 * l[1] + 0.9505 * l[2]) / 1.08883;
    function f(t) { return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; }
    return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
  }
  function lab(c, cvd) { return labLin(simLin(linRgb(c), cvd)); }
  // Weighted color difference. Foveal thin lines: chroma counts a quarter (1–2 px lines are near the ~11 c/deg
  // resolution limit of isoluminant color, vs ~60 c/deg for luminance; Mullen 1985).
  // Periphery: red-green (a*) counts 0.4, blue-yellow (b*) 0.9 (Mullen & Kingdom 2002; Hansen et al. 2009).
  var VIEW = { fovea: { a: 0.25, b: 0.25 }, periphery: { a: 0.4, b: 0.9 } };
  function dE(c1, c2, cvd, view) {
    var w = VIEW[view || "fovea"], p = lab(c1, cvd), q = lab(c2, cvd);
    return Math.sqrt(Math.pow(p[0] - q[0], 2) + Math.pow(w.a * (p[1] - q[1]), 2) + Math.pow(w.b * (p[2] - q[2]), 2));
  }
  function sat(d) { return 1 - Math.exp(-d / 50); }          // diminishing returns: 50 ΔE ≈ 63% of max

  /* ======================================================================
   * Visibility of a color across weighted scenes (blend of mean and worst case = maximin-leaning)
   * ====================================================================== */
  function sceneColors(k) { var s = SCENES[k]; return [s.base].concat(s.blocks); }
  function visIn(hex, k, cvd, view, outline) {
    var cs = sceneColors(k), v = 0;
    cs.forEach(function (bg) {
      var x = sat(dE(hex, bg, cvd, view));
      // A black outline adds a luminance edge against the scene (useful where the color itself washes out).
      if (outline) x = Math.max(x, 0.85 * outline * sat(dE("#000000", bg, cvd, view)));
      v += x;
    });
    return v / cs.length;
  }
  function visAgg(hex, weights, cvd, view, outline) {
    var tot = 0, sum = 0, worst = 1, per = {};
    Object.keys(weights).forEach(function (k) {
      if (!weights[k]) return;
      var v = visIn(hex, k, cvd, view, outline); per[k] = v;
      sum += weights[k] * v; tot += weights[k]; worst = Math.min(worst, v);
    });
    return { score: 0.6 * sum / tot + 0.4 * worst, mean: sum / tot, worst: worst, per: per };
  }

  /* ======================================================================
   * Crosshair code
   * ====================================================================== */
  var DEF = { c: 0, h: 1, t: 1, o: 0.5, d: 0, z: 2, a: 1, f: 1, "0b": 1, "0t": 2, "0l": 6, "0v": 6, "0g": 0, "0o": 3, "0a": 0.8, "0m": 0, "0s": 1, "0f": 1, "0e": 1, "1b": 1 };
  var ORDER = ["c", "h", "t", "o", "d", "z", "a", "f", "0b", "0t", "0l", "0v", "0g", "0o", "0a", "0m", "0s", "0f", "0e", "1b"];
  function fmt(v) { return typeof v === "number" ? String(Math.round(v * 1000) / 1000) : String(v); }
  function encode(x) {
    var out = ["0", "P"];
    ORDER.forEach(function (k) {
      if (x[k] === undefined || x[k] === DEF[k]) return;
      if (k === "0v" && !x["0g"]) return;
      out.push(k, fmt(x[k]));
    });
    return out.join(";");
  }
  function decode(code) {
    var p = String(code).trim().split(";"), x = Object.assign({}, DEF), sec = null;
    if (p[0] !== "0") throw new Error("Crosshair codes start with 0");
    for (var i = 1; i < p.length; i++) {
      if (p[i] === "P" || p[i] === "A" || p[i] === "S") { sec = p[i]; continue; }
      var k = p[i], v = p[++i];
      if (v === undefined) throw new Error("Missing value for " + k);
      if (sec === "P") x[k] = /^[0-9.]+$/.test(v) ? parseFloat(v) : v;
    }
    if (!x["0g"]) x["0v"] = x["0l"];
    return x;
  }

  /* ======================================================================
   * Rotating crosshair pool (18 archetypes from pro data; 1080p values; error lines and outer lines off)
   * ====================================================================== */
  var POOL = [
    { id: "w422o", color: "white", shape: "cross", l: 4, t: 2, o: 2, ol: 1, note: "modal VCT pattern" },
    { id: "w312",  color: "white", shape: "cross", l: 3, t: 1, o: 2, ol: 0, note: "thin, minimal" },
    { id: "w220",  color: "white", shape: "cross", l: 2, t: 2, o: 0, ol: 0, note: "compact, no gap" },
    { id: "c422o", color: "cyan", shape: "cross", l: 4, t: 2, o: 2, ol: 1, note: "community visibility-test pick" },
    { id: "c311",  color: "cyan", shape: "cross", l: 3, t: 1, o: 1, ol: 0, note: "most cyan pros skip outlines" },
    { id: "c220",  color: "cyan", shape: "cross", l: 2, t: 2, o: 0, ol: 0, note: "compact" },
    { id: "g422o", color: "green", shape: "cross", l: 4, t: 2, o: 2, ol: 1, note: "" },
    { id: "g212",  color: "green", shape: "cross", l: 2, t: 1, o: 2, ol: 0, note: "" },
    { id: "y322o", color: "yellow", shape: "cross", l: 3, t: 2, o: 2, ol: 1, note: "" },
    { id: "p422o", color: "pink", shape: "cross", l: 4, t: 2, o: 2, ol: 1, note: "" },
    { id: "wd4o",  color: "white", shape: "dot", z: 4, ol: 1, note: "outlined dot" },
    { id: "cd2o",  color: "cyan", shape: "dot", z: 2, ol: 1, note: "" },
    { id: "wd2",   color: "white", shape: "dot", z: 2, ol: 0, note: "" },
    { id: "cx312d", color: "cyan", shape: "crossDot", l: 3, t: 1, o: 2, z: 2, ol: 1, note: "" },
    { id: "wv314o", color: "white", shape: "cross", l: 3, t: 1, o: 2, v: 4, ol: 1, note: "taller vertical lines" },
    { id: "r422o", color: "red", shape: "cross", l: 4, t: 2, o: 2, ol: 1, note: "low-luminance control" },
    { id: "wm112d", color: "white", shape: "micro", l: 1, t: 1, o: 2, z: 1, ol: 0, note: "micro cross + dot" },
    { id: "yg312", color: "yg", shape: "cross", l: 3, t: 1, o: 2, ol: 0, note: "" }
  ];
  var POOL_BY = {}; POOL.forEach(function (p) { POOL_BY[p.id] = p; });
  function poolCfg(p) {
    var x = { c: XC[p.color].i, h: p.ol ? 1 : 0, t: 1, o: 1, d: p.z ? 1 : 0, z: p.z || 2, a: 1, f: 0, "0f": 0, "1b": 0 };
    if (p.shape === "dot") x["0b"] = 0;
    else { x["0t"] = p.t; x["0l"] = p.l; x["0o"] = p.o; x["0a"] = 1; if (p.v) { x["0g"] = 1; x["0v"] = p.v; } }
    return x;
  }
  var RG = { protan: 1, deutan: 1, rg: 1 };
  function allowedColor(key, cvd) {
    if (RG[cvd] && (key === "green" || key === "yg" || key === "red")) return false;
    if (cvd === "tritan" && (key === "yellow" || key === "gy")) return false;
    return true;
  }
  // Seeded PRNG (mulberry32) so a session is reproducible from its seed.
  function rng(seed) {
    var a = (seed >>> 0) || 1;
    return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function shuffle(a, r) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  // A session of the visibility test: `rounds` trials of k crosshairs each, drawn from the eligible pool.
  // Exposure is balanced (least-shown first, random tie-breaks), colors within a round are kept distinct where
  // possible, slot order is random, and scenes cycle through a shuffled list.
  function xSession(opts) {
    opts = opts || {};
    var r = rng(opts.seed || 1), k = opts.k || 4, rounds = opts.rounds || 8, pref = opts.shape;
    var pool = POOL.filter(function (p) { return allowedColor(p.color, opts.cvd); });
    // Prior exposure from imported sessions (opts.seen) carries over, so a new session favors crosshairs not yet shown.
    var shown = {}, seen = opts.seen || {}; pool.forEach(function (p) { shown[p.id] = seen[p.id] > 0 ? Math.min(20, seen[p.id]) : 0; });
    var scenes = shuffle(["sand", "concrete", "shadow", "ice", "foliage", "smoke", "fire"], r), out = [];
    for (var i = 0; i < rounds; i++) {
      var order = shuffle(pool.slice(), r).sort(function (a, b) {
        var pa = pref && pref !== "any" && fam(a.shape) === fam(pref) ? -0.5 : 0, pb = pref && pref !== "any" && fam(b.shape) === fam(pref) ? -0.5 : 0;
        return (shown[a.id] + pa) - (shown[b.id] + pb);
      });
      var pick = [], cols = {}, least = shown[order[0].id];
      // Least-shown first; distinct colors among those, then fill in exposure order.
      order.forEach(function (p) { if (pick.length < k && shown[p.id] === least && !cols[p.color]) { pick.push(p); cols[p.color] = 1; } });
      order.forEach(function (p) { if (pick.length < k && pick.indexOf(p) < 0) pick.push(p); });
      pick.forEach(function (p) { shown[p.id]++; });
      out.push({ scene: scenes[i % scenes.length], ids: shuffle(pick.map(function (p) { return p.id; }), r) });
    }
    return out;
  }
  function fam(shape) { return shape === "small" || shape === "medium" || shape === "micro" ? "cross" : shape; }

  // Conditional logit (Luce choice) on crosshair attributes, ridge prior N(0, 1) on every coefficient.
  // A pick counts as "this one over the others shown"; "none stands out" rounds carry no information.
  var BRIGHT = { sand: 1, ice: 1 };
  function featNames() {
    var f = XCOLORS.map(function (c) { return "c:" + c.key; });
    return f.concat(["outline", "outline×bright", "s:cross", "s:dot", "s:crossDot", "s:micro", "thin"]);
  }
  function feats(p, scene) {
    var v = XCOLORS.map(function (c) { return c.key === p.color ? 1 : 0; });
    v.push(p.ol ? 1 : 0, p.ol && BRIGHT[scene] ? 1 : 0);
    ["cross", "dot", "crossDot", "micro"].forEach(function (s) { v.push(p.shape === s ? 1 : 0); });
    v.push(p.t === 1 ? 1 : 0);
    return v;
  }
  function fitChoices(rounds) {
    var names = featNames(), n = names.length, b = new Array(n).fill(0), used = (rounds || []).filter(function (r) { return r && r.pick && r.ids && r.ids.indexOf(r.pick) >= 0; });
    var stats = {};
    POOL.forEach(function (p) { stats[p.id] = { shown: 0, wins: 0 }; });
    (rounds || []).forEach(function (r) { if (!r || !r.ids) return; r.ids.forEach(function (id) { if (stats[id]) stats[id].shown++; }); if (r.pick && stats[r.pick]) stats[r.pick].wins++; });
    if (used.length) {
      for (var it = 0; it < 30; it++) {
        var g = b.map(function (x) { return -x; }), H = [];
        for (var i = 0; i < n; i++) { H.push(new Array(n).fill(0)); H[i][i] = -1; }
        used.forEach(function (r) {
          var X = r.ids.map(function (id) { return feats(POOL_BY[id], r.scene); });
          var u = X.map(function (x) { return x.reduce(function (s, v, j) { return s + v * b[j]; }, 0); });
          var m = Math.max.apply(null, u), e = u.map(function (x) { return Math.exp(x - m); }), Z = e.reduce(function (s, x) { return s + x; }, 0);
          var pr = e.map(function (x) { return x / Z; }), xbar = new Array(n).fill(0);
          X.forEach(function (x, a) { for (var j = 0; j < n; j++) xbar[j] += pr[a] * x[j]; });
          var xc = X[r.ids.indexOf(r.pick)];
          for (var j = 0; j < n; j++) g[j] += xc[j] - xbar[j];
          X.forEach(function (x, a) { for (var p = 0; p < n; p++) for (var q = 0; q < n; q++) H[p][q] -= pr[a] * (x[p] - xbar[p]) * (x[q] - xbar[q]); });
        });
        var step = solve(H.map(function (row) { return row.map(function (v) { return -v; }); }), g);
        if (!step) break;
        var mx = 0; for (var j2 = 0; j2 < n; j2++) { b[j2] += step[j2]; mx = Math.max(mx, Math.abs(step[j2])); }
        if (mx < 1e-7) break;
      }
    }
    var coef = {}; names.forEach(function (nm, j) { coef[nm] = b[j]; });
    var util = {}; POOL.forEach(function (p) { util[p.id] = feats(p, "concrete").reduce(function (s, v, j) { return s + v * b[j]; }, 0); });
    var fav = null;
    POOL.forEach(function (p) { if (stats[p.id].shown && (!fav || util[p.id] > util[fav])) fav = p.id; });
    return { n: used.length, rounds: (rounds || []).length, coef: coef, util: util, stats: stats, favorite: used.length ? fav : null };
  }
  function solve(A, y) {
    var n = y.length, M = A.map(function (r, i) { return r.concat([y[i]]); });
    for (var c = 0; c < n; c++) {
      var p = c; for (var r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      var t = M[c]; M[c] = M[p]; M[p] = t; if (Math.abs(M[c][c]) < 1e-12) return null;
      for (var r2 = c + 1; r2 < n; r2++) { var f = M[r2][c] / M[c][c]; for (var k = c; k <= n; k++) M[r2][k] -= f * M[c][k]; }
    }
    var x = new Array(n);
    for (var i = n - 1; i >= 0; i--) { var s = M[i][n]; for (var j = i + 1; j < n; j++) s -= M[i][j] * x[j]; x[i] = s / M[i][i]; }
    return x;
  }

  /* ======================================================================
   * Vision test for the enemy highlight (pure logic; the page only draws and collects answers)
   *
   * Trial: fixation (500–900 ms) → four identical dark figures, one with the highlight outline at opacity
   * alpha, shown for a fixed whole number of frames (~58 ms) → 350 ms mask of outline fragments in all three
   * colors → the player says where the highlighted figure was (1–4), with no time limit.
   * Each color has its own QUEST+ posterior over (threshold, slope) on log10(alpha) (Watson 2017): the next
   * strength is the one that minimises the expected posterior entropy. Colors are interleaved, and every
   * color sees the same scene sequence. About one trial in nine is a catch trial at full opacity and 4× the
   * exposure: missing more than one of those marks the run as unreliable. Trials with a dropped frame are
   * repeated, not scored.
   * ====================================================================== */
  var VT = { colors: ["yellow", "red", "purple"], perColor: 16, catchN: 7, exposureMs: 58, maskMs: 350, x0: -0.5,
    down: 0.05, up: 0.15, downEarly: 0.1, upEarly: 0.3, xMin: -2, xMax: 0, gamma: 0.25, lapse: 0.03, tau: 0.25 };

  // QUEST+ (Watson 2017, J Vis 17(3):10). State: posterior over a (threshold, slope) grid; the psychometric
  // function is the one analyzeVision fits: p = γ + (1 − γ − λ) / (1 + exp(−s (x − α))), x = log10 opacity.
  var Q_TH = [], Q_X = []; for (var qi = 0; qi <= 50; qi++) { Q_TH.push(-2.5 + 0.05 * qi); Q_X.push(-2.5 + 0.05 * qi); }
  var Q_LIK = {};
  function qLik(g, lam) {
    var key = g + "/" + lam; if (Q_LIK[key]) return Q_LIK[key];
    var ns = S_GRID.length, t = new Array(Q_X.length * Q_TH.length * ns);
    for (var xi = 0; xi < Q_X.length; xi++) for (var ti = 0; ti < Q_TH.length; ti++) for (var si = 0; si < ns; si++)
      t[(xi * Q_TH.length + ti) * ns + si] = g + (1 - g - lam) / (1 + Math.exp(-S_GRID[si] * (Q_X[xi] - Q_TH[ti])));
    return (Q_LIK[key] = t);
  }
  function qCreate(center, sd, g, lam) {
    var ns = S_GRID.length, post = new Array(Q_TH.length * ns), z = 0;
    for (var ti = 0; ti < Q_TH.length; ti++) { var w = Math.exp(-0.5 * Math.pow((Q_TH[ti] - center) / sd, 2)); for (var si = 0; si < ns; si++) { post[ti * ns + si] = w; z += w; } }
    for (var i = 0; i < post.length; i++) post[i] /= z;
    return { post: post, lik: qLik(g, lam) };
  }
  // xi = index into the stimulus grid Q_X (−2.5 … 0, step 0.05).
  function qUpdate(q, xi, correct) {
    var n = q.post.length, base = xi * n, z = 0;
    for (var i = 0; i < n; i++) { var p = q.lik[base + i]; q.post[i] *= correct ? p : 1 - p; z += q.post[i]; }
    if (z > 0) for (var j = 0; j < n; j++) q.post[j] /= z;
  }
  // Index of the stimulus with the lowest expected posterior entropy (first one wins ties).
  function qNext(q) {
    var n = q.post.length, best = 0, bestH = Infinity;
    for (var xi = 0; xi < Q_X.length; xi++) {
      var base = xi * n, pc = 0;
      for (var i = 0; i < n; i++) pc += q.post[i] * q.lik[base + i];
      var hc = 0, hw = 0;
      for (var k = 0; k < n; k++) {
        var p = q.lik[base + k], a = q.post[k] * p, b = q.post[k] * (1 - p);
        if (pc > 0 && a > 0) hc -= a * Math.log(a / pc);
        if (pc < 1 && b > 0) hw -= b * Math.log(b / (1 - pc));
      }
      var H = hc + hw;
      if (H < bestH - 1e-12) { bestH = H; best = xi; }
    }
    return best;
  }
  function qMean(q) {
    var ns = S_GRID.length, m = 0, m2 = 0;
    for (var i = 0; i < q.post.length; i++) { var th = Q_TH[Math.floor(i / ns)]; m += q.post[i] * th; m2 += q.post[i] * th * th; }
    return { mean: m, sd: Math.sqrt(Math.max(0, m2 - m * m)) };
  }

  function visionRun(opts) {
    opts = Object.assign({}, VT, opts || {});
    var r = rng(opts.seed || 7), scenes = shuffle(["sand", "concrete", "shadow", "ice", "foliage", "smoke", "fire", "yutil"], r);
    var queue = [];
    opts.colors.forEach(function (c) { for (var i = 0; i < opts.perColor; i++) queue.push({ color: c, k: i }); });
    shuffle(queue, r);
    for (var j = 0; j < opts.catchN; j++) {
      var at = Math.floor((j + 0.5) * queue.length / opts.catchN);
      queue.splice(at + j, 0, { color: opts.colors[j % opts.colors.length], k: -1, catchTrial: true });
    }
    // opts.start: per-color prior centre (log10 opacity), e.g. from an imported session's thresholds.
    var st = {}; opts.colors.forEach(function (c) {
      var ctr = opts.start && isFinite(opts.start[c]) ? Math.max(Q_TH[0], Math.min(Q_TH[Q_TH.length - 1], opts.start[c])) : opts.x0;
      st[c] = { q: qCreate(ctr, opts.priorSd || 0.5, opts.gamma, opts.lapse), n: 0 };
    });
    var trials = [], pos = 0;
    function nextTrial() {
      if (pos >= queue.length) return null;
      var q = queue[pos], s = st[q.color];
      if (!q.catchTrial) s.xi = qNext(s.q);
      return { idx: pos, color: q.color, hex: TEST_HEX[q.color], catchTrial: !!q.catchTrial,
        x: q.catchTrial ? 0 : Q_X[s.xi], alpha: q.catchTrial ? 1 : Math.pow(10, Q_X[s.xi]), exposureMs: opts.exposureMs * (q.catchTrial ? 4 : 1),
        scene: q.catchTrial ? scenes[Math.floor(r() * scenes.length)] : scenes[q.k % scenes.length],
        target: Math.floor(r() * 4), seed: Math.floor(r() * 1e9) };
    }
    function record(t, res) {
      if (pos >= queue.length || t.idx !== pos) return;
      if (res.dropped) { queue.push(queue[pos]); pos++; trials.push(Object.assign({}, t, { dropped: true })); return; }
      var correct = res.answer === t.target;
      trials.push(Object.assign({}, t, { answer: res.answer, correct: correct, shownMs: res.shownMs }));
      if (!t.catchTrial) {
        var s = st[t.color], xi = Math.max(0, Math.min(Q_X.length - 1, Math.round((t.x - Q_X[0]) / 0.05)));
        qUpdate(s.q, xi, correct); s.n++;
      }
      pos++;
    }
    return { opts: opts, nextTrial: nextTrial, record: record, trials: trials, total: function () { return queue.length; }, done: function () { return pos >= queue.length; },
      progress: function () { return pos / queue.length; }, scored: function () { return trials.filter(function (t) { return !t.dropped; }).length; } };
  }

  // Maximum-likelihood fit: p(correct) = γ + (1 − γ − λ) / (1 + exp(−s (x − α_c))), α per color, slope s shared.
  var S_GRID = [3, 4.5, 6, 8, 11, 15, 20], S_PRIOR = [-1.2, -0.5, -0.1, 0, -0.1, -0.5, -1.2];
  function analyzeVision(trials, opts) {
    opts = Object.assign({}, VT, opts || {});
    if (!trials || !trials.length) return null;
    var g = opts.gamma, lam = opts.lapse, colors = opts.colors;
    var real = trials.filter(function (t) { return !t.dropped && !t.catchTrial && typeof t.correct === "boolean"; });
    var catches = trials.filter(function (t) { return !t.dropped && t.catchTrial; });
    var dropped = trials.filter(function (t) { return t.dropped; }).length;
    var by = {}; colors.forEach(function (c) { by[c] = real.filter(function (t) { return t.color === c; }); });
    if (colors.some(function (c) { return by[c].length < 6; })) return { ok: false, reason: "Too few trials per color.", nTrials: real.length };
    var aGrid = []; for (var a = -2.6; a <= 0.6 + 1e-9; a += 0.01) aGrid.push(a);
    function ll(rows, al, s) { var L = 0; rows.forEach(function (t) { var p = g + (1 - g - lam) / (1 + Math.exp(-s * (t.x - al))); L += t.correct ? Math.log(p) : Math.log(1 - p); }); return L; }
    var best = null;
    S_GRID.forEach(function (s, si) {
      var tot = S_PRIOR[si], fit = {};
      colors.forEach(function (c) {
        var prof = aGrid.map(function (al) { return ll(by[c], al, s); }), mi = 0;
        for (var i = 1; i < prof.length; i++) if (prof[i] > prof[mi]) mi = i;
        fit[c] = { prof: prof, mi: mi }; tot += prof[mi];
      });
      if (!best || tot > best.tot) best = { tot: tot, s: s, fit: fit };
    });
    var F75 = (0.75 - g) / (1 - g - lam), off = Math.log(F75 / (1 - F75)) / best.s, res = {};
    colors.forEach(function (c) {
      var f = best.fit[c], mx = f.prof[f.mi], lo = f.mi, hi = f.mi;
      while (lo > 0 && f.prof[lo - 1] > mx - 0.5) lo--;
      while (hi < aGrid.length - 1 && f.prof[hi + 1] > mx - 0.5) hi++;
      var x75 = aGrid[f.mi] + off, se = Math.max(0.03, (aGrid[hi] - aGrid[lo]) / 2);
      var atEdge = f.mi === 0 || f.mi === aGrid.length - 1;
      var pc = by[c].filter(function (t) { return t.correct; }).length / by[c].length;
      res[c] = { x75: x75, alpha75: Math.pow(10, x75), se: se, n: by[c].length, pc: pc, atEdge: atEdge,
        bySceneCorrect: scenePc(by[c]) };
    });
    var mean = colors.reduce(function (s, c) { return s + res[c].x75; }, 0) / colors.length;
    var catchPc = catches.length ? catches.filter(function (t) { return t.correct; }).length / catches.length : null;
    var timingBad = dropped > 0.05 * (trials.length || 1);
    var lapses = catchPc !== null && catches.length >= 4 && catchPc < 0.85;
    var weight = lapses ? 0 : timingBad ? 0.5 : 1, bonus = {};
    colors.forEach(function (c) {
      var d = res[c].x75 - mean, shr = d * opts.tau * opts.tau / (opts.tau * opts.tau + res[c].se * res[c].se);
      res[c].diff = d; res[c].shrunk = shr;
      bonus[c] = weight * Math.max(-2.5, Math.min(2.5, -6 * shr));
    });
    var flags = [];
    if (lapses) flags.push("You missed " + catches.filter(function (t) { return !t.correct; }).length + " of " + catches.length + " easy check rounds, so the test result isn't used.");
    if (timingBad) flags.push("Your browser dropped frames on " + dropped + " rounds, so the result counts half.");
    colors.forEach(function (c) { if (res[c].atEdge) flags.push(c[0].toUpperCase() + c.slice(1) + "'s threshold hit the edge of the tested range."); });
    return { ok: true, slope: best.s, colors: res, bonus: bonus, weight: weight, catchPc: catchPc, nCatch: catches.length, dropped: dropped,
      nTrials: real.length, flags: flags, reliable: !lapses };
  }
  function scenePc(rows) {
    var o = {}; rows.forEach(function (t) { (o[t.scene] = o[t.scene] || { n: 0, c: 0 }); o[t.scene].n++; if (t.correct) o[t.scene].c++; }); return o;
  }

  /* ======================================================================
   * Inputs
   *  cvd: none|protan|deutan|rg|tritan|unsure;  aim: flick|track|mix;  shape: small|medium|dot|crossDot|any
   *  lose: bright|dark|util|never;  res: 1080|1440|2160|stretched;  exp: new|mid|exp|comp;  moving: still|moving|unsure
   *  weapon: rifle|sniper|close (from part 1, sets head size on screen)
   *  xTest: [{ scene, ids:[pool ids], pick: id|null }]   (visibility test rounds)
   *  hCur, hKeep, hMaps: warm|dark|cool|none, hClutter: { fire, purple, yellow }
   *  hTest: trials from visionRun()  (or an analyzeVision() result)
   * ====================================================================== */
  function xWeights(inp) {
    var w = { sand: 1, concrete: 1.5, shadow: 1, ice: 0.7, foliage: 0.7, smoke: 0.6, fire: 0.6 };
    if (inp.lose === "bright") { w.sand = 3; w.ice = 2; }
    if (inp.lose === "dark") { w.shadow = 3; }
    if (inp.lose === "util") { w.smoke = 2.5; w.fire = 2.5; }
    return w;
  }
  function hWeights(inp) {
    var w = { sand: 1, concrete: 1.5, shadow: 1, ice: 0.7, foliage: 0.7, smoke: 0.5, fire: 0.5, yutil: 0.4 };
    if (inp.hMaps === "warm") w.sand = 3;
    if (inp.hMaps === "dark") w.shadow = 3;
    if (inp.hMaps === "cool") w.ice = 3;
    var cl = inp.hClutter || {};
    if (cl.fire) w.fire = 2.5; if (cl.purple) w.smoke = 2.5; if (cl.yellow) w.yutil = 2;
    return w;
  }
  // Small priors: pro share and the GameGrids community test (cyan 4.8, pink 3.8, white 3.4 of 5) [unverified method].
  var X_PRIOR = { white: 1.0, cyan: 1.2, green: 0.4, yellow: 0.2, yg: 0, gy: -0.1, pink: 0.3, red: -0.6 };
  var H_PRIOR = { yd: 0.5, yp: 0.3, red: 0.2, purple: 0 };

  function scoreCross(inp, c, fit) {
    var why = [], cvd = inp.cvd;
    var v = visAgg(c.hex, xWeights(inp), cvd, "fovea", 0), s = 6 * v.score + X_PRIOR[c.key];
    if (!allowedColor(c.key, cvd)) { s -= 6; why.push(RG[cvd] ? "hard to tell apart with red-green color blindness" : "can merge with white for blue-yellow color blindness"); }
    if (fit && fit.n) {
      var u = fit.coef["c:" + c.key] || 0, b = Math.max(-2, Math.min(2, 1.2 * u));
      s += b; if (b >= 0.4) why.push("you picked it as easy to see in the visibility test"); else if (b <= -0.4) why.push("you passed it over in the visibility test");
    }
    return { s: s, vis: v, why: why };
  }
  function scoreHigh(inp, h, tb) {
    var why = [], cvd = inp.cvd, ct = cvdType(cvd);
    var v = visAgg(h.hex, hWeights(inp), cvd, "periphery", 0), s = 8 * v.score + H_PRIOR[h.key];
    var made = { yd: "deutan", yp: "protan", purple: "tritan" }[h.key];
    if (ct && made === ct) { s += 2; why.push("Riot made this option for " + ({ deutan: "deuteranopia", protan: "protanopia", tritan: "tritanopia" })[ct]); }
    if (h.key === "yp" && !ct) s -= 0.2;
    if (ct === "tritan" && h.key === "red") why.push("tritanopia leaves red-green vision intact, so red keeps its contrast for you");
    if (ct === "tritan" && h.hue === "yellow") why.push("yellow sits on the blue-yellow axis that tritanopia weakens");    // same color as Yellow (Deuteranopia); prefer the common label when no type applies
    if (inp.hKeep && inp.hCur === h.key) { s += 1.5; why.push("what you're used to"); }
    if (tb && tb.ok) {
      var b = tb.bonus[h.test];
      if (b !== undefined) { s += b; if (Math.abs(b) >= 0.4) why.push(b > 0 ? "you saw it at a lower strength in the vision test" : "you needed it stronger than the others in the vision test"); }
    }
    return { s: s, vis: v, why: why };
  }
  function clash(c, h, cvd) {
    if (h.hue === "yellow" && (c.hue === "yellow" || c.key === "yg")) return true;
    if (h.key === "red" && (c.key === "red" || c.key === "pink")) return true;
    if (h.key === "purple" && c.key === "pink") return true;
    return dE(c.hex, h.hex, cvd, "fovea") < 12;     // look alike in this player's color vision
  }

  /* ---------------- Geometry ---------------- */
  var HFOV = 103, HEAD_M = 0.25, RANGE = { rifle: 20, sniper: 30, close: 10 };
  var RES_W = { "1080": 1920, stretched: 1920, "1440": 2560, "2160": 3840 };
  function headPx(weapon, res) {
    var w = RES_W[res] || 1920, f = (w / 2) / Math.tan(HFOV / 2 * Math.PI / 180);
    return f * HEAD_M / (RANGE[weapon] || 20);
  }
  function geometry(inp, colorKey, outline, fit) {
    var aim = inp.aim || "mix", shape = inp.shape || "any", why = [];
    if (shape === "any") {
      shape = aim === "track" ? "medium" : "small";
      if (fit && fit.n) {
        var cs = fit.coef, alt = [["dot", cs["s:dot"]], ["crossDot", cs["s:crossDot"]]].sort(function (a, b) { return b[1] - a[1]; })[0];
        if (alt[1] - (cs["s:cross"] || 0) > 0.6) { shape = alt[0]; why.push("You preferred " + (alt[0] === "dot" ? "dots" : "cross + dot") + " in the visibility test, and you didn't name a shape, so it uses that."); }
      }
    }
    var g = { shape: shape, l: 3, t: 2, o: 2, dot: false, z: 2, lines: true };
    if (shape === "small") { g.l = aim === "flick" ? 2 : 3; g.o = 2;
      why.push("Small cross (" + g.l + " long, gap " + g.o + "): it marks a precise point without covering a distant head. Most pros use 2–4 long with a 0–2 gap."); }
    else if (shape === "medium") { g.l = aim === "flick" ? 4 : 5; g.o = 3;
      why.push("Slightly larger cross (" + g.l + " long, gap " + g.o + "): the lines stay visible around a moving target while you track or spray. No study has measured this; it's a heuristic."); }
    else if (shape === "dot") { g.lines = false; g.dot = true; g.z = 3;
      why.push("Center dot only: it hides the least of the scene. 26–28% of pros use one."); }
    else if (shape === "crossDot") { g.dot = true; g.z = 2; g.l = 2; g.o = 3;
      why.push("Small cross with a dot: the gap is 3 so the dot stays separate from the lines."); }
    // Head size on screen (1080p pixels) at your typical fight distance limits how much the crosshair may cover.
    var hp = headPx(inp.weapon, "1080");
    var zMax = Math.max(2, Math.round(0.35 * hp)), tMax = Math.max(1, Math.round(0.2 * hp));
    if (g.dot && g.z > zMax) { g.z = zMax; why.push("Dot size " + zMax + ": at " + (RANGE[inp.weapon] || 20) + " m a head is about " + Math.round(hp) + " px wide at 1080p, so a bigger dot would cover most of it."); }
    if (g.lines && g.t > tMax) { g.t = tMax; why.push("Line thickness " + tMax + ": thinner lines cover less of a head that's only about " + Math.round(hp) + " px wide at your fight distance."); }
    // Crowding: lines within a few arcminutes of the aim point interfere with a small target (Siderov et al. 2013),
    // so keep a gap of at least 2 when lines are 3+ long.
    if (g.lines && g.l >= 3 && g.o < 2) g.o = 2;
    var k = { "1080": 1, stretched: 1, "1440": 1.33, "2160": 2 }[inp.res] || 1;
    if (k !== 1) {
      g.l = Math.min(20, Math.round(g.l * k)); g.o = Math.min(20, Math.round(g.o * k)); g.t = Math.min(10, Math.round(g.t * k)); g.z = Math.min(6, Math.round(g.z * k));
      why.push("Scaled ×" + k + " for " + (inp.res === "2160" ? "4K" : "1440p") + ": crosshair values are in screen pixels, and heads get bigger in pixels at the same rate.");
    }
    if (inp.res === "stretched" && g.lines) { g.l = Math.max(1, g.l - 1); why.push("One shorter for 4:3 stretched, which widens horizontal lines."); }
    g.h = outline.on ? 1 : 0; g.ho = outline.opacity;
    why.push(outline.why);
    g.moveErr = (inp.exp === "new" || inp.exp === "mid") && inp.moving === "moving";
    if (g.moveErr) why.push("Movement error on, as a training aid: the lines spread while you move, a reminder to stop before you shoot. Turn it off once counter-strafing is automatic.");
    else why.push("Movement and firing error off: an expanding crosshair is a moving onset right where you look, and onsets grab attention (Abrams & Christ 2003). About 99% of pros turn them off.");
    return { g: g, why: why };
  }
  // Outline decision: compare the worst-case scene visibility with and without a black outline.
  function outlineFor(inp, c, fit, dot) {
    var w = xWeights(inp), plain = visAgg(c.hex, w, inp.cvd, "fovea", 0), withO = visAgg(c.hex, w, inp.cvd, "fovea", 1);
    var gain = withO.worst - plain.worst, u = fit && fit.n ? (fit.coef.outline || 0) + (inp.lose === "bright" ? (fit.coef["outline×bright"] || 0) : 0) : 0;
    var worstScene = Object.keys(plain.per).sort(function (a, b) { return plain.per[a] - plain.per[b]; })[0];
    if (inp.lose === "bright" || gain + 0.15 * u > 0.2) return { on: true, opacity: 1, gain: gain,
      why: "Outlines on at full opacity: " + c.name.toLowerCase() + " loses most contrast on " + SCENES[worstScene].name.toLowerCase() + ", and a black outline raises its worst-case visibility by " + Math.round(gain * 100) + " points." };
    if (gain + 0.15 * u > 0.08 || dot || u > 0.8) return { on: true, opacity: 0.5, gain: gain,
      why: "Outlines on at half opacity: a thin dark edge keeps " + c.name.toLowerCase() + " separate from " + SCENES[worstScene].name.toLowerCase() + " without making it look thicker. 52–59% of pros use one." };
    return { on: false, opacity: 0.5, gain: gain, why: "Outlines off: " + c.name.toLowerCase() + " already contrasts with every scene tested, and an outline makes the crosshair look thicker." };
  }
  function buildCross(colorKey, g) {
    var x = { c: XC[colorKey].i, h: g.h, t: 1, o: g.ho, d: g.dot ? 1 : 0, z: g.dot ? g.z : 2, a: 1, f: 0, "0f": 0, "1b": 0 };
    if (g.lines) { x["0t"] = g.t; x["0l"] = g.l; x["0o"] = g.o; x["0a"] = 1; } else { x["0b"] = 0; }
    if (g.moveErr) x["0m"] = 1;
    return x;
  }
  function scaleCfg(x, res) {
    var k = { "1080": 1, stretched: 1, "1440": 1.33, "2160": 2 }[res] || 1, y = Object.assign({}, x);
    if (k === 1) return y;
    ["0l", "0v", "0o"].forEach(function (key) { if (y[key] !== undefined) y[key] = Math.min(20, Math.round(y[key] * k)); });
    if (y["0t"] !== undefined) y["0t"] = Math.min(10, Math.round(y["0t"] * k));
    if (y.d) y.z = Math.min(6, Math.round(y.z * k));
    return y;
  }

  /* ======================================================================
   * Main entry point
   * ====================================================================== */
  function recommend(inp) {
    inp = inp || {};
    var fit = inp.xTest && inp.xTest.length ? fitChoices(inp.xTest) : null;
    var tb = inp.hTest ? (inp.hTest.ok !== undefined ? inp.hTest : analyzeVision(inp.hTest)) : null;
    var xs = XCOLORS.map(function (c) { return { c: c, r: scoreCross(inp, c, fit) }; });
    var hs = HCOLORS.map(function (h) { return { h: h, r: scoreHigh(inp, h, tb) }; });
    var pairs = [];
    xs.forEach(function (x) { hs.forEach(function (h) { if (!clash(x.c, h.h, inp.cvd)) pairs.push({ x: x, h: h, s: x.r.s + h.r.s }); }); });
    pairs.sort(function (a, b) { return b.s - a.s; });
    var best = pairs[0], cKey = best.x.c.key, hKey = best.h.h.key, col = XC[cKey];

    var cWhy = [], vv = best.x.r.vis;
    var worst = Object.keys(vv.per).sort(function (a, b) { return vv.per[a] - vv.per[b]; })[0];
    cWhy.push(col.name + " has the best visibility across the scenes weighted by your answers (" + Math.round(vv.mean * 100) + "/100 on average, " + Math.round(vv.worst * 100) + " on its worst scene, " + SCENES[worst].name.toLowerCase() + ")" + (inp.cvd && cvdType(inp.cvd) ? ", computed as your color vision sees it." : "."));
    if (cKey === "white" || cKey === "cyan") cWhy.push(cKey === "white" ? "White is also the most common pro color (58%)." : "Cyan is also the second most common pro color (19–21%) and topped a community visibility test.");
    best.x.r.why.forEach(function (w) { cWhy.push(w[0].toUpperCase() + w.slice(1) + "."); });
    var topX = xs.slice().sort(function (a, b) { return b.r.s - a.r.s; })[0];
    if (topX.c.key !== cKey) cWhy.push(topX.c.name + " scored slightly higher on its own, but it looks too much like the " + best.h.h.short.toLowerCase() + " highlight, so you'd confuse the two.");
    else cWhy.push("It doesn't look like your " + best.h.h.short.toLowerCase() + " enemy highlight, so you won't confuse the two.");

    var outl = outlineFor(inp, col, fit, inp.shape === "dot" || inp.shape === "crossDot");
    var geo = geometry(inp, cKey, outl, fit), cross = buildCross(cKey, geo.g);
    var altShape = geo.g.dot && !geo.g.lines ? "small" : "dot";
    var alt = buildCross(cKey, geometry(Object.assign({}, inp, { shape: altShape }), cKey, outlineFor(inp, col, fit, altShape === "dot"), null).g);

    // Three options to try: the recommendation, your test favorite (or a different shape), and a pro staple.
    var options = [{ label: "Recommended", cfg: cross, code: encode(cross), note: col.name + " " + geo.g.shape }];
    var fav = fit && fit.favorite ? POOL_BY[fit.favorite] : null;
    if (fav && allowedColor(fav.color, inp.cvd) && !clash(XC[fav.color], best.h.h, inp.cvd)) {
      var fc = scaleCfg(poolCfg(fav), inp.res);
      options.push({ label: "Your test favorite", cfg: fc, code: encode(fc), note: XC[fav.color].name + " " + fav.shape + (fav.note ? " · " + fav.note : "") });
    } else options.push({ label: "Alternative shape", cfg: alt, code: encode(alt), note: col.name + " " + altShape });
    var staple = POOL_BY[clash(XC.white, best.h.h, inp.cvd) ? "c311" : cKey === "white" ? "c311" : "w422o"];
    var sc = scaleCfg(poolCfg(staple), inp.res);
    options.push({ label: "Pro staple", cfg: sc, code: encode(sc), note: XC[staple.color].name + " " + staple.l + "/" + staple.t + "/" + staple.o + (staple.ol ? " + outline" : "") });

    var hRank = hs.slice().sort(function (a, b) { return b.r.s - a.r.s; });
    var hWhy = best.h.r.why.slice(), hv = best.h.r.vis;
    var hWorst = Object.keys(hv.per).sort(function (a, b) { return hv.per[a] - hv.per[b]; })[0];
    hWhy.unshift("highest peripheral visibility across the scenes weighted by your answers (" + Math.round(hv.mean * 100) + "/100 average, weakest on " + SCENES[hWorst].name.toLowerCase() + ")");
    return {
      crosshair: {
        color: col, cfg: cross, code: encode(cross), geometry: geo.g, outline: outl, headPx: headPx(inp.weapon, inp.res || "1080"),
        why: cWhy.concat(geo.why), alt: { shape: altShape, cfg: alt, code: encode(alt) }, options: options, test: fit,
        scores: xs.map(function (x) { return { key: x.c.key, name: x.c.name, hex: x.c.hex, s: x.r.s, vis: x.r.vis, clash: clash(x.c, best.h.h, inp.cvd) }; }).sort(function (a, b) { return b.s - a.s; })
      },
      highlight: {
        color: HC[hKey], why: hWhy, sim: inp.cvd && cvdType(inp.cvd) ? simHex(HC[hKey].hex, inp.cvd) : null,
        ranking: hRank.map(function (h) { return { key: h.h.key, name: h.h.name, hex: h.h.hex, s: h.r.s, vis: h.r.vis, why: h.r.why, clash: clash(best.x.c, h.h, inp.cvd) }; }),
        test: tb, overridden: hRank[0].h.key !== hKey ? hRank[0].h : null
      },
      score: best.s
    };
  }

  var api = { VERSION: "3.1.0", XCOLORS: XCOLORS, HCOLORS: HCOLORS, XC: XC, HC: HC, PRO: PRO, SCENES: SCENES, SCENE_KEYS: SCENE_KEYS, TEST_HEX: TEST_HEX,
    POOL: POOL, POOL_BY: POOL_BY, poolCfg: poolCfg, scaleCfg: scaleCfg, xSession: xSession, fitChoices: fitChoices, allowedColor: allowedColor,
    VT: VT, visionRun: visionRun, _quest: { create: qCreate, update: qUpdate, next: qNext, mean: qMean }, analyzeVision: analyzeVision, rng: rng,
    encode: encode, decode: decode, recommend: recommend, lum: lum, contrast: contrast, clash: clash, simHex: simHex, dE: dE, visAgg: visAgg, headPx: headPx };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.ValoXhair = api;
})(typeof window !== "undefined" ? window : this);
