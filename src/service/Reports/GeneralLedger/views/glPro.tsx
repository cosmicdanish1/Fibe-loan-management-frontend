import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { GenericBento, GenericEditorial, GenericTerminal, type ProSpec } from '../../../../components/reports/views/GenericPro';
import { fmt, fmtShort } from '../../../../components/reports/views/format';

export interface GlEntry {
  transactionNo: number; transactionDate: string; voucherNo: string; narration: string;
  debit: number; credit: number; balance: number; memberNumber?: number | string; username: string;
}
const num = (n: unknown) => Number(n) || 0;

export const useGlSpec = (rows: GlEntry[], head: string, opening: number, closing: number, totalDebits: number, totalCredits: number): ProSpec<GlEntry> =>
  useMemo<ProSpec<GlEntry>>(() => ({
    ariaLabel: `General ledger of ${head}`,
    rows,
    rowKey: (r, i) => `${r.transactionNo}-${i}`,
    cols: [
      { key: 'date', label: 'DATE', width: '96px', render: r => dayjs(r.transactionDate).format('DD-MMM-YYYY'), sortValue: r => r.transactionDate },
      { key: 'mb', label: 'MB NO', width: '90px', render: r => <span className="cbt-code">{r.memberNumber || '–'}</span>, sortValue: r => String(r.memberNumber ?? '') },
      { key: 'vch', label: 'VOUCHER', width: '84px', render: r => <span className="cbt-code">{r.voucherNo || '–'}</span>, sortValue: r => r.voucherNo || '' },
      { key: 'nar', label: 'NARRATION', width: 'minmax(140px, 1.5fr)', render: r => <span title={r.narration}>{r.narration || '—'}</span>, sortValue: r => r.narration || '' },
      { key: 'pay', label: 'PAYMENT', width: 'minmax(96px, 1fr)', num: true, render: r => <span className={num(r.debit) > 0 ? 'cbv-num tone-danger' : 'cbv-num cbv-faint'}>{fmt(num(r.debit))}</span>, sortValue: r => num(r.debit) },
      { key: 'rec', label: 'RECEIPT', width: 'minmax(96px, 1fr)', num: true, render: r => <span className={num(r.credit) > 0 ? 'cbv-num tone-success' : 'cbv-num cbv-faint'}>{fmt(num(r.credit))}</span>, sortValue: r => num(r.credit) },
      { key: 'bal', label: 'BALANCE', width: 'minmax(104px, 1fr)', num: true, render: r => <span className="cbv-num">{fmt(num(r.balance))}</span>, sortValue: r => num(r.balance) },
    ],
    searchText: r => `${r.transactionDate} ${r.memberNumber ?? ''} ${r.voucherNo} ${r.narration}`,
    kpis: [
      { label: `Closing balance · ${head}`, value: `₹${fmtShort(closing)}`, tone: 'accent' },
      { label: 'Opening', value: fmt(opening), tone: 'muted' },
      { label: 'Total payments', value: fmt(totalDebits), tone: 'danger' },
      { label: 'Total receipts', value: fmt(totalCredits), tone: 'success' },
    ],
    heroNote: `${rows.length} transactions · opening ${fmtShort(opening)}`,
    ranks: [
      { title: 'Largest payments', tone: 'danger', rows: [...rows].filter(r => num(r.debit) > 0).sort((a, b) => num(b.debit) - num(a.debit)).slice(0, 6).map((r, i) => ({ key: `${r.transactionNo}-${i}`, name: `${dayjs(r.transactionDate).format('DD-MMM-YY')} · ${r.voucherNo}`, value: num(r.debit) })) },
      { title: 'Largest receipts', tone: 'success', rows: [...rows].filter(r => num(r.credit) > 0).sort((a, b) => num(b.credit) - num(a.credit)).slice(0, 6).map((r, i) => ({ key: `${r.transactionNo}-${i}`, name: `${dayjs(r.transactionDate).format('DD-MMM-YY')} · ${r.voucherNo}`, value: num(r.credit) })) },
    ],
    footer: ['TOTAL', '', '', '', fmt(totalDebits), fmt(totalCredits), fmt(closing)],
    tableTitle: 'All transactions',
    side: r => r && (
      <>
        <div className="cbt-side-head">{r.voucherNo || '–'}</div>
        <div className="cbt-side-code">{dayjs(r.transactionDate).format('DD-MMM-YYYY')}</div>
        <dl>
          <div><dt>Member</dt><dd>{r.memberNumber || '–'}</dd></div>
          <div><dt>Payment</dt><dd className="cbv-num tone-danger">{fmt(num(r.debit))}</dd></div>
          <div><dt>Receipt</dt><dd className="cbv-num tone-success">{fmt(num(r.credit))}</dd></div>
          <div><dt>Balance</dt><dd className="cbv-num">{fmt(num(r.balance))}</dd></div>
          <div><dt>User</dt><dd>{r.username || '—'}</dd></div>
          <div><dt>Narration</dt><dd style={{ textAlign: 'right' }}>{r.narration || '—'}</dd></div>
        </dl>
      </>
    ),
    sideTitle: 'ENTRY',
  }), [rows, head, opening, closing, totalDebits, totalCredits]);

export const ProBento = GenericBento;
export const ProTerm = GenericTerminal;
export const ProEd: React.FC<{ spec: ProSpec<GlEntry>; subtitle: string }> = ({ spec, subtitle }) => (
  <GenericEditorial spec={spec} title="General Ledger" subtitle={subtitle} />
);
