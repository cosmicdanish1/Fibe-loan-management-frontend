// components/LoanEntryForm.tsx

import React, { useEffect, useRef, useState } from 'react';
import { ConfigProvider, Input, DatePicker, Select, Modal } from 'antd';
import {
    IndianRupee, Save, RotateCcw, X, ShieldCheck,
    Building2, Hash, Users, Search, TrendingDown, Calendar,
} from 'lucide-react';
import dayjs from 'dayjs';
import { LoanEntryHookReturn } from '../interface/LoanEntryInterfaces';
import MemberLookup from '../../../../../components/shared/MemberLookup/MemberLookup';
import { usePageToolbarActions } from '../../../../../utils/pageToolbarActions';

const { Option } = Select;
const { TextArea } = Input;

const labelCls = "block fz-tiny font-black text-slate-500 uppercase tracking-wider mb-0.5";
const inputCls = "h-7 fz-caption font-semibold bg-white border-slate-300 rounded";

const LOAN_TYPES = [
    { id: 'ALN', label: 'Advance Loan (ALN)' },
    { id: 'RLN', label: 'Regular Loan (RLN)' },
    { id: 'ELN', label: 'Emergency Loan (ELN)' },
];

type LookupTarget = 'member' | 'g1' | 'g2' | null;

const MemberField: React.FC<{
    label: string;
    valueNo: string;
    valueName: string;
    onNoChange: (v: string) => void;
    onSearch: () => void;
}> = ({ label, valueNo, valueName, onNoChange, onSearch }) => (
    <div>
        <label className={labelCls}>{label}</label>
        <div className="flex gap-1">
            <div className="relative flex-1">
                <Hash size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input value={valueNo} onChange={e => onNoChange(e.target.value)}
                    placeholder="Member no…"
                    className={`${inputCls} pl-6 font-mono`} />
            </div>
            <button onClick={onSearch}
                className="h-7 w-7 bg-slate-100 hover:bg-indigo-600 hover:text-white rounded text-slate-500 flex items-center justify-center transition-colors shrink-0">
                <Search size={12} />
            </button>
        </div>
        {valueName && (
            <div className="flex items-center gap-1 mt-1">
                <Users size={9} className="text-indigo-400" />
                <span className="fz-tiny font-black text-indigo-700">{valueName}</span>
            </div>
        )}
    </div>
);

const LoanEntryForm: React.FC<LoanEntryHookReturn> = ({
    formData, updateField,
    handleMemberSelect, handleG1Select, handleG2Select,
    handleSave, handleClear, handleExit,
    isLoading, eligibilityStatus, isCheckingEligibility,
}) => {
    const [lookupTarget, setLookupTarget] = useState<LookupTarget>(null);

    const onMemberSelected = (member: any) => {
        const no = String(member.memberNo || member.mbno || '');
        const name = member.memberName || member.fullname || '';
        const d = { memberNo: no, memberName: name };
        if (lookupTarget === 'member') handleMemberSelect(no, d);
        else if (lookupTarget === 'g1') handleG1Select(no, d);
        else if (lookupTarget === 'g2') handleG2Select(no, d);
        setLookupTarget(null);
    };

    usePageToolbarActions({
        onSave: handleSave,
        saveLabel: isLoading ? 'Saving…' : 'Save',
        saveEnabled: !(isLoading || isCheckingEligibility || (eligibilityStatus && !eligibilityStatus.isEligible)),
    });

    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#6366f1', borderRadius: 6 } }}>
            <div className="h-screen flex flex-col bg-[#f5f6fa] font-sans overflow-hidden text-slate-900">

                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-3 py-2 flex items-center justify-between shrink-0 shadow-lg">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg border border-indigo-400/50 bg-indigo-600">
                            <TrendingDown size={13} className="text-white" />
                        </div>
                        <div>
                            <h1 className="fz-caption font-black text-white tracking-wider uppercase leading-none">Loan Entry</h1>
                            <p className="fz-micro font-bold text-indigo-300 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                <ShieldCheck size={7} className="text-indigo-400" /> loan_master + suretymaster
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button onClick={handleClear} className="h-7 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-white/20 uppercase tracking-wide">
                            <RotateCcw size={11} /> Clear
                        </button>
                        <button onClick={handleSave} disabled={isLoading || isCheckingEligibility || (eligibilityStatus && !eligibilityStatus.isEligible) ? true : false}
                            className={`h-7 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-indigo-400 shadow-lg uppercase tracking-wide ${(isLoading || isCheckingEligibility || (eligibilityStatus && !eligibilityStatus.isEligible)) ? 'opacity-60 cursor-not-allowed' : ''}`}>
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

                        {/* ── Member + Loan Type ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                                <Users size={11} className="text-slate-400" />
                                <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Member & Loan Type</span>
                            </div>
                            <div className="p-3 grid grid-cols-2 gap-x-4 gap-y-2">
                                <MemberField label="Member No." valueNo={formData.memberNo} valueName={formData.memberName}
                                    onNoChange={v => updateField('memberNo', v)}
                                    onSearch={() => setLookupTarget('member')} />
                                <div>
                                    <label className={labelCls}>Loan Type</label>
                                    <Select value={formData.loanType || undefined}
                                        onChange={v => updateField('loanType', v)}
                                        className="w-full" style={{ height: 28 }}
                                        placeholder="Select loan type">
                                        {LOAN_TYPES.map(t => (
                                            <Option key={t.id} value={t.id}>{t.label}</Option>
                                        ))}
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* ── Eligibility Panel (Visible if loanAmount > 5L) ── */}
                        {(isCheckingEligibility || eligibilityStatus) && (
                            <div className={`bg-white rounded-xl border shadow-sm ${eligibilityStatus && !eligibilityStatus.isEligible ? 'border-rose-200' : 'border-emerald-200'}`}>
                                <div className={`px-3 py-1.5 border-b flex items-center justify-between ${eligibilityStatus && !eligibilityStatus.isEligible ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                                    <div className="flex items-center gap-1.5">
                                        <ShieldCheck size={11} className={eligibilityStatus && !eligibilityStatus.isEligible ? 'text-rose-500' : 'text-emerald-500'} />
                                        <span className={`fz-mini font-black uppercase tracking-widest ${eligibilityStatus && !eligibilityStatus.isEligible ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            5% Eligibility Rules
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {isCheckingEligibility ? (
                                            <span className="fz-tiny font-bold text-slate-500 flex items-center gap-1">
                                                <RotateCcw size={10} className="animate-spin" /> Checking...
                                            </span>
                                        ) : eligibilityStatus?.isEligible ? (
                                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 fz-mini font-black uppercase tracking-widest border border-emerald-200">
                                                Eligible
                                            </span>
                                        ) : (
                                            <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 fz-mini font-black uppercase tracking-widest border border-rose-200">
                                                Not Eligible
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {eligibilityStatus && (
                                    <div className="p-3">
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Share Value Box */}
                                            <div className="bg-slate-50 border border-slate-200 p-2 rounded relative">
                                                <div className="fz-tiny font-bold text-slate-500 uppercase mb-1">Share Requirements</div>
                                                <div className="flex justify-between fz-caption">
                                                    <span className="text-slate-600">Current Share:</span>
                                                    <span className="font-mono font-bold">₹{eligibilityStatus.currentShare.toLocaleString('en-IN')}</span>
                                                </div>
                                                <div className="flex justify-between fz-caption mt-0.5">
                                                    <span className="text-slate-600">Required (5%):</span>
                                                    <span className="font-mono font-bold text-indigo-600">₹{eligibilityStatus.requiredShare.toLocaleString('en-IN')}</span>
                                                </div>
                                                {eligibilityStatus.additionalShareRequired > 0 && (
                                                    <div className="mt-1 pt-1 border-t border-rose-200 flex justify-between fz-caption">
                                                        <span className="text-rose-600 font-bold">Shortfall:</span>
                                                        <span className="font-mono font-black text-rose-600">₹{eligibilityStatus.additionalShareRequired.toLocaleString('en-IN')}</span>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* FD Balance Box */}
                                            <div className="bg-slate-50 border border-slate-200 p-2 rounded relative">
                                                <div className="fz-tiny font-bold text-slate-500 uppercase mb-1">FD Requirements</div>
                                                <div className="flex justify-between fz-caption">
                                                    <span className="text-slate-600">Current FD:</span>
                                                    <span className="font-mono font-bold">₹{eligibilityStatus.currentFd.toLocaleString('en-IN')}</span>
                                                </div>
                                                <div className="flex justify-between fz-caption mt-0.5">
                                                    <span className="text-slate-600">Required (5%):</span>
                                                    <span className="font-mono font-bold text-indigo-600">₹{eligibilityStatus.requiredFd.toLocaleString('en-IN')}</span>
                                                </div>
                                                {eligibilityStatus.additionalFdRequired > 0 && (
                                                    <div className="mt-1 pt-1 border-t border-rose-200 flex justify-between fz-caption">
                                                        <span className="text-rose-600 font-bold">Shortfall:</span>
                                                        <span className="font-mono font-black text-rose-600">₹{eligibilityStatus.additionalFdRequired.toLocaleString('en-IN')}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Loan Details ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                                <IndianRupee size={11} className="text-slate-400" />
                                <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Loan Details</span>
                            </div>
                            <div className="p-3 grid grid-cols-3 gap-x-4 gap-y-2">

                                <div>
                                    <label className={labelCls}>Loan Amount</label>
                                    <div className="relative">
                                        <IndianRupee size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <Input type="number" value={formData.loanAmount}
                                            onChange={e => updateField('loanAmount', e.target.value)}
                                            placeholder="0.00"
                                            className={`${inputCls} pl-6 text-right font-bold text-slate-700`} />
                                    </div>
                                </div>

                                <div>
                                    <label className={labelCls}>Interest Rate (%)</label>
                                    <Input type="number" value={formData.rate}
                                        onChange={e => updateField('rate', e.target.value)}
                                        placeholder="12.00"
                                        className={`${inputCls} text-center font-bold text-indigo-700`} />
                                </div>

                                <div>
                                    <label className={labelCls}>No. of Installments</label>
                                    <Input type="number" value={formData.noOfInstal}
                                        onChange={e => updateField('noOfInstal', e.target.value)}
                                        placeholder="60"
                                        className={`${inputCls} text-center`} />
                                </div>

                                <div>
                                    <label className={labelCls}>Installment Amount</label>
                                    <div className="relative">
                                        <IndianRupee size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <Input type="number" value={formData.instalAmt}
                                            onChange={e => updateField('instalAmt', e.target.value)}
                                            placeholder="0.00"
                                            className={`${inputCls} pl-6 text-right font-bold text-emerald-700`} />
                                    </div>
                                </div>

                                <div>
                                    <label className={labelCls}>Payment Date</label>
                                    <DatePicker
                                        value={formData.paymentDate ? dayjs(formData.paymentDate) : null}
                                        onChange={d => updateField('paymentDate', d ? d.format('YYYY-MM-DD') : '')}
                                        format="DD-MMM-YY"
                                        className="w-full h-7 fz-caption" />
                                </div>

                                <div>
                                    <label className={labelCls}>Penal Rate (%)</label>
                                    <Input type="number" value={formData.penalRate}
                                        onChange={e => updateField('penalRate', e.target.value)}
                                        placeholder="2.00"
                                        className={`${inputCls} text-center`} />
                                </div>

                                <div className="col-span-3">
                                    <label className={labelCls}>Purpose</label>
                                    <TextArea value={formData.purpose}
                                        onChange={e => updateField('purpose', e.target.value)}
                                        placeholder="Enter loan purpose…"
                                        rows={2}
                                        className="fz-small font-medium bg-slate-50 border-slate-200 rounded resize-none" />
                                </div>

                            </div>
                        </div>

                        {/* ── Guarantors ── */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                                <Users size={11} className="text-slate-400" />
                                <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Guarantors (Surety)</span>
                            </div>
                            <div className="p-3 grid grid-cols-2 gap-x-4 gap-y-2">
                                <MemberField label="Guarantor 1 (G1)"
                                    valueNo={formData.g1MbNo} valueName={formData.g1Name}
                                    onNoChange={v => updateField('g1MbNo', v)}
                                    onSearch={() => setLookupTarget('g1')} />
                                <MemberField label="Guarantor 2 (G2)"
                                    valueNo={formData.g2MbNo} valueName={formData.g2Name}
                                    onNoChange={v => updateField('g2MbNo', v)}
                                    onSearch={() => setLookupTarget('g2')} />
                            </div>
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="px-3 py-1.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-1.5">
                        <Building2 size={9} className="text-slate-400" />
                        <span className="fz-mini font-black text-slate-500 uppercase tracking-wide">
                            {LOAN_TYPES.find(t => t.id === formData.loanType)?.label || 'Loan Entry'}
                        </span>
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

            {/* Member Lookup Modal */}
            <Modal open={lookupTarget !== null} onCancel={() => setLookupTarget(null)}
                footer={null} width={900} centered styles={{ body: { padding: 0 } }} destroyOnClose>
                <MemberLookup isModal onSelect={onMemberSelected} onClose={() => setLookupTarget(null)} />
            </Modal>

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

export default LoanEntryForm;
