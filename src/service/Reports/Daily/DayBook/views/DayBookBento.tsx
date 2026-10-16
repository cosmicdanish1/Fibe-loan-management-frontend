import React, { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, AlertTriangle, Search, Wallet, Users, FileText, UserCog } from 'lucide-react';
import { Donut } from '@/pages/dashboard/DashCharts';
import { Bridge, RankList, useGrown } from '../../../../../components/reports/views/viewParts';
import { fmt, deriveDayBook, type DayBookData, type Side } from './dayBookModel';

const DayBookBento: React.FC<{ data: DayBookData }> = ({ data }) => {
  const dv = useMemo(() => deriveDayBook(data), [data]);
  const grown = useGrown(data.date + dv.rows.length);
  const [q, setQ] = useState('');
  const [side, setSide] = useState<'all' | Side>('all');

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return dv.rows.filter(r =>
      (side === 'all' || r.side === side) &&
      (!needle || `${r.headCode} ${r.headName} ${r.mbNo} ${r.memberName} ${r.voucherNo} ${r.username}`.toLowerCase().includes(needle)));
  }, [dv.rows, q, side]);

  // Group the visible rows by section and head, as the legacy report does.
  const groups = useMemo(() => {
    const out: { key: string; side: Side; headCode: string; headName: string; total: number; rows: typeof rows }[] = [];
    rows.forEach(r => {
      const key = `${r.side}-${r.headCode}`;
      let g = out.find(x => x.key === key);
      if (!g) { g = { key, side: r.side, headCode: r.headCode, headName: r.headName, total: 0, rows: [] }; out.push(g); }
      g.total += r.amount; g.rows.push(r);
    });
    return out;
  }, [rows]);

  const turnover = data.totalReceipts + data.totalPayments;

  return (
    <div className="cbv cbv-bento">
      <section className="cbv-tile cbv-hero">
        <header>
          <span className="cbv-icon tone-accent"><Wallet size={15} /></span>
          <h3>Closing balance</h3>
          <span className={`cbv-chip ${dv.balanced ? 'tone-success' : 'tone-warning'}`} data-tip={dv.balanced ? 'Opening + Receipts − Payments equals the closing balance' : `Opening + Receipts − Payments is ${fmt(dv.computedClosing)}`}>
            {dv.balanced ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
            {dv.balanced ? 'Balanced' : `Differs by ${fmt(Math.abs(dv.difference))}`}
          </span>
        </header>
        <div className="cbv-hero-num cbv-num">₹{fmt(data.closingBalance)}</div>
        <p className="cbv-muted">Opening ₹{fmt(data.openingBalance)} · net {data.totalReceipts - data.totalPayments >= 0 ? '+' : '−'}₹{fmt(Math.abs(data.totalReceipts - data.totalPayments))}</p>
        <Bridge opening={data.openingBalance} receipts={data.totalReceipts} payments={data.totalPayments} closing={data.closingBalance} grown={grown} />
      </section>

      <section className="cbv-tile">
        <header><span className="cbv-icon tone-accent"><FileText size={15} /></span><h3>Transactions</h3></header>
        <div className="cbv-big cbv-num">{data.totalTransactions}</div>
        <dl className="cbv-facts">
          <div><dt>Vouchers</dt><dd className="cbv-num">{dv.vouchers}</dd></div>
          <div><dt>Members</dt><dd className="cbv-num">{dv.members}</dd></div>
          <div><dt>Heads touched</dt><dd className="cbv-num">{dv.heads}</dd></div>
        </dl>
      </section>

      <section className="cbv-tile">
        <header><span className="cbv-icon tone-accent"><Users size={15} /></span><h3>Receipts vs payments</h3></header>
        <div className="cbv-split">
          <Donut
            size={104} thickness={13} ariaLabel="Share of receipts and payments in the day's turnover"
            slices={[
              { label: 'Receipts', value: data.totalReceipts, color: 'var(--aw-success)' },
              { label: 'Payments', value: data.totalPayments, color: 'var(--aw-danger)' },
            ]}
            center={<><b className="cbv-donut-num">{turnover > 0 ? ((data.totalReceipts / turnover) * 100).toFixed(0) : 0}%</b><span className="cbv-muted">in</span></>}
          />
          <div className="cbv-split-body">
            <div className="cbv-legend"><i style={{ background: 'var(--aw-success)' }} /> Receipts <b className="cbv-num">{fmt(data.totalReceipts)}</b></div>
            <div className="cbv-legend"><i style={{ background: 'var(--aw-danger)' }} /> Payments <b className="cbv-num">{fmt(data.totalPayments)}</b></div>
          </div>
        </div>
      </section>

      <section className="cbv-tile">
        <header><span className="cbv-icon tone-success"><ArrowDownLeft size={15} /></span><h3>Top receipt heads</h3></header>
        <RankList rows={dv.topReceiptHeads.map(h => ({ key: h.key, name: h.name, value: h.value }))} tone="success" grown={grown} />
      </section>
      <section className="cbv-tile">
        <header><span className="cbv-icon tone-danger"><ArrowUpRight size={15} /></span><h3>Top payment heads</h3></header>
        <RankList rows={dv.topPaymentHeads.map(h => ({ key: h.key, name: h.name, value: h.value }))} tone="danger" grown={grown} />
      </section>
      <section className="cbv-tile">
        <header><span className="cbv-icon tone-accent"><UserCog size={15} /></span><h3>By user</h3></header>
        <RankList rows={dv.users.map(u => ({ key: u.key, name: `${u.name} · ${u.count}`, value: u.value }))} tone="accent" grown={grown} />
      </section>

      <section className="cbv-tile cbv-wide">
        <header>
          <h3>All entries</h3>
          <div className="aw-chips" role="radiogroup" aria-label="Section">
            {(['all', 'Payment', 'Receipt'] as const).map(s => (
              <button key={s} type="button" role="radio" aria-checked={side === s} className="aw-chip" onClick={() => setSide(s)}>{s === 'all' ? 'All' : s}</button>
            ))}
          </div>
          <label className="cbv-search">
            <Search size={13} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search head, member, voucher or user" aria-label="Search entries" />
          </label>
        </header>
        <div className="cbv-scroll">
          <table className="cbv-table">
            <thead>
              <tr><th>Mem No.</th><th>Name</th><th>Voucher</th><th>User</th><th className="r">Amount</th></tr>
            </thead>
            <tbody>
              {groups.map(g => (
                <React.Fragment key={g.key}>
                  <tr className="cbv-grouprow">
                    <td colSpan={4}><span className={`cbv-chip ${g.side === 'Receipt' ? 'tone-success' : 'tone-danger'}`}>{g.side}</span> <b>{g.headCode}</b> {g.headName}</td>
                    <td className={`r cbv-num ${g.side === 'Receipt' ? 'tone-success' : 'tone-danger'}`}>{fmt(g.total)}</td>
                  </tr>
                  {g.rows.map(r => (
                    <tr key={r.id}>
                      <td className="cbv-code">{r.mbNo}</td>
                      <td>{r.memberName}</td>
                      <td className="cbv-code">{r.voucherNo}</td>
                      <td className="cbv-code">{r.username}</td>
                      <td className="r cbv-num">{fmt(r.amount)}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              {!groups.length && <tr><td colSpan={5} className="cbv-muted" style={{ textAlign: 'center', padding: 18 }}>No entry matches.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default DayBookBento;
