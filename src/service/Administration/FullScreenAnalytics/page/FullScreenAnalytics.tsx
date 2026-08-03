import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, ComposedChart
} from 'recharts';
import {
  Activity,
  Users,
  AlertTriangle,
  TrendingUp,
  Clock,
  RefreshCw,
  Download,
  Minimize2,
  Maximize2,
  Cpu,
  HardDrive,
  Wifi,
  Zap,
  Server,
  Globe,
  Database,
  Search,
  CheckCircle2,
  X
} from 'lucide-react';
import { ConfigProvider, Select, Button, Badge } from 'antd';
import { useComponentAnalytics } from '../../../../hooks/useAnalytics';
import { analyticsService } from '../../../../services/analyticsService';

const { Option } = Select;
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface AnalyticsData {
  users: any[];
  sessions: any[];
  errors: any[];
  features: any[];
  performance: any[];
  realtime: any;
}

const FullScreenAnalytics: React.FC = () => {
  const analytics = useComponentAnalytics('FullScreenAnalytics');

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
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    loadAnalyticsData();
    const interval = setInterval(loadAnalyticsData, refreshInterval);
    return () => clearInterval(interval);
  }, [selectedTimeRange, refreshInterval]);

  const generateMockData = () => {
    // Helper to generate realistic looking mock data for visual demonstration
    const now = new Date();
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

  const StatCard = ({ title, value, icon: Icon, trend, color, subtitle }: any) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group"
    >
      <div className={`absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity text-${color}-500 transform rotate-12`}>
        <Icon size={100} />
      </div>

      <div className="relative z-10 flex justify-between items-start">
        <div>
          <p className="fz-small font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
          <h3 className="text-3xl font-black text-slate-800 tracking-tight">{value}</h3>
          {subtitle && <p className="fz-small font-bold text-slate-400 mt-1">{subtitle}</p>}

          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-3 px-2 py-1 rounded w-fit ${trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {trend >= 0 ? <TrendingUp size={10} /> : <TrendingUp size={10} className="rotate-180" />}
              <span className="fz-tiny font-black">{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-${color}-50 text-${color}-600 shadow-sm`}>
          <Icon size={20} />
        </div>
      </div>
    </motion.div>
  );

  const ChartCard = ({ title, children, height = 300 }: any) => (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-2">
          <Activity size={14} className="text-indigo-500" /> {title}
        </h3>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
        </div>
      </div>
      <div style={{ height }} className="w-full">
        {children}
      </div>
    </div>
  );

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs">
          <p className="font-bold mb-2 opacity-70 border-b border-slate-700 pb-1">{label}</p>
          {payload.map((p: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="capitalize">{p.name}:</span>
              <span className="font-mono font-bold">{p.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#6366f1',
          borderRadius: 8,
          fontFamily: "'Inter', sans-serif"
        }
      }}
    >
      <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans selection:bg-indigo-100">

        {/* Compact Premium Header */}
        <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between shadow-lg sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute -inset-1 rounded-full bg-emerald-500/30 animate-ping"></div>
              <div className="bg-emerald-500 p-1.5 rounded-lg text-white relative z-10">
                <Activity size={18} />
              </div>
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-tight leading-none">Live Ops Center</h1>
              <div className="flex items-center gap-2 mt-1 fz-tiny font-bold text-slate-400 uppercase tracking-widest leading-none">
                <Globe size={10} className="text-indigo-400" />
                <span>Connected</span>
                <span className="w-1 h-1 bg-slate-600 rounded-full mx-1"></span>
                <span className="font-mono text-emerald-400">{lastUpdated.toLocaleTimeString()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-white/10 p-1 rounded-lg border border-white/5">
              {['Overview', 'Performance', 'Users'].map(v => (
                <button
                  key={v}
                  onClick={() => setActiveView(v.toLowerCase())}
                  className={`px-3 py-1 fz-tiny font-bold uppercase tracking-widest rounded transition-all ${activeView === v.toLowerCase()
                      ? 'bg-white text-indigo-900 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                    }`}
                >
                  {v}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-white/10 mx-1"></div>

            <Select
              value={selectedTimeRange}
              onChange={setSelectedTimeRange}
              size="small"
              className="w-28 font-bold"
              dropdownStyle={{ fontWeight: 600, fontSize: 12 }}
            >
              <Option value="1h">Last Hour</Option>
              <Option value="24h">24 Hours</Option>
              <Option value="7d">7 Days</Option>
            </Select>

            <Button
              icon={isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              onClick={toggleFullscreen}
              size="small"
              className="bg-white/10 border-white/10 text-white hover:bg-white/20 border-0 flex items-center justify-center"
            />
            <Button
              icon={<RefreshCw size={12} className={loading ? 'animate-spin' : ''} />}
              onClick={loadAnalyticsData}
              size="small"
              className="bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-500 border-0 flex items-center justify-center shadow-lg shadow-indigo-600/20"
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-auto">
          <AnimatePresence mode="wait">
            {activeView === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-[1600px] mx-auto space-y-6"
              >
                {/* KPI Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard
                    title="Active Sessions"
                    value={data.realtime.active_sessions}
                    icon={Users}
                    trend={12}
                    color="indigo"
                    subtitle="Currently online"
                  />
                  <StatCard
                    title="Total Errors"
                    value={Math.floor(Math.random() * 50)}
                    icon={AlertTriangle}
                    trend={-5}
                    color="rose"
                    subtitle="Last 24 hours"
                  />
                  <StatCard
                    title="Avg Response"
                    value="145ms"
                    icon={Zap}
                    trend={-2}
                    color="emerald"
                    subtitle="Network latency"
                  />
                  <StatCard
                    title="System Load"
                    value="42%"
                    icon={Cpu}
                    trend={8}
                    color="amber"
                    subtitle="CPU Utilization"
                  />
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Main Area Chart */}
                  <div className="lg:col-span-2">
                    <ChartCard title="Traffic Volume & User Load" height={350}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.sessions}>
                          <defs>
                            <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="sessions" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorSessions)" />
                          <Area type="monotone" dataKey="users" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  </div>

                  {/* Pie Chart */}
                  <div>
                    <ChartCard title="Error Breakdown" height={350}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.errors}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            {data.errors.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                            formatter={(value) => <span className="fz-small font-bold text-slate-500 uppercase">{value}</span>}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  </div>
                </div>

                {/* Performance Strip */}
                <ChartCard title="System Resources (Live Stream)" height={250}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.performance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="cpu" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                      <Line type="monotone" dataKey="memory" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                      <Line type="monotone" dataKey="network" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
              </motion.div>
            )}

            {activeView === 'performance' && (
              <motion.div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                  {/* Detailed Feature Performance */}
                  <ChartCard title="Feature Response Latency" height={400}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={data.features}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="feature" type="category" width={100} tick={{ fontSize: 11, fontWeight: 700, fill: '#334155' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="performance" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <div className="space-y-4">
                    {['Login Service', 'Database Primary', 'Cache Layer', 'Search Index'].map((svc, i) => (
                      <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-slate-100 p-2 rounded-lg text-slate-500">
                            <Server size={18} />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-700 uppercase">{svc}</h4>
                            <p className="fz-small font-bold text-slate-400">Uptime: 99.9%</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                          <CheckCircle2 size={12} />
                          <span className="fz-small font-black uppercase">Healthy</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </ConfigProvider>
  );
};

export default FullScreenAnalytics;
