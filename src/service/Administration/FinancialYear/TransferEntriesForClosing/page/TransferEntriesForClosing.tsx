// page/TransferEntriesForClosing.tsx

import React, { useState, useEffect } from 'react';
import {
  Lock, ChevronRight, Database, Building2,
  Calendar, X, CheckCircle2, AlertCircle, RefreshCw, Plus,
} from 'lucide-react';
import { ConfigProvider } from 'antd';
import { apiService } from '../../../../../services/api';
import { usePageToolbarActions } from '../../../../../utils/pageToolbarActions';

interface FinancialYear {
  yearCode: number;
  startDate?: string;
  endDate?: string;
  closedAt?: string | null;
  label?: string;
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

const fmtDate = (d?: string) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

const yearLabel = (fy: FinancialYear): string => {
  if (fy.label) return fy.label;
  if (fy.startDate && fy.endDate) {
    const s = new Date(fy.startDate).getFullYear();
    const e = new Date(fy.endDate).getFullYear();
    return s === e ? `${s}` : `${s}–${String(e).slice(2)}`;
  }
  return `FY ${fy.yearCode}`;
};

const TransferEntriesForClosing: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [years, setYears] = useState<FinancialYear[]>([]);
  const [selectedCode, setSelectedCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingYears, setIsLoadingYears] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Genesis create-year form — shown when no financial years exist at all
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [isCreatingYear, setIsCreatingYear] = useState(false);

  const loadYears = async () => {
    setIsLoadingYears(true);
    try {
      const res = await apiService.getFinancialYears();
      if (res.success && res.data) {
        setYears(res.data);
        // Auto-select first non-closed year
        const open = res.data.find((y: FinancialYear) => !y.closedAt);
        if (open) setSelectedCode(String(open.yearCode));
      }
    } catch {
      /* silent — user can still type */
    } finally {
      setIsLoadingYears(false);
    }
  };

  useEffect(() => { loadYears(); }, []);

  const handleCreateYear = async () => {
    if (!newStart || !newEnd) {
      await showDialog('warning', 'Required', 'Please enter both a start date and an end date.', '');
      return;
    }
    if (newStart >= newEnd) {
      await showDialog('warning', 'Invalid Range', 'Start date must be before end date.', '');
      return;
    }
    setIsCreatingYear(true);
    try {
      const response = await apiService.createFinancialYear(newStart, newEnd);
      if (response.success) {
        await showDialog('info', 'Financial Year Created', 'The financial year has been created.', `Period: ${newStart} → ${newEnd}`);
        setNewStart('');
        setNewEnd('');
        await loadYears();
      } else {
        await showDialog('error', 'Create Failed', response.error || 'Failed to create financial year.', '');
      }
    } catch (err: any) {
      await showDialog('error', 'System Error', 'Unable to create financial year.', err?.message || 'Check server connection.');
    } finally {
      setIsCreatingYear(false);
    }
  };

  const selectedYear = years.find(y => String(y.yearCode) === selectedCode);

  const handleSubmit = async () => {
    if (!selectedCode.trim()) {
      await showDialog('warning', 'Required', 'Please select a Financial Year to proceed.', '');
      return;
    }

    const yearCodeNum = parseInt(selectedCode, 10);
    if (isNaN(yearCodeNum)) {
      await showDialog('error', 'Invalid Input', 'Financial Year Code must be numeric.', '');
      return;
    }

    if (selectedYear?.closedAt) {
      await showDialog('warning', 'Already Closed', `Financial Year ${yearLabel(selectedYear!)} is already closed.`, 'Select an open financial year.');
      return;
    }

    // Confirmation before destructive operation
    const api = (window as any).electronAPI;
    let confirmed = false;
    if (api?.showMessageBox) {
      const res = await api.showMessageBox({
        type: 'warning',
        title: 'Confirm Transfer',
        message: `Initiate ledger transit for ${selectedYear ? yearLabel(selectedYear) : `FY ${yearCodeNum}`}?`,
        detail: 'This will post closing transfer entries for the selected financial year.\n\nThis operation cannot be easily undone. Proceed only if year-end accounts are verified.',
        buttons: ['Cancel', 'Initiate Transfer'],
        defaultId: 0,
        cancelId: 0,
      });
      confirmed = res.response === 1;
    } else {
      confirmed = window.confirm(`Initiate transfer entries for FY ${yearCodeNum}? This cannot be easily undone.`);
    }

    if (!confirmed) return;

    setIsLoading(true);
    setStatusMsg(null);
    try {
      const response = await apiService.initiateYearTransfer(yearCodeNum);
      if (response.success) {
        setStatusMsg({ type: 'success', text: response.data?.message || `Transfer entries for ${yearLabel(selectedYear!)} posted successfully.` });
        await showDialog(
          'info',
          'Transfer Complete',
          `Ledger transit for ${selectedYear ? yearLabel(selectedYear) : `FY ${yearCodeNum}`} completed.`,
          (response.data?.message || 'Transfer entries have been posted.') + '\n\n✓ Proceed with Financial Year Closing when ready.'
        );
        await loadYears();
      } else {
        const errMsg = response.error || 'System failed to finalize fiscal balances.';
        setStatusMsg({ type: 'error', text: errMsg });
        await showDialog('error', 'Transfer Failed', errMsg, 'Check server logs or contact support.');
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Connection to ledger server lost during transit.';
      setStatusMsg({ type: 'error', text: errMsg });
      await showDialog('error', 'System Error', errMsg, '');
    } finally {
      setIsLoading(false);
    }
  };

  usePageToolbarActions({
    onSave: handleSubmit,
    saveLabel: 'Initiate Transfer',
    saveEnabled: !(!selectedCode || isLoading || isLoadingYears),
  });

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#6366f1', borderRadius: 8 } }}>
      <style>{`
        html.dark .tefc-page { background: #0f172a !important; }
        html.dark .tefc-page .tefc-header { background: #1e293b !important; border-color: #334155 !important; }
        html.dark .tefc-page .tefc-header-icon { background: #312e81 !important; color: #818cf8 !important; }
        html.dark .tefc-page .tefc-title { color: #f1f5f9 !important; }
        html.dark .tefc-page .tefc-sub { color: #818cf8 !important; }
        html.dark .tefc-page .tefc-card { background: #1e293b !important; border-color: #334155 !important; }
        html.dark .tefc-page .tefc-select { background: #0f172a !important; border-color: #4f46e5 !important; color: #f1f5f9 !important; }
        html.dark .tefc-page .tefc-select option { background: #1e293b; color: #f1f5f9; }
        html.dark .tefc-page .tefc-detail-box { background: #0f172a !important; border-color: #334155 !important; }
        html.dark .tefc-page .tefc-detail-label { color: #64748b !important; }
        html.dark .tefc-page .tefc-detail-value { color: #e2e8f0 !important; }
        html.dark .tefc-page .tefc-cancel-btn { background: #1e293b !important; border-color: #334155 !important; color: #94a3b8 !important; }
        html.dark .tefc-page .tefc-cancel-btn:hover { background: #334155 !important; color: #f1f5f9 !important; }
        html.dark .tefc-page .tefc-footer { background: #1e293b !important; border-color: #334155 !important; }
        html.dark .tefc-page .tefc-footer-text { color: #475569 !important; }
      `}</style>

      <div className={`tefc-page h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-white to-slate-50 font-sans overflow-hidden ${className}`}>

        {/* ── Header ── */}
        <div className="tefc-header bg-white border-b-2 border-indigo-100 px-3 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="tefc-header-icon bg-indigo-100 p-1.5 rounded-lg">
              <Database size={13} className="text-indigo-600" />
            </div>
            <div>
              <h1 className="tefc-title fz-caption font-black text-slate-800 uppercase tracking-tight leading-none">Transfer Entries For Closing</h1>
              <p className="tefc-sub fz-caption text-indigo-400 font-bold leading-none mt-0.5">Financial Year · Ledger Transit</p>
            </div>
          </div>
          <button onClick={closeWindow} title="Close"
            className="w-6 h-6 text-slate-400 hover:text-white hover:bg-red-500 rounded transition-all flex items-center justify-center">
            <X size={12} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 flex flex-col p-3 overflow-auto">
          <div className="max-w-md w-full mx-auto space-y-2">

            {/* Main Card */}
            <div className="tefc-card bg-white rounded-xl border-2 border-indigo-100 shadow-md overflow-hidden">

              {/* Card header */}
              <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-3 py-2 flex items-center justify-between">
                <label className="fz-caption font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Lock size={10} className="text-indigo-200" />
                  Select Financial Year
                </label>
                <button onClick={loadYears} disabled={isLoadingYears}
                  className="text-indigo-200 hover:text-white transition-colors disabled:opacity-50">
                  <RefreshCw size={10} className={isLoadingYears ? 'animate-spin' : ''} />
                </button>
              </div>

              <div className="p-3 space-y-2">
                {/* Year selector */}
                <div className="relative">
                  <Calendar size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" />
                  <select
                    value={selectedCode}
                    onChange={e => setSelectedCode(e.target.value)}
                    disabled={isLoading || isLoadingYears}
                    className="tefc-select w-full h-8 bg-indigo-50 border-2 border-indigo-200 rounded-lg pl-8 pr-3 fz-caption font-black text-slate-900 outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500 transition-all appearance-none disabled:opacity-60 cursor-pointer"
                  >
                    <option value="">— Select Financial Year —</option>
                    {years.map(fy => (
                      <option key={fy.yearCode} value={fy.yearCode}>
                        {yearLabel(fy)} (Code: {fy.yearCode}){fy.closedAt ? ' ✓ Closed' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected year detail */}
                {selectedYear && (
                  <div className="tefc-detail-box bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1.5 grid grid-cols-3 gap-2">
                    <div>
                      <p className="tefc-detail-label fz-caption font-bold text-indigo-400 uppercase leading-none mb-0.5" style={{ fontSize: '9px' }}>From</p>
                      <p className="tefc-detail-value fz-caption font-black text-slate-700 leading-none">{fmtDate(selectedYear.startDate)}</p>
                    </div>
                    <div>
                      <p className="tefc-detail-label fz-caption font-bold text-indigo-400 uppercase leading-none mb-0.5" style={{ fontSize: '9px' }}>To</p>
                      <p className="tefc-detail-value fz-caption font-black text-slate-700 leading-none">{fmtDate(selectedYear.endDate)}</p>
                    </div>
                    <div>
                      <p className="tefc-detail-label fz-caption font-bold text-indigo-400 uppercase leading-none mb-0.5" style={{ fontSize: '9px' }}>Status</p>
                      <p className={`fz-caption font-black leading-none ${selectedYear.closedAt ? 'text-emerald-600' : 'text-amber-500'}`}>
                        {selectedYear.closedAt ? 'Closed' : 'Open'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Status indicator */}
                <div className="flex items-center gap-1.5 px-0.5">
                  {statusMsg ? (
                    statusMsg.type === 'success'
                      ? <><CheckCircle2 size={11} className="text-emerald-500 shrink-0" /><span className="fz-caption font-bold text-emerald-600 leading-tight">{statusMsg.text}</span></>
                      : <><AlertCircle size={11} className="text-rose-500 shrink-0" /><span className="fz-caption font-bold text-rose-600 leading-tight">{statusMsg.text}</span></>
                  ) : (
                    <><div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse shrink-0" />
                    <span className="fz-caption font-bold text-indigo-500 uppercase tracking-tight">System Ready</span></>
                  )}
                </div>
              </div>
            </div>

            {/* No financial year exists yet — genesis create form */}
            {!isLoadingYears && years.length === 0 && (
              <div className="tefc-card bg-white rounded-xl border-2 border-indigo-100 shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-3 py-2">
                  <h2 className="fz-caption font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Plus size={10} className="text-indigo-200" />
                    No Financial Year Set Up Yet
                  </h2>
                </div>
                <div className="p-3 space-y-2">
                  <p className="fz-caption text-slate-500 font-semibold leading-snug">
                    No financial year exists yet. Create the first one to begin using Transfer Entries and Financial Year Closing.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <label className="fz-caption font-black text-slate-600 uppercase tracking-tight">Start Date</label>
                      <input type="date" value={newStart} onChange={e => setNewStart(e.target.value)}
                        disabled={isCreatingYear}
                        className="w-full h-8 bg-indigo-50 border-2 border-indigo-200 rounded-lg px-2 fz-caption font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60" />
                    </div>
                    <div className="space-y-0.5">
                      <label className="fz-caption font-black text-slate-600 uppercase tracking-tight">End Date</label>
                      <input type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)}
                        disabled={isCreatingYear}
                        className="w-full h-8 bg-indigo-50 border-2 border-indigo-200 rounded-lg px-2 fz-caption font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60" />
                    </div>
                  </div>
                  <button onClick={handleCreateYear} disabled={isCreatingYear || !newStart || !newEnd}
                    className="w-full h-8 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-400 text-white font-black rounded-lg fz-caption shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:cursor-not-allowed">
                    {isCreatingYear
                      ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /><span className="uppercase tracking-wider">Creating...</span></>
                      : <><Plus size={12} /><span className="uppercase tracking-wider">Create Financial Year</span></>}
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <button onClick={closeWindow} disabled={isLoading}
                className="tefc-cancel-btn flex-1 h-8 bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50 font-black rounded-lg fz-caption transition-all">
                Cancel
              </button>
              <button onClick={handleSubmit}
                disabled={!selectedCode || isLoading || isLoadingYears}
                className="flex-[2] h-8 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-400 text-white font-black rounded-lg fz-caption shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:cursor-not-allowed group">
                {isLoading
                  ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /><span className="uppercase tracking-wider">Processing...</span></>
                  : <><span className="uppercase tracking-wider">Initiate Transfer</span><ChevronRight size={11} className="group-hover:translate-x-0.5 transition-transform" /></>}
              </button>
            </div>

          </div>
        </div>

        {/* ── Footer ── */}
        <div className="tefc-footer bg-white border-t border-slate-100 px-3 py-1 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1">
            <Building2 size={9} className="text-slate-400" />
            <span className="tefc-footer-text fz-caption font-bold text-slate-400 uppercase tracking-tight" style={{ fontSize: '9px' }}>Financial Year Management</span>
          </div>
          <span className="tefc-footer-text fz-caption font-bold text-slate-300 uppercase tracking-tight" style={{ fontSize: '9px' }}>Ledger Transit System</span>
        </div>

      </div>
    </ConfigProvider>
  );
};

export default TransferEntriesForClosing;
