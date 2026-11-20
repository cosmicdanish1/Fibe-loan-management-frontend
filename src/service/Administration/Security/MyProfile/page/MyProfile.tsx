import React, { useEffect, useState } from 'react';
import { User, Mail, Phone, Briefcase, ShieldCheck, Clock, Lock, Zap, TrendingUp, IdCard, CheckCircle2, KeyRound } from 'lucide-react';
import { useAuth } from '../../../../../auth/context/AuthContext';
import AwDialog from '@/components/shared/kit/AwDialog';
import PasswordInput from '../../../../../components/shared/PasswordInput';
import { useTranslation } from 'react-i18next';
import { GOLD_GLOW_STYLE, useEggHunt } from '../../../../../utils/eggHunt';
import { apiService } from '../../../../../services/api';
import { getApiBaseUrlSync } from '../../../../../services/apiVersionConfig';
import { useChangePassword } from '../../ChangePassword/hook/useChangePassword';

// One sign-in of the signed-in user, from the login log (GET /auth/me/recent-logins).
type LoginRow = { loginDate: string; loginTime: string; logoutTime: string | null; active: boolean };

const formatLoginDay = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const hhmm = (time?: string | null) => (time ? time.slice(0, 5) : '');
const loginStamp = (row: LoginRow) => `${formatLoginDay(row.loginDate)}${hhmm(row.loginTime) ? `, ${hhmm(row.loginTime)}` : ''}`;

const MyProfile: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [tab, setTab] = useState<'info' | 'security'>('info');
  const [modal, setModal] = useState<null | 'password'>(null);
  const [pwdDone, setPwdDone] = useState(false);
  const pwd = useChangePassword();

  // The signed-in user's own record and sign-ins. Nothing on this page is made up: what the system does not hold
  // (phone, department) shows as "Not recorded".
  const [me, setMe] = useState<{ fullName?: string; email?: string; role?: string } | null>(null);
  const [logins, setLogins] = useState<LoginRow[] | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r: any = await apiService.get('/auth/me');
        if (alive && r?.success !== false) setMe(r?.data ?? r);
      } catch { /* the page still shows the session's username and role */ }
      try {
        const r: any = await apiService.get('/auth/me/recent-logins?limit=5');
        if (alive) setLogins(Array.isArray(r?.data) ? r.data : []);
      } catch { if (alive) setLogins([]); }
    })();
    return () => { alive = false; };
  }, []);

  const notRecorded = t('Not recorded');
  const username = user?.username || '';
  const fullName = me?.fullName || username || '—';
  const email = me?.email || user?.email || '';
  const role = me?.role || user?.role || '';
  const server = (() => { try { return new URL(getApiBaseUrlSync(), window.location.href).host; } catch { return ''; } })();
  const lastLogin = logins && logins.length > 0 ? logins[0] : null;

  const submitPassword = async () => {
    const result = await pwd.submitPasswordChange();
    if (result.success) { setModal(null); setPwdDone(true); }
  };

  const closeModal = () => {
    setModal(null);
    pwd.resetForm();
  };

  const initial = (fullName.charAt(0) || 'A').toUpperCase();
  const eggs = useEggHunt();

  const activityPanel = (
    <section className="aw-card">
      <div className="aw-card-head">
        <span className="aw-card-icon"><Clock size={16} /></span>
        <div className="min-w-0">
          <h2 className="aw-card-title">{t('Recent activity')}</h2>
          <p className="mp-desc">{t('Your latest sign-ins')}</p>
        </div>
      </div>
      {logins && logins.length === 0 ? (
        <p className="aw-meta">{t('No sign-ins recorded yet')}</p>
      ) : (
        <div className="aw-rows">
          {(logins ?? []).map((log, i) => (
            <div key={`${log.loginDate}-${i}`} className="aw-row" style={{ alignItems: 'flex-start', gap: 12 }}>
              <span className="aw-avatar" style={{ width: 24, height: 24, cursor: 'default', color: log.active ? 'var(--aw-success)' : 'var(--aw-muted)', borderWidth: 1 }} aria-hidden>{log.active ? <Zap size={12} /> : <TrendingUp size={12} />}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="aw-inline" style={{ justifyContent: 'space-between', gap: 8 }}>
                  <strong>{t('Signed in')}</strong>
                  <span className="aw-meta" style={{ whiteSpace: 'nowrap' }}>{loginStamp(log)}</span>
                </div>
                <p className="aw-meta">{log.logoutTime ? `${t('Signed out at')} ${hhmm(log.logoutTime)}` : t('Session still open')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="app-window aw-calm aw-tint">
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <div className="aw-crumb">{t('Administration')}</div>
          <h1 className="aw-title">{t('My Profile')}</h1>
        </div>
        <div className="aw-actions">
          <span className="aw-pill tone-success"><span className="aw-status-dot" /> {t('Active session')}</span>
        </div>
      </div>

      <div className="aw-content">
        <div className="mp-layout">

          {/* ── Rail: who you are, where to go, this session ── */}
          <aside className="mp-rail">
            <div className="aw-card" style={{ alignItems: 'center', textAlign: 'center', gap: 12 }}>
              <div className="aw-avatar" style={{ width: 80, height: 80, fontSize: 32, cursor: 'default', color: 'var(--aw-accent)', ...(eggs.completed ? GOLD_GLOW_STYLE : {}) }} title={eggs.completed ? 'Easter-egg hunter' : undefined} aria-hidden>{initial}</div>
              <div style={{ minWidth: 0, maxWidth: '100%' }}>
                <h2 className="aw-title" style={{ overflowWrap: 'anywhere' }}>{fullName}</h2>
                {role && <p className="aw-meta" style={{ marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 8 }}><Briefcase size={12} /> {role}</p>}
              </div>
            </div>

            <nav className="aw-card mp-nav" aria-label={t('Sections')}>
              <button type="button" onClick={() => setTab('info')} aria-current={tab === 'info' ? 'page' : undefined} className="mp-nav-item">
                <User size={16} /> <span>{t('Personal information')}</span>
              </button>
              <button type="button" onClick={() => setTab('security')} aria-current={tab === 'security' ? 'page' : undefined} className="mp-nav-item">
                <Lock size={16} /> <span>{t('Security & authentication')}</span>
              </button>
            </nav>

            <section className="aw-card">
              <div className="aw-card-head">
                <span className="aw-card-icon"><Zap size={16} /></span>
                <h2 className="aw-card-title">{t('Live session')}</h2>
              </div>
              <dl className="aw-facts" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
                <div><dt>{t('Last sign-in')}</dt><dd>{lastLogin ? loginStamp(lastLogin) : '—'}</dd></div>
                <div><dt>{t('Connected server')}</dt><dd style={{ fontFamily: 'monospace' }}>{server || '—'}</dd></div>
              </dl>
            </section>
          </aside>

          {/* ── Main ── */}
          <main className="mp-main">
            {pwdDone && (
              <div className="aw-alert aw-alert-success aw-fade-in" role="status" style={{ marginBottom: 0 }}>
                <CheckCircle2 size={15} />
                <span>{t('Password updated. Your other sessions were signed out.')}</span>
              </div>
            )}

            {tab === 'info' && (
              <>
                <section className="aw-card aw-fade-in">
                  <div className="aw-card-head">
                    <span className="aw-card-icon"><User size={16} /></span>
                    <div className="min-w-0">
                      <h2 className="aw-card-title">{t('Personal information')}</h2>
                      <p className="mp-desc">{t('Your name and contact details as the system holds them')}</p>
                    </div>
                  </div>
                  <dl className="aw-facts">
                    <div><dt>{t('Full name')}</dt><dd>{fullName}</dd></div>
                    <div><dt>{t('Email address')}</dt><dd style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Mail size={13} /> {email || notRecorded}</dd></div>
                    <div><dt>{t('Phone')}</dt><dd style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Phone size={13} /> {notRecorded}</dd></div>
                    <div><dt>{t('Department')}</dt><dd>{notRecorded}</dd></div>
                  </dl>
                </section>

                <section className="aw-card aw-fade-in">
                  <div className="aw-card-head">
                    <span className="aw-card-icon"><IdCard size={16} /></span>
                    <div className="min-w-0">
                      <h2 className="aw-card-title">{t('System identity')}</h2>
                      <p className="mp-desc">{t('How you sign in and what you are allowed to do')}</p>
                    </div>
                  </div>
                  <dl className="aw-facts">
                    <div><dt>{t('Username')}</dt><dd style={{ fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 8 }}><User size={13} /> {username}</dd></div>
                    <div><dt>{t('Role')}</dt><dd><span className="aw-pill tone-info"><Zap size={11} /> {role}</span></dd></div>
                  </dl>
                </section>
              </>
            )}

            {tab === 'security' && (
              <div className="mp-pair aw-fade-in">
                <section className="aw-card">
                  <div className="aw-card-head">
                    <span className="aw-card-icon"><KeyRound size={16} /></span>
                    <div className="min-w-0">
                      <h2 className="aw-card-title">{t('Password management')}</h2>
                      <p className="mp-desc">{t('Update your password regularly to keep your account secure.')}</p>
                    </div>
                  </div>
                  <div>
                    <button type="button" onClick={() => { setPwdDone(false); setModal('password'); }} className="aw-btn aw-btn-secondary"><Zap size={13} /> {t('Change password')}</button>
                  </div>
                </section>

                <section className="aw-card">
                  <div className="aw-card-head">
                    <span className="aw-card-icon"><ShieldCheck size={16} /></span>
                    <div className="min-w-0">
                      <h2 className="aw-card-title">{t('Two-factor sign-in code')}</h2>
                      <p className="mp-desc">{t('Turn on the authenticator-app code for your account, scan your QR and keep your recovery codes in the Two-Factor & Approvals window.')}</p>
                    </div>
                  </div>
                  <div>
                    <button type="button" className="aw-btn aw-btn-secondary"
                      onClick={() => { const api = (window as any).electronAPI; if (api?.openNewWindow) api.openNewWindow('/two-factor-settings'); else window.location.hash = '#/two-factor-settings'; }}>
                      <ShieldCheck size={13} /> {t('Open Two-Factor & Approvals')}
                    </button>
                  </div>
                </section>
              </div>
            )}

            {activityPanel}
          </main>
        </div>
      </div>

      <div className="aw-footer">
        <span>{t('My Profile')}</span>
        <span>{username}</span>
      </div>

      <style>{`
        .mp-layout { display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start; max-width: 1440px; }
        .mp-rail { flex: 1 1 280px; max-width: 320px; display: flex; flex-direction: column; gap: var(--aw-gap); position: sticky; top: 0; }
        .mp-main { flex: 999 1 520px; min-width: 0; display: flex; flex-direction: column; gap: var(--aw-gap); }
        .mp-pair { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--aw-gap); align-items: start; }
        .mp-desc { margin: 2px 0 0; color: var(--aw-muted); font-size: calc(var(--type-body-size) - 1px); line-height: 1.4; }
        .mp-main .aw-card-icon, .mp-rail .aw-card-icon { width: 36px; height: 36px; border-radius: 12px; }
        .mp-main .aw-card-head { gap: 12px; }
        .mp-nav { padding: 8px; gap: 2px; }
        .mp-nav-item { display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px 12px; border: 0; border-radius: 10px; background: transparent; color: var(--aw-text); font: inherit; font-size: var(--type-field-size); font-weight: 500; text-align: left; cursor: pointer; transition-property: background-color; transition-duration: .2s; transition-timing-function: var(--aw-ease); }
        .mp-nav-item svg { flex: none; color: var(--aw-muted); }
        .mp-nav-item:hover { background: var(--aw-surface-muted); }
        .mp-nav-item[aria-current="page"] { background: color-mix(in srgb, var(--aw-accent) 10%, var(--aw-surface)); font-weight: 600; }
        .mp-nav-item[aria-current="page"] svg { color: var(--aw-accent); }
        .mp-nav-item:focus-visible { outline: 3px solid var(--aw-focus); outline-offset: 2px; }
        @media (max-width: 900px) { .mp-rail { position: static; flex-basis: 100%; max-width: none; } }
      `}</style>

      <AwDialog open={modal === 'password'} title={t('Change password')} onClose={closeModal} icon={<Lock size={14} />} maxWidth="28rem" compact>
        <div className="aw-stack">
          {([
            { field: 'currentPassword' as const, label: t('Current password') },
            { field: 'newPassword' as const, label: t('New password') },
            { field: 'confirmPassword' as const, label: t('Confirm new password') },
          ]).map(f => (
            <div key={f.field}>
              <PasswordInput className="aw-input" placeholder={f.label} aria-label={f.label} value={pwd.formData[f.field]} onChange={e => pwd.updateField(f.field, e.target.value)} />
              {pwd.errors[f.field] && <p className="aw-meta" style={{ marginTop: 4, color: 'var(--aw-danger)' }} role="alert">{pwd.errors[f.field]}</p>}
            </div>
          ))}
          {pwd.errors.general && (
            <div className="aw-alert aw-alert-danger" style={{ marginBottom: 0 }} role="alert"><span>{pwd.errors.general}</span></div>
          )}
          <button type="button" onClick={submitPassword} disabled={pwd.isLoading} className="aw-btn aw-btn-primary">
            {pwd.isLoading ? t('Updating…') : t('Update password')}
          </button>
        </div>
      </AwDialog>
    </div>
  );
};

export default MyProfile;
