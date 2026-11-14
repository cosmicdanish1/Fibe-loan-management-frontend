import React, { useState, useCallback } from 'react';
import { isFailure, notifyError } from '@/utils/dialog';
import { message } from 'antd';
import { Printer, Search, RotateCcw, BadgePercent, User } from 'lucide-react';
import { apiService } from '../../../../../services/api';
import { ReportShell, ParamCard, OutputChoice, ReportEmpty, LegacyDocument } from '../../../../../components/reports/views/ReportShell';
import MemberField from '../../../../../components/shared/kit/MemberField';
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
  const [memberNo, setMemberNo]     = useState('');
  const [memberName, setMemberName] = useState('');
  const [year, setYear]             = useState<number>(currentYear);
  const [outputType, setOutputType] = useState<'screen' | 'printer'>('screen');
  const [loading, setLoading]       = useState(false);
  const [certText, setCertText]     = useState('');

  const handleMemberSelect = useCallback((member: any) => {
    setMemberNo(member.memberNo || member.mbno || '');
    setMemberName(member.memberName || member.name || '');
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!memberNo.trim()) {
      message.warning('Please enter Member Number');
      return;
    }
    setLoading(true);
    try {
      const response = await apiService.post('/reports/interest-certificate', { memberNo, year });
      if (isFailure(response)) { await notifyError(response, 'load the interest certificate'); return; }
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
    <ReportShell
      className="intcert-page"
      title="Interest Certificate"
      desc="Interest paid to a member in a financial year"
      actions={
        <>
          <button type="button" className="aw-btn aw-btn-ghost" onClick={handleReset}><RotateCcw size={14} /> Reset</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={() => certText && printCertificate(certText)} disabled={!certText}><Printer size={14} /> Print</button>
        </>
      }
      aside={
        <ParamCard title="Certificate" icon={<User size={14} />}>
          <div>
            <label className="aw-label" htmlFor="ic-member">Member No.</label>
            <MemberField id="ic-member" value={memberNo} onChange={setMemberNo} onSelect={handleMemberSelect} onSubmit={() => handleGenerate()} />
          </div>
          <input className="aw-input" value={memberName} readOnly placeholder="Member name" aria-label="Member name" />
          <div>
            <label className="aw-label" htmlFor="ic-year">Financial year</label>
            <select id="ic-year" className="aw-input" value={year} onChange={e => setYear(Number(e.target.value))}>
              {yearOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <OutputChoice value={outputType} onChange={setOutputType} id="ic-output" />
          <button type="button" className="aw-btn aw-btn-primary" onClick={() => handleGenerate()} disabled={loading} style={{ width: '100%' }}>
            <Search size={14} className={loading ? 'aw-spin' : undefined} /> {loading ? 'Loading…' : 'Generate'}
          </button>
        </ParamCard>
      }
      footerLeft="Interest Certificate"
      footerRight={memberNo ? `Member ${memberNo} · Year ${year}` : ''}
    >
      <LegacyDocument
        title={`Interest Certificate — Member: ${memberNo || 'N/A'}`}
        meta={`Year ${year}`}
        text={certText}
        loading={loading}
        empty={<ReportEmpty icon={<BadgePercent size={34} />} title="No Certificate" hint="Enter member number, select year, and generate certificate" />}
      />
    </ReportShell>
  );
};

export default InterestCertificate;
