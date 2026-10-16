import React, { useState, useEffect, useRef } from 'react';
import { Settings, RefreshCw, Printer, FileDown, Search, BookOpen, Calendar } from 'lucide-react';
import { DatePicker, message, Spin } from 'antd';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';
import { apiService } from '../../../../../services/api';
import ReportViewSwitcher from '../../../../../components/reports/views/ReportViewSwitcher';
import { useReportViews } from '../../../../../components/reports/views/reportViews';
import '../../../../../components/reports/views/proViews.css';
import RoughBento from '../views/RoughBento';
import RoughTerminal from '../views/RoughTerminal';
import RoughEditorial from '../views/RoughEditorial';
import type { CashBookRoughData } from '../views/roughModel';
import dayjs from 'dayjs';
import { csvCell } from '@/utils/csv';

const REPORT_ID = 'daily.cash-book-receiptwise';

const LINE_W = 80;
const DASH_LINE = '-'.repeat(LINE_W);

const fmtAmt = (n: number): string =>
  Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtAmtSigned = (n: number): string =>
  (n < 0 ? '-' : '') + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const padL = (s: string, w: number) => s.padStart(w);
const padR = (s: string, w: number) => (s.length > w ? s.slice(0, w) : s.padEnd(w));

const center = (s: string) => {
  const pad = Math.max(0, Math.floor((LINE_W - s.length) / 2));
  return ' '.repeat(pad) + s;
};

function buildLines(data: CashBookRoughData, dateLabel: string): string[] {
  const lines: string[] = [];
  const now = dayjs().format('DD-MMM-YYYY/hh:mmA');

  lines.push(center('Espat Karmchari Co-Operative Credit Society Limited.'));
  lines.push(center('Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006'));
  const regStr = 'Reg No : A.R/DRG/1796';
  const telStr = 'Tel No :';
  lines.push(`${regStr}${padL(telStr, LINE_W - regStr.length)}`);
  lines.push(padL('0788-2298736', LINE_W));
  lines.push('');
  lines.push(`As On Date :- ${now}${padL('Page Number : 1', LINE_W - 14 - now.length)}`);
  lines.push(DASH_LINE);
  lines.push(center('CASH-BOOK'));
  lines.push(padL(`Cash Book For Date:${dateLabel}`, LINE_W));
  lines.push('');

  const COL_SNO  = 4;
  const COL_HEAD = 38;
  const COL_PAY  = 14;
  const COL_REC  = 14;

  data.vouchers.forEach((v) => {
    const modeStr = `Mode OF Payment By ${v.modeOfPayment || 'Cash'}`;
    const vLine = `Voucher No : ${v.voucherNo}`;
    lines.push(`${padR(vLine, LINE_W - modeStr.length)}${modeStr}`);
    lines.push(`Member No:${v.memberNo} ${v.memberName}`);
    lines.push(`Naration: ${v.narration || ''}`);
    lines.push(DASH_LINE);

    const hSno  = padR('S.No', COL_SNO);
    const hHead = padR('  Head              Description', COL_HEAD + 2);
    const hPay  = padL('Payment', COL_PAY);
    const hRec  = padL('Receipt', COL_REC);
    lines.push(`${hSno}   ${hHead}${hPay}${hRec}`);
    lines.push(DASH_LINE);

    v.entries.forEach((e) => {
      const sno  = padL(String(e.sno), COL_SNO);
      const combined = `${e.headCode} ${e.headName || e.description}`;
      const head = padR(combined, COL_HEAD);
      const pay  = e.payment > 0 ? padL(fmtAmt(e.payment), COL_PAY) : ''.padStart(COL_PAY);
      const rec  = e.receipt > 0 ? padL(fmtAmt(e.receipt), COL_REC) : ''.padStart(COL_REC);
      lines.push(`${sno}   ${head}  ${pay}${rec}`);
    });

    lines.push(DASH_LINE);
    const blankLeft = ''.padEnd(COL_SNO + 3 + COL_HEAD + 2);
    lines.push(`${blankLeft}${padL(fmtAmt(v.totalPayment), COL_PAY)}${padL(fmtAmt(v.totalReceipt), COL_REC)}`);
    lines.push(DASH_LINE);
    lines.push('');
    lines.push('');
  });

  const IND   = '        ';
  const LBL_W = 18;
  const VAL_W = 20;
  const DIV   = `${IND}${' '.repeat(LBL_W)}${'─'.repeat(VAL_W)}`;

  lines.push(`${IND}${'Opening Balance :'.padEnd(LBL_W)} ${padL(fmtAmtSigned(data.openingBalance), VAL_W)}`);
  lines.push(`${IND}${'Total Credit    :'.padEnd(LBL_W)} ${padL(fmtAmt(data.totalReceipts), VAL_W)}`);
  lines.push(`${IND}${'Total           :'.padEnd(LBL_W)} ${padL(fmtAmtSigned(data.openingBalance + data.totalReceipts), VAL_W)}`);
  lines.push(`${IND}${'Total Debit     :'.padEnd(LBL_W)} ${padL(fmtAmt(data.totalPayments), VAL_W)}`);
  lines.push(DIV);
  lines.push(`${IND}${'Closing Balance :'.padEnd(LBL_W)} ${padL(fmtAmtSigned(data.closingBalance), VAL_W)}`);
  lines.push(DIV);
  lines.push('');
  lines.push('* Report As Per Data Available ..');

  return lines;
}

const CashBookReceiptwiseRough: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs().subtract(1, 'day'));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CashBookRoughData | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const { enabled, view, setView } = useReportViews(REPORT_ID);

  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  // themeSlice normalises interfaceMode to 'light' | 'dark' (there is no 'system' value)
  const isDark = interfaceMode === 'dark';

  // Legacy report-body colours (the body keeps its original look; only the shell uses the app kit)
  const muted     = isDark ? 'text-slate-400'                           : 'text-slate-500';
  const subtle    = isDark ? 'text-slate-500'                           : 'text-slate-400';
  const panelHdTx = isDark ? 'text-slate-300'                           : 'text-slate-700';
  const contentBg = isDark ? 'bg-slate-900/60'                          : 'bg-slate-50';

  // Monospace line colors
  const lineDefault    = isDark ? 'text-slate-300'              : 'text-slate-700';
  const lineDash       = isDark ? 'text-slate-600'              : 'text-slate-300';
  const lineCompany    = isDark ? 'text-slate-400'              : 'text-slate-500';
  const lineHeader     = isDark ? 'text-white font-bold'        : 'text-slate-900 font-bold';
  const lineVoucher    = isDark ? 'text-indigo-300 font-bold'   : 'text-indigo-700 font-bold';
  const lineMember     = isDark ? 'text-amber-300'              : 'text-amber-600';
  const lineColHd      = isDark ? 'text-slate-400 font-semibold': 'text-slate-500 font-semibold';
  const lineSummary    = isDark ? 'text-emerald-300 font-semibold': 'text-emerald-700 font-semibold';
  const lineFooter     = isDark ? 'text-slate-500 italic'       : 'text-slate-400 italic';

  useEffect(() => { loadData(); }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await apiService.getCashBookReport(selectedDate.format('YYYY-MM-DD'));
      if (response.success && response.data) {
        setData(response.data);
      } else {
        message.error(response.message || 'Failed to load data');
      }
    } catch {
      message.error('Error fetching report');
    } finally {
      setLoading(false);
    }
  };

  // Print always uses the legacy monospace letterhead, whichever view is on screen.
  const handlePrint = () => {
    if (!data) return;
    const lines = buildLines(data, selectedDate.format('DD-MM-YYYY'));
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><title>Cash Book Receiptwise Rough</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  body { margin: 0; }
  /* The report text has a fixed width (LINE_W monospace chars) narrower than
     the page's content area — with no width/centering rule, it sat flush at
     the left margin with all the leftover space on the right. fit-content +
     auto margins center the block as a whole while individual lines inside
     stay left-aligned relative to each other, preserving column alignment. */
  pre { font-family: 'Courier New', Courier, monospace; font-size: 9pt; white-space: pre; width: fit-content; margin: 0 auto; }
</style></head><body><pre>${lines.join('\n')}</pre></body></html>`);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 300);
    }
  };

  const handleExportCSV = () => {
    if (!data?.vouchers?.length) { message.warning('No data to export'); return; }
    let csv = 'Voucher No,Member No,Member Name,Mode,Head Code,Head Name,Receipt,Payment\n';
    data.vouchers.forEach(v => {
      v.entries.forEach(e => {
        csv += `${v.voucherNo},${v.memberNo},${csvCell(v.memberName)},${v.modeOfPayment},${e.headCode},${csvCell(e.headName)},${e.receipt},${e.payment}\n`;
      });
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = `CashBook_Receiptwise_${selectedDate.format('YYYY-MM-DD')}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    message.success('CSV exported');
  };

  const fmt2 = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const reportLines = data ? buildLines(data, selectedDate.format('DD-MM-YYYY')) : [];
  const hasData = Boolean(data?.vouchers?.length);

  return (
    <div className="app-window cbrr-page">
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">Cash-Book (Transaction)</h1>
          <p className="aw-desc">Voucher-wise daily report</p>
        </div>
        <div className="aw-actions">
          <ReportViewSwitcher enabled={enabled} value={view} onChange={setView} />
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handlePrint} disabled={!hasData}><Printer size={14} /> Print</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handleExportCSV} disabled={!hasData}><FileDown size={14} /> CSV</button>
        </div>
      </div>

      <div className="aw-content">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--aw-gap)' }}>
          {/* Left column, as it always was: parameters, then the balances. */}
          <aside className="aw-stack" style={{ width: 240, flex: 'none', position: 'sticky', top: 0 }}>
            <section className="aw-card">
              <div className="aw-card-head">
                <span className="aw-card-icon"><Settings size={14} /></span>
                <h2 className="aw-card-title">Parameters</h2>
                <button type="button" className="aw-icon-btn" style={{ marginLeft: 'auto' }} onClick={loadData} data-tip="Reload" aria-label="Reload"><RefreshCw size={13} /></button>
              </div>
              <div className="aw-stack">
                <div>
                  <label className="aw-label" htmlFor="cbrr-date">Date</label>
                  <DatePicker
                    id="cbrr-date" value={selectedDate} allowClear={false}
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
                  { label: 'Vouchers',        v: String(data.vouchers.length),       tone: 'muted' },
                  { label: 'Opening Balance', v: fmtAmtSigned(data.openingBalance),  tone: 'muted' },
                  { label: 'Total Credit',    v: fmt2(data.totalReceipts),           tone: 'success' },
                  { label: 'Total Debit',     v: fmt2(data.totalPayments),           tone: 'danger' },
                  { label: 'Closing Balance', v: fmtAmtSigned(data.closingBalance),  tone: data.closingBalance >= 0 ? 'info' : 'danger' },
                ] as const).map(s => (
                  <section key={s.label} className="aw-card" style={{ padding: 'calc(var(--aw-pad) * .8)' }}>
                    <span className="aw-label" style={{ marginBottom: 2 }}>{s.label}</span>
                    <span className={`aw-pill tone-${s.tone}`} style={{ alignSelf: 'flex-start', fontSize: 'var(--type-panel-title)', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{s.v}</span>
                  </section>
                ))}
              </>
            )}
          </aside>

          <div className="aw-stack" style={{ flex: 1, minWidth: 0 }}>
            {/* Pro views draw the same data differently. Print is always the legacy letterhead. */}
            {hasData && data && view === 'bento' && <RoughBento data={data} />}
            {hasData && data && view === 'terminal' && <div style={{ height: 'calc(100vh - 190px)', minHeight: 360 }}><RoughTerminal data={data} /></div>}
            {hasData && data && view === 'editorial' && <RoughEditorial data={data} date={selectedDate} />}

            {view === 'legacy' && (
              <section className="aw-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="aw-main-head">
                  <span className={`text-xs font-extrabold uppercase tracking-wide ${panelHdTx}`}>
                    Cash Book — {selectedDate.format('DD-MMM-YYYY')}
                  </span>
                  {data && (
                    <span className={`fz-small font-mono ${subtle}`}>
                      {data.vouchers.length} vouchers · {reportLines.length} lines
                    </span>
                  )}
                </div>

                {/* Monospace document area */}
                <div className={`cbrr-preview-body p-4 ${contentBg}`} ref={printRef}>
                  <Spin spinning={loading} tip="Loading...">
                    {reportLines.length > 0 ? (
                      <pre className={`font-mono text-[11.5px] leading-[1.55] whitespace-pre select-text w-fit mx-auto ${lineDefault}`}>
                        {reportLines.map((line, i) => {
                          const isDash = line.trim().startsWith('─') || line.trim().startsWith('-');
                          const isVoucherNo = line.startsWith('Voucher No');
                          const isMember = line.startsWith('Member No');
                          const isHdr = line.trim() === 'CASH-BOOK' || line.includes('Cash Book For Date');
                          const isSummary = line.includes('Opening Balance') || line.includes('Closing Balance') ||
                            line.includes('Total Credit') || line.includes('Total Debit') || line.trim().startsWith('Total');
                          const isFooter = line.startsWith('*');
                          const isColHeader = line.trimStart().startsWith('S.No');
                          const isCompany = i <= 3;

                          let cls = lineDefault;
                          if (isDash) cls = lineDash;
                          else if (isCompany) cls = lineCompany;
                          else if (isHdr) cls = lineHeader;
                          else if (isVoucherNo) cls = lineVoucher;
                          else if (isMember) cls = lineMember;
                          else if (isColHeader) cls = lineColHd;
                          else if (isSummary) cls = lineSummary;
                          else if (isFooter) cls = lineFooter;

                          return <span key={i} className={`block ${cls}`}>{line || ' '}</span>;
                        })}
                      </pre>
                    ) : !loading ? (
                      <div className="flex flex-col items-center justify-center h-64 gap-3">
                        <BookOpen size={48} className={isDark ? 'text-slate-700' : 'text-slate-300'} />
                        <p className={`text-sm font-bold uppercase tracking-wide ${muted}`}>No transactions on {selectedDate.format('DD-MMM-YYYY')}</p>
                        <p className={`text-xs ${subtle}`}>Try a date that has vouchers, e.g. <span className="text-indigo-500 font-mono">07-Feb-2024</span></p>
                      </div>
                    ) : null}
                  </Spin>
                </div>
              </section>
            )}

            {view !== 'legacy' && !hasData && !loading && (
              <div className="aw-empty">
                <BookOpen size={34} />
                <p className="aw-strong">No transactions</p>
                <span className="aw-meta">{selectedDate.format('DD MMM YYYY')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="aw-footer">
        <span>Cash Book · Transaction View</span>
        <span>{selectedDate.format('YYYYMMDD')}</span>
      </div>

      <style>{`
        /* ── Cash Book Receiptwise Rough — dark mode for the legacy body ── */
        html.dark .cbrr-preview-body { background-color: #1c1c1e !important; }
      `}</style>
    </div>
  );
};

export default CashBookReceiptwiseRough;
