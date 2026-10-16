import React, { useState, useEffect } from 'react';
import { DatePicker, Spin } from 'antd';
import { Printer, FileDown, Settings, RefreshCw, FileText } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';
import { apiService } from '../../../../../services/api';
import dayjs, { Dayjs } from 'dayjs';
import { CrDrIndicator } from '@/components/shared/CrDrIndicator';
import { csvCell, round2 } from '@/utils/csv';
import { escapeHtml } from '@/utils/html';
import { ReportShell, ParamCard, StatCards, OutputChoice, ReportEmpty } from '../../../../../components/reports/views/ReportShell';
import ReportViewSwitcher from '../../../../../components/reports/views/ReportViewSwitcher';
import { useReportViews } from '../../../../../components/reports/views/reportViews';
import '../../../../../components/reports/views/proViews.css';
import { useMonthSpec, MonthBento, MonthTerminal, MonthEditorial } from '../views/monthlyPro';

const showDialog = async (type: 'info' | 'warning' | 'error', title: string, detail: string): Promise<void> => {
  if ((window as any).electronAPI?.showMessageBox) {
    await (window as any).electronAPI.showMessageBox({ type, title: 'electron-react-ts', message: title, detail, buttons: ['OK'], defaultId: 0 });
  }
};

interface CashBookData {
  key: string;
  code: string;
  headName: string;
  receipt: number;
  payment: number;
}

// Print-only layout matching the legacy report design standard used across
// every report this session (letterhead, Date/Page Number line, dashed
// rules, TOTAL row, summary block) — plain monospace text, not a clone of
// the on-screen colorful UI. Feeds handlePrint only.
const CBM_LINE_W = 78;
const CBM_DASH = '-'.repeat(CBM_LINE_W);
const CBM_COL_CODE = 12;
const CBM_COL_NAME = 38;
const CBM_COL_AMT = (CBM_LINE_W - CBM_COL_CODE - CBM_COL_NAME) / 2;

const cbmFmt = (n: number) =>
  Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const cbmFmtSigned = (n: number) => (n < 0 ? '-' : '') + cbmFmt(n);
const cbmPadL = (s: string, w: number) => s.padStart(w);
const cbmPadR = (s: string, w: number) => (s.length > w ? s.slice(0, w) : s.padEnd(w));
const cbmCenter = (s: string, w: number) => ' '.repeat(Math.max(0, Math.floor((w - s.length) / 2))) + s;

function buildCashBookMonthlyLines(
  data: CashBookData[], monthLabel: string,
  openingBalance: number, totalReceipt: number, totalPayment: number, closingBalance: number,
): string[] {
  const lines: string[] = [];
  const now = dayjs().format('DD-MMM-YYYY/h:mmA');

  lines.push(cbmCenter('Espat Karmchari Co-Operative Credit Society Limited.', CBM_LINE_W));
  lines.push(cbmCenter('Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006', CBM_LINE_W));
  lines.push(cbmCenter('Cash Book Monthly', CBM_LINE_W));
  lines.push('');
  lines.push(`For the Month : ${monthLabel}`);
  const printedStr = `Printed : ${now}`;
  const pageStr = 'Page Number :  1';
  lines.push(`${printedStr}${cbmPadL(pageStr, CBM_LINE_W - printedStr.length)}`);
  lines.push(CBM_DASH);

  lines.push(
    `${cbmPadR('Code', CBM_COL_CODE)}${cbmPadR('Head Name', CBM_COL_NAME)}${cbmPadL('Receipt', CBM_COL_AMT)}${cbmPadL('Payment', CBM_COL_AMT)}`
  );
  lines.push(CBM_DASH);

  data.forEach(item => {
    lines.push(
      `${cbmPadR(item.code, CBM_COL_CODE)}${cbmPadR(item.headName, CBM_COL_NAME)}` +
      `${cbmPadL(item.receipt > 0 ? cbmFmt(item.receipt) : '', CBM_COL_AMT)}` +
      `${cbmPadL(item.payment > 0 ? cbmFmt(item.payment) : '', CBM_COL_AMT)}`
    );
  });

  lines.push(CBM_DASH);
  lines.push(
    `${cbmPadR('TOTAL :-', CBM_COL_CODE + CBM_COL_NAME)}${cbmPadL(cbmFmt(totalReceipt), CBM_COL_AMT)}${cbmPadL(cbmFmt(totalPayment), CBM_COL_AMT)}`
  );
  lines.push(CBM_DASH);

  const IND = '        ';
  const LBL_W = 18;
  const VAL_W = 20;
  lines.push(`${IND}${'Opening Balance :'.padEnd(LBL_W)} ${cbmPadL(cbmFmtSigned(openingBalance), VAL_W)}`);
  lines.push(`${IND}${'Total Credit    :'.padEnd(LBL_W)} ${cbmPadL(cbmFmt(totalReceipt), VAL_W)}`);
  lines.push(`${IND}${'Total           :'.padEnd(LBL_W)} ${cbmPadL(cbmFmtSigned(openingBalance + totalReceipt), VAL_W)}`);
  lines.push(`${IND}${'Total Debit     :'.padEnd(LBL_W)} ${cbmPadL(cbmFmt(totalPayment), VAL_W)}`);
  lines.push(`${IND}${'-'.repeat(LBL_W + VAL_W + 1)}`);
  lines.push(`${IND}${'Closing Balance :'.padEnd(LBL_W)} ${cbmPadL(cbmFmtSigned(closingBalance), VAL_W)}`);
  lines.push(`${IND}${'-'.repeat(LBL_W + VAL_W + 1)}`);
  lines.push('');
  lines.push('* Report As Per Data Available ..');

  return lines;
}

const CashBookMonthly: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState<Dayjs | null>(dayjs());
  const [outputType, setOutputType] = useState<'screen' | 'printer'>('screen');
  const [data, setData] = useState<CashBookData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [closingBalance, setClosingBalance] = useState<number>(0);

  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark';
  const { enabled, view, setView } = useReportViews('monthly.cash-book');

  useEffect(() => {
    fetchCashBookData();
  }, [selectedMonth]);

  const fetchCashBookData = async () => {
    if (!selectedMonth) return;
    setLoading(true);

    const month = selectedMonth.format('MMM');
    const year = selectedMonth.year();

    try {
      const response = await apiService.getCashBookMonthly(month, year);
      if (response.success && response.data && Array.isArray(response.data.data)) {
        setData(response.data.data);
        setOpeningBalance(parseFloat(response.data.openingBalance) || 0);
        setClosingBalance(parseFloat(response.data.closingBalance) || 0);
      } else {
        setData([]);
        setOpeningBalance(0);
        setClosingBalance(0);
      }
    } catch (error) {
      console.error('Error fetching cash book data:', error);
      await showDialog('error', 'Fetch Error', 'Failed to fetch data from server');
      setData([]);
      setOpeningBalance(0);
      setClosingBalance(0);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    const totalReceipt = data.reduce((sum, item) => sum + (Number(item.receipt) || 0), 0);
    const totalPayment = data.reduce((sum, item) => sum + (Number(item.payment) || 0), 0);
    return { totalReceipt, totalPayment };
  };

  const { totalReceipt, totalPayment } = calculateTotals();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // window.print() used to be used here with a visibility-hiding CSS hack —
  // the print box was 7.5in wide inside an 8.27in-wide A4 page with 0.5in
  // margins on both the @page rule and the box's own padding, leaving only
  // 7.27in of usable width for a 7.5in box. Confirmed live: columns clipped
  // at the left edge and the Payment column fell off the page entirely.
  // Switched to the same hidden-iframe + monospace lines[] technique
  // already proven working for every other report's print this session.
  const handlePrint = () => {
    if (data.length === 0) return;
    const lines = buildCashBookMonthlyLines(
      data, selectedMonth?.format('MMM-YYYY') || '',
      openingBalance, totalReceipt, totalPayment, closingBalance,
    );
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><title>Cash Book Monthly</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  body { margin: 0; }
  pre { font-family: 'Courier New', Courier, monospace; font-size: 9pt; white-space: pre; width: fit-content; margin: 0 auto; }
</style></head><body><pre>${escapeHtml(lines.join('\n'))}</pre></body></html>`);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 300);
    }
  };

  const handleExportCSV = async () => {
    if (data.length === 0) {
      await showDialog('warning', 'No Data', 'No data to export');
      return;
    }

    try {
      let csvContent = '';
      
      csvContent += 'Espat Karmchari Co-Operative Credit Society Limited\n';
      csvContent += 'Avenue A, Sahakari Sadan, Sector-C, AT Post: Bhilai Nagar, Dist: DURG-490006\n';
      csvContent += 'Reg No : A.R/DRG/1796, Tel No : 0788-2298736\n\n';
      csvContent += 'CASH BOOK MONTHLY REPORT\n';
      csvContent += `Period: ${selectedMonth?.format('MMMM YYYY') || '-'}\n\n`;
      
      csvContent += 'Code,Head Name,Receipt,Payment\n';
      
      data.forEach(item => {
        csvContent += `${item.code},${csvCell(item.headName)},${item.receipt},${item.payment}\n`;
      });
      
      csvContent += `\nTotal,,${round2(totalReceipt)},${round2(totalPayment)}\n`;
      csvContent += `\nOpening Balance,,${round2(openingBalance)},\n`;
      csvContent += `Total (Opening + Receipts),,${round2(openingBalance + totalReceipt)},\n`;
      csvContent += `Closing Balance (Total - Payments),,${round2(closingBalance)},\n`;
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `CashBookMonthly_${selectedMonth?.format('YYYY-MM')}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      await showDialog('info', 'Export Done', 'CSV exported successfully');
    } catch (error) {
      await showDialog('error', 'Export Error', 'Failed to export CSV');
      console.error('Export error:', error);
    }
  };

  const spec = useMonthSpec(data, openingBalance, closingBalance, totalReceipt, totalPayment);
  const monthLabel = selectedMonth?.format('MMMM YYYY') || '';

  return (
    <ReportShell
      className="cbm-page"
      title="Cash Book Monthly"
      desc="Monthly summary by account head"
      switcher={<ReportViewSwitcher enabled={enabled} value={view} onChange={setView} />}
      actions={
        <>
          <button type="button" className="aw-btn aw-btn-ghost" onClick={() => setSelectedMonth(dayjs())}><RefreshCw size={14} /> Reset</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handleExportCSV} disabled={data.length === 0}><FileDown size={14} /> CSV</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handlePrint} disabled={data.length === 0}><Printer size={14} /> Print</button>
        </>
      }
      aside={
        <>
          <ParamCard title="Parameters" icon={<Settings size={14} />}>
            <div>
              <label className="aw-label" htmlFor="cbm-month">Month</label>
              <DatePicker id="cbm-month" picker="month" className="aw-picker" popupClassName="aw-select-popup" style={{ width: '100%' }} value={selectedMonth} onChange={v => v && setSelectedMonth(v)} format="MMMM YYYY" allowClear={false} />
            </div>
            <OutputChoice value={outputType} onChange={setOutputType} id="cbm-output" />
            <button type="button" className="aw-btn aw-btn-primary" onClick={fetchCashBookData} disabled={loading} style={{ width: '100%' }}>
              <RefreshCw size={14} className={loading ? 'aw-spin' : undefined} /> {loading ? 'Loading…' : 'Load'}
            </button>
          </ParamCard>
          {data.length > 0 && <StatCards items={[
            { label: 'Net balance', value: formatCurrency(totalReceipt - totalPayment), tone: 'muted' },
            { label: 'Receipts', value: formatCurrency(totalReceipt), tone: 'success' },
            { label: 'Payments', value: formatCurrency(totalPayment), tone: 'danger' },
          ]} />}
        </>
      }
      footerLeft="Cash Book Monthly"
      footerRight={monthLabel}
    >
      {data.length > 0 && view === 'bento' && <MonthBento spec={spec} />}
      {data.length > 0 && view === 'terminal' && <div style={{ height: 'calc(100vh - 150px)', minHeight: 360 }}><MonthTerminal spec={spec} /></div>}
      {data.length > 0 && view === 'editorial' && <MonthEditorial spec={spec} month={monthLabel} />}

      {view === 'legacy' && (
        <section className="aw-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="aw-main-head">
            <span className="aw-card-title">Monthly Ledger · {monthLabel}</span>
          </div>
          <div className="cbm-preview-body" style={{ padding: 'var(--aw-pad)', overflow: 'auto' }}>
            <Spin spinning={loading} tip="Loading..." size="small">
              {data.length > 0 ? (
                <div className="legacy-report-compact fz-caption">
                    {/* Company Header - Legacy Style */}
                    <div className="text-center mb-4 pb-3" style={{ borderBottom: `2px solid ${isDark ? '#4b5563' : '#999'}` }}>
                      <div className={`fz-body font-bold ${isDark ? 'text-indigo-400' : 'text-blue-700'}`}>Espat Karmchari Co-Operative Credit Society Limited.</div>
                      <div className={`fz-caption ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006</div>
                    </div>

                    {/* Report Title */}
                    <div className="text-center mb-3">
                      <div className={`fz-caption font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Select For the Month: <span className={isDark ? 'text-indigo-400' : 'text-blue-700'}>{selectedMonth?.format('MMM-YYYY')}</span>
                      </div>
                    </div>

                    {/* Legacy Table - Matching MSSQL Format */}
                    <table className="w-full fz-caption border-collapse" style={{ border: `1px solid ${isDark ? '#374151' : '#999'}` }}>
                      <thead>
                        <tr style={{ backgroundColor: isDark ? '#1f2937' : '#e8e8e8' }}>
                          <th className={`text-left py-2 px-3 font-bold ${isDark ? 'text-rose-400' : 'text-red-700'}`} style={{ border: `1px solid ${isDark ? '#374151' : '#999'}`, width: '100px' }}>CODE</th>
                          <th className={`text-left py-2 px-3 font-bold ${isDark ? 'text-rose-400' : 'text-red-700'}`} style={{ border: `1px solid ${isDark ? '#374151' : '#999'}` }}>HEAD NAME</th>
                          <th className={`text-right py-2 px-3 font-bold ${isDark ? 'text-rose-400' : 'text-red-700'}`} style={{ border: `1px solid ${isDark ? '#374151' : '#999'}`, width: '150px' }}>RECEIPT</th>
                          <th className={`text-right py-2 px-3 font-bold ${isDark ? 'text-rose-400' : 'text-red-700'}`} style={{ border: `1px solid ${isDark ? '#374151' : '#999'}`, width: '150px' }}>PAYMENT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((item, idx) => (
                          <tr key={idx} style={{ backgroundColor: isDark ? (idx % 2 === 0 ? '#1e293b' : '#0f172a') : (idx % 2 === 0 ? '#fff' : '#f9f9f9') }}>
                            <td className={`py-1.5 px-3 font-semibold ${isDark ? 'text-indigo-400' : 'text-blue-700'}`} style={{ border: `1px solid ${isDark ? '#374151' : '#ccc'}` }}>{item.code}</td>
                            <td className={`py-1.5 px-3 font-semibold ${isDark ? 'text-indigo-400' : 'text-blue-700'}`} style={{ border: `1px solid ${isDark ? '#374151' : '#ccc'}` }}>{item.headName}</td>
                            <td className={`text-right py-1.5 px-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`} style={{ border: `1px solid ${isDark ? '#374151' : '#ccc'}` }}>
                              {item.receipt > 0 ? (<><CrDrIndicator type="credit" className="mr-1" />{formatCurrency(item.receipt)}</>) : '0.00'}
                            </td>
                            <td className={`text-right py-1.5 px-3 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`} style={{ border: `1px solid ${isDark ? '#374151' : '#ccc'}` }}>
                              {item.payment > 0 ? (<><CrDrIndicator type="debit" className="mr-1" />{formatCurrency(item.payment)}</>) : '0.00'}
                            </td>
                          </tr>
                        ))}
                        <tr style={{ backgroundColor: isDark ? '#1e293b' : '#fff' }}>
                          <td colSpan={2} className="py-2 px-3" style={{ border: `1px solid ${isDark ? '#374151' : '#999'}` }}></td>
                          <td className={`text-right py-2 px-3 font-black fz-body ${isDark ? 'text-rose-400' : 'text-red-700'}`} style={{ border: `1px solid ${isDark ? '#374151' : '#999'}` }}>
                            {totalReceipt > 0 && <CrDrIndicator type="credit" className="mr-1" />}{formatCurrency(totalReceipt)}
                          </td>
                          <td className={`text-right py-2 px-3 font-black fz-body ${isDark ? 'text-rose-400' : 'text-red-700'}`} style={{ border: `1px solid ${isDark ? '#374151' : '#999'}` }}>
                            {totalPayment > 0 && <CrDrIndicator type="debit" className="mr-1" />}{formatCurrency(totalPayment)}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Summary - Legacy Style */}
                    <div className="mt-4">
                      <table className="fz-caption ml-auto" style={{ width: 'auto' }}>
                        <tbody>
                          <tr>
                            <td className={`text-right py-1 px-4 font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Opening Balance :</td>
                            <td className={`text-right py-1 px-4 font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`} style={{ minWidth: '150px' }}>
                              {formatCurrency(openingBalance)}
                            </td>
                          </tr>
                          <tr>
                            <td className={`text-right py-1 px-4 font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Total Credit :</td>
                            <td className={`text-right py-1 px-4 font-bold ${isDark ? 'text-rose-400' : 'text-red-700'}`}>
                              {totalReceipt > 0 && <CrDrIndicator type="credit" className="mr-1" />}{formatCurrency(totalReceipt)}
                            </td>
                          </tr>
                          <tr style={{ borderTop: `1px solid ${isDark ? '#374151' : '#999'}` }}>
                            <td className={`text-right py-1 px-4 font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Total :</td>
                            <td className={`text-right py-1 px-4 font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                              {formatCurrency(openingBalance + totalReceipt)}
                            </td>
                          </tr>
                          <tr>
                            <td className={`text-right py-1 px-4 font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Total Debit :</td>
                            <td className={`text-right py-1 px-4 font-bold ${isDark ? 'text-rose-400' : 'text-red-700'}`}>
                              {totalPayment > 0 && <CrDrIndicator type="debit" className="mr-1" />}{formatCurrency(totalPayment)}
                            </td>
                          </tr>
                          <tr style={{ borderTop: `1px solid ${isDark ? '#374151' : '#999'}` }}>
                            <td className={`text-right py-1 px-4 font-black ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Closing Balance :</td>
                            <td className={`text-right py-1 px-4 font-black ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                              {formatCurrency(closingBalance)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
              ) : (
                <ReportEmpty icon={<FileText size={34} />} title="No Transactions" hint={`No data for ${monthLabel}`} />
              )}
            </Spin>
          </div>
        </section>
      )}
      {view !== 'legacy' && data.length === 0 && (
        <ReportEmpty icon={<FileText size={34} />} title={loading ? 'Loading…' : 'No Transactions'} hint={`No data for ${monthLabel}`} />
      )}

      <style>{`
        .cbm-page .legacy-report-compact { max-width: 100%; margin: 0 auto; }
        html.dark .cbm-page .legacy-report-compact { color: #f5f5f7 !important; }
        html.dark .cbm-page .legacy-report-compact table,
        html.dark .cbm-page .legacy-report-compact th,
        html.dark .cbm-page .legacy-report-compact td,
        html.dark .cbm-page .legacy-report-compact tr { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.15) !important; color: #f5f5f7 !important; }
      `}</style>
    </ReportShell>
  );
};

export default CashBookMonthly;
