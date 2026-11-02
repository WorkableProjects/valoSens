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
  ok(Math.abs(first.x - st[first.color]) < 1e-9 || first.catchTrial);
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
console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
