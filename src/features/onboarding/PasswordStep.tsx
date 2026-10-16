import React, { useState } from 'react';
import { Check, Circle, Eye, EyeOff } from 'lucide-react';
import type { User } from '../../auth/types/auth.types';
import { apiService } from '../../services/api';

// Same policy the server enforces (ChangePasswordDto): 8+ characters with upper, lower and a digit.
const rulesFor = (current: string, next: string) => [
  { label: 'At least 8 characters', ok: next.length >= 8 },
  { label: 'An uppercase letter', ok: /[A-Z]/.test(next) },
  { label: 'A lowercase letter', ok: /[a-z]/.test(next) },
  { label: 'A number', ok: /\d/.test(next) },
  { label: 'Different from your current password', ok: next.length > 0 && next !== current },
];

const PasswordInput: React.FC<{
  id: string; label: string; value: string; onChange: (v: string) => void; autoComplete: string;
}> = ({ id, label, value, onChange, autoComplete }) => {
  const [shown, setShown] = useState(false);
  return (
    <div className="ob-field">
      <label htmlFor={id}>{label}</label>
      <div className="ob-input-wrap">
        <input id={id} className="ob-input" type={shown ? 'text' : 'password'} value={value} autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)} />
        <button type="button" className="ob-eye" aria-label={shown ? 'Hide password' : 'Show password'} onClick={() => setShown((s) => !s)}>
          {shown ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
};

/**
 * Optional first-login password change. It calls the same endpoint as Administration > Change Password.
 * Nothing is required: the dialog's "Skip for now" button moves on without touching the password.
 */
export const PasswordStep: React.FC<{ user: User; onDone: () => void; onChanged: () => void }> = ({ user, onDone, onChanged }) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [changed, setChanged] = useState(false);

  const rules = rulesFor(current, next);
  const matches = next.length > 0 && next === confirm;
  const valid = current.length > 0 && rules.every((r) => r.ok) && matches;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setError('');
    const res: any = await apiService.changePassword(user.username, current, next);
    setSaving(false);
    if (res?.success === false) {
      setError(res.message || res.error || 'Could not change the password.');
      return;
    }
    // Drop the secrets from memory as soon as they are used.
    setCurrent(''); setNext(''); setConfirm('');
    setChanged(true);
    onChanged();
  };

  if (changed) {
    return (
      <div className="ob-success">
        <div className="ob-success-icon"><Check size={28} /></div>
        <h3 className="ob-title">Password updated</h3>
        <p className="ob-lead" style={{ margin: '6px 0 14px' }}>Use your new password the next time you sign in.</p>
        <button type="button" className="ob-btn ob-btn-primary" onClick={onDone}>Continue</button>
      </div>
    );
  }

  return (
    <form className="ob-form" onSubmit={submit} noValidate>
      <p className="ob-lead" style={{ margin: 0 }}>If you were given a temporary password, choose one only you know.</p>
      {error && <div className="ob-note is-error" role="alert">{error}</div>}
      <PasswordInput id="ob-current" label="Current password" value={current} onChange={setCurrent} autoComplete="current-password" />
      <PasswordInput id="ob-new" label="New password" value={next} onChange={setNext} autoComplete="new-password" />
      <PasswordInput id="ob-confirm" label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
      <ul className="ob-rules">
        {rules.map((r) => (
          <li key={r.label} className={`ob-rule ${r.ok ? 'is-ok' : ''}`}>
            {r.ok ? <Check size={14} /> : <Circle size={14} />} {r.label}
          </li>
        ))}
        <li className={`ob-rule ${matches ? 'is-ok' : ''}`}>{matches ? <Check size={14} /> : <Circle size={14} />} Both entries match</li>
      </ul>
      <div>
        <button type="submit" className="ob-btn ob-btn-primary" disabled={!valid || saving}>
          {saving ? 'Saving…' : 'Update password'}
        </button>
      </div>
    </form>
  );
};

export default PasswordStep;
