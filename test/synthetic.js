// Synthetic calibration data for tests: a simulated player whose true per-task cost is quadratic in log2(cm).
const M = require("../model.js");
function gauss(R) { let u = 0, v = 0; while (u === 0) u = R(); v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
// opts: { trueOpt: {micro, flick, turn}, curv (s per oct^2), noise (s), sessions, perCell, cms, warm (s), sessionSd, order: 'rotate'|'fixed', seed }
function simulate(opts) {
  const o = Object.assign({ trueOpt: { micro: 50, flick: 40, turn: 30 }, curv: 0.04, noise: 0.08, sessions: 3, perCell: 8,
    cms: [25, 35, 50, 70], warm: 0.15, sessionSd: 0.05, order: "rotate", seed: 7, base: { micro: 0.25, flick: 0.5, turn: 0.7 } }, opts || {});
  const R = M._rng(o.seed), trials = [];
  for (let s = 0; s < o.sessions; s++) {
    const off = gauss(R) * o.sessionSd;
    let cmsOrder = o.cms.slice();
    if (o.order === "rotate") cmsOrder = cmsOrder.slice(s % cmsOrder.length).concat(cmsOrder.slice(0, s % cmsOrder.length));
    if (o.order === "rotate" && s % 2) cmsOrder.reverse();
    let k = 0;
    cmsOrder.forEach(cm => {
      for (let rep = 0; rep < o.perCell; rep++) for (const task of ["micro", "flick", "turn"]) {
        const x = Math.log2(cm / o.trueOpt[task]);
        const warm = o.warm * Math.exp(-k / 6);
        const time = Math.max(0.05, o.base[task] + o.curv * x * x + off + warm + gauss(R) * o.noise);
        trials.push({ cm, task, time, misses: 0, overshoots: 0, session: "d" + s, order: k++ });
      }
    });
  }
  return trials;
}
module.exports = { simulate };
