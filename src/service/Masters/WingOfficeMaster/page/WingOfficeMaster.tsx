// page/WingOfficeMaster.tsx

import React, { useState } from 'react';
import { ConfigProvider } from 'antd';
import {
  Building2,
  MapPin,
  RotateCcw,
  Save,
  X,
  ShieldCheck,
  Layout
} from 'lucide-react';
import { motion } from 'framer-motion';
import OfficeMaster from '../components/OfficeMaster';
import WingMaster from '../components/WingMaster';
import { useOfficeMaster } from '../hook/useOfficeMaster';
import { useWingMaster } from '../hook/useWingMaster';

const WingOfficeMaster: React.FC = () => {
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

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#6366f1',
          borderRadius: 8,
        },
      }}
    >
      <div className="wo-master h-screen flex flex-col bg-slate-50 font-sans selection:bg-indigo-100 overflow-hidden text-slate-900">

        {/* Ultra-Compact Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-2 py-1 flex items-center justify-between z-10 shrink-0 shadow-lg border-b-2 border-indigo-600">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="bg-indigo-600 p-1 rounded border border-indigo-400 shadow-lg">
                <Building2 size={12} />
              </div>
              <div>
                <h1 className="fz-caption font-black text-white tracking-wide leading-none uppercase">
                  Registry Terminal
                </h1>
                <div className="flex items-center gap-1 mt-0.5 fz-caption font-black text-indigo-300 uppercase tracking-wide leading-none">
                  <ShieldCheck size={7} className="text-indigo-400" /> Organizational Core
                </div>
              </div>
            </div>

            {/* Ultra-Compact Animated Tabs */}
            <div className="flex bg-white/5 p-0.5 rounded border border-white/5 ml-1.5">
              {[
                { id: 'office', label: 'Office', icon: Building2, active: !showWingMaster },
                { id: 'wing', label: 'Wing', icon: Layout, active: showWingMaster }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setShowWingMaster(tab.id === 'wing')}
                  className={`relative px-2 h-5 flex items-center gap-1 fz-caption font-black uppercase tracking-wide transition-colors duration-200 z-10 ${tab.active ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                  <tab.icon size={10} />
                  {tab.label}
                  {tab.active && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-indigo-600 rounded -z-10 shadow-lg"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={handleReset} className="h-7 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[9px] font-black transition-all flex items-center gap-1.5 border border-white/20 uppercase tracking-wide">
              <RotateCcw size={11} /> Purge
            </button>
            <button onClick={handleSave} className="h-7 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[9px] font-black transition-all flex items-center gap-1.5 border border-indigo-400 shadow-lg uppercase tracking-wide">
              <Save size={11} /> Save
            </button>
            <div className="h-4 w-px bg-white/20" />
            <button onClick={handleExit} className="h-7 px-3 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg text-[9px] font-black transition-all flex items-center gap-1.5 border border-rose-500/30 uppercase tracking-wide">
              <X size={11} /> Exit
            </button>
          </div>
        </div>

        {/* Workspace - Ultra-Compact */}
        <div className="wo-workspace flex-1 overflow-auto bg-[#f5f6fa]">
          <div className="p-3 pb-4">
            {showWingMaster ? (
              <WingMaster {...wingProps} />
            ) : (
              <OfficeMaster {...officeProps} />
            )}
          </div>
        </div>

        {/* Compact Footer */}
        <div className="px-2 py-0.5 bg-white border-t-2 border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            <MapPin size={9} className="text-slate-400" />
            <div className="flex items-center gap-1.5">
              <span className="fz-caption font-black text-slate-700 uppercase tracking-tight leading-none">
                {showWingMaster ? 'Wing' : 'Office'} Registry
              </span>
              <div className="w-px h-2 bg-slate-300" />
              <span className="fz-caption font-black text-slate-500 uppercase tracking-wide leading-none">
                {showWingMaster ? 'Wing' : 'Office'} Mode
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-indigo-600">
            <ShieldCheck size={9} />
            <span className="fz-caption font-black uppercase tracking-wide">Secured</span>
          </div>
        </div>
      </div>

      <style>{`
        /* Ultra-Compact Select Styles */
        .ultra-compact-master-select .ant-select-selector {
          background-color: #f8fafc !important;
          border: 2px solid #cbd5e1 !important;
          height: 24px !important;
          display: flex !important;
          align-items: center !important;
          border-radius: 4px !important;
          font-weight: 900 !important;
          font-size: 9px !important;
          color: #0f172a !important;
          box-shadow: inset 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
          padding: 0 6px !important;
        }
        
        .ultra-compact-master-select.ant-select-focused .ant-select-selector {
           background-color: white !important;
           border: 2px solid #6366f1 !important;
           box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1) !important;
        }
        
        .ultra-compact-master-select .ant-select-selection-item {
          line-height: 20px !important;
          font-weight: 900 !important;
        }
        
        .ultra-compact-master-select .ant-select-arrow {
          font-size: 10px !important;
        }
        
        .ultra-compact-master-select .ant-select-selection-placeholder {
          font-size: 8px !important;
          font-weight: 700 !important;
        }

        /* Input Styles */
        .ant-input, .ant-picker, .ant-select-selector, .ant-input-affix-wrapper {
          box-shadow: inset 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
          font-weight: 900 !important;
        }
        
        .ant-input:focus, .ant-picker-focused, .ant-select-focused .ant-select-selector, .ant-input-affix-wrapper-focused {
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1) !important;
        }
        
        .ant-input::placeholder {
          font-weight: 700 !important;
          font-size: 8px !important;
        }
        
        /* TextArea */
        .ant-input-textarea textarea {
          font-weight: 900 !important;
        }
        
        .ant-input-textarea textarea::placeholder {
          font-weight: 700 !important;
          font-size: 7px !important;
        }

        /* ── Dark mode: arbitrary bg hex + the forced-light division select + status tints ── */
        html.dark .wo-master,
        html.dark .wo-workspace { background-color: #0f172a !important; }
        html.dark .ultra-compact-master-select .ant-select-selector {
          background-color: #1e293b !important;
          border-color: #334155 !important;
          color: #e2e8f0 !important;
        }
        html.dark .ultra-compact-master-select.ant-select-focused .ant-select-selector {
          background-color: #0f172a !important;
          border-color: #6366f1 !important;
        }
        html.dark .wo-master .bg-emerald-50 { background-color: #064e3b !important; }
        html.dark .wo-master .bg-rose-50 { background-color: #4c0519 !important; }
      `}</style>
    </ConfigProvider>
  );
};

export default WingOfficeMaster;
