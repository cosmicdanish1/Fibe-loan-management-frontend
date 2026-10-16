import { useMemo } from 'react';
import dayjs from 'dayjs';
import type { ProSpec } from '../../../../../components/reports/views/GenericPro';
import { fmt, fmtShort } from '../../../../../components/reports/views/format';

export interface SavingTx { date: string | Date; voucherNo: string; particulars: string; withdrawal: number; deposit: number; balance: number }
export interface SavingData { memberNo: string; memberName: string; openingBalance: number; closingBalance: number; transactions: SavingTx[] }
const num = (n: unknown) => Number(n) || 0;

export const useSavingSpec = (data: SavingData | null): ProSpec<SavingTx> =>
  useMemo<ProSpec<SavingTx>>(() => {
    const rows = data?.transactions ?? [];
    const dep = rows.reduce((s, r) => s + num(r.deposit), 0);
    const wd = rows.reduce((s, r) => s + num(r.withdrawal), 0);
    const open = num(data?.openingBalance);
    const close = num(data?.closingBalance);
    return {
      ariaLabel: 'Saving statement',
      rows,
      rowKey: (r, i) => `${r.voucherNo}-${i}`,
      cols: [
        { key: 'date', label: 'DATE', width: '92px', render: r => dayjs(r.date).format('DD-MMM-YYYY'), sortValue: r => dayjs(r.date).valueOf() },
        { key: 'vch', label: 'VOUCHER', width: '84px', render: r => <span className="cbt-code">{r.voucherNo}</span>, sortValue: r => r.voucherNo || '' },
        { key: 'par', label: 'PARTICULARS', width: 'minmax(150px, 1.6fr)', render: r => <span title={r.particulars}>{r.particulars || '—'}</span>, sortValue: r => r.particulars || '' },
        { key: 'wd', label: 'WITHDRAWAL', width: 'minmax(96px, 1fr)', num: true, render: r => <span className={num(r.withdrawal) > 0 ? 'cbv-num tone-danger' : 'cbv-num cbv-faint'}>{fmt(num(r.withdrawal))}</span>, sortValue: r => num(r.withdrawal) },
        { key: 'dp', label: 'DEPOSIT', width: 'minmax(96px, 1fr)', num: true, render: r => <span className={num(r.deposit) > 0 ? 'cbv-num tone-success' : 'cbv-num cbv-faint'}>{fmt(num(r.deposit))}</span>, sortValue: r => num(r.deposit) },
        { key: 'bal', label: 'BALANCE', width: 'minmax(104px, 1fr)', num: true, render: r => <span className="cbv-num">{fmt(num(r.balance))}</span>, sortValue: r => num(r.balance) },
      ],
      searchText: r => `${r.voucherNo} ${r.particulars}`,
      kpis: [
        { label: `Closing balance · ${data?.memberNo ?? ''} ${data?.memberName ?? ''}`.trim(), value: `₹${fmtShort(close)}`, tone: 'accent' },
        { label: 'Opening', value: fmt(open), tone: 'muted' },
        { label: 'Deposits', value: fmt(dep), tone: 'success' },
        { label: 'Withdrawals', value: fmt(wd), tone: 'danger' },
      ],
      heroNote: `${rows.length} transactions · opening ${fmtShort(open)} → closing ${fmtShort(close)}`,
      ranks: [
        { title: 'Largest deposits', tone: 'success', rows: [...rows].filter(r => num(r.deposit) > 0).sort((a, b) => num(b.deposit) - num(a.deposit)).slice(0, 6).map((r, i) => ({ key: `d${i}`, name: `${dayjs(r.date).format('DD-MMM-YY')} · ${r.voucherNo}`, value: num(r.deposit) })) },
        { title: 'Largest withdrawals', tone: 'danger', rows: [...rows].filter(r => num(r.withdrawal) > 0).sort((a, b) => num(b.withdrawal) - num(a.withdrawal)).slice(0, 6).map((r, i) => ({ key: `w${i}`, name: `${dayjs(r.date).format('DD-MMM-YY')} · ${r.voucherNo}`, value: num(r.withdrawal) })) },
      ],
      footer: ['TOTAL', '', '', fmt(wd), fmt(dep), fmt(close)],
      tableTitle: 'All transactions',
    };
  }, [data]);
