"use strict";
/* ---------- Results helpers ---------- */
var ICON = {
  up: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 10l5-5 5 5" fill="none" stroke="var(--teal)" stroke-width="2.4"/></svg>',
  down: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 6l5 5 5-5" fill="none" stroke="var(--pink)" stroke-width="2.4"/></svg>',
  flat: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 8h8" stroke="var(--dim)" stroke-width="2.4"/></svg>',
  down2: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v8M4.5 6.5L8 10l3.5-3.5M2.5 13.5h11" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  mouse: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="4" y="1.5" width="8" height="13" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 4v3" stroke="currentColor" stroke-width="1.5"/></svg>',
  cross: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1v5M8 10v5M1 8h5M10 8h5" stroke="currentColor" stroke-width="1.6"/></svg>',
  scope: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="8" r="1.2" fill="currentColor"/></svg>',
  ruler: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 11L11 1l4 4L5 15z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M5 7l2 2M8 4l2 2" stroke="currentColor" stroke-width="1.4"/></svg>'
};
var INTRO_MS = 1300;
// Draws chart lines in when their pane opens (stroke-dash from the measured path length).
function drawLines(root, base) {
  if (REDUCED) return;
  base = base || 0;
  root.querySelectorAll("path.ln").forEach(function (p, i) {
    var L = Math.ceil(p.getTotalLength ? p.getTotalLength() : 1000) + 2;
    p.style.strokeDasharray = L; p.style.strokeDashoffset = L; p.style.transition = "none";
    void p.getBoundingClientRect();
    p.style.transition = "stroke-dashoffset 1.1s cubic-bezier(.22,.61,.36,1) " + (base + 0.1 + i * 0.12) + "s"; p.style.strokeDashoffset = 0;
  });
}
function countUp(node, to, decimals, ms, delay) {
  if (REDUCED) { node.textContent = to.toFixed(decimals); return; }
  var t0 = null; delay = delay || 0; node.textContent = (0).toFixed(decimals);
  function step(t) {
    if (t0 === null) t0 = t + delay;
    if (t < t0) { requestAnimationFrame(step); return; }
    var p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3);
    node.textContent = (to * e).toFixed(decimals);
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
function impactCell(pct) {
  if (pct === null) return '<span class="im">' + ICON.flat + "</span>";
  if (Math.abs(pct) < 1) return '<span class="im"><span class="pct">0%</span>' + ICON.flat + "</span>";
  return '<span class="im" title="' + (pct > 0 ? "Slower" : "Faster") + '"><span class="pct">' + (pct > 0 ? "+" : "") + Math.round(pct) + "%</span>" + (pct > 0 ? ICON.up : ICON.down) + "</span>";
}

// Distribution of the comparison pros' cm/360 (kernel density in log space) with your result.
function distChart(R, cur) {
  var W = 560, H = 210, L = 6, Rt = 6, T = 26, B = 28, xMin = 15, xMax = 110;
  var logs = M.PROS.map(function (p) { return Math.log(p.cm); });
  var sd = Math.sqrt(logs.reduce(function (s, x) { var m = M.PRO_STATS.logMean; return s + (x - m) * (x - m); }, 0) / (logs.length - 1));
  var bw = 1.06 * sd * Math.pow(logs.length, -0.2);
  function dens(c) { var lc = Math.log(c); return logs.reduce(function (s, x) { var z = (lc - x) / bw; return s + Math.exp(-0.5 * z * z); }, 0) / c; }
  var pts = [], yMax = 0;
  for (var c = xMin; c <= xMax; c += 0.5) { var d = dens(c); pts.push([c, d]); yMax = Math.max(yMax, d); }
  function x(v) { return L + (Math.min(xMax, Math.max(xMin, v)) - xMin) / (xMax - xMin) * (W - L - Rt); }
  function y(v) { return T + (1 - v / (yMax * 1.08)) * (H - T - B); }
  function seg(a, b) { return pts.filter(function (p) { return p[0] >= a - 0.25 && p[0] <= b + 0.25; }).map(function (p, i) { return (i ? "L" : "M") + x(p[0]).toFixed(1) + " " + y(p[1]).toFixed(1); }).join(""); }
  function len(a, b) { var q = pts.filter(function (p) { return p[0] >= a - 0.25 && p[0] <= b + 0.25; }), s = 0; for (var i = 1; i < q.length; i++) s += Math.hypot(x(q[i][0]) - x(q[i - 1][0]), y(q[i][1]) - y(q[i - 1][1])); return Math.ceil(s) + 2; }
  var lo = Math.max(xMin, R.lo), hi = Math.min(xMax, R.hi);
  var area = "M" + x(lo) + " " + (H - B) + seg(lo, hi).replace(/^M/, "L") + "L" + x(hi) + " " + (H - B) + "Z";
  var med = M.PRO_STATS.medianCm, you = R.cm;
  var s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Distribution of ' + M.PRO_STATS.n + ' VCT pros by cm/360. Your result is ' + f1(you) + ' cm; near-optimal range ' + f1(R.lo) + " to " + f1(R.hi) + ' cm.">';
  s += '<defs><linearGradient id="bandG" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#d24bd6" stop-opacity=".42"/><stop offset="1" stop-color="#d24bd6" stop-opacity=".08"/></linearGradient>' +
       '<linearGradient id="baseG" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#2ad6b0" stop-opacity=".12"/><stop offset="1" stop-color="#2ad6b0" stop-opacity="0"/></linearGradient></defs>';
  s += '<rect x="' + L + '" y="' + T + '" width="' + (W - L - Rt) + '" height="' + (H - T - B) + '" fill="url(#baseG)" opacity=".5"/>';
  s += '<rect class="band-in" x="' + x(lo) + '" y="' + T + '" width="' + (x(hi) - x(lo)) + '" height="' + (H - T - B) + '" fill="rgba(210,75,214,.10)"/>';
  s += '<path class="band-in" d="' + area + '" fill="url(#bandG)"/>';
  s += '<line x1="' + x(med) + '" x2="' + x(med) + '" y1="' + y(dens(med)) + '" y2="' + (H - B) + '" stroke="var(--muted)" stroke-dasharray="4 4" opacity=".6"/>';
  s += '<path class="draw" style="--len:' + len(xMin, lo) + '" d="' + seg(xMin, lo) + '" fill="none" stroke="#2a9fd6" stroke-width="2"/>';
  s += '<path class="draw" style="--len:' + len(lo, hi) + ';animation-delay:.45s" d="' + seg(lo, hi) + '" fill="none" stroke="var(--pink)" stroke-width="2.4"/>';
  s += '<path class="draw" style="--len:' + len(hi, xMax) + ';animation-delay:.8s" d="' + seg(hi, xMax) + '" fill="none" stroke="var(--yellow)" stroke-width="2"/>';
  s += '<line x1="' + L + '" x2="' + (W - Rt) + '" y1="' + (H - B) + '" y2="' + (H - B) + '" stroke="var(--line2)"/>';
  // ticks: range edges, pro median, ends
  [[xMin, String(xMin)], [lo, f1(lo)], [med, "PRO " + Math.round(med)], [hi, f1(hi)], [xMax, xMax + " CM"]].forEach(function (t, k, arr) {
    var anchor = k === 0 ? "start" : k === arr.length - 1 ? "end" : "middle";
    s += '<text x="' + x(t[0]) + '" y="' + (H - B + 18) + '" text-anchor="' + anchor + '">' + t[1] + "</text>";
  });
  if (cur) s += '<g class="pop"><path d="M' + x(cur) + " " + (H - B - 6) + "l6 6-6 6-6-6z\" fill=\"var(--ink)\" transform=\"translate(0,-6)\"/></g>";
  var yy = y(dens(you));
  s += '<line class="pin" x1="' + x(you) + '" x2="' + x(you) + '" y1="' + yy + '" y2="' + (H - B) + '" stroke="#fff" stroke-width="2"/>';
  s += '<g class="pop"><circle cx="' + x(you) + '" cy="' + yy + '" r="6" fill="#fff"/><circle cx="' + x(you) + '" cy="' + yy + '" r="11" fill="none" stroke="#fff" stroke-opacity=".35"/>' +
       '<text class="lbl" x="' + x(you) + '" y="' + (yy - 16) + '" text-anchor="middle">' + f1(you) + "</text></g>";
  return s + "</svg>";
}

// Bell curve of in-game sens at 800 DPI (mean 0.3, SD 0.1) with the result, the raw physical model and the current setting.
function normCdf(z) {
  var t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2);
  var p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}
function fmtSens(v) { return (v < 0 ? "\u2212" : "+") + Math.abs(v).toFixed(2) + " sens"; }
function bellChart(R, dpi) {
  var B0 = R.bell, SD = B0.sd, MU = B0.mean, xMin = 0, xMax = 0.7;
  var W = 560, H = 250, L = 14, Rt = 14, T = 30, B = dpi !== 800 ? 52 : 38, base = H - B, peak = 1 / (SD * Math.sqrt(2 * Math.PI));
  function x(v) { return L + (Math.min(xMax, Math.max(xMin, v)) - xMin) / (xMax - xMin) * (W - L - Rt); }
  function pdf(v) { var z = (v - MU) / SD; return Math.exp(-0.5 * z * z) / (SD * Math.sqrt(2 * Math.PI)); }
  function y(d) { return T + (1 - d / (peak * 1.08)) * (base - T); }
  function curve(a, b) { var out = [], n = Math.max(2, Math.round((b - a) / 0.005)); for (var i = 0; i <= n; i++) { var v = a + (b - a) * i / n; out.push((i ? "L" : "M") + x(v).toFixed(1) + " " + y(pdf(v)).toFixed(1)); } return out.join(""); }
  function area(a, b) { return "M" + x(a).toFixed(1) + " " + base + curve(a, b).replace(/^M/, "L") + "L" + x(b).toFixed(1) + " " + base + "Z"; }
  var cur = R.anchor ? M.s800FromCm(R.anchor.cm) : null;
  var aria = "Bell curve of in-game sensitivity at 800 DPI, mean 0.3, standard deviation 0.1. Your result is " + B0.s800.toFixed(3) + " at 800 DPI, percentile " + Math.round(B0.percentile * 100) +
    (Math.abs(M.s800FromCm(R.cm) - B0.s800) > 0.005 ? ". This run's step is " + M.s800FromCm(R.cm).toFixed(3) + " at 800 DPI, toward that target" : "") + ". The raw physical model alone gave " + B0.s800Model.toFixed(3) + (cur ? ". Your current setting is " + cur.toFixed(3) + " at 800 DPI" : "") + ".";
  var s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(aria) + '">';
  s += '<defs><linearGradient id="b1G" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#2ad6b0" stop-opacity=".5"/><stop offset="1" stop-color="#2ad6b0" stop-opacity=".08"/></linearGradient>' +
    '<linearGradient id="b2G" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#2a9fd6" stop-opacity=".32"/><stop offset="1" stop-color="#2a9fd6" stop-opacity=".05"/></linearGradient></defs>';
  [0.25, 0.5, 0.75, 1].forEach(function (f) { s += '<line class="gridh" x1="' + L + '" x2="' + (W - Rt) + '" y1="' + y(peak * f) + '" y2="' + y(peak * f) + '" stroke="var(--line)" stroke-dasharray="2 4"/>'; });
  s += '<path class="bband" style="--k:0" d="' + area(MU - 2 * SD, MU + 2 * SD) + '" fill="url(#b2G)"/>';
  s += '<path class="bband" style="--k:1" d="' + area(MU - SD, MU + SD) + '" fill="url(#b1G)"/>';
  s += '<path class="ln" d="' + curve(xMin, xMax) + '" fill="none" stroke="var(--ink)" stroke-width="2.2"/>';
  s += '<line x1="' + L + '" x2="' + (W - Rt) + '" y1="' + base + '" y2="' + base + '" stroke="var(--line2)"/>';
  [0.1, 0.2, 0.3, 0.4, 0.5, 0.6].forEach(function (v) {
    s += '<line x1="' + x(v) + '" x2="' + x(v) + '" y1="' + base + '" y2="' + (base + 4) + '" stroke="var(--line2)"/><text x="' + x(v) + '" y="' + (base + 17) + '" text-anchor="middle">' + v.toFixed(1) + "</text>";
    if (dpi !== 800) s += '<text class="lbl2" x="' + x(v) + '" y="' + (base + 31) + '" text-anchor="middle">' + (v * 800 / dpi).toFixed(3) + "</text>";
  });
  s += '<text x="' + L + '" y="' + (H - 4) + '">SENS @ 800 DPI' + (dpi !== 800 ? " (TOP) · @ " + dpi + " DPI (BELOW)" : "") + "</text>";
  // markers: each is a pin from the curve down to the axis plus a labelled dot, dropped in with a spring.
  function marker(v, k, label, kind) {
    var px = x(v), py = y(pdf(Math.min(xMax, Math.max(xMin, v)))), g = '<g class="mk" style="--k:' + k + '">';
    if (kind === "step") {
      g += '<path d="M' + px + " " + (base - 12) + 'l6 6-6 6-6-6z" fill="var(--teal)"/><line x1="' + px + '" x2="' + px + '" y1="' + (base - 30) + '" y2="' + (base - 13) + '" stroke="var(--teal)" opacity=".6"/>' +
        '<text class="lbl2" x="' + px + '" y="' + (base - 34) + '" text-anchor="middle">' + label + "</text>";
    } else if (kind === "cur") {
      g += '<path d="M' + px + " " + (base - 12) + 'l6 6-6 6-6-6z" fill="var(--yellow)"/><text class="lbl2" x="' + px + '" y="' + (base - 18) + '" text-anchor="middle">' + label + "</text>";
    } else if (kind === "model") {
      g += '<line x1="' + px + '" x2="' + px + '" y1="' + py + '" y2="' + base + '" stroke="var(--muted)" stroke-dasharray="3 3" opacity=".6"/><circle cx="' + px + '" cy="' + py + '" r="5" fill="none" stroke="var(--muted)" stroke-width="1.6" stroke-dasharray="2 2" opacity=".75"/>' +
        '<text class="lbl2" x="' + (px + 8) + '" y="' + (base - 8) + '" text-anchor="start" opacity=".85">' + label + "</text>";
    } else {
      g += '<line x1="' + px + '" x2="' + px + '" y1="' + py + '" y2="' + base + '" stroke="#fff" stroke-width="2"/><circle cx="' + px + '" cy="' + py + '" r="6" fill="#fff"/><circle class="pulse" cx="' + px + '" cy="' + py + '" r="10" fill="none" stroke="#fff" stroke-width="2"/>' +
        '<text class="lbl" x="' + px + '" y="' + (py - 14) + '" text-anchor="middle">' + label + "</text>";
    }
    return g + "</g>";
  }
  if (cur) s += marker(cur, 0, "NOW " + cur.toFixed(2), "cur");
  s += marker(B0.s800Model, 1, "MODEL " + B0.s800Model.toFixed(2), "model");
  // With a current setting the result may be one staged step toward the bell target: show both.
  var step = M.s800FromCm(R.cm), staged = Math.abs(step - B0.s800) > 0.005;
  if (staged) s += marker(step, 2, "THIS STEP " + step.toFixed(2), "step");
  s += marker(B0.s800, 3, (staged ? "TARGET " : "YOU ") + B0.s800.toFixed(2), "you");
  s += '<line id="bxh" x1="0" x2="0" y1="' + T + '" y2="' + base + '" stroke="var(--muted)" visibility="hidden"/><rect id="bhit" x="' + L + '" y="' + T + '" width="' + (W - L - Rt) + '" height="' + (base - T) + '" fill="transparent"/></svg>';
  return { svg: s, x: x, W: W, L: L, Rt: Rt, xMin: xMin, xMax: xMax, cur: cur, staged: staged };
}
function wireBellHover(host, R, geo) {
  var svg = host.querySelector("svg"), hit = svg.querySelector("#bhit"), xh = svg.querySelector("#bxh"), tt = host.querySelector(".tt");
  hit.addEventListener("pointermove", function (ev) {
    var r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) / r.width * geo.W;
    var v = geo.xMin + (px - geo.L) / (geo.W - geo.L - geo.Rt) * (geo.xMax - geo.xMin);
    v = Math.max(0.01, Math.min(0.7, v));
    var pct = normCdf((v - R.bell.mean) / R.bell.sd);
    xh.setAttribute("x1", geo.x(v)); xh.setAttribute("x2", geo.x(v)); xh.setAttribute("visibility", "visible");
    tt.innerHTML = "<b>" + v.toFixed(3) + " sens @ 800 DPI</b><br>" + M.cmFromS800(v).toFixed(1) + " cm/360 · percentile " + Math.round(pct * 100);
    tt.style.display = "block";
    tt.style.left = Math.min(Math.max(0, geo.x(v) / geo.W * r.width + 10), r.width - tt.offsetWidth) + "px"; tt.style.top = "4px";
  });
  hit.addEventListener("pointerleave", function () { tt.style.display = "none"; xh.setAttribute("visibility", "hidden"); });
}
// "What moved you": one centred diverging bar per shift (left = slower, right = faster). +-1.5 SD fills a half-width.
function shiftRows(R) {
  var B0 = R.bell, rows = [{ label: "Your setup (physical model)", z: B0.rhoZModel, note: "From your pad, grip, role, weapon and agents" }].concat(B0.shifts || []);
  return '<ul class="shifts" aria-label="What moved your sensitivity">' + rows.map(function (r, i) {
    var z = r.z || 0, w = Math.min(Math.abs(z), 1.5) / 1.5 * 50, v = z * B0.sd;
    var bar = Math.abs(z) < 0.005 ? "" : '<i class="' + (z > 0 ? "fast" : "slow") + '" style="width:' + w.toFixed(1) + '%"></i>';
    return '<li class="shift" style="--i:' + i + '"><span class="sh-n">' + esc(r.label) + (r.note ? "<small>" + esc(r.note) + "</small>" : "") + '</span><span class="sh-t" aria-hidden="true">' + bar +
      '</span><span class="sh-v">' + fmtSens(v) + "</span></li>";
  }).join("") + '</ul><div class="sh-ends" aria-hidden="true"><span>\u2190 slower</span><span>faster \u2192</span></div>';
}

function costChart(R) {
  var W = 680, H = 240, L = 40, Rt = 12, T = 12, B = 30, xMin = 15, xMax = 120;
  var pts = R.curve, yMax = 0;
  pts.forEach(function (p) { if (p.C >= 20 && p.C <= 110) yMax = Math.max(yMax, p.total); });
  yMax = Math.min(yMax, R.modelCost.total * 2.2);
  function x(c) { return L + (c - xMin) / (xMax - xMin) * (W - L - Rt); }
  function y(v) { return T + (1 - Math.min(v, yMax * 1.5) / yMax) * (H - T - B); }
  function path(k) { return pts.map(function (p, i) { return (i ? "L" : "M") + x(p.C).toFixed(1) + " " + y(p[k]).toFixed(1); }).join(""); }
  var s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Model cost curve (unvalidated estimate) with minimum near ' + f1(R.cModel) + ' cm/360">';
  s += '<rect x="' + x(R.band[0]) + '" y="' + T + '" width="' + (x(R.band[1]) - x(R.band[0])) + '" height="' + (H - T - B) + '" fill="rgba(210,75,214,.12)"/>';
  [20, 40, 60, 80, 100, 120].forEach(function (c) { s += '<line class="gridh" x1="' + x(c) + '" x2="' + x(c) + '" y1="' + T + '" y2="' + (H - B) + '" stroke="var(--line)"/><text x="' + x(c) + '" y="' + (H - B + 16) + '" text-anchor="middle">' + c + "</text>"; });
  for (var k = 0; k <= 3; k++) { var v = yMax * k / 3; s += '<line class="gridh" x1="' + L + '" x2="' + (W - Rt) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="var(--line)" stroke-dasharray="2 4"/><text x="' + (L - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v.toFixed(2) + "</text>"; }
  s += '<clipPath id="plot"><rect x="' + L + '" y="' + T + '" width="' + (W - L - Rt) + '" height="' + (H - T - B) + '"/></clipPath><g clip-path="url(#plot)">';
  s += '<path class="ln" d="' + path("prec") + '" fill="none" stroke="#2a9fd6" stroke-width="1.6"/><path class="ln" d="' + path("trav") + '" fill="none" stroke="var(--yellow)" stroke-width="1.6"/>';
  s += '<path class="ln" d="' + path("lift") + '" fill="none" stroke="var(--pink)" stroke-width="1.6"/><path class="ln" d="' + path("total") + '" fill="none" stroke="var(--ink)" stroke-width="2.4"/></g>';
  s += '<line x1="' + x(R.cModel) + '" x2="' + x(R.cModel) + '" y1="' + T + '" y2="' + (H - B) + '" stroke="var(--ink)" stroke-dasharray="3 3"/>';
  s += '<line x1="' + x(R.cm) + '" x2="' + x(R.cm) + '" y1="' + T + '" y2="' + (H - B) + '" stroke="var(--teal)" stroke-width="2"/>';
  var near = pts.reduce(function (b, p) { return Math.abs(p.C - R.cm) < Math.abs(b.C - R.cm) ? p : b; }, pts[0]), my = y(near.total);
  s += '<circle cx="' + x(R.cm) + '" cy="' + my + '" r="4.5" fill="var(--teal)" stroke="var(--bg)" stroke-width="1.5"/><circle class="pulse" cx="' + x(R.cm) + '" cy="' + my + '" r="9" fill="none" stroke="var(--teal)" stroke-width="2"/>';
  s += '<line id="xh" x1="0" x2="0" y1="' + T + '" y2="' + (H - B) + '" stroke="var(--muted)" visibility="hidden"/>';
  s += '<rect id="hit" x="' + L + '" y="' + T + '" width="' + (W - L - Rt) + '" height="' + (H - T - B) + '" fill="transparent"/></svg>';
  return { svg: s, x: x, W: W, L: L, Rt: Rt, xMin: xMin, xMax: xMax };
}
function wireCostHover(host, R, geo) {
  var svg = host.querySelector("svg"), hit = svg.querySelector("#hit"), xh = svg.querySelector("#xh"), tt = host.querySelector(".tt");
  hit.addEventListener("pointermove", function (ev) {
    var r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) / r.width * geo.W;
    var c = geo.xMin + (px - geo.L) / (geo.W - geo.L - geo.Rt) * (geo.xMax - geo.xMin);
    var p = R.curve[Math.max(0, Math.min(R.curve.length - 1, Math.round(c - 15)))];
    xh.setAttribute("x1", geo.x(p.C)); xh.setAttribute("x2", geo.x(p.C)); xh.setAttribute("visibility", "visible");
    tt.innerHTML = "<b>" + p.C + " cm/360</b><br>Model cost <b>" + p.total.toFixed(3) + "</b> (est. s, unvalidated)<br>Precision " + p.prec.toFixed(3) + " · Travel " + p.trav.toFixed(3) + " · Reach " + p.lift.toFixed(3);
    tt.style.display = "block";
    tt.style.left = Math.min(Math.max(0, geo.x(p.C) / geo.W * r.width + 10), r.width - tt.offsetWidth) + "px"; tt.style.top = "4px";
  });
  hit.addEventListener("pointerleave", function () { tt.style.display = "none"; xh.setAttribute("visibility", "hidden"); });
}
function proChart(R) {
  var W = 680, rowH = 36, L = 92, Rt = 12, T = 6, xMin = 30, xMax = 110;
  var rows = [["d", "Duelist"], ["i", "Initiator"], ["c", "Controller"], ["s", "Sentinel"], ["f", "Flex"], [null, "Unverified"]];
  var H = T + rows.length * rowH + 26;
  function x(c) { return L + (Math.min(xMax, Math.max(xMin, c)) - xMin) / (xMax - xMin) * (W - L - Rt); }
  var s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="VCT pros by role and cm/360, with your result">';
  [40, 60, 80, 100].forEach(function (c) { s += '<line class="gridh" x1="' + x(c) + '" x2="' + x(c) + '" y1="' + T + '" y2="' + (T + rows.length * rowH) + '" stroke="var(--line)"/><text x="' + x(c) + '" y="' + (H - 6) + '" text-anchor="middle">' + c + "</text>"; });
  rows.forEach(function (r, ri) {
    var cy = T + ri * rowH + rowH / 2, placed = [], OFF = [0, -9, 9, -4.5, 4.5, -13, 13];
    s += '<text class="lbl" x="' + (L - 12) + '" y="' + (cy + 4) + '" text-anchor="end">' + r[1].toUpperCase() + "</text>";
    M.PROS.filter(function (p) { return p.role === r[0]; }).sort(function (a, b) { return a.cm - b.cm; }).forEach(function (p) {
      var px = x(p.cm), lane = 0;
      while (placed.some(function (q) { return q.l === lane && Math.abs(q.x - px) < 9; }) && lane < OFF.length - 1) lane++;
      placed.push({ x: px, l: lane });
      s += '<circle class="pd" style="--i:' + (ri * 3 + lane) + '" cx="' + px.toFixed(1) + '" cy="' + (cy + OFF[lane]) + '" r="4.5" fill="#2a9fd6" stroke="var(--bg)" stroke-width="1.5" data-t="' +
        esc(p.name) + " · " + f1(p.cm) + " cm · " + p.dpi + " × " + p.sens + '"/>';
    });
  });
  s += '<line x1="' + x(R.cm) + '" x2="' + x(R.cm) + '" y1="' + T + '" y2="' + (T + rows.length * rowH) + '" stroke="var(--teal)" stroke-width="2"/>';
  s += '<circle cx="' + x(R.cm) + '" cy="' + (T + 5) + '" r="4.5" fill="var(--teal)"/><circle class="pulse" cx="' + x(R.cm) + '" cy="' + (T + 5) + '" r="9" fill="none" stroke="var(--teal)" stroke-width="2"/>';
  return s + "</svg>";
}
function wireDotHover(host) {
  var tt = host.querySelector(".tt");
  host.querySelectorAll("circle.pd").forEach(function (c) {
    c.addEventListener("pointerenter", function () {
      var r = host.getBoundingClientRect(), b = c.getBoundingClientRect();
      tt.textContent = c.getAttribute("data-t"); tt.style.display = "block";
      tt.style.left = Math.min(Math.max(0, b.left - r.left - tt.offsetWidth / 2), r.width - tt.offsetWidth) + "px";
      tt.style.top = (b.top - r.top - 32) + "px";
    });
    c.addEventListener("pointerleave", function () { tt.style.display = "none"; });
  });
}

// Animated previews. Crosshairs assemble: lines slide in from a wider gap and grow while the outline fades in.
// Enemies rise into place and their highlight outline flares once. Backgrounds are painted once per canvas.
function ease(p) { return 1 - Math.pow(1 - p, 3); }
function animCanvas(dur, delay, paint) {
  if (REDUCED) { paint(1); return; }
  var t0 = null; paint(0);
  function f(t) { if (t0 === null) t0 = t + delay; var p = Math.max(0, Math.min(1, (t - t0) / dur)); paint(p); if (p < 1) requestAnimationFrame(f); }
  requestAnimationFrame(f);
}
function growCfg(cfg, p) {
  var e = ease(p), y = Object.assign({}, cfg), fade = Math.min(1, p * 2.5);
  if (y["0b"] !== 0) { y["0l"] = cfg["0l"] * e; y["0v"] = (cfg["0v"] || cfg["0l"]) * e; y["0o"] = cfg["0o"] + (1 - e) * 6; y["0a"] = (cfg["0a"] == null ? 1 : cfg["0a"]) * fade; }
  y.o = (cfg.o || 0) * e; y.a = (cfg.a == null ? 1 : cfg.a) * fade;
  return y;
}
function drawPreviews(cfg, hex, delay) {
  delay = delay || 0;
  app.querySelectorAll("canvas.xh-prev").forEach(function (cv, i) {
    if (!cv.offsetParent) return;
    var z = +cv.getAttribute("data-z") || 1, w = cv.clientWidth || 96, h = cv.clientHeight || 96, c = hidpi(cv, w, h);
    var my = cv.getAttribute("data-code") ? X.decode(cv.getAttribute("data-code")) : cfg;
    var bg = offscreen(c.w, c.h); paintBg(bg.getContext("2d"), c.w, c.h, cv.getAttribute("data-bg"), 21 + i * 13);
    if (z > 1) c.ctx.imageSmoothingEnabled = false;
    animCanvas(650, delay + i * 70, function (p) {
      c.ctx.drawImage(bg, 0, 0);
      drawCross(c.ctx, Math.round(c.w / 2), Math.round(c.h / 2), growCfg(my, p), z > 1 ? z : 1);
    });
  });
  app.querySelectorAll("canvas.hl-prev").forEach(function (cv, i) {
    if (!cv.offsetParent) return;
    var w = cv.clientWidth || 96, h = cv.clientHeight || 96, c = hidpi(cv, w, h), key = cv.getAttribute("data-bg") || "concrete", col = cv.getAttribute("data-hl");
    var bg = offscreen(c.w, c.h); paintBg(bg.getContext("2d"), c.w, c.h, key, 41 + i * 7);
    var body = BGS[key].base.map(function (v) { return Math.round(v * 0.5); }), sz = c.h * 0.62;
    animCanvas(900, delay + i * 90, function (p) {
      var e = ease(Math.min(1, p * 1.4));
      c.ctx.drawImage(bg, 0, 0);
      c.ctx.globalAlpha = Math.min(1, p * 3);
      drawEnemy(c.ctx, c.w / 2, c.h / 2 + (1 - e) * sz * 0.18, sz, col, body, e);
      c.ctx.globalAlpha = 1;
      var flare = Math.sin(Math.PI * Math.max(0, Math.min(1, (p - 0.45) / 0.55)));
      if (flare > 0.01) drawEnemy(c.ctx, c.w / 2, c.h / 2, sz * (1 + flare * 0.04), col, body, flare * 0.6);
    });
  });
}

/* ---------- Results ---------- */
function skippedCard(n) {
  var name = n === 2 ? "Crosshair" : "Highlight color";
  return '<div class="sum-c s' + n + ' skipped" data-skipped="' + n + '"><div class="sum-k"><b>' + n + "</b>" + name + '</div><div class="sum-v">Skipped</div>' +
    '<div class="sum-s">You skipped this part. Nothing was calculated for it.</div><button type="button" class="btn small add-part" data-part="' + n + '">Add it now</button></div>';
}
