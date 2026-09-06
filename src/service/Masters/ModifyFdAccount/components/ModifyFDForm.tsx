// components/ModifyFDForm.tsx

import React from 'react';
import { ConfigProvider, Input, Select, DatePicker } from 'antd';
import {
    Edit3, ShieldCheck, Building2, Save, RotateCcw, X,
    Landmark, Users, Calendar, Hash,
    IndianRupee
} from 'lucide-react';
import dayjs from 'dayjs';
import type { ModifyFDHookReturn } from '../interfaces/interface';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';

const { Option } = Select;

const labelCls = "block fz-tiny font-black text-slate-500 uppercase tracking-wider mb-0.5";
const inputCls = "h-7 fz-caption font-semibold bg-white border-slate-300 rounded";

const RELATIONS = ['Son', 'Daughter', 'Wife', 'Husband', 'Father', 'Mother', 'Brother', 'Sister', 'Grandson', 'Granddaughter', 'Other'];

const ModifyFDForm: React.FC<ModifyFDHookReturn> = ({
    data,
    handleFdSelect,
    updateField,
    updateNominee,
    save,
    reset
}) => {
    const handleExit = () => {
        if ((window as any).electron?.ipcRenderer) {
            (window as any).electron.ipcRenderer.send('window-close');
        }
    };

    usePageToolbarActions({
        onSave: save,
        saveLabel: 'Save',
    });

    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#6366f1', borderRadius: 6 } }}>
            <div className="modifyfd-form h-screen flex flex-col bg-[#f5f6fa] font-sans overflow-hidden text-slate-900">

                {/* Header */}
                <div className="modifyfd-header bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-3 py-2 flex items-center justify-between shrink-0 shadow-lg">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg border border-indigo-400/50 bg-indigo-600">
                            <Edit3 size={13} className="text-white" />
                        </div>
                        <div>
                            <h1 className="fz-caption font-black text-white tracking-wider uppercase leading-none">Modify Fixed Deposit</h1>
                            <p className="fz-micro font-bold text-indigo-300 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                <ShieldCheck size={7} className="text-indigo-400" /> fdmaster — Edit & Update
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button onClick={reset} className="h-7 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-white/20 uppercase tracking-wide">
                            <RotateCcw size={11} /> Revert
                        </button>
                        <button onClick={save} className="h-7 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-indigo-400 shadow-lg uppercase tracking-wide">
                            <Save size={11} /> Save
                        </button>
                        <div className="h-4 w-px bg-white/20" />
                        <button onClick={handleExit} className="h-7 px-3 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-rose-500/30 uppercase tracking-wide">
                            <X size={11} /> Exit
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto">
                    <div className="max-w-4xl mx-auto p-3 pb-4 space-y-2">

                        {/* ── Account Selection ── */}
                        <div className="modifyfd-card bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                                <Landmark size={11} className="text-slate-400" />
                                <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Account Selection</span>
                                {data.allFdAccounts.length > 0 && (
                                    <span className="ml-auto fz-mini font-black text-slate-400 uppercase tracking-wide">
                                        {data.allFdAccounts.length} FD accounts
                                    </span>
                                )}
                            </div>
                            <div className="p-3 space-y-2">
                                {/* Select FD */}
                                <div>
                                    <label className={labelCls}>
                                        Select FD Account
                                        {data.selectFD && (
                                            <span className="ml-2 text-indigo-600 normal-case font-black">
                                                — A/C #{data.selectFD}
                                            </span>
                                        )}
                                    </label>
                                    <Select
                                        value={data.selectFD || undefined}
                                        onChange={handleFdSelect}
                                        placeholder="Search and select FD account..."
                                        className="w-full"
                                        style={{ height: 28 }}
                                        showSearch
                                        optionFilterProp="children"
                                        loading={data.allFdAccounts.length === 0}
                                        notFoundContent={
                                            <span className="fz-tiny text-slate-400">No FD accounts found</span>
                                        }
                                    >
                                        {data.allFdAccounts.map(acc => (
                                            <Option key={acc.accountNumber} value={acc.accountNumber}>
                                                <span className="fz-small font-bold">{acc.label}</span>
                                            </Option>
                                        ))}
                                    </Select>
                                </div>

                                {/* Name row */}
                                <div>
                                    <label className={labelCls}>Account Holder Name</label>
                                    <div className="grid grid-cols-[80px_1fr_1fr_1fr] gap-2">
                                        <div>
                                            <span className="fz-mini font-black text-slate-400 uppercase tracking-wide">Prefix</span>
                                            <Select value={data.prefix || undefined} onChange={v => updateField('prefix', v)}
                                                className="w-full mt-0.5" style={{ height: 28 }} placeholder="—">
                                                <Option value="Mr.">Mr.</Option>
                                                <Option value="Mrs.">Mrs.</Option>
                                                <Option value="Ms.">Ms.</Option>
                                                <Option value="Dr.">Dr.</Option>
                                            </Select>
                                        </div>
                                        <div>
                                            <span className="fz-mini font-black text-slate-400 uppercase tracking-wide">First</span>
                                            <Input value={data.firstName} onChange={e => updateField('firstName', e.target.value)}
                                                className={`${inputCls} mt-0.5`} placeholder="First name" />
                                        </div>
                                        <div>
                                            <span className="fz-mini font-black text-slate-400 uppercase tracking-wide">Middle</span>
                                            <Input value={data.middleName} onChange={e => updateField('middleName', e.target.value)}
                                                className={`${inputCls} mt-0.5`} placeholder="Middle name" />
                                        </div>
                                        <div>
                                            <span className="fz-mini font-black text-slate-400 uppercase tracking-wide">Last</span>
                                            <Input value={data.lastName} onChange={e => updateField('lastName', e.target.value)}
                                                className={`${inputCls} mt-0.5`} placeholder="Last name" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── FD Details ── */}
                        <div className="modifyfd-card bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                                <Hash size={11} className="text-slate-400" />
                                <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">FD Details</span>
                                {data.selectFD && (
                                    <span className="ml-auto fz-mini font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                        A/c #{data.selectFD}
                                    </span>
                                )}
                            </div>
                            <div className="p-3 grid grid-cols-4 gap-x-4 gap-y-2">

                                {/* Row 1 */}
                                <div>
                                    <label className={labelCls}>Certificate No.</label>
                                    <div className="relative">
                                        <Hash size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <Input value={data.certificateNo}
                                            onChange={e => updateField('certificateNo', e.target.value)}
                                            className={`${inputCls} pl-6 font-bold text-indigo-700`}
                                            placeholder="Cert no..." />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Deposit Date</label>
                                    <DatePicker
                                        value={data.depositDate ? dayjs(data.depositDate) : null}
                                        onChange={d => updateField('depositDate', d ? d.format('YYYY-MM-DD') : '')}
                                        format="DD-MMM-YY"
                                        className="w-full h-7 fz-caption" />
                                </div>
                                <div>
                                    <label className={labelCls}>Rate (%)</label>
                                    <Input value={data.rate} onChange={e => updateField('rate', e.target.value)}
                                        className={`${inputCls} text-center font-bold text-indigo-700`}
                                        placeholder="0.00" />
                                </div>
                                <div>
                                    <label className={labelCls}>Deposit Unit</label>
                                    <Select value={data.depositUnit || undefined}
                                        onChange={v => updateField('depositUnit', v)}
                                        className="w-full" style={{ height: 28 }} placeholder="Select unit">
                                        <Option value="1">Months</Option>
                                        <Option value="2">Years</Option>
                                        <Option value="3">Days</Option>
                                    </Select>
                                </div>

                                {/* Row 2 */}
                                <div>
                                    <label className={labelCls}>Deposit Period</label>
                                    <Input value={data.depositPeriod}
                                        onChange={e => updateField('depositPeriod', e.target.value)}
                                        className={`${inputCls} text-center`}
                                        placeholder="e.g. 12" />
                                </div>
                                <div>
                                    <label className={labelCls}>Maturity Date</label>
                                    <DatePicker
                                        value={data.maturityDate ? dayjs(data.maturityDate) : null}
                                        onChange={d => updateField('maturityDate', d ? d.format('YYYY-MM-DD') : '')}
                                        format="DD-MMM-YY"
                                        className="w-full h-7 fz-caption" />
                                </div>
                                <div className="col-span-2">
                                    <label className={labelCls}>Mode of Payment (Interest)</label>
                                    <Select value={data.modeOfPayment || undefined}
                                        onChange={v => updateField('modeOfPayment', v)}
                                        className="w-full" style={{ height: 28 }} placeholder="Select mode">
                                        <Option value="1">On Maturity</Option>
                                        <Option value="2">Monthly</Option>
                                        <Option value="3">Quarterly</Option>
                                        <Option value="4">Half Yearly</Option>
                                        <Option value="5">Yearly</Option>
                                    </Select>
                                </div>

                                {/* Row 3 */}
                                <div>
                                    <label className={labelCls}>FD Amount</label>
                                    <div className="relative">
                                        <IndianRupee size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <Input value={data.fdAmount}
                                            onChange={e => updateField('fdAmount', e.target.value)}
                                            className={`${inputCls} pl-6 text-right font-bold text-slate-700`}
                                            placeholder="0.00" />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Maturity Amount</label>
                                    <div className="relative">
                                        <IndianRupee size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <Input value={data.maturityAmount}
                                            onChange={e => updateField('maturityAmount', e.target.value)}
                                            className={`${inputCls} pl-6 text-right font-bold text-emerald-700`}
                                            placeholder="0.00" />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Int. Amount</label>
                                    <div className="relative">
                                        <IndianRupee size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <Input value={data.intAmount}
                                            onChange={e => updateField('intAmount', e.target.value)}
                                            className={`${inputCls} pl-6 text-right`}
                                            placeholder="0.00" />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Interest Balance</label>
                                    <div className="relative">
                                        <IndianRupee size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <Input value={data.interestBalance}
                                            onChange={e => updateField('interestBalance', e.target.value)}
                                            className={`${inputCls} pl-6 text-right`}
                                            placeholder="0.00" />
                                    </div>
                                </div>

                                {/* Row 4 */}
                                <div>
                                    <label className={labelCls}>Interest Paid</label>
                                    <div className="relative">
                                        <IndianRupee size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <Input value={data.interestPaid}
                                            onChange={e => updateField('interestPaid', e.target.value)}
                                            className={`${inputCls} pl-6 text-right`}
                                            placeholder="0.00" />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Last Int. Payment Date</label>
                                    <DatePicker
                                        value={data.lastIntPaymentDate ? dayjs(data.lastIntPaymentDate) : null}
                                        onChange={d => updateField('lastIntPaymentDate', d ? d.format('YYYY-MM-DD') : '')}
                                        format="DD-MMM-YY"
                                        className="w-full h-7 fz-caption" />
                                </div>
                                <div>
                                    <label className={labelCls}>Status</label>
                                    <Select value={data.status || undefined}
                                        onChange={v => updateField('status', v)}
                                        className="w-full" style={{ height: 28 }} placeholder="Select status">
                                        <Option value="0">Active</Option>
                                        <Option value="1">Matured</Option>
                                        <Option value="2">Closed</Option>
                                        <Option value="A">Active (legacy code)</Option>
                                        <Option value="C">Closed (legacy code)</Option>
                                    </Select>
                                </div>

                            </div>
                        </div>

                        {/* ── Nominee Details ── */}
                        <div className="modifyfd-card bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                                <Users size={11} className="text-slate-400" />
                                <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Nominee Details</span>
                                <span className="ml-auto fz-mini font-bold text-slate-400 normal-case tracking-normal">fdmaster supports one nominee per account</span>
                            </div>
                            <div className="p-3 grid grid-cols-4 gap-x-4 gap-y-2">
                                <div>
                                    <label className={labelCls}>Name</label>
                                    <Input value={data.nominee.name}
                                        onChange={e => updateNominee('name', e.target.value)}
                                        className={inputCls} placeholder="Full name" />
                                </div>
                                <div className="col-span-2">
                                    <label className={labelCls}>Address</label>
                                    <Input value={data.nominee.address}
                                        onChange={e => updateNominee('address', e.target.value)}
                                        className={inputCls} placeholder="Address" />
                                </div>
                                <div>
                                    <label className={labelCls}>Age</label>
                                    <Input value={data.nominee.age}
                                        onChange={e => updateNominee('age', e.target.value)}
                                        className={inputCls} placeholder="Age" />
                                </div>
                                <div>
                                    <label className={labelCls}>Relation</label>
                                    <Select value={data.nominee.relation || undefined}
                                        onChange={v => updateNominee('relation', v)}
                                        className="w-full" style={{ height: 28 }} placeholder="Select relation">
                                        {RELATIONS.map(r => <Option key={r} value={r}>{r}</Option>)}
                                    </Select>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="modifyfd-footer px-3 py-1.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-1.5">
                        <Building2 size={9} className="text-slate-400" />
                        <span className="fz-mini font-black text-slate-500 uppercase tracking-wide">Modify FD Registry</span>
                        {data.selectFD && (
                            <>
                                <div className="w-px h-2.5 bg-slate-300" />
                                <span className="fz-mini font-black text-indigo-500 uppercase tracking-wide">A/C #{data.selectFD}</span>
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

                /* ── Modify FD Account — dark mode ── */
                html.dark .modifyfd-form { background-color: #000000 !important; color: #f5f5f7 !important; }
                html.dark .modifyfd-header { background-image: none !important; background-color: #0c0c0e !important; }
                html.dark .modifyfd-card { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
                html.dark .modifyfd-card .border-slate-100 { border-color: rgba(255,255,255,.08) !important; }
                html.dark .modifyfd-footer { background-color: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; }

                html.dark .modifyfd-form label,
                html.dark .modifyfd-form span.fz-mini,
                html.dark .modifyfd-form span.fz-tiny { color: #8e8e93 !important; }
                html.dark .modifyfd-form .text-slate-500 { color: #8e8e93 !important; }
                html.dark .modifyfd-form .text-slate-400 { color: #71717a !important; }
                html.dark .modifyfd-form .text-slate-700 { color: #f5f5f7 !important; }
                html.dark .modifyfd-form .text-slate-900 { color: #f5f5f7 !important; }

                html.dark .modifyfd-form .ant-input,
                html.dark .modifyfd-form .ant-select-selector,
                html.dark .modifyfd-form .ant-picker,
                html.dark .modifyfd-form textarea {
                    background-color: rgba(255,255,255,.05) !important;
                    color: #f5f5f7 !important;
                    border-color: rgba(255,255,255,.08) !important;
                }
                html.dark .modifyfd-form .ant-input::placeholder { color: #71717a !important; }
                html.dark .modifyfd-form .ant-picker-input > input { color: #f5f5f7 !important; }
                html.dark .modifyfd-form .ant-picker svg { fill: #8e8e93 !important; }
                html.dark .modifyfd-form .ant-select-selection-item { color: #f5f5f7 !important; }
                html.dark .modifyfd-form .ant-select-arrow { color: #8e8e93 !important; }
                html.dark .modifyfd-form .ant-select-dropdown { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }

                html.dark .modifyfd-form .bg-slate-50 { background-color: rgba(255,255,255,.03) !important; }
                html.dark .modifyfd-form .bg-slate-100 { background-color: rgba(255,255,255,.05) !important; }
                html.dark .modifyfd-form .border-slate-200,
                html.dark .modifyfd-form .border-slate-300 { border-color: rgba(255,255,255,.08) !important; }
                html.dark .modifyfd-form .bg-white:not(.modifyfd-card):not(.modifyfd-footer) { background-color: rgba(255,255,255,.05) !important; }
                html.dark .modifyfd-form .bg-slate-300 { background-color: rgba(255,255,255,.08) !important; }

                html.dark .modifyfd-form .bg-emerald-50 { background-color: rgba(52,211,153,.15) !important; }
                html.dark .modifyfd-form .text-emerald-600 { color: #34d399 !important; }
                html.dark .modifyfd-form .text-indigo-600,
                html.dark .modifyfd-form .text-indigo-500 { color: #818cf8 !important; }
            `}</style>
        </ConfigProvider>
    );
};

export default ModifyFDForm;
