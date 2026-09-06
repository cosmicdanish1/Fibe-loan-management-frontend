import React, { useState, useCallback, useMemo } from 'react';
import {
  FileText, Search, Printer, FileDown, User, RotateCcw,
  ShieldCheck, BookOpen, Calendar, Users
} from 'lucide-react';
import {
  ConfigProvider, Button, DatePicker, Spin, Radio,
  Input, Modal, message, theme as antdTheme
} from 'antd';
import { apiService } from '../../../../../services/api';
import dayjs, { Dayjs } from 'dayjs';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';
import MemberLookup from '../../../../../components/shared/MemberLookup/MemberLookup';

// ── types ─────────────────────────────────────────────────────────────────────
interface SummaryItem { headCode: string; headName: string; balance: number; }
interface MemberStatementData {
  transactions?: any[];
  summary?: SummaryItem[];
  memberName?: string;
}

// ── monospace report constants ────────────────────────────────────────────────
const REPORT_W = 82;
const W_LABEL  = 22;
const W_AMT    = 10;
const COL_GAP  = 4;
const SEP      = '-'.repeat(REPORT_W);

const SOCIETY = {
  name:    'Espat Karmchari Co-Operative Credit Society Limited.',
  address: 'Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006',
  regNo:   'A.R/DRG/1796',
};

const centre = (s: string) => {
  const pad = Math.max(0, REPORT_W - s.length);
  return ' '.repeat(Math.floor(pad / 2)) + s;
};

const fmtAmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

// Loans are on the Payment side; deposits/savings on the Receipt side
const isPayment = (item: SummaryItem) =>
  (item.headCode?.startsWith('A') ?? false) || /loan/i.test(item.headName);

const buildReportText = (
  summary: SummaryItem[],
  memberName: string,
  asOnDate: string,
): string => {
  const receipts = summary.filter(s => !isPayment(s));
  const payments = summary.filter(s => isPayment(s));

  const halfW = Math.floor(REPORT_W / 2);
  const rcptHdr = 'Receipt'.padStart(Math.floor((halfW + 7) / 2)).padEnd(halfW);
  const pmtHdr  = 'Payment'.padStart(Math.floor((halfW + 7) / 2));

  const lines: string[] = [
    centre(SOCIETY.name),
    centre(SOCIETY.address),
    centre(SOCIETY.regNo),
    '',
    centre('MEMBER  STATEMENT'),
    '',
    `Mr./Smt. ${memberName}`,
    '',
    `This is to Inform You that Your Account Details As On Date ${dayjs(asOnDate).format('DD-MMM-YYYY')}`,
    'are as Under. Please return receipt copy after signing it.',
    '',
    SEP,
    rcptHdr + pmtHdr,
    SEP,
  ];

  const maxRows = Math.max(receipts.length, payments.length);
  for (let i = 0; i < maxRows; i++) {
    const r = receipts[i];
    const p = payments[i];
    const left = r
      ? (r.headName || '').substring(0, W_LABEL).padEnd(W_LABEL) + '  ' + fmtAmt(r.balance).padStart(W_AMT)
      : ' '.repeat(W_LABEL + 2 + W_AMT);
    const right = p
      ? ' '.repeat(COL_GAP) + (p.headName || '').substring(0, W_LABEL).padEnd(W_LABEL) + '  ' + fmtAmt(p.balance).padStart(W_AMT)
      : '';
    lines.push(left + right);
  }

  const totalR = receipts.reduce((s, r) => s + (r.balance || 0), 0);
  const totalP = payments.reduce((s, p) => s + (p.balance || 0), 0);
  const leftTotal  = 'Total'.padEnd(W_LABEL) + '  ' + fmtAmt(totalR).padStart(W_AMT);
  const rightTotal = ' '.repeat(COL_GAP) + ' '.repeat(W_LABEL) + '  ' + fmtAmt(totalP).padStart(W_AMT);

  lines.push(SEP);
  lines.push(leftTotal + rightTotal);
  lines.push(SEP);
  lines.push('');
  lines.push('');

  const footer = 'Date :';
  const sign   = 'Secretary';
  lines.push(footer + ' '.repeat(REPORT_W - footer.length - sign.length) + sign);

  return lines.join('\n');
};

// ── iframe print ──────────────────────────────────────────────────────────────
const printReportText = (text: string) => {
  const safe = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><title>Member Statement</title>
      <style>
        @page { size: portrait; margin: 10mm; }
        body { font-family: 'Courier New', Courier, monospace; font-size: 10px; margin: 0; color: #000; }
        pre  { white-space: pre; font-family: inherit; font-size: inherit; }
      </style>
    </head><body><pre>${safe}</pre></body></html>`);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 400);
  }
};

// ── component ─────────────────────────────────────────────────────────────────
const MemberStatement: React.FC = () => {
  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [memberNo,    setMemberNo]    = useState('');
  const [memberName,  setMemberName]  = useState('');
  const [asOnDate,    setAsOnDate]    = useState<Dayjs>(dayjs('2020-03-31'));
  const [outputType,  setOutputType]  = useState('screen');
  const [loading,     setLoading]     = useState(false);
  const [summaryData, setSummaryData] = useState<SummaryItem[]>([]);
  const [showLookup,  setShowLookup]  = useState(false);

  const handleMemberSelect = useCallback((member: any) => {
    setMemberNo(member.memberNo || member.mbno || '');
    setMemberName(member.memberName || member.name || '');
    setShowLookup(false);
  }, []);

  const handleReset = useCallback(() => {
    setMemberNo('');
    setMemberName('');
    setAsOnDate(dayjs('2020-03-31'));
    setSummaryData([]);
    setOutputType('screen');
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!memberNo) { message.warning('Please enter a Member Number'); return; }
    setLoading(true);
    try {
      const response = await apiService.getMemberStatement({
        memberNo,
        fromDate: dayjs('2000-01-01').toISOString(),
        toDate: asOnDate.toISOString(),
      });
      const data: MemberStatementData = response.success ? response.data : (response.data || response);
      if (data) {
        const summary = data.summary || [];
        setSummaryData(summary);
        if (data.memberName) setMemberName(data.memberName);

        if (summary.length === 0) {
          message.info('No records found');
          return;
        }

        if (outputType === 'printer') {
          const name = data.memberName || memberName;
          printReportText(buildReportText(summary, name, asOnDate.format('YYYY-MM-DD')));
        }
      } else {
        message.warning('No data returned');
      }
    } catch (err) {
      console.error('[MemberStatement]', err);
      message.error('Failed to generate statement');
    } finally {
      setLoading(false);
    }
  }, [memberNo, memberName, asOnDate, outputType]);

  const reportText = useMemo(
    () => summaryData.length > 0
      ? buildReportText(summaryData, memberName, asOnDate.format('YYYY-MM-DD'))
      : '',
    [summaryData, memberName, asOnDate],
  );

  const handlePrint = useCallback(() => {
    if (reportText) printReportText(reportText);
  }, [reportText]);

  const handleExportCSV = useCallback(() => {
    if (summaryData.length === 0) { message.warning('No data to export'); return; }
    const rows = [
      '"Account Type","Balance"',
      ...summaryData.map(s => `"${s.headName}","${s.balance.toFixed(2)}"`),
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `MemberStatement_${memberNo}_${dayjs().format('YYYYMMDD')}.csv`;
    link.click();
    message.success('CSV exported');
  }, [summaryData, memberNo]);

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
        .custom-scrollbar-amber::-webkit-scrollbar-track {
          background: ${isDark ? '#1e293b' : '#f8fafc'}; border-radius: 3px;
        }
        .custom-scrollbar-amber::-webkit-scrollbar-thumb { background: #fbbf24; border-radius: 3px; }
        .custom-scrollbar-amber::-webkit-scrollbar-thumb:hover { background: #f59e0b; }

        /* ── Dark-mode overrides (Settings palette, html.dark only) ── */
        html.dark .memstmt-page { background-color: #000000 !important; background-image: none !important; }
        html.dark .memstmt-header { background-color: #0c0c0e !important; background-image: none !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .memstmt-card,
        html.dark .memstmt-report-panel { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .memstmt-report-body { background-color: #1c1c1e !important; }
        html.dark .memstmt-report-body .memstmt-report-box { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .memstmt-report-body pre { color: #f5f5f7 !important; }
        html.dark .memstmt-page h1,
        html.dark .memstmt-page h3,
        html.dark .memstmt-page h4 { color: #f5f5f7 !important; }
        html.dark .memstmt-page label { color: #8e8e93 !important; }
        html.dark .memstmt-page .text-slate-400,
        html.dark .memstmt-page .text-slate-500,
        html.dark .memstmt-page .text-slate-600 { color: #8e8e93 !important; }
        html.dark .memstmt-page .text-slate-300 { color: #71717a !important; }
        html.dark .memstmt-page .ant-input,
        html.dark .memstmt-page .ant-input-affix-wrapper,
        html.dark .memstmt-page .ant-picker { background-color: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
        html.dark .memstmt-page .ant-input-affix-wrapper .ant-input { background-color: transparent !important; }
        html.dark .memstmt-page .ant-picker input { color: #f5f5f7 !important; }
        html.dark .memstmt-page .ant-btn:not(.ant-btn-primary) { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
      `}</style>

      <div className={`memstmt-page h-screen flex flex-col font-sans overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 via-amber-50/20 to-slate-50'}`}>

        {/* Header */}
        <div className={`memstmt-header px-3 py-1.5 flex items-center justify-between z-10 shadow-sm shrink-0 border-b no-print ${isDark ? 'bg-gradient-to-r from-slate-900 to-slate-900 border-white/5' : 'bg-white/90 backdrop-blur-sm border-slate-200/60'}`}>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-amber-600 to-amber-700 p-1.5 rounded-lg text-white shadow-md">
              <BookOpen size={14} />
            </div>
            <div>
              <h1 className={`fz-label font-black tracking-tight leading-none ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Member Statement</h1>
              <div className={`flex items-center gap-1 mt-0.5 fz-caption font-bold uppercase tracking-wider leading-none ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                <ShieldCheck size={8} className="text-amber-500" /> Account Summary
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button icon={<RotateCcw size={11} />} size="small"
              className="h-7 px-2 rounded-lg fz-caption font-bold uppercase tracking-wide border-slate-200 hover:border-amber-500 hover:text-amber-600"
              onClick={handleReset}>Reset</Button>
            <Button icon={<Printer size={11} />} size="small"
              className="h-7 px-2 rounded-lg fz-caption font-bold uppercase tracking-wide border-slate-200 hover:border-amber-500 hover:text-amber-600"
              onClick={handlePrint} disabled={!reportText}>Print</Button>
            <Button type="primary" icon={<FileDown size={11} />} size="small"
              className="h-7 px-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 rounded-lg fz-caption font-bold uppercase tracking-wide shadow-md"
              onClick={handleExportCSV} disabled={!reportText}>CSV</Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden p-2 flex gap-2">

          {/* Sidebar */}
          <div className="w-[220px] flex flex-col gap-2 shrink-0 no-print overflow-y-auto custom-scrollbar-amber">

            {/* Member */}
            <div className={`memstmt-card rounded-lg overflow-hidden shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 border-amber-200/60'}`}>
              <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-2 py-1 flex items-center gap-1">
                <User size={10} className="text-white" />
                <h3 className="fz-caption font-black text-white tracking-wide uppercase">Member</h3>
              </div>
              <div className="p-2 space-y-1.5">
                <label className={`fz-caption font-bold uppercase tracking-tight flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <User size={10} className="text-amber-500" />Member No
                </label>
                <Input.Search
                  placeholder="Type member no..."
                  value={memberNo}
                  onChange={e => setMemberNo(e.target.value)}
                  onSearch={() => setShowLookup(true)}
                  className="h-8 fz-label font-semibold"
                />
                <label className={`fz-caption font-bold uppercase tracking-tight flex items-center gap-1 mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <User size={10} className="text-amber-500" />Member Name
                </label>
                <Input
                  value={memberName}
                  readOnly
                  placeholder="Selected member name"
                  className="h-8 fz-label font-semibold"
                />
              </div>
            </div>

            {/* As On Date */}
            <div className={`memstmt-card rounded-lg overflow-hidden shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 border-amber-200/60'}`}>
              <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-2 py-1 flex items-center gap-1">
                <Calendar size={10} className="text-white" />
                <h3 className="fz-caption font-black text-white tracking-wide uppercase">As On Date</h3>
              </div>
              <div className="p-2">
                <label className={`fz-caption font-bold uppercase tracking-tight block mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Date</label>
                <DatePicker className="w-full h-7 fz-caption font-semibold" value={asOnDate}
                  onChange={v => v && setAsOnDate(v)} format="DD-MMM-YY" />
              </div>
            </div>

            {/* Output */}
            <div className={`memstmt-card rounded-lg overflow-hidden shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 border-amber-200/60'}`}>
              <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-2 py-1 flex items-center gap-1">
                <FileText size={10} className="text-white" />
                <h3 className="fz-caption font-black text-white tracking-wide uppercase">Output</h3>
              </div>
              <div className="p-2 space-y-1.5">
                <Radio.Group size="small" value={outputType} onChange={e => setOutputType(e.target.value)} className="w-full">
                  <Radio.Button value="screen"  className="w-1/2 text-center fz-caption font-bold">SCR</Radio.Button>
                  <Radio.Button value="printer" className="w-1/2 text-center fz-caption font-bold">PTR</Radio.Button>
                </Radio.Group>
                <Button type="primary" block size="small" icon={<Search size={11} />}
                  onClick={handleGenerate} loading={loading}
                  className="h-8 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 font-black uppercase tracking-wider fz-caption mt-1 shadow-lg">
                  Generate
                </Button>
              </div>
            </div>
          </div>

          {/* Report Panel */}
          <div className={`memstmt-report-panel flex-1 rounded-lg shadow-sm flex flex-col overflow-hidden border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 border-amber-200/60'}`}>
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-3 py-1.5 flex items-center justify-between shrink-0 no-print">
              <div className="flex items-center gap-1.5">
                <div className="bg-white/20 p-1 rounded-md shadow-sm"><FileText size={12} className="text-white" /></div>
                <div>
                  <h3 className="fz-caption font-black text-white uppercase tracking-wide leading-none">Member Statement</h3>
                  <p className="fz-caption font-bold text-amber-200 uppercase mt-0.5 tracking-tight leading-none">
                    As On {asOnDate.format('DD-MMM-YY')}
                  </p>
                </div>
              </div>
              <div className="fz-caption font-black text-white bg-white/20 px-2 py-0.5 rounded">
                Total Pages: 1
              </div>
            </div>

            <div className={`memstmt-report-body flex-1 overflow-auto p-3 custom-scrollbar-amber ${isDark ? 'bg-slate-900/40' : 'bg-gradient-to-br from-white to-amber-50/10'}`}>
              <Spin spinning={loading} tip="Loading..." size="small">
                {reportText ? (
                  <div className={`memstmt-report-box rounded-lg border p-4 overflow-x-auto ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-[#fffff0] border-amber-200'}`}>
                    <pre style={{
                      fontFamily: "'Courier New', Courier, monospace",
                      fontSize: '10px',
                      lineHeight: 1.5,
                      color: isDark ? '#e2e8f0' : '#1e293b',
                      margin: 0,
                      whiteSpace: 'pre',
                    }}>
                      {reportText}
                    </pre>
                  </div>
                ) : (
                  <div className="py-32 text-center">
                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner ${isDark ? 'bg-slate-800' : 'bg-amber-50'}`}>
                      <FileText className={`text-4xl ${isDark ? 'text-slate-600' : 'text-amber-200'}`} />
                    </div>
                    <h4 className={`font-black fz-label uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No Data</h4>
                    <p className={`fz-caption mt-1 font-semibold ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>Enter member and generate</p>
                  </div>
                )}
              </Spin>
            </div>
          </div>
        </div>
      </div>

      {/* Member Lookup Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 py-1">
            <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center shadow-md">
              <Users size={16} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-black text-slate-800">Member Lookup</div>
              <div className="fz-caption text-slate-400 font-bold uppercase tracking-wide">Select Member</div>
            </div>
          </div>
        }
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

export default MemberStatement;
