import React from 'react';
import dayjs from 'dayjs';
import { fmt, type ConsolidationData, type HeadGroup } from './consolModel';

const sumOf = (groups: HeadGroup[]) => groups.reduce((t, g) => t + g.total, 0);

const Section: React.FC<{ title: string; groups: HeadGroup[]; total: number }> = ({ title, groups, total }) => (
  <section className="cbe-voucher">
    <div className="cbe-vhead"><span><b>{title}</b></span><span className="cbv-num">{fmt(total)}</span></div>
    <table className="cbe-table">
      <thead><tr><th className="l">Code</th><th className="l">Name</th><th>Amount</th></tr></thead>
      <tbody>
        {groups.map(g => (
          <React.Fragment key={g.headCode + g.headName}>
            <tr>
              <td className="l cbe-code">{g.headCode}</td>
              <td className="l"><b>{g.headName}</b></td>
              <td className="cbv-num"><b>{fmt(g.total)}</b></td>
            </tr>
            {g.subEntries.map((e, i) => (
              <tr key={i}>
                <td className="l cbe-code" style={{ paddingLeft: 26 }}>{e.mbNo}</td>
                <td className="l" style={{ color: 'var(--e-dim)' }}>{e.memberName}</td>
                <td className="cbv-num">{fmt(e.amount)}</td>
              </tr>
            ))}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  </section>
);

const ConsolEditorial: React.FC<{ data: ConsolidationData; date: dayjs.Dayjs }> = ({ data, date }) => (
  <div className="cbv cbv-ed">
    <article className="cbe-sheet">
      <header className="cbe-head">
        <div className="cbe-eyebrow">Daily Statement</div>
        <h2>Espat Karmchari Co-Operative Credit Society Limited</h2>
        <p>Avenue A, Sahakari Sadan, Sector-C, AT Post: Bhilai Nagar, Dist: DURG-490006</p>
        <div className="cbe-rule" />
        <div className="cbe-title">
          <span>Consolidation of Daily Accounts</span>
          <span>For {date.format('dddd, DD MMMM YYYY')}</span>
        </div>
      </header>

      {data.receiptGroups.length > 0 && <Section title="Receipt" groups={data.receiptGroups} total={sumOf(data.receiptGroups)} />}
      {data.paymentGroups.length > 0 && <Section title="Payment" groups={data.paymentGroups} total={sumOf(data.paymentGroups)} />}

      <section className="cbe-balance" aria-label="Summary">
        <dl>
          {data.openingBalance != null && <div><dt>Opening balance</dt><dd className="cbv-num">{fmt(data.openingBalance)}</dd></div>}
          <div><dt>Total receipt</dt><dd className="cbv-num">{fmt(data.totalReceipts)}</dd></div>
          {data.totalCash != null && <div className="cbe-sub"><dt>Total cash</dt><dd className="cbv-num">{fmt(data.totalCash)}</dd></div>}
          <div><dt>Total payment</dt><dd className="cbv-num">{fmt(data.totalPayments)}</dd></div>
          {data.closingBalance != null
            ? <div className="cbe-close"><dt>Closing balance</dt><dd className="cbv-num">{fmt(data.closingBalance)}</dd></div>
            : <div className="cbe-close"><dt>Net movement</dt><dd className="cbv-num">{fmt(data.totalReceipts - data.totalPayments)}</dd></div>}
        </dl>
      </section>

      <footer className="cbe-sign">
        {['Cashier', 'Accountant', 'Manager'].map(r => <div key={r}><span /> {r}</div>)}
      </footer>
      <p className="cbe-note">Amounts are consolidated by account head · print follows the society's standard letterhead layout</p>
    </article>
  </div>
);

export default ConsolEditorial;
