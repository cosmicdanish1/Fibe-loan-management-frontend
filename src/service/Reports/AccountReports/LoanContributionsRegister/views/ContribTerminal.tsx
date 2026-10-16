import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import ProTerminal, { type TermCol } from '../../../../../components/reports/views/ProTerminal';
import { fmt, deriveContrib, type ContribData, type ContribRow } from './contribModel';

const money = (n: number | undefined) => ((Number(n) || 0) > 0 ? <span className="cbv-num">{fmt(Number(n))}</span> : <span className="cbv-faint">·</span>);

const COLS: TermCol<ContribRow>[] = [
  { key: 'date',   label: 'DATE',      width: '84px', render: r => (r.transactionDate ? dayjs(r.transactionDate).format('DD-MMM-YY') : '—'), sortValue: r => r.transactionDate || '' },
  { key: 'loan',   label: 'LOAN',      width: '92px', render: r => <span className="cbt-code">{r.loanLabel}</span>, sortValue: r => r.loanLabel },
  { key: 'vchr',   label: 'VOUCHER',   width: 'minmax(110px, .9fr)', render: r => <span className="cbt-code" title={r.voucherNo}>{r.voucherNo}</span>, sortValue: r => r.voucherNo || '' },
  { key: 'type',   label: 'TYPE',      width: '44px', render: r => <span className={String(r.transactionType).toUpperCase() === 'CR' ? 'tone-success' : 'tone-danger'}>{r.transactionType}</span>, sortValue: r => r.transactionType },
  { key: 'prin',   label: 'PRINCIPAL', width: 'minmax(86px, .6fr)', num: true, render: r => money(r.principalAmount), sortValue: r => Number(r.principalAmount) || 0 },
  { key: 'int',    label: 'INTEREST',  width: 'minmax(80px, .6fr)', num: true, render: r => money(r.interestAmount), sortValue: r => Number(r.interestAmount) || 0 },
  { key: 'pen',    label: 'PENAL',     width: 'minmax(64px, .4fr)', num: true, render: r => money(r.penalAmount), sortValue: r => Number(r.penalAmount) || 0 },
  { key: 'amt',    label: 'AMOUNT',    width: 'minmax(92px, .7fr)', num: true, render: r => <span className="cbv-num">{fmt(Number(r.transactionAmount) || 0)}</span>, sortValue: r => Number(r.transactionAmount) || 0 },
];

const ContribTerminal: React.FC<{ data: ContribData }> = ({ data }) => {
  const dv = useMemo(() => deriveContrib(data), [data]);
  return (
    <ProTerminal<ContribRow>
      ariaLabel="Loan transactions"
      rows={dv.rows}
      cols={COLS}
      rowKey={r => r.id}
      searchText={r => `${r.loanLabel} ${r.voucherNo ?? ''} ${r.transactionType} ${r.narration ?? ''}`}
      placeholder="filter loan, voucher or narration  ( / )"
      strip={
        <>
          <span>MEMBER <b>{data.memberNo}</b></span>
          <span>LOANS <b className="cbv-num">{data.loanContributions.length}</b></span>
          <span>TX <b className="cbv-num">{dv.rows.length}</b></span>
          <span className="tone-success">PAID <b className="cbv-num">{fmt(dv.credits)}</b></span>
          {dv.debits > 0 && <span className="tone-danger">DEBITS <b className="cbv-num">{fmt(dv.debits)}</b></span>}
        </>
      }
      footer={['TOTAL', '', '', '', fmt(dv.principal), fmt(dv.interest), fmt(dv.penal), fmt(dv.credits + dv.debits)]}
      sideTitle="TRANSACTION"
      side={r => r && (
        <>
          <div className="cbt-side-head">{r.loanLabel}</div>
          <div className="cbt-side-code">{r.voucherNo}</div>
          <dl>
            <div><dt>Date</dt><dd>{r.transactionDate ? dayjs(r.transactionDate).format('DD-MMM-YYYY') : '—'}</dd></div>
            <div><dt>Type</dt><dd>{r.transactionType}</dd></div>
            <div><dt>Amount</dt><dd className="cbv-num">{fmt(Number(r.transactionAmount) || 0)}</dd></div>
            <div><dt>Principal</dt><dd className="cbv-num">{fmt(Number(r.principalAmount) || 0)}</dd></div>
            <div><dt>Interest</dt><dd className="cbv-num">{fmt(Number(r.interestAmount) || 0)}</dd></div>
            <div><dt>Penalty</dt><dd className="cbv-num">{fmt(Number(r.penalAmount) || 0)}</dd></div>
            <div><dt>Narration</dt><dd style={{ textAlign: 'right' }}>{r.narration || '—'}</dd></div>
          </dl>
        </>
      )}
    />
  );
};

export default ContribTerminal;
