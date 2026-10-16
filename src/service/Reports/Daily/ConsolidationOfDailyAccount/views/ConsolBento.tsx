import React, { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Layers, Scale, Search, Users } from 'lucide-react';
import { Donut } from '@/pages/dashboard/DashCharts';
import { RankList, useGrown } from '../../../../../components/reports/views/viewParts';
import { fmt, deriveConsolidation, type ConsolidationData, type HeadGroup } from './consolModel';

type Row = { side: 'Receipt' | 'Payment'; group: HeadGroup };

const ConsolBento: React.FC<{ data: ConsolidationData }> = ({ data }) => {
  const dv = useMemo(() => deriveConsolidation(data), [data]);
  const grown = useGrown(data.date + data.totalHeads);
  const [q, setQ] = useState('');
  const [side, setSide] = useState<'all' | 'Receipt' | 'Payment'>('all');

  const rows = useMemo<Row[]>(() => {
    const all: Row[] = [
      ...data.receiptGroups.map(group => ({ side: 'Receipt' as const, group })),
      ...data.paymentGroups.map(group => ({ side: 'Payment' as const, group })),
    ];
    const needle = q.trim().toLowerCase();
    return all.filter(r => (side === 'all' || r.side === side) && (!needle
      || `${r.group.headCode} ${r.group.headName} ${r.group.subEntries.map(e => `${e.mbNo} ${e.memberName}`).join(' ')}`.toLowerCase().includes(needle)));
  }, [data, q, side]);

  const net = data.totalReceipts - data.totalPayments;

  return (
    <div className="cbv cbv-bento">
      <section className="cbv-tile cbv-hero">
        <header>
          <span className="cbv-icon tone-accent"><Scale size={15} /></span>
          <h3>Net movement</h3>
          <span className="cbv-chip tone-muted">{dv.receiptHeads + dv.paymentHeads} head{dv.receiptHeads + dv.paymentHeads === 1 ? '' : 's'}</span>
        </header>
        <div className={`cbv-hero-num cbv-num ${net >= 0 ? 'tone-success' : 'tone-danger'}`}>{net >= 0 ? '+' : '−'}₹{fmt(Math.abs(net))}</div>
        <p className="cbv-muted">Receipts ₹{fmt(data.totalReceipts)} − payments ₹{fmt(data.totalPayments)}{data.closingBalance != null ? ` · closing ₹${fmt(data.closingBalance)}` : ''}</p>
        <div className="cbv-split" style={{ marginTop: 'auto' }}>
          <Donut size={120} thickness={15} ariaLabel="Share of receipts and payments in the day's turnover"
            slices={[{ label: 'Receipts', value: data.totalReceipts, color: 'var(--aw-success)' }, { label: 'Payments', value: data.totalPayments, color: 'var(--aw-danger)' }]}
            center={<><b className="cbv-donut-num">{dv.receiptShare.toFixed(0)}%</b><span className="cbv-muted">in</span></>} />
          <div className="cbv-split-body">
            <div className="cbv-legend"><i style={{ background: 'var(--aw-success)' }} /> Receipts <b className="cbv-num">{fmt(data.totalReceipts)}</b></div>
            <div className="cbv-legend"><i style={{ background: 'var(--aw-danger)' }} /> Payments <b className="cbv-num">{fmt(data.totalPayments)}</b></div>
          </div>
        </div>
      </section>

      <section className="cbv-tile">
        <header><span className="cbv-icon tone-accent"><Layers size={15} /></span><h3>Account heads</h3></header>
        <div className="cbv-big cbv-num">{data.totalHeads || dv.receiptHeads + dv.paymentHeads}</div>
        <dl className="cbv-facts">
          <div><dt>Receipt heads</dt><dd className="cbv-num">{dv.receiptHeads}</dd></div>
          <div><dt>Payment heads</dt><dd className="cbv-num">{dv.paymentHeads}</dd></div>
          {dv.members > 0 && <div><dt>Members</dt><dd className="cbv-num">{dv.members}</dd></div>}
        </dl>
      </section>

      <section className="cbv-tile">
        <header><span className="cbv-icon tone-success"><ArrowDownLeft size={15} /></span><h3>Top receipt heads</h3></header>
        <RankList rows={dv.topReceipts} tone="success" grown={grown} />
      </section>
      <section className="cbv-tile">
        <header><span className="cbv-icon tone-danger"><ArrowUpRight size={15} /></span><h3>Top payment heads</h3></header>
        <RankList rows={dv.topPayments} tone="danger" grown={grown} />
      </section>

      <section className="cbv-tile cbv-wide">
        <header>
          <span className="cbv-icon tone-accent"><Users size={15} /></span>
          <h3>All heads</h3>
          <div className="aw-chips" role="radiogroup" aria-label="Section">
            {(['all', 'Receipt', 'Payment'] as const).map(s => (
              <button key={s} type="button" role="radio" aria-checked={side === s} className="aw-chip" onClick={() => setSide(s)}>{s === 'all' ? 'All' : s}</button>
            ))}
          </div>
          <label className="cbv-search"><Search size={13} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search head or member" aria-label="Search heads" /></label>
        </header>
        <div className="cbv-scroll">
          <table className="cbv-table">
            <thead><tr><th>Code</th><th>Name</th><th className="r">Amount</th></tr></thead>
            <tbody>
              {rows.map(({ side: s, group: g }) => (
                <React.Fragment key={s + g.headCode + g.headName}>
                  <tr className="cbv-grouprow">
                    <td className="cbv-code"><span className={`cbv-chip ${s === 'Receipt' ? 'tone-success' : 'tone-danger'}`}>{s}</span> {g.headCode}</td>
                    <td>{g.headName}</td>
                    <td className={`r cbv-num ${s === 'Receipt' ? 'tone-success' : 'tone-danger'}`}>{fmt(g.total)}</td>
                  </tr>
                  {g.subEntries.map((e, i) => (
                    <tr key={i}>
                      <td className="cbv-code" style={{ paddingLeft: 28 }}>{e.mbNo}</td>
                      <td>{e.memberName}</td>
                      <td className="r cbv-num">{fmt(e.amount)}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              {!rows.length && <tr><td colSpan={3} className="cbv-muted" style={{ textAlign: 'center', padding: 18 }}>No head matches.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default ConsolBento;
