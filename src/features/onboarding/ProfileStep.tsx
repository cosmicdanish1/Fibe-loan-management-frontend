import React, { useEffect, useState } from 'react';
import { CalendarDays, Clock, KeyRound, Mail, UserRound } from 'lucide-react';
import type { User } from '../../auth/types/auth.types';
import Confetti from './Confetti';
import { onboardingApi, OnboardingProfile } from './onboardingApi';

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'First login';

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

const Tile: React.FC<{ icon: React.ReactNode; label: string; value: string; color: string }> = ({ icon, label, value, color }) => (
  <div className="ob-tile" style={{ ['--c' as any]: color }}>
    <span className="ob-chip">{icon}</span>
    <div style={{ minWidth: 0 }}><small>{label}</small><b>{value}</b></div>
  </div>
);

/** Walkthrough step: the user's own profile in a card, with a confetti burst when it appears. */
export const ProfileStep: React.FC<{ user: User }> = ({ user }) => {
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    onboardingApi.profile()
      .then((p) => { if (!cancelled) { setProfile(p); setFailed(!p); } })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, []);

  if (failed) return <div className="ob-note">Your profile could not be loaded right now. You can continue.</div>;
  if (!profile) return <p className="ob-lead">Loading your profile…</p>;

  const access = user.allowedActions ? `${user.allowedActions.length} menu options` : 'Full access';

  return (
    <div className="ob-profile">
      <Confetti />
      <div className="ob-profile-banner" />
      <div className="ob-profile-id">
        {profile.avatar
          ? <img src={profile.avatar} alt="" className="ob-avatar" />
          : <div className="ob-avatar" aria-hidden="true">{initials(profile.fullName)}</div>}
        <h3>{profile.fullName}</h3>
        {profile.role && <span className="ob-pill">{profile.role}</span>}
      </div>
      <div className="ob-grid">
        <Tile icon={<UserRound size={18} />} label="Username" value={profile.username} color="#6366f1" />
        <Tile icon={<Mail size={18} />} label="Email" value={profile.email || '—'} color="#0ea5e9" />
        <Tile icon={<CalendarDays size={18} />} label="Account created" value={fmtDate(profile.memberSince)} color="#f59e0b" />
        <Tile icon={<Clock size={18} />} label="Last login" value={fmtDateTime(profile.lastLogin)} color="#10b981" />
        <Tile icon={<KeyRound size={18} />} label="Access" value={access} color="#ec4899" />
      </div>
    </div>
  );
};

export default ProfileStep;
