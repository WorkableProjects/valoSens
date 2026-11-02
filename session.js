/*
 * valoSens results files (v3.1): export a run to a JSON file and import it into a later run, so the
 * visibility-test picks and vision-test trials from every run are pooled (more data, tighter estimates).
 * Nothing is stored in the browser: the file is the only copy. Works in the browser (window.ValoSession)
 * and in Node.
 *
 * File: { app: "valoSens", format: 2, version, engine?, exported, sessions: [ { date, answers, xTest, hTest, frameMs, result, aim } ] }
 * Format 2 adds the optional per-session aim-test data (aim); format-1 files import with aim: null.
 * Each export carries every imported session plus the current one (oldest dropped after MAX_SESSIONS).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./xhair.js"));
  else root.ValoSession = factory(root.ValoXhair);
})(typeof self !== "undefined" ? self : this, function (X) {
  "use strict";
  var FORMAT = 2, MAX_SESSIONS = 12, MAX_BYTES = 6000000, MAX_TRIALS = 400, MAX_ROUNDS = 24, MAX_AIM_TRIALS = 600;
  var AIM_TASKS = ["micro", "flick", "turn", "track"], PERSONAL_KEYS = ["sigma0", "tSub", "vPeak", "reachCm", "tLift", "padCm"];

  // Answer whitelist: choice answers must be one of the questionnaire's values; free fields must be numbers.
  var ENUM = {
    dpiSel: ["400", "800", "1600", "other", "unsure"], curMode: ["val", "cm", "other", "none"], otherGame: ["cs2", "apex", "ow2"],
    padSel: ["25", "36", "45", "49", "90", "other"], limb: ["wrist", "wf", "forearm", "arm", "unsure"], role: ["d", "i", "c", "s", "f"],
    weapon: ["rifle", "sniper", "close"], statsGate: ["yes", "no"],
    stRank: ["unsure", "iron", "bronze", "silver", "gold", "plat", "diamond", "asc", "imm", "rad"],
    rank: ["unsure", "iron", "bronze", "silver", "gold", "plat", "diamond", "asc", "imm", "rad"],
    cvd: ["none", "deutan", "protan", "rg", "tritan", "unsure"], exp: ["new", "mid", "exp", "comp"], moving: ["still", "moving", "unsure"],
    aim: ["flick", "track", "mix"], shape: ["small", "medium", "dot", "crossDot", "any"], lose: ["bright", "dark", "util", "never"],
    res: ["1080", "1440", "2160", "stretched"], grip: ["palm", "claw", "fingertip", "unsure"], mouseW: ["light", "mid", "heavy", "xheavy", "unsure"], hCur: ["red", "yd", "yp", "purple", "unsure"], hMaps: ["warm", "dark", "cool", "none"],
    region: ["na", "latam", "br", "eu", "mena", "kr", "jp", "cn", "sea", "oce", "unsure"],
    age: ["u16", "16_19", "20_24", "25_29", "30_34", "35p", "unsure"], glasses: ["none", "glasses", "contacts", "unsure"]
  };
  var NUMS = ["dpiCustom", "cur", "measured", "otherSens", "padCustom", "stMatches", "stHs", "stKd", "stAdr"];
  var AGENTS = ["agent1", "agent2", "agent3"];

  function isNum(v) { return typeof v === "number" && isFinite(v); }
  function cleanAnswers(a, agentOk) {
    var out = {}, dropped = [];
    if (!a || typeof a !== "object") return { answers: out, dropped: dropped };
    Object.keys(ENUM).forEach(function (k) { if (a[k] == null) return; if (ENUM[k].indexOf(String(a[k])) >= 0) out[k] = String(a[k]); else dropped.push(k); });
    NUMS.forEach(function (k) {
      if (a[k] == null || a[k] === "") return;
      var v = typeof a[k] === "number" ? a[k] : parseFloat(a[k]);
      if (isNum(v) && v >= 0 && v < 1e6 && /^[0-9.eE+-]{1,16}$/.test(String(a[k]))) out[k] = String(a[k]); else dropped.push(k);
    });
    AGENTS.forEach(function (k) {
      if (!a[k]) return;
      if (typeof a[k] === "string" && a[k].length <= 20 && (!agentOk || agentOk(a[k]))) out[k] = a[k]; else dropped.push(k);
    });
    if (isNum(a.sat) && a.sat >= 1 && a.sat <= 5) out.sat = Math.round(a.sat);
    if (typeof a.hKeep === "boolean") out.hKeep = a.hKeep;
    if (typeof a.xSkip === "boolean") out.xSkip = a.xSkip;
    if (typeof a.aimSkip === "boolean") out.aimSkip = a.aimSkip;
    if (typeof a.hSkip === "boolean") out.hSkip = a.hSkip;
    if (a.hClutter && typeof a.hClutter === "object") out.hClutter = { fire: a.hClutter.fire === true, purple: a.hClutter.purple === true, yellow: a.hClutter.yellow === true };
    return { answers: out, dropped: dropped };
  }
  function cleanRounds(rounds) {
    if (!Array.isArray(rounds)) return [];
    return rounds.slice(0, MAX_ROUNDS).filter(function (r) {
      return r && X.SCENES[r.scene] && Array.isArray(r.ids) && r.ids.length >= 2 && r.ids.length <= 6 &&
        r.ids.every(function (id) { return typeof id === "string" && X.POOL_BY[id]; }) &&
        (r.pick === null || r.ids.indexOf(r.pick) >= 0);
    }).map(function (r) { return { scene: r.scene, ids: r.ids.slice(), pick: r.pick, motion: r.motion === true, reduced: r.reduced === true }; });
  }
  function cleanTrials(trials) {
    if (!Array.isArray(trials)) return [];
    return trials.slice(0, MAX_TRIALS).filter(function (t) {
      return t && X.VT.colors.indexOf(t.color) >= 0 && isNum(t.x) && t.x >= -3 && t.x <= 1 && X.SCENES[t.scene] &&
        (t.dropped === true || typeof t.correct === "boolean");
    }).map(function (t) { return { color: t.color, x: t.x, scene: t.scene, correct: t.correct === true, catchTrial: t.catchTrial === true, dropped: t.dropped === true }; });
  }
  function cleanResult(r) {
    if (!r || typeof r !== "object") return null;
    var o = {};
    ["cm", "sens", "dpi"].forEach(function (k) { if (isNum(r[k]) && r[k] > 0 && r[k] < 1e5) o[k] = r[k]; });
    if (typeof r.code === "string" && r.code.length < 200) { try { X.decode(r.code); o.code = r.code; } catch (e) { /* skip */ } }
    if (typeof r.highlight === "string" && X.HC[r.highlight]) o.highlight = r.highlight;
    return o;
  }
  function inRange(v, lo, hi) { return isNum(v) && v >= lo && v <= hi; }
  function cleanStr(v) { return typeof v === "string" && v.length <= 40; }
  // One aim trial record (CONTRACTS "Trial record" fields only); null if any present field is invalid.
  function cleanAimTrial(t) {
    if (!t || typeof t !== "object") return null;
    if (!inRange(t.cm, 2, 300) || AIM_TASKS.indexOf(t.task) < 0 || !inRange(t.time, 0, 30)) return null;
    if (!inRange(t.misses, 0, 100) || !inRange(t.overshoots, 0, 100) || !cleanStr(t.session) || !inRange(t.order, 0, 1000)) return null;
    var o = { cm: t.cm, task: t.task, time: t.time, misses: t.misses, overshoots: t.overshoots, session: t.session, order: t.order };
    if (t.id != null) { if (!cleanStr(t.id)) return null; o.id = t.id; }
    var ranges = { angleDeg: [-360, 360], targetDeg: [0, 90], endErrDeg: [0, 360], nSub: [0, 100], peakCmS: [0, 1000], pathEff: [0, 10], lifts: [0, 100], droppedFrames: [0, 100000] };
    for (var k in ranges) {
      if (t[k] == null) continue;
      if (!inRange(t[k], ranges[k][0], ranges[k][1])) return null;
      o[k] = t[k];
    }
    if (t.hit != null) { if (typeof t.hit !== "boolean") return null; o.hit = t.hit; }
    if (t.warmup != null) { if (typeof t.warmup !== "boolean") return null; o.warmup = t.warmup; }
    return o;
  }
  function cleanEntry(e) {   // { value > 0, sd >= 0, n >= 0 }
    return e && typeof e === "object" && isNum(e.value) && e.value > 0 && e.value < 1e9 && isNum(e.sd) && e.sd >= 0 && e.sd < 1e9 && isNum(e.n) && e.n >= 0 && e.n < 1e9
      ? { value: e.value, sd: e.sd, n: e.n } : null;
  }
  function cleanPersonal(p, dropped) {
    if (p == null) return null;
    if (typeof p !== "object") { dropped.push("aim.personal"); return null; }
    var o = {}, any = false;
    PERSONAL_KEYS.concat(["countsPerCm"]).forEach(function (k) {
      if (p[k] == null) return;
      var e = cleanEntry(p[k]);
      if (e) { o[k] = e; any = true; } else dropped.push("aim.personal." + k);
    });
    if (p.accel != null) {
      if (typeof p.accel === "object" && typeof p.accel.suspect === "boolean" && (p.accel.ratio == null || isNum(p.accel.ratio))) {
        o.accel = { suspect: p.accel.suspect, ratio: isNum(p.accel.ratio) ? p.accel.ratio : null }; any = true;
      } else dropped.push("aim.personal.accel");
    }
    return any ? o : null;
  }
  function cleanSwipe(e, key, dropped) {
    if (e == null) return null;
    var c = cleanEntry(e);
    if (!c) dropped.push(key);
    return c;
  }
  function cleanDpi(d, dropped) {
    if (d == null) return null;
    var ok = d && typeof d === "object" && inRange(d.countsPerCm, 1, 10000) && inRange(d.effDpi, 10, 100000) && (d.ratio == null || inRange(d.ratio, 0, 1000)) &&
      inRange(d.cv, 0, 1000) && typeof d.consistent === "boolean" && typeof d.accelSuspect === "boolean";
    if (!ok) { dropped.push("aim.dpi"); return null; }
    return { countsPerCm: d.countsPerCm, effDpi: d.effDpi, ratio: d.ratio == null ? null : d.ratio, cv: d.cv, consistent: d.consistent, accelSuspect: d.accelSuspect };
  }
  // Returns { aim: object|null, dropped: [keys] }. Anything that isn't an object gives aim: null.
  function cleanAim(a) {
    var dropped = [];
    if (!a || typeof a !== "object" || Array.isArray(a)) return { aim: null, dropped: dropped };
    var trials = [];
    if (Array.isArray(a.trials)) {
      var nBad = 0;
      a.trials.slice(0, MAX_AIM_TRIALS).forEach(function (t) { var c = cleanAimTrial(t); if (c) trials.push(c); else nBad++; });
      if (nBad) dropped.push("aim.trials");
    } else if (a.trials != null) dropped.push("aim.trials");
    var frameMs = null;
    if (a.frameMs != null) { if (inRange(a.frameMs, 1, 100)) frameMs = a.frameMs; else dropped.push("aim.frameMs"); }
    var rawInput = false;
    if (a.rawInput != null) { if (typeof a.rawInput === "boolean") rawInput = a.rawInput; else dropped.push("aim.rawInput"); }
    var version = null;
    if (a.version != null) { if (typeof a.version === "string" && a.version.length <= 20) version = a.version; else dropped.push("aim.version"); }
    return { aim: { version: version, dpi: cleanDpi(a.dpi, dropped), pad: cleanSwipe(a.pad, "aim.pad", dropped), reach: cleanSwipe(a.reach, "aim.reach", dropped),
      trials: trials, personal: cleanPersonal(a.personal, dropped), rawInput: rawInput, frameMs: frameMs }, dropped: dropped };
  }
  function cleanSession(s, agentOk) {
    var a = cleanAnswers(s && s.answers, agentOk);
    var d = s && typeof s.date === "string" && !isNaN(Date.parse(s.date)) ? new Date(Date.parse(s.date)).toISOString() : null;
    var aim = cleanAim(s && s.aim);
    return { date: d, answers: a.answers, xTest: cleanRounds(s && s.xTest), hTest: cleanTrials(s && s.hTest),
      frameMs: s && isNum(s.frameMs) && s.frameMs > 1 && s.frameMs < 100 ? s.frameMs : null, result: cleanResult(s && s.result),
      aim: aim.aim, manual: !!(s && s.manual === true), _dropped: a.dropped.concat(aim.dropped) };
  }

  // A session typed in by hand from what the player remembers of their last result (no file, no test data).
  // o = { sens, dpi, cm, code, highlight }. Throws an Error fit to show the player if nothing usable was given.
  function manual(o, cmFrom) {
    o = o || {};
    var num = function (v) { var n = typeof v === "number" ? v : parseFloat(v); return isNum(n) && n > 0 ? n : null; };
    var r = {}, sens = num(o.sens), dpi = num(o.dpi), cm = num(o.cm);
    if (sens && sens > 100) throw new Error("That sensitivity looks too high. Valorant sensitivity is usually below 5.");
    if (dpi && (dpi < 100 || dpi > 32000)) throw new Error("DPI should be between 100 and 32000.");
    if (sens) r.sens = sens;
    if (dpi) r.dpi = dpi;
    if (!cm && sens && dpi && cmFrom) cm = cmFrom(dpi, sens);
    if (cm) r.cm = cm;
    var code = typeof o.code === "string" ? o.code.trim() : "";
    if (code) { try { X.decode(code); r.code = code; } catch (e) { throw new Error("That crosshair code couldn't be read. Leave it blank or paste it exactly."); } }
    if (o.highlight && X.HC[o.highlight]) r.highlight = o.highlight;
    var res = cleanResult(r);
    if (!res.cm && !res.sens && !res.code && !res.highlight) throw new Error("Enter at least your sensitivity, crosshair code or highlight color.");
    var answers = {};
    if (res.dpi) { var d = String(Math.round(res.dpi)); if (["400", "800", "1600"].indexOf(d) >= 0) answers.dpiSel = d; else { answers.dpiSel = "other"; answers.dpiCustom = d; } }
    if (res.sens) { answers.curMode = "val"; answers.cur = String(res.sens); }
    if (res.highlight) answers.hCur = res.highlight;
    return { date: null, answers: answers, xTest: [], hTest: [], frameMs: null, result: res, aim: null, manual: true, _dropped: [] };
  }

  // Build the file contents for a download: prior sessions + this one.
  function build(o) {
    var cur = cleanSession({ date: o.date || new Date().toISOString(), answers: o.answers, xTest: o.xTest, hTest: o.hTest, frameMs: o.frameMs, result: o.result, aim: o.aim }, o.agentOk);
    delete cur._dropped;
    var sessions = (o.prior || []).map(function (s) { var c = Object.assign({ aim: null }, s); delete c._dropped; return c; }).concat([cur]).slice(-MAX_SESSIONS);
    var b = { app: "valoSens", format: FORMAT, version: o.version || "3.1.0" };
    if (o.engine != null) b.engine = String(o.engine);
    b.exported = cur.date; b.sessions = sessions;
    return b;
  }
  function serialize(bundle) { return JSON.stringify(bundle, null, 1); }
  function fileName(bundle) { return "valosens-results-" + String(bundle.exported).slice(0, 10) + "-" + bundle.sessions.length + "-session" + (bundle.sessions.length > 1 ? "s" : "") + ".json"; }

  // Read a file's text. Throws an Error with a message fit to show the player.
  function parse(text, agentOk) {
    if (typeof text !== "string" || !text.length) throw new Error("The file is empty.");
    if (text.length > MAX_BYTES) throw new Error("The file is too large to be a valoSens results file.");
    var j;
    try { j = JSON.parse(text); } catch (e) { throw new Error("This isn't a valoSens results file (it isn't valid JSON)."); }
    if (!j || j.app !== "valoSens" || !Array.isArray(j.sessions)) throw new Error("This isn't a valoSens results file.");
    if (j.format > FORMAT) throw new Error("This file comes from a newer version of valoSens.");
    var sessions = j.sessions.slice(-MAX_SESSIONS).map(function (s) { return cleanSession(s, agentOk); });
    if (!sessions.length) throw new Error("The file has no sessions in it.");
    var warnings = [];
    var nd = sessions.reduce(function (n, s) { return n + s._dropped.length; }, 0);
    if (nd) warnings.push(nd + " unrecognised value" + (nd > 1 ? "s were" : " was") + " skipped.");
    if (j.sessions.length > MAX_SESSIONS) warnings.push("Only the latest " + MAX_SESSIONS + " sessions were kept.");
    return { sessions: sessions, warnings: warnings, latest: sessions[sessions.length - 1] };
  }

  // Pool the imported sessions with the current run (current = { xTest, hTest }).
  function pooled(sessions, cur) {
    var x = [], h = [], at = [], personal = null;
    (sessions || []).forEach(function (s, i) {
      x = x.concat(s.xTest); h = h.concat(s.hTest.map(function (t) { return Object.assign({ session: i }, t); }));
      if (s.aim) {
        at = at.concat((s.aim.trials || []).map(function (t) { return Object.assign({}, t, { session: "f" + i }); }));
        if (s.aim.personal) personal = s.aim.personal;
      }
    });
    var n = (sessions || []).length;
    if (cur && cur.xTest) x = x.concat(cur.xTest);
    if (cur && cur.hTest) h = h.concat(cur.hTest.map(function (t) { return Object.assign({ session: n }, t); }));
    var ca = cur && (cur.aim || (cur.aimTrials ? { trials: cur.aimTrials } : null));
    if (ca) {
      at = at.concat((ca.trials || []).map(function (t) { return Object.assign({}, t, { session: "cur" }); }));
      if (ca.personal) personal = ca.personal;
    }
    return { xTest: x, hTest: h, aimTrials: at, personalLatest: personal };
  }
  // How often each pool crosshair has been shown across sessions.
  function seenCounts(sessions) {
    var c = {}; (sessions || []).forEach(function (s) { s.xTest.forEach(function (r) { r.ids.forEach(function (id) { c[id] = (c[id] || 0) + 1; }); }); }); return c;
  }
  // Staircase start points from the pooled imported trials: each color's 75% threshold plus 0.1 log10 (slightly easier).
  function visionStart(sessions) {
    var all = pooled(sessions).hTest; if (!all.length) return null;
    var a = X.analyzeVision(all); if (!a || !a.ok) return null;
    var o = {}; X.VT.colors.forEach(function (c) { o[c] = a.colors[c].x75 + 0.1; }); return o;
  }
  // Per-session thresholds, to show whether they agree.
  function perSession(sessions, cur) {
    var list = (sessions || []).map(function (s) { return { date: s.date, trials: s.hTest }; });
    if (cur && cur.hTest && cur.hTest.length) list.push({ date: "this run", trials: cur.hTest });
    return list.map(function (s) { var a = X.analyzeVision(s.trials); return { date: s.date, ok: !!(a && a.ok), colors: a && a.ok ? a.colors : null, catchPc: a && a.catchPc }; });
  }

  return { FORMAT: FORMAT, MAX_SESSIONS: MAX_SESSIONS, MAX_AIM_TRIALS: MAX_AIM_TRIALS, ENUM: ENUM, manual: manual, build: build, serialize: serialize, fileName: fileName, parse: parse,
    pooled: pooled, seenCounts: seenCounts, visionStart: visionStart, perSession: perSession, cleanAnswers: cleanAnswers };
});
