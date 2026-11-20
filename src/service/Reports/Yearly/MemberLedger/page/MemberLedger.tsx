import React, { useState, useCallback } from 'react';
import { FileText, Search, Printer, FileDown, User, RotateCcw } from 'lucide-react';
import { message } from 'antd';
import { apiService } from '../../../../../services/api';
import dayjs, { Dayjs } from 'dayjs';
import { indianFinancialYearStart } from '@/utils/dates';
import MemberField from '../../../../../components/shared/kit/MemberField';
import { ReportShell, ParamCard, StatCards, OutputChoice, ReportEmpty, LegacyDocument } from '../../../../../components/reports/views/ReportShell';
import ReportViewSwitcher from '../../../../../components/reports/views/ReportViewSwitcher';
import { GenericBento, GenericEditorial, GenericTerminal } from '../../../../../components/reports/views/GenericPro';
import { useReportViews } from '../../../../../components/reports/views/reportViews';
import { useColumnarSpec } from '../views/columnarPro';

interface LedgerCell { dr: number; cr: number; bal: number | null; }
interface LedgerRow { date: string; share: LedgerCell; ltl: LedgerCell; emer: LedgerCell; cd: LedgerCell; }
interface Balances { share: number; ltl: number; emer: number; cd: number; }
interface ColumnarLedger {
  memberNumber: string;
  memberName: string;
  fromDate: string;
  toDate: string;
  opening: Balances;
  closing: Balances;
  rows: LedgerRow[];
}

// ---- Monospace report layout ----
const DATEW = 18;            // date column width
const CW = 12;               // each sub-cell (Dr / Cr / Bal) width
const GW = CW * 3 + 2;       // account-group inner width  ("Dr|Cr|Bal")
const REPORT_W = DATEW + 4 * GW + 5;

const SOCIETY = [
  'Espat Karmchari Co-Operative Credit Society Limited.',
  'Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006',
  'A.R/DRG/1796',
];

const center = (s: string, w: number) => {
  s = s.length > w ? s.slice(0, w) : s;
  const total = w - s.length;
  const left = Math.floor(total / 2);
  return ' '.repeat(left) + s + ' '.repeat(total - left);
};
const padE = (s: string, w: number) => (s.length > w ? s.slice(0, w) : s + ' '.repeat(w - s.length));
const padS = (s: string, w: number) => (s.length > w ? s.slice(0, w) : ' '.repeat(w - s.length) + s);
const intStr = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n));
const cellNum = (v: number) => (v ? String(v) : '');
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

const group = (a: string, b: string, c: string) => `${padS(a, CW)}|${padS(b, CW)}|${padS(c, CW)}`;
const groupH = (a: string, b: string, c: string) => `${center(a, CW)}|${center(b, CW)}|${center(c, CW)}`;
const rowLine = (date: string, g1: string, g2: string, g3: string, g4: string) =>
  `${padE(date, DATEW)}|${g1}|${g2}|${g3}|${g4}|`;

const buildReportText = (d: ColumnarLedger): string => {
  const DASH = '-'.repeat(REPORT_W);
  const lines: string[] = [];

  SOCIETY.forEach(s => lines.push(center(s, REPORT_W)));
  lines.push('');
  lines.push(center('MEMBER  DETAIL  LEDGER', REPORT_W));
  lines.push('');
  lines.push(`Member   :- [${d.memberNumber} ]${d.memberName}`);
  lines.push(DASH);

  lines.push(rowLine('', center('SHARE ACCOUNT', GW), center('LONG TERM LOAN', GW), center('EMERGENCY LOAN', GW), center('RD/CD', GW)));
  lines.push(rowLine('    Date', groupH('Dr.', 'Cr.', 'Bal.'), groupH('Dr.', 'Cr.', 'Bal.'), groupH('Dr.', 'Cr.', 'Bal.'), groupH('Dr.', 'Cr.', 'Bal.')));
  lines.push(rowLine('', groupH('Rs.', 'Rs.', 'Rs.'), groupH('Rs.', 'Rs.', 'Rs.'), groupH('Rs.', 'Rs.', 'Rs.'), groupH('Rs.', 'Rs.', 'Rs.')));
  lines.push(DASH);

  const op = d.opening;
  lines.push(rowLine(
    `Bal:${dayjs(d.fromDate).format('DD-MM-YYYY')}`,
    group('', '', intStr(op.share)),
    group('', '', intStr(op.ltl)),
    group('', '', intStr(op.emer)),
    group('', '', intStr(op.cd)),
  ));

  const cellOf = (c: LedgerCell) => (c.bal === null ? group('', '', '') : group(cellNum(c.dr), cellNum(c.cr), intStr(c.bal)));
  d.rows.forEach(r => {
    lines.push(rowLine(dayjs(r.date).format('DD-MM-YYYY'), cellOf(r.share), cellOf(r.ltl), cellOf(r.emer), cellOf(r.cd)));
  });

  lines.push(DASH);
  const cl = d.closing;
  lines.push(rowLine('Closing',
    group('', '', intStr(cl.share)),
    group('', '', intStr(cl.ltl)),
    group('', '', intStr(cl.emer)),
    group('', '', intStr(cl.cd)),
  ));
  lines.push(DASH);
  lines.push('Report As Per Data Available....');

  return lines.join('\n');
};

const MemberLedger: React.FC = () => {
  const [memberNumber, setMemberNumber] = useState<string>('');
  const [memberName, setMemberName] = useState<string>('');
  const [fromDate, setFromDate] = useState<Dayjs>(dayjs(indianFinancialYearStart()));
  const [toDate, setToDate] = useState<Dayjs>(dayjs());
  const [outputType, setOutputType] = useState<string>('screen');
  const [report, setReport] = useState<ColumnarLedger | null>(null);
  const [loading, setLoading] = useState(false);

  const handleMemberSelect = useCallback((member: any) => {
    setMemberNumber(member.memberNo || member.mbno || '');
    setMemberName(member.memberName || member.name || '');
  }, []);

  const fmtMoney = useCallback((n: number) =>
    new Intl.NumberFormat('en-IN', { maximumFractionDigits: 4 }).format(n || 0), []);

  // ---- Print via hidden iframe (window.print is blocked in Electron) ----
  const printWithData = useCallback((text: string) => {
    const html = `<!DOCTYPE html><html><head><title>Member Detail Ledger</title>
<style>
  body { font-family: 'Courier New', monospace; font-size: 9px; margin: 8mm; color: #000; }
  pre { white-space: pre; }
  @page { size: landscape; margin: 8mm; }
</style></head><body><pre>${escapeHtml(text)}</pre></body></html>`;
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open(); doc.write(html); doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus(); iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 400);
    }
  }, []);

  const generateReport = useCallback(async () => {
    if (!memberNumber.trim()) {
      message.warning('Please select a member');
      return;
    }
    if (fromDate.isAfter(toDate, 'day')) {
      setReport(null);
      message.error('From date must be on or before the To date.');
      return;
    }
    setReport(null);
    setLoading(true);
    try {
      const res = await apiService.getMemberColumnarLedger({
        memberNumber: memberNumber.trim(),
        fromDate: fromDate.format('YYYY-MM-DD'),
        toDate: toDate.format('YYYY-MM-DD'),
      });
      if (res.success && res.data) {
        const payload: any = res.data;
        const data: ColumnarLedger = payload?.rows ? payload : payload?.data;
        if (data && data.rows) {
          setReport(data);
          if (data.memberName) setMemberName(data.memberName);
          message.success(`${data.rows.length} dated entries`);
          if (outputType === 'printer') printWithData(buildReportText(data));
        } else {
          setReport(null);
          message.info('No records found');
        }
      } else {
        setReport(null);
        message.warning(res.message || 'No data');
      }
    } catch (error) {
      console.error('MemberLedger error:', error);
      message.error('Failed to generate report');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [memberNumber, fromDate, toDate, outputType, printWithData]);

  const handleReset = useCallback(() => {
    setMemberNumber('');
    setMemberName('');
    setFromDate(dayjs(indianFinancialYearStart()));
    setToDate(dayjs());
    setReport(null);
    setOutputType('screen');
  }, []);

  const handlePrint = useCallback(() => {
    if (report) printWithData(buildReportText(report));
  }, [report, printWithData]);

  const handleExportCSV = useCallback(() => {
    if (!report) { message.warning('No data to export'); return; }
    const rows: unknown[][] = [[
      'Report', 'Member Number', 'Member Name', 'Period From', 'Period To', 'Row Type', 'Date',
      'Share Debit', 'Share Credit', 'Share Balance',
      'Long-term Loan Debit', 'Long-term Loan Credit', 'Long-term Loan Balance',
      'Emergency Loan Debit', 'Emergency Loan Credit', 'Emergency Loan Balance',
      'CD Debit', 'CD Credit', 'CD Balance',
    ]];
    const context = ['Member Ledger', report.memberNumber, report.memberName, report.fromDate, report.toDate];
    const append = (type: string, date: string, share: LedgerCell, ltl: LedgerCell, emer: LedgerCell, cd: LedgerCell) => {
      rows.push([
        ...context, type, date,
        share.dr, share.cr, share.bal ?? '',
        ltl.dr, ltl.cr, ltl.bal ?? '',
        emer.dr, emer.cr, emer.bal ?? '',
        cd.dr, cd.cr, cd.bal ?? '',
      ]);
    };
    const appendBoundary = (type: string, balances: Balances) => rows.push([
      ...context, type, '',
      '', '', balances.share,
      '', '', balances.ltl,
      '', '', balances.emer,
      '', '', balances.cd,
    ]);
    appendBoundary('Opening Balance', report.opening);
    report.rows.forEach(row => append('Daily Activity', dayjs(row.date).format('YYYY-MM-DD'), row.share, row.ltl, row.emer, row.cd));
    appendBoundary('Closing Balance', report.closing);
    const csv = `\uFEFF${rows.map(row => row.map(csvCell).join(',')).join('\r\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `MemberLedger_${report.memberNumber}_${report.fromDate}_${report.toDate}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    message.success('CSV exported');
  }, [report]);

  const reportText = report ? buildReportText(report) : '';

  const { enabled, view, setView } = useReportViews('yearly.member-ledger');
  const spec = useColumnarSpec(report);

  const range = `${fromDate.format('DD-MMM-YYYY')} to ${toDate.format('DD-MMM-YYYY')}`;

  return (
    <ReportShell
      className="member-ledger-page aw-calm"
      title="Member Ledger"
      desc="Member detail ledger: shares, loans and compulsory deposit"
      switcher={<ReportViewSwitcher enabled={enabled} value={view} onChange={setView} />}
      actions={
        <>
          <button type="button" className="aw-btn aw-btn-ghost" onClick={handleReset}><RotateCcw size={14} /> Reset</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handleExportCSV} disabled={!report}><FileDown size={14} /> CSV</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handlePrint} disabled={!report}><Printer size={14} /> Print</button>
        </>
      }
      aside={
        <>
          <ParamCard title="Ledger" icon={<User size={14} />}>
            <div>
              <label className="aw-label" htmlFor="ml-member">Member No.</label>
              <MemberField id="ml-member" value={memberNumber} onChange={setMemberNumber} onSelect={handleMemberSelect} onSubmit={() => generateReport()} />
            </div>
            <input className="aw-input" value={memberName} readOnly placeholder="Member name" aria-label="Member name" />
            <div>
              <label className="aw-label" htmlFor="ml-from">From date</label>
              <input id="ml-from" type="date" className="aw-input" value={fromDate.format('YYYY-MM-DD')} onChange={e => e.target.value && setFromDate(dayjs(e.target.value))} />
            </div>
            <div>
              <label className="aw-label" htmlFor="ml-to">To date</label>
              <input id="ml-to" type="date" className="aw-input" value={toDate.format('YYYY-MM-DD')} onChange={e => e.target.value && setToDate(dayjs(e.target.value))} />
            </div>
            <OutputChoice value={outputType === 'printer' ? 'printer' : 'screen'} onChange={setOutputType} id="ml-output" />
            <button type="button" className="aw-btn aw-btn-primary" onClick={() => generateReport()} disabled={loading} style={{ width: '100%' }}>
              <Search size={14} className={loading ? 'aw-spin' : undefined} /> {loading ? 'Loading…' : 'Generate'}
            </button>
          </ParamCard>
          {report && (
            <StatCards items={[
              { label: 'Share', value: `₹${fmtMoney(report.closing.share)}`, tone: 'info' },
              { label: 'CD', value: `₹${fmtMoney(report.closing.cd)}`, tone: 'info' },
              { label: 'Reg. loan', value: `₹${fmtMoney(report.closing.ltl)}`, tone: 'muted' },
              { label: 'Emerg. loan', value: `₹${fmtMoney(report.closing.emer)}`, tone: 'muted' },
            ]} />
          )}
        </>
      }
      footerLeft="Member Ledger"
      footerRight={memberNumber ? `Member ${memberNumber} · ${range}` : range}
    >
      {report && view === 'bento' && <GenericBento spec={spec} />}
      {report && view === 'terminal' && <div style={{ height: 'calc(100vh - 150px)', minHeight: 360 }}><GenericTerminal spec={spec} /></div>}
      {report && view === 'editorial' && <GenericEditorial spec={spec} title="Member Detail Ledger" subtitle={range} />}
      {view === 'legacy' && (
        <LegacyDocument
          title={`Detail Ledger — Member: ${memberNumber || 'N/A'}`}
          meta={report ? `${report.rows.length} entries · ${range}` : range}
          text={reportText}
          loading={loading}
          empty={<ReportEmpty icon={<FileText size={34} />} title="No Data" hint="Select a member and generate" />}
        />
      )}
      {view !== 'legacy' && !report && (
        <ReportEmpty icon={<FileText size={34} />} title={loading ? 'Loading…' : 'No Data'} hint="Select a member and generate" />
      )}
    </ReportShell>
  );
};

export default MemberLedger;
