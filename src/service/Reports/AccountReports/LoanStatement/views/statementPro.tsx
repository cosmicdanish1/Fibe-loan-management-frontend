import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { GenericBento, GenericEditorial, GenericTerminal, type ProSpec } from '../../../../../components/reports/views/GenericPro';
import { fmt, fmtShort } from '../../../../../components/reports/views/format';
import type { StatementRow, LoanSummary } from '../hooks/useLoanStatement';

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const num = (n: unknown) => Number(n) || 0;

export const useStatementSpec = (rows: StatementRow[], summary: LoanSummary | null, who: string): ProSpec<StatementRow> =>
  useMemo<ProSpec<StatementRow>>(() => {
    const principal = rows.reduce((s, r) => s + num(r.principal_amount), 0);
    const interest = rows.reduce((s, r) => s + num(r.interest_amount), 0);
    const penal = rows.reduce((s, r) => s + num(r.penal_amount), 0);
    const paid = rows.reduce((s, r) => s + num(r.payment_amount), 0);
    const balance = summary ? num(summary.current_balance) : num(rows[rows.length - 1]?.remaining_balance);
    return {
      ariaLabel: `Loan statement of ${who}`,
      rows,
      rowKey: r => String(r.id),
      cols: [
        { key: 'date', label: 'DATE', width: '84px', render: r => dayjs(r.payment_date).format('DD-MM-YYYY'), sortValue: r => r.payment_date },
        { key: 'fm', label: 'FOR', width: '64px', render: r => `${MONTHS[r.payment_month] ?? ''} ${r.payment_year}`, sortValue: r => r.payment_year * 100 + r.payment_month },
        { key: 'late', label: 'LATE', width: '44px', num: true, render: r => (num(r.months_overdue) > 0 ? <span className="tone-danger">{r.months_overdue}</span> : '—'), sortValue: r => num(r.months_overdue) },
        { key: 'pr', label: 'PRINCIPAL', width: 'minmax(90px, 1fr)', num: true, render: r => <span className="cbv-num">{fmt(num(r.principal_amount))}</span>, sortValue: r => num(r.principal_amount) },
        { key: 'in', label: 'INTEREST', width: 'minmax(80px, .8fr)', num: true, render: r => <span className="cbv-num">{fmt(num(r.interest_amount))}</span>, sortValue: r => num(r.interest_amount) },
        { key: 'pe', label: 'PENAL', width: 'minmax(70px, .6fr)', num: true, render: r => <span className={num(r.penal_amount) > 0 ? 'cbv-num tone-danger' : 'cbv-num cbv-faint'}>{fmt(num(r.penal_amount))}</span>, sortValue: r => num(r.penal_amount) },
        { key: 'tp', label: 'PAID', width: 'minmax(90px, 1fr)', num: true, render: r => <span className="cbv-num tone-success">{fmt(num(r.payment_amount))}</span>, sortValue: r => num(r.payment_amount) },
        { key: 'ba', label: 'BALANCE', width: 'minmax(96px, 1fr)', num: true, render: r => <span className="cbv-num">{fmt(num(r.remaining_balance))}</span>, sortValue: r => num(r.remaining_balance) },
        { key: 'rc', label: 'RECEIPT', width: '76px', render: r => <span className="cbt-code">{r.receipt_no || '—'}</span>, sortValue: r => r.receipt_no || '' },
      ],
      searchText: r => `${r.payment_date} ${r.receipt_no ?? ''} ${r.narration ?? ''}`,
      kpis: [
        { label: `Loan balance · ${who}`, value: `₹${fmtShort(balance)}`, tone: 'accent' },
        { label: 'Principal paid', value: fmt(summary ? num(summary.total_principal_paid) : principal), tone: 'success' },
        { label: 'Interest paid', value: fmt(summary ? num(summary.total_interest_paid) : interest), tone: 'warning' },
        { label: 'Penal paid', value: fmt(summary ? num(summary.total_penal_paid) : penal), tone: 'danger' },
        { label: 'Payments', value: String(summary ? summary.payments_made : rows.length), tone: 'muted' },
      ],
      heroNote: `${rows.length} installments listed`,
      ranks: [
        { title: 'Where the payments went', tone: 'accent', rows: [
          { key: 'p', name: 'Principal', value: principal },
          { key: 'i', name: 'Interest', value: interest },
          { key: 'e', name: 'Penal', value: penal },
        ].filter(x => x.value > 0) },
      ],
      footer: ['TOTAL', '', '', fmt(principal), fmt(interest), fmt(penal), fmt(paid), fmt(balance), ''],
      tableTitle: 'All installments',
      side: r => r && (
        <>
          <div className="cbt-side-head">{dayjs(r.payment_date).format('DD-MMM-YYYY')}</div>
          <div className="cbt-side-code">{r.receipt_no || 'no receipt'}</div>
          <dl>
            <div><dt>For month</dt><dd>{MONTHS[r.payment_month]} {r.payment_year}</dd></div>
            <div><dt>Due date</dt><dd>{r.due_date ? dayjs(r.due_date).format('DD-MM-YYYY') : '—'}</dd></div>
            <div><dt>Months late</dt><dd>{num(r.months_overdue) || '—'}</dd></div>
            <div><dt>Principal</dt><dd className="cbv-num">{fmt(num(r.principal_amount))}</dd></div>
            <div><dt>Interest</dt><dd className="cbv-num">{fmt(num(r.interest_amount))}</dd></div>
            <div><dt>Penal</dt><dd className="cbv-num">{fmt(num(r.penal_amount))}</dd></div>
            <div><dt>Total paid</dt><dd className="cbv-num tone-success">{fmt(num(r.payment_amount))}</dd></div>
            <div><dt>Balance after</dt><dd className="cbv-num">{fmt(num(r.remaining_balance))}</dd></div>
            <div><dt>Narration</dt><dd style={{ textAlign: 'right' }}>{r.narration || '—'}</dd></div>
          </dl>
        </>
      ),
      sideTitle: 'PAYMENT',
    };
  }, [rows, summary, who]);

export const ProBento = GenericBento;
export const ProTerm = GenericTerminal;
export const ProEd: React.FC<{ spec: ProSpec<StatementRow>; subtitle: string }> = ({ spec, subtitle }) => (
  <GenericEditorial spec={spec} title="Loan Account Statement" subtitle={subtitle} />
);
