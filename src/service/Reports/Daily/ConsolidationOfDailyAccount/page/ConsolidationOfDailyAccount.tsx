import React, { useState, useEffect, useRef } from 'react';
import { Settings, RefreshCw, Printer, FileDown, Search, Layers, Calendar } from 'lucide-react';
import { DatePicker, Spin } from 'antd';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';
import { apiService } from '../../../../../services/api';
import { CrDrIndicator } from '../../../../../components/shared/CrDrIndicator';
import { ReportShell } from '../../../../../components/reports/views/ReportShell';
import ReportViewSwitcher from '../../../../../components/reports/views/ReportViewSwitcher';
import { useReportViews } from '../../../../../components/reports/views/reportViews';
import '../../../../../components/reports/views/proViews.css';
import ConsolBento from '../views/ConsolBento';
import ConsolEditorial from '../views/ConsolEditorial';
import type { HeadGroup, ConsolidationData } from '../views/consolModel';
import { escapeHtml } from '@/utils/html';
import dayjs from 'dayjs';

const asAmount = (value: unknown): number => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const normalizeGroups = (value: unknown): HeadGroup[] => {
  if (!Array.isArray(value)) return [];
  return value.map((group: any) => {
    const subEntries = Array.isArray(group?.subEntries) ? group.subEntries.map((entry: any) => ({
      mbNo: String(entry?.mbNo ?? entry?.mbno ?? ''),
      memberName: String(entry?.memberName ?? 'Unknown'),
      amount: asAmount(entry?.amount),
    })) : [];
    return {
      headCode: String(group?.headCode ?? group?.head_code ?? ''),
      headName: String(group?.headName ?? group?.head_name ?? 'Unknown'),
      subEntries,
      total: group?.total == null
        ? subEntries.reduce((sum, entry) => sum + entry.amount, 0)
        : asAmount(group.total),
    };
  });
};

/** Accept both the current flat API response and the older grouped UI shape. */
function normalizeConsolidationData(payload: any, selectedDate: string): ConsolidationData {
  const source = payload?.data?.data ?? payload?.data ?? payload ?? {};
  let receiptGroups = normalizeGroups(source.receiptGroups);
  let paymentGroups = normalizeGroups(source.paymentGroups);
  const entries = Array.isArray(source.entries) ? source.entries : [];

  if (!receiptGroups.length && !paymentGroups.length && entries.length) {
    receiptGroups = entries
      .filter((entry: any) => asAmount(entry?.receipts) > 0)
      .map((entry: any) => ({
        headCode: String(entry?.headCode ?? entry?.head_code ?? ''),
        headName: String(entry?.headName ?? entry?.head_name ?? 'Unknown'),
        total: asAmount(entry?.receipts),
        subEntries: [],
      }));
    paymentGroups = entries
      .filter((entry: any) => asAmount(entry?.payments) > 0)
      .map((entry: any) => ({
        headCode: String(entry?.headCode ?? entry?.head_code ?? ''),
        headName: String(entry?.headName ?? entry?.head_name ?? 'Unknown'),
        total: asAmount(entry?.payments),
        subEntries: [],
      }));
  }

  const totalReceiptsFromGroups = receiptGroups.reduce((sum, group) => sum + group.total, 0);
  const totalPaymentsFromGroups = paymentGroups.reduce((sum, group) => sum + group.total, 0);
  const totalReceipts = source.totalReceipts == null ? totalReceiptsFromGroups : asAmount(source.totalReceipts);
  const totalPayments = source.totalPayments == null ? totalPaymentsFromGroups : asAmount(source.totalPayments);

  return {
    date: String(source.date ?? selectedDate),
    openingBalance: source.openingBalance == null ? null : asAmount(source.openingBalance),
    totalReceipts,
    totalPayments,
    totalCash: source.totalCash == null ? null : asAmount(source.totalCash),
    closingBalance: source.closingBalance == null ? null : asAmount(source.closingBalance),
    netBalance: source.netBalance == null ? totalReceipts - totalPayments : asAmount(source.netBalance),
    receiptGroups,
    paymentGroups,
    totalHeads: source.totalHeads == null ? entries.length : asAmount(source.totalHeads),
  };
}

const csvCell = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);

  let text = String(value ?? '');
  // Keep exported text safe to open in spreadsheet applications.
  if (/^[\t\r ]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

const fmt = (n: number) =>
  Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtSigned = (n: number) => (n < 0 ? '-' : '') + fmt(n);
const fmtOptional = (value: number | null) => value == null ? 'Not provided' : fmtSigned(value);

// Print-only layout matching the legacy report exactly (letterhead, Date/Page
// Number line, Code/Name/Amount columns, RECEIPT/PAYMENT sections with
// per-head sub-entries and subtotals, summary block) — same lines[]-as-
// single-source-of-truth pattern already proven for Day-Book/Day-Book [SB].
// On-screen view is untouched; this feeds handlePrint only.
const CON_LINE_W = 94;
const CON_DASH = '-'.repeat(CON_LINE_W);
const CON_COL_CODE = 12;
const CON_COL_NAME = 62;
const CON_COL_AMT = CON_LINE_W - CON_COL_CODE - CON_COL_NAME;

const padL = (s: string, w: number) => s.padStart(w);
const padR = (s: string, w: number) => (s.length > w ? s.slice(0, w) : s.padEnd(w));
const centerIn = (s: string, w: number) => ' '.repeat(Math.max(0, Math.floor((w - s.length) / 2))) + s;

function buildConsolidationLines(data: ConsolidationData, dateLabel: string): string[] {
  const lines: string[] = [];
  const now = dayjs().format('DD-MMM-YYYY/h:mmA');

  lines.push(centerIn('Espat Karmchari Co-Operative Credit Society Limited.', CON_LINE_W));
  lines.push(centerIn('Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006', CON_LINE_W));
  lines.push(centerIn(`Consolidation Of Daily Accounts : ${dateLabel}`, CON_LINE_W));
  lines.push(CON_DASH);
  const dateStr = `Date : ${now}`;
  const pageStr = 'Page Number :   1';
  lines.push(`${dateStr}${padL(pageStr, CON_LINE_W - dateStr.length)}`);
  lines.push(CON_DASH);
  lines.push(`${padR('Code', CON_COL_CODE)}${padR('Name', CON_COL_NAME)}${padL('Amount', CON_COL_AMT)}`);
  lines.push(CON_DASH);

  const section = (title: string, groups: HeadGroup[]) => {
    lines.push(title);
    lines.push(CON_DASH);
    groups.forEach(g => {
      if (g.subEntries.length === 0) {
        lines.push(`${padR(g.headCode, CON_COL_CODE)}${padR(g.headName, CON_COL_NAME)}${padL(fmt(g.total), CON_COL_AMT)}`);
      } else {
        lines.push(`${padR(g.headCode, CON_COL_CODE)}${g.headName}`);
        g.subEntries.forEach(e => {
          lines.push(`${padR(e.mbNo, CON_COL_CODE)}${padR(e.memberName, CON_COL_NAME)}${padL(fmt(e.amount), CON_COL_AMT)}`);
        });
        lines.push(`${' '.repeat(CON_COL_CODE + CON_COL_NAME)}${padL(fmt(g.total), CON_COL_AMT)}`);
      }
      lines.push(CON_DASH);
    });
    lines.push('');
  };

  section('RECEIPT', data.receiptGroups);
  section('PAYMENT', data.paymentGroups);

  const IND = ' '.repeat(28);
  const LBL_W = 20;
  const VAL_W = 18;
  ([
    ['Opening Balance', fmtOptional(data.openingBalance)],
    ['Total Reciept', fmt(data.totalReceipts)],
    ['Total Cash', fmtOptional(data.totalCash)],
    ['Total Payment', fmt(data.totalPayments)],
    ['Closing Balance', fmtOptional(data.closingBalance)],
  ] as [string, string][]).forEach(([label, value]) => {
    lines.push(`${IND}${label.padEnd(LBL_W)}:${padL(value, VAL_W)}`);
  });
  lines.push('');
  lines.push('* Report As Per Data Available ..');

  return lines;
}

const ConsolidationOfDailyAccount: React.FC = () => {
  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark';

  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs().subtract(1, 'day'));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ConsolidationData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { enabled, view, setView } = useReportViews('daily.consolidation');

  useEffect(() => { loadData(); }, [selectedDate]);

  const loadRequestId = useRef(0);

  const loadData = async () => {
    const requestId = ++loadRequestId.current;
    setLoading(true);
    setLoadError(null);
    try {
      const response = await apiService.getConsolidationReport(selectedDate.format('YYYY-MM-DD'), 'screen');
      if (requestId !== loadRequestId.current) return; // a newer date was requested meanwhile
      if (response.success && response.data) {
        setData(normalizeConsolidationData(response.data, selectedDate.format('YYYY-MM-DD')));
      } else {
        setData(null);
        setLoadError(response.message || response.error || 'The report could not be loaded. Please try again.');
      }
    } catch (error) {
      if (requestId !== loadRequestId.current) return;
      setData(null);
      setLoadError(error instanceof Error ? error.message : 'The report could not be loaded. Please try again.');
    }
    finally { if (requestId === loadRequestId.current) setLoading(false); }
  };

  // Print always uses the legacy monospace letterhead, whichever view is on screen.
  const handlePrint = () => {
    if (!data) return;
    // window.open() is not used here: this app's Electron main process globally intercepts
    // window.open() and sends it to the external browser, so printing silently did nothing.
    // A hidden iframe with the monospace lines[] is the technique every other report uses.
    // Member and head names are escaped: a name containing "<" would otherwise break the page.
    const lines = buildConsolidationLines(data, selectedDate.format('DD-MMM-YYYY'));
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><title>Consolidation</title>
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
    const rows: unknown[][] = [[
      'Report',
      'Report Date',
      'Entry Type',
      'Account Head Code',
      'Account Head Name',
      'Amount',
      'Total Receipts',
      'Total Payments',
      'Net Movement',
      'Account Head Count',
    ]];
    const appendGroups = (entryType: 'Receipt' | 'Payment', groups: HeadGroup[]) => {
      groups.forEach(group => rows.push([
        'Consolidation Of Daily A/c',
        data.date,
        entryType,
        group.headCode,
        group.headName,
        group.total,
        data.totalReceipts,
        data.totalPayments,
        data.netBalance,
        data.totalHeads,
      ]));
    };
    appendGroups('Receipt', data.receiptGroups);
    appendGroups('Payment', data.paymentGroups);
    const csv = `﻿${rows.map(row => row.map(csvCell).join(',')).join('\r\n')}`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = `Consolidation_${selectedDate.format('YYYY-MM-DD')}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const hasData = !!data && (data.receiptGroups.length > 0 || data.paymentGroups.length > 0);

  // Legacy report-body colours (the body keeps its original look; only the shell uses the app kit)
  const text = isDark ? 'text-slate-100' : 'text-slate-800';
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  const border = isDark ? 'border-slate-700' : 'border-slate-200';
  const panelHead = isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100';
  const rowAlt = isDark ? 'bg-slate-800/60' : 'bg-white';
  const rowAlt2 = isDark ? 'bg-slate-800/30' : 'bg-slate-50/60';
  const rowHover = isDark ? 'hover:bg-slate-700/30' : 'hover:bg-violet-50/30';
  const headRowBg = isDark ? 'bg-slate-700/60' : 'bg-slate-100';
  const sectionBanner = isDark
    ? 'bg-violet-900/30 border-violet-700/40 text-violet-300'
    : 'bg-rose-50 border-rose-200 text-rose-700';
  const totalRowBg = isDark ? 'bg-slate-900/60' : 'bg-slate-50';

  const Section = ({ groups, label }: { groups: HeadGroup[]; label: 'RECEIPT' | 'PAYMENT' }) => (
    <tbody>
      <tr>
        <td colSpan={3} className={`px-3 py-1.5 text-xs font-black uppercase tracking-widest border-b ${border} ${sectionBanner}`}>
          ▶ {label}
        </td>
      </tr>
      {groups.map(g => (
        <React.Fragment key={g.headCode}>
          {g.subEntries.length === 0 ? (
            <tr className={`border-b ${border} ${rowHover} ${rowAlt}`}>
              <td className={`px-3 py-2 font-bold text-xs font-mono ${isDark ? 'text-indigo-300' : 'text-slate-700'}`}>{g.headCode}</td>
              <td className={`px-3 py-2 text-xs ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{g.headName}</td>
              <td className={`px-3 py-2 text-right text-xs font-semibold font-mono
                ${label === 'RECEIPT'
                  ? (isDark ? 'text-emerald-300' : 'text-emerald-600')
                  : (isDark ? 'text-rose-300' : 'text-rose-600')}`}>
                {g.total > 0 && <CrDrIndicator type={label === 'RECEIPT' ? 'credit' : 'debit'} className="mr-1" />}{fmt(g.total)}
              </td>
            </tr>
          ) : (
            <>
              <tr className={`border-b ${border} ${headRowBg}`}>
                <td className={`px-3 py-1 font-black text-xs font-mono ${isDark ? 'text-indigo-300' : 'text-slate-700'}`}>{g.headCode}</td>
                <td className={`px-3 py-1 font-bold text-xs uppercase ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{g.headName}</td>
                <td />
              </tr>
              {g.subEntries.map((e, i) => (
                <tr key={i} className={`border-b ${border} ${rowHover} ${i % 2 === 0 ? rowAlt : rowAlt2} transition-colors`}>
                  <td className={`px-3 py-0.5 text-right fz-caption font-mono ${muted}`}>{e.mbNo}</td>
                  <td className={`px-3 py-0.5 fz-caption ${isDark ? 'text-violet-300' : 'text-violet-600'} font-semibold`}>{e.memberName}</td>
                  <td className={`px-3 py-0.5 text-right fz-caption font-semibold font-mono
                    ${label === 'RECEIPT'
                      ? (isDark ? 'text-emerald-300' : 'text-emerald-600')
                      : (isDark ? 'text-rose-300' : 'text-rose-600')}`}>
                    {e.amount > 0 && <CrDrIndicator type={label === 'RECEIPT' ? 'credit' : 'debit'} className="mr-1" />}{fmt(e.amount)}
                  </td>
                </tr>
              ))}
              <tr className={`border-b-2 ${isDark ? 'border-slate-500' : 'border-slate-300'} ${totalRowBg}`}>
                <td colSpan={2} className={`px-3 py-1 ${muted}`} />
                <td className={`px-3 py-1 text-right fz-caption font-black font-mono border-t ${isDark ? 'border-slate-500 text-slate-200' : 'border-slate-300 text-slate-700'}`}>
                  {g.total > 0 && <CrDrIndicator type={label === 'RECEIPT' ? 'credit' : 'debit'} className="mr-1" />}{fmt(g.total)}
                </td>
              </tr>
            </>
          )}
        </React.Fragment>
      ))}
    </tbody>
  );

  return (
    <ReportShell
      className="cda-page"
      title="Consolidation Of Daily A/c"
      desc="Account head summary"
      switcher={<ReportViewSwitcher enabled={enabled} value={view} onChange={setView} />}
      actions={
        <>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handlePrint} disabled={!hasData}><Printer size={14} /> Print</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handleExportCSV} disabled={!hasData}><FileDown size={14} /> CSV</button>
        </>
      }
      aside={
        <section className="aw-card">
          <div className="aw-card-head">
            <span className="aw-card-icon"><Settings size={14} /></span>
            <h2 className="aw-card-title">Parameters</h2>
            <button type="button" className="aw-icon-btn" style={{ marginLeft: 'auto' }} onClick={loadData} data-tip="Reload" aria-label="Reload"><RefreshCw size={13} /></button>
          </div>
          <div className="aw-stack">
            <div>
              <label className="aw-label" htmlFor="cda-date">Date</label>
              <DatePicker id="cda-date" value={selectedDate} allowClear={false} onChange={v => v && setSelectedDate(v)}
                format="DD-MMM-YYYY" className="aw-picker" popupClassName="aw-select-popup" suffixIcon={<Calendar size={13} />} />
            </div>
            <button type="button" className="aw-btn aw-btn-primary" onClick={loadData} disabled={loading} style={{ width: '100%' }}>
              <Search size={14} className={loading ? 'aw-spin' : undefined} /> {loading ? 'Loading…' : 'Load report'}
            </button>
          </div>
        </section>
      }
      footerLeft="Consolidation · Daily A/c Summary"
      footerRight={selectedDate.format('YYYYMMDD')}
    >
      {/* Pro views draw the same heads differently. Print is always the legacy letterhead. */}
      {hasData && data && !loadError && view === 'bento' && <ConsolBento data={data} />}
      {hasData && data && !loadError && view === 'editorial' && <ConsolEditorial data={data} date={selectedDate} />}

      {loadError && (
        <section className="aw-card">
          <div role="alert" className="aw-alert aw-alert-danger">
            <div>
              <strong>Unable to load the consolidation report</strong>
              <p>{loadError}</p>
            </div>
          </div>
          <div className="aw-btn-row"><button type="button" className="aw-btn aw-btn-primary" onClick={loadData}>Try again</button></div>
        </section>
      )}

      {view === 'legacy' && !loadError && (
        <section className="aw-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="aw-main-head">
            <span className="aw-card-title">Consolidation — {selectedDate.format('DD-MMM-YYYY')}</span>
          </div>
          <div className="rpt-legacy-doc" style={{ padding: 'var(--aw-pad)', overflow: 'auto' }}>
            <Spin spinning={loading} tip="Loading...">
              {hasData && data ? (
                <div id="consol-print-area">
                  {/* Company header */}
                  <div className={`text-center mb-4 pb-3 border-b border-dashed ${border}`}>
                    <div className={`text-sm font-bold ${text}`}>Espat Karmchari Co-Operative Credit Society Limited.</div>
                    <div className={`fz-caption ${muted}`}>Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006</div>
                    <div className={`fz-small mt-0.5 ${muted}`}>Consolidation Of Daily Accounts for Date : {selectedDate.format('DD-MMM-YYYY')}</div>
                  </div>

                  <dl className={`mb-3 grid grid-cols-2 xl:grid-cols-4 divide-x border rounded-lg ${border} ${panelHead}`} aria-label="Report totals">
                    <div className="px-3 py-2">
                      <dt className={`fz-small font-bold uppercase ${muted}`}>Receipts</dt>
                      <dd className={`mt-1 text-sm font-bold font-mono ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>{fmt(data.totalReceipts)}</dd>
                    </div>
                    <div className="px-3 py-2">
                      <dt className={`fz-small font-bold uppercase ${muted}`}>Payments</dt>
                      <dd className={`mt-1 text-sm font-bold font-mono ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>{fmt(data.totalPayments)}</dd>
                    </div>
                    <div className="px-3 py-2">
                      <dt className={`fz-small font-bold uppercase ${muted}`}>Net movement</dt>
                      <dd className={`mt-1 text-sm font-bold font-mono ${text}`}>{fmtSigned(data.netBalance)}</dd>
                    </div>
                    <div className="px-3 py-2">
                      <dt className={`fz-small font-bold uppercase ${muted}`}>Account heads</dt>
                      <dd className={`mt-1 text-sm font-bold font-mono ${text}`}>{data.totalHeads}</dd>
                    </div>
                  </dl>

                  {/* Account-head totals */}
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

                  </table>

                  <div className={`mt-3 fz-small ${muted}`}>Amounts are consolidated by account head for the selected date.</div>
                </div>
              ) : !loading ? (
                <div className="aw-empty" style={{ padding: 32 }}>
                  <Layers size={34} />
                  <p className="aw-strong">No transactions on {selectedDate.format('DD-MMM-YYYY')}</p>
                </div>
              ) : null}
            </Spin>
          </div>
        </section>
      )}

      {view !== 'legacy' && !hasData && !loading && !loadError && (
        <section className="aw-card">
          <div className="aw-empty" style={{ padding: 32 }}>
            <Layers size={34} />
            <p className="aw-strong">No transactions on {selectedDate.format('DD-MMM-YYYY')}</p>
          </div>
        </section>
      )}
    </ReportShell>
  );
};

export default ConsolidationOfDailyAccount;
