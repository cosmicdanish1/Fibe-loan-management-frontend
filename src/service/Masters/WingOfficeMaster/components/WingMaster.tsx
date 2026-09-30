// components/WingMaster.tsx

import React from 'react';
import { Layers, Hash, FileText, CheckCircle2, XCircle, Info } from 'lucide-react';
import { WingMasterHookReturn } from '../interface/interface';

const WingMaster: React.FC<WingMasterHookReturn> = ({
  data,
  updateWingCode,
  updateName,
  updateState,
  fetchWing
}) => {
  return (
    <div className="aw-stack">

      {/* Wing Details */}
      <section className="aw-card aw-fade-in">
        <div className="aw-card-head">
          <span className="aw-card-icon"><Layers size={14} /></span>
          <h2 className="aw-card-title">Wing Details</h2>
          {data.name && (
            <span className="aw-strong" style={{ marginLeft: 'auto', color: 'var(--aw-accent)' }}>{data.name}</span>
          )}
        </div>
        <div className="aw-two">
          <div>
            <label className="aw-label" htmlFor="wm-code">Wing Code</label>
            <div className="aw-input-wrap has-icon">
              <Hash size={13} />
              <input
                id="wm-code"
                value={data.wingCode}
                onChange={(e) => updateWingCode(e.target.value)}
                onBlur={() => fetchWing(data.wingCode)}
                onKeyDown={(e) => { if (e.key === 'Enter') fetchWing(data.wingCode); }}
                placeholder="e.g. W01"
                className="aw-input"
              />
            </div>
          </div>
          <div>
            <label className="aw-label" htmlFor="wm-name">Wing Name</label>
            <div className="aw-input-wrap has-icon">
              <FileText size={13} />
              <input
                id="wm-name"
                value={data.name}
                onChange={(e) => updateName(e.target.value)}
                placeholder="Enter wing name..."
                className="aw-input"
              />
            </div>
          </div>
        </div>
      </section>

      {/* State */}
      <section className="aw-card aw-fade-in">
        <div className="aw-card-head">
          <h2 className="aw-card-title">Jurisdictional State</h2>
        </div>
        <span className="aw-label" id="wm-state-label">State</span>
        <div className="aw-two" role="radiogroup" aria-labelledby="wm-state-label">
          <button type="button" role="radio" aria-checked={data.state === '1'} aria-pressed={data.state === '1'}
            onClick={() => updateState('1')} className="aw-choice tone-success"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, fontWeight: 700 }}>
            <CheckCircle2 size={16} />
            In State
            <span className="aw-pill tone-success">1</span>
          </button>
          <button type="button" role="radio" aria-checked={data.state === '0'} aria-pressed={data.state === '0'}
            onClick={() => updateState('0')} className="aw-choice tone-danger"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, fontWeight: 700 }}>
            <XCircle size={16} />
            Out State
            <span className="aw-pill tone-danger">0</span>
          </button>
        </div>
        <p className="aw-meta" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
          <Info size={12} />
          Enter Wing Code and press Enter to load existing — or fill in details for new
        </p>
      </section>

    </div>
  );
};

export default WingMaster;
