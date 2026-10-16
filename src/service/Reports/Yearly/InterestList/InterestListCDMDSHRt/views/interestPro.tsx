import { useMemo } from 'react';
import type { ProSpec } from '../../../../../../components/reports/views/GenericPro';
import { fmt, fmtShort } from '../../../../../../components/reports/views/format';

export interface InterestRow {
  memberNo: string; memberName: string; officeName: string; depositType: string;
  principalAmount: number; interestAmount: number; fromDate: string; toDate: string;
}
const num = (n: unknown) => Number(n) || 0;

export const useInterestSpec = (rows: InterestRow[], fy: string): ProSpec<InterestRow> =>
  useMemo<ProSpec<InterestRow>>(() => {
    const interest = rows.reduce((s, r) => s + num(r.interestAmount), 0);
    const principal = rows.reduce((s, r) => s + num(r.principalAmount), 0);
    const byType = new Map<string, number>();
    rows.forEach(r => { const k = r.depositType || 'Other'; byType.set(k, (byType.get(k) ?? 0) + num(r.interestAmount)); });
    const byOffice = new Map<string, number>();
    rows.forEach(r => { const k = r.officeName || 'No office'; byOffice.set(k, (byOffice.get(k) ?? 0) + num(r.interestAmount)); });
    return {
      ariaLabel: 'Interest distribution',
      rows,
      rowKey: (r, i) => `${r.memberNo}-${r.depositType}-${i}`,
      cols: [
        { key: 'mb', label: 'MEMBER', width: '90px', render: r => <span className="cbt-code">{r.memberNo}</span>, sortValue: r => r.memberNo },
        { key: 'nm', label: 'NAME', width: 'minmax(150px, 1.5fr)', render: r => <span title={r.memberName}>{r.memberName}</span>, sortValue: r => r.memberName },
        { key: 'of', label: 'OFFICE', width: 'minmax(90px, .9fr)', render: r => r.officeName || '—', sortValue: r => r.officeName || '' },
        { key: 'ty', label: 'TYPE', width: '60px', render: r => r.depositType, sortValue: r => r.depositType },
        { key: 'pr', label: 'PRINCIPAL', width: 'minmax(100px, 1fr)', num: true, render: r => <span className="cbv-num">{fmt(num(r.principalAmount))}</span>, sortValue: r => num(r.principalAmount) },
        { key: 'in', label: 'INTEREST', width: 'minmax(100px, 1fr)', num: true, render: r => <span className="cbv-num tone-success">{fmt(num(r.interestAmount))}</span>, sortValue: r => num(r.interestAmount) },
      ],
      searchText: r => `${r.memberNo} ${r.memberName} ${r.officeName} ${r.depositType}`,
      kpis: [
        { label: `Interest · FY ${fy}`, value: `₹${fmtShort(interest)}`, tone: 'success' },
        { label: 'Lines', value: String(rows.length), tone: 'muted' },
        { label: 'Principal', value: fmt(principal), tone: 'muted' },
        { label: 'Average interest', value: fmt(rows.length ? interest / rows.length : 0), tone: 'muted' },
      ],
      heroNote: `Exact total ₹${fmt(interest)}`,
      ranks: [
        { title: 'Interest by deposit type', tone: 'success', rows: [...byType.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ key: k, name: k, value: v })) },
        { title: 'Interest by office', tone: 'accent', rows: [...byOffice.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({ key: k, name: k, value: v })) },
      ],
      footer: ['TOTAL', String(rows.length), '', '', fmt(principal), fmt(interest)],
      tableTitle: 'All lines',
      bentoLimit: 150,
      side: r => r && (
        <>
          <div className="cbt-side-head">{r.memberName}</div>
          <div className="cbt-side-code">{r.memberNo}</div>
          <dl>
            <div><dt>Deposit type</dt><dd>{r.depositType}</dd></div>
            <div><dt>Office</dt><dd>{r.officeName || '—'}</dd></div>
            <div><dt>Principal</dt><dd className="cbv-num">{fmt(num(r.principalAmount))}</dd></div>
            <div><dt>Interest</dt><dd className="cbv-num tone-success">{fmt(num(r.interestAmount))}</dd></div>
            <div><dt>Period</dt><dd>{r.fromDate || '—'} → {r.toDate || '—'}</dd></div>
          </dl>
        </>
      ),
      sideTitle: 'LINE',
    };
  }, [rows, fy]);
