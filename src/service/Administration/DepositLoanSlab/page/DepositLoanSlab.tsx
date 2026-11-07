import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Layers, Database, Plus, Trash2, Save, RefreshCcw, Percent, X,
} from 'lucide-react';
import { DatePicker, Select } from 'antd';
import dayjs from 'dayjs';
import apiService from '../../../../services/api';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';
import { useTranslation } from 'react-i18next';
import { tLabel } from '../../../../i18n';
import { showDialog4 as showDialog } from '@/utils/dialog';

// ── Type definitions ──────────────────────────────────────────────────────────

interface SlabRow {
  id?: number;
  srNo: number;
  fromAmount: number;
  uptoAmount: number;
  fromPeriod: number;
  uptoPeriod: number;
  periodUnit: 'D' | 'M' | 'Y';
  interestRate: number;
  prematureRate: number;
  applicableFromDate: string;
  applicableUptoDate: string;
  _dirty?: boolean;
  // Tenure exactly as stored by the backend (days) - re-sent untouched for rows the user did not edit
  _origMinDays?: number;
  _origMaxDays?: number;
}

type DepositType = 'RD' | 'LN';

// ── Constants ─────────────────────────────────────────────────────────────────

const PERIOD_UNITS = [
  { value: 'D', label: tLabel('Days')   },
  { value: 'M', label: tLabel('Months') },
  { value: 'Y', label: tLabel('Years')  },
];

const TYPE_LABELS: Record<DepositType, string> = {
  RD: 'Recurring Deposit',
  LN: 'Loan',
};

// Map UI type codes to backend enum values
const TO_BACKEND_TYPE: Record<DepositType, string> = {
  RD: 'recurring_deposit',
  LN: 'loan',
};

// Convert period to days for backend storage (minTenure / maxTenure in days)
const toDays = (value: number, unit: 'D' | 'M' | 'Y'): number => {
  if (unit === 'D') return value;
  if (unit === 'M') return Math.round(value * 30.44);
  return Math.round(value * 365);
};

const emptyRow = (srNo: number): SlabRow => ({
  srNo,
  fromAmount: 0,
  uptoAmount: 0,
  fromPeriod: 1,
  uptoPeriod: 12,
  periodUnit: 'M',
  interestRate: 0,
  prematureRate: 0,
  applicableFromDate: dayjs().format('YYYY-MM-DD'),
  applicableUptoDate: '',
  _dirty: true,
});

// Pick the coarsest unit that represents both tenures without loss
const tenureForDisplay = (
  minDays: number,
  maxDays: number,
): Pick<SlabRow, 'fromPeriod' | 'uptoPeriod' | 'periodUnit'> => {
  const exact = (days: number, unit: 'M' | 'Y') => {
    const v = Math.round(days / (unit === 'Y' ? 365 : 30.44));
    return toDays(v, unit) === days ? v : null;
  };
  for (const unit of ['Y', 'M'] as const) {
    const a = exact(minDays, unit);
    const b = exact(maxDays, unit);
    if (a !== null && b !== null && (unit === 'M' || a > 0 || b > 0)) {
      return { fromPeriod: a, uptoPeriod: b, periodUnit: unit };
    }
  }
  return { fromPeriod: minDays, uptoPeriod: maxDays, periodUnit: 'D' };
};

// Map backend response row → UI SlabRow
const fromBackend = (r: any, i: number): SlabRow => ({
  id: r.id,
  srNo: i + 1,
  fromAmount: Number(r.minAmount ?? 0),
  uptoAmount: Number(r.maxAmount ?? 0),
  // Backend stores tenure in days. Show years/months only when the stored days convert
  // back exactly; otherwise show days so nothing is silently rounded (45 days != 1 month).
  ...tenureForDisplay(Number(r.minTenure ?? 0), Number(r.maxTenure ?? 0)),
  interestRate: Number(r.interestRate ?? 0),
  prematureRate: Number(r.penaltyRate ?? 0),
  applicableFromDate: r.effectiveFrom
    ? dayjs(r.effectiveFrom).format('YYYY-MM-DD')
    : dayjs().format('YYYY-MM-DD'),
  applicableUptoDate: r.effectiveTo
    ? dayjs(r.effectiveTo).format('YYYY-MM-DD')
    : '',
  _dirty: false,
  _origMinDays: Number(r.minTenure ?? 0),
  _origMaxDays: Number(r.maxTenure ?? 0),
});

// Map UI SlabRow → backend CreateDepositSlabDto
const toBackend = (row: SlabRow, type: DepositType) => ({
  name: `${TYPE_LABELS[type]} ${row.fromAmount}–${row.uptoAmount} | ${row.fromPeriod}–${row.uptoPeriod}${row.periodUnit}`,
  type: TO_BACKEND_TYPE[type],
  minAmount: row.fromAmount,
  maxAmount: row.uptoAmount,
  // Untouched rows keep the exact stored days; edited rows are converted from what is shown
  minTenure: !row._dirty && row._origMinDays !== undefined ? row._origMinDays : toDays(row.fromPeriod, row.periodUnit),
  maxTenure: !row._dirty && row._origMaxDays !== undefined ? row._origMaxDays : toDays(row.uptoPeriod, row.periodUnit),
  interestRate: row.interestRate,
  penaltyRate: row.prematureRate,
  isActive: true,
  effectiveFrom: row.applicableFromDate || dayjs().format('YYYY-MM-DD'),
  effectiveTo: row.applicableUptoDate || undefined,
});

// ── Electron native dialog helpers ────────────────────────────────────────────

// ── Inline editable cell components ──────────────────────────────────────────

const NumCell: React.FC<{ value: number; onChange: (v: number) => void; step?: number; label: string }> = ({
  value, onChange, step = 1, label,
}) => (
  <input
    type="number"
    step={step}
    value={value}
    aria-label={label}
    onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
    className="aw-input is-right"
  />
);

// ── Main component ────────────────────────────────────────────────────────────

const DepositLoanSlab: React.FC<{ onClose?: () => void }> = () => {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState<DepositType>('RD');
  const [rows, setRows] = useState<SlabRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // Type the rows on screen were actually loaded for (Save must use this, not the tab)
  const [loadedType, setLoadedType] = useState<DepositType | null>(null);
  const loadSeq = useRef(0);

  const loadSlabs = useCallback(async (type: DepositType) => {
    const seq = ++loadSeq.current;
    setLoading(true);
    try {
      const backendType = TO_BACKEND_TYPE[type];
      const response = await apiService.getDepositLoanSlabs(backendType);
      if (seq !== loadSeq.current) return; // a newer load superseded this one
      if (response.success && Array.isArray(response.data)) {
        setRows(response.data.map((r, i) => fromBackend(r, i)));
        setLoadedType(type);
      } else {
        setRows([]);
        setLoadedType(null);
      }
    } catch {
      if (seq !== loadSeq.current) return;
      await showDialog('error', t('Load Error'), t('Failed to load slab data'), t('Check server connection and try again.'));
      setRows([]);
      setLoadedType(null);
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, []);

  useEffect(() => { loadSlabs(selectedType); }, [selectedType, loadSlabs]);

  const updateRow = useCallback((index: number, field: keyof SlabRow, value: any) => {
    setRows(prev => prev.map((r, i) =>
      i === index ? { ...r, [field]: value, _dirty: true } : r
    ));
  }, []);

  const addRow = () => {
    setRows(prev => [...prev, emptyRow(prev.length + 1)]);
  };

  const deleteRow = (index: number) => {
    setRows(prev => prev
      .filter((_, i) => i !== index)
      .map((r, i) => ({ ...r, srNo: i + 1 }))
    );
  };

  const handleSave = async () => {
    if (loading || loadedType === null || loadedType !== selectedType) {
      await showDialog('warning', t('Please Wait'), t('Slabs are still loading'), t('Wait for the list to finish loading, then save.'));
      return;
    }
    const saveType = loadedType;
    if (rows.length === 0) {
      await showDialog('warning', t('Nothing to Save'), t('No slabs to save'), t('Add at least one row first.'));
      return;
    }

    // Validation
    for (const r of rows) {
      if (r.fromAmount < 0 || r.uptoAmount < 0) {
        await showDialog('warning', t('Validation'), t('Row {{1}}: Amounts must be ≥ 0', { 1: r.srNo }), '');
        return;
      }
      if (r.fromAmount >= r.uptoAmount) {
        await showDialog('warning', t('Validation'), t('Row {{1}}: Amount From must be less than UpTo', { 1: r.srNo }), t('Got: {{1}} ≥ {{2}}', { 1: r.fromAmount, 2: r.uptoAmount }));
        return;
      }
      if (r.fromPeriod > r.uptoPeriod) {
        await showDialog('warning', t('Validation'), t('Row {{1}}: Period From must be ≤ UpTo', { 1: r.srNo }), t('Got: {{1}} > {{2}}', { 1: r.fromPeriod, 2: r.uptoPeriod }));
        return;
      }
      if (r.interestRate <= 0 || r.interestRate > 50) {
        await showDialog('warning', t('Validation'), t('Row {{1}}: Interest Rate must be between 0.01% and 50%', { 1: r.srNo }), t('Got: {{1}}%', { 1: r.interestRate }));
        return;
      }
      if (!Number.isFinite(r.prematureRate) || r.prematureRate < 0) {
        await showDialog('warning', t('Validation'), t('Row {{1}}: Premature Rate must be a number ≥ 0', { 1: r.srNo }), t('Got: {{1}}', { 1: r.prematureRate }));
        return;
      }
      if (!r.applicableFromDate) {
        await showDialog('warning', t('Validation'), t('Row {{1}}: Applicable From Date is required', { 1: r.srNo }), '');
        return;
      }
    }

    // No two slabs may cover the same amount, tenure and effective-date range
    const span = (lo: number, hi: number, lo2: number, hi2: number) =>
      (lo < hi2 && lo2 < hi) || (lo === lo2 && hi === hi2);
    for (let a = 0; a < rows.length; a++) {
      for (let b = a + 1; b < rows.length; b++) {
        const x = rows[a]!;
        const y = rows[b]!;
        const amountOverlap = span(x.fromAmount, x.uptoAmount, y.fromAmount, y.uptoAmount);
        const tenureOverlap = span(
          toDays(x.fromPeriod, x.periodUnit), toDays(x.uptoPeriod, x.periodUnit),
          toDays(y.fromPeriod, y.periodUnit), toDays(y.uptoPeriod, y.periodUnit),
        );
        const xEnd = x.applicableUptoDate || '9999-12-31';
        const yEnd = y.applicableUptoDate || '9999-12-31';
        const dateOverlap = x.applicableFromDate <= yEnd && y.applicableFromDate <= xEnd;
        if (amountOverlap && tenureOverlap && dateOverlap) {
          await showDialog('warning', t('Validation'), t('Rows {{1}} and {{2}} overlap', { 1: x.srNo, 2: y.srNo }), t('Two slabs cover the same amount range, period range and dates. Adjust one of them.'));
          return;
        }
      }
    }

    setSaving(true);
    try {
      const payload = rows.map(r => toBackend(r, saveType));
      const response = await apiService.saveDepositLoanSlabs(payload, TO_BACKEND_TYPE[saveType]);
      if (response.success) {
        await showDialog(
          'info',
          t('Saved'),
          t('{{1}} Slabs Saved', { 1: TYPE_LABELS[saveType] }),
          t('{{1}} slabs saved successfully.', { 1: (response.data as any)?.saved ?? rows.length })
        );
        await loadSlabs(saveType);
      } else {
        await showDialog('error', t('Save Failed'), t('Failed to save slabs'), response.message || (response as any).error || t('Unknown error'));
      }
    } catch (err: any) {
      await showDialog('error', t('Connection Error'), t('Unable to reach server'), err.message || '');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    const api = (window as any).electronAPI;
    if (api?.ipcRenderer) {
      api.ipcRenderer.send('window-close');
    } else {
      window.close();
    }
  };

  const totalRows = rows.length;
  const avgRate = totalRows > 0
    ? (rows.reduce((s, r) => s + Number(r.interestRate), 0) / totalRows).toFixed(2)
    : '—';

  usePageToolbarActions({
    onSave: handleSave,
    saveLabel: 'Save Slabs',
    saveEnabled: !(saving || loading || rows.length === 0),
  });

  return (
    <div className="app-window">
      {/* ── Header ── */}
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">{t('Deposit / Loan Interest Slab')}</h1>
          <p className="aw-desc">{t('Interest rate bracket configuration')}</p>
        </div>
        <div className="aw-actions">
          <div className="aw-seg" role="tablist" style={{ ['--seg-index' as any]: selectedType === 'RD' ? 0 : 1, ['--seg-count' as any]: 2 }}>
            {(['RD', 'LN'] as DepositType[]).map((type) => (
              <button
                key={type}
                type="button"
                role="tab"
                aria-selected={selectedType === type}
                onClick={() => setSelectedType(type)}
              >
                {TYPE_LABELS[type]}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => loadSlabs(selectedType)} disabled={loading} className="aw-btn aw-btn-secondary">
            <RefreshCcw size={13} className={loading ? 'aw-spin' : ''} /> {t('Refresh')}
          </button>
          <button type="button" onClick={addRow} className="aw-btn aw-btn-secondary">
            <Plus size={13} /> {t('Add Row')}
          </button>
          <button type="button" onClick={handleSave} disabled={saving || loading || rows.length === 0} className="aw-btn aw-btn-primary">
            {saving ? <RefreshCcw size={13} className="aw-spin" /> : <Save size={13} />}
            {t('Save Slabs')}
          </button>
          <button type="button" onClick={handleClose} className="aw-btn aw-btn-ghost">
            <X size={13} /> {t('Close')}
          </button>
        </div>
      </div>

      <div className="aw-content">
        <div className="aw-stack">
          {/* ── Summary ── */}
          <div className="aw-stats aw-stats-3">
            <div className="aw-stat aw-stat-left">
              <div className="aw-stat-head"><Layers size={14} /><span className="aw-stat-label">{t('Type')}</span></div>
              <div className="aw-stat-value" style={{ fontSize: 'calc(var(--type-body-size) + 3px)' }}>{TYPE_LABELS[selectedType]}</div>
            </div>
            <div className="aw-stat aw-stat-left" style={{ ['--aw-tone' as any]: 'var(--aw-info)' }}>
              <div className="aw-stat-head"><Database size={14} /><span className="aw-stat-label">{t('Total Slabs')}</span></div>
              <div className="aw-stat-value">{totalRows}</div>
            </div>
            <div className="aw-stat aw-stat-left" style={{ ['--aw-tone' as any]: 'var(--aw-success)' }}>
              <div className="aw-stat-head"><Percent size={14} /><span className="aw-stat-label">{t('Avg Rate')}</span></div>
              <div className="aw-stat-value">{avgRate}{avgRate !== '—' ? '%' : ''}</div>
            </div>
          </div>

          {/* ── Editable table ── */}
          <section className="aw-card">
            <div className="aw-card-head">
              <span className="aw-card-icon"><Layers size={14} /></span>
              <h2 className="aw-card-title">{t('Slabs')}</h2>
              <span className="aw-meta" style={{ marginLeft: 'auto' }}>{t('Edit any cell · Add Row to create · Save to persist')}</span>
            </div>

            {loading ? (
              <div className="aw-empty" style={{ padding: 40 }}>
                <RefreshCcw size={28} className="aw-spin" />
                <strong className="aw-strong">{t('Loading slabs...')}</strong>
              </div>
            ) : (
              <div className="aw-table-wrap" style={{ maxHeight: '58vh' }}>
                <table className="aw-table" style={{ minWidth: 1180 }}>
                  <thead>
                    <tr>
                      <th className="is-center" style={{ width: 44 }}>{t('Sr.')}</th>
                      <th className="is-right">{t('Amount From (₹)')}</th>
                      <th className="is-right">{t('Amount UpTo (₹)')}</th>
                      <th className="is-right">{t('Period From')}</th>
                      <th className="is-right">{t('Period UpTo')}</th>
                      <th style={{ width: 120 }}>{t('Unit')}</th>
                      <th className="is-right">{t('Rate (%)')}</th>
                      <th className="is-right">{t('Premature (%)')}</th>
                      <th style={{ width: 150 }}>{t('Applicable From')}</th>
                      <th style={{ width: 150 }}>{t('Applicable UpTo')}</th>
                      <th style={{ width: 44 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={11}>
                          <div className="aw-empty" style={{ padding: 32 }}>
                            <Database size={28} />
                            <strong className="aw-strong">{t('No slabs configured')}</strong>
                            <span className="aw-meta">{t('Click')} <strong>{t('Add Row')}</strong> {t('to create the first slab')}</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      rows.map((row, i) => (
                        <tr key={i} className={row._dirty ? 'is-dirty' : undefined}>
                          <td className="is-muted is-center">{row.srNo}</td>
                          <td className="has-input"><NumCell label={t('Row {{1}} amount from', { 1: row.srNo })} value={row.fromAmount} onChange={(v) => updateRow(i, 'fromAmount', v)} /></td>
                          <td className="has-input"><NumCell label={t('Row {{1}} amount upto', { 1: row.srNo })} value={row.uptoAmount} onChange={(v) => updateRow(i, 'uptoAmount', v)} /></td>
                          <td className="has-input"><NumCell label={t('Row {{1}} period from', { 1: row.srNo })} value={row.fromPeriod} onChange={(v) => updateRow(i, 'fromPeriod', v)} /></td>
                          <td className="has-input"><NumCell label={t('Row {{1}} period upto', { 1: row.srNo })} value={row.uptoPeriod} onChange={(v) => updateRow(i, 'uptoPeriod', v)} /></td>
                          <td className="has-input">
                            <Select
                              className="aw-select"
                              popupClassName="aw-select-popup"
                              aria-label={t('Row {{1}} unit', { 1: row.srNo })}
                              value={row.periodUnit}
                              onChange={(v) => updateRow(i, 'periodUnit', v)}
                              options={PERIOD_UNITS}
                            />
                          </td>
                          <td className="has-input"><NumCell label={t('Row {{1}} rate', { 1: row.srNo })} value={row.interestRate} step={0.01} onChange={(v) => updateRow(i, 'interestRate', v)} /></td>
                          <td className="has-input"><NumCell label={t('Row {{1}} premature rate', { 1: row.srNo })} value={row.prematureRate} step={0.01} onChange={(v) => updateRow(i, 'prematureRate', v)} /></td>
                          <td className="has-input">
                            <DatePicker
                              value={row.applicableFromDate ? dayjs(row.applicableFromDate) : null}
                              onChange={(d) => updateRow(i, 'applicableFromDate', d ? d.format('YYYY-MM-DD') : '')}
                              format="DD-MMM-YYYY"
                              className="aw-picker"
                              popupClassName="aw-select-popup"
                              placeholder={t('From')}
                            />
                          </td>
                          <td className="has-input">
                            <DatePicker
                              value={row.applicableUptoDate ? dayjs(row.applicableUptoDate) : null}
                              onChange={(d) => updateRow(i, 'applicableUptoDate', d ? d.format('YYYY-MM-DD') : '')}
                              format="DD-MMM-YYYY"
                              className="aw-picker"
                              popupClassName="aw-select-popup"
                              placeholder={t('UpTo (optional)')}
                            />
                          </td>
                          <td className="is-center">
                            <button
                              type="button"
                              onClick={() => deleteRow(i)}
                              className="aw-icon-btn is-sm is-danger"
                              aria-label={t('Delete row {{1}}', { 1: row.srNo })}
                              data-tip={t('Delete row')}
                              data-tip-pos="left"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="aw-footer">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 14 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center' }}><i className="aw-status-dot" style={{ background: 'var(--aw-warning)' }} />{t('Unsaved changes')}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center' }}><i className="aw-status-dot" />{t('Saved')}</span>
        </span>
        <span>FDRD_SLAB_DETAILS</span>
      </div>
    </div>
  );
};

export default DepositLoanSlab;
