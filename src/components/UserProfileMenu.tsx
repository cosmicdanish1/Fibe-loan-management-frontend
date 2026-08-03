import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  User, Bell, LogOut, Settings, ChevronDown,
  X, AlertTriangle, CheckCircle, XCircle, Clock,
  MessageSquare, RefreshCw, ArrowRight, Database,
} from 'lucide-react';
import { useAuth } from '../auth/context/AuthContext';
import { apiService } from '../services/api';

// ─── Types ───────────────────────────────────────────────────────────────────

type NotifType = 'error' | 'warning' | 'info' | 'success';

interface NotificationItem {
  id: string;
  type: NotifType;
  icon: React.ReactNode;
  title: string;
  detail: string;
  time: Date;
  read: boolean;
  actionLabel?: string;
  actionPath?: string;
}

// ─── Style map by type ────────────────────────────────────────────────────────

const TYPE_STYLE: Record<NotifType, { bg: string; text: string; dot: string; border: string }> = {
  error:   { bg: 'bg-red-50',   text: 'text-red-600',   dot: 'bg-red-500',   border: 'border-red-500'   },
  warning: { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500', border: 'border-amber-400' },
  info:    { bg: 'bg-blue-50',  text: 'text-blue-600',  dot: 'bg-blue-500',  border: 'border-blue-500'  },
  success: { bg: 'bg-green-50', text: 'text-green-600', dot: 'bg-green-500', border: 'border-green-500' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const UserProfileMenu: React.FC = () => {
  const { user, logout } = useAuth();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [items,       setItems]       = useState<NotificationItem[]>([]);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef   = useRef<HTMLDivElement>(null);

  // ── Close dropdowns on outside click ──────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (notifRef.current   && !notifRef.current.contains(e.target as Node))   setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Fetch & build notifications ───────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    const next: NotificationItem[] = [];

    try {
      // 1. Pending delivery count
      const stats = await apiService.getNotificationStats();
      if (stats.success && (stats.data?.pendingCount ?? 0) > 0) {
        next.push({
          id: 'pending-delivery',
          type: 'warning',
          icon: <MessageSquare size={10} />,
          title: `${stats.data!.pendingCount} Messages Pending Delivery`,
          detail: 'Notifications queued but not yet delivered to members.',
          time: new Date(),
          read: false,
          actionLabel: 'View Hub',
          actionPath: '/communication-hub',
        });
      }

      // 2. Recent notification history — failed + pending individual items
      const hist = await apiService.getNotificationHistory(50);
      if (hist.success && Array.isArray(hist.data)) {
        const failed  = hist.data.filter((h: any) => h.status === 'FAILED');
        const pending = hist.data.filter((h: any) => h.status === 'PENDING').slice(0, 3);

        if (failed.length > 0) {
          next.push({
            id: 'failed-delivery',
            type: 'error',
            icon: <XCircle size={10} />,
            title: `${failed.length} Notification${failed.length > 1 ? 's' : ''} Failed`,
            detail: `Last failure — ${failed[0]?.channel ?? 'SMS'} to Member #${failed[0]?.memberNo ?? '—'}`,
            time: new Date(failed[0]?.createdAt ?? Date.now()),
            read: false,
            actionLabel: 'Investigate',
            actionPath: '/communication-hub',
          });
        }

        pending.forEach((h: any, idx: number) => {
          const msg: string = h.message ?? '';
          next.push({
            id: `pend-${h.id ?? idx}`,
            type: 'info',
            icon: <Clock size={10} />,
            title: `${h.channel ?? 'MSG'} → Member #${h.memberNo ?? '—'}`,
            detail: msg.length > 70 ? msg.slice(0, 70) + '…' : msg || 'Awaiting delivery',
            time: new Date(h.createdAt ?? Date.now()),
            read: false,
          });
        });
      }
    } catch {
      /* silent — API may not be running */
    }

    // 3. Day-end reminder (local — after 5 PM)
    if (new Date().getHours() >= 17) {
      next.push({
        id: 'day-end',
        type: 'warning',
        icon: <AlertTriangle size={10} />,
        title: 'Day End Process Due',
        detail: "It's past 5 PM — please ensure today's Day End has been completed.",
        time: new Date(),
        read: false,
        actionLabel: 'Go to Day End',
        actionPath: '/day-end',
      });
    }

    // 4. Database backup reminder (stored in localStorage after each backup)
    const lastBackupRaw = localStorage.getItem('lastBackupDate');
    if (lastBackupRaw) {
      const daysSince = Math.floor((Date.now() - new Date(lastBackupRaw).getTime()) / 86_400_000);
      if (daysSince >= 3) {
        next.push({
          id: 'backup-overdue',
          type: 'warning',
          icon: <Database size={10} />,
          title: `Backup Overdue — ${daysSince} Day${daysSince > 1 ? 's' : ''}`,
          detail: `Last backup was ${daysSince} days ago. Back up the database to prevent data loss.`,
          time: new Date(lastBackupRaw),
          read: false,
          actionLabel: 'Backup Now',
          actionPath: '/database-backup',
        });
      }
    } else {
      next.push({
        id: 'no-backup',
        type: 'warning',
        icon: <Database size={10} />,
        title: 'No Backup on Record',
        detail: 'No database backup has been recorded. Create one now to safeguard your data.',
        time: new Date(),
        read: false,
        actionLabel: 'Backup Now',
        actionPath: '/database-backup',
      });
    }

    // Merge with current read state so marking-read survives a refresh
    setItems(prev => {
      const readSet = new Set(prev.filter(p => p.read).map(p => p.id));
      return next.map(n => ({ ...n, read: readSet.has(n.id) }));
    });
    setLoading(false);
  }, []);

  // Fetch on mount + every 5 minutes
  useEffect(() => {
    fetchNotifications();
    const t = setInterval(fetchNotifications, 5 * 60_000);
    return () => clearInterval(t);
  }, [fetchNotifications]);

  const unread = items.filter(n => !n.read).length;

  const markAll  = () => setItems(p => p.map(n => ({ ...n, read: true })));
  const markOne  = (id: string) => setItems(p => p.map(n => n.id === id ? { ...n, read: true } : n));

  const handleAction = (path?: string, id?: string) => {
    if (id) markOne(id);
    setNotifOpen(false);
    if (path) window.electronAPI?.openNewWindow?.(path);
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    let ok = false;
    if ((window as any).electronAPI?.showMessageBox) {
      const res = await (window as any).electronAPI.showMessageBox({
        type: 'question', title: 'electron-react-ts',
        message: 'Confirm Logout', detail: 'Are you sure you want to logout?',
        buttons: ['Logout', 'Cancel'], defaultId: 1, cancelId: 1,
      });
      ok = res?.response === 0;
    } else {
      ok = window.confirm('Are you sure you want to logout?');
    }
    if (ok) logout();
  };

  if (!user) return null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex items-center gap-3">

      {/* ────── NOTIFICATION BELL ────── */}
      <div className="relative" ref={notifRef}>
        <button
          onClick={() => { setNotifOpen(v => !v); setProfileOpen(false); }}
          className="relative p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all duration-200"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute top-0 right-0 bg-red-500 text-white fz-small font-black rounded-full w-4 h-4 flex items-center justify-center leading-none">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {/* ── Panel ── */}
        {notifOpen && (
          <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200/80 rounded-xl shadow-2xl z-[200] overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-slate-900 to-indigo-900">
              <div className="flex items-center gap-1.5">
                <Bell size={11} className="text-indigo-300" />
                <span className="fz-small font-black text-white uppercase tracking-[0.18em]">Alerts</span>
                {unread > 0 && (
                  <span className="bg-red-500 text-white fz-mini font-black px-1.5 py-0.5 rounded-full leading-none">
                    {unread}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={fetchNotifications}
                  className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                  title="Refresh"
                >
                  <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
                </button>
                {unread > 0 && (
                  <button
                    onClick={markAll}
                    className="fz-mini font-black text-slate-400 hover:text-white transition-colors uppercase tracking-wider px-1.5 py-1 hover:bg-white/10 rounded"
                  >
                    ✓ All
                  </button>
                )}
                <button
                  onClick={() => setNotifOpen(false)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                >
                  <X size={10} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[264px] overflow-y-auto divide-y divide-gray-100/80">
              {loading ? (
                <div className="flex items-center justify-center gap-1.5 py-5 text-gray-400">
                  <RefreshCw size={11} className="animate-spin text-indigo-400" />
                  <span className="fz-tiny font-black uppercase tracking-wide">Loading…</span>
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-7 gap-1.5">
                  <CheckCircle size={20} className="text-green-400" />
                  <p className="fz-small font-black text-gray-600 uppercase tracking-wider">All Clear</p>
                  <p className="fz-tiny text-gray-400">No alerts at this time</p>
                </div>
              ) : (
                items.map(n => {
                  const s = TYPE_STYLE[n.type];
                  return (
                    <div
                      key={n.id}
                      className={`flex gap-2 px-2.5 py-1.5 border-l-[3px] transition-colors ${n.read ? 'bg-white' : 'bg-slate-50/80'} ${s.border}`}
                    >
                      {/* Icon chip */}
                      <div className={`shrink-0 w-[18px] h-[18px] mt-0.5 rounded flex items-center justify-center ${s.bg} ${s.text}`}>
                        {n.icon}
                      </div>

                      {/* Body */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`fz-small font-black text-slate-800 leading-tight truncate ${n.read ? 'opacity-40' : ''}`}>
                            {n.title}
                          </p>
                          {!n.read && <div className={`shrink-0 w-1 h-1 rounded-full ${s.dot}`} />}
                        </div>
                        <p className="fz-tiny text-slate-500 leading-tight line-clamp-1 mt-0.5">
                          {n.detail}
                        </p>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="fz-mini text-slate-400 tabular-nums font-medium">
                            {timeAgo(n.time)}
                          </span>
                          {n.actionLabel && (
                            <button
                              onClick={() => handleAction(n.actionPath, n.id)}
                              className={`flex items-center gap-0.5 fz-mini font-black uppercase tracking-wide ${s.text} hover:opacity-70 transition-opacity`}
                            >
                              {n.actionLabel} <ArrowRight size={8} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-3 py-1.5 border-t border-gray-100 bg-slate-50 flex items-center justify-between">
              <span className="fz-mini text-slate-400 font-black uppercase tracking-wider">
                {items.length} alert{items.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => { setNotifOpen(false); window.electronAPI?.openNewWindow?.('/communication-hub'); }}
                className="flex items-center gap-0.5 fz-mini font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-wider transition-colors"
              >
                Comm Hub <ArrowRight size={8} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ────── USER PROFILE DROPDOWN ────── */}
      <div className="relative" ref={profileRef}>
        <button
          onClick={() => { setProfileOpen(v => !v); setNotifOpen(false); }}
          className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
        >
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0">
            {user.username?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <span className="font-medium text-sm hidden sm:block">{user.username}</span>
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
        </button>

        {profileOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-[200]">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">{user.username}</p>
              <p className="text-xs text-gray-500 mt-0.5">{user.email ?? `${user.username}@trust.in`}</p>
              {user.role && <p className="text-xs text-blue-600 mt-1 font-medium">Role: {user.role}</p>}
            </div>

            <div className="py-1">
              <button
                onClick={() => {
                  setProfileOpen(false);
                  if (window.electronAPI?.openNewWindow) {
                    window.electronAPI.openNewWindow('/my-profile');
                  } else {
                    window.location.hash = '#/my-profile';
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <User className="w-4 h-4" /> My Profile
              </button>
              <button
                onClick={() => { setProfileOpen(false); window.electronAPI?.openNewWindow?.('/change-password'); }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Settings className="w-4 h-4" /> Change Password
              </button>
            </div>

            <div className="border-t border-gray-100 pt-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfileMenu;
