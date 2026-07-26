import React, { useState, useCallback, useMemo } from 'react';
import { ConfigProvider, Button, Spin, DatePicker, Select, Radio, message, theme } from 'antd';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../store';
import { FileText, Printer, Search, RotateCcw, Calendar, Wallet, Monitor } from 'lucide-react';
import { apiService } from '../../../../services/api';
import dayjs from 'dayjs';

interface DepositRecord {
  key: string;
  accountNo: string;
  memberNo: string;
  memberName: string;
  depositType: string;
  amount: number;
  depositDate: string;
  dueDate: string;
  interestRate: number;
  maturityAmount: number;
}

const fmtAmt = (n: number) =>
  (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d?: string) => (d ? dayjs(d).format('DD-MMM-YY') : '---');

const DEPOSIT_TYPES = [
  { value: 'ALL',               label: 'ALL (Both Types)' },
  { value: 'Fixed Deposit',     label: 'SPECIAL DEPOSIT (FD)' },
  { value: 'Recurring Deposit', label: 'RECURRING DEPOSIT (RD)' },
];

const SOCIETY = {
  name: 'Espat Karmchari Co-Operative Credit Society Limited.',
  addr: 'Avenue A,Sahakari Sadan,Sector-6, AT Post:Bhilai Nagar,Dist:DURG-490006',
  reg:  'Reg No: A.R/DRG/1796',
  tel:  'Tel No: 0788-2298736',
};

const printReport = (html: string) => {
  const doc = `<html><head><style>
    @page{size:landscape;margin:10mm}
    body{font-family:'Courier New',monospace;font-size:9px;background:white}
    .hdr{text-align:center;margin-bottom:8px;padding:6px;border:1px solid #ccc}
    .hdr .nm{font-weight:900;font-size:12px}
    .hdr .addr{font-size:8px;margin-top:2px}
    .hdr .contact{display:flex;justify-content:space-between;font-size:8px;margin-top:2px}
    .title{text-align:center;font-weight:900;font-size:12px;margin:6px 0;padding:4px;border:1px solid #ccc;letter-spacing:2px}
    .info{display:flex;justify-content:space-between;font-size:8px;margin:4px 0;padding:3px;border:1px solid #eee}
    .th{display:flex;font-weight:900;padding:4px 2px;background:#555;color:white;font-size:8px}
    .tr{display:flex;padding:3px 2px;border-bottom:1px solid #eee;font-size:8px}
    .tr:nth-child(even){background:#f9f9f9}
    .tf{display:flex;font-weight:900;padding:5px 2px;border-top:2px solid #000;font-size:9px}
    .c1{width:9%}.c2{width:17%}.c3{width:9%}.c4{width:6%}.c5{width:6%;text-align:right}
    .c6{width:10%}.c7{width:13%;text-align:right}.c8{width:10%}.c9{width:13%;text-align:right}
  </style></head><body>${html}</body></html>`;
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  iframe.contentDocument!.open();
  iframe.contentDocument!.write(doc);
  iframe.contentDocument!.close();
  setTimeout(() => iframe.contentWindow!.print(), 100);
  setTimeout(() => document.body.removeChild(iframe), 1500);
};

const DepositDueDateRegister: React.FC = () => {
  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [fromDate, setFromDate]     = useState<dayjs.Dayjs>(dayjs());
  const [toDate, setToDate]         = useState<dayjs.Dayjs>(dayjs().add(30, 'days'));
  const [depositType, setDepositType] = useState<string>('ALL');
  const [outputType, setOutputType] = useState<'screen' | 'printer'>('screen');
  const [loading, setLoading]       = useState(false);
  const [reportData, setReportData] = useState<DepositRecord[]>([]);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.post('/reports/deposit/maturity', {
        fromDate: fromDate.format('YYYY-MM-DD'),
        toDate: toDate.format('YYYY-MM-DD'),
        depositType: depositType === 'ALL' ? undefined : depositType,
      });
      const data: DepositRecord[] = Array.isArray(response)
        ? response
        : Array.isArray((response as any)?.data)
        ? (response as any).data
        : [];
      setReportData(data);
      if (data.length === 0) message.info('No deposits maturing in this period');
      else if (outputType === 'printer') {
        printReport(buildPrintHtml(data));
      }
    } catch {
      message.error('Failed to generate report');
      setReportData([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, depositType, outputType]);

  const buildPrintHtml = (data: DepositRecord[]): string => {
    const totAmt = data.reduce((s, r) => s + r.amount, 0);
    const totMat = data.reduce((s, r) => s + r.maturityAmount, 0);
    const rows = data.map(r => `
      <div class="tr">
        <span class="c1">${r.memberNo}</span>
        <span class="c2">${r.memberName}</span>
        <span class="c3">${r.accountNo}</span>
        <span class="c4">${r.depositType === 'Fixed Deposit' ? 'FD' : 'RD'}</span>
        <span class="c5">${r.interestRate}%</span>
        <span class="c6">${fmtDate(r.depositDate)}</span>
        <span class="c7">${fmtAmt(r.amount)}</span>
        <span class="c8">${fmtDate(r.dueDate)}</span>
        <span class="c9">${fmtAmt(r.maturityAmount)}</span>
      </div>`).join('');

    return `
      <div class="hdr">
        <div class="nm">${SOCIETY.name}</div>
        <div class="addr">${SOCIETY.addr}</div>
        <div class="contact"><span>${SOCIETY.reg}</span><span>${SOCIETY.tel}</span></div>
      </div>
      <div class="title">DEPOSIT DUE DATE REGISTER</div>
      <div class="info">
        <span>From Date: ${fromDate.format('DD-MMM-YYYY')}</span>
        <span>To Date: ${toDate.format('DD-MMM-YYYY')}</span>
        <span>Type: ${depositType}</span>
        <span>Generated: ${dayjs().format('DD-MMM-YYYY HH:mm')}</span>
        <span>Total: ${data.length}</span>
      </div>
      <div class="th">
        <span class="c1">MbNo</span><span class="c2">Name</span><span class="c3">Acc.No</span>
        <span class="c4">Type</span><span class="c5">Rate</span>
        <span class="c6">Deposit Date</span><span class="c7">Deposit Amt</span>
        <span class="c8">Maturity Date</span><span class="c9">Maturity Amt</span>
      </div>
      ${rows}
      <div class="tf">
        <span class="c1"></span><span class="c2">Total: ${data.length}</span>
        <span class="c3"></span><span class="c4"></span><span class="c5"></span>
        <span class="c6"></span><span class="c7">${fmtAmt(totAmt)}</span>
        <span class="c8"></span><span class="c9">${fmtAmt(totMat)}</span>
      </div>`;
  };

  const handleReset = useCallback(() => {
    setFromDate(dayjs());
    setToDate(dayjs().add(30, 'days'));
    setDepositType('ALL');
    setReportData([]);
  }, []);

  const totals = useMemo(() => ({
    count:         reportData.length,
    totalAmount:   reportData.reduce((s, r) => s + r.amount, 0),
    totalMaturity: reportData.reduce((s, r) => s + r.maturityAmount, 0),
  }), [reportData]);

  return (
    <ConfigProvider theme={{
      algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: { colorPrimary: '#f59e0b', borderRadius: 6, fontSize: 12 },
    }}>
      <div className={`h-screen flex flex-col font-sans overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 via-amber-50/20 to-slate-50'}`}>

        {/* Header */}
        <div className={`px-3 py-1.5 flex items-center justify-between shrink-0 border-b ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/90 border-slate-200/60'}`}>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-1.5 rounded-lg text-white shadow-md">
              <Wallet size={14} />
            </div>
            <div>
              <h1 className="fz-label font-black tracking-tight leading-none">Deposit Due Date Register</h1>
              <div className="fz-caption font-bold text-slate-400 uppercase tracking-wider leading-none mt-0.5">
                <Calendar size={8} className="inline text-amber-500 mr-1" />Maturity Report
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button icon={<RotateCcw size={11} />} size="small" className="h-7 fz-caption font-bold" onClick={handleReset}>Reset</Button>
            <Button
              icon={<Printer size={11} />} size="small" className="h-7 fz-caption font-bold"
              onClick={() => reportData.length > 0 && printReport(buildPrintHtml(reportData))}
              disabled={reportData.length === 0}
            >Print</Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden p-2 flex gap-2">

          {/* Sidebar */}
          <div className="w-[220px] flex flex-col gap-2 shrink-0">

            {/* Date Range */}
            <div className={`border rounded-lg overflow-hidden shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-amber-200/60'}`}>
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-2 py-1 flex items-center gap-1">
                <Calendar size={10} className="text-white" />
                <span className="fz-caption font-black text-white uppercase">Date Range</span>
              </div>
              <div className="p-2 space-y-1.5">
                <div>
                  <div className="fz-caption font-bold text-slate-500 mb-0.5">From Date</div>
                  <DatePicker value={fromDate} onChange={d => d && setFromDate(d)} format="DD-MMM-YYYY" size="small" className="w-full fz-caption" />
                </div>
                <div>
                  <div className="fz-caption font-bold text-slate-500 mb-0.5">To Date</div>
                  <DatePicker value={toDate} onChange={d => d && setToDate(d)} format="DD-MMM-YYYY" size="small" className="w-full fz-caption" />
                </div>
              </div>
            </div>

            {/* Deposit Type */}
            <div className={`border rounded-lg overflow-hidden shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-amber-200/60'}`}>
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-2 py-1 flex items-center gap-1">
                <Wallet size={10} className="text-white" />
                <span className="fz-caption font-black text-white uppercase">Deposit Type</span>
              </div>
              <div className="p-2">
                <Select
                  value={depositType}
                  onChange={setDepositType}
                  options={DEPOSIT_TYPES}
                  size="small"
                  className="w-full fz-caption"
                />
              </div>
            </div>

            {/* Output */}
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
              className="h-8 bg-gradient-to-r from-amber-500 to-amber-600 font-black uppercase fz-caption shadow-lg"
            >
              Generate
            </Button>
          </div>

          {/* Report Area */}
          <div className={`flex-1 border rounded-lg shadow-sm flex flex-col overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-amber-200/60'}`}>
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-1.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <FileText size={12} className="text-white" />
                <div>
                  <span className="fz-caption font-black text-white uppercase">Deposit Due Date Register</span>
                  <span className="fz-caption font-bold text-amber-100 ml-2">{fromDate.format('DD-MMM-YY')} – {toDate.format('DD-MMM-YY')}</span>
                </div>
              </div>
              <span className="fz-caption font-black text-white bg-white/20 px-2 py-0.5 rounded">{totals.count} Deposits</span>
            </div>

            <div className={`flex-1 overflow-auto p-2 ${isDark ? 'bg-slate-900/40' : ''}`}>
              <Spin spinning={loading} size="small">
                {reportData.length > 0 ? (
                  <div style={{ fontFamily: "'Courier New', monospace", fontSize: 11 }}>
                    {/* Society Header */}
                    <div className={`text-center mb-3 p-2 border-2 border-amber-400 rounded ${isDark ? 'bg-amber-900/20' : 'bg-amber-50'}`}>
                      <div className="font-black fz-label">{SOCIETY.name}</div>
                      <div className="fz-caption text-slate-500">{SOCIETY.addr}</div>
                      <div className="flex justify-between fz-caption text-slate-500 mt-1">
                        <span>{SOCIETY.reg}</span><span>{SOCIETY.tel}</span>
                      </div>
                    </div>

                    <div className={`text-center font-black fz-label tracking-widest mb-2 p-1.5 border-2 border-amber-400 rounded ${isDark ? 'bg-amber-900/20' : 'bg-amber-50'}`}>
                      DEPOSIT DUE DATE REGISTER
                    </div>

                    {/* Info */}
                    <div className={`flex justify-between fz-caption mb-2 p-1.5 border border-amber-300 rounded ${isDark ? 'bg-amber-900/10' : 'bg-amber-50/50'}`}>
                      <span><b>From:</b> {fromDate.format('DD-MMM-YYYY')}</span>
                      <span><b>To:</b> {toDate.format('DD-MMM-YYYY')}</span>
                      <span><b>Type:</b> {depositType}</span>
                      <span><b>Total:</b> {totals.count}</span>
                    </div>

                    {/* Table Header */}
                    <div className="flex bg-amber-500 text-white fz-caption font-black rounded-t px-1 py-1.5">
                      <span style={{ width: '9%' }}>MbNo</span>
                      <span style={{ width: '17%' }}>Name</span>
                      <span style={{ width: '9%' }}>Acc.No</span>
                      <span style={{ width: '6%' }}>Type</span>
                      <span style={{ width: '6%', textAlign: 'right' }}>Rate</span>
                      <span style={{ width: '10%' }}>Deposit Date</span>
                      <span style={{ width: '13%', textAlign: 'right' }}>Deposit Amt</span>
                      <span style={{ width: '10%' }}>Maturity Date</span>
                      <span style={{ width: '13%', textAlign: 'right' }}>Maturity Amt</span>
                    </div>

                    {reportData.map((item, idx) => (
                      <div
                        key={idx}
                        className={`flex fz-caption px-1 py-1 border-b ${
                          isDark
                            ? idx % 2 === 0 ? 'bg-slate-800' : 'bg-slate-900'
                            : idx % 2 === 0 ? 'bg-white' : 'bg-amber-50/40'
                        }`}
                      >
                        <span style={{ width: '9%', color: '#1e40af', fontWeight: 700 }}>{item.memberNo}</span>
                        <span style={{ width: '17%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.memberName}</span>
                        <span style={{ width: '9%', color: '#7c3aed' }}>{item.accountNo}</span>
                        <span style={{ width: '6%', color: '#059669', fontWeight: 700 }}>{item.depositType === 'Fixed Deposit' ? 'FD' : 'RD'}</span>
                        <span style={{ width: '6%', textAlign: 'right', color: '#0ea5e9' }}>{item.interestRate}%</span>
                        <span style={{ width: '10%', color: '#64748b' }}>{fmtDate(item.depositDate)}</span>
                        <span style={{ width: '13%', textAlign: 'right', color: '#059669', fontWeight: 800 }}>{fmtAmt(item.amount)}</span>
                        <span style={{ width: '10%', color: '#dc2626' }}>{fmtDate(item.dueDate)}</span>
                        <span style={{ width: '13%', textAlign: 'right', color: '#dc2626', fontWeight: 800 }}>{fmtAmt(item.maturityAmount)}</span>
                      </div>
                    ))}

                    {/* Totals */}
                    <div className={`flex fz-caption font-black px-1 py-2 border-t-2 rounded-b ${isDark ? 'bg-amber-900/20 border-amber-500' : 'bg-amber-50 border-amber-400'}`}>
                      <span style={{ width: '9%' }}></span>
                      <span style={{ width: '17%' }}>Total: {totals.count}</span>
                      <span style={{ width: '9%' }}></span>
                      <span style={{ width: '6%' }}></span>
                      <span style={{ width: '6%' }}></span>
                      <span style={{ width: '10%' }}></span>
                      <span style={{ width: '13%', textAlign: 'right', color: '#059669' }}>{fmtAmt(totals.totalAmount)}</span>
                      <span style={{ width: '10%' }}></span>
                      <span style={{ width: '13%', textAlign: 'right', color: '#dc2626' }}>{fmtAmt(totals.totalMaturity)}</span>
                    </div>

                    <div className="text-center fz-caption text-slate-400 mt-2 italic">
                      Report As Per Data Available....
                    </div>
                  </div>
                ) : (
                  <div className="py-32 text-center">
                    <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <FileText size={40} className="text-amber-200" />
                    </div>
                    <p className="fz-label font-black text-slate-400 uppercase tracking-wider">No Data</p>
                    <p className="fz-caption text-slate-300 mt-1">Select date range and generate report</p>
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

export default DepositDueDateRegister;
