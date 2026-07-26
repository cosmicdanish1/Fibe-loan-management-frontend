// page/LogoutUser.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  LogOut, X, Calendar, Clock, UserX, ChevronDown,
  Search, Activity, Building2, UserCircle2,
} from 'lucide-react';
import { ConfigProvider } from 'antd';
import { apiService } from '../../../../../services/api';
import { getApiBaseUrl } from '../../../../../services/apiVersionConfig';

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
  if (api?.ipcRenderer?.send) api.ipcRenderer.send('close-window');
  else window.close();
};

const LogoutUser: React.FC<LogoutUserProps> = ({ className = '' }) => {
  const [formData, setFormData] = useState<FormData>({ userName: '', loginDate: '', loginTime: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [isMatrixVisible, setIsMatrixVisible] = useState(false);

  const [loggedInUsers, setLoggedInUsers] = useState<{ userid: number; susername: string }[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredUsers = loggedInUsers.filter(u =>
    u.susername.toLowerCase().includes(userSearch.toLowerCase())
  );

  const updateField = (field: keyof FormData, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const handleLogout = async () => {
    if (!formData.userName.trim()) {
      await showDialog('warning', 'Required', 'Please select a user to log out.', '');
      return;
    }

    const confirmed = await (async () => {
      const api = (window as any).electronAPI;
      if (api?.showMessageBox) {
        const res = await api.showMessageBox({
          type: 'warning',
          title: 'Confirm Logout',
          message: `Force logout "${formData.userName}"?`,
          detail: 'This will immediately terminate their active session.',
          buttons: ['Cancel', 'Logout'],
          defaultId: 0,
          cancelId: 0,
        });
        return res.response === 1;
      }
      return window.confirm(`Force logout "${formData.userName}"?`);
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
    <ConfigProvider theme={{ token: { colorPrimary: '#e11d48', borderRadius: 8 } }}>
      <style>{`
        .lo-page .lo-scroll::-webkit-scrollbar { width: 5px; }
        .lo-page .lo-scroll::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 3px; }
        .lo-page .lo-scroll::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 3px; }

        html.dark .lo-page { background: #0f172a !important; }
        html.dark .lo-page .lo-card { background: #1e293b !important; border-color: #334155 !important; }
        html.dark .lo-page .lo-card-bar { background: linear-gradient(90deg,#1e293b,#283548) !important; border-color: #334155 !important; }
        html.dark .lo-page .lo-peek-btn { background: #0f172a !important; border-color: #334155 !important; color: #94a3b8 !important; }
        html.dark .lo-page .lo-peek-btn:hover { background: #334155 !important; color: #f1f5f9 !important; }
        html.dark .lo-page .lo-label { color: #94a3b8 !important; }
        html.dark .lo-page .lo-trigger { background: #0f172a !important; border-color: #334155 !important; color: #94a3b8 !important; }
        html.dark .lo-page .lo-trigger.has-value { color: #f1f5f9 !important; }
        html.dark .lo-page .lo-input { background: #0f172a !important; border-color: #334155 !important; color: #f1f5f9 !important; }
        html.dark .lo-page .lo-input::-webkit-calendar-picker-indicator { filter: invert(1) opacity(0.5); }
        html.dark .lo-page .lo-dropdown { background: #1e293b !important; border-color: #334155 !important; }
        html.dark .lo-page .lo-search-bar { background: #0f172a !important; border-color: #334155 !important; }
        html.dark .lo-page .lo-search-input { background: #1e293b !important; border-color: #334155 !important; color: #f1f5f9 !important; }
        html.dark .lo-page .lo-search-input::placeholder { color: #475569 !important; }
        html.dark .lo-page .lo-user-item { color: #e2e8f0 !important; border-color: #334155 !important; }
        html.dark .lo-page .lo-user-item:hover { background: #283548 !important; }
        html.dark .lo-page .lo-scroll::-webkit-scrollbar-track { background: #1e293b !important; }

        html.dark .ant-modal-content { background: #1e293b !important; }
        html.dark .ant-modal-header { background: #1e293b !important; border-color: #334155 !important; }
        html.dark .ant-modal-title { color: #f1f5f9 !important; }
        html.dark .ant-modal-close { color: #94a3b8 !important; }
        html.dark .ant-table { background: #1e293b !important; color: #e2e8f0 !important; }
        html.dark .ant-table-thead > tr > th { background: #0f172a !important; color: #94a3b8 !important; border-color: #334155 !important; }
        html.dark .ant-table-tbody > tr > td { border-color: #334155 !important; }
        html.dark .ant-table-tbody > tr:hover > td { background: #283548 !important; }
        html.dark .ant-pagination-item a { color: #94a3b8 !important; }
        html.dark .ant-pagination-item-active { border-color: #e11d48 !important; }
      `}</style>

      <div className={`lo-page h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50 font-sans overflow-hidden ${className}`}>

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-slate-900 via-rose-900 to-slate-900 border-b border-slate-700 px-2 py-1 flex items-center justify-between shrink-0 shadow-lg">
          <div className="flex items-center gap-1.5">
            <div className="bg-white/10 p-1 rounded-lg text-white"><UserX size={12} /></div>
            <div>
              <h1 className="fz-caption font-black text-white tracking-tight leading-tight uppercase">Session Manager</h1>
              <div className="flex items-center gap-1 fz-caption font-bold text-rose-300 uppercase tracking-wider leading-none" style={{ fontSize: '9px' }}>
                <Building2 size={7} /> Administrative Override
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleClear} disabled={isLoading}
              className="px-2 h-5 text-slate-300 hover:text-white hover:bg-white/10 rounded fz-caption font-bold transition-all flex items-center gap-1 group disabled:opacity-50">
              <X size={10} className="group-hover:rotate-90 transition-transform" /> Clear
            </button>
            <button onClick={handleLogout} disabled={isLoading || !formData.userName}
              className="px-2 h-5 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-600 disabled:text-slate-400 text-white rounded fz-caption font-black shadow-md transition-all flex items-center gap-1 active:scale-95 disabled:cursor-not-allowed uppercase">
              {isLoading
                ? <><div className="w-2 h-2 border border-white border-t-transparent rounded-full animate-spin" /> Working...</>
                : <><LogOut size={10} /> Logout</>}
            </button>
            <button onClick={closeWindow} title="Close"
              className="ml-0.5 w-5 h-5 text-slate-400 hover:text-white hover:bg-red-500/80 rounded transition-all flex items-center justify-center">
              <X size={11} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-auto lo-scroll px-3 py-3 flex items-start justify-center">
          <div className="w-full max-w-md space-y-2">

            {/* Session Parameters Card */}
            <div className="lo-card bg-white border-2 border-slate-200 rounded-lg shadow-sm overflow-visible">

              {/* Card top bar with Peek button */}
              <div className="lo-card-bar bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 px-2 py-1 flex items-center justify-end">
                <button onClick={handleShowUsers} disabled={isLoading}
                  className="lo-peek-btn px-2 h-5 bg-slate-50 text-slate-600 hover:bg-slate-700 hover:text-white rounded fz-caption font-black transition-all flex items-center gap-1 border border-slate-200 disabled:opacity-50">
                  <Search size={8} /> Peek Active
                </button>
              </div>

              <div className="p-2 space-y-2">

                {/* User dropdown */}
                <div ref={dropdownRef} className="space-y-0.5">
                  <label className="lo-label fz-caption font-black text-slate-600 uppercase tracking-wider flex items-center gap-1 ml-0.5">
                    <UserCircle2 size={9} /> Target Identity
                  </label>
                  <div className="relative">
                    <button type="button" onClick={() => setShowDropdown(v => !v)}
                      className={`lo-trigger w-full h-6 bg-slate-50 border-2 border-slate-200 rounded-lg pl-6 pr-6 fz-caption font-black text-left outline-none focus:ring-2 focus:ring-rose-400 transition-all flex items-center ${formData.userName ? 'has-value text-slate-900' : 'text-slate-400'}`}>
                      <UserCircle2 size={10} className="absolute left-1.5 text-slate-400" />
                      <span className="flex-1 truncate">{formData.userName || 'Select logged-in user...'}</span>
                      {formData.userName
                        ? <span onClick={e => { e.stopPropagation(); updateField('userName', ''); setUserSearch(''); }}
                            className="text-slate-400 hover:text-rose-500 transition-colors">
                            <X size={10} />
                          </span>
                        : <ChevronDown size={10} className="text-slate-400" />}
                    </button>

                    {showDropdown && (
                      <div className="lo-dropdown absolute top-full left-0 right-0 mt-0.5 bg-white border-2 border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden">
                        <div className="lo-search-bar p-1 border-b border-slate-200 bg-slate-50">
                          <div className="relative">
                            <Search size={9} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)}
                              className="lo-search-input w-full pl-6 pr-2 h-5 fz-caption border border-slate-200 rounded outline-none focus:ring-1 focus:ring-rose-400 bg-white font-bold text-slate-800"
                              placeholder="Search active users..." autoFocus />
                          </div>
                        </div>
                        <div className="lo-scroll max-h-28 overflow-y-auto">
                          {filteredUsers.length === 0
                            ? <p className="fz-caption text-slate-400 text-center py-2 font-bold">No active users found</p>
                            : filteredUsers.map(u => (
                              <button key={u.userid} type="button"
                                onClick={() => { updateField('userName', u.susername); setUserSearch(''); setShowDropdown(false); }}
                                className="lo-user-item w-full text-left px-2 py-1 fz-caption font-black text-slate-900 hover:bg-slate-50 transition-colors flex items-center gap-1.5 border-b border-slate-100 last:border-0">
                                <UserCircle2 size={9} className="text-slate-400 shrink-0" />
                                {u.susername}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Date / Time */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <label className="lo-label fz-caption font-black text-slate-600 uppercase tracking-wider flex items-center gap-1 ml-0.5">
                      <Calendar size={9} /> Login Date
                    </label>
                    <input type="date" value={formData.loginDate}
                      onChange={e => updateField('loginDate', e.target.value)}
                      className="lo-input w-full h-6 bg-slate-50 border-2 border-slate-200 rounded-lg px-2 fz-caption font-black text-slate-900 outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition-all" />
                  </div>
                  <div className="space-y-0.5">
                    <label className="lo-label fz-caption font-black text-slate-600 uppercase tracking-wider flex items-center gap-1 ml-0.5">
                      <Clock size={9} /> Session Start
                    </label>
                    <input type="time" value={formData.loginTime}
                      onChange={e => updateField('loginTime', e.target.value)}
                      className="lo-input w-full h-6 bg-slate-50 border-2 border-slate-200 rounded-lg px-2 fz-caption font-black text-slate-900 outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white transition-all" />
                  </div>
                </div>

              </div>
            </div>



            {/* ── Active Sessions Table (inline like legacy) ── */}
            {activeSessions.length > 0 && (
              <div className="lo-card bg-white border-2 border-slate-200 rounded-lg shadow-sm overflow-hidden">
                <div className="lo-card-bar bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 px-2 py-0.5 flex items-center gap-1.5">
                  <Activity size={9} className="text-rose-500" />
                  <span className="fz-caption font-black text-slate-600 uppercase tracking-wider" style={{ fontSize: '8px' }}>
                    Active Sessions ({activeSessions.length})
                  </span>
                </div>
                <div className="lo-scroll max-h-48 overflow-y-auto">
                  <table className="w-full" style={{ fontSize: '10px' }}>
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-2 py-1 font-black text-slate-500 uppercase">User name</th>
                        <th className="text-left px-2 py-1 font-black text-slate-500 uppercase">Login Date</th>
                        <th className="text-left px-2 py-1 font-black text-slate-500 uppercase">Login Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeSessions.map((s: any, i: number) => (
                        <tr key={i}
                          className="border-b border-slate-100 hover:bg-rose-50 cursor-pointer transition-colors"
                          onClick={() => {
                            updateField('userName', s.username);
                            if (s.loginDate) {
                              const d = new Date(s.loginDate);
                              updateField('loginDate', d.toISOString().split('T')[0] || '');
                            }
                            updateField('loginTime', s.loginTime || '');
                          }}>
                          <td className="px-2 py-1 font-black text-indigo-700">{s.username}</td>
                          <td className="px-2 py-1 text-slate-600">
                            {s.loginDate ? new Date(s.loginDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </td>
                          <td className="px-2 py-1 font-mono text-amber-600">{s.loginTime || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </ConfigProvider>
  );
};

export default LogoutUser;
