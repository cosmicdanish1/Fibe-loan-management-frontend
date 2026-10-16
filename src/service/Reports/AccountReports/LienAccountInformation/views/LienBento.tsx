import React, { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Lock, Search, TrendingUp, Trophy, Users } from 'lucide-react';
import { Sparkline } from '@/pages/dashboard/DashCharts';
import { RankList, useGrown } from '../../../../../components/reports/views/viewParts';
import { fmt, deriveLien, type LienItem } from './lienModel';

const LienBento: React.FC<{ items: LienItem[] }> = ({ items }) => {
  const dv = useMemo(() => deriveLien(items), [items]);
  const grown = useGrown(items.length);
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? items.filter(r => `${r.memberNo} ${r.memberName} ${r.loanCaseNo}`.toLowerCase().includes(needle)) : items;
  }, [items, q]);

  return (
    <div className="cbv cbv-bento">
      <section className="cbv-tile cbv-hero">
        <header>
          <span className="cbv-icon tone-accent"><Lock size={15} /></span>
          <h3>RD locked as security</h3>
          <span className="cbv-chip tone-muted">{dv.count} loan{dv.count === 1 ? '' : 's'}</span>
        </header>
        <div className="cbv-hero-num cbv-num">₹{fmt(dv.total)}</div>
        <p className="cbv-muted">{dv.members} member{dv.members === 1 ? '' : 's'} · average ₹{fmt(dv.average)} per loan</p>
        {dv.byMonth.length > 1 && (
          <div style={{ marginTop: 'auto' }}>
            <Sparkline values={dv.byMonth.map(m => m.value)} height={64} ariaLabel="Amount newly locked per month" />
            <div className="cbv-bridge-labels" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ textAlign: 'left' }}><span>First lien</span><b>{dayjs(dv.byMonth[0]!.month + '-01').format('MMM YYYY')}</b></div>
              <div style={{ textAlign: 'right' }}><span>Latest</span><b>{dayjs(dv.byMonth[dv.byMonth.length - 1]!.month + '-01').format('MMM YYYY')}</b></div>
            </div>
          </div>
        )}
      </section>

      <section className="cbv-tile">
        <header><span className="cbv-icon tone-accent"><Users size={15} /></span><h3>Members</h3></header>
        <div className="cbv-big cbv-num">{dv.members}</div>
        <dl className="cbv-facts">
          <div><dt>Liened loans</dt><dd className="cbv-num">{dv.count}</dd></div>
          <div><dt>Average lien</dt><dd className="cbv-num">{fmt(dv.average)}</dd></div>
        </dl>
      </section>

      <section className="cbv-tile">
        <header><span className="cbv-icon tone-success"><Trophy size={15} /></span><h3>Largest liens</h3><TrendingUp size={14} style={{ color: 'var(--aw-muted)' }} /></header>
        <RankList rows={dv.largest.map(r => ({ key: r.key, name: `${r.memberName || r.memberNo} · loan ${r.loanCaseNo}`, value: Number(r.lienAmount) || 0 }))} tone="accent" grown={grown} />
      </section>

      <section className="cbv-tile cbv-wide">
        <header>
          <h3>All lien accounts</h3>
          <label className="cbv-search"><Search size={13} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search member or loan case" aria-label="Search lien accounts" /></label>
        </header>
        <div className="cbv-scroll">
          <table className="cbv-table">
            <thead><tr><th>MB No</th><th>Member name</th><th>Loan A/c</th><th className="r">RD locked</th><th>Lien date</th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.key}>
                  <td className="cbv-code">{r.memberNo}</td>
                  <td>{r.memberName}</td>
                  <td className="cbv-code">{r.loanCaseNo}</td>
                  <td className="r cbv-num">{fmt(Number(r.lienAmount) || 0)}</td>
                  <td>{r.lienFromDate ? dayjs(r.lienFromDate).format('DD-MMM-YYYY') : '—'}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={5} className="cbv-muted" style={{ textAlign: 'center', padding: 18 }}>No lien account matches “{q}”.</td></tr>}
            </tbody>
            <tfoot><tr><td colSpan={3}>Total RD locked</td><td className="r cbv-num">{fmt(dv.total)}</td><td /></tr></tfoot>
          </table>
        </div>
      </section>
    </div>
  );
};

export default LienBento;
