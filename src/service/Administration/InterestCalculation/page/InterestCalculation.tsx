import React, { useState } from 'react';
import {
  Calculator,
  RotateCcw,
  Send,
  FileText,
  TrendingUp,
  IndianRupee,
  Percent,
  Wallet,
  CheckCircle2,
  RefreshCw,
  List,
  Users,
  ArrowUpRight,
  X,
} from 'lucide-react';
import { DatePicker, Select } from 'antd';
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

  const ACCOUNT_OPTIONS = ['RECURRING DEPOSIT', 'SAVINGS ACCOUNT', 'CURRENT ACCOUNT', 'FIXED DEPOSIT', 'NRI ACCOUNT']
    .map(v => ({ value: v, label: v }));
  const inr = (n: any) => `₹${Number(n).toLocaleString('en-IN')}`;

  return (
    <div className="app-window">
      {/* ── Header ── */}
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">Interest Calculator</h1>
          <p className="aw-desc">Investment &amp; Dividend Management</p>
        </div>
        <div className="aw-actions">
          <button type="button" onClick={handleReset} disabled={disabled} className="aw-btn aw-btn-secondary">
            <RotateCcw size={13} /> Reset
          </button>
          <button type="button" onClick={handleCalculate} disabled={disabled || isCalculating} className="aw-btn aw-btn-primary">
            {isCalculating ? <RefreshCw size={13} className="aw-spin" /> : <Calculator size={13} />}
            {isCalculating ? 'Calculating...' : 'Run Analysis'}
          </button>
          <button type="button" onClick={handleClose} className="aw-btn aw-btn-ghost">
            <X size={13} /> Close
          </button>
        </div>
      </div>

      <div className="aw-content">
        <div className="aw-stack">

          <div className="aw-split aw-split-wide" style={{ height: 'auto', gridTemplateColumns: 'minmax(0, 2fr) minmax(260px, 1fr)' }}>
            {/* ── Interest scope ── */}
            <section className="aw-card">
              <div className="aw-card-head">
                <span className="aw-card-icon"><Wallet size={14} /></span>
                <h2 className="aw-card-title">Interest Scope</h2>
              </div>
              <div className="aw-two">
                <div className="aw-stack">
                  <div>
                    <label className="aw-label" htmlFor="ic-account">Select Account Type</label>
                    <Select
                      id="ic-account"
                      className="aw-select"
                      popupClassName="aw-select-popup"
                      value={formData.selectedAccount}
                      onChange={(v) => updateField('selectedAccount', v)}
                      disabled={disabled}
                      options={ACCOUNT_OPTIONS}
                    />
                  </div>
                  <div className="aw-two">
                    <div>
                      <label className="aw-label" htmlFor="ic-from">From Date</label>
                      <DatePicker
                        id="ic-from"
                        value={parseProjectDate(formData.fromDate)}
                        onChange={(date) => updateField('fromDate', date ? date.format('DD-MMM-YYYY') : '')}
                        format="DD-MMM-YYYY"
                        className="aw-picker"
                        popupClassName="aw-select-popup"
                        disabled={disabled}
                        allowClear={false}
                      />
                    </div>
                    <div>
                      <label className="aw-label" htmlFor="ic-to">To Date</label>
                      <DatePicker
                        id="ic-to"
                        value={parseProjectDate(formData.toDate)}
                        onChange={(date) => updateField('toDate', date ? date.format('DD-MMM-YYYY') : '')}
                        format="DD-MMM-YYYY"
                        className="aw-picker"
                        popupClassName="aw-select-popup"
                        disabled={disabled}
                        allowClear={false}
                      />
                    </div>
                  </div>
                </div>

                <div className="aw-stack">
                  <div>
                    <label className="aw-label" htmlFor="ic-rate">Interest Rate (%)</label>
                    <div className="aw-input-wrap has-icon">
                      <Percent size={13} />
                      <input
                        id="ic-rate"
                        type="number"
                        value={formData.rate}
                        onChange={(e) => updateField('rate', e.target.value)}
                        placeholder="0.00"
                        className={`aw-input ${errors.rate ? 'is-invalid' : ''}`}
                      />
                    </div>
                    {errors.rate && <p className="aw-meta" style={{ color: 'var(--aw-danger)', marginTop: 4, fontWeight: 700 }}>{errors.rate}</p>}
                  </div>
                  <div>
                    <label className="aw-label" htmlFor="ic-min">Min Calculation Amount</label>
                    <div className="aw-input-wrap has-icon">
                      <IndianRupee size={13} />
                      <input
                        id="ic-min"
                        type="number"
                        value={formData.minInterestAmount}
                        onChange={(e) => updateField('minInterestAmount', e.target.value)}
                        placeholder="0.00"
                        className={`aw-input ${errors.minInterestAmount ? 'is-invalid' : ''}`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ── Finalize transaction ── */}
            <section className="aw-card" style={{ alignSelf: 'start' }}>
              <div className="aw-card-head">
                <span className="aw-card-icon"><Send size={14} /></span>
                <h2 className="aw-card-title">Finalize Transaction</h2>
              </div>
              <div className="aw-stack">
                <div>
                  <label className="aw-label" htmlFor="ic-post">Select Posting Date</label>
                  <DatePicker
                    id="ic-post"
                    value={parseProjectDate(formData.postDate)}
                    onChange={(date) => updateField('postDate', date ? date.format('DD-MMM-YYYY') : '')}
                    format="DD-MMM-YYYY"
                    className="aw-picker"
                    popupClassName="aw-select-popup"
                    disabled={disabled}
                    allowClear={false}
                  />
                </div>
                <button
                  type="button"
                  onClick={handlePost}
                  disabled={disabled || !calculationResult || isPosting}
                  className="aw-btn aw-btn-primary"
                  style={{ width: '100%' }}
                >
                  {isPosting ? <RefreshCw size={13} className="aw-spin" /> : <Send size={13} />}
                  {isPosting ? 'Posting...' : 'Post Transaction'}
                </button>
                {showCrystalReport && (
                  <button type="button" onClick={handleCrystalReport} disabled={disabled} className="aw-btn aw-btn-secondary" style={{ width: '100%' }}>
                    <FileText size={13} /> Generate Report
                  </button>
                )}
              </div>
            </section>
          </div>

          {/* ── Results ── */}
          <section className="aw-card">
            <div className="aw-card-head">
              <span className="aw-card-icon"><List size={14} /></span>
              <div>
                <h2 className="aw-card-title">Calculation Breakdown</h2>
                <p className="aw-meta">Detailed ledger analysis</p>
              </div>
              <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {calculationResult && <span className="aw-pill tone-success"><CheckCircle2 size={11} style={{ marginRight: 4 }} />Ready</span>}
                {isCalculating && (
                  <span className="aw-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <RefreshCw size={12} className="aw-spin" /> Analyzing...
                  </span>
                )}
              </span>
            </div>

            {isLoading || isCalculating ? (
              <div className="aw-empty" style={{ padding: 40 }}>
                <RefreshCw size={28} className="aw-spin" />
                <strong className="aw-strong">Running Financial Deep Scan...</strong>
              </div>
            ) : calculationResult ? (
              <div className="aw-table-wrap aw-fade-in" style={{ maxHeight: '46vh' }}>
                <table className="aw-table">
                  <thead>
                    <tr>
                      <th>MB No</th>
                      <th>Name</th>
                      <th className="is-right">Opening Bal</th>
                      <th className="is-right">Closing Bal</th>
                      <th className="is-right">Interest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculationResult.transactions.map((row: any, i: number) => (
                      <tr key={i}>
                        <td className="is-accent">{row.date}</td>
                        <td>{row.description}</td>
                        <td className="is-right is-muted">{inr(row.amount)}</td>
                        <td className="is-right">{inr(row.balance)}</td>
                        <td className="is-right is-info">{inr(row.interestEarned)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="aw-empty" style={{ padding: 40 }}>
                <TrendingUp size={28} />
                <strong className="aw-strong">No Analysis Performed</strong>
                <span className="aw-meta">Configure parameters and click "Run Analysis"</span>
              </div>
            )}
          </section>

          {/* ── Summary ── */}
          {calculationResult && (
            <div className="aw-stats aw-fade-in" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <div className="aw-stat aw-stat-left">
                <div className="aw-stat-head"><Wallet size={14} /><span className="aw-stat-label">Closing Balance</span></div>
                <div className="aw-stat-value">{inr(calculationResult.total)}</div>
              </div>
              <div className="aw-stat aw-stat-left" style={{ ['--aw-tone' as any]: 'var(--aw-info)' }}>
                <div className="aw-stat-head"><TrendingUp size={14} /><span className="aw-stat-label">Net Interest</span></div>
                <div className="aw-stat-value">{inr(calculationResult.postAmount)}</div>
              </div>
              <div className="aw-stat aw-stat-left" style={{ ['--aw-tone' as any]: 'var(--aw-success)' }}>
                <div className="aw-stat-head"><Users size={14} /><span className="aw-stat-label">Members</span></div>
                <div className="aw-stat-value">{calculationResult.transactions.length}</div>
              </div>
              <div className="aw-stat aw-stat-left" style={{ ['--aw-tone' as any]: 'var(--aw-warning)' }}>
                <div className="aw-stat-head"><ArrowUpRight size={14} /><span className="aw-stat-label">Yield Rate</span></div>
                <div className="aw-stat-value">
                  {(calculationResult.total - calculationResult.postAmount) === 0
                    ? 'N/A'
                    : ((calculationResult.postAmount / (calculationResult.total - calculationResult.postAmount)) * 100).toFixed(2) + '%'
                  }
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterestCalculation;
