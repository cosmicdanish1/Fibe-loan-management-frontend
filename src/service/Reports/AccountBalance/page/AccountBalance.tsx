import React, { useState, useCallback, useRef } from 'react';
import {
  FileText,
  Printer,
  Search,
  RotateCcw,
  Wallet,
  User,
  Calendar,
} from 'lucide-react';
import {
  ConfigProvider,
  Button,
  Spin,
  Radio,
  Input,
  Modal,
  message,
  theme as antdTheme,
} from 'antd';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../store';
import { apiService } from '../../../../services/api';
import dayjs from 'dayjs';
import MemberLookup from '../../../../components/shared/MemberLookup/MemberLookup';

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
  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark =
    interfaceMode === 'dark';

  const [fromNo,   setFromNo]   = useState('');
  const [fromName, setFromName] = useState('');
  const [toNo,     setToNo]     = useState('');
  const [toName,   setToName]   = useState('');
  const [outputType, setOutputType] = useState('screen');
  const [showLookup,   setShowLookup]   = useState(false);
  const [lookupTarget, setLookupTarget] = useState<'from' | 'to'>('from');
  const [reportText, setReportText] = useState('');
  const [isLoading,  setIsLoading]  = useState(false);
  const reportTextRef = useRef('');

  const openLookup = useCallback((target: 'from' | 'to') => {
    setLookupTarget(target);
    setShowLookup(true);
  }, []);

  const handleMemberSelect = useCallback((member: any) => {
    const no   = member.memberNo || member.mbno || '';
    const name = member.memberName || member.name || '';
    if (lookupTarget === 'from') { setFromNo(no); setFromName(name); }
    else                          { setToNo(no);   setToName(name);   }
    setShowLookup(false);
  }, [lookupTarget]);

  const handleReset = useCallback(() => {
    setFromNo(''); setFromName('');
    setToNo('');   setToName('');
    setOutputType('screen');
    setReportText('');
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
          reportTextRef.current = '';
          return;
        }
        const text = buildReportText(rows, fromNo, toNo);
        reportTextRef.current = text;
        setReportText(text);
        if (outputType === 'printer') printReportText(text);
      } else {
        setReportText('');
        reportTextRef.current = '';
        message.error(response.error || response.message || 'Failed to generate report');
      }
    } catch (err) {
      console.error('[AccountBalance]', err);
      message.error('Failed to generate report');
      setReportText('');
      reportTextRef.current = '';
    } finally {
      setIsLoading(false);
    }
  }, [fromNo, toNo, outputType]);

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
          colorPrimary: '#0ea5e9',
          borderRadius: 6,
          fontSize: 12,
          colorBgContainer: isDark ? '#1e293b' : '#ffffff',
          colorBorder: isDark ? '#334155' : '#e2e8f0',
        },
      }}
    >
      <style>{`
        .custom-scrollbar-sky::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar-sky::-webkit-scrollbar-track { background: ${isDark ? '#1e293b' : '#f8fafc'}; border-radius: 3px; }
        .custom-scrollbar-sky::-webkit-scrollbar-thumb { background: #7dd3fc; border-radius: 3px; }
        .custom-scrollbar-sky::-webkit-scrollbar-thumb:hover { background: #38bdf8; }
      `}</style>

      <div className={`account-balance-page h-screen flex flex-col font-sans overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 via-sky-50/20 to-slate-50'}`}>

        {/* Header */}
        <div className={`ab-header px-3 py-1.5 flex items-center justify-between z-10 shadow-sm shrink-0 border-b ${isDark ? 'bg-gradient-to-r from-slate-900 to-slate-900 border-white/5' : 'bg-white/90 backdrop-blur-sm border-slate-200/60'}`}>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-sky-600 to-sky-700 p-1.5 rounded-lg text-white shadow-md">
              <Wallet size={14} />
            </div>
            <div>
              <h1 className={`text-xs font-black tracking-tight leading-none ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Account Balance</h1>
              <div className={`flex items-center gap-1 mt-0.5 fz-body font-bold uppercase tracking-wider leading-none ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                <Wallet size={8} className="text-sky-500" /> Member Balance Report
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button icon={<RotateCcw size={11} />} size="small"
              className="h-7 px-2 rounded-lg fz-body font-bold uppercase tracking-wide border-slate-200 hover:border-sky-500 hover:text-sky-600"
              onClick={handleReset}>Reset</Button>
            <Button icon={<Printer size={11} />} size="small"
              className="h-7 px-2 rounded-lg fz-body font-bold uppercase tracking-wide border-slate-200 hover:border-sky-500 hover:text-sky-600"
              onClick={handlePrint} disabled={!reportText}>Print</Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden p-2 flex gap-2">

          {/* Sidebar */}
          <div className="w-[220px] flex flex-col gap-2 shrink-0 overflow-y-auto custom-scrollbar-sky">

            {/* From Member */}
            <div className={`ab-card rounded-lg overflow-hidden shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 border-sky-200/60'}`}>
              <div className="bg-gradient-to-r from-sky-600 to-sky-700 px-2 py-1 flex items-center gap-1">
                <User size={10} className="text-white" />
                <h3 className="fz-body font-black text-white tracking-wide uppercase">From Member</h3>
              </div>
              <div className="p-2 space-y-1.5">
                <label className={labelCls}><User size={10} className="text-sky-500" />Member No</label>
                <Input.Search
                  placeholder="Type member no..."
                  value={fromNo}
                  onChange={e => setFromNo(e.target.value)}
                  onSearch={() => openLookup('from')}
                  className="h-8 fz-label font-semibold"
                />
                <label className={`${labelCls} mt-1`}><User size={10} className="text-sky-500" />Member Name</label>
                <Input value={fromName} readOnly placeholder="Selected member name" className="h-8 fz-label font-semibold" />
              </div>
            </div>

            {/* To Member */}
            <div className={`ab-card rounded-lg overflow-hidden shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 border-sky-200/60'}`}>
              <div className="bg-gradient-to-r from-sky-600 to-sky-700 px-2 py-1 flex items-center gap-1">
                <User size={10} className="text-white" />
                <h3 className="fz-body font-black text-white tracking-wide uppercase">To Member</h3>
              </div>
              <div className="p-2 space-y-1.5">
                <label className={labelCls}><User size={10} className="text-sky-500" />Member No</label>
                <Input.Search
                  placeholder="Type member no..."
                  value={toNo}
                  onChange={e => setToNo(e.target.value)}
                  onSearch={() => openLookup('to')}
                  className="h-8 fz-label font-semibold"
                />
                <label className={`${labelCls} mt-1`}><User size={10} className="text-sky-500" />Member Name</label>
                <Input value={toName} readOnly placeholder="Selected member name" className="h-8 fz-label font-semibold" />
              </div>
            </div>

            {/* Output */}
            <div className={`ab-card rounded-lg overflow-hidden shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 border-sky-200/60'}`}>
              <div className="bg-gradient-to-r from-sky-600 to-sky-700 px-2 py-1 flex items-center gap-1">
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
                  className="h-8 bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 font-black uppercase tracking-wider fz-body mt-1 shadow-lg"
                >Generate</Button>
              </div>
            </div>
          </div>

          {/* Report Panel */}
          <div className={`ab-report-panel flex-1 rounded-lg shadow-sm flex flex-col overflow-hidden border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 border-sky-200/60'}`}>
            <div className="bg-gradient-to-r from-sky-600 to-sky-700 px-3 py-1.5 flex items-center gap-1.5 shrink-0">
              <div className="bg-white/20 p-1 rounded-md">
                <FileText size={12} className="text-white" />
              </div>
              <div>
                <h3 className="fz-small font-black text-white uppercase tracking-wide leading-none">Account Balance</h3>
                <p className="fz-body font-bold text-sky-200 uppercase mt-0.5 tracking-tight leading-none">
                  {fromNo && toNo ? `${fromNo} – ${toNo}` : 'Enter member range'}
                </p>
              </div>
            </div>

            <div className={`flex-1 overflow-auto p-2 custom-scrollbar-sky ${isDark ? 'bg-slate-900/40' : 'bg-gradient-to-br from-white to-sky-50/10'}`}>
              <Spin spinning={isLoading} tip="Loading..." size="small">
                {reportText ? (
                  <pre
                    className="font-mono"
                    style={{
                      fontSize: '9px',
                      lineHeight: 1.4,
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
                    <div className="w-20 h-20 bg-sky-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <Calendar className="text-4xl text-sky-200" />
                    </div>
                    <h4 className="text-slate-400 font-black text-xs uppercase tracking-wider">No Data</h4>
                    <p className="text-slate-300 fz-small mt-1 font-semibold">Enter member range and click Generate</p>
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

      <style>{`
        /* ── Account Balance — dark mode ── */
        html.dark .account-balance-page { background-color: #000000 !important; color: #f5f5f7 !important; }
        html.dark .ab-header { background-color: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .ab-header h1 { color: #f5f5f7 !important; }
        html.dark .ab-header .text-slate-100 { color: #f5f5f7 !important; }
        html.dark .ab-header .text-slate-800 { color: #f5f5f7 !important; }
        html.dark .ab-header .text-slate-400 { color: #8e8e93 !important; }
        html.dark .ab-card { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .ab-report-panel { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .account-balance-page .bg-slate-900\\/40 { background-color: rgba(255,255,255,.03) !important; }
        html.dark .account-balance-page label { color: #8e8e93 !important; }
        html.dark .account-balance-page .text-slate-400 { color: #8e8e93 !important; }
        html.dark .account-balance-page .text-slate-300 { color: #71717a !important; }
        html.dark .account-balance-page pre { color: #f5f5f7 !important; }
        /* Antd inputs / buttons used on this page */
        html.dark .account-balance-page .ant-input,
        html.dark .account-balance-page .ant-input-affix-wrapper,
        html.dark .account-balance-page input.ant-input {
          background-color: rgba(255,255,255,.05) !important; color: #f5f5f7 !important; border-color: rgba(255,255,255,.08) !important;
        }
        html.dark .account-balance-page .ant-input::placeholder { color: #71717a !important; }
        html.dark .account-balance-page .ant-btn:not(.ant-btn-primary) {
          background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important;
        }
        html.dark .account-balance-page .ant-radio-button-wrapper {
          background-color: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important;
        }
        html.dark .account-balance-page .ant-radio-button-wrapper-checked {
          background-color: #0ea5e9 !important; color: #ffffff !important;
        }
        html.dark .ant-modal-content, html.dark .ant-modal-header {
          background-color: #1c1c1e !important; color: #f5f5f7 !important; border-color: rgba(255,255,255,.08) !important;
        }
        html.dark .ant-modal-title { color: #f5f5f7 !important; }
      `}</style>
    </ConfigProvider>
  );
};

export default AccountBalance;
