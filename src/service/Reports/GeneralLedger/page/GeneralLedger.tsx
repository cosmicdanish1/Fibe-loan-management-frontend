import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Printer,
  FileDown,
  BookOpen,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { ConfigProvider, Button, DatePicker, Spin, Select, theme as antdTheme, message } from 'antd';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../store';
import { apiService } from '../../../../services/api';
import dayjs, { Dayjs } from 'dayjs';
import { CrDrIndicator } from '@/components/shared/CrDrIndicator';

const showDialog = async (type: 'info' | 'warning' | 'error', title: string, detail: string): Promise<void> => {
  if ((window as any).electronAPI?.showMessageBox) {
    await (window as any).electronAPI.showMessageBox({ type, title: 'electron-react-ts', message: title, detail, buttons: ['OK'], defaultId: 0 });
  }
};

const { Option } = Select;

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
  const bg       = isDark ? 'bg-[#0f172a]'  : 'bg-slate-50';
  const panel    = isDark ? 'bg-[#1e293b]'  : 'bg-white';
  const panelBdr = isDark ? 'border-[#334155]' : 'border-slate-200';
  const text     = isDark ? 'text-slate-100' : 'text-slate-800';
  const muted    = isDark ? 'text-slate-400' : 'text-slate-500';
  const tblHd    = isDark ? 'bg-[#263148] text-slate-300' : 'bg-slate-100 text-slate-700';
  const tblBdr   = isDark ? 'border-slate-600' : 'border-slate-300';
  const rowHover = isDark ? 'hover:bg-white/5' : 'hover:bg-emerald-50/40';
  const sumRow   = isDark ? 'bg-[#263148]'  : 'bg-slate-100';

  return (
    <ConfigProvider theme={{ algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm, token: { colorPrimary: '#10b981', borderRadius: 8 } }}>
      <div className={`gl-page h-screen flex flex-col ${bg} font-sans overflow-hidden`}>

        {/* ── Header ── */}
        <div className={`gl-header ${isDark ? 'bg-gradient-to-r from-slate-900 to-slate-900 border-white/5' : 'bg-white border-slate-200'} border-b px-4 py-2 flex items-center justify-between shrink-0 shadow-sm`}>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-1.5 rounded-lg text-white shadow">
              <BookOpen size={15} />
            </div>
            <div>
              <h1 className={`text-sm font-black ${text} tracking-tight leading-none uppercase`}>General Ledger</h1>
              <div className={`flex items-center gap-1 mt-0.5 fz-tiny font-bold ${muted} uppercase tracking-wide`}>
                <ShieldCheck size={9} className="text-emerald-500" /> Head-wise Account Statement
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button size="small" icon={<Printer size={11} />} onClick={handlePrint} disabled={!ledgerData}
              className="h-7 px-2 fz-small font-bold uppercase">Print</Button>
            <Button size="small" type="primary" icon={<FileDown size={11} />} onClick={handleExportCSV} disabled={!ledgerData}
              className="h-7 px-2 fz-small font-bold uppercase bg-emerald-600 border-0 hover:!bg-emerald-700">Export CSV</Button>
          </div>
        </div>

        {/* ── Filter Bar ── */}
        <div className={`gl-filter-bar ${panel} border-b ${panelBdr} px-4 py-2 flex items-end gap-3 shrink-0`}>
          {/* Head */}
          <div className="flex flex-col gap-0.5 min-w-[220px] max-w-[320px] flex-1">
            <label className={`fz-tiny font-bold ${muted} uppercase tracking-wide`}>Head Name</label>
            <Select
              value={headCode || undefined}
              onChange={value => { setHeadCode(value ?? ''); invalidateReport(); }}
              placeholder="Select head code"
              showSearch
              size="small"
              loading={isLoadingHeads}
              className="w-full"
              filterOption={(input, option) => {
                const code = option?.value?.toString().toLowerCase() || '';
                const label = (option?.label as string)?.toLowerCase() || '';
                const s = input.toLowerCase();
                return code.includes(s) || label.includes(s);
              }}
            >
              {headMasters.map(h => (
                <Option key={h.code} value={h.code} label={`${h.code} ${h.headName}`}>
                  <span className="fz-small font-black text-emerald-600 mr-2">{h.code}</span>
                  <span className="fz-small text-slate-500">{h.headName}</span>
                </Option>
              ))}
            </Select>
          </div>

          {/* From */}
          <div className="flex flex-col gap-0.5">
            <label className={`fz-tiny font-bold ${muted} uppercase tracking-wide`}>From</label>
            <DatePicker size="small" value={fromDate} onChange={value => { setFromDate(value); invalidateReport(); }} format="DD-MMM-YYYY" className="w-32" />
          </div>

          {/* To */}
          <div className="flex flex-col gap-0.5">
            <label className={`fz-tiny font-bold ${muted} uppercase tracking-wide`}>To</label>
            <DatePicker size="small" value={toDate} onChange={value => { setToDate(value); invalidateReport(); }} format="DD-MMM-YYYY" className="w-32" />
          </div>

          <Button type="primary" size="small" icon={<RefreshCw size={12} />} onClick={generateReport} loading={isLoading}
            className="h-[30px] px-4 fz-small font-bold uppercase bg-emerald-600 border-0 hover:!bg-emerald-700 shrink-0">
            Generate
          </Button>
        </div>

        {/* ── Stats Bar (shown only when data loaded) ── */}
        {ledgerData && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className={`gl-stats-bar ${panel} border-b ${panelBdr} px-4 py-1.5 flex items-center gap-6 shrink-0`}>
            {[
              { label: 'Opening',      value: ledgerData.openingBalance,  color: text },
              { label: 'Total Payments', value: ledgerData.totalDebits,   color: 'text-rose-500' },
              { label: 'Total Receipts',value: ledgerData.totalCredits,   color: 'text-emerald-500' },
              { label: 'Closing',      value: ledgerData.closingBalance,  color: 'text-teal-400' },
            ].map(s => (
              <div key={s.label}>
                <div className={`fz-tiny font-bold ${muted} uppercase tracking-wide leading-none`}>{s.label}</div>
                <div className={`fz-caption font-black font-mono ${s.color} leading-tight`}>₹{fmt(s.value)}</div>
              </div>
            ))}
            <div className="ml-auto">
              <div className={`fz-tiny font-bold ${muted} uppercase tracking-wide leading-none`}>Transactions</div>
              <div className={`fz-caption font-black font-mono ${text} leading-tight`}>{ledgerData.totalTransactions}</div>
            </div>
          </motion.div>
        )}

        {/* ── Report Table ── */}
        <div className="gl-report-panel flex-1 overflow-auto p-3 custom-scrollbar-emerald">
          {reportError && (
            <div role="alert" className="mb-3 rounded border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {reportError}
            </div>
          )}
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
              <div className="h-full flex flex-col items-center justify-center py-24 select-none opacity-40">
                <FileText size={52} className="text-slate-400 mb-3" />
                <h3 className={`text-xs font-black ${muted} uppercase tracking-widest`}>No Data</h3>
                <p className={`fz-small font-bold ${muted} uppercase mt-1 text-center`}>Select head code and date range, then Generate</p>
              </div>
            ) : null}
          </Spin>
        </div>

      </div>

      <style>{`
        .custom-scrollbar-emerald::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar-emerald::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-emerald::-webkit-scrollbar-thumb { background: #10b981; border-radius: 10px; }
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          html, body, #root { height: auto !important; min-height: 0 !important; overflow: visible !important; }
          .gl-page { height: auto !important; min-height: 0 !important; overflow: visible !important; background: oklch(100% 0.004 200) !important; }
          .gl-header, .gl-filter-bar, .gl-stats-bar { display: none !important; }
          .gl-report-panel { height: auto !important; min-height: 0 !important; overflow: visible !important; padding: 0 !important; color: oklch(18% 0.01 200) !important; background: oklch(100% 0.004 200) !important; }
          .gl-report-panel, .gl-report-panel * { color: oklch(18% 0.01 200) !important; background-color: oklch(100% 0.004 200) !important; border-color: oklch(75% 0.01 200) !important; }
          .gl-table { width: 100% !important; table-layout: fixed; font-size: 9pt !important; }
          .gl-table thead { display: table-header-group; }
          .gl-table tr { break-inside: avoid; page-break-inside: avoid; }
          .gl-report-panel .text-center { break-inside: avoid; }
        }

        /* ── General Ledger — dark mode ── */
        html.dark .gl-page { background-color: #000000 !important; color: #f5f5f7 !important; }
        html.dark .gl-header { background-color: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .gl-filter-bar { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .gl-stats-bar { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .gl-report-panel { background-color: #000000 !important; }
        html.dark .gl-table { border-color: rgba(255,255,255,.07) !important; }
        html.dark .gl-table td,
        html.dark .gl-table th { border-color: rgba(255,255,255,.07) !important; }
        html.dark .gl-table-head { background-color: #1c1c1e !important; color: #8e8e93 !important; }
        html.dark .gl-page input,
        html.dark .gl-page .ant-picker,
        html.dark .gl-page .ant-select-selector {
          background-color: rgba(255,255,255,.05) !important; color: #f5f5f7 !important; border-color: rgba(255,255,255,.08) !important;
        }
        html.dark .gl-page .ant-picker-input > input,
        html.dark .gl-page .ant-select-selection-item { color: #f5f5f7 !important; }
        html.dark .gl-page label { color: #8e8e93 !important; }
        html.dark .gl-page button:not(.ant-btn-primary):not(.bg-emerald-600) {
          background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important;
        }
      `}</style>
    </ConfigProvider>
  );
};

export default GeneralLedger;
