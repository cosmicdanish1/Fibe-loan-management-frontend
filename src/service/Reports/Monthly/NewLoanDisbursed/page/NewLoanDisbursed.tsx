import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DatePicker, Select } from 'antd';
import { Printer, FileDown, Settings, RefreshCw, FileText, Search } from 'lucide-react';
import dayjs, { Dayjs } from 'dayjs';
import { apiService } from '../../../../../services/api';
import { MemberLookupInput, MemberLookupData } from '../../../../../components/shared/MemberLookup';
import { csvCell } from '@/utils/csv';
import { indianFinancialYearStart } from '@/utils/dates';
import { isFromAfterTo } from '@/utils/dates';
import { ReportShell, ParamCard, StatCards, ReportEmpty } from '../../../../../components/reports/views/ReportShell';
import ReportViewSwitcher from '../../../../../components/reports/views/ReportViewSwitcher';
import { useReportViews } from '../../../../../components/reports/views/reportViews';
import '../../../../../components/reports/views/proViews.css';
import { useLoanSpec, ProBento, ProTerm, ProEd } from '../views/loanPro';
import { showDialog3 as showDialog } from '@/utils/dialog';


interface LoanRecord {
  key: string;
  mbno: string;
  memberNo: string;
  memberName: string;
  officeName: string;
  loanType: string;
  loanCaseNo: string;
  loanAmount: number;
  disbursementDate: string;
  installments: number;
  installmentAmount: number;
  interestRate: number;
}

interface LoanType {
  code: string;
  name: string;
}

// Print-only layout matching the legacy report design standard used across
// every report this session (letterhead, Date/Page Number line, dashed
// rules, TOTAL row) — plain monospace text, not a clone of the on-screen
// colorful UI. Feeds handlePrint only.
const NLD_LINE_W = 97;
const NLD_DASH = '-'.repeat(NLD_LINE_W);
const NLD_COL_SR = 4;
const NLD_COL_MBNO = 11;
const NLD_COL_NAME = 18;
const NLD_COL_TYPE = 6;
const NLD_COL_CASE = 9;
const NLD_COL_AMT = 12;
const NLD_COL_DATE = 11;
const NLD_COL_IAMT = 11;
const NLD_COL_INST = 8;
const NLD_COL_RATE = 6;

const nldFmt = (n: number) =>
  Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nldPadL = (s: string, w: number) => s.padStart(w);
const nldPadR = (s: string, w: number) => (s.length > w ? s.slice(0, w) : s.padEnd(w));
const nldCenter = (s: string, w: number) => ' '.repeat(Math.max(0, Math.floor((w - s.length) / 2))) + s;

// Word-wraps onto multiple lines instead of truncating — a name longer than
// the column used to be silently cut off (e.g. "SHAILENDRA KUMAR PANDEY"
// would have lost "PANDEY" entirely). Matches the legacy report's own
// behavior (continuation line, indented under the Name column) rather than
// its cramped zero-gap column spacing, which is a legacy rendering quirk
// not worth reproducing.
function nldWrapWords(text: string, width: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let line = '';
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (candidate.length > width && line) {
      out.push(line);
      line = w;
    } else {
      line = candidate;
    }
  }
  if (line) out.push(line);
  return out.length ? out : [''];
}

function buildNewLoanDisbursedLines(
  data: LoanRecord[], fromLabel: string, toLabel: string,
  loanTypeLabel: string, memberLabel: string,
  totalAmount: number, totalLoans: number,
): string[] {
  const lines: string[] = [];
  const now = dayjs().format('DD-MMM-YYYY/h:mmA');

  lines.push(nldCenter('Espat Karmchari Co-Operative Credit Society Limited.', NLD_LINE_W));
  lines.push(nldCenter('Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006', NLD_LINE_W));
  lines.push(nldCenter('New Loan Disbursed Register', NLD_LINE_W));
  lines.push('');
  lines.push(`Period : ${fromLabel} to ${toLabel}`);
  if (loanTypeLabel) lines.push(`Loan Type : ${loanTypeLabel}`);
  if (memberLabel) lines.push(`Member : ${memberLabel}`);
  const printedStr = `Printed : ${now}`;
  const pageStr = 'Page Number :  1';
  lines.push(`${printedStr}${nldPadL(pageStr, NLD_LINE_W - printedStr.length)}`);
  lines.push(NLD_DASH);

  lines.push(
    `${nldPadR('Sr', NLD_COL_SR)}${nldPadR('Member No', NLD_COL_MBNO)}${nldPadR('Member Name', NLD_COL_NAME)}` +
    `${nldPadR('Type', NLD_COL_TYPE)}${nldPadR('Case No', NLD_COL_CASE)}${nldPadL('Amount', NLD_COL_AMT)}` +
    `${nldPadR('Date', NLD_COL_DATE)}${nldPadL('Instl Amt', NLD_COL_IAMT)}${nldPadL('Instl', NLD_COL_INST)}${nldPadL('Rate', NLD_COL_RATE)}`
  );
  lines.push(NLD_DASH);

  data.forEach((item, i) => {
    const nameLines = nldWrapWords(item.memberName || '', NLD_COL_NAME);
    lines.push(
      `${nldPadR(String(i + 1), NLD_COL_SR)}${nldPadR(item.memberNo, NLD_COL_MBNO)}${nldPadR(nameLines[0] || '', NLD_COL_NAME)}` +
      `${nldPadR(item.loanType, NLD_COL_TYPE)}${nldPadR(item.loanCaseNo, NLD_COL_CASE)}${nldPadL(nldFmt(item.loanAmount), NLD_COL_AMT)}` +
      `${nldPadR(dayjs(item.disbursementDate).format('DD-MM-YY'), NLD_COL_DATE)}${nldPadL(nldFmt(item.installmentAmount), NLD_COL_IAMT)}` +
      `${nldPadL(String(item.installments ?? ''), NLD_COL_INST)}${nldPadL(`${item.interestRate}%`, NLD_COL_RATE)}`
    );
    for (let j = 1; j < nameLines.length; j++) {
      lines.push(`${' '.repeat(NLD_COL_SR + NLD_COL_MBNO)}${nldPadR(nameLines[j] || '', NLD_COL_NAME)}`);
    }
  });

  lines.push(NLD_DASH);
  lines.push(
    `${nldPadR(`TOTAL (${totalLoans} LOANS)`, NLD_COL_SR + NLD_COL_MBNO + NLD_COL_NAME + NLD_COL_TYPE + NLD_COL_CASE)}` +
    `${nldPadL(nldFmt(totalAmount), NLD_COL_AMT)}${' '.repeat(NLD_COL_DATE + NLD_COL_IAMT + NLD_COL_INST + NLD_COL_RATE)}`
  );
  lines.push(NLD_DASH);
  lines.push('');
  lines.push('* Report generated as per available data in the system');

  return lines;
}

const NewLoanDisbursed: React.FC = () => {
  const [data, setData] = useState<LoanRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [fromDate, setFromDate] = useState<Dayjs | null>(dayjs(indianFinancialYearStart()));
  const [toDate, setToDate] = useState<Dayjs | null>(dayjs());
  const [loanTypes, setLoanTypes] = useState<LoanType[]>([]);
  const [selectedLoanType, setSelectedLoanType] = useState<string>('');
  const [memberNo, setMemberNo] = useState<string>('');
  const [memberName, setMemberName] = useState<string>('');

  const { enabled, view, setView } = useReportViews('monthly.new-loan-disbursed');

  useEffect(() => {
    fetchLoanTypes();
    fetchLoanData();
  }, []);

  const fetchLoanTypes = async () => {
    try {
      const response = await apiService.getLoanTypes();
      if (response.success && Array.isArray(response.data)) {
        setLoanTypes(response.data);
      } else if (Array.isArray(response)) {
        // Handle direct array response
        setLoanTypes(response);
      }
    } catch (error) {
      console.error('Error fetching loan types:', error);
    }
  };

  const fetchLoanData = async () => {
    if (!fromDate || !toDate) {
      await showDialog('warning', 'Validation', 'Please select date range');
      return;
    }

    if (fromDate && toDate && isFromAfterTo(fromDate.format('YYYY-MM-DD'), toDate.format('YYYY-MM-DD'))) {
      await showDialog('warning', 'Validation', 'From date cannot be after To date');
      return;
    }
    setLoading(true);
    try {
      const response = await apiService.getNewLoanDisbursed(
        fromDate.format('YYYY-MM-DD'),
        toDate.format('YYYY-MM-DD'),
        selectedLoanType || undefined,
        memberNo || undefined
      );

      if (response.success && response.data && Array.isArray(response.data.data)) {
        const formattedData = response.data.data.map((item: any, index: number) => ({
          key: index.toString(),
          mbno: item.memberNo,
          memberNo: item.memberNo,
          memberName: item.memberName,
          officeName: item.officeName || '',
          loanType: item.loanType,
          loanCaseNo: item.loanCaseNo,
          loanAmount: item.loanAmount,
          disbursementDate: item.disbursementDate,
          installments: item.installments,
          installmentAmount: item.installmentAmount,
          interestRate: item.interestRate
        }));
        setData(formattedData);
      } else {
        setData([]);
        await showDialog('warning', 'No Data', 'No loan disbursement data found');
      }
    } catch (error) {
      console.error('Error fetching loan data:', error);
      await showDialog('error', 'Fetch Error', 'Failed to load loan disbursement data');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Memoized calculations for performance
  const { totalAmount, totalLoans } = useMemo(() => {
    const totalAmount = data.reduce((sum, item) => sum + (Number(item.loanAmount) || 0), 0);
    const totalLoans = data.length;
    return { totalAmount, totalLoans };
  }, [data]);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }, []);

  // window.print() used to be used here with almost no print-specific CSS at
  // all — no background/color reset, only the sidebar hidden. Printing while
  // the app is in dark mode (the mode used throughout this session) would
  // have produced a solid near-black page. Switched to the same hidden-
  // iframe + monospace lines[] technique used everywhere else — an isolated
  // document that can never inherit the parent page's dark styling.
  const handlePrint = async () => {
    if (data.length === 0) {
      await showDialog('warning', 'No Data', 'No data available for printing');
      return;
    }
    const loanTypeLabel = selectedLoanType
      ? (loanTypes.find(t => t.code === selectedLoanType)?.name || selectedLoanType)
      : '';
    const memberLabel = memberNo ? `${memberNo}${memberName ? ` - ${memberName}` : ''}` : '';
    const lines = buildNewLoanDisbursedLines(
      data, fromDate?.format('DD-MMM-YYYY') || '', toDate?.format('DD-MMM-YYYY') || '',
      loanTypeLabel, memberLabel, totalAmount, totalLoans,
    );
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><title>New Loan Disbursed</title>
<style>
  @page { size: A4 portrait; margin: 10mm; }
  body { margin: 0; }
  pre { font-family: 'Courier New', Courier, monospace; font-size: 7.5pt; white-space: pre; width: fit-content; margin: 0 auto; }
</style></head><body><pre>${lines.join('\n')}</pre></body></html>`);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 300);
    }
  };

  const exportToCSV = async () => {
    if (data.length === 0) {
      await showDialog('warning', 'No Data', 'No data available for export');
      return;
    }

    const headers = ['Member No', 'Member Name', 'Office', 'Loan Type', 'Case No', 'Amount', 'Date', 'Install', 'Install Amt', 'Rate'];
    const csvData = data.map(item => [
      item.memberNo,
      item.memberName,
      item.officeName,
      item.loanType,
      item.loanCaseNo,
      item.loanAmount,
      dayjs(item.disbursementDate).format('DD-MM-YYYY'),
      item.installments,
      item.installmentAmount,
      item.interestRate
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => csvCell(cell)).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `new_loan_disbursed_${fromDate?.format('YYYY-MM-DD')}_to_${toDate?.format('YYYY-MM-DD')}.csv`;
    link.click();
  };

  const spec = useLoanSpec(data, `${fromDate?.format('DD MMM YYYY')} - ${toDate?.format('DD MMM YYYY')}`);

  return (
    <ReportShell
      className="nld-page"
      title="New Loan Disbursed"
      desc="Loans disbursed in a period"
      switcher={<ReportViewSwitcher enabled={enabled} value={view} onChange={setView} />}
      actions={
        <>
          <button type="button" className="aw-btn aw-btn-ghost" onClick={() => { setFromDate(dayjs(indianFinancialYearStart())); setToDate(dayjs()); setSelectedLoanType(''); setMemberNo(''); setMemberName(''); setData([]); }}><RefreshCw size={14} /> Reset</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={exportToCSV} disabled={!(data.length > 0)}><FileDown size={14} /> CSV</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handlePrint} disabled={!(data.length > 0)}><Printer size={14} /> Print</button>
        </>
      }
      aside={
        <>
          <ParamCard title="Parameters" icon={<Settings size={14} />}>
            <div>
              <label className="aw-label" htmlFor="nld-from">From date</label>
              <DatePicker id="nld-from" className="aw-picker" popupClassName="aw-select-popup" style={{ width: '100%' }} value={fromDate} onChange={setFromDate} format="DD-MMM-YYYY" allowClear={false} />
            </div>
            <div>
              <label className="aw-label" htmlFor="nld-to">To date</label>
              <DatePicker id="nld-to" className="aw-picker" popupClassName="aw-select-popup" style={{ width: '100%' }} value={toDate} onChange={setToDate} format="DD-MMM-YYYY" allowClear={false} />
            </div>
            <div>
              <label className="aw-label">Member no (optional)</label>
              <MemberLookupInput
                value={memberNo}
                onChange={(no: string, d?: MemberLookupData) => { setMemberNo(no); setMemberName(d?.memberName || ''); }}
                placeholder="Type to search member..."
              />
              {memberName && <span className="aw-meta">{memberName}</span>}
            </div>
            <div>
              <label className="aw-label" htmlFor="nld-type">Loan type</label>
              <Select id="nld-type" {...(selectedLoanType ? { value: selectedLoanType } : {})} onChange={(v?: string) => setSelectedLoanType(v ?? '')} className="aw-select" popupClassName="aw-select-popup" placeholder="All loan types" allowClear showSearch
                filterOption={(input, option) => String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                options={loanTypes.map(t => ({ value: t.code, label: `${t.name} (${t.code})` }))} />
            </div>
            <button type="button" className="aw-btn aw-btn-primary" onClick={fetchLoanData} disabled={loading} style={{ width: '100%' }}>
              <Search size={14} className={loading ? 'aw-spin' : undefined} /> {loading ? 'Loading…' : 'Load Report'}
            </button>
          </ParamCard>
          {data.length > 0 && <StatCards items={[{ label: 'Total amount', value: formatCurrency(totalAmount), tone: 'success' }, { label: 'Total loans', value: String(totalLoans), tone: 'muted' }]} />}
        </>
      }
      footerLeft="New Loan Disbursed"
      footerRight={`${fromDate?.format('DD MMM YYYY')} - ${toDate?.format('DD MMM YYYY')}`}
    >
      {data.length > 0 && view === 'bento' && <ProBento spec={spec} />}
      {data.length > 0 && view === 'terminal' && <div style={{ height: 'calc(100vh - 150px)', minHeight: 360 }}><ProTerm spec={spec} /></div>}
      {data.length > 0 && view === 'editorial' && <ProEd spec={spec} subtitle={`${fromDate?.format('DD-MMM-YYYY')} to ${toDate?.format('DD-MMM-YYYY')}`} />}

      {view === 'legacy' && (
        <section className="aw-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="aw-main-head">
            <span className="aw-card-title">Loan Disbursement Register</span>
            <span className="aw-meta">{`${fromDate?.format('DD MMM YYYY')} - ${toDate?.format('DD MMM YYYY')}`}</span>
          </div>
          <div className="nld-page-preview-body" style={{ padding: 'var(--aw-pad)', overflow: 'auto' }}>
              {data.length > 0 ? (
                <div>
                  <div className="aw-stack" style={{ textAlign: 'center', gap: 2, marginBottom: 12 }}>
                    <div className="aw-strong">Espat Karmchari Co-Operative Credit Society Limited</div>
                    <div className="aw-meta">Avenue A, Sahakari Sadan, Sector-6, AT Post: Bhilai Nagar, Dist: DURG-490006</div>
                    <div className="aw-meta" style={{ display: 'flex', justifyContent: 'space-between' }}><span>Reg No: A.R/DRG/1796</span><span>Tel No: 0788-2298736</span></div>
                    <div className="aw-strong" style={{ marginTop: 8, letterSpacing: '.08em' }}>NEW LOAN DISBURSED REGISTER</div>
                  </div>
                  <p className="aw-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 22px', marginBottom: 10 }}>
                    <span><b>Period:</b> {fromDate?.format('DD-MMM-YYYY')} to {toDate?.format('DD-MMM-YYYY')}</span>
                    <span><b>Generated:</b> {dayjs().format('DD-MMM-YYYY h:mmA')}</span>
                    {selectedLoanType && <span><b>Loan type:</b> {loanTypes.find(t => t.code === selectedLoanType)?.name || selectedLoanType}</span>}
                    {memberNo && <span><b>Member:</b> {memberNo}{memberName ? ` - ${memberName}` : ''}</span>}
                  </p>
                  <div className="aw-table-wrap" style={{ maxHeight: 'none' }}>
                    <table className="aw-table">
                      <thead>
                        <tr><th>SR</th><th>Member no</th><th>Member name</th><th>Loan type</th><th>Case no</th><th className="is-right">Amount</th><th>Date</th><th className="is-right">Install amt</th><th className="is-right">Install</th><th className="is-right">Rate %</th></tr>
                      </thead>
                      <tbody>
                        {data.map((item, index) => (
                          <tr key={item.key}>
                            <td className="is-muted">{index + 1}</td>
                            <td className="is-accent">{item.memberNo}</td>
                            <td>{item.memberName}</td>
                            <td>{item.loanType}</td>
                            <td>{item.loanCaseNo}</td>
                            <td className="is-right is-success">{formatCurrency(item.loanAmount)}</td>
                            <td>{dayjs(item.disbursementDate).format('DD-MM-YYYY')}</td>
                            <td className="is-right">{formatCurrency(item.installmentAmount)}</td>
                            <td className="is-right">{item.installments}</td>
                            <td className="is-right">{item.interestRate}%</td>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={5} className="is-right"><b>Total ({totalLoans} loans)</b></td>
                          <td className="is-right"><b>{formatCurrency(totalAmount)}</b></td>
                          <td colSpan={4}></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="aw-meta" style={{ textAlign: 'center', marginTop: 10, fontStyle: 'italic' }}>* Report generated as per available data in the system</p>
                </div>
              ) : (
                <ReportEmpty icon={<FileText size={34} />} title="No Data" hint="No disbursements found for the selected period" />
              )}
          </div>
        </section>
      )}
      {view !== 'legacy' && !(data.length > 0) && (
        <ReportEmpty icon={<FileText size={34} />} title={loading ? 'Loading…' : 'No Data'} hint="No disbursements found for the selected period" />
      )}
    </ReportShell>
  );
};

export default NewLoanDisbursed;
