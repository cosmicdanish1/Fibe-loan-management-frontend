import React, { useMemo } from 'react';
import { fmt, deriveRecovery, type Line, type RecoveryData } from './recoveryModel';

const Group: React.FC<{ title: string; lines: Line[]; total: number }> = ({ title, lines, total }) => (
  <section className="cbe-voucher">
    <div className="cbe-vhead"><span><b>{title}</b></span></div>
    <table className="cbe-table">
      <tbody>
        {lines.map(l => (
          <tr key={l.key}><td className="l">{l.label}</td><td>{l.value > 0 ? <span className="cbv-num">{fmt(l.value)}</span> : <span className="cbv-faint">—</span>}</td></tr>
        ))}
      </tbody>
      <tfoot><tr><td className="l">Sub-total</td><td><span className="cbv-num">{fmt(total)}</span></td></tr></tfoot>
    </table>
  </section>
);

const RecoveryEditorial: React.FC<{ data: RecoveryData; periodLabel: string }> = ({ data, periodLabel }) => {
  const dv = useMemo(() => deriveRecovery(data), [data]);
  return (
    <div className="cbv cbv-ed">
      <article className="cbe-sheet">
        <header className="cbe-head">
          <div className="cbe-eyebrow">Monthly Statement</div>
          <h2>Espat Karmchari Co-Operative Credit Society Limited</h2>
          <p>Avenue A, Sahakari Sadan, Sector-C, AT Post: Bhilai Nagar, Dist: DURG-490006</p>
          <div className="cbe-rule" />
          <div className="cbe-title">
            <span>Statement of Recovery in Detail</span>
            <span>For the month of {periodLabel}</span>
          </div>
        </header>

        <div className="cbe-vhead" style={{ marginTop: 14 }}>
          <span><b>Member {data.memberNo}</b> · {data.memberName}</span>
          <span>{data.period}</span>
        </div>
        {data.address && <div className="cbe-vnote">{data.address}</div>}

        <Group title="Loan recoveries" lines={dv.loans} total={dv.loansTotal} />
        <Group title="Deposit recoveries" lines={dv.deposits} total={dv.depositsTotal} />
        <Group title="Charges" lines={dv.charges} total={dv.chargesTotal} />

        <section className="cbe-balance" aria-label="Total demand">
          <dl>
            <div className="cbe-close"><dt>Total demand</dt><dd className="cbv-num">₹ {fmt(data.totalDemand)}</dd></div>
          </dl>
        </section>

        <footer className="cbe-sign">
          {['Member', 'Accountant', 'Manager'].map(r => <div key={r}><span /> {r}</div>)}
        </footer>
        <p className="cbe-note">Report as per data available · print follows the society's standard letterhead layout</p>
      </article>
    </div>
  );
};

export default RecoveryEditorial;
