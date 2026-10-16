import React, { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, AlertTriangle, Search, Wallet, Users, FileText, CreditCard } from 'lucide-react';
import { Donut } from '@/pages/dashboard/DashCharts';
import { Bridge, RankList, useGrown } from '../../../../../components/reports/views/viewParts';
import { fmt, deriveRough, type CashBookRoughData } from './roughModel';

const MODE_COLORS = ['var(--aw-accent)', 'var(--aw-success)', 'var(--aw-warning)', 'var(--aw-danger)', 'var(--aw-muted)'];

const RoughBento: React.FC<{ data: CashBookRoughData }> = ({ data }) => {
  const dv = useMemo(() => deriveRough(data), [data]);
  const grown = useGrown(data.date + data.vouchers.length);
  const [q, setQ] = useState('');

  const vouchers = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle
      ? data.vouchers.filter(v => `${v.voucherNo} ${v.memberNo} ${v.memberName} ${v.narration}`.toLowerCase().includes(needle))
      : data.vouchers;
  }, [data.vouchers, q]);

  const modeSlices = dv.modes.map((m, i) => ({ label: m.name, value: m.receipt + m.payment, color: MODE_COLORS[i % MODE_COLORS.length]! }));
  const modeTotal = modeSlices.reduce((s, x) => s + x.value, 0);

  return (
    <div className="cbv cbv-bento">
      <section className="cbv-tile cbv-hero">
        <header>
          <span className="cbv-icon tone-accent"><Wallet size={15} /></span>
          <h3>Closing balance</h3>
          <span className={`cbv-chip ${dv.balanced ? 'tone-success' : 'tone-warning'}`} data-tip={dv.balanced ? 'Opening + Credit − Debit equals the closing balance' : `Opening + Credit − Debit is ${fmt(dv.computedClosing)}`}>
            {dv.balanced ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
            {dv.balanced ? 'Balanced' : `Differs by ${fmt(Math.abs(dv.difference))}`}
          </span>
        </header>
        <div className="cbv-hero-num cbv-num">₹{fmt(data.closingBalance)}</div>
        <p className="cbv-muted">Opening ₹{fmt(data.openingBalance)} · net {data.totalReceipts - data.totalPayments >= 0 ? '+' : '−'}₹{fmt(Math.abs(data.totalReceipts - data.totalPayments))}</p>
        <Bridge opening={data.openingBalance} receipts={data.totalReceipts} payments={data.totalPayments} closing={data.closingBalance} grown={grown} />
      </section>

      <section className="cbv-tile">
        <header><span className="cbv-icon tone-accent"><FileText size={15} /></span><h3>Vouchers</h3></header>
        <div className="cbv-big cbv-num">{data.vouchers.length}</div>
        <dl className="cbv-facts">
          <div><dt>Ledger legs</dt><dd className="cbv-num">{dv.entryCount}</dd></div>
          <div><dt>Members</dt><dd className="cbv-num">{dv.members.length}</dd></div>
          <div><dt>Heads touched</dt><dd className="cbv-num">{dv.heads.length}</dd></div>
        </dl>
      </section>

      <section className="cbv-tile">
        <header><span className="cbv-icon tone-accent"><CreditCard size={15} /></span><h3>By mode of payment</h3></header>
        <div className="cbv-split">
          <Donut
            size={104} thickness={13} ariaLabel="Voucher amounts by mode of payment" slices={modeSlices}
            center={<><b className="cbv-donut-num">{dv.modes.length}</b><span className="cbv-muted">{dv.modes.length === 1 ? 'mode' : 'modes'}</span></>}
          />
          <div className="cbv-split-body">
            {dv.modes.map((m, i) => (
              <div key={m.key} className="cbv-legend">
                <i style={{ background: MODE_COLORS[i % MODE_COLORS.length] }} /> {m.name}
                <b className="cbv-num">{modeTotal > 0 ? (((m.receipt + m.payment) / modeTotal) * 100).toFixed(0) : 0}%</b>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cbv-tile">
        <header><span className="cbv-icon tone-success"><ArrowDownLeft size={15} /></span><h3>Top receipt heads</h3></header>
        <RankList rows={dv.topReceiptHeads.map(h => ({ key: h.key, name: h.name, value: h.receipt }))} tone="success" grown={grown} />
      </section>
      <section className="cbv-tile">
        <header><span className="cbv-icon tone-danger"><ArrowUpRight size={15} /></span><h3>Top payment heads</h3></header>
        <RankList rows={dv.topPaymentHeads.map(h => ({ key: h.key, name: h.name, value: h.payment }))} tone="danger" grown={grown} />
      </section>
      <section className="cbv-tile">
        <header><span className="cbv-icon tone-accent"><Users size={15} /></span><h3>Busiest members</h3></header>
        <RankList rows={dv.topMembers.map(m => ({ key: m.key, name: m.name, value: m.receipt + m.payment }))} tone="accent" grown={grown} />
      </section>

      <section className="cbv-tile cbv-wide">
        <header>
          <h3>All vouchers</h3>
          <label className="cbv-search">
            <Search size={13} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search voucher, member or note" aria-label="Search vouchers" />
          </label>
        </header>
        <div className="cbv-vgrid">
          {vouchers.map(v => (
            <article key={v.voucherNo + v.memberNo} className="cbv-vcard">
              <div className="cbv-vcard-top">
                <b>{v.voucherNo}</b>
                <span className="cbv-chip tone-muted">{v.modeOfPayment || 'Cash'}</span>
              </div>
              <div className="cbv-vcard-member">{v.memberNo} {v.memberName}</div>
              {v.narration && <p className="cbv-muted">{v.narration}</p>}
              <ul>
                {v.entries.map(e => (
                  <li key={e.sno}>
                    <span title={`${e.headCode} ${e.headName || e.description}`}>{e.headCode} {e.headName || e.description}</span>
                    <span className={`cbv-num ${e.receipt > 0 ? 'tone-success' : 'tone-danger'}`}>{e.receipt > 0 ? fmt(e.receipt) : fmt(e.payment)}</span>
                  </li>
                ))}
              </ul>
              <div className="cbv-vcard-total">
                <span>Credit <b className="cbv-num tone-success">{fmt(v.totalReceipt)}</b></span>
                <span>Debit <b className="cbv-num tone-danger">{fmt(v.totalPayment)}</b></span>
              </div>
            </article>
          ))}
          {!vouchers.length && <p className="cbv-muted">No voucher matches “{q}”.</p>}
        </div>
      </section>
    </div>
  );
};

export default RoughBento;
