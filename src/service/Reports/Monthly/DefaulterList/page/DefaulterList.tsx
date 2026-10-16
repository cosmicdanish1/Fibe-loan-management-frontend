import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Spin } from 'antd';
import { Printer, FileDown, Settings, RefreshCw, FileText, Search } from 'lucide-react';
import { apiService } from '../../../../../services/api';
import dayjs from 'dayjs';
import { csvCell } from '@/utils/csv';
import { escapeHtml } from '@/utils/html';
import { ReportShell, ParamCard, StatCards, OutputChoice, ReportEmpty } from '../../../../../components/reports/views/ReportShell';
import ReportViewSwitcher from '../../../../../components/reports/views/ReportViewSwitcher';
import { useReportViews } from '../../../../../components/reports/views/reportViews';
import '../../../../../components/reports/views/proViews.css';
import { useDefaulterSpec, ProBento, ProTerm, ProEd } from '../views/defaulterPro';

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

  const { enabled, view, setView } = useReportViews('monthly.defaulter-list');

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

  // Only the latest request may update state (stale responses are dropped).
  const requestIdRef = useRef(0);

  // Print / CSV must cover every matching record, not just the visible page.
  const fetchAllDefaulters = async (): Promise<DefaulterRecord[] | null> => {
    const response = await apiService.getDefaulterList(minBalance, Math.max(totalCount, 1), 0);
    if (!response.success || !response.data) return null;
    return ((response.data as DefaulterResponse).data) || [];
  };

  const fetchDefaulterList = async (balance?: number, page?: number, size?: number) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    const effectiveBalance = balance ?? minBalance;
    const effectivePage = page ?? currentPage;
    const effectiveSize = size ?? pageSize;
    try {
      const response = await apiService.getDefaulterList(effectiveBalance, effectiveSize, (effectivePage - 1) * effectiveSize);
      if (requestId !== requestIdRef.current) return;
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
      if (requestId !== requestIdRef.current) return;
      console.error('Error fetching defaulter list:', error);
      await showDialog('error', 'Fetch Error', 'Failed to load defaulter list');
      setData([]);
      setTotalCount(0);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDefaulterList();
  }, [currentPage, pageSize]);

  const generateReport = () => {
    const bal = Number(inputValue) || 0;
    setMinBalance(bal);
    if (currentPage !== 1) {
      // The [currentPage, pageSize] effect performs the single fetch.
      setCurrentPage(1);
    } else {
      fetchDefaulterList(bal, 1, pageSize);
    }
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
  const handlePrint = async () => {
    if (data.length === 0) return;
    let allRows: DefaulterRecord[] | null = null;
    try {
      allRows = await fetchAllDefaulters();
    } catch (error) {
      console.error('Error fetching all defaulters for print:', error);
    }
    if (!allRows) { await showDialog('error', 'Print Error', 'Failed to load all records for printing'); return; }
    const lines = buildDefaulterListLines(
      allRows, minBalance, 1, 1, 1,
      allRows.reduce((s, r) => s + (Number(r.loanAmount) || 0), 0),
      allRows.reduce((s, r) => s + (Number(r.balance) || 0), 0),
      allRows.reduce((s, r) => s + (Number(r.penalDue) || 0), 0),
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
</style></head><body><pre>${escapeHtml(lines.join('\n'))}</pre></body></html>`);
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
      const allRows = await fetchAllDefaulters();
      if (!allRows) { await showDialog('error', 'Export Error', 'Failed to load all records for export'); return; }
      let csv = 'Espat Karmchari Co-Operative Credit Society Limited\n';
      csv += 'Avenue A, Sahakari Sadan, Sector-6, AT Post: Bhilai Nagar, Dist: DURG-490006\n';
      csv += 'Reg No: A.R/DRG/1796, Tel No: 0788-2298736\n\nDEFAULTER LIST REPORT\n';
      csv += `Minimum Balance: Rs.${fmt(minBalance)}\nTotal Records: ${allRows.length}\n\n`;
      csv += 'Member No,Member Name,Loan Type,Case No,Loan Amount,Outstanding,Months Overdue,Penal Due\n';
      allRows.forEach(r => {
        csv += `${r.memberNo},${csvCell(r.memberName)},${r.loanType},${r.loanCaseNo},${r.loanAmount},${r.balance},${r.monthsOverdue || 0},${r.penalDue || 0}\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `DefaulterList_${dayjs().format('YYYY-MM-DD')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      await showDialog('info', 'Export Done', 'CSV exported successfully');
    } catch {
      await showDialog('error', 'Export Error', 'Failed to export CSV');
    }
  }, [data, minBalance, totalCount]);

  // Pro views read every matching defaulter, not only the visible page.
  const [allRows, setAllRows] = useState<DefaulterRecord[] | null>(null);
  const [allLoading, setAllLoading] = useState(false);
  const allKey = useRef('');
  useEffect(() => {
    if (view === 'legacy' || totalCount === 0) return;
    const key = `${minBalance}|${totalCount}`;
    if (allKey.current === key && allRows) return;
    let cancelled = false;
    setAllLoading(true);
    fetchAllDefaulters()
      .then(rows => { if (!cancelled && rows) { setAllRows(rows); allKey.current = key; } })
      .catch(() => { /* the Legacy view still works */ })
      .finally(() => { if (!cancelled) setAllLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, minBalance, totalCount]);

  const spec = useDefaulterSpec(allRows ?? [], minBalance);
  const proReady = !!allRows && allRows.length > 0 && !allLoading;
  const subtitle = `Minimum balance ₹${fmt(minBalance)}`;

  return (
    <ReportShell
      className="dfl-page"
      title="Defaulter List"
      desc="Loans with an outstanding balance, risk view"
      switcher={<ReportViewSwitcher enabled={enabled} value={view} onChange={setView} />}
      actions={
        <>
          <button type="button" className="aw-btn aw-btn-ghost" onClick={() => { setInputValue('10000'); setMinBalance(10000); setCurrentPage(1); fetchDefaulterList(10000, 1, pageSize); }}><RefreshCw size={14} /> Reset</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handleExportCSV} disabled={data.length === 0}><FileDown size={14} /> CSV</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handlePrint} disabled={data.length === 0}><Printer size={14} /> Print</button>
        </>
      }
      aside={
        <>
          <ParamCard title="Filter parameters" icon={<Settings size={14} />}>
            <div>
              <label className="aw-label" htmlFor="dfl-min">Minimum balance (₹)</label>
              <input id="dfl-min" type="number" className="aw-input" value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') generateReport(); }} />
              <span className="aw-meta">Higher values load faster</span>
            </div>
            <OutputChoice value={outputType} onChange={setOutputType} id="dfl-output" />
            <button type="button" className="aw-btn aw-btn-primary" onClick={generateReport} disabled={loading} style={{ width: '100%' }}>
              <Search size={14} className={loading ? 'aw-spin' : undefined} /> {loading ? 'Loading…' : 'Generate'}
            </button>
          </ParamCard>
          <StatCards items={[
            { label: 'Total records', value: String(totalCount), tone: 'muted' },
            { label: 'Page', value: `${currentPage} of ${totalPages}`, tone: 'muted' },
            { label: 'Defaulters on page', value: String(Math.round(animCount)), tone: 'muted' },
            { label: 'Total loan amount', value: fmt(Math.round(animLoan)), tone: 'info' },
            { label: 'Outstanding amount', value: fmt(Math.round(animOutstanding)), tone: 'danger' },
          ]} />
        </>
      }
      footerLeft="Defaulter List"
      footerRight={`Filter: ₹${fmt(minBalance)}`}
    >
      {view === 'bento' && proReady && <ProBento spec={spec} />}
      {view === 'terminal' && proReady && <div style={{ height: 'calc(100vh - 150px)', minHeight: 360 }}><ProTerm spec={spec} /></div>}
      {view === 'editorial' && proReady && <ProEd spec={spec} subtitle={subtitle} />}
      {view !== 'legacy' && !proReady && (
        <ReportEmpty icon={<FileText size={34} />} title={allLoading || loading ? 'Loading all defaulters…' : 'No defaulters found'} hint="Pro views list every matching loan, not just one page" />
      )}

      {view === 'legacy' && (
        <section className="aw-card dfl-report-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="aw-main-head dfl-noprint">
            <span className="aw-card-title">Defaulter Report</span>
            <span className="aw-meta">Min balance ₹{fmt(minBalance)} · Page {currentPage} of {totalPages}</span>
          </div>
          <div className="dfl-report" style={{ padding: 'var(--aw-pad)', overflow: 'auto' }}>
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
          <div className="dfl-noprint aw-main-foot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span className="aw-meta">Showing {rangeStart}–{rangeEnd} of {totalCount} defaulters</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <select value={pageSize} onChange={handlePageSizeChange} className="aw-input" style={{ width: 'auto' }} aria-label="Rows per page">
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </select>
              <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" onClick={() => setCurrentPage(1)} disabled={currentPage <= 1} aria-label="First page">«</button>
              <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} aria-label="Previous page">‹</button>
              <span className="aw-meta">{currentPage} / {totalPages}</span>
              <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} aria-label="Next page">›</button>
              <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage >= totalPages} aria-label="Last page">»</button>
            </div>
          </div>
        </section>
      )}

      <style>{`
        .dfl-serif { font-family: 'Source Serif 4', serif !important; }
        .dfl-mono  { font-family: 'IBM Plex Mono', monospace !important; }
        html.dark .dfl-report-tbl th { background: #0c0c0e !important; }
        html.dark .dfl-report-tbl tr { background: transparent !important; }
        html.dark .dfl-report-tbl td { color: #c8c3bc !important; border-color: rgba(255,255,255,.06) !important; }
      `}</style>
    </ReportShell>
  );
};

export default DefaulterList;
