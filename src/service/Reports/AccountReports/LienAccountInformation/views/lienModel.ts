import dayjs from 'dayjs';
export { fmt, fmtShort } from '../../../../../components/reports/views/format';

export interface LienItem {
  key: string;
  memberNo: string;
  memberName: string;
  loanCaseNo: string;
  lienAmount: number;
  lienFromDate: string;
}

export interface LienDerived {
  total: number;
  count: number;
  members: number;
  average: number;
  largest: LienItem[];
  /** Amount newly locked per month, oldest first. */
  byMonth: { month: string; value: number }[];
}

export const deriveLien = (items: LienItem[]): LienDerived => {
  const total = items.reduce((s, r) => s + (Number(r.lienAmount) || 0), 0);
  const months = new Map<string, number>();
  items.forEach(r => {
    if (!r.lienFromDate) return;
    const m = dayjs(r.lienFromDate).format('YYYY-MM');
    months.set(m, (months.get(m) ?? 0) + (Number(r.lienAmount) || 0));
  });
  return {
    total,
    count: items.length,
    members: new Set(items.map(r => r.memberNo)).size,
    average: items.length ? total / items.length : 0,
    largest: [...items].sort((a, b) => (Number(b.lienAmount) || 0) - (Number(a.lienAmount) || 0)).slice(0, 6),
    byMonth: [...months.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, value]) => ({ month, value })),
  };
};
