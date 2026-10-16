import { useMemo } from 'react';
import type { ProSpec } from '../../../../components/reports/views/GenericPro';
import { fmt, fmtShort } from '../../../../components/reports/views/format';

export interface BalanceRow {
  key: string; memberNo: string; memberName: string; shares: number; compulsoryDeposit: number;
  regularLoan: number; emergencyLoan: number; rdAmount: number; frsBalance: number; netBalance: number;
}
const num = (n: unknown) => Number(n) || 0;

export const useBalanceSpec = (rows: BalanceRow[], range: string): ProSpec<BalanceRow> =>
  useMemo<ProSpec<BalanceRow>>(() => {
    const sum = (f: (r: BalanceRow) => number) => rows.reduce((s, r) => s + f(r), 0);
    const shares = sum(r => num(r.shares));
    const cd = sum(r => num(r.compulsoryDeposit));
    const loans = sum(r => num(r.regularLoan) + num(r.emergencyLoan));
    const rd = sum(r => num(r.rdAmount));
    const net = sum(r => num(r.netBalance));
    return {
      ariaLabel: 'Account balances',
      rows,
      rowKey: (r, i) => `${r.memberNo}-${i}`,
      cols: [
        { key: 'mb', label: 'MEMBER', width: '90px', render: r => <span className="cbt-code">{r.memberNo}</span>, sortValue: r => r.memberNo },
        { key: 'nm', label: 'NAME', width: 'minmax(140px, 1.4fr)', render: r => <span title={r.memberName}>{r.memberName}</span>, sortValue: r => r.memberName },
        { key: 'sh', label: 'SHARES', width: 'minmax(84px, .8fr)', num: true, render: r => <span className="cbv-num tone-success">{fmt(num(r.shares))}</span>, sortValue: r => num(r.shares) },
        { key: 'cd', label: 'COMP. DEPOSIT', width: 'minmax(92px, .9fr)', num: true, render: r => <span className="cbv-num tone-success">{fmt(num(r.compulsoryDeposit))}</span>, sortValue: r => num(r.compulsoryDeposit) },
        { key: 'rl', label: 'REGULAR LOAN', width: 'minmax(92px, .9fr)', num: true, render: r => <span className="cbv-num tone-danger">{fmt(num(r.regularLoan))}</span>, sortValue: r => num(r.regularLoan) },
        { key: 'el', label: 'EMERGENCY', width: 'minmax(84px, .8fr)', num: true, render: r => <span className="cbv-num tone-danger">{fmt(num(r.emergencyLoan))}</span>, sortValue: r => num(r.emergencyLoan) },
        { key: 'rd', label: 'RD', width: 'minmax(80px, .7fr)', num: true, render: r => <span className="cbv-num">{fmt(num(r.rdAmount))}</span>, sortValue: r => num(r.rdAmount) },
        { key: 'fr', label: 'FRS', width: 'minmax(76px, .7fr)', num: true, render: r => <span className="cbv-num">{fmt(num(r.frsBalance))}</span>, sortValue: r => num(r.frsBalance) },
        { key: 'nt', label: 'NET', width: 'minmax(96px, .9fr)', num: true, render: r => <span className={`cbv-num ${num(r.netBalance) >= 0 ? 'tone-success' : 'tone-danger'}`}>{fmt(num(r.netBalance))}</span>, sortValue: r => num(r.netBalance) },
      ],
      searchText: r => `${r.memberNo} ${r.memberName}`,
      kpis: [
        { label: `Net position · ${range}`, value: `₹${fmtShort(net)}`, tone: net >= 0 ? 'success' : 'danger' },
        { label: 'Members', value: String(rows.length), tone: 'muted' },
        { label: 'Savings (shares + CD + RD)', value: fmt(shares + cd + rd), tone: 'success' },
        { label: 'Loans', value: fmt(loans), tone: 'danger' },
      ],
      heroNote: `Exact net ₹${fmt(net)}`,
      ranks: [
        { title: 'Largest loan balances', tone: 'danger', rows: [...rows].sort((a, b) => (num(b.regularLoan) + num(b.emergencyLoan)) - (num(a.regularLoan) + num(a.emergencyLoan))).slice(0, 6).map((r, i) => ({ key: `${r.memberNo}-${i}`, name: r.memberName, value: num(r.regularLoan) + num(r.emergencyLoan) })) },
        { title: 'Largest share + CD balances', tone: 'success', rows: [...rows].sort((a, b) => (num(b.shares) + num(b.compulsoryDeposit)) - (num(a.shares) + num(a.compulsoryDeposit))).slice(0, 6).map((r, i) => ({ key: `${r.memberNo}-${i}`, name: r.memberName, value: num(r.shares) + num(r.compulsoryDeposit) })) },
      ],
      footer: ['TOTAL', String(rows.length), fmt(shares), fmt(cd), fmt(sum(r => num(r.regularLoan))), fmt(sum(r => num(r.emergencyLoan))), fmt(rd), fmt(sum(r => num(r.frsBalance))), fmt(net)],
      tableTitle: 'All members',
      bentoLimit: 150,
      side: r => r && (
        <>
          <div className="cbt-side-head">{r.memberName}</div>
          <div className="cbt-side-code">{r.memberNo}</div>
          <dl>
            <div><dt>Shares</dt><dd className="cbv-num tone-success">{fmt(num(r.shares))}</dd></div>
            <div><dt>Compulsory deposit</dt><dd className="cbv-num tone-success">{fmt(num(r.compulsoryDeposit))}</dd></div>
            <div><dt>RD</dt><dd className="cbv-num">{fmt(num(r.rdAmount))}</dd></div>
            <div><dt>FRS</dt><dd className="cbv-num">{fmt(num(r.frsBalance))}</dd></div>
            <div><dt>Regular loan</dt><dd className="cbv-num tone-danger">{fmt(num(r.regularLoan))}</dd></div>
            <div><dt>Emergency loan</dt><dd className="cbv-num tone-danger">{fmt(num(r.emergencyLoan))}</dd></div>
            <div><dt>Net balance</dt><dd className="cbv-num">{fmt(num(r.netBalance))}</dd></div>
          </dl>
        </>
      ),
      sideTitle: 'MEMBER',
    };
  }, [rows, range]);
