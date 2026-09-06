// page/DemandPrintOrder.tsx

import React, { useState, useEffect, useCallback } from "react";
import {
  X, FileText, Edit3, Save, Plus, Trash2, Database,
  Search, Hash, ArrowRightLeft, Settings, ShieldCheck,
  Building2, List, RefreshCw, AlertCircle,
} from "lucide-react";
import { useDemandPrintOrder } from "../hook/useDemandPrintOrder";
import MDAmountDetails from "../components/MDAmountDetails";
import HeadMasterLookup from "../components/HeadMasterLookup";
import { ConfigProvider } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';

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

const editInputCls = 'w-full h-6 bg-white border-2 border-slate-200 rounded-lg px-2 fz-body font-bold text-slate-700 focus:border-indigo-400 outline-none transition-all dpo-edit-input';

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
    <ConfigProvider theme={{ token: { colorPrimary: '#6366f1', borderRadius: 10 } }}>
      <style>{`
        html.dark .dpo-page { background: #000000 !important; }

        /* Table body + footer */
        html.dark .dpo-page .dpo-table-wrap { background: #000000 !important; }
        html.dark .dpo-page .dpo-tbody { background: #000000 !important; }
        html.dark .dpo-page .dpo-row { border-color: rgba(255,255,255,.07) !important; }
        html.dark .dpo-page .dpo-row:hover { background: rgba(30,41,59,0.7) !important; }
        html.dark .dpo-page .dpo-row.editing { background: #1c1c1e !important; }
        html.dark .dpo-page .dpo-cell { border-color: rgba(255,255,255,.07) !important; }
        html.dark .dpo-page .dpo-cell-code { color: #818cf8 !important; }
        html.dark .dpo-page .dpo-cell-desc { color: #8e8e93 !important; }
        html.dark .dpo-page .dpo-cell-intt { color: rgba(255,255,255,.08) !important; }
        html.dark .dpo-page .dpo-badge { background: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; color: #8e8e93 !important; }
        html.dark .dpo-page .dpo-mapcol-badge { background: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; color: #818cf8 !important; }
        html.dark .dpo-page .dpo-order-num { background: #1c1c1e !important; color: #71717a !important; }
        html.dark .dpo-page .dpo-row:hover .dpo-order-num { background: #6366f1 !important; color: white !important; }

        /* Edit-mode inputs */
        html.dark .dpo-page .dpo-edit-input { background: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
        html.dark .dpo-page .dpo-edit-input:focus { border-color: #6366f1 !important; }

        /* Search input in header */
        html.dark .dpo-page .dpo-search-input { background: rgba(15,23,42,0.8) !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
        html.dark .dpo-page .dpo-search-input::placeholder { color: rgba(255,255,255,.08) !important; }

        /* Footer */
        html.dark .dpo-page .dpo-footer { background: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .dpo-page .dpo-footer-left { color: rgba(255,255,255,.08) !important; }
        html.dark .dpo-page .dpo-footer-right { color: rgba(255,255,255,.08) !important; }

        /* Loading / empty states */
        html.dark .dpo-page .dpo-loading { color: rgba(255,255,255,.08) !important; }

        /* Modal content (MDAmountDetails + HeadMasterLookup inside) */
        html.dark .dpo-modal-content { background: #1c1c1e !important; }
        html.dark .dpo-modal-content > div { background: #1c1c1e !important; }
        html.dark .dpo-modal-content .bg-white { background: #1c1c1e !important; }
        html.dark .dpo-modal-content .bg-slate-50\\/30 { background: rgba(15,23,42,0.6) !important; }
        html.dark .dpo-modal-content .bg-slate-100 { background: #000000 !important; }
        html.dark .dpo-modal-content .border-slate-100 { border-color: rgba(255,255,255,.08) !important; }
        html.dark .dpo-modal-content .border-slate-200 { border-color: rgba(255,255,255,.08) !important; }
        html.dark .dpo-modal-content .text-slate-700 { color: #f5f5f7 !important; }
        html.dark .dpo-modal-content .text-slate-600 { color: #8e8e93 !important; }
        html.dark .dpo-modal-content .text-slate-500 { color: #71717a !important; }
        html.dark .dpo-modal-content .text-slate-400 { color: rgba(255,255,255,.08) !important; }
        html.dark .dpo-modal-content .text-slate-300 { color: rgba(255,255,255,.08) !important; }
        html.dark .dpo-modal-content .hover\\:bg-slate-50:hover { background: rgba(30,41,59,0.8) !important; }
        html.dark .dpo-modal-content .hover\\:bg-indigo-50:hover { background: rgba(55,48,163,0.2) !important; }
        html.dark .dpo-modal-content input { background: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
        html.dark .dpo-modal-content input::placeholder { color: rgba(255,255,255,.08) !important; }
        html.dark .dpo-modal-content input:focus { border-color: #6366f1 !important; }
        html.dark .dpo-modal-content .border-b { border-color: rgba(255,255,255,.08) !important; }
        html.dark .dpo-modal-content .border-t { border-color: rgba(255,255,255,.08) !important; }
        html.dark .dpo-modal-content .scrollbar-thumb-slate-200 { scrollbar-color: rgba(255,255,255,.08) transparent !important; }
        html.dark .dpo-modal-content .shadow-\\[0_-4px_6px_-1px_rgba\\(0\\,0\\,0\\,0\\.02\\)\\] { box-shadow: 0 -4px 6px -1px rgba(0,0,0,0.4) !important; }
      `}</style>

      <div className="dpo-page h-screen flex flex-col bg-slate-50 font-sans overflow-hidden">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 border-b border-slate-700 px-2 py-1 flex items-center justify-between z-20 shadow-lg shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="bg-white/10 p-1 rounded-lg text-white backdrop-blur-sm">
              <Settings size={12} />
            </div>
            <div>
              <h1 className="fz-small font-black text-white tracking-tight leading-none uppercase">Demand Print Matrix</h1>
              <div className="flex items-center gap-1 mt-0.5 fz-micro font-bold text-slate-300 tracking-widest uppercase leading-none">
                <Database size={7} className="text-indigo-300" /> Administrative Logic Terminal
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Search */}
            <div className="relative group">
              <Search size={9} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              <input
                type="text"
                placeholder="Search matrix..."
                className="dpo-search-input h-6 pl-7 pr-2 bg-white/10 border border-white/10 rounded-lg fz-mini font-bold text-white placeholder-white/30 w-32 focus:w-40 focus:bg-white/20 transition-all outline-none"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            {/* Refresh */}
            <button onClick={refresh} disabled={loading}
              className="h-5 w-5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 rounded transition-all disabled:opacity-40">
              <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
            </button>
            {/* Add */}
            <button onClick={handleAddRow} disabled={saving}
              className="h-5 px-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg fz-micro font-black transition-all flex items-center gap-1 active:scale-95 uppercase tracking-widest">
              <Plus size={10} /> Add
            </button>
            {/* Close */}
            <button onClick={closeWindow}
              className="w-5 h-5 flex items-center justify-center text-white/40 hover:text-white hover:bg-red-500/80 rounded transition-all">
              <X size={11} />
            </button>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="dpo-table-wrap flex-1 overflow-auto bg-white">
          <table className="w-full border-separate border-spacing-0 min-w-[900px]">
            <thead className="sticky top-0 z-10">
              <tr>
                {[
                  { label: 'Head Code',        icon: <Hash size={9} /> },
                  { label: 'Head Type',        icon: <ArrowRightLeft size={9} /> },
                  { label: 'Description',      icon: <FileText size={9} /> },
                  { label: 'Intt Type',        icon: <Hash size={9} /> },
                  { label: 'Registry Column',  icon: <Database size={9} /> },
                  { label: 'Order',            icon: <Settings size={9} /> },
                  { label: 'Commands',         icon: <ShieldCheck size={9} /> },
                ].map((th, i) => (
                  <th key={i} className="bg-slate-900 px-2 py-1 text-left border-b border-white/5 first:rounded-tl-lg last:rounded-tr-lg">
                    <div className="flex items-center gap-1 fz-micro font-black text-slate-400 uppercase tracking-widest">
                      <span className="text-indigo-400">{th.icon}</span> {th.label}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="dpo-tbody bg-white">

              {/* Loading skeleton */}
              {loading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={`sk-${i}`} className="dpo-row">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="dpo-cell px-2 py-2 border-b border-slate-50">
                      <div className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${60 + (j * 15) % 40}%` }} />
                    </td>
                  ))}
                </tr>
              ))}

              {/* Empty state */}
              {!loading && filteredRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <AlertCircle size={28} className="text-slate-400" />
                      <p className="dpo-loading fz-small font-black text-slate-500 uppercase tracking-widest">
                        {searchTerm ? 'No matching rows' : 'No rows configured'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              <AnimatePresence>
                {!loading && filteredRows.map((row, index) => (
                  <motion.tr
                    key={index}
                    initial={{ opacity: 0, scale: 0.99 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.1 }}
                    className={`dpo-row group transition-all ${editingRow === index ? 'editing bg-slate-50' : 'hover:bg-slate-50/50'}`}
                  >
                    {editingRow === index ? (
                      <>
                        {/* Head Code + lookup */}
                        <td className="dpo-cell px-2 py-1 border-b border-slate-100">
                          <div className="flex gap-1 items-center">
                            <input className={editInputCls} value={editedData.headCode}
                              onChange={e => handleInputChange('headCode', e.target.value)} />
                            <button onClick={() => setShowHeadLookup(true)} title="List of Heads"
                              className="px-1.5 h-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg fz-micro font-black uppercase tracking-widest transition-all flex items-center gap-0.5 shrink-0">
                              <List size={9} />
                            </button>
                          </div>
                        </td>
                        <td className="dpo-cell px-2 py-1 border-b border-slate-100">
                          <input className={editInputCls} value={editedData.headType}
                            onChange={e => handleInputChange('headType', e.target.value)} />
                        </td>
                        <td className="dpo-cell px-2 py-1 border-b border-slate-100">
                          <input className={editInputCls} value={editedData.description}
                            onChange={e => handleInputChange('description', e.target.value)} />
                        </td>
                        <td className="dpo-cell px-2 py-1 border-b border-slate-100">
                          <input className={editInputCls} value={editedData.inttType}
                            onChange={e => handleInputChange('inttType', e.target.value)} />
                        </td>
                        {/* Registry Column + MD lookup */}
                        <td className="dpo-cell px-2 py-1 border-b border-slate-100">
                          <div className="flex gap-1 items-center">
                            <input className={`${editInputCls} fz-tiny`} value={editedData.mapColName}
                              onChange={e => handleInputChange('mapColName', e.target.value)} />
                            <button onClick={() => setShowMDAmountModal(true)} title="MD Column Registry"
                              className="px-1.5 h-6 bg-slate-700 hover:bg-slate-600 text-white rounded-lg fz-micro font-black uppercase tracking-widest transition-all shrink-0">
                              MD
                            </button>
                          </div>
                        </td>
                        <td className="dpo-cell px-2 py-1 border-b border-slate-100">
                          <input type="number"
                            className="dpo-edit-input w-14 h-6 bg-white border-2 border-slate-200 rounded-lg px-2 fz-body font-black text-slate-700 focus:border-indigo-400 outline-none"
                            value={editedData.printOrder}
                            onChange={e => handleInputChange('printOrder', parseInt(e.target.value) || 1)} />
                        </td>
                        <td className="dpo-cell px-2 py-1 border-b border-slate-100">
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleSave(index)} disabled={saving}
                              className="h-5 px-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg fz-micro font-black flex items-center gap-1 transition-all">
                              {saving
                                ? <div className="w-2 h-2 border border-white border-t-transparent rounded-full animate-spin" />
                                : <Save size={9} />}
                              Save
                            </button>
                            <button onClick={handleCancel} title="Cancel (Esc)"
                              className="h-5 w-5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg flex items-center justify-center transition-all">
                              <X size={9} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="dpo-cell dpo-cell-code px-2 py-1.5 border-b border-slate-50 font-mono fz-body font-black text-slate-800 tracking-tighter">{row.headCode}</td>
                        <td className="dpo-cell px-2 py-1.5 border-b border-slate-50">
                          <span className="dpo-badge px-1.5 py-0.5 rounded-full fz-micro font-black uppercase tracking-widest bg-slate-50 text-slate-400 border-2 border-slate-100">
                            {row.headType || 'STD'}
                          </span>
                        </td>
                        <td className="dpo-cell dpo-cell-desc px-2 py-1.5 border-b border-slate-50 fz-body font-bold text-slate-600">{row.description}</td>
                        <td className="dpo-cell dpo-cell-intt px-2 py-1.5 border-b border-slate-50 fz-mini font-black text-slate-300 uppercase">{row.inttType || '—'}</td>
                        <td className="dpo-cell px-2 py-1.5 border-b border-slate-50">
                          <span className="dpo-mapcol-badge font-mono fz-mini font-black text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded-lg border-2 border-slate-200">{row.mapColName}</span>
                        </td>
                        <td className="dpo-cell px-2 py-1.5 border-b border-slate-50">
                          <div className="dpo-order-num w-6 h-6 mx-auto flex items-center justify-center bg-slate-100 text-slate-500 rounded-lg fz-tiny font-black group-hover:bg-slate-700 group-hover:text-white transition-all shadow-inner">
                            {row.printOrder}
                          </div>
                        </td>
                        <td className="dpo-cell px-2 py-1.5 border-b border-slate-50">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEdit(index)}
                              className="h-5 px-2 bg-white border-2 border-slate-200 hover:border-indigo-600 hover:bg-indigo-600 hover:text-white text-slate-400 rounded-lg fz-micro font-black flex items-center gap-1 transition-all">
                              <Edit3 size={9} /> Edit
                            </button>
                            <button onClick={() => handleDeleteRow(index)}
                              className="w-5 h-5 bg-white border-2 border-slate-200 hover:border-rose-500 hover:bg-rose-500 hover:text-white text-slate-400 rounded-lg flex items-center justify-center transition-all">
                              <Trash2 size={9} />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* ── Footer ── */}
        <div className="dpo-footer px-2 py-1 bg-white border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            <Building2 size={9} className="text-slate-300" />
            <span className="dpo-footer-left fz-micro font-black text-slate-800 uppercase tracking-tight">Trust Ledger Matrix Control</span>
            <div className="w-px h-3 bg-slate-200" />
            <span className="dpo-footer-left fz-micro font-bold text-slate-400 uppercase tracking-wider">{filteredRows.length} row{filteredRows.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-600">
            <ShieldCheck size={9} />
            <span className="dpo-footer-right fz-micro font-black uppercase tracking-widest">Protocol v2.9.2</span>
          </div>
        </div>

        {/* ── MD Column Registry Modal ── */}
        <AnimatePresence>
          {showMDAmountModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-2">
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowMDAmountModal(false)}
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative w-full max-w-[360px] rounded-xl shadow-2xl overflow-hidden"
              >
                <div className="bg-slate-900 px-2 py-1 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="bg-white/10 p-1 rounded-lg text-indigo-400 border border-white/10">
                      <Database size={10} />
                    </div>
                    <h2 className="fz-tiny font-black text-white uppercase tracking-widest">MD Column Registry</h2>
                  </div>
                  <button onClick={() => setShowMDAmountModal(false)}
                    className="w-6 h-6 rounded-lg bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 text-white flex items-center justify-center transition-all border border-white/5">
                    <X size={12} />
                  </button>
                </div>
                <div className="dpo-modal-content h-[380px] overflow-hidden">
                  <MDAmountDetails
                    onSelect={colName => { handleInputChange('mapColName', colName); setShowMDAmountModal(false); }}
                  />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── Head Master Lookup Modal ── */}
        <AnimatePresence>
          {showHeadLookup && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-2">
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowHeadLookup(false)}
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative w-full max-w-[560px] rounded-xl shadow-2xl overflow-hidden"
              >
                <div className="bg-slate-900 px-2 py-1 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="bg-white/10 p-1 rounded-lg text-indigo-400 border border-white/10">
                      <List size={10} />
                    </div>
                    <h2 className="fz-tiny font-black text-white uppercase tracking-widest">List of Heads</h2>
                  </div>
                  <button onClick={() => setShowHeadLookup(false)}
                    className="w-6 h-6 rounded-lg bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 text-white flex items-center justify-center transition-all border border-white/5">
                    <X size={12} />
                  </button>
                </div>
                <div className="dpo-modal-content h-[420px] overflow-hidden">
                  <HeadMasterLookup
                    onSelect={code => { handleInputChange('headCode', code); setShowHeadLookup(false); }}
                  />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </ConfigProvider>
  );
};

export default DemandPrintOrder;
