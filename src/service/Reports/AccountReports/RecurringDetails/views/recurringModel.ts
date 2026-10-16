export { fmt, fmtShort } from '../../../../../components/reports/views/format';

// One row per FINANCIAL YEAR the member has RD activity in (the real RD system is a
// rolling per-year collection, with no separate account numbers).
export interface RDItem {
  key: string;
  yearLabel: string;
  memberNo: string;
  memberName: string;
  monthlyRdAmount: number;
  totalInstallmentsPaid: number;
  totalMissed: number;
  currentBalance: number;
  status: string;
}

export interface RecurringDerived {
  totalBalance: number;
  totalMonthly: number;
  paid: number;
  missed: number;
  paidPct: number;
  years: number;
  statuses: { status: string; count: number }[];
}

export const deriveRecurring = (items: RDItem[]): RecurringDerived => {
  const paid = items.reduce((s, r) => s + (r.totalInstallmentsPaid || 0), 0);
  const missed = items.reduce((s, r) => s + (r.totalMissed || 0), 0);
  const statuses = new Map<string, number>();
  items.forEach(r => statuses.set(r.status || '—', (statuses.get(r.status || '—') ?? 0) + 1));
  return {
    totalBalance: items.reduce((s, r) => s + (r.currentBalance || 0), 0),
    totalMonthly: items.reduce((s, r) => s + (r.monthlyRdAmount || 0), 0),
    paid,
    missed,
    paidPct: paid + missed > 0 ? (paid / (paid + missed)) * 100 : 0,
    years: items.length,
    statuses: [...statuses.entries()].map(([status, count]) => ({ status, count })),
  };
};

export const statusTone = (s: string): 'success' | 'warning' | 'muted' =>
  /active|open|running/i.test(s) ? 'success' : /matur|closed|complete/i.test(s) ? 'muted' : 'warning';
