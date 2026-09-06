import React, { useState, useEffect } from 'react';
import { Settings, RefreshCw, Printer, FileDown, Search, BookOpen, ShieldCheck } from 'lucide-react';
import { ConfigProvider, Button, DatePicker, Spin, Tooltip, theme as antdTheme } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';
import { apiService } from '../../../../../services/api';
import dayjs from 'dayjs';

interface DayBookEntry {
  mbNo: string;
  memberName: string;
  voucherNo: string;
  amount: number;
  username: string;
}

interface HeadGroup {
  headCode: string;
  headName: string;
  entries: DayBookEntry[];
  total: number;
}

interface DayBookData {
  date: string;
  openingBalance: number;
  totalReceipts: number;
  totalPayments: number;
  closingBalance: number;
  paymentGroups: HeadGroup[];
  receiptGroups: HeadGroup[];
  totalTransactions: number;
}

const fmt = (n: number) =>
  Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtSigned = (n: number) => (n < 0 ? '-' : '') + fmt(n);

// Matches the legacy report's printed layout exactly (letterhead, Reg No/Phone
// line, Day Book title, Date/Page Number line, Mem No/Name/Voucher/Amount/User
// columns, per-head group blocks with dashed rules) — same lines[]-as-single-
// source-of-truth pattern already proven for Cash-Book (Receiptwise Rough).
const LINE_W = 92;
const DASH_LINE = '-'.repeat(LINE_W);

const padL = (s: string, w: number) => s.padStart(w);
const padR = (s: string, w: number) => (s.length > w ? s.slice(0, w) : s.padEnd(w));
const center = (s: string) => ' '.repeat(Math.max(0, Math.floor((LINE_W - s.length) / 2))) + s;

const COL_MB = 13;
const COL_NAME = 26;
const COL_VCHR = 12;
const COL_AMT = 16;
const COL_USER = LINE_W - COL_MB - COL_NAME - COL_VCHR - COL_AMT - 2;

function buildLines(data: DayBookData, dateLabel: string): string[] {
  const lines: string[] = [];
  const now = dayjs().format('DD-MMM-YYYY/h:mmA');

  lines.push(center('Espat Karmchari Co-Operative Credit Society Limited.'));
  lines.push(center('Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006'));
  lines.push('');
  const regStr = 'Reg No : A.R/DRG/1796';
  const phoneStr = 'Phone: 0788-2298736';
  lines.push(`${regStr}${padL(phoneStr, LINE_W - regStr.length)}`);
  lines.push(`Day Book For Date : ${dateLabel}`);
  lines.push(DASH_LINE);
  const dateStr = `Date : ${now}`;
  const pageStr = 'Page Number : 1';
  lines.push(`${dateStr}${padL(pageStr, LINE_W - dateStr.length)}`);
  lines.push(DASH_LINE);
  lines.push(`${padR('Mem No.', COL_MB)}${padR('Name', COL_NAME)}${padR('Voucher', COL_VCHR)}${padL('Amount', COL_AMT)}  ${padR('User', COL_USER)}`);
  lines.push(DASH_LINE);

  const section = (title: string, groups: HeadGroup[]) => {
    if (!groups.length) return;
    lines.push(title);
    lines.push(DASH_LINE);
    groups.forEach(g => {
      lines.push(`${padR(g.headCode, COL_MB)}${g.headName}`);
      g.entries.forEach(e => {
        lines.push(
          `${padR(e.mbNo, COL_MB)}${padR(e.memberName, COL_NAME)}${padR(e.voucherNo, COL_VCHR)}` +
          `${padL('₹ ' + fmt(e.amount), COL_AMT)}  ${padR(e.username, COL_USER)}`
        );
      });
      const indent = ' '.repeat(COL_MB);
      lines.push(`${indent}${'-'.repeat(LINE_W - COL_MB)}`);
      lines.push(`${indent}${padL('₹ ' + fmt(g.total), COL_NAME + COL_VCHR + COL_AMT - COL_MB)}`);
      lines.push(`${indent}${'-'.repeat(LINE_W - COL_MB)}`);
      lines.push('');
    });
  };

  section('Payment', data.paymentGroups);
  section('Receipt', data.receiptGroups);

  const IND = '        ';
  const LBL_W = 18;
  const VAL_W = 20;
  lines.push(`${IND}${'Opening Balance :'.padEnd(LBL_W)} ${padL(fmtSigned(data.openingBalance), VAL_W)}`);
  lines.push(`${IND}${'Total Receipt   :'.padEnd(LBL_W)} ${padL(fmt(data.totalReceipts), VAL_W)}`);
  lines.push(`${IND}${'Total           :'.padEnd(LBL_W)} ${padL(fmtSigned(data.openingBalance + data.totalReceipts), VAL_W)}`);
  lines.push(`${IND}${'Total Payment   :'.padEnd(LBL_W)} ${padL(fmt(data.totalPayments), VAL_W)}`);
  lines.push(`${IND}${'-'.repeat(LBL_W + VAL_W + 1)}`);
  lines.push(`${IND}${'Closing Balance :'.padEnd(LBL_W)} ${padL(fmtSigned(data.closingBalance), VAL_W)}`);
  lines.push(`${IND}${'-'.repeat(LBL_W + VAL_W + 1)}`);
  lines.push('');
  lines.push('* Report As Per Data Available ..');

  return lines;
}

const DayBook: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs().subtract(1, 'day'));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DayBookData | null>(null);

  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Theme variables
  const bg        = isDark ? 'bg-[#0f172a]'                                  : 'bg-slate-50';
  const header    = isDark ? 'bg-gradient-to-r from-slate-900 to-slate-900 border-b border-white/5' : 'bg-white/80 backdrop-blur-sm border-b border-slate-200';
  const panel     = isDark ? 'bg-slate-800 border border-slate-700'           : 'bg-white border border-slate-200';
  const panelHd   = isDark ? 'bg-slate-900/50 border-b border-slate-700'      : 'bg-slate-50 border-b border-slate-100';
  const panelHdTx = isDark ? 'text-slate-300'                                 : 'text-slate-700';
  const text      = isDark ? 'text-slate-100'                                 : 'text-slate-800';
  const muted     = isDark ? 'text-slate-400'                                 : 'text-slate-500';
  const subtle    = isDark ? 'text-slate-500'                                 : 'text-slate-400';
  const contentBg = isDark ? 'bg-slate-900/40'                                : 'bg-white';
  const ftrBg     = isDark ? 'bg-slate-800 border-t border-slate-700'         : 'bg-white/80 border-t border-slate-200';

  // Monospace line colors
  const lineDefault = isDark ? 'text-slate-300'               : 'text-slate-700';
  const lineDash     = isDark ? 'text-slate-600'               : 'text-slate-300';
  const lineCompany  = isDark ? 'text-slate-400'               : 'text-slate-500';
  const lineTitle    = isDark ? 'text-white font-bold'         : 'text-slate-900 font-bold';
  const lineSection  = isDark ? 'text-indigo-300 font-bold'    : 'text-indigo-700 font-bold';
  const lineHeadRow  = isDark ? 'text-amber-300 font-bold'     : 'text-amber-700 font-bold';
  const lineColHd    = isDark ? 'text-slate-400 font-semibold' : 'text-slate-500 font-semibold';
  const lineSummary  = isDark ? 'text-emerald-300 font-semibold' : 'text-emerald-700 font-semibold';
  const lineFooter   = isDark ? 'text-slate-500 italic'        : 'text-slate-400 italic';

  useEffect(() => { loadData(); }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await apiService.getDayBookReport(selectedDate.format('YYYY-MM-DD'), 'screen', 'all');
      if (response.success && response.data) {
        const d = response.data?.data ?? response.data;
        setData(d);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const hasData = data && (data.paymentGroups.length > 0 || data.receiptGroups.length > 0);
  const reportLines = data ? buildLines(data, selectedDate.format('DD-MMM-YYYY')) : [];

  const handlePrint = () => {
    if (!data) return;
    const lines = buildLines(data, selectedDate.format('DD-MMM-YYYY'));
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><title>Day Book</title>
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
    let csv = 'Section,Head Code,Head Name,MB No,Member Name,Voucher,Amount,User\n';
    data.paymentGroups.forEach(g =>
      g.entries.forEach(e =>
        csv += `Payment,${g.headCode},"${g.headName}",${e.mbNo},"${e.memberName}",${e.voucherNo},${e.amount},"${e.username}"\n`
      )
    );
    data.receiptGroups.forEach(g =>
      g.entries.forEach(e =>
        csv += `Receipt,${g.headCode},"${g.headName}",${e.mbNo},"${e.memberName}",${e.voucherNo},${e.amount},"${e.username}"\n`
      )
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = `DayBook_${selectedDate.format('YYYY-MM-DD')}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  return (
    <ConfigProvider theme={{
      algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      token: {
        colorPrimary: '#6366f1',
        borderRadius: 8,
        colorBgContainer: isDark ? '#1e293b' : '#ffffff',
        colorBorder: isDark ? '#334155' : '#e2e8f0',
      },
    }}>
      <div className={`db-page h-screen flex flex-col font-sans overflow-hidden ${bg} ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>

        {/* Header */}
        <div className={`db-header px-4 py-2.5 flex items-center justify-between shrink-0 ${header}`}>
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-500/30">
              <BookOpen size={18} className="text-white" />
            </div>
            <div>
              <h1 className={`text-sm font-extrabold tracking-tight leading-none ${text}`}>Day Book</h1>
              <div className={`flex items-center gap-1.5 mt-0.5 fz-small font-semibold uppercase tracking-wide ${muted}`}>
                <ShieldCheck size={10} className="text-indigo-400" /> Daily Transaction Journal
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button icon={<Printer size={13} />} size="small"
              className="h-8 px-3 rounded-lg text-xs font-bold uppercase tracking-wide"
              onClick={handlePrint} disabled={!hasData}>
              Print
            </Button>
            <Button type="primary" icon={<FileDown size={13} />} size="small"
              className="h-8 px-4 rounded-lg text-xs font-bold uppercase tracking-wide"
              onClick={handleExportCSV} disabled={!hasData}>
              CSV
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden p-3 flex gap-3">

          {/* Left panel */}
          <div className="w-[240px] flex flex-col gap-3 shrink-0">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className={`db-panel rounded-xl overflow-hidden ${panel}`}>
              <div className={`db-panel-header px-3 py-2 flex items-center justify-between ${panelHd}`}>
                <h3 className={`fz-caption font-extrabold tracking-wide uppercase flex items-center gap-1.5 ${panelHdTx}`}>
                  <Settings size={11} className="text-indigo-400" /> Parameters
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

            {/* Stats */}
            <AnimatePresence>
              {data && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col gap-2">
                  <div className={`db-panel rounded-lg p-3 ${panel}`}>
                    <div className={`fz-small font-bold uppercase tracking-wide mb-1 ${muted}`}>Opening</div>
                    <div className={`text-sm font-black font-mono ${text}`}>{fmtSigned(data.openingBalance)}</div>
                  </div>
                  <div className={`rounded-lg p-3 ${isDark ? 'bg-emerald-600/20 border border-emerald-500/30' : 'bg-emerald-50 border border-emerald-200'}`}>
                    <div className={`fz-small font-bold uppercase tracking-wide mb-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Receipts</div>
                    <div className={`text-sm font-black font-mono ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>{fmt(data.totalReceipts)}</div>
                  </div>
                  <div className={`rounded-lg p-3 ${isDark ? 'bg-rose-600/20 border border-rose-500/30' : 'bg-rose-50 border border-rose-200'}`}>
                    <div className={`fz-small font-bold uppercase tracking-wide mb-0.5 ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>Payments</div>
                    <div className={`text-sm font-black font-mono ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>{fmt(data.totalPayments)}</div>
                  </div>
                  <div className={`border rounded-lg p-3 ${data.closingBalance >= 0
                    ? (isDark ? 'bg-indigo-600/20 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200')
                    : (isDark ? 'bg-rose-900/30 border-rose-700/40' : 'bg-rose-50 border-rose-200')}`}>
                    <div className={`fz-small font-bold uppercase tracking-wide mb-0.5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>Closing</div>
                    <div className={`text-sm font-black font-mono ${data.closingBalance >= 0
                      ? (isDark ? 'text-indigo-300' : 'text-indigo-700')
                      : (isDark ? 'text-rose-300' : 'text-rose-700')}`}>
                      {fmtSigned(data.closingBalance)}
                    </div>
                  </div>
                  <div className={`db-panel rounded-lg p-3 ${panel}`}>
                    <div className={`fz-small font-bold uppercase tracking-wide mb-1 ${muted}`}>Transactions</div>
                    <div className={`text-lg font-black font-mono ${text}`}>{data.totalTransactions}</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Report panel — monospace document, mirrors the legacy print layout
              exactly (same lines[] feeds both this preview and handlePrint,
              same pattern as Cash-Book Receiptwise Rough). */}
          <div className={`db-panel flex-1 rounded-xl flex flex-col overflow-hidden ${panel}`}>
            <div className={`db-panel-header px-4 py-2 flex items-center justify-between shrink-0 ${panelHd}`}>
              <span className={`text-xs font-extrabold uppercase tracking-wide ${panelHdTx}`}>
                Day Book — {selectedDate.format('DD-MMM-YYYY')}
              </span>
              {data && (
                <span className={`fz-small font-mono ${subtle}`}>
                  {data.totalTransactions} entries · {reportLines.length} lines
                </span>
              )}
            </div>

            <div className={`db-preview-body flex-1 overflow-auto p-4 ${contentBg}`}>
              <Spin spinning={loading} tip="Loading...">
                {reportLines.length > 0 ? (
                  <pre className={`font-mono text-[11.5px] leading-[1.55] whitespace-pre select-text w-fit mx-auto ${lineDefault}`}>
                    {reportLines.map((line, i) => {
                      const isDash = line.trim().startsWith('-');
                      const isCompany = i <= 1;
                      const isTitle = line.startsWith('Day Book For Date');
                      const isSection = line === 'Payment' || line === 'Receipt';
                      const isHeadRow = /^[A-Z]\w*\s{2,}\S/.test(line) && !isSection;
                      const isColHeader = line.startsWith('Mem No.');
                      const isSummary = line.includes('Opening Balance') || line.includes('Closing Balance') ||
                        line.includes('Total Receipt') || line.includes('Total Payment') || line.trim().startsWith('Total');
                      const isFooter = line.startsWith('*');

                      let cls = lineDefault;
                      if (isDash) cls = lineDash;
                      else if (isCompany) cls = lineCompany;
                      else if (isTitle) cls = lineTitle;
                      else if (isSection) cls = lineSection;
                      else if (isColHeader) cls = lineColHd;
                      else if (isSummary) cls = lineSummary;
                      else if (isFooter) cls = lineFooter;
                      else if (isHeadRow) cls = lineHeadRow;

                      return <span key={i} className={`block ${cls}`}>{line || ' '}</span>;
                    })}
                  </pre>
                ) : !loading ? (
                  <div className="flex flex-col items-center justify-center h-64 gap-3">
                    <BookOpen size={48} className={isDark ? 'text-slate-700' : 'text-slate-300'} />
                    <p className={`text-sm font-bold uppercase tracking-wide ${muted}`}>No transactions on {selectedDate.format('DD-MMM-YYYY')}</p>
                    <p className={`text-xs ${subtle}`}>Try a date that has vouchers</p>
                  </div>
                ) : null}
              </Spin>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`db-footer px-4 py-1.5 flex items-center justify-between shrink-0 ${ftrBg}`}>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
            <span className={`fz-small font-bold uppercase tracking-wide ${muted}`}>Day Book · Daily Journal</span>
          </div>
          <span className={`fz-small font-mono ${subtle}`}>{selectedDate.format('YYYYMMDD')}</span>
        </div>
      </div>

      <style>{`
        /* ── Day Book — dark mode ── */
        html.dark .db-page { background-color: #000000 !important; }
        html.dark .db-header,
        html.dark .db-footer { background-color: #0c0c0e !important; background-image: none !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .db-panel { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .db-panel-header { background-color: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .db-preview-body { background-color: #1c1c1e !important; }
        html.dark .db-page .ant-picker { background-color: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .db-page .ant-picker input { color: #f5f5f7 !important; }
      `}</style>
    </ConfigProvider>
  );
};

export default DayBook;
