import React, { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import dayjs from 'dayjs';
import apiService from '../../services/api';
import { WidgetCard, Headline, CardFoot, ErrorNote, Loading, money, TONE_ACCENT, TONE_INFO, TONE_WARNING, TONE_SUCCESS } from './AnalyticsWidgets';
import { HalfGauge, LegendRow, CountUp } from './DashCharts';
import { Section, short, type SummaryState } from './SummaryWidgets';
import { useTranslation } from 'react-i18next';

// Second set of dashboard widgets. Each one follows the card anatomy described at the top of
// AnalyticsWidgets.tsx: Headline, then body, then CardFoot.

type Open = (route: string) => void;

// Report endpoints answer either with the rows directly or with `{ metadata, data }`, sometimes wrapped once more.
const unwrap = (payload: any): { rows: any[]; total: number } => {
  const inner = payload && !Array.isArray(payload) && payload.data && !Array.isArray(payload.data) ? payload.data : payload;
  const rows: any[] = Array.isArray(inner) ? inner : Array.isArray(inner?.data) ? inner.data : [];
  const total = Number(inner?.metadata?.totalCount);
  return { rows, total: Number.isFinite(total) && total > 0 ? total : rows.length };
};

const nameCell: React.CSSProperties = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' };

// ─── Top defaulters ──────────────────────────────────────────────────────────
// Same list as Reports → Defaulter List (longest overdue first), first five rows.

export const TopDefaultersWidget: React.FC<{ onOpen: Open }> = ({ onOpen }) => {
  const { t } = useTranslation();
  const [data, setData] = useState<{ rows: any[]; total: number } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    apiService.getDefaulterList(0, 5, 0).then(res => {
      if (cancelled) return;
      if (!res.success) { setError(true); return; }
      setData(unwrap(res.data));
    }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  const worst = data?.rows[0];
  return (
    <WidgetCard title={t('Top Defaulters')} tone={'var(--aw-danger)'}>
      {error ? <ErrorNote message={t('Could not load the defaulter list')} /> : data === null ? <Loading height={128} /> : data.rows.length === 0 || !worst ? (
        <ErrorNote message={t('No overdue loans')} />
      ) : (
        <>
          <Headline
            value={<><CountUp value={Number(worst.monthsOverdue) || 0} /><small>{t('months')}</small></>}
            caption={t('Longest overdue')}
            pill={<span className="aw-pill tone-danger">{t('Top {{1}}', { 1: data.rows.length })}</span>} />
          <div className="aw-rows">
            {data.rows.map((d, i) => (
              <div key={d.loanCaseNo ?? i} className="aw-row" style={{ alignItems: 'center', gap: 10 }}>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <strong style={nameCell}>{d.memberName || t('Member {{1}}', { 1: d.memberNo })}</strong>
                  <span className="aw-meta">{d.memberNo} · {Number(d.monthsOverdue) || 0} {t('months overdue')}</span>
                </span>
                <strong style={{ color: 'var(--aw-danger)' }}>{short(Number(d.balance) || 0)}</strong>
              </div>
            ))}
          </div>
          <CardFoot>
            <span>{t('Showing {{1}} of {{2}}', { 1: data.rows.length, 2: data.total.toLocaleString('en-IN') })}</span>
            <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" onClick={() => onOpen('/reports/monthly/defaulter-list')}>{t('Open Defaulter List')}</button>
          </CardFoot>
        </>
      )}
    </WidgetCard>
  );
};

// ─── Today's receipts vs payments ────────────────────────────────────────────
// Figures of today's cash book.

export const TodayCashFlowWidget: React.FC<{ onOpen: Open }> = ({ onOpen }) => {
  const { t } = useTranslation();
  const [day, setDay] = useState<{ receipts: number; payments: number; opening: number } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    apiService.getCashBookReport(dayjs().format('YYYY-MM-DD')).then(res => {
      if (cancelled) return;
      const d: any = res && res.success ? ((res.data as any)?.data ?? res.data) : null;
      if (d && typeof d === 'object' && 'closingBalance' in d) {
        setDay({ receipts: Number(d.totalReceipts) || 0, payments: Number(d.totalPayments) || 0, opening: Number(d.openingBalance) || 0 });
      } else setError(true);
    }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  const net = day ? day.receipts - day.payments : 0;
  const max = day ? Math.max(day.receipts, day.payments, 1) : 1;
  return (
    <WidgetCard title={t("Today's Receipts vs Payments")} tone={TONE_ACCENT}>
      {error ? <ErrorNote message={t("Could not load today's cash book")} /> : day === null ? <Loading /> : (
        <>
          <Headline
            value={<CountUp value={net} format={n => `${n < 0 ? '−' : ''}${money(Math.abs(n))}`} />}
            caption={<>{t('Net today ·')} {dayjs().format('D MMM')}</>}
            pill={(
              <span className={`aw-pill ${net >= 0 ? 'tone-success' : 'tone-danger'}`}>
                {net >= 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />} {net >= 0 ? t('Inflow') : t('Outflow')}
              </span>
            )} />
          <div className="aw-stack" style={{ gap: 10 }}>
            {[
              { label: t('Receipts'), value: day.receipts, color: 'var(--aw-success)' },
              { label: t('Payments'), value: day.payments, color: 'var(--aw-danger)' },
            ].map(b => (
              <div key={b.label}>
                <div className="aw-inline" style={{ justifyContent: 'space-between', marginBottom: 5 }}>
                  <span className="aw-row-label">{b.label}</span>
                  <strong className="dash-num">{money(b.value)}</strong>
                </div>
                <div className="aw-bar" role="img" aria-label={`${b.label} ${money(b.value)}`} style={{ background: 'var(--aw-border)' }}>
                  <span style={{ width: `${(b.value / max) * 100}%`, background: b.color }} />
                </div>
              </div>
            ))}
          </div>
          <CardFoot>
            <span>{t('Opening balance')} <strong>{money(day.opening)}</strong></span>
            <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" onClick={() => onOpen('/reports/daily/cash-book')}>{t('Open Cash Book')}</button>
          </CardFoot>
        </>
      )}
    </WidgetCard>
  );
};

// ─── Loans disbursed this month ──────────────────────────────────────────────
// Same rows as Reports → New Loan Disbursed, from the 1st of this month to today.

export const DisbursedThisMonthWidget: React.FC<{ onOpen: Open }> = ({ onOpen }) => {
  const { t } = useTranslation();
  const [data, setData] = useState<{ rows: any[]; total: number } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    apiService.getNewLoanDisbursed(dayjs().startOf('month').format('YYYY-MM-DD'), dayjs().format('YYYY-MM-DD')).then(res => {
      if (cancelled) return;
      if (!res.success) { setError(true); return; }
      setData(unwrap(res.data));
    }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  const amount = (data?.rows ?? []).reduce((s, l) => s + (Number(l.loanAmount) || 0), 0);
  const latest = (data?.rows ?? []).slice(0, 4);
  return (
    <WidgetCard title={t('Loans Disbursed (This Month)')} tone={TONE_SUCCESS}>
      {error ? <ErrorNote message={t('Could not load disbursed loans')} /> : data === null ? <Loading height={128} /> : data.rows.length === 0 ? (
        <ErrorNote message={t('No loans disbursed this month yet')} />
      ) : (
        <>
          <Headline value={<CountUp value={amount} format={short} />}
            caption={<>{data.rows.length} {data.rows.length === 1 ? t('loan in') : t('loans in')} {dayjs().format('MMMM')}</>}
            pill={<span className="aw-pill tone-success">{t('Paid out')}</span>} />
          <div className="aw-rows">
            {latest.map((l, i) => (
              <div key={l.loanCaseNo ?? i} className="aw-row" style={{ alignItems: 'center', gap: 10 }}>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <strong style={nameCell}>{l.memberName || t('Member {{1}}', { 1: l.memberNo })}</strong>
                  <span className="aw-meta">{dayjs(l.disbursementDate).format('D MMM')} · {l.loanType}</span>
                </span>
                <strong>{short(Number(l.loanAmount) || 0)}</strong>
              </div>
            ))}
          </div>
          <CardFoot>
            <span>{t('Showing {{1}} of {{2}}', { 1: latest.length, 2: data.rows.length })}</span>
            <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" onClick={() => onOpen('/reports/monthly/new-loan-disbursed')}>{t('Open Report')}</button>
          </CardFoot>
        </>
      )}
    </WidgetCard>
  );
};

// ─── RD instalments due this month ───────────────────────────────────────────

export const RdDuesWidget: React.FC<{ state: SummaryState; onOpen: Open }> = ({ state, onOpen }) => {
  const { t } = useTranslation();
  return (
    <WidgetCard title={t('RD Instalments (This Month)')} tone={TONE_WARNING}>
      <Section state={state} name="rdDues" error="Could not load RD instalments">
        {d => d.members === 0 || d.expected <= 0 ? <ErrorNote message={t('No RD instalments are due this month')} /> : (() => {
          const pending = Math.max(0, d.expected - d.paid);
          const pct = (d.paid / d.expected) * 100;
          return (
            <>
              <Headline value={<CountUp value={pending} format={money} />} caption={t('Still to collect')}
                pill={<span className={`aw-pill ${pct >= 90 ? 'tone-success' : pct >= 60 ? 'tone-warning' : 'tone-danger'}`}>{pct.toFixed(0)}% {t('collected')}</span>} />
              <div className="dash-viz">
                <HalfGauge width={124} percent={pct} color={pct >= 90 ? 'var(--aw-success)' : pct >= 60 ? 'var(--aw-warning)' : 'var(--aw-danger)'} ariaLabel={`${pct.toFixed(0)} percent of this month's RD instalments collected`} />
                <div className="aw-rows">
                  <LegendRow color="var(--aw-info, var(--aw-accent))" label={t('Expected')} value={money(d.expected)} />
                  <LegendRow color="var(--aw-success)" label={t('Collected')} value={money(d.paid)} />
                  <LegendRow color="var(--aw-danger)" label={t('Pending')} value={money(pending)} />
                </div>
              </div>
              <CardFoot>
                <span>{t('Paid')} <strong>{d.paidMembers}</strong> · {t('Part')} <strong>{d.partialMembers}</strong> · {t('Unpaid')} <strong>{d.unpaidMembers}</strong></span>
                <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" onClick={() => onOpen('/masters/rd-repayment')}>{t('Open RD Repayment')}</button>
              </CardFoot>
            </>
          );
        })()}
      </Section>
    </WidgetCard>
  );
};

// ─── Waiting for approval ────────────────────────────────────────────────────
// One list of everything that is waiting for someone to pass or sanction it: vouchers not yet
// passed, loan applications not yet sanctioned, and sanctioned loans not yet paid out.

export const WaitingApprovalWidget: React.FC<{ state: SummaryState; onOpen: Open }> = ({ state, onOpen }) => {
  const { t } = useTranslation();
  const [vouchers, setVouchers] = useState<{ count: number; amount: number } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    apiService.getPendingVouchers().then(res => {
      if (cancelled) return;
      if (res.success && Array.isArray(res.data)) {
        setVouchers({ count: res.data.length, amount: res.data.reduce((s: number, v: any) => s + (Number(v.amount) || 0), 0) });
      } else setError(true);
    }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  const apps = state.summary?.applications ?? null;
  const loading = vouchers === null || state.loading;
  const items = vouchers && apps ? [
    { label: t('Vouchers to pass'), ...vouchers, color: 'var(--aw-warning)' },
    { label: t('Loans to sanction'), ...apps.pending, color: 'var(--aw-info, var(--aw-accent))' },
    { label: t('Loans to pay out'), ...apps.sanctioned, color: 'var(--aw-success)' },
  ] : [];
  const total = items.reduce((s, x) => s + x.count, 0);
  return (
    <WidgetCard title={t('Waiting For Approval')} tone={TONE_INFO}>
      {error || (!state.loading && !apps) ? <ErrorNote message={t('Could not load the items waiting for approval')} /> : loading ? <Loading height={128} /> : total === 0 ? (
        <ErrorNote message={t('Nothing is waiting for approval')} />
      ) : (
        <>
          <Headline value={<CountUp value={total} />} caption={t('Items waiting')}
            pill={<span className="aw-pill tone-info">{t('Needs action')}</span>} />
          <div className="aw-rows">
            {items.map(x => <LegendRow key={x.label} color={x.color} label={x.label} sub={short(x.amount)} value={x.count.toLocaleString('en-IN')} />)}
          </div>
          <CardFoot>
            <span>{t('Vouchers and loans')}</span>
            <button type="button" className="aw-btn aw-btn-primary aw-btn-sm" onClick={() => onOpen('/transaction/pass-transactions')}>{t('Review & pass')}</button>
          </CardFoot>
        </>
      )}
    </WidgetCard>
  );
};

// ─── Last database backup ────────────────────────────────────────────────────

const fileSize = (bytes: number) =>
  bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(2)} GB` : bytes >= 1024 ** 2 ? `${(bytes / 1024 ** 2).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export const LastBackupWidget: React.FC<{ onOpen: Open }> = ({ onOpen }) => {
  const { t } = useTranslation();
  const [list, setList] = useState<any[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    apiService.getBackupList().then(res => {
      if (cancelled) return;
      const rows: any[] | null = Array.isArray(res.data) ? res.data : Array.isArray((res.data as any)?.data) ? (res.data as any).data : null;
      if (!res.success || rows === null) { setError(true); return; }
      setList([...rows].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  const last = list?.[0];
  const age = last ? dayjs().startOf('day').diff(dayjs(last.createdAt).startOf('day'), 'day') : null;
  const tone = age === null ? 'tone-danger' : age <= 1 ? 'tone-success' : age <= 7 ? 'tone-warning' : 'tone-danger';
  return (
    <WidgetCard title={t('Last Database Backup')} tone={TONE_SUCCESS}>
      {error ? <ErrorNote message={t('Could not load the backup list')} /> : list === null ? <Loading /> : (
        <>
          <Headline neutral
            value={age === null ? t('None') : age === 0 ? t('Today') : age === 1 ? t('Yesterday') : <>{age}<small>{t('days ago')}</small></>}
            caption={last ? dayjs(last.createdAt).format('D MMM YYYY, h:mm A') : t('No backup has been taken yet')}
            pill={<span className={`aw-pill ${tone}`}>{age === null ? t('Not protected') : age <= 1 ? t('Up to date') : age <= 7 ? t('Getting old') : t('Overdue')}</span>} />
          {last && (
            <div className="aw-rows">
              <div className="aw-row" style={{ gap: 10 }}>
                <span className="aw-row-label">{t('File')}</span>
                <span className="aw-row-value" style={{ ...nameCell, minWidth: 0 }} title={last.fileName}>{last.fileName}</span>
              </div>
              <div className="aw-row"><span className="aw-row-label">{t('Size')}</span><span className="aw-row-value">{fileSize(Number(last.fileSize) || 0)}</span></div>
            </div>
          )}
          <CardFoot>
            <span>{list.length.toLocaleString('en-IN')} {list.length === 1 ? t('backup on record') : t('backups on record')}</span>
            <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" onClick={() => onOpen('/utility/database-backup')}>{t('Open Backup')}</button>
          </CardFoot>
        </>
      )}
    </WidgetCard>
  );
};
