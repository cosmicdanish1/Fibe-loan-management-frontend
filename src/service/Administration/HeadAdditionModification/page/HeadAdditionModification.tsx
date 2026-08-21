import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TreePine, Search, RotateCcw, Plus, Pencil, Trash2, Loader2,
  ChevronDown, ChevronRight,
} from 'lucide-react';
import { ConfigProvider, message, Modal, Popconfirm } from 'antd';
import apiService from '../../../../services/api';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FlatEntry {
  code: string;
  parentCode: string;
  headName: string;
  headType: string;
  interest: string;
  pflag: string;
  hposition: string | null;
  opBal: string | number;
  opening: string | number;
  debit: string | number;
  credit: string | number;
  balance: string | number;
}

interface FormState {
  code: string;
  parentCode: string;
  headName: string;
  headType: string;
  interest: string;
  pflag: string;
  hposition: string;
  opBal: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BLANK_FORM: FormState = {
  code: '', parentCode: '', headName: '', headType: '',
  interest: 'N', pflag: '', hposition: '', opBal: '0',
};

// Section roots in display order (matches legacy: L → A → I → E)
const SECTION_ROOTS = ['L1000', 'A1000', 'I1000', 'E1000'];

function hpos(h: string | null | undefined): number | null {
  if (!h || h === '' || h === '0') return null;
  const p = parseInt(h, 10);
  return isNaN(p) ? null : p;
}

function sortEntries(entries: FlatEntry[]): FlatEntry[] {
  return [...entries].sort((a, b) => {
    const ap = hpos(a.hposition), bp = hpos(b.hposition);
    if (ap === null && bp === null) return a.code.localeCompare(b.code);
    if (ap === null) return -1;
    if (bp === null) return 1;
    return ap - bp;
  });
}

const fmt = (v: string | number): string => {
  const n = Number(v);
  if (n === 0) return '';
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ─── Component ────────────────────────────────────────────────────────────────

const SOCIETY_NAME    = 'Espat Karmchari Co-Operative Credit Society Limited.';
const SOCIETY_ADDRESS = 'Avenue A, Sahakari Sadan, Sector-6, AT Post:Bhilai Nagar, Dist:DURG-490006';

const HeadAdditionModification: React.FC = () => {
  const [flatData,   setFlatData]   = useState<FlatEntry[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [search,     setSearch]     = useState('');
  const [selected,        setSelected]        = useState<Set<string>>(new Set());
  const [deleting,        setDeleting]        = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(SECTION_ROOTS)  // all open by default
  );

  const toggleSection = (code: string) =>
    setExpandedSections(prev => {
      const n = new Set(prev);
      n.has(code) ? n.delete(code) : n.add(code);
      return n;
    });

  // Form
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [saving,   setSaving]   = useState(false);
  const [formData, setFormData] = useState<FormState>(BLANK_FORM);

  const setField = (k: keyof FormState, v: string) =>
    setFormData(p => ({ ...p, [k]: v }));

  // ─── Load ───────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.getHeadMaster();
      if (res.success && Array.isArray(res.data)) {
        setFlatData(res.data as FlatEntry[]);
      } else {
        setFlatData([]);
        message.error('No data — click Build Tree to calculate balances');
      }
    } catch {
      message.error('Failed to load account heads');
      setFlatData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ─── Build Tree ─────────────────────────────────────────────────────────────

  const handleBuildTree = useCallback(async () => {
    setRebuilding(true);
    try {
      const res = await apiService.rebuildBalancesheet();
      if (res.success) {
        message.success(`Built — ${res.data?.leafCount ?? 0} accounts recalculated from ledger`);
        await load();
      } else {
        message.warning('Build Tree returned no data');
      }
    } catch {
      message.error('Build Tree failed — check backend logs');
    } finally {
      setRebuilding(false);
    }
  }, [load]);

  // ─── Form helpers ────────────────────────────────────────────────────────────

  const openAdd = useCallback((parentCode = '') => {
    setFormData({ ...BLANK_FORM, parentCode });
    setFormMode('add');
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((e: FlatEntry) => {
    setFormData({
      code:      e.code,
      parentCode: e.parentCode,
      headName:  e.headName,
      headType:  e.headType  || '',
      interest:  e.interest  || 'N',
      pflag:     e.pflag     || '',
      hposition: e.hposition || '',
      opBal:     String(e.opBal || 0),
    });
    setFormMode('edit');
    setFormOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!formData.code.trim())       { message.error('Code is required');        return; }
    if (!formData.parentCode.trim()) { message.error('Parent code is required'); return; }
    if (!formData.headName.trim())   { message.error('Head name is required');   return; }
    if (!formData.pflag.trim())      { message.error('P Flag is required');      return; }
    setSaving(true);
    try {
      const res = await apiService.saveHeadMaster({
        code:       formData.code.trim().toUpperCase(),
        parentCode: formData.parentCode.trim().toUpperCase(),
        headName:   formData.headName.trim(),
        headType:   formData.headType || null,
        interest:   formData.interest,
        pflag:      formData.pflag,
        hposition:  formData.hposition ? parseInt(formData.hposition, 10) : null,
        opBal:      parseFloat(formData.opBal) || 0,
      });
      if (res.success) {
        message.success(
          `${formData.code.toUpperCase()} ${formMode === 'add' ? 'added' : 'updated'} successfully`
        );
        setFormOpen(false);
        await load();
      } else {
        message.error((res as any).error || 'Save failed');
      }
    } catch {
      message.error('Save failed');
    } finally {
      setSaving(false);
    }
  }, [formData, formMode, load]);

  // ─── Delete ──────────────────────────────────────────────────────────────────

  const handleDelete = useCallback(async (code: string) => {
    setDeleting(code);
    try {
      const res = await apiService.deleteHeadMaster(code);
      if (res.success) {
        message.success(`${code} deleted`);
        setSelected(prev => { const n = new Set(prev); n.delete(code); return n; });
        await load();
      } else {
        message.error((res as any).error || 'Delete failed');
      }
    } catch (e: any) {
      message.error(e?.message || 'Delete failed');
    } finally {
      setDeleting(null);
    }
  }, [load]);

  const handleDeleteSelected = useCallback(async () => {
    const codes = [...selected];
    for (const code of codes) {
      await handleDelete(code);
    }
    setSelected(new Set());
  }, [selected, handleDelete]);

  // ─── Display rows: section header + sorted children ─────────────────────────

  const displayRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    type Row = { entry: FlatEntry; isSection: boolean };
    const rows: Row[] = [];

    for (const rootCode of SECTION_ROOTS) {
      const sectionEntry = flatData.find(e => e.code === rootCode);
      if (!sectionEntry) continue;

      // All entries in this section (same prefix, not the root itself)
      const prefix = rootCode.charAt(0);
      let children = flatData.filter(
        e => e.code !== rootCode && e.code.startsWith(prefix)
      );

      if (term) {
        children = children.filter(
          e =>
            e.code.toLowerCase().includes(term) ||
            e.headName.toLowerCase().includes(term)
        );
      }

      children = sortEntries(children);

      // Show section header even when searching (if any children match)
      if (!term || children.length > 0) {
        rows.push({ entry: sectionEntry, isSection: true });
      }
      // Only show children if section is expanded (or we're searching)
      if (term || expandedSections.has(rootCode)) {
        children.forEach(e => rows.push({ entry: e, isSection: false }));
      }
    }

    return rows;
  }, [flatData, search, expandedSections]);

  // Per-section totals — computed from ALL leaf accounts in that section
  const sectionTotals = useMemo(() => {
    const acc: Record<string, { opening: number; debit: number; credit: number; balance: number }> = {};
    for (const rootCode of SECTION_ROOTS) {
      const prefix = rootCode.charAt(0);
      const leaves = flatData.filter(e => e.code !== rootCode && e.code.startsWith(prefix));
      acc[rootCode] = leaves.reduce(
        (sum, e) => ({
          opening: sum.opening + Number(e.opening),
          debit:   sum.debit   + Number(e.debit),
          credit:  sum.credit  + Number(e.credit),
          balance: sum.balance + Number(e.balance),
        }),
        { opening: 0, debit: 0, credit: 0, balance: 0 }
      );
    }
    return acc;
  }, [flatData]);

  // Grand totals — always sum ALL leaf accounts regardless of collapse state
  const grandTotals = useMemo(() => {
    return flatData
      .filter(e => !SECTION_ROOTS.includes(e.code) && e.code !== 'M1000')
      .reduce(
        (acc, e) => ({
          opening: acc.opening + Number(e.opening),
          debit:   acc.debit   + Number(e.debit),
          credit:  acc.credit  + Number(e.credit),
          balance: acc.balance + Number(e.balance),
        }),
        { opening: 0, debit: 0, credit: 0, balance: 0 }
      );
  }, [flatData]);

  // ─── Checkbox helpers ────────────────────────────────────────────────────────

  const leafCodes = useMemo(
    () => displayRows.filter(r => !r.isSection).map(r => r.entry.code),
    [displayRows]
  );

  const allChecked = leafCodes.length > 0 && leafCodes.every(c => selected.has(c));

  const toggleAll = () => {
    if (allChecked) {
      setSelected(new Set());
    } else {
      setSelected(new Set(leafCodes));
    }
  };

  const toggleOne = (code: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(code) ? n.delete(code) : n.add(code);
      return n;
    });
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  // The Save action here belongs to the Add/Edit modal, not the page itself —
  // only expose it to the global toolbar while that modal is actually open,
  // mirroring its own okButtonProps.disabled = saving.
  usePageToolbarActions({
    onSave: handleSave,
    saveLabel: saving ? 'Saving…' : formMode === 'add' ? 'Add Head' : 'Save Changes',
    saveEnabled: formOpen && !saving,
  });

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#7c3aed' } }}>
      <style>{`
        .hm-row { cursor: pointer; }
        .hm-row:hover { background: #f5f3ff !important; }
        .hm-row:hover td,
        .hm-row:hover td span,
        .hm-row:hover td .hm-code,
        .hm-row:hover td .hm-name { color: #4c1d95 !important; }
        .hm-scrollbar::-webkit-scrollbar { width: 6px; }
        .hm-scrollbar::-webkit-scrollbar-thumb { background: #7c3aed; border-radius: 3px; }
        html.dark .hm-row:hover { background: #2e1065 !important; }
        html.dark .hm-row:hover td,
        html.dark .hm-row:hover td span,
        html.dark .hm-row:hover td .hm-code,
        html.dark .hm-row:hover td .hm-name { color: #e9d5ff !important; }
      `}</style>

      <div className="flex flex-col h-full bg-white">

        {/* ── Toolbar ── */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border-b border-slate-300 flex-shrink-0">
          <button
            onClick={handleBuildTree}
            disabled={rebuilding || loading}
            className="h-8 px-4 bg-purple-700 hover:bg-purple-600 text-white rounded text-xs font-black flex items-center gap-2 disabled:opacity-50 transition-all uppercase tracking-wide shadow"
          >
            <TreePine size={13} className={rebuilding ? 'animate-pulse' : ''} />
            {rebuilding ? 'Building…' : 'Build Tree'}
          </button>

          <div className="w-px h-6 bg-slate-300" />

          <button
            onClick={() => openAdd()}
            disabled={loading}
            className="h-8 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-black flex items-center gap-2 transition-all uppercase tracking-wide shadow"
          >
            <Plus size={13} /> Add Head
          </button>

          {selected.size > 0 && (
            <Popconfirm
              title={<span className="text-sm">Delete {selected.size} selected account{selected.size > 1 ? 's' : ''}?</span>}
              description={<span className="text-xs text-slate-500">Parent accounts (with children) will be blocked.</span>}
              onConfirm={handleDeleteSelected}
              okText="Delete All"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
              cancelButtonProps={{}}
            >
              <button className="h-8 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-black flex items-center gap-2 transition-all uppercase tracking-wide shadow">
                <Trash2 size={13} /> Delete ({selected.size})
              </button>
            </Popconfirm>
          )}

          <div className="flex-1" />

          {/* Search */}
          <div className="relative">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search code / name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 bg-white border border-slate-300 rounded pl-7 pr-6 text-xs font-mono outline-none focus:border-purple-400 w-44"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-black text-sm leading-none"
              >×</button>
            )}
          </div>

          <button
            onClick={load}
            disabled={loading}
            title="Refresh"
            className="h-8 w-8 flex items-center justify-center hover:bg-slate-200 rounded text-slate-500 transition-all disabled:opacity-50"
          >
            <RotateCcw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* ── Society Header ── */}
        <div className="text-center py-2.5 px-4 border-b border-slate-200 bg-white flex-shrink-0">
          <p className="text-sm font-black text-purple-800 leading-tight">
            {SOCIETY_NAME}
          </p>
          <p className="text-xs text-slate-600 mt-0.5">
            {SOCIETY_ADDRESS}
          </p>
        </div>

        {/* ── Table ── */}
        <div className="flex-1 overflow-auto hm-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <Loader2 size={32} className="text-purple-400 animate-spin" />
              <p className="text-xs text-slate-300 font-black uppercase tracking-wider">Loading…</p>
            </div>
          ) : (
            <table className="w-full border-collapse min-w-[580px]">
              <thead className="sticky top-0 z-10">
                <tr className="hm-thead bg-purple-900 border-b-2 border-purple-700">
                  <th className="px-2 py-2 w-8">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={toggleAll}
                      className="cursor-pointer accent-purple-400 w-3.5 h-3.5"
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-black text-white uppercase tracking-wider">
                    Code — Head Name
                    {flatData.length > 0 && (
                      <span className="ml-2 text-purple-300 font-black normal-case fz-small">
                        {flatData.length} heads
                      </span>
                    )}
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-black text-white uppercase tracking-wider w-32 border-l border-purple-700">Opening</th>
                  <th className="px-3 py-2 text-right text-xs font-black text-rose-200 uppercase tracking-wider w-32 border-l border-purple-700">Debit</th>
                  <th className="px-3 py-2 text-right text-xs font-black text-emerald-200 uppercase tracking-wider w-32 border-l border-purple-700">Credit</th>
                  <th className="px-3 py-2 text-right text-xs font-black text-amber-200 uppercase tracking-wider w-32 border-l border-purple-700">Balance</th>
                  <th className="px-2 py-2 w-16 border-l border-purple-700" />
                </tr>
              </thead>

              <tbody>
                {displayRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-sm text-slate-400 font-black uppercase tracking-wider">
                      {search ? 'No matching accounts' : 'No data — click Build Tree to calculate balances'}
                    </td>
                  </tr>
                )}

                {displayRows.map(({ entry: e, isSection }) => {
                  const isDeleting = deleting === e.code;
                  const isSel      = selected.has(e.code);
                  const prefix     = e.code.charAt(0);

                  // Per-section accent colors
                  const sectionAccent =
                    prefix === 'L' ? { bg: '#4c1d95', text: '#e9d5ff', border: '#7c3aed' } :
                    prefix === 'A' ? { bg: '#064e3b', text: '#a7f3d0', border: '#059669' } :
                    prefix === 'I' ? { bg: '#78350f', text: '#fde68a', border: '#d97706' } :
                    prefix === 'E' ? { bg: '#7f1d1d', text: '#fecaca', border: '#dc2626' } :
                                     { bg: '#1e293b', text: '#e2e8f0', border: '#475569' };

                  const codeColor =
                    prefix === 'L' ? '#7c3aed' :
                    prefix === 'A' ? '#059669' :
                    prefix === 'I' ? '#d97706' :
                    prefix === 'E' ? '#dc2626' : '#64748b';

                  if (isSection) {
                    return (
                      <tr
                        key={e.code}
                        className="border-t border-b"
                        style={{
                          backgroundColor: sectionAccent.bg,
                          borderColor: sectionAccent.border,
                        }}
                      >
                        <td className="px-2 py-1.5 text-center">
                          <button
                            onClick={() => toggleSection(e.code)}
                            className="p-0.5 rounded transition-colors"
                            style={{ color: sectionAccent.text }}
                            title={expandedSections.has(e.code) ? 'Collapse' : 'Expand'}
                          >
                            {expandedSections.has(e.code)
                              ? <ChevronDown size={14} />
                              : <ChevronRight size={14} />}
                          </button>
                        </td>
                        <td
                          className="px-3 py-1.5 cursor-pointer select-none"
                          onClick={() => toggleSection(e.code)}
                        >
                          <span className="text-sm font-black uppercase tracking-wide" style={{ color: sectionAccent.text }}>
                            {e.code} — {e.headName.toUpperCase()}
                          </span>
                        </td>
                        {(() => {
                          const st = sectionTotals[e.code] ?? { opening: 0, debit: 0, credit: 0, balance: 0 };
                          return (
                            <>
                              <td className="px-3 py-1.5 text-right text-xs font-black font-mono border-l" style={{ color: sectionAccent.text, borderColor: sectionAccent.border }}>
                                {st.opening !== 0 ? fmt(st.opening) : ''}
                              </td>
                              <td className="px-3 py-1.5 text-right text-xs font-black font-mono border-l" style={{ color: sectionAccent.text, borderColor: sectionAccent.border }}>
                                {st.debit !== 0 ? fmt(st.debit) : ''}
                              </td>
                              <td className="px-3 py-1.5 text-right text-xs font-black font-mono border-l" style={{ color: sectionAccent.text, borderColor: sectionAccent.border }}>
                                {st.credit !== 0 ? fmt(st.credit) : ''}
                              </td>
                              <td className="px-3 py-1.5 text-right text-xs font-black font-mono border-l" style={{ color: sectionAccent.text, borderColor: sectionAccent.border }}>
                                {st.balance !== 0 ? fmt(Math.abs(st.balance)) : ''}
                              </td>
                            </>
                          );
                        })()}
                        <td className="px-2 py-1.5 text-center border-l" style={{ borderColor: sectionAccent.border }}>
                          <button
                            title="Add child head"
                            onClick={() => openAdd(e.code)}
                            className="p-1 rounded transition-colors"
                            style={{ color: sectionAccent.text }}
                          >
                            <Plus size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={e.code}
                      className="hm-row border-b border-slate-200"
                      style={{ backgroundColor: isSel ? '#f3e8ff' : undefined }}
                      onDoubleClick={() => openEdit(e)}
                    >
                      <td className="px-2 py-1 text-center">
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => toggleOne(e.code)}
                          className="cursor-pointer accent-purple-400 w-3.5 h-3.5"
                          onClick={ev => ev.stopPropagation()}
                        />
                      </td>
                      <td className="px-3 py-1 pl-8">
                        <span className="hm-code text-xs font-black font-mono mr-2" style={{ color: codeColor }}>
                          {e.code}
                        </span>
                        <span className="text-slate-400 mr-2 text-xs">—</span>
                        <span className="hm-name text-xs font-semibold text-slate-700">
                          {e.headName}
                        </span>
                      </td>
                      <td className="px-3 py-1 text-right text-xs font-mono text-slate-600 border-l border-slate-200">
                        {fmt(e.opening)}
                      </td>
                      <td className="px-3 py-1 text-right text-xs font-mono text-rose-600 border-l border-slate-200">
                        {fmt(e.debit)}
                      </td>
                      <td className="px-3 py-1 text-right text-xs font-mono text-emerald-600 border-l border-slate-200">
                        {fmt(e.credit)}
                      </td>
                      <td className="px-3 py-1 text-right text-xs font-mono text-amber-600 border-l border-slate-200">
                        {fmt(e.balance)}
                      </td>
                      <td className="px-2 py-1 border-l border-slate-200">
                        <div className="flex items-center gap-1 justify-center">
                          <button
                            title="Edit"
                            onClick={() => openEdit(e)}
                            className="p-1 rounded hover:bg-indigo-100 text-indigo-500 hover:text-indigo-700 transition-colors"
                          >
                            <Pencil size={11} />
                          </button>
                          <Popconfirm
                            title={<span className="text-sm">Delete <strong>{e.code}</strong>?</span>}
                            description={<span className="text-xs text-slate-500">Blocked if it has child accounts.</span>}
                            onConfirm={() => handleDelete(e.code)}
                            okText="Delete"
                            cancelText="Cancel"
                            okButtonProps={{ danger: true }}
                          >
                            <button
                              title="Delete"
                              disabled={isDeleting}
                              className="p-1 rounded hover:bg-rose-100 text-rose-500 hover:text-rose-700 transition-colors disabled:opacity-40"
                            >
                              {isDeleting
                                ? <Loader2 size={11} className="animate-spin" />
                                : <Trash2 size={11} />}
                            </button>
                          </Popconfirm>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot className="sticky bottom-0 z-10">
                <tr className="hm-tfoot" style={{ backgroundColor: '#581c87', borderTop: '2px solid #7c3aed' }}>
                  <th className="px-2 py-2" />
                  <th className="px-3 py-2 text-left text-xs font-black text-white uppercase tracking-widest">
                    Grand Total
                    <span className="ml-2 fz-small text-purple-300 font-normal normal-case">
                      {flatData.filter(e => !SECTION_ROOTS.includes(e.code) && e.code !== 'M1000').length} accounts
                    </span>
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-black font-mono text-white border-l border-purple-700">
                    {grandTotals.opening !== 0 ? fmt(grandTotals.opening) : '—'}
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-black font-mono text-rose-200 border-l border-purple-700">
                    {grandTotals.debit !== 0 ? fmt(grandTotals.debit) : '—'}
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-black font-mono text-emerald-200 border-l border-purple-700">
                    {grandTotals.credit !== 0 ? fmt(grandTotals.credit) : '—'}
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-black font-mono border-l border-purple-700"
                      style={{ color: grandTotals.balance < 0 ? '#fecaca' : '#fde68a' }}>
                    {grandTotals.balance !== 0 ? fmt(Math.abs(grandTotals.balance)) : '—'}
                  </th>
                  <th className="px-2 py-2 border-l border-purple-700" />
                </tr>
              </tfoot>
            </table>
          )}
        </div>

      </div>

      {/* ── Add / Edit Modal ── */}
      <Modal
        open={formOpen}
        onCancel={() => setFormOpen(false)}
        onOk={handleSave}
        okText={saving ? 'Saving…' : formMode === 'add' ? 'Add Head' : 'Save Changes'}
        okButtonProps={{ disabled: saving, style: { background: '#7c3aed', borderColor: '#7c3aed' } }}
        cancelButtonProps={{ disabled: saving }}
        title={
          <div className="flex items-center gap-2 fz-caption font-black text-slate-800 uppercase tracking-wider">
            {formMode === 'add' ? <Plus size={12} className="text-emerald-600" /> : <Pencil size={12} className="text-indigo-600" />}
            {formMode === 'add' ? 'Add New Account Head' : `Edit — ${formData.code}`}
          </div>
        }
        width={420}
        destroyOnClose
      >
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-2">

          <div className="flex flex-col gap-0.5">
            <label className="fz-tiny font-black text-slate-500 uppercase tracking-wider">Code *</label>
            <input
              value={formData.code}
              onChange={e => setField('code', e.target.value)}
              readOnly={formMode === 'edit'}
              placeholder="e.g. L1005"
              className={`h-7 px-2 fz-small font-mono border rounded outline-none transition-colors
                ${formMode === 'edit'
                  ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                  : 'border-slate-300 focus:border-purple-400 bg-white'}`}
            />
          </div>

          <div className="flex flex-col gap-0.5">
            <label className="fz-tiny font-black text-slate-500 uppercase tracking-wider">Parent Code *</label>
            <select
              value={formData.parentCode}
              onChange={e => setField('parentCode', e.target.value)}
              className="h-7 px-2 fz-small font-mono border border-slate-300 rounded outline-none focus:border-purple-400 bg-white"
            >
              <option value="">— select —</option>
              {[...flatData]
                .filter(f => f.code !== formData.code)
                .sort((a, b) => a.code.localeCompare(b.code))
                .map(f => (
                  <option key={f.code} value={f.code}>
                    {f.code} — {f.headName}
                  </option>
                ))}
            </select>
          </div>

          <div className="col-span-2 flex flex-col gap-0.5">
            <label className="fz-tiny font-black text-slate-500 uppercase tracking-wider">Head Name *</label>
            <input
              value={formData.headName}
              onChange={e => setField('headName', e.target.value)}
              placeholder="e.g. Share Capital"
              className="h-7 px-2 fz-small border border-slate-300 rounded outline-none focus:border-purple-400 bg-white"
            />
          </div>

          <div className="flex flex-col gap-0.5">
            <label className="fz-tiny font-black text-slate-500 uppercase tracking-wider">Position (Sort)</label>
            <input
              type="number"
              value={formData.hposition}
              onChange={e => setField('hposition', e.target.value)}
              placeholder="e.g. 1000"
              className="h-7 px-2 fz-small border border-slate-300 rounded outline-none focus:border-purple-400 bg-white"
            />
          </div>

          <div className="flex flex-col gap-0.5">
            <label className="fz-tiny font-black text-slate-500 uppercase tracking-wider">Opening Balance</label>
            <input
              type="number"
              step="0.01"
              value={formData.opBal}
              onChange={e => setField('opBal', e.target.value)}
              className="h-7 px-2 fz-small border border-slate-300 rounded outline-none focus:border-purple-400 bg-white"
            />
          </div>

          <div className="flex flex-col gap-0.5">
            <label className="fz-tiny font-black text-slate-500 uppercase tracking-wider">Interest</label>
            <select
              value={formData.interest}
              onChange={e => setField('interest', e.target.value)}
              className="h-7 px-2 fz-small border border-slate-300 rounded outline-none focus:border-purple-400 bg-white"
            >
              <option value="N">N — None</option>
              <option value="Y">Y — Yes</option>
            </select>
          </div>

          <div className="flex flex-col gap-0.5">
            <label className="fz-tiny font-black text-slate-500 uppercase tracking-wider">P Flag</label>
            <select
              value={formData.pflag}
              onChange={e => setField('pflag', e.target.value)}
              className="h-7 px-2 fz-small border border-slate-300 rounded outline-none focus:border-purple-400 bg-white"
            >
              <option value="">— select —</option>
              <option value="A">A — Asset</option>
              <option value="L">L — Liability</option>
              <option value="I">I — Income</option>
              <option value="E">E — Expenditure</option>
              <option value="R">R — Root (section headers only)</option>
            </select>
          </div>

        </div>

        {formMode === 'add' && (
          <p className="mt-3 fz-mini text-slate-400 leading-relaxed">
            Code prefix must match the parent section:&nbsp;
            <strong>L</strong>iabilities · <strong>A</strong>ssets · <strong>E</strong>xpenditure · <strong>I</strong>ncome.
            After adding, click <strong>Build Tree</strong> to recalculate balances.
          </p>
        )}
      </Modal>

    </ConfigProvider>
  );
};

export default HeadAdditionModification;
