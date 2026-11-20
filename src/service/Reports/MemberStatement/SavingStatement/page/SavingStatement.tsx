import React, { useState, useCallback, useRef } from 'react';
import { Wallet, Printer, Search, RotateCcw, User, Calendar } from 'lucide-react';
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
import { useSavingSpec } from '../views/savingPro';

// ── layout ───────────────────────────────────────────────────────────────────
const W_DATE = 12;
const W_VCHR = 10;
const W_PART = 22;
const W_WD   = 13;
const W_DEP  = 13;
const W_BAL  = 14;
const SEP_W  = W_DATE + W_VCHR + W_PART + W_WD + W_DEP + W_BAL; // 84
const SEP    = '-'.repeat(SEP_W);
const DSEP   = '='.repeat(SEP_W);

// ── types ────────────────────────────────────────────────────────────────────
interface TxItem {
  date: string | Date;
  voucherNo: string;
  particulars: string;
  withdrawal: number;
  deposit: number;
  balance: number;
}
interface SavingData {
  memberNo: string;
  memberName: string;
  openingBalance: number;
  closingBalance: number;
  transactions: TxItem[];
}

// ── formatters ───────────────────────────────────────────────────────────────
const centre = (s: string, w = SEP_W) =>
  s.length >= w ? s : ' '.repeat(Math.floor((w - s.length) / 2)) + s;

const fmtDate = (d: string | Date) => {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dd = d instanceof Date ? d : new Date(d);
  return `${String(dd.getDate()).padStart(2,'0')}-${months[dd.getMonth()]}-${dd.getFullYear()}`;
};

const fmt = (n: number) =>
  n === 0 ? '' : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtT = (n: number) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── report builder ───────────────────────────────────────────────────────────
const buildReportText = (data: SavingData, fromDate: string, toDate: string): string => {
  const lines: string[] = [
    centre('Espat Karmchari Co-Operative Credit Society Limited.'),
    centre('Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006'),
    'Reg No: A.R/DRG/1796'.padEnd(SEP_W - 'Tel No: 0788-2298736'.length) + 'Tel No: 0788-2298736',
    '',
    centre('SAVING STATEMENT'),
    '',
    `Member No :- ${data.memberNo}   Member Name :- ${data.memberName}`,
    `From Date :- ${dayjs(fromDate).format('DD-MMM-YYYY')}   To Date :- ${dayjs(toDate).format('DD-MMM-YYYY')}`,
    SEP,
    'Date'.padEnd(W_DATE) +
      'Voucher'.padEnd(W_VCHR) +
      'Particulars'.padEnd(W_PART) +
      'Withdrawal'.padStart(W_WD) +
      'Deposit'.padStart(W_DEP) +
      'Balance'.padStart(W_BAL),
    SEP,
    'Opening Bal'.padEnd(W_DATE + W_VCHR + W_PART + W_WD + W_DEP) +
      fmtT(data.openingBalance).padStart(W_BAL),
    SEP,
  ];

  let totalWd = 0;
  let totalDep = 0;

  for (const t of data.transactions) {
    totalWd  += t.withdrawal;
    totalDep += t.deposit;
    lines.push(
      fmtDate(t.date).padEnd(W_DATE) +
      (t.voucherNo || '').substring(0, W_VCHR - 1).padEnd(W_VCHR) +
      (t.particulars || '').substring(0, W_PART - 1).padEnd(W_PART) +
      fmt(t.withdrawal).padStart(W_WD) +
      fmt(t.deposit).padStart(W_DEP) +
      fmtT(t.balance).padStart(W_BAL),
    );
  }

  lines.push(
    SEP,
    'Total'.padEnd(W_DATE + W_VCHR + W_PART) +
      fmtT(totalWd).padStart(W_WD) +
      fmtT(totalDep).padStart(W_DEP) +
      fmtT(data.closingBalance).padStart(W_BAL),
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
      <title>Saving Statement</title>
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
const SavingStatement: React.FC = () => {


  const [memberNo,   setMemberNo]   = useState('');
  const [memberName, setMemberName] = useState('');
  const [fromDate,   setFromDate]   = useState<Dayjs>(dayjs().startOf('year'));
  const [toDate,     setToDate]     = useState<Dayjs>(dayjs());
  const [outputType, setOutputType] = useState<'screen' | 'printer'>('screen');
  const [reportText, setReportText] = useState('');
  const [isLoading,  setIsLoading]  = useState(false);
  const [savingData, setSavingData] = useState<SavingData | null>(null);
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
    setSavingData(null);
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
      const response = await apiService.post('/reports/saving/statement', {
        memberNo,
        fromDate: fromDate.format('YYYY-MM-DD'),
        toDate:   toDate.format('YYYY-MM-DD'),
        headCode: 'L1004',
      });

      if (response.success && response.data) {
        const data: SavingData = response.data;
        if (data.memberName) setMemberName(data.memberName);

        if (!data.transactions || data.transactions.length === 0) {
          message.info('No transactions found for this period');
          setReportText('');
          setSavingData(null);
          reportTextRef.current = '';
          return;
        }

        const text = buildReportText(data, fromDate.format('YYYY-MM-DD'), toDate.format('YYYY-MM-DD'));
        reportTextRef.current = text;
        setReportText(text);
        setSavingData(data);

        if (outputType === 'printer') printReportText(text);
      } else {
        setReportText('');
        setSavingData(null);
        reportTextRef.current = '';
        message.error(response.error || response.message || 'Failed to generate report');
      }
    } catch (err) {
      console.error('[SavingStatement]', err);
      message.error('Failed to generate saving statement');
      setReportText('');
      setSavingData(null);
      reportTextRef.current = '';
    } finally {
      setIsLoading(false);
    }
  }, [memberNo, fromDate, toDate, outputType]);

  const handlePrint = useCallback(() => {
    if (!reportTextRef.current) return;
    printReportText(reportTextRef.current);
  }, []);


  const { enabled, view, setView } = useReportViews('member-statement.saving');
  const spec = useSavingSpec(savingData);

  const hasData = savingData !== null && savingData.transactions.length > 0;
  const range = `${fromDate.format('DD MMM YYYY')} to ${toDate.format('DD MMM YYYY')}`;

  return (
    <ReportShell
      className="svstmt-page aw-calm"
      title="Saving Statement"
      desc="Savings account statement"
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
              <label className="aw-label" htmlFor="svstmt-page-member">Member No.</label>
              <MemberField id="svstmt-page-member" value={memberNo} onChange={setMemberNo} onSelect={handleMemberSelect} onSubmit={() => handleGenerate()} />
            </div>
            <input className="aw-input" value={memberName} readOnly placeholder="Selected member name" aria-label="Member name" />
          </ParamCard>
          <ParamCard title="Period" icon={<Calendar size={14} />}>
            <div>
              <label className="aw-label" htmlFor="svstmt-page-from">From</label>
              <input id="svstmt-page-from" type="date" className="aw-input" value={fromDate.format('YYYY-MM-DD')} onChange={e => e.target.value && setFromDate(dayjs(e.target.value))} />
            </div>
            <div>
              <label className="aw-label" htmlFor="svstmt-page-to">To</label>
              <input id="svstmt-page-to" type="date" className="aw-input" value={toDate.format('YYYY-MM-DD')} onChange={e => e.target.value && setToDate(dayjs(e.target.value))} />
            </div>
            <OutputChoice value={outputType} onChange={setOutputType} id="svstmt-page-output" />
            <button type="button" className="aw-btn aw-btn-primary" onClick={() => handleGenerate()} disabled={isLoading} style={{ width: '100%' }}>
              <Search size={14} className={isLoading ? 'aw-spin' : undefined} /> {isLoading ? 'Loading…' : 'Generate'}
            </button>
          </ParamCard>
          {hasData && <StatCards items={[{ label: 'Transactions', value: String(savingData ? savingData.transactions.length : 0), tone: 'muted' }]} />}
        </>
      }
      footerLeft="Saving Statement"
      footerRight={memberNo ? `Member ${memberNo}` : ''}
    >
      {hasData && view === 'bento' && <GenericBento spec={spec} />}
      {hasData && view === 'terminal' && <div style={{ height: 'calc(100vh - 150px)', minHeight: 360 }}><GenericTerminal spec={spec} /></div>}
      {hasData && view === 'editorial' && <GenericEditorial spec={spec} title="Saving Statement" subtitle={`${memberNo} · ${range}`} />}

      {view === 'legacy' && (
        <LegacyDocument
          title={`Saving Statement${memberNo ? ` · Member ${memberNo}` : ''}`}
          meta={range}
          text={reportText}
          loading={isLoading}
          small
          empty={<ReportEmpty icon={<Wallet size={34} />} title="No Data" hint="Select member and click Generate" />}
        />
      )}
      {view !== 'legacy' && !hasData && (
        <ReportEmpty icon={<Wallet size={34} />} title={isLoading ? 'Loading…' : reportText ? 'Nothing to show' : 'No Data'} hint="Select member and click Generate" />
      )}
    </ReportShell>
  );
};

export default SavingStatement;
