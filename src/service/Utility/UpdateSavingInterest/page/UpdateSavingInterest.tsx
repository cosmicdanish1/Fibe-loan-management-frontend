import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calculator, TrendingUp, AlertCircle, CheckCircle, Clock, FileText,
  Play, Eye, RefreshCw, Info, ShieldCheck, Building2, Calendar, Settings
} from 'lucide-react';
import { apiService } from '../../../../services/api';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';
import dayjs from 'dayjs';
import { ConfigProvider, Spin, Input, Table, Tag, DatePicker, Select } from 'antd';

const showDialog = async (type: 'info' | 'warning' | 'error', msg: string, detail: string): Promise<void> => {
  if ((window as any).electronAPI?.showMessageBox) {
    await (window as any).electronAPI.showMessageBox({ type, title: 'electron-react-ts', message: msg, detail, buttons: ['OK'], defaultId: 0 });
  } else { alert(`[${type.toUpperCase()}] ${msg}\n\n${detail}`); }
};

const showConfirm = async (title: string, detail: string): Promise<boolean> => {
  if ((window as any).electronAPI?.showMessageBox) {
    const result = await (window as any).electronAPI.showMessageBox({ type: 'question', title: 'electron-react-ts', message: title, detail, buttons: ['Post Now', 'Cancel'], defaultId: 0, cancelId: 1 });
    return result?.response === 0;
  }
  return window.confirm(`${title}\n\n${detail}`);
};

interface InterestCalculationResult { memberNumber: string; memberName: string; accountNumber: string; openingBalance: number; averageBalance: number; interestAmount: number; closingBalance: number; days: number; }
interface InterestRunSummary { totalMembers: number; totalInterestAmount: number; fromDate: string; toDate: string; interestRate: number; voucherNumber: string; calculationDate: string; memberCalculations: InterestCalculationResult[]; }
interface InterestHistory { id: number; intType: string; fromDate: string; toDate: string; rate: number; totalAmount: number; memberCount: number; }

const lbl = "block fz-mini font-black text-slate-500 uppercase tracking-wider mb-0.5";

const UpdateSavingInterest: React.FC = () => {
  const [formData, setFormData] = useState({ fromDate: '', toDate: '', interestRate: 4.0, accountHead: 'A1001', voucherNumber: '', narration: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [previewResult, setPreviewResult] = useState<InterestRunSummary | null>(null);
  const [interestHistory, setInterestHistory] = useState<InterestHistory[]>([]);
  const [currentRate, setCurrentRate] = useState<number>(4.0);
  const [headList, setHeadList] = useState<{ code: string; name: string }[]>([]);

  useEffect(() => { initializeComponent(); }, []);

  const initializeComponent = useCallback(async () => {
    setIsLoading(true);
    try { await Promise.all([loadCurrentRate(), loadHistory(), loadHeads()]); setDefaultDates(); }
    catch { await showDialog('error', 'Initialization Error', 'Failed to initialize component.'); }
    finally { setIsLoading(false); }
  }, []);

  const loadHeads = useCallback(async () => {
    try {
      const response = await apiService.getHeadList();
      const heads = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      setHeadList(Array.isArray(heads) ? heads : []);
    } catch { setHeadList([]); }
  }, []);

  const setDefaultDates = useCallback(() => {
    const now = dayjs();
    const qStart = dayjs().year(now.year()).month(Math.floor(now.month() / 3) * 3).date(1);
    setFormData(prev => ({ ...prev, fromDate: qStart.format('YYYY-MM-DD'), toDate: qStart.add(3, 'month').date(0).format('YYYY-MM-DD') }));
  }, []);

  const loadCurrentRate = useCallback(async () => {
    const response = await apiService.getCurrentInterestRate();
    if (response.success && response.data) {
      const rate = typeof response.data === 'number' ? response.data : 4.0;
      setCurrentRate(rate); setFormData(prev => ({ ...prev, interestRate: rate }));
    }
  }, []);

  const loadHistory = useCallback(async () => {
    const response = await apiService.getInterestHistory();
    if (response.success && response.data) setInterestHistory(Array.isArray(response.data) ? response.data : []);
  }, []);

  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setValidationResult(null); setPreviewResult(null);
  }, []);

  const validateParameters = useCallback(async () => {
    if (!formData.fromDate || !formData.toDate || !formData.interestRate) { await showDialog('warning', 'Missing Fields', 'Please fill all required fields.'); return; }
    setIsValidating(true);
    try {
      const response = await apiService.validateInterestParameters(formData);
      if (response.success && response.data) {
        setValidationResult(response.data);
        if (response.data.valid) await showDialog('info', 'Validation Passed', 'Parameters validated successfully.');
        else await showDialog('error', 'Validation Failed', response.data.message || 'Validation failed.');
      }
    } catch { await showDialog('error', 'Validation Error', 'Validation process failed.'); }
    finally { setIsValidating(false); }
  }, [formData]);

  const previewCalculation = useCallback(async () => {
    setIsPreviewing(true);
    try {
      const response = await apiService.previewInterestCalculation(formData);
      if (response.success && response.data) setPreviewResult(response.data);
      else await showDialog('error', 'Preview Failed', 'Could not generate preview.');
    } catch { await showDialog('error', 'Preview Error', 'Preview calculation failed.'); }
    finally { setIsPreviewing(false); }
  }, [formData]);

  const processInterest = useCallback(async () => {
    const confirmed = await showConfirm('Confirm Interest Posting', `Post interest for ${formData.fromDate} to ${formData.toDate}. This cannot be undone.`);
    if (!confirmed) return;
    setIsProcessing(true);
    try {
      const response = await apiService.updateSavingInterest(formData);
      if (response.success) {
        await showDialog('info', 'Interest Posted', `Members: ${response.data.totalMembers}\nTotal: ₹${response.data.totalInterestAmount}`);
        loadHistory(); setValidationResult(null); setPreviewResult(null);
      } else await showDialog('error', 'Processing Failed', response.message || 'Interest posting failed.');
    } catch { await showDialog('error', 'Critical Error', 'A critical error occurred.'); }
    finally { setIsProcessing(false); }
  }, [formData, loadHistory]);

  const formatCurrency = useCallback((amount: number) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount), []);

  const previewColumns = [
    { title: <span className="fz-mini font-black text-slate-500 uppercase">MB No.</span>, dataIndex: 'memberNumber', key: 'memberNumber', width: 90, render: (v: string) => <span className="fz-small font-black text-indigo-600">{v}</span> },
    { title: <span className="fz-mini font-black text-slate-500 uppercase">Name</span>, dataIndex: 'memberName', key: 'memberName', render: (v: string) => <span className="fz-small font-semibold text-slate-700 truncate block">{v}</span> },
    { title: <span className="fz-mini font-black text-slate-500 uppercase">Avg Balance</span>, dataIndex: 'averageBalance', key: 'averageBalance', align: 'right' as const, render: (v: number) => <span className="fz-small font-black text-slate-700">₹{formatCurrency(v)}</span> },
    { title: <span className="fz-mini font-black text-slate-500 uppercase">Days</span>, dataIndex: 'days', key: 'days', align: 'center' as const, render: (v: number) => <span className="fz-small font-semibold text-slate-600">{v}</span> },
    { title: <span className="fz-mini font-black text-slate-500 uppercase">Interest</span>, dataIndex: 'interestAmount', key: 'interestAmount', align: 'right' as const, render: (v: number) => <span className="fz-small font-black text-emerald-600">₹{formatCurrency(v)}</span> },
  ];

  usePageToolbarActions({
    onSave: processInterest,
    saveLabel: 'Execute Posting',
    saveEnabled: !isProcessing && !!validationResult?.valid,
  });

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#6366f1', borderRadius: 6 } }}>
      <div className="h-screen flex flex-col bg-[#f5f6fa] font-sans overflow-hidden text-slate-900">

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-3 py-2 flex items-center justify-between shrink-0 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg border border-indigo-400/50 bg-indigo-600">
              <Calculator size={13} className="text-white" />
            </div>
            <div>
              <h1 className="fz-caption font-black text-white tracking-wider uppercase leading-none">Saving Interest Ledger</h1>
              <p className="fz-micro font-bold text-indigo-300 uppercase tracking-widest mt-0.5">Financial Yield Configuration</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/10 border border-white/10">
              <TrendingUp size={11} className="text-indigo-300" />
              <span className="fz-tiny font-black uppercase tracking-tighter text-white">Current Rate: {currentRate}%</span>
            </div>
            <button onClick={processInterest} disabled={isProcessing || !validationResult?.valid}
              className="h-7 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 text-white rounded-lg fz-tiny font-black flex items-center gap-1.5 uppercase tracking-wide transition-all">
              {isProcessing ? <RefreshCw size={11} className="animate-spin" /> : <Play size={11} />}
              Execute Posting
            </button>
          </div>
        </div>

        {/* Body */}
        <Spin spinning={isLoading} tip="Syncing with ledger...">
          <div className="flex-1 overflow-hidden p-2 flex gap-2">

            {/* Left Panel */}
            <div className="w-[280px] flex flex-col gap-1.5 overflow-y-auto shrink-0">

              {/* Parameters Card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                  <Settings size={10} className="text-slate-400" />
                  <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Parameters</span>
                </div>
                <div className="p-2.5 space-y-2">
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className={lbl}>From Date</label>
                      <DatePicker value={formData.fromDate ? dayjs(formData.fromDate) : null}
                        onChange={(d) => handleInputChange('fromDate', d ? d.format('YYYY-MM-DD') : '')}
                        format="DD-MMM-YYYY" className="w-full h-7 fz-small" allowClear={false}
                        suffixIcon={<Calendar size={10} className="text-slate-400" />} />
                    </div>
                    <div>
                      <label className={lbl}>To Date</label>
                      <DatePicker value={formData.toDate ? dayjs(formData.toDate) : null}
                        onChange={(d) => handleInputChange('toDate', d ? d.format('YYYY-MM-DD') : '')}
                        format="DD-MMM-YYYY" className="w-full h-7 fz-small" allowClear={false}
                        suffixIcon={<Calendar size={10} className="text-slate-400" />} />
                    </div>
                  </div>
                  <div>
                    <label className={lbl}>Yield Rate (% P.A.)</label>
                    <div className="relative">
                      <TrendingUp size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input type="number" step="0.01" value={formData.interestRate}
                        onChange={e => handleInputChange('interestRate', parseFloat(e.target.value) || 0)}
                        className="h-7 pl-6 fz-small font-semibold" />
                    </div>
                  </div>
                  <div>
                    <label className={lbl}>Ledger Head</label>
                    <Select showSearch value={formData.accountHead || undefined}
                      onChange={val => handleInputChange('accountHead', val)}
                      placeholder="Select ledger head..." className="w-full usi-head-sel" style={{ height: 28 }}
                      optionFilterProp="label" listHeight={300}
                      options={headList.map(h => ({ value: h.code, label: `${h.code} - ${h.name}` }))} />
                  </div>
                  <div>
                    <label className={lbl}>Voucher No.</label>
                    <input value={formData.voucherNumber} onChange={e => handleInputChange('voucherNumber', e.target.value)}
                      placeholder="Auto-generated if blank..."
                      className="h-7 px-2 fz-small font-semibold bg-white border border-slate-300 rounded w-full focus:outline-none focus:border-indigo-400" />
                  </div>
                  <div>
                    <label className={lbl}>Narration</label>
                    <textarea value={formData.narration} onChange={e => handleInputChange('narration', e.target.value)}
                      rows={2} className="px-2 py-1 fz-small font-semibold bg-white border border-slate-300 rounded w-full focus:outline-none focus:border-indigo-400 resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-100">
                    <button onClick={validateParameters} disabled={isValidating}
                      className="h-7 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded fz-tiny font-black uppercase flex items-center justify-center gap-1 transition-all">
                      {isValidating ? <RefreshCw size={10} className="animate-spin" /> : <ShieldCheck size={10} />} Validate
                    </button>
                    <button onClick={previewCalculation} disabled={isPreviewing}
                      className="h-7 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded fz-tiny font-black uppercase flex items-center justify-center gap-1 transition-all border border-indigo-200">
                      {isPreviewing ? <RefreshCw size={10} className="animate-spin" /> : <Eye size={10} />} Snapshot
                    </button>
                  </div>
                </div>
              </div>

              {/* Validation Status */}
              {validationResult && (
                <div className={`rounded-xl border p-2.5 ${validationResult.valid ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    {validationResult.valid ? <CheckCircle size={12} className="text-emerald-600" /> : <AlertCircle size={12} className="text-rose-600" />}
                    <span className={`fz-tiny font-black uppercase ${validationResult.valid ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {validationResult.valid ? 'Validation Passed' : 'Validation Failed'}
                    </span>
                  </div>
                  {validationResult.message && <p className={`fz-mini leading-snug ${validationResult.valid ? 'text-emerald-600' : 'text-rose-600'}`}>{validationResult.message}</p>}
                </div>
              )}

              {/* History */}
              {interestHistory.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                  <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                    <Clock size={10} className="text-slate-400" />
                    <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Batch History</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    {interestHistory.slice(0, 10).map(h => (
                      <div key={h.id} className="px-2.5 py-1.5 border-b border-slate-50 flex items-center justify-between">
                        <div>
                          <p className="fz-tiny font-black text-slate-700">{dayjs(h.fromDate).format('DD/MM/YY')} — {dayjs(h.toDate).format('DD/MM/YY')}</p>
                          <p className="fz-mini text-slate-400">{h.memberCount} members · {h.rate}% p.a.</p>
                        </div>
                        <span className="fz-tiny font-black text-emerald-600">₹{formatCurrency(h.totalAmount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Right Panel: Preview */}
            <div className="flex-1 min-w-0 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
              <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5">
                  <FileText size={10} className="text-slate-400" />
                  <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Preview / Sandbox</span>
                </div>
                {previewResult && (
                  <div className="flex items-center gap-3 fz-tiny font-black">
                    <span className="text-slate-500">{previewResult.totalMembers} members</span>
                    <span className="text-emerald-600">Total: ₹{formatCurrency(previewResult.totalInterestAmount)}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-h-0 overflow-auto">
                {previewResult && previewResult.memberCalculations && previewResult.memberCalculations.length > 0 ? (
                  <Table
                    columns={previewColumns}
                    dataSource={previewResult.memberCalculations.map((r, i) => ({ ...r, key: i }))}
                    pagination={{ pageSize: 20, size: 'small' }}
                    size="small"
                    className="usi-table"
                    scroll={{ y: 'calc(100vh - 200px)' }}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
                    <Eye size={36} className="mb-3 opacity-20" />
                    <p className="fz-tiny font-black uppercase tracking-widest">No Preview Data</p>
                    <p className="fz-tiny text-slate-400 mt-1">Click "Snapshot" after validating parameters</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </Spin>

        <style>{`
          .usi-table .ant-table-thead > tr > th { background: #f8fafc !important; padding: 5px 10px !important; border-bottom: 1px solid #e2e8f0 !important; }
          .usi-table .ant-table-tbody > tr > td { padding: 4px 10px !important; border-bottom: 1px solid #f1f5f9 !important; }
          .usi-table .ant-table-tbody > tr:hover > td { background: #eef2ff !important; }
          .usi-head-sel .ant-select-selector { height: 28px !important; min-height: 28px !important; font-size: 10px !important; font-weight: 600 !important; align-items: center; }
          .usi-head-sel .ant-select-selection-item, .usi-head-sel .ant-select-selection-placeholder { line-height: 26px !important; font-size: 10px !important; }
        `}</style>
      </div>
    </ConfigProvider>
  );
};

export default UpdateSavingInterest;
