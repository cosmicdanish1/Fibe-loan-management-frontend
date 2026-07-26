import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ConfigProvider, Button, Spin, Input, Modal, Select, Radio, message, theme } from 'antd';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../store';
import { FileText, Printer, Search, RotateCcw, Shield, User, Users, Monitor } from 'lucide-react';
import { apiService } from '../../../../../services/api';
import MemberLookup from '../../../../../components/shared/MemberLookup/MemberLookup';
import dayjs from 'dayjs';

interface SuretyRecord {
  key: string;
  mbno: string;
  memberName: string;
  loanNo: string;
  loanType: string;
  loanAmount: number;
  suretyMbno: string;
  suretyName: string;
  outstandingBalance: number;
}

interface LoanTypeOption {
  code: string;
  name: string;
}

const fmtAmt = (n: number) =>
  (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const printReport = (reportHtml: string) => {
  const html = `<html><head><style>
    @page{size:landscape;margin:10mm}
    body{font-family:'Courier New',monospace;font-size:10px;background:white}
    .company-header{text-align:center;margin-bottom:10px;padding:6px;border:2px solid #0ea5e9}
    .company-name{font-weight:900;font-size:13px}
    .company-address,.company-contact{font-size:9px;margin-top:2px}
    .company-contact{display:flex;justify-content:space-between}
    .report-title{text-align:center;font-weight:900;font-size:14px;margin:8px 0;letter-spacing:2px;padding:6px;border:2px solid #0ea5e9}
    .report-info{margin:8px 0;padding:6px;border:1px solid #ccc}
    .info-row{display:flex;justify-content:space-between;font-size:9px;padding:2px 0}
    .table-header{display:flex;font-weight:900;padding:6px 4px;background:#0ea5e9;color:white;font-size:10px}
    .table-row{display:flex;padding:5px 4px;border-bottom:1px solid #ddd;font-size:9px}
    .table-row:nth-child(even){background:#f0f9ff}
    .total-row{display:flex;font-weight:900;padding:8px 4px;border-top:2px solid #000;font-size:10px}
    .col-sr{width:4%}.col-mbno{width:10%}.col-name{width:18%}
    .col-loan{width:11%}.col-type{width:7%}.col-amount{width:12%;text-align:right}
    .col-surety-mbno{width:10%}.col-surety-name{width:18%}.col-balance{width:10%;text-align:right}
  </style></head><body>${reportHtml}</body></html>`;
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  iframe.contentDocument!.open();
  iframe.contentDocument!.write(html);
  iframe.contentDocument!.close();
  setTimeout(() => iframe.contentWindow!.print(), 100);
  setTimeout(() => document.body.removeChild(iframe), 1500);
};

const SuretyRegisterReport: React.FC = () => {
  const { interfaceMode } = useSelector((state: RootState) => state.theme);
  const isDark = interfaceMode === 'dark' ||
    (interfaceMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [memberFrom, setMemberFrom]   = useState('');
  const [memberTo, setMemberTo]       = useState('');
  const [loanType, setLoanType]       = useState<string>('');
  const [loanTypes, setLoanTypes]     = useState<LoanTypeOption[]>([]);
  const [outputType, setOutputType]   = useState<'screen' | 'printer'>('screen');
  const [loading, setLoading]         = useState(false);
  const [reportData, setReportData]   = useState<SuretyRecord[]>([]);
  const [showLookup, setShowLookup]   = useState(false);
  const [lookupField, setLookupField] = useState<'from' | 'to'>('from');

  // Load loan types on mount
  useEffect(() => {
    apiService.get('/reports/loan-types')
      .then((res: any) => {
        const list: LoanTypeOption[] = Array.isArray(res) ? res : (res?.data ?? []);
        setLoanTypes(list);
      })
      .catch(() => {});
  }, []);

  const handleMemberSelect = useCallback((member: any) => {
    const no = member.memberNo || member.mbno || '';
    if (lookupField === 'from') setMemberFrom(no);
    else setMemberTo(no);
    setShowLookup(false);
  }, [lookupField]);

  const openLookup = useCallback((field: 'from' | 'to') => {
    setLookupField(field);
    setShowLookup(true);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!memberFrom.trim() || !memberTo.trim()) {
      message.warning('Please enter From and To Member Numbers');
      return;
    }
    setLoading(true);
    try {
      const params: { memberFrom: string; memberTo: string; loanType?: string } = { memberFrom, memberTo };
      if (loanType) params.loanType = loanType;
      const response = await apiService.getSuretyRegister(params);
      const data: SuretyRecord[] = Array.isArray(response)
        ? response
        : Array.isArray((response as any)?.data)
        ? (response as any).data
        : [];
      setReportData(data);
      if (data.length === 0) message.info('No surety records found in this range');
      else if (outputType === 'printer') {
        // Build HTML for print
        const html = buildPrintHtml(data, memberFrom, memberTo, loanType);
        printReport(html);
      }
    } catch {
      message.error('Failed to generate surety register');
      setReportData([]);
    } finally {
      setLoading(false);
    }
  }, [memberFrom, memberTo, loanType, outputType]);

  const buildPrintHtml = (
    data: SuretyRecord[],
    from: string,
    to: string,
    lt: string
  ): string => {
    const totLoan = data.reduce((s, r) => s + r.loanAmount, 0);
    const totBal  = data.reduce((s, r) => s + r.outstandingBalance, 0);
    const rows = data.map((r, i) => `
      <div class="table-row">
        <span class="col-sr">${i + 1}</span>
        <span class="col-mbno">${r.mbno}</span>
        <span class="col-name">${r.memberName}</span>
        <span class="col-loan">${r.loanNo}</span>
        <span class="col-type">${r.loanType}</span>
        <span class="col-amount">${fmtAmt(r.loanAmount)}</span>
        <span class="col-surety-mbno">${r.suretyMbno || '-'}</span>
        <span class="col-surety-name">${r.suretyName || '-'}</span>
        <span class="col-balance">${fmtAmt(r.outstandingBalance)}</span>
      </div>`).join('');

    return `
      <div class="company-header">
        <div class="company-name">Espat Karmchari Co-Operative Credit Society Limited.</div>
        <div class="company-address">Avenue A, Sahakari Sadan, Sector-C, AT Post:Bhilai Nagar,Dist:DURG-490006</div>
        <div class="company-contact"><span>Reg No: A.R/DRG/1796</span><span>Tel: 0788-2298736</span></div>
      </div>
      <div class="report-title">SURETY REGISTER</div>
      <div class="report-info">
        <div class="info-row"><span>From Member: ${from}</span><span>To Member: ${to}</span><span>Loan Type: ${lt || 'ALL'}</span><span>Generated: ${dayjs().format('DD-MMM-YYYY HH:mm')}</span></div>
      </div>
      <div class="table-header">
        <span class="col-sr">SR</span>
        <span class="col-mbno">Member No</span>
        <span class="col-name">Member Name</span>
        <span class="col-loan">Loan No</span>
        <span class="col-type">Type</span>
        <span class="col-amount">Loan Amount</span>
        <span class="col-surety-mbno">Surety No</span>
        <span class="col-surety-name">Surety Name</span>
        <span class="col-balance">Outstanding</span>
      </div>
      ${rows}
      <div class="total-row">
        <span class="col-sr"></span>
        <span class="col-mbno"></span>
        <span class="col-name">Total: ${data.length} Records</span>
        <span class="col-loan"></span>
        <span class="col-type"></span>
        <span class="col-amount">${fmtAmt(totLoan)}</span>
        <span class="col-surety-mbno"></span>
        <span class="col-surety-name"></span>
        <span class="col-balance">${fmtAmt(totBal)}</span>
      </div>`;
  };

  const handleReset = useCallback(() => {
    setMemberFrom('');
    setMemberTo('');
    setLoanType('');
    setReportData([]);
  }, []);

  const totals = useMemo(() => ({
    count: reportData.length,
    totalLoan: reportData.reduce((s, r) => s + r.loanAmount, 0),
    totalOutstanding: reportData.reduce((s, r) => s + r.outstandingBalance, 0),
  }), [reportData]);

  const loanTypeOptions = [
    { value: '', label: 'ALL (All Types)' },
    ...loanTypes.map(t => ({ value: t.code, label: `${t.code} - ${t.name}` })),
  ];

  return (
    <ConfigProvider theme={{
      algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: { colorPrimary: '#0ea5e9', borderRadius: 6, fontSize: 12 },
    }}>
      <div className={`h-screen flex flex-col font-sans overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 via-sky-50/20 to-slate-50'}`}>

        {/* Header */}
        <div className={`px-3 py-1.5 flex items-center justify-between shrink-0 border-b ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white/90 border-slate-200/60'}`}>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-sky-600 to-sky-700 p-1.5 rounded-lg text-white shadow-md">
              <Shield size={14} />
            </div>
            <div>
              <h1 className="fz-label font-black tracking-tight leading-none">Surety Register</h1>
              <div className="fz-caption font-bold text-slate-400 uppercase tracking-wider leading-none mt-0.5">
                <User size={8} className="inline text-sky-500 mr-1" />Guarantor Report
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button icon={<RotateCcw size={11} />} size="small" className="h-7 fz-caption font-bold" onClick={handleReset}>Reset</Button>
            <Button
              icon={<Printer size={11} />} size="small" className="h-7 fz-caption font-bold"
              onClick={() => {
                if (reportData.length > 0) printReport(buildPrintHtml(reportData, memberFrom, memberTo, loanType));
              }}
              disabled={reportData.length === 0}
            >Print</Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden p-2 flex gap-2">

          {/* Sidebar */}
          <div className="w-[220px] flex flex-col gap-2 shrink-0 overflow-y-auto">

            {/* From Member */}
            <div className={`border rounded-lg overflow-hidden shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-sky-200/60'}`}>
              <div className="bg-gradient-to-r from-sky-600 to-sky-700 px-2 py-1 flex items-center gap-1">
                <User size={10} className="text-white" />
                <span className="fz-caption font-black text-white uppercase">From Member</span>
              </div>
              <div className="p-2">
                <Input.Search
                  value={memberFrom}
                  onChange={e => setMemberFrom(e.target.value)}
                  onSearch={() => openLookup('from')}
                  placeholder="Member No"
                  size="small"
                  className="h-8 fz-label font-semibold"
                />
              </div>
            </div>

            {/* To Member */}
            <div className={`border rounded-lg overflow-hidden shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-sky-200/60'}`}>
              <div className="bg-gradient-to-r from-sky-600 to-sky-700 px-2 py-1 flex items-center gap-1">
                <User size={10} className="text-white" />
                <span className="fz-caption font-black text-white uppercase">To Member</span>
              </div>
              <div className="p-2">
                <Input.Search
                  value={memberTo}
                  onChange={e => setMemberTo(e.target.value)}
                  onSearch={() => openLookup('to')}
                  placeholder="Member No"
                  size="small"
                  className="h-8 fz-label font-semibold"
                />
              </div>
            </div>

            {/* Loan Type */}
            <div className={`border rounded-lg overflow-hidden shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-sky-200/60'}`}>
              <div className="bg-gradient-to-r from-sky-600 to-sky-700 px-2 py-1 flex items-center gap-1">
                <span className="fz-caption font-black text-white uppercase">Loan Type</span>
              </div>
              <div className="p-2">
                <Select
                  value={loanType}
                  onChange={setLoanType}
                  options={loanTypeOptions}
                  size="small"
                  className="w-full fz-caption"
                  placeholder="Select loan type"
                />
              </div>
            </div>

            {/* Output */}
            <div className={`border rounded-lg p-2 shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-sky-200/60'}`}>
              <div className="fz-caption font-bold text-slate-500 mb-1 uppercase">Output</div>
              <Radio.Group value={outputType} onChange={e => setOutputType(e.target.value)} size="small">
                <Radio value="screen" className="fz-caption"><Monitor size={10} className="inline mr-1" />Screen</Radio>
                <Radio value="printer" className="fz-caption"><Printer size={10} className="inline mr-1" />Printer</Radio>
              </Radio.Group>
            </div>

            <Button
              type="primary" block size="small" icon={<Search size={11} />}
              onClick={handleGenerate} loading={loading}
              className="h-8 bg-gradient-to-r from-sky-600 to-sky-700 font-black uppercase fz-caption shadow-lg"
            >
              Generate
            </Button>
          </div>

          {/* Report Area */}
          <div className={`flex-1 border rounded-lg shadow-sm flex flex-col overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-sky-200/60'}`}>
            <div className="bg-gradient-to-r from-sky-600 to-sky-700 px-3 py-1.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <FileText size={12} className="text-white" />
                <div>
                  <span className="fz-caption font-black text-white uppercase">Surety Register</span>
                  <span className="fz-caption font-bold text-sky-200 ml-2">{memberFrom} – {memberTo}</span>
                  {loanType && <span className="fz-caption font-bold text-sky-300 ml-2">| {loanType}</span>}
                </div>
              </div>
              <span className="fz-caption font-black text-white bg-white/20 px-2 py-0.5 rounded">{totals.count} Records</span>
            </div>

            <div className={`flex-1 overflow-auto p-2 ${isDark ? 'bg-slate-900/40' : ''}`}>
              <Spin spinning={loading} size="small">
                {reportData.length > 0 ? (
                  <div style={{ fontFamily: "'Courier New', monospace", fontSize: 11 }}>
                    {/* Society Header */}
                    <div className={`text-center mb-3 p-2 border-2 border-sky-400 rounded ${isDark ? 'bg-sky-900/20' : 'bg-sky-50'}`}>
                      <div className="font-black fz-label">Espat Karmchari Co-Operative Credit Society Limited.</div>
                      <div className="fz-caption text-slate-500">Avenue A, Sahakari Sadan, Sector-C, AT Post:Bhilai Nagar,Dist:DURG-490006</div>
                      <div className="flex justify-between fz-caption text-slate-500 mt-1">
                        <span>Reg No: A.R/DRG/1796</span><span>Tel: 0788-2298736</span>
                      </div>
                    </div>

                    <div className={`text-center font-black fz-label tracking-widest mb-2 p-1.5 border-2 border-sky-400 rounded ${isDark ? 'bg-sky-900/20' : 'bg-sky-50'}`}>
                      SURETY REGISTER
                    </div>

                    {/* Info Row */}
                    <div className={`flex justify-between fz-caption mb-2 p-1.5 border border-sky-300 rounded ${isDark ? 'bg-sky-900/10' : 'bg-sky-50/50'}`}>
                      <span><b>From:</b> {memberFrom}</span>
                      <span><b>To:</b> {memberTo}</span>
                      <span><b>Type:</b> {loanType || 'ALL'}</span>
                      <span><b>Generated:</b> {dayjs().format('DD-MMM-YYYY HH:mm')}</span>
                      <span><b>Records:</b> {totals.count}</span>
                    </div>

                    {/* Table Header */}
                    <div className="flex bg-sky-600 text-white fz-caption font-black rounded-t px-1 py-1.5">
                      <span style={{ width: '4%' }}>SR</span>
                      <span style={{ width: '10%' }}>Member No</span>
                      <span style={{ width: '18%' }}>Member Name</span>
                      <span style={{ width: '11%' }}>Loan No</span>
                      <span style={{ width: '7%' }}>Type</span>
                      <span style={{ width: '12%', textAlign: 'right' }}>Loan Amt</span>
                      <span style={{ width: '10%' }}>Surety No</span>
                      <span style={{ width: '18%' }}>Surety Name</span>
                      <span style={{ width: '10%', textAlign: 'right' }}>Outstanding</span>
                    </div>

                    {/* Rows */}
                    {reportData.map((item, idx) => (
                      <div
                        key={idx}
                        className={`flex fz-caption px-1 py-1 border-b ${
                          isDark
                            ? idx % 2 === 0 ? 'bg-slate-800' : 'bg-slate-900'
                            : idx % 2 === 0 ? 'bg-white' : 'bg-sky-50/40'
                        }`}
                      >
                        <span style={{ width: '4%' }}>{idx + 1}</span>
                        <span style={{ width: '10%', color: '#1e40af', fontWeight: 700 }}>{item.mbno}</span>
                        <span style={{ width: '18%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.memberName}</span>
                        <span style={{ width: '11%', color: '#7c3aed', fontWeight: 700 }}>{item.loanNo}</span>
                        <span style={{ width: '7%', color: '#059669', fontWeight: 700 }}>{item.loanType}</span>
                        <span style={{ width: '12%', textAlign: 'right', color: '#059669', fontWeight: 800 }}>{fmtAmt(item.loanAmount)}</span>
                        <span style={{ width: '10%', color: '#dc2626' }}>{item.suretyMbno || '-'}</span>
                        <span style={{ width: '18%', color: '#dc2626', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.suretyName || '-'}</span>
                        <span style={{ width: '10%', textAlign: 'right', color: '#dc2626', fontWeight: 800 }}>{fmtAmt(item.outstandingBalance)}</span>
                      </div>
                    ))}

                    {/* Total Row */}
                    <div className={`flex fz-caption font-black px-1 py-2 border-t-2 rounded-b ${isDark ? 'bg-sky-900/20 border-sky-500' : 'bg-sky-50 border-sky-400'}`}>
                      <span style={{ width: '4%' }}></span>
                      <span style={{ width: '10%' }}></span>
                      <span style={{ width: '18%' }}>Total: {totals.count} Records</span>
                      <span style={{ width: '11%' }}></span>
                      <span style={{ width: '7%' }}></span>
                      <span style={{ width: '12%', textAlign: 'right', color: '#059669' }}>{fmtAmt(totals.totalLoan)}</span>
                      <span style={{ width: '10%' }}></span>
                      <span style={{ width: '18%' }}></span>
                      <span style={{ width: '10%', textAlign: 'right', color: '#dc2626' }}>{fmtAmt(totals.totalOutstanding)}</span>
                    </div>

                    <div className="text-center fz-caption text-slate-400 mt-2 italic">
                      Report As Per Data Available....
                    </div>
                  </div>
                ) : (
                  <div className="py-32 text-center">
                    <div className="w-20 h-20 bg-sky-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <FileText size={40} className="text-sky-200" />
                    </div>
                    <p className="fz-label font-black text-slate-400 uppercase tracking-wider">No Data</p>
                    <p className="fz-caption text-slate-300 mt-1">Enter member range and generate report</p>
                  </div>
                )}
              </Spin>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={showLookup} onCancel={() => setShowLookup(false)}
        footer={null} width={950} centered destroyOnClose
        styles={{ body: { padding: 0 } }}
        title={
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-sky-600 rounded-lg flex items-center justify-center"><Users size={14} className="text-white" /></div>
            <span className="font-black">Member Lookup — Select {lookupField === 'from' ? 'From' : 'To'} Member</span>
          </div>
        }
      >
        <MemberLookup isModal={true} onSelect={handleMemberSelect} onClose={() => setShowLookup(false)} />
      </Modal>
    </ConfigProvider>
  );
};

export default SuretyRegisterReport;
