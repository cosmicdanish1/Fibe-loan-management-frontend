// components/FixedDepositForm.tsx

import React, { useEffect, useState } from 'react';
import { ConfigProvider, Input, Select, Table, DatePicker, Checkbox, Modal } from 'antd';
import {
    Landmark, RotateCcw, Save, X, ShieldCheck, Printer,
    Search, Users, Building2, Calendar, Hash, IndianRupee, Plus, Trash2,
} from 'lucide-react';
import { FixedDepositHookReturn } from '../interface/FixedDepositReceiptInterfaces';
import dayjs from 'dayjs';
import { apiService } from '../../../../../services/api';
import MemberLookup from '../../../../../components/shared/MemberLookup/MemberLookup';

const { Option } = Select;

const labelCls = "block text-[8px] font-black text-slate-500 uppercase tracking-wider mb-0.5";
const inputCls = "h-6 text-[11px] font-semibold bg-white border-slate-300 rounded";
const roInputCls = "h-6 text-[11px] font-semibold bg-slate-50 border-slate-200 rounded";

const RELATIONS = ['Son','Daughter','Wife','Husband','Father','Mother','Brother','Sister','Grandson','Granddaughter','Other'];

const FixedDepositForm: React.FC<FixedDepositHookReturn> = ({
    formData, nomineeData, isLoading, bankBalance,
    addNominee, updateNominee, removeNominee,
    showLookupModal, setShowLookupModal,
    updateField,
    handleSave: originalHandleSave,
    handlePrint,
    handleReset: originalHandleReset,
    handleExit,
}) => {
    const [bankHeads, setBankHeads] = useState<{ code: string; name: string }[]>([]);
    const [showRefLookup, setShowRefLookup] = useState(false);
    const [lastSaved, setLastSaved] = useState<{ certificateNo: string; memberNo: string; amount: number } | null>(null);

    const handleSave = async () => {
        const result = await originalHandleSave();
        if (result) setLastSaved(result);
    };

    const handleReset = () => {
        originalHandleReset();
        setLastSaved(null);
    };

    useEffect(() => {
        apiService.getBankList()
            .then((response: any) => {
                const banks = Array.isArray(response.data) ? response.data : (response.data?.data || []);
                const mapped = (Array.isArray(banks) ? banks : []).map((b: any) => ({ code: b.code, name: b.name || b.head_name || b.code }));
                if (mapped.length > 0) setBankHeads(mapped);
            })
            .catch(() => { /* leave empty */ });
    }, []);

    const nomineeColumns = [
        {
            title: <span className="text-[8px] font-black text-slate-600 uppercase">Name</span>, dataIndex: 'name', key: 'name', width: '28%',
            render: (t: string, r: any) => <Input value={t} onChange={e => updateNominee(r.key, 'name', e.target.value)} placeholder="Name..." className="h-6 text-[10px] font-semibold" />,
        },
        {
            title: <span className="text-[8px] font-black text-slate-600 uppercase">Address</span>, dataIndex: 'address', key: 'address', width: '34%',
            render: (t: string, r: any) => <Input value={t} onChange={e => updateNominee(r.key, 'address', e.target.value)} placeholder="Address..." className="h-6 text-[10px]" />,
        },
        {
            title: <span className="text-[8px] font-black text-slate-600 uppercase">Age</span>, dataIndex: 'age', key: 'age', width: '12%', align: 'center' as const,
            render: (t: number, r: any) => <Input type="number" value={t || ''} onChange={e => updateNominee(r.key, 'age', e.target.value)} placeholder="0" className="h-6 text-[10px] text-center" />,
        },
        {
            title: <span className="text-[8px] font-black text-slate-600 uppercase">Relation</span>, dataIndex: 'relation', key: 'relation', width: '20%',
            render: (t: string, r: any) => <Select value={t || undefined} onChange={v => updateNominee(r.key, 'relation', v)} placeholder="..." size="small" className="w-full fd-sm-select" style={{ height: 24 }} options={RELATIONS.map(rel => ({ value: rel, label: rel }))} />,
        },
        {
            title: '', key: 'action', width: '6%', align: 'center' as const,
            render: (_: any, r: any) => <button onClick={() => removeNominee(r.key)} className="p-0.5 text-rose-400 hover:text-white hover:bg-rose-500 rounded transition-all"><Trash2 size={11} /></button>,
        },
    ];

    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#6366f1', borderRadius: 6 } }}>
            <div className="h-screen flex flex-col bg-[#f5f6fa] font-sans overflow-hidden text-slate-900">

                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-3 py-2 flex items-center justify-between shrink-0 shadow-lg">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg border border-indigo-400/50 bg-indigo-600">
                            <Landmark size={13} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-[11px] font-black text-white tracking-wider uppercase leading-none">Fixed Deposit Receipt</h1>
                            <p className="text-[7px] font-bold text-indigo-300 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                <ShieldCheck size={7} className="text-indigo-400" /> fdmaster + ledger CR A003/FD
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button onClick={handleReset} className="h-7 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[9px] font-black transition-all flex items-center gap-1.5 border border-white/20 uppercase tracking-wide">
                            <RotateCcw size={11} /> Reset
                        </button>
                        <button onClick={handlePrint} className="h-7 px-3 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-white rounded-lg text-[9px] font-black transition-all flex items-center gap-1.5 border border-amber-500/30 uppercase tracking-wide">
                            <Printer size={11} /> Print
                        </button>
                        <button onClick={handleSave} disabled={isLoading}
                            className={`h-7 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[9px] font-black transition-all flex items-center gap-1.5 border border-indigo-400 shadow-lg uppercase tracking-wide ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}>
                            {isLoading ? <RotateCcw size={11} className="animate-spin" /> : <Save size={11} />}
                            {isLoading ? 'Saving…' : 'Save'}
                        </button>
                        <div className="h-4 w-px bg-white/20" />
                        <button onClick={handleExit} className="h-7 px-3 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg text-[9px] font-black transition-all flex items-center gap-1.5 border border-rose-500/30 uppercase tracking-wide">
                            <X size={11} /> Exit
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto">
                    <div className="max-w-6xl mx-auto p-2 space-y-1.5">

                        {/* Last saved banner */}
                        {lastSaved && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Save size={12} className="text-amber-600" />
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <span className="text-[8px] font-black text-amber-500 uppercase tracking-wide">Certificate</span>
                                            <p className="text-[10px] font-black text-amber-800">{lastSaved.certificateNo}</p>
                                        </div>
                                        <div>
                                            <span className="text-[8px] font-black text-amber-500 uppercase tracking-wide">Member</span>
                                            <p className="text-[10px] font-bold text-amber-800">{lastSaved.memberNo}</p>
                                        </div>
                                        <div>
                                            <span className="text-[8px] font-black text-amber-500 uppercase tracking-wide">Amount</span>
                                            <p className="text-[10px] font-black text-amber-800">₹{lastSaved.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => { handleReset(); setLastSaved(null); }}
                                    className="text-[8px] font-black text-amber-600 hover:text-amber-800 uppercase tracking-wide flex items-center gap-1">
                                    <RotateCcw size={9} /> New
                                </button>
                            </div>
                        )}

                        {/* ── Member Selection ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="px-2.5 py-1 border-b border-slate-100 flex items-center gap-1.5">
                                <Users size={11} className="text-slate-400" />
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Member & Applicant</span>
                            </div>
                            <div className="p-2 space-y-1.5">
                                {/* Row 1: Member No + Ref Member No */}
                                <div className="grid grid-cols-2 gap-x-4">
                                    <div>
                                        <label className={labelCls}>Member No <span className="text-rose-500">*</span></label>
                                        <div className="flex gap-1">
                                            <div className="relative flex-1">
                                                <Hash size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <Input value={formData.memberNo} onChange={e => updateField('memberNo', e.target.value)}
                                                    placeholder="Member no..."
                                                    className={`${inputCls} pl-6 font-mono`} />
                                            </div>
                                            <button onClick={() => setShowLookupModal(true)}
                                                className="h-7 w-7 bg-slate-100 hover:bg-indigo-600 hover:text-white rounded text-slate-500 flex items-center justify-center transition-colors shrink-0">
                                                <Search size={12} />
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Reference Member No</label>
                                        <div className="flex gap-1">
                                            <div className="relative flex-1">
                                                <Hash size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <Input value={formData.referenceMemberNo} onChange={e => updateField('referenceMemberNo', e.target.value)}
                                                    placeholder="Reference member no..."
                                                    className={`${inputCls} pl-6 font-mono`} />
                                            </div>
                                            <button onClick={() => setShowRefLookup(true)}
                                                className="h-7 w-7 bg-slate-100 hover:bg-indigo-600 hover:text-white rounded text-slate-500 flex items-center justify-center transition-colors shrink-0">
                                                <Search size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                {/* Row 2: Prefix + Name + FD Head */}
                                <div className="grid grid-cols-12 gap-x-3">
                                    <div className="col-span-1">
                                        <label className={labelCls}>Prefix</label>
                                        <Select value={formData.prefix || undefined} onChange={v => updateField('prefix', v)}
                                            className="w-full fd-sm-select" style={{ height: 24 }} placeholder="—">
                                            {['Mr','Mrs','Ms','Dr'].map(p => <Option key={p} value={p}>{p}</Option>)}
                                        </Select>
                                    </div>
                                    <div className="col-span-3">
                                        <label className={labelCls}>First Name</label>
                                        <Input value={formData.firstName} onChange={e => updateField('firstName', e.target.value)}
                                            placeholder="First" className={inputCls} />
                                    </div>
                                    <div className="col-span-2">
                                        <label className={labelCls}>Middle</label>
                                        <Input value={formData.middleName} onChange={e => updateField('middleName', e.target.value)}
                                            placeholder="Middle" className={inputCls} />
                                    </div>
                                    <div className="col-span-2">
                                        <label className={labelCls}>Last Name</label>
                                        <Input value={formData.lastName} onChange={e => updateField('lastName', e.target.value)}
                                            placeholder="Last" className={inputCls} />
                                    </div>
                                    <div className="col-span-4">
                                        <label className={labelCls}>FD Head Name</label>
                                        <Select value={formData.fdHeadName || undefined}
                                            onChange={v => { updateField('fdHeadName', v); updateField('fdHeadCode', v); }}
                                            className="w-full fd-sm-select" style={{ height: 24 }} placeholder="Select FD Head...">
                                            <Option value="A003">A003 — FIXED DEPOSIT</Option>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Deposit Details ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="px-2.5 py-1 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <Landmark size={11} className="text-slate-400" />
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Deposit Details</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Checkbox checked={formData.isModify} onChange={e => updateField('isModify', e.target.checked)}
                                        className="text-[9px] font-black text-slate-700">Modify</Checkbox>
                                    {formData.isModify && (
                                        <div className="flex gap-2">
                                            {['adjustment','renewal'].map(v => (
                                                <button key={v} onClick={() => {
                                                    updateField('isAdjustment', v === 'adjustment');
                                                    updateField('isRenewal', v === 'renewal');
                                                }}
                                                    className={`h-6 px-2.5 rounded-lg text-[8px] font-black uppercase transition-all border ${
                                                        (v === 'adjustment' && formData.isAdjustment) || (v === 'renewal' && formData.isRenewal)
                                                            ? 'bg-amber-500 text-white border-amber-400'
                                                            : 'bg-white text-slate-500 border-slate-300 hover:border-slate-400'
                                                    }`}>
                                                    {v}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="p-2 grid grid-cols-4 gap-x-3 gap-y-1.5">
                                <div>
                                    <label className={labelCls}>Certificate No.</label>
                                    <div className="relative">
                                        <Hash size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <Input value={formData.certificateNo} onChange={e => updateField('certificateNo', e.target.value)}
                                            className={`${inputCls} pl-6 font-mono font-bold text-indigo-700`} />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Deposit Date <span className="text-rose-500">*</span></label>
                                    <DatePicker value={formData.depositDate ? dayjs(formData.depositDate) : null}
                                        onChange={d => updateField('depositDate', d)}
                                        className="w-full h-6 text-[11px]" format="DD-MMM-YY" />
                                </div>
                                <div>
                                    <label className={labelCls}>Rate (%)</label>
                                    <Input value={formData.rate} onChange={e => updateField('rate', e.target.value)}
                                        placeholder="12.00" className={`${inputCls} text-center font-bold text-indigo-700`} />
                                </div>
                                <div>
                                    <label className={labelCls}>Deposit Unit</label>
                                    <Select value={formData.depositUnit} onChange={v => updateField('depositUnit', v)}
                                        className="w-full fd-sm-select" style={{ height: 24 }}>
                                        {['Months','Years','Days'].map(u => <Option key={u} value={u}>{u}</Option>)}
                                    </Select>
                                </div>
                                <div>
                                    <label className={labelCls}>Deposit Period</label>
                                    <Input value={formData.depositPeriod} onChange={e => updateField('depositPeriod', e.target.value)}
                                        placeholder="12" className={`${inputCls} text-center`} />
                                </div>
                                <div>
                                    <label className={labelCls}>Maturity Date <span className="text-rose-500">*</span></label>
                                    <DatePicker value={formData.maturityDate ? dayjs(formData.maturityDate) : null}
                                        onChange={d => updateField('maturityDate', d)}
                                        className="w-full h-6 text-[11px]" format="DD-MMM-YY" />
                                </div>
                                <div className="col-span-2">
                                    <label className={labelCls}>Int. Calculation Method</label>
                                    <Select value={formData.intCalculationMethod || undefined} onChange={v => updateField('intCalculationMethod', v)}
                                        className="w-full fd-sm-select" style={{ height: 24 }} placeholder="Select...">
                                        <Option value="1">Simple Interest</Option>
                                        <Option value="2">Compound Interest</Option>
                                    </Select>
                                </div>
                                <div className="col-span-2">
                                    <label className={labelCls}>Mode of Payment (Interest)</label>
                                    <Select value={formData.modeOfPayment || undefined} onChange={v => updateField('modeOfPayment', v)}
                                        className="w-full fd-sm-select" style={{ height: 24 }} placeholder="Select...">
                                        {[['1','On Maturity'],['2','Monthly'],['3','Quarterly'],['4','Half Yearly'],['5','Yearly']].map(([v,l]) => (
                                            <Option key={v} value={v}>{l}</Option>
                                        ))}
                                    </Select>
                                </div>
                                <div>
                                    <label className={labelCls}>Deposit Amount <span className="text-rose-500">*</span></label>
                                    <div className="relative">
                                        <IndianRupee size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <Input type="number" value={formData.depositAmount} onChange={e => updateField('depositAmount', e.target.value)}
                                            placeholder="0.00"
                                            className={`${inputCls} pl-6 text-right font-bold text-amber-700 bg-amber-50 border-amber-200`} />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Int. Amount</label>
                                    <div className="relative">
                                        <IndianRupee size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <Input type="number" value={formData.intAmount} onChange={e => updateField('intAmount', e.target.value)}
                                            placeholder="0.00"
                                            className={`${inputCls} pl-6 text-right font-bold text-slate-700`} />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Maturity Amount</label>
                                    <div className="relative">
                                        <IndianRupee size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <Input type="number" value={formData.maturityAmount} onChange={e => updateField('maturityAmount', e.target.value)}
                                            placeholder="0.00"
                                            className={`${inputCls} pl-6 text-right font-bold text-emerald-700 bg-emerald-50 border-emerald-200`} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Nominee + Mode of Receipt ── */}
                        <div className="grid grid-cols-2 gap-2">
                            {/* Nominee Details */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-2.5 py-1 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <Users size={11} className="text-slate-400" />
                                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Nominee Details</span>
                                    </div>
                                    <button onClick={addNominee}
                                        className="h-5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[8px] font-black flex items-center gap-1 transition-colors uppercase">
                                        <Plus size={9} /> Add Nominee
                                    </button>
                                </div>
                                <Table columns={nomineeColumns} dataSource={nomineeData} pagination={false}
                                    size="small" className="fd-nom-table" rowKey="key" scroll={{ y: 100 }}
                                    locale={{ emptyText: <span className="text-[9px] text-slate-400 py-3 block text-center font-bold uppercase">Click "Add Nominee" to add</span> }} />
                            </div>

                            {/* Mode of Receipt */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                                <div className="px-2.5 py-1 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <Building2 size={11} className="text-slate-400" />
                                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Mode of Receipt</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                                        <span className="text-[8px] font-black text-slate-500 uppercase">{formData.paymentMode === 'bank' ? 'Bank Bal' : 'Cash Bal'}</span>
                                        <span className={`text-[9px] font-black ${bankBalance < 0 ? 'text-rose-600' : 'text-slate-700'}`}>₹{bankBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                                <div className="p-2 space-y-1.5">
                                    <div className="flex gap-2">
                                        {['cash','bank'].map(mode => (
                                            <button key={mode} onClick={() => updateField('paymentMode', mode)}
                                                className={`h-7 px-4 rounded-lg text-[9px] font-black uppercase tracking-wide transition-all border ${
                                                    formData.paymentMode === mode
                                                        ? mode === 'cash' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-blue-600 text-white border-blue-500'
                                                        : 'bg-white text-slate-500 border-slate-300 hover:border-slate-400'
                                                }`}>
                                                {mode.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                    {formData.paymentMode === 'bank' && (
                                        <div className="space-y-2 pt-2 border-t border-slate-100">
                                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Cheque Details</p>
                                            <div className="grid grid-cols-2 gap-x-3">
                                                <div>
                                                    <label className={labelCls}>Date</label>
                                                    <Input value={dayjs().format('DD-MMM-YY')} readOnly className={roInputCls} />
                                                </div>
                                                <div>
                                                    <label className={labelCls}>Cheque No</label>
                                                    <Input value={formData.chequeNo} onChange={e => updateField('chequeNo', e.target.value)}
                                                        placeholder="Cheque No..." className={inputCls} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className={labelCls}>Bank</label>
                                                <Select value={formData.bankCode || undefined} onChange={v => updateField('bankCode', v)}
                                                    className="w-full fd-sm-select" style={{ height: 24 }} placeholder="Select bank..." showSearch optionFilterProp="children">
                                                    {bankHeads.map(b => <Option key={b.code} value={b.code}>{b.code} — {b.name}</Option>)}
                                                </Select>
                                            </div>
                                            <div>
                                                <label className={labelCls}>Customer's Bank</label>
                                                <Input value={formData.customerBankName} onChange={e => updateField('customerBankName', e.target.value)}
                                                    placeholder="Customer's bank..." className={inputCls} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="px-3 py-1.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-1.5">
                        <Building2 size={9} className="text-slate-400" />
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-wide">Fixed Deposit Receipt</span>
                        {formData.memberNo && (
                            <>
                                <div className="w-px h-2.5 bg-slate-300" />
                                <span className="text-[8px] font-black text-indigo-500">Member: {formData.memberNo}</span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-1 text-indigo-500">
                        <Calendar size={9} />
                        <span className="text-[8px] font-black uppercase tracking-wide">{dayjs().format('DD-MMM-YY')}</span>
                    </div>
                </div>

            </div>

            {/* Member Lookup */}
            <Modal open={showLookupModal} onCancel={() => setShowLookupModal(false)} footer={null}
                width={900} centered styles={{ body: { padding: 0 } }} destroyOnClose>
                <MemberLookup isModal={true} onClose={() => setShowLookupModal(false)}
                    onSelect={member => {
                        updateField('memberNo', member.memberNo.toString());
                        updateField('firstName', member.memberName?.split(' ')[0] || '');
                        setShowLookupModal(false);
                    }} />
            </Modal>

            {/* Reference Member Lookup */}
            <Modal open={showRefLookup} onCancel={() => setShowRefLookup(false)} footer={null}
                width={900} centered styles={{ body: { padding: 0 } }} destroyOnClose>
                <MemberLookup isModal={true} onClose={() => setShowRefLookup(false)}
                    onSelect={member => {
                        updateField('referenceMemberNo', member.memberNo.toString());
                        setShowRefLookup(false);
                    }} />
            </Modal>

            <style>{`
                .fd-sm-select .ant-select-selector { height: 24px !important; min-height: 24px !important; font-size: 11px !important; font-weight: 600 !important; }
                .fd-sm-select .ant-select-selection-item { line-height: 22px !important; font-size: 11px !important; }
                .fd-sm-select .ant-select-selection-placeholder { line-height: 22px !important; font-size: 9px !important; color: #94a3b8 !important; }
                .fd-nom-table .ant-table-thead > tr > th { background: #f8fafc !important; padding: 3px 10px !important; border-bottom: 1px solid #e2e8f0 !important; }
                .fd-nom-table .ant-table-tbody > tr > td { padding: 2px 10px !important; border-bottom: 1px solid #f1f5f9 !important; }
                .ant-picker-input > input { font-size: 11px !important; font-weight: 600 !important; }
                .ant-input::placeholder { font-size: 9px !important; color: #94a3b8 !important; }
                input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
                input[type=number] { -moz-appearance: textfield; }
            `}</style>
        </ConfigProvider>
    );
};

export default FixedDepositForm;
