import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, AlertCircle, CheckCircle, Clock, FileText, ChevronLeft, ChevronRight,
  Play, Eye, RefreshCw, ShieldCheck, Calendar, Settings
} from 'lucide-react';
import { apiService } from '../../../../services/api';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';
import dayjs from 'dayjs';
import { DatePicker, Select } from 'antd';

const showDialog = async (type: 'info' | 'warning' | 'error', msg: string, detail: string): Promise<void> => {
  if ((window as any).electronAPI?.showMessageBox) {
    await (window as any).electronAPI.showMessageBox({ type, title: 'electron-react-ts', message: msg, detail, buttons: ['OK'], defaultId: 0 });
  } else { alert(`[${type.toUpperCase()}] ${msg}\n\n${detail}`); }
};

const showConfirm = async (title: string, detail: string): Promise<boolean> => {
  if ((window as any).electronAPI?.showMessageBox) {
    const result = await (window as any).electronAPI.showMessageBox({ type: 'question', title: 'electron-react-ts', message: title, detail, buttons: ['Post Now', 'Cancel'], defaultId: 0, cancelId: 1 });
    return result?.response === 0;
  }
  return window.confirm(`${title}\n\n${detail}`);
};

interface InterestCalculationResult { memberNumber: string; memberName: string; accountNumber: string; openingBalance: number; averageBalance: number; interestAmount: number; closingBalance: number; days: number; }
interface InterestRunSummary { totalMembers: number; totalInterestAmount: number; fromDate: string; toDate: string; interestRate: number; voucherNumber: string; calculationDate: string; memberCalculations: InterestCalculationResult[]; }
interface InterestHistory { id: number; intType: string; fromDate: string; toDate: string; rate: number; totalAmount: number; memberCount: number; }


const UpdateSavingInterest: React.FC = () => {
  const [formData, setFormData] = useState({ fromDate: '', toDate: '', interestRate: 4.0, accountHead: 'A1001', voucherNumber: '', narration: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [previewResult, setPreviewResult] = useState<InterestRunSummary | null>(null);
  const [interestHistory, setInterestHistory] = useState<InterestHistory[]>([]);
  const [currentRate, setCurrentRate] = useState<number>(4.0);
  const [headList, setHeadList] = useState<{ code: string; name: string }[]>([]);

  useEffect(() => { initializeComponent(); }, []);

  const initializeComponent = useCallback(async () => {
    setIsLoading(true);
    try { await Promise.all([loadCurrentRate(), loadHistory(), loadHeads()]); setDefaultDates(); }
    catch { await showDialog('error', 'Initialization Error', 'Failed to initialize component.'); }
    finally { setIsLoading(false); }
  }, []);

  const loadHeads = useCallback(async () => {
    try {
      const response = await apiService.getHeadList();
      const heads = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      setHeadList(Array.isArray(heads) ? heads : []);
    } catch { setHeadList([]); }
  }, []);

  const setDefaultDates = useCallback(() => {
    const now = dayjs();
    const qStart = dayjs().year(now.year()).month(Math.floor(now.month() / 3) * 3).date(1);
    setFormData(prev => ({ ...prev, fromDate: qStart.format('YYYY-MM-DD'), toDate: qStart.add(3, 'month').date(0).format('YYYY-MM-DD') }));
  }, []);

  const loadCurrentRate = useCallback(async () => {
    const response = await apiService.getCurrentInterestRate();
    if (response.success && response.data) {
      const rate = typeof response.data === 'number' ? response.data : 4.0;
      setCurrentRate(rate); setFormData(prev => ({ ...prev, interestRate: rate }));
    }
  }, []);

  const loadHistory = useCallback(async () => {
    const response = await apiService.getInterestHistory();
    if (response.success && response.data) setInterestHistory(Array.isArray(response.data) ? response.data : []);
  }, []);

  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setValidationResult(null); setPreviewResult(null);
  }, []);

  const validateParameters = useCallback(async () => {
    if (!formData.fromDate || !formData.toDate || !formData.interestRate) { await showDialog('warning', 'Missing Fields', 'Please fill all required fields.'); return; }
    setIsValidating(true);
    try {
      const response = await apiService.validateInterestParameters(formData);
      if (response.success && response.data) {
        setValidationResult(response.data);
        if (response.data.valid) await showDialog('info', 'Validation Passed', 'Parameters validated successfully.');
        else await showDialog('error', 'Validation Failed', response.data.message || 'Validation failed.');
      }
    } catch { await showDialog('error', 'Validation Error', 'Validation process failed.'); }
    finally { setIsValidating(false); }
  }, [formData]);

  const previewCalculation = useCallback(async () => {
    setIsPreviewing(true);
    try {
      const response = await apiService.previewInterestCalculation(formData);
      if (response.success && response.data) setPreviewResult(response.data);
      else await showDialog('error', 'Preview Failed', 'Could not generate preview.');
    } catch { await showDialog('error', 'Preview Error', 'Preview calculation failed.'); }
    finally { setIsPreviewing(false); }
  }, [formData]);

  const processInterest = useCallback(async () => {
    const confirmed = await showConfirm('Confirm Interest Posting', `Post interest for ${formData.fromDate} to ${formData.toDate}. This cannot be undone.`);
    if (!confirmed) return;
    setIsProcessing(true);
    try {
      const response = await apiService.updateSavingInterest(formData);
      if (response.success) {
        await showDialog('info', 'Interest Posted', `Members: ${response.data.totalMembers}\nTotal: ₹${response.data.totalInterestAmount}`);
        loadHistory(); setValidationResult(null); setPreviewResult(null);
      } else await showDialog('error', 'Processing Failed', response.message || 'Interest posting failed.');
    } catch { await showDialog('error', 'Critical Error', 'A critical error occurred.'); }
    finally { setIsProcessing(false); }
  }, [formData, loadHistory]);

  const formatCurrency = useCallback((amount: number) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount), []);
  usePageToolbarActions({
    onSave: processInterest,
    saveLabel: 'Execute Posting',
    saveEnabled: !isProcessing && !!validationResult?.valid,
  });

  const PREVIEW_PAGE_SIZE = 20;
  const [previewPage, setPreviewPage] = useState(1);
  useEffect(() => { setPreviewPage(1); }, [previewResult]);
  const previewRows = previewResult?.memberCalculations ?? [];
  const previewPages = Math.ceil(previewRows.length / PREVIEW_PAGE_SIZE);
  const previewSlice = previewRows.slice((previewPage - 1) * PREVIEW_PAGE_SIZE, previewPage * PREVIEW_PAGE_SIZE);

  return (
    <div className="app-window">

      {/* Header */}
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">Saving Interest Ledger</h1>
          <p className="aw-desc">Financial Yield Configuration</p>
        </div>
        <div className="aw-actions">
          {isLoading && (
            <span className="aw-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} role="status">
              <RefreshCw size={12} className="aw-spin" /> Syncing with ledger...
            </span>
          )}
          <span className="aw-pill tone-info" style={{ gap: 6 }}>
            <TrendingUp size={12} /> Current Rate: {currentRate}%
          </span>
          <button type="button" onClick={processInterest} disabled={isProcessing || !validationResult?.valid} className="aw-btn aw-btn-primary">
            {isProcessing ? <RefreshCw size={13} className="aw-spin" /> : <Play size={13} />}
            Execute Posting
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="aw-fit">
        <div className="aw-split aw-split-form">

          {/* Left Panel */}
          <div className="aw-side">

            {/* Parameters Card */}
            <section className="aw-card">
              <div className="aw-card-head">
                <span className="aw-card-icon"><Settings size={14} /></span>
                <h2 className="aw-card-title">Parameters</h2>
              </div>
              <div className="aw-stack">
                <div className="aw-two" style={{ gap: 10 }}>
                  <div>
                    <label className="aw-label" htmlFor="usi-from">From Date</label>
                    <DatePicker id="usi-from" value={formData.fromDate ? dayjs(formData.fromDate) : null}
                      onChange={(d) => handleInputChange('fromDate', d ? d.format('YYYY-MM-DD') : '')}
                      format="DD-MMM-YYYY" className="aw-picker" popupClassName="aw-select-popup" allowClear={false}
                      suffixIcon={<Calendar size={13} />} />
                  </div>
                  <div>
                    <label className="aw-label" htmlFor="usi-to">To Date</label>
                    <DatePicker id="usi-to" value={formData.toDate ? dayjs(formData.toDate) : null}
                      onChange={(d) => handleInputChange('toDate', d ? d.format('YYYY-MM-DD') : '')}
                      format="DD-MMM-YYYY" className="aw-picker" popupClassName="aw-select-popup" allowClear={false}
                      suffixIcon={<Calendar size={13} />} />
                  </div>
                </div>
                <div>
                  <label className="aw-label" htmlFor="usi-rate">Yield Rate (% P.A.)</label>
                  <div className="aw-input-wrap has-icon">
                    <TrendingUp size={13} />
                    <input id="usi-rate" type="number" step="0.01" value={formData.interestRate}
                      onChange={e => handleInputChange('interestRate', parseFloat(e.target.value) || 0)}
                      className="aw-input" />
                  </div>
                </div>
                <div>
                  <label className="aw-label" htmlFor="usi-head">Ledger Head</label>
                  <Select id="usi-head" showSearch value={formData.accountHead || undefined}
                    onChange={val => handleInputChange('accountHead', val)}
                    placeholder="Select ledger head..." className="aw-select" popupClassName="aw-select-popup"
                    optionFilterProp="label" listHeight={300}
                    options={headList.map(h => ({ value: h.code, label: `${h.code} - ${h.name}` }))} />
                </div>
                <div>
                  <label className="aw-label" htmlFor="usi-voucher">Voucher No.</label>
                  <input id="usi-voucher" value={formData.voucherNumber} onChange={e => handleInputChange('voucherNumber', e.target.value)}
                    placeholder="Auto-generated if blank..." className="aw-input" />
                </div>
                <div>
                  <label className="aw-label" htmlFor="usi-narration">Narration</label>
                  <textarea id="usi-narration" value={formData.narration} onChange={e => handleInputChange('narration', e.target.value)}
                    rows={2} className="aw-input" />
                </div>
                <div className="aw-btn-row" style={{ paddingTop: 12, borderTop: '1px solid var(--aw-border)' }}>
                  <button type="button" onClick={validateParameters} disabled={isValidating} className="aw-btn aw-btn-secondary"
                    data-tip="Check dates, rate and ledger head" data-tip-pos="top-start">
                    {isValidating ? <RefreshCw size={13} className="aw-spin" /> : <ShieldCheck size={13} />} Validate
                  </button>
                  <button type="button" onClick={previewCalculation} disabled={isPreviewing} className="aw-btn aw-btn-secondary"
                    data-tip="Preview the result without posting" data-tip-pos="top-end">
                    {isPreviewing ? <RefreshCw size={13} className="aw-spin" /> : <Eye size={13} />} Snapshot
                  </button>
                </div>
              </div>
            </section>

            {/* Validation Status */}
            {validationResult && (
              <div className={`aw-alert aw-fade-in ${validationResult.valid ? 'aw-alert-success' : 'aw-alert-danger'}`} role="status" style={{ marginBottom: 0 }}>
                {validationResult.valid ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                <div>
                  <strong style={{ textTransform: 'uppercase' }}>{validationResult.valid ? 'Validation Passed' : 'Validation Failed'}</strong>
                  {validationResult.message && <p style={{ marginTop: 2, fontWeight: 500 }}>{validationResult.message}</p>}
                </div>
              </div>
            )}

            {/* History */}
            {interestHistory.length > 0 && (
              <section className="aw-card aw-fade-in">
                <div className="aw-card-head">
                  <span className="aw-card-icon"><Clock size={14} /></span>
                  <h2 className="aw-card-title">Batch History</h2>
                </div>
                <div className="aw-rows" style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {interestHistory.slice(0, 10).map(h => (
                    <div key={h.id} className="aw-row" style={{ alignItems: 'center' }}>
                      <div>
                        <span className="aw-row-value" style={{ display: 'block' }}>{dayjs(h.fromDate).format('DD/MM/YY')} — {dayjs(h.toDate).format('DD/MM/YY')}</span>
                        <span className="aw-meta">{h.memberCount} members · {h.rate}% p.a.</span>
                      </div>
                      <span className="aw-row-value" style={{ color: 'var(--aw-success)' }}>₹{formatCurrency(h.totalAmount)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>

          {/* Right Panel: Preview */}
          <section className="aw-card aw-main">
            <div className="aw-main-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span className="aw-card-icon"><FileText size={14} /></span>
                <h2 className="aw-card-title">Preview / Sandbox</h2>
              </div>
              {previewResult && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="aw-pill tone-muted">{previewResult.totalMembers} members</span>
                  <span className="aw-pill tone-success">Total: ₹{formatCurrency(previewResult.totalInterestAmount)}</span>
                </div>
              )}
            </div>
            <div className="aw-main-body" style={{ padding: 0 }}>
              {previewRows.length > 0 ? (
                <table className="aw-table aw-fade-in">
                  <thead>
                    <tr>
                      {['MB No.', 'Name', 'Avg Balance', 'Days', 'Interest'].map((h, i) => (
                        <th key={h} className={i === 2 || i === 4 ? 'is-right' : i === 3 ? 'is-center' : ''}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewSlice.map((r, i) => (
                      <tr key={`${r.memberNumber}-${i}`}>
                        <td className="is-accent">{r.memberNumber}</td>
                        <td>{r.memberName}</td>
                        <td className="is-right">₹{formatCurrency(r.averageBalance)}</td>
                        <td className="is-center is-muted">{r.days}</td>
                        <td className="is-right is-success">₹{formatCurrency(r.interestAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="aw-empty" style={{ minHeight: '100%' }}>
                  <Eye size={38} />
                  <strong className="aw-strong">No Preview Data</strong>
                  <span>Click "Snapshot" after validating parameters</span>
                </div>
              )}
            </div>
            {previewPages > 1 && (
              <div className="aw-main-foot">
                <span>
                  {((previewPage - 1) * PREVIEW_PAGE_SIZE) + 1}–{Math.min(previewPage * PREVIEW_PAGE_SIZE, previewRows.length)} of {previewRows.length}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button type="button" onClick={() => setPreviewPage(Math.max(1, previewPage - 1))} disabled={previewPage === 1}
                    className="aw-btn aw-btn-secondary" style={{ padding: '0 8px' }} aria-label="Previous page" data-tip="Previous page" data-tip-pos="top-end">
                    <ChevronLeft size={15} />
                  </button>
                  <span className="aw-strong" style={{ fontVariantNumeric: 'tabular-nums' }}>{previewPage} / {previewPages}</span>
                  <button type="button" onClick={() => setPreviewPage(Math.min(previewPages, previewPage + 1))} disabled={previewPage === previewPages}
                    className="aw-btn aw-btn-secondary" style={{ padding: '0 8px' }} aria-label="Next page" data-tip="Next page" data-tip-pos="top-end">
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
};

export default UpdateSavingInterest;
