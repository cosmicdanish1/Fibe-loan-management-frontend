import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { GenericBento, GenericEditorial, GenericTerminal, type ProSpec } from '../../../../../components/reports/views/GenericPro';
import { fmt, fmtShort } from '../../../../../components/reports/views/format';

export interface LoanLedgerRow { key: string; date: string; type: string; amount: number; narration: string; voucherNo: string; balance: number }

const isDr = (t: string) => t === 'DR' || t === 'D';
const isCr = (t: string) => t === 'CR' || t === 'C';
const num = (n: unknown) => Number(n) || 0;

export const useLoanLedgerSpec = (rows: LoanLedgerRow[], who: string, opening: number, closing: number, totalDebits: number, totalCredits: number): ProSpec<LoanLedgerRow> =>
  useMemo<ProSpec<LoanLedgerRow>>(() => ({
    ariaLabel: `Loan ledger of ${who}`,
    rows,
    rowKey: r => r.key,
    cols: [
      { key: 'date', label: 'DATE', width: '84px', render: r => dayjs(r.date).format('DD-MMM-YY'), sortValue: r => r.date },
      { key: 'vch', label: 'VOUCHER', width: '86px', render: r => <span className="cbt-code">{r.voucherNo}</span>, sortValue: r => r.voucherNo },
      { key: 'nar', label: 'NARRATION', width: 'minmax(140px, 1.6fr)', render: r => <span title={r.narration}>{r.narration || '—'}</span>, sortValue: r => r.narration },
      { key: 'dr', label: 'DEBIT', width: 'minmax(96px, 1fr)', num: true, render: r => <span className={isDr(r.type) ? 'cbv-num tone-danger' : 'cbv-num cbv-faint'}>{fmt(isDr(r.type) ? num(r.amount) : 0)}</span>, sortValue: r => (isDr(r.type) ? num(r.amount) : 0) },
      { key: 'cr', label: 'CREDIT', width: 'minmax(96px, 1fr)', num: true, render: r => <span className={isCr(r.type) ? 'cbv-num tone-success' : 'cbv-num cbv-faint'}>{fmt(isCr(r.type) ? num(r.amount) : 0)}</span>, sortValue: r => (isCr(r.type) ? num(r.amount) : 0) },
      { key: 'bal', label: 'BALANCE', width: 'minmax(104px, 1fr)', num: true, render: r => <span className="cbv-num">{fmt(num(r.balance))}</span>, sortValue: r => num(r.balance) },
    ],
    searchText: r => `${r.date} ${r.voucherNo} ${r.narration}`,
    kpis: [
      { label: `Loan balance · ${who}`, value: `₹${fmtShort(closing)}`, tone: 'accent' },
      { label: 'Opening', value: fmt(opening), tone: 'muted' },
      { label: 'Debits', value: fmt(totalDebits), tone: 'danger' },
      { label: 'Credits (paid)', value: fmt(totalCredits), tone: 'success' },
    ],
    heroNote: `${rows.length} entries · opening ${fmtShort(opening)} → closing ${fmtShort(closing)}`,
    ranks: [
      { title: 'Largest payments', tone: 'success', rows: [...rows].filter(r => isCr(r.type)).sort((a, b) => num(b.amount) - num(a.amount)).slice(0, 6).map(r => ({ key: r.key, name: `${dayjs(r.date).format('DD-MMM-YY')} · ${r.voucherNo}`, value: num(r.amount) })) },
    ],
    footer: ['TOTAL', '', '', fmt(totalDebits), fmt(totalCredits), fmt(closing)],
    tableTitle: 'All entries',
    side: r => r && (
      <>
        <div className="cbt-side-head">{r.voucherNo}</div>
        <div className="cbt-side-code">{dayjs(r.date).format('DD-MMM-YYYY')}</div>
        <dl>
          <div><dt>Type</dt><dd>{isDr(r.type) ? 'Debit' : 'Credit'}</dd></div>
          <div><dt>Amount</dt><dd className={`cbv-num ${isDr(r.type) ? 'tone-danger' : 'tone-success'}`}>{fmt(num(r.amount))}</dd></div>
          <div><dt>Balance after</dt><dd className="cbv-num">{fmt(num(r.balance))}</dd></div>
          <div><dt>Narration</dt><dd style={{ textAlign: 'right' }}>{r.narration || '—'}</dd></div>
        </dl>
      </>
    ),
    sideTitle: 'ENTRY',
  }), [rows, who, opening, closing, totalDebits, totalCredits]);

export const ProBento = GenericBento;
export const ProTerm = GenericTerminal;
export const ProEd: React.FC<{ spec: ProSpec<LoanLedgerRow>; subtitle: string }> = ({ spec, subtitle }) => (
  <GenericEditorial spec={spec} title="Member Loan Ledger" subtitle={subtitle} />
);
