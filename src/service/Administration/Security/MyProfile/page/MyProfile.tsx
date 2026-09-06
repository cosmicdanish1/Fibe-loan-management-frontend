import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../../../auth/context/AuthContext';

const ACTIVITY = [
  { action: 'System Login', date: 'Today, 10:23 AM', details: 'Successful login from IP 192.168.1.45', type: 'login' },
  { action: 'Password Changed', date: 'Yesterday, 04:15 PM', details: 'Security policy update', type: 'security' },
  { action: 'Role Updated', date: '28 Dec, 11:00 AM', details: 'Granted higher privileges', type: 'system' },
  { action: 'New Session', date: '25 Dec, 09:30 AM', details: 'Login from new device', type: 'login' },
];

function ActivityIcon({ type }: { type: string }) {
  if (type === 'login') return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="12" height="12">
      <path d="M8 12l6-8h-3l-6 8h3l-2 8 6-8h-3z" />
    </svg>
  );
  if (type === 'security') return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="12" height="12">
      <path d="M12 3.5l7 2.5v6c0 4-3 7-7 8.5-4-1.5-7-4.5-7-8.5V6z" />
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="12" height="12">
      <path d="M4 17l5-5 4 4 7-9" />
    </svg>
  );
}

function activityDotStyle(type: string): React.CSSProperties {
  if (type === 'login') return { background: 'rgba(52,199,89,0.16)', color: '#12622f' };
  if (type === 'security') return { background: 'rgba(255,55,95,0.14)', color: '#c81e42' };
  return { background: 'rgba(16,21,28,0.08)', color: '#475569' };
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 13px', borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.7)',
  fontSize: 13.5, fontFamily: 'inherit', color: '#10151c', outline: 'none',
  transition: 'border-color 0.18s, box-shadow 0.18s', boxSizing: 'border-box',
};

const MyProfile: React.FC = () => {
  const { user } = useAuth();

  const [tab, setTab] = useState<'info' | 'security'>('info');
  const [modal, setModal] = useState<null | 'edit' | 'password'>(null);

  const [profile, setProfile] = useState({
    fullName: user?.username || 'Admin User',
    username: user?.username || 'admin',
    email: 'admin@loansystem.com',
    phone: '+91 98765 43210',
    department: 'IT Administration',
    role: user?.role || 'Administrator',
  });

  const [editName, setEditName] = useState(profile.fullName);
  const [editEmail, setEditEmail] = useState(profile.email);
  const [editPhone, setEditPhone] = useState(profile.phone);

  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setModal(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onAvatarMove = (e: React.MouseEvent) => {
    const el = avatarRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${(px * 22).toFixed(1)}deg) rotateX(${(-py * 18).toFixed(1)}deg)`;
  };
  const onAvatarLeave = () => {
    if (avatarRef.current) avatarRef.current.style.transform = 'rotateY(0) rotateX(0)';
  };

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

  const tabBg = (t: 'info' | 'security') =>
    tab === t ? 'rgba(255,255,255,0.85)' : 'transparent';
  const tabColor = (t: 'info' | 'security') =>
    tab === t ? '#10151c' : 'rgba(16,21,28,0.52)';
  const tabShadow = (t: 'info' | 'security') =>
    tab === t ? '0 3px 10px rgba(16,21,28,0.1)' : 'none';

  const glassCard: React.CSSProperties = {
    position: 'relative', overflow: 'hidden', borderRadius: 22,
    background: 'rgba(255,255,255,0.55)',
    backdropFilter: 'blur(30px) saturate(180%)',
    WebkitBackdropFilter: 'blur(30px) saturate(180%)',
    border: '1px solid rgba(255,255,255,0.7)',
    boxShadow: '0 14px 34px -16px rgba(16,21,28,0.26), inset 0 1px 0 rgba(255,255,255,0.85)',
  };

  const fieldLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: 'rgba(16,21,28,0.52)', marginBottom: 6,
  };

  const fieldVal: React.CSSProperties = { fontSize: 14.5, fontWeight: 600 };

  return (
    <div className="myp-app" style={{ position: 'relative', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif", color: '#10151c', background: 'linear-gradient(180deg, #f2f5fa 0%, #e6ebf3 100%)', WebkitFontSmoothing: 'antialiased' }}>

      <style>{`
        :root { --mp-accent: #0a84ff; --mp-ink2: rgba(16,21,28,0.52); }
        @keyframes mp-drift1 { 0%,100%{transform:translate3d(0,0,0) scale(1)} 50%{transform:translate3d(6vw,4vh,0) scale(1.15)} }
        @keyframes mp-drift2 { 0%,100%{transform:translate3d(0,0,0) scale(1.1)} 50%{transform:translate3d(-7vw,-5vh,0) scale(0.9)} }
        @keyframes mp-fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes mp-popIn { from{opacity:0;transform:translateY(24px) scale(0.94)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes mp-riseIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes mp-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.35;transform:scale(.72)} }
        @keyframes mp-sheen { 0%{transform:translateX(-120%) skewX(-18deg)} 100%{transform:translateX(320%) skewX(-18deg)} }
        .mp-blob1{animation:mp-drift1 28s ease-in-out infinite}
        .mp-blob2{animation:mp-drift2 34s ease-in-out infinite}
        .mp-pulse{animation:mp-pulse 2.2s ease-in-out infinite;display:inline-block;width:7px;height:7px;border-radius:50%;background:#34c759}
        .mp-sheen{animation:mp-sheen 8s ease-in-out infinite;pointer-events:none}
        .mp-rise0{animation:mp-riseIn .55s cubic-bezier(.22,1,.36,1) both}
        .mp-rise1{animation:mp-riseIn .55s .08s cubic-bezier(.22,1,.36,1) both}
        .mp-rise2{animation:mp-riseIn .55s .14s cubic-bezier(.22,1,.36,1) both}
        .mp-rise3{animation:mp-riseIn .55s .2s cubic-bezier(.22,1,.36,1) both}
        .mp-modal-bg{animation:mp-fadeIn .22s ease both}
        .mp-modal-box{animation:mp-popIn .42s cubic-bezier(.22,1,.36,1) both}
        .mp-edit-btn:hover{background:#fff!important}
        .mp-tab:hover{color:#10151c!important}
        .mp-pw-btn:hover{background:rgba(10,132,255,.16)!important}
        .mp-cancel:hover{background:#fff!important}
        .mp-save:hover{filter:brightness(1.06)}
        .mp-update:hover{filter:brightness(1.06)}
        .mp-close:hover{background:#fff!important;color:#10151c!important}
        .mp-scroll::-webkit-scrollbar{width:8px}
        .mp-scroll::-webkit-scrollbar-thumb{background:rgba(16,21,28,.18);border-radius:99px}
        .mp-scroll::-webkit-scrollbar-track{background:transparent}
        .mp-input:focus{border-color:var(--mp-accent)!important;box-shadow:0 0 0 3px rgba(10,132,255,.18)!important}

        html.dark .myp-app { background: #000000 !important; color: #f5f5f7 !important; --mp-ink2: #8e8e93; }
        html.dark .myp-header { background: #0c0c0e !important; border-bottom-color: rgba(255,255,255,.08) !important; box-shadow: none !important; }
        html.dark .myp-card,
        html.dark .myp-tabcard,
        html.dark .myp-activitycard { background: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; box-shadow: none !important; }
        html.dark .myp-avatar-frame { background: #1c1c1e !important; }
        html.dark .mp-edit-btn { background: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
        html.dark .mp-edit-btn:hover { background: rgba(255,255,255,.08) !important; }
        html.dark .myp-divider,
        html.dark .myp-divider-top { background: rgba(255,255,255,.07) !important; border-top-color: rgba(255,255,255,.07) !important; }
        html.dark .myp-label { color: #8e8e93 !important; }
        html.dark .myp-chip { background: rgba(255,255,255,.05) !important; }
        html.dark .myp-timeline-line { background: rgba(255,255,255,.08) !important; }
        html.dark .mp-tab-inactive { color: #8e8e93 !important; }
        html.dark .mp-tab-active { background: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
        html.dark .mp-input { background: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
        html.dark .mp-modal-bg { background: rgba(0,0,0,.55) !important; }
        html.dark .mp-modal-box { background: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .mp-close { background: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.08) !important; color: #8e8e93 !important; }
        html.dark .mp-close:hover { background: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
        html.dark .mp-cancel { background: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
        html.dark .mp-cancel:hover { background: rgba(255,255,255,.08) !important; }
      `}</style>

      {/* Background blobs */}
      <div style={{ position: 'absolute', inset: '-10%', pointerEvents: 'none', overflow: 'hidden' }}>
        <div className="mp-blob1" style={{ position: 'absolute', width: '44vw', height: '44vw', left: '-6vw', top: '-10vw', borderRadius: '50%', background: 'radial-gradient(circle at 40% 40%, rgba(10,132,255,0.5), rgba(10,132,255,0) 70%)', filter: 'blur(42px)' }}></div>
        <div className="mp-blob2" style={{ position: 'absolute', width: '38vw', height: '38vw', right: '-4vw', top: '10vh', borderRadius: '50%', background: 'radial-gradient(circle at 50% 50%, rgba(175,82,222,0.4), rgba(175,82,222,0) 70%)', filter: 'blur(48px)' }}></div>
      </div>

      {/* Header */}
      <div className="myp-header" style={{ position: 'relative', zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '12px 22px', background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', borderBottom: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 1px 0 rgba(16,21,28,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', width: 34, height: 34, borderRadius: 11, display: 'grid', placeItems: 'center', background: 'linear-gradient(160deg, #c471f5, #0a84ff 55%, #7d2ae8)', boxShadow: '0 6px 16px rgba(120,80,230,0.38), inset 0 1px 0 rgba(255,255,255,0.6)', overflow: 'hidden' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round">
              <circle cx="12" cy="8" r="3.6"></circle>
              <path d="M5.5 20c1.4-3.4 4-5.1 6.5-5.1s5.1 1.7 6.5 5.1"></path>
            </svg>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(100deg, transparent 40%, rgba(255,255,255,0.55) 50%, transparent 60%)' }}></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1 }}>My Profile</div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--mp-ink2)', letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1 }}>Account &amp; security</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, color: '#12622f', background: 'rgba(52,199,89,0.16)', border: '1px solid rgba(52,199,89,0.32)' }}>
          <span className="mp-pulse"></span>
          Active session
        </div>
      </div>

      {/* Scrollable body */}
      <div className="mp-scroll" style={{ position: 'relative', zIndex: 4, flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: 22 }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Profile banner card */}
          <div className="mp-rise0 myp-card" style={{ position: 'relative', overflow: 'hidden', borderRadius: 26, background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(30px) saturate(180%)', WebkitBackdropFilter: 'blur(30px) saturate(180%)', border: '1px solid rgba(255,255,255,0.7)', boxShadow: '0 18px 40px -18px rgba(16,21,28,0.28), inset 0 1px 0 rgba(255,255,255,0.85)' }}>
            {/* Banner */}
            <div style={{ position: 'relative', height: 148, background: 'linear-gradient(135deg, #1a0b3d 0%, #3a1c78 45%, #7d2ae8 100%)', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 90% at 8% 0%, rgba(255,255,255,0.22), rgba(255,255,255,0) 55%)' }}></div>
              <div className="mp-sheen" style={{ position: 'absolute', top: 0, bottom: 0, width: '22%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)' }}></div>
            </div>
            {/* Profile info row */}
            <div style={{ position: 'relative', padding: '0 28px 24px', display: 'flex', alignItems: 'flex-end', gap: 20, marginTop: -54 }}>
              <div onMouseMove={onAvatarMove} onMouseLeave={onAvatarLeave} style={{ perspective: 600 }}>
                <div ref={avatarRef} className="myp-avatar-frame" style={{ width: 104, height: 104, borderRadius: 26, padding: 5, background: '#fff', boxShadow: '0 18px 34px -14px rgba(16,21,28,0.4)', transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1)' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: 21, background: 'linear-gradient(150deg, #c471f5, #7d2ae8)', display: 'grid', placeItems: 'center', fontSize: 38, fontWeight: 700, color: '#fff' }}>{initial}</div>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, paddingBottom: 4 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>{profile.fullName}</div>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'rgba(10,132,255,0.14)' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0a84ff" strokeWidth="2.4" strokeLinecap="round"><path d="M12 3.5l7 2.5v6c0 4-3 7-7 8.5-4-1.5-7-4.5-7-8.5V6z"></path></svg>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--mp-ink2)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="4" y="7" width="16" height="12" rx="2"></rect><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"></path></svg>
                      {profile.department}
                    </span>
                    <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--mp-ink2)', display: 'inline-block' }}></span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 21s-6.5-5.2-6.5-10A6.5 6.5 0 0112 4a6.5 6.5 0 016.5 6.5c0 4.8-6.5 10-6.5 10z"></path><circle cx="12" cy="10.5" r="2"></circle></svg>
                      Mumbai, Head Office
                    </span>
                  </div>
                </div>
                <button className="mp-edit-btn" onClick={openEdit} style={{ padding: '10px 18px', borderRadius: 13, border: '1px solid rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, color: '#10151c', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 3px 10px rgba(16,21,28,0.08)', transition: 'background 0.18s' }}>Edit Profile</button>
              </div>
            </div>
          </div>

          {/* 2-column grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, alignItems: 'start' }}>

            {/* Left — tab card */}
            <div className="mp-rise1 myp-tabcard" style={{ ...glassCard }}>
              {/* Tab bar */}
              <div style={{ display: 'flex', gap: 6, padding: '14px 16px 0' }}>
                {(['info', 'security'] as const).map(t => (
                  <button key={t} className={`mp-tab ${tab === t ? 'mp-tab-active' : 'mp-tab-inactive'}`} onClick={() => setTab(t)} style={{ padding: '9px 16px', borderRadius: 11, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, background: tabBg(t), color: tabColor(t), boxShadow: tabShadow(t), transition: 'background 0.2s, color 0.2s, box-shadow 0.2s' }}>
                    {t === 'info' ? 'Personal Information' : 'Security & Authentication'}
                  </button>
                ))}
              </div>
              <div className="myp-divider" style={{ height: 1, background: 'rgba(16,21,28,0.06)', marginTop: 12 }}></div>

              {/* Personal Info tab */}
              {tab === 'info' && (
                <div style={{ padding: '20px 22px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <div className="myp-label" style={fieldLabel}>Full name</div>
                      <div style={fieldVal}>{profile.fullName}</div>
                    </div>
                    <div>
                      <div className="myp-label" style={fieldLabel}>Email address</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, ...fieldVal }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0a84ff" strokeWidth="2" strokeLinecap="round"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3 7l9 6 9-6"></path></svg>
                        {profile.email}
                      </div>
                    </div>
                    <div>
                      <div className="myp-label" style={fieldLabel}>Phone</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, ...fieldVal }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34c759" strokeWidth="2" strokeLinecap="round"><path d="M6.6 10.8a8 8 0 0011 5.2L21 20l-1.5-4a8 8 0 10-12.9-5.2z"></path></svg>
                        {profile.phone}
                      </div>
                    </div>
                    <div>
                      <div className="myp-label" style={fieldLabel}>Department</div>
                      <div style={fieldVal}>{profile.department}</div>
                    </div>
                  </div>

                  <div className="myp-divider-top" style={{ borderTop: '1px solid rgba(16,21,28,0.07)', paddingTop: 18 }}>
                    <div className="myp-label" style={{ display: 'flex', alignItems: 'center', gap: 7, ...fieldLabel, marginBottom: 14 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 3.5l7 2.5v6c0 4-3 7-7 8.5-4-1.5-7-4.5-7-8.5V6z"></path></svg>
                      System identity
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <div className="myp-label" style={fieldLabel}>Username</div>
                        <div className="myp-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 10, background: 'rgba(16,21,28,0.06)', fontFamily: "'SF Mono', ui-monospace, monospace", fontSize: 13, fontWeight: 600 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(16,21,28,0.52)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="3.6"></circle><path d="M5.5 20c1.4-3.4 4-5.1 6.5-5.1s5.1 1.7 6.5 5.1"></path></svg>
                          {profile.username}
                        </div>
                      </div>
                      <div>
                        <div className="myp-label" style={fieldLabel}>Role</div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 13px', borderRadius: 10, background: 'rgba(175,82,222,0.16)', color: '#7d2ae8', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M8 12l6-8h-3l-6 8h3l-2 8 6-8h-3z"></path></svg>
                          {profile.role}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Security tab */}
              {tab === 'security' && (
                <div style={{ padding: '42px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16 }}>
                  <div style={{ width: 76, height: 76, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'rgba(10,132,255,0.12)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)' }}>
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#0a84ff" strokeWidth="1.6" strokeLinecap="round"><rect x="5" y="11" width="14" height="9" rx="2"></rect><path d="M8 11V7a4 4 0 018 0v4"></path></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em' }}>Password management</div>
                    <div style={{ fontSize: 13.5, color: 'var(--mp-ink2)', marginTop: 6, maxWidth: 320 }}>Update your password regularly to keep your account secure.</div>
                  </div>
                  <button className="mp-pw-btn" onClick={() => setModal('password')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 13, border: '1.5px solid rgba(10,132,255,0.4)', background: 'rgba(10,132,255,0.08)', color: '#0a84ff', fontSize: 12.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.18s' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M8 12l6-8h-3l-6 8h3l-2 8 6-8h-3z"></path></svg>
                    Change password
                  </button>
                </div>
              )}
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Recent activity */}
              <div className="mp-rise2 myp-activitycard" style={{ ...glassCard, padding: '18px 20px 6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0a84ff" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3.5 2"></path></svg>
                    <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--mp-ink2)' }}>Recent activity</span>
                  </div>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#0a84ff', display: 'inline-block' }}></span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {ACTIVITY.map((log, i) => {
                    const dot = activityDotStyle(log.type);
                    return (
                      <div key={i} style={{ display: 'flex', gap: 10, paddingBottom: 18, position: 'relative' }}>
                        {i < ACTIVITY.length - 1 && (
                          <div className="myp-timeline-line" style={{ position: 'absolute', left: 12, top: 24, bottom: 0, width: 1.5, background: 'rgba(16,21,28,0.1)' }}></div>
                        )}
                        <div style={{ flexShrink: 0, width: 25, height: 25, borderRadius: '50%', display: 'grid', placeItems: 'center', background: dot.background, color: dot.color }}>
                          <ActivityIcon type={log.type} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                            <span style={{ flexShrink: 0, whiteSpace: 'nowrap', fontSize: 12.5, fontWeight: 700 }}>{log.action}</span>
                            <span className="myp-chip" style={{ flexShrink: 0, whiteSpace: 'nowrap', fontSize: 10.5, fontWeight: 600, color: 'var(--mp-ink2)', background: 'rgba(16,21,28,0.06)', padding: '2px 6px', borderRadius: 6 }}>{log.date}</span>
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--mp-ink2)', marginTop: 3, lineHeight: 1.4 }}>{log.details}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live session */}
              <div className="mp-rise3" style={{ position: 'relative', overflow: 'hidden', borderRadius: 22, padding: '18px 20px', color: '#fff', background: 'linear-gradient(155deg, #14152b 0%, #1c1d3d 60%, #26144f 100%)', boxShadow: '0 18px 34px -16px rgba(16,21,28,0.5), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
                <div style={{ position: 'absolute', right: -20, bottom: -20, width: 130, height: 130, borderRadius: '50%', background: 'radial-gradient(circle, rgba(120,80,230,0.35), transparent 70%)' }}></div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#a78bfa', marginBottom: 14 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M13 3L6 13h5l-1 8 7-10h-5z"></path></svg>
                  Live session
                </div>
                <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>Device ID</div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 4, fontFamily: "'SF Mono', ui-monospace, monospace", color: '#cbd5e1' }}>WIN-X86-22</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>Location</div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 4, fontFamily: "'SF Mono', ui-monospace, monospace", color: '#cbd5e1' }}>Mumbai, IN</div>
                  </div>
                </div>
                <div style={{ position: 'relative', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>Current IP address</div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4, fontFamily: "'SF Mono', ui-monospace, monospace", color: '#34d399', letterSpacing: '0.02em' }}>192.168.1.45</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {modal && (
        <div className="mp-modal-bg" onClick={closeModal} style={{ position: 'absolute', inset: 0, zIndex: 40, display: 'grid', placeItems: 'center', padding: 32, background: 'rgba(16,21,28,0.26)', backdropFilter: 'blur(14px) saturate(140%)', WebkitBackdropFilter: 'blur(14px) saturate(140%)' }}>
          <div className="mp-modal-box" onClick={e => e.stopPropagation()} style={{ position: 'relative', overflow: 'hidden', width: '100%', maxWidth: 440, borderRadius: 26, padding: '26px 26px 22px', background: 'rgba(255,255,255,0.76)', backdropFilter: 'blur(40px) saturate(200%)', WebkitBackdropFilter: 'blur(40px) saturate(200%)', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 40px 80px -30px rgba(16,21,28,0.55), inset 0 1px 0 rgba(255,255,255,0.95)' }}>
            <div style={{ position: 'absolute', top: '-40%', left: '-20%', width: '70%', height: '120%', background: 'radial-gradient(closest-side, rgba(175,82,222,0.22), transparent)', pointerEvents: 'none' }}></div>

            {/* Edit Profile modal */}
            {modal === 'edit' && (
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--mp-ink2)' }}>Account</div>
                    <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 4 }}>Edit profile</div>
                  </div>
                  <button className="mp-close" onClick={closeModal} style={{ flexShrink: 0, width: 30, height: 30, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--mp-ink2)', fontFamily: 'inherit', transition: 'background 0.18s, color 0.18s' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"></path></svg>
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 18 }}>
                  {[
                    { label: 'Full name', val: editName, set: setEditName },
                    { label: 'Email address', val: editEmail, set: setEditEmail },
                    { label: 'Phone', val: editPhone, set: setEditPhone },
                  ].map(f => (
                    <div key={f.label}>
                      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--mp-ink2)', marginBottom: 6 }}>{f.label}</div>
                      <input className="mp-input" value={f.val} onChange={e => f.set(e.target.value)} style={inputStyle} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button className="mp-cancel" onClick={closeModal} style={{ flex: 1, padding: 12, borderRadius: 14, border: '1px solid rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.6)', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: 'var(--mp-ink2)', cursor: 'pointer', transition: 'background 0.18s' }}>Cancel</button>
                  <button className="mp-save" onClick={saveEdit} style={{ flex: 1, padding: 12, borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: '#fff', background: 'linear-gradient(150deg, #c471f5, #0a84ff 55%, #7d2ae8)', boxShadow: '0 12px 26px -12px rgba(120,80,230,0.7), inset 0 1px 0 rgba(255,255,255,0.5)', transition: 'filter 0.18s' }}>Save changes</button>
                </div>
              </div>
            )}

            {/* Change Password modal */}
            {modal === 'password' && (
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 13, display: 'grid', placeItems: 'center', background: 'linear-gradient(150deg, #5ac8fa, #0a84ff)' }}>
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><rect x="5" y="11" width="14" height="9" rx="2"></rect><path d="M8 11V7a4 4 0 018 0v4"></path></svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--mp-ink2)' }}>Security</div>
                      <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em' }}>Change password</div>
                    </div>
                  </div>
                  <button className="mp-close" onClick={closeModal} style={{ flexShrink: 0, width: 30, height: 30, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--mp-ink2)', fontFamily: 'inherit', transition: 'background 0.18s, color 0.18s' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"></path></svg>
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 18 }}>
                  <input className="mp-input" type="password" placeholder="Current password" value={curPwd} onChange={e => setCurPwd(e.target.value)} style={inputStyle} />
                  <input className="mp-input" type="password" placeholder="New password" value={newPwd} onChange={e => setNewPwd(e.target.value)} style={inputStyle} />
                  <input className="mp-input" type="password" placeholder="Confirm new password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} style={inputStyle} />
                </div>
                <button className="mp-update" onClick={closeModal} style={{ width: '100%', marginTop: 18, padding: 13, borderRadius: 15, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14.5, fontWeight: 600, color: '#fff', background: 'linear-gradient(150deg, #5ac8fa, #0a84ff 60%, #0060df)', boxShadow: '0 12px 26px -12px rgba(10,132,255,0.8), inset 0 1px 0 rgba(255,255,255,0.5)', transition: 'filter 0.18s' }}>Update password</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyProfile;
