import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Printer,
  FileDown,
  RefreshCw,
} from 'lucide-react';
import { DatePicker, Spin, Select, message } from 'antd';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../store';
import { apiService } from '../../../../services/api';
import dayjs, { Dayjs } from 'dayjs';
import { CrDrIndicator } from '@/components/shared/CrDrIndicator';
import { ReportShell, StatCards, ReportEmpty } from '../../../../components/reports/views/ReportShell';
import ReportViewSwitcher from '../../../../components/reports/views/ReportViewSwitcher';
import { useReportViews } from '../../../../components/reports/views/reportViews';
import '../../../../components/reports/views/proViews.css';
import { useGlSpec, ProBento, ProTerm, ProEd } from '../views/glPro';

const showDialog = async (type: 'info' | 'warning' | 'error', title: string, detail: string): Promise<void> => {
  if ((window as any).electronAPI?.showMessageBox) {
    await (window as any).electronAPI.showMessageBox({ type, title: 'electron-react-ts', message: title, detail, buttons: ['OK'], defaultId: 0 });
  }
};


interface GeneralLedgerEntry {
  transactionNo: number;
  transactionDate: string;
  voucherNo: string;
  narration: string;
  debit: number;
  credit: number;
  balance: number;
  transactionType: 'DR' | 'CR';
  memberNumber?: number | string;
  accountNumber?: number | string;
  username: string;
}

interface GeneralLedgerData {
  headCode: string;
  headName: string;
  fromDate: string;
  toDate: string;
  openingBalance: number;
  totalDebits: number;
  totalCredits: number;
  closingBalance: number;
  entries: GeneralLedgerEntry[];
  totalTransactions: number;
}

interface HeadMaster {
  code: string;
  headName: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const GL_PRINT_WIDTH = 100;
const GL_PRINT_COLUMNS = { date: 11, member: 12, voucher: 10, particulars: 28, amount: 13 };
const glPadRight = (value: string, width: number) => value.length > width ? value.slice(0, width) : value.padEnd(width);
const glPadLeft = (value: string, width: number) => value.length > width ? value.slice(-width) : value.padStart(width);
const glCenter = (value: string) => {
  const text = value.length > GL_PRINT_WIDTH ? value.slice(0, GL_PRINT_WIDTH) : value;
  return `${' '.repeat(Math.floor((GL_PRINT_WIDTH - text.length) / 2))}${text}`;
};
const glWrap = (value: string, width: number) => {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if (!line && word.length > width) {
      for (let offset = 0; offset < word.length; offset += width) {
        const part = word.slice(offset, offset + width);
        if (offset + width < word.length) lines.push(part);
        else line = part;
      }
    } else if (!line) line = word;
    else if (`${line} ${word}`.length <= width) line += ` ${word}`;
    else { lines.push(line); line = word; }
  }
  if (line || !lines.length) lines.push(line);
  return lines;
};
const glEscapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char] || char));

const buildGeneralLedgerPrintLines = (data: GeneralLedgerData): string[] => {
  const { date, member, voucher, particulars, amount } = GL_PRINT_COLUMNS;
  const firstAmountColumn = date + member + voucher + particulars;
  const dash = '-'.repeat(GL_PRINT_WIDTH);
  const lines: string[] = [
    glCenter('Espat Karmchari Co-Operative Credit Society Limited.'),
    glCenter('Avenue A, Sahakari Sadan, Sector-C, AT Post: Bhilai Nagar, Dist: DURG-490006'),
    glCenter('GENERAL LEDGER'),
    '',
  ];
  lines.push(...glWrap(`Account Head: ${data.headCode} - ${data.headName}`, GL_PRINT_WIDTH));
  lines.push(`Period: ${dayjs(data.fromDate).format('DD-MMM-YYYY')} to ${dayjs(data.toDate).format('DD-MMM-YYYY')}`);
  lines.push(`Printed: ${dayjs().format('DD-MMM-YYYY h:mm A')}`);
  lines.push(`Opening Balance: ${fmt(data.openingBalance)}`);
  lines.push(dash);
  lines.push(
    glPadRight('Date', date) + glPadRight('MB No', member) + glPadRight('Voucher', voucher) +
    glPadRight('Particulars', particulars) + glPadLeft('Payment', amount) +
    glPadLeft('Receipt', amount) + glPadLeft('Balance', amount),
  );
  lines.push(dash);

  for (const entry of data.entries) {
    const parts = glWrap(entry.narration || '', particulars);
    lines.push(
      glPadRight(dayjs(entry.transactionDate).format('DD-MMM-YYYY'), date) +
      glPadRight(String(entry.memberNumber ?? ''), member) +
      glPadRight(entry.voucherNo || '', voucher) + glPadRight(parts[0] || '', particulars) +
      glPadLeft(entry.debit > 0 ? fmt(entry.debit) : '-', amount) +
      glPadLeft(entry.credit > 0 ? fmt(entry.credit) : '-', amount) +
      glPadLeft(fmt(entry.balance), amount),
    );
    for (const part of parts.slice(1)) {
      lines.push(`${' '.repeat(date + member + voucher)}${glPadRight(part, particulars)}`);
    }
  }

  lines.push(dash);
  lines.push(glPadLeft('Total Payments:', firstAmountColumn) + glPadLeft(fmt(data.totalDebits), amount));
  lines.push(glPadLeft('Total Receipts:', firstAmountColumn) + ' '.repeat(amount) + glPadLeft(fmt(data.totalCredits), amount));
  lines.push(glPadLeft('Closing Balance:', firstAmountColumn + amount) + glPadLeft(fmt(data.closingBalance), amount));
  lines.push(`Transactions: ${data.totalTransactions}`);
  lines.push(dash);
  lines.push('* Report as per data available');
  return lines;
};

const csvCell = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  let text = String(value ?? '');
  if (/^[\t\r ]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

const currentFinancialYearStart = () => {
  const today = dayjs();
  return today.month() >= 3 ? today.month(3).date(1) : today.subtract(1, 'year').month(3).date(1);
};

const GeneralLedger: React.FC = () => {
  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark';
  const { enabled, view, setView } = useReportViews('general-ledger');

  const [headCode, setHeadCode]     = useState<string>('');
  const [fromDate, setFromDate]     = useState<Dayjs | null>(currentFinancialYearStart());
  const [toDate, setToDate]         = useState<Dayjs | null>(dayjs());
  const [headMasters, setHeadMasters]   = useState<HeadMaster[]>([]);
  const [ledgerData, setLedgerData]     = useState<GeneralLedgerData | null>(null);
  const [isLoading, setIsLoading]       = useState(false);
  const [isLoadingHeads, setIsLoadingHeads] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const reportRequestId = useRef(0);

  useEffect(() => { loadHeadMasters(); }, []);

  const loadHeadMasters = async () => {
    setIsLoadingHeads(true);
    try {
      const response = await apiService.getGeneralLedgerHeadMasters();
      if (response.success && response.data) {
        let actualData = response.data;
        if (actualData.data) actualData = actualData.data;
        if (Array.isArray(actualData)) setHeadMasters(actualData);
      }
    } catch {
      await showDialog('error', 'Load Failed', 'Failed to load Account Heads');
    } finally {
      setIsLoadingHeads(false);
    }
  };

  const generateReport = async () => {
    if (!headCode || !fromDate || !toDate) {
      await showDialog('warning', 'Validation', 'Please select Account Head and Date Range');
      return;
    }
    if (fromDate.isAfter(toDate, 'day')) {
      setLedgerData(null);
      setReportError('From date must be on or before the To date.');
      message.error('From date must be on or before the To date.');
      return;
    }
    const requestId = ++reportRequestId.current;
    setLedgerData(null);
    setReportError(null);
    setIsLoading(true);
    try {
      const response = await apiService.getGeneralLedgerReport({
        headCode,
        fromDate: fromDate.format('YYYY-MM-DD'),
        toDate: toDate.format('YYYY-MM-DD'),
        outputType: 'screen',
      });
      if (response.success && response.data) {
        let actualData = response.data;
        if (actualData.data) actualData = actualData.data;
        if (requestId === reportRequestId.current) {
          setLedgerData({ ...actualData, entries: Array.isArray(actualData.entries) ? actualData.entries : [] });
        }
      } else {
        const error = response.message || 'Failed to fetch ledger data';
        if (requestId === reportRequestId.current) {
          setLedgerData(null);
          const friendlyError = error.toLowerCase().includes('unsupported general-ledger transaction type')
            ? 'The ledger contains a transaction type this report cannot safely classify. No totals were produced.'
            : error;
          setReportError(friendlyError);
          message.error(friendlyError);
        }
      }
    } catch {
      if (requestId === reportRequestId.current) {
        setLedgerData(null);
        setReportError('Could not load the General Ledger. Check the connection and try again.');
        message.error('Could not load the General Ledger. Check the connection and try again.');
      }
    } finally {
      if (requestId === reportRequestId.current) setIsLoading(false);
    }
  };

  const handleExportCSV = async () => {
    if (!ledgerData) { await showDialog('warning', 'No Report', 'Generate a report before exporting.'); return; }
    const headers = [
      'Record Type', 'Head Code', 'Head Name', 'From Date', 'To Date', 'Transaction Date',
      'Member Number', 'Account Number', 'Voucher Number', 'Narration', 'Payment', 'Receipt',
      'Running Balance', 'Transaction Type', 'User', 'Opening Balance', 'Total Payments',
      'Total Receipts', 'Closing Balance', 'Transaction Count',
    ];
    const rows = ledgerData.entries.map(e => [
      'TRANSACTION', ledgerData.headCode, ledgerData.headName, ledgerData.fromDate, ledgerData.toDate,
      dayjs(e.transactionDate).format('YYYY-MM-DD'),
      e.memberNumber || '',
      e.accountNumber || '', e.voucherNo || '', e.narration || '', e.debit, e.credit, e.balance,
      e.transactionType, e.username || '', '', '', '', '', '',
    ]);
    rows.push([
      'REPORT_TOTALS', ledgerData.headCode, ledgerData.headName, ledgerData.fromDate, ledgerData.toDate,
      '', '', '', '', '', '', '', '', '', '', ledgerData.openingBalance, ledgerData.totalDebits,
      ledgerData.totalCredits, ledgerData.closingBalance, ledgerData.totalTransactions,
    ]);
    const csv = `\uFEFF${[headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `general_ledger_${headCode}_${ledgerData.fromDate}_${ledgerData.toDate}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handlePrint = () => {
    if (!ledgerData) return;
    const lines = buildGeneralLedgerPrintLines(ledgerData);
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      iframe.remove();
      message.error('Could not prepare the General Ledger for printing.');
      return;
    }
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>General Ledger</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  html, body { margin: 0; color: #1f2933; background: #ffffff; }
  pre { font-family: 'Courier New', Courier, monospace; font-size: 8.5pt; line-height: 1.2; white-space: pre; width: fit-content; max-width: 100%; margin: 0 auto; }
  @media print { pre { break-inside: auto; page-break-inside: auto; } }
</style></head><body><pre>${glEscapeHtml(lines.join('\n'))}</pre></body></html>`);
    doc.close();
    window.setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      window.setTimeout(() => iframe.remove(), 1500);
    }, 300);
  };

  const invalidateReport = () => {
    reportRequestId.current += 1;
    setLedgerData(null);
    setReportError(null);
    setIsLoading(false);
  };

  const selectedHead = headMasters.find(h => h.code === headCode);
  const headName = selectedHead?.headName || '';

  /* ── theme tokens ── */
  const text     = isDark ? 'text-slate-100' : 'text-slate-800';
  const muted    = isDark ? 'text-slate-400' : 'text-slate-500';
  const tblHd    = isDark ? 'bg-[#263148] text-slate-300' : 'bg-slate-100 text-slate-700';
  const tblBdr   = isDark ? 'border-slate-600' : 'border-slate-300';
  const rowHover = isDark ? 'hover:bg-white/5' : 'hover:bg-emerald-50/40';
  const sumRow   = isDark ? 'bg-[#263148]'  : 'bg-slate-100';

  const spec = useGlSpec(ledgerData?.entries ?? [], `${headCode} ${headName}`.trim(), ledgerData?.openingBalance ?? 0, ledgerData?.closingBalance ?? 0, ledgerData?.totalDebits ?? 0, ledgerData?.totalCredits ?? 0);
  const hasData = !!ledgerData;
  const period = `${fromDate?.format('DD-MMM-YYYY')} to ${toDate?.format('DD-MMM-YYYY')}`;

  return (
    <ReportShell
      className="gl-page"
      title="General Ledger"
      desc="Head-wise account statement"
      switcher={<ReportViewSwitcher enabled={enabled} value={view} onChange={setView} />}
      actions={
        <>
          <button type="button" className="aw-btn aw-btn-ghost" onClick={() => { setHeadCode(''); setFromDate(currentFinancialYearStart()); setToDate(dayjs()); invalidateReport(); }}><RefreshCw size={14} /> Reset</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handleExportCSV} disabled={!hasData}><FileDown size={14} /> CSV</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handlePrint} disabled={!hasData}><Printer size={14} /> Print</button>
        </>
      }
      footerLeft="General Ledger"
      footerRight={hasData ? `${headCode} · ${period}` : 'Select head and period'}
    >
      <section className="aw-card gl-filter-bar">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 260px', minWidth: 220 }}>
            <label className="aw-label" htmlFor="gl-head">Head name</label>
            <Select
              id="gl-head"
              {...(headCode ? { value: headCode } : {})}
              onChange={(value?: string) => { setHeadCode(value ?? ''); invalidateReport(); }}
              placeholder="Select head code"
              showSearch
              loading={isLoadingHeads}
              className="aw-select" popupClassName="aw-select-popup"
              filterOption={(input, option) => String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={headMasters.map(h => ({ value: h.code, label: `${h.code} ${h.headName}` }))}
            />
          </div>
          <div>
            <label className="aw-label" htmlFor="gl-from">From</label>
            <DatePicker id="gl-from" className="aw-picker" popupClassName="aw-select-popup" value={fromDate} onChange={value => { setFromDate(value); invalidateReport(); }} format="DD-MMM-YYYY" allowClear={false} />
          </div>
          <div>
            <label className="aw-label" htmlFor="gl-to">To</label>
            <DatePicker id="gl-to" className="aw-picker" popupClassName="aw-select-popup" value={toDate} onChange={value => { setToDate(value); invalidateReport(); }} format="DD-MMM-YYYY" allowClear={false} />
          </div>
          <button type="button" className="aw-btn aw-btn-primary" onClick={generateReport} disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? 'aw-spin' : undefined} /> {isLoading ? 'Loading…' : 'Generate'}
          </button>
        </div>
      </section>

      {hasData && (
        <StatCards items={[
          { label: 'Opening', value: fmt(ledgerData.openingBalance), tone: 'muted' },
          { label: 'Total payments', value: fmt(ledgerData.totalDebits), tone: 'danger' },
          { label: 'Total receipts', value: fmt(ledgerData.totalCredits), tone: 'success' },
          { label: 'Closing', value: fmt(ledgerData.closingBalance), tone: 'info' },
          { label: 'Transactions', value: String(ledgerData.totalTransactions), tone: 'muted' },
        ]} />
      )}

      {reportError && <div role="alert" className="aw-alert aw-alert-danger">{reportError}</div>}

      {hasData && view === 'bento' && <ProBento spec={spec} />}
      {hasData && view === 'terminal' && <div style={{ height: 'calc(100vh - 260px)', minHeight: 360 }}><ProTerm spec={spec} /></div>}
      {hasData && view === 'editorial' && <ProEd spec={spec} subtitle={`${headCode} · ${period}`} />}

      {view === 'legacy' && (
        <section className="aw-card gl-report-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="aw-main-head">
            <span className="aw-card-title">General Ledger Report</span>
            <span className="aw-meta">{hasData ? `${headCode} – ${headName}` : 'No report yet'}</span>
          </div>
          <div style={{ padding: 'var(--aw-pad)', overflow: 'auto' }}>
            <Spin spinning={isLoading} tip="Loading…" size="small">
              {ledgerData ? (
              <div className="font-mono fz-small">
                {/* Company header */}
                <div className={`text-center mb-2 pb-2 border-b border-dashed ${isDark ? 'border-slate-600' : 'border-slate-300'}`}>
                  <div className={`fz-caption font-bold ${text}`}>Espat Karmchari Co-Operative Credit Society Limited.</div>
                  <div className={`fz-tiny ${muted}`}>Avenue A, Sahakari Sadan, Sector-C, AT Post: Bhilai Nagar, Dist: DURG-490006</div>
                  <div className="fz-small font-bold text-emerald-500 mt-0.5">General Ledger Report</div>
                  <div className={`fz-tiny ${muted}`}>Head: {headCode} – {headName} &nbsp;|&nbsp; Period: {fromDate?.format('DD-MMM-YYYY')} to {toDate?.format('DD-MMM-YYYY')}</div>
                </div>

                {/* Table */}
                <table className={`gl-table w-full border ${tblBdr}`} style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className={`gl-table-head ${tblHd}`}>
                      <th className={`text-left py-1.5 px-2 border-r ${tblBdr} font-bold w-24`}>Date</th>
                      <th className={`text-left py-1.5 px-2 border-r ${tblBdr} font-bold w-20`}>MB No</th>
                      <th className={`text-left py-1.5 px-2 border-r ${tblBdr} font-bold w-20`}>Voucher</th>
                      <th className={`text-left py-1.5 px-2 border-r ${tblBdr} font-bold`}>Narration</th>
                      <th className={`text-right py-1.5 px-2 border-r ${tblBdr} font-bold w-28`}>Payment</th>
                      <th className={`text-right py-1.5 px-2 border-r ${tblBdr} font-bold w-28`}>Receipt</th>
                      <th className={`text-right py-1.5 px-2 font-bold w-32`}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Opening row */}
                    <tr className={`border-b ${tblBdr} ${isDark ? 'bg-emerald-900/20' : 'bg-emerald-50'}`}>
                      <td colSpan={4} className={`py-1 px-2 border-r ${tblBdr} font-bold ${text} text-right`}>Opening Balance :</td>
                      <td className={`text-right py-1 px-2 border-r ${tblBdr} ${muted}`}>–</td>
                      <td className={`text-right py-1 px-2 border-r ${tblBdr} ${muted}`}>–</td>
                      <td className="text-right py-1 px-2 font-bold text-emerald-500">{fmt(ledgerData.openingBalance)}</td>
                    </tr>

                    {/* Entries */}
                    {ledgerData.entries.map((e, idx) => (
                      <tr key={idx} className={`border-b ${tblBdr} ${rowHover} transition-colors`}>
                        <td className={`py-1 px-2 border-r ${tblBdr} ${text} whitespace-nowrap`}>
                          {dayjs(e.transactionDate).format('DD-MMM-YYYY')}
                        </td>
                        <td className={`py-1 px-2 border-r ${tblBdr} ${muted}`}>{e.memberNumber || '–'}</td>
                        <td className={`py-1 px-2 border-r ${tblBdr} ${text}`}>{e.voucherNo || '–'}</td>
                        <td className={`py-1 px-2 border-r ${tblBdr} ${muted}`}>{e.narration}</td>
                        <td className={`text-right py-1 px-2 border-r ${tblBdr} font-semibold ${e.debit > 0 ? 'text-rose-500' : muted}`}>
                          {e.debit > 0 ? (<><CrDrIndicator type="debit" className="mr-1" />{fmt(e.debit)}</>) : '–'}
                        </td>
                        <td className={`text-right py-1 px-2 border-r ${tblBdr} font-semibold ${e.credit > 0 ? 'text-emerald-500' : muted}`}>
                          {e.credit > 0 ? (<><CrDrIndicator type="credit" className="mr-1" />{fmt(e.credit)}</>) : '–'}
                        </td>
                        <td className="text-right py-1 px-2 font-bold text-teal-400">{fmt(e.balance)}</td>
                      </tr>
                    ))}

                    {ledgerData.entries.length === 0 && (
                      <tr className={`border-b ${tblBdr}`}>
                        <td colSpan={7} className={`py-5 text-center ${muted}`}>
                          No transactions for this account head and period.
                        </td>
                      </tr>
                    )}

                    {/* Summary footer */}
                    <tr className={`border-t-2 border-b ${tblBdr} ${sumRow}`}>
                      <td colSpan={4} className={`text-right py-1.5 px-2 border-r ${tblBdr} font-bold ${text}`}>Total Payments :</td>
                      <td className={`text-right py-1.5 px-2 border-r ${tblBdr} font-semibold text-rose-500`}>
                        {ledgerData.totalDebits > 0 && <CrDrIndicator type="debit" className="mr-1" />}{fmt(ledgerData.totalDebits)}
                      </td>
                      <td className={`text-right py-1.5 px-2 border-r ${tblBdr} ${muted}`}>–</td>
                      <td className="py-1.5 px-2" />
                    </tr>
                    <tr className={`border-b ${tblBdr} ${sumRow}`}>
                      <td colSpan={4} className={`text-right py-1.5 px-2 border-r ${tblBdr} font-bold ${text}`}>Total Receipts :</td>
                      <td className={`text-right py-1.5 px-2 border-r ${tblBdr} ${muted}`}>–</td>
                      <td className={`text-right py-1.5 px-2 border-r ${tblBdr} font-semibold text-emerald-500`}>
                        {ledgerData.totalCredits > 0 && <CrDrIndicator type="credit" className="mr-1" />}{fmt(ledgerData.totalCredits)}
                      </td>
                      <td className="py-1.5 px-2" />
                    </tr>
                    <tr className={`${sumRow}`}>
                      <td colSpan={6} className={`text-right py-1.5 px-2 border-r ${tblBdr} font-bold text-emerald-500`}>Closing Balance :</td>
                      <td className="text-right py-1.5 px-2 font-black text-emerald-500">{fmt(ledgerData.closingBalance)}</td>
                    </tr>
                  </tbody>
                </table>

                <div className={`text-center mt-2 fz-tiny ${muted}`}>* Report As Per Data Available</div>
              </div>
              ) : !isLoading ? (
                <ReportEmpty icon={<FileText size={34} />} title="No Data" hint="Select head code and date range, then Generate" />
              ) : null}
            </Spin>
          </div>
        </section>
      )}
      {view !== 'legacy' && !hasData && !reportError && (
        <ReportEmpty icon={<FileText size={34} />} title={isLoading ? 'Loading…' : 'No Data'} hint="Select head code and date range, then Generate" />
      )}

      <style>{`
        html.dark .gl-table { border-color: rgba(255,255,255,.07) !important; }
        html.dark .gl-table td,
        html.dark .gl-table th { border-color: rgba(255,255,255,.07) !important; }
        html.dark .gl-table-head { background-color: #1c1c1e !important; color: #8e8e93 !important; }
      `}</style>
    </ReportShell>
  );
};

export default GeneralLedger;
