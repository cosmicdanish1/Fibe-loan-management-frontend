import { useMemo } from 'react';
import type { ProSpec } from '../../../../../../components/reports/views/GenericPro';
import { fmt, fmtShort } from '../../../../../../components/reports/views/format';

export interface DivRow {
  memberNo: string; memberName: string; wing: string; office: string; designation: string;
  shareAmount: number; dividendAmount: number; dividendRate: number;
}
const num = (n: unknown) => Number(n) || 0;

export const useDivReportSpec = (rows: DivRow[], label: string): ProSpec<DivRow> =>
  useMemo<ProSpec<DivRow>>(() => {
    const total = rows.reduce((s, r) => s + num(r.dividendAmount), 0);
    const share = rows.reduce((s, r) => s + num(r.shareAmount), 0);
    const byOffice = new Map<string, number>();
    rows.forEach(r => { const k = r.office || r.wing || 'No office'; byOffice.set(k, (byOffice.get(k) ?? 0) + num(r.dividendAmount)); });
    return {
      ariaLabel: 'Dividend distribution',
      rows,
      rowKey: (r, i) => `${r.memberNo}-${i}`,
      cols: [
        { key: 'mb', label: 'MEMBER', width: '90px', render: r => <span className="cbt-code">{r.memberNo}</span>, sortValue: r => r.memberNo },
        { key: 'nm', label: 'NAME', width: 'minmax(150px, 1.5fr)', render: r => <span title={r.memberName}>{r.memberName}</span>, sortValue: r => r.memberName },
        { key: 'of', label: 'OFFICE', width: 'minmax(90px, .9fr)', render: r => <span title={r.office}>{r.office || '—'}</span>, sortValue: r => r.office || '' },
        { key: 'ds', label: 'DESIGNATION', width: 'minmax(90px, .9fr)', render: r => r.designation || '—', sortValue: r => r.designation || '' },
        { key: 'sh', label: 'SHARE', width: 'minmax(96px, .9fr)', num: true, render: r => <span className="cbv-num">{fmt(num(r.shareAmount))}</span>, sortValue: r => num(r.shareAmount) },
        { key: 'rt', label: 'RATE', width: '56px', num: true, render: r => `${r.dividendRate}%`, sortValue: r => num(r.dividendRate) },
        { key: 'dv', label: 'DIVIDEND', width: 'minmax(100px, 1fr)', num: true, render: r => <span className="cbv-num tone-success">{fmt(num(r.dividendAmount))}</span>, sortValue: r => num(r.dividendAmount) },
      ],
      searchText: r => `${r.memberNo} ${r.memberName} ${r.office} ${r.wing} ${r.designation}`,
      kpis: [
        { label: `Dividend · ${label}`, value: `₹${fmtShort(total)}`, tone: 'success' },
        { label: 'Members', value: String(rows.length), tone: 'muted' },
        { label: 'Share capital', value: fmt(share), tone: 'muted' },
        { label: 'Average dividend', value: fmt(rows.length ? total / rows.length : 0), tone: 'muted' },
      ],
      heroNote: `Exact total ₹${fmt(total)}`,
      ranks: [
        { title: 'Dividend by office', tone: 'success', rows: [...byOffice.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({ key: k, name: k, value: v })) },
        { title: 'Largest dividends', tone: 'accent', rows: [...rows].sort((a, b) => num(b.dividendAmount) - num(a.dividendAmount)).slice(0, 6).map((r, i) => ({ key: `${r.memberNo}-${i}`, name: r.memberName, value: num(r.dividendAmount) })) },
      ],
      footer: ['TOTAL', String(rows.length), '', '', fmt(share), '', fmt(total)],
      tableTitle: 'All members',
      bentoLimit: 150,
      side: r => r && (
        <>
          <div className="cbt-side-head">{r.memberName}</div>
          <div className="cbt-side-code">{r.memberNo}</div>
          <dl>
            <div><dt>Wing</dt><dd>{r.wing || '—'}</dd></div>
            <div><dt>Office</dt><dd>{r.office || '—'}</dd></div>
            <div><dt>Designation</dt><dd>{r.designation || '—'}</dd></div>
            <div><dt>Share amount</dt><dd className="cbv-num">{fmt(num(r.shareAmount))}</dd></div>
            <div><dt>Rate</dt><dd>{r.dividendRate}%</dd></div>
            <div><dt>Dividend</dt><dd className="cbv-num tone-success">{fmt(num(r.dividendAmount))}</dd></div>
          </dl>
        </>
      ),
      sideTitle: 'MEMBER',
    };
  }, [rows, label]);
