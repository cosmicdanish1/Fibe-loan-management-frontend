import { useMemo } from 'react';
import dayjs from 'dayjs';
import type { ProSpec } from '../../../../../../components/reports/views/GenericPro';
import { fmt, fmtShort } from '../../../../../../components/reports/views/format';

export interface VoterRow {
  memberNo: string; memberName: string; designation: string; officeName: string; officeNo: string;
  basicPay: number; membershipDate: string; isActive: boolean; shareBalance: number;
}
const num = (n: unknown) => Number(n) || 0;

export const useVotersSpec = (rows: VoterRow[], listLabel: string): ProSpec<VoterRow> =>
  useMemo<ProSpec<VoterRow>>(() => {
    const share = rows.reduce((s, r) => s + num(r.shareBalance), 0);
    const pay = rows.reduce((s, r) => s + num(r.basicPay), 0);
    const active = rows.filter(r => r.isActive).length;
    const byOffice = new Map<string, number>();
    rows.forEach(r => { const k = r.officeName || 'No office'; byOffice.set(k, (byOffice.get(k) ?? 0) + num(r.shareBalance)); });
    return {
      ariaLabel: 'Members',
      rows,
      rowKey: (r, i) => `${r.memberNo}-${i}`,
      cols: [
        { key: 'mb', label: 'MEMBER', width: '90px', render: r => <span className="cbt-code">{r.memberNo}</span>, sortValue: r => r.memberNo },
        { key: 'nm', label: 'NAME', width: 'minmax(150px, 1.5fr)', render: r => <span title={r.memberName}>{r.memberName}</span>, sortValue: r => r.memberName },
        { key: 'ds', label: 'DESIGNATION', width: 'minmax(100px, 1fr)', render: r => <span title={r.designation}>{r.designation || '—'}</span>, sortValue: r => r.designation || '' },
        { key: 'of', label: 'OFFICE', width: 'minmax(90px, .9fr)', render: r => <span title={r.officeName}>{r.officeName || '—'}</span>, sortValue: r => r.officeName || '' },
        { key: 'bp', label: 'BASIC PAY', width: 'minmax(90px, .8fr)', num: true, render: r => <span className="cbv-num">{fmt(num(r.basicPay))}</span>, sortValue: r => num(r.basicPay) },
        { key: 'sh', label: 'SHARE', width: 'minmax(90px, .8fr)', num: true, render: r => <span className="cbv-num tone-success">{fmt(num(r.shareBalance))}</span>, sortValue: r => num(r.shareBalance) },
        { key: 'md', label: 'JOINED', width: '88px', render: r => (r.membershipDate ? dayjs(r.membershipDate).format('DD-MM-YYYY') : '—'), sortValue: r => r.membershipDate || '' },
        { key: 'st', label: 'STATUS', width: '64px', render: r => (r.isActive ? 'Active' : 'Closed'), sortValue: r => (r.isActive ? 1 : 0) },
      ],
      searchText: r => `${r.memberNo} ${r.memberName} ${r.designation} ${r.officeName}`,
      kpis: [
        { label: `Members · ${listLabel}`, value: String(rows.length), tone: 'accent' },
        { label: 'Active', value: String(active), tone: 'success' },
        { label: 'Share balance', value: fmt(share), tone: 'muted' },
        { label: 'Basic pay', value: fmt(pay), tone: 'muted' },
      ],
      heroNote: `Share capital ₹${fmtShort(share)} across ${rows.length} members`,
      ranks: [
        { title: 'Share balance by office', tone: 'accent', rows: [...byOffice.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({ key: k, name: k, value: v })) },
      ],
      footer: ['TOTAL', String(rows.length), '', '', fmt(pay), fmt(share), '', ''],
      tableTitle: 'All members',
      bentoLimit: 150,
      side: r => r && (
        <>
          <div className="cbt-side-head">{r.memberName}</div>
          <div className="cbt-side-code">{r.memberNo}</div>
          <dl>
            <div><dt>Designation</dt><dd>{r.designation || '—'}</dd></div>
            <div><dt>Office</dt><dd>{r.officeName || '—'}</dd></div>
            <div><dt>Basic pay</dt><dd className="cbv-num">{fmt(num(r.basicPay))}</dd></div>
            <div><dt>Share balance</dt><dd className="cbv-num tone-success">{fmt(num(r.shareBalance))}</dd></div>
            <div><dt>Joined</dt><dd>{r.membershipDate ? dayjs(r.membershipDate).format('DD-MMM-YYYY') : '—'}</dd></div>
            <div><dt>Status</dt><dd>{r.isActive ? 'Active' : 'Closed'}</dd></div>
          </dl>
        </>
      ),
      sideTitle: 'MEMBER',
    };
  }, [rows, listLabel]);
