// Browser smoke test of the questionnaire, both tests and the results screen (needs Playwright + Chromium).
// Run: node test/ui.e2e.js
const { chromium } = require("playwright");
const path = require("path"), fs = require("fs"), os = require("os");
const SIM = `(() => { const run = X.visionRun({ seed: 5 }); let t; const r = X.rng(3); while ((t = run.nextTrial())) { const pc = t.catchTrial ? 1 : 0.25 + 0.72 / (1 + Math.exp(-8 * (t.x - ({ yellow: -1.3, red: -0.9, purple: -1 })[t.color]))); run.record(t, { answer: r() < pc ? t.target : (t.target + 1) % 4, shownMs: 58 }); } S.hTest = run.trials; })()`;
// Synthetic mouse source for the aim test: the scripted bot from aimtest.html (auto mode), installed as window.__aimSource.
const AIM_BOT = `(() => {
  function scripted() {
    var rnd = ValoAim._rng(5), h = null, busy = false, engaged = null, stopped = false;
    function gauss() { var u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.28318 * v); }
    function now() { return performance.now(); }
    function dbg() { return AimTest._debug(); }
    function wrap(d) { return Math.abs(d) <= 180 ? d : d - 360 * Math.round(d / 360); }
    // minimum-jerk move of (dx, dy) counts over durS seconds, emitting a 1000 Hz event stream tied to the real clock
    function move(dx, dy, durS, abortId, cb) {
      var T0 = now(), N = Math.max(1, Math.round(durS * 1000)), i = 0, ex = 0, ey = 0;
      (function step() {
        var d = dbg();
        if (!d || (abortId && (!d.spec || d.spec.id !== abortId))) { cb(false); return; }
        var upto = Math.min(N, Math.floor(now() - T0));
        while (i < upto) {
          i++; var s = i / N, m = 10 * s * s * s - 15 * s * s * s * s + 6 * s * s * s * s * s;
          var tx = Math.round(dx * m), ty = Math.round(dy * m);
          h.move(tx - ex, ty - ey, T0 + i); ex = tx; ey = ty;
        }
        if (i >= N) cb(true); else requestAnimationFrame(step);
      })();
    }
    function click(cb) { h.down(now()); setTimeout(function () { h.up(now()); cb(); }, 30); }
    function swipe(d, cb) {
      var cpc = d.countsPerCm, cm = d.swipeKind === "dpi" ? d.cardCm : d.swipeKind === "pad" ? 42 : 20;
      var dur = d.swipeKind === "dpi" ? [2.0, 1.0, 0.5][d.swipeIndex] : 0.8;
      h.down(now());
      setTimeout(function () { move(Math.round(cm * cpc), 0, dur, null, function () { setTimeout(function () { h.up(now()); cb(); }, 20); }); }, 30);
    }
    function aim(d, cb) {
      var sp = d.spec, k = 360 / sp.cm, cpc = d.countsPerCm, id = sp.id;
      function err() {
        var dd = dbg(); if (!dd || !dd.target) return null;
        return { yaw: wrap(dd.target.yaw - dd.viewYaw), pitch: dd.target.pitch - dd.viewPitch, cm: sp.cm };
      }
      if (sp.task === "track") {
        var t0 = now();
        (function pursue() {
          var dd = dbg(), e = dd && dd.spec && dd.spec.id === id ? err() : null;
          if (!e) { cb(); return; }
          var cx = (e.yaw / k) * cpc * 0.5 + gauss() * 0.7, cy = (e.pitch / k) * cpc * 0.5 * -1;
          h.move(Math.round(cx), Math.round(cy), now());
          requestAnimationFrame(pursue);
        })();
        return;
      }
      setTimeout(function () {
        (function attempt() {
          var e = err();
          if (!e) { cb(); return; }
          var amp = Math.sqrt(e.yaw * e.yaw + e.pitch * e.pitch), dur = 0.1 + 0.04 * Math.sqrt(amp);
          var f = 1 + gauss() * 0.03;
          var dx = Math.round(e.yaw / k * cpc * f + gauss() * 1.5), dy = Math.round(-(e.pitch / k * cpc) * f + gauss() * 1.5);
          move(dx, dy, dur, id, function (ok) {
            if (!ok) { cb(); return; }
            setTimeout(function () { click(function () { setTimeout(attempt, 60); }); }, 90);
          });
        })();
      }, 200 + rnd() * 80);
    }
    function tick() {
      if (stopped) return;
      var d = dbg();
      if (!d) { stopped = true; return; }
      if (busy) { requestAnimationFrame(tick); return; }
      if (d.awaiting === "button") {
        busy = true;
        setTimeout(function () { var b = document.querySelector(".at-btn.primary"); if (b) b.click(); busy = false; requestAnimationFrame(tick); }, 120);
        return;
      }
      if (d.awaiting === "swipe") { busy = true; swipe(d, function () { busy = false; setTimeout(function () { requestAnimationFrame(tick); }, 150); }); return; }
      if (d.awaiting === "aim" && d.spec && d.target && engaged !== d.spec.id) {
        engaged = d.spec.id; busy = true;
        aim(d, function () { busy = false; requestAnimationFrame(tick); });
        return;
      }
      requestAnimationFrame(tick);
    }
    return { attach: function (onMove, onDown, onUp) { h = { move: onMove, down: onDown, up: onUp }; requestAnimationFrame(tick); } };
  }
  window.__aimSource = scripted();
})()`;
const FULL_MIX = { micro: 4, flick: 3, turn: 2, track: 1 };   // 10 per block, 2 of them warm-up: 8 scored per level, enough for calibration
const url = "file://" + path.join(__dirname, "..", "index.html");
async function flow(b, vp, steps, after, opts = {}) {
  const errs = [];
  const p = await b.newPage({ viewport: vp.size, colorScheme: vp.scheme, reducedMotion: opts.reduced ? "reduce" : "no-preference" });
  p.on("pageerror", e => errs.push(e.message)); p.on("console", m => m.type() === "error" && errs.push(m.text()));
  await p.goto(url);
  const pick = t => p.getByRole("button", { name: t }).first().click();
  p.pickExact = t => p.getByRole("button", { name: t, exact: true }).first().click();
  const next = () => p.click("#next");
  const out = { errs, width: vp.size.width, seed: await p.evaluate(() => S.xSeed) };
  await steps(p, pick, next, out);
  await p.waitForSelector(".big");
  out.revealShown = await p.evaluate(() => !!document.querySelector(".reveal"));
  await p.waitForTimeout(2800);            // reveal + count-up
  out.revealGone = await p.evaluate(() => { const r = document.querySelector(".reveal"); return !r || getComputedStyle(r).visibility === "hidden"; });
  out.cardAnim = await p.evaluate(() => getComputedStyle(document.querySelector(".sum-c")).animationName);
  out.big = (await p.textContent(".big")).trim();
  out.scroll = await p.evaluate(() => document.documentElement.scrollWidth);
  out.sumWidth = await p.evaluate(() => document.querySelector(".sum").getBoundingClientRect().width);
  // bell curve (Sensitivity tab is open first)
  out.bellPaths = await p.$$eval("#bellChart svg path", n => n.length);
  out.bellAnim = await p.evaluate(() => { const l = document.querySelector("#bellChart svg path.ln"); const c = getComputedStyle(l); return c.transitionProperty + "|" + c.animationName; });
  out.bellAria = await p.getAttribute("#bellChart svg", "aria-label");
  out.shiftRows = await p.$$eval(".shift", n => n.length);
  out.bellPct = (await p.textContent("#bellPct")).trim();
  out.bellScroll = await p.evaluate(() => document.documentElement.scrollWidth);
  await p.getByRole("tab", { name: "Model" }).click();
  out.lineAnim = await p.evaluate(() => getComputedStyle(document.querySelector("#costChart path.ln")).transitionProperty);
  await p.hover("#costChart #hit", { position: { x: 200, y: 80 } });
  out.tooltip = await p.textContent("#costChart .tt");
  if (opts.noXh) { out.text = await p.textContent("#app"); if (after) await after(p, out); await p.close(); return out; }
  await p.getByRole("tab", { name: "Crosshair" }).click();
  await p.waitForTimeout(300);
  out.options = await p.$$eval(".opt", n => n.length);
  out.paneAnim = await p.evaluate(() => document.querySelector("#pane-4").classList.contains("play"));
  out.text = await p.textContent("#app");
  out.code = await p.textContent("#xhCode");
  if (after) await after(p, out);
  await p.close();
  return out;
}
(async () => {
  const b = await chromium.launch();
  const results = [];
  results.push(await flow(b, { size: { width: 1000, height: 900 }, scheme: "light" }, async (p, pick, next, out) => {
    await p.click("#pathFull");
    await pick("800"); await next();
    await pick("I know my Valorant sens"); await p.fill("#in-cur", "0.5"); await next();
    await next();
    await pick("About 45 cm"); await next(); await pick("Wrist + forearm"); await next();
    await pick("Claw"); await pick("55–70 g"); await next();
    await pick("Duelist"); await next();
    await p.selectOption("#in-agent1", "Jett"); await p.selectOption("#in-agent2", "Omen");
    await next();
    await pick("Rifles"); await next();
    await pick("North America"); await next(); await pick("20–24"); await next(); await p.pickExact("Gold"); await next();
    await pick("Yes, add stats"); await next();
    await p.selectOption("#in-rank", "plat"); await p.fill("#in-stMatches", "60"); await p.fill("#in-stHs", "22"); await p.fill("#in-stKd", "1.05"); await p.fill("#in-stAdr", "130");
    await next();
    // Part 2: aim test, completed with the synthetic source
    out.aimNextDisabled = await p.evaluate(() => document.getElementById("next").disabled);
    await p.evaluate(AIM_BOT); await p.evaluate(m => { S.aimMix = m; }, FULL_MIX);
    await p.click("#aimStart");
    await p.waitForFunction(() => !!S.aimRes && currentId === "cvd", null, { timeout: 480000 });
    out.aimTrials = await p.evaluate(() => S.aimRes.trials.length);
    out.aimInput = await p.evaluate(() => { const i = buildInput(), R = safeRecommend(i); return [!!i.calibration, !!i.personal, i.rank, "glasses" in i, R.mode, R.note || ""].join("|"); });
    await p.click("#back");
    out.aimSummary = await p.textContent("#aimSummary");
    await next();
    // Part 3: crosshair
    await pick("Red-green: deutan"); await next(); await pick("2+ years"); await next();
    await pick("Flicks and taps"); await next(); await pick("Small cross"); await next();
    await pick("On bright maps"); await next(); await pick("2560×1440"); await next();
    // Visibility test: 8 rounds of 4; always take option A (slot order is random).
    out.firstRound = await p.evaluate(() => S.xTest[0].ids.join(","));
    for (let i = 0; i < 8; i++) { await p.getByRole("button", { name: "Option A" }).click(); await p.waitForTimeout(220); }
    out.xAnswered = await p.evaluate(() => S.xTest.filter(r => r.pick !== undefined).length);
    await next();
    // Part 3: highlight
    await pick("Red (Default)"); await next(); await pick("Dark corners and shadows"); await next();
    await pick("Fire and orange"); await next();
    // Vision test: start, answer a few rounds by keyboard, check it advances.
    await p.click("#dtStart");
    for (let i = 0; i < 4; i++) { await p.waitForTimeout(1700); await p.keyboard.press("2"); }
    out.vtProgress = await p.evaluate(() => parseFloat(document.querySelector(".dt-bar i").style.width) || 0);
    await p.evaluate(SIM);                 // stand in for a full 2-minute run
    await next();
  }, async (p, out) => {
    // Download the results file.
    const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#download")]);
    out.file = path.join(os.tmpdir(), "valosens-e2e-" + Date.now() + ".json");
    await dl.saveAs(out.file);
    out.fileName = dl.suggestedFilename();
  }));
  console.log("aim test done: trials", results[0].aimTrials, "| input:", results[0].aimInput, "|", results[0].aimSummary);
  // Second run: import that file on the first screen, skip to the tests, and check the data is pooled.
  const file = results[0].file;
  results.push(await flow(b, { size: { width: 1000, height: 900 }, scheme: "dark" }, async (p, pick, next, out) => {
    await p.setInputFiles("#impFile", file);
    await p.waitForSelector("#impGo");
    out.imported = await p.textContent(".imp");
    out.prefill = await p.evaluate(() => [S.dpiSel, S.cur, S.agent1, S.cvd, S.res, S.prior.length].join("|"));
    await p.click("#impGo");
    out.jumpedTo = await p.evaluate(() => currentId);
    out.secondRound = await p.evaluate(() => S.xTest[0].ids.join(","));
    out.calib2 = await p.evaluate(() => { const i = buildInput(); return [!!i.calibration, !!i.personal, i.rank, safeRecommend(i).mode].join("|"); });
    for (let i = 0; i < 8; i++) { await p.getByRole("button", { name: "Option B" }).click(); await p.waitForTimeout(200); }
    await next(); await next(); await next(); await next();
    await p.evaluate(SIM);
    await next();
  }, async (p, out) => {
    await p.getByRole("tab", { name: "Highlight" }).click(); await p.waitForTimeout(300);
    out.hlText = await p.textContent("#pane-5");
    out.sideText = await p.textContent(".side");
    const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#download")]);
    const f2 = path.join(os.tmpdir(), "valosens-e2e2-" + Date.now() + ".json"); await dl.saveAs(f2);
    out.sessionsInFile = JSON.parse(fs.readFileSync(f2, "utf8")).sessions.length;
    // A bad file shows a readable error.
    const bad = path.join(os.tmpdir(), "valosens-bad.json"); fs.writeFileSync(bad, "{nope");
    await p.click("#reset"); await p.evaluate(() => { currentId = "start"; renderQ(); }); await p.setInputFiles("#impFile", bad); await p.waitForTimeout(200);
    out.badMsg = await p.textContent(".imp-msg");
  }));
  results.push(await flow(b, { size: { width: 390, height: 900 }, scheme: "dark" }, async (p, pick, next) => {
    await p.click("#pathFull");
    await pick("Not sure"); await next();
    await pick("I'll convert from another game"); await p.selectOption("#og", "ow2"); await p.fill("#in-otherSens", "5"); await next();
    await next();
    await pick("Enter exact width"); await p.fill("#in-padCustom", "90"); await next();
    await pick("Not sure"); await next();
    await next();
    await pick("Sentinel"); await next(); await next();
    await pick("Operator"); await next();
    await pick("Prefer not to say"); await next(); await pick("Prefer not to say"); await next(); await pick("Not sure / unranked"); await next();
    await pick("Skip"); await next();
    await p.click("#skipPart");                                             // skip the aim test
    await pick("Blue-yellow: tritan"); await next(); await pick("Under 6 months"); await next(); await pick("Yes, often"); await next();
    await pick("A mix / not sure"); await next(); await pick("Dot only"); await next(); await pick("Rarely or never"); await next();
    await pick("1920×1080"); await next(); await next();
    await pick("Not sure"); await next(); await pick("No pattern"); await next(); await next(); await next();
  }));
  // Skip both parts: results render with no errors, no Crosshair/Highlight tabs, "Skipped" cards, and the parts can be added back.
  const skipRun = await flow(b, { size: { width: 1000, height: 900 }, scheme: "dark" }, async (p, pick, next, out) => {
    await p.click("#pathFull");
    await pick("800"); await next();
    await pick("I know my Valorant sens"); await p.fill("#in-cur", "0.4"); await next(); await next();
    await pick("About 45 cm"); await next(); await pick("Wrist + forearm"); await next(); await next();
    await pick("Flex / fill"); await next(); await next(); await pick("Rifles"); await next();
    await pick("Europe"); await next(); await pick("25–29"); await next(); await p.pickExact("Gold"); await next();
    await pick("Skip"); await next();
    out.aimSkipLabel = await p.textContent("#skipPart");
    await p.click("#skipPart");                                             // "Skip aim test" -> first Part 3 screen
    out.afterAim = await p.evaluate(() => currentId + "|" + S.aimSkip);
    out.skipLabels = await p.$$eval("#skipPart", n => n.map(b => b.textContent));
    await p.click("#skipPart");                                             // "Skip crosshair" on the first Part 2 screen
    out.afterX = await p.evaluate(() => currentId + "|" + S.xSkip);
    await pick("2+ years"); await next();                                   // exp stays: sensitivity uses it
    out.hSkipLabel = await p.textContent("#skipPart");
    out.partsLabel = await p.textContent(".parts");
    await p.click("#skipPart");                                             // "Skip highlight" -> results
  }, async (p, out) => {
    out.tabs = await p.$$eval('[role="tab"]', n => n.map(t => t.textContent));
    out.skippedCards = await p.$$eval(".sum-c.skipped", n => n.map(c => c.textContent));
    out.accText = await p.textContent(".acc");
    const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#download")]);
    const f3 = path.join(os.tmpdir(), "valosens-e2e3-" + Date.now() + ".json"); await dl.saveAs(f3);
    const sess = JSON.parse(fs.readFileSync(f3, "utf8")).sessions[0]; out.dlFlags = [sess.answers.xSkip, sess.answers.hSkip, sess.answers.region, sess.result.code, sess.result.highlight].join("|");
    out.noMore = await p.evaluate(() => [testTarget(), canSkipToTests()].join("|"));
    await p.click('.add-part[data-part="2"]'); await p.waitForTimeout(400);
    out.added = await p.evaluate(() => [currentId, S.xSkip, S.hSkip, S.region, S.age, S.rank].join("|"));
  }, { noXh: true });
  // Quick path: questionnaire only; every other part is skipped and results render with no aim data.
  const quick = await flow(b, { size: { width: 1000, height: 900 }, scheme: "light" }, async (p, pick, next, out) => {
    out.startCards = await p.$$eval(".paths > *", n => n.map(c => c.textContent.slice(0, 40)));
    out.startImport = await p.evaluate(() => !!document.querySelector("#impFile") && !!document.querySelector(".path-import"));
    await p.click("#pathQuick");
    out.quickFlags = await p.evaluate(() => [S.aimSkip, S.xSkip, S.hSkip].join("|"));
    await pick("800"); await next();
    await pick("I know my Valorant sens"); await p.fill("#in-cur", "0.45"); await next(); await next();
    await pick("About 45 cm"); await next(); await pick("Wrist"); await next(); await next();
    await pick("Initiator"); await next(); await next(); await pick("Rifles"); await next();
    await pick("Europe"); await next(); await pick("25–29"); await next(); await p.pickExact("Diamond"); await next();
    await pick("Skip"); await next();
    out.quickIds = await p.evaluate(() => Q.filter(q => q.show()).map(q => q.id).join(","));
    await pick("2+ years"); await next();
  }, async (p, out) => {
    out.tabs = await p.$$eval('[role="tab"]', n => n.map(t => t.textContent));
    out.quickInput = await p.evaluate(() => { const i = buildInput(); return [!!i.calibration, !!i.personal, i.rank, "glasses" in i && i.glasses !== undefined].join("|"); });
    const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#download")]);
    const f4 = path.join(os.tmpdir(), "valosens-e2e4-" + Date.now() + ".json"); await dl.saveAs(f4);
    const j = JSON.parse(fs.readFileSync(f4, "utf8")); out.quickFile = [j.format, j.engine, j.sessions[0].aim, j.sessions[0].answers.aimSkip, j.sessions[0].answers.rank].join("|");
  }, { noXh: true });
  // Every skip combination renders without page errors (answers filled in directly).
  const combos = [];
  for (const [x, h] of [[false, false], [true, false], [false, true], [true, true]]) {
    const p = await b.newPage({ viewport: { width: 1100, height: 900 } }), errs = [];
    p.on("pageerror", e => errs.push(e.message)); p.on("console", m => m.type() === "error" && errs.push(m.text()));
    await p.goto(url);
    const r = await p.evaluate(([x, h]) => {
      Object.assign(S, { dpiSel: "800", curMode: "val", cur: "0.4", padSel: "45", limb: "wf", role: "d", weapon: "rifle", region: "eu", age: "25_29", rank: "gold", path: "full", aimSkip: true, statsGate: "no", cvd: "none", exp: "exp", aim: "flick", shape: "any", lose: "bright", res: "1080", hCur: "red", hMaps: "warm", xSkip: x, hSkip: h });
      const tt = testTarget(); renderResult();
      return { tt, tabs: [...document.querySelectorAll('[role="tab"]')].map(t => t.textContent).join(","), skipped: document.querySelectorAll(".sum-c.skipped").length, ids: Q.filter(q => q.show()).map(q => q.id).join(",") };
    }, [x, h]);
    await p.waitForTimeout(1500);
    const dpr = await p.evaluate(() => document.documentElement.scrollWidth);
    combos.push({ x, h, errs, ...r, scroll: dpr }); await p.close();
  }
  // Reduced motion: results still render completely, with no reveal overlay and no page errors.
  const reduced = await flow(b, { size: { width: 1000, height: 900 }, scheme: "dark" }, async (p, pick, next) => {
    await p.click("#pathFull");
    await pick("800"); await next();
    await pick("I know my Valorant sens"); await p.fill("#in-cur", "0.45"); await next(); await next();
    await pick("About 45 cm"); await next(); await pick("Wrist + forearm"); await next(); await next();
    await pick("Duelist"); await next(); await next(); await pick("Rifles"); await next();
    await pick("Korea"); await next(); await pick("Under 16"); await next(); await p.pickExact("Radiant"); await next();
    await pick("Skip"); await next();
    await p.click("#skipPart");
    await pick("No"); await next(); await pick("2+ years"); await next(); await pick("Flicks and taps"); await next(); await pick("Small cross"); await next();
    await pick("Rarely or never"); await next(); await pick("1920×1080"); await next(); await next();
    await pick("Red (Default)"); await next(); await pick("No pattern"); await next(); await next(); await next();
  }, null, { reduced: true });
  await b.close();
  let ok = true;
  const X = require("../xhair.js");
  results.forEach(r => {
    console.log(r.width + "px:", r.big, "| tooltip:", r.tooltip.replace(/\s+/g, " ").slice(0, 60), "| errors:", r.errs.length, r.errs.slice(0, 3));
    if (r.errs.length || r.scroll > r.width || !/cm/.test(r.big)) ok = false;
    const anim = r.revealShown && r.revealGone && r.cardAnim === "cardIn" && /stroke-dashoffset/.test(r.lineAnim) && r.paneAnim;
    console.log("  animations: reveal", r.revealShown, r.revealGone, "| cards", r.cardAnim, "| chart lines", r.lineAnim, "| pane replay", r.paneAnim);
    if (!anim) ok = false;
    if (r.options !== 3) { ok = false; console.log("  expected 3 crosshair options, got", r.options); }
    try { X.decode(r.code); } catch (e) { ok = false; console.log("  bad code", r.code); }
  });
  const t0 = results[0].text;
  const agentLine = /Agents:.*Jett.*Tailwind/.test(t0), scoped = /scoped multiplier of 0\.9/.test(t0);
  console.log("agent explanation shown:", agentLine, "| scoped advice for Jett shown:", scoped);
  if (!agentLine || !scoped) ok = false;
  const r0 = results[0];
  console.log("visibility rounds answered:", r0.xAnswered, "| vision test progress %:", r0.vtProgress.toFixed(1));
  if (r0.xAnswered !== 8 || !(r0.vtProgress > 0)) ok = false;
  console.log("rotation: seeds differ between loads:", results[0].seed !== results[2].seed);
  if (results[0].seed === results[2].seed) ok = false;
  const deut = /Yellow \(Deuteranopia\)/.test(t0) && !/c;[127];/.test(r0.code) && /;h;|o;1/.test(r0.code) && /visibility test/.test(t0);
  const trit = !/Yellow \(/.test(results[2].text.match(/Enemy highlight[^]*?Settings/)?.[0] || "x") && /0m;1/.test(results[2].code) && /d;1/.test(results[2].code);
  console.log("codes:", results.map(r => r.code).join(" | "), "| deutan rules:", deut, "| tritan + dot + training:", trit);
  if (!deut || !trit) ok = false;
  const r2 = results[1];
  const file1 = JSON.parse(fs.readFileSync(file, "utf8"));
  const filesOk = /^valosens-results-.*-1-session\.json$/.test(r0.fileName) && file1.sessions.length === 1 && file1.sessions[0].hTest.length > 50 && file1.sessions[0].xTest.length === 8;
  const aimFileOk = file1.format === 2 && file1.engine === "6" && file1.sessions[0].answers.rank === "gold" && file1.sessions[0].answers.aimSkip === false && file1.sessions[0].answers.glasses === undefined &&
    file1.sessions[0].aim && file1.sessions[0].aim.trials.length === r0.aimTrials && r0.aimTrials >= 40 && file1.sessions[0].aim.dpi && file1.sessions[0].aim.personal && !JSON.stringify(file1.sessions[0].aim).includes("trajector") &&
    r0.aimNextDisabled === true && /^true\|true\|gold\|false\|measured\|$/.test(r0.aimInput) && /targets/.test(r0.aimSummary) && /^true\|true\|gold\|/.test(r2.calib2);
  console.log("aim data in input and file (format 2):", aimFileOk, "| second run pools it:", r2.calib2);
  if (!aimFileOk) ok = false;
  const importOk = /Calibration run 2/.test(r2.imported) && r2.prefill === "800|0.5|Jett|deutan|1440|1" && r2.jumpedTo === "vis";
  const pooledOk = /By session \(2\)/.test(r2.hlText) && /Sessions\s*2/.test(r2.sideText) && r2.sessionsInFile === 2 && /valid JSON/.test(r2.badMsg) && r2.secondRound !== r0.firstRound;
  console.log("results file:", r0.fileName, filesOk, "| import + prefill + skip:", importOk, r2.prefill, "| pooled second run:", pooledOk, "| bad file message:", r2.badMsg);
  if (!filesOk || !importOk || !pooledOk) ok = false;
  // new in 5.0: questions, bell chart, skipping, reduced motion
  results.forEach(r => {
    const bellOk = r.bellPaths >= 4 && /stroke-dashoffset/.test(r.bellAnim) && /bell curve/i.test(r.bellAria) && r.shiftRows >= 1 && /^\d+$/.test(r.bellPct) && r.bellScroll <= r.width;
    console.log("  bell chart:", r.bellPaths, "paths |", r.bellAnim, "| shift rows", r.shiftRows, "| percentile", r.bellPct, bellOk);
    if (!bellOk) ok = false;
  });
  const q = quick, quickOk = !q.errs.length && q.quickFlags === "true|true|true" && q.startCards.length === 3 && q.startImport && q.tabs.join() === "Sensitivity,Model,Vs pros,Test plan" &&
    !/aimtest|cvd/.test(q.quickIds) && q.quickInput === "false|false|diamond|false" && q.quickFile === "2|6||true|diamond" && q.scroll <= q.width && /cm/.test(q.big);
  console.log("quick path:", quickOk, "| flags", q.quickFlags, "| cards", q.startCards.length, "| input", q.quickInput, "| file", q.quickFile, "| errors", q.errs.length, q.errs.slice(0, 2));
  if (!quickOk) ok = false;
  const sk = skipRun;
  const skipOk = !sk.errs.length && /Skipped/.test(sk.skippedCards.join("")) && sk.skippedCards.length === 2 && sk.tabs.join() === "Sensitivity,Model,Vs pros,Test plan" &&
    !/Crosshair|Highlight/.test(sk.accText) && /skip/i.test(sk.skipLabels.join()) && sk.skipLabels.join() === "Skip crosshair" && sk.hSkipLabel === "Skip highlight" && sk.afterX === "exp|true" && sk.aimSkipLabel === "Skip aim test" && sk.afterAim === "cvd|true" && /Skipped/.test(sk.partsLabel) &&
    sk.dlFlags === "true|true|eu||" && sk.noMore === "|false" && sk.added === "cvd|false|true|eu|25_29|gold" && sk.scroll <= sk.width && /cm/.test(sk.big);
  console.log("skip both:", skipOk, "| tabs:", sk.tabs.join(), "| cards:", sk.skippedCards.length, "| errors:", sk.errs.length, sk.errs.slice(0, 2), "| flags in file:", sk.dlFlags, "| after Add it now:", sk.added);
  if (!skipOk) ok = false;
  combos.forEach(c => {
    const want = (c.x ? 0 : 1) + (c.h ? 0 : 1) + 4, good = !c.errs.length && c.tabs.split(",").length === want && c.skipped === (c.x ? 1 : 0) + (c.h ? 1 : 0) && c.scroll <= 1100 &&
      c.tt === (c.x ? (c.h ? null : "hTest") : "vis") && !(c.x && /,(aim|aimtest|vis)(,|$)/.test(c.ids)) && !(c.h && /hCur|hTest/.test(c.ids)) && /exp/.test(c.ids);
    console.log("  combo xSkip=" + c.x + " hSkip=" + c.h + ": tabs", c.tabs, "| errors", c.errs.length, "| testTarget", c.tt, good);
    if (!good) ok = false;
  });
  const rd = reduced, rdOk = !rd.errs.length && !rd.revealShown && /cm/.test(rd.big) && rd.bellPaths >= 4 && rd.options === 3 && rd.scroll <= rd.width;
  console.log("reduced motion run:", rdOk, "| reveal overlay:", rd.revealShown, "| errors:", rd.errs.length);
  if (!rdOk) ok = false;
  console.log("results width share at 1000px:", (r0.sumWidth / r0.width).toFixed(2));
  console.log(ok ? "UI smoke test passed" : "UI smoke test FAILED");
  process.exit(ok ? 0 : 1);
})();
