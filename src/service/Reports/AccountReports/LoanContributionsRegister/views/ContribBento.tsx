import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { Briefcase, Layers, PieChart, TrendingUp } from 'lucide-react';
import { Donut, Sparkline } from '@/pages/dashboard/DashCharts';
import { RankList, useGrown } from '../../../../../components/reports/views/viewParts';
import { fmt, deriveContrib, type ContribData } from './contribModel';

const ContribBento: React.FC<{ data: ContribData }> = ({ data }) => {
  const dv = useMemo(() => deriveContrib(data), [data]);
  const grown = useGrown(data.memberNo + data.fromDate + data.toDate + dv.rows.length);
  const split = dv.principal + dv.interest + dv.penal;
  const period = `${dayjs(data.fromDate).format('DD-MMM-YY')} – ${dayjs(data.toDate).format('DD-MMM-YY')}`;

  return (
    <div className="cbv cbv-bento">
      <section className="cbv-tile cbv-hero">
        <header>
          <span className="cbv-icon tone-accent"><Briefcase size={15} /></span>
          <h3>Paid towards loans</h3>
          <span className="cbv-chip tone-muted">{period}</span>
        </header>
        <div className="cbv-hero-num cbv-num">₹{fmt(dv.credits)}</div>
        <p className="cbv-muted">{data.memberName} · Member {data.memberNo} · {dv.rows.length} transactions across {data.loanContributions.length} loan{data.loanContributions.length === 1 ? '' : 's'}</p>
        {dv.monthly.length > 1 && (
          <div style={{ marginTop: 'auto' }}>
            <Sparkline values={dv.monthly.map(m => m.value)} height={64} ariaLabel="Amount paid per month" />
            <div className="cbv-bridge-labels" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ textAlign: 'left' }}><span>From</span><b>{dayjs(dv.monthly[0]!.month + '-01').format('MMM YYYY')}</b></div>
              <div style={{ textAlign: 'right' }}><span>To</span><b>{dayjs(dv.monthly[dv.monthly.length - 1]!.month + '-01').format('MMM YYYY')}</b></div>
            </div>
          </div>
        )}
      </section>

      <section className="cbv-tile">
        <header><span className="cbv-icon tone-accent"><PieChart size={15} /></span><h3>Principal, interest, penalty</h3></header>
        {split > 0 ? (
          <div className="cbv-split">
            <Donut size={104} thickness={13} ariaLabel="How the payments split into principal, interest and penalty"
              slices={[
                { label: 'Principal', value: dv.principal, color: 'var(--aw-accent)' },
                { label: 'Interest', value: dv.interest, color: 'var(--aw-warning)' },
                { label: 'Penalty', value: dv.penal, color: 'var(--aw-danger)' },
              ]}
              center={<><b className="cbv-donut-num">{((dv.principal / split) * 100).toFixed(0)}%</b><span className="cbv-muted">principal</span></>} />
            <div className="cbv-split-body">
              <div className="cbv-legend"><i style={{ background: 'var(--aw-accent)' }} /> Principal <b className="cbv-num">{fmt(dv.principal)}</b></div>
              <div className="cbv-legend"><i style={{ background: 'var(--aw-warning)' }} /> Interest <b className="cbv-num">{fmt(dv.interest)}</b></div>
              <div className="cbv-legend"><i style={{ background: 'var(--aw-danger)' }} /> Penalty <b className="cbv-num">{fmt(dv.penal)}</b></div>
            </div>
          </div>
        ) : <p className="cbv-muted">The split is not recorded for these transactions.</p>}
      </section>

      <section className="cbv-tile">
        <header><span className="cbv-icon tone-accent"><TrendingUp size={15} /></span><h3>Paid per loan</h3></header>
        <RankList rows={dv.perLoan.filter(l => l.credits > 0).map(l => ({ key: l.key, name: `${l.label} · ${l.count}`, value: l.credits }))} tone="accent" grown={grown} empty="No payment in this period." />
      </section>

      <section className="cbv-tile cbv-wide">
        <header><span className="cbv-icon tone-accent"><Layers size={15} /></span><h3>Loans</h3></header>
        <div className="cbv-vgrid">
          {data.loanContributions.map((lc, i) => {
            const p = dv.perLoan[i]!;
            return (
              <article key={p.key} className="cbv-vcard">
                <div className="cbv-vcard-top"><b>{p.label}</b><span className="cbv-chip tone-muted">{lc.loanDetails.interestRate}% · {lc.loanDetails.numberOfInstallments} inst.</span></div>
                <div className="cbv-big cbv-num">{fmt(p.amount)}</div>
                <div className="cbv-track"><span className="cbv-fill tone-success" style={{ width: grown ? `${p.repaidPct}%` : '0%' }} /></div>
                <div className="cbv-vcard-total">
                  <span>Repaid <b className="cbv-num tone-success">{p.repaidPct.toFixed(0)}%</b></span>
                  <span>Outstanding <b className="cbv-num">{fmt(p.outstanding)}</b></span>
                </div>
                <div className="cbv-vcard-total" style={{ borderTop: 0, marginTop: 0, paddingTop: 0 }}>
                  <span>Paid in period <b className="cbv-num">{fmt(p.credits)}</b></span>
                  <span>{p.count} tx</span>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default ContribBento;
