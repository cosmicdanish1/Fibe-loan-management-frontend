import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ConfigProvider, Spin, theme as antdTheme } from 'antd';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';
import { apiService } from '../../../../../services/api';
import dayjs from 'dayjs';

const showDialog = async (type: 'info' | 'warning' | 'error', title: string, detail: string): Promise<void> => {
  if ((window as any).electronAPI?.showMessageBox) {
    await (window as any).electronAPI.showMessageBox({ type, title: 'electron-react-ts', message: title, detail, buttons: ['OK'], defaultId: 0 });
  }
};

interface DefaulterRecord {
  key: string;
  memberNo: string;
  memberName: string;
  officeName: string;
  loanType: string;
  loanCaseNo: string;
  loanAmount: number;
  balance: number;
  installments: number;
  lastPaymentDate: string;
  monthsOverdue: number;
  penalDue: number;
}

interface DefaulterResponse {
  metadata: { totalCount: number; limit: number; offset: number };
  data: DefaulterRecord[];
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

// Print-only layout matching the legacy report design standard used across
// every report this session (letterhead, Date/Page Number line, dashed
// rules, TOTAL row, summary block) — plain monospace text, not a clone of
// the on-screen colorful UI. Feeds handlePrint only.
const DFL_LINE_W = 97;
const DFL_DASH = '-'.repeat(DFL_LINE_W);
const DFL_COL_SR = 4;
const DFL_COL_MBNO = 11;
const DFL_COL_NAME = 20;
const DFL_COL_TYPE = 6;
const DFL_COL_CASE = 9;
const DFL_COL_AMT = 13;
const DFL_COL_OVERDUE = 8;

const dflPadL = (s: string, w: number) => s.padStart(w);
const dflPadR = (s: string, w: number) => (s.length > w ? s.slice(0, w) : s.padEnd(w));
const dflCenter = (s: string, w: number) => ' '.repeat(Math.max(0, Math.floor((w - s.length) / 2))) + s;

function buildDefaulterListLines(
  data: DefaulterRecord[], minBalance: number, currentPage: number, totalPages: number,
  rangeStart: number, totalLoanAmount: number, totalOutstanding: number, totalPenalDue: number,
): string[] {
  const lines: string[] = [];
  const now = dayjs().format('DD-MMM-YYYY/h:mmA');

  lines.push(dflCenter('Espat Karmchari Co-Operative Credit Society Limited.', DFL_LINE_W));
  lines.push(dflCenter('Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006', DFL_LINE_W));
  lines.push(dflCenter('Defaulter List', DFL_LINE_W));
  lines.push('');
  lines.push(`Minimum Balance : Rs.${fmt(minBalance)}`);
  lines.push(`Page : ${currentPage} of ${totalPages}`);
  const printedStr = `Printed : ${now}`;
  const pageStr = `Page Number : ${currentPage}`;
  lines.push(`${printedStr}${dflPadL(pageStr, DFL_LINE_W - printedStr.length)}`);
  lines.push(DFL_DASH);

  lines.push(
    `${dflPadR('Sr', DFL_COL_SR)}${dflPadR('Member No', DFL_COL_MBNO)}${dflPadR('Member Name', DFL_COL_NAME)}` +
    `${dflPadR('Type', DFL_COL_TYPE)}${dflPadR('Case No', DFL_COL_CASE)}` +
    `${dflPadL('Loan Amt', DFL_COL_AMT)}${dflPadL('Outstanding', DFL_COL_AMT)}${dflPadL('Overdue', DFL_COL_OVERDUE)}${dflPadL('Penal Due', DFL_COL_AMT)}`
  );
  lines.push(DFL_DASH);

  data.forEach((r, i) => {
    const overdueStr = (r.monthsOverdue || 0) > 0 ? `${r.monthsOverdue}mo` : '-';
    const penalStr = (r.penalDue || 0) > 0 ? fmt(Number(r.penalDue)) : '-';
    lines.push(
      `${dflPadR(String(rangeStart + i), DFL_COL_SR)}${dflPadR(r.memberNo, DFL_COL_MBNO)}${dflPadR(r.memberName, DFL_COL_NAME)}` +
      `${dflPadR(r.loanType, DFL_COL_TYPE)}${dflPadR(r.loanCaseNo, DFL_COL_CASE)}` +
      `${dflPadL(fmt(Number(r.loanAmount) || 0), DFL_COL_AMT)}${dflPadL(fmt(Number(r.balance) || 0), DFL_COL_AMT)}` +
      `${dflPadL(overdueStr, DFL_COL_OVERDUE)}${dflPadL(penalStr, DFL_COL_AMT)}`
    );
  });

  lines.push(DFL_DASH);
  lines.push(
    `${dflPadR('PAGE TOTAL', DFL_COL_SR + DFL_COL_MBNO + DFL_COL_NAME + DFL_COL_TYPE + DFL_COL_CASE)}` +
    `${dflPadL(fmt(totalLoanAmount), DFL_COL_AMT)}${dflPadL(fmt(totalOutstanding), DFL_COL_AMT)}${' '.repeat(DFL_COL_OVERDUE)}${dflPadL(fmt(totalPenalDue), DFL_COL_AMT)}`
  );
  lines.push(DFL_DASH);

  const IND = '        ';
  const LBL_W = 20;
  const VAL_W = 18;
  lines.push(`${IND}${'Page records'.padEnd(LBL_W)} ${dflPadL(String(data.length), VAL_W)}`);
  lines.push(`${IND}${'Page loan amount'.padEnd(LBL_W)} ${dflPadL(fmt(totalLoanAmount), VAL_W)}`);
  lines.push(`${IND}${'Page outstanding'.padEnd(LBL_W)} ${dflPadL(fmt(totalOutstanding), VAL_W)}`);
  lines.push(`${IND}${'Page penal due'.padEnd(LBL_W)} ${dflPadL(fmt(totalPenalDue), VAL_W)}`);
  lines.push('');
  lines.push('* Report As Per Data Available ..');

  return lines;
}

function useCountUp(target: number, duration = 550) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const from = fromRef.current;
    const startTime = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + (target - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = target;
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return value;
}

const DefaulterList: React.FC = () => {
  const [data, setData] = useState<DefaulterRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [minBalance, setMinBalance] = useState(10000);
  const [inputValue, setInputValue] = useState('10000');
  const [outputType, setOutputType] = useState<'screen' | 'printer'>('screen');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark';

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const rangeStart = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, totalCount);

  const { totalLoanAmount, totalOutstanding, totalPenalDue } = useMemo(() => ({
    totalLoanAmount: data.reduce((s, r) => s + (Number(r.loanAmount) || 0), 0),
    totalOutstanding: data.reduce((s, r) => s + (Number(r.balance) || 0), 0),
    totalPenalDue: data.reduce((s, r) => s + (Number(r.penalDue) || 0), 0),
  }), [data]);

  const animCount = useCountUp(data.length);
  const animLoan = useCountUp(totalLoanAmount);
  const animOutstanding = useCountUp(totalOutstanding);

  const fetchDefaulterList = async (balance?: number, page?: number, size?: number) => {
    setLoading(true);
    const effectiveBalance = balance ?? minBalance;
    const effectivePage = page ?? currentPage;
    const effectiveSize = size ?? pageSize;
    try {
      const response = await apiService.getDefaulterList(effectiveBalance, effectiveSize, (effectivePage - 1) * effectiveSize);
      if (response.success && response.data) {
        const rd = response.data as DefaulterResponse;
        setData(rd.data || []);
        setTotalCount(rd.metadata?.totalCount || 0);
      } else {
        setData([]);
        setTotalCount(0);
        await showDialog('warning', 'No Data', 'No defaulter data found');
      }
    } catch (error) {
      console.error('Error fetching defaulter list:', error);
      await showDialog('error', 'Fetch Error', 'Failed to load defaulter list');
      setData([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDefaulterList();
  }, [currentPage, pageSize]);

  const generateReport = () => {
    const bal = Number(inputValue) || 0;
    setMinBalance(bal);
    setCurrentPage(1);
    fetchDefaulterList(bal, 1, pageSize);
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const size = Number(e.target.value);
    setPageSize(size);
    setCurrentPage(1);
  };

  // window.print() used to be used here, cloning the live theme-dependent
  // page. Traced via CSS cascade analysis: this app's permanent
  // `html.dark .dfl-report-tbl td { color: #c8c3bc !important }` rule (for
  // on-screen dark mode) is not scoped to screen-only, and is MORE specific
  // than the print CSS's own `.dfl-report { color:#111 !important }` reset
  // — since both are !important, the more specific dark-mode rule wins even
  // during print. Printing while the app is in dark mode (the mode used
  // throughout this session) would have produced faint light-gray text on
  // a white page, with a near-black header row background. Switched to the
  // same hidden-iframe + monospace lines[] technique used everywhere else
  // — an isolated document that can never inherit the parent page's
  // `html.dark` styling at all.
  const handlePrint = () => {
    if (data.length === 0) return;
    const lines = buildDefaulterListLines(
      data, minBalance, currentPage, totalPages, rangeStart,
      totalLoanAmount, totalOutstanding, totalPenalDue,
    );
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      // Portrait, not landscape: this app's print pipeline doesn't honor
      // `@page { size: landscape }` from a dynamically-written iframe
      // (confirmed live on Day-Book [SB] earlier this session — content
      // came out sideways on a portrait sheet). 97 chars still fits
      // comfortably in portrait at a slightly smaller font, same pattern
      // as the other wide reports (Bank Detail Ledger, Journal Voucher).
      doc.write(`<!DOCTYPE html><html><head><title>Defaulter List</title>
<style>
  @page { size: A4 portrait; margin: 10mm; }
  body { margin: 0; }
  pre { font-family: 'Courier New', Courier, monospace; font-size: 7.5pt; white-space: pre; width: fit-content; margin: 0 auto; }
</style></head><body><pre>${lines.join('\n')}</pre></body></html>`);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 300);
    }
  };

  const handleExportCSV = useCallback(async () => {
    if (data.length === 0) { await showDialog('warning', 'No Data', 'No data to export'); return; }
    try {
      let csv = 'Espat Karmchari Co-Operative Credit Society Limited\n';
      csv += 'Avenue A, Sahakari Sadan, Sector-6, AT Post: Bhilai Nagar, Dist: DURG-490006\n';
      csv += 'Reg No: A.R/DRG/1796, Tel No: 0788-2298736\n\nDEFAULTER LIST REPORT\n';
      csv += `Minimum Balance: Rs.${fmt(minBalance)}\nPage: ${currentPage} of ${totalPages}\n\n`;
      csv += 'Member No,Member Name,Loan Type,Case No,Loan Amount,Outstanding,Months Overdue,Penal Due\n';
      data.forEach(r => {
        csv += `${r.memberNo},"${r.memberName}",${r.loanType},${r.loanCaseNo},${r.loanAmount},${r.balance},${r.monthsOverdue || 0},${r.penalDue || 0}\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `DefaulterList_Page${currentPage}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      await showDialog('info', 'Export Done', 'CSV exported successfully');
    } catch {
      await showDialog('error', 'Export Error', 'Failed to export CSV');
    }
  }, [data, minBalance, currentPage, totalPages]);

  const pagerBtn: React.CSSProperties = {
    width: 30, height: 30, borderRadius: 6, background: '#fbf9f4',
    border: '1px solid rgba(19,37,63,0.14)', color: '#16202c', fontSize: 13, cursor: 'pointer',
  };

  return (
    <ConfigProvider theme={{ algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm }}>
      <div className="dfl-page" style={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column', background: '#f3f0e8', fontFamily: "'IBM Plex Sans', sans-serif", color: '#16202c', overflow: 'hidden' }}>

        {/* Header */}
        <div className="dfl-noprint dfl-header" style={{ height: 66, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 26px', background: '#fff', borderBottom: '1px solid rgba(19,37,63,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, background: '#13253f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5l-8-3z" stroke="#d9ac52" strokeWidth="1.6" fill="none" />
              </svg>
            </div>
            <div>
              <div className="dfl-serif" style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.01em', color: '#13253f', lineHeight: 1.1 }}>Defaulter List</div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.09em', color: '#8a7a56', marginTop: 3 }}>RISK MANAGEMENT SYSTEM</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={handlePrint} className="dfl-btn-outline" style={{ height: 37, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: '1px solid rgba(19,37,63,0.18)', color: '#13253f', borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" stroke="currentColor" strokeWidth="1.6" /></svg>
              Print
            </button>
            <button onClick={handleExportCSV} className="dfl-btn-gold" style={{ height: 37, padding: '0 18px', display: 'flex', alignItems: 'center', gap: 8, background: '#b8892f', border: 'none', color: '#fff', borderRadius: 7, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(184,137,47,0.3)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" stroke="#fff" strokeWidth="1.8" /></svg>
              Export CSV
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', gap: 16, padding: 16, overflow: 'hidden', minHeight: 0 }}>

          {/* Sidebar */}
          <div className="dfl-noprint dfl-scroll" style={{ width: 250, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', minHeight: 0, paddingRight: 2 }}>

            {/* Filter card */}
            <div className="dfl-card" style={{ background: '#fff', border: '1px solid rgba(19,37,63,0.08)', borderRadius: 12, overflow: 'hidden', flexShrink: 0, boxShadow: '0 1px 2px rgba(19,37,63,0.03),0 8px 20px rgba(19,37,63,0.04)' }}>
              <div className="dfl-card-hdr" style={{ padding: '13px 16px', background: '#fbf9f4', borderBottom: '1px solid rgba(19,37,63,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="dfl-serif" style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.07em', color: '#8a7a56' }}>FILTER PARAMETERS</div>
                <button onClick={() => fetchDefaulterList()} className="dfl-icon-btn" style={{ width: 24, height: 24, borderRadius: 6, background: 'transparent', border: 'none', color: '#8a94a0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M4 12a8 8 0 0114-5.3M20 12a8 8 0 01-14 5.3M4 4v5h5M20 20v-5h-5" stroke="currentColor" strokeWidth="1.8" /></svg>
                </button>
              </div>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: '#5b6572', marginBottom: 8 }}>MINIMUM BALANCE</div>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#b8892f', fontWeight: 700, fontSize: 13 }}>₹</span>
                    <input
                      type="number"
                      value={inputValue}
                      onChange={e => setInputValue(e.target.value)}
                      className="dfl-input"
                      style={{ width: '100%', height: 38, padding: '0 12px 0 28px', background: '#faf8f2', border: '1px solid rgba(19,37,63,0.14)', borderRadius: 8, color: '#16202c', fontSize: 13, fontWeight: 600, boxSizing: 'border-box', outline: 'none' }}
                    />
                  </div>
                  <div style={{ fontSize: 11, color: '#8a94a0', marginTop: 6 }}>Higher values load faster</div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: '#5b6572', marginBottom: 8 }}>OUTPUT FORMAT</div>
                  <div style={{ display: 'flex', background: '#faf8f2', border: '1px solid rgba(19,37,63,0.14)', borderRadius: 8, padding: 3, gap: 3 }}>
                    {(['screen', 'printer'] as const).map(val => (
                      <button
                        key={val}
                        onClick={() => setOutputType(val)}
                        style={{ flex: 1, height: 32, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all .15s ease', background: outputType === val ? '#13253f' : 'transparent', color: outputType === val ? '#fff' : '#5b6572' }}
                      >
                        {val === 'screen' ? 'Screen' : 'Print'}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={generateReport}
                  disabled={loading}
                  className="dfl-generate-btn"
                  style={{ height: 41, background: '#13253f', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12.5, fontWeight: 700, letterSpacing: '0.02em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: loading ? 'default' : 'pointer' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#fff" strokeWidth="1.8" /><path d="M20 20l-4-4" stroke="#fff" strokeWidth="1.8" /></svg>
                  {loading ? 'Loading…' : 'Generate Report'}
                </button>
              </div>
            </div>

            {/* Data overview */}
            <div className="dfl-card" style={{ background: '#fff', border: '1px solid rgba(19,37,63,0.08)', borderRadius: 12, overflow: 'hidden', flexShrink: 0, boxShadow: '0 1px 2px rgba(19,37,63,0.03),0 8px 20px rgba(19,37,63,0.04)' }}>
              <div className="dfl-card-hdr dfl-serif" style={{ padding: '13px 16px', background: '#fbf9f4', borderBottom: '1px solid rgba(19,37,63,0.07)', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.07em', color: '#8a7a56' }}>DATA OVERVIEW</div>
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Total records', value: String(totalCount) },
                  { label: 'Current page', value: `${currentPage} of ${totalPages}` },
                  { label: 'Page size', value: `${pageSize} records` },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 12, color: '#5b6572' }}>{row.label}</span>
                    <span className="dfl-mono" style={{ fontWeight: 600, fontSize: 13, color: '#16202c' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* KPI cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
              <div className="dfl-kpi-card" style={{ background: '#fff', border: '1px solid rgba(19,37,63,0.08)', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 2px rgba(19,37,63,0.03),0 8px 20px rgba(19,37,63,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: '#5b6572' }}>DEFAULTERS ON PAGE</span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M17 20v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M23 20v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 12a4 4 0 100-8 4 4 0 000 8z" stroke="#b8892f" strokeWidth="1.5" /></svg>
                </div>
                <div className="dfl-mono" style={{ fontSize: 27, fontWeight: 700, color: '#13253f' }}>{Math.round(animCount)}</div>
              </div>

              <div className="dfl-kpi-card" style={{ background: '#fff', border: '1px solid rgba(19,37,63,0.08)', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 2px rgba(19,37,63,0.03),0 8px 20px rgba(19,37,63,0.04)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: '#5b6572', marginBottom: 6 }}>TOTAL LOAN AMOUNT</div>
                <div className="dfl-mono" style={{ fontSize: 20, fontWeight: 700, color: '#13253f' }}>₹{fmt(Math.round(animLoan))}</div>
              </div>

              <div className="dfl-kpi-red" style={{ background: '#fbf1ee', border: '1px solid rgba(179,57,44,0.2)', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 2px rgba(19,37,63,0.03),0 8px 20px rgba(19,37,63,0.04)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: '#b3392c', marginBottom: 6 }}>OUTSTANDING AMOUNT</div>
                <div className="dfl-mono" style={{ fontSize: 20, fontWeight: 700, color: '#b3392c' }}>₹{fmt(Math.round(animOutstanding))}</div>
              </div>
            </div>
          </div>

          {/* Report panel */}
          <div className="dfl-report-panel" style={{ flex: 1, minWidth: 0, background: '#fff', border: '1px solid rgba(19,37,63,0.08)', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 1px 2px rgba(19,37,63,0.03),0 8px 20px rgba(19,37,63,0.04)' }}>

            {/* Panel header */}
            <div className="dfl-noprint dfl-card-hdr" style={{ padding: '14px 20px', background: '#fbf9f4', borderBottom: '1px solid rgba(19,37,63,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#13253f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="6" rx="8" ry="3" stroke="#d9ac52" strokeWidth="1.6" fill="none" /><path d="M4 6v12c0 1.657 3.582 3 8 3s8-1.343 8-3V6" stroke="#d9ac52" strokeWidth="1.6" /></svg>
                </div>
                <div>
                  <div className="dfl-serif" style={{ fontSize: 14, fontWeight: 700, color: '#13253f' }}>Defaulter Report</div>
                  <div style={{ fontSize: 11.5, color: '#5b6572', marginTop: 2 }}>Min balance ₹{fmt(minBalance)} · Page {currentPage} of {totalPages}</div>
                </div>
              </div>
              {totalCount === 0 && !loading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b3392c', fontSize: 11.5, fontWeight: 600 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01M10.3 3.9L2.6 17a2 2 0 001.7 3h15.4a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" stroke="currentColor" strokeWidth="1.6" /></svg>
                  No data
                </div>
              )}
            </div>

            {/* Report body */}
            <div className="dfl-scroll dfl-report" style={{ flex: 1, overflow: 'auto', padding: '22px 20px' }}>
              <Spin spinning={loading} size="large">
                {!loading && data.length === 0 ? (
                  <div style={{ height: '100%', minHeight: 340, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#8a94a0' }}>
                    <svg width="52" height="52" viewBox="0 0 24 24" fill="none" style={{ marginBottom: 16, opacity: 0.5 }}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.4" /><path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.4" /></svg>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#5b6572', marginBottom: 6 }}>No defaulters found</div>
                    <div style={{ fontSize: 12.5, color: '#8a94a0', textAlign: 'center', maxWidth: 240 }}>Adjust the minimum balance filter to view defaulter data</div>
                  </div>
                ) : data.length > 0 ? (
                  <div>
                    {/* Letterhead */}
                    <div style={{ textAlign: 'center', paddingBottom: 16, marginBottom: 20, borderBottom: '1px solid rgba(19,37,63,0.1)' }}>
                      <div className="dfl-serif" style={{ fontWeight: 700, fontSize: 16, color: '#13253f' }}>Espat Karmchari Co-Operative Credit Society Limited</div>
                      <div style={{ fontSize: 12, color: '#5b6572', marginTop: 4 }}>Avenue A, Sahakari Sadan, Sector-6, AT Post: Bhilai Nagar, Dist: DURG-490006</div>
                      <div style={{ fontSize: 11, color: '#8a94a0', marginTop: 3 }}>Reg No: A.R/DRG/1796 &nbsp;·&nbsp; Tel No: 0788-2298736</div>
                    </div>

                    <div style={{ textAlign: 'center', marginBottom: 20 }}>
                      <div className="dfl-serif" style={{ fontWeight: 700, fontSize: 14, letterSpacing: '0.05em', color: '#b3392c' }}>DEFAULTER LIST REPORT</div>
                      <div style={{ fontSize: 12, color: '#5b6572', marginTop: 5 }}>Minimum balance ₹{fmt(minBalance)} &nbsp;·&nbsp; Page {currentPage} of {totalPages}</div>
                      <div style={{ fontSize: 11, color: '#8a94a0', marginTop: 3 }}>Showing {rangeStart}–{rangeEnd} of {totalCount} records</div>
                    </div>

                    <table className="dfl-report-tbl" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, tableLayout: 'fixed' }}>
                      <thead>
                        <tr style={{ borderBottom: '1.5px solid rgba(19,37,63,0.16)', background: '#fbf5e8' }}>
                          {[
                            { label: 'SR', w: 28, align: 'left' as const },
                            { label: 'MEMBER NO', w: 74, align: 'left' as const },
                            { label: 'MEMBER NAME', w: undefined, align: 'left' as const },
                            { label: 'TYPE', w: 42, align: 'left' as const },
                            { label: 'CASE NO', w: 54, align: 'left' as const },
                            { label: 'LOAN AMOUNT', w: 84, align: 'right' as const },
                            { label: 'OUTSTANDING', w: 84, align: 'right' as const },
                            { label: 'OVERDUE', w: 44, align: 'center' as const },
                            { label: 'PENAL DUE', w: 68, align: 'right' as const },
                          ].map(col => (
                            <th key={col.label} style={{ textAlign: col.align, padding: '10px 10px', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.07em', color: '#8a7a56', width: col.w }}>
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((r, i) => {
                          const hasOverdue = (r.monthsOverdue || 0) > 0;
                          const hasPenal = (r.penalDue || 0) > 0;
                          return (
                            <tr key={`${r.memberNo}-${r.loanCaseNo}`} style={{ borderBottom: '1px solid rgba(19,37,63,0.06)', background: i % 2 === 1 ? 'rgba(19,37,63,0.015)' : undefined }}>
                              <td style={{ padding: '11px 10px', textAlign: 'center', color: '#8a94a0' }} className="dfl-mono">{rangeStart + i}</td>
                              <td style={{ padding: '11px 10px', color: '#a6791f', fontWeight: 600 }} className="dfl-mono">{r.memberNo}</td>
                              <td style={{ padding: '11px 10px', color: '#16202c', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.memberName}</td>
                              <td style={{ padding: '11px 10px', color: '#5b6572', fontWeight: 600 }}>{r.loanType}</td>
                              <td style={{ padding: '11px 10px', color: '#5b6572' }} className="dfl-mono">{r.loanCaseNo}</td>
                              <td style={{ padding: '11px 10px', textAlign: 'right', color: '#16202c' }} className="dfl-mono">{fmt(Number(r.loanAmount) || 0)}</td>
                              <td style={{ padding: '11px 10px', textAlign: 'right', fontWeight: 600, color: hasOverdue ? '#b3392c' : '#16202c' }} className="dfl-mono">{fmt(Number(r.balance) || 0)}</td>
                              <td style={{ padding: '11px 10px', textAlign: 'center', fontWeight: 600, color: hasOverdue ? '#b8892f' : '#8a94a0' }}>{hasOverdue ? `${r.monthsOverdue}mo` : '—'}</td>
                              <td style={{ padding: '11px 10px', textAlign: 'right', fontWeight: 600, color: hasPenal ? '#b3392c' : '#8a94a0' }} className="dfl-mono">{hasPenal ? fmt(Number(r.penalDue) || 0) : '—'}</td>
                            </tr>
                          );
                        })}
                        <tr style={{ borderTop: '2px solid #b8892f' }}>
                          <td colSpan={5} style={{ padding: '14px 10px', textAlign: 'right', fontWeight: 700, fontSize: 12, letterSpacing: '0.04em', color: '#5b6572' }}>PAGE TOTAL</td>
                          <td style={{ padding: '14px 10px', textAlign: 'right', fontWeight: 700, fontSize: 13, color: '#13253f' }} className="dfl-mono">{fmt(totalLoanAmount)}</td>
                          <td style={{ padding: '14px 10px', textAlign: 'right', fontWeight: 700, fontSize: 13, color: '#b3392c' }} className="dfl-mono">{fmt(totalOutstanding)}</td>
                          <td />
                          <td style={{ padding: '14px 10px', textAlign: 'right', fontWeight: 700, fontSize: 13, color: '#b3392c' }} className="dfl-mono">{fmt(totalPenalDue)}</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Summary box */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                      <div style={{ background: '#fbf9f4', border: '1px solid rgba(19,37,63,0.08)', borderRadius: 10, padding: '14px 18px', minWidth: 270 }}>
                        {[
                          { label: 'Page records', value: `${data.length} of ${totalCount}`, red: false },
                          { label: 'Page loan amount', value: `₹${fmt(totalLoanAmount)}`, red: false },
                          { label: 'Page outstanding', value: `₹${fmt(totalOutstanding)}`, red: true, top: true },
                          { label: 'Page penal due', value: `₹${fmt(totalPenalDue)}`, red: true },
                        ].map(row => (
                          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12, borderTop: row.top ? '1px solid rgba(19,37,63,0.08)' : undefined, marginTop: row.top ? 4 : undefined }}>
                            <span style={{ color: '#5b6572' }}>{row.label}</span>
                            <span className="dfl-mono" style={{ color: row.red ? '#b3392c' : '#16202c', fontWeight: row.red ? 700 : 600 }}>{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </Spin>
            </div>

            {/* Pagination footer */}
            <div className="dfl-noprint" style={{ flexShrink: 0, padding: '12px 20px', borderTop: '1px solid rgba(19,37,63,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, color: '#5b6572' }}>
                Showing <span style={{ color: '#16202c', fontWeight: 600 }}>{rangeStart}–{rangeEnd}</span> of {totalCount} defaulters
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <select value={pageSize} onChange={handlePageSizeChange} className="dfl-select" style={{ height: 32, background: '#fbf9f4', border: '1px solid rgba(19,37,63,0.14)', borderRadius: 6, color: '#16202c', fontSize: 12, padding: '0 8px', marginRight: 10, cursor: 'pointer' }}>
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>
                <button onClick={() => setCurrentPage(1)} disabled={currentPage <= 1} className="dfl-pager" style={{ ...pagerBtn, cursor: currentPage <= 1 ? 'default' : 'pointer', color: currentPage <= 1 ? '#c7bfab' : '#16202c' }}>«</button>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="dfl-pager" style={{ ...pagerBtn, cursor: currentPage <= 1 ? 'default' : 'pointer', color: currentPage <= 1 ? '#c7bfab' : '#16202c' }}>‹</button>
                <div className="dfl-mono" style={{ padding: '0 12px', fontSize: 12.5, color: '#16202c', fontWeight: 600 }}>{currentPage} / {totalPages}</div>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="dfl-pager" style={{ ...pagerBtn, cursor: currentPage >= totalPages ? 'default' : 'pointer', color: currentPage >= totalPages ? '#c7bfab' : '#16202c' }}>›</button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage >= totalPages} className="dfl-pager" style={{ ...pagerBtn, cursor: currentPage >= totalPages ? 'default' : 'pointer', color: currentPage >= totalPages ? '#c7bfab' : '#16202c' }}>»</button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="dfl-noprint dfl-footer" style={{ height: 38, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', background: '#fff', borderTop: '1px solid rgba(19,37,63,0.08)', fontSize: 11 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#5b6572' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2f8f5b', boxShadow: '0 0 0 3px rgba(47,143,91,0.15)' }} />
            Risk Management System v2.0
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: '#5b6572' }}>
            <span>Filter: ₹{fmt(minBalance)}</span>
            <div style={{ width: 1, height: 12, background: 'rgba(19,37,63,0.12)' }} />
            <span className="dfl-mono" style={{ background: 'rgba(184,137,47,0.12)', color: '#a6791f', padding: '3px 9px', borderRadius: 5, fontWeight: 700 }}>v5.2.1</span>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@600;700;800&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');

        .dfl-serif { font-family: 'Source Serif 4', serif !important; }
        .dfl-mono  { font-family: 'IBM Plex Mono', monospace !important; }

        .dfl-scroll::-webkit-scrollbar { width: 9px; height: 9px; }
        .dfl-scroll::-webkit-scrollbar-track { background: transparent; }
        .dfl-scroll::-webkit-scrollbar-thumb { background: #d8d1c2; border-radius: 6px; }
        .dfl-scroll::-webkit-scrollbar-thumb:hover { background: #c7bfab; }

        .dfl-btn-outline:hover { background: rgba(19,37,63,0.05) !important; }
        .dfl-btn-gold:hover    { background: #a6791f !important; }
        .dfl-generate-btn:hover:not(:disabled) { background: #1c3455 !important; }
        .dfl-icon-btn:hover    { background: rgba(19,37,63,0.06) !important; color: #13253f !important; }
        .dfl-pager:hover:not(:disabled) { background: rgba(19,37,63,0.06) !important; }
        .dfl-input:focus { border-color: #b8892f !important; background: #fff !important; }

        /* Printing now goes through a hidden iframe (see handlePrint) that
           renders a plain monospace layout built from the report's own data
           — no @media print rule is needed on this live page anymore;
           window.print() is no longer called on it. The old rule here would
           also have been beaten by html.dark's own !important rules during
           print (see handlePrint's comment for the full explanation). */

        /* ── Dark mode ── */
        html.dark .dfl-page         { background: #000 !important; }
        html.dark .dfl-header,
        html.dark .dfl-footer       { background: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .dfl-card         { background: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; box-shadow: none !important; }
        html.dark .dfl-card-hdr     { background: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .dfl-report-panel { background: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; box-shadow: none !important; }
        html.dark .dfl-kpi-card     { background: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; box-shadow: none !important; }
        html.dark .dfl-kpi-red      { background: rgba(179,57,44,.15) !important; border-color: rgba(179,57,44,.25) !important; box-shadow: none !important; }
        html.dark .dfl-input        { background: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
        html.dark .dfl-btn-outline  { border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
        html.dark .dfl-report-tbl th { background: #0c0c0e !important; }
        html.dark .dfl-report-tbl tr { background: transparent !important; }
        html.dark .dfl-report-tbl td { color: #c8c3bc !important; border-color: rgba(255,255,255,.06) !important; }
        html.dark .dfl-pager        { background: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
        html.dark .dfl-pager:disabled { color: rgba(255,255,255,.2) !important; }
        html.dark .dfl-select       { background: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
        html.dark .dfl-page .dfl-serif,
        html.dark .dfl-page .dfl-mono { color: inherit; }
      `}</style>
    </ConfigProvider>
  );
};

export default DefaulterList;
