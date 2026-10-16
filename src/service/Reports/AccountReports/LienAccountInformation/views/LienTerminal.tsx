import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import ProTerminal, { type TermCol } from '../../../../../components/reports/views/ProTerminal';
import { fmt, deriveLien, type LienItem } from './lienModel';

const COLS: TermCol<LienItem>[] = [
  { key: 'mb',   label: 'MB NO',       width: '90px', render: r => <span className="cbt-code">{r.memberNo}</span>, sortValue: r => r.memberNo },
  { key: 'name', label: 'MEMBER NAME', width: 'minmax(150px, 1.4fr)', render: r => <span title={r.memberName}>{r.memberName}</span>, sortValue: r => r.memberName },
  { key: 'loan', label: 'LOAN A/C',    width: '90px', render: r => <span className="cbt-code">{r.loanCaseNo}</span>, sortValue: r => r.loanCaseNo },
  { key: 'amt',  label: 'RD LOCKED',   width: 'minmax(110px, .8fr)', num: true, render: r => <span className="cbv-num">{fmt(Number(r.lienAmount) || 0)}</span>, sortValue: r => Number(r.lienAmount) || 0 },
  { key: 'date', label: 'LIEN DATE',   width: '100px', render: r => (r.lienFromDate ? dayjs(r.lienFromDate).format('DD-MMM-YYYY') : '—'), sortValue: r => r.lienFromDate || '' },
];

const LienTerminal: React.FC<{ items: LienItem[] }> = ({ items }) => {
  const dv = useMemo(() => deriveLien(items), [items]);
  return (
    <ProTerminal<LienItem>
      ariaLabel="Lien accounts"
      rows={items}
      cols={COLS}
      rowKey={r => r.key}
      searchText={r => `${r.memberNo} ${r.memberName} ${r.loanCaseNo}`}
      placeholder="filter member or loan case  ( / )"
      strip={
        <>
          <span>LOANS <b className="cbv-num">{dv.count}</b></span>
          <span>MEMBERS <b className="cbv-num">{dv.members}</b></span>
          <span className="tone-success">RD LOCKED <b className="cbv-num">{fmt(dv.total)}</b></span>
          <span>AVERAGE <b className="cbv-num">{fmt(dv.average)}</b></span>
        </>
      }
      footer={['TOTAL', '', '', fmt(dv.total), '']}
      sideTitle="LIEN"
      side={r => r && (
        <>
          <div className="cbt-side-head">{r.memberName}</div>
          <div className="cbt-side-code">{r.memberNo}</div>
          <dl>
            <div><dt>Loan account</dt><dd>{r.loanCaseNo}</dd></div>
            <div><dt>RD locked</dt><dd className="cbv-num">{fmt(Number(r.lienAmount) || 0)}</dd></div>
            <div><dt>Lien from</dt><dd>{r.lienFromDate ? dayjs(r.lienFromDate).format('DD-MMM-YYYY') : '—'}</dd></div>
            <div><dt>Share of total</dt><dd className="cbv-num">{dv.total > 0 ? (((Number(r.lienAmount) || 0) / dv.total) * 100).toFixed(1) : '0.0'}%</dd></div>
          </dl>
        </>
      )}
    />
  );
};

export default LienTerminal;
