import React, { useEffect, useMemo, useRef, useState } from 'react';

export interface TermCol<T> {
  key: string;
  label: string;
  /** Right-aligned figures. */
  num?: boolean;
  /** CSS grid track, e.g. '90px' or 'minmax(140px, 1.5fr)'. */
  width: string;
  render: (row: T) => React.ReactNode;
  /** Value used when sorting by this column; omit to make the column unsortable. */
  sortValue?: (row: T) => string | number;
}

/**
 * Dense table with a filter box, sortable headings, J/K movement and an optional side panel.
 * Shared by every report that offers the Terminal view.
 */
function ProTerminal<T>({
  rows, cols, rowKey, searchText, strip, footer, side, sideTitle = 'SELECTED', placeholder, ariaLabel,
}: {
  rows: T[];
  cols: TermCol<T>[];
  rowKey: (row: T, index: number) => string;
  searchText: (row: T) => string;
  strip: React.ReactNode;
  /** One node per column, in order. */
  footer?: React.ReactNode[];
  side?: (row: T | undefined) => React.ReactNode;
  sideTitle?: string;
  placeholder?: string;
  ariaLabel: string;
}) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [sel, setSel] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const tpl = cols.map(c => c.width).join(' ');

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = needle ? rows.filter(r => searchText(r).toLowerCase().includes(needle)) : [...rows];
    const col = sort ? cols.find(c => c.key === sort.key) : undefined;
    if (sort && col?.sortValue) {
      const get = col.sortValue;
      list = [...list].sort((a, b) => {
        const av = get(a); const bv = get(b);
        return (typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))) * sort.dir;
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, q, sort]);

  useEffect(() => { setSel(s => Math.min(s, Math.max(0, shown.length - 1))); }, [shown.length]);
  useEffect(() => {
    bodyRef.current?.querySelector<HTMLElement>(`[data-row="${sel}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const typing = (e.target as HTMLElement).tagName === 'INPUT';
    if (e.key === '/' && !typing) { e.preventDefault(); searchRef.current?.focus(); return; }
    if (e.key === 'Escape') { setQ(''); (document.activeElement as HTMLElement | null)?.blur(); return; }
    if (typing) { if (e.key === 'ArrowDown' || e.key === 'Enter') { e.preventDefault(); (e.target as HTMLElement).blur(); bodyRef.current?.focus(); } return; }
    if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(shown.length - 1, s + 1)); }
    if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(0, s - 1)); }
    if (e.key === 'g') setSel(0);
    if (e.key === 'G') setSel(shown.length - 1);
  };

  const toggleSort = (c: TermCol<T>) => {
    if (!c.sortValue) return;
    setSort(s => (!s || s.key !== c.key ? { key: c.key, dir: -1 } : s.dir === -1 ? { key: c.key, dir: 1 } : null));
  };

  return (
    <div className="cbv cbv-term" onKeyDown={onKeyDown}>
      <div className="cbt-strip">{strip}</div>

      <div className="cbt-bar">
        <span className="cbt-prompt">&gt;</span>
        <input ref={searchRef} value={q} onChange={e => setQ(e.target.value)} placeholder={placeholder ?? 'filter rows  ( / )'} aria-label="Filter rows" />
        <span className="cbt-count">{shown.length}/{rows.length}</span>
      </div>

      <div className="cbt-main" style={side ? undefined : { gridTemplateColumns: 'minmax(0, 1fr)' }}>
        <div className="cbt-table" tabIndex={0} ref={bodyRef} role="grid" aria-label={ariaLabel}>
          <div className="cbt-row cbt-head" role="row" style={{ gridTemplateColumns: tpl }}>
            {cols.map(c => (
              <button
                key={c.key} type="button" className={c.num ? 'r' : ''} disabled={!c.sortValue} onClick={() => toggleSort(c)}
                aria-sort={sort?.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}
              >
                {c.label}{sort?.key === c.key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
              </button>
            ))}
          </div>
          {shown.map((r, i) => (
            <div key={rowKey(r, i)} data-row={i} role="row" className={`cbt-row${i === sel ? ' is-sel' : ''}`} style={{ gridTemplateColumns: tpl }} onClick={() => setSel(i)}>
              {cols.map(c => <span key={c.key} className={`${c.num ? 'r ' : ''}cbt-cell`}>{c.render(r)}</span>)}
            </div>
          ))}
          {!shown.length && <div className="cbt-empty">no row matches “{q}”</div>}
          {footer && (
            <div className="cbt-row cbt-foot" role="row" style={{ gridTemplateColumns: tpl }}>
              {footer.map((f, i) => <span key={i} className={cols[i]?.num ? 'r' : ''}>{f}</span>)}
            </div>
          )}
        </div>

        {side && (
          <aside className="cbt-side" aria-label={sideTitle}>
            <div className="cbt-side-title">{sideTitle}</div>
            {shown[sel] ? side(shown[sel]) : <div className="cbt-empty">nothing selected</div>}
          </aside>
        )}
      </div>

      <div className="cbt-keys"><b>J/K</b> move · <b>/</b> filter · <b>Esc</b> clear · <b>G / g</b> last / first · click a heading to sort</div>
    </div>
  );
}

export default ProTerminal;
