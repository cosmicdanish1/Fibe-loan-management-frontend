import React from 'react';
import type { DataTableProps } from '../types/types';

const DataTable: React.FC<DataTableProps> = ({ data }) => {
  const fmt = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);

  const hasAvg = data.some(r => r.avgBalance !== undefined);
  const hasDays = data.some(r => r.days !== undefined);

  return (
    <div className="int-data-table rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="int-thead-row bg-slate-50 border-b border-slate-200">
              {['Sr', 'MB No', 'Name', 'Open Bal', 'Debit', 'Credit', 'Closing Bal',
                ...(hasAvg ? ['Avg Bal'] : []),
                ...(hasDays ? ['Days'] : []),
                'Interest'
              ].map((h, i) => (
                <th
                  key={h}
                  className={`int-th px-3 py-2 fz-caption font-black text-slate-600 uppercase tracking-widest border-r border-slate-200 last:border-r-0 ${
                    i >= 3 ? 'text-right' : 'text-left'
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((r, idx) => (
                <tr
                  key={r.srNo}
                  className={`int-row border-b border-slate-100 hover:bg-indigo-50/30 transition-colors ${
                    idx % 2 === 0 ? 'bg-white even-row' : 'bg-slate-50/50 odd-row'
                  }`}
                >
                  <td className="td-sr px-3 py-1.5 fz-caption text-slate-500 border-r border-slate-100">{r.srNo}</td>
                  <td className="td-mbno px-3 py-1.5 fz-label font-black text-indigo-700 border-r border-slate-100">{r.mbNo}</td>
                  <td className="td-name px-3 py-1.5 fz-label text-slate-700 border-r border-slate-100">{r.name}</td>
                  <td className="td-obal px-3 py-1.5 fz-label text-right text-slate-600 border-r border-slate-100">{fmt(r.openBal)}</td>
                  <td className="td-debit px-3 py-1.5 fz-label text-right font-bold text-red-600 border-r border-slate-100">{fmt(r.debit)}</td>
                  <td className="td-credit px-3 py-1.5 fz-label text-right font-bold text-emerald-600 border-r border-slate-100">{fmt(r.credit)}</td>
                  <td className="td-cbal px-3 py-1.5 fz-label text-right font-bold text-slate-800 border-r border-slate-100">{fmt(r.balance)}</td>
                  {hasAvg && (
                    <td className="td-avg px-3 py-1.5 fz-label text-right text-slate-500 border-r border-slate-100">
                      {r.avgBalance !== undefined ? fmt(r.avgBalance) : '—'}
                    </td>
                  )}
                  {hasDays && (
                    <td className="td-days px-3 py-1.5 fz-label text-right text-slate-500 border-r border-slate-100">
                      {r.days ?? '—'}
                    </td>
                  )}
                  <td className="td-interest px-3 py-1.5 fz-label text-right font-black text-blue-600">{fmt(r.interest)}</td>
                </tr>
              ))
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
