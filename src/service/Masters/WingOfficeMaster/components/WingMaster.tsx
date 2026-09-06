// components/WingMaster.tsx

import React from 'react';
import { Input } from 'antd';
import { Layers, Hash, FileText, CheckCircle2, XCircle, Info } from 'lucide-react';
import { WingMasterHookReturn } from '../interface/interface';

const labelCls = "block fz-tiny font-black text-slate-500 uppercase tracking-wider mb-0.5";
const inputCls = "h-7 fz-caption font-semibold bg-white border-slate-300 rounded";

const WingMaster: React.FC<WingMasterHookReturn> = ({
  data,
  updateWingCode,
  updateName,
  updateState,
  fetchWing
}) => {
  return (
    <div className="wm-root max-w-2xl mx-auto space-y-2">

      {/* Wing Details */}
      <div className="wm-card bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="wm-card-hdr px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
          <Layers size={11} className="text-slate-400" />
          <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Wing Details</span>
          {data.name && (
            <span className="ml-auto fz-tiny font-black text-indigo-600">{data.name}</span>
          )}
        </div>
        <div className="p-3 grid grid-cols-2 gap-x-4 gap-y-2">
          <div>
            <label className={labelCls}>Wing Code</label>
            <div className="relative">
              <Hash size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={data.wingCode}
                onChange={(e) => updateWingCode(e.target.value)}
                onBlur={() => fetchWing(data.wingCode)}
                onPressEnter={() => fetchWing(data.wingCode)}
                placeholder="e.g. W01"
                className={`${inputCls} pl-6 font-bold text-indigo-700`}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Wing Name</label>
            <div className="relative">
              <FileText size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={data.name}
                onChange={(e) => updateName(e.target.value)}
                placeholder="Enter wing name..."
                className={`${inputCls} pl-6`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* State */}
      <div className="wm-card bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="wm-card-hdr px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
          <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Jurisdictional State</span>
        </div>
        <div className="p-3">
          <label className={labelCls}>State</label>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => updateState('1')}
              className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-lg border-2 transition-all font-black fz-small uppercase tracking-wide ${
                data.state === '1'
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                  : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'
              }`}
            >
              <CheckCircle2 size={14} className={data.state === '1' ? 'text-emerald-500' : 'text-slate-300'} />
              In State
              <span className={`fz-mini px-1.5 py-0.5 rounded font-black ${data.state === '1' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>1</span>
            </button>
            <button
              onClick={() => updateState('0')}
              className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-lg border-2 transition-all font-black fz-small uppercase tracking-wide ${
                data.state === '0'
                  ? 'bg-rose-50 border-rose-400 text-rose-700'
                  : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'
              }`}
            >
              <XCircle size={14} className={data.state === '0' ? 'text-rose-500' : 'text-slate-300'} />
              Out State
              <span className={`fz-mini px-1.5 py-0.5 rounded font-black ${data.state === '0' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400'}`}>0</span>
            </button>
          </div>
          <div className="mt-2 flex items-center gap-1">
            <Info size={9} className="text-slate-400" />
            <span className="fz-mini font-bold text-slate-400 uppercase tracking-wide">
              Enter Wing Code and press Enter to load existing — or fill in details for new
            </span>
          </div>
        </div>
      </div>

      <style>{`
        /* ── Wing Master — dark mode ── */
        html.dark .wm-card { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .wm-card-hdr { border-color: rgba(255,255,255,.07) !important; }
        html.dark .wm-card-hdr span.text-slate-500 { color: #8e8e93 !important; }
        html.dark .wm-card-hdr svg.text-slate-400 { color: #71717a !important; }
        html.dark .wm-root label.text-slate-500 { color: #8e8e93 !important; }
        html.dark .wm-root .text-slate-400 { color: #71717a !important; }
        html.dark .wm-root input {
          background-color: rgba(255,255,255,.05) !important;
          color: #f5f5f7 !important;
          border-color: rgba(255,255,255,.08) !important;
        }
        /* State toggle buttons — inactive */
        html.dark .wm-root button.bg-slate-50 {
          background-color: rgba(255,255,255,.05) !important;
          border-color: rgba(255,255,255,.08) !important;
          color: #71717a !important;
        }
        html.dark .wm-root button.bg-slate-50:hover { border-color: rgba(255,255,255,.18) !important; }
        html.dark .wm-root .text-slate-300 { color: #71717a !important; }
        html.dark .wm-root .bg-slate-100 { background-color: rgba(255,255,255,.08) !important; color: #8e8e93 !important; }
        /* State toggle buttons — active (In State) */
        html.dark .wm-root button.bg-emerald-50 {
          background-color: rgba(52,211,153,0.12) !important;
          border-color: #34d399 !important;
          color: #34d399 !important;
        }
        html.dark .wm-root .bg-emerald-100 { background-color: rgba(52,211,153,0.2) !important; color: #34d399 !important; }
        html.dark .wm-root .text-emerald-500,
        html.dark .wm-root .text-emerald-600,
        html.dark .wm-root .text-emerald-700 { color: #34d399 !important; }
        /* State toggle buttons — active (Out State) */
        html.dark .wm-root button.bg-rose-50 {
          background-color: rgba(255,69,58,0.12) !important;
          border-color: #ff453a !important;
          color: #ff453a !important;
        }
        html.dark .wm-root .bg-rose-100 { background-color: rgba(255,69,58,0.2) !important; color: #ff453a !important; }
        html.dark .wm-root .text-rose-500,
        html.dark .wm-root .text-rose-600,
        html.dark .wm-root .text-rose-700 { color: #ff453a !important; }
      `}</style>

    </div>
  );
};

export default WingMaster;
