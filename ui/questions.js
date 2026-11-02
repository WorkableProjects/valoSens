"use strict";
// Choice lists use the fixed key order; labels come from the model's tables when present.
var CHOICE_FALLBACK = {
  region: [["na", "North America"], ["latam", "Latin America"], ["br", "Brazil"], ["eu", "Europe"], ["mena", "Middle East & North Africa"], ["kr", "Korea"], ["jp", "Japan"], ["cn", "China"], ["sea", "Southeast Asia"], ["oce", "Oceania"], ["unsure", "Prefer not to say"]],
  age: [["u16", "Under 16"], ["16_19", "16–19"], ["20_24", "20–24"], ["25_29", "25–29"], ["30_34", "30–34"], ["35p", "35+"], ["unsure", "Prefer not to say"]],
  glasses: [["none", "No glasses"], ["glasses", "Glasses"], ["contacts", "Contact lenses"], ["unsure", "Prefer not to say"]]
};
function tableChoices(key, table) {
  return CHOICE_FALLBACK[key].map(function (kv) { var t = table && table[kv[0]]; return { v: kv[0], l: esc((t && t.label) || kv[1]) }; });
}
var RANKS = [["unsure", "Not sure / unranked"], ["iron", "Iron"], ["bronze", "Bronze"], ["silver", "Silver"], ["gold", "Gold"], ["plat", "Platinum"], ["diamond", "Diamond"], ["asc", "Ascendant"], ["imm", "Immortal"], ["rad", "Radiant"]];

var Q = [
  { id: "dpi", part: 1, sec: "Your sensitivity", title: "What DPI is your mouse set to?",
    why: "Your mouse software shows this. It converts the result into the number you type into Valorant.",
    uses: "Converts cm/360 into in-game sensitivity.",
    show: function () { return true; },
    render: function (h) {
      var box = el("div");
      function sync() { box.innerHTML = ""; if (S.dpiSel === "other") numField(box, "Your DPI", "dpiCustom", "e.g. 3200"); }
      choices(h, "dpiSel", [{ v: "400", l: "400" }, { v: "800", l: "800", s: "Most common among pros" }, { v: "1600", l: "1600" }, { v: "other", l: "Another number" }, { v: "unsure", l: "Not sure", s: "We'll assume 800" }], 2, sync);
      h.appendChild(box); sync();
    },
    valid: function () { var d = getDpi(); return d >= 100 && d <= 32000; } },

  { id: "cur", part: 1, sec: "Your sensitivity", title: "What sensitivity do you use now?",
    why: "If your current setting is already in the near-optimal range, the result keeps it. Otherwise the result moves only as far as it needs to.",
    uses: "The result is the near-optimal setting closest to this one.",
    show: function () { return true; },
    render: function (h) {
      var box = el("div");
      function sync() {
        box.innerHTML = "";
        if (S.curMode === "val") numField(box, "Valorant sensitivity <small>(Settings › General › Mouse)</small>", "cur", "e.g. 0.35");
        if (S.curMode === "cm") {
          numField(box, "Measured cm/360", "measured", "e.g. 46");
          box.appendChild(el("p", { "class": "tip" }, "To measure it, line your crosshair up on a landmark, slide the mouse in a straight line until you've turned exactly 360°, and measure the distance."));
        }
        if (S.curMode === "other") {
          box.appendChild(el("label", { "class": "f", "for": "og" }, "Game"));
          var sel = el("select", { id: "og" }, '<option value="cs2">Counter-Strike 2</option><option value="apex">Apex Legends</option><option value="ow2">Overwatch 2</option>');
          sel.value = S.otherGame; sel.addEventListener("change", function () { S.otherGame = sel.value; refreshNav(); });
          box.appendChild(sel);
          numField(box, "Sensitivity in that game <small>(same DPI)</small>", "otherSens", "e.g. 1.2");
        }
      }
      choices(h, "curMode", [
        { v: "val", l: "I know my Valorant sens" }, { v: "cm", l: "I know my cm/360" },
        { v: "other", l: "I'll convert from another game" }, { v: "none", l: "I'm new / starting fresh", s: "The model alone decides" }], 2, sync);
      h.appendChild(box); sync();
    },
    valid: function () { return S.curMode === "none" || (S.curMode !== null && currentCm() > 3 && currentCm() < 400); } },

  { id: "sat", part: 1, sec: "Your sensitivity", title: "How well does that sensitivity work for you?",
    why: "Comfort is a reason to move less, but it isn't a measurement of accuracy. Even at 5, the result still moves if the model is confident you'd gain.",
    uses: "Raises the re-adaptation cost of changing, from 1× (rating 1) up to at most 2× (rating 5), so steps are smaller.",
    show: function () { return S.curMode && S.curMode !== "none"; },
    render: function (h) {
      var i = el("input", { type: "range", min: "1", max: "5", step: "1", "aria-label": "Satisfaction from 1 to 5" });
      i.value = S.sat;
      var out = el("p", { "class": "tip", role: "status" });
      function sync(tick) {
        out.innerHTML = 'Selected: <b class="tn">' + S.sat + "</b> of 5";
        if (tick && !REDUCED) { var n = out.firstElementChild || out.querySelector(".tn"); n.classList.remove("tick"); void n.offsetWidth; n.classList.add("tick"); }
      }
      i.addEventListener("input", function () { S.sat = parseInt(i.value, 10); sync(true); });
      h.appendChild(i);
      h.appendChild(el("div", { "class": "ends" }, "<span>1: I fight it constantly</span><span>5: It feels natural</span>"));
      h.appendChild(out); sync();
    },
    valid: function () { return true; } },

  { id: "pad", part: 1, sec: "Your mousepad setup", title: "How wide is the area your mouse can glide on?",
    why: "Measure the usable width left to right in cm. A rough number is fine.",
    uses: "Usable travel = width − mouse width. Expected lifts depend on where your hand starts and how far it has to go.",
    show: function () { return true; },
    render: function (h) {
      var box = el("div");
      function sync() { box.innerHTML = ""; if (S.padSel === "other") numField(box, "Width in cm", "padCustom", "e.g. 50"); }
      choices(h, "padSel", [
        { v: "25", l: "About 25 cm", s: "Small pad" }, { v: "36", l: "About 36 cm", s: "Medium pad" },
        { v: "45", l: "About 45 cm", s: "Large pad, most common" }, { v: "49", l: "About 49 cm", s: "Large/XL square, common among pros" },
        { v: "90", l: "About 90 cm", s: "Desk mat" }, { v: "other", l: "Enter exact width" }], 2, sync);
      h.appendChild(box); sync();
    },
    valid: function () { var p = getPad(); return p >= 12 && p <= 200; } },

  { id: "limb", part: 1, sec: "Your mousepad setup", title: "Which joint does most of your aiming?",
    why: "Quick test: swipe as if turning 90°. If your forearm stays planted and your hand pivots, that's wrist. If your elbow slides, that's forearm. If your shoulder moves too, that's arm.",
    uses: "Estimates how far you can move comfortably before a bigger joint takes over (about 2.5 cm each way for wrist, 10 cm for arm, mixed styles in between). This is a rough estimate with wide uncertainty.",
    show: function () { return true; },
    render: function (h) {
      choices(h, "limb", [
        { v: "wrist", l: "Wrist", s: "Forearm stays planted" },
        { v: "wf", l: "Wrist + forearm", s: "Wrist for small moves, forearm for big ones" },
        { v: "forearm", l: "Forearm / elbow", s: "Pivoting from the elbow" },
        { v: "arm", l: "Whole arm", s: "Shoulder involved, wrist mostly still" },
        { v: "unsure", l: "Not sure", s: "Uses wrist + forearm and widens the range" }]);
    },
    valid: function () { return !!S.limb; } },

  { id: "mouse", part: 1, sec: "Your mousepad setup", title: "How do you hold your mouse, and how heavy is it?",
    why: "Both are optional. A raised-palm grip and a lighter mouse make lifting and re-centring quicker, which makes slower settings cheaper. Finger control is not more precise than wrist control (Balakrishnan & MacKenzie 1997).",
    uses: "Grip and weight scale the time lost per mouse lift and the peak hand speed (estimates around the 60 g pro median). Leave both on \"Not sure\" to skip.",
    show: function () { return true; },
    render: function (h) {
      h.appendChild(el("div", { "class": "sub-t" }, "Grip"));
      choices(h, "grip", [{ v: "palm", l: "Palm" }, { v: "claw", l: "Claw" }, { v: "fingertip", l: "Fingertip" }, { v: "unsure", l: "Not sure" }], 2);
      h.appendChild(el("div", { "class": "sub-t" }, "Mouse weight"));
      choices(h, "mouseW", [{ v: "light", l: "Under 55 g" }, { v: "mid", l: "55–70 g", s: "Pro median ~60 g" }, { v: "heavy", l: "70–90 g" }, { v: "xheavy", l: "Over 90 g" }, { v: "unsure", l: "Not sure" }], 2);
    },
    valid: function () { return true; } },

  { id: "role", part: 1, sec: "Your role", title: "What role do you play most?",
    why: "Roles differ a little in their mix of small corrections, target switches and big turns. There's no solid evidence for bigger role effects, so the effect is kept small.",
    uses: "Nudges the assumed task mix by a few percent.",
    show: function () { return true; },
    render: function (h) {
      choices(h, "role", [
        { v: "d", l: "Duelist", s: "Entry, lots of swings and flicks" },
        { v: "i", l: "Initiator", s: "Flash, clear and trade" },
        { v: "c", l: "Controller", s: "Smokes, lurks, mid-range holds" },
        { v: "s", l: "Sentinel", s: "Anchors and holds angles" },
        { v: "f", l: "Flex / fill", s: "A mix of everything" }], 2);
    },
    valid: function () { return !!S.role; } },

  { id: "agents", part: 1, sec: "Your role", title: "Which agents do you play most?",
    why: "Agents change what your aim has to do. Teleports and dashes mean fast re-orientation, anchors hold angles, and Chamber or Operator players spend more time scoped. Pick your main first. Leave the others blank if you one-trick.",
    uses: "Builds your task mix from each agent's abilities, replacing the role average. Agents are weighted 50/30/20 (rescaled if you pick fewer). It also sets the scoped-multiplier advice.",
    show: function () { return true; },
    render: function (h) {
      var groups = {};
      M.AGENT_LIST.forEach(function (a) { (groups[a.role] = groups[a.role] || []).push(a); });
      var opts = '<option value="">None</option>' + ["d", "i", "c", "s"].map(function (r) {
        return '<optgroup label="' + M.ROLE[r].label + 's">' + (groups[r] || []).map(function (a) { return '<option value="' + a.name + '">' + a.name + "</option>"; }).join("") + "</optgroup>";
      }).join("");
      var row = el("div", { "class": "row" });
      [["agent1", "Main agent"], ["agent2", "Second <small>(optional)</small>"], ["agent3", "Third <small>(optional)</small>"]].forEach(function (f) {
        var box = el("div");
        box.appendChild(el("label", { "class": "f", "for": "in-" + f[0] }, f[1]));
        var sel = el("select", { id: "in-" + f[0] }, opts);
        sel.value = S[f[0]];
        sel.addEventListener("change", function () { S[f[0]] = sel.value; refreshNav(); });
        box.appendChild(sel); row.appendChild(box);
      });
      h.appendChild(row);
      h.appendChild(el("p", { "class": "tip" }, "Not sure or play everyone? Leave the main agent as None, and your role answer is used instead."));
    },
    valid: function () { return true; } },

  { id: "weapon", part: 1, sec: "Your role", title: "Which weapon do you use most?",
    why: "Snipers fight at longer range, which needs finer control. SMGs and shotguns fight close up, where heads are bigger on screen and fights involve more flicking.",
    uses: "Sets typical fight distance (10, 20 or 30 m). Smaller targets on screen shift the flick optimum slightly slower, using the size of the effect NVIDIA measured.",
    show: function () { return true; },
    render: function (h) {
      choices(h, "weapon", [
        { v: "rifle", l: "Rifles", s: "Vandal / Phantom" },
        { v: "sniper", l: "Operator / Marshal / Outlaw" },
        { v: "close", l: "SMG / shotgun", s: "Close-range buys" }], 3);
    },
    valid: function () { return !!S.weapon; } },

  { id: "region", part: 1, sec: "About you", title: "Where do you play from?",
    why: "Regional pro trends in sensitivity differ a little (setup, desk space, scene habits). This is optional: \"Prefer not to say\" adds no shift.",
    uses: "Moves your spot on the sensitivity bell curve by a small, researched amount. Never stored or sent anywhere.",
    show: function () { return true; },
    render: function (h) { choices(h, "region", tableChoices("region", M.REGION), 2); },
    valid: function () { return !!S.region; } },

  { id: "age", part: 1, sec: "About you", title: "How old are you?",
    why: "Fine motor control and hand speed shift slowly with age, and pro sensitivities trend with it. Optional: \"Prefer not to say\" adds no shift.",
    uses: "A small shift along the sensitivity bell curve. The research behind each group is listed in \"What moved you\" after your result.",
    show: function () { return true; },
    render: function (h) { choices(h, "age", tableChoices("age", M.AGE), 2); },
    valid: function () { return !!S.age; } },

  { id: "glasses", part: 1, sec: "About you", title: "Do you wear glasses or contacts when you play?",
    why: "Vision correction can change how you see and track targets on screen. Optional: \"Prefer not to say\" adds no shift.",
    uses: "A small shift along the sensitivity bell curve, shown in \"What moved you\" after your result.",
    show: function () { return true; },
    render: function (h) { choices(h, "glasses", tableChoices("glasses", M.GLASSES), 2); },
    valid: function () { return !!S.glasses; } },

  { id: "statsGate", part: 1, sec: "Your stats", title: "Add your season stats?",
    why: "Stats depend on role, teammates and game sense, so they can't show whether your sensitivity suits your hand. They're kept as a before snapshot only.",
    uses: "Not used in the calculation. They're shown next to typical values for your rank.",
    show: function () { return true; },
    render: function (h) {
      choices(h, "statsGate", [{ v: "yes", l: "Yes, add stats", s: "About a minute with a tracker open" }, { v: "no", l: "Skip", s: "You'll still get a full result" }], 2);
    },
    valid: function () { return !!S.statsGate; } },

  { id: "stats", part: 1, sec: "Your stats", title: "Enter your stats for this season",
    why: "Fill in what you have. Compare the same stats after 2–4 weeks on the new setting.",
    uses: "HS%, K/D and ADR are compared with typical values for your rank.",
    show: function () { return S.statsGate === "yes"; },
    render: function (h) {
      var r0 = el("div", { "class": "row" }), rb = el("div");
      rb.appendChild(el("label", { "class": "f", "for": "in-rank" }, "Current rank"));
      var sel = el("select", { id: "in-rank" }, RANKS.map(function (r) { return '<option value="' + r[0] + '">' + r[1] + "</option>"; }).join(""));
      sel.value = S.stRank; sel.addEventListener("change", function () { S.stRank = sel.value; });
      rb.appendChild(sel); r0.appendChild(rb);
      numField(r0, "Matches played", "stMatches", "e.g. 60");
      h.appendChild(r0);
      var r1 = el("div", { "class": "row" });
      numField(r1, "Headshot %", "stHs", "e.g. 24");
      numField(r1, "K/D", "stKd", "e.g. 1.1");
      numField(r1, "ADR", "stAdr", "e.g. 135");
      h.appendChild(r1);
      var det = el("details", null, "<summary>Or paste text from your tracker</summary>");
      det.appendChild(el("p", null, "Paste your tracker's stats summary. We'll fill in any fields we recognize, and you can check them above. Nothing is uploaded."));
      var ta = el("textarea", { "aria-label": "Pasted stats text", placeholder: "Headshot % 24.1  K/D 1.12  ADR 138  Matches 61" });
      ta.value = S.stPaste; ta.addEventListener("input", function () { S.stPaste = ta.value; });
      var btn = el("button", { type: "button", "class": "btn small" }, "Fill from text");
      var msg = el("p", { "class": "tip", role: "status", id: "pasteMsg" });
      btn.addEventListener("click", function () {
        var n = parseStats(S.stPaste || "");
        if (!n) { msg.textContent = "We didn't recognize any stats in that text."; return; }
        renderQ(); var m2 = document.getElementById("pasteMsg"); if (m2) m2.textContent = "Filled " + n + " field" + (n > 1 ? "s" : "") + ". Check them above.";
      });
      det.appendChild(ta); det.appendChild(btn); det.appendChild(msg);
      h.appendChild(det);
    },
    valid: function () { return okRange(S.stHs, 0, 100) && okRange(S.stKd, 0, 10) && okRange(S.stAdr, 0, 400) && okRange(S.stMatches, 0, 5000); } },

  /* ---------- Part 2: Crosshair ---------- */
  { id: "cvd", part: 2, sec: "Color vision", title: "Do you have any color blindness?",
    why: "About 8% of men and 0.5% of women have red-green color blindness. It changes which crosshair and enemy colors stay visible.",
    uses: "Every color is scored as your type of color vision sees it (a published simulation, Machado et al. 2009). Red-green also rules out green, yellow green and red crosshairs. Used in Parts 2 and 3.",
    show: function () { return !(S.xSkip && S.hSkip); },
    render: function (h) {
      choices(h, "cvd", [
        { v: "none", l: "No" },
        { v: "deutan", l: "Red-green: deutan", s: "Greens look weak. The most common type" },
        { v: "protan", l: "Red-green: protan", s: "Reds look dark or dull" },
        { v: "rg", l: "Red-green, type unknown" },
        { v: "tritan", l: "Blue-yellow: tritan", s: "Very rare" },
        { v: "unsure", l: "Not sure", s: "Treated as no. The tests later still check what you see" }], 2);
    },
    valid: function () { return !!S.cvd; } },

  { id: "exp", part: 2, sec: "Your experience", title: "How long have you played tactical shooters?",
    why: "Newer players can use a crosshair that reacts to movement as a reminder to stop before shooting. Experienced players are better off with a static one.",
    uses: "Decides whether movement error is suggested as a training aid. It also scales the hand-noise estimate in the sensitivity model (newer hands are assumed noisier, which favors slightly slower settings).",
    show: function () { return true; },
    render: function (h) {
      choices(h, "exp", [{ v: "new", l: "Under 6 months" }, { v: "mid", l: "6 months to 2 years" }, { v: "exp", l: "2+ years" }, { v: "comp", l: "Competitive", s: "Diamond+ or organized play" }], 2);
    },
    valid: function () { return !!S.exp; } },

  { id: "moving", part: 2, sec: "Your experience", title: "Do you often shoot while still moving?",
    why: "In Valorant, shots fired while moving are inaccurate. If you often shoot on the move, crosshair lines that spread while you move give you instant feedback.",
    uses: "\"Often\" turns on movement error as a temporary training aid. Otherwise all error lines stay off, like 99% of pros.",
    show: function () { return (S.exp === "new" || S.exp === "mid") && !S.xSkip; },
    render: function (h) {
      choices(h, "moving", [{ v: "still", l: "No, I stop or counter-strafe" }, { v: "moving", l: "Yes, often" }, { v: "unsure", l: "Not sure" }]);
    },
    valid: function () { return !!S.moving; } },

  { id: "aim", part: 2, sec: "Your aim", title: "How do you mostly aim?",
    why: "Flick and tap players want a small, precise point. Players who track or spray benefit from lines that stay visible around a moving target.",
    uses: "Sets line length: about 2–3 for flicking, 4–5 for tracking. This is a heuristic; no study has measured it.",
    show: function () { return !S.xSkip; },
    render: function (h) {
      choices(h, "aim", [{ v: "flick", l: "Flicks and taps", s: "Snap to the head, 1–2 bullets" }, { v: "track", l: "Tracking and spraying", s: "Follow targets, longer bursts" }, { v: "mix", l: "A mix / not sure" }], 3);
    },
    valid: function () { return !!S.aim; } },

  { id: "shape", part: 2, sec: "Your aim", title: "Which crosshair shape do you prefer?",
    why: "57% of pros use a small cross, 26% a dot, 11% a cross with a dot. Shape is mostly preference, so pick what you like if you already know.",
    uses: "Sets the shape. \"No preference\" picks a cross sized for your aim style.",
    show: function () { return !S.xSkip; },
    render: function (h) {
      choices(h, "shape", [{ v: "small", l: "Small cross" }, { v: "medium", l: "Bigger cross" }, { v: "dot", l: "Dot only" }, { v: "crossDot", l: "Cross + dot" }, { v: "any", l: "No preference" }], 2);
    },
    valid: function () { return !!S.shape; } },

  { id: "lose", part: 2, sec: "Visibility", title: "When do you lose track of your crosshair?",
    why: "A white or yellow crosshair washes out on bright, sandy walls. A dark outline adds the contrast the color alone lacks.",
    uses: "Weights those scenes more when each color's contrast is computed. \"Bright maps\" also turns outlines on at full opacity.",
    show: function () { return !S.xSkip; },
    render: function (h) {
      choices(h, "lose", [{ v: "bright", l: "On bright maps", s: "Breeze, Bind, Sunset" }, { v: "dark", l: "In dark corners" }, { v: "util", l: "In smokes and utility" }, { v: "never", l: "Rarely or never" }], 2);
    },
    valid: function () { return !!S.lose; } },

  { id: "res", part: 2, sec: "Visibility", title: "What resolution do you play at?",
    why: "Crosshair values are in screen pixels, so the same numbers look smaller at higher resolutions.",
    uses: "Scales line length, gap and thickness by 1.33 for 1440p and 2 for 4K. Stretched 4:3 shortens the lines by 1.",
    show: function () { return !S.xSkip; },
    render: function (h) {
      choices(h, "res", [{ v: "1080", l: "1920×1080", s: "Most common" }, { v: "1440", l: "2560×1440" }, { v: "2160", l: "3840×2160 (4K)" }, { v: "stretched", l: "4:3 stretched" }], 2);
    },
    valid: function () { return !!S.res; } },

  { id: "vis", part: 2, sec: "Visibility test", title: "Which crosshair can you see instantly?",
    why: "Eight rounds, four crosshairs each, over different map scenes. Pick the one you spot without searching. They're drawn at real pixel size for your resolution, in random order. Sit as you normally play.",
    uses: "Your picks are fitted with a choice model (each pick beats the others shown), giving a score for each color, outlines and shape. Optional: skip it and the computed visibility decides.",
    show: function () { return !S.xSkip; },
    render: function (h) { visTest(h); },
    valid: function () { return true; } },

  /* ---------- Part 3: Highlight color ---------- */
  { id: "hCur", part: 3, sec: "Enemy highlight", title: "Which enemy highlight color do you use now?",
    why: "Settings › General › Accessibility › Enemy Highlight Color. It recolors the outline around enemies.",
    uses: "If you'd rather keep it, it gets a small bonus. Color vision, maps, utility and the test can still outweigh it.",
    show: function () { return !S.hSkip; },
    render: function (h) {
      choices(h, "hCur", [{ v: "red", l: "Red (Default)" }, { v: "yd", l: "Yellow (Deuteranopia)" }, { v: "yp", l: "Yellow (Protanopia)" }, { v: "purple", l: "Purple (Tritanopia)" }, { v: "unsure", l: "Not sure" }], 2);
      toggle(h, "hKeep", "I'd rather keep it unless there's a clear reason to switch");
    },
    valid: function () { return !!S.hCur; } },

  { id: "hMaps", part: 3, sec: "Enemy highlight", title: "Where do you lose sight of enemies most?",
    why: "Yellow is the brightest option and pops in shadows, but it's close in brightness to sandy walls. Purple separates from warm light but sits close to blue maps.",
    uses: "Weights that scene more when each color's contrast is computed (as your color vision sees it).",
    show: function () { return !S.hSkip; },
    render: function (h) {
      choices(h, "hMaps", [{ v: "warm", l: "Bright, warm maps", s: "Breeze, Bind, Sunset" }, { v: "dark", l: "Dark corners and shadows", s: "Split, Abyss, Lotus interiors" }, { v: "cool", l: "Cool, blue maps", s: "Icebox, Pearl" }, { v: "none", l: "No pattern" }], 2);
    },
    valid: function () { return !!S.hMaps; } },

  { id: "hClutter", part: 3, sec: "Enemy highlight", title: "Which utility clutters your screen most?",
    why: "An outline that shares a hue with utility blends in exactly when enemies peek through it. Pick any that apply.",
    uses: "Adds that utility to the scenes each color is compared against, so a color that matches it loses contrast.",
    show: function () { return !S.hSkip; },
    render: function (h) {
      [["fire", "Fire and orange", "Phoenix, Brimstone, Breach"], ["purple", "Purple smokes and blinds", "Omen, Reyna, Astra, Clove, Fade"], ["yellow", "Yellow utility", "Killjoy, Raze, Gekko, Tejo"]].forEach(function (o) {
        toggleChoice(h, o[0], o[1], o[2]);
      });
      h.appendChild(el("p", { "class": "tip" }, "None of these? Just press Next."));
    },
    valid: function () { return true; } },

  { id: "hTest", part: 3, sec: "Vision test", title: "Which enemy was highlighted?",
    why: "Four enemies flash for about 1/17 of a second, then a mask covers them. One had a red, yellow or purple outline. Say where it was. The outline gets fainter when you're right and stronger when you're wrong. 67 rounds, about 2 minutes.",
    uses: "Measures the outline strength each color needs before you can see it (a vision threshold), not your reaction time or input lag. The easiest color gets up to a 2.5-point bonus, shrunk when the estimate is uncertain. Optional.",
    show: function () { return !S.hSkip; },
    render: function (h) { visionTest(h); },
    valid: function () { return true; } }

];

