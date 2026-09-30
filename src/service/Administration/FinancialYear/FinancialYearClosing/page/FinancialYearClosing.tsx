// page/FinancialYearClosing.tsx

import React, { useState, useEffect } from 'react';
import {
  Calendar, Building2, ShieldCheck, CalendarRange,
  Clock, Lock, X, AlertTriangle, CheckCircle2, Plus, RefreshCw,
} from 'lucide-react';
import { apiService } from '../../../../../services/api';
import { usePageToolbarActions } from '../../../../../utils/pageToolbarActions';

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
  if (api?.ipcRenderer?.send) api.ipcRenderer.send('window-close');
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
  const [noYearFound, setNoYearFound] = useState(false);

  // Genesis create-year form — shown when yearend has no rows at all
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fetchCurrentYear = async () => {
    setIsLoading(true);
    setLoadError(null);
    setNoYearFound(false);
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
        setNoYearFound(true);
      }
    } catch {
      setLoadError('Unable to connect to server. Please retry.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCurrentYear(); }, []);

  const handleCreateYear = async () => {
    if (!newStart || !newEnd) {
      await showDialog('warning', 'Required', 'Please enter both a start date and an end date.', '');
      return;
    }
    if (newStart >= newEnd) {
      await showDialog('warning', 'Invalid Range', 'Start date must be before end date.', '');
      return;
    }
    setIsCreating(true);
    try {
      const response = await apiService.createFinancialYear(newStart, newEnd);
      if (response.success) {
        await showDialog('info', 'Financial Year Created', 'The financial year has been created.', `Period: ${newStart} → ${newEnd}`);
        setNewStart('');
        setNewEnd('');
        await fetchCurrentYear();
      } else {
        await showDialog('error', 'Create Failed', response.error || 'Failed to create financial year.', '');
      }
    } catch (err: any) {
      await showDialog('error', 'System Error', 'Unable to create financial year.', err?.message || 'Check server connection.');
    } finally {
      setIsCreating(false);
    }
  };

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

  usePageToolbarActions({
    onSave: handleCloseYear,
    saveLabel: isClosing ? 'Closing...' : fy.isAlreadyClosed ? 'Year Already Closed' : 'Close Financial Year',
    saveEnabled: !(isLoading || fy.isAlreadyClosed || isClosing || !fy.yearCode),
  });

  return (
    <div className={`app-window ${className}`}>
      {/* ── Header ── */}
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">Financial Year Closing</h1>
          <p className="aw-desc" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CalendarRange size={12} /> Fiscal Period Finalization
          </p>
        </div>
        <div className="aw-actions">
          <button
            type="button"
            onClick={handleCloseYear}
            disabled={isLoading || fy.isAlreadyClosed || isClosing || !fy.yearCode}
            className="aw-btn aw-btn-danger"
          >
            {isClosing ? <RefreshCw size={13} className="aw-spin" /> : <Lock size={13} />}
            {isClosing ? 'Closing...' : fy.isAlreadyClosed ? 'Year Already Closed' : 'Close Financial Year'}
          </button>
          <button type="button" onClick={closeWindow} disabled={isClosing} className="aw-btn aw-btn-ghost">
            <X size={13} /> Close
          </button>
        </div>
      </div>

      <div className="aw-content">
        <div className="aw-stack aw-narrow" style={{ maxWidth: 520 }}>

          {/* Loading skeleton */}
          {isLoading && (
            <section className="aw-card">
              <span className="aw-skeleton" style={{ display: 'block', height: 16, width: 160 }} />
              <span className="aw-skeleton" style={{ display: 'block', height: 40 }} />
              <span className="aw-skeleton" style={{ display: 'block', height: 40 }} />
            </section>
          )}

          {/* Load error */}
          {!isLoading && loadError && !noYearFound && (
            <div className="aw-alert aw-alert-danger aw-fade-in" style={{ marginBottom: 0, alignItems: 'center' }} role="alert">
              <AlertTriangle size={16} />
              <span style={{ flex: 1 }}>{loadError}</span>
              <button type="button" onClick={fetchCurrentYear} className="aw-btn aw-btn-secondary aw-btn-sm">Retry</button>
            </div>
          )}

          {/* No financial year exists yet — genesis create form */}
          {!isLoading && noYearFound && (
            <section className="aw-card aw-fade-in">
              <div className="aw-card-head">
                <span className="aw-card-icon"><Plus size={14} /></span>
                <h2 className="aw-card-title">No Financial Year Set Up Yet</h2>
              </div>
              <div className="aw-stack">
                <p className="aw-meta" style={{ lineHeight: 1.5 }}>
                  No financial year exists yet. Create the first one to begin using Transfer Entries and Financial Year Closing.
                </p>
                <div className="aw-two">
                  <div>
                    <label className="aw-label" htmlFor="fyc-start">Start Date</label>
                    <input id="fyc-start" type="date" value={newStart} onChange={e => setNewStart(e.target.value)} disabled={isCreating} className="aw-input" />
                  </div>
                  <div>
                    <label className="aw-label" htmlFor="fyc-end">End Date</label>
                    <input id="fyc-end" type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)} disabled={isCreating} className="aw-input" />
                  </div>
                </div>
                <button type="button" onClick={handleCreateYear} disabled={isCreating || !newStart || !newEnd} className="aw-btn aw-btn-primary" style={{ width: '100%' }}>
                  {isCreating ? <RefreshCw size={13} className="aw-spin" /> : <Plus size={13} />}
                  {isCreating ? 'Creating...' : 'Create Financial Year'}
                </button>
              </div>
            </section>
          )}

          {/* Main card */}
          {!isLoading && !loadError && (
            <>
              {fy.isAlreadyClosed && (
                <div className="aw-alert aw-alert-success aw-fade-in" style={{ marginBottom: 0 }} role="status">
                  <CheckCircle2 size={16} />
                  <span>Financial Year {fy.yearCode} is already closed</span>
                </div>
              )}

              <section className="aw-card aw-fade-in">
                <div className="aw-card-head">
                  <span className="aw-card-icon"><CalendarRange size={14} /></span>
                  <h2 className="aw-card-title">Current Financial Year</h2>
                  <span className={`aw-pill tone-${fy.isAlreadyClosed ? 'success' : 'warning'}`} style={{ marginLeft: 'auto' }}>
                    <i className="aw-status-dot" style={{ marginRight: 5, background: fy.isAlreadyClosed ? 'var(--aw-success)' : 'var(--aw-warning)' }} />
                    {fy.isAlreadyClosed ? 'Year Closed' : 'Active Year'}
                  </span>
                </div>

                <dl className="aw-facts">
                  <div>
                    <dt style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={11} /> Start Date</dt>
                    <dd>{fy.startDate || '—'}</dd>
                  </div>
                  <div>
                    <dt style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Calendar size={11} /> End Date</dt>
                    <dd>{fy.endDate || '—'}</dd>
                  </div>
                </dl>

                <p className="aw-meta" style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--aw-border)' }}>
                  <ShieldCheck size={12} /> Audit Verified
                </p>
              </section>

              {!fy.isAlreadyClosed && (
                <div className="aw-alert aw-alert-danger aw-fade-in" style={{ marginBottom: 0 }}>
                  <AlertTriangle size={15} />
                  <span>Closing the financial year is <strong>irreversible</strong>. All transactions for this year will be permanently locked.</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="aw-footer">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Building2 size={12} /> Financial Year Management</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ShieldCheck size={12} /> Verified Protocol</span>
      </div>
    </div>
  );
};

export default FinancialYearClosing;
