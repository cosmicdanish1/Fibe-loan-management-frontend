// page/TransferEntriesForClosing.tsx

import React, { useState, useEffect } from 'react';
import {
  Lock, ChevronRight, Database, Building2,
  Calendar, X, CheckCircle2, AlertCircle, RefreshCw, Plus,
} from 'lucide-react';
import { Select } from 'antd';
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
    <div className={`app-window ${className}`}>
      {/* ── Header ── */}
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">Transfer Entries For Closing</h1>
          <p className="aw-desc" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Database size={12} /> Financial Year · Ledger Transit
          </p>
        </div>
        <div className="aw-actions">
          <button type="button" onClick={handleSubmit} disabled={!selectedCode || isLoading || isLoadingYears} className="aw-btn aw-btn-primary">
            {isLoading ? <RefreshCw size={13} className="aw-spin" /> : <ChevronRight size={13} />}
            {isLoading ? 'Processing...' : 'Initiate Transfer'}
          </button>
          <button type="button" onClick={closeWindow} disabled={isLoading} className="aw-btn aw-btn-ghost">
            <X size={13} /> Close
          </button>
        </div>
      </div>

      <div className="aw-content">
        <div className="aw-stack aw-narrow" style={{ maxWidth: 520 }}>

          {/* ── Select financial year ── */}
          <section className="aw-card">
            <div className="aw-card-head">
              <span className="aw-card-icon"><Lock size={14} /></span>
              <h2 className="aw-card-title">Select Financial Year</h2>
              <button
                type="button"
                onClick={loadYears}
                disabled={isLoadingYears}
                className="aw-icon-btn is-sm"
                aria-label="Refresh years"
                data-tip="Refresh"
                data-tip-pos="bottom-end"
                style={{ marginLeft: 'auto' }}
              >
                <RefreshCw size={13} className={isLoadingYears ? 'aw-spin' : ''} />
              </button>
            </div>

            <div className="aw-stack">
              <div>
                <label className="aw-label" htmlFor="tefc-year">Financial Year</label>
                <Select
                  id="tefc-year"
                  className="aw-select"
                  popupClassName="aw-select-popup"
                  value={selectedCode || undefined}
                  onChange={(v) => setSelectedCode(v ?? '')}
                  disabled={isLoading || isLoadingYears}
                  placeholder="— Select Financial Year —"
                  suffixIcon={<Calendar size={14} />}
                  options={years.map(fy => ({
                    value: String(fy.yearCode),
                    label: `${yearLabel(fy)} (Code: ${fy.yearCode})${fy.closedAt ? ' ✓ Closed' : ''}`,
                  }))}
                />
              </div>

              {selectedYear && (
                <dl className="aw-facts aw-fade-in" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                  <div><dt>From</dt><dd>{fmtDate(selectedYear.startDate)}</dd></div>
                  <div><dt>To</dt><dd>{fmtDate(selectedYear.endDate)}</dd></div>
                  <div>
                    <dt>Status</dt>
                    <dd><span className={`aw-pill tone-${selectedYear.closedAt ? 'success' : 'warning'}`}>{selectedYear.closedAt ? 'Closed' : 'Open'}</span></dd>
                  </div>
                </dl>
              )}

              {statusMsg ? (
                <div className={`aw-alert aw-fade-in ${statusMsg.type === 'success' ? 'aw-alert-success' : 'aw-alert-danger'}`} style={{ marginBottom: 0 }} role="status">
                  {statusMsg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                  <span>{statusMsg.text}</span>
                </div>
              ) : (
                <p className="aw-meta" style={{ display: 'flex', alignItems: 'center' }}><i className="aw-status-dot" />System ready</p>
              )}
            </div>
          </section>

          {/* ── No financial year exists yet — genesis create form ── */}
          {!isLoadingYears && years.length === 0 && (
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
                    <label className="aw-label" htmlFor="tefc-start">Start Date</label>
                    <input id="tefc-start" type="date" value={newStart} onChange={e => setNewStart(e.target.value)} disabled={isCreatingYear} className="aw-input" />
                  </div>
                  <div>
                    <label className="aw-label" htmlFor="tefc-end">End Date</label>
                    <input id="tefc-end" type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)} disabled={isCreatingYear} className="aw-input" />
                  </div>
                </div>
                <button type="button" onClick={handleCreateYear} disabled={isCreatingYear || !newStart || !newEnd} className="aw-btn aw-btn-primary" style={{ width: '100%' }}>
                  {isCreatingYear ? <RefreshCw size={13} className="aw-spin" /> : <Plus size={13} />}
                  {isCreatingYear ? 'Creating...' : 'Create Financial Year'}
                </button>
              </div>
            </section>
          )}
        </div>
      </div>

      <div className="aw-footer">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Building2 size={12} /> Financial Year Management</span>
        <span>Ledger Transit System</span>
      </div>
    </div>
  );
};

export default TransferEntriesForClosing;
