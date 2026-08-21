import React, { useState, useCallback } from 'react';
import { ConfigProvider, Input, Button, Radio, Spin, message, Modal, Select, theme } from 'antd';
import { FileText, Printer, Search, RotateCcw, BadgePercent, User, Users, Monitor } from 'lucide-react';
import { useSelector } from 'react-redux';
import { apiService } from '../../../../../services/api';
import MemberLookup from '../../../../../components/shared/MemberLookup/MemberLookup';
import dayjs from 'dayjs';

interface InterestData {
  memberNo: string;
  memberName: string;
  pfNo: string;
  officeName: string;
  year: number;
  totalInterest: number;
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

const buildCertificate = (data: InterestData): string => {
  const certNo = `IC-${data.memberNo}-${data.year}`;
  const issueDate = dayjs().format('DD-MMM-YYYY');
  const lines: string[] = [];

  lines.push(DSEP);
  lines.push(center(SOCIETY.name));
  lines.push(center(SOCIETY.addr));
  lines.push(center(SOCIETY.reg));
  lines.push(DSEP);
  lines.push(center('INTEREST  CERTIFICATE'));
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
  lines.push(row('PF No', data.pfNo || 'N/A'));
  lines.push(row('Office', data.officeName || 'N/A'));
  lines.push('');
  lines.push(SEP);
  lines.push('');
  lines.push(`  has earned the following interest during the financial year ${data.year}:`);
  lines.push('');
  lines.push(`  ${'Total Interest'.padEnd(14)}: Rs.  ${fmtAmt(data.totalInterest).padStart(14)}`);
  lines.push('');
  lines.push(SEP);
  lines.push('');
  lines.push(`  Financial Year  : ${data.year} (01-Apr-${data.year - 1} to 31-Mar-${data.year})`);
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

const currentYear = dayjs().year();
const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - i).map(y => ({
  value: y,
  label: `${y} (FY ${y - 1}-${String(y).slice(2)})`,
}));

const InterestCertificate: React.FC = () => {
  const isDark = useSelector((state: any) => state.theme?.interfaceMode === 'dark');

  const [memberNo, setMemberNo]     = useState('');
  const [memberName, setMemberName] = useState('');
  const [year, setYear]             = useState<number>(currentYear);
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
      const response = await apiService.post('/reports/interest-certificate', { memberNo, year });
      const data: InterestData = (response as any).data || response;
      if (!data || !data.memberNo) {
        message.error('No interest data found for this member and year');
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
      message.error('Failed to generate interest certificate');
      setCertText('');
    } finally {
      setLoading(false);
    }
  }, [memberNo, memberName, year, outputType]);

  const handleReset = useCallback(() => {
    setMemberNo('');
    setMemberName('');
    setYear(currentYear);
    setCertText('');
  }, []);

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: { colorPrimary: '#0891b2', borderRadius: 6, fontSize: 12 },
      }}
    >
      <div className={`h-screen flex flex-col overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-slate-50 via-cyan-50/20 to-slate-50'}`}>
        {/* Header */}
        <div className={`border-b px-3 py-1.5 flex items-center justify-between shrink-0 ${isDark ? 'bg-gradient-to-r from-slate-900 to-slate-900 border-white/5' : 'bg-white/90 border-slate-200/60'}`}>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 p-1.5 rounded-lg text-white shadow-md">
              <BadgePercent size={14} />
            </div>
            <div>
              <h1 className="fz-label font-black tracking-tight leading-none">Interest Certificate</h1>
              <div className="fz-caption font-bold text-slate-400 uppercase tracking-wider leading-none mt-0.5">9.6 Interest Certificate</div>
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
            <div className={`border rounded-lg overflow-hidden shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-cyan-200/60'}`}>
              <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 px-2 py-1 flex items-center gap-1">
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

            {/* Year */}
            <div className={`border rounded-lg overflow-hidden shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-cyan-200/60'}`}>
              <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 px-2 py-1 flex items-center gap-1">
                <span className="fz-caption font-black text-white uppercase">Financial Year</span>
              </div>
              <div className="p-2">
                <Select
                  value={year}
                  onChange={setYear}
                  options={yearOptions}
                  size="small"
                  className="w-full fz-caption"
                />
              </div>
            </div>

            {/* Output */}
            <div className={`border rounded-lg p-2 shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-cyan-200/60'}`}>
              <div className="fz-caption font-bold text-slate-500 mb-1 uppercase">Output</div>
              <Radio.Group value={outputType} onChange={e => setOutputType(e.target.value)} size="small">
                <Radio value="screen" className="fz-caption"><Monitor size={10} className="inline mr-1" />Screen</Radio>
                <Radio value="printer" className="fz-caption"><Printer size={10} className="inline mr-1" />Printer</Radio>
              </Radio.Group>
            </div>

            <Button
              type="primary" block size="small" icon={<Search size={11} />}
              onClick={handleGenerate} loading={loading}
              className="h-8 bg-gradient-to-r from-cyan-600 to-cyan-700 font-black uppercase fz-caption shadow-lg"
            >
              Generate
            </Button>
          </div>

          {/* Certificate Area */}
          <div className={`flex-1 border rounded-lg shadow-sm flex flex-col overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-cyan-200/60'}`}>
            <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 px-3 py-1.5 flex items-center gap-1.5 shrink-0">
              <FileText size={12} className="text-white" />
              <span className="fz-caption font-black text-white uppercase">Interest Certificate — Member: {memberNo || 'N/A'} — Year: {year}</span>
            </div>
            <div className="flex-1 overflow-auto p-3">
              <Spin spinning={loading} size="small">
                {certText ? (
                  <pre className="font-mono leading-relaxed whitespace-pre" style={{ fontFamily: "'Courier New', monospace", fontSize: 12 }}>
                    {certText}
                  </pre>
                ) : (
                  <div className="py-32 text-center">
                    <BadgePercent size={48} className="text-cyan-200 mx-auto mb-4" />
                    <p className="fz-label font-black text-slate-400 uppercase tracking-wider">No Certificate</p>
                    <p className="fz-caption text-slate-300 mt-1">Enter member number, select year, and generate certificate</p>
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
        title={<div className="flex items-center gap-2"><div className="w-7 h-7 bg-cyan-600 rounded-lg flex items-center justify-center"><Users size={14} className="text-white" /></div><span className="font-black">Member Lookup</span></div>}
      >
        <MemberLookup isModal={true} onSelect={handleMemberSelect} onClose={() => setShowLookup(false)} />
      </Modal>
    </ConfigProvider>
  );
};

export default InterestCertificate;
