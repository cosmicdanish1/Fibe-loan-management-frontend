import React, { useState, useCallback, useRef } from 'react';
import { ConfigProvider, Button, Spin, Input, DatePicker, Modal, Radio, message, theme as antdTheme } from 'antd';
import {
  FileText,
  Printer,
  Search,
  RotateCcw,
  Wallet,
  User,
  Calendar,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';
import { apiService } from '../../../../../services/api';
import dayjs, { Dayjs } from 'dayjs';
import MemberLookup from '../../../../../components/shared/MemberLookup/MemberLookup';

// ── types ────────────────────────────────────────────────────────────────────
interface RDAccount {
  key: string;
  accountNo: string;
  memberNo: string;
  memberName: string;
  officeName: string;
  monthlyAmount: number;
  interestRate: number;
  depositDate: string | Date;
  maturityDate: string | Date;
  totalDeposited: number;
  maturityAmount: number;
  tenureMonths: number;
  installmentsPaid: number;
  installmentsMissed: number;
  status: string;
}

// ── report layout ────────────────────────────────────────────────────────────
const SEP_W = 74;
const SEP   = '-'.repeat(SEP_W);
const DSEP  = '='.repeat(SEP_W);

// ── formatters ───────────────────────────────────────────────────────────────
const centre = (s: string, w = SEP_W) =>
  s.length >= w ? s : ' '.repeat(Math.floor((w - s.length) / 2)) + s;

const fmtDate = (d: string | Date | null) => {
  if (!d) return 'N/A';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dd = d instanceof Date ? d : new Date(d);
  if (isNaN(dd.getTime())) return String(d).slice(0, 10);
  return `${String(dd.getDate()).padStart(2,'0')}-${months[dd.getMonth()]}-${dd.getFullYear()}`;
};

const fmtAmt = (n: number) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── report builder ───────────────────────────────────────────────────────────
const buildReportText = (
  accounts: RDAccount[],
  memberNo: string,
  memberName: string,
  fromDate: string,
  toDate: string,
): string => {
  const lines: string[] = [
    centre('Espat Karmchari Co-Operative Credit Society Limited.'),
    centre('Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006'),
    'Reg No: A.R/DRG/1796'.padEnd(SEP_W - 'Tel No: 0788-2298736'.length) + 'Tel No: 0788-2298736',
    '',
    centre('RECURRING DEPOSIT STATEMENT'),
    '',
    `Member No :- ${memberNo}   Member Name :- ${memberName}`,
    `From Date :- ${dayjs(fromDate).format('DD-MMM-YYYY')}   To Date :- ${dayjs(toDate).format('DD-MMM-YYYY')}`,
    `Total Accounts :- ${accounts.length}`,
    SEP,
  ];

  let totalDeposited = 0;
  let totalMaturity  = 0;

  for (const acc of accounts) {
    totalDeposited += acc.totalDeposited;
    totalMaturity  += acc.maturityAmount;

    lines.push(
      `Account No : ${(acc.accountNo || '').padEnd(20)}  Status  : ${acc.status || ''}`,
      `Start Date : ${fmtDate(acc.depositDate).padEnd(20)}  Maturity: ${fmtDate(acc.maturityDate)}`,
      `Monthly    : ${fmtAmt(acc.monthlyAmount).padEnd(20)}  Rate    : ${acc.interestRate}%   Tenure: ${acc.tenureMonths || 'N/A'} Months`,
      `Installed  : ${acc.installmentsPaid || 0} Paid / ${acc.installmentsMissed || 0} Missed`,
      `Deposited  : ${fmtAmt(acc.totalDeposited).padEnd(20)}  Maturity Amt: ${fmtAmt(acc.maturityAmount)}`,
    );
    if (acc.officeName) lines.push(`Office     : ${acc.officeName}`);
    lines.push(SEP);
  }

  lines.push(
    `Total Deposited : ${fmtAmt(totalDeposited).padStart(16)}   Total Maturity : ${fmtAmt(totalMaturity)}`,
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
      <title>RD Statement</title>
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
const RDStatement: React.FC = () => {
  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark =
    interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [memberNo,   setMemberNo]   = useState('');
  const [memberName, setMemberName] = useState('');
  const [fromDate,   setFromDate]   = useState<Dayjs>(dayjs().startOf('year'));
  const [toDate,     setToDate]     = useState<Dayjs>(dayjs());
  const [outputType, setOutputType] = useState('screen');
  const [showLookup, setShowLookup] = useState(false);
  const [reportText, setReportText] = useState('');
  const [isLoading,  setIsLoading]  = useState(false);
  const reportTextRef = useRef('');

  const handleMemberSelect = useCallback((member: any) => {
    setMemberNo(member.memberNo || member.mbno || '');
    setMemberName(member.memberName || member.name || '');
    setShowLookup(false);
  }, []);

  const handleReset = useCallback(() => {
    setMemberNo(''); setMemberName('');
    setFromDate(dayjs().startOf('year'));
    setToDate(dayjs());
    setOutputType('screen');
    setReportText('');
    reportTextRef.current = '';
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!memberNo) { message.warning('Please enter a Member Number'); return; }

    setIsLoading(true);
    try {
      const response = await apiService.post('/reports/rd/statement', {
        memberNo,
        fromDate: fromDate.format('YYYY-MM-DD'),
        toDate:   toDate.format('YYYY-MM-DD'),
      });

      if (response.success && response.data) {
        const accounts: RDAccount[] = Array.isArray(response.data) ? response.data : [];
        if (accounts.length === 0) {
          message.info('No RD accounts found for this member in the selected range');
          setReportText('');
          reportTextRef.current = '';
          return;
        }
        const name = accounts[0]?.memberName || memberName;
        if (name) setMemberName(name);

        const text = buildReportText(
          accounts, memberNo, name,
          fromDate.format('YYYY-MM-DD'), toDate.format('YYYY-MM-DD'),
        );
        reportTextRef.current = text;
        setReportText(text);
        if (outputType === 'printer') printReportText(text);
      } else {
        setReportText('');
        reportTextRef.current = '';
        message.error(response.error || response.message || 'Failed to generate report');
      }
    } catch (err) {
      console.error('[RDStatement]', err);
      message.error('Failed to generate RD statement');
      setReportText('');
      reportTextRef.current = '';
    } finally {
      setIsLoading(false);
    }
  }, [memberNo, memberName, fromDate, toDate, outputType]);

  const handlePrint = useCallback(() => {
    if (!reportTextRef.current) return;
    printReportText(reportTextRef.current);
  }, []);

  const labelCls = `fz-caption font-bold uppercase tracking-tight flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`;

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#f59e0b',
          borderRadius: 6,
          fontSize: 12,
          colorBgContainer: isDark ? '#1e293b' : '#ffffff',
          colorBorder: isDark ? '#334155' : '#e2e8f0',
        },
      }}
    >
      <style>{`
        .custom-scrollbar-amber::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar-amber::-webkit-scrollbar-track { background: ${isDark ? '#1e293b' : '#f8fafc'}; border-radius: 3px; }
        .custom-scrollbar-amber::-webkit-scrollbar-thumb { background: #fcd34d; border-radius: 3px; }
        .custom-scrollbar-amber::-webkit-scrollbar-thumb:hover { background: #fbbf24; }
      `}</style>

      <div className={`h-screen flex flex-col font-sans overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 via-amber-50/20 to-slate-50'}`}>

        {/* Header */}
        <div className={`px-3 py-1.5 flex items-center justify-between z-10 shadow-sm shrink-0 border-b ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/90 backdrop-blur-sm border-slate-200/60'}`}>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-amber-600 to-amber-700 p-1.5 rounded-lg text-white shadow-md">
              <Wallet size={14} />
            </div>
            <div>
              <h1 className={`text-xs font-black tracking-tight leading-none ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>RD Statement</h1>
              <div className={`flex items-center gap-1 mt-0.5 fz-body font-bold uppercase tracking-wider leading-none ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                <Wallet size={8} className="text-amber-500" /> Recurring Deposit
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button icon={<RotateCcw size={11} />} size="small"
              className="h-7 px-2 rounded-lg fz-body font-bold uppercase tracking-wide border-slate-200 hover:border-amber-500 hover:text-amber-600"
              onClick={handleReset}>Reset</Button>
            <Button icon={<Printer size={11} />} size="small"
              className="h-7 px-2 rounded-lg fz-body font-bold uppercase tracking-wide border-slate-200 hover:border-amber-500 hover:text-amber-600"
              onClick={handlePrint} disabled={!reportText}>Print</Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden p-2 flex gap-2">

          {/* Sidebar */}
          <div className="w-[220px] flex flex-col gap-2 shrink-0 overflow-y-auto custom-scrollbar-amber">

            {/* Member */}
            <div className={`rounded-lg overflow-hidden shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 border-amber-200/60'}`}>
              <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-2 py-1 flex items-center gap-1">
                <User size={10} className="text-white" />
                <h3 className="fz-body font-black text-white tracking-wide uppercase">Member</h3>
              </div>
              <div className="p-2 space-y-1.5">
                <label className={labelCls}><User size={10} className="text-amber-500" />Member No</label>
                <Input.Search
                  placeholder="Type member no..."
                  value={memberNo}
                  onChange={e => setMemberNo(e.target.value)}
                  onSearch={() => setShowLookup(true)}
                  className="h-8 fz-label font-semibold"
                />
                <label className={`${labelCls} mt-1`}><User size={10} className="text-amber-500" />Member Name</label>
                <Input value={memberName} readOnly placeholder="Selected member name" className="h-8 fz-label font-semibold" />
              </div>
            </div>

            {/* Date Range */}
            <div className={`rounded-lg overflow-hidden shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 border-amber-200/60'}`}>
              <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-2 py-1 flex items-center gap-1">
                <Calendar size={10} className="text-white" />
                <h3 className="fz-body font-black text-white tracking-wide uppercase">Date Range</h3>
              </div>
              <div className="p-2 space-y-1.5">
                <div>
                  <label className={`fz-body font-bold uppercase tracking-tight block mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>From</label>
                  <DatePicker className="w-full h-7 fz-caption font-semibold" value={fromDate} onChange={v => v && setFromDate(v)} format="DD-MMM-YY" />
                </div>
                <div>
                  <label className={`fz-body font-bold uppercase tracking-tight block mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>To</label>
                  <DatePicker className="w-full h-7 fz-caption font-semibold" value={toDate} onChange={v => v && setToDate(v)} format="DD-MMM-YY" />
                </div>
              </div>
            </div>

            {/* Output */}
            <div className={`rounded-lg overflow-hidden shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 border-amber-200/60'}`}>
              <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-2 py-1 flex items-center gap-1">
                <FileText size={10} className="text-white" />
                <h3 className="fz-body font-black text-white tracking-wide uppercase">Output</h3>
              </div>
              <div className="p-2 space-y-1.5">
                <Radio.Group size="small" value={outputType} onChange={e => setOutputType(e.target.value)} className="w-full">
                  <Radio.Button value="screen"  className="w-1/2 text-center fz-body font-bold">SCR</Radio.Button>
                  <Radio.Button value="printer" className="w-1/2 text-center fz-body font-bold">PTR</Radio.Button>
                </Radio.Group>
                <Button
                  type="primary" block size="small"
                  icon={<Search size={11} />}
                  onClick={handleGenerate}
                  loading={isLoading}
                  className="h-8 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 font-black uppercase tracking-wider fz-body mt-1 shadow-lg"
                >Generate</Button>
              </div>
            </div>
          </div>

          {/* Report Panel */}
          <div className={`flex-1 rounded-lg shadow-sm flex flex-col overflow-hidden border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 border-amber-200/60'}`}>
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-3 py-1.5 flex items-center gap-1.5 shrink-0">
              <div className="bg-white/20 p-1 rounded-md">
                <FileText size={12} className="text-white" />
              </div>
              <div>
                <h3 className="fz-small font-black text-white uppercase tracking-wide leading-none">RD Statement</h3>
                <p className="fz-body font-bold text-amber-200 uppercase mt-0.5 tracking-tight leading-none">
                  {memberNo ? `Member: ${memberNo}` : 'Enter member number'}
                </p>
              </div>
            </div>

            <div className={`flex-1 overflow-auto p-2 custom-scrollbar-amber ${isDark ? 'bg-slate-900/40' : 'bg-gradient-to-br from-white to-amber-50/10'}`}>
              <Spin spinning={isLoading} tip="Loading..." size="small">
                {reportText ? (
                  <pre
                    className="font-mono"
                    style={{
                      fontSize: '10px',
                      lineHeight: 1.55,
                      color: isDark ? '#e2e8f0' : '#1e293b',
                      background: 'transparent',
                      margin: 0,
                      padding: '6px 4px',
                      whiteSpace: 'pre',
                    }}
                  >
                    {reportText}
                  </pre>
                ) : (
                  <div className="py-32 text-center">
                    <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <FileText className="text-4xl text-amber-200" />
                    </div>
                    <h4 className="text-slate-400 font-black text-xs uppercase tracking-wider">No Data</h4>
                    <p className="text-slate-300 fz-small mt-1 font-semibold">Select member and click Generate</p>
                  </div>
                )}
              </Spin>
            </div>
          </div>
        </div>
      </div>

      {/* Member Lookup Modal */}
      <Modal
        open={showLookup}
        onCancel={() => setShowLookup(false)}
        footer={null}
        width={950}
        centered
        destroyOnClose
        styles={{ body: { padding: 0 } }}
      >
        <div className="p-2">
          <MemberLookup isModal={true} onSelect={handleMemberSelect} onClose={() => setShowLookup(false)} />
        </div>
      </Modal>
    </ConfigProvider>
  );
};

export default RDStatement;
