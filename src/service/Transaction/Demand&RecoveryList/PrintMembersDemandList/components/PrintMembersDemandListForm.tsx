// components/PrintMembersDemandListForm.tsx

import React from 'react';
import { ConfigProvider, Select, Input } from 'antd';
import { Printer, FileOutput, RotateCcw, X, Building2 } from 'lucide-react';
import { PrintMembersDemandListHookReturn } from '../interface/PrintMembersDemandListInterfaces';

const { Option } = Select;

const lbl = "block fz-mini font-black text-slate-500 uppercase tracking-wider mb-0.5";
const inp = "h-7 fz-caption font-semibold bg-white border-slate-300 rounded";

const PrintMembersDemandListForm: React.FC<PrintMembersDemandListHookReturn> = ({
    formData, updateField, handlePrint, handleExport, handleReset, handleExit, divisions, branches,
}) => {
    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#6366f1', borderRadius: 6 } }}>
            <div className="h-screen flex flex-col bg-[#f5f6fa] font-sans overflow-hidden text-slate-900">

                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-3 py-2 flex items-center justify-between shrink-0 shadow-lg">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg border border-indigo-400/50 bg-indigo-600">
                            <Printer size={13} className="text-white" />
                        </div>
                        <div>
                            <h1 className="fz-caption font-black text-white tracking-wider uppercase leading-none">Print Members Demand List</h1>
                            <p className="fz-micro font-bold text-indigo-300 uppercase tracking-widest mt-0.5">Demand &amp; Recovery</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button onClick={handleReset} className="h-7 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg fz-tiny font-black flex items-center gap-1.5 border border-white/20 uppercase tracking-wide transition-all">
                            <RotateCcw size={11} /> Reset
                        </button>
                        <button onClick={handleExport} className="h-7 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg fz-tiny font-black flex items-center gap-1.5 border border-indigo-400 shadow-lg uppercase tracking-wide transition-all">
                            <FileOutput size={11} /> Export To Details
                        </button>
                        <div className="h-4 w-px bg-white/20" />
                        <button onClick={handleExit} className="h-7 px-3 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg fz-tiny font-black flex items-center gap-1.5 border border-rose-500/30 uppercase tracking-wide transition-all">
                            <X size={11} /> Exit
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 flex flex-col min-h-0 p-2 gap-1.5">

                    {/* Config card */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm shrink-0">
                        <div className="px-3 py-1.5 border-b border-slate-100">
                            <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Print Configuration</span>
                        </div>
                        <div className="px-3 py-2 space-y-2">
                            {/* Row 1: Division + Branch */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={lbl}>Division / RO</label>
                                    <Select value={formData.division || undefined} onChange={(v) => updateField('division', v)} size="small" className="pmd-sel w-full" placeholder="Select Division/RO...">
                                        {divisions.map(d => <Option key={d.id} value={d.id}>{d.name}</Option>)}
                                    </Select>
                                </div>
                                <div>
                                    <label className={lbl}>Branch</label>
                                    <Select value={formData.branch} onChange={(v) => updateField('branch', v)} size="small" className="pmd-sel w-full" placeholder="All Branches">
                                        <Option value="">All Branches</Option>
                                        {branches.map(b => <Option key={b.officeId} value={b.officeId}>{b.officeName}</Option>)}
                                    </Select>
                                </div>
                            </div>

                            {/* Row 2: Month + Year + Sort By + Total Pages */}
                            <div className="grid grid-cols-[110px_90px_1fr_90px] gap-3 items-end">
                                <div>
                                    <label className={lbl}>Month</label>
                                    <Select value={formData.month} onChange={(v) => updateField('month', v)} size="small" className="pmd-sel w-full">
                                        {['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'].map(m => <Option key={m} value={m}>{m}</Option>)}
                                    </Select>
                                </div>
                                <div>
                                    <label className={lbl}>Year</label>
                                    <Select value={formData.year} onChange={(v) => updateField('year', v)} size="small" className="pmd-sel w-full">
                                        {['2024','2025','2026'].map(y => <Option key={y} value={y}>{y}</Option>)}
                                    </Select>
                                </div>
                                <div>
                                    <label className={lbl}>Sort By</label>
                                    <Select value={formData.sortBy} onChange={(v) => updateField('sortBy', v)} size="small" className="pmd-sel w-full">
                                        <Option value="Member No.">Member No.</Option>
                                        <Option value="Name">Name</Option>
                                        <Option value="Account No.">Account No.</Option>
                                    </Select>
                                </div>
                                <div>
                                    <label className={lbl}>Total Pages</label>
                                    <Input value="*" readOnly className="h-7 fz-caption font-semibold bg-slate-50 border-slate-200 rounded text-slate-600" />
                                </div>
                            </div>

                            {/* Row 3: Output Type + Checkboxes */}
                            <div className="flex items-center gap-6">
                                {/* Screen / Printer toggle */}
                                <div>
                                    <label className={lbl}>Output</label>
                                    <div className="flex gap-1">
                                        {(['Screen','Printer'] as const).map(opt => (
                                            <button key={opt} onClick={() => updateField('outputType', opt)}
                                                className={`h-7 px-3 rounded-lg fz-tiny font-black uppercase tracking-wide border transition-all ${
                                                    formData.outputType === opt ? 'bg-indigo-600 text-white border-indigo-600 shadow' : 'bg-white text-slate-500 border-slate-300 hover:border-indigo-400'
                                                }`}
                                            >{opt}</button>
                                        ))}
                                    </div>
                                </div>

                                <div className="w-px h-8 bg-slate-200 self-end" />

                                {/* Checkboxes */}
                                <div className="flex items-center gap-4 self-end pb-0.5">
                                    {[
                                        { key: 'printBalance', label: 'Print Balance' },
                                        { key: 'printEmpNo', label: 'Print Emp No' },
                                        { key: 'printPrevBalance', label: 'Print Prev. Balance' },
                                    ].map(({ key, label }) => (
                                        <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={(formData as any)[key]}
                                                onChange={(e) => updateField(key as any, e.target.checked)}
                                                className="w-3.5 h-3.5 accent-indigo-600"
                                            />
                                            <span className="fz-tiny font-black text-slate-700 uppercase tracking-wide">{label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Preview area */}
                    <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-center">
                        <div className="text-center space-y-3">
                            <Printer size={56} className="text-slate-200 mx-auto" />
                            <p className="fz-tiny font-black text-slate-400 uppercase tracking-wider">Report Preview</p>
                            <p className="fz-mini font-bold text-slate-300">Select parameters and click Export To Details</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-3 py-1 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-1.5"><Building2 size={9} className="text-slate-400" /><span className="fz-mini font-black text-slate-500 uppercase tracking-wide">Administration</span></div>
                    <span className="fz-mini font-black text-indigo-400 uppercase tracking-wide">Reporting Mode</span>
                </div>
            </div>
            <style>{`
                .pmd-sel .ant-select-selector { height: 28px !important; min-height: 28px !important; font-size: 10px !important; font-weight: 700 !important; }
                .pmd-sel .ant-select-selection-item { line-height: 26px !important; font-size: 10px !important; }
            `}</style>
        </ConfigProvider>
    );
};

export default PrintMembersDemandListForm;
