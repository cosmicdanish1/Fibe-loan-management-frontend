// page/FinancialYearClosing.tsx

import React, { useState, useEffect } from 'react';
import {
  Calendar, Building2, ShieldCheck, CalendarRange,
  Clock, ArrowDown, Lock, X, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { ConfigProvider } from 'antd';
import { apiService } from '../../../../../services/api';

interface FYState {
  startDate: string;
  endDate: string;
  yearCode: number | null;
  isAlreadyClosed: boolean;
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
  if (api?.ipcRenderer?.send) api.ipcRenderer.send('close-window');
  else window.close();
};

const fmtDate = (raw: string | null | undefined): string => {
  if (!raw) return 'Not Set';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return 'Not Set';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
};

const FinancialYearClosing: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [fy, setFy] = useState<FYState>({ startDate: '', endDate: '', yearCode: null, isAlreadyClosed: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchCurrentYear = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await apiService.getCurrentFinancialYear();
      if (response.success && response.data) {
        const data = response.data;
        setFy({
          startDate: fmtDate(data.startDate || data.start_date),
          endDate: fmtDate(data.endDate || data.end_date),
          yearCode: data.yearCode ?? data.yearcode ?? null,
          isAlreadyClosed: !!(data.closedAt || data.closed_at),
        });
      } else {
        setLoadError('No active financial year found.');
      }
    } catch {
      setLoadError('Unable to connect to server. Please retry.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCurrentYear(); }, []);

  const handleCloseYear = async () => {
    if (!fy.yearCode) {
      await showDialog('warning', 'No Year Found', 'No active financial year found to close.', '');
      return;
    }
    if (fy.isAlreadyClosed) {
      await showDialog('warning', 'Already Closed', `Financial Year ${fy.yearCode} is already closed.`, '');
      return;
    }

    // Native confirmation dialog for destructive operation
    const api = (window as any).electronAPI;
    let confirmed = false;
    if (api?.showMessageBox) {
      const res = await api.showMessageBox({
        type: 'warning',
        title: 'Close Financial Year',
        message: `Close Financial Year ${fy.yearCode}?`,
        detail: `Period: ${fy.startDate} → ${fy.endDate}\n\nThis will PERMANENTLY lock all transactions for this year.\nThis action cannot be undone.\n\nProceed only after ensuring:\n  ✓ Transfer Entries have been posted\n  ✓ All accounts are reconciled\n  ✓ Audit has been verified`,
        buttons: ['Cancel', 'Close Financial Year'],
        defaultId: 0,
        cancelId: 0,
      });
      confirmed = res.response === 1;
    } else {
      confirmed = window.confirm(`Close Financial Year ${fy.yearCode} (${fy.startDate} → ${fy.endDate})?\n\nThis is IRREVERSIBLE.`);
    }

    if (!confirmed) return;

    setIsClosing(true);
    try {
      const response = await apiService.closeFinancialYear(fy.yearCode);
      if (response.success) {
        setFy(prev => ({ ...prev, isAlreadyClosed: true }));
        await showDialog(
          'info',
          'Year Closed',
          `Financial Year ${fy.yearCode} has been formally closed.`,
          `Period: ${fy.startDate} → ${fy.endDate}\n\n✓ All transactions for this year are now locked.\n✓ Ready for next financial year operations.`
        );
      } else {
        await showDialog('error', 'Close Failed', response.error || 'Failed to close financial year.', 'Please check server logs and retry.');
      }
    } catch (err: any) {
      await showDialog('error', 'System Error', 'Unable to close financial year.', err?.message || 'Check server connection.');
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#f59e0b', borderRadius: 8 } }}>
      <style>{`
        html.dark .fyc-page { background: #0f172a !important; }
        html.dark .fyc-page .fyc-header { background: #1e293b !important; border-color: #334155 !important; }
        html.dark .fyc-page .fyc-header-icon { background: #451a03 !important; color: #fbbf24 !important; }
        html.dark .fyc-page .fyc-title { color: #f1f5f9 !important; }
        html.dark .fyc-page .fyc-sub { color: #fbbf24 !important; }
        html.dark .fyc-page .fyc-card { background: #1e293b !important; border-color: #78350f !important; }
        html.dark .fyc-page .fyc-date-row { background: #0f172a !important; border-color: #334155 !important; }
        html.dark .fyc-page .fyc-date-icon { background: #1e293b !important; }
        html.dark .fyc-page .fyc-date-label { color: #94a3b8 !important; }
        html.dark .fyc-page .fyc-date-value { background: #1e293b !important; color: #fbbf24 !important; box-shadow: inset 0 0 0 1px #334155 !important; }
        html.dark .fyc-page .fyc-card-footer { background: #0f172a !important; border-color: #334155 !important; }
        html.dark .fyc-page .fyc-status-dot { background: #fbbf24 !important; }
        html.dark .fyc-page .fyc-status-text { color: #fbbf24 !important; }
        html.dark .fyc-page .fyc-audit-text { color: #92400e !important; }
        html.dark .fyc-page .fyc-warning { background: #2d0a0a !important; border-color: #7f1d1d !important; }
        html.dark .fyc-page .fyc-warning-text { color: #fca5a5 !important; }
        html.dark .fyc-page .fyc-cancel-btn { background: #1e293b !important; border-color: #334155 !important; color: #94a3b8 !important; }
        html.dark .fyc-page .fyc-cancel-btn:hover { background: #334155 !important; color: #f1f5f9 !important; }
        html.dark .fyc-page .fyc-footer { background: #1e293b !important; border-color: #334155 !important; }
        html.dark .fyc-page .fyc-footer-text { color: #475569 !important; }
        html.dark .fyc-page .fyc-error-box { background: #2d1515 !important; border-color: #7f1d1d !important; }
        html.dark .fyc-page .fyc-error-text { color: #fca5a5 !important; }
        html.dark .fyc-page .fyc-closed-badge { background: #064e3b !important; border-color: #065f46 !important; }
        html.dark .fyc-page .fyc-closed-text { color: #6ee7b7 !important; }
      `}</style>

      <div className={`fyc-page h-screen flex flex-col bg-gradient-to-br from-amber-50 via-white to-amber-50 font-sans overflow-hidden ${className}`}>

        {/* ── Header ── */}
        <div className="fyc-header bg-white border-b-2 border-amber-100 px-3 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="fyc-header-icon bg-amber-100 p-1.5 rounded-lg">
              <CalendarRange size={13} className="text-amber-600" />
            </div>
            <div>
              <h1 className="fyc-title fz-caption font-black text-slate-800 uppercase tracking-tight leading-none">Financial Year Closing</h1>
              <p className="fyc-sub fz-caption text-amber-500 font-bold leading-none mt-0.5">Fiscal Period Finalization</p>
            </div>
          </div>
          <button onClick={closeWindow} title="Close"
            className="w-6 h-6 text-slate-400 hover:text-white hover:bg-red-500 rounded transition-all flex items-center justify-center">
            <X size={12} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 flex flex-col p-3 justify-center overflow-auto">
          <div className="max-w-md w-full mx-auto space-y-2">

            {/* Loading skeleton */}
            {isLoading && (
              <div className="fyc-card bg-white border-2 border-amber-200 rounded-xl shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-amber-400 to-amber-500 px-3 py-2">
                  <div className="h-3 w-40 bg-amber-300/50 rounded animate-pulse" />
                </div>
                <div className="p-3 space-y-2">
                  <div className="h-9 bg-amber-50 rounded-lg border-2 border-amber-100 animate-pulse" />
                  <div className="h-9 bg-amber-50 rounded-lg border-2 border-amber-100 animate-pulse" />
                </div>
              </div>
            )}

            {/* Load error */}
            {!isLoading && loadError && (
              <div className="fyc-error-box bg-red-50 border-2 border-red-100 rounded-xl p-4 flex flex-col items-center gap-2 text-center">
                <AlertTriangle size={20} className="text-red-400" />
                <p className="fyc-error-text fz-caption font-bold text-red-700">{loadError}</p>
                <button onClick={fetchCurrentYear}
                  className="mt-1 px-3 h-6 bg-red-100 hover:bg-red-200 text-red-700 rounded fz-caption font-black transition-all">
                  Retry
                </button>
              </div>
            )}

            {/* Main card */}
            {!isLoading && !loadError && (
              <>
                {/* Already closed banner */}
                {fy.isAlreadyClosed && (
                  <div className="fyc-closed-badge bg-emerald-50 border-2 border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    <p className="fyc-closed-text fz-caption font-black text-emerald-700 uppercase tracking-tight">
                      Financial Year {fy.yearCode} is already closed
                    </p>
                  </div>
                )}

                <div className="fyc-card bg-white border-2 border-amber-200 rounded-xl shadow-md overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-400 to-amber-500 px-3 py-2">
                    <h2 className="fz-caption font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                      <CalendarRange size={10} className="text-amber-100" />
                      Current Financial Year
                    </h2>
                  </div>

                  <div className="p-2 space-y-1.5">
                    {/* Start Date */}
                    <div className="fyc-date-row flex items-center justify-between p-1.5 bg-amber-50 rounded-lg border-2 border-amber-100 transition-all">
                      <div className="flex items-center gap-1.5">
                        <div className="fyc-date-icon bg-white p-1 rounded-md shadow-sm text-amber-500">
                          <Clock size={10} />
                        </div>
                        <label className="fyc-date-label fz-caption font-black text-slate-600 uppercase tracking-tight">Start Date</label>
                      </div>
                      <span className="fyc-date-value fz-caption font-black text-slate-900 font-mono tracking-tight bg-white px-1.5 py-0.5 rounded-md shadow-inner ring-1 ring-amber-200">
                        {fy.startDate || '—'}
                      </span>
                    </div>

                    <div className="flex justify-center opacity-30">
                      <ArrowDown size={10} className="text-amber-400" />
                    </div>

                    {/* End Date */}
                    <div className="fyc-date-row flex items-center justify-between p-1.5 bg-amber-50 rounded-lg border-2 border-amber-100 transition-all">
                      <div className="flex items-center gap-1.5">
                        <div className="fyc-date-icon bg-white p-1 rounded-md shadow-sm text-amber-500">
                          <Calendar size={10} />
                        </div>
                        <label className="fyc-date-label fz-caption font-black text-slate-600 uppercase tracking-tight">End Date</label>
                      </div>
                      <span className="fyc-date-value fz-caption font-black text-slate-900 font-mono tracking-tight bg-white px-1.5 py-0.5 rounded-md shadow-inner ring-1 ring-amber-200">
                        {fy.endDate || '—'}
                      </span>
                    </div>
                  </div>

                  <div className="fyc-card-footer px-2 py-1 bg-amber-50 border-t border-amber-100 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <div className={`fyc-status-dot w-1.5 h-1.5 rounded-full ${fy.isAlreadyClosed ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                      <span className="fyc-status-text fz-caption font-black text-amber-700 uppercase tracking-tight">
                        {fy.isAlreadyClosed ? 'Year Closed' : 'Active Year'}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <ShieldCheck size={9} className="text-amber-600" />
                      <span className="fyc-audit-text fz-caption font-bold text-amber-600 uppercase">Audit Verified</span>
                    </div>
                  </div>
                </div>

                {/* Irreversible warning */}
                {!fy.isAlreadyClosed && (
                  <div className="fyc-warning bg-red-50 border-2 border-red-100 rounded-lg p-2 flex items-start gap-1.5">
                    <AlertTriangle size={11} className="text-red-500 mt-0.5 shrink-0" />
                    <p className="fyc-warning-text fz-caption text-red-700 font-bold leading-tight">
                      Closing the financial year is <strong>irreversible</strong>. All transactions for this year will be permanently locked.
                    </p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button onClick={closeWindow} disabled={isClosing}
                    className="fyc-cancel-btn flex-1 h-8 bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50 font-black rounded-lg fz-caption transition-all disabled:opacity-50">
                    Cancel
                  </button>
                  <button onClick={handleCloseYear}
                    disabled={isLoading || fy.isAlreadyClosed || isClosing || !fy.yearCode}
                    className="flex-[2] h-8 bg-red-600 hover:bg-red-500 disabled:bg-slate-300 disabled:text-slate-400 text-white font-black rounded-lg fz-caption shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:cursor-not-allowed">
                    {isClosing
                      ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /><span className="uppercase tracking-wider">Closing...</span></>
                      : <><Lock size={10} /><span className="uppercase tracking-wider">{fy.isAlreadyClosed ? 'Year Already Closed' : 'Close Financial Year'}</span></>}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>

        {/* ── Footer ── */}
        <div className="fyc-footer bg-white border-t border-slate-100 px-3 py-1 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1">
            <Building2 size={9} className="text-slate-400" />
            <span className="fyc-footer-text fz-caption font-bold text-slate-400 uppercase tracking-tight" style={{ fontSize: '9px' }}>Financial Year Management</span>
          </div>
          <div className="flex items-center gap-1">
            <ShieldCheck size={9} className="text-slate-400" />
            <span className="fyc-footer-text fz-caption font-bold text-slate-400 uppercase tracking-tight" style={{ fontSize: '9px' }}>Verified Protocol</span>
          </div>
        </div>

      </div>
    </ConfigProvider>
  );
};

export default FinancialYearClosing;
