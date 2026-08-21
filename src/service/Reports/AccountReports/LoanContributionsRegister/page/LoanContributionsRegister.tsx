import React, { useState, useCallback } from 'react';
import { ConfigProvider, Button, Input, DatePicker, Spin, Radio, Modal, message, theme } from 'antd';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';
import { FileText, Printer, Search, RotateCcw, Briefcase, User, Users, Monitor, Calendar } from 'lucide-react';
import { apiService } from '../../../../../services/api';
import dayjs from 'dayjs';
import MemberLookup from '../../../../../components/shared/MemberLookup/MemberLookup';

// ── text helpers ──────────────────────────────────────────────────
const W = 100;
const ctr = (s: string) => s.padStart(Math.floor((W + s.length) / 2)).padEnd(W);
const rl  = () => '-'.repeat(W);
const lr  = (l: string, r: string) => l + r.padStart(W - l.length);
const col = (s: string, w: number, align: 'l' | 'r' = 'l') =>
  align === 'l' ? s.substring(0, w).padEnd(w) : s.substring(0, w).padStart(w);

const fmtAmt = (n: number) =>
  (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d?: string) => (d ? dayjs(d).format('DD-MMM-YY') : '---');

const buildReportText = (data: any): string => {
  const lines: string[] = [];

  lines.push(ctr('Espat Karmchari Co-Operative Credit Society Limited.'));
  lines.push(ctr('Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006'));
  lines.push(ctr('Reg No: A.R/DRG/1796'));
  lines.push(rl());
  lines.push(ctr('LOAN CONTRIBUTIONS REGISTER'));
  lines.push(lr(`Member : ${data.memberNo}  ${data.memberName}`,
    `Period : ${dayjs(data.fromDate).format('DD-MMM-YYYY')} to ${dayjs(data.toDate).format('DD-MMM-YYYY')}`));
  lines.push(rl());

  if (!data.loanContributions || data.loanContributions.length === 0) {
    lines.push('');
    lines.push(ctr('No loan records found for this member'));
    lines.push(rl());
    lines.push(ctr('Report as per data available'));
    return lines.join('\n');
  }

  data.loanContributions.forEach((lc: any) => {
    const ld = lc.loanDetails;
    lines.push('');
    lines.push(`  Loan Type: ${ld.loanType}   Case No: ${ld.loanCaseNo}   Amount: Rs. ${fmtAmt(ld.loanAmount)}   Rate: ${ld.interestRate}%`);
    lines.push(`  Installment: Rs. ${fmtAmt(ld.installmentAmount)}   No.of Inst: ${ld.numberOfInstallments}   Outstanding: Rs. ${fmtAmt(ld.outstandingBalance)}`);
    lines.push(rl());

    if (lc.transactions && lc.transactions.length > 0) {
      lines.push(
        col('Date', 12) + col('Vchr No', 12) + col('Type', 6) +
        col('Amount', 14, 'r') + '  ' + 'Narration'
      );
      lines.push(rl());

      lc.transactions.forEach((t: any) => {
        lines.push(
          col(fmtDate(t.transactionDate), 12) +
          col(t.voucherNo || '', 12) +
          col(t.transactionType, 6) +
          col(fmtAmt(t.transactionAmount), 14, 'r') + '  ' +
          (t.narration || '').substring(0, 40)
        );
      });
      lines.push(rl());
    } else {
      lines.push('  No transactions in this period');
      lines.push(rl());
    }
  });

  lines.push('');
  const s = data.summary || {};
  lines.push(lr(
    `Total Loans: ${data.loanContributions.length}   Transactions: ${data.totalTransactions || 0}`,
    `Debits: Rs. ${fmtAmt(s.totalDebits || 0)}   Credits: Rs. ${fmtAmt(s.totalCredits || 0)}`
  ));
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

const LoanContributionsRegister: React.FC = () => {
  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [memberNo, setMemberNo]     = useState('');
  const [memberName, setMemberName] = useState('');
  const [fromDate, setFromDate]     = useState<dayjs.Dayjs>(dayjs().startOf('month'));
  const [toDate, setToDate]         = useState<dayjs.Dayjs>(dayjs());
  const [outputType, setOutputType] = useState<'screen' | 'printer'>('screen');
  const [loading, setLoading]       = useState(false);
  const [reportText, setReportText] = useState('');
  const [showLookup, setShowLookup] = useState(false);

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
      const response = await apiService.getLoanContributionsRegister({
        memberNo: memberNo.trim(),
        fromDate: fromDate.format('YYYY-MM-DD'),
        toDate: toDate.format('YYYY-MM-DD'),
      });
      const data = (response as any)?.data || response;

      if (data && data.memberNo) {
        setMemberName(data.memberName || '');
        const text = buildReportText(data);
        setReportText(text);
        if (data.totalTransactions > 0) message.success(`Found ${data.totalTransactions} transactions`);
        else message.info('No transactions found in this period');
        if (outputType === 'printer') printReportText(text);
      } else {
        setReportText('');
        message.error('Member not found');
      }
    } catch {
      message.error('Failed to load loan contributions');
      setReportText('');
    } finally {
      setLoading(false);
    }
  }, [memberNo, fromDate, toDate, outputType]);

  const handleReset = useCallback(() => {
    setMemberNo('');
    setMemberName('');
    setFromDate(dayjs().startOf('month'));
    setToDate(dayjs());
    setReportText('');
  }, []);

  return (
    <ConfigProvider theme={{
      algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: { colorPrimary: '#0ea5e9', borderRadius: 6, fontSize: 12 },
    }}>
      <div className={`h-screen flex flex-col font-sans overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 via-sky-50/20 to-slate-50'}`}>

        {/* Header */}
        <div className={`px-3 py-1.5 flex items-center justify-between shrink-0 border-b ${isDark ? 'bg-gradient-to-r from-slate-900 to-slate-900 border-white/5' : 'bg-white/90 border-slate-200/60'}`}>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-sky-600 to-sky-700 p-1.5 rounded-lg text-white shadow-md">
              <Briefcase size={14} />
            </div>
            <div>
              <h1 className="fz-label font-black tracking-tight leading-none">Loan Contributions Register</h1>
              <div className="fz-caption font-bold text-slate-400 uppercase tracking-wider leading-none mt-0.5">
                <Briefcase size={8} className="inline text-sky-500 mr-1" />Loan Transactions
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

            <div className={`border rounded-lg overflow-hidden shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-sky-200/60'}`}>
              <div className="bg-gradient-to-r from-sky-600 to-sky-700 px-2 py-1 flex items-center gap-1">
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

            <div className={`border rounded-lg overflow-hidden shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-sky-200/60'}`}>
              <div className="bg-gradient-to-r from-sky-600 to-sky-700 px-2 py-1 flex items-center gap-1">
                <Calendar size={10} className="text-white" />
                <span className="fz-caption font-black text-white uppercase">Date Range</span>
              </div>
              <div className="p-2 space-y-1.5">
                <div>
                  <div className="fz-caption font-bold text-slate-500 mb-0.5">From Date</div>
                  <DatePicker value={fromDate} onChange={v => v && setFromDate(v)} format="DD-MMM-YYYY" size="small" className="w-full fz-caption" />
                </div>
                <div>
                  <div className="fz-caption font-bold text-slate-500 mb-0.5">To Date</div>
                  <DatePicker value={toDate} onChange={v => v && setToDate(v)} format="DD-MMM-YYYY" size="small" className="w-full fz-caption" />
                </div>
              </div>
            </div>

            <div className={`border rounded-lg p-2 shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-sky-200/60'}`}>
              <div className="fz-caption font-bold text-slate-500 mb-1 uppercase">Output</div>
              <Radio.Group value={outputType} onChange={e => setOutputType(e.target.value)} size="small">
                <Radio value="screen" className="fz-caption"><Monitor size={10} className="inline mr-1" />Screen</Radio>
                <Radio value="printer" className="fz-caption"><Printer size={10} className="inline mr-1" />Printer</Radio>
              </Radio.Group>
            </div>

            <Button
              type="primary" block size="small" icon={<Search size={11} />}
              onClick={handleGenerate} loading={loading}
              className="h-8 bg-gradient-to-r from-sky-600 to-sky-700 font-black uppercase fz-caption shadow-lg"
            >
              Generate
            </Button>
          </div>

          {/* Report Area RIGHT */}
          <div className={`flex-1 border rounded-lg shadow-sm flex flex-col overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-sky-200/60'}`}>
            <div className="bg-gradient-to-r from-sky-600 to-sky-700 px-3 py-1.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <Briefcase size={12} className="text-white" />
                <span className="fz-caption font-black text-white uppercase">Loan Contributions Register</span>
                {memberNo && <span className="fz-caption font-bold text-sky-100 ml-1">Member: {memberNo}</span>}
              </div>
              <span className="fz-caption font-bold text-sky-100">{fromDate.format('DD-MMM-YY')} – {toDate.format('DD-MMM-YY')}</span>
            </div>

            <div className={`flex-1 overflow-auto p-3 ${isDark ? 'bg-slate-900/40' : 'bg-white'}`}>
              <Spin spinning={loading} size="small">
                {reportText ? (
                  <pre className={`font-mono fz-caption leading-[1.5] whitespace-pre select-text ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                    {reportText}
                  </pre>
                ) : (
                  <div className="py-32 text-center">
                    <div className="w-20 h-20 bg-sky-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <Briefcase size={40} className="text-sky-200" />
                    </div>
                    <p className="fz-label font-black text-slate-400 uppercase tracking-wider">No Data</p>
                    <p className="fz-caption text-slate-300 mt-1">Enter member number, date range and generate</p>
                  </div>
                )}
              </Spin>
            </div>
          </div>
        </div>
      </div>

      <Modal
        title={<div className="flex items-center gap-2 py-1"><div className="w-8 h-8 bg-sky-600 rounded-lg flex items-center justify-center shadow-md"><Users size={16} className="text-white" /></div><div><div className="fz-body font-black text-slate-800">Member Lookup</div><div className="fz-caption text-slate-400 font-bold uppercase tracking-wide">Select Member</div></div></div>}
        open={showLookup} onCancel={() => setShowLookup(false)} footer={null} width={1000} centered destroyOnClose
      >
        <div className="p-2"><MemberLookup isModal={true} onSelect={handleMemberSelect} onClose={() => setShowLookup(false)} /></div>
      </Modal>
    </ConfigProvider>
  );
};

export default LoanContributionsRegister;
