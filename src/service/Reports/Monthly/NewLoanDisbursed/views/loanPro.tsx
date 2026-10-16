import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { GenericBento, GenericEditorial, GenericTerminal, type ProSpec } from '../../../../../components/reports/views/GenericPro';
import { fmt, fmtShort } from '../../../../../components/reports/views/format';

export interface LoanRow {
  key: string; memberNo: string; memberName: string; officeName: string; loanType: string; loanCaseNo: string;
  loanAmount: number; disbursementDate: string; installments: number; installmentAmount: number; interestRate: number;
}
const num = (n: unknown) => Number(n) || 0;

export const useLoanSpec = (rows: LoanRow[], period: string): ProSpec<LoanRow> =>
  useMemo<ProSpec<LoanRow>>(() => {
    const total = rows.reduce((s, r) => s + num(r.loanAmount), 0);
    const byType = new Map<string, number>();
    rows.forEach(r => byType.set(r.loanType || 'Other', (byType.get(r.loanType || 'Other') ?? 0) + num(r.loanAmount)));
    const avgRate = rows.length ? rows.reduce((s, r) => s + num(r.interestRate), 0) / rows.length : 0;
    return {
      ariaLabel: 'New loans disbursed',
      rows,
      rowKey: r => r.key,
      cols: [
        { key: 'mb', label: 'MEMBER', width: '86px', render: r => <span className="cbt-code">{r.memberNo}</span>, sortValue: r => r.memberNo },
        { key: 'nm', label: 'NAME', width: 'minmax(140px, 1.5fr)', render: r => <span title={r.memberName}>{r.memberName}</span>, sortValue: r => r.memberName },
        { key: 'ty', label: 'TYPE', width: '48px', render: r => r.loanType, sortValue: r => r.loanType },
        { key: 'cs', label: 'CASE', width: '70px', render: r => <span className="cbt-code">{r.loanCaseNo}</span>, sortValue: r => r.loanCaseNo },
        { key: 'am', label: 'AMOUNT', width: 'minmax(100px, 1fr)', num: true, render: r => <span className="cbv-num tone-success">{fmt(num(r.loanAmount))}</span>, sortValue: r => num(r.loanAmount) },
        { key: 'dt', label: 'DATE', width: '84px', render: r => dayjs(r.disbursementDate).format('DD-MM-YYYY'), sortValue: r => r.disbursementDate },
        { key: 'em', label: 'EMI', width: 'minmax(80px, .7fr)', num: true, render: r => <span className="cbv-num">{fmt(num(r.installmentAmount))}</span>, sortValue: r => num(r.installmentAmount) },
        { key: 'in', label: 'INST', width: '48px', num: true, render: r => String(r.installments ?? ''), sortValue: r => num(r.installments) },
        { key: 'rt', label: 'RATE', width: '56px', num: true, render: r => `${r.interestRate}%`, sortValue: r => num(r.interestRate) },
      ],
      searchText: r => `${r.memberNo} ${r.memberName} ${r.loanType} ${r.loanCaseNo}`,
      kpis: [
        { label: 'Disbursed', value: `₹${fmtShort(total)}`, tone: 'success' },
        { label: 'Loans', value: String(rows.length), tone: 'muted' },
        { label: 'Average loan', value: fmt(rows.length ? total / rows.length : 0), tone: 'muted' },
        { label: 'Average rate', value: `${avgRate.toFixed(2)}%`, tone: 'muted' },
      ],
      heroNote: `${period} · exact total ₹${fmt(total)}`,
      ranks: [
        { title: 'Disbursed by loan type', tone: 'success', rows: [...byType.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ key: k, name: k, value: v })) },
        { title: 'Largest loans', tone: 'accent', rows: [...rows].sort((a, b) => num(b.loanAmount) - num(a.loanAmount)).slice(0, 6).map(r => ({ key: r.key, name: `${r.memberName} · ${r.loanType} ${r.loanCaseNo}`, value: num(r.loanAmount) })) },
      ],
      footer: ['TOTAL', '', '', '', fmt(total), '', '', '', ''],
      tableTitle: 'All loans',
      side: r => r && (
        <>
          <div className="cbt-side-head">{r.memberName}</div>
          <div className="cbt-side-code">{r.memberNo}</div>
          <dl>
            <div><dt>Loan</dt><dd>{r.loanType} {r.loanCaseNo}</dd></div>
            <div><dt>Amount</dt><dd className="cbv-num tone-success">{fmt(num(r.loanAmount))}</dd></div>
            <div><dt>Disbursed</dt><dd>{dayjs(r.disbursementDate).format('DD-MMM-YYYY')}</dd></div>
            <div><dt>Installments</dt><dd>{r.installments} × {fmt(num(r.installmentAmount))}</dd></div>
            <div><dt>Rate</dt><dd>{r.interestRate}%</dd></div>
            <div><dt>Office</dt><dd>{r.officeName || '—'}</dd></div>
          </dl>
        </>
      ),
      sideTitle: 'LOAN',
    };
  }, [rows, period]);

export const ProBento = GenericBento;
export const ProTerm = GenericTerminal;
export const ProEd: React.FC<{ spec: ProSpec<LoanRow>; subtitle: string }> = ({ spec, subtitle }) => (
  <GenericEditorial spec={spec} title="New Loan Disbursed Register" subtitle={subtitle} />
);
