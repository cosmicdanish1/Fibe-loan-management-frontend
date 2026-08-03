// components/ChangeMemberOfficeForm.tsx

import React from 'react';
import { ConfigProvider, Select, Input } from 'antd';
import { ArrowRightLeft, UserCheck, RotateCcw, X, Building2 } from 'lucide-react';
import { ChangeMemberOfficeHookReturn } from '../interface/ChangeMemberOfficeInterfaces';

const { Option } = Select;

const lbl = "block fz-mini font-black text-slate-500 uppercase tracking-wider mb-0.5";
const inp = "h-7 fz-caption font-semibold bg-white border-slate-300 rounded";
const roInp = "h-7 fz-caption font-semibold bg-slate-50 border-slate-200 rounded text-slate-600";

const ChangeMemberOfficeForm: React.FC<ChangeMemberOfficeHookReturn> = ({
    formData, updateField, handleTransfer, handleCancel, handleExit, isProcessing,
}) => {
    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#6366f1', borderRadius: 6 } }}>
            <div className="h-screen flex flex-col bg-[#f5f6fa] font-sans overflow-hidden text-slate-900">

                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-3 py-2 flex items-center justify-between shrink-0 shadow-lg">
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
                            <Select value={formData.newBranchNo} onChange={(v) => updateField('newBranchNo', v)} size="small" className="cmo-sel-hi w-full" placeholder="Select New Branch...">
                                <Option value="BR-001">Main Head Office (001)</Option>
                                <Option value="BR-002">North Regional (002)</Option>
                                <Option value="BR-003">South Regional (003)</Option>
                                <Option value="BR-004">East Wing (004)</Option>
                                <Option value="BR-005">West Wing (005)</Option>
                            </Select>
                        </div>
                    </div>

                    <div className="text-center pt-1">
                        <p className="fz-tiny font-bold text-indigo-500 italic">Total Divisions &amp; Branches (N) &nbsp; 1 &nbsp; 1 &nbsp; 1</p>
                    </div>

                </div>

                {/* Footer */}
                <div className="px-3 py-1 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-1.5"><Building2 size={9} className="text-slate-400" /><span className="fz-mini font-black text-slate-500 uppercase tracking-wide">HR &amp; Admin</span></div>
                    <span className="fz-mini font-black text-indigo-400 uppercase tracking-wide">Edit Mode</span>
                </div>
            </div>
            <style>{`
                .cmo-sel .ant-select-selector { height: 28px !important; min-height: 28px !important; font-size: 10px !important; font-weight: 700 !important; }
                .cmo-sel .ant-select-selection-item { line-height: 26px !important; font-size: 10px !important; }
                .cmo-sel-hi .ant-select-selector { height: 28px !important; min-height: 28px !important; font-size: 11px !important; font-weight: 800 !important; background: #eef2ff !important; border-color: #818cf8 !important; }
                .cmo-sel-hi .ant-select-selection-item { line-height: 26px !important; font-size: 11px !important; font-weight: 800 !important; color: #4338ca !important; }
            `}</style>
        </ConfigProvider>
    );
};

export default ChangeMemberOfficeForm;
