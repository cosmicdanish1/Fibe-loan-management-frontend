// page/NotificationCentre.tsx
// One place for every system notification (ES-101). The bell in the title bar stays as it is; this window shows
// the full, filterable list with a read / unread state that belongs to the logged-in user.

import React from 'react';
import {
  X, RefreshCw, Search, Bell, BellOff, CheckCheck, AlertCircle, AlertTriangle, Info, CheckCircle2, ArrowRight,
  Eye, EyeOff, UserX, Users, Wallet, MessageSquare, CalendarClock, ShieldCheck, TrendingDown,
} from 'lucide-react';
import {
  useNotificationCentre, KIND_LABEL, KIND_GROUPS, PAGE_SIZE,
  type NotificationRow, type Severity,
} from '../hook/useNotificationCentre';

const closeWindow = () => {
  const api = (window as any).electronAPI;
  if (api?.ipcRenderer?.send) api.ipcRenderer.send('window-close');
  else window.close();
};

const openWindow = (path: string) => (window as any).electronAPI?.openNewWindow?.(path);

const timeAgo = (iso: string): string => {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return '';
  const mins = Math.floor((Date.now() - t) / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days < 30 ? `${days}d ago` : new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const SEVERITY: Record<Severity, { label: string; color: string; Icon: React.ElementType }> = {
  error: { label: 'Needs action', color: 'var(--aw-danger, #d64545)', Icon: AlertCircle },
  warning: { label: 'Attention', color: 'var(--aw-warning, #c98a00)', Icon: AlertTriangle },
  info: { label: 'For information', color: 'var(--aw-accent)', Icon: Info },
};

const KIND_ICON: Record<string, React.ElementType> = {
  MEMBER_READY_INACTIVE: UserX,
  MEMBER_RETIRING_SOON: Users,
  MEMBER_NO_RETIREMENT_DATE: CalendarClock,
  INSURANCE_DUE: ShieldCheck,
  NEGATIVE_RD: TrendingDown,
  MESSAGES_FAILED: MessageSquare,
  MESSAGES_PENDING: MessageSquare,
  DAYEND_PENDING: CalendarClock,
};

const GROUP_ICON: Record<string, React.ElementType> = { Members: Users, Money: Wallet, System: CalendarClock };

const NotificationCentre: React.FC = () => {
  const n = useNotificationCentre();
  const s = n.summary;

  const onOpen = (row: NotificationRow) => {
    if (!row.read) n.setRead(row, true);
    if (row.actionPath) openWindow(row.actionPath);
  };

  const sevChips: { id: Severity | ''; label: string; count?: number }[] = [
    { id: '', label: 'All' },
    { id: 'error', label: 'Needs action', ...(s ? { count: s.bySeverity.error } : {}) },
    { id: 'warning', label: 'Attention', ...(s ? { count: s.bySeverity.warning } : {}) },
    { id: 'info', label: 'For information', ...(s ? { count: s.bySeverity.info } : {}) },
  ];

  const kindButton = (id: string, label: string, Icon: React.ElementType, total?: number, unread?: number) => (
    <button key={id || 'all'} type="button" className="nc-kind" aria-pressed={n.kind === id} onClick={() => n.setKind(id)}>
      <Icon size={14} />
      <span className="nc-kind-label">{label}</span>
      {unread ? <span className="nc-dot" aria-label={`${unread} unread`}>{unread > 999 ? '999+' : unread}</span> : null}
      {total !== undefined && !unread ? <span className="nc-count">{total}</span> : null}
    </button>
  );

  return (
    <div className="app-window">
      <style>{`
        .nc-layout { display: grid; grid-template-columns: 230px minmax(0, 1fr); gap: 14px; align-items: start; }
        @media (max-width: 820px) { .nc-layout { grid-template-columns: 1fr; } }
        .nc-rail { position: sticky; top: 0; display: flex; flex-direction: column; gap: 2px; }
        .nc-rail h3 { margin: 12px 0 4px; padding: 0 10px; font-size: 11px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--aw-muted); }
        .nc-kind { display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; padding: 7px 10px; border: 0; border-radius: 8px; background: transparent; color: inherit; font: inherit; font-size: 13px; cursor: pointer; }
        .nc-kind:hover { background: var(--aw-surface-muted); }
        .nc-kind[aria-pressed="true"] { background: var(--aw-accent-soft); color: var(--aw-accent); font-weight: 600; }
        .nc-kind-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .nc-count { font-size: 11.5px; color: var(--aw-muted); font-variant-numeric: tabular-nums; }
        .nc-dot { min-width: 20px; padding: 1px 6px; border-radius: 999px; background: var(--aw-accent); color: #fff; font-size: 11px; font-weight: 700; text-align: center; font-variant-numeric: tabular-nums; }
        .nc-toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
        .nc-list { display: flex; flex-direction: column; gap: 8px; }
        .nc-item { position: relative; display: flex; gap: 12px; padding: 12px 14px 12px 16px; background: var(--aw-surface); border: 1px solid var(--aw-border); border-radius: var(--aw-radius); overflow: hidden; transition: border-color .15s, background .15s; }
        .nc-item::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--nc-color); }
        .nc-item:hover { border-color: var(--aw-border-strong); }
        .nc-item[data-unread="true"] { background: color-mix(in srgb, var(--nc-color) 5%, var(--aw-surface)); }
        .nc-ico { flex: none; width: 32px; height: 32px; border-radius: 9px; display: flex; align-items: center; justify-content: center; color: var(--nc-color); background: color-mix(in srgb, var(--nc-color) 13%, transparent); }
        .nc-main { flex: 1; min-width: 0; }
        .nc-title { margin: 0; font-size: 13.5px; line-height: 1.35; font-weight: 500; }
        .nc-item[data-unread="true"] .nc-title { font-weight: 700; }
        .nc-body { margin: 3px 0 0; font-size: 12.5px; line-height: 1.45; color: var(--aw-muted); }
        .nc-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 7px; font-size: 11.5px; color: var(--aw-muted); }
        .nc-chip { padding: 1px 8px; border-radius: 999px; border: 1px solid var(--aw-border); font-size: 11px; }
        .nc-actions { flex: none; display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; gap: 6px; }
        .nc-more { display: flex; justify-content: center; padding: 10px 0 2px; }
      `}</style>

      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">Notification Centre</h1>
          <p className="aw-desc" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Bell size={12} /> Everything that needs a person's attention, in one place
          </p>
        </div>
        <div className="aw-actions">
          <button type="button" onClick={n.markAllRead} disabled={!s || s.unread === 0} className="aw-btn aw-btn-ghost">
            <CheckCheck size={13} /> Mark {n.kind ? 'these' : 'all'} read
          </button>
          <button type="button" onClick={n.syncNow} disabled={n.syncing || n.loading} className="aw-icon-btn" aria-label="Check again now" data-tip="Check again now" data-tip-pos="bottom-end">
            <RefreshCw size={14} className={n.syncing || n.loading ? 'aw-spin' : ''} />
          </button>
          <button type="button" onClick={closeWindow} className="aw-btn aw-btn-ghost"><X size={13} /> Close</button>
        </div>
      </div>

      <div className="aw-content">
        {n.error && <div className="aw-alert aw-alert-danger" role="alert" style={{ marginBottom: 12 }}><AlertCircle size={16} /><span>{n.error}</span></div>}

        <div className="nc-layout">
          <nav className="nc-rail" aria-label="Notification types">
            {kindButton('', 'All notifications', Bell, s?.open, s?.unread)}
            {KIND_GROUPS.map(g => {
              const GIcon = GROUP_ICON[g.label] || Bell;
              return (
                <React.Fragment key={g.label}>
                  <h3>{g.label}</h3>
                  {g.kinds.map(k => kindButton(k, KIND_LABEL[k] || k, KIND_ICON[k] || GIcon, s?.byKind[k]?.total ?? 0, s?.byKind[k]?.unread ?? 0))}
                </React.Fragment>
              );
            })}
          </nav>

          <section className="aw-card" style={{ minWidth: 0 }}>
            <div className="nc-toolbar">
              <div className="aw-input-wrap has-icon" style={{ maxWidth: 300, flex: '1 1 200px' }}>
                <Search size={13} />
                <input className="aw-input" aria-label="Search notifications" placeholder="Search member no., name or text..." value={n.search} onChange={e => n.setSearch(e.target.value)} />
              </div>
              <div className="aw-chips" role="radiogroup" aria-label="Importance">
                {sevChips.map(c => (
                  <button key={c.id || 'all'} type="button" role="radio" aria-checked={n.severity === c.id} className="aw-chip" onClick={() => n.setSeverity(c.id)}>
                    {c.label}{c.count ? ` (${c.count})` : ''}
                  </button>
                ))}
              </div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, marginLeft: 'auto' }}>
                <input type="checkbox" checked={n.unreadOnly} onChange={e => n.setUnreadOnly(e.target.checked)} /> Unread only
              </label>
              <div className="aw-chips" role="radiogroup" aria-label="Show">
                <button type="button" role="radio" aria-checked={n.status === 'open'} className="aw-chip" onClick={() => n.setStatus('open')}>Current</button>
                <button type="button" role="radio" aria-checked={n.status === 'resolved'} className="aw-chip" onClick={() => n.setStatus('resolved')}>Resolved</button>
              </div>
            </div>

            {n.loading && n.rows.length === 0 && (
              <div className="nc-list">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="nc-item" style={{ ['--nc-color' as any]: 'var(--aw-border-strong)' }}>
                    <span className="aw-skeleton" style={{ width: 32, height: 32, borderRadius: 9 }} />
                    <div style={{ flex: 1 }}>
                      <span className="aw-skeleton" style={{ display: 'block', height: 14, width: `${55 + (i * 11) % 30}%` }} />
                      <span className="aw-skeleton" style={{ display: 'block', height: 12, width: '80%', marginTop: 8 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!n.loading && n.rows.length === 0 && !n.error && (
              <div className="aw-empty" style={{ padding: 40 }}>
                {n.unreadOnly || n.search || n.kind || n.severity ? <BellOff size={28} /> : <CheckCircle2 size={28} />}
                <strong className="aw-strong">
                  {n.unreadOnly || n.search || n.kind || n.severity ? 'Nothing matches these filters' : n.status === 'resolved' ? 'Nothing has been resolved yet' : 'All clear'}
                </strong>
                <span className="is-muted">{n.status === 'open' && !(n.unreadOnly || n.search || n.kind || n.severity) ? 'There is nothing that needs attention right now.' : ''}</span>
              </div>
            )}

            {n.rows.length > 0 && (
              <div className="nc-list" role="list">
                {n.rows.map(r => {
                  const sev = SEVERITY[r.severity] || SEVERITY.info;
                  const Icon = KIND_ICON[r.kind] || sev.Icon;
                  const resolved = r.status === 'RESOLVED';
                  return (
                    <article key={r.id} role="listitem" className="nc-item" data-unread={!r.read && !resolved}
                      style={{ ['--nc-color' as any]: resolved ? 'var(--aw-border-strong)' : sev.color, opacity: resolved ? 0.75 : 1 }}>
                      <span className="nc-ico"><Icon size={16} /></span>
                      <div className="nc-main">
                        <h2 className="nc-title">{r.title}</h2>
                        <p className="nc-body">{r.body}</p>
                        <div className="nc-meta">
                          <span className="nc-chip">{KIND_LABEL[r.kind] || r.kind}</span>
                          {resolved
                            ? <span>Resolved {r.resolvedAt ? timeAgo(r.resolvedAt) : ''}</span>
                            : <span title={new Date(r.createdAt).toLocaleString('en-IN')}>{timeAgo(r.createdAt)}</span>}
                          {r.memberNo && <span>Member {r.memberNo}</span>}
                        </div>
                      </div>
                      <div className="nc-actions">
                        <button type="button" className="aw-icon-btn" aria-label={r.read ? 'Mark as unread' : 'Mark as read'}
                          data-tip={r.read ? 'Mark as unread' : 'Mark as read'} data-tip-pos="bottom-end" onClick={() => n.setRead(r, !r.read)}>
                          {r.read ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        {r.actionPath && !resolved && (
                          <button type="button" className="aw-btn aw-btn-secondary" onClick={() => onOpen(r)}>
                            {r.actionLabel || 'Open'} <ArrowRight size={12} />
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {n.rows.length < n.total && (
              <div className="nc-more">
                <button type="button" className="aw-btn aw-btn-secondary" disabled={n.loadingMore} onClick={n.loadMore}>
                  {n.loadingMore ? <RefreshCw size={13} className="aw-spin" /> : null} Show more ({Math.min(PAGE_SIZE, n.total - n.rows.length)} of {n.total - n.rows.length} left)
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="aw-footer">
        <span>{n.total.toLocaleString('en-IN')} notification{n.total === 1 ? '' : 's'} shown{s ? ` · ${s.unread.toLocaleString('en-IN')} unread for you` : ''}</span>
        <span>{s?.lastSyncedAt ? `Checked ${timeAgo(s.lastSyncedAt)} · refreshes automatically` : 'Refreshes automatically'}</span>
      </div>
    </div>
  );
};

export default NotificationCentre;
