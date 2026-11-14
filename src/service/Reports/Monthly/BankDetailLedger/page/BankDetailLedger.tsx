import React, { useState, useEffect } from 'react';
import { DatePicker, Select } from 'antd';
import { Printer, FileDown, Settings, RefreshCw, FileText, Search } from 'lucide-react';
import dayjs, { Dayjs } from 'dayjs';
import { apiService } from '../../../../../services/api';
import { CrDrIndicator } from '@/components/shared/CrDrIndicator';
import { csvCell } from '@/utils/csv';
import { isFromAfterTo } from '@/utils/dates';
import { ReportShell, ParamCard, StatCards, OutputChoice, ReportEmpty } from '../../../../../components/reports/views/ReportShell';
import ReportViewSwitcher from '../../../../../components/reports/views/ReportViewSwitcher';
import { useReportViews } from '../../../../../components/reports/views/reportViews';
import '../../../../../components/reports/views/proViews.css';
import { useBankSpec, ProBento, ProTerm, ProEd } from '../views/bankPro';
import { showDialog3 as showDialog } from '@/utils/dialog';


interface LedgerTransaction {
  key: string;
  date: string;
  voucherNo: string;
  narration: string;
  debit: number;
  credit: number;
  balance: number;
}

interface BankOption {
  code: string;
  name: string;
}

// Print-only layout matching the legacy report design standard used across
// every report this session (letterhead, Date/Page Number line, dashed
// rules, TOTAL row, summary block) — plain monospace text, not a clone of
// the on-screen colorful UI. Feeds handlePrint only.
const BDL_LINE_W = 94;
const BDL_DASH = '-'.repeat(BDL_LINE_W);
const BDL_COL_DATE = 12;
const BDL_COL_VCHR = 12;
const BDL_COL_NARR = 30;
const BDL_COL_AMT = (BDL_LINE_W - BDL_COL_DATE - BDL_COL_VCHR - BDL_COL_NARR) / 3;

const bdlFmt = (n: number) =>
  Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const bdlPadL = (s: string, w: number) => s.padStart(w);
const bdlPadR = (s: string, w: number) => (s.length > w ? s.slice(0, w) : s.padEnd(w));
const bdlCenter = (s: string, w: number) => ' '.repeat(Math.max(0, Math.floor((w - s.length) / 2))) + s;

function buildBankDetailLedgerLines(
  data: LedgerTransaction[], bankCode: string, bankName: string,
  fromLabel: string, toLabel: string, openingBalance: number,
  totalDebit: number, totalCredit: number, closingBalance: number,
): string[] {
  const lines: string[] = [];
  const now = dayjs().format('DD-MMM-YYYY/h:mmA');

  lines.push(bdlCenter('Espat Karmchari Co-Operative Credit Society Limited.', BDL_LINE_W));
  lines.push(bdlCenter('Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006', BDL_LINE_W));
  lines.push(bdlCenter('Bank Detail Ledger', BDL_LINE_W));
  lines.push('');
  lines.push(`Bank Account : ${bankCode} - ${bankName}`);
  lines.push(`Period       : ${fromLabel} to ${toLabel}`);
  lines.push(`Opening Balance : ${bdlFmt(openingBalance)} ${openingBalance >= 0 ? 'DR' : 'CR'}`);
  const printedStr = `Printed : ${now}`;
  const pageStr = 'Page Number :  1';
  lines.push(`${printedStr}${bdlPadL(pageStr, BDL_LINE_W - printedStr.length)}`);
  lines.push(BDL_DASH);

  lines.push(
    `${bdlPadR('Date', BDL_COL_DATE)}${bdlPadR('Voucher', BDL_COL_VCHR)}${bdlPadR('Narration', BDL_COL_NARR)}` +
    `${bdlPadL('Debit', BDL_COL_AMT)}${bdlPadL('Credit', BDL_COL_AMT)}${bdlPadL('Balance', BDL_COL_AMT)}`
  );
  lines.push(BDL_DASH);

  data.forEach(item => {
    lines.push(
      `${bdlPadR(dayjs(item.date).format('DD-MMM-YY'), BDL_COL_DATE)}${bdlPadR(item.voucherNo, BDL_COL_VCHR)}${bdlPadR(item.narration, BDL_COL_NARR)}` +
      `${bdlPadL(item.debit > 0 ? bdlFmt(item.debit) : '', BDL_COL_AMT)}` +
      `${bdlPadL(item.credit > 0 ? bdlFmt(item.credit) : '', BDL_COL_AMT)}` +
      `${bdlPadL(`${bdlFmt(item.balance)} ${item.balance >= 0 ? 'DR' : 'CR'}`, BDL_COL_AMT)}`
    );
  });

  lines.push(BDL_DASH);
  lines.push(
    `${bdlPadR('TOTAL :-', BDL_COL_DATE + BDL_COL_VCHR + BDL_COL_NARR)}` +
    `${bdlPadL(bdlFmt(totalDebit), BDL_COL_AMT)}${bdlPadL(bdlFmt(totalCredit), BDL_COL_AMT)}${' '.repeat(BDL_COL_AMT)}`
  );
  lines.push(BDL_DASH);

  const IND = '        ';
  const LBL_W = 18;
  const VAL_W = 20;
  lines.push(`${IND}${'Opening Balance :'.padEnd(LBL_W)} ${bdlPadL(`${bdlFmt(openingBalance)} ${openingBalance >= 0 ? 'DR' : 'CR'}`, VAL_W)}`);
  lines.push(`${IND}${'Total Debit     :'.padEnd(LBL_W)} ${bdlPadL(bdlFmt(totalDebit), VAL_W)}`);
  lines.push(`${IND}${'Total Credit    :'.padEnd(LBL_W)} ${bdlPadL(bdlFmt(totalCredit), VAL_W)}`);
  lines.push(`${IND}${'-'.repeat(LBL_W + VAL_W + 1)}`);
  lines.push(`${IND}${'Closing Balance :'.padEnd(LBL_W)} ${bdlPadL(`${bdlFmt(closingBalance)} ${closingBalance >= 0 ? 'DR' : 'CR'}`, VAL_W)}`);
  lines.push(`${IND}${'-'.repeat(LBL_W + VAL_W + 1)}`);
  lines.push('');
  lines.push('* Report As Per Data Available ..');

  return lines;
}

const BankDetailLedger: React.FC = () => {
  const [selectedBank, setSelectedBank] = useState<string>('A1010');
  const [bankList, setBankList] = useState<BankOption[]>([]);
  const [fromDate, setFromDate] = useState<Dayjs | null>(dayjs().startOf('year'));
  const [toDate, setToDate] = useState<Dayjs | null>(dayjs());
  const [outputType, setOutputType] = useState<'screen' | 'printer'>('screen');
  const [data, setData] = useState<LedgerTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [bankName, setBankName] = useState<string>('');
  const [openingBalance, setOpeningBalance] = useState<number>(0);

  const { enabled, view, setView } = useReportViews('monthly.bank-detail-ledger');

  useEffect(() => {
    fetchBankList();
  }, []);

  useEffect(() => {
    // Auto-load data when bank is selected and dates are set
    if (selectedBank && fromDate && toDate) {
      fetchLedgerData();
    }
  }, [selectedBank]);

  const fetchBankList = async () => {
    try {
      const response = await apiService.getBankList();
      if (response.success && Array.isArray(response.data)) {
        setBankList(response.data);
      }
    } catch (error) {
      console.error('Error fetching bank list:', error);
      await showDialog('error', 'Load Error', 'Failed to load bank accounts');
    }
  };

  const fetchLedgerData = async () => {
    if (!selectedBank) {
      await showDialog('warning', 'Validation', 'Please select a bank account');
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
      const response = await apiService.getBankDetailLedger(
        selectedBank,
        fromDate.format('YYYY-MM-DD'),
        toDate.format('YYYY-MM-DD')
      );

      if (response.success && response.data) {
        setData(response.data.transactions || []);
        setBankName(response.data.bankName || '');
        setOpeningBalance(response.data.openingBalance || 0);
      } else {
        setData([]);
        await showDialog('error', 'Load Error', 'Failed to load bank ledger data');
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
    const closingBalance = data.length > 0 ? (Number(data[data.length - 1]?.balance) || 0) : openingBalance;
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
  // the print box was 8in wide inside an 8.27in-wide A4 page with 0.5in
  // margins on both the @page rule and the box's own padding, leaving only
  // 7.27in of usable width for an 8in box (an even larger overflow than the
  // identical bug already confirmed live and fixed on Cash Book Monthly and
  // Detail Ledger). Switched to the same hidden-iframe + monospace lines[]
  // technique used everywhere else.
  const handlePrint = () => {
    if (data.length === 0) return;
    const lines = buildBankDetailLedgerLines(
      data, selectedBank, bankName,
      fromDate?.format('DD-MMM-YYYY') || '', toDate?.format('DD-MMM-YYYY') || '',
      openingBalance, totalDebit, totalCredit, closingBalance,
    );
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><title>Bank Detail Ledger</title>
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
      csvContent += 'BANK DETAIL LEDGER REPORT\n';
      csvContent += `Bank: ${bankName} [${selectedBank}]\n`;
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
      link.setAttribute('download', `BankDetailLedger_${selectedBank}_${fromDate?.format('YYYY-MM-DD')}_${toDate?.format('YYYY-MM-DD')}.csv`);
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

  const spec = useBankSpec(data, `${selectedBank} ${bankName}`.trim(), totalDebit, totalCredit, closingBalance, openingBalance);

  return (
    <ReportShell
      className="bdl-page"
      title="Bank Detail Ledger"
      desc="Transactions of one bank account"
      switcher={<ReportViewSwitcher enabled={enabled} value={view} onChange={setView} />}
      actions={
        <>
          <button type="button" className="aw-btn aw-btn-ghost" onClick={() => { setSelectedBank('A1010'); setBankName(''); setData([]); setOpeningBalance(0); setFromDate(dayjs().startOf('year')); setToDate(dayjs()); }}><RefreshCw size={14} /> Reset</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handleExportCSV} disabled={!(data.length > 0)}><FileDown size={14} /> CSV</button>
          <button type="button" className="aw-btn aw-btn-secondary" onClick={handlePrint} disabled={!(data.length > 0)}><Printer size={14} /> Print</button>
        </>
      }
      aside={
        <>
          <ParamCard title="Parameters" icon={<Settings size={14} />}>
            <div>
              <label className="aw-label" htmlFor="bdl-bank">Bank account</label>
              <Select id="bdl-bank" value={selectedBank} onChange={(v: string) => setSelectedBank(v)} className="aw-select" popupClassName="aw-select-popup" placeholder="Search by code or name…" showSearch
                filterOption={(input, option) => String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                options={bankList.map(b => ({ value: b.code, label: `${b.code} - ${b.name}` }))} />
            </div>
            <div>
              <label className="aw-label" htmlFor="bdl-from">From date</label>
              <DatePicker id="bdl-from" className="aw-picker" popupClassName="aw-select-popup" style={{ width: '100%' }} value={fromDate} onChange={v => v && setFromDate(v)} format="DD-MMM-YYYY" allowClear={false} />
            </div>
            <div>
              <label className="aw-label" htmlFor="bdl-to">To date</label>
              <DatePicker id="bdl-to" className="aw-picker" popupClassName="aw-select-popup" style={{ width: '100%' }} value={toDate} onChange={v => v && setToDate(v)} format="DD-MMM-YYYY" allowClear={false} />
            </div>
            <OutputChoice value={outputType} onChange={setOutputType} id="bdl-page-output" />
            <button type="button" className="aw-btn aw-btn-primary" onClick={fetchLedgerData} disabled={loading} style={{ width: '100%' }}>
              <Search size={14} className={loading ? 'aw-spin' : undefined} /> {loading ? 'Loading…' : 'Generate'}
            </button>
          </ParamCard>
          {data.length > 0 && <StatCards items={[{ label: 'Closing', value: `${formatCurrency(Math.abs(closingBalance))} ${closingBalance >= 0 ? 'DR' : 'CR'}`, tone: 'muted' }, { label: 'Total debit', value: formatCurrency(totalDebit), tone: 'success' }, { label: 'Total credit', value: formatCurrency(totalCredit), tone: 'danger' }]} />}
        </>
      }
      footerLeft="Bank Detail Ledger"
      footerRight={bankName || 'Select bank'}
    >
      {data.length > 0 && view === 'bento' && <ProBento spec={spec} />}
      {data.length > 0 && view === 'terminal' && <div style={{ height: 'calc(100vh - 150px)', minHeight: 360 }}><ProTerm spec={spec} /></div>}
      {data.length > 0 && view === 'editorial' && <ProEd spec={spec} subtitle={`${fromDate?.format('DD-MMM-YYYY')} to ${toDate?.format('DD-MMM-YYYY')}`} />}

      {view === 'legacy' && (
        <section className="aw-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="aw-main-head">
            <span className="aw-card-title">Bank Ledger Report</span>
            <span className="aw-meta">{bankName || 'Select bank'}</span>
          </div>
          <div className="bdl-page-preview-body" style={{ padding: 'var(--aw-pad)', overflow: 'auto' }}>
              {data.length > 0 ? (
                <div>
                  <div className="aw-stack" style={{ textAlign: 'center', gap: 2, marginBottom: 12 }}>
                    <div className="aw-strong">Espat Karmchari Co-Operative Credit Society Limited.</div>
                    <div className="aw-meta">Avenue A, Sahakari Sadan, Sector-6, AT Post: Bhilai Nagar, Dist: DURG-490006</div>
                    <div className="aw-meta">Reg No: A.R/DRG/1796, Tel No: 0788-2298736</div>
                    <div className="aw-strong" style={{ marginTop: 8 }}>Bank account: {selectedBank} - {bankName}</div>
                    <div className="aw-meta">Period: {fromDate?.format('DD-MMM-YYYY')} to {toDate?.format('DD-MMM-YYYY')}</div>
                  </div>
                  <div className="aw-table-wrap" style={{ maxHeight: 'none' }}>
                    <table className="aw-table">
                      <thead>
                        <tr><th>Date</th><th>Voucher</th><th>Narration</th><th className="is-right">Debit</th><th className="is-right">Credit</th><th className="is-right">Balance</th></tr>
                      </thead>
                      <tbody>
                        {data.map((item, idx) => (
                          <tr key={idx}>
                            <td>{dayjs(item.date).format('DD-MMM-YY')}</td>
                            <td className="is-accent">{item.voucherNo}</td>
                            <td>{item.narration}</td>
                            <td className="is-right">{item.debit > 0 ? (<><CrDrIndicator type="debit" className="mr-1" />{formatCurrency(item.debit)}</>) : '0.00'}</td>
                            <td className="is-right">{item.credit > 0 ? (<><CrDrIndicator type="credit" className="mr-1" />{formatCurrency(item.credit)}</>) : '0.00'}</td>
                            <td className="is-right">{formatCurrency(Math.abs(item.balance))} {item.balance >= 0 ? 'DR' : 'CR'}</td>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={3} className="is-right"><b>Total</b></td>
                          <td className="is-right"><b>{totalDebit > 0 && <CrDrIndicator type="debit" className="mr-1" />}{formatCurrency(totalDebit)}</b></td>
                          <td className="is-right"><b>{totalCredit > 0 && <CrDrIndicator type="credit" className="mr-1" />}{formatCurrency(totalCredit)}</b></td>
                          <td className="is-right"><b>{formatCurrency(Math.abs(closingBalance))} {closingBalance >= 0 ? 'DR' : 'CR'}</b></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="aw-table-wrap" style={{ maxHeight: 'none', width: 'fit-content', marginLeft: 'auto', marginTop: 12 }}>
                    <table className="aw-table">
                      <tbody>
                        <tr><td className="is-right">Opening balance</td><td className="is-right">{formatCurrency(Math.abs(openingBalance))} {openingBalance >= 0 ? 'DR' : 'CR'}</td></tr>
                        <tr><td className="is-right">Total debit</td><td className="is-right">{totalDebit > 0 && <CrDrIndicator type="debit" className="mr-1" />}{formatCurrency(totalDebit)}</td></tr>
                        <tr><td className="is-right">Total credit</td><td className="is-right">{totalCredit > 0 && <CrDrIndicator type="credit" className="mr-1" />}{formatCurrency(totalCredit)}</td></tr>
                        <tr><td className="is-right"><b>Closing balance</b></td><td className="is-right"><b>{formatCurrency(Math.abs(closingBalance))} {closingBalance >= 0 ? 'DR' : 'CR'}</b></td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <ReportEmpty icon={<FileText size={34} />} title="No Data" hint="Select a bank account and date range" />
              )}
          </div>
        </section>
      )}
      {view !== 'legacy' && !(data.length > 0) && (
        <ReportEmpty icon={<FileText size={34} />} title={loading ? 'Loading…' : 'No Data'} hint="Select a bank account and date range" />
      )}
    </ReportShell>
  );
};

export default BankDetailLedger;
