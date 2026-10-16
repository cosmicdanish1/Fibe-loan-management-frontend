import React, { useState, useEffect, useRef } from 'react';
import { Settings, RefreshCw, Printer, FileDown, Search, BookOpen, Calendar } from 'lucide-react';
import { DatePicker, Spin, message } from 'antd';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';
import { apiService } from '../../../../../services/api';
import ReportViewSwitcher from '../../../../../components/reports/views/ReportViewSwitcher';
import { useReportViews } from '../../../../../components/reports/views/reportViews';
import '../../../../../components/reports/views/proViews.css';
import DayBookBento from '../views/DayBookBento';
import DayBookTerminal from '../views/DayBookTerminal';
import type { DayBookData, HeadGroup } from '../views/dayBookModel';
import dayjs from 'dayjs';
import { csvCell } from '@/utils/csv';
import { escapeHtml } from '@/utils/html';

const REPORT_ID = 'daily.day-book';

const fmt = (n: number) =>
  Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtSigned = (n: number) => (n < 0 ? '-' : '') + fmt(n);

// Matches the legacy report's printed layout exactly (letterhead, Reg No/Phone
// line, Day Book title, Date/Page Number line, Mem No/Name/Voucher/Amount/User
// columns, per-head group blocks with dashed rules) — same lines[]-as-single-
// source-of-truth pattern already proven for Cash-Book (Receiptwise Rough).
const LINE_W = 92;
const DASH_LINE = '-'.repeat(LINE_W);

const padL = (s: string, w: number) => s.padStart(w);
const padR = (s: string, w: number) => (s.length > w ? s.slice(0, w) : s.padEnd(w));
const center = (s: string) => ' '.repeat(Math.max(0, Math.floor((LINE_W - s.length) / 2))) + s;

const COL_MB = 13;
const COL_NAME = 26;
const COL_VCHR = 12;
const COL_AMT = 16;
const COL_USER = LINE_W - COL_MB - COL_NAME - COL_VCHR - COL_AMT - 2;

function buildLines(data: DayBookData, dateLabel: string): string[] {
  const lines: string[] = [];
  const now = dayjs().format('DD-MMM-YYYY/h:mmA');

  lines.push(center('Espat Karmchari Co-Operative Credit Society Limited.'));
  lines.push(center('Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006'));
  lines.push('');
  const regStr = 'Reg No : A.R/DRG/1796';
  const phoneStr = 'Phone: 0788-2298736';
  lines.push(`${regStr}${padL(phoneStr, LINE_W - regStr.length)}`);
  lines.push(`Day Book For Date : ${dateLabel}`);
  lines.push(DASH_LINE);
  const dateStr = `Date : ${now}`;
  const pageStr = 'Page Number : 1';
  lines.push(`${dateStr}${padL(pageStr, LINE_W - dateStr.length)}`);
  lines.push(DASH_LINE);
  lines.push(`${padR('Mem No.', COL_MB)}${padR('Name', COL_NAME)}${padR('Voucher', COL_VCHR)}${padL('Amount', COL_AMT)}  ${padR('User', COL_USER)}`);
  lines.push(DASH_LINE);

  const section = (title: string, groups?: HeadGroup[]) => {
    if (!groups?.length) return;
    lines.push(title);
    lines.push(DASH_LINE);
    groups.forEach(g => {
      lines.push(`${padR(g.headCode, COL_MB)}${g.headName}`);
      g.entries.forEach(e => {
        lines.push(
          `${padR(e.mbNo, COL_MB)}${padR(e.memberName, COL_NAME)}${padR(e.voucherNo, COL_VCHR)}` +
          `${padL('₹ ' + fmt(e.amount), COL_AMT)}  ${padR(e.username, COL_USER)}`
        );
      });
      const indent = ' '.repeat(COL_MB);
      lines.push(`${indent}${'-'.repeat(LINE_W - COL_MB)}`);
      lines.push(`${indent}${padL('₹ ' + fmt(g.total), COL_NAME + COL_VCHR + COL_AMT - COL_MB)}`);
      lines.push(`${indent}${'-'.repeat(LINE_W - COL_MB)}`);
      lines.push('');
    });
  };

  section('Payment', data.paymentGroups);
  section('Receipt', data.receiptGroups);

  const IND = '        ';
  const LBL_W = 18;
  const VAL_W = 20;
  lines.push(`${IND}${'Opening Balance :'.padEnd(LBL_W)} ${padL(fmtSigned(data.openingBalance), VAL_W)}`);
  lines.push(`${IND}${'Total Receipt   :'.padEnd(LBL_W)} ${padL(fmt(data.totalReceipts), VAL_W)}`);
  lines.push(`${IND}${'Total           :'.padEnd(LBL_W)} ${padL(fmtSigned(data.openingBalance + data.totalReceipts), VAL_W)}`);
  lines.push(`${IND}${'Total Payment   :'.padEnd(LBL_W)} ${padL(fmt(data.totalPayments), VAL_W)}`);
  lines.push(`${IND}${'-'.repeat(LBL_W + VAL_W + 1)}`);
  lines.push(`${IND}${'Closing Balance :'.padEnd(LBL_W)} ${padL(fmtSigned(data.closingBalance), VAL_W)}`);
  lines.push(`${IND}${'-'.repeat(LBL_W + VAL_W + 1)}`);
  lines.push('');
  lines.push('* Report As Per Data Available ..');

  return lines;
}

const DayBook: React.FC<{ filterType?: 'all' | 'cd' | 'sb' }> = ({ filterType = 'all' }) => {
  const titleSuffix = filterType === 'cd' ? ' (CD)' : filterType === 'sb' ? ' (SB)' : '';
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs().subtract(1, 'day'));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DayBookData | null>(null);
  const { enabled, view, setView } = useReportViews(REPORT_ID);

  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  // themeSlice normalises interfaceMode to 'light' | 'dark' (there is no 'system' value)
  const isDark = interfaceMode === 'dark';

  // Legacy report-body colours (the body keeps its original look; only the shell uses the app kit)
  const muted     = isDark ? 'text-slate-400'                                 : 'text-slate-500';
  const subtle    = isDark ? 'text-slate-500'                                 : 'text-slate-400';
  const panelHdTx = isDark ? 'text-slate-300'                                 : 'text-slate-700';
  const contentBg = isDark ? 'bg-slate-900/40'                                : 'bg-white';

  // Monospace line colors
  const lineDefault = isDark ? 'text-slate-300'               : 'text-slate-700';
  const lineDash     = isDark ? 'text-slate-600'               : 'text-slate-300';
  const lineCompany  = isDark ? 'text-slate-400'               : 'text-slate-500';
  const lineTitle    = isDark ? 'text-white font-bold'         : 'text-slate-900 font-bold';
  const lineSection  = isDark ? 'text-indigo-300 font-bold'    : 'text-indigo-700 font-bold';
  const lineHeadRow  = isDark ? 'text-amber-300 font-bold'     : 'text-amber-700 font-bold';
  const lineColHd    = isDark ? 'text-slate-400 font-semibold' : 'text-slate-500 font-semibold';
  const lineSummary  = isDark ? 'text-emerald-300 font-semibold' : 'text-emerald-700 font-semibold';
  const lineFooter   = isDark ? 'text-slate-500 italic'        : 'text-slate-400 italic';

  useEffect(() => { loadData(); }, [selectedDate, filterType]);

  const loadRequestId = useRef(0);

  const loadData = async () => {
    const requestId = ++loadRequestId.current;
    setLoading(true);
    try {
      const response = await apiService.getDayBookReport(selectedDate.format('YYYY-MM-DD'), 'screen', filterType);
      if (requestId !== loadRequestId.current) return; // a newer date was requested meanwhile
      if (response.success && response.data) {
        const d = response.data?.data ?? response.data;
        setData(d);
      } else {
        setData(null);
        message.error(response.message || response.error || 'Failed to load report');
      }
    } catch {
      if (requestId !== loadRequestId.current) return;
      setData(null);
      message.error('An error occurred while fetching report');
    } finally {
      if (requestId === loadRequestId.current) setLoading(false);
    }
  };

  const hasData = Boolean(data && ((data.paymentGroups?.length ?? 0) > 0 || (data.receiptGroups?.length ?? 0) > 0));
  const reportLines = data ? buildLines(data, selectedDate.format('DD-MMM-YYYY')) : [];

  // Print always uses the legacy monospace letterhead, whichever view is on screen.
  const handlePrint = () => {
    if (!data) return;
    const lines = buildLines(data, selectedDate.format('DD-MMM-YYYY'));
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><title>Day Book</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  body { margin: 0; }
  pre { font-family: 'Courier New', Courier, monospace; font-size: 8.5pt; white-space: pre; width: fit-content; margin: 0 auto; }
</style></head><body><pre>${escapeHtml(lines.join('\n'))}</pre></body></html>`);
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
        csv += `Payment,${g.headCode},${csvCell(g.headName)},${e.mbNo},${csvCell(e.memberName)},${e.voucherNo},${e.amount},${csvCell(e.username)}\n`
      )
    );
    data.receiptGroups.forEach(g =>
      g.entries.forEach(e =>
        csv += `Receipt,${g.headCode},${csvCell(g.headName)},${e.mbNo},${csvCell(e.memberName)},${e.voucherNo},${e.amount},${csvCell(e.username)}\n`
      )
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = `DayBook_${selectedDate.format('YYYY-MM-DD')}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  return (
    <div className="app-window db-page">
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">Day Book{titleSuffix}</h1>
          <p className="aw-desc">Daily transaction journal</p>
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
                  <label className="aw-label" htmlFor="db-date">Date</label>
                  <DatePicker
                    id="db-date" value={selectedDate} allowClear={false}
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
                  { label: 'Opening',      v: fmtSigned(data.openingBalance),  tone: 'muted' },
                  { label: 'Receipts',     v: fmt(data.totalReceipts),         tone: 'success' },
                  { label: 'Payments',     v: fmt(data.totalPayments),         tone: 'danger' },
                  { label: 'Closing',      v: fmtSigned(data.closingBalance),  tone: data.closingBalance >= 0 ? 'info' : 'danger' },
                  { label: 'Transactions', v: String(data.totalTransactions),  tone: 'muted' },
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
            {hasData && data && view === 'bento' && <DayBookBento data={data} />}
            {hasData && data && view === 'terminal' && <div style={{ height: 'calc(100vh - 190px)', minHeight: 360 }}><DayBookTerminal data={data} /></div>}

            {view === 'legacy' && (
              /* Report panel — monospace document, mirrors the legacy print layout
                 exactly (same lines[] feeds both this preview and handlePrint). */
              <section className="aw-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="aw-main-head">
                  <span className={`text-xs font-extrabold uppercase tracking-wide ${panelHdTx}`}>
                    Day Book — {selectedDate.format('DD-MMM-YYYY')}
                  </span>
                  {data && (
                    <span className={`fz-small font-mono ${subtle}`}>
                      {data.totalTransactions} entries · {reportLines.length} lines
                    </span>
                  )}
                </div>

                <div className={`db-preview-body p-4 ${contentBg}`}>
                  <Spin spinning={loading} tip="Loading...">
                    {reportLines.length > 0 ? (
                      <pre className={`font-mono text-[11.5px] leading-[1.55] whitespace-pre select-text w-fit mx-auto ${lineDefault}`}>
                        {reportLines.map((line, i) => {
                          const isDash = line.trim().startsWith('-');
                          const isCompany = i <= 1;
                          const isTitle = line.startsWith('Day Book For Date');
                          const isSection = line === 'Payment' || line === 'Receipt';
                          const isHeadRow = /^[A-Z]\w*\s{2,}\S/.test(line) && !isSection;
                          const isColHeader = line.startsWith('Mem No.');
                          const isSummary = line.includes('Opening Balance') || line.includes('Closing Balance') ||
                            line.includes('Total Receipt') || line.includes('Total Payment') || line.trim().startsWith('Total');
                          const isFooter = line.startsWith('*');

                          let cls = lineDefault;
                          if (isDash) cls = lineDash;
                          else if (isCompany) cls = lineCompany;
                          else if (isTitle) cls = lineTitle;
                          else if (isSection) cls = lineSection;
                          else if (isColHeader) cls = lineColHd;
                          else if (isSummary) cls = lineSummary;
                          else if (isFooter) cls = lineFooter;
                          else if (isHeadRow) cls = lineHeadRow;

                          return <span key={i} className={`block ${cls}`}>{line || ' '}</span>;
                        })}
                      </pre>
                    ) : !loading ? (
                      <div className="flex flex-col items-center justify-center h-64 gap-3">
                        <BookOpen size={48} className={isDark ? 'text-slate-700' : 'text-slate-300'} />
                        <p className={`text-sm font-bold uppercase tracking-wide ${muted}`}>No transactions on {selectedDate.format('DD-MMM-YYYY')}</p>
                        <p className={`text-xs ${subtle}`}>Try a date that has vouchers</p>
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
        <span>Day Book · Daily Journal</span>
        <span>{selectedDate.format('YYYYMMDD')}</span>
      </div>

      <style>{`
        /* ── Day Book — dark mode for the legacy body ── */
        html.dark .db-preview-body { background-color: #1c1c1e !important; }
      `}</style>
    </div>
  );
};

export default DayBook;
