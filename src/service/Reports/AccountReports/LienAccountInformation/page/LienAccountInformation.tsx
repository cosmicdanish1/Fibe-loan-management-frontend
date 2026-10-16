import React, { useState, useCallback, useEffect } from 'react';
import { message } from 'antd';
import { Printer, Search, RotateCcw, Lock } from 'lucide-react';
import { apiService } from '../../../../../services/api';
import dayjs from 'dayjs';
import { ReportShell, ParamCard, StatCards, OutputChoice, ReportEmpty, LegacyDocument } from '../../../../../components/reports/views/ReportShell';
import ReportViewSwitcher from '../../../../../components/reports/views/ReportViewSwitcher';
import { useReportViews } from '../../../../../components/reports/views/reportViews';
import '../../../../../components/reports/views/proViews.css';
import LienBento from '../views/LienBento';
import LienTerminal from '../views/LienTerminal';
import { fmt, type LienItem } from '../views/lienModel';

const REPORT_ID = 'account.lien-information';

// ── text helpers ──────────────────────────────────────────────────
const W = 90;
const ctr = (s: string) => s.padStart(Math.floor((W + s.length) / 2)).padEnd(W);
const rl  = () => '-'.repeat(W);
const col = (s: string, w: number, align: 'l' | 'r' = 'l') =>
  align === 'l' ? s.substring(0, w).padEnd(w) : s.substring(0, w).padStart(w);

const fmtDate = (d?: string) => (d ? dayjs(d).format('DD-MMM-YYYY') : '---');
const fmtAmt = (n: number) => (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const buildReportText = (data: LienItem[]): string => {
  const lines: string[] = [];

  lines.push(ctr('Espat Karmchari Co-Operative Credit Society Limited.'));
  lines.push(ctr('Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006'));
  lines.push(ctr('Reg No: A.R/DRG/1796'));
  lines.push('');
  lines.push(ctr('Lien Account Information'));
  lines.push('');
  lines.push(rl());
  lines.push('');

  // Legacy layout: MB No, Member Name, Loan A/c, <deposit>, Lien Date. The old "FD A/c"
  // column is now "RD Locked": the amount of the member's RD held as security for the loan.
  lines.push(
    col('MB No', 12) +
    col('Member Name', 28) +
    col('Loan A/c', 12) +
    col('RD Locked (Rs.)', 18, 'r') +
    '  ' +
    col('Lien Date', 14)
  );
  lines.push(rl());

  if (data.length === 0) {
    lines.push(ctr('No lien accounts found'));
  } else {
    data.forEach(item => {
      lines.push(
        col(String(item.memberNo), 12) +
        col(item.memberName, 26).padEnd(28) +
        col(String(item.loanCaseNo), 12) +
        col(fmtAmt(item.lienAmount), 18, 'r') +
        '  ' +
        col(fmtDate(item.lienFromDate), 14)
      );
    });
    lines.push(rl());
    lines.push(
      col('Total RD locked', 52) +
      col(fmtAmt(data.reduce((sum, item) => sum + (Number(item.lienAmount) || 0), 0)), 18, 'r')
    );
  }

  lines.push(rl());
  lines.push('');
  lines.push(ctr('Report as per data available'));

  return lines.join('\n');
};

const printReportText = (text: string) => {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const doc = `<html><head><style>
    @page{size:portrait;margin:15mm}
    body{font-family:'Courier New',monospace;font-size:10pt;white-space:pre;background:white;color:#000}
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

const LienAccountInformation: React.FC = () => {
  const [outputType, setOutputType] = useState<'screen' | 'printer'>('screen');
  const [loading, setLoading]       = useState(false);
  const [reportText, setReportText] = useState('');
  const [recordCount, setRecordCount] = useState(0);
  const [items, setItems]           = useState<LienItem[]>([]);
  const [loaded, setLoaded]         = useState(false);
  const { enabled, view, setView }  = useReportViews(REPORT_ID);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/reports/lien-account-information');
      if (!response.success) {
        setReportText('');
        setRecordCount(0);
        setItems([]);
        message.error(response.message || response.error || 'Failed to load lien account information');
        return;
      }
      const rows: LienItem[] = Array.isArray((response as any)?.data)
        ? (response as any).data
        : Array.isArray(response) ? (response as any) : [];

      const text = buildReportText(rows);
      setReportText(text);
      setRecordCount(rows.length);
      setItems(rows);
      setLoaded(true);

      if (rows.length === 0) message.info('No lien accounts found');
      else if (outputType === 'printer') printReportText(text);
    } catch {
      message.error('Failed to load lien account information');
      setReportText('');
      setRecordCount(0);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [outputType]);

  useEffect(() => { handleGenerate(); }, []);

  const handleReset = useCallback(() => {
    setReportText('');
    setRecordCount(0);
    setItems([]);
    setLoaded(false);
  }, []);

  const hasData = items.length > 0;
  const total = items.reduce((s, r) => s + (Number(r.lienAmount) || 0), 0);

  return (
    <ReportShell
      className="lai-page"
      title="Lien Account Information"
      desc="Secured accounts"
      switcher={<ReportViewSwitcher enabled={enabled} value={view} onChange={setView} />}
      actions={
        <>
          <button type="button" className="aw-btn aw-btn-ghost" onClick={handleReset}><RotateCcw size={14} /> Reset</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={() => reportText && printReportText(reportText)} disabled={!reportText}><Printer size={14} /> Print</button>
        </>
      }
      aside={
        <>
          <ParamCard>
            <OutputChoice value={outputType} onChange={setOutputType} id="lai-output" />
            <button type="button" className="aw-btn aw-btn-primary" onClick={handleGenerate} disabled={loading} style={{ width: '100%' }}>
              <Search size={14} className={loading ? 'aw-spin' : undefined} /> {loading ? 'Loading…' : 'Generate'}
            </button>
          </ParamCard>
          {hasData && <StatCards items={[
            { label: 'Lien accounts', value: String(recordCount), tone: 'muted' },
            { label: 'RD locked', value: fmt(total), tone: 'info' },
          ]} />}
        </>
      }
      footerLeft="Lien Account Information"
      footerRight={loaded ? `${recordCount} lien account${recordCount === 1 ? '' : 's'}` : ''}
    >
      {hasData && view === 'bento' && <LienBento items={items} />}
      {hasData && view === 'terminal' && <div style={{ height: 'calc(100vh - 150px)', minHeight: 320 }}><LienTerminal items={items} /></div>}

      {view === 'legacy' && (
        <LegacyDocument
          title="Lien Account Information"
          meta={recordCount > 0 ? `${recordCount} Records` : undefined}
          text={reportText}
          loading={loading}
          empty={<ReportEmpty icon={<Lock size={34} />} title="No Data" hint="Click Generate to load lien accounts" />}
        />
      )}
      {view !== 'legacy' && !hasData && (
        <ReportEmpty icon={<Lock size={34} />} title={loading ? 'Loading…' : loaded ? 'No lien accounts' : 'No Data'} hint="Click Generate to load lien accounts" />
      )}
    </ReportShell>
  );
};

export default LienAccountInformation;
