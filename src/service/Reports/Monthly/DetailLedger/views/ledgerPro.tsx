import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { GenericBento, GenericEditorial, GenericTerminal, type ProSpec } from '../../../../../components/reports/views/GenericPro';
import { fmt, fmtShort } from '../../../../../components/reports/views/format';

export interface DetailRow { key: string; date: string; voucherNo: string; narration: string; debit: number; credit: number; balance: number }

const drcr = (n: number) => `${fmt(Math.abs(n))} ${n >= 0 ? 'DR' : 'CR'}`;
const top = (rows: DetailRow[], f: (r: DetailRow) => number) =>
  [...rows].filter(r => f(r) > 0).sort((a, b) => f(b) - f(a)).slice(0, 6)
    .map(r => ({ key: r.key, name: `${dayjs(r.date).format('DD-MMM')} · ${r.voucherNo}${r.narration ? ' · ' + r.narration : ''}`, value: f(r) }));

export const useDetailSpec = (rows: DetailRow[], head: string, totalDebit: number, totalCredit: number, closing: number, opening?: number): ProSpec<DetailRow> =>
  useMemo<ProSpec<DetailRow>>(() => ({
    ariaLabel: `Ledger of ${head}`,
    rows,
    rowKey: r => r.key,
    cols: [
      { key: 'date', label: 'DATE', width: '84px', render: r => dayjs(r.date).format('DD-MMM-YY'), sortValue: r => r.date },
      { key: 'vch', label: 'VOUCHER', width: '86px', render: r => <span className="cbt-code">{r.voucherNo}</span>, sortValue: r => r.voucherNo },
      { key: 'nar', label: 'NARRATION', width: 'minmax(140px, 1.6fr)', render: r => <span title={r.narration}>{r.narration || '—'}</span>, sortValue: r => r.narration },
      { key: 'dr', label: 'DEBIT', width: 'minmax(96px, 1fr)', num: true, render: r => <span className={r.debit > 0 ? 'cbv-num tone-danger' : 'cbv-num cbv-faint'}>{fmt(r.debit)}</span>, sortValue: r => r.debit },
      { key: 'cr', label: 'CREDIT', width: 'minmax(96px, 1fr)', num: true, render: r => <span className={r.credit > 0 ? 'cbv-num tone-success' : 'cbv-num cbv-faint'}>{fmt(r.credit)}</span>, sortValue: r => r.credit },
      { key: 'bal', label: 'BALANCE', width: 'minmax(120px, 1.1fr)', num: true, render: r => <span className="cbv-num">{drcr(r.balance)}</span>, sortValue: r => r.balance },
    ],
    searchText: r => `${r.date} ${r.voucherNo} ${r.narration}`,
    kpis: [
      { label: `Closing balance · ${head || 'head'}`, value: `₹${fmtShort(Math.abs(closing))} ${closing >= 0 ? 'DR' : 'CR'}`, tone: 'accent' },
      { label: 'Debit', value: fmt(totalDebit), tone: 'danger' },
      { label: 'Credit', value: fmt(totalCredit), tone: 'success' },
      { label: 'Entries', value: String(rows.length), tone: 'muted' },
      ...(opening !== undefined ? [{ label: 'Opening', value: drcr(opening), tone: 'muted' as const }] : []),
    ],
    heroNote: `${rows.length} entries in the period`,
    ranks: [
      { title: 'Largest debits', tone: 'danger', rows: top(rows, r => r.debit) },
      { title: 'Largest credits', tone: 'success', rows: top(rows, r => r.credit) },
    ],
    footer: ['TOTAL', '', '', fmt(totalDebit), fmt(totalCredit), drcr(closing)],
    tableTitle: 'All entries',
    side: r => r && (
      <>
        <div className="cbt-side-head">{r.voucherNo}</div>
        <div className="cbt-side-code">{dayjs(r.date).format('DD-MMM-YYYY')}</div>
        <dl>
          <div><dt>Debit</dt><dd className="cbv-num tone-danger">{fmt(r.debit)}</dd></div>
          <div><dt>Credit</dt><dd className="cbv-num tone-success">{fmt(r.credit)}</dd></div>
          <div><dt>Balance</dt><dd className="cbv-num">{drcr(r.balance)}</dd></div>
          <div><dt>Narration</dt><dd style={{ textAlign: 'right' }}>{r.narration || '—'}</dd></div>
        </dl>
      </>
    ),
    sideTitle: 'ENTRY',
  }), [rows, head, totalDebit, totalCredit, closing, opening]);

export const ProBento = GenericBento;
export const ProTerm = GenericTerminal;
export const ProEd: React.FC<{ spec: ProSpec<DetailRow>; subtitle: string; title?: string }> = ({ spec, subtitle, title = "Detail Ledger" }) => (
  <GenericEditorial spec={spec} title={title} subtitle={subtitle} />
);
