import React, { useState } from 'react';
import {
  Calculator,
  RotateCcw,
  Send,
  FileText,
  TrendingUp,
  IndianRupee,
  ChevronDown,
  Database,
  ArrowUpRight,
  Percent,
  Wallet,
  CheckCircle2,
  Loader2,
  List,
  Users,
  X,
} from 'lucide-react';
import { DatePicker, ConfigProvider } from 'antd';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { useInterestCalculator } from '../hook/useIntresterCal';
import apiService from '../../../../services/api';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';

import type {
  InterestCalculatorProps as IInterestCalculatorProps
} from '../interface/interfaces';

dayjs.extend(customParseFormat);

// BUG FIX: removed 'message' and 'Modal' from antd — both silently fail in Electron renderer.
// All notifications and confirmations now use window.electronAPI?.showMessageBox (native OS dialog).
const showDialog = async (
  type: 'info' | 'warning' | 'error',
  title: string,
  msg: string,
  detail: string,
) => {
  if ((window as any).electronAPI?.showMessageBox) {
    await (window as any).electronAPI.showMessageBox({
      type, title, message: msg, detail, buttons: ['OK'], defaultId: 0,
    });
  } else {
    alert(`[${type.toUpperCase()}] ${msg}\n\n${detail}`);
  }
};

// BUG FIX: Modal.confirm never executes in Electron — use native confirm dialog.
const showConfirm = async (title: string, detail: string): Promise<boolean> => {
  if ((window as any).electronAPI?.showMessageBox) {
    const result = await (window as any).electronAPI.showMessageBox({
      type: 'question',
      title: 'Confirm',
      message: title,
      detail,
      buttons: ['Post Now', 'Cancel'],
      defaultId: 0,
      cancelId: 1,
    });
    return result?.response === 0;
  }
  return window.confirm(`${title}\n\n${detail}`);
};

// Canonical map: display name → backend type code (SB/RD/FD)
const ACCOUNT_TYPE_MAP: Record<string, string> = {
  'RECURRING DEPOSIT': 'RD',
  'SAVINGS ACCOUNT':   'SB',
  'CURRENT ACCOUNT':   'SB',
  'FIXED DEPOSIT':     'FD',
  'NRI ACCOUNT':       'SB',
};

const InterestCalculation: React.FC<IInterestCalculatorProps> = ({
  initialData,
  onCalculationComplete,
  onError,
  disabled = false,
  showCrystalReport = true
}) => {
  const {
    formData,
    updateField,
    resetForm,
    validateForm,
    calculateInterest,
    isLoading,
    errors
  } = useInterestCalculator(initialData);

  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [isPosting, setIsPosting] = useState(false);

  const parseProjectDate = (dateStr: string) => dayjs(dateStr, 'DD-MMM-YYYY');

  const handleCalculate = async () => {
    const validation = validateForm();
    if (!validation.isValid) return;

    try {
      setIsCalculating(true);
      const result = await calculateInterest();
      setCalculationResult(result);
      onCalculationComplete?.(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Calculation failed';
      onError?.(errorMessage);
      await showDialog('error', 'Calculation Error', 'Calculation failed', errorMessage);
    } finally {
      setIsCalculating(false);
    }
  };

  const handlePost = async () => {
    if (!calculationResult) return;

    const accountTypeCode = ACCOUNT_TYPE_MAP[formData.selectedAccount] || 'SB';

    const confirmed = await showConfirm(
      'Confirm Interest Posting',
      `Account Type  : ${formData.selectedAccount}\n` +
      `Period        : ${formData.fromDate} to ${formData.toDate}\n` +
      `Net Interest  : ₹${Number(calculationResult.postAmount).toLocaleString('en-IN')}\n\n` +
      `This will post interest for all eligible members. This action cannot be undone.`
    );
    if (!confirmed) return;

    setIsPosting(true);
    try {
      const fromDateISO   = dayjs(formData.fromDate, 'DD-MMM-YYYY').format('YYYY-MM-DD');
      const toDateISO     = dayjs(formData.toDate,   'DD-MMM-YYYY').format('YYYY-MM-DD');
      const postDateISO   = dayjs(formData.postDate,  'DD-MMM-YYYY').format('YYYY-MM-DD');

      const response = await apiService.updateSavingInterest({
        fromDate: fromDateISO,
        toDate: toDateISO,
        interestRate: parseFloat(formData.rate) || 4,
        // Both accountType (for intType) and accountHead (for GL code) must be the same code
        accountType: accountTypeCode,
        accountHead: accountTypeCode,
        postDate: postDateISO,
        narration: `Interest posting for ${formData.selectedAccount} — ${formData.fromDate} to ${formData.toDate}`,
      });

      if (response.success) {
        const totalMembers = (response.data as any)?.totalMembers || 0;
        await showDialog(
          'info',
          'Interest Posted',
          'Interest Posted Successfully!',
          `ACCOUNT TYPE  : ${formData.selectedAccount}\n` +
          `PERIOD        : ${formData.fromDate} to ${formData.toDate}\n` +
          `MEMBERS       : ${totalMembers}\n` +
          `NET INTEREST  : ₹${Number(calculationResult.postAmount).toLocaleString('en-IN')}\n\n` +
          `✓ Interest credited to member accounts\n` +
          `✓ Ledger entries created`
        );
        setCalculationResult(null);
        resetForm();
      } else {
        await showDialog('error', 'Posting Failed', 'Posting Failed', (response as any).message || 'Server could not complete the interest posting.');
      }
    } catch (err: any) {
      await showDialog('error', 'Connection Error', 'Unable to Connect to Server', `Technical details: ${err.message}`);
    } finally {
      setIsPosting(false);
    }
  };

  const handleCrystalReport = async () => {
    await showDialog('info', 'Feature Info', 'Feature Not Available', 'Crystal Report generation is not available in this version.');
  };

  const handleReset = () => {
    resetForm();
    setCalculationResult(null);
  };

  const handleClose = () => {
    if ((window as any).electronAPI?.ipcRenderer) {
      (window as any).electronAPI.ipcRenderer.send('window-close');
    } else {
      window.close();
    }
  };

  usePageToolbarActions({
    onSave: handlePost,
    saveLabel: isPosting ? 'POSTING...' : 'POST TRANSACTION',
    saveEnabled: !(disabled || !calculationResult || isPosting),
  });

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#4f46e5',
          borderRadius: 6,
        },
      }}
    >
      <style>{`
        /* ── DatePicker base styles ── */
        .interest-datepicker .ant-picker {
          background-color: white !important;
          border: 2px solid #cbd5e1 !important;
          height: 24px !important;
          border-radius: 6px !important;
        }
        .interest-datepicker .ant-picker-input > input {
          font-weight: 900 !important;
          font-size: var(--fz-body) !important;
          color: #0f172a !important;
        }
        .interest-datepicker .ant-picker:focus,
        .interest-datepicker .ant-picker-focused {
          border-color: #94a3b8 !important;
          box-shadow: none !important;
        }
        .ant-input::placeholder,
        .ant-picker-input > input::placeholder {
          color: #cbd5e1 !important;
          font-size: 8px !important;
        }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        .scrollbar-thin::-webkit-scrollbar { width: 8px; height: 8px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #818cf8; border-radius: 4px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #6366f1; }

        /* ── Dark mode root ── */
        html.dark .ic-page { background: #0f0f0f; }

        /* Header buttons */
        html.dark .ic-page .ic-hdr-btn { color: #f5f5f7 !important; }
        html.dark .ic-page .ic-hdr-btn:hover { background: rgba(255,255,255,0.1) !important; }

        /* Cards */
        html.dark .ic-page .ic-card { background: #1a1a1a !important; border-color: #2a2a2a !important; }
        html.dark .ic-page .ic-card-icon { background: #252525 !important; color: #8e8e93 !important; }
        html.dark .ic-page .ic-card-title { color: #8e8e93 !important; }

        /* Labels */
        html.dark .ic-page .ic-label { color: #8e8e93 !important; }

        /* Select & inputs */
        html.dark .ic-page .ic-select,
        html.dark .ic-page .ic-input {
          background: #1f1f1f !important;
          border-color: #2a2a2a !important;
          color: #f5f5f7 !important;
        }
        html.dark .ic-page .ic-icon { color: #71717a !important; }

        /* DatePicker dark override (must beat base white !important) */
        html.dark .ic-page .interest-datepicker .ant-picker { background-color: #1f1f1f !important; border-color: #2a2a2a !important; }
        html.dark .ic-page .interest-datepicker .ant-picker-input > input { color: #f5f5f7 !important; background: transparent !important; }
        html.dark .ic-page .interest-datepicker .ant-picker .ant-picker-suffix { color: #71717a !important; }
        html.dark .ic-page .interest-datepicker .ant-picker:hover { border-color: #4f46e5 !important; }

        /* Post & report buttons */
        html.dark .ic-page .ic-report-btn { background: #1f1f1f !important; border-color: #2a2a2a !important; color: #f5f5f7 !important; }
        html.dark .ic-page .ic-report-btn:hover { background: #252525 !important; }

        /* Results area */
        html.dark .ic-page .ic-results-card { background: #1a1a1a !important; border-color: #2a2a2a !important; }
        html.dark .ic-page .ic-results-hdr { background: linear-gradient(to right,#1f1f1f,#252525) !important; border-color: #2a2a2a !important; }
        html.dark .ic-page .ic-results-title { color: #f5f5f7 !important; }
        html.dark .ic-page .ic-results-sub { color: #71717a !important; }
        html.dark .ic-page .ic-results-icon { background: #252525 !important; color: #8e8e93 !important; }
        html.dark .ic-page .ic-ready-badge { background: #1f2937 !important; color: #f5f5f7 !important; border-color: #374151 !important; }
        html.dark .ic-page .ic-calc-indicator { color: #8e8e93 !important; }

        /* Scrollbar dark */
        html.dark .ic-page .scrollbar-thin::-webkit-scrollbar-track { background: #1f1f1f; }
        html.dark .ic-page .scrollbar-thin::-webkit-scrollbar-thumb { background: #4f46e5; }

        /* Loading spinner */
        html.dark .ic-page .ic-loading-ring { border-color: #2a2a2a !important; border-top-color: #818cf8 !important; }
        html.dark .ic-page .ic-loading-icon { color: #818cf8 !important; }
        html.dark .ic-page .ic-loading-txt { color: #71717a !important; }

        /* Table */
        html.dark .ic-page .ic-table-wrap { border-color: #2a2a2a !important; }
        html.dark .ic-page .ic-table thead tr { background: #252525 !important; border-color: #2a2a2a !important; }
        html.dark .ic-page .ic-table thead th { color: #8e8e93 !important; }
        html.dark .ic-page .ic-table tbody { border-color: #222 !important; }
        html.dark .ic-page .ic-table tbody tr { border-color: #222 !important; }
        html.dark .ic-page .ic-table tbody tr:hover { background: #1f1f1f !important; }
        html.dark .ic-page .ic-table .td-mono { color: #818cf8 !important; }
        html.dark .ic-page .ic-table .td-name { color: #f5f5f7 !important; }
        html.dark .ic-page .ic-table .td-amt { color: #8e8e93 !important; }
        html.dark .ic-page .ic-table .td-interest { color: #60a5fa !important; }

        /* Empty state */
        html.dark .ic-page .ic-empty-icon { background: #1f1f1f !important; border-color: #2a2a2a !important; color: #374151 !important; }
        html.dark .ic-page .ic-empty-title { color: #4b5563 !important; }
        html.dark .ic-page .ic-empty-sub { color: #374151 !important; }

        /* Summary cards */
        html.dark .ic-page .ic-summary-card { background: #1a1a1a !important; border-color: #2a2a2a !important; }
        html.dark .ic-page .ic-summary-icon { background: #252525 !important; color: #8e8e93 !important; }
        html.dark .ic-page .ic-summary-label { color: #8e8e93 !important; }
        html.dark .ic-page .ic-summary-val { color: #f5f5f7 !important; }
      `}</style>

      <div className="ic-page min-h-screen flex flex-col bg-slate-50 font-sans selection:bg-indigo-100">

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-2 py-1 flex flex-col md:flex-row md:items-center justify-between gap-2 sticky top-0 z-10 shadow-lg">
          <div className="flex items-center gap-1.5">
            <div className="bg-indigo-600 p-1 rounded text-white shadow-lg shadow-indigo-100">
              <Calculator size={12} />
            </div>
            <div>
              <h1 className="fz-tiny font-black text-white tracking-tight leading-none uppercase">Interest Calculator</h1>
              <p className="fz-nano font-black text-slate-400 uppercase tracking-wider mt-0.5">Investment & Dividend Management</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleReset}
              disabled={disabled}
              className="ic-hdr-btn px-2 py-1 text-white hover:bg-white/10 rounded fz-micro font-black transition-all flex items-center gap-1 uppercase tracking-wider"
            >
              <RotateCcw size={10} /> Reset
            </button>
            <button
              onClick={handleCalculate}
              disabled={disabled || isCalculating}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded fz-micro font-black shadow-md shadow-indigo-100 transition-all flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 uppercase tracking-wider"
            >
              {isCalculating ? <Loader2 size={10} className="animate-spin" /> : <Calculator size={10} />}
              {isCalculating ? 'Calculating...' : 'Run Analysis'}
            </button>
            <button
              onClick={handleClose}
              className="ic-hdr-btn p-1.5 text-white hover:bg-white/10 rounded transition-all"
              title="Close"
            >
              <X size={12} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-1.5">
          <div className="max-w-7xl mx-auto space-y-1.5">

            {/* Top: Account Type Selection + Posting Card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-1.5">

              {/* Interest Scope */}
              <div className="ic-card lg:col-span-8 border-2 border-slate-200 rounded p-1.5 bg-white shadow-sm">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="ic-card-icon bg-slate-50 p-1 rounded text-slate-600">
                    <Wallet size={11} />
                  </div>
                  <h2 className="ic-card-title fz-micro font-black text-slate-700 uppercase tracking-wider">Interest Scope</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                  <div className="space-y-1.5">
                    <div>
                      <label className="ic-label text-slate-600 font-black fz-label uppercase mb-0.5 block tracking-wider">Select Account Type</label>
                      <div className="relative group">
                        <select
                          value={formData.selectedAccount}
                          onChange={(e) => updateField('selectedAccount', e.target.value)}
                          disabled={disabled}
                          className="ic-select w-full bg-white border-2 border-slate-300 rounded px-2 py-1 fz-body font-black text-slate-900 outline-none focus:border-slate-400 transition-all appearance-none cursor-pointer"
                        >
                          <option value="RECURRING DEPOSIT">RECURRING DEPOSIT</option>
                          <option value="SAVINGS ACCOUNT">SAVINGS ACCOUNT</option>
                          <option value="CURRENT ACCOUNT">CURRENT ACCOUNT</option>
                          <option value="FIXED DEPOSIT">FIXED DEPOSIT</option>
                          <option value="NRI ACCOUNT">NRI ACCOUNT</option>
                        </select>
                        <div className="ic-icon absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 transition-colors">
                          <ChevronDown size={12} />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="ic-label text-slate-600 font-black fz-label uppercase mb-0.5 block tracking-wider">From Date</label>
                        <DatePicker
                          value={parseProjectDate(formData.fromDate)}
                          onChange={(date) => updateField('fromDate', date ? date.format('DD-MMM-YYYY') : '')}
                          format="DD-MMM-YYYY"
                          className="w-full interest-datepicker"
                          disabled={disabled}
                          allowClear={false}
                        />
                      </div>
                      <div>
                        <label className="ic-label text-slate-600 font-black fz-label uppercase mb-0.5 block tracking-wider">To Date</label>
                        <DatePicker
                          value={parseProjectDate(formData.toDate)}
                          onChange={(date) => updateField('toDate', date ? date.format('DD-MMM-YYYY') : '')}
                          format="DD-MMM-YYYY"
                          className="w-full interest-datepicker"
                          disabled={disabled}
                          allowClear={false}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5">
                    <div>
                      <label className="ic-label text-slate-600 font-black fz-label uppercase mb-0.5 block tracking-wider">Interest Rate (%)</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={formData.rate}
                          onChange={(e) => updateField('rate', e.target.value)}
                          placeholder="0.00"
                          className={`ic-input w-full bg-white border-2 rounded px-2 py-1 pr-7 fz-body font-black text-slate-900 outline-none focus:border-slate-400 transition-all ${errors.rate ? 'border-red-400' : 'border-slate-300'}`}
                        />
                        <div className="ic-icon absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                          <Percent size={10} />
                        </div>
                      </div>
                      {errors.rate && <p className="fz-nano text-red-500 font-black mt-0.5">{errors.rate}</p>}
                    </div>
                    <div>
                      <label className="ic-label text-slate-600 font-black fz-label uppercase mb-0.5 block tracking-wider">Min Calculation Amount</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={formData.minInterestAmount}
                          onChange={(e) => updateField('minInterestAmount', e.target.value)}
                          placeholder="0.00"
                          className={`ic-input w-full bg-white border-2 rounded px-2 py-1 pr-7 fz-body font-black text-slate-900 outline-none focus:border-slate-400 transition-all ${errors.minInterestAmount ? 'border-red-400' : 'border-slate-300'}`}
                        />
                        <div className="ic-icon absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                          <IndianRupee size={10} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Finalize Transaction */}
              <div className="ic-card lg:col-span-4 border-2 border-slate-200 rounded p-1.5 bg-white shadow-sm">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="ic-card-icon bg-slate-50 p-1 rounded text-slate-600">
                    <Send size={11} />
                  </div>
                  <h2 className="ic-card-title fz-micro font-black text-slate-700 uppercase tracking-wider">Finalize Transaction</h2>
                </div>

                <div className="space-y-1.5">
                  <div>
                    <label className="ic-label text-slate-600 font-black fz-label uppercase mb-0.5 block tracking-wider">Select Posting Date</label>
                    <DatePicker
                      value={parseProjectDate(formData.postDate)}
                      onChange={(date) => updateField('postDate', date ? date.format('DD-MMM-YYYY') : '')}
                      format="DD-MMM-YYYY"
                      className="w-full interest-datepicker"
                      disabled={disabled}
                      allowClear={false}
                    />
                  </div>

                  <div className="space-y-1 pt-1">
                    <button
                      onClick={handlePost}
                      disabled={disabled || !calculationResult || isPosting}
                      className="w-full py-1.5 bg-slate-900 text-white rounded font-black flex items-center justify-center gap-1 shadow-lg hover:bg-slate-800 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:grayscale disabled:hover:translate-y-0 fz-micro uppercase tracking-wider"
                    >
                      {isPosting ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                      {isPosting ? 'POSTING...' : 'POST TRANSACTION'}
                    </button>
                    {showCrystalReport && (
                      <button
                        onClick={handleCrystalReport}
                        disabled={disabled}
                        className="ic-report-btn w-full py-1.5 bg-white border-2 border-slate-300 text-slate-900 font-black rounded hover:bg-slate-50 transition-all flex items-center justify-center gap-1 fz-micro uppercase tracking-wider"
                      >
                        <FileText size={10} /> GENERATE REPORT
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Results Table */}
            <div className="ic-results-card bg-white border-2 border-slate-200 rounded shadow-lg overflow-hidden flex flex-col max-h-[420px]">
              <div className="ic-results-hdr bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200 px-2 py-0.5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5">
                  <div className="ic-results-icon bg-white p-1 rounded shadow-sm text-slate-600">
                    <List size={12} />
                  </div>
                  <div>
                    <h3 className="ic-results-title fz-mini font-black text-slate-800 tracking-tight leading-none">Calculation Breakdown</h3>
                    <p className="ic-results-sub fz-nano text-slate-600 font-black uppercase tracking-wider leading-none mt-0.5">Detailed Ledger Analysis</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {calculationResult && (
                    <div className="ic-ready-badge flex items-center gap-1 bg-slate-100 text-slate-900 px-1.5 py-0.5 rounded-full fz-micro font-black border border-slate-200">
                      <CheckCircle2 size={9} /> Ready
                    </div>
                  )}
                  {isCalculating && (
                    <div className="ic-calc-indicator flex items-center gap-1 text-slate-600 font-black fz-micro uppercase tracking-tight">
                      <Loader2 size={10} className="animate-spin" /> Analyzing...
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-auto p-1.5 scrollbar-thin">
                {isLoading || isCalculating ? (
                  <div className="flex flex-col items-center justify-center h-60 space-y-2">
                    <div className="relative">
                      <div className="ic-loading-ring w-12 h-12 border-4 border-slate-100 border-t-slate-600 rounded-full animate-spin"></div>
                      <Database size={18} className="ic-loading-icon absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-600" />
                    </div>
                    <p className="ic-loading-txt fz-mini font-black text-slate-500 uppercase tracking-wider animate-pulse">Running Financial Deep Scan...</p>
                  </div>
                ) : calculationResult ? (
                  <div className="ic-table-wrap overflow-hidden rounded border border-slate-200">
                    <table className="ic-table w-full text-left border-collapse">
                      <thead className="bg-slate-50 fz-label font-black uppercase text-slate-600 tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="px-2 py-1">MB No</th>
                          <th className="px-2 py-1">Name</th>
                          <th className="px-2 py-1 text-right">Opening Bal</th>
                          <th className="px-2 py-1 text-right">Closing Bal</th>
                          <th className="px-2 py-1 text-right">Interest</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 fz-body font-black">
                        {calculationResult.transactions.map((row: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                            <td className="td-mono px-2 py-1.5 text-indigo-700 font-mono">{row.date}</td>
                            <td className="td-name px-2 py-1.5 text-slate-900">{row.description}</td>
                            <td className="td-amt px-2 py-1.5 text-right text-slate-600">₹{Number(row.amount).toLocaleString('en-IN')}</td>
                            <td className="td-amt px-2 py-1.5 text-right text-slate-900">₹{Number(row.balance).toLocaleString('en-IN')}</td>
                            <td className="td-interest px-2 py-1.5 text-right text-blue-600 font-black">₹{Number(row.interestEarned).toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-60">
                    <div className="ic-empty-icon bg-slate-50 p-4 rounded-full border-4 border-slate-100 mb-2">
                      <TrendingUp size={32} strokeWidth={1} className="text-slate-300" />
                    </div>
                    <h4 className="ic-empty-title fz-small font-black text-slate-400 leading-none">NO ANALYSIS PERFORMED</h4>
                    <p className="ic-empty-sub fz-micro font-black uppercase tracking-tight mt-1 text-slate-400 opacity-60">Configure parameters and click "Run Analysis"</p>
                  </div>
                )}
              </div>
            </div>

            {/* Summary Footer */}
            {calculationResult && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 animate-in fade-in slide-in-from-bottom-4 duration-500">

                <div className="ic-summary-card bg-white border-2 border-slate-200 rounded p-1.5 shadow-md flex items-center gap-1.5 hover:shadow-lg transition-all">
                  <div className="ic-summary-icon bg-slate-50 p-1 rounded text-slate-600">
                    <Wallet size={12} />
                  </div>
                  <div>
                    <p className="ic-summary-label fz-nano font-black text-slate-600 uppercase tracking-wider leading-none mb-0.5">Closing Balance</p>
                    <p className="ic-summary-val fz-small font-black text-slate-900 tracking-tighter">
                      ₹{Number(calculationResult.total).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                <div className="ic-summary-card bg-white border-2 border-slate-200 rounded p-1.5 shadow-md flex items-center gap-1.5 hover:shadow-lg transition-all">
                  <div className="ic-summary-icon bg-slate-50 p-1 rounded text-slate-600">
                    <TrendingUp size={12} />
                  </div>
                  <div>
                    <p className="ic-summary-label fz-nano font-black text-slate-600 uppercase tracking-wider leading-none mb-0.5">Net Interest</p>
                    <p className="ic-summary-val fz-small font-black text-slate-900 tracking-tighter">
                      ₹{Number(calculationResult.postAmount).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                <div className="ic-summary-card bg-white border-2 border-slate-200 rounded p-1.5 shadow-md flex items-center gap-1.5 hover:shadow-lg transition-all">
                  <div className="ic-summary-icon bg-slate-50 p-1 rounded text-slate-600">
                    <Users size={12} />
                  </div>
                  <div>
                    <p className="ic-summary-label fz-nano font-black text-slate-600 uppercase tracking-wider leading-none mb-0.5">Members</p>
                    <p className="ic-summary-val fz-small font-black text-slate-900 tracking-tighter">
                      {calculationResult.transactions.length}
                    </p>
                  </div>
                </div>

                <div className="ic-summary-card bg-white border-2 border-slate-200 rounded p-1.5 shadow-md flex items-center gap-1.5 hover:shadow-lg transition-all">
                  <div className="ic-summary-icon bg-slate-50 p-1 rounded text-slate-600">
                    <ArrowUpRight size={12} />
                  </div>
                  <div>
                    <p className="ic-summary-label fz-nano font-black text-slate-600 uppercase tracking-wider leading-none mb-0.5">Yield Rate</p>
                    <p className="ic-summary-val fz-small font-black text-slate-900 tracking-tighter">
                      {(calculationResult.total - calculationResult.postAmount) === 0
                        ? 'N/A'
                        : ((calculationResult.postAmount / (calculationResult.total - calculationResult.postAmount)) * 100).toFixed(2) + '%'
                      }
                    </p>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default InterestCalculation;
