// page/LogoutUser.tsx

import React, { useState, useEffect } from 'react';
import {
  LogOut, X, Calendar, Clock, UserX, Search, Activity, Building2, UserCircle2, RefreshCw,
} from 'lucide-react';
import { Select } from 'antd';
import { apiService } from '../../../../../services/api';
import { getApiBaseUrl } from '../../../../../services/apiVersionConfig';
import { useAuth } from '../../../../../auth/context/AuthContext';

interface LogoutUserProps {
  className?: string;
}

interface FormData {
  userName: string;
  loginDate: string;
  loginTime: string;
}

const showDialog = async (
  type: 'info' | 'warning' | 'error',
  title: string,
  msg: string,
  detail = '',
) => {
  const api = (window as any).electronAPI;
  if (api?.showMessageBox) {
    await api.showMessageBox({ type, title, message: msg, detail, buttons: ['OK'], defaultId: 0 });
  } else {
    alert(`[${type.toUpperCase()}] ${msg}${detail ? '\n\n' + detail : ''}`);
  }
};

const closeWindow = () => {
  const api = (window as any).electronAPI;
  if (api?.ipcRenderer?.send) api.ipcRenderer.send('window-close');
  else window.close();
};

const LogoutUser: React.FC<LogoutUserProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<FormData>({ userName: '', loginDate: '', loginTime: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [isMatrixVisible, setIsMatrixVisible] = useState(false);

  const [loggedInUsers, setLoggedInUsers] = useState<{ userid: number; susername: string }[]>([]);

  const loadLoggedInUsers = async () => {
    try {
      const base = await getApiBaseUrl();
      // Use public endpoint — works in Electron child windows without JWT
      const res = await fetch(`${base}/auth/usernames`);
      if (res.ok) {
        const data = await res.json();
        const list = data.data || data || [];
        setLoggedInUsers(Array.isArray(list) ? list : []);
      }
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
      await showDialog('warning', 'Required', 'Please select a user to log out.', '');
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
          title: 'Confirm Logout',
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
          'Session Terminated',
          `"${formData.userName}" has been logged out.`,
          'Their active session has been invalidated.'
        );
        handleClear();
        await loadLoggedInUsers();
        if (isMatrixVisible) await handleShowUsers();
      } else {
        await showDialog('error', 'Logout Failed', response.error || 'Could not terminate session.', '');
      }
    } catch (err: any) {
      await showDialog('error', 'System Error', 'Session termination failed.', err?.message || 'Check server connection.');
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
        await showDialog('error', 'Peek Failed', 'Could not fetch active sessions.', '');
      }
    } catch {
      await showDialog('error', 'Peek Failed', 'Server unreachable.', '');
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
          <h1 className="aw-title">Session Manager</h1>
          <p className="aw-desc" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Building2 size={12} /> Administrative Override
          </p>
        </div>
        <div className="aw-actions">
          <button type="button" onClick={handleClear} disabled={isLoading} className="aw-btn aw-btn-secondary">
            <X size={13} /> Clear
          </button>
          <button type="button" onClick={handleLogout} disabled={isLoading || !formData.userName} className="aw-btn aw-btn-danger">
            {isLoading ? <RefreshCw size={13} className="aw-spin" /> : <LogOut size={13} />}
            {isLoading ? 'Working...' : 'Logout'}
          </button>
          <button type="button" onClick={closeWindow} className="aw-btn aw-btn-ghost">
            <X size={13} /> Close
          </button>
        </div>
      </div>

      <div className="aw-content">
        <div className="aw-stack aw-narrow" style={{ maxWidth: 560 }}>

          {/* ── Session parameters ── */}
          <section className="aw-card">
            <div className="aw-card-head">
              <span className="aw-card-icon"><UserX size={14} /></span>
              <h2 className="aw-card-title">Session Parameters</h2>
              <button type="button" onClick={handleShowUsers} disabled={isLoading} className="aw-btn aw-btn-secondary aw-btn-sm" style={{ marginLeft: 'auto' }}>
                <Search size={12} /> Peek Active
              </button>
            </div>
            <div className="aw-stack">
              <div>
                <label className="aw-label" htmlFor="lo-user">Target Identity</label>
                <Select
                  id="lo-user"
                  className="aw-select"
                  popupClassName="aw-select-popup"
                  showSearch
                  allowClear
                  optionFilterProp="label"
                  value={formData.userName || undefined}
                  onChange={(v) => updateField('userName', v ?? '')}
                  placeholder="Select logged-in user..."
                  notFoundContent="No active users found"
                  suffixIcon={<UserCircle2 size={14} />}
                  options={loggedInUsers.map(u => ({ value: u.susername, label: u.susername }))}
                />
              </div>

              <div className="aw-two">
                <div>
                  <label className="aw-label" htmlFor="lo-date" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Calendar size={11} /> Login Date
                  </label>
                  <input id="lo-date" type="date" value={formData.loginDate}
                    onChange={e => updateField('loginDate', e.target.value)} className="aw-input" />
                </div>
                <div>
                  <label className="aw-label" htmlFor="lo-time" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Clock size={11} /> Session Start
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
                <h2 className="aw-card-title">Active Sessions</h2>
                <span className="aw-pill" style={{ marginLeft: 'auto' }}>{activeSessions.length}</span>
              </div>
              <div className="aw-table-wrap" style={{ maxHeight: '38vh' }}>
                <table className="aw-table">
                  <thead>
                    <tr>
                      <th>User name</th>
                      <th>Login Date</th>
                      <th>Login Time</th>
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
                            updateField('loginDate', d.toISOString().split('T')[0] || '');
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
              <p className="aw-meta" style={{ marginTop: 6 }}>Click a row to select that session.</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogoutUser;
