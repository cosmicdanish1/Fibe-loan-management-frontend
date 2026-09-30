import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TreePine, Search, RotateCcw, Plus, Pencil, Trash2,
  ChevronDown, ChevronRight,
} from 'lucide-react';
import { message, Select } from 'antd';
import AwDialog from '@/components/shared/kit/AwDialog';
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

  // Section colour: Liabilities info, Assets success, Income warning, Expenditure danger
  const toneFor = (prefix: string) =>
    prefix === 'L' ? 'var(--aw-info)' :
    prefix === 'A' ? 'var(--aw-success)' :
    prefix === 'I' ? 'var(--aw-warning)' :
    prefix === 'E' ? 'var(--aw-danger)' : 'var(--aw-muted)';

  const leafCount = flatData.filter(e => !SECTION_ROOTS.includes(e.code) && e.code !== 'M1000').length;

  const [confirmCodes, setConfirmCodes] = useState<string[] | null>(null);
  const runConfirmedDelete = async () => {
    const codes = confirmCodes;
    setConfirmCodes(null);
    if (!codes) return;
    if (codes.length === 1 && codes[0]) {
      await handleDelete(codes[0]);
    } else {
      await handleDeleteSelected();
    }
  };

  return (
    <div className="app-window">
      {/* ── Header ── */}
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">Head Addition / Modification</h1>
          <p className="aw-desc">Chart of accounts{flatData.length > 0 ? ` · ${flatData.length} heads` : ''}</p>
        </div>
        <div className="aw-actions">
          {selected.size > 0 && (
            <button type="button" onClick={() => setConfirmCodes([...selected])} className="aw-btn aw-btn-danger aw-fade-in">
              <Trash2 size={13} /> Delete ({selected.size})
            </button>
          )}
          <button type="button" onClick={handleBuildTree} disabled={rebuilding || loading} className="aw-btn aw-btn-secondary">
            <TreePine size={13} className={rebuilding ? 'aw-spin' : ''} />
            {rebuilding ? 'Building…' : 'Build Tree'}
          </button>
          <button type="button" onClick={() => openAdd()} disabled={loading} className="aw-btn aw-btn-primary">
            <Plus size={13} /> Add Head
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="aw-icon-btn"
            aria-label="Refresh"
            data-tip="Refresh"
            data-tip-pos="bottom-end"
          >
            <RotateCcw size={14} className={loading ? 'aw-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="aw-content">
        <section className="aw-card">
          <div style={{ textAlign: 'center' }}>
            <p className="aw-strong" style={{ color: 'var(--aw-accent)' }}>{SOCIETY_NAME}</p>
            <p className="aw-meta">{SOCIETY_ADDRESS}</p>
          </div>

          <div className="aw-input-wrap has-icon" style={{ maxWidth: 320 }}>
            <Search size={13} />
            <input
              type="text"
              placeholder="Search code / name…"
              aria-label="Search heads"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="aw-input"
            />
          </div>

          {loading ? (
            <div className="aw-empty" style={{ padding: 40 }}>
              <RotateCcw size={28} className="aw-spin" />
              <strong className="aw-strong">Loading…</strong>
            </div>
          ) : (
            <div className="aw-table-wrap" style={{ maxHeight: '64vh' }}>
              <table className="aw-table" style={{ minWidth: 700 }}>
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={toggleAll}
                        aria-label="Select all"
                        style={{ width: 15, height: 15, accentColor: 'var(--aw-accent)' }}
                      />
                    </th>
                    <th>Code — Head Name</th>
                    <th className="is-right" style={{ width: 130 }}>Opening</th>
                    <th className="is-right" style={{ width: 130 }}>Debit</th>
                    <th className="is-right" style={{ width: 130 }}>Credit</th>
                    <th className="is-right" style={{ width: 130 }}>Balance</th>
                    <th style={{ width: 84 }} />
                  </tr>
                </thead>

                <tbody>
                  {displayRows.length === 0 && (
                    <tr>
                      <td colSpan={7}>
                        <div className="aw-empty" style={{ padding: 32 }}>
                          <TreePine size={26} />
                          <strong className="aw-strong">{search ? 'No matching accounts' : 'No data'}</strong>
                          {!search && <span className="aw-meta">Click Build Tree to calculate balances</span>}
                        </div>
                      </td>
                    </tr>
                  )}

                  {displayRows.map(({ entry: e, isSection }) => {
                    const isDeleting = deleting === e.code;
                    const isSel = selected.has(e.code);
                    const tone = toneFor(e.code.charAt(0));

                    if (isSection) {
                      const st = sectionTotals[e.code] ?? { opening: 0, debit: 0, credit: 0, balance: 0 };
                      const open = expandedSections.has(e.code);
                      const cellStyle: React.CSSProperties = { background: `color-mix(in srgb, ${tone} 12%, var(--aw-surface))`, color: tone, fontWeight: 700 };
                      return (
                        <tr key={e.code}>
                          <td className="is-center" style={cellStyle}>
                            <button
                              type="button"
                              onClick={() => toggleSection(e.code)}
                              className="aw-icon-btn is-sm"
                              aria-label={open ? 'Collapse' : 'Expand'}
                              aria-expanded={open}
                              style={{ color: 'inherit' }}
                            >
                              {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          </td>
                          <td style={{ ...cellStyle, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.03em' }} onClick={() => toggleSection(e.code)}>
                            {e.code} — {e.headName}
                          </td>
                          <td className="is-right" style={cellStyle}>{st.opening !== 0 ? fmt(st.opening) : ''}</td>
                          <td className="is-right" style={cellStyle}>{st.debit !== 0 ? fmt(st.debit) : ''}</td>
                          <td className="is-right" style={cellStyle}>{st.credit !== 0 ? fmt(st.credit) : ''}</td>
                          <td className="is-right" style={cellStyle}>{st.balance !== 0 ? fmt(Math.abs(st.balance)) : ''}</td>
                          <td className="is-center" style={cellStyle}>
                            <button
                              type="button"
                              onClick={() => openAdd(e.code)}
                              className="aw-icon-btn is-sm"
                              aria-label={`Add child head under ${e.code}`}
                              data-tip="Add child head"
                              data-tip-pos="left"
                              style={{ color: 'inherit' }}
                            >
                              <Plus size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    }

                    const rowBg: React.CSSProperties | undefined = isSel ? { background: 'var(--aw-accent-soft)' } : undefined;
                    return (
                      <tr key={e.code} className="is-clickable" onDoubleClick={() => openEdit(e)}>
                        <td className="is-center" style={rowBg}>
                          <input
                            type="checkbox"
                            checked={isSel}
                            onChange={() => toggleOne(e.code)}
                            onClick={ev => ev.stopPropagation()}
                            aria-label={`Select ${e.code}`}
                            style={{ width: 15, height: 15, accentColor: 'var(--aw-accent)' }}
                          />
                        </td>
                        <td style={{ ...rowBg, paddingLeft: 28 }}>
                          <span style={{ color: tone, fontWeight: 700, marginRight: 8 }}>{e.code}</span>
                          <span className="aw-meta" style={{ marginRight: 8, display: 'inline' }}>—</span>
                          {e.headName}
                        </td>
                        <td className="is-right is-muted" style={rowBg}>{fmt(e.opening)}</td>
                        <td className="is-right is-danger" style={rowBg}>{fmt(e.debit)}</td>
                        <td className="is-right is-success" style={rowBg}>{fmt(e.credit)}</td>
                        <td className="is-right is-warning" style={rowBg}>{fmt(e.balance)}</td>
                        <td className="is-center" style={rowBg}>
                          <span style={{ display: 'inline-flex', gap: 2 }}>
                            <button
                              type="button"
                              onClick={() => openEdit(e)}
                              className="aw-icon-btn is-sm"
                              aria-label={`Edit ${e.code}`}
                              data-tip="Edit"
                              data-tip-pos="left"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmCodes([e.code])}
                              disabled={isDeleting}
                              className="aw-icon-btn is-sm is-danger"
                              aria-label={`Delete ${e.code}`}
                              data-tip="Delete"
                              data-tip-pos="left"
                            >
                              {isDeleting ? <RotateCcw size={14} className="aw-spin" /> : <Trash2 size={14} />}
                            </button>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                <tfoot>
                  <tr>
                    <td />
                    <td>
                      Grand Total <span className="aw-meta" style={{ marginLeft: 6 }}>{leafCount} accounts</span>
                    </td>
                    <td className="is-right">{grandTotals.opening !== 0 ? fmt(grandTotals.opening) : '—'}</td>
                    <td className="is-right is-danger">{grandTotals.debit !== 0 ? fmt(grandTotals.debit) : '—'}</td>
                    <td className="is-right is-success">{grandTotals.credit !== 0 ? fmt(grandTotals.credit) : '—'}</td>
                    <td className={`is-right ${grandTotals.balance < 0 ? 'is-danger' : 'is-warning'}`}>
                      {grandTotals.balance !== 0 ? fmt(Math.abs(grandTotals.balance)) : '—'}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* ── Delete confirmation ── */}
      <AwDialog
        open={confirmCodes !== null}
        title={confirmCodes && confirmCodes.length > 1 ? `Delete ${confirmCodes.length} accounts?` : `Delete ${confirmCodes?.[0] ?? ''}?`}
        icon={<Trash2 size={14} />}
        onClose={() => setConfirmCodes(null)}
        maxWidth="26rem"
        compact
      >
        <div className="aw-stack">
          <p className="aw-meta" style={{ lineHeight: 1.5 }}>
            {confirmCodes && confirmCodes.length > 1
              ? 'Parent accounts (with children) will be blocked.'
              : 'Blocked if it has child accounts.'}
          </p>
          <div className="aw-btn-row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setConfirmCodes(null)} className="aw-btn aw-btn-secondary">Cancel</button>
            <button type="button" onClick={runConfirmedDelete} className="aw-btn aw-btn-danger">
              {confirmCodes && confirmCodes.length > 1 ? 'Delete All' : 'Delete'}
            </button>
          </div>
        </div>
      </AwDialog>

      {/* ── Add / Edit dialog ── */}
      <AwDialog
        open={formOpen}
        onClose={() => { if (!saving) setFormOpen(false); }}
        title={formMode === 'add' ? 'Add New Account Head' : `Edit — ${formData.code}`}
        icon={formMode === 'add' ? <Plus size={14} /> : <Pencil size={14} />}
        maxWidth="30rem"
        compact
      >
        <div className="aw-stack">
          <div className="aw-two">
            <div>
              <label className="aw-label" htmlFor="hm-code">Code *</label>
              <input
                id="hm-code"
                value={formData.code}
                onChange={e => setField('code', e.target.value)}
                readOnly={formMode === 'edit'}
                placeholder="e.g. L1005"
                className="aw-input"
              />
            </div>
            <div>
              <label className="aw-label" htmlFor="hm-parent">Parent Code *</label>
              <Select
                id="hm-parent"
                className="aw-select"
                popupClassName="aw-select-popup"
                showSearch
                optionFilterProp="label"
                value={formData.parentCode || undefined}
                onChange={(v) => setField('parentCode', v ?? '')}
                placeholder="— select —"
                options={[...flatData]
                  .filter(f => f.code !== formData.code)
                  .sort((a, b) => a.code.localeCompare(b.code))
                  .map(f => ({ value: f.code, label: `${f.code} — ${f.headName}` }))}
              />
            </div>
          </div>

          <div>
            <label className="aw-label" htmlFor="hm-name">Head Name *</label>
            <input
              id="hm-name"
              value={formData.headName}
              onChange={e => setField('headName', e.target.value)}
              placeholder="e.g. Share Capital"
              className="aw-input"
            />
          </div>

          <div className="aw-two">
            <div>
              <label className="aw-label" htmlFor="hm-pos">Position (Sort)</label>
              <input
                id="hm-pos"
                type="number"
                value={formData.hposition}
                onChange={e => setField('hposition', e.target.value)}
                placeholder="e.g. 1000"
                className="aw-input"
              />
            </div>
            <div>
              <label className="aw-label" htmlFor="hm-op">Opening Balance</label>
              <input
                id="hm-op"
                type="number"
                step="0.01"
                value={formData.opBal}
                onChange={e => setField('opBal', e.target.value)}
                className="aw-input is-right"
              />
            </div>
          </div>

          <div className="aw-two">
            <div>
              <label className="aw-label" htmlFor="hm-int">Interest</label>
              <Select
                id="hm-int"
                className="aw-select"
                popupClassName="aw-select-popup"
                value={formData.interest}
                onChange={(v) => setField('interest', v)}
                options={[{ value: 'N', label: 'N — None' }, { value: 'Y', label: 'Y — Yes' }]}
              />
            </div>
            <div>
              <label className="aw-label" htmlFor="hm-pflag">P Flag</label>
              <Select
                id="hm-pflag"
                className="aw-select"
                popupClassName="aw-select-popup"
                value={formData.pflag || undefined}
                onChange={(v) => setField('pflag', v ?? '')}
                placeholder="— select —"
                options={[
                  { value: 'A', label: 'A — Asset' },
                  { value: 'L', label: 'L — Liability' },
                  { value: 'I', label: 'I — Income' },
                  { value: 'E', label: 'E — Expenditure' },
                  { value: 'R', label: 'R — Root (section headers only)' },
                ]}
              />
            </div>
          </div>

          {formMode === 'add' && (
            <p className="aw-meta" style={{ lineHeight: 1.5 }}>
              Code prefix must match the parent section: <strong>L</strong>iabilities · <strong>A</strong>ssets · <strong>E</strong>xpenditure · <strong>I</strong>ncome.
              After adding, click <strong>Build Tree</strong> to recalculate balances.
            </p>
          )}

          <div className="aw-btn-row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setFormOpen(false)} disabled={saving} className="aw-btn aw-btn-secondary">Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving} className="aw-btn aw-btn-primary">
              {saving ? 'Saving…' : formMode === 'add' ? 'Add Head' : 'Save Changes'}
            </button>
          </div>
        </div>
      </AwDialog>
    </div>
  );
};

export default HeadAdditionModification;
