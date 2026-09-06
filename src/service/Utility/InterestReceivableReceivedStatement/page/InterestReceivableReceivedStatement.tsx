import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText, IndianRupee, Calculator, ShieldCheck, Settings, Database,
  TrendingUp, Percent, Building2, Search, RefreshCw, Printer, FileDown, Calendar
} from 'lucide-react';
import { ConfigProvider, Table, Button, Input, Select, Spin, Tag, Tooltip } from 'antd';
import { apiService } from '../../../../services/api';
import dayjs from 'dayjs';

const { Option } = Select;

const showDialog = async (type: 'info' | 'warning' | 'error', msg: string, detail: string): Promise<void> => {
  if ((window as any).electronAPI?.showMessageBox) {
    await (window as any).electronAPI.showMessageBox({ type, title: 'electron-react-ts', message: msg, detail, buttons: ['OK'], defaultId: 0 });
  } else { alert(`[${type.toUpperCase()}] ${msg}\n\n${detail}`); }
};

interface StatementData { key: string; demandForMonth: string; balanceForMonth: number; interestReceived: number; interestReceivable: number; amount: number; month: number; year: number; }

const lbl = "block fz-mini font-black text-slate-500 uppercase tracking-wider mb-0.5";

const InterestReceivableReceivedStatement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<StatementData[]>([]);
  const [wings, setWings] = useState<any[]>([]);
  const [offices, setOffices] = useState<any[]>([]);
  const stableId = React.useRef(Math.random().toString(16).slice(2, 10).toUpperCase());

  const [filters, setFilters] = useState({
    fromMonth: dayjs().subtract(6, 'month').month() + 1,
    fromYear: dayjs().subtract(6, 'month').year(),
    toMonth: dayjs().month() + 1,
    toYear: dayjs().year(),
    branch: undefined as string | undefined,
    fromMember: '',
    toMember: '',
    wingNo: undefined as string | undefined
  });

  const months = [
    { label: 'January', value: 1 }, { label: 'February', value: 2 }, { label: 'March', value: 3 },
    { label: 'April', value: 4 }, { label: 'May', value: 5 }, { label: 'June', value: 6 },
    { label: 'July', value: 7 }, { label: 'August', value: 8 }, { label: 'September', value: 9 },
    { label: 'October', value: 10 }, { label: 'November', value: 11 }, { label: 'December', value: 12 }
  ];
  const years = Array.from({ length: 11 }, (_, i) => dayjs().year() - 5 + i);

  useEffect(() => { fetchInitialData(); }, []);

  const fetchInitialData = useCallback(async () => {
    try {
      const wingRes = await apiService.getReportWings();
      if (wingRes.success && wingRes.data) setWings(wingRes.data);
    } catch { }
  }, []);

  const handleWingChange = useCallback(async (value: string) => {
    setFilters(prev => ({ ...prev, wingNo: value, branch: undefined }));
    setOffices([]);
    if (value) {
      try {
        const officeRes = await apiService.getReportOffices(value);
        if (officeRes.success && officeRes.data) setOffices(officeRes.data);
      } catch { await showDialog('error', 'Fetch Error', 'Failed to fetch offices.'); }
    }
  }, []);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.getInterestReceivableReceivedStatement({
        fromMonth: filters.fromMonth, fromYear: filters.fromYear,
        toMonth: filters.toMonth, toYear: filters.toYear,
        branch: filters.branch, fromMember: filters.fromMember, toMember: filters.toMember
      });
      if (response.success && response.data) {
        setData(response.data);
        if (response.data.length === 0) await showDialog('info', 'No Records', 'No records found. Adjust your criteria.');
      } else await showDialog('error', 'Fetch Failed', response.message || 'Failed to fetch data.');
    } catch { await showDialog('error', 'Connection Error', 'Error fetching statement.'); }
    finally { setLoading(false); }
  }, [filters]);

  const formatCurrency = useCallback((amount: number) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount), []);

  const handleExportCSV = useCallback(async () => {
    if (data.length === 0) { await showDialog('warning', 'No Data', 'No data to export.'); return; }
    const headers = ['Month/Demand Cycle', 'Interest Receivable', 'Interest Received', 'Variance'];
    const rows = data.map(r => [r.demandForMonth, r.interestReceivable.toFixed(2), r.interestReceived.toFixed(2), (r.interestReceived - r.interestReceivable).toFixed(2)]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `interest-statement-${new Date().toISOString().split('T')[0]}.csv`;
    link.click(); URL.revokeObjectURL(url);
  }, [data]);

  const totals = useMemo(() => data.reduce((acc, curr) => ({
    receivable: acc.receivable + curr.interestReceivable,
    received: acc.received + curr.interestReceived,
    total: acc.total + curr.amount
  }), { receivable: 0, received: 0, total: 0 }), [data]);

  const columns = [
    { title: <span className="fz-mini font-black text-slate-500 uppercase">Month / Cycle</span>, dataIndex: 'demandForMonth', key: 'demandForMonth', render: (v: string) => <span className="fz-small font-black text-slate-800">{v}</span> },
    { title: <span className="fz-mini font-black text-slate-500 uppercase">Int. Receivable</span>, dataIndex: 'interestReceivable', key: 'interestReceivable', align: 'right' as const, render: (v: number) => <span className="fz-small font-black text-blue-600">₹{formatCurrency(v)}</span> },
    { title: <span className="fz-mini font-black text-slate-500 uppercase">Int. Received</span>, dataIndex: 'interestReceived', key: 'interestReceived', align: 'right' as const, render: (v: number) => <span className="fz-small font-black text-emerald-600">₹{formatCurrency(v)}</span> },
    { title: <span className="fz-mini font-black text-slate-500 uppercase">Variance</span>, key: 'variance', align: 'right' as const, render: (_: any, r: StatementData) => {
        const v = r.interestReceived - r.interestReceivable;
        return <span className={`fz-small font-black ${v >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{v >= 0 ? '+' : ''}{formatCurrency(v)}</span>;
      }
    },
  ];

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#6366f1', borderRadius: 6 } }}>
      <div className="irr-app h-screen flex flex-col bg-[#f5f6fa] font-sans overflow-hidden text-slate-900">

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-3 py-2 flex items-center justify-between shrink-0 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg border border-indigo-400/50 bg-indigo-600">
              <Calculator size={13} className="text-white" />
            </div>
            <div>
              <h1 className="fz-caption font-black text-white tracking-wider uppercase leading-none">Interest Statement</h1>
              <p className="fz-micro font-bold text-indigo-300 uppercase tracking-widest mt-0.5">Loan Asset Performance Monitoring</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => window.print()}
              className="h-7 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg fz-tiny font-black flex items-center gap-1.5 border border-white/20 uppercase transition-all">
              <Printer size={11} /> Print Report
            </button>
            <button onClick={handleExportCSV}
              className="h-7 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg fz-tiny font-black flex items-center gap-1.5 uppercase transition-all">
              <FileDown size={11} /> Export CSV
            </button>
          </div>
        </div>

        {/* Body */}
        <Spin spinning={loading} tip="Generating statement...">
          <div className="flex-1 overflow-hidden p-2 flex gap-2">

            {/* Left Filter Panel */}
            <div className="w-[280px] flex flex-col gap-1.5 shrink-0 overflow-y-auto">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Settings size={10} className="text-slate-400" />
                    <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Parameters</span>
                  </div>
                  <Tooltip title="Reset Filters">
                    <button onClick={() => setFilters({ fromMonth: 1, fromYear: 2020, toMonth: 12, toYear: 2025, branch: undefined, fromMember: '', toMember: '', wingNo: undefined })}
                      className="w-5 h-5 text-slate-400 hover:text-indigo-600 flex items-center justify-center">
                      <RefreshCw size={10} />
                    </button>
                  </Tooltip>
                </div>
                <div className="p-2.5 space-y-2">

                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className={lbl}>From Month</label>
                      <Select className="w-full irr-sel" value={filters.fromMonth} onChange={v => setFilters(f => ({ ...f, fromMonth: v }))} size="small">
                        {months.map(m => <Option key={m.value} value={m.value}>{m.label.slice(0,3)}</Option>)}
                      </Select>
                    </div>
                    <div>
                      <label className={lbl}>Year</label>
                      <Select className="w-full irr-sel" value={filters.fromYear} onChange={v => setFilters(f => ({ ...f, fromYear: v }))} size="small">
                        {years.map(y => <Option key={y} value={y}>{y}</Option>)}
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className={lbl}>To Month</label>
                      <Select className="w-full irr-sel" value={filters.toMonth} onChange={v => setFilters(f => ({ ...f, toMonth: v }))} size="small">
                        {months.map(m => <Option key={m.value} value={m.value}>{m.label.slice(0,3)}</Option>)}
                      </Select>
                    </div>
                    <div>
                      <label className={lbl}>Year</label>
                      <Select className="w-full irr-sel" value={filters.toYear} onChange={v => setFilters(f => ({ ...f, toYear: v }))} size="small">
                        {years.map(y => <Option key={y} value={y}>{y}</Option>)}
                      </Select>
                    </div>
                  </div>

                  <div className="h-px bg-slate-100" />

                  <div>
                    <label className={lbl}>Wing / Section</label>
                    <Select className="w-full irr-sel" placeholder="Select Wing" allowClear value={filters.wingNo} onChange={handleWingChange} size="small">
                      {wings.map(w => <Option key={w.wingNo} value={w.wingNo}>{w.name || w.wingName || w.wingNo}</Option>)}
                    </Select>
                  </div>
                  <div>
                    <label className={lbl}>Office / Branch</label>
                    <Select className="w-full irr-sel" placeholder="Select Office" allowClear value={filters.branch} onChange={v => setFilters(f => ({ ...f, branch: v }))} disabled={!filters.wingNo} size="small">
                      {offices.map(o => <Option key={o.officeNo} value={o.officeNo}>{o.name || o.officeName}</Option>)}
                    </Select>
                  </div>

                  <div className="h-px bg-slate-100" />

                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className={lbl}>From Member</label>
                      <input value={filters.fromMember} onChange={e => setFilters(f => ({ ...f, fromMember: e.target.value }))}
                        placeholder="MB No..." className="h-6 px-2 fz-tiny bg-white border border-slate-200 rounded w-full focus:outline-none focus:border-indigo-400" />
                    </div>
                    <div>
                      <label className={lbl}>To Member</label>
                      <input value={filters.toMember} onChange={e => setFilters(f => ({ ...f, toMember: e.target.value }))}
                        placeholder="MB No..." className="h-6 px-2 fz-tiny bg-white border border-slate-200 rounded w-full focus:outline-none focus:border-indigo-400" />
                    </div>
                  </div>

                  <button onClick={handleSearch} disabled={loading}
                    className="w-full h-7 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 text-white rounded fz-tiny font-black uppercase flex items-center justify-center gap-1.5 transition-all">
                    <Search size={11} /> Generate Statement
                  </button>

                  {data.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-slate-100">
                      <div className="flex justify-between fz-tiny">
                        <span className="font-black text-slate-400 uppercase">Total Receivable</span>
                        <span className="font-black text-blue-600">₹{formatCurrency(totals.receivable)}</span>
                      </div>
                      <div className="flex justify-between fz-tiny">
                        <span className="font-black text-slate-400 uppercase">Total Received</span>
                        <span className="font-black text-emerald-600">₹{formatCurrency(totals.received)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Statement Table */}
            <div className="flex-1 min-w-0 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
              <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5">
                  <FileText size={10} className="text-slate-400" />
                  <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Interest Statement</span>
                  {data.length > 0 && <span className="fz-mini font-black text-indigo-600">{data.length} rows</span>}
                </div>
                <span className="fz-mini font-black text-slate-400 uppercase">Ref: {stableId.current}</span>
              </div>
              <div className="flex-1 min-h-0 overflow-auto">
                <Table
                  columns={columns}
                  dataSource={data}
                  pagination={{ pageSize: 30, size: 'small' }}
                  size="small"
                  className="irr-table"
                  scroll={{ y: 'calc(100vh - 170px)' }}
                  summary={() => data.length > 0 ? (
                    <Table.Summary.Row className="bg-indigo-50 font-black">
                      <Table.Summary.Cell index={0}><span className="fz-tiny font-black text-slate-700 uppercase">Grand Total</span></Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right"><span className="fz-small font-black text-blue-700">₹{formatCurrency(totals.receivable)}</span></Table.Summary.Cell>
                      <Table.Summary.Cell index={2} align="right"><span className="fz-small font-black text-emerald-700">₹{formatCurrency(totals.received)}</span></Table.Summary.Cell>
                      <Table.Summary.Cell index={3} align="right"><span className={`fz-small font-black ${totals.received - totals.receivable >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>₹{formatCurrency(totals.received - totals.receivable)}</span></Table.Summary.Cell>
                    </Table.Summary.Row>
                  ) : null}
                  locale={{ emptyText: (
                    <div className="py-12 flex flex-col items-center">
                      <TrendingUp size={32} className="text-slate-200 mb-2" />
                      <p className="fz-tiny font-black text-slate-400 uppercase">No statement data — configure filters and generate</p>
                    </div>
                  )}}
                />
              </div>
            </div>

          </div>
        </Spin>

        <style>{`
          .irr-sel .ant-select-selector { height: 24px !important; min-height: 24px !important; font-size: 9px !important; font-weight: 700 !important; }
          .irr-sel .ant-select-selection-item { line-height: 22px !important; font-size: 9px !important; }
          .irr-table .ant-table-thead > tr > th { background: #f8fafc !important; padding: 5px 10px !important; border-bottom: 1px solid #e2e8f0 !important; }
          .irr-table .ant-table-tbody > tr > td { padding: 4px 10px !important; border-bottom: 1px solid #f1f5f9 !important; }
          .irr-table .ant-table-tbody > tr:hover > td { background: #eef2ff !important; }
          @media print {
            .w-\\[280px\\] { display: none !important; }
            header, button { display: none !important; }
          }

          /* ── Interest Receivable/Received Statement — dark mode ── */
          html.dark .irr-app { background-color: #000000 !important; color: #f5f5f7 !important; }
          html.dark .irr-app .bg-white { background-color: #1c1c1e !important; }
          html.dark .irr-app .bg-slate-100 { background-color: rgba(255,255,255,.07) !important; }
          html.dark .irr-app .border-slate-100 { border-color: rgba(255,255,255,.07) !important; }
          html.dark .irr-app .border-slate-200 { border-color: rgba(255,255,255,.08) !important; }
          html.dark .irr-app input,
          html.dark .irr-app .ant-select-selector {
            background-color: rgba(255,255,255,.05) !important; color: #f5f5f7 !important; border-color: rgba(255,255,255,.08) !important;
          }
          html.dark .irr-app .ant-select-selection-item { color: #f5f5f7 !important; }
          html.dark .irr-app label { color: #8e8e93 !important; }
          html.dark .irr-app .text-slate-800 { color: #f5f5f7 !important; }
          html.dark .irr-app .text-slate-700 { color: #f5f5f7 !important; }
          html.dark .irr-app .text-slate-500 { color: #8e8e93 !important; }
          html.dark .irr-app .text-slate-400 { color: #71717a !important; }
          html.dark .irr-app .bg-slate-300 { background-color: rgba(255,255,255,.15) !important; }
          html.dark .irr-app .bg-indigo-50 { background-color: rgba(99,102,241,0.1) !important; }
          html.dark .irr-app .text-blue-600 { color: #60a5fa !important; }
          html.dark .irr-app .text-blue-700 { color: #60a5fa !important; }
          html.dark .irr-app .text-emerald-600 { color: #34d399 !important; }
          html.dark .irr-app .text-emerald-700 { color: #34d399 !important; }
          html.dark .irr-app .text-rose-600 { color: #ff453a !important; }
          html.dark .irr-app .text-rose-700 { color: #ff453a !important; }
          html.dark .irr-app .irr-table .ant-table-thead > tr > th { background: #1c1c1e !important; color: #8e8e93 !important; border-bottom-color: rgba(255,255,255,.08) !important; }
          html.dark .irr-app .irr-table .ant-table-tbody > tr > td { background: #1c1c1e !important; color: #f5f5f7 !important; border-bottom-color: rgba(255,255,255,.07) !important; }
          html.dark .irr-app .irr-table .ant-table-tbody > tr:hover > td { background: rgba(255,255,255,.05) !important; }
        `}</style>
      </div>
    </ConfigProvider>
  );
};

export default InterestReceivableReceivedStatement;
