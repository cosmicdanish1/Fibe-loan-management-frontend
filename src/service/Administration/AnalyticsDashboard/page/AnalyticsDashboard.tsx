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

const NAV_ITEMS: Array<{ label: Section; badge: string }> = [
  { label: 'Overview', badge: '' },
  { label: 'Traffic', badge: '' },
  { label: 'Features', badge: '' },
  { label: 'Errors', badge: '23' },
  { label: 'Reports', badge: '' },
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
  { label: 'Page views', sub: '4.5 per session', value: '5,632', tone: 'var(--aw-accent)' },
  { label: 'System errors', sub: '1.8% of requests', value: '23', tone: 'var(--aw-danger)' },
  { label: 'Avg. session', sub: 'Up 1.2 min', value: '18.5m', tone: 'var(--aw-warning)' },
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

const TONE_USERS = 'var(--aw-info, var(--aw-accent))';

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
  const ranges: Range[] = ['7D', '30D', '90D'];
  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'pages', label: 'Pages' },
    { key: 'features', label: 'Features' },
    { key: 'errors', label: 'Errors' },
  ];

  return (
    <div className="app-window">
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">Analytics Hub — {section}</h1>
          <p className="aw-desc">{rangeLabel} · updated a moment ago</p>
        </div>
        <div className="aw-actions">
          <div className="aw-seg" role="tablist" style={{ ['--seg-index' as any]: ranges.indexOf(range), ['--seg-count' as any]: ranges.length }}>
            {ranges.map(r => (
              <button key={r} type="button" role="tab" aria-selected={range === r} onClick={() => setRange(r)}>{r}</button>
            ))}
          </div>
          <button type="button" className="aw-icon-btn" onClick={handleRefresh} aria-label="Refresh" data-tip="Refresh" data-tip-pos="bottom">
            <RefreshCw size={15} className={spinning ? 'aw-spin' : ''} />
          </button>
          <button type="button" className="aw-btn aw-btn-primary"><Download size={14} /> Export</button>
        </div>
      </div>

      <div className="aw-tabs" role="tablist">
        {NAV_ITEMS.map(n => (
          <button key={n.label} type="button" role="tab" className="aw-tab" aria-selected={section === n.label} onClick={() => setSection(n.label)}>
            {n.label}
            {n.badge && <span className="aw-pill tone-danger">{n.badge}</span>}
          </button>
        ))}
      </div>

      <div className="aw-content">
        <div className="aw-stack">
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.62fr) minmax(280px, 1fr)', gap: 'var(--aw-gap)', alignItems: 'start' }}>
            {/* Sessions chart card */}
            <section className="aw-card">
              <div className="aw-inline" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
                <div>
                  <p className="aw-label" style={{ margin: 0 }}>Total sessions</p>
                  <div className="aw-inline" style={{ alignItems: 'flex-end', gap: 10, marginTop: 8 }}>
                    <span style={{ fontSize: 'calc(var(--type-body-size) + 28px)', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>1,247</span>
                    <span className="aw-pill tone-success"><ArrowUp size={10} strokeWidth={3} /> 12%</span>
                  </div>
                  <p className="aw-meta" style={{ marginTop: 6 }}>vs. 1,113 in the previous period</p>
                </div>
                <div className="aw-inline" style={{ gap: 16, paddingTop: 4 }}>
                  <span className="aw-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--aw-accent)' }} />Sessions</span>
                  <span className="aw-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: TONE_USERS }} />Users</span>
                </div>
              </div>

              <div>
                <svg viewBox="0 0 700 240" preserveAspectRatio="none" style={{ width: '100%', height: 244, display: 'block', overflow: 'visible' }} role="img" aria-label="Sessions and users trend">
                  <defs>
                    <linearGradient id="hubSess" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" style={{ stopColor: 'var(--aw-accent)', stopOpacity: 0.35 }} />
                      <stop offset="100%" style={{ stopColor: 'var(--aw-accent)', stopOpacity: 0 }} />
                    </linearGradient>
                    <linearGradient id="hubUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" style={{ stopColor: TONE_USERS, stopOpacity: 0.2 }} />
                      <stop offset="100%" style={{ stopColor: TONE_USERS, stopOpacity: 0 }} />
                    </linearGradient>
                  </defs>
                  {chart.gridLines.map((y, i) => (
                    <line key={i} x1={0} x2={700} y1={y} y2={y} style={{ stroke: 'var(--aw-border)' }} strokeWidth={1} vectorEffect="non-scaling-stroke" />
                  ))}
                  <path d={chart.usersArea} fill="url(#hubUsers)" />
                  <path d={chart.sessionsArea} fill="url(#hubSess)" />
                  <path d={chart.usersLine} fill="none" style={{ stroke: TONE_USERS }} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                  <path d={chart.sessionsLine} fill="none" style={{ stroke: 'var(--aw-accent)' }} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                  <circle cx={chart.peak[0]} cy={chart.peak[1]} r={4.5} style={{ fill: 'var(--aw-surface)', stroke: 'var(--aw-accent)' }} strokeWidth={2.6} vectorEffect="non-scaling-stroke" />
                </svg>
                <div className="aw-inline" style={{ justifyContent: 'space-between', paddingTop: 10 }}>
                  {chart.axisLabels.map((lbl, i) => (
                    <span key={i} className="aw-meta" style={{ fontVariantNumeric: 'tabular-nums' }}>{lbl}</span>
                  ))}
                </div>
              </div>
            </section>

            {/* Active now + mini stats */}
            <div className="aw-stack">
              <section className="aw-card">
                <div className="aw-inline" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="aw-inline" style={{ alignItems: 'center', gap: 10 }}>
                    <span className="aw-card-icon"><Activity size={15} /></span>
                    <span className="aw-meta" style={{ fontWeight: 700 }}>Active now</span>
                  </span>
                  <span className="aw-inline" style={{ alignItems: 'baseline', gap: 7 }}>
                    <span style={{ fontSize: 'calc(var(--type-body-size) + 12px)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>89</span>
                    <strong style={{ color: 'var(--aw-success)' }}>+5%</strong>
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 34 }} role="img" aria-label="Recent activity">
                  {LIVE_SEED.map((v, i) => (
                    <span key={i} style={{ flex: 1, borderRadius: '3px 3px 1px 1px', height: `${v}%`, background: i > 19 ? 'var(--aw-accent)' : `color-mix(in srgb, var(--aw-accent) ${Math.round(22 + (i / 24) * 40)}%, transparent)` }} />
                  ))}
                </div>
              </section>

              <section className="aw-card">
                <div className="aw-rows">
                  {MINI_DATA.map(m => (
                    <div key={m.label} className="aw-row" style={{ alignItems: 'center', gap: 12 }}>
                      <span className="aw-card-icon" style={{ ['--aw-accent' as any]: m.tone }}>
                        <span style={{ width: 9, height: 9, borderRadius: 3, background: m.tone }} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div>{m.label}</div>
                        <div className="aw-meta">{m.sub}</div>
                      </div>
                      <strong style={{ fontSize: 'calc(var(--type-body-size) + 4px)', fontVariantNumeric: 'tabular-nums' }}>{m.value}</strong>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.62fr) minmax(280px, 1fr)', gap: 'var(--aw-gap)', alignItems: 'start' }}>
            {/* Response times */}
            <section className="aw-card">
              <div className="aw-card-head">
                <span className="aw-card-icon"><Zap size={14} /></span>
                <div>
                  <h2 className="aw-card-title">Response times</h2>
                  <p className="aw-meta">Average duration per operation</p>
                </div>
                <span className="aw-pill" style={{ marginLeft: 'auto' }}>Target under 2.0s</span>
              </div>
              <div className="aw-stack">
                {PERF_RAW.map(p => {
                  const slow = p.avgTime > 2;
                  const tone = slow ? 'var(--aw-warning)' : 'var(--aw-success)';
                  const width = Math.min(100, (p.avgTime / 4.2) * 100);
                  return (
                    <div key={p.feature} style={{ display: 'grid', gridTemplateColumns: '170px minmax(0, 1fr) 56px', alignItems: 'center', gap: 16 }}>
                      <span>{p.feature}</span>
                      <div className="aw-bar" style={{ height: 8 }}><span style={{ width: `${width.toFixed(0)}%`, background: tone, transition: 'width .7s cubic-bezier(.2,.8,.2,1)' }} /></div>
                      <strong style={{ textAlign: 'right', color: tone, fontVariantNumeric: 'tabular-nums' }}>{p.avgTime.toFixed(1)}s</strong>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Tabbed panel */}
            <section className="aw-card">
              <div className="aw-seg" role="tablist" style={{ ['--seg-index' as any]: tabs.findIndex(t => t.key === tab), ['--seg-count' as any]: tabs.length }}>
                {tabs.map(t => (
                  <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}>{t.label}</button>
                ))}
              </div>

              {tab === 'pages' && (
                <div className="aw-rows">
                  {PAGES.map((p, i) => (
                    <div key={p.page} className="aw-row" style={{ alignItems: 'center', gap: 12 }}>
                      <span className="aw-meta" style={{ width: 12 }}>{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.page}</div>
                        <div className="aw-bar" style={{ height: 4, marginTop: 6 }}><span style={{ width: `${((p.visits / 342) * 100).toFixed(0)}%` }} /></div>
                      </div>
                      <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{p.visits}</strong>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'features' && (
                <div className="aw-rows">
                  {FEATURES.map(f => (
                    <div key={f.feature} className="aw-row" style={{ alignItems: 'center', gap: 12 }}>
                      <span className="aw-card-icon" style={{ width: 28, height: 28 }}><Zap size={14} /></span>
                      <span style={{ flex: 1, minWidth: 0 }}>{f.feature}</span>
                      <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{f.usage}</strong>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'errors' && (
                <div className="aw-stack" style={{ gap: 8 }}>
                  {ERRORS.map(e => (
                    <div key={e.type} className="aw-alert aw-alert-danger" style={{ alignItems: 'center' }}>
                      <AlertCircle size={15} />
                      <span style={{ flex: 1, minWidth: 0 }}>{e.type}</span>
                      <span className="aw-pill tone-danger">{e.count}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="aw-row" style={{ borderBottom: 0, borderTop: '1px solid var(--aw-border)', paddingTop: 10 }}>
                <span className="aw-meta">Avg. session 18.5 min</span>
                <a href="#" onClick={(e) => e.preventDefault()} style={{ fontWeight: 700, color: 'var(--aw-accent)' }}>View report</a>
              </div>
            </section>
          </div>
        </div>
      </div>

      <div className="aw-footer">
        <span><span className="aw-status-dot" /> All systems normal · Live telemetry · 12 nodes</span>
        <span>Synced 2 min ago</span>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
