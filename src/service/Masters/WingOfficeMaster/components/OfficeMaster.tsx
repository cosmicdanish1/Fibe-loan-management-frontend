// components/OfficeMaster.tsx

import React from 'react';
import { Select } from 'antd';
import { Hash, Building2, MapPin, Navigation, Search, Info, MoreHorizontal } from 'lucide-react';
import { OfficeMasterHookReturn } from '../interface/interface';
import { wingLabel, CITY_MAX } from '../utils/officeRules';
import { useTranslation } from 'react-i18next';

const OfficeMaster: React.FC<OfficeMasterHookReturn> = ({
  data,
  wings,
  fetchOffice,
  updateBranchNo,
  updateName,
  updateWingId,
  updateDivisionNo,
  updateAddress,
  updateCity,
  onOpenWing,
}) => {
  const { t } = useTranslation();

  const handleBranchSearch = () => {
    if (!data.branchNo) return;
    // Delegates to the hook so the isExisting flag is set and "not found" feedback is shown.
    fetchOffice(data.branchNo);
  };

  return (
    <div className="aw-stack">

      {/* Branch Identity */}
      <section className="aw-card aw-fade-in">
        <div className="aw-card-head">
          <span className="aw-card-icon"><Building2 size={14} /></span>
          <h2 className="aw-card-title">{t('Office Details')}</h2>
          {data.name && (
            <span className="aw-strong" style={{ marginLeft: 'auto', color: 'var(--aw-accent)' }}>{data.name}</span>
          )}
        </div>
        <div className="aw-stack">
          {/* Branch No + Name */}
          <div className="aw-form-3">
            <div>
              <label className="aw-label" htmlFor="om-branch">{t('Branch No')}</label>
              <div className="aw-input-wrap has-icon has-action">
                <Hash size={13} />
                <input
                  id="om-branch"
                  value={data.branchNo}
                  onChange={(e) => updateBranchNo(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleBranchSearch(); }}
                  placeholder={t('New...')}
                  className="aw-input"
                />
                <button type="button" onClick={handleBranchSearch} className="aw-input-action" aria-label={t('Load this branch')}
                  data-tip={t('Load this branch')} data-tip-pos="bottom-end">
                  <Search size={13} />
                </button>
              </div>
              <p className="aw-meta" style={{ marginTop: 4, textTransform: 'uppercase' }}>{t('Leave blank for new')}</p>
            </div>
            <div className="aw-span-2">
              <label className="aw-label" htmlFor="om-name">{t('Office Name')}</label>
              <div className="aw-input-wrap has-icon">
                <Building2 size={13} />
                <input
                  id="om-name"
                  value={data.name}
                  onChange={(e) => updateName(e.target.value)}
                  placeholder={t('Enter office name...')}
                  className="aw-input"
                />
              </div>
            </div>
          </div>

          {/* Division/RO = the wing, with its code, and a button to the Wing Master (as the legacy) */}
          <div className="aw-form-3">
            <div className="aw-span-2">
              <label className="aw-label" htmlFor="om-division">{t('Division / RO')}</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Select
                    id="om-division"
                    value={data.wingId || null}
                    onChange={(value) => updateWingId(value)}
                    placeholder={t('Select division / RO...')}
                    className="aw-select"
                    popupClassName="aw-select-popup"
                    showSearch
                    optionFilterProp="label"
                    options={wings.map((w) => ({ value: w.wingId, label: wingLabel(w) }))}
                  />
                </div>
                <span className="aw-pill" data-testid="om-wing-code" aria-label={t('Wing code')}>{data.wingId || '—'}</span>
                <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" onClick={() => onOpenWing?.()}
                  aria-label={t('Open Wing Master')} data-tip={t('Open Wing Master')} data-tip-pos="bottom-end">
                  <MoreHorizontal size={14} />
                </button>
              </div>
            </div>
            <div>
              <label className="aw-label" htmlFor="om-divno">{t('Division No')}</label>
              <input id="om-divno" value={data.divisionNo} onChange={(e) => updateDivisionNo(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder={t('Branch No')} className="aw-input" inputMode="numeric" />
            </div>
          </div>
        </div>
      </section>

      {/* Address */}
      <section className="aw-card aw-fade-in">
        <div className="aw-card-head">
          <span className="aw-card-icon"><MapPin size={14} /></span>
          <h2 className="aw-card-title">{t('Location')}</h2>
        </div>
        <div className="aw-form-3">
          <div className="aw-span-2">
            <label className="aw-label" htmlFor="om-address">{t('Address')}</label>
            <textarea
              id="om-address"
              value={data.address}
              onChange={(e) => updateAddress(e.target.value)}
              placeholder={t('Enter address...')}
              rows={3}
              className="aw-input"
            />
          </div>
          <div>
            <label className="aw-label" htmlFor="om-city">{t('City')}</label>
            <div className="aw-input-wrap has-icon">
              <Navigation size={13} />
              <input
                id="om-city"
                maxLength={CITY_MAX}
                value={data.city}
                onChange={(e) => updateCity(e.target.value)}
                placeholder={t('City...')}
                className="aw-input"
              />
            </div>
          </div>
        </div>
      </section>

      <p className="aw-meta" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 4px' }}>
        <Info size={12} />
        {t('Enter Branch No and press Enter to load existing office — or fill in details for new')}
      </p>

    </div>
  );
};

export default OfficeMaster;
