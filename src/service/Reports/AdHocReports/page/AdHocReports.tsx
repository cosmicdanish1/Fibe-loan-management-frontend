// AdHocReports.tsx
import React, { useState, useEffect } from 'react';
import {
  BarChart2,
  Search,
  Database,
  Download,
  Printer,
  Filter,
  ChevronRight,
  AlertCircle,
  Table as TableIcon,
  Layers,
  Activity,
  User,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import {
  Input,
  Card,
  Button,
  message,
  Tag,
  Table,
  DatePicker,
  Tooltip
} from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import { apiService } from '../../../../services/api';

const { TextArea } = Input;

interface AdHocReportData {
  reportType: string;
  totalRecords: number;
  data: any[];
  generatedAt: string;
}

const AdHocReports: React.FC = () => {
  const [reportType, setReportType] = useState<string>('member_wise');
  const [memberNo, setMemberNo] = useState<string>('');
  const [fromDate, setFromDate] = useState(dayjs().subtract(1, 'month'));
  const [toDate, setToDate] = useState(dayjs());
  const [customQuery, setCustomQuery] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<AdHocReportData | null>(null);

  const reportTypes = [
    { value: 'member_wise', label: 'Member Master Report', icon: <User size={14} />, desc: 'General member information' },
    { value: 'account_wise', label: 'Account Summary', icon: <Layers size={14} />, desc: 'FD/RD account details' },
    { value: 'transaction_wise', label: 'Transaction Archive', icon: <Activity size={14} />, desc: 'Ledger transaction history' },
    { value: 'balance_summary', label: 'Balance Overview', icon: <Database size={14} />, desc: 'Category-wise balance summary' },
    { value: 'custom', label: 'Advanced Explorer', icon: <Search size={14} />, desc: 'Execute secure custom SQL queries' }
  ];

  useEffect(() => {
    const handleMemberSelected = (_event: any, memberData: any) => {
      if (memberData && memberData.memberNo) {
        setMemberNo(memberData.memberNo);
      }
    };

    if (window.electronAPI?.ipcRenderer) {
      window.electronAPI.ipcRenderer.on('member-selected', handleMemberSelected);
    }

    return () => {
      if (window.electronAPI?.ipcRenderer) {
        window.electronAPI.ipcRenderer.removeAllListeners('member-selected');
      }
    };
  }, []);

  const handleMemberLookup = () => {
    if (window.electronAPI?.openNewWindow) {
      window.electronAPI.openNewWindow('/common/member-lookup');
    } else {
      message.warning('Member Lookup is only available in Electron app');
    }
  };

  const handleGenerate = async () => {
    if (!reportType) {
      message.error('Please select a report type');
      return;
    }

    if (reportType === 'custom' && !customQuery.trim()) {
      message.error('Please enter a custom query');
      return;
    }

    setLoading(true);
    try {
      const requestData: any = {
        reportType,
        fromDate: fromDate.format('YYYY-MM-DD'),
        toDate: toDate.format('YYYY-MM-DD'),
        memberNo: memberNo.trim() || undefined,
        customQuery: reportType === 'custom' ? customQuery : undefined
      };

      const response = await apiService.getAdHocReports(requestData);

      if (response.success && response.data) {
        setReportData(response.data);
        message.success(`Report synchronized: ${response.data.totalRecords} records found.`);
      } else {
        message.error(response.error || 'Failed to generate report');
      }
    } catch (error) {
      console.error('AdHoc Report Error:', error);
      message.error('Internal connection error');
    } finally {
      setLoading(false);
    }
  };

  const getColumns = () => {
    if (!reportData?.data?.length) return [];

    const firstRow = reportData.data[0];
    return Object.keys(firstRow).map(key => ({
      title: (
        <span className="fz-small font-black uppercase tracking-tight text-slate-500">
          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
        </span>
      ),
      dataIndex: key,
      key: key,
      ellipsis: true,
      render: (value: any) => {
        if (typeof value === 'number' && (key.toLowerCase().includes('balance') || key.toLowerCase().includes('amount'))) {
          return <span className="font-mono font-bold text-slate-700">₹{value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>;
        }
        if (key.toLowerCase().includes('date') && value) {
          return <span className="text-slate-500">{dayjs(value).format('DD MMM YYYY')}</span>;
        }
        if (key.toLowerCase() === 'status') {
          return <Tag color={statusColorMap(value)} className="rounded-full px-3 fz-small font-bold uppercase">{value}</Tag>;
        }
        return <span className="text-slate-600">{value?.toString() || '-'}</span>;
      }
    }));
  };

  const statusColorMap = (status: any) => {
    const s = String(status).toLowerCase();
    if (['active', 'open', '0'].includes(s)) return 'green';
    if (['closed', 'matured', '1'].includes(s)) return 'orange';
    return 'blue';
  };

  const exportCSV = () => {
    if (!reportData?.data) return;
    const columns = getColumns();
    const headers = columns.map(col => col.key).join(',');
    const rows = reportData.data.map(row =>
      columns.map(col => {
        const value = row[col.key || ''];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value || '';
      }).join(',')
    ).join('\n');

    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Report_${reportType}_${dayjs().format('YYYYMMDD')}.csv`;
    a.click();
  };

  return (
    <div className="h-screen bg-slate-50 font-sans p-4 overflow-hidden flex flex-col">
      <div className="max-w-[1400px] mx-auto w-full flex-1 flex flex-col gap-4 overflow-hidden">

        {/* Header Section */}
        <div className="flex items-center justify-between no-print">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
              <BarChart2 className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1 uppercase">ADHOC REPORTING ENGINE</h1>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-tighter">Dynamic Data Analytics & Exploration Hub</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-right">
            {reportData && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <Button
                  icon={<Download size={14} />}
                  onClick={exportCSV}
                  className="rounded-xl font-black fz-small h-10 border-slate-200 transition-all hover:border-indigo-500 hover:text-indigo-600 shadow-sm uppercase tracking-widest"
                >
                  EXPORT CSV
                </Button>
              </motion.div>
            )}
            <Tag color="blue" className="rounded-full border-0 bg-indigo-100 text-indigo-700 font-black px-4 py-1.5 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse" />
              VERIFIED SECURE
            </Tag>
          </div>
        </div>

        {/* Workspace Layout */}
        <div className="flex-1 flex gap-4 overflow-hidden">

          {/* Sidebar Filters */}
          <div className="w-80 flex flex-col gap-4 overflow-y-auto pr-1 no-print">
            <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden" bodyStyle={{ padding: 16 }}>
              <div className="flex items-center gap-2 mb-6">
                <Filter size={16} className="text-indigo-500" />
                <h3 className="fz-small font-black text-slate-400 uppercase tracking-widest leading-none">Configuration</h3>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="fz-small font-black text-slate-500 uppercase ml-1">Report Explorer</label>
                  <div className="grid grid-cols-1 gap-2">
                    {reportTypes.map(type => (
                      <button
                        key={type.value}
                        onClick={() => setReportType(type.value)}
                        className={`
                            flex items-center justify-between p-3 rounded-xl border transition-all text-left
                            ${reportType === type.value
                            ? 'bg-indigo-50 border-indigo-200 shadow-sm ring-1 ring-indigo-500/10'
                            : 'bg-white border-slate-100 hover:border-slate-200 text-slate-600 hover:text-slate-800'}
                          `}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg transition-colors ${reportType === type.value ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'bg-slate-100 text-slate-400'}`}>
                            {type.icon}
                          </div>
                          <div>
                            <div className={`fz-caption font-black ${reportType === type.value ? 'text-indigo-900' : 'text-slate-700'} uppercase leading-none mb-1`}>
                              {type.label}
                            </div>
                            <div className="fz-body text-slate-400 font-medium uppercase tracking-tighter">{type.desc}</div>
                          </div>
                        </div>
                        {reportType === type.value && <ChevronRight size={14} className="text-indigo-600" />}
                      </button>
                    ))}
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={reportType}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4 pt-4 border-t border-slate-50"
                  >
                    {['member_wise', 'transaction_wise', 'account_wise'].includes(reportType) && (
                      <div className="space-y-1.5">
                        <label className="fz-small font-black text-slate-500 uppercase ml-1">Member Reference</label>
                        <div className="relative group">
                          <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                          <Input
                            placeholder="All Records"
                            value={memberNo}
                            onChange={(e) => setMemberNo(e.target.value.replace(/\D/g, ''))}
                            className="h-10 pl-9 pr-10 rounded-xl border-slate-100 text-xs font-bold"
                          />
                          <button
                            onClick={handleMemberLookup}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                          >
                            <Search size={14} />
                          </button>
                        </div>
                      </div>
                    )}

                    {['transaction_wise', 'account_wise'].includes(reportType) && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <label className="fz-small font-black text-slate-500 uppercase ml-1">Start Date</label>
                          <DatePicker
                            value={fromDate}
                            onChange={d => setFromDate(d || dayjs())}
                            format="DD/MM/YY"
                            className="w-full h-10 rounded-xl border-slate-100 text-xs font-bold"
                            suffixIcon={<Calendar size={12} className="text-slate-300" />}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="fz-small font-black text-slate-500 uppercase ml-1">End Date</label>
                          <DatePicker
                            value={toDate}
                            onChange={d => setToDate(d || dayjs())}
                            format="DD/MM/YY"
                            className="w-full h-10 rounded-xl border-slate-100 text-xs font-bold"
                            suffixIcon={<Calendar size={12} className="text-slate-300" />}
                          />
                        </div>
                      </div>
                    )}

                    {reportType === 'custom' && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between ml-1">
                          <label className="fz-small font-black text-slate-500 uppercase tracking-widest">SQL Pipeline</label>
                          <Tooltip title="ReadOnly SELECT statements are mandatory. System enforcement active.">
                            <AlertCircle size={10} className="text-slate-300" />
                          </Tooltip>
                        </div>
                        <TextArea
                          value={customQuery}
                          onChange={e => setCustomQuery(e.target.value)}
                          placeholder="SELECT * FROM main_ledger WHERE amount > 5000..."
                          rows={6}
                          className="rounded-xl border-slate-200 fz-caption font-mono bg-slate-900 text-indigo-300 selection:bg-indigo-500 selection:text-white p-4"
                        />
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                <Button
                  type="primary"
                  onClick={handleGenerate}
                  loading={loading}
                  className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 border-0 rounded-xl font-black fz-small uppercase tracking-widest shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 mt-4"
                >
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Activity size={16} />}
                  EXECUTE SYNC
                </Button>
              </div>
            </Card>

            <div className="bg-slate-100 rounded-2xl p-4 flex items-center gap-3 border border-slate-200 border-dashed">
              <div className="p-2 bg-white rounded-lg text-indigo-500 shadow-sm">
                <ShieldCheck size={16} />
              </div>
              <div>
                <div className="fz-small font-black text-slate-700 uppercase tracking-tight">ENCRYPTED CHANNEL</div>
                <div className="fz-body text-slate-500 uppercase tracking-tighter">Query execution is isolated and audit-ready.</div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {reportData ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-50 text-indigo-600 rounded-xl">
                      <TableIcon size={18} />
                    </div>
                    <div>
                      <h3 className="fz-label font-black text-slate-800 uppercase tracking-tight leading-none mb-1">
                        {reportTypes.find(t => t.value === reportData.reportType)?.label} Preview
                      </h3>
                      <p className="fz-small text-slate-400 font-bold uppercase tracking-tighter">
                        Archival Synchronized: <span className="text-indigo-600">{reportData.totalRecords}</span> Reference points found
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 no-print">
                    <div className="text-right">
                      <div className="fz-body font-black text-slate-400 uppercase tracking-widest mb-0.5 leading-none">Last Archive Sync</div>
                      <div className="fz-caption font-black text-slate-700 leading-none">{dayjs(reportData.generatedAt).format('HH:mm:ss')}</div>
                    </div>
                    <div className="w-px h-8 bg-slate-100" />
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => window.print()}
                      icon={<Printer size={12} />}
                      className="rounded-lg h-9 px-4 font-black fz-small bg-slate-900 border-0 uppercase tracking-widest shadow-md shadow-slate-200"
                    >
                      PRINT
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-2">
                  <Table
                    columns={getColumns()}
                    dataSource={reportData.data}
                    rowKey={(_, index) => index?.toString() || '0'}
                    pagination={{
                      pageSize: 100,
                      showSizeChanger: true,
                      size: 'small',
                      position: ['bottomRight']
                    }}
                    size="small"
                    scroll={{ x: 'max-content', y: 'calc(100vh - 360px)' }}
                    className="custom-modern-table"
                  />
                </div>
              </motion.div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-[32px] border border-slate-100 border-dashed m-4 no-print">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center"
                >
                  <div className="w-24 h-24 bg-slate-50 rounded-[40px] flex items-center justify-center mx-auto mb-8 shadow-inner relative overflow-hidden group">
                    <div className="absolute inset-0 bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-colors" />
                    <Database className="text-slate-300 group-hover:text-indigo-500 group-hover:scale-110 transition-all duration-500" size={40} />
                  </div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight mb-3 uppercase">Archive Synchronization Ready</h2>
                  <p className="text-slate-400 text-xs font-medium max-w-xs mx-auto leading-relaxed uppercase tracking-tighter">
                    Please initialize a report engine from the configuration matrix on the left to begin analyzing archival records.
                  </p>
                  <div className="mt-12 flex items-center justify-center gap-8">
                    {['Automated Audits', 'Secure Isolation', 'Live Export'].map(tag => (
                      <div key={tag} className="text-center">
                        <div className="text-xs font-black text-slate-300 uppercase leading-none mb-1">{tag.split(' ')[0]}</div>
                        <div className="fz-body font-bold text-slate-200 uppercase tracking-[0.2em]">{tag.split(' ')[1]}</div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .custom-modern-table .ant-table-thead > tr > th {
          background: #f8fafc !important;
          border-bottom: 2px solid #f1f5f9 !important;
          padding: 12px 16px !important;
        }
        .custom-modern-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #f8fafc !important;
          padding: 10px 16px !important;
          transition: all 0.2s;
        }
        .custom-modern-table .ant-table-tbody > tr:hover > td {
          background-color: #f1f5f9/50 !important;
        }
        .ant-table-pagination {
          margin: 16px !important;
        }
        @media print {
          .no-print { display: none !important; }
          .h-screen { height: auto !important; overflow: visible !important; }
          .bg-slate-50 { background: white !important; }
          .ant-table-body { max-height: none !important; }
        }
      `}</style>
    </div>
  );
};

export default AdHocReports;
