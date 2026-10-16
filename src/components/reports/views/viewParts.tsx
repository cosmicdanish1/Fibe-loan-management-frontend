import React, { useEffect, useState } from 'react';
import { fmt, fmtShort } from './format';

/** Bars and the bridge start empty and grow in once, so the day "builds up" on load. */
export const useGrown = (key: unknown) => {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    setGrown(false);
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setGrown(true)));
    return () => cancelAnimationFrame(id);
  }, [key]);
  return grown;
};

export interface RankItem { key: string; name: string; value: number; sub?: string }

/** Ranked horizontal bars. */
export const RankList: React.FC<{ rows: RankItem[]; tone: 'success' | 'danger' | 'accent'; grown: boolean; empty?: string }> = ({ rows, tone, grown, empty = 'Nothing on this side today.' }) => {
  const max = Math.max(1, ...rows.map(r => r.value));
  if (!rows.length) return <p className="cbv-muted">{empty}</p>;
  return (
    <ol className="cbv-rank">
      {rows.map((r, i) => (
        <li key={r.key}>
          <div className="cbv-rank-line">
            <span className="cbv-rank-name" title={r.name}><b>{i + 1}</b> {r.name}</span>
            <span className="cbv-num">{fmt(r.value)}</span>
          </div>
          <div className="cbv-track"><span className={`cbv-fill tone-${tone}`} style={{ width: grown ? `${(r.value / max) * 100}%` : '0%', transitionDelay: `${i * 60}ms` }} /></div>
        </li>
      ))}
    </ol>
  );
};

/** Opening → + receipts → − payments → closing, drawn as a floating-bar bridge. Handles negative balances.
 *  Drawn with HTML bars (not a stretched SVG) so the rounded corners stay round at any width. */
export const Bridge: React.FC<{ opening: number; receipts: number; payments: number; closing: number; grown: boolean }> = ({ opening, receipts, payments, closing, grown }) => {
  const afterReceipts = opening + receipts;
  const afterPayments = afterReceipts - payments;
  const levels = [0, opening, afterReceipts, afterPayments, closing];
  const hi = Math.max(...levels);
  const lo = Math.min(...levels);
  const span = hi - lo || 1;
  const pct = (v: number) => ((hi - v) / span) * 100; // distance from the top, in percent
  const steps = [
    { label: 'Opening',  from: 0,             to: opening,       tone: 'muted',   value: opening },
    { label: 'Receipts', from: opening,       to: afterReceipts, tone: 'success', value: receipts },
    { label: 'Payments', from: afterReceipts, to: afterPayments, tone: 'danger',  value: payments },
    { label: 'Closing',  from: 0,             to: closing,       tone: 'accent',  value: closing },
  ];
  return (
    <div className="cbv-bridge" role="img" aria-label="Opening balance plus receipts minus payments gives closing balance">
      <div className="cbv-bridge-plot">
        {[25, 50, 75].map(g => <i key={g} className="cbv-grid" style={{ top: `${g}%` }} />)}
        <i className="cbv-zero" style={{ top: `${pct(0)}%` }} />
        {steps.map((s, i) => {
          const top = pct(Math.max(s.from, s.to));
          const bottom = pct(Math.min(s.from, s.to));
          return (
            <span key={s.label} className="cbv-bar-col" style={{ left: `${i * 25}%` }}>
              <i
                className={`cbv-bar tone-${s.tone}`}
                style={{ top: grown ? `${top}%` : '100%', height: grown ? `max(2px, ${bottom - top}%)` : '0%', transitionDelay: `${i * 90}ms` }}
              />
            </span>
          );
        })}
      </div>
      <div className="cbv-bridge-labels">
        {steps.map(s => (
          <div key={s.label}>
            <span>{s.label}</span>
            <b className="cbv-num">{fmtShort(s.value)}</b>
          </div>
        ))}
      </div>
    </div>
  );
};
