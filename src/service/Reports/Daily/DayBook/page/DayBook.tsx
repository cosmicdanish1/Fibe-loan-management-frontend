import React, { useState, useEffect } from 'react';
import { Settings, RefreshCw, Printer, FileDown, Search, BookOpen, ShieldCheck } from 'lucide-react';
import { ConfigProvider, Button, DatePicker, Spin, Tooltip, theme as antdTheme } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';
import { apiService } from '../../../../../services/api';
import dayjs from 'dayjs';

interface DayBookEntry {
  mbNo: string;
  memberName: string;
  voucherNo: string;
  amount: number;
  username: string;
}

interface HeadGroup {
  headCode: string;
  headName: string;
  entries: DayBookEntry[];
  total: number;
}

interface DayBookData {
  date: string;
  openingBalance: number;
  totalReceipts: number;
  totalPayments: number;
  closingBalance: number;
  paymentGroups: HeadGroup[];
  receiptGroups: HeadGroup[];
  totalTransactions: number;
}

const fmt = (n: number) =>
  Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtSigned = (n: number) => (n < 0 ? '-' : '') + fmt(n);

const DayBook: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs().subtract(1, 'day'));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DayBookData | null>(null);

  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Theme variables
  const bg        = isDark ? 'bg-[#0f172a]'                                  : 'bg-slate-50';
  const header    = isDark ? 'bg-slate-800 border-b border-slate-700'         : 'bg-white/80 backdrop-blur-sm border-b border-slate-200';
  const panel     = isDark ? 'bg-slate-800 border border-slate-700'           : 'bg-white border border-slate-200';
  const panelHd   = isDark ? 'bg-slate-900/50 border-b border-slate-700'      : 'bg-slate-50 border-b border-slate-100';
  const panelHdTx = isDark ? 'text-slate-300'                                 : 'text-slate-700';
  const text      = isDark ? 'text-slate-100'                                 : 'text-slate-800';
  const muted     = isDark ? 'text-slate-400'                                 : 'text-slate-500';
  const subtle    = isDark ? 'text-slate-500'                                 : 'text-slate-400';
  const tblBdr    = isDark ? 'border-slate-700/50'                            : 'border-slate-200';
  const rowEven   = isDark ? 'bg-slate-800/80'                                : 'bg-white';
  const rowOdd    = isDark ? 'bg-slate-800/40'                                : 'bg-slate-50/60';
  const rowHov    = isDark ? 'hover:bg-slate-700/30'                          : 'hover:bg-indigo-50/30';
  const groupHd   = isDark ? 'bg-slate-700/60 border border-slate-600'        : 'bg-slate-100 border border-slate-300';
  const groupTbl  = isDark ? 'border border-slate-700 border-t-0'             : 'border border-slate-300 border-t-0';
  const totalRow  = isDark ? 'border-t border-slate-500 bg-slate-900/60'      : 'border-t border-slate-300 bg-slate-100';
  const sumRow    = isDark ? 'bg-slate-800/60 border-b border-slate-700/50'   : 'bg-white border-b border-slate-100';
  const contentBg = isDark ? 'bg-slate-900/40'                                : 'bg-white';
  const compBdr   = isDark ? 'border-b border-dashed border-slate-600'        : 'border-b border-dashed border-slate-300';
  const payBanner = isDark ? 'bg-rose-900/40 text-rose-300 border border-rose-700/40'     : 'bg-rose-50 text-rose-700 border border-rose-200';
  const rcptBannr = isDark ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/40' : 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  const grpCode   = isDark ? 'text-indigo-300'                                : 'text-indigo-700';
  const grpName   = isDark ? 'text-slate-200'                                 : 'text-slate-700';
  const mbNoTx    = isDark ? 'text-slate-400'                                 : 'text-slate-500';
  const nameTx    = isDark ? 'text-slate-200'                                 : 'text-slate-700';
  const ftrBg     = isDark ? 'bg-slate-800 border-t border-slate-700'         : 'bg-white/80 border-t border-slate-200';

  useEffect(() => { loadData(); }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await apiService.getDayBookReport(selectedDate.format('YYYY-MM-DD'), 'screen', 'all');
      if (response.success && response.data) {
        const d = response.data?.data ?? response.data;
        setData(d);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!data) return;
    const content = document.getElementById('db-print-area')?.innerHTML || '';
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><title>Day Book</title>
<style>
  @page { size:A4 portrait; margin:12mm; }
  body { font-family:'Courier New',monospace; font-size:9pt; color:#000; background:#fff; }
  table { width:100%; border-collapse:collapse; }
  th,td { border:1px solid #555; padding:2px 4px; font-size:8.5pt; }
  .head-row td { font-weight:bold; background:#ddd; }
  .total-row td { font-weight:bold; }
  .section-title { font-size:11pt; font-weight:bold; margin:8px 0 4px; }
  .summary { margin-top:12px; }
</style></head><body>${content}</body></html>`);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 300);
    }
  };

  const handleExportCSV = () => {
    if (!data) return;
    let csv = 'Section,Head Code,Head Name,MB No,Member Name,Voucher,Amount,User\n';
    data.paymentGroups.forEach(g =>
      g.entries.forEach(e =>
        csv += `Payment,${g.headCode},"${g.headName}",${e.mbNo},"${e.memberName}",${e.voucherNo},${e.amount},"${e.username}"\n`
      )
    );
    data.receiptGroups.forEach(g =>
      g.entries.forEach(e =>
        csv += `Receipt,${g.headCode},"${g.headName}",${e.mbNo},"${e.memberName}",${e.voucherNo},${e.amount},"${e.username}"\n`
      )
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = `DayBook_${selectedDate.format('YYYY-MM-DD')}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const hasData = data && (data.paymentGroups.length > 0 || data.receiptGroups.length > 0);

  const GroupTable = ({ groups, section }: { groups: HeadGroup[]; section: 'Payment' | 'Receipt' }) => (
    <div className="mb-4">
      <div className={`px-3 py-1.5 text-xs font-black uppercase tracking-widest mb-2 rounded
        ${section === 'Payment' ? payBanner : rcptBannr}`}>
        ▶ {section}
      </div>

      {groups.map((group) => (
        <div key={group.headCode} className="mb-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-t ${groupHd}`}>
            <span className={`text-xs font-black font-mono tracking-wide ${grpCode}`}>{group.headCode}</span>
            <span className={`text-xs font-bold uppercase ${grpName}`}>{group.headName}</span>
          </div>

          <table className={`w-full fz-caption font-mono ${groupTbl}`}>
            <tbody>
              {group.entries.map((e, i) => (
                <tr key={i} className={`${tblBdr} border-b ${rowHov} transition-colors ${i % 2 === 0 ? rowEven : rowOdd}`}>
                  <td className={`py-0.5 px-2 w-24 ${mbNoTx}`}>{e.mbNo}</td>
                  <td className={`py-0.5 px-2 ${nameTx}`}>{e.memberName}</td>
                  <td className="py-0.5 px-2 text-amber-500 font-semibold w-20">{e.voucherNo}</td>
                  <td className={`py-0.5 px-2 text-right font-semibold w-28
                    ${section === 'Payment' ? (isDark ? 'text-rose-300' : 'text-rose-600') : (isDark ? 'text-emerald-300' : 'text-emerald-600')}`}>
                    {fmt(e.amount)}
                  </td>
                  <td className={`py-0.5 px-2 w-36 fz-small ${subtle}`}>{e.username}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={totalRow}>
                <td colSpan={3} className={`py-1 px-2 text-xs font-black text-right ${muted}`}>Total</td>
                <td className={`py-1 px-2 text-right text-xs font-black
                  ${section === 'Payment' ? (isDark ? 'text-rose-200' : 'text-rose-700') : (isDark ? 'text-emerald-200' : 'text-emerald-700')}`}>
                  {fmt(group.total)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      ))}
    </div>
  );

  return (
    <ConfigProvider theme={{
      algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      token: {
        colorPrimary: '#6366f1',
        borderRadius: 8,
        colorBgContainer: isDark ? '#1e293b' : '#ffffff',
        colorBorder: isDark ? '#334155' : '#e2e8f0',
      },
    }}>
      <div className={`h-screen flex flex-col font-sans overflow-hidden ${bg} ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>

        {/* Header */}
        <div className={`px-4 py-2.5 flex items-center justify-between shrink-0 ${header}`}>
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-500/30">
              <BookOpen size={18} className="text-white" />
            </div>
            <div>
              <h1 className={`text-sm font-extrabold tracking-tight leading-none ${text}`}>Day Book</h1>
              <div className={`flex items-center gap-1.5 mt-0.5 fz-small font-semibold uppercase tracking-wide ${muted}`}>
                <ShieldCheck size={10} className="text-indigo-400" /> Daily Transaction Journal
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button icon={<Printer size={13} />} size="small"
              className="h-8 px-3 rounded-lg text-xs font-bold uppercase tracking-wide"
              onClick={handlePrint} disabled={!hasData}>
              Print
            </Button>
            <Button type="primary" icon={<FileDown size={13} />} size="small"
              className="h-8 px-4 rounded-lg text-xs font-bold uppercase tracking-wide"
              onClick={handleExportCSV} disabled={!hasData}>
              CSV
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden p-3 flex gap-3">

          {/* Left panel */}
          <div className="w-[240px] flex flex-col gap-3 shrink-0">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl overflow-hidden ${panel}`}>
              <div className={`px-3 py-2 flex items-center justify-between ${panelHd}`}>
                <h3 className={`fz-caption font-extrabold tracking-wide uppercase flex items-center gap-1.5 ${panelHdTx}`}>
                  <Settings size={11} className="text-indigo-400" /> Parameters
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
                  <div className={`rounded-lg p-3 ${panel}`}>
                    <div className={`fz-small font-bold uppercase tracking-wide mb-1 ${muted}`}>Opening</div>
                    <div className={`text-sm font-black font-mono ${text}`}>{fmtSigned(data.openingBalance)}</div>
                  </div>
                  <div className={`rounded-lg p-3 ${isDark ? 'bg-emerald-600/20 border border-emerald-500/30' : 'bg-emerald-50 border border-emerald-200'}`}>
                    <div className={`fz-small font-bold uppercase tracking-wide mb-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Receipts</div>
                    <div className={`text-sm font-black font-mono ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>{fmt(data.totalReceipts)}</div>
                  </div>
                  <div className={`rounded-lg p-3 ${isDark ? 'bg-rose-600/20 border border-rose-500/30' : 'bg-rose-50 border border-rose-200'}`}>
                    <div className={`fz-small font-bold uppercase tracking-wide mb-0.5 ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>Payments</div>
                    <div className={`text-sm font-black font-mono ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>{fmt(data.totalPayments)}</div>
                  </div>
                  <div className={`border rounded-lg p-3 ${data.closingBalance >= 0
                    ? (isDark ? 'bg-indigo-600/20 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200')
                    : (isDark ? 'bg-rose-900/30 border-rose-700/40' : 'bg-rose-50 border-rose-200')}`}>
                    <div className={`fz-small font-bold uppercase tracking-wide mb-0.5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>Closing</div>
                    <div className={`text-sm font-black font-mono ${data.closingBalance >= 0
                      ? (isDark ? 'text-indigo-300' : 'text-indigo-700')
                      : (isDark ? 'text-rose-300' : 'text-rose-700')}`}>
                      {fmtSigned(data.closingBalance)}
                    </div>
                  </div>
                  <div className={`rounded-lg p-3 ${panel}`}>
                    <div className={`fz-small font-bold uppercase tracking-wide mb-1 ${muted}`}>Transactions</div>
                    <div className={`text-lg font-black font-mono ${text}`}>{data.totalTransactions}</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Report panel */}
          <div className={`flex-1 rounded-xl flex flex-col overflow-hidden ${panel}`}>
            <div className={`px-4 py-2 flex items-center justify-between shrink-0 ${panelHd}`}>
              <span className={`text-xs font-extrabold uppercase tracking-wide ${panelHdTx}`}>
                Day Book — {selectedDate.format('DD-MMM-YYYY')}
              </span>
              {data && (
                <span className={`fz-small font-mono ${subtle}`}>
                  {data.totalTransactions} entries
                </span>
              )}
            </div>

            <div className={`flex-1 overflow-auto p-4 ${contentBg}`}>
              <Spin spinning={loading} tip="Loading...">
                {hasData ? (
                  <div id="db-print-area">
                    {/* Company header */}
                    <div className={`text-center mb-4 pb-3 ${compBdr}`}>
                      <div className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Espat Karmchari Co-Operative Credit Society Limited.</div>
                      <div className={`fz-caption ${muted}`}>Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006</div>
                      <div className={`fz-small mt-0.5 ${subtle}`}>DAY BOOK — {selectedDate.format('DD-MMM-YYYY')}</div>
                    </div>

                    {/* Column header hint */}
                    <div className={`grid font-mono fz-small uppercase tracking-wide mb-1 px-2 ${subtle}`}
                      style={{ gridTemplateColumns: '6rem 1fr 5rem 7rem 9rem' }}>
                      <span>MB No</span><span>Name</span><span>Voucher</span><span className="text-right">Amount</span><span>User</span>
                    </div>

                    {data.paymentGroups.length > 0 && (
                      <GroupTable groups={data.paymentGroups} section="Payment" />
                    )}

                    {data.receiptGroups.length > 0 && (
                      <GroupTable groups={data.receiptGroups} section="Receipt" />
                    )}

                    {/* Summary */}
                    <div className={`mt-4 border rounded-lg overflow-hidden ${isDark ? 'border-slate-600' : 'border-slate-300'}`}>
                      {[
                        { label: 'Opening Balance :', value: fmtSigned(data.openingBalance), cls: text },
                        { label: 'Total Receipt :', value: fmt(data.totalReceipts), cls: isDark ? 'text-emerald-300' : 'text-emerald-600' },
                        { label: 'Total :', value: fmtSigned(data.openingBalance + data.totalReceipts), cls: text },
                        { label: 'Total Payment :', value: fmt(data.totalPayments), cls: isDark ? 'text-rose-300' : 'text-rose-600' },
                        { label: 'Closing Balance :', value: fmtSigned(data.closingBalance), cls: data.closingBalance >= 0 ? (isDark ? 'text-indigo-300' : 'text-indigo-600') : (isDark ? 'text-rose-300' : 'text-rose-600') },
                      ].map(({ label, value, cls }, i) => (
                        <div key={i} className={`flex justify-between items-center px-4 py-1.5 last:border-b-0 ${sumRow}`}>
                          <span className={`text-xs font-bold ${muted}`}>{label}</span>
                          <span className={`text-xs font-black font-mono ${cls}`}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : !loading ? (
                  <div className="flex flex-col items-center justify-center h-64 gap-3">
                    <BookOpen size={48} className={isDark ? 'text-slate-700' : 'text-slate-300'} />
                    <p className={`text-sm font-bold uppercase tracking-wide ${muted}`}>No transactions on {selectedDate.format('DD-MMM-YYYY')}</p>
                    <p className={`text-xs ${subtle}`}>Try <span className="text-indigo-500 font-mono">07-Feb-2024</span></p>
                  </div>
                ) : null}
              </Spin>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-4 py-1.5 flex items-center justify-between shrink-0 ${ftrBg}`}>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
            <span className={`fz-small font-bold uppercase tracking-wide ${muted}`}>Day Book · Daily Journal</span>
          </div>
          <span className={`fz-small font-mono ${subtle}`}>{selectedDate.format('YYYYMMDD')}</span>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default DayBook;
