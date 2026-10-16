import dayjs from 'dayjs';
export { fmt, fmtShort } from '../../../../../components/reports/views/format';

export interface ClosingItem {
  key: string;
  memberCode: string;
  memberName: string;
  accountNo: string;
  accountType: string;
  closingDate: string;
  finalAmount: number;
  description: string;
}

export interface Rank { key: string; name: string; value: number; count: number }

export interface ClosingDerived {
  total: number;
  count: number;
  average: number;
  byType: Rank[];
  byReason: Rank[];
  top: ClosingItem[];
  /** Closing amounts per calendar day, oldest first, for the trend line. */
  daily: { day: string; value: number }[];
}

const typeName = (t: string) => (t === 'FD' ? 'Special Deposit (FD)' : t === 'RD' ? 'Recurring Deposit (RD)' : t || 'Other');

export const deriveClosing = (items: ClosingItem[]): ClosingDerived => {
  const total = items.reduce((s, r) => s + (Number(r.finalAmount) || 0), 0);
  const types = new Map<string, Rank>();
  const reasons = new Map<string, Rank>();
  const days = new Map<string, number>();
  items.forEach(r => {
    const amt = Number(r.finalAmount) || 0;
    const t = types.get(r.accountType) ?? { key: r.accountType, name: typeName(r.accountType), value: 0, count: 0 };
    t.value += amt; t.count += 1; types.set(r.accountType, t);
    const reason = (r.description || '').trim() || 'No reason recorded';
    const q = reasons.get(reason) ?? { key: reason, name: reason, value: 0, count: 0 };
    q.value += amt; q.count += 1; reasons.set(reason, q);
    const d = r.closingDate ? dayjs(r.closingDate).format('YYYY-MM-DD') : '';
    if (d) days.set(d, (days.get(d) ?? 0) + amt);
  });
  return {
    total,
    count: items.length,
    average: items.length ? total / items.length : 0,
    byType: [...types.values()].sort((a, b) => b.value - a.value),
    byReason: [...reasons.values()].sort((a, b) => b.count - a.count).slice(0, 6),
    top: [...items].sort((a, b) => b.finalAmount - a.finalAmount).slice(0, 6),
    daily: [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, value]) => ({ day, value })),
  };
};
