import React, { useState, useCallback } from 'react';
import { ConfigProvider, Button, Input, Spin, Radio, Modal, message, theme } from 'antd';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';
import { FileText, Printer, Search, RotateCcw, Award, User, Users, Monitor } from 'lucide-react';
import { apiService } from '../../../../../services/api';
import dayjs from 'dayjs';
import MemberLookup from '../../../../../components/shared/MemberLookup/MemberLookup';

interface FDCertificateData {
  accountNo: string;
  memberNo: string;
  memberName: string;
  address: string;
  officeName: string;
  principalAmount: number;
  interestRate: number;
  depositDate: string;
  maturityDate: string;
  maturityAmount: number;
  durationMonths: number;
}

// ── text helpers ──────────────────────────────────────────────────
const W = 68;
const ctr  = (s: string) => s.padStart(Math.floor((W + s.length) / 2)).padEnd(W);
const rl   = () => '-'.repeat(W);
const lr   = (l: string, r: string) => l + r.padStart(W - l.length);
const col  = (k: string, v: string, kw = 18) => k.padEnd(kw) + ': ' + v;
const rline = (k1: string, v1: string, k2 = '', v2 = '') => {
  const left = col(k1, v1);
  return k2 ? lr(left, col(k2, v2, 14)) : left;
};

const fmtAmt = (n: number) =>
  (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const buildCertificate = (d: FDCertificateData): string => {
  const lines: string[] = [];

  lines.push('');
  lines.push(ctr('Espat Karmchari Co-Operative Credit Society Limited.'));
  lines.push(ctr('Avenue A,Sahakari Sadan,Sector-6,'));
  lines.push(ctr('AT Post:Bhilai Nagar,Dist:DURG-490006'));
  lines.push(lr('Reg No: A.R/DRG/1796', 'Tel No: 0788-2298736'));
  lines.push(rl());
  lines.push('');
  lines.push(ctr('FIXED DEPOSIT CERTIFICATE'));
  lines.push(ctr(`Certificate No: FDC-${d.memberNo}-${dayjs().format('YYYYMMDD')}`));
  lines.push('');
  lines.push(rl());
  lines.push('');
  lines.push(rline('Member No',     d.memberNo,                'Account No', d.accountNo));
  lines.push(rline('Member Name',   d.memberName));
  lines.push(rline('Address',       d.address || 'N/A'));
  lines.push(rline('Office',        d.officeName || 'N/A'));
  lines.push('');
  lines.push(rl());
  lines.push('');
  lines.push(rline('Principal Amt', `Rs. ${fmtAmt(d.principalAmount)}`));
  lines.push(rline('Interest Rate', `${d.interestRate}% Per Annum`));
  lines.push(rline('Deposit Date',  dayjs(d.depositDate).format('DD-MMM-YYYY'),
                    'Maturity Date', dayjs(d.maturityDate).format('DD-MMM-YYYY')));
  lines.push(rline('Duration',      `${d.durationMonths} Months`));
  lines.push(rline('Maturity Amt',  `Rs. ${fmtAmt(d.maturityAmount)}`));
  lines.push('');
  lines.push(rl());
  lines.push('');
  lines.push('  This is to certify that the above named member has');
  lines.push(`  deposited Rs. ${fmtAmt(d.principalAmount)} with this Society`);
  lines.push(`  for a period of ${d.durationMonths} months at the rate of`);
  lines.push(`  ${d.interestRate}% per annum. The deposit will mature on`);
  lines.push(`  ${dayjs(d.maturityDate).format('DD-MMM-YYYY')} and the maturity amount of`);
  lines.push(`  Rs. ${fmtAmt(d.maturityAmount)} will be payable to the depositor.`);
  lines.push('');
  lines.push(rl());
  lines.push('');
  lines.push(`  Date: ${dayjs().format('DD-MMM-YYYY')}`);
  lines.push('');
  lines.push('');
  lines.push(lr('  Depositor Signature', 'Authorized Signatory  '));
  lines.push('');
  lines.push(rl());
  lines.push(ctr('* Surrender this certificate at maturity/premature withdrawal'));

  return lines.join('\n');
};

const printCertificate = (text: string) => {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const doc = `<html><head><style>
    @page{size:portrait;margin:15mm}
    body{font-family:'Courier New',monospace;font-size:12px;white-space:pre;background:white;color:#000}
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

const FixedDepositCertificate: React.FC = () => {
  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [memberNo, setMemberNo]     = useState('');
  const [memberName, setMemberName] = useState('');
  const [accountNo, setAccountNo]   = useState('');
  const [outputType, setOutputType] = useState<'screen' | 'printer'>('screen');
  const [loading, setLoading]       = useState(false);
  const [certText, setCertText]     = useState('');
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
      const params: Record<string, string> = { memberNo: memberNo.trim() };
      if (accountNo.trim()) params.accountNo = accountNo.trim();

      const response = await apiService.get(`/reports/fd-certificate?memberNo=${params.memberNo}${params.accountNo ? '&accountNo=' + params.accountNo : ''}`);
      const data: FDCertificateData | null = (response as any)?.data || response || null;

      if (data && data.memberNo) {
        setMemberName(data.memberName || '');
        const text = buildCertificate(data);
        setCertText(text);
        message.success('FD Certificate generated');
        if (outputType === 'printer') printCertificate(text);
      } else {
        setCertText('');
        message.error('No FD found for this member');
      }
    } catch {
      message.error('Failed to load FD certificate');
      setCertText('');
    } finally {
      setLoading(false);
    }
  }, [memberNo, accountNo, outputType]);

  const handleReset = useCallback(() => {
    setMemberNo('');
    setMemberName('');
    setAccountNo('');
    setCertText('');
  }, []);

  return (
    <ConfigProvider theme={{
      algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: { colorPrimary: '#f59e0b', borderRadius: 6, fontSize: 12 },
    }}>
      <div className={`fdc-page h-screen flex flex-col font-sans overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 via-amber-50/20 to-slate-50'}`}>

        {/* Header */}
        <div className={`fdc-header px-3 py-1.5 flex items-center justify-between shrink-0 border-b ${isDark ? 'bg-gradient-to-r from-slate-900 to-slate-900 border-white/5' : 'bg-white/90 border-slate-200/60'}`}>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-amber-600 to-amber-700 p-1.5 rounded-lg text-white shadow-md">
              <Award size={14} />
            </div>
            <div>
              <h1 className="fz-label font-black tracking-tight leading-none">Fixed Deposit Certificate</h1>
              <div className="fz-caption font-bold text-slate-400 uppercase tracking-wider leading-none mt-0.5">
                <Award size={8} className="inline text-amber-500 mr-1" />Official Certificate
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button icon={<RotateCcw size={11} />} size="small" className="h-7 fz-caption font-bold" onClick={handleReset}>Reset</Button>
            <Button icon={<Printer size={11} />} size="small" className="h-7 fz-caption font-bold"
              onClick={() => certText && printCertificate(certText)} disabled={!certText}>Print</Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden p-2 flex gap-2">

          {/* Sidebar */}
          <div className="w-[220px] flex flex-col gap-2 shrink-0">

            <div className={`fdc-card border rounded-lg overflow-hidden shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-amber-200/60'}`}>
              <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-2 py-1 flex items-center gap-1">
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

            <div className={`fdc-card border rounded-lg overflow-hidden shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-amber-200/60'}`}>
              <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-2 py-1 flex items-center gap-1">
                <FileText size={10} className="text-white" />
                <span className="fz-caption font-black text-white uppercase">Account</span>
              </div>
              <div className="p-2">
                <Input
                  value={accountNo}
                  onChange={e => setAccountNo(e.target.value)}
                  placeholder="Account No (optional)"
                  size="small"
                  className="fz-caption"
                />
              </div>
            </div>

            <div className={`fdc-card border rounded-lg p-2 shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-amber-200/60'}`}>
              <div className="fz-caption font-bold text-slate-500 mb-1 uppercase">Output</div>
              <Radio.Group value={outputType} onChange={e => setOutputType(e.target.value)} size="small">
                <Radio value="screen" className="fz-caption"><Monitor size={10} className="inline mr-1" />Screen</Radio>
                <Radio value="printer" className="fz-caption"><Printer size={10} className="inline mr-1" />Printer</Radio>
              </Radio.Group>
            </div>

            <Button
              type="primary" block size="small" icon={<Search size={11} />}
              onClick={handleGenerate} loading={loading}
              className="h-8 bg-gradient-to-r from-amber-600 to-amber-700 font-black uppercase fz-caption shadow-lg"
            >
              Generate
            </Button>
          </div>

          {/* Report Area */}
          <div className={`fdc-report-panel flex-1 border rounded-lg shadow-sm flex flex-col overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-amber-200/60'}`}>
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-3 py-1.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <Award size={12} className="text-white" />
                <span className="fz-caption font-black text-white uppercase">Fixed Deposit Certificate</span>
                {memberNo && <span className="fz-caption font-bold text-amber-100 ml-1">Member: {memberNo}</span>}
              </div>
            </div>

            <div className={`flex-1 overflow-auto p-3 ${isDark ? 'bg-slate-900/40' : 'bg-white'}`}>
              <Spin spinning={loading} size="small">
                {certText ? (
                  <pre className={`font-mono fz-caption leading-[1.5] whitespace-pre select-text ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                    {certText}
                  </pre>
                ) : (
                  <div className="py-32 text-center">
                    <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <Award size={40} className="text-amber-200" />
                    </div>
                    <p className="fz-label font-black text-slate-400 uppercase tracking-wider">No Certificate</p>
                    <p className="fz-caption text-slate-300 mt-1">Enter member number and generate</p>
                  </div>
                )}
              </Spin>
            </div>
          </div>
        </div>
      </div>

      <Modal
        title={<div className="flex items-center gap-2 py-1"><div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center shadow-md"><Users size={16} className="text-white" /></div><div><div className="fz-body font-black text-slate-800">Member Lookup</div><div className="fz-caption text-slate-400 font-bold uppercase tracking-wide">Select Member</div></div></div>}
        open={showLookup} onCancel={() => setShowLookup(false)} footer={null} width={1000} centered destroyOnClose
      >
        <div className="p-2"><MemberLookup isModal={true} onSelect={handleMemberSelect} onClose={() => setShowLookup(false)} /></div>
      </Modal>

      <style>{`
        /* ── Fixed Deposit Certificate — dark mode ── */
        html.dark .fdc-page { background-color: #000000 !important; color: #f5f5f7 !important; }
        html.dark .fdc-header { background-color: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .fdc-header h1 { color: #f5f5f7 !important; }
        html.dark .fdc-header .text-slate-400 { color: #8e8e93 !important; }
        html.dark .fdc-card { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .fdc-card .text-slate-500 { color: #8e8e93 !important; }
        html.dark .fdc-report-panel { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .fdc-page .bg-slate-900\\/40 { background-color: rgba(255,255,255,.03) !important; }
        html.dark .fdc-page .bg-white { background-color: #1c1c1e !important; }
        html.dark .fdc-page .text-slate-900 { color: #f5f5f7 !important; }
        html.dark .fdc-page .text-slate-400 { color: #8e8e93 !important; }
        html.dark .fdc-page .text-slate-300 { color: #71717a !important; }
        html.dark .fdc-page pre { color: #f5f5f7 !important; }
        /* Antd controls */
        html.dark .fdc-page .ant-input,
        html.dark .fdc-page .ant-input-affix-wrapper,
        html.dark .fdc-page input.ant-input {
          background-color: rgba(255,255,255,.05) !important; color: #f5f5f7 !important; border-color: rgba(255,255,255,.08) !important;
        }
        html.dark .fdc-page .ant-input::placeholder { color: #71717a !important; }
        html.dark .fdc-page .ant-btn:not(.ant-btn-primary) {
          background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important;
        }
        html.dark .fdc-page .ant-radio-wrapper { color: #f5f5f7 !important; }
        html.dark .ant-modal-content, html.dark .ant-modal-header {
          background-color: #1c1c1e !important; color: #f5f5f7 !important; border-color: rgba(255,255,255,.08) !important;
        }
        html.dark .ant-modal-title { color: #f5f5f7 !important; }
      `}</style>
    </ConfigProvider>
  );
};

export default FixedDepositCertificate;
