import React, { useMemo } from 'react';
import ProTerminal, { type TermCol } from '../../../../../components/reports/views/ProTerminal';
import { fmt, deriveRecurring, type RDItem } from './recurringModel';

const COLS: TermCol<RDItem>[] = [
  { key: 'fy',      label: 'FIN. YEAR',  width: '100px', render: r => r.yearLabel, sortValue: r => r.yearLabel },
  { key: 'monthly', label: 'MONTHLY',    width: 'minmax(96px, .8fr)', num: true, render: r => <span className="cbv-num">{fmt(r.monthlyRdAmount)}</span>, sortValue: r => r.monthlyRdAmount },
  { key: 'paid',    label: 'INSTALLMENTS', width: '110px', num: true, render: r => <span className="cbv-num tone-success">{r.totalInstallmentsPaid}</span>, sortValue: r => r.totalInstallmentsPaid },
  { key: 'missed',  label: 'MISSED',     width: '70px', num: true, render: r => <span className={`cbv-num ${r.totalMissed > 0 ? 'tone-danger' : 'cbv-faint'}`}>{r.totalMissed}</span>, sortValue: r => r.totalMissed },
  { key: 'bal',     label: 'BALANCE',    width: 'minmax(110px, 1fr)', num: true, render: r => <span className="cbv-num">{fmt(r.currentBalance)}</span>, sortValue: r => r.currentBalance },
  { key: 'status',  label: 'STATUS',     width: '90px', render: r => r.status, sortValue: r => r.status },
];

const RecurringTerminal: React.FC<{ items: RDItem[]; memberNo: string }> = ({ items, memberNo }) => {
  const dv = useMemo(() => deriveRecurring(items), [items]);
  return (
    <ProTerminal<RDItem>
      ariaLabel="RD by financial year"
      rows={items}
      cols={COLS}
      rowKey={r => r.key}
      searchText={r => `${r.yearLabel} ${r.status}`}
      placeholder="filter year or status  ( / )"
      strip={
        <>
          <span>MEMBER <b>{memberNo}</b></span>
          <span>YEARS <b className="cbv-num">{dv.years}</b></span>
          <span className="tone-success">PAID <b className="cbv-num">{dv.paid}</b></span>
          <span className="tone-danger">MISSED <b className="cbv-num">{dv.missed}</b></span>
          <span>BALANCE <b className="cbv-num">{fmt(dv.totalBalance)}</b></span>
        </>
      }
      footer={['TOTAL', fmt(dv.totalMonthly), String(dv.paid), String(dv.missed), fmt(dv.totalBalance), '']}
      sideTitle="YEAR"
      side={r => r && (
        <>
          <div className="cbt-side-head">{r.yearLabel}</div>
          <div className="cbt-side-code">{r.memberName} · {r.memberNo}</div>
          <dl>
            <div><dt>Status</dt><dd>{r.status}</dd></div>
            <div><dt>Monthly</dt><dd className="cbv-num">{fmt(r.monthlyRdAmount)}</dd></div>
            <div><dt>Installments paid</dt><dd className="cbv-num tone-success">{r.totalInstallmentsPaid}</dd></div>
            <div><dt>Missed</dt><dd className="cbv-num tone-danger">{r.totalMissed}</dd></div>
            <div><dt>Balance</dt><dd className="cbv-num">{fmt(r.currentBalance)}</dd></div>
            <div><dt>Share of balance</dt><dd className="cbv-num">{dv.totalBalance > 0 ? ((r.currentBalance / dv.totalBalance) * 100).toFixed(1) : '0.0'}%</dd></div>
          </dl>
        </>
      )}
    />
  );
};

export default RecurringTerminal;
