"use strict";
function renderResult() {
  if (VT_RUN) { VT_RUN.stop = true; if (VT_RUN.cleanup) VT_RUN.cleanup(); }
  var inp = buildInput();
  var R = M.recommend(inp);
  var dpi = inp.dpi, cm = R.cm, sens = M.sensFor(cm, dpi), edpi = dpi * sens, pr = R.profile;
  var cur = R.anchor ? R.anchor.cm : null;
  setProgress(100, "Result");
  document.getElementById("wrap").classList.add("wide");

  // Factor impact: the model optimum with your answer vs. with a neutral reference answer.
  var REF = { pad: 45, limb: "unsure", agents: null, role: "f", weapon: "rifle" };
  function effect(o) { var alt = M.recommend(Object.assign({}, inp, o, { current: null, calibration: null })).cModel; return (R.cModel / alt - 1) * 100; }
  var agentNames = R.agents ? R.agents.agents.map(function (a) { return a.name; }).join(", ") : M.ROLE[inp.role] ? M.ROLE[inp.role].label : "Flex";
  var rowsL = [
    ["Mousepad", f1(getPad()) + " cm", getPad() === 45 ? null : effect({ pad: 45 })],
    ["Aim joint", ({ wrist: "Wrist", wf: "Wrist+arm", forearm: "Forearm", arm: "Arm", unsure: "Not sure" })[inp.limb] || "Not sure", inp.limb === "unsure" ? null : effect({ limb: "unsure" })],
    [R.agents ? "Agents" : "Role", agentNames, R.agents ? effect({ agents: null }) : (inp.role && inp.role !== "f" ? effect({ role: "f" }) : null)],
    ["Weapon", ({ rifle: "Rifle", sniper: "Sniper", close: "SMG / shotgun" })[inp.weapon] || "Rifle", inp.weapon && inp.weapon !== "rifle" ? effect({ weapon: "rifle" }) : null]
  ];
  var curEffect = cur ? (cm / R.cModel - 1) * 100 : null;
  var rowsR = [
    ["Current setting", cur ? f1(cur) + " cm" : "None", curEffect],
    ["Near-optimal", f1(R.lo) + "–" + f1(R.hi), null],
    ["Vs pros", R.proPercentile === 0 ? "Fastest" : R.proPercentile === 1 ? "Slowest" : "Faster than " + Math.round((1 - R.proPercentile) * 100) + "%", null],
    ["Stats", "Not used", null]
  ];
  var prevRes = S.prior && S.prior[S.prior.length - 1].result;
  if (prevRes && prevRes.cm) rowsR.splice(1, 0, ["Last session", f1(prevRes.cm) + " cm", (cm / prevRes.cm - 1) * 100]);
  function bdCol(rows, off) {
    return '<div><div class="bd-h"><span>Factor</span><span>Value</span><span>Impact</span></div>' +
      rows.map(function (r, i) { return '<div class="bd-r row-in" style="--i:' + (i + off) + '"><span class="k">' + r[0] + '</span><span class="v">' + esc(r[1]) + "</span>" + impactCell(r[2]) +
        (r[2] !== null && Math.abs(r[2]) >= 1 ? '<i class="ibar' + (r[2] > 0 ? " slow" : "") + '" style="--w:' + Math.min(1, Math.abs(r[2]) / 30).toFixed(2) + '"></i>' : "") + "</div>"; }).join("") + "</div>";
  }

  // Confidence badge (heuristic for questionnaire; measured for calibration data).
  var conf = R.confidence, badgeTxt = conf.type === "measured" ? "DATA" : ({ "low": "LOW", "low–medium": "L–M", "medium": "MED" }[conf.label] || "LOW");
  var badgeCap = conf.type === "measured" ? "Fitted from your test trials." : "Heuristic label. The questionnaire model is unvalidated, so test the three values to confirm.";
  function gaugePos(c) { return Math.max(0, Math.min(100, (c - 15) / (110 - 15) * 100)); }

  // Scoped advice text (kept as one sentence for copy and tests).
  var sa = R.scopedAdvice, scopedTxt = "Keep the ADS and scoped multipliers at 1.0 to begin with.";
  if (sa.scoped.alternatives.length || sa.ads.alternatives.length) {
    scopedTxt = "Start with the scoped and ADS multipliers at 1.0, where most pros keep them.";
    if (sa.scoped.alternatives.length) scopedTxt += " You " + (sa.scoped.level === "main" ? "scope a lot" : "scope sometimes") + ", so if scoped flicks feel too fast compared with hipfire, try a scoped multiplier of " + sa.scoped.alternatives.map(function (x) { return x.value + " (" + x.label + ")"; }).join(" or ") + ".";
    if (sa.ads.alternatives.length) scopedTxt += " For Chamber's Headhunter, an ADS multiplier of " + sa.ads.alternatives[0].value + " is the " + sa.ads.alternatives[0].label + ".";
    scopedTxt += " These are preferences: no study shows one is better.";
  }
  var scopedShort = sa.scoped.alternatives.length ? "Optional: " + sa.scoped.alternatives[0].value + " or " + sa.scoped.alternatives[1].value : "Default";
  var adsShort = sa.ads.alternatives.length ? "Headhunter option: " + sa.ads.alternatives[0].value : "Default";

  // Model tab text
  var mixTxt = pr.mix.map(function (m, j) { return Math.round(m * 100) + "% " + M.TASKS[j].label; }).join(", ");
  var agentTxt = "";
  if (R.agents) {
    var b0 = M.recommend(Object.assign({}, inp, { agents: null })).cModel;
    agentTxt = R.agents.agents.map(function (a) {
      var bits = a.reorient.map(function (r) { return r.ability + " (re-aim ≈" + Math.round(r.theta) + "° in ~" + Math.round(r.rate * 100) + "% of fights)"; });
      if (a.holdShift > 0) bits.push("anchor kit, more angle-holding");
      return "<b>" + esc(a.name) + "</b> " + Math.round(a.share * 100) + "%" + (bits.length ? ": " + bits.join("; ") : ": no aim-changing mechanics");
    }).join(". ") + ". These move the model's best setting from " + f1(b0) + " to " + f1(R.cModel) + " cm. How often each ability forces a fast re-aim, and by how much, are estimates. In our 28-pro sample, mobility-duelist mains run about 15% faster (not statistically significant, p ≈ 0.12).";
  }
  var A = R.anchor;
  var anchorTxt = A
    ? "Your current " + f1(A.cm) + " cm costs about " + Math.round(A.costDiff * 1000) + " ms more per engagement than the model's best (" + f1(R.cModel) + " cm). " +
      Math.round(A.agreement * 100) + "% of the " + R.nScenarios + " assumption sets put the best setting on that side of yours. " +
      "Weighing the gain against re-adapting (your comfort rating makes re-adapting " + A.satMult.toFixed(2) + "× as costly), " +
      (A.stay ? "the result keeps your setting: " + R.reason + "."
        : "the result moves " + (A.step > 0 ? "+" : "") + Math.round(A.step * 100) + "% (saves about " + A.gainMs.toFixed(1) + " ms per engagement)" +
          (A.stages > 1 ? ". Bigger changes are split into steps of at most " + Math.round(M.PARAMS.maxStep.central * 100) + "%: " + A.plan.map(f1).join(" → ") + " cm, one per run. Import your results file next time to continue." : "."))
    : "No current setting, so the result is the model's minimum.";
  var driveTxt = (R.byTask || []).slice().sort(function (a, b) { return b.cost - a.cost; }).map(function (b) { return b.label + " " + (b.cost * 1000).toFixed(1) + " ms"; }).join(", ");
  var modTxt = pr.modifiers ? pr.modifiers.experience + " (hand noise ×" + pr.modifiers.noise.toFixed(2) + ")" + ", grip " + pr.modifiers.grip + ", lift time ×" + pr.modifiers.lift.toFixed(2) : "";
  var tests = [["Faster", cm / 1.12], ["Recommended", cm], ["Slower", cm * 1.12]].map(function (t) {
    return '<tr class="' + (t[0] === "Recommended" ? "hl" : "") + '"><td>' + t[0] + '</td><td class="n">' + f1(t[1]) + '</td><td class="n">' + M.sensFor(t[1], dpi).toFixed(3) + "</td></tr>";
  }).join("");
  var statsHtml = "";
  if (R.stats) {
    var st = inp.stats, sg = R.stats, rs = [];
    if (isFinite(st.hs)) rs.push(["Headshot %", st.hs + "%", sg.hsRef + "%", st.hs >= sg.hsRef]);
    if (isFinite(st.kd)) rs.push(["K/D", st.kd.toFixed(2), sg.kdRef.toFixed(2), st.kd >= sg.kdRef]);
    if (isFinite(st.adr)) rs.push(["ADR", Math.round(st.adr), "125", st.adr >= 125]);
    statsHtml = '<div class="sub-t" style="margin-top:24px">Before snapshot</div><table><thead><tr><th>Stat</th><th class="n">You</th><th class="n">Typical for rank</th></tr></thead><tbody>' +
      rs.map(function (r) { return "<tr><td>" + r[0] + '</td><td class="n ' + (r[3] ? "good" : "warn") + '">' + r[1] + '</td><td class="n">' + r[2] + "</td></tr>"; }).join("") +
      '</tbody></table><p class="tip">These don\'t affect your result. Compare them again after 2–4 weeks on the new setting.</p>';
  }
  var near = R.nearPros.map(function (p) { return "<tr><td>" + esc(p.name) + "</td><td>" + (p.role ? M.ROLE[p.role].label : "Unverified") + '</td><td class="n">' + f1(p.cm) + '</td><td class="n">' + Math.round(p.edpi) + "</td></tr>"; }).join("");
  var cc = costChart(R), bc = bellChart(R, dpi);
  var today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  // Skipped parts are not computed at all: their summary card says "Skipped" and their tabs and rows are left out.
  var skX = !!S.xSkip, skH = !!S.hSkip;
  var XR = skX && skH ? null : X.recommend(xhInput());
  var xc = XR && !skX ? XR.crosshair : null, hl = XR && !skH ? XR.highlight : null;
  var gx = xc ? xc.geometry : null, shapeName = gx ? ({ small: "small cross", medium: "cross", dot: "dot", crossDot: "cross + dot" })[gx.shape] : "";
  var TABS = [["Sensitivity", 0]].concat(xc ? [["Crosshair", 4]] : [], hl ? [["Highlight", 5]] : [], [["Model", 1], ["Vs pros", 2], ["Test plan", 3]]);
  var xhPane = "", hlPane = "";
  if (xc) {
  function onoff(v) { return v ? "On" : "Off"; }
  var cfg = xc.cfg, xRows = [
    ["Color", '<i class="sw" style="background:' + xc.color.hex + '"></i>' + xc.color.name],
    ["Outlines", cfg.h ? "On · opacity " + cfg.o + " · thickness 1" : "Off"],
    ["Center dot", cfg.d ? "On · thickness " + cfg.z + " · opacity 1" : "Off"],
    ["Inner lines", cfg["0b"] === 0 ? "Off" : "Opacity 1 · length " + cfg["0l"] + " · thickness " + cfg["0t"] + " · offset " + cfg["0o"]],
    ["Outer lines", "Off"],
    ["Movement error", cfg["0m"] ? "On (training aid)" : "Off"],
    ["Firing error", "Off"],
    ["Fade with firing error", "Off"]
  ].map(function (r) { return "<tr><td>" + r[0] + "</td><td>" + r[1] + "</td></tr>"; }).join("");
  var maxS = Math.max.apply(null, xc.scores.map(function (z) { return z.s; })), minS = Math.min.apply(null, xc.scores.map(function (z) { return z.s; }));
  var xBars = xc.scores.map(function (z, i) {
    var w = Math.max(3, (z.s - minS) / (maxS - minS || 1) * 100);
    return '<div class="sbar' + (z.key === xc.color.key ? " on" : "") + '" style="--i:' + i + '"><span class="sb-n"><i class="sw" style="background:' + z.hex + '"></i>' + z.name + '</span><span class="sb-t"><i style="width:' + w.toFixed(0) + '%;background:' + z.hex + '"></i></span><span class="sb-v">' + (z.clash ? "clashes" : z.s.toFixed(1)) + "</span></div>";
  }).join("");
  var XSCENES = ["sand", "concrete", "shadow", "ice", "smoke"];
  var optCards = xc.options.map(function (o, i) {
    return '<div class="opt" style="--i:' + i + '"><div class="opt-k">' + esc(o.label) + '</div><canvas class="xh-prev" data-bg="' + XSCENES[(i + 1) % XSCENES.length] + '" data-z="3" data-code="' + esc(o.code) + '" aria-label="' + esc(o.label) + ' preview"></canvas>' +
      '<div class="opt-n">' + esc(o.note) + '</div><div class="codebox"><code' + (i === 0 ? ' id="xhCode"' : "") + ">" + esc(o.code) + '</code><button type="button" class="btn small copy-code" data-code="' + esc(o.code) + '">Copy</button></div></div>';
  }).join("");
  var ft = xc.test, xTestHtml = "";
  if (ft && ft.n) {
    var cc2 = X.XCOLORS.filter(function (c) { return X.allowedColor(c.key, S.cvd); }).map(function (c) { return { c: c, v: ft.coef["c:" + c.key] || 0 }; }).sort(function (a, b) { return b.v - a.v; });
    var vmax = Math.max(0.3, Math.max.apply(null, cc2.map(function (z) { return Math.abs(z.v); })));
    xTestHtml = '<div class="sub-t" style="margin-top:20px">Your visibility test</div><p class="tip">' + ft.n + " of " + ft.rounds + " rounds picked" + (S.prior ? ", pooled across " + (S.prior.length + 1) + " sessions" : "") + ". Choice-model effect of each color (right = you picked it more than expected):</p>" +
      '<div class="sbars">' + cc2.map(function (z, i) {
        var w = Math.abs(z.v) / vmax * 50;
        return '<div class="sbar" style="--i:' + i + '"><span class="sb-n"><i class="sw" style="background:' + z.c.hex + '"></i>' + z.c.name + '</span><span class="sb-t mid"><i style="' + (z.v >= 0 ? "left:50%" : "left:" + (50 - w).toFixed(1) + "%") + ";width:" + w.toFixed(1) + "%;background:" + z.c.hex + '"></i></span><span class="sb-v">' + (z.v >= 0 ? "+" : "") + z.v.toFixed(2) + "</span></div>";
      }).join("") + "</div>" +
      '<p class="tip">Outlines: ' + (ft.coef.outline >= 0 ? "+" : "") + ft.coef.outline.toFixed(2) + " · dots vs crosses: " + ((ft.coef["s:dot"] || 0) - (ft.coef["s:cross"] || 0)).toFixed(2) + ". Small samples, so these are shrunk toward zero.</p>";
  }
  xhPane =
    '<section class="pane" id="pane-4" role="tabpanel" aria-labelledby="tab-4" hidden>' +
      '<div class="sec-t">Crosshair <span>' + xc.color.name + " " + shapeName + "</span></div>" +
      '<div class="panel"><div class="xh-row">' +
        XSCENES.map(function (b) { return '<figure class="xh-fig"><canvas class="xh-prev" data-bg="' + b + '" aria-label="Crosshair on ' + BGS[b].name + '"></canvas><figcaption>' + BGS[b].name + "</figcaption></figure>"; }).join("") +
        '<figure class="xh-fig"><canvas class="xh-prev" data-bg="concrete" data-z="8" aria-label="Crosshair zoomed in"></canvas><figcaption>Zoomed ×8</figcaption></figure>' +
      "</div>" +
      '<div class="sub-t">Three to try</div><div class="opts">' + optCards + "</div>" +
      '<p class="tip">In Valorant: Settings › Crosshair › Primary › import profile code (the arrow icon), then paste. Previews are drawn at real pixel size. A head at your usual fight distance is about ' + Math.round(xc.headPx) + " px wide on your screen.</p>" +
      '<div class="duo" style="margin-top:20px"><div><div class="sub-t">Settings</div><table class="kv"><tbody>' + xRows + "</tbody></table>" +
        '<div class="sub-t" style="margin-top:20px">Why this crosshair</div><ul class="notes">' + xc.why.map(function (w) { return "<li>" + esc(w) + "</li>"; }).join("") + "</ul></div>" +
        '<div><div class="sub-t">Color scores</div><div class="sbars">' + xBars + '</div><p class="tip">Computed contrast against eight map and utility scenes (weighted by your answers, as your color vision sees them), plus small pro-use priors and your test picks. Colors that look like your enemy highlight are ruled out.</p>' +
        xTestHtml +
        '<div class="sub-t" style="margin-top:20px">Pros (' + X.PRO.nCross + " + " + X.PRO.nSpind + ' codes)</div><table><tbody>' +
          "<tr><td>Color</td><td>White 58% · Cyan 19–21% · Green 9–11%</td></tr><tr><td>Shape</td><td>Cross 57% · Dot 26–28% · Cross + dot 11%</td></tr>" +
          "<tr><td>Outlines</td><td>52–59% visible</td></tr><tr><td>Error lines</td><td>About 1% use them</td></tr><tr><td>Inner lines</td><td>Length 2–4 (median 3), gap 0–2, thickness 2</td></tr></tbody></table></div>" +
      "</div>" +
      '<details><summary>Sources</summary><ul class="src"><li>Pro data: own scrape of <a href="https://prosettings.net/lists/valorant/" target="_blank" rel="noopener">ProSettings.net</a> and the <a href="https://www.valorant-spind.de/en/valorant-pro-crosshair-datenbank.html" target="_blank" rel="noopener">Valorant-Spind database</a>, 2026</li><li>Mullen 1985: fine detail is carried by luminance, not color (J. Physiol. 359:381)</li><li>Machado, Oliveira &amp; Fernandes 2009: color-vision simulation (IEEE TVCG 15:1291)</li><li>Abrams &amp; Christ 2003: motion onset captures attention (Psych. Sci. 14:427)</li><li>Siderov, Waugh &amp; Bedell 2013; Pelli &amp; Tillman 2008: crowding near the aim point</li><li>Bradley &amp; Terry 1952; Hunter 2004; Hajek, Oh &amp; Xu 2014: scoring picks from random subsets</li><li>Code format: genesy/crosshair-codes and spartytech/Crosshair-Bridge (Riot does not publish it)</li><li>Full notes: research/crosshair_research.md</li></ul></details>' +
    "</div></section>";
  }
  if (hl) {
  var hMax = Math.max.apply(null, hl.ranking.map(function (z) { return z.s; })), hMin = Math.min.apply(null, hl.ranking.map(function (z) { return z.s; }));
  var hRows = hl.ranking.map(function (z, i) {
    var w = Math.max(3, (z.s - hMin) / (hMax - hMin || 1) * 100);
    return '<div class="sbar' + (z.key === hl.color.key ? " on" : "") + '" style="--i:' + i + '"><span class="sb-n"><i class="sw" style="background:' + z.hex + '"></i>' + esc(z.name) + '</span><span class="sb-t"><i style="width:' + w.toFixed(0) + '%;background:' + z.hex + '"></i></span><span class="sb-v">' + (z.clash ? "clashes" : z.s.toFixed(1)) + "</span></div>" +
      (z.why.length ? '<p class="sb-why">' + esc(z.why.join(" · ")) + "</p>" : "");
  }).join("");
  var tRows = "", A = hl.test;
  if (A && A.ok) tRows = '<div class="sub-t" style="margin-top:20px">Your vision test</div><table><thead><tr><th>Color</th><th class="n">Strength needed</th><th class="n">± </th><th class="n">Rounds</th><th class="n">Bonus</th></tr></thead><tbody>' +
    X.VT.colors.map(function (k) { var r = A.colors[k]; return '<tr><td><i class="sw" style="background:' + X.TEST_HEX[k] + '"></i>' + k[0].toUpperCase() + k.slice(1) + '</td><td class="n">' + Math.round(Math.min(1, r.alpha75) * 100) + '%</td><td class="n">×' + Math.pow(10, r.se).toFixed(2) + '</td><td class="n">' + r.n + '</td><td class="n">' + (A.bonus[k] >= 0 ? "+" : "") + A.bonus[k].toFixed(1) + "</td></tr>"; }).join("") +
    '</tbody></table><p class="tip">Strength = the outline opacity at which you found the highlighted enemy 75% of the time, from a maximum-likelihood fit (chance is 25%). Response time was never measured. Easy check rounds: ' + (A.catchPc === null ? "–" : Math.round(A.catchPc * 100) + "%") + "; dropped frames: " + A.dropped + "." + (A.flags.length ? " " + esc(A.flags.join(" ")) : "") + "</p>";
  if (A && A.ok && S.prior) {
    var ps = V.perSession(S.prior, { hTest: S.hTest });
    tRows += '<div class="sub-t" style="margin-top:16px">By session (' + ps.length + ')</div><table><thead><tr><th>Session</th>' + X.VT.colors.map(function (k) { return '<th class="n"><i class="sw" style="background:' + X.TEST_HEX[k] + '"></i>' + k[0].toUpperCase() + k.slice(1) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      ps.map(function (q) { return "<tr><td>" + esc(q.date === "this run" ? "This run" : fmtDate(q.date)) + "</td>" + X.VT.colors.map(function (k) { return '<td class="n">' + (q.ok ? Math.round(Math.min(1, q.colors[k].alpha75) * 100) + "%" : "–") + "</td>"; }).join("") + "</tr>"; }).join("") +
      '</tbody></table><p class="tip">The ranking above uses every round from every session in one fit. If the sessions disagree a lot, check that your monitor brightness and room light were similar.</p>';
  }
  else if (A && !A.ok) tRows = '<p class="tip" style="margin-top:16px">Vision test: ' + esc(A.reason) + "</p>";
  var hWhy = hl.why.length ? hl.why : ["no strong reason to move away from the computed ranking"];
  var HSCENES = ["sand", "concrete", "shadow", "smoke"];
  hlPane =
    '<section class="pane" id="pane-5" role="tabpanel" aria-labelledby="tab-5" hidden>' +
      '<div class="sec-t">Enemy highlight <span>' + esc(hl.color.name) + "</span></div>" +
      '<div class="panel"><div class="xh-row">' +
        HSCENES.map(function (b) { return '<figure class="xh-fig"><canvas class="hl-prev" data-bg="' + b + '" data-hl="' + hl.color.hex + '" aria-label="Enemy outline on ' + BGS[b].name + '"></canvas><figcaption>' + BGS[b].name + "</figcaption></figure>"; }).join("") +
        (hl.sim ? '<figure class="xh-fig"><canvas class="hl-prev" data-bg="concrete" data-hl="' + hl.sim + '" aria-label="Simulated for your color vision"></canvas><figcaption>As your color vision sees it</figcaption></figure>' : "") +
      "</div>" +
      '<p class="tip">Settings › General › Accessibility › Enemy Highlight Color › <b style="color:var(--ink)">' + esc(hl.color.name) + "</b>. Preview colors use community-posted values; Riot doesn't publish them.</p>" +
      '<div class="duo" style="margin-top:20px"><div><div class="sub-t">Why this color</div><ul class="notes">' + hWhy.map(function (w) { return "<li>" + esc(w[0].toUpperCase() + w.slice(1)) + ".</li>"; }).join("") +
        (hl.overridden ? "<li>" + esc(hl.overridden.name) + " scored higher on its own, but it would look like your crosshair, and this pair scored best overall.</li>" : "") +
        "<li>Pros (" + X.PRO.nHighlight + " with a known setting): yellow 71%, red 22%, purple 7%.</li>" +
        "<li>No controlled study links highlight color to match performance, so your own threshold test counts more than the pro split.</li></ul>" + tRows + "</div>" +
        '<div><div class="sub-t">Ranking</div><div class="sbars">' + hRows + "</div>" +
        '<details><summary>Sources</summary><ul class="src"><li>Mullen &amp; Kingdom 2002; Hansen, Pracejus &amp; Gegenfurtner 2009: red-green contrast fades fastest in peripheral vision</li><li>Kaernbach 1991, weighted up-down staircase (Percept. Psychophys. 49:227)</li><li>Wichmann &amp; Hill 2001, psychometric function fitting</li><li>Vickers, Nettelbeck &amp; Willson 1972; Breitmeyer &amp; Ogmen 2000: masked brief presentations</li><li>Garaizar &amp; Reips 2019; Anwyl-Irvine et al. 2021: browser frame timing</li><li>Machado et al. 2009: color-vision simulation</li><li>Full notes: research/highlight_color_research.md and research/vision_test_method.md</li></ul></details></div>' +
      "</div></div></section>";
  }

  app.style.setProperty("--base", REDUCED ? "0s" : (INTRO_MS / 1000) + "s");
  app.innerHTML =
    (REDUCED ? "" : '<div class="reveal" aria-hidden="true"><div><div class="rv-s">Analysis complete</div><div class="rv-t">Your settings</div><div class="rv-l"></div>' +
      '<div class="rv-chips"><span style="--i:0">Sensitivity</span><span style="--i:1">Crosshair</span><span style="--i:2">Highlight</span></div></div></div>') +
    '<div class="sum">' +
      '<div class="sum-c s1"><div class="sum-k"><b>1</b>Sensitivity</div><div class="res-head">' +
        '<h2 class="big" id="qh" tabindex="-1"><span class="n1" id="sensNum">' + sens.toFixed(3) + '</span><span class="lab">Sens</span><span class="n2"><span id="cmNum">' + f1(cm) + "</span> cm/360</span></h2>" +
        '<div class="meta">' + esc(today) + "<br>" + (R.mode === "measured" ? "Measured" : "Questionnaire") + "<br><b>" + dpi + ' DPI · eDPI <span id="eNum">' + Math.round(edpi) + "</span></b></div>" +
      "</div></div>" +
      (xc ? '<button type="button" class="sum-c s2" data-go="4"><div class="sum-k"><b>2</b>Crosshair</div><div class="sum-b"><canvas class="xh-prev" data-bg="shadow" data-z="3" width="96" height="96" aria-hidden="true"></canvas>' +
        '<div><div class="sum-v">' + XR.crosshair.color.name + " " + shapeName + '</div><code class="sum-code">' + esc(XR.crosshair.code) + "</code></div></div></button>" : skippedCard(2)) +
      (hl ? '<button type="button" class="sum-c s3" data-go="5"><div class="sum-k"><b>3</b>Highlight color</div><div class="sum-b"><canvas class="hl-prev" data-hl="' + XR.highlight.color.hex + '" width="96" height="96" aria-hidden="true"></canvas>' +
        '<div><div class="sum-v" style="color:' + XR.highlight.color.hex + '">' + esc(XR.highlight.color.name) + '</div><div class="sum-s">Settings › General › Accessibility</div></div></div></button>' : skippedCard(3)) +
    "</div>" +
    '<div class="layout">' +
      '<nav class="tabs" role="tablist" aria-label="Result sections">' +
        '<span class="tab-ind" aria-hidden="true"></span>' + TABS.map(function (t, i) { return '<button type="button" class="tab" role="tab" id="tab-' + t[1] + '" aria-controls="pane-' + t[1] + '" aria-selected="' + (i === 0) + '">' + t[0] + "</button>"; }).join("") +
      "</nav>" +
      '<div class="panes">' +
        '<section class="pane" id="pane-0" role="tabpanel" aria-labelledby="tab-0">' +
          '<div class="sec-t">Sensitivity <span>' + esc(R.reason) + "</span></div>" +
          '<div class="panel duo"><div><div class="sub-t">Distribution</div><div class="dist">' + distChart(R, cur) + "</div></div>" +
          '<div><div class="sub-t">Breakdown</div><div class="bd">' + bdCol(rowsL, 0) + bdCol(rowsR, 4) + "</div></div></div>" +
          '<div class="sec-t" style="margin-top:26px">Where you sit on the bell curve <span>sens at 800 DPI</span></div>' +
          '<div class="panel duo"><div><div class="bell chart" id="bellChart">' + bc.svg + '<div class="tt"></div></div>' +
            '<div class="legend"><span><i style="background:#2ad6b0"></i>\u00b11 SD (0.2\u20130.4)</span><span><i style="background:#2a9fd6"></i>\u00b12 SD (0.1\u20130.5)</span><span><i style="background:#fff"></i>Your target</span><span><i style="background:var(--muted)"></i>Physical model alone</span>' + (bc.cur ? '<span><i style="background:var(--yellow)"></i>Current setting</span>' : "") + (bc.staged ? '<span><i style="background:var(--teal)"></i>This run\u2019s step</span>' : "") + "</div>" +
            '<p class="bell-cap" id="bellCap">Higher sens than <b id="bellPct">' + Math.round(R.bell.percentile * 100) + "</b>% of players (percentile " + Math.round(R.bell.percentile * 100) + ")" + (R.bell.clamped ? ". Held inside the 0.1\u20130.7 range" : "") + ".</p></div>" +
          '<div><div class="sub-t">What moved you</div>' + shiftRows(R) + "</div></div>" +
        "</section>" +
        xhPane + hlPane +
        '<section class="pane" id="pane-1" role="tabpanel" aria-labelledby="tab-1" hidden>' +
          '<div class="sec-t">Model <span>estimated extra time per engagement</span></div><div class="panel">' +
          '<div class="chart" id="costChart">' + cc.svg + '<div class="tt"></div></div>' +
          '<div class="legend"><span><i style="background:var(--ink)"></i>Total</span><span><i style="background:#2a9fd6"></i>Precision</span><span><i style="background:var(--yellow)"></i>Speed / slow flicks</span><span><i style="background:var(--pink)"></i>Pad / reach</span><span><i style="background:var(--teal)"></i>Your result</span></div>' +
          '<div class="math">small correction  t_sub·(1−p)/p,  p = erf(W / 2√2·σ0)     σ0 = ' + (pr.sigma * 10).toFixed(2) + " mm\ntarget switch     0.50 s × 0.035 × log2(C / " + f1(pr.cFlick) + ")²\nbig turns         0.30 s·lifts + 0.06 s·P(travel > " + f1(pr.reach) + " cm) + speed limit\ntracking          t_track·(p∞/p − 1),  angular error = √((360·σT/C)² + (k·ω·τ)²)   ω = " + pr.omega.toFixed(1) + "°/s\nusable pad " + f1(pr.usable) + " cm · averaged over " + R.nScenarios + " assumption sets · minimum " + f1(R.cModel) + " cm</div>" +
          '<ul class="notes"><li><b>Task mix:</b> ' + mixTxt + ".</li>" + (R.agents ? "<li><b>Agents:</b> " + agentTxt + "</li>" : "") +
          "<li><b>Your current setting:</b> " + anchorTxt + "</li>" +
          "<li><b>What costs time at your result:</b> " + driveTxt + ". <b>Hand modifiers:</b> " + modTxt + ". <b>Optimum spread</b> across assumption sets: " + f1(R.optimumSpread[0]) + "–" + f1(R.optimumSpread[1]) + " cm.</li>" +
          "<li><b>Not used:</b> surface type and match stats. Neither shows whether a sensitivity suits your hand.</li></ul>" +
          '<p class="callout">Unvalidated estimate. The biggest uncertainty is the hand noise floor, which is why the result averages over its plausible range. Pro settings are for comparison only.</p>' +
          '<details><summary>Sources</summary><ul class="src">' +
          '<li>Boudaoud, Spjut &amp; Kim (NVIDIA), Mouse Sensitivity in First-Person Targeting Tasks, IEEE ToG 2023: <a href="https://arxiv.org/abs/2203.12050" target="_blank" rel="noopener">arXiv 2203.12050</a></li>' +
          "<li>Casiez et al. 2008, CD gain and pointing; Chapuis &amp; Dragicevic 2011, small-scale pointing; Meyer et al. 1988, submovements</li>" +
          '<li>Agents: <a href="https://wiki.playvalorant.com" target="_blank" rel="noopener">Riot\'s official wiki</a>. Pro settings: <a href="https://prosettings.net/lists/valorant/" target="_blank" rel="noopener">ProSettings.net</a>; roles: <a href="https://www.vlr.gg" target="_blank" rel="noopener">VLR.gg</a></li>' +
          "</ul></details></div>" +
        "</section>" +
        '<section class="pane" id="pane-2" role="tabpanel" aria-labelledby="tab-2" hidden>' +
          '<div class="sec-t">Vs pros <span>' + M.PRO_STATS.n + " VCT 2026 players · comparison only</span></div><div class=\"panel\">" +
          '<div class="chart" id="proChart">' + proChart(R) + '<div class="tt"></div></div>' +
          '<div class="scroll-x" style="margin-top:14px"><table><thead><tr><th>Closest pros</th><th>Role</th><th class="n">cm/360</th><th class="n">eDPI</th></tr></thead><tbody>' + near + "</tbody></table></div></div>" +
        "</section>" +
        '<section class="pane" id="pane-3" role="tabpanel" aria-labelledby="tab-3" hidden>' +
          '<div class="sec-t">Test plan <span>2–4 weeks</span></div><div class="panel">' +
          '<table><thead><tr><th>Candidate</th><th class="n">cm/360</th><th class="n">Sens @ ' + dpi + "</th></tr></thead><tbody>" + tests + "</tbody></table>" +
          '<ol class="plan"><li><b>Clean input.</b> Turn off "Enhance pointer precision" and any acceleration, and keep your DPI fixed.</li>' +
          "<li><b>Test all three</b> on the same Range or aim-trainer drills. Rotate the order so warm-up doesn't favor one.</li>" +
          "<li><b>Reach check.</b> From the middle of your pad, one comfortable swipe should turn you about 90°.</li>" +
          "<li><b>Commit.</b> Gain changes are learned quickly, within a session or a few days (Krakauer et al. 2000; NVIDIA's players settled within about 250 trials), but switching back and forth slows it down. Stay on one value for several sessions before judging. The 5–10% step size is a rule of thumb, not a measured value.</li></ol>" +
          '<div class="sub-t" style="margin-top:22px">DPI</div><p class="tip" style="font-size:14px;color:var(--muted)">' + esc(R.dpiAdvice ? R.dpiAdvice.text : "") + "</p>" +
          '<div class="sub-t" style="margin-top:22px">Scoped and ADS</div><p class="tip" id="scopedTxt" style="font-size:14px;color:var(--muted)">' + scopedTxt + "</p>" + statsHtml + "</div>" +
        "</section>" +
      "</div>" +
      '<aside class="side">' +
        '<div class="sec-t">Confidence</div>' +
        '<div class="panel"><div class="badge-wrap"><div class="badge" aria-label="Confidence: ' + esc(conf.label) + '">' + badgeTxt + "</div></div>" +
          '<div class="gauge" aria-hidden="true"><span style="left:' + gaugePos(R.lo) + '%">' + Math.round(R.lo) + '</span><span style="left:' + gaugePos(R.hi) + '%">' + Math.round(R.hi) + '</span><i style="left:' + gaugePos(cm) + '%"></i></div>' +
          '<p class="badge-cap">' + badgeCap + "</p></div>" +
        '<div class="sec-t">Settings</div>' +
        '<div class="panel"><div class="acc">' +
          '<div class="acc-r" style="--i:0"><span class="ic">' + ICON.mouse + '</span><span class="t">Sensitivity <b id="accSens">' + sens.toFixed(3) + "</b><small>at " + dpi + " DPI</small></span></div>" +
          '<div class="acc-r" style="--i:1"><span class="ic">' + ICON.ruler + '</span><span class="t">cm/360 <b id="accCm">' + f1(cm) + "</b><small>range " + f1(R.lo) + "–" + f1(R.hi) + "</small></span></div>" +
          (R.dpiAdvice ? '<div class="acc-r' + (R.dpiAdvice.level === "skip" ? " warnr" : "") + '" style="--i:1.5"><span class="ic">' + ICON.mouse + '</span><span class="t">DPI <b>' + dpi + "</b><small>" + (R.dpiAdvice.suggest ? "Try " + R.dpiAdvice.suggest.dpi + " at sens " + R.dpiAdvice.suggest.sens.toFixed(3) : R.dpiAdvice.level === "high" ? "800–1600 is enough" : "No pixel skipping") + "</small></span></div>" : "") +
          '<div class="acc-r" style="--i:2"><span class="ic">' + ICON.scope + '</span><span class="t">Scoped <b>1.00</b><small>' + scopedShort + "</small></span></div>" +
          '<div class="acc-r" style="--i:3"><span class="ic">' + ICON.scope + '</span><span class="t">ADS <b>1.00</b><small>' + adsShort + "</small></span></div>" +
          (xc ? '<div class="acc-r" style="--i:4"><span class="ic">' + ICON.cross + '</span><span class="t">Crosshair <b>' + XR.crosshair.color.name + '</b><small>' + shapeName + ", code in the Crosshair tab</small></span></div>" : "") +
          (S.prior ? '<div class="acc-r" style="--i:6"><span class="ic">' + ICON.down2 + '</span><span class="t">Sessions <b>' + (S.prior.length + 1) + "</b><small>" + (S.prior[0].manual && S.prior.length === 1 ? "last results entered by hand" : "pooled test data, from " + esc(S.prior[0].manual ? "entered by hand" : fmtDate(S.prior[0].date))) + "</small></span></div>" : "") +
          (hl ? '<div class="acc-r" style="--i:5"><span class="ic"><i class="sw" style="background:' + XR.highlight.color.hex + ';margin:0"></i></span><span class="t">Highlight <b>' + XR.highlight.color.short + '</b><small>' + esc(XR.highlight.color.name) + "</small></span></div>" : "") +
        "</div>" +
        '<button type="button" class="btn primary dl" id="download">' + ICON.down2 + "Download results</button>" +
        '<p class="dl-s">Saves a results file to your device (sessions in it: ' + ((S.prior ? S.prior.length : 0) + 1) + '). Import it on the first screen next time to pool this run with the next one.</p>' +
        '<div class="actions"><button type="button" class="btn small" id="copy">Copy</button><button type="button" class="btn small" id="edit">Edit</button><button type="button" class="btn small" id="reset">Restart</button></div>' +
        '<p class="toast" id="toast" role="status"></p></div>' +
      "</aside>" +
    "</div>";

  countUp(document.getElementById("sensNum"), sens, 3, 1100, INTRO_MS);
  countUp(document.getElementById("cmNum"), cm, 1, 1100, INTRO_MS);
  countUp(document.getElementById("eNum"), edpi, 0, 1100, INTRO_MS);
  countUp(document.getElementById("accSens"), sens, 3, 1100, INTRO_MS + 900);
  countUp(document.getElementById("accCm"), cm, 1, 1100, INTRO_MS + 900);
  // Bell chart: curve draws in, bands grow, markers drop (CSS under .pane.play), percentile counts up. Replays on every tab open.
  var bellBase = REDUCED ? 0 : INTRO_MS / 1000;
  function playBell(base) {
    var pane = document.getElementById("pane-0"), n = document.getElementById("bellPct");
    drawLines(pane.querySelector("#bellChart"), base);
    if (n) countUp(n, Math.round(R.bell.percentile * 100), 0, 1000, (base + 0.9) * 1000);
  }
  var firstPane = app.querySelector(".pane:not([hidden])");
  firstPane.classList.add("play");
  playBell(bellBase);
  var tabs = app.querySelectorAll(".tab"), ind = app.querySelector(".tab-ind");
  function placeInd() {
    var on = app.querySelector('.tab[aria-selected="true"]');
    if (!on || !ind) return;
    ind.style.width = on.offsetWidth + "px"; ind.style.height = on.offsetHeight + "px";
    ind.style.transform = "translate(" + on.offsetLeft + "px," + on.offsetTop + "px)";
    ind.classList.add("on");
  }
  requestAnimationFrame(placeInd); window.addEventListener("resize", placeInd);
  function showPane(i) {
    tabs.forEach(function (u, j) {
      var pane = document.getElementById("pane-" + TABS[j][1]);
      u.setAttribute("aria-selected", String(i === j));
      clearTimeout(pane._lt);
      if (i === j) {
        pane.hidden = false; pane.classList.remove("leave");
        pane.classList.remove("play"); void pane.offsetWidth; pane.classList.add("play"); drawLines(pane);
        if (pane.id === "pane-0") playBell(0);
      } else if (!pane.hidden && !pane.classList.contains("leave")) {
        if (REDUCED) { pane.hidden = true; pane.classList.remove("play"); } else { pane.classList.add("leave"); pane._lt = setTimeout(function () { pane.hidden = true; pane.classList.remove("leave", "play"); }, 170); }
      }
    });
    placeInd();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { showPane(i); });
    t.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault(); var n = tabs[(i + (e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length]; n.click(); n.focus();
    });
  });
  wireCostHover(document.getElementById("costChart"), R, cc);
  wireBellHover(document.getElementById("bellChart"), R, bc);
  var xCfg = xc ? X.decode(xc.code) : null, hHex = hl ? hl.color.hex : null;
  drawPreviews(xCfg, hHex, REDUCED ? 0 : INTRO_MS + 300);
  setTimeout(function () { app.style.setProperty("--base", "0s"); }, INTRO_MS + 2000);
  app.querySelectorAll(".sum-c[data-go]").forEach(function (b) { b.addEventListener("click", function () { var t = document.getElementById("tab-" + b.getAttribute("data-go")); if (t) t.click(); }); });
  app.querySelectorAll(".add-part").forEach(function (b) { b.addEventListener("click", function () { addPart(+b.getAttribute("data-part")); }); });
  tabs.forEach(function (t) { t.addEventListener("click", function () { requestAnimationFrame(function () { drawPreviews(xCfg, hHex, 120); }); }); });
  app.querySelectorAll(".copy-code").forEach(function (b) {
    b.addEventListener("click", function () {
      var code = b.getAttribute("data-code"), t = document.getElementById("toast");
      b.classList.remove("flash"); void b.offsetWidth; b.classList.add("flash");
      try { navigator.clipboard.writeText(code).then(function () { t.textContent = "Crosshair code copied."; }, function () { t.textContent = code; }); } catch (e) { t.textContent = code; }
    });
  });
  wireDotHover(document.getElementById("proChart"));
  var line = "Valorant: " + dpi + " DPI, sens " + sens.toFixed(3) + " (eDPI " + Math.round(edpi) + ", " + f1(cm) + " cm/360)" + (xc ? "\nCrosshair: " + XR.crosshair.code : "") + (hl ? "\nEnemy highlight: " + XR.highlight.color.name : "");
  document.getElementById("copy").addEventListener("click", function () {
    var t = document.getElementById("toast");
    try { navigator.clipboard.writeText(line).then(function () { t.textContent = "Copied."; }, function () { t.textContent = line; }); } catch (e) { t.textContent = line; }
  });
  document.getElementById("download").addEventListener("click", function () {
    var t = document.getElementById("toast");
    try { var b = downloadResults(R, XR, sens, dpi); t.textContent = "Saved " + V.fileName(b) + "."; } catch (e) { t.textContent = "Download failed: " + e.message; }
  });
  document.getElementById("edit").addEventListener("click", function () { currentId = "dpi"; renderQ("back"); focusH(); });
  document.getElementById("reset").addEventListener("click", function () { S = freshState(); currentId = "dpi"; renderQ("back"); focusH(); });
  focusH();
}

