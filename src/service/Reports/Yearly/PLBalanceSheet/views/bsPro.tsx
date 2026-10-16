import React, { useMemo } from 'react';
import { GenericBento, GenericEditorial, GenericTerminal, type ProSpec } from '../../../../../components/reports/views/GenericPro';
import { fmt, fmtShort } from '../../../../../components/reports/views/format';

export interface BsItem { headCode: string; headName: string; openingBalance: number; debit: number; credit: number; closingBalance: number }
export interface BsData { liabilities: BsItem[]; assets: BsItem[]; totals: { totalLiabilities: number; totalAssets: number; difference: number } }
export interface BsRow extends BsItem { side: 'Liability' | 'Asset' }

const num = (n: unknown) => Number(n) || 0;

export const useBsSpec = (data: BsData, asOn: string): ProSpec<BsRow> =>
  useMemo<ProSpec<BsRow>>(() => {
    const rows: BsRow[] = [
      ...(data.liabilities ?? []).map(i => ({ ...i, side: 'Liability' as const })),
      ...(data.assets ?? []).map(i => ({ ...i, side: 'Asset' as const })),
    ];
    const tl = num(data.totals?.totalLiabilities);
    const ta = num(data.totals?.totalAssets);
    const diff = num(data.totals?.difference);
    const top = (side: 'Liability' | 'Asset') => rows.filter(r => r.side === side).sort((a, b) => Math.abs(num(b.closingBalance)) - Math.abs(num(a.closingBalance))).slice(0, 6)
      .map(r => ({ key: r.headCode, name: `${r.headName} (${r.headCode})`, value: Math.abs(num(r.closingBalance)) }));
    return {
      ariaLabel: 'Balance sheet',
      rows,
      rowKey: (r, i) => `${r.side}-${r.headCode}-${i}`,
      cols: [
        { key: 'side', label: 'SIDE', width: '74px', render: r => <span className={r.side === 'Asset' ? 'tone-success' : 'tone-danger'}>{r.side}</span>, sortValue: r => r.side },
        { key: 'code', label: 'CODE', width: '84px', render: r => <span className="cbt-code">{r.headCode}</span>, sortValue: r => r.headCode },
        { key: 'head', label: 'HEAD', width: 'minmax(160px, 1.8fr)', render: r => <span title={r.headName}>{r.headName}</span>, sortValue: r => r.headName },
        { key: 'cl', label: 'CLOSING', width: 'minmax(120px, 1fr)', num: true, render: r => <span className="cbv-num">{fmt(Math.abs(num(r.closingBalance)))}</span>, sortValue: r => Math.abs(num(r.closingBalance)) },
      ],
      searchText: r => `${r.side} ${r.headCode} ${r.headName}`,
      kpis: [
        { label: `Assets · as on ${asOn}`, value: `₹${fmtShort(ta)}`, tone: 'success' },
        { label: 'Liabilities', value: fmt(tl), tone: 'danger' },
        { label: 'Difference', value: fmt(diff), tone: Math.abs(diff) < 0.01 ? 'muted' : 'warning' },
        { label: 'Heads', value: String(rows.length), tone: 'muted' },
      ],
      heroNote: `Total assets ₹${fmt(ta)} · total liabilities ₹${fmt(tl)}`,
      ranks: [
        { title: 'Largest liabilities', tone: 'danger', rows: top('Liability') },
        { title: 'Largest assets', tone: 'success', rows: top('Asset') },
      ],
      footer: ['', '', 'LIABILITIES / ASSETS', `${fmt(tl)} / ${fmt(ta)}`],
      tableTitle: 'All heads',
      bentoLimit: 300,
    };
  }, [data, asOn]);

export const ProBento = GenericBento;
export const ProTerm = GenericTerminal;
export const ProEd: React.FC<{ spec: ProSpec<BsRow>; subtitle: string }> = ({ spec, subtitle }) => (
  <GenericEditorial spec={spec} title="Balance Sheet" subtitle={subtitle} />
);
