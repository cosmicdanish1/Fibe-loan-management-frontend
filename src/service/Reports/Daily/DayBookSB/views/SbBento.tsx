import React, { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Search, Users, Wallet } from 'lucide-react';
import { Donut } from '@/pages/dashboard/DashCharts';
import { Bridge, RankList, useGrown } from '../../../../../components/reports/views/viewParts';
import { fmt, deriveSB, type SBData } from './sbModel';

const SplitTile: React.FC<{ title: string; total: number; cash: number; transfer: number; tone: 'success' | 'danger'; icon: React.ReactNode; cashPct: number }> = ({ title, total, cash, transfer, tone, icon, cashPct }) => (
  <section className="cbv-tile">
    <header><span className={`cbv-icon tone-${tone}`}>{icon}</span><h3>{title}</h3></header>
    <div className="cbv-split">
      <Donut size={104} thickness={13} ariaLabel={`${title}: ${cashPct.toFixed(0)} percent cash`}
        slices={[{ label: 'Cash', value: cash, color: `var(--aw-${tone})` }, { label: 'Transfer', value: transfer, color: 'var(--aw-border-strong)' }]}
        center={<><b className="cbv-donut-num">{cashPct.toFixed(0)}%</b><span className="cbv-muted">cash</span></>} />
      <div className="cbv-split-body">
        <div className="cbv-big cbv-num">{fmt(total)}</div>
        <div className="cbv-legend"><i style={{ background: `var(--aw-${tone})` }} /> Cash <b className="cbv-num">{fmt(cash)}</b></div>
        <div className="cbv-legend"><i style={{ background: 'var(--aw-border-strong)' }} /> Transfer <b className="cbv-num">{fmt(transfer)}</b></div>
      </div>
    </div>
  </section>
);

/** Bento view for the savings (SB) and compulsory-deposit (CD) day books. */
const SbBento: React.FC<{ data: SBData; bookLabel: string }> = ({ data, bookLabel }) => {
  const dv = useMemo(() => deriveSB(data), [data]);
  const grown = useGrown(data.date + data.entries.length);
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? data.entries.filter(e => `${e.accNo} ${e.acName}`.toLowerCase().includes(needle)) : data.entries;
  }, [data.entries, q]);

  return (
    <div className="cbv cbv-bento">
      <section className="cbv-tile cbv-hero">
        <header>
          <span className="cbv-icon tone-accent"><Wallet size={15} /></span>
          <h3>Closing balance [{bookLabel}]</h3>
          <span className="cbv-chip tone-muted">{data.totalTransactions} transaction{data.totalTransactions === 1 ? '' : 's'}</span>
        </header>
        <div className="cbv-hero-num cbv-num">₹{fmt(data.closingBalance)}</div>
        <p className="cbv-muted">Opening ₹{fmt(data.openingBalance)} · net {data.totalDeposit - data.totalWithdrawal >= 0 ? '+' : '−'}₹{fmt(Math.abs(data.totalDeposit - data.totalWithdrawal))} · {dv.members} account{dv.members === 1 ? '' : 's'}</p>
        <Bridge opening={data.openingBalance} receipts={data.totalDeposit} payments={data.totalWithdrawal} closing={data.closingBalance} grown={grown} />
      </section>

      <SplitTile title="Deposits" total={data.totalDeposit} cash={data.totalDepositCash} transfer={data.totalDepositTransfer} cashPct={dv.cashPctDeposit} tone="success" icon={<ArrowDownLeft size={15} />} />
      <SplitTile title="Withdrawals" total={data.totalWithdrawal} cash={data.totalWithdrawalCash} transfer={data.totalWithdrawalTransfer} cashPct={dv.cashPctWithdrawal} tone="danger" icon={<ArrowUpRight size={15} />} />

      <section className="cbv-tile">
        <header><span className="cbv-icon tone-success"><ArrowDownLeft size={15} /></span><h3>Top deposits</h3></header>
        <RankList rows={dv.topDeposits} tone="success" grown={grown} empty="No deposits." />
      </section>
      <section className="cbv-tile">
        <header><span className="cbv-icon tone-danger"><ArrowUpRight size={15} /></span><h3>Top withdrawals</h3></header>
        <RankList rows={dv.topWithdrawals} tone="danger" grown={grown} empty="No withdrawals." />
      </section>
      <section className="cbv-tile">
        <header><span className="cbv-icon tone-accent"><Users size={15} /></span><h3>Cash in hand</h3></header>
        <div className="cbv-big cbv-num">{fmt(data.totalCashInHand)}</div>
        <p className="cbv-muted">Opening plus all deposits of the day.</p>
      </section>

      <section className="cbv-tile cbv-wide">
        <header>
          <h3>All transactions</h3>
          <label className="cbv-search"><Search size={13} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search account or name" aria-label="Search transactions" /></label>
        </header>
        <div className="cbv-scroll">
          <table className="cbv-table">
            <thead><tr><th>#</th><th>A/C No.</th><th>A/C Name</th><th className="r">Deposit cash</th><th className="r">Deposit transfer</th><th className="r">Withdrawal cash</th><th className="r">Withdrawal transfer</th></tr></thead>
            <tbody>
              {rows.map(e => (
                <tr key={e.srNo}>
                  <td className="cbv-code">{e.srNo}</td>
                  <td className="cbv-code">{e.accNo}</td>
                  <td>{e.acName}</td>
                  {([e.depositCash, e.depositTransfer, e.withdrawalCash, e.withdrawalTransfer]).map((v, i) => (
                    <td key={i} className="r">{v > 0 ? <span className={`cbv-num ${i < 2 ? 'tone-success' : 'tone-danger'}`}>{fmt(v)}</span> : <span className="cbv-faint">–</span>}</td>
                  ))}
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={7} className="cbv-muted" style={{ textAlign: 'center', padding: 18 }}>No transaction matches “{q}”.</td></tr>}
            </tbody>
            <tfoot>
              <tr><td colSpan={3}>Total</td>
                <td className="r cbv-num tone-success">{fmt(data.totalDepositCash)}</td><td className="r cbv-num tone-success">{fmt(data.totalDepositTransfer)}</td>
                <td className="r cbv-num tone-danger">{fmt(data.totalWithdrawalCash)}</td><td className="r cbv-num tone-danger">{fmt(data.totalWithdrawalTransfer)}</td></tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
};

export default SbBento;
