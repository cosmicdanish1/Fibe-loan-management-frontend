import React, { useState, useEffect } from 'react';
import { DatePicker, Radio, Select, Button, ConfigProvider, Spin, Tooltip, theme as antdTheme } from 'antd';
import {
  Printer,
  FileDown,
  BookText,
  ShieldCheck,
  Settings,
  RefreshCw,
  Database,
  TrendingUp,
  TrendingDown,
  Calculator,
  FileText,
  Search
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
  const isDark = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

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
    const closingBalance = data.length > 0 ? (Number(data[data.length - 1].balance) || 0) : 0;
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
      csvContent += 'DETAIL LEDGER REPORT\n';
      csvContent += `Account: ${headName} [${selectedHead}]\n`;
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

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#10b981',
          borderRadius: 8,
          fontSize: 13,
          colorBgContainer: isDark ? '#1e293b' : '#ffffff',
          colorBorder: isDark ? '#334155' : '#e2e8f0',
        },
      }}
    >
      <div className={`dtl-page h-screen flex flex-col font-sans selection:bg-emerald-100 overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50'}`}>
        {/* Compact Header */}
        <div className={`dtl-header px-4 py-2.5 flex items-center justify-between z-10 shadow-sm shrink-0 border-b ${isDark ? 'bg-gradient-to-r from-slate-900 to-slate-900 border-white/5' : 'bg-white/80 backdrop-blur-sm border-slate-200/60'}`}>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-2 rounded-lg text-white shadow-md">
              <BookText size={18} />
            </div>
            <div>
              <h1 className={`fz-body font-black tracking-tight leading-none ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Detail Ledger</h1>
              <div className="flex items-center gap-1.5 mt-0.5 fz-caption font-bold text-slate-400 uppercase tracking-wide leading-none">
                <ShieldCheck size={10} className="text-emerald-500" /> Account Ledger
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              icon={<Printer size={13} />}
              size="small"
              className="h-8 px-3 rounded-lg fz-caption font-black uppercase tracking-wide border-slate-200 hover:border-emerald-500 hover:text-emerald-600 transition-all"
              onClick={handlePrint}
              disabled={data.length === 0}
            >
              Print
            </Button>
            <Button
              type="primary"
              icon={<FileDown size={13} />}
              size="small"
              className="h-8 px-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 rounded-lg fz-caption font-black uppercase tracking-wide shadow-md transition-all"
              onClick={handleExportCSV}
              disabled={data.length === 0}
            >
              CSV
            </Button>
          </div>
        </div>

        {/* Compact Main Content */}
        <div className="flex-1 overflow-hidden p-3 flex gap-3">

          {/* Compact Left Panel: Controls & Stats */}
          <div className="w-[280px] flex flex-col gap-3 shrink-0">

            {/* Parameters Card */}
            <div className={`dtl-params-card rounded-xl overflow-hidden shadow-sm border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/90 backdrop-blur-sm border-slate-200/60'}`}>
              <div className={`dtl-card-header border-b px-3 py-2 flex items-center justify-between ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-gradient-to-r from-slate-50 to-emerald-50/50 border-slate-100'}`}>
                <h3 className={`fz-caption font-black tracking-wide uppercase flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <Settings size={12} className="text-emerald-600" />
                  Parameters
                </h3>
                <Tooltip title="Reload">
                  <Button type="text" size="small" icon={<RefreshCw size={11} />} onClick={fetchLedgerData} className="h-6 w-6" />
                </Tooltip>
              </div>

              <div className="p-3 space-y-3">
                <div className="space-y-1">
                  <label className="fz-caption font-black text-slate-500 uppercase tracking-tight">Account Head</label>
                  <Select
                    value={selectedHead}
                    onChange={setSelectedHead}
                    className="w-full compact-select"
                    placeholder="Search by code or name..."
                    showSearch
                    size="small"
                    filterOption={(input, option) => {
                      const label = option?.label || '';
                      return label.toLowerCase().includes(input.toLowerCase());
                    }}
                    optionLabelProp="label"
                  >
                    {headList.map(head => (
                      <Option 
                        key={head.code} 
                        value={head.code}
                        label={`${head.code} - ${head.name}`}
                      >
                        <div className="flex items-start gap-2 py-1">
                          <span className="font-bold text-emerald-600 fz-label min-w-[60px]">{head.code}</span>
                          <span className="text-slate-400">-</span>
                          <span className="font-medium text-slate-700 fz-label flex-1 leading-tight">{head.name}</span>
                        </div>
                      </Option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="fz-caption font-black text-slate-500 uppercase tracking-tight">From Date</label>
                  <DatePicker
                    className="w-full h-8 fz-label font-bold"
                    value={fromDate}
                    onChange={v => v && setFromDate(v)}
                    format="DD-MMM-YYYY"
                  />
                </div>

                <div className="space-y-1">
                  <label className="fz-caption font-black text-slate-500 uppercase tracking-tight">To Date</label>
                  <DatePicker
                    className="w-full h-8 fz-label font-bold"
                    value={toDate}
                    onChange={v => v && setToDate(v)}
                    format="DD-MMM-YYYY"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="fz-caption font-black text-slate-500 uppercase tracking-tight">Output</label>
                  <Radio.Group
                    size="small"
                    value={outputType}
                    onChange={e => setOutputType(e.target.value)}
                    className="w-full ledger-radio-compact"
                  >
                    <Radio.Button value="screen" className="w-1/2 text-center">Screen</Radio.Button>
                    <Radio.Button value="printer" className="w-1/2 text-center">Print</Radio.Button>
                  </Radio.Group>
                </div>

                <Button
                  type="primary"
                  block
                  size="small"
                  icon={<Search size={13} />}
                  onClick={fetchLedgerData}
                  loading={loading}
                  className="h-9 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 font-black uppercase tracking-wide fz-caption mt-1 shadow-md"
                >
                  Load Report
                </Button>
              </div>
            </div>

            {/* Compact Stats Grid */}
            {data.length > 0 && (
              <div className="grid grid-cols-1 gap-2">
                <div className={`rounded-lg p-3 shadow-sm hover:shadow-md transition-all group border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/90 backdrop-blur-sm border-slate-200/60'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="fz-caption font-black uppercase tracking-wide text-slate-500">Closing</div>
                    <Calculator size={12} className="text-slate-300 group-hover:text-emerald-400 transition-colors" />
                  </div>
                  <div className="fz-heading font-black text-slate-800 font-mono">₹{formatCurrency(Math.abs(closingBalance))}</div>
                  <div className="fz-caption font-black text-slate-400 uppercase mt-0.5">{closingBalance >= 0 ? 'DR' : 'CR'}</div>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg p-3 text-white shadow-md hover:shadow-lg transition-all relative overflow-hidden group">
                  <TrendingUp size={50} className="absolute -right-2 -bottom-2 opacity-10 group-hover:scale-110 transition-transform" />
                  <div className="fz-caption font-black uppercase tracking-wide opacity-90 mb-0.5">Debit</div>
                  <div className="fz-heading font-black font-mono relative z-10 flex items-center">
                    {totalDebit > 0 && <CrDrIndicator type="debit" className="mr-1" />}₹{formatCurrency(totalDebit)}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg p-3 text-white shadow-md hover:shadow-lg transition-all relative overflow-hidden group">
                  <TrendingDown size={50} className="absolute -right-2 -bottom-2 opacity-10 group-hover:scale-110 transition-transform" />
                  <div className="fz-caption font-black uppercase tracking-wide opacity-90 mb-0.5">Credit</div>
                  <div className="fz-heading font-black font-mono relative z-10 flex items-center">
                    {totalCredit > 0 && <CrDrIndicator type="credit" className="mr-1" />}₹{formatCurrency(totalCredit)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Compact Report Panel with Scroll */}
          <div className={`dtl-report-panel flex-1 rounded-xl shadow-sm flex flex-col overflow-hidden border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/90 backdrop-blur-sm border-slate-200/60'}`}>
            <div className={`dtl-card-header border-b px-4 py-2.5 flex items-center justify-between shrink-0 ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-gradient-to-r from-slate-50 to-emerald-50/50 border-slate-100'}`}>
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg shadow-sm border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-100'}`}>
                  <Database size={14} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="fz-label font-black text-slate-700 uppercase tracking-wide leading-none">Ledger Report</h3>
                  <p className="fz-caption font-bold text-slate-400 uppercase mt-0.5 tracking-tight">{headName || 'Select Account'}</p>
                </div>
              </div>
            </div>

            <div className={`dtl-preview-body flex-1 overflow-auto p-3 custom-scrollbar-compact ${isDark ? 'bg-slate-900/40' : 'bg-white'}`}>
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
                  <div className="h-full flex flex-col items-center justify-center opacity-40">
                    <FileText size={60} className="text-slate-300 mb-4" />
                    <h3 className="fz-label font-black text-slate-400 uppercase tracking-wide">No Transactions</h3>
                    <p className="fz-caption font-bold text-slate-300 uppercase mt-1.5 text-center max-w-[180px]">Select account and date range</p>
                  </div>
                )}
              </Spin>
            </div>
          </div>
        </div>

        {/* Compact Footer */}
        <div className={`dtl-footer px-4 py-2 flex items-center justify-between shrink-0 border-t ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/80 backdrop-blur-sm border-slate-200/60'}`}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="fz-caption font-black text-slate-400 uppercase tracking-wide">Financial Ledger v2</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="fz-caption font-bold text-slate-300 uppercase tracking-tight">Index: {selectedHead || 'N/A'}</span>
            <div className="w-px h-2.5 bg-slate-200" />
            <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 px-2 py-0.5 rounded fz-caption font-black text-emerald-600 uppercase tabular-nums tracking-wide">
              v5.2.0
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar-compact::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar-compact::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-compact::-webkit-scrollbar-thumb { 
          background: linear-gradient(to bottom, #d1fae5, #a7f3d0); 
          border-radius: 10px; 
        }
        .custom-scrollbar-compact::-webkit-scrollbar-thumb:hover { 
          background: linear-gradient(to bottom, #a7f3d0, #6ee7b7); 
        }
        
        .legacy-report-compact {
          max-width: 100%;
          margin: 0 auto;
        }
        
        .ledger-radio-compact .ant-radio-button-wrapper {
          font-size: 10px !important;
          font-weight: 900 !important;
          padding: 0 8px !important;
          height: 28px !important;
          line-height: 26px !important;
        }

        .compact-select .ant-select-selector {
          height: 32px !important;
          font-size: 11px !important;
          font-weight: 700 !important;
        }

        .compact-select .ant-select-dropdown {
          min-width: 400px !important;
        }

        .compact-select .ant-select-item {
          padding: 8px 12px !important;
        }

        .compact-select .ant-select-item-option-content {
          white-space: normal !important;
          word-wrap: break-word !important;
        }

        /* Printing now goes through a hidden iframe (see handlePrint) that
           renders a plain monospace layout built from the report's own data
           — no @media print rule is needed on this live page anymore;
           window.print() is no longer called on it. */

        /* ── Detail Ledger — dark mode ── */
        html.dark .dtl-page { background-color: #000000 !important; background-image: none !important; }
        html.dark .dtl-header,
        html.dark .dtl-footer { background-color: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; background-image: none !important; }
        html.dark .dtl-params-card,
        html.dark .dtl-report-panel { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .dtl-card-header { background-color: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; background-image: none !important; }
        html.dark .dtl-preview-body { background-color: #1c1c1e !important; }
        html.dark .dtl-page .ant-picker,
        html.dark .dtl-page .ant-select-selector { background-color: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .dtl-page .ant-picker input,
        html.dark .dtl-page .ant-select-selection-item { color: #f5f5f7 !important; }
        html.dark .dtl-page .ant-btn:not(.ant-btn-primary) { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
        html.dark .dtl-page .legacy-report-compact { color: #f5f5f7 !important; }
        html.dark .dtl-page .legacy-report-compact table,
        html.dark .dtl-page .legacy-report-compact th,
        html.dark .dtl-page .legacy-report-compact td,
        html.dark .dtl-page .legacy-report-compact tr { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.15) !important; color: #f5f5f7 !important; }
      `}</style>
    </ConfigProvider>
  );
};

export default DetailLedger;
