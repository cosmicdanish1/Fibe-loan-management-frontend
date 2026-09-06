// components/OfficeMaster.tsx

import React, { useState, useEffect } from 'react';
import { Input, Select } from 'antd';
import { Hash, Building2, MapPin, Navigation, Search, Info } from 'lucide-react';
import { OfficeMasterHookReturn } from '../interface/interface';
import { getApiBaseUrl } from '../../../../services/apiVersionConfig';

const { Option } = Select;
const { TextArea } = Input;

const labelCls = "block fz-tiny font-black text-slate-500 uppercase tracking-wider mb-0.5";
const inputCls = "h-7 fz-caption font-semibold bg-white border-slate-300 rounded";

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
    <div className="om-root max-w-2xl mx-auto space-y-2">

      {/* Branch Identity */}
      <div className="om-card bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="om-card-hdr px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
          <Building2 size={11} className="text-slate-400" />
          <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Office Details</span>
          {data.name && (
            <span className="ml-auto fz-tiny font-black text-indigo-600">{data.name}</span>
          )}
        </div>
        <div className="p-3 space-y-2">
          {/* Branch No + Name */}
          <div className="grid grid-cols-3 gap-x-3">
            <div>
              <label className={labelCls}>Branch No</label>
              <div className="flex gap-1">
                <div className="relative flex-1">
                  <Hash size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={data.branchNo}
                    onChange={(e) => updateBranchNo(e.target.value)}
                    onPressEnter={handleBranchSearch}
                    placeholder="New..."
                    className={`${inputCls} pl-6 font-bold text-indigo-700`}
                  />
                </div>
                <button
                  onClick={handleBranchSearch}
                  className="h-7 w-7 bg-slate-100 hover:bg-indigo-600 hover:text-white rounded text-slate-500 flex items-center justify-center transition-colors shrink-0"
                >
                  <Search size={12} />
                </button>
              </div>
              <p className="fz-micro text-slate-400 mt-0.5 font-bold uppercase">Leave blank for new</p>
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Office Name</label>
              <div className="relative">
                <Building2 size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={data.name}
                  onChange={(e) => updateName(e.target.value)}
                  placeholder="Enter office name..."
                  className={`${inputCls} pl-6`}
                />
              </div>
            </div>
          </div>

          {/* Division/RO */}
          <div>
            <label className={labelCls}>Division / RO</label>
            <Select
              value={data.divisionRO || undefined}
              onChange={(value) => updateDivisionRO(value)}
              placeholder="Select division..."
              className="w-full"
              style={{ height: 28 }}
              showSearch
              filterOption={(input, option) =>
                String(option?.children || '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {divisions.map((div) => (
                <Option key={div.divno} value={String(div.divno)}>
                  {div.name}
                </Option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="om-card bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="om-card-hdr px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
          <MapPin size={11} className="text-slate-400" />
          <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Location</span>
        </div>
        <div className="p-3 grid grid-cols-3 gap-x-3 gap-y-2">
          <div className="col-span-2">
            <label className={labelCls}>Address</label>
            <TextArea
              value={data.address}
              onChange={(e) => updateAddress(e.target.value)}
              placeholder="Enter address..."
              rows={3}
              className="fz-small font-medium bg-slate-50 border-slate-200 rounded resize-none"
            />
          </div>
          <div>
            <label className={labelCls}>City</label>
            <div className="relative">
              <Navigation size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={data.city}
                onChange={(e) => updateCity(e.target.value)}
                placeholder="City..."
                className={`${inputCls} pl-6`}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 px-1">
        <Info size={9} className="text-slate-400" />
        <span className="fz-mini font-bold text-slate-400 uppercase tracking-wide">
          Enter Branch No and press Enter to load existing office — or fill in details for new
        </span>
      </div>

      <style>{`
        /* ── Office Master — dark mode ── */
        html.dark .om-card { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .om-card-hdr { border-color: rgba(255,255,255,.07) !important; }
        html.dark .om-card-hdr span.text-slate-500 { color: #8e8e93 !important; }
        html.dark .om-card-hdr svg.text-slate-400 { color: #71717a !important; }
        html.dark .om-root label.text-slate-500 { color: #8e8e93 !important; }
        html.dark .om-root .text-slate-400 { color: #71717a !important; }
        html.dark .om-root input,
        html.dark .om-root textarea,
        html.dark .om-root .ant-select-selector {
          background-color: rgba(255,255,255,.05) !important;
          color: #f5f5f7 !important;
          border-color: rgba(255,255,255,.08) !important;
        }
        html.dark .om-root .ant-select-selection-item,
        html.dark .om-root .ant-select-selection-placeholder { color: #f5f5f7 !important; }
        html.dark .om-root .ant-select-arrow { color: #8e8e93 !important; }
        html.dark .om-root .bg-slate-50 { background-color: rgba(255,255,255,.03) !important; }
        html.dark .om-root .bg-slate-100 { background-color: rgba(255,255,255,.05) !important; }
        html.dark .om-root .border-slate-200,
        html.dark .om-root .border-slate-300 { border-color: rgba(255,255,255,.08) !important; }
        html.dark .om-root button.bg-slate-100 { background-color: rgba(255,255,255,.05) !important; color: #8e8e93 !important; }
        html.dark .om-root button.bg-slate-100:hover { background-color: #3b82f6 !important; color: #fff !important; }
      `}</style>

    </div>
  );
};

export default OfficeMaster;
