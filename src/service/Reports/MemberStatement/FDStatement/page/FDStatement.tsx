import React, { useState, useCallback } from 'react';
import { ConfigProvider, Input, Button, Radio, Spin, message, Modal, DatePicker, theme } from 'antd';
import { FileText, Printer, Search, RotateCcw, Wallet, User, Users, Monitor } from 'lucide-react';
import { useSelector } from 'react-redux';
import { apiService } from '../../../../../services/api';
import MemberLookup from '../../../../../components/shared/MemberLookup/MemberLookup';
import dayjs from 'dayjs';

interface FDAccount {
  accountNo: string;
  memberNo: string;
  memberName: string;
  officeName: string;
  depositType: string;
  principalAmount: number;
  interestRate: number;
  depositDate: string;
  maturityDate: string;
  maturityAmount: number;
  tenureMonths?: number;
  status: string;
}

const SEP_W = 68;
const SEP  = '─'.repeat(SEP_W);
const DSEP = '═'.repeat(SEP_W);

const center = (s: string, w = SEP_W) => {
  const t = s.trim();
  const p = Math.max(0, Math.floor((w - t.length) / 2));
  return ' '.repeat(p) + t;
};

const col = (k: string, v: string, kw = 10, vw = 24): string =>
  `${k.padEnd(kw)}: ${(v ?? '').toString().slice(0, vw).padEnd(vw)}`;

const rline = (k1: string, v1: string, k2 = '', v2 = '') =>
  k2 ? `${col(k1, v1)}  ${col(k2, v2, 9, 10)}` : col(k1, v1);

const fmtAmt = (n: number) =>
  (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d?: string) => (d ? dayjs(d).format('DD-MMM-YYYY') : '---');

const SOCIETY = {
  name: 'ESPAT KARMCHARI CO-OPERATIVE CREDIT SOCIETY LTD.',
  addr: 'Avenue A, Sahakari Sadan, Sector-C, AT Post:Bhilai Nagar,Dist:DURG-490006',
  reg:  'Reg No: A.R/DRG/1796   Tel: 0788-2298736',
};

const buildReport = (
  memberNo: string,
  memberName: string,
  fromDate: dayjs.Dayjs,
  toDate: dayjs.Dayjs,
  accounts: FDAccount[]
): string => {
  const lines: string[] = [];

  lines.push(DSEP);
  lines.push(center(SOCIETY.name));
  lines.push(center(SOCIETY.addr));
  lines.push(center(SOCIETY.reg));
  lines.push(DSEP);
  lines.push(center('FIXED DEPOSIT STATEMENT'));
  lines.push(DSEP);
  lines.push(rline('Member No', memberNo, 'Name', memberName));
  lines.push(rline('From Date', fromDate.format('DD-MMM-YYYY'), 'To Date', toDate.format('DD-MMM-YYYY')));
  lines.push(DSEP);
  lines.push('');

  if (accounts.length === 0) {
    lines.push(center('No FD accounts found for this member'));
    lines.push('');
    lines.push(DSEP);
    return lines.join('\n');
  }

  for (const acc of accounts) {
    lines.push(SEP);
    lines.push(rline('Account No', acc.accountNo || '---', 'Status', acc.status || '---'));
    lines.push(rline('Type', acc.depositType || 'FD', 'Rate', `${acc.interestRate ?? 0}%`));
    lines.push(rline('Deposit Dt', fmtDate(acc.depositDate), 'Maturity', fmtDate(acc.maturityDate)));
    lines.push(rline('Principal', fmtAmt(acc.principalAmount), 'Tenure', `${acc.tenureMonths ?? '--'} Months`));
    lines.push(`${'Mat. Amount'.padEnd(10)}: ${fmtAmt(acc.maturityAmount).padStart(16)}`);
    lines.push(SEP);
    lines.push('');
  }

  const totPrincipal = accounts.reduce((s, a) => s + (a.principalAmount || 0), 0);
  const totMaturity  = accounts.reduce((s, a) => s + (a.maturityAmount || 0), 0);
  lines.push(DSEP);
  lines.push(`Total Accounts: ${accounts.length}   Principal: ${fmtAmt(totPrincipal)}   Maturity: ${fmtAmt(totMaturity)}`);
  lines.push(DSEP);
  lines.push(center('Report As Per Data Available....'));
  lines.push(DSEP);

  return lines.join('\n');
};

const printReportText = (text: string) => {
  const html = `<html><head><style>
    @page{size:portrait;margin:8mm}
    body{font-family:'Courier New',monospace;font-size:10px;white-space:pre}
  </style></head><body><pre>${text}</pre></body></html>`;
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  iframe.contentDocument!.open();
  iframe.contentDocument!.write(html);
  iframe.contentDocument!.close();
  setTimeout(() => iframe.contentWindow!.print(), 100);
  setTimeout(() => document.body.removeChild(iframe), 1500);
};

const FDStatement: React.FC = () => {
  const isDark = useSelector((state: any) => state.theme?.interfaceMode === 'dark');

  const [memberNo, setMemberNo]     = useState('');
  const [memberName, setMemberName] = useState('');
  const [fromDate, setFromDate]     = useState<dayjs.Dayjs>(dayjs().startOf('year'));
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
      const response = await apiService.post('/reports/fd/statement', {
        memberNo,
        fromDate: fromDate.format('YYYY-MM-DD'),
        toDate: toDate.format('YYYY-MM-DD'),
      });
      const accounts: FDAccount[] = Array.isArray(response.data) ? response.data :
        Array.isArray(response) ? response : [];
      const name = accounts[0]?.memberName || memberName;
      if (name && !memberName) setMemberName(name);
      const text = buildReport(memberNo, name || memberName, fromDate, toDate, accounts);
      setReportText(text);
      if (accounts.length === 0) {
        message.info('No FD accounts found for this member');
      } else if (outputType === 'printer') {
        printReportText(text);
      }
    } catch {
      message.error('Failed to generate FD statement');
      setReportText('');
    } finally {
      setLoading(false);
    }
  }, [memberNo, memberName, fromDate, toDate, outputType]);

  const handleReset = useCallback(() => {
    setMemberNo('');
    setMemberName('');
    setFromDate(dayjs().startOf('year'));
    setToDate(dayjs());
    setReportText('');
  }, []);

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: { colorPrimary: '#8b5cf6', borderRadius: 6, fontSize: 12 },
      }}
    >
      <div className={`h-screen flex flex-col overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-slate-50 via-violet-50/20 to-slate-50'}`}>
        {/* Header */}
        <div className={`border-b px-3 py-1.5 flex items-center justify-between shrink-0 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white/90 border-slate-200/60'}`}>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-violet-600 to-violet-700 p-1.5 rounded-lg text-white shadow-md">
              <Wallet size={14} />
            </div>
            <div>
              <h1 className="fz-label font-black tracking-tight leading-none">FD Statement</h1>
              <div className="fz-caption font-bold text-slate-400 uppercase tracking-wider leading-none mt-0.5">Fixed Deposit</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button icon={<RotateCcw size={11} />} size="small" className="h-7 fz-caption font-bold" onClick={handleReset}>Reset</Button>
            <Button
              icon={<Printer size={11} />} size="small" className="h-7 fz-caption font-bold"
              onClick={() => reportText && printReportText(reportText)}
              disabled={!reportText}
            >Print</Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden p-2 flex gap-2">
          {/* Sidebar */}
          <div className="w-[220px] flex flex-col gap-2 shrink-0">
            {/* Member */}
            <div className={`border rounded-lg overflow-hidden shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-violet-200/60'}`}>
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
                <Input
                  value={memberName}
                  readOnly
                  placeholder="Member name"
                  size="small"
                  className="fz-caption"
                />
              </div>
            </div>

            {/* Date Range */}
            <div className={`border rounded-lg overflow-hidden shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-violet-200/60'}`}>
              <div className="bg-gradient-to-r from-violet-600 to-violet-700 px-2 py-1 flex items-center gap-1">
                <span className="fz-caption font-black text-white uppercase">Date Range</span>
              </div>
              <div className="p-2 space-y-1.5">
                <div>
                  <div className="fz-caption font-bold text-slate-500 mb-0.5">From Date</div>
                  <DatePicker value={fromDate} onChange={d => d && setFromDate(d)} format="DD-MMM-YYYY" size="small" className="w-full fz-caption" />
                </div>
                <div>
                  <div className="fz-caption font-bold text-slate-500 mb-0.5">To Date</div>
                  <DatePicker value={toDate} onChange={d => d && setToDate(d)} format="DD-MMM-YYYY" size="small" className="w-full fz-caption" />
                </div>
              </div>
            </div>

            {/* Output */}
            <div className={`border rounded-lg p-2 shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-violet-200/60'}`}>
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
          </div>

          {/* Report Area */}
          <div className={`flex-1 border rounded-lg shadow-sm flex flex-col overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-violet-200/60'}`}>
            <div className="bg-gradient-to-r from-violet-600 to-violet-700 px-3 py-1.5 flex items-center gap-1.5 shrink-0">
              <FileText size={12} className="text-white" />
              <span className="fz-caption font-black text-white uppercase">FD Statement — Member: {memberNo || 'N/A'}</span>
            </div>
            <div className="flex-1 overflow-auto p-2">
              <Spin spinning={loading} size="small">
                {reportText ? (
                  <pre className="font-mono fz-caption leading-relaxed whitespace-pre" style={{ fontFamily: "'Courier New', monospace", fontSize: 11 }}>
                    {reportText}
                  </pre>
                ) : (
                  <div className="py-32 text-center">
                    <FileText size={48} className="text-violet-200 mx-auto mb-4" />
                    <p className="fz-label font-black text-slate-400 uppercase tracking-wider">No Data</p>
                    <p className="fz-caption text-slate-300 mt-1">Enter member number and generate report</p>
                  </div>
                )}
              </Spin>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={showLookup} onCancel={() => setShowLookup(false)}
        footer={null} width={950} centered destroyOnClose
        styles={{ body: { padding: 0 } }}
        title={<div className="flex items-center gap-2"><div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center"><Users size={14} className="text-white" /></div><span className="font-black">Member Lookup</span></div>}
      >
        <MemberLookup isModal={true} onSelect={handleMemberSelect} onClose={() => setShowLookup(false)} />
      </Modal>
    </ConfigProvider>
  );
};

export default FDStatement;
