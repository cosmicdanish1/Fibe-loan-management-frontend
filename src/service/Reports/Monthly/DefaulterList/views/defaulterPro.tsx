import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { GenericBento, GenericEditorial, GenericTerminal, type ProSpec } from '../../../../../components/reports/views/GenericPro';
import { fmt, fmtShort } from '../../../../../components/reports/views/format';

export interface DefaulterRow {
  key: string; memberNo: string; memberName: string; officeName: string; loanType: string; loanCaseNo: string;
  loanAmount: number; balance: number; installments: number; lastPaymentDate: string; monthsOverdue: number; penalDue: number;
}

const num = (n: unknown) => Number(n) || 0;

export const useDefaulterSpec = (rows: DefaulterRow[], minBalance: number): ProSpec<DefaulterRow> =>
  useMemo<ProSpec<DefaulterRow>>(() => {
    const outstanding = rows.reduce((s, r) => s + num(r.balance), 0);
    const loan = rows.reduce((s, r) => s + num(r.loanAmount), 0);
    const penal = rows.reduce((s, r) => s + num(r.penalDue), 0);
    const byType = new Map<string, number>();
    rows.forEach(r => byType.set(r.loanType || 'Other', (byType.get(r.loanType || 'Other') ?? 0) + num(r.balance)));
    return {
      ariaLabel: 'Defaulters',
      rows,
      rowKey: r => `${r.memberNo}-${r.loanCaseNo}`,
      cols: [
        { key: 'mb', label: 'MEMBER', width: '86px', render: r => <span className="cbt-code">{r.memberNo}</span>, sortValue: r => r.memberNo },
        { key: 'nm', label: 'NAME', width: 'minmax(140px, 1.4fr)', render: r => <span title={r.memberName}>{r.memberName}</span>, sortValue: r => r.memberName },
        { key: 'ty', label: 'TYPE', width: '48px', render: r => r.loanType, sortValue: r => r.loanType },
        { key: 'cs', label: 'CASE', width: '66px', render: r => <span className="cbt-code">{r.loanCaseNo}</span>, sortValue: r => r.loanCaseNo },
        { key: 'la', label: 'LOAN', width: 'minmax(96px, .9fr)', num: true, render: r => <span className="cbv-num">{fmt(num(r.loanAmount))}</span>, sortValue: r => num(r.loanAmount) },
        { key: 'bal', label: 'OUTSTANDING', width: 'minmax(104px, 1fr)', num: true, render: r => <span className="cbv-num tone-danger">{fmt(num(r.balance))}</span>, sortValue: r => num(r.balance) },
        { key: 'od', label: 'OVERDUE', width: '66px', num: true, render: r => (num(r.monthsOverdue) > 0 ? `${r.monthsOverdue} mo` : '—'), sortValue: r => num(r.monthsOverdue) },
        { key: 'pn', label: 'PENAL', width: 'minmax(80px, .7fr)', num: true, render: r => <span className="cbv-num">{num(r.penalDue) > 0 ? fmt(num(r.penalDue)) : '—'}</span>, sortValue: r => num(r.penalDue) },
      ],
      searchText: r => `${r.memberNo} ${r.memberName} ${r.loanType} ${r.loanCaseNo}`,
      kpis: [
        { label: `Outstanding · balance ≥ ${fmtShort(minBalance)}`, value: `₹${fmtShort(outstanding)}`, tone: 'danger' },
        { label: 'Defaulters', value: String(rows.length), tone: 'muted' },
        { label: 'Loan amount', value: fmt(loan), tone: 'muted' },
        { label: 'Penal due', value: fmt(penal), tone: 'warning' },
      ],
      heroNote: `${rows.length} loans · exact outstanding ₹${fmt(outstanding)}`,
      ranks: [
        { title: 'Outstanding by loan type', tone: 'danger', rows: [...byType.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ key: k, name: k, value: v })) },
        { title: 'Largest outstanding balances', tone: 'danger', rows: [...rows].sort((a, b) => num(b.balance) - num(a.balance)).slice(0, 6).map(r => ({ key: `${r.memberNo}-${r.loanCaseNo}`, name: `${r.memberName} · ${r.loanType} ${r.loanCaseNo}`, value: num(r.balance) })) },
      ],
      footer: ['TOTAL', '', '', '', fmt(loan), fmt(outstanding), '', fmt(penal)],
      tableTitle: 'All defaulters',
      bentoLimit: 100,
      side: r => r && (
        <>
          <div className="cbt-side-head">{r.memberName}</div>
          <div className="cbt-side-code">{r.memberNo}</div>
          <dl>
            <div><dt>Loan</dt><dd>{r.loanType} {r.loanCaseNo}</dd></div>
            <div><dt>Loan amount</dt><dd className="cbv-num">{fmt(num(r.loanAmount))}</dd></div>
            <div><dt>Outstanding</dt><dd className="cbv-num tone-danger">{fmt(num(r.balance))}</dd></div>
            <div><dt>Installments</dt><dd>{r.installments}</dd></div>
            <div><dt>Months overdue</dt><dd>{num(r.monthsOverdue) > 0 ? r.monthsOverdue : '—'}</dd></div>
            <div><dt>Penal due</dt><dd className="cbv-num">{fmt(num(r.penalDue))}</dd></div>
            <div><dt>Last payment</dt><dd>{r.lastPaymentDate ? dayjs(r.lastPaymentDate).format('DD-MMM-YYYY') : '—'}</dd></div>
            <div><dt>Office</dt><dd>{r.officeName || '—'}</dd></div>
          </dl>
        </>
      ),
      sideTitle: 'LOAN',
    };
  }, [rows, minBalance]);

export const ProBento = GenericBento;
export const ProTerm = GenericTerminal;
export const ProEd: React.FC<{ spec: ProSpec<DefaulterRow>; subtitle: string }> = ({ spec, subtitle }) => (
  <GenericEditorial spec={spec} title="Defaulter List" subtitle={subtitle} />
);
