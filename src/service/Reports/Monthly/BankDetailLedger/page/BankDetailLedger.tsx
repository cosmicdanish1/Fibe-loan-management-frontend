import React, { useState, useEffect } from 'react';
import { DatePicker, Radio, Select, Button, ConfigProvider, Spin, Tooltip, theme as antdTheme } from 'antd';
import {
  Printer,
  FileDown,
  Landmark,
  ShieldCheck,
  Settings,
  RefreshCw,
  Database,
  TrendingUp,
  TrendingDown,
  Calculator,
  FileText,
  Search,
  AlertCircle
} from 'lucide-react';
import dayjs, { Dayjs } from 'dayjs';
import { apiService } from '../../../../../services/api';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';
import { CrDrIndicator } from '@/components/shared/CrDrIndicator';

const showDialog = async (type: 'info' | 'warning' | 'error', title: string, detail: string): Promise<void> => {
  if ((window as any).electronAPI?.showMessageBox) {
    await (window as any).electronAPI.showMessageBox({ type, title: 'electron-react-ts', message: title, detail, buttons: ['OK'], defaultId: 0 });
  }
};

const { Option } = Select;

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

  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

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
    const closingBalance = data.length > 0 ? (Number(data[data.length - 1].balance) || 0) : openingBalance;
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
        csvContent += `${dayjs(item.date).format('DD-MMM-YYYY')},${item.voucherNo},"${item.narration}",${item.debit},${item.credit},${item.balance}\n`;
      });
      
      csvContent += `\nTotal,,${totalDebit},${totalCredit},${closingBalance}\n`;
      
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

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#b45309',
          borderRadius: 8,
          fontSize: 13,
          colorBgContainer: isDark ? '#1e293b' : '#ffffff',
          colorBorder: isDark ? '#334155' : '#e2e8f0',
        },
      }}
    >
      <div className={`bdl-page h-screen flex flex-col font-sans selection:bg-amber-200/60 overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 via-amber-50/40 to-orange-50/30'}`}>
        {/* Enhanced Header with Better Typography */}
        <div className={`bdl-header px-5 py-3 flex items-center justify-between z-10 shadow-lg shrink-0 border-b ${isDark ? 'bg-gradient-to-r from-slate-900 to-slate-900 border-white/5' : 'bg-white/90 backdrop-blur-md border-amber-200/60 shadow-amber-100/20'}`}>
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-amber-600 via-amber-700 to-orange-700 p-2.5 rounded-xl text-white shadow-lg shadow-amber-600/30">
              <Landmark size={20} className="drop-shadow-sm" />
            </div>
            <div>
              <h1 className={`fz-heading font-black tracking-tight leading-none ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Bank Detail Ledger</h1>
              <div className="flex items-center gap-2 mt-1 fz-caption font-black text-amber-700 uppercase tracking-wider leading-none">
                <ShieldCheck size={11} className="text-amber-600" /> 
                <span>Financial Ledger System</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              icon={<Printer size={14} />}
              size="middle"
              className="h-9 px-4 rounded-xl fz-caption font-black uppercase tracking-wide border-amber-200 hover:border-amber-500 hover:text-amber-700 hover:bg-amber-50 transition-all duration-200"
              onClick={handlePrint}
              disabled={data.length === 0}
            >
              Print
            </Button>
            <Button
              type="primary"
              icon={<FileDown size={14} />}
              size="middle"
              className="h-9 px-5 bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 hover:from-amber-700 hover:via-amber-800 hover:to-orange-800 rounded-xl fz-caption font-black uppercase tracking-wide shadow-lg shadow-amber-600/30 transition-all duration-200"
              onClick={handleExportCSV}
              disabled={data.length === 0}
            >
              Export CSV
            </Button>
          </div>
        </div>

        {/* Enhanced Main Content with Better Layout */}
        <div className="flex-1 overflow-hidden p-4 flex gap-4">

          {/* Enhanced Left Panel: Controls & Stats */}
          <div className="w-[300px] flex flex-col gap-4 shrink-0">

            {/* Enhanced Parameters Card */}
            <div className={`bdl-params-card rounded-2xl overflow-hidden shadow-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 backdrop-blur-md border-amber-200/60 shadow-amber-100/20'}`}>
              <div className={`bdl-card-header border-b px-4 py-3 flex items-center justify-between ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-gradient-to-r from-amber-50 via-orange-50/50 to-amber-50 border-amber-100'}`}>
                <h3 className={`fz-caption font-black tracking-wider uppercase flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-amber-800'}`}>
                  <Settings size={13} className="text-amber-700" />
                  Report Parameters
                </h3>
                <Tooltip title="Refresh Data">
                  <Button 
                    type="text" 
                    size="small" 
                    icon={<RefreshCw size={12} />} 
                    onClick={fetchLedgerData} 
                    className="h-7 w-7 hover:bg-amber-100 rounded-lg transition-colors" 
                  />
                </Tooltip>
              </div>

              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="fz-caption font-black text-slate-600 uppercase tracking-wider">Bank Account</label>
                  <Select
                    value={selectedBank}
                    onChange={setSelectedBank}
                    className="w-full enhanced-select"
                    placeholder="Search by code or name..."
                    showSearch
                    size="middle"
                    filterOption={(input, option) => {
                      const label = option?.label || '';
                      return label.toLowerCase().includes(input.toLowerCase());
                    }}
                    optionLabelProp="label"
                  >
                    {bankList.map(bank => (
                      <Option 
                        key={bank.code} 
                        value={bank.code}
                        label={`${bank.code} - ${bank.name}`}
                      >
                        <div className="flex items-start gap-3 py-1.5">
                          <span className="font-black text-amber-700 fz-label min-w-[70px] bg-amber-50 px-2 py-0.5 rounded">{bank.code}</span>
                          <span className="text-slate-400">—</span>
                          <span className="font-semibold text-slate-700 fz-label flex-1 leading-tight">{bank.name}</span>
                        </div>
                      </Option>
                    ))}
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="fz-caption font-black text-slate-600 uppercase tracking-wider">From Date</label>
                    <DatePicker
                      className="w-full h-9 fz-label font-semibold"
                      value={fromDate}
                      onChange={v => v && setFromDate(v)}
                      format="DD-MMM-YYYY"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="fz-caption font-black text-slate-600 uppercase tracking-wider">To Date</label>
                    <DatePicker
                      className="w-full h-9 fz-label font-semibold"
                      value={toDate}
                      onChange={v => v && setToDate(v)}
                      format="DD-MMM-YYYY"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="fz-caption font-black text-slate-600 uppercase tracking-wider">Output Format</label>
                  <Radio.Group
                    size="middle"
                    value={outputType}
                    onChange={e => setOutputType(e.target.value)}
                    className="w-full enhanced-radio"
                  >
                    <Radio.Button value="screen" className="w-1/2 text-center font-semibold">Screen</Radio.Button>
                    <Radio.Button value="printer" className="w-1/2 text-center font-semibold">Print</Radio.Button>
                  </Radio.Group>
                </div>

                <Button
                  type="primary"
                  block
                  size="large"
                  icon={<Search size={14} />}
                  onClick={fetchLedgerData}
                  loading={loading}
                  className="h-11 bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 hover:from-amber-700 hover:via-amber-800 hover:to-orange-800 font-black uppercase tracking-wider fz-caption mt-2 shadow-lg shadow-amber-600/30 rounded-xl"
                >
                  Generate Report
                </Button>
              </div>
            </div>

            {/* Enhanced Stats Grid with Better Visual Hierarchy */}
            {data.length > 0 && (
              <div className="grid grid-cols-1 gap-3">
                <div className={`bdl-stat-card rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 group border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 backdrop-blur-md border-amber-200/60 shadow-amber-100/20'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="fz-caption font-black uppercase tracking-wider text-amber-700">Closing Balance</div>
                    <Calculator size={14} className="text-amber-400 group-hover:text-amber-600 transition-colors" />
                  </div>
                  <div className={`text-2xl font-black font-mono tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>₹{formatCurrency(Math.abs(closingBalance))}</div>
                  <div className="fz-caption font-black text-amber-600 uppercase mt-1 tracking-wider">{closingBalance >= 0 ? 'DEBIT' : 'CREDIT'}</div>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-xl p-4 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all duration-300 relative overflow-hidden group">
                  <TrendingUp size={60} className="absolute -right-3 -bottom-3 opacity-10 group-hover:scale-110 transition-transform duration-300" />
                  <div className="fz-caption font-black uppercase tracking-wider opacity-90 mb-1">Total Debit</div>
                  <div className="fz-heading font-black font-mono relative z-10 tracking-tight flex items-center">
                    {totalDebit > 0 && <CrDrIndicator type="debit" className="mr-1" />}₹{formatCurrency(totalDebit)}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-rose-500 via-rose-600 to-pink-600 rounded-xl p-4 text-white shadow-lg shadow-rose-500/30 hover:shadow-xl hover:shadow-rose-500/40 transition-all duration-300 relative overflow-hidden group">
                  <TrendingDown size={60} className="absolute -right-3 -bottom-3 opacity-10 group-hover:scale-110 transition-transform duration-300" />
                  <div className="fz-caption font-black uppercase tracking-wider opacity-90 mb-1">Total Credit</div>
                  <div className="fz-heading font-black font-mono relative z-10 tracking-tight flex items-center">
                    {totalCredit > 0 && <CrDrIndicator type="credit" className="mr-1" />}₹{formatCurrency(totalCredit)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Report Panel with Better Layout */}
          <div className={`bdl-report-panel flex-1 rounded-2xl shadow-lg flex flex-col overflow-hidden border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/95 backdrop-blur-md border-amber-200/60 shadow-amber-100/20'}`}>
            <div className={`bdl-card-header border-b px-5 py-3 flex items-center justify-between shrink-0 ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-gradient-to-r from-amber-50 via-orange-50/50 to-amber-50 border-amber-100'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl shadow-sm border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-amber-100'}`}>
                  <Database size={16} className="text-amber-700" />
                </div>
                <div>
                  <h3 className="fz-body font-black text-amber-800 uppercase tracking-wider leading-none">Bank Ledger Report</h3>
                  <p className="fz-caption font-black text-amber-600 uppercase mt-1 tracking-wider">{bankName || 'Select Bank Account'}</p>
                </div>
              </div>
              {data.length === 0 && !loading && (
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertCircle size={14} />
                  <span className="fz-caption font-black uppercase tracking-wider">No Data</span>
                </div>
              )}
            </div>

            <div className={`bdl-preview-body flex-1 overflow-auto p-4 enhanced-scrollbar ${isDark ? 'bg-slate-900/40' : 'bg-white'}`}>
              <Spin spinning={loading} tip="Loading ledger data..." size="large">
                {data.length > 0 ? (
                  <div className="legacy-report-enhanced fz-label">
                    {/* Enhanced Company Header */}
                    <div className="text-center mb-6 pb-4 border-b-2 border-amber-200">
                      <div className="fz-body font-black text-blue-800 mb-1">Espat Karmchari Co-Operative Credit Society Limited.</div>
                      <div className="fz-label text-slate-700 font-medium">Avenue A, Sahakari Sadan, Sector-6, AT Post: Bhilai Nagar, Dist: DURG-490006</div>
                      <div className="fz-caption text-slate-600 font-medium mt-1">Reg No: A.R/DRG/1796, Tel No: 0788-2298736</div>
                    </div>

                    {/* Enhanced Report Title */}
                    <div className="text-center mb-5">
                      <div className="fz-body font-black text-amber-800 mb-2">
                        Bank Account: <span className="text-blue-800">{selectedBank} - {bankName}</span>
                      </div>
                      <div className="fz-label text-slate-700 font-semibold">
                        Period: {fromDate?.format('DD-MMM-YYYY')} to {toDate?.format('DD-MMM-YYYY')}
                      </div>
                    </div>

                    {/* Enhanced Legacy Table */}
                    <table className="w-full fz-label border-collapse shadow-sm" style={{ border: '2px solid #d97706' }}>
                      <thead>
                        <tr style={{ backgroundColor: isDark ? '#1f2937' : '#fef3c7' }}>
                          <th className="text-left py-3 px-4 font-black text-amber-900" style={{ border: '1px solid #d97706', width: '110px' }}>DATE</th>
                          <th className="text-left py-3 px-4 font-black text-amber-900" style={{ border: '1px solid #d97706', width: '110px' }}>VOUCHER</th>
                          <th className="text-left py-3 px-4 font-black text-amber-900" style={{ border: '1px solid #d97706' }}>NARRATION</th>
                          <th className="text-right py-3 px-4 font-black text-amber-900" style={{ border: '1px solid #d97706', width: '130px' }}>DEBIT</th>
                          <th className="text-right py-3 px-4 font-black text-amber-900" style={{ border: '1px solid #d97706', width: '130px' }}>CREDIT</th>
                          <th className="text-right py-3 px-4 font-black text-amber-900" style={{ border: '1px solid #d97706', width: '150px' }}>BALANCE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((item, idx) => (
                           <tr key={idx} style={{ backgroundColor: isDark ? (idx % 2 === 0 ? '#1e293b' : '#0f172a') : (idx % 2 === 0 ? '#fff' : '#fefbf3') }} className="hover:bg-amber-50/50 transition-colors">
                            <td className="py-2.5 px-4 text-slate-800 font-bold" style={{ border: '1px solid #e5e7eb' }}>
                              {dayjs(item.date).format('DD-MMM-YY')}
                            </td>
                            <td className="py-2.5 px-4 text-blue-700 font-bold" style={{ border: '1px solid #e5e7eb' }}>
                              {item.voucherNo}
                            </td>
                            <td className="py-2.5 px-4 text-slate-700 font-medium" style={{ border: '1px solid #e5e7eb' }}>
                              {item.narration}
                            </td>
                            <td className="text-right py-2.5 px-4 font-bold text-emerald-700" style={{ border: '1px solid #e5e7eb' }}>
                              {item.debit > 0 ? (<><CrDrIndicator type="debit" className="mr-1" />{formatCurrency(item.debit)}</>) : '0.00'}
                            </td>
                            <td className="text-right py-2.5 px-4 font-bold text-rose-700" style={{ border: '1px solid #e5e7eb' }}>
                              {item.credit > 0 ? (<><CrDrIndicator type="credit" className="mr-1" />{formatCurrency(item.credit)}</>) : '0.00'}
                            </td>
                            <td className="text-right py-2.5 px-4 font-bold text-slate-900" style={{ border: '1px solid #e5e7eb' }}>
                              {formatCurrency(Math.abs(item.balance))} {item.balance >= 0 ? 'DR' : 'CR'}
                            </td>
                          </tr>
                        ))}
                        <tr style={{ backgroundColor: isDark ? '#1e293b' : '#fef3c7' }}>
                          <td colSpan={3} className="py-3 px-4 text-right font-black text-amber-900 fz-heading" style={{ border: '2px solid #d97706' }}>
                            TOTAL:
                          </td>
                          <td className="text-right py-3 px-4 font-black text-emerald-800 fz-heading" style={{ border: '2px solid #d97706' }}>
                            {totalDebit > 0 && <CrDrIndicator type="debit" className="mr-1" />}{formatCurrency(totalDebit)}
                          </td>
                          <td className="text-right py-3 px-4 font-black text-rose-800 fz-heading" style={{ border: '2px solid #d97706' }}>
                            {totalCredit > 0 && <CrDrIndicator type="credit" className="mr-1" />}{formatCurrency(totalCredit)}
                          </td>
                          <td className="text-right py-3 px-4 font-black text-slate-900 fz-heading" style={{ border: '2px solid #d97706' }}>
                            {formatCurrency(Math.abs(closingBalance))} {closingBalance >= 0 ? 'DR' : 'CR'}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Enhanced Summary */}
                    <div className="mt-6">
                      <table className="fz-label ml-auto bg-amber-50/50 rounded-lg overflow-hidden" style={{ width: 'auto' }}>
                        <tbody>
                          <tr>
                            <td className="text-right py-2 px-5 font-black text-amber-800">Opening Balance:</td>
                            <td className="text-right py-2 px-5 font-black text-slate-900" style={{ minWidth: '160px' }}>
                              {formatCurrency(Math.abs(openingBalance))} {openingBalance >= 0 ? 'DR' : 'CR'}
                            </td>
                          </tr>
                          <tr>
                            <td className="text-right py-2 px-5 font-black text-amber-800">Total Debit:</td>
                            <td className="text-right py-2 px-5 font-black text-emerald-800">
                              {totalDebit > 0 && <CrDrIndicator type="debit" className="mr-1" />}{formatCurrency(totalDebit)}
                            </td>
                          </tr>
                          <tr>
                            <td className="text-right py-2 px-5 font-black text-amber-800">Total Credit:</td>
                            <td className="text-right py-2 px-5 font-black text-rose-800">
                              {totalCredit > 0 && <CrDrIndicator type="credit" className="mr-1" />}{formatCurrency(totalCredit)}
                            </td>
                          </tr>
                          <tr style={{ borderTop: '2px solid #d97706' }}>
                            <td className="text-right py-2 px-5 font-black text-amber-800">Closing Balance:</td>
                            <td className="text-right py-2 px-5 font-black text-slate-900">
                              {formatCurrency(Math.abs(closingBalance))} {closingBalance >= 0 ? 'DR' : 'CR'}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-50">
                    <FileText size={80} className="text-amber-300 mb-6" />
                    <h3 className="fz-body font-black text-amber-600 uppercase tracking-wider mb-2">No Transactions Found</h3>
                    <p className="fz-caption font-semibold text-amber-500 uppercase text-center max-w-[220px] leading-relaxed">
                      Select a bank account and date range to view ledger data
                    </p>
                  </div>
                )}
              </Spin>
            </div>
          </div>
        </div>

        {/* Enhanced Footer */}
        <div className={`bdl-footer px-5 py-3 flex items-center justify-between shrink-0 shadow-lg border-t ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/90 backdrop-blur-md border-amber-200/60 shadow-amber-100/20'}`}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              <span className="fz-caption font-black text-amber-700 uppercase tracking-wider">Financial Ledger System v2.0</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="fz-caption font-black text-amber-600 uppercase tracking-wider">Account: {selectedBank || 'None'}</span>
            <div className="w-px h-3 bg-amber-200" />
            <div className="bg-gradient-to-r from-amber-100 to-orange-100 px-3 py-1 rounded-lg fz-caption font-black text-amber-800 uppercase tabular-nums tracking-wider">
              v5.2.1
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .enhanced-scrollbar::-webkit-scrollbar { width: 8px; }
        .enhanced-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .enhanced-scrollbar::-webkit-scrollbar-thumb { 
          background: linear-gradient(to bottom, #f59e0b, #d97706); 
          border-radius: 12px; 
          border: 1px solid #fbbf24;
        }
        .enhanced-scrollbar::-webkit-scrollbar-thumb:hover { 
          background: linear-gradient(to bottom, #d97706, #b45309); 
        }
        
        .legacy-report-enhanced {
          max-width: 100%;
          margin: 0 auto;
        }
        
        .enhanced-radio .ant-radio-button-wrapper {
          font-size: 11px !important;
          font-weight: 700 !important;
          padding: 0 12px !important;
          height: 36px !important;
          line-height: 34px !important;
          border-color: #f59e0b !important;
        }

        .enhanced-radio .ant-radio-button-wrapper-checked {
          background: linear-gradient(to right, #f59e0b, #d97706) !important;
          border-color: #d97706 !important;
          color: white !important;
        }

        .enhanced-select .ant-select-selector {
          height: 36px !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          border-color: #f59e0b !important;
        }

        .enhanced-select .ant-select-dropdown {
          min-width: 450px !important;
        }

        .enhanced-select .ant-select-item {
          padding: 10px 16px !important;
        }

        .enhanced-select .ant-select-item-option-content {
          white-space: normal !important;
          word-wrap: break-word !important;
        }

        .enhanced-select .ant-select-focused .ant-select-selector {
          border-color: #d97706 !important;
          box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.2) !important;
        }

        /* Printing now goes through a hidden iframe (see handlePrint) that
           renders a plain monospace layout built from the report's own data
           — no @media print rule is needed on this live page anymore;
           window.print() is no longer called on it. */

        /* ── Bank Detail Ledger — dark mode ── */
        html.dark .bdl-page { background-color: #000000 !important; background-image: none !important; }
        html.dark .bdl-header,
        html.dark .bdl-footer { background-color: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; background-image: none !important; box-shadow: none !important; }
        html.dark .bdl-params-card,
        html.dark .bdl-report-panel,
        html.dark .bdl-page .bg-slate-800 { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; box-shadow: none !important; }
        html.dark .bdl-card-header { background-color: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; background-image: none !important; }
        html.dark .bdl-preview-body { background-color: #1c1c1e !important; }
        html.dark .bdl-page .text-slate-100,
        html.dark .bdl-page .text-slate-900,
        html.dark .bdl-page h1,
        html.dark .bdl-page h3 { color: #f5f5f7 !important; }
        html.dark .bdl-page label,
        html.dark .bdl-page .text-slate-600,
        html.dark .bdl-page .text-slate-700 { color: #8e8e93 !important; }
        html.dark .bdl-page .ant-picker,
        html.dark .bdl-page .ant-select-selector { background-color: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .bdl-page .ant-picker input,
        html.dark .bdl-page .ant-select-selection-item { color: #f5f5f7 !important; }
        html.dark .bdl-page .ant-btn:not(.ant-btn-primary) { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
        html.dark .bdl-page .legacy-report-enhanced { color: #f5f5f7 !important; }
        html.dark .bdl-page .legacy-report-enhanced table,
        html.dark .bdl-page .legacy-report-enhanced th,
        html.dark .bdl-page .legacy-report-enhanced td,
        html.dark .bdl-page .legacy-report-enhanced tr { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.15) !important; color: #f5f5f7 !important; }
        html.dark .bdl-page .legacy-report-enhanced .text-blue-800,
        html.dark .bdl-page .legacy-report-enhanced .text-blue-700 { color: #60a5fa !important; }
        html.dark .bdl-page .legacy-report-enhanced .text-emerald-700,
        html.dark .bdl-page .legacy-report-enhanced .text-emerald-800 { color: #34d399 !important; }
        html.dark .bdl-page .legacy-report-enhanced .text-rose-700,
        html.dark .bdl-page .legacy-report-enhanced .text-rose-800 { color: #ff453a !important; }
        html.dark .bdl-page .legacy-report-enhanced .bg-amber-50\/50 { background-color: rgba(255,255,255,.05) !important; }
      `}</style>
    </ConfigProvider>
  );
};

export default BankDetailLedger;