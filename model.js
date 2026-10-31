/*
 * valoSens model: derives an optimal Valorant cm/360 from a cost function
 * instead of per-answer multipliers.
 *
 *   J(C) = lambda * A / C^2      precision cost (hand noise vs. target size in motor space)
 *        + B * C                 travel cost (distance / limb speed)
 *        + T_lift * L(C)         clutch cost (expected mouse lifts given pad reach)
 *
 * C = cm per 360 degrees. A and B come from the player's limb, surface and role
 * engagement profile. lambda is calibrated so the reference profile reproduces the
 * VCT 2026 pro median; each role's effective engagement distance is fitted so the
 * reference physics reproduces that role's (shrunk) pro median. The model optimum is
 * then combined with the player's current setting in log space, weighted by inverse
 * variance (a normal-normal Bayesian update).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ValoModel = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ---------- Game constants ---------- */
  var YAW = 0.07;                       // Valorant degrees per count at sens 1
  var K = 360 * 2.54 / YAW;             // cm/360 = K / (DPI * sens)
  var OTHER_YAW = { cs2: 0.022, apex: 0.022, ow2: 0.0066 };
  var HEAD_M = 0.25;                    // approximate head hitbox width (m)
  var MOUSE_W = 6.5;                    // cm of pad taken by the mouse itself

  function cmFrom(dpi, sens) { return K / (dpi * sens); }
  function sensFor(cm, dpi) { return K / (cm * dpi); }
  function edpiFor(cm) { return K / cm; }

  /* ---------- VCT 2026 pro data (ProSettings.net snapshot, see research/) ---------- */
  // role: d = duelist, i = initiator, c = controller, s = sentinel, f = flex, null = unverified
  var PROS = [
    ["ZmjjKK", 800, 0.395, "d"], ["Smoggy", 800, 0.31, "c"], ["CHICHOO", 800, 0.2, "s"],
    ["nobody", 800, 0.26, "i"], ["benjyfishy", 800, 0.27, "s"], ["SirMaza", 400, 0.5, null],
    ["RieNs", 800, 0.27, "i"], ["t3xture", 800, 0.43, "d"], ["Lakia", 800, 0.3, "i"],
    ["Karon", 800, 0.2, "c"], ["ZynX", 1600, 0.1, "s"], ["kiNgg", 1600, 0.1, "c"],
    ["spikeziN", 800, 0.23, "d"], ["Sato", 800, 0.35, "d"], ["Neon", 800, 0.21, "f"],
    ["Blowz", 800, 0.2, "i"], ["trent", 1600, 0.16, "i"], ["babybay", 1600, 0.11, "s"],
    ["leaf", 1600, 0.08, "c"], ["Shanks", 800, 0.22, null], ["valyn", 1600, 0.15, "c"],
    ["jawgemo", 1600, 0.157, "d"], ["Alfajer", 400, 0.45, "d"], ["crashies", 1600, 0.1, "f"],
    ["Boaster", 800, 0.2, "c"], ["PROD", 800, 0.52, "d"], ["Cloud", 800, 0.4, "i"],
    ["kaajak", 1600, 0.1, "d"], ["Veqaj", 1600, 0.125, null], ["MaKo", 400, 0.45, "c"],
    ["Lothar", 1600, 0.2, null], ["BeYN", 400, 0.4, "i"]
  ].map(function (r) {
    return { name: r[0], dpi: r[1], sens: r[2], edpi: r[1] * r[2], cm: cmFrom(r[1], r[2]), role: r[3] };
  });

  function mean(a) { return a.reduce(function (s, x) { return s + x; }, 0) / a.length; }
  function sd(a) { var m = mean(a); return Math.sqrt(a.reduce(function (s, x) { return s + (x - m) * (x - m); }, 0) / (a.length - 1)); }
  function median(a) { var b = a.slice().sort(function (x, y) { return x - y; }); var n = b.length; return n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2; }
  function quantile(a, q) {
    var b = a.slice().sort(function (x, y) { return x - y; });
    var p = (b.length - 1) * q, lo = Math.floor(p), hi = Math.ceil(p);
    return b[lo] + (b[hi] - b[lo]) * (p - lo);
  }

  var PRO_LOG = PROS.map(function (p) { return Math.log(p.cm); });
  var PRO_STATS = {
    n: PROS.length,
    medianCm: Math.exp(median(PRO_LOG)),
    q1Cm: quantile(PROS.map(function (p) { return p.cm; }), 0.25),
    q3Cm: quantile(PROS.map(function (p) { return p.cm; }), 0.75),
    logMean: mean(PRO_LOG),
    logSd: sd(PRO_LOG),
    medianEdpi: median(PROS.map(function (p) { return p.edpi; }))
  };

  /* Role prior from pros, shrunk toward the all-pro mean (empirical Bayes, k pseudo-players). */
  var SHRINK_K = 6;
  var ROLE_KEYS = ["d", "i", "c", "s"];
  function rolePrior(role) {
    var xs = PROS.filter(function (p) { return p.role === role; }).map(function (p) { return Math.log(p.cm); });
    var n = xs.length;
    var mu = n ? (n * mean(xs) + SHRINK_K * PRO_STATS.logMean) / (n + SHRINK_K) : PRO_STATS.logMean;
    return { n: n, logMu: mu, cm: Math.exp(mu), rawCm: n ? Math.exp(mean(xs)) : null };
  }

  /* ---------- Physical parameters ---------- */
  // Limb segment doing most of the aiming. sigma = endpoint noise (cm), v = comfortable peak speed (cm/s),
  // sweep = comfortable single-motion travel without re-positioning the arm (cm).
  var LIMB = {
    wrist:   { sigma: 0.045, v: 35, sweep: 7,  label: "Wrist" },
    wf:      { sigma: 0.060, v: 50, sweep: 16, label: "Wrist + forearm" },
    forearm: { sigma: 0.075, v: 70, sweep: 30, label: "Forearm / elbow" },
    arm:     { sigma: 0.095, v: 95, sweep: 45, label: "Whole arm" }
  };
  // Pad surface: friction changes stopping precision (sigma) and how fast you can travel (v).
  var SURFACE = {
    control: { sigma: 0.92, v: 0.90, label: "Control" },
    hybrid:  { sigma: 1.00, v: 1.00, label: "Balanced / hybrid" },
    speed:   { sigma: 1.08, v: 1.10, label: "Speed" },
    glass:   { sigma: 1.15, v: 1.18, label: "Glass / hard" }
  };
  // Movement amplitudes (degrees) a round asks for, and how much each ends in a precise stop.
  var TASKS = [
    { key: "hold",  theta: 4,   prec: 1.0 },  // micro-adjusting on a held angle
    { key: "flick", theta: 30,  prec: 1.0 },  // target acquisition inside the FOV (103 deg)
    { key: "turn",  theta: 90,  prec: 0.5 },  // checking a side / off-angle
    { key: "spin",  theta: 180, prec: 0.3 }   // turning on a flank or rotate
  ];
  // Task mix per role (shares sum to 1). Engagement distance is fitted from pro data at load time.
  var ROLE = {
    d: { mix: [0.25, 0.45, 0.22, 0.08], label: "Duelist" },
    i: { mix: [0.35, 0.38, 0.20, 0.07], label: "Initiator" },
    c: { mix: [0.38, 0.36, 0.19, 0.07], label: "Controller" },
    s: { mix: [0.48, 0.32, 0.15, 0.05], label: "Sentinel" }
  };
  ROLE.f = { mix: [0, 1, 2, 3].map(function (j) { return mean(ROLE_KEYS.map(function (k) { return ROLE[k].mix[j]; })); }), label: "Flex" };
  // Weapon scales engagement distance and shifts the mix toward holding (sniper) or flicking (close range).
  var WEAPON = {
    rifle:  { rMul: 1.0, shift: 0,     label: "Rifle" },
    sniper: { rMul: 1.35, shift: 0.08,  label: "Operator / Marshal" },
    close:  { rMul: 0.6, shift: -0.10, label: "SMG / shotgun" }
  };
  var T_LIFT = 0.30;          // seconds lost per mouse lift (pick up, re-centre, re-acquire)
  var ZONE_LO = 20, ZONE_HI = 80, T_ZONE = 1.5;
  var T_REPOS = 0.15;         // seconds lost per limb-sweep length exceeded (switching to a bigger joint)
  var R_DEFAULT = 18;         // metres; starting guess for engagement distance

  var REF = { limb: "forearm", surface: "hybrid", pad: 49, weapon: "rifle", hs: 1 };

  function headDeg(r) { return 2 * Math.atan(HEAD_M / 2 / r) * 180 / Math.PI; }

  function shiftedMix(mix, shift) {
    // shift > 0 moves share from flick/turn/spin into hold; < 0 the reverse.
    var m = mix.slice();
    if (shift > 0) { var take = shift; for (var j = 1; j < 4; j++) { var t = m[j] * take; m[j] -= t; m[0] += t; } }
    else if (shift < 0) { var t0 = m[0] * -shift; m[0] -= t0; m[1] += t0; }
    return m;
  }

  /* Build the cost terms for a profile. */
  function profile(p, lambda) {
    var limb = LIMB[p.limb], surf = SURFACE[p.surface], wpn = WEAPON[p.weapon] || WEAPON.rifle;
    var sigma = limb.sigma * surf.sigma, v = limb.v * surf.v;
    var mix = shiftedMix(p.mix, wpn.shift);
    var r = p.r * wpn.rMul;
    var w = headDeg(r);
    var A = 0, B = 0;
    for (var j = 0; j < 4; j++) {
      A += mix[j] * TASKS[j].prec * Math.pow(360 * sigma / w, 2);
      B += mix[j] * TASKS[j].theta / (360 * v);
    }
    A *= p.hs || 1;
    // Reach: distance from pad centre to edge, also limited by how far the limb sweeps before the arm must reposition.
    var D = Math.max(4, (p.pad - MOUSE_W) / 2);
    return { A: A, B: B, lambda: lambda, D: D, sweep: limb.sweep, mix: mix, r: r, headDeg: w, sigma: sigma, v: v };
  }

  function softplus(x, s) { return x / s > 30 ? x : s * Math.log(1 + Math.exp(x / s)); }
  // Expected overshoot of a limit L, in units of L, averaged over the task mix. Smooth and monotone,
  // because where the hand starts on the pad varies from fight to fight.
  function overflow(C, pr, L) {
    var n = 0;
    for (var j = 0; j < 4; j++) n += pr.mix[j] * softplus(C * TASKS[j].theta / 360 - L, 2) / L;
    return n;
  }
  function lifts(C, pr) { return overflow(C, pr, pr.D); }
  function repos(C, pr) { return overflow(C, pr, pr.sweep); }

  function cost(C, pr) {
    var prec = pr.lambda * pr.A / (C * C);
    var trav = pr.B * C;
    var lift = T_LIFT * lifts(C, pr) + T_REPOS * repos(C, pr);
    // Outside the 20-80 cm/360 band where Boudaoud et al. measured flat performance, add a soft penalty.
    var zone = T_ZONE * (Math.pow(softplus(Math.log(C / ZONE_HI), 0.05), 2) + Math.pow(softplus(Math.log(ZONE_LO / C), 0.05), 2));
    return { total: prec + trav + lift + zone, prec: prec, trav: trav, lift: lift, zone: zone };
  }

  var C_MIN = 12, C_MAX = 140;
  function argmin(pr) {
    var best = C_MIN, bv = Infinity;
    for (var C = C_MIN; C <= C_MAX; C += 0.25) { var v = cost(C, pr).total; if (v < bv) { bv = v; best = C; } }
    // refine
    var lo = Math.max(C_MIN, best - 0.5), hi = Math.min(C_MAX, best + 0.5);
    for (var i = 0; i < 40; i++) {
      var m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
      if (cost(m1, pr).total < cost(m2, pr).total) hi = m2; else lo = m1;
    }
    return (lo + hi) / 2;
  }

  function bisect(f, lo, hi, logScale) {
    // f increasing in x; find f(x)=0
    for (var i = 0; i < 80; i++) {
      var m = logScale ? Math.sqrt(lo * hi) : (lo + hi) / 2;
      if (f(m) > 0) hi = m; else lo = m;
    }
    return logScale ? Math.sqrt(lo * hi) : (lo + hi) / 2;
  }

  /* ---------- Calibration from pro data ---------- */
  // 1) lambda: the reference profile (flex role at default distance) must land on the all-pro median.
  var refFlex = { limb: REF.limb, surface: REF.surface, pad: REF.pad, weapon: REF.weapon, mix: ROLE.f.mix, r: R_DEFAULT };
  var LAMBDA = bisect(function (lam) { return argmin(profile(refFlex, lam)) - PRO_STATS.medianCm; }, 1e-6, 1e3, true);
  // 2) per-role engagement distance r: reference physics must land on each role's shrunk pro median.
  //    Longer distance = smaller head = more precision cost = slower optimum, so argmin rises with r.
  var ROLE_FIT = {};
  ["d", "i", "c", "s", "f"].forEach(function (k) {
    var prior = k === "f" ? { n: PROS.filter(function (p) { return p.role; }).length, logMu: PRO_STATS.logMean, cm: PRO_STATS.medianCm } : rolePrior(k);
    var target = k === "f" ? PRO_STATS.medianCm : prior.cm;
    var r = bisect(function (rr) {
      return argmin(profile({ limb: REF.limb, surface: REF.surface, pad: REF.pad, weapon: REF.weapon, mix: ROLE[k].mix, r: rr }, LAMBDA)) - target;
    }, 2, 120, true);
    ROLE_FIT[k] = { r: r, target: target, n: prior.n, rawCm: prior.rawCm || null };
  });

  /* ---------- Stats ---------- */
  // Headshot % reference by rank (tracker medians, see research/model_research.md).
  var HS_REF = { iron: 13, bronze: 20, silver: 20, gold: 20, plat: 25, diamond: 28, asc: 30, imm: 31, rad: 33, unsure: 22 };
  var KD_REF = { iron: 0.95, bronze: 0.95, silver: 0.95, gold: 1.15, plat: 1.15, diamond: 1.3, asc: 1.3, imm: 1.35, rad: 1.4, unsure: 1.0 };
  var ADR_REF = 125;

  function statsSignals(st) {
    if (!st) return null;
    var rank = st.rank || "unsure";
    var m = isFinite(st.matches) ? st.matches : 15;
    var sw = m / (m + 20);                         // sample weight: 20 matches = half weight
    var out = { sw: sw, matches: isFinite(st.matches) ? st.matches : null, rank: rank, hsMul: 1, perfZ: 0, parts: [] };
    if (isFinite(st.hs) && st.hs > 0) {
      var ref = HS_REF[rank];
      // Precision emphasis: below-reference HS% raises the precision term. Exponent shrinks with sample size.
      out.hsMul = Math.min(1.2, Math.max(0.85, Math.pow(ref / st.hs, 0.6 * sw)));
      out.hsRef = ref;
      out.parts.push((st.hs - ref) / 6);
    }
    if (isFinite(st.kd) && st.kd > 0) out.parts.push(Math.log(st.kd / KD_REF[rank]) / 0.25);
    if (isFinite(st.adr) && st.adr > 0) out.parts.push((st.adr - ADR_REF) / 25);
    if (out.parts.length) {
      var z = mean(out.parts.map(function (x) { return Math.max(-2, Math.min(2, x)); }));
      out.perfZ = z * sw;
    }
    return out;
  }

  /* ---------- Main ---------- */
  /*
   * input = {
   *   dpi, current: { cm } | null, satisfaction 1..5,
   *   pad (cm width), surface, limb ('wrist'|'wf'|'forearm'|'arm'|'unsure'),
   *   role ('d'|'i'|'c'|'s'|'f'), weapon ('rifle'|'sniper'|'close'),
   *   experience ('new'|'mid'|'exp'|'comp'),
   *   stats: { rank, matches, hs, kd, adr } | null
   * }
   */
  function recommend(input) {
    var limbKey = input.limb === "unsure" ? "wf" : input.limb;
    var sig = statsSignals(input.stats);
    var role = ROLE[input.role] ? input.role : "f";
    var pr = profile({
      limb: limbKey, surface: input.surface || "hybrid", pad: input.pad, weapon: input.weapon || "rifle",
      mix: ROLE[role].mix, r: ROLE_FIT[role].r, hs: sig ? sig.hsMul : 1
    }, LAMBDA);
    var cModel = argmin(pr);

    // Uncertainty of the model estimate (log space). The pro spread is the floor: individuals differ.
    var varM = Math.pow(0.22, 2);
    if (input.limb === "unsure") varM += Math.pow(0.15, 2);
    if (input.experience === "new") varM += Math.pow(0.10, 2);

    var post = { logC: Math.log(cModel), v: varM };
    var anchor = null;
    if (input.current && input.current.cm > 0) {
      var sat = input.satisfaction || 3;
      var sdA = 0.10 + 0.075 * (5 - sat);                 // sat 5 -> 0.10, sat 1 -> 0.40
      if (sig) sdA *= Math.exp(-0.25 * sig.perfZ);         // good results: trust the current setting more
      if (input.experience === "comp") sdA *= 0.85;
      var varA = sdA * sdA;
      var wA = (1 / varA) / (1 / varA + 1 / varM);
      var logC = wA * Math.log(input.current.cm) + (1 - wA) * Math.log(cModel);
      anchor = { cm: input.current.cm, sd: sdA, weight: wA, lifts90: lifts(input.current.cm, pr) };
      post = { logC: logC, v: 1 / (1 / varA + 1 / varM) };
    }
    var cm = Math.exp(post.logC);
    var sdPost = Math.sqrt(post.v);

    // Pad check on the final value: if a 90 deg turn would need a lift, report it.
    var notes = [];
    var need90 = cm * 90 / 360;
    if (need90 > pr.D) notes.push("pad90");
    if (cm < 20) notes.push("fast");
    if (cm > 80) notes.push("slow");

    // Cost curve for charting.
    var curve = [];
    for (var C = 15; C <= 120; C += 1) { var c = cost(C, pr); curve.push({ C: C, total: c.total, prec: c.prec, trav: c.trav, lift: c.lift, zone: c.zone }); }

    // Near-optimal band of the model curve (cost within 3% of its minimum): the optimum is broad.
    var jMin = cost(cModel, pr).total, band = [Infinity, -Infinity];
    for (var Cb = C_MIN; Cb <= C_MAX; Cb += 0.25) if (cost(Cb, pr).total <= jMin * 1.03) { band[0] = Math.min(band[0], Cb); band[1] = Math.max(band[1], Cb); }

    // Pros nearest by cm/360.
    var near = PROS.slice().sort(function (a, b) { return Math.abs(Math.log(a.cm / cm)) - Math.abs(Math.log(b.cm / cm)); }).slice(0, 5);
    var pct = PROS.filter(function (p) { return p.cm < cm; }).length / PROS.length;

    return {
      cm: cm, lo: cm * Math.exp(-sdPost), hi: cm * Math.exp(sdPost), sdLog: sdPost, sdModel: Math.sqrt(varM),
      cModel: cModel, band: band, modelCost: cost(cModel, pr), profile: pr, anchor: anchor, stats: sig,
      roleFit: ROLE_FIT[role], rolePrior: role === "f" ? null : rolePrior(role),
      notes: notes, curve: curve, nearPros: near, proPercentile: pct
    };
  }

  return {
    YAW: YAW, K: K, OTHER_YAW: OTHER_YAW, cmFrom: cmFrom, sensFor: sensFor, edpiFor: edpiFor,
    PROS: PROS, PRO_STATS: PRO_STATS, ROLE: ROLE, ROLE_FIT: ROLE_FIT, LIMB: LIMB, SURFACE: SURFACE,
    WEAPON: WEAPON, TASKS: TASKS, LAMBDA: LAMBDA, T_LIFT: T_LIFT, HEAD_M: HEAD_M, REF: REF,
    ZONE_LO: ZONE_LO, ZONE_HI: ZONE_HI, T_REPOS: T_REPOS, HS_REF: HS_REF, KD_REF: KD_REF, headDeg: headDeg, profile: profile, cost: cost, argmin: argmin,
    statsSignals: statsSignals, recommend: recommend
  };
});
