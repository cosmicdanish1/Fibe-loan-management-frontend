import { useMemo } from 'react';
import dayjs from 'dayjs';
import type { ProSpec } from '../../../../components/reports/views/GenericPro';
import { fmt, fmtShort } from '../../../../components/reports/views/format';

export interface DepositRow {
  key: string; accountNo: string; memberNo: string; memberName: string; depositType: string;
  amount: number; depositDate: string; dueDate: string; interestRate: number; maturityAmount: number;
}
const num = (n: unknown) => Number(n) || 0;
const day = (d?: string) => (d ? dayjs(d).format('DD-MMM-YY') : '—');

export const useDdrSpec = (rows: DepositRow[], period: string): ProSpec<DepositRow> =>
  useMemo<ProSpec<DepositRow>>(() => {
    const deposit = rows.reduce((s, r) => s + num(r.amount), 0);
    const maturity = rows.reduce((s, r) => s + num(r.maturityAmount), 0);
    const byType = new Map<string, number>();
    rows.forEach(r => byType.set(r.depositType || 'Other', (byType.get(r.depositType || 'Other') ?? 0) + num(r.maturityAmount)));
    const byWeek = new Map<string, number>();
    rows.forEach(r => { const k = r.dueDate ? dayjs(r.dueDate).startOf('week').format('DD MMM') : '—'; byWeek.set(`Week of ${k}`, (byWeek.get(`Week of ${k}`) ?? 0) + num(r.maturityAmount)); });
    return {
      ariaLabel: 'Deposits falling due',
      rows,
      rowKey: (r, i) => `${r.accountNo}-${i}`,
      cols: [
        { key: 'mb', label: 'MEMBER', width: '86px', render: r => <span className="cbt-code">{r.memberNo}</span>, sortValue: r => r.memberNo },
        { key: 'nm', label: 'NAME', width: 'minmax(130px, 1.3fr)', render: r => <span title={r.memberName}>{r.memberName}</span>, sortValue: r => r.memberName },
        { key: 'ac', label: 'ACC NO', width: '78px', render: r => <span className="cbt-code">{r.accountNo}</span>, sortValue: r => r.accountNo },
        { key: 'ty', label: 'TYPE', width: '48px', render: r => r.depositType, sortValue: r => r.depositType },
        { key: 'rt', label: 'RATE', width: '56px', num: true, render: r => `${r.interestRate}%`, sortValue: r => num(r.interestRate) },
        { key: 'dd', label: 'DEPOSITED', width: '88px', render: r => day(r.depositDate), sortValue: r => r.depositDate || '' },
        { key: 'am', label: 'DEPOSIT AMT', width: 'minmax(92px, .9fr)', num: true, render: r => <span className="cbv-num">{fmt(num(r.amount))}</span>, sortValue: r => num(r.amount) },
        { key: 'du', label: 'DUE ON', width: '88px', render: r => day(r.dueDate), sortValue: r => r.dueDate || '' },
        { key: 'ma', label: 'MATURITY AMT', width: 'minmax(96px, .9fr)', num: true, render: r => <span className="cbv-num tone-success">{fmt(num(r.maturityAmount))}</span>, sortValue: r => num(r.maturityAmount) },
      ],
      searchText: r => `${r.memberNo} ${r.memberName} ${r.accountNo} ${r.depositType}`,
      kpis: [
        { label: `Maturity payable · ${period}`, value: `₹${fmtShort(maturity)}`, tone: 'success' },
        { label: 'Deposits falling due', value: String(rows.length), tone: 'muted' },
        { label: 'Deposited', value: fmt(deposit), tone: 'muted' },
        { label: 'Interest to pay', value: fmt(Math.max(0, maturity - deposit)), tone: 'warning' },
      ],
      heroNote: `Exact maturity ₹${fmt(maturity)}`,
      ranks: [
        { title: 'Maturity by deposit type', tone: 'success', rows: [...byType.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ key: k, name: k, value: v })) },
        { title: 'Maturity by week', tone: 'accent', rows: [...byWeek.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(0, 10).map(([k, v]) => ({ key: k, name: k, value: v })) },
      ],
      footer: ['TOTAL', String(rows.length), '', '', '', '', fmt(deposit), '', fmt(maturity)],
      tableTitle: 'All deposits',
      bentoLimit: 150,
      side: r => r && (
        <>
          <div className="cbt-side-head">{r.memberName}</div>
          <div className="cbt-side-code">{r.memberNo} · {r.depositType} {r.accountNo}</div>
          <dl>
            <div><dt>Deposited</dt><dd>{day(r.depositDate)}</dd></div>
            <div><dt>Deposit amount</dt><dd className="cbv-num">{fmt(num(r.amount))}</dd></div>
            <div><dt>Rate</dt><dd>{r.interestRate}%</dd></div>
            <div><dt>Due on</dt><dd>{day(r.dueDate)}</dd></div>
            <div><dt>Maturity amount</dt><dd className="cbv-num tone-success">{fmt(num(r.maturityAmount))}</dd></div>
          </dl>
        </>
      ),
      sideTitle: 'DEPOSIT',
    };
  }, [rows, period]);
