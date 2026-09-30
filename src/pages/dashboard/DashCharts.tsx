import React from 'react';

// Small SVG charts for the dashboard widgets. Colours are theme tokens, so every chart follows
// Settings (accent, light / dark) with no per-chart colour code.

export interface Slice { label: string; value: number; color: string }

/** Ring chart: shares of a whole, with an optional label in the middle. */
export const Donut: React.FC<{ slices: Slice[]; size?: number; thickness?: number; center?: React.ReactNode; ariaLabel: string }> = ({
  slices, size = 132, thickness = 16, center, ariaLabel,
}) => {
  const total = slices.reduce((s, x) => s + Math.max(0, x.value), 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={ariaLabel}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={thickness} style={{ stroke: 'var(--aw-border)' }} />
        {total > 0 && slices.map((s, i) => {
          const len = (Math.max(0, s.value) / total) * c;
          const gap = slices.length > 1 && len > 3 ? 2 : 0;
          const el = (
            <circle
              key={i} cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={thickness}
              strokeDasharray={`${Math.max(0, len - gap)} ${c - Math.max(0, len - gap)}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              style={{ stroke: s.color }}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      {center && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', pointerEvents: 'none' }}>
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
        <path d={d} fill="none" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${(p / 100) * len} ${len}`} style={{ stroke: color }} />
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
  return (
    <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block', overflow: 'visible' }} role="img" aria-label={ariaLabel}>
      <path d={`${line} L${W} ${height} L0 ${height} Z`} style={{ fill: color, opacity: 0.14 }} />
      <path d={line} fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" style={{ stroke: color }} />
      <circle cx={last[0]} cy={last[1]} r={3.5} vectorEffect="non-scaling-stroke" style={{ fill: 'var(--aw-surface)', stroke: color }} strokeWidth={2} />
    </svg>
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
