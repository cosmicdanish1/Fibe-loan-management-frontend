// page/ChangePassword.tsx

import React, { useState, useEffect, useRef } from 'react';
import { getApiBaseUrl } from '../../../../../services/apiVersionConfig';
import { useChangePassword } from '../hook/useChangePassword';
import { usePageToolbarActions } from '../../../../../utils/pageToolbarActions';

interface ChangePasswordProps {
  className?: string;
}

function getStrength(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  return score;
}

const STRENGTH_COLORS = ['#e2e8f0', '#f43f5e', '#fbbf24', '#10b981'];
const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Strong'];
const STRENGTH_TEXT_COLORS = ['', '#e11d48', '#d97706', '#059669'];

const closeWindow = () => {
  const api = (window as any).electronAPI;
  if (api?.ipcRenderer?.send) api.ipcRenderer.send('window-close');
  else window.close();
};

const EyeIcon: React.FC<{ open: boolean }> = ({ open }) =>
  open ? (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M17.94 17.94A10.94 10.94 0 0112 20C5 20 1 12 1 12a18.5 18.5 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M14.12 14.12a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

const CheckIcon: React.FC<{ size?: number }> = ({ size = 10 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const AlertIcon: React.FC<{ size?: number }> = ({ size = 10 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12" y2="16" />
  </svg>
);

const ChangePassword: React.FC<ChangePasswordProps> = ({ className = '' }) => {
  const {
    formData, errors, isLoading,
    updateField, resetForm, submitPasswordChange,
  } = useChangePassword();

  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
  const [users, setUsers] = useState<{ userid: number; susername: string }[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const base = await getApiBaseUrl();
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
    setToast(null);
    const result = await submitPasswordChange();
    if (result.success) {
      setToast({ type: 'success', msg: `Password updated for ${formData.userName}. New credentials are active immediately.` });
    } else if (result.error) {
      setToast({ type: 'error', msg: result.error });
    }
  };

  const handleReset = () => {
    resetForm();
    setToast(null);
    setUserSearch('');
    setShowDropdown(false);
    setShowPassword({ current: false, new: false, confirm: false });
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

  usePageToolbarActions({
    onSave: handleSubmit,
    saveLabel: isLoading ? 'Saving...' : 'Change',
    saveEnabled: isFormReady && !isLoading,
  });

  const inputStyle = (borderColor: string): React.CSSProperties => ({
    width: '100%', height: 32, background: '#f8fafc',
    border: `1.5px solid ${borderColor}`, borderRadius: 6,
    padding: '0 32px 0 10px', fontSize: 12.5, fontWeight: 500,
    color: '#0f172a', boxSizing: 'border-box', transition: 'border-color 0.15s',
  });

  const labelStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700,
    color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3,
  };

  const fieldWrap: React.CSSProperties = { marginBottom: 9 };

  const errStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, color: '#e11d48', margin: '3px 0 0',
    display: 'flex', alignItems: 'center', gap: 3,
  };

  return (
    <>
      <style>{`
        .cp-new .cp-scroll::-webkit-scrollbar { width: 5px; }
        .cp-new .cp-scroll::-webkit-scrollbar-track { background: transparent; }
        .cp-new .cp-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        @keyframes cp-spin { to { transform: rotate(360deg); } }
        @keyframes cp-fade { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: translateY(0); } }
        .cp-new .cp-input:focus { border-color: #a5b4fc !important; background: #fff !important; outline: none; }
        .cp-new .cp-input::placeholder { color: #94a3b8; font-size: 12px; }
        .cp-new .cp-user-item:hover { background: #f8fafc; }
        html.dark .cp-new { background: #0f172a !important; }
        html.dark .cp-new .cp-titlebar { background: #1e293b !important; border-color: #334155 !important; }
        html.dark .cp-new .cp-titlebar-icon { background: #0f172a !important; color: #818cf8 !important; }
        html.dark .cp-new .cp-title { color: #f1f5f9 !important; }
        html.dark .cp-new .cp-subtitle { color: #64748b !important; }
        html.dark .cp-new .cp-body { background: #0f172a !important; }
        html.dark .cp-new .cp-label { color: #64748b !important; }
        html.dark .cp-new .cp-input { background: #0f172a !important; border-color: #334155 !important; color: #f1f5f9 !important; }
        html.dark .cp-new .cp-input:focus { border-color: #4f46e5 !important; background: #0a0f1e !important; }
        html.dark .cp-new .cp-input::placeholder { color: #475569 !important; }
        html.dark .cp-new .cp-dropdown-menu { background: #1e293b !important; border-color: #334155 !important; }
        html.dark .cp-new .cp-search-input { background: #0f172a !important; border-color: #334155 !important; color: #f1f5f9 !important; }
        html.dark .cp-new .cp-search-input::placeholder { color: #475569 !important; }
        html.dark .cp-new .cp-user-item { color: #e2e8f0 !important; border-color: #334155 !important; }
        html.dark .cp-new .cp-user-item:hover { background: #283548 !important; }
        html.dark .cp-new .cp-divider-label { color: #94a3b8 !important; }
        html.dark .cp-new .cp-divider-line { background: #334155 !important; }
        html.dark .cp-new .cp-policy { background: #1e293b !important; border-color: #334155 !important; }
        html.dark .cp-new .cp-policy p { color: #475569 !important; }
        html.dark .cp-new .cp-footer { background: #1e293b !important; border-color: #334155 !important; }
        html.dark .cp-new .cp-reset-btn { background: #1e293b !important; border-color: #334155 !important; color: #94a3b8 !important; }
      `}</style>

      <div className={`cp-new h-screen flex flex-col bg-white ${className}`}
        style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

        {/* Title bar */}
        <div className="cp-titlebar flex items-center justify-between shrink-0 border-b"
          style={{ height: 38, padding: '0 10px', borderColor: '#eef1f5', background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div className="cp-titlebar-icon"
              style={{ width: 22, height: 22, borderRadius: 6, background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
            <div>
              <div className="cp-title" style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em', lineHeight: 1.2 }}>Change Password</div>
              <div className="cp-subtitle" style={{ fontSize: 9.5, fontWeight: 500, color: '#94a3b8', lineHeight: 1.2 }}>Account security</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {[
              { icon: <line x1="4" y1="12" x2="20" y2="12" />, hover: '#f1f5f9', hoverColor: '#475569', onClick: undefined },
              { icon: <rect x="4" y="4" width="16" height="16" rx="2" />, hover: '#f1f5f9', hoverColor: '#475569', onClick: undefined },
              { icon: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>, hover: '#fee2e2', hoverColor: '#dc2626', onClick: closeWindow },
            ].map((btn, i) => (
              <button key={i} onClick={btn.onClick}
                style={{ width: 20, height: 20, border: 'none', background: 'transparent', borderRadius: 4, color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                onMouseEnter={e => { (e.currentTarget).style.background = btn.hover; (e.currentTarget).style.color = btn.hoverColor; }}
                onMouseLeave={e => { (e.currentTarget).style.background = 'transparent'; (e.currentTarget).style.color = '#94a3b8'; }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">{btn.icon}</svg>
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="cp-body cp-scroll flex-1 overflow-y-auto" style={{ padding: '10px 12px 0' }}>

          {/* Toast */}
          {toast && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 6, padding: '7px 9px',
              borderRadius: 6, marginBottom: 9, animation: 'cp-fade 0.2s ease',
              background: toast.type === 'success' ? '#f0fdf4' : '#fff1f2',
              border: `1px solid ${toast.type === 'success' ? '#bbf7d0' : '#fecdd3'}`,
            }}>
              <span style={{ color: toast.type === 'success' ? '#15803d' : '#e11d48', flexShrink: 0, marginTop: 1 }}>
                {toast.type === 'success' ? <CheckIcon size={10} /> : <AlertIcon size={10} />}
              </span>
              <div style={{ fontSize: 11, fontWeight: 600, color: toast.type === 'success' ? '#15803d' : '#e11d48', lineHeight: 1.4 }}>
                {toast.msg}
              </div>
            </div>
          )}

          {/* Username */}
          <div ref={dropdownRef} style={{ ...fieldWrap, position: 'relative' }}>
            <label className="cp-label" style={labelStyle}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              Username
            </label>
            <button type="button" onClick={() => setShowDropdown(v => !v)}
              className="cp-input"
              style={{
                ...inputStyle(errors.userName ? '#fca5a5' : '#e2e8f0'),
                padding: '0 10px 0 30px', fontWeight: 600,
                color: formData.userName ? '#0f172a' : '#94a3b8',
                display: 'flex', alignItems: 'center', cursor: 'pointer',
              }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                style={{ position: 'absolute', left: 9, color: '#94a3b8' }}>
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {formData.userName || 'Select user...'}
              </span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                style={{ color: '#94a3b8', transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showDropdown && (
              <div className="cp-dropdown-menu" style={{
                position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
                boxShadow: '0 8px 20px -4px rgba(15,23,42,0.15)', zIndex: 50, overflow: 'hidden',
                animation: 'cp-fade 0.15s ease',
              }}>
                <div style={{ padding: 6, borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ position: 'relative' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3"
                      style={{ position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)}
                      placeholder="Search..." autoFocus className="cp-search-input"
                      style={{ width: '100%', height: 26, padding: '0 6px 0 22px', fontSize: 11.5, border: '1px solid #e2e8f0', borderRadius: 5, outline: 'none', color: '#0f172a', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div className="cp-scroll" style={{ maxHeight: 120, overflowY: 'auto' }}>
                  {filteredUsers.length === 0
                    ? <div style={{ padding: 10, textAlign: 'center', fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>No users found</div>
                    : filteredUsers.map(u => (
                      <button key={u.userid} type="button"
                        onClick={() => { updateField('userName', u.susername); setUserSearch(''); setShowDropdown(false); }}
                        className="cp-user-item"
                        style={{ width: '100%', textAlign: 'left', padding: '5px 9px', border: 'none', background: 'transparent', fontSize: 12, fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', borderBottom: '1px solid #f8fafc' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ color: '#94a3b8', flexShrink: 0 }}>
                          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                        </svg>
                        {u.susername}
                      </button>
                    ))}
                </div>
              </div>
            )}
            {errors.userName && <p style={errStyle}><AlertIcon size={9} />{errors.userName}</p>}
          </div>

          {/* Current Password */}
          <div style={fieldWrap}>
            <label className="cp-label" style={labelStyle}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              Current Password
            </label>
            <div style={{ position: 'relative' }}>
              <input type={showPassword.current ? 'text' : 'password'} value={formData.currentPassword}
                onChange={e => updateField('currentPassword', e.target.value)}
                placeholder="Enter current password" className="cp-input"
                style={inputStyle(errors.currentPassword ? '#fca5a5' : '#e2e8f0')} />
              <button type="button" onClick={() => togglePw('current')}
                style={{ position: 'absolute', right: 8, top: 0, height: '100%', display: 'flex', alignItems: 'center', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <EyeIcon open={showPassword.current} />
              </button>
            </div>
            {errors.currentPassword && <p style={errStyle}><AlertIcon size={9} />{errors.currentPassword}</p>}
          </div>

          {/* Section divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                <rect x="3" y="11" width="18" height="11" rx="2" /><circle cx="12" cy="16" r="1" /><path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
            <span className="cp-divider-label" style={{ fontSize: 9.5, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>New Password</span>
            <div className="cp-divider-line" style={{ flex: 1, height: 1, background: '#eef1f5' }}></div>
          </div>

          {/* New Password */}
          <div style={fieldWrap}>
            <label className="cp-label" style={labelStyle}>New Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPassword.new ? 'text' : 'password'} value={formData.newPassword}
                onChange={e => updateField('newPassword', e.target.value)}
                placeholder="Min 8 chars, upper, lower, digit" className="cp-input"
                style={inputStyle(errors.newPassword ? '#fca5a5' : '#e2e8f0')} />
              <button type="button" onClick={() => togglePw('new')}
                style={{ position: 'absolute', right: 8, top: 0, height: '100%', display: 'flex', alignItems: 'center', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <EyeIcon open={showPassword.new} />
              </button>
            </div>
            {formData.newPassword && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                <div style={{ flex: 1, height: 3, background: '#f1f5f9', borderRadius: 2, display: 'flex', gap: 2, overflow: 'hidden' }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{ flex: 1, borderRadius: 2, background: pwStrength >= i ? STRENGTH_COLORS[pwStrength] : STRENGTH_COLORS[0], transition: 'background 0.2s' }} />
                  ))}
                </div>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: STRENGTH_TEXT_COLORS[pwStrength] }}>{STRENGTH_LABELS[pwStrength]}</span>
              </div>
            )}
            {errors.newPassword && <p style={errStyle}><AlertIcon size={9} />{errors.newPassword}</p>}
          </div>

          {/* Confirm Password */}
          <div style={fieldWrap}>
            <label className="cp-label" style={labelStyle}>Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPassword.confirm ? 'text' : 'password'} value={formData.confirmPassword}
                onChange={e => updateField('confirmPassword', e.target.value)}
                placeholder="Re-enter new password" className="cp-input"
                style={inputStyle(errors.confirmPassword ? '#fca5a5' : pwMatch === true ? '#86efac' : pwMatch === false ? '#fca5a5' : '#e2e8f0')} />
              <button type="button" onClick={() => togglePw('confirm')}
                style={{ position: 'absolute', right: 8, top: 0, height: '100%', display: 'flex', alignItems: 'center', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <EyeIcon open={showPassword.confirm} />
              </button>
            </div>
            {(errors.confirmPassword || pwMatch !== null) && (
              <p style={{ ...errStyle, color: (errors.confirmPassword || pwMatch === false) ? '#e11d48' : '#059669' }}>
                {(errors.confirmPassword || pwMatch === false) ? <AlertIcon size={9} /> : <CheckIcon size={9} />}
                {errors.confirmPassword || (pwMatch === true ? 'Passwords match' : 'Passwords do not match')}
              </p>
            )}
          </div>

          {/* Policy */}
          <div className="cp-policy" style={{ background: '#f8fafc', border: '1px solid #eef1f5', borderRadius: 6, padding: '5px 9px', marginBottom: 10 }}>
            <p style={{ fontSize: 10, fontWeight: 500, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
              Min 8 chars · uppercase · lowercase · digit
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="cp-footer" style={{ flexShrink: 0, padding: '7px 12px', borderTop: '1px solid #eef1f5', background: '#fff', display: 'flex', justifyContent: 'flex-end', gap: 5 }}>
          <button onClick={handleReset} disabled={isLoading}
            className="cp-reset-btn"
            style={{ height: 28, padding: '0 11px', borderRadius: 6, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 11.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, cursor: isLoading ? 'not-allowed' : 'pointer' }}
            onMouseEnter={e => { if (!isLoading) { (e.currentTarget).style.background = '#f8fafc'; (e.currentTarget).style.borderColor = '#cbd5e1'; } }}
            onMouseLeave={e => { (e.currentTarget).style.borderColor = '#e2e8f0'; (e.currentTarget).style.background = '#fff'; }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
              <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
            </svg>
            Reset
          </button>
          <button onClick={handleSubmit} disabled={!isFormReady || isLoading}
            style={{
              height: 28, padding: '0 13px', borderRadius: 6, border: 'none',
              background: (!isFormReady || isLoading) ? '#cbd5e1' : '#4f46e5',
              color: '#fff', fontSize: 11.5, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 5,
              cursor: (!isFormReady || isLoading) ? 'not-allowed' : 'pointer',
              boxShadow: (!isFormReady || isLoading) ? 'none' : '0 2px 8px -2px rgba(79,70,229,0.45)',
              transition: 'background 0.15s',
            }}>
            {isLoading
              ? <div style={{ width: 11, height: 11, border: '1.5px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'cp-spin 0.7s linear infinite' }} />
              : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                  <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>}
            {isLoading ? 'Saving...' : 'Change Password'}
          </button>
        </div>
      </div>
    </>
  );
};

export default ChangePassword;
