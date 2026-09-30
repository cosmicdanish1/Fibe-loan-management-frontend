import React from 'react';
import type { DataTableProps } from '../types/types';

const DataTable: React.FC<DataTableProps> = ({ data }) => {
  const fmt = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);

  const hasAvg = data.some(r => r.avgBalance !== undefined);
  const hasDays = data.some(r => r.days !== undefined);

  return (
    <div className="aw-table-wrap" style={{ maxHeight: '52vh' }}>
      <table className="aw-table">
        <thead>
          <tr>
            {['Sr', 'MB No', 'Name', 'Open Bal', 'Debit', 'Credit', 'Closing Bal',
              ...(hasAvg ? ['Avg Bal'] : []),
              ...(hasDays ? ['Days'] : []),
              'Interest'
            ].map((h, i) => (
              <th key={h} className={i >= 3 ? 'is-right' : undefined}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.srNo}>
              <td className="is-muted">{r.srNo}</td>
              <td className="is-accent">{r.mbNo}</td>
              <td>{r.name}</td>
              <td className="is-right is-muted">{fmt(r.openBal)}</td>
              <td className="is-right is-danger">{fmt(r.debit)}</td>
              <td className="is-right is-success">{fmt(r.credit)}</td>
              <td className="is-right">{fmt(r.balance)}</td>
              {hasAvg && <td className="is-right is-muted">{r.avgBalance !== undefined ? fmt(r.avgBalance) : '—'}</td>}
              {hasDays && <td className="is-right is-muted">{r.days ?? '—'}</td>}
              <td className="is-right is-info">{fmt(r.interest)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
