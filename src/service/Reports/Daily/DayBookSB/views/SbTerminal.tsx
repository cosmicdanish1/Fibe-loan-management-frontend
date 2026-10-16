import React from 'react';
import ProTerminal, { type TermCol } from '../../../../../components/reports/views/ProTerminal';
import { fmt, type SBData, type SBEntry } from './sbModel';

const money = (v: number, tone: 'success' | 'danger') => (v > 0 ? <span className={`cbv-num tone-${tone}`}>{fmt(v)}</span> : <span className="cbv-faint">·</span>);

const COLS: TermCol<SBEntry>[] = [
  { key: 'no',   label: '#',          width: '44px', render: e => <span className="cbt-code">{e.srNo}</span>, sortValue: e => e.srNo },
  { key: 'acc',  label: 'A/C NO.',    width: '96px', render: e => <span className="cbt-code">{e.accNo}</span>, sortValue: e => e.accNo },
  { key: 'name', label: 'A/C NAME',   width: 'minmax(130px, 1.3fr)', render: e => <span title={e.acName}>{e.acName}</span>, sortValue: e => e.acName },
  { key: 'dc',   label: 'DEP CASH',   width: 'minmax(86px, .7fr)', num: true, render: e => money(e.depositCash, 'success'), sortValue: e => e.depositCash },
  { key: 'dt',   label: 'DEP XFER',   width: 'minmax(86px, .7fr)', num: true, render: e => money(e.depositTransfer, 'success'), sortValue: e => e.depositTransfer },
  { key: 'wc',   label: 'WD CASH',    width: 'minmax(86px, .7fr)', num: true, render: e => money(e.withdrawalCash, 'danger'), sortValue: e => e.withdrawalCash },
  { key: 'wt',   label: 'WD XFER',    width: 'minmax(86px, .7fr)', num: true, render: e => money(e.withdrawalTransfer, 'danger'), sortValue: e => e.withdrawalTransfer },
];

const SbTerminal: React.FC<{ data: SBData; bookLabel: string }> = ({ data, bookLabel }) => (
  <ProTerminal<SBEntry>
    ariaLabel={`Day book ${bookLabel} transactions`}
    rows={data.entries}
    cols={COLS}
    rowKey={e => String(e.srNo)}
    searchText={e => `${e.accNo} ${e.acName}`}
    placeholder="filter account or name  ( / )"
    strip={
      <>
        <span>OPEN <b className="cbv-num">{fmt(data.openingBalance)}</b></span>
        <span className="tone-success">DEPOSIT <b className="cbv-num">{fmt(data.totalDeposit)}</b></span>
        <span className="tone-danger">WITHDRAWAL <b className="cbv-num">{fmt(data.totalWithdrawal)}</b></span>
        <span>CLOSE <b className="cbv-num">{fmt(data.closingBalance)}</b></span>
        <span>{data.totalTransactions} TX</span>
      </>
    }
    footer={['TOTAL', '', '', fmt(data.totalDepositCash), fmt(data.totalDepositTransfer), fmt(data.totalWithdrawalCash), fmt(data.totalWithdrawalTransfer)]}
    sideTitle="TRANSACTION"
    side={e => e && (
      <>
        <div className="cbt-side-head">{e.acName}</div>
        <div className="cbt-side-code">{e.accNo}</div>
        <dl>
          <div><dt>Deposit cash</dt><dd className="cbv-num tone-success">{fmt(e.depositCash)}</dd></div>
          <div><dt>Deposit transfer</dt><dd className="cbv-num tone-success">{fmt(e.depositTransfer)}</dd></div>
          <div><dt>Withdrawal cash</dt><dd className="cbv-num tone-danger">{fmt(e.withdrawalCash)}</dd></div>
          <div><dt>Withdrawal transfer</dt><dd className="cbv-num tone-danger">{fmt(e.withdrawalTransfer)}</dd></div>
        </dl>
      </>
    )}
  />
);

export default SbTerminal;
