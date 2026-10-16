import { useMemo } from 'react';
import dayjs from 'dayjs';
import type { ProSpec } from '../../../../components/reports/views/GenericPro';
import { fmt, fmtShort } from '../../../../components/reports/views/format';

export interface DetailRow {
  date: string | Date; accountHead: string; voucherNo: string; particulars: string; debit: number; credit: number; code: string; balance?: number;
}
export interface DetailData { memberNumber: string; memberName: string; officeName: string; fromDate: string; toDate: string; openingByCode: Record<string, number>; entries: DetailRow[] }
const num = (n: unknown) => Number(n) || 0;

export const useDetailLedgerSpec = (data: DetailData | null): ProSpec<DetailRow> =>
  useMemo<ProSpec<DetailRow>>(() => {
    const rows = data?.entries ?? [];
    const debit = rows.reduce((s, r) => s + num(r.debit), 0);
    const credit = rows.reduce((s, r) => s + num(r.credit), 0);
    const byHead = new Map<string, number>();
    rows.forEach(r => { const k = r.accountHead || r.code; byHead.set(k, (byHead.get(k) ?? 0) + num(r.credit) + num(r.debit)); });
    return {
      ariaLabel: 'Member detail ledger',
      rows,
      rowKey: (r, i) => `${r.voucherNo}-${r.code}-${i}`,
      cols: [
        { key: 'date', label: 'DATE', width: '92px', render: r => dayjs(r.date).format('DD-MMM-YYYY'), sortValue: r => dayjs(r.date).valueOf() },
        { key: 'head', label: 'ACCOUNT HEAD', width: 'minmax(130px, 1.2fr)', render: r => <span title={r.accountHead}>{r.accountHead || r.code}</span>, sortValue: r => r.accountHead || r.code },
        { key: 'vch', label: 'VOUCHER', width: '84px', render: r => <span className="cbt-code">{r.voucherNo}</span>, sortValue: r => r.voucherNo || '' },
        { key: 'par', label: 'PARTICULARS', width: 'minmax(130px, 1.3fr)', render: r => <span title={r.particulars}>{r.particulars || '—'}</span>, sortValue: r => r.particulars || '' },
        { key: 'pay', label: 'PAYMENT', width: 'minmax(92px, .9fr)', num: true, render: r => <span className={num(r.debit) > 0 ? 'cbv-num tone-danger' : 'cbv-num cbv-faint'}>{fmt(num(r.debit))}</span>, sortValue: r => num(r.debit) },
        { key: 'rec', label: 'RECEIPT', width: 'minmax(92px, .9fr)', num: true, render: r => <span className={num(r.credit) > 0 ? 'cbv-num tone-success' : 'cbv-num cbv-faint'}>{fmt(num(r.credit))}</span>, sortValue: r => num(r.credit) },
        { key: 'bal', label: 'BALANCE', width: 'minmax(96px, .9fr)', num: true, render: r => <span className="cbv-num">{r.balance === undefined ? '—' : fmt(num(r.balance))}</span>, sortValue: r => num(r.balance) },
      ],
      searchText: r => `${r.accountHead} ${r.code} ${r.voucherNo} ${r.particulars}`,
      kpis: [
        { label: `Entries · ${data?.memberNumber ?? ''} ${data?.memberName ?? ''}`.trim(), value: String(rows.length), tone: 'accent' },
        { label: 'Total payment', value: fmt(debit), tone: 'danger' },
        { label: 'Total receipt', value: fmt(credit), tone: 'success' },
        { label: 'Heads touched', value: String(byHead.size), tone: 'muted' },
      ],
      heroNote: `Payments ₹${fmtShort(debit)} · receipts ₹${fmtShort(credit)}`,
      ranks: [
        { title: 'Activity by account head', tone: 'accent', rows: [...byHead.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({ key: k, name: k, value: v })) },
      ],
      footer: ['TOTAL', '', '', '', fmt(debit), fmt(credit), ''],
      tableTitle: 'Every entry',
      bentoLimit: 200,
    };
  }, [data]);
