import { useMemo } from 'react';
import dayjs from 'dayjs';
import type { ProSpec } from '../../../../../components/reports/views/GenericPro';
import { fmt, fmtShort } from '../../../../../components/reports/views/format';

export interface RdYear {
  key: string; yearcode: number; yearLabel: string; memberNo: string; memberName: string;
  startDate: string | Date; endDate: string | Date; monthlyRdAmount: number; openingBalance: number;
  totalInstallmentsDue: number; totalInstallmentsPaid: number; totalMissed: number;
  paymentPattern: string | null; finalEligibleFullInterest: boolean | null;
  rdInstallmentInterest: number; openingBalanceInterest: number; totalInterestCredited: number;
  currentBalance: number; status: 'OPEN' | 'CLOSED';
}
const num = (n: unknown) => Number(n) || 0;

export const useRdStmtSpec = (rows: RdYear[], who: string): ProSpec<RdYear> =>
  useMemo<ProSpec<RdYear>>(() => {
    const interest = rows.reduce((s, r) => s + num(r.totalInterestCredited), 0);
    const missed = rows.reduce((s, r) => s + num(r.totalMissed), 0);
    const latest = rows[0];
    return {
      ariaLabel: 'RD statement',
      rows,
      rowKey: (r, i) => `${r.yearcode}-${i}`,
      cols: [
        { key: 'yr', label: 'YEAR', width: '90px', render: r => r.yearLabel, sortValue: r => r.yearcode },
        { key: 'st', label: 'STATUS', width: '70px', render: r => <span className={r.status === 'OPEN' ? 'tone-success' : 'cbv-faint'}>{r.status}</span>, sortValue: r => r.status },
        { key: 'ra', label: 'MONTHLY RD', width: 'minmax(86px, .8fr)', num: true, render: r => <span className="cbv-num">{fmt(num(r.monthlyRdAmount))}</span>, sortValue: r => num(r.monthlyRdAmount) },
        { key: 'ob', label: 'OPENING', width: 'minmax(92px, .9fr)', num: true, render: r => <span className="cbv-num">{fmt(num(r.openingBalance))}</span>, sortValue: r => num(r.openingBalance) },
        { key: 'dp', label: 'PAID / DUE', width: '84px', num: true, render: r => `${r.totalInstallmentsPaid} / ${r.totalInstallmentsDue}`, sortValue: r => num(r.totalInstallmentsPaid) },
        { key: 'ms', label: 'MISSED', width: '64px', num: true, render: r => (num(r.totalMissed) > 0 ? <span className="tone-danger">{r.totalMissed}</span> : '0'), sortValue: r => num(r.totalMissed) },
        { key: 'ic', label: 'INTEREST', width: 'minmax(86px, .8fr)', num: true, render: r => <span className="cbv-num tone-success">{fmt(num(r.totalInterestCredited))}</span>, sortValue: r => num(r.totalInterestCredited) },
        { key: 'cb', label: 'BALANCE', width: 'minmax(96px, .9fr)', num: true, render: r => <span className="cbv-num">{fmt(num(r.currentBalance))}</span>, sortValue: r => num(r.currentBalance) },
      ],
      searchText: r => `${r.yearLabel} ${r.status} ${r.paymentPattern ?? ''}`,
      kpis: [
        { label: `RD balance · ${who}`, value: `₹${fmtShort(num(latest?.currentBalance))}`, tone: 'accent' },
        { label: 'Years', value: String(rows.length), tone: 'muted' },
        { label: 'Interest credited', value: fmt(interest), tone: 'success' },
        { label: 'Missed installments', value: String(missed), tone: missed > 0 ? 'danger' : 'muted' },
      ],
      heroNote: latest ? `Latest year ${latest.yearLabel} (${latest.status})` : '',
      ranks: [
        { title: 'Interest credited by year', tone: 'success', rows: rows.filter(r => num(r.totalInterestCredited) > 0).map(r => ({ key: String(r.yearcode), name: r.yearLabel, value: num(r.totalInterestCredited) })) },
      ],
      footer: ['TOTAL', '', '', '', '', String(missed), fmt(interest), fmt(num(latest?.currentBalance))],
      tableTitle: 'Every financial year',
      side: r => r && (
        <>
          <div className="cbt-side-head">{r.yearLabel}</div>
          <div className="cbt-side-code">{r.status}</div>
          <dl>
            <div><dt>Period</dt><dd>{dayjs(r.startDate).format('DD-MM-YY')} → {dayjs(r.endDate).format('DD-MM-YY')}</dd></div>
            <div><dt>Monthly RD</dt><dd className="cbv-num">{fmt(num(r.monthlyRdAmount))}</dd></div>
            <div><dt>Opening</dt><dd className="cbv-num">{fmt(num(r.openingBalance))}</dd></div>
            <div><dt>Installments</dt><dd>{r.totalInstallmentsPaid} paid of {r.totalInstallmentsDue} due</dd></div>
            <div><dt>Pattern</dt><dd>{r.paymentPattern || '—'}</dd></div>
            <div><dt>Full interest</dt><dd>{r.finalEligibleFullInterest === null ? '—' : r.finalEligibleFullInterest ? 'Yes' : 'No'}</dd></div>
            <div><dt>Installment interest</dt><dd className="cbv-num">{fmt(num(r.rdInstallmentInterest))}</dd></div>
            <div><dt>Opening interest</dt><dd className="cbv-num">{fmt(num(r.openingBalanceInterest))}</dd></div>
            <div><dt>Balance</dt><dd className="cbv-num">{fmt(num(r.currentBalance))}</dd></div>
          </dl>
        </>
      ),
      sideTitle: 'YEAR',
    };
  }, [rows, who]);
