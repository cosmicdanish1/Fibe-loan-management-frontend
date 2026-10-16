import React, { useEffect, useMemo, useRef, useState } from 'react';
import { fmt, deriveCashBook, type CashBook2Summary, type CashBookEntry } from './cashBookModel';

type SortKey = 'headCode' | 'headName' | 'receiptCash' | 'receiptTransfer' | 'paymentCash' | 'paymentTransfer';

const COLS: { key: SortKey; label: string; num: boolean; tone?: 'success' | 'danger' }[] = [
  { key: 'headCode',        label: 'CODE',        num: false },
  { key: 'headName',        label: 'HEAD',        num: false },
  { key: 'receiptCash',     label: 'RCPT CASH',   num: true, tone: 'success' },
  { key: 'receiptTransfer', label: 'RCPT XFER',   num: true, tone: 'success' },
  { key: 'paymentCash',     label: 'PAY CASH',    num: true, tone: 'danger' },
  { key: 'paymentTransfer', label: 'PAY XFER',    num: true, tone: 'danger' },
];

const CashBookTerminal: React.FC<{ data: CashBook2Summary }> = ({ data }) => {
  const dv = useMemo(() => deriveCashBook(data), [data]);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);
  const [sel, setSel] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list: CashBookEntry[] = needle ? data.entries.filter(e => `${e.headCode} ${e.headName}`.toLowerCase().includes(needle)) : [...data.entries];
    if (sort) {
      const { key, dir } = sort;
      list = [...list].sort((a, b) => {
        const av = a[key]; const bv = b[key];
        return (typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))) * dir;
      });
    }
    return list;
  }, [data.entries, q, sort]);

  useEffect(() => { setSel(s => Math.min(s, Math.max(0, rows.length - 1))); }, [rows.length]);

  // Keep the selected row in view while moving with the keyboard.
  useEffect(() => {
    bodyRef.current?.querySelector<HTMLElement>(`[data-row="${sel}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const typing = (e.target as HTMLElement).tagName === 'INPUT';
    if (e.key === '/' && !typing) { e.preventDefault(); searchRef.current?.focus(); return; }
    if (e.key === 'Escape') { setQ(''); (document.activeElement as HTMLElement | null)?.blur(); return; }
    if (typing) { if (e.key === 'ArrowDown' || e.key === 'Enter') { e.preventDefault(); (e.target as HTMLElement).blur(); bodyRef.current?.focus(); } return; }
    if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(rows.length - 1, s + 1)); }
    if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(0, s - 1)); }
    if (e.key === 'g') setSel(0);
    if (e.key === 'G') setSel(rows.length - 1);
  };

  const cur = rows[sel];
  const toggleSort = (key: SortKey) => setSort(s => (!s || s.key !== key ? { key, dir: -1 } : s.dir === -1 ? { key, dir: 1 } : null));

  return (
    <div className="cbv cbv-term" onKeyDown={onKeyDown}>
      <div className="cbt-strip">
        <span>OPEN <b className="cbv-num">{fmt(data.openingBalance)}</b></span>
        <span className="tone-success">RCPT <b className="cbv-num">{fmt(data.totalReceipts)}</b></span>
        <span className="tone-danger">PAY <b className="cbv-num">{fmt(data.totalPayments)}</b></span>
        <span>CLOSE <b className="cbv-num">{fmt(data.closingBalance)}</b></span>
        <span className={dv.balanced ? 'tone-success' : 'tone-warning'}>{dv.balanced ? '✓ BALANCED' : `Δ ${fmt(dv.difference)}`}</span>
      </div>

      <div className="cbt-bar">
        <span className="cbt-prompt">&gt;</span>
        <input ref={searchRef} value={q} onChange={e => setQ(e.target.value)} placeholder="filter head or code  ( / )" aria-label="Filter heads" />
        <span className="cbt-count">{rows.length}/{data.entries.length}</span>
      </div>

      <div className="cbt-main">
        <div className="cbt-table" tabIndex={0} ref={bodyRef} role="grid" aria-label="Heads">
          <div className="cbt-row cbt-head" role="row">
            {COLS.map(c => (
              <button key={c.key} type="button" className={c.num ? 'r' : ''} onClick={() => toggleSort(c.key)} aria-sort={sort?.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
                {c.label}{sort?.key === c.key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
              </button>
            ))}
          </div>
          {rows.map((e, i) => (
            <div key={e.headCode + i} data-row={i} role="row" className={`cbt-row${i === sel ? ' is-sel' : ''}`} onClick={() => setSel(i)}>
              <span className="cbt-code">{e.headCode}</span>
              <span className="cbt-name" title={e.headName}>{e.headName}</span>
              {COLS.slice(2).map(c => {
                const v = Number(e[c.key]);
                return <span key={c.key} className={`r cbv-num ${v > 0 ? `tone-${c.tone}` : 'cbv-faint'}`}>{v > 0 ? fmt(v) : '·'}</span>;
              })}
            </div>
          ))}
          {!rows.length && <div className="cbt-empty">no head matches “{q}”</div>}
          <div className="cbt-row cbt-foot" role="row">
            <span /><span>TOTAL</span>
            <span className="r cbv-num tone-success">{fmt(data.totalReceiptsCash)}</span>
            <span className="r cbv-num tone-success">{fmt(data.totalReceiptsTransfer)}</span>
            <span className="r cbv-num tone-danger">{fmt(data.totalPaymentsCash)}</span>
            <span className="r cbv-num tone-danger">{fmt(data.totalPaymentsTransfer)}</span>
          </div>
        </div>

        <aside className="cbt-side" aria-label="Selected head">
          <div className="cbt-side-title">SELECTED</div>
          {cur ? (
            <>
              <div className="cbt-side-head">{cur.headName}</div>
              <div className="cbt-side-code">{cur.headCode}</div>
              <dl>
                <div><dt>Receipt total</dt><dd className="cbv-num tone-success">{fmt(cur.receipt)}</dd></div>
                <div><dt>· cash</dt><dd className="cbv-num">{fmt(cur.receiptCash)}</dd></div>
                <div><dt>· transfer</dt><dd className="cbv-num">{fmt(cur.receiptTransfer)}</dd></div>
                <div><dt>Payment total</dt><dd className="cbv-num tone-danger">{fmt(cur.payment)}</dd></div>
                <div><dt>· cash</dt><dd className="cbv-num">{fmt(cur.paymentCash)}</dd></div>
                <div><dt>· transfer</dt><dd className="cbv-num">{fmt(cur.paymentTransfer)}</dd></div>
                <div><dt>Share of receipts</dt><dd className="cbv-num">{data.totalReceipts > 0 ? ((cur.receipt / data.totalReceipts) * 100).toFixed(1) : '0.0'}%</dd></div>
                <div><dt>Share of payments</dt><dd className="cbv-num">{data.totalPayments > 0 ? ((cur.payment / data.totalPayments) * 100).toFixed(1) : '0.0'}%</dd></div>
              </dl>
            </>
          ) : <div className="cbt-empty">nothing selected</div>}
        </aside>
      </div>

      <div className="cbt-keys"><b>J/K</b> move · <b>/</b> filter · <b>Esc</b> clear · <b>G / g</b> last / first · click a heading to sort</div>
    </div>
  );
};

export default CashBookTerminal;
