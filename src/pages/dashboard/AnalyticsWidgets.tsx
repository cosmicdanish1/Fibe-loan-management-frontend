import React, { useEffect, useState } from 'react';
import { Users, Landmark, TrendingUp, PiggyBank, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import apiService from '../../services/api';

// ─── Shared card shell — matches the Notice Board / Shortcuts widget look ──
const WidgetCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, children }) => (
  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden">
    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2 shrink-0">
      {icon}
      <span className="fz-mini font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{title}</span>
    </div>
    <div className="p-3 flex-1">{children}</div>
  </div>
);

const ErrorNote: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 fz-tiny font-bold py-4 justify-center">
    <AlertCircle size={12} /> {message}
  </div>
);

const money = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

// Fixed, non-cycled colors — one per widget, matching the app's existing accents.
const COLOR_INDIGO = '#4f46e5';
const COLOR_BLUE = '#2563eb';
const COLOR_AMBER = '#d97706';
const COLOR_EMERALD = '#059669';

// ─── 1. Active Members — single headline number, no chart needed ──────────
export const ActiveMembersWidget: React.FC = () => {
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiService.getDayBookActiveMembers().then((res) => {
      if (cancelled) return;
      if (res.success && Array.isArray(res.data)) setCount(res.data.length);
      else setError(true);
    }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  return (
    <WidgetCard title="Active Members" icon={<Users size={11} className="text-slate-400" />}>
      {error ? (
        <ErrorNote message="Could not load member count" />
      ) : count === null ? (
        <div className="h-16 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex items-center justify-center h-16">
          <div className="text-center">
            <p className="font-black text-3xl leading-none" style={{ color: COLOR_INDIGO }}>{count.toLocaleString('en-IN')}</p>
            <p className="fz-micro font-black text-slate-400 uppercase tracking-widest mt-1">Currently Active</p>
          </div>
        </div>
      )}
    </WidgetCard>
  );
};

// ─── 2. Sanctioned Loans — count by loan type, one call + client grouping ──
export const SanctionedLoansWidget: React.FC = () => {
  const [rows, setRows] = useState<{ type: string; count: number }[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiService.getSanctionedLoans().then((res) => {
      if (cancelled) return;
      const list = Array.isArray(res.data) ? res.data : (Array.isArray(res as any) ? (res as any) : []);
      if (!res.success && !Array.isArray(res as any)) { setError(true); return; }
      const byType = new Map<string, number>();
      for (const loan of list) {
        const t = loan.loanType || 'Other';
        byType.set(t, (byType.get(t) || 0) + 1);
      }
      setRows(Array.from(byType.entries()).map(([type, count]) => ({ type, count })));
    }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  return (
    <WidgetCard title="Sanctioned Loans (Pending Disbursal)" icon={<Landmark size={11} className="text-slate-400" />}>
      {error ? (
        <ErrorNote message="Could not load sanctioned loans" />
      ) : rows === null ? (
        <div className="h-32 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <ErrorNote message="No sanctioned loans awaiting disbursal" />
      ) : (
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={rows} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <XAxis dataKey="type" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} />
            <Tooltip
              formatter={(v: number | undefined) => [`${v ?? 0} case${v === 1 ? '' : 's'}`, 'Sanctioned'] as [string, string]}
              contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
            />
            <Bar dataKey="count" fill={COLOR_INDIGO} radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </WidgetCard>
  );
};

// ─── 3. Month-End Outstanding — current month total + regular/emergency split
export const MonthEndOutstandingWidget: React.FC = () => {
  const [totals, setTotals] = useState<{ regular: number; emergency: number; total: number } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const now = new Date();
    apiService.getMonthEndLoanReport(now.getMonth() + 1, now.getFullYear()).then((res) => {
      if (cancelled) return;
      const list = Array.isArray(res.data) ? res.data : [];
      if (!res.success) { setError(true); return; }
      const totals = list.reduce((acc, r: any) => ({
        regular: acc.regular + (parseFloat(r.regular_loan_balance) || 0),
        emergency: acc.emergency + (parseFloat(r.emergency_loan_balance) || 0),
        total: acc.total + (parseFloat(r.total_outstanding) || 0),
      }), { regular: 0, emergency: 0, total: 0 });
      setTotals(totals);
    }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  return (
    <WidgetCard title="Loan Outstanding (This Month)" icon={<TrendingUp size={11} className="text-slate-400" />}>
      {error ? (
        <ErrorNote message="Could not load month-end totals" />
      ) : totals === null ? (
        <div className="h-16 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : totals.total === 0 ? (
        <ErrorNote message="No month-end snapshot for this month yet" />
      ) : (
        <div className="space-y-2">
          <p className="font-black text-2xl leading-none" style={{ color: COLOR_BLUE }}>{money(totals.total)}</p>
          <div className="h-2 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-700">
            <div style={{ width: `${(totals.regular / totals.total) * 100}%`, background: COLOR_BLUE }} />
            <div style={{ width: `${(totals.emergency / totals.total) * 100}%`, background: COLOR_AMBER }} />
          </div>
          <div className="flex items-center justify-between fz-micro font-bold text-slate-400 uppercase tracking-wider">
            <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: COLOR_BLUE }} />Regular {money(totals.regular)}</span>
            <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: COLOR_AMBER }} />Emergency {money(totals.emergency)}</span>
          </div>
        </div>
      )}
    </WidgetCard>
  );
};

// ─── 4. Member Balance Distribution — bucketed net balance, one call ───────
const BALANCE_BUCKETS = [
  { label: '< 0', min: -Infinity, max: 0 },
  { label: '0-10K', min: 0, max: 10_000 },
  { label: '10K-50K', min: 10_000, max: 50_000 },
  { label: '50K-1L', min: 50_000, max: 100_000 },
  { label: '> 1L', min: 100_000, max: Infinity },
];

export const MemberBalanceDistributionWidget: React.FC = () => {
  const [rows, setRows] = useState<{ label: string; count: number }[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiService.getMemberBalanceRangeReport({ fromAccountNo: '0', toAccountNo: '999999999' }).then((res) => {
      if (cancelled) return;
      const list = Array.isArray(res.data) ? res.data : [];
      if (!res.success) { setError(true); return; }
      const buckets = BALANCE_BUCKETS.map(b => ({ label: b.label, count: 0 }));
      for (const m of list) {
        const bal = parseFloat(m.netBalance) || 0;
        const idx = BALANCE_BUCKETS.findIndex(b => bal >= b.min && bal < b.max);
        const bucket = idx >= 0 ? buckets[idx] : undefined;
        if (bucket) bucket.count += 1;
      }
      setRows(buckets);
    }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  return (
    <WidgetCard title="Member Balance Distribution" icon={<PiggyBank size={11} className="text-slate-400" />}>
      {error ? (
        <ErrorNote message="Could not load balance distribution" />
      ) : rows === null ? (
        <div className="h-32 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={rows} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} />
            <Tooltip
              formatter={(v: number | undefined) => [`${v ?? 0} member${v === 1 ? '' : 's'}`, 'Count'] as [string, string]}
              contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
            />
            <Bar dataKey="count" fill={COLOR_EMERALD} radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </WidgetCard>
  );
};
