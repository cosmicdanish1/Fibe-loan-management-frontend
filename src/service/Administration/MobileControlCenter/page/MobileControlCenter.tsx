import React, { useState } from 'react';
import { Smartphone, X, Hourglass } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ActivationRequestsPanel from './ActivationRequestsPanel';
import MemberAccessPanel from './MemberAccessPanel';
import PhoneQualityPanel from './PhoneQualityPanel';

type TabId = 'members' | 'requests' | 'phones' | 'dashboard' | 'broadcasts' | 'features' | 'content' | 'audit' | 'health';

const closeWindow = () => {
  const api = (window as any).electronAPI;
  if (api?.ipcRenderer?.send) api.ipcRenderer.send('window-close');
  else window.close();
};

/**
 * Mobile Control Center (PRD section 14): where staff run the Fibe Mobile member app. Administrator levels only
 * (menu right MOBILE_CONTROL_CENTER). Sections that are not built yet are listed so the whole plan is visible.
 */
const MobileControlCenter: React.FC = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabId>('members');

  const tabs: Array<{ id: TabId; label: string; ready: boolean }> = [
    { id: 'members', label: t('Member access'), ready: true },
    { id: 'requests', label: t('Activation requests'), ready: true },
    { id: 'phones', label: t('Phone numbers'), ready: true },
    { id: 'broadcasts', label: t('Broadcasts'), ready: false },
    { id: 'features', label: t('Features and releases'), ready: false },
    { id: 'content', label: t('Content'), ready: false },
    { id: 'dashboard', label: t('Dashboard'), ready: false },
    { id: 'audit', label: t('Security and audit'), ready: false },
    { id: 'health', label: t('Health and server hours'), ready: false },
  ];
  const current = tabs.find((x) => x.id === tab)!;

  return (
    <div className="app-window">
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">{t('Mobile Control Center')}</h1>
          <p className="aw-desc" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Smartphone size={12} /> {t('Run the Fibe Mobile member app: activate members, reset access, check requests')}
          </p>
        </div>
        <div className="aw-actions">
          <button type="button" onClick={closeWindow} className="aw-btn aw-btn-ghost"><X size={13} /> {t('Close')}</button>
        </div>
      </div>

      <div className="aw-tabs" role="tablist">
        {tabs.map((x) => (
          <button key={x.id} type="button" role="tab" aria-selected={tab === x.id} className="aw-tab" onClick={() => setTab(x.id)}>
            {x.label}
          </button>
        ))}
      </div>

      <div className="aw-content">
        {tab === 'members' && <MemberAccessPanel />}
        {tab === 'requests' && <ActivationRequestsPanel />}
        {tab === 'phones' && <PhoneQualityPanel />}
        {!current.ready && (
          <section className="aw-card">
            <div className="aw-empty">
              <Hourglass size={28} />
              <span>{current.label}: {t('this section is built in a later step.')}</span>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default MobileControlCenter;
