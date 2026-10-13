// page/MemberStatus.tsx
// Retired / inactive members (ES-100). A member becomes inactive only when the retirement date has passed AND
// the RD balance is zero — the system just FLAGS those members here; a person marks them inactive by hand.
// Inactive means inactive everywhere in the app.

import React, { useEffect, useState } from 'react';
import {
  X, RefreshCw, Search, UserX, UserCheck, AlertCircle, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, History,
} from 'lucide-react';
import {
  useMemberStatus, PAGE_SIZE,
  type StatusCategory, type StatusRow, type MemberCheck, type HistoryRow,
} from '../hook/useMemberStatus';

type TabId = StatusCategory | 'find';

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
const fmtMonth = (ym?: string | null) => {
  if (!ym) return '—';
  const [y, m] = ym.split('-');
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[Number(m) - 1] || m} ${y}`;
};
const fmtStamp = (s: string) => { const d = new Date(s); return isNaN(d.getTime()) ? s : d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }); };

// ── confirm dialog: reason + warnings ───────────────────────────────────────
interface ActionDialog { kind: 'inactive' | 'reactivate'; info: MemberCheck }

const MemberStatus: React.FC = () => {
  const s = useMemberStatus();
  const [tab, setTab] = useState<TabId>('ready');
  const [dialog, setDialog] = useState<ActionDialog | null>(null);
  const [reason, setReason] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const [notice, setNotice] = useState('');

  // find-a-member tab
  const [findNo, setFindNo] = useState('');
  const [found, setFound] = useState<MemberCheck | null>(null);
  const [foundHistory, setFoundHistory] = useState<HistoryRow[]>([]);
  const [findError, setFindError] = useState('');
  const [finding, setFinding] = useState(false);

  useEffect(() => { if (tab !== 'find') s.changeCategory(tab); /* eslint-disable-next-line */ }, [tab]);

  const openDialog = async (kind: 'inactive' | 'reactivate', memberNo: string) => {
    setNotice('');
    const r = await s.check(memberNo);
    if (!r.data) { setNotice(r.error || 'Could not check the member'); return; }
    setReason(''); setUnderstood(false); setDialogError('');
    setDialog({ kind, info: r.data });
  };

  const confirmDialog = async () => {
    if (!dialog) return;
    const { kind, info } = dialog;
    if (reason.trim().length < 3) { setDialogError('Please give a short reason.'); return; }
    const force = kind === 'inactive' && info.warnings.length > 0;
    if (force && !understood) { setDialogError('Tick the box to confirm you want to go ahead despite the warnings.'); return; }
    setBusy(true); setDialogError('');
    const res = kind === 'inactive'
      ? await s.markInactive(info.memberNo, reason.trim(), force)
      : await s.reactivate(info.memberNo, reason.trim());
    setBusy(false);
    if (!res.ok) { setDialogError(res.error || 'Failed'); return; }
    setDialog(null);
    setNotice(`${info.name || 'Member'} (${info.memberNo}) is now ${kind === 'inactive' ? 'inactive' : 'active again'}.`);
    if (found && found.memberNo === info.memberNo) await runFind(info.memberNo);
  };

  const runFind = async (no = findNo) => {
    const n = no.trim();
    if (!n) return;
    setFinding(true); setFindError('');
    const r = await s.check(n);
    if (!r.data) { setFound(null); setFoundHistory([]); setFindError(r.error || 'Member not found'); setFinding(false); return; }
    setFound(r.data);
    setFoundHistory(await s.history(r.data.memberNo));
    setFinding(false);
  };

  const tiles: { id: StatusCategory; label: string; hint: string; value: number | undefined; tone: string }[] = [
    { id: 'ready', label: 'Ready to mark inactive', hint: 'Retired and RD is zero', value: s.summary?.ready, tone: 'var(--aw-danger, #d64545)' },
    { id: 'retired-rd', label: 'Retired, RD remaining', hint: 'Waiting for RD to reach zero', value: s.summary?.retiredWithRd, tone: 'var(--aw-warning, #c98a00)' },
    { id: 'upcoming', label: `Retiring in ${s.months} months`, hint: 'Will need a decision soon', value: s.summary?.upcoming, tone: 'var(--aw-accent)' },
  ];

  const lastPage = Math.max(0, Math.ceil(s.total / PAGE_SIZE) - 1);
  const showMonths = tab === 'upcoming';

  const thisRows: StatusRow[] = s.rows;

  return (
    <div className="app-window">
      <style>{`
        .ms-tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 14px; }
        .ms-tile { text-align: left; background: var(--aw-surface); border: 1px solid var(--aw-border); border-radius: var(--aw-radius); padding: 12px 14px; cursor: pointer; transition: border-color .15s, box-shadow .15s; }
        .ms-tile:hover { border-color: var(--aw-border-strong); }
        .ms-tile[aria-selected="true"] { border-color: var(--aw-accent); box-shadow: 0 0 0 1px var(--aw-accent); }
        .ms-tile b { display: block; font-size: 26px; line-height: 1.1; font-variant-numeric: tabular-nums; }
        .ms-tile span { display: block; font-size: 12px; color: var(--aw-muted); }
        .ms-tile strong { display: block; font-size: 12.5px; margin-bottom: 2px; }
        .ms-num { text-align: right; font-variant-numeric: tabular-nums; }
        .ms-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 16px; }
        .ms-dialog { width: min(520px, 100%); background: var(--aw-surface); border: 1px solid var(--aw-border-strong); border-radius: var(--aw-radius); box-shadow: var(--aw-shadow-pop); padding: 18px; }
        .ms-dialog h2 { margin: 0 0 4px; font-size: 16px; }
        .ms-warn { margin: 10px 0; padding: 10px 12px; border-radius: 8px; background: color-mix(in srgb, var(--aw-warning, #c98a00) 14%, transparent); font-size: 13px; }
        .ms-warn ul { margin: 6px 0 0; padding-left: 18px; }
        .ms-row-actions { display: flex; gap: 6px; justify-content: flex-end; }
        .ms-kv { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px 18px; margin: 10px 0 4px; }
        .ms-kv dt { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--aw-muted); }
        .ms-kv dd { margin: 2px 0 0; font-weight: 600; }
      `}</style>

      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">Member Status</h1>
          <p className="aw-desc" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <UserX size={12} /> A member becomes inactive when retired and RD is zero — you mark them inactive by hand
          </p>
        </div>
        <div className="aw-actions">
          <button type="button" onClick={s.reload} disabled={s.loading} className="aw-icon-btn" aria-label="Refresh" data-tip="Refresh" data-tip-pos="bottom-end">
            <RefreshCw size={14} className={s.loading ? 'aw-spin' : ''} />
          </button>
          <button type="button" onClick={closeWindow} className="aw-btn aw-btn-ghost"><X size={13} /> Close</button>
        </div>
      </div>

      <div className="aw-content">
        {notice && (
          <div className="aw-alert aw-alert-success" role="status" style={{ marginBottom: 12 }}>
            <CheckCircle2 size={16} /><span>{notice}</span>
          </div>
        )}

        <div className="ms-tiles" role="tablist">
          {tiles.map(t => (
            <button key={t.id} type="button" role="tab" className="ms-tile" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
              <strong>{t.label}</strong>
              <b style={{ color: t.tone }}>{t.value === undefined ? '…' : t.value.toLocaleString('en-IN')}</b>
              <span>{t.hint}</span>
            </button>
          ))}
          <button type="button" role="tab" className="ms-tile" aria-selected={tab === 'find'} onClick={() => setTab('find')}>
            <strong>Find a member</strong>
            <b><Search size={22} /></b>
            <span>Mark any member inactive, or re-activate one</span>
          </button>
        </div>

        {tab !== 'find' && (
          <section className="aw-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
              <div className="aw-input-wrap has-icon" style={{ maxWidth: 320, flex: '1 1 220px' }}>
                <Search size={13} />
                <input
                  type="text" className="aw-input" aria-label="Search members"
                  placeholder="Search member no. or name..."
                  value={s.search} onChange={e => s.changeSearch(e.target.value)}
                />
              </div>
              {showMonths && (
                <label className="is-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  Retiring within
                  <select className="aw-input" style={{ width: 'auto' }} value={s.months} onChange={e => s.changeMonths(Number(e.target.value))}>
                    {[3, 6, 12, 18, 24, 36].map(m => <option key={m} value={m}>{m} months</option>)}
                  </select>
                </label>
              )}
              <span className="is-muted" style={{ fontSize: 12, marginLeft: 'auto' }}>
                {s.total.toLocaleString('en-IN')} member{s.total === 1 ? '' : 's'}
              </span>
            </div>

            {s.error && <div className="aw-alert aw-alert-danger" role="alert"><AlertCircle size={16} /><span>{s.error}</span></div>}

            {thisRows.length === 0 && !s.loading && !s.error ? (
              <div className="aw-empty" style={{ padding: 32 }}>
                <CheckCircle2 size={26} />
                <strong className="aw-strong">{s.search ? 'No matching members' : 'Nobody in this list'}</strong>
              </div>
            ) : (
              <div className="aw-table-wrap">
                <table className="aw-table" style={{ minWidth: 900 }}>
                  <thead>
                    <tr>
                      <th>Member No</th><th>Name</th><th>Office</th><th>Retirement</th>
                      <th className="ms-num">RD balance</th><th className="ms-num">Loan</th>
                      <th>{tab === 'upcoming' ? 'Expected inactive' : 'Status'}</th><th />
                    </tr>
                  </thead>
                  <tbody>
                    {s.loading && thisRows.length === 0 && Array.from({ length: 6 }).map((_, i) => (
                      <tr key={`sk-${i}`}>{Array.from({ length: 8 }).map((_, j) => (
                        <td key={j}><span className="aw-skeleton" style={{ display: 'block', height: 14, width: `${50 + ((i + j) * 13) % 45}%` }} /></td>
                      ))}</tr>
                    ))}
                    {thisRows.map(r => (
                      <tr key={r.memberNo}>
                        <td className="is-accent">{r.memberNo}</td>
                        <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.name}>{r.name || '—'}</td>
                        <td className="is-muted">{r.officeName || '—'}</td>
                        <td>{fmtDate(r.retirementDate)}</td>
                        <td className="ms-num">{inr(r.rdBalance)}</td>
                        <td className="ms-num" style={r.loanBalance > 0 ? { color: 'var(--aw-warning, #c98a00)', fontWeight: 600 } : undefined}>{r.loanBalance > 0 ? inr(r.loanBalance) : '—'}</td>
                        <td title={r.note}>{tab === 'upcoming' ? (r.expectedInactiveMonth ? fmtMonth(r.expectedInactiveMonth) : 'After RD is zero') : <span className="aw-pill">{tab === 'ready' ? 'Ready' : 'RD remaining'}</span>}</td>
                        <td>
                          <div className="ms-row-actions">
                            <button type="button" className="aw-btn aw-btn-secondary" onClick={() => openDialog('inactive', r.memberNo)}>
                              <UserX size={12} /> Mark inactive
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {s.total > PAGE_SIZE && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button type="button" className="aw-btn aw-btn-ghost" disabled={s.page === 0 || s.loading} onClick={() => s.setPage(s.page - 1)}><ChevronLeft size={13} /> Prev</button>
                <span className="is-muted" style={{ fontSize: 12 }}>Page {s.page + 1} of {lastPage + 1}</span>
                <button type="button" className="aw-btn aw-btn-ghost" disabled={s.page >= lastPage || s.loading} onClick={() => s.setPage(s.page + 1)}>Next <ChevronRight size={13} /></button>
              </div>
            )}
          </section>
        )}

        {tab === 'find' && (
          <section className="aw-card" style={{ maxWidth: 820 }}>
            <form onSubmit={e => { e.preventDefault(); runFind(); }} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <div className="aw-input-wrap has-icon" style={{ maxWidth: 280, flex: '1 1 200px' }}>
                <Search size={13} />
                <input className="aw-input" aria-label="Member number" placeholder="Member number" value={findNo} onChange={e => setFindNo(e.target.value)} />
              </div>
              <button type="submit" className="aw-btn aw-btn-primary" disabled={finding || !findNo.trim()}>
                {finding ? <RefreshCw size={13} className="aw-spin" /> : <Search size={13} />} Check
              </button>
            </form>

            {findError && <div className="aw-alert aw-alert-danger" role="alert" style={{ marginTop: 12 }}><AlertCircle size={16} /><span>{findError}</span></div>}

            {found && (
              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 16 }}>{found.name || 'Member'} ({found.memberNo})</strong>
                  <span className="aw-pill">{found.active ? 'Active' : 'Inactive'}</span>
                  {found.active && found.readyToInactivate && <span className="aw-pill">Ready to mark inactive</span>}
                </div>
                <dl className="ms-kv">
                  <div><dt>Retirement date</dt><dd>{fmtDate(found.retirementDate)}{found.retired ? ' (passed)' : ''}</dd></div>
                  <div><dt>RD balance</dt><dd>{inr(found.rdBalance)}</dd></div>
                  <div><dt>Loan outstanding</dt><dd>{inr(found.loanBalance)}</dd></div>
                </dl>
                {found.active && found.warnings.length > 0 && (
                  <div className="ms-warn"><AlertTriangle size={14} style={{ verticalAlign: '-2px' }} /> Not all conditions are met:
                    <ul>{found.warnings.map(w => <li key={w}>{w}</li>)}</ul>
                  </div>
                )}
                <div className="aw-actions" style={{ marginTop: 10 }}>
                  {found.active ? (
                    <button type="button" className="aw-btn aw-btn-secondary" onClick={() => openDialog('inactive', found.memberNo)}><UserX size={13} /> Mark inactive</button>
                  ) : (
                    <button type="button" className="aw-btn aw-btn-secondary" onClick={() => openDialog('reactivate', found.memberNo)}><UserCheck size={13} /> Make active again</button>
                  )}
                </div>

                <h3 style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, margin: '18px 0 6px' }}><History size={13} /> History</h3>
                {foundHistory.length === 0 ? (
                  <p className="is-muted" style={{ fontSize: 12, margin: 0 }}>No status changes recorded for this member.</p>
                ) : (
                  <div className="aw-table-wrap">
                    <table className="aw-table" style={{ minWidth: 640 }}>
                      <thead><tr><th>When</th><th>Action</th><th>By</th><th>Reason</th></tr></thead>
                      <tbody>
                        {foundHistory.map(h => (
                          <tr key={h.id}>
                            <td className="is-muted">{fmtStamp(h.done_at)}</td>
                            <td>{h.action === 'MARK_INACTIVE' ? 'Marked inactive' : 'Made active'}{h.forced ? ' (with warnings)' : ''}</td>
                            <td>{h.done_by}</td>
                            <td>{h.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>

      <div className="aw-footer">
        <span>Inactive members disappear from member search, transactions and reports that list active members.</span>
        <span>Only an administrator can change a member's status</span>
      </div>

      {dialog && (
        <div className="ms-overlay" role="dialog" aria-modal="true" onMouseDown={e => { if (e.target === e.currentTarget && !busy) setDialog(null); }}>
          <div className="ms-dialog">
            <h2>{dialog.kind === 'inactive' ? 'Mark member inactive' : 'Make member active again'}</h2>
            <p className="is-muted" style={{ margin: '0 0 8px', fontSize: 13 }}>
              {dialog.info.name || 'Member'} ({dialog.info.memberNo}) · retirement {fmtDate(dialog.info.retirementDate)} · RD {inr(dialog.info.rdBalance)}
            </p>
            {dialog.kind === 'inactive' && dialog.info.warnings.length > 0 && (
              <div className="ms-warn">
                <strong><AlertTriangle size={14} style={{ verticalAlign: '-2px' }} /> The inactive conditions are not all met</strong>
                <ul>{dialog.info.warnings.map(w => <li key={w}>{w}</li>)}</ul>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                  <input type="checkbox" checked={understood} onChange={e => setUnderstood(e.target.checked)} />
                  I understand — mark inactive anyway
                </label>
              </div>
            )}
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, margin: '8px 0 4px' }}>Reason</label>
            <textarea
              className="aw-input" rows={3} style={{ width: '100%', resize: 'vertical' }}
              value={reason} onChange={e => setReason(e.target.value)} autoFocus
              placeholder={dialog.kind === 'inactive' ? 'e.g. Retired on 31-03-2026, RD withdrawn' : 'e.g. Marked inactive by mistake'}
            />
            {dialogError && <div className="aw-alert aw-alert-danger" role="alert" style={{ marginTop: 10 }}><AlertCircle size={16} /><span>{dialogError}</span></div>}
            <div className="aw-actions" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
              <button type="button" className="aw-btn aw-btn-ghost" disabled={busy} onClick={() => setDialog(null)}>Cancel</button>
              <button type="button" className="aw-btn aw-btn-primary" disabled={busy} onClick={confirmDialog}>
                {busy ? <RefreshCw size={13} className="aw-spin" /> : dialog.kind === 'inactive' ? <UserX size={13} /> : <UserCheck size={13} />}
                {dialog.kind === 'inactive' ? ' Mark inactive' : ' Make active'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberStatus;
