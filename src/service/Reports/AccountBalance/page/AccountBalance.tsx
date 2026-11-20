import React, { useState, useCallback, useRef } from 'react';
import { Printer, Search, RotateCcw, Wallet, User, FileText } from 'lucide-react';
import { message } from 'antd';
import { apiService } from '../../../../services/api';
import dayjs from 'dayjs';
import MemberField from '../../../../components/shared/kit/MemberField';
import { ReportShell, ParamCard, StatCards, OutputChoice, ReportEmpty, LegacyDocument } from '../../../../components/reports/views/ReportShell';
import ReportViewSwitcher from '../../../../components/reports/views/ReportViewSwitcher';
import { GenericBento, GenericEditorial, GenericTerminal } from '../../../../components/reports/views/GenericPro';
import { useReportViews } from '../../../../components/reports/views/reportViews';
import '../../../../components/reports/views/proViews.css';
import { useBalanceSpec } from '../views/balancePro';

// ── report layout ────────────────────────────────────────────────────────────
const W_NO   = 14;
const W_NAME = 24;
const W_SHR  = 13;
const W_CD   = 13;
const W_RL   = 13;
const W_EL   = 13;
const W_RD   = 11;
const W_FRS  = 11;
const W_NET  = 13;
const SEP_W  = W_NO + W_NAME + W_SHR + W_CD + W_RL + W_EL + W_RD + W_FRS + W_NET; // 125
const SEP    = '-'.repeat(SEP_W);
const DSEP   = '='.repeat(SEP_W);

// ── types ────────────────────────────────────────────────────────────────────
interface BalanceItem {
  key: string;
  memberNo: string;
  memberName: string;
  shares: number;
  compulsoryDeposit: number;
  regularLoan: number;
  emergencyLoan: number;
  rdAmount: number;
  frsBalance: number;
  netBalance: number;
}

// ── formatters ───────────────────────────────────────────────────────────────
const centre = (s: string, w = SEP_W) =>
  s.length >= w ? s : ' '.repeat(Math.floor((w - s.length) / 2)) + s;

const fmt = (n: number) =>
  n === 0 ? '' : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtT = (n: number) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const hdr = (lbl: string, w: number) => lbl.padStart(w);

// ── report builder ───────────────────────────────────────────────────────────
const buildReportText = (
  rows: BalanceItem[],
  fromNo: string,
  toNo: string,
): string => {
  const now = dayjs().format('DD-MMM-YYYY HH:mm');

  const lines: string[] = [
    centre('Espat Karmchari Co-Operative Credit Society Limited.'),
    centre('Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006'),
    'Reg No: A.R/DRG/1796'.padEnd(SEP_W - 'Tel No: 0788-2298736'.length) + 'Tel No: 0788-2298736',
    '',
    centre('ACCOUNT BALANCE REPORT'),
    '',
    `From Member :- ${fromNo}   To Member :- ${toNo}   Generated :- ${now}`,
    SEP,
    'Member No'.padEnd(W_NO) +
      'Member Name'.padEnd(W_NAME) +
      hdr('Shares', W_SHR) +
      hdr('Comp.Dep', W_CD) +
      hdr('Reg.Loan', W_RL) +
      hdr('Emg.Loan', W_EL) +
      hdr('RD Amt', W_RD) +
      hdr('FRS Bal', W_FRS) +
      hdr('Net Bal', W_NET),
    SEP,
  ];

  let tShr = 0, tCd = 0, tRl = 0, tEl = 0, tRd = 0, tFrs = 0, tNet = 0;

  for (const r of rows) {
    tShr += r.shares;
    tCd  += r.compulsoryDeposit;
    tRl  += r.regularLoan;
    tEl  += r.emergencyLoan;
    tRd  += r.rdAmount;
    tFrs += r.frsBalance;
    tNet += r.netBalance;

    lines.push(
      r.memberNo.padEnd(W_NO) +
      r.memberName.substring(0, W_NAME - 1).padEnd(W_NAME) +
      fmt(r.shares).padStart(W_SHR) +
      fmt(r.compulsoryDeposit).padStart(W_CD) +
      fmt(r.regularLoan).padStart(W_RL) +
      fmt(r.emergencyLoan).padStart(W_EL) +
      fmt(r.rdAmount).padStart(W_RD) +
      fmt(r.frsBalance).padStart(W_FRS) +
      fmt(r.netBalance).padStart(W_NET),
    );
  }

  lines.push(
    SEP,
    `Total (${rows.length} Members)`.padEnd(W_NO + W_NAME) +
      fmtT(tShr).padStart(W_SHR) +
      fmtT(tCd).padStart(W_CD) +
      fmtT(tRl).padStart(W_RL) +
      fmtT(tEl).padStart(W_EL) +
      fmtT(tRd).padStart(W_RD) +
      fmtT(tFrs).padStart(W_FRS) +
      fmtT(tNet).padStart(W_NET),
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
      <title>Account Balance</title>
      <style>
        @page { size: landscape; margin: 8mm; }
        body { font-family: 'Courier New', Courier, monospace; font-size: 8px; margin: 0; }
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
const AccountBalance: React.FC = () => {
  const [fromNo,   setFromNo]   = useState('');
  const [fromName, setFromName] = useState('');
  const [toNo,     setToNo]     = useState('');
  const [toName,   setToName]   = useState('');
  const [outputType, setOutputType] = useState<'screen' | 'printer'>('screen');
  const [reportText, setReportText] = useState('');
  const [isLoading,  setIsLoading]  = useState(false);
  const [balanceRows, setBalanceRows] = useState<BalanceItem[]>([]);
  const reportTextRef = useRef('');

  const handleMemberSelect = useCallback((member: any, target: 'from' | 'to') => {
    const no   = String(member.memberNo || member.mbno || '');
    const name = member.memberName || member.name || '';
    if (target === 'from') { setFromNo(no); setFromName(name); }
    else                   { setToNo(no);   setToName(name);   }
  }, []);

  const handleReset = useCallback(() => {
    setFromNo(''); setFromName('');
    setToNo('');   setToName('');
    setOutputType('screen');
    setReportText('');
    setBalanceRows([]);
    reportTextRef.current = '';
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!fromNo || !toNo) { message.warning('Please enter both From and To member numbers'); return; }

    setIsLoading(true);
    try {
      const response = await apiService.get('/reports/member-balance-range', {
        params: { fromAccountNo: fromNo, toAccountNo: toNo },
      });

      if (response.success && response.data) {
        const rows: BalanceItem[] = Array.isArray(response.data) ? response.data : [];
        if (rows.length === 0) {
          message.info('No members found in this range');
          setReportText('');
          setBalanceRows([]);
          reportTextRef.current = '';
          return;
        }
        const text = buildReportText(rows, fromNo, toNo);
        reportTextRef.current = text;
        setReportText(text);
        setBalanceRows(rows);
        if (outputType === 'printer') printReportText(text);
      } else {
        setReportText('');
        setBalanceRows([]);
        reportTextRef.current = '';
        message.error(response.error || response.message || 'Failed to generate report');
      }
    } catch (err) {
      console.error('[AccountBalance]', err);
      message.error('Failed to generate report');
      setReportText('');
      setBalanceRows([]);
      reportTextRef.current = '';
    } finally {
      setIsLoading(false);
    }
  }, [fromNo, toNo, outputType]);

  const handlePrint = useCallback(() => {
    if (!reportTextRef.current) return;
    printReportText(reportTextRef.current);
  }, []);

  const { enabled, view, setView } = useReportViews('account-balance');
  const spec = useBalanceSpec(balanceRows, `${fromNo} to ${toNo}`);
  const hasData = balanceRows.length > 0;
  const rangeLabel = fromNo && toNo ? `${fromNo} – ${toNo}` : '';

  return (
    <ReportShell
      className="account-balance-page aw-calm"
      title="Account Balance"
      desc="Member balance report"
      switcher={<ReportViewSwitcher enabled={enabled} value={view} onChange={setView} />}
      actions={
        <>
          <button type="button" className="aw-btn aw-btn-ghost" onClick={handleReset}><RotateCcw size={14} /> Reset</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handlePrint} disabled={!reportText}><Printer size={14} /> Print</button>
        </>
      }
      aside={
        <>
          <ParamCard title="From Member" icon={<User size={14} />}>
            <div>
              <label className="aw-label" htmlFor="ab-from">Member No.</label>
              <MemberField id="ab-from" value={fromNo} onChange={setFromNo} onSelect={m => handleMemberSelect(m, 'from')} ariaLabel="From member number" />
            </div>
            <input className="aw-input" value={fromName} readOnly placeholder="Selected member name" aria-label="From member name" />
          </ParamCard>
          <ParamCard title="To Member" icon={<User size={14} />}>
            <div>
              <label className="aw-label" htmlFor="ab-to">Member No.</label>
              <MemberField id="ab-to" value={toNo} onChange={setToNo} onSelect={m => handleMemberSelect(m, 'to')} onSubmit={() => handleGenerate()} ariaLabel="To member number" />
            </div>
            <input className="aw-input" value={toName} readOnly placeholder="Selected member name" aria-label="To member name" />
          </ParamCard>
          <ParamCard title="Output" icon={<FileText size={14} />}>
            <OutputChoice value={outputType} onChange={setOutputType} id="ab-output" />
            <button type="button" className="aw-btn aw-btn-primary" onClick={handleGenerate} disabled={isLoading} style={{ width: '100%' }}>
              <Search size={14} className={isLoading ? 'aw-spin' : undefined} /> {isLoading ? 'Loading…' : 'Generate'}
            </button>
          </ParamCard>
          {hasData && <StatCards items={[{ label: 'Members', value: String(balanceRows.length), tone: 'muted' }]} />}
        </>
      }
      footerLeft="Account Balance"
      footerRight={rangeLabel}
    >
      {hasData && view === 'bento' && <GenericBento spec={spec} />}
      {hasData && view === 'terminal' && <div style={{ height: 'calc(100vh - 150px)', minHeight: 360 }}><GenericTerminal spec={spec} /></div>}
      {hasData && view === 'editorial' && <GenericEditorial spec={spec} title="Account Balance" subtitle={`Members ${fromNo} to ${toNo}`} />}

      {view === 'legacy' && (
        <LegacyDocument
          title={`Account Balance${rangeLabel ? ` · ${rangeLabel}` : ''}`}
          meta={hasData ? `${balanceRows.length} Members` : undefined}
          text={reportText}
          loading={isLoading}
          small
          empty={<ReportEmpty icon={<Wallet size={34} />} title="No Data" hint="Enter member range and click Generate" />}
        />
      )}
      {view !== 'legacy' && !hasData && (
        <ReportEmpty icon={<Wallet size={34} />} title={isLoading ? 'Loading…' : reportText ? 'No balances to show' : 'No Data'} hint="Enter member range and click Generate" />
      )}
    </ReportShell>
  );
};

export default AccountBalance;
