// page/ChangePassword.tsx

import React, { useState, useEffect } from 'react';
import { Select } from 'antd';
import { Eye, EyeOff, Lock, User, RotateCcw, Save, X, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
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

const STRENGTH_TONES = ['', 'var(--aw-danger)', 'var(--aw-warning)', 'var(--aw-success)'];
const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Strong'];

const closeWindow = () => {
  const api = (window as any).electronAPI;
  if (api?.ipcRenderer?.send) api.ipcRenderer.send('window-close');
  else window.close();
};

const ChangePassword: React.FC<ChangePasswordProps> = ({ className = '' }) => {
  const {
    formData, errors, isLoading,
    updateField, resetForm, submitPasswordChange,
  } = useChangePassword();

  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
  const [users, setUsers] = useState<{ userid: number; susername: string }[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

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

  const pwField = (
    id: string,
    label: string,
    field: 'currentPassword' | 'newPassword' | 'confirmPassword',
    show: keyof typeof showPassword,
    placeholder: string,
    invalid: boolean,
  ) => (
    <div>
      <label className="aw-label" htmlFor={id}>{label}</label>
      <div className="aw-input-wrap has-action">
        <input
          id={id}
          type={showPassword[show] ? 'text' : 'password'}
          value={formData[field]}
          onChange={e => updateField(field, e.target.value)}
          placeholder={placeholder}
          className={`aw-input ${invalid ? 'is-invalid' : ''}`}
        />
        <button
          type="button"
          className="aw-input-action"
          onClick={() => togglePw(show)}
          aria-label={showPassword[show] ? 'Hide password' : 'Show password'}
          data-tip={showPassword[show] ? 'Hide' : 'Show'}
          data-tip-pos="top-end"
          style={{ background: 'transparent', color: 'var(--aw-muted)' }}
        >
          {showPassword[show] ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );

  const errLine = (msg?: string) => msg
    ? <p className="aw-meta" style={{ marginTop: 4, color: 'var(--aw-danger)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={12} />{msg}</p>
    : null;

  return (
    <div className={`app-window ${className}`}>
      {/* ── Header ── */}
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">Change Password</h1>
          <p className="aw-desc">Account security</p>
        </div>
        <div className="aw-actions">
          <button type="button" onClick={handleReset} disabled={isLoading} className="aw-btn aw-btn-secondary">
            <RotateCcw size={13} /> Reset
          </button>
          <button type="button" onClick={handleSubmit} disabled={!isFormReady || isLoading} className="aw-btn aw-btn-primary">
            {isLoading ? <RefreshCw size={13} className="aw-spin" /> : <Save size={13} />}
            {isLoading ? 'Saving...' : 'Change Password'}
          </button>
          <button type="button" onClick={closeWindow} className="aw-btn aw-btn-ghost">
            <X size={13} /> Close
          </button>
        </div>
      </div>

      <div className="aw-content">
        <div className="aw-stack aw-narrow" style={{ maxWidth: 520 }}>
          {toast && (
            <div className={`aw-alert aw-fade-in ${toast.type === 'success' ? 'aw-alert-success' : 'aw-alert-danger'}`} style={{ marginBottom: 0 }} role="status">
              {toast.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
              <span>{toast.msg}</span>
            </div>
          )}

          <section className="aw-card">
            <div className="aw-card-head">
              <span className="aw-card-icon"><User size={14} /></span>
              <h2 className="aw-card-title">Account</h2>
            </div>
            <div className="aw-stack">
              <div>
                <label className="aw-label" htmlFor="cp-user">Username</label>
                <Select
                  id="cp-user"
                  className={`aw-select ${errors.userName ? 'is-invalid' : ''}`}
                  popupClassName="aw-select-popup"
                  showSearch
                  optionFilterProp="label"
                  value={formData.userName || undefined}
                  onChange={(v) => updateField('userName', v ?? '')}
                  placeholder="Select user..."
                  notFoundContent="No users found"
                  options={users.map(u => ({ value: u.susername, label: u.susername }))}
                />
                {errLine(errors.userName)}
              </div>
              <div>
                {pwField('cp-current', 'Current Password', 'currentPassword', 'current', 'Enter current password', !!errors.currentPassword)}
                {errLine(errors.currentPassword)}
              </div>
            </div>
          </section>

          <section className="aw-card">
            <div className="aw-card-head">
              <span className="aw-card-icon"><Lock size={14} /></span>
              <h2 className="aw-card-title">New Password</h2>
            </div>
            <div className="aw-stack">
              <div>
                {pwField('cp-new', 'New Password', 'newPassword', 'new', 'Min 8 chars, upper, lower, digit', !!errors.newPassword)}
                {formData.newPassword && (
                  <div className="aw-fade-in" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <div style={{ flex: 1, display: 'flex', gap: 4 }}>
                      {[1, 2, 3].map(i => (
                        <span
                          key={i}
                          style={{
                            flex: 1, height: 4, borderRadius: 4,
                            background: pwStrength >= i ? STRENGTH_TONES[pwStrength] : 'var(--aw-border)',
                            transition: 'background-color .26s cubic-bezier(.32, .72, 0, 1)',
                          }}
                        />
                      ))}
                    </div>
                    <span className="aw-meta" style={{ color: STRENGTH_TONES[pwStrength], fontWeight: 700 }}>{STRENGTH_LABELS[pwStrength]}</span>
                  </div>
                )}
                {errLine(errors.newPassword)}
              </div>

              <div>
                {pwField('cp-confirm', 'Confirm Password', 'confirmPassword', 'confirm', 'Re-enter new password', !!errors.confirmPassword || pwMatch === false)}
                {(errors.confirmPassword || pwMatch !== null) && (
                  (errors.confirmPassword || pwMatch === false)
                    ? errLine(errors.confirmPassword || 'Passwords do not match')
                    : <p className="aw-meta" style={{ marginTop: 4, color: 'var(--aw-success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={12} />Passwords match</p>
                )}
              </div>

              <p className="aw-meta">Min 8 chars · uppercase · lowercase · digit</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
