import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import {
  Activity,
  Users,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Minimize2,
  Maximize2,
  Cpu,
  Zap,
  Server,
  Globe,
  CheckCircle2,
} from 'lucide-react';
import { Select } from 'antd';
import { useComponentAnalytics } from '../../../../hooks/useAnalytics';

// One tone per series, taken from the shared theme so Settings changes apply.
const COLORS = ['var(--aw-accent)', 'var(--aw-success)', 'var(--aw-warning)', 'var(--aw-danger)', 'var(--aw-info, var(--aw-accent))', 'var(--aw-muted)'];
const TONE_MUTED = 'var(--aw-muted)';
const GRID = 'var(--aw-border)';

interface AnalyticsData {
  users: any[];
  sessions: any[];
  errors: any[];
  features: any[];
  performance: any[];
  realtime: any;
}

const VIEWS = ['Overview', 'Performance', 'Users'];

const FullScreenAnalytics: React.FC = () => {
  useComponentAnalytics('FullScreenAnalytics');

  const [data, setData] = useState<AnalyticsData>({
    users: [],
    sessions: [],
    errors: [],
    features: [],
    performance: [],
    realtime: {}
  });

  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeView, setActiveView] = useState('overview');
  const [refreshInterval] = useState(30000); // 30 seconds
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    loadAnalyticsData();
    const interval = setInterval(loadAnalyticsData, refreshInterval);
    return () => clearInterval(interval);
  }, [selectedTimeRange, refreshInterval]);

  const generateMockData = () => {
    // Helper to generate realistic looking mock data for visual demonstration
    return {
      sessions: Array.from({ length: 24 }).map((_, i) => ({
        time: `${i}:00`,
        sessions: Math.floor(Math.random() * 100) + 20,
        users: Math.floor(Math.random() * 60) + 10,
        errors: Math.floor(Math.random() * 5),
      })),
      errors: [
        { name: 'API Errors', value: 35 },
        { name: 'Auth Failures', value: 15 },
        { name: 'Network', value: 10 },
        { name: 'Validation', value: 40 },
      ],
      performance: Array.from({ length: 20 }).map((_, i) => ({
        time: `${i * 5}s`,
        cpu: 30 + Math.random() * 40,
        memory: 40 + Math.random() * 20,
        network: Math.random() * 100,
        responseTime: 100 + Math.random() * 200,
      })),
      features: [
        { feature: 'Login', usage: 1200, performance: 98 },
        { feature: 'Reports', usage: 850, performance: 85 },
        { feature: 'Transactions', usage: 600, performance: 92 },
        { feature: 'Search', usage: 400, performance: 95 },
        { feature: 'Admin', usage: 150, performance: 99 },
      ],
      realtime: {
        active_sessions: 42,
        total_errors: 12,
        unresolved_errors: 3,
        system_health: 98
      },
      users: Array.from({ length: 10 }).map((_, i) => ({
        username: `User ${i + 1}`,
        role: i === 0 ? 'Admin' : 'Member',
        status: Math.random() > 0.2 ? 'Active' : 'Idle',
        last_activity: '2 mins ago'
      }))
    };
  };

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // Simulating API latency and fallback to mock data for consistent UI demo
      await new Promise(r => setTimeout(r, 600));
      const mock = generateMockData();
      setData(mock as any);
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => console.error(e));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(e => console.error(e));
      setIsFullscreen(false);
    }
  };

  // --- Components ---

  const StatCard = ({ title, value, icon: Icon, trend, tone, subtitle }: any) => (
    <section className="aw-card aw-fade-in" style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="aw-inline" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p className="aw-label" style={{ margin: 0 }}>{title}</p>
          <p style={{ fontSize: 'calc(var(--type-body-size) + 18px)', fontWeight: 700, lineHeight: 1.1, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
          {subtitle && <p className="aw-meta" style={{ marginTop: 4 }}>{subtitle}</p>}
          {trend !== undefined && (
            <span className={`aw-pill ${trend >= 0 ? 'tone-success' : 'tone-danger'}`} style={{ marginTop: 10 }}>
              <TrendingUp size={10} style={trend >= 0 ? undefined : { transform: 'rotate(180deg)' }} /> {Math.abs(trend)}%
            </span>
          )}
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

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="aw-card" style={{ padding: 10, fontSize: 12, boxShadow: 'var(--aw-shadow)' }}>
          <p className="aw-meta" style={{ fontWeight: 700, borderBottom: '1px solid var(--aw-border)', paddingBottom: 4, marginBottom: 6 }}>{label}</p>
          {payload.map((p: any, index: number) => (
            <div key={index} className="aw-inline" style={{ alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
              <span style={{ textTransform: 'capitalize' }}>{p.name}:</span>
              <strong style={{ fontFamily: 'monospace' }}>{p.value}</strong>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const tick = { fontSize: 10, fill: TONE_MUTED };

  return (
    <div className="app-window">
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">Live Ops Center</h1>
          <p className="aw-desc" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Globe size={11} /> Connected · <span style={{ fontFamily: 'monospace', color: 'var(--aw-success)' }}>{lastUpdated.toLocaleTimeString()}</span>
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
              <StatCard title="Active Sessions" value={data.realtime.active_sessions} icon={Users} trend={12} tone="var(--aw-accent)" subtitle="Currently online" />
              <StatCard title="Total Errors" value={Math.floor(Math.random() * 50)} icon={AlertTriangle} trend={-5} tone="var(--aw-danger)" subtitle="Last 24 hours" />
              <StatCard title="Avg Response" value="145ms" icon={Zap} trend={-2} tone="var(--aw-success)" subtitle="Network latency" />
              <StatCard title="System Load" value="42%" icon={Cpu} trend={8} tone="var(--aw-warning)" subtitle="CPU Utilization" />
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(260px, 1fr)', gap: 'var(--aw-gap)' }}>
              <ChartCard title="Traffic Volume & User Load" height={350}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.sessions}>
                    <defs>
                      <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" style={{ stopColor: 'var(--aw-accent)', stopOpacity: 0.3 }} />
                        <stop offset="95%" style={{ stopColor: 'var(--aw-accent)', stopOpacity: 0 }} />
                      </linearGradient>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" style={{ stopColor: 'var(--aw-success)', stopOpacity: 0.3 }} />
                        <stop offset="95%" style={{ stopColor: 'var(--aw-success)', stopOpacity: 0 }} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={tick} />
                    <YAxis axisLine={false} tickLine={false} tick={tick} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="sessions" stroke="var(--aw-accent)" strokeWidth={2} fillOpacity={1} fill="url(#colorSessions)" />
                    <Area type="monotone" dataKey="users" stroke="var(--aw-success)" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Error Breakdown" height={350}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.errors} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                      {data.errors.map((_entry, index) => (
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
              </ChartCard>
            </div>

            {/* Performance Strip */}
            <ChartCard title="System Resources (Live Stream)" height={250}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.performance}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={tick} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="cpu" stroke="var(--aw-danger)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="memory" stroke="var(--aw-warning)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="network" stroke="var(--aw-info, var(--aw-accent))" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}

        {activeView === 'performance' && (
          <div className="aw-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--aw-gap)', alignItems: 'start' }}>
            {/* Detailed Feature Performance */}
            <ChartCard title="Feature Response Latency" height={400}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={data.features}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="feature" type="category" width={100} tick={{ fontSize: 11, fontWeight: 700, fill: 'var(--aw-text)' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="performance" fill="var(--aw-accent)" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <div className="aw-stack">
              {['Login Service', 'Database Primary', 'Cache Layer', 'Search Index'].map((svc, i) => (
                <section key={i} className="aw-card">
                  <div className="aw-inline" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="aw-inline" style={{ alignItems: 'center', gap: 12 }}>
                      <span className="aw-card-icon" style={{ width: 34, height: 34 }}><Server size={18} /></span>
                      <span>
                        <strong style={{ textTransform: 'uppercase' }}>{svc}</strong>
                        <span className="aw-meta" style={{ display: 'block' }}>Uptime: 99.9%</span>
                      </span>
                    </span>
                    <span className="aw-pill tone-success"><CheckCircle2 size={12} /> Healthy</span>
                  </div>
                </section>
              ))}
            </div>
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
