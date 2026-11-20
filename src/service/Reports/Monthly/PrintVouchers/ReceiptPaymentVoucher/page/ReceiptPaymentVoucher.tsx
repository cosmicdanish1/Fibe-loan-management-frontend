import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../../../../../../services/api';
import { Printer, FileDown, Search, FileText } from 'lucide-react';
import dayjs, { Dayjs } from 'dayjs';
import { ReportShell, ParamCard, StatCards, ReportEmpty } from '../../../../../../components/reports/views/ReportShell';
import { showDialog3 as showDialog } from '@/utils/dialog';

interface VoucherEntry {
  key: string;
  trans_no: number;
  head_code: string;
  head_name: string;
  narration: string;
  amount: number;
  direction: 'Payment' | 'Receipt';
  member_no: number | string;
  member_name: string;
}

interface VoucherReference {
  voucher_no: string;
  voucher_date: string;
}

const voucherRefValue = (voucher: VoucherReference) => `${voucher.voucher_no}|${voucher.voucher_date}`;

const csvCell = (value: unknown): string => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  let text = String(value ?? '');
  if (/^[\t\r ]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

const ReceiptPaymentVoucher: React.FC = () => {
  const [date, setDate] = useState<Dayjs | null>(dayjs());
  const [voucherDateKey, setVoucherDateKey] = useState('');
  const [voucherNo, setVoucherNo] = useState<string>('');
  const [vchrType, setVchrType] = useState<string>('Receipt');
  const [mode, setMode] = useState<string>('Cash');
  const [memberNo, setMemberNo] = useState<string>('');
  const [memberName, setMemberName] = useState<string>('');
  const [narration, setNarration] = useState<string>('');
  const [chequeNo, setChequeNo] = useState<string>('');
  const [bank, setBank] = useState<string>('');
  const [chequeDate, setChequeDate] = useState<Dayjs | null>(null);
  const [voucherList, setVoucherList] = useState<VoucherReference[]>([]);
  const [voucherFilter, setVoucherFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [entries, setEntries] = useState<VoucherEntry[]>([]);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const voucherRequestId = useRef(0);

  useEffect(() => {
    fetchVoucherList();
  }, []);

  const fetchVoucherList = async () => {
    try {
      const response = await apiService.getAllVoucherReferences();
      if (response.success && Array.isArray(response.data)) {
        setVoucherList(response.data);
      }
    } catch (error) {
      console.error('Error fetching voucher list:', error);
    }
  };

  const handleVoucherSelect = async (value: string): Promise<void> => {
    const separator = value.lastIndexOf('|');
    const selectedVoucherNo = separator >= 0 ? value.slice(0, separator) : value;
    const selectedVoucherDate = separator >= 0 ? value.slice(separator + 1) : '';
    setVoucherNo(selectedVoucherNo);
    setVoucherDateKey(selectedVoucherDate);
    setDate(null);
    setVchrType('');
    setMode('');
    const requestId = ++voucherRequestId.current;
    setEntries([]);
    setTotalAmount(0);
    setMemberNo('');
    setMemberName('');
    setNarration('');
    setChequeNo('');
    setBank('');
    setChequeDate(null);
    if (!value) { setVoucherNo(''); setVoucherDateKey(''); setIsLoading(false); return; }

    setIsLoading(true);
    try {
      const response = selectedVoucherDate
        ? await apiService.getVoucherByNoAndDate(selectedVoucherNo, selectedVoucherDate)
        : await apiService.getVoucherByNo(selectedVoucherNo);
      if (response.success && response.data) {
        const data = response.data;
        if (requestId !== voucherRequestId.current) return;
        setDate(dayjs(selectedVoucherDate || data.trans_date));
        setVchrType(data.dr_cr);
        setMode(data.mode);
        setMemberNo(data.member_no ? data.member_no.toString() : '');
        setMemberName(data.member_name || '');
        setNarration(data.narration || '');
        setTotalAmount(data.total_amount || 0);

        if (data.mode === 'Cheque' || data.mode === 'Bank Transfer') {
          setChequeNo(data.cheque_no || '');
          setBank(data.bank_name || '');
          setChequeDate(data.cheque_date ? dayjs(data.cheque_date) : null);
        } else {
          setChequeNo('');
          setBank('');
          setChequeDate(null);
        }

        const mappedEntries = (data.entries || []).map((e: any, idx: number) => ({
          key: idx.toString(),
          trans_no: e.trans_no,
          head_code: e.head_code,
          head_name: e.head_name,
          narration: e.narration,
          amount: Number(e.amount) || 0,
          direction: e.direction === 'Payment' ? 'Payment' : 'Receipt',
          member_no: e.mbno ?? '',
          member_name: e.member_name || '',
        }));
        setEntries(mappedEntries);
      } else {
        if (requestId !== voucherRequestId.current) return;
        await showDialog('warning', 'Not Found', 'Voucher not found');
      }
    } catch (error) {
      if (requestId !== voucherRequestId.current) return;
      await showDialog('error', 'Error', 'Error fetching voucher');
    } finally {
      if (requestId === voucherRequestId.current) setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // window.print() used to be used here — it printed the live page as-is,
  // so the app's own inner "Voucher Preview" panel header and every
  // on-screen accent color came through on the printed page (confirmed
  // live). CSS-only attempts to hide/strip those kept missing elements
  // (whack-a-mole across nested headers). Switched to the same hidden-
  // iframe technique already proven working for every other report's
  // print this session — the iframe only ever contains what's explicitly
  // cloned into it, so there's no surrounding app chrome to accidentally
  // include, and the print stylesheet redeclares just the utility classes
  // #rpv-print-area actually uses instead of trying to override the
  // on-screen dark-mode styling in place.
  const handlePrint = () => {
    const content = document.getElementById('rpv-print-area')?.innerHTML || '';
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><title>Receipt/Payment Voucher</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Courier New',monospace; font-size:9pt; color:#000; background:#fff; }
  table { width:100%; border-collapse:collapse; }
  td { overflow-wrap:anywhere; }
  th, td { padding:3px 6px; font-size:8.5pt; }
  thead { display:table-header-group; }
  tr { break-inside:avoid; page-break-inside:avoid; }

  .text-center { text-align:center; }
  .text-right { text-align:right; }
  .mb-3 { margin-bottom:8px; }
  .mt-1 { margin-top:3px; }
  .mt-0\\.5 { margin-top:2px; }
  .pb-2 { padding-bottom:6px; }
  .p-3 { padding:8px; }
  .px-2 { padding-left:6px; padding-right:6px; }
  .py-1 { padding-top:3px; padding-bottom:3px; }
  .py-1\\.5 { padding-top:4px; padding-bottom:4px; }
  .py-0\\.5 { padding-top:1px; padding-bottom:1px; }
  .border { border:1px solid #999; }
  .border-b { border-bottom:1px solid #999; }
  .border-r { border-right:1px solid #999; }
  .border-x { border-left:1px solid #999; border-right:1px solid #999; }
  /* Only used paired with .border-b (the company-header rule below) — a
     plain "border-style:dashed" here would set dashed on all 4 sides, and
     since the other 3 have no width/color declared, the browser still
     renders default borders on them, producing an unwanted box around the
     header instead of a single dashed line under it (confirmed live). */
  .border-dashed { border-bottom-style:dashed; }
  .font-bold, .font-black, .font-semibold { font-weight:bold; }
  .uppercase { text-transform:uppercase; }
  .tracking-tight, .tracking-wide { letter-spacing:0.02em; }
  .rounded { border-radius:3px; }
  .grid { display:grid; }
  .grid-cols-2 { grid-template-columns:1fr 1fr; }
  .gap-x-8 { column-gap:24px; }
  .gap-y-2 { row-gap:6px; }
  .col-span-2 { grid-column:span 2; }
  .flex { display:flex; }
  .items-center { align-items:center; }
  .gap-2 { gap:6px; }
  .w-24 { width:70px; display:inline-block; }
  .w-16 { width:45px; }
  .w-28 { width:80px; }
  .ml-auto { margin-left:auto; }
  .h-16 { display:none; }
  .fz-caption { font-size:8pt; }
  .fz-label { font-size:8.5pt; }

  /* This voucher's own accent colors (pink labels, indigo/rose values) are
     for on-screen use only — a printed voucher should be plain black text. */
  * { color:#000 !important; background:transparent !important; }
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
    if (!entries.length) return;
    const paymentTotal = entries.reduce((sum, entry) => sum + (entry.direction === 'Payment' ? entry.amount : 0), 0);
    const receiptTotal = entries.reduce((sum, entry) => sum + (entry.direction === 'Receipt' ? entry.amount : 0), 0);
    const headers = ['Record Type', 'Voucher No', 'Date', 'Direction', 'Mode', 'Voucher Member No', 'Voucher Member Name', 'Cheque No', 'Cheque Date', 'Bank', 'Voucher Narration', 'Line No', 'Transaction No', 'Member No', 'Member Name', 'Head Code', 'Head Name', 'Line Narration', 'Payment', 'Receipt', 'Line Total', 'Total Payments', 'Total Receipts', 'Voucher Total'];
    const rows: unknown[][] = entries.map((entry, index) => [
      'TRANSACTION', voucherNo, date?.format('YYYY-MM-DD') || '', entry.direction, mode,
      memberNo, memberName, chequeNo, chequeDate?.format('YYYY-MM-DD') || '', bank,
      narration, index + 1, entry.trans_no, entry.member_no, entry.member_name, entry.head_code, entry.head_name, entry.narration,
      entry.direction === 'Payment' ? entry.amount : '',
      entry.direction === 'Receipt' ? entry.amount : '', entry.amount, '', '', '',
    ]);
    const totalRow: unknown[] = Array(headers.length).fill('');
    Object.assign(totalRow, {
      0: 'TOTAL', 1: voucherNo, 2: date?.format('YYYY-MM-DD') || '', 3: vchrType, 4: mode,
      5: memberNo, 6: memberName, 7: chequeNo, 8: chequeDate?.format('YYYY-MM-DD') || '',
      9: bank, 10: narration, 21: paymentTotal, 22: receiptTotal, 23: totalAmount,
    });
    rows.push(totalRow);
    const csv = '\uFEFF' + [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `Voucher_${voucherNo}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const shownVouchers = voucherList
    .filter(v => !voucherFilter.trim() || `${v.voucher_no}`.toLowerCase().includes(voucherFilter.trim().toLowerCase()))
    .slice(0, 300);
  const hasData = entries.length > 0;

  return (
    <ReportShell
      className="rpv-page aw-calm"
      title="Receipt / Payment Voucher"
      desc="Find a saved voucher and print it"
      actions={
        <>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handleExportCSV} disabled={!hasData}><FileDown size={14} /> CSV</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handlePrint} disabled={!hasData}><Printer size={14} /> Print</button>
        </>
      }
      aside={
        <>
          <ParamCard title="Search voucher" icon={<Search size={14} />}>
            <div>
              <label className="aw-label" htmlFor="rpv-filter">Voucher no.</label>
              <input id="rpv-filter" className="aw-input" value={voucherFilter} onChange={e => setVoucherFilter(e.target.value)} placeholder="Type to filter" />
            </div>
            <select
              className="aw-input"
              aria-label="Voucher"
              value={voucherNo && voucherDateKey ? `${voucherNo}|${voucherDateKey}` : ''}
              onChange={e => handleVoucherSelect(e.target.value)}
              disabled={isLoading}
            >
              <option value="">Select voucher</option>
              {shownVouchers.map(v => (
                <option key={voucherRefValue(v)} value={voucherRefValue(v)}>#{v.voucher_no} · {dayjs(v.voucher_date).format('DD-MMM-YYYY')}</option>
              ))}
            </select>
            {voucherList.length > shownVouchers.length && <p className="aw-meta">Showing the first {shownVouchers.length} matches. Type more of the number to narrow the list.</p>}
          </ParamCard>
          {voucherNo && (
            <section className="aw-card">
              <div className="aw-stack">
                <div><span className="aw-label">Date</span><span className="aw-strong">{date ? date.format('DD-MMM-YYYY') : '—'}</span></div>
                <div><span className="aw-label">Type</span><span className={`aw-pill tone-${vchrType === 'Receipt' ? 'success' : 'danger'}`}>{vchrType || '—'}</span></div>
                <div><span className="aw-label">Mode</span><span className="aw-strong">{mode || 'N/A'}</span></div>
                <div><span className="aw-label">Member</span><span className="aw-strong">MB-{memberNo || 'N/A'}</span><div className="aw-meta">{memberName || 'No member'}</div></div>
                {chequeNo && (
                  <div><span className="aw-label">Cheque</span><span className="aw-strong">#{chequeNo}</span><div className="aw-meta">{bank} · {chequeDate?.format('DD-MMM-YYYY')}</div></div>
                )}
              </div>
            </section>
          )}
          {totalAmount > 0 && (
            <StatCards items={[{ label: 'Total amount', value: `₹${formatCurrency(totalAmount)}`, tone: vchrType === 'Receipt' ? 'success' : 'danger' }]} />
          )}
        </>
      }
      footerLeft="Receipt / Payment Voucher"
      footerRight={voucherNo ? `Voucher #${voucherNo}` : ''}
    >
      {hasData ? (
        <section className="aw-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="aw-main-head">
            <span className="aw-card-title">Voucher Preview</span>
            <span className="aw-meta">{voucherNo ? `Voucher #${voucherNo}` : ''}</span>
          </div>
          <div style={{ padding: 'var(--aw-pad)', overflow: 'auto' }}>
            <style>{`
              #rpv-print-area { color: var(--aw-text); }
              #rpv-print-area * { border-color: var(--aw-border); }
              #rpv-print-area .rpv-muted { color: var(--aw-muted); }
              #rpv-print-area .rpv-box { background: var(--aw-surface-muted); }
              #rpv-print-area .rpv-lbl { color: var(--aw-muted); }
              #rpv-print-area .rpv-val { color: var(--aw-accent); }
              #rpv-print-area .rpv-bar { background: var(--aw-surface-muted); }
            `}</style>
            <div id="rpv-print-area" className="font-mono fz-caption">
              {/* Company Header */}
              <div className="text-center mb-3 border-b border-dashed pb-2">
                <div className="fz-label font-bold">Espat Karmchari Co-Operative Credit Society Limited.</div>
                <div className="fz-caption rpv-muted">Avenue A, Sahakari Sadan, Sector-C, AT Post: Bhilai Nagar, Dist: DURG-490006</div>
                <div className="fz-caption font-bold mt-1 uppercase">Print Voucher</div>
              </div>

              {/* Voucher Header Info */}
              <div className="border mb-3 p-3 rpv-box">
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 fz-caption">
                  <div className="flex items-center gap-2">
                    <span className="font-bold rpv-lbl w-24">Date</span>
                    <span className="font-semibold">{date?.format('DD-MMM-YYYY')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold rpv-lbl w-24">Voucher No.</span>
                    <span className="font-bold px-2 py-0.5 rounded">{voucherNo}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold rpv-lbl w-24">Vchr Type</span>
                    <span className="font-bold uppercase">{vchrType}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold rpv-lbl w-24">Mode</span>
                    <span className="font-bold uppercase">{mode}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold rpv-lbl w-24">Member No.</span>
                    <span className="font-semibold">{memberNo || 'N/A'}</span>
                    <span className="font-semibold">{memberName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold rpv-lbl w-24">Narration</span>
                    <span className="font-semibold">{narration || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold rpv-lbl w-24">Cheque No</span>
                    <span className="font-semibold">{chequeNo || '-'}</span>
                  </div>
                  {chequeNo && (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="font-bold rpv-lbl w-24">Bank</span>
                        <span className="font-semibold uppercase">{bank}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold rpv-lbl w-24">Cheque Date</span>
                        <span className="font-semibold">{chequeDate?.format('DD-MMM-YYYY')}</span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center gap-2 col-span-2">
                    <span className="font-bold rpv-lbl w-24"></span>
                    <span className="font-bold rpv-lbl ml-auto">Total Amount</span>
                    <span className="font-bold fz-caption">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Main Table */}
              <div className="border">
                <table className="w-full fz-caption" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className="rpv-box border-b">
                      <th className="text-left py-1.5 px-2 border-r font-bold w-16">Srno</th>
                      <th className="text-left py-1.5 px-2 border-r font-bold">Member No</th>
                      <th className="text-left py-1.5 px-2 border-r font-bold">Member Name</th>
                      <th className="text-left py-1.5 px-2 border-r font-bold">Head</th>
                      <th className="text-left py-1.5 px-2 border-r font-bold">Description</th>
                      <th className="text-right py-1.5 px-2 border-r font-bold w-28">Payment</th>
                      <th className="text-right py-1.5 px-2 font-bold w-28">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-1 px-2 border-r rpv-muted font-semibold text-center">{idx + 1}</td>
                        <td className="py-1 px-2 border-r">{entry.member_no}</td>
                        <td className="py-1 px-2 border-r">{entry.member_name}</td>
                        <td className="py-1 px-2 border-r rpv-val font-bold">{entry.head_code}</td>
                        <td className="py-1 px-2 border-r rpv-val font-semibold uppercase">{entry.head_name}</td>
                        <td className="text-right py-1 px-2 border-r font-semibold">
                          {entry.direction === 'Payment' ? formatCurrency(entry.amount) : ''}
                        </td>
                        <td className="text-right py-1 px-2 rpv-val font-bold">
                          {entry.direction === 'Receipt' ? formatCurrency(entry.amount) : ''}
                        </td>
                      </tr>
                    ))}

                    <tr className="border-b">
                      <td className="py-1 px-2 border-r">&nbsp;</td>
                      <td className="py-1 px-2 border-r"></td>
                      <td className="py-1 px-2 border-r"></td>
                      <td className="py-1 px-2 border-r"></td>
                      <td className="py-1 px-2 border-r"></td>
                      <td className="py-1 px-2 border-r"></td>
                      <td className="py-1 px-2"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Footer bar */}
              <div className="rpv-bar h-16 mt-0 border-x border-b"></div>
            </div>
          </div>
        </section>
      ) : (
        <ReportEmpty icon={<FileText size={34} />} title={isLoading ? 'Loading…' : 'No Voucher Selected'} hint="Select a voucher from the list to preview" />
      )}
    </ReportShell>
  );
};

export default ReceiptPaymentVoucher;
