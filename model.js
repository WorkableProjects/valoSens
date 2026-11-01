/*
 * valoSens model v2.
 *
 * Internal unit: cm/360 (centimetres of mouse travel per full 360° turn), written C.
 *
 * QUESTIONNAIRE PATHWAY (lower confidence, unvalidated)
 *   For each task type t in an explicit task mix, estimate the EXTRA time (seconds) a
 *   sensitivity C adds over an ideal, gain-independent movement:
 *
 *     micro   (small correction on a held angle): precision-floor corrections
 *             T = t_sub * (1 - p) / p,  p = erf( W / (2*sqrt(2)*sigma0) ),  W = C * w / 360
 *             (the hand has a constant noise floor sigma0 that does NOT shrink with sensitivity)
 *     flick   (target switch inside the field of view): NVIDIA static-flick curve
 *             T = MT_flick * kappa * log2(C / C_flick)^2      (weak lab evidence, see research/)
 *     turn90 / turn180 (large turns): reach and speed limits
 *             T = t_lift * E[lifts] + t_switch * P(travel > comfortable reach) + speed-limit delay
 *
 *   Each task is costed by exactly one mechanism, so nothing is counted twice. Fitts' law
 *   movement time is gain-invariant (amplitude and target width both scale with C), so it
 *   is not a term. The expected cost is averaged over a grid of plausible values for the
 *   guessed constants (a Bayesian decision under parameter uncertainty), which limits how
 *   much any single guess can move the answer.
 *
 * MEASURED PATHWAY (optional)
 *   Repeated trials at several sensitivities are fitted per task with session intercepts,
 *   an order (warm-up) covariate and a quadratic in log2(C). The fit is checked on held-out
 *   trials and compared with a flat baseline, the player's current setting and the best
 *   raw tested setting. No extrapolation outside the tested range.
 *
 * RECOMMENDATION RULE (both pathways)
 *   Near-optimal set N = { C : cost(C) <= min cost + tolerance }. If the current setting is
 *   in N (satisfaction may widen the tolerance by up to 2x for staying), keep it. Otherwise
 *   recommend the point of N closest (in log space) to the current setting. Without a
 *   current setting, recommend the minimum.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ValoModel = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* =========================================================================
   * Conversions (see research/constants_and_ergonomics.md)
   * cm/360 = 360 * 2.54 / (DPI * sens * yaw)   [yaw = degrees per count at sens 1]
   * ========================================================================= */
  var YAW = 0.07;                                   // Valorant, community-verified
  // Only games whose sensitivity is a clean linear yaw. Not supported: Fortnite (percentage scale),
  // Rainbow Six Siege (depends on a multiplier), Deadlock, Marvel Rivals, The Finals (inconsistent sources).
  var GAME_YAW = { valorant: 0.07, cs2: 0.022, apex: 0.022, ow2: 0.0066, cod: 0.0066 };
  var OTHER_YAW = { cs2: GAME_YAW.cs2, apex: GAME_YAW.apex, ow2: GAME_YAW.ow2 };
  var K = 360 * 2.54 / YAW;                         // cm/360 = K / (DPI * sens) for Valorant
  var LIMITS = { dpiMin: 50, dpiMax: 50000, sensMin: 0.001, sensMax: 100, valSensMin: 0.01, valSensMax: 10, cmMin: 1, cmMax: 1000 };

  function finitePos(x) { return typeof x === "number" && isFinite(x) && x > 0; }
  function yawOf(game) { return GAME_YAW[game || "valorant"]; }
  function validDpi(d) { return finitePos(d) && d >= LIMITS.dpiMin && d <= LIMITS.dpiMax; }
  function validCm(c) { return finitePos(c) && c >= LIMITS.cmMin && c <= LIMITS.cmMax; }

  /* Lenient conversions: return NaN for invalid input (safe inside UI validation checks). */
  function cmFrom(dpi, sens, game) {
    var y = yawOf(game);
    if (!finitePos(dpi) || !finitePos(sens) || !y) return NaN;
    return 360 * 2.54 / (dpi * sens * y);
  }
  function sensFor(cm, dpi, game) {
    var y = yawOf(game);
    if (!finitePos(cm) || !finitePos(dpi) || !y) return NaN;
    return 360 * 2.54 / (cm * dpi * y);
  }
  function edpiFor(cm) { return finitePos(cm) ? K / cm : NaN; }
  /* Strict conversion: throws on invalid input. */
  function toCm(o) {
    if (!o || typeof o !== "object") throw new TypeError("toCm expects { dpi, sens, game }");
    if (!yawOf(o.game)) throw new RangeError("Unsupported game: " + o.game);
    if (!validDpi(o.dpi)) throw new RangeError("DPI must be between " + LIMITS.dpiMin + " and " + LIMITS.dpiMax);
    var val = (o.game || "valorant") === "valorant";
    var sMin = val ? LIMITS.valSensMin : LIMITS.sensMin, sMax = val ? LIMITS.valSensMax : LIMITS.sensMax;
    if (!finitePos(o.sens) || o.sens < sMin || o.sens > sMax) throw new RangeError("Sensitivity must be between " + sMin + " and " + sMax);
    return cmFrom(o.dpi, o.sens, o.game);
  }
  function convert(o) {      // { dpi, sens, from, to, toDpi } -> sens in target game
    var cm = toCm({ dpi: o.dpi, sens: o.sens, game: o.from });
    var d2 = o.toDpi || o.dpi;
    if (!validDpi(d2)) throw new RangeError("Target DPI out of range");
    if (!yawOf(o.to)) throw new RangeError("Unsupported game: " + o.to);
    return sensFor(cm, d2, o.to);
  }

  /* =========================================================================
   * Small numeric helpers
   * ========================================================================= */
  function mean(a) { return a.reduce(function (s, x) { return s + x; }, 0) / a.length; }
  function sd(a) { var m = mean(a); return Math.sqrt(a.reduce(function (s, x) { return s + (x - m) * (x - m); }, 0) / Math.max(1, a.length - 1)); }
  function median(a) { var b = a.slice().sort(function (x, y) { return x - y; }); var n = b.length; return n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2; }
  function quantile(a, q) {
    var b = a.slice().sort(function (x, y) { return x - y; });
    var p = (b.length - 1) * q, lo = Math.floor(p), hi = Math.ceil(p);
    return b[lo] + (b[hi] - b[lo]) * (p - lo);
  }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function log2(x) { return Math.log(x) / Math.LN2; }
  // erf: Abramowitz & Stegun 7.1.26 (|error| < 1.5e-7)
  function erf(x) {
    var s = x < 0 ? -1 : 1; x = Math.abs(x);
    var t = 1 / (1 + 0.3275911 * x);
    var y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  }
  // Regularized incomplete beta (Numerical Recipes continued fraction), for the F-test p-value.
  function lgamma(x) {
    var c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    var y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t); var ser = 1.000000000190015;
    for (var j = 0; j < 6; j++) ser += c[j] / ++y;
    return -t + Math.log(2.5066282746310005 * ser / x);
  }
  function betacf(a, b, x) {
    var qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d; var h = d;
    for (var m = 1; m <= 200; m++) {
      var m2 = 2 * m, aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d;
      var del = d * c; h *= del; if (Math.abs(del - 1) < 3e-12) break;
    }
    return h;
  }
  function ibeta(x, a, b) {
    if (x <= 0) return 0; if (x >= 1) return 1;
    var bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  }
  function fPValue(F, d1, d2) { return F <= 0 ? 1 : ibeta(d2 / (d2 + d1 * F), d2 / 2, d1 / 2); }
  function normCdf(z) { return 0.5 * (1 + erf(z / Math.SQRT2)); }
  // Deterministic PRNG (mulberry32) so bootstraps are reproducible.
  function rng(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0; var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* =========================================================================
   * Pro comparison group (NOT a calibration target). Filled from research/pro_data_audit.json.
   * ========================================================================= */
  var PRO_DATA = { generated: null, verifiedOn: null, sources: [] };
  var PROS_ALL = [];        // every audited row, including creators and rows with issues
  var PROS = [];            // comparison group: active pros with usable settings
  var PRO_STATS = null;
  function setPros(rows, meta) {
    PROS_ALL = rows.map(function (r) {
      var cm = cmFrom(r.dpi, r.sens);
      return {
        name: r.name, dpi: r.dpi, sens: r.sens, edpi: r.dpi * r.sens, cm: cm,
        role: r.role || null, roleConfidence: r.roleConfidence || null, status: r.status || "unknown",
        team: r.team || null, settingsConflict: !!r.settingsConflict, settingsStale: !!r.settingsStale,
        include: r.include !== false, excludeReason: r.excludeReason || null,
        source: r.source || null, verified: r.verified || null
      };
    });
    PROS = PROS_ALL.filter(function (p) { return p.include && isFinite(p.cm); });
    var cms = PROS.map(function (p) { return p.cm; });
    var logs = cms.map(Math.log);
    PRO_STATS = {
      n: PROS.length, nAll: PROS_ALL.length,
      medianCm: Math.exp(median(logs)),
      q1Cm: quantile(cms, 0.25), q3Cm: quantile(cms, 0.75),
      logMean: mean(logs), logSd: sd(logs),
      medianEdpi: median(PROS.map(function (p) { return p.edpi; }))
    };
    if (meta) { PRO_DATA.generated = meta.generated || null; PRO_DATA.verifiedOn = meta.verifiedOn || null; PRO_DATA.sources = meta.sources || []; }
    api.PROS = PROS; api.PROS_ALL = PROS_ALL; api.PRO_STATS = PRO_STATS;
  }

  /* =========================================================================
   * Assumptions. basis: "measured" | "research" (supported by cited work) | "estimate".
   * low/high are the plausible range used for uncertainty averaging and sensitivity checks.
   * ========================================================================= */
  var PARAMS = {
    sigma0:   { central: 0.020, low: 0.010, high: 0.040, unit: "cm",  basis: "research",
                note: "Constant hand noise floor at the final stop: ~0.2 mm control limit (Casiez et al. 2008), 0.05–0.2 mm tremor constant (Chapuis & Dragicevic 2011). High end allows for noisier stops under time pressure." },
    tSub:     { central: 0.15,  low: 0.10,  high: 0.25,  unit: "s",   basis: "research",
                note: "Duration of one corrective submovement (submovements of roughly 100–250 ms, Meyer et al. 1988)." },
    headM:    { central: 0.25,  low: 0.20,  high: 0.30,  unit: "m",   basis: "estimate",
                note: "Head hitbox width. Riot does not publish it." },
    kappa:    { central: 0.035, low: 0.015, high: 0.05,  unit: "/oct²", basis: "research",
                note: "Flick-time penalty per squared octave from the best setting, read off NVIDIA's group curve (N=13, static flicks). Weak evidence." },
    cFlick:   { central: 40,    low: 28,    high: 57,    unit: "cm",  basis: "research",
                note: "Best tested setting for hard flicks in NVIDIA's study (grid points 20/40/80, so ±0.5 octave)." },
    mtFlick:  { central: 0.50,  low: 0.40,  high: 0.65,  unit: "s",   basis: "research",
                note: "Typical flick completion time at the best setting in NVIDIA's study." },
    tLift:    { central: 0.30,  low: 0.20,  high: 0.50,  unit: "s",   basis: "estimate",
                note: "Time lost per mouse lift and re-centre." },
    tSwitch:  { central: 0.06,  low: 0.03,  high: 0.12,  unit: "s",   basis: "estimate",
                note: "Time lost when a movement exceeds the aiming joint's comfortable reach and a bigger joint takes over." },
    vPeak:    { central: 150,   low: 100,   high: 250,   unit: "cm/s", basis: "estimate",
                note: "Peak hand speed in a large turn." },
    startSpread: { central: 0.5, low: 0.2,  high: 0.8,   unit: "fraction", basis: "estimate",
                note: "How far from the pad centre the hand typically starts a turn, as a fraction of the half-width." },
    recentre: { central: 0.85,  low: 0.7,   high: 0.95,  unit: "fraction", basis: "estimate",
                note: "Share of the usable pad width gained per lift." },
    reachSd:  { central: 0.35,  low: 0.25,  high: 0.5,   unit: "log",  basis: "estimate",
                note: "Uncertainty of comfortable reach when it hasn't been measured." },
    mouseW:   { central: 6.5,   low: 6.0,   high: 7.0,   unit: "cm",  basis: "measured",
                note: "Typical mouse width, which reduces the usable pad width." },
    tolerance:{ central: 0.006, low: 0.003, high: 0.012, unit: "s",   basis: "estimate",
                note: "Extra time per engagement treated as practically negligible when defining the near-optimal range." }
  };
  // Parameters averaged over (3-point quadrature: low/central/high with weights 1/4, 1/2, 1/4).
  // These are the constants that moved the questionnaire answer most in sensitivityAnalysis().
  var UNCERTAIN = ["sigma0", "cFlick", "headM", "tSub"];

  /* Task mix: explicit assumptions, not role bonuses. theta = turn size (deg). */
  var TASKS = [
    { key: "micro",   theta: 2,   mech: "floor", label: "small correction" },
    { key: "flick",   theta: 25,  mech: "flick", label: "target switch" },
    { key: "turn90",  theta: 90,  mech: "reach", mt: 0.40, label: "90° turn" },
    { key: "turn180", theta: 180, mech: "reach", mt: 0.50, label: "180° turn" }
  ];
  var BASE_MIX = [0.40, 0.40, 0.15, 0.05];
  // Role nudges are deliberately small (no reliable role-specific evidence; see research/).
  var ROLE = {
    d: { mix: [0.37, 0.42, 0.15, 0.06], label: "Duelist" },
    i: { mix: BASE_MIX.slice(), label: "Initiator" },
    c: { mix: BASE_MIX.slice(), label: "Controller" },
    s: { mix: [0.43, 0.38, 0.15, 0.04], label: "Sentinel" },
    f: { mix: BASE_MIX.slice(), label: "Flex" }
  };
  // Weapon sets typical engagement distance (m). It only shifts the flick optimum, using NVIDIA's measured
  // elasticity (about one octave across a 16x range of target width). The micro-correction floor uses the
  // reference 20 m distance: applying the floor's ~1/width scaling to weapons would claim a much stronger
  // effect than the study measured.
  var WEAPON = {
    rifle:  { r: 20, label: "Rifle" },
    sniper: { r: 30, label: "Operator / Marshal" },
    close:  { r: 10, label: "SMG / shotgun" }
  };
  // Aiming joint -> wrist share and comfortable one-direction reach (cm) before a bigger joint takes over.
  // One-direction reach from the starting point, about half of a comfortable single swipe, since a turn can go either way:
  // wrist-only swipe ~5 cm (3.5–8; measured wrist ROM x estimated 8–12 cm lever), arm + wrist swipe ~20 cm (15–30;
  // estimate under Casiez et al.'s 30 cm no-clutch cap). Mixed styles interpolate in log space. ESTIMATES.
  var REACH_WRIST = 2.5, REACH_ARM = 10;
  var R_REF = 20;   // m, reference engagement distance (estimate)
  var LIMB = {
    wrist:   { wristShare: 0.9, label: "Wrist" },
    wf:      { wristShare: 0.6, label: "Wrist + forearm" },
    forearm: { wristShare: 0.3, label: "Forearm / elbow" },
    arm:     { wristShare: 0.1, label: "Whole arm" },
    unsure:  { wristShare: 0.5, label: "Not sure" }
  };
  Object.keys(LIMB).forEach(function (k) {
    var w = LIMB[k].wristShare;
    LIMB[k].reach = Math.exp(w * Math.log(REACH_WRIST) + (1 - w) * Math.log(REACH_ARM));
    LIMB[k].sweep = Math.round(LIMB[k].reach);       // kept for UI compatibility
  });
  // Surface labels are recorded but have no effect: no evidence links them to optimal sensitivity.
  var SURFACE = { control: { label: "Control" }, hybrid: { label: "Balanced / hybrid" }, speed: { label: "Speed" }, glass: { label: "Glass / hard" } };

  function headDeg(r, headM) { return 2 * Math.atan(headM / 2 / r) * 180 / Math.PI; }

  /* =========================================================================
   * Questionnaire cost model
   * ========================================================================= */
  function central() { var o = {}; Object.keys(PARAMS).forEach(function (k) { o[k] = PARAMS[k].central; }); return o; }

  function buildProfile(input, P) {
    var role = ROLE[input.role] ? input.role : "f";
    var limbKey = LIMB[input.limb] ? input.limb : "unsure";
    var wpn = WEAPON[input.weapon] || WEAPON.rifle;
    var usable = Math.max(2, input.pad - P.mouseW);
    var reachMeasured = finitePos(input.reachCm);
    var reach = reachMeasured ? input.reachCm : LIMB[limbKey].reach;
    var reachSd = reachMeasured ? 0.10 : P.reachSd * (limbKey === "unsure" ? 1.4 : 1);
    var w = headDeg(R_REF, P.headM), wWpn = headDeg(wpn.r, P.headM);
    return {
      mix: (input.mix && input.mix.length === 4) ? input.mix.slice()
        : (input._agentProf ? input._agentProf.mix.slice() : ROLE[role].mix.slice()),
      usable: usable, D: usable / 2, reach: reach, reachSd: reachSd, reachMeasured: reachMeasured,
      r: wpn.r, headDeg: w, sigma: P.sigma0, v: P.vPeak,
      cFlick: P.cFlick * Math.pow(wWpn / w, -0.25),    // 16x smaller target -> 1 octave slower (NVIDIA)
      P: P
    };
  }

  // Expected lifts for a movement of a cm. The distance R to the pad edge in the turn direction is uniform on
  // [half*(1-f), half*(1+f)] (start offset within +-f of centre, either direction). Lifts are counted as the
  // expected travel past the edge divided by the travel regained per lift: E[(a - R)+] / (usable * recentre).
  // This "fractional" count averages over where the hand lands after each lift. It is convex in a, and more pad
  // space lowers both its level and its slope, so extra space can never push the optimum faster.
  function expectedLifts(a, pr) {
    var half = pr.usable / 2, f = pr.P.startSpread;
    var rLo = half * (1 - f), rHi = half * (1 + f), gain = pr.usable * pr.P.recentre;
    var excess;
    if (a <= rLo) excess = 0;
    else if (a >= rHi) excess = a - half;
    else excess = (a - rLo) * (a - rLo) / (2 * (rHi - rLo));
    return excess / gain;
  }
  function pBeyondReach(a, pr) { return a <= 0 ? 0 : normCdf((Math.log(a) - Math.log(pr.reach)) / pr.reachSd); }

  function taskCost(task, C, pr) {
    var P = pr.P, a = C * task.theta / 360;
    if (task.mech === "floor") {
      var W = C * pr.headDeg / 360;
      var p = Math.max(1e-6, erf(W / (2 * Math.SQRT2 * P.sigma0)));
      return { prec: P.tSub * (1 - p) / p, trav: 0, lift: 0 };
    }
    if (task.mech === "flick") {
      var o = log2(C / pr.cFlick), v = P.mtFlick * P.kappa * o * o;
      return { prec: o < 0 ? v : 0, trav: o > 0 ? v : 0, lift: 0 };
    }
    var dur = 1.875 * a / P.vPeak;        // minimum-jerk duration at peak speed vPeak
    var speed = Math.pow(Math.pow(task.mt, 4) + Math.pow(dur, 4), 0.25) - task.mt;
    return { prec: 0, trav: speed, lift: P.tLift * expectedLifts(a, pr) + P.tSwitch * pBeyondReach(a, pr) };
  }
  function costAt(C, pr) {
    var out = { prec: 0, trav: 0, lift: 0 };
    for (var j = 0; j < TASKS.length; j++) {
      var c = taskCost(TASKS[j], C, pr), m = pr.mix[j];
      out.prec += m * c.prec; out.trav += m * c.trav; out.lift += m * c.lift;
    }
    out.total = out.prec + out.trav + out.lift;
    return out;
  }

  // Scenario grid over uncertain constants.
  function scenarios(base, keys) {
    var list = [{ P: Object.assign({}, base), w: 1 }];
    keys.forEach(function (k) {
      var next = [];
      list.forEach(function (s) {
        [["low", 0.25], ["central", 0.5], ["high", 0.25]].forEach(function (q) {
          var P = Object.assign({}, s.P); P[k] = PARAMS[k][q[0]];
          next.push({ P: P, w: s.w * q[1] });
        });
      });
      list = next;
    });
    return list;
  }

  var GRID = (function () { var g = []; for (var x = Math.log(8); x <= Math.log(160) + 1e-9; x += 0.01) g.push(Math.exp(x)); return g; })();

  function expectedCurve(input, opts) {
    opts = opts || {};
    var base = Object.assign(central(), opts.params || {});
    var scen = opts.noUncertainty ? [{ P: base, w: 1 }] : scenarios(base, (opts.uncertain || UNCERTAIN).filter(function (k) { return !(opts.params && k in opts.params); }));
    var profs = scen.map(function (s) { return { pr: buildProfile(input, s.P), w: s.w }; });
    function at(C) {
      var o = { prec: 0, trav: 0, lift: 0, total: 0 };
      profs.forEach(function (x) { var c = costAt(C, x.pr); o.prec += x.w * c.prec; o.trav += x.w * c.trav; o.lift += x.w * c.lift; o.total += x.w * c.total; });
      return o;
    }
    var vals = GRID.map(function (C) { return at(C).total; });
    var bi = 0; for (var i = 1; i < vals.length; i++) if (vals[i] < vals[bi]) bi = i;
    // golden-section refine in log space
    var lo = Math.log(GRID[Math.max(0, bi - 1)]), hi = Math.log(GRID[Math.min(GRID.length - 1, bi + 1)]);
    for (var it = 0; it < 50; it++) {
      var m1 = lo + (hi - lo) * 0.382, m2 = lo + (hi - lo) * 0.618;
      if (at(Math.exp(m1)).total < at(Math.exp(m2)).total) hi = m2; else lo = m1;
    }
    var cStar = Math.exp((lo + hi) / 2);
    return { at: at, cStar: cStar, jStar: at(cStar).total, profile: buildProfile(input, base), base: base, nScenarios: scen.length };
  }

  // Contiguous set around the minimum where cost <= jStar + tol (log-spaced grid, then refined edges).
  function nearOptimalSet(f, cStar, jStar, tol, lo, hi) {
    function edge(dir) {
      var x0 = Math.log(cStar), step = 0.01, x = x0, lim = Math.log(dir < 0 ? lo : hi);
      while ((dir < 0 ? x - step >= lim : x + step <= lim) && f(Math.exp(x + dir * step)) <= jStar + tol) x += dir * step;
      if (dir < 0 ? x - step < lim : x + step > lim) return Math.exp(x);
      var a = x, b = x + dir * step;                     // a inside, b outside
      for (var i = 0; i < 30; i++) { var m = (a + b) / 2; if (f(Math.exp(m)) <= jStar + tol) a = m; else b = m; }
      return Math.exp(a);
    }
    return [edge(-1), edge(1)];
  }
  function nearestInSet(c0, set) { return c0 < set[0] ? set[0] : c0 > set[1] ? set[1] : c0; }

  /* =========================================================================
   * Input validation
   * ========================================================================= */
  function validateInput(input) {
    if (!input || typeof input !== "object") throw new TypeError("recommend() expects an input object");
    if (!finitePos(input.pad) || input.pad < 10 || input.pad > 300) throw new RangeError("pad (usable width, cm) must be between 10 and 300");
    if (input.dpi != null && !validDpi(input.dpi)) throw new RangeError("dpi must be between " + LIMITS.dpiMin + " and " + LIMITS.dpiMax);
    if (input.current) {
      if (!validCm(input.current.cm)) throw new RangeError("current.cm must be a positive cm/360 between " + LIMITS.cmMin + " and " + LIMITS.cmMax);
    }
    if (input.satisfaction != null && !(input.satisfaction >= 1 && input.satisfaction <= 5)) throw new RangeError("satisfaction must be 1–5");
    if (input.agents != null) normaliseAgents(input.agents);
    if (input.reachCm != null && !(finitePos(input.reachCm) && input.reachCm <= 100)) throw new RangeError("reachCm must be between 0 and 100");
    if (input.mix != null) {
      if (!Array.isArray(input.mix) || input.mix.length !== 4 || input.mix.some(function (x) { return !(x >= 0); }) || Math.abs(mean(input.mix) * 4 - 1) > 1e-6)
        throw new RangeError("mix must be 4 non-negative shares summing to 1");
    }
  }

  /* =========================================================================
   * Stats: display only. Match statistics do not identify hand steadiness or the best sensitivity.
   * ========================================================================= */
  var HS_REF = { iron: 13, bronze: 20, silver: 20, gold: 20, plat: 25, diamond: 28, asc: 30, imm: 31, rad: 33, unsure: 22 };
  var KD_REF = { iron: 0.95, bronze: 0.95, silver: 0.95, gold: 1.15, plat: 1.15, diamond: 1.3, asc: 1.3, imm: 1.35, rad: 1.4, unsure: 1.0 };
  function statsSignals(st) {
    if (!st) return null;
    var rank = HS_REF[st.rank] ? st.rank : "unsure";
    var m = finitePos(st.matches) ? st.matches : null;
    return { rank: rank, matches: m, sw: m ? m / (m + 20) : 0, hsRef: HS_REF[rank], kdRef: KD_REF[rank], adrRef: 125, usedInModel: false };
  }

  /* =========================================================================
   * Measured pathway: calibration trials
   * trial = { cm, task: "micro"|"flick"|"turn", time (s), misses?, overshoots?, session?, order? }
   * ========================================================================= */
  var CAL_DEFAULTS = { missCost: 0.25, overshootCost: 0.10, warmup: 2, tolerance: 0.010, bootstrap: 200, seed: 1 };

  function solve(A, b) {            // Gaussian elimination with partial pivoting
    var n = b.length, M = A.map(function (r, i) { return r.concat([b[i]]); });
    for (var c = 0; c < n; c++) {
      var p = c; for (var r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      var t = M[c]; M[c] = M[p]; M[p] = t;
      if (Math.abs(M[c][c]) < 1e-12) return null;
      for (var r2 = c + 1; r2 < n; r2++) { var f = M[r2][c] / M[c][c]; for (var k = c; k <= n; k++) M[r2][k] -= f * M[c][k]; }
    }
    var x = new Array(n);
    for (var i = n - 1; i >= 0; i--) { var s = M[i][n]; for (var j = i + 1; j < n; j++) s -= M[i][j] * x[j]; x[i] = s / M[i][i]; }
    return x;
  }

  function prepTrials(trials, o) {
    if (!Array.isArray(trials) || !trials.length) throw new TypeError("calibration.trials must be a non-empty array");
    var counters = {};
    var out = [];
    trials.forEach(function (t, i) {
      if (!t || !validCm(t.cm)) throw new RangeError("trial " + i + ": cm must be a valid cm/360");
      if (["micro", "flick", "turn"].indexOf(t.task) < 0) throw new RangeError("trial " + i + ": task must be micro, flick or turn");
      if (!(typeof t.time === "number" && isFinite(t.time) && t.time >= 0 && t.time < 30)) throw new RangeError("trial " + i + ": time must be seconds (0–30)");
      var ses = t.session == null ? "s1" : String(t.session);
      counters[ses] = (counters[ses] || 0) + 1;
      var order = t.order != null ? t.order : counters[ses] - 1;
      var misses = t.misses || 0, over = t.overshoots || 0;
      if (!(misses >= 0) || !(over >= 0)) throw new RangeError("trial " + i + ": misses/overshoots must be >= 0");
      out.push({ cm: t.cm, x: log2(t.cm), task: t.task, session: ses, order: order,
        y: t.time + o.missCost * misses + o.overshootCost * over });
    });
    return out.filter(function (t) { return t.order >= o.warmup; });
  }

  // Fit one task: y = session intercepts + b1*x + b2*x^2 + g*ln(1+order). x is centred on xc.
  function fitTask(rows, xc, opts) {
    var sessions = Array.from(new Set(rows.map(function (r) { return r.session; })));
    var nCm = new Set(rows.map(function (r) { return r.cm; })).size;
    var quad = nCm >= 3 && !(opts && (opts.linear || opts.noCurve)), lin = nCm >= 2 && !(opts && opts.noCurve);
    var orders = new Set(rows.map(function (r) { return r.order; })).size;
    var useOrder = orders >= 3 && !(opts && opts.noOrder);
    function row(r) {
      var v = sessions.map(function (s) { return r.session === s ? 1 : 0; });
      var x = r.x - xc;
      if (lin) v.push(x);
      if (quad) v.push(x * x);
      if (useOrder) v.push(Math.log(1 + r.order));
      return v;
    }
    var p = sessions.length + (lin ? 1 : 0) + (quad ? 1 : 0) + (useOrder ? 1 : 0);
    if (rows.length < p + 2) return null;
    var XtX = [], Xty = new Array(p).fill(0);
    for (var i = 0; i < p; i++) XtX.push(new Array(p).fill(0));
    rows.forEach(function (r) { var v = row(r); for (var i = 0; i < p; i++) { Xty[i] += v[i] * r.y; for (var j = 0; j < p; j++) XtX[i][j] += v[i] * v[j]; } });
    for (var d = 0; d < p; d++) XtX[d][d] += 1e-9;
    var beta = solve(XtX, Xty);
    if (!beta) return null;
    var k = sessions.length;
    var b1 = lin ? beta[k] : 0, b2 = quad ? beta[k + 1] : 0, g = useOrder ? beta[p - 1] : 0;
    var intercept = mean(beta.slice(0, k));
    var rss = rows.reduce(function (s, r) { var v = row(r), f = 0; for (var i = 0; i < p; i++) f += v[i] * beta[i]; return s + (r.y - f) * (r.y - f); }, 0);
    return {
      b1: b1, b2: b2, g: g, xc: xc, intercept: intercept, sessions: sessions, rss: rss, p: p, n: rows.length,
      rel: function (C) { var x = log2(C) - xc; return b1 * x + b2 * x * x; },
      adjust: function (r) { return r.y - g * Math.log(1 + r.order); }
    };
  }

  function fitAll(rows, shares, opts) {
    var xc = mean(rows.map(function (r) { return r.x; }));
    var fits = {};
    ["micro", "flick", "turn"].forEach(function (t) {
      var rs = rows.filter(function (r) { return r.task === t; });
      if (rs.length) { var f = fitTask(rs, xc, opts); if (f) fits[t] = f; }
    });
    var present = Object.keys(fits), tot = present.reduce(function (s, t) { return s + shares[t]; }, 0);
    if (!present.length || tot <= 0) return null;
    return {
      fits: fits, tasks: present,
      w: present.reduce(function (o, t) { o[t] = shares[t] / tot; return o; }, {}),
      composite: function (C) { return present.reduce(function (s, t) { return s + (shares[t] / tot) * fits[t].rel(C); }, 0); }
    };
  }

  function argminOver(f, lo, hi) {
    var best = lo, bv = Infinity;
    for (var x = Math.log(lo); x <= Math.log(hi) + 1e-9; x += 0.005) { var v = f(Math.exp(x)); if (v < bv) { bv = v; best = Math.exp(x); } }
    return { c: best, v: bv };
  }

  // Held-out evaluation of one fold.
  function evalFold(train, test, shares, tested, current, o) {
    var F = fitAll(train, shares);
    if (!F) return null;
    var lo = tested[0], hi = tested[tested.length - 1];
    var opt = argminOver(F.composite, lo, hi).c;
    function nearestTested(c) { return tested.reduce(function (b, t) { return Math.abs(Math.log(t / c)) < Math.abs(Math.log(b / c)) ? t : b; }, tested[0]); }
    // Order- and session-adjusted held-out residuals, centred per (task, session).
    var errC = 0, errF = 0, errCell = 0, n = 0;
    var cellMean = {};
    F.tasks.forEach(function (t) {
      var ft = F.fits[t];
      var tr = train.filter(function (r) { return r.task === t; });
      var bySes = {};
      tr.forEach(function (r) { (bySes[r.session] = bySes[r.session] || []).push(ft.adjust(r)); });
      var sesMean = {}; Object.keys(bySes).forEach(function (s) { sesMean[s] = mean(bySes[s]); });
      var cells = {};
      tr.forEach(function (r) { (cells[r.cm] = cells[r.cm] || []).push(ft.adjust(r) - sesMean[r.session]); });
      cellMean[t] = {}; Object.keys(cells).forEach(function (c) { cellMean[t][c] = mean(cells[c]); });
    });
    var heldCells = {};      // task -> cm -> adjusted centred observations
    F.tasks.forEach(function (t) {
      var ft = F.fits[t];
      var te = test.filter(function (r) { return r.task === t; });
      var groups = {};
      te.forEach(function (r) { (groups[r.session] = groups[r.session] || []).push(r); });
      Object.keys(groups).forEach(function (s) {
        var g = groups[s];
        var obs = g.map(function (r) { return ft.adjust(r); }), om = mean(obs);
        var pc = g.map(function (r) { return ft.rel(r.cm); }), pm = mean(pc);
        var cc = g.map(function (r) { var v = cellMean[t][r.cm]; return v == null ? 0 : v; }), cm = mean(cc);
        g.forEach(function (r, i) {
          var y = obs[i] - om;
          errC += Math.pow(y - (pc[i] - pm), 2); errF += y * y; errCell += Math.pow(y - (cc[i] - cm), 2); n++;
          heldCells[t] = heldCells[t] || {}; (heldCells[t][r.cm] = heldCells[t][r.cm] || []).push(y);
        });
      });
    });
    function heldScore(c) {
      var s = 0, wsum = 0;
      F.tasks.forEach(function (t) { var v = heldCells[t] && heldCells[t][c]; if (v && v.length) { s += F.w[t] * mean(v); wsum += F.w[t]; } });
      return wsum > 0 ? s / wsum : null;
    }
    // Simple baseline: the tested setting with the best raw (adjusted) training mean.
    var base = tested.reduce(function (b, c) {
      var s = F.tasks.reduce(function (a, t) { var v = cellMean[t][c]; return a + (v == null ? 0 : F.w[t] * v); }, 0);
      return s < b.s ? { c: c, s: s } : b;
    }, { c: tested[0], s: Infinity }).c;
    var cur = current && Math.abs(Math.log(nearestTested(current) / current)) < 0.1 ? nearestTested(current) : null;
    return {
      n: n, mse: { curve: errC / n, flat: errF / n, cell: errCell / n },
      picks: { model: nearestTested(opt), baseline: base, current: cur },
      held: { model: heldScore(nearestTested(opt)), baseline: heldScore(base), current: cur ? heldScore(cur) : null }
    };
  }

  function calibrate(trials, input, options) {
    var o = Object.assign({}, CAL_DEFAULTS, options || {});
    var rows = prepTrials(trials, o);
    var mix = (input && input.mix) || (ROLE[input && input.role] || ROLE.f).mix;
    var shares = { micro: mix[0], flick: mix[1], turn: mix[2] + mix[3] };
    var tested = Array.from(new Set(rows.map(function (r) { return r.cm; }))).sort(function (a, b) { return a - b; });
    var warnings = [];
    if (tested.length < 3) warnings.push("Fewer than 3 sensitivities tested: no curve can be fitted, only tested values compared.");
    var sessions = Array.from(new Set(rows.map(function (r) { return r.session; })));
    if (sessions.length < 2) warnings.push("Only one session: day-to-day variability cannot be estimated.");
    // Order/sensitivity confound check (within sessions).
    var xs = [], os = [];
    sessions.forEach(function (s) {
      var rs = rows.filter(function (r) { return r.session === s; });
      var mx = mean(rs.map(function (r) { return r.x; })), mo = mean(rs.map(function (r) { return r.order; }));
      rs.forEach(function (r) { xs.push(r.x - mx); os.push(r.order - mo); });
    });
    var sxy = 0, sxx = 0, syy = 0; for (var i = 0; i < xs.length; i++) { sxy += xs[i] * os[i]; sxx += xs[i] * xs[i]; syy += os[i] * os[i]; }
    var orderCorr = sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0;
    if (Math.abs(orderCorr) > 0.5) warnings.push("Sensitivities were tested in a mostly fixed order (r = " + orderCorr.toFixed(2) + "); warm-up and fatigue may be confused with sensitivity. Rotate the order between sessions.");
    ["micro", "flick", "turn"].forEach(function (t) { if (!rows.some(function (r) { return r.task === t; })) warnings.push("No " + t + " trials; that task is left out of the composite."); });

    var full = fitAll(rows, shares);
    if (!full) throw new RangeError("Not enough calibration trials to fit (need several trials per sensitivity).");
    // Nested F-test: do the sensitivity terms explain more than session + warm-up alone?
    var rssF = 0, rssR = 0, pF = 0, pR = 0, nT = 0;
    full.tasks.forEach(function (t) {
      var rs = rows.filter(function (r) { return r.task === t; });
      var red = fitTask(rs, full.fits[t].xc, { noCurve: true });
      if (!red) return;
      rssF += full.fits[t].rss; pF += full.fits[t].p; rssR += red.rss; pR += red.p; nT += rs.length;
    });
    var d1 = pF - pR, d2 = nT - pF;
    var Fstat = d1 > 0 && d2 > 0 && rssF > 0 ? ((rssR - rssF) / d1) / (rssF / d2) : 0;
    var fTest = { F: Fstat, df1: d1, df2: d2, p: d1 > 0 && d2 > 0 ? fPValue(Fstat, d1, d2) : 1 };
    var lo = tested[0], hi = tested[tested.length - 1];

    // Hold-out: leave-one-session-out if possible, else alternate repetitions within each cell.
    var folds = [];
    if (sessions.length >= 2) sessions.forEach(function (s) { folds.push({ train: rows.filter(function (r) { return r.session !== s; }), test: rows.filter(function (r) { return r.session === s; }) }); });
    else {
      var idx = {}, tag = rows.map(function (r) { var k = r.task + "|" + r.cm; idx[k] = (idx[k] || 0) + 1; return idx[k] % 2; });
      folds.push({ train: rows.filter(function (r, i) { return tag[i] === 0; }), test: rows.filter(function (r, i) { return tag[i] === 1; }) });
      folds.push({ train: rows.filter(function (r, i) { return tag[i] === 1; }), test: rows.filter(function (r, i) { return tag[i] === 0; }) });
    }
    var current = input && input.current ? input.current.cm : null;
    var ev = folds.map(function (f) { return evalFold(f.train, f.test, shares, tested, current, o); }).filter(Boolean);
    var totN = ev.reduce(function (s, e) { return s + e.n; }, 0);
    function pooled(k) { return ev.reduce(function (s, e) { return s + e.mse[k] * e.n; }, 0) / totN; }
    var mse = { curve: pooled("curve"), flat: pooled("flat"), cell: pooled("cell") };
    var skill = mse.flat > 0 ? 1 - mse.curve / mse.flat : 0;
    function cmp(a, b) {
      var d = ev.filter(function (e) { return e.held[a] != null && e.held[b] != null; }).map(function (e) { return e.held[a] - e.held[b]; });
      if (!d.length) return null;
      var m = mean(d), se = d.length >= 3 ? sd(d) / Math.sqrt(d.length) : null;
      return { diff: m, se: se, folds: d.length,
        verdict: se == null ? (Math.abs(m) < o.tolerance ? "no meaningful difference" : (m < 0 ? "better (too few folds to test)" : "worse (too few folds to test)"))
          : (m + 2 * se < 0 ? "better" : m - 2 * se > 0 ? "worse" : "no reliable difference") };
    }
    var validation = {
      folds: ev.length, scheme: sessions.length >= 2 ? "leave-one-session-out" : "alternate repetitions (single session)",
      mse: mse, skillVsFlat: skill, fTest: fTest,
      // Sensitivity matters if the curve terms are significant in-sample AND help on held-out trials.
      // A single session can't separate day-to-day variation from sensitivity, so it needs stronger evidence.
      alpha: sessions.length >= 2 ? 0.05 : 0.01,
      curveBeatsFlat: fTest.p < (sessions.length >= 2 ? 0.05 : 0.01) && skill > 0,
      modelVsCurrent: current ? cmp("model", "current") : null,
      modelVsBaseline: cmp("model", "baseline")
    };

    // Bootstrap within (session, task, cm) cells: uncertainty of the optimum and the near-optimal set.
    var R = rng(o.seed), cells = {};
    rows.forEach(function (r) { var k = r.session + "|" + r.task + "|" + r.cm; (cells[k] = cells[k] || []).push(r); });
    var keys = Object.keys(cells), opts = [], grid = [];
    for (var x = Math.log(lo); x <= Math.log(hi) + 1e-9; x += 0.02) grid.push(Math.exp(x));
    var within = grid.map(function () { return 0; }), B = 0;
    for (var b = 0; b < o.bootstrap; b++) {
      var samp = [];
      keys.forEach(function (k) { var c = cells[k]; for (var j = 0; j < c.length; j++) samp.push(c[Math.floor(R() * c.length)]); });
      var Fb = fitAll(samp, shares); if (!Fb) continue;
      var vals = grid.map(Fb.composite), mn = Math.min.apply(null, vals);
      opts.push(grid[vals.indexOf(mn)]);
      vals.forEach(function (v, i) { if (v - mn <= o.tolerance) within[i]++; });
      B++;
    }
    var near = grid.filter(function (c, i) { return within[i] >= 0.5 * B; });
    var best = argminOver(full.composite, lo, hi);
    var nearSet = near.length ? [Math.min.apply(null, near), Math.max.apply(null, near)] : [best.c, best.c];
    var cm, reason;
    if (!validation.curveBeatsFlat) {
      cm = current && current >= lo && current <= hi ? current : best.c;
      reason = current && current >= lo && current <= hi ? "no reliable difference between tested settings: keep current" : "no reliable difference between tested settings";
      nearSet = [lo, hi];
    } else if (current && current >= nearSet[0] && current <= nearSet[1]) { cm = current; reason = "current setting is within the measured near-optimal range"; }
    else { cm = current ? nearestInSet(current, nearSet) : best.c; reason = current ? "closest near-optimal setting to your current one" : "measured optimum"; }
    return {
      cm: cm, reason: reason, fittedOptimum: best.c, tested: tested, nearOptimal: nearSet,
      optimumInterval: opts.length ? [quantile(opts, 0.1), quantile(opts, 0.9)] : null,
      bootstrapRuns: B, validation: validation, warnings: warnings, orderCorrelation: orderCorr,
      composite: full.composite, taskWeights: full.w, nTrials: rows.length, options: o
    };
  }

  /* =========================================================================
   * Main entry point
   * input = {
   *   pad (usable width cm, required), dpi?, current?: { cm }, satisfaction? 1..5,
   *   limb?, reachCm? (measured comfortable one-direction travel), role?, weapon?, surface? (ignored),
   *   experience?, stats? (display only), mix? (override task shares),
   *   calibration?: { trials: [...], options?: {...} }
   * }
   * ========================================================================= */
  function withAgents(input, rules) {
    var ap = agentsProfile(input.agents, rules);
    return ap ? Object.assign({}, input, { _agentProf: ap }) : input;
  }
  function recommend(input, opts) {
    validateInput(input);
    input = withAgents(input, opts && opts.agentRules);
    var E = expectedCurve(input, opts);
    var pr = E.profile, P = E.base;
    var tol = P.tolerance;
    var band = nearOptimalSet(function (C) { return E.at(C).total; }, E.cStar, E.jStar, tol, GRID[0], GRID[GRID.length - 1]);

    var c0 = input.current ? input.current.cm : null, sat = input.satisfaction || 3;
    var cm = E.cStar, reason = "model optimum", anchor = null;
    if (c0) {
      // Preference is not performance: satisfaction can only widen the "close enough to stay" tolerance, at most 2x.
      var tolStay = tol * (1 + 0.25 * (sat - 1));
      var jc = E.at(clamp(c0, GRID[0], GRID[GRID.length - 1])).total;
      var stay = jc <= E.jStar + tolStay && c0 >= GRID[0] && c0 <= GRID[GRID.length - 1];
      cm = stay ? c0 : nearestInSet(c0, band);
      reason = stay ? (jc <= E.jStar + tol ? "current setting is already near-optimal" : "current setting is close enough, and you're comfortable with it") : "closest near-optimal setting to your current one";
      anchor = { cm: c0, costDiff: jc - E.jStar, inBand: c0 >= band[0] && c0 <= band[1], stay: stay, tolStay: tolStay,
        lifts90: expectedLifts(c0 * 90 / 360, pr), sd: null, weight: stay ? 1 : 0 };
    }

    var measured = null;
    if (input.calibration && input.calibration.trials) {
      measured = calibrate(input.calibration.trials, input, input.calibration.options);
      cm = measured.cm; reason = measured.reason;
    }

    var notes = [];
    if (cm * 90 / 360 > pr.D) notes.push("pad90");
    if (cm < 20) notes.push("fast");
    if (cm > 80) notes.push("slow");

    var curve = [];
    for (var C = 15; C <= 120; C += 1) { var c = E.at(C); curve.push({ C: C, total: c.total, prec: c.prec, trav: c.trav, lift: c.lift }); }

    var unsure = 0; if (!LIMB[input.limb] || input.limb === "unsure") unsure++; if (!input.role) unsure++; if (!input.weapon) unsure++;
    var confidence = measured
      ? { type: "measured", label: measured.validation.curveBeatsFlat ? "measured" : "measured, no clear difference", interval: measured.optimumInterval }
      : { type: "heuristic", label: unsure ? "low" : (input.reachCm ? "medium" : "low–medium"),
          note: "Questionnaire-only estimates are unvalidated. The label is a heuristic, not a probability." };

    var range = measured ? measured.nearOptimal : band;
    var near = PROS.slice().sort(function (a, b) { return Math.abs(Math.log(a.cm / cm)) - Math.abs(Math.log(b.cm / cm)); }).slice(0, 5);
    return {
      cm: cm, reason: reason, mode: measured ? "measured" : "questionnaire",
      lo: range[0], hi: range[1], band: band, cModel: E.cStar, modelCost: E.at(E.cStar), tolerance: tol,
      profile: pr, anchor: anchor, stats: statsSignals(input.stats), measured: measured, confidence: confidence,
      agents: input._agentProf || null, scopedAdvice: scopedAdvice(input._agentProf, input.weapon),
      notes: notes, curve: curve, nearPros: near,
      proPercentile: PROS.filter(function (p) { return p.cm < cm; }).length / Math.max(1, PROS.length),
      nScenarios: E.nScenarios
    };
  }

  /* =========================================================================
   * Parameter-sensitivity check: how much each assumption moves the model optimum.
   * ========================================================================= */
  function scaleRates(k) {
    var r = {}; Object.keys(AGENT_RULES.rate).forEach(function (x) { r[x] = AGENT_RULES.rate[x] * k; });
    return { rate: r, holdShift: AGENT_RULES.holdShift * k, weights: AGENT_RULES.weights };
  }
  function sensitivityAnalysis(input) {
    validateInput(input);
    var rawInput = input;
    input = withAgents(input);
    var baseC = expectedCurve(input, { noUncertainty: true }).cStar;
    var rows = Object.keys(PARAMS).filter(function (k) { return k !== "tolerance"; }).map(function (k) {
      var lo = {}, hi = {}; lo[k] = PARAMS[k].low; hi[k] = PARAMS[k].high;
      var cl = expectedCurve(input, { noUncertainty: true, params: lo }).cStar, ch = expectedCurve(input, { noUncertainty: true, params: hi }).cStar;
      return { param: k, basis: PARAMS[k].basis, low: cl, high: ch, swing: Math.abs(Math.log(ch / cl)) };
    });
    function alt(o) { return expectedCurve(Object.assign({}, input, o), { noUncertainty: true }).cStar; }
    var toggles = [
      { param: "role → flex", value: alt({ role: "f" }) },
      { param: "weapon → rifle", value: alt({ weapon: "rifle" }) },
      { param: "no NVIDIA flick term", value: expectedCurve(input, { noUncertainty: true, params: { kappa: 0 } }).cStar },
      { param: "mix: all micro/flick equal, no turns", value: alt({ mix: [0.5, 0.5, 0, 0] }) },
      { param: "agents ignored (role mix)", value: expectedCurve(Object.assign({}, rawInput, { agents: null }), { noUncertainty: true }).cStar },
      { param: "agent ability rates x0.5", value: expectedCurve(withAgents(rawInput, scaleRates(0.5)), { noUncertainty: true }).cStar },
      { param: "agent ability rates x2", value: expectedCurve(withAgents(rawInput, scaleRates(2)), { noUncertainty: true }).cStar }
    ].map(function (t) { t.change = Math.log(t.value / baseC); return t; });
    rows.sort(function (a, b) { return b.swing - a.swing; });
    return { base: baseC, params: rows, toggles: toggles };
  }

  /* =========================================================================
   * Agents (research/agent_mechanics.json -> scripts/build_agents.js)
   * Raw catalogued mechanics per agent. How they change the task mix is set by AGENT_RULES below.
   * ========================================================================= */
  var AGENT_RULES = {
    // Share of engagements that include a time-critical re-orientation caused by this ability (ESTIMATES:
    // no per-ability usage data exists). Signature (E) abilities recharge, other basics are bought, ultimates are rare.
    rate: { E: 0.15, C: 0.08, Q: 0.08, X: 0.03 },
    holdShift: 0.05,          // max share moved from target switches to small corrections for anchor kits (ESTIMATE)
    weights: [0.5, 0.3, 0.2]  // main, second, third agent (assumption, shown in the UI)
  };
  var AGENT_LIST = /*@AGENTS*/[
    {"name":"Hush","role":"d","release":2026,"repos":[{"key":"C","name":"Flow","lo":0,"hi":90}],"hold":[],"guided":["Telekinesis","Flashbulb","Displacement","Suspension"],"weapon":[],"adsZoom":null,"operator":"rare"},
    {"name":"Iso","role":"d","release":2023,"repos":[{"key":"X","name":"Kill Contract","lo":0,"hi":90}],"hold":[],"guided":[],"weapon":["Double Tap","Kill Contract"],"adsZoom":null,"operator":"rare"},
    {"name":"Jett","role":"d","release":2020,"repos":[{"key":"Q","name":"Updraft","lo":0,"hi":45},{"key":"E","name":"Tailwind","lo":0,"hi":180}],"hold":[],"guided":["Cloudburst"],"weapon":["Blade Storm"],"adsZoom":null,"operator":"main"},
    {"name":"Neon","role":"d","release":2022,"repos":[{"key":"E","name":"High Gear","lo":0,"hi":90}],"hold":[],"guided":[],"weapon":["Overdrive"],"adsZoom":null,"operator":"rare"},
    {"name":"Phoenix","role":"d","release":2020,"repos":[{"key":"X","name":"Run It Back","lo":0,"hi":180}],"hold":[],"guided":["Blaze"],"weapon":[],"adsZoom":null,"operator":"rare"},
    {"name":"Raze","role":"d","release":2020,"repos":[{"key":"Q","name":"Blast Pack","lo":0,"hi":180}],"hold":[],"guided":[],"weapon":["Showstopper"],"adsZoom":null,"operator":"rare"},
    {"name":"Reyna","role":"d","release":2020,"repos":[{"key":"E","name":"Dismiss","lo":0,"hi":90}],"hold":[],"guided":[],"weapon":[],"adsZoom":null,"operator":"rare"},
    {"name":"Waylay","role":"d","release":2025,"repos":[{"key":"Q","name":"Lightspeed","lo":0,"hi":90},{"key":"E","name":"Refract","lo":90,"hi":180}],"hold":[],"guided":[],"weapon":[],"adsZoom":null,"operator":"rare"},
    {"name":"Yoru","role":"d","release":2021,"repos":[{"key":"E","name":"Gatecrash","lo":90,"hi":180},{"key":"X","name":"Dimensional Drift","lo":0,"hi":180}],"hold":[],"guided":[],"weapon":[],"adsZoom":null,"operator":"rare"},
    {"name":"Breach","role":"i","release":2020,"repos":[],"hold":[],"guided":[],"weapon":[],"adsZoom":null,"operator":"rare"},
    {"name":"Fade","role":"i","release":2022,"repos":[],"hold":[],"guided":["Prowler"],"weapon":[],"adsZoom":null,"operator":"rare"},
    {"name":"Gekko","role":"i","release":2023,"repos":[],"hold":[],"guided":["Thrash"],"weapon":[],"adsZoom":null,"operator":"rare"},
    {"name":"KAY/O","role":"i","release":2021,"repos":[],"hold":[],"guided":[],"weapon":[],"adsZoom":null,"operator":"rare"},
    {"name":"Skye","role":"i","release":2020,"repos":[],"hold":[],"guided":["Trailblazer","Guiding Light"],"weapon":[],"adsZoom":null,"operator":"rare"},
    {"name":"Sova","role":"i","release":2020,"repos":[],"hold":[],"guided":["Owl Drone"],"weapon":["Hunter's Fury"],"adsZoom":null,"operator":"sometimes"},
    {"name":"Tejo","role":"i","release":2025,"repos":[],"hold":[],"guided":["Stealth Drone"],"weapon":[],"adsZoom":null,"operator":"rare"},
    {"name":"Astra","role":"c","release":2021,"repos":[],"hold":[],"guided":[],"weapon":[],"adsZoom":null,"operator":"rare"},
    {"name":"Brimstone","role":"c","release":2020,"repos":[],"hold":[],"guided":[],"weapon":[],"adsZoom":null,"operator":"rare"},
    {"name":"Clove","role":"c","release":2024,"repos":[],"hold":[],"guided":[],"weapon":[],"adsZoom":null,"operator":"rare"},
    {"name":"Harbor","role":"c","release":2022,"repos":[],"hold":[],"guided":["High Tide"],"weapon":[],"adsZoom":null,"operator":"rare"},
    {"name":"Miks","role":"c","release":2026,"repos":[],"hold":[],"guided":[],"weapon":[],"adsZoom":null,"operator":"rare"},
    {"name":"Omen","role":"c","release":2020,"repos":[{"key":"C","name":"Shrouded Step","lo":45,"hi":180},{"key":"X","name":"From the Shadows","lo":0,"hi":180}],"hold":[],"guided":["Dark Cover"],"weapon":[],"adsZoom":null,"operator":"sometimes"},
    {"name":"Viper","role":"c","release":2020,"repos":[],"hold":["Viper's Pit"],"guided":[],"weapon":[],"adsZoom":null,"operator":"sometimes"},
    {"name":"Chamber","role":"s","release":2021,"repos":[{"key":"E","name":"Rendezvous","lo":0,"hi":180}],"hold":["Trademark","Rendezvous"],"guided":[],"weapon":["Headhunter","Tour De Force"],"adsZoom":1.5,"operator":"main"},
    {"name":"Cypher","role":"s","release":2020,"repos":[],"hold":["Trapwire","Spycam"],"guided":["Spycam"],"weapon":[],"adsZoom":null,"operator":"sometimes"},
    {"name":"Deadlock","role":"s","release":2023,"repos":[],"hold":["Barrier Mesh","Sonic Sensor"],"guided":[],"weapon":[],"adsZoom":null,"operator":"rare"},
    {"name":"Killjoy","role":"s","release":2020,"repos":[],"hold":["Nanoswarm","Alarmbot","Turret"],"guided":[],"weapon":[],"adsZoom":null,"operator":"sometimes"},
    {"name":"Sage","role":"s","release":2020,"repos":[],"hold":[],"guided":[],"weapon":[],"adsZoom":null,"operator":"rare"},
    {"name":"Veto","role":"s","release":2025,"repos":[{"key":"C","name":"Crosscut","lo":45,"hi":180}],"hold":["Crosscut","Chokehold","Interceptor"],"guided":[],"weapon":[],"adsZoom":null,"operator":"rare"},
    {"name":"Vyse","role":"s","release":2024,"repos":[],"hold":["Razorvine","Shear"],"guided":[],"weapon":[],"adsZoom":null,"operator":"rare"}
  ]/*@END*/;

  var AGENTS = {};
  AGENT_LIST.forEach(function (a) { AGENTS[a.name.toLowerCase()] = a; });
  function findAgent(name) { return typeof name === "string" ? AGENTS[name.toLowerCase()] || null : null; }

  // Spread a re-orientation of theta degrees over the task amplitudes so the mean amplitude is preserved.
  function spreadTheta(theta) {
    var v = [0, 0, 0, 0];
    if (theta <= TASKS[1].theta) v[1] = 1;
    else if (theta <= TASKS[2].theta) { var w = (theta - TASKS[1].theta) / (TASKS[2].theta - TASKS[1].theta); v[2] = w; v[1] = 1 - w; }
    else { var w2 = Math.min(1, (theta - TASKS[2].theta) / (TASKS[3].theta - TASKS[2].theta)); v[3] = w2; v[2] = 1 - w2; }
    return v;
  }
  // One agent's task mix: start from its class's mix, add ability-driven re-orientations, shift toward holding for anchor kits.
  function agentMix(a, rules) {
    rules = rules || AGENT_RULES;
    var base = (ROLE[a.role] || ROLE.f).mix, add = [0, 0, 0, 0], total = 0, parts = [];
    a.repos.forEach(function (r) {
      var rate = rules.rate[r.key] || 0, theta = (r.lo + r.hi) / 2, v = spreadTheta(theta);
      for (var j = 0; j < 4; j++) add[j] += rate * v[j];
      total += rate;
      parts.push({ ability: r.name, key: r.key, rate: rate, theta: theta });
    });
    var mix = base.map(function (m, j) { return m * (1 - total) + add[j]; });
    var h = Math.min(a.hold.length, 3) / 3 * rules.holdShift;
    var moved = Math.min(h, mix[1]); mix[1] -= moved; mix[0] += moved;
    return { mix: mix, reorient: parts, holdShift: moved };
  }
  function normaliseAgents(list) {
    if (list == null) return [];
    if (!Array.isArray(list)) throw new RangeError("agents must be an array");
    var out = [], seen = {};
    list.forEach(function (x, i) {
      var name = typeof x === "string" ? x : x && x.name, a = findAgent(name);
      if (!a) throw new RangeError("Unknown agent: " + name);
      if (seen[a.name]) return; seen[a.name] = 1;
      var rank = out.length;    // weight by rank after removing duplicates
      var share = typeof x === "object" && x.share != null ? x.share : AGENT_RULES.weights[rank] != null ? AGENT_RULES.weights[rank] : 0;
      if (!(share >= 0)) throw new RangeError("agent share must be >= 0");
      out.push({ agent: a, share: share });
    });
    var tot = out.reduce(function (s, x) { return s + x.share; }, 0);
    if (out.length && !(tot > 0)) throw new RangeError("agent shares must sum to more than 0");
    out.forEach(function (x) { x.share /= tot; });
    return out;
  }
  function agentsProfile(list, rules) {
    var ag = normaliseAgents(list);
    if (!ag.length) return null;
    var mix = [0, 0, 0, 0], detail = [];
    ag.forEach(function (x) {
      var m = agentMix(x.agent, rules);
      for (var j = 0; j < 4; j++) mix[j] += x.share * m.mix[j];
      detail.push({ name: x.agent.name, role: x.agent.role, share: x.share, mix: m.mix, reorient: m.reorient, holdShift: m.holdShift,
        operator: x.agent.operator, adsZoom: x.agent.adsZoom, guided: x.agent.guided, weapon: x.agent.weapon });
    });
    return { mix: mix, agents: detail };
  }

  /* Scoped / ADS multiplier advice. Valorant multiplier 1.0 ~ 100% horizontal monitor-distance match
     (community-verified), zoomed hFOV = 103/zoom. A p% match keeps the on-screen point at p% of the half-width
     moving the same; p = 0 is the crosshair (focal-length) match. No study shows any match improves performance. */
  var HFOV = 103;
  var ZOOMS = { operator: 2.5, marshal: 3.5, outlaw: 3.5, headhunter: 1.5, rifle: 1.25 };
  function matchMultiplier(zoom, p) {
    var rad = Math.PI / 180, fh = HFOV * rad, fz = fh / zoom;
    var r = p === 0 ? Math.tan(fz / 2) / Math.tan(fh / 2) : Math.atan(p * Math.tan(fz / 2)) / Math.atan(p * Math.tan(fh / 2));
    return r / (fz / fh);
  }
  function scopedAdvice(agentProf, weapon) {
    var opWeight = 0, chamber = 0;
    if (agentProf) agentProf.agents.forEach(function (x) {
      opWeight += x.share * (x.operator === "main" ? 1 : x.operator === "sometimes" ? 0.3 : 0);
      if (x.adsZoom) chamber += x.share;
    });
    if (weapon === "sniper") opWeight = Math.max(opWeight, 1);
    var level = opWeight >= 0.4 ? "main" : opWeight >= 0.1 ? "sometimes" : "rare";
    var r3 = function (x) { return Math.round(x * 1000) / 1000; };
    return {
      scoped: { start: 1.0, level: level,
        alternatives: level === "rare" ? [] : [
          { value: r3(matchMultiplier(ZOOMS.operator, 0.75)), label: "Operator, 75% match" },
          { value: r3(matchMultiplier(ZOOMS.operator, 0)), label: "Operator, crosshair match" },
          { value: r3(matchMultiplier(ZOOMS.marshal, 0)), label: "Marshal/Outlaw, crosshair match" }] },
      ads: { start: 1.0, chamber: chamber >= 0.2,
        alternatives: chamber >= 0.2 ? [{ value: r3(matchMultiplier(ZOOMS.headhunter, 0)), label: "crosshair match for its 1.5x zoom; it also changes rifle ADS" }] : [] },
      opWeight: opWeight,
      evidence: "Preference only: about 70–80% of pros keep the scoped multiplier at 1.0, and no study shows a matching method improves aim."
    };
  }

  var api = {
    VERSION: "2.1.0", AGENT_LIST: AGENT_LIST, AGENT_RULES: AGENT_RULES,
    findAgent: findAgent, agentMix: agentMix, agentsProfile: agentsProfile, matchMultiplier: matchMultiplier, scopedAdvice: scopedAdvice,
    YAW: YAW, K: K, GAME_YAW: GAME_YAW, OTHER_YAW: OTHER_YAW, LIMITS: LIMITS,
    cmFrom: cmFrom, sensFor: sensFor, edpiFor: edpiFor, toCm: toCm, convert: convert,
    PARAMS: PARAMS, UNCERTAIN: UNCERTAIN, TASKS: TASKS, ROLE: ROLE, WEAPON: WEAPON, LIMB: LIMB, SURFACE: SURFACE,
    HS_REF: HS_REF, KD_REF: KD_REF, PRO_DATA: PRO_DATA,
    headDeg: headDeg, expectedLifts: expectedLifts, costAt: costAt, buildProfile: buildProfile, expectedCurve: expectedCurve,
    statsSignals: statsSignals, calibrate: calibrate, recommend: recommend, sensitivityAnalysis: sensitivityAnalysis,
    setPros: setPros, _rng: rng, _erf: erf, _fPValue: fPValue
  };
  setPros(/*@PROS*/[
    {"name":"ZmjjKK","dpi":800,"sens":0.395,"role":"d","roleConfidence":"medium","status":"active_pro","team":"EDward Gaming","settingsConflict":true,"settingsStale":false,"include":true,"excludeReason":null,"source":"https://prosettings.net/players/zmjjkk/","sourceUpdated":"2026-08-31","verified":"2026-11-01"},
    {"name":"Smoggy","dpi":800,"sens":0.31,"role":"c","roleConfidence":"medium","status":"active_pro","team":"EDward Gaming","settingsConflict":true,"settingsStale":false,"include":true,"excludeReason":null,"source":"https://prosettings.net/players/smoggy/","sourceUpdated":"2026-10-12","verified":"2026-11-01"},
    {"name":"CHICHOO","dpi":800,"sens":0.2,"role":"s","roleConfidence":"low","status":"active_pro","team":"EDward Gaming","settingsConflict":true,"settingsStale":false,"include":true,"excludeReason":null,"source":"https://prosettings.net/players/chichoo/","sourceUpdated":"2026-08-03","verified":"2026-11-01"},
    {"name":"nobody","dpi":800,"sens":0.26,"role":"i","roleConfidence":"medium","status":"active_pro","team":"EDward Gaming","settingsConflict":true,"settingsStale":false,"include":true,"excludeReason":null,"source":"https://prosettings.net/players/nobody/","sourceUpdated":"2026-09-30","verified":"2026-11-01"},
    {"name":"benjyfishy","dpi":800,"sens":0.27,"role":"s","roleConfidence":"medium","status":"active_pro","team":"Team Heretics","settingsConflict":true,"settingsStale":false,"include":true,"excludeReason":null,"source":"https://prosettings.net/players/benjyfishy/","sourceUpdated":"2026-09-08","verified":"2026-11-01"},
    {"name":"SirMaza","dpi":400,"sens":0.5,"role":null,"roleConfidence":"unverified","status":"creator_or_streamer","team":null,"settingsConflict":false,"settingsStale":false,"include":false,"excludeReason":"creator, not a VCT player","source":"https://prosettings.net/players/sirmaza/","sourceUpdated":"2026-02-23","verified":"2026-11-01"},
    {"name":"RieNs","dpi":800,"sens":0.27,"role":"i","roleConfidence":"medium","status":"active_pro","team":"Team Heretics","settingsConflict":false,"settingsStale":false,"include":true,"excludeReason":null,"source":"https://prosettings.net/players/riens/","sourceUpdated":"2026-07-13","verified":"2026-11-01"},
    {"name":"t3xture","dpi":800,"sens":0.43,"role":"d","roleConfidence":"medium","status":"active_pro","team":"Gen.G","settingsConflict":true,"settingsStale":false,"include":true,"excludeReason":null,"source":"https://prosettings.net/players/t3xture/","sourceUpdated":"2026-10-26","verified":"2026-11-01"},
    {"name":"Lakia","dpi":800,"sens":0.3,"role":"i","roleConfidence":"medium","status":"inactive_or_benched","team":"Gen.G (Dec 2025 - Jul 2026)","settingsConflict":false,"settingsStale":false,"include":true,"excludeReason":null,"source":"https://prosettings.net/players/lakia/","sourceUpdated":"2026-07-27","verified":"2026-11-01"},
    {"name":"Karon","dpi":800,"sens":0.2,"role":"c","roleConfidence":"medium","status":"active_pro","team":"Gen.G","settingsConflict":false,"settingsStale":false,"include":true,"excludeReason":null,"source":"https://prosettings.net/players/karon/","sourceUpdated":"2026-07-20","verified":"2026-11-01"},
    {"name":"ZynX","dpi":1600,"sens":0.1,"role":"s","roleConfidence":"low","status":"inactive_or_benched","team":"Gen.G (inactive)","settingsConflict":false,"settingsStale":false,"include":true,"excludeReason":null,"source":"https://prosettings.net/players/zynx/","sourceUpdated":"2026-07-20","verified":"2026-11-01"},
    {"name":"kiNgg","dpi":1600,"sens":0.1,"role":"c","roleConfidence":"medium","status":"active_pro","team":"LEVIATAN","settingsConflict":false,"settingsStale":false,"include":true,"excludeReason":null,"source":"https://prosettings.net/players/kingg/","sourceUpdated":"2026-08-10","verified":"2026-11-01"},
    {"name":"spikeziN","dpi":800,"sens":0.23,"role":"d","roleConfidence":"high","status":"active_pro","team":"LEVIATAN","settingsConflict":false,"settingsStale":false,"include":true,"excludeReason":null,"source":"https://prosettings.net/players/spikezin/","sourceUpdated":"2026-08-31","verified":"2026-11-01"},
    {"name":"Sato","dpi":800,"sens":0.35,"role":"d","roleConfidence":"medium","status":"active_pro","team":"LEVIATAN","settingsConflict":false,"settingsStale":false,"include":true,"excludeReason":null,"source":"https://prosettings.net/players/sato/","sourceUpdated":"2026-10-05","verified":"2026-11-01"},
    {"name":"Neon","dpi":800,"sens":0.21,"role":"f","roleConfidence":"low","status":"active_pro","team":"LEVIATAN","settingsConflict":false,"settingsStale":false,"include":true,"excludeReason":null,"source":"https://prosettings.net/players/neon/","sourceUpdated":"2026-08-10","verified":"2026-11-01"},
    {"name":"Blowz","dpi":800,"sens":0.2,"role":"i","roleConfidence":"medium","status":"active_pro","team":"LEVIATAN","settingsConflict":false,"settingsStale":false,"include":true,"excludeReason":null,"source":"https://prosettings.net/players/blowz/","sourceUpdated":"2026-07-13","verified":"2026-11-01"},
    {"name":"trent","dpi":1600,"sens":0.16,"role":"i","roleConfidence":"high","status":"active_pro","team":"G2 Esports","settingsConflict":true,"settingsStale":false,"include":true,"excludeReason":null,"source":"https://prosettings.net/players/trent/","sourceUpdated":"2026-05-26","verified":"2026-11-01"},
    {"name":"babybay","dpi":1600,"sens":0.11,"role":"s","roleConfidence":"medium","status":"active_pro","team":"G2 Esports","settingsConflict":true,"settingsStale":false,"include":true,"excludeReason":null,"source":"https://prosettings.net/players/babybay/","sourceUpdated":"2026-09-28","verified":"2026-11-01"},
    {"name":"leaf","dpi":1600,"sens":0.08,"role":"c","roleConfidence":"medium","status":"active_pro","team":"G2 Esports","settingsConflict":true,"settingsStale":false,"include":true,"excludeReason":null,"source":"https://prosettings.net/players/leaf/","sourceUpdated":"2026-10-19","verified":"2026-11-01"},
    {"name":"Shanks","dpi":800,"sens":0.22,"role":null,"roleConfidence":"unverified","status":"creator_or_streamer","team":null,"settingsConflict":false,"settingsStale":false,"include":false,"excludeReason":"creator, not a VCT player","source":"https://prosettings.net/players/shanks/","sourceUpdated":"2026-03-11","verified":"2026-11-01"},
    {"name":"valyn","dpi":1600,"sens":0.15,"role":"c","roleConfidence":"high","status":"inactive_or_benched","team":"G2 Esports (Sep 2023 - Oct 2026)","settingsConflict":false,"settingsStale":false,"include":true,"excludeReason":null,"source":"https://prosettings.net/players/valyn/","sourceUpdated":"2026-02-16","verified":"2026-11-01"},
    {"name":"jawgemo","dpi":1600,"sens":0.157,"role":"d","roleConfidence":"high","status":"active_pro","team":"G2 Esports","settingsConflict":true,"settingsStale":false,"include":true,"excludeReason":null,"source":"https://prosettings.net/players/jawgemo/","sourceUpdated":"2026-10-19","verified":"2026-11-01"},
    {"name":"Alfajer","dpi":400,"sens":0.45,"role":"d","roleConfidence":"medium","status":"active_pro","team":"FNATIC","settingsConflict":true,"settingsStale":false,"include":true,"excludeReason":null,"source":"https://prosettings.net/players/alfajer/","sourceUpdated":"2026-08-31","verified":"2026-11-01"},
    {"name":"crashies","dpi":1600,"sens":0.1,"role":"f","roleConfidence":"low","status":"active_pro","team":"FNATIC","settingsConflict":true,"settingsStale":false,"include":true,"excludeReason":null,"source":"https://prosettings.net/players/crashies/","sourceUpdated":"2026-08-31","verified":"2026-11-01"},
    {"name":"Boaster","dpi":800,"sens":0.2,"role":"c","roleConfidence":"medium","status":"inactive_or_benched","team":"FNATIC (inactive)","settingsConflict":true,"settingsStale":false,"include":true,"excludeReason":null,"source":"https://prosettings.net/players/boaster/","sourceUpdated":"2026-09-08","verified":"2026-11-01"},
    {"name":"PROD","dpi":800,"sens":0.52,"role":"d","roleConfidence":"low","status":"creator_or_streamer","team":null,"settingsConflict":false,"settingsStale":false,"include":false,"excludeReason":"creator, not a VCT player","source":"https://prosettings.net/players/prod/","sourceUpdated":"2026-02-04","verified":"2026-11-01"},
    {"name":"Cloud","dpi":800,"sens":0.4,"role":"i","roleConfidence":"medium","status":"active_pro","team":"FNATIC","settingsConflict":true,"settingsStale":false,"include":true,"excludeReason":null,"source":"https://prosettings.net/players/cloud/","sourceUpdated":"2026-08-31","verified":"2026-11-01"},
    {"name":"kaajak","dpi":1600,"sens":0.1,"role":"d","roleConfidence":"medium","status":"active_pro","team":"FNATIC","settingsConflict":true,"settingsStale":false,"include":true,"excludeReason":null,"source":"https://prosettings.net/players/kaajak/","sourceUpdated":"2026-10-26","verified":"2026-11-01"},
    {"name":"Veqaj","dpi":1600,"sens":0.125,"role":null,"roleConfidence":"unverified","status":"inactive_or_benched","team":"Mandatory (VCL/Challengers EMEA-France, joined Oct 2026)","settingsConflict":false,"settingsStale":false,"include":true,"excludeReason":null,"source":"https://prosettings.net/players/veqaj/","sourceUpdated":"2026-10-05","verified":"2026-11-01"},
    {"name":"MaKo","dpi":400,"sens":0.45,"role":"c","roleConfidence":"medium","status":"inactive_or_benched","team":"KIWOOM DRX (to Oct 2026)","settingsConflict":true,"settingsStale":false,"include":true,"excludeReason":null,"source":"https://prosettings.net/players/mako/","sourceUpdated":"2026-07-20","verified":"2026-11-01"},
    {"name":"Lothar","dpi":1600,"sens":0.2,"role":null,"roleConfidence":"unverified","status":"creator_or_streamer","team":null,"settingsConflict":false,"settingsStale":false,"include":false,"excludeReason":"creator, not a VCT player","source":"https://prosettings.net/players/lothar/","sourceUpdated":"2025-11-07","verified":"2026-11-01"},
    {"name":"BeYN","dpi":400,"sens":0.4,"role":"i","roleConfidence":"medium","status":"inactive_or_benched","team":"KIWOOM DRX (Jan 2025 - Oct 2026)","settingsConflict":false,"settingsStale":false,"include":true,"excludeReason":null,"source":"https://prosettings.net/players/beyn/","sourceUpdated":"2026-07-20","verified":"2026-11-01"}
  ]/*@END*/, /*@PROMETA*/{"generated":"2026-11-01","verifiedOn":"2026-11-01","sources":[{"id":"prosettings_list","url":"https://prosettings.net/lists/valorant/","accessed":"2026-11-01"},{"id":"prosettings_player","url":"https://prosettings.net/players/<slug>/","accessed":"2026-11-01"},{"id":"specs_gg","url":"https://specs.gg/players/<slug>","accessed":"2026-11-01"},{"id":"vlr_lol","url":"https://www.vlr.lol/pro-settings","accessed":"2026-11-01"},{"id":"vlr_gg_player","url":"https://www.vlr.gg/player/<id>","accessed":"2026-11-01"},{"id":"vlr_gg_team_mandatory","url":"https://www.vlr.gg/team/7967/mandatory","accessed":"2026-11-01"},{"id":"fnatic_prod","url":"https://fnatic.com/community/5803-join-us-in-welcoming-prod","accessed":"2026-11-01"}]}/*@END*/);
  return api;
});
