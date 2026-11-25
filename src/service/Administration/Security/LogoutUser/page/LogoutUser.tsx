// page/LogoutUser.tsx
// Logout User: who is using the application right now (one card per user, a green dot when live, one click to log
// them out) and how the application is being used (sign-ins per day, busiest hours, most active people).

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LogOut, X, Search, RefreshCw, Radio, BarChart3, Clock, Monitor, CalendarDays } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiService } from '../../../../../services/api';
import { useAuth } from '../../../../../auth/context/AuthContext';
import { showDialog4 as showDialog } from '@/utils/dialog';
import {
  LiveUser, initials, durationText, timeText, dateText, filterUsers, barPercent, busiestHours, hourText,
} from '../utils/sessions';

interface LogoutUserProps { className?: string }

type Tab = 'live' | 'analytics';

/** How often the card list refreshes by itself (the apps send a heartbeat every minute). */
export const LIVE_REFRESH_MS = 15000;

const closeWindow = () => {
  const api = (window as any).electronAPI;
  if (api?.ipcRenderer?.send) api.ipcRenderer.send('window-close');
  else window.close();
};

const unwrap = (res: any) => (res?.data !== undefined && res?.success !== false ? res.data : null);

const LogoutUser: React.FC<LogoutUserProps> = ({ className = '' }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('live');

  // ── live users
  const [users, setUsers] = useState<LiveUser[]>([]);
  const [liveCount, setLiveCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [search, setSearch] = useState('');
  const [liveOnly, setLiveOnly] = useState(false);
  const [busy, setBusy] = useState<string | null>(null); // user name being logged out
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const loadLive = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = unwrap(await apiService.getLiveUsers());
      if (!mounted.current) return;
      if (data && Array.isArray(data.users)) {
        setUsers(data.users);
        setLiveCount(Number(data.liveCount) || 0);
        setUpdatedAt(new Date());
        setFailed(false);
      } else {
        setFailed(true);
      }
    } catch {
      if (mounted.current) setFailed(true);
    } finally {
      if (mounted.current) { setLoaded(true); setRefreshing(false); }
    }
  }, []);

  useEffect(() => {
    loadLive();
    const id = setInterval(loadLive, LIVE_REFRESH_MS);
    return () => clearInterval(id);
  }, [loadLive]);

  const shown = useMemo(() => filterUsers(users, search, liveOnly), [users, search, liveOnly]);

  const confirmLogout = async (name: string, isSelf: boolean): Promise<boolean> => {
    const api = (window as any).electronAPI;
    const message = isSelf ? `Log out your own account "${name}"?` : `Log out "${name}"?`;
    const detail = isSelf
      ? 'This is the account you are signed in with. Your session ends at once and the application closes, the same as the regular Logout button.'
      : 'Their session ends at once and they must sign in again.';
    if (api?.showMessageBox) {
      const res = await api.showMessageBox({
        type: 'warning', title: t('Confirm logout'), message, detail,
        buttons: ['Cancel', 'Log out'], defaultId: 0, cancelId: 0,
      });
      return res.response === 1;
    }
    return window.confirm(`${message}\n\n${detail}`);
  };

  const logOut = async (u: LiveUser) => {
    if (busy) return;
    const isSelf = !!user?.username && u.username.trim().toLowerCase() === user.username.trim().toLowerCase();
    if (!(await confirmLogout(u.username, isSelf))) return;
    setBusy(u.username);
    try {
      const res: any = await apiService.forceLogoutUser(u.username);
      if (res?.success) {
        // the card goes quiet at once; the next refresh confirms it
        setUsers((prev) => prev.map((x) => (x.userId === u.userId ? { ...x, live: false, sessionMinutes: null } : x)));
        setLiveCount((c) => Math.max(0, c - (u.live ? 1 : 0)));
        loadLive();
      } else {
        await showDialog('error', t('Logout failed'), res?.error || res?.message || t('Could not end the session.'), '');
      }
    } catch (err: any) {
      await showDialog('error', t('Logout failed'), err?.message || t('Check the server connection.'), '');
    } finally {
      if (mounted.current) setBusy(null);
    }
  };

  // ── analytics (loaded when the tab is opened, and again when the range changes)
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<any>(null);
  const [statsState, setStatsState] = useState<'idle' | 'loading' | 'error'>('idle');

  useEffect(() => {
    if (tab !== 'analytics') return;
    let cancelled = false;
    setStatsState('loading');
    (async () => {
      try {
        const data = unwrap(await apiService.getSessionAnalytics(days));
        if (cancelled) return;
        if (data) { setStats(data); setStatsState('idle'); } else setStatsState('error');
      } catch {
        if (!cancelled) setStatsState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [tab, days]);

  return (
    <div className={`app-window lu-form ${className}`}>
      <div className="aw-header">
        <div className="min-w-0">
          <div className="lu-crumb">{t('Administration')}</div>
          <h1 className="aw-title">{t('Logout user')}</h1>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="lu-mode" data-testid="lu-live-chip">
            <span className="lu-mode-dot" aria-hidden="true" />
            {t('{{n}} live now', { n: liveCount })}
          </span>
          <button type="button" onClick={closeWindow} className="aw-btn aw-btn-ghost">
            <X size={13} /> {t('Close')}
          </button>
        </div>
      </div>

      <div className="aw-tabs" role="tablist">
        <button type="button" role="tab" id="lu-tab-live" aria-selected={tab === 'live'} className="aw-tab" onClick={() => setTab('live')}>
          <Radio size={14} /> {t('Live users')}
        </button>
        <button type="button" role="tab" id="lu-tab-analytics" aria-selected={tab === 'analytics'} className="aw-tab" onClick={() => setTab('analytics')}>
          <BarChart3 size={14} /> {t('Analytics')}
        </button>
      </div>

      <div className="aw-content">
        {tab === 'live' && (
          <div className="aw-stack" role="tabpanel" aria-labelledby="lu-tab-live">
            <div className="lu-toolbar">
              <div className="lu-search">
                <Search size={14} aria-hidden="true" />
                <input
                  className="aw-input"
                  aria-label={t('Search users')}
                  placeholder={t('Search')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="aw-chips" role="group" aria-label={t('Show')}>
                <button type="button" role="checkbox" aria-checked={!liveOnly} className="aw-chip" onClick={() => setLiveOnly(false)}>{t('Everyone')}</button>
                <button type="button" role="checkbox" aria-checked={liveOnly} className="aw-chip" onClick={() => setLiveOnly(true)}>{t('Live only')}</button>
              </div>
              <span className="lu-updated" data-testid="lu-updated">
                {updatedAt ? t('Updated {{time}}', { time: updatedAt.toLocaleTimeString('en-IN', { hour12: false }) }) : ''}
              </span>
              <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" onClick={loadLive} disabled={refreshing} aria-label={t('Refresh')}>
                <RefreshCw size={12} className={refreshing ? 'aw-spin' : ''} /> {t('Refresh')}
              </button>
            </div>

            {failed && (
              <p className="lu-note" role="alert">{t('Could not load the users. Check the server connection.')}</p>
            )}
            {loaded && !failed && shown.length === 0 && (
              <p className="lu-note">{liveOnly && !search ? t('Nobody is live right now.') : t('No users match.')}</p>
            )}

            <div className="lu-grid">
              {shown.map((u) => {
                const isSelf = !!user?.username && u.username.trim().toLowerCase() === user.username.trim().toLowerCase();
                return (
                  <article
                    key={u.userId}
                    className={`lu-card ${u.live ? 'is-live' : 'is-off'}`}
                    data-testid={`lu-card-${u.username}`}
                    data-live={u.live ? 'true' : 'false'}
                  >
                    {u.live && <span className="lu-live-dot" role="img" aria-label={t('Live')} />}
                    <div className="lu-card-top">
                      <span className="lu-avatar" aria-hidden="true">{initials(u)}</span>
                      <div className="min-w-0">
                        <div className="lu-name">
                          {u.username}
                          {isSelf && <span className="lu-you">{t('You')}</span>}
                        </div>
                        <div className="lu-sub">{u.fullName ? `${u.fullName} · ${u.role}` : u.role}</div>
                      </div>
                    </div>
                    <dl className="lu-facts">
                      <div><dt><Clock size={12} aria-hidden="true" />{u.live ? t('Signed in') : t('Last sign-in')}</dt>
                        <dd>{timeText(u.loginTime)}{u.live && u.sessionMinutes !== null ? ` · ${durationText(u.sessionMinutes)}` : ''}</dd></div>
                      <div><dt><CalendarDays size={12} aria-hidden="true" />{t('Login date')}</dt>
                        <dd>{dateText(u.loginDate)}</dd></div>
                      {u.live && (u.host || u.ip) && (
                        <div><dt><Monitor size={12} aria-hidden="true" />{t('Computer')}</dt>
                          <dd>{[u.host, u.ip].filter(Boolean).join(' · ')}</dd></div>
                      )}
                    </dl>
                    {u.live && (
                      <button
                        type="button"
                        className="aw-btn aw-btn-secondary aw-btn-sm lu-logout"
                        disabled={busy !== null}
                        onClick={() => logOut(u)}
                        aria-label={t('Log out {{name}}', { name: u.username })}
                      >
                        {busy === u.username ? <RefreshCw size={12} className="aw-spin" /> : <LogOut size={12} />}
                        {t('Log out')}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'analytics' && (
          <div className="aw-stack" role="tabpanel" aria-labelledby="lu-tab-analytics">
            <div className="lu-toolbar">
              <div className="aw-chips" role="group" aria-label={t('Period')}>
                {[7, 30, 90].map((d) => (
                  <button key={d} type="button" role="checkbox" aria-checked={days === d} className="aw-chip" onClick={() => setDays(d)}>
                    {t('{{n}} days', { n: d })}
                  </button>
                ))}
              </div>
            </div>

            {statsState === 'error' && <p className="lu-note" role="alert">{t('Could not load the analytics. Check the server connection.')}</p>}
            {!stats && statsState === 'loading' && <p className="lu-note">{t('Loading')}</p>}

            {stats && <Analytics stats={stats} t={t} />}
          </div>
        )}
      </div>

      <style>{`
        .lu-form .lu-crumb { font-size: calc(var(--type-body-size) - 1px); color: var(--aw-muted); margin-bottom: 2px; }
        .lu-form .lu-mode { display: inline-flex; align-items: center; gap: 8px; height: 32px; padding: 0 12px; border-radius: 999px; background: color-mix(in srgb, var(--aw-success) 10%, var(--aw-surface)); color: var(--aw-text); font-size: var(--type-label-size); font-weight: 600; font-variant-numeric: tabular-nums; }
        .lu-form .lu-mode-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--aw-success); }
        .lu-form .lu-toolbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .lu-form .lu-search { position: relative; flex: 1 1 220px; max-width: 320px; }
        .lu-form .lu-search svg { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--aw-muted); pointer-events: none; }
        .lu-form .lu-search .aw-input { padding-left: 32px; width: 100%; }
        .lu-form .lu-updated { margin-left: auto; color: var(--aw-muted); font-size: var(--type-label-size); font-variant-numeric: tabular-nums; }
        .lu-form .lu-note { color: var(--aw-muted); font-size: var(--type-body-size); margin: 8px 0; }
        .lu-form .lu-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
        .lu-form .lu-card { position: relative; display: flex; flex-direction: column; gap: 12px; padding: 16px; border-radius: 12px; border: 1px solid var(--aw-border); background: var(--aw-surface); transition: opacity .2s ease, border-color .2s ease; }
        .lu-form .lu-card.is-off { opacity: .5; }
        .lu-form .lu-card.is-live { border-color: color-mix(in srgb, var(--aw-success) 35%, var(--aw-border)); }
        .lu-form .lu-live-dot { position: absolute; top: 12px; right: 12px; width: 8px; height: 8px; border-radius: 50%; background: var(--aw-success); box-shadow: 0 0 0 3px color-mix(in srgb, var(--aw-success) 22%, transparent); }
        .lu-form .lu-card-top { display: flex; align-items: center; gap: 12px; padding-right: 16px; }
        .lu-form .lu-avatar { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; flex: none; border-radius: 50%; background: var(--aw-surface-muted); color: var(--aw-text); font-size: var(--type-label-size); font-weight: 600; }
        .lu-form .lu-name { display: flex; align-items: center; gap: 8px; color: var(--aw-text); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .lu-form .lu-you { padding: 0 6px; border-radius: 999px; background: color-mix(in srgb, var(--aw-accent) 12%, var(--aw-surface)); color: var(--aw-accent); font-size: calc(var(--type-label-size) - 1px); font-weight: 600; }
        .lu-form .lu-sub { color: var(--aw-muted); font-size: var(--type-label-size); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .lu-form .lu-facts { display: grid; gap: 8px; margin: 0; }
        .lu-form .lu-facts > div { display: flex; justify-content: space-between; gap: 12px; font-size: var(--type-label-size); }
        .lu-form .lu-facts dt { display: inline-flex; align-items: center; gap: 6px; color: var(--aw-muted); }
        .lu-form .lu-facts dd { margin: 0; color: var(--aw-text); font-variant-numeric: tabular-nums; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .lu-form .lu-logout { align-self: flex-start; }
        .lu-form .lu-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
        .lu-form .lu-stat { padding: 16px; border-radius: 12px; border: 1px solid var(--aw-border); background: var(--aw-surface); }
        .lu-form .lu-stat-label { color: var(--aw-muted); font-size: var(--type-label-size); }
        .lu-form .lu-stat-value { margin-top: 4px; color: var(--aw-text); font-size: 28px; font-weight: 500; line-height: 1.1; font-variant-numeric: tabular-nums; }
        .lu-form .lu-split { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 16px; align-items: start; }
        .lu-form .lu-chart { width: 100%; height: 220px; display: block; }
        .lu-form .lu-chart text { fill: var(--aw-muted); font-size: 11px; font-variant-numeric: tabular-nums; }
        .lu-form .lu-rank { display: grid; gap: 12px; margin: 0; padding: 0; list-style: none; }
        .lu-form .lu-rank li { display: grid; gap: 4px; font-size: var(--type-label-size); }
        .lu-form .lu-rank-row { display: flex; justify-content: space-between; gap: 8px; color: var(--aw-text); font-variant-numeric: tabular-nums; }
        .lu-form .lu-rank-row span:last-child { color: var(--aw-muted); }
        .lu-form .lu-bar { height: 4px; border-radius: 2px; background: var(--aw-surface-muted); overflow: hidden; }
        .lu-form .lu-bar > i { display: block; height: 100%; background: var(--aw-accent); border-radius: 2px; }
        .lu-form .lu-bar.is-quiet > i { background: color-mix(in srgb, var(--aw-text) 35%, transparent); }
        .lu-form .lu-meta { color: var(--aw-muted); font-size: var(--type-label-size); }
        @media (max-width: 900px) { .lu-form .lu-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); } .lu-form .lu-split { grid-template-columns: minmax(0, 1fr); } }
        @media (prefers-reduced-motion: reduce) { .lu-form .lu-card { transition: none; } }
      `}</style>
    </div>
  );
};

/** The Analytics tab body: four numbers, one main chart, two short lists. */
const Analytics: React.FC<{ stats: any; t: (s: string, o?: any) => string }> = ({ stats, t }) => {
  const totals = stats.totals || {};
  const perDay: { day: string; sessions: number; people: number }[] = stats.perDay || [];
  const hours = busiestHours(stats.hours || []);
  const maxHour = hours[0]?.sessions || 0;
  const top: { username: string; sessions: number; lastLogin: string | null }[] = stats.topUsers || [];
  const maxTop = top[0]?.sessions || 0;

  // main chart: sign-ins per day as one line over a muted grid; the latest day carries the accent
  const W = 720, H = 220, L = 32, R = 8, T = 12, B = 24;
  const max = Math.max(1, ...perDay.map((d) => d.sessions));
  const niceMax = max <= 4 ? 4 : Math.ceil(max / 4) * 4;
  const x = (i: number) => L + (perDay.length <= 1 ? 0 : (i * (W - L - R)) / (perDay.length - 1));
  const y = (v: number) => T + (H - T - B) * (1 - v / niceMax);
  const path = perDay.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(d.sessions).toFixed(1)}`).join(' ');
  const last = perDay[perDay.length - 1];
  const everyNth = Math.max(1, Math.ceil(perDay.length / 6));

  return (
    <>
      <div className="lu-stats">
        <div className="lu-stat"><div className="lu-stat-label">{t('Sign-ins')}</div><div className="lu-stat-value" data-testid="lu-stat-sessions">{totals.sessions ?? 0}</div></div>
        <div className="lu-stat"><div className="lu-stat-label">{t('People')}</div><div className="lu-stat-value" data-testid="lu-stat-people">{totals.people ?? 0}</div></div>
        <div className="lu-stat"><div className="lu-stat-label">{t('Average session')}</div><div className="lu-stat-value" data-testid="lu-stat-avg">{totals.avgMinutes === null || totals.avgMinutes === undefined ? '—' : durationText(totals.avgMinutes)}</div></div>
        <div className="lu-stat"><div className="lu-stat-label">{t('Live now')}</div><div className="lu-stat-value" data-testid="lu-stat-live">{totals.liveNow ?? 0}</div></div>
      </div>

      <div className="lu-split">
        <section className="aw-card">
          <div className="aw-card-head"><h2 className="aw-card-title">{t('Sign-ins per day')}</h2></div>
          <svg className="lu-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('Sign-ins per day')} preserveAspectRatio="none">
            {[0, 1, 2, 3, 4].map((g) => {
              const v = (niceMax * g) / 4;
              return (
                <g key={g}>
                  <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="currentColor" strokeOpacity="0.08" />
                  <text x={L - 6} y={y(v) + 4} textAnchor="end">{v}</text>
                </g>
              );
            })}
            {perDay.length > 0 && <path d={path} fill="none" stroke="var(--aw-text)" strokeOpacity="0.55" strokeWidth="1.5" strokeLinejoin="round" />}
            {perDay.map((d, i) => (i % everyNth === 0 || i === perDay.length - 1) && (
              <text key={d.day} x={x(i)} y={H - 6} textAnchor="middle">{d.day.slice(5)}</text>
            ))}
            {last && <circle cx={x(perDay.length - 1)} cy={y(last.sessions)} r="4" fill="var(--aw-accent)" />}
          </svg>
          <p className="lu-meta">{t('Each point is one calendar day of sign-ins.')}</p>
        </section>

        <section className="aw-card">
          <div className="aw-card-head"><h2 className="aw-card-title">{t('Most active')}</h2></div>
          {top.length === 0 ? <p className="lu-meta">{t('No sign-ins in this period.')}</p> : (
            <ul className="lu-rank" data-testid="lu-top">
              {top.map((r) => (
                <li key={r.username}>
                  <div className="lu-rank-row"><span>{r.username}</span><span>{r.sessions}</span></div>
                  <div className="lu-bar"><i style={{ width: `${barPercent(r.sessions, maxTop)}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="lu-split">
        <section className="aw-card">
          <div className="aw-card-head"><h2 className="aw-card-title">{t('Busiest hours')}</h2></div>
          {hours.length === 0 ? <p className="lu-meta">{t('No sign-ins in this period.')}</p> : (
            <ul className="lu-rank" data-testid="lu-hours">
              {hours.map((h) => (
                <li key={h.hour}>
                  <div className="lu-rank-row"><span>{hourText(h.hour)}</span><span>{h.sessions}</span></div>
                  <div className="lu-bar is-quiet"><i style={{ width: `${barPercent(h.sessions, maxHour)}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="aw-card">
          <div className="aw-card-head"><h2 className="aw-card-title">{t('To look at')}</h2></div>
          <ul className="lu-rank">
            <li><div className="lu-rank-row"><span>{t('Never signed in')}</span><span data-testid="lu-never-in">{totals.neverSignedIn ?? 0}</span></div></li>
            <li><div className="lu-rank-row"><span>{t('Sessions never closed')}</span><span data-testid="lu-never-closed">{totals.neverClosed ?? 0}</span></div></li>
          </ul>
          <p className="lu-meta">{t('A session never closed means the app was shut without logging out.')}</p>
        </section>
      </div>
    </>
  );
};

export default LogoutUser;
