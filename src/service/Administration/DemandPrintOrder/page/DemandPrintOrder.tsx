// page/DemandPrintOrder.tsx

import React, { useState, useEffect, useCallback } from "react";
import {
  X, Edit3, Save, Plus, Trash2, Database,
  Search, ShieldCheck, Building2, List, RefreshCw, AlertCircle,
} from "lucide-react";
import { useDemandPrintOrder } from "../hook/useDemandPrintOrder";
import MDAmountDetails from "../components/MDAmountDetails";
import HeadMasterLookup from "../components/HeadMasterLookup";
import AwDialog from '@/components/shared/kit/AwDialog';

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
    alert(`[${title}] ${msg}${detail ? '\n\n' + detail : ''}`);
  }
};

const closeWindow = () => {
  const api = (window as any).electronAPI;
  if (api?.ipcRenderer?.send) api.ipcRenderer.send('window-close');
  else window.close();
};

const DemandPrintOrder: React.FC = () => {
  const { rows, setRows, loading, saveRows, refresh } = useDemandPrintOrder();
  const [showMDAmountModal, setShowMDAmountModal] = useState(false);
  const [showHeadLookup, setShowHeadLookup] = useState(false);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editedData, setEditedData] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);

  // ESC cancels active edit
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && editingRow !== null) {
      setEditingRow(null);
      setEditedData({});
    }
  }, [editingRow]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleEdit = (index: number) => {
    setEditingRow(index);
    setEditedData({ ...rows[index] });
  };

  const handleSave = async (index: number) => {
    setSaving(true);
    const updatedRows = [...rows];
    updatedRows[index] = editedData;
    setRows(updatedRows);
    setEditingRow(null);
    setEditedData({});
    const ok = await saveRows(updatedRows);
    setSaving(false);
    if (!ok) {
      await showDialog('error', 'Save Failed', 'Could not save demand print order.', 'Check server connection and retry.');
    }
  };

  const handleCancel = () => {
    setEditingRow(null);
    setEditedData({});
  };

  const handleInputChange = (field: string, value: string | number) => {
    setEditedData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleAddRow = () => {
    const newRow = {
      headCode: '', headType: '', inttType: '',
      description: '', mapColName: '', printOrder: rows.length + 1,
    };
    setRows([...rows, newRow]);
    setEditingRow(rows.length);
    setEditedData(newRow);
  };

  const handleDeleteRow = async (index: number) => {
    const row = rows[index];
    const api = (window as any).electronAPI;
    let confirmed = false;
    if (api?.showMessageBox) {
      const res = await api.showMessageBox({
        type: 'warning',
        title: 'Delete Row',
        message: `Delete "${row?.description || row?.headCode || 'this row'}"?`,
        detail: 'This will permanently remove it from the demand print order.',
        buttons: ['Cancel', 'Delete'],
        defaultId: 0,
        cancelId: 0,
      });
      confirmed = res.response === 1;
    } else {
      confirmed = window.confirm('Are you sure you want to delete this row?');
    }
    if (!confirmed) return;

    setSaving(true);
    const updated = rows.filter((_, i) => i !== index);
    setRows(updated);
    const ok = await saveRows(updated);
    setSaving(false);
    if (!ok) {
      await showDialog('error', 'Delete Failed', 'Could not save after deletion.', 'The row was removed locally but the server update failed.');
    }
  };

  const filteredRows = (rows || []).filter(row =>
    row.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.headCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.mapColName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="app-window">
      {/* ── Header ── */}
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">Demand Print Matrix</h1>
          <p className="aw-desc" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Database size={12} /> Administrative Logic Terminal
          </p>
        </div>
        <div className="aw-actions">
          <button type="button" onClick={refresh} disabled={loading} className="aw-icon-btn" aria-label="Refresh" data-tip="Refresh" data-tip-pos="bottom-end">
            <RefreshCw size={14} className={loading ? 'aw-spin' : ''} />
          </button>
          <button type="button" onClick={handleAddRow} disabled={saving} className="aw-btn aw-btn-primary">
            <Plus size={13} /> Add
          </button>
          <button type="button" onClick={closeWindow} className="aw-btn aw-btn-ghost">
            <X size={13} /> Close
          </button>
        </div>
      </div>

      <div className="aw-content">
        <section className="aw-card">
          <div className="aw-input-wrap has-icon" style={{ maxWidth: 320 }}>
            <Search size={13} />
            <input
              type="text"
              placeholder="Search matrix..."
              aria-label="Search matrix"
              className="aw-input"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="aw-table-wrap" style={{ maxHeight: '64vh' }}>
            <table className="aw-table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th>Head Code</th>
                  <th>Head Type</th>
                  <th>Description</th>
                  <th>Intt Type</th>
                  <th>Registry Column</th>
                  <th className="is-center" style={{ width: 90 }}>Order</th>
                  <th style={{ width: 120 }}>Commands</th>
                </tr>
              </thead>
              <tbody>
                {/* Loading skeleton */}
                {loading && Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`sk-${i}`}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j}><span className="aw-skeleton" style={{ display: 'block', height: 14, width: `${60 + (j * 15) % 40}%` }} /></td>
                    ))}
                  </tr>
                ))}

                {/* Empty state */}
                {!loading && filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <div className="aw-empty" style={{ padding: 32 }}>
                        <AlertCircle size={26} />
                        <strong className="aw-strong">{searchTerm ? 'No matching rows' : 'No rows configured'}</strong>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && filteredRows.map((row, index) => (
                  editingRow === index ? (
                    <tr key={index} className="is-dirty">
                      <td className="has-input" style={{ minWidth: 150 }}>
                        <div className="aw-input-wrap has-action">
                          <input className="aw-input" aria-label="Head code" value={editedData.headCode} onChange={e => handleInputChange('headCode', e.target.value)} />
                          <button type="button" className="aw-input-action" onClick={() => setShowHeadLookup(true)} aria-label="List of heads" data-tip="List of heads" data-tip-pos="top-end">
                            <List size={13} />
                          </button>
                        </div>
                      </td>
                      <td className="has-input"><input className="aw-input" aria-label="Head type" value={editedData.headType} onChange={e => handleInputChange('headType', e.target.value)} /></td>
                      <td className="has-input"><input className="aw-input" aria-label="Description" value={editedData.description} onChange={e => handleInputChange('description', e.target.value)} /></td>
                      <td className="has-input"><input className="aw-input" aria-label="Intt type" value={editedData.inttType} onChange={e => handleInputChange('inttType', e.target.value)} /></td>
                      <td className="has-input" style={{ minWidth: 190 }}>
                        <div className="aw-input-wrap has-action">
                          <input className="aw-input" aria-label="Registry column" value={editedData.mapColName} onChange={e => handleInputChange('mapColName', e.target.value)} />
                          <button type="button" className="aw-input-action" onClick={() => setShowMDAmountModal(true)} aria-label="MD column registry" data-tip="MD column registry" data-tip-pos="top-end">
                            <Database size={13} />
                          </button>
                        </div>
                      </td>
                      <td className="has-input">
                        <input type="number" aria-label="Print order" className="aw-input is-right" value={editedData.printOrder}
                          onChange={e => handleInputChange('printOrder', parseInt(e.target.value) || 1)} />
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', gap: 6 }}>
                          <button type="button" onClick={() => handleSave(index)} disabled={saving} className="aw-btn aw-btn-primary aw-btn-sm">
                            {saving ? <RefreshCw size={12} className="aw-spin" /> : <Save size={12} />} Save
                          </button>
                          <button type="button" onClick={handleCancel} className="aw-icon-btn is-sm" aria-label="Cancel (Esc)" data-tip="Cancel (Esc)" data-tip-pos="left">
                            <X size={14} />
                          </button>
                        </span>
                      </td>
                    </tr>
                  ) : (
                    <tr key={index}>
                      <td className="is-accent">{row.headCode}</td>
                      <td><span className="aw-pill tone-muted">{row.headType || 'STD'}</span></td>
                      <td>{row.description}</td>
                      <td className="is-muted">{row.inttType || '—'}</td>
                      <td><span className="aw-pill">{row.mapColName}</span></td>
                      <td className="is-center is-muted">{row.printOrder}</td>
                      <td>
                        <span style={{ display: 'inline-flex', gap: 2 }}>
                          <button type="button" onClick={() => handleEdit(index)} className="aw-icon-btn is-sm" aria-label={`Edit ${row.headCode}`} data-tip="Edit" data-tip-pos="left">
                            <Edit3 size={14} />
                          </button>
                          <button type="button" onClick={() => handleDeleteRow(index)} className="aw-icon-btn is-sm is-danger" aria-label={`Delete ${row.headCode}`} data-tip="Delete" data-tip-pos="left">
                            <Trash2 size={14} />
                          </button>
                        </span>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="aw-footer">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Building2 size={12} /> Ledger Matrix Control · {filteredRows.length} row{filteredRows.length !== 1 ? 's' : ''}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ShieldCheck size={12} /> Protocol v2.9.2</span>
      </div>

      <AwDialog open={showMDAmountModal} title="MD Column Registry" icon={<Database size={14} />} onClose={() => setShowMDAmountModal(false)} maxWidth="26rem" flush>
        <div style={{ height: 380 }}>
          <MDAmountDetails onSelect={colName => { handleInputChange('mapColName', colName); setShowMDAmountModal(false); }} />
        </div>
      </AwDialog>

      <AwDialog open={showHeadLookup} title="List of Heads" icon={<List size={14} />} onClose={() => setShowHeadLookup(false)} maxWidth="38rem" flush>
        <div style={{ height: 420 }}>
          <HeadMasterLookup onSelect={code => { handleInputChange('headCode', code); setShowHeadLookup(false); }} />
        </div>
      </AwDialog>
    </div>
  );
};

export default DemandPrintOrder;
