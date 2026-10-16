import React, { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { FolderX, Layers, MessageSquare, Search, TrendingUp, Trophy } from 'lucide-react';
import { Donut, Sparkline } from '@/pages/dashboard/DashCharts';
import { RankList, useGrown } from '../../../../../components/reports/views/viewParts';
import { fmt, fmtShort, deriveClosing, type ClosingItem } from './closingModel';

const TYPE_COLORS = ['var(--aw-accent)', 'var(--aw-warning)', 'var(--aw-success)', 'var(--aw-muted)'];

const ClosingBento: React.FC<{ items: ClosingItem[]; periodLabel: string }> = ({ items, periodLabel }) => {
  const dv = useMemo(() => deriveClosing(items), [items]);
  const grown = useGrown(periodLabel + items.length);
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? items.filter(r => `${r.memberCode} ${r.memberName} ${r.accountNo} ${r.accountType} ${r.description}`.toLowerCase().includes(needle)) : items;
  }, [items, q]);

  const slices = dv.byType.map((t, i) => ({ label: t.name, value: t.value, color: TYPE_COLORS[i % TYPE_COLORS.length]! }));

  return (
    <div className="cbv cbv-bento">
      <section className="cbv-tile cbv-hero">
        <header>
          <span className="cbv-icon tone-accent"><FolderX size={15} /></span>
          <h3>Paid out on closing</h3>
          <span className="cbv-chip tone-muted">{periodLabel}</span>
        </header>
        <div className="cbv-hero-num cbv-num">₹{fmt(dv.total)}</div>
        <p className="cbv-muted">{dv.count} account{dv.count === 1 ? '' : 's'} closed · average ₹{fmt(dv.average)}</p>
        {dv.daily.length > 1 && (
          <div style={{ marginTop: 'auto' }}>
            <Sparkline values={dv.daily.map(d => d.value)} height={64} ariaLabel="Amount paid out per closing day" />
            <div className="cbv-bridge-labels" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ textAlign: 'left' }}><span>First</span><b>{dayjs(dv.daily[0]!.day).format('DD MMM')}</b></div>
              <div style={{ textAlign: 'right' }}><span>Last</span><b>{dayjs(dv.daily[dv.daily.length - 1]!.day).format('DD MMM')}</b></div>
            </div>
          </div>
        )}
      </section>

      <section className="cbv-tile">
        <header><span className="cbv-icon tone-accent"><Layers size={15} /></span><h3>By account type</h3></header>
        <div className="cbv-split">
          <Donut size={104} thickness={13} ariaLabel="Closed amount by account type" slices={slices}
            center={<><b className="cbv-donut-num">{dv.count}</b><span className="cbv-muted">closed</span></>} />
          <div className="cbv-split-body">
            {dv.byType.map((t, i) => (
              <div key={t.key} className="cbv-legend"><i style={{ background: TYPE_COLORS[i % TYPE_COLORS.length] }} /> {t.key || 'Other'} · {t.count}<b className="cbv-num">{fmtShort(t.value)}</b></div>
            ))}
          </div>
        </div>
      </section>

      <section className="cbv-tile">
        <header><span className="cbv-icon tone-accent"><MessageSquare size={15} /></span><h3>Reasons given</h3></header>
        <RankList rows={dv.byReason.map(r => ({ key: r.key, name: `${r.name} · ${r.count}`, value: r.count }))} tone="accent" grown={grown} />
      </section>

      <section className="cbv-tile cbv-wide">
        <header><span className="cbv-icon tone-success"><Trophy size={15} /></span><h3>Largest payouts</h3><TrendingUp size={14} style={{ color: 'var(--aw-muted)' }} /></header>
        <RankList rows={dv.top.map(r => ({ key: r.key, name: `${r.memberName} · ${r.accountType} ${r.accountNo}`, value: r.finalAmount }))} tone="success" grown={grown} />
      </section>

      <section className="cbv-tile cbv-wide">
        <header>
          <h3>All closed accounts</h3>
          <label className="cbv-search"><Search size={13} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search member, account or reason" aria-label="Search closed accounts" /></label>
        </header>
        <div className="cbv-scroll">
          <table className="cbv-table">
            <thead><tr><th>Member</th><th>Name</th><th>Account</th><th>Type</th><th>Closed on</th><th className="r">Final amount</th><th>Reason</th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.key}>
                  <td className="cbv-code">{r.memberCode}</td>
                  <td>{r.memberName}</td>
                  <td className="cbv-code">{r.accountNo}</td>
                  <td><span className="cbv-chip tone-muted">{r.accountType}</span></td>
                  <td>{r.closingDate ? dayjs(r.closingDate).format('DD-MMM-YY') : '—'}</td>
                  <td className="r cbv-num">{fmt(r.finalAmount)}</td>
                  <td className="cbv-muted">{r.description}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={7} className="cbv-muted" style={{ textAlign: 'center', padding: 18 }}>No account matches “{q}”.</td></tr>}
            </tbody>
            <tfoot><tr><td colSpan={5}>Total · {dv.count} accounts</td><td className="r cbv-num">{fmt(dv.total)}</td><td /></tr></tfoot>
          </table>
        </div>
      </section>
    </div>
  );
};

export default ClosingBento;
