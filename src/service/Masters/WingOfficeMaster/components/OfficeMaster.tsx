// components/OfficeMaster.tsx

import React, { useState, useEffect } from 'react';
import { Select } from 'antd';
import { Hash, Building2, MapPin, Navigation, Search, Info } from 'lucide-react';
import { OfficeMasterHookReturn } from '../interface/interface';
import { getApiBaseUrl } from '../../../../services/apiVersionConfig';

const OfficeMaster: React.FC<OfficeMasterHookReturn> = ({
  data,
  fetchOffice,
  updateBranchNo,
  updateName,
  updateDivisionRO,
  updateAddress,
  updateCity
}) => {
  const [divisions, setDivisions] = useState<any[]>([]);

  useEffect(() => {
    const loadDivisions = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${await getApiBaseUrl()}/utilities/divisions`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (response.ok) {
          const result = await response.json();
          const d = result.data || [];
          const divs = Array.isArray(d) ? d : (d.data || []);
          if (divs.length > 0) { setDivisions(divs); return; }
        }
      } catch { /* silent */ }
      setDivisions([
        { divno: 3, name: 'DALLI RAJHRA' },
        { divno: 13, name: 'NANDINI' },
        { divno: 61, name: 'BHILAI' },
        { divno: 90, name: 'MECON' },
        { divno: 94, name: 'POWER HOUSE' },
        { divno: 99, name: 'RISALI' },
      ]);
    };
    loadDivisions();
  }, []);

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
          <h2 className="aw-card-title">Office Details</h2>
          {data.name && (
            <span className="aw-strong" style={{ marginLeft: 'auto', color: 'var(--aw-accent)' }}>{data.name}</span>
          )}
        </div>
        <div className="aw-stack">
          {/* Branch No + Name */}
          <div className="aw-form-3">
            <div>
              <label className="aw-label" htmlFor="om-branch">Branch No</label>
              <div className="aw-input-wrap has-icon has-action">
                <Hash size={13} />
                <input
                  id="om-branch"
                  value={data.branchNo}
                  onChange={(e) => updateBranchNo(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleBranchSearch(); }}
                  placeholder="New..."
                  className="aw-input"
                />
                <button type="button" onClick={handleBranchSearch} className="aw-input-action" aria-label="Load this branch"
                  data-tip="Load this branch" data-tip-pos="bottom-end">
                  <Search size={13} />
                </button>
              </div>
              <p className="aw-meta" style={{ marginTop: 4, textTransform: 'uppercase' }}>Leave blank for new</p>
            </div>
            <div className="aw-span-2">
              <label className="aw-label" htmlFor="om-name">Office Name</label>
              <div className="aw-input-wrap has-icon">
                <Building2 size={13} />
                <input
                  id="om-name"
                  value={data.name}
                  onChange={(e) => updateName(e.target.value)}
                  placeholder="Enter office name..."
                  className="aw-input"
                />
              </div>
            </div>
          </div>

          {/* Division/RO */}
          <div>
            <label className="aw-label" htmlFor="om-division">Division / RO</label>
            <Select
              id="om-division"
              value={data.divisionRO || null}
              onChange={(value) => updateDivisionRO(value)}
              placeholder="Select division..."
              className="aw-select"
              popupClassName="aw-select-popup"
              showSearch
              optionFilterProp="label"
              options={divisions.map((div) => ({ value: String(div.divno), label: div.name }))}
            />
          </div>
        </div>
      </section>

      {/* Address */}
      <section className="aw-card aw-fade-in">
        <div className="aw-card-head">
          <span className="aw-card-icon"><MapPin size={14} /></span>
          <h2 className="aw-card-title">Location</h2>
        </div>
        <div className="aw-form-3">
          <div className="aw-span-2">
            <label className="aw-label" htmlFor="om-address">Address</label>
            <textarea
              id="om-address"
              value={data.address}
              onChange={(e) => updateAddress(e.target.value)}
              placeholder="Enter address..."
              rows={3}
              className="aw-input"
            />
          </div>
          <div>
            <label className="aw-label" htmlFor="om-city">City</label>
            <div className="aw-input-wrap has-icon">
              <Navigation size={13} />
              <input
                id="om-city"
                value={data.city}
                onChange={(e) => updateCity(e.target.value)}
                placeholder="City..."
                className="aw-input"
              />
            </div>
          </div>
        </div>
      </section>

      <p className="aw-meta" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 4px' }}>
        <Info size={12} />
        Enter Branch No and press Enter to load existing office — or fill in details for new
      </p>

    </div>
  );
};

export default OfficeMaster;
