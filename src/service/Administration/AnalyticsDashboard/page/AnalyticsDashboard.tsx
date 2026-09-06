import React, { useState, useMemo, useEffect } from 'react';
import { RefreshCw, ArrowUp, Download, Activity, AlertCircle, Zap } from 'lucide-react';
import { useComponentAnalytics } from '../../../../hooks/useAnalytics';

type Range = '7D' | '30D' | '90D';
type Tab = 'pages' | 'features' | 'errors';
type Section = 'Overview' | 'Traffic' | 'Features' | 'Errors' | 'Reports';

interface TrendRow {
  label: string;
  s: number;
  u: number;
}

const NAV_ITEMS: Array<{ label: Section; color: string; badge: string }> = [
  { label: 'Overview', color: '#34D06A', badge: '' },
  { label: 'Traffic', color: '#5AA9FF', badge: '' },
  { label: 'Features', color: '#BF5AF2', badge: '' },
  { label: 'Errors', color: '#FF453A', badge: '23' },
  { label: 'Reports', color: '#FF9F0A', badge: '' },
];

const PERF_RAW = [
  { feature: 'Member lookup', avgTime: 1.2 },
  { feature: 'Report generation', avgTime: 3.8 },
  { feature: 'Data loading', avgTime: 2.1 },
  { feature: 'Form submission', avgTime: 0.9 },
  { feature: 'Page navigation', avgTime: 0.6 },
];

const PAGES = [
  { page: '/reports/member-ledger', visits: 342 },
  { page: '/masters/member', visits: 298 },
  { page: '/transaction/loan-payment', visits: 256 },
  { page: '/reports/cash-book', visits: 189 },
  { page: '/utility/member-balance', visits: 167 },
];

const FEATURES = [
  { feature: 'Member lookup', usage: 456 },
  { feature: 'Report generation', usage: 389 },
  { feature: 'Loan payment', usage: 234 },
  { feature: 'Member master', usage: 198 },
  { feature: 'Cash book', usage: 156 },
];

const ERRORS = [
  { type: 'API error', count: 12 },
  { type: 'Validation error', count: 8 },
  { type: 'Network error', count: 2 },
  { type: 'JavaScript error', count: 1 },
];

const MINI_DATA = [
  { label: 'Page views', sub: '4.5 per session', value: '5,632', color: '#BF5AF2', tint: 'rgba(191,90,242,0.16)' },
  { label: 'System errors', sub: '1.8% of requests', value: '23', color: '#FF453A', tint: 'rgba(255,69,58,0.16)' },
  { label: 'Avg. session', sub: 'Up 1.2 min', value: '18.5m', color: '#FF9F0A', tint: 'rgba(255,159,10,0.16)' },
];

const LIVE_SEED = [38, 52, 44, 61, 48, 72, 55, 40, 66, 58, 47, 80, 62, 50, 44, 68, 74, 56, 42, 60, 70, 52, 46, 64];

function trendData(range: Range): TrendRow[] {
  if (range === '7D') {
    return [
      { label: 'Mon', s: 45, u: 23 }, { label: 'Tue', s: 52, u: 28 }, { label: 'Wed', s: 38, u: 19 },
      { label: 'Thu', s: 61, u: 34 }, { label: 'Fri', s: 48, u: 26 }, { label: 'Sat', s: 35, u: 18 },
      { label: 'Sun', s: 42, u: 22 },
    ];
  }
  const n = range === '30D' ? 30 : 90;
  const out: TrendRow[] = [];
  for (let i = 0; i < n; i++) {
    const w = Math.sin(i / 4.4) * 9 + Math.sin(i / 1.7) * 5;
    const s = Math.round(46 + w + (i / n) * 16);
    out.push({ label: String(i + 1), s, u: Math.round(s * 0.53 + Math.sin(i / 3) * 2) });
  }
  return out;
}

function smoothPath(pts: Array<[number, number]>, close: boolean): string {
  if (!pts.length) return '';
  const first = pts[0]!;
  let d = `M${first[0].toFixed(1)} ${first[1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1]!;
    const c = pts[i]!;
    const mx = (p[0] + c[0]) / 2;
    d += ` C${mx.toFixed(1)} ${p[1].toFixed(1)},${mx.toFixed(1)} ${c[1].toFixed(1)},${c[0].toFixed(1)} ${c[1].toFixed(1)}`;
  }
  if (close) {
    const last = pts[pts.length - 1]!;
    d += ` L${last[0].toFixed(1)} 240 L${first[0].toFixed(1)} 240 Z`;
  }
  return d;
}

const navItemStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '7px 9px',
  border: 'none', borderRadius: 9, fontFamily: 'inherit', fontSize: 13.5,
  fontWeight: active ? 600 : 450, letterSpacing: '-0.012em', cursor: 'pointer',
  transition: 'background 150ms ease',
  background: active ? 'rgba(52,208,106,0.15)' : 'transparent',
  color: active ? '#EAFBF0' : '#A7ACB4',
});

const segBtnStyle = (active: boolean): React.CSSProperties => ({
  padding: '5px 11px', border: 'none', borderRadius: 7, fontFamily: 'inherit',
  fontSize: 12.5, fontWeight: active ? 600 : 500, cursor: 'pointer',
  transition: 'all 180ms ease',
  background: active ? 'rgba(255,255,255,0.14)' : 'transparent',
  color: active ? '#FFFFFF' : '#8B9099',
  boxShadow: active ? '0 1px 3px rgba(0,0,0,0.32)' : 'none',
});

const tabBtnStyle = (active: boolean): React.CSSProperties => ({
  flex: 1, padding: '7px 0', border: 'none', borderRadius: 8, fontFamily: 'inherit',
  fontSize: 13, fontWeight: active ? 600 : 500, letterSpacing: '-0.01em', cursor: 'pointer',
  transition: 'all 180ms ease',
  background: active ? 'rgba(255,255,255,0.14)' : 'transparent',
  color: active ? '#FFFFFF' : '#8B9099',
  boxShadow: active ? '0 1px 3px rgba(0,0,0,0.32)' : 'none',
});

const AnalyticsDashboard: React.FC = () => {
  const analytics = useComponentAnalytics('AnalyticsDashboard');
  const [range, setRange] = useState<Range>('7D');
  const [tab, setTab] = useState<Tab>('pages');
  const [section, setSection] = useState<Section>('Overview');
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    analytics.trackFeatureUsage({
      featureCategory: 'Analytics',
      featureName: 'Dashboard Load',
      actionType: 'view',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(() => trendData(range), [range]);

  const chart = useMemo(() => {
    const W = 700, H = 208, top = 16;
    const max = Math.max(...rows.map(r => r.s)) * 1.16;
    const xs = (i: number) => (rows.length === 1 ? W / 2 : (i / (rows.length - 1)) * W);
    const ys = (v: number) => top + H - (v / max) * H;
    const sPts: Array<[number, number]> = rows.map((r, i) => [xs(i), ys(r.s)]);
    const uPts: Array<[number, number]> = rows.map((r, i) => [xs(i), ys(r.u)]);
    const peakIdx = rows.reduce((b, r, i) => (r.s > rows[b]!.s ? i : b), 0);
    const step = Math.ceil(rows.length / 7);
    return {
      gridLines: [0, 1, 2, 3].map(i => top + (H / 3) * i),
      sessionsLine: smoothPath(sPts, false),
      sessionsArea: smoothPath(sPts, true),
      usersLine: smoothPath(uPts, false),
      usersArea: smoothPath(uPts, true),
      peak: sPts[peakIdx]!,
      axisLabels: rows.filter((_, i) => i % step === 0).map(r => r.label),
    };
  }, [rows]);

  const handleRefresh = () => {
    setSpinning(true);
    analytics.trackFeatureUsage({
      featureCategory: 'Analytics',
      featureName: 'Dashboard Refresh',
      actionType: 'click',
    });
    setTimeout(() => setSpinning(false), 600);
  };

  const rangeLabel = range === '7D' ? 'Last 7 days' : range === '30D' ? 'Last 30 days' : 'Last 90 days';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '236px minmax(0, 1fr)',
        minHeight: '100vh',
        background: '#0A0C10',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', 'Segoe UI', sans-serif",
        color: '#F5F5F7',
        fontSize: 15,
        lineHeight: 1.4,
        letterSpacing: '-0.012em',
      }}
    >
      <style>{`
        .ah-scope a { color: #34D06A; text-decoration: none; }
        .ah-scope a:hover { color: #7CE6A4; }
        .ah-scope ::selection { background: rgba(52,208,106,0.3); }
        .ah-scope .ah-scroll::-webkit-scrollbar { width: 9px; }
        .ah-scope .ah-scroll::-webkit-scrollbar-track { background: transparent; }
        .ah-scope .ah-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.16); border-radius: 9px; border: 3px solid transparent; background-clip: padding-box; }
        .ah-scope .ah-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.28); background-clip: padding-box; }
        .ah-icon-btn:hover { background: rgba(255,255,255,0.13) !important; }
        .ah-export-btn:hover { filter: brightness(1.08); }
        .ah-row-hover:hover { background: rgba(255,255,255,0.05); }
        @keyframes ah-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div className="ah-scope" style={{ display: 'contents' }}>
        {/* Sidebar */}
        <aside
          style={{
            position: 'sticky', top: 0, height: '100vh', display: 'flex', flexDirection: 'column',
            gap: 4, padding: '14px 10px 12px',
            background: 'linear-gradient(180deg, #14181F 0%, #0E1116 100%)',
            borderRight: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px 16px' }}>
            <div
              style={{
                width: 26, height: 26, flex: 'none', borderRadius: 8,
                background: 'linear-gradient(180deg, #4BE383 0%, #1FA25A 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 1px 0 rgba(255,255,255,0.3) inset, 0 3px 10px rgba(31,162,90,0.35)',
              }}
            >
              <Activity size={14} color="#052110" strokeWidth={2.6} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>Analytics Hub</div>
          </div>

          <div style={{ padding: '0 8px 7px', fontSize: 11, fontWeight: 600, color: '#6B7078', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            Monitor
          </div>
          {NAV_ITEMS.map(n => {
            const active = section === n.label;
            return (
              <button key={n.label} onClick={() => setSection(n.label)} style={navItemStyle(active)}>
                <span style={{ width: 7, height: 7, flex: 'none', borderRadius: 2.5, background: active ? n.color : 'rgba(255,255,255,0.22)' }} />
                <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap' }}>{n.label}</span>
                {n.badge ? (
                  <span style={{ flex: 'none', padding: '1px 7px', borderRadius: 20, background: 'rgba(255,69,58,0.9)', color: '#240605', fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {n.badge}
                  </span>
                ) : null}
              </button>
            );
          })}

          <div style={{ flex: 1 }} />

          <div style={{ margin: '0 4px 6px', padding: '12px 13px', borderRadius: 14, background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#B7BCC4' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34D06A', boxShadow: '0 0 0 3px rgba(52,208,106,0.18)' }} />
              All systems normal
            </div>
            <div style={{ marginTop: 8, fontSize: 11.5, color: '#6B7078', lineHeight: 1.5 }}>Live telemetry · 12 nodes<br />Synced 2 min ago</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px 4px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <div
              style={{
                width: 26, height: 26, flex: 'none', borderRadius: '50%',
                background: 'linear-gradient(180deg, #5B6472 0%, #3A414B 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600, color: '#E6E8EC',
              }}
            >
              RK
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Rahul Kumar</div>
              <div style={{ fontSize: 11, color: '#6B7078' }}>Administrator</div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', gap: 20, padding: '14px 26px',
              background: 'rgba(10,12,16,0.72)', backdropFilter: 'saturate(180%) blur(22px)',
              WebkitBackdropFilter: 'saturate(180%) blur(22px)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.024em', whiteSpace: 'nowrap' }}>Overview</div>
              <div style={{ fontSize: 12, color: '#6B7078', whiteSpace: 'nowrap', marginTop: 1 }}>{rangeLabel} · updated a moment ago</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 'none' }}>
              <div style={{ display: 'flex', padding: 2, borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {(['7D', '30D', '90D'] as Range[]).map(r => (
                  <button key={r} onClick={() => setRange(r)} style={segBtnStyle(range === r)}>{r}</button>
                ))}
              </div>
              <button
                className="ah-icon-btn"
                onClick={handleRefresh}
                title="Refresh"
                style={{
                  width: 32, height: 32, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 9, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.06)',
                  color: '#E6E8EC', cursor: 'pointer', transition: 'background 160ms ease',
                }}
              >
                <RefreshCw size={15} style={spinning ? { animation: 'ah-spin 600ms linear' } : undefined} />
              </button>
              <button
                className="ah-export-btn"
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, height: 32, padding: '0 14px', flex: 'none',
                  whiteSpace: 'nowrap', borderRadius: 9, border: 'none',
                  background: 'linear-gradient(180deg, #4BE383 0%, #22AE5F 100%)', color: '#052110',
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em', cursor: 'pointer',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.32) inset, 0 4px 14px rgba(34,174,95,0.28)',
                  transition: 'filter 160ms ease',
                }}
              >
                <Download size={14} strokeWidth={2.3} />
                Export
              </button>
            </div>
          </div>

          <div style={{ padding: '22px 26px 40px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.62fr) minmax(280px, 1fr)', gap: 18, alignItems: 'start' }}>
              {/* Sessions chart card */}
              <div
                style={{
                  minWidth: 0, padding: '22px 24px 16px', borderRadius: 22,
                  background: 'linear-gradient(170deg, rgba(52,208,106,0.10) 0%, rgba(255,255,255,0.035) 42%, rgba(255,255,255,0.018) 100%)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset, 0 20px 40px rgba(0,0,0,0.34)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: '#8B9099', whiteSpace: 'nowrap' }}>Total sessions</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginTop: 8 }}>
                      <span style={{ fontSize: 46, fontWeight: 600, letterSpacing: '-0.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>1,247</span>
                      <span
                        style={{
                          display: 'flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: 8,
                          background: 'rgba(52,208,106,0.16)', color: '#5BE08C', fontSize: 12.5, fontWeight: 600,
                          marginBottom: 5, whiteSpace: 'nowrap',
                        }}
                      >
                        <ArrowUp size={10} strokeWidth={3.2} />12%
                      </span>
                    </div>
                    <div style={{ marginTop: 7, fontSize: 12.5, color: '#6B7078', whiteSpace: 'nowrap' }}>vs. 1,113 in the previous period</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 'none', paddingTop: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#B7BCC4', whiteSpace: 'nowrap' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34D06A' }} />Sessions
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#B7BCC4', whiteSpace: 'nowrap' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#5AA9FF' }} />Users
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <svg viewBox="0 0 700 240" preserveAspectRatio="none" style={{ width: '100%', height: 244, display: 'block', overflow: 'visible' }}>
                    <defs>
                      <linearGradient id="hubSess" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34D06A" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#34D06A" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="hubUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#5AA9FF" stopOpacity={0.22} />
                        <stop offset="100%" stopColor="#5AA9FF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    {chart.gridLines.map((y, i) => (
                      <line key={i} x1={0} x2={700} y1={y} y2={y} stroke="rgba(255,255,255,0.055)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                    ))}
                    <path d={chart.usersArea} fill="url(#hubUsers)" />
                    <path d={chart.sessionsArea} fill="url(#hubSess)" />
                    <path d={chart.usersLine} fill="none" stroke="#5AA9FF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                    <path d={chart.sessionsLine} fill="none" stroke="#34D06A" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                    <circle cx={chart.peak[0]} cy={chart.peak[1]} r={4.5} fill="#0A0C10" stroke="#34D06A" strokeWidth={2.6} vectorEffect="non-scaling-stroke" />
                  </svg>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0' }}>
                    {chart.axisLabels.map((lbl, i) => (
                      <span key={i} style={{ fontSize: 11.5, color: '#6B7078', fontVariantNumeric: 'tabular-nums' }}>{lbl}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Active now + mini stats */}
              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div
                  style={{
                    padding: '16px 18px', borderRadius: 20,
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                    border: '1px solid rgba(255,255,255,0.075)',
                    boxShadow: '0 1px 0 rgba(255,255,255,0.05) inset, 0 14px 30px rgba(0,0,0,0.3)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <span style={{ width: 30, height: 30, flex: 'none', borderRadius: 10, background: 'rgba(90,169,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Activity size={15} color="#7EBBFF" strokeWidth={2} />
                      </span>
                      <span style={{ fontSize: 13, color: '#B7BCC4', whiteSpace: 'nowrap' }}>Active now</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, flex: 'none' }}>
                      <span style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>89</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#5BE08C' }}>+5%</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 34, marginTop: 14 }}>
                    {LIVE_SEED.map((v, i) => (
                      <span
                        key={i}
                        style={{
                          flex: 1, borderRadius: '3px 3px 1px 1px', height: `${v}%`,
                          background: i > 19 ? '#34D06A' : `rgba(52,208,106,${(0.22 + (i / 24) * 0.4).toFixed(2)})`,
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    padding: '6px 18px', borderRadius: 20,
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                    border: '1px solid rgba(255,255,255,0.075)',
                    boxShadow: '0 1px 0 rgba(255,255,255,0.05) inset, 0 14px 30px rgba(0,0,0,0.3)',
                  }}
                >
                  {MINI_DATA.map((m, i) => (
                    <div
                      key={m.label}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0',
                        borderBottom: i === MINI_DATA.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.07)',
                      }}
                    >
                      <span style={{ width: 30, height: 30, flex: 'none', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: m.tint }}>
                        <span style={{ width: 9, height: 9, borderRadius: 3, background: m.color }} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: '#EDEDEF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.label}</div>
                        <div style={{ fontSize: 11.5, color: '#6B7078', whiteSpace: 'nowrap', marginTop: 1 }}>{m.sub}</div>
                      </div>
                      <span style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums', flex: 'none' }}>{m.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.62fr) minmax(280px, 1fr)', gap: 18, alignItems: 'start' }}>
              {/* Response times */}
              <div
                style={{
                  minWidth: 0, padding: '20px 24px 22px', borderRadius: 22,
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                  border: '1px solid rgba(255,255,255,0.075)',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.05) inset, 0 18px 36px rgba(0,0,0,0.3)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: '-0.022em' }}>Response times</h2>
                    <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#6B7078' }}>Average duration per operation</p>
                  </div>
                  <span style={{ flex: 'none', padding: '4px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', fontSize: 12, color: '#B7BCC4', whiteSpace: 'nowrap' }}>
                    Target under 2.0s
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {PERF_RAW.map(p => {
                    const c = p.avgTime > 2 ? '#FF9F0A' : '#34D06A';
                    const width = Math.min(100, (p.avgTime / 4.2) * 100);
                    return (
                      <div key={p.feature} style={{ display: 'grid', gridTemplateColumns: '170px minmax(0, 1fr) 56px', alignItems: 'center', gap: 16 }}>
                        <span style={{ fontSize: 13.5, color: '#EDEDEF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.feature}</span>
                        <span style={{ height: 7, borderRadius: 7, background: 'rgba(255,255,255,0.065)', overflow: 'hidden', display: 'block' }}>
                          <span
                            style={{
                              display: 'block', height: '100%', borderRadius: 7, width: `${width.toFixed(0)}%`,
                              background: c, transition: 'width 700ms cubic-bezier(.2,.8,.2,1)',
                            }}
                          />
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 500, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: c }}>
                          {p.avgTime.toFixed(1)}s
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tabbed panel */}
              <div
                style={{
                  minWidth: 0, borderRadius: 22,
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                  border: '1px solid rgba(255,255,255,0.075)',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.05) inset, 0 18px 36px rgba(0,0,0,0.3)',
                  overflow: 'hidden',
                }}
              >
                <div style={{ padding: '16px 16px 12px' }}>
                  <div style={{ display: 'flex', padding: 2, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {(['Pages', 'Features', 'Errors'] as const).map(t => {
                      const key = t.toLowerCase() as Tab;
                      return (
                        <button key={t} onClick={() => setTab(key)} style={tabBtnStyle(tab === key)}>{t}</button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ padding: '0 8px 12px' }}>
                  {tab === 'pages' && (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {PAGES.map((p, i) => (
                        <div key={p.page} className="ah-row-hover" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 10px', borderRadius: 12, transition: 'background 140ms ease' }}>
                          <span style={{ fontSize: 12, color: '#5A5F67', width: 11, flex: 'none', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, color: '#EDEDEF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.page}</div>
                            <div style={{ height: 3, marginTop: 7, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: 3, width: `${((p.visits / 342) * 100).toFixed(0)}%`, background: 'rgba(52,208,106,0.7)' }} />
                            </div>
                          </div>
                          <span style={{ fontSize: 13, color: '#B7BCC4', flex: 'none', fontVariantNumeric: 'tabular-nums' }}>{p.visits}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {tab === 'features' && (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {FEATURES.map(f => (
                        <div key={f.feature} className="ah-row-hover" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 10px', borderRadius: 12, transition: 'background 140ms ease' }}>
                          <span style={{ width: 28, height: 28, flex: 'none', borderRadius: 9, background: 'rgba(191,90,242,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Zap size={14} color="#CE95F7" strokeWidth={2} />
                          </span>
                          <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: '#EDEDEF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.feature}</span>
                          <span style={{ fontSize: 13, color: '#B7BCC4', flex: 'none', fontVariantNumeric: 'tabular-nums' }}>{f.usage}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {tab === 'errors' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '2px 10px 6px' }}>
                      {ERRORS.map(e => (
                        <div key={e.type} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 13px', borderRadius: 13, background: 'rgba(255,69,58,0.08)', border: '1px solid rgba(255,69,58,0.16)' }}>
                          <AlertCircle size={15} color="#FF6B60" strokeWidth={2} />
                          <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: '#FFD9D6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.type}</span>
                          <span style={{ minWidth: 24, textAlign: 'center', padding: '2px 8px', borderRadius: 20, background: '#FF453A', color: '#240605', fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums', flex: 'none' }}>
                            {e.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                  <span style={{ fontSize: 12.5, color: '#6B7078', whiteSpace: 'nowrap' }}>Avg. session 18.5 min</span>
                  <a href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap' }}>View report</a>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
