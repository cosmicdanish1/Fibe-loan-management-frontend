import React, { useState, useCallback } from 'react';
import {
  FileText, Search, Printer, FileDown, User, RotateCcw, ShieldCheck, BookOpen, Calendar, Users
} from 'lucide-react';
import { ConfigProvider, Button, DatePicker, Radio, Input, Modal, message, theme as antdTheme } from 'antd';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';
import { apiService } from '../../../../../services/api';
import dayjs, { Dayjs } from 'dayjs';
import MemberLookup from '../../../../../components/shared/MemberLookup/MemberLookup';

interface LedgerCell { dr: number; cr: number; bal: number | null; }
interface LedgerRow { date: string; share: LedgerCell; ltl: LedgerCell; emer: LedgerCell; cd: LedgerCell; }
interface Balances { share: number; ltl: number; emer: number; cd: number; }
interface ColumnarLedger {
  memberNumber: string;
  memberName: string;
  fromDate: string;
  toDate: string;
  opening: Balances;
  closing: Balances;
  rows: LedgerRow[];
}

// ---- Monospace report layout ----
const DATEW = 26;            // date column width
const CW = 8;                // each sub-cell (Dr / Cr / Bal) width
const GW = CW * 3 + 2;       // account-group inner width  ("Dr|Cr|Bal")
const REPORT_W = DATEW + 4 * GW + 5;

const SOCIETY = [
  'Espat Karmchari Co-Operative Credit Society Limited.',
  'Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006',
  'A.R/DRG/1796',
];

const center = (s: string, w: number) => {
  s = s.length > w ? s.slice(0, w) : s;
  const total = w - s.length;
  const left = Math.floor(total / 2);
  return ' '.repeat(left) + s + ' '.repeat(total - left);
};
const padE = (s: string, w: number) => (s.length > w ? s.slice(0, w) : s + ' '.repeat(w - s.length));
const padS = (s: string, w: number) => (s.length > w ? s.slice(0, w) : ' '.repeat(w - s.length) + s);
const intStr = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(Math.round(n)));
const cellNum = (v: number) => (v && Math.round(v) !== 0 ? String(Math.round(v)) : '');

const group = (a: string, b: string, c: string) => `${padS(a, CW)}|${padS(b, CW)}|${padS(c, CW)}`;
const groupH = (a: string, b: string, c: string) => `${center(a, CW)}|${center(b, CW)}|${center(c, CW)}`;
const rowLine = (date: string, g1: string, g2: string, g3: string, g4: string) =>
  `${padE(date, DATEW)}|${g1}|${g2}|${g3}|${g4}|`;

const buildReportText = (d: ColumnarLedger): string => {
  const DASH = '-'.repeat(REPORT_W);
  const lines: string[] = [];

  SOCIETY.forEach(s => lines.push(center(s, REPORT_W)));
  lines.push('');
  lines.push(center('MEMBER  DETAIL  LEDGER', REPORT_W));
  lines.push('');
  lines.push(`Member   :- [${d.memberNumber} ]${d.memberName}`);
  lines.push(DASH);

  lines.push(rowLine('', center('SHARE ACCOUNT', GW), center('LONG TERM LOAN', GW), center('EMERGENCY LOAN', GW), center('COMPULSORY DEPOSIT', GW)));
  lines.push(rowLine('    Date', groupH('Dr.', 'Cr.', 'Bal.'), groupH('Dr.', 'Cr.', 'Bal.'), groupH('Dr.', 'Cr.', 'Bal.'), groupH('Dr.', 'Cr.', 'Bal.')));
  lines.push(rowLine('', groupH('Rs.', 'Rs.', 'Rs.'), groupH('Rs.', 'Rs.', 'Rs.'), groupH('Rs.', 'Rs.', 'Rs.'), groupH('Rs.', 'Rs.', 'Rs.')));
  lines.push(DASH);

  const op = d.opening;
  lines.push(rowLine(
    `Bal:${dayjs(d.fromDate).format('DD-MM-YYYY')}`,
    group('', '', intStr(op.share)),
    group('', '', intStr(op.ltl)),
    group('', '', intStr(op.emer)),
    group('', '', intStr(op.cd)),
  ));

  const cellOf = (c: LedgerCell) => (c.bal === null ? group('', '', '') : group(cellNum(c.dr), cellNum(c.cr), intStr(c.bal)));
  d.rows.forEach(r => {
    lines.push(rowLine(dayjs(r.date).format('DD-MM-YYYY'), cellOf(r.share), cellOf(r.ltl), cellOf(r.emer), cellOf(r.cd)));
  });

  lines.push(DASH);
  const cl = d.closing;
  lines.push(rowLine('Closing',
    group('', '', intStr(cl.share)),
    group('', '', intStr(cl.ltl)),
    group('', '', intStr(cl.emer)),
    group('', '', intStr(cl.cd)),
  ));
  lines.push(DASH);
  lines.push('Report As Per Data Available....');

  return lines.join('\n');
};

const MemberLedger: React.FC = () => {
  const [memberNumber, setMemberNumber] = useState<string>('');
  const [memberName, setMemberName] = useState<string>('');
  const [fromDate, setFromDate] = useState<Dayjs>(dayjs('2019-11-01'));
  const [toDate, setToDate] = useState<Dayjs>(dayjs());
  const [outputType, setOutputType] = useState<string>('screen');
  const [report, setReport] = useState<ColumnarLedger | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLookup, setShowLookup] = useState(false);

  const handleMemberSelect = useCallback((member: any) => {
    setMemberNumber(member.memberNo || member.mbno || '');
    setMemberName(member.memberName || member.name || '');
    setShowLookup(false);
  }, []);

  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const fmtMoney = useCallback((n: number) =>
    new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(n || 0)), []);

  // ---- Print via hidden iframe (window.print is blocked in Electron) ----
  const printWithData = useCallback((text: string) => {
    const html = `<!DOCTYPE html><html><head><title>Member Detail Ledger</title>
<style>
  body { font-family: 'Courier New', monospace; font-size: 10px; margin: 8mm; color: #000; }
  pre { white-space: pre; }
  @page { size: landscape; margin: 8mm; }
</style></head><body><pre>${text}</pre></body></html>`;
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open(); doc.write(html); doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus(); iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 400);
    }
  }, []);

  const generateReport = useCallback(async () => {
    if (!memberNumber.trim()) {
      message.warning('Please select a member');
      return;
    }
    setLoading(true);
    try {
      const res = await apiService.getMemberColumnarLedger({
        memberNumber: memberNumber.trim(),
        fromDate: fromDate.format('YYYY-MM-DD'),
        toDate: toDate.format('YYYY-MM-DD'),
      });
      if (res.success && res.data) {
        const payload: any = res.data;
        const data: ColumnarLedger = payload?.rows ? payload : payload?.data;
        if (data && data.rows) {
          setReport(data);
          if (data.memberName) setMemberName(data.memberName);
          message.success(`${data.rows.length} dated entries`);
          if (outputType === 'printer') printWithData(buildReportText(data));
        } else {
          setReport(null);
          message.info('No records found');
        }
      } else {
        setReport(null);
        message.warning(res.message || 'No data');
      }
    } catch (error) {
      console.error('MemberLedger error:', error);
      message.error('Failed to generate report');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [memberNumber, fromDate, toDate, outputType, printWithData]);

  const handleReset = useCallback(() => {
    setMemberNumber('');
    setMemberName('');
    setFromDate(dayjs('2019-11-01'));
    setToDate(dayjs());
    setReport(null);
    setOutputType('screen');
  }, []);

  const handlePrint = useCallback(() => {
    if (report) printWithData(buildReportText(report));
  }, [report, printWithData]);

  const handleExportCSV = useCallback(() => {
    if (!report) { message.warning('No data to export'); return; }
    const head = ['Date',
      'Share Dr', 'Share Cr', 'Share Bal',
      'LTL Dr', 'LTL Cr', 'LTL Bal',
      'Emergency Dr', 'Emergency Cr', 'Emergency Bal',
      'CD Dr', 'CD Cr', 'CD Bal'];
    const cell = (c: LedgerCell) => [c.dr || 0, c.cr || 0, c.bal ?? ''];
    const lines = [head.join(',')];
    lines.push(['Opening', '', '', report.opening.share, '', '', report.opening.ltl, '', '', report.opening.emer, '', '', report.opening.cd].join(','));
    report.rows.forEach(r => {
      lines.push([dayjs(r.date).format('DD-MM-YYYY'), ...cell(r.share), ...cell(r.ltl), ...cell(r.emer), ...cell(r.cd)].join(','));
    });
    lines.push(['Closing', '', '', report.closing.share, '', '', report.closing.ltl, '', '', report.closing.emer, '', '', report.closing.cd].join(','));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `MemberLedger_${report.memberNumber}_${dayjs().format('YYYYMMDD')}.csv`;
    link.click();
    message.success('CSV exported');
  }, [report]);

  const reportText = report ? buildReportText(report) : '';

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#0891b2',
          borderRadius: 6,
          fontSize: 12,
          colorBgContainer: isDark ? '#1e293b' : '#ffffff',
          colorBorder: isDark ? '#334155' : '#e2e8f0',
        },
      }}
    >
      <style>{`
        .custom-scrollbar-cyan::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar-cyan::-webkit-scrollbar-track { background: ${isDark ? '#0f172a' : '#f8fafc'}; border-radius: 3px; }
        .custom-scrollbar-cyan::-webkit-scrollbar-thumb { background: ${isDark ? '#334155' : '#67e8f9'}; border-radius: 3px; }
        .custom-scrollbar-cyan::-webkit-scrollbar-thumb:hover { background: ${isDark ? '#475569' : '#22d3ee'}; }
      `}</style>

      <div className={`h-screen flex flex-col font-sans overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 via-cyan-50/20 to-slate-50'}`}>
        {/* Header */}
        <div className={`px-3 py-1.5 flex items-center justify-between z-10 shadow-sm shrink-0 border-b ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/90 backdrop-blur-sm border-slate-200/60'}`}>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 p-1.5 rounded-lg text-white shadow-md">
              <BookOpen size={14} />
            </div>
            <div>
              <h1 className={`fz-label font-black tracking-tight leading-none ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Member Ledger</h1>
              <div className={`flex items-center gap-1 mt-0.5 fz-caption font-bold uppercase tracking-wider leading-none ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                <ShieldCheck size={8} className="text-cyan-500" /> Member Detail Ledger
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button icon={<RotateCcw size={11} />} size="small"
              className="h-7 px-2 rounded-lg fz-caption font-bold uppercase tracking-wide border-slate-200 hover:border-cyan-500 hover:text-cyan-600"
              onClick={handleReset}>Reset</Button>
            <Button icon={<Printer size={11} />} size="small"
              className="h-7 px-2 rounded-lg fz-caption font-bold uppercase tracking-wide border-slate-200 hover:border-cyan-500 hover:text-cyan-600"
              onClick={handlePrint} disabled={!report}>Print</Button>
            <Button type="primary" icon={<FileDown size={11} />} size="small"
              className="h-7 px-3 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 rounded-lg fz-caption font-bold uppercase tracking-wide shadow-md"
              onClick={handleExportCSV} disabled={!report}>CSV</Button>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 overflow-hidden p-2 flex gap-2">
          {/* Sidebar */}
          <div className="w-[260px] flex flex-col gap-2 shrink-0 overflow-y-auto custom-scrollbar-cyan">
            {/* Member */}
            <div className={`rounded-lg overflow-hidden shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 backdrop-blur-sm border-cyan-200/60'}`}>
              <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 px-2 py-1 flex items-center gap-1">
                <User size={10} className="text-white" />
                <h3 className="fz-caption font-black text-white tracking-wide uppercase">Member</h3>
              </div>
              <div className="p-2 space-y-1.5">
                <label className={`fz-caption font-bold uppercase tracking-tight flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <User size={10} className="text-cyan-500" />
                  Member No
                </label>
                <Input.Search
                  placeholder="Type member no..."
                  value={memberNumber}
                  onChange={e => setMemberNumber(e.target.value)}
                  onSearch={() => setShowLookup(true)}
                  className="h-8 fz-label font-semibold"
                />
                <label className={`fz-caption font-bold uppercase tracking-tight flex items-center gap-1 mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <User size={10} className="text-cyan-500" />
                  Member Name
                </label>
                <Input
                  value={memberName}
                  readOnly
                  placeholder="Selected member name"
                  className="h-8 fz-label font-semibold"
                />
              </div>
            </div>

            {/* Date Range */}
            <div className={`rounded-lg overflow-hidden shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 backdrop-blur-sm border-cyan-200/60'}`}>
              <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 px-2 py-1 flex items-center gap-1">
                <Calendar size={10} className="text-white" />
                <h3 className="fz-caption font-black text-white tracking-wide uppercase">Date Range</h3>
              </div>
              <div className="p-2 space-y-1.5">
                <div>
                  <label className={`fz-caption font-bold uppercase tracking-tight block mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>From</label>
                  <DatePicker className="w-full h-7 fz-caption font-semibold" value={fromDate} onChange={v => v && setFromDate(v)} format="DD-MMM-YY" />
                </div>
                <div>
                  <label className={`fz-caption font-bold uppercase tracking-tight block mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>To</label>
                  <DatePicker className="w-full h-7 fz-caption font-semibold" value={toDate} onChange={v => v && setToDate(v)} format="DD-MMM-YY" />
                </div>
              </div>
            </div>

            {/* Output */}
            <div className={`rounded-lg overflow-hidden shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 backdrop-blur-sm border-cyan-200/60'}`}>
              <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 px-2 py-1 flex items-center gap-1">
                <FileText size={10} className="text-white" />
                <h3 className="fz-caption font-black text-white tracking-wide uppercase">Output</h3>
              </div>
              <div className="p-2 space-y-1.5">
                <div>
                  <label className={`fz-caption font-bold uppercase tracking-tight block mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Type</label>
                  <Radio.Group size="small" value={outputType} onChange={e => setOutputType(e.target.value)} className="w-full">
                    <Radio.Button value="screen" className="w-1/2 text-center fz-caption font-bold">SCR</Radio.Button>
                    <Radio.Button value="printer" className="w-1/2 text-center fz-caption font-bold">PTR</Radio.Button>
                  </Radio.Group>
                </div>
                <Button type="primary" block size="small" icon={<Search size={11} />} onClick={generateReport} loading={loading}
                  className="h-8 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 font-black uppercase tracking-wider fz-caption mt-1 shadow-lg">
                  Generate
                </Button>
              </div>
            </div>

            {/* Closing balances */}
            {report && (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Share', val: report.closing.share },
                  { label: 'CD', val: report.closing.cd },
                  { label: 'Reg. Loan', val: report.closing.ltl },
                  { label: 'Emerg. Loan', val: report.closing.emer },
                ].map(s => (
                  <div key={s.label} className={`rounded-lg p-2 shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 border-cyan-200/60'}`}>
                    <div className={`fz-caption font-bold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{s.label}</div>
                    <div className={`fz-label font-black font-mono ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>₹{fmtMoney(s.val)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Report */}
          <div className={`flex-1 rounded-lg shadow-sm flex flex-col overflow-hidden border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 backdrop-blur-sm border-cyan-200/60'}`}>
            <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 px-3 py-1.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="bg-white/20 p-1 rounded-md shadow-sm"><FileText size={12} className="text-white" /></div>
                <div>
                  <h3 className="fz-caption font-black text-white uppercase tracking-wide leading-none">Detail Ledger</h3>
                  <p className="fz-caption font-bold text-cyan-200 uppercase mt-0.5 tracking-tight leading-none">
                    {fromDate.format('DD-MMM-YY')} - {toDate.format('DD-MMM-YY')}
                  </p>
                </div>
              </div>
              {report && <div className="fz-caption font-black text-white bg-white/20 px-2 py-0.5 rounded">{report.rows.length} Entries</div>}
            </div>

            <div className={`flex-1 overflow-auto p-3 custom-scrollbar-cyan ${isDark ? 'bg-slate-900/40' : 'bg-gradient-to-br from-white to-cyan-50/10'}`}>
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mr-3" />
                  <span className={`font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading ledger...</span>
                </div>
              ) : report ? (
                <div className={`font-mono rounded-lg border p-4 overflow-x-auto ${isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-[#fffff0] border-slate-300 text-slate-800'}`}>
                  <pre style={{ fontFamily: "'Courier New', Courier, monospace", lineHeight: '1.4', fontSize: '12px' }} className="whitespace-pre">{reportText}</pre>
                </div>
              ) : (
                <div className="py-32 text-center">
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner ${isDark ? 'bg-slate-800' : 'bg-cyan-50'}`}>
                    <FileText className={`text-4xl ${isDark ? 'text-slate-600' : 'text-cyan-200'}`} />
                  </div>
                  <h4 className={`font-black fz-label uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No Data</h4>
                  <p className={`fz-caption mt-1 font-semibold ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>Select a member and generate</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Modal
        title={
          <div className="flex items-center gap-2 py-1">
            <div className="w-8 h-8 bg-cyan-600 rounded-lg flex items-center justify-center shadow-md">
              <Users size={16} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-black text-slate-800">Member Lookup</div>
              <div className="fz-caption text-slate-400 font-bold uppercase tracking-wide">Select Member</div>
            </div>
          </div>
        }
        open={showLookup}
        onCancel={() => setShowLookup(false)}
        footer={null}
        width={950}
        centered
        destroyOnClose
        styles={{ body: { padding: 0 } }}
      >
        <div className="p-2">
          <MemberLookup isModal={true} onSelect={handleMemberSelect} onClose={() => setShowLookup(false)} />
        </div>
      </Modal>
    </ConfigProvider>
  );
};

export default MemberLedger;
