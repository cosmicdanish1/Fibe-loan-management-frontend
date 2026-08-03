import React, { useState, useCallback, useMemo } from 'react';
import { ConfigProvider, Button, Select, Spin, Radio, message, theme } from 'antd';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';
import { FileText, Printer, Search, RotateCcw, FolderX, Calendar, Monitor } from 'lucide-react';
import { apiService } from '../../../../../services/api';
import dayjs from 'dayjs';

interface ClosingItem {
  key: string;
  memberCode: string;
  memberName: string;
  accountNo: string;
  accountType: string;
  closingDate: string;
  finalAmount: number;
  description: string;
}

// ── text-report helpers ───────────────────────────────────────────
const W = 110;
const ctr = (s: string) => s.padStart(Math.floor((W + s.length) / 2)).padEnd(W);
const rl  = () => '-'.repeat(W);
const lrPad = (l: string, r: string) => l + r.padStart(W - l.length);
const col = (s: string, w: number, align: 'l' | 'r' = 'l') =>
  align === 'l' ? s.substring(0, w).padEnd(w) : s.substring(0, w).padStart(w);

const fmtAmt  = (n: number) =>
  (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d?: string) => (d ? dayjs(d).format('DD-MMM-YY') : '---');

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' },   { value: 4, label: 'April' },
  { value: 5, label: 'May' },     { value: 6, label: 'June' },
  { value: 7, label: 'July' },    { value: 8, label: 'August' },
  { value: 9, label: 'September' },{ value: 10, label: 'October' },
  { value: 11, label: 'November' },{ value: 12, label: 'December' },
];

const ACCOUNT_TYPES = [
  { value: 'ALL', label: 'ALL (FD + RD)' },
  { value: 'FD',  label: 'Special Deposit (FD)' },
  { value: 'RD',  label: 'Recurring Deposit (RD)' },
];

const buildReportText = (
  data: ClosingItem[],
  monthName: string,
  year: number,
  accountType: string,
): string => {
  const lines: string[] = [];

  lines.push(ctr('Espat Karmchari Co-Operative Credit Society Limited.'));
  lines.push(ctr('Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006'));
  lines.push(lrPad('Reg No: A.R/DRG/1796', 'Tel No: 0788-2298736'));
  lines.push(rl());
  lines.push(ctr('Account Closing Register'));
  lines.push(lrPad(`Period : ${monthName} ${year}   Type : ${accountType}`, 'PageNo : 1'));
  lines.push(rl());

  // headers
  lines.push(
    col('MbNo',        11) +
    col('Name',        22) +
    col('Acc.No',      12) +
    col('Type',         6) +
    col('Closing Dt', 12) +
    col('Final Amt',  14, 'r') + '  ' +
    'Reason'
  );
  lines.push(rl());

  if (data.length === 0) {
    lines.push(ctr('No records found'));
  } else {
    data.forEach(r => {
      lines.push(
        col(String(r.memberCode),   11) +
        col(r.memberName,           22) +
        col(r.accountNo,            12) +
        col(r.accountType,           6) +
        col(fmtDate(r.closingDate), 12) +
        col(fmtAmt(r.finalAmount),  14, 'r') + '  ' +
        (r.description || '')
      );
    });
  }

  lines.push(rl());
  const totAmt = data.reduce((s, r) => s + r.finalAmount, 0);
  lines.push(
    col('', 11) +
    col(`Total Accounts : ${data.length}`, 40) +
    col(fmtAmt(totAmt), 14, 'r')
  );
  lines.push(rl());
  lines.push(ctr('Report As Per Data Available....'));

  return lines.join('\n');
};

const printReportText = (text: string) => {
  const escaped = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const doc = `<html><head><style>
    @page{size:landscape;margin:10mm}
    body{font-family:'Courier New',monospace;font-size:9pt;white-space:pre;background:white;color:#000}
  </style></head><body>${escaped}</body></html>`;
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  iframe.contentDocument!.open();
  iframe.contentDocument!.write(doc);
  iframe.contentDocument!.close();
  setTimeout(() => iframe.contentWindow!.print(), 100);
  setTimeout(() => document.body.removeChild(iframe), 1500);
};

const AccountClosingRegister: React.FC = () => {
  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [month, setMonth]             = useState<number>(dayjs().month() + 1);
  const [year, setYear]               = useState<number>(dayjs().year());
  const [accountType, setAccountType] = useState<string>('ALL');
  const [outputType, setOutputType]   = useState<'screen' | 'printer'>('screen');
  const [loading, setLoading]         = useState(false);
  const [reportText, setReportText]   = useState<string>('');
  const [recordCount, setRecordCount] = useState<number>(0);

  const monthName = useMemo(() => MONTHS.find(m => m.value === month)?.label || '', [month]);
  const yearOptions = useMemo(() =>
    Array.from({ length: 10 }, (_, i) => {
      const y = dayjs().year() - i;
      return { value: y, label: y.toString() };
    }), []);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/reports/account-closing', {
        params: { month, year, accountType: accountType === 'ALL' ? undefined : accountType },
      });
      const data: ClosingItem[] = Array.isArray((response as any)?.data)
        ? (response as any).data
        : Array.isArray(response) ? (response as any) : [];

      const text = buildReportText(data, monthName, year, accountType);
      setReportText(text);
      setRecordCount(data.length);

      if (data.length === 0) message.info('No closed accounts found for this period');
      else if (outputType === 'printer') printReportText(text);
    } catch {
      message.error('Failed to load account closing register');
      setReportText('');
      setRecordCount(0);
    } finally {
      setLoading(false);
    }
  }, [month, year, accountType, outputType, monthName]);

  const handleReset = useCallback(() => {
    setMonth(dayjs().month() + 1);
    setYear(dayjs().year());
    setAccountType('ALL');
    setReportText('');
    setRecordCount(0);
  }, []);

  return (
    <ConfigProvider theme={{
      algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: { colorPrimary: '#f59e0b', borderRadius: 6, fontSize: 12 },
    }}>
      <div className={`h-screen flex flex-col font-sans overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 via-amber-50/20 to-slate-50'}`}>

        {/* Header */}
        <div className={`px-3 py-1.5 flex items-center justify-between shrink-0 border-b ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/90 border-slate-200/60'}`}>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-amber-600 to-amber-700 p-1.5 rounded-lg text-white shadow-md">
              <FolderX size={14} />
            </div>
            <div>
              <h1 className="fz-label font-black tracking-tight leading-none">Account Closing Register</h1>
              <div className="fz-caption font-bold text-slate-400 uppercase tracking-wider leading-none mt-0.5">
                <Calendar size={8} className="inline text-amber-500 mr-1" />Closed Accounts Report
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button icon={<RotateCcw size={11} />} size="small" className="h-7 fz-caption font-bold" onClick={handleReset}>Reset</Button>
            <Button
              icon={<Printer size={11} />} size="small" className="h-7 fz-caption font-bold"
              onClick={() => reportText && printReportText(reportText)}
              disabled={!reportText}
            >Print</Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden p-2 flex gap-2">

          {/* Sidebar */}
          <div className="w-[220px] flex flex-col gap-2 shrink-0">

            <div className={`border rounded-lg overflow-hidden shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-amber-200/60'}`}>
              <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-2 py-1 flex items-center gap-1">
                <Calendar size={10} className="text-white" />
                <span className="fz-caption font-black text-white uppercase">Period</span>
              </div>
              <div className="p-2 space-y-1.5">
                <div>
                  <div className="fz-caption font-bold text-slate-500 mb-0.5">Month</div>
                  <Select value={month} onChange={setMonth} options={MONTHS} size="small" className="w-full fz-caption" />
                </div>
                <div>
                  <div className="fz-caption font-bold text-slate-500 mb-0.5">Year</div>
                  <Select value={year} onChange={setYear} options={yearOptions} size="small" className="w-full fz-caption" />
                </div>
              </div>
            </div>

            <div className={`border rounded-lg overflow-hidden shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-amber-200/60'}`}>
              <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-2 py-1 flex items-center gap-1">
                <FolderX size={10} className="text-white" />
                <span className="fz-caption font-black text-white uppercase">Account Type</span>
              </div>
              <div className="p-2">
                <Select value={accountType} onChange={setAccountType} options={ACCOUNT_TYPES} size="small" className="w-full fz-caption" />
              </div>
            </div>

            <div className={`border rounded-lg p-2 shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-amber-200/60'}`}>
              <div className="fz-caption font-bold text-slate-500 mb-1 uppercase">Output</div>
              <Radio.Group value={outputType} onChange={e => setOutputType(e.target.value)} size="small">
                <Radio value="screen" className="fz-caption"><Monitor size={10} className="inline mr-1" />Screen</Radio>
                <Radio value="printer" className="fz-caption"><Printer size={10} className="inline mr-1" />Printer</Radio>
              </Radio.Group>
            </div>

            <Button
              type="primary" block size="small" icon={<Search size={11} />}
              onClick={handleGenerate} loading={loading}
              className="h-8 bg-gradient-to-r from-amber-600 to-amber-700 font-black uppercase fz-caption shadow-lg"
            >
              Generate
            </Button>

            {recordCount > 0 && (
              <div className={`text-center fz-caption font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                {recordCount} record{recordCount !== 1 ? 's' : ''} found
              </div>
            )}
          </div>

          {/* Report Area */}
          <div className={`flex-1 border rounded-lg shadow-sm flex flex-col overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-amber-200/60'}`}>
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-3 py-1.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <FileText size={12} className="text-white" />
                <span className="fz-caption font-black text-white uppercase">Account Closing Register</span>
                <span className="fz-caption font-bold text-amber-100 ml-1">{monthName} {year}</span>
              </div>
              {recordCount > 0 && (
                <span className="fz-caption font-black text-white bg-white/20 px-2 py-0.5 rounded">{recordCount} Records</span>
              )}
            </div>

            <div className={`flex-1 overflow-auto p-3 ${isDark ? 'bg-slate-900/40' : 'bg-white'}`}>
              <Spin spinning={loading} size="small">
                {reportText ? (
                  <pre className={`font-mono fz-caption leading-[1.5] whitespace-pre select-text ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                    {reportText}
                  </pre>
                ) : (
                  <div className="py-32 text-center">
                    <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <FileText size={40} className="text-amber-200" />
                    </div>
                    <p className="fz-label font-black text-slate-400 uppercase tracking-wider">No Data</p>
                    <p className="fz-caption text-slate-300 mt-1">Select period and generate report</p>
                  </div>
                )}
              </Spin>
            </div>
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default AccountClosingRegister;
