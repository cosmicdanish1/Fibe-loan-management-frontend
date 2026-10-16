import React, { useState, useEffect } from 'react';
import { DatePicker, Select, Spin } from 'antd';
import { Printer, FileDown, Settings, RefreshCw, FileText, Search } from 'lucide-react';
import dayjs, { Dayjs } from 'dayjs';
import { apiService } from '../../../../../services/api';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';
import { CrDrIndicator } from '@/components/shared/CrDrIndicator';
import { csvCell } from '@/utils/csv';
import { escapeHtml } from '@/utils/html';
import { isFromAfterTo } from '@/utils/dates';
import { ReportShell, ParamCard, StatCards, OutputChoice, ReportEmpty } from '../../../../../components/reports/views/ReportShell';
import ReportViewSwitcher from '../../../../../components/reports/views/ReportViewSwitcher';
import { useReportViews } from '../../../../../components/reports/views/reportViews';
import '../../../../../components/reports/views/proViews.css';
import { useDetailSpec, ProBento, ProTerm, ProEd } from '../views/ledgerPro';

const showDialog = async (type: 'info' | 'warning' | 'error', title: string, detail: string): Promise<void> => {
  if ((window as any).electronAPI?.showMessageBox) {
    await (window as any).electronAPI.showMessageBox({ type, title: 'electron-react-ts', message: title, detail, buttons: ['OK'], defaultId: 0 });
  }
};


interface LedgerTransaction {
  key: string;
  date: string;
  voucherNo: string;
  narration: string;
  debit: number;
  credit: number;
  balance: number;
}

interface HeadOption {
  code: string;
  name: string;
}

// Print-only layout matching the legacy report design standard used across
// every report this session (letterhead, Date/Page Number line, dashed
// rules, TOTAL row, summary block) — plain monospace text, not a clone of
// the on-screen colorful UI. Feeds handlePrint only.
const DTL_LINE_W = 94;
const DTL_DASH = '-'.repeat(DTL_LINE_W);
const DTL_COL_DATE = 12;
const DTL_COL_VCHR = 12;
const DTL_COL_NARR = 30;
const DTL_COL_AMT = (DTL_LINE_W - DTL_COL_DATE - DTL_COL_VCHR - DTL_COL_NARR) / 3;

const dtlFmt = (n: number) =>
  Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dtlPadL = (s: string, w: number) => s.padStart(w);
const dtlPadR = (s: string, w: number) => (s.length > w ? s.slice(0, w) : s.padEnd(w));
const dtlCenter = (s: string, w: number) => ' '.repeat(Math.max(0, Math.floor((w - s.length) / 2))) + s;

function buildDetailLedgerLines(
  data: LedgerTransaction[], headCode: string, headName: string,
  fromLabel: string, toLabel: string,
  totalDebit: number, totalCredit: number, closingBalance: number,
): string[] {
  const lines: string[] = [];
  const now = dayjs().format('DD-MMM-YYYY/h:mmA');

  lines.push(dtlCenter('Espat Karmchari Co-Operative Credit Society Limited.', DTL_LINE_W));
  lines.push(dtlCenter('Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006', DTL_LINE_W));
  lines.push(dtlCenter('Detail Ledger', DTL_LINE_W));
  lines.push('');
  lines.push(`Account : ${headCode} - ${headName}`);
  lines.push(`Period  : ${fromLabel} to ${toLabel}`);
  const printedStr = `Printed : ${now}`;
  const pageStr = 'Page Number :  1';
  lines.push(`${printedStr}${dtlPadL(pageStr, DTL_LINE_W - printedStr.length)}`);
  lines.push(DTL_DASH);

  lines.push(
    `${dtlPadR('Date', DTL_COL_DATE)}${dtlPadR('Voucher', DTL_COL_VCHR)}${dtlPadR('Narration', DTL_COL_NARR)}` +
    `${dtlPadL('Debit', DTL_COL_AMT)}${dtlPadL('Credit', DTL_COL_AMT)}${dtlPadL('Balance', DTL_COL_AMT)}`
  );
  lines.push(DTL_DASH);

  data.forEach(item => {
    lines.push(
      `${dtlPadR(dayjs(item.date).format('DD-MMM-YY'), DTL_COL_DATE)}${dtlPadR(item.voucherNo, DTL_COL_VCHR)}${dtlPadR(item.narration, DTL_COL_NARR)}` +
      `${dtlPadL(item.debit > 0 ? dtlFmt(item.debit) : '', DTL_COL_AMT)}` +
      `${dtlPadL(item.credit > 0 ? dtlFmt(item.credit) : '', DTL_COL_AMT)}` +
      `${dtlPadL(`${dtlFmt(item.balance)} ${item.balance >= 0 ? 'DR' : 'CR'}`, DTL_COL_AMT)}`
    );
  });

  lines.push(DTL_DASH);
  lines.push(
    `${dtlPadR('TOTAL :-', DTL_COL_DATE + DTL_COL_VCHR + DTL_COL_NARR)}` +
    `${dtlPadL(dtlFmt(totalDebit), DTL_COL_AMT)}${dtlPadL(dtlFmt(totalCredit), DTL_COL_AMT)}${' '.repeat(DTL_COL_AMT)}`
  );
  lines.push(DTL_DASH);

  const IND = '        ';
  const LBL_W = 18;
  const VAL_W = 20;
  lines.push(`${IND}${'Total Debit     :'.padEnd(LBL_W)} ${dtlPadL(dtlFmt(totalDebit), VAL_W)}`);
  lines.push(`${IND}${'Total Credit    :'.padEnd(LBL_W)} ${dtlPadL(dtlFmt(totalCredit), VAL_W)}`);
  lines.push(`${IND}${'-'.repeat(LBL_W + VAL_W + 1)}`);
  lines.push(`${IND}${'Closing Balance :'.padEnd(LBL_W)} ${dtlPadL(`${dtlFmt(closingBalance)} ${closingBalance >= 0 ? 'DR' : 'CR'}`, VAL_W)}`);
  lines.push(`${IND}${'-'.repeat(LBL_W + VAL_W + 1)}`);
  lines.push('');
  lines.push('* Report As Per Data Available ..');

  return lines;
}

const DetailLedger: React.FC = () => {
  const [selectedHead, setSelectedHead] = useState<string>('');
  const [headList, setHeadList] = useState<HeadOption[]>([]);
  const [fromDate, setFromDate] = useState<Dayjs | null>(dayjs().startOf('month'));
  const [toDate, setToDate] = useState<Dayjs | null>(dayjs());
  const [outputType, setOutputType] = useState<'screen' | 'printer'>('screen');
  const [data, setData] = useState<LedgerTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [headName, setHeadName] = useState<string>('');

  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark';
  const { enabled, view, setView } = useReportViews('monthly.detail-ledger');

  useEffect(() => {
    fetchHeadList();
  }, []);

  const fetchHeadList = async () => {
    try {
      const response = await apiService.getHeadList();
      if (response.success && Array.isArray(response.data)) {
        setHeadList(response.data);
      }
    } catch (error) {
      console.error('Error fetching head list:', error);
      await showDialog('error', 'Load Error', 'Failed to load account heads');
    }
  };

  const fetchLedgerData = async () => {
    if (!selectedHead) {
      await showDialog('warning', 'Validation', 'Please select an account head');
      return;
    }
    if (!fromDate || !toDate) {
      await showDialog('warning', 'Validation', 'Please select date range');
      return;
    }

    if (fromDate && toDate && isFromAfterTo(fromDate.format('YYYY-MM-DD'), toDate.format('YYYY-MM-DD'))) {
      await showDialog('warning', 'Validation', 'From date cannot be after To date');
      return;
    }
    setLoading(true);
    try {
      const response = await apiService.getDetailLedger(
        selectedHead,
        fromDate.format('YYYY-MM-DD'),
        toDate.format('YYYY-MM-DD')
      );

      if (response.success && response.data) {
        setData(response.data.transactions || []);
        setHeadName(response.data.headName || '');
      } else {
        setData([]);
        await showDialog('error', 'Load Error', 'Failed to load ledger data');
      }
    } catch (error) {
      console.error('Error fetching ledger data:', error);
      await showDialog('error', 'Fetch Error', 'An error occurred while fetching data');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    const totalDebit = data.reduce((sum, item) => sum + (Number(item.debit) || 0), 0);
    const totalCredit = data.reduce((sum, item) => sum + (Number(item.credit) || 0), 0);
    const closingBalance = data.length > 0 ? (Number(data[data.length - 1]?.balance) || 0) : 0;
    return { totalDebit, totalCredit, closingBalance };
  };

  const { totalDebit, totalCredit, closingBalance } = calculateTotals();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // window.print() used to be used here with a visibility-hiding CSS hack —
  // the print box was 7.5in wide inside an 8.27in-wide A4 page with 0.5in
  // margins on both the @page rule and the box's own padding, leaving only
  // 7.27in of usable width for a 7.5in box — the same overflow bug already
  // confirmed live and fixed on Cash Book Monthly. Switched to the same
  // hidden-iframe + monospace lines[] technique used everywhere else.
  const handlePrint = () => {
    if (data.length === 0) return;
    const lines = buildDetailLedgerLines(
      data, selectedHead, headName,
      fromDate?.format('DD-MMM-YYYY') || '', toDate?.format('DD-MMM-YYYY') || '',
      totalDebit, totalCredit, closingBalance,
    );
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><title>Detail Ledger</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  body { margin: 0; }
  pre { font-family: 'Courier New', Courier, monospace; font-size: 8.5pt; white-space: pre; width: fit-content; margin: 0 auto; }
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
      csvContent += 'DETAIL LEDGER REPORT\n';
      csvContent += `Account: ${headName} [${selectedHead}]\n`;
      csvContent += `Period: ${fromDate?.format('DD-MMM-YYYY')} to ${toDate?.format('DD-MMM-YYYY')}\n\n`;
      
      csvContent += 'Date,Voucher No,Narration,Debit,Credit,Balance\n';
      
      data.forEach(item => {
        csvContent += `${dayjs(item.date).format('DD-MMM-YYYY')},${csvCell(item.voucherNo)},${csvCell(item.narration)},${item.debit},${item.credit},${item.balance}\n`;
      });
      
      csvContent += `\nTotal,,,${totalDebit},${totalCredit},${closingBalance}\n`;
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `DetailLedger_${selectedHead}_${fromDate?.format('YYYY-MM-DD')}_${toDate?.format('YYYY-MM-DD')}.csv`);
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

  const spec = useDetailSpec(data, `${selectedHead} ${headName}`.trim(), totalDebit, totalCredit, closingBalance);

  return (
    <ReportShell
      className="dtl-page"
      title="Detail Ledger"
      desc="Transactions of one account head"
      switcher={<ReportViewSwitcher enabled={enabled} value={view} onChange={setView} />}
      actions={
        <>
          <button type="button" className="aw-btn aw-btn-ghost" onClick={() => { setSelectedHead(''); setHeadName(''); setData([]); setFromDate(dayjs().startOf('month')); setToDate(dayjs()); }}><RefreshCw size={14} /> Reset</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handleExportCSV} disabled={data.length === 0}><FileDown size={14} /> CSV</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handlePrint} disabled={data.length === 0}><Printer size={14} /> Print</button>
        </>
      }
      aside={
        <>
          <ParamCard title="Parameters" icon={<Settings size={14} />}>
            <div>
              <label className="aw-label" htmlFor="dtl-head">Account head</label>
              <Select id="dtl-head" {...(selectedHead ? { value: selectedHead } : {})} onChange={(v: string) => setSelectedHead(v)} className="aw-select" popupClassName="aw-select-popup" placeholder="Search by code or name…" showSearch
                filterOption={(input, option) => String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                options={headList.map(h => ({ value: h.code, label: `${h.code} - ${h.name}` }))} />
            </div>
            <div>
              <label className="aw-label" htmlFor="dtl-from">From date</label>
              <DatePicker id="dtl-from" className="aw-picker" popupClassName="aw-select-popup" style={{ width: '100%' }} value={fromDate} onChange={v => v && setFromDate(v)} format="DD-MMM-YYYY" allowClear={false} />
            </div>
            <div>
              <label className="aw-label" htmlFor="dtl-to">To date</label>
              <DatePicker id="dtl-to" className="aw-picker" popupClassName="aw-select-popup" style={{ width: '100%' }} value={toDate} onChange={v => v && setToDate(v)} format="DD-MMM-YYYY" allowClear={false} />
            </div>
            <OutputChoice value={outputType} onChange={setOutputType} id="dtl-page-output" />
            <button type="button" className="aw-btn aw-btn-primary" onClick={fetchLedgerData} disabled={loading} style={{ width: '100%' }}>
              <Search size={14} className={loading ? 'aw-spin' : undefined} /> {loading ? 'Loading…' : 'Load Report'}
            </button>
          </ParamCard>
          {data.length > 0 && <StatCards items={[{ label: 'Closing', value: `${formatCurrency(Math.abs(closingBalance))} ${closingBalance >= 0 ? 'DR' : 'CR'}`, tone: 'muted' }, { label: 'Debit', value: formatCurrency(totalDebit), tone: 'danger' }, { label: 'Credit', value: formatCurrency(totalCredit), tone: 'success' }]} />}
        </>
      }
      footerLeft="Detail Ledger"
      footerRight={headName || 'Select account'}
    >
      {data.length > 0 && view === 'bento' && <ProBento spec={spec} />}
      {data.length > 0 && view === 'terminal' && <div style={{ height: 'calc(100vh - 150px)', minHeight: 360 }}><ProTerm spec={spec} /></div>}
      {data.length > 0 && view === 'editorial' && <ProEd spec={spec} subtitle={`${fromDate?.format('DD-MMM-YYYY')} to ${toDate?.format('DD-MMM-YYYY')}`} />}

      {view === 'legacy' && (
        <section className="aw-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="aw-main-head">
            <span className="aw-card-title">Ledger Report</span>
            <span className="aw-meta">{headName || 'Select account'}</span>
          </div>
          <div className="dtl-page-preview-body" style={{ padding: 'var(--aw-pad)', overflow: 'auto' }}>
            <Spin spinning={loading} tip="Loading..." size="small">
              {data.length > 0 ? (
                <div className="legacy-report-compact fz-caption">
                    {/* Company Header - Legacy Style */}
                    <div className="text-center mb-4 pb-3" style={{ borderBottom: '2px solid #999' }}>
                      <div className="fz-body font-bold text-blue-700">Espat Karmchari Co-Operative Credit Society Limited.</div>
                      <div className="fz-caption text-slate-700">Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006</div>
                    </div>

                    {/* Report Title */}
                    <div className="text-center mb-3">
                      <div className="fz-caption font-bold text-slate-700">
                        Account: <span className="text-blue-700">{selectedHead} - {headName}</span>
                      </div>
                      <div className="fz-caption text-slate-600">
                        Period: {fromDate?.format('DD-MMM-YYYY')} to {toDate?.format('DD-MMM-YYYY')}
                      </div>
                    </div>

                    {/* Legacy Table - Matching MSSQL Format */}
                    <table className="w-full fz-caption border-collapse" style={{ border: '1px solid #999' }}>
                      <thead>
                        <tr style={{ backgroundColor: isDark ? '#1f2937' : '#e8e8e8' }}>
                          <th className="text-left py-2 px-3 font-bold text-red-700" style={{ border: '1px solid #999', width: '100px' }}>DATE</th>
                          <th className="text-left py-2 px-3 font-bold text-red-700" style={{ border: '1px solid #999', width: '100px' }}>VOUCHER</th>
                          <th className="text-left py-2 px-3 font-bold text-red-700" style={{ border: '1px solid #999' }}>NARRATION</th>
                          <th className="text-right py-2 px-3 font-bold text-red-700" style={{ border: '1px solid #999', width: '120px' }}>DEBIT</th>
                          <th className="text-right py-2 px-3 font-bold text-red-700" style={{ border: '1px solid #999', width: '120px' }}>CREDIT</th>
                          <th className="text-right py-2 px-3 font-bold text-red-700" style={{ border: '1px solid #999', width: '140px' }}>BALANCE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((item, idx) => (
                          <tr key={idx} style={{ backgroundColor: isDark ? (idx % 2 === 0 ? '#1e293b' : '#0f172a') : (idx % 2 === 0 ? '#fff' : '#f9f9f9') }}>
                            <td className="py-1.5 px-3 text-slate-700 font-semibold" style={{ border: '1px solid #ccc' }}>
                              {dayjs(item.date).format('DD-MMM-YY')}
                            </td>
                            <td className="py-1.5 px-3 text-blue-700 font-semibold" style={{ border: '1px solid #ccc' }}>
                              {item.voucherNo}
                            </td>
                            <td className="py-1.5 px-3 text-slate-700" style={{ border: '1px solid #ccc' }}>
                              {item.narration}
                            </td>
                            <td className="text-right py-1.5 px-3 font-semibold text-slate-800" style={{ border: '1px solid #ccc' }}>
                              {item.debit > 0 ? (<><CrDrIndicator type="debit" className="mr-1" />{formatCurrency(item.debit)}</>) : '0.00'}
                            </td>
                            <td className="text-right py-1.5 px-3 font-semibold text-slate-800" style={{ border: '1px solid #ccc' }}>
                              {item.credit > 0 ? (<><CrDrIndicator type="credit" className="mr-1" />{formatCurrency(item.credit)}</>) : '0.00'}
                            </td>
                            <td className="text-right py-1.5 px-3 font-semibold text-slate-800" style={{ border: '1px solid #ccc' }}>
                              {formatCurrency(Math.abs(item.balance))} {item.balance >= 0 ? 'DR' : 'CR'}
                            </td>
                          </tr>
                        ))}
                        <tr style={{ backgroundColor: isDark ? '#1e293b' : '#fff' }}>
                          <td colSpan={3} className="py-2 px-3 text-right font-bold text-slate-700" style={{ border: '1px solid #999' }}>
                            TOTAL:
                          </td>
                          <td className="text-right py-2 px-3 font-black text-red-700 fz-body" style={{ border: '1px solid #999' }}>
                            {totalDebit > 0 && <CrDrIndicator type="debit" className="mr-1" />}{formatCurrency(totalDebit)}
                          </td>
                          <td className="text-right py-2 px-3 font-black text-red-700 fz-body" style={{ border: '1px solid #999' }}>
                            {totalCredit > 0 && <CrDrIndicator type="credit" className="mr-1" />}{formatCurrency(totalCredit)}
                          </td>
                          <td className="text-right py-2 px-3 font-black text-slate-800 fz-body" style={{ border: '1px solid #999' }}>
                            {formatCurrency(Math.abs(closingBalance))} {closingBalance >= 0 ? 'DR' : 'CR'}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Summary - Legacy Style */}
                    <div className="mt-4">
                      <table className="fz-caption ml-auto" style={{ width: 'auto' }}>
                        <tbody>
                          <tr>
                            <td className="text-right py-1 px-4 font-bold text-slate-700">Total Debit :</td>
                            <td className="text-right py-1 px-4 font-bold text-red-700" style={{ minWidth: '150px' }}>
                              {totalDebit > 0 && <CrDrIndicator type="debit" className="mr-1" />}{formatCurrency(totalDebit)}
                            </td>
                          </tr>
                          <tr>
                            <td className="text-right py-1 px-4 font-bold text-slate-700">Total Credit :</td>
                            <td className="text-right py-1 px-4 font-bold text-red-700">
                              {totalCredit > 0 && <CrDrIndicator type="credit" className="mr-1" />}{formatCurrency(totalCredit)}
                            </td>
                          </tr>
                          <tr style={{ borderTop: '1px solid #999' }}>
                            <td className="text-right py-1 px-4 font-black text-slate-700">Closing Balance :</td>
                            <td className="text-right py-1 px-4 font-black text-slate-800">
                              {formatCurrency(Math.abs(closingBalance))} {closingBalance >= 0 ? 'DR' : 'CR'}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
              ) : (
                <ReportEmpty icon={<FileText size={34} />} title="No Data" hint="Select account and date range" />
              )}
            </Spin>
          </div>
        </section>
      )}
      {view !== 'legacy' && data.length === 0 && (
        <ReportEmpty icon={<FileText size={34} />} title={loading ? 'Loading…' : 'No Data'} hint="Select account and date range" />
      )}

      <style>{`
        .dtl-page .legacy-report-compact { max-width: 100%; margin: 0 auto; }
        html.dark .dtl-page .legacy-report-compact { color: #f5f5f7 !important; }
        html.dark .dtl-page .legacy-report-compact table,
        html.dark .dtl-page .legacy-report-compact th,
        html.dark .dtl-page .legacy-report-compact td,
        html.dark .dtl-page .legacy-report-compact tr { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.15) !important; color: #f5f5f7 !important; }
      `}</style>
    </ReportShell>
  );
};

export default DetailLedger;
