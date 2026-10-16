import React, { useState, useCallback, useMemo } from 'react';
import { Select, message } from 'antd';
import { FileText, Printer, Search, RotateCcw, Calendar } from 'lucide-react';
import { apiService } from '../../../../../services/api';
import dayjs from 'dayjs';
import { ReportShell, ParamCard, StatCards, OutputChoice, ReportEmpty, LegacyDocument } from '../../../../../components/reports/views/ReportShell';
import ReportViewSwitcher from '../../../../../components/reports/views/ReportViewSwitcher';
import { useReportViews } from '../../../../../components/reports/views/reportViews';
import '../../../../../components/reports/views/proViews.css';
import ClosingBento from '../views/ClosingBento';
import ClosingTerminal from '../views/ClosingTerminal';
import { fmt, type ClosingItem } from '../views/closingModel';

const REPORT_ID = 'account.closing-register';

// ── text-report helpers ───────────────────────────────────────────
const W = 110;
const ctr = (s: string) => s.padStart(Math.floor((W + s.length) / 2)).padEnd(W);
const rl  = () => '-'.repeat(W);
const lrPad = (l: string, r: string) => l + r.padStart(W - l.length);
const col = (s: string, w: number, align: 'l' | 'r' = 'l') =>
  align === 'l' ? s.substring(0, w).padEnd(w) : s.substring(0, w).padStart(w);

const fmtAmt  = (n: number) =>
  (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d?: string) => (d ? dayjs(d).format('DD-MMM-YY') : '---');

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' },   { value: 4, label: 'April' },
  { value: 5, label: 'May' },     { value: 6, label: 'June' },
  { value: 7, label: 'July' },    { value: 8, label: 'August' },
  { value: 9, label: 'September' },{ value: 10, label: 'October' },
  { value: 11, label: 'November' },{ value: 12, label: 'December' },
];

const ACCOUNT_TYPES = [
  { value: 'ALL', label: 'ALL (FD + RD)' },
  { value: 'FD',  label: 'Special Deposit (FD)' },
  { value: 'RD',  label: 'Recurring Deposit (RD)' },
];

const buildReportText = (
  data: ClosingItem[],
  monthName: string,
  year: number,
  accountType: string,
): string => {
  const lines: string[] = [];

  lines.push(ctr('Espat Karmchari Co-Operative Credit Society Limited.'));
  lines.push(ctr('Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006'));
  lines.push(lrPad('Reg No: A.R/DRG/1796', 'Tel No: 0788-2298736'));
  lines.push(rl());
  lines.push(ctr('Account Closing Register'));
  lines.push(lrPad(`Period : ${monthName} ${year}   Type : ${accountType}`, 'PageNo : 1'));
  lines.push(rl());

  // headers
  lines.push(
    col('MbNo',        11) +
    col('Name',        22) +
    col('Acc.No',      12) +
    col('Type',         6) +
    col('Closing Dt', 12) +
    col('Final Amt',  14, 'r') + '  ' +
    'Reason'
  );
  lines.push(rl());

  if (data.length === 0) {
    lines.push(ctr('No records found'));
  } else {
    data.forEach(r => {
      lines.push(
        col(String(r.memberCode),   11) +
        col(r.memberName,           22) +
        col(r.accountNo,            12) +
        col(r.accountType,           6) +
        col(fmtDate(r.closingDate), 12) +
        col(fmtAmt(r.finalAmount),  14, 'r') + '  ' +
        (r.description || '')
      );
    });
  }

  lines.push(rl());
  const totAmt = data.reduce((s, r) => s + r.finalAmount, 0);
  lines.push(
    col('', 11) +
    col(`Total Accounts : ${data.length}`, 40) +
    col(fmtAmt(totAmt), 14, 'r')
  );
  lines.push(rl());
  lines.push(ctr('Report As Per Data Available....'));

  return lines.join('\n');
};

const printReportText = (text: string) => {
  const escaped = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
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

const AccountClosingRegister: React.FC = () => {
  const [month, setMonth]             = useState<number>(dayjs().month() + 1);
  const [year, setYear]               = useState<number>(dayjs().year());
  const [accountType, setAccountType] = useState<string>('ALL');
  const [outputType, setOutputType]   = useState<'screen' | 'printer'>('screen');
  const [loading, setLoading]         = useState(false);
  const [reportText, setReportText]   = useState<string>('');
  const [recordCount, setRecordCount] = useState<number>(0);
  const [items, setItems]             = useState<ClosingItem[]>([]);
  const { enabled, view, setView }    = useReportViews(REPORT_ID);

  const monthName = useMemo(() => MONTHS.find(m => m.value === month)?.label || '', [month]);
  const periodLabel = `${monthName} ${year}`;
  const yearOptions = useMemo(() =>
    Array.from({ length: 10 }, (_, i) => {
      const y = dayjs().year() - i;
      return { value: y, label: y.toString() };
    }), []);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/reports/account-closing', {
        params: { month, year, accountType: accountType === 'ALL' ? undefined : accountType },
      });
      if (!response.success) {
        setReportText('');
        setRecordCount(0);
        setItems([]);
        message.error(response.message || response.error || 'Failed to load account closing register');
        return;
      }
      const data: ClosingItem[] = Array.isArray((response as any)?.data)
        ? (response as any).data
        : Array.isArray(response) ? (response as any) : [];

      const text = buildReportText(data, monthName, year, accountType);
      setReportText(text);
      setRecordCount(data.length);
      setItems(data);

      if (data.length === 0) message.info('No closed accounts found for this period');
      else if (outputType === 'printer') printReportText(text);
    } catch {
      message.error('Failed to load account closing register');
      setReportText('');
      setRecordCount(0);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [month, year, accountType, outputType, monthName]);

  const handleReset = useCallback(() => {
    setMonth(dayjs().month() + 1);
    setYear(dayjs().year());
    setAccountType('ALL');
    setReportText('');
    setRecordCount(0);
    setItems([]);
  }, []);

  const total = items.reduce((s, r) => s + (Number(r.finalAmount) || 0), 0);
  const hasData = items.length > 0;

  return (
    <ReportShell
      className="acr-page"
      title="Account Closing Register"
      desc="Closed accounts report"
      switcher={<ReportViewSwitcher enabled={enabled} value={view} onChange={setView} />}
      actions={
        <>
          <button type="button" className="aw-btn aw-btn-ghost" onClick={handleReset}><RotateCcw size={14} /> Reset</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={() => reportText && printReportText(reportText)} disabled={!reportText}><Printer size={14} /> Print</button>
        </>
      }
      aside={
        <>
          <ParamCard title="Period" icon={<Calendar size={14} />}>
            <div>
              <label className="aw-label" htmlFor="acr-month">Month</label>
              <Select id="acr-month" value={month} onChange={setMonth} options={MONTHS} className="aw-select" popupClassName="aw-select-popup" />
            </div>
            <div>
              <label className="aw-label" htmlFor="acr-year">Year</label>
              <Select id="acr-year" value={year} onChange={setYear} options={yearOptions} className="aw-select" popupClassName="aw-select-popup" />
            </div>
            <div>
              <label className="aw-label" htmlFor="acr-type">Account type</label>
              <Select id="acr-type" value={accountType} onChange={setAccountType} options={ACCOUNT_TYPES} className="aw-select" popupClassName="aw-select-popup" />
            </div>
            <OutputChoice value={outputType} onChange={setOutputType} id="acr-output" />
            <button type="button" className="aw-btn aw-btn-primary" onClick={handleGenerate} disabled={loading} style={{ width: '100%' }}>
              <Search size={14} className={loading ? 'aw-spin' : undefined} /> {loading ? 'Loading…' : 'Generate'}
            </button>
          </ParamCard>
          {hasData && <StatCards items={[
            { label: 'Accounts closed', value: String(recordCount), tone: 'muted' },
            { label: 'Total paid out', value: fmt(total), tone: 'success' },
          ]} />}
        </>
      }
      footerLeft="Account Closing Register"
      footerRight={periodLabel}
    >
      {/* Pro views draw the same records differently. Print is always the legacy text report. */}
      {hasData && view === 'bento' && <ClosingBento items={items} periodLabel={periodLabel} />}
      {hasData && view === 'terminal' && <div style={{ height: 'calc(100vh - 150px)', minHeight: 360 }}><ClosingTerminal items={items} periodLabel={periodLabel} /></div>}

      {view === 'legacy' && (
        <LegacyDocument
          title={`Account Closing Register · ${periodLabel}`}
          meta={recordCount > 0 ? `${recordCount} Records` : undefined}
          text={reportText}
          loading={loading}
          empty={<ReportEmpty icon={<FileText size={34} />} title="No Data" hint="Select period and generate report" />}
        />
      )}
      {view !== 'legacy' && !hasData && (
        <ReportEmpty icon={<FileText size={34} />} title={loading ? 'Loading…' : 'No Data'} hint="Select period and generate report" />
      )}
    </ReportShell>
  );
};

export default AccountClosingRegister;
