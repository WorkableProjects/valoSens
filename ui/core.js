"use strict";
var M = window.ValoModel, X = window.ValoXhair, V = window.ValoSession;
// A stale cached script (older than this page) would break the tests partway through; say so up front.
if (!M || !X || !V || typeof X.xSession !== "function" || typeof V.manual !== "function") {
  document.addEventListener("DOMContentLoaded", function () {
    document.body.insertAdjacentHTML("afterbegin", '<div style="padding:16px;background:#3a2a00;color:#ffd75e;font:15px sans-serif">Part of this page loaded from an old cached copy. Press <b>Ctrl+Shift+R</b> (Cmd+Shift+R on Mac) to reload it.</div>');
  });
}

/* ---------- State ---------- */
function newSeed() { try { var a = new Uint32Array(1); window.crypto.getRandomValues(a); return a[0] || 1; } catch (e) { return Math.floor(Math.random() * 4294967295) || 1; } }
function freshState() {
  return {
    dpiSel: null, dpiCustom: "",
    curMode: null, cur: "", measured: "", otherGame: "cs2", otherSens: "", sat: 3,
    padSel: null, padCustom: "", surface: null, limb: null, grip: "unsure", mouseW: "unsure",
    role: null, agent1: "", agent2: "", agent3: "", weapon: null, region: null, age: null, glasses: null, exp: null,
    statsGate: null, stRank: "unsure", stMatches: "", stHs: "", stKd: "", stAdr: "", stPaste: "",
    cvd: null, moving: null, aim: null, shape: null, lose: null, res: null,
    xSeed: newSeed(), xKey: null, xTest: null, xRound: 0,
    hCur: null, hKeep: false, hMaps: null, hClutter: {}, hTest: null, xSkip: false, hSkip: false,
    prior: null, frameMs: null      // prior = sessions imported from a results file (never stored in the browser)
  };
}
var S = freshState();
var currentId = "dpi";

function num(v) { var n = parseFloat(v); return isFinite(n) ? n : NaN; }
function pos(v) { var n = num(v); return n > 0 ? n : NaN; }
function has(v) { return v !== "" && isFinite(parseFloat(v)); }
function f1(x) { return x.toFixed(1); }
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

function getDpi() {
  if (S.dpiSel === "unsure") return 800;
  return S.dpiSel === "other" ? num(S.dpiCustom) : num(S.dpiSel);
}
function getPad() { return S.padSel === "other" ? num(S.padCustom) : num(S.padSel); }
function currentCm() {
  var dpi = getDpi();
  if (S.curMode === "val" && pos(S.cur) > 0 && dpi > 0) return M.cmFrom(dpi, pos(S.cur));
  if (S.curMode === "cm" && pos(S.measured) > 0) return pos(S.measured);
  if (S.curMode === "other" && pos(S.otherSens) > 0 && dpi > 0) return M.cmFrom(dpi, pos(S.otherSens), S.otherGame);
  return null;
}
function statsInput() {
  if (S.statsGate !== "yes") return null;
  var st = { rank: S.stRank, matches: has(S.stMatches) ? num(S.stMatches) : NaN, hs: has(S.stHs) ? num(S.stHs) : NaN, kd: has(S.stKd) ? num(S.stKd) : NaN, adr: has(S.stAdr) ? num(S.stAdr) : NaN };
  return (isFinite(st.hs) || isFinite(st.kd) || isFinite(st.adr)) ? st : null;
}
function agentsInput() {
  var seen = {};
  return [S.agent1, S.agent2, S.agent3].filter(function (a) { if (!a || seen[a]) return false; seen[a] = 1; return true; });
}
var MOUSE_G = { light: 50, mid: 62, heavy: 80, xheavy: 100 };
var RES_WIDTH = { "1080": 1920, "1440": 2560, "2160": 3840, stretched: 1440 };
function buildInput() {
  var c = currentCm();
  return {
    dpi: getDpi(), current: c ? { cm: c } : null, satisfaction: S.sat,
    pad: getPad(), surface: S.surface, limb: S.limb, role: S.role, weapon: S.weapon, agents: agentsInput(),
    experience: S.exp, stats: statsInput(), resWidth: RES_WIDTH[S.res] || 1920,
    grip: S.grip || "unsure", mouseG: MOUSE_G[S.mouseW] || null,
    region: S.region || undefined, age: S.age || undefined, glasses: S.glasses || undefined
  };
}

/* ---------- DOM helpers ---------- */
function el(tag, attrs, html) {
  var n = document.createElement(tag);
  if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
  if (html != null) n.innerHTML = html;
  return n;
}
function choices(host, key, opts, cols, onPick) {
  var wrap = el("div", { "class": "choices" + (cols ? " c" + cols : ""), role: "group" });
  opts.forEach(function (o) {
    var b = el("button", { type: "button", "class": "choice", "aria-pressed": String(S[key] === o.v) },
      '<span class="c-l">' + o.l + "</span>" + (o.s ? '<span class="c-s">' + o.s + "</span>" : ""));
    b.addEventListener("click", function () {
      S[key] = o.v;
      Array.prototype.forEach.call(wrap.children, function (c) { c.setAttribute("aria-pressed", "false"); });
      b.setAttribute("aria-pressed", "true");
      b.classList.remove("picked"); void b.offsetWidth; b.classList.add("picked");
      if (onPick) onPick(o.v);
      refreshNav();
    });
    wrap.appendChild(b);
  });
  host.appendChild(wrap);
}
function numField(host, label, key, ph) {
  var box = el("div");
  box.appendChild(el("label", { "class": "f", "for": "in-" + key }, label));
  var i = el("input", { type: "number", id: "in-" + key, inputmode: "decimal", step: "any", min: "0" });
  if (ph) i.setAttribute("placeholder", ph);
  i.value = S[key];
  i.addEventListener("input", function () { S[key] = i.value; refreshNav(); });
  box.appendChild(i);
  host.appendChild(box);
  return i;
}
function okRange(v, lo, hi) { return v === "" || (isFinite(parseFloat(v)) && parseFloat(v) >= lo && parseFloat(v) <= hi); }

/* ---------- Paste parser ---------- */
function grab(text, labels) {
  for (var i = 0; i < labels.length; i++) {
    var a = new RegExp(labels[i] + "[^0-9\\n]{0,24}([0-9][0-9,]*(?:\\.[0-9]+)?)", "i").exec(text);
    if (a) return a[1].replace(/,/g, "");
    var b = new RegExp("([0-9]+(?:\\.[0-9]+)?)\\s*%?\\s*" + labels[i], "i").exec(text);
    if (b) return b[1];
  }
  return null;
}
function parseStats(text) {
  var map = [["stHs", ["head\\s*shots?(?:\\s*(?:%|rate|percentage))?", "HS\\s*%"]], ["stKd", ["K\\s*\\/\\s*D(?:\\s*ratio)?"]],
    ["stAdr", ["ADR", "damage\\s*\\/\\s*round", "damage\\s*per\\s*round"]], ["stMatches", ["matches(?:\\s*played)?", "games(?:\\s*played)?"]]];
  var n = 0;
  map.forEach(function (m) { var v = grab(text, m[1]); if (v !== null) { S[m[0]] = v; n++; } });
  return n;
}

/* ---------- Crosshair + highlight helpers ---------- */
function toggle(host, key, label) {
  var b = el("button", { type: "button", "class": "chk", "aria-pressed": String(!!S[key]) }, '<i aria-hidden="true"></i>' + label);
  b.addEventListener("click", function () { S[key] = !S[key]; b.setAttribute("aria-pressed", String(S[key])); });
  host.appendChild(b);
}
function toggleChoice(host, key, label, sub) {
  var b = el("button", { type: "button", "class": "choice", "aria-pressed": String(!!S.hClutter[key]) }, '<span class="c-l">' + label + '</span><span class="c-s">' + sub + "</span>");
  b.addEventListener("click", function () { S.hClutter[key] = !S.hClutter[key]; b.setAttribute("aria-pressed", String(!!S.hClutter[key])); });
  host.appendChild(b);
}
// Inputs for the crosshair/highlight model. withTests=false leaves out both test results.
function xhInput(withTests) {
  var inp = { cvd: S.cvd, exp: S.exp, moving: S.moving, aim: S.aim, shape: S.shape, lose: S.lose, res: S.res, weapon: S.weapon,
    hCur: S.hCur, hKeep: S.hKeep, hMaps: S.hMaps, hClutter: S.hClutter };
  if (withTests !== false) {
    var P = V.pooled(S.prior, { xTest: answeredRounds(), hTest: S.hTest });
    inp.xTest = P.xTest.length ? P.xTest : null;
    inp.hTest = P.hTest.length ? P.hTest : null;
  }
  return inp;
}

// Map-like backgrounds come from the scene palette in xhair.js, seeded so they look the same on every render.
