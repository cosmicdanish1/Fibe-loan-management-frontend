import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../../../../../../services/api';
import { Printer, Download, BookOpen, RefreshCw } from 'lucide-react';
import dayjs from 'dayjs';
import { CrDrIndicator } from '@/components/shared/CrDrIndicator';
import { showDialog3 as showDialog, toastError, isFailure } from '@/utils/dialog';
import { ReportShell, ParamCard, StatCards, ReportEmpty } from '../../../../../../components/reports/views/ReportShell';

interface VoucherEntry {
  trans_no: number;
  member_code: number | string;
  member_name: string;
  head_code: string;
  head_name: string;
  debit: number;
  credit: number;
}

interface JournalVoucherData {
  voucher_no: string;
  trans_date: string;
  narration: string;
  entries: VoucherEntry[];
}

interface VoucherReference {
  voucher_no: string;
  voucher_date: string;
}

const voucherRefValue = (voucher: VoucherReference) => `${voucher.voucher_no}|${voucher.voucher_date}`;

// Print-only layout matching the legacy report design standard used across
// every report this session (letterhead, Date/Page Number line, plain
// column headers, dashed rules, TOTAL row, footer note) — plain monospace
// text, not a clone of the on-screen colorful UI. Feeds handlePrint only.
const JTV_LINE_W = 96;
const JTV_DASH = '-'.repeat(JTV_LINE_W);
const JTV_COL_MB = 12;
const JTV_COL_NAME = 20;
const JTV_COL_CODE = 8;
const JTV_COL_HNAME = 22;
const JTV_COL_AMT = (JTV_LINE_W - JTV_COL_MB - JTV_COL_NAME - JTV_COL_CODE - JTV_COL_HNAME) / 2;

const jtvFmt = (n: number) =>
  Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const jtvPadL = (s: string, w: number) => s.padStart(w);
const jtvPadR = (s: string, w: number) => (s.length > w ? s.slice(0, w) : s.padEnd(w));
const jtvCenter = (s: string, w: number) => ' '.repeat(Math.max(0, Math.floor((w - s.length) / 2))) + s;
const jtvEscapeHtml = (text: string) => text.replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char] || char));
const jtvCsvCell = (value: unknown): string => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  let text = String(value ?? '');
  if (/^[\t\r ]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};
const jtvWrap = (value: string, width: number): string[] => {
  const words = String(value ?? '').replace(/[\r\n\t]+/g, ' ').split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if (!line && word.length > width) {
      for (let i = 0; i < word.length; i += width) {
        const part = word.slice(i, i + width);
        if (i + width < word.length) lines.push(part);
        else line = part;
      }
    } else if (!line) line = word;
    else if (`${line} ${word}`.length <= width) line += ` ${word}`;
    else { lines.push(line); line = word; }
  }
  if (line || lines.length === 0) lines.push(line);
  return lines;
};

function buildJournalVoucherLines(data: JournalVoucherData, totalDebit: number, totalCredit: number): string[] {
  const lines: string[] = [];
  const now = dayjs().format('DD-MMM-YYYY/h:mmA');

  lines.push(jtvCenter('Espat Karmchari Co-Operative Credit Society Limited.', JTV_LINE_W));
  lines.push(jtvCenter('Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006', JTV_LINE_W));
  lines.push(jtvCenter('Journal / Transfer Voucher', JTV_LINE_W));
  lines.push('');
  lines.push(`Voucher No : ${data.voucher_no}`);
  lines.push(`Date : ${dayjs(data.trans_date).format('DD-MMM-YYYY')}`);
  const printedStr = `Printed : ${now}`;
  lines.push(printedStr);
  lines.push(JTV_DASH);

  lines.push(
    `${jtvPadR('MBNO', JTV_COL_MB)}${jtvPadR('Name', JTV_COL_NAME)}${jtvPadR('Code', JTV_COL_CODE)}${jtvPadR('Head Name', JTV_COL_HNAME)}` +
    `${jtvPadL('Debit', JTV_COL_AMT)}${jtvPadL('Credit', JTV_COL_AMT)}`
  );
  lines.push(JTV_DASH);

  data.entries.forEach(e => {
    const mbLines = jtvWrap(String(e.member_code ?? ''), JTV_COL_MB);
    const nameLines = jtvWrap(e.member_name || '', JTV_COL_NAME);
    const codeLines = jtvWrap(e.head_code || '', JTV_COL_CODE);
    const headLines = jtvWrap(e.head_name || '', JTV_COL_HNAME);
    const lineCount = Math.max(mbLines.length, nameLines.length, codeLines.length, headLines.length);
    for (let i = 0; i < lineCount; i += 1) {
      lines.push(
        `${jtvPadR(mbLines[i] || '', JTV_COL_MB)}${jtvPadR(nameLines[i] || '', JTV_COL_NAME)}` +
        `${jtvPadR(codeLines[i] || '', JTV_COL_CODE)}${jtvPadR(headLines[i] || '', JTV_COL_HNAME)}` +
        `${jtvPadL(i === 0 && e.debit > 0 ? jtvFmt(e.debit) : '', JTV_COL_AMT)}` +
        `${jtvPadL(i === 0 && e.credit > 0 ? jtvFmt(e.credit) : '', JTV_COL_AMT)}`
      );
    }
  });

  lines.push(JTV_DASH);
  lines.push(
    `${jtvPadR('TOTAL :-', JTV_COL_MB + JTV_COL_NAME + JTV_COL_CODE + JTV_COL_HNAME)}` +
    `${jtvPadL(jtvFmt(totalDebit), JTV_COL_AMT)}${jtvPadL(jtvFmt(totalCredit), JTV_COL_AMT)}`
  );
  lines.push(JTV_DASH);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;
  lines.push(`Status : ${balanced ? 'BALANCED' : 'UNBALANCED'}`);
  lines.push('');
  lines.push(...jtvWrap(`Narration : ${data.narration || 'No narration provided'}`, JTV_LINE_W));
  lines.push('');
  lines.push('* Report As Per Data Available ..');

  return lines;
}

const JournalTransferVoucher: React.FC = () => {
  const [selectVoucher, setSelectVoucher] = useState<string>('');
  const [voucherData, setVoucherData] = useState<JournalVoucherData | null>(null);
  const [voucherList, setVoucherList] = useState<VoucherReference[]>([]);
  const [voucherFilter, setVoucherFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const voucherRequestId = useRef(0);

  useEffect(() => {
    fetchVoucherList();
  }, []);

  const fetchVoucherList = async () => {
    try {
      const response = await apiService.getAllJournalVoucherReferences();
      if (isFailure(response)) toastError(response, 'load the voucher list');
      if (response.success && Array.isArray(response.data)) {
        setVoucherList(response.data);
      }
    } catch (error) {
      console.error('Error fetching journal vouchers:', error);
    }
  };

  const handleVoucherSelect = async (value: string) => {
    setSelectVoucher(value);
    const requestId = ++voucherRequestId.current;
    setVoucherData(null);
    if (!value) { setIsLoading(false); return; }
    const separator = value.lastIndexOf('|');
    const selectedVoucherNo = separator >= 0 ? value.slice(0, separator) : value;
    const selectedVoucherDate = separator >= 0 ? value.slice(separator + 1) : '';
    setIsLoading(true);

    try {
      const response = selectedVoucherDate
        ? await apiService.getJournalVoucherByNoAndDate(selectedVoucherNo, selectedVoucherDate)
        : await apiService.getJournalVoucherByNo(selectedVoucherNo);
      if (response.success && response.data) {
        if (requestId === voucherRequestId.current) {
          const data = response.data as JournalVoucherData;
          setVoucherData({
            ...data,
            trans_date: selectedVoucherDate || data.trans_date,
            entries: Array.isArray(data.entries) ? data.entries : [],
          });
        }
      } else {
        if (requestId !== voucherRequestId.current) return;
        await showDialog('warning', 'Not Found', 'Voucher not found');
      }
    } catch (error) {
      if (requestId !== voucherRequestId.current) return;
      await showDialog('error', 'Error', 'Error loading voucher');
    } finally {
      if (requestId === voucherRequestId.current) setIsLoading(false);
    }
  };

  const calculateTotals = () => {
    if (!voucherData) return { totalDebit: 0, totalCredit: 0 };
    const totalDebit = voucherData.entries.reduce((sum, entry) => sum + (entry.debit || 0), 0);
    const totalCredit = voucherData.entries.reduce((sum, entry) => sum + (entry.credit || 0), 0);
    return { totalDebit, totalCredit };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const { totalDebit, totalCredit } = calculateTotals();

  const exportToCSV = async () => {
    if (!voucherData) {
      await showDialog('warning', 'No Voucher', 'Please select a voucher first');
      return;
    }

    const headers = ['Record Type', 'Voucher Type', 'Voucher No', 'Voucher Date', 'Voucher Narration', 'Line No', 'Transaction No', 'Member No', 'Member Name', 'Head Code', 'Head Name', 'Debit', 'Credit', 'Total Debit', 'Total Credit', 'Balance Status'];
    const status = Math.abs(totalDebit - totalCredit) < 0.01 ? 'BALANCED' : 'UNBALANCED';
    const rows = voucherData.entries.map((entry, index) => [
      'TRANSACTION', 'Journal / Transfer', voucherData.voucher_no, dayjs(voucherData.trans_date).format('YYYY-MM-DD'),
      voucherData.narration, index + 1, entry.trans_no, entry.member_code, entry.member_name,
      entry.head_code, entry.head_name, entry.debit || '', entry.credit || '', '', '', '',
    ]);
    rows.push(['TOTAL', 'Journal / Transfer', voucherData.voucher_no, dayjs(voucherData.trans_date).format('YYYY-MM-DD'), voucherData.narration,
      '', '', '', '', '', '', '', '', totalDebit, totalCredit, status]);
    const csvContent = '\uFEFF' + [headers, ...rows].map(row => row.map(jtvCsvCell).join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal_voucher_${voucherData.voucher_no}_${dayjs().format('YYYYMMDD')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    await showDialog('info', 'Exported', 'CSV exported successfully');
  };

  // Rebuilt to match the legacy report design standard used across every
  // report this session: monospace letterhead layout, not a colorful clone
  // of the on-screen UI (that HTML/CSS template — amber boxes, JetBrains
  // Mono web font, signature blocks — never matched the legacy look this
  // app's prints are meant to follow, confirmed against multiple user-
  // supplied legacy reference screenshots this session).
  const handlePrint = async () => {
    if (!voucherData) {
      await showDialog('warning', 'No Voucher', 'Please select a voucher first');
      return;
    }

    const lines = buildJournalVoucherLines(voucherData, totalDebit, totalCredit);
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Journal/Transfer Voucher - ${jtvEscapeHtml(voucherData.voucher_no)}</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  body { margin: 0; }
  pre { font-family: 'Courier New', Courier, monospace; font-size: 8.5pt; line-height: 1.2; white-space: pre; width: fit-content; max-width: 100%; margin: 0 auto; }
</style></head><body><pre>${jtvEscapeHtml(lines.join('\n'))}</pre></body></html>`);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 300);
    }
  };

  const shownVouchers = voucherList
    .filter(v => !voucherFilter.trim() || `${v.voucher_no}`.toLowerCase().includes(voucherFilter.trim().toLowerCase()))
    .slice(0, 300);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <ReportShell
      className="jtv-page"
      title="Journal / Transfer Voucher"
      desc="Find a saved journal voucher and print it"
      actions={
        <>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={exportToCSV} disabled={!voucherData}><Download size={14} /> CSV</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handlePrint} disabled={!voucherData}><Printer size={14} /> Print</button>
        </>
      }
      aside={
        <>
          <ParamCard title="Parameters" icon={<BookOpen size={14} />}>
            <div>
              <label className="aw-label" htmlFor="jtv-filter">Voucher no.</label>
              <input id="jtv-filter" className="aw-input" value={voucherFilter} onChange={e => setVoucherFilter(e.target.value)} placeholder="Type to filter" />
            </div>
            <select className="aw-input" aria-label="Voucher" value={selectVoucher} onChange={e => handleVoucherSelect(e.target.value)} disabled={isLoading}>
              <option value="">Choose voucher</option>
              {shownVouchers.map(v => (
                <option key={voucherRefValue(v)} value={voucherRefValue(v)}>{v.voucher_no} · {dayjs(v.voucher_date).format('DD-MMM-YYYY')}</option>
              ))}
            </select>
            {voucherList.length > shownVouchers.length && <p className="aw-meta">Showing the first {shownVouchers.length} matches. Type more of the number to narrow the list.</p>}
            <button type="button" className="aw-btn aw-btn-ghost" onClick={fetchVoucherList} style={{ width: '100%' }}><RefreshCw size={14} /> Reload list</button>
          </ParamCard>
          {voucherData && (
            <StatCards items={[
              { label: 'Voucher no.', value: voucherData.voucher_no, tone: 'muted' },
              { label: 'Date', value: dayjs(voucherData.trans_date).format('DD-MMM-YYYY'), tone: 'muted' },
              { label: 'Total debit', value: `₹${formatCurrency(totalDebit)}`, tone: 'info' },
              { label: 'Total credit', value: `₹${formatCurrency(totalCredit)}`, tone: 'info' },
              { label: 'Balance status', value: balanced ? 'Balanced' : 'Unbalanced', tone: balanced ? 'success' : 'danger' },
            ]} />
          )}
        </>
      }
      footerLeft="Journal / Transfer Voucher"
      footerRight={voucherData ? `Voucher ${voucherData.voucher_no}` : ''}
    >
      {voucherData ? (
        <section className="aw-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="aw-main-head">
            <span className="aw-card-title">Voucher Preview</span>
            <span className="aw-meta">{voucherData.voucher_no}</span>
          </div>
          <div style={{ padding: 'var(--aw-pad)', overflow: 'auto' }}>
            <div className="aw-stack" style={{ textAlign: 'center', gap: 2, marginBottom: 12 }}>
              <div className="aw-strong">Espat Karmchari Co-Operative Credit Society Limited.</div>
              <div className="aw-meta">Avenue A, Sahakari Sadan, Sector-C, AT Post: Bhilai Nagar, Dist: DURG-490006</div>
              <div className="aw-strong" style={{ marginTop: 6, letterSpacing: '.08em' }}>JOURNAL / TRANSFER VOUCHER</div>
            </div>
            <p className="aw-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 22px', marginBottom: 10 }}>
              <span><b>Voucher No:</b> {voucherData.voucher_no}</span>
              <span><b>Date:</b> {dayjs(voucherData.trans_date).format('DD-MMM-YYYY')}</span>
              <span><b>Type:</b> JOURNAL</span>
            </p>
            <div className="aw-table-wrap">
              <table className="aw-table">
                <thead>
                  <tr><th>MBNO</th><th>Name</th><th>Code</th><th>Head name</th><th className="is-right">Debit</th><th className="is-right">Credit</th></tr>
                </thead>
                <tbody>
                  {voucherData.entries.map((entry, index) => (
                    <tr key={index}>
                      <td className="is-muted">{entry.member_code || ''}</td>
                      <td>{entry.member_name || ''}</td>
                      <td className="is-accent">{entry.head_code}</td>
                      <td>{entry.head_name}</td>
                      <td className="is-right">{entry.debit > 0 ? (<><CrDrIndicator type="debit" className="mr-1" />{formatCurrency(entry.debit)}</>) : ''}</td>
                      <td className="is-right">{entry.credit > 0 ? (<><CrDrIndicator type="credit" className="mr-1" />{formatCurrency(entry.credit)}</>) : ''}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={4} className="is-right"><b>TOTAL</b></td>
                    <td className="is-right"><b>{totalDebit > 0 && <CrDrIndicator type="debit" className="mr-1" />}{formatCurrency(totalDebit)}</b></td>
                    <td className="is-right"><b>{totalCredit > 0 && <CrDrIndicator type="credit" className="mr-1" />}{formatCurrency(totalCredit)}</b></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 12 }}>
              <span className="aw-label">Narration</span>
              <p className="aw-meta" style={{ fontStyle: 'italic' }}>{voucherData.narration || 'No narration provided'}</p>
            </div>
          </div>
        </section>
      ) : (
        <ReportEmpty icon={<BookOpen size={34} />} title={isLoading ? 'Loading…' : 'No Voucher Selected'} hint="Select a journal voucher from the sidebar to view its details" />
      )}
    </ReportShell>
  );
};

export default JournalTransferVoucher;
