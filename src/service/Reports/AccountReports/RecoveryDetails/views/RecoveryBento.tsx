import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Coins, Landmark, PiggyBank, Receipt } from 'lucide-react';
import { Donut } from '@/pages/dashboard/DashCharts';
import { RankList, useGrown } from '../../../../../components/reports/views/viewParts';
import { fmt, deriveRecovery, type RecoveryData } from './recoveryModel';

const RecoveryBento: React.FC<{ data: RecoveryData; periodLabel: string }> = ({ data, periodLabel }) => {
  const dv = useMemo(() => deriveRecovery(data), [data]);
  const grown = useGrown(data.memberNo + periodLabel);
  const nonZero = (l: { key: string; label: string; value: number }[]) => l.filter(x => x.value > 0).map(x => ({ key: x.key, name: x.label, value: x.value }));

  return (
    <div className="cbv cbv-bento">
      <section className="cbv-tile cbv-hero">
        <header>
          <span className="cbv-icon tone-accent"><Coins size={15} /></span>
          <h3>Total demand</h3>
          <span className={`cbv-chip ${dv.matches ? 'tone-success' : 'tone-warning'}`} data-tip={dv.matches ? 'Loans + deposits + charges equal the total demand' : `Loans + deposits + charges come to ${fmt(dv.groupsTotal)}`}>
            {dv.matches ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
            {dv.matches ? 'Adds up' : `Differs by ${fmt(Math.abs(dv.difference))}`}
          </span>
        </header>
        <div className="cbv-hero-num cbv-num">₹{fmt(data.totalDemand)}</div>
        <p className="cbv-muted">{data.memberName} · Member {data.memberNo} · {periodLabel}</p>
        <div className="cbv-split" style={{ marginTop: 'auto' }}>
          <Donut size={120} thickness={15} ariaLabel="Share of loans, deposits and charges in the demand"
            slices={[
              { label: 'Loans', value: dv.loansTotal, color: 'var(--aw-accent)' },
              { label: 'Deposits', value: dv.depositsTotal, color: 'var(--aw-success)' },
              { label: 'Charges', value: dv.chargesTotal, color: 'var(--aw-warning)' },
            ]}
            center={<><b className="cbv-donut-num">{dv.groupsTotal > 0 ? ((dv.loansTotal / dv.groupsTotal) * 100).toFixed(0) : 0}%</b><span className="cbv-muted">loans</span></>} />
          <div className="cbv-split-body">
            <div className="cbv-legend"><i style={{ background: 'var(--aw-accent)' }} /> Loans <b className="cbv-num">{fmt(dv.loansTotal)}</b></div>
            <div className="cbv-legend"><i style={{ background: 'var(--aw-success)' }} /> Deposits <b className="cbv-num">{fmt(dv.depositsTotal)}</b></div>
            <div className="cbv-legend"><i style={{ background: 'var(--aw-warning)' }} /> Charges <b className="cbv-num">{fmt(dv.chargesTotal)}</b></div>
          </div>
        </div>
      </section>

      <section className="cbv-tile">
        <header><span className="cbv-icon tone-accent"><Landmark size={15} /></span><h3>Loan recoveries</h3></header>
        <div className="cbv-big cbv-num">{fmt(dv.loansTotal)}</div>
        <RankList rows={nonZero(dv.loans)} tone="accent" grown={grown} empty="No loan recovery this month." />
      </section>
      <section className="cbv-tile">
        <header><span className="cbv-icon tone-success"><PiggyBank size={15} /></span><h3>Deposit recoveries</h3></header>
        <div className="cbv-big cbv-num">{fmt(dv.depositsTotal)}</div>
        <RankList rows={nonZero(dv.deposits)} tone="success" grown={grown} empty="No deposit recovery this month." />
      </section>
      <section className="cbv-tile">
        <header><span className="cbv-icon tone-warning"><Receipt size={15} /></span><h3>Charges</h3></header>
        <div className="cbv-big cbv-num">{fmt(dv.chargesTotal)}</div>
        <dl className="cbv-facts">
          {dv.charges.map(c => <div key={c.key}><dt>{c.label}</dt><dd className="cbv-num">{fmt(c.value)}</dd></div>)}
        </dl>
      </section>
    </div>
  );
};

export default RecoveryBento;
