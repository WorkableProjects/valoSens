// Browser smoke test of the questionnaire (needs Playwright + Chromium). Run: node test/ui.e2e.js
const { chromium } = require("playwright");
const path = require("path");
const url = "file://" + path.join(__dirname, "..", "index.html");
async function flow(b, vp, steps) {
  const errs = [];
  const p = await b.newPage({ viewport: vp.size, colorScheme: vp.scheme });
  p.on("pageerror", e => errs.push(e.message)); p.on("console", m => m.type() === "error" && errs.push(m.text()));
  await p.goto(url);
  const pick = t => p.getByRole("button", { name: t }).first().click();
  const next = () => p.click("#next");
  await steps(p, pick, next);
  await p.waitForSelector(".big");
  const out = { big: (await p.textContent(".big")).trim(), scroll: await p.evaluate(() => document.documentElement.scrollWidth), width: vp.size.width, errs };
  await p.hover("#costChart #hit", { position: { x: 200, y: 80 } });
  out.tooltip = await p.textContent("#costChart .tt");
  await p.close();
  return out;
}
(async () => {
  const b = await chromium.launch();
  const results = [];
  results.push(await flow(b, { size: { width: 1000, height: 900 }, scheme: "light" }, async (p, pick, next) => {
    await pick("800"); await next();
    await pick("I know my Valorant sens"); await p.fill("#in-cur", "0.5"); await next();
    await next();
    await pick("About 45 cm"); await next(); await pick("Speed"); await next(); await pick("Wrist + forearm"); await next();
    await pick("Duelist"); await next();
    if (await p.$("#in-agent1") && (await p.$$("#in-agent1 option")).length > 1) { await p.selectOption("#in-agent1", { index: 1 }); }
    await next();
    await pick("Rifles"); await next(); await pick("2+ years"); await next();
    await pick("Yes, add stats"); await next();
    await p.selectOption("#in-rank", "plat"); await p.fill("#in-stMatches", "60"); await p.fill("#in-stHs", "22"); await p.fill("#in-stKd", "1.05"); await p.fill("#in-stAdr", "130");
    await next();
  }));
  results.push(await flow(b, { size: { width: 390, height: 900 }, scheme: "dark" }, async (p, pick, next) => {
    await pick("Not sure"); await next();
    await pick("I'll convert from another game"); await p.selectOption("#og", "ow2"); await p.fill("#in-otherSens", "5"); await next();
    await next();
    await pick("Enter exact width"); await p.fill("#in-padCustom", "90"); await next();
    await pick("Glass or hard"); await next(); await pick("Not sure"); await next();
    await pick("Sentinel"); await next(); await next();
    await pick("Operator"); await next(); await pick("Under 6 months"); await next();
    await pick("Skip"); await next();
  }));
  await b.close();
  let ok = true;
  results.forEach(r => {
    console.log(r.width + "px:", r.big, "| tooltip:", r.tooltip.replace(/\s+/g, " "), "| errors:", r.errs.length);
    if (r.errs.length || r.scroll > r.width || !/cm/.test(r.big)) ok = false;
  });
  console.log(ok ? "UI smoke test passed" : "UI smoke test FAILED");
  process.exit(ok ? 0 : 1);
})();
