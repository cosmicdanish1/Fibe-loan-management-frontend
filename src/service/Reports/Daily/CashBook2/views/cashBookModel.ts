export interface CashBookEntry {
  headCode: string;
  headName: string;
  receipt: number;
  payment: number;
  receiptCash: number;
  receiptTransfer: number;
  paymentCash: number;
  paymentTransfer: number;
}

export interface CashBook2Summary {
  date: string;
  totalReceipts: number;
  totalPayments: number;
  totalReceiptsCash: number;
  totalReceiptsTransfer: number;
  totalPaymentsCash: number;
  totalPaymentsTransfer: number;
  openingBalance: number;
  closingBalance: number;
  entries: CashBookEntry[];
}

import { pct } from '../../../../../components/reports/views/format';
export { fmt, fmtShort, pct } from '../../../../../components/reports/views/format';

export interface CashBookDerived {
  /** Opening + receipts - payments, compared with the closing balance the report states. */
  computedClosing: number;
  difference: number;
  balanced: boolean;
  topReceipts: CashBookEntry[];
  topPayments: CashBookEntry[];
  receiptCashPct: number;
  paymentCashPct: number;
  /** Net cash movement: cash in less cash out. */
  netCash: number;
  /** Net transfer movement. */
  netTransfer: number;
}

export const deriveCashBook = (d: CashBook2Summary): CashBookDerived => {
  const computedClosing = d.openingBalance + d.totalReceipts - d.totalPayments;
  const difference = Math.round((computedClosing - d.closingBalance) * 100) / 100;
  return {
    computedClosing,
    difference,
    balanced: Math.abs(difference) < 0.01,
    topReceipts: [...d.entries].filter(e => e.receipt > 0).sort((a, b) => b.receipt - a.receipt).slice(0, 6),
    topPayments: [...d.entries].filter(e => e.payment > 0).sort((a, b) => b.payment - a.payment).slice(0, 6),
    receiptCashPct: pct(d.totalReceiptsCash, d.totalReceipts),
    paymentCashPct: pct(d.totalPaymentsCash, d.totalPayments),
    netCash: d.totalReceiptsCash - d.totalPaymentsCash,
    netTransfer: d.totalReceiptsTransfer - d.totalPaymentsTransfer,
  };
};
