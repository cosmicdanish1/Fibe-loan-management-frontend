import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { GenericBento, GenericEditorial, GenericTerminal, type ProSpec } from '../../../../../components/reports/views/GenericPro';
import { fmt, fmtShort } from '../../../../../components/reports/views/format';

export interface MlrEntry {
  transactionDate: string; voucherNo: string; narration: string; debit: number; credit: number; balance: number; transactionType?: string; username?: string;
}
const num = (n: unknown) => Number(n) || 0;
/** Member ledger balances: positive is credit, negative is debit. */
const bal = (n: number) => `${fmt(Math.abs(n))} ${n >= 0 ? 'CR' : 'DR'}`;

export const useMlrSpec = (rows: MlrEntry[], who: string, opening: number, closing: number, totalDebits: number, totalCredits: number): ProSpec<MlrEntry> =>
  useMemo<ProSpec<MlrEntry>>(() => ({
    ariaLabel: `Ledger of ${who}`,
    rows,
    rowKey: (r, i) => `${r.transactionDate}-${r.voucherNo}-${i}`,
    cols: [
      { key: 'date', label: 'DATE', width: '96px', render: r => dayjs(r.transactionDate).format('DD-MMM-YYYY'), sortValue: r => r.transactionDate },
      { key: 'nar', label: 'PARTICULARS', width: 'minmax(140px, 1.6fr)', render: r => <span title={r.narration}>{r.narration || '—'}</span>, sortValue: r => r.narration || '' },
      { key: 'vch', label: 'VOUCHER', width: '84px', render: r => <span className="cbt-code">{r.voucherNo}</span>, sortValue: r => r.voucherNo || '' },
      { key: 'pay', label: 'PAYMENT', width: 'minmax(96px, 1fr)', num: true, render: r => <span className={num(r.debit) > 0 ? 'cbv-num tone-danger' : 'cbv-num cbv-faint'}>{fmt(num(r.debit))}</span>, sortValue: r => num(r.debit) },
      { key: 'rec', label: 'RECEIPT', width: 'minmax(96px, 1fr)', num: true, render: r => <span className={num(r.credit) > 0 ? 'cbv-num tone-success' : 'cbv-num cbv-faint'}>{fmt(num(r.credit))}</span>, sortValue: r => num(r.credit) },
      { key: 'bal', label: 'BALANCE', width: 'minmax(112px, 1fr)', num: true, render: r => <span className="cbv-num">{bal(num(r.balance))}</span>, sortValue: r => num(r.balance) },
    ],
    searchText: r => `${r.transactionDate} ${r.voucherNo} ${r.narration}`,
    kpis: [
      { label: `Closing balance · ${who}`, value: `₹${fmtShort(Math.abs(closing))} ${closing >= 0 ? 'CR' : 'DR'}`, tone: 'accent' },
      { label: 'Opening', value: bal(opening), tone: 'muted' },
      { label: 'Total payment', value: fmt(totalDebits), tone: 'danger' },
      { label: 'Total receipt', value: fmt(totalCredits), tone: 'success' },
    ],
    heroNote: `${rows.length} entries in the period`,
    ranks: [
      { title: 'Largest payments', tone: 'danger', rows: [...rows].filter(r => num(r.debit) > 0).sort((a, b) => num(b.debit) - num(a.debit)).slice(0, 6).map((r, i) => ({ key: `d${i}`, name: `${dayjs(r.transactionDate).format('DD-MMM-YY')} · ${r.voucherNo}`, value: num(r.debit) })) },
      { title: 'Largest receipts', tone: 'success', rows: [...rows].filter(r => num(r.credit) > 0).sort((a, b) => num(b.credit) - num(a.credit)).slice(0, 6).map((r, i) => ({ key: `c${i}`, name: `${dayjs(r.transactionDate).format('DD-MMM-YY')} · ${r.voucherNo}`, value: num(r.credit) })) },
    ],
    footer: ['TOTAL', '', '', fmt(totalDebits), fmt(totalCredits), bal(closing)],
    tableTitle: 'All entries',
    side: r => r && (
      <>
        <div className="cbt-side-head">{r.voucherNo}</div>
        <div className="cbt-side-code">{dayjs(r.transactionDate).format('DD-MMM-YYYY')}</div>
        <dl>
          <div><dt>Payment</dt><dd className="cbv-num tone-danger">{fmt(num(r.debit))}</dd></div>
          <div><dt>Receipt</dt><dd className="cbv-num tone-success">{fmt(num(r.credit))}</dd></div>
          <div><dt>Balance</dt><dd className="cbv-num">{bal(num(r.balance))}</dd></div>
          <div><dt>User</dt><dd>{r.username || '—'}</dd></div>
          <div><dt>Particulars</dt><dd style={{ textAlign: 'right' }}>{r.narration || '—'}</dd></div>
        </dl>
      </>
    ),
    sideTitle: 'ENTRY',
  }), [rows, who, opening, closing, totalDebits, totalCredits]);

export const ProBento = GenericBento;
export const ProTerm = GenericTerminal;
export const ProEd: React.FC<{ spec: ProSpec<MlrEntry>; subtitle: string }> = ({ spec, subtitle }) => (
  <GenericEditorial spec={spec} title="Member Ledger (Personal)" subtitle={subtitle} />
);
