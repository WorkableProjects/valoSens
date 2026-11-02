"use strict";
var BGS = X.SCENES;
function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
function paintBg(ctx, w, h, key, seed) {
  var b = BGS[key] || BGS.concrete, r = rng(seed || 7);
  ctx.fillStyle = "rgb(" + b.base.join(",") + ")"; ctx.fillRect(0, 0, w, h);
  for (var i = 0; i < 14; i++) {
    var c = b.blocks[i % 2], a = 0.25 + r() * 0.5;
    ctx.fillStyle = "rgba(" + c.join(",") + "," + a.toFixed(2) + ")";
    ctx.fillRect(r() * w, r() * h, w * (0.08 + r() * 0.35), h * (0.08 + r() * 0.5));
  }
  if (b.blobs) for (var j = 0; j < 5; j++) {
    var cx = r() * w, cy = r() * h, rad = Math.max(w, h) * (0.12 + r() * 0.2), col = j % 2 ? b.blocks[1] : b.blocks[0];
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, "rgba(" + col.join(",") + ",.75)"); g.addColorStop(1, "rgba(" + col.join(",") + ",0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
  var img = ctx.getImageData(0, 0, w, h), d = img.data;
  for (var k = 0; k < d.length; k += 4) { var n = (r() - 0.5) * b.noise; d[k] += n; d[k + 1] += n; d[k + 2] += n; }
  ctx.putImageData(img, 0, 0);
}
// Draws a crosshair config (decoded code fields) at (cx, cy). s = device pixels per game pixel.
function drawCross(ctx, cx, cy, x, s) {
  s = s || 1;
  var col = X.XCOLORS[x.c] ? X.XCOLORS[x.c].hex : "#fff", ot = x.h ? x.t * s : 0, rects = [];
  if (x["0b"]) {
    var t = x["0t"] * s, l = x["0l"] * s, o = x["0o"] * s;
    rects.push([cx + o, cy - t / 2, l, t], [cx - o - l, cy - t / 2, l, t], [cx - t / 2, cy - o - l, t, l], [cx - t / 2, cy + o, t, l]);
  }
  var dot = x.d ? [cx - x.z * s / 2, cy - x.z * s / 2, x.z * s, x.z * s] : null;
  function snap(r) { return [Math.round(r[0]), Math.round(r[1]), Math.max(1, Math.round(r[2])), Math.max(1, Math.round(r[3]))]; }
  if (ot) {
    ctx.fillStyle = "rgba(0,0,0," + x.o + ")";
    rects.concat(dot ? [dot] : []).forEach(function (r) { r = snap(r); ctx.fillRect(r[0] - ot, r[1] - ot, r[2] + 2 * ot, r[3] + 2 * ot); });
  }
  ctx.fillStyle = col;
  ctx.globalAlpha = x["0a"]; rects.forEach(function (r) { r = snap(r); ctx.fillRect(r[0], r[1], r[2], r[3]); });
  ctx.globalAlpha = x.a; if (dot) { var d = snap(dot); ctx.fillRect(d[0], d[1], d[2], d[3]); }
  ctx.globalAlpha = 1;
}
// Enemy silhouette; hex = highlight outline color (null for none), alpha = outline strength. Size in device pixels.
function drawEnemy(ctx, cx, cy, size, hex, bodyRGB, alpha) {
  var w = size * 0.42, hh = size, head = size * 0.13;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy - hh / 2 + head, head, 0, Math.PI * 2);
  ctx.moveTo(cx - w / 2, cy - hh / 2 + head * 2.3);
  ctx.lineTo(cx + w / 2, cy - hh / 2 + head * 2.3); ctx.lineTo(cx + w * 0.38, cy + hh * 0.08); ctx.lineTo(cx + w * 0.3, cy + hh / 2);
  ctx.lineTo(cx - w * 0.3, cy + hh / 2); ctx.lineTo(cx - w * 0.38, cy + hh * 0.08); ctx.closePath();
  ctx.fillStyle = "rgb(" + bodyRGB.join(",") + ")"; ctx.fill();
  if (hex) {
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.shadowColor = hex; ctx.shadowBlur = Math.max(4, size * 0.12);
    ctx.strokeStyle = hex; ctx.lineWidth = Math.max(1.5, size * 0.035); ctx.stroke();
  }
  ctx.restore();
}
function hidpi(canvas, cssW, cssH) {
  var dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
  canvas.style.width = cssW + "px"; canvas.style.height = cssH + "px";
  var ctx = canvas.getContext("2d"); return { ctx: ctx, dpr: dpr, w: canvas.width, h: canvas.height };
}

