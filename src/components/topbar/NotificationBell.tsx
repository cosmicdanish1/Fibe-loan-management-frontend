import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell, BellRing, CheckCheck, X, RefreshCw, ArrowRight, Database, Clock,
  AlertTriangle, XCircle, MessageSquare, Inbox, Sparkles,
} from 'lucide-react';
import { apiService } from '../../services/api';
import { useUiPrefs, glassVars } from '../../services/uiPrefs';
import './topbar.css';

// ─── Types ───────────────────────────────────────────────────────────────────

type NotifType = 'error' | 'warning' | 'info' | 'success';
type IconKey = 'inbox' | 'message' | 'fail' | 'clock' | 'alert' | 'database';

interface NotificationItem {
  id: string;
  type: NotifType;
  icon: IconKey;
  title: string;
  detail: string;
  time: Date;
  actionLabel?: string;
  actionPath?: string;
}

const ICONS: Record<IconKey, React.ReactNode> = {
  inbox: <Inbox size={17} />,
  message: <MessageSquare size={17} />,
  fail: <XCircle size={17} />,
  clock: <Clock size={17} />,
  alert: <AlertTriangle size={17} />,
  database: <Database size={17} />,
};

// ─── Read / dismissed state (survives refresh and restart) ───────────────────
// Keyed by id + title, so "3 failed" → "5 failed" counts as something new again.

const STATE_KEY = 'lms-notif-state';
interface StoredState { read: string[]; dismissed: string[] }

const sig = (n: NotificationItem) => `${n.id}|${n.title}`;

function loadState(): StoredState {
  try {
    const s = JSON.parse(localStorage.getItem(STATE_KEY) || '{}');
    return { read: Array.isArray(s.read) ? s.read : [], dismissed: Array.isArray(s.dismissed) ? s.dismissed : [] };
  } catch {
    return { read: [], dismissed: [] };
  }
}
function saveState(s: StoredState) {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify({ read: s.read.slice(-200), dismissed: s.dismissed.slice(-200) }));
  } catch { /* storage unavailable */ }
}

function timeAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const openWindow = (path?: string) => { if (path) window.electronAPI?.openNewWindow?.(path); };

// ─── Data ────────────────────────────────────────────────────────────────────

async function buildNotifications(): Promise<NotificationItem[]> {
  const next: NotificationItem[] = [];

  try {
    // Notification Centre (ES-101): unread system notifications — members to inactivate, insurance, etc.
    try {
      const centre = await apiService.getNotificationCentreSummary();
      const c: any = centre.success ? ((centre.data as any)?.data ?? centre.data) : null;
      if (c && c.unread > 0) {
        const errors = c.bySeverity?.error ?? 0;
        next.push({
          id: 'notification-centre',
          type: errors > 0 ? 'error' : 'warning',
          icon: 'inbox',
          title: `${c.unread} unread in Notification Centre`,
          detail: errors > 0 ? `${errors} need action — open the centre to see them all.` : 'Members to inactivate, insurance and other items waiting for you.',
          time: new Date(),
          actionLabel: 'Open Centre',
          actionPath: '/utility/notification-centre',
        });
      }
    } catch { /* the centre is optional here */ }

    const stats = await apiService.getNotificationStats();
    if (stats.success && (stats.data?.pendingCount ?? 0) > 0) {
      next.push({
        id: 'pending-delivery',
        type: 'warning',
        icon: 'message',
        title: `${stats.data!.pendingCount} messages pending delivery`,
        detail: 'Notifications queued but not yet delivered to members.',
        time: new Date(),
        actionLabel: 'View Hub',
        actionPath: '/utility/communication-center',
      });
    }

    const hist = await apiService.getNotificationHistory(50);
    if (hist.success && Array.isArray(hist.data)) {
      const failed = hist.data.filter((h: any) => h.status === 'FAILED');
      const pending = hist.data.filter((h: any) => h.status === 'PENDING').slice(0, 3);

      if (failed.length > 0) {
        next.push({
          id: 'failed-delivery',
          type: 'error',
          icon: 'fail',
          title: `${failed.length} notification${failed.length > 1 ? 's' : ''} failed`,
          detail: `Last failure — ${failed[0]?.channel ?? 'SMS'} to Member #${failed[0]?.memberNo ?? '—'}`,
          time: new Date(failed[0]?.createdAt ?? Date.now()),
          actionLabel: 'Investigate',
          actionPath: '/utility/communication-center',
        });
      }

      pending.forEach((h: any, idx: number) => {
        const msg: string = h.message ?? '';
        next.push({
          id: `pend-${h.id ?? idx}`,
          type: 'info',
          icon: 'clock',
          title: `${h.channel ?? 'Message'} → Member #${h.memberNo ?? '—'}`,
          detail: msg.length > 90 ? msg.slice(0, 90) + '…' : msg || 'Awaiting delivery',
          time: new Date(h.createdAt ?? Date.now()),
        });
      });
    }
  } catch { /* API may not be running */ }

  // Day-end reminder (local — after 5 PM)
  if (new Date().getHours() >= 17) {
    next.push({
      id: 'day-end',
      type: 'warning',
      icon: 'alert',
      title: 'Day End is due',
      detail: "It's past 5 PM — please make sure today's Day End has been completed.",
      time: new Date(),
      actionLabel: 'Go to Day End',
      actionPath: '/day-end',
    });
  }

  // Database backup reminder
  let lastBackupRaw: string | null = null;
  let backupListLoaded = false;
  try {
    const backups = await apiService.getBackupList();
    if (backups.success && Array.isArray(backups.data)) {
      backupListLoaded = true;
      const times = backups.data.map((b: any) => new Date(b?.createdAt).getTime()).filter((t: number) => !isNaN(t));
      if (times.length > 0) lastBackupRaw = new Date(Math.max(...times)).toISOString();
    }
  } catch { /* API may not be running */ }
  if (lastBackupRaw) {
    const daysSince = Math.floor((Date.now() - new Date(lastBackupRaw).getTime()) / 86_400_000);
    if (daysSince >= 3) {
      next.push({
        id: 'backup-overdue',
        type: 'warning',
        icon: 'database',
        title: `Backup overdue — ${daysSince} day${daysSince > 1 ? 's' : ''}`,
        detail: `Last backup was ${daysSince} days ago. Back up the database to prevent data loss.`,
        time: new Date(lastBackupRaw),
        actionLabel: 'Backup Now',
        actionPath: '/utility/database-backup',
      });
    }
  } else if (backupListLoaded) {
    next.push({
      id: 'no-backup',
      type: 'warning',
      icon: 'database',
      title: 'No backup on record',
      detail: 'No database backup has been recorded. Create one now to safeguard your data.',
      time: new Date(),
      actionLabel: 'Backup Now',
      actionPath: '/utility/database-backup',
    });
  }

  return next;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Toast { key: string; item: NotificationItem; leaving: boolean }
const TOAST_LIFE = 6000;

export const NotificationBell: React.FC = () => {
  const prefs = useUiPrefs().notif;

  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [state, setState] = useState<StoredState>(loadState);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [leaving, setLeaving] = useState<Set<string>>(new Set());
  const [ring, setRing] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const rootRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const seenRef = useRef<Set<string> | null>(null);         // null until the first fetch seeds it
  const timers = useRef<Record<string, { id: number; start: number; left: number }>>({});
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  const commit = useCallback((s: StoredState) => { setState(s); saveState(s); }, []);

  // ── Toasts ────────────────────────────────────────────────────────────────
  const dropToast = useCallback((key: string) => {
    window.clearTimeout(timers.current[key]?.id);
    delete timers.current[key];
    const animate = prefsRef.current.animations;
    setToasts(t => t.map(x => (x.key === key ? { ...x, leaving: true } : x)));
    window.setTimeout(() => setToasts(t => t.filter(x => x.key !== key)), animate ? 280 : 0);
  }, []);

  const armToast = useCallback((key: string, ms: number) => {
    window.clearTimeout(timers.current[key]?.id);
    timers.current[key] = { id: window.setTimeout(() => dropToast(key), ms), start: Date.now(), left: ms };
  }, [dropToast]);

  const pushToasts = useCallback((fresh: NotificationItem[]) => {
    if (!prefsRef.current.toasts || fresh.length === 0) return;
    const rank = (t: NotifType) => (t === 'error' ? 0 : t === 'warning' ? 1 : 2);
    const picked = [...fresh].sort((a, b) => rank(a.type) - rank(b.type)).slice(0, 3);
    const created = picked.map(item => ({ key: `${sig(item)}@${Date.now()}`, item, leaving: false }));
    setToasts(t => [...t, ...created].slice(-3));
    created.forEach(t => armToast(t.key, TOAST_LIFE));
  }, [armToast]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    setLoading(true);
    const next = await buildNotifications();
    const st = stateRef.current;
    const visible = next.filter(n => !st.dismissed.includes(sig(n)));

    if (seenRef.current === null) {
      seenRef.current = new Set(next.map(sig));          // first load: no toast storm at login
    } else {
      const seen = seenRef.current;
      const fresh = visible.filter(n => !seen.has(sig(n)) && !st.read.includes(sig(n)));
      next.forEach(n => seen.add(sig(n)));
      if (fresh.length) {
        pushToasts(fresh);
        setRing(true);
        window.setTimeout(() => setRing(false), 1100);
      }
    }
    setItems(next);
    setLoading(false);
  }, [pushToasts]);

  useEffect(() => {
    refresh();
    const t = window.setInterval(refresh, 5 * 60_000);
    return () => window.clearInterval(t);
  }, [refresh]);

  useEffect(() => () => { Object.values(timers.current).forEach(t => window.clearTimeout(t.id)); }, []);

  // ── Open / close ──────────────────────────────────────────────────────────
  const close = useCallback(() => {
    if (!open || closing) return;
    if (!prefsRef.current.animations) { setOpen(false); return; }
    setClosing(true);
    window.setTimeout(() => { setOpen(false); setClosing(false); }, 170);
  }, [open, closing]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (rootRef.current && !rootRef.current.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open, close]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const visible = useMemo(() => items.filter(n => !state.dismissed.includes(sig(n))), [items, state.dismissed]);
  const isRead = (n: NotificationItem) => state.read.includes(sig(n));
  const unreadCount = visible.filter(n => !isRead(n)).length;
  const shown = filter === 'unread' ? visible.filter(n => !isRead(n)) : visible;
  const fresh = shown.filter(n => !isRead(n));
  const earlier = shown.filter(isRead);

  // ── Actions ───────────────────────────────────────────────────────────────
  const markRead = (n: NotificationItem) => {
    if (!isRead(n)) commit({ ...stateRef.current, read: [...stateRef.current.read, sig(n)] });
  };
  const markAll = () => commit({ ...stateRef.current, read: Array.from(new Set([...stateRef.current.read, ...visible.map(sig)])) });
  const dismiss = (n: NotificationItem) => {
    const apply = () => {
      setLeaving(s => { const c = new Set(s); c.delete(sig(n)); return c; });
      commit({ read: [...stateRef.current.read, sig(n)], dismissed: [...stateRef.current.dismissed, sig(n)] });
    };
    if (!prefs.animations) { apply(); return; }
    setLeaving(s => new Set(s).add(sig(n)));
    window.setTimeout(apply, 260);
  };
  const run = (n: NotificationItem) => {
    markRead(n);
    close();
    openWindow(n.actionPath);
  };

  const pauseToast = (key: string) => {
    const t = timers.current[key];
    if (!t) return;
    window.clearTimeout(t.id);
    t.left = Math.max(800, t.left - (Date.now() - t.start));
  };
  const resumeToast = (key: string) => {
    const t = timers.current[key];
    if (t) armToast(key, t.left);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const bubble = prefs.style === 'bubble';
  const surfaceVars = glassVars(prefs.glass, prefs.glassStrength);
  const motionClass = prefs.animations ? '' : 'tb-still';

  const renderItem = (n: NotificationItem, i: number) => {
    const read = isRead(n);
    return (
      <div
        key={sig(n)}
        className={`tb-item${bubble ? ' tb-surface' : ''}`}
        data-type={n.type}
        data-read={read}
        data-leaving={leaving.has(sig(n))}
        style={{ ['--tb-i' as string]: Math.min(i, 8) }}
      >
        <div className="tb-ico">{ICONS[n.icon]}</div>
        <div className="tb-body">
          <div className="tb-row">
            <span className="tb-name">{n.title}</span>
            <span className="tb-time">{timeAgo(n.time)}</span>
          </div>
          <p className="tb-desc" style={{ margin: 0 }}>{n.detail}</p>
          {n.actionLabel && (
            <button className="tb-act" onClick={() => run(n)}>
              {n.actionLabel} <ArrowRight size={12} />
            </button>
          )}
        </div>
        {!read && <span className="tb-dot" aria-label="Unread" />}
        <button className="tb-x" title="Dismiss" aria-label="Dismiss notification" onClick={() => dismiss(n)}>
          <X size={13} />
        </button>
      </div>
    );
  };

  let idx = 0;
  const list = loading && items.length === 0 ? (
    <div className="tb-list">
      {[0, 1, 2].map(k => (
        <div className="tb-skel" key={k}>
          <i style={{ width: 36, height: 36, borderRadius: '50%' }} />
          <div style={{ flex: 1, display: 'grid', gap: 8 }}>
            <i style={{ height: 12, width: '60%' }} />
            <i style={{ height: 10, width: '90%' }} />
          </div>
        </div>
      ))}
    </div>
  ) : shown.length === 0 ? (
    <div className="tb-empty">
      <div className="tb-empty-ico"><Sparkles size={24} /></div>
      <b>{filter === 'unread' ? 'Nothing unread' : "You're all caught up"}</b>
      <span>{filter === 'unread' ? 'Every alert has been read.' : 'New alerts will show up here.'}</span>
    </div>
  ) : (
    <div className="tb-list">
      {fresh.length > 0 && earlier.length > 0 && <div className="tb-group">New</div>}
      {fresh.map(n => renderItem(n, idx++))}
      {earlier.length > 0 && fresh.length > 0 && <div className="tb-group">Earlier</div>}
      {earlier.map(n => renderItem(n, idx++))}
    </div>
  );

  const actions = (
    <>
      <button className="tb-iconbtn" title="Refresh" aria-label="Refresh" onClick={refresh}>
        <RefreshCw size={15} className={loading ? 'tb-spin' : ''} />
      </button>
      <button className="tb-iconbtn" title="Mark all as read" aria-label="Mark all as read" disabled={unreadCount === 0} onClick={markAll}>
        <CheckCheck size={16} />
      </button>
    </>
  );

  const segment = (
    <div className="tb-seg" role="group" aria-label="Filter">
      <span className="tb-seg-thumb" style={{ transform: `translateX(${filter === 'unread' ? '100%' : '0'})` }} />
      <button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All</button>
      <button aria-pressed={filter === 'unread'} onClick={() => setFilter('unread')}>
        Unread{unreadCount > 0 ? ` · ${unreadCount}` : ''}
      </button>
    </div>
  );

  const footer = (
    <div className="tb-foot">
      <button onClick={() => { close(); openWindow('/utility/notification-centre'); }}>
        <Bell size={14} /> Notification Centre
      </button>
      <button onClick={() => { close(); openWindow('/utility/communication-center'); }}>
        <MessageSquare size={14} /> Communication Hub
      </button>
    </div>
  );

  return (
    <div className={`tb-root ${motionClass}`} data-shape={prefs.shape} ref={rootRef} style={{ position: 'relative' }}>
      <button
        className={`tb-bell${ring ? ' tb-ring' : ''}`}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Notifications"
        onClick={() => (open ? close() : setOpen(true))}
      >
        {unreadCount > 0 ? <BellRing size={19} /> : <Bell size={19} />}
        {unreadCount > 0 && <span key={unreadCount} className="tb-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div
          className={`tb-pop${bubble ? '' : ' tb-surface'}`}
          data-style={prefs.style}
          data-closing={closing}
          role="dialog"
          aria-label="Notifications"
          style={surfaceVars}
        >
          {bubble ? (
            <div className="tb-bar tb-surface">
              <span className="tb-title">Notifications</span>
              {unreadCount > 0 && <span className="tb-count">{unreadCount} new</span>}
              <span className="tb-spacer" />
              {actions}
            </div>
          ) : (
            <div className="tb-head">
              <span className="tb-title">Notifications</span>
              {unreadCount > 0 && <span className="tb-count">{unreadCount} new</span>}
              <span className="tb-spacer" />
              {actions}
            </div>
          )}
          {segment}
          {list}
          {footer}
        </div>
      )}

      {toasts.length > 0 && (
        <div className={`tb-root tb-toasts ${motionClass}`} data-pos={prefs.toastPosition} data-shape={prefs.shape} style={surfaceVars}>
          {toasts.map(t => (
            <div
              key={t.key}
              className="tb-toast tb-surface"
              data-type={t.item.type}
              data-leaving={t.leaving}
              role="status"
              onMouseEnter={() => pauseToast(t.key)}
              onMouseLeave={() => resumeToast(t.key)}
              onClick={() => { markRead(t.item); dropToast(t.key); if (t.item.actionPath) openWindow(t.item.actionPath); else setOpen(true); }}
              style={{ ['--tb-life' as string]: `${TOAST_LIFE}ms` }}
            >
              <div className="tb-ico" style={{ color: `var(--tb-${t.item.type})`, background: `color-mix(in srgb, var(--tb-${t.item.type}) 14%, transparent)` }}>
                {ICONS[t.item.icon]}
              </div>
              <div className="tb-body">
                <div className="tb-name">{t.item.title}</div>
                <p className="tb-desc" style={{ margin: '2px 0 0' }}>{t.item.detail}</p>
              </div>
              <button
                className="tb-x"
                aria-label="Close"
                onClick={e => { e.stopPropagation(); dropToast(t.key); }}
              >
                <X size={13} />
              </button>
              <span className="tb-toast-bar" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
