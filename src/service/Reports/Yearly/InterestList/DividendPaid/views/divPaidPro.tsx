import { useMemo } from 'react';
import dayjs from 'dayjs';
import type { ProSpec } from '../../../../../../components/reports/views/GenericPro';
import { fmt, fmtShort } from '../../../../../../components/reports/views/format';

export interface DivPaidRow {
  memberNo: string; memberName: string; officeName: string; dividendAmount: number;
  paymentDate: string; paymentMode: string; chequeNo: string; voucherNo: string;
}
const num = (n: unknown) => Number(n) || 0;

export const useDivPaidSpec = (rows: DivPaidRow[], period: string): ProSpec<DivPaidRow> =>
  useMemo<ProSpec<DivPaidRow>>(() => {
    const total = rows.reduce((s, r) => s + num(r.dividendAmount), 0);
    const byWing = new Map<string, number>();
    rows.forEach(r => { const k = r.officeName || 'No wing'; byWing.set(k, (byWing.get(k) ?? 0) + num(r.dividendAmount)); });
    const byMode = new Map<string, number>();
    rows.forEach(r => { const k = r.paymentMode || 'Other'; byMode.set(k, (byMode.get(k) ?? 0) + num(r.dividendAmount)); });
    return {
      ariaLabel: 'Dividend paid',
      rows,
      rowKey: (r, i) => `${r.voucherNo}-${r.memberNo}-${i}`,
      cols: [
        { key: 'dt', label: 'DATE', width: '88px', render: r => (r.paymentDate ? dayjs(r.paymentDate).format('DD-MM-YYYY') : '—'), sortValue: r => r.paymentDate || '' },
        { key: 'vc', label: 'VOUCHER', width: '84px', render: r => <span className="cbt-code">{r.voucherNo || '—'}</span>, sortValue: r => r.voucherNo || '' },
        { key: 'mb', label: 'MEMBER', width: '90px', render: r => <span className="cbt-code">{r.memberNo}</span>, sortValue: r => r.memberNo },
        { key: 'nm', label: 'NAME', width: 'minmax(140px, 1.5fr)', render: r => <span title={r.memberName}>{r.memberName}</span>, sortValue: r => r.memberName },
        { key: 'wg', label: 'WING', width: 'minmax(80px, .9fr)', render: r => r.officeName || '—', sortValue: r => r.officeName || '' },
        { key: 'md', label: 'MODE', width: '64px', render: r => r.paymentMode || '—', sortValue: r => r.paymentMode || '' },
        { key: 'am', label: 'AMOUNT', width: 'minmax(100px, 1fr)', num: true, render: r => <span className="cbv-num tone-success">{fmt(num(r.dividendAmount))}</span>, sortValue: r => num(r.dividendAmount) },
      ],
      searchText: r => `${r.memberNo} ${r.memberName} ${r.voucherNo} ${r.officeName}`,
      kpis: [
        { label: `Dividend paid · ${period}`, value: `₹${fmtShort(total)}`, tone: 'success' },
        { label: 'Payments', value: String(rows.length), tone: 'muted' },
        { label: 'Average', value: fmt(rows.length ? total / rows.length : 0), tone: 'muted' },
        { label: 'Largest', value: fmt(Math.max(0, ...rows.map(r => num(r.dividendAmount)))), tone: 'muted' },
      ],
      heroNote: `Exact total ₹${fmt(total)}`,
      ranks: [
        { title: 'Paid by wing', tone: 'success', rows: [...byWing.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({ key: k, name: k, value: v })) },
        { title: 'Paid by mode', tone: 'accent', rows: [...byMode.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ key: k, name: k, value: v })) },
      ],
      footer: ['TOTAL', '', '', '', '', '', fmt(total)],
      tableTitle: 'All payments',
      bentoLimit: 150,
      side: r => r && (
        <>
          <div className="cbt-side-head">{r.memberName}</div>
          <div className="cbt-side-code">{r.memberNo}</div>
          <dl>
            <div><dt>Amount</dt><dd className="cbv-num tone-success">{fmt(num(r.dividendAmount))}</dd></div>
            <div><dt>Paid on</dt><dd>{r.paymentDate ? dayjs(r.paymentDate).format('DD-MMM-YYYY') : '—'}</dd></div>
            <div><dt>Voucher</dt><dd>{r.voucherNo || '—'}</dd></div>
            <div><dt>Mode</dt><dd>{r.paymentMode || '—'}</dd></div>
            <div><dt>Cheque</dt><dd>{r.chequeNo || '—'}</dd></div>
            <div><dt>Wing</dt><dd>{r.officeName || '—'}</dd></div>
          </dl>
        </>
      ),
      sideTitle: 'PAYMENT',
    };
  }, [rows, period]);
