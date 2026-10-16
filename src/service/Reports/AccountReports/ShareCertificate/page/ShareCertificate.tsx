import React, { useState, useCallback } from 'react';
import { message } from 'antd';
import { Printer, Search, RotateCcw, Award, User } from 'lucide-react';
import { apiService } from '../../../../../services/api';
import dayjs from 'dayjs';
import MemberField from '../../../../../components/shared/kit/MemberField';
import { ReportShell, ParamCard, OutputChoice, ReportEmpty, LegacyDocument } from '../../../../../components/reports/views/ReportShell';
import '../../../../../components/reports/views/proViews.css';

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

// A printed certificate is a fixed form, so this window has no Pro views: only the shell follows the app design.
const ShareCertificate: React.FC = () => {
  const [memberNo, setMemberNo]     = useState('');
  const [memberName, setMemberName] = useState('');
  const [outputType, setOutputType] = useState<'screen' | 'printer'>('screen');
  const [loading, setLoading]       = useState(false);
  const [certText, setCertText]     = useState('');

  const handleMemberSelect = useCallback((member: any) => {
    setMemberNo(String(member.memberNo || member.mbno || ''));
    setMemberName(member.memberName || member.name || '');
  }, []);

  const handleGenerate = useCallback(async (override?: string) => {
    const no = (override ?? memberNo).trim();
    if (!no) {
      message.warning('Please enter Member Number');
      return;
    }
    setLoading(true);
    try {
      const response = await apiService.getShareCertificate({ memberNo: no });
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
    <ReportShell
      className="share-cert-page"
      title="Share Certificate"
      desc="Membership certificate"
      actions={
        <>
          <button type="button" className="aw-btn aw-btn-ghost" onClick={handleReset}><RotateCcw size={14} /> Reset</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={() => certText && printCertificate(certText)} disabled={!certText}><Printer size={14} /> Print</button>
        </>
      }
      aside={
        <ParamCard title="Member" icon={<User size={14} />}>
          <div>
            <label className="aw-label" htmlFor="sc-member">Member No.</label>
            <MemberField id="sc-member" value={memberNo} onChange={setMemberNo} onSelect={handleMemberSelect} onSubmit={v => handleGenerate(v)} />
          </div>
          <input className="aw-input" value={memberName} readOnly placeholder="Member name" aria-label="Member name" />
          <OutputChoice value={outputType} onChange={setOutputType} id="sc-output" />
          <button type="button" className="aw-btn aw-btn-primary" onClick={() => handleGenerate()} disabled={loading} style={{ width: '100%' }}>
            <Search size={14} className={loading ? 'aw-spin' : undefined} /> {loading ? 'Loading…' : 'Generate'}
          </button>
        </ParamCard>
      }
      footerLeft="Share Certificate"
      footerRight={memberNo ? `Member ${memberNo}` : ''}
    >
      <LegacyDocument
        title={`Share Certificate${memberNo ? ` · Member ${memberNo}` : ''}`}
        text={certText}
        loading={loading}
        empty={<ReportEmpty icon={<Award size={34} />} title="No Certificate" hint="Enter member number and generate" />}
      />
    </ReportShell>
  );
};

export default ShareCertificate;
