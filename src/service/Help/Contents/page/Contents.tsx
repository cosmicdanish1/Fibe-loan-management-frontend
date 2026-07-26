import React, { useState, useCallback, useMemo } from 'react';
import {
  BookOpen,
  ChevronRight,
  Search,
  Rocket,
  Users,
  FileText,
  Settings,
  AlertCircle,
  HelpCircle,
  Phone,
  Mail,
  ExternalLink,
  CheckCircle,
  Zap,
  Shield,
  TrendingUp,
  Database,
  Calculator,
  IndianRupee
} from 'lucide-react';
import { ConfigProvider, Input, Collapse, Tag, Divider } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';

const { Panel } = Collapse;

interface HelpSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  items: {
    title: string;
    description: string;
    icon: React.ReactNode;
  }[];
}

const Contents: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeKeys, setActiveKeys] = useState<string[]>(['1']);

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value.toLowerCase());
    if (value) {
      // Expand all panels when searching
      setActiveKeys(['1', '2', '3', '4', '5', '6']);
    }
  }, []);

  const helpSections = useMemo<HelpSection[]>(() => [
    {
      id: '1',
      title: 'Getting Started',
      icon: <Rocket size={12} />,
      color: 'blue',
      items: [
        {
          title: 'Introduction',
          description: 'Overview of the Loan Management System and its core features',
          icon: <BookOpen size={10} />
        },
        {
          title: 'System Requirements',
          description: 'Hardware and software requirements for optimal performance',
          icon: <Settings size={10} />
        },
        {
          title: 'Installation Guide',
          description: 'Step-by-step instructions for installing and configuring the system',
          icon: <CheckCircle size={10} />
        },
        {
          title: 'First Login',
          description: 'How to access the system and navigate the main dashboard',
          icon: <Zap size={10} />
        }
      ]
    },
    {
      id: '2',
      title: 'Member Management',
      icon: <Users size={12} />,
      color: 'green',
      items: [
        {
          title: 'Adding New Members',
          description: 'Create member profiles with personal and financial details',
          icon: <Users size={10} />
        },
        {
          title: 'Member Search',
          description: 'Find members by number, name, or other criteria',
          icon: <Search size={10} />
        },
        {
          title: 'Member Balance',
          description: 'View comprehensive balance information for any member',
          icon: <IndianRupee size={10} />
        },
        {
          title: 'Member Statements',
          description: 'Generate detailed transaction statements for members',
          icon: <FileText size={10} />
        }
      ]
    },
    {
      id: '3',
      title: 'Transactions & Vouchers',
      icon: <FileText size={12} />,
      color: 'purple',
      items: [
        {
          title: 'Creating Vouchers',
          description: 'Process deposits, withdrawals, and loan transactions',
          icon: <FileText size={10} />
        },
        {
          title: 'Transaction Types',
          description: 'Understanding different transaction categories and codes',
          icon: <Database size={10} />
        },
        {
          title: 'Voucher Verification',
          description: 'Review and approve pending transactions',
          icon: <CheckCircle size={10} />
        },
        {
          title: 'Transaction History',
          description: 'View and search historical transaction records',
          icon: <TrendingUp size={10} />
        }
      ]
    },
    {
      id: '4',
      title: 'Reports & Analytics',
      icon: <TrendingUp size={12} />,
      color: 'orange',
      items: [
        {
          title: 'EMI Charts',
          description: 'View loan EMI schedules and payment tracking',
          icon: <Calculator size={10} />
        },
        {
          title: 'Interest Statements',
          description: 'Generate interest receivable and received reports',
          icon: <IndianRupee size={10} />
        },
        {
          title: 'Premature Information',
          description: 'Calculate premature withdrawal amounts for FD/RD/SB',
          icon: <AlertCircle size={10} />
        },
        {
          title: 'Custom Reports',
          description: 'Create filtered reports based on date ranges and criteria',
          icon: <FileText size={10} />
        }
      ]
    },
    {
      id: '5',
      title: 'Utilities & Tools',
      icon: <Settings size={12} />,
      color: 'cyan',
      items: [
        {
          title: 'Calculator',
          description: 'Calculate loan EMI, interest rates, and maturity amounts',
          icon: <Calculator size={10} />
        },
        {
          title: 'Database Backup',
          description: 'Create and restore database backups for data safety',
          icon: <Database size={10} />
        },
        {
          title: 'Communication Hub',
          description: 'Send SMS, WhatsApp, and email notifications to members',
          icon: <Mail size={10} />
        },
        {
          title: 'Update Saving Interest',
          description: 'Process and update interest for savings accounts',
          icon: <IndianRupee size={10} />
        }
      ]
    },
    {
      id: '6',
      title: 'Troubleshooting',
      icon: <AlertCircle size={12} />,
      color: 'red',
      items: [
        {
          title: 'Common Issues',
          description: 'Solutions to frequently encountered problems',
          icon: <HelpCircle size={10} />
        },
        {
          title: 'Error Messages',
          description: 'Understanding and resolving system error messages',
          icon: <AlertCircle size={10} />
        },
        {
          title: 'Performance Tips',
          description: 'Optimize system performance and speed',
          icon: <Zap size={10} />
        },
        {
          title: 'Contact Support',
          description: 'Get help from our technical support team',
          icon: <Phone size={10} />
        }
      ]
    }
  ], []);

  const filteredSections = useMemo(() => {
    if (!searchQuery) return helpSections;
    
    return helpSections.map(section => ({
      ...section,
      items: section.items.filter(item =>
        item.title.toLowerCase().includes(searchQuery) ||
        item.description.toLowerCase().includes(searchQuery)
      )
    })).filter(section => section.items.length > 0);
  }, [helpSections, searchQuery]);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#10b981',
          borderRadius: 12,
        },
      }}
    >
      <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-emerald-50/20 to-slate-50 font-sans selection:bg-emerald-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-white via-emerald-50/20 to-white border-b border-emerald-100/50 px-3 py-2 flex items-center justify-between z-10 shadow-sm shadow-emerald-100/20 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 p-1.5 rounded-lg text-white shadow-lg shadow-emerald-300/50 ring-2 ring-emerald-100">
              <BookOpen size={16} />
            </div>
            <div>
              <h1 className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-800 via-emerald-900 to-slate-800 tracking-tight leading-none uppercase">Help Contents</h1>
              <div className="flex items-center gap-1 mt-0.5 fz-body font-bold text-slate-400 uppercase tracking-widest leading-none">
                <Zap size={9} className="text-emerald-500" /> Complete System Documentation & Guides
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Tag color="green" className="fz-label font-black uppercase m-0 px-2 py-0.5 leading-none h-5 flex items-center">
              <HelpCircle size={9} className="mr-1" /> Support Available
            </Tag>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden p-2 flex gap-2">

          {/* Left Panel: Quick Links */}
          <div className="w-[280px] flex flex-col gap-1.5 overflow-y-auto pr-1 custom-scrollbar">

            {/* Search Box */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gradient-to-br from-white to-emerald-50/20 border border-emerald-100/50 rounded-xl overflow-hidden shadow-sm"
            >
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50/50 to-emerald-50 border-b border-emerald-100 px-2.5 py-1.5">
                <h3 className="fz-body font-black text-emerald-700 uppercase tracking-widest flex items-center gap-1">
                  <Search size={11} className="text-emerald-500" />
                  Search Help
                </h3>
              </div>
              <div className="p-2">
                <Input
                  placeholder="Search topics..."
                  prefix={<Search size={12} className="text-slate-400" />}
                  className="h-7 text-[10px] font-bold"
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  allowClear
                />
              </div>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 gap-1.5"
            >
              <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-lg p-2 text-white shadow-md shadow-emerald-100 relative overflow-hidden group">
                <BookOpen size={40} className="absolute -right-2 -bottom-2 opacity-10 group-hover:scale-110 transition-transform" />
                <div className="fz-label font-black uppercase tracking-wider opacity-80 mb-0.5">Total Topics</div>
                <div className="text-sm font-black leading-none">{helpSections.reduce((acc, s) => acc + s.items.length, 0)}</div>
              </div>

              <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-lg p-2 text-white shadow-md shadow-teal-100 relative overflow-hidden group">
                <FileText size={40} className="absolute -right-2 -bottom-2 opacity-10 group-hover:scale-110 transition-transform" />
                <div className="fz-label font-black uppercase tracking-wider opacity-80 mb-0.5">Categories</div>
                <div className="text-sm font-black leading-none">{helpSections.length}</div>
              </div>
            </motion.div>

            {/* Contact Support Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-gradient-to-br from-white to-emerald-50/20 border border-emerald-100/50 rounded-xl overflow-hidden shadow-sm"
            >
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50/50 to-emerald-50 border-b border-emerald-100 px-2.5 py-1.5">
                <h3 className="fz-body font-black text-emerald-700 uppercase tracking-widest flex items-center gap-1">
                  <Phone size={11} className="text-emerald-500" />
                  Need Help?
                </h3>
              </div>
              <div className="p-2 space-y-1.5">
                <div className="flex items-center gap-1.5 p-1.5 bg-emerald-50/50 rounded-lg">
                  <Mail size={10} className="text-emerald-600" />
                  <div className="flex-1">
                    <div className="fz-label font-bold text-slate-400 uppercase">Email</div>
                    <div className="fz-body font-black text-slate-700">support@paperwhitetech.com</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 p-1.5 bg-emerald-50/50 rounded-lg">
                  <Phone size={10} className="text-emerald-600" />
                  <div className="flex-1">
                    <div className="fz-label font-bold text-slate-400 uppercase">Phone</div>
                    <div className="fz-body font-black text-slate-700">+91 12345 67890</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 p-1.5 bg-emerald-50/50 rounded-lg">
                  <Shield size={10} className="text-emerald-600" />
                  <div className="flex-1">
                    <div className="fz-label font-bold text-slate-400 uppercase">Support</div>
                    <div className="fz-body font-black text-slate-700">24/7 Available</div>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>

          {/* Right Panel: Help Topics */}
          <div className="flex-1 bg-white border border-emerald-100 rounded-xl shadow-sm flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50/50 to-emerald-50 border-b border-emerald-100 px-2.5 py-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="bg-white p-1 rounded-lg shadow-sm border border-emerald-100">
                  <FileText size={12} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="fz-body font-black text-emerald-700 uppercase tracking-widest leading-none">Documentation</h3>
                  <p className="fz-label font-bold text-slate-400 uppercase mt-0.5 tracking-tight">Browse help topics by category</p>
                </div>
              </div>

              {searchQuery && (
                <div className="text-right">
                  <div className="fz-label font-black text-slate-400 uppercase mb-0.5">Results</div>
                  <div className="text-xs font-black leading-none text-emerald-600">
                    {filteredSections.reduce((acc, s) => acc + s.items.length, 0)} topics
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto p-2 custom-scrollbar bg-emerald-50/10">
              <AnimatePresence mode="wait">
                {filteredSections.length > 0 ? (
                  <motion.div
                    key="content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Collapse
                      activeKey={activeKeys}
                      onChange={keys => setActiveKeys(keys as string[])}
                      className="custom-collapse"
                      bordered={false}
                    >
                      {filteredSections.map((section, idx) => (
                        <Panel
                          key={section.id}
                          header={
                            <div className="flex items-center gap-2">
                              <Tag color={section.color} className="fz-body font-black uppercase m-0 px-1.5 py-0 leading-none h-4 flex items-center">
                                {section.icon}
                              </Tag>
                              <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{section.title}</span>
                              <Tag className="fz-label font-bold m-0 px-1 py-0 leading-none h-3.5 flex items-center bg-slate-100 border-0">
                                {section.items.length}
                              </Tag>
                            </div>
                          }
                          className="mb-1.5"
                        >
                          <div className="space-y-1.5">
                            {section.items.map((item, itemIdx) => (
                              <motion.div
                                key={itemIdx}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: itemIdx * 0.05 }}
                                className="flex items-start gap-2 p-2 bg-white border border-emerald-100/50 rounded-lg hover:bg-emerald-50/30 hover:border-emerald-200 transition-all cursor-pointer group"
                              >
                                <div className="text-emerald-600 mt-0.5 group-hover:scale-110 transition-transform">
                                  {item.icon}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <h4 className="fz-body font-black text-slate-700 uppercase tracking-tight leading-none">{item.title}</h4>
                                    <ChevronRight size={9} className="text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
                                  </div>
                                  <p className="fz-body font-medium text-slate-500 leading-tight">{item.description}</p>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </Panel>
                      ))}
                    </Collapse>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-[400px] flex flex-col items-center justify-center opacity-30 grayscale"
                  >
                    <Search size={60} className="text-slate-200 mb-4" />
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Results Found</h3>
                    <p className="fz-body font-bold text-slate-300 uppercase mt-1.5">Try a different search term</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-emerald-100 px-2.5 py-1.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              <span className="fz-label font-black text-slate-400 uppercase tracking-wider">Documentation: Up to Date</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <ExternalLink size={10} />
              <span className="fz-label font-black uppercase tracking-wider">Online Help Available</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="fz-label font-black text-slate-300 uppercase tracking-tight">Help v2.0.0</span>
            <div className="w-px h-2.5 bg-emerald-100" />
            <div className="bg-emerald-50 px-1.5 py-0.5 rounded fz-label font-bold text-slate-400 uppercase tabular-nums tracking-wider">
              Last Updated: {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        
        .custom-collapse {
          background: transparent !important;
        }
        .custom-collapse .ant-collapse-item {
          background: white !important;
          border: 1px solid #d1fae5 !important;
          border-radius: 12px !important;
          overflow: hidden;
        }
        .custom-collapse .ant-collapse-header {
          background: linear-gradient(to right, #d1fae5, #ccfbf1, #d1fae5) !important;
          padding: 8px 12px !important;
          font-weight: 900 !important;
        }
        .custom-collapse .ant-collapse-content {
          background: #f0fdf4 !important;
          border-top: 1px solid #d1fae5 !important;
        }
        .custom-collapse .ant-collapse-content-box {
          padding: 8px !important;
        }
        
        @media print {
           .h-screen { height: auto !important; overflow: visible !important; }
           .z-10, .w-[280px], .custom-scrollbar, .bg-white.border-b, .bg-white.border-t { display: none !important; }
           .flex-1 { margin: 0 !important; padding: 0 !important; }
           .rounded-xl { border-radius: 0 !important; border: 1px solid #eee !important; }
           .bg-emerald-50\/10 { background: white !important; }
        }
      `}</style>
    </ConfigProvider>
  );
};

export default Contents;
