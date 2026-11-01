/*
 * valoSens crosshair + enemy highlight model. Works in the browser (window.ValoXhair) and in Node.
 * Evidence and sources: research/crosshair_research.md, research/highlight_color_research.md.
 *
 * The crosshair color and the highlight color are chosen together: every (crosshair, highlight)
 * pair is scored, pairs that share a hue are not allowed, and the best-scoring pair wins.
 */
(function (root) {
  "use strict";

  // In-game crosshair palette (code index → hex). Luminance is sRGB relative luminance (WCAG formula).
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

  // Enemy highlight options (client labels). Hex values are approximations: Riot doesn't publish them.
  var HCOLORS = [
    { key: "yd", name: "Yellow (Deuteranopia)", short: "Yellow", hex: "#F2E33A", hue: "yellow" },
    { key: "yp", name: "Yellow (Protanopia)", short: "Yellow", hex: "#F5D93B", hue: "yellow" },
    { key: "red", name: "Red (Default)", short: "Red", hex: "#E23B3B", hue: "red" },
    { key: "purple", name: "Purple (Tritanopia)", short: "Purple", hex: "#B04CF0", hue: "purple" }
  ];
  var HC = {}; HCOLORS.forEach(function (c) { HC[c.key] = c; });

  // Pro usage, own scrape of ProSettings.net on 2026-11-01 (91 crosshair codes, 58 known highlight colors).
  var PRO = {
    xColor: { white: 0.58, cyan: 0.19, green: 0.11, other: 0.12 },
    xShape: { cross: 0.57, dot: 0.26, crossDot: 0.11, outer: 0.05 },
    outlines: 0.59, errorLines: 0.01, medianLength: 3, typicalGap: "0–2", typicalThickness: 2, nCross: 91,
    highlight: { yellow: 0.71, red: 0.22, purple: 0.07 }, nHighlight: 58
  };

  function lum(hex) {
    var n = parseInt(hex.slice(1), 16), rgb = [n >> 16 & 255, n >> 8 & 255, n & 255].map(function (v) {
      v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }

  /* ---------------- Crosshair code ---------------- */
  // Primary-section defaults: anything equal to these is left out of the code.
  var DEF = { c: 0, h: 1, t: 1, o: 0.5, d: 0, z: 2, a: 1, f: 1, "0b": 1, "0t": 2, "0l": 6, "0o": 3, "0a": 0.8, "0m": 0, "0s": 1, "0f": 1, "0e": 1, "1b": 1 };
  var ORDER = ["c", "h", "t", "o", "d", "z", "a", "f", "0b", "0t", "0l", "0o", "0a", "0m", "0s", "0f", "0e", "1b"];
  function fmt(v) { return typeof v === "number" ? String(Math.round(v * 1000) / 1000) : String(v); }
  function encode(x) {
    var out = ["0", "P"];
    ORDER.forEach(function (k) {
      if (x[k] === undefined || x[k] === DEF[k]) return;
      out.push(k, fmt(x[k]));
    });
    return out.join(";");
  }
  // Minimal decoder for the primary section (used by tests and to read back codes).
  function decode(code) {
    var p = String(code).trim().split(";"), x = Object.assign({}, DEF), sec = null;
    if (p[0] !== "0") throw new Error("Crosshair codes start with 0");
    for (var i = 1; i < p.length; i++) {
      if (p[i] === "P" || p[i] === "A" || p[i] === "S") { sec = p[i]; continue; }
      var k = p[i], v = p[++i];
      if (v === undefined) throw new Error("Missing value for " + k);
      if (sec === "P") x[k] = /^[0-9.]+$/.test(v) ? parseFloat(v) : v;
    }
    return x;
  }

  /* ---------------- Inputs ----------------
   * cvd: "none" | "protan" | "deutan" | "rg" | "tritan" | "unsure"
   * aim: "flick" | "track" | "mix";  shape: "small" | "medium" | "dot" | "crossDot" | "any"
   * lose: "bright" | "dark" | "util" | "never";  res: "1080" | "1440" | "2160" | "stretched"
   * exp: "new" | "mid" | "exp" | "comp";  moving: "still" | "moving" | "unsure"
   * visWins: { colorKey: wins } from the visibility test, plus visOutline: wins for outlined variants
   * hCur: current highlight key or "unsure";  hKeep: bool;  hMaps: "warm" | "dark" | "cool" | "none"
   * hClutter: { fire, purple, yellow } booleans;  hTest: { yellow:{rt,hit,n}, red:…, purple:… }
   */

  var RG = { protan: 1, deutan: 1, rg: 1 };

  function scoreCross(inp, c) {
    var why = [], s = { white: 3, cyan: 3.2, green: 1.6, yellow: 1.4, yg: 0.9, gy: 0.7, pink: 0, red: -1 }[c.key];
    if (RG[inp.cvd] && (c.hue === "green" || c.key === "red")) { s -= 6; why.push("hard to see with red-green color blindness"); }
    if (RG[inp.cvd] && c.key === "gy") { s -= 2; }
    if (inp.cvd === "tritan" && (c.key === "yellow" || c.key === "gy")) { s -= 3; why.push("yellow and white can merge with blue-yellow color blindness"); }
    if (inp.cvd === "tritan" && c.key === "pink") s += 1.5;
    if (inp.lose === "util" && (c.key === "pink" || c.key === "red")) s -= 1;
    var w = inp.visWins && inp.visWins[c.key];
    if (w) { s += 1.6 * w; why.push("you picked it as the easiest to see on " + w + " background" + (w > 1 ? "s" : "")); }
    return { s: s, why: why };
  }

  function testBonus(hTest) {
    // Inverse efficiency score (mean correct RT ÷ hit rate; Townsend & Ashby 1983). Lower is better.
    if (!hTest) return null;
    var ies = {}, keys = Object.keys(hTest).filter(function (k) { return hTest[k] && hTest[k].n > 0; });
    if (keys.length < 2) return null;
    keys.forEach(function (k) {
      var t = hTest[k], hr = t.hit / t.n, rt = t.hit ? t.rt : 1.2;
      ies[k] = rt / Math.max(hr, 0.2);
    });
    var mean = keys.reduce(function (a, k) { return a + ies[k]; }, 0) / keys.length, out = {};
    keys.forEach(function (k) { out[k] = Math.max(-2.5, Math.min(2.5, (mean - ies[k]) / mean * 15)); });
    return { bonus: out, ies: ies };
  }

  function scoreHigh(inp, h, tb) {
    var why = [], s = { yd: 3, yp: 2.7, red: 1.6, purple: 1 }[h.key];
    if (inp.cvd === "protan") { if (h.key === "yp") { s += 5; why.push("made for protanopia"); } if (h.key === "red") { s -= 5; why.push("red looks dark with protanopia"); } }
    if (inp.cvd === "deutan" || inp.cvd === "rg") { if (h.key === "yd") { s += 5; why.push("made for deuteranopia, the most common type"); } if (h.key === "red") { s -= 4; why.push("red-green color blindness"); } }
    if (inp.cvd === "tritan") { if (h.key === "purple") { s += 5; why.push("made for tritanopia"); } if (h.hue === "yellow") { s -= 3; why.push("yellow can merge with white for tritanopia"); } }
    if (inp.hMaps === "warm") { if (h.hue === "yellow") { s -= 1.5; why.push("yellow is close in brightness to sandy maps"); } if (h.key === "purple") { s += 1; why.push("separates from sand and warm light"); } if (h.key === "red") s += 0.4; }
    if (inp.hMaps === "dark") { if (h.hue === "yellow") { s += 1.5; why.push("brightest option in shadows"); } if (h.key === "red" || h.key === "purple") { s -= 1; why.push("dim in shadows"); } }
    if (inp.hMaps === "cool") { if (h.key === "purple") { s -= 1.2; why.push("close to blue maps"); } if (h.hue === "yellow") s += 0.5; }
    var cl = inp.hClutter || {};
    if (cl.fire && h.key === "red") { s -= 1.5; why.push("blends with fire and orange utility"); }
    if (cl.purple && h.key === "purple") { s -= 1.5; why.push("blends with purple smokes and blinds"); }
    if (cl.yellow && h.hue === "yellow") { s -= 0.7; why.push("blends a little with yellow utility"); }
    if (inp.hKeep && inp.hCur === h.key) { s += 1.5; why.push("what you're used to"); }
    if (tb) {
      var b = tb.bonus[h.hue === "yellow" ? "yellow" : h.key];
      if (b !== undefined) { s += b; if (Math.abs(b) >= 0.5) why.push(b > 0 ? "you spotted it fastest in the test" : "you spotted it slower in the test"); }
    }
    return { s: s, why: why };
  }

  function clash(c, h) {
    if (h.hue === "yellow") return c.hue === "yellow" || c.key === "yg";
    if (h.key === "red") return c.key === "red" || c.key === "pink";
    if (h.key === "purple") return c.key === "pink";
    return false;
  }

  function geometry(inp, colorKey) {
    var aim = inp.aim || "mix", shape = inp.shape || "any", why = [];
    if (shape === "any") shape = aim === "track" ? "medium" : "small";
    var g = { shape: shape, l: 3, t: 2, o: 2, dot: false, z: 2, lines: true };
    if (shape === "small") {
      g.l = aim === "flick" ? 2 : 3; g.o = 2;
      why.push("Small cross (" + g.l + " long, gap " + g.o + "): it marks a precise point without covering a distant head. Most pros use 2–4 long with a 0–2 gap.");
    } else if (shape === "medium") {
      g.l = aim === "flick" ? 4 : 5; g.o = 3;
      why.push("Slightly larger cross (" + g.l + " long, gap " + g.o + "): the lines stay visible around a moving target while you track or spray. This is a heuristic, not a measured effect.");
    } else if (shape === "dot") {
      g.lines = false; g.dot = true; g.z = 3;
      why.push("Center dot only: it hides the least of the scene. It's 26% of pros' choice. A dot gives a weaker sense of center on bright backgrounds, so it gets an outline.");
    } else if (shape === "crossDot") {
      g.dot = true; g.z = 2; g.l = 2; g.o = 3;
      why.push("Small cross with a dot: the gap is 3 so the dot stays separate from the lines.");
    }
    // Resolution: values are in screen pixels, so higher resolutions need bigger numbers to look the same.
    var k = { "1080": 1, stretched: 1, "1440": 1.33, "2160": 2 }[inp.res] || 1;
    if (k !== 1) {
      g.l = Math.min(20, Math.round(g.l * k)); g.o = Math.min(20, Math.round(g.o * k)); g.t = Math.min(10, Math.round(g.t * k)); g.z = Math.min(6, Math.round(g.z * k));
      why.push("Scaled ×" + k + " for " + (inp.res === "2160" ? "4K" : "1440p") + ", because crosshair values are in screen pixels.");
    }
    if (inp.res === "stretched" && g.lines) { g.l = Math.max(1, g.l - 1); why.push("One shorter for 4:3 stretched, which widens horizontal lines."); }

    // Outlines: a dark border adds brightness contrast where the color alone washes out.
    var lightColor = colorKey === "white" || colorKey === "yellow" || colorKey === "gy" || colorKey === "yg" || colorKey === "green";
    var vo = inp.visOutline || 0;
    if (inp.lose === "bright" || vo >= 2) { g.h = 1; g.ho = 1; why.push("Outlines on at full opacity: on bright maps like Breeze, Bind and Sunset, a black outline gives about 10:1 contrast where white alone manages 2:1."); }
    else if (g.dot || lightColor || vo === 1) { g.h = 1; g.ho = 0.5; why.push("Outlines on at half opacity, so a light color still separates from bright walls. 59% of pros show an outline."); }
    else { g.h = 0; g.ho = 0.5; why.push("Outlines off: " + XC[colorKey].name.toLowerCase() + " already stands out from most walls and an outline makes the crosshair look thicker."); }

    // Error lines: motion onset grabs attention, so keep the crosshair static (99% of pros).
    g.moveErr = (inp.exp === "new" || inp.exp === "mid") && inp.moving === "moving";
    if (g.moveErr) why.push("Movement error on, as a training aid: the lines spread while you move, a reminder to stop before you shoot. Turn it off once counter-strafing is automatic.");
    else why.push("Movement and firing error off: lines that jump during a fight pull your attention away from the target (about 99% of pros turn them off).");
    return { g: g, why: why };
  }

  function buildCross(colorKey, g) {
    var x = { c: XC[colorKey].i, h: g.h, t: 1, o: g.ho, d: g.dot ? 1 : 0, z: g.dot ? g.z : 2, a: 1, f: 0, "0f": 0, "1b": 0 };
    if (g.lines) { x["0t"] = g.t; x["0l"] = g.l; x["0o"] = g.o; x["0a"] = 1; } else { x["0b"] = 0; }
    if (g.moveErr) { x["0m"] = 1; }
    return x;
  }

  function recommend(inp) {
    inp = inp || {};
    var tb = testBonus(inp.hTest), pairs = [];
    var xs = XCOLORS.map(function (c) { return { c: c, r: scoreCross(inp, c) }; });
    var hs = HCOLORS.map(function (h) { return { h: h, r: scoreHigh(inp, h, tb) }; });
    xs.forEach(function (x) { hs.forEach(function (h) { if (!clash(x.c, h.h)) pairs.push({ x: x, h: h, s: x.r.s + h.r.s }); }); });
    pairs.sort(function (a, b) { return b.s - a.s; });
    var best = pairs[0], cKey = best.x.c.key, hKey = best.h.h.key;

    // Explain the color choice.
    var cWhy = [];
    var cBase = { white: "White is the most common pro color (58%) and the brightest option.", cyan: "Cyan scored highest in a community visibility test across 12 maps and is the second most common pro color (19%). It is bright and rare in map palettes.", green: "Green is bright and rare on most maps (11% of pros).", yellow: "Yellow is nearly as bright as white.", pink: "Pink is the most visible option left for your color vision.", red: "Red is dim against grey walls.", yg: "Yellow green is bright.", gy: "Green yellow is bright." }[cKey];
    cWhy.push(cBase);
    best.x.r.why.forEach(function (w) { cWhy.push("You " + w.replace(/^you /, "") + "."); });
    var topX = xs.slice().sort(function (a, b) { return b.r.s - a.r.s; })[0];
    if (topX.c.key !== cKey) cWhy.push(topX.c.name + " scored slightly higher on its own, but it shares a hue with the " + best.h.h.short.toLowerCase() + " highlight, so you'd confuse the two.");
    else cWhy.push("It doesn't share a hue with your " + best.h.h.short.toLowerCase() + " enemy highlight, so you won't confuse the two.");
    if (RG[inp.cvd]) cWhy.push("Green, yellow green and red are excluded for red-green color blindness.");

    var geo = geometry(inp, cKey), cross = buildCross(cKey, geo.g);
    var altShape = geo.g.dot && !geo.g.lines ? "small" : "dot";
    var alt = buildCross(cKey, geometry(Object.assign({}, inp, { shape: altShape }), cKey).g);

    var hRank = hs.slice().sort(function (a, b) { return b.r.s - a.r.s; });
    return {
      crosshair: {
        color: XC[cKey], cfg: cross, code: encode(cross), geometry: geo.g,
        why: cWhy.concat(geo.why), alt: { shape: altShape, cfg: alt, code: encode(alt) },
        scores: xs.map(function (x) { return { key: x.c.key, name: x.c.name, hex: x.c.hex, s: x.r.s, clash: clash(x.c, best.h.h) }; }).sort(function (a, b) { return b.s - a.s; })
      },
      highlight: {
        color: HC[hKey], why: best.h.r.why.slice(),
        ranking: hRank.map(function (h) { return { key: h.h.key, name: h.h.name, hex: h.h.hex, s: h.r.s, why: h.r.why, clash: clash(best.x.c, h.h) }; }),
        test: tb, overridden: hRank[0].h.key !== hKey ? hRank[0].h : null
      },
      score: best.s
    };
  }

  var api = { XCOLORS: XCOLORS, HCOLORS: HCOLORS, XC: XC, HC: HC, PRO: PRO, encode: encode, decode: decode, recommend: recommend, lum: lum, contrast: contrast, clash: clash, testBonus: testBonus };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.ValoXhair = api;
})(typeof window !== "undefined" ? window : this);
