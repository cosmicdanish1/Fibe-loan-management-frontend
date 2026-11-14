import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Printer, FileDown, User, RotateCcw, BookOpen,
  Calendar, List, 
} from 'lucide-react';
import { DatePicker, Select, message } from 'antd';
import { apiService } from '../../../../../services/api';
import MemberField from '../../../../../components/shared/kit/MemberField';
import { CrDrIndicator } from '@/components/shared/CrDrIndicator';
import dayjs, { Dayjs } from 'dayjs';
import { ReportShell, ParamCard, StatCards, ReportEmpty } from '../../../../../components/reports/views/ReportShell';
import ReportViewSwitcher from '../../../../../components/reports/views/ReportViewSwitcher';
import { useReportViews } from '../../../../../components/reports/views/reportViews';
import '../../../../../components/reports/views/proViews.css';
import { useMlrSpec, ProBento, ProTerm, ProEd } from '../views/mlrPro';

interface LedgerEntry {
  transactionNo: number;
  transactionDate: string;
  voucherNo: string;
  narration: string;
  debit: number;
  credit: number;
  balance: number;
  transactionType: 'DR' | 'CR';
  username?: string;
}

interface LedgerData {
  memberNumber: string;
  memberName: string;
  headCode: string;
  headName: string;
  fromDate: string;
  toDate: string;
  openingBalance: number;
  totalDebits: number;
  totalCredits: number;
  closingBalance: number;
  entries: LedgerEntry[];
  totalTransactions: number;
}

interface HeadOption { code: string; headName: string; transactionCount?: number | undefined; hasData?: boolean | undefined; }

const fmt = (n: number) =>
  Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const balLabel = (n: number) => `${fmt(n)} ${n >= 0 ? 'CR' : 'DR'}`;
const csvCell = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  let text = String(value ?? '');
  if (/^[\t\r ]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => {
  switch (char) {
    case '&': return '&amp;';
    case '<': return '&lt;';
    case '>': return '&gt;';
    case '"': return '&quot;';
    default: return '&#39;';
  }
});
const wrapText = (value: string, width: number) => {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if (!line) {
      for (let offset = 0; offset < word.length; offset += width) {
        const part = word.slice(offset, offset + width);
        if (offset + width < word.length) lines.push(part);
        else line = part;
      }
    } else if (`${line} ${word}`.length <= width) {
      line += ` ${word}`;
    } else {
      lines.push(line);
      line = word;
      while (line.length > width) {
        lines.push(line.slice(0, width));
        line = line.slice(width);
      }
    }
  }
  if (line || lines.length === 0) lines.push(line);
  return lines;
};
// Print-only layout matching the legacy report exactly (letterhead, Head
// Name/Member/Date-range/Opening block, Date/Page Number line, Date/
// Particulars/Voucher No/Debit/Credit/Balance columns, Total Amount row,
// footer notes) — same lines[]-as-single-source-of-truth pattern already
// proven for the other Daily reports' prints. On-screen view is untouched;
// this feeds handlePrint only.
const MLR_LINE_W = 94;
const MLR_DASH = '-'.repeat(MLR_LINE_W);
const MLR_COL_DATE = 12;
const MLR_COL_PART = 22;
const MLR_COL_VCHR = 11;
const MLR_COL_AMT = 15;

const mlrPadL = (s: string, w: number) => s.padStart(w);
const mlrPadR = (s: string, w: number) => (s.length > w ? s.slice(0, w) : s.padEnd(w));
const mlrCenter = (s: string, w: number) => ' '.repeat(Math.max(0, Math.floor((w - s.length) / 2))) + s;

function buildMemberLedgerLines(data: LedgerData): string[] {
  const lines: string[] = [];
  const now = dayjs().format('DD-MMM-YYYY/h:mmA');

  lines.push(mlrCenter('Espat Karmchari Co-Operative Credit Society Limited.', MLR_LINE_W));
  lines.push(mlrCenter('Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006', MLR_LINE_W));
  lines.push(mlrCenter('Ledger Report (Personal)', MLR_LINE_W));
  lines.push('');
  lines.push(`Head Name : ${data.headName}  : CODE : ${data.headCode}`);
  lines.push(MLR_DASH);
  lines.push(`Member Number : ${data.memberNumber}`);
  lines.push(`Name : Mr/Ms ${data.memberName}`);
  lines.push(`From Date : ${dayjs(data.fromDate).format('DD-MMM-YYYY')}  To Date ${dayjs(data.toDate).format('DD-MMM-YYYY')}`);
  lines.push(`Opening Balance : ${balLabel(data.openingBalance)}`);
  const dateStr = `Date : ${now}`;
  const pageStr = 'Page Number :  1';
  lines.push(`${dateStr}${mlrPadL(pageStr, MLR_LINE_W - dateStr.length)}`);
  lines.push(MLR_DASH);

  const amtW = MLR_COL_AMT;
  lines.push(
    `${mlrPadR('Date', MLR_COL_DATE)}${mlrPadR('Particulars', MLR_COL_PART)}${mlrPadR('Voucher No', MLR_COL_VCHR)}` +
    `${mlrPadL('Debit', amtW)}${mlrPadL('Credit', amtW)}${mlrPadL('Balance', amtW)}`
  );
  lines.push(MLR_DASH);

  data.entries.forEach(e => {
    const particulars = wrapText(e.narration || '', MLR_COL_PART);
    lines.push(
      `${mlrPadR(dayjs(e.transactionDate).format('DD-MMM-YYYY'), MLR_COL_DATE)}` +
      `${mlrPadR(particulars[0] ?? '', MLR_COL_PART)}${mlrPadR(e.voucherNo, MLR_COL_VCHR)}` +
      `${mlrPadL(e.debit > 0 ? fmt(e.debit) : '0.00', amtW)}` +
      `${mlrPadL(e.credit > 0 ? fmt(e.credit) : '0.00', amtW)}` +
      `${mlrPadL(balLabel(e.balance), amtW)}`
    );
    particulars.slice(1).forEach(part => lines.push(
      `${' '.repeat(MLR_COL_DATE)}${mlrPadR(part, MLR_COL_PART)}` +
      `${' '.repeat(MLR_COL_VCHR + 3 * amtW)}`
    ));
  });

  lines.push(MLR_DASH);
  lines.push(
    `${mlrPadR('Total Amount', MLR_COL_DATE + MLR_COL_PART + MLR_COL_VCHR)}` +
    `${mlrPadL(fmt(data.totalDebits), amtW)}${mlrPadL(fmt(data.totalCredits), amtW)}${' '.repeat(amtW)}`
  );
  lines.push(MLR_DASH);
  lines.push('');
  lines.push('* Report as per data Available');
  lines.push('* Note   D-Demand   R-Reciept   P-Payment   J- Journal Transfer Entry');
  lines.push(MLR_DASH);

  return lines;
}

const MemberLedgerReport: React.FC = () => {
  const { enabled, view, setView } = useReportViews('member-ledger-report');

  const [headCode, setHeadCode] = useState<string>('');
  const [memberNumber, setMemberNumber] = useState<string>('');
  const [memberName, setMemberName] = useState<string>('');
  const [fromDate, setFromDate] = useState<Dayjs | null>(null);
  const [toDate, setToDate] = useState<Dayjs | null>(null);

  const [headOptions, setHeadOptions] = useState<HeadOption[]>([]);
  const [data, setData] = useState<LedgerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingHeads, setLoadingHeads] = useState(false);
  const [validatingMember, setValidatingMember] = useState(false);
  const loadedMemberNumber = useRef('');
  const memberContextRequest = useRef(0);

  useEffect(() => { loadHeads(); }, []);

  const loadHeads = async () => {
    setLoadingHeads(true);
    try {
      const res = await apiService.getHeadMasters();
      if (!loadedMemberNumber.current && res.success && Array.isArray(res.data)) {
        setHeadOptions(res.data);
      }
    } catch { /* silent */ }
    finally { setLoadingHeads(false); }
  };

  const loadMemberContext = useCallback(async (mbno: string) => {
    const memberNo = mbno.trim();
    if (!memberNo) {
      loadedMemberNumber.current = '';
      setMemberName('');
      return;
    }
    if (loadedMemberNumber.current === memberNo) return;
    const requestId = ++memberContextRequest.current;
    setValidatingMember(true);
    try {
      const res = await apiService.getMemberLedgerContext(memberNo);
      if (requestId !== memberContextRequest.current) return;
      if (res.success && res.data?.exists) {
        setMemberName(res.data.memberName || '');
        setHeadOptions(Array.isArray(res.data.heads) ? res.data.heads : []);
        loadedMemberNumber.current = memberNo;
        setFromDate(res.data.minDate ? dayjs(res.data.minDate) : null);
        setToDate(res.data.maxDate ? dayjs(res.data.maxDate) : null);
        setHeadCode('');
        setData(null);
      } else {
        setMemberName('');
        setHeadOptions(prev => prev.map(head => ({ ...head, hasData: undefined, transactionCount: undefined })));
        loadedMemberNumber.current = '';
        setFromDate(null);
        setToDate(null);
        setHeadCode('');
        setData(null);
        message.warning('Member number was not found.');
      }
    } catch {
      if (requestId === memberContextRequest.current) {
        setMemberName('');
        message.error('Could not load this member’s account-head activity. Please try again.');
      }
    }
    finally {
      if (requestId === memberContextRequest.current) setValidatingMember(false);
    }
  }, []);

  const handleMemberNumberChange = (value: string) => {
    memberContextRequest.current += 1;
    loadedMemberNumber.current = '';
    setMemberNumber(value);
    setMemberName('');
    setHeadCode('');
    setFromDate(null);
    setToDate(null);
    setHeadOptions(prev => prev.map(head => ({ ...head, hasData: undefined, transactionCount: undefined })));
    setData(null);
  };


  const handleMemberSelect = (member: { memberNo: string; memberName?: string; name?: string }) => {
    handleMemberNumberChange(member.memberNo);
    if (member.memberName || member.name) setMemberName(member.memberName || member.name || '');
    loadMemberContext(member.memberNo);
  };

  const generateReport = async () => {
    if (!headCode || !memberNumber.trim() || !fromDate || !toDate) return;
    if (fromDate.isAfter(toDate, 'day')) {
      setData(null);
      message.error('From date must be on or before the To date.');
      return;
    }
    setData(null);
    setLoading(true);
    try {
      const res = await apiService.getMemberLedgerReport({
        memberNumber: memberNumber.trim(),
        headCode,
        fromDate: fromDate.format('YYYY-MM-DD'),
        toDate: toDate.format('YYYY-MM-DD'),
      });
      if (res.success && res.data) {
        setData(res.data);
        if (res.data.memberName) setMemberName(res.data.memberName);
      } else {
        setData(null);
        if (!res.success) message.error(res.message || res.error || 'Failed to generate the ledger report.');
      }
    } catch { setData(null); message.error('Failed to generate the ledger report.'); }
    finally { setLoading(false); }
  };

  const handleReset = () => {
    setHeadCode(''); setMemberNumber(''); setMemberName('');
    loadedMemberNumber.current = '';
    memberContextRequest.current += 1;
    setFromDate(null); setToDate(null);
    setHeadOptions(prev => prev.map(head => ({ ...head, hasData: undefined, transactionCount: undefined })));
    setData(null);
  };

  const handlePrint = () => {
    if (!data) return;
    // window.open() used to be used here, but this app's Electron main
    // process globally intercepts every window.open() call
    // (mainWindow.webContents.setWindowOpenHandler in main.ts) and denies
    // it, redirecting to shell.openExternal(url) instead — with the empty
    // URL this call passes, that meant Windows trying (and failing) to
    // open "about:blank" as an external link, confirmed live on the
    // identical pattern in Consolidation Of Daily A/c. Print silently did
    // nothing. Switched to the same hidden-iframe + monospace lines[]
    // technique already proven working for every other report's print
    // this session — it never goes through window.open() at all, and
    // matches the legacy report's exact printed layout (user-supplied
    // reference screenshot).
    const lines = buildMemberLedgerLines(data);
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><title>Member Ledger</title>
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
    const headers = [
      'Report', 'Member Number', 'Member Name', 'Account Head Code', 'Account Head Name',
      'From Date', 'To Date', 'Row Type', 'Transaction Date', 'Transaction No',
      'Voucher No', 'Particulars', 'Transaction Type', 'Payment', 'Receipt',
      'Running Balance', 'Balance Side', 'Opening Balance', 'Total Payments',
      'Total Receipts', 'Closing Balance', 'Transaction Count', 'User',
    ];
    const rows: unknown[][] = [headers];
    const context = [
      'Member Ledger Report (Personal)', data.memberNumber, data.memberName,
      data.headCode, data.headName, data.fromDate, data.toDate,
    ];
    const totals = [data.openingBalance, data.totalDebits, data.totalCredits, data.closingBalance, data.totalTransactions];
    const appendRow = (entry?: LedgerEntry) => rows.push([
      ...context,
      entry ? 'Transaction' : 'Summary',
      entry ? dayjs(entry.transactionDate).format('YYYY-MM-DD') : '',
      entry?.transactionNo ?? '', entry?.voucherNo ?? '', entry?.narration ?? '', entry?.transactionType ?? '',
      entry ? entry.debit : '', entry ? entry.credit : '', entry?.balance ?? '',
      entry ? (entry.balance >= 0 ? 'CR' : 'DR') : '',
      ...totals, entry?.username ?? '',
    ]);
    if (data.entries.length) data.entries.forEach(appendRow);
    else appendRow();
    const csv = `\uFEFF${rows.map(row => row.map(csvCell).join(',')).join('\r\n')}`;
    const a = document.createElement('a');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.href = url;
    a.download = `MemberLedger_${memberNumber}_${headCode}_${fromDate?.format('YYYY-MM-DD')}_${toDate?.format('YYYY-MM-DD')}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };


  const entries = data?.entries ?? [];
  const spec = useMlrSpec(entries, `${memberNumber} ${memberName}`.trim(), data?.openingBalance ?? 0, data?.closingBalance ?? 0, data?.totalDebits ?? 0, data?.totalCredits ?? 0);
  const hasData = !!data && entries.length > 0;
  const period = `${fromDate?.format('DD-MMM-YYYY') ?? ''} to ${toDate?.format('DD-MMM-YYYY') ?? ''}`;

  return (
    <ReportShell
      className="mlr-page"
      title="Member Ledger"
      desc="Ledger report (personal account)"
      switcher={<ReportViewSwitcher enabled={enabled} value={view} onChange={setView} />}
      actions={
        <>
          <button type="button" className="aw-btn aw-btn-ghost" onClick={handleReset}><RotateCcw size={14} /> Reset</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handleExportCSV} disabled={!data}><FileDown size={14} /> CSV</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handlePrint} disabled={!data}><Printer size={14} /> Print</button>
        </>
      }
      asideWidth={250}
      aside={
        <>
          <ParamCard title="Member" icon={<User size={14} />}>
            <div>
              <label className="aw-label" htmlFor="mlr-member">Member no</label>
              <MemberField id="mlr-member" value={memberNumber} onChange={handleMemberNumberChange} onSelect={handleMemberSelect} onSubmit={v => loadMemberContext(v)} />
              {validatingMember && <span className="aw-meta">Checking member…</span>}
              {memberName && <span className="aw-meta">{memberName}</span>}
            </div>
          </ParamCard>
          <ParamCard title="Account head" icon={<List size={14} />}>
            <Select
              className="aw-select" popupClassName="aw-select-popup"
              placeholder="Select head"
              aria-label="Account head"
              {...(headCode ? { value: headCode } : {})}
              onChange={setHeadCode}
              loading={loadingHeads}
              optionRender={(option) => {
                const h = option.data as HeadOption;
                const isInactive = h.hasData === false;
                return (
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, opacity: isInactive ? 0.5 : 1 }}>
                    <span>{h.code} - {h.headName}</span>
                    {h.hasData !== undefined && <span className="aw-meta">{isInactive ? 'No activity' : `${h.transactionCount} entries`}</span>}
                  </div>
                );
              }}
              showSearch
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={[...headOptions]
                .sort((a, b) => Number(b.hasData === true) - Number(a.hasData === true))
                .map(h => ({ ...h, value: h.code, label: `${h.code} - ${h.headName}` }))}
            />
          </ParamCard>
          <ParamCard title="Date range" icon={<Calendar size={14} />}>
            <div>
              <label className="aw-label" htmlFor="mlr-from">From</label>
              <DatePicker id="mlr-from" className="aw-picker" popupClassName="aw-select-popup" style={{ width: '100%' }} value={fromDate} onChange={v => setFromDate(v)} format="DD-MMM-YYYY" />
            </div>
            <div>
              <label className="aw-label" htmlFor="mlr-to">To</label>
              <DatePicker id="mlr-to" className="aw-picker" popupClassName="aw-select-popup" style={{ width: '100%' }} value={toDate} onChange={v => setToDate(v)} format="DD-MMM-YYYY" />
            </div>
            <button type="button" className="aw-btn aw-btn-primary" onClick={generateReport} disabled={loading} style={{ width: '100%' }}>
              <Search size={14} className={loading ? 'aw-spin' : undefined} /> {loading ? 'Loading…' : 'Generate'}
            </button>
          </ParamCard>
          {data && <StatCards items={[
            { label: 'Opening', value: balLabel(data.openingBalance), tone: 'muted' },
            { label: 'Total payment', value: fmt(data.totalDebits), tone: 'danger' },
            { label: 'Total receipt', value: fmt(data.totalCredits), tone: 'success' },
            { label: 'Closing', value: balLabel(data.closingBalance), tone: 'info' },
            { label: 'Entries', value: String(data.totalTransactions), tone: 'muted' },
          ]} />}
        </>
      }
      footerLeft="Member Ledger · Personal Account"
      footerRight={hasData ? `${memberNumber} · ${period}` : 'Select member, head and period'}
    >
      {hasData && view === 'bento' && <ProBento spec={spec} />}
      {hasData && view === 'terminal' && <div style={{ height: 'calc(100vh - 150px)', minHeight: 360 }}><ProTerm spec={spec} /></div>}
      {hasData && view === 'editorial' && <ProEd spec={spec} subtitle={`${memberNumber} · ${data?.headName ?? ''} · ${period}`} />}

      {view === 'legacy' && (
        <section className="aw-card mlr-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="aw-main-head">
            <span className="aw-card-title">Ledger Report (Personal)</span>
            <span className="aw-meta">{period}{data ? ` · ${data.totalTransactions} entries` : ''}</span>
          </div>
          <div className="mlr-preview-body" style={{ padding: 'var(--aw-pad)', overflow: 'auto' }}>
              {data && data.entries.length > 0 ? (
                  <div id="ledger-print-area" className="font-mono">
                    <div className="aw-stack" style={{ textAlign: 'center', gap: 2, marginBottom: 12 }}>
                      <div className="aw-strong">Espat Karmchari Co-Operative Credit Society Limited.</div>
                      <div className="aw-meta">Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006</div>
                      <div className="aw-strong">Ledger Report (Personal)</div>
                    </div>

                    <div className="aw-meta aw-stack" style={{ gap: 2, marginBottom: 10 }}>
                      <div>Head Name : <b>{data.headName}</b> :CODE :{data.headCode}</div>
                      <div>Member Number : <b>{data.memberNumber}</b></div>
                      <div>Name : <b>Mr/Ms {data.memberName}</b></div>
                      <div>Report From Date <b>{dayjs(data.fromDate).format('DD-MMM-YYYY')}</b> To Date <b>{dayjs(data.toDate).format('DD-MMM-YYYY')}</b></div>
                      <div>Opening Balance : <b>{balLabel(data.openingBalance)}</b></div>
                    </div>

                    <div className="aw-table-wrap" style={{ maxHeight: 'none' }}>
                      <table className="aw-table">
                        <thead>
                          <tr>
                            <th>Date</th><th>Particulars</th><th>Voucher no</th>
                            <th className="is-right">Payment</th><th className="is-right">Receipt</th><th className="is-right">Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.entries.map((e, i) => (
                            <tr key={i}>
                              <td className="is-muted">{dayjs(e.transactionDate).format('DD-MMM-YYYY')}</td>
                              <td>{e.narration}</td>
                              <td>{e.voucherNo}</td>
                              <td className="is-right" style={{ color: 'var(--aw-danger)' }}>{e.debit > 0 ? (<><CrDrIndicator type="debit" className="mr-1" />{fmt(e.debit)}</>) : ''}</td>
                              <td className="is-right is-success">{e.credit > 0 ? (<><CrDrIndicator type="credit" className="mr-1" />{fmt(e.credit)}</>) : ''}</td>
                              <td className="is-right is-accent">{balLabel(e.balance)}</td>
                            </tr>
                          ))}
                          <tr>
                            <td colSpan={3}><b>Total Amount :-</b></td>
                            <td className="is-right"><b>{fmt(data.totalDebits)}</b></td>
                            <td className="is-right"><b>{fmt(data.totalCredits)}</b></td>
                            <td />
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="aw-meta aw-stack" style={{ gap: 2, marginTop: 10 }}>
                      <div>* Report As Per Data Available ..</div>
                      <div>* Note&nbsp;&nbsp; D-Demand&nbsp;&nbsp; R-Receipt&nbsp;&nbsp; P-Payment&nbsp;&nbsp; J-Jouneral Transfer Entry</div>
                    </div>
                  </div>
              ) : !loading ? (
                <ReportEmpty icon={<BookOpen size={34} />} title={!headCode || !memberNumber ? 'Select member, head code and date range' : 'No transactions found'} {...(memberName ? { hint: memberName } : {})} />
              ) : null}
          </div>
        </section>
      )}
      {view !== 'legacy' && !hasData && (
        <ReportEmpty icon={<BookOpen size={34} />} title={loading ? 'Loading…' : !headCode || !memberNumber ? 'Select member, head code and date range' : 'No transactions found'} />
      )}
    </ReportShell>
  );
};

export default MemberLedgerReport;
