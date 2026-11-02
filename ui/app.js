"use strict";
/* ---------- Flow ---------- */
var app = document.getElementById("app");
var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function visible() { return Q.filter(function (q) { return q.show(); }); }
function idxOf(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return i; return 0; }
function qNow() { return Q.filter(function (q) { return q.id === currentId; })[0]; }
function goNext() {
  var l = visible(), j = idxOf(l, currentId);
  if (j < l.length - 1) { currentId = l[j + 1].id; renderQ("next"); focusH(); } else renderResult();
}
function refreshNav() { var q = qNow(); var nx = document.getElementById("next"); if (nx && q) nx.disabled = !q.valid(); }
function focusH() { var h = document.getElementById("qh"); if (h) { h.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: REDUCED ? "auto" : "smooth" }); } }
function setProgress(p, label) {
  var bar = document.getElementById("progress");
  bar.style.width = p + "%"; bar.setAttribute("aria-valuenow", String(Math.round(p)));
  document.getElementById("crumb").textContent = label + (S.prior ? " · Run " + (S.prior.length + 1) : "");
}

/* ---------- Results files: download and import (no browser storage) ---------- */
function agentOk(n) { return !!M.findAgent(n); }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "unknown date"; }
function importFile(file, done) {
  if (!file) return;
  if (file.size > 3000000) { done(new Error("The file is too large to be a valoSens results file.")); return; }
  var r = new FileReader();
  r.onload = function () { try { done(null, V.parse(String(r.result), agentOk)); } catch (e) { done(e); } };
  r.onerror = function () { done(new Error("The file couldn't be read.")); };
  r.readAsText(file);
}
function applyImport(res) {
  S = freshState();
  Object.keys(res.latest.answers).forEach(function (k) { S[k] = k === "hClutter" ? Object.assign({}, res.latest.answers[k]) : res.latest.answers[k]; });
  S.prior = res.sessions;   // answers also carry rank and aimSkip (session.js keeps both)
}
// Everything before the first test (visibility, else vision when the crosshair part is skipped) is answered and valid,
// so the player can jump straight to the tests. Returns that test's id, or null if there is none or something is unanswered.
function testTarget() {
  var l = visible(), id = null;
  ["vis", "hTest"].forEach(function (t) { if (!id && l.some(function (q) { return q.id === t; })) id = t; });
  if (!id) return null;
  var k = idxOf(l, id);
  for (var i = 0; i < k; i++) if (l[i].id !== "aimtest" && !l[i].valid()) return null;   // the aim test is never required to jump to the tests
  return k > 0 ? id : null;
}
function canSkipToTests() { return !!testTarget(); }
function importCard() {
  var card = el("div", { "class": "imp" });
  var input = el("input", { type: "file", accept: ".json,application/json", id: "impFile", "class": "sr" });
  var msg = el("p", { "class": "imp-msg", role: "status" });
  function draw(note) {
    card.innerHTML = "";
    if (S.prior) {
      var n = S.prior.length, last = S.prior[n - 1];
      card.appendChild(el("div", { "class": "imp-t" }, '<b>Calibration run ' + (n + 1) + "</b> · " + (last.manual && n === 1 ? "last results entered by hand" : n + " earlier session" + (n > 1 ? "s" : "") + " loaded (latest " + esc(last.manual ? "entered by hand" : fmtDate(last.date)) + ")")));
      card.appendChild(el("p", { "class": "imp-s" }, (last.manual ? "Your current sensitivity and highlight are filled in from what you entered. The results screen compares this run with your last one." :
        "Your answers are filled in from the latest session. Picks from the visibility test and rounds from the vision test will be pooled with this run's, and the vision test starts near your earlier thresholds.") +
        (last.result && last.result.cm ? " Last result: " + last.result.cm.toFixed(1) + " cm/360" + (last.result.sens ? " (sens " + last.result.sens.toFixed(3) + ")" : "") + "." : "")));
      var row = el("div", { "class": "imp-b" });
      if (canSkipToTests()) {
        var go = el("button", { type: "button", "class": "btn primary small", id: "impGo" }, "Skip to the tests");
        go.addEventListener("click", function () { currentId = testTarget() || "vis"; renderQ("next"); focusH(); });
        row.appendChild(go);
      }
      var clr = el("button", { type: "button", "class": "btn small", id: "impClear" }, "Remove import");
      clr.addEventListener("click", function () { S = freshState(); renderQ(); });
      row.appendChild(clr); card.appendChild(row);
    } else {
      card.appendChild(el("div", { "class": "imp-t" }, "<b>Doing a second test?</b> Import the results file you downloaded last time, or type in what you got."));
      card.appendChild(el("p", { "class": "imp-s" }, "A file fills in your answers and pools your earlier test data with this run for a tighter calibration. No file? Enter the results you remember and this run is compared with them. Nothing is saved in the browser."));
      var row2 = el("div", { "class": "imp-b" });
      var btn = el("label", { "class": "btn small", "for": "impFile", tabindex: "0", role: "button" }, "Import results file");
      btn.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
      var man = el("button", { type: "button", "class": "btn small", id: "impManual", "aria-expanded": "false" }, "Enter last results");
      row2.appendChild(btn); row2.appendChild(man); card.appendChild(row2);
      var form = manualForm(function (sess) { S = freshState(); applyImport({ sessions: [sess], latest: sess }); renderQ(); var m = document.querySelector(".imp-msg"); if (m) m.textContent = "Last results added."; }, msg);
      form.hidden = true; card.appendChild(form);
      man.addEventListener("click", function () { form.hidden = !form.hidden; man.setAttribute("aria-expanded", String(!form.hidden)); if (!form.hidden) form.querySelector("input").focus(); });
    }
    card.appendChild(input); card.appendChild(msg);
    if (note) msg.textContent = note;
  }
  input.addEventListener("change", function () {
    importFile(input.files[0], function (err, res) {
      if (err) { msg.textContent = err.message; msg.classList.add("bad"); return; }
      applyImport(res); renderQ();
      var m = document.querySelector(".imp-msg");
      if (m) m.textContent = "Imported " + res.sessions.length + " session" + (res.sessions.length > 1 ? "s" : "") + "." + (res.warnings.length ? " " + res.warnings.join(" ") : "");
    });
  });
  draw();
  return card;
}
// Form for typing in the last results by hand (for players without the file).
function manualForm(done, msg) {
  var f = el("div", { "class": "imp-man", id: "impManForm" });
  function num(label, id, ph) { var b = el("div"); b.appendChild(el("label", { "class": "f", "for": id }, label)); var i = el("input", { type: "number", id: id, inputmode: "decimal", step: "any", min: "0", placeholder: ph }); b.appendChild(i); return { box: b, i: i }; }
  var row = el("div", { "class": "row" }), sens = num("Sensitivity", "manSens", "e.g. 0.35"), dpi = num("DPI", "manDpi", "e.g. 800"), cm = num("cm/360 <small>(optional)</small>", "manCm", "e.g. 32");
  row.appendChild(sens.box); row.appendChild(dpi.box); row.appendChild(cm.box); f.appendChild(row);
  var cb = el("div"); cb.appendChild(el("label", { "class": "f", "for": "manCode" }, "Crosshair code <small>(optional)</small>"));
  var code = el("input", { type: "text", id: "manCode", placeholder: "0;P;c;5;h;0;...", autocomplete: "off", spellcheck: "false" }); cb.appendChild(code); f.appendChild(cb);
  var hb = el("div"); hb.appendChild(el("label", { "class": "f", "for": "manHl" }, "Enemy highlight color <small>(optional)</small>"));
  var hl = el("select", { id: "manHl" }); hl.appendChild(el("option", { value: "" }, "Don't remember"));
  X.HCOLORS.forEach(function (c) { hl.appendChild(el("option", { value: c.key }, esc(c.name))); }); hb.appendChild(hl); f.appendChild(hb);
  var go = el("button", { type: "button", "class": "btn primary small", id: "manSave", style: "margin-top:14px" }, "Use these results");
  go.addEventListener("click", function () {
    try { done(V.manual({ sens: sens.i.value, dpi: dpi.i.value, cm: cm.i.value, code: code.value, highlight: hl.value }, M.cmFrom)); }
    catch (e) { msg.textContent = e.message; msg.classList.add("bad"); }
  });
  f.appendChild(go);
  return f;
}
function downloadResults(R, XR, sens, dpi) {
  var b = V.build({ prior: S.prior, answers: S, xTest: S.xSkip ? [] : answeredRounds(), hTest: S.hSkip ? null : S.hTest, frameMs: S.frameMs, version: X.VERSION, agentOk: agentOk,
    aim: S.aimSkip ? null : aimForFile(), engine: M.ENGINE,
    result: { cm: R.cm, sens: sens, dpi: dpi, code: XR && !S.xSkip ? XR.crosshair.code : undefined, highlight: XR && !S.hSkip ? XR.highlight.color.key : undefined } });
  var blob = new Blob([V.serialize(b)], { type: "application/json" }), a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = V.fileName(b);
  document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  return b;
}
// Stagger every direct block and every choice so the question builds in.
function stagger(root) {
  var k = 0;
  Array.prototype.forEach.call(root.children, function (n) {
    if (n.classList.contains("q-body")) {
      Array.prototype.forEach.call(n.querySelectorAll(".choice, .row, select, input, details, .ends, .tip"), function (c) { c.classList.add("anim"); c.style.setProperty("--i", k++); });
    } else { n.classList.add("anim"); n.style.setProperty("--i", k++); }
  });
}

var PARTS = ["Sensitivity", "Aim test", "Crosshair", "Highlight color"];
// Part numbers here: 1 sensitivity, 2 aim test, 3 crosshair, 4 highlight.
function partSkipped(k) { return k === 2 ? !!S.aimSkip : k === 3 ? !!S.xSkip : k === 4 ? !!S.hSkip : false; }
function aimSkipped() { return !!S.aimSkip; }
function partsBar(n) {
  if (!n) return null;
  return el("div", { "class": "parts", "aria-label": "Part " + n + " of " + PARTS.length + ": " + PARTS[n - 1] + (partSkipped(n) ? " (skipped)" : "") }, PARTS.map(function (t, k) {
    var sk = partSkipped(k + 1);
    return '<div class="part' + (k + 1 === n ? " on" : (k + 1 < n || sk) ? " done" : "") + '" style="--k:' + k + '"><b>' + (k + 1) + "</b>" + t + (sk ? "<small>Skipped</small>" : "") + "</div>";
  }).join(""));
}
// First question after `id` (in questionnaire order) that is still shown, or null when the questionnaire is over.
function nextShownAfter(id) {
  var at = -1; Q.forEach(function (q, j) { if (q.id === id) at = j; });
  for (var j = at + 1; j < Q.length; j++) if (Q[j].show()) return Q[j];
  return null;
}
// n uses the part numbers above (2 aim test, 3 crosshair, 4 highlight).
function skipPart(n) {
  var from = currentId;
  if (n === 2) S.aimSkip = true; else if (n === 3) S.xSkip = true; else S.hSkip = true;
  var nx = nextShownAfter(from);
  if (nx) { currentId = nx.id; renderQ("next"); focusH(); } else renderResult();
}
// Bring a skipped part back, keeping every other answer, and open its first question.
// n is the legacy numbering results.js passes (2 crosshair, 3 highlight); addAimPart() brings the aim test back.
function addPart(n) {
  if (n === 2) { S.xSkip = false; currentId = "cvd"; } else { S.hSkip = false; currentId = "hCur"; }
  renderQ("back"); focusH();
}
function addAimPart() { S.aimSkip = false; currentId = "aimtest"; renderQ("back"); focusH(); }
function renderQ(dir) {
  if (VT_RUN) { VT_RUN.stop = true; if (VT_RUN.cleanup) VT_RUN.cleanup(); }
  document.getElementById("wrap").classList.remove("wide");
  var list = visible(), i = idxOf(list, currentId), q = list[i];
  currentId = q.id;
  // The screen being replaced slides out as an inert copy (no ids, no handlers) while the new one slides in.
  var old = app.firstElementChild, ghost = null;
  if (!REDUCED && dir && old && old.classList.contains("q") && !old.classList.contains("ghost") && !old.classList.contains("wideq")) {
    ghost = old.cloneNode(true);
    ghost.className = "q ghost" + (dir === "back" ? " back" : "");
    ghost.setAttribute("aria-hidden", "true"); ghost.setAttribute("inert", "");
    [ghost].concat(Array.prototype.slice.call(ghost.querySelectorAll("[id]"))).forEach(function (n) { n.removeAttribute("id"); });
    Array.prototype.forEach.call(ghost.querySelectorAll("input, select, textarea, button"), function (n) { n.tabIndex = -1; });
  }
  app.innerHTML = "";
  setProgress(i / list.length * 100, q.part ? "Part " + q.part + " · " + PARTS[q.part - 1] : "Start");
  var box = el("section", { "class": "q" + (dir === "back" ? " back" : "") + (q.id === "vis" || q.id === "hTest" ? " wideq" : "") });
  var pb = partsBar(q.part); if (pb) box.appendChild(pb);
  box.appendChild(el("div", { "class": "q-sec" }, String(i + 1).padStart(2, "0") + " <span>/ " + String(list.length).padStart(2, "0") + "</span> &nbsp;" + q.sec));
  box.appendChild(el("h2", { tabindex: "-1", id: "qh" }, q.title));
  box.appendChild(el("p", { "class": "why" }, q.why));
  box.appendChild(el("p", { "class": "uses" }, q.uses));
  var body = el("div", { "class": "q-body" }); box.appendChild(body);
  q.render(body);
  var last = i === list.length - 1;
  var nav = el("div", { "class": "nav" });
  var back = el("button", { type: "button", "class": "btn", id: "back" }, "Back");
  back.disabled = i === 0;
  back.addEventListener("click", function () { var l = visible(), j = idxOf(l, currentId); if (j > 0) { currentId = l[j - 1].id; renderQ("back"); focusH(); } });
  var next = el("button", { type: "button", "class": "btn primary", id: "next" }, last ? "Calculate" : "Next");
  next.addEventListener("click", function () {
    goNext();
  });
  nav.appendChild(back);
  if ((q.part === 2 && !S.aimSkip) || (q.part === 3 && !S.xSkip) || (q.part === 4 && !S.hSkip)) {
    var sk = el("button", { type: "button", "class": "btn small skip", id: "skipPart" }, q.part === 2 ? "Skip aim test" : q.part === 3 ? "Skip crosshair" : "Skip highlight");
    sk.addEventListener("click", function () { skipPart(q.part); });
    nav.appendChild(sk);
  }
  nav.appendChild(next); box.appendChild(nav);
  app.appendChild(box);
  if (ghost) { app.appendChild(ghost); setTimeout(function () { if (ghost.parentNode) ghost.parentNode.removeChild(ghost); }, 300); }
  stagger(box);
  refreshNav();
}

