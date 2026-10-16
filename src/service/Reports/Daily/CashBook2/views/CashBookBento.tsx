import React, { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, AlertTriangle, Search, Wallet, Landmark } from 'lucide-react';
import { Donut } from '@/pages/dashboard/DashCharts';
import { Bridge, RankList, useGrown } from '../../../../../components/reports/views/viewParts';
import { fmt, pct, deriveCashBook, type CashBook2Summary } from './cashBookModel';

const SplitTile: React.FC<{ title: string; total: number; cash: number; transfer: number; tone: 'success' | 'danger'; icon: React.ReactNode; cashPct: number }> = ({ title, total, cash, transfer, tone, icon, cashPct }) => (
  <section className="cbv-tile">
    <header><span className={`cbv-icon tone-${tone}`}>{icon}</span><h3>{title}</h3></header>
    <div className="cbv-split">
      <Donut
        size={104} thickness={13} ariaLabel={`${title}: ${cashPct.toFixed(0)} percent cash`}
        slices={[
          { label: 'Cash', value: cash, color: `var(--aw-${tone})` },
          { label: 'Transfer', value: transfer, color: 'var(--aw-border-strong)' },
        ]}
        center={<><b className="cbv-donut-num">{cashPct.toFixed(0)}%</b><span className="cbv-muted">cash</span></>}
      />
      <div className="cbv-split-body">
        <div className="cbv-big cbv-num">{fmt(total)}</div>
        <div className="cbv-legend"><i style={{ background: `var(--aw-${tone})` }} /> Cash <b className="cbv-num">{fmt(cash)}</b></div>
        <div className="cbv-legend"><i style={{ background: 'var(--aw-border-strong)' }} /> Transfer <b className="cbv-num">{fmt(transfer)}</b></div>
      </div>
    </div>
  </section>
);

const CashBookBento: React.FC<{ data: CashBook2Summary }> = ({ data }) => {
  const dv = useMemo(() => deriveCashBook(data), [data]);
  const grown = useGrown(data.date + data.entries.length);
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? data.entries.filter(e => `${e.headCode} ${e.headName}`.toLowerCase().includes(needle)) : data.entries;
  }, [data.entries, q]);
  const maxRow = Math.max(1, ...data.entries.map(e => Math.max(e.receipt, e.payment)));

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

      <SplitTile title="Receipts" total={data.totalReceipts} cash={data.totalReceiptsCash} transfer={data.totalReceiptsTransfer} cashPct={dv.receiptCashPct} tone="success" icon={<ArrowDownLeft size={15} />} />
      <SplitTile title="Payments" total={data.totalPayments} cash={data.totalPaymentsCash} transfer={data.totalPaymentsTransfer} cashPct={dv.paymentCashPct} tone="danger" icon={<ArrowUpRight size={15} />} />

      <section className="cbv-tile">
        <header><span className="cbv-icon tone-success"><ArrowDownLeft size={15} /></span><h3>Top receipt heads</h3></header>
        <RankList rows={dv.topReceipts.map(r => ({ key: r.headCode, name: r.headName, value: r.receipt }))} tone="success" grown={grown} />
      </section>
      <section className="cbv-tile">
        <header><span className="cbv-icon tone-danger"><ArrowUpRight size={15} /></span><h3>Top payment heads</h3></header>
        <RankList rows={dv.topPayments.map(r => ({ key: r.headCode, name: r.headName, value: r.payment }))} tone="danger" grown={grown} />
      </section>

      <section className="cbv-tile">
        <header><span className="cbv-icon tone-accent"><Landmark size={15} /></span><h3>Net movement</h3></header>
        <dl className="cbv-facts">
          <div><dt>Cash in − out</dt><dd className={`cbv-num ${dv.netCash >= 0 ? 'tone-success' : 'tone-danger'}`}>{dv.netCash >= 0 ? '+' : '−'}{fmt(Math.abs(dv.netCash))}</dd></div>
          <div><dt>Transfer in − out</dt><dd className={`cbv-num ${dv.netTransfer >= 0 ? 'tone-success' : 'tone-danger'}`}>{dv.netTransfer >= 0 ? '+' : '−'}{fmt(Math.abs(dv.netTransfer))}</dd></div>
          <div><dt>Heads touched</dt><dd className="cbv-num">{data.entries.length}</dd></div>
        </dl>
      </section>

      <section className="cbv-tile cbv-wide">
        <header>
          <h3>All heads</h3>
          <label className="cbv-search">
            <Search size={13} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search head or code" aria-label="Search heads" />
          </label>
        </header>
        <div className="cbv-scroll">
          <table className="cbv-table">
            <thead>
              <tr><th>Code</th><th>Head</th><th className="r">Receipt cash</th><th className="r">Receipt transfer</th><th className="r">Payment cash</th><th className="r">Payment transfer</th></tr>
            </thead>
            <tbody>
              {rows.map((e, i) => (
                <tr key={e.headCode + i}>
                  <td className="cbv-code">{e.headCode}</td>
                  <td>{e.headName}</td>
                  {([['receiptCash', 'success'], ['receiptTransfer', 'success'], ['paymentCash', 'danger'], ['paymentTransfer', 'danger']] as const).map(([k, tone]) => (
                    <td key={k} className="r">
                      {e[k] > 0 ? (
                        <span className="cbv-cell">
                          <i className={`cbv-mini tone-${tone}`} style={{ width: `${Math.min(100, pct(e[k], maxRow))}%` }} />
                          <span className="cbv-num">{fmt(e[k])}</span>
                        </span>
                      ) : <span className="cbv-faint">–</span>}
                    </td>
                  ))}
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={6} className="cbv-muted" style={{ textAlign: 'center', padding: 18 }}>No head matches “{q}”.</td></tr>}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>Total</td>
                <td className="r cbv-num tone-success">{fmt(data.totalReceiptsCash)}</td>
                <td className="r cbv-num tone-success">{fmt(data.totalReceiptsTransfer)}</td>
                <td className="r cbv-num tone-danger">{fmt(data.totalPaymentsCash)}</td>
                <td className="r cbv-num tone-danger">{fmt(data.totalPaymentsTransfer)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
};

export default CashBookBento;
