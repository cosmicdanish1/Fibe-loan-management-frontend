import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Loader2, Save, RefreshCw, GitBranch, CheckCircle2, Search, ChevronDown, ChevronRight, Scale, Lock } from 'lucide-react';
import { message, Select } from 'antd';
import AwDialog from '@/components/shared/kit/AwDialog';
import apiService from '../../../../services/api';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';
import { useTranslation } from 'react-i18next';
import { SECTION_NAMES } from '../../HeadAdditionModification/utils/headTree';
import {
  OpeningEntry, FinancialYear, SECTION_ROOTS, toEntry, parseAmount, sidesOf, sectionSum, openingRows, money, toBalances,
} from '../utils/openingBalance';

const SOCIETY_NAME = 'Espat Karmchari Co-Operative Credit Society Limited';

const toneFor = (letter: string) =>
  letter === 'L' ? 'var(--aw-info)' :
  letter === 'A' ? 'var(--aw-success)' :
  letter === 'I' ? 'var(--aw-warning)' :
  letter === 'E' ? 'var(--aw-danger)' : 'var(--aw-muted)';

const errText = (e: any, fallback: string) => e?.response?.data?.message || e?.message || fallback;

// One head row. Memoized: typing in one box redraws only that row, not the whole chart (a 500-head chart lagged on every key).
const HeadRow = React.memo(function HeadRow(props: {
  entry: OpeningEntry; depth: number; hasChildren: boolean; draft: string | undefined; closed: boolean; label: string;
  onAmount: (code: string, text: string) => void; onBlurAmount: (code: string) => void;
}) {
  const { entry: e, depth, hasChildren, draft, closed, label, onAmount, onBlurAmount } = props;
  return (
    <tr className={`${e.edited ? 'hob-edited' : ''}${hasChildren ? ' hob-group' : ''}`}>
      <td>
        <span className="hob-head" style={{ paddingLeft: 12 + depth * 20 }}>
          <span className="hob-code">{e.code}</span>
          <span className="hob-name" title={e.headName}>{e.headName}</span>
        </span>
      </td>
      <td className="has-input">
        <input
          type="text"
          inputMode="decimal"
          aria-label={label}
          className="aw-input hob-input"
          value={draft ?? String(e.openingBal)}
          readOnly={closed}
          onChange={ev => onAmount(e.code, ev.target.value)}
          onBlur={() => onBlurAmount(e.code)}
        />
      </td>
    </tr>
  );
});

type Confirm = null | { kind: 'apply' } | { kind: 'build' } | { kind: 'unbalanced' } | { kind: 'discard'; then: () => void };

const HeadOpeningBalance: React.FC = () => {
  const { t } = useTranslation();
  const [years, setYears] = useState<FinancialYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [entries, setEntries] = useState<OpeningEntry[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loadingYears, setLoadingYears] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(SECTION_ROOTS));
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState<Confirm>(null);
  const initialLoad = useRef(false);
  // Year-switch race guards: only the latest load may write entries, and Save is tied to the year the rows were loaded for
  const loadSeq = useRef(0);
  const loadedYearRef = useRef<number | null>(null);
  const savingRef = useRef(false);

  const loadYears = useCallback(async (): Promise<FinancialYear[]> => {
    setLoadingYears(true);
    try {
      const res = await apiService.getHeadOpeningBalanceYears();
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setYears(res.data as FinancialYear[]);
        return res.data as FinancialYear[];
      }
    } catch (e) {
      message.error(errText(e, t('Error loading financial years')));
    } finally {
      setLoadingYears(false);
    }
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = useCallback(async (yearcode: number) => {
    const seq = ++loadSeq.current;
    loadedYearRef.current = null;
    setLoadingData(true);
    setDrafts({});
    try {
      const res = await apiService.getHeadOpeningBalances(yearcode);
      if (seq !== loadSeq.current) return;
      if (res.success && Array.isArray(res.data)) {
        loadedYearRef.current = yearcode;
        setEntries(res.data.map(toEntry));
      } else {
        setEntries([]);
        message.error(res.message || t('Failed to load head opening balances'));
      }
    } catch (e) {
      if (seq !== loadSeq.current) return;
      setEntries([]);
      message.error(errText(e, t('Error loading head opening balances')));
    } finally {
      if (seq === loadSeq.current) setLoadingData(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Years first, then the latest year and its balances
  useEffect(() => {
    if (initialLoad.current) return;
    initialLoad.current = true;
    loadYears().then(data => {
      if (data.length > 0) {
        const last = data[data.length - 1]!.yearcode;
        setSelectedYear(last);
        loadData(last);
      }
    });
  }, [loadYears, loadData]);

  const activeYear = useMemo(() => years.find(y => y.yearcode === selectedYear) ?? null, [years, selectedYear]);
  const closed = !!activeYear?.closed;
  const editedCount = useMemo(() => entries.filter(e => e.edited).length, [entries]);
  const sides = useMemo(() => sidesOf(entries), [entries]);

  // Anything that would throw away typed numbers asks first
  const guardEdits = (then: () => void) => {
    if (editedCount === 0) { then(); return; }
    setConfirm({ kind: 'discard', then });
  };

  const handleYearChange = (yearcode: number) => guardEdits(() => { setSelectedYear(yearcode); loadData(yearcode); });
  const handleRefresh = () => { if (selectedYear) guardEdits(() => loadData(selectedYear)); };

  const handleAmount = useCallback((code: string, text: string) => {
    const p = parseAmount(text);
    if (p === undefined) return; // not a number: the box keeps what it had
    setDrafts(d => ({ ...d, [code]: text }));
    setEntries(prev => prev.map(e => (e.code === code ? { ...e, openingBal: p ?? 0, edited: true } : e)));
  }, []);
  const endTyping = useCallback((code: string) => setDrafts(d => { if (!(code in d)) return d; const n = { ...d }; delete n[code]; return n; }), []);

  const doSave = async () => {
    if (!selectedYear || savingRef.current) return;
    if (loadingData || loadedYearRef.current !== selectedYear) {
      message.warning(t('Balances for the selected year are not loaded yet. Please wait or press Refresh.'));
      return;
    }
    const saveYear = selectedYear;
    savingRef.current = true;
    setSaving(true);
    try {
      const res = await apiService.saveHeadOpeningBalances(saveYear, toBalances(entries));
      if (res.success) {
        message.success(res.message || t('Saved successfully'));
        setEntries(prev => prev.map(e => ({ ...e, edited: false, hasYearData: true })));
        setDrafts({});
      } else {
        message.error(res.message || t('Save failed'));
      }
    } catch (e) {
      message.error(errText(e, t('Save failed')));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (!selectedYear || closed) return;
    if (!sides.balanced) { setConfirm({ kind: 'unbalanced' }); return; }
    void doSave();
  };

  const doApply = async (rebuild: boolean) => {
    if (!selectedYear) return;
    setApplying(true);
    try {
      const applyRes = await apiService.applyYearOpeningBalances(selectedYear);
      if (!applyRes.success) { message.error(applyRes.message || t('Apply failed')); return; }
      if (!rebuild) { message.success(applyRes.message || t('Applied to headmaster')); return; }
      const buildRes = await apiService.rebuildBalancesheet();
      if (buildRes.success) message.success((buildRes.data as any)?.message || t('Balance sheet rebuilt'));
      else message.error(buildRes.message || t('Build Tree failed'));
    } catch (e) {
      message.error(errText(e, rebuild ? t('Build Tree failed') : t('Apply failed')));
    } finally {
      setApplying(false);
    }
  };

  const runConfirm = async () => {
    const c = confirm;
    setConfirm(null);
    if (!c) return;
    if (c.kind === 'apply') await doApply(false);
    else if (c.kind === 'build') await doApply(true);
    else if (c.kind === 'unbalanced') await doSave();
    else if (c.kind === 'discard') c.then();
  };

  const toggleSection = (code: string) =>
    setExpanded(prev => { const n = new Set(prev); if (n.has(code)) n.delete(code); else n.add(code); return n; });

  const rows = useMemo(() => openingRows(entries, search, expanded), [entries, search, expanded]);
  const headCount = useMemo(() => entries.filter(e => !(SECTION_ROOTS as readonly string[]).includes(e.code) && e.code !== 'M1000').length, [entries]);

  usePageToolbarActions({ onSave: handleSave, saveLabel: 'Save', saveEnabled: !(saving || !selectedYear || closed) });

  const busy = saving || applying || loadingData;
  const sub = activeYear ? `${t('Year {{1}}', { 1: activeYear.yearcode })} · ${activeYear.startDate} – ${activeYear.endDate}` : t('Choose a financial year');

  return (
    <div className="app-window hob-form">
      <style>{`
        .hob-form .aw-header { background: var(--aw-surface); border-bottom: 1px solid var(--aw-border); padding-top: 16px; padding-bottom: 16px; }
        .hob-form .aw-content { padding: 24px calc(var(--aw-pad) * 2.2) 48px; }
        .hob-wrap { max-width: 1280px; display: flex; flex-direction: column; gap: 20px; }
        .hob-crumb { font-size: calc(var(--type-body-size) - 1px); color: var(--aw-muted); margin-bottom: 2px; }
        .hob-chip { display: inline-flex; align-items: center; gap: 8px; height: 32px; padding: 0 12px; border-radius: 999px; background: color-mix(in srgb, var(--aw-accent) 10%, var(--aw-surface)); color: var(--aw-text); font-size: var(--type-label-size); font-weight: 600; }
        .hob-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--aw-accent); flex: none; }
        .hob-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
        .hob-stat { display: flex; flex-direction: column; gap: 4px; padding: 16px 20px; border: 1px solid var(--aw-border); border-radius: calc(var(--aw-radius) * 1.8); background: var(--aw-surface); box-shadow: var(--aw-shadow); }
        .hob-stat-label { display: inline-flex; align-items: center; gap: 8px; color: var(--aw-muted); font-size: var(--type-body-size); font-weight: 600; }
        .hob-stat-fig { color: var(--aw-text); font-size: 22px; font-weight: 600; line-height: 1.2; font-variant-numeric: tabular-nums; }
        .hob-stat-note { color: var(--aw-muted); font-size: calc(var(--type-body-size) - 1px); }
        .hob-good { background: var(--aw-success); }
        .hob-bad { background: var(--aw-danger); }
        .hob-card-desc { color: var(--aw-muted); font-size: calc(var(--type-body-size) - 1px); font-weight: 500; }
        .hob-tools { display: flex; align-items: flex-end; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
        .hob-table { table-layout: fixed; }
        .hob-table th { text-transform: none; letter-spacing: 0; font-size: var(--type-body-size); font-weight: 600; }
        .hob-table td { font-weight: 500; }
        .hob-table tr.hob-section td { background: var(--aw-surface-muted); font-weight: 600; }
        .hob-table tr.hob-edited td { background: var(--aw-accent-soft); }
        .hob-head { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .hob-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .hob-group .hob-name { font-weight: 600; }
        .hob-code { flex: none; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: calc(var(--type-body-size) - 1px); color: var(--aw-muted); min-width: 44px; }
        .hob-input { text-align: right; font-variant-numeric: tabular-nums; font-weight: 500; }
        .hob-input[readonly] { background: transparent; border-color: transparent; color: var(--aw-text); }
        .hob-sec-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
        .app-window.hob-form .hob-table tfoot td { background: var(--aw-surface-muted); font-weight: 600; border-top: 1px solid var(--aw-border-strong); }
        .hob-hint { color: var(--aw-muted); font-size: calc(var(--type-body-size) - 1px); line-height: 1.5; }
        .hob-diff { display: grid; grid-template-columns: auto auto; gap: 4px 24px; justify-content: start; font-variant-numeric: tabular-nums; }
        @media (max-width: 980px) { .hob-stats { grid-template-columns: 1fr; } }
      `}</style>

      <div className="aw-header">
        <div className="min-w-0">
          <div className="hob-crumb">{t('Administration')}</div>
          <h1 className="aw-title">{t('Head Opening Balance')}</h1>
        </div>
        <div className="aw-actions">
          {activeYear && (
            <span className="hob-chip">
              {closed ? <Lock size={12} aria-hidden="true" /> : <span className="hob-dot" aria-hidden="true" />}
              {closed ? t('Year {{1}} · closed', { 1: activeYear.yearcode }) : t('Year {{1}}', { 1: activeYear.yearcode })}
            </span>
          )}
          {editedCount > 0 && <span className="hob-chip aw-fade-in">{t('{{1}} unsaved', { 1: editedCount })}</span>}
          <button type="button" onClick={handleRefresh} disabled={loadingData || !selectedYear} className="aw-icon-btn" aria-label={t('Refresh')} data-tip={t('Refresh')} data-tip-pos="bottom-end">
            <RefreshCw size={14} className={loadingData ? 'aw-spin' : ''} />
          </button>
          <button type="button" onClick={() => setConfirm({ kind: 'apply' })} disabled={busy || !selectedYear || closed} className="aw-btn aw-btn-secondary">
            {applying ? <Loader2 size={13} className="aw-spin" /> : <CheckCircle2 size={13} />} {t('Apply')}
          </button>
          <button type="button" onClick={() => setConfirm({ kind: 'build' })} disabled={busy || !selectedYear || closed} className="aw-btn aw-btn-secondary">
            <GitBranch size={13} /> {t('Build tree')}
          </button>
          <button type="button" onClick={handleSave} disabled={busy || !selectedYear || closed} className="aw-btn aw-btn-primary">
            {saving ? <Loader2 size={13} className="aw-spin" /> : <Save size={13} />} {t('Save')}
          </button>
        </div>
      </div>

      <div className="aw-content">
        <div className="hob-wrap">
          <div className="hob-stats">
            <div className="hob-stat">
              <span className="hob-stat-label">{t('Debit side')}</span>
              <span className="hob-stat-fig">{money(sides.debit)}</span>
              <span className="hob-stat-note">{t('Assets {{1}} + Expenditure {{2}}', { 1: money(sides.assets), 2: money(sides.expenditure) })}</span>
            </div>
            <div className="hob-stat">
              <span className="hob-stat-label">{t('Credit side')}</span>
              <span className="hob-stat-fig">{money(sides.credit)}</span>
              <span className="hob-stat-note">{t('Liabilities {{1}} + Income {{2}}', { 1: money(sides.liabilities), 2: money(sides.income) })}</span>
            </div>
            <div className="hob-stat" role="status" aria-live="polite">
              <span className="hob-stat-label"><span className={`hob-sec-dot ${sides.balanced ? 'hob-good' : 'hob-bad'}`} />{t('Difference')}</span>
              <span className="hob-stat-fig">{money(sides.difference)}</span>
              <span className="hob-stat-note">{sides.balanced ? t('Debit and credit sides agree') : t('Debit minus credit; the sides do not agree yet')}</span>
            </div>
          </div>

          <section className="aw-card">
            <div className="aw-card-head">
              <span className="aw-card-icon"><Scale size={14} /></span>
              <div className="min-w-0">
                <h2 className="aw-card-title">{t('Opening balances')}</h2>
                <div className="hob-card-desc">{SOCIETY_NAME} · {sub}</div>
              </div>
            </div>

            <div className="hob-tools">
              <div style={{ minWidth: 240 }}>
                <label className="aw-label" htmlFor="hob-year">{t('Financial year')}</label>
                {loadingYears ? (
                  <span className="aw-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 36 }}>
                    <Loader2 size={12} className="aw-spin" /> {t('Loading')}
                  </span>
                ) : (
                  <Select
                    id="hob-year"
                    className="aw-select"
                    popupClassName="aw-select-popup"
                    value={selectedYear ?? undefined}
                    onChange={(v) => handleYearChange(v as number)}
                    placeholder={t('No years')}
                    options={years.map(y => ({ value: y.yearcode, label: y.closed ? `${y.label} · ${t('closed')}` : y.label }))}
                  />
                )}
              </div>
              <div style={{ minWidth: 240, flex: '1 1 240px', maxWidth: 340 }}>
                <label className="aw-label" htmlFor="hob-search">{t('Search')}</label>
                <div className="aw-input-wrap has-icon">
                  <Search size={13} />
                  <input id="hob-search" type="text" placeholder={t('Code or name')} className="aw-input" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </div>
              {closed && <span className="hob-hint">{t('This year is closed. Its balances can be read but not changed.')}</span>}
              {!closed && !loadingData && entries.length > 0 && !entries.some(e => e.hasYearData) && (
                <span className="hob-hint">{t('Nothing is saved for this year yet. The numbers shown are the current opening balances; Save to keep them for this year.')}</span>
              )}
            </div>

            {loadingData ? (
              <div className="aw-empty" style={{ padding: 40 }}>
                <Loader2 size={24} className="aw-spin" />
                <strong className="aw-strong">{t('Loading')}</strong>
              </div>
            ) : (
              <div className="aw-table-wrap" style={{ maxHeight: '58vh' }}>
                <table className="aw-table hob-table" style={{ minWidth: 640 }}>
                  <thead>
                    <tr>
                      <th>{t('Head')}</th>
                      <th className="is-right" style={{ width: 220 }}>{t('Opening balance')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={2}>
                          <div className="aw-empty" style={{ padding: 32 }}>
                            <Scale size={24} />
                            <strong className="aw-strong">{search ? t('No matching heads') : t('No heads to show')}</strong>
                          </div>
                        </td>
                      </tr>
                    )}
                    {rows.map(({ entry, depth, isSection, hasChildren }) => {
                      const e = entry as OpeningEntry;
                      const letter = e.code.charAt(0);
                      if (isSection) {
                        const open = expanded.has(e.code) || !!search.trim();
                        return (
                          <tr key={e.code} className="hob-section is-clickable" onClick={() => toggleSection(e.code)}>
                            <td>
                              <span className="hob-head">
                                {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                <span className="hob-sec-dot" style={{ background: toneFor(letter) }} />
                                <span className="hob-code">{e.code}</span>
                                <span className="hob-name">{t(SECTION_NAMES[letter] || e.headName)}</span>
                              </span>
                            </td>
                            <td className="is-right">{money(sectionSum(entries, e.code))}</td>
                          </tr>
                        );
                      }
                      return (
                        <HeadRow
                          key={e.code}
                          entry={e}
                          depth={depth}
                          hasChildren={hasChildren}
                          draft={drafts[e.code]}
                          closed={closed}
                          label={t('Opening balance {{1}}', { 1: e.code })}
                          onAmount={handleAmount}
                          onBlurAmount={endTyping}
                        />
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>{t('{{1}} heads', { 1: headCount })} <span className="aw-meta" style={{ marginLeft: 6 }}>{t('Debit minus credit')}</span></td>
                      <td className="is-right">{money(sides.difference)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>

      <AwDialog
        open={confirm !== null}
        title={
          confirm?.kind === 'build' ? t('Build tree for this financial year?') :
          confirm?.kind === 'apply' ? t("Apply this year's opening balances?") :
          confirm?.kind === 'unbalanced' ? t('The balances do not agree') :
          t('Discard your unsaved numbers?')
        }
        icon={confirm?.kind === 'build' ? <GitBranch size={14} /> : confirm?.kind === 'unbalanced' ? <Scale size={14} /> : <CheckCircle2 size={14} />}
        onClose={() => setConfirm(null)}
        maxWidth="28rem"
        compact
      >
        <div className="aw-stack">
          {confirm?.kind === 'unbalanced' ? (
            <div className="hob-diff aw-meta">
              <span>{t('Debit (Assets + Expenditure)')}</span><strong className="aw-strong">{money(sides.debit)}</strong>
              <span>{t('Credit (Liabilities + Income)')}</span><strong className="aw-strong">{money(sides.credit)}</strong>
              <span>{t('Difference')}</span><strong className="aw-strong">{money(Math.abs(sides.difference))}</strong>
            </div>
          ) : (
            <p className="aw-meta" style={{ lineHeight: 1.5 }}>
              {confirm?.kind === 'build' ? t("Applies this year's balances to the head list, then rebuilds the balance sheet.") :
               confirm?.kind === 'apply' ? t("This replaces the opening balance of every head with this year's saved balance.") :
               confirm?.kind === 'discard' ? t('You have unsaved numbers. Going on will drop them.') : ''}
            </p>
          )}
          <div className="aw-btn-row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setConfirm(null)} className="aw-btn aw-btn-secondary">{t('Cancel')}</button>
            <button type="button" onClick={runConfirm} className="aw-btn aw-btn-primary">
              {confirm?.kind === 'build' ? t('Build') : confirm?.kind === 'apply' ? t('Apply') : confirm?.kind === 'unbalanced' ? t('Save anyway') : t('Discard')}
            </button>
          </div>
        </div>
      </AwDialog>
    </div>
  );
};

export default HeadOpeningBalance;
