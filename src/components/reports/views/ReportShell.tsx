import React from 'react';
import { Monitor, Printer, Settings } from 'lucide-react';

/**
 * Window shell for a report: page header, an optional left column (parameters and
 * balances) and the report area. It follows design.md: Reset is a quiet button, Print
 * is secondary, and the Generate / Load button in the parameters card is the one
 * primary action. The shell never changes what the report body looks like.
 */
export const ReportShell: React.FC<{
  title: string;
  desc?: string;
  /** Header buttons, right-aligned (Reset, Print, ...). */
  actions?: React.ReactNode;
  /** The Legacy / Pro view switch. */
  switcher?: React.ReactNode;
  /** Left column. Leave out for a report with no parameters. */
  aside?: React.ReactNode;
  asideWidth?: number;
  footerLeft?: string;
  footerRight?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ title, desc, actions, switcher, aside, asideWidth = 240, footerLeft, footerRight, className = '', children }) => (
  <div className={`app-window ${className}`}>
    <div className="aw-header aw-ambient">
      <div className="min-w-0">
        <h1 className="aw-title">{title}</h1>
        {desc && <p className="aw-desc">{desc}</p>}
      </div>
      <div className="aw-actions">
        {switcher}
        {actions}
      </div>
    </div>

    <div className="aw-content">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--aw-gap)' }}>
        {aside && <aside className="aw-stack" style={{ width: asideWidth, flex: 'none', position: 'sticky', top: 0 }}>{aside}</aside>}
        <div className="aw-stack" style={{ flex: 1, minWidth: 0 }}>{children}</div>
      </div>
    </div>

    {(footerLeft || footerRight) && (
      <div className="aw-footer">
        <span>{footerLeft}</span>
        <span>{footerRight}</span>
      </div>
    )}
  </div>
);

/** The "Parameters" card at the top of the left column. */
export const ParamCard: React.FC<{ title?: string; icon?: React.ReactNode; children: React.ReactNode }> = ({ title = 'Parameters', icon, children }) => (
  <section className="aw-card">
    <div className="aw-card-head">
      <span className="aw-card-icon">{icon ?? <Settings size={14} />}</span>
      <h2 className="aw-card-title">{title}</h2>
    </div>
    <div className="aw-stack">{children}</div>
  </section>
);

export type StatTone = 'muted' | 'success' | 'danger' | 'info' | 'warning';

/** Small stacked figures under the parameters, as the report windows have always had. */
export const StatCards: React.FC<{ items: { label: string; value: string; tone?: StatTone }[] }> = ({ items }) => (
  <>
    {items.map(s => (
      <section key={s.label} className="aw-card" style={{ padding: 'calc(var(--aw-pad) * .8)' }}>
        <span className="aw-label" style={{ marginBottom: 2 }}>{s.label}</span>
        <span className={`aw-pill tone-${s.tone ?? 'muted'}`} style={{ alignSelf: 'flex-start', fontSize: 'var(--type-panel-title)', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{s.value}</span>
      </section>
    ))}
  </>
);

/** Screen / Printer choice. "Printer" prints straight after the report is generated. */
export const OutputChoice: React.FC<{ value: 'screen' | 'printer'; onChange: (v: 'screen' | 'printer') => void; id?: string }> = ({ value, onChange, id }) => (
  <div>
    <span className="aw-label" id={id}>Output</span>
    <div className="aw-chips" role="radiogroup" aria-labelledby={id}>
      <button type="button" role="radio" aria-checked={value === 'screen'} className="aw-chip" onClick={() => onChange('screen')}><Monitor size={12} style={{ marginRight: 5 }} /> Screen</button>
      <button type="button" role="radio" aria-checked={value === 'printer'} className="aw-chip" onClick={() => onChange('printer')}><Printer size={12} style={{ marginRight: 5 }} /> Printer</button>
    </div>
  </div>
);

/** Empty state for the report area. */
export const ReportEmpty: React.FC<{ icon: React.ReactNode; title: string; hint?: string }> = ({ icon, title, hint }) => (
  <section className="aw-card">
    <div className="aw-empty" style={{ padding: 32 }}>
      {icon}
      <p className="aw-strong">{title}</p>
      {hint && <span className="aw-meta">{hint}</span>}
    </div>
  </section>
);

/** The monospace legacy document panel, exactly as the old windows showed it. */
export const LegacyDocument: React.FC<{
  title: string;
  meta?: string | undefined;
  text: string;
  loading: boolean;
  small?: boolean | undefined;
  empty: React.ReactNode;
}> = ({ title, meta, text, loading, small, empty }) => (
  <section className="aw-card" style={{ padding: 0, overflow: 'hidden' }}>
    <div className="aw-main-head">
      <span className="aw-card-title">{title}</span>
      {meta && <span className="aw-meta">{meta}</span>}
    </div>
    <div className="rpt-legacy-doc" style={{ padding: 'var(--aw-pad)', overflow: 'auto', minHeight: 160 }}>
      {text ? (
        <pre className={`font-mono ${small ? 'fz-small' : 'fz-caption'} select-text`} style={{ margin: 0, whiteSpace: 'pre', lineHeight: 1.5, color: 'var(--aw-text)' }}>{text}</pre>
      ) : loading ? <p className="aw-meta">Loading…</p> : empty}
    </div>
  </section>
);
