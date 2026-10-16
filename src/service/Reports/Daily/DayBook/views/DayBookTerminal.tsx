import React, { useMemo } from 'react';
import ProTerminal, { type TermCol } from '../../../../../components/reports/views/ProTerminal';
import { fmt, deriveDayBook, type DayBookData, type DayRow } from './dayBookModel';

const COLS: TermCol<DayRow>[] = [
  { key: 'side',    label: 'TYPE',    width: '52px',  render: r => <span className={r.side === 'Receipt' ? 'tone-success' : 'tone-danger'}>{r.side === 'Receipt' ? 'RCPT' : 'PAY'}</span>, sortValue: r => r.side },
  { key: 'head',    label: 'HEAD',    width: 'minmax(130px, 1.2fr)', render: r => <span title={`${r.headCode} ${r.headName}`}>{r.headCode} {r.headName}</span>, sortValue: r => r.headName },
  { key: 'mbNo',    label: 'MEMBER',  width: '78px',  render: r => <span className="cbt-code">{r.mbNo}</span>, sortValue: r => r.mbNo },
  { key: 'name',    label: 'NAME',    width: 'minmax(90px, 1fr)', render: r => <span title={r.memberName}>{r.memberName}</span>, sortValue: r => r.memberName },
  { key: 'voucher', label: 'VOUCHER', width: '70px',  render: r => <span className="cbt-code">{r.voucherNo}</span>, sortValue: r => r.voucherNo },
  { key: 'user',    label: 'USER',    width: '70px',  render: r => <span className="cbt-code">{r.username}</span>, sortValue: r => r.username },
  { key: 'amount',  label: 'AMOUNT',  width: 'minmax(104px, .7fr)', num: true, render: r => <span className={`cbv-num ${r.side === 'Receipt' ? 'tone-success' : 'tone-danger'}`}>{fmt(r.amount)}</span>, sortValue: r => r.amount },
];

const DayBookTerminal: React.FC<{ data: DayBookData }> = ({ data }) => {
  const dv = useMemo(() => deriveDayBook(data), [data]);
  return (
    <ProTerminal<DayRow>
      ariaLabel="Day book entries"
      rows={dv.rows}
      cols={COLS}
      rowKey={r => r.id}
      searchText={r => `${r.side} ${r.headCode} ${r.headName} ${r.mbNo} ${r.memberName} ${r.voucherNo} ${r.username}`}
      placeholder="filter head, member, voucher or user  ( / )"
      strip={
        <>
          <span>OPEN <b className="cbv-num">{fmt(data.openingBalance)}</b></span>
          <span className="tone-success">RCPT <b className="cbv-num">{fmt(data.totalReceipts)}</b></span>
          <span className="tone-danger">PAY <b className="cbv-num">{fmt(data.totalPayments)}</b></span>
          <span>CLOSE <b className="cbv-num">{fmt(data.closingBalance)}</b></span>
          <span>{data.totalTransactions} ENTRIES</span>
          <span className={dv.balanced ? 'tone-success' : 'tone-warning'}>{dv.balanced ? '✓ BALANCED' : `Δ ${fmt(dv.difference)}`}</span>
        </>
      }
      footer={['TOTAL', '', '', '', '', 'NET', `${data.totalReceipts - data.totalPayments >= 0 ? '+' : '-'}${fmt(Math.abs(data.totalReceipts - data.totalPayments))}`]}
      sideTitle="ENTRY"
      side={r => r && (
        <>
          <div className="cbt-side-head">{r.memberName}</div>
          <div className="cbt-side-code">{r.mbNo}</div>
          <dl>
            <div><dt>Type</dt><dd className={r.side === 'Receipt' ? 'tone-success' : 'tone-danger'}>{r.side}</dd></div>
            <div><dt>Head</dt><dd style={{ textAlign: 'right' }}>{r.headCode} {r.headName}</dd></div>
            <div><dt>Voucher</dt><dd>{r.voucherNo}</dd></div>
            <div><dt>User</dt><dd>{r.username}</dd></div>
            <div><dt>Amount</dt><dd className={`cbv-num ${r.side === 'Receipt' ? 'tone-success' : 'tone-danger'}`}>{fmt(r.amount)}</dd></div>
            <div><dt>Voucher legs</dt><dd className="cbv-num">{dv.rows.filter(x => x.voucherNo === r.voucherNo).length}</dd></div>
          </dl>
        </>
      )}
    />
  );
};

export default DayBookTerminal;
