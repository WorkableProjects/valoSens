// Browser test of the aim-test component with the scripted bot (needs Playwright + Chromium).
// Run: node test/aimtest.e2e.js
const { chromium } = require("playwright");
const path = require("path");
const assert = require("assert");
const M = require("../model.js");
const url = "file://" + path.join(__dirname, "..", "aimtest.html");

(async () => {
  const b = await chromium.launch();
  let failed = 0;
  const check = (name, fn) => { try { fn(); console.log("ok   -", name); } catch (e) { failed++; console.log("FAIL -", name, "\n      ", e.message); } };
  try {
    /* ---- scripted run ---- */
    const errs = [];
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
    p.on("pageerror", e => errs.push(e.message));
    p.on("console", m => m.type() === "error" && errs.push(m.text()));
    await p.goto(url + "?auto=1");
    await p.waitForFunction(() => { const o = document.getElementById("out"); return o && o.textContent.length > 2; }, null, { timeout: 120000 });
    const r = JSON.parse(await p.textContent("#out"));
    check("trials non-empty, warm-ups excluded", () => { assert(r.trials.length > 0); assert(r.trials.every(t => !t.warmup)); assert.strictEqual(r.trials.length, r.records.length); assert.strictEqual(r.trajectories.length, r.trials.length); });
    check("trial fields", () => r.trials.forEach(t => {
      assert(t.cm > 0 && ["micro", "flick", "turn", "track"].includes(t.task) && t.time >= 0 && t.time < 30, JSON.stringify(t));
      assert(typeof t.hit === "boolean" && t.droppedFrames >= 0 && typeof t.session === "string");
    }));
    check("trials accepted by the model", () => {
      try { M.recommend({ pad: 45, calibration: { trials: r.trials } }); }
      catch (e) { if (!/Not enough calibration trials/.test(e.message)) throw e; console.log("      (model: " + e.message.slice(0, 50) + "...)"); }
    });
    check("checks present", () => { assert(r.checks.dpi && r.checks.pad && r.checks.reach); assert(Math.abs(r.checks.dpi.effDpi - 800) < 20, "effDpi " + r.checks.dpi.effDpi); assert(r.checks.pad.value > 30 && r.checks.reach.value > 10); });
    check("personal params", () => { assert(r.personal && r.personal.countsPerCm && r.personal.padCm); });
    check("rawInput false for synthetic source", () => assert.strictEqual(r.rawInput, false));
    check("frame timing", () => assert(r.frameMs > 1 && r.frameMs < 100 && r.droppedFrames >= 0, "frameMs " + r.frameMs));
    check("trajectories downsampled to <= 120 Hz", () => r.trajectories.forEach(tj => {
      assert(tj.t.length === tj.x.length && tj.t.length === tj.y.length && tj.t.length > 0);
      for (let i = 2; i < tj.t.length - 1; i++) assert(tj.t[i] - tj.t[i - 1] >= 1 / 120 - 2e-4, "dt " + (tj.t[i] - tj.t[i - 1]));
    }));
    check("tasks covered", () => { const s = new Set(r.trials.map(t => t.task)); ["micro", "flick", "turn", "track"].forEach(k => assert(s.has(k), "missing " + k)); });
    check("no page errors", () => assert.deepStrictEqual(errs, []));
    await p.close();

    /* ---- intro card at phone width ---- */
    const m = await b.newPage({ viewport: { width: 390, height: 844 } });
    const merrs = [];
    m.on("pageerror", e => merrs.push(e.message));
    await m.goto(url);
    await m.click("#go");
    await m.waitForSelector(".at-card");
    const mm = await m.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
      card: document.querySelector(".at-card").getBoundingClientRect().width, focus: document.activeElement.textContent }));
    check("intro card renders without horizontal scroll at 390px", () => { assert(mm.sw <= mm.cw, JSON.stringify(mm)); assert(mm.card <= 390 - 16); });
    check("primary button focused", () => assert.strictEqual(mm.focus, "Start"));
    check("no page errors (mobile)", () => assert.deepStrictEqual(merrs, []));
    await m.close();
  } finally { await b.close(); }
  if (failed) { console.log(failed + " check(s) failed"); process.exit(1); }
  console.log("aimtest e2e ok");
})().catch(e => { console.error(e); process.exit(1); });
