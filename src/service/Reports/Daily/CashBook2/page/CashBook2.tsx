import React, { useState, useEffect, useRef } from 'react';
import { FileText, RefreshCw, Printer, FileDown, Calendar, Search, Settings } from 'lucide-react';
import { DatePicker, message, Spin } from 'antd';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';
import { apiService } from '../../../../../services/api';
import { CrDrIndicator } from '../../../../../components/shared/CrDrIndicator';
import ReportViewSwitcher from '../../../../../components/reports/views/ReportViewSwitcher';
import { useReportViews } from '../../../../../components/reports/views/reportViews';
import CashBookBento from '../views/CashBookBento';
import CashBookTerminal from '../views/CashBookTerminal';
import CashBookEditorial from '../views/CashBookEditorial';
import { fmt, type CashBook2Summary } from '../views/cashBookModel';
import '../../../../../components/reports/views/proViews.css';
import dayjs from 'dayjs';
import { csvCell } from '@/utils/csv';

const REPORT_ID = 'daily.cash-book';

const CashBook2: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CashBook2Summary | null>(null);
  const { enabled, view, setView } = useReportViews(REPORT_ID);

  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  // themeSlice normalises interfaceMode to 'light' | 'dark' (there is no 'system' value)
  const isDark = interfaceMode === 'dark';

  // Legacy report-body colours (the body keeps its original look; only the shell uses the app kit)
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
  const codeTx    = isDark ? 'text-slate-400'                           : 'text-slate-500';
  const headTx    = isDark ? 'text-slate-200'                           : 'text-slate-700';
  const summaryBg = isDark ? 'bg-slate-900/40'                          : 'bg-slate-50';

  useEffect(() => { loadData(); }, [selectedDate]);

  const loadRequestId = useRef(0);

  const loadData = async () => {
    const requestId = ++loadRequestId.current;
    setLoading(true);
    try {
      const response = await apiService.getCashBook2Report(selectedDate.format('YYYY-MM-DD'));
      if (requestId !== loadRequestId.current) return; // a newer date was requested meanwhile
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setData(null);
        message.error(response.message || 'Failed to load cash book data');
      }
    } catch {
      if (requestId !== loadRequestId.current) return;
      setData(null);
      message.error('An error occurred while fetching report');
    } finally {
      if (requestId === loadRequestId.current) setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  const handleExportCSV = () => {
    if (!data?.entries?.length) { message.warning('No data to export'); return; }
    let csv = 'Espat Karmchari Co-Operative Credit Society Limited\nCASH-BOOK REPORT\n';
    csv += `Date: ${selectedDate.format('DD-MMM-YYYY')}\n\nHead Code,Head Name,Receipt Cash,Receipt Transfer,Payment Cash,Payment Transfer\n`;
    data.entries.forEach(e => { csv += `${e.headCode},${csvCell(e.headName)},${e.receiptCash},${e.receiptTransfer},${e.paymentCash},${e.paymentTransfer}\n`; });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = `CashBook2_${selectedDate.format('YYYY-MM-DD')}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    message.success('CSV exported');
  };

  const hasData = Boolean(data?.entries?.length);

  return (
    <div className="app-window cashbook2-page">
      <div className="aw-header aw-ambient cb2-no-print">
        <div className="min-w-0">
          <h1 className="aw-title">Cash Book</h1>
          <p className="aw-desc">Daily summary by head · cash and transfer</p>
        </div>
        <div className="aw-actions">
          <ReportViewSwitcher enabled={enabled} value={view} onChange={setView} />
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handlePrint} disabled={!hasData}><Printer size={14} /> Print</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handleExportCSV} disabled={!hasData}><FileDown size={14} /> CSV</button>
        </div>
      </div>

      <div className="aw-content">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--aw-gap)' }}>
          {/* Left column, as it always was: parameters, then the four balances. */}
          <aside className="aw-stack cb2-no-print" style={{ width: 260, flex: 'none', position: 'sticky', top: 0 }}>
            <section className="aw-card">
              <div className="aw-card-head">
                <span className="aw-card-icon"><Settings size={14} /></span>
                <h2 className="aw-card-title">Parameters</h2>
                <button type="button" className="aw-icon-btn" style={{ marginLeft: 'auto' }} onClick={loadData} data-tip="Reload" aria-label="Reload"><RefreshCw size={13} /></button>
              </div>
              <div className="aw-stack">
                <div>
                  <label className="aw-label" htmlFor="cb2-date">Date</label>
                  <DatePicker
                    id="cb2-date" value={selectedDate} allowClear={false}
                    onChange={v => v && setSelectedDate(v)}
                    format="DD-MMM-YYYY" className="aw-picker" popupClassName="aw-select-popup"
                    suffixIcon={<Calendar size={13} />}
                  />
                </div>
                <button type="button" className="aw-btn aw-btn-primary" onClick={loadData} disabled={loading} style={{ width: '100%' }}>
                  <Search size={14} className={loading ? 'aw-spin' : undefined} /> {loading ? 'Loading…' : 'Load report'}
                </button>
              </div>
            </section>

            {data && (
              <>
                {([
                  { label: 'Opening',  v: data.openingBalance, tone: 'muted' },
                  { label: 'Receipts', v: data.totalReceipts,  tone: 'success' },
                  { label: 'Payments', v: data.totalPayments,  tone: 'danger' },
                  { label: 'Closing',  v: data.closingBalance, tone: 'info' },
                ] as const).map(s => (
                  <section key={s.label} className="aw-card" style={{ padding: 'calc(var(--aw-pad) * .8)' }}>
                    <span className="aw-label" style={{ marginBottom: 2 }}>{s.label}</span>
                    <span className={`aw-pill tone-${s.tone}`} style={{ alignSelf: 'flex-start', fontSize: 'var(--type-panel-title)', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>₹{fmt(s.v)}</span>
                  </section>
                ))}
              </>
            )}
          </aside>

        <div className="aw-stack" style={{ flex: 1, minWidth: 0 }}>
          {/* Pro views draw the same data differently. They never print. */}
          {hasData && data && view === 'bento' && <div className="cb2-pro-only"><CashBookBento data={data} /></div>}
          {hasData && data && view === 'terminal' && <div className="cb2-pro-only" style={{ height: 'calc(100vh - 190px)', minHeight: 360 }}><CashBookTerminal data={data} /></div>}
          {hasData && data && view === 'editorial' && <div className="cb2-pro-only"><CashBookEditorial data={data} date={selectedDate} /></div>}

          {/* Legacy report body: unchanged. It stays mounted (hidden) in the other views so Print always gives the legacy letterhead. */}
          <section className={`cashbook2-report-panel aw-card${view === 'legacy' ? '' : ' cb2-legacy-off'}`} style={!hasData && !loading ? { display: 'none' } : undefined}>
            <Spin spinning={loading} tip="Loading...">
              {hasData && data ? (
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
                          <tr key={i} className={`border-b border-slate-700/50 transition-colors ${rowHov} ${i % 2 === 0 ? rowEven : rowOdd}`}>
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
                          </tr>
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
              ) : null}
            </Spin>
          </section>

          {!hasData && !loading && (
            <div className="aw-empty cb2-no-print">
              <FileText size={34} />
              <p className="aw-strong">No data</p>
              <span className="aw-meta">{selectedDate.format('DD MMM YYYY')}</span>
            </div>
          )}
        </div>
        </div>
      </div>

      <div className="aw-footer cb2-no-print">
        <span>Cash Book</span>
        <span>{selectedDate.format('DD-MMM-YYYY')}</span>
      </div>

      <style>{`
        .cashbook2-page .cb2-legacy-off { display: none; }

        @media print {
          * { margin:0; padding:0; box-sizing:border-box; }
          body * { visibility:hidden; }

          /* This used to key off ".font-mono" — a generic utility class that
             another element on the page also carried, so a stray number printed
             above the report. A class unique to this one element removes the
             collision entirely. */
          .cb2-print-report, .cb2-print-report * { visibility:visible; }
          .cb2-no-print { display:none !important; }
          /* Whatever view is on screen, print always uses the legacy layout. */
          .cashbook2-page .cb2-legacy-off { display:block !important; }

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

        /* ── Cash Book 2 — dark mode for the legacy body (app-wide Settings palette) ── */
        html.dark .cashbook2-report-body { background-color: transparent !important; }
        html.dark .cashbook2-page .bg-slate-800,
        html.dark .cashbook2-page .bg-slate-700,
        html.dark .cashbook2-page .bg-slate-700\\/60 { background-color: #1c1c1e !important; }
        html.dark .cashbook2-page .bg-slate-900\\/50,
        html.dark .cashbook2-page .bg-slate-900\\/60,
        html.dark .cashbook2-page .bg-slate-900\\/40 { background-color: #0c0c0e !important; }
        html.dark .cashbook2-page .border-slate-700,
        html.dark .cashbook2-page .border-slate-600,
        html.dark .cashbook2-page .border-slate-500 { border-color: rgba(255,255,255,.08) !important; }
        html.dark .cashbook2-page .text-slate-100,
        html.dark .cashbook2-page .text-slate-200,
        html.dark .cashbook2-page .text-slate-300 { color: #f5f5f7 !important; }
        html.dark .cashbook2-page .text-slate-400,
        html.dark .cashbook2-page .text-slate-500 { color: #8e8e93 !important; }
        html.dark .cashbook2-table thead tr { background-color: #1c1c1e !important; }
        html.dark .cashbook2-table td,
        html.dark .cashbook2-table th { border-color: rgba(255,255,255,.07) !important; }
      `}</style>
    </div>
  );
};

export default CashBook2;
