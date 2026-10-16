import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import ProTerminal, { type TermCol } from '../../../../../components/reports/views/ProTerminal';
import { fmt, deriveClosing, type ClosingItem } from './closingModel';

const COLS: TermCol<ClosingItem>[] = [
  { key: 'member', label: 'MEMBER',  width: '86px', render: r => <span className="cbt-code">{r.memberCode}</span>, sortValue: r => r.memberCode },
  { key: 'name',   label: 'NAME',    width: 'minmax(130px, 1.2fr)', render: r => <span title={r.memberName}>{r.memberName}</span>, sortValue: r => r.memberName },
  { key: 'acc',    label: 'ACCOUNT', width: '90px', render: r => <span className="cbt-code">{r.accountNo}</span>, sortValue: r => r.accountNo },
  { key: 'type',   label: 'TYPE',    width: '48px', render: r => r.accountType, sortValue: r => r.accountType },
  { key: 'date',   label: 'CLOSED',  width: '84px', render: r => (r.closingDate ? dayjs(r.closingDate).format('DD-MMM-YY') : '—'), sortValue: r => r.closingDate || '' },
  { key: 'amt',    label: 'FINAL AMT', width: 'minmax(104px, .7fr)', num: true, render: r => <span className="cbv-num tone-success">{fmt(r.finalAmount)}</span>, sortValue: r => r.finalAmount },
  { key: 'why',    label: 'REASON',  width: 'minmax(110px, 1fr)', render: r => <span title={r.description}>{r.description}</span>, sortValue: r => r.description },
];

const ClosingTerminal: React.FC<{ items: ClosingItem[]; periodLabel: string }> = ({ items, periodLabel }) => {
  const dv = useMemo(() => deriveClosing(items), [items]);
  return (
    <ProTerminal<ClosingItem>
      ariaLabel="Closed accounts"
      rows={items}
      cols={COLS}
      rowKey={r => r.key}
      searchText={r => `${r.memberCode} ${r.memberName} ${r.accountNo} ${r.accountType} ${r.description}`}
      placeholder="filter member, account or reason  ( / )"
      strip={
        <>
          <span>PERIOD <b>{periodLabel}</b></span>
          <span>ACCOUNTS <b className="cbv-num">{dv.count}</b></span>
          <span className="tone-success">PAID OUT <b className="cbv-num">{fmt(dv.total)}</b></span>
          <span>AVERAGE <b className="cbv-num">{fmt(dv.average)}</b></span>
        </>
      }
      footer={['TOTAL', '', '', '', '', fmt(dv.total), '']}
      sideTitle="ACCOUNT"
      side={r => r && (
        <>
          <div className="cbt-side-head">{r.memberName}</div>
          <div className="cbt-side-code">{r.memberCode}</div>
          <dl>
            <div><dt>Account</dt><dd>{r.accountType} {r.accountNo}</dd></div>
            <div><dt>Closed on</dt><dd>{r.closingDate ? dayjs(r.closingDate).format('DD-MMM-YYYY') : '—'}</dd></div>
            <div><dt>Final amount</dt><dd className="cbv-num tone-success">{fmt(r.finalAmount)}</dd></div>
            <div><dt>Share of total</dt><dd className="cbv-num">{dv.total > 0 ? ((r.finalAmount / dv.total) * 100).toFixed(1) : '0.0'}%</dd></div>
            <div><dt>Reason</dt><dd style={{ textAlign: 'right' }}>{r.description || '—'}</dd></div>
          </dl>
        </>
      )}
    />
  );
};

export default ClosingTerminal;
