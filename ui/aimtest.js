/*
 * valoSens aim test (browser component). Classic script, global `AimTest`; needs aim.js (global ValoAim) loaded first.
 *
 *   AimTest.start(host, opts, onDone, onCancel) -> { abort() }
 *
 * Runs the hardware checks (DPI card swipe, pad width, reach), then the scheduled trial blocks, recording raw mouse
 * movement. All logic about test design, features and estimation lives in aim.js; this file is rendering, input and
 * the recorder. Formats: .claude/delegation/v1-engine-v6/CONTRACTS.md.
 *
 * Input notes:
 *  - Pointer lock with { unadjustedMovement: true } where supported (raw input). Otherwise plain pointer lock, and
 *    rawInput = false; the DPI check then has to expose OS acceleration.
 *  - `pointerrawupdate` (unaligned, poll-rate events) is used when the browser has it, else `mousemove`.
 *  - Browsers may report movementX scaled by devicePixelRatio. The DPI swipe measures counts per cm of the real
 *    hardware path, which absorbs any such scaling, so all later cm values use the measured counts per cm.
 */
var AimTest = (function () {
  "use strict";

  var A = ValoAim;
  var DEF_MIX = { micro: 8, flick: 6, turn: 4, track: 2 };
  var CARD_CM = 8.56;                       // long edge of an ISO/IEC 7810 ID-1 bank card
  var DPI_LABELS = ["slowly (about 3 seconds)", "at normal speed", "fast"];
  var PAD_N = 2, REACH_N = 3;
  var MIN_SWIPE_COUNTS = 150;
  var TIMEOUT_S = 4;
  var PITCH_MAX = 60;
  var MAX_SAMPLE_HZ = 120;
  var current = null;                       // the running instance (for _debug)

  function wrap180(d) { if (Math.abs(d) <= 180) return d; return d - 360 * Math.round(d / 360); }
  function median(a) { var b = a.slice().sort(function (x, y) { return x - y; }), n = b.length; return n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2; }
  function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  // Target yaw over time for a tracking trial: strafes at |strafeDegS|, reversing at random 0.4 to 0.9 s intervals
  // (generated from the spec id, so a repeated trial gets the same path).
  function trackFn(spec) {
    var r = A._rng(hashStr(spec.id || "track")), dur = (spec.durationS || 2.5) + 1;
    var v = Math.abs(spec.strafeDegS || 15.5), dir = (spec.strafeDegS || 1) < 0 ? -1 : 1;
    var ts = [0], ys = [spec.angleDeg], t = 0, y = spec.angleDeg;
    while (t < dur) {
      var seg = 0.4 + 0.5 * r();
      t += seg; y += dir * v * seg; dir = -dir; ts.push(t); ys.push(y);
    }
    return function (q) {
      if (q <= 0) return ys[0];
      for (var i = 1; i < ts.length; i++) if (q <= ts[i]) return ys[i - 1] + (ys[i] - ys[i - 1]) * (q - ts[i - 1]) / (ts[i] - ts[i - 1]);
      return ys[ys.length - 1];
    };
  }

  // Keep roughly MAX_SAMPLE_HZ samples/s. Cumulative x/y stay exact; gaps (lifts) are preserved.
  function downsample(tr) {
    var t = [], x = [], y = [], last = -1, n = tr.t.length, step = 1 / MAX_SAMPLE_HZ;
    for (var i = 0; i < n; i++) {
      if (i === 0 || i === n - 1 || tr.t[i] - last >= step - 1e-9) {
        t.push(Math.round(tr.t[i] * 1e4) / 1e4); x.push(Math.round(tr.x[i] * 1e4) / 1e4); y.push(Math.round(tr.y[i] * 1e4) / 1e4);
        last = tr.t[i];
      }
    }
    return { t: t, x: x, y: y };
  }

  function start(host, opts, onDone, onCancel) {
    opts = opts || {};
    if (!(opts.dpi > 0)) throw new RangeError("AimTest.start: opts.dpi is required");
    if (!(opts.centreCm > 0)) throw new RangeError("AimTest.start: opts.centreCm is required");
    if (current) current.destroy();

    var mix = { micro: DEF_MIX.micro, flick: DEF_MIX.flick, turn: DEF_MIX.turn, track: DEF_MIX.track };
    if (opts.mix) for (var mk in mix) if (opts.mix[mk] != null) mix[mk] = opts.mix[mk];
    var nLevels = opts.levels || 5, spanOct = opts.spanOct == null ? 0.6 : opts.spanOct;
    var seed = opts.seed == null ? 1 : opts.seed, session = opts.session == null ? "cur" : String(opts.session);
    var source = opts.source || null;

    /* ---------- state ---------- */
    var S = {
      phase: "intro", resumePhase: null, rawInput: false, destroyed: false,
      countsPerCm: opts.dpi / 2.54, checks: { dpi: null, pad: null, reach: null },
      dpiSkipped: false, cal: null, swipe: null, lockFailed: false,
      levels: A.levelsAround(opts.centreCm, nLevels, spanOct), blocks: [], blockIdx: -1, specIdx: 0, nBlocksTotal: 0,
      extraDone: false, tr: null, all: [], levelCount: {}, lastMsg: "",
      viewYaw: 0, viewPitch: 0, ivAll: [], lastFrameTs: null, frameDropsTotal: 0, countdown: 0, timer: null,
      rawSeenAt: -1e9
    };
    var root = el("div", "at-root"), canvas = el("canvas", "at-canvas"), cardBox = el("div", "at-cards");
    canvas.setAttribute("aria-hidden", "true");
    root.appendChild(canvas); root.appendChild(cardBox); host.appendChild(root);
    root.tabIndex = -1;
    var ctx = canvas.getContext("2d"), W = 0, H = 0, raf = 0;

    function resize() {
      var dpr = window.devicePixelRatio || 1;
      W = Math.max(1, root.clientWidth); H = Math.max(1, root.clientHeight);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    /* ---------- schedule ---------- */
    function renumber(blocks, orderOff, blockOff) {
      var o = orderOff;
      blocks.forEach(function (b) { b.block += blockOff; b.specs.forEach(function (sp) { sp.block = b.block; sp.order = o; sp.id = session + "-" + o; o++; }); });
      return o;
    }
    function buildSchedule() {
      var blocks = A.schedule({ levels: S.levels, perLevel: mix, seed: seed, session: session });
      var order = renumber(blocks, 0, 0);
      if (opts.thorough) {
        var b2 = A.schedule({ levels: S.levels, perLevel: mix, seed: seed + 1, session: session });
        order = renumber(b2, order, blocks.length);
        blocks = blocks.concat(b2);
      }
      S.blocks = blocks; S.nBlocksTotal = blocks.length + (typeof opts.density === "function" ? 1 : 0);
    }
    function extraBlock() {
      var counts = {}, k;
      for (k in S.levelCount) counts[k] = S.levelCount[k];
      var cm = A.nextLevel(S.levels, counts, opts.density);
      var b = A.schedule({ levels: [cm], perLevel: mix, seed: seed + 99, session: session })[0];
      var last = S.blocks[S.blocks.length - 1], lastSpec = last.specs[last.specs.length - 1];
      renumber([b], lastSpec.order + 1, S.blocks.length);
      b.extra = true;
      return b;
    }

    /* ---------- cards ---------- */
    function clearTimer() { if (S.timer) { clearInterval(S.timer); S.timer = null; } }
    function showCard(opt) {
      cardBox.innerHTML = "";
      var card = el("div", "at-card"), id = "at-h-" + Math.random().toString(36).slice(2, 7);
      card.setAttribute("role", "dialog"); card.setAttribute("aria-labelledby", id);
      var h = el("h2", "at-h"); h.id = id; h.textContent = opt.title; card.appendChild(h);
      (opt.paras || []).forEach(function (p) { var e = el("p", "at-p"); e.innerHTML = p; card.appendChild(e); });
      if (opt.notes) opt.notes.forEach(function (n) { var e = el("p", "at-note" + (n.warn ? " warn" : "")); e.textContent = n.text; card.appendChild(e); });
      if (opt.status != null) { var st = el("p", "at-status"); st.setAttribute("role", "status"); st.textContent = opt.status; card.appendChild(st); }
      if (opt.big != null) { var bg = el("div", "at-big"); bg.id = "at-big"; bg.textContent = opt.big; card.appendChild(bg); }
      var row = el("div", "at-btns"), primary = null;
      (opt.buttons || []).forEach(function (b) {
        var bt = el("button", "at-btn" + (b.primary ? " primary" : "")); bt.type = "button"; bt.textContent = b.label;
        bt.addEventListener("click", function () { if (!S.destroyed) b.fn(); });
        row.appendChild(bt); if (b.primary) primary = bt;
      });
      if (row.childNodes.length) card.appendChild(row);
      if (opt.hint) { var hn = el("p", "at-hint"); hn.textContent = opt.hint; card.appendChild(hn); }
      cardBox.appendChild(card); cardBox.hidden = false;
      var f = primary || row.querySelector("button");
      if (f) f.focus({ preventScroll: true }); else root.focus({ preventScroll: true });
      return card;
    }
    function hideCards() { cardBox.innerHTML = ""; cardBox.hidden = true; }
    var HINT_LOCK = "Press Enter to continue. Esc pauses.";

    /* ---------- pointer lock ---------- */
    function lock(cb) {
      if (source) { cb(true); return; }
      function plain() {
        S.rawInput = false;
        try { var p2 = root.requestPointerLock(); if (p2 && p2.then) p2.then(function () { cb(true); }, function () { cb(false); }); else setTimeout(function () { cb(document.pointerLockElement === root); }, 60); }
        catch (e) { cb(false); }
      }
      try {
        var p = root.requestPointerLock({ unadjustedMovement: true });
        if (p && typeof p.then === "function") p.then(function () { S.rawInput = true; cb(true); }, plain);
        else setTimeout(function () { S.rawInput = false; cb(document.pointerLockElement === root); }, 60);   // old API: no promise, no raw input
      } catch (e) { plain(); }
    }
    function unlock() { try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) {} }

    /* ---------- flow ---------- */
    function cancel(reason) {
      if (S.destroyed) return;
      destroy();
      if (onCancel) onCancel(reason);
    }
    function showIntro() {
      S.phase = "intro";
      showCard({
        title: "Aim test",
        paras: [
          "This measures how you move your mouse, so the recommendation fits <em>you</em>. It takes about " + (opts.thorough ? "12" : "6") + " minutes: a quick hardware check with a bank card or ruler, then short blocks of aiming at targets.",
          "Keep your normal grip and in-game posture, and use the mouse pad you play on. Press Esc at any time to pause."
        ],
        buttons: [{ label: "Start", primary: true, fn: begin }, { label: "Cancel", fn: function () { cancel("user"); } }]
      });
    }
    function begin() {
      lock(function (ok) {
        if (S.destroyed) return;
        if (!ok) { showLockFail(begin); return; }
        S.lockFailed = false;
        beginDpi();
      });
    }
    function showLockFail(retry) {
      S.phase = "lockfail";
      showCard({
        title: "Mouse capture was blocked",
        paras: ["The test needs to capture the mouse pointer. Press the button to try again, and allow it if the browser asks."],
        buttons: [{ label: "Try again", primary: true, fn: retry }, { label: "Cancel", fn: function () { cancel("user"); } }]
      });
    }

    // Calibration steps share one card: kind "dpi" | "pad" | "reach".
    function beginDpi() {
      S.cal = { kind: "dpi", need: 3, got: [], done: false };
      renderCal();
    }
    function beginPad() { S.cal = { kind: "pad", need: PAD_N, got: [], done: false }; renderCal(); }
    function beginReach() { S.cal = { kind: "reach", need: REACH_N, got: [], done: false }; renderCal(); }

    function renderCal() {
      var c = S.cal, i = c.got.length, buttons = [], title, paras, notes = [], status;
      S.phase = c.kind; S.swipe = null;
      if (c.kind === "dpi") {
        title = "Check 1 of 3: DPI";
        paras = ["Lay a bank card (or a ruler) flat on your pad, long edge pointing left to right. Put the mouse at the card's left end, <b>hold the left button</b>, slide it exactly <b>" + CARD_CM + " cm</b> to the right end, then release."];
        if (!S.rawInput && !source) notes.push({ text: "This browser does not give raw mouse input, so OS pointer acceleration may affect results. This check will flag it.", warn: true });
      } else if (c.kind === "pad") {
        title = "Check 2 of 3: pad width";
        paras = ["Lift and place the mouse at the left edge of your pad, <b>hold the button</b>, drag to the right edge, then release."];
      } else {
        title = "Check 3 of 3: reach";
        paras = ["Keep your elbow and forearm still. <b>Hold the button</b>, swipe right as far as feels comfortable, then release."];
      }
      if (!c.done) {
        status = "Swipe " + (i + 1) + " of " + c.need + (c.kind === "dpi" ? ": " + DPI_LABELS[i] : "") + "." + (S.lastMsg ? " " + S.lastMsg : "");
        if (c.kind === "dpi") buttons.push({ label: "Skip this check", fn: skipDpi });
      } else {
        status = c.summary; buttons.push({ label: "Continue", primary: true, fn: c.next });
        if (c.kind === "dpi" && !S.dpiSkipped) buttons.push({ label: "Redo", fn: function () { S.lastMsg = ""; beginDpi(); } });
        if (c.warnings) c.warnings.forEach(function (w) { notes.push({ text: w, warn: true }); });
      }
      showCard({ title: title, paras: paras, notes: notes, status: status, buttons: buttons, hint: c.done ? HINT_LOCK : "Esc pauses." });
    }
    function skipDpi() {
      S.dpiSkipped = true; S.checks.dpi = null; S.countsPerCm = opts.dpi / 2.54; S.lastMsg = "";
      beginPad();
    }
    function swipeDone(sw, tMs) {
      var c = S.cal, durS = (tMs - sw.t0) / 1000, counts = c.kind === "dpi" ? sw.abs : Math.abs(sw.net);
      if (!(counts >= MIN_SWIPE_COUNTS) || !(durS > 0.1)) { S.lastMsg = "That swipe was too short, try again."; renderCal(); return; }
      S.lastMsg = "";
      if (c.kind === "dpi") c.got.push({ counts: counts, cm: CARD_CM, durS: durS });
      else c.got.push({ cm: counts / S.countsPerCm });
      if (c.got.length < c.need) { renderCal(); return; }
      c.done = true; c.warnings = [];
      if (c.kind === "dpi") {
        var r = A.dpiCheck(c.got, opts.dpi);
        S.checks.dpi = r;
        if (r) {
          S.countsPerCm = r.countsPerCm;
          c.summary = "Measured " + Math.round(r.effDpi) + " DPI (you entered " + Math.round(opts.dpi) + ").";
          if (!r.consistent) c.warnings.push("The three swipes disagree, so the measurement is shaky. Redo it, keeping to the card's edges.");
          if (r.accelSuspect) c.warnings.push("The count per cm changes with swipe speed, which suggests mouse acceleration is on. Turn off \"Enhance pointer precision\" in your OS settings and redo this.");
          if (r.ratio > 1.15 || r.ratio < 0.87) c.warnings.push("The measured DPI is far from the one you entered. The measured value will be used.");
        } else c.summary = "No usable swipes recorded.";
        c.next = beginPad;
      } else if (c.kind === "pad") {
        S.checks.pad = A.padCheck(c.got);
        c.summary = S.checks.pad ? "Pad width: about " + S.checks.pad.value.toFixed(1) + " cm." : "No usable swipes recorded.";
        c.next = beginReach;
      } else {
        S.checks.reach = A.reachCheck(c.got);
        c.summary = S.checks.reach ? "Comfortable reach: about " + S.checks.reach.value.toFixed(1) + " cm." : "No usable swipes recorded.";
        c.next = function () { buildSchedule(); S.blockIdx = -1; nextBlock(); };
      }
      renderCal();
    }

    function nextBlock() {
      S.blockIdx++;
      if (S.blockIdx >= S.blocks.length) {
        if (typeof opts.density === "function" && !S.extraDone) { S.extraDone = true; S.blocks.push(extraBlock()); }
        else { finishAll(); return; }
      }
      S.specIdx = 0;
      showBlockCard();
    }
    function showBlockCard() {
      var b = S.blocks[S.blockIdx], n = 3;
      S.phase = "block"; S.tr = null; clearTimer();
      showCard({
        title: "Block " + (S.blockIdx + 1) + " of " + S.nBlocksTotal,
        paras: [b.extra ? "One extra block at the setting where your result is least certain." : "Same sensitivity for this whole block. The first two targets are warm-up and are not scored. Click each target as fast and accurately as you can."],
        big: String(n), buttons: [{ label: "Start now", primary: true, fn: runBlock }],
        hint: HINT_LOCK
      });
      var bigEl = document.getElementById("at-big");
      S.countdown = n;
      S.timer = setInterval(function () {
        S.countdown--;
        if (S.countdown <= 0) { runBlock(); return; }
        if (bigEl) bigEl.textContent = String(S.countdown);
      }, 1000);
    }
    function runBlock() { clearTimer(); hideCards(); startTrial(); }

    /* ---------- trials ---------- */
    function startTrial() {
      var b = S.blocks[S.blockIdx];
      if (S.specIdx >= b.specs.length) { nextBlock(); return; }
      var spec = b.specs[S.specIdx], r = A._rng(hashStr(spec.id) + 7);
      S.phase = "trial";
      S.viewYaw = 0; S.viewPitch = 0;
      S.tr = { spec: spec, state: "hold", holdMs: 700 + r() * 500, holdStart: null, t0: 0, t: [], x: [], y: [], cumX: 0, cumY: 0,
        clicks: [], moved: false, evFlag: false, ivs: [], lastTs: null, track: spec.task === "track" ? trackFn(spec) : null };
    }
    function targetAt(tr, q) {
      var sp = tr.spec;
      return { yaw: tr.track ? tr.track(q) : sp.angleDeg, pitch: tr.track ? 0 : sp.pitchDeg };
    }
    function relTarget(tr, q) {
      var tg = targetAt(tr, q);
      return { dyaw: wrap180(tg.yaw - S.viewYaw), dpitch: tg.pitch - S.viewPitch };
    }
    function pushSample(tr, q) {
      var n = tr.t.length;
      if (n && q <= tr.t[n - 1] + 1e-9) { tr.x[n - 1] = tr.cumX; tr.y[n - 1] = tr.cumY; return; }
      tr.t.push(q); tr.x.push(tr.cumX); tr.y.push(tr.cumY);
    }
    function onMove(dx, dy, tMs) {
      if (S.destroyed) return;
      var cal = S.phase === "dpi" || S.phase === "pad" || S.phase === "reach";
      if (cal) {
        if (S.swipe) { S.swipe.abs += Math.abs(dx); S.swipe.net += dx; }
        return;
      }
      var tr = S.tr;
      if (S.phase !== "trial" || !tr || tr.state !== "live") return;
      var q = (tMs - tr.t0) / 1000;
      if (q < 0) return;
      var spec = tr.spec, k = 360 / spec.cm, cpc = S.countsPerCm;
      S.viewYaw += dx / cpc * k;
      S.viewPitch = Math.max(-PITCH_MAX, Math.min(PITCH_MAX, S.viewPitch - dy / cpc * k));
      tr.cumX += dx / cpc; tr.cumY += -dy / cpc;
      if (dx !== 0 || dy !== 0) tr.moved = true;
      pushSample(tr, q);
      tr.evFlag = true;
    }
    function onDown(tMs) {
      if (S.destroyed) return;
      if (S.phase === "dpi" || S.phase === "pad" || S.phase === "reach") {
        if (!S.cal.done) S.swipe = { t0: tMs, abs: 0, net: 0 };
        return;
      }
      var tr = S.tr;
      if (S.phase !== "trial" || !tr || tr.state !== "live") return;
      var q = (tMs - tr.t0) / 1000;
      if (q < 0) return;
      var rel = relTarget(tr, q), dist = Math.sqrt(rel.dyaw * rel.dyaw + rel.dpitch * rel.dpitch);
      var hit = dist < tr.spec.targetDeg / 2;
      tr.clicks.push({ t: q, hit: hit });
      if (hit && !tr.track) finishTrial(q);
    }
    function onUp(tMs) {
      if (S.destroyed) return;
      if ((S.phase === "dpi" || S.phase === "pad" || S.phase === "reach") && S.swipe) {
        var sw = S.swipe; S.swipe = null; swipeDone(sw, tMs);
      }
    }

    function median2(a) { return a.length ? median(a) : 16.7; }
    function finishTrial(done) {
      var tr = S.tr, spec = tr.spec;
      tr.state = "ended";
      var n = tr.t.length;
      while (n > 1 && tr.t[n - 1] > done + 1e-9) n--;
      if (!n) { tr.t = [0]; tr.x = [0]; tr.y = [0]; n = 1; }
      var traj = { t: tr.t.slice(0, n), x: tr.x.slice(0, n), y: tr.y.slice(0, n), cm: spec.cm, targetDeg: spec.targetDeg,
        targetYaw: tr.track || spec.angleDeg, targetPitch: spec.pitchDeg, done: done, clicks: tr.clicks.slice() };
      if (tr.track) traj.targetPitch = 0;
      var feat = A.features(traj, spec);
      var med = median2(S.ivAll), dropped = 0;
      for (var i = 0; i < tr.ivs.length; i++) if (tr.ivs[i] > 1.5 * med) dropped++;
      S.frameDropsTotal += dropped;
      var trial = A.toTrial(spec, feat, { droppedFrames: dropped });
      S.all.push({ spec: spec, feat: feat, trial: trial, traj: downsample(traj) });
      if (!spec.warmup) S.levelCount[spec.cm] = (S.levelCount[spec.cm] || 0) + 1;
      S.lastMsg = tr.track ? "" : (feat.hit ? "Hit in " + feat.time.toFixed(2) + " s" : "Missed");
      S.specIdx++;
      S.tr = null;
      startTrial();
    }

    function finishAll() {
      S.phase = "done"; S.tr = null; clearTimer(); unlock();
      var kept = S.all.filter(function (q) { return !q.spec.warmup; });
      var records = kept.map(function (q) { return { spec: q.spec, feat: q.feat }; });
      var result = {
        trials: kept.map(function (q) { return q.trial; }), records: records, checks: S.checks,
        personal: A.estimatePersonal(records, { dpi: S.checks.dpi, pad: S.checks.pad, reach: S.checks.reach }),
        rawInput: S.rawInput, frameMs: median2(S.ivAll), droppedFrames: S.frameDropsTotal,
        trajectories: kept.map(function (q) { return q.traj; })
      };
      showCard({
        title: "Aim test complete",
        paras: ["Recorded " + result.trials.length + " scored trials. Thanks."],
        buttons: [{ label: "Continue", primary: true, fn: function () { destroy(); onDone(result); } }]
      });
    }

    /* ---------- pause ---------- */
    function pause() {
      if (S.destroyed) return;
      var p = S.phase;
      if (p === "intro" || p === "lockfail" || p === "pause" || p === "done") return;
      S.resumePhase = p; S.phase = "pause"; S.swipe = null; clearTimer();
      if (S.tr) S.tr = null;                                  // the trial in progress is discarded and repeated
      showCard({
        title: "Paused",
        paras: ["Resume to carry on where you were" + (p === "trial" ? " (the current target is repeated)" : "") + ", or quit the test."],
        buttons: [{ label: "Resume", primary: true, fn: resume }, { label: "Quit", fn: function () { cancel("user"); } }]
      });
    }
    function resume() {
      lock(function (ok) {
        if (S.destroyed || S.phase !== "pause") return;
        if (!ok) return;
        var p = S.resumePhase;
        if (p === "dpi" || p === "pad" || p === "reach") renderCal();
        else if (p === "block") showBlockCard();
        else if (p === "trial") { hideCards(); startTrial(); }
        else showBlockCard();
      });
    }

    /* ---------- input listeners ---------- */
    var L = [];
    function on(t, ev, fn, o) { t.addEventListener(ev, fn, o); L.push([t, ev, fn, o]); }
    if (!source) {
      var hasRaw = ("onpointerrawupdate" in document);
      function locked() { return document.pointerLockElement === root; }
      if (hasRaw) on(document, "pointerrawupdate", function (e) {
        S.rawSeenAt = e.timeStamp;
        if (locked()) onMove(e.movementX, e.movementY, e.timeStamp);
      });
      on(document, "mousemove", function (e) {
        if (hasRaw && e.timeStamp - S.rawSeenAt < 150) return;      // raw events are flowing; this is the aligned duplicate
        if (locked()) onMove(e.movementX, e.movementY, e.timeStamp);
      });
      on(document, "mousedown", function (e) { if (e.button === 0 && locked()) onDown(e.timeStamp); });
      on(document, "mouseup", function (e) { if (e.button === 0 && locked()) onUp(e.timeStamp); });
      on(document, "pointerlockchange", function () { if (!locked()) pause(); });
      on(document, "pointerlockerror", function () { /* handled by the promise paths in lock() */ });
    } else {
      source.attach(onMove, onDown, onUp);
    }
    on(document, "keydown", function (e) { if (e.key === "Escape") pause(); });
    on(document, "visibilitychange", function () { if (document.hidden) pause(); });
    on(window, "resize", resize);

    /* ---------- render loop ---------- */
    function frame(ts) {
      if (S.destroyed) return;
      raf = requestAnimationFrame(frame);
      var tr = S.tr;
      if (S.phase === "trial" && tr) {
        if (tr.state === "hold") {
          if (tr.holdStart == null) tr.holdStart = ts;
          if (ts - tr.holdStart >= tr.holdMs) {
            tr.state = "live"; tr.t0 = ts; tr.lastTs = null; tr.evFlag = false;
            S.viewYaw = 0; S.viewPitch = 0;
            pushSample(tr, 0);
          }
        } else if (tr.state === "live") {
          var q = (ts - tr.t0) / 1000;
          if (tr.lastTs != null) { var iv = ts - tr.lastTs; tr.ivs.push(iv); S.ivAll.push(iv); if (S.ivAll.length > 2000) S.ivAll.shift(); }
          tr.lastTs = ts;
          /*
           * Recorder rule. Every mouse event is a sample. A frame with no mouse event adds a zero-movement sample only
           * when (a) the first movement has not happened yet (reaction phase), (b) the crosshair is within
           * 2 x targetDeg of the target (an aiming pause), or (c) this is a tracking trial. Otherwise nothing is
           * pushed, so a pause far from the target shows up as a gap of 60 ms or more, which aim.js reads as a mouse
           * lift. A browser cannot tell a lifted mouse from a stationary one; this heuristic is the decided
           * compromise: pauses far from the target count as lifts.
           */
          if (!tr.evFlag && q > 0) {
            var rel = relTarget(tr, q), near = Math.sqrt(rel.dyaw * rel.dyaw + rel.dpitch * rel.dpitch) < 2 * tr.spec.targetDeg;
            if (!tr.moved || near || tr.track) pushSample(tr, q);
          }
          tr.evFlag = false;
          var limit = tr.track ? (tr.spec.durationS || 2.5) : TIMEOUT_S;
          if (q >= limit) finishTrial(limit);
        }
      }
      draw(ts);
    }
    function draw(ts) {
      ctx.clearRect(0, 0, W, H);
      var tr = S.tr, showScene = S.phase === "trial" && tr;
      var bg = getComputedStyle(root).getPropertyValue("--bg").trim() || "#0f1923";
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      if (!showScene) return;
      drawScene(tr, ts);
    }
    function drawScene(tr, ts) {
      var hy = A.screenY(-S.viewPitch, W, H), i, x, y, yy;
      if (hy == null) hy = H / 2;
      // ground and sky
      ctx.fillStyle = "#13222f"; ctx.fillRect(0, Math.max(0, hy), W, H);
      ctx.fillStyle = "#101c27"; ctx.fillRect(0, 0, W, Math.max(0, Math.min(H, hy)));
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(143,160,174,0.22)";
      ctx.beginPath(); ctx.moveTo(0, hy); ctx.lineTo(W, hy); ctx.stroke();
      // vertical posts every 10 degrees of yaw, horizontal bands in pitch
      ctx.strokeStyle = "rgba(143,160,174,0.12)";
      ctx.beginPath();
      for (i = -18; i < 18; i++) {
        var d = wrap180(i * 10 - S.viewYaw);
        x = A.screenX(d, W);
        if (x != null && x > -2 && x < W + 2) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      }
      var pitches = [-1.5, -3, -6, -12, -24, -45, 3, 6, 12, 24];
      for (i = 0; i < pitches.length; i++) {
        yy = A.screenY(pitches[i] - S.viewPitch, W, H);
        if (yy != null && yy > 0 && yy < H) { ctx.moveTo(0, yy); ctx.lineTo(W, yy); }
      }
      ctx.stroke();
      // target
      var cx = W / 2, cy = H / 2;
      if (tr.state === "live") {
        var q = (ts - tr.t0) / 1000, tg = targetAt(tr, q), spec = tr.spec;
        var dyaw = wrap180(tg.yaw - S.viewYaw), px = A.screenX(dyaw, W), py = A.screenY(tg.pitch - S.viewPitch, W, H);
        var focal = (W / 2) / Math.tan(A.FOV_H / 2 * Math.PI / 180);
        var rad = Math.max(3, focal * Math.tan(spec.targetDeg / 2 * Math.PI / 180));
        if (px != null && py != null && px > -rad && px < W + rad && py > -rad && py < H + rad) {
          ctx.fillStyle = "#ff4655"; ctx.strokeStyle = "#ece8e1"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(px, py, rad, 0, 6.2832); ctx.fill(); ctx.stroke();
        } else {
          var dir = dyaw >= 0 ? 1 : -1, ax = dir > 0 ? W - 46 : 46;
          ctx.fillStyle = "#ff4655";
          ctx.beginPath(); ctx.moveTo(ax + dir * 22, cy); ctx.lineTo(ax - dir * 14, cy - 18); ctx.lineTo(ax - dir * 14, cy + 18); ctx.closePath(); ctx.fill();
        }
      }
      // crosshair, fixed at the centre
      ctx.strokeStyle = "#2ad6b0"; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy); ctx.lineTo(cx - 4, cy); ctx.moveTo(cx + 4, cy); ctx.lineTo(cx + 10, cy);
      ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy - 4); ctx.moveTo(cx, cy + 4); ctx.lineTo(cx, cy + 10);
      ctx.stroke();
      // HUD
      var b = S.blocks[S.blockIdx], sp2 = tr.spec;
      ctx.font = "600 14px " + (getComputedStyle(root).getPropertyValue("--head").trim() || "sans-serif");
      ctx.fillStyle = "#8fa0ae"; ctx.textBaseline = "top"; ctx.textAlign = "left";
      ctx.fillText("BLOCK " + (S.blockIdx + 1) + " / " + S.nBlocksTotal + "   TARGET " + (S.specIdx + 1) + " / " + b.specs.length + (sp2.warmup ? "   WARM-UP" : ""), 16, 14);
      if (S.lastMsg && tr.state === "hold") { ctx.fillStyle = "#ece8e1"; ctx.textAlign = "center"; ctx.fillText(S.lastMsg.toUpperCase(), W / 2, cy + 40); }
    }
    raf = requestAnimationFrame(frame);

    /* ---------- lifecycle ---------- */
    function destroy() {
      if (S.destroyed) return;
      S.destroyed = true; clearTimer();
      if (raf) cancelAnimationFrame(raf);
      L.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); });
      unlock();
      if (root.parentNode) root.parentNode.removeChild(root);
      if (current && current.S === S) current = null;
    }
    current = {
      S: S, destroy: destroy,
      debug: function () {
        var tr = S.tr, tg = null;
        if (tr && tr.state === "live") { var q = (performance.now() - tr.t0) / 1000, t0 = targetAt(tr, q); tg = { yaw: t0.yaw, pitch: t0.pitch, deg: tr.spec.targetDeg }; }
        var awaiting = "none";
        if (S.phase === "dpi" || S.phase === "pad" || S.phase === "reach") awaiting = S.cal && !S.cal.done ? "swipe" : "button";
        else if (S.phase === "trial") awaiting = tr && tr.state === "live" ? "aim" : "wait";
        else if (S.phase !== "pause") awaiting = "button";
        return { viewYaw: S.viewYaw, viewPitch: S.viewPitch, target: tg, spec: tr ? tr.spec : null, phase: S.phase, awaiting: awaiting,
          countsPerCm: S.countsPerCm, swipeKind: S.cal ? S.cal.kind : null, swipeIndex: S.cal ? S.cal.got.length : 0, cardCm: CARD_CM };
      }
    };
    showIntro();
    return { abort: function () { if (!S.destroyed) { destroy(); if (onCancel) onCancel("abort"); } } };
  }

  return {
    start: start,
    _debug: function () { return current ? current.debug() : null; }
  };
})();
