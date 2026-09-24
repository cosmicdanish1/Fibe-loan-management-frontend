import React, { useState, useEffect } from 'react';
import {
  FileText,
  Database,
  Settings,
  RefreshCw,
  Printer,
  FileDown,
  Search,
  BookOpen,
  ShieldCheck,
} from 'lucide-react';
import { ConfigProvider, Button, DatePicker, message, Spin, Tooltip, theme as antdTheme } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';
import { apiService } from '../../../../../services/api';
import { CrDrIndicator } from '../../../../../components/shared/CrDrIndicator';
import dayjs from 'dayjs';

interface CashBookEntry {
  headCode: string;
  headName: string;
  receipt: number;
  payment: number;
  receiptCash: number;
  receiptTransfer: number;
  paymentCash: number;
  paymentTransfer: number;
}

interface CashBook2Summary {
  date: string;
  totalReceipts: number;
  totalPayments: number;
  totalReceiptsCash: number;
  totalReceiptsTransfer: number;
  totalPaymentsCash: number;
  totalPaymentsTransfer: number;
  openingBalance: number;
  closingBalance: number;
  entries: CashBookEntry[];
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const CashBook2: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CashBook2Summary | null>(null);

  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Theme variables
  const bg        = isDark ? 'bg-[#0f172a]'                             : 'bg-slate-50';
  const header    = isDark ? 'bg-gradient-to-r from-slate-900 to-slate-900 border-b border-white/5' : 'bg-white/80 backdrop-blur-sm border-b border-slate-200';
  const panel     = isDark ? 'bg-slate-800 border border-slate-700'     : 'bg-white border border-slate-200';
  const panelHd   = isDark ? 'bg-slate-900/50 border-b border-slate-700': 'bg-slate-50 border-b border-slate-100';
  const panelHdTx = isDark ? 'text-slate-300'                           : 'text-slate-700';
  const text      = isDark ? 'text-slate-100'                           : 'text-slate-800';
  const muted     = isDark ? 'text-slate-400'                           : 'text-slate-500';
  const subtle    = isDark ? 'text-slate-500'                           : 'text-slate-400';
  const tblBdr    = isDark ? 'border-slate-600'                         : 'border-slate-200';
  const tblHd     = isDark ? 'bg-slate-900/60'                          : 'bg-slate-100';
  const tblHdTx   = isDark ? 'text-slate-300'                           : 'text-slate-600';
  const rowEven   = isDark ? 'bg-slate-800'                             : 'bg-white';
  const rowOdd    = isDark ? 'bg-slate-800/50'                          : 'bg-slate-50';
  const rowHov    = isDark ? 'hover:bg-slate-700/30'                    : 'hover:bg-slate-100';
  const totalRow  = isDark ? 'bg-slate-900/60 border-slate-500'         : 'bg-slate-200 border-slate-300';
  const totalTx   = isDark ? 'text-slate-300'                           : 'text-slate-700';
  const ftrBg     = isDark ? 'bg-slate-800 border-t border-slate-700'   : 'bg-white/80 border-t border-slate-200';
  const codeTx    = isDark ? 'text-slate-400'                           : 'text-slate-500';
  const headTx    = isDark ? 'text-slate-200'                           : 'text-slate-700';
  const summaryBg = isDark ? 'bg-slate-900/40'                          : 'bg-slate-50';

  useEffect(() => { loadData(); }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await apiService.getCashBook2Report(selectedDate.format('YYYY-MM-DD'));
      if (response.success && response.data) {
        setData(response.data);
      } else {
        message.error(response.message || 'Failed to load cash book data');
      }
    } catch {
      message.error('An error occurred while fetching report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  const handleExportCSV = () => {
    if (!data?.entries?.length) { message.warning('No data to export'); return; }
    let csv = 'Espat Karmchari Co-Operative Credit Society Limited\nCASH-BOOK REPORT\n';
    csv += `Date: ${selectedDate.format('DD-MMM-YYYY')}\n\nHead Code,Head Name,Receipt Cash,Receipt Transfer,Payment Cash,Payment Transfer\n`;
    data.entries.forEach(e => { csv += `${e.headCode},"${e.headName}",${e.receiptCash},${e.receiptTransfer},${e.paymentCash},${e.paymentTransfer}\n`; });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = `CashBook2_${selectedDate.format('YYYY-MM-DD')}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    message.success('CSV exported');
  };

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
      <div className={`cashbook2-page h-screen flex flex-col font-sans overflow-hidden ${bg} ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>

        {/* Header */}
        <div className={`cashbook2-header px-4 py-2.5 flex items-center justify-between z-10 shrink-0 ${header}`}>
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <BookOpen size={18} />
            </div>
            <div>
              <h1 className={`text-sm font-extrabold tracking-tight leading-none ${text}`}>Cash Book</h1>
              <div className={`flex items-center gap-1.5 mt-0.5 fz-small font-semibold uppercase tracking-wide ${muted}`}>
                <ShieldCheck size={10} className="text-indigo-400" /> Daily Summary
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button icon={<Printer size={13} />} size="small"
              className="h-8 px-3 rounded-lg text-xs font-bold uppercase tracking-wide"
              onClick={handlePrint} disabled={!data?.entries?.length}>
              Print
            </Button>
            <Button type="primary" icon={<FileDown size={13} />} size="small"
              className="h-8 px-4 rounded-lg text-xs font-bold uppercase tracking-wide"
              onClick={handleExportCSV} disabled={!data?.entries?.length}>
              CSV
            </Button>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 overflow-hidden p-3 flex gap-3">

          {/* Left panel */}
          <div className="cb2-no-print w-[260px] flex flex-col gap-3 shrink-0">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className={`cashbook2-params-card rounded-xl overflow-hidden ${panel}`}>
              <div className={`cashbook2-card-header px-3 py-2 flex items-center justify-between ${panelHd}`}>
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
                  className="h-9 font-bold uppercase tracking-wide text-xs mt-1">
                  Load Report
                </Button>
              </div>
            </motion.div>

            <AnimatePresence>
              {data && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="grid grid-cols-1 gap-2">
                  <div className={`rounded-lg p-3 ${panel}`}>
                    <div className={`fz-small font-bold uppercase tracking-wide mb-1 ${muted}`}>Opening</div>
                    <div className={`text-base font-black font-mono ${text}`}>₹{fmt(data.openingBalance)}</div>
                  </div>
                  <div className={`rounded-lg p-3 ${isDark ? 'bg-emerald-600/20 border border-emerald-500/30' : 'bg-emerald-50 border border-emerald-200'}`}>
                    <div className={`fz-small font-bold uppercase tracking-wide mb-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Receipts</div>
                    <div className={`text-base font-black font-mono ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>₹{fmt(data.totalReceipts)}</div>
                  </div>
                  <div className={`rounded-lg p-3 ${isDark ? 'bg-rose-600/20 border border-rose-500/30' : 'bg-rose-50 border border-rose-200'}`}>
                    <div className={`fz-small font-bold uppercase tracking-wide mb-0.5 ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>Payments</div>
                    <div className={`text-base font-black font-mono ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>₹{fmt(data.totalPayments)}</div>
                  </div>
                  <div className={`rounded-lg p-3 ${isDark ? 'bg-indigo-600/20 border border-indigo-500/30' : 'bg-indigo-50 border border-indigo-200'}`}>
                    <div className={`fz-small font-bold uppercase tracking-wide mb-0.5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>Closing</div>
                    <div className={`text-base font-black font-mono ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>₹{fmt(data.closingBalance)}</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Report panel */}
          <div className={`cashbook2-report-panel flex-1 rounded-xl flex flex-col overflow-hidden ${panel}`}>
            <div className={`cashbook2-card-header px-4 py-2.5 flex items-center justify-between shrink-0 ${panelHd}`}>
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-100 border-slate-200'}`}>
                  <Database size={14} className="text-indigo-400" />
                </div>
                <div>
                  <h3 className={`text-xs font-extrabold uppercase tracking-wide leading-none ${panelHdTx}`}>Cash Book</h3>
                  <p className={`fz-small font-semibold uppercase mt-0.5 ${subtle}`}>{selectedDate.format('DD MMM YYYY')}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-3">
              <Spin spinning={loading} tip="Loading...">
                {data?.entries?.length ? (
                  <div className="cb2-print-report cashbook2-report-body font-mono text-xs">
                    <div className={`text-center mb-3 border-b border-dashed pb-2 ${tblBdr}`}>
                      <div className={`text-sm font-bold ${text}`}>Espat Karmchari Co-Operative Credit Society Limited.</div>
                      <div className={`fz-caption ${muted}`}>Avenue A, Sahakari Sadan, Sector-C, AT Post: Bhilai Nagar, Dist: DURG-490006</div>
                    </div>

                    <div className={`border rounded-lg overflow-hidden ${tblBdr}`}>
                      <table className="cashbook2-table w-full text-xs">
                        <thead>
                          <tr className={`border-b ${tblBdr} ${tblHd}`}>
                            <th rowSpan={2} className={`text-left py-2 px-3 border-r font-bold w-20 align-bottom ${tblBdr} ${tblHdTx}`}>CODE</th>
                            <th rowSpan={2} className={`cb2-wrap text-left py-2 px-3 border-r font-bold align-bottom ${tblBdr} ${tblHdTx}`}>HEAD NAME</th>
                            <th colSpan={2} className={`text-center py-1 px-3 border-r font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'} ${tblBdr}`}>RECEIPT</th>
                            <th colSpan={2} className={`text-center py-1 px-3 font-bold ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>PAYMENT</th>
                          </tr>
                          <tr className={`border-b ${tblBdr} ${tblHd}`}>
                            <th className={`text-right py-1 px-3 border-r font-bold w-24 ${tblBdr} ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>CASH</th>
                            <th className={`text-right py-1 px-3 border-r font-bold w-24 ${tblBdr} ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>TRANSFER</th>
                            <th className={`text-right py-1 px-3 border-r font-bold w-24 ${tblBdr} ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>CASH</th>
                            <th className={`text-right py-1 px-3 font-bold w-24 ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>TRANSFER</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.entries.map((entry, i) => (
                            <motion.tr key={i}
                              className={`border-b border-slate-700/50 transition-colors ${rowHov} ${i % 2 === 0 ? rowEven : rowOdd}`}
                              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                              <td className={`py-1 px-3 border-r font-semibold ${tblBdr} ${codeTx}`}>{entry.headCode}</td>
                              <td className={`cb2-wrap py-1 px-3 border-r ${tblBdr} ${headTx}`}>{entry.headName}</td>
                              <td className={`text-right py-1 px-3 border-r font-semibold ${tblBdr} ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                {entry.receiptCash > 0 ? (<><CrDrIndicator type="credit" className="mr-1" />{fmt(entry.receiptCash)}</>) : ''}
                              </td>
                              <td className={`text-right py-1 px-3 border-r font-semibold ${tblBdr} ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                {entry.receiptTransfer > 0 ? (<><CrDrIndicator type="credit" className="mr-1" />{fmt(entry.receiptTransfer)}</>) : ''}
                              </td>
                              <td className={`text-right py-1 px-3 border-r font-semibold ${tblBdr} ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>
                                {entry.paymentCash > 0 ? (<><CrDrIndicator type="debit" className="mr-1" />{fmt(entry.paymentCash)}</>) : ''}
                              </td>
                              <td className={`text-right py-1 px-3 font-semibold ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>
                                {entry.paymentTransfer > 0 ? (<><CrDrIndicator type="debit" className="mr-1" />{fmt(entry.paymentTransfer)}</>) : ''}
                              </td>
                            </motion.tr>
                          ))}

                          {/* Totals */}
                          <tr className={`border-b-2 font-bold ${totalRow}`}>
                            <td colSpan={2} className={`py-1.5 px-3 border-r ${tblBdr} ${totalTx}`}>TOTAL</td>
                            <td className={`text-right py-1.5 px-3 border-r ${tblBdr} ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>{data.totalReceiptsCash > 0 && <CrDrIndicator type="credit" className="mr-1" />}{fmt(data.totalReceiptsCash)}</td>
                            <td className={`text-right py-1.5 px-3 border-r ${tblBdr} ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>{data.totalReceiptsTransfer > 0 && <CrDrIndicator type="credit" className="mr-1" />}{fmt(data.totalReceiptsTransfer)}</td>
                            <td className={`text-right py-1.5 px-3 border-r ${tblBdr} ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>{data.totalPaymentsCash > 0 && <CrDrIndicator type="debit" className="mr-1" />}{fmt(data.totalPaymentsCash)}</td>
                            <td className={`text-right py-1.5 px-3 ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>{data.totalPaymentsTransfer > 0 && <CrDrIndicator type="debit" className="mr-1" />}{fmt(data.totalPaymentsTransfer)}</td>
                          </tr>

                          {/* Balance summary */}
                          <tr className={`border-b ${tblBdr} ${summaryBg}`}>
                            <td colSpan={4} className={`py-1 px-3 border-r ${tblBdr}`} />
                            <td className={`text-center py-1 px-3 border-r font-bold fz-small ${tblBdr} ${muted}`}>Cash In Hand</td>
                            <td className={`text-center py-1 px-3 border-r font-bold fz-small ${tblBdr} ${muted}`}>Saving Balance</td>
                            <td className={`text-center py-1 px-3 font-bold fz-small ${muted}`}>Clearing</td>
                          </tr>
                          {[
                            { label: 'Opening Balance :', v1: data.openingBalance, col: text, crdr: null },
                            { label: 'Total Credit :', v1: data.totalReceipts, col: isDark ? 'text-emerald-300' : 'text-emerald-700', crdr: 'credit' as const },
                            { label: 'Total :', v1: data.openingBalance + data.totalReceipts, col: text, crdr: null },
                            { label: 'Total Debit :', v1: data.totalPayments, col: isDark ? 'text-rose-300' : 'text-rose-700', crdr: 'debit' as const },
                          ].map(({ label, v1, col, crdr }, i) => (
                            <tr key={i} className={`border-b ${tblBdr}`}>
                              <td colSpan={4} className={`text-right py-1 px-3 border-r font-bold ${tblBdr} ${totalTx}`}>{label}</td>
                              <td className={`text-right py-1 px-3 border-r font-semibold ${tblBdr} ${col}`}>{crdr && v1 > 0 && <CrDrIndicator type={crdr} className="mr-1" />}{fmt(v1)}</td>
                              <td className={`text-right py-1 px-3 border-r font-semibold ${tblBdr} ${subtle}`}>0.00</td>
                              <td className={`text-right py-1 px-3 font-semibold ${subtle}`}>0.00</td>
                            </tr>
                          ))}
                          <tr className={`border-b-2 font-bold ${totalRow}`}>
                            <td colSpan={4} className={`text-right py-1.5 px-3 border-r ${tblBdr} ${totalTx}`}>Closing Balance :</td>
                            <td className={`text-right py-1.5 px-3 border-r font-black ${tblBdr} ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>{fmt(data.closingBalance)}</td>
                            <td className={`text-right py-1.5 px-3 border-r font-semibold ${tblBdr} ${subtle}`}>0.00</td>
                            <td className={`text-right py-1.5 px-3 font-semibold ${subtle}`}>0.00</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-40 py-20">
                    <FileText size={50} className={isDark ? 'text-slate-600' : 'text-slate-300'} />
                    <h3 className={`text-sm font-bold uppercase tracking-wide mt-3 mb-1 ${muted}`}>No Data</h3>
                    <p className={`text-xs uppercase ${subtle}`}>{selectedDate.format('DD MMM YYYY')}</p>
                  </div>
                )}
              </Spin>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`cashbook2-footer px-4 py-2 flex items-center justify-between shrink-0 ${ftrBg}`}>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
            <span className={`fz-small font-bold uppercase tracking-wide ${subtle}`}>Financial Ledger v2</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`fz-small font-semibold uppercase ${subtle}`}>Index: {selectedDate.format('YYYYMMDD')}</span>
            <div className={`px-2 py-0.5 rounded fz-small font-bold uppercase ${isDark ? 'bg-indigo-900/50 border border-indigo-700/40 text-indigo-400' : 'bg-indigo-50 border border-indigo-200 text-indigo-600'}`}>v5.2.0</div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          * { margin:0; padding:0; box-sizing:border-box; }
          body * { visibility:hidden; }

          /* This used to key off ".font-mono" — a generic utility class that
             the sidebar's "Opening" balance card ALSO carries, so that stat
             card was legitimately matched by ".font-mono, .font-mono *" and
             printed as a stray number above the report. A class unique to
             this one element removes the collision entirely. */
          .cb2-print-report, .cb2-print-report * { visibility:visible; }
          .cb2-no-print { display:none !important; }

          .cb2-print-report {
            /* fixed (not absolute): antd's Spin wrapper around this element
               sets position:relative for its loading overlay, which would
               become the containing block for an absolutely-positioned child
               and anchor top:0 to the Spin wrapper's flow position instead of
               the actual page top, leaving a blank gap above the report. */
            position:fixed; left:50%; top:0; transform:translateX(-50%);
            /* A4 is 8.27in wide; @page below reserves 0.5in per side, leaving
               7.27in. 7.5in overflowed that budget, which is what threw off
               centering and clipped content at both page edges. */
            width:7in; max-width:7in; padding:0.25in; font-size:10pt;
            background:white !important; color:black !important;
          }

          /* An official statement's figures must never break mid-number —
             that's the "-1,01,76,954.0 / 0" wrap the user flagged. Default
             every cell to nowrap; only HEAD NAME (free text, unbounded
             width) opts back into wrapping via .cb2-wrap. */
          .cb2-print-report table { table-layout:fixed !important; width:100% !important; }
          .cb2-print-report td, .cb2-print-report th { white-space:nowrap !important; }
          .cb2-print-report .cb2-wrap { white-space:normal !important; overflow-wrap:break-word !important; word-break:break-word !important; }

          @page { margin:0.5in; size:A4 portrait; }
        }

        /* ── Cash Book 2 — dark mode (reinforces the page's own isDark styling
           with the app-wide Settings palette when html.dark is active) ── */
        html.dark .cashbook2-page { background-color: #000000 !important; }
        html.dark .cashbook2-header,
        html.dark .cashbook2-footer { background-color: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; background-image: none !important; }
        html.dark .cashbook2-params-card,
        html.dark .cashbook2-report-panel { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .cashbook2-card-header { background-color: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .cashbook2-report-body { background-color: #1c1c1e !important; }
        html.dark .cashbook2-page .bg-\[\#0f172a\] { background-color: #000000 !important; }
        html.dark .cashbook2-page .bg-slate-800,
        html.dark .cashbook2-page .bg-slate-700,
        html.dark .cashbook2-page .bg-slate-700\/60 { background-color: #1c1c1e !important; }
        html.dark .cashbook2-page .bg-slate-900\/50,
        html.dark .cashbook2-page .bg-slate-900\/60,
        html.dark .cashbook2-page .bg-slate-900\/40 { background-color: #0c0c0e !important; }
        html.dark .cashbook2-page .border-slate-700,
        html.dark .cashbook2-page .border-slate-600,
        html.dark .cashbook2-page .border-slate-500 { border-color: rgba(255,255,255,.08) !important; }
        html.dark .cashbook2-page .text-slate-100,
        html.dark .cashbook2-page .text-slate-200,
        html.dark .cashbook2-page .text-slate-300 { color: #f5f5f7 !important; }
        html.dark .cashbook2-page .text-slate-400,
        html.dark .cashbook2-page .text-slate-500 { color: #8e8e93 !important; }
        html.dark .cashbook2-page label { color: #8e8e93 !important; }
        html.dark .cashbook2-table thead tr { background-color: #1c1c1e !important; }
        html.dark .cashbook2-table td,
        html.dark .cashbook2-table th { border-color: rgba(255,255,255,.07) !important; }
        html.dark .cashbook2-page .ant-picker { background-color: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .cashbook2-page .ant-picker input { color: #f5f5f7 !important; }
        html.dark .cashbook2-page .ant-btn:not(.ant-btn-primary) { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
      `}</style>
    </ConfigProvider>
  );
};

export default CashBook2;
