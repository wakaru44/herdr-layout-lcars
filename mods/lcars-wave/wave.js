// lcars-wave pure logic: ring buffer of { w, d, b } samples (working, done, blocked counts), scaling and blocked events.
export const CAP = 150, EVERY_MS = 2000;

/** Counts from an agents() list. */
export const sample = (agents) => {
  const n = (s) => agents.filter((a) => a.status === s).length;
  return { w: n("working"), d: n("done"), b: n("blocked") };
};

/** Appends and keeps the newest `cap`. Returns the same array. */
export const push = (buf, s, cap = CAP) => { buf.push(s); if (buf.length > cap) buf.splice(0, buf.length - cap); return buf; };

/** Y axis top: at least 4, rounded up so ticks stay whole numbers. */
export const niceMax = (buf) => {
  const m = Math.max(4, ...buf.map((s) => Math.max(s.w, s.d)));
  return m <= 8 ? m + (m % 2) : Math.ceil(m / 4) * 4;
};
export const ticks = (max) => { const step = max <= 8 ? 2 : max / 4; return Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step); };

/** Percent positions inside the plot: the newest sample sits at the right edge, a short buffer leaves the left empty. */
export const xPct = (i, n, cap = CAP) => ((cap - n + i) / (cap - 1)) * 100;
export const yPct = (v, max) => 4 + (1 - v / max) * 92;

/** Stepped (hold) polyline for one key, as [x, y] percent pairs. */
export const steps = (buf, key, max, cap = CAP) => {
  const pts = [];
  buf.forEach((s, i) => {
    const x = xPct(i, buf.length, cap), y = yPct(s[key], max);
    if (i) pts.push([x, pts[pts.length - 1][1]]);
    pts.push([x, y]);
  });
  return pts;
};

/** Sample indices where the blocked count rose. */
export const blockedRises = (buf) => buf.flatMap((s, i) => (i > 0 && s.b > buf[i - 1].b ? [i] : []));
