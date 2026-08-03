import React, { useState, useCallback } from 'react';
import { ConfigProvider, Button, Input, Spin, Radio, Modal, message, theme } from 'antd';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';
import { FileText, Printer, Search, RotateCcw, Repeat, User, Users, Monitor } from 'lucide-react';
import { apiService } from '../../../../../services/api';
import dayjs from 'dayjs';
import MemberLookup from '../../../../../components/shared/MemberLookup/MemberLookup';

interface RDItem {
  key: string;
  accountNo: string;
  memberNo: string;
  memberName: string;
  startDate: string;
  maturityDate: string;
  amount: number;
  installmentsPaid: number;
  installmentsMissed: number;
  totalDeposited: number;
  status: string;
}

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

const buildReportText = (data: RDItem[], memberNo: string): string => {
  const lines: string[] = [];
  const name = data.length > 0 ? data[0].memberName : '';

  lines.push(ctr('Espat Karmchari Co-Operative Credit Society Limited.'));
  lines.push(ctr('Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006'));
  lines.push(ctr('Reg No: A.R/DRG/1796'));
  lines.push(rl());
  lines.push(ctr('Statement Showing Details of RD Accounts Of The Members'));
  lines.push(rl());
  lines.push('');
  lines.push(lr(`Member No : ${memberNo}`, `Name : ${name}`));
  lines.push('');

  // ── Pivoted layout: RD1, RD2, ... as column groups ──────────
  // Each RD group: AccNo(12) NO.Of Inst(8) Total Inst(12) = ~32 per RD
  // With Name(20) prefix for first line
  // Max ~3 RDs per row at W=100

  const perGroup = 28;
  const maxPerRow = Math.floor((W - 8) / perGroup) || 1;
  const chunks: RDItem[][] = [];
  for (let i = 0; i < data.length; i += maxPerRow) {
    chunks.push(data.slice(i, i + maxPerRow));
  }

  chunks.forEach((chunk, ci) => {
    // Header line 1: RD labels
    let hdr1 = col('', 8);
    chunk.forEach((_, j) => {
      const rdNum = ci * maxPerRow + j + 1;
      hdr1 += col(`RD${rdNum}`, 10) + col('NO. Of', 8) + col('Total', 10);
    });
    lines.push(hdr1);

    // Header line 2
    let hdr2 = col('Name', 8);
    chunk.forEach(() => {
      hdr2 += col('Acc_No', 10) + col('Inst', 8) + col('Inst', 10);
    });
    lines.push(hdr2);
    lines.push(rl());

    // Data line
    let row = col(ci === 0 ? name.substring(0, 7) : '', 8);
    chunk.forEach(rd => {
      row += col(rd.accountNo.substring(0, 9), 10) +
             col(String(rd.installmentsPaid || 0), 8) +
             col(fmtAmt(rd.totalDeposited), 10, 'r');
    });
    lines.push(row);

    // Detail lines: Start Date / Maturity / Monthly / Status
    let detailRow1 = col('', 8);
    chunk.forEach(rd => {
      detailRow1 += col(fmtDate(rd.startDate), 10) +
                    col(fmtDate(rd.maturityDate), 8) +
                    col(fmtAmt(rd.amount), 10, 'r');
    });
    lines.push(detailRow1);

    let detailRow2 = col('', 8);
    chunk.forEach(rd => {
      detailRow2 += col('Start Dt', 10) + col('Mat Dt', 8) + col('Monthly', 10);
    });
    lines.push(detailRow2);

    let statusRow = col('', 8);
    chunk.forEach(rd => {
      statusRow += col(`Missed:${rd.installmentsMissed || 0}`, 10) +
                   col(`Status:`, 8) +
                   col(rd.status || '', 10);
    });
    lines.push(statusRow);

    lines.push(rl());
  });

  if (data.length === 0) {
    lines.push(ctr('No RD accounts found for this member'));
    lines.push(rl());
  }

  // ── Summary ─────────────────────────────────────────────────
  const totDep = data.reduce((s, r) => s + r.totalDeposited, 0);
  const totAmt = data.reduce((s, r) => s + r.amount, 0);
  lines.push('');
  lines.push(lr(`Total RD Accounts : ${data.length}`, `Total Deposited : Rs. ${fmtAmt(totDep)}`));
  lines.push(lr('', `Total Monthly     : Rs. ${fmtAmt(totAmt)}`));
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

const RecurringDetails: React.FC = () => {
  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [memberNo, setMemberNo]     = useState('');
  const [memberName, setMemberName] = useState('');
  const [outputType, setOutputType] = useState<'screen' | 'printer'>('screen');
  const [loading, setLoading]       = useState(false);
  const [reportText, setReportText] = useState('');
  const [recordCount, setRecordCount] = useState(0);
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
      const response = await apiService.getRecurringDetails({ memberNo: memberNo.trim() });
      const items: RDItem[] = Array.isArray((response as any)?.data)
        ? (response as any).data
        : Array.isArray(response) ? (response as any) : [];

      if (items.length > 0 && items[0].memberName) setMemberName(items[0].memberName);

      const text = buildReportText(items, memberNo);
      setReportText(text);
      setRecordCount(items.length);

      if (items.length === 0) message.info('No RD accounts found for this member');
      else if (outputType === 'printer') printReportText(text);
    } catch {
      message.error('Failed to load recurring details');
      setReportText('');
      setRecordCount(0);
    } finally {
      setLoading(false);
    }
  }, [memberNo, outputType]);

  const handleReset = useCallback(() => {
    setMemberNo('');
    setMemberName('');
    setReportText('');
    setRecordCount(0);
  }, []);

  return (
    <ConfigProvider theme={{
      algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: { colorPrimary: '#8b5cf6', borderRadius: 6, fontSize: 12 },
    }}>
      <div className={`h-screen flex flex-col font-sans overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 via-violet-50/20 to-slate-50'}`}>

        {/* Header */}
        <div className={`px-3 py-1.5 flex items-center justify-between shrink-0 border-b ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/90 border-slate-200/60'}`}>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-violet-600 to-violet-700 p-1.5 rounded-lg text-white shadow-md">
              <Repeat size={14} />
            </div>
            <div>
              <h1 className="fz-label font-black tracking-tight leading-none">Recurring Details</h1>
              <div className="fz-caption font-bold text-slate-400 uppercase tracking-wider leading-none mt-0.5">
                <Repeat size={8} className="inline text-violet-500 mr-1" />RD Accounts Statement
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

            <div className={`border rounded-lg overflow-hidden shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-violet-200/60'}`}>
              <div className="bg-gradient-to-r from-violet-600 to-violet-700 px-2 py-1 flex items-center gap-1">
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

            <div className={`border rounded-lg p-2 shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-violet-200/60'}`}>
              <div className="fz-caption font-bold text-slate-500 mb-1 uppercase">Output</div>
              <Radio.Group value={outputType} onChange={e => setOutputType(e.target.value)} size="small">
                <Radio value="screen" className="fz-caption"><Monitor size={10} className="inline mr-1" />Screen</Radio>
                <Radio value="printer" className="fz-caption"><Printer size={10} className="inline mr-1" />Printer</Radio>
              </Radio.Group>
            </div>

            <Button
              type="primary" block size="small" icon={<Search size={11} />}
              onClick={handleGenerate} loading={loading}
              className="h-8 bg-gradient-to-r from-violet-600 to-violet-700 font-black uppercase fz-caption shadow-lg"
            >
              Generate
            </Button>

            {recordCount > 0 && (
              <div className={`text-center fz-caption font-bold ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>
                {recordCount} RD account{recordCount !== 1 ? 's' : ''} found
              </div>
            )}
          </div>

          {/* Report Area RIGHT */}
          <div className={`flex-1 border rounded-lg shadow-sm flex flex-col overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-violet-200/60'}`}>
            <div className="bg-gradient-to-r from-violet-600 to-violet-700 px-3 py-1.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <Repeat size={12} className="text-white" />
                <span className="fz-caption font-black text-white uppercase">Recurring Details</span>
                {memberNo && <span className="fz-caption font-bold text-violet-100 ml-1">Member: {memberNo}</span>}
              </div>
              {recordCount > 0 && (
                <span className="fz-caption font-black text-white bg-white/20 px-2 py-0.5 rounded">{recordCount} Accounts</span>
              )}
            </div>

            <div className={`flex-1 overflow-auto p-3 ${isDark ? 'bg-slate-900/40' : 'bg-white'}`}>
              <Spin spinning={loading} size="small">
                {reportText ? (
                  <pre className={`font-mono fz-caption leading-[1.5] whitespace-pre select-text ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                    {reportText}
                  </pre>
                ) : (
                  <div className="py-32 text-center">
                    <div className="w-20 h-20 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <Repeat size={40} className="text-violet-200" />
                    </div>
                    <p className="fz-label font-black text-slate-400 uppercase tracking-wider">No Data</p>
                    <p className="fz-caption text-slate-300 mt-1">Enter member number and generate</p>
                  </div>
                )}
              </Spin>
            </div>
          </div>
        </div>
      </div>

      <Modal
        title={<div className="flex items-center gap-2 py-1"><div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center shadow-md"><Users size={16} className="text-white" /></div><div><div className="fz-body font-black text-slate-800">Member Lookup</div><div className="fz-caption text-slate-400 font-bold uppercase tracking-wide">Select Member</div></div></div>}
        open={showLookup} onCancel={() => setShowLookup(false)} footer={null} width={1000} centered destroyOnClose
      >
        <div className="p-2"><MemberLookup isModal={true} onSelect={handleMemberSelect} onClose={() => setShowLookup(false)} /></div>
      </Modal>
    </ConfigProvider>
  );
};

export default RecurringDetails;
