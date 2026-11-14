import React from 'react';
import { AlertTriangle, ListChecks } from 'lucide-react';
import { Kpi, SectionHead } from './parts';
import { money, num2 } from '../lib/format';
import type { CellKind, GenericKpi, GenericResult } from '../lib/types';

export const fmtCell = (v: unknown, kind: CellKind | undefined): string => {
  if (v === null || v === undefined || v === '') return '-';
  if (kind === 'money') return money(Number(v));
  if (kind === 'pct') return `${num2(Number(v))} %`;
  if (kind === 'int') return String(v);
  if (kind === 'num') return typeof v === 'number' ? String(v) : String(v);
  return String(v);
};
const TONE: Record<string, 'tone-info' | 'tone-success' | 'tone-warning' | 'tone-danger'> = {
  info: 'tone-info', success: 'tone-success', warning: 'tone-warning', danger: 'tone-danger',
};

/** Plain-text statement of a generic result (for the Copy statement button). */
export function genericStatement(title: string, r: GenericResult): string {
  const lines: string[] = [`SOCIETY CALCULATOR - ${title.toUpperCase()}`, ''];
  r.kpis.forEach((k) => lines.push(`${k.label.padEnd(34)}: ${fmtCell(k.value, k.kind)}${k.sub ? `  (${k.sub})` : ''}`));
  if (r.steps.length) { lines.push('', 'How it is worked out:'); r.steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`)); }
  r.tables.forEach((t) => {
    lines.push('', t.title, t.columns.map((c) => c.label).join(' | '));
    t.rows.forEach((row) => lines.push(t.columns.map((c) => fmtCell(row[c.key], c.kind)).join(' | ')));
    if (t.totals) lines.push(`Total: ${t.columns.filter((c) => t.totals![c.key] !== undefined).map((c) => `${c.label} ${fmtCell(t.totals![c.key], c.kind)}`).join(', ')}`);
  });
  if (r.notes.length) { lines.push('', ...r.notes.map((n) => `Note: ${n}`)); }
  return lines.join('\n');
}

/** One generic view for every calculator that returns { kpis, tables, steps, notes }. */
export const GenericResultView: React.FC<{ result: GenericResult; dim?: boolean }> = ({ result, dim }) => (
  <div className="aw-stack aw-fade-in" style={{ opacity: dim ? 0.65 : 1, transition: 'opacity .15s' }}>
    {result.kpis.length > 0 && (
      <div className={`aw-stats ${result.kpis.length >= 4 ? 'aw-stats-4' : 'aw-stats-3'}`}>
        {result.kpis.map((k: GenericKpi) => (
          <Kpi key={k.label} icon={null} label={k.label} value={fmtCell(k.value, k.kind)} tone={TONE[k.tone ?? 'info'] ?? 'tone-info'} sub={k.sub} />
        ))}
      </div>
    )}
    {result.notes.map((n, i) => (
      <div key={i} className="aw-alert aw-alert-warning" role="status"><AlertTriangle size={14} /><span>{n}</span></div>
    ))}
    {result.steps.length > 0 && (
      <div className="aw-panel aw-panel-accent">
        <SectionHead icon={<ListChecks size={14} style={{ color: 'var(--aw-accent)' }} />} title="How this is worked out" />
        <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {result.steps.map((s, i) => <li key={i} className="aw-muted" style={{ lineHeight: 1.5 }}>{s}</li>)}
        </ol>
      </div>
    )}
    {result.tables.map((t) => (
      <div key={t.title} className="aw-stack">
        <span className="aw-stat-label">{t.title}</span>
        <div className="aw-table-wrap">
          <table className="aw-table">
            <thead><tr>{t.columns.map((c) => <th key={c.key} className={c.kind && c.kind !== 'text' ? 'is-right' : ''}>{c.label}</th>)}</tr></thead>
            <tbody>
              {t.rows.map((row, i) => (
                <tr key={i}>{t.columns.map((c) => <td key={c.key} className={c.kind && c.kind !== 'text' ? 'is-right' : ''}>{fmtCell(row[c.key], c.kind)}</td>)}</tr>
              ))}
              {t.totals && (
                <tr>{t.columns.map((c, i) => <td key={c.key} className={`is-accent ${c.kind && c.kind !== 'text' ? 'is-right' : ''}`}>{i === 0 ? 'Total' : t.totals![c.key] !== undefined ? fmtCell(t.totals![c.key], c.kind) : ''}</td>)}</tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    ))}
  </div>
);
