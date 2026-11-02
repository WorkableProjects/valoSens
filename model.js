/*
 * valoSens model v4.0.
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
 *     track   (v4.0, following a strafing target): angular error = sqrt((360*floor/C)^2 + (k*omega*delay)^2),
 *             T = t_track * (p_inf / p - 1). Experience, grip and mouse weight scale the noise floors,
 *             correction time, lift time and peak speed.
 *
 * RECOMMENDATION RULE (v4.0, both pathways): progression, not "keep if close enough"
 *   Minimise J(x) = cost(e^x) + lambda*(x - ln C0)^2 between the current setting C0 and the optimum,
 *   scale the step by how strongly the assumption scenarios (or bootstrap refits) agree on the direction,
 *   skip steps below the JND, and split steps above maxStep into stages (one per run). Satisfaction
 *   raises lambda by at most 2x. The near-optimal set N = { C : cost(C) <= min cost + tolerance } is
 *   still reported. Without a current setting, recommend the minimum.
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
                note: "Time lost per mouse lift and re-centre. Casiez et al. 2008: about 24% clutch time raised movement time by 124%; no per-lift time is published for FPS play." },
    // ---- v6.0 (research/engine_v6_physics.md)
    kExcess:  { central: 0.004, low: 0.002, high: 0.008, unit: "s/cm", basis: "estimate",
                note: "v6: time per cm of travel beyond the aiming joint's comfortable reach, covered by a slower, larger joint. Replaces the v5 step-only switch cost, which gave wrist aimers no gradient (they pass 3 cm at almost any sensitivity) and so ranked them slower than arm aimers. No study measures it." },
    kEnd:     { central: 0.03,  low: 0.015, high: 0.05,  unit: "fraction", basis: "research",
                note: "v6: signal-dependent endpoint noise after corrections, as a share of movement amplitude (Schmidt et al. 1979; Harris & Wolpert 1998; prior from research/engine_v6_physics.md §1, k_final). Adds to the constant floor sigma0 in quadrature." },
    vPeak:    { central: 150,   low: 100,   high: 250,   unit: "cm/s", basis: "research",
                note: "Peak hand speed in a large turn. Casiez et al. 2008 measured 1.5 m/s at the 97th percentile (2.4 m/s max) and a 10–14% slowdown near that limit." },
    startSpread: { central: 0.5, low: 0.2,  high: 0.8,   unit: "fraction", basis: "estimate",
                note: "How far from the pad centre the hand typically starts a turn, as a fraction of the half-width." },
    recentre: { central: 0.85,  low: 0.7,   high: 0.95,  unit: "fraction", basis: "estimate",
                note: "Share of the usable pad width gained per lift." },
    reachSd:  { central: 0.35,  low: 0.25,  high: 0.5,   unit: "log",  basis: "estimate",
                note: "Uncertainty of comfortable reach when it hasn't been measured." },
    mouseW:   { central: 6.5,   low: 6.0,   high: 7.0,   unit: "cm",  basis: "measured",
                note: "Typical mouse width, which reduces the usable pad width." },
    turnScale:{ central: 1.0,   low: 0.5,   high: 1.5,   unit: "x",   basis: "estimate",
                note: "How many big turns the task mix contains, relative to the role/agent mix. No study measures turn angles in real Valorant or CS matches, so the turn shares are averaged over half to one and a half times their stated value." },
    tolerance:{ central: 0.006, low: 0.003, high: 0.012, unit: "s",   basis: "estimate",
                note: "Extra time per engagement treated as practically negligible when defining the near-optimal range." },
    // ---- v4.0: tracking task (research/sensitivity_motor_research.md §1, research/valorant_aim_data.md §1)
    strafeV:  { central: 5.4,   low: 4.1,   high: 6.75,  unit: "m/s", basis: "research",
                note: "Enemy strafe speed. 5.40 m/s derived from the Riot wiki's ADS move speed (4.10 m/s = 76% of run); 6.75 m/s knife speed is a community figure." },
    trackK:   { central: 0.10,  low: 0.05,  high: 0.20,  unit: "fraction", basis: "estimate",
                note: "Signal-dependent noise: velocity error as a share of the target's angular speed (Harris & Wolpert 1998 show it exists; no fitted value for mouse tracking was found)." },
    trackFloor:{ central: 0.025, low: 0.015, high: 0.04, unit: "cm",  basis: "estimate",
                note: "Hand position noise while following a moving target. Set just above the static floor sigma0, because the hand is already moving; no study measures it." },
    trackDelay:{ central: 0.15, low: 0.10,  high: 0.20,  unit: "s",   basis: "estimate",
                note: "Visual feedback delay during pursuit: the window over which a speed mismatch builds up before it can be corrected." },
    tTrack:   { central: 0.25,  low: 0.15,  high: 0.40,  unit: "s",   basis: "estimate",
                note: "Firing time needed on a moving target at a perfect hit rate (about 2–3 Vandal/Phantom rounds at 9.75–11 rounds/s, Riot wiki)." },
    // ---- v4.0: progression rule (how far to move from the current setting)
    adaptLambda:{ central: 0.03, low: 0.015, high: 0.06, unit: "s/ln²", basis: "estimate",
                note: "Re-adaptation cost of changing sensitivity, as seconds per engagement per squared log-change. Gain adaptation generalises broadly (Krakauer et al. 2000), but no study gives a recovery time for mouse sensitivity." },
    maxStep:  { central: 0.15,  low: 0.10,  high: 0.20,  unit: "fraction", basis: "estimate",
                note: "Largest change recommended in one session. Bigger moves are split into stages, one per run. Heuristic: no study measures it." },
    jnd:      { central: 0.03,  low: 0.02,  high: 0.05,  unit: "fraction", basis: "estimate",
                note: "Smallest change worth recommending. No just-noticeable-difference study for mouse sensitivity exists." }
  };
  // Parameters averaged over (3-point quadrature: low/central/high with weights 1/4, 1/2, 1/4).
  // These are the constants that moved the questionnaire answer most in sensitivityAnalysis().
  var UNCERTAIN = ["sigma0", "cFlick", "headM", "tSub", "turnScale"];

  /* Task mix: explicit assumptions, not role bonuses. theta = turn size (deg). */
  var TASKS = [
    { key: "micro",   theta: 2,   mech: "floor", label: "small correction" },
    { key: "flick",   theta: 25,  mech: "flick", label: "target switch" },
    { key: "turn90",  theta: 90,  mech: "reach", mt: 0.40, label: "90° turn" },
    { key: "turn180", theta: 180, mech: "reach", mt: 0.50, label: "180° turn" },
    { key: "track",   theta: 0,   mech: "track", label: "tracking" }
  ];
  var NT = TASKS.length;
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
  // v4.0: share of engagements decided while following a strafing target, carved proportionally out of the
  // small-correction and target-switch shares. ESTIMATES: no Valorant analytics split tracking from flicking.
  // Close-range guns fight moving targets more; Operator shots are mostly held angles.
  var TRACK_SHARE = { rifle: 0.15, sniper: 0.05, close: 0.25 };
  // v4.0: experience scales the hand noise floors and correction time. ESTIMATES: practice lowers endpoint
  // variability in general motor learning, but no study gives expert vs novice mouse numbers.
  var EXPERIENCE = {
    "new":  { noise: 1.30, tSub: 1.15, label: "Under 6 months" },
    mid:    { noise: 1.12, tSub: 1.05, label: "6 months to 2 years" },
    exp:    { noise: 1.00, tSub: 1.00, label: "2+ years" },
    comp:   { noise: 0.90, tSub: 0.95, label: "Competitive" }
  };
  // v4.0: grip. Finger pointing has lower throughput than wrist pointing (Balakrishnan & MacKenzie 1997: ~3.0 vs
  // ~4.1 bits/s), so fingertip control is not treated as more precise. A raised-palm grip makes lifts quicker.
  var GRIP = {
    palm:      { noise: 1.00, lift: 1.00, label: "Palm" },
    claw:      { noise: 1.03, lift: 0.92, label: "Claw" },
    fingertip: { noise: 1.05, lift: 0.85, label: "Fingertip" },
    unsure:    { noise: 1.00, lift: 1.00, label: "Not sure" }
  };
  // v4.0: mouse weight (g). Reference = pro median 60 g (EsportsSettings, 1481 pros). Heavier mice make lifts
  // slower and lower peak speed slightly. ESTIMATES: no study measures movement time against weight.
  var MOUSE_REF_G = 60;
  function weightFactors(g) {
    if (!finitePos(g)) return { lift: 1, v: 1 };
    var r = clamp(g, 30, 200) / MOUSE_REF_G;
    return { lift: clamp(Math.pow(r, 0.35), 0.8, 1.4), v: clamp(Math.pow(r, -0.10), 0.85, 1.1) };
  }
  // Aiming joint -> wrist share and comfortable one-direction reach (cm) before a bigger joint takes over.
  // One-direction reach from the starting point, about half of a comfortable single swipe, since a turn can go either way:
  // wrist-only ~±3 cm (30–40° comfortable radial–ulnar deviation, Ryu et al. 1991, on an estimated 8–10 cm pivot),
  // arm + wrist swipe ~20 cm (15–30; estimate under Casiez et al.'s 30 cm no-clutch cap). Mixed styles interpolate in log space.
  var REACH_WRIST = 3, REACH_ARM = 10;
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
    var ps = input.personal || {};
    var padM = ps.padCm && ps.padCm.value >= 5 && ps.padCm.value <= 200 ? ps.padCm.value : null;
    var usable = padM ? padM : Math.max(2, input.pad - P.mouseW);
    var reachIn = finitePos(input.reachCm) ? input.reachCm : (ps.reachCm && ps.reachCm.value > 0.5 && ps.reachCm.value <= 100 ? ps.reachCm.value : null);
    var reachMeasured = !!reachIn;
    var reach = reachMeasured ? reachIn : LIMB[limbKey].reach;
    var reachSd = reachMeasured ? 0.10 : P.reachSd * (limbKey === "unsure" ? 1.4 : 1);
    var w = headDeg(R_REF, P.headM), wWpn = headDeg(wpn.r, P.headM);
    var mix0 = (input.mix && (input.mix.length === 4 || input.mix.length === 5)) ? input.mix.slice()
        : (input._agentProf ? input._agentProf.mix.slice() : ROLE[role].mix.slice());
    var mix4 = scaleTurns(mix0.slice(0, 4), input.mix ? 1 : P.turnScale);
    var trackShare = input.mix ? (input.mix.length === 5 ? input.mix[4] : 0) : trackShareFor(input.weapon);
    var mix = input.mix && input.mix.length === 5 ? input.mix.slice() : carveTracking(mix4, trackShare);
    // v4.0 skill, grip and mouse modifiers act on copies of the constants used by this profile.
    var ex = EXPERIENCE[input.experience] || EXPERIENCE.exp, gr = GRIP[input.grip] || GRIP.unsure, wf = weightFactors(input.mouseG);
    // Measured constants (input.personal) already include the player's skill, grip and mouse: no modifiers on top.
    var meas = function (k) { return !!(ps[k] && ps[k].value > 0); };
    var Q = Object.assign({}, P, {
      sigma0: meas("sigma0") ? P.sigma0 : P.sigma0 * ex.noise * gr.noise,
      trackFloor: P.trackFloor * (meas("sigma0") ? P.sigma0 / PARAMS.sigma0.central : ex.noise * gr.noise),
      tSub: meas("tSub") ? P.tSub : P.tSub * ex.tSub, tLift: meas("tLift") ? P.tLift : P.tLift * gr.lift * wf.lift, vPeak: meas("vPeak") ? P.vPeak : P.vPeak * wf.v
    });
    var omega = P.strafeV / wpn.r * 180 / Math.PI;      // target angular speed, deg/s
    return {
      mix: mix, trackShare: mix[4],
      usable: usable, D: usable / 2, reach: reach, reachSd: reachSd, reachMeasured: reachMeasured,
      r: wpn.r, headDeg: w, headDegWpn: wWpn, sigma: Q.sigma0, v: Q.vPeak, omega: omega,
      cFlick: P.cFlick * Math.pow(wWpn / w, -0.25),    // 16x smaller target -> 1 octave slower (NVIDIA)
      modifiers: { experience: ex.label, noise: ex.noise * gr.noise, tSub: ex.tSub, grip: gr.label, lift: gr.lift * wf.lift, speed: wf.v },
      P: Q
    };
  }
  function trackShareFor(weapon) { return TRACK_SHARE[weapon] != null ? TRACK_SHARE[weapon] : TRACK_SHARE.rifle; }
  // Take a tracking share t out of the small-correction and target-switch shares, in proportion.
  function carveTracking(mix4, t) {
    var small = mix4[0] + mix4[1], take = Math.min(t, small * 0.9), f = small > 0 ? (small - take) / small : 1;
    return [mix4[0] * f, mix4[1] * f, mix4[2], mix4[3], take];
  }

  // Scale the big-turn shares by k and take the difference from the small-correction/flick shares proportionally.
  function scaleTurns(mix, k) {
    if (k === 1 || k == null) return mix;
    var turns = mix[2] + mix[3], small = mix[0] + mix[1];
    var t2 = Math.min(0.9, turns * k), f = small > 0 ? (1 - t2) / small : 0, g = turns > 0 ? t2 / turns : 0;
    return [mix[0] * f, mix[1] * f, mix[2] * g, mix[3] * g];
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
  // v6: expected travel past comfortable reach, E[(a - R)+] with R log-normal(ln reach, reachSd) (closed form).
  function excessBeyondReach(a, pr) {
    if (a <= 0) return 0;
    var s = pr.reachSd, d = (Math.log(a) - Math.log(pr.reach)) / s;
    return a * normCdf(d) - pr.reach * Math.exp(s * s / 2) * normCdf(d - s);
  }
  function pBeyondReach(a, pr) { return a <= 0 ? 0 : normCdf((Math.log(a) - Math.log(pr.reach)) / pr.reachSd); }

  function taskCost(task, C, pr) {
    var P = pr.P, a = C * task.theta / 360;
    if (task.mech === "floor") {
      var W = C * pr.headDeg / 360, sig = Math.sqrt(P.sigma0 * P.sigma0 + Math.pow(P.kEnd * a, 2));
      var p = Math.max(1e-6, erf(W / (2 * Math.SQRT2 * sig)));
      return { prec: P.tSub * (1 - p) / p, trav: 0, lift: 0 };
    }
    if (task.mech === "flick") {
      var o = log2(C / pr.cFlick), v = P.mtFlick * P.kappa * o * o;
      return { prec: o < 0 ? v : 0, trav: o > 0 ? v : 0, lift: 0 };
    }
    if (task.mech === "track") {
      // Angular tracking error: the hand noise floor maps to 360*floor/C degrees (shrinks as C grows), while the
      // speed-matching error k*omega*delay is the same at every C. Hit probability on the head follows erf; firing
      // time to land the needed hits scales as 1/p, measured against an ideal (noise-floor-free) tracker.
      var eFloor = 360 * P.trackFloor / C, eVel = P.trackK * pr.omega * P.trackDelay;
      var W2 = pr.headDegWpn / (2 * Math.SQRT2);
      var pT = Math.max(1e-6, erf(W2 / Math.sqrt(eFloor * eFloor + eVel * eVel))), pInf = erf(W2 / Math.max(1e-9, eVel));
      return { prec: P.tTrack * (pInf / pT - 1), trav: 0, lift: 0 };
    }
    var dur = 1.875 * a / P.vPeak;        // minimum-jerk duration at peak speed vPeak
    var speed = Math.pow(Math.pow(task.mt, 4) + Math.pow(dur, 4), 0.25) - task.mt;
    return { prec: 0, trav: speed, lift: P.tLift * expectedLifts(a, pr) + P.kExcess * excessBeyondReach(a, pr) };
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
  function scenarios(base, keys, ranges) {
    var list = [{ P: Object.assign({}, base), w: 1 }];
    keys.forEach(function (k) {
      var next = [], R = (ranges && ranges[k]) || PARAMS[k];
      list.forEach(function (s) {
        [["low", 0.25], ["central", 0.5], ["high", 0.25]].forEach(function (q) {
          var P = Object.assign({}, s.P); P[k] = R[q[0]];
          next.push({ P: P, w: s.w * q[1] });
        });
      });
      list = next;
    });
    return list;
  }

  var GRID = (function () { var g = []; for (var x = Math.log(8); x <= Math.log(160) + 1e-9; x += 0.01) g.push(Math.exp(x)); return g; })();

  // v6: each scenario's cost is tabulated once on a coarse log grid (step 0.02) and interpolated with a C1
  // Catmull-Rom spline. That cuts the cost of a recommendation ~3x and makes per-scenario optima free.
  var CG = (function () { var g = []; for (var x = Math.log(6); x <= Math.log(200) + 1e-9; x += 0.02) g.push(x); return g; })();
  var CG0 = CG[0], CGH = 0.02;
  function spline(arr, x) {
    var u = (x - CG0) / CGH, i = Math.floor(u);
    if (i < 1) i = 1; if (i > arr.length - 3) i = arr.length - 3;
    var t = u - i, p0 = arr[i - 1], p1 = arr[i], p2 = arr[i + 1], p3 = arr[i + 2];
    if (t < 0 || t > 1) return p1 + (t < 0 ? t * (p2 - p0) / 2 : (t - 0) * (p2 - p1));    // outside the table: linear extension
    var t2 = t * t, t3 = t2 * t;
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  }
  // v6 (S5): constants measured by the aim test replace the population values. Their uncertainty (sd = standard
  // error) becomes the low/high range for the scenario average (central +- 1.28 sd in log space, i.e. 10th/90th).
  var PERSONAL_KEYS = { sigma0: [0.003, 0.2], tSub: [0.05, 0.5], vPeak: [30, 600], tLift: [0.06, 1.5] };
  function personalRanges(personal) {
    var out = { central: {}, ranges: {}, used: {} };
    if (!personal || typeof personal !== "object") return out;
    Object.keys(PERSONAL_KEYS).forEach(function (k) {
      var e = personal[k], lim = PERSONAL_KEYS[k];
      if (!e || !(e.value >= lim[0] && e.value <= lim[1])) return;
      var sdl = Math.min(1, Math.max(0.02, (e.sd > 0 ? e.sd : 0.15 * e.value) / e.value));
      out.central[k] = e.value; out.used[k] = e.value;
      out.ranges[k] = { low: e.value * Math.exp(-1.2816 * sdl), central: e.value, high: e.value * Math.exp(1.2816 * sdl) };
    });
    return out;
  }
  function expectedCurve(input, opts) {
    opts = opts || {};
    var pm = personalRanges(input.personal);
    var base = Object.assign(central(), pm.central, opts.params || {});
    var keys = (opts.uncertain || UNCERTAIN).filter(function (k) { return !(opts.params && k in opts.params); });
    Object.keys(pm.ranges).forEach(function (k) { if (keys.indexOf(k) < 0 && !(opts.params && k in opts.params)) keys.push(k); });
    // Keep the scenario count bounded (3^6 = 729 max): measured constants replace population uncertainty.
    if (keys.length > 6) keys = keys.filter(function (k) { return pm.ranges[k] || UNCERTAIN.indexOf(k) < 0; }).concat(UNCERTAIN.filter(function (k) { return !pm.ranges[k]; })).slice(0, 6);
    var scen = opts.noUncertainty ? [{ P: base, w: 1 }] : scenarios(base, keys, pm.ranges);
    var profs = scen.map(function (s) { return { pr: buildProfile(input, s.P), w: s.w }; });
    // Tables: weighted components, plus each scenario's total for its own optimum.
    var T = { prec: [], trav: [], lift: [], total: [] }, per = profs.map(function () { return []; });
    CG.forEach(function (x, gi) {
      var C = Math.exp(x), o = { prec: 0, trav: 0, lift: 0, total: 0 };
      profs.forEach(function (p, k) { var c = costAt(C, p.pr); per[k][gi] = c.total; o.prec += p.w * c.prec; o.trav += p.w * c.trav; o.lift += p.w * c.lift; o.total += p.w * c.total; });
      T.prec.push(o.prec); T.trav.push(o.trav); T.lift.push(o.lift); T.total.push(o.total);
    });
    function at(C) {
      var x = Math.log(C);
      return { prec: spline(T.prec, x), trav: spline(T.trav, x), lift: spline(T.lift, x), total: spline(T.total, x) };
    }
    function argmin(arr) {
      var bi = 1; for (var i = 1; i < arr.length - 2; i++) if (arr[i] < arr[bi]) bi = i;
      var lo = CG[Math.max(1, bi - 1)], hi = CG[Math.min(arr.length - 3, bi + 1)];
      for (var it = 0; it < 40; it++) { var m1 = lo + (hi - lo) * 0.382, m2 = lo + (hi - lo) * 0.618; if (spline(arr, m1) < spline(arr, m2)) hi = m2; else lo = m1; }
      return Math.exp((lo + hi) / 2);
    }
    var cStar = Math.min(GRID[GRID.length - 1], Math.max(GRID[0], argmin(T.total)));
    var scenOpt = null;
    function scenarioOptima() {
      if (!scenOpt) scenOpt = profs.map(function (p, k) { return { c: Math.min(GRID[GRID.length - 1], Math.max(GRID[0], argmin(per[k]))), w: p.w, pr: p.pr }; });
      return scenOpt;
    }
    return { at: at, cStar: cStar, jStar: at(cStar).total, profile: buildProfile(input, base), base: base, nScenarios: scen.length, scenarioOptima: scenarioOptima };
  }

  function weightedQuantile(items, q) {
    var b = items.slice().sort(function (x, y) { return x.c - y.c; }), tot = b.reduce(function (s, x) { return s + x.w; }, 0), acc = 0;
    for (var i = 0; i < b.length; i++) { acc += b[i].w; if (acc >= q * tot - 1e-12) return b[i].c; }
    return b[b.length - 1].c;
  }

  /* =========================================================================
   * Progression rule (v4.0): how far to move from the current setting.
   * Old rule: keep the current setting whenever it was inside the near-optimal range. That made the result
   * stick to whatever the player typed. New rule, an expected-utility step:
   *   1. J(x) = expected cost(e^x) + lambda * (x - x0)^2, x = ln C. lambda is the re-adaptation cost
   *      (satisfaction raises it by up to 2x: comfort is a reason to move less, not a measurement).
   *      The minimiser of J lies between the current setting and the optimum and always moves some way
   *      toward the optimum unless the current setting already is the optimum.
   *   2. Agreement: the share of scenarios (or bootstrap refits) whose own optimum lies beyond the JND in
   *      that direction. The step is scaled by (agreement - 0.5) / 0.35, clipped to [0, 1]: the model moves
   *      you only as far as its evidence agrees on a direction.
   *   3. Steps below the JND are not worth feeling: stay. Steps above maxStep are split into stages, one per run.
   * ========================================================================= */
  function progression(f, c0, cStar, opts) {
    var lam = opts.lambda, jnd = Math.log(1 + opts.jnd), cap = Math.log(1 + opts.maxStep);
    var x0 = Math.log(c0), xs = Math.log(cStar), lo = Math.min(x0, xs), hi = Math.max(x0, xs);
    function J(x) { return f(Math.exp(x)) + lam * (x - x0) * (x - x0); }
    var xt = x0, jt = J(x0);
    for (var x = lo; x <= hi + 1e-9; x += 0.002) { var v = J(x); if (v < jt) { jt = v; xt = x; } }
    var dir = xs > x0 ? 1 : xs < x0 ? -1 : 0;
    var agree = 0, tot = 0;
    (opts.optima || []).forEach(function (o) { tot += o.w; if (dir && dir * (Math.log(o.c) - x0) > jnd) agree += o.w; });
    var pAgree = tot > 0 ? agree / tot : (dir ? 1 : 0);
    var g = clamp((pAgree - 0.5) / 0.35, 0, 1);
    var want = (xt - x0) * g;                               // evidence-weighted target step (log units)
    var step = Math.abs(want) < jnd ? 0 : clamp(want, -cap, cap);
    var stages = step === 0 ? 0 : Math.ceil(Math.abs(want) / cap - 1e-9);
    var plan = [];
    for (var k = 1; k <= stages; k++) plan.push(Math.exp(x0 + clamp(want, -k * cap, k * cap)));
    var why;
    if (step !== 0) why = stages > 1 ? "moving toward the model's best in stages (stage 1 of " + stages + ")" : "moving toward the model's best";
    else if (!dir || Math.abs(xs - x0) < jnd) why = "current setting is already at the model's best";
    else if (g === 0) why = "the model's scenarios don't agree on which way to move: keep current";
    else why = "the change worth making is too small to feel: keep current";
    return { cm: Math.exp(x0 + step), step: Math.exp(step) - 1, target: Math.exp(x0 + want), targetFull: Math.exp(xt),
      agreement: pAgree, evidenceScale: g, stages: stages, plan: plan, stay: step === 0, reason: why, lambda: lam };
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
    if (input.resWidth != null && !(input.resWidth >= 640 && input.resWidth <= 8000)) throw new RangeError("resWidth must be 640–8000 px");
    if (input.reachCm != null && !(finitePos(input.reachCm) && input.reachCm <= 100)) throw new RangeError("reachCm must be between 0 and 100");
    if (input.mix != null) {
      if (!Array.isArray(input.mix) || (input.mix.length !== 4 && input.mix.length !== 5) || input.mix.some(function (x) { return !(x >= 0); }) || Math.abs(mean(input.mix) * input.mix.length - 1) > 1e-6)
        throw new RangeError("mix must be 4 (or 5, with tracking) non-negative shares summing to 1");
    }
    if (input.mouseG != null && !(finitePos(input.mouseG) && input.mouseG >= 20 && input.mouseG <= 250)) throw new RangeError("mouseG must be 20–250 g");
    if (input.rank != null && ["unsure", "iron", "bronze", "silver", "gold", "plat", "diamond", "asc", "imm", "rad"].indexOf(input.rank) < 0) throw new RangeError("rank must be unsure or iron..rad");
    if (input.personal != null && typeof input.personal !== "object") throw new TypeError("personal must be an object");
    if (input.grip != null && !GRIP[input.grip]) throw new RangeError("grip must be palm, claw, fingertip or unsure");
    [["region", REGION], ["age", AGE], ["glasses", GLASSES]].forEach(function (g) {
      if (input[g[0]] != null && !Object.prototype.hasOwnProperty.call(g[1], input[g[0]])) throw new RangeError(g[0] + " must be one of " + Object.keys(g[1]).join(", "));
    });
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
      if (["micro", "flick", "turn", "track"].indexOf(t.task) < 0) throw new RangeError("trial " + i + ": task must be micro, flick, turn or track");
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
    ["micro", "flick", "turn", "track"].forEach(function (t) {
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
    if (mix.length === 4) mix = carveTracking(mix, input && input.mix ? 0 : trackShareFor(input && input.weapon));
    var shares = { micro: mix[0], flick: mix[1], turn: mix[2] + mix[3], track: mix[4] };
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
    var cm, reason, prog = null;
    if (!validation.curveBeatsFlat) {
      cm = current && current >= lo && current <= hi ? current : best.c;
      reason = current && current >= lo && current <= hi ? "no reliable difference between tested settings: keep current" : "no reliable difference between tested settings";
      nearSet = [lo, hi];
    } else if (current) {
      // v4.0: same progression rule as the questionnaire, with bootstrap optima as the evidence of direction.
      // The target never leaves the tested range.
      var cc = clamp(current, lo, hi);
      var lamM = (o.adaptLambda != null ? o.adaptLambda : PARAMS.adaptLambda.central) * (1 + 0.25 * ((o.satisfaction || 3) - 1));
      prog = progression(full.composite, cc, best.c, { lambda: lamM, jnd: PARAMS.jnd.central, maxStep: PARAMS.maxStep.central,
        optima: opts.map(function (c) { return { c: c, w: 1 }; }) });
      cm = prog.cm; reason = prog.stay && Math.abs(Math.log(cc / current)) > 1e-9 ? "closest tested setting to your current one" : (prog.stay ? prog.reason.replace("model's scenarios", "bootstrap refits") : prog.reason.replace("model's best", "measured best"));
      if (prog.stay) cm = cc;
    } else { cm = best.c; reason = "measured optimum"; }
    return {
      cm: cm, reason: reason, fittedOptimum: best.c, tested: tested, nearOptimal: nearSet, progression: prog,
      optimumInterval: opts.length ? [quantile(opts, 0.1), quantile(opts, 0.9)] : null, bootOptima: opts,
      bootstrapRuns: B, validation: validation, warnings: warnings, orderCorrelation: orderCorr,
      composite: full.composite, taskWeights: full.w, nTrials: rows.length, options: o
    };
  }

  /* =========================================================================
   * Bell curve (v5.0, "The BIG Update")
   * The population of recommendations follows a normal distribution in "Valorant sens at 800 DPI" (s800):
   * mean 0.3, SD 0.1 (0.2 / 0.4 = one SD, 0.1 / 0.5 = two SD), clamped to [0.1, 0.7].
   *   zModel = -(ln cStar - muLn) / sdLn   where muLn / sdLn describe the physical model's optimum over a
   *            synthetic questionnaire population (scripts/bell_population.js). + means faster.
   *   z      = rho * zModel + region + age + glasses + agentWeight * agents   (shifts in SD units, research/)
   *   s800   = clamp(0.3 + 0.1 z, 0.1, 0.7)
   * The physical cost curve keeps its shape but is re-centred (shifted in log space) on the bell target, so
   * the progression rule, near-optimal band and scenario agreement work exactly as before.
   * Measured (calibration) results are not touched: real data beats any prior.
   * ========================================================================= */
  var BELL = { mean: 0.3, sd: 0.1, min: 0.1, max: 0.7, dpi: 800,
    muLn: /*@MULN*/3.8231/*@END*/, sdLn: /*@SDLN*/0.1103/*@END*/, rho: /*@RHO*/0.9894/*@END*/, agentWeight: 0.5 };
  /*@DEMO*/
  var REGION = {"na":{"label":"North America","z":0.0685,"basis":"research","note":"24 pros (United States and Canada). Median slightly above the overall pro median; NOT lower than APAC (Mann-Whitney z=0.07 vs APAC pooled)."},"latam":{"label":"Latin America","z":-0.0715,"basis":"research","note":"Chile/Argentina/Colombia; small n, shrunk hard."},"br":{"label":"Brazil","z":-0.1415,"basis":"research","note":"Brazil; lowest median but wide spread (one 1.5 outlier clamped to 0.7)."},"eu":{"label":"Europe","z":-0.0215,"basis":"research","note":"UK, Russia, Poland, Nordics, Iberia etc.; sits at the overall median."},"mena":{"label":"Middle East & North Africa","z":0.1085,"basis":"research","note":"Turkey 8 + Morocco 1. Turkey classified as Middle East (assumption); Turkish pros skew high. Weak."},"kr":{"label":"Korea","z":-0.0515,"basis":"research","note":"Korean-born pros; median near overall. Includes one eDPI-800 outlier clamped to 0.7."},"jp":{"label":"Japan","z":-0.0515,"basis":"research","note":"n=4 only; mostly shrinkage."},"cn":{"label":"China","z":-0.0015,"basis":"research","note":"n=4 only (EDG); mostly shrinkage."},"sea":{"label":"Southeast Asia","z":0.0885,"basis":"research","note":"Indonesia, Singapore, Malaysia, Thailand, Philippines, Cambodia; high-sens tail (f0rsakeN, cgrs, xccurate). Wide spread."},"oce":{"label":"Oceania","z":-0.0015,"basis":"estimate","note":"No Oceania pros in the ProSettings list; no data, set to 0."},"unsure":{"label":"Prefer not to say","z":0,"basis":"estimate","note":"Always 0."}};
  var AGE = {"u16": {"label": "Under 16", "z": 0, "basis": "estimate", "note": "v6: no sensitivity-by-age data exists, so age only widens the prior (mean shift 0). v5 guess: Guess, no sensitivity-by-age data found. Young players lack settled settings; literature gives no direction."}, "16_19": {"label": "16–19", "z": 0, "basis": "estimate", "note": "v6: no sensitivity-by-age data exists, so age only widens the prior (mean shift 0). v5 guess: Guess. Near the peak-speed ages; no data on sens."}, "20_24": {"label": "20–24", "z": 0, "basis": "estimate", "note": "v6: no sensitivity-by-age data exists, so age only widens the prior (mean shift 0). v5 guess: Reference group."}, "25_29": {"label": "25–29", "z": 0, "basis": "estimate", "note": "v6: no sensitivity-by-age data exists, so age only widens the prior (mean shift 0). v5 guess: Guess from literature: response-speed decline from ~24 (Thompson 2014, StarCraft 2) and speed-accuracy trade-off in older users."}, "30_34": {"label": "30–34", "z": 0, "basis": "estimate", "note": "v6: no sensitivity-by-age data exists, so age only widens the prior (mean shift 0). v5 guess: Judgement from the same literature; direction of the effect on preferred sens is unproven."}, "35p": {"label": "35+", "z": 0, "basis": "estimate", "note": "v6: no sensitivity-by-age data exists, so age only widens the prior (mean shift 0). v5 guess: Judgement. Older users slow down to keep accuracy (Hertzum & Hornbaek 2010). Capped well below 0.4 because no gamer sens data exists."}, "unsure": {"label": "Prefer not to say", "z": 0, "basis": "estimate", "note": "Always 0."}};
  var GLASSES = {"none":{"label":"No glasses","z":0,"basis":"estimate","note":"No glasses; reference."},"glasses":{"label":"Glasses","z":0,"basis":"estimate","note":"Literature: spectacle periphery is distorted and wearers shift to head turns over far eye movements, but no study links this to mouse sensitivity or its sign. Left at 0."},"contacts":{"label":"Contact lenses","z":0,"basis":"estimate","note":"No optical periphery distortion, but no sens data either. Left at 0."},"unsure":{"label":"Prefer not to say","z":0,"basis":"estimate","note":"Always 0."}};
  var AGENT_Z = {"Hush":{"z":0.201,"n":0,"basis":"role-only"},"Iso":{"z":0.201,"n":0,"basis":"role-only"},"Jett":{"z":0.24,"n":41,"basis":"research"},"Neon":{"z":0.186,"n":4,"basis":"research"},"Phoenix":{"z":0.201,"n":0,"basis":"role-only"},"Raze":{"z":0.229,"n":13,"basis":"research"},"Reyna":{"z":0.201,"n":0,"basis":"role-only"},"Waylay":{"z":0.114,"n":1,"basis":"research"},"Yoru":{"z":0.156,"n":2,"basis":"research"},"Breach":{"z":-0.104,"n":3,"basis":"research"},"Fade":{"z":-0.061,"n":0,"basis":"role-only"},"Gekko":{"z":-0.061,"n":0,"basis":"role-only"},"KAY/O":{"z":0.219,"n":3,"basis":"research"},"Skye":{"z":-0.084,"n":7,"basis":"research"},"Sova":{"z":-0.126,"n":27,"basis":"research"},"Tejo":{"z":-0.061,"n":0,"basis":"role-only"},"Astra":{"z":-0.137,"n":1,"basis":"research"},"Brimstone":{"z":-0.231,"n":0,"basis":"role-only"},"Clove":{"z":-0.231,"n":0,"basis":"role-only"},"Harbor":{"z":-0.231,"n":0,"basis":"role-only"},"Miks":{"z":-0.231,"n":0,"basis":"role-only"},"Omen":{"z":-0.312,"n":21,"basis":"research"},"Viper":{"z":-0.445,"n":7,"basis":"research"},"Chamber":{"z":0.128,"n":3,"basis":"research"},"Cypher":{"z":0.033,"n":10,"basis":"research"},"Deadlock":{"z":0.106,"n":0,"basis":"role-only"},"Killjoy":{"z":0.126,"n":2,"basis":"research"},"Sage":{"z":0.238,"n":2,"basis":"research"},"Veto":{"z":0.106,"n":0,"basis":"role-only"},"Vyse":{"z":0.106,"n":0,"basis":"role-only"}};
  /*@END*/
  function s800FromCm(cm) { return K / (cm * BELL.dpi); }
  function cmFromS800(s) { return K / (s * BELL.dpi); }
  function bellTarget(input, cStar) {
    var zModel = -(Math.log(cStar) - BELL.muLn) / BELL.sdLn, shifts = [];
    [["region", REGION], ["age", AGE], ["glasses", GLASSES]].forEach(function (g) {
      var e = input[g[0]] != null && g[1][input[g[0]]];
      if (e && input[g[0]] !== "unsure") shifts.push({ key: g[0], label: e.label, z: e.z, basis: e.basis });
    });
    if (input._agentProf) {
      var za = 0, names = [];
      input._agentProf.agents.forEach(function (a) { var e = AGENT_Z[a.name]; if (e) za += a.share * e.z; names.push(a.name); });
      shifts.push({ key: "agents", label: names.join(", "), z: BELL.agentWeight * za, basis: "research",
        note: "Empirical agent trend at half weight: ability mechanics already move the physical optimum." });
    }
    var zRaw = BELL.rho * zModel + shifts.reduce(function (s, x) { return s + x.z; }, 0);
    var s800 = clamp(BELL.mean + BELL.sd * zRaw, BELL.min, BELL.max), z = (s800 - BELL.mean) / BELL.sd;
    var cm = cmFromS800(s800);
    return { mean: BELL.mean, sd: BELL.sd, min: BELL.min, max: BELL.max, zModel: zModel, rhoZModel: BELL.rho * zModel,
      shifts: shifts, zRaw: zRaw, z: z, s800: s800, clamped: s800 !== BELL.mean + BELL.sd * zRaw,
      percentile: normCdf(z), cm: cm, sensAtDpi: input.dpi ? s800 * BELL.dpi / input.dpi : null,
      cmModel: cStar, s800Model: s800FromCm(cStar) };
  }

  /* =========================================================================
   * Engine v6: one posterior over log cm/360 (docs/V1_ENGINE_V6_PLAN.md §2)
   *   log p(x) = log Prior_population(x | region, age, agents)
   *            + log L_physics(x | answers)     Normal: centre = physics optimum, bias-corrected to the population,
   *                                             variance = spread of scenario optima + sigmaModel^2
   *            + log L_measured(x | aim test)   kernel mixture over bootstrap optima (only when the fit is real)
   * The physics weight comes from sigmaModel (how well physics predicts real players), not from a hand-set rho,
   * so physical effects are shrunk toward the population instead of amplified (fixes the v5 bell layer).
   * ========================================================================= */
  var ENGINE = "6";
  var PRIOR = { muLn: /*@PMU*/3.9969/*@END*/, sdLn: /*@PSD*/0.4108/*@END*/, sdLnPro: /*@PSDPRO*/0.3333/*@END*/, sigmaModel: /*@SIGMOD*/0.5002/*@END*/, ageSdZ: 0.1,
    source: /*@PSRC*/"Centre 0.30 sens @800 (team decision). Width: SD of ln cm/360 = 0.4108 for 4590 general players, 0.3333 for 732 pros (research/population_v6). Physics weight from 995 players with known pad width: slope 0.7154 (SE 0.6732), combined with a prior weight N(0.35, 0.20) -> 0.3796."/*@END*/ };
  var LNGRID = GRID.map(function (c) { return Math.log(c); });
  function normLogPdf(x, m, s) { var z = (x - m) / s; return -0.5 * z * z - Math.log(s); }
  function zToLn(z) { return -z * PRIOR.sdLn; }                // + z (faster) = shorter cm/360
  function priorParts(input) {
    // Immortal/Radiant or "competitive" players are compared with the pro distribution (narrower); everyone else with general players.
    var rank = input.rank || (input.stats && input.stats.rank), proLike = rank === "imm" || rank === "rad" || input.experience === "comp";
    var sd0 = proLike ? PRIOR.sdLnPro : PRIOR.sdLn;
    var parts = [], mu = PRIOR.muLn, v = sd0 * sd0;
    [["region", REGION]].forEach(function (g) {
      var e = input[g[0]] != null && input[g[0]] !== "unsure" && g[1][input[g[0]]];
      if (e && e.z) { parts.push({ key: g[0], label: e.label, dLn: zToLn(e.z), basis: e.basis }); mu += zToLn(e.z); }
    });
    // Age: no sensitivity-by-age data exists, so it only widens the prior (mean shift 0).
    if (input.age != null && input.age !== "unsure") v += Math.pow(PRIOR.ageSdZ * PRIOR.sdLn, 2);
    if (input._agentProf) {
      var za = 0, names = [];
      input._agentProf.agents.forEach(function (a) { var e = AGENT_Z[a.name]; if (e) za += a.share * e.z; names.push(a.name); });
      if (za) { parts.push({ key: "agents", label: names.join(", "), dLn: zToLn(BELL.agentWeight * za), basis: "research",
        note: "Empirical agent trend (147 pros) at half weight: ability mechanics already enter the physics term." }); mu += zToLn(BELL.agentWeight * za); }
    }
    return { mu: mu, sd: Math.sqrt(v), parts: parts, group: proLike ? "pro" : "general" };
  }
  function physicsLik(E0) {
    var opt = E0.scenarioOptima(), tw = 0, m = 0, vv = 0;
    opt.forEach(function (o) { tw += o.w; m += o.w * Math.log(o.c); }); m /= tw;
    opt.forEach(function (o) { vv += o.w * Math.pow(Math.log(o.c) - m, 2); }); vv /= tw;
    var centre = Math.log(E0.cStar) - BELL.muLn + PRIOR.muLn;     // bias-corrected: the average profile sits at the population centre
    return { centre: centre, sd: Math.sqrt(vv + PRIOR.sigmaModel * PRIOR.sigmaModel), scenarioSd: Math.sqrt(vv), raw: E0.cStar };
  }
  var MEAS_STRUCT_SD = 0.15;
  function measuredLik(measured) {
    if (!measured || !measured.validation.curveBeatsFlat || !measured.bootOptima || !measured.bootOptima.length) return null;
    var xs = measured.bootOptima.map(function (c) { return Math.log(c); });
    // Silverman bandwidth over the bootstrap optima, plus a structural width (0.15 ln): the bootstrap only sees trial
    // noise inside one quadratic, not that the quadratic is an approximation. 0.15 gives ~77% coverage of 80% intervals
    // on simulated players (test/scorecard.js); 0.10 was overconfident (57-75%).
    var h = Math.sqrt(Math.pow(Math.max(0.04, 1.06 * (sd(xs) || 0) * Math.pow(xs.length, -0.2)), 2) + MEAS_STRUCT_SD * MEAS_STRUCT_SD);
    return { xs: xs, h: h, lo: Math.log(measured.tested[0]), hi: Math.log(measured.tested[measured.tested.length - 1]),
      logAt: function (x) { var s2 = 0; for (var i = 0; i < xs.length; i++) { var z = (x - xs[i]) / h; s2 += Math.exp(-0.5 * z * z); } return Math.log(s2 / xs.length + 1e-300); } };
  }
  function summarise(logp) {
    var mx = Math.max.apply(null, logp), w = logp.map(function (v) { return Math.exp(v - mx); }), tot = w.reduce(function (a, b) { return a + b; }, 0);
    w = w.map(function (v) { return v / tot; });
    function q(p) { var acc = 0; for (var i = 0; i < w.length; i++) { acc += w[i]; if (acc >= p) { var prev = acc - w[i]; var f = w[i] > 0 ? (p - prev) / w[i] : 0; return Math.exp(LNGRID[i] - 0.005 + 0.01 * f); } } return GRID[GRID.length - 1]; }
    var meanLn = 0; w.forEach(function (v, i) { meanLn += v * LNGRID[i]; });
    var varLn = 0; w.forEach(function (v, i) { varLn += v * Math.pow(LNGRID[i] - meanLn, 2); });
    return { w: w, median: q(0.5), meanLn: meanLn, sdLn: Math.sqrt(varLn), ci50: [q(0.25), q(0.75)], ci80: [q(0.1), q(0.9)] };
  }
  function posterior(input, E0, measured) {
    var pr = priorParts(input), ph = E0 ? physicsLik(E0) : null, me = measuredLik(measured);
    var lpPrior = LNGRID.map(function (x) { return normLogPdf(x, pr.mu, pr.sd); });
    var lpPhys = LNGRID.map(function (x) { return ph ? normLogPdf(x, ph.centre, ph.sd) : 0; });
    var lpMeas = LNGRID.map(function (x) { return me ? me.logAt(x) : 0; });
    var lp = LNGRID.map(function (x, i) { return lpPrior[i] + lpPhys[i] + lpMeas[i]; });
    var post = summarise(lp), priorOnly = summarise(lpPrior), noMeas = me ? summarise(lpPrior.map(function (v, i) { return v + lpPhys[i]; })) : post;
    // Waterfall in ln units: base prior centre -> each prior shift -> physics -> measured.
    var steps = [{ key: "population", label: "Players like you (population)", ln: PRIOR.muLn }];
    var acc = PRIOR.muLn;
    pr.parts.forEach(function (p) { acc += p.dLn; steps.push({ key: p.key, label: p.label, dLn: p.dLn, basis: p.basis, note: p.note }); });
    steps.push({ key: "physics", label: "Your setup (physical model)", dLn: Math.log(noMeas.median) - Math.log(priorOnly.median), basis: "model" });
    if (me) steps.push({ key: "measured", label: "Your aim test", dLn: Math.log(post.median) - Math.log(noMeas.median), basis: "measured" });
    var wPhys = ph ? (1 / (ph.sd * ph.sd)) / (1 / (ph.sd * ph.sd) + 1 / (pr.sd * pr.sd)) : 0;
    return { grid: GRID, weights: post.w, median: post.median, meanLn: post.meanLn, sdLn: post.sdLn, ci50: post.ci50, ci80: post.ci80,
      components: { prior: { centre: Math.exp(pr.mu), sdLn: pr.sd, parts: pr.parts, median: priorOnly.median },
        physics: ph ? { centre: Math.exp(ph.centre), sdLn: ph.sd, scenarioSdLn: ph.scenarioSd, raw: ph.raw, weight: wPhys } : null,
        measured: me ? { centre: Math.exp(mean(me.xs)), sdLn: sd(me.xs), bandwidth: me.h, range: [Math.exp(me.lo), Math.exp(me.hi)] } : null },
      waterfall: steps, sigmaModel: PRIOR.sigmaModel };
  }
  // v5-compatible "bell" view of the posterior, so older UI code keeps working (mean/sd in sens at 800 DPI).
  function bellView(input, post) {
    var mean0 = s800FromCm(Math.exp(PRIOR.muLn)), sd0 = mean0 * PRIOR.sdLn, s800 = s800FromCm(post.median);
    var toZ = function (dLn) { return (s800FromCm(Math.exp(PRIOR.muLn + dLn)) - mean0) / sd0; };
    var shifts = post.waterfall.slice(1).filter(function (s) { return s.key !== "physics"; }).map(function (s) { return { key: s.key, label: s.label, z: toZ(s.dLn), basis: s.basis, note: s.note }; });
    var phys = post.waterfall.filter(function (s) { return s.key === "physics"; })[0];
    var zModel = phys ? toZ(phys.dLn) : 0, z = (s800 - mean0) / sd0;
    return { mean: mean0, sd: sd0, min: BELL.min, max: BELL.max, zModel: zModel, rhoZModel: zModel, shifts: shifts,
      zRaw: z, z: z, s800: s800, clamped: false, percentile: normCdf(z), cm: post.median,
      sensAtDpi: input.dpi ? s800 * BELL.dpi / input.dpi : null, cmModel: post.components.physics ? post.components.physics.raw : null,
      s800Model: post.components.physics ? s800FromCm(post.components.physics.raw) : null,
      ci80s800: [s800FromCm(post.ci80[1]), s800FromCm(post.ci80[0])] };
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
    opts = opts || {};
    validateInput(input);
    input = withAgents(input, opts.agentRules);
    var E0 = expectedCurve(input, opts);
    var pr = E0.profile, P = E0.base;
    var tol = P.tolerance;
    var measured = null;
    if (input.calibration && input.calibration.trials) {
      measured = calibrate(input.calibration.trials, input, Object.assign({ satisfaction: input.satisfaction }, input.calibration.options));
    }
    // v6: posterior over log cm/360. opts.physicsOnly (alias noBell) = raw physical optimum; opts.priorOnly = population only.
    var physicsOnly = opts.physicsOnly || opts.noBell;
    var post = physicsOnly ? null : posterior(input, opts.priorOnly ? null : E0, opts.priorOnly ? null : measured);
    var target = post ? post.median : E0.cStar;
    var useMeas = !!(post && post.components.measured);
    if (useMeas) target = clamp(target, measured.tested[0], measured.tested[measured.tested.length - 1]);
    var ratio = E0.cStar / target;      // the physical cost curve keeps its shape, re-centred on the posterior median
    var E = { at: function (C) { return E0.at(C * ratio); }, cStar: target, jStar: E0.jStar };
    var band = nearOptimalSet(function (C) { return E.at(C).total; }, E.cStar, E.jStar, tol, GRID[0], GRID[GRID.length - 1]);
    // Evidence of direction: posterior mass (v6) or the physics scenario optima (physicsOnly).
    var optima = post ? GRID.map(function (c, i) { return { c: c, w: post.weights[i] }; }).filter(function (o) { return o.w > 1e-6; })
      : E0.scenarioOptima().map(function (o) { return { c: o.c, w: o.w }; });
    var spread = post ? post.ci80 : [weightedQuantile(optima, 0.1), weightedQuantile(optima, 0.9)];

    var c0 = input.current ? input.current.cm : null, sat = input.satisfaction || 3;
    var cm = target, reason = useMeas ? "measured and modelled best" : post ? "most likely best for you" : "model optimum", anchor = null;
    if (c0) {
      // Preference is not performance: satisfaction only raises the re-adaptation cost (fewer, smaller steps), at most 2x.
      var satMult = 1 + 0.25 * (sat - 1);
      var lo = useMeas ? measured.tested[0] : GRID[0], hi = useMeas ? measured.tested[measured.tested.length - 1] : GRID[GRID.length - 1];
      var cc = clamp(c0, lo, hi);
      var jc = E.at(cc).total;
      var inLikely = post && cc >= post.ci50[0] && cc <= post.ci50[1];
      var prog = progression(function (C) { return E.at(C).total; }, cc, target, {
        lambda: P.adaptLambda * satMult, jnd: P.jnd, maxStep: P.maxStep, optima: optima });
      if (inLikely) { prog.stay = true; prog.reason = "your current setting is inside the most likely range: keep it"; }
      // The aim test found no reliable difference between tested settings: the data says keep what you have.
      if (measured && !useMeas && c0 >= measured.tested[0] && c0 <= measured.tested[measured.tested.length - 1]) { prog.stay = true; cc = c0; prog.reason = "no reliable difference between tested settings: keep current"; }
      cm = prog.stay ? cc : prog.cm;
      reason = prog.reason;
      anchor = { cm: c0, costDiff: jc - E.jStar, inBand: c0 >= band[0] && c0 <= band[1], inLikely: !!inLikely, stay: prog.stay, tolStay: tol * satMult,
        satMult: satMult, step: prog.stay ? cc / c0 - 1 : cm / c0 - 1, target: prog.target, agreement: prog.agreement, evidenceScale: prog.evidenceScale,
        stages: prog.stay ? 0 : prog.stages, plan: prog.stay ? [] : prog.plan, gainMs: (jc - E.at(cm).total) * 1000,
        lifts90: expectedLifts(c0 * 90 / 360, pr), sd: null, weight: prog.stay ? 1 : 0 };
    }

    var notes = [];
    if (cm * 90 / 360 > pr.D) notes.push("pad90");
    if (cm < 20) notes.push("fast");
    if (cm > 80) notes.push("slow");
    if (measured && !useMeas) notes.push("measuredFlat");

    var curve = [];
    for (var C = 15; C <= 120; C += 1) { var c = E.at(C); curve.push({ C: C, total: c.total, prec: c.prec, trav: c.trav, lift: c.lift }); }
    var byTask = TASKS.map(function (t, j) { var c = taskCost(t, cm * ratio, pr); return { key: t.key, label: t.label, share: pr.mix[j], cost: pr.mix[j] * (c.prec + c.trav + c.lift) }; });

    var width = post ? Math.log(post.ci80[1] / post.ci80[0]) / 2 : null;
    var label = width == null ? "low" : width < 0.12 ? "high" : width < 0.22 ? "medium" : width < 0.32 ? "low–medium" : "low";
    var confidence = { type: useMeas ? "measured" : (post ? "posterior" : "heuristic"), label: label, interval: spread, spread: spread, halfWidthLn: width,
      note: useMeas ? "80% interval from the population, your setup and your aim test combined."
        : "80% interval from the population and your setup. The physical model is not yet validated on real players; the aim test narrows this." };

    var range = post ? post.ci50 : band;
    var near = PROS.slice().sort(function (a, b) { return Math.abs(Math.log(a.cm / cm)) - Math.abs(Math.log(b.cm / cm)); }).slice(0, 5);
    return {
      engine: ENGINE, cm: cm, reason: reason, mode: useMeas ? "measured" : "questionnaire",
      lo: range[0], hi: range[1], band: band, cModel: E0.cStar, cBell: target, target: target, posterior: post,
      bell: post ? bellView(input, post) : null, modelCost: E.at(E.cStar), tolerance: tol,
      profile: pr, anchor: anchor, stats: statsSignals(input.stats), measured: measured, confidence: confidence,
      agents: input._agentProf || null, scopedAdvice: scopedAdvice(input._agentProf, input.weapon),
      dpiAdvice: input.dpi ? dpiAdvice(cm, input.dpi, input.resWidth) : null,
      notes: notes, curve: curve, byTask: byTask, optimumSpread: spread, nearPros: near,
      proPercentile: PROS.filter(function (p) { return p.cm < cm; }).length / Math.max(1, PROS.length),
      nScenarios: E0.nScenarios, personalUsed: (function () { var u = personalRanges(input.personal).used, pr2 = E0.profile; if (pr2.reachMeasured && input.personal && input.personal.reachCm) u.reachCm = pr2.reach; if (input.personal && input.personal.padCm && input.personal.padCm.value) u.padCm = pr2.usable; return Object.keys(u).length ? u : null; })()
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
    var rows = Object.keys(PARAMS).filter(function (k) { return ["tolerance", "adaptLambda", "maxStep", "jnd"].indexOf(k) < 0; }).map(function (k) {
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
      { param: "agent ability rates x2", value: expectedCurve(withAgents(rawInput, scaleRates(2)), { noUncertainty: true }).cStar },
      { param: "no tracking task", value: alt({ mix: carveTracking(scaleTurns((input._agentProf ? input._agentProf.mix : (ROLE[input.role] || ROLE.f).mix).slice(), 1), 0) }) },
      { param: "tracking share x2", value: alt({ mix: carveTracking((input._agentProf ? input._agentProf.mix : (ROLE[input.role] || ROLE.f).mix).slice(), 2 * trackShareFor(input.weapon)) }) },
      { param: "experience → 2+ years", value: alt({ experience: "exp" }) },
      { param: "grip and mouse weight ignored", value: alt({ grip: null, mouseG: null }) }
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

  /* DPI / pixel-skipping check. At the screen centre one pixel spans atan(2 tan(hFOV/2) / width) degrees
     (103° hFOV: 0.075° at 1920, 0.056° at 2560, 0.0375° at 3840). If one mouse count turns you further than one
     pixel, the view jumps in steps you can see. Hand noise (~0.2 mm, Casiez 2008) is the real precision limit at
     normal settings, and sensors smooth or jitter at very high DPI, so 800–1600 is the evidence-based range. */
  function dpiAdvice(cm, dpi, width) {
    width = width || 1920;
    var sens = sensFor(cm, dpi), perCount = YAW * sens, px = Math.atan(Math.tan(HFOV / 2 * Math.PI / 180) / (width / 2)) * 180 / Math.PI;
    var ratio = perCount / px, out = { dpi: dpi, sens: sens, degPerCount: perCount, degPerPixel: px, ratio: ratio, width: width, suggest: null, level: "ok" };
    if (ratio > 1) {
      var d = [800, 1600, 3200].filter(function (x) { return x > dpi && YAW * sensFor(cm, x) <= px * 0.75; })[0] || 1600;
      out.level = "skip"; out.suggest = { dpi: d, sens: sensFor(cm, d) };
      out.text = "At " + dpi + " DPI each mouse count turns you " + perCount.toFixed(3) + "°, more than one pixel (" + px.toFixed(3) + "°) at your resolution, so fine adjustments jump. Use " + d + " DPI at sens " + out.suggest.sens.toFixed(3) + " for the same cm/360.";
    } else if (dpi > 3200) {
      out.level = "high"; out.text = "Above 3200 DPI many sensors add smoothing or jitter, and nothing is gained: hand noise, not counts, limits precision. 800–1600 DPI is plenty.";
    } else if (ratio > 0.5) {
      out.level = "near"; out.text = "Each count turns you " + Math.round(ratio * 100) + "% of a pixel. Fine for now, but 1600 DPI would give finer steps at the same cm/360.";
    } else out.text = "Each count turns you " + Math.round(ratio * 100) + "% of a pixel: no visible stepping. Keep your DPI.";
    return out;
  }

  var api = {
    VERSION: "1.0.0", ENGINE: ENGINE, PRIOR: PRIOR, posterior: posterior, BELL: BELL, REGION: REGION, AGE: AGE, GLASSES: GLASSES, AGENT_Z: AGENT_Z, bellTarget: bellTarget, s800FromCm: s800FromCm, cmFromS800: cmFromS800, TRACK_SHARE: TRACK_SHARE, EXPERIENCE: EXPERIENCE, GRIP: GRIP, progression: progression, carveTracking: carveTracking, dpiAdvice: dpiAdvice, AGENT_LIST: AGENT_LIST, AGENT_RULES: AGENT_RULES,
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
