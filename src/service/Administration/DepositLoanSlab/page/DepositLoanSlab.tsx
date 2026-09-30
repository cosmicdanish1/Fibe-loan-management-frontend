import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers, Database, Plus, Trash2, Save, RefreshCcw, Percent, X,
} from 'lucide-react';
import { DatePicker, Select } from 'antd';
import dayjs from 'dayjs';
import apiService from '../../../../services/api';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';

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
}

type DepositType = 'RD' | 'LN';

// ── Constants ─────────────────────────────────────────────────────────────────

const PERIOD_UNITS = [
  { value: 'D', label: 'Days'   },
  { value: 'M', label: 'Months' },
  { value: 'Y', label: 'Years'  },
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

// Map backend response row → UI SlabRow
const fromBackend = (r: any, i: number): SlabRow => ({
  id: r.id,
  srNo: i + 1,
  fromAmount: Number(r.minAmount ?? 0),
  uptoAmount: Number(r.maxAmount ?? 0),
  // Backend stores tenure in days; display in months for readability
  fromPeriod: Math.round((r.minTenure ?? 0) / 30.44),
  uptoPeriod: Math.round((r.maxTenure ?? 0) / 30.44),
  periodUnit: 'M',
  interestRate: Number(r.interestRate ?? 0),
  prematureRate: Number(r.penaltyRate ?? 0),
  applicableFromDate: r.effectiveFrom
    ? dayjs(r.effectiveFrom).format('YYYY-MM-DD')
    : dayjs().format('YYYY-MM-DD'),
  applicableUptoDate: r.effectiveTo
    ? dayjs(r.effectiveTo).format('YYYY-MM-DD')
    : '',
  _dirty: false,
});

// Map UI SlabRow → backend CreateDepositSlabDto
const toBackend = (row: SlabRow, type: DepositType) => ({
  name: `${TYPE_LABELS[type]} ${row.fromAmount}–${row.uptoAmount} | ${row.fromPeriod}–${row.uptoPeriod}${row.periodUnit}`,
  type: TO_BACKEND_TYPE[type],
  minAmount: row.fromAmount,
  maxAmount: row.uptoAmount,
  minTenure: toDays(row.fromPeriod, row.periodUnit),
  maxTenure: toDays(row.uptoPeriod, row.periodUnit),
  interestRate: row.interestRate,
  penaltyRate: row.prematureRate,
  isActive: true,
  effectiveFrom: row.applicableFromDate || dayjs().format('YYYY-MM-DD'),
  effectiveTo: row.applicableUptoDate || undefined,
});

// ── Electron native dialog helpers ────────────────────────────────────────────

const showDialog = async (
  type: 'info' | 'warning' | 'error',
  title: string,
  message: string,
  detail: string,
) => {
  const api = (window as any).electronAPI;
  if (api?.showMessageBox) {
    await api.showMessageBox({ type, title, message, detail, buttons: ['OK'], defaultId: 0 });
  } else {
    alert(`[${type.toUpperCase()}] ${message}\n\n${detail}`);
  }
};

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
  const [selectedType, setSelectedType] = useState<DepositType>('RD');
  const [rows, setRows] = useState<SlabRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadSlabs = useCallback(async (type: DepositType) => {
    setLoading(true);
    try {
      const backendType = TO_BACKEND_TYPE[type];
      const response = await apiService.getDepositLoanSlabs(backendType);
      if (response.success && Array.isArray(response.data)) {
        setRows(response.data.map((r, i) => fromBackend(r, i)));
      } else {
        setRows([]);
      }
    } catch {
      await showDialog('error', 'Load Error', 'Failed to load slab data', 'Check server connection and try again.');
      setRows([]);
    } finally {
      setLoading(false);
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
    if (rows.length === 0) {
      await showDialog('warning', 'Nothing to Save', 'No slabs to save', 'Add at least one row first.');
      return;
    }

    // Validation
    for (const r of rows) {
      if (r.fromAmount < 0 || r.uptoAmount < 0) {
        await showDialog('warning', 'Validation', `Row ${r.srNo}: Amounts must be ≥ 0`, '');
        return;
      }
      if (r.fromAmount >= r.uptoAmount) {
        await showDialog('warning', 'Validation', `Row ${r.srNo}: Amount From must be less than UpTo`, `Got: ${r.fromAmount} ≥ ${r.uptoAmount}`);
        return;
      }
      if (r.fromPeriod > r.uptoPeriod) {
        await showDialog('warning', 'Validation', `Row ${r.srNo}: Period From must be ≤ UpTo`, `Got: ${r.fromPeriod} > ${r.uptoPeriod}`);
        return;
      }
      if (r.interestRate <= 0 || r.interestRate > 50) {
        await showDialog('warning', 'Validation', `Row ${r.srNo}: Interest Rate must be between 0.01% and 50%`, `Got: ${r.interestRate}%`);
        return;
      }
      if (!r.applicableFromDate) {
        await showDialog('warning', 'Validation', `Row ${r.srNo}: Applicable From Date is required`, '');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = rows.map(r => toBackend(r, selectedType));
      const response = await apiService.saveDepositLoanSlabs(payload, TO_BACKEND_TYPE[selectedType]);
      if (response.success) {
        await showDialog(
          'info',
          'Saved',
          `${TYPE_LABELS[selectedType]} Slabs Saved`,
          `${(response.data as any)?.saved ?? rows.length} slabs saved successfully.`
        );
        await loadSlabs(selectedType);
      } else {
        await showDialog('error', 'Save Failed', 'Failed to save slabs', (response as any).error || 'Unknown error');
      }
    } catch (err: any) {
      await showDialog('error', 'Connection Error', 'Unable to reach server', err.message || '');
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
    saveEnabled: !(saving || rows.length === 0),
  });

  return (
    <div className="app-window">
      {/* ── Header ── */}
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">Deposit / Loan Interest Slab</h1>
          <p className="aw-desc">Interest rate bracket configuration</p>
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
            <RefreshCcw size={13} className={loading ? 'aw-spin' : ''} /> Refresh
          </button>
          <button type="button" onClick={addRow} className="aw-btn aw-btn-secondary">
            <Plus size={13} /> Add Row
          </button>
          <button type="button" onClick={handleSave} disabled={saving || rows.length === 0} className="aw-btn aw-btn-primary">
            {saving ? <RefreshCcw size={13} className="aw-spin" /> : <Save size={13} />}
            Save Slabs
          </button>
          <button type="button" onClick={handleClose} className="aw-btn aw-btn-ghost">
            <X size={13} /> Close
          </button>
        </div>
      </div>

      <div className="aw-content">
        <div className="aw-stack">
          {/* ── Summary ── */}
          <div className="aw-stats aw-stats-3">
            <div className="aw-stat aw-stat-left">
              <div className="aw-stat-head"><Layers size={14} /><span className="aw-stat-label">Type</span></div>
              <div className="aw-stat-value" style={{ fontSize: 'calc(var(--type-body-size) + 3px)' }}>{TYPE_LABELS[selectedType]}</div>
            </div>
            <div className="aw-stat aw-stat-left" style={{ ['--aw-tone' as any]: 'var(--aw-info)' }}>
              <div className="aw-stat-head"><Database size={14} /><span className="aw-stat-label">Total Slabs</span></div>
              <div className="aw-stat-value">{totalRows}</div>
            </div>
            <div className="aw-stat aw-stat-left" style={{ ['--aw-tone' as any]: 'var(--aw-success)' }}>
              <div className="aw-stat-head"><Percent size={14} /><span className="aw-stat-label">Avg Rate</span></div>
              <div className="aw-stat-value">{avgRate}{avgRate !== '—' ? '%' : ''}</div>
            </div>
          </div>

          {/* ── Editable table ── */}
          <section className="aw-card">
            <div className="aw-card-head">
              <span className="aw-card-icon"><Layers size={14} /></span>
              <h2 className="aw-card-title">Slabs</h2>
              <span className="aw-meta" style={{ marginLeft: 'auto' }}>Edit any cell · Add Row to create · Save to persist</span>
            </div>

            {loading ? (
              <div className="aw-empty" style={{ padding: 40 }}>
                <RefreshCcw size={28} className="aw-spin" />
                <strong className="aw-strong">Loading slabs...</strong>
              </div>
            ) : (
              <div className="aw-table-wrap" style={{ maxHeight: '58vh' }}>
                <table className="aw-table" style={{ minWidth: 1180 }}>
                  <thead>
                    <tr>
                      <th className="is-center" style={{ width: 44 }}>Sr.</th>
                      <th className="is-right">Amount From (₹)</th>
                      <th className="is-right">Amount UpTo (₹)</th>
                      <th className="is-right">Period From</th>
                      <th className="is-right">Period UpTo</th>
                      <th style={{ width: 120 }}>Unit</th>
                      <th className="is-right">Rate (%)</th>
                      <th className="is-right">Premature (%)</th>
                      <th style={{ width: 150 }}>Applicable From</th>
                      <th style={{ width: 150 }}>Applicable UpTo</th>
                      <th style={{ width: 44 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={11}>
                          <div className="aw-empty" style={{ padding: 32 }}>
                            <Database size={28} />
                            <strong className="aw-strong">No slabs configured</strong>
                            <span className="aw-meta">Click <strong>Add Row</strong> to create the first slab</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      rows.map((row, i) => (
                        <tr key={i} className={row._dirty ? 'is-dirty' : undefined}>
                          <td className="is-muted is-center">{row.srNo}</td>
                          <td className="has-input"><NumCell label={`Row ${row.srNo} amount from`} value={row.fromAmount} onChange={(v) => updateRow(i, 'fromAmount', v)} /></td>
                          <td className="has-input"><NumCell label={`Row ${row.srNo} amount upto`} value={row.uptoAmount} onChange={(v) => updateRow(i, 'uptoAmount', v)} /></td>
                          <td className="has-input"><NumCell label={`Row ${row.srNo} period from`} value={row.fromPeriod} onChange={(v) => updateRow(i, 'fromPeriod', v)} /></td>
                          <td className="has-input"><NumCell label={`Row ${row.srNo} period upto`} value={row.uptoPeriod} onChange={(v) => updateRow(i, 'uptoPeriod', v)} /></td>
                          <td className="has-input">
                            <Select
                              className="aw-select"
                              popupClassName="aw-select-popup"
                              aria-label={`Row ${row.srNo} unit`}
                              value={row.periodUnit}
                              onChange={(v) => updateRow(i, 'periodUnit', v)}
                              options={PERIOD_UNITS}
                            />
                          </td>
                          <td className="has-input"><NumCell label={`Row ${row.srNo} rate`} value={row.interestRate} step={0.01} onChange={(v) => updateRow(i, 'interestRate', v)} /></td>
                          <td className="has-input"><NumCell label={`Row ${row.srNo} premature rate`} value={row.prematureRate} step={0.01} onChange={(v) => updateRow(i, 'prematureRate', v)} /></td>
                          <td className="has-input">
                            <DatePicker
                              value={row.applicableFromDate ? dayjs(row.applicableFromDate) : null}
                              onChange={(d) => updateRow(i, 'applicableFromDate', d ? d.format('YYYY-MM-DD') : '')}
                              format="DD-MMM-YYYY"
                              className="aw-picker"
                              popupClassName="aw-select-popup"
                              placeholder="From"
                            />
                          </td>
                          <td className="has-input">
                            <DatePicker
                              value={row.applicableUptoDate ? dayjs(row.applicableUptoDate) : null}
                              onChange={(d) => updateRow(i, 'applicableUptoDate', d ? d.format('YYYY-MM-DD') : '')}
                              format="DD-MMM-YYYY"
                              className="aw-picker"
                              popupClassName="aw-select-popup"
                              placeholder="UpTo (optional)"
                            />
                          </td>
                          <td className="is-center">
                            <button
                              type="button"
                              onClick={() => deleteRow(i)}
                              className="aw-icon-btn is-sm is-danger"
                              aria-label={`Delete row ${row.srNo}`}
                              data-tip="Delete row"
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
          <span style={{ display: 'inline-flex', alignItems: 'center' }}><i className="aw-status-dot" style={{ background: 'var(--aw-warning)' }} />Unsaved changes</span>
          <span style={{ display: 'inline-flex', alignItems: 'center' }}><i className="aw-status-dot" />Saved</span>
        </span>
        <span>FDRD_SLAB_DETAILS</span>
      </div>
    </div>
  );
};

export default DepositLoanSlab;
