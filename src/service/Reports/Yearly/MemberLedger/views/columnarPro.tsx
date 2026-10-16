import { useMemo } from 'react';
import dayjs from 'dayjs';
import type { ProSpec } from '../../../../../components/reports/views/GenericPro';
import { fmt, fmtShort } from '../../../../../components/reports/views/format';

export interface ColCell { dr: number; cr: number; bal: number | null }
export interface ColRow { date: string; share: ColCell; ltl: ColCell; emer: ColCell; cd: ColCell }
export interface ColBalances { share: number; ltl: number; emer: number; cd: number }
export interface ColLedger { memberNumber: string; memberName: string; fromDate: string; toDate: string; opening: ColBalances; closing: ColBalances; rows: ColRow[] }

const num = (n: unknown) => Number(n) || 0;
const bal = (c: ColCell) => (c.bal === null || c.bal === undefined ? '' : fmt(num(c.bal)));
const move = (c: ColCell) => num(c.cr) - num(c.dr);

export const useColumnarSpec = (rep: ColLedger | null): ProSpec<ColRow> =>
  useMemo<ProSpec<ColRow>>(() => {
    const rows = rep?.rows ?? [];
    const op = rep?.opening ?? { share: 0, ltl: 0, emer: 0, cd: 0 };
    const cl = rep?.closing ?? { share: 0, ltl: 0, emer: 0, cd: 0 };
    const cell = (label: string, key: 'share' | 'ltl' | 'emer' | 'cd', tone: string) => ({
      key, label, width: 'minmax(104px, 1fr)', num: true,
      render: (r: ColRow) => (r[key].bal === null ? <span className="cbv-faint">·</span> : <span className={`cbv-num ${tone}`}>{bal(r[key])}</span>),
      sortValue: (r: ColRow) => num(r[key].bal),
    });
    return {
      ariaLabel: 'Member detail ledger',
      rows,
      rowKey: (r, i) => `${r.date}-${i}`,
      cols: [
        { key: 'date', label: 'DATE', width: '92px', render: r => dayjs(r.date).format('DD-MM-YYYY'), sortValue: r => r.date },
        cell('SHARE BAL', 'share', 'tone-success'),
        cell('LONG TERM LOAN BAL', 'ltl', 'tone-danger'),
        cell('EMERGENCY LOAN BAL', 'emer', 'tone-danger'),
        cell('COMP. DEPOSIT BAL', 'cd', 'tone-success'),
      ],
      searchText: r => dayjs(r.date).format('DD-MM-YYYY'),
      kpis: [
        { label: `Closing · ${rep?.memberNumber ?? ''} ${rep?.memberName ?? ''}`.trim(), value: `₹${fmtShort(num(cl.share) + num(cl.cd))}`, tone: 'accent' },
        { label: 'Share', value: fmt(num(cl.share)), tone: 'success' },
        { label: 'Compulsory deposit', value: fmt(num(cl.cd)), tone: 'success' },
        { label: 'Long term loan', value: fmt(num(cl.ltl)), tone: 'danger' },
        { label: 'Emergency loan', value: fmt(num(cl.emer)), tone: 'danger' },
      ],
      heroNote: `Share + compulsory deposit at close; opening share ${fmtShort(num(op.share))}, CD ${fmtShort(num(op.cd))}`,
      ranks: [
        { title: 'Net movement in the period', tone: 'accent', rows: [
          { key: 'share', name: 'Share', value: Math.abs(num(cl.share) - num(op.share)) },
          { key: 'cd', name: 'Compulsory deposit', value: Math.abs(num(cl.cd) - num(op.cd)) },
          { key: 'ltl', name: 'Long term loan', value: Math.abs(num(cl.ltl) - num(op.ltl)) },
          { key: 'emer', name: 'Emergency loan', value: Math.abs(num(cl.emer) - num(op.emer)) },
        ].filter(x => x.value > 0) },
      ],
      footer: ['CLOSING', fmt(num(cl.share)), fmt(num(cl.ltl)), fmt(num(cl.emer)), fmt(num(cl.cd))],
      tableTitle: 'Every dated entry',
      bentoLimit: 200,
      side: r => r && (
        <>
          <div className="cbt-side-head">{dayjs(r.date).format('DD-MMM-YYYY')}</div>
          <dl>
            {([['Share', r.share], ['Long term loan', r.ltl], ['Emergency loan', r.emer], ['Comp. deposit', r.cd]] as [string, ColCell][]).map(([n, c]) => (
              <div key={n}><dt>{n}</dt><dd className="cbv-num" style={{ textAlign: 'right' }}>{c.bal === null ? '—' : `${bal(c)} (${move(c) >= 0 ? '+' : '−'}${fmt(Math.abs(move(c)))})`}</dd></div>
            ))}
          </dl>
        </>
      ),
      sideTitle: 'ENTRY',
    };
  }, [rep]);
