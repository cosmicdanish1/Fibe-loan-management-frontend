import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Donut, LegendRow, CountUp, type Slice } from './DashCharts';
import apiService from '../../services/api';
import { useTranslation } from 'react-i18next';

// ─── One anatomy for every dashboard widget ──────────────────────────────────
// Every widget is built from the same four parts, in the same order, so the dashboard reads as
// one system even though each card shows different data:
//
//   1. Head      <WidgetCard title tone>   colour dot + title
//   2. Headline  <Headline>                THE number, top-left, one size; caption under it; a
//                                          status pill on the right
//   3. Body      ring + legend (className="dash-viz"), gauge, trend line, steps, or rows
//   4. Foot      <CardFoot>                one line of context, or the card's action button on the
//                                          right; pinned to the bottom so feet line up across a row
//
// Rules: the headline number is never repeated inside a chart (a ring's middle names its largest
// share instead); actions live only in the foot; the widget's tone colours the dot, the headline
// number and nothing else. A new widget should use these parts and not lay itself out by hand.

export const WidgetCard: React.FC<{
  title: string;
  tone: string;
  children: React.ReactNode;
}> = ({ title, tone, children }) => (
  <section className="aw-card dash-card" style={{ ['--dash-tone' as any]: tone }}>
    <div className="aw-card-head">
      <span className="dash-tone-dot" />
      <h2 className="aw-card-title">{title}</h2>
    </div>
    <div className="dash-body">{children}</div>
  </section>
);

/** Part 2: the one number that matters, its caption, and an optional status pill on the right. */
export const Headline: React.FC<{ value: React.ReactNode; caption: React.ReactNode; pill?: React.ReactNode; neutral?: boolean }> = ({
  value, caption, pill, neutral,
}) => (
  <div className="dash-headline">
    <div style={{ minWidth: 0 }}>
      <p className="dash-big" style={neutral ? { color: 'var(--aw-text)' } : undefined}>{value}</p>
      <p className="dash-caption">{caption}</p>
    </div>
    {pill}
  </div>
);

/** Part 4: context on the left, action (if any) on the right, always on the card's bottom edge. */
export const CardFoot: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="dash-foot">{children}</div>
);

export const ErrorNote: React.FC<{ message: string }> = ({ message }) => (
  <div className="aw-empty" style={{ padding: 16 }}>
    <span className="aw-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><AlertCircle size={12} /> {message}</span>
  </div>
);

export const Loading: React.FC<{ height?: number }> = ({ height = 64 }) => (
  <div className="dash-skel" role="status" aria-label="Loading" style={{ minHeight: Math.max(height, 96) }}>
    <span /><span /><span />
  </div>
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

// ─── 1. Active Members — live register count ───────────────────────────────
export const ActiveMembersWidget: React.FC = () => {
  const { t } = useTranslation();
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
    <WidgetCard title={t('Active Members')} tone={TONE_ACCENT}>
      {error ? (
        <ErrorNote message={t('Could not load member count')} />
      ) : count === null ? (
        <Loading />
      ) : (
        <>
          <Headline value={<CountUp value={count} />} caption={t('Currently Active')}
            pill={<span className="aw-pill tone-success">{t('Live register')}</span>} />
          <CardFoot>
            <span>{t('Active member records')}</span>
            <strong>{count.toLocaleString('en-IN')}</strong>
          </CardFoot>
        </>
      )}
    </WidgetCard>
  );
};

// ─── 2. Sanctioned Loans — headline count + total value, one call ─────────
export const SanctionedLoansWidget: React.FC = () => {
  const { t } = useTranslation();
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
    <WidgetCard title={t('Sanctioned Loans (Pending Disbursal)')} tone={TONE_WARNING}>
      {error ? (
        <ErrorNote message={t('Could not load sanctioned loans')} />
      ) : summary === null ? (
        <Loading />
      ) : summary.count === 0 ? (
        <ErrorNote message={t('No sanctioned loans awaiting disbursal')} />
      ) : (
        <>
          <Headline
            value={<><CountUp value={summary.count} /><small>loan{summary.count === 1 ? '' : 's'}</small></>}
            caption={<>{money(summary.totalValue)} {t('total value')}</>}
            pill={<span className="aw-pill tone-warning">{t('Awaiting payout')}</span>} />
          <CardFoot>
            <span>{t('Regular')} <strong>{summary.regular}</strong> · {t('Emergency')} <strong>{summary.emergency}</strong></span>
            <span>{t('Oldest')} {dateLabel(summary.oldestDate)}</span>
          </CardFoot>
        </>
      )}
    </WidgetCard>
  );
};

// ─── 3. Month-End Outstanding — current month total + regular/emergency split
export const MonthEndOutstandingWidget: React.FC = () => {
  const { t } = useTranslation();
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
    <WidgetCard title={t('Loan Outstanding (This Month)')} tone={TONE_INFO}>
      {error ? (
        <ErrorNote message={t('Could not load month-end totals')} />
      ) : totals === null ? (
        <Loading />
      ) : totals.total === 0 ? (
        <ErrorNote message={t('No month-end snapshot for this month yet')} />
      ) : (
        <>
          <Headline value={<CountUp value={totals.total} format={money} />} caption={t('Total outstanding')} />
          <div>
            <div className="aw-bar" role="img" aria-label={t('Regular versus emergency loan outstanding')}>
              <span style={{ width: `${(totals.regular / totals.total) * 100}%`, background: TONE_INFO }} />
              <span style={{ width: `${(totals.emergency / totals.total) * 100}%`, background: TONE_WARNING }} />
            </div>
            <div className="aw-rows" style={{ marginTop: 6 }}>
              <LegendRow color={TONE_INFO} label={t('Regular')} sub={`${totals.regularCount} loan${totals.regularCount === 1 ? '' : 's'}`} value={money(totals.regular)} />
              <LegendRow color={TONE_WARNING} label={t('Emergency')} sub={`${totals.emergencyCount} loan${totals.emergencyCount === 1 ? '' : 's'}`} value={money(totals.emergency)} />
            </div>
          </div>
          <CardFoot>
            <span>{t('Snapshot')}</span>
            <span>{dateLabel(totals.snapshotDate)}</span>
          </CardFoot>
        </>
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
  const { t } = useTranslation();
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
    <WidgetCard title={t('Member Balance Distribution')} tone={TONE_SUCCESS}>
      {error ? (
        <ErrorNote message={t('Could not load balance distribution')} />
      ) : rows === null ? (
        <Loading height={128} />
      ) : (
        <>
          <Headline value={<CountUp value={totalMembers} />} caption={t('Members')}
            pill={<span className="aw-pill tone-success">{t('By balance')}</span>} />
          <div className="dash-viz">
            <Donut
              ariaLabel="Members by balance range"
              slices={rows.map((r, i): Slice => ({ label: r.label, value: r.count, color: BALANCE_COLORS[i % BALANCE_COLORS.length] as string }))}
            />
            <div className="aw-rows">
              {rows.map((r, i) => (
                <LegendRow key={r.label} color={BALANCE_COLORS[i % BALANCE_COLORS.length] as string} label={r.label}
                  value={`${r.count.toLocaleString('en-IN')} · ${r.share.toFixed(1)}%`} />
              ))}
            </div>
          </div>
          <CardFoot>
            <span>{t('Total balance')}</span>
            <strong>{money(totalBalance)}</strong>
          </CardFoot>
        </>
      )}
    </WidgetCard>
  );
};
