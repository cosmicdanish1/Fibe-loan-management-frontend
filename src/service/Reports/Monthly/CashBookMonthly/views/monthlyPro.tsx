import React, { useMemo } from 'react';
import { GenericBento, GenericEditorial, GenericTerminal, type ProSpec } from '../../../../../components/reports/views/GenericPro';
import { fmt, fmtShort } from '../../../../../components/reports/views/format';

export interface MonthRow { key: string; code: string; headName: string; receipt: number; payment: number }

const top = (rows: MonthRow[], f: (r: MonthRow) => number) =>
  [...rows].filter(r => f(r) > 0).sort((a, b) => f(b) - f(a)).slice(0, 6).map(r => ({ key: r.key, name: `${r.headName} (${r.code})`, value: f(r) }));

export const useMonthSpec = (rows: MonthRow[], opening: number, closing: number, totalReceipt: number, totalPayment: number): ProSpec<MonthRow> =>
  useMemo<ProSpec<MonthRow>>(() => ({
    ariaLabel: 'Cash book by head',
    rows,
    rowKey: r => r.key,
    cols: [
      { key: 'code', label: 'CODE', width: '84px', render: r => <span className="cbt-code">{r.code}</span>, sortValue: r => r.code },
      { key: 'head', label: 'HEAD', width: 'minmax(160px, 1.6fr)', render: r => <span title={r.headName}>{r.headName}</span>, sortValue: r => r.headName },
      { key: 'rec', label: 'RECEIPT', width: 'minmax(110px, 1fr)', num: true, render: r => <span className={r.receipt > 0 ? 'cbv-num tone-success' : 'cbv-num cbv-faint'}>{fmt(r.receipt)}</span>, sortValue: r => r.receipt },
      { key: 'pay', label: 'PAYMENT', width: 'minmax(110px, 1fr)', num: true, render: r => <span className={r.payment > 0 ? 'cbv-num tone-danger' : 'cbv-num cbv-faint'}>{fmt(r.payment)}</span>, sortValue: r => r.payment },
    ],
    searchText: r => `${r.code} ${r.headName}`,
    kpis: [
      { label: 'Closing balance', value: `₹${fmtShort(closing)}`, tone: 'accent' },
      { label: 'Opening', value: fmt(opening), tone: 'muted' },
      { label: 'Receipts', value: fmt(totalReceipt), tone: 'success' },
      { label: 'Payments', value: fmt(totalPayment), tone: 'danger' },
    ],
    heroNote: `Opening ${fmtShort(opening)} + receipts ${fmtShort(totalReceipt)} − payments ${fmtShort(totalPayment)}`,
    ranks: [
      { title: 'Largest receipt heads', tone: 'success', rows: top(rows, r => r.receipt) },
      { title: 'Largest payment heads', tone: 'danger', rows: top(rows, r => r.payment) },
    ],
    footer: ['TOTAL', '', fmt(totalReceipt), fmt(totalPayment)],
    tableTitle: 'All heads',
  }), [rows, opening, closing, totalReceipt, totalPayment]);

export const MonthBento: React.FC<{ spec: ProSpec<MonthRow> }> = ({ spec }) => <GenericBento spec={spec} />;
export const MonthTerminal: React.FC<{ spec: ProSpec<MonthRow> }> = ({ spec }) => <GenericTerminal spec={spec} />;
export const MonthEditorial: React.FC<{ spec: ProSpec<MonthRow>; month: string }> = ({ spec, month }) => (
  <GenericEditorial spec={spec} title="Cash Book Monthly" subtitle={month} />
);
