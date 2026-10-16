import React, { useMemo, useState } from 'react';
import { BarChart3, Search } from 'lucide-react';
import ProTerminal, { type TermCol } from './ProTerminal';
import { RankList, useGrown, type RankItem } from './viewParts';

/**
 * Describes a table-shaped report once; `GenericBento` and `GenericTerminal` draw it.
 * Windows with a richer story (bridges, rings) build their own views instead.
 */
export type ProTone = 'success' | 'danger' | 'accent' | 'warning' | 'muted';

export interface ProSpec<T> {
  ariaLabel: string;
  rows: T[];
  rowKey: (row: T, index: number) => string;
  /** width is the Terminal grid track; Bento ignores it. */
  cols: TermCol<T>[];
  searchText: (row: T) => string;
  /** The first figure is the hero tile; the rest are small tiles. */
  kpis: { label: string; value: string; tone?: ProTone }[];
  heroNote?: string;
  /** "Where does the money sit" bars; each entry is one tile. */
  ranks?: { title: string; tone: 'success' | 'danger' | 'accent'; rows: RankItem[] }[];
  /** One node per column, in order. */
  footer?: React.ReactNode[];
  side?: (row: T | undefined) => React.ReactNode;
  sideTitle?: string;
  tableTitle?: string;
  /** Rows shown in the Bento table before "show all". */
  bentoLimit?: number;
}

export function GenericBento<T>({ spec }: { spec: ProSpec<T> }) {
  const grown = useGrown(spec.rows.length + (spec.kpis[0]?.value ?? ''));
  const [q, setQ] = useState('');
  const [all, setAll] = useState(false);
  const limit = spec.bentoLimit ?? 200;
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? spec.rows.filter(r => spec.searchText(r).toLowerCase().includes(needle)) : spec.rows;
  }, [spec, q]);
  const shown = all ? rows : rows.slice(0, limit);
  const [hero, ...rest] = spec.kpis;

  return (
    <div className="cbv cbv-bento">
      {hero && (
        <section className="cbv-tile cbv-hero">
          <header><span className="cbv-icon tone-accent"><BarChart3 size={15} /></span><h3>{hero.label}</h3></header>
          <div className={`cbv-hero-num cbv-num tone-${hero.tone ?? 'accent'}`}>{hero.value}</div>
          {spec.heroNote && <p className="cbv-muted">{spec.heroNote}</p>}
        </section>
      )}
      {rest.map(k => (
        <section key={k.label} className="cbv-tile">
          <header><h3 className="cbv-muted">{k.label}</h3></header>
          <div className={`cbv-big cbv-num tone-${k.tone ?? 'muted'}`}>{k.value}</div>
        </section>
      ))}
      {spec.ranks?.map(r => (
        <section key={r.title} className="cbv-tile cbv-wide">
          <header><h3>{r.title}</h3></header>
          <RankList rows={r.rows} tone={r.tone} grown={grown} />
        </section>
      ))}
      <section className="cbv-tile cbv-wide">
        <header>
          <h3>{spec.tableTitle ?? 'All rows'}</h3>
          <label className="cbv-search"><Search size={13} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search rows" aria-label="Search rows" /></label>
        </header>
        <div className="cbv-scroll">
          <table className="cbv-table">
            <thead><tr>{spec.cols.map(c => <th key={c.key} className={c.num ? 'r' : ''}>{c.label}</th>)}</tr></thead>
            <tbody>
              {shown.map((r, i) => <tr key={spec.rowKey(r, i)}>{spec.cols.map(c => <td key={c.key} className={c.num ? 'r cbv-num' : ''}>{c.render(r)}</td>)}</tr>)}
              {!rows.length && <tr><td colSpan={spec.cols.length} className="cbv-muted" style={{ textAlign: 'center', padding: 18 }}>No row matches “{q}”.</td></tr>}
            </tbody>
            {spec.footer && <tfoot><tr>{spec.footer.map((f, i) => <td key={i} className={spec.cols[i]?.num ? 'r cbv-num' : ''}>{f}</td>)}</tr></tfoot>}
          </table>
        </div>
        {rows.length > limit && !all && <button type="button" className="aw-btn aw-btn-secondary" onClick={() => setAll(true)}>Show all {rows.length} rows</button>}
      </section>
    </div>
  );
}

export function GenericTerminal<T>({ spec }: { spec: ProSpec<T> }) {
  return (
    <ProTerminal<T>
      ariaLabel={spec.ariaLabel}
      rows={spec.rows}
      cols={spec.cols}
      rowKey={spec.rowKey}
      searchText={spec.searchText}
      placeholder="filter rows  ( / )"
      strip={<>{spec.kpis.map(k => <span key={k.label} className={k.tone && k.tone !== 'muted' ? `tone-${k.tone}` : ''}>{k.label.toUpperCase()} <b className="cbv-num">{k.value}</b></span>)}</>}
      {...(spec.footer ? { footer: spec.footer } : {})}
      {...(spec.side ? { side: spec.side } : {})}
      {...(spec.sideTitle ? { sideTitle: spec.sideTitle } : {})}
    />
  );
}

/** Editorial statement for a table-shaped report: letterhead, rows, summary, signatures. */
export function GenericEditorial<T>({ spec, title, subtitle }: { spec: ProSpec<T>; title: string; subtitle: string }) {
  return (
    <div className="cbv cbv-ed">
      <article className="cbe-sheet">
        <header className="cbe-head">
          <div className="cbe-eyebrow">Statement</div>
          <h2>Espat Karmchari Co-Operative Credit Society Limited</h2>
          <p>Avenue A, Sahakari Sadan, Sector-C, AT Post: Bhilai Nagar, Dist: DURG-490006</p>
          <div className="cbe-rule" />
          <div className="cbe-title"><span>{title}</span><span>{subtitle}</span></div>
        </header>
        <section className="cbe-voucher">
          <table className="cbe-table">
            <thead><tr>{spec.cols.map(c => <th key={c.key} className={c.num ? '' : 'l'}>{c.label}</th>)}</tr></thead>
            <tbody>
              {spec.rows.map((r, i) => <tr key={spec.rowKey(r, i)}>{spec.cols.map(c => <td key={c.key} className={c.num ? 'cbv-num' : 'l'}>{c.render(r)}</td>)}</tr>)}
            </tbody>
          </table>
        </section>
        <section className="cbe-balance" aria-label="Summary">
          <dl>{spec.kpis.map(k => <div key={k.label}><dt>{k.label}</dt><dd className="cbv-num">{k.value}</dd></div>)}</dl>
        </section>
        <footer className="cbe-sign">{['Cashier', 'Accountant', 'Manager'].map(r => <div key={r}><span /> {r}</div>)}</footer>
      </article>
    </div>
  );
}
