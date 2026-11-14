import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ClipboardCopy, Delete, History, RotateCcw } from 'lucide-react';
import { copyText } from '../lib/format';

/**
 * Basic arithmetic scratch-pad. This is plain arithmetic only (+ - × ÷ % and brackets): no society rule is involved, so it is
 * the one tab that works in the browser. It uses a small parser, never eval().
 */
export function evaluate(expr: string): number {
  const s = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/,/g, '').replace(/\s+/g, '');
  if (!s) throw new Error('empty');
  let i = 0;
  const peek = () => s[i];
  const number = (): number => {
    const m = /^\d*\.?\d+(?:e[+-]?\d+)?|^\d+\.?/i.exec(s.slice(i));
    if (!m) throw new Error('number expected');
    i += m[0].length;
    return Number(m[0]);
  };
  const primary = (): number => {
    let v: number;
    if (peek() === '(') { i++; v = sum(); if (peek() !== ')') throw new Error('missing )'); i++; }
    else if (peek() === '-') { i++; v = -primary(); }
    else if (peek() === '+') { i++; v = primary(); }
    else v = number();
    while (peek() === '%') { i++; v = v / 100; }
    return v;
  };
  const product = (): number => {
    let v = primary();
    while (peek() === '*' || peek() === '/') {
      const op = s[i++];
      const r = primary();
      if (op === '/' && r === 0) throw new Error('divide by zero');
      v = op === '*' ? v * r : v / r;
    }
    return v;
  };
  const sum = (): number => {
    let v = product();
    while (peek() === '+' || peek() === '-') { const op = s[i++]; const r = product(); v = op === '+' ? v + r : v - r; }
    return v;
  };
  const out = sum();
  if (i !== s.length) throw new Error('unexpected character');
  if (!Number.isFinite(out)) throw new Error('not a number');
  return out;
}

const fmt = (n: number): string => (Number.isInteger(n) ? n.toLocaleString('en-IN') : Number(n.toFixed(8)).toLocaleString('en-IN', { maximumFractionDigits: 8 }));
const KEYS = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '.', '%', '+', '(', ')'];

const ScratchPadTab: React.FC<{ rules?: unknown }> = () => {
  const { t } = useTranslation();
  const [expr, setExpr] = useState('');
  const [hist, setHist] = useState<Array<{ e: string; r: number }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  let live: number | null = null;
  try { if (expr.trim()) live = evaluate(expr); } catch { live = null; }

  const equals = () => {
    try {
      const r = evaluate(expr);
      setHist((h) => [{ e: expr, r }, ...h].slice(0, 30));
      setExpr(String(Number(r.toFixed(10))));
      setError(null);
    } catch (e: any) { setError(e?.message === 'divide by zero' ? t('Cannot divide by zero.') : t('Check the expression.')); }
  };
  const add = (k: string) => { setExpr((x) => x + k); setError(null); ref.current?.focus(); };

  return (
    <div className="aw-fit" style={{ display: 'flex', justifyContent: 'center', padding: 'var(--aw-pad)' }}>
      <div className="aw-two" style={{ width: '100%', maxWidth: 920, alignItems: 'start' }}>
        <section className="aw-card">
          <div className="aw-card-head"><span className="aw-card-icon"><Delete size={14} /></span><h2 className="aw-card-title">{t('Scratch-pad')}</h2></div>
          <div className="aw-stack">
            <input ref={ref} className="aw-input" style={{ fontSize: 20, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }} value={expr} autoFocus
              aria-label={t('Expression')} placeholder="12500 × 12% + 300"
              onChange={(e) => { setExpr(e.target.value.replace(/[^0-9+\-*/×÷−%().,\s]/g, '')); setError(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); equals(); } if (e.key === 'Escape') setExpr(''); }} />
            <div className="aw-stat aw-stat-left tone-info" aria-live="polite">
              <span className="aw-stat-label">{t('Result')}</span>
              <div className="aw-stat-value">{live === null ? '—' : fmt(live)}</div>
            </div>
            {error && <p className="aw-muted" role="alert" style={{ color: 'var(--aw-danger)' }}>{error}</p>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {KEYS.map((k) => <button key={k} type="button" className="aw-btn aw-btn-secondary" onClick={() => add(k)}>{k}</button>)}
              <button type="button" className="aw-btn aw-btn-ghost" onClick={() => { setExpr(''); setError(null); }}><RotateCcw size={13} /> C</button>
              <button type="button" className="aw-btn aw-btn-ghost" onClick={() => setExpr((x) => x.slice(0, -1))}><Delete size={13} /></button>
              <button type="button" className="aw-btn aw-btn-primary" style={{ gridColumn: 'span 2' }} onClick={equals}>=</button>
            </div>
            <p className="aw-muted">{t('Type or tap. Enter = equals, Esc = clear. 10% means 0.10, so 5000 × 12% = 600.')}</p>
          </div>
        </section>
        <section className="aw-card">
          <div className="aw-card-head">
            <span className="aw-card-icon"><History size={14} /></span><h2 className="aw-card-title">{t('History')}</h2>
          </div>
          <div className="aw-stack">
            {hist.length === 0 && <p className="aw-muted">{t('Your calculations in this window appear here. Nothing is saved.')}</p>}
            {hist.map((h, i) => (
              <div key={i} className="aw-row" style={{ cursor: 'pointer' }} onClick={() => setExpr(String(h.r))} role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setExpr(String(h.r)); }}>
                <span className="aw-row-label">{h.e}</span><span className="aw-row-value">= {fmt(h.r)}</span>
              </div>
            ))}
            {hist.length > 0 && (
              <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" onClick={async () => {
                if (await copyText(hist.slice().reverse().map((h) => `${h.e} = ${fmt(h.r)}`).join('\n'))) { setCopied(true); setTimeout(() => setCopied(false), 1800); }
              }}>{copied ? <Check size={13} /> : <ClipboardCopy size={13} />} {copied ? t('Copied') : t('Copy history')}</button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ScratchPadTab;
