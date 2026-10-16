import React, { useMemo } from 'react';
import { CheckCircle2, GitMerge, Layers, Wallet } from 'lucide-react';
import { Sparkline } from '@/pages/dashboard/DashCharts';
import { useGrown } from '../../../../components/reports/views/viewParts';
import { fmt } from '../../../../components/reports/views/format';
import type { ChainResult } from '../hooks/useLoanConsolidationChain';

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const ChainBento: React.FC<{ chain: ChainResult }> = ({ chain }) => {
  const grown = useGrown(chain.mbno + chain.chainLength);
  const dv = useMemo(() => {
    const head = chain.links.find(l => l.isActive) ?? chain.links[chain.links.length - 1];
    const first = chain.links[0];
    const peak = Math.max(1, ...chain.links.map(l => l.loanAmt));
    return { head, first, peak, settledTotal: chain.links.reduce((s, l) => s + (l.contributedAtClosure ?? 0), 0) };
  }, [chain]);

  return (
    <div className="cbv cbv-bento">
      <section className="cbv-tile cbv-hero">
        <header>
          <span className="cbv-icon tone-accent"><Wallet size={15} /></span>
          <h3>Current balance</h3>
          <span className="cbv-chip tone-muted">{chain.loantype === 'ALN' ? 'Emergency Loan' : 'Regular Loan'}</span>
        </header>
        <div className="cbv-hero-num cbv-num">₹{fmt(dv.head?.currentBalance ?? 0)}</div>
        <p className="cbv-muted">Member {chain.mbno} · open case #{dv.head?.loancaseno} · {chain.chainLength} case{chain.chainLength === 1 ? '' : 's'} in the chain</p>
        {chain.links.length > 1 && (
          <div style={{ marginTop: 'auto' }}>
            <Sparkline values={chain.links.map(l => l.loanAmt)} height={64} ariaLabel="Loan amount at each case of the chain" />
            <div className="cbv-bridge-labels" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ textAlign: 'left' }}><span>First</span><b className="cbv-num">₹{fmt(dv.first?.loanAmt ?? 0)}</b></div>
              <div style={{ textAlign: 'right' }}><span>Latest</span><b className="cbv-num">₹{fmt(dv.head?.loanAmt ?? 0)}</b></div>
            </div>
          </div>
        )}
      </section>

      <section className="cbv-tile">
        <header><span className="cbv-icon tone-accent"><Layers size={15} /></span><h3>Chain</h3></header>
        <div className="cbv-big cbv-num">{chain.chainLength}</div>
        <dl className="cbv-facts">
          <div><dt>Consolidations</dt><dd className="cbv-num">{Math.max(0, chain.chainLength - 1)}</dd></div>
          <div><dt>Started</dt><dd>{fmtDate(dv.first?.disbursementDate ?? null)}</dd></div>
          <div><dt>Latest disbursed</dt><dd>{fmtDate(dv.head?.disbursementDate ?? null)}</dd></div>
        </dl>
      </section>

      <section className="cbv-tile">
        <header><span className="cbv-icon tone-success"><CheckCircle2 size={15} /></span><h3>Settled on the way</h3></header>
        <div className="cbv-big cbv-num">{fmt(dv.settledTotal)}</div>
        <p className="cbv-muted">Total of the settlement amounts used to close each earlier case.</p>
      </section>

      <section className="cbv-tile cbv-wide">
        <header><span className="cbv-icon tone-accent"><GitMerge size={15} /></span><h3>Cases in the chain</h3></header>
        <div className="cbv-scroll">
          <table className="cbv-table">
            <thead><tr><th>Case</th><th>Disbursed</th><th className="r">Loan amount</th><th className="r">Settlement / balance</th><th>Status</th></tr></thead>
            <tbody>
              {chain.links.map((l, i) => (
                <tr key={l.loancaseno}>
                  <td className="cbv-code">#{l.loancaseno}{i === 0 ? ' · original' : ''}</td>
                  <td>{fmtDate(l.disbursementDate)}</td>
                  <td className="r cbv-num">
                    <span className="cbv-cell">
                      <i className="cbv-mini tone-accent" style={{ width: grown ? `${(l.loanAmt / dv.peak) * 100}%` : '0%' }} />
                      <span className="cbv-num">{fmt(l.loanAmt)}</span>
                    </span>
                  </td>
                  <td className="r cbv-num">{fmt(l.isActive ? l.currentBalance : (l.contributedAtClosure ?? 0))}</td>
                  <td>{l.isActive
                    ? <span className="cbv-chip tone-success">Open</span>
                    : <span className="cbv-chip tone-muted">Settled {fmtDate(l.closedDate)} → #{l.closedIntoLoancaseno}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default ChainBento;
