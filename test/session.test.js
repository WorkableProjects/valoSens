// Results file export/import and pooling. Run: node test/session.test.js
const V = require("../session.js"), X = require("../xhair.js"), M = require("../model.js");
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log("ok   - " + name); } catch (e) { fail++; console.log("FAIL - " + name + ": " + e.message); } }
function ok(c, m) { if (!c) throw new Error(m || "assertion failed"); }
function eq(a, b, m) { if (a !== b) throw new Error((m || "") + " expected " + JSON.stringify(b) + ", got " + JSON.stringify(a)); }
const agentOk = n => !!M.findAgent(n);

function visionTrials(truth, seed, start) {
  const r = X.rng(seed + 99), run = X.visionRun({ seed, start }); let tr;
  while ((tr = run.nextTrial())) {
    const p = tr.catchTrial ? 0.98 : 0.25 + 0.73 / (1 + Math.exp(-8 * (tr.x - truth[tr.color])));
    const c = r() < p; run.record(tr, { answer: c ? tr.target : (tr.target + 1) % 4, shownMs: 58 });
  }
  return run.trials;
}
const answers = { dpiSel: "800", curMode: "val", cur: "0.35", sat: 4, padSel: "45", limb: "wf", role: "d", agent1: "Jett", agent2: "", weapon: "rifle",
  statsGate: "no", cvd: "none", exp: "exp", aim: "flick", shape: "any", lose: "bright", res: "1440", hCur: "red", hKeep: true, hMaps: "dark",
  hClutter: { fire: true }, xSeed: 123, prior: null, stPaste: "<script>" };
const rounds = X.xSession({ seed: 5 }).map(r => ({ ...r, pick: r.ids[0] }));

t("build → serialize → parse round trip keeps answers, picks, trials and result", () => {
  const h = visionTrials({ yellow: -1.3, red: -0.9, purple: -1 }, 1);
  const b = V.build({ answers, xTest: rounds, hTest: h, frameMs: 16.7, result: { cm: 45.5, sens: 0.359, dpi: 800, code: "0;P;o;1;f;0;0l;2;0o;2;0a;1;0f;0;1b;0", highlight: "yd" }, agentOk });
  const p = V.parse(V.serialize(b), agentOk);
  eq(p.sessions.length, 1);
  const s = p.latest;
  eq(s.answers.cur, "0.35"); eq(s.answers.agent1, "Jett"); eq(s.answers.hKeep, true); eq(s.answers.hClutter.fire, true); eq(s.answers.sat, 4);
  ok(!("xSeed" in s.answers) && !("stPaste" in s.answers) && !("prior" in s.answers), "only whitelisted answers are exported");
  eq(s.xTest.length, 8); eq(s.hTest.length, h.length); eq(s.result.highlight, "yd"); eq(s.frameMs, 16.7);
  ok(s.hTest.every(x => Object.keys(x).sort().join() === "catchTrial,color,correct,dropped,scene,x"), "trials carry only the fields the fit needs");
  ok(/^valosens-results-\d{4}-\d\d-\d\d-1-session\.json$/.test(V.fileName(b)), V.fileName(b));
});
t("each export appends to the imported sessions", () => {
  const b1 = V.build({ answers, xTest: rounds, hTest: [], agentOk, date: "2026-10-01T10:00:00Z" });
  const p1 = V.parse(V.serialize(b1), agentOk);
  const b2 = V.build({ prior: p1.sessions, answers, xTest: rounds, hTest: [], agentOk });
  const p2 = V.parse(V.serialize(b2), agentOk);
  eq(p2.sessions.length, 2); eq(p2.sessions[0].date, "2026-10-01T10:00:00.000Z");
  ok(!JSON.stringify(b2).includes("_dropped"));
});
t("rejects files that aren't valoSens results, with readable messages", () => {
  for (const [txt, re] of [["", /empty/], ["{oops", /valid JSON/], ['{"app":"other","sessions":[]}', /isn't a valoSens/], ['{"app":"valoSens","format":99,"sessions":[{}]}', /newer version/], ['{"app":"valoSens","format":1,"sessions":[]}', /no sessions/]])
    try { V.parse(txt, agentOk); throw new Error("accepted " + txt); } catch (e) { ok(re.test(e.message), e.message); }
});
t("sanitises hostile or malformed contents", () => {
  const bad = { app: "valoSens", format: 1, sessions: [{ date: "not a date", answers: { dpiSel: "<img src=x onerror=alert(1)>", cvd: "deutan", cur: "1;alert(1)", agent1: "Nobody", hClutter: { fire: "yes" }, sat: 99, __proto__: { polluted: 1 } },
    xTest: [{ scene: "sand", ids: ["w312", "nope"], pick: "w312" }, { scene: "mars", ids: ["w312", "c311"], pick: "w312" }, { scene: "sand", ids: ["w312", "c311"], pick: "g422o" }, { scene: "sand", ids: ["w312", "c311"], pick: null }],
    hTest: [{ color: "green", x: -1, correct: true, scene: "sand" }, { color: "red", x: 50, correct: true, scene: "sand" }, { color: "red", x: -1, correct: "y", scene: "sand" }, { color: "red", x: -1, correct: false, scene: "sand" }],
    result: { cm: -5, code: "garbage", highlight: "blue" } }] };
  const p = V.parse(JSON.stringify(bad), agentOk), s = p.latest;
  eq(s.answers.dpiSel, undefined); eq(s.answers.cvd, "deutan"); eq(s.answers.cur, undefined); eq(s.answers.agent1, undefined);
  eq(s.answers.hClutter.fire, false); eq(s.answers.sat, undefined); eq(s.date, null);
  eq(s.xTest.length, 1); eq(s.hTest.length, 1); eq(JSON.stringify(s.result), "{}");
  ok(p.warnings.length >= 1); ok(({}).polluted === undefined);
});
t("pooling: imported trials join this run's, tagged by session", () => {
  const s1 = V.parse(V.serialize(V.build({ answers, xTest: rounds, hTest: visionTrials({ yellow: -1.3, red: -0.9, purple: -1 }, 2), agentOk })), agentOk).sessions;
  const cur = visionTrials({ yellow: -1.3, red: -0.9, purple: -1 }, 3);
  const P = V.pooled(s1, { xTest: rounds.slice(0, 3), hTest: cur });
  eq(P.xTest.length, 11); eq(P.hTest.length, s1[0].hTest.length + cur.length);
  eq(P.hTest[0].session, 0); eq(P.hTest[P.hTest.length - 1].session, 1);
  const a1 = X.analyzeVision(s1[0].hTest), a2 = X.analyzeVision(P.hTest);
  ok(a2.colors.yellow.se < a1.colors.yellow.se, "pooling two sessions should tighten the estimate");
  eq(V.perSession(s1, { hTest: cur }).length, 2);
});
t("a second run starts the staircases near the earlier thresholds and favors unseen crosshairs", () => {
  const s1 = V.parse(V.serialize(V.build({ answers, xTest: rounds, hTest: visionTrials({ yellow: -1.4, red: -0.9, purple: -1.1 }, 4), agentOk })), agentOk).sessions;
  const st = V.visionStart(s1);
  ok(st.yellow < st.red, "yellow should start fainter"); ok(st.yellow < -0.9);
  const first = X.visionRun({ seed: 9, start: st }).nextTrial();
  // QUEST+ (v6) centres its prior on the earlier threshold and places the first stimulus near it, not exactly on it.
  ok(Math.abs(first.x - st[first.color]) < 0.4 || first.catchTrial, "first x " + first.x + " vs start " + st[first.color]);
  const partial = [{ ...s1[0], xTest: s1[0].xTest.slice(0, 2) }];            // 8 of 18 crosshairs seen before
  const seen = V.seenCounts(partial), again = X.xSession({ seed: 5, seen });
  const firstTwo = again[0].ids.concat(again[1].ids);
  ok(Object.keys(seen).length === 8 && firstTwo.every(id => !seen[id]), "unseen crosshairs come first: " + firstTwo.join());
});
t("pooled data reaches the recommendation", () => {
  const s1 = V.parse(V.serialize(V.build({ answers, xTest: [], hTest: visionTrials({ yellow: -0.7, red: -0.8, purple: -1.6 }, 5), agentOk })), agentOk).sessions;
  const P = V.pooled(s1, { hTest: visionTrials({ yellow: -0.7, red: -0.8, purple: -1.6 }, 6) });
  eq(X.recommend({ hTest: P.hTest }).highlight.color.key, "purple");
});
t("5.0 answers (region, age, glasses, skip flags) round-trip; an invalid region is dropped", () => {
  const a5 = { ...answers, region: "kr", age: "20_24", glasses: "contacts", xSkip: true, hSkip: false };
  const s = V.parse(V.serialize(V.build({ answers: a5, xTest: [], hTest: [], agentOk })), agentOk).latest;
  eq(s.answers.region, "kr"); eq(s.answers.age, "20_24"); eq(s.answers.glasses, "contacts"); eq(s.answers.xSkip, true); eq(s.answers.hSkip, false);
  const bad = V.parse(JSON.stringify({ app: "valoSens", format: 1, sessions: [{ answers: { region: "mars", age: "20_24", glasses: "<b>", xSkip: "yes" } }] }), agentOk);
  eq(bad.latest.answers.region, undefined); eq(bad.latest.answers.glasses, undefined); eq(bad.latest.answers.age, "20_24"); eq(bad.latest.answers.xSkip, undefined);
  ok(bad.warnings.length >= 1, "dropped values are reported");
});
t("caps the number of sessions kept", () => {
  let prior = [];
  for (let i = 0; i < 15; i++) prior = V.parse(V.serialize(V.build({ prior, answers, xTest: [], hTest: [], agentOk })), agentOk).sessions;
  eq(prior.length, V.MAX_SESSIONS);
});
t("last results entered by hand", () => {
  const m = V.manual({ sens: "0.35", dpi: "1200", highlight: "purple" }, M.cmFrom);
  ok(m.manual && m.result.cm > 30 && m.answers.dpiSel === "other" && m.answers.dpiCustom === "1200" && m.answers.cur === "0.35" && m.answers.hCur === "purple", JSON.stringify(m));
  let threw = 0; try { V.manual({}); } catch (e) { threw++; } try { V.manual({ code: "nope;;" }); } catch (e) { threw++; } eq(threw, 2);
  const back = V.parse(V.serialize(V.build({ prior: [m], answers, xTest: [], hTest: [], agentOk })), agentOk).sessions;
  ok(back.length === 2 && back[0].manual && back[0].result.highlight === "purple", "manual session survives a download");
});
// ---- format 2 (aim-test data) ----
const A = require("../aim.js");
const mkTrial = (i, o) => ({ cm: 40, task: ["micro", "flick", "turn", "track"][i % 4], time: 0.4 + (i % 7) * 0.05, misses: 0, overshoots: i % 2, session: "s1", order: i,
  hit: true, angleDeg: 20, targetDeg: 0.716, endErrDeg: 0.2, nSub: 2, peakCmS: 55, pathEff: 0.9, lifts: 0, droppedFrames: 0, warmup: false, ...o });
const aimData = (n, o) => ({ version: A.VERSION, dpi: { countsPerCm: 31.5, effDpi: 800, ratio: 1, cv: 0.01, consistent: true, accelSuspect: false },
  pad: { value: 40, sd: 1, n: 5 }, reach: { value: 20, sd: 0.5, n: 5 }, trials: Array.from({ length: n }, (_, i) => mkTrial(i)),
  personal: { sigma0: { value: 0.03, sd: 0.005, n: 20 }, tSub: { value: 0.18, sd: 0.01, n: 30 }, countsPerCm: { value: 31.5, sd: 0.2, n: 5 }, accel: { suspect: false, ratio: 1 } },
  rawInput: true, frameMs: 8.3, ...o });

t("format 2: aim data survives build → serialize → parse; engine and new answers kept", () => {
  const b = V.build({ answers: { ...answers, rank: "gold", aimSkip: false }, xTest: [], hTest: [], aim: aimData(12), engine: 6, agentOk });
  eq(b.format, 2); eq(b.engine, "6");
  const p = V.parse(V.serialize(b), agentOk), a = p.latest.aim;
  eq(p.warnings.length, 0, "no warnings on clean data");
  eq(a.trials.length, 12); eq(a.version, A.VERSION); eq(a.rawInput, true); eq(a.frameMs, 8.3);
  eq(a.dpi.effDpi, 800); eq(a.pad.n, 5); eq(a.reach.value, 20); eq(a.personal.sigma0.value, 0.03); eq(a.personal.accel.suspect, false);
  eq(JSON.stringify(Object.entries(a.trials[3]).sort()), JSON.stringify(Object.entries(mkTrial(3)).sort()));
  eq(p.latest.answers.rank, "gold"); eq(p.latest.answers.aimSkip, false); eq(p.latest.answers.glasses, undefined);
  eq(V.build({ answers, xTest: [], hTest: [], agentOk }).engine, undefined);
});
t("format 1 files still import, with aim: null on every session", () => {
  const f1 = { app: "valoSens", format: 1, version: "3.1.0", exported: "2026-09-01T00:00:00.000Z", sessions: [
    { date: "2026-09-01T00:00:00Z", answers: { glasses: "contacts", cvd: "none" }, xTest: [], hTest: [], frameMs: 16.7, result: { cm: 40 } }, { date: null, answers: {}, xTest: [], hTest: [] }] };
  const p = V.parse(JSON.stringify(f1), agentOk);
  eq(p.sessions.length, 2); ok(p.sessions.every(s => s.aim === null), "aim null"); eq(p.sessions[0].answers.glasses, "contacts"); eq(p.sessions[0].result.cm, 40);
  eq(p.warnings.length, 0);
  const b = V.build({ prior: p.sessions, answers, xTest: [], hTest: [], aim: aimData(3), agentOk });
  eq(b.sessions[0].aim, null); eq(b.sessions[2].aim.trials.length, 3);
  eq(V.parse(V.serialize(b), agentOk).sessions.length, 3);
});
t("bad aim fields are dropped and reported", () => {
  const raw = aimData(4);
  raw.trials = [mkTrial(0), mkTrial(1, { cm: NaN }), mkTrial(2, { task: "jump" }), mkTrial(3, { id: "x".repeat(1000000) }), mkTrial(4, { hit: "yes" }), mkTrial(5, { time: 31 })];
  raw.dpi = { ...raw.dpi, effDpi: "800" }; raw.pad = { value: -3, sd: 1, n: 2 }; raw.rawInput = "true";
  raw.personal.tSub = { value: 0, sd: 0.1, n: 3 }; raw.personal.accel = { suspect: "no", ratio: 1 };
  const file = { app: "valoSens", format: 2, sessions: [{ aim: raw }] };
  const p = V.parse(JSON.stringify(file), agentOk), s = p.latest, a = s.aim;
  eq(a.trials.length, 1); eq(a.trials[0].order, 0);
  eq(a.dpi, null); eq(a.pad, null); eq(a.rawInput, false); eq(a.reach.n, 5);
  eq(a.personal.tSub, undefined); eq(a.personal.accel, undefined); eq(a.personal.sigma0.n, 20);
  for (const k of ["aim.trials", "aim.dpi", "aim.pad", "aim.rawInput", "aim.personal.tSub", "aim.personal.accel"]) ok(s._dropped.indexOf(k) >= 0, "reports " + k);
  ok(p.warnings.length >= 1);
  eq(V.parse(JSON.stringify({ app: "valoSens", format: 2, sessions: [{ aim: "junk" }] }), agentOk).latest.aim, null);
  try { V.parse('{"app":"valoSens","format":3,"sessions":[{}]}', agentOk); throw new Error("accepted"); } catch (e) { ok(/newer version/.test(e.message), e.message); }
});
t("pooled returns aimTrials tagged per file session and cur, plus personalLatest", () => {
  const mk = (n, personal) => V.build({ answers, xTest: [], hTest: [], aim: aimData(n, { personal }), agentOk });
  let prior = V.parse(V.serialize(mk(5, { tSub: { value: 0.2, sd: 0.01, n: 9 } })), agentOk).sessions;
  prior = V.parse(V.serialize(V.build({ prior, answers, xTest: [], hTest: [], aim: aimData(3, { personal: null }), agentOk })), agentOk).sessions;
  eq(prior.length, 2);
  const P = V.pooled(prior, { xTest: [], hTest: [], aim: { trials: [mkTrial(0), mkTrial(1)], personal: null } });
  eq(P.aimTrials.length, 10);
  eq(Array.from(new Set(P.aimTrials.map(x => x.session))).join(), "f0,f1,cur");
  eq(P.aimTrials.filter(x => x.session === "f0").length, 5); eq(P.aimTrials.filter(x => x.session === "cur").length, 2);
  eq(P.personalLatest.tSub.value, 0.2, "latest non-null personal");
  const P2 = V.pooled(prior, { aim: { trials: [], personal: { tSub: { value: 0.25, sd: 0.01, n: 4 } } } });
  eq(P2.personalLatest.tSub.value, 0.25);
  const P0 = V.pooled([], null); eq(P0.aimTrials.length, 0); eq(P0.personalLatest, null);
  eq(V.pooled([{ xTest: [], hTest: [], aim: null }], null).aimTrials.length, 0);
});
t("a 601-trial aim session is capped at 600", () => {
  const p = V.parse(V.serialize(V.build({ answers, xTest: [], hTest: [], aim: aimData(601), agentOk })), agentOk);
  eq(p.latest.aim.trials.length, 600); eq(V.MAX_AIM_TRIALS, 600);
});
console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
