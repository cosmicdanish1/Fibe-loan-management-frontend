import React, { useState, useCallback, useMemo } from 'react';
import { FileText, Search, Printer, FileDown, User, RotateCcw, Calendar } from 'lucide-react';
import { message } from 'antd';
import { apiService } from '../../../../../services/api';
import dayjs, { Dayjs } from 'dayjs';
import MemberField from '../../../../../components/shared/kit/MemberField';
import { csvCell } from '@/utils/csv';
import { ReportShell, ParamCard, StatCards, OutputChoice, ReportEmpty, LegacyDocument } from '../../../../../components/reports/views/ReportShell';
import ReportViewSwitcher from '../../../../../components/reports/views/ReportViewSwitcher';
import { GenericBento, GenericEditorial, GenericTerminal } from '../../../../../components/reports/views/GenericPro';
import { useReportViews } from '../../../../../components/reports/views/reportViews';
import '../../../../../components/reports/views/proViews.css';
import { useMemStmtSpec } from '../views/memStmtPro';

// ── types ─────────────────────────────────────────────────────────────────────
interface SummaryItem { headCode: string; headName: string; balance: number; }
interface MemberStatementData {
  transactions?: any[];
  summary?: SummaryItem[];
  memberName?: string;
}

// ── monospace report constants ────────────────────────────────────────────────
const REPORT_W = 82;
const W_LABEL  = 22;
const W_AMT    = 10;
const COL_GAP  = 4;
const SEP      = '-'.repeat(REPORT_W);

const SOCIETY = {
  name:    'Espat Karmchari Co-Operative Credit Society Limited.',
  address: 'Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006',
  regNo:   'A.R/DRG/1796',
};

const centre = (s: string) => {
  const pad = Math.max(0, REPORT_W - s.length);
  return ' '.repeat(Math.floor(pad / 2)) + s;
};

const fmtAmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

// Loans are on the Payment side; deposits/savings on the Receipt side
const isPayment = (item: SummaryItem) =>
  (item.headCode?.startsWith('A') ?? false) || /loan/i.test(item.headName);

// Derive per-head balances from the ledger transactions returned by the backend
// (asset heads 'A...' e.g. loans: DR - CR; other heads: CR - DR; 'I...' interest/income heads are not balances)
const deriveSummary = (transactions: any[]): SummaryItem[] => {
  const map = new Map<string, number>();
  for (const t of transactions || []) {
    const code = String(t.code || '').trim();
    // Show every head exactly as it sits in the ledger (decision on ES-73): no heads are hidden.
    if (!code) continue;
    const amt = Number(t.amount) || 0;
    const isDr = String(t.type || '').toUpperCase().startsWith('D');
    const signed = code.toUpperCase().startsWith('A') ? (isDr ? amt : -amt) : (isDr ? -amt : amt);
    map.set(code, (map.get(code) || 0) + signed);
  }
  return Array.from(map.entries())
    .map(([headCode, balance]) => ({ headCode, headName: headCode, balance: Math.round(balance * 100) / 100 }))
    .filter(s => s.balance !== 0);
};

const buildReportText = (
  summary: SummaryItem[],
  memberName: string,
  asOnDate: string,
): string => {
  const receipts = summary.filter(s => !isPayment(s));
  const payments = summary.filter(s => isPayment(s));

  const halfW = Math.floor(REPORT_W / 2);
  const rcptHdr = 'Receipt'.padStart(Math.floor((halfW + 7) / 2)).padEnd(halfW);
  const pmtHdr  = 'Payment'.padStart(Math.floor((halfW + 7) / 2));

  const lines: string[] = [
    centre(SOCIETY.name),
    centre(SOCIETY.address),
    centre(SOCIETY.regNo),
    '',
    centre('MEMBER  STATEMENT'),
    '',
    `Mr./Smt. ${memberName}`,
    '',
    `This is to Inform You that Your Account Details As On Date ${dayjs(asOnDate).format('DD-MMM-YYYY')}`,
    'are as Under. Please return receipt copy after signing it.',
    '',
    SEP,
    rcptHdr + pmtHdr,
    SEP,
  ];

  const maxRows = Math.max(receipts.length, payments.length);
  for (let i = 0; i < maxRows; i++) {
    const r = receipts[i];
    const p = payments[i];
    const left = r
      ? (r.headName || '').substring(0, W_LABEL).padEnd(W_LABEL) + '  ' + fmtAmt(r.balance).padStart(W_AMT)
      : ' '.repeat(W_LABEL + 2 + W_AMT);
    const right = p
      ? ' '.repeat(COL_GAP) + (p.headName || '').substring(0, W_LABEL).padEnd(W_LABEL) + '  ' + fmtAmt(p.balance).padStart(W_AMT)
      : '';
    lines.push(left + right);
  }

  const totalR = receipts.reduce((s, r) => s + (r.balance || 0), 0);
  const totalP = payments.reduce((s, p) => s + (p.balance || 0), 0);
  const leftTotal  = 'Total'.padEnd(W_LABEL) + '  ' + fmtAmt(totalR).padStart(W_AMT);
  const rightTotal = ' '.repeat(COL_GAP) + ' '.repeat(W_LABEL) + '  ' + fmtAmt(totalP).padStart(W_AMT);

  lines.push(SEP);
  lines.push(leftTotal + rightTotal);
  lines.push(SEP);
  lines.push('');
  lines.push('');

  const footer = 'Date :';
  const sign   = 'Secretary';
  lines.push(footer + ' '.repeat(REPORT_W - footer.length - sign.length) + sign);

  return lines.join('\n');
};

// ── iframe print ──────────────────────────────────────────────────────────────
const printReportText = (text: string) => {
  const safe = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><title>Member Statement</title>
      <style>
        @page { size: portrait; margin: 10mm; }
        body { font-family: 'Courier New', Courier, monospace; font-size: 10px; margin: 0; color: #000; }
        pre  { white-space: pre; font-family: inherit; font-size: inherit; }
      </style>
    </head><body><pre>${safe}</pre></body></html>`);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 400);
  }
};

// ── component ─────────────────────────────────────────────────────────────────
const MemberStatement: React.FC = () => {
  const [memberNo,    setMemberNo]    = useState('');
  const [memberName,  setMemberName]  = useState('');
  const [asOnDate,    setAsOnDate]    = useState<Dayjs>(dayjs());
  const [outputType,  setOutputType]  = useState<'screen' | 'printer'>('screen');
  const [loading,     setLoading]     = useState(false);
  const [summaryData, setSummaryData] = useState<SummaryItem[]>([]);

  const handleMemberSelect = useCallback((member: any) => {
    setMemberNo(member.memberNo || member.mbno || '');
    setMemberName(member.memberName || member.name || '');
  }, []);

  const handleReset = useCallback(() => {
    setMemberNo('');
    setMemberName('');
    setAsOnDate(dayjs());
    setSummaryData([]);
    setOutputType('screen');
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!memberNo) { message.warning('Please enter a Member Number'); return; }
    setLoading(true);
    try {
      const response = await apiService.getMemberStatement({
        memberNo,
        fromDate: '2000-01-01',
        toDate: asOnDate.format('YYYY-MM-DD'),
      });
      if (!response.success) {
        setSummaryData([]);
        message.error(response.message || response.error || 'Failed to generate statement');
        return;
      }
      const data: MemberStatementData | null = response.data;
      if (data) {
        const summary = data.summary || deriveSummary(data.transactions || []);
        setSummaryData(summary);
        if (data.memberName) setMemberName(data.memberName);

        if (summary.length === 0) {
          message.info('No records found');
          return;
        }

        if (outputType === 'printer') {
          const name = data.memberName || memberName;
          printReportText(buildReportText(summary, name, asOnDate.format('YYYY-MM-DD')));
        }
      } else {
        setSummaryData([]);
        message.warning('Member not found or no data returned');
      }
    } catch (err) {
      console.error('[MemberStatement]', err);
      message.error('Failed to generate statement');
    } finally {
      setLoading(false);
    }
  }, [memberNo, memberName, asOnDate, outputType]);

  const reportText = useMemo(
    () => summaryData.length > 0
      ? buildReportText(summaryData, memberName, asOnDate.format('YYYY-MM-DD'))
      : '',
    [summaryData, memberName, asOnDate],
  );

  const handlePrint = useCallback(() => {
    if (reportText) printReportText(reportText);
  }, [reportText]);

  const handleExportCSV = useCallback(() => {
    if (summaryData.length === 0) { message.warning('No data to export'); return; }
    const rows = [
      '"Account Type","Balance"',
      ...summaryData.map(s => `${csvCell(s.headName)},${csvCell(s.balance.toFixed(2))}`),
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `MemberStatement_${memberNo}_${dayjs().format('YYYYMMDD')}.csv`;
    link.click();
    message.success('CSV exported');
  }, [summaryData, memberNo]);

  const { enabled, view, setView } = useReportViews('member-statement');
  const spec = useMemStmtSpec(summaryData, `${memberNo} ${memberName}`.trim(), asOnDate.format('DD MMM YYYY'));

  const hasData = summaryData.length > 0;
  const asOn = asOnDate.format('DD MMM YYYY');

  return (
    <ReportShell
      className="memstmt-page aw-calm"
      title="Member Statement"
      desc="Account summary of a member"
      switcher={<ReportViewSwitcher enabled={enabled} value={view} onChange={setView} />}
      actions={
        <>
          <button type="button" className="aw-btn aw-btn-ghost" onClick={handleReset}><RotateCcw size={14} /> Reset</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handleExportCSV} disabled={!reportText}><FileDown size={14} /> CSV</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handlePrint} disabled={!reportText}><Printer size={14} /> Print</button>
        </>
      }
      aside={
        <>
          <ParamCard title="Member" icon={<User size={14} />}>
            <div>
              <label className="aw-label" htmlFor="ms-member">Member No.</label>
              <MemberField id="ms-member" value={memberNo} onChange={setMemberNo} onSelect={handleMemberSelect} onSubmit={() => handleGenerate()} />
            </div>
            <input className="aw-input" value={memberName} readOnly placeholder="Selected member name" aria-label="Member name" />
            <div>
              <label className="aw-label" htmlFor="ms-date"><Calendar size={11} style={{ marginRight: 4, verticalAlign: -1 }} />As on date</label>
              <input id="ms-date" type="date" className="aw-input" value={asOnDate.format('YYYY-MM-DD')} onChange={e => e.target.value && setAsOnDate(dayjs(e.target.value))} />
            </div>
            <OutputChoice value={outputType} onChange={setOutputType} id="ms-output" />
            <button type="button" className="aw-btn aw-btn-primary" onClick={() => handleGenerate()} disabled={loading} style={{ width: '100%' }}>
              <Search size={14} className={loading ? 'aw-spin' : undefined} /> {loading ? 'Loading…' : 'Generate'}
            </button>
          </ParamCard>
          {hasData && <StatCards items={[{ label: 'Account types', value: String(summaryData.length), tone: 'muted' }]} />}
        </>
      }
      footerLeft="Member Statement"
      footerRight={memberNo ? `Member ${memberNo} · as on ${asOn}` : ''}
    >
      {hasData && view === 'bento' && <GenericBento spec={spec} />}
      {hasData && view === 'terminal' && <div style={{ height: 'calc(100vh - 150px)', minHeight: 360 }}><GenericTerminal spec={spec} /></div>}
      {hasData && view === 'editorial' && <GenericEditorial spec={spec} title="Member Statement" subtitle={`${memberNo} · as on ${asOn}`} />}

      {view === 'legacy' && (
        <LegacyDocument
          title={`Member Statement${memberNo ? ` · Member ${memberNo}` : ''}`}
          meta={`As on ${asOn}`}
          text={reportText}
          loading={loading}
          small
          empty={<ReportEmpty icon={<FileText size={34} />} title="No Data" hint="Enter member and generate" />}
        />
      )}
      {view !== 'legacy' && !hasData && (
        <ReportEmpty icon={<FileText size={34} />} title={loading ? 'Loading…' : 'No Data'} hint="Enter member and generate" />
      )}
    </ReportShell>
  );
};

export default MemberStatement;
