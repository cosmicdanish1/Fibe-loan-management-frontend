import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Donut, LegendRow, type Slice } from './DashCharts';
import apiService from '../../services/api';

// ─── Shared card shell — the kit card, with a small tone marker in the head ──
export const WidgetCard: React.FC<{
  title: string;
  tone: string;
  children: React.ReactNode;
}> = ({ title, tone, children }) => (
  <section className="aw-card">
    <div className="aw-card-head">
      <span style={{ width: 8, height: 8, borderRadius: 2, background: tone, flex: 'none' }} />
      <h2 className="aw-card-title">{title}</h2>
    </div>
    {children}
  </section>
);

export const ErrorNote: React.FC<{ message: string }> = ({ message }) => (
  <div className="aw-empty" style={{ padding: 16 }}>
    <span className="aw-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><AlertCircle size={12} /> {message}</span>
  </div>
);

export const Loading: React.FC<{ height?: number }> = ({ height = 64 }) => (
  <div className="aw-empty" style={{ height, padding: 0 }}><span className="aw-spin" /></div>
);

export const money = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export const dateLabel = (value: unknown) => {
  if (!value) return '—';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// API responses can be either a direct array or a report envelope containing
// `{ metadata, data }`. Keep the widgets tolerant of both formats.
const arrayPayload = (value: unknown): any[] => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object' && Array.isArray((value as any).data)) {
    return (value as any).data;
  }
  return [];
};

// One tone per widget, taken from the shared theme so Settings changes apply.
export const TONE_ACCENT = 'var(--aw-accent)';
export const TONE_INFO = 'var(--aw-info, var(--aw-accent))';
export const TONE_WARNING = 'var(--aw-warning)';
export const TONE_SUCCESS = 'var(--aw-success)';

export const bigNumber: React.CSSProperties = { fontSize: 'calc(var(--type-body-size) + 14px)', fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' };

// ─── 1. Active Members — live register count ───────────────────────────────
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
    <WidgetCard title="Active Members" tone={TONE_ACCENT}>
      {error ? (
        <ErrorNote message="Could not load member count" />
      ) : count === null ? (
        <Loading />
      ) : (
        <div className="aw-stack">
          <div className="aw-inline" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <p style={{ ...bigNumber, color: TONE_ACCENT }}>{count.toLocaleString('en-IN')}</p>
              <p className="aw-label" style={{ marginTop: 6 }}>Currently Active</p>
            </div>
            <span className="aw-pill tone-success">Live register</span>
          </div>
          <div className="aw-row" style={{ borderBottom: 0, borderTop: '1px solid var(--aw-border)' }}>
            <span className="aw-meta">Active member records</span>
            <strong>{count.toLocaleString('en-IN')}</strong>
          </div>
        </div>
      )}
    </WidgetCard>
  );
};

// ─── 2. Sanctioned Loans — headline count + total value, one call ─────────
export const SanctionedLoansWidget: React.FC = () => {
  const [summary, setSummary] = useState<{
    count: number;
    totalValue: number;
    regular: number;
    emergency: number;
    oldestDate: string | null;
  } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiService.getSanctionedLoans().then((res) => {
      if (cancelled) return;
      const list = arrayPayload(res.data);
      if (!res.success) { setError(true); return; }
      const totalValue = list.reduce((sum: number, loan: any) =>
        sum + (parseFloat(loan.sanctionedAmount) || parseFloat(loan.appliedAmount) || 0), 0);
      const regular = list.filter((loan: any) => !/emergency|eln|aln|(^|\W)e(ln)?($|\W)/i.test(String(loan.loanType || ''))).length;
      const emergency = list.length - regular;
      const oldestDate = list
        .map((loan: any) => loan.applicationDate)
        .filter(Boolean)
        .sort((a: string, b: string) => new Date(a).getTime() - new Date(b).getTime())[0] || null;
      setSummary({ count: list.length, totalValue, regular, emergency, oldestDate });
    }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  return (
    <WidgetCard title="Sanctioned Loans (Pending Disbursal)" tone={TONE_WARNING}>
      {error ? (
        <ErrorNote message="Could not load sanctioned loans" />
      ) : summary === null ? (
        <Loading />
      ) : summary.count === 0 ? (
        <ErrorNote message="No sanctioned loans awaiting disbursal" />
      ) : (
        <div className="aw-stack">
          <div className="aw-inline" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <p style={bigNumber}>
                {summary.count} <span className="aw-meta" style={{ fontSize: 'var(--type-body-size)', fontWeight: 700 }}>loan{summary.count === 1 ? '' : 's'}</span>
              </p>
              <p className="aw-meta" style={{ marginTop: 6, fontWeight: 700 }}>{money(summary.totalValue)} total value</p>
            </div>
            <span className="aw-pill tone-warning">Awaiting payout</span>
          </div>
          <div className="aw-row" style={{ borderBottom: 0, borderTop: '1px solid var(--aw-border)' }}>
            <span className="aw-meta">Regular {summary.regular} · Emergency {summary.emergency}</span>
            <span className="aw-meta">Oldest {dateLabel(summary.oldestDate)}</span>
          </div>
        </div>
      )}
    </WidgetCard>
  );
};

// ─── 3. Month-End Outstanding — current month total + regular/emergency split
export const MonthEndOutstandingWidget: React.FC = () => {
  const [totals, setTotals] = useState<{
    regular: number;
    emergency: number;
    total: number;
    regularCount: number;
    emergencyCount: number;
    snapshotDate: string | null;
  } | null>(null);
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
        regularCount: acc.regularCount + (parseFloat(r.regular_loan_balance) > 0 ? 1 : 0),
        emergencyCount: acc.emergencyCount + (parseFloat(r.emergency_loan_balance) > 0 ? 1 : 0),
        snapshotDate: acc.snapshotDate || r.snapshot_date || null,
      }), { regular: 0, emergency: 0, total: 0, regularCount: 0, emergencyCount: 0, snapshotDate: null as string | null });
      setTotals(totals);
    }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  return (
    <WidgetCard title="Loan Outstanding (This Month)" tone={TONE_INFO}>
      {error ? (
        <ErrorNote message="Could not load month-end totals" />
      ) : totals === null ? (
        <Loading />
      ) : totals.total === 0 ? (
        <ErrorNote message="No month-end snapshot for this month yet" />
      ) : (
        <div className="aw-stack" style={{ gap: 8 }}>
          <p style={{ ...bigNumber, fontSize: 'calc(var(--type-body-size) + 10px)', color: TONE_INFO }}>{money(totals.total)}</p>
          <div className="aw-bar" role="img" aria-label="Regular versus emergency loan outstanding">
            <span style={{ width: `${(totals.regular / totals.total) * 100}%`, background: TONE_INFO }} />
            <span style={{ width: `${(totals.emergency / totals.total) * 100}%`, background: TONE_WARNING }} />
          </div>
          <div className="aw-inline" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span className="aw-meta"><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', marginRight: 5, background: TONE_INFO }} />Regular {money(totals.regular)} · {totals.regularCount}</span>
            <span className="aw-meta"><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', marginRight: 5, background: TONE_WARNING }} />Emergency {money(totals.emergency)} · {totals.emergencyCount}</span>
          </div>
          <p className="aw-meta">Snapshot {dateLabel(totals.snapshotDate)}</p>
        </div>
      )}
    </WidgetCard>
  );
};

// ─── 4. Member Balance Distribution — bucketed net balance, one call ───────
const BALANCE_COLORS = ['var(--aw-danger)', 'var(--aw-muted)', 'var(--aw-warning)', 'var(--aw-info, var(--aw-accent))', 'var(--aw-success)'];

const BALANCE_BUCKETS = [
  { label: '< 0', min: -Infinity, max: 0 },
  { label: '0-10K', min: 0, max: 10_000 },
  { label: '10K-50K', min: 10_000, max: 50_000 },
  { label: '50K-1L', min: 50_000, max: 100_000 },
  { label: '> 1L', min: 100_000, max: Infinity },
];

export const MemberBalanceDistributionWidget: React.FC = () => {
  const [rows, setRows] = useState<{ label: string; count: number; balance: number; share: number }[] | null>(null);
  const [totalMembers, setTotalMembers] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiService.getMemberBalanceRangeReport({ fromAccountNo: '0', toAccountNo: '999999999' }).then((res) => {
      if (cancelled) return;
      const list = arrayPayload(res.data);
      if (!res.success) { setError(true); return; }
      const buckets = BALANCE_BUCKETS.map(b => ({ label: b.label, count: 0, balance: 0, share: 0 }));
      for (const m of list) {
        // The account-range report calls this field `totalBalance`.
        const bal = parseFloat(m.totalBalance ?? m.netBalance) || 0;
        const idx = BALANCE_BUCKETS.findIndex(b => bal >= b.min && bal < b.max);
        const bucket = idx >= 0 ? buckets[idx] : undefined;
        if (bucket) {
          bucket.count += 1;
          bucket.balance += bal;
        }
      }
      const total = list.reduce((sum: number, m: any) => sum + (parseFloat(m.totalBalance ?? m.netBalance) || 0), 0);
      setTotalMembers(list.length);
      setTotalBalance(total);
      for (const bucket of buckets) bucket.share = list.length ? (bucket.count / list.length) * 100 : 0;
      setRows(buckets);
    }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  return (
    <WidgetCard title="Member Balance Distribution" tone={TONE_SUCCESS}>
      {error ? (
        <ErrorNote message="Could not load balance distribution" />
      ) : rows === null ? (
        <Loading height={128} />
      ) : (
        <div className="aw-stack" style={{ gap: 8 }}>
          <div className="aw-inline" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <p style={{ ...bigNumber, fontSize: 'calc(var(--type-body-size) + 10px)', color: TONE_SUCCESS }}>{totalMembers.toLocaleString('en-IN')}</p>
              <p className="aw-label" style={{ marginTop: 6 }}>Members · {money(totalBalance)} total</p>
            </div>
            <span className="aw-pill tone-success">By balance</span>
          </div>
          <div className="aw-inline" style={{ alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <Donut
              ariaLabel="Members by balance range"
              slices={rows.map((r, i): Slice => ({ label: r.label, value: r.count, color: BALANCE_COLORS[i % BALANCE_COLORS.length] as string }))}
              center={<><strong style={{ fontSize: 'calc(var(--type-body-size) + 6px)' }}>{totalMembers.toLocaleString('en-IN')}</strong><span className="aw-meta">members</span></>}
            />
            <div className="aw-rows" style={{ flex: 1, minWidth: 150 }}>
              {rows.map((r, i) => (
                <LegendRow key={r.label} color={BALANCE_COLORS[i % BALANCE_COLORS.length] as string} label={r.label}
                  value={`${r.count.toLocaleString('en-IN')} · ${r.share.toFixed(1)}%`} />
              ))}
            </div>
          </div>
        </div>
      )}
    </WidgetCard>
  );
};
