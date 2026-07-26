import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Loader2, Save, RefreshCw, GitBranch, CheckCircle2 } from 'lucide-react';
import { message, Popconfirm } from 'antd';
import apiService from '../../../../services/api';

const SOCIETY_NAME    = 'Espat Karmchari Co-Operative Credit Society Limited.';
const SOCIETY_ADDRESS = 'Avenue A, Sahakari Sadan, Sector-6, AT Post:Bhilai Nagar, Dist:DURG-490006';
const SECTION_ROOTS   = ['L1000', 'A1000', 'I1000', 'E1000'];

interface FinancialYear { yearcode: number; startDate: string; endDate: string; label: string; }
interface HeadEntry {
  code: string; parentCode: string; headName: string; headType: string | null;
  openingBal: number; hasYearData: boolean; edited?: boolean;
}

const CODE_COLORS: Record<string, string> = {
  L: '#7c3aed', A: '#059669', I: '#d97706', E: '#dc2626',
};
const SECTION_BG: Record<string, string> = {
  L1000: '#f5f3ff', A1000: '#ecfdf5', I1000: '#fffbeb', E1000: '#fef2f2',
};
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

  const loadYears = useCallback(async () => {
    setLoadingYears(true);
    try {
      const res = await apiService.getFinancialYears();
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

  return (
    <div className="hob-page min-h-screen flex flex-col bg-white text-slate-800 font-sans text-sm">
      <style>{`
        .hob-row:hover td { background: #f5f3ff !important; }
        .hob-input {
          background: transparent; border: none; outline: none;
          text-align: right; width: 100%; color: inherit; font-family: monospace;
          font-size: 0.8rem;
        }
        .hob-input:focus { background: rgba(99,102,241,0.1); border-radius: 3px; }
        /* ── Dark mode ── */
        html.dark .hob-page { background: #0f172a !important; color: #e2e8f0 !important; }
        html.dark .hob-header { background: #1e293b !important; border-color: #334155 !important; }
        html.dark .hob-header .hob-title { color: #fff !important; }
        html.dark .hob-header .hob-addr { color: #94a3b8 !important; }
        html.dark .hob-toolbar { background: #0f172a !important; border-color: #334155 !important; }
        html.dark .hob-toolbar input, html.dark .hob-toolbar select { background: #1e293b !important; color: #e2e8f0 !important; border-color: #475569 !important; }
        html.dark .hob-toolbar .hob-tool-label { color: #94a3b8 !important; }
        html.dark .hob-thead { background: #1e293b !important; }
        html.dark .hob-thead th { color: #94a3b8 !important; border-color: #334155 !important; }
        html.dark .hob-section-row { background: #1e293b !important; }
        html.dark .hob-section-row td { color: #e2e8f0 !important; }
        html.dark .hob-row { border-color: #1e293b !important; }
        html.dark .hob-row:hover td { background: #1e1b4b !important; color: #e0e7ff !important; }
        html.dark .hob-row td { color: #cbd5e1 !important; }
        html.dark .hob-row .hob-input { color: #6ee7b7 !important; }
        html.dark .hob-row .hob-input:focus { background: rgba(99,102,241,0.2) !important; }
        html.dark .hob-tfoot { background: #0f172a !important; border-color: #7c3aed !important; }
        html.dark .hob-tfoot td { color: #e2e8f0 !important; }
      `}</style>

      {/* ── Company Header ── */}
      <div className="hob-header bg-slate-100 border-b-2 border-slate-300 text-center py-2 px-4 select-none">
        <div className="hob-title text-base font-extrabold text-purple-900 leading-tight">{SOCIETY_NAME}</div>
        <div className="hob-addr text-xs text-slate-600 mt-0.5">{SOCIETY_ADDRESS}</div>
        <div className="mt-1 inline-block text-sm font-black tracking-widest uppercase px-4 py-0.5 rounded text-amber-700" style={{ letterSpacing: '0.2em' }}>
          HEAD OPENING BALANCE
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="hob-toolbar bg-slate-50 border-b border-slate-300 px-3 py-1.5 flex flex-wrap items-center gap-3">
        {/* Financial Year */}
        <div className="flex items-center gap-2">
          <span className="hob-tool-label text-xs text-slate-600 font-semibold whitespace-nowrap">Financial Year:</span>
          {loadingYears ? (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Loader2 size={12} className="animate-spin" /> Loading…
            </span>
          ) : (
            <select
              className="bg-white border border-slate-300 text-slate-800 text-xs rounded px-2 py-1
                         focus:outline-none focus:border-purple-500 cursor-pointer min-w-[180px]"
              value={selectedYear ?? ''}
              onChange={e => handleYearChange(parseInt(e.target.value))}
            >
              {years.length === 0 && <option value="">— no years —</option>}
              {years.map(y => (
                <option key={y.yearcode} value={y.yearcode}>{y.label}</option>
              ))}
            </select>
          )}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search code / name…"
          className="bg-white border border-slate-300 text-slate-800 text-xs rounded px-2 py-1
                     focus:outline-none focus:border-purple-500 w-44"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="flex-1" />

        {editedCount > 0 && (
          <span className="text-xs text-amber-400 font-semibold">{editedCount} unsaved</span>
        )}

        <button
          onClick={() => selectedYear && loadData(selectedYear)}
          disabled={loadingData}
          className="flex items-center gap-1 px-2.5 py-1 bg-slate-700 hover:bg-slate-600
                     text-white text-xs rounded font-semibold transition-colors disabled:opacity-50"
        >
          <RefreshCw size={11} className={loadingData ? 'animate-spin' : ''} />
          Refresh
        </button>

        <button
          onClick={handleSave}
          disabled={saving || !selectedYear}
          className="flex items-center gap-1 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600
                     text-white text-xs rounded font-semibold transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
          Save
        </button>

        <Popconfirm
          title="Apply this year's opening balances to headmaster?"
          description="This overwrites headmaster.op_bal for all matching accounts."
          onConfirm={handleApply}
          okText="Apply" cancelText="Cancel"
        >
          <button
            disabled={applying || !selectedYear}
            className="flex items-center gap-1 px-2.5 py-1 bg-violet-700 hover:bg-violet-600
                       text-white text-xs rounded font-semibold transition-colors disabled:opacity-50"
          >
            {applying ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
            Apply
          </button>
        </Popconfirm>

        <Popconfirm
          title="Build Tree for this financial year?"
          description="Applies this year's balances to headmaster and rebuilds the balance sheet."
          onConfirm={handleApply}
          okText="Build" cancelText="Cancel"
        >
          <button
            disabled={applying || !selectedYear}
            className="flex items-center gap-1 px-2.5 py-1 bg-amber-700 hover:bg-amber-600
                       text-white text-xs rounded font-semibold transition-colors disabled:opacity-50"
          >
            <GitBranch size={11} />
            Build Tree
          </button>
        </Popconfirm>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto">
        {loadingData ? (
          <div className="flex items-center justify-center h-48 gap-2 text-slate-400">
            <Loader2 size={22} className="animate-spin" />
            <span className="text-sm">Loading balances…</span>
          </div>
        ) : (
          <table className="w-full border-collapse" style={{ fontSize: '0.78rem' }}>
            <thead className="hob-thead sticky top-0 z-10 bg-purple-900">
              <tr className="border-b-2 border-purple-700">
                <th className="text-center px-2 py-1.5 font-bold text-white w-10">#</th>
                <th className="text-left px-3 py-1.5 font-bold text-white">Code — Head Name</th>
                <th className="text-right px-3 py-1.5 font-bold text-white w-40">Opening</th>
                <th className="text-center px-3 py-1.5 font-bold text-white w-32">Start Year</th>
                <th className="text-center px-3 py-1.5 font-bold text-white w-32">End Year</th>
                <th className="text-center px-3 py-1.5 font-bold text-white w-16">Year</th>
              </tr>
            </thead>

            <tbody>
              {displayRows.map(row => {
                if (row.type === 'section') {
                  const isOpen = expandedSections.has(row.rootCode);
                  return (
                    <tr
                      key={row.entry.code}
                      className="hob-section-row cursor-pointer select-none border-b border-slate-200"
                      style={{ background: SECTION_BG[row.rootCode] }}
                      onClick={() => toggleSection(row.rootCode)}
                    >
                      <td className="px-2 py-1.5 text-center text-slate-500 font-bold">
                        {isOpen ? '▼' : '▶'}
                      </td>
                      <td className="px-3 py-1.5 font-black text-slate-800">
                        {SECTION_LABELS[row.rootCode]}
                        <span className="ml-2 text-[11px]" style={{ color: CODE_COLORS[row.rootCode.charAt(0)] }}>
                          {row.entry.code}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono font-black text-amber-700">
                        {!isOpen ? fmt(sectionTotals[row.rootCode]) : ''}
                      </td>
                      <td className="px-3 py-1.5 text-center text-slate-500 text-[11px]">
                        {activeYear?.startDate ?? '—'}
                      </td>
                      <td className="px-3 py-1.5 text-center text-slate-500 text-[11px]">
                        {activeYear?.endDate ?? '—'}
                      </td>
                      <td className="px-3 py-1.5 text-center text-slate-500 text-[11px]">
                        {activeYear?.yearcode ?? '—'}
                      </td>
                    </tr>
                  );
                }

                // Leaf row
                leafCounter += 1;
                const e = row.entry;
                const cColor = CODE_COLORS[e.code.charAt(0)] ?? '#94a3b8';
                return (
                  <tr key={e.code} className="hob-row border-b border-slate-100">
                    <td className="px-2 py-1 text-center text-slate-400">{leafCounter}</td>
                    <td className="px-3 py-1">
                      <span className="font-bold mr-2" style={{ color: cColor }}>{e.code}</span>
                      <span className={e.edited ? 'text-amber-600' : 'text-slate-700'}>{e.headName}</span>
                      {e.edited && <span className="ml-1 text-amber-500 text-[10px]">*</span>}
                    </td>
                    <td className="px-2 py-1 text-right font-mono">
                      <input
                        type="number"
                        step="0.01"
                        className="hob-input"
                        style={{ color: e.edited ? '#d97706' : '#059669' }}
                        value={e.openingBal}
                        onChange={ev => handleBalChange(e.code, ev.target.value)}
                      />
                    </td>
                    <td className="px-3 py-1 text-center text-slate-500 text-[11px]">
                      {activeYear?.startDate ?? '—'}
                    </td>
                    <td className="px-3 py-1 text-center text-slate-500 text-[11px]">
                      {activeYear?.endDate ?? '—'}
                    </td>
                    <td className="px-3 py-1 text-center text-slate-500 text-[11px]">
                      {activeYear?.yearcode ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            <tfoot className="hob-tfoot sticky bottom-0 border-t-2 border-purple-600 bg-purple-900">
              <tr>
                <td className="px-2 py-1.5"></td>
                <td className="px-3 py-1.5 font-black text-white uppercase tracking-wide text-xs">
                  Grand Total &mdash; {leafEntries.length} accounts
                </td>
                <td className="px-3 py-1.5 text-right font-mono font-black text-base text-amber-300">
                  {fmt(grandTotal)}
                </td>
                <td className="px-3 py-1.5 text-center text-purple-300 text-[11px]">
                  {activeYear?.startDate ?? '—'}
                </td>
                <td className="px-3 py-1.5 text-center text-purple-300 text-[11px]">
                  {activeYear?.endDate ?? '—'}
                </td>
                <td className="px-3 py-1.5 text-center text-purple-300 text-[11px]">
                  {activeYear?.yearcode ?? '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
};

export default HeadOpeningBalance;
