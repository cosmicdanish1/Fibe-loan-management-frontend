import React, { useState, useEffect } from 'react';
import {
  ConfigProvider,
  DatePicker,
  Button,
  Spin,
  Typography,
  Tabs,
  Progress,
  Table
} from 'antd';
import {
  Download,
  RotateCcw,
  Users,
  Eye,
  AlertTriangle,
  Clock,
  TrendingUp,
  Activity,
  Zap,
  BarChart2,
  Calendar,
  ShieldCheck,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useComponentAnalytics } from '../../../../hooks/useAnalytics';

const { RangePicker } = DatePicker;
const { Text } = Typography;

interface DashboardData {
  totalSessions: number;
  activeUsers: number;
  totalPageViews: number;
  totalErrors: number;
  avgSessionDuration: number;
  topPages: Array<{ page: string; visits: number }>;
  topFeatures: Array<{ feature: string; usage: number }>;
  errorsByType: Array<{ type: string; count: number }>;
  sessionTrend: Array<{ date: string; sessions: number; users: number }>;
  performanceMetrics: Array<{ feature: string; avgTime: number }>;
}

const AnalyticsDashboard: React.FC = () => {
  const analytics = useComponentAnalytics('AnalyticsDashboard');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        const mockData: DashboardData = {
          totalSessions: 1247,
          activeUsers: 89,
          totalPageViews: 5632,
          totalErrors: 23,
          avgSessionDuration: 18.5,
          topPages: [
            { page: '/reports/member-ledger', visits: 342 },
            { page: '/masters/member', visits: 298 },
            { page: '/transaction/loan-payment', visits: 256 },
            { page: '/reports/cash-book', visits: 189 },
            { page: '/utility/member-balance', visits: 167 },
          ],
          topFeatures: [
            { feature: 'Member Lookup', usage: 456 },
            { feature: 'Report Generation', usage: 389 },
            { feature: 'Loan Payment', usage: 234 },
            { feature: 'Member Master', usage: 198 },
            { feature: 'Cash Book', usage: 156 },
          ],
          errorsByType: [
            { type: 'API Error', count: 12 },
            { type: 'Validation Error', count: 8 },
            { type: 'Network Error', count: 2 },
            { type: 'JavaScript Error', count: 1 },
          ],
          sessionTrend: [
            { date: 'Mon', sessions: 45, users: 23 },
            { date: 'Tue', sessions: 52, users: 28 },
            { date: 'Wed', sessions: 38, users: 19 },
            { date: 'Thu', sessions: 61, users: 34 },
            { date: 'Fri', sessions: 48, users: 26 },
            { date: 'Sat', sessions: 35, users: 18 },
            { date: 'Sun', sessions: 42, users: 22 },
          ],
          performanceMetrics: [
            { feature: 'Member Lookup', avgTime: 1.2 },
            { feature: 'Report Generation', avgTime: 3.8 },
            { feature: 'Data Loading', avgTime: 2.1 },
            { feature: 'Form Submission', avgTime: 0.9 },
            { feature: 'Page Navigation', avgTime: 0.6 },
          ],
        };

        setDashboardData(mockData);
        setLoading(false);
      }, 800);

      analytics.trackFeatureUsage({
        featureCategory: 'Analytics',
        featureName: 'Dashboard Load',
        actionType: 'view',
        sessionId: '',
      });
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // UI Components
  const KPIWidget = ({ title, value, icon: Icon, color, bgClass, trend }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300"
    >
      <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity ${color}`}>
        <Icon size={80} />
      </div>
      <div className="relative z-10">
        <div className={`w-10 h-10 ${bgClass} rounded-xl flex items-center justify-center mb-4 text-white shadow-lg`}>
          <Icon size={20} />
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{title}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800 tracking-tight">{value}</span>
            {trend && (
              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                <TrendingUp size={10} /> {trend}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );

  const SectionHeader = ({ title, icon: Icon }: any) => (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={16} className="text-indigo-500" />
      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">{title}</h3>
    </div>
  );

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
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-indigo-100">

        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between shrink-0 shadow-lg z-20">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-500 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-500/20">
              <BarChart2 size={20} />
            </div>
            <div>
              <h1 className="text-base font-black text-white uppercase tracking-tight leading-none">Analytics Hub</h1>
              <div className="flex items-center gap-2 mt-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                <ShieldCheck size={10} className="text-emerald-400" /> System Metrics v2.4
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <RangePicker
                className="bg-white/5 border-white/10 text-white hover:bg-white/10 input-dark-calendar w-64"
                suffixIcon={<Calendar size={14} className="text-slate-400" />}
                placeholder={['Start Date', 'End Date']}
              />
            </div>

            <div className="h-5 w-px bg-slate-700 mx-1" />

            <Button
              icon={<RotateCcw size={14} />}
              onClick={loadDashboardData}
              loading={loading}
              className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white text-[10px] font-bold uppercase tracking-widest border-0 h-9"
            >
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<Download size={14} />}
              className="bg-indigo-600 hover:bg-indigo-500 text-[10px] font-bold uppercase tracking-widest h-9 border-0 shadow-lg shadow-indigo-600/20"
            >
              Export
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading || !dashboardData ? (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <Spin size="large" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Aggregating Metrics...</span>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto space-y-6">

              {/* KPI Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPIWidget
                  title="Total Sessions"
                  value={dashboardData.totalSessions.toLocaleString()}
                  icon={Users}
                  bgClass="bg-indigo-500"
                  color="text-indigo-500"
                  trend="+12%"
                />
                <KPIWidget
                  title="Active Users"
                  value={dashboardData.activeUsers}
                  icon={Activity}
                  bgClass="bg-emerald-500"
                  color="text-emerald-500"
                  trend="+5%"
                />
                <KPIWidget
                  title="Total Page Views"
                  value={dashboardData.totalPageViews.toLocaleString()}
                  icon={Eye}
                  bgClass="bg-purple-500"
                  color="text-purple-500"
                />
                <KPIWidget
                  title="System Errors"
                  value={dashboardData.totalErrors}
                  icon={AlertTriangle}
                  bgClass="bg-rose-500"
                  color="text-rose-500"
                />
              </div>

              {/* Main Dashboard Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">

                {/* Left Column: Visuals */}
                <div className="lg:col-span-2 flex flex-col gap-6 h-full">
                  {/* Chart Card */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                      <SectionHeader title="Traffic Trend (7 Days)" icon={TrendingUp} />
                      <div className="flex gap-2">
                        {['Sessions', 'Users'].map(t => (
                          <div key={t} className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${t === 'Sessions' ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex-1 flex items-end gap-4 px-4 pb-4">
                      {dashboardData.sessionTrend.map((item, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                          <div className="w-full flex items-end justify-center gap-1 h-full relative">
                            {/* Bar 1 */}
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${(item.sessions / 80) * 100}%` }}
                              className="w-3 bg-indigo-500/20 group-hover:bg-indigo-500 rounded-t-sm transition-colors relative"
                            >
                              <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                                {item.sessions}
                              </div>
                            </motion.div>
                            {/* Bar 2 */}
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${(item.users / 80) * 100}%` }}
                              className="w-3 bg-emerald-500/20 group-hover:bg-emerald-500 rounded-t-sm transition-colors relative"
                            >
                              <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                                {item.users}
                              </div>
                            </motion.div>
                          </div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">{item.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Performance Bars */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm h-64 overflow-hidden flex flex-col">
                    <SectionHeader title="System Response Times" icon={Zap} />
                    <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
                      {dashboardData.performanceMetrics.map((item, i) => (
                        <div key={i}>
                          <div className="flex justify-between items-end mb-1">
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">{item.feature}</span>
                            <span className={`text-[10px] font-black ${item.avgTime > 2 ? 'text-amber-500' : 'text-emerald-500'}`}>{item.avgTime}s</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(item.avgTime / 5) * 100}%` }}
                              className={`h-full rounded-full ${item.avgTime > 2 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Lists */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
                  <div className="p-1 bg-slate-50 border-b border-slate-100 flex">
                    {['Pages', 'Features', 'Errors'].map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab.toLowerCase())}
                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg ${activeTab === tab.toLowerCase() ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                          }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <AnimatePresence mode="wait">
                      {activeTab === 'pages' && (
                        <motion.div key="pages" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1">
                          {dashboardData.topPages.map((page, i) => (
                            <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg group transition-colors cursor-default border border-transparent hover:border-slate-100">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <span className="text-[9px] font-black text-slate-300 w-4">{i + 1}</span>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-bold text-slate-700 truncate block max-w-[180px]">{page.page}</span>
                                </div>
                              </div>
                              <div className="bg-slate-100 text-slate-600 text-[10px] font-black px-2 py-1 rounded group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                {page.visits}
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                      {activeTab === 'features' && (
                        <motion.div key="features" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1">
                          {dashboardData.topFeatures.map((feat, i) => (
                            <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg group transition-colors cursor-default border border-transparent hover:border-slate-100">
                              <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-purple-50 text-purple-600 rounded-md"><Zap size={12} /></div>
                                <span className="text-xs font-bold text-slate-700">{feat.feature}</span>
                              </div>
                              <div className="text-[10px] font-black text-slate-400">
                                {feat.usage} uses
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                      {activeTab === 'errors' && (
                        <motion.div key="errors" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                          {dashboardData.errorsByType.map((err, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-rose-50/50 border border-rose-100 rounded-lg">
                              <div className="flex items-center gap-2">
                                <AlertTriangle size={14} className="text-rose-500" />
                                <span className="text-xs font-bold text-rose-700">{err.type}</span>
                              </div>
                              <span className="text-[10px] font-black text-white bg-rose-500 px-2 py-0.5 rounded-full">
                                {err.count}
                              </span>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

              </div>

              {/* Footer Stats */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-4 flex items-center justify-between text-white shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="bg-white/10 p-2 rounded-lg">
                    <Clock size={20} className="text-indigo-300" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Avg. Session Time</span>
                    <span className="text-xl font-black tracking-tight">{dashboardData.avgSessionDuration} Min</span>
                  </div>
                </div>
                <div className="flex gap-8">
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase block text-right">Server Load</span>
                    <span className="text-sm font-black text-emerald-400">12% Idle</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase block text-right">Database</span>
                    <span className="text-sm font-black text-indigo-400">Connected</span>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        <style>{`
            .input-dark-calendar {
                color: white !important;
            }
            .input-dark-calendar input {
                color: white !important;
            }
            .input-dark-calendar .ant-picker-suffix {
                color: #94a3b8 !important;
            }
            .custom-scrollbar::-webkit-scrollbar {
                width: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
                background: transparent;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
            }
        `}</style>
      </div>
    </ConfigProvider>
  );
};

export default AnalyticsDashboard;
