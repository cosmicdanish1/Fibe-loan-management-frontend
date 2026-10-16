import React, { useState, useCallback } from 'react';
import { message } from 'antd';
import { Printer, Search, RotateCcw, Repeat, User } from 'lucide-react';
import { apiService } from '../../../../../services/api';
import MemberField from '../../../../../components/shared/kit/MemberField';
import { ReportShell, ParamCard, StatCards, OutputChoice, ReportEmpty, LegacyDocument } from '../../../../../components/reports/views/ReportShell';
import ReportViewSwitcher from '../../../../../components/reports/views/ReportViewSwitcher';
import { useReportViews } from '../../../../../components/reports/views/reportViews';
import '../../../../../components/reports/views/proViews.css';
import RecurringBento from '../views/RecurringBento';
import RecurringTerminal from '../views/RecurringTerminal';
import { fmt, type RDItem } from '../views/recurringModel';

const REPORT_ID = 'account.recurring-details';

// ── text helpers ──────────────────────────────────────────────────
const W = 110;
const ctr = (s: string) => s.padStart(Math.floor((W + s.length) / 2)).padEnd(W);
const rl  = () => '-'.repeat(W);
const lr  = (l: string, r: string) => l + r.padStart(W - l.length);
const col = (s: string, w: number, align: 'l' | 'r' = 'l') =>
  align === 'l' ? s.substring(0, w).padEnd(w) : s.substring(0, w).padStart(w);

const fmtAmt = (n: number) =>
  (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const buildReportText = (data: RDItem[], memberNo: string): string => {
  const lines: string[] = [];
  const name = data[0]?.memberName || '';

  lines.push(ctr('Espat Karmchari Co-Operative Credit Society Limited.'));
  lines.push(ctr('Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006'));
  lines.push(ctr('Reg No: A.R/DRG/1796'));
  lines.push(rl());
  lines.push(ctr('Statement Showing RD Details Of The Member, By Financial Year'));
  lines.push(rl());
  lines.push('');
  lines.push(lr(`Member No : ${memberNo}`, `Name : ${name}`));
  lines.push('');

  // ── Pivoted layout: FY1, FY2, ... as column groups (one column group
  // per financial year the member has RD activity in — the real RD
  // system has no separate "accounts", just one rolling record per year).
  // Each year is 12 (year, led by a space as the gap) + 8 (installments) + 12 (amount) wide: 12 holds 99,99,999.00
  // and up, so a balance of 1 lakh or more is no longer cut ("1,00,000.0"), and years never touch.
  const perGroup = 32;
  const maxPerRow = Math.floor((W - 8) / perGroup) || 1;
  const chunks: RDItem[][] = [];
  for (let i = 0; i < data.length; i += maxPerRow) {
    chunks.push(data.slice(i, i + maxPerRow));
  }

  chunks.forEach((chunk, ci) => {
    // Header line 1: FY labels
    let hdr1 = col('', 8);
    chunk.forEach((rd) => {
      hdr1 += col(' ' + rd.yearLabel, 12) + col('NO. Of', 8) + col('Balance', 12, 'r');
    });
    lines.push(hdr1);

    // Header line 2
    let hdr2 = col('Name', 8);
    chunk.forEach(() => {
      hdr2 += col(' Fin. Year', 12) + col('Inst', 8) + col('Amount', 12, 'r');
    });
    lines.push(hdr2);
    lines.push(rl());

    // Data line
    let row = col(ci === 0 ? name.substring(0, 7) : '', 8);
    chunk.forEach(rd => {
      row += col(' ' + rd.yearLabel.substring(0, 9), 12) +
             col(String(rd.totalInstallmentsPaid || 0), 8) +
             col(fmtAmt(rd.currentBalance), 12, 'r');
    });
    lines.push(row);

    let detailRow1 = col('', 8);
    chunk.forEach(rd => {
      detailRow1 += col('', 12) + col('', 8) + col(fmtAmt(rd.monthlyRdAmount), 12, 'r');
    });
    lines.push(detailRow1);

    let detailRow2 = col('', 8);
    chunk.forEach(() => {
      detailRow2 += col('', 12) + col('', 8) + col('Monthly', 12, 'r');
    });
    lines.push(detailRow2);

    let statusRow = col('', 8);
    chunk.forEach(rd => {
      statusRow += col(` Missed:${rd.totalMissed || 0}`, 12) +
                   col(`Status:`, 8) +
                   col(rd.status || '', 12, 'r');
    });
    lines.push(statusRow);

    lines.push(rl());
  });

  if (data.length === 0) {
    lines.push(ctr('No RD activity found for this member'));
    lines.push(rl());
  }

  // ── Summary ─────────────────────────────────────────────────
  const totBal = data.reduce((s, r) => s + r.currentBalance, 0);
  const totAmt = data.reduce((s, r) => s + r.monthlyRdAmount, 0);
  lines.push('');
  lines.push(lr(`Total Financial Years : ${data.length}`, `Total Balance : Rs. ${fmtAmt(totBal)}`));
  lines.push(lr('', `Total Monthly     : Rs. ${fmtAmt(totAmt)}`));
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

const RecurringDetails: React.FC = () => {
  const [memberNo, setMemberNo]     = useState('');
  const [memberName, setMemberName] = useState('');
  const [outputType, setOutputType] = useState<'screen' | 'printer'>('screen');
  const [loading, setLoading]       = useState(false);
  const [reportText, setReportText] = useState('');
  const [recordCount, setRecordCount] = useState(0);
  const [items, setItems]           = useState<RDItem[]>([]);
  const [shownMember, setShownMember] = useState('');
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
    setLoading(true);
    try {
      const response = await apiService.getRecurringDetails({ memberNo: no });
      const rows: RDItem[] = Array.isArray((response as any)?.data)
        ? (response as any).data
        : Array.isArray(response) ? (response as any) : [];

      if (rows[0]?.memberName) setMemberName(rows[0].memberName);

      const text = buildReportText(rows, no);
      setReportText(text);
      setRecordCount(rows.length);
      setItems(rows);
      setShownMember(no);

      if (rows.length === 0) message.info('No RD accounts found for this member');
      else if (outputType === 'printer') printReportText(text);
    } catch {
      message.error('Failed to load recurring details');
      setReportText('');
      setRecordCount(0);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [memberNo, outputType]);

  const handleReset = useCallback(() => {
    setMemberNo('');
    setMemberName('');
    setReportText('');
    setRecordCount(0);
    setItems([]);
    setShownMember('');
  }, []);

  const hasData = items.length > 0;
  const totalBalance = items.reduce((s, r) => s + (r.currentBalance || 0), 0);

  return (
    <ReportShell
      className="recurring-details-page"
      title="Recurring Details"
      desc="RD accounts statement"
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
              <label className="aw-label" htmlFor="rd-member">Member No.</label>
              <MemberField id="rd-member" value={memberNo} onChange={setMemberNo} onSelect={handleMemberSelect} onSubmit={v => handleGenerate(v)} />
            </div>
            <input className="aw-input" value={memberName} readOnly placeholder="Member name" aria-label="Member name" />
            <OutputChoice value={outputType} onChange={setOutputType} id="rd-output" />
            <button type="button" className="aw-btn aw-btn-primary" onClick={() => handleGenerate()} disabled={loading} style={{ width: '100%' }}>
              <Search size={14} className={loading ? 'aw-spin' : undefined} /> {loading ? 'Loading…' : 'Generate'}
            </button>
          </ParamCard>
          {hasData && <StatCards items={[
            { label: 'Financial years', value: String(recordCount), tone: 'muted' },
            { label: 'Total balance', value: fmt(totalBalance), tone: 'info' },
          ]} />}
        </>
      }
      footerLeft="Recurring Details"
      footerRight={shownMember ? `Member ${shownMember}` : ''}
    >
      {hasData && view === 'bento' && <RecurringBento items={items} memberNo={shownMember} />}
      {hasData && view === 'terminal' && <div style={{ height: 'calc(100vh - 150px)', minHeight: 320 }}><RecurringTerminal items={items} memberNo={shownMember} /></div>}

      {view === 'legacy' && (
        <LegacyDocument
          title={`Recurring Details${shownMember ? ` · Member ${shownMember}` : ''}`}
          meta={recordCount > 0 ? `${recordCount} Years` : undefined}
          text={reportText}
          loading={loading}
          empty={<ReportEmpty icon={<Repeat size={34} />} title="No Data" hint="Enter member number and generate" />}
        />
      )}
      {view !== 'legacy' && !hasData && (
        <ReportEmpty icon={<Repeat size={34} />} title={loading ? 'Loading…' : reportText ? 'No RD activity for this member' : 'No Data'} hint="Enter member number and generate" />
      )}
    </ReportShell>
  );
};

export default RecurringDetails;
