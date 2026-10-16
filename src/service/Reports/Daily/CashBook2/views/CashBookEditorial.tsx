import React from 'react';
import dayjs from 'dayjs';
import { fmt, type CashBook2Summary } from './cashBookModel';

const Amt: React.FC<{ v: number }> = ({ v }) => (v > 0 ? <span className="cbv-num">{fmt(v)}</span> : <span className="cbv-faint">—</span>);

const CashBookEditorial: React.FC<{ data: CashBook2Summary; date: dayjs.Dayjs }> = ({ data, date }) => {
  const total = data.openingBalance + data.totalReceipts;
  return (
    <div className="cbv cbv-ed">
      <article className="cbe-sheet">
        <header className="cbe-head">
          <div className="cbe-eyebrow">Daily Statement</div>
          <h2>Espat Karmchari Co-Operative Credit Society Limited</h2>
          <p>Avenue A, Sahakari Sadan, Sector-C, AT Post: Bhilai Nagar, Dist: DURG-490006</p>
          <div className="cbe-rule" />
          <div className="cbe-title">
            <span>Cash Book — Head-wise</span>
            <span>For {date.format('dddd, DD MMMM YYYY')}</span>
          </div>
        </header>

        <table className="cbe-table">
          <thead>
            <tr>
              <th rowSpan={2} className="l">Code</th>
              <th rowSpan={2} className="l">Particulars</th>
              <th colSpan={2}>Receipts</th>
              <th colSpan={2}>Payments</th>
            </tr>
            <tr><th>Cash</th><th>Transfer</th><th>Cash</th><th>Transfer</th></tr>
          </thead>
          <tbody>
            {data.entries.map((e, i) => (
              <tr key={e.headCode + i}>
                <td className="l cbe-code">{e.headCode}</td>
                <td className="l">{e.headName}</td>
                <td><Amt v={e.receiptCash} /></td>
                <td><Amt v={e.receiptTransfer} /></td>
                <td><Amt v={e.paymentCash} /></td>
                <td><Amt v={e.paymentTransfer} /></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="l" colSpan={2}>Total</td>
              <td><Amt v={data.totalReceiptsCash} /></td>
              <td><Amt v={data.totalReceiptsTransfer} /></td>
              <td><Amt v={data.totalPaymentsCash} /></td>
              <td><Amt v={data.totalPaymentsTransfer} /></td>
            </tr>
          </tfoot>
        </table>

        <section className="cbe-balance" aria-label="Balance summary">
          <dl>
            <div><dt>Opening balance</dt><dd className="cbv-num">{fmt(data.openingBalance)}</dd></div>
            <div><dt>Add: total receipts</dt><dd className="cbv-num">{fmt(data.totalReceipts)}</dd></div>
            <div className="cbe-sub"><dt>Total</dt><dd className="cbv-num">{fmt(total)}</dd></div>
            <div><dt>Less: total payments</dt><dd className="cbv-num">{fmt(data.totalPayments)}</dd></div>
            <div className="cbe-close"><dt>Closing balance</dt><dd className="cbv-num">{fmt(data.closingBalance)}</dd></div>
          </dl>
        </section>

        <footer className="cbe-sign">
          {['Cashier', 'Accountant', 'Manager'].map(r => <div key={r}><span /> {r}</div>)}
        </footer>
        <p className="cbe-note">Report as per data available · printed copy follows the society's standard letterhead layout</p>
      </article>
    </div>
  );
};

export default CashBookEditorial;
