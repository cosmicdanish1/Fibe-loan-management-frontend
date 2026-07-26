import React, { useState, useEffect } from 'react';
import { Settings, RefreshCw, Printer, FileDown, Search, PiggyBank, ShieldCheck } from 'lucide-react';
import { ConfigProvider, Button, DatePicker, Spin, Tooltip, theme as antdTheme } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';
import { apiService } from '../../../../../services/api';
import dayjs from 'dayjs';

interface SBEntry {
  srNo: number;
  accNo: string;
  acName: string;
  depositCash: number;
  depositTransfer: number;
  withdrawalCash: number;
  withdrawalTransfer: number;
}

interface SBData {
  date: string;
  openingBalance: number;
  totalDepositCash: number;
  totalDepositTransfer: number;
  totalDeposit: number;
  totalWithdrawalCash: number;
  totalWithdrawalTransfer: number;
  totalWithdrawal: number;
  totalCashInHand: number;
  closingBalance: number;
  totalTransactions: number;
  entries: SBEntry[];
}

const fmt = (n: number) =>
  Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtSigned = (n: number) => (n < 0 ? '-' : '') + fmt(n);

const DayBookSB: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs().subtract(1, 'day'));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SBData | null>(null);

  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Theme variables
  const bg        = isDark ? 'bg-[#0f172a]'                             : 'bg-slate-50';
  const header    = isDark ? 'bg-slate-800 border-b border-slate-700'   : 'bg-white/80 backdrop-blur-sm border-b border-slate-200';
  const panel     = isDark ? 'bg-slate-800 border border-slate-700'     : 'bg-white border border-slate-200';
  const panelHd   = isDark ? 'bg-slate-900/50 border-b border-slate-700': 'bg-slate-50 border-b border-slate-100';
  const panelHdTx = isDark ? 'text-slate-300'                           : 'text-slate-700';
  const text      = isDark ? 'text-slate-100'                           : 'text-slate-800';
  const muted     = isDark ? 'text-slate-400'                           : 'text-slate-500';
  const subtle    = isDark ? 'text-slate-500'                           : 'text-slate-400';
  const tblBdr    = isDark ? 'border-slate-700/50'                      : 'border-slate-200';
  const tblBdrFull= isDark ? 'border-slate-600'                         : 'border-slate-300';
  const rowEven   = isDark ? 'bg-slate-800/80'                          : 'bg-white';
  const rowOdd    = isDark ? 'bg-slate-800/40'                          : 'bg-slate-50/60';
  const rowHov    = isDark ? 'hover:bg-slate-700/30'                    : 'hover:bg-sky-50/30';
  const tblHd     = isDark ? 'bg-slate-700 text-slate-200'              : 'bg-slate-100 text-slate-700';
  const totalRow  = isDark ? 'border-t-2 border-slate-500 bg-slate-700/60': 'border-t-2 border-slate-300 bg-slate-100';
  const sumRowBg  = isDark ? 'bg-slate-800/60'                          : 'bg-white';
  const sumLbl    = isDark ? 'text-slate-400'                           : 'text-slate-600';
  const contentBg = isDark ? 'bg-slate-900/40'                          : 'bg-white';
  const compBdr   = isDark ? 'border-b border-dashed border-slate-600'  : 'border-b border-dashed border-slate-300';
  const ftrBg     = isDark ? 'bg-slate-800 border-t border-slate-700'   : 'bg-white/80 border-t border-slate-200';

  useEffect(() => { loadData(); }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await apiService.getDayBookSBReport(selectedDate.format('YYYY-MM-DD'), 'screen');
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
    const content = document.getElementById('sb-print-area')?.innerHTML || '';
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><title>Day Book [SB]</title>
<style>
  @page { size:A4 landscape; margin:10mm; }
  body { font-family:'Courier New',monospace; font-size:8pt; color:#000; background:#fff; }
  table { width:100%; border-collapse:collapse; }
  th,td { border:1px solid #666; padding:2px 4px; font-size:8pt; }
  th { background:#ddd; font-weight:bold; }
  .total-row td { font-weight:bold; background:#eee; }
  .summary-row td { font-weight:bold; }
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
    let csv = 'Sr No,A/C No,A/C Name,Deposit Cash,Deposit Transfer,Deposit Total,Withdrawal Cash,Withdrawal Transfer,Withdrawal Total\n';
    data.entries.forEach(e =>
      csv += `${e.srNo},${e.accNo},"${e.acName}",${e.depositCash},${e.depositTransfer},${e.depositCash + e.depositTransfer},${e.withdrawalCash},${e.withdrawalTransfer},${e.withdrawalCash + e.withdrawalTransfer}\n`
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = `DayBookSB_${selectedDate.format('YYYY-MM-DD')}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const hasData = data && data.entries.length > 0;

  return (
    <ConfigProvider theme={{
      algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      token: {
        colorPrimary: '#0ea5e9',
        borderRadius: 8,
        colorBgContainer: isDark ? '#1e293b' : '#ffffff',
        colorBorder: isDark ? '#334155' : '#e2e8f0',
      },
    }}>
      <div className={`h-screen flex flex-col font-sans overflow-hidden ${bg} ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>

        {/* Header */}
        <div className={`px-4 py-2.5 flex items-center justify-between shrink-0 ${header}`}>
          <div className="flex items-center gap-3">
            <div className="bg-sky-600 p-2 rounded-lg shadow-lg shadow-sky-500/30">
              <PiggyBank size={18} className="text-white" />
            </div>
            <div>
              <h1 className={`text-sm font-extrabold tracking-tight leading-none ${text}`}>Day Book [Saving]</h1>
              <div className={`flex items-center gap-1.5 mt-0.5 text-[10px] font-semibold uppercase tracking-wide ${muted}`}>
                <ShieldCheck size={10} className="text-sky-400" /> Savings Bank Ledger
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
                <h3 className={`text-[11px] font-extrabold tracking-wide uppercase flex items-center gap-1.5 ${panelHdTx}`}>
                  <Settings size={11} className="text-sky-400" /> Parameters
                </h3>
                <Tooltip title="Reload">
                  <Button type="text" size="small" icon={<RefreshCw size={11} />} onClick={loadData} className="h-6 w-6" />
                </Tooltip>
              </div>
              <div className="p-3 space-y-3">
                <div className="space-y-1">
                  <label className={`text-[10px] font-bold uppercase tracking-tight ${muted}`}>Date</label>
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
                    <div className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${muted}`}>Opening [SB]</div>
                    <div className={`text-sm font-black font-mono ${text}`}>{fmtSigned(data.openingBalance)}</div>
                  </div>
                  <div className={`rounded-lg p-3 ${isDark ? 'bg-sky-600/20 border border-sky-500/30' : 'bg-sky-50 border border-sky-200'}`}>
                    <div className={`text-[10px] font-bold uppercase tracking-wide mb-0.5 ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>Total Deposit</div>
                    <div className={`text-sm font-black font-mono ${isDark ? 'text-sky-300' : 'text-sky-700'}`}>{fmt(data.totalDeposit)}</div>
                    <div className={`text-[9px] mt-1 ${isDark ? 'text-sky-500' : 'text-sky-500'}`}>Cash: {fmt(data.totalDepositCash)} | Trf: {fmt(data.totalDepositTransfer)}</div>
                  </div>
                  <div className={`rounded-lg p-3 ${panel}`}>
                    <div className={`text-[10px] font-bold uppercase tracking-wide mb-0.5 ${muted}`}>Cash In Hand</div>
                    <div className={`text-sm font-black font-mono ${text}`}>{fmt(data.totalCashInHand)}</div>
                  </div>
                  <div className={`rounded-lg p-3 ${isDark ? 'bg-rose-600/20 border border-rose-500/30' : 'bg-rose-50 border border-rose-200'}`}>
                    <div className={`text-[10px] font-bold uppercase tracking-wide mb-0.5 ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>Total Withdrawal</div>
                    <div className={`text-sm font-black font-mono ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>{fmt(data.totalWithdrawal)}</div>
                    <div className={`text-[9px] mt-1 ${isDark ? 'text-rose-500' : 'text-rose-500'}`}>Cash: {fmt(data.totalWithdrawalCash)} | Trf: {fmt(data.totalWithdrawalTransfer)}</div>
                  </div>
                  <div className={`border rounded-lg p-3 ${data.closingBalance >= 0
                    ? (isDark ? 'bg-sky-600/20 border-sky-500/30' : 'bg-sky-50 border-sky-200')
                    : (isDark ? 'bg-rose-900/30 border-rose-700/40' : 'bg-rose-50 border-rose-200')}`}>
                    <div className={`text-[10px] font-bold uppercase tracking-wide mb-0.5 ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>Closing [SB]</div>
                    <div className={`text-sm font-black font-mono ${data.closingBalance >= 0
                      ? (isDark ? 'text-sky-300' : 'text-sky-700')
                      : (isDark ? 'text-rose-300' : 'text-rose-700')}`}>
                      {fmtSigned(data.closingBalance)}
                    </div>
                  </div>
                  <div className={`rounded-lg p-3 ${panel}`}>
                    <div className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${muted}`}>Transactions</div>
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
                Day Book [Saving] — {selectedDate.format('DD-MMM-YYYY')}
              </span>
              {data && (
                <span className={`text-[10px] font-mono ${subtle}`}>{data.totalTransactions} entries</span>
              )}
            </div>

            <div className={`flex-1 overflow-auto p-4 ${contentBg}`}>
              <Spin spinning={loading} tip="Loading...">
                {hasData ? (
                  <div id="sb-print-area">
                    {/* Company header */}
                    <div className={`text-center mb-4 pb-3 ${compBdr}`}>
                      <div className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Espat Karmchari Co-Operative Credit Society Limited.</div>
                      <div className={`text-[11px] ${muted}`}>Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006</div>
                      <div className={`text-[10px] mt-0.5 ${subtle}`}>Day Book [Saving] for Date : {selectedDate.format('DD-MMM-YYYY')}</div>
                    </div>

                    {/* Main table */}
                    <div className="overflow-x-auto">
                      <table className={`w-full text-[11px] font-mono border-collapse border ${tblBdrFull}`}>
                        <thead>
                          <tr>
                            <th rowSpan={2} className={`border ${tblBdrFull} px-2 py-1.5 text-left w-12 align-bottom ${tblHd}`}>Tr No</th>
                            <th rowSpan={2} className={`border ${tblBdrFull} px-2 py-1.5 text-left w-20 align-bottom ${tblHd}`}>A/C No.</th>
                            <th rowSpan={2} className={`border ${tblBdrFull} px-2 py-1.5 text-left align-bottom ${tblHd}`}>A/C Name</th>
                            <th colSpan={3} className={`border ${tblBdrFull} px-2 py-1 text-center font-bold ${isDark ? 'bg-sky-900/60 text-sky-300' : 'bg-sky-100 text-sky-700'}`}>Deposit</th>
                            <th colSpan={3} className={`border ${tblBdrFull} px-2 py-1 text-center font-bold ${isDark ? 'bg-rose-900/40 text-rose-300' : 'bg-rose-100 text-rose-700'}`}>Withdrawal</th>
                          </tr>
                          <tr>
                            <th className={`border ${tblBdrFull} px-2 py-1 text-right w-24 ${isDark ? 'bg-sky-900/40 text-sky-300' : 'bg-sky-50 text-sky-600'}`}>Cash</th>
                            <th className={`border ${tblBdrFull} px-2 py-1 text-right w-24 ${isDark ? 'bg-sky-900/40 text-sky-300' : 'bg-sky-50 text-sky-600'}`}>Transfer</th>
                            <th className={`border ${tblBdrFull} px-2 py-1 text-right w-24 ${isDark ? 'bg-sky-900/40 text-sky-300' : 'bg-sky-50 text-sky-600'}`}>Total</th>
                            <th className={`border ${tblBdrFull} px-2 py-1 text-right w-24 ${isDark ? 'bg-rose-900/30 text-rose-300' : 'bg-rose-50 text-rose-600'}`}>Cash</th>
                            <th className={`border ${tblBdrFull} px-2 py-1 text-right w-24 ${isDark ? 'bg-rose-900/30 text-rose-300' : 'bg-rose-50 text-rose-600'}`}>Transfer</th>
                            <th className={`border ${tblBdrFull} px-2 py-1 text-right w-24 ${isDark ? 'bg-rose-900/30 text-rose-300' : 'bg-rose-50 text-rose-600'}`}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.entries.map((e, i) => (
                            <tr key={i} className={`${tblBdr} border-b ${rowHov} transition-colors ${i % 2 === 0 ? rowEven : rowOdd}`}>
                              <td className={`border ${tblBdr} px-2 py-0.5 ${muted}`}>{e.srNo}</td>
                              <td className={`border ${tblBdr} px-2 py-0.5 text-amber-500 font-semibold`}>{e.accNo}</td>
                              <td className={`border ${tblBdr} px-2 py-0.5 ${text}`}>{e.acName}</td>
                              <td className={`border ${tblBdr} px-2 py-0.5 text-right ${isDark ? 'text-sky-300' : 'text-sky-600'}`}>
                                {e.depositCash > 0 ? fmt(e.depositCash) : '0.00'}
                              </td>
                              <td className={`border ${tblBdr} px-2 py-0.5 text-right ${isDark ? 'text-sky-400' : 'text-sky-500'}`}>
                                {e.depositTransfer > 0 ? fmt(e.depositTransfer) : '0.00'}
                              </td>
                              <td className={`border ${tblBdr} px-2 py-0.5 text-right font-semibold ${isDark ? 'text-sky-200' : 'text-sky-700'}`}>
                                {(e.depositCash + e.depositTransfer) > 0 ? fmt(e.depositCash + e.depositTransfer) : '0.00'}
                              </td>
                              <td className={`border ${tblBdr} px-2 py-0.5 text-right ${isDark ? 'text-rose-300' : 'text-rose-600'}`}>
                                {e.withdrawalCash > 0 ? fmt(e.withdrawalCash) : '0.00'}
                              </td>
                              <td className={`border ${tblBdr} px-2 py-0.5 text-right ${isDark ? 'text-rose-400' : 'text-rose-500'}`}>
                                {e.withdrawalTransfer > 0 ? fmt(e.withdrawalTransfer) : '0.00'}
                              </td>
                              <td className={`border ${tblBdr} px-2 py-0.5 text-right font-semibold ${isDark ? 'text-rose-200' : 'text-rose-700'}`}>
                                {(e.withdrawalCash + e.withdrawalTransfer) > 0 ? fmt(e.withdrawalCash + e.withdrawalTransfer) : '0.00'}
                              </td>
                            </tr>
                          ))}

                          {/* Grand total */}
                          <tr className={totalRow}>
                            <td colSpan={3} className={`border ${tblBdrFull} px-2 py-1.5 text-right font-black uppercase text-xs ${text}`}>TOTAL :-</td>
                            <td className={`border ${tblBdrFull} px-2 py-1.5 text-right font-black ${isDark ? 'text-sky-300' : 'text-sky-600'}`}>{fmt(data.totalDepositCash)}</td>
                            <td className={`border ${tblBdrFull} px-2 py-1.5 text-right font-black ${isDark ? 'text-sky-400' : 'text-sky-500'}`}>{fmt(data.totalDepositTransfer)}</td>
                            <td className={`border ${tblBdrFull} px-2 py-1.5 text-right font-black ${isDark ? 'text-sky-200' : 'text-sky-700'}`}>{fmt(data.totalDeposit)}</td>
                            <td className={`border ${tblBdrFull} px-2 py-1.5 text-right font-black ${isDark ? 'text-rose-300' : 'text-rose-600'}`}>{fmt(data.totalWithdrawalCash)}</td>
                            <td className={`border ${tblBdrFull} px-2 py-1.5 text-right font-black ${isDark ? 'text-rose-400' : 'text-rose-500'}`}>{fmt(data.totalWithdrawalTransfer)}</td>
                            <td className={`border ${tblBdrFull} px-2 py-1.5 text-right font-black ${isDark ? 'text-rose-200' : 'text-rose-700'}`}>{fmt(data.totalWithdrawal)}</td>
                          </tr>

                          {/* Summary rows */}
                          {[
                            { label: 'Opening Balance [SB]', value: fmtSigned(data.openingBalance), cls: text },
                            { label: 'Total Deposit [SB]', value: fmt(data.totalDeposit), cls: isDark ? 'text-sky-300' : 'text-sky-600' },
                            { label: 'Total Cash In Hand [SB]', value: fmt(data.totalCashInHand), cls: text },
                            { label: 'Total Withdrawal [SB]', value: fmt(data.totalWithdrawal), cls: isDark ? 'text-rose-300' : 'text-rose-600' },
                            { label: 'Closing Balance [SB]', value: fmtSigned(data.closingBalance), cls: data.closingBalance >= 0 ? (isDark ? 'text-sky-200' : 'text-sky-700') : (isDark ? 'text-rose-300' : 'text-rose-600') },
                          ].map(({ label, value, cls }, i) => (
                            <tr key={`sum-${i}`} className={`border-b ${tblBdr} ${sumRowBg}`}>
                              <td colSpan={7} className={`border ${tblBdr} px-2 py-1 text-right text-xs font-bold ${sumLbl}`}>
                                {label}
                              </td>
                              <td colSpan={2} className={`border ${tblBdr} px-2 py-1 text-right text-xs font-black ${cls}`}>{value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className={`mt-3 text-[10px] italic ${subtle}`}>
                      * Report As Per Data Available ..
                    </div>
                  </div>
                ) : !loading ? (
                  <div className="flex flex-col items-center justify-center h-64 gap-3">
                    <PiggyBank size={48} className={isDark ? 'text-slate-700' : 'text-slate-300'} />
                    <p className={`text-sm font-bold uppercase tracking-wide ${muted}`}>No SB transactions on {selectedDate.format('DD-MMM-YYYY')}</p>
                    <p className={`text-xs ${subtle}`}>Try a date with savings account activity</p>
                  </div>
                ) : null}
              </Spin>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-4 py-1.5 flex items-center justify-between shrink-0 ${ftrBg}`}>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-pulse" />
            <span className={`text-[10px] font-bold uppercase tracking-wide ${muted}`}>Day Book [SB] · Savings Ledger</span>
          </div>
          <span className={`text-[10px] font-mono ${subtle}`}>{selectedDate.format('YYYYMMDD')}</span>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default DayBookSB;
