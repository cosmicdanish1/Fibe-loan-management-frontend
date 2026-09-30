// page/BalanceTransfer.tsx

import React, { useState, useEffect } from 'react';
import {
  X, Database, IndianRupee, CheckCircle,
  ShieldCheck, Send, RotateCcw, Building2, Info,
  ShieldAlert, RefreshCw,
} from 'lucide-react';
import { Select } from 'antd';
import dayjs from 'dayjs';
import AwDialog from '@/components/shared/kit/AwDialog';
import { apiService } from '../../../../../services/api';
import { usePageToolbarActions } from '../../../../../utils/pageToolbarActions';

interface HeadOption { code: string; headName: string; }

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

const closeWindow = () => {
  const api = (window as any).electronAPI;
  if (api?.ipcRenderer?.send) api.ipcRenderer.send('window-close');
  else window.close();
};

const fmtAmount = (n: string | number) =>
  '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EMPTY: TransferData = {
  fromAccount: '', toAccount: '', amount: '',
  transferDate: dayjs().format('YYYY-MM-DD'), description: '',
};

const errLine = (msg?: string) => msg
  ? <p className="aw-meta" style={{ marginTop: 4, color: 'var(--aw-danger)', fontWeight: 700 }}>{msg}</p>
  : null;

const BalanceTransfer: React.FC<BalanceTransferProps> = ({ className = '' }) => {
  const [transferData, setTransferData] = useState<TransferData>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [lastTransfer, setLastTransfer] = useState<TransferData | null>(null);
  const [headOptions, setHeadOptions] = useState<HeadOption[]>([]);
  const [loadingHeads, setLoadingHeads] = useState(false);

  useEffect(() => {
    const loadHeads = async () => {
      setLoadingHeads(true);
      try {
        const res = await apiService.getHeadMasters();
        if (res.success && Array.isArray(res.data)) {
          setHeadOptions(res.data as HeadOption[]);
        }
      } catch { /* silent — dropdown just stays empty, no hard crash */ }
      finally { setLoadingHeads(false); }
    };
    loadHeads();
  }, []);

  const updateField = (field: keyof TransferData, value: string) => {
    setTransferData(prev => ({ ...prev, [field]: value }));
    const errorKey = field as keyof FormErrors;
    if (errors[errorKey] || errors.general) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[errorKey];
        delete next.general;
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const e: FormErrors = {};
    if (!transferData.fromAccount.trim()) e.fromAccount = 'Select a source GL head';
    if (!transferData.toAccount.trim()) e.toAccount = 'Select a destination GL head';
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

  const checksPassed = (): number => {
    const { fromAccount, toAccount, amount, transferDate, description } = transferData;
    return [
      !!fromAccount,
      !!(toAccount && toAccount !== fromAccount),
      !!(amount && !isNaN(Number(amount)) && Number(amount) > 0),
      !!transferDate,
      !!description.trim(),
    ].filter(Boolean).length;
  };

  const headLabel = (code: string): string => {
    const h = headOptions.find(x => x.code === code);
    return h ? `${h.code} — ${h.headName}` : code;
  };

  const handleReset = () => {
    setTransferData({ ...EMPTY, transferDate: dayjs().format('YYYY-MM-DD') });
    setErrors({});
  };

  const openConfirm = () => {
    if (!validateForm()) return;
    setShowConfirm(true);
  };

  const handleConfirmTransfer = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const response = await apiService.manualBalanceTransfer({
        ...transferData,
        amount: parseFloat(transferData.amount),
      });

      if (response.success) {
        setLastTransfer({ ...transferData });
        setShowConfirm(false);
        setShowSuccess(true);
      } else {
        setShowConfirm(false);
        setErrors({ general: response.error || 'Transfer failed. Please try again.' });
      }
    } catch (err: any) {
      setShowConfirm(false);
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

  usePageToolbarActions({
    onSave: openConfirm,
    saveLabel: 'Process',
    saveEnabled: !(!isFormValid() || isLoading),
  });

  const statusLabel = isFormValid() ? 'Ready to process' : 'Incomplete';
  const done = checksPassed();
  const headSelectOptions = headOptions.map(h => ({ value: h.code, label: `${h.code} — ${h.headName}` }));

  // ── Success Screen ──
  if (showSuccess && lastTransfer) {
    return (
      <div className={`app-window ${className}`}>
        <div style={{ margin: 'auto', width: '100%', maxWidth: 440, padding: 16 }}>
          <section className="aw-card aw-fade-in">
            <div className="aw-empty" style={{ padding: '12px 0 4px' }}>
              <span className="aw-card-icon" style={{ width: 52, height: 52, borderRadius: '50%', color: 'var(--aw-success)' }}><CheckCircle size={26} /></span>
              <h2 className="aw-title">Transfer complete</h2>
              <p className="aw-meta">Posted to the ledger on {dayjs(lastTransfer.transferDate).format('DD MMM YYYY')}</p>
              <p className="aw-stat-value" style={{ color: 'var(--aw-success)', fontSize: 28 }}>{fmtAmount(lastTransfer.amount)}</p>
            </div>
            <div className="aw-rows">
              <div className="aw-row"><span className="aw-row-label">From</span><span className="aw-row-value" style={{ textAlign: 'right' }}>{headLabel(lastTransfer.fromAccount)}</span></div>
              <div className="aw-row"><span className="aw-row-label">To</span><span className="aw-row-value" style={{ textAlign: 'right' }}>{headLabel(lastTransfer.toAccount)}</span></div>
              <div className="aw-row"><span className="aw-row-label">Description</span><span className="aw-row-value" style={{ textAlign: 'right' }}>{lastTransfer.description}</span></div>
            </div>
            <button type="button" onClick={handleSuccessClose} className="aw-btn aw-btn-primary" style={{ width: '100%' }}>Done</button>
          </section>
        </div>
      </div>
    );
  }

  // ── Main Form ──
  return (
    <div className={`app-window ${className}`}>
      {/* ── Header ── */}
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">Balance Transfer</h1>
          <p className="aw-desc">Move funds between general ledger heads. Entries post to the ledger immediately.</p>
        </div>
        <div className="aw-actions">
          <button type="button" onClick={handleReset} disabled={isLoading} className="aw-btn aw-btn-secondary">
            <RotateCcw size={13} /> Reset
          </button>
          <button type="button" onClick={openConfirm} disabled={!isFormValid() || isLoading} className="aw-btn aw-btn-primary">
            <Send size={13} /> Process transfer
          </button>
          <button type="button" onClick={closeWindow} className="aw-btn aw-btn-ghost">
            <X size={13} /> Close
          </button>
        </div>
      </div>

      <div className="aw-content">
        <div className="aw-stack">
          {errors.general && (
            <div className="aw-alert aw-alert-danger aw-fade-in" style={{ marginBottom: 0 }} role="alert">
              <ShieldAlert size={15} /><span>{errors.general}</span>
            </div>
          )}

          <div className="aw-split aw-split-form" style={{ height: 'auto', gridTemplateColumns: 'minmax(0, 7fr) minmax(280px, 4fr)', alignItems: 'start' }}>
            {/* ── Transfer details ── */}
            <section className="aw-card" style={{ minWidth: 0 }}>
              <div className="aw-card-head">
                <span className="aw-card-icon"><Database size={14} /></span>
                <h2 className="aw-card-title">Transfer details</h2>
                <span className="aw-meta" style={{ marginLeft: 'auto', textTransform: 'uppercase', letterSpacing: '.06em' }}>Step 1 of 2</span>
              </div>

              <div className="aw-two">
                <div>
                  <label className="aw-label" htmlFor="bt-from">From account (GL head)</label>
                  <Select
                    id="bt-from"
                    className={`aw-select ${errors.fromAccount ? 'is-invalid' : ''}`}
                    popupClassName="aw-select-popup"
                    showSearch
                    optionFilterProp="label"
                    loading={loadingHeads}
                    value={transferData.fromAccount || undefined}
                    onChange={(v) => updateField('fromAccount', v ?? '')}
                    placeholder="Select source GL head"
                    notFoundContent={loadingHeads ? 'Loading GL heads…' : 'No matching GL heads'}
                    options={headSelectOptions}
                  />
                  {errLine(errors.fromAccount)}
                </div>

                <div>
                  <label className="aw-label" htmlFor="bt-to">To account (GL head)</label>
                  <Select
                    id="bt-to"
                    className={`aw-select ${errors.toAccount ? 'is-invalid' : ''}`}
                    popupClassName="aw-select-popup"
                    showSearch
                    optionFilterProp="label"
                    loading={loadingHeads}
                    value={transferData.toAccount || undefined}
                    onChange={(v) => updateField('toAccount', v ?? '')}
                    placeholder="Select destination GL head"
                    notFoundContent={loadingHeads ? 'Loading GL heads…' : 'No matching GL heads'}
                    options={headSelectOptions}
                  />
                  {errLine(errors.toAccount)}
                </div>

                <div>
                  <label className="aw-label" htmlFor="bt-amount">Amount</label>
                  <div className="aw-input-wrap has-icon">
                    <IndianRupee size={13} />
                    <input id="bt-amount" type="number" step="0.01" min="0" value={transferData.amount}
                      onChange={e => updateField('amount', e.target.value)} placeholder="0.00"
                      className={`aw-input ${errors.amount ? 'is-invalid' : ''}`} />
                  </div>
                  {errLine(errors.amount)}
                </div>

                <div>
                  <label className="aw-label" htmlFor="bt-date">Transfer date</label>
                  <input id="bt-date" type="date" value={transferData.transferDate} onChange={e => updateField('transferDate', e.target.value)}
                    className={`aw-input ${errors.transferDate ? 'is-invalid' : ''}`} />
                  {errLine(errors.transferDate)}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <label className="aw-label" htmlFor="bt-desc">Description</label>
                  <span className="aw-meta">{transferData.description.length}/240</span>
                </div>
                <textarea id="bt-desc" value={transferData.description}
                  onChange={e => updateField('description', e.target.value.slice(0, 240))}
                  rows={3}
                  placeholder="Purpose of transfer — e.g. reallocation of Q3 maintenance budget"
                  className={`aw-input ${errors.description ? 'is-invalid' : ''}`}
                  style={{ height: 'auto', paddingTop: 8, resize: 'none' }} />
                {errLine(errors.description)}
              </div>
            </section>

            {/* ── Review + note ── */}
            <div className="aw-stack">
              <section className="aw-card">
                <div className="aw-card-head">
                  <h2 className="aw-card-title">Review</h2>
                  <span className={`aw-pill tone-${isFormValid() ? 'success' : 'muted'}`} style={{ marginLeft: 'auto' }}>{statusLabel}</span>
                </div>

                <div className="aw-stack">
                  <div className="aw-panel">
                    <span className="aw-label">Source</span>
                    <p className="aw-strong" style={{ fontWeight: 600 }}>{transferData.fromAccount ? headLabel(transferData.fromAccount) : 'Select source GL head'}</p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center' }}><span className="aw-pill tone-muted">In transit ↓</span></div>
                  <div className="aw-panel aw-panel-accent">
                    <span className="aw-label">Destination</span>
                    <p className="aw-strong" style={{ fontWeight: 600 }}>{transferData.toAccount ? headLabel(transferData.toAccount) : 'Select destination GL head'}</p>
                  </div>

                  <div className="aw-row aw-row-total" style={{ borderTop: '1px solid var(--aw-border)', paddingTop: 10 }}>
                    <span className="aw-row-label">Amount</span>
                    <span className="aw-row-value">{transferData.amount && Number(transferData.amount) > 0 ? fmtAmount(transferData.amount) : '₹0.00'}</span>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="aw-label" style={{ marginBottom: 4 }}>Verification status</span>
                      <span className="aw-meta">{done} of 5 checks</span>
                    </div>
                    <span className="aw-bar-track" style={{ width: '100%' }}><span style={{ width: `${(done / 5) * 100}%` }} /></span>
                  </div>
                </div>
              </section>

              <div className="aw-alert aw-alert-info" style={{ marginBottom: 0 }}>
                <Info size={15} />
                <span><strong>Note:</strong> Balance transfers are processed immediately and cannot be reversed from this screen. Verify both GL heads before proceeding.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="aw-footer">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Building2 size={12} /> Financial Systems</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ShieldCheck size={12} /> Verified protocol · Session secured</span>
      </div>

      {/* Confirm dialog */}
      <AwDialog
        open={showConfirm}
        title="Confirm transfer"
        icon={<Send size={14} />}
        onClose={() => { if (!isLoading) setShowConfirm(false); }}
        maxWidth="26rem"
        compact
      >
        <div className="aw-stack">
          <p className="aw-meta" style={{ lineHeight: 1.5 }}>This posts immediately to the ledger and cannot be undone here.</p>
          <div className="aw-panel">
            <div className="aw-rows">
              <div className="aw-row"><span className="aw-row-label">Amount</span><span className="aw-row-value">{fmtAmount(transferData.amount || 0)}</span></div>
              <div className="aw-row"><span className="aw-row-label">From</span><span className="aw-row-value" style={{ textAlign: 'right' }}>{headLabel(transferData.fromAccount)}</span></div>
              <div className="aw-row"><span className="aw-row-label">To</span><span className="aw-row-value" style={{ textAlign: 'right' }}>{headLabel(transferData.toAccount)}</span></div>
              <div className="aw-row"><span className="aw-row-label">Date</span><span className="aw-row-value">{transferData.transferDate}</span></div>
            </div>
          </div>
          <div className="aw-btn-row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowConfirm(false)} disabled={isLoading} className="aw-btn aw-btn-secondary">Cancel</button>
            <button type="button" onClick={handleConfirmTransfer} disabled={isLoading} className="aw-btn aw-btn-primary">
              {isLoading && <RefreshCw size={13} className="aw-spin" />}
              {isLoading ? 'Processing…' : 'Process transfer'}
            </button>
          </div>
        </div>
      </AwDialog>
    </div>
  );
};

export default BalanceTransfer;
