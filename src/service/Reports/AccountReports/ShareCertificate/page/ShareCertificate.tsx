import React, { useState, useCallback } from 'react';
import { ConfigProvider, Button, Input, Spin, Radio, Modal, message, theme } from 'antd';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';
import { FileText, Printer, Search, RotateCcw, Award, User, Users, Monitor } from 'lucide-react';
import { apiService } from '../../../../../services/api';
import dayjs from 'dayjs';
import MemberLookup from '../../../../../components/shared/MemberLookup/MemberLookup';

interface ShareData {
  memberNo: string;
  memberName: string;
  address: string;
  membershipDate: string;
  officeName: string;
  shareBalance: number;
}

// ── text helpers ──────────────────────────────────────────────────
const W = 68;
const ctr = (s: string) => s.padStart(Math.floor((W + s.length) / 2)).padEnd(W);
const rl  = () => '-'.repeat(W);
const drl = () => '='.repeat(W);
const lr  = (l: string, r: string) => l + r.padStart(W - l.length);
const row = (k: string, v: string, kw = 18) => `  ${k.padEnd(kw)}: ${v}`;

const fmtAmt = (n: number) =>
  (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const buildCertificate = (d: ShareData): string => {
  const certNo = `SC-${d.memberNo}-${dayjs().format('YYYYMMDD')}`;
  const joinDate = d.membershipDate ? dayjs(d.membershipDate).format('DD-MMM-YYYY') : 'N/A';
  const lines: string[] = [];

  lines.push(drl());
  lines.push(ctr('Espat Karmchari Co-Operative Credit Society Limited.'));
  lines.push(ctr('Avenue A,Sahakari Sadan,Sector-6,'));
  lines.push(ctr('AT Post:Bhilai Nagar,Dist:DURG-490006'));
  lines.push(lr('Reg No: A.R/DRG/1796', 'Tel No: 0788-2298736'));
  lines.push(drl());
  lines.push(ctr('SHARE CERTIFICATE'));
  lines.push(ctr(`Certificate No: ${certNo}`));
  lines.push(drl());
  lines.push('');
  lines.push(row('Date of Issue', dayjs().format('DD-MMM-YYYY')));
  lines.push('');
  lines.push(rl());
  lines.push('  This is to certify that:');
  lines.push('');
  lines.push(row('Member No',     d.memberNo));
  lines.push(row('Member Name',   d.memberName));
  lines.push(row('Office',        d.officeName || 'N/A'));
  lines.push(row('Date of Join',  joinDate));
  if (d.address) {
    lines.push(row('Address',     d.address.substring(0, 45)));
  }
  lines.push('');
  lines.push(rl());
  lines.push('');
  lines.push('  is a registered member of this Society holding');
  lines.push('  shares worth:');
  lines.push('');
  lines.push(`  ${'Share Value'.padEnd(18)}: Rs.  ${fmtAmt(d.shareBalance).padStart(14)}`);
  lines.push('');
  lines.push('  as on the date of issue of this certificate.');
  lines.push('');
  lines.push(rl());
  lines.push('');
  lines.push('  This certificate is issued as proof of membership');
  lines.push('  and share holding in the Society as per the');
  lines.push('  rules and regulations.');
  lines.push('');
  lines.push('');
  lines.push('');
  lines.push(lr('  Member Signature', 'Authorized Signatory  '));
  lines.push(lr(`  ${rl().slice(0, 24)}`, `${rl().slice(0, 24)}  `));
  lines.push('');
  lines.push(drl());
  lines.push(ctr('* This is a computer generated certificate *'));
  lines.push(drl());

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

const ShareCertificate: React.FC = () => {
  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

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
      const response = await apiService.getShareCertificate({ memberNo: memberNo.trim() });
      const data: ShareData = (response as any)?.data || response;

      if (data && data.memberNo) {
        setMemberName(data.memberName || '');
        const text = buildCertificate(data);
        setCertText(text);
        message.success('Share Certificate generated');
        if (outputType === 'printer') printCertificate(text);
      } else {
        setCertText('');
        message.error('Member not found');
      }
    } catch {
      message.error('Failed to generate share certificate');
      setCertText('');
    } finally {
      setLoading(false);
    }
  }, [memberNo, outputType]);

  const handleReset = useCallback(() => {
    setMemberNo('');
    setMemberName('');
    setCertText('');
  }, []);

  return (
    <ConfigProvider theme={{
      algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: { colorPrimary: '#10b981', borderRadius: 6, fontSize: 12 },
    }}>
      <div className={`h-screen flex flex-col font-sans overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 via-emerald-50/20 to-slate-50'}`}>

        {/* Header */}
        <div className={`px-3 py-1.5 flex items-center justify-between shrink-0 border-b ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/90 border-slate-200/60'}`}>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-1.5 rounded-lg text-white shadow-md">
              <Award size={14} />
            </div>
            <div>
              <h1 className="fz-label font-black tracking-tight leading-none">Share Certificate</h1>
              <div className="fz-caption font-bold text-slate-400 uppercase tracking-wider leading-none mt-0.5">
                <Award size={8} className="inline text-emerald-500 mr-1" />Membership Certificate
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

          {/* Sidebar LEFT */}
          <div className="w-[220px] flex flex-col gap-2 shrink-0">

            <div className={`border rounded-lg overflow-hidden shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-emerald-200/60'}`}>
              <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-2 py-1 flex items-center gap-1">
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

            <div className={`border rounded-lg p-2 shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-emerald-200/60'}`}>
              <div className="fz-caption font-bold text-slate-500 mb-1 uppercase">Output</div>
              <Radio.Group value={outputType} onChange={e => setOutputType(e.target.value)} size="small">
                <Radio value="screen" className="fz-caption"><Monitor size={10} className="inline mr-1" />Screen</Radio>
                <Radio value="printer" className="fz-caption"><Printer size={10} className="inline mr-1" />Printer</Radio>
              </Radio.Group>
            </div>

            <Button
              type="primary" block size="small" icon={<Search size={11} />}
              onClick={handleGenerate} loading={loading}
              className="h-8 bg-gradient-to-r from-emerald-600 to-emerald-700 font-black uppercase fz-caption shadow-lg"
            >
              Generate
            </Button>
          </div>

          {/* Certificate Area RIGHT */}
          <div className={`flex-1 border rounded-lg shadow-sm flex flex-col overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-emerald-200/60'}`}>
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-3 py-1.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <Award size={12} className="text-white" />
                <span className="fz-caption font-black text-white uppercase">Share Certificate</span>
                {memberNo && <span className="fz-caption font-bold text-emerald-100 ml-1">Member: {memberNo}</span>}
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
                    <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <Award size={40} className="text-emerald-200" />
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
        title={<div className="flex items-center gap-2 py-1"><div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shadow-md"><Users size={16} className="text-white" /></div><div><div className="fz-body font-black text-slate-800">Member Lookup</div><div className="fz-caption text-slate-400 font-bold uppercase tracking-wide">Select Member</div></div></div>}
        open={showLookup} onCancel={() => setShowLookup(false)} footer={null} width={1000} centered destroyOnClose
      >
        <div className="p-2"><MemberLookup isModal={true} onSelect={handleMemberSelect} onClose={() => setShowLookup(false)} /></div>
      </Modal>
    </ConfigProvider>
  );
};

export default ShareCertificate;
