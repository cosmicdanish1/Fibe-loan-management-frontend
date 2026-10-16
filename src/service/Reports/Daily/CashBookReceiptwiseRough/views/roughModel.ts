import { pct } from '../../../../../components/reports/views/format';
export { fmt, fmtShort } from '../../../../../components/reports/views/format';

export interface VoucherEntry {
  sno: number;
  headCode: string;
  headName: string;
  description: string;
  receipt: number;
  payment: number;
}

export interface Voucher {
  voucherNo: string;
  memberNo: string;
  memberName: string;
  modeOfPayment: string;
  narration: string;
  entries: VoucherEntry[];
  totalPayment: number;
  totalReceipt: number;
}

export interface CashBookRoughData {
  date: string;
  openingBalance: number;
  totalReceipts: number;
  totalPayments: number;
  closingBalance: number;
  vouchers: Voucher[];
}

/** One ledger leg with its voucher context, for flat tables. */
export interface FlatRow {
  id: string;
  voucherIdx: number;
  voucherNo: string;
  memberNo: string;
  memberName: string;
  mode: string;
  narration: string;
  sno: number;
  headCode: string;
  headName: string;
  description: string;
  receipt: number;
  payment: number;
}

export interface Group { key: string; name: string; receipt: number; payment: number; count: number }

export interface RoughDerived {
  flat: FlatRow[];
  entryCount: number;
  computedClosing: number;
  difference: number;
  balanced: boolean;
  modes: Group[];
  heads: Group[];
  members: Group[];
  topReceiptHeads: Group[];
  topPaymentHeads: Group[];
  topMembers: Group[];
}

const bump = (map: Map<string, Group>, key: string, name: string, receipt: number, payment: number) => {
  const g = map.get(key) ?? { key, name, receipt: 0, payment: 0, count: 0 };
  g.receipt += receipt; g.payment += payment; g.count += 1;
  map.set(key, g);
};

export const deriveRough = (d: CashBookRoughData): RoughDerived => {
  const flat: FlatRow[] = [];
  const modes = new Map<string, Group>();
  const heads = new Map<string, Group>();
  const members = new Map<string, Group>();

  d.vouchers.forEach((v, vi) => {
    const mode = (v.modeOfPayment || 'Cash').trim() || 'Cash';
    bump(modes, mode.toLowerCase(), mode, v.totalReceipt, v.totalPayment);
    bump(members, v.memberNo || '—', `${v.memberNo} ${v.memberName}`.trim() || '—', v.totalReceipt, v.totalPayment);
    v.entries.forEach(e => {
      bump(heads, e.headCode, e.headName || e.description || e.headCode, e.receipt, e.payment);
      flat.push({
        id: `${vi}-${e.sno}`, voucherIdx: vi, voucherNo: v.voucherNo, memberNo: v.memberNo, memberName: v.memberName,
        mode, narration: v.narration, sno: e.sno, headCode: e.headCode, headName: e.headName || e.description,
        description: e.description, receipt: e.receipt, payment: e.payment,
      });
    });
  });

  const computedClosing = d.openingBalance + d.totalReceipts - d.totalPayments;
  const difference = Math.round((computedClosing - d.closingBalance) * 100) / 100;
  const byReceipt = (a: Group, b: Group) => b.receipt - a.receipt;
  const byPayment = (a: Group, b: Group) => b.payment - a.payment;
  const headList = [...heads.values()];
  return {
    flat,
    entryCount: flat.length,
    computedClosing,
    difference,
    balanced: Math.abs(difference) < 0.01,
    modes: [...modes.values()].sort((a, b) => (b.receipt + b.payment) - (a.receipt + a.payment)),
    heads: headList,
    members: [...members.values()],
    topReceiptHeads: headList.filter(h => h.receipt > 0).sort(byReceipt).slice(0, 6),
    topPaymentHeads: headList.filter(h => h.payment > 0).sort(byPayment).slice(0, 6),
    topMembers: [...members.values()].sort((a, b) => (b.receipt + b.payment) - (a.receipt + a.payment)).slice(0, 6),
  };
};

export const share = pct;
