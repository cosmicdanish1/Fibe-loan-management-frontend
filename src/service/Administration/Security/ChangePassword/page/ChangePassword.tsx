// page/ChangePassword.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  Save, RotateCcw, Eye, EyeOff, ShieldCheck, User, Lock,
  ShieldAlert, LockKeyhole, Building2, Database, Search,
  ChevronDown, X, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { ConfigProvider } from 'antd';
import { getApiBaseUrl } from '../../../../../services/apiVersionConfig';
import { useChangePassword } from '../hook/useChangePassword';

interface ChangePasswordProps {
  className?: string;
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

// Password strength: 0=empty, 1=weak, 2=fair, 3=strong
function getStrength(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  return score;
}

const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Strong'];
const STRENGTH_COLOR = ['', 'bg-rose-500', 'bg-amber-400', 'bg-emerald-500'];
const STRENGTH_TEXT  = ['', 'text-rose-500', 'text-amber-500', 'text-emerald-500'];

const ChangePassword: React.FC<ChangePasswordProps> = ({ className = '' }) => {
  const {
    formData, errors, isLoading,
    updateField, resetForm, submitPasswordChange,
  } = useChangePassword();

  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
  const [users, setUsers] = useState<{ userid: number; susername: string }[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load users with auth token
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const base = await getApiBaseUrl();
        // Public endpoint — returns only usernames, no auth required
        const res = await fetch(`${base}/auth/usernames`);
        if (res.ok) {
          const data = await res.json();
          const list = data.data || data || [];
          setUsers(Array.isArray(list) ? list : []);
        }
      } catch { /* silent */ }
    };
    loadUsers();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredUsers = users.filter(u =>
    u.susername.toLowerCase().includes(userSearch.toLowerCase())
  );

  const togglePw = (field: keyof typeof showPassword) =>
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));

  const handleSubmit = async () => {
    const result = await submitPasswordChange();
    if (result.success) {
      await showDialog(
        'info',
        'Password Changed',
        'Password updated successfully!',
        `User: ${formData.userName}\n\n✓ New credentials are active immediately.`
      );
    } else if (result.error && !errors.general) {
      await showDialog('error', 'Change Failed', result.error, '');
    }
  };

  const isFormReady = !!(
    formData.userName.trim() &&
    formData.currentPassword &&
    formData.newPassword.length >= 8 &&
    formData.confirmPassword &&
    formData.newPassword === formData.confirmPassword
  );

  const pwStrength = getStrength(formData.newPassword);
  const pwMatch = formData.confirmPassword
    ? formData.newPassword === formData.confirmPassword
    : null;

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#4f46e5', borderRadius: 8 } }}>
      <style>{`
        .cp-page .cp-scroll::-webkit-scrollbar { width: 5px; }
        .cp-page .cp-scroll::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 3px; }
        .cp-page .cp-scroll::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 3px; }

        html.dark .cp-page { background: #0f172a !important; }
        html.dark .cp-page .cp-card { background: #1e293b !important; border-color: #334155 !important; }
        html.dark .cp-page .cp-card-header { background: linear-gradient(90deg,#1e293b,#283548) !important; border-color: #334155 !important; }
        html.dark .cp-page .cp-card-icon { background: #0f172a !important; color: #94a3b8 !important; box-shadow: 0 0 0 1px #334155 !important; }
        html.dark .cp-page .cp-card-title { color: #f1f5f9 !important; }
        html.dark .cp-page .cp-card-sub   { color: #64748b !important; }
        html.dark .cp-page .cp-label { color: #94a3b8 !important; }
        html.dark .cp-page .cp-input {
          background: #0f172a !important; border-color: #334155 !important;
          color: #f1f5f9 !important;
        }
        html.dark .cp-page .cp-input:focus { border-color: #4f46e5 !important; background: #0a0f1e !important; }
        html.dark .cp-page .cp-input::placeholder { color: #475569 !important; }
        html.dark .cp-page .cp-dropdown { background: #1e293b !important; border-color: #334155 !important; }
        html.dark .cp-page .cp-search-area { background: #0f172a !important; border-color: #334155 !important; }
        html.dark .cp-page .cp-search-input { background: #1e293b !important; border-color: #334155 !important; color: #f1f5f9 !important; }
        html.dark .cp-page .cp-search-input::placeholder { color: #475569 !important; }
        html.dark .cp-page .cp-user-item { color: #e2e8f0 !important; border-color: #334155 !important; }
        html.dark .cp-page .cp-user-item:hover { background: #283548 !important; }
        html.dark .cp-page .cp-eye-btn { color: #64748b !important; }
        html.dark .cp-page .cp-eye-btn:hover { color: #94a3b8 !important; }
        html.dark .cp-page .cp-strength-bar { background: #0f172a !important; }
        html.dark .cp-page .cp-hint { color: #64748b !important; }
      `}</style>

      <div className={`cp-page h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50 font-sans overflow-hidden ${className}`}>

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 border-b border-slate-700 px-2 py-1 flex items-center justify-between shrink-0 shadow-lg">
          <div className="flex items-center gap-1.5">
            <div className="bg-white/10 p-1 rounded-lg text-white"><ShieldCheck size={12} /></div>
            <div>
              <h1 className="fz-caption font-black text-white tracking-tight leading-tight uppercase">Change Password</h1>
              <div className="flex items-center gap-1 fz-caption font-bold text-indigo-300 uppercase tracking-wider leading-none" style={{ fontSize: '9px' }}>
                <Building2 size={7} /> Identity Matrix Update
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={resetForm} disabled={isLoading}
              className="px-2 h-5 text-slate-300 hover:text-white hover:bg-white/10 rounded fz-caption font-bold transition-all flex items-center gap-1 group disabled:opacity-50">
              <RotateCcw size={10} className="group-hover:-rotate-90 transition-transform" /> Reset
            </button>
            <button onClick={handleSubmit} disabled={!isFormReady || isLoading}
              className="px-2 h-5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-600 disabled:text-slate-400 text-white rounded fz-caption font-black shadow-md transition-all flex items-center gap-1 active:scale-95 disabled:cursor-not-allowed uppercase">
              {isLoading
                ? <><div className="w-2 h-2 border border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                : <><Save size={10} /> Change</>}
            </button>
            <button onClick={closeWindow} title="Close"
              className="ml-0.5 w-5 h-5 text-slate-400 hover:text-white hover:bg-red-500/80 rounded transition-all flex items-center justify-center">
              <X size={11} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-auto cp-scroll px-3 py-2 flex items-start justify-center">
          <div className="w-full max-w-sm">

            {/* General error banner */}
            {errors.general && (
              <div className="bg-rose-50 border border-rose-300 rounded-lg px-2 py-1 flex items-center gap-1.5 mb-1.5">
                <AlertCircle size={11} className="text-rose-500 shrink-0" />
                <p className="fz-caption font-bold text-rose-700 uppercase leading-tight">{errors.general}</p>
              </div>
            )}

            {/* Single compact card */}
            <div className="cp-card bg-white border-2 border-slate-200 rounded-lg shadow-sm overflow-hidden">

              {/* Username */}
              <div ref={dropdownRef} className="p-2 pb-1.5 border-b border-slate-100">
                <label className="cp-label fz-caption font-black text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                  <User size={8} /> Username
                </label>
                <div className="relative">
                  <button type="button" onClick={() => setShowDropdown(v => !v)}
                    className={`cp-input w-full h-7 bg-slate-50 border-2 rounded pl-7 pr-6 fz-caption font-black text-left outline-none focus:ring-1 focus:ring-indigo-400 transition-all flex items-center ${errors.userName ? 'border-rose-400' : 'border-slate-200'} ${formData.userName ? 'text-slate-900' : 'text-slate-400'}`}>
                    <User size={11} className="absolute left-2 text-slate-400" />
                    <span className="flex-1 truncate">{formData.userName || 'Select user...'}</span>
                    {formData.userName
                      ? <span className="text-slate-400 hover:text-slate-600 px-0.5"
                          onClick={e => { e.stopPropagation(); updateField('userName', ''); setUserSearch(''); }}>
                          <X size={10} />
                        </span>
                      : <ChevronDown size={10} className="text-slate-400" />}
                  </button>
                  {showDropdown && (
                    <div className="cp-dropdown absolute top-full left-0 right-0 mt-0.5 bg-white border-2 border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden">
                      <div className="cp-search-area p-1 border-b border-slate-200 bg-slate-50">
                        <div className="relative">
                          <Search size={9} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)}
                            className="cp-search-input w-full pl-6 pr-2 h-5 fz-caption border border-slate-200 rounded outline-none focus:ring-1 focus:ring-indigo-400 bg-white font-bold text-slate-800"
                            placeholder="Search..." autoFocus />
                        </div>
                      </div>
                      <div className="cp-scroll max-h-28 overflow-y-auto">
                        {filteredUsers.length === 0
                          ? <p className="fz-caption text-slate-400 text-center py-2 font-bold">No users</p>
                          : filteredUsers.map(u => (
                            <button key={u.userid} type="button"
                              onClick={() => { updateField('userName', u.susername); setUserSearch(''); setShowDropdown(false); }}
                              className="cp-user-item w-full text-left px-2 py-1 fz-caption font-black text-slate-900 hover:bg-slate-50 transition-colors flex items-center gap-1.5 border-b border-slate-100 last:border-0">
                              <User size={9} className="text-slate-400 shrink-0" />
                              {u.susername}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
                {errors.userName && <p className="fz-caption font-bold text-rose-500 mt-0.5">{errors.userName}</p>}
              </div>

              {/* Current Password */}
              <div className="px-2 py-1.5 border-b border-slate-100">
                <label className="cp-label fz-caption font-black text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                  <Lock size={8} /> Current Password
                </label>
                <div className="relative">
                  <input type={showPassword.current ? 'text' : 'password'} value={formData.currentPassword}
                    onChange={e => updateField('currentPassword', e.target.value)}
                    placeholder="Enter current password"
                    className={`cp-input w-full h-7 bg-slate-50 border-2 rounded px-2 pr-7 fz-caption font-mono text-slate-900 outline-none focus:ring-1 focus:ring-indigo-400 focus:bg-white transition-all ${errors.currentPassword ? 'border-rose-400' : 'border-slate-200'}`} />
                  <button type="button" onClick={() => togglePw('current')}
                    className="cp-eye-btn absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600">
                    {showPassword.current ? <EyeOff size={11} /> : <Eye size={11} />}
                  </button>
                </div>
                {errors.currentPassword && <p className="fz-caption font-bold text-rose-500 mt-0.5">{errors.currentPassword}</p>}
              </div>

              {/* Divider with label */}
              <div className="bg-slate-50 px-2 py-0.5 border-b border-slate-200">
                <p className="cp-card-title fz-caption font-black text-slate-500 uppercase tracking-widest flex items-center gap-1" style={{ fontSize: '8px' }}>
                  <LockKeyhole size={8} /> New Password
                </p>
              </div>

              {/* New Password */}
              <div className="px-2 pt-1.5 pb-1">
                <label className="cp-label fz-caption font-black text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                  <ShieldAlert size={8} /> New Password
                </label>
                <div className="relative">
                  <input type={showPassword.new ? 'text' : 'password'} value={formData.newPassword}
                    onChange={e => updateField('newPassword', e.target.value)}
                    placeholder="Min 8 chars, upper, lower, digit"
                    className={`cp-input w-full h-7 bg-slate-50 border-2 rounded px-2 pr-7 fz-caption font-mono text-slate-900 outline-none focus:ring-1 focus:ring-indigo-400 focus:bg-white transition-all ${errors.newPassword ? 'border-rose-400' : 'border-slate-200'}`} />
                  <button type="button" onClick={() => togglePw('new')}
                    className="cp-eye-btn absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600">
                    {showPassword.new ? <EyeOff size={11} /> : <Eye size={11} />}
                  </button>
                </div>
                {formData.newPassword && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="cp-strength-bar flex-1 h-1 bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                      {[1, 2, 3].map(i => (
                        <div key={i} className={`flex-1 h-full rounded-full transition-all duration-300 ${pwStrength >= i ? STRENGTH_COLOR[pwStrength] : 'bg-slate-200'}`} />
                      ))}
                    </div>
                    <span className={`font-black leading-none ${STRENGTH_TEXT[pwStrength]}`} style={{ fontSize: '8px' }}>
                      {STRENGTH_LABEL[pwStrength]}
                    </span>
                  </div>
                )}
                {errors.newPassword && <p className="fz-caption font-bold text-rose-500 mt-0.5">{errors.newPassword}</p>}
              </div>

              {/* Confirm Password */}
              <div className="px-2 pb-1.5">
                <label className="cp-label fz-caption font-black text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                  <ShieldCheck size={8} /> Confirm Password
                </label>
                <div className="relative">
                  <input type={showPassword.confirm ? 'text' : 'password'} value={formData.confirmPassword}
                    onChange={e => updateField('confirmPassword', e.target.value)}
                    placeholder="Re-enter new password"
                    className={`cp-input w-full h-7 bg-slate-50 border-2 rounded px-2 pr-7 fz-caption font-mono text-slate-900 outline-none focus:ring-1 focus:ring-indigo-400 focus:bg-white transition-all ${
                      errors.confirmPassword ? 'border-rose-400'
                      : pwMatch === true ? 'border-emerald-400'
                      : pwMatch === false ? 'border-rose-400'
                      : 'border-slate-200'
                    }`} />
                  <button type="button" onClick={() => togglePw('confirm')}
                    className="cp-eye-btn absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600">
                    {showPassword.confirm ? <EyeOff size={11} /> : <Eye size={11} />}
                  </button>
                </div>
                {pwMatch === true && (
                  <p className="fz-caption font-bold text-emerald-600 mt-0.5 flex items-center gap-0.5">
                    <CheckCircle2 size={8} /> Match
                  </p>
                )}
                {(pwMatch === false || errors.confirmPassword) && (
                  <p className="fz-caption font-bold text-rose-500 mt-0.5 flex items-center gap-0.5">
                    <AlertCircle size={8} /> {errors.confirmPassword || 'No match'}
                  </p>
                )}
              </div>

              {/* Policy */}
              <div className="bg-slate-50 px-2 py-1 border-t border-slate-200">
                <p className="cp-hint text-slate-400 font-bold" style={{ fontSize: '8px' }}>
                  Policy: min 8 chars · uppercase · lowercase · digit
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default ChangePassword;
