// Hand-drawn looking SVG paths. The wobble is seeded from the step id, so a step always looks the
// same instead of re-rolling on every re-render.

export interface Box { x: number; y: number; w: number; h: number }
export interface Pt { x: number; y: number }

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};

/** Small deterministic random generator (mulberry32). */
const rng = (seed: string) => {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const smooth = (pts: Pt[]) => {
  if (pts.length < 3) return pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  let d = `M${pts[0]!.x.toFixed(1)} ${pts[0]!.y.toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i]!, n = pts[i + 1]!;
    d += ` Q${p.x.toFixed(1)} ${p.y.toFixed(1)} ${((p.x + n.x) / 2).toFixed(1)} ${((p.y + n.y) / 2).toFixed(1)}`;
  }
  const last = pts[pts.length - 1]!;
  return d + ` L${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
};

/** A loose marker circle around `b` that overshoots where it started, like a quick pen loop. */
export const scribbleCircle = (b: Box, seed: string): string => {
  const r = rng(seed);
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const rx = b.w / 2 * 1.18 + 8, ry = b.h / 2 * 1.3 + 8;
  const start = -Math.PI * 0.6 + r() * 0.5;
  const turns = 1.16;
  const n = 48;
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = start + (i / n) * Math.PI * 2 * turns;
    const grow = 1 + (i / n) * 0.05; // spiral out a little so the end passes the start
    const j = 1 + (r() - 0.5) * 0.06;
    pts.push({ x: cx + Math.cos(a) * rx * grow * j, y: cy + Math.sin(a) * ry * grow * j });
  }
  return smooth(pts);
};

/** Two wavy strokes under `b`. */
export const scribbleUnderline = (b: Box, seed: string): string => {
  const r = rng(seed);
  const y0 = b.y + b.h + 5;
  const x0 = b.x + 2, x1 = b.x + b.w - 2;
  const stroke = (y: number, flip: boolean) => {
    const n = Math.max(6, Math.round((x1 - x0) / 22));
    const pts: Pt[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push({ x: x0 + (x1 - x0) * t, y: y + Math.sin(t * Math.PI * 3 + (flip ? Math.PI : 0)) * 2.2 + (r() - 0.5) * 1.6 });
    }
    return smooth(flip ? pts.reverse() : pts);
  };
  return `${stroke(y0, false)} ${stroke(y0 + 5, true).replace(/^M/, 'L')}`;
};

/** A rough rectangle whose corners overshoot a little, drawn in one stroke. */
export const scribbleBox = (b: Box, seed: string): string => {
  const r = rng(seed);
  const pad = 6;
  const x = b.x - pad, y = b.y - pad, w = b.w + pad * 2, h = b.h + pad * 2;
  const j = () => (r() - 0.5) * 5;
  const o = () => 6 + r() * 6;
  const a = { x: x + j(), y: y + j() };
  const p = [
    a,
    { x: x + w + o(), y: y + j() },
    { x: x + w + j(), y: y + h + o() },
    { x: x - o(), y: y + h + j() },
    { x: x + j(), y: y - o() * 0.6 },
  ];
  return smooth(p.flatMap((pt, i) => {
    const nx = p[i + 1];
    return nx ? [pt, { x: (pt.x + nx.x) / 2 + j() * 0.4, y: (pt.y + nx.y) / 2 + j() * 0.4 }] : [pt];
  }));
};

/** A curved arrow from `from` to `to` with a hand-drawn head. Returns shaft and head as separate paths. */
export const scribbleArrow = (from: Pt, to: Pt, seed: string): { shaft: string; head: string } => {
  const r = rng(seed);
  const dx = to.x - from.x, dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const bend = (r() > 0.5 ? 1 : -1) * Math.min(60, len * 0.22);
  const c1 = { x: from.x + dx * 0.3 + nx * bend, y: from.y + dy * 0.3 + ny * bend };
  const c2 = { x: from.x + dx * 0.7 + nx * bend * 0.7, y: from.y + dy * 0.7 + ny * bend * 0.7 };
  const shaft = `M${from.x.toFixed(1)} ${from.y.toFixed(1)} C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
  // Head follows the curve's final direction (from c2 to the tip).
  const ang = Math.atan2(to.y - c2.y, to.x - c2.x);
  const hl = 15;
  const left = { x: to.x - Math.cos(ang - 0.45) * hl, y: to.y - Math.sin(ang - 0.45) * hl };
  const right = { x: to.x - Math.cos(ang + 0.45) * hl, y: to.y - Math.sin(ang + 0.45) * hl };
  const head = `M${left.x.toFixed(1)} ${left.y.toFixed(1)} L${to.x.toFixed(1)} ${to.y.toFixed(1)} L${right.x.toFixed(1)} ${right.y.toFixed(1)}`;
  return { shaft, head };
};
