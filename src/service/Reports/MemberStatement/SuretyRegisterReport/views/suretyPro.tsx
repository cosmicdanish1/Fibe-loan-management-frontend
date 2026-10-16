import { useMemo } from 'react';
import type { ProSpec } from '../../../../../components/reports/views/GenericPro';
import { fmt, fmtShort } from '../../../../../components/reports/views/format';

export interface SuretyRow {
  key: string; mbno: string; memberName: string; loanNo: string; loanType: string; loanAmount: number;
  suretyMbno: string; suretyName: string; outstandingBalance: number;
}
const num = (n: unknown) => Number(n) || 0;

export const useSuretySpec = (rows: SuretyRow[], label: string): ProSpec<SuretyRow> =>
  useMemo<ProSpec<SuretyRow>>(() => {
    const loan = rows.reduce((s, r) => s + num(r.loanAmount), 0);
    const out = rows.reduce((s, r) => s + num(r.outstandingBalance), 0);
    const suretyCount = new Map<string, { name: string; count: number; out: number }>();
    rows.forEach(r => {
      const k = r.suretyMbno || '—';
      const cur = suretyCount.get(k) ?? { name: r.suretyName || 'No surety', count: 0, out: 0 };
      cur.count += 1; cur.out += num(r.outstandingBalance);
      suretyCount.set(k, cur);
    });
    return {
      ariaLabel: 'Surety register',
      rows,
      rowKey: (r, i) => `${r.mbno}-${r.loanNo}-${r.suretyMbno}-${i}`,
      cols: [
        { key: 'mb', label: 'MEMBER', width: '90px', render: r => <span className="cbt-code">{r.mbno}</span>, sortValue: r => r.mbno },
        { key: 'nm', label: 'NAME', width: 'minmax(130px, 1.3fr)', render: r => <span title={r.memberName}>{r.memberName}</span>, sortValue: r => r.memberName },
        { key: 'ln', label: 'LOAN', width: '84px', render: r => <span className="cbt-code">{r.loanNo}</span>, sortValue: r => r.loanNo },
        { key: 'ty', label: 'TYPE', width: '48px', render: r => r.loanType, sortValue: r => r.loanType },
        { key: 'la', label: 'LOAN AMT', width: 'minmax(92px, .9fr)', num: true, render: r => <span className="cbv-num">{fmt(num(r.loanAmount))}</span>, sortValue: r => num(r.loanAmount) },
        { key: 'sm', label: 'SURETY', width: '90px', render: r => <span className="cbt-code">{r.suretyMbno || '-'}</span>, sortValue: r => r.suretyMbno || '' },
        { key: 'sn', label: 'SURETY NAME', width: 'minmax(130px, 1.3fr)', render: r => <span title={r.suretyName}>{r.suretyName || '—'}</span>, sortValue: r => r.suretyName || '' },
        { key: 'ob', label: 'OUTSTANDING', width: 'minmax(96px, .9fr)', num: true, render: r => <span className="cbv-num tone-danger">{fmt(num(r.outstandingBalance))}</span>, sortValue: r => num(r.outstandingBalance) },
      ],
      searchText: r => `${r.mbno} ${r.memberName} ${r.loanNo} ${r.loanType} ${r.suretyMbno} ${r.suretyName}`,
      kpis: [
        { label: `Outstanding under surety · ${label}`, value: `₹${fmtShort(out)}`, tone: 'danger' },
        { label: 'Records', value: String(rows.length), tone: 'muted' },
        { label: 'Loan amount', value: fmt(loan), tone: 'muted' },
        { label: 'Different sureties', value: String(suretyCount.size), tone: 'muted' },
      ],
      heroNote: `Exact outstanding ₹${fmt(out)}`,
      ranks: [
        { title: 'Sureties with the most outstanding', tone: 'danger', rows: [...suretyCount.entries()].sort((a, b) => b[1].out - a[1].out).slice(0, 8).map(([k, v]) => ({ key: k, name: `${v.name} (${k}) · ${v.count} loans`, value: v.out })) },
      ],
      footer: ['TOTAL', String(rows.length), '', '', fmt(loan), '', '', fmt(out)],
      tableTitle: 'All records',
      bentoLimit: 150,
      side: r => r && (
        <>
          <div className="cbt-side-head">{r.memberName}</div>
          <div className="cbt-side-code">{r.mbno} · {r.loanType} {r.loanNo}</div>
          <dl>
            <div><dt>Loan amount</dt><dd className="cbv-num">{fmt(num(r.loanAmount))}</dd></div>
            <div><dt>Outstanding</dt><dd className="cbv-num tone-danger">{fmt(num(r.outstandingBalance))}</dd></div>
            <div><dt>Surety</dt><dd style={{ textAlign: 'right' }}>{r.suretyName || '—'} ({r.suretyMbno || '-'})</dd></div>
          </dl>
        </>
      ),
      sideTitle: 'LOAN',
    };
  }, [rows, label]);
