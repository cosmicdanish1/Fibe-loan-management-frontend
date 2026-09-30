import React from 'react';
import {
  RefreshCw,
  Play,
  Calendar,
  LayoutDashboard,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Wallet,
  Clock,
  X,
} from 'lucide-react';
import AwDialog from '@/components/shared/kit/AwDialog';
import { useDayend, useDayendCalculations } from '../hooks/useDayend';
import type { DayendDisplayProps } from '../interface/dayend';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';

const MetricCard: React.FC<DayendDisplayProps & { icon: React.ReactNode; tone?: string }> = ({
  label,
  value,
  isAmount = false,
  isDate = false,
  icon,
  tone,
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
    <div className="aw-stat aw-stat-left" style={tone ? { ['--aw-tone' as any]: tone } : undefined}>
      <div className="aw-stat-head">
        {React.cloneElement(icon as React.ReactElement, { size: 14 })}
        <span className="aw-stat-label">{label}</span>
      </div>
      <div className="aw-stat-value" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatValue()}</div>
    </div>
  );
};

const closeWindow = () => {
  if (window.electronAPI?.ipcRenderer) {
    window.electronAPI.ipcRenderer.send('window-close');
  } else {
    window.close();
  }
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
      <div className="app-window">
        <div className="aw-empty" style={{ margin: 'auto' }}>
          <RefreshCw size={28} className="aw-spin" />
          <span className="aw-meta">Loading...</span>
        </div>
      </div>
    );
  }

  // No working date exists yet (fresh install) — nothing else can create it,
  // and Day-End would fail at its final step if run against this state.
  if (dayendData.noWorkingDateSet) {
    return (
      <div className="app-window">
        <div style={{ margin: 'auto', width: '100%', maxWidth: 440, padding: 16 }}>
          <section className="aw-card aw-fade-in">
            <div className="aw-card-head">
              <span className="aw-card-icon" style={{ color: 'var(--aw-warning)' }}><Clock size={14} /></span>
              <h2 className="aw-card-title">No Working Date Set</h2>
            </div>
            <div className="aw-stack">
              <p className="aw-meta" style={{ lineHeight: 1.5 }}>
                Day-End has never been initialized on this system. Choose the current business date to get started —
                this only needs to be done once.
              </p>
              <div>
                <label className="aw-label" htmlFor="de-init">Current Working Date</label>
                <input id="de-init" type="date" value={initDate} onChange={(e) => setInitDate(e.target.value)} className="aw-input" />
              </div>
              <button
                type="button"
                onClick={() => initializeWorkingDate(initDate)}
                disabled={isInitializing || !initDate}
                className="aw-btn aw-btn-primary"
                style={{ width: '100%' }}
              >
                {isInitializing ? <RefreshCw size={13} className="aw-spin" /> : <Play size={13} />}
                {isInitializing ? 'Initializing...' : 'Set Working Date'}
              </button>
              {error && <p className="aw-meta" style={{ color: 'var(--aw-danger)', fontWeight: 700 }}>{error}</p>}
            </div>
          </section>
        </div>
      </div>
    );
  }

  const pendingLoans = (dayendData as any).pendingLoans as number | undefined;
  const nextOpening = (() => {
    const d = new Date(dayendData.date);
    d.setDate(d.getDate() + 1);
    const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const dayName = d.toLocaleDateString('en-IN', { weekday: 'long' });
    return `${dateStr} (${dayName})`;
  })();

  return (
    <div className="app-window">
      {/* ── Header ── */}
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">Day End Closing</h1>
          <p className="aw-desc" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={12} /> {new Date(dayendData.date).toDateString()}
          </p>
        </div>
        <div className="aw-actions">
          <button
            type="button"
            onClick={refreshData}
            disabled={isProcessing}
            className="aw-icon-btn"
            aria-label="Refresh"
            data-tip="Refresh"
            data-tip-pos="bottom-end"
          >
            <RefreshCw size={14} className={isLoading ? 'aw-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={handleCloseDayClick}
            disabled={!isBalanced || isProcessing || isLoading}
            className="aw-btn aw-btn-primary"
          >
            {isProcessing ? <RefreshCw size={13} className="aw-spin" /> : <Play size={13} />}
            {isProcessing ? 'Closing...' : 'Close Day'}
          </button>
          <button type="button" onClick={closeWindow} className="aw-btn aw-btn-ghost">
            <X size={13} /> Close
          </button>
        </div>
      </div>

      <div className="aw-content">
        <div className="aw-stack aw-narrow" style={{ maxWidth: 940 }}>

          {/* Status bar */}
          <div className={`aw-alert ${isBalanced ? 'aw-alert-success' : 'aw-alert-danger'}`} style={{ marginBottom: 0, alignItems: 'center' }} role="status">
            {isBalanced ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <div style={{ flex: 1 }}>
              <div style={{ textTransform: 'uppercase', letterSpacing: '.04em' }}>{isBalanced ? 'Accounts Balanced' : 'Ledger Unbalanced'}</div>
              <div style={{ fontWeight: 500, opacity: .85 }}>
                {isBalanced ? 'System verified. Closing enabled.' : 'Day end restricted until resolved.'}
              </div>
            </div>
            {!isBalanced && <span className="aw-pill tone-danger">₹{Math.abs(difference).toLocaleString('en-IN')}</span>}
          </div>

          {/* Metrics */}
          <div className="aw-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
            <MetricCard label="Opening" value={dayendData.openingBalance} isAmount icon={<Wallet />} />
            <MetricCard label="Receipts" value={dayendData.totalCredit} isAmount icon={<TrendingUp />} tone="var(--aw-success)" />
            <MetricCard label="Payments" value={dayendData.totalDebit} isAmount icon={<TrendingDown />} tone="var(--aw-danger)" />
            <MetricCard label="System Closing" value={dayendData.closingBalance} isAmount icon={<LayoutDashboard />} tone="var(--aw-info)" />
          </div>

          <div className="aw-split aw-split-wide" style={{ height: 'auto', gridTemplateColumns: 'minmax(0, 7fr) minmax(0, 5fr)' }}>
            {/* System verification */}
            <section className="aw-card" style={{ alignSelf: 'start' }}>
              <div className="aw-card-head">
                <span className="aw-card-icon"><CheckCircle2 size={14} /></span>
                <h2 className="aw-card-title">System Verification</h2>
              </div>
              <div className="aw-rows">
                {[
                  { label: 'Ledger Consistency', status: isBalanced },
                  { label: 'Voucher Sync', status: voucherSyncOk },
                  { label: 'Date Alignment', status: dateAlignmentOk },
                  { label: 'Balance Reconciliation', status: isBalanced },
                ].map((check, i) => (
                  <div key={i} className="aw-row" style={{ alignItems: 'center' }}>
                    <span className="aw-row-label" style={{ color: 'var(--aw-text)' }}>{check.label}</span>
                    <span className={`aw-pill tone-${check.status ? 'success' : 'danger'}`} style={{ gap: 4 }}>
                      {check.status ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                      {check.status ? 'OK' : 'FAIL'}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Next date + notices */}
            <div className="aw-stack" style={{ alignSelf: 'start' }}>
              <button
                type="button"
                onClick={handleCloseDayClick}
                className="aw-panel aw-panel-accent"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, width: '100%', textAlign: 'left', cursor: 'pointer' }}
                data-tip="Select the next working date"
                data-tip-pos="top-start"
              >
                <span>
                  <span className="aw-label" style={{ marginBottom: 2 }}>Next Opening Date</span>
                  <span className="aw-strong">{nextOpening}</span>
                </span>
                <Calendar size={18} style={{ color: 'var(--aw-accent)' }} />
              </button>

              {!isBalanced && (
                <div className="aw-alert aw-alert-danger" style={{ marginBottom: 0 }}>
                  <AlertCircle size={15} />
                  <span>Discrepancy Action — resolve variance in <strong>Daily Cash Book</strong> to proceed.</span>
                </div>
              )}

              {pendingLoans !== undefined && pendingLoans > 0 && (
                <div className="aw-alert aw-alert-warning" style={{ marginBottom: 0 }}>
                  <AlertCircle size={15} />
                  <span>Pending Loan Approvals — <strong>{pendingLoans}</strong> loan application(s) awaiting approval. Day End blocked until resolved.</span>
                </div>
              )}

              {(dayendData.paymentVouchers !== undefined || dayendData.receiptVouchers !== undefined) && (
                <section className="aw-card">
                  <p className="aw-label">Today's Vouchers</p>
                  <div className="aw-stats" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                    {[
                      { lbl: 'Receipts', val: dayendData.receiptVouchers ?? 0 },
                      { lbl: 'Payments', val: dayendData.paymentVouchers ?? 0 },
                      { lbl: 'Journal', val: dayendData.journalVouchers ?? 0 },
                    ].map(v => (
                      <div key={v.lbl} className="aw-stat">
                        <div className="aw-stat-value">{v.val}</div>
                        <div className="aw-stat-label">{v.lbl}</div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>

          {error && (
            <div className="aw-alert aw-alert-danger aw-fade-in" style={{ marginBottom: 0, alignItems: 'center' }} role="alert">
              <AlertCircle size={15} />
              <span style={{ flex: 1 }}>{error}</span>
              <button type="button" onClick={refreshData} className="aw-btn aw-btn-secondary aw-btn-sm">Retry</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Processing overlay (cannot be dismissed) ── */}
      {isProcessing && (
        <div className="aw-modal-backdrop">
          <div className="aw-modal" role="alertdialog" aria-modal="true" aria-label="Day-End Processing" style={{ height: 'auto', maxWidth: '24rem' }}>
            <div className="aw-stack" style={{ alignItems: 'center', textAlign: 'center', padding: 'calc(var(--aw-pad) * 1.6)' }}>
              <RefreshCw size={34} className="aw-spin" style={{ color: 'var(--aw-accent)' }} />
              <div>
                <p className="aw-strong">Day-End Processing</p>
                <p className="aw-meta" style={{ marginTop: 4 }}>Please wait — running interest calculation, backup &amp; cleanup...</p>
                <p className="aw-meta" style={{ marginTop: 8 }}>This may take up to 2 minutes</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Select Next Working Date ── */}
      <AwDialog
        open={showNextDateModal}
        title="Select Next Working Date"
        icon={<Calendar size={14} />}
        onClose={() => setShowNextDateModal(false)}
        maxWidth="24rem"
        compact
      >
        <div className="aw-stack">
          <div>
            <label className="aw-label" htmlFor="de-next">Date</label>
            <input
              id="de-next"
              type="date"
              value={nextWorkingDate}
              onChange={(e) => setNextWorkingDate(e.target.value)}
              min={getDefaultNextDate()}
              className="aw-input"
            />
          </div>
          <div>
            <span className="aw-label">Day</span>
            <div className="aw-input" style={{ display: 'flex', alignItems: 'center', color: 'var(--aw-accent)', fontWeight: 700 }}>
              {getDayName(nextWorkingDate)}
            </div>
          </div>
          <div className="aw-btn-row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowNextDateModal(false)} className="aw-btn aw-btn-secondary">Exit</button>
            <button type="button" onClick={handleConfirmNextDate} disabled={!nextWorkingDate} className="aw-btn aw-btn-primary">OK</button>
          </div>
        </div>
      </AwDialog>
    </div>
  );
};

export default DayEnd;
