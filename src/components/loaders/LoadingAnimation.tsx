import React, { useEffect, useId, useRef } from 'react';
import { animate, createTimeline, stagger, svg } from 'animejs';
import { useLoadingAnimation, type LoadingAnimationId } from '../../config/loadingAnimation';

interface Props {
  /** Force one animation (Settings previews). Omit to use the user's choice. */
  variant?: LoadingAnimationId;
  /** Height of the area the animation fills. */
  height?: number | string;
  /** Optional caption under the animation. */
  label?: string;
}

const BLUE = '#3b82f6';
const GREEN = '#22c55e';
const VIOLET = '#8b5cf6';
const SKY = '#60a5fa';

type Stoppable = { revert: () => unknown };

/** Runs `build` once the element is mounted and reverts every animation it returned on unmount. */
const useAnime = (build: (root: HTMLElement) => Stoppable[]) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const runs = build(root);
    return () => { runs.forEach(r => r.revert()); };
    // build is a stable module-level function per variant
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return ref;
};

// ── Liquid: gooey blobs that merge and split ────────────────────────────────
const BLOBS = [
  { r: 13, c: [BLUE, SKY], x: [38, 78, 52], y: [40, 28, 50] },
  { r: 11, c: [GREEN, '#4ade80'], x: [82, 46, 70], y: [34, 52, 30] },
  { r: 9,  c: [VIOLET, '#a78bfa'], x: [60, 90, 40], y: [52, 40, 32] },
  { r: 8,  c: [SKY, BLUE], x: [48, 30, 84], y: [28, 46, 48] },
  { r: 7,  c: [GREEN, SKY], x: [70, 58, 34], y: [46, 30, 42] },
];

const buildFluid = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<SVGCircleElement>('.lx-blob')).map((el, i) => {
    const b = BLOBS[i % BLOBS.length]!;
    return animate(el, {
      cx: b.x.map(v => ({ to: v })),
      cy: b.y.map(v => ({ to: v })),
      r: [{ to: b.r * 1.25 }, { to: b.r * 0.8 }, { to: b.r }],
      duration: 2600 + i * 450,
      ease: 'inOutSine',
      loop: true,
      alternate: true,
    });
  });

const Fluid: React.FC = () => {
  const id = useId().replace(/:/g, '');
  const ref = useAnime(buildFluid);
  return (
    <div ref={ref}>
      <svg width="130" height="84" viewBox="0 0 120 80" aria-hidden>
        <defs>
          <filter id={`goo${id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4.5" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" />
          </filter>
          {BLOBS.map((b, i) => (
            <linearGradient key={i} id={`g${id}${i}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={b.c[0]} /><stop offset="1" stopColor={b.c[1]} />
            </linearGradient>
          ))}
        </defs>
        <g filter={`url(#goo${id})`}>
          {BLOBS.map((b, i) => (
            <circle key={i} className="lx-blob" cx={b.x[0]} cy={b.y[0]} r={b.r} fill={`url(#g${id}${i})`} />
          ))}
        </g>
      </svg>
    </div>
  );
};

// ── Ripple: a grid of dots pulsing outward from the centre ──────────────────
const COLS = 9;
const ROWS = 5;

const buildRipple = (root: HTMLElement) => {
  const dots = root.querySelectorAll('.lx-dot');
  return [
    createTimeline({ loop: true, defaults: { ease: 'inOutSine' } })
      .add(dots, {
        scale: [{ to: 1.45, duration: 380 }, { to: 1, duration: 520 }],
        opacity: [{ to: 1, duration: 380 }, { to: 0.3, duration: 520 }],
        backgroundColor: [{ to: GREEN, duration: 380 }, { to: BLUE, duration: 520 }],
      }, stagger(80, { grid: [COLS, ROWS], from: 'center' })),
  ];
};

const Ripple: React.FC = () => {
  const ref = useAnime(buildRipple);
  return (
    <div ref={ref} style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, 7px)`, gap: 10 }}>
      {Array.from({ length: COLS * ROWS }, (_, i) => (
        <span key={i} className="lx-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: BLUE, opacity: 0.3 }} />
      ))}
    </div>
  );
};

// ── Orbit: a comet of dots circling a pulsing core ──────────────────────────
const ORBIT_DOTS = 12;

const buildOrbit = (root: HTMLElement) => {
  const dots = root.querySelectorAll('.lx-od');
  const ring = root.querySelector('.lx-ring');
  const core = root.querySelector('.lx-core');
  const runs: Stoppable[] = [
    createTimeline({ loop: true, defaults: { ease: 'linear' } })
      .add(dots, {
        scale: [{ to: 1.5, duration: 120 }, { to: 0.4, duration: 900 }],
        opacity: [{ to: 1, duration: 120 }, { to: 0.12, duration: 900 }],
      }, stagger(90)),
  ];
  if (ring) runs.push(animate(ring, { rotate: -360, duration: 5200, ease: 'linear', loop: true }));
  if (core) runs.push(animate(core, { scale: [{ to: 1.25 }, { to: 0.8 }], duration: 900, ease: 'inOutSine', loop: true, alternate: true }));
  return runs;
};

const Orbit: React.FC = () => {
  const ref = useAnime(buildOrbit);
  return (
    <div ref={ref} style={{ position: 'relative', width: 72, height: 72 }}>
      <span className="lx-ring" style={{ position: 'absolute', inset: 14, borderRadius: '50%', border: `1.5px dashed ${VIOLET}66` }} />
      <span className="lx-core" style={{ position: 'absolute', inset: 27, borderRadius: '50%', background: `linear-gradient(135deg, ${BLUE}, ${GREEN})`, boxShadow: `0 0 14px ${BLUE}99` }} />
      {Array.from({ length: ORBIT_DOTS }, (_, i) => (
        <span key={i} style={{ position: 'absolute', inset: 0, transform: `rotate(${(360 / ORBIT_DOTS) * i}deg)` }}>
          <span className="lx-od" style={{
            position: 'absolute', top: 0, left: 'calc(50% - 4px)', width: 8, height: 8, borderRadius: '50%',
            background: i % 3 === 0 ? GREEN : BLUE, boxShadow: `0 0 8px ${i % 3 === 0 ? GREEN : BLUE}`, opacity: 0.12,
          }} />
        </span>
      ))}
    </div>
  );
};

// ── Pulse: equalizer bars swelling from the centre ──────────────────────────
const BARS = 11;

const buildPulse = (root: HTMLElement) => [
  createTimeline({ loop: true, alternate: true, defaults: { ease: 'inOutQuad' } })
    .add(root.querySelectorAll('.lx-bar'), { scaleY: [0.2, 1], opacity: [0.45, 1], duration: 650 }, stagger(70, { from: 'center' })),
];

const Pulse: React.FC = () => {
  const ref = useAnime(buildPulse);
  return (
    <div ref={ref} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 52 }}>
      {Array.from({ length: BARS }, (_, i) => (
        <span key={i} className="lx-bar" style={{
          width: 6, height: '100%', borderRadius: 4, opacity: 0.45, transform: 'scaleY(0.2)',
          background: `linear-gradient(180deg, ${BLUE}, ${i % 2 ? GREEN : VIOLET})`,
        }} />
      ))}
    </div>
  );
};

// ── Trace: a glowing line drawing itself ────────────────────────────────────
const INFINITY = 'M60 30 C 60 12, 36 6, 22 16 C 8 26, 8 46, 22 52 C 36 60, 60 50, 60 30 C 60 12, 84 6, 98 16 C 112 26, 112 46, 98 52 C 84 60, 60 50, 60 30 Z';

const buildTrace = (root: HTMLElement) => {
  const drawables = svg.createDrawable(root.querySelectorAll('.lx-line'));
  return [animate(drawables, {
    draw: ['0 0', '0 1', '1 1'],
    duration: 2400,
    ease: 'inOutQuad',
    loop: true,
  })];
};

const Trace: React.FC = () => {
  const id = useId().replace(/:/g, '');
  const ref = useAnime(buildTrace);
  return (
    <div ref={ref}>
      <svg width="140" height="72" viewBox="0 0 120 60" fill="none" aria-hidden>
        <defs>
          <linearGradient id={`t${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={BLUE} /><stop offset="0.5" stopColor={VIOLET} /><stop offset="1" stopColor={GREEN} />
          </linearGradient>
        </defs>
        <path d={INFINITY} stroke={`${BLUE}22`} strokeWidth="3" strokeLinecap="round" />
        <path className="lx-line" d={INFINITY} stroke={`url(#t${id})`} strokeWidth="3.5" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 3px ${BLUE})` }} />
      </svg>
    </div>
  );
};

// ── Simple options: pure CSS (transform/opacity only), no JS animation loop ──
const SIMPLE_CSS = `
@keyframes lx-s-spin { to { transform: rotate(360deg); } }
@keyframes lx-s-dot  { 0%,80%,100% { opacity: .25; } 40% { opacity: 1; } }
@keyframes lx-s-bar  { from { transform: translateX(-100%); } to { transform: translateX(250%); } }
@media (prefers-reduced-motion: reduce) { .lx-s { animation-duration: 4s !important; } }
`;

const ensureSimpleStyles = () => {
  if (typeof document === 'undefined' || document.getElementById('lx-simple-styles')) return;
  const el = document.createElement('style');
  el.id = 'lx-simple-styles';
  el.textContent = SIMPLE_CSS;
  document.head.appendChild(el);
};

const Spinner: React.FC = () => {
  ensureSimpleStyles();
  return <span className="lx-s" style={{
    width: 26, height: 26, borderRadius: '50%', boxSizing: 'border-box',
    border: `3px solid ${BLUE}26`, borderTopColor: BLUE, animation: 'lx-s-spin .8s linear infinite',
  }} />;
};

const Dots: React.FC = () => {
  ensureSimpleStyles();
  return (
    <div style={{ display: 'flex', gap: 7 }}>
      {[0, 0.2, 0.4].map(d => (
        <span key={d} className="lx-s" style={{ width: 8, height: 8, borderRadius: '50%', background: BLUE, animation: `lx-s-dot 1.2s ease-in-out ${d}s infinite` }} />
      ))}
    </div>
  );
};

const Bar: React.FC = () => {
  ensureSimpleStyles();
  return (
    <div style={{ width: 120, height: 3, borderRadius: 3, background: `${BLUE}26`, overflow: 'hidden' }}>
      <span className="lx-s" style={{ display: 'block', width: '40%', height: '100%', borderRadius: 3, background: BLUE, animation: 'lx-s-bar 1.2s ease-in-out infinite' }} />
    </div>
  );
};

const VARIANTS: Record<LoadingAnimationId, React.FC> = {
  fluid: Fluid, ripple: Ripple, orbit: Orbit, pulse: Pulse, trace: Trace,
  spinner: Spinner, dots: Dots, bar: Bar,
};

/** Animated loading indicator (Anime.js). Uses the animation chosen in Settings → Dashboard. */
const LoadingAnimation: React.FC<Props> = ({ variant, height = 120, label }) => {
  const chosen = useLoadingAnimation();
  const Variant = VARIANTS[variant ?? chosen];

  return (
    <div
      role="status"
      aria-label={label ?? 'Loading'}
      style={{ height, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}
    >
      <Variant key={variant ?? chosen} />
      {label && <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.04em', color: 'var(--aw-text-muted, #94a3b8)' }}>{label}</span>}
    </div>
  );
};

export default LoadingAnimation;
