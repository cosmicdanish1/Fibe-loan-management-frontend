import { useMemo } from 'react';
import type { ProSpec } from '../../../../../components/reports/views/GenericPro';
import { fmt, fmtShort } from '../../../../../components/reports/views/format';

export interface AnnualRow {
  key: string; accountNo: string; memberNo: string; memberName: string;
  opThriftAmount: number; curThriftAmount: number; opShareAmount: number; curShareAmount: number;
  regularLoanBalance: number; termLoanBalance: number;
}
const num = (n: unknown) => Number(n) || 0;

export const useAnnualSpec = (rows: AnnualRow[], asOn: string): ProSpec<AnnualRow> =>
  useMemo<ProSpec<AnnualRow>>(() => {
    const sum = (f: (r: AnnualRow) => number) => rows.reduce((s, r) => s + f(r), 0);
    const thrift = sum(r => num(r.curThriftAmount));
    const share = sum(r => num(r.curShareAmount));
    const loans = sum(r => num(r.regularLoanBalance) + num(r.termLoanBalance));
    return {
      ariaLabel: 'Annual member statement',
      rows,
      rowKey: (r, i) => `${r.memberNo}-${i}`,
      cols: [
        { key: 'ac', label: 'A/C', width: '70px', render: r => <span className="cbt-code">{r.accountNo}</span>, sortValue: r => r.accountNo },
        { key: 'mb', label: 'MEMBER', width: '86px', render: r => <span className="cbt-code">{r.memberNo}</span>, sortValue: r => r.memberNo },
        { key: 'nm', label: 'NAME', width: 'minmax(140px, 1.4fr)', render: r => <span title={r.memberName}>{r.memberName}</span>, sortValue: r => r.memberName },
        { key: 'ot', label: 'OP THRIFT', width: 'minmax(86px, .8fr)', num: true, render: r => <span className="cbv-num">{fmt(num(r.opThriftAmount))}</span>, sortValue: r => num(r.opThriftAmount) },
        { key: 'ct', label: 'CUR THRIFT', width: 'minmax(86px, .8fr)', num: true, render: r => <span className="cbv-num tone-success">{fmt(num(r.curThriftAmount))}</span>, sortValue: r => num(r.curThriftAmount) },
        { key: 'os', label: 'OP SHARE', width: 'minmax(86px, .8fr)', num: true, render: r => <span className="cbv-num">{fmt(num(r.opShareAmount))}</span>, sortValue: r => num(r.opShareAmount) },
        { key: 'cs', label: 'CUR SHARE', width: 'minmax(86px, .8fr)', num: true, render: r => <span className="cbv-num tone-success">{fmt(num(r.curShareAmount))}</span>, sortValue: r => num(r.curShareAmount) },
        { key: 'rl', label: 'REGULAR LOAN', width: 'minmax(96px, .9fr)', num: true, render: r => <span className="cbv-num tone-danger">{fmt(num(r.regularLoanBalance))}</span>, sortValue: r => num(r.regularLoanBalance) },
        { key: 'tl', label: 'TERM LOAN', width: 'minmax(86px, .8fr)', num: true, render: r => <span className="cbv-num tone-danger">{fmt(num(r.termLoanBalance))}</span>, sortValue: r => num(r.termLoanBalance) },
      ],
      searchText: r => `${r.accountNo} ${r.memberNo} ${r.memberName}`,
      kpis: [
        { label: `Members · as on ${asOn}`, value: String(rows.length), tone: 'accent' },
        { label: 'Thrift now', value: fmt(thrift), tone: 'success' },
        { label: 'Share now', value: fmt(share), tone: 'success' },
        { label: 'Loan balances', value: fmt(loans), tone: 'danger' },
      ],
      heroNote: `Thrift ₹${fmtShort(thrift)} · share ₹${fmtShort(share)} · loans ₹${fmtShort(loans)}`,
      ranks: [
        { title: 'Largest loan balances', tone: 'danger', rows: [...rows].sort((a, b) => (num(b.regularLoanBalance) + num(b.termLoanBalance)) - (num(a.regularLoanBalance) + num(a.termLoanBalance))).slice(0, 6).map((r, i) => ({ key: `${r.memberNo}-${i}`, name: r.memberName, value: num(r.regularLoanBalance) + num(r.termLoanBalance) })) },
        { title: 'Largest thrift balances', tone: 'success', rows: [...rows].sort((a, b) => num(b.curThriftAmount) - num(a.curThriftAmount)).slice(0, 6).map((r, i) => ({ key: `${r.memberNo}-${i}`, name: r.memberName, value: num(r.curThriftAmount) })) },
      ],
      footer: ['TOTAL', '', String(rows.length), fmt(sum(r => num(r.opThriftAmount))), fmt(thrift), fmt(sum(r => num(r.opShareAmount))), fmt(share), fmt(sum(r => num(r.regularLoanBalance))), fmt(sum(r => num(r.termLoanBalance)))],
      tableTitle: 'All members',
      bentoLimit: 150,
      side: r => r && (
        <>
          <div className="cbt-side-head">{r.memberName}</div>
          <div className="cbt-side-code">{r.memberNo} · A/C {r.accountNo}</div>
          <dl>
            <div><dt>Thrift (opening)</dt><dd className="cbv-num">{fmt(num(r.opThriftAmount))}</dd></div>
            <div><dt>Thrift (current)</dt><dd className="cbv-num tone-success">{fmt(num(r.curThriftAmount))}</dd></div>
            <div><dt>Share (opening)</dt><dd className="cbv-num">{fmt(num(r.opShareAmount))}</dd></div>
            <div><dt>Share (current)</dt><dd className="cbv-num tone-success">{fmt(num(r.curShareAmount))}</dd></div>
            <div><dt>Regular loan</dt><dd className="cbv-num tone-danger">{fmt(num(r.regularLoanBalance))}</dd></div>
            <div><dt>Term loan</dt><dd className="cbv-num tone-danger">{fmt(num(r.termLoanBalance))}</dd></div>
          </dl>
        </>
      ),
      sideTitle: 'MEMBER',
    };
  }, [rows, asOn]);
