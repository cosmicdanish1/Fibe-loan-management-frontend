import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Loader2, Save, RefreshCw, GitBranch, CheckCircle2, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { message, Select } from 'antd';
import AwDialog from '@/components/shared/kit/AwDialog';
import apiService from '../../../../services/api';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';

const SOCIETY_NAME    = 'Espat Karmchari Co-Operative Credit Society Limited.';
const SOCIETY_ADDRESS = 'Avenue A, Sahakari Sadan, Sector-6, AT Post:Bhilai Nagar, Dist:DURG-490006';
const SECTION_ROOTS   = ['L1000', 'A1000', 'I1000', 'E1000'];

interface FinancialYear { yearcode: number; startDate: string; endDate: string; label: string; }
interface HeadEntry {
  code: string; parentCode: string; headName: string; headType: string | null;
  openingBal: number; hasYearData: boolean; edited?: boolean;
}

const SECTION_LABELS: Record<string, string> = {
  L1000: 'Liabilities', A1000: 'Assets', I1000: 'Income', E1000: 'Expenditure',
};

function fmt(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const HeadOpeningBalance: React.FC = () => {
  const [years, setYears]           = useState<FinancialYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [entries, setEntries]       = useState<HeadEntry[]>([]);
  const [loadingYears, setLoadingYears] = useState(true);
  const [loadingData, setLoadingData]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const [applying, setApplying]     = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(SECTION_ROOTS));
  const [search, setSearch]         = useState('');
  const initialLoad = useRef(false);

  // BUG FIX: this used to call apiService.getFinancialYears(), which hits
  // /admin/financial-year/list — that returns raw entities shaped
  // {yearCode, startDate: Date, endDate: Date}, not the {yearcode, label}
  // shape below. Every option's key/value/label came out undefined, so the
  // dropdown rendered blank and the auto-select-last-year-on-load fired
  // loadData(undefined) (confirmed by cross-referencing how
  // TransferEntriesForClosing.tsx consumes the same endpoint via yearCode).
  const loadYears = useCallback(async () => {
    setLoadingYears(true);
    try {
      const res = await apiService.getHeadOpeningBalanceYears();
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setYears(res.data);
        return res.data;
      }
    } catch {
      message.error('Error loading financial years');
    } finally {
      setLoadingYears(false);
    }
    return [];
  }, []);

  const loadData = useCallback(async (yearcode: number) => {
    setLoadingData(true);
    try {
      const res = await apiService.getHeadOpeningBalances(yearcode);
      if (res.success && Array.isArray(res.data)) {
        setEntries(res.data.map((r: any) => ({
          code:       r.code,
          parentCode: r.parentCode,
          headName:   r.headName,
          headType:   r.headType,
          openingBal: Number(r.openingBal ?? 0),
          hasYearData: Boolean(r.hasYearData),
          edited:     false,
        })));
      } else {
        message.error('Failed to load head opening balances');
      }
    } catch {
      message.error('Error loading head opening balances');
    } finally {
      setLoadingData(false);
    }
  }, []);

  // Load years first, then auto-select last year and load its data
  useEffect(() => {
    if (initialLoad.current) return;
    initialLoad.current = true;
    loadYears().then(data => {
      if (data.length > 0) {
        const last = data[data.length - 1].yearcode;
        setSelectedYear(last);
        loadData(last);
      }
    });
  }, []);

  const handleYearChange = (yearcode: number) => {
    setSelectedYear(yearcode);
    loadData(yearcode);
  };

  const handleBalChange = (code: string, val: string) => {
    setEntries(prev => prev.map(e =>
      e.code === code ? { ...e, openingBal: parseFloat(val) || 0, edited: true } : e,
    ));
  };

  const handleSave = async () => {
    if (!selectedYear) return;
    setSaving(true);
    try {
      const balances = leafEntries.map(e => ({ headCode: e.code, closingBal: e.openingBal }));
      const res = await apiService.saveHeadOpeningBalances(selectedYear, balances);
      if (res.success) {
        message.success(res.message || 'Saved successfully');
        setEntries(prev => prev.map(e => ({ ...e, edited: false, hasYearData: true })));
      } else {
        message.error(res.message || 'Save failed');
      }
    } catch (err: any) {
      message.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleApply = async () => {
    if (!selectedYear) return;
    setApplying(true);
    try {
      const res = await apiService.applyYearOpeningBalances(selectedYear);
      if (res.success) message.success(res.message || 'Applied to headmaster');
      else message.error(res.message || 'Apply failed');
    } catch (err: any) {
      message.error(err.message || 'Apply failed');
    } finally {
      setApplying(false);
    }
  };

  // BUG FIX: this button's confirm dialog claims it "applies this year's
  // balances to headmaster and rebuilds the balance sheet", but it used to be
  // wired to the exact same handler as Apply (handleApply) — it never called
  // rebuildBalancesheet(), so the balancesheet table (source of the Balance
  // Sheet report) stayed stale while the button implied it was current.
  const handleBuildTree = async () => {
    if (!selectedYear) return;
    setApplying(true);
    try {
      const applyRes = await apiService.applyYearOpeningBalances(selectedYear);
      if (!applyRes.success) {
        message.error(applyRes.message || 'Apply failed');
        return;
      }
      const buildRes = await apiService.rebuildBalancesheet();
      if (buildRes.success) {
        message.success(buildRes.data?.message || 'Balance sheet rebuilt');
      } else {
        message.error(buildRes.message || 'Build Tree failed');
      }
    } catch (err: any) {
      message.error(err.message || 'Build Tree failed');
    } finally {
      setApplying(false);
    }
  };

  const toggleSection = (code: string) =>
    setExpandedSections(prev => { const n = new Set(prev); n.has(code) ? n.delete(code) : n.add(code); return n; });

  const activeYear = useMemo(
    () => years.find(y => y.yearcode === selectedYear) ?? null,
    [years, selectedYear],
  );

  const leafEntries = useMemo(
    () => entries.filter(e => !SECTION_ROOTS.includes(e.code) && e.code !== 'M1000'),
    [entries],
  );

  const sectionTotals = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const root of SECTION_ROOTS) {
      const p = root.charAt(0);
      acc[root] = leafEntries.filter(e => e.code.startsWith(p)).reduce((s, e) => s + e.openingBal, 0);
    }
    return acc;
  }, [leafEntries]);

  const grandTotal = useMemo(() => leafEntries.reduce((s, e) => s + e.openingBal, 0), [leafEntries]);

  const displayRows = useMemo(() => {
    const q = search.toLowerCase();
    const rows: Array<{ type: 'section' | 'leaf'; entry: HeadEntry; rootCode: string }> = [];
    for (const root of SECTION_ROOTS) {
      const rootEntry = entries.find(e => e.code === root);
      if (!rootEntry) continue;
      rows.push({ type: 'section', entry: rootEntry, rootCode: root });
      if (expandedSections.has(root)) {
        const p = root.charAt(0);
        entries
          .filter(e => !SECTION_ROOTS.includes(e.code) && e.code !== 'M1000' && e.code.startsWith(p))
          .filter(e => !q || e.code.toLowerCase().includes(q) || e.headName.toLowerCase().includes(q))
          .forEach(e => rows.push({ type: 'leaf', entry: e, rootCode: root }));
      }
    }
    return rows;
  }, [entries, expandedSections, search]);

  const editedCount = entries.filter(e => e.edited).length;

  // Leaf row counter (reset per render)
  let leafCounter = 0;

  usePageToolbarActions({
    onSave: handleSave,
    saveLabel: 'Save',
    saveEnabled: !(saving || !selectedYear),
  });

  const toneFor = (prefix: string) =>
    prefix === 'L' ? 'var(--aw-info)' :
    prefix === 'A' ? 'var(--aw-success)' :
    prefix === 'I' ? 'var(--aw-warning)' :
    prefix === 'E' ? 'var(--aw-danger)' : 'var(--aw-muted)';

  const [confirm, setConfirm] = useState<'apply' | 'build' | null>(null);
  const runConfirm = async () => {
    const kind = confirm;
    setConfirm(null);
    if (kind === 'apply') await handleApply();
    else if (kind === 'build') await handleBuildTree();
  };

  const yearStart = activeYear?.startDate ?? '—';
  const yearEnd = activeYear?.endDate ?? '—';
  const yearCode = activeYear?.yearcode ?? '—';

  return (
    <div className="app-window">
      {/* ── Header ── */}
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">Head Opening Balance</h1>
          <p className="aw-desc">{activeYear ? `${activeYear.label}` : 'Opening balances by financial year'}</p>
        </div>
        <div className="aw-actions">
          {editedCount > 0 && <span className="aw-pill tone-warning aw-fade-in">{editedCount} unsaved</span>}
          <button
            type="button"
            onClick={() => selectedYear && loadData(selectedYear)}
            disabled={loadingData}
            className="aw-icon-btn"
            aria-label="Refresh"
            data-tip="Refresh"
            data-tip-pos="bottom-end"
          >
            <RefreshCw size={14} className={loadingData ? 'aw-spin' : ''} />
          </button>
          <button type="button" onClick={() => setConfirm('apply')} disabled={applying || !selectedYear} className="aw-btn aw-btn-secondary">
            {applying ? <Loader2 size={13} className="aw-spin" /> : <CheckCircle2 size={13} />} Apply
          </button>
          <button type="button" onClick={() => setConfirm('build')} disabled={applying || !selectedYear} className="aw-btn aw-btn-secondary">
            <GitBranch size={13} /> Build Tree
          </button>
          <button type="button" onClick={handleSave} disabled={saving || !selectedYear} className="aw-btn aw-btn-primary">
            {saving ? <Loader2 size={13} className="aw-spin" /> : <Save size={13} />} Save
          </button>
        </div>
      </div>

      <div className="aw-content">
        <section className="aw-card">
          <div style={{ textAlign: 'center' }}>
            <p className="aw-strong" style={{ color: 'var(--aw-accent)' }}>{SOCIETY_NAME}</p>
            <p className="aw-meta">{SOCIETY_ADDRESS}</p>
          </div>

          <div className="aw-inline" style={{ flexWrap: 'wrap' }}>
            <div style={{ minWidth: 220 }}>
              <label className="aw-label" htmlFor="hob-year">Financial Year</label>
              {loadingYears ? (
                <span className="aw-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Loader2 size={12} className="aw-spin" /> Loading…
                </span>
              ) : (
                <Select
                  id="hob-year"
                  className="aw-select"
                  popupClassName="aw-select-popup"
                  value={selectedYear ?? undefined}
                  onChange={(v) => handleYearChange(v as number)}
                  placeholder="— no years —"
                  options={years.map(y => ({ value: y.yearcode, label: y.label }))}
                />
              )}
            </div>
            <div style={{ minWidth: 240, flex: 1, maxWidth: 320 }}>
              <label className="aw-label" htmlFor="hob-search">Search</label>
              <div className="aw-input-wrap has-icon">
                <Search size={13} />
                <input
                  id="hob-search"
                  type="text"
                  placeholder="Search code / name…"
                  className="aw-input"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {loadingData ? (
            <div className="aw-empty" style={{ padding: 40 }}>
              <Loader2 size={28} className="aw-spin" />
              <strong className="aw-strong">Loading balances…</strong>
            </div>
          ) : (
            <div className="aw-table-wrap" style={{ maxHeight: '62vh' }}>
              <table className="aw-table" style={{ minWidth: 720 }}>
                <thead>
                  <tr>
                    <th className="is-center" style={{ width: 44 }}>#</th>
                    <th>Code — Head Name</th>
                    <th className="is-right" style={{ width: 170 }}>Opening</th>
                    <th className="is-center" style={{ width: 120 }}>Start Year</th>
                    <th className="is-center" style={{ width: 120 }}>End Year</th>
                    <th className="is-center" style={{ width: 70 }}>Year</th>
                  </tr>
                </thead>

                <tbody>
                  {displayRows.length === 0 && (
                    <tr>
                      <td colSpan={6}>
                        <div className="aw-empty" style={{ padding: 32 }}>
                          <GitBranch size={26} />
                          <strong className="aw-strong">No heads to show</strong>
                        </div>
                      </td>
                    </tr>
                  )}
                  {displayRows.map(row => {
                    const tone = toneFor(row.rootCode.charAt(0));
                    if (row.type === 'section') {
                      const isOpen = expandedSections.has(row.rootCode);
                      const cell: React.CSSProperties = { background: `color-mix(in srgb, ${tone} 12%, var(--aw-surface))`, color: tone, fontWeight: 700 };
                      return (
                        <tr key={row.entry.code} className="is-clickable" onClick={() => toggleSection(row.rootCode)}>
                          <td className="is-center" style={cell}>{isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                          <td style={cell}>
                            {SECTION_LABELS[row.rootCode]} <span style={{ marginLeft: 6, opacity: .75 }}>{row.entry.code}</span>
                          </td>
                          <td className="is-right" style={cell}>{!isOpen ? fmt(sectionTotals[row.rootCode] ?? 0) : ''}</td>
                          <td className="is-center" style={cell}>{yearStart}</td>
                          <td className="is-center" style={cell}>{yearEnd}</td>
                          <td className="is-center" style={cell}>{yearCode}</td>
                        </tr>
                      );
                    }

                    leafCounter += 1;
                    const e = row.entry;
                    return (
                      <tr key={e.code}>
                        <td className="is-muted is-center">{leafCounter}</td>
                        <td>
                          <span style={{ color: tone, fontWeight: 700, marginRight: 8 }}>{e.code}</span>
                          <span style={e.edited ? { color: 'var(--aw-warning)' } : undefined}>{e.headName}</span>
                          {e.edited && <span style={{ color: 'var(--aw-warning)', marginLeft: 4 }}>*</span>}
                        </td>
                        <td className="has-input">
                          <input
                            type="number"
                            step="0.01"
                            aria-label={`Opening balance ${e.code}`}
                            className="aw-input is-right"
                            style={e.edited ? { color: 'var(--aw-warning)', fontWeight: 700 } : { fontWeight: 600 }}
                            value={e.openingBal}
                            onChange={ev => handleBalChange(e.code, ev.target.value)}
                          />
                        </td>
                        <td className="is-center is-muted">{yearStart}</td>
                        <td className="is-center is-muted">{yearEnd}</td>
                        <td className="is-center is-muted">{yearCode}</td>
                      </tr>
                    );
                  })}
                </tbody>

                <tfoot>
                  <tr>
                    <td />
                    <td>Grand Total — {leafEntries.length} accounts</td>
                    <td className="is-right is-warning">{fmt(grandTotal)}</td>
                    <td className="is-center is-muted">{yearStart}</td>
                    <td className="is-center is-muted">{yearEnd}</td>
                    <td className="is-center is-muted">{yearCode}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>
      </div>

      <AwDialog
        open={confirm !== null}
        title={confirm === 'build' ? 'Build Tree for this financial year?' : "Apply this year's opening balances?"}
        icon={confirm === 'build' ? <GitBranch size={14} /> : <CheckCircle2 size={14} />}
        onClose={() => setConfirm(null)}
        maxWidth="26rem"
        compact
      >
        <div className="aw-stack">
          <p className="aw-meta" style={{ lineHeight: 1.5 }}>
            {confirm === 'build'
              ? "Applies this year's balances to headmaster and rebuilds the balance sheet."
              : 'This overwrites headmaster.op_bal for all matching accounts.'}
          </p>
          <div className="aw-btn-row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setConfirm(null)} className="aw-btn aw-btn-secondary">Cancel</button>
            <button type="button" onClick={runConfirm} className="aw-btn aw-btn-primary">{confirm === 'build' ? 'Build' : 'Apply'}</button>
          </div>
        </div>
      </AwDialog>
    </div>
  );
};

export default HeadOpeningBalance;
