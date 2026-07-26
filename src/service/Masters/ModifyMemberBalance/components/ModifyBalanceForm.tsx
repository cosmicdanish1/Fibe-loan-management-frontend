// components/ModifyBalanceForm.tsx

import React from 'react';
import { ConfigProvider, Select } from 'antd';
import {
    Activity, Building2, ChevronsLeft, ChevronLeft, ChevronRight,
    ChevronsRight, RotateCcw, Save, ShieldCheck,
    Users, X, Calendar, IndianRupee, TrendingDown
} from 'lucide-react';
import dayjs from 'dayjs';
import type { MemberBalanceHookReturn, MemberBalanceData } from '../interfaces/interface';
import MemberLookupInput from '../../../../components/shared/MemberLookup/MemberLookupInput';

const { Option } = Select;

const labelCls = "block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-0.5";

// Inline number input matching our standard style
const AmtInput: React.FC<{
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    accent?: boolean;
}> = ({ value, onChange, placeholder = '0.00', accent }) => (
    <div className="relative">
        <IndianRupee size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
            type="number"
            inputMode="decimal"
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={e => { if (['e', 'E', '+'].includes(e.key)) e.preventDefault(); }}
            onWheel={e => (e.target as HTMLInputElement).blur()}
            placeholder={placeholder}
            className={`w-full h-7 pl-6 pr-2 text-[11px] font-semibold text-right border rounded bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 transition-all ${
                accent ? 'border-indigo-300 text-indigo-700' : 'border-slate-300 text-slate-700'
            }`}
        />
    </div>
);

const ModifyBalanceForm: React.FC<MemberBalanceHookReturn> = ({
    formData, setFormData,
    wing, setWing, wings,
    memberNo, memberName,
    memberIndex, memberTotal,
    handleMemberSelect,
    navigateMember,
    save, reset,
}) => {
    const handleExit = () => {
        if ((window as any).electron?.ipcRenderer) {
            (window as any).electron.ipcRenderer.send('close-window');
        }
    };

    const upd = (key: keyof MemberBalanceData) => (val: string) =>
        setFormData(prev => ({ ...prev, [key]: val }));

    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#6366f1', borderRadius: 6 } }}>
            <div className="mmb-form h-screen flex flex-col bg-[#f5f6fa] font-sans overflow-hidden text-slate-900">

                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-3 py-2 flex items-center justify-between shrink-0 shadow-lg">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg border border-indigo-400/50 bg-indigo-600">
                            <Activity size={13} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-[11px] font-black text-white tracking-wider uppercase leading-none">Modify Member Balance</h1>
                            <p className="text-[7px] font-bold text-indigo-300 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                <ShieldCheck size={7} className="text-indigo-400" /> fundsmaster — Edit Balances
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button onClick={reset} className="h-7 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[9px] font-black transition-all flex items-center gap-1.5 border border-white/20 uppercase tracking-wide">
                            <RotateCcw size={11} /> Revert
                        </button>
                        <button onClick={save} className="h-7 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[9px] font-black transition-all flex items-center gap-1.5 border border-indigo-400 shadow-lg uppercase tracking-wide">
                            <Save size={11} /> Save
                        </button>
                        <div className="h-4 w-px bg-white/20" />
                        <button onClick={handleExit} className="h-7 px-3 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg text-[9px] font-black transition-all flex items-center gap-1.5 border border-rose-500/30 uppercase tracking-wide">
                            <X size={11} /> Exit
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto">
                    <div className="max-w-3xl mx-auto p-3 pb-4 space-y-2">

                        {/* ── Member Selection ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                                <Users size={11} className="text-slate-400" />
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Member Selection</span>
                                {memberTotal > 0 && (
                                    <span className="ml-auto text-[8px] font-black text-indigo-500 uppercase tracking-wide">
                                        {memberIndex > 0 ? `${memberIndex} / ${memberTotal}` : `${memberTotal} members`}
                                    </span>
                                )}
                            </div>
                            <div className="p-3 space-y-2">
                                <div className="grid grid-cols-3 gap-x-3">
                                    {/* Wing */}
                                    <div>
                                        <label className={labelCls}>Select Wing</label>
                                        <Select
                                            value={wing || undefined}
                                            onChange={setWing}
                                            placeholder="Select wing..."
                                            className="w-full"
                                            style={{ height: 28 }}
                                            allowClear
                                        >
                                            {wings.map(w => (
                                                <Option key={w.id} value={w.id}>{w.name}</Option>
                                            ))}
                                        </Select>
                                    </div>

                                    {/* Member No with navigation */}
                                    <div className="col-span-2">
                                        <label className={labelCls}>Member No</label>
                                        <div className="flex items-center gap-1">
                                            {/* Prev nav */}
                                            <div className="flex rounded-lg overflow-hidden border border-slate-200 shrink-0">
                                                <button onClick={() => navigateMember('first')} title="First"
                                                    className="h-7 w-7 flex items-center justify-center bg-white hover:bg-slate-50 text-slate-400 hover:text-indigo-600 border-r border-slate-200 transition-colors">
                                                    <ChevronsLeft size={11} />
                                                </button>
                                                <button onClick={() => navigateMember('prev')} title="Previous"
                                                    className="h-7 w-7 flex items-center justify-center bg-white hover:bg-slate-50 text-slate-400 hover:text-indigo-600 transition-colors">
                                                    <ChevronLeft size={11} />
                                                </button>
                                            </div>
                                            {/* Member input */}
                                            <div className="flex-1">
                                                <MemberLookupInput
                                                    value={memberNo}
                                                    onChange={handleMemberSelect}
                                                    placeholder="Enter member no or search..."
                                                    showLookupButton={true}
                                                    autoSearch={true}
                                                />
                                            </div>
                                            {/* Next nav */}
                                            <div className="flex rounded-lg overflow-hidden border border-slate-200 shrink-0">
                                                <button onClick={() => navigateMember('next')} title="Next"
                                                    className="h-7 w-7 flex items-center justify-center bg-white hover:bg-slate-50 text-slate-400 hover:text-indigo-600 border-r border-slate-200 transition-colors">
                                                    <ChevronRight size={11} />
                                                </button>
                                                <button onClick={() => navigateMember('last')} title="Last"
                                                    className="h-7 w-7 flex items-center justify-center bg-white hover:bg-slate-50 text-slate-400 hover:text-indigo-600 transition-colors">
                                                    <ChevronsRight size={11} />
                                                </button>
                                            </div>
                                        </div>
                                        {memberName && (
                                            <div className="mt-1 flex items-center gap-1">
                                                <Users size={9} className="text-indigo-400" />
                                                <span className="text-[10px] font-black text-indigo-700">{memberName}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Main Balances ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                                <IndianRupee size={11} className="text-slate-400" />
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Balances</span>
                            </div>
                            <div className="p-3">
                                {/* Column headers */}
                                <div className="grid grid-cols-[1fr_160px_160px] gap-x-4 mb-1.5">
                                    <div />
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider text-right">Opening Balance</span>
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider text-right">Install / Contri Amt</span>
                                </div>
                                <div className="space-y-1.5">
                                    {/* Shares */}
                                    <div className="grid grid-cols-[1fr_160px_160px] gap-x-4 items-center">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide">Shares</span>
                                        </div>
                                        <AmtInput value={formData.shareOpBal} onChange={upd('shareOpBal')} />
                                        <AmtInput value={formData.shareAmt} onChange={upd('shareAmt')} />
                                    </div>

                                    {/* Monthly Contribution */}
                                    <div className="grid grid-cols-[1fr_160px_160px] gap-x-4 items-center">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide">Monthly Contribution</span>
                                        </div>
                                        <AmtInput value={formData.mdOpBal} onChange={upd('mdOpBal')} />
                                        <AmtInput value={formData.mdAmt} onChange={upd('mdAmt')} />
                                    </div>

                                    {/* Compulsory Deposit */}
                                    <div className="grid grid-cols-[1fr_160px_160px] gap-x-4 items-center">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide">Compulsory Deposit</span>
                                        </div>
                                        <AmtInput value={formData.cdOpBal} onChange={upd('cdOpBal')} />
                                        <AmtInput value={formData.cdAmt} onChange={upd('cdAmt')} />
                                    </div>

                                    {/* Loan Execution Receipt */}
                                    <div className="grid grid-cols-[1fr_160px_160px] gap-x-4 items-center">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide">Loan Exec. Receipt</span>
                                        </div>
                                        <AmtInput value={formData.lnExecRec} onChange={upd('lnExecRec')} />
                                        <div /> {/* no install amt for this row */}
                                    </div>
                                </div>

                                {/* Suspense Balance — full-width highlight */}
                                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                        <span className="text-[10px] font-black text-rose-600 uppercase tracking-wide">Suspense Balance</span>
                                    </div>
                                    <div className="w-40">
                                        <AmtInput value={formData.suspBal} onChange={upd('suspBal')} accent />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Loans ── */}
                        <div className="grid grid-cols-2 gap-2">
                            {/* Regular Loan */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                                <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                                    <TrendingDown size={11} className="text-slate-400" />
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Regular Loan</span>
                                </div>
                                <div className="p-3 grid grid-cols-2 gap-x-3 gap-y-2">
                                    <div>
                                        <label className={labelCls}>Op. Balance</label>
                                        <AmtInput value={formData.rlnOpBal} onChange={upd('rlnOpBal')} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Inst. Amount</label>
                                        <AmtInput value={formData.rlnAmt} onChange={upd('rlnAmt')} />
                                    </div>
                                </div>
                            </div>

                            {/* Emergency Loan */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                                <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                                    <TrendingDown size={11} className="text-slate-400" />
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Emergency Loan</span>
                                </div>
                                <div className="p-3 grid grid-cols-2 gap-x-3 gap-y-2">
                                    <div>
                                        <label className={labelCls}>Op. Balance</label>
                                        <AmtInput value={formData.elnOpBal} onChange={upd('elnOpBal')} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Inst. Amount</label>
                                        <AmtInput value={formData.elnAmt} onChange={upd('elnAmt')} />
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="px-3 py-1.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-1.5">
                        <Building2 size={9} className="text-slate-400" />
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-wide">Modify Balance Registry</span>
                        {memberName && (
                            <>
                                <div className="w-px h-2.5 bg-slate-300" />
                                <span className="text-[8px] font-black text-indigo-500 uppercase tracking-wide">{memberName}</span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-1 text-indigo-500">
                        <Calendar size={9} />
                        <span className="text-[8px] font-black uppercase tracking-wide">{dayjs().format('DD-MMM-YY')}</span>
                    </div>
                </div>

            </div>

            <style>{`
                .ant-select-selector { font-size: 11px !important; }
                input[type=number]::-webkit-inner-spin-button,
                input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
                input[type=number] { -moz-appearance: textfield; }

                /* Dark mode: the global layer covers cards/inputs; only the arbitrary root bg is missed. */
                html.dark .mmb-form { background-color: #0f172a !important; }
                html.dark .mmb-form input[type=number] { background-color: #1e293b !important; color: #e2e8f0 !important; border-color: #334155 !important; }
            `}</style>
        </ConfigProvider>
    );
};

export default ModifyBalanceForm;
