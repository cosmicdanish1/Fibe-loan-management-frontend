import React, { useMemo } from 'react';
import { CalendarCheck, Repeat, TrendingUp, Wallet } from 'lucide-react';
import { Donut } from '@/pages/dashboard/DashCharts';
import { RankList, useGrown } from '../../../../../components/reports/views/viewParts';
import { fmt, deriveRecurring, statusTone, type RDItem } from './recurringModel';

const RecurringBento: React.FC<{ items: RDItem[]; memberNo: string }> = ({ items, memberNo }) => {
  const dv = useMemo(() => deriveRecurring(items), [items]);
  const grown = useGrown(memberNo + items.length);
  const name = items[0]?.memberName || '';

  return (
    <div className="cbv cbv-bento">
      <section className="cbv-tile cbv-hero">
        <header>
          <span className="cbv-icon tone-accent"><Wallet size={15} /></span>
          <h3>RD balance</h3>
          <span className="cbv-chip tone-muted">{dv.years} financial year{dv.years === 1 ? '' : 's'}</span>
        </header>
        <div className="cbv-hero-num cbv-num">₹{fmt(dv.totalBalance)}</div>
        <p className="cbv-muted">{name ? `${name} · ` : ''}Member {memberNo} · monthly ₹{fmt(dv.totalMonthly)} across all years</p>
        <div style={{ marginTop: 'auto' }}>
          <RankList rows={items.map(r => ({ key: r.key, name: r.yearLabel, value: r.currentBalance }))} tone="accent" grown={grown} />
        </div>
      </section>

      <section className="cbv-tile">
        <header><span className="cbv-icon tone-success"><CalendarCheck size={15} /></span><h3>Installments</h3></header>
        <div className="cbv-split">
          <Donut size={104} thickness={13} ariaLabel={`${dv.paidPct.toFixed(0)} percent of installments paid`}
            slices={[{ label: 'Paid', value: dv.paid, color: 'var(--aw-success)' }, { label: 'Missed', value: dv.missed, color: 'var(--aw-danger)' }]}
            center={<><b className="cbv-donut-num">{dv.paidPct.toFixed(0)}%</b><span className="cbv-muted">paid</span></>} />
          <div className="cbv-split-body">
            <div className="cbv-legend"><i style={{ background: 'var(--aw-success)' }} /> Paid <b className="cbv-num">{dv.paid}</b></div>
            <div className="cbv-legend"><i style={{ background: 'var(--aw-danger)' }} /> Missed <b className="cbv-num">{dv.missed}</b></div>
          </div>
        </div>
      </section>

      <section className="cbv-tile">
        <header><span className="cbv-icon tone-accent"><TrendingUp size={15} /></span><h3>Status</h3></header>
        <dl className="cbv-facts">
          {dv.statuses.map(s => (
            <div key={s.status}><dt>{s.status}</dt><dd className="cbv-num">{s.count} year{s.count === 1 ? '' : 's'}</dd></div>
          ))}
          <div><dt>Monthly instalment</dt><dd className="cbv-num">{fmt(dv.totalMonthly)}</dd></div>
        </dl>
      </section>

      <section className="cbv-tile cbv-wide">
        <header><span className="cbv-icon tone-accent"><Repeat size={15} /></span><h3>By financial year</h3></header>
        <div className="cbv-vgrid">
          {items.map(r => {
            const total = r.totalInstallmentsPaid + r.totalMissed;
            const pct = total > 0 ? (r.totalInstallmentsPaid / total) * 100 : 0;
            return (
              <article key={r.key} className="cbv-vcard">
                <div className="cbv-vcard-top"><b>{r.yearLabel}</b><span className={`cbv-chip tone-${statusTone(r.status)}`}>{r.status || '—'}</span></div>
                <div className="cbv-big cbv-num">{fmt(r.currentBalance)}</div>
                <div className="cbv-track"><span className="cbv-fill tone-success" style={{ width: grown ? `${pct}%` : '0%' }} /></div>
                <div className="cbv-vcard-total">
                  <span>Paid <b className="cbv-num tone-success">{r.totalInstallmentsPaid}</b></span>
                  <span>Missed <b className="cbv-num tone-danger">{r.totalMissed}</b></span>
                  <span>Monthly <b className="cbv-num">{fmt(r.monthlyRdAmount)}</b></span>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default RecurringBento;
