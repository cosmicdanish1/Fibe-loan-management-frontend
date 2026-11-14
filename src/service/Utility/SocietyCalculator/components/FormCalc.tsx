import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ClipboardCopy, Plus, RotateCcw, Trash2, Wallet } from 'lucide-react';
import { CalcStatus, ChipGroup, DateField, NumField, WaitingForInput } from './parts';
import { GenericResultView, genericStatement } from './GenericResult';
import { copyText, todayYmd, toNum } from '../lib/format';
import { useServerCalc } from '../lib/useServerCalc';
import type { GenericResult } from '../lib/types';

export type ColDef =
  | { key: string; label: string; type: 'number' | 'text'; width?: number | undefined }
  | { key: string; label: string; type: 'date' }
  | { key: string; label: string; type: 'select'; options: Array<{ value: string; label: string }> };

export type FieldDef =
  | { type: 'number' | 'int'; key: string; label: string; def?: string | undefined; hint?: string | undefined; required?: boolean | undefined }
  | { type: 'date'; key: string; label: string; def?: string | undefined; hint?: string | undefined; required?: boolean | undefined }
  | { type: 'select'; key: string; label: string; options: Array<{ value: string; label: string }>; def: string; hint?: string | undefined }
  | { type: 'rows'; key: string; label: string; columns: ColDef[]; defRows?: Array<Record<string, string>> | undefined; hint?: string | undefined; max?: number | undefined };

export interface SectionDef { title: string; icon: React.ReactNode; fields: FieldDef[] }

type Values = Record<string, string | Array<Record<string, string>>>;

const initial = (sections: SectionDef[]): Values => {
  const v: Values = {};
  sections.forEach((s) => s.fields.forEach((f) => {
    if (f.type === 'rows') v[f.key] = (f.defRows ?? []).map((r) => ({ ...r }));
    else if (f.type === 'select') v[f.key] = f.def;
    else if (f.type === 'date') v[f.key] = f.def === 'today' || f.def === undefined ? todayYmd() : f.def;
    else v[f.key] = f.def ?? '';
  }));
  return v;
};

/**
 * A calculator tab made from a field list: it builds the request, calls the server (debounced) and shows the generic
 * result. Rows (lists such as deposits or month-end balances) are edited in a small table. Nothing here does any maths.
 */
const FormCalc: React.FC<{ kind: string; title: string; sections: SectionDef[]; waiting: string }> = ({ kind, title, sections, waiting }) => {
  const { t } = useTranslation();
  const [values, setValues] = useState<Values>(() => initial(sections));
  const [copied, setCopied] = useState(false);
  const set = (k: string, v: string | Array<Record<string, string>>) => setValues((p) => ({ ...p, [k]: v }));

  const body = useMemo(() => {
    const b: Record<string, unknown> = {};
    for (const s of sections) {
      for (const f of s.fields) {
        const v = values[f.key];
        if (f.type === 'rows') {
          const numCols = f.columns.filter((c) => c.type === 'number');
          // a row counts once it has something typed and every number column filled (blank month rows are ignored)
          const rows = (Array.isArray(v) ? v : []).filter((r) => Object.entries(r).some(([k, x]) => String(x ?? '').trim() !== '' && f.columns.find((c) => c.key === k)?.type !== 'select')
            && numCols.every((c) => String(r[c.key] ?? '').trim() !== ''));
          b[f.key] = rows.map((r) => {
            const o: Record<string, unknown> = {};
            f.columns.forEach((c) => {
              const raw = String(r[c.key] ?? '').trim();
              if (raw === '') return;
              o[c.key] = c.type === 'number' ? Number(raw) : raw;
            });
            return o;
          });
        } else if (f.type === 'number' || f.type === 'int') {
          const raw = String(v ?? '').trim();
          if (raw === '') { if (f.required) return null; continue; }
          const n = toNum(raw);
          if (!Number.isFinite(n)) return null;
          b[f.key] = n;
        } else {
          const raw = String(v ?? '').trim();
          if (raw === '') { if (f.type === 'date' && f.required) return null; continue; }
          b[f.key] = raw;
        }
      }
    }
    return b;
  }, [values, sections]);

  const { data, error, fieldErrors, loading } = useServerCalc<GenericResult>(kind, body);

  const reset = () => setValues(initial(sections));
  const copy = async () => {
    if (data && (await copyText(genericStatement(title, data)))) { setCopied(true); setTimeout(() => setCopied(false), 1800); }
  };

  const renderField = (f: FieldDef) => {
    const v = values[f.key];
    if (f.type === 'number' || f.type === 'int') {
      return <NumField key={f.key} id={`fc-${kind}-${f.key}`} label={f.label} value={String(v ?? '')} onChange={(x) => set(f.key, x)} kind={f.type === 'int' ? 'int' : 'decimal'} hint={f.hint} />;
    }
    if (f.type === 'date') {
      return <DateField key={f.key} id={`fc-${kind}-${f.key}`} label={f.label} value={String(v ?? '')} onChange={(x) => set(f.key, x)} hint={f.hint} />;
    }
    if (f.type === 'select') {
      return <ChipGroup key={f.key} label={f.label} value={String(v ?? f.def)} onChange={(x) => set(f.key, x)} options={f.options} />;
    }
    const rf = f as Extract<FieldDef, { type: 'rows' }>;
    const rows = Array.isArray(v) ? v : [];
    const upd = (i: number, ck: string, val: string) => set(rf.key, rows.map((r, j) => (j === i ? { ...r, [ck]: val } : r)));
    return (
      <div key={rf.key} className="aw-stack">
        <span className="aw-label">{rf.label}</span>
        {rf.hint && <p className="aw-muted">{rf.hint}</p>}
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: `repeat(${rf.columns.length}, minmax(0, 1fr)) 28px`, gap: 6, alignItems: 'center' }}>
            {rf.columns.map((c) => {
              if (c.type === 'select') {
                return (
                  <select key={c.key} className="aw-input" aria-label={c.label} value={r[c.key] ?? ''} onChange={(e) => upd(i, c.key, e.target.value)}>
                    {c.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                );
              }
              return (
                <input key={c.key} className="aw-input" aria-label={c.label} placeholder={c.label}
                  type={c.type === 'date' ? 'date' : 'text'} inputMode={c.type === 'number' ? 'decimal' : undefined} value={r[c.key] ?? ''}
                  onChange={(e) => upd(i, c.key, c.type === 'number' ? e.target.value.replace(/[^0-9.\-]/g, '') : e.target.value)} />
              );
            })}
            <button type="button" className="aw-icon-btn" aria-label={t('Remove row')} onClick={() => set(rf.key, rows.filter((_, j) => j !== i))}><Trash2 size={13} /></button>
          </div>
        ))}
        {(rf.max === undefined || rows.length < rf.max) && (
          <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" onClick={() => set(rf.key, [...rows, Object.fromEntries(rf.columns.map((c) => [c.key, c.type === 'select' ? c.options[0]?.value ?? '' : '']))])}>
            <Plus size={13} /> {t('Add row')}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="aw-split">
      <div className="aw-side">
        {sections.map((s) => (
          <section key={s.title} className="aw-card">
            <div className="aw-card-head"><span className="aw-card-icon">{s.icon}</span><h2 className="aw-card-title">{t(s.title)}</h2></div>
            <div className="aw-stack">{s.fields.map(renderField)}</div>
          </section>
        ))}
      </div>
      <section className="aw-card aw-main">
        <div className="aw-main-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span className="aw-strong">{t(title)}</span>
          <div className="aw-actions">
            <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" onClick={copy} disabled={!data}>
              {copied ? <Check size={13} /> : <ClipboardCopy size={13} />} {copied ? t('Copied') : t('Copy statement')}
            </button>
            <button type="button" className="aw-btn aw-btn-ghost aw-btn-sm" onClick={reset}><RotateCcw size={13} /> {t('Reset')}</button>
          </div>
        </div>
        <div className="aw-main-body">
          <div className="aw-stack">
            <CalcStatus loading={loading} error={error} fieldErrors={fieldErrors} />
            {data ? <GenericResultView result={data} dim={loading} /> : !error && <WaitingForInput icon={<Wallet size={20} />} text={t(waiting)} />}
          </div>
        </div>
      </section>
    </div>
  );
};

export default FormCalc;
