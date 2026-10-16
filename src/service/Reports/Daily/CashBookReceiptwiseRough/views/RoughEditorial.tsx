import React from 'react';
import dayjs from 'dayjs';
import { fmt, type CashBookRoughData } from './roughModel';

const Amt: React.FC<{ v: number }> = ({ v }) => (v > 0 ? <span className="cbv-num">{fmt(v)}</span> : <span className="cbv-faint">—</span>);

const RoughEditorial: React.FC<{ data: CashBookRoughData; date: dayjs.Dayjs }> = ({ data, date }) => (
  <div className="cbv cbv-ed">
    <article className="cbe-sheet">
      <header className="cbe-head">
        <div className="cbe-eyebrow">Daily Statement</div>
        <h2>Espat Karmchari Co-Operative Credit Society Limited</h2>
        <p>Avenue A, Sahakari Sadan, Sector-C, AT Post: Bhilai Nagar, Dist: DURG-490006</p>
        <div className="cbe-rule" />
        <div className="cbe-title">
          <span>Cash Book — Voucher-wise</span>
          <span>For {date.format('dddd, DD MMMM YYYY')}</span>
        </div>
      </header>

      {data.vouchers.map(v => (
        <section key={v.voucherNo + v.memberNo} className="cbe-voucher">
          <div className="cbe-vhead">
            <span><b>Voucher {v.voucherNo}</b> · {v.memberNo} {v.memberName}</span>
            <span>By {v.modeOfPayment || 'Cash'}</span>
          </div>
          {v.narration && <div className="cbe-vnote">{v.narration}</div>}
          <table className="cbe-table">
            <thead><tr><th className="l">No.</th><th className="l">Particulars</th><th>Payment</th><th>Receipt</th></tr></thead>
            <tbody>
              {v.entries.map(e => (
                <tr key={e.sno}>
                  <td className="l cbe-code">{e.sno}</td>
                  <td className="l">{e.headCode} {e.headName || e.description}</td>
                  <td><Amt v={e.payment} /></td>
                  <td><Amt v={e.receipt} /></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td className="l" colSpan={2}>Voucher total</td><td><Amt v={v.totalPayment} /></td><td><Amt v={v.totalReceipt} /></td></tr></tfoot>
          </table>
        </section>
      ))}

      <section className="cbe-balance" aria-label="Balance summary">
        <dl>
          <div><dt>Opening balance</dt><dd className="cbv-num">{fmt(data.openingBalance)}</dd></div>
          <div><dt>Add: total credit</dt><dd className="cbv-num">{fmt(data.totalReceipts)}</dd></div>
          <div className="cbe-sub"><dt>Total</dt><dd className="cbv-num">{fmt(data.openingBalance + data.totalReceipts)}</dd></div>
          <div><dt>Less: total debit</dt><dd className="cbv-num">{fmt(data.totalPayments)}</dd></div>
          <div className="cbe-close"><dt>Closing balance</dt><dd className="cbv-num">{fmt(data.closingBalance)}</dd></div>
        </dl>
      </section>

      <footer className="cbe-sign">
        {['Cashier', 'Accountant', 'Manager'].map(r => <div key={r}><span /> {r}</div>)}
      </footer>
      <p className="cbe-note">Report as per data available · print follows the society's standard letterhead layout</p>
    </article>
  </div>
);

export default RoughEditorial;
