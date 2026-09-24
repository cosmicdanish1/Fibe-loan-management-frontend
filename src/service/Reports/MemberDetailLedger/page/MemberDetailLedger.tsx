import React, { useState, useCallback, useRef } from 'react';
import {
  FileText,
  Search,
  Printer,
  User,
  RotateCcw,
  ShieldCheck,
  BookOpen,
  Calendar,
} from 'lucide-react';
import {
  ConfigProvider,
  Button,
  DatePicker,
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
import dayjs, { Dayjs } from 'dayjs';
import MemberLookup from '../../../../components/shared/MemberLookup/MemberLookup';
import { renderCrDrText } from '../../../../components/shared/CrDrIndicator';

// ── layout constants ─────────────────────────────────────────────────────────
const W_DATE    = 14;
const W_RECNO   = 10;
const W_PAYMENT = 14;
const W_RECEIPT = 14;
const W_BAL     = 15;
const SEP_W     = W_DATE + W_RECNO + W_PAYMENT + W_RECEIPT + W_BAL; // 67
const SEP       = '-'.repeat(SEP_W);
const SUB_SEP   = ' '.repeat(W_DATE + W_RECNO) + '-'.repeat(W_PAYMENT + W_RECEIPT);
const SUB_DSEQ  = ' '.repeat(W_DATE + W_RECNO) + '='.repeat(W_PAYMENT + W_RECEIPT);

// ── response types ───────────────────────────────────────────────────────────
interface DetailEntry {
  date: string | Date;
  accountHead: string;
  voucherNo: string;
  particulars: string;
  debit: number;
  credit: number;
  code: string;
  balance?: number;
}
interface DetailLedger {
  memberNumber: string;
  memberName: string;
  officeNo: string;
  officeName: string;
  fromDate: string;
  toDate: string;
  openingByCode: Record<string, number>;
  entries: DetailEntry[];
}

// ── formatters ───────────────────────────────────────────────────────────────
const centre = (s: string, w = SEP_W) =>
  s.length >= w ? s : ' '.repeat(Math.floor((w - s.length) / 2)) + s;

const fmtDate = (d: string | Date) => {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dd = d instanceof Date ? d : new Date(d);
  return `${String(dd.getDate()).padStart(2,'0')}-${months[dd.getMonth()]}-${dd.getFullYear()}`;
};

const fmtAmt = (n: number) =>
  n === 0 ? '' : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtAmtFixed = (n: number) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtBal = (n: number) => {
  const abs = Math.abs(n);
  return abs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
    (n >= 0 ? ' CR' : ' DR');
};

// ── report builder ───────────────────────────────────────────────────────────
const buildReportText = (data: DetailLedger, now: Date): string => {
  const nowStr = dayjs(now).format('DD-MMM-YYYY/ h:mmA');
  const fromStr = dayjs(data.fromDate).format('DD-MMM-YYYY');
  const toStr   = dayjs(data.toDate).format('DD-MMM-YYYY');

  const lines: string[] = [
    centre('Espat Karmchari Co-Operative Credit Society Limited.'),
    centre('Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006'),
    'Reg No: A.R/DRG/1796'.padEnd(SEP_W - 'Tel No: 0788-2298736'.length) + 'Tel No: 0788-2298736',
    '',
    centre('MEMBER DETAIL LEDGER'),
    '',
    `Office :- [${data.officeNo || ''}]${data.officeName || ''}`,
    SEP,
    `Member   :- [${data.memberNumber} ]${data.memberName}    As on Date:${nowStr}`,
    `From Date:- ${fromStr}  To Date:- ${toStr}          Page No :1`,
    SEP,
    '    Date'.padEnd(W_DATE) + 'RecNo'.padEnd(W_RECNO) +
      'Payment'.padStart(W_PAYMENT) + 'Receipt'.padStart(W_RECEIPT) + 'Balance'.padStart(W_BAL),
    SEP,
  ];

  // Group entries by code, preserving insertion order
  const codeOrder: string[] = [];
  const byCode: Record<string, DetailEntry[]> = {};
  for (const e of data.entries) {
    if (!byCode[e.code]) { byCode[e.code] = []; codeOrder.push(e.code); }
    byCode[e.code]!.push(e);
  }

  for (const code of codeOrder) {
    const group  = byCode[code] ?? [];
    if (group.length === 0) continue;
    const head   = group[0]!.accountHead;
    const opening = data.openingByCode?.[code] ?? 0;

    lines.push(`${code}-${head}`);
    lines.push(`Opening Balance :- ${fmtBal(opening)}`);
    lines.push(SEP);

    let running = opening;
    let totalPay = 0;
    let totalRec = 0;

    for (const e of group) {
      running  = typeof e.balance === 'number' ? e.balance : running + e.credit - e.debit;
      totalPay += e.debit;
      totalRec += e.credit;

      lines.push(
        fmtDate(e.date).padEnd(W_DATE) +
        (e.voucherNo || '').substring(0, W_RECNO - 1).padEnd(W_RECNO) +
        (e.debit  > 0 ? fmtAmt(e.debit)  : '').padStart(W_PAYMENT) +
        (e.credit > 0 ? fmtAmt(e.credit) : '').padStart(W_RECEIPT) +
        fmtBal(running).padStart(W_BAL),
      );
    }

    lines.push(SUB_SEP);
    lines.push(
      ''.padEnd(W_DATE) +
      'Total : -'.padEnd(W_RECNO) +
      fmtAmtFixed(totalPay).padStart(W_PAYMENT) +
      fmtAmtFixed(totalRec).padStart(W_RECEIPT),
    );
    lines.push(SUB_DSEQ);
  }

  if (codeOrder.length === 0) {
    lines.push('');
    lines.push(centre('No transactions found for this period.'));
    lines.push('');
  }

  lines.push('');
  lines.push('Report As Per Data Available....');

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
      <title>Member Detail Ledger</title>
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
const MemberDetailLedger: React.FC = () => {
  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark =
    interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [memberNo,   setMemberNo]   = useState('');
  const [memberName, setMemberName] = useState('');
  const [fromDate,   setFromDate]   = useState<Dayjs>(dayjs().startOf('month'));
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
    setMemberNo('');
    setMemberName('');
    setFromDate(dayjs().startOf('month'));
    setToDate(dayjs());
    setOutputType('screen');
    setReportText('');
    reportTextRef.current = '';
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!memberNo) { message.warning('Please enter a Member Number'); return; }
    if (!fromDate || !toDate) { message.warning('Please select a date range'); return; }

    setIsLoading(true);
    try {
      const response = await (apiService as any).getMemberDetailLedgerReport({
        memberNumber: memberNo,
        fromDate: fromDate.format('YYYY-MM-DD'),
        toDate:   toDate.format('YYYY-MM-DD'),
      });

      if (response.success && response.data) {
        const data: DetailLedger = response.data;
        if (data.memberName) setMemberName(data.memberName);

        const text = buildReportText(data, new Date());
        reportTextRef.current = text;
        setReportText(text);

        if (!data.entries || data.entries.length === 0) {
          message.info('No transactions found for this member in the selected date range');
        }
        if (outputType === 'printer') {
          printReportText(text);
        }
      } else {
        setReportText('');
        reportTextRef.current = '';
        message.error(response.error || response.message || 'Failed to generate report');
      }
    } catch (err) {
      console.error('[MemberDetailLedger] Error:', err);
      message.error('Failed to generate report');
      setReportText('');
      reportTextRef.current = '';
    } finally {
      setIsLoading(false);
    }
  }, [memberNo, fromDate, toDate, outputType]);

  const handlePrint = useCallback(() => {
    if (!reportTextRef.current) return;
    printReportText(reportTextRef.current);
  }, []);

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#8b5cf6',
          borderRadius: 6,
          fontSize: 12,
          colorBgContainer: isDark ? '#1e293b' : '#ffffff',
          colorBorder: isDark ? '#334155' : '#e2e8f0',
        },
      }}
    >
      <style>{`
        .custom-scrollbar-violet::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar-violet::-webkit-scrollbar-track {
          background: ${isDark ? '#1e293b' : '#f8fafc'}; border-radius: 3px;
        }
        .custom-scrollbar-violet::-webkit-scrollbar-thumb { background: #c4b5fd; border-radius: 3px; }
        .custom-scrollbar-violet::-webkit-scrollbar-thumb:hover { background: #a78bfa; }
      `}</style>

      <div className={`mdl-page h-screen flex flex-col font-sans overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 via-violet-50/20 to-slate-50'}`}>

        {/* Header */}
        <div className={`mdl-header px-3 py-1.5 flex items-center justify-between z-10 shadow-sm shrink-0 no-print border-b ${isDark ? 'bg-gradient-to-r from-slate-900 to-slate-900 border-white/5' : 'bg-white/90 backdrop-blur-sm border-slate-200/60'}`}>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-violet-600 to-violet-700 p-1.5 rounded-lg text-white shadow-md">
              <BookOpen size={14} />
            </div>
            <div>
              <h1 className={`text-xs font-black tracking-tight leading-none ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Member Detail Ledger</h1>
              <div className="flex items-center gap-1 mt-0.5 fz-body font-bold text-slate-400 uppercase tracking-wider leading-none">
                <ShieldCheck size={8} className="text-violet-500" /> Per-Account Transaction Ledger
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              icon={<RotateCcw size={11} />}
              size="small"
              className="h-7 px-2 rounded-lg fz-body font-bold uppercase tracking-wide border-slate-200 hover:border-violet-500 hover:text-violet-600"
              onClick={handleReset}
            >Reset</Button>
            <Button
              icon={<Printer size={11} />}
              size="small"
              className="h-7 px-2 rounded-lg fz-body font-bold uppercase tracking-wide border-slate-200 hover:border-violet-500 hover:text-violet-600"
              onClick={handlePrint}
              disabled={!reportText}
            >Print</Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden p-2 flex gap-2">

          {/* Sidebar */}
          <div className="w-[220px] flex flex-col gap-2 shrink-0 no-print overflow-y-auto custom-scrollbar-violet">

            {/* Member */}
            <div className={`mdl-card rounded-lg overflow-hidden shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 border-violet-200/60'}`}>
              <div className="bg-gradient-to-r from-violet-600 to-violet-700 px-2 py-1 flex items-center gap-1">
                <User size={10} className="text-white" />
                <h3 className="fz-body font-black text-white tracking-wide uppercase">Member</h3>
              </div>
              <div className="p-2 space-y-1.5">
                <label className={`fz-caption font-bold uppercase tracking-tight flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <User size={10} className="text-violet-500" />Member No
                </label>
                <Input.Search
                  placeholder="Type member no..."
                  value={memberNo}
                  onChange={e => setMemberNo(e.target.value)}
                  onSearch={() => setShowLookup(true)}
                  className="h-8 fz-label font-semibold"
                />
                <label className={`fz-caption font-bold uppercase tracking-tight flex items-center gap-1 mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <User size={10} className="text-violet-500" />Member Name
                </label>
                <Input
                  value={memberName}
                  readOnly
                  placeholder="Selected member name"
                  className="h-8 fz-label font-semibold"
                />
              </div>
            </div>

            {/* Date Range */}
            <div className={`mdl-card rounded-lg overflow-hidden shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 border-violet-200/60'}`}>
              <div className="bg-gradient-to-r from-violet-600 to-violet-700 px-2 py-1 flex items-center gap-1">
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
            <div className={`mdl-card rounded-lg overflow-hidden shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 border-violet-200/60'}`}>
              <div className="bg-gradient-to-r from-violet-600 to-violet-700 px-2 py-1 flex items-center gap-1">
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
                  className="h-8 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 font-black uppercase tracking-wider fz-body mt-1 shadow-lg"
                >Generate</Button>
              </div>
            </div>
          </div>

          {/* Report Panel */}
          <div className={`mdl-panel flex-1 rounded-lg shadow-sm flex flex-col overflow-hidden border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 border-violet-200/60'}`}>
            <div className="bg-gradient-to-r from-violet-600 to-violet-700 px-3 py-1.5 flex items-center justify-between shrink-0 no-print">
              <div className="flex items-center gap-1.5">
                <div className="bg-white/20 p-1 rounded-md">
                  <FileText size={12} className="text-white" />
                </div>
                <div>
                  <h3 className="fz-small font-black text-white uppercase tracking-wide leading-none">Detail Ledger</h3>
                  <p className="fz-body font-bold text-violet-200 uppercase mt-0.5 tracking-tight leading-none">
                    {fromDate.format('DD-MMM-YY')} – {toDate.format('DD-MMM-YY')}
                  </p>
                </div>
              </div>
            </div>

            <div className={`mdl-panel-body flex-1 overflow-auto p-2 custom-scrollbar-violet ${isDark ? 'bg-slate-900/40' : 'bg-gradient-to-br from-white to-violet-50/10'}`}>
              <Spin spinning={isLoading} tip="Loading..." size="small">
                {reportText ? (
                  <pre
                    className="font-mono"
                    style={{
                      fontSize: '10px',
                      lineHeight: 1.45,
                      color: isDark ? '#e2e8f0' : '#1e293b',
                      background: 'transparent',
                      margin: 0,
                      padding: '6px 4px',
                      whiteSpace: 'pre',
                    }}
                  >
                    {renderCrDrText(reportText)}
                  </pre>
                ) : (
                  <div className="py-32 text-center">
                    <div className="w-20 h-20 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <FileText className="text-4xl text-violet-200" />
                    </div>
                    <h4 className="text-slate-400 font-black text-xs uppercase tracking-wider">No Data</h4>
                    <p className="text-slate-300 fz-small mt-1 font-semibold">
                      Select a member and click Generate
                    </p>
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
        html.dark .mdl-page { background-color: #000000 !important; color: #f5f5f7 !important; }
        html.dark .mdl-header { background-color: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .mdl-header h1 { color: #f5f5f7 !important; }
        html.dark .mdl-card { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .mdl-card label { color: #8e8e93 !important; }
        html.dark .mdl-panel { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .mdl-panel-body { background-color: #000000 !important; }
        html.dark .mdl-page pre { color: #f5f5f7 !important; }
        html.dark .mdl-page .text-slate-400 { color: #8e8e93 !important; }
        html.dark .mdl-page .text-slate-300 { color: #71717a !important; }
        html.dark .mdl-page .text-slate-500 { color: #8e8e93 !important; }
        html.dark .mdl-page .border-slate-200 { border-color: rgba(255,255,255,.08) !important; }
        html.dark .mdl-page input,
        html.dark .mdl-page .ant-input,
        html.dark .mdl-page .ant-input-affix-wrapper,
        html.dark .mdl-page .ant-picker { background-color: rgba(255,255,255,.05) !important; color: #f5f5f7 !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .mdl-page .ant-picker input { color: #f5f5f7 !important; }
        html.dark .mdl-page .ant-radio-button-wrapper { background-color: rgba(255,255,255,.05) !important; color: #f5f5f7 !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .mdl-page button.border-slate-200 { background-color: #1c1c1e !important; color: #f5f5f7 !important; border-color: rgba(255,255,255,.08) !important; }
      `}</style>
    </ConfigProvider>
  );
};

export default MemberDetailLedger;
