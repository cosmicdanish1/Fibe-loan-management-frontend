import React, { useEffect, useState } from 'react';
import { CheckCircle2, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import dayjs from 'dayjs';
import apiService from '../../services/api';
import { WidgetCard, ErrorNote, Loading, money, TONE_ACCENT, TONE_INFO, TONE_WARNING, TONE_SUCCESS, bigNumber } from './AnalyticsWidgets';
import { Donut, HalfGauge, Sparkline, LegendRow, type Slice } from './DashCharts';

// ─── Shared data ─────────────────────────────────────────────────────────────

interface Amount { count: number; amount: number }

export interface DashboardSummary {
  deposits: { fixedRecurring: Amount; savings: Amount; shares: number; compulsory: number } | null;
  maturities: { accountNo: string; memberNo: string; name: string | null; date: string; amount: number; kind: string | null }[] | null;
  applications: { pending: Amount; sanctioned: Amount; disbursedThisMonth: Amount } | null;
  members: { newThisMonth: number; newLastMonth: number } | null;
  retiring: { count: number; upcoming: { memberNo: string; name: string | null; date: string; loanBalance: number }[] } | null;
  demand: { demand: number; recovered: number; members: number } | null;
}

export interface SummaryState { summary: DashboardSummary | null; loading: boolean; failed: boolean }

/** Loads the one summary call that feeds most of the new widgets. */
export const useDashboardSummary = (): SummaryState => {
  const [state, setState] = useState<SummaryState>({ summary: null, loading: true, failed: false });
  useEffect(() => {
    let cancelled = false;
    apiService.getDashboardSummary().then(res => {
      if (cancelled) return;
      if (res.success && res.data) setState({ summary: res.data as DashboardSummary, loading: false, failed: false });
      else setState({ summary: null, loading: false, failed: true });
    }).catch(() => { if (!cancelled) setState({ summary: null, loading: false, failed: true }); });
    return () => { cancelled = true; };
  }, []);
  return state;
};

/** Picks one section of the summary; renders the loading / error state when it is not ready. */
function Section<K extends keyof DashboardSummary>({ state, name, error, children }: {
  state: SummaryState;
  name: K;
  error: string;
  children: (data: NonNullable<DashboardSummary[K]>) => React.ReactNode;
}) {
  if (state.loading) return <Loading height={96} />;
  const data = state.summary?.[name] as DashboardSummary[K] | undefined;
  if (state.failed || data === null || data === undefined) return <ErrorNote message={error} />;
  return <>{children(data as NonNullable<DashboardSummary[K]>)}</>;
}

const daysFromToday = (value: string) => dayjs(value).startOf('day').diff(dayjs().startOf('day'), 'day');
const inDays = (n: number) => (n === 0 ? 'today' : n > 0 ? `in ${n} day${n === 1 ? '' : 's'}` : `${-n} day${n === -1 ? '' : 's'} ago`);
const short = (n: number) => (n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(2)} L` : money(n));

// ─── Pending vouchers to pass ────────────────────────────────────────────────

export const PendingVouchersWidget: React.FC<{ onOpen: (route: string) => void }> = ({ onOpen }) => {
  const [rows, setRows] = useState<any[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    apiService.getPendingVouchers().then(res => {
      if (cancelled) return;
      if (res.success && Array.isArray(res.data)) setRows(res.data); else setError(true);
    }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  const total = (rows ?? []).reduce((s, v) => s + (Number(v.amount) || 0), 0);
  return (
    <WidgetCard title="Vouchers To Pass" tone={TONE_WARNING}>
      {error ? <ErrorNote message="Could not load pending vouchers" /> : rows === null ? <Loading /> : rows.length === 0 ? (
        <div className="aw-empty" style={{ padding: 16 }}>
          <CheckCircle2 size={26} style={{ color: 'var(--aw-success)' }} />
          <p className="aw-strong">All caught up</p>
          <span className="aw-meta">No vouchers are waiting</span>
        </div>
      ) : (
        <div className="aw-stack" style={{ gap: 8 }}>
          <div className="aw-inline" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <p style={{ ...bigNumber, color: TONE_WARNING }}>{rows.length}</p>
              <p className="aw-meta" style={{ marginTop: 6, fontWeight: 700 }}>{money(total)} awaiting</p>
            </div>
            <button type="button" className="aw-btn aw-btn-primary aw-btn-sm" onClick={() => onOpen('/transaction/pass-transactions')}>Review &amp; pass</button>
          </div>
          <div className="aw-rows">
            {rows.slice(0, 3).map(v => (
              <div key={v.id ?? v.voucherNo} className="aw-row" style={{ alignItems: 'center' }}>
                <span style={{ minWidth: 0 }}>
                  <strong style={{ fontFamily: 'monospace' }}>{v.voucherNo}</strong>
                  <span className="aw-meta" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.memberName} · {v.vchrType}</span>
                </span>
                <strong>{money(Number(v.amount) || 0)}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </WidgetCard>
  );
};

// ─── Today's cash position (with a 7-day trend) ──────────────────────────────

export const CashPositionWidget: React.FC = () => {
  const [days, setDays] = useState<{ date: string; opening: number; closing: number; receipts: number; payments: number }[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const dates = Array.from({ length: 7 }, (_, i) => dayjs().subtract(6 - i, 'day').format('YYYY-MM-DD'));
    Promise.all(dates.map(d => apiService.getCashBookReport(d).catch(() => null))).then(results => {
      if (cancelled) return;
      const list = results.map((res, i) => {
        const d: any = res && res.success ? ((res.data as any)?.data ?? res.data) : null;
        return d && typeof d === 'object' && 'closingBalance' in d
          ? { date: dates[i]!, opening: Number(d.openingBalance) || 0, closing: Number(d.closingBalance) || 0, receipts: Number(d.totalReceipts) || 0, payments: Number(d.totalPayments) || 0 }
          : null;
      }).filter((x): x is NonNullable<typeof x> => x !== null);
      if (list.length === 0) setError(true); else setDays(list);
    });
    return () => { cancelled = true; };
  }, []);

  const today = days?.[days.length - 1];
  const first = days?.[0];
  const change = today && first ? today.closing - first.closing : 0;
  return (
    <WidgetCard title="Cash Position" tone={TONE_ACCENT}>
      {error ? <ErrorNote message="Could not load the cash book" /> : days === null || !today ? <Loading /> : (
        <div className="aw-stack" style={{ gap: 8 }}>
          <div className="aw-inline" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <p style={{ ...bigNumber, fontSize: 'calc(var(--type-body-size) + 10px)', color: TONE_ACCENT }}>{money(today.closing)}</p>
              <p className="aw-label" style={{ marginTop: 6 }}>Closing balance · {dayjs(today.date).format('D MMM')}</p>
            </div>
            <span className={`aw-pill ${change >= 0 ? 'tone-success' : 'tone-danger'}`}>
              {change >= 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />} {short(Math.abs(change))} in {days.length} days
            </span>
          </div>
          <Sparkline values={days.map(d => d.closing)} ariaLabel="Closing cash balance, last 7 days" />
          <div className="aw-inline" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span className="aw-meta">Receipts today <strong style={{ color: 'var(--aw-success)' }}>{money(today.receipts)}</strong></span>
            <span className="aw-meta">Payments today <strong style={{ color: 'var(--aw-danger)' }}>{money(today.payments)}</strong></span>
          </div>
        </div>
      )}
    </WidgetCard>
  );
};

// ─── Day-end status ──────────────────────────────────────────────────────────

export const DayEndStatusWidget: React.FC<{ onOpen: (route: string) => void }> = ({ onOpen }) => {
  const [info, setInfo] = useState<{ date: string; flag: string; opening: number; closing: number } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    apiService.request<any>('/admin/day-end/summary', { method: 'GET' }).then(res => {
      if (cancelled) return;
      const d: any = (res.data as any)?.data ?? res.data;
      if (res.success && d && d.date) setInfo({ date: d.date, flag: String(d.dayendFlag ?? ''), opening: Number(d.openingBalance) || 0, closing: Number(d.closingBalance) || 0 });
      else setError(true);
    }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  const behind = info ? -daysFromToday(info.date) : 0;
  const closed = info?.flag === 'Y';
  return (
    <WidgetCard title="Day-End Status" tone={closed ? TONE_SUCCESS : TONE_WARNING}>
      {error ? <ErrorNote message="Could not load the day-end status" /> : info === null ? <Loading /> : (
        <div className="aw-stack" style={{ gap: 10 }}>
          <div>
            <span className={`aw-pill ${closed ? 'tone-success' : 'tone-warning'}`}>{closed ? 'Closed' : 'Open — not closed'}</span>
            <p style={{ ...bigNumber, fontSize: 'calc(var(--type-body-size) + 10px)', marginTop: 10 }}>{dayjs(info.date).format('D MMM YYYY')}</p>
            <p className="aw-meta" style={{ marginTop: 6 }}>
              {behind > 1 ? <span style={{ color: 'var(--aw-danger)', fontWeight: 700 }}>{behind} days behind today</span> : behind === 1 ? 'Yesterday' : 'Today'}
              {' · '}closing {money(info.closing)}
            </p>
          </div>
          <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" onClick={() => onOpen('/day-end')}>Open Day End</button>
        </div>
      )}
    </WidgetCard>
  );
};

// ─── Demand vs recovery (gauge) ──────────────────────────────────────────────

export const DemandRecoveryWidget: React.FC<{ state: SummaryState }> = ({ state }) => (
  <WidgetCard title="Demand vs Recovery" tone={TONE_INFO}>
    <Section state={state} name="demand" error="Could not load this month's demand">
      {d => d.demand <= 0 ? <ErrorNote message="No demand generated for this month yet" /> : (() => {
        const pct = (d.recovered / d.demand) * 100;
        const short_ = Math.max(0, d.demand - d.recovered);
        return (
          <div className="aw-stack" style={{ gap: 8 }}>
            <HalfGauge percent={pct} color={pct >= 90 ? 'var(--aw-success)' : pct >= 60 ? 'var(--aw-warning)' : 'var(--aw-danger)'} ariaLabel={`${pct.toFixed(0)} percent of this month's demand posted`}>
              <strong style={{ fontSize: 'calc(var(--type-body-size) + 10px)' }}>{pct.toFixed(0)}%</strong>
              <span className="aw-meta" style={{ display: 'block' }}>posted to ledger</span>
            </HalfGauge>
            <div className="aw-rows">
              <LegendRow color="var(--aw-info, var(--aw-accent))" label="Demand" value={money(d.demand)} sub={`${d.members} member${d.members === 1 ? '' : 's'}`} />
              <LegendRow color="var(--aw-success)" label="Posted" value={money(d.recovered)} />
              <LegendRow color="var(--aw-danger)" label="Shortfall" value={money(short_)} />
            </div>
          </div>
        );
      })()}
    </Section>
  </WidgetCard>
);

// ─── Deposits summary (ring chart) ───────────────────────────────────────────

export const DepositsSummaryWidget: React.FC<{ state: SummaryState }> = ({ state }) => (
  <WidgetCard title="Deposits Summary" tone={TONE_SUCCESS}>
    <Section state={state} name="deposits" error="Could not load deposit totals">
      {d => {
        const slices: Slice[] = [
          { label: 'Fixed & recurring', value: d.fixedRecurring.amount, color: 'var(--aw-accent)' },
          { label: 'Savings', value: d.savings.amount, color: 'var(--aw-success)' },
          { label: 'Compulsory deposit', value: d.compulsory, color: 'var(--aw-warning)' },
        ];
        const total = slices.reduce((s, x) => s + x.value, 0);
        return (
          <div className="aw-stack" style={{ gap: 8 }}>
            <div className="aw-inline" style={{ alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <Donut slices={slices} ariaLabel="Deposits by type"
                center={<><strong style={{ fontSize: 'calc(var(--type-body-size) + 2px)' }}>{short(total)}</strong><span className="aw-meta">total deposits</span></>} />
              <div className="aw-rows" style={{ flex: 1, minWidth: 170 }}>
                <LegendRow color={slices[0]!.color} label="Fixed & recurring" value={short(d.fixedRecurring.amount)} sub={`${d.fixedRecurring.count} account${d.fixedRecurring.count === 1 ? '' : 's'}`} />
                <LegendRow color={slices[1]!.color} label="Savings" value={short(d.savings.amount)} sub={`${d.savings.count} account${d.savings.count === 1 ? '' : 's'}`} />
                <LegendRow color={slices[2]!.color} label="Compulsory deposit" value={short(d.compulsory)} />
              </div>
            </div>
            <p className="aw-meta">Share capital {short(d.shares)} (not included above)</p>
          </div>
        );
      }}
    </Section>
  </WidgetCard>
);

// ─── Upcoming maturities (timeline) ──────────────────────────────────────────

export const UpcomingMaturitiesWidget: React.FC<{ state: SummaryState }> = ({ state }) => (
  <WidgetCard title="Upcoming Maturities (This Month)" tone={TONE_WARNING}>
    <Section state={state} name="maturities" error="Could not load maturities">
      {list => {
        if (list.length === 0) return <ErrorNote message="No fixed or recurring deposits mature this month" />;
        const daysInMonth = dayjs().daysInMonth();
        const counts = new Array(daysInMonth).fill(0) as number[];
        list.forEach(m => { const day = dayjs(m.date).date(); if (day >= 1 && day <= daysInMonth) counts[day - 1]! += 1; });
        const max = Math.max(...counts, 1);
        const todayIdx = dayjs().date() - 1;
        const total = list.reduce((s, m) => s + m.amount, 0);
        const upcoming = list.filter(m => daysFromToday(m.date) >= 0).concat(list.filter(m => daysFromToday(m.date) < 0)).slice(0, 5);
        return (
          <div className="aw-stack" style={{ gap: 8 }}>
            <div className="aw-inline" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <p style={{ ...bigNumber, color: TONE_WARNING }}>{list.length}</p>
                <p className="aw-meta" style={{ marginTop: 6, fontWeight: 700 }}>{short(total)} maturing</p>
              </div>
              <span className="aw-pill">{dayjs().format('MMMM')}</span>
            </div>
            <div style={{ display: 'flex', gap: 2 }} role="img" aria-label="Maturities by day of the month">
              {counts.map((c, i) => (
                <span key={i} title={`${i + 1} ${dayjs().format('MMM')}: ${c}`}
                  style={{
                    flex: 1, height: 18, borderRadius: 3,
                    background: c ? `color-mix(in srgb, var(--aw-warning) ${Math.round(30 + (c / max) * 70)}%, transparent)` : 'var(--aw-border)',
                    outline: i === todayIdx ? '2px solid var(--aw-accent)' : undefined, outlineOffset: 1,
                  }} />
              ))}
            </div>
            <div className="aw-rows">
              {upcoming.map(m => {
                const n = daysFromToday(m.date);
                return (
                  <div key={m.accountNo} className="aw-row" style={{ alignItems: 'center', gap: 10 }}>
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{m.name || `Member ${m.memberNo}`}</strong>
                      <span className="aw-meta">{dayjs(m.date).format('D MMM')} · <span style={{ color: n < 0 ? 'var(--aw-danger)' : undefined }}>{inDays(n)}</span></span>
                    </span>
                    <strong>{short(m.amount)}</strong>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }}
    </Section>
  </WidgetCard>
);

// ─── Loan applications (steps) ───────────────────────────────────────────────

export const LoanApplicationsWidget: React.FC<{ state: SummaryState; onOpen: (route: string) => void }> = ({ state, onOpen }) => (
  <WidgetCard title="Loan Applications" tone={TONE_INFO}>
    <Section state={state} name="applications" error="Could not load loan applications">
      {a => {
        const steps = [
          { label: 'Pending sanction', data: a.pending, tone: 'var(--aw-warning)' },
          { label: 'Sanctioned, awaiting payout', data: a.sanctioned, tone: 'var(--aw-info, var(--aw-accent))' },
          { label: 'Disbursed this month', data: a.disbursedThisMonth, tone: 'var(--aw-success)' },
        ];
        return (
          <div className="aw-stack" style={{ gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 4 }}>
              {steps.map((s, i) => (
                <React.Fragment key={s.label}>
                  <div className="aw-stat" style={{ flex: 1, minWidth: 0, ['--aw-tone' as any]: s.tone }}>
                    <div className="aw-stat-value">{s.data.count.toLocaleString('en-IN')}</div>
                    <div className="aw-stat-label" style={{ marginTop: 4 }}>{s.label}</div>
                    <div className="aw-meta" style={{ marginTop: 4 }}>{short(s.data.amount)}</div>
                  </div>
                  {i < steps.length - 1 && <ChevronRight size={16} style={{ alignSelf: 'center', flex: 'none', color: 'var(--aw-muted)' }} />}
                </React.Fragment>
              ))}
            </div>
            <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" onClick={() => onOpen('/loan-application')} style={{ alignSelf: 'flex-start' }}>Open Loan Application</button>
          </div>
        );
      }}
    </Section>
  </WidgetCard>
);

// ─── Overdue loans (ring chart) ──────────────────────────────────────────────

const OVERDUE_BUCKETS = [
  { label: 'Under 6 months', max: 6, color: 'var(--aw-success)' },
  { label: '6 – 12 months', max: 12, color: 'var(--aw-warning)' },
  { label: '1 – 3 years', max: 36, color: 'var(--aw-danger)' },
  { label: 'Over 3 years', max: Infinity, color: 'var(--aw-muted)' },
];

export const OverdueLoansWidget: React.FC = () => {
  const [data, setData] = useState<{ counts: number[]; balance: number; total: number } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    apiService.getDefaulterList(0, 20000, 0).then(res => {
      if (cancelled) return;
      const list: any[] = Array.isArray(res.data) ? res.data : Array.isArray((res.data as any)?.data) ? (res.data as any).data : [];
      if (!res.success) { setError(true); return; }
      const counts = OVERDUE_BUCKETS.map(() => 0);
      let balance = 0;
      for (const l of list) {
        balance += Number(l.balance) || 0;
        const months = l.lastPaymentDate ? Math.max(0, dayjs().diff(dayjs(l.lastPaymentDate), 'month')) : Infinity;
        const idx = OVERDUE_BUCKETS.findIndex(b => months < b.max);
        counts[idx >= 0 ? idx : OVERDUE_BUCKETS.length - 1]! += 1;
      }
      const totalCount = Number((res.data as any)?.metadata?.totalCount);
      setData({ counts, balance, total: Number.isFinite(totalCount) && totalCount > 0 ? totalCount : list.length });
    }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  return (
    <WidgetCard title="Overdue Loans" tone={'var(--aw-danger)'}>
      {error ? <ErrorNote message="Could not load overdue loans" /> : data === null ? <Loading /> : data.total === 0 ? (
        <ErrorNote message="No overdue loans" />
      ) : (
        <div className="aw-stack" style={{ gap: 8 }}>
          <div className="aw-inline" style={{ alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <Donut ariaLabel="Overdue loans by time since last payment"
              slices={OVERDUE_BUCKETS.map((b, i): Slice => ({ label: b.label, value: data.counts[i] ?? 0, color: b.color }))}
              center={<><strong style={{ fontSize: 'calc(var(--type-body-size) + 6px)' }}>{data.total.toLocaleString('en-IN')}</strong><span className="aw-meta">loans</span></>} />
            <div className="aw-rows" style={{ flex: 1, minWidth: 150 }}>
              {OVERDUE_BUCKETS.map((b, i) => <LegendRow key={b.label} color={b.color} label={b.label} sub="since last payment" value={(data.counts[i] ?? 0).toLocaleString('en-IN')} />)}
            </div>
          </div>
          <p className="aw-meta">Outstanding on these loans <strong>{short(data.balance)}</strong></p>
        </div>
      )}
    </WidgetCard>
  );
};

// ─── Members retiring soon ───────────────────────────────────────────────────

export const RetiringMembersWidget: React.FC<{ state: SummaryState }> = ({ state }) => (
  <WidgetCard title="Retiring Within 6 Months" tone={'var(--aw-danger)'}>
    <Section state={state} name="retiring" error="Could not load retiring members">
      {r => r.count === 0 ? <ErrorNote message="No members retiring in the next 6 months" /> : (
        <div className="aw-stack" style={{ gap: 8 }}>
          <div className="aw-inline" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <p style={{ ...bigNumber, color: 'var(--aw-danger)' }}>{r.count.toLocaleString('en-IN')}</p>
              <p className="aw-meta" style={{ marginTop: 6, fontWeight: 700 }}>members, soonest first</p>
            </div>
          </div>
          <div className="aw-rows">
            {r.upcoming.slice(0, 5).map(m => {
              const n = daysFromToday(m.date);
              return (
                <div key={m.memberNo} className="aw-row" style={{ alignItems: 'center', gap: 10 }}>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{m.name || `Member ${m.memberNo}`}</strong>
                    <span className="aw-meta">{m.memberNo} · {dayjs(m.date).format('D MMM YYYY')} · {inDays(n)}</span>
                  </span>
                  <span style={{ textAlign: 'right' }}>
                    <strong style={{ color: m.loanBalance > 0 ? 'var(--aw-danger)' : undefined }}>{m.loanBalance > 0 ? short(m.loanBalance) : '—'}</strong>
                    <span className="aw-meta" style={{ display: 'block' }}>loan</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Section>
  </WidgetCard>
);

// ─── New members ─────────────────────────────────────────────────────────────

export const NewMembersWidget: React.FC<{ state: SummaryState }> = ({ state }) => (
  <WidgetCard title="New Members" tone={TONE_SUCCESS}>
    <Section state={state} name="members" error="Could not load new members">
      {m => {
        const diff = m.newThisMonth - m.newLastMonth;
        const pct = m.newLastMonth > 0 ? Math.round((diff / m.newLastMonth) * 100) : null;
        return (
          <div className="aw-stack" style={{ gap: 8 }}>
            <div className="aw-inline" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <p style={{ ...bigNumber, color: TONE_SUCCESS }}>{m.newThisMonth.toLocaleString('en-IN')}</p>
                <p className="aw-label" style={{ marginTop: 6 }}>Joined in {dayjs().format('MMMM')}</p>
              </div>
              <span className={`aw-pill ${diff >= 0 ? 'tone-success' : 'tone-danger'}`}>
                {diff >= 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />} {pct === null ? `${Math.abs(diff)}` : `${Math.abs(pct)}%`}
              </span>
            </div>
            <div className="aw-row" style={{ borderBottom: 0, borderTop: '1px solid var(--aw-border)' }}>
              <span className="aw-meta">Last month ({dayjs().subtract(1, 'month').format('MMM')})</span>
              <strong>{m.newLastMonth.toLocaleString('en-IN')}</strong>
            </div>
          </div>
        );
      }}
    </Section>
  </WidgetCard>
);
