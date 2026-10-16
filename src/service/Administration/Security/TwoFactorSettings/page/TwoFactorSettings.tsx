import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ShieldCheck } from 'lucide-react';
import { apiService } from '../../../../../services/api';
import TwoFaCard from '../../MyProfile/components/TwoFaCard';
import ApprovalGuardsCard from '../components/ApprovalGuardsCard';
import UsersPanel from '../components/UsersPanel';
import PolicyPanel from '../components/PolicyPanel';
import ActivityPanel from '../components/ActivityPanel';

type TabKey = 'mine' | 'users' | 'approvers' | 'policy' | 'activity';
interface Access { isAdmin: boolean; canManageUsers: boolean; isApprover: boolean }

/**
 * Two-Factor & Approvals (ES-178): the ONE window for everything about authenticator codes.
 * What a person sees depends on their rights (the backend enforces the same rules):
 *   everyone          -> My sign-in code
 *   Manage Two-Factor -> + Users
 *   administrator     -> + Approvers & protections, Policy & limits, Activity
 */
const TwoFactorSettings: React.FC = () => {
  const [access, setAccess] = useState<Access | null>(null);
  const [tab, setTab] = useState<TabKey>('mine');
  const [error, setError] = useState('');

  useEffect(() => {
    apiService.twoFaAccess()
      .then(setAccess)
      .catch((e) => { setError(e instanceof Error ? e.message : 'Could not load'); setAccess({ isAdmin: false, canManageUsers: false, isApprover: false }); });
  }, []);

  const tabs = useMemo(() => {
    const t: { key: TabKey; label: string }[] = [{ key: 'mine', label: 'My sign-in code' }];
    if (access?.canManageUsers) t.push({ key: 'users', label: 'Users' });
    if (access?.isAdmin) {
      t.push({ key: 'approvers', label: 'Approvers & protections' });
      t.push({ key: 'policy', label: 'Policy & limits' });
      t.push({ key: 'activity', label: 'Activity' });
    }
    return t;
  }, [access]);

  const index = Math.max(0, tabs.findIndex((x) => x.key === tab));

  return (
    <div className="app-window">
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">Two-Factor &amp; Approvals</h1>
          <p className="aw-desc">Your sign-in code, and who may approve sensitive actions</p>
        </div>
        <div className="aw-actions">
          {access?.isApprover && <span className="aw-pill tone-success"><ShieldCheck size={12} /> You are an approver</span>}
        </div>
      </div>

      <div className="aw-content">
        <div className="aw-stack" style={{ maxWidth: 1100 }}>
          {error && <div className="aw-alert aw-alert-danger" role="alert"><AlertCircle size={16} /><div>{error}</div></div>}

          {!access ? (
            <p className="aw-meta">Loading…</p>
          ) : (
            <>
              {tabs.length > 1 && (
                <div className="aw-seg" role="tablist" style={{ maxWidth: 160 * tabs.length, ['--seg-index' as any]: index, ['--seg-count' as any]: tabs.length }}>
                  {tabs.map((t) => (
                    <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}>{t.label}</button>
                  ))}
                </div>
              )}

              {tab === 'mine' && (
                <section className="aw-card" style={{ maxWidth: 560 }}>
                  <div className="aw-card-head">
                    <span className="aw-card-icon"><ShieldCheck size={14} /></span>
                    <h2 className="aw-card-title">My sign-in code</h2>
                  </div>
                  <p className="aw-meta">
                    A 6-digit code from the authenticator app on your phone, asked after your password when you sign in. The same code also lets you reset a forgotten password.
                    Turn it on, scan your QR, and keep your recovery codes somewhere safe.
                  </p>
                  <TwoFaCard />
                </section>
              )}
              {tab === 'users' && access.canManageUsers && <UsersPanel isAdmin={access.isAdmin} onOpenPolicy={access.isAdmin ? () => setTab('policy') : undefined} />}
              {tab === 'approvers' && access.isAdmin && <ApprovalGuardsCard />}
              {tab === 'policy' && access.isAdmin && <PolicyPanel />}
              {tab === 'activity' && access.isAdmin && <ActivityPanel />}
            </>
          )}
        </div>
      </div>

      <div className="aw-footer"><span>Two-Factor &amp; Approvals</span><span>{access?.isAdmin ? 'Administrator' : access?.canManageUsers ? 'Two-factor manager' : 'My account'}</span></div>
    </div>
  );
};

export default TwoFactorSettings;
