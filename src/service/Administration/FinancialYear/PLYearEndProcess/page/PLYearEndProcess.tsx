// page/PLYearEndProcess.tsx

import React, { useState } from 'react';
import {
  TrendingUp,
  X,
  Play,
  ShieldCheck,
  Database,
  Building2,
  AlertCircle,
  FileText
} from 'lucide-react';
import { ConfigProvider, App } from 'antd';
import { apiService } from '../../../../../services/api';

const PLYearEndProcessContent: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { message } = App.useApp();

  const handleClose = () => {
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.send('close-window');
    }
  };

  const startProcess = async () => {
    setIsProcessing(true);
    try {
      const response = await apiService.initiatePLYearEndProcess();
      if (response.success) {
        message.success(response.data?.message || 'P and L Year End Process executed successfully.');
      } else {
        message.error(response.error || 'Process failed. Please verify system logs.');
      }
    } catch (error) {
      message.error('Critical System Error: Connection to processing server lost.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans selection:bg-indigo-100 overflow-hidden border border-slate-200">

      {/* Flat Minimal Header */}
      <div
        className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between z-10"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <TrendingUp size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800 tracking-tight leading-none uppercase">
              P and L Year End Process
            </h1>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-1">
              Fiscal Finalization Terminal
            </p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-all"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <X size={18} />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col p-6 bg-slate-50/50 justify-center items-center">
        <div className="max-w-md w-full space-y-4 text-center">

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-left">
            <div className="p-6 space-y-6">

              {/* Status Indicator */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Ready</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                  <ShieldCheck size={12} className="text-indigo-500" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Verified</span>
                </div>
              </div>

              <div className="text-center py-4">
                <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">Operational Readiness</h2>
                <p className="text-xs text-slate-500 font-medium mt-1 uppercase tracking-wide">Ready for fiscal finalization</p>
              </div>

              {/* Info Matrix */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Database size={14} className="text-indigo-500" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Scope</span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-700">All Modules</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={14} className="text-indigo-500" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Log Type</span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-700">Full Audit</p>
                </div>
              </div>

              {/* Irreversible Note */}
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-3">
                <AlertCircle size={16} className="text-amber-500 shrink-0" />
                <p className="text-[10px] text-amber-800 font-semibold leading-relaxed uppercase tracking-tighter">
                  Critical: This process will finalize fiscal ledgers. All transactions will be locked post-execution.
                </p>
              </div>
            </div>

            {/* Action Group */}
            <div className="bg-slate-50 border-t border-slate-100 p-4 flex gap-3">
              <button
                onClick={handleClose}
                disabled={isProcessing}
                className="flex-1 h-10 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold rounded-xl text-xs transition-all uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                onClick={startProcess}
                disabled={isProcessing}
                className="flex-[2] h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <span className="uppercase tracking-widest text-[10px]">Processing...</span>
                ) : (
                  <>
                    <Play size={14} className="fill-current" />
                    <span className="uppercase tracking-widest">Execute Process</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Minimal Footer Row */}
      <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-between opacity-60">
        <div className="flex items-center gap-2">
          <Building2 size={12} className="text-slate-400" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Trust Nagpur - Financial Systems</span>
        </div>
        <div className="flex items-center gap-3">
          <ShieldCheck size={12} className="text-emerald-500" />
          <span className="text-[9px] font-medium text-slate-400 uppercase tracking-tighter">Verified Protocol</span>
        </div>
      </div>
    </div>
  );
};

const PLYearEndProcess: React.FC = () => (
  <ConfigProvider
    theme={{
      token: {
        colorPrimary: '#4f46e5',
        borderRadius: 6,
      },
    }}
  >
    <App>
      <PLYearEndProcessContent />
    </App>
  </ConfigProvider>
);

export default PLYearEndProcess;
