import React, { useState } from 'react';
import { User, Mail, Phone, Briefcase, MapPin, ShieldCheck, Clock, Lock, Zap, TrendingUp, IdCard } from 'lucide-react';
import { useAuth } from '../../../../../auth/context/AuthContext';
import AwDialog from '@/components/shared/kit/AwDialog';

const ACTIVITY = [
  { action: 'System Login', date: 'Today, 10:23 AM', details: 'Successful login from IP 192.168.1.45', type: 'login' },
  { action: 'Password Changed', date: 'Yesterday, 04:15 PM', details: 'Security policy update', type: 'security' },
  { action: 'Role Updated', date: '28 Dec, 11:00 AM', details: 'Granted higher privileges', type: 'system' },
  { action: 'New Session', date: '25 Dec, 09:30 AM', details: 'Login from new device', type: 'login' },
];

const activityIcon = (type: string) => type === 'login' ? <Zap size={12} /> : type === 'security' ? <ShieldCheck size={12} /> : <TrendingUp size={12} />;
const activityTone = (type: string) => type === 'login' ? 'var(--aw-success)' : type === 'security' ? 'var(--aw-danger)' : 'var(--aw-muted)';

const MyProfile: React.FC = () => {
  const { user } = useAuth();

  const [tab, setTab] = useState<'info' | 'security'>('info');
  const [modal, setModal] = useState<null | 'edit' | 'password'>(null);

  const [profile, setProfile] = useState({
    fullName: user?.username || 'Admin User',
    username: user?.username || 'admin',
    email: 'thekovain@gmail.com',
    phone: '+91 7692829866',
    department: 'IT Administration',
    role: user?.role || 'Administrator',
  });

  const [editName, setEditName] = useState(profile.fullName);
  const [editEmail, setEditEmail] = useState(profile.email);
  const [editPhone, setEditPhone] = useState(profile.phone);

  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  const openEdit = () => {
    setEditName(profile.fullName);
    setEditEmail(profile.email);
    setEditPhone(profile.phone);
    setModal('edit');
  };

  const saveEdit = () => {
    setProfile(p => ({ ...p, fullName: editName, email: editEmail, phone: editPhone }));
    setModal(null);
  };

  const closeModal = () => {
    setModal(null);
    setCurPwd(''); setNewPwd(''); setConfirmPwd('');
  };

  const initial = (profile.fullName.charAt(0) || 'A').toUpperCase();
  const tabs = ['info', 'security'] as const;

  return (
    <div className="app-window">
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">My Profile</h1>
          <p className="aw-desc">Account &amp; security</p>
        </div>
        <div className="aw-actions">
          <span className="aw-pill tone-success"><span className="aw-status-dot" /> Active session</span>
        </div>
      </div>

      <div className="aw-content">
        <div className="aw-stack" style={{ maxWidth: 1080 }}>
          <section className="aw-card">
            <div className="aw-inline" style={{ gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="aw-avatar" style={{ width: 76, height: 76, fontSize: 30, cursor: 'default', color: 'var(--aw-accent)' }} aria-hidden>{initial}</div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div className="aw-inline" style={{ alignItems: 'center', gap: 8 }}>
                  <h2 className="aw-title">{profile.fullName}</h2>
                  <span className="aw-card-icon" style={{ width: 22, height: 22 }}><ShieldCheck size={12} /></span>
                </div>
                <p className="aw-meta" style={{ marginTop: 6, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Briefcase size={12} /> {profile.department}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><MapPin size={12} /> Head Office</span>
                </p>
              </div>
              <button type="button" onClick={openEdit} className="aw-btn aw-btn-secondary">Edit Profile</button>
            </div>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 'var(--aw-gap)', alignItems: 'start' }}>
            <section className="aw-card">
              <div className="aw-seg" role="tablist" style={{ maxWidth: 420, ['--seg-index' as any]: tab === 'security' ? 1 : 0, ['--seg-count' as any]: 2 }}>
                {tabs.map(t => (
                  <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
                    {t === 'info' ? 'Personal Information' : 'Security & Authentication'}
                  </button>
                ))}
              </div>

              {tab === 'info' && (
                <div className="aw-stack aw-fade-in">
                  <dl className="aw-facts">
                    <div><dt>Full name</dt><dd>{profile.fullName}</dd></div>
                    <div><dt>Email address</dt><dd style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={13} style={{ color: 'var(--aw-accent)' }} /> {profile.email}</dd></div>
                    <div><dt>Phone</dt><dd style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={13} style={{ color: 'var(--aw-success)' }} /> {profile.phone}</dd></div>
                    <div><dt>Department</dt><dd>{profile.department}</dd></div>
                  </dl>

                  <div className="aw-panel">
                    <span className="aw-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><IdCard size={13} /> System identity</span>
                    <dl className="aw-facts">
                      <div><dt>Username</dt><dd style={{ fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 6 }}><User size={13} /> {profile.username}</dd></div>
                      <div><dt>Role</dt><dd><span className="aw-pill tone-info" style={{ textTransform: 'uppercase' }}><Zap size={11} /> {profile.role}</span></dd></div>
                    </dl>
                  </div>
                </div>
              )}

              {tab === 'security' && (
                <div className="aw-empty aw-fade-in" style={{ padding: '32px 16px' }}>
                  <span className="aw-card-icon" style={{ width: 64, height: 64, borderRadius: '50%' }}><Lock size={28} /></span>
                  <p className="aw-strong">Password management</p>
                  <span className="aw-meta" style={{ maxWidth: 320 }}>Update your password regularly to keep your account secure.</span>
                  <button type="button" onClick={() => setModal('password')} className="aw-btn aw-btn-secondary"><Zap size={13} /> Change password</button>
                </div>
              )}
            </section>

            <div className="aw-stack">
              <section className="aw-card">
                <div className="aw-card-head">
                  <span className="aw-card-icon"><Clock size={14} /></span>
                  <h2 className="aw-card-title">Recent activity</h2>
                </div>
                <div className="aw-rows">
                  {ACTIVITY.map((log, i) => (
                    <div key={i} className="aw-row" style={{ alignItems: 'flex-start', gap: 10 }}>
                      <span className="aw-avatar" style={{ width: 25, height: 25, cursor: 'default', color: activityTone(log.type), borderWidth: 1 }} aria-hidden>{activityIcon(log.type)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="aw-inline" style={{ justifyContent: 'space-between', gap: 8 }}>
                          <strong>{log.action}</strong>
                          <span className="aw-meta" style={{ whiteSpace: 'nowrap' }}>{log.date}</span>
                        </div>
                        <p className="aw-meta">{log.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="aw-card">
                <div className="aw-card-head">
                  <span className="aw-card-icon"><Zap size={14} /></span>
                  <h2 className="aw-card-title">Live session</h2>
                </div>
                <dl className="aw-facts">
                  <div><dt>Device ID</dt><dd style={{ fontFamily: 'monospace' }}>WIN-X86-22</dd></div>
                  <div><dt>Location</dt><dd style={{ fontFamily: 'monospace' }}>India</dd></div>
                </dl>
                <div className="aw-panel">
                  <span className="aw-label">Current IP address</span>
                  <p className="aw-strong" style={{ fontFamily: 'monospace', color: 'var(--aw-success)' }}>192.168.1.45</p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      <div className="aw-footer">
        <span>My Profile</span>
        <span>{profile.username}</span>
      </div>

      <AwDialog open={modal === 'edit'} title="Edit profile" onClose={closeModal} icon={<User size={14} />} maxWidth="28rem" compact>
        <div className="aw-stack">
          {[
            { id: 'mp-name', label: 'Full name', val: editName, set: setEditName },
            { id: 'mp-email', label: 'Email address', val: editEmail, set: setEditEmail },
            { id: 'mp-phone', label: 'Phone', val: editPhone, set: setEditPhone },
          ].map(f => (
            <div key={f.id}>
              <label className="aw-label" htmlFor={f.id}>{f.label}</label>
              <input id={f.id} className="aw-input" value={f.val} onChange={e => f.set(e.target.value)} />
            </div>
          ))}
          <div className="aw-btn-row">
            <button type="button" onClick={closeModal} className="aw-btn aw-btn-secondary">Cancel</button>
            <button type="button" onClick={saveEdit} className="aw-btn aw-btn-primary">Save changes</button>
          </div>
        </div>
      </AwDialog>

      <AwDialog open={modal === 'password'} title="Change password" onClose={closeModal} icon={<Lock size={14} />} maxWidth="28rem" compact>
        <div className="aw-stack">
          <input className="aw-input" type="password" placeholder="Current password" aria-label="Current password" value={curPwd} onChange={e => setCurPwd(e.target.value)} />
          <input className="aw-input" type="password" placeholder="New password" aria-label="New password" value={newPwd} onChange={e => setNewPwd(e.target.value)} />
          <input className="aw-input" type="password" placeholder="Confirm new password" aria-label="Confirm new password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} />
          <button type="button" onClick={closeModal} className="aw-btn aw-btn-primary">Update password</button>
        </div>
      </AwDialog>
    </div>
  );
};

export default MyProfile;
