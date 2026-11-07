// page/GroupInsurance.tsx
// Yearly Group Insurance (ES-98). Enter the lump sum for the financial year; it is split over the active members,
// late joiners pay only for the months left (joining month counted), each amount is rounded up, and the posting
// deducts it from every charged member's RD in one Journal voucher. RD may go negative: it is recovered at the
// member's next loan and from the first deposits of the new financial year.

import React, { useEffect, useState } from 'react';
import {
  X, RefreshCw, Calculator, Search, ShieldCheck, AlertCircle, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, History, Send,
} from 'lucide-react';
import {
  useGroupInsurance, PAGE_SIZE,
  type ChargeRow, type RowFilter, type RunInfo,
} from '../hook/useGroupInsurance';
import { useTranslation } from 'react-i18next';

const closeWindow = () => {
  const api = (window as any).electronAPI;
  if (api?.ipcRenderer?.send) api.ipcRenderer.send('window-close');
  else window.close();
};

const inr = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const fmtDate = (d?: string | null) => {
  if (!d) return '—';
  const [y, m, day] = String(d).slice(0, 10).split('-');
  return y && m && day ? `${day}-${m}-${y}` : String(d);
};

type TabId = 'run' | 'history';

const GroupInsurance: React.FC = () => {
  const { t } = useTranslation();
  const g = useGroupInsurance();
  const [tab, setTab] = useState<TabId>('run');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [result, setResult] = useState<{ voucherNo: string; members: number; total: number } | null>(null);
  const [postError, setPostError] = useState('');

  // history tab
  const [openRun, setOpenRun] = useState<RunInfo | null>(null);
  const [runRows, setRunRows] = useState<ChargeRow[]>([]);
  const [runTotal, setRunTotal] = useState(0);
  const [runPage, setRunPage] = useState(0);
  const [runSearch, setRunSearch] = useState('');
  const [runLoading, setRunLoading] = useState(false);

  const year = g.years.find(y => y.yearcode === g.yearcode) || null;
  const posted = year?.run && year.run.status === 'POSTED' ? year.run : null;
  const p = g.preview;
  const s = p?.summary;

  const fetchRun = async (run: RunInfo, page: number, q: string) => {
    setRunLoading(true);
    const d = await g.loadRun(run.id, page, q);
    setRunLoading(false);
    if (d) { setRunRows(d.rows); setRunTotal(d.total); }
  };
  const showRun = (run: RunInfo) => { setOpenRun(run); setRunPage(0); setRunSearch(''); fetchRun(run, 0, ''); };

  useEffect(() => { setTyped(''); }, [confirmOpen]);

  const doPost = async () => {
    setPostError('');
    const r = await g.post();
    if (!r.ok) { setPostError(r.error); return; }
    setConfirmOpen(false);
    setResult({ voucherNo: r.voucherNo, members: r.members, total: r.total });
  };

  const tableRows = (rows: ChargeRow[], showJoin: boolean) => (
    <div className="aw-table-wrap">
      <table className="aw-table" style={{ minWidth: 860 }}>
        <thead>
          <tr>
            <th>{t('Member No')}</th><th>{t('Name')}</th>{showJoin && <th>{t('Joined')}</th>}<th className="gi-num">{t('Months')}</th>
            <th className="gi-num">{t('Charge')}</th><th className="gi-num">{t('RD before')}</th><th className="gi-num">{t('RD after')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.memberNo}>
              <td className="is-accent">{r.memberNo}</td>
              <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.name}>{r.name || '—'}</td>
              {showJoin && <td className="is-muted">{fmtDate(r.joinDate)}</td>}
              <td className="gi-num" style={r.months < 12 ? { color: 'var(--aw-accent)', fontWeight: 600 } : undefined}>{r.months}</td>
              <td className="gi-num"><strong>{inr(r.charge)}</strong></td>
              <td className="gi-num">{inr(r.rdBefore)}</td>
              <td className="gi-num" style={r.rdAfter < 0 ? { color: 'var(--aw-danger, #d64545)', fontWeight: 600 } : undefined}>{inr(r.rdAfter)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const pager = (page: number, total: number, go: (n: number) => void, busy: boolean) => {
    const last = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);
    if (total <= PAGE_SIZE) return null;
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
        <button type="button" className="aw-btn aw-btn-ghost" disabled={page === 0 || busy} onClick={() => go(page - 1)}><ChevronLeft size={13} /> {t('Prev')}</button>
        <span className="is-muted" style={{ fontSize: 12 }}>{t('{{1}} {{2}} of {{3}}', { 1: t('Page'), 2: page + 1, 3: last + 1 })}</span>
        <button type="button" className="aw-btn aw-btn-ghost" disabled={page >= last || busy} onClick={() => go(page + 1)}>{t('Next')} <ChevronRight size={13} /></button>
      </div>
    );
  };

  const filters: { id: RowFilter; label: string }[] = [
    { id: 'all', label: t('All members') },
    { id: 'partial', label: t('Part-year joiners{{1}}', { 1: s ? ` (${s.partialYear})` : '' }) },
    { id: 'negative', label: t('RD goes negative{{1}}', { 1: s ? ` (${s.goesNegative})` : '' }) },
  ];

  return (
    <div className="app-window">
      <style>{`
        .gi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; align-items: end; }
        .gi-field label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; }
        .gi-tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; margin: 14px 0; }
        .gi-tile { background: var(--aw-surface); border: 1px solid var(--aw-border); border-radius: var(--aw-radius); padding: 11px 14px; }
        .gi-tile strong { display: block; font-size: 12px; color: var(--aw-muted); font-weight: 600; }
        .gi-tile b { display: block; font-size: 22px; line-height: 1.2; font-variant-numeric: tabular-nums; }
        .gi-tile span { display: block; font-size: 11.5px; color: var(--aw-muted); }
        .gi-num { text-align: right; font-variant-numeric: tabular-nums; }
        .gi-warn { margin: 6px 0; padding: 9px 12px; border-radius: 8px; font-size: 13px; background: color-mix(in srgb, var(--aw-warning, #c98a00) 14%, transparent); }
        .gi-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 16px; }
        .gi-dialog { width: min(540px, 100%); background: var(--aw-surface); border: 1px solid var(--aw-border-strong); border-radius: var(--aw-radius); box-shadow: var(--aw-shadow-pop); padding: 18px; }
        .gi-dialog h2 { margin: 0 0 6px; font-size: 16px; }
        .gi-dialog ul { margin: 8px 0; padding-left: 18px; font-size: 13px; }
        .gi-check { display: flex; gap: 8px; align-items: flex-start; font-size: 13px; }
      `}</style>

      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">{t('Group Insurance')}</h1>
          <p className="aw-desc" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={12} /> {t('Yearly lump sum split over active members and deducted from RD at year end')}
          </p>
        </div>
        <div className="aw-actions">
          <button type="button" onClick={g.reload} disabled={g.loadingCtx} className="aw-icon-btn" aria-label={t('Refresh')} data-tip={t('Refresh')} data-tip-pos="bottom-end">
            <RefreshCw size={14} className={g.loadingCtx ? 'aw-spin' : ''} />
          </button>
          <button type="button" onClick={closeWindow} className="aw-btn aw-btn-ghost"><X size={13} /> {t('Close')}</button>
        </div>
      </div>

      <div className="aw-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'run'} className="aw-tab" onClick={() => setTab('run')}>{t('Yearly run')}</button>
        <button type="button" role="tab" aria-selected={tab === 'history'} className="aw-tab" onClick={() => setTab('history')}>{t('Posted runs')}{g.runs.length ? ` (${g.runs.length})` : ''}</button>
      </div>

      <div className="aw-content">
        {result && (
          <div className="aw-alert aw-alert-success" role="status" style={{ marginBottom: 12 }}>
            <CheckCircle2 size={16} />
            <span>{t('Posted. Journal voucher')} <strong>{result.voucherNo}</strong>: {result.members.toLocaleString('en-IN')} members charged, {inr(result.total)} {t('deducted from RD.')}</span>
          </div>
        )}
        {g.error && <div className="aw-alert aw-alert-danger" role="alert" style={{ marginBottom: 12 }}><AlertCircle size={16} /><span>{g.error}</span></div>}

        {tab === 'run' && (
          <>
            <section className="aw-card">
              <div className="gi-grid">
                <div className="gi-field">
                  <label htmlFor="gi-year">{t('Financial year')}</label>
                  <select id="gi-year" className="aw-input" value={g.yearcode ?? ''} onChange={e => g.setYearcode(Number(e.target.value))}>
                    {g.years.map(y => <option key={y.yearcode} value={y.yearcode}>{y.label}{y.run ? ' — posted' : ''}</option>)}
                  </select>
                </div>
                <div className="gi-field">
                  <label htmlFor="gi-lump">{t('Lump sum insurance for the year (₹)')}</label>
                  <input id="gi-lump" className="aw-input" inputMode="decimal" placeholder="e.g. 8000000" value={g.lumpSum} disabled={!!posted}
                    onChange={e => g.setLumpSum(e.target.value.replace(/[^0-9.]/g, ''))} />
                </div>
                <div className="gi-field">
                  <label htmlFor="gi-date">{t('Posting date')}</label>
                  <input id="gi-date" type="date" className="aw-input" value={g.postingDate} min={year?.fyStart} max={year?.fyEnd} disabled={!!posted}
                    onChange={e => g.setPostingDate(e.target.value)} />
                </div>
                <div className="gi-field">
                  <button type="button" className="aw-btn aw-btn-primary" style={{ width: '100%' }} disabled={!g.canCalculate || g.calculating || !!posted}
                    onClick={() => g.calculate({ page: 0 })}>
                    {g.calculating ? <RefreshCw size={13} className="aw-spin" /> : <Calculator size={13} />} {t('Calculate')}
                  </button>
                </div>
              </div>
              <p className="is-muted" style={{ margin: '12px 0 0', fontSize: 12.5 }}>
                {t('Only active members who have not retired are charged. Retired members are left out, and they are not counted in the split.')}
              </p>
            </section>

            {posted && (
              <div className="aw-alert aw-alert-success" style={{ marginTop: 12 }}>
                <CheckCircle2 size={16} />
                <span>
                  {t('Group insurance for')} {posted.fyLabel} {t('was already posted on')} {fmtDate(posted.postingDate)} (voucher {posted.voucherNo}):
                  {' '}{posted.chargedMembers.toLocaleString('en-IN')} members, {inr(posted.totalCharged)}.{' '}
                  <button type="button" className="aw-btn aw-btn-ghost" onClick={() => { setTab('history'); showRun(posted); }}>{t('View charges')}</button>
                </span>
              </div>
            )}

            {!posted && !p && (
              <div className="aw-empty" style={{ padding: 36 }}>
                <Calculator size={26} />
                <strong className="aw-strong">{t('Enter the lump sum and press Calculate')}</strong>
                <span className="is-muted">{t('Nothing is posted until you confirm the next step.')}</span>
              </div>
            )}

            {p && s && !posted && (
              <>
                <div className="gi-tiles">
                  <div className="gi-tile"><strong>{t('Members charged')}</strong><b>{s.membersCharged.toLocaleString('en-IN')}</b><span>of {s.activeMembers.toLocaleString('en-IN')} active</span></div>
                  <div className="gi-tile"><strong>{t('Full-year share')}</strong><b>{inr(Math.round(s.perMemberYearly * 100) / 100)}</b><span>{t('{{1}} ÷ {{2}} members', { 1: inr(p.lumpSum), 2: s.divisor.toLocaleString('en-IN') })}</span></div>
                  <div className="gi-tile"><strong>{t('Total to deduct')}</strong><b>{inr(s.totalToCollect)}</b><span>{s.difference >= 0 ? t('{{1}} below', { 1: inr(s.difference) }) : t('{{1}} above', { 1: inr(-s.difference) })} {t('the lump sum (part-year + rounding up)')}</span></div>
                  <div className="gi-tile"><strong>{t('RD goes negative')}</strong><b style={s.goesNegative ? { color: 'var(--aw-danger, #d64545)' } : undefined}>{s.goesNegative.toLocaleString('en-IN')}</b><span>{inr(s.uncoveredTotal)} {t('not covered by RD')}</span></div>
                </div>

                {s.retiredExcluded > 0 && <div className="gi-warn"><AlertTriangle size={14} style={{ verticalAlign: '-2px' }} /> {s.retiredExcluded.toLocaleString('en-IN')} {t('retired members are not charged and are not counted in the split (shown for information).')}</div>}
                {s.duplicateNumbers > 0 && <div className="gi-warn"><AlertTriangle size={14} style={{ verticalAlign: '-2px' }} /> {s.duplicateNumbers} {t('member number')}{s.duplicateNumbers > 1 ? 's are' : ' is'} {t('used by two members in Member Master; each is charged once.')}</div>}
                {s.joinsAfterYearEnd > 0 && <div className="gi-warn"><AlertTriangle size={14} style={{ verticalAlign: '-2px' }} /> {s.joinsAfterYearEnd} member{s.joinsAfterYearEnd > 1 ? 's have' : ' has'} {t('a joining date after the year end and')} {s.joinsAfterYearEnd > 1 ? 'are' : 'is'} {t('skipped.')}</div>}
                {s.noBalanceRow > 0 && <div className="gi-warn">{s.noBalanceRow.toLocaleString('en-IN')} {t('charged members have no balance record yet; one is created with a negative RD.')}</div>}

                <section className="aw-card" style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                    <div className="aw-chips" role="radiogroup" aria-label={t('Show')}>
                      {filters.map(f => (
                        <button key={f.id} type="button" role="radio" aria-checked={g.filter === f.id} className="aw-chip" onClick={() => g.changeFilter(f.id)}>{f.label}</button>
                      ))}
                    </div>
                    <form onSubmit={e => { e.preventDefault(); g.applySearch(); }} className="aw-input-wrap has-icon" style={{ maxWidth: 280, flex: '1 1 200px', marginLeft: 'auto' }}>
                      <Search size={13} />
                      <input className="aw-input" aria-label={t('Search members')} placeholder={t('Member no. or name, then Enter')} value={g.search} onChange={e => g.changeSearch(e.target.value)} />
                    </form>
                  </div>
                  {p.rows.length === 0
                    ? <div className="aw-empty" style={{ padding: 24 }}><strong className="aw-strong">{t('No members match')}</strong></div>
                    : tableRows(p.rows, true)}
                  {pager(g.page, p.rowTotal, g.goPage, g.calculating)}
                </section>

                <div className="aw-actions" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
                  <button type="button" className="aw-btn aw-btn-primary" disabled={g.posting || g.calculating} onClick={() => { setPostError(''); setConfirmOpen(true); }}>
                    <Send size={13} /> {t('Post group insurance…')}
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {tab === 'history' && (
          <>
            {!openRun && (
              <section className="aw-card">
                {g.runs.length === 0 ? (
                  <div className="aw-empty" style={{ padding: 28 }}><History size={26} /><strong className="aw-strong">{t('Nothing has been posted yet')}</strong></div>
                ) : (
                  <div className="aw-table-wrap">
                    <table className="aw-table" style={{ minWidth: 820 }}>
                      <thead>
                        <tr><th>{t('Year')}</th><th>{t('Posted on')}</th><th>{t('Voucher')}</th><th className="gi-num">{t('Lump sum')}</th><th className="gi-num">{t('Members')}</th><th className="gi-num">{t('Deducted')}</th><th>{t('By')}</th><th /></tr>
                      </thead>
                      <tbody>
                        {g.runs.map(r => (
                          <tr key={r.id}>
                            <td className="is-accent">{r.fyLabel}</td><td>{fmtDate(r.postingDate)}</td><td>{r.voucherNo}</td>
                            <td className="gi-num">{inr(r.lumpSum)}</td><td className="gi-num">{r.chargedMembers.toLocaleString('en-IN')}</td>
                            <td className="gi-num">{inr(r.totalCharged)}</td><td className="is-muted">{r.createdBy}</td>
                            <td><button type="button" className="aw-btn aw-btn-secondary" onClick={() => showRun(r)}>{t('View charges')}</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
            {openRun && (
              <section className="aw-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                  <button type="button" className="aw-btn aw-btn-ghost" onClick={() => setOpenRun(null)}><ChevronLeft size={13} /> {t('All runs')}</button>
                  <strong>{openRun.fyLabel}</strong>
                  <span className="is-muted" style={{ fontSize: 12 }}>voucher {openRun.voucherNo} · {inr(openRun.totalCharged)} from {openRun.chargedMembers.toLocaleString('en-IN')} members</span>
                  <form onSubmit={e => { e.preventDefault(); setRunPage(0); fetchRun(openRun, 0, runSearch); }} className="aw-input-wrap has-icon" style={{ maxWidth: 260, flex: '1 1 180px', marginLeft: 'auto' }}>
                    <Search size={13} />
                    <input className="aw-input" aria-label={t('Search charges')} placeholder={t('Member no. or name, then Enter')} value={runSearch} onChange={e => setRunSearch(e.target.value)} />
                  </form>
                </div>
                {runLoading && runRows.length === 0 ? <div className="aw-empty" style={{ padding: 24 }}><RefreshCw size={20} className="aw-spin" /></div> : tableRows(runRows, false)}
                {pager(runPage, runTotal, n => { setRunPage(n); fetchRun(openRun, n, runSearch); }, runLoading)}
              </section>
            )}
          </>
        )}
      </div>

      <div className="aw-footer">
        <span>{t('Rounded up per member · joining month counted · RD may go negative and is recovered later')}</span>
        <span>{t('Only an administrator can post')}</span>
      </div>

      {confirmOpen && p && s && (
        <div className="gi-overlay" role="dialog" aria-modal="true" onMouseDown={e => { if (e.target === e.currentTarget && !g.posting) setConfirmOpen(false); }}>
          <div className="gi-dialog">
            <h2>{t('Post group insurance')} {p.fyLabel}</h2>
            <p className="is-muted" style={{ margin: 0, fontSize: 13 }}>{t('This cannot be repeated for the same year.')}</p>
            <ul>
              <li>{t('{{1}} members will be charged, {{2}} {{3}}', { 1: s.membersCharged.toLocaleString('en-IN'), 2: inr(s.totalToCollect), 3: t('in total.') })}</li>
              <li>{t('{{1}} {{2}}: debit RD (L1004), credit Group Insurance (L1003).', { 1: t('One Journal voucher dated'), 2: fmtDate(p.postingDate) })}</li>
              <li>{t('{{1}} members will end with a negative RD ({{2}} in all). It is recovered when they next take a loan and from their first deposits of the new year.', { 1: s.goesNegative.toLocaleString('en-IN'), 2: inr(s.uncoveredTotal) })}</li>
            </ul>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, margin: '10px 0 4px' }}>{t('Type')} <strong>{p.fyLabel}</strong> {t('to confirm')}</label>
            <input className="aw-input" style={{ width: '100%' }} value={typed} onChange={e => setTyped(e.target.value)} autoFocus />
            {postError && <div className="aw-alert aw-alert-danger" role="alert" style={{ marginTop: 10 }}><AlertCircle size={16} /><span>{postError}</span></div>}
            <div className="aw-actions" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
              <button type="button" className="aw-btn aw-btn-ghost" disabled={g.posting} onClick={() => setConfirmOpen(false)}>{t('Cancel')}</button>
              <button type="button" className="aw-btn aw-btn-primary" disabled={g.posting || typed.trim() !== p.fyLabel} onClick={doPost}>
                {g.posting ? <RefreshCw size={13} className="aw-spin" /> : <Send size={13} />} {t('Post now')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupInsurance;
