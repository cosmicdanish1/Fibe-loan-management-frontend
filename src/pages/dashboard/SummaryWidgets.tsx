import React, { useEffect, useState } from 'react';
import { CheckCircle2, ArrowUp, ArrowDown } from 'lucide-react';
import dayjs from 'dayjs';
import apiService from '../../services/api';
import { WidgetCard, Headline, CardFoot, ErrorNote, Loading, money, TONE_ACCENT, TONE_INFO, TONE_WARNING, TONE_SUCCESS } from './AnalyticsWidgets';
import { Donut, HalfGauge, Sparkline, LegendRow, CountUp, type Slice } from './DashCharts';
import { useTranslation } from 'react-i18next';
import { tLabel } from '../../i18n';

// ─── Shared data ─────────────────────────────────────────────────────────────

interface Amount { count: number; amount: number }

export interface DashboardSummary {
  deposits: { fixedRecurring: Amount; savings: Amount; shares: number; compulsory: number } | null;
  maturities: { accountNo: string; memberNo: string; name: string | null; date: string; amount: number; kind: string | null }[] | null;
  applications: { pending: Amount; sanctioned: Amount; disbursedThisMonth: Amount } | null;
  members: { newThisMonth: number; newLastMonth: number } | null;
  retiring: { count: number; upcoming: { memberNo: string; name: string | null; date: string; loanBalance: number }[] } | null;
  demand: { demand: number; recovered: number; members: number } | null;
  rdDues?: { members: number; expected: number; paid: number; paidMembers: number; partialMembers: number; unpaidMembers: number } | null;
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
export function Section<K extends keyof DashboardSummary>({ state, name, error, children }: {
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
export const short = (n: number) => (n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(2)} L` : money(n));

// ─── Pending vouchers to pass ────────────────────────────────────────────────

export const PendingVouchersWidget: React.FC<{ onOpen: (route: string) => void }> = ({ onOpen }) => {
  const { t } = useTranslation();
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
    <WidgetCard title={t('Vouchers To Pass')} tone={TONE_WARNING}>
      {error ? <ErrorNote message={t('Could not load pending vouchers')} /> : rows === null ? <Loading /> : rows.length === 0 ? (
        <div className="aw-empty" style={{ padding: 16 }}>
          <CheckCircle2 size={26} style={{ color: 'var(--aw-success)' }} />
          <p className="aw-strong">{t('All caught up')}</p>
          <span className="aw-meta">{t('No vouchers are waiting')}</span>
        </div>
      ) : (
        <>
          <Headline value={<CountUp value={rows.length} />} caption={t('{{1}} awaiting', { 1: money(total) })} />
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
          <CardFoot>
            <span>{rows.length > 3 ? t('Showing 3 of {{1}}', { 1: rows.length }) : t('Waiting to be passed')}</span>
            <button type="button" className="aw-btn aw-btn-primary aw-btn-sm" onClick={() => onOpen('/transaction/pass-transactions')}>{t('Review & pass')}</button>
          </CardFoot>
        </>
      )}
    </WidgetCard>
  );
};

// ─── Today's cash position (with a 7-day trend) ──────────────────────────────

export const CashPositionWidget: React.FC = () => {
  const { t } = useTranslation();
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
  // `today` is just the latest day that loaded; only call it today when it really is (a failed fetch for today must not relabel an earlier day)
  const isToday = !!today && today.date === dayjs().format('YYYY-MM-DD');
  const dayLabel = isToday ? 'today' : today ? dayjs(today.date).format('D MMM') : '';
  const change = today && first ? today.closing - first.closing : 0;
  return (
    <WidgetCard title={t('Cash Position')} tone={TONE_ACCENT}>
      {error ? <ErrorNote message={t('Could not load the cash book')} /> : days === null || !today ? <Loading /> : (
        <>
          <Headline value={<CountUp value={today.closing} format={money} />}
            caption={<>{t('Closing balance ·')} {dayjs(today.date).format('D MMM')}</>}
            pill={(
              <span className={`aw-pill ${change >= 0 ? 'tone-success' : 'tone-danger'}`}>
                {change >= 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />} {short(Math.abs(change))} in {days.length} days
              </span>
            )} />
          <Sparkline values={days.map(d => d.closing)} ariaLabel="Closing cash balance, last 7 days" />
          <CardFoot>
            <span>{t('Receipts')} {dayLabel} <strong style={{ color: 'var(--aw-success)' }}>{money(today.receipts)}</strong></span>
            <span>{t('Payments')} {dayLabel} <strong style={{ color: 'var(--aw-danger)' }}>{money(today.payments)}</strong></span>
          </CardFoot>
        </>
      )}
    </WidgetCard>
  );
};

// ─── Day-end status ──────────────────────────────────────────────────────────

export const DayEndStatusWidget: React.FC<{ onOpen: (route: string) => void }> = ({ onOpen }) => {
  const { t } = useTranslation();
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
    <WidgetCard title={t('Day-End Status')} tone={closed ? TONE_SUCCESS : TONE_WARNING}>
      {error ? <ErrorNote message={t('Could not load the day-end status')} /> : info === null ? <Loading /> : (
        <>
          <Headline neutral value={dayjs(info.date).format('D MMM YYYY')}
            caption={behind > 1 ? <span style={{ color: 'var(--aw-danger)' }}>{behind} {t('days behind today')}</span> : behind === 1 ? t('Yesterday') : t('Today')}
            pill={<span className={`aw-pill ${closed ? 'tone-success' : 'tone-warning'}`}>{closed ? t('Closed') : t('Open — not closed')}</span>} />
          <div className="aw-rows">
            <div className="aw-row"><span className="aw-row-label">{t('Opening balance')}</span><span className="aw-row-value">{money(info.opening)}</span></div>
            <div className="aw-row"><span className="aw-row-label">{t('Closing balance')}</span><span className="aw-row-value">{money(info.closing)}</span></div>
          </div>
          <CardFoot>
            <span>{closed ? t('This day is closed') : t('This day is still open')}</span>
            <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" onClick={() => onOpen('/day-end')}>{t('Open Day End')}</button>
          </CardFoot>
        </>
      )}
    </WidgetCard>
  );
};

// ─── Demand vs recovery (gauge) ──────────────────────────────────────────────

export const DemandRecoveryWidget: React.FC<{ state: SummaryState }> = ({ state }) => {
  const { t } = useTranslation();
  return (
  <WidgetCard title={t('Demand vs Recovery')} tone={TONE_INFO}>
    <Section state={state} name="demand" error="Could not load this month's demand">
      {d => d.demand <= 0 ? <ErrorNote message={t('No demand generated for this month yet')} /> : (() => {
        const pct = (d.recovered / d.demand) * 100;
        const short_ = Math.max(0, d.demand - d.recovered);
        return (
          <>
            <Headline value={<CountUp value={pct} format={n => `${n.toFixed(0)}%`} />} caption={t('posted to ledger')}
              pill={<span className={`aw-pill ${pct >= 90 ? 'tone-success' : pct >= 60 ? 'tone-warning' : 'tone-danger'}`}>{pct >= 90 ? t('On track') : pct >= 60 ? t('Behind') : t('Low')}</span>} />
            <div className="dash-viz">
              <HalfGauge width={124} percent={pct} color={pct >= 90 ? 'var(--aw-success)' : pct >= 60 ? 'var(--aw-warning)' : 'var(--aw-danger)'} ariaLabel={`${pct.toFixed(0)} percent of this month's demand posted`} />
              <div className="aw-rows">
                <LegendRow color="var(--aw-info, var(--aw-accent))" label={t('Demand')} value={short(d.demand)} />
                <LegendRow color="var(--aw-success)" label={t('Posted')} value={short(d.recovered)} />
                <LegendRow color="var(--aw-danger)" label={t('Shortfall')} value={short(short_)} />
              </div>
            </div>
            <CardFoot>
              <span>{t('Members in this demand')}</span>
              <strong>{d.members.toLocaleString('en-IN')}</strong>
            </CardFoot>
          </>
        );
      })()}
    </Section>
  </WidgetCard>
);
};

// ─── Deposits summary (ring chart) ───────────────────────────────────────────

export const DepositsSummaryWidget: React.FC<{ state: SummaryState }> = ({ state }) => {
  const { t } = useTranslation();
  return (
  <WidgetCard title={t('Deposits Summary')} tone={TONE_SUCCESS}>
    <Section state={state} name="deposits" error="Could not load deposit totals">
      {d => {
        const slices: Slice[] = [
          { label: t('Fixed & recurring'), value: d.fixedRecurring.amount, color: 'var(--aw-accent)' },
          { label: t('Savings'), value: d.savings.amount, color: 'var(--aw-success)' },
          { label: t('Compulsory deposit'), value: d.compulsory, color: 'var(--aw-warning)' },
        ];
        const total = slices.reduce((s, x) => s + x.value, 0);
        return (
          <>
            <Headline value={short(total)} caption={t('total deposits')}
              pill={<span className="aw-pill tone-success">{t('By type')}</span>} />
            <div className="dash-viz">
              <Donut slices={slices} ariaLabel="Deposits by type" />
              <div className="aw-rows">
                <LegendRow color={slices[0]!.color} label={t('Fixed & recurring')} value={short(d.fixedRecurring.amount)} sub={`${d.fixedRecurring.count} account${d.fixedRecurring.count === 1 ? '' : 's'}`} />
                <LegendRow color={slices[1]!.color} label={t('Savings')} value={short(d.savings.amount)} sub={`${d.savings.count} account${d.savings.count === 1 ? '' : 's'}`} />
                <LegendRow color={slices[2]!.color} label={t('Compulsory deposit')} value={short(d.compulsory)} />
              </div>
            </div>
            <CardFoot>
              <span>{t('Share capital')} {t('(not included above)')}</span>
              <strong>{short(d.shares)}</strong>
            </CardFoot>
          </>
        );
      }}
    </Section>
  </WidgetCard>
);
};

// ─── Upcoming maturities (timeline) ──────────────────────────────────────────

export const UpcomingMaturitiesWidget: React.FC<{ state: SummaryState }> = ({ state }) => {
  const { t } = useTranslation();
  return (
  <WidgetCard title={t('Upcoming Maturities (This Month)')} tone={TONE_WARNING}>
    <Section state={state} name="maturities" error="Could not load maturities">
      {list => {
        if (list.length === 0) return <ErrorNote message={t('No fixed or recurring deposits mature this month')} />;
        const daysInMonth = dayjs().daysInMonth();
        const counts = new Array(daysInMonth).fill(0) as number[];
        list.forEach(m => { const day = dayjs(m.date).date(); if (day >= 1 && day <= daysInMonth) counts[day - 1]! += 1; });
        const max = Math.max(...counts, 1);
        const todayIdx = dayjs().date() - 1;
        const total = list.reduce((s, m) => s + m.amount, 0);
        const upcoming = list.filter(m => daysFromToday(m.date) >= 0).concat(list.filter(m => daysFromToday(m.date) < 0)).slice(0, 5);
        return (
          <>
            <Headline value={<CountUp value={list.length} />} caption={t('{{1}} maturing', { 1: short(total) })}
              pill={<span className="aw-pill tone-warning">{dayjs().format('MMMM')}</span>} />
            <div style={{ display: 'flex', gap: 2 }} role="img" aria-label={t('Maturities by day of the month')}>
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
                      <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{m.name || t('Member {{1}}', { 1: m.memberNo })}</strong>
                      <span className="aw-meta">{dayjs(m.date).format('D MMM')} · <span style={{ color: n < 0 ? 'var(--aw-danger)' : undefined }}>{inDays(n)}</span></span>
                    </span>
                    <strong>{short(m.amount)}</strong>
                  </div>
                );
              })}
            </div>
            <CardFoot>
              <span>{list.length > upcoming.length ? t('Showing {{1}} of {{2}}', { 1: upcoming.length, 2: list.length }) : t('All maturities this month')}</span>
              <strong>{short(total)}</strong>
            </CardFoot>
          </>
        );
      }}
    </Section>
  </WidgetCard>
);
};

// ─── Loan applications (steps) ───────────────────────────────────────────────

export const LoanApplicationsWidget: React.FC<{ state: SummaryState; onOpen: (route: string) => void }> = ({ state, onOpen }) => {
  const { t } = useTranslation();
  return (
  <WidgetCard title={t('Loan Applications')} tone={TONE_INFO}>
    <Section state={state} name="applications" error="Could not load loan applications">
      {a => {
        const steps = [
          { label: t('Pending sanction'), data: a.pending, tone: 'var(--aw-warning)' },
          { label: t('Sanctioned, awaiting payout'), data: a.sanctioned, tone: 'var(--aw-info, var(--aw-accent))' },
          { label: t('Disbursed this month'), data: a.disbursedThisMonth, tone: 'var(--aw-success)' },
        ];
        const stepTotal = steps.reduce((s, x) => s + x.data.count, 0);
        return (
          <>
            <Headline value={<CountUp value={a.pending.count + a.sanctioned.count} />} caption={t('Open applications')}
              pill={<span className="aw-pill tone-info">{short(a.pending.amount + a.sanctioned.amount)}</span>} />
            {/* Same body as the other cards: one bar split by stage, then a legend row per stage. */}
            <div>
              <div className="aw-bar" role="img" aria-label={t('Loan applications by stage')} style={{ gap: 2, background: 'transparent' }}>
                {stepTotal > 0
                  ? steps.filter(s => s.data.count > 0).map(s => (
                    <span key={s.label} title={`${s.label}: ${s.data.count}`} style={{ width: `${(s.data.count / stepTotal) * 100}%`, background: s.tone, borderRadius: 999 }} />
                  ))
                  : <span style={{ width: '100%', background: 'var(--aw-border)' }} />}
              </div>
              <div className="aw-rows" style={{ marginTop: 6 }}>
                {steps.map(s => (
                  <LegendRow key={s.label} color={s.tone} label={s.label} sub={short(s.data.amount)} value={s.data.count.toLocaleString('en-IN')} />
                ))}
              </div>
            </div>
            <CardFoot>
              <span>{t('Disbursed this month')} <strong>{short(a.disbursedThisMonth.amount)}</strong></span>
              <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" onClick={() => onOpen('/loan-application')}>{t('Open Loan Application')}</button>
            </CardFoot>
          </>
        );
      }}
    </Section>
  </WidgetCard>
);
};

// ─── Overdue loans (ring chart) ──────────────────────────────────────────────

const OVERDUE_BUCKETS = [
  { label: tLabel('Under 6 months'), max: 6, color: 'var(--aw-success)' },
  { label: tLabel('6 – 12 months'), max: 12, color: 'var(--aw-warning)' },
  { label: tLabel('1 – 3 years'), max: 36, color: 'var(--aw-danger)' },
  { label: tLabel('Over 3 years'), max: Infinity, color: 'var(--aw-muted)' },
];

export const OverdueLoansWidget: React.FC = () => {
  const { t } = useTranslation();
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
    <WidgetCard title={t('Overdue Loans')} tone={'var(--aw-danger)'}>
      {error ? <ErrorNote message={t('Could not load overdue loans')} /> : data === null ? <Loading /> : data.total === 0 ? (
        <ErrorNote message={t('No overdue loans')} />
      ) : (
        <>
          <Headline value={<CountUp value={data.total} />} caption={t('Overdue loans')}
            pill={<span className="aw-pill tone-danger">{t('Since last payment')}</span>} />
          <div className="dash-viz">
            <Donut ariaLabel="Overdue loans by time since last payment"
              slices={OVERDUE_BUCKETS.map((b, i): Slice => ({ label: b.label, value: data.counts[i] ?? 0, color: b.color }))} />
            <div className="aw-rows">
              {OVERDUE_BUCKETS.map((b, i) => <LegendRow key={b.label} color={b.color} label={b.label} value={(data.counts[i] ?? 0).toLocaleString('en-IN')} />)}
            </div>
          </div>
          <CardFoot>
            <span>{t('Outstanding on these loans')}</span>
            <strong>{short(data.balance)}</strong>
          </CardFoot>
        </>
      )}
    </WidgetCard>
  );
};

// ─── Members retiring soon ───────────────────────────────────────────────────

export const RetiringMembersWidget: React.FC<{ state: SummaryState }> = ({ state }) => {
  const { t } = useTranslation();
  return (
  <WidgetCard title={t('Retiring Within 6 Months')} tone={'var(--aw-danger)'}>
    <Section state={state} name="retiring" error="Could not load retiring members">
      {r => r.count === 0 ? <ErrorNote message={t('No members retiring in the next 6 months')} /> : (
        <>
          <Headline value={<CountUp value={r.count} />} caption={t('members, soonest first')}
            pill={<span className="aw-pill tone-danger">{t('Next 6 months')}</span>} />
          <div className="aw-rows">
            {r.upcoming.slice(0, 5).map(m => {
              const n = daysFromToday(m.date);
              return (
                <div key={m.memberNo} className="aw-row" style={{ alignItems: 'center', gap: 10 }}>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{m.name || t('Member {{1}}', { 1: m.memberNo })}</strong>
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
          <CardFoot>
            <span>{t('Showing {{1}} of {{2}}', { 1: Math.min(5, r.upcoming.length), 2: r.count })}</span>
            <span>{t('With loan balance')}</span>
          </CardFoot>
        </>
      )}
    </Section>
  </WidgetCard>
);
};

// ─── New members ─────────────────────────────────────────────────────────────

export const NewMembersWidget: React.FC<{ state: SummaryState }> = ({ state }) => {
  const { t } = useTranslation();
  return (
  <WidgetCard title={t('New Members')} tone={TONE_SUCCESS}>
    <Section state={state} name="members" error="Could not load new members">
      {m => {
        const diff = m.newThisMonth - m.newLastMonth;
        const pct = m.newLastMonth > 0 ? Math.round((diff / m.newLastMonth) * 100) : null;
        return (
          <>
            <Headline value={<CountUp value={m.newThisMonth} />} caption={<>{t('Joined in')} {dayjs().format('MMMM')}</>}
              pill={(
                <span className={`aw-pill ${diff >= 0 ? 'tone-success' : 'tone-danger'}`}>
                  {diff >= 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />} {pct === null ? `${Math.abs(diff)}` : `${Math.abs(pct)}%`}
                </span>
              )} />
            <CardFoot>
              <span>{t('Last month ({{1}})', { 1: dayjs().subtract(1, 'month').format('MMM') })}</span>
              <strong>{m.newLastMonth.toLocaleString('en-IN')}</strong>
            </CardFoot>
          </>
        );
      }}
    </Section>
  </WidgetCard>
);
};
