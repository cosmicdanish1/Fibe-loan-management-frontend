import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Info,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  Code,
  Shield,
  Zap,
  Users,
  Award,
  Heart,
  Cpu,
  HardDrive,
  Clock
} from 'lucide-react';
import { ConfigProvider, Card, Tag, Divider, Spin } from 'antd';
import { motion } from 'framer-motion';
import { apiService } from '../../../../services/api';

interface SystemInfo {
  nodeVersion: string;
  platform: string;
  uptime: number;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  timestamp: string;
}

const About: React.FC = () => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSystemInfo = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.request<SystemInfo>('/admin/system-info', {
        method: 'GET',
      });
      if (response.success && response.data) {
        setSystemInfo(response.data);
      }
    } catch (err) {
      // Silent fail - system info is optional
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSystemInfo();
  }, [fetchSystemInfo]);

  const formatUptime = useCallback((seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  }, []);

  const techStack = useMemo(() => [
    { name: 'React', color: 'blue' },
    { name: 'TypeScript', color: 'cyan' },
    { name: 'Electron', color: 'purple' },
    { name: 'NestJS', color: 'red' },
    { name: 'PostgreSQL', color: 'indigo' },
    { name: 'Tailwind CSS', color: 'teal' }
  ], []);

  const companyInfo = useMemo(() => [
    { icon: <Building2 size={10} />, label: 'Company', value: 'Paper White Technology' },
    { icon: <Calendar size={10} />, label: 'Established', value: '2025' },
    { icon: <MapPin size={10} />, label: 'Location', value: 'India' },
    { icon: <Award size={10} />, label: 'Industry', value: 'Financial Technology' }
  ], []);

  const contactInfo = useMemo(() => [
    { icon: <Mail size={10} />, label: 'Email', value: 'support@paperwhitetech.com' },
    { icon: <Phone size={10} />, label: 'Phone', value: '+91 12345 67890' },
    { icon: <Globe size={10} />, label: 'Website', value: 'www.paperwhitetech.com' },
    { icon: <Shield size={10} />, label: 'Support', value: '24/7 Available' }
  ], []);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#3b82f6',
          borderRadius: 12,
        },
      }}
    >
      <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50 font-sans selection:bg-blue-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-900 border-b border-white/5 px-3 py-2 flex items-center justify-between z-10 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-blue-600 via-sky-600 to-blue-700 p-1.5 rounded-lg text-white shadow-lg shadow-blue-300/50 ring-2 ring-blue-100">
              <Info size={16} />
            </div>
            <div>
              <h1 className="text-sm font-black text-white tracking-tight leading-none uppercase">About System</h1>
              <div className="flex items-center gap-1 mt-0.5 fz-body font-bold text-slate-400 uppercase tracking-widest leading-none">
                <Zap size={9} className="text-blue-500" /> Loan Management System Information
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Tag color="blue" className="fz-label font-black uppercase m-0 px-2 py-0.5 leading-none h-5 flex items-center">
              Version 1.0.0
            </Tag>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-2 custom-scrollbar">
          <div className="max-w-4xl mx-auto grid grid-cols-2 gap-2">

            {/* Company Header Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="col-span-2 bg-gradient-to-br from-blue-600 via-sky-600 to-blue-700 rounded-xl p-4 text-white shadow-lg shadow-blue-200/50 relative overflow-hidden"
            >
              <Building2 size={80} className="absolute -right-4 -bottom-4 opacity-10" />
              <div className="relative z-10">
                <h2 className="text-lg font-black uppercase tracking-wider leading-none mb-1">Paper White Technology</h2>
                <p className="fz-small font-bold opacity-80 uppercase tracking-widest">Loan Management System</p>
                <div className="mt-3 flex items-center gap-2">
                  <Tag color="blue" className="bg-white/20 border-0 text-white font-black fz-body uppercase px-2 py-0.5 m-0 leading-none h-4 flex items-center">
                    Enterprise Edition
                  </Tag>
                  <Tag color="green" className="bg-white/20 border-0 text-white font-black fz-body uppercase px-2 py-0.5 m-0 leading-none h-4 flex items-center">
                    <Heart size={8} className="mr-1" /> Production Ready
                  </Tag>
                </div>
              </div>
            </motion.div>

            {/* Company Information */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white border border-blue-100 rounded-xl overflow-hidden shadow-sm"
            >
              <div className="bg-gradient-to-r from-blue-50 via-sky-50/50 to-blue-50 border-b border-blue-100 px-2.5 py-1.5">
                <h3 className="fz-body font-black text-blue-700 uppercase tracking-widest flex items-center gap-1">
                  <Building2 size={11} className="text-blue-500" />
                  Company Information
                </h3>
              </div>
              <div className="p-2 space-y-1.5">
                {companyInfo.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-1.5 bg-blue-50/30 rounded-lg hover:bg-blue-50/60 transition-colors">
                    <div className="flex items-center gap-1.5">
                      <div className="text-blue-500">{item.icon}</div>
                      <span className="fz-body font-bold text-slate-400 uppercase">{item.label}</span>
                    </div>
                    <span className="fz-body font-black text-slate-700">{item.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white border border-blue-100 rounded-xl overflow-hidden shadow-sm"
            >
              <div className="bg-gradient-to-r from-blue-50 via-sky-50/50 to-blue-50 border-b border-blue-100 px-2.5 py-1.5">
                <h3 className="fz-body font-black text-blue-700 uppercase tracking-widest flex items-center gap-1">
                  <Phone size={11} className="text-blue-500" />
                  Contact Details
                </h3>
              </div>
              <div className="p-2 space-y-1.5">
                {contactInfo.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-1.5 bg-blue-50/30 rounded-lg hover:bg-blue-50/60 transition-colors">
                    <div className="flex items-center gap-1.5">
                      <div className="text-blue-500">{item.icon}</div>
                      <span className="fz-body font-bold text-slate-400 uppercase">{item.label}</span>
                    </div>
                    <span className="fz-body font-black text-slate-700">{item.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Technology Stack */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white border border-blue-100 rounded-xl overflow-hidden shadow-sm"
            >
              <div className="bg-gradient-to-r from-blue-50 via-sky-50/50 to-blue-50 border-b border-blue-100 px-2.5 py-1.5">
                <h3 className="fz-body font-black text-blue-700 uppercase tracking-widest flex items-center gap-1">
                  <Code size={11} className="text-blue-500" />
                  Built With
                </h3>
              </div>
              <div className="p-2">
                <div className="flex flex-wrap gap-1.5">
                  {techStack.map((tech, idx) => (
                    <Tag
                      key={idx}
                      color={tech.color}
                      className="fz-body font-black uppercase m-0 px-2 py-0.5 leading-none h-5 flex items-center"
                    >
                      {tech.name}
                    </Tag>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* System Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white border border-blue-100 rounded-xl overflow-hidden shadow-sm"
            >
              <div className="bg-gradient-to-r from-blue-50 via-sky-50/50 to-blue-50 border-b border-blue-100 px-2.5 py-1.5">
                <h3 className="fz-body font-black text-blue-700 uppercase tracking-widest flex items-center gap-1">
                  <Cpu size={11} className="text-blue-500" />
                  System Status
                </h3>
              </div>
              <div className="p-2">
                <Spin spinning={loading} size="small">
                  {systemInfo ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between p-1.5 bg-blue-50/30 rounded-lg">
                        <div className="flex items-center gap-1.5">
                          <Cpu size={10} className="text-blue-500" />
                          <span className="fz-body font-bold text-slate-400 uppercase">Node Version</span>
                        </div>
                        <span className="fz-body font-black text-slate-700">{systemInfo.nodeVersion}</span>
                      </div>
                      <div className="flex items-center justify-between p-1.5 bg-blue-50/30 rounded-lg">
                        <div className="flex items-center gap-1.5">
                          <Clock size={10} className="text-blue-500" />
                          <span className="fz-body font-bold text-slate-400 uppercase">Uptime</span>
                        </div>
                        <span className="fz-body font-black text-slate-700">{formatUptime(systemInfo.uptime)}</span>
                      </div>
                      <div className="flex items-center justify-between p-1.5 bg-blue-50/30 rounded-lg">
                        <div className="flex items-center gap-1.5">
                          <HardDrive size={10} className="text-blue-500" />
                          <span className="fz-body font-bold text-slate-400 uppercase">Memory Used</span>
                        </div>
                        <span className="fz-body font-black text-slate-700">{systemInfo.memoryUsage.heapUsed} MB</span>
                      </div>
                      <div className="flex items-center justify-between p-1.5 bg-blue-50/30 rounded-lg">
                        <div className="flex items-center gap-1.5">
                          <HardDrive size={10} className="text-blue-500" />
                          <span className="fz-body font-bold text-slate-400 uppercase">Memory Total</span>
                        </div>
                        <span className="fz-body font-black text-slate-700">{systemInfo.memoryUsage.heapTotal} MB</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="fz-body font-bold text-slate-400 uppercase">System info unavailable</p>
                    </div>
                  )}
                </Spin>
              </div>
            </motion.div>

            {/* Features Highlight */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="col-span-2 bg-gradient-to-br from-white to-blue-50/20 border border-blue-100 rounded-xl overflow-hidden shadow-sm"
            >
              <div className="bg-gradient-to-r from-blue-50 via-sky-50/50 to-blue-50 border-b border-blue-100 px-2.5 py-1.5">
                <h3 className="fz-body font-black text-blue-700 uppercase tracking-widest flex items-center gap-1">
                  <Zap size={11} className="text-blue-500" />
                  Key Features
                </h3>
              </div>
              <div className="p-2">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { icon: <Users size={14} />, title: 'Member Management', desc: 'Complete member lifecycle' },
                    { icon: <Shield size={14} />, title: 'Secure Transactions', desc: 'Bank-grade security' },
                    { icon: <Zap size={14} />, title: 'Real-time Reports', desc: 'Instant analytics' },
                    { icon: <Code size={14} />, title: 'Modern Stack', desc: 'Latest technologies' },
                    { icon: <Heart size={14} />, title: 'User Friendly', desc: 'Intuitive interface' },
                    { icon: <Award size={14} />, title: 'Enterprise Ready', desc: 'Production tested' }
                  ].map((feature, idx) => (
                    <div key={idx} className="bg-blue-50/50 rounded-lg p-2 hover:bg-blue-50 transition-colors">
                      <div className="text-blue-600 mb-1">{feature.icon}</div>
                      <h4 className="fz-body font-black text-slate-700 uppercase tracking-tight leading-none mb-0.5">{feature.title}</h4>
                      <p className="fz-label font-bold text-slate-400 uppercase">{feature.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-blue-100 px-2.5 py-1.5 flex items-center justify-center shrink-0">
          <div className="flex items-center gap-1.5">
            <Heart size={10} className="text-rose-500" />
            <span className="fz-label font-black text-slate-400 uppercase tracking-wider">
              © {new Date().getFullYear()} Paper White Technology. All rights reserved.
            </span>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        
        @media print {
           .h-screen { height: auto !important; overflow: visible !important; }
           .bg-white.border-b, .bg-white.border-t { display: none !important; }
        }
      `}</style>
    </ConfigProvider>
  );
};

export default About;
