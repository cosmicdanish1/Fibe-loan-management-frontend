// components/ChangeMemberOfficeForm.tsx

import React from 'react';
import { ConfigProvider, Select, Input } from 'antd';
import { ArrowRightLeft, UserCheck, RotateCcw, X, Building2 } from 'lucide-react';
import { ChangeMemberOfficeHookReturn } from '../interface/ChangeMemberOfficeInterfaces';
import { usePageToolbarActions } from '../../../../../utils/pageToolbarActions';

const { Option } = Select;

const lbl = "block fz-mini font-black text-slate-500 uppercase tracking-wider mb-0.5";
const inp = "h-7 fz-caption font-semibold bg-white border-slate-300 rounded";
const roInp = "h-7 fz-caption font-semibold bg-slate-50 border-slate-200 rounded text-slate-600";

const ChangeMemberOfficeForm: React.FC<ChangeMemberOfficeHookReturn> = ({
    formData, updateField, handleTransfer, handleCancel, handleExit, isProcessing, offices,
}) => {
    usePageToolbarActions({
        onSave: handleTransfer,
        saveLabel: isProcessing ? 'Processing...' : 'Save',
        saveEnabled: !isProcessing,
    });

    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#6366f1', borderRadius: 6 } }}>
            <div className="cmo-root h-screen flex flex-col bg-[#f5f6fa] font-sans overflow-hidden text-slate-900">

                {/* Header */}
                <div className="cmo-header bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-3 py-2 flex items-center justify-between shrink-0 shadow-lg">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg border border-indigo-400/50 bg-indigo-600">
                            <ArrowRightLeft size={13} className="text-white" />
                        </div>
                        <div>
                            <h1 className="fz-caption font-black text-white tracking-wider uppercase leading-none">Change Member Office</h1>
                            <p className="fz-micro font-bold text-indigo-300 uppercase tracking-widest mt-0.5">Demand &amp; Recovery</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button onClick={handleCancel} className="h-7 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg fz-tiny font-black flex items-center gap-1.5 border border-white/20 uppercase tracking-wide transition-all">
                            <RotateCcw size={11} /> Reset
                        </button>
                        <button
                            onClick={handleTransfer}
                            disabled={isProcessing}
                            className={`h-7 px-3 rounded-lg fz-tiny font-black flex items-center gap-1.5 uppercase tracking-wide transition-all shadow-lg ${
                                isProcessing ? 'bg-slate-700 text-slate-400 cursor-wait border border-slate-600' : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400'
                            }`}
                        >
                            <UserCheck size={11} /> {isProcessing ? 'Processing...' : 'Save'}
                        </button>
                        <div className="h-4 w-px bg-white/20" />
                        <button onClick={handleExit} className="h-7 px-3 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg fz-tiny font-black flex items-center gap-1.5 border border-rose-500/30 uppercase tracking-wide transition-all">
                            <X size={11} /> Exit
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 flex flex-col min-h-0 p-2 gap-1.5">

                    {/* Period card */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm shrink-0">
                        <div className="px-3 py-1.5 border-b border-slate-100">
                            <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Period</span>
                        </div>
                        <div className="px-3 py-2 grid grid-cols-[130px_110px_1fr] gap-3 items-end">
                            <div>
                                <label className={lbl}>Month</label>
                                <Select value={formData.month} onChange={(v) => updateField('month', v)} size="small" className="cmo-sel w-full">
                                    {['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'].map(m => <Option key={m} value={m}>{m}</Option>)}
                                </Select>
                            </div>
                            <div>
                                <label className={lbl}>Year</label>
                                <Select value={formData.year} onChange={(v) => updateField('year', v)} size="small" className="cmo-sel w-full">
                                    {['2024','2025','2026'].map(y => <Option key={y} value={y}>{y}</Option>)}
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Member card */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm shrink-0">
                        <div className="px-3 py-1.5 border-b border-slate-100">
                            <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Member</span>
                        </div>
                        <div className="px-3 py-2 grid grid-cols-2 gap-3">
                            <div>
                                <label className={lbl}>Memb. No.</label>
                                <Input value={formData.memberNo} onChange={(e) => updateField('memberNo', e.target.value)} className={inp} placeholder="Enter Member Number..." />
                            </div>
                            <div>
                                <label className={lbl}>Branch No (Current)</label>
                                <Input value={formData.currentBranchNo} readOnly className={roInp} placeholder="Auto-filled..." />
                            </div>
                        </div>
                    </div>

                    {/* Transfer card */}
                    <div className="bg-white rounded-xl border border-indigo-200 shadow-sm shrink-0">
                        <div className="px-3 py-1.5 border-b border-indigo-100 flex items-center gap-1.5">
                            <ArrowRightLeft size={10} className="text-indigo-500" />
                            <span className="fz-mini font-black text-indigo-600 uppercase tracking-widest">Change To New Branch</span>
                        </div>
                        <div className="px-3 py-2">
                            <label className={lbl}>New Branch</label>
                            <Select value={formData.newBranchNo || undefined} onChange={(v) => updateField('newBranchNo', v)} size="small" className="cmo-sel-hi w-full" placeholder="Select New Branch...">
                                {offices.map(o => <Option key={o.officeId} value={o.officeId}>{o.officeName} ({o.officeId})</Option>)}
                            </Select>
                        </div>
                    </div>

                    <div className="text-center pt-1">
                        <p className="fz-tiny font-bold text-indigo-500 italic">Total Divisions &amp; Branches (N) &nbsp; 1 &nbsp; 1 &nbsp; 1</p>
                    </div>

                </div>

                {/* Footer */}
                <div className="cmo-footer px-3 py-1 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-1.5"><Building2 size={9} className="text-slate-400" /><span className="fz-mini font-black text-slate-500 uppercase tracking-wide">HR &amp; Admin</span></div>
                    <span className="fz-mini font-black text-indigo-400 uppercase tracking-wide">Edit Mode</span>
                </div>
            </div>
            <style>{`
                .cmo-sel .ant-select-selector { height: 28px !important; min-height: 28px !important; font-size: 10px !important; font-weight: 700 !important; }
                .cmo-sel .ant-select-selection-item { line-height: 26px !important; font-size: 10px !important; }
                .cmo-sel-hi .ant-select-selector { height: 28px !important; min-height: 28px !important; font-size: 11px !important; font-weight: 800 !important; background: #eef2ff !important; border-color: #818cf8 !important; }
                .cmo-sel-hi .ant-select-selection-item { line-height: 26px !important; font-size: 11px !important; font-weight: 800 !important; color: #4338ca !important; }

                /* ── Dark mode ── */
                html.dark .cmo-root { background-color: #000000 !important; color: #f5f5f7 !important; }
                html.dark .cmo-header { background: #0c0c0e !important; }
                html.dark .cmo-footer { background-color: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; }
                html.dark .cmo-root .bg-white { background-color: #1c1c1e !important; }
                html.dark .cmo-root .border-slate-200,
                html.dark .cmo-root .border-slate-100 { border-color: rgba(255,255,255,.08) !important; }
                html.dark .cmo-root .text-slate-900,
                html.dark .cmo-root .text-slate-700 { color: #f5f5f7 !important; }
                html.dark .cmo-root .text-slate-500,
                html.dark .cmo-root .text-slate-600 { color: #8e8e93 !important; }
                html.dark .cmo-root .text-slate-400 { color: #71717a !important; }
                html.dark .cmo-root .bg-slate-50 { background-color: rgba(255,255,255,.05) !important; }
                html.dark .cmo-root .border-indigo-200,
                html.dark .cmo-root .border-indigo-100 { border-color: rgba(99,102,241,.3) !important; }
                html.dark .cmo-root .ant-input,
                html.dark .cmo-root input.ant-input {
                    background-color: rgba(255,255,255,.05) !important; color: #f5f5f7 !important; border-color: rgba(255,255,255,.08) !important;
                }
                html.dark .cmo-sel .ant-select-selector { background-color: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
                html.dark .cmo-sel-hi .ant-select-selector { background: rgba(99,102,241,.15) !important; border-color: #818cf8 !important; }
                html.dark .cmo-sel-hi .ant-select-selection-item { color: #a5b4fc !important; }
                html.dark .ant-select-dropdown { background-color: #1c1c1e !important; }
                html.dark .ant-select-dropdown .ant-select-item { color: #f5f5f7 !important; }
                html.dark .ant-select-dropdown .ant-select-item-option-active { background-color: rgba(255,255,255,.08) !important; }
            `}</style>
        </ConfigProvider>
    );
};

export default ChangeMemberOfficeForm;
