import React from 'react';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import { AlertCircle, Loader2 } from 'lucide-react';
import { cleanDecimal, cleanInt } from '../lib/format';

/** One labelled number box. `kind` keeps the typing clean (digits / decimal); the parent holds the text. */
export const NumField: React.FC<{
  id: string; label: string; value: string; onChange: (v: string) => void;
  kind?: 'int' | 'decimal'; prefix?: React.ReactNode | undefined; suffix?: string | undefined; hint?: string | undefined; disabled?: boolean | undefined; placeholder?: string | undefined;
}> = ({ id, label, value, onChange, kind = 'decimal', prefix, suffix, hint, disabled, placeholder }) => (
  <div>
    <label className="aw-label" htmlFor={id}>{label}</label>
    <div className={`aw-input-wrap ${prefix ? 'has-icon' : ''}`}>
      {prefix}
      <input
        id={id} type="text" inputMode={kind === 'int' ? 'numeric' : 'decimal'} autoComplete="off" disabled={disabled}
        value={value} placeholder={placeholder}
        onChange={(e) => onChange(kind === 'int' ? cleanInt(e.target.value) : cleanDecimal(e.target.value))}
        className="aw-input" style={suffix ? { paddingRight: 34 } : undefined}
      />
      {suffix && <span className="aw-meta" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>{suffix}</span>}
    </div>
    {hint && <p className="aw-muted" style={{ marginTop: 3 }}>{hint}</p>}
  </div>
);

/** A date box that holds 'YYYY-MM-DD' text, the same form the server wants. */
export const DateField: React.FC<{ id: string; label: string; value: string; onChange: (v: string) => void; hint?: string | undefined }> = ({ id, label, value, onChange, hint }) => (
  <div>
    <label className="aw-label" htmlFor={id}>{label}</label>
    <DatePicker
      id={id} className="aw-picker" style={{ width: '100%' }} format="DD-MM-YYYY" allowClear={false}
      value={value ? dayjs(value, 'YYYY-MM-DD') : null}
      onChange={(d) => { if (d) onChange(d.format('YYYY-MM-DD')); }}
    />
    {hint && <p className="aw-muted" style={{ marginTop: 3 }}>{hint}</p>}
  </div>
);

/** A row of mutually exclusive chips (role radio group). */
export function ChipGroup<T extends string>({ label, value, options, onChange }: {
  label?: string | undefined; value: T; options: Array<{ value: T; label: string; tip?: string | undefined }>; onChange: (v: T) => void;
}) {
  return (
    <div>
      {label && <span className="aw-label">{label}</span>}
      <div className="aw-chips" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className="aw-chip"
            onClick={() => onChange(o.value)} data-tip={o.tip}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Headline number. */
export const Kpi: React.FC<{ icon: React.ReactNode; label: string; value: string; tone?: 'tone-info' | 'tone-success' | 'tone-warning' | 'tone-danger'; sub?: string | undefined }> = ({ icon, label, value, tone = 'tone-info', sub }) => (
  <div className={`aw-stat aw-stat-left ${tone}`}>
    <div className="aw-stat-head">{icon}<span className="aw-stat-label">{label}</span></div>
    <div className="aw-stat-value">{value}</div>
    {sub && <div className="aw-meta" style={{ marginTop: 4 }}>{sub}</div>}
  </div>
);

/** Calculation status line: spinner while the server works, red box for a refused input. */
export const CalcStatus: React.FC<{ loading: boolean; error: string | null; fieldErrors?: Array<{ field?: string | undefined; message: string }> | undefined }> = ({ loading, error, fieldErrors }) => (
  <>
    {loading && (
      <span className="aw-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} role="status">
        <Loader2 size={12} className="aw-spin" /> Calculating...
      </span>
    )}
    {error && (
      <div className="aw-alert aw-alert-danger aw-fade-in" role="alert">
        <AlertCircle size={14} />
        <div>
          <div>{error}</div>
          {fieldErrors && fieldErrors.length > 0 && (
            <ul style={{ margin: '4px 0 0 16px', listStyle: 'disc' }}>
              {fieldErrors.map((f, i) => <li key={i}>{f.message}</li>)}
            </ul>
          )}
        </div>
      </div>
    )}
  </>
);

/** Section heading inside the main panel. */
export const SectionHead: React.FC<{ icon: React.ReactNode; title: string; right?: React.ReactNode | undefined }> = ({ icon, title, right }) => (
  <div className="aw-stat-head" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {icon}<span className="aw-stat-label">{title}</span>
    </span>
    {right}
  </div>
);

/** Empty state shown before the first result. */
export const WaitingForInput: React.FC<{ text: string; icon: React.ReactNode }> = ({ text, icon }) => (
  <div className="aw-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '48px 16px' }}>
    <span className="aw-icon-tile">{icon}</span>
    <p className="aw-muted">{text}</p>
  </div>
);
