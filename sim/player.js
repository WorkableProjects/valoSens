/*
 * valoSens simulated player (Engine v6 test oracle).
 *
 * A seeded virtual player with KNOWN motor constants ("truth") performs aim-test trials and
 * returns mouse trajectories in the format of CONTRACTS.md (the same format the browser
 * recorder produces). Used to check that aim.js recovers the real constants and to drive the
 * engine's validation scorecard. Rule numbers in comments refer to the task spec (T01):
 *   1 reaction, 2 primary submovement, 3 pad and lifts, 4 corrections, 5 click, 6 track, 7 sampling.
 * Not part of the product UI; browser global: window.ValoSim.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ValoSim = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var DT = 0.001;            // rule 7: 1000 Hz
  var CAP_S = 4;             // rule 4: static trial cap
  var MAX_CORR = 8;          // rule 4

  var TRUTH_DEFAULTS = { sigma0: 0.02, k: 0.05, tSub: 0.15, vPeak: 150, reachCm: 8, tLift: 0.3, padCm: 38, countsPerCm: 314.96, rt: 0.2 };
  var TRUTH_RANGES = {
    sigma0: [0.01, 0.04], k: [0.02, 0.1], tSub: [0.1, 0.25], vPeak: [100, 250],
    reachCm: [3, 15], tLift: [0.2, 0.5], padCm: [20, 85], rt: [0.16, 0.28]
  };

  /* ---- seeded randomness (mulberry32, same algorithm as model.js rng) ---- */
  function rng(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0; var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(seed, id) {                               // FNV-1a over "seed|id"
    var s = String(seed) + "|" + String(id), h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function makeGauss(R) {
    return function () {
      var u = R() || 1e-12, v = R();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
  }
  function sign(v) { return v < 0 ? -1 : 1; }
  function mj(tau) { return tau <= 0 ? 0 : tau >= 1 ? 1 : tau * tau * tau * (10 + tau * (-15 + 6 * tau)); }   // minimum-jerk position
  function mjInv(s) {                                      // time fraction at which mj reaches s (bisection)
    var lo = 0, hi = 1;
    for (var i = 0; i < 40; i++) { var m = (lo + hi) / 2; if (mj(m) < s) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }

  function randomTruth(seed) {
    var R = rng(hash(seed, "truth")), tr = { countsPerCm: 314.96 };
    Object.keys(TRUTH_RANGES).forEach(function (key) {
      var r = TRUTH_RANGES[key];
      tr[key] = Math.exp(Math.log(r[0]) + R() * (Math.log(r[1]) - Math.log(r[0])));
    });
    return tr;
  }

  function createPlayer(opts) {
    opts = opts || {};
    var seed = opts.seed == null ? 1 : opts.seed;
    var truth = {};
    Object.keys(TRUTH_DEFAULTS).forEach(function (key) { truth[key] = TRUTH_DEFAULTS[key]; });
    Object.keys(opts.truth || {}).forEach(function (key) { truth[key] = opts.truth[key]; });
    return {
      truth: truth,
      run: function (spec) {
        var R = rng(hash(seed, spec.id));
        return spec.task === "track" ? runTrack(truth, spec, R) : runStatic(truth, spec, R);
      }
    };
  }

  /* =========================================================================
   * Static tasks (micro / flick / turn): rules 1-5, 7
   * ========================================================================= */
  function runStatic(tr, spec, R) {
    var G = makeGauss(R), cm = spec.cm;
    var wCm = spec.targetDeg / 2 / 360 * cm;                    // target half-width, cm
    var tx = spec.angleDeg / 360 * cm, ty = (spec.pitchDeg || 0) / 360 * cm;
    var hw = tr.padCm / 2;
    var st = {
      T: 0, k: 0, t: [], x: [], y: [], cx: 0, cy: 0,
      hp: (R() * 2 - 1) * 0.5 * hw,                              // rule 3: hand offset from pad centre
      lifts: 0, nSub: 0, peak: 0
    };

    function holdUntil(Tend) {                                   // stationary samples at current position
      while (st.k * DT <= Tend + 1e-12 && st.k * DT <= CAP_S + 1e-12) { push(st.k * DT, st.cx, st.cy); st.k++; }
      if (Tend > st.T) st.T = Tend;
    }
    function push(t, x, y) { st.t.push(t); st.x.push(x); st.y.push(y); }

    // Minimum-jerk move of (dx,dy) over D seconds, truncated at fraction sEnd (<=1). Returns the time used.
    function emitMove(dx, dy, D, sEnd) {
      var Dused = D * (sEnd >= 1 ? 1 : mjInv(sEnd)), T0 = st.T, x0 = st.cx, y0 = st.cy;
      var T1 = T0 + Dused;
      while (st.k * DT <= T1 + 1e-12 && st.k * DT <= CAP_S + 1e-12) {
        var s = Math.min(mj((st.k * DT - T0) / D), sEnd);
        if (st.k * DT > T0 + 1e-12) push(st.k * DT, x0 + dx * s, y0 + dy * s);
        st.k++;
      }
      st.cx = x0 + dx * sEnd; st.cy = y0 + dy * sEnd; st.T = T1;
      var sp = 1.875 * Math.hypot(dx, dy) / D; if (st.T - T0 > 0.02 && sp > st.peak) st.peak = sp;
    }

    // Rule 2 + 3: one submovement of planned vector (dx,dy); crosses the pad edge -> stop, lift, re-centre, continue.
    function submovement(dx, dy) {
      st.nSub++;
      var guard = 0;
      while (guard++ < 60 && st.T < CAP_S) {
        var D = Math.max(0.12, 1.875 * Math.hypot(dx, dy) / tr.vPeak);
        if (Math.abs(st.hp + dx) <= hw || dx === 0) { emitMove(dx, dy, D, 1); st.hp += dx; return; }
        var edge = sign(dx) * hw, sStar = (edge - st.hp) / dx;
        emitMove(dx, dy, D, sStar);                              // stops at the edge
        st.lifts++;
        var tl = Math.max(0.06, tr.tLift * (1 + 0.15 * G()));     // lift: no samples
        st.T += tl;
        st.k = Math.max(st.k, Math.ceil(st.T / DT - 1e-9));
        st.hp = -sign(dx) * 0.85 * hw;                             // re-centred on the opposite side
        dx *= (1 - sStar); dy *= (1 - sStar);
      }
    }

    // Rule 1
    holdUntil(Math.max(0.1, tr.rt * (1 + 0.1 * G())));

    // Rule 2: primary submovement
    var needX = tx - st.cx, needY = ty - st.cy, A = Math.hypot(needX, needY);
    if (A > tr.reachCm) holdUntil(st.T + 0.06);                    // joint-switch delay
    var sdP = Math.sqrt(tr.sigma0 * tr.sigma0 + Math.pow(tr.k * A, 2));
    var exP = G() * sdP, eyP = G() * tr.sigma0;
    submovement(needX + exP, needY + eyP);

    // Rules 4 + 5: corrections and click
    var err = Math.hypot(st.cx - tx, st.cy - ty), hit = false, doneT = CAP_S, misses = 0, clicks = [], corr = 0;
    while (st.T < CAP_S) {
      if (err <= wCm) {                                            // rule 5
        if (st.T + 0.03 > CAP_S) break;
        holdUntil(st.T + 0.03);
        clicks.push({ t: st.T, hit: true }); hit = true; doneT = st.T; break;
      }
      if (corr > 0 && err <= 2 * wCm && R() < 0.1) { clicks.push({ t: st.T, hit: false }); misses++; }   // premature click
      if (corr >= MAX_CORR) break;
      holdUntil(st.T + 0.4 * tr.tSub);                              // visual processing
      if (st.T >= CAP_S) break;
      var sdC = Math.sqrt(tr.sigma0 * tr.sigma0 + Math.pow(tr.k * err, 2));
      var nx = tx - st.cx + G() * sdC, ny = ty - st.cy + G() * tr.sigma0;
      var Dc = Math.max(0.08, tr.tSub);
      st.nSub++; corr++;
      if (Math.abs(st.hp + nx) <= hw) { emitMove(nx, ny, Dc, 1); st.hp += nx; } else { st.nSub--; submovement(nx, ny); }
      err = Math.hypot(st.cx - tx, st.cy - ty);
    }
    if (!hit) { holdUntil(CAP_S); doneT = CAP_S; clicks.push({ t: Math.min(st.T, CAP_S), hit: false }); misses++; }

    // trim to done (hit) so the last sample is the click
    var n = st.t.length;
    while (n > 1 && st.t[n - 1] > doneT + 1e-9) n--;
    var traj = {
      t: st.t.slice(0, n), x: st.x.slice(0, n), y: st.y.slice(0, n),
      cm: cm, targetDeg: spec.targetDeg, targetYaw: spec.angleDeg, targetPitch: spec.pitchDeg || 0,
      done: doneT, clicks: clicks
    };
    return {
      traj: traj,
      summary: {
        time: doneT, hit: hit, nSub: st.nSub, lifts: st.lifts, peakCmS: st.peak,
        endErrDeg: err / cm * 360, misses: misses, firstErrCm: exP, firstSdCm: sdP
      }
    };
  }

  /* =========================================================================
   * Track task: rule 6
   * ========================================================================= */
  function runTrack(tr, spec, R) {
    var G = makeGauss(R), cm = spec.cm, dur = spec.durationS || 2.5, degPerCm = 360 / cm;
    var half = spec.targetDeg / 2, speed = Math.abs(spec.strafeDegS || 0);
    var pitch = spec.pitchDeg || 0;

    // target path: piecewise linear yaw with reversals every 0.4-0.9 s
    var bt = [0], bp = [spec.angleDeg], bv = [spec.strafeDegS || 0], tt = 0;
    while (tt < dur + 1) {
      tt += 0.4 + 0.5 * R();
      bp.push(bp[bp.length - 1] + bv[bv.length - 1] * (tt - bt[bt.length - 1]));
      bt.push(tt); bv.push(-bv[bv.length - 1]);
    }
    function seg(t) { var i = 0; while (i + 1 < bt.length && bt[i + 1] <= t) i++; return i; }
    function yawAt(t) { if (t < 0) t = 0; var i = seg(t); return bp[i] + bv[i] * (t - bt[i]); }
    function velAt(t) { if (t < 0) t = 0; return bv[seg(t)]; }

    var delay = 0.15, Kp = 8, floorCm = tr.sigma0 * 1.25, tauN = 0.05;
    var n = Math.round(dur / DT), T = [], X = [], Y = [], clicks = [];
    var cx = 0, cy = 0, nx = 0, ny = 0, velErr = 0, nextRenew = 0, onT = 0, peak = 0, nextClick = 0.1;
    for (var i = 0; i <= n; i++) {
      var t = i * DT, td = Math.max(0, t - delay);
      if (t >= nextRenew - 1e-12) { velErr = 0.1 * speed * G(); nextRenew += 0.15; }
      var ref = yawAt(td) + velAt(td) * delay;                    // predictive reference from delayed view
      var v = velAt(td) + velErr + Kp * (ref - cx * degPerCm);   // deg/s
      var vy = Kp * (pitch - cy * degPerCm);
      var sp = Math.hypot(v, vy) / degPerCm; if (sp > peak) peak = sp;
      // Ornstein-Uhlenbeck position noise: stationary SD = floorCm, correlation time 50 ms
      var a = Math.sqrt(2 * DT / tauN);
      nx += -nx * DT / tauN + floorCm * a * G();
      ny += -ny * DT / tauN + floorCm * a * G();
      var X1 = cx + nx, Y1 = cy + ny;
      T.push(t); X.push(X1); Y.push(Y1);
      var on = Math.hypot(X1 * degPerCm - yawAt(t), Y1 * degPerCm - pitch) < half;
      if (on) onT++;
      if (t >= nextClick - 1e-9 && nextClick <= dur + 1e-9) { clicks.push({ t: t, hit: on }); nextClick += 0.1; }
      cx += v / degPerCm * DT; cy += vy / degPerCm * DT;
    }
    var frac = onT / (n + 1);
    var traj = {
      t: T, x: X, y: Y, cm: cm, targetDeg: spec.targetDeg, targetYaw: yawAt, targetPitch: pitch,
      done: dur, clicks: clicks
    };
    return {
      traj: traj,
      summary: {
        time: Math.min(10, 0.25 / Math.max(frac, 0.05)), hit: frac > 0, nSub: 0, lifts: 0, peakCmS: peak,
        endErrDeg: Math.hypot(X[n] * degPerCm - yawAt(dur), Y[n] * degPerCm - pitch), onTargetFraction: frac
      }
    };
  }

  return {
    TRUTH_DEFAULTS: TRUTH_DEFAULTS, TRUTH_RANGES: TRUTH_RANGES,
    randomTruth: randomTruth, createPlayer: createPlayer
  };
});
