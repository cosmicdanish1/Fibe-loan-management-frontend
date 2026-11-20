import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { isFailure, notifyError } from '@/utils/dialog';
import { message } from 'antd';
import { FileText, Printer, Search, RotateCcw, User } from 'lucide-react';
import { apiService } from '../../../../../services/api';
import MemberField from '../../../../../components/shared/kit/MemberField';
import dayjs from 'dayjs';
import { ReportShell, ParamCard, StatCards, OutputChoice, ReportEmpty } from '../../../../../components/reports/views/ReportShell';
import ReportViewSwitcher from '../../../../../components/reports/views/ReportViewSwitcher';
import { GenericBento, GenericEditorial, GenericTerminal } from '../../../../../components/reports/views/GenericPro';
import { useReportViews } from '../../../../../components/reports/views/reportViews';
import '../../../../../components/reports/views/proViews.css';
import { useSuretySpec } from '../views/suretyPro';

interface SuretyRecord {
  key: string;
  mbno: string;
  memberName: string;
  loanNo: string;
  loanType: string;
  loanAmount: number;
  suretyMbno: string;
  suretyName: string;
  outstandingBalance: number;
}

interface LoanTypeOption {
  code: string;
  name: string;
}

const fmtAmt = (n: number) =>
  (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const printReport = (reportHtml: string) => {
  const html = `<html><head><style>
    @page{size:landscape;margin:10mm}
    body{font-family:'Courier New',monospace;font-size:10px;background:white}
    .company-header{text-align:center;margin-bottom:10px;padding:6px;border:2px solid #0ea5e9}
    .company-name{font-weight:900;font-size:13px}
    .company-address,.company-contact{font-size:9px;margin-top:2px}
    .company-contact{display:flex;justify-content:space-between}
    .report-title{text-align:center;font-weight:900;font-size:14px;margin:8px 0;letter-spacing:2px;padding:6px;border:2px solid #0ea5e9}
    .report-info{margin:8px 0;padding:6px;border:1px solid #ccc}
    .info-row{display:flex;justify-content:space-between;font-size:9px;padding:2px 0}
    .table-header{display:flex;font-weight:900;padding:6px 4px;background:#0ea5e9;color:white;font-size:10px}
    .table-row{display:flex;padding:5px 4px;border-bottom:1px solid #ddd;font-size:9px}
    .table-row:nth-child(even){background:#f0f9ff}
    .total-row{display:flex;font-weight:900;padding:8px 4px;border-top:2px solid #000;font-size:10px}
    .col-sr{width:4%}.col-mbno{width:10%}.col-name{width:18%}
    .col-loan{width:11%}.col-type{width:7%}.col-amount{width:12%;text-align:right}
    .col-surety-mbno{width:10%}.col-surety-name{width:18%}.col-balance{width:10%;text-align:right}
  </style></head><body>${reportHtml}</body></html>`;
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  iframe.contentDocument!.open();
  iframe.contentDocument!.write(html);
  iframe.contentDocument!.close();
  setTimeout(() => iframe.contentWindow!.print(), 100);
  setTimeout(() => document.body.removeChild(iframe), 1500);
};

const SuretyRegisterReport: React.FC = () => {
  const [memberFrom, setMemberFrom]   = useState('');
  const [memberTo, setMemberTo]       = useState('');
  const [loanType, setLoanType]       = useState<string>('');
  const [loanTypes, setLoanTypes]     = useState<LoanTypeOption[]>([]);
  const [outputType, setOutputType]   = useState<'screen' | 'printer'>('screen');
  const [loading, setLoading]         = useState(false);
  const [reportData, setReportData]   = useState<SuretyRecord[]>([]);

  // Load loan types on mount
  useEffect(() => {
    apiService.get('/reports/loan-types')
      .then((res: any) => {
        const list: LoanTypeOption[] = Array.isArray(res) ? res : (res?.data ?? []);
        setLoanTypes(list);
      })
      .catch(() => {});
  }, []);

  const pickMember = (member: any) => String(member.memberNo || member.mbno || '');

  const handleGenerate = useCallback(async () => {
    if (!memberFrom.trim() || !memberTo.trim()) {
      message.warning('Please enter From and To Member Numbers');
      return;
    }
    setLoading(true);
    try {
      const params: { memberFrom: string; memberTo: string; loanType?: string } = { memberFrom, memberTo };
      if (loanType) params.loanType = loanType;
      const response = await apiService.getSuretyRegister(params);
      if (isFailure(response)) { await notifyError(response, 'load the surety register'); return; }
      const data: SuretyRecord[] = Array.isArray(response)
        ? response
        : Array.isArray((response as any)?.data)
        ? (response as any).data
        : [];
      setReportData(data);
      if (data.length === 0) message.info('No surety records found in this range');
      else if (outputType === 'printer') {
        // Build HTML for print
        const html = buildPrintHtml(data, memberFrom, memberTo, loanType);
        printReport(html);
      }
    } catch {
      message.error('Failed to generate surety register');
      setReportData([]);
    } finally {
      setLoading(false);
    }
  }, [memberFrom, memberTo, loanType, outputType]);

  const buildPrintHtml = (
    data: SuretyRecord[],
    from: string,
    to: string,
    lt: string
  ): string => {
    const totLoan = data.reduce((s, r) => s + r.loanAmount, 0);
    const totBal  = data.reduce((s, r) => s + r.outstandingBalance, 0);
    const rows = data.map((r, i) => `
      <div class="table-row">
        <span class="col-sr">${i + 1}</span>
        <span class="col-mbno">${r.mbno}</span>
        <span class="col-name">${r.memberName}</span>
        <span class="col-loan">${r.loanNo}</span>
        <span class="col-type">${r.loanType}</span>
        <span class="col-amount">${fmtAmt(r.loanAmount)}</span>
        <span class="col-surety-mbno">${r.suretyMbno || '-'}</span>
        <span class="col-surety-name">${r.suretyName || '-'}</span>
        <span class="col-balance">${fmtAmt(r.outstandingBalance)}</span>
      </div>`).join('');

    return `
      <div class="company-header">
        <div class="company-name">Espat Karmchari Co-Operative Credit Society Limited.</div>
        <div class="company-address">Avenue A, Sahakari Sadan, Sector-C, AT Post:Bhilai Nagar,Dist:DURG-490006</div>
        <div class="company-contact"><span>Reg No: A.R/DRG/1796</span><span>Tel: 0788-2298736</span></div>
      </div>
      <div class="report-title">SURETY REGISTER</div>
      <div class="report-info">
        <div class="info-row"><span>From Member: ${from}</span><span>To Member: ${to}</span><span>Loan Type: ${lt || 'ALL'}</span><span>Generated: ${dayjs().format('DD-MMM-YYYY HH:mm')}</span></div>
      </div>
      <div class="table-header">
        <span class="col-sr">SR</span>
        <span class="col-mbno">Member No</span>
        <span class="col-name">Member Name</span>
        <span class="col-loan">Loan No</span>
        <span class="col-type">Type</span>
        <span class="col-amount">Loan Amount</span>
        <span class="col-surety-mbno">Surety No</span>
        <span class="col-surety-name">Surety Name</span>
        <span class="col-balance">Outstanding</span>
      </div>
      ${rows}
      <div class="total-row">
        <span class="col-sr"></span>
        <span class="col-mbno"></span>
        <span class="col-name">Total: ${data.length} Records</span>
        <span class="col-loan"></span>
        <span class="col-type"></span>
        <span class="col-amount">${fmtAmt(totLoan)}</span>
        <span class="col-surety-mbno"></span>
        <span class="col-surety-name"></span>
        <span class="col-balance">${fmtAmt(totBal)}</span>
      </div>`;
  };

  const handleReset = useCallback(() => {
    setMemberFrom('');
    setMemberTo('');
    setLoanType('');
    setReportData([]);
  }, []);

  const totals = useMemo(() => ({
    count: reportData.length,
    totalLoan: reportData.reduce((s, r) => s + r.loanAmount, 0),
    totalOutstanding: reportData.reduce((s, r) => s + r.outstandingBalance, 0),
  }), [reportData]);

  const loanTypeOptions = [
    { value: '', label: 'ALL (All Types)' },
    ...loanTypes.map(t => ({ value: t.code, label: `${t.code} - ${t.name}` })),
  ];

  const { enabled, view, setView } = useReportViews('surety-register');
  const spec = useSuretySpec(reportData, loanType || 'all loan types');

  const hasData = reportData.length > 0;
  const range = `${memberFrom} – ${memberTo}`;

  return (
    <ReportShell
      className="suretyreg-page aw-calm"
      title="Surety Register"
      desc="Guarantor report"
      switcher={<ReportViewSwitcher enabled={enabled} value={view} onChange={setView} />}
      actions={
        <>
          <button type="button" className="aw-btn aw-btn-ghost" onClick={handleReset}><RotateCcw size={14} /> Reset</button>
          <button type="button" className="aw-btn aw-btn-secondary" disabled={!hasData}
            onClick={() => { if (hasData) printReport(buildPrintHtml(reportData, memberFrom, memberTo, loanType)); }}><Printer size={14} /> Print</button>
        </>
      }
      aside={
        <>
          <ParamCard title="Member range" icon={<User size={14} />}>
            <div>
              <label className="aw-label" htmlFor="sr-from">From member</label>
              <MemberField id="sr-from" value={memberFrom} onChange={setMemberFrom} onSelect={m => setMemberFrom(pickMember(m))} ariaLabel="From member number" />
            </div>
            <div>
              <label className="aw-label" htmlFor="sr-to">To member</label>
              <MemberField id="sr-to" value={memberTo} onChange={setMemberTo} onSelect={m => setMemberTo(pickMember(m))} onSubmit={() => handleGenerate()} ariaLabel="To member number" />
            </div>
            <div>
              <label className="aw-label" htmlFor="sr-type">Loan type</label>
              <select id="sr-type" className="aw-input" value={loanType} onChange={e => setLoanType(e.target.value)}>
                {loanTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <OutputChoice value={outputType} onChange={setOutputType} id="sr-output" />
            <button type="button" className="aw-btn aw-btn-primary" onClick={() => handleGenerate()} disabled={loading} style={{ width: '100%' }}>
              <Search size={14} className={loading ? 'aw-spin' : undefined} /> {loading ? 'Loading…' : 'Generate'}
            </button>
          </ParamCard>
          {hasData && <StatCards items={[{ label: 'Records', value: String(totals.count), tone: 'muted' }]} />}
        </>
      }
      footerLeft="Surety Register"
      footerRight={memberFrom && memberTo ? range : ''}
    >
      {hasData && view === 'bento' && <GenericBento spec={spec} />}
      {hasData && view === 'terminal' && <div style={{ height: 'calc(100vh - 150px)', minHeight: 360 }}><GenericTerminal spec={spec} /></div>}
      {hasData && view === 'editorial' && <GenericEditorial spec={spec} title="Surety Register" subtitle={`${range} · ${loanType || 'ALL'}`} />}

      {view === 'legacy' && hasData && (
        <section className="aw-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="aw-main-head">
            <span className="aw-card-title">Surety Register · {range}</span>
            <span className="aw-meta">{totals.count} Records</span>
          </div>
          <div style={{ padding: 'var(--aw-pad)', overflow: 'auto' }}>
            {/* Society header, title and filters, as on the printed register */}
            <div className="aw-stack" style={{ textAlign: 'center', gap: 2, marginBottom: 12 }}>
              <div className="aw-strong">Espat Karmchari Co-Operative Credit Society Limited.</div>
              <div className="aw-meta">Avenue A, Sahakari Sadan, Sector-C, AT Post:Bhilai Nagar,Dist:DURG-490006</div>
              <div className="aw-meta" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Reg No: A.R/DRG/1796</span><span>Tel: 0788-2298736</span>
              </div>
              <div className="aw-strong" style={{ marginTop: 8, letterSpacing: '.08em' }}>SURETY REGISTER</div>
            </div>
            <p className="aw-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 22px', marginBottom: 10 }}>
              <span><b>From:</b> {memberFrom}</span>
              <span><b>To:</b> {memberTo}</span>
              <span><b>Type:</b> {loanType || 'ALL'}</span>
              <span><b>Generated:</b> {dayjs().format('DD-MMM-YYYY HH:mm')}</span>
              <span><b>Records:</b> {totals.count}</span>
            </p>
            <div className="aw-table-wrap">
              <table className="aw-table">
                <thead>
                  <tr><th>SR</th><th>Member No</th><th>Member Name</th><th>Loan No</th><th>Type</th><th className="is-right">Loan Amt</th><th>Surety No</th><th>Surety Name</th><th className="is-right">Outstanding</th></tr>
                </thead>
                <tbody>
                  {reportData.map((item, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td><b>{item.mbno}</b></td>
                      <td>{item.memberName}</td>
                      <td>{item.loanNo}</td>
                      <td className="is-muted">{item.loanType}</td>
                      <td className="is-right">{fmtAmt(item.loanAmount)}</td>
                      <td>{item.suretyMbno || '-'}</td>
                      <td>{item.suretyName || '-'}</td>
                      <td className="is-right">{fmtAmt(item.outstandingBalance)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={5}><b>Total: {totals.count} Records</b></td>
                    <td className="is-right"><b>{fmtAmt(totals.totalLoan)}</b></td>
                    <td colSpan={2}></td>
                    <td className="is-right"><b>{fmtAmt(totals.totalOutstanding)}</b></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="aw-meta" style={{ textAlign: 'center', marginTop: 10, fontStyle: 'italic' }}>Report As Per Data Available....</p>
          </div>
        </section>
      )}
      {!hasData && (
        <ReportEmpty icon={<FileText size={34} />} title={loading ? 'Loading…' : 'No Data'} hint="Enter member range and generate report" />
      )}
    </ReportShell>
  );
};

export default SuretyRegisterReport;
