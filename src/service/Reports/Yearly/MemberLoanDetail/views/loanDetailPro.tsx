import { useMemo } from 'react';
import dayjs from 'dayjs';
import type { ProSpec } from '../../../../../components/reports/views/GenericPro';
import { fmt, fmtShort } from '../../../../../components/reports/views/format';

export interface LoanDetailRow {
  key: string; memberNo: string; memberName: string; officeName: string; loanType: string; loanCaseNo: string;
  loanAmount: number; balance: number; interestRate: number; totalInstallments: number; installmentAmount: number;
  disbursementDate: string; appliedDate?: string; appliedAmount: number;
  surety1Mbno: string; surety1Name: string; surety2Mbno: string; surety2Name: string;
}
const num = (n: unknown) => Number(n) || 0;
const day = (d?: string) => (d ? dayjs(d).format('DD-MM-YYYY') : '—');

export const useLoanDetailSpec = (rows: LoanDetailRow[], label: string): ProSpec<LoanDetailRow> =>
  useMemo<ProSpec<LoanDetailRow>>(() => {
    const sanctioned = rows.reduce((s, r) => s + num(r.loanAmount), 0);
    const balance = rows.reduce((s, r) => s + num(r.balance), 0);
    const byType = new Map<string, number>();
    rows.forEach(r => byType.set(r.loanType || 'Other', (byType.get(r.loanType || 'Other') ?? 0) + num(r.balance)));
    return {
      ariaLabel: 'Member loan detail',
      rows,
      rowKey: (r, i) => `${r.memberNo}-${r.loanCaseNo}-${i}`,
      cols: [
        { key: 'mb', label: 'MEMBER', width: '90px', render: r => <span className="cbt-code">{r.memberNo}</span>, sortValue: r => r.memberNo },
        { key: 'nm', label: 'NAME', width: 'minmax(140px, 1.4fr)', render: r => <span title={r.memberName}>{r.memberName}</span>, sortValue: r => r.memberName },
        { key: 'ty', label: 'TYPE', width: '48px', render: r => r.loanType, sortValue: r => r.loanType },
        { key: 'cs', label: 'CASE', width: '66px', render: r => <span className="cbt-code">{r.loanCaseNo}</span>, sortValue: r => r.loanCaseNo },
        { key: 'dt', label: 'SANCTIONED', width: '90px', render: r => day(r.disbursementDate), sortValue: r => r.disbursementDate || '' },
        { key: 'la', label: 'LOAN', width: 'minmax(96px, .9fr)', num: true, render: r => <span className="cbv-num">{fmt(num(r.loanAmount))}</span>, sortValue: r => num(r.loanAmount) },
        { key: 'ba', label: 'BALANCE', width: 'minmax(96px, .9fr)', num: true, render: r => <span className="cbv-num tone-danger">{fmt(num(r.balance))}</span>, sortValue: r => num(r.balance) },
        { key: 'rt', label: 'RATE', width: '52px', num: true, render: r => `${r.interestRate}%`, sortValue: r => num(r.interestRate) },
        { key: 'em', label: 'EMI', width: 'minmax(76px, .6fr)', num: true, render: r => <span className="cbv-num">{fmt(num(r.installmentAmount))}</span>, sortValue: r => num(r.installmentAmount) },
      ],
      searchText: r => `${r.memberNo} ${r.memberName} ${r.loanType} ${r.loanCaseNo} ${r.surety1Name} ${r.surety2Name}`,
      kpis: [
        { label: `Outstanding · ${label}`, value: `₹${fmtShort(balance)}`, tone: 'danger' },
        { label: 'Loans', value: String(rows.length), tone: 'muted' },
        { label: 'Sanctioned', value: fmt(sanctioned), tone: 'muted' },
        { label: 'Repaid', value: fmt(Math.max(0, sanctioned - balance)), tone: 'success' },
      ],
      heroNote: `Exact outstanding ₹${fmt(balance)}`,
      ranks: [
        { title: 'Outstanding by loan type', tone: 'danger', rows: [...byType.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ key: k, name: k, value: v })) },
        { title: 'Largest balances', tone: 'danger', rows: [...rows].sort((a, b) => num(b.balance) - num(a.balance)).slice(0, 6).map((r, i) => ({ key: `${r.loanCaseNo}-${i}`, name: `${r.memberName} · ${r.loanType} ${r.loanCaseNo}`, value: num(r.balance) })) },
      ],
      footer: ['TOTAL', String(rows.length), '', '', '', fmt(sanctioned), fmt(balance), '', ''],
      tableTitle: 'All loans',
      bentoLimit: 150,
      side: r => r && (
        <>
          <div className="cbt-side-head">{r.memberName}</div>
          <div className="cbt-side-code">{r.memberNo} · {r.loanType} {r.loanCaseNo}</div>
          <dl>
            <div><dt>Sanctioned</dt><dd>{day(r.disbursementDate)}</dd></div>
            <div><dt>Loan amount</dt><dd className="cbv-num">{fmt(num(r.loanAmount))}</dd></div>
            <div><dt>Balance</dt><dd className="cbv-num tone-danger">{fmt(num(r.balance))}</dd></div>
            <div><dt>Rate</dt><dd>{r.interestRate}%</dd></div>
            <div><dt>Installments</dt><dd>{r.totalInstallments} × {fmt(num(r.installmentAmount))}</dd></div>
            <div><dt>Applied</dt><dd>{fmt(num(r.appliedAmount))} on {day(r.appliedDate)}</dd></div>
            <div><dt>Surety 1</dt><dd style={{ textAlign: 'right' }}>{r.surety1Name ? `${r.surety1Name} (${r.surety1Mbno})` : '—'}</dd></div>
            <div><dt>Surety 2</dt><dd style={{ textAlign: 'right' }}>{r.surety2Name ? `${r.surety2Name} (${r.surety2Mbno})` : '—'}</dd></div>
          </dl>
        </>
      ),
      sideTitle: 'LOAN',
    };
  }, [rows, label]);
