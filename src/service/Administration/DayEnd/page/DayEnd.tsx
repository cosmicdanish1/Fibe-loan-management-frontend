import React from 'react';
import {
  RefreshCw,
  Play,
  Calendar,
  LayoutDashboard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  TrendingDown,
  TrendingUp,
  Wallet,
  Clock,
  X,
} from 'lucide-react';
import { useDayend, useDayendCalculations } from '../hooks/useDayend';
import type { DayendDisplayProps } from '../interface/dayend';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';

const MetricCard: React.FC<DayendDisplayProps & { icon: React.ReactNode }> = ({
  label,
  value,
  isAmount = false,
  isDate = false,
  icon,
  className = "",
}) => {
  const formatValue = () => {
    if (isDate && typeof value === 'string') {
      return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    }
    if (isAmount && typeof value === 'number') {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(value);
    }
    return value.toString();
  };

  return (
    <div className={`day-metric-card bg-white border-2 border-slate-200 rounded p-1 shadow-sm flex items-center justify-between gap-1.5 ${className}`}>
      <div className="min-w-0">
        <p className="day-metric-label fz-caption font-black text-slate-600 uppercase leading-none mb-0.5">{label}</p>
        <p className="day-metric-value fz-caption font-black truncate text-slate-900">
          {formatValue()}
        </p>
      </div>
      <div className="day-metric-icon bg-slate-50 p-1 rounded text-slate-600">
        {React.cloneElement(icon as React.ReactElement, { size: 11 })}
      </div>
    </div>
  );
};

const DayEnd: React.FC = () => {
  const { dayendData, isProcessing, isLoading, error, processDayend, refreshData, initializeWorkingDate, isInitializing } = useDayend();
  const { isBalanced, difference } = useDayendCalculations(dayendData);

  // "Select Next Working Date" modal state
  const [showNextDateModal, setShowNextDateModal] = React.useState(false);
  const [nextWorkingDate, setNextWorkingDate] = React.useState('');

  // Genesis "set initial working date" state — shown when getworkingdate has no rows yet
  const [initDate, setInitDate] = React.useState(() => new Date().toISOString().split('T')[0] || '');

  const getDefaultNextDate = () => {
    const d = new Date(dayendData.date);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const getDayName = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'long' });
  };

  const handleCloseDayClick = () => {
    setNextWorkingDate(getDefaultNextDate());
    setShowNextDateModal(true);
  };

  const handleConfirmNextDate = async () => {
    setShowNextDateModal(false);
    await processDayend(nextWorkingDate);
  };

  // Real check derivations from backend data
  const voucherSyncOk = !error && (dayendData.paymentVouchers ?? 0) >= 0 && (dayendData.receiptVouchers ?? 0) >= 0;
  const dateAlignmentOk = dayendData.dayendFlag === 'N';

  usePageToolbarActions({
    onSave: handleCloseDayClick,
    saveLabel: isProcessing ? 'Closing...' : 'Close Day',
    saveEnabled: !(!isBalanced || isProcessing || isLoading || dayendData.noWorkingDateSet),
  });

  if (isLoading && !isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  // No working date exists yet (fresh install) — nothing else can create it,
  // and Day-End would fail at its final step if run against this state.
  if (dayendData.noWorkingDateSet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full space-y-4 border-2 border-amber-200">
          <div className="flex items-center gap-2 text-amber-600">
            <Clock size={20} />
            <h2 className="fz-body font-black uppercase tracking-tight">No Working Date Set</h2>
          </div>
          <p className="fz-small text-slate-600 leading-relaxed">
            Day-End has never been initialized on this system. Choose the current business date to get started —
            this only needs to be done once.
          </p>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Current Working Date</label>
            <input
              type="date"
              value={initDate}
              onChange={(e) => setInitDate(e.target.value)}
              className="w-full h-9 px-3 border-2 border-slate-200 rounded-lg text-sm font-semibold text-slate-800 outline-none focus:border-amber-500 transition-colors"
            />
          </div>
          <button
            onClick={() => initializeWorkingDate(initDate)}
            disabled={isInitializing || !initDate}
            className="w-full h-9 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg font-black text-sm uppercase tracking-wide transition-all flex items-center justify-center gap-1.5"
          >
            {isInitializing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {isInitializing ? 'Initializing...' : 'Set Working Date'}
          </button>
          {error && <p className="text-xs text-rose-600 font-bold">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="day-end-page h-screen flex flex-col bg-slate-50 font-sans relative">
      <style>{`
        html.dark .day-end-page { background: #0f0f0f; }

        /* Processing overlay modal */
        html.dark .day-end-page .day-overlay-modal { background: #1f1f1f !important; }
        html.dark .day-end-page .day-overlay-modal p { color: #cbd5e1 !important; }
        html.dark .day-end-page .day-overlay-modal .day-progress-track { background: #2a2a2a !important; }

        /* MetricCard */
        html.dark .day-end-page .day-metric-card { background: #1a1a1a !important; border-color: #2a2a2a !important; }
        html.dark .day-end-page .day-metric-label { color: #94a3b8 !important; }
        html.dark .day-end-page .day-metric-value { color: #e2e8f0 !important; }
        html.dark .day-end-page .day-metric-icon { background: #252525 !important; color: #94a3b8 !important; }

        /* Status bar */
        html.dark .day-end-page .day-status-balanced { background: #0a1a0f !important; border-color: #166534 !important; }
        html.dark .day-end-page .day-status-balanced h2 { color: #bbf7d0 !important; }
        html.dark .day-end-page .day-status-balanced p { color: #86efac !important; }
        html.dark .day-end-page .day-status-unbalanced { background: #1a0a0a !important; border-color: #991b1b !important; }
        html.dark .day-end-page .day-status-unbalanced h2 { color: #fecaca !important; }
        html.dark .day-end-page .day-status-unbalanced p { color: #fca5a5 !important; }
        html.dark .day-end-page .day-diff-badge { background: #7f1d1d !important; }

        /* Checks table */
        html.dark .day-end-page .day-checks-card { background: #1a1a1a !important; border-color: #2a2a2a !important; }
        html.dark .day-end-page .day-checks-hdr { background: linear-gradient(to right,#1f1f1f,#252525) !important; border-color: #2a2a2a !important; }
        html.dark .day-end-page .day-checks-hdr span { color: #94a3b8 !important; }
        html.dark .day-end-page .day-check-row { border-color: #222 !important; }
        html.dark .day-end-page .day-check-row:hover { background: #222 !important; }
        html.dark .day-end-page .day-check-label { color: #cbd5e1 !important; }
        html.dark .day-end-page .day-check-ok { background: #052e16 !important; color: #86efac !important; }
        html.dark .day-end-page .day-check-fail { background: #450a0a !important; color: #fca5a5 !important; }

        /* Discrepancy card */
        html.dark .day-end-page .day-disc-card { background: #1a1a1a !important; border-color: #2a2a2a !important; }
        html.dark .day-end-page .day-disc-title { color: #fca5a5 !important; }
        html.dark .day-end-page .day-disc-body { color: #94a3b8 !important; }
        html.dark .day-end-page .day-disc-body span { color: #e2e8f0 !important; }

        /* Header reset/close btns (header gradient is already dark) */
        html.dark .day-end-page .day-hdr-btn { color: #fff !important; }
        html.dark .day-end-page .day-hdr-btn:hover { background: rgba(255,255,255,0.15) !important; }

        /* Next date modal */
        html.dark .day-end-page .day-next-date-modal { background: #1a1a1a !important; }
        html.dark .day-end-page .day-next-date-modal input { background: #252525 !important; color: #e2e8f0 !important; border-color: #333 !important; }
        html.dark .day-end-page .day-next-date-modal .bg-slate-100 { background: #252525 !important; border-color: #333 !important; }
        html.dark .day-end-page .day-next-date-modal label { color: #64748b !important; }
        html.dark .day-end-page .day-next-date-modal button.bg-white { background: #252525 !important; border-color: #333 !important; color: #94a3b8 !important; }
      `}</style>

      {/* Processing overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-slate-900/60 z-50 flex flex-col items-center justify-center gap-4">
          <div className="day-overlay-modal bg-white rounded-xl shadow-2xl p-8 flex flex-col items-center gap-4 max-w-sm w-full mx-4">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            <div className="text-center">
              <p className="fz-body font-bold text-slate-800">Day-End Processing</p>
              <p className="fz-body text-slate-500 mt-1">Please wait — running interest calculation, backup & cleanup...</p>
              <p className="fz-label text-slate-400 mt-2">This may take up to 2 minutes</p>
            </div>
            <div className="day-progress-track w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div className="bg-indigo-600 h-1.5 rounded-full animate-pulse w-3/4" />
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-900 to-slate-900 px-2 py-1 flex items-center justify-between sticky top-0 z-10 shadow-lg">
        <div className="flex items-center gap-1.5">
          <div className="bg-amber-500 p-1 rounded text-white shadow-sm">
            <Clock size={12} />
          </div>
          <div>
            <h1 className="fz-caption font-black text-white leading-none uppercase tracking-tight">Day End Closing</h1>
            <p className="fz-caption text-slate-400 flex items-center gap-0.5 font-black uppercase tracking-wider mt-0.5">
              <Calendar size={6} /> {new Date(dayendData.date).toDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={refreshData}
            disabled={isProcessing}
            className="day-hdr-btn p-1 text-white hover:bg-white/10 rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleCloseDayClick}
            disabled={!isBalanced || isProcessing || isLoading}
            className={`flex items-center gap-1 px-2.5 py-1 rounded fz-caption font-black shadow-sm transition-all active:scale-95 uppercase tracking-wider ${
              isBalanced ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-slate-700 text-slate-500'
            }`}
          >
            {isProcessing ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
            {isProcessing ? 'Closing...' : 'Close Day'}
          </button>
          <button
            onClick={() => {
              if (window.electronAPI?.ipcRenderer) {
                window.electronAPI.ipcRenderer.send('window-close');
              } else {
                window.close();
              }
            }}
            className="day-hdr-btn p-1 text-white hover:bg-white/10 rounded transition-colors"
            title="Close"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-1.5">
        <div className="max-w-4xl mx-auto space-y-1.5">

          {/* Status Bar */}
          <div className={`border-2 rounded p-1.5 flex items-center justify-between gap-2 ${
            isBalanced
              ? 'day-status-balanced bg-green-50 border-green-300 text-green-900'
              : 'day-status-unbalanced bg-red-50 border-red-300 text-red-900'
          }`}>
            <div className="flex items-center gap-2">
              <div className={`p-1 rounded ${isBalanced ? 'bg-green-100' : 'bg-red-100'}`}>
                {isBalanced
                  ? <CheckCircle2 size={14} className="text-green-700" />
                  : <AlertCircle size={14} className="text-red-700" />
                }
              </div>
              <div>
                <h2 className="fz-caption font-black uppercase tracking-tight leading-none">
                  {isBalanced ? 'Accounts Balanced' : 'Ledger Unbalanced'}
                </h2>
                <p className="fz-caption font-black mt-0.5 opacity-80">
                  {isBalanced ? 'System verified. Closing enabled.' : 'Day end restricted until resolved.'}
                </p>
              </div>
            </div>
            {!isBalanced && (
              <div className="day-diff-badge bg-red-900 px-2 py-0.5 rounded text-white shadow-sm font-black fz-caption">
                ₹{Math.abs(difference).toLocaleString('en-IN')}
              </div>
            )}
          </div>

          {/* Metric Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5">
            <MetricCard label="Opening" value={dayendData.openingBalance} isAmount icon={<Wallet />} />
            <MetricCard label="Receipts" value={dayendData.totalCredit} isAmount icon={<TrendingUp />} />
            <MetricCard label="Payments" value={dayendData.totalDebit} isAmount icon={<TrendingDown />} />
            <MetricCard label="System Closing" value={dayendData.closingBalance} isAmount icon={<LayoutDashboard />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-1.5">
            {/* System Verification Checks */}
            <div className="day-checks-card lg:col-span-7 bg-white border-2 border-slate-200 rounded overflow-hidden">
              <div className="day-checks-hdr bg-gradient-to-r from-slate-50 to-slate-100 px-2 py-0.5 border-b-2 border-slate-200 flex items-center gap-1.5">
                <div className="w-0.5 h-2.5 bg-slate-600 rounded-full"></div>
                <span className="fz-caption font-black uppercase text-slate-700 tracking-wider">System Verification</span>
              </div>
              <div className="p-0.5 divide-y divide-slate-100">
                {[
                  { label: "Ledger Consistency",    status: isBalanced },
                  { label: "Voucher Sync",          status: voucherSyncOk },
                  { label: "Date Alignment",        status: dateAlignmentOk },
                  { label: "Balance Reconciliation", status: isBalanced },
                ].map((check, i) => (
                  <div key={i} className="day-check-row flex items-center justify-between px-1.5 py-1 hover:bg-slate-50 rounded transition-colors">
                    <span className="day-check-label fz-caption font-black text-slate-700">{check.label}</span>
                    <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full fz-caption font-black uppercase ${
                      check.status
                        ? 'day-check-ok bg-green-100 text-green-800'
                        : 'day-check-fail bg-red-100 text-red-700'
                    }`}>
                      {check.status
                        ? <CheckCircle2 size={7} />
                        : <AlertCircle size={7} />
                      }
                      {check.status ? 'OK' : 'FAIL'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Next Date + Discrepancy */}
            <div className="lg:col-span-5 flex flex-col gap-1.5">
              <div
                className="bg-gradient-to-r from-slate-900 via-amber-900 to-slate-900 rounded p-2 text-white flex items-center justify-between shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                onClick={handleCloseDayClick}
                title="Click to select next working date"
              >
                <div>
                  <p className="fz-caption font-black uppercase opacity-80 tracking-wider leading-none mb-0.5">Next Opening Date</p>
                  <p className="fz-label font-black leading-none">
                    {(() => {
                      const d = new Date(dayendData.date);
                      d.setDate(d.getDate() + 1);
                      const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                      const dayName = d.toLocaleDateString('en-IN', { weekday: 'long' });
                      return `${dateStr} (${dayName})`;
                    })()}
                  </p>
                </div>
                <div className="bg-amber-600 p-1 rounded shadow-inner">
                  <Calendar size={14} />
                </div>
              </div>

              {!isBalanced && (
                <div className="day-disc-card bg-white border-2 border-red-200 rounded p-1.5">
                  <p className="day-disc-title fz-caption font-black text-red-700 uppercase mb-0.5 flex items-center gap-0.5">
                    <AlertCircle size={8} /> Discrepancy Action
                  </p>
                  <p className="day-disc-body fz-caption text-slate-600 leading-tight font-black">
                    Resolve variance in <span className="font-black text-slate-900">Daily Cash Book</span> to proceed.
                  </p>
                </div>
              )}

              {/* Pending Loans Warning */}
              {(dayendData as any).pendingLoans > 0 && (
                <div className="day-disc-card bg-white border-2 border-amber-200 rounded p-1.5">
                  <p className="day-disc-title fz-caption font-black text-amber-700 uppercase mb-0.5 flex items-center gap-0.5">
                    <AlertCircle size={8} /> Pending Loan Approvals
                  </p>
                  <p className="day-disc-body fz-caption text-slate-600 leading-tight font-black">
                    <span className="font-black text-amber-800">{(dayendData as any).pendingLoans}</span> loan application(s) awaiting approval. Day End blocked until resolved.
                  </p>
                </div>
              )}

              {/* Voucher counts summary */}
              {(dayendData.paymentVouchers !== undefined || dayendData.receiptVouchers !== undefined) && (
                <div className="day-disc-card bg-white border-2 border-slate-200 rounded p-1.5">
                  <p className="day-check-label fz-caption font-black text-slate-600 uppercase mb-0.5 tracking-wider">Today's Vouchers</p>
                  <div className="grid grid-cols-3 gap-1 mt-0.5">
                    {[
                      { lbl: 'Receipts', val: dayendData.receiptVouchers ?? 0 },
                      { lbl: 'Payments', val: dayendData.paymentVouchers ?? 0 },
                      { lbl: 'Journal',  val: dayendData.journalVouchers ?? 0 },
                    ].map(v => (
                      <div key={v.lbl} className="text-center">
                        <p className="day-metric-value fz-caption font-black text-slate-900">{v.val}</p>
                        <p className="day-metric-label fz-caption text-slate-500 uppercase">{v.lbl}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-slate-900 text-white rounded p-1.5 flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <AlertCircle size={11} className="flex-shrink-0" />
                <p className="fz-caption font-black truncate">{error}</p>
              </div>
              <button onClick={refreshData} className="px-1.5 py-0.5 bg-white/20 hover:bg-white/30 rounded fz-caption font-black uppercase ml-1.5">Retry</button>
            </div>
          )}
        </div>
      </div>
      {/* Select Next Working Date Modal */}
      {showNextDateModal && (
        <div className="absolute inset-0 bg-slate-900/60 z-50 flex items-center justify-center">
          <div className="day-next-date-modal bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-3">
              <h3 className="text-white font-bold text-sm">Select Next Working Date</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Date</label>
                <input
                  type="date"
                  value={nextWorkingDate}
                  onChange={(e) => setNextWorkingDate(e.target.value)}
                  min={getDefaultNextDate()}
                  className="w-full h-9 px-3 border-2 border-slate-200 rounded-lg text-sm font-semibold text-slate-800 outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Day</label>
                <div className="h-9 px-3 bg-slate-100 border-2 border-slate-200 rounded-lg flex items-center">
                  <span className="text-sm font-bold text-indigo-600">{getDayName(nextWorkingDate)}</span>
                </div>
              </div>
            </div>
            <div className="px-5 pb-4 flex justify-end gap-2">
              <button
                onClick={handleConfirmNextDate}
                disabled={!nextWorkingDate}
                className="px-5 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                OK
              </button>
              <button
                onClick={() => setShowNextDateModal(false)}
                className="px-5 py-2 bg-white border-2 border-slate-200 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-50 transition-colors"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DayEnd;
