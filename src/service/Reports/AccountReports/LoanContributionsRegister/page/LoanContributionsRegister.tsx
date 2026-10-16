import React, { useState, useCallback } from 'react';
import { DatePicker, message } from 'antd';
import { Printer, Search, RotateCcw, Briefcase, User, Calendar } from 'lucide-react';
import { apiService } from '../../../../../services/api';
import dayjs from 'dayjs';
import MemberField from '../../../../../components/shared/kit/MemberField';
import { isFromAfterTo } from '@/utils/dates';
import { ReportShell, ParamCard, StatCards, OutputChoice, ReportEmpty, LegacyDocument } from '../../../../../components/reports/views/ReportShell';
import ReportViewSwitcher from '../../../../../components/reports/views/ReportViewSwitcher';
import { useReportViews } from '../../../../../components/reports/views/reportViews';
import '../../../../../components/reports/views/proViews.css';
import ContribBento from '../views/ContribBento';
import ContribTerminal from '../views/ContribTerminal';
import { fmt, type ContribData } from '../views/contribModel';

const REPORT_ID = 'account.loan-contributions';

// ── text helpers ──────────────────────────────────────────────────
const W = 100;
const ctr = (s: string) => s.padStart(Math.floor((W + s.length) / 2)).padEnd(W);
const rl  = () => '-'.repeat(W);
const lr  = (l: string, r: string) => l + r.padStart(W - l.length);
const col = (s: string, w: number, align: 'l' | 'r' = 'l') =>
  align === 'l' ? s.substring(0, w).padEnd(w) : s.substring(0, w).padStart(w);

const fmtAmt = (n: number) =>
  (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d?: string) => (d ? dayjs(d).format('DD-MMM-YY') : '---');

const buildReportText = (data: any): string => {
  const lines: string[] = [];

  lines.push(ctr('Espat Karmchari Co-Operative Credit Society Limited.'));
  lines.push(ctr('Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006'));
  lines.push(ctr('Reg No: A.R/DRG/1796'));
  lines.push(rl());
  lines.push(ctr('LOAN CONTRIBUTIONS REGISTER'));
  lines.push(lr(`Member : ${data.memberNo}  ${data.memberName}`,
    `Period : ${dayjs(data.fromDate).format('DD-MMM-YYYY')} to ${dayjs(data.toDate).format('DD-MMM-YYYY')}`));
  lines.push(rl());

  if (!data.loanContributions || data.loanContributions.length === 0) {
    lines.push('');
    lines.push(ctr('No loan records found for this member'));
    lines.push(rl());
    lines.push(ctr('Report as per data available'));
    return lines.join('\n');
  }

  data.loanContributions.forEach((lc: any) => {
    const ld = lc.loanDetails;
    lines.push('');
    lines.push(`  Loan Type: ${ld.loanType}   Case No: ${ld.loanCaseNo}   Amount: Rs. ${fmtAmt(ld.loanAmount)}   Rate: ${ld.interestRate}%`);
    lines.push(`  Installment: Rs. ${fmtAmt(ld.installmentAmount)}   No.of Inst: ${ld.numberOfInstallments}   Outstanding: Rs. ${fmtAmt(ld.outstandingBalance)}`);
    lines.push(rl());

    if (lc.transactions && lc.transactions.length > 0) {
      lines.push(
        col('Date', 12) + col('Vchr No', 12) + col('Type', 6) +
        col('Amount', 14, 'r') + '  ' + 'Narration'
      );
      lines.push(rl());

      lc.transactions.forEach((t: any) => {
        lines.push(
          col(fmtDate(t.transactionDate), 12) +
          col(t.voucherNo || '', 12) +
          col(t.transactionType, 6) +
          col(fmtAmt(t.transactionAmount), 14, 'r') + '  ' +
          (t.narration || '').substring(0, 40)
        );
      });
      lines.push(rl());
    } else {
      lines.push('  No transactions in this period');
      lines.push(rl());
    }
  });

  lines.push('');
  const s = data.summary || {};
  lines.push(lr(
    `Total Loans: ${data.loanContributions.length}   Transactions: ${data.totalTransactions || 0}`,
    `Debits: Rs. ${fmtAmt(s.totalDebits || 0)}   Credits: Rs. ${fmtAmt(s.totalCredits || 0)}`
  ));
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

const LoanContributionsRegister: React.FC = () => {
  const [memberNo, setMemberNo]     = useState('');
  const [memberName, setMemberName] = useState('');
  const [fromDate, setFromDate]     = useState<dayjs.Dayjs>(dayjs().startOf('month'));
  const [toDate, setToDate]         = useState<dayjs.Dayjs>(dayjs());
  const [outputType, setOutputType] = useState<'screen' | 'printer'>('screen');
  const [loading, setLoading]       = useState(false);
  const [reportText, setReportText] = useState('');
  const [data, setData]             = useState<ContribData | null>(null);
  const { enabled, view, setView }  = useReportViews(REPORT_ID);

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
    if (fromDate && toDate && isFromAfterTo(fromDate.format('YYYY-MM-DD'), toDate.format('YYYY-MM-DD'))) {
      message.warning('From date cannot be after To date');
      return;
    }
    setLoading(true);
    try {
      const response = await apiService.getLoanContributionsRegister({
        memberNo: no,
        fromDate: fromDate.format('YYYY-MM-DD'),
        toDate: toDate.format('YYYY-MM-DD'),
      });
      const rec = (response as any)?.data || response;

      if (rec && rec.memberNo) {
        setMemberName(rec.memberName || '');
        const text = buildReportText(rec);
        setReportText(text);
        setData(rec);
        if (rec.totalTransactions > 0) message.success(`Found ${rec.totalTransactions} transactions`);
        else message.info('No transactions found in this period');
        if (outputType === 'printer') printReportText(text);
      } else {
        setReportText('');
        setData(null);
        message.error('Member not found');
      }
    } catch {
      message.error('Failed to load loan contributions');
      setReportText('');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [memberNo, fromDate, toDate, outputType]);

  const handleReset = useCallback(() => {
    setMemberNo('');
    setMemberName('');
    setFromDate(dayjs().startOf('month'));
    setToDate(dayjs());
    setReportText('');
    setData(null);
  }, []);

  const hasData = Boolean(data && data.loanContributions?.length);

  return (
    <ReportShell
      className="loan-contrib-page"
      title="Loan Contributions Register"
      desc="Loan transactions"
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
              <label className="aw-label" htmlFor="lc-member">Member No.</label>
              <MemberField id="lc-member" value={memberNo} onChange={setMemberNo} onSelect={handleMemberSelect} onSubmit={v => handleGenerate(v)} />
            </div>
            <input className="aw-input" value={memberName} readOnly placeholder="Member name" aria-label="Member name" />
          </ParamCard>
          <ParamCard title="Date range" icon={<Calendar size={14} />}>
            <div>
              <label className="aw-label" htmlFor="lc-from">From date</label>
              <DatePicker id="lc-from" value={fromDate} onChange={v => v && setFromDate(v)} allowClear={false} format="DD-MMM-YYYY" className="aw-picker" popupClassName="aw-select-popup" suffixIcon={<Calendar size={13} />} />
            </div>
            <div>
              <label className="aw-label" htmlFor="lc-to">To date</label>
              <DatePicker id="lc-to" value={toDate} onChange={v => v && setToDate(v)} allowClear={false} format="DD-MMM-YYYY" className="aw-picker" popupClassName="aw-select-popup" suffixIcon={<Calendar size={13} />} />
            </div>
            <OutputChoice value={outputType} onChange={setOutputType} id="lc-output" />
            <button type="button" className="aw-btn aw-btn-primary" onClick={() => handleGenerate()} disabled={loading} style={{ width: '100%' }}>
              <Search size={14} className={loading ? 'aw-spin' : undefined} /> {loading ? 'Loading…' : 'Generate'}
            </button>
          </ParamCard>
          {data && <StatCards items={[
            { label: 'Loans', value: String(data.loanContributions?.length ?? 0), tone: 'muted' },
            { label: 'Transactions', value: String(data.totalTransactions ?? 0), tone: 'muted' },
            { label: 'Credits', value: fmt(data.summary?.totalCredits ?? 0), tone: 'success' },
          ]} />}
        </>
      }
      footerLeft="Loan Contributions Register"
      footerRight={`${fromDate.format('DD-MMM-YY')} – ${toDate.format('DD-MMM-YY')}`}
    >
      {hasData && data && view === 'bento' && <ContribBento data={data} />}
      {hasData && data && view === 'terminal' && <div style={{ height: 'calc(100vh - 150px)', minHeight: 360 }}><ContribTerminal data={data} /></div>}

      {view === 'legacy' && (
        <LegacyDocument
          title={`Loan Contributions Register${memberNo ? ` · Member ${memberNo}` : ''}`}
          meta={`${fromDate.format('DD-MMM-YY')} – ${toDate.format('DD-MMM-YY')}`}
          text={reportText}
          loading={loading}
          empty={<ReportEmpty icon={<Briefcase size={34} />} title="No Data" hint="Enter member number, date range and generate" />}
        />
      )}
      {view !== 'legacy' && !hasData && (
        <ReportEmpty icon={<Briefcase size={34} />} title={loading ? 'Loading…' : data ? 'No loans for this member' : 'No Data'} hint="Enter member number, date range and generate" />
      )}
    </ReportShell>
  );
};

export default LoanContributionsRegister;
