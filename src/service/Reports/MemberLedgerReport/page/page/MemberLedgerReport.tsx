import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Printer, FileDown, User, RotateCcw, BookOpen,
  Calendar, List, Sun, Moon, ShieldCheck
} from 'lucide-react';
import { ConfigProvider, Button, DatePicker, Spin, Select, Input, Modal, theme as antdTheme } from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../../../store';
import { setInterfaceMode } from '../../../../../store/slices/themeSlice';
import { apiService } from '../../../../../services/api';
import MemberLookup from '../../../../../components/shared/MemberLookup/MemberLookup';
import dayjs, { Dayjs } from 'dayjs';

interface LedgerEntry {
  transactionNo: number;
  transactionDate: string;
  voucherNo: string;
  narration: string;
  debit: number;
  credit: number;
  balance: number;
  transactionType: 'DR' | 'CR';
}

interface LedgerData {
  memberNumber: string;
  memberName: string;
  headCode: string;
  headName: string;
  fromDate: string;
  toDate: string;
  openingBalance: number;
  totalDebits: number;
  totalCredits: number;
  closingBalance: number;
  entries: LedgerEntry[];
  totalTransactions: number;
}

interface HeadOption { code: string; headName: string; }

const fmt = (n: number) =>
  Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const balLabel = (n: number) => `${fmt(n)} ${n >= 0 ? 'CR' : 'DR'}`;

// Print-only layout matching the legacy report exactly (letterhead, Head
// Name/Member/Date-range/Opening block, Date/Page Number line, Date/
// Particulars/Voucher No/Debit/Credit/Balance columns, Total Amount row,
// footer notes) — same lines[]-as-single-source-of-truth pattern already
// proven for the other Daily reports' prints. On-screen view is untouched;
// this feeds handlePrint only.
const MLR_LINE_W = 94;
const MLR_DASH = '-'.repeat(MLR_LINE_W);
const MLR_COL_DATE = 12;
const MLR_COL_PART = 22;
const MLR_COL_VCHR = 11;
const MLR_COL_AMT = 15;

const mlrPadL = (s: string, w: number) => s.padStart(w);
const mlrPadR = (s: string, w: number) => (s.length > w ? s.slice(0, w) : s.padEnd(w));
const mlrCenter = (s: string, w: number) => ' '.repeat(Math.max(0, Math.floor((w - s.length) / 2))) + s;

function buildMemberLedgerLines(data: LedgerData): string[] {
  const lines: string[] = [];
  const now = dayjs().format('DD-MMM-YYYY/h:mmA');

  lines.push(mlrCenter('Espat Karmchari Co-Operative Credit Society Limited.', MLR_LINE_W));
  lines.push(mlrCenter('Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006', MLR_LINE_W));
  lines.push(mlrCenter('Ledger Report (Personal)', MLR_LINE_W));
  lines.push('');
  lines.push(`Head Name : ${data.headName}  : CODE : ${data.headCode}`);
  lines.push(MLR_DASH);
  lines.push(`Member Number : ${data.memberNumber}`);
  lines.push(`Name : Mr/Ms ${data.memberName}`);
  lines.push(`From Date : ${dayjs(data.fromDate).format('DD-MMM-YYYY')}  To Date ${dayjs(data.toDate).format('DD-MMM-YYYY')}`);
  lines.push(`Opening Balance : ${balLabel(data.openingBalance)}`);
  const dateStr = `Date : ${now}`;
  const pageStr = 'Page Number :  1';
  lines.push(`${dateStr}${mlrPadL(pageStr, MLR_LINE_W - dateStr.length)}`);
  lines.push(MLR_DASH);

  const amtW = MLR_COL_AMT;
  lines.push(
    `${mlrPadR('Date', MLR_COL_DATE)}${mlrPadR('Particulars', MLR_COL_PART)}${mlrPadR('Voucher No', MLR_COL_VCHR)}` +
    `${mlrPadL('Debit', amtW)}${mlrPadL('Credit', amtW)}${mlrPadL('Balance', amtW)}`
  );
  lines.push(MLR_DASH);

  data.entries.forEach(e => {
    lines.push(
      `${mlrPadR(dayjs(e.transactionDate).format('DD-MMM-YYYY'), MLR_COL_DATE)}` +
      `${mlrPadR(e.narration, MLR_COL_PART)}${mlrPadR(e.voucherNo, MLR_COL_VCHR)}` +
      `${mlrPadL(e.debit > 0 ? fmt(e.debit) : '0.00', amtW)}` +
      `${mlrPadL(e.credit > 0 ? fmt(e.credit) : '0.00', amtW)}` +
      `${mlrPadL(balLabel(e.balance), amtW)}`
    );
  });

  lines.push(MLR_DASH);
  lines.push(
    `${mlrPadR('Total Amount', MLR_COL_DATE + MLR_COL_PART + MLR_COL_VCHR)}` +
    `${mlrPadL(fmt(data.totalDebits), amtW)}${mlrPadL(fmt(data.totalCredits), amtW)}${' '.repeat(amtW)}`
  );
  lines.push(MLR_DASH);
  lines.push('');
  lines.push('* Report as per data Available');
  lines.push('* Note   D-Demand   R-Reciept   P-Payment   J- Journal Transfer Entry');
  lines.push(MLR_DASH);

  return lines;
}

const MemberLedgerReport: React.FC = () => {
  const dispatch = useDispatch();
  const { interfaceMode, accentColor, cornerRadius } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [headCode, setHeadCode] = useState<string>('');
  const [memberNumber, setMemberNumber] = useState<string>('');
  const [memberName, setMemberName] = useState<string>('');
  const [fromDate, setFromDate] = useState<Dayjs | null>(dayjs('2019-11-01'));
  const [toDate, setToDate] = useState<Dayjs | null>(dayjs('2024-02-07'));

  const [headOptions, setHeadOptions] = useState<HeadOption[]>([]);
  const [data, setData] = useState<LedgerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingHeads, setLoadingHeads] = useState(false);
  const [validatingMember, setValidatingMember] = useState(false);
  const [showLookupModal, setShowLookupModal] = useState(false);

  useEffect(() => { loadHeads(); }, []);

  const loadHeads = async () => {
    setLoadingHeads(true);
    try {
      const res = await apiService.getHeadMasters();
      if (res.success && Array.isArray(res.data)) {
        setHeadOptions(res.data);
      }
    } catch { /* silent */ }
    finally { setLoadingHeads(false); }
  };

  const validateMember = useCallback(async (mbno: string) => {
    if (!mbno.trim()) { setMemberName(''); return; }
    setValidatingMember(true);
    try {
      const res = await apiService.validateMember(mbno.trim());
      if (res.success && res.data?.exists) {
        setMemberName(res.data.memberName || '');
      } else {
        setMemberName('');
      }
    } catch { setMemberName(''); }
    finally { setValidatingMember(false); }
  }, []);

  const handleMemberBlur = () => validateMember(memberNumber);
  const handleMemberKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') validateMember(memberNumber);
  };

  const handleMemberSelect = (member: { memberNo: string; memberName?: string; name?: string }) => {
    setMemberNumber(member.memberNo);
    setMemberName(member.memberName || member.name || '');
    setShowLookupModal(false);
  };

  const generateReport = async () => {
    if (!headCode || !memberNumber.trim() || !fromDate || !toDate) return;
    setLoading(true);
    try {
      const res = await apiService.getMemberLedgerReport({
        memberNumber: memberNumber.trim(),
        headCode,
        fromDate: fromDate.format('YYYY-MM-DD'),
        toDate: toDate.format('YYYY-MM-DD'),
      });
      if (res.success && res.data) {
        setData(res.data);
        if (res.data.memberName) setMemberName(res.data.memberName);
      } else {
        setData(null);
      }
    } catch { setData(null); }
    finally { setLoading(false); }
  };

  const handleReset = () => {
    setHeadCode(''); setMemberNumber(''); setMemberName('');
    setFromDate(dayjs('2019-11-01')); setToDate(dayjs('2024-02-07'));
    setData(null);
  };

  const handlePrint = () => {
    if (!data) return;
    // window.open() used to be used here, but this app's Electron main
    // process globally intercepts every window.open() call
    // (mainWindow.webContents.setWindowOpenHandler in main.ts) and denies
    // it, redirecting to shell.openExternal(url) instead — with the empty
    // URL this call passes, that meant Windows trying (and failing) to
    // open "about:blank" as an external link, confirmed live on the
    // identical pattern in Consolidation Of Daily A/c. Print silently did
    // nothing. Switched to the same hidden-iframe + monospace lines[]
    // technique already proven working for every other report's print
    // this session — it never goes through window.open() at all, and
    // matches the legacy report's exact printed layout (user-supplied
    // reference screenshot).
    const lines = buildMemberLedgerLines(data);
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><title>Member Ledger</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  body { margin: 0; }
  pre { font-family: 'Courier New', Courier, monospace; font-size: 8.5pt; white-space: pre; width: fit-content; margin: 0 auto; }
</style></head><body><pre>${lines.join('\n')}</pre></body></html>`);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 300);
    }
  };

  const handleExportCSV = () => {
    if (!data) return;
    let csv = 'Date,Particulars,Voucher No,Payment,Receipt,Balance\n';
    data.entries.forEach(e =>
      csv += `${dayjs(e.transactionDate).format('DD-MMM-YYYY')},"${e.narration}",${e.voucherNo},${e.debit > 0 ? e.debit : ''},${e.credit > 0 ? e.credit : ''},${balLabel(e.balance)}\n`
    );
    csv += `Total Amount:-,,, ${data.totalDebits},${data.totalCredits},\n`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = `MemberLedger_${memberNumber}_${headCode}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const toggleTheme = () => dispatch(setInterfaceMode(isDark ? 'light' : 'dark'));

  // Theme classes
  const bg = isDark ? 'bg-[#0f172a]' : 'bg-slate-50';
  const panel = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const panelHead = isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-cyan-600';
  const text = isDark ? 'text-slate-100' : 'text-slate-800';
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  const border = isDark ? 'border-slate-700' : 'border-slate-200';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-300 text-slate-800';

  return (
    <ConfigProvider theme={{
      algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      token: {
        colorPrimary: '#0891b2',
        borderRadius: cornerRadius,
        colorBgContainer: isDark ? '#1e293b' : '#ffffff',
        colorBorder: isDark ? '#334155' : '#e2e8f0',
      },
    }}>
      <div className={`mlr-page h-screen flex flex-col font-sans overflow-hidden ${text} ${bg}`}>

        {/* Header */}
        <div className={`mlr-header border-b px-3 py-1.5 flex items-center justify-between shrink-0 ${isDark ? 'bg-gradient-to-r from-slate-900 to-slate-900 border-white/5' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <div className="bg-cyan-600 p-1.5 rounded-lg text-white shadow-md">
              <BookOpen size={14} />
            </div>
            <div>
              <h1 className={`text-xs font-black tracking-tight leading-none ${text}`}>Member Ledger</h1>
              <div className={`flex items-center gap-1 mt-0.5 fz-tiny font-bold uppercase tracking-wider leading-none ${muted}`}>
                <ShieldCheck size={8} className="text-cyan-500" /> Ledger Report (Personal)
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button type="text" size="small" icon={isDark ? <Sun size={13} className="text-amber-400" /> : <Moon size={13} className="text-slate-400" />}
              onClick={toggleTheme} className="h-7 w-7 rounded-lg" />
            <Button icon={<RotateCcw size={11} />} size="small" onClick={handleReset}
              className="h-7 px-2 rounded-lg fz-small font-bold uppercase">Reset</Button>
            <Button icon={<Printer size={11} />} size="small" onClick={handlePrint}
              disabled={!data} className="h-7 px-2 rounded-lg fz-small font-bold uppercase">Print</Button>
            <Button type="primary" icon={<FileDown size={11} />} size="small" onClick={handleExportCSV}
              disabled={!data} className="h-7 px-2 rounded-lg fz-small font-bold uppercase">CSV</Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden p-2 flex gap-2">

          {/* Left sidebar */}
          <div className="w-[230px] flex flex-col gap-2 shrink-0 overflow-y-auto">

            {/* Member */}
            <div className={`mlr-card border rounded-lg overflow-hidden ${panel}`}>
              <div className={`px-2 py-1 flex items-center gap-1 ${isDark ? 'bg-cyan-800/50' : 'bg-cyan-600'}`}>
                <User size={10} className="text-white" />
                <h3 className="fz-small font-black text-white uppercase tracking-wide">Member</h3>
              </div>
              <div className="p-2 space-y-1.5">
                <div>
                  <label className={`fz-tiny font-bold uppercase tracking-tight block mb-0.5 ${muted}`}>Member No</label>
                  <Input.Group compact>
                    <Input
                      size="small"
                      value={memberNumber}
                      onChange={e => setMemberNumber(e.target.value)}
                      onBlur={handleMemberBlur}
                      onKeyDown={handleMemberKeyDown}
                      placeholder="e.g. 61002684"
                      suffix={validatingMember ? <Spin size="small" /> : null}
                      className="h-7 fz-small font-semibold"
                      style={{ width: 'calc(100% - 28px)' }}
                    />
                    <Button
                      size="small"
                      icon={<Search size={11} />}
                      onClick={() => setShowLookupModal(true)}
                      title="Browse members (like Member Master)"
                      className="h-7 w-7 flex items-center justify-center"
                    />
                  </Input.Group>
                </div>
                {memberName && (
                  <div className={`fz-small font-bold px-2 py-1 rounded ${isDark ? 'bg-cyan-900/40 text-cyan-300' : 'bg-cyan-50 text-cyan-700'}`}>
                    {memberName}
                  </div>
                )}
              </div>
            </div>

            {/* Head */}
            <div className={`mlr-card border rounded-lg overflow-hidden ${panel}`}>
              <div className={`px-2 py-1 flex items-center gap-1 ${isDark ? 'bg-cyan-800/50' : 'bg-cyan-600'}`}>
                <List size={10} className="text-white" />
                <h3 className="fz-small font-black text-white uppercase tracking-wide">Account Head</h3>
              </div>
              <div className="p-2">
                <Select
                  className="w-full"
                  size="small"
                  placeholder="Select Head"
                  value={headCode || undefined}
                  onChange={setHeadCode}
                  loading={loadingHeads}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={headOptions.map(h => ({ value: h.code, label: `${h.code} - ${h.headName}` }))}
                />
              </div>
            </div>

            {/* Dates */}
            <div className={`mlr-card border rounded-lg overflow-hidden ${panel}`}>
              <div className={`px-2 py-1 flex items-center gap-1 ${isDark ? 'bg-cyan-800/50' : 'bg-cyan-600'}`}>
                <Calendar size={10} className="text-white" />
                <h3 className="fz-small font-black text-white uppercase tracking-wide">Date Range</h3>
              </div>
              <div className="p-2 space-y-1.5">
                <div>
                  <label className={`fz-tiny font-bold uppercase tracking-tight block mb-0.5 ${muted}`}>From</label>
                  <DatePicker className="w-full h-7 fz-small font-semibold" value={fromDate}
                    onChange={v => setFromDate(v)} format="DD-MMM-YYYY" />
                </div>
                <div>
                  <label className={`fz-tiny font-bold uppercase tracking-tight block mb-0.5 ${muted}`}>To</label>
                  <DatePicker className="w-full h-7 fz-small font-semibold" value={toDate}
                    onChange={v => setToDate(v)} format="DD-MMM-YYYY" />
                </div>
                <Button type="primary" block size="small" icon={<Search size={11} />}
                  onClick={generateReport} loading={loading}
                  className="h-8 font-black uppercase tracking-wider fz-small mt-1">
                  Generate
                </Button>
              </div>
            </div>

            {/* Stats */}
            {data && (
              <div className="flex flex-col gap-1.5">
                {[
                  { label: 'Opening', value: balLabel(data.openingBalance), cls: text },
                  { label: 'Total Payment', value: fmt(data.totalDebits), cls: isDark ? 'text-rose-300' : 'text-rose-600' },
                  { label: 'Total Receipt', value: fmt(data.totalCredits), cls: isDark ? 'text-emerald-300' : 'text-emerald-600' },
                  { label: 'Closing', value: balLabel(data.closingBalance), cls: data.closingBalance >= 0 ? (isDark ? 'text-cyan-300' : 'text-cyan-700') : (isDark ? 'text-rose-300' : 'text-rose-600') },
                ].map(({ label, value, cls }) => (
                  <div key={label} className={`mlr-card border rounded-lg px-3 py-1.5 ${panel}`}>
                    <div className={`fz-tiny font-bold uppercase tracking-wide ${muted}`}>{label}</div>
                    <div className={`fz-caption font-black font-mono ${cls}`}>{value}</div>
                  </div>
                ))}
                <div className={`mlr-card border rounded-lg px-3 py-1.5 ${panel}`}>
                  <div className={`fz-tiny font-bold uppercase tracking-wide ${muted}`}>Entries</div>
                  <div className={`text-base font-black font-mono ${text}`}>{data.totalTransactions}</div>
                </div>
              </div>
            )}
          </div>

          {/* Report panel */}
          <div className={`mlr-panel flex-1 border rounded-lg flex flex-col overflow-hidden ${panel}`}>
            <div className={`border-b px-3 py-1.5 flex items-center justify-between shrink-0 ${isDark ? 'bg-cyan-900/40 border-slate-700' : 'bg-cyan-600'}`}>
              <span className="fz-caption font-black text-white uppercase tracking-wide">
                Ledger Report (Personal) — {fromDate?.format('DD-MMM-YYYY')} to {toDate?.format('DD-MMM-YYYY')}
              </span>
              {data && <span className="fz-small text-cyan-200 font-mono">{data.totalTransactions} entries</span>}
            </div>

            <div className={`mlr-preview-body flex-1 overflow-auto p-3 ${isDark ? 'bg-slate-900/40' : 'bg-white'}`}>
              <Spin spinning={loading} tip="Loading...">
                {data && data.entries.length > 0 ? (
                  <div id="ledger-print-area" className="font-mono">
                    {/* Company header */}
                    <div className={`text-center mb-3 pb-2 border-b ${border}`}>
                      <div className={`text-xs font-bold ${text}`}>Espat Karmchari Co-Operative Credit Society Limited.</div>
                      <div className={`fz-small ${muted}`}>Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006</div>
                      <div className={`fz-small font-bold mt-1 ${text}`}>Ledger Report (Personal)</div>
                    </div>

                    {/* Report meta */}
                    <div className={`mb-3 fz-small space-y-0.5 border-b pb-2 ${border} ${muted}`}>
                      <div>Head Name : <span className={`font-bold ${text}`}>{data.headName}</span> :CODE :{data.headCode}</div>
                      <div className="border-t border-dashed mt-1 pt-1 ${border}" />
                      <div>Member Number : <span className={`font-bold ${text}`}>{data.memberNumber}</span></div>
                      <div>Name : <span className={`font-bold ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>Mr/Ms {data.memberName}</span></div>
                      <div>Report From Date <span className={`font-bold ${text}`}>{dayjs(data.fromDate).format('DD-MMM-YYYY')}</span> To Date <span className={`font-bold ${text}`}>{dayjs(data.toDate).format('DD-MMM-YYYY')}</span></div>
                      <div>Opening Balance : <span className={`font-bold ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>{fmt(data.openingBalance)}  CR</span></div>
                    </div>

                    {/* Table */}
                    <table className="w-full fz-small" style={{ borderCollapse: 'collapse' }}>
                      <thead>
                        <tr className={`border-b-2 ${isDark ? 'border-slate-500' : 'border-slate-400'}`}>
                          {['Date', 'Particulars', 'Voucher No', 'Payment', 'Receipt', 'Balance'].map(h => (
                            <th key={h} className={`py-1 px-2 text-left font-black fz-small uppercase ${text}
                              ${['Payment', 'Receipt', 'Balance'].includes(h) ? 'text-right' : ''}`}>
                              {h}
                            </th>
                          ))}
                        </tr>
                        <tr className={`border-b ${border}`}><td colSpan={6} /></tr>
                      </thead>
                      <tbody>
                        {data.entries.map((e, i) => (
                          <tr key={i} className={`border-b ${isDark ? 'border-slate-700/50' : 'border-dashed border-slate-200'}
                            ${isDark ? (i % 2 === 0 ? 'bg-slate-800/60' : 'bg-slate-800/30') : (i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50')}
                            hover:${isDark ? 'bg-slate-700/30' : 'bg-cyan-50/30'} transition-colors`}>
                            <td className={`py-0.5 px-2 font-semibold ${muted}`} style={{ width: '90px' }}>
                              {dayjs(e.transactionDate).format('DD-MMM-YYYY')}
                            </td>
                            <td className={`py-0.5 px-2 ${text}`}>{e.narration}</td>
                            <td className={`py-0.5 px-2 font-semibold ${isDark ? 'text-amber-300' : 'text-slate-600'}`} style={{ width: '80px' }}>
                              {e.voucherNo}
                            </td>
                            <td className={`py-0.5 px-2 text-right font-semibold ${isDark ? 'text-rose-300' : 'text-rose-600'}`} style={{ width: '90px' }}>
                              {e.debit > 0 ? fmt(e.debit) : ''}
                            </td>
                            <td className={`py-0.5 px-2 text-right font-semibold ${isDark ? 'text-emerald-300' : 'text-emerald-600'}`} style={{ width: '90px' }}>
                              {e.credit > 0 ? fmt(e.credit) : ''}
                            </td>
                            <td className={`py-0.5 px-2 text-right font-bold ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`} style={{ width: '110px' }}>
                              {balLabel(e.balance)}
                            </td>
                          </tr>
                        ))}

                        {/* Separator */}
                        <tr><td colSpan={6} className={`border-b-2 ${isDark ? 'border-slate-500' : 'border-slate-400'}`} /></tr>

                        {/* Total Amount */}
                        <tr className={isDark ? 'bg-slate-900/60' : 'bg-slate-50'}>
                          <td colSpan={3} className={`py-1 px-2 font-black fz-small ${text}`}>Total Amount :-</td>
                          <td className={`py-1 px-2 text-right font-black fz-small ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>{fmt(data.totalDebits)}</td>
                          <td className={`py-1 px-2 text-right font-black fz-small ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>{fmt(data.totalCredits)}</td>
                          <td />
                        </tr>

                        <tr><td colSpan={6} className={`border-b-2 ${isDark ? 'border-slate-500' : 'border-slate-400'}`} /></tr>
                      </tbody>
                    </table>

                    {/* Footer notes */}
                    <div className={`mt-3 fz-tiny space-y-0.5 ${muted}`}>
                      <div>* Report As Per Data Available ..</div>
                      <div>* Note&nbsp;&nbsp; D-Demand&nbsp;&nbsp; R-Receipt&nbsp;&nbsp; P-Payment&nbsp;&nbsp; J-Jouneral Transfer Entry</div>
                    </div>
                  </div>
                ) : !loading ? (
                  <div className="flex flex-col items-center justify-center h-64 gap-3">
                    <BookOpen size={48} className={isDark ? 'text-slate-700' : 'text-slate-300'} />
                    <p className={`text-sm font-bold uppercase tracking-wide ${muted}`}>
                      {!headCode || !memberNumber ? 'Select member, head code and date range' : 'No transactions found'}
                    </p>
                    {memberName && <p className={`text-xs font-semibold ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>{memberName}</p>}
                  </div>
                ) : null}
              </Spin>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`mlr-footer border-t px-3 py-1.5 flex items-center justify-between shrink-0 ${panel}`}>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />
            <span className={`fz-tiny font-bold uppercase tracking-wide ${muted}`}>Member Ledger · Personal Account</span>
          </div>
          <span className={`fz-tiny font-bold px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
            {isDark ? '◐ DARK' : '◑ LIGHT'}
          </span>
        </div>
      </div>
      {/* Member Lookup Modal — same as Member Master */}
      <Modal
        open={showLookupModal}
        onCancel={() => setShowLookupModal(false)}
        footer={null}
        width={800}
        styles={{ body: { padding: 0 } }}
        closable={false}
        destroyOnClose
        title={null}
      >
        <MemberLookup
          isModal={true}
          onSelect={handleMemberSelect}
          onClose={() => setShowLookupModal(false)}
        />
      </Modal>

      <style>{`
        /* ── Member Ledger Report — dark mode ── */
        html.dark .mlr-page { background-color: #000000 !important; }
        html.dark .mlr-header,
        html.dark .mlr-footer { background-color: #0c0c0e !important; background-image: none !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .mlr-card,
        html.dark .mlr-panel { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .mlr-preview-body { background-color: #1c1c1e !important; }
        html.dark .mlr-page .ant-picker,
        html.dark .mlr-page .ant-select-selector,
        html.dark .mlr-page .ant-input { background-color: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .mlr-page .ant-picker input,
        html.dark .mlr-page .ant-select-selection-item,
        html.dark .mlr-page .ant-input { color: #f5f5f7 !important; }
        html.dark .mlr-page .ant-btn:not(.ant-btn-primary) { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
        html.dark .ant-modal-content,
        html.dark .ant-modal-header { background-color: #1c1c1e !important; }
      `}</style>
    </ConfigProvider>
  );
};

export default MemberLedgerReport;
