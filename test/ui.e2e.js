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
  await p.waitForTimeout(1300);            // let the count-up finish
  const sumWidth = await p.evaluate(() => document.querySelector(".sum").getBoundingClientRect().width);
  const out = { sumWidth, big: (await p.textContent(".big")).trim(), scroll: await p.evaluate(() => document.documentElement.scrollWidth), width: vp.size.width, errs };
  await p.getByRole("tab", { name: "Model" }).click();
  await p.hover("#costChart #hit", { position: { x: 200, y: 80 } });
  out.tooltip = await p.textContent("#costChart .tt");
  out.text = await p.textContent("#app");
  out.code = await p.textContent("#xhCode");
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
    await pick("About 45 cm"); await next(); await pick("Wrist + forearm"); await next();
    await pick("Duelist"); await next();
    await p.selectOption("#in-agent1", "Jett"); await p.selectOption("#in-agent2", "Omen");
    await next();
    await pick("Rifles"); await next();
    await pick("Yes, add stats"); await next();
    await p.selectOption("#in-rank", "plat"); await p.fill("#in-stMatches", "60"); await p.fill("#in-stHs", "22"); await p.fill("#in-stKd", "1.05"); await p.fill("#in-stAdr", "130");
    await next();
    // Part 2: crosshair
    await pick("Red-green: deutan"); await next(); await pick("2+ years"); await next();
    await pick("Flicks and taps"); await next(); await pick("Small cross"); await next();
    await pick("On bright maps"); await next(); await pick("2560×1440"); await next();
    await p.getByRole("button", { name: "White + outline on Bright sand" }).click(); await next();
    // Part 3: highlight
    await pick("Red (Default)"); await next(); await pick("Dark corners and shadows"); await next();
    await pick("Fire and orange"); await next();
    await next();
  }));
  results.push(await flow(b, { size: { width: 390, height: 900 }, scheme: "dark" }, async (p, pick, next) => {
    await pick("Not sure"); await next();
    await pick("I'll convert from another game"); await p.selectOption("#og", "ow2"); await p.fill("#in-otherSens", "5"); await next();
    await next();
    await pick("Enter exact width"); await p.fill("#in-padCustom", "90"); await next();
    await pick("Not sure"); await next();
    await pick("Sentinel"); await next(); await next();
    await pick("Operator"); await next();
    await pick("Skip"); await next();
    await pick("Blue-yellow: tritan"); await next(); await pick("Under 6 months"); await next(); await pick("Yes, often"); await next();
    await pick("A mix / not sure"); await next(); await pick("Dot only"); await next(); await pick("Rarely or never"); await next();
    await pick("1920×1080"); await next(); await next();
    await pick("Not sure"); await next(); await pick("No pattern"); await next(); await next(); await next();
  }));
  await b.close();
  let ok = true;
  results.forEach(r => {
    console.log(r.width + "px:", r.big, "| tooltip:", r.tooltip.replace(/\s+/g, " "), "| errors:", r.errs.length);
    if (r.errs.length || r.scroll > r.width || !/cm/.test(r.big)) ok = false;
  });
  const t0 = results[0].text;
  const agentLine = /Agents:.*Jett.*Tailwind/.test(t0), scoped = /scoped multiplier of 0\.9/.test(t0);
  console.log("agent explanation shown:", agentLine, "| scoped advice for Jett shown:", scoped);
  if (!agentLine || !scoped) ok = false;
  // Crosshair codes must decode, and the highlight must follow the colour-vision answer.
  const X = require("../xhair.js");
  results.forEach(r => { try { X.decode(r.code); } catch (e) { ok = false; console.log("bad code", r.code); } });
  const deut = /Yellow \(Deuteranopia\)/.test(t0) && !/c;[127];/.test(results[0].code) && /;h;|o;1/.test(results[0].code);
  const trit = /Purple \(Tritanopia\)/.test(results[1].text) && /0m;1/.test(results[1].code) && /d;1/.test(results[1].code);
  console.log("codes:", results.map(r => r.code).join(" | "), "| deutan rules:", deut, "| tritan+dot+training:", trit);
  if (!deut || !trit) ok = false;
  const wide = results[0].sumWidth / results[0].width;
  console.log("results width share at 1000px:", wide.toFixed(2));
  console.log(ok ? "UI smoke test passed" : "UI smoke test FAILED");
  process.exit(ok ? 0 : 1);
})();
