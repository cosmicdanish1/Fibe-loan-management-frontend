import React, { useState, useCallback, useRef } from 'react';
import { FileText, Printer, Search, RotateCcw, User, Calendar } from 'lucide-react';
import { message } from 'antd';
import { apiService } from '../../../../../services/api';
import dayjs, { Dayjs } from 'dayjs';
import MemberField from '../../../../../components/shared/kit/MemberField';
import { isFromAfterTo } from '@/utils/dates';
import { ReportShell, ParamCard, StatCards, OutputChoice, ReportEmpty, LegacyDocument } from '../../../../../components/reports/views/ReportShell';
import ReportViewSwitcher from '../../../../../components/reports/views/ReportViewSwitcher';
import { GenericBento, GenericEditorial, GenericTerminal } from '../../../../../components/reports/views/GenericPro';
import { useReportViews } from '../../../../../components/reports/views/reportViews';
import '../../../../../components/reports/views/proViews.css';
import { useRdStmtSpec } from '../views/rdStmtPro';

// ── types ────────────────────────────────────────────────────────────────────
// One row per FINANCIAL YEAR the member has RD activity in — the real RD
// system (rd_member_config/rd_balance_events/rd_installment_ledger/
// rd_financial_year_summary) is a rolling per-year collection sharing CD's
// GL head, not a fixed-term account, so there is no account number or
// maturity date/amount here. A CLOSED year's interest figures are frozen at
// closing time; an OPEN year shows a live snapshot instead.
interface RDYearRecord {
  key: string;
  yearcode: number;
  yearLabel: string;
  memberNo: string;
  memberName: string;
  startDate: string | Date;
  endDate: string | Date;
  monthlyRdAmount: number;
  openingBalance: number;
  totalInstallmentsDue: number;
  totalInstallmentsPaid: number;
  totalMissed: number;
  paymentPattern: string | null;
  finalEligibleFullInterest: boolean | null;
  rdInstallmentInterest: number;
  openingBalanceInterest: number;
  totalInterestCredited: number;
  currentBalance: number;
  status: 'OPEN' | 'CLOSED';
}

// ── report layout ────────────────────────────────────────────────────────────
const SEP_W = 74;
const SEP   = '-'.repeat(SEP_W);
const DSEP  = '='.repeat(SEP_W);

// ── formatters ───────────────────────────────────────────────────────────────
const centre = (s: string, w = SEP_W) =>
  s.length >= w ? s : ' '.repeat(Math.floor((w - s.length) / 2)) + s;

const fmtAmt = (n: number) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── report builder ───────────────────────────────────────────────────────────
const PATTERN_LABEL: Record<string, string> = {
  FULLY_REGULAR: 'Fully Regular',
  INITIAL_GAP_RECOVERED: 'Initial Gap (Recovered)',
  LATER_GAP_RECOVERED: 'Later Gap (Recovered)',
  MULTIPLE_GAPS: 'Multiple Gaps',
  GAP_UNRECOVERED: 'Unpaid Installment(s)',
};

const buildReportText = (
  years: RDYearRecord[],
  memberNo: string,
  memberName: string,
  fromDate: string,
  toDate: string,
): string => {
  const lines: string[] = [
    centre('Espat Karmchari Co-Operative Credit Society Limited.'),
    centre('Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006'),
    'Reg No: A.R/DRG/1796'.padEnd(SEP_W - 'Tel No: 0788-2298736'.length) + 'Tel No: 0788-2298736',
    '',
    centre('RD/CD STATEMENT'),
    '',
    `Member No :- ${memberNo}   Member Name :- ${memberName}`,
    `From Date :- ${dayjs(fromDate).format('DD-MMM-YYYY')}   To Date :- ${dayjs(toDate).format('DD-MMM-YYYY')}`,
    `Total Financial Years :- ${years.length}`,
    SEP,
  ];

  let totalInterest = 0;

  for (const y of years) {
    totalInterest += y.totalInterestCredited;

    lines.push(
      `Financial Year : ${y.yearLabel.padEnd(20)}  Status   : ${y.status}`,
      `Monthly RD     : ${fmtAmt(y.monthlyRdAmount).padEnd(20)}  Opening  : ${fmtAmt(y.openingBalance)}`,
      `Installments   : ${y.totalInstallmentsPaid}/${y.totalInstallmentsDue} Paid, ${y.totalMissed} Missed` +
        (y.paymentPattern ? `   Pattern: ${PATTERN_LABEL[y.paymentPattern] || y.paymentPattern}` : ''),
      `Installment Int: ${fmtAmt(y.rdInstallmentInterest).padEnd(20)}  Opening Bal. Int: ${fmtAmt(y.openingBalanceInterest)}`,
      `Total Interest : ${fmtAmt(y.totalInterestCredited).padEnd(20)}  Closing Balance : ${fmtAmt(y.currentBalance)}`,
    );
    lines.push(SEP);
  }

  if (years.length === 0) {
    lines.push(centre('No RD activity found for this member in the selected range'), SEP);
  }

  lines.push(
    `Total Interest Credited (all years shown) : ${fmtAmt(totalInterest)}`,
    DSEP,
    '',
    'Report As Per Data Available....',
  );

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
      <title>RD Statement</title>
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
const RDStatement: React.FC = () => {


  const [memberNo,   setMemberNo]   = useState('');
  const [memberName, setMemberName] = useState('');
  const [fromDate,   setFromDate]   = useState<Dayjs>(dayjs().startOf('year'));
  const [toDate,     setToDate]     = useState<Dayjs>(dayjs());
  const [outputType, setOutputType] = useState<'screen' | 'printer'>('screen');
  const [reportText, setReportText] = useState('');
  const [isLoading,  setIsLoading]  = useState(false);
  const [rdYears, setRdYears] = useState<RDYearRecord[]>([]);
  const reportTextRef = useRef('');

  const handleMemberSelect = useCallback((member: any) => {
    setMemberNo(member.memberNo || member.mbno || '');
    setMemberName(member.memberName || member.name || '');
  }, []);

  const handleReset = useCallback(() => {
    setMemberNo(''); setMemberName('');
    setFromDate(dayjs().startOf('year'));
    setToDate(dayjs());
    setOutputType('screen');
    setReportText('');
    setRdYears([]);
    reportTextRef.current = '';
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!memberNo) { message.warning('Please enter a Member Number'); return; }

    if (fromDate && toDate && isFromAfterTo(fromDate.format('YYYY-MM-DD'), toDate.format('YYYY-MM-DD'))) {
      message.warning('From date cannot be after To date');
      return;
    }
    setIsLoading(true);
    try {
      const response = await apiService.post('/reports/rd/statement', {
        memberNo,
        fromDate: fromDate.format('YYYY-MM-DD'),
        toDate:   toDate.format('YYYY-MM-DD'),
      });

      if (response.success && response.data) {
        const years: RDYearRecord[] = Array.isArray(response.data) ? response.data : [];
        if (years.length === 0) {
          message.info('No RD activity found for this member in the selected range');
          setReportText('');
          setRdYears([]);
          reportTextRef.current = '';
          return;
        }
        const name = years[0]?.memberName || memberName;
        if (name) setMemberName(name);

        const text = buildReportText(
          years, memberNo, name,
          fromDate.format('YYYY-MM-DD'), toDate.format('YYYY-MM-DD'),
        );
        reportTextRef.current = text;
        setReportText(text);
        setRdYears(years);
        if (outputType === 'printer') printReportText(text);
      } else {
        setReportText('');
        setRdYears([]);
        reportTextRef.current = '';
        message.error(response.error || response.message || 'Failed to generate report');
      }
    } catch (err) {
      console.error('[RDStatement]', err);
      message.error('Failed to generate RD statement');
      setReportText('');
      setRdYears([]);
      reportTextRef.current = '';
    } finally {
      setIsLoading(false);
    }
  }, [memberNo, memberName, fromDate, toDate, outputType]);

  const handlePrint = useCallback(() => {
    if (!reportTextRef.current) return;
    printReportText(reportTextRef.current);
  }, []);


  const { enabled, view, setView } = useReportViews('member-statement.rd');
  const spec = useRdStmtSpec(rdYears, `${memberNo} ${memberName}`.trim());

  const hasData = rdYears.length > 0;
  const range = `${fromDate.format('DD MMM YYYY')} to ${toDate.format('DD MMM YYYY')}`;

  return (
    <ReportShell
      className="rdstmt-page"
      title="RD Statement"
      desc="Recurring deposit statement"
      switcher={<ReportViewSwitcher enabled={enabled} value={view} onChange={setView} />}
      actions={
        <>
          <button type="button" className="aw-btn aw-btn-ghost" onClick={handleReset}><RotateCcw size={14} /> Reset</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handlePrint} disabled={!reportText}><Printer size={14} /> Print</button>
        </>
      }
      aside={
        <>
          <ParamCard title="Member" icon={<User size={14} />}>
            <div>
              <label className="aw-label" htmlFor="rdstmt-page-member">Member No.</label>
              <MemberField id="rdstmt-page-member" value={memberNo} onChange={setMemberNo} onSelect={handleMemberSelect} onSubmit={() => handleGenerate()} />
            </div>
            <input className="aw-input" value={memberName} readOnly placeholder="Selected member name" aria-label="Member name" />
          </ParamCard>
          <ParamCard title="Period" icon={<Calendar size={14} />}>
            <div>
              <label className="aw-label" htmlFor="rdstmt-page-from">From</label>
              <input id="rdstmt-page-from" type="date" className="aw-input" value={fromDate.format('YYYY-MM-DD')} onChange={e => e.target.value && setFromDate(dayjs(e.target.value))} />
            </div>
            <div>
              <label className="aw-label" htmlFor="rdstmt-page-to">To</label>
              <input id="rdstmt-page-to" type="date" className="aw-input" value={toDate.format('YYYY-MM-DD')} onChange={e => e.target.value && setToDate(dayjs(e.target.value))} />
            </div>
            <OutputChoice value={outputType} onChange={setOutputType} id="rdstmt-page-output" />
            <button type="button" className="aw-btn aw-btn-primary" onClick={() => handleGenerate()} disabled={isLoading} style={{ width: '100%' }}>
              <Search size={14} className={isLoading ? 'aw-spin' : undefined} /> {isLoading ? 'Loading…' : 'Generate'}
            </button>
          </ParamCard>
          {hasData && <StatCards items={[{ label: 'Financial years', value: String(rdYears.length), tone: 'muted' }]} />}
        </>
      }
      footerLeft="RD Statement"
      footerRight={memberNo ? `Member ${memberNo}` : ''}
    >
      {hasData && view === 'bento' && <GenericBento spec={spec} />}
      {hasData && view === 'terminal' && <div style={{ height: 'calc(100vh - 150px)', minHeight: 360 }}><GenericTerminal spec={spec} /></div>}
      {hasData && view === 'editorial' && <GenericEditorial spec={spec} title="RD Statement" subtitle={`${memberNo} · ${range}`} />}

      {view === 'legacy' && (
        <LegacyDocument
          title={`RD Statement${memberNo ? ` · Member ${memberNo}` : ''}`}
          meta={range}
          text={reportText}
          loading={isLoading}
          small
          empty={<ReportEmpty icon={<FileText size={34} />} title="No Data" hint="Select member and click Generate" />}
        />
      )}
      {view !== 'legacy' && !hasData && (
        <ReportEmpty icon={<FileText size={34} />} title={isLoading ? 'Loading…' : reportText ? 'Nothing to show' : 'No Data'} hint="Select member and click Generate" />
      )}
    </ReportShell>
  );
};

export default RDStatement;
