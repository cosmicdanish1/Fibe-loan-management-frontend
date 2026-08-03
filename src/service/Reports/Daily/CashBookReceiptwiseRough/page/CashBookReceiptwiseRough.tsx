import React, { useState, useEffect, useRef } from 'react';
import { Settings, RefreshCw, Printer, FileDown, Search, BookOpen, ShieldCheck } from 'lucide-react';
import { ConfigProvider, Button, DatePicker, message, Spin, Tooltip, theme as antdTheme } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';
import { apiService } from '../../../../../services/api';
import dayjs from 'dayjs';

interface VoucherEntry {
  sno: number;
  headCode: string;
  headName: string;
  description: string;
  receipt: number;
  payment: number;
}

interface Voucher {
  voucherNo: string;
  memberNo: string;
  memberName: string;
  modeOfPayment: string;
  narration: string;
  entries: VoucherEntry[];
  totalPayment: number;
  totalReceipt: number;
}

interface CashBookRoughData {
  date: string;
  openingBalance: number;
  totalReceipts: number;
  totalPayments: number;
  closingBalance: number;
  vouchers: Voucher[];
}

const LINE_W = 80;
const DASH_LINE = '-'.repeat(LINE_W);

const fmtAmt = (n: number): string =>
  Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtAmtSigned = (n: number): string =>
  (n < 0 ? '-' : '') + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const padL = (s: string, w: number) => s.padStart(w);
const padR = (s: string, w: number) => (s.length > w ? s.slice(0, w) : s.padEnd(w));

const center = (s: string) => {
  const pad = Math.max(0, Math.floor((LINE_W - s.length) / 2));
  return ' '.repeat(pad) + s;
};

function buildLines(data: CashBookRoughData, dateLabel: string): string[] {
  const lines: string[] = [];
  const now = dayjs().format('DD-MMM-YYYY/hh:mmA');

  lines.push(center('Espat Karmchari Co-Operative Credit Society Limited.'));
  lines.push(center('Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006'));
  const regStr = 'Reg No : A.R/DRG/1796';
  const telStr = 'Tel No :';
  lines.push(`${regStr}${padL(telStr, LINE_W - regStr.length)}`);
  lines.push(padL('0788-2298736', LINE_W));
  lines.push('');
  lines.push(`As On Date :- ${now}${padL('Page Number : 1', LINE_W - 14 - now.length)}`);
  lines.push(DASH_LINE);
  lines.push(center('CASH-BOOK'));
  lines.push(padL(`Cash Book For Date:${dateLabel}`, LINE_W));
  lines.push('');

  const COL_SNO  = 4;
  const COL_HEAD = 38;
  const COL_PAY  = 14;
  const COL_REC  = 14;

  data.vouchers.forEach((v) => {
    const modeStr = `Mode OF Payment By ${v.modeOfPayment || 'Cash'}`;
    const vLine = `Voucher No : ${v.voucherNo}`;
    lines.push(`${padR(vLine, LINE_W - modeStr.length)}${modeStr}`);
    lines.push(`Member No:${v.memberNo} ${v.memberName}`);
    lines.push(`Naration: ${v.narration || ''}`);
    lines.push(DASH_LINE);

    const hSno  = padR('S.No', COL_SNO);
    const hHead = padR('  Head              Description', COL_HEAD + 2);
    const hPay  = padL('Payment', COL_PAY);
    const hRec  = padL('Receipt', COL_REC);
    lines.push(`${hSno}   ${hHead}${hPay}${hRec}`);
    lines.push(DASH_LINE);

    v.entries.forEach((e) => {
      const sno  = padL(String(e.sno), COL_SNO);
      const combined = `${e.headCode} ${e.headName || e.description}`;
      const head = padR(combined, COL_HEAD);
      const pay  = e.payment > 0 ? padL(fmtAmt(e.payment), COL_PAY) : ''.padStart(COL_PAY);
      const rec  = e.receipt > 0 ? padL(fmtAmt(e.receipt), COL_REC) : ''.padStart(COL_REC);
      lines.push(`${sno}   ${head}  ${pay}${rec}`);
    });

    lines.push(DASH_LINE);
    const blankLeft = ''.padEnd(COL_SNO + 3 + COL_HEAD + 2);
    lines.push(`${blankLeft}${padL(fmtAmt(v.totalPayment), COL_PAY)}${padL(fmtAmt(v.totalReceipt), COL_REC)}`);
    lines.push(DASH_LINE);
    lines.push('');
    lines.push('');
  });

  const IND   = '        ';
  const LBL_W = 18;
  const VAL_W = 20;
  const DIV   = `${IND}${' '.repeat(LBL_W)}${'─'.repeat(VAL_W)}`;

  lines.push(`${IND}${'Opening Balance :'.padEnd(LBL_W)} ${padL(fmtAmtSigned(data.openingBalance), VAL_W)}`);
  lines.push(`${IND}${'Total Credit    :'.padEnd(LBL_W)} ${padL(fmtAmt(data.totalReceipts), VAL_W)}`);
  lines.push(`${IND}${'Total           :'.padEnd(LBL_W)} ${padL(fmtAmtSigned(data.openingBalance + data.totalReceipts), VAL_W)}`);
  lines.push(`${IND}${'Total Debit     :'.padEnd(LBL_W)} ${padL(fmtAmt(data.totalPayments), VAL_W)}`);
  lines.push(DIV);
  lines.push(`${IND}${'Closing Balance :'.padEnd(LBL_W)} ${padL(fmtAmtSigned(data.closingBalance), VAL_W)}`);
  lines.push(DIV);
  lines.push('');
  lines.push('* Report As Per Data Available ..');

  return lines;
}

const CashBookReceiptwiseRough: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs().subtract(1, 'day'));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CashBookRoughData | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Theme variables
  const bg        = isDark ? 'bg-[#0f172a]'                             : 'bg-slate-50';
  const header    = isDark ? 'bg-slate-800 border-b border-slate-700'   : 'bg-white/80 backdrop-blur-sm border-b border-slate-200';
  const panel     = isDark ? 'bg-slate-800 border border-slate-700'     : 'bg-white border border-slate-200';
  const panelHd   = isDark ? 'bg-slate-900/50 border-b border-slate-700': 'bg-slate-50 border-b border-slate-100';
  const panelHdTx = isDark ? 'text-slate-300'                           : 'text-slate-700';
  const text      = isDark ? 'text-slate-100'                           : 'text-slate-800';
  const muted     = isDark ? 'text-slate-400'                           : 'text-slate-500';
  const subtle    = isDark ? 'text-slate-500'                           : 'text-slate-400';
  const contentBg = isDark ? 'bg-slate-900/60'                          : 'bg-slate-50';
  const ftrBg     = isDark ? 'bg-slate-800 border-t border-slate-700'   : 'bg-white/80 border-t border-slate-200';

  // Monospace line colors
  const lineDefault    = isDark ? 'text-slate-300'              : 'text-slate-700';
  const lineDash       = isDark ? 'text-slate-600'              : 'text-slate-300';
  const lineCompany    = isDark ? 'text-slate-400'              : 'text-slate-500';
  const lineHeader     = isDark ? 'text-white font-bold'        : 'text-slate-900 font-bold';
  const lineVoucher    = isDark ? 'text-indigo-300 font-bold'   : 'text-indigo-700 font-bold';
  const lineMember     = isDark ? 'text-amber-300'              : 'text-amber-600';
  const lineColHd      = isDark ? 'text-slate-400 font-semibold': 'text-slate-500 font-semibold';
  const lineSummary    = isDark ? 'text-emerald-300 font-semibold': 'text-emerald-700 font-semibold';
  const lineFooter     = isDark ? 'text-slate-500 italic'       : 'text-slate-400 italic';

  useEffect(() => { loadData(); }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await apiService.getCashBookReport(selectedDate.format('YYYY-MM-DD'));
      if (response.success && response.data) {
        setData(response.data);
      } else {
        message.error(response.message || 'Failed to load data');
      }
    } catch {
      message.error('Error fetching report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!data) return;
    const lines = buildLines(data, selectedDate.format('DD-MM-YYYY'));
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><title>Cash Book Receiptwise Rough</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  body { font-family: 'Courier New', Courier, monospace; font-size: 9pt; white-space: pre; }
</style></head><body>${lines.join('\n')}</body></html>`);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 300);
    }
  };

  const handleExportCSV = () => {
    if (!data?.vouchers?.length) { message.warning('No data to export'); return; }
    let csv = 'Voucher No,Member No,Member Name,Mode,Head Code,Head Name,Receipt,Payment\n';
    data.vouchers.forEach(v => {
      v.entries.forEach(e => {
        csv += `${v.voucherNo},${v.memberNo},"${v.memberName}",${v.modeOfPayment},${e.headCode},"${e.headName}",${e.receipt},${e.payment}\n`;
      });
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = `CashBook_Receiptwise_${selectedDate.format('YYYY-MM-DD')}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    message.success('CSV exported');
  };

  const fmt2 = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const reportLines = data ? buildLines(data, selectedDate.format('DD-MM-YYYY')) : [];

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
      <div className={`h-screen flex flex-col font-sans overflow-hidden ${bg} ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>

        {/* Header */}
        <div className={`px-4 py-2.5 flex items-center justify-between shrink-0 ${header}`}>
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-500/30">
              <BookOpen size={18} className="text-white" />
            </div>
            <div>
              <h1 className={`text-sm font-extrabold tracking-tight leading-none ${text}`}>Cash-Book (Transaction)</h1>
              <div className={`flex items-center gap-1.5 mt-0.5 fz-small font-semibold uppercase tracking-wide ${muted}`}>
                <ShieldCheck size={10} className="text-indigo-400" /> Voucher-wise Daily Report
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button icon={<Printer size={13} />} size="small"
              className="h-8 px-3 rounded-lg text-xs font-bold uppercase tracking-wide"
              onClick={handlePrint} disabled={!data?.vouchers?.length}>
              Print
            </Button>
            <Button type="primary" icon={<FileDown size={13} />} size="small"
              className="h-8 px-4 rounded-lg text-xs font-bold uppercase tracking-wide"
              onClick={handleExportCSV} disabled={!data?.vouchers?.length}>
              CSV
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden p-3 flex gap-3">

          {/* Left panel */}
          <div className="w-[240px] flex flex-col gap-3 shrink-0">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl overflow-hidden ${panel}`}>
              <div className={`px-3 py-2 flex items-center justify-between ${panelHd}`}>
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
                  <DatePicker className="w-full h-8 text-xs" value={selectedDate}
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
                  <div className={`rounded-lg p-3 ${panel}`}>
                    <div className={`fz-small font-bold uppercase tracking-wide mb-1 ${muted}`}>Vouchers</div>
                    <div className={`text-lg font-black font-mono ${text}`}>{data.vouchers.length}</div>
                  </div>
                  <div className={`rounded-lg p-3 ${panel}`}>
                    <div className={`fz-small font-bold uppercase tracking-wide mb-1 ${muted}`}>Opening Balance</div>
                    <div className={`text-sm font-black font-mono ${text}`}>{fmtAmtSigned(data.openingBalance)}</div>
                  </div>
                  <div className={`rounded-lg p-3 ${isDark ? 'bg-emerald-600/20 border border-emerald-500/30' : 'bg-emerald-50 border border-emerald-200'}`}>
                    <div className={`fz-small font-bold uppercase tracking-wide mb-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Total Credit</div>
                    <div className={`text-sm font-black font-mono ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>{fmt2(data.totalReceipts)}</div>
                  </div>
                  <div className={`rounded-lg p-3 ${isDark ? 'bg-rose-600/20 border border-rose-500/30' : 'bg-rose-50 border border-rose-200'}`}>
                    <div className={`fz-small font-bold uppercase tracking-wide mb-0.5 ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>Total Debit</div>
                    <div className={`text-sm font-black font-mono ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>{fmt2(data.totalPayments)}</div>
                  </div>
                  <div className={`border rounded-lg p-3 ${data.closingBalance >= 0
                    ? (isDark ? 'bg-indigo-600/20 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200')
                    : (isDark ? 'bg-rose-900/30 border-rose-700/40' : 'bg-rose-50 border-rose-200')}`}>
                    <div className={`fz-small font-bold uppercase tracking-wide mb-0.5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>Closing Balance</div>
                    <div className={`text-sm font-black font-mono ${data.closingBalance >= 0
                      ? (isDark ? 'text-indigo-300' : 'text-indigo-700')
                      : (isDark ? 'text-rose-300' : 'text-rose-700')}`}>
                      {fmtAmtSigned(data.closingBalance)}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Report viewer */}
          <div className={`flex-1 rounded-xl flex flex-col overflow-hidden ${panel}`}>
            <div className={`px-4 py-2 flex items-center justify-between shrink-0 ${panelHd}`}>
              <span className={`text-xs font-extrabold uppercase tracking-wide ${panelHdTx}`}>
                Cash Book — {selectedDate.format('DD-MMM-YYYY')}
              </span>
              {data && (
                <span className={`fz-small font-mono ${subtle}`}>
                  {data.vouchers.length} vouchers · {reportLines.length} lines
                </span>
              )}
            </div>

            {/* Monospace document area */}
            <div className={`flex-1 overflow-auto p-4 ${contentBg}`} ref={printRef}>
              <Spin spinning={loading} tip="Loading...">
                {reportLines.length > 0 ? (
                  <pre className={`font-mono text-[11.5px] leading-[1.55] whitespace-pre select-text ${lineDefault}`}>
                    {reportLines.map((line, i) => {
                      const isDash = line.trim().startsWith('─') || line.trim().startsWith('-');
                      const isVoucherNo = line.startsWith('Voucher No');
                      const isMember = line.startsWith('Member No');
                      const isHdr = line.trim() === 'CASH-BOOK' || line.includes('Cash Book For Date');
                      const isSummary = line.includes('Opening Balance') || line.includes('Closing Balance') ||
                        line.includes('Total Credit') || line.includes('Total Debit') || line.trim().startsWith('Total');
                      const isFooter = line.startsWith('*');
                      const isColHeader = line.trimStart().startsWith('S.No');
                      const isCompany = i <= 3;

                      let cls = lineDefault;
                      if (isDash) cls = lineDash;
                      else if (isCompany) cls = lineCompany;
                      else if (isHdr) cls = lineHeader;
                      else if (isVoucherNo) cls = lineVoucher;
                      else if (isMember) cls = lineMember;
                      else if (isColHeader) cls = lineColHd;
                      else if (isSummary) cls = lineSummary;
                      else if (isFooter) cls = lineFooter;

                      return <span key={i} className={`block ${cls}`}>{line || ' '}</span>;
                    })}
                  </pre>
                ) : !loading ? (
                  <div className="flex flex-col items-center justify-center h-64 gap-3">
                    <BookOpen size={48} className={isDark ? 'text-slate-700' : 'text-slate-300'} />
                    <p className={`text-sm font-bold uppercase tracking-wide ${muted}`}>No transactions on {selectedDate.format('DD-MMM-YYYY')}</p>
                    <p className={`text-xs ${subtle}`}>Try a date that has vouchers, e.g. <span className="text-indigo-500 font-mono">07-Feb-2024</span></p>
                  </div>
                ) : null}
              </Spin>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-4 py-1.5 flex items-center justify-between shrink-0 ${ftrBg}`}>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
            <span className={`fz-small font-bold uppercase tracking-wide ${muted}`}>Cash Book · Transaction View</span>
          </div>
          <span className={`fz-small font-mono ${subtle}`}>{selectedDate.format('YYYYMMDD')}</span>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default CashBookReceiptwiseRough;
