import React, { useState, useEffect, useRef } from 'react';
import { Settings, RefreshCw, Printer, FileDown, Search, Layers, Calendar } from 'lucide-react';
import { DatePicker } from 'antd';
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

  const Section = ({ groups, label }: { groups: HeadGroup[]; label: 'RECEIPT' | 'PAYMENT' }) => {
    const amtStyle = label === 'RECEIPT' ? { color: 'var(--aw-success)' } : { color: 'var(--aw-danger)' };
    const crdr = label === 'RECEIPT' ? 'credit' : 'debit';
    return (
      <tbody>
        <tr>
          <td colSpan={3}><b>▶ {label}</b></td>
        </tr>
        {groups.map(g => (
          <React.Fragment key={g.headCode}>
            {g.subEntries.length === 0 ? (
              <tr>
                <td className="is-accent">{g.headCode}</td>
                <td>{g.headName}</td>
                <td className="is-right" style={amtStyle}>{g.total > 0 && <CrDrIndicator type={crdr} className="mr-1" />}{fmt(g.total)}</td>
              </tr>
            ) : (
              <>
                <tr>
                  <td className="is-accent"><b>{g.headCode}</b></td>
                  <td><b>{g.headName}</b></td>
                  <td />
                </tr>
                {g.subEntries.map((e, i) => (
                  <tr key={i}>
                    <td className="is-right is-muted">{e.mbNo}</td>
                    <td>{e.memberName}</td>
                    <td className="is-right" style={amtStyle}>{e.amount > 0 && <CrDrIndicator type={crdr} className="mr-1" />}{fmt(e.amount)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={2} />
                  <td className="is-right"><b>{g.total > 0 && <CrDrIndicator type={crdr} className="mr-1" />}{fmt(g.total)}</b></td>
                </tr>
              </>
            )}
          </React.Fragment>
        ))}
      </tbody>
    );
  };

  return (
    <ReportShell
      className="cda-page aw-calm"
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
              {hasData && data ? (
                <div id="consol-print-area">
                  <div className="aw-stack" style={{ textAlign: 'center', gap: 2, marginBottom: 12 }}>
                    <div className="aw-strong">Espat Karmchari Co-Operative Credit Society Limited.</div>
                    <div className="aw-meta">Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006</div>
                    <div className="aw-meta">Consolidation Of Daily Accounts for Date : {selectedDate.format('DD-MMM-YYYY')}</div>
                  </div>

                  <p className="aw-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 22px', marginBottom: 10 }} aria-label="Report totals">
                    <span><b>Receipts:</b> {fmt(data.totalReceipts)}</span>
                    <span><b>Payments:</b> {fmt(data.totalPayments)}</span>
                    <span><b>Net movement:</b> {fmtSigned(data.netBalance)}</span>
                    <span><b>Account heads:</b> {data.totalHeads}</span>
                  </p>

                  <div className="aw-table-wrap" style={{ maxHeight: 'none' }}>
                    <table className="aw-table">
                      <thead>
                        <tr><th style={{ width: 110 }}>Code</th><th>Name</th><th className="is-right" style={{ width: 140 }}>Amount</th></tr>
                      </thead>
                      {data.receiptGroups.length > 0 && <Section groups={data.receiptGroups} label="RECEIPT" />}
                      {data.paymentGroups.length > 0 && <Section groups={data.paymentGroups} label="PAYMENT" />}
                    </table>
                  </div>

                  <p className="aw-meta" style={{ marginTop: 10 }}>Amounts are consolidated by account head for the selected date.</p>
                </div>
              ) : !loading ? (
                <div className="aw-empty" style={{ padding: 32 }}>
                  <Layers size={34} />
                  <p className="aw-strong">No transactions on {selectedDate.format('DD-MMM-YYYY')}</p>
                </div>
              ) : null}
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
