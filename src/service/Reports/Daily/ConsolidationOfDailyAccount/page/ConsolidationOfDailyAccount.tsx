import React, { useState, useEffect } from 'react';
import { Settings, RefreshCw, Printer, FileDown, Search, Layers, ShieldCheck, Sun, Moon } from 'lucide-react';
import { ConfigProvider, Button, DatePicker, Spin, Tooltip, theme as antdTheme } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../../../store';
import { setInterfaceMode } from '../../../../../store/slices/themeSlice';
import { apiService } from '../../../../../services/api';
import dayjs from 'dayjs';

interface SubEntry {
  mbNo: string;
  memberName: string;
  amount: number;
}

interface HeadGroup {
  headCode: string;
  headName: string;
  total: number;
  subEntries: SubEntry[];
}

interface ConsolidationData {
  date: string;
  openingBalance: number;
  totalReceipts: number;
  totalPayments: number;
  totalCash: number;
  closingBalance: number;
  receiptGroups: HeadGroup[];
  paymentGroups: HeadGroup[];
  totalHeads: number;
}

const fmt = (n: number) =>
  Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtSigned = (n: number) => (n < 0 ? '-' : '') + fmt(n);

const ConsolidationOfDailyAccount: React.FC = () => {
  const dispatch = useDispatch();
  const { interfaceMode, accentColor, cornerRadius } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs().subtract(1, 'day'));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ConsolidationData | null>(null);

  useEffect(() => { loadData(); }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await apiService.getConsolidationReport(selectedDate.format('YYYY-MM-DD'), 'screen');
      if (response.success && response.data) {
        const d = response.data?.data ?? response.data;
        setData(d);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const toggleTheme = () => {
    dispatch(setInterfaceMode(isDark ? 'light' : 'dark'));
  };

  const handlePrint = () => {
    if (!data) return;
    const win = window.open('', '_blank', 'width=900,height=750') as unknown as Window | null;
    if (!win) return;
    const content = document.getElementById('consol-print-area')?.innerHTML || '';
    win.document.write(`<!DOCTYPE html><html><head><title>Consolidation</title>
<style>
  @page { size:A4 portrait; margin:12mm; }
  body { font-family:'Courier New',monospace; font-size:9pt; color:#000; background:#fff; }
  table { width:100%; border-collapse:collapse; }
  td { padding:2px 4px; font-size:8.5pt; }
  .section-hdr { font-weight:bold; font-size:10pt; padding:4px 4px; }
  .head-row td { font-weight:bold; }
  .sub-row td:last-child { color:#1a56db; }
  .subtotal td { border-top:1px solid #999; font-weight:bold; }
  .summary td { font-weight:bold; }
  .red { color:#c00; }
</style></head><body>${content}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const handleExportCSV = () => {
    if (!data) return;
    let csv = 'Section,Head Code,Head Name,MB No,Member Name,Amount\n';
    data.receiptGroups.forEach(g => g.subEntries.forEach(e =>
      csv += `Receipt,${g.headCode},"${g.headName}",${e.mbNo},"${e.memberName}",${e.amount}\n`
    ));
    data.paymentGroups.forEach(g => g.subEntries.forEach(e =>
      csv += `Payment,${g.headCode},"${g.headName}",${e.mbNo},"${e.memberName}",${e.amount}\n`
    ));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = `Consolidation_${selectedDate.format('YYYY-MM-DD')}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const hasData = data && (data.receiptGroups.length > 0 || data.paymentGroups.length > 0);

  // Tailwind classes driven by isDark — adapts to theme toggle
  const bg = isDark ? 'bg-[#0f172a]' : 'bg-slate-50';
  const panel = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const panelHead = isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100';
  const text = isDark ? 'text-slate-100' : 'text-slate-800';
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  const border = isDark ? 'border-slate-700' : 'border-slate-200';
  const rowAlt = isDark ? 'bg-slate-800/60' : 'bg-white';
  const rowAlt2 = isDark ? 'bg-slate-800/30' : 'bg-slate-50/60';
  const rowHover = isDark ? 'hover:bg-slate-700/30' : 'hover:bg-violet-50/30';
  const headRowBg = isDark ? 'bg-slate-700/60' : 'bg-slate-100';
  const sectionBanner = isDark
    ? 'bg-violet-900/30 border-violet-700/40 text-violet-300'
    : 'bg-rose-50 border-rose-200 text-rose-700';
  const totalRowBg = isDark ? 'bg-slate-900/60' : 'bg-slate-50';
  const summaryBg = isDark ? 'bg-slate-800/80' : 'bg-slate-50';

  const Section = ({ groups, label }: { groups: HeadGroup[]; label: 'RECEIPT' | 'PAYMENT' }) => (
    <tbody>
      <tr>
        <td colSpan={3} className={`px-3 py-1.5 text-xs font-black uppercase tracking-widest border-b ${border} ${sectionBanner}`}>
          ▶ {label}
        </td>
      </tr>
      {groups.map(g => (
        <React.Fragment key={g.headCode}>
          {/* Head row */}
          <tr className={`border-b ${border} ${headRowBg}`}>
            <td className={`px-3 py-1 font-black text-xs font-mono ${isDark ? 'text-indigo-300' : 'text-slate-700'}`}>{g.headCode}</td>
            <td className={`px-3 py-1 font-bold text-xs uppercase ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{g.headName}</td>
            <td />
          </tr>
          {/* Sub-entries */}
          {g.subEntries.map((e, i) => (
            <tr key={i} className={`border-b ${border} ${rowHover} ${i % 2 === 0 ? rowAlt : rowAlt2} transition-colors`}>
              <td className={`px-3 py-0.5 text-right fz-caption font-mono ${muted}`}>{e.mbNo}</td>
              <td className={`px-3 py-0.5 fz-caption ${isDark ? 'text-violet-300' : 'text-violet-600'} font-semibold`}>{e.memberName}</td>
              <td className={`px-3 py-0.5 text-right fz-caption font-semibold font-mono
                ${label === 'RECEIPT'
                  ? (isDark ? 'text-emerald-300' : 'text-emerald-600')
                  : (isDark ? 'text-rose-300' : 'text-rose-600')}`}>
                {fmt(e.amount)}
              </td>
            </tr>
          ))}
          {/* Sub-total */}
          <tr className={`border-b-2 ${isDark ? 'border-slate-500' : 'border-slate-300'} ${totalRowBg}`}>
            <td colSpan={2} className={`px-3 py-1 ${muted}`} />
            <td className={`px-3 py-1 text-right fz-caption font-black font-mono border-t ${isDark ? 'border-slate-500 text-slate-200' : 'border-slate-300 text-slate-700'}`}>
              {fmt(g.total)}
            </td>
          </tr>
        </React.Fragment>
      ))}
    </tbody>
  );

  return (
    <ConfigProvider theme={{
      algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      token: {
        colorPrimary: accentColor,
        borderRadius: cornerRadius,
        colorBgContainer: isDark ? '#1e293b' : '#ffffff',
        colorBorder: isDark ? '#334155' : '#e2e8f0',
      },
    }}>
      <div className={`h-screen flex flex-col font-sans overflow-hidden ${text} ${bg}`}>

        {/* Header */}
        <div className={`border-b px-4 py-2.5 flex items-center justify-between shrink-0 ${panel}`}>
          <div className="flex items-center gap-3">
            <div className="bg-violet-600 p-2 rounded-lg shadow-lg shadow-violet-500/30">
              <Layers size={18} className="text-white" />
            </div>
            <div>
              <h1 className={`text-sm font-extrabold tracking-tight leading-none ${text}`}>Consolidation Of Daily A/c</h1>
              <div className={`flex items-center gap-1.5 mt-0.5 fz-small font-semibold uppercase tracking-wide ${muted}`}>
                <ShieldCheck size={10} className="text-violet-400" /> Account Head Summary
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <Tooltip title={isDark ? 'Switch to Light' : 'Switch to Dark'}>
              <Button
                type="text" size="small"
                icon={isDark ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-slate-500" />}
                onClick={toggleTheme}
                className="h-8 w-8 rounded-lg"
              />
            </Tooltip>
            <Button icon={<Printer size={13} />} size="small"
              className="h-8 px-3 rounded-lg text-xs font-bold uppercase tracking-wide"
              onClick={handlePrint} disabled={!hasData}>Print</Button>
            <Button type="primary" icon={<FileDown size={13} />} size="small"
              className="h-8 px-4 rounded-lg text-xs font-bold uppercase tracking-wide"
              onClick={handleExportCSV} disabled={!hasData}>CSV</Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden p-3 flex gap-3">

          {/* Left panel */}
          <div className="w-[240px] flex flex-col gap-3 shrink-0">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className={`border rounded-xl overflow-hidden ${panel}`}>
              <div className={`border-b px-3 py-2 flex items-center justify-between ${panelHead}`}>
                <h3 className={`fz-caption font-extrabold tracking-wide uppercase flex items-center gap-1.5 ${muted}`}>
                  <Settings size={11} className="text-violet-400" /> Parameters
                </h3>
                <Tooltip title="Reload">
                  <Button type="text" size="small" icon={<RefreshCw size={11} />} onClick={loadData} className="h-6 w-6" />
                </Tooltip>
              </div>
              <div className="p-3 space-y-3">
                <div className="space-y-1">
                  <label className={`fz-small font-bold uppercase tracking-tight ${muted}`}>Date</label>
                  <DatePicker className="w-full h-8 text-xs font-semibold" value={selectedDate}
                    onChange={v => v && setSelectedDate(v)} format="DD-MMM-YYYY" />
                </div>
                <Button type="primary" block size="small" icon={<Search size={13} />}
                  onClick={loadData} loading={loading}
                  className="h-9 font-bold uppercase tracking-wide text-xs">
                  Load Report
                </Button>
              </div>
            </motion.div>

            {/* Stats */}
            <AnimatePresence>
              {data && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col gap-2">
                  <div className={`border rounded-lg p-3 ${panel}`}>
                    <div className={`fz-small font-bold uppercase tracking-wide mb-1 ${muted}`}>Opening</div>
                    <div className={`text-sm font-black font-mono ${text}`}>{fmtSigned(data.openingBalance)}</div>
                  </div>
                  <div className={`rounded-lg p-3 ${isDark ? 'bg-emerald-600/20 border border-emerald-500/30' : 'bg-emerald-50 border border-emerald-200'}`}>
                    <div className={`fz-small font-bold uppercase tracking-wide mb-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Receipts</div>
                    <div className={`text-sm font-black font-mono ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>{fmt(data.totalReceipts)}</div>
                  </div>
                  <div className={`rounded-lg p-3 ${isDark ? 'bg-slate-700/50 border border-slate-600' : 'bg-slate-100 border border-slate-200'}`}>
                    <div className={`fz-small font-bold uppercase tracking-wide mb-0.5 ${muted}`}>Cash Total</div>
                    <div className={`text-sm font-black font-mono ${text}`}>{fmtSigned(data.totalCash)}</div>
                  </div>
                  <div className={`rounded-lg p-3 ${isDark ? 'bg-rose-600/20 border border-rose-500/30' : 'bg-rose-50 border border-rose-200'}`}>
                    <div className={`fz-small font-bold uppercase tracking-wide mb-0.5 ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>Payments</div>
                    <div className={`text-sm font-black font-mono ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>{fmt(data.totalPayments)}</div>
                  </div>
                  <div className={`rounded-lg p-3 border ${data.closingBalance >= 0
                    ? (isDark ? 'bg-violet-600/20 border-violet-500/30' : 'bg-violet-50 border-violet-200')
                    : (isDark ? 'bg-rose-900/30 border-rose-700/40' : 'bg-rose-50 border-rose-200')}`}>
                    <div className={`fz-small font-bold uppercase tracking-wide mb-0.5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>Closing</div>
                    <div className={`text-sm font-black font-mono ${data.closingBalance >= 0
                      ? (isDark ? 'text-violet-300' : 'text-violet-700')
                      : (isDark ? 'text-rose-300' : 'text-rose-700')}`}>
                      {fmtSigned(data.closingBalance)}
                    </div>
                  </div>
                  <div className={`border rounded-lg p-3 ${panel}`}>
                    <div className={`fz-small font-bold uppercase tracking-wide mb-1 ${muted}`}>Heads</div>
                    <div className={`text-lg font-black font-mono ${text}`}>{data.totalHeads}</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Report panel */}
          <div className={`flex-1 border rounded-xl flex flex-col overflow-hidden ${panel}`}>
            <div className={`border-b px-4 py-2 flex items-center justify-between shrink-0 ${panelHead}`}>
              <span className={`text-xs font-extrabold uppercase tracking-wide ${text}`}>
                Consolidation — {selectedDate.format('DD-MMM-YYYY')}
              </span>
              {data && (
                <span className={`fz-small font-mono ${muted}`}>{data.totalHeads} heads</span>
              )}
            </div>

            <div className={`flex-1 overflow-auto p-4 ${isDark ? 'bg-slate-900/40' : 'bg-white'}`}>
              <Spin spinning={loading} tip="Loading...">
                {hasData ? (
                  <div id="consol-print-area">
                    {/* Company header */}
                    <div className={`text-center mb-4 pb-3 border-b border-dashed ${border}`}>
                      <div className={`text-sm font-bold ${text}`}>Espat Karmchari Co-Operative Credit Society Limited.</div>
                      <div className={`fz-caption ${muted}`}>Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006</div>
                      <div className={`fz-small mt-0.5 ${muted}`}>Consolidation Of Daily Accounts for Date : {selectedDate.format('DD-MMM-YYYY')}</div>
                    </div>

                    {/* Col headers */}
                    <table className={`w-full fz-caption font-mono border-collapse border ${border} mb-0`}>
                      <thead>
                        <tr className={headRowBg}>
                          <th className={`px-3 py-1.5 text-left font-black border-b ${border} w-24 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Code</th>
                          <th className={`px-3 py-1.5 text-left font-black border-b ${border} ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Name</th>
                          <th className={`px-3 py-1.5 text-right font-black border-b ${border} w-32 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Amount</th>
                        </tr>
                      </thead>

                      {data.receiptGroups.length > 0 && (
                        <Section groups={data.receiptGroups} label="RECEIPT" />
                      )}
                      {data.paymentGroups.length > 0 && (
                        <Section groups={data.paymentGroups} label="PAYMENT" />
                      )}

                      {/* Summary */}
                      <tbody>
                        {[
                          { label: 'Opening Balance :', value: fmtSigned(data.openingBalance), cls: text },
                          { label: 'Total Receipt :', value: fmt(data.totalReceipts), cls: isDark ? 'text-emerald-300' : 'text-emerald-600' },
                          { label: 'Total Cash :', value: fmtSigned(data.totalCash), cls: text },
                          { label: 'Total Payment :', value: fmt(data.totalPayments), cls: isDark ? 'text-rose-300' : 'text-rose-600' },
                          { label: 'Closing Balance :', value: fmtSigned(data.closingBalance), cls: data.closingBalance >= 0 ? (isDark ? 'text-violet-300' : 'text-violet-700') : (isDark ? 'text-rose-300' : 'text-rose-600') },
                        ].map(({ label, value, cls }, i) => (
                          <tr key={i} className={`border-b ${border} ${summaryBg}`}>
                            <td colSpan={2} className={`px-3 py-1.5 text-right text-xs font-bold ${muted}`}>{label}</td>
                            <td className={`px-3 py-1.5 text-right text-xs font-black font-mono ${cls}`}>{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className={`mt-3 fz-small italic ${muted}`}>* Report As Per Data Available ..</div>
                  </div>
                ) : !loading ? (
                  <div className="flex flex-col items-center justify-center h-64 gap-3">
                    <Layers size={48} className={isDark ? 'text-slate-700' : 'text-slate-300'} />
                    <p className={`text-sm font-bold uppercase tracking-wide ${muted}`}>
                      No transactions on {selectedDate.format('DD-MMM-YYYY')}
                    </p>
                    <p className={`text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                      Try <span className={`font-mono ${isDark ? 'text-violet-400' : 'text-violet-500'}`}>07-Feb-2024</span>
                    </p>
                  </div>
                ) : null}
              </Spin>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`border-t px-4 py-1.5 flex items-center justify-between shrink-0 ${panel}`}>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-pulse" />
            <span className={`fz-small font-bold uppercase tracking-wide ${muted}`}>Consolidation · Daily A/c Summary</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`fz-small font-mono ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{selectedDate.format('YYYYMMDD')}</span>
            <span className={`fz-small font-bold px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
              {isDark ? '◐ DARK' : '◑ LIGHT'}
            </span>
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default ConsolidationOfDailyAccount;
