import React, { useEffect, useMemo, useRef, useState } from 'react';
import { fmt, deriveRough, type CashBookRoughData, type FlatRow } from './roughModel';

type SortKey = 'voucherNo' | 'memberNo' | 'mode' | 'headName' | 'payment' | 'receipt';

const COLS: { key: SortKey; label: string; num: boolean }[] = [
  { key: 'voucherNo', label: 'VOUCHER', num: false },
  { key: 'memberNo',  label: 'MEMBER',  num: false },
  { key: 'mode',      label: 'MODE',    num: false },
  { key: 'headName',  label: 'HEAD',    num: false },
  { key: 'payment',   label: 'PAYMENT', num: true },
  { key: 'receipt',   label: 'RECEIPT', num: true },
];

const RoughTerminal: React.FC<{ data: CashBookRoughData }> = ({ data }) => {
  const dv = useMemo(() => deriveRough(data), [data]);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);
  const [sel, setSel] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list: FlatRow[] = needle
      ? dv.flat.filter(r => `${r.voucherNo} ${r.memberNo} ${r.memberName} ${r.mode} ${r.headCode} ${r.headName} ${r.description} ${r.narration}`.toLowerCase().includes(needle))
      : [...dv.flat];
    if (sort) {
      const { key, dir } = sort;
      list = [...list].sort((a, b) => {
        const av = a[key]; const bv = b[key];
        return (typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))) * dir;
      });
    }
    return list;
  }, [dv.flat, q, sort]);

  useEffect(() => { setSel(s => Math.min(s, Math.max(0, rows.length - 1))); }, [rows.length]);
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
  const curVoucher = cur ? data.vouchers[cur.voucherIdx] : undefined;
  const toggleSort = (key: SortKey) => setSort(s => (!s || s.key !== key ? { key, dir: -1 } : s.dir === -1 ? { key, dir: 1 } : null));

  return (
    <div className="cbv cbv-term cbt-v" onKeyDown={onKeyDown}>
      <div className="cbt-strip">
        <span>OPEN <b className="cbv-num">{fmt(data.openingBalance)}</b></span>
        <span className="tone-success">CREDIT <b className="cbv-num">{fmt(data.totalReceipts)}</b></span>
        <span className="tone-danger">DEBIT <b className="cbv-num">{fmt(data.totalPayments)}</b></span>
        <span>CLOSE <b className="cbv-num">{fmt(data.closingBalance)}</b></span>
        <span className={dv.balanced ? 'tone-success' : 'tone-warning'}>{dv.balanced ? '✓ BALANCED' : `Δ ${fmt(dv.difference)}`}</span>
      </div>

      <div className="cbt-bar">
        <span className="cbt-prompt">&gt;</span>
        <input ref={searchRef} value={q} onChange={e => setQ(e.target.value)} placeholder="filter voucher, member, head or note  ( / )" aria-label="Filter rows" />
        <span className="cbt-count">{rows.length}/{dv.flat.length}</span>
      </div>

      <div className="cbt-main">
        <div className="cbt-table" tabIndex={0} ref={bodyRef} role="grid" aria-label="Ledger legs">
          <div className="cbt-row cbt-head" role="row">
            {COLS.map(c => (
              <button key={c.key} type="button" className={c.num ? 'r' : ''} onClick={() => toggleSort(c.key)} aria-sort={sort?.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
                {c.label}{sort?.key === c.key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
              </button>
            ))}
          </div>
          {rows.map((r, i) => (
            <div key={r.id} data-row={i} role="row" className={`cbt-row${i === sel ? ' is-sel' : ''}`} onClick={() => setSel(i)}>
              <span className="cbt-code">{r.voucherNo}</span>
              <span className="cbt-name" title={`${r.memberNo} ${r.memberName}`}>{r.memberNo}</span>
              <span className="cbt-code">{r.mode}</span>
              <span className="cbt-name" title={`${r.headCode} ${r.headName}`}>{r.headCode} {r.headName}</span>
              <span className={`r cbv-num ${r.payment > 0 ? 'tone-danger' : 'cbv-faint'}`}>{r.payment > 0 ? fmt(r.payment) : '·'}</span>
              <span className={`r cbv-num ${r.receipt > 0 ? 'tone-success' : 'cbv-faint'}`}>{r.receipt > 0 ? fmt(r.receipt) : '·'}</span>
            </div>
          ))}
          {!rows.length && <div className="cbt-empty">no row matches “{q}”</div>}
          <div className="cbt-row cbt-foot" role="row">
            <span>TOTAL</span><span /><span /><span />
            <span className="r cbv-num tone-danger">{fmt(data.totalPayments)}</span>
            <span className="r cbv-num tone-success">{fmt(data.totalReceipts)}</span>
          </div>
        </div>

        <aside className="cbt-side" aria-label="Selected voucher">
          <div className="cbt-side-title">VOUCHER</div>
          {cur && curVoucher ? (
            <>
              <div className="cbt-side-head">{curVoucher.voucherNo}</div>
              <div className="cbt-side-code">{curVoucher.memberNo} {curVoucher.memberName}</div>
              <dl>
                <div><dt>Mode</dt><dd>{curVoucher.modeOfPayment || 'Cash'}</dd></div>
                <div><dt>Note</dt><dd style={{ textAlign: 'right' }}>{curVoucher.narration || '—'}</dd></div>
                {curVoucher.entries.map(e => (
                  <div key={e.sno}>
                    <dt title={e.headName || e.description}>{e.sno}. {e.headCode}</dt>
                    <dd className={`cbv-num ${e.receipt > 0 ? 'tone-success' : 'tone-danger'}`}>{fmt(e.receipt > 0 ? e.receipt : e.payment)}</dd>
                  </div>
                ))}
                <div><dt>Voucher credit</dt><dd className="cbv-num tone-success">{fmt(curVoucher.totalReceipt)}</dd></div>
                <div><dt>Voucher debit</dt><dd className="cbv-num tone-danger">{fmt(curVoucher.totalPayment)}</dd></div>
              </dl>
            </>
          ) : <div className="cbt-empty">nothing selected</div>}
        </aside>
      </div>

      <div className="cbt-keys"><b>J/K</b> move · <b>/</b> filter · <b>Esc</b> clear · <b>G / g</b> last / first · click a heading to sort</div>
    </div>
  );
};

export default RoughTerminal;
