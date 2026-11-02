"use strict";
/* ---------- Test 1: crosshair visibility (rotating pool) ---------- */
function xRounds() {
  var key = [S.xSeed, S.cvd, S.shape].join("|");
  if (S.xKey !== key || !S.xTest) {
    S.xKey = key; S.xRound = 0;
    S.xTest = X.xSession({ seed: S.xSeed, cvd: S.cvd, shape: S.shape, rounds: 8, k: 4, seen: S.prior ? V.seenCounts(S.prior) : null }).map(function (r) { return { scene: r.scene, ids: r.ids, pick: undefined, motion: !!r.motion, reduced: !!r.motion && REDUCED }; });
  }
  return S.xTest;
}
function answeredRounds() { return S.xTest ? S.xTest.filter(function (r) { return r.pick !== undefined; }) : []; }
function poolCfgFor(p) { return X.decode(X.encode(X.scaleCfg(X.poolCfg(p), S.res))); }
function visTest(host) {
  var rounds = xRounds();
  var head = el("div", { "class": "vt-head" }), grid = el("div", { "class": "vis-grid4", role: "group", "aria-label": "Crosshair options" }), foot = el("div", { "class": "vt-foot" });
  host.appendChild(head); host.appendChild(grid); host.appendChild(foot);
  function answered() { return rounds.filter(function (q) { return q.pick !== undefined; }).length; }
  var gen = 0;           // bumps on every redraw so old motion loops stop
  window.__xhMotionLoops = window.__xhMotionLoops || 0;
  function draw() {
    gen++;
    var r = rounds[S.xRound], sc = X.SCENES[r.scene], moving = r.motion && !REDUCED;
    head.innerHTML = '<span class="vt-n">Round ' + (S.xRound + 1) + " / " + rounds.length + '</span><span class="vt-scene">' + sc.name + " <small>" + sc.maps + "</small>" + (r.motion ? ' <small class="vt-mov">Moving</small>' : "") + '</span><span class="vt-dots" aria-hidden="true">' +
      rounds.map(function (q, i) { return '<i class="' + (i === S.xRound ? "on " : "") + (q.pick !== undefined ? "done" : "") + '"></i>'; }).join("") + "</span>";
    grid.innerHTML = ""; grid.classList.remove("swap"); void grid.offsetWidth; grid.classList.add("swap");
    r.ids.forEach(function (id, k) {
      var p = X.POOL_BY[id], L = String.fromCharCode(65 + k);
      var b = el("button", { type: "button", "class": "vis-c", "aria-pressed": String(r.pick === id), "aria-label": "Option " + L });
      var cv = el("canvas"); b.appendChild(cv); b.appendChild(el("span", null, L));
      b.style.setProperty("--i", k); grid.appendChild(b);
      requestAnimationFrame(function () {
        var c = hidpi(cv, b.clientWidth || 140, 128), cfg = poolCfgFor(p), seed = (S.xSeed % 997) + S.xRound * 31 + k * 7;
        if (!moving) { paintBg(c.ctx, c.w, c.h, r.scene, seed); drawCross(c.ctx, Math.round(c.w / 2), Math.round(c.h / 2), cfg, 1); return; }
        // Motion round: pan a double-width background at 240 px/s, reversing every 1.2 s; crosshair fixed at centre.
        var dpr = c.ctx.getTransform ? c.ctx.getTransform().a : 1, off = document.createElement("canvas");
        off.width = Math.round(c.w * 2 * dpr); off.height = Math.round(c.h * dpr);
        var octx = off.getContext("2d"); octx.scale(dpr, dpr); paintBg(octx, c.w * 2, c.h, r.scene, seed);
        var myGen = gen, t0 = performance.now(); window.__xhMotionLoops++;
        (function frame(now) {
          if (myGen !== gen || !cv.isConnected) { window.__xhMotionLoops--; return; }
          var t = (now - t0) / 1000, ph = t % 2.4, x = 240 * (ph < 1.2 ? ph : 2.4 - ph);
          x = x % c.w;
          c.ctx.drawImage(off, x * dpr, 0, c.w * dpr, c.h * dpr, 0, 0, c.w, c.h);
          drawCross(c.ctx, Math.round(c.w / 2), Math.round(c.h / 2), cfg, 1);
          requestAnimationFrame(frame);
        })(t0);
      });
      b.addEventListener("click", function () { choose(id); });
    });
    foot.innerHTML = "";
    var prev = el("button", { type: "button", "class": "btn small" }, "Previous");
    prev.disabled = S.xRound === 0;
    prev.addEventListener("click", function () { S.xRound--; draw(); });
    var none = el("button", { type: "button", "class": "btn small" + (r.pick === null ? " sel" : "") }, "None stands out");
    none.addEventListener("click", function () { choose(null); });
    foot.appendChild(prev); foot.appendChild(none);
    foot.appendChild(el("span", { "class": "tip" }, answered() + " of " + rounds.length + " answered. This visit's set is drawn at random from " + X.POOL.length + " pro-style crosshairs and changes every time you load the page."));
  }
  function choose(id) {
    rounds[S.xRound].pick = id;
    if (S.xRound < rounds.length - 1) { S.xRound++; if (REDUCED) draw(); else setTimeout(draw, 140); } else draw();
    refreshNav();
  }
  draw();
}

/* ---------- Test 2: enemy highlight vision test ---------- */
// Masked flash → "where was the highlighted enemy?" with no time limit. Only accuracy is scored.
var VT_RUN = null, SLOTS = [0.14, 0.38, 0.62, 0.86];
function measureRefresh(cb) {
  var ts = [];
  function f(t) { ts.push(t); if (ts.length < 41) requestAnimationFrame(f); else { var d = []; for (var i = 1; i < ts.length; i++) d.push(ts[i] - ts[i - 1]); d.sort(function (a, b) { return a - b; }); cb(Math.max(2, d[Math.floor(d.length / 2)])); } }
  requestAnimationFrame(f);
}
function offscreen(w, h) { var o = document.createElement("canvas"); o.width = w; o.height = h; return o; }
function slotXY(c, i, seed) { var r = rng(seed + i * 13); return { x: c.w * SLOTS[i], y: c.h * (0.5 + (r() - 0.5) * 0.18) }; }
function visionTest(host) {
  var stage = el("div", { "class": "dt" }), cv = el("canvas", { "aria-label": "Vision test area" }), over = el("div", { "class": "dt-over" });
  var bar = el("div", { "class": "dt-bar", "aria-hidden": "true" }, "<i></i>"), stop = el("button", { type: "button", "class": "btn small dt-stop", hidden: "" }, "Finish early");
  stage.appendChild(cv); stage.appendChild(bar); stage.appendChild(over); stage.appendChild(stop); host.appendChild(stage);
  var res = el("div", { "class": "dt-res", role: "status" }); host.appendChild(res);
  if (VT_RUN) VT_RUN.stop = true;
  var me = VT_RUN = { stop: false }, c, run = null, awaiting = null, xcfg = null;
  function size() { var w = Math.max(300, stage.clientWidth || 640); return hidpi(cv, w, Math.round(Math.min(420, Math.max(220, w * 0.46)))); }
  c = size(); paintBg(c.ctx, c.w, c.h, "concrete", 3);
  function summary() {
    var pool = V.pooled(S.prior, { hTest: S.hTest }).hTest;
    var a = S.hTest ? X.analyzeVision(pool) : null;
    if (!a || !a.ok) { res.innerHTML = a ? '<p class="tip">' + esc(a.reason) + "</p>" : ""; return; }
    res.innerHTML = '<div class="vr">' + X.VT.colors.map(function (k, i) {
      var r = a.colors[k], pct = Math.round(Math.min(1, r.alpha75) * 100);
      return '<div class="vr-r" style="--i:' + i + '"><span class="vr-n"><i class="sw" style="background:' + X.TEST_HEX[k] + '"></i>' + k[0].toUpperCase() + k.slice(1) + '</span><span class="vr-t"><i style="width:' + Math.max(3, pct) + '%;background:' + X.TEST_HEX[k] + '"></i></span><span class="vr-v">' + pct + "% strength</span></div>";
    }).join("") + '</div><p class="tip">Outline strength you needed to find the enemy 75% of the time (lower = easier to see). Easy check rounds: ' + (a.catchPc === null ? "–" : Math.round(a.catchPc * 100) + "%") + (a.flags.length ? ". " + esc(a.flags.join(" ")) : ".") + (S.prior ? " Pooled with " + S.prior.length + " imported session" + (S.prior.length > 1 ? "s" : "") + "." : "") + "</p>";
  }
  function idle(msg) {
    over.innerHTML = "<p>" + msg + '</p><button type="button" class="btn primary" id="dtStart">' + (S.hTest ? "Run again" : "Start test") + "</button>";
    over.hidden = false; stop.hidden = true;
    over.querySelector("#dtStart").addEventListener("click", start);
  }
  idle(S.hTest ? "Done. Run it again to replace the result." : "Look at the crosshair in the middle. Four enemies flash for a split second; one has a colored outline. Afterwards, say where it was: click it or press 1–4. Take your time. Speed isn't measured.");
  summary();
  function onKey(e) { if (me.stop || !awaiting) return; var n = parseInt(e.key, 10); if (n >= 1 && n <= 4) { e.preventDefault(); answer(n - 1); } }
  function onVis() { if (document.hidden && me.trial) me.trial.dropped = true; }
  document.addEventListener("keydown", onKey); document.addEventListener("visibilitychange", onVis);
  me.cleanup = function () { document.removeEventListener("keydown", onKey); document.removeEventListener("visibilitychange", onVis); };
  cv.addEventListener("pointerdown", function (ev) {
    if (me.stop || !awaiting) return;
    var r = cv.getBoundingClientRect(), px = (ev.clientX - r.left) / r.width, best = 0;
    SLOTS.forEach(function (s, i) { if (Math.abs(s - px) < Math.abs(SLOTS[best] - px)) best = i; });
    answer(best);
  });
  stop.addEventListener("click", function () { finish(true); });
  function start() {
    over.hidden = true; stop.hidden = false; c = size();
    xcfg = X.decode(X.recommend(xhInput(false)).crosshair.code);
    measureRefresh(function (frameMs) {
      if (me.stop) return;
      run = X.visionRun({ seed: newSeed(), start: S.prior ? V.visionStart(S.prior) : null }); run.frameMs = frameMs; S.frameMs = frameMs;
      setTimeout(trial, 400);
    });
  }
  function fixation(bgCanvas) {
    c.ctx.drawImage(bgCanvas, 0, 0);
    drawCross(c.ctx, Math.round(c.w / 2), Math.round(c.h / 2), xcfg, 1);
  }
  function trial() {
    if (me.stop) return;
    var t = run.nextTrial(); if (!t) { finish(false); return; }
    bar.firstChild.style.width = (run.progress() * 100).toFixed(1) + "%";
    var sz = Math.round(c.h * 0.22), bg = offscreen(c.w, c.h), stim = offscreen(c.w, c.h), mask = offscreen(c.w, c.h);
    paintBg(bg.getContext("2d"), c.w, c.h, t.scene, t.seed % 100000);
    var body = X.SCENES[t.scene].base.map(function (v) { return Math.round(v * 0.45); });
    var sx = stim.getContext("2d"); sx.drawImage(bg, 0, 0);
    SLOTS.forEach(function (s, i) { var p = slotXY(c, i, t.seed); drawEnemy(sx, p.x, p.y, sz, i === t.target ? t.hex : null, body, t.alpha); });
    drawCross(sx, Math.round(c.w / 2), Math.round(c.h / 2), xcfg, 1);
    var mx = mask.getContext("2d"); mx.drawImage(bg, 0, 0); drawMask(mx, c, sz, t.seed);
    var frames = Math.max(2, Math.round(t.exposureMs / run.frameMs));
    fixation(bg);
    me.trial = { dropped: false };
    setTimeout(function () {
      if (me.stop) return;
      var k = 0, t0 = 0, last = 0, long = false;
      function f(ts) {
        if (me.stop) return;
        if (k === 0) { c.ctx.drawImage(stim, 0, 0); t0 = last = ts; k++; requestAnimationFrame(f); return; }
        if (ts - last > 1.5 * run.frameMs) long = true;
        last = ts;
        if (k < frames) { k++; requestAnimationFrame(f); return; }
        c.ctx.drawImage(mask, 0, 0);
        var shown = ts - t0, dropped = long || Math.abs(shown - frames * run.frameMs) > 0.5 * run.frameMs || me.trial.dropped;
        setTimeout(function () {
          if (me.stop) return;
          c.ctx.drawImage(bg, 0, 0);
          c.ctx.fillStyle = "rgba(15,25,35,.45)"; c.ctx.fillRect(0, 0, c.w, c.h);
          SLOTS.forEach(function (s, i) {
            var p = slotXY(c, i, t.seed);
            c.ctx.strokeStyle = "rgba(236,232,225,.55)"; c.ctx.lineWidth = 2 * c.dpr; c.ctx.strokeRect(p.x - sz * 0.32, p.y - sz * 0.55, sz * 0.64, sz * 1.1);
            c.ctx.fillStyle = "#ece8e1"; c.ctx.font = "700 " + Math.round(sz * 0.3) + "px Barlow Condensed, sans-serif"; c.ctx.textAlign = "center"; c.ctx.textBaseline = "middle";
            c.ctx.fillText(String(i + 1), p.x, p.y);
          });
          awaiting = { t: t, shown: shown, dropped: dropped };
        }, X.VT.maskMs);
      }
      requestAnimationFrame(f);
    }, 500 + Math.random() * 400);
  }
  function answer(i) {
    var a = awaiting; awaiting = null;
    run.record(a.t, { answer: i, shownMs: a.shown, dropped: a.dropped });
    var p = slotXY(c, i, a.t.seed);
    c.ctx.fillStyle = "rgba(42,214,176,.35)"; c.ctx.beginPath(); c.ctx.arc(p.x, p.y, c.h * 0.08, 0, Math.PI * 2); c.ctx.fill();
    setTimeout(trial, 220);
  }
  function finish(early) {
    awaiting = null;
    if (run && run.trials.length) {
      var a = X.analyzeVision(run.trials);
      if (a && a.ok) S.hTest = run.trials.slice();
    }
    run = null; stop.hidden = true;
    paintBg(c.ctx, c.w, c.h, "concrete", 3);
    bar.firstChild.style.width = "0";
    idle(S.hTest ? "Done. Run it again to replace the result." : "Not enough rounds per color to estimate a threshold yet. Start again when you're ready.");
    summary();
  }
}
// Backward mask: outline fragments in every test color plus neutrals, so no color is favored.
function drawMask(ctx, c, sz, seed) {
  var r = rng(seed * 7 + 3), cols = [X.TEST_HEX.yellow, X.TEST_HEX.red, X.TEST_HEX.purple, "#1a1a1a", "#d8d8d8"];
  SLOTS.forEach(function (s) {
    var cx = c.w * s, cy = c.h * 0.5;
    for (var i = 0; i < 46; i++) {
      var x = cx + (r() - 0.5) * sz * 1.1, y = cy + (r() - 0.5) * sz * 1.5, a = r() * Math.PI * 2, l = sz * (0.08 + r() * 0.16);
      ctx.strokeStyle = cols[i % cols.length]; ctx.lineWidth = Math.max(1.5, sz * 0.035); ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = sz * 0.06;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
    }
  });
  ctx.shadowBlur = 0;
}


/* ---------- Questions ---------- */
