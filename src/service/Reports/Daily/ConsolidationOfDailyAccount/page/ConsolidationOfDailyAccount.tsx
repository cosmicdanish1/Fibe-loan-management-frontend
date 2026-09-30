import React, { useState, useEffect } from 'react';
import { Settings, RefreshCw, Printer, FileDown, Search, Layers, ShieldCheck } from 'lucide-react';
import { ConfigProvider, Button, DatePicker, Spin, Tooltip, theme as antdTheme } from 'antd';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';
import { apiService } from '../../../../../services/api';
import { CrDrIndicator } from '../../../../../components/shared/CrDrIndicator';
import dayjs from 'dayjs';

interface SubEntry {
  mbNo: string;
  memberName: string;
  amount: number;
}

interface HeadGroup {
  headCode: string;
  headName: string;
  total: number;
  subEntries: SubEntry[];
}

interface ConsolidationData {
  date: string;
  openingBalance: number | null;
  totalReceipts: number;
  totalPayments: number;
  totalCash: number | null;
  closingBalance: number | null;
  netBalance: number;
  receiptGroups: HeadGroup[];
  paymentGroups: HeadGroup[];
  totalHeads: number;
}

const asAmount = (value: unknown): number => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const normalizeGroups = (value: unknown): HeadGroup[] => {
  if (!Array.isArray(value)) return [];
  return value.map((group: any) => {
    const subEntries = Array.isArray(group?.subEntries) ? group.subEntries.map((entry: any) => ({
      mbNo: String(entry?.mbNo ?? entry?.mbno ?? ''),
      memberName: String(entry?.memberName ?? 'Unknown'),
      amount: asAmount(entry?.amount),
    })) : [];
    return {
      headCode: String(group?.headCode ?? group?.head_code ?? ''),
      headName: String(group?.headName ?? group?.head_name ?? 'Unknown'),
      subEntries,
      total: group?.total == null
        ? subEntries.reduce((sum, entry) => sum + entry.amount, 0)
        : asAmount(group.total),
    };
  });
};

/** Accept both the current flat API response and the older grouped UI shape. */
function normalizeConsolidationData(payload: any, selectedDate: string): ConsolidationData {
  const source = payload?.data?.data ?? payload?.data ?? payload ?? {};
  let receiptGroups = normalizeGroups(source.receiptGroups);
  let paymentGroups = normalizeGroups(source.paymentGroups);
  const entries = Array.isArray(source.entries) ? source.entries : [];

  if (!receiptGroups.length && !paymentGroups.length && entries.length) {
    receiptGroups = entries
      .filter((entry: any) => asAmount(entry?.receipts) > 0)
      .map((entry: any) => ({
        headCode: String(entry?.headCode ?? entry?.head_code ?? ''),
        headName: String(entry?.headName ?? entry?.head_name ?? 'Unknown'),
        total: asAmount(entry?.receipts),
        subEntries: [],
      }));
    paymentGroups = entries
      .filter((entry: any) => asAmount(entry?.payments) > 0)
      .map((entry: any) => ({
        headCode: String(entry?.headCode ?? entry?.head_code ?? ''),
        headName: String(entry?.headName ?? entry?.head_name ?? 'Unknown'),
        total: asAmount(entry?.payments),
        subEntries: [],
      }));
  }

  const totalReceiptsFromGroups = receiptGroups.reduce((sum, group) => sum + group.total, 0);
  const totalPaymentsFromGroups = paymentGroups.reduce((sum, group) => sum + group.total, 0);
  const totalReceipts = source.totalReceipts == null ? totalReceiptsFromGroups : asAmount(source.totalReceipts);
  const totalPayments = source.totalPayments == null ? totalPaymentsFromGroups : asAmount(source.totalPayments);

  return {
    date: String(source.date ?? selectedDate),
    openingBalance: source.openingBalance == null ? null : asAmount(source.openingBalance),
    totalReceipts,
    totalPayments,
    totalCash: source.totalCash == null ? null : asAmount(source.totalCash),
    closingBalance: source.closingBalance == null ? null : asAmount(source.closingBalance),
    netBalance: source.netBalance == null ? totalReceipts - totalPayments : asAmount(source.netBalance),
    receiptGroups,
    paymentGroups,
    totalHeads: source.totalHeads == null ? entries.length : asAmount(source.totalHeads),
  };
}

const csvCell = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);

  let text = String(value ?? '');
  // Keep exported text safe to open in spreadsheet applications.
  if (/^[\t\r ]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

const fmt = (n: number) =>
  Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtSigned = (n: number) => (n < 0 ? '-' : '') + fmt(n);
const fmtOptional = (value: number | null) => value == null ? 'Not provided' : fmtSigned(value);

// Print-only layout matching the legacy report exactly (letterhead, Date/Page
// Number line, Code/Name/Amount columns, RECEIPT/PAYMENT sections with
// per-head sub-entries and subtotals, summary block) — same lines[]-as-
// single-source-of-truth pattern already proven for Day-Book/Day-Book [SB].
// On-screen view is untouched; this feeds handlePrint only.
const CON_LINE_W = 94;
const CON_DASH = '-'.repeat(CON_LINE_W);
const CON_COL_CODE = 12;
const CON_COL_NAME = 62;
const CON_COL_AMT = CON_LINE_W - CON_COL_CODE - CON_COL_NAME;

const padL = (s: string, w: number) => s.padStart(w);
const padR = (s: string, w: number) => (s.length > w ? s.slice(0, w) : s.padEnd(w));
const centerIn = (s: string, w: number) => ' '.repeat(Math.max(0, Math.floor((w - s.length) / 2))) + s;

function buildConsolidationLines(data: ConsolidationData, dateLabel: string): string[] {
  const lines: string[] = [];
  const now = dayjs().format('DD-MMM-YYYY/h:mmA');

  lines.push(centerIn('Espat Karmchari Co-Operative Credit Society Limited.', CON_LINE_W));
  lines.push(centerIn('Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006', CON_LINE_W));
  lines.push(centerIn(`Consolidation Of Daily Accounts : ${dateLabel}`, CON_LINE_W));
  lines.push(CON_DASH);
  const dateStr = `Date : ${now}`;
  const pageStr = 'Page Number :   1';
  lines.push(`${dateStr}${padL(pageStr, CON_LINE_W - dateStr.length)}`);
  lines.push(CON_DASH);
  lines.push(`${padR('Code', CON_COL_CODE)}${padR('Name', CON_COL_NAME)}${padL('Amount', CON_COL_AMT)}`);
  lines.push(CON_DASH);

  const section = (title: string, groups: HeadGroup[]) => {
    lines.push(title);
    lines.push(CON_DASH);
    groups.forEach(g => {
      if (g.subEntries.length === 0) {
        lines.push(`${padR(g.headCode, CON_COL_CODE)}${padR(g.headName, CON_COL_NAME)}${padL(fmt(g.total), CON_COL_AMT)}`);
      } else {
        lines.push(`${padR(g.headCode, CON_COL_CODE)}${g.headName}`);
        g.subEntries.forEach(e => {
          lines.push(`${padR(e.mbNo, CON_COL_CODE)}${padR(e.memberName, CON_COL_NAME)}${padL(fmt(e.amount), CON_COL_AMT)}`);
        });
        lines.push(`${' '.repeat(CON_COL_CODE + CON_COL_NAME)}${padL(fmt(g.total), CON_COL_AMT)}`);
      }
      lines.push(CON_DASH);
    });
    lines.push('');
  };

  section('RECEIPT', data.receiptGroups);
  section('PAYMENT', data.paymentGroups);

  const IND = ' '.repeat(28);
  const LBL_W = 20;
  const VAL_W = 18;
  ([
    ['Opening Balance', fmtOptional(data.openingBalance)],
    ['Total Reciept', fmt(data.totalReceipts)],
    ['Total Cash', fmtOptional(data.totalCash)],
    ['Total Payment', fmt(data.totalPayments)],
    ['Closing Balance', fmtOptional(data.closingBalance)],
  ] as [string, string][]).forEach(([label, value]) => {
    lines.push(`${IND}${label.padEnd(LBL_W)}:${padL(value, VAL_W)}`);
  });
  lines.push('');
  lines.push('* Report As Per Data Available ..');

  return lines;
}

const ConsolidationOfDailyAccount: React.FC = () => {
  const { interfaceMode, accentColor, cornerRadius } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark';

  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs().subtract(1, 'day'));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ConsolidationData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => { loadData(); }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await apiService.getConsolidationReport(selectedDate.format('YYYY-MM-DD'), 'screen');
      if (response.success && response.data) {
        setData(normalizeConsolidationData(response.data, selectedDate.format('YYYY-MM-DD')));
      } else {
        setData(null);
        setLoadError(response.message || response.error || 'The report could not be loaded. Please try again.');
      }
    } catch (error) {
      setData(null);
      setLoadError(error instanceof Error ? error.message : 'The report could not be loaded. Please try again.');
    }
    finally { setLoading(false); }
  };

  const handlePrint = () => {
    if (!data) return;
    // window.open() used to be used here, but this app's Electron main
    // process globally intercepts every window.open() call
    // (mainWindow.webContents.setWindowOpenHandler in main.ts) and denies
    // it, redirecting to shell.openExternal(url) instead — with the empty
    // URL this call passes, that meant Windows trying (and failing) to
    // open "about:blank" as an external link ("Get an app to open this
    // 'about' link"), confirmed live. Print silently did nothing. Switched
    // to the same hidden-iframe + monospace lines[] technique already
    // proven working for every other report's print this session — it
    // never goes through window.open() at all, and matches the legacy
    // report's exact printed layout (user-supplied reference screenshot).
    const lines = buildConsolidationLines(data, selectedDate.format('DD-MMM-YYYY'));
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><title>Consolidation</title>
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
    const rows: unknown[][] = [[
      'Report',
      'Report Date',
      'Entry Type',
      'Account Head Code',
      'Account Head Name',
      'Amount',
      'Total Receipts',
      'Total Payments',
      'Net Movement',
      'Account Head Count',
    ]];
    const appendGroups = (entryType: 'Receipt' | 'Payment', groups: HeadGroup[]) => {
      groups.forEach(group => rows.push([
        'Consolidation Of Daily A/c',
        data.date,
        entryType,
        group.headCode,
        group.headName,
        group.total,
        data.totalReceipts,
        data.totalPayments,
        data.netBalance,
        data.totalHeads,
      ]));
    };
    appendGroups('Receipt', data.receiptGroups);
    appendGroups('Payment', data.paymentGroups);
    const csv = `\uFEFF${rows.map(row => row.map(csvCell).join(',')).join('\r\n')}`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = `Consolidation_${selectedDate.format('YYYY-MM-DD')}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const hasData = !!data && (data.receiptGroups.length > 0 || data.paymentGroups.length > 0);

  // Tailwind classes driven by isDark — adapts to theme toggle
  const bg = isDark ? 'bg-[#0f172a]' : 'bg-slate-50';
  const panel = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const panelHead = isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-100';
  const text = isDark ? 'text-slate-100' : 'text-slate-800';
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  const border = isDark ? 'border-slate-700' : 'border-slate-200';
  const rowAlt = isDark ? 'bg-slate-800/60' : 'bg-white';
  const rowAlt2 = isDark ? 'bg-slate-800/30' : 'bg-slate-50/60';
  const rowHover = isDark ? 'hover:bg-slate-700/30' : 'hover:bg-violet-50/30';
  const headRowBg = isDark ? 'bg-slate-700/60' : 'bg-slate-100';
  const sectionBanner = isDark
    ? 'bg-violet-900/30 border-violet-700/40 text-violet-300'
    : 'bg-rose-50 border-rose-200 text-rose-700';
  const totalRowBg = isDark ? 'bg-slate-900/60' : 'bg-slate-50';

  const Section = ({ groups, label }: { groups: HeadGroup[]; label: 'RECEIPT' | 'PAYMENT' }) => (
    <tbody>
      <tr>
        <td colSpan={3} className={`px-3 py-1.5 text-xs font-black uppercase tracking-widest border-b ${border} ${sectionBanner}`}>
          ▶ {label}
        </td>
      </tr>
      {groups.map(g => (
        <React.Fragment key={g.headCode}>
          {g.subEntries.length === 0 ? (
            <tr className={`border-b ${border} ${rowHover} ${rowAlt}`}>
              <td className={`px-3 py-2 font-bold text-xs font-mono ${isDark ? 'text-indigo-300' : 'text-slate-700'}`}>{g.headCode}</td>
              <td className={`px-3 py-2 text-xs ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{g.headName}</td>
              <td className={`px-3 py-2 text-right text-xs font-semibold font-mono
                ${label === 'RECEIPT'
                  ? (isDark ? 'text-emerald-300' : 'text-emerald-600')
                  : (isDark ? 'text-rose-300' : 'text-rose-600')}`}>
                {g.total > 0 && <CrDrIndicator type={label === 'RECEIPT' ? 'credit' : 'debit'} className="mr-1" />}{fmt(g.total)}
              </td>
            </tr>
          ) : (
            <>
              <tr className={`border-b ${border} ${headRowBg}`}>
                <td className={`px-3 py-1 font-black text-xs font-mono ${isDark ? 'text-indigo-300' : 'text-slate-700'}`}>{g.headCode}</td>
                <td className={`px-3 py-1 font-bold text-xs uppercase ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{g.headName}</td>
                <td />
              </tr>
              {g.subEntries.map((e, i) => (
                <tr key={i} className={`border-b ${border} ${rowHover} ${i % 2 === 0 ? rowAlt : rowAlt2} transition-colors`}>
                  <td className={`px-3 py-0.5 text-right fz-caption font-mono ${muted}`}>{e.mbNo}</td>
                  <td className={`px-3 py-0.5 fz-caption ${isDark ? 'text-violet-300' : 'text-violet-600'} font-semibold`}>{e.memberName}</td>
                  <td className={`px-3 py-0.5 text-right fz-caption font-semibold font-mono
                    ${label === 'RECEIPT'
                      ? (isDark ? 'text-emerald-300' : 'text-emerald-600')
                      : (isDark ? 'text-rose-300' : 'text-rose-600')}`}>
                    {e.amount > 0 && <CrDrIndicator type={label === 'RECEIPT' ? 'credit' : 'debit'} className="mr-1" />}{fmt(e.amount)}
                  </td>
                </tr>
              ))}
              <tr className={`border-b-2 ${isDark ? 'border-slate-500' : 'border-slate-300'} ${totalRowBg}`}>
                <td colSpan={2} className={`px-3 py-1 ${muted}`} />
                <td className={`px-3 py-1 text-right fz-caption font-black font-mono border-t ${isDark ? 'border-slate-500 text-slate-200' : 'border-slate-300 text-slate-700'}`}>
                  {g.total > 0 && <CrDrIndicator type={label === 'RECEIPT' ? 'credit' : 'debit'} className="mr-1" />}{fmt(g.total)}
                </td>
              </tr>
            </>
          )}
        </React.Fragment>
      ))}
    </tbody>
  );

  return (
    <ConfigProvider theme={{
      algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      token: {
        colorPrimary: accentColor,
        borderRadius: cornerRadius,
        colorBgContainer: isDark ? '#1e293b' : '#ffffff',
        colorBorder: isDark ? '#334155' : '#e2e8f0',
      },
    }}>
      <div className={`cda-page h-screen flex flex-col font-sans overflow-hidden ${text} ${bg}`}>

        {/* Header */}
        <div className={`cda-header border-b px-4 py-2.5 flex items-center justify-between shrink-0 ${isDark ? 'bg-gradient-to-r from-slate-900 to-slate-900 border-white/5' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className="bg-violet-600 p-2 rounded-lg shadow-lg shadow-violet-500/30">
              <Layers size={18} className="text-white" />
            </div>
            <div>
              <h1 className={`text-sm font-extrabold tracking-tight leading-none ${text}`}>Consolidation Of Daily A/c</h1>
              <div className={`flex items-center gap-1.5 mt-0.5 fz-small font-semibold uppercase tracking-wide ${muted}`}>
                <ShieldCheck size={10} className="text-violet-400" /> Account Head Summary
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button icon={<Printer size={13} />} size="small"
              className="h-8 px-3 rounded-lg text-xs font-bold uppercase tracking-wide"
              onClick={handlePrint} disabled={!hasData}>Print</Button>
            <Button type="primary" icon={<FileDown size={13} />} size="small"
              className="h-8 px-4 rounded-lg text-xs font-bold uppercase tracking-wide"
              onClick={handleExportCSV} disabled={!hasData}>CSV</Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden p-3 flex gap-3">

          {/* Left panel */}
          <div className="w-[240px] flex flex-col gap-3 shrink-0">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className={`cda-panel border rounded-xl overflow-hidden ${panel}`}>
              <div className={`cda-panel-header border-b px-3 py-2 flex items-center justify-between ${panelHead}`}>
                <h3 className={`fz-caption font-extrabold tracking-wide uppercase flex items-center gap-1.5 ${muted}`}>
                  <Settings size={11} className="text-violet-400" /> Parameters
                </h3>
                <Tooltip title="Reload">
                  <Button type="text" size="small" icon={<RefreshCw size={11} />} onClick={loadData} className="h-6 w-6" />
                </Tooltip>
              </div>
              <div className="p-3 space-y-3">
                <div className="space-y-1">
                  <label className={`fz-small font-bold uppercase tracking-tight ${muted}`}>Date</label>
                  <DatePicker className="w-full h-8 text-xs font-semibold" value={selectedDate}
                    onChange={v => v && setSelectedDate(v)} format="DD-MMM-YYYY" />
                </div>
                <Button type="primary" block size="small" icon={<Search size={13} />}
                  onClick={loadData} loading={loading}
                  className="h-9 font-bold uppercase tracking-wide text-xs">
                  Load Report
                </Button>
              </div>
            </motion.div>

          </div>

          {/* Report panel */}
          <div className={`cda-panel flex-1 border rounded-xl flex flex-col overflow-hidden ${panel}`}>
            <div className={`cda-panel-header border-b px-4 py-2 flex items-center justify-between shrink-0 ${panelHead}`}>
              <span className={`text-xs font-extrabold uppercase tracking-wide ${text}`}>
                Consolidation — {selectedDate.format('DD-MMM-YYYY')}
              </span>
            </div>

            <div className={`cda-preview-body flex-1 overflow-auto p-4 ${isDark ? 'bg-slate-900/40' : 'bg-white'}`}>
              <Spin spinning={loading} tip="Loading...">
                {loadError ? (
                  <div role="alert" className="flex h-64 flex-col items-center justify-center gap-3 text-center">
                    <p className="text-sm font-bold text-red-600">Unable to load the consolidation report</p>
                    <p className={`max-w-xl text-xs ${muted}`}>{loadError}</p>
                    <Button type="primary" size="small" onClick={loadData}>Try Again</Button>
                  </div>
                ) : hasData ? (
                  <div id="consol-print-area">
                    {/* Company header */}
                    <div className={`text-center mb-4 pb-3 border-b border-dashed ${border}`}>
                      <div className={`text-sm font-bold ${text}`}>Espat Karmchari Co-Operative Credit Society Limited.</div>
                      <div className={`fz-caption ${muted}`}>Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006</div>
                      <div className={`fz-small mt-0.5 ${muted}`}>Consolidation Of Daily Accounts for Date : {selectedDate.format('DD-MMM-YYYY')}</div>
                    </div>

                    <dl className={`mb-3 grid grid-cols-2 xl:grid-cols-4 divide-x border rounded-lg ${border} ${panelHead}`} aria-label="Report totals">
                      <div className="px-3 py-2">
                        <dt className={`fz-small font-bold uppercase ${muted}`}>Receipts</dt>
                        <dd className={`mt-1 text-sm font-bold font-mono ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>{fmt(data.totalReceipts)}</dd>
                      </div>
                      <div className="px-3 py-2">
                        <dt className={`fz-small font-bold uppercase ${muted}`}>Payments</dt>
                        <dd className={`mt-1 text-sm font-bold font-mono ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>{fmt(data.totalPayments)}</dd>
                      </div>
                      <div className="px-3 py-2">
                        <dt className={`fz-small font-bold uppercase ${muted}`}>Net movement</dt>
                        <dd className={`mt-1 text-sm font-bold font-mono ${text}`}>{fmtSigned(data.netBalance)}</dd>
                      </div>
                      <div className="px-3 py-2">
                        <dt className={`fz-small font-bold uppercase ${muted}`}>Account heads</dt>
                        <dd className={`mt-1 text-sm font-bold font-mono ${text}`}>{data.totalHeads}</dd>
                      </div>
                    </dl>

                    {/* Account-head totals */}
                    <table className={`w-full fz-caption font-mono border-collapse border ${border} mb-0`}>
                      <thead>
                        <tr className={headRowBg}>
                          <th className={`px-3 py-1.5 text-left font-black border-b ${border} w-24 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Code</th>
                          <th className={`px-3 py-1.5 text-left font-black border-b ${border} ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Name</th>
                          <th className={`px-3 py-1.5 text-right font-black border-b ${border} w-32 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Amount</th>
                        </tr>
                      </thead>

                      {data.receiptGroups.length > 0 && (
                        <Section groups={data.receiptGroups} label="RECEIPT" />
                      )}
                      {data.paymentGroups.length > 0 && (
                        <Section groups={data.paymentGroups} label="PAYMENT" />
                      )}

                    </table>

                    <div className={`mt-3 fz-small ${muted}`}>Amounts are consolidated by account head for the selected date.</div>
                  </div>
                ) : !loading ? (
                  <div className="flex flex-col items-center justify-center h-64 gap-3">
                    <Layers size={48} className={isDark ? 'text-slate-700' : 'text-slate-300'} />
                    <p className={`text-sm font-bold uppercase tracking-wide ${muted}`}>
                      No transactions on {selectedDate.format('DD-MMM-YYYY')}
                    </p>
                  </div>
                ) : null}
              </Spin>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`cda-footer border-t px-4 py-1.5 flex items-center justify-between shrink-0 ${panel}`}>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-pulse" />
            <span className={`fz-small font-bold uppercase tracking-wide ${muted}`}>Consolidation · Daily A/c Summary</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`fz-small font-mono ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{selectedDate.format('YYYYMMDD')}</span>
            <span className={`fz-small font-bold px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
              {isDark ? '◐ DARK' : '◑ LIGHT'}
            </span>
          </div>
        </div>
      </div>

      <style>{`
        /* ── Consolidation Of Daily A/c — dark mode ── */
        html.dark .cda-page { background-color: #000000 !important; }
        html.dark .cda-header,
        html.dark .cda-footer { background-color: #0c0c0e !important; background-image: none !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .cda-panel { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .cda-panel-header { background-color: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .cda-preview-body { background-color: #1c1c1e !important; }
        html.dark .cda-page .ant-picker { background-color: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .cda-page .ant-picker input { color: #f5f5f7 !important; }
      `}</style>
    </ConfigProvider>
  );
};

export default ConsolidationOfDailyAccount;
