import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ListTree, Search, RotateCcw, Plus, Pencil, Trash2, ChevronDown, ChevronRight, RefreshCw,
} from 'lucide-react';
import { message, Select } from 'antd';
import AwDialog from '@/components/shared/kit/AwDialog';
import apiService from '../../../../services/api';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';
import { useTranslation } from 'react-i18next';
import {
  FlatEntry, HeadForm, BLANK_FORM, HEAD_TYPES, SECTION_ROOTS, SECTION_NAMES,
  buildRows, sectionMembers, totalsOf, isAccount, fmt, sectionOf, unwrapHeads, validateHeadForm, toPayload,
} from '../utils/headTree';

const SOCIETY_NAME = 'Espat Karmchari Co-Operative Credit Society Limited';

// One tone per section, used only as a small dot: it tells the four sections apart, nothing else
const toneFor = (letter: string) =>
  letter === 'L' ? 'var(--aw-info)' :
  letter === 'A' ? 'var(--aw-success)' :
  letter === 'I' ? 'var(--aw-warning)' :
  letter === 'E' ? 'var(--aw-danger)' : 'var(--aw-muted)';

const errText = (e: any, fallback: string) => e?.response?.data?.message || e?.message || fallback;

const HeadAdditionModification: React.FC = () => {
  const { t } = useTranslation();
  const [flatData, setFlatData] = useState<FlatEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(SECTION_ROOTS));

  const toggleSection = (code: string) =>
    setExpanded(prev => {
      const n = new Set(prev);
      if (n.has(code)) n.delete(code); else n.add(code);
      return n;
    });

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<HeadForm>(BLANK_FORM);
  const setField = (k: keyof HeadForm, v: string) => setFormData(p => ({ ...p, [k]: v }));

  // ─── Load ───────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.getHeadMaster();
      const list = unwrapHeads(res);
      if (list) {
        setFlatData(list);
      } else {
        setFlatData([]);
        message.error((res as any)?.message || t('The list of heads could not be read'));
      }
    } catch (e) {
      message.error(errText(e, t('Failed to load account heads')));
      setFlatData([]);
    } finally {
      setLoading(false);
    }
    // t is left out on purpose: it can change identity on every render and would reload the list in a loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleBuildTree = useCallback(async () => {
    setRebuilding(true);
    try {
      const res = await apiService.rebuildBalancesheet();
      if (res.success) {
        message.success(t('Built — {{1}} accounts recalculated from ledger', { 1: (res.data as any)?.leafCount ?? 0 }));
        await load();
      } else {
        message.warning(t('Build Tree returned no data'));
      }
    } catch (e) {
      message.error(errText(e, t('Build Tree failed — check backend logs')));
    } finally {
      setRebuilding(false);
    }
  }, [load, t]);

  // ─── Form ───────────────────────────────────────────────────────────────────

  const openAdd = useCallback((parentCode = '') => {
    // a child of a section starts with that section's flag, so only the code is left to type
    const letter = sectionOf(parentCode);
    setFormData({ ...BLANK_FORM, parentCode, pflag: 'ALIE'.includes(letter) && letter ? letter : '' });
    setFormMode('add');
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((e: FlatEntry) => {
    setFormData({
      code: e.code,
      parentCode: e.parentCode,
      headName: e.headName,
      headType: e.headType || 'OTH',
      interest: e.interest || 'N',
      pflag: e.pflag || '',
      hposition: e.hposition || '',
      opBal: String(e.opBal || 0),
    });
    setFormMode('edit');
    setFormOpen(true);
  }, []);

  const existingCodes = useMemo(() => new Set(flatData.map(f => f.code)), [flatData]);

  const handleSave = useCallback(async () => {
    const problem = validateHeadForm(formData, formMode, existingCodes);
    if (problem) { message.error(t(problem)); return; }
    setSaving(true);
    try {
      const res = await apiService.saveHeadMaster(toPayload(formData, formMode));
      if (res.success) {
        message.success(t('{{1}} {{2}} successfully', { 1: formData.code.toUpperCase(), 2: formMode === 'add' ? t('added') : t('updated') }));
        setFormOpen(false);
        await load();
      } else {
        message.error(res.message || (res as any).error || t('Save failed'));
      }
    } catch (e) {
      message.error(errText(e, t('Save failed')));
    } finally {
      setSaving(false);
    }
  }, [formData, formMode, existingCodes, load, t]);

  // ─── Delete ─────────────────────────────────────────────────────────────────

  const deleteOne = useCallback(async (code: string): Promise<boolean> => {
    setDeleting(code);
    try {
      const res = await apiService.deleteHeadMaster(code);
      if (res.success) return true;
      message.error(`${code}: ${res.message || (res as any).error || t('Delete failed')}`);
      return false;
    } catch (e) {
      message.error(`${code}: ${errText(e, t('Delete failed'))}`);
      return false;
    } finally {
      setDeleting(null);
    }
  }, [t]);

  const [confirmCodes, setConfirmCodes] = useState<string[] | null>(null);
  const runConfirmedDelete = async () => {
    const codes = confirmCodes;
    setConfirmCodes(null);
    if (!codes || codes.length === 0) return;
    let done = 0;
    for (const code of codes) {
      if (await deleteOne(code)) {
        done++;
        setSelected(prev => { const n = new Set(prev); n.delete(code); return n; });
      }
    }
    if (done > 0) message.success(done === 1 ? t('{{1}} deleted', { 1: codes[0] }) : t('{{1}} heads deleted', { 1: done }));
    await load();
  };

  // ─── Derived ────────────────────────────────────────────────────────────────

  const rows = useMemo(() => buildRows(flatData, search, expanded), [flatData, search, expanded]);
  const sectionTotals = useMemo(() => {
    const acc: Record<string, ReturnType<typeof totalsOf> & { count: number }> = {};
    for (const root of SECTION_ROOTS) {
      const members = sectionMembers(flatData, root);
      acc[root] = { ...totalsOf(members), count: members.length };
    }
    return acc;
  }, [flatData]);
  const grand = useMemo(() => totalsOf(flatData.filter(isAccount)), [flatData]);
  const accountCount = useMemo(() => flatData.filter(isAccount).length, [flatData]);

  const leafCodes = useMemo(() => rows.filter(r => !r.isSection).map(r => r.entry.code), [rows]);
  const allChecked = leafCodes.length > 0 && leafCodes.every(c => selected.has(c));
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(leafCodes));
  const toggleOne = (code: string) =>
    setSelected(prev => { const n = new Set(prev); if (n.has(code)) n.delete(code); else n.add(code); return n; });

  usePageToolbarActions({
    onSave: handleSave,
    saveLabel: saving ? 'Saving…' : formMode === 'add' ? 'Add Head' : 'Save Changes',
    saveEnabled: formOpen && !saving,
  });

  // the parent list follows the code letter, so a head can only be put under its own section
  const parentOptions = useMemo(() => {
    const letter = sectionOf(formData.code);
    return [...flatData]
      .filter(f => f.code !== formData.code && f.code !== 'M1000' && (!letter || sectionOf(f.code) === letter))
      .sort((a, b) => a.code.localeCompare(b.code))
      .map(f => ({ value: f.code, label: `${f.code} · ${f.headName}` }));
  }, [flatData, formData.code]);

  const typeOptions = useMemo(() => {
    const known = new Set(HEAD_TYPES.map(h => h.value));
    const extra = [...new Set(flatData.map(f => (f.headType || '').trim()).filter(v => v && !known.has(v)))]
      .map(v => ({ value: v, label: v }));
    return [...HEAD_TYPES, ...extra];
  }, [flatData]);

  // A balance is kept on the head's own side (credit for L and I, debit for A and E), so a minus means it has gone the other way
  const money = (v: string | number, signed = false) => {
    const text = fmt(v);
    if (!text) return <span className="hm-zero">–</span>;
    return signed && Number(v) < 0 ? <span className="hm-neg">{text}</span> : <>{text}</>;
  };

  return (
    <div className="app-window hm-form">
      <style>{`
        .hm-form .aw-header { background: var(--aw-surface); border-bottom: 1px solid var(--aw-border); padding-top: 16px; padding-bottom: 16px; }
        .hm-form .aw-content { padding: 24px calc(var(--aw-pad) * 2.2) 48px; }
        .hm-wrap { max-width: 1280px; display: flex; flex-direction: column; gap: 20px; }
        .hm-crumb { font-size: calc(var(--type-body-size) - 1px); color: var(--aw-muted); margin-bottom: 2px; }
        .hm-chip { display: inline-flex; align-items: center; gap: 8px; height: 32px; padding: 0 12px; border-radius: 999px; background: color-mix(in srgb, var(--aw-accent) 10%, var(--aw-surface)); color: var(--aw-text); font-size: var(--type-label-size); font-weight: 600; }
        .hm-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--aw-accent); }
        .hm-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
        .hm-stat { display: flex; flex-direction: column; gap: 4px; padding: 16px 20px; text-align: left; cursor: pointer; border: 1px solid var(--aw-border); border-radius: calc(var(--aw-radius) * 1.8); background: var(--aw-surface); box-shadow: var(--aw-shadow); transition: border-color .15s, background-color .15s; }
        .hm-stat:hover { border-color: color-mix(in srgb, var(--aw-accent) 40%, var(--aw-border)); }
        .hm-stat:focus-visible { outline: 3px solid var(--aw-focus); outline-offset: 2px; }
        .hm-stat-label { display: inline-flex; align-items: center; gap: 8px; color: var(--aw-muted); font-size: var(--type-body-size); font-weight: 600; }
        .hm-stat-dot { width: 8px; height: 8px; border-radius: 50%; }
        .hm-stat-fig { color: var(--aw-text); font-size: 22px; font-weight: 600; line-height: 1.2; font-variant-numeric: tabular-nums; }
        .hm-stat-note { color: var(--aw-muted); font-size: calc(var(--type-body-size) - 1px); }
        .hm-card-desc { color: var(--aw-muted); font-size: calc(var(--type-body-size) - 1px); font-weight: 500; }
        .hm-tools { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
        .hm-table { table-layout: fixed; }
        .app-window.hm-form .hm-table tfoot td { background: var(--aw-surface-muted); font-weight: 600; border-top: 1px solid var(--aw-border-strong); }
        .hm-table th { text-transform: none; letter-spacing: 0; font-size: var(--type-body-size); font-weight: 600; }
        .hm-table td { font-weight: 500; }
        .hm-table tr.hm-section td { background: var(--aw-surface-muted); font-weight: 600; }
        .hm-table tr.hm-sel td { background: var(--aw-accent-soft); }
        .hm-head { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .hm-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .hm-group .hm-name { font-weight: 600; }
        .hm-code { flex: none; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: calc(var(--type-body-size) - 1px); color: var(--aw-muted); min-width: 44px; }
        .hm-type { display: inline-flex; padding: 1px 8px; border-radius: 6px; background: var(--aw-surface-muted); border: 1px solid var(--aw-border); color: var(--aw-muted); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: calc(var(--type-body-size) - 2px); }
        .hm-zero { color: var(--aw-muted); opacity: .5; }
        .hm-neg { color: var(--aw-danger); }
        .hm-actions { display: inline-flex; gap: 2px; opacity: 0; transition: opacity .12s; }
        .hm-table tr:hover .hm-actions, .hm-table tr:focus-within .hm-actions { opacity: 1; }
        .hm-hint { color: var(--aw-muted); font-size: calc(var(--type-body-size) - 1px); line-height: 1.5; }
        @media (max-width: 980px) { .hm-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      `}</style>

      <div className="aw-header">
        <div className="min-w-0">
          <div className="hm-crumb">{t('Administration')}</div>
          <h1 className="aw-title">{t('Head Addition / Modification')}</h1>
        </div>
        <div className="aw-actions">
          <span className="hm-chip"><span className="hm-dot" aria-hidden="true" />{t('{{1}} heads', { 1: accountCount })}</span>
          {selected.size > 0 && (
            <button type="button" onClick={() => setConfirmCodes([...selected])} className="aw-btn aw-btn-danger aw-fade-in">
              <Trash2 size={13} /> {t('Delete')} ({selected.size})
            </button>
          )}
          <button type="button" onClick={handleBuildTree} disabled={rebuilding || loading} className="aw-btn aw-btn-secondary">
            <RefreshCw size={13} className={rebuilding ? 'aw-spin' : ''} />
            {rebuilding ? t('Building…') : t('Build tree')}
          </button>
          <button type="button" onClick={() => openAdd()} disabled={loading} className="aw-btn aw-btn-primary">
            <Plus size={13} /> {t('Add head')}
          </button>
          <button type="button" onClick={load} disabled={loading} className="aw-icon-btn" aria-label={t('Refresh')} data-tip={t('Refresh')} data-tip-pos="bottom-end">
            <RotateCcw size={14} className={loading ? 'aw-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="aw-content">
        <div className="hm-wrap">
          {/* Section totals */}
          <div className="hm-stats">
            {SECTION_ROOTS.map(root => {
              const letter = root.charAt(0);
              const st = sectionTotals[root];
              const open = expanded.has(root);
              return (
                <button key={root} type="button" className="hm-stat" onClick={() => toggleSection(root)} aria-pressed={open} aria-label={t('{{1}}: show or hide the heads', { 1: t(SECTION_NAMES[letter]) })}>
                  <span className="hm-stat-label"><span className="hm-stat-dot" style={{ background: toneFor(letter) }} />{t(SECTION_NAMES[letter])}</span>
                  <span className="hm-stat-fig">{st && st.balance !== 0 ? fmt(st.balance) : '–'}</span>
                  <span className="hm-stat-note">{t('{{1}} heads', { 1: st?.count ?? 0 })}</span>
                </button>
              );
            })}
          </div>

          {/* Chart of accounts */}
          <section className="aw-card">
            <div className="aw-card-head">
              <span className="aw-card-icon"><ListTree size={14} /></span>
              <div className="min-w-0">
                <h2 className="aw-card-title">{t('Chart of accounts')}</h2>
                <div className="hm-card-desc">{SOCIETY_NAME}</div>
              </div>
            </div>

            <div className="hm-tools">
              <div className="aw-input-wrap has-icon" style={{ maxWidth: 340, flex: '1 1 240px' }}>
                <Search size={13} />
                <input type="text" placeholder={t('Search')} aria-label={t('Search heads')} value={search} onChange={e => setSearch(e.target.value)} className="aw-input" />
              </div>
              <span className="hm-hint">{t('Double-click a row to edit it')}</span>
            </div>

            {loading ? (
              <div className="aw-empty" style={{ padding: 40 }}>
                <RotateCcw size={24} className="aw-spin" />
                <strong className="aw-strong">{t('Loading')}</strong>
              </div>
            ) : (
              <div className="aw-table-wrap" style={{ maxHeight: '60vh' }}>
                <table className="aw-table hm-table" style={{ minWidth: 900 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}>
                        <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label={t('Select all')} style={{ width: 15, height: 15, accentColor: 'var(--aw-accent)' }} />
                      </th>
                      <th>{t('Head')}</th>
                      <th style={{ width: 72 }}>{t('Type')}</th>
                      <th className="is-right" style={{ width: 132 }}>{t('Opening')}</th>
                      <th className="is-right" style={{ width: 132 }}>{t('Debit')}</th>
                      <th className="is-right" style={{ width: 132 }}>{t('Credit')}</th>
                      <th className="is-right" style={{ width: 148 }}>{t('Balance')}</th>
                      <th style={{ width: 92 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={8}>
                          <div className="aw-empty" style={{ padding: 32 }}>
                            <ListTree size={24} />
                            <strong className="aw-strong">{search ? t('No matching heads') : t('No heads found')}</strong>
                            {!search && <span className="aw-meta">{t('Add the first head, or press Refresh to load the list again')}</span>}
                          </div>
                        </td>
                      </tr>
                    )}

                    {rows.map(({ entry: e, depth, isSection, hasChildren }) => {
                      const letter = sectionOf(e.code);
                      if (isSection) {
                        const st = sectionTotals[e.code];
                        const open = expanded.has(e.code) || !!search.trim();
                        return (
                          <tr key={e.code} className="hm-section">
                            <td className="is-center">
                              <button type="button" onClick={() => toggleSection(e.code)} className="aw-icon-btn is-sm" aria-label={open ? t('Collapse') : t('Expand')} aria-expanded={open}>
                                {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                            </td>
                            <td colSpan={2} onClick={() => toggleSection(e.code)} style={{ cursor: 'pointer' }}>
                              <span className="hm-head">
                                <span className="hm-stat-dot" style={{ background: toneFor(letter) }} />
                                <span className="hm-code">{e.code}</span>
                                <span className="hm-name">{t(SECTION_NAMES[letter] || e.headName)}</span>
                              </span>
                            </td>
                            <td className="is-right">{money(st?.opening ?? 0)}</td>
                            <td className="is-right">{money(st?.debit ?? 0)}</td>
                            <td className="is-right">{money(st?.credit ?? 0)}</td>
                            <td className="is-right">{money(st?.balance ?? 0, true)}</td>
                            <td className="is-center">
                              <button type="button" onClick={() => openAdd(e.code)} className="aw-icon-btn is-sm" aria-label={t('Add child head under {{1}}', { 1: e.code })} data-tip={t('Add head here')} data-tip-pos="left">
                                <Plus size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      }

                      const isSel = selected.has(e.code);
                      const type = (e.headType || '').trim();
                      return (
                        <tr key={e.code} className={`is-clickable${isSel ? ' hm-sel' : ''}${hasChildren ? ' hm-group' : ''}`} onDoubleClick={() => openEdit(e)}>
                          <td className="is-center">
                            <input type="checkbox" checked={isSel} onChange={() => toggleOne(e.code)} onClick={ev => ev.stopPropagation()} aria-label={t('Select {{1}}', { 1: e.code })} style={{ width: 15, height: 15, accentColor: 'var(--aw-accent)' }} />
                          </td>
                          <td>
                            <span className="hm-head" style={{ paddingLeft: 12 + depth * 20 }}>
                              <span className="hm-code">{e.code}</span>
                              <span className="hm-name" title={e.headName}>{e.headName}</span>
                            </span>
                          </td>
                          <td>{type && type !== 'OTH' ? <span className="hm-type">{type}</span> : null}</td>
                          <td className="is-right">{money(e.opening)}</td>
                          <td className="is-right">{money(e.debit)}</td>
                          <td className="is-right">{money(e.credit)}</td>
                          <td className="is-right">{money(e.balance, true)}</td>
                          <td className="is-center">
                            <span className="hm-actions">
                              {hasChildren && (
                                <button type="button" onClick={() => openAdd(e.code)} className="aw-icon-btn is-sm" aria-label={t('Add child head under {{1}}', { 1: e.code })} data-tip={t('Add head here')} data-tip-pos="left">
                                  <Plus size={14} />
                                </button>
                              )}
                              <button type="button" onClick={() => openEdit(e)} className="aw-icon-btn is-sm" aria-label={t('Edit {{1}}', { 1: e.code })} data-tip={t('Edit')} data-tip-pos="left">
                                <Pencil size={14} />
                              </button>
                              <button type="button" onClick={() => setConfirmCodes([e.code])} disabled={deleting === e.code} className="aw-icon-btn is-sm is-danger" aria-label={t('Delete {{1}}', { 1: e.code })} data-tip={t('Delete')} data-tip-pos="left">
                                {deleting === e.code ? <RotateCcw size={14} className="aw-spin" /> : <Trash2 size={14} />}
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
                      <td colSpan={2}>{t('Grand total')} <span className="aw-meta" style={{ marginLeft: 6 }}>{t('{{1}} accounts', { 1: accountCount })}</span></td>
                      <td className="is-right">{money(grand.opening)}</td>
                      <td className="is-right">{money(grand.debit)}</td>
                      <td className="is-right">{money(grand.credit)}</td>
                      <td className="is-right">{money(grand.balance, true)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Delete confirmation */}
      <AwDialog
        open={confirmCodes !== null}
        title={confirmCodes && confirmCodes.length > 1 ? t('Delete {{1}} heads?', { 1: confirmCodes.length }) : t('Delete {{1}}?', { 1: confirmCodes?.[0] ?? '' })}
        icon={<Trash2 size={14} />}
        onClose={() => setConfirmCodes(null)}
        maxWidth="26rem"
        compact
      >
        <div className="aw-stack">
          <p className="aw-meta" style={{ lineHeight: 1.5 }}>
            {t('A head with child heads, ledger postings or voucher lines is refused and stays. Deleting cannot be undone.')}
          </p>
          <div className="aw-btn-row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setConfirmCodes(null)} className="aw-btn aw-btn-secondary">{t('Cancel')}</button>
            <button type="button" onClick={runConfirmedDelete} className="aw-btn aw-btn-danger">
              {confirmCodes && confirmCodes.length > 1 ? t('Delete all') : t('Delete')}
            </button>
          </div>
        </div>
      </AwDialog>

      {/* Add / Edit */}
      <AwDialog
        open={formOpen}
        onClose={() => { if (!saving) setFormOpen(false); }}
        title={formMode === 'add' ? t('Add head') : t('Edit {{1}}', { 1: formData.code })}
        icon={formMode === 'add' ? <Plus size={14} /> : <Pencil size={14} />}
        maxWidth="32rem"
        compact
      >
        <div className="aw-stack">
          <div className="aw-two">
            <div>
              <label className="aw-label" htmlFor="hm-code">{t('Code')} *</label>
              <input
                id="hm-code"
                value={formData.code}
                onChange={e => {
                  const code = e.target.value.toUpperCase();
                  setFormData(p => ({ ...p, code, pflag: p.pflag || ('ALIE'.includes(sectionOf(code)) && sectionOf(code) ? sectionOf(code) : '') }));
                }}
                readOnly={formMode === 'edit'}
                maxLength={5}
                placeholder="L1005"
                className="aw-input"
              />
            </div>
            <div>
              <label className="aw-label" htmlFor="hm-parent">{t('Parent head')} *</label>
              <Select
                id="hm-parent"
                className="aw-select"
                popupClassName="aw-select-popup"
                showSearch
                optionFilterProp="label"
                value={formData.parentCode || undefined}
                onChange={(v) => setField('parentCode', v ?? '')}
                placeholder={t('Select')}
                options={parentOptions}
              />
            </div>
          </div>

          <div>
            <label className="aw-label" htmlFor="hm-name">{t('Head name')} *</label>
            <input id="hm-name" value={formData.headName} onChange={e => setField('headName', e.target.value)} maxLength={100} placeholder={t('Share capital')} className="aw-input" />
          </div>

          <div className="aw-two">
            <div>
              <label className="aw-label" htmlFor="hm-type">{t('Head type')}</label>
              <Select id="hm-type" className="aw-select" popupClassName="aw-select-popup" value={formData.headType || 'OTH'} onChange={(v) => setField('headType', v)} options={typeOptions} />
            </div>
            <div>
              <label className="aw-label" htmlFor="hm-pflag">{t('Section flag')} *</label>
              <Select
                id="hm-pflag"
                className="aw-select"
                popupClassName="aw-select-popup"
                value={formData.pflag || undefined}
                onChange={(v) => setField('pflag', v ?? '')}
                placeholder={t('Select')}
                options={[
                  { value: 'A', label: t('A · Asset') },
                  { value: 'L', label: t('L · Liability') },
                  { value: 'I', label: t('I · Income') },
                  { value: 'E', label: t('E · Expenditure') },
                  { value: 'R', label: t('R · Root (section heads only)') },
                ]}
              />
            </div>
          </div>

          <div className="aw-two">
            <div>
              <label className="aw-label" htmlFor="hm-op">{t('Opening balance')}</label>
              <input id="hm-op" type="number" step="0.01" value={formData.opBal} onChange={e => setField('opBal', e.target.value)} className="aw-input is-right" />
            </div>
            <div>
              <label className="aw-label" htmlFor="hm-int">{t('Interest')}</label>
              <Select id="hm-int" className="aw-select" popupClassName="aw-select-popup" value={formData.interest} onChange={(v) => setField('interest', v)} options={[{ value: 'N', label: t('N · No interest') }, { value: 'Y', label: t('Y · Carries interest') }]} />
            </div>
          </div>

          <div>
            <label className="aw-label" htmlFor="hm-pos">{t('Sort position')}</label>
            <input id="hm-pos" type="number" value={formData.hposition} onChange={e => setField('hposition', e.target.value)} placeholder={t('Optional')} className="aw-input" />
          </div>

          <p className="hm-hint">
            {t('The first letter of the code is the section: L liabilities, A assets, I income, E expenditure. It must match the parent head. The head type tells the application what the head is for: cash, bank, loan, share.')}
          </p>

          <div className="aw-btn-row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setFormOpen(false)} disabled={saving} className="aw-btn aw-btn-secondary">{t('Cancel')}</button>
            <button type="button" onClick={handleSave} disabled={saving} className="aw-btn aw-btn-primary">
              {saving ? t('Saving…') : formMode === 'add' ? t('Add head') : t('Save changes')}
            </button>
          </div>
        </div>
      </AwDialog>
    </div>
  );
};

export default HeadAdditionModification;
