import React, { useState, useCallback, useMemo } from 'react';
import { ConfigProvider, Button, Input, Select, Spin, Radio, Modal, message, theme } from 'antd';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';
import { FileText, Printer, Search, RotateCcw, IndianRupee, User, Users, Monitor, Calendar } from 'lucide-react';
import { apiService } from '../../../../../services/api';
import dayjs from 'dayjs';
import MemberLookup from '../../../../../components/shared/MemberLookup/MemberLookup';

interface RecoveryData {
  memberNo: string;
  memberName: string;
  address: string;
  period: string;
  totalDemand: number;
  loanRecoveries: {
    regularLoan: number;
    emergencyLoan: number;
    advanceLoan: number;
    miscLoan: number;
  };
  depositRecoveries: {
    recurringDeposit: number;
    monthlyDeposit: number;
    compulsoryDeposit: number;
    shareAmount: number;
  };
  charges: {
    bankCharges: number;
    otherCharges: number;
  };
}

// ── text helpers ──────────────────────────────────────────────────
const W = 110;
const ctr = (s: string) => s.padStart(Math.floor((W + s.length) / 2)).padEnd(W);
const rl  = () => '-'.repeat(W);
const lr  = (l: string, r: string) => l + r.padStart(W - l.length);
const col = (s: string, w: number, align: 'l' | 'r' = 'l') =>
  align === 'l' ? s.substring(0, w).padEnd(w) : s.substring(0, w).padStart(w);

const fmtAmt = (n: number) =>
  (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MONTH_OPTIONS = MONTH_NAMES.map(m => ({ value: m, label: m }));

const buildReportText = (d: RecoveryData, monthLabel: string, year: number): string => {
  const lines: string[] = [];

  lines.push(ctr('Espat Karmchari Co-Operative Credit Society Limited.'));
  lines.push(ctr('Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006'));
  lines.push(ctr('Reg No: A.R/DRG/1796'));
  lines.push(rl());
  lines.push(ctr('Statement Of Recovery in Detailed'));
  lines.push(ctr(`For The Month Of ${monthLabel}  ${year}`));
  lines.push(rl());
  lines.push('');

  // ── Column headers (matching legacy layout) ─────────────────
  // Line 1
  lines.push(
    col('Acc', 11) + col('Name Of the Member', 22) +
    col('REG LN', 11) + col('EMR LN', 11) + col('TOTAL', 9) +
    col('CONT', 9) + col('LOAN', 9) + col('INT', 9) +
    col('EMER', 9) + col('INT ON', 10)
  );
  // Line 2
  lines.push(
    col('No', 11) + col('', 22) +
    col('Out_ST', 11) + col('Out_ST', 11) + col('RD', 9) +
    col('REC', 9) + col('REC', 9) + col('LOAN', 9) +
    col('LOAN', 9) + col('ENERG', 10)
  );
  // Line 3
  lines.push(
    col('', 11) + col('', 22) +
    col('', 11) + col('', 11) + col('', 9) +
    col('', 9) + col('', 9) + col('', 9) +
    col('REC', 9) + col('LOAN', 10)
  );
  lines.push(rl());

  // ── Data row ────────────────────────────────────────────────
  const lr_ = d.loanRecoveries;
  const dr_ = d.depositRecoveries;
  const ch_ = d.charges;

  lines.push(
    col(d.memberNo, 11) + col(d.memberName.substring(0, 21), 22) +
    col(fmtAmt(lr_.regularLoan), 11, 'r') +
    col(fmtAmt(lr_.emergencyLoan), 11, 'r') +
    col(fmtAmt(dr_.recurringDeposit), 9, 'r') +
    col(fmtAmt(dr_.compulsoryDeposit), 9, 'r') +
    col(fmtAmt(lr_.regularLoan), 9, 'r') +
    col(fmtAmt(ch_.bankCharges), 9, 'r') +
    col(fmtAmt(lr_.emergencyLoan), 9, 'r') +
    col(fmtAmt(ch_.otherCharges), 10, 'r')
  );
  lines.push(rl());

  // ── Totals row ──────────────────────────────────────────────
  const totLoans = lr_.regularLoan + lr_.emergencyLoan + lr_.advanceLoan;
  const totDeps = dr_.recurringDeposit + dr_.monthlyDeposit + dr_.compulsoryDeposit + dr_.shareAmount;
  const totCharges = ch_.bankCharges + ch_.otherCharges;

  lines.push(
    col('Total', 11) + col('', 22) +
    col(fmtAmt(lr_.regularLoan), 11, 'r') +
    col(fmtAmt(lr_.emergencyLoan), 11, 'r') +
    col(fmtAmt(dr_.recurringDeposit), 9, 'r') +
    col(fmtAmt(dr_.compulsoryDeposit), 9, 'r') +
    col(fmtAmt(totLoans), 9, 'r') +
    col(fmtAmt(totCharges), 9, 'r') +
    col(fmtAmt(lr_.emergencyLoan), 9, 'r') +
    col(fmtAmt(ch_.otherCharges), 10, 'r')
  );
  lines.push(rl());
  lines.push('');

  // ── Summary section ─────────────────────────────────────────
  lines.push(lr(`Member   : ${d.memberNo}  ${d.memberName}`, `Period : ${d.period}`));
  lines.push('');
  lines.push(`  ${'Loan Recoveries'.padEnd(30)} ${'Deposit Recoveries'.padEnd(30)} ${'Charges'}`);
  lines.push(rl());
  lines.push(`  ${'Regular Loan (RLN)'.padEnd(20)} ${fmtAmt(lr_.regularLoan).padStart(10)}   ${'Recurring Dep (RD)'.padEnd(20)} ${fmtAmt(dr_.recurringDeposit).padStart(10)}   ${'Bank Charges'.padEnd(16)} ${fmtAmt(ch_.bankCharges).padStart(10)}`);
  lines.push(`  ${'Emergency Loan (ELN)'.padEnd(20)} ${fmtAmt(lr_.emergencyLoan).padStart(10)}   ${'Monthly Dep (MD)'.padEnd(20)} ${fmtAmt(dr_.monthlyDeposit).padStart(10)}   ${'Other Charges'.padEnd(16)} ${fmtAmt(ch_.otherCharges).padStart(10)}`);
  lines.push(`  ${'Advance Loan (ALN)'.padEnd(20)} ${fmtAmt(lr_.advanceLoan).padStart(10)}   ${'Compulsory Dep (CD)'.padEnd(20)} ${fmtAmt(dr_.compulsoryDeposit).padStart(10)}`);
  lines.push(`  ${''.padEnd(20)} ${''.padStart(10)}   ${'Share Amount'.padEnd(20)} ${fmtAmt(dr_.shareAmount).padStart(10)}`);
  lines.push(rl());
  lines.push(`  ${'Sub-Total'.padEnd(20)} ${fmtAmt(totLoans).padStart(10)}   ${'Sub-Total'.padEnd(20)} ${fmtAmt(totDeps).padStart(10)}   ${'Sub-Total'.padEnd(16)} ${fmtAmt(totCharges).padStart(10)}`);
  lines.push(rl());
  lines.push('');
  lines.push(ctr(`TOTAL DEMAND : Rs. ${fmtAmt(d.totalDemand)}`));
  lines.push(rl());
  lines.push(ctr('Report as per data available'));

  return lines.join('\n');
};

const printReportText = (text: string) => {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

const RecoveryDetails: React.FC = () => {
  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [memberNo, setMemberNo]     = useState('');
  const [memberName, setMemberName] = useState('');
  const [month, setMonth]           = useState<string>(MONTH_NAMES[dayjs().month()]);
  const [year, setYear]             = useState<number>(dayjs().year());
  const [outputType, setOutputType] = useState<'screen' | 'printer'>('screen');
  const [loading, setLoading]       = useState(false);
  const [reportText, setReportText] = useState('');
  const [showLookup, setShowLookup] = useState(false);

  const yearOptions = useMemo(() =>
    Array.from({ length: 10 }, (_, i) => {
      const y = dayjs().year() - i;
      return { value: y, label: y.toString() };
    }), []);

  const handleMemberSelect = useCallback((member: any) => {
    setMemberNo(member.memberNo || member.mbno || '');
    setMemberName(member.memberName || member.name || '');
    setShowLookup(false);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!memberNo.trim()) {
      message.warning('Please enter Member Number');
      return;
    }
    setLoading(true);
    try {
      const response = await apiService.getRecoveryDetails({
        memberNo: memberNo.trim(),
        month,
        year: String(year),
      });
      const data: RecoveryData | null = (response as any)?.data || response || null;

      if (data && data.memberNo) {
        setMemberName(data.memberName || '');
        const text = buildReportText(data, month, year);
        setReportText(text);
        message.success('Recovery details loaded');
        if (outputType === 'printer') printReportText(text);
      } else {
        setReportText('');
        message.info('No recovery details found for this period');
      }
    } catch {
      message.error('No recovery details found for this member/period');
      setReportText('');
    } finally {
      setLoading(false);
    }
  }, [memberNo, month, year, outputType]);

  const handleReset = useCallback(() => {
    setMemberNo('');
    setMemberName('');
    setMonth(MONTH_NAMES[dayjs().month()]);
    setYear(dayjs().year());
    setReportText('');
  }, []);

  return (
    <ConfigProvider theme={{
      algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: { colorPrimary: '#ef4444', borderRadius: 6, fontSize: 12 },
    }}>
      <div className={`rd-page h-screen flex flex-col font-sans overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 via-red-50/20 to-slate-50'}`}>

        {/* Header */}
        <div className={`rd-header px-3 py-1.5 flex items-center justify-between shrink-0 border-b ${isDark ? 'bg-gradient-to-r from-slate-900 to-slate-900 border-white/5' : 'bg-white/90 border-slate-200/60'}`}>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-red-600 to-red-700 p-1.5 rounded-lg text-white shadow-md">
              <IndianRupee size={14} />
            </div>
            <div>
              <h1 className="fz-label font-black tracking-tight leading-none">Recovery Details</h1>
              <div className="fz-caption font-bold text-slate-400 uppercase tracking-wider leading-none mt-0.5">
                <IndianRupee size={8} className="inline text-red-500 mr-1" />Monthly Demand Statement
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button icon={<RotateCcw size={11} />} size="small" className="h-7 fz-caption font-bold" onClick={handleReset}>Reset</Button>
            <Button icon={<Printer size={11} />} size="small" className="h-7 fz-caption font-bold"
              onClick={() => reportText && printReportText(reportText)} disabled={!reportText}>Print</Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden p-2 flex gap-2">

          {/* Sidebar LEFT */}
          <div className="w-[220px] flex flex-col gap-2 shrink-0">

            <div className={`rd-card border rounded-lg overflow-hidden shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-red-200/60'}`}>
              <div className="bg-gradient-to-r from-red-600 to-red-700 px-2 py-1 flex items-center gap-1">
                <User size={10} className="text-white" />
                <span className="fz-caption font-black text-white uppercase">Member</span>
              </div>
              <div className="p-2 space-y-1.5">
                <Input.Search
                  value={memberNo}
                  onChange={e => setMemberNo(e.target.value)}
                  onSearch={() => setShowLookup(true)}
                  placeholder="Member No"
                  size="small"
                  className="h-8 fz-label font-semibold"
                  onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                />
                <Input value={memberName} readOnly placeholder="Member name" size="small" className="fz-caption" />
              </div>
            </div>

            <div className={`rd-card border rounded-lg overflow-hidden shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-red-200/60'}`}>
              <div className="bg-gradient-to-r from-red-600 to-red-700 px-2 py-1 flex items-center gap-1">
                <Calendar size={10} className="text-white" />
                <span className="fz-caption font-black text-white uppercase">Period</span>
              </div>
              <div className="p-2 space-y-1.5">
                <div>
                  <div className="fz-caption font-bold text-slate-500 mb-0.5">Select Month</div>
                  <Select value={month} onChange={setMonth} options={MONTH_OPTIONS} size="small" className="w-full fz-caption" />
                </div>
                <div>
                  <div className="fz-caption font-bold text-slate-500 mb-0.5">Select Year</div>
                  <Select value={year} onChange={setYear} options={yearOptions} size="small" className="w-full fz-caption" />
                </div>
              </div>
            </div>

            <div className={`rd-card border rounded-lg p-2 shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-red-200/60'}`}>
              <div className="fz-caption font-bold text-slate-500 mb-1 uppercase">Output</div>
              <Radio.Group value={outputType} onChange={e => setOutputType(e.target.value)} size="small">
                <Radio value="screen" className="fz-caption"><Monitor size={10} className="inline mr-1" />Screen</Radio>
                <Radio value="printer" className="fz-caption"><Printer size={10} className="inline mr-1" />Printer</Radio>
              </Radio.Group>
            </div>

            <Button
              type="primary" block size="small" icon={<Search size={11} />}
              onClick={handleGenerate} loading={loading}
              className="h-8 bg-gradient-to-r from-red-600 to-red-700 font-black uppercase fz-caption shadow-lg"
            >
              Generate
            </Button>
          </div>

          {/* Report Area RIGHT */}
          <div className={`rd-report-panel flex-1 border rounded-lg shadow-sm flex flex-col overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-red-200/60'}`}>
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-3 py-1.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <IndianRupee size={12} className="text-white" />
                <span className="fz-caption font-black text-white uppercase">Recovery Details</span>
                {memberNo && <span className="fz-caption font-bold text-red-100 ml-1">Member: {memberNo}</span>}
              </div>
              <span className="fz-caption font-bold text-red-100">{month} {year}</span>
            </div>

            <div className={`flex-1 overflow-auto p-3 ${isDark ? 'bg-slate-900/40' : 'bg-white'}`}>
              <Spin spinning={loading} size="small">
                {reportText ? (
                  <pre className={`font-mono fz-small leading-[1.5] whitespace-pre select-text ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                    {reportText}
                  </pre>
                ) : (
                  <div className="py-32 text-center">
                    <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <IndianRupee size={40} className="text-red-200" />
                    </div>
                    <p className="fz-label font-black text-slate-400 uppercase tracking-wider">No Data</p>
                    <p className="fz-caption text-slate-300 mt-1">Enter member number, select period and generate</p>
                  </div>
                )}
              </Spin>
            </div>
          </div>
        </div>
      </div>

      <Modal
        title={<div className="flex items-center gap-2 py-1"><div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center shadow-md"><Users size={16} className="text-white" /></div><div><div className="fz-body font-black text-slate-800">Member Lookup</div><div className="fz-caption text-slate-400 font-bold uppercase tracking-wide">Select Member</div></div></div>}
        open={showLookup} onCancel={() => setShowLookup(false)} footer={null} width={1000} centered destroyOnClose
      >
        <div className="p-2"><MemberLookup isModal={true} onSelect={handleMemberSelect} onClose={() => setShowLookup(false)} /></div>
      </Modal>

      <style>{`
        /* ── Recovery Details — dark mode ── */
        html.dark .rd-page { background-color: #000000 !important; color: #f5f5f7 !important; }
        html.dark .rd-header { background-color: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .rd-header h1 { color: #f5f5f7 !important; }
        html.dark .rd-header .text-slate-400 { color: #8e8e93 !important; }
        html.dark .rd-card { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .rd-card .text-slate-500 { color: #8e8e93 !important; }
        html.dark .rd-report-panel { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .rd-page .bg-slate-900\\/40 { background-color: rgba(255,255,255,.03) !important; }
        html.dark .rd-page .bg-white { background-color: #1c1c1e !important; }
        html.dark .rd-page .text-slate-900 { color: #f5f5f7 !important; }
        html.dark .rd-page .text-slate-400 { color: #8e8e93 !important; }
        html.dark .rd-page .text-slate-300 { color: #71717a !important; }
        html.dark .rd-page pre { color: #f5f5f7 !important; }
        /* Antd controls */
        html.dark .rd-page .ant-input,
        html.dark .rd-page .ant-input-affix-wrapper,
        html.dark .rd-page input.ant-input {
          background-color: rgba(255,255,255,.05) !important; color: #f5f5f7 !important; border-color: rgba(255,255,255,.08) !important;
        }
        html.dark .rd-page .ant-input::placeholder { color: #71717a !important; }
        html.dark .rd-page .ant-select-selector {
          background-color: rgba(255,255,255,.05) !important; color: #f5f5f7 !important; border-color: rgba(255,255,255,.08) !important;
        }
        html.dark .rd-page .ant-select-selection-item { color: #f5f5f7 !important; }
        html.dark .rd-page .ant-btn:not(.ant-btn-primary) {
          background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important;
        }
        html.dark .rd-page .ant-radio-wrapper { color: #f5f5f7 !important; }
        html.dark .ant-modal-content, html.dark .ant-modal-header {
          background-color: #1c1c1e !important; color: #f5f5f7 !important; border-color: rgba(255,255,255,.08) !important;
        }
        html.dark .ant-modal-title { color: #f5f5f7 !important; }
      `}</style>
    </ConfigProvider>
  );
};

export default RecoveryDetails;
