// page/WingOfficeMaster.tsx

import React, { useState } from 'react';
import {
  Building2,
  MapPin,
  RotateCcw,
  Save,
  X,
  ShieldCheck,
  Layout
} from 'lucide-react';
import OfficeMaster from '../components/OfficeMaster';
import WingMaster from '../components/WingMaster';
import { useOfficeMaster } from '../hook/useOfficeMaster';
import { useWingMaster } from '../hook/useWingMaster';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';
import { useTranslation } from 'react-i18next';

const WingOfficeMaster: React.FC = () => {
  const { t } = useTranslation();
  const [showWingMaster, setShowWingMaster] = useState(false);
  const officeProps = useOfficeMaster();
  const wingProps = useWingMaster();

  const handleExit = () => {
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.send('window-close');
    }
  };

  const handleSave = () => {
    if (showWingMaster) {
      wingProps.handleOK();
    } else {
      officeProps.save();
    }
  };

  const handleReset = () => {
    if (showWingMaster) {
      wingProps.handleCancel();
    } else {
      officeProps.reset();
    }
  };

  usePageToolbarActions({
    onSave: handleSave,
    saveLabel: 'Save',
  });

  return (
    <div className="app-window">

      {/* Header */}
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">{t('Registry Terminal')}</h1>
          <p className="aw-desc" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={12} /> {t('Organizational Core')}
          </p>
        </div>

        <div className="aw-seg" role="tablist" style={{ minWidth: 220, ['--seg-index' as any]: showWingMaster ? 1 : 0, ['--seg-count' as any]: 2 }}>
          {[
            { id: 'office', label: t('Office'), icon: Building2, active: !showWingMaster },
            { id: 'wing', label: t('Wing'), icon: Layout, active: showWingMaster }
          ].map((tab) => (
            <button key={tab.id} type="button" role="tab" aria-selected={tab.active}
              onClick={() => setShowWingMaster(tab.id === 'wing')}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="aw-actions">
          <button type="button" onClick={handleReset} className="aw-btn aw-btn-secondary" data-tip={t('Clear the form')} data-tip-pos="bottom-end">
            <RotateCcw size={13} /> {t('Purge')}
          </button>
          <button type="button" onClick={handleSave} className="aw-btn aw-btn-primary">
            <Save size={13} /> {t('Save')}
          </button>
          <button type="button" onClick={handleExit} className="aw-btn aw-btn-ghost" data-tip={t('Close this window')} data-tip-pos="bottom-end">
            <X size={13} /> {t('Exit')}
          </button>
        </div>
      </div>

      {/* Workspace */}
      <div className="aw-content">
        <div className="aw-narrow">
          {showWingMaster ? (
            <WingMaster {...wingProps} />
          ) : (
            <OfficeMaster {...officeProps} />
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="aw-footer">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <MapPin size={12} />
          {showWingMaster ? t('Wing') : t('Office')} {t('Registry')}
          <span style={{ opacity: .5 }}>·</span>
          {showWingMaster ? t('Wing') : t('Office')} {t('Mode')}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--aw-accent)' }}>
          <ShieldCheck size={12} /> {t('Secured')}
        </span>
      </div>
    </div>
  );
};

export default WingOfficeMaster;
