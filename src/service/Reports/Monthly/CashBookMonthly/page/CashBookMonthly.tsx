import React, { useState, useEffect } from 'react';
import { DatePicker } from 'antd';
import { Printer, FileDown, Settings, RefreshCw, FileText } from 'lucide-react';
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
import { showDialog3 as showDialog } from '@/utils/dialog';

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
          <div style={{ padding: 'var(--aw-pad)', overflow: 'auto' }}>
              {data.length > 0 ? (
                <div>
                  <div className="aw-stack" style={{ textAlign: 'center', gap: 2, marginBottom: 12 }}>
                    <div className="aw-strong">Espat Karmchari Co-Operative Credit Society Limited.</div>
                    <div className="aw-meta">Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006</div>
                    <div className="aw-meta">For the month: <b>{selectedMonth?.format('MMM-YYYY')}</b></div>
                  </div>
                  <div className="aw-table-wrap" style={{ maxHeight: 'none' }}>
                    <table className="aw-table">
                      <thead>
                        <tr><th>Code</th><th>Head name</th><th className="is-right">Receipt</th><th className="is-right">Payment</th></tr>
                      </thead>
                      <tbody>
                        {data.map((item, idx) => (
                          <tr key={idx}>
                            <td className="is-accent">{item.code}</td>
                            <td>{item.headName}</td>
                            <td className="is-right">{item.receipt > 0 ? (<><CrDrIndicator type="credit" className="mr-1" />{formatCurrency(item.receipt)}</>) : '0.00'}</td>
                            <td className="is-right">{item.payment > 0 ? (<><CrDrIndicator type="debit" className="mr-1" />{formatCurrency(item.payment)}</>) : '0.00'}</td>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={2}><b>Total</b></td>
                          <td className="is-right"><b>{totalReceipt > 0 && <CrDrIndicator type="credit" className="mr-1" />}{formatCurrency(totalReceipt)}</b></td>
                          <td className="is-right"><b>{totalPayment > 0 && <CrDrIndicator type="debit" className="mr-1" />}{formatCurrency(totalPayment)}</b></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="aw-table-wrap" style={{ maxHeight: 'none', width: 'fit-content', marginLeft: 'auto', marginTop: 12 }}>
                    <table className="aw-table">
                      <tbody>
                        <tr><td className="is-right">Opening balance</td><td className="is-right">{formatCurrency(openingBalance)}</td></tr>
                        <tr><td className="is-right">Total credit</td><td className="is-right">{totalReceipt > 0 && <CrDrIndicator type="credit" className="mr-1" />}{formatCurrency(totalReceipt)}</td></tr>
                        <tr><td className="is-right">Total</td><td className="is-right">{formatCurrency(openingBalance + totalReceipt)}</td></tr>
                        <tr><td className="is-right">Total debit</td><td className="is-right">{totalPayment > 0 && <CrDrIndicator type="debit" className="mr-1" />}{formatCurrency(totalPayment)}</td></tr>
                        <tr><td className="is-right"><b>Closing balance</b></td><td className="is-right"><b>{formatCurrency(closingBalance)}</b></td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <ReportEmpty icon={<FileText size={34} />} title="No Transactions" hint={`No data for ${monthLabel}`} />
              )}
          </div>
        </section>
      )}
      {view !== 'legacy' && data.length === 0 && (
        <ReportEmpty icon={<FileText size={34} />} title={loading ? 'Loading…' : 'No Transactions'} hint={`No data for ${monthLabel}`} />
      )}

    </ReportShell>
  );
};

export default CashBookMonthly;
