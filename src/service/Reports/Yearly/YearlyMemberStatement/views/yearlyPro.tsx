import { useMemo } from 'react';
import type { ProSpec } from '../../../../../components/reports/views/GenericPro';
import { fmt, fmtShort } from '../../../../../components/reports/views/format';

export interface YearlyRow {
  key: string; memberNo: string; memberName: string; shares: string; compulsoryDeposit: string; regularLoan: string; emergencyLoan: string;
}
const num = (n: unknown) => parseFloat(String(n ?? '0')) || 0;

export const useYearlySpec = (rows: YearlyRow[], period: string): ProSpec<YearlyRow> =>
  useMemo<ProSpec<YearlyRow>>(() => {
    const sum = (f: (r: YearlyRow) => number) => rows.reduce((s, r) => s + f(r), 0);
    const shares = sum(r => num(r.shares));
    const cd = sum(r => num(r.compulsoryDeposit));
    const reg = sum(r => num(r.regularLoan));
    const emg = sum(r => num(r.emergencyLoan));
    return {
      ariaLabel: 'Yearly member statement',
      rows,
      rowKey: (r, i) => `${r.memberNo}-${i}`,
      cols: [
        { key: 'mb', label: 'MEMBER', width: '90px', render: r => <span className="cbt-code">{r.memberNo}</span>, sortValue: r => r.memberNo },
        { key: 'nm', label: 'NAME', width: 'minmax(150px, 1.6fr)', render: r => <span title={r.memberName}>{r.memberName}</span>, sortValue: r => r.memberName },
        { key: 'sh', label: 'SHARES', width: 'minmax(96px, 1fr)', num: true, render: r => <span className="cbv-num tone-success">{fmt(num(r.shares))}</span>, sortValue: r => num(r.shares) },
        { key: 'cd', label: 'COMP. DEPOSIT', width: 'minmax(104px, 1fr)', num: true, render: r => <span className="cbv-num tone-success">{fmt(num(r.compulsoryDeposit))}</span>, sortValue: r => num(r.compulsoryDeposit) },
        { key: 'rl', label: 'REGULAR LOAN', width: 'minmax(104px, 1fr)', num: true, render: r => <span className="cbv-num tone-danger">{fmt(num(r.regularLoan))}</span>, sortValue: r => num(r.regularLoan) },
        { key: 'el', label: 'EMERGENCY LOAN', width: 'minmax(104px, 1fr)', num: true, render: r => <span className="cbv-num tone-danger">{fmt(num(r.emergencyLoan))}</span>, sortValue: r => num(r.emergencyLoan) },
      ],
      searchText: r => `${r.memberNo} ${r.memberName}`,
      kpis: [
        { label: `Members · ${period}`, value: String(rows.length), tone: 'accent' },
        { label: 'Shares', value: fmt(shares), tone: 'success' },
        { label: 'Compulsory deposit', value: fmt(cd), tone: 'success' },
        { label: 'Loans (regular + emergency)', value: fmt(reg + emg), tone: 'danger' },
      ],
      heroNote: `Shares ₹${fmtShort(shares)} · CD ₹${fmtShort(cd)} · regular ₹${fmtShort(reg)} · emergency ₹${fmtShort(emg)}`,
      ranks: [
        { title: 'Largest regular loans', tone: 'danger', rows: [...rows].sort((a, b) => num(b.regularLoan) - num(a.regularLoan)).slice(0, 6).map((r, i) => ({ key: `${r.memberNo}-${i}`, name: r.memberName, value: num(r.regularLoan) })) },
        { title: 'Largest compulsory deposits', tone: 'success', rows: [...rows].sort((a, b) => num(b.compulsoryDeposit) - num(a.compulsoryDeposit)).slice(0, 6).map((r, i) => ({ key: `${r.memberNo}-${i}`, name: r.memberName, value: num(r.compulsoryDeposit) })) },
      ],
      footer: ['TOTAL', String(rows.length), fmt(shares), fmt(cd), fmt(reg), fmt(emg)],
      tableTitle: 'All members',
      bentoLimit: 150,
      side: r => r && (
        <>
          <div className="cbt-side-head">{r.memberName}</div>
          <div className="cbt-side-code">{r.memberNo}</div>
          <dl>
            <div><dt>Shares</dt><dd className="cbv-num tone-success">{fmt(num(r.shares))}</dd></div>
            <div><dt>Compulsory deposit</dt><dd className="cbv-num tone-success">{fmt(num(r.compulsoryDeposit))}</dd></div>
            <div><dt>Regular loan</dt><dd className="cbv-num tone-danger">{fmt(num(r.regularLoan))}</dd></div>
            <div><dt>Emergency loan</dt><dd className="cbv-num tone-danger">{fmt(num(r.emergencyLoan))}</dd></div>
          </dl>
        </>
      ),
      sideTitle: 'MEMBER',
    };
  }, [rows, period]);
