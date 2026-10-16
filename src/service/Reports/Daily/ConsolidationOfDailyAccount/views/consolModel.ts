export { fmt, fmtShort } from '../../../../../components/reports/views/format';

export interface SubEntry {
  mbNo: string;
  memberName: string;
  amount: number;
}

export interface HeadGroup {
  headCode: string;
  headName: string;
  total: number;
  subEntries: SubEntry[];
}

export interface ConsolidationData {
  date: string;
  openingBalance: number | null;
  totalReceipts: number;
  totalPayments: number;
  totalCash: number | null;
  closingBalance: number | null;
  netBalance: number;
  receiptGroups: HeadGroup[];
  paymentGroups: HeadGroup[];
  totalHeads: number;
}

export interface ConsolRank { key: string; name: string; value: number }

export interface ConsolDerived {
  topReceipts: ConsolRank[];
  topPayments: ConsolRank[];
  receiptHeads: number;
  paymentHeads: number;
  members: number;
  receiptShare: number;
}

export const deriveConsolidation = (d: ConsolidationData): ConsolDerived => {
  const rank = (groups: HeadGroup[]) =>
    [...groups].filter(g => g.total > 0).sort((a, b) => b.total - a.total).slice(0, 6)
      .map(g => ({ key: g.headCode + g.headName, name: g.headName || g.headCode, value: g.total }));
  const members = new Set<string>();
  [...d.receiptGroups, ...d.paymentGroups].forEach(g => g.subEntries.forEach(e => e.mbNo && members.add(e.mbNo)));
  const turnover = d.totalReceipts + d.totalPayments;
  return {
    topReceipts: rank(d.receiptGroups),
    topPayments: rank(d.paymentGroups),
    receiptHeads: d.receiptGroups.length,
    paymentHeads: d.paymentGroups.length,
    members: members.size,
    receiptShare: turnover > 0 ? (d.totalReceipts / turnover) * 100 : 0,
  };
};
