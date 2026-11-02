/*
 * valoSens aim-test logic v1.0.0 (pure logic, no DOM).
 *
 * Test design (levels, balanced Latin-square schedule, adaptive level choice), screen geometry,
 * trajectory feature extraction, conversion to calibration trials, DPI / pad / reach checks and
 * personal motor-parameter estimation. Units: cm/360, cm of mouse travel, degrees, seconds.
 * Formats are fixed in .claude/delegation/v1-engine-v6/CONTRACTS.md.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ValoAim = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var VERSION = "1.0.0";
  var HEAD_DEG = 0.716;
  var FOV_H = 103;
  var TAN_HALF = Math.tan(FOV_H / 2 * Math.PI / 180);
  var TASKS = ["micro", "flick", "turn", "track"];
  var LIFT_GAP = 0.06;          // s, a gap in samples at least this long is a mouse lift
  var V_MIN = 2;                // cm/s, minimum peak speed of a submovement
  var DIP = 0.3;                // a submovement ends at a minimum below this fraction of the smaller neighbour peak
  var SMOOTH_S = 0.015;         // moving-average window of the velocity
  var TIMEOUT = 4;              // s, static-trial timeout
  var CM_MIN = 8, CM_MAX = 160;

  /* ---------------- helpers ---------------- */
  function mean(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s / a.length; }
  function sd(a) {
    if (a.length < 2) return 0;
    var m = mean(a), s = 0;
    for (var i = 0; i < a.length; i++) s += (a[i] - m) * (a[i] - m);
    return Math.sqrt(s / (a.length - 1));
  }
  function sorted(a) { return a.slice().sort(function (x, y) { return x - y; }); }
  function median(a) { var b = sorted(a), n = b.length; return n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2; }
  function quantile(a, q) {
    var b = sorted(a), p = (b.length - 1) * q, lo = Math.floor(p), hi = Math.ceil(p);
    return b[lo] + (b[hi] - b[lo]) * (p - lo);
  }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function isNum(x) { return typeof x === "number" && isFinite(x); }
  function corr(a, b) {
    var ma = mean(a), mb = mean(b), sab = 0, saa = 0, sbb = 0;
    for (var i = 0; i < a.length; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) * (a[i] - ma); sbb += (b[i] - mb) * (b[i] - mb); }
    return saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : 0;
  }
  // Same mulberry32 algorithm as model.js.
  function rng(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0; var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function bootSd(items, stat, seed, B) {
    var r = rng(seed), vals = [], n = items.length;
    for (var b = 0; b < B; b++) {
      var s = new Array(n);
      for (var i = 0; i < n; i++) s[i] = items[Math.floor(r() * n)];
      var v = stat(s);
      if (isNum(v)) vals.push(v);
    }
    return vals.length > 1 ? sd(vals) : 0;
  }

  /* ---------------- geometry ---------------- */
  function degPerCm(cm360) { return 360 / cm360; }
  function screenX(yawDeg, widthPx) {
    if (!(Math.abs(yawDeg) < 90)) return null;
    return widthPx / 2 + (widthPx / 2) * Math.tan(yawDeg * Math.PI / 180) / TAN_HALF;
  }
  function screenY(pitchDeg, widthPx, heightPx) {
    if (!(Math.abs(pitchDeg) < 90)) return null;
    var focal = (widthPx / 2) / TAN_HALF;           // same focal length as x (square pixels)
    return heightPx / 2 - focal * Math.tan(pitchDeg * Math.PI / 180);
  }

  /* ---------------- test design ---------------- */
  function levelsAround(cmCentre, n, spanOct) {
    n = n == null ? 5 : n; spanOct = spanOct == null ? 1.0 : spanOct;   // v6: ±1 octave (planner scorecard check: ±0.6 left the true optimum outside the tested range for 25% of simulated players)
    var out = [];
    for (var i = 0; i < n; i++) {
      var t = n > 1 ? -1 + 2 * i / (n - 1) : 0;
      out.push(clamp(cmCentre * Math.pow(2, t * spanOct), CM_MIN, CM_MAX));
    }
    return out.sort(function (a, b) { return a - b; });
  }

  // Williams sequence 0,1,n-1,2,n-2,... shifted by the row index.
  function latinRow(n, row) {
    var seq = [0], lo = 1, hi = n - 1;
    while (seq.length < n) { seq.push(lo++); if (seq.length < n) seq.push(hi--); }
    return seq.map(function (v) { return (v + row) % n; });
  }
  function blockSequence(n, seed) {
    var s = (seed == null ? 1 : seed) >>> 0, row = s % n, seq = latinRow(n, row);
    if (n % 2 === 1 && Math.floor(s / n) % 2 === 1) seq.reverse();     // odd n: the row's mirror on alternate seeds
    return seq;
  }
  function shuffle(a, r) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function geometry(task, k, flip, r) {
    function u(a, b) { return a + (b - a) * r(); }
    function sgn() { return r() < 0.5 ? -1 : 1; }
    var g = { angleDeg: 0, pitchDeg: 0, targetDeg: HEAD_DEG, strafeDegS: 0 };
    if (task === "micro") { g.angleDeg = sgn() * u(1, 4); g.pitchDeg = sgn() * u(0, 1.5); }
    else if (task === "flick") { g.angleDeg = sgn() * u(15, 40); g.pitchDeg = sgn() * u(0, 1.5); }
    else if (task === "turn") { g.angleDeg = sgn() * (((k + flip) % 2) ? 180 : 90); g.targetDeg = 2.0; }
    else { g.angleDeg = sgn() * u(0, 2); g.strafeDegS = sgn() * 15.5; g.durationS = 2.5; }
    return g;
  }
  function schedule(o) {
    var levels = o.levels, n = levels && levels.length;
    if (!n) throw new RangeError("schedule: levels must be a non-empty array");
    var per = o.perLevel || {}, warm = o.warmupPerBlock == null ? 2 : o.warmupPerBlock;
    var r = rng(o.seed == null ? 1 : o.seed), session = o.session == null ? "s1" : String(o.session);
    var seq = o.blockOrder ? o.blockOrder.slice() : blockSequence(n, o.seed);
    var order = 0, blocks = [];
    seq.forEach(function (li, bi) {
      var cm = levels[li], items = [];
      TASKS.forEach(function (task) {
        var c = per[task] | 0, flip = r() < 0.5 ? 0 : 1;
        for (var i = 0; i < c; i++) items.push({ task: task, k: i, flip: flip });
      });
      shuffle(items, r);
      var specs = items.map(function (it, j) {
        var g = geometry(it.task, it.k, it.flip, r);
        var sp = { id: session + "-" + order, task: it.task, cm: cm, angleDeg: g.angleDeg, pitchDeg: g.pitchDeg,
          targetDeg: g.targetDeg, strafeDegS: g.strafeDegS };
        if (g.durationS) sp.durationS = g.durationS;
        sp.session = session; sp.block = bi; sp.order = order; sp.warmup = j < warm;
        order++;
        return sp;
      });
      blocks.push({ block: bi, cm: cm, specs: specs });
    });
    return blocks;
  }
  function nextLevel(candidates, stats, density) {
    var lm = Math.log(median(candidates)), best = null, bestScore = -Infinity, bestDist = Infinity;
    stats = stats || {};
    candidates.forEach(function (cm) {
      var score = density(cm) / Math.sqrt(1 + (stats[cm] || 0)), dist = Math.abs(Math.log(cm) - lm);
      if (score > bestScore + 1e-12 || (Math.abs(score - bestScore) <= 1e-12 && dist < bestDist)) { best = cm; bestScore = score; bestDist = dist; }
    });
    return best;
  }

  /* ---------------- feature extraction ---------------- */
  function valAt(v, t) { return typeof v === "function" ? v(t) : (v || 0); }

  // Segment-wise smoothed 2-D speed. Returns { sp, segs: [[start, end]] } (end inclusive).
  function speedProfile(t, x, y) {
    var n = t.length, segs = [], s0 = 0, i;
    for (i = 1; i < n; i++) if (t[i] - t[i - 1] >= LIFT_GAP - 1e-9) { segs.push([s0, i - 1]); s0 = i; }
    if (n) segs.push([s0, n - 1]);
    var vx = new Array(n), vy = new Array(n), sp = new Array(n);
    segs.forEach(function (sg) {
      var s = sg[0], e = sg[1];
      for (var k = s; k <= e; k++) {
        var a = Math.max(s, k - 1), b = Math.min(e, k + 1), dt = t[b] - t[a];
        vx[k] = dt > 0 ? (x[b] - x[a]) / dt : 0; vy[k] = dt > 0 ? (y[b] - y[a]) / dt : 0;
      }
      for (k = s; k <= e; k++) {
        var lo = k, hi = k;
        while (lo > s && t[k] - t[lo - 1] <= SMOOTH_S / 2 + 1e-9) lo--;
        while (hi < e && t[hi + 1] - t[k] <= SMOOTH_S / 2 + 1e-9) hi++;
        var sx = 0, sy = 0;
        for (var j = lo; j <= hi; j++) { sx += vx[j]; sy += vy[j]; }
        sx /= hi - lo + 1; sy /= hi - lo + 1;
        sp[k] = Math.sqrt(sx * sx + sy * sy);
      }
    });
    return { sp: sp, segs: segs };
  }

  // Submovements across all segments: [{ start, end, peak, durS }] (sample indices).
  function submovements(t, sp, segs) {
    var all = [];
    segs.forEach(function (sg) {
      var s = sg[0], e = sg[1], peaks = [], k;
      for (k = s; k <= e; k++) {
        if (sp[k] > V_MIN && (k === s || sp[k] > sp[k - 1]) && (k === e || sp[k] >= sp[k + 1])) peaks.push(k);
      }
      var subs = [];
      peaks.forEach(function (p) {
        if (!subs.length) { subs.push({ peak: p }); return; }
        var last = subs[subs.length - 1], mi = last.peak;
        for (var q = last.peak; q <= p; q++) if (sp[q] < sp[mi]) mi = q;
        if (sp[mi] < DIP * Math.min(sp[last.peak], sp[p])) { last.end = mi; subs.push({ peak: p, start: mi }); }
        else if (sp[p] > sp[last.peak]) last.peak = p;
      });
      subs.forEach(function (sb, i) {
        if (sb.start == null) { var a = sb.peak; while (a > s && sp[a - 1] > V_MIN) a--; sb.start = a; }
        // End: speed falls below 5% of this submovement's peak (floor 0.05 cm/s). A fixed 2 cm/s cut clipped the slow
        // tail of small corrections and inflated endpoint scatter (planner check vs sim/player.js, wave 3).
        if (sb.end == null) { var b = sb.peak, thr = Math.max(0.05, 0.05 * sp[sb.peak]); while (b < e && sp[b] > thr) b++; sb.end = b; }
        sb.durS = t[sb.end] - t[sb.start];
        all.push(sb);
      });
    });
    return all;
  }

  function features(traj, spec) {
    var t = traj.t || [], x = traj.x || [], y = traj.y || [], n = t.length, i;
    var cm = traj.cm, k = 360 / cm, task = spec && spec.task, isTrack = task === "track";
    var targetDeg = traj.targetDeg != null ? traj.targetDeg : (spec && spec.targetDeg) || HEAD_DEG;
    var half = targetDeg / 2, done = traj.done;

    // lifts
    var liftTimes = [];
    for (i = 1; i < n; i++) { var gap = t[i] - t[i - 1]; if (gap >= LIFT_GAP - 1e-9) liftTimes.push(gap); }

    // velocity and submovements
    var prof = speedProfile(t, x, y), subs = submovements(t, prof.sp, prof.segs), sp = prof.sp;
    var peakCmS = 0;
    for (i = 0; i < n; i++) if (sp[i] > peakCmS) peakCmS = sp[i];
    var primaryAmpCm = 0, primaryErrCm = null;
    if (subs.length) {
      var p = subs[0];
      primaryAmpCm = Math.abs(x[p.end] - x[p.start]);
      primaryErrCm = x[p.end] - valAt(traj.targetYaw, t[p.end]) * cm / 360;
    }
    var subDurS = subs.map(function (s) { return s.durS; });

    // path efficiency (2-D, cm)
    var path = 0;
    for (i = 1; i < n; i++) path += Math.sqrt((x[i] - x[i - 1]) * (x[i] - x[i - 1]) + (y[i] - y[i - 1]) * (y[i] - y[i - 1]));
    var net = n ? Math.sqrt((x[n - 1] - x[0]) * (x[n - 1] - x[0]) + (y[n - 1] - y[0]) * (y[n - 1] - y[0])) : 0;
    var pathEff = path > 0 ? Math.min(1, net / path) : 1;

    // end error: crosshair-to-target angular distance at the last sample not after `done`
    var endErrDeg = 0, ei = n - 1;
    while (ei > 0 && t[ei] > done + 1e-9) ei--;
    if (n) endErrDeg = Math.sqrt(Math.pow(x[ei] * k - valAt(traj.targetYaw, t[ei]), 2) + Math.pow(y[ei] * k - valAt(traj.targetPitch, t[ei]), 2));

    // overshoots (static targets): crossings beyond the target centre by more than half the width
    var overshoots = 0;
    if (!isTrack && n) {
      var T0 = valAt(traj.targetYaw, 0), s = T0 < 0 ? -1 : 1, armed = true;
      for (i = 0; i < n; i++) {
        var u = s * (x[i] * k - T0);
        if (armed && u > half) { overshoots++; armed = false; }
        else if (!armed && u <= 0) armed = true;
      }
    }

    // clicks, hit, misses, time
    var clicks = (traj.clicks || []).slice().sort(function (a, b) { return a.t - b.t; });
    var firstHit = null, misses = 0;
    for (i = 0; i < clicks.length; i++) { if (clicks[i].hit) { firstHit = clicks[i]; break; } misses++; }
    var hit, time, onTarget;
    if (isTrack) {
      var on = 0;
      for (i = 0; i < n; i++) {
        var dy = x[i] * k - valAt(traj.targetYaw, t[i]), dp = y[i] * k - valAt(traj.targetPitch, t[i]);
        if (Math.sqrt(dy * dy + dp * dp) < half) on++;
      }
      onTarget = n ? on / n : 0;
      hit = onTarget > 0; misses = 0;
      time = Math.min(10, 0.25 / Math.max(onTarget, 0.05));
    } else {
      hit = !!firstHit;
      time = hit ? done : TIMEOUT;
    }

    var f = { time: time, hit: hit, misses: misses, overshoots: overshoots, endErrDeg: endErrDeg, nSub: subs.length,
      peakCmS: peakCmS, pathEff: pathEff, lifts: liftTimes.length, liftTimes: liftTimes,
      primaryAmpCm: primaryAmpCm, primaryErrCm: primaryErrCm, subDurS: subDurS };
    if (isTrack) f.onTarget = onTarget;
    return f;
  }

  function toTrial(spec, feat, extra) {
    var tr = { cm: spec.cm, task: spec.task, time: feat.time, misses: feat.misses, overshoots: feat.overshoots,
      session: spec.session, order: spec.order,
      hit: feat.hit, angleDeg: spec.angleDeg, targetDeg: spec.targetDeg, endErrDeg: feat.endErrDeg, nSub: feat.nSub,
      peakCmS: feat.peakCmS, pathEff: feat.pathEff, lifts: feat.lifts, droppedFrames: 0, warmup: !!spec.warmup };
    if (extra) for (var key in extra) if (Object.prototype.hasOwnProperty.call(extra, key)) tr[key] = extra[key];
    return tr;
  }

  /* ---------------- hardware checks ---------------- */
  // Returns null when there are no usable samples. n and countsPerCmSd are extras for estimatePersonal.
  function dpiCheck(samples, statedDpi) {
    var s = (samples || []).filter(function (q) { return q && q.cm > 0 && isNum(q.counts) && q.durS > 0; });
    if (!s.length) return null;
    var cpc = s.map(function (q) { return q.counts / q.cm; }), speed = s.map(function (q) { return q.cm / q.durS; });
    var m = mean(cpc), sdv = sd(cpc), cv = m > 0 ? sdv / m : 0;
    var countsPerCm = median(cpc), effDpi = countsPerCm * 2.54;
    var c = cv < 1e-9 ? 0 : corr(cpc, speed);          // guard: rounding noise on exact data is not a trend
    return { countsPerCm: countsPerCm, effDpi: effDpi, ratio: statedDpi > 0 ? effDpi / statedDpi : NaN, cv: cv,
      consistent: cv < 0.05, accelSuspect: s.length >= 3 && Math.abs(c) > 0.6, n: s.length, countsPerCmSd: sdv / Math.sqrt(s.length) };
  }
  function swipeStat(swipes) {
    var v = (swipes || []).map(function (q) { return q && q.cm; }).filter(function (c) { return isNum(c) && c > 0; });
    if (!v.length) return null;
    return { value: median(v), sd: sd(v) / Math.sqrt(v.length), n: v.length };
  }
  function padCheck(swipes) { return swipeStat(swipes); }
  function reachCheck(swipes) { return swipeStat(swipes); }

  /* ---------------- personal parameters ---------------- */
  // Binned least squares of E[err^2] = sigma0^2 + k^2 A^2 on (A^2, err^2); needs >= 8 trials, bins of >= 8.
  function fitSigma0(pairs) {
    if (pairs.length < 8) return NaN;
    var b = pairs.slice().sort(function (p, q) { return p.A - q.A; });
    var nb = Math.max(1, Math.min(4, Math.floor(b.length / 8))), bins = [], i, j;
    for (i = 0; i < nb; i++) {
      var lo = Math.floor(i * b.length / nb), hi = Math.floor((i + 1) * b.length / nb), xa = 0, ya = 0;
      for (j = lo; j < hi; j++) { xa += b[j].A * b[j].A; ya += b[j].e * b[j].e; }
      bins.push({ x: xa / (hi - lo), y: ya / (hi - lo), w: hi - lo });
    }
    var sw = 0, mx = 0, my = 0;
    bins.forEach(function (q) { sw += q.w; mx += q.w * q.x; my += q.w * q.y; });
    mx /= sw; my /= sw;
    var sxx = 0, sxy = 0;
    bins.forEach(function (q) { sxx += q.w * (q.x - mx) * (q.x - mx); sxy += q.w * (q.x - mx) * (q.y - my); });
    var slope = nb >= 2 && sxx > 0 ? Math.max(0, sxy / sxx) : 0;    // a negative k^2 is not physical
    return Math.sqrt(Math.max(my - slope * mx, 1e-6));
  }

  function estimatePersonal(records, extras) {
    records = (records || []).filter(function (q) { return q && q.spec && q.feat && !q.spec.warmup; });
    extras = extras || {};
    var out = {}, MIN = 3;
    function medEntry(vals) {
      return { value: median(vals), sd: bootSd(vals, median, 7, 200), n: vals.length };
    }

    var pairs = [];
    records.forEach(function (q) {
      if (q.spec.task === "micro" && isNum(q.feat.primaryErrCm) && isNum(q.feat.primaryAmpCm)) pairs.push({ A: q.feat.primaryAmpCm, e: q.feat.primaryErrCm });
    });
    if (pairs.length >= 8) out.sigma0 = { value: fitSigma0(pairs), sd: bootSd(pairs, fitSigma0, 11, 200), n: pairs.length };

    var subDur = [], vTurn = [], lifts = [];
    records.forEach(function (q) {
      var f = q.feat;
      if ((q.spec.task === "micro" || q.spec.task === "flick") && f.subDurS) for (var i = 1; i < f.subDurS.length; i++) if (isNum(f.subDurS[i])) subDur.push(f.subDurS[i]);
      if (q.spec.task === "turn" && isNum(f.peakCmS)) vTurn.push(f.peakCmS);
      if (f.liftTimes) for (var j = 0; j < f.liftTimes.length; j++) if (isNum(f.liftTimes[j])) lifts.push(f.liftTimes[j]);
    });
    if (subDur.length >= MIN) out.tSub = medEntry(subDur);
    if (vTurn.length >= MIN) out.vPeak = { value: quantile(vTurn, 0.9), sd: bootSd(vTurn, function (a) { return quantile(a, 0.9); }, 13, 200), n: vTurn.length };
    if (lifts.length >= MIN) out.tLift = medEntry(lifts);

    if (extras.reach) out.reachCm = { value: extras.reach.value, sd: extras.reach.sd, n: extras.reach.n };
    if (extras.pad) out.padCm = { value: extras.pad.value, sd: extras.pad.sd, n: extras.pad.n };
    if (extras.dpi) {
      out.countsPerCm = { value: extras.dpi.countsPerCm, sd: extras.dpi.countsPerCmSd || 0, n: extras.dpi.n || 0 };
      out.accel = { suspect: !!extras.dpi.accelSuspect, ratio: extras.dpi.ratio };
    }
    return out;
  }

  return {
    VERSION: VERSION, HEAD_DEG: HEAD_DEG, FOV_H: FOV_H,
    degPerCm: degPerCm, screenX: screenX, screenY: screenY,
    levelsAround: levelsAround, schedule: schedule, nextLevel: nextLevel,
    features: features, toTrial: toTrial,
    dpiCheck: dpiCheck, padCheck: padCheck, reachCheck: reachCheck, estimatePersonal: estimatePersonal,
    _rng: rng
  };
});
