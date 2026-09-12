import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers, Database, Plus, Trash2, Save, Loader2, RefreshCcw, X,
} from 'lucide-react';
import { DatePicker, ConfigProvider } from 'antd';
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

const NumCell: React.FC<{ value: number; onChange: (v: number) => void; step?: number }> = ({
  value, onChange, step = 1,
}) => (
  <input
    type="number"
    step={step}
    value={value}
    onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
    className="slab-cell w-full h-6 px-1.5 rounded fz-label font-bold text-right outline-none"
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
    <ConfigProvider theme={{ token: { colorPrimary: '#4f46e5', borderRadius: 4 } }}>
      <style>{`
        /* ── Number input spinner hide ── */
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }

        /* ── Cell base (light) ── */
        .slab-page .slab-cell {
          background: white;
          border: 1px solid #e2e8f0;
          color: #1e293b;
        }
        .slab-page .slab-cell:focus { border-color: #818cf8; background: #eef2ff; }

        .slab-page .slab-unit-select {
          background: white;
          border: 1px solid #e2e8f0;
          color: #1e293b;
        }

        /* ── DatePicker base ── */
        .slab-page .slab-datepicker .ant-picker {
          background: white !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 4px !important;
        }
        .slab-page .slab-datepicker .ant-picker-input > input {
          color: #1e293b !important;
          font-size: 9px !important;
          font-weight: 700 !important;
        }
        .slab-page .slab-datepicker .ant-picker-suffix { color: #94a3b8 !important; }

        /* ── Dark mode root ── */
        html.dark .slab-page { background: #0d0d0d !important; }

        /* Header */
        html.dark .slab-page .slab-header { background: #111 !important; border-color: #1f1f1f !important; }
        html.dark .slab-page .slab-title { color: #f5f5f7 !important; }
        html.dark .slab-page .slab-subtitle { color: #71717a !important; }
        html.dark .slab-page .slab-icon-bg { background: #4f46e5 !important; }

        /* Type tabs */
        html.dark .slab-page .slab-type-tabs { background: #1a1a1a !important; border-color: #2a2a2a !important; }
        html.dark .slab-page .slab-tab-inactive { color: #71717a !important; }
        html.dark .slab-page .slab-tab-inactive:hover { color: #8e8e93 !important; }

        /* Buttons */
        html.dark .slab-page .slab-btn-refresh { background: #1a1a1a !important; border-color: #2a2a2a !important; color: #8e8e93 !important; }
        html.dark .slab-page .slab-btn-refresh:hover { background: #222 !important; color: #f5f5f7 !important; }
        html.dark .slab-page .slab-hdr-btn { color: #8e8e93 !important; }
        html.dark .slab-page .slab-hdr-btn:hover { background: rgba(255,255,255,0.08) !important; }

        /* Stats bar */
        html.dark .slab-page .slab-stats-bar { background: #111 !important; border-color: #1f1f1f !important; }
        html.dark .slab-page .slab-stat-label { color: #71717a !important; }
        html.dark .slab-page .slab-stat-val { color: #f5f5f7 !important; }
        html.dark .slab-page .slab-divider { background: #2a2a2a !important; }

        /* Table container */
        html.dark .slab-page .slab-table-container { background: #151515 !important; border-color: #2a2a2a !important; }
        html.dark .slab-page .slab-thead-main { background: #111 !important; }
        html.dark .slab-page .slab-thead-main th { color: #f5f5f7 !important; border-color: #2a2a2a !important; }
        html.dark .slab-page .slab-thead-sub { background: #1a1a1a !important; }
        html.dark .slab-page .slab-thead-sub th { color: #71717a !important; border-color: #2a2a2a !important; }
        html.dark .slab-page .slab-tbody-row { border-color: #1f1f1f !important; }
        html.dark .slab-page .slab-tbody-row:hover { background: #1c1c1c !important; }
        html.dark .slab-page .slab-tbody-row.dirty { background: rgba(180,130,0,0.07) !important; }
        html.dark .slab-page .slab-sr { color: #374151 !important; }
        html.dark .slab-page .slab-cell {
          background: #1a1a1a !important;
          border-color: #2a2a2a !important;
          color: #f5f5f7 !important;
        }
        html.dark .slab-page .slab-cell:focus { border-color: #6366f1 !important; background: #1f1f3a !important; }
        html.dark .slab-page .slab-unit-select {
          background: #1a1a1a !important;
          border-color: #2a2a2a !important;
          color: #f5f5f7 !important;
        }

        /* DatePicker dark */
        html.dark .slab-page .slab-datepicker .ant-picker { background: #1a1a1a !important; border-color: #2a2a2a !important; }
        html.dark .slab-page .slab-datepicker .ant-picker-input > input { color: #f5f5f7 !important; background: transparent !important; }
        html.dark .slab-page .slab-datepicker .ant-picker:hover { border-color: #6366f1 !important; }
        html.dark .slab-page .slab-datepicker .ant-picker-suffix { color: #374151 !important; }

        /* Delete button */
        html.dark .slab-page .slab-delete-btn { color: #374151 !important; }
        html.dark .slab-page .slab-delete-btn:hover { color: #ef4444 !important; background: rgba(239,68,68,0.1) !important; }

        /* Empty state */
        html.dark .slab-page .slab-empty { color: #374151 !important; }
        html.dark .slab-page .slab-empty-title { color: #4b5563 !important; }

        /* Footer */
        html.dark .slab-page .slab-footer { background: #111 !important; border-color: #1f1f1f !important; }
        html.dark .slab-page .slab-footer-code { color: #2a2a2a !important; }

        /* Loading */
        html.dark .slab-page .slab-loading-text { color: #71717a !important; }
      `}</style>

      <div className="slab-page h-screen flex flex-col bg-slate-50 font-sans overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="slab-header bg-white border-b border-slate-200 px-3 py-1.5 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-2">
            <div className="slab-icon-bg bg-indigo-600 p-1.5 rounded-lg text-white shadow-md shadow-indigo-200">
              <Layers size={14} />
            </div>
            <div>
              <h1 className="slab-title fz-body font-black text-slate-800 tracking-tight leading-none uppercase">
                Deposit / Loan Interest Slab
              </h1>
              <p className="slab-subtitle fz-caption font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">
                Interest rate bracket configuration
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Type tabs */}
            <div className="slab-type-tabs flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
              {(['RD', 'LN'] as DepositType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-3 py-1 rounded-md fz-caption font-black uppercase tracking-widest transition-all ${
                    selectedType === type
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'slab-tab-inactive text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {TYPE_LABELS[type]}
                </button>
              ))}
            </div>

            <button
              onClick={() => loadSlabs(selectedType)}
              disabled={loading}
              className="slab-btn-refresh h-7 px-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg fz-caption font-black shadow-sm hover:bg-slate-50 active:scale-95 flex items-center gap-1.5 uppercase transition-all"
            >
              <RefreshCcw size={11} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>

            <button
              onClick={addRow}
              className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg fz-label font-black shadow-md shadow-emerald-200 active:scale-95 flex items-center gap-1.5 uppercase tracking-widest transition-all"
            >
              <Plus size={12} /> Add Row
            </button>

            <button
              onClick={handleSave}
              disabled={saving || rows.length === 0}
              className="h-7 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg fz-label font-black shadow-md shadow-indigo-200 active:scale-95 flex items-center gap-1.5 uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap transition-all"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Save Slabs
            </button>

            <button
              onClick={handleClose}
              className="slab-hdr-btn h-7 w-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-all"
              title="Close"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* ── Stats bar ──────────────────────────────────────────────────────── */}
        <div className="slab-stats-bar shrink-0 px-3 py-1.5 bg-white border-b border-slate-100 flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Database size={10} className="text-indigo-500" />
            <span className="slab-stat-label fz-caption font-black text-slate-500 uppercase">Type:</span>
            <span className="fz-caption font-black text-indigo-700">{TYPE_LABELS[selectedType]}</span>
          </div>
          <div className="slab-divider w-px h-3 bg-slate-200" />
          <div className="flex items-center gap-1.5">
            <span className="slab-stat-label fz-caption font-black text-slate-500 uppercase">Total Slabs:</span>
            <span className="slab-stat-val fz-caption font-black text-slate-800">{totalRows}</span>
          </div>
          <div className="slab-divider w-px h-3 bg-slate-200" />
          <div className="flex items-center gap-1.5">
            <span className="slab-stat-label fz-caption font-black text-slate-500 uppercase">Avg Rate:</span>
            <span className="fz-caption font-black text-emerald-700">{avgRate}{avgRate !== '—' ? '%' : ''}</span>
          </div>
          <div className="slab-divider w-px h-3 bg-slate-200" />
          <span className="fz-caption font-bold text-slate-400 italic">
            Click any cell to edit · Add Row to create · Save to persist
          </span>
        </div>

        {/* ── Editable Table ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-400">
              <div className="text-center">
                <Loader2 size={28} className="animate-spin mx-auto mb-2 text-indigo-400" />
                <p className="slab-loading-text fz-label font-black uppercase tracking-widest">Loading slabs...</p>
              </div>
            </div>
          ) : (
            <div className="slab-table-container bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="slab-thead-main bg-slate-900 text-white">
                    <th className="px-2 py-1.5 fz-caption font-black uppercase tracking-widest text-center border-r border-slate-700 w-8">Sr.</th>
                    <th colSpan={2} className="px-2 py-1.5 fz-caption font-black uppercase tracking-widest text-center border-r border-slate-700">Amount (₹)</th>
                    <th colSpan={2} className="px-2 py-1.5 fz-caption font-black uppercase tracking-widest text-center border-r border-slate-700">Period</th>
                    <th className="px-2 py-1.5 fz-caption font-black uppercase tracking-widest text-center border-r border-slate-700 w-24">Unit</th>
                    <th className="px-2 py-1.5 fz-caption font-black uppercase tracking-widest text-center border-r border-slate-700 w-20">Rate (%)</th>
                    <th className="px-2 py-1.5 fz-caption font-black uppercase tracking-widest text-center border-r border-slate-700 w-24">Premature (%)</th>
                    <th colSpan={2} className="px-2 py-1.5 fz-caption font-black uppercase tracking-widest text-center border-r border-slate-700">Applicable Date</th>
                    <th className="px-2 py-1.5 w-8 border-r-0" />
                  </tr>
                  <tr className="slab-thead-sub bg-slate-800 text-slate-300">
                    <th className="border-r border-slate-700" />
                    <th className="px-2 py-1 fz-caption font-black uppercase border-r border-slate-700">From</th>
                    <th className="px-2 py-1 fz-caption font-black uppercase border-r border-slate-700">UpTo</th>
                    <th className="px-2 py-1 fz-caption font-black uppercase border-r border-slate-700">From</th>
                    <th className="px-2 py-1 fz-caption font-black uppercase border-r border-slate-700">UpTo</th>
                    <th className="border-r border-slate-700" />
                    <th className="border-r border-slate-700" />
                    <th className="border-r border-slate-700" />
                    <th className="px-2 py-1 fz-caption font-black uppercase border-r border-slate-700">From</th>
                    <th className="px-2 py-1 fz-caption font-black uppercase border-r border-slate-700">UpTo</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-16 text-center">
                        <div className="slab-empty flex flex-col items-center gap-3 text-slate-400">
                          <Database size={32} strokeWidth={1.5} />
                          <p className="slab-empty-title fz-label font-black uppercase tracking-widest">No slabs configured</p>
                          <p className="fz-caption">Click <strong>Add Row</strong> to create the first slab</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, i) => (
                      <tr
                        key={i}
                        className={`slab-tbody-row border-b border-slate-100 hover:bg-indigo-50/20 transition-colors ${row._dirty ? 'dirty bg-amber-50/30' : ''}`}
                      >
                        <td className="px-2 py-1 text-center border-r border-slate-100">
                          <span className="slab-sr fz-caption font-black text-slate-400">{row.srNo}</span>
                        </td>

                        <td className="px-1 py-1 border-r border-slate-100 w-28">
                          <NumCell value={row.fromAmount} onChange={(v) => updateRow(i, 'fromAmount', v)} />
                        </td>
                        <td className="px-1 py-1 border-r border-slate-100 w-28">
                          <NumCell value={row.uptoAmount} onChange={(v) => updateRow(i, 'uptoAmount', v)} />
                        </td>

                        <td className="px-1 py-1 border-r border-slate-100 w-20">
                          <NumCell value={row.fromPeriod} onChange={(v) => updateRow(i, 'fromPeriod', v)} />
                        </td>
                        <td className="px-1 py-1 border-r border-slate-100 w-20">
                          <NumCell value={row.uptoPeriod} onChange={(v) => updateRow(i, 'uptoPeriod', v)} />
                        </td>

                        <td className="px-1 py-1 border-r border-slate-100">
                          <select
                            value={row.periodUnit}
                            onChange={(e) => updateRow(i, 'periodUnit', e.target.value)}
                            className="slab-unit-select w-full h-6 px-1.5 border rounded fz-label font-bold outline-none focus:border-indigo-400 cursor-pointer"
                          >
                            {PERIOD_UNITS.map(u => (
                              <option key={u.value} value={u.value}>{u.label}</option>
                            ))}
                          </select>
                        </td>

                        <td className="px-1 py-1 border-r border-slate-100">
                          <NumCell value={row.interestRate} step={0.01} onChange={(v) => updateRow(i, 'interestRate', v)} />
                        </td>

                        <td className="px-1 py-1 border-r border-slate-100">
                          <NumCell value={row.prematureRate} step={0.01} onChange={(v) => updateRow(i, 'prematureRate', v)} />
                        </td>

                        <td className="px-1 py-1 border-r border-slate-100 w-32">
                          <div className="slab-datepicker">
                            <DatePicker
                              size="small"
                              value={row.applicableFromDate ? dayjs(row.applicableFromDate) : null}
                              onChange={(d) => updateRow(i, 'applicableFromDate', d ? d.format('YYYY-MM-DD') : '')}
                              format="DD-MMM-YYYY"
                              className="w-full h-6"
                              placeholder="From"
                            />
                          </div>
                        </td>

                        <td className="px-1 py-1 border-r border-slate-100 w-32">
                          <div className="slab-datepicker">
                            <DatePicker
                              size="small"
                              value={row.applicableUptoDate ? dayjs(row.applicableUptoDate) : null}
                              onChange={(d) => updateRow(i, 'applicableUptoDate', d ? d.format('YYYY-MM-DD') : '')}
                              format="DD-MMM-YYYY"
                              className="w-full h-6"
                              placeholder="UpTo (optional)"
                            />
                          </div>
                        </td>

                        <td className="px-1 py-1 text-center">
                          <button
                            onClick={() => deleteRow(i)}
                            className="slab-delete-btn p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Delete row"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        <div className="slab-footer shrink-0 px-3 py-1 bg-white border-t border-slate-100 flex items-center justify-between shadow-[0_-1px_4px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 fz-caption text-amber-600 font-black">
              <span className="w-2 h-2 rounded-sm bg-amber-100 border border-amber-300 inline-block" /> Unsaved changes
            </span>
            <span className="flex items-center gap-1 fz-caption text-slate-400 font-bold">
              <span className="w-2 h-2 rounded-sm bg-white border border-slate-200 inline-block" /> Saved
            </span>
          </div>
          <span className="slab-footer-code fz-caption font-bold text-slate-300 uppercase tracking-widest">
            FDRD_SLAB_DETAILS
          </span>
        </div>

      </div>
    </ConfigProvider>
  );
};

export default DepositLoanSlab;
