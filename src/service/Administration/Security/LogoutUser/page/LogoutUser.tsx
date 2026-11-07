// page/LogoutUser.tsx

import React, { useState, useEffect } from 'react';
import { localISODate } from '../../../../../utils/dates';
import {
  LogOut, X, Calendar, Clock, UserX, Search, Activity, Building2, UserCircle2, RefreshCw,
} from 'lucide-react';
import { Select } from 'antd';
import { apiService } from '../../../../../services/api';
import { useAuth } from '../../../../../auth/context/AuthContext';
import { useTranslation } from 'react-i18next';
import { showDialog4 as showDialog } from '@/utils/dialog';

interface LogoutUserProps {
  className?: string;
}

interface FormData {
  userName: string;
  loginDate: string;
  loginTime: string;
}

const closeWindow = () => {
  const api = (window as any).electronAPI;
  if (api?.ipcRenderer?.send) api.ipcRenderer.send('window-close');
  else window.close();
};

const LogoutUser: React.FC<LogoutUserProps> = ({ className = '' }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [formData, setFormData] = useState<FormData>({ userName: '', loginDate: '', loginTime: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [isMatrixVisible, setIsMatrixVisible] = useState(false);

  const [loggedInUsers, setLoggedInUsers] = useState<{ userid: number; susername: string }[]>([]);

  const loadLoggedInUsers = async () => {
    try {
      // /auth/usernames no longer exists; /auth/users-list is the authenticated replacement
      // (apiService attaches the JWT from localStorage, shared with child windows).
      const res: any = await apiService.get('/auth/users-list');
      const raw = res?.data ?? res ?? [];
      const list = Array.isArray(raw) ? raw : (raw?.data ?? []);
      setLoggedInUsers(Array.isArray(list) ? list : []);
    } catch { /* silent */ }
  };

  useEffect(() => {
    loadLoggedInUsers();
    handleShowUsers();
  }, []);

  const updateField = (field: keyof FormData, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const handleLogout = async () => {
    if (!formData.userName.trim()) {
      await showDialog('warning', t('Required'), t('Please select a user to log out.'), '');
      return;
    }

    // Nothing stops an admin from picking their own currently-active account
    // as the target — warn explicitly, since terminating your own session
    // here has the same effect as the regular Logout button (closes the app).
    const isSelf = !!user?.username &&
      formData.userName.trim().toLowerCase() === user.username.trim().toLowerCase();

    const confirmed = await (async () => {
      const api = (window as any).electronAPI;
      const message = isSelf
        ? `Force logout your OWN account "${formData.userName}"?`
        : `Force logout "${formData.userName}"?`;
      const detail = isSelf
        ? 'This is the account you are currently logged in as. Confirming will immediately end your session and close the application, the same as using the regular Logout button.'
        : 'This will immediately terminate their active session.';
      if (api?.showMessageBox) {
        const res = await api.showMessageBox({
          type: 'warning',
          title: t('Confirm Logout'),
          message,
          detail,
          buttons: ['Cancel', 'Logout'],
          defaultId: 0,
          cancelId: 0,
        });
        return res.response === 1;
      }
      return window.confirm(`${message}\n\n${detail}`);
    })();

    if (!confirmed) return;

    setIsLoading(true);
    try {
      // Backend only uses username — date/time are informational in UI only
      const response = await apiService.forceLogoutUser(formData.userName);
      if (response.success) {
        await showDialog(
          'info',
          t('Session Terminated'),
          t('"{{1}}" has been logged out.', { 1: formData.userName }),
          t('Their active session has been invalidated.')
        );
        handleClear();
        await loadLoggedInUsers();
        if (isMatrixVisible) await handleShowUsers();
      } else {
        await showDialog('error', t('Logout Failed'), response.error || t('Could not terminate session.'), '');
      }
    } catch (err: any) {
      await showDialog('error', t('System Error'), t('Session termination failed.'), err?.message || t('Check server connection.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowUsers = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.getActiveSessions();
      if (response.success && response.data) {
        setActiveSessions(response.data);
        setIsMatrixVisible(true);
      } else {
        await showDialog('error', t('Peek Failed'), t('Could not fetch active sessions.'), '');
      }
    } catch {
      await showDialog('error', t('Peek Failed'), t('Server unreachable.'), '');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => setFormData({ userName: '', loginDate: '', loginTime: '' });

  return (
    <div className={`app-window ${className}`}>
      {/* ── Header ── */}
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">{t('Session Manager')}</h1>
          <p className="aw-desc" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Building2 size={12} /> {t('Administrative Override')}
          </p>
        </div>
        <div className="aw-actions">
          <button type="button" onClick={handleClear} disabled={isLoading} className="aw-btn aw-btn-secondary">
            <X size={13} /> {t('Clear')}
          </button>
          <button type="button" onClick={handleLogout} disabled={isLoading || !formData.userName} className="aw-btn aw-btn-danger">
            {isLoading ? <RefreshCw size={13} className="aw-spin" /> : <LogOut size={13} />}
            {isLoading ? t('Working...') : t('Logout')}
          </button>
          <button type="button" onClick={closeWindow} className="aw-btn aw-btn-ghost">
            <X size={13} /> {t('Close')}
          </button>
        </div>
      </div>

      <div className="aw-content">
        <div className="aw-stack aw-narrow" style={{ maxWidth: 560 }}>

          {/* ── Session parameters ── */}
          <section className="aw-card">
            <div className="aw-card-head">
              <span className="aw-card-icon"><UserX size={14} /></span>
              <h2 className="aw-card-title">{t('Session Parameters')}</h2>
              <button type="button" onClick={handleShowUsers} disabled={isLoading} className="aw-btn aw-btn-secondary aw-btn-sm" style={{ marginLeft: 'auto' }}>
                <Search size={12} /> {t('Peek Active')}
              </button>
            </div>
            <div className="aw-stack">
              <div>
                <label className="aw-label" htmlFor="lo-user">{t('Target Identity')}</label>
                <Select
                  id="lo-user"
                  className="aw-select"
                  popupClassName="aw-select-popup"
                  showSearch
                  allowClear
                  optionFilterProp="label"
                  value={formData.userName || undefined}
                  onChange={(v) => updateField('userName', v ?? '')}
                  placeholder={t('Select logged-in user...')}
                  notFoundContent="No active users found"
                  suffixIcon={<UserCircle2 size={14} />}
                  options={loggedInUsers.map(u => ({ value: u.susername, label: u.susername }))}
                />
              </div>

              <div className="aw-two">
                <div>
                  <label className="aw-label" htmlFor="lo-date" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Calendar size={11} /> {t('Login Date')}
                  </label>
                  <input id="lo-date" type="date" value={formData.loginDate}
                    onChange={e => updateField('loginDate', e.target.value)} className="aw-input" />
                </div>
                <div>
                  <label className="aw-label" htmlFor="lo-time" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Clock size={11} /> {t('Session Start')}
                  </label>
                  <input id="lo-time" type="time" value={formData.loginTime}
                    onChange={e => updateField('loginTime', e.target.value)} className="aw-input" />
                </div>
              </div>
            </div>
          </section>

          {/* ── Active sessions ── */}
          {activeSessions.length > 0 && (
            <section className="aw-card aw-fade-in">
              <div className="aw-card-head">
                <span className="aw-card-icon"><Activity size={14} /></span>
                <h2 className="aw-card-title">{t('Active Sessions')}</h2>
                <span className="aw-pill" style={{ marginLeft: 'auto' }}>{activeSessions.length}</span>
              </div>
              <div className="aw-table-wrap" style={{ maxHeight: '38vh' }}>
                <table className="aw-table">
                  <thead>
                    <tr>
                      <th>{t('User name')}</th>
                      <th>{t('Login Date')}</th>
                      <th>{t('Login Time')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSessions.map((s: any, i: number) => (
                      <tr
                        key={i}
                        className="is-clickable"
                        aria-selected={formData.userName === s.username}
                        onClick={() => {
                          updateField('userName', s.username);
                          if (s.loginDate) {
                            const d = new Date(s.loginDate);
                            updateField('loginDate', localISODate(d));
                          }
                          updateField('loginTime', s.loginTime || '');
                        }}
                      >
                        <td className="is-accent">{s.username}</td>
                        <td className="is-muted">
                          {s.loginDate ? new Date(s.loginDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td className="is-warning">{s.loginTime || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="aw-meta" style={{ marginTop: 6 }}>{t('Click a row to select that session.')}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogoutUser;
