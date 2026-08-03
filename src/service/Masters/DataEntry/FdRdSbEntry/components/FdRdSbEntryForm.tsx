// components/FdRdSbEntryForm.tsx

import React, { useEffect, useRef } from 'react';
import { ConfigProvider, Input, Select, DatePicker } from 'antd';
import {
    Database, Save, RotateCcw, X, ShieldCheck, Building2,
    Users, ArrowDownCircle, ArrowUpCircle, Hash, Search,
    Calendar, IndianRupee,
} from 'lucide-react';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import { FdRdSbEntryHookReturn } from '../interface/FdRdSbEntryInterfaces';

const { Option } = Select;
const { TextArea } = Input;

const labelCls = "block fz-tiny font-black text-slate-500 uppercase tracking-wider mb-0.5";
const inputCls = "h-7 fz-caption font-semibold bg-white border-slate-300 rounded";

const ENTRY_TYPES = [
    { id: 'FD', label: 'Compulsory Deposit (CD)', accType: 'CD', code: 'L1004' },
    { id: 'RD', label: 'Monthly Deposit (MD)',    accType: 'MD', code: 'L1002' },
    { id: 'SB', label: 'Monthly Deposit 2 (MD1)', accType: 'MD1', code: 'L1045' },
];

const FdRdSbEntryForm: React.FC<FdRdSbEntryHookReturn> = ({
    formData,
    updateField,
    handleMemberSelect,
    handleSave,
    handleClear,
    handleExit,
    isLoading,
}) => {
    const lastSpaceRef = useRef<number>(0);

    const openMemberLookup = () => {
        const eAPI = (window as any).electronAPI;
        if (eAPI?.openNewWindow) eAPI.openNewWindow('/common/member-lookup');
    };

    useEffect(() => {
        const handler = (_: any, member: any) => {
            const no = String(member.memberNo || member.mbno || '');
            const name = member.memberName || member.fullname || '';
            if (no) handleMemberSelect(no, { memberNo: no, memberName: name });
        };
        const ipc = (window as any).electron?.ipcRenderer;
        if (ipc) {
            ipc.on('member-selected', handler);
            return () => ipc.removeListener?.('member-selected', handler);
        }
    }, [handleMemberSelect]);

    const handleMemberKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'F2') { e.preventDefault(); openMemberLookup(); return; }
        if (e.key === 'Enter' && formData.memberNo) { handleMemberSelect(formData.memberNo); return; }
        if (e.key === ' ') {
            const now = Date.now();
            if (now - lastSpaceRef.current < 500) { e.preventDefault(); openMemberLookup(); return; }
            lastSpaceRef.current = now;
        }
    };

    const activeType = ENTRY_TYPES.find(t => t.id === formData.entryType) || ENTRY_TYPES[0];

    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#6366f1', borderRadius: 6 } }}>
            <div className="h-screen flex flex-col bg-[#f5f6fa] font-sans overflow-hidden text-slate-900">

                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-3 py-2 flex items-center justify-between shrink-0 shadow-lg">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg border border-indigo-400/50 bg-indigo-600">
                                <Database size={13} className="text-white" />
                            </div>
                            <div>
                                <h1 className="fz-caption font-black text-white tracking-wider uppercase leading-none">FD / RD / SB Entry</h1>
                                <p className="fz-micro font-bold text-indigo-300 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                    <ShieldCheck size={7} className="text-indigo-400" /> Writes to ledger
                                </p>
                            </div>
                        </div>

                        {/* Entry type tabs */}
                        <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/10 gap-0.5">
                            {ENTRY_TYPES.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => updateField('entryType', tab.id)}
                                    className={`relative px-2.5 h-6 fz-mini font-black uppercase tracking-wide transition-all rounded-md ${
                                        formData.entryType === tab.id
                                            ? 'bg-indigo-600 text-white shadow-lg'
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button onClick={handleClear} className="h-7 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-white/20 uppercase tracking-wide">
                            <RotateCcw size={11} /> Clear
                        </button>
                        <button onClick={handleSave} disabled={isLoading}
                            className={`h-7 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-indigo-400 shadow-lg uppercase tracking-wide ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}>
                            {isLoading ? <RotateCcw size={11} className="animate-spin" /> : <Save size={11} />}
                            {isLoading ? 'Saving…' : 'Save'}
                        </button>
                        <div className="h-4 w-px bg-white/20" />
                        <button onClick={handleExit} className="h-7 px-3 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-rose-500/30 uppercase tracking-wide">
                            <X size={11} /> Exit
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto">
                    <div className="max-w-3xl mx-auto p-3 pb-4 space-y-2">

                        {/* ── Member ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                                <Users size={11} className="text-slate-400" />
                                <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Member</span>
                                {formData.memberName && (
                                    <span className="ml-auto fz-tiny font-black text-indigo-600">{formData.memberName}</span>
                                )}
                            </div>
                            <div className="p-3">
                                <label className={labelCls}>Member No.</label>
                                <div className="flex gap-1">
                                    <div className="relative flex-1">
                                        <Hash size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <Input
                                            value={formData.memberNo}
                                            onChange={e => {
                                                updateField('memberNo', e.target.value);
                                                updateField('memberName', '');
                                            }}
                                            onKeyDown={handleMemberKeyDown}
                                            onClick={openMemberLookup}
                                            placeholder="Click or press F2 to search…"
                                            className={`${inputCls} pl-6`}
                                        />
                                    </div>
                                    <button onClick={openMemberLookup}
                                        className="h-7 w-7 bg-slate-100 hover:bg-indigo-600 hover:text-white rounded text-slate-500 flex items-center justify-center transition-colors shrink-0">
                                        <Search size={12} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ── Transaction Details ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                                <Database size={11} className="text-slate-400" />
                                <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Transaction Details</span>
                                <span className="ml-auto fz-mini font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                                    {activeType.accType} / {activeType.code}
                                </span>
                            </div>
                            <div className="p-3 grid grid-cols-3 gap-x-4 gap-y-2">

                                <div>
                                    <label className={labelCls}>Transaction Date</label>
                                    <DatePicker
                                        value={formData.transDate ? dayjs(formData.transDate) : null}
                                        onChange={d => updateField('transDate', d ? d.format('YYYY-MM-DD') : '')}
                                        format="DD-MMM-YY"
                                        className="w-full h-7 fz-caption"
                                    />
                                </div>

                                <div>
                                    <label className={labelCls}>Transaction Type</label>
                                    <div className="flex gap-1">
                                        <button onClick={() => updateField('transType', 'CR')}
                                            className={`flex-1 h-7 rounded-lg fz-tiny font-black flex items-center justify-center gap-1 transition-all border ${
                                                formData.transType === 'CR'
                                                    ? 'bg-emerald-600 text-white border-emerald-500'
                                                    : 'bg-white text-slate-500 border-slate-300 hover:border-slate-400'
                                            }`}>
                                            <ArrowDownCircle size={11} /> CR
                                        </button>
                                        <button onClick={() => updateField('transType', 'DR')}
                                            className={`flex-1 h-7 rounded-lg fz-tiny font-black flex items-center justify-center gap-1 transition-all border ${
                                                formData.transType === 'DR'
                                                    ? 'bg-rose-600 text-white border-rose-500'
                                                    : 'bg-white text-slate-500 border-slate-300 hover:border-slate-400'
                                            }`}>
                                            <ArrowUpCircle size={11} /> DR
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className={labelCls}>Amount</label>
                                    <div className="relative">
                                        <IndianRupee size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <Input type="number" value={formData.amount}
                                            onChange={e => updateField('amount', e.target.value)}
                                            placeholder="0.00"
                                            className={`${inputCls} pl-6 text-right font-bold text-slate-700`} />
                                    </div>
                                </div>

                                <div>
                                    <label className={labelCls}>Receipt / Voucher No</label>
                                    <Input value={formData.receiptVchrNo}
                                        onChange={e => updateField('receiptVchrNo', e.target.value)}
                                        placeholder="R001"
                                        className={inputCls} />
                                </div>

                                <div>
                                    <label className={labelCls}>Voucher Type</label>
                                    <Select value={formData.vchrType} onChange={v => updateField('vchrType', v)}
                                        className="w-full" style={{ height: 28 }}>
                                        <Option value="R">Receipt (R)</Option>
                                        <Option value="P">Payment (P)</Option>
                                        <Option value="J">Journal (J)</Option>
                                        <Option value="C">Contra (C)</Option>
                                    </Select>
                                </div>

                                <div>
                                    <label className={labelCls}>Mode of Payment</label>
                                    <Select value={formData.modeOfPay} onChange={v => updateField('modeOfPay', v)}
                                        className="w-full" style={{ height: 28 }}>
                                        <Option value="C">Cash</Option>
                                        <Option value="Q">Cheque</Option>
                                        <Option value="T">Transfer</Option>
                                        <Option value="O">Online</Option>
                                    </Select>
                                </div>

                            </div>

                            <div className="px-3 pb-3">
                                <label className={labelCls}>Narration</label>
                                <TextArea value={formData.narration}
                                    onChange={e => updateField('narration', e.target.value)}
                                    placeholder="Enter narration / remarks…"
                                    rows={2}
                                    className="fz-small font-medium bg-slate-50 border-slate-200 rounded resize-none" />
                            </div>
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="px-3 py-1.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-1.5">
                        <Building2 size={9} className="text-slate-400" />
                        <span className="fz-mini font-black text-slate-500 uppercase tracking-wide">{activeType.label}</span>
                        {formData.memberName && (
                            <>
                                <div className="w-px h-2.5 bg-slate-300" />
                                <span className="fz-mini font-black text-indigo-500">{formData.memberName}</span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-1 text-indigo-500">
                        <Calendar size={9} />
                        <span className="fz-mini font-black uppercase tracking-wide">{dayjs().format('DD-MMM-YY')}</span>
                    </div>
                </div>

            </div>

            <style>{`
                .ant-select-selector { font-size: 11px !important; }
                .ant-picker-input > input { font-size: 11px !important; font-weight: 600 !important; }
                .ant-input::placeholder { font-size: 9px !important; color: #94a3b8 !important; }
                input[type=number]::-webkit-inner-spin-button,
                input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
                input[type=number] { -moz-appearance: textfield; }
            `}</style>
        </ConfigProvider>
    );
};

export default FdRdSbEntryForm;
