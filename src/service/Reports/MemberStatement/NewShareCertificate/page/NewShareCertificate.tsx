import React, { useState, useCallback } from 'react';
import { ConfigProvider, Input, Button, Radio, Spin, message, Modal, theme } from 'antd';
import { FileText, Printer, Search, RotateCcw, Award, User, Users, Monitor } from 'lucide-react';
import { useSelector } from 'react-redux';
import { apiService } from '../../../../../services/api';
import MemberLookup from '../../../../../components/shared/MemberLookup/MemberLookup';
import dayjs from 'dayjs';

interface ShareData {
  memberNo: string;
  memberName: string;
  address: string;
  membershipDate: string;
  officeName: string;
  shareBalance: number;
}

const SEP_W = 64;
const SEP  = '─'.repeat(SEP_W);
const DSEP = '═'.repeat(SEP_W);

const center = (s: string, w = SEP_W) => {
  const t = s.trim();
  const p = Math.max(0, Math.floor((w - t.length) / 2));
  return ' '.repeat(p) + t;
};

const row = (k: string, v: string, kw = 14) =>
  `  ${k.padEnd(kw)}: ${v}`;

const fmtAmt = (n: number) =>
  (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SOCIETY = {
  name: 'ESPAT KARMCHARI CO-OPERATIVE CREDIT SOCIETY LTD.',
  addr: 'Avenue A, Sahakari Sadan, Sector-C, Bhilai Nagar, DURG-490006',
  reg:  'Reg No: A.R/DRG/1796     Tel: 0788-2298736',
};

const buildCertificate = (data: ShareData): string => {
  const certNo = `SC-${data.memberNo}-${dayjs().format('YYYYMMDD')}`;
  const issueDate = dayjs().format('DD-MMM-YYYY');
  const joinDate = data.membershipDate ? dayjs(data.membershipDate).format('DD-MMM-YYYY') : 'N/A';
  const lines: string[] = [];

  lines.push(DSEP);
  lines.push(center(SOCIETY.name));
  lines.push(center(SOCIETY.addr));
  lines.push(center(SOCIETY.reg));
  lines.push(DSEP);
  lines.push(center('SHARE  CERTIFICATE'));
  lines.push(DSEP);
  lines.push('');
  lines.push(row('Certificate No', certNo));
  lines.push(row('Date of Issue', issueDate));
  lines.push('');
  lines.push(SEP);
  lines.push('  This is to certify that:');
  lines.push('');
  lines.push(row('Name', data.memberName));
  lines.push(row('Member No', data.memberNo));
  lines.push(row('Office', data.officeName));
  lines.push(row('Date of Join', joinDate));
  if (data.address) {
    lines.push(row('Address', data.address.slice(0, 48)));
  }
  lines.push('');
  lines.push(SEP);
  lines.push('');
  lines.push('  is a registered member of this society holding shares worth:');
  lines.push('');
  lines.push(`  ${'Share Value'.padEnd(14)}: Rs.  ${fmtAmt(data.shareBalance).padStart(14)}`);
  lines.push('');
  lines.push('  as on the date of issue of this certificate.');
  lines.push('');
  lines.push(SEP);
  lines.push('');
  lines.push('');
  lines.push('');
  lines.push(`  ${'Authorised Signatory'.padEnd(30)}  ${'Manager / Secretary'}`);
  lines.push(`  ${SEP.slice(0, 28)}  ${SEP.slice(0, 28)}`);
  lines.push('');
  lines.push(DSEP);
  lines.push(center('* This is a computer generated certificate *'));
  lines.push(DSEP);

  return lines.join('\n');
};

const printCertificate = (text: string) => {
  const html = `<html><head><style>
    @page{size:portrait;margin:12mm}
    body{font-family:'Courier New',monospace;font-size:11px;white-space:pre}
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

const NewShareCertificate: React.FC = () => {
  const isDark = useSelector((state: any) => state.theme?.interfaceMode === 'dark');

  const [memberNo, setMemberNo]     = useState('');
  const [memberName, setMemberName] = useState('');
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
      const response = await apiService.getShareCertificate({ memberNo });
      const data: ShareData = (response as any).data || response;
      if (!data || !data.memberNo) {
        message.error('Member not found');
        setCertText('');
        return;
      }
      if (data.memberName && !memberName) setMemberName(data.memberName);
      const text = buildCertificate(data);
      setCertText(text);
      if (outputType === 'printer') {
        printCertificate(text);
      }
    } catch {
      message.error('Failed to generate share certificate');
      setCertText('');
    } finally {
      setLoading(false);
    }
  }, [memberNo, memberName, outputType]);

  const handleReset = useCallback(() => {
    setMemberNo('');
    setMemberName('');
    setCertText('');
  }, []);

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: { colorPrimary: '#4f46e5', borderRadius: 6, fontSize: 12 },
      }}
    >
      <style>{`
        /* ── Dark-mode overrides (Settings palette, html.dark only) ── */
        html.dark .newshare-page { background-color: #000000 !important; background-image: none !important; }
        html.dark .newshare-header { background-color: #0c0c0e !important; background-image: none !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .newshare-card,
        html.dark .newshare-report-panel { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .newshare-report-body { background-color: #1c1c1e !important; }
        html.dark .newshare-report-body pre { color: #f5f5f7 !important; }
        html.dark .newshare-page h1 { color: #f5f5f7 !important; }
        html.dark .newshare-page .text-slate-400,
        html.dark .newshare-page .text-slate-500 { color: #8e8e93 !important; }
        html.dark .newshare-page .text-slate-300 { color: #71717a !important; }
        html.dark .newshare-page label { color: #8e8e93 !important; }
        html.dark .newshare-page .ant-input,
        html.dark .newshare-page .ant-input-affix-wrapper,
        html.dark .newshare-page .ant-picker { background-color: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
        html.dark .newshare-page .ant-input-affix-wrapper .ant-input { background-color: transparent !important; }
        html.dark .newshare-page .ant-radio-wrapper { color: #f5f5f7 !important; }
        html.dark .newshare-page .ant-btn:not(.ant-btn-primary) { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
      `}</style>

      <div className={`newshare-page h-screen flex flex-col overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-50'}`}>
        {/* Header */}
        <div className={`newshare-header border-b px-3 py-1.5 flex items-center justify-between shrink-0 ${isDark ? 'bg-gradient-to-r from-slate-900 to-slate-900 border-white/5' : 'bg-white/90 border-slate-200/60'}`}>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-1.5 rounded-lg text-white shadow-md">
              <Award size={14} />
            </div>
            <div>
              <h1 className="fz-label font-black tracking-tight leading-none">Share Certificate</h1>
              <div className="fz-caption font-bold text-slate-400 uppercase tracking-wider leading-none mt-0.5">9.5 New Share Certificate</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button icon={<RotateCcw size={11} />} size="small" className="h-7 fz-caption font-bold" onClick={handleReset}>Reset</Button>
            <Button
              icon={<Printer size={11} />} size="small" className="h-7 fz-caption font-bold"
              onClick={() => certText && printCertificate(certText)}
              disabled={!certText}
            >Print</Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden p-2 flex gap-2">
          {/* Sidebar */}
          <div className="w-[220px] flex flex-col gap-2 shrink-0">
            {/* Member */}
            <div className={`newshare-card border rounded-lg overflow-hidden shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-indigo-200/60'}`}>
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-2 py-1 flex items-center gap-1">
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

            {/* Output */}
            <div className={`newshare-card border rounded-lg p-2 shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-indigo-200/60'}`}>
              <div className="fz-caption font-bold text-slate-500 mb-1 uppercase">Output</div>
              <Radio.Group value={outputType} onChange={e => setOutputType(e.target.value)} size="small">
                <Radio value="screen" className="fz-caption"><Monitor size={10} className="inline mr-1" />Screen</Radio>
                <Radio value="printer" className="fz-caption"><Printer size={10} className="inline mr-1" />Printer</Radio>
              </Radio.Group>
            </div>

            <Button
              type="primary" block size="small" icon={<Search size={11} />}
              onClick={handleGenerate} loading={loading}
              className="h-8 bg-gradient-to-r from-indigo-600 to-indigo-700 font-black uppercase fz-caption shadow-lg"
            >
              Generate
            </Button>
          </div>

          {/* Certificate Area */}
          <div className={`newshare-report-panel flex-1 border rounded-lg shadow-sm flex flex-col overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-indigo-200/60'}`}>
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-3 py-1.5 flex items-center gap-1.5 shrink-0">
              <FileText size={12} className="text-white" />
              <span className="fz-caption font-black text-white uppercase">Share Certificate — Member: {memberNo || 'N/A'}</span>
            </div>
            <div className="newshare-report-body flex-1 overflow-auto p-3">
              <Spin spinning={loading} size="small">
                {certText ? (
                  <pre className="font-mono leading-relaxed whitespace-pre" style={{ fontFamily: "'Courier New', monospace", fontSize: 12 }}>
                    {certText}
                  </pre>
                ) : (
                  <div className="py-32 text-center">
                    <Award size={48} className="text-indigo-200 mx-auto mb-4" />
                    <p className="fz-label font-black text-slate-400 uppercase tracking-wider">No Certificate</p>
                    <p className="fz-caption text-slate-300 mt-1">Enter member number and generate certificate</p>
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
        title={<div className="flex items-center gap-2"><div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center"><Users size={14} className="text-white" /></div><span className="font-black">Member Lookup</span></div>}
      >
        <MemberLookup isModal={true} onSelect={handleMemberSelect} onClose={() => setShowLookup(false)} />
      </Modal>
    </ConfigProvider>
  );
};

export default NewShareCertificate;
