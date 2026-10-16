export { fmt, fmtShort } from '../../../../../components/reports/views/format';

export interface DayBookEntry {
  mbNo: string;
  memberName: string;
  voucherNo: string;
  amount: number;
  username: string;
}

export interface HeadGroup {
  headCode: string;
  headName: string;
  entries: DayBookEntry[];
  total: number;
}

export interface DayBookData {
  date: string;
  openingBalance: number;
  totalReceipts: number;
  totalPayments: number;
  closingBalance: number;
  paymentGroups: HeadGroup[];
  receiptGroups: HeadGroup[];
  totalTransactions: number;
}

export type Side = 'Payment' | 'Receipt';

export interface DayRow {
  id: string;
  side: Side;
  headCode: string;
  headName: string;
  mbNo: string;
  memberName: string;
  voucherNo: string;
  amount: number;
  username: string;
}

export interface Rank { key: string; name: string; value: number; count: number }

export interface DayBookDerived {
  rows: DayRow[];
  vouchers: number;
  members: number;
  heads: number;
  computedClosing: number;
  difference: number;
  balanced: boolean;
  topReceiptHeads: Rank[];
  topPaymentHeads: Rank[];
  users: Rank[];
}

const rank = (map: Map<string, Rank>) => [...map.values()].sort((a, b) => b.value - a.value);
const bump = (map: Map<string, Rank>, key: string, name: string, value: number) => {
  const r = map.get(key) ?? { key, name, value: 0, count: 0 };
  r.value += value; r.count += 1;
  map.set(key, r);
};

export const deriveDayBook = (d: DayBookData): DayBookDerived => {
  const rows: DayRow[] = [];
  const vouchers = new Set<string>();
  const members = new Set<string>();
  const heads = new Set<string>();
  const users = new Map<string, Rank>();

  const walk = (groups: HeadGroup[] | undefined, side: Side) => {
    (groups ?? []).forEach((g, gi) => {
      heads.add(`${side}-${g.headCode}`);
      g.entries.forEach((e, ei) => {
        vouchers.add(e.voucherNo);
        members.add(e.mbNo);
        bump(users, e.username || '—', e.username || '—', e.amount);
        rows.push({
          id: `${side}-${gi}-${ei}`, side, headCode: g.headCode, headName: g.headName,
          mbNo: e.mbNo, memberName: e.memberName, voucherNo: e.voucherNo, amount: e.amount, username: e.username,
        });
      });
    });
  };
  walk(d.paymentGroups, 'Payment');
  walk(d.receiptGroups, 'Receipt');

  const headRank = (groups: HeadGroup[] | undefined) =>
    (groups ?? []).map(g => ({ key: g.headCode, name: g.headName, value: g.total, count: g.entries.length }))
      .sort((a, b) => b.value - a.value).slice(0, 6);

  const computedClosing = d.openingBalance + d.totalReceipts - d.totalPayments;
  const difference = Math.round((computedClosing - d.closingBalance) * 100) / 100;
  return {
    rows,
    vouchers: vouchers.size,
    members: members.size,
    heads: heads.size,
    computedClosing,
    difference,
    balanced: Math.abs(difference) < 0.01,
    topReceiptHeads: headRank(d.receiptGroups),
    topPaymentHeads: headRank(d.paymentGroups),
    users: rank(users).slice(0, 6),
  };
};
