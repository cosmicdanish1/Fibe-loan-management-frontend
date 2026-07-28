// page/BalanceTransfer.tsx

import React, { useState } from 'react';
import {
  X, Building2, IndianRupee, Calendar, CheckCircle,
  ShieldCheck, Send, RotateCcw, Database, Info,
  ChevronRight, ShieldAlert, ArrowRight, Search,
} from 'lucide-react';
import { ConfigProvider, DatePicker, Modal } from 'antd';
import dayjs from 'dayjs';
import { apiService } from '../../../../../services/api';
import MemberLookup from '../../../../../components/shared/MemberLookup/MemberLookup';

interface BalanceTransferProps {
  className?: string;
}

interface TransferData {
  fromAccount: string;
  toAccount: string;
  amount: string;
  transferDate: string;
  description: string;
}

interface FormErrors {
  fromAccount?: string;
  toAccount?: string;
  amount?: string;
  transferDate?: string;
  description?: string;
  general?: string;
}

const showDialog = async (
  type: 'info' | 'warning' | 'error',
  title: string,
  msg: string,
  detail = '',
) => {
  const api = (window as any).electronAPI;
  if (api?.showMessageBox) {
    await api.showMessageBox({ type, title, message: msg, detail, buttons: ['OK'], defaultId: 0 });
  } else {
    alert(`[${type.toUpperCase()}] ${msg}${detail ? '\n\n' + detail : ''}`);
  }
};

const closeWindow = () => {
  const api = (window as any).electronAPI;
  if (api?.ipcRenderer?.send) api.ipcRenderer.send('window-close');
  else window.close();
};

const EMPTY: TransferData = {
  fromAccount: '', toAccount: '', amount: '',
  transferDate: dayjs().format('YYYY-MM-DD'), description: '',
};

const BalanceTransfer: React.FC<BalanceTransferProps> = ({ className = '' }) => {
  const [transferData, setTransferData] = useState<TransferData>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastTransfer, setLastTransfer] = useState<TransferData | null>(null);
  const [lookupTarget, setLookupTarget] = useState<'from' | 'to' | null>(null);

  const updateField = (field: keyof TransferData, value: string) => {
    setTransferData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const validateForm = (): boolean => {
    const e: FormErrors = {};
    if (!transferData.fromAccount.trim()) e.fromAccount = 'From account is required';
    if (!transferData.toAccount.trim()) e.toAccount = 'To account is required';
    if (transferData.fromAccount && transferData.toAccount &&
        transferData.fromAccount === transferData.toAccount)
      e.toAccount = 'Source and destination must be different';
    if (!transferData.amount.trim()) {
      e.amount = 'Amount is required';
    } else if (isNaN(Number(transferData.amount)) || Number(transferData.amount) <= 0) {
      e.amount = 'Enter a valid positive amount';
    }
    if (!transferData.transferDate) e.transferDate = 'Date is required';
    if (!transferData.description.trim()) e.description = 'Description is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const isFormValid = (): boolean =>
    !!(transferData.fromAccount.trim() && transferData.toAccount.trim() &&
       transferData.fromAccount !== transferData.toAccount &&
       transferData.amount.trim() && !isNaN(Number(transferData.amount)) &&
       Number(transferData.amount) > 0 && transferData.transferDate &&
       transferData.description.trim());

  const handleReset = () => {
    setTransferData({ ...EMPTY, transferDate: dayjs().format('YYYY-MM-DD') });
    setErrors({});
  };

  const handleTransfer = async () => {
    if (!validateForm()) return;

    // Confirm before processing
    const api = (window as any).electronAPI;
    let confirmed = false;
    if (api?.showMessageBox) {
      const res = await api.showMessageBox({
        type: 'warning',
        title: 'Confirm Transfer',
        message: `Transfer ₹${Number(transferData.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}?`,
        detail: `From: ${transferData.fromAccount}\nTo  : ${transferData.toAccount}\nDate: ${transferData.transferDate}\n\n${transferData.description}`,
        buttons: ['Cancel', 'Process Transfer'],
        defaultId: 0,
        cancelId: 0,
      });
      confirmed = res.response === 1;
    } else {
      confirmed = window.confirm(`Transfer ₹${transferData.amount} from ${transferData.fromAccount} to ${transferData.toAccount}?`);
    }
    if (!confirmed) return;

    setIsLoading(true);
    try {
      const response = await apiService.manualBalanceTransfer({
        ...transferData,
        amount: parseFloat(transferData.amount),
      });

      if (response.success) {
        setLastTransfer({ ...transferData });
        setShowSuccess(true);
      } else {
        setErrors({ general: response.error || 'Transfer failed. Please try again.' });
      }
    } catch (err: any) {
      setErrors({ general: err?.message || 'Balance server unreachable. Check connection.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    setLastTransfer(null);
    handleReset();
  };

  // ── Success Screen ──
  if (showSuccess && lastTransfer) {
    return (
      <ConfigProvider theme={{ token: { colorPrimary: '#10b981', borderRadius: 8 } }}>
        <style>{`
          html.dark .bt-success { background: #0f172a !important; }
          html.dark .bt-success .bt-sc { background: #1e293b !important; border-color: #065f46 !important; }
          html.dark .bt-success .bt-sc-row { background: #0f172a !important; border-color: #334155 !important; color: #94a3b8 !important; }
          html.dark .bt-success .bt-sc-text { color: #f1f5f9 !important; }
          html.dark .bt-success .bt-sc-sub { color: #94a3b8 !important; }
        `}</style>
        <div className={`bt-success h-screen flex items-center justify-center bg-emerald-50 p-4 ${className}`}>
          <div className="max-w-sm w-full animate-in zoom-in duration-300">
            <div className="bt-sc bg-white rounded-2xl shadow-2xl border-2 border-emerald-200 overflow-hidden text-center">
              <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-8">
                <CheckCircle className="w-14 h-14 text-white mx-auto" />
              </div>
              <div className="p-6 space-y-3">
                <h1 className="bt-sc-text fz-body font-black text-slate-800 uppercase tracking-tight">Transfer Complete!</h1>
                <p className="bt-sc-sub fz-caption text-slate-500 font-bold">
                  ₹{Number(lastTransfer.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} transferred successfully
                </p>
                <div className="bt-sc-row bg-slate-50 rounded-xl p-3 flex items-center justify-center gap-2 border border-slate-100">
                  <span className="fz-caption font-black text-slate-700 uppercase">{lastTransfer.fromAccount}</span>
                  <ChevronRight size={12} className="text-emerald-500 shrink-0" />
                  <span className="fz-caption font-black text-slate-700 uppercase">{lastTransfer.toAccount}</span>
                </div>
                <button onClick={handleSuccessClose}
                  className="w-full h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl fz-caption uppercase tracking-wide transition-all mt-1">
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      </ConfigProvider>
    );
  }

  // ── Main Form ──
  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#10b981', borderRadius: 8 } }}>
      <style>{`
        html.dark .bt-page { background: #0f172a !important; }
        html.dark .bt-page .bt-card { background: #1e293b !important; border-color: #064e3b !important; }
        html.dark .bt-page .bt-viz { background: #0f172a !important; border-color: #334155 !important; }
        html.dark .bt-page .bt-viz-icon { background: #1e293b !important; border-color: #334155 !important; color: #6ee7b7 !important; }
        html.dark .bt-page .bt-viz-label { color: #6ee7b7 !important; }
        html.dark .bt-page .bt-transit-badge { background: #064e3b !important; color: #6ee7b7 !important; }
        html.dark .bt-page .bt-divider { background: #334155 !important; }
        html.dark .bt-page .bt-prog-track { background: #334155 !important; }
        html.dark .bt-page .bt-input-label { color: #64748b !important; }
        html.dark .bt-page .bt-input { background: #0f172a !important; border-color: #334155 !important; color: #f1f5f9 !important; }
        html.dark .bt-page .bt-input:focus { border-color: #10b981 !important; }
        html.dark .bt-page .bt-input::placeholder { color: #475569 !important; }
        html.dark .bt-page .bt-input-icon { color: #475569 !important; }
        html.dark .bt-page .bt-search-btn { color: #475569 !important; }
        html.dark .bt-page .bt-search-btn:hover { color: #94a3b8 !important; }
        html.dark .bt-page .bt-textarea { background: #0f172a !important; border-color: #334155 !important; color: #f1f5f9 !important; }
        html.dark .bt-page .bt-textarea::placeholder { color: #475569 !important; }
        html.dark .bt-page .bt-note { background: #1e293b !important; border-color: #334155 !important; border-left-color: #10b981 !important; }
        html.dark .bt-page .bt-note-icon { background: #064e3b !important; color: #6ee7b7 !important; }
        html.dark .bt-page .bt-note-text { color: #94a3b8 !important; }
        html.dark .bt-page .bt-note-label { color: #f1f5f9 !important; }
        html.dark .bt-page .bt-footer { background: #1e293b !important; border-color: #334155 !important; }
        html.dark .bt-page .bt-footer-text { color: #475569 !important; }
        html.dark .bt-page .bt-error { background: #2d0a0a !important; border-color: #7f1d1d !important; }
        html.dark .bt-page .bt-error-text { color: #fca5a5 !important; }
        html.dark .bt-page .ant-picker { background: #0f172a !important; border-color: #334155 !important; }
        html.dark .bt-page .ant-picker input { color: #f1f5f9 !important; }
        html.dark .bt-page .ant-picker .ant-picker-suffix { color: #475569 !important; }
        html.dark .bt-page .ant-picker-focused { border-color: #10b981 !important; }
        html.dark .ant-picker-dropdown .ant-picker-panel-container { background: #1e293b !important; border-color: #334155 !important; }
        html.dark .ant-picker-dropdown .ant-picker-header { background: #1e293b !important; border-color: #334155 !important; color: #f1f5f9 !important; }
        html.dark .ant-picker-dropdown .ant-picker-header button { color: #94a3b8 !important; }
        html.dark .ant-picker-dropdown .ant-picker-content th { color: #64748b !important; }
        html.dark .ant-picker-dropdown .ant-picker-cell { color: #94a3b8 !important; }
        html.dark .ant-picker-dropdown .ant-picker-cell-in-view { color: #f1f5f9 !important; }
        html.dark .ant-picker-dropdown .ant-picker-cell:hover .ant-picker-cell-inner { background: #334155 !important; }
        html.dark .ant-picker-dropdown .ant-picker-cell-selected .ant-picker-cell-inner { background: #10b981 !important; }
        html.dark .ant-modal-content { background: #1e293b !important; }
        html.dark .ant-modal-close { color: #94a3b8 !important; }
      `}</style>

      <div className={`bt-page h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-white to-emerald-50 font-sans overflow-hidden ${className}`}>

        {/* ── Main Card ── */}
        <div className="flex-1 overflow-auto p-2 flex flex-col items-center">
          <div className="max-w-4xl w-full space-y-2">

            <div className="bt-card bg-white border-2 border-emerald-200 rounded-xl shadow-xl overflow-hidden">

              {/* Card header */}
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-2 py-1.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Database size={10} className="text-emerald-100" />
                  <h2 className="fz-caption font-black text-white uppercase tracking-widest">Balance Transfer</h2>
                  <span className="fz-caption text-emerald-200 font-bold">· Fiscal System Ledger</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={handleReset} disabled={isLoading}
                    className="px-2 py-0.5 h-5 text-emerald-100 hover:text-white hover:bg-white/10 rounded fz-caption font-bold transition-all flex items-center gap-1 uppercase disabled:opacity-50">
                    <RotateCcw size={9} /> Reset
                  </button>
                  <button onClick={handleTransfer} disabled={!isFormValid() || isLoading}
                    className="px-2 py-0.5 h-5 bg-white text-emerald-700 hover:bg-emerald-50 disabled:bg-white/30 disabled:text-white/60 rounded fz-caption font-black shadow-sm transition-all flex items-center gap-1 active:scale-95 disabled:cursor-not-allowed uppercase">
                    {isLoading
                      ? <div className="w-2 h-2 border border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      : <Send size={9} />}
                    Process
                  </button>
                  <button onClick={closeWindow}
                    className="text-emerald-200 hover:text-white p-1 rounded transition-all">
                    <X size={12} />
                  </button>
                </div>
              </div>

              <div className="p-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">

                  {/* Visualization panel */}
                  <div className="bt-viz flex flex-col items-center p-3 bg-emerald-50 rounded-lg border-2 border-dashed border-emerald-200 space-y-2 relative overflow-hidden">
                    <div className="flex items-center gap-3 w-full justify-around">
                      <div className="flex flex-col items-center gap-1">
                        <div className="bt-viz-icon w-9 h-9 bg-white rounded-lg shadow-md flex items-center justify-center text-emerald-600 border-2 border-emerald-200">
                          <Database size={14} />
                        </div>
                        <span className="bt-viz-label fz-caption font-black text-emerald-600 uppercase">Source</span>
                        {transferData.fromAccount && (
                          <span className="fz-caption font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded text-center max-w-[80px] truncate" style={{ fontSize: '8px' }}>
                            {transferData.fromAccount}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col items-center gap-1">
                        <ArrowRight size={14} className="text-emerald-400 animate-pulse" />
                        <div className="bt-transit-badge px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full fz-caption font-black uppercase">Transit</div>
                      </div>

                      <div className="flex flex-col items-center gap-1">
                        <div className="bt-viz-icon w-9 h-9 bg-white rounded-lg shadow-md flex items-center justify-center text-emerald-600 border-2 border-emerald-200">
                          <Database size={14} />
                        </div>
                        <span className="bt-viz-label fz-caption font-black text-emerald-600 uppercase">Destination</span>
                        {transferData.toAccount && (
                          <span className="fz-caption font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded text-center max-w-[80px] truncate" style={{ fontSize: '8px' }}>
                            {transferData.toAccount}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="bt-divider w-full h-px bg-emerald-200" />

                    <div className="w-full space-y-1">
                      <div className="flex justify-between fz-caption font-bold text-emerald-600 uppercase px-0.5">
                        <span>Verification Status</span>
                        <span className="text-emerald-700 font-black">
                          {isFormValid() ? 'Ready' : 'Pending'}
                        </span>
                      </div>
                      <div className="bt-prog-track w-full h-1 bg-emerald-100 rounded-full overflow-hidden">
                        <div className={`h-full bg-emerald-500 rounded-full transition-all duration-500 ${
                          isFormValid() ? 'w-full' :
                          (transferData.fromAccount || transferData.toAccount) ? 'w-1/2' : 'w-0'
                        }`} />
                      </div>
                    </div>

                    {transferData.amount && Number(transferData.amount) > 0 && (
                      <div className="w-full text-center">
                        <span className="fz-caption font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          ₹{Number(transferData.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Form inputs */}
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">

                      {/* From Account */}
                      <div className="space-y-0.5">
                        <label className="bt-input-label fz-caption font-black text-slate-400 uppercase tracking-widest">From Account</label>
                        <div className="relative">
                          <Database size={9} className="bt-input-icon absolute left-2 top-1/2 -translate-y-1/2 text-slate-300" />
                          <input type="text" value={transferData.fromAccount}
                            onChange={e => updateField('fromAccount', e.target.value)}
                            className={`bt-input w-full h-6 bg-slate-50 border-2 border-slate-200 rounded-lg pl-6 pr-6 fz-caption font-bold text-slate-700 outline-none transition-all focus:bg-white focus:border-emerald-400 focus:ring-1 focus:ring-emerald-300 ${errors.fromAccount ? 'border-rose-400' : ''}`}
                            placeholder="Source account" />
                          <button type="button" onClick={() => setLookupTarget('from')}
                            className="bt-search-btn absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-emerald-600 transition-colors">
                            <Search size={10} />
                          </button>
                        </div>
                        {errors.fromAccount && <p className="fz-caption font-bold text-rose-500 ml-0.5">{errors.fromAccount}</p>}
                      </div>

                      {/* To Account */}
                      <div className="space-y-0.5">
                        <label className="bt-input-label fz-caption font-black text-slate-400 uppercase tracking-widest">To Account</label>
                        <div className="relative">
                          <Database size={9} className="bt-input-icon absolute left-2 top-1/2 -translate-y-1/2 text-slate-300" />
                          <input type="text" value={transferData.toAccount}
                            onChange={e => updateField('toAccount', e.target.value)}
                            className={`bt-input w-full h-6 bg-slate-50 border-2 border-slate-200 rounded-lg pl-6 pr-6 fz-caption font-bold text-slate-700 outline-none transition-all focus:bg-white focus:border-emerald-400 focus:ring-1 focus:ring-emerald-300 ${errors.toAccount ? 'border-rose-400' : ''}`}
                            placeholder="Destination account" />
                          <button type="button" onClick={() => setLookupTarget('to')}
                            className="bt-search-btn absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-emerald-600 transition-colors">
                            <Search size={10} />
                          </button>
                        </div>
                        {errors.toAccount && <p className="fz-caption font-bold text-rose-500 ml-0.5">{errors.toAccount}</p>}
                      </div>

                      {/* Amount */}
                      <div className="space-y-0.5">
                        <label className="bt-input-label fz-caption font-black text-slate-400 uppercase tracking-widest">Amount</label>
                        <div className="relative">
                          <IndianRupee size={9} className="bt-input-icon absolute left-2 top-1/2 -translate-y-1/2 text-slate-300" />
                          <input type="number" step="0.01" min="0"
                            value={transferData.amount}
                            onChange={e => updateField('amount', e.target.value)}
                            className={`bt-input w-full h-6 bg-slate-50 border-2 border-slate-200 rounded-lg pl-6 pr-2 fz-caption font-bold text-slate-700 outline-none transition-all focus:bg-white focus:border-emerald-400 focus:ring-1 focus:ring-emerald-300 ${errors.amount ? 'border-rose-400' : ''}`}
                            placeholder="0.00" />
                        </div>
                        {errors.amount && <p className="fz-caption font-bold text-rose-500 ml-0.5">{errors.amount}</p>}
                      </div>

                      {/* Transfer Date */}
                      <div className="space-y-0.5">
                        <label className="bt-input-label fz-caption font-black text-slate-400 uppercase tracking-widest">Transfer Date</label>
                        <DatePicker
                          value={transferData.transferDate ? dayjs(transferData.transferDate) : null}
                          onChange={date => updateField('transferDate', date ? date.format('YYYY-MM-DD') : '')}
                          className={`w-full h-6 bg-slate-50 border-2 rounded-lg fz-caption font-bold text-slate-700 outline-none transition-all ${errors.transferDate ? 'border-rose-400' : 'border-slate-200 hover:border-emerald-400'}`}
                          format="DD-MMM-YYYY"
                          suffixIcon={<Calendar size={10} className="text-slate-300" />}
                          allowClear={false}
                        />
                        {errors.transferDate && <p className="fz-caption font-bold text-rose-500 ml-0.5">{errors.transferDate}</p>}
                      </div>

                      {/* Description */}
                      <div className="sm:col-span-2 space-y-0.5">
                        <label className="bt-input-label fz-caption font-black text-slate-400 uppercase tracking-widest">Description</label>
                        <textarea
                          value={transferData.description}
                          onChange={e => updateField('description', e.target.value)}
                          rows={2}
                          className={`bt-textarea w-full p-1.5 bg-slate-50 border-2 border-slate-200 rounded-lg fz-caption font-bold text-slate-700 outline-none transition-all resize-none focus:bg-white focus:border-emerald-400 focus:ring-1 focus:ring-emerald-300 ${errors.description ? 'border-rose-400' : ''}`}
                          placeholder="Purpose of transfer..."
                        />
                        {errors.description && <p className="fz-caption font-bold text-rose-500 ml-0.5">{errors.description}</p>}
                      </div>
                    </div>

                    {/* General error */}
                    {errors.general && (
                      <div className="bt-error bg-rose-50 border-2 border-rose-200 rounded-lg p-1.5 flex items-center gap-1.5">
                        <ShieldAlert size={10} className="text-rose-500 shrink-0" />
                        <p className="bt-error-text fz-caption text-rose-700 font-bold">{errors.general}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="bt-note bg-white border-2 border-emerald-100 border-l-4 border-l-emerald-500 rounded-lg p-2 flex items-center gap-2 shadow-sm">
              <div className="bt-note-icon bg-emerald-50 p-1 rounded-lg text-emerald-600 shrink-0">
                <Info size={10} />
              </div>
              <p className="bt-note-text fz-caption text-slate-500 font-semibold leading-snug">
                <span className="bt-note-label text-slate-900 uppercase tracking-widest font-black mr-1">Note:</span>
                Balance transfers are processed immediately. Ensure all account details are correct before proceeding.
              </p>
            </div>

          </div>
        </div>

        {/* ── Footer ── */}
        <div className="bt-footer bg-white border-t border-slate-100 px-2 py-1 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1">
            <Building2 size={9} className="text-slate-400" />
            <span className="bt-footer-text fz-caption font-bold text-slate-400 uppercase tracking-tight" style={{ fontSize: '9px' }}>Financial Systems</span>
          </div>
          <div className="flex items-center gap-1">
            <ShieldCheck size={9} className="text-slate-400" />
            <span className="bt-footer-text fz-caption font-bold text-slate-400 uppercase tracking-tight" style={{ fontSize: '9px' }}>Verified Protocol</span>
          </div>
        </div>

        {/* ── Member Lookup Modal ── */}
        <Modal open={!!lookupTarget} onCancel={() => setLookupTarget(null)}
          footer={null} width={800} styles={{ body: { padding: 0 } }}
          closable={false} centered>
          <MemberLookup
            isModal
            onSelect={member => {
              if (lookupTarget === 'from') updateField('fromAccount', member.memberNo);
              else if (lookupTarget === 'to') updateField('toAccount', member.memberNo);
              setLookupTarget(null);
            }}
            onClose={() => setLookupTarget(null)}
          />
        </Modal>

      </div>
    </ConfigProvider>
  );
};

export default BalanceTransfer;
