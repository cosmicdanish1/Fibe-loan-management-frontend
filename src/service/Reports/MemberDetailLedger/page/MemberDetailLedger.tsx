import React, { useState, useCallback, useRef } from 'react';
import { FileText, Search, Printer, User, RotateCcw } from 'lucide-react';
import { message } from 'antd';
import { apiService } from '../../../../services/api';
import dayjs, { Dayjs } from 'dayjs';
import MemberField from '../../../../components/shared/kit/MemberField';
import { renderCrDrText } from '../../../../components/shared/CrDrIndicator';
import { isFromAfterTo } from '@/utils/dates';
import { ReportShell, ParamCard, OutputChoice, ReportEmpty } from '../../../../components/reports/views/ReportShell';
import ReportViewSwitcher from '../../../../components/reports/views/ReportViewSwitcher';
import { GenericBento, GenericEditorial, GenericTerminal } from '../../../../components/reports/views/GenericPro';
import { useReportViews } from '../../../../components/reports/views/reportViews';
import { useDetailLedgerSpec } from '../views/detailPro';

// ── layout constants ─────────────────────────────────────────────────────────
const W_DATE    = 14;
const W_RECNO   = 10;
const W_PAYMENT = 14;
const W_RECEIPT = 14;
const W_BAL     = 15;
const SEP_W     = W_DATE + W_RECNO + W_PAYMENT + W_RECEIPT + W_BAL; // 67
const SEP       = '-'.repeat(SEP_W);
const SUB_SEP   = ' '.repeat(W_DATE + W_RECNO) + '-'.repeat(W_PAYMENT + W_RECEIPT);
const SUB_DSEQ  = ' '.repeat(W_DATE + W_RECNO) + '='.repeat(W_PAYMENT + W_RECEIPT);

// ── response types ───────────────────────────────────────────────────────────
interface DetailEntry {
  date: string | Date;
  accountHead: string;
  voucherNo: string;
  particulars: string;
  debit: number;
  credit: number;
  code: string;
  balance?: number;
}
interface DetailLedger {
  memberNumber: string;
  memberName: string;
  officeNo: string;
  officeName: string;
  fromDate: string;
  toDate: string;
  openingByCode: Record<string, number>;
  entries: DetailEntry[];
}

// ── formatters ───────────────────────────────────────────────────────────────
const centre = (s: string, w = SEP_W) =>
  s.length >= w ? s : ' '.repeat(Math.floor((w - s.length) / 2)) + s;

const fmtDate = (d: string | Date) => {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dd = d instanceof Date ? d : new Date(d);
  return `${String(dd.getDate()).padStart(2,'0')}-${months[dd.getMonth()]}-${dd.getFullYear()}`;
};

const fmtAmt = (n: number) =>
  n === 0 ? '' : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtAmtFixed = (n: number) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtBal = (n: number) => {
  const abs = Math.abs(n);
  return abs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
    (n >= 0 ? ' CR' : ' DR');
};

// ── report builder ───────────────────────────────────────────────────────────
const buildReportText = (data: DetailLedger, now: Date): string => {
  const nowStr = dayjs(now).format('DD-MMM-YYYY/ h:mmA');
  const fromStr = dayjs(data.fromDate).format('DD-MMM-YYYY');
  const toStr   = dayjs(data.toDate).format('DD-MMM-YYYY');

  const lines: string[] = [
    centre('Espat Karmchari Co-Operative Credit Society Limited.'),
    centre('Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006'),
    'Reg No: A.R/DRG/1796'.padEnd(SEP_W - 'Tel No: 0788-2298736'.length) + 'Tel No: 0788-2298736',
    '',
    centre('MEMBER DETAIL LEDGER'),
    '',
    `Office :- [${data.officeNo || ''}]${data.officeName || ''}`,
    SEP,
    `Member   :- [${data.memberNumber} ]${data.memberName}    As on Date:${nowStr}`,
    `From Date:- ${fromStr}  To Date:- ${toStr}          Page No :1`,
    SEP,
    '    Date'.padEnd(W_DATE) + 'RecNo'.padEnd(W_RECNO) +
      'Payment'.padStart(W_PAYMENT) + 'Receipt'.padStart(W_RECEIPT) + 'Balance'.padStart(W_BAL),
    SEP,
  ];

  // Group entries by code, preserving insertion order
  const codeOrder: string[] = [];
  const byCode: Record<string, DetailEntry[]> = {};
  for (const e of data.entries) {
    if (!byCode[e.code]) { byCode[e.code] = []; codeOrder.push(e.code); }
    byCode[e.code]!.push(e);
  }

  for (const code of codeOrder) {
    const group  = byCode[code] ?? [];
    if (group.length === 0) continue;
    const head   = group[0]!.accountHead;
    const opening = data.openingByCode?.[code] ?? 0;

    lines.push(`${code}-${head}`);
    lines.push(`Opening Balance :- ${fmtBal(opening)}`);
    lines.push(SEP);

    let running = opening;
    let totalPay = 0;
    let totalRec = 0;

    for (const e of group) {
      running  = typeof e.balance === 'number' ? e.balance : running + e.credit - e.debit;
      totalPay += e.debit;
      totalRec += e.credit;

      lines.push(
        fmtDate(e.date).padEnd(W_DATE) +
        (e.voucherNo || '').substring(0, W_RECNO - 1).padEnd(W_RECNO) +
        (e.debit  > 0 ? fmtAmt(e.debit)  : '').padStart(W_PAYMENT) +
        (e.credit > 0 ? fmtAmt(e.credit) : '').padStart(W_RECEIPT) +
        fmtBal(running).padStart(W_BAL),
      );
    }

    lines.push(SUB_SEP);
    lines.push(
      ''.padEnd(W_DATE) +
      'Total : -'.padEnd(W_RECNO) +
      fmtAmtFixed(totalPay).padStart(W_PAYMENT) +
      fmtAmtFixed(totalRec).padStart(W_RECEIPT),
    );
    lines.push(SUB_DSEQ);
  }

  if (codeOrder.length === 0) {
    lines.push('');
    lines.push(centre('No transactions found for this period.'));
    lines.push('');
  }

  lines.push('');
  lines.push('Report As Per Data Available....');

  return lines.join('\n');
};

// ── print helper ─────────────────────────────────────────────────────────────
const printReportText = (text: string) => {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(`<!DOCTYPE html><html><head>
      <title>Member Detail Ledger</title>
      <style>
        @page { size: portrait; margin: 8mm; }
        body { font-family: 'Courier New', Courier, monospace; font-size: 10px; margin: 0; }
        pre  { white-space: pre; font-family: inherit; font-size: inherit; }
      </style>
    </head><body><pre>${text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre></body></html>`);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 400);
  }
};

// ── component ────────────────────────────────────────────────────────────────
const MemberDetailLedger: React.FC = () => {
  const [memberNo,   setMemberNo]   = useState('');
  const [memberName, setMemberName] = useState('');
  const [fromDate,   setFromDate]   = useState<Dayjs>(dayjs().startOf('month'));
  const [toDate,     setToDate]     = useState<Dayjs>(dayjs());
  const [outputType, setOutputType] = useState('screen');
  const [reportText, setReportText] = useState('');
  const [isLoading,  setIsLoading]  = useState(false);
  const [detail,     setDetail]     = useState<DetailLedger | null>(null);
  const reportTextRef = useRef('');

  const handleMemberSelect = useCallback((member: any) => {
    setMemberNo(member.memberNo || member.mbno || '');
    setMemberName(member.memberName || member.name || '');
  }, []);

  const handleReset = useCallback(() => {
    setMemberNo('');
    setMemberName('');
    setFromDate(dayjs().startOf('month'));
    setToDate(dayjs());
    setOutputType('screen');
    setReportText('');
    setDetail(null);
    reportTextRef.current = '';
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!memberNo) { message.warning('Please enter a Member Number'); return; }
    if (!fromDate || !toDate) { message.warning('Please select a date range'); return; }

    if (fromDate && toDate && isFromAfterTo(fromDate.format('YYYY-MM-DD'), toDate.format('YYYY-MM-DD'))) {
      message.warning('From date cannot be after To date');
      return;
    }
    setIsLoading(true);
    try {
      const response = await (apiService as any).getMemberDetailLedgerReport({
        memberNumber: memberNo,
        fromDate: fromDate.format('YYYY-MM-DD'),
        toDate:   toDate.format('YYYY-MM-DD'),
      });

      if (response.success && response.data) {
        const data: DetailLedger = response.data;
        if (data.memberName) setMemberName(data.memberName);
        setDetail(data);

        const text = buildReportText(data, new Date());
        reportTextRef.current = text;
        setReportText(text);

        if (!data.entries || data.entries.length === 0) {
          message.info('No transactions found for this member in the selected date range');
        }
        if (outputType === 'printer') {
          printReportText(text);
        }
      } else {
        setReportText('');
        setDetail(null);
        reportTextRef.current = '';
        message.error(response.error || response.message || 'Failed to generate report');
      }
    } catch (err) {
      console.error('[MemberDetailLedger] Error:', err);
      message.error('Failed to generate report');
      setReportText('');
      setDetail(null);
      reportTextRef.current = '';
    } finally {
      setIsLoading(false);
    }
  }, [memberNo, fromDate, toDate, outputType]);

  const handlePrint = useCallback(() => {
    if (!reportTextRef.current) return;
    printReportText(reportTextRef.current);
  }, []);

  const { enabled, view, setView } = useReportViews('member-detail-ledger');
  const spec = useDetailLedgerSpec(detail);

  const range = `${fromDate.format('DD-MMM-YYYY')} to ${toDate.format('DD-MMM-YYYY')}`;
  const hasEntries = !!detail && detail.entries.length > 0;

  return (
    <ReportShell
      className="mdl-page aw-calm"
      title="Member Detail Ledger"
      desc="Per-account transaction ledger for a member"
      switcher={<ReportViewSwitcher enabled={enabled} value={view} onChange={setView} />}
      actions={
        <>
          <button type="button" className="aw-btn aw-btn-ghost" onClick={handleReset}><RotateCcw size={14} /> Reset</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handlePrint} disabled={!reportText}><Printer size={14} /> Print</button>
        </>
      }
      aside={
        <ParamCard title="Ledger" icon={<User size={14} />}>
          <div>
            <label className="aw-label" htmlFor="mdl-member">Member No.</label>
            <MemberField id="mdl-member" value={memberNo} onChange={setMemberNo} onSelect={handleMemberSelect} onSubmit={() => handleGenerate()} />
          </div>
          <input className="aw-input" value={memberName} readOnly placeholder="Member name" aria-label="Member name" />
          <div>
            <label className="aw-label" htmlFor="mdl-from">From date</label>
            <input id="mdl-from" type="date" className="aw-input" value={fromDate.format('YYYY-MM-DD')} onChange={e => e.target.value && setFromDate(dayjs(e.target.value))} />
          </div>
          <div>
            <label className="aw-label" htmlFor="mdl-to">To date</label>
            <input id="mdl-to" type="date" className="aw-input" value={toDate.format('YYYY-MM-DD')} onChange={e => e.target.value && setToDate(dayjs(e.target.value))} />
          </div>
          <OutputChoice value={outputType === 'printer' ? 'printer' : 'screen'} onChange={setOutputType} id="mdl-output" />
          <button type="button" className="aw-btn aw-btn-primary" onClick={() => handleGenerate()} disabled={isLoading} style={{ width: '100%' }}>
            <Search size={14} className={isLoading ? 'aw-spin' : undefined} /> {isLoading ? 'Loading…' : 'Generate'}
          </button>
        </ParamCard>
      }
      footerLeft="Member Detail Ledger"
      footerRight={memberNo ? `Member ${memberNo} · ${range}` : range}
    >
      {hasEntries && view === 'bento' && <GenericBento spec={spec} />}
      {hasEntries && view === 'terminal' && <div style={{ height: 'calc(100vh - 150px)', minHeight: 360 }}><GenericTerminal spec={spec} /></div>}
      {hasEntries && view === 'editorial' && <GenericEditorial spec={spec} title="Member Detail Ledger" subtitle={`${memberNo} · ${range}`} />}
      {reportText && view !== 'legacy' && !hasEntries && <p className="aw-meta" style={{ padding: 12 }}>No entries to show</p>}

      {reportText && view === 'legacy' && (
        <section className="aw-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="aw-main-head">
            <span className="aw-card-title">Detail Ledger — Member: {memberNo || 'N/A'}</span>
            <span className="aw-meta">{range}</span>
          </div>
          <div style={{ padding: 'var(--aw-pad)', overflow: 'auto', minHeight: 160 }}>
            <pre className="font-mono fz-caption select-text" style={{ margin: 0, whiteSpace: 'pre', lineHeight: 1.5, color: 'var(--aw-text)' }}>{renderCrDrText(reportText)}</pre>
          </div>
        </section>
      )}
      {!reportText && (
        <ReportEmpty icon={<FileText size={34} />} title={isLoading ? 'Loading…' : 'No Data'} hint="Select a member and click Generate" />
      )}
    </ReportShell>
  );
};

export default MemberDetailLedger;
