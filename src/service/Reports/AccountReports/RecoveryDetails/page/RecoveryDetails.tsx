import React, { useState, useCallback, useMemo } from 'react';
import { Select, message } from 'antd';
import { Printer, Search, RotateCcw, IndianRupee, User, Calendar } from 'lucide-react';
import { apiService } from '../../../../../services/api';
import dayjs from 'dayjs';
import MemberField from '../../../../../components/shared/kit/MemberField';
import { ReportShell, ParamCard, StatCards, OutputChoice, ReportEmpty, LegacyDocument } from '../../../../../components/reports/views/ReportShell';
import ReportViewSwitcher from '../../../../../components/reports/views/ReportViewSwitcher';
import { useReportViews } from '../../../../../components/reports/views/reportViews';
import '../../../../../components/reports/views/proViews.css';
import RecoveryBento from '../views/RecoveryBento';
import RecoveryEditorial from '../views/RecoveryEditorial';
import { fmt, type RecoveryData } from '../views/recoveryModel';

const REPORT_ID = 'account.recovery-details';

// ── text helpers ──────────────────────────────────────────────────
const W = 110;
const ctr = (s: string) => s.padStart(Math.floor((W + s.length) / 2)).padEnd(W);
const rl  = () => '-'.repeat(W);
const lr  = (l: string, r: string) => l + r.padStart(W - l.length);
const col = (s: string, w: number, align: 'l' | 'r' = 'l') =>
  align === 'l' ? s.substring(0, w).padEnd(w) : s.substring(0, w).padStart(w);

const fmtAmt = (n: number) =>
  (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MONTH_OPTIONS = MONTH_NAMES.map(m => ({ value: m, label: m }));

const buildReportText = (d: RecoveryData, monthLabel: string, year: number): string => {
  const lines: string[] = [];

  lines.push(ctr('Espat Karmchari Co-Operative Credit Society Limited.'));
  lines.push(ctr('Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006'));
  lines.push(ctr('Reg No: A.R/DRG/1796'));
  lines.push(rl());
  lines.push(ctr('Statement Of Recovery in Detailed'));
  lines.push(ctr(`For The Month Of ${monthLabel}  ${year}`));
  lines.push(rl());
  lines.push('');

  // ── Column headers (matching legacy layout) ─────────────────
  // Every number column is one character wider than its widest figure (99,99,999.00) so
  // neighbouring figures never run together.
  const HW = [12, 12, 11, 11, 11, 11, 11, 11];
  const hdr = (labels: string[]) => col('', 0) + labels.map((t, i) => col(t, HW[i]!, 'r')).join('');
  lines.push(col('Acc', 11) + col('Name Of the Member', 22) + hdr(['REG LN', 'EMR LN', 'TOTAL', 'CONT', 'LOAN', 'INT', 'EMER', 'INT ON']));
  lines.push(col('No', 11) + col('', 22) + hdr(['Out_ST', 'Out_ST', 'RD', 'REC', 'REC', 'LOAN', 'LOAN', 'ENERG']));
  lines.push(col('', 11) + col('', 22) + hdr(['', '', '', '', '', '', 'REC', 'LOAN']));
  lines.push(rl());

  // ── Data row ────────────────────────────────────────────────
  const lr_ = d.loanRecoveries;
  const dr_ = d.depositRecoveries;
  const ch_ = d.charges;

  // Each column holds what its heading says: the loans still outstanding (RLN, ALN), the RD
  // balance, the compulsory deposit recovered, the regular loan principal and interest recovered,
  // and the emergency loan principal and interest recovered. Older responses without the extra
  // parts fall back to the combined recovery amounts.
  const out_ = d.loanOutstanding;
  const prin_ = d.loanPrincipal;
  const int_ = d.loanInterest;
  const cells = [
    out_ ? out_.regularLoan : 0,
    out_ ? out_.advanceLoan : 0,
    d.rdBalance ?? dr_.recurringDeposit,
    dr_.compulsoryDeposit,
    prin_ ? prin_.regularLoan : lr_.regularLoan,
    int_ ? int_.regularLoan : 0,
    prin_ ? prin_.advanceLoan : lr_.advanceLoan,
    int_ ? int_.advanceLoan : 0,
  ];
  const widths = HW;
  const numbers = cells.map((v, i) => col(fmtAmt(v), widths[i]!, 'r')).join('');

  lines.push(col(d.memberNo, 11) + col(d.memberName.substring(0, 21), 22) + numbers);
  lines.push(rl());

  // ── Totals row ──────────────────────────────────────────────
  const totLoans = lr_.regularLoan + lr_.emergencyLoan + lr_.advanceLoan + lr_.miscLoan;
  const totDeps = dr_.recurringDeposit + dr_.monthlyDeposit + dr_.compulsoryDeposit + dr_.shareAmount;
  const totCharges = ch_.bankCharges + ch_.otherCharges;

  // A single member, so the total row repeats the figures above.
  lines.push(col('Total', 11) + col('', 22) + numbers);
  lines.push(rl());
  lines.push('');

  // ── Summary section ─────────────────────────────────────────
  lines.push(lr(`Member   : ${d.memberNo}  ${d.memberName}`, `Period : ${d.period}`));
  lines.push('');
  lines.push(`  ${'Loan Recoveries'.padEnd(30)} ${'Deposit Recoveries'.padEnd(30)} ${'Charges'}`);
  lines.push(rl());
  lines.push(`  ${'Regular Loan (RLN)'.padEnd(20)} ${fmtAmt(lr_.regularLoan).padStart(10)}   ${'Recurring Dep (RD)'.padEnd(20)} ${fmtAmt(dr_.recurringDeposit).padStart(10)}   ${'Bank Charges'.padEnd(16)} ${fmtAmt(ch_.bankCharges).padStart(10)}`);
  lines.push(`  ${'Loan Against RD (ELN)'.padEnd(20)} ${fmtAmt(lr_.emergencyLoan).padStart(10)}   ${'Monthly Dep (MD)'.padEnd(20)} ${fmtAmt(dr_.monthlyDeposit).padStart(10)}   ${'Other Charges'.padEnd(16)} ${fmtAmt(ch_.otherCharges).padStart(10)}`);
  lines.push(`  ${'Emergency Loan (ALN)'.padEnd(20)} ${fmtAmt(lr_.advanceLoan).padStart(10)}   ${'Compulsory Dep (CD)'.padEnd(20)} ${fmtAmt(dr_.compulsoryDeposit).padStart(10)}`);
  lines.push(`  ${''.padEnd(20)} ${''.padStart(10)}   ${'Share Amount'.padEnd(20)} ${fmtAmt(dr_.shareAmount).padStart(10)}`);
  lines.push(rl());
  lines.push(`  ${'Sub-Total'.padEnd(20)} ${fmtAmt(totLoans).padStart(10)}   ${'Sub-Total'.padEnd(20)} ${fmtAmt(totDeps).padStart(10)}   ${'Sub-Total'.padEnd(16)} ${fmtAmt(totCharges).padStart(10)}`);
  lines.push(rl());
  lines.push('');
  lines.push(ctr(`TOTAL DEMAND : Rs. ${fmtAmt(d.totalDemand)}`));
  lines.push(rl());
  lines.push(ctr('Report as per data available'));

  return lines.join('\n');
};

const printReportText = (text: string) => {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const doc = `<html><head><style>
    @page{size:landscape;margin:10mm}
    body{font-family:'Courier New',monospace;font-size:9pt;white-space:pre;background:white;color:#000}
  </style></head><body>${escaped}</body></html>`;
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  iframe.contentDocument!.open();
  iframe.contentDocument!.write(doc);
  iframe.contentDocument!.close();
  setTimeout(() => iframe.contentWindow!.print(), 100);
  setTimeout(() => document.body.removeChild(iframe), 1500);
};

const RecoveryDetails: React.FC = () => {
  const [memberNo, setMemberNo]     = useState('');
  const [memberName, setMemberName] = useState('');
  const [month, setMonth]           = useState<string>((MONTH_NAMES[dayjs().month()] ?? ''));
  const [year, setYear]             = useState<number>(dayjs().year());
  const [outputType, setOutputType] = useState<'screen' | 'printer'>('screen');
  const [loading, setLoading]       = useState(false);
  const [reportText, setReportText] = useState('');
  const [data, setData]             = useState<RecoveryData | null>(null);
  const [shownPeriod, setShownPeriod] = useState('');
  const { enabled, view, setView }  = useReportViews(REPORT_ID);

  const yearOptions = useMemo(() =>
    Array.from({ length: 10 }, (_, i) => {
      const y = dayjs().year() - i;
      return { value: y, label: y.toString() };
    }), []);

  const handleMemberSelect = useCallback((member: any) => {
    setMemberNo(String(member.memberNo || member.mbno || ''));
    setMemberName(member.memberName || member.name || '');
  }, []);

  const handleGenerate = useCallback(async (override?: string) => {
    const no = (override ?? memberNo).trim();
    if (!no) {
      message.warning('Please enter Member Number');
      return;
    }
    setLoading(true);
    try {
      const response = await apiService.getRecoveryDetails({
        memberNo: no,
        month,
        year: String(year),
      });
      const rec: RecoveryData | null = (response as any)?.data || response || null;

      if (rec && rec.memberNo) {
        setMemberName(rec.memberName || '');
        const text = buildReportText(rec, month, year);
        setReportText(text);
        setData(rec);
        setShownPeriod(`${month} ${year}`);
        message.success('Recovery details loaded');
        if (outputType === 'printer') printReportText(text);
      } else {
        setReportText('');
        setData(null);
        message.info('No recovery details found for this period');
      }
    } catch {
      message.error('No recovery details found for this member/period');
      setReportText('');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [memberNo, month, year, outputType]);

  const handleReset = useCallback(() => {
    setMemberNo('');
    setMemberName('');
    setMonth((MONTH_NAMES[dayjs().month()] ?? ''));
    setYear(dayjs().year());
    setReportText('');
    setData(null);
    setShownPeriod('');
  }, []);

  const hasData = Boolean(data);

  return (
    <ReportShell
      className="rd-page"
      title="Recovery Details"
      desc="Monthly demand statement"
      switcher={<ReportViewSwitcher enabled={enabled} value={view} onChange={setView} />}
      actions={
        <>
          <button type="button" className="aw-btn aw-btn-ghost" onClick={handleReset}><RotateCcw size={14} /> Reset</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={() => reportText && printReportText(reportText)} disabled={!reportText}><Printer size={14} /> Print</button>
        </>
      }
      aside={
        <>
          <ParamCard title="Member" icon={<User size={14} />}>
            <div>
              <label className="aw-label" htmlFor="rec-member">Member No.</label>
              <MemberField id="rec-member" value={memberNo} onChange={setMemberNo} onSelect={handleMemberSelect} onSubmit={v => handleGenerate(v)} />
            </div>
            <input className="aw-input" value={memberName} readOnly placeholder="Member name" aria-label="Member name" />
          </ParamCard>
          <ParamCard title="Period" icon={<Calendar size={14} />}>
            <div>
              <label className="aw-label" htmlFor="rec-month">Select month</label>
              <Select id="rec-month" value={month} onChange={setMonth} options={MONTH_OPTIONS} className="aw-select" popupClassName="aw-select-popup" />
            </div>
            <div>
              <label className="aw-label" htmlFor="rec-year">Select year</label>
              <Select id="rec-year" value={year} onChange={setYear} options={yearOptions} className="aw-select" popupClassName="aw-select-popup" />
            </div>
            <OutputChoice value={outputType} onChange={setOutputType} id="rec-output" />
            <button type="button" className="aw-btn aw-btn-primary" onClick={() => handleGenerate()} disabled={loading} style={{ width: '100%' }}>
              <Search size={14} className={loading ? 'aw-spin' : undefined} /> {loading ? 'Loading…' : 'Generate'}
            </button>
          </ParamCard>
          {data && <StatCards items={[{ label: 'Total demand', value: fmt(data.totalDemand), tone: 'danger' }]} />}
        </>
      }
      footerLeft="Recovery Details"
      footerRight={shownPeriod}
    >
      {data && view === 'bento' && <RecoveryBento data={data} periodLabel={shownPeriod} />}
      {data && view === 'editorial' && <RecoveryEditorial data={data} periodLabel={shownPeriod} />}

      {view === 'legacy' && (
        <LegacyDocument
          title={`Recovery Details${memberNo ? ` · Member ${memberNo}` : ''}`}
          meta={`${month} ${year}`}
          text={reportText}
          loading={loading}
          small
          empty={<ReportEmpty icon={<IndianRupee size={34} />} title="No Data" hint="Enter member number, select period and generate" />}
        />
      )}
      {view !== 'legacy' && !hasData && (
        <ReportEmpty icon={<IndianRupee size={34} />} title={loading ? 'Loading…' : 'No Data'} hint="Enter member number, select period and generate" />
      )}
    </ReportShell>
  );
};

export default RecoveryDetails;
