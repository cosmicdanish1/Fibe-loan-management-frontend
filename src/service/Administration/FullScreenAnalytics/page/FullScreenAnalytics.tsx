import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  Activity,
  Users,
  AlertTriangle,
  RefreshCw,
  Minimize2,
  Maximize2,
  Globe,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { Select } from 'antd';
import { useComponentAnalytics } from '../../../../hooks/useAnalytics';
import apiService from '../../../../services/api';

// One tone per series, taken from the shared theme so Settings changes apply.
const COLORS = ['var(--aw-danger)', 'var(--aw-success)', 'var(--aw-warning)', 'var(--aw-accent)', 'var(--aw-info, var(--aw-accent))', 'var(--aw-muted)'];

interface AnalyticsStatus {
  active_sessions: number;
  total_errors: number;
  unresolved_errors: number;
}

interface AnalyticsUserRow {
  user_id?: number;
  username?: string;
  member_number?: string;
  user_role?: string;
  last_activity?: string;
  session_count?: number | string;
  error_count?: number | string;
  feature_usage_count?: number | string;
}

const VIEWS = ['Overview', 'Performance', 'Users'];

const RANGE_MS: Record<string, number> = {
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
};

// The backend wraps controller results in { success, data: <controller result> } and the
// analytics controller wraps again - unwrap up to two levels.
const unwrap = (res: any): any => (res?.data && typeof res.data === 'object' && 'data' in res.data ? res.data.data : res?.data);

// --- Components (module level so they keep their identity between renders) ---

const StatCard = ({ title, value, icon: Icon, tone, subtitle }: any) => (
  <section className="aw-card aw-fade-in" style={{ position: 'relative', overflow: 'hidden' }}>
    <div className="aw-inline" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <p className="aw-label" style={{ margin: 0 }}>{title}</p>
        <p style={{ fontSize: 'calc(var(--type-body-size) + 18px)', fontWeight: 700, lineHeight: 1.1, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
        {subtitle && <p className="aw-meta" style={{ marginTop: 4 }}>{subtitle}</p>}
      </div>
      <span className="aw-card-icon" style={{ width: 40, height: 40, ['--aw-accent' as any]: tone, ['--aw-accent-soft' as any]: `color-mix(in srgb, ${tone} 14%, transparent)` }}>
        <Icon size={20} />
      </span>
    </div>
  </section>
);

const ChartCard = ({ title, children, height = 300 }: any) => (
  <section className="aw-card" style={{ height: '100%' }}>
    <div className="aw-card-head">
      <span className="aw-card-icon"><Activity size={14} /></span>
      <h2 className="aw-card-title">{title}</h2>
    </div>
    <div style={{ height }} className="w-full">
      {children}
    </div>
  </section>
);

const NoData: React.FC<{ note?: string | undefined }> = ({ note }) => (
  <div className="aw-empty" style={{ height: '100%', justifyContent: 'center' }}>
    <Activity size={26} />
    <strong className="aw-strong">No data available</strong>
    {note && <span className="aw-meta">{note}</span>}
  </div>
);

// Custom Recharts Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="aw-card" style={{ padding: 10, fontSize: 12, boxShadow: 'var(--aw-shadow)' }}>
        {label !== undefined && (
          <p className="aw-meta" style={{ fontWeight: 700, borderBottom: '1px solid var(--aw-border)', paddingBottom: 4, marginBottom: 6 }}>{label}</p>
        )}
        {payload.map((p: any, index: number) => (
          <div key={index} className="aw-inline" style={{ alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.payload?.fill || p.color }} />
            <span style={{ textTransform: 'capitalize' }}>{p.name}:</span>
            <strong style={{ fontFamily: 'monospace' }}>{p.value}</strong>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const FullScreenAnalytics: React.FC = () => {
  useComponentAnalytics('FullScreenAnalytics');

  const [status, setStatus] = useState<AnalyticsStatus | null>(null);
  const [users, setUsers] = useState<AnalyticsUserRow[]>([]);
  const [loadError, setLoadError] = useState('');

  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeView, setActiveView] = useState('overview');
  const [refreshInterval] = useState(30000); // 30 seconds
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const loadSeq = useRef(0);

  const loadAnalyticsData = useCallback(async () => {
    const seq = ++loadSeq.current;
    setLoading(true);
    try {
      const startDate = new Date(Date.now() - (RANGE_MS[selectedTimeRange] ?? RANGE_MS['24h']!)).toISOString();
      const [statusRes, usersRes] = await Promise.all([
        apiService.get('/analytics/status'),
        apiService.get('/analytics/users', { params: { start_date: startDate, limit: 50 } }),
      ]);
      if (seq !== loadSeq.current) return;

      const s = unwrap(statusRes);
      setStatus(statusRes.success && s && typeof s === 'object'
        ? {
          active_sessions: Number(s.active_sessions) || 0,
          total_errors: Number(s.total_errors) || 0,
          unresolved_errors: Number(s.unresolved_errors) || 0,
        }
        : null);

      const u = unwrap(usersRes);
      setUsers(usersRes.success && Array.isArray(u) ? u : []);

      if (!statusRes.success && !usersRes.success) {
        setLoadError(statusRes.message || usersRes.message || 'Analytics service is not reachable.');
      } else {
        setLoadError('');
        setLastUpdated(new Date());
      }
    } catch (e: any) {
      if (seq !== loadSeq.current) return;
      console.error(e);
      setLoadError(e?.message || 'Failed to load analytics.');
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [selectedTimeRange]);

  useEffect(() => {
    loadAnalyticsData();
    const interval = setInterval(loadAnalyticsData, refreshInterval);
    return () => clearInterval(interval);
  }, [loadAnalyticsData, refreshInterval]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => console.error(e));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(e => console.error(e));
      setIsFullscreen(false);
    }
  };

  const fmt = (v: number | undefined) => (v === undefined ? '—' : v.toLocaleString());

  const resolvedErrors = status ? Math.max(0, status.total_errors - status.unresolved_errors) : 0;
  const errorBreakdown = status && status.total_errors > 0
    ? [
      { name: 'Unresolved', value: status.unresolved_errors },
      { name: 'Resolved', value: resolvedErrors },
    ]
    : [];

  return (
    <div className="app-window">
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">Live Ops Center</h1>
          <p className="aw-desc" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Globe size={11} />
            {loadError
              ? <span style={{ color: 'var(--aw-danger)' }}>Not connected - {loadError}</span>
              : <>Connected · <span style={{ fontFamily: 'monospace', color: 'var(--aw-success)' }}>{lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}</span></>}
          </p>
        </div>
        <div className="aw-actions">
          <div className="aw-seg" role="tablist" style={{ ['--seg-index' as any]: Math.max(0, VIEWS.findIndex(v => v.toLowerCase() === activeView)), ['--seg-count' as any]: VIEWS.length }}>
            {VIEWS.map(v => (
              <button key={v} type="button" role="tab" aria-selected={activeView === v.toLowerCase()} onClick={() => setActiveView(v.toLowerCase())}>{v}</button>
            ))}
          </div>
          <Select
            value={selectedTimeRange}
            onChange={setSelectedTimeRange}
            aria-label="Time range"
            className="aw-select" popupClassName="aw-select-popup" style={{ width: 130 }}
            options={[
              { value: '1h', label: 'Last Hour' },
              { value: '24h', label: '24 Hours' },
              { value: '7d', label: '7 Days' },
            ]}
          />
          <button type="button" className="aw-icon-btn" onClick={toggleFullscreen} aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'} data-tip={isFullscreen ? 'Exit full screen' : 'Full screen'} data-tip-pos="bottom-end">
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button type="button" className="aw-btn aw-btn-primary" onClick={loadAnalyticsData} aria-label="Refresh">
            <RefreshCw size={13} className={loading ? 'aw-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <div className="aw-content">
        {activeView === 'overview' && (
          <div className="aw-stack aw-fade-in">
            {/* KPI Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--aw-gap)' }}>
              <StatCard title="Active Sessions" value={fmt(status?.active_sessions)} icon={Users} tone="var(--aw-accent)" subtitle="Currently online" />
              <StatCard title="Total Errors" value={fmt(status?.total_errors)} icon={AlertTriangle} tone="var(--aw-danger)" subtitle="All recorded errors" />
              <StatCard title="Unresolved Errors" value={fmt(status?.unresolved_errors)} icon={ShieldAlert} tone="var(--aw-warning)" subtitle="Awaiting resolution" />
              <StatCard title="Active Users" value={fmt(loadError ? undefined : users.length)} icon={UserCheck} tone="var(--aw-success)" subtitle={`With sessions in the last ${selectedTimeRange}`} />
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(260px, 1fr)', gap: 'var(--aw-gap)' }}>
              <ChartCard title="Traffic Volume & User Load" height={350}>
                <NoData note="The server does not provide a traffic time series yet." />
              </ChartCard>

              <ChartCard title="Error Breakdown" height={350}>
                {errorBreakdown.length === 0 ? (
                  <NoData note={status ? 'No errors have been recorded.' : undefined} />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={errorBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                        {errorBreakdown.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length] as string} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        formatter={(value) => <span className="aw-meta" style={{ fontWeight: 700, textTransform: 'uppercase' }}>{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>

            {/* Performance Strip */}
            <ChartCard title="System Resources" height={250}>
              <NoData note="CPU, memory and network metrics are not collected by the server." />
            </ChartCard>
          </div>
        )}

        {activeView === 'performance' && (
          <div className="aw-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--aw-gap)', alignItems: 'start' }}>
            <ChartCard title="Feature Response Latency" height={400}>
              <NoData note="Per-feature latency is not recorded by the server yet." />
            </ChartCard>
            <ChartCard title="Service Health" height={400}>
              <NoData note="Service uptime / health checks are not available." />
            </ChartCard>
          </div>
        )}

        {activeView === 'users' && (
          <div className="aw-fade-in">
            <section className="aw-card">
              <div className="aw-card-head">
                <span className="aw-card-icon"><Users size={14} /></span>
                <h2 className="aw-card-title">User Activity ({selectedTimeRange})</h2>
              </div>
              {users.length === 0 ? (
                <div style={{ height: 200 }}><NoData /></div>
              ) : (
                <div className="aw-table-wrap" style={{ maxHeight: '60vh' }}>
                  <table className="aw-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Role</th>
                        <th>Last Activity</th>
                        <th className="is-right">Sessions</th>
                        <th className="is-right">Features Used</th>
                        <th className="is-right">Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u, i) => (
                        <tr key={u.user_id ?? u.username ?? i}>
                          <td>{u.username || u.member_number || '—'}</td>
                          <td>{u.user_role || '—'}</td>
                          <td>{u.last_activity ? new Date(u.last_activity).toLocaleString() : '—'}</td>
                          <td className="is-right">{Number(u.session_count) || 0}</td>
                          <td className="is-right">{Number(u.feature_usage_count) || 0}</td>
                          <td className="is-right">{Number(u.error_count) || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      <div className="aw-footer">
        <span><span className="aw-status-dot" /> Live Ops Center · refreshes every {Math.round(refreshInterval / 1000)}s</span>
        <span>{selectedTimeRange}</span>
      </div>
    </div>
  );
};

export default FullScreenAnalytics;
