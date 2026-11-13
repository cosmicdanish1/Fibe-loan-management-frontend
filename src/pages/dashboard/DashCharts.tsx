import React, { useEffect, useId, useRef, useState } from 'react';

// Small SVG charts for the dashboard widgets. Colours are theme tokens, so every chart follows
// Settings (accent, light / dark) with no per-chart colour code. The draw-in animations are CSS
// classes from dashboard.css (dash-draw, dash-reveal), so they follow Settings → Animations too.

export interface Slice { label: string; value: number; color: string }

const motionOff = () =>
  typeof document === 'undefined'
  || document.documentElement.dataset.motion === 'off'
  || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const wholeNumber = (n: number) => Math.round(n).toLocaleString('en-IN');

/** A number that counts up to its value when it appears or changes. With animations off it shows the value at once. */
export const CountUp: React.FC<{ value: number; format?: (n: number) => string; duration?: number }> = ({
  value, format = wholeNumber, duration = 800,
}) => {
  const [shown, setShown] = useState(() => (motionOff() ? value : 0));
  const from = useRef(shown);
  useEffect(() => {
    if (motionOff() || !Number.isFinite(value)) { from.current = value; setShown(value); return; }
    const start = from.current;
    const t0 = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 4);
      const v = p >= 1 ? value : start + (value - start) * eased;
      from.current = v;
      setShown(v);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return <span className="dash-num">{format(shown)}</span>;
};

/** Ring chart: shares of a whole. The card's headline already carries the total, so by default the
 *  middle names the largest share ("44% Over 3 years") instead of repeating that number. */
export const Donut: React.FC<{ slices: Slice[]; size?: number; thickness?: number; center?: React.ReactNode; ariaLabel: string }> = ({
  slices, size = 124, thickness = 15, center, ariaLabel,
}) => {
  const total = slices.reduce((s, x) => s + Math.max(0, x.value), 0);
  if (center === undefined && total > 0) {
    const top = slices.reduce((a, b) => (b.value > a.value ? b : a));
    const share = (Math.max(0, top.value) / total) * 100;
    center = <><strong>{share >= 99.95 ? '100' : share.toFixed(share >= 10 ? 0 : 1)}%</strong><span>{top.label}</span></>;
  }
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const maskId = `dash-ring-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  let offset = 0;
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={ariaLabel} style={{ overflow: 'visible' }}>
        {/* The slices sit behind a mask whose stroke is drawn clockwise from the top, so the ring sweeps in. */}
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse" x={-8} y={-8} width={size + 16} height={size + 16}>
            <circle
              className="dash-draw" cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#fff" strokeWidth={thickness + 12}
              strokeDasharray={`${c} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`}
              style={{ ['--len' as any]: c }}
            />
          </mask>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={thickness} style={{ stroke: 'var(--aw-border)' }} />
        <g mask={`url(#${maskId})`}>
          {total > 0 && slices.map((s, i) => {
            const len = (Math.max(0, s.value) / total) * c;
            const gap = slices.length > 1 && len > 3 ? 2 : 0;
            const el = (
              <circle
                key={i} className="dash-seg" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={thickness}
                strokeDasharray={`${Math.max(0, len - gap)} ${c - Math.max(0, len - gap)}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ stroke: s.color, ['--seg-w' as any]: `${thickness}px` }}
              >
                <title>{`${s.label}: ${Math.round(s.value).toLocaleString('en-IN')}`}</title>
              </circle>
            );
            offset += len;
            return el;
          })}
        </g>
      </svg>
      {center && (
        <div className="dash-ring-center" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', pointerEvents: 'none' }}>
          {center}
        </div>
      )}
    </div>
  );
};

/** Half-circle gauge: one percentage against a target. */
export const HalfGauge: React.FC<{ percent: number; color?: string; width?: number; ariaLabel: string; children?: React.ReactNode }> = ({
  percent, color = 'var(--aw-accent)', width = 190, ariaLabel, children,
}) => {
  const p = Math.max(0, Math.min(100, percent));
  const stroke = 16;
  const r = (width - stroke) / 2;
  const cy = r + stroke / 2;
  const d = `M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${width - stroke / 2} ${cy}`;
  const len = Math.PI * r;
  return (
    <div style={{ position: 'relative', width, height: cy + stroke / 2 + 4, margin: '0 auto' }}>
      <svg width={width} height={cy + stroke / 2 + 2} role="img" aria-label={ariaLabel}>
        <path d={d} fill="none" strokeWidth={stroke} strokeLinecap="round" style={{ stroke: 'var(--aw-border)' }} />
        {p > 0 && (
          <path className="dash-draw" d={d} fill="none" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${(p / 100) * len} ${2 * (len + stroke)}`}
            style={{ stroke: color, ['--len' as any]: (p / 100) * len + stroke }} />
        )}
      </svg>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, textAlign: 'center' }}>{children}</div>
    </div>
  );
};

/** A tiny trend line with a soft area and a dot on the latest value. */
export const Sparkline: React.FC<{ values: number[]; height?: number; color?: string; ariaLabel: string }> = ({
  values, height = 44, color = 'var(--aw-accent)', ariaLabel,
}) => {
  if (values.length < 2) return null;
  const W = 200;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i): [number, number] => [(i / (values.length - 1)) * W, height - 6 - ((v - min) / span) * (height - 12)]);
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1]!;
  const DOT = 9;
  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      {/* The SVG is stretched to the card width, so it draws only the line and area. A circle drawn
          inside it would be stretched into an oval, so the end dot is a real round element. */}
      <svg className="dash-reveal" viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block', overflow: 'visible' }} role="img" aria-label={ariaLabel}>
        <path d={`${line} L${W} ${height} L0 ${height} Z`} style={{ fill: color, opacity: 0.14 }} />
        <path d={line} fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" style={{ stroke: color }} />
      </svg>
      <span
        aria-hidden
        className="dash-dot-in"
        style={{
          position: 'absolute', left: `calc(${(last[0] / W) * 100}% - ${DOT / 2}px)`, top: last[1] - DOT / 2,
          width: DOT, height: DOT, borderRadius: '50%', boxSizing: 'border-box',
          background: 'var(--aw-surface)', border: `2px solid ${color}`, pointerEvents: 'none',
        }}
      />
    </div>
  );
};

/** Legend row: colour dot, label, and a value on the right. */
export const LegendRow: React.FC<{ color: string; label: string; value: React.ReactNode; sub?: React.ReactNode }> = ({ color, label, value, sub }) => (
  <div className="aw-row" style={{ alignItems: 'center', gap: 10 }}>
    <span style={{ width: 9, height: 9, borderRadius: 3, background: color, flex: 'none' }} />
    <span style={{ flex: 1, minWidth: 0 }}>
      {label}
      {sub && <span className="aw-meta" style={{ display: 'block' }}>{sub}</span>}
    </span>
    <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</strong>
  </div>
);
