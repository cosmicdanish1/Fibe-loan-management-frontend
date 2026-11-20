import React, { useState, useCallback, useMemo } from 'react';
import { message } from 'antd';
import { FileText, Printer, Search, RotateCcw, Wallet } from 'lucide-react';
import { apiService } from '../../../../services/api';
import dayjs from 'dayjs';
import { isFromAfterTo } from '@/utils/dates';
import { ReportShell, ParamCard, StatCards, OutputChoice, ReportEmpty } from '../../../../components/reports/views/ReportShell';
import ReportViewSwitcher from '../../../../components/reports/views/ReportViewSwitcher';
import { GenericBento, GenericEditorial, GenericTerminal } from '../../../../components/reports/views/GenericPro';
import { useReportViews } from '../../../../components/reports/views/reportViews';
import { useDdrSpec } from '../views/ddrPro';

interface DepositRecord {
  key: string;
  accountNo: string;
  memberNo: string;
  memberName: string;
  depositType: string;
  amount: number;
  depositDate: string;
  dueDate: string;
  interestRate: number;
  maturityAmount: number;
}

const fmtAmt = (n: number) =>
  (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d?: string) => (d ? dayjs(d).format('DD-MMM-YY') : '---');

const DEPOSIT_TYPES = [
  { value: 'ALL',               label: 'ALL (Both Types)' },
  { value: 'Fixed Deposit',     label: 'SPECIAL DEPOSIT (FD)' },
  { value: 'Recurring Deposit', label: 'RD/CD' },
];

const SOCIETY = {
  name: 'Espat Karmchari Co-Operative Credit Society Limited.',
  addr: 'Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006',
  reg:  'Reg No: A.R/DRG/1796',
  tel:  'Tel No: 0788-2298736',
};

const printReport = (html: string) => {
  const doc = `<html><head><style>
    @page{size:landscape;margin:10mm}
    body{font-family:'Courier New',monospace;font-size:9px;background:white}
    .hdr{text-align:center;margin-bottom:8px;padding:6px;border:1px solid #ccc}
    .hdr .nm{font-weight:900;font-size:12px}
    .hdr .addr{font-size:8px;margin-top:2px}
    .hdr .contact{display:flex;justify-content:space-between;font-size:8px;margin-top:2px}
    .title{text-align:center;font-weight:900;font-size:12px;margin:6px 0;padding:4px;border:1px solid #ccc;letter-spacing:2px}
    .info{display:flex;justify-content:space-between;font-size:8px;margin:4px 0;padding:3px;border:1px solid #eee}
    .th{display:flex;font-weight:900;padding:4px 2px;background:#555;color:white;font-size:8px}
    .tr{display:flex;padding:3px 2px;border-bottom:1px solid #eee;font-size:8px}
    .tr:nth-child(even){background:#f9f9f9}
    .tf{display:flex;font-weight:900;padding:5px 2px;border-top:2px solid #000;font-size:9px}
    .c1{width:9%}.c2{width:17%}.c3{width:9%}.c4{width:6%}.c5{width:6%;text-align:right}
    .c6{width:10%}.c7{width:13%;text-align:right}.c8{width:10%}.c9{width:13%;text-align:right}
  </style></head><body>${html}</body></html>`;
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  iframe.contentDocument!.open();
  iframe.contentDocument!.write(doc);
  iframe.contentDocument!.close();
  setTimeout(() => iframe.contentWindow!.print(), 100);
  setTimeout(() => document.body.removeChild(iframe), 1500);
};

const DepositDueDateRegister: React.FC = () => {
  const [fromDate, setFromDate]     = useState<dayjs.Dayjs>(dayjs());
  const [toDate, setToDate]         = useState<dayjs.Dayjs>(dayjs().add(30, 'days'));
  const [depositType, setDepositType] = useState<string>('ALL');
  const [outputType, setOutputType] = useState<'screen' | 'printer'>('screen');
  const [loading, setLoading]       = useState(false);
  const [reportData, setReportData] = useState<DepositRecord[]>([]);

  const handleGenerate = useCallback(async () => {
    if (fromDate && toDate && isFromAfterTo(fromDate.format('YYYY-MM-DD'), toDate.format('YYYY-MM-DD'))) {
      message.warning('From date cannot be after To date');
      return;
    }
    setLoading(true);
    try {
      const response = await apiService.post('/reports/deposit/maturity', {
        fromDate: fromDate.format('YYYY-MM-DD'),
        toDate: toDate.format('YYYY-MM-DD'),
        depositType: depositType === 'ALL' ? undefined : depositType,
      });
      if (!response.success) {
        setReportData([]);
        message.error(response.message || response.error || 'Failed to generate report');
        return;
      }
      const data: DepositRecord[] = Array.isArray(response)
        ? response
        : Array.isArray((response as any)?.data)
        ? (response as any).data
        : [];
      setReportData(data);
      if (data.length === 0) message.info('No deposits maturing in this period');
      else if (outputType === 'printer') {
        printReport(buildPrintHtml(data));
      }
    } catch {
      message.error('Failed to generate report');
      setReportData([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, depositType, outputType]);

  const buildPrintHtml = (data: DepositRecord[]): string => {
    const totAmt = data.reduce((s, r) => s + r.amount, 0);
    const totMat = data.reduce((s, r) => s + r.maturityAmount, 0);
    const rows = data.map(r => `
      <div class="tr">
        <span class="c1">${r.memberNo}</span>
        <span class="c2">${r.memberName}</span>
        <span class="c3">${r.accountNo}</span>
        <span class="c4">${r.depositType === 'Fixed Deposit' ? 'FD' : 'RD'}</span>
        <span class="c5">${r.interestRate}%</span>
        <span class="c6">${fmtDate(r.depositDate)}</span>
        <span class="c7">${fmtAmt(r.amount)}</span>
        <span class="c8">${fmtDate(r.dueDate)}</span>
        <span class="c9">${fmtAmt(r.maturityAmount)}</span>
      </div>`).join('');

    return `
      <div class="hdr">
        <div class="nm">${SOCIETY.name}</div>
        <div class="addr">${SOCIETY.addr}</div>
        <div class="contact"><span>${SOCIETY.reg}</span><span>${SOCIETY.tel}</span></div>
      </div>
      <div class="title">DEPOSIT DUE DATE REGISTER</div>
      <div class="info">
        <span>From Date: ${fromDate.format('DD-MMM-YYYY')}</span>
        <span>To Date: ${toDate.format('DD-MMM-YYYY')}</span>
        <span>Type: ${depositType}</span>
        <span>Generated: ${dayjs().format('DD-MMM-YYYY HH:mm')}</span>
        <span>Total: ${data.length}</span>
      </div>
      <div class="th">
        <span class="c1">MbNo</span><span class="c2">Name</span><span class="c3">Acc.No</span>
        <span class="c4">Type</span><span class="c5">Rate</span>
        <span class="c6">Deposit Date</span><span class="c7">Deposit Amt</span>
        <span class="c8">Maturity Date</span><span class="c9">Maturity Amt</span>
      </div>
      ${rows}
      <div class="tf">
        <span class="c1"></span><span class="c2">Total: ${data.length}</span>
        <span class="c3"></span><span class="c4"></span><span class="c5"></span>
        <span class="c6"></span><span class="c7">${fmtAmt(totAmt)}</span>
        <span class="c8"></span><span class="c9">${fmtAmt(totMat)}</span>
      </div>`;
  };

  const handleReset = useCallback(() => {
    setFromDate(dayjs());
    setToDate(dayjs().add(30, 'days'));
    setDepositType('ALL');
    setReportData([]);
  }, []);

  const totals = useMemo(() => ({
    count:         reportData.length,
    totalAmount:   reportData.reduce((s, r) => s + r.amount, 0),
    totalMaturity: reportData.reduce((s, r) => s + r.maturityAmount, 0),
  }), [reportData]);

  const { enabled, view, setView } = useReportViews('deposit-due-date-register');
  const spec = useDdrSpec(reportData, `${fromDate.format('DD MMM')} - ${toDate.format('DD MMM YYYY')}`);

  const hasData = reportData.length > 0;
  const range = `${fromDate.format('DD-MMM-YYYY')} to ${toDate.format('DD-MMM-YYYY')}`;

  return (
    <ReportShell
      className="ddr-page aw-calm"
      title="Deposit Due Date Register"
      desc="Deposits maturing in a date range"
      switcher={<ReportViewSwitcher enabled={enabled} value={view} onChange={setView} />}
      actions={
        <>
          <button type="button" className="aw-btn aw-btn-ghost" onClick={handleReset}><RotateCcw size={14} /> Reset</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={() => hasData && printReport(buildPrintHtml(reportData))} disabled={!hasData}><Printer size={14} /> Print</button>
        </>
      }
      aside={
        <>
          <ParamCard title="Parameters" icon={<Wallet size={14} />}>
            <div>
              <label className="aw-label" htmlFor="ddr-from">From date</label>
              <input id="ddr-from" type="date" className="aw-input" value={fromDate.format('YYYY-MM-DD')} onChange={e => e.target.value && setFromDate(dayjs(e.target.value))} />
            </div>
            <div>
              <label className="aw-label" htmlFor="ddr-to">To date</label>
              <input id="ddr-to" type="date" className="aw-input" value={toDate.format('YYYY-MM-DD')} onChange={e => e.target.value && setToDate(dayjs(e.target.value))} />
            </div>
            <div>
              <label className="aw-label" htmlFor="ddr-type">Deposit type</label>
              <select id="ddr-type" className="aw-input" value={depositType} onChange={e => setDepositType(e.target.value)}>
                {DEPOSIT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <OutputChoice value={outputType} onChange={setOutputType} id="ddr-output" />
            <button type="button" className="aw-btn aw-btn-primary" onClick={() => handleGenerate()} disabled={loading} style={{ width: '100%' }}>
              <Search size={14} className={loading ? 'aw-spin' : undefined} /> {loading ? 'Loading…' : 'Generate'}
            </button>
          </ParamCard>
          {hasData && (
            <StatCards items={[
              { label: 'Deposits', value: String(totals.count), tone: 'muted' },
              { label: 'Deposit amount', value: `₹${fmtAmt(totals.totalAmount)}`, tone: 'info' },
              { label: 'Maturity amount', value: `₹${fmtAmt(totals.totalMaturity)}`, tone: 'success' },
            ]} />
          )}
        </>
      }
      footerLeft="Deposit Due Date Register"
      footerRight={range}
    >
      {hasData && view === 'bento' && <GenericBento spec={spec} />}
      {hasData && view === 'terminal' && <div style={{ height: 'calc(100vh - 150px)', minHeight: 360 }}><GenericTerminal spec={spec} /></div>}
      {hasData && view === 'editorial' && <GenericEditorial spec={spec} title="Deposit Due Date Register" subtitle={range} />}

      {hasData && view === 'legacy' && (
        <section className="aw-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="aw-main-head">
            <span className="aw-card-title">Deposit Due Date Register · {range}</span>
            <span className="aw-meta">{totals.count} Deposits</span>
          </div>
          <div style={{ padding: 'var(--aw-pad)', overflow: 'auto' }}>
            <div className="aw-stack" style={{ textAlign: 'center', gap: 2, marginBottom: 12 }}>
              <div className="aw-strong">{SOCIETY.name}</div>
              <div className="aw-meta">{SOCIETY.addr}</div>
              <div className="aw-meta" style={{ display: 'flex', justifyContent: 'space-between' }}><span>{SOCIETY.reg}</span><span>{SOCIETY.tel}</span></div>
              <div className="aw-strong" style={{ marginTop: 8, letterSpacing: '.08em' }}>DEPOSIT DUE DATE REGISTER</div>
            </div>
            <p className="aw-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 22px', marginBottom: 10 }}>
              <span><b>From:</b> {fromDate.format('DD-MMM-YYYY')}</span>
              <span><b>To:</b> {toDate.format('DD-MMM-YYYY')}</span>
              <span><b>Type:</b> {depositType}</span>
              <span><b>Total:</b> {totals.count}</span>
            </p>
            <div className="aw-table-wrap">
              <table className="aw-table">
                <thead>
                  <tr>
                    <th>MbNo</th><th>Name</th><th>Acc.No</th><th>Type</th><th className="is-right">Rate</th>
                    <th>Deposit date</th><th className="is-right">Deposit amt</th><th>Maturity date</th><th className="is-right">Maturity amt</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((item, idx) => (
                    <tr key={idx}>
                      <td className="is-accent">{item.memberNo}</td>
                      <td>{item.memberName}</td>
                      <td>{item.accountNo}</td>
                      <td>{item.depositType === 'Fixed Deposit' ? 'FD' : 'RD'}</td>
                      <td className="is-right">{item.interestRate}%</td>
                      <td className="is-muted">{fmtDate(item.depositDate)}</td>
                      <td className="is-right">{fmtAmt(item.amount)}</td>
                      <td>{fmtDate(item.dueDate)}</td>
                      <td className="is-right">{fmtAmt(item.maturityAmount)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td></td><td><b>Total: {totals.count}</b></td><td colSpan={4}></td>
                    <td className="is-right"><b>{fmtAmt(totals.totalAmount)}</b></td><td></td>
                    <td className="is-right"><b>{fmtAmt(totals.totalMaturity)}</b></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="aw-meta" style={{ textAlign: 'center', marginTop: 10, fontStyle: 'italic' }}>Report As Per Data Available....</p>
          </div>
        </section>
      )}
      {!hasData && (
        <ReportEmpty icon={<FileText size={34} />} title={loading ? 'Loading…' : 'No Data'} hint="Select date range and generate report" />
      )}
    </ReportShell>
  );
};

export default DepositDueDateRegister;
