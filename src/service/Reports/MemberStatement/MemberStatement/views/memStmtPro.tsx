import { useMemo } from 'react';
import type { ProSpec } from '../../../../../components/reports/views/GenericPro';
import { fmt, fmtShort } from '../../../../../components/reports/views/format';

export interface StmtItem { headCode: string; headName: string; balance: number }
const num = (n: unknown) => Number(n) || 0;
/** Same split the Legacy statement uses: loans sit on the Payment side, deposits on the Receipt side. */
const isLoan = (i: StmtItem) => (i.headCode?.startsWith('A') ?? false) || /loan/i.test(i.headName);

export const useMemStmtSpec = (rows: StmtItem[], who: string, asOn: string): ProSpec<StmtItem> =>
  useMemo<ProSpec<StmtItem>>(() => {
    const deposits = rows.filter(r => !isLoan(r)).reduce((s, r) => s + num(r.balance), 0);
    const loans = rows.filter(isLoan).reduce((s, r) => s + num(r.balance), 0);
    const top = (loan: boolean) => rows.filter(r => isLoan(r) === loan && num(r.balance) !== 0).sort((a, b) => Math.abs(num(b.balance)) - Math.abs(num(a.balance))).slice(0, 8)
      .map(r => ({ key: r.headCode, name: `${r.headName} (${r.headCode})`, value: Math.abs(num(r.balance)) }));
    return {
      ariaLabel: 'Member statement',
      rows,
      rowKey: (r, i) => `${r.headCode}-${i}`,
      cols: [
        { key: 'side', label: 'SIDE', width: '80px', render: r => <span className={isLoan(r) ? 'tone-danger' : 'tone-success'}>{isLoan(r) ? 'Loan' : 'Deposit'}</span>, sortValue: r => (isLoan(r) ? 1 : 0) },
        { key: 'code', label: 'CODE', width: '86px', render: r => <span className="cbt-code">{r.headCode}</span>, sortValue: r => r.headCode },
        { key: 'head', label: 'HEAD', width: 'minmax(180px, 2fr)', render: r => <span title={r.headName}>{r.headName}</span>, sortValue: r => r.headName },
        { key: 'bal', label: 'BALANCE', width: 'minmax(120px, 1fr)', num: true, render: r => <span className="cbv-num">{fmt(num(r.balance))}</span>, sortValue: r => num(r.balance) },
      ],
      searchText: r => `${r.headCode} ${r.headName}`,
      kpis: [
        { label: `Deposits · ${who}`, value: `₹${fmtShort(deposits)}`, tone: 'success' },
        { label: 'Loans', value: fmt(loans), tone: 'danger' },
        { label: 'Deposits − loans', value: fmt(deposits - loans), tone: deposits - loans >= 0 ? 'success' : 'warning' },
        { label: `Heads · as on ${asOn}`, value: String(rows.length), tone: 'muted' },
      ],
      heroNote: `Exact deposits ₹${fmt(deposits)}`,
      ranks: [
        { title: 'Deposit heads', tone: 'success', rows: top(false) },
        { title: 'Loan heads', tone: 'danger', rows: top(true) },
      ],
      footer: ['', '', 'DEPOSITS / LOANS', `${fmt(deposits)} / ${fmt(loans)}`],
      tableTitle: 'Every head',
    };
  }, [rows, who, asOn]);
