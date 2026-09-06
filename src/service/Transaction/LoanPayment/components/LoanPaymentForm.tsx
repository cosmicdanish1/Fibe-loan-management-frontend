// components/LoanPaymentForm.tsx

import React from 'react';
import { ConfigProvider, Input, Select, DatePicker, Modal } from 'antd';
import {
    Banknote, RotateCcw, Save, X, ShieldCheck, Building2,
    Calendar, FileText, IndianRupee, Hash, CreditCard, Plus, Trash2,
} from 'lucide-react';
import { LoanPaymentHookReturn, PaymentEntry } from '../interface/LoanPaymentInterfaces';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';
import dayjs from 'dayjs';

const { Option } = Select;

const lbl = "block fz-mini font-black text-slate-500 uppercase tracking-wider mb-0.5";
const inp = "h-6 fz-small font-semibold bg-white border-slate-300 rounded";
const roInp = "h-6 fz-small font-semibold bg-slate-50 border-slate-200 rounded text-slate-600";

const LoanPaymentForm: React.FC<LoanPaymentHookReturn> = ({
    formData, modalData, loanCases, isLoadingCases,
    actualAmount, bankBalance, totalReceipt, totalPayment,
    data, headList, bankList,
    updateField, updateModalField, handleLoanCaseChange,
    openSanctionWindow, closeModal, handleModalSave,
    handleSave, handleReset, handleExit,
    addVoucherEntry, updateVoucherEntry, removeVoucherEntry,
}) => {
    // BUG FIX: was a flat sanctionAmount/installments split (no interest at all) —
    // purely cosmetic, since the actual EMI that gets stored to loan_master.instal_amt
    // and used by real repayment (voucher.service.ts's generateLoanVoucher) already
    // uses a proper reducing-balance formula. But showing the wrong figure here before
    // disbursement is misleading to the operator (e.g. a real ₹10,000/60mo/12.5% loan
    // showed ₹166.67 here vs the ₹224.98 actually charged) — mirror the same formula so
    // the preview matches what will actually be posted.
    const installmentAmt = (() => {
        const principal = parseFloat(formData.sanctionLoanAmount) || 0;
        const n = parseInt(formData.noOfInstallments) || 0;
        if (!principal || !n) return '0.00';
        const annualRate = parseFloat(modalData.rate) || 12;
        const monthlyRate = annualRate / 100 / 12;
        const emi = monthlyRate > 0
            ? (principal * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1)
            : principal / n;
        return emi.toFixed(2);
    })();

    usePageToolbarActions({
        onSave: handleSave,
        saveLabel: 'Save',
    });

    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#6366f1', borderRadius: 6 } }}>
            <div className="lp-root h-screen flex flex-col bg-[#f5f6fa] font-sans overflow-hidden text-slate-900">

                {/* ── Header ── */}
                <div className="lp-header bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-3 py-2 flex items-center justify-between shrink-0 shadow-lg">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg border border-indigo-400/50 bg-indigo-600">
                            <CreditCard size={13} className="text-white" />
                        </div>
                        <div>
                            <h1 className="fz-caption font-black text-white tracking-wider uppercase leading-none">Loan Payment</h1>
                            <p className="fz-micro font-bold text-indigo-300 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                <ShieldCheck size={7} className="text-indigo-400" /> Loan Disbursement
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button onClick={handleReset} className="h-7 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-white/20 uppercase tracking-wide">
                            <RotateCcw size={11} /> Reset
                        </button>
                        <button onClick={handleSave} className="h-7 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-indigo-400 shadow-lg uppercase tracking-wide">
                            <Save size={11} /> Save
                        </button>
                        <div className="h-4 w-px bg-white/20" />
                        <button onClick={handleExit} className="h-7 px-3 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-rose-500/30 uppercase tracking-wide">
                            <X size={11} /> Exit
                        </button>
                    </div>
                </div>

                {/* ── Body (no scroll — table fills remaining space) ── */}
                <div className="flex-1 flex flex-col min-h-0 p-2 gap-1.5">

                    {/* 1. Loan Case */}
                    <div className="bg-white rounded-lg border border-slate-200 shadow-md shrink-0">
                        <div className="px-2 py-0.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center gap-1.5">
                            <Hash size={9} className="text-indigo-400" />
                            <span className="fz-mini font-black text-slate-600 uppercase tracking-widest">Loan Case</span>
                        </div>
                        <div className="px-2 py-1.5 flex items-center gap-2">
                            <div className="shrink-0 w-40">
                                <label className={lbl}>Loan Type</label>
                                <Select value={modalData.loanType || undefined} onChange={(val: string) => updateModalField('loanType', val)}
                                    placeholder="Select..." className="w-full lp-sel" style={{ height: 24 }}>
                                    <Option value="RLN">REGULAR LOAN</Option>
                                    <Option value="ALN">EMERGENCY LOAN</Option>
                                    <Option value="ELN">LOAN AGAINST RECOVERY</Option>
                                </Select>
                            </div>
                            <div className="flex-1">
                                <label className={lbl}>Loan Case No <span className="text-rose-500">*</span></label>
                                <Select showSearch value={formData.loanCaseNo || undefined} onChange={handleLoanCaseChange}
                                    loading={isLoadingCases} placeholder="Select or search loan case..."
                                    className="w-full lp-sel" style={{ height: 24 }} listHeight={300} virtual
                                    filterOption={(input, option) => {
                                        const q = (input || '').toLowerCase();
                                        const loan = loanCases.find(l => l.loanCaseNo === option?.value);
                                        if (!loan) return false;
                                        return String(loan.loanCaseNo).toLowerCase().includes(q)
                                            || String(loan.memberName || '').toLowerCase().includes(q);
                                    }}>
                                    {loanCases.map(loan => (
                                        <Option key={loan.loanCaseNo} value={loan.loanCaseNo}>
                                            <span className="fz-small font-bold text-slate-700">{loan.loanCaseNo}</span>
                                            <span className="fz-tiny text-slate-400 ml-2">{loan.memberName}</span>
                                        </Option>
                                    ))}
                                </Select>
                            </div>
                            {formData.noOfInstallments && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <div className="flex items-center gap-1 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg">
                                        <span className="fz-micro font-black text-indigo-400 uppercase">Inst.</span>
                                        <span className="fz-small font-black text-indigo-700">{formData.noOfInstallments}</span>
                                    </div>
                                    <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg">
                                        <span className="fz-micro font-black text-emerald-400 uppercase">Amt</span>
                                        <span className="fz-small font-black text-emerald-700">₹{installmentAmt}</span>
                                    </div>
                                </div>
                            )}
                            <button onClick={openSanctionWindow} className={`h-6 px-3 rounded-lg fz-mini font-black uppercase tracking-wide flex items-center gap-1 transition-all border shrink-0 ${
                                formData.sanctionLoanAmount
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500'
                            }`}>
                                <ShieldCheck size={10} />
                                {formData.sanctionLoanAmount ? 'Sanctioned' : 'Sanction Loan Amount'}
                            </button>
                        </div>
                    </div>

                    {/* 2. Member Details — compact like legacy */}
                    <div className="bg-white rounded-lg border border-slate-200 shadow-md shrink-0">
                        <div className="px-2 py-0.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center gap-1.5">
                            <Building2 size={9} className="text-indigo-400" />
                            <span className="fz-mini font-black text-slate-600 uppercase tracking-widest">Member</span>
                        </div>
                        <div className="px-2 py-1.5">
                            {/* Row 1: MemberNo, Name, Sanction, Office, SubDiv — like legacy label:value side by side */}
                            <div className="grid grid-cols-12 gap-x-2 gap-y-0.5 items-center">
                                <span className="col-span-1 fz-mini font-black text-purple-700">Member No</span>
                                <span className="col-span-1 fz-small font-black text-blue-700">{formData.memberNo || '—'}</span>
                                <span className="col-span-3 fz-small font-black text-slate-800 truncate">{formData.memberName || '—'}</span>
                                <span className="col-span-1 fz-mini font-black text-purple-700">Sanction</span>
                                <span className="col-span-2 fz-small font-black text-emerald-700">₹{parseFloat(formData.sanctionLoanAmount || '0').toLocaleString('en-IN')}</span>
                                <span className="col-span-1 fz-mini font-black text-purple-700">Office No</span>
                                <span className="col-span-1 fz-small font-semibold text-slate-700">{formData.officeNo || '—'}</span>
                                <span className="col-span-2 fz-small font-semibold text-slate-600 truncate">{formData.subDivision || '—'}</span>
                            </div>
                            {/* Row 2: Head, Loan Type */}
                            <div className="grid grid-cols-12 gap-x-2 items-center mt-1 pt-1 border-t border-slate-100">
                                <span className="col-span-1 fz-mini font-black text-purple-700">Head</span>
                                <span className="col-span-1 fz-small font-black text-blue-700 font-mono">{formData.hCode || '—'}</span>
                                <span className="col-span-3 fz-small font-black text-slate-800">{formData.hName || 'LOAN DISBURSEMENT'}</span>
                                <span className="col-span-1 fz-mini font-black text-purple-700">Loan Type</span>
                                <span className="col-span-2 fz-small font-black text-indigo-700">{modalData.loanType || '—'}</span>
                                <span className="col-span-1 fz-mini font-black text-purple-700">Inst. Amt</span>
                                <span className="col-span-3 fz-small font-black text-slate-700 font-mono">₹{installmentAmt}</span>
                            </div>
                        </div>
                    </div>

                    {/* 3. Mode of Payment — single inline row */}
                    <div className="bg-white rounded-lg border border-slate-200 shadow-md shrink-0">
                        <div className="px-2 py-0.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <Banknote size={9} className="text-indigo-400" />
                                <span className="fz-mini font-black text-slate-600 uppercase tracking-widest">Mode of Payment</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                                    <span className="fz-tiny font-black text-emerald-600 uppercase">Actual Amount</span>
                                    <span className="fz-body font-black text-emerald-700 font-mono">
                                        ₹{(actualAmount > 0 ? actualAmount : parseFloat(formData.sanctionLoanAmount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                                    <span className="fz-micro font-black text-slate-400 uppercase">{formData.paymentMode === 'bank' ? 'Bank Bal' : 'Cash Bal'}</span>
                                    <span className={`fz-tiny font-black ${(bankBalance || 0) < 0 ? 'text-rose-600' : 'text-slate-700'}`}>₹{(bankBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>
                        <div className="px-2 py-1.5 flex items-end gap-3">
                            {/* Toggle */}
                            <div className="shrink-0">
                                <label className={lbl}>Mode</label>
                                <div className="flex gap-1">
                                    {['cash', 'bank'].map(mode => (
                                        <button key={mode} onClick={() => updateField('paymentMode', mode)}
                                            className={`h-6 px-3 rounded-lg fz-mini font-black uppercase tracking-wide transition-all border ${
                                                formData.paymentMode === mode
                                                    ? mode === 'cash' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-blue-600 text-white border-blue-500'
                                                    : 'bg-white text-slate-500 border-slate-300 hover:border-slate-400'
                                            }`}>
                                            {mode.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Date */}
                            <div className="shrink-0">
                                <label className={lbl}>{formData.paymentMode === 'bank' ? 'Cheque Date' : 'Payment Date'}</label>
                                <DatePicker value={formData.chequeDate ? dayjs(formData.chequeDate) : null}
                                    onChange={d => updateField('chequeDate', d)}
                                    className="h-6 w-32 fz-small lp-dp" format="DD-MMM-YY" />
                            </div>
                            {/* Bank-only fields */}
                            {formData.paymentMode === 'bank' && (
                                <>
                                    <div className="shrink-0">
                                        <label className={lbl}>Cheque No</label>
                                        <Input value={formData.chequeNo} onChange={e => updateField('chequeNo', e.target.value)}
                                            placeholder="Cheque no..." className={`${inp} w-32 font-mono`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <label className={lbl}>Bank</label>
                                        <Select showSearch value={formData.bankName || undefined} onChange={val => updateField('bankName', val)}
                                            className="w-full lp-sel" style={{ height: 24 }} placeholder="Select bank account..."
                                            optionFilterProp="label"
                                            options={bankList.map(b => ({ value: b.code, label: b.name }))} />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* 4. Transaction Table — flex-1, fills remaining space */}
                    <div className="bg-white rounded-lg border border-slate-200 shadow-md flex-1 min-h-0 flex flex-col overflow-hidden">
                        <div className="px-2 py-0.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-1.5">
                                <FileText size={9} className="text-indigo-400" />
                                <span className="fz-mini font-black text-slate-600 uppercase tracking-widest">Transaction Breakdown</span>
                                <span className="fz-micro font-black text-slate-400 ml-1">{data.length} row(s)</span>
                            </div>
                            <button onClick={addVoucherEntry}
                                className="h-5 px-2 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 rounded fz-mini font-black uppercase tracking-wide flex items-center gap-1 transition-colors border border-emerald-200">
                                <Plus size={9} /> Add Row
                            </button>
                        </div>
                        <div className="flex-1 min-h-0 overflow-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-slate-50 z-10">
                                    <tr className="border-b border-slate-200">
                                        <th className="py-1 px-2 fz-mini font-black text-slate-500 uppercase tracking-wide w-8 text-center">Sr</th>
                                        <th className="py-1 px-2 fz-mini font-black text-slate-500 uppercase tracking-wide w-24">Code</th>
                                        <th className="py-1 px-2 fz-mini font-black text-slate-500 uppercase tracking-wide">Name</th>
                                        <th className="py-1 px-2 fz-mini font-black text-slate-500 uppercase tracking-wide w-24">R/P</th>
                                        <th className="py-1 px-2 fz-mini font-black text-slate-500 uppercase tracking-wide w-28 text-right">Amount</th>
                                        <th className="py-1 px-2 w-7"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data && data.length > 0 ? data.map((entry: PaymentEntry, index: number) => (
                                        <tr key={entry.key || index} className="border-b border-slate-100 hover:bg-slate-50 group">
                                            <td className="py-0.5 px-2 text-center fz-small font-bold text-slate-500">{index + 1}</td>
                                            <td className="py-0.5 px-1.5">
                                                <Select showSearch value={entry.code || undefined}
                                                    onChange={val => updateVoucherEntry(index, 'code', val)}
                                                    className="w-full lp-tbl-sel" style={{ height: 22 }}
                                                    placeholder="Code..." optionLabelProp="value"
                                                    /* Legacy's combo filters by "starts with", not "contains" —
                                                       a plain substring match barely narrows anything since most
                                                       names contain any given letter somewhere. */
                                                    filterOption={(input, option) =>
                                                        String(option?.value ?? '').toLowerCase().startsWith(input.toLowerCase())}
                                                    popupMatchSelectWidth={false} dropdownStyle={{ minWidth: 280 }}
                                                    listHeight={300} virtual
                                                    options={headList.map(h => ({ value: h.code, label: `${h.code} - ${h.name}` }))} />
                                            </td>
                                            <td className="py-0.5 px-1.5">
                                                {/* Same underlying value as Code (the code) — head names aren't
                                                    unique (e.g. two heads are both "Cash in Hand"), so the code
                                                    stays canonical; this just searches/displays by name instead. */}
                                                <Select showSearch value={entry.code || undefined}
                                                    onChange={val => updateVoucherEntry(index, 'code', val)}
                                                    className="w-full lp-tbl-sel" style={{ height: 22 }}
                                                    placeholder="Name..." optionLabelProp="displayName"
                                                    filterOption={(input, option) =>
                                                        String((option as any)?.displayName ?? '').toLowerCase().startsWith(input.toLowerCase())}
                                                    popupMatchSelectWidth={false} dropdownStyle={{ minWidth: 280 }}
                                                    listHeight={300} virtual
                                                    options={headList.map(h => ({ value: h.code, label: `${h.name} - ${h.code}`, displayName: h.name }))} />
                                            </td>
                                            <td className="py-0.5 px-1.5">
                                                <Select value={entry.rp || undefined}
                                                    onChange={val => updateVoucherEntry(index, 'rp', val)}
                                                    className="w-full lp-tbl-sel" style={{ height: 22 }}
                                                    options={[{ value: 'Receipt', label: 'Receipt' }, { value: 'Payment', label: 'Payment' }]} />
                                            </td>
                                            <td className="py-0.5 px-1.5">
                                                <Input type="number" value={entry.amount}
                                                    onChange={e => updateVoucherEntry(index, 'amount', e.target.value)}
                                                    className="h-5 fz-small font-black border-slate-300 rounded text-right font-mono px-1.5"
                                                    placeholder="0.00" />
                                            </td>
                                            <td className="py-0.5 px-1 text-center">
                                                <button onClick={() => removeVoucherEntry(index)}
                                                    className="h-5 w-5 flex items-center justify-center text-slate-300 hover:text-white hover:bg-rose-500 rounded transition-colors opacity-0 group-hover:opacity-100 mx-auto">
                                                    <Trash2 size={9} />
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={6} className="py-4 text-center fz-tiny font-black text-slate-400 uppercase">
                                                No entries — select a loan case to begin
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 5. Narration + Totals — single-line bar */}
                    <div className="bg-white rounded-lg border border-slate-200 shadow-md shrink-0">
                        <div className="px-2 py-1.5 flex items-center gap-3">
                            <div className="flex items-center gap-1.5 shrink-0">
                                <FileText size={9} className="text-indigo-400" />
                                <span className="fz-mini font-black text-slate-600 uppercase tracking-widest">Narration</span>
                            </div>
                            <Input value={formData.narration} onChange={e => updateField('narration', e.target.value)}
                                placeholder="Enter narration / remarks…" className={`${inp} flex-1`} />
                            <div className="flex items-center gap-1.5 shrink-0">
                                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                                    <span className="fz-micro font-black text-emerald-400 uppercase tracking-wide">Total Receipt</span>
                                    <span className="fz-caption font-black text-emerald-700 font-mono">₹{totalReceipt.toFixed(2)}</span>
                                </div>
                                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 px-3 py-1 rounded-lg">
                                    <span className="fz-micro font-black text-rose-400 uppercase tracking-wide">Total Payment</span>
                                    <span className="fz-caption font-black text-rose-700 font-mono">₹{totalPayment.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* ── Footer ── */}
                <div className="lp-footer px-3 py-1 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-1.5">
                        <CreditCard size={9} className="text-slate-400" />
                        <span className="fz-mini font-black text-slate-500 uppercase tracking-wide">Loan Payment</span>
                        {formData.loanCaseNo && (
                            <>
                                <div className="w-px h-2.5 bg-slate-300" />
                                <span className="fz-mini font-black text-indigo-500">Case: {formData.loanCaseNo}</span>
                            </>
                        )}
                        {formData.memberNo && (
                            <>
                                <div className="w-px h-2.5 bg-slate-300" />
                                <span className="fz-mini font-black text-slate-500">Member: {formData.memberNo}</span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-1 text-indigo-400">
                        <Calendar size={9} />
                        <span className="fz-mini font-black uppercase tracking-wide">{dayjs().format('DD-MMM-YY')}</span>
                    </div>
                </div>

            </div>

            {/* ── Sanction Authorization Modal ── */}
            <Modal
                title={
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={13} className="text-indigo-500" />
                        <span className="fz-caption font-black text-slate-800 uppercase tracking-wide">Sanction Authorization</span>
                    </div>
                }
                open={modalData.isOpen} onCancel={closeModal} footer={null}
                width={520} centered styles={{ body: { padding: '12px' } }}
                className="lp-modal"
            >
                <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5 mb-3">
                    {([
                        ['Applicant', modalData.memberName, 'text-slate-800'],
                        ['Applied Amount', `₹${modalData.appliedAmount}`, 'text-indigo-700'],
                        ['Basic Salary', `₹${modalData.basicPay}`, 'text-slate-700'],
                        ['Share Capital', `₹${modalData.shareAmount}`, 'text-emerald-700'],
                    ] as const).map(([label, val, cls]) => (
                        <div key={label}>
                            <span className="fz-mini font-black text-slate-400 uppercase tracking-wide block mb-0.5">{label}</span>
                            <span className={`fz-caption font-black ${cls}`}>{val}</span>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
                    <div>
                        <label className={lbl}>Approved Sanction (₹)</label>
                        <div className="relative">
                            <IndianRupee size={9} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-emerald-400" />
                            <Input value={modalData.sanctionedAmount} onChange={e => updateModalField('sanctionedAmount', e.target.value)}
                                className="h-6 fz-small font-black bg-emerald-50 border-emerald-200 rounded pl-5 text-emerald-700" />
                        </div>
                    </div>
                    <div>
                        <label className={lbl}>No. of Installments</label>
                        <Input value={modalData.noOfInstallments} onChange={e => updateModalField('noOfInstallments', e.target.value)} className={inp} />
                    </div>
                    <div>
                        <label className={lbl}>Interest Rate (%)</label>
                        <Input value={modalData.rate} onChange={e => updateModalField('rate', e.target.value)}
                            className="h-6 fz-small font-black bg-indigo-50 border-indigo-200 rounded text-indigo-700" />
                    </div>
                    <div>
                        <label className={lbl}>Penal Rate (%)</label>
                        <Input value={modalData.penalRate} onChange={e => updateModalField('penalRate', e.target.value)}
                            className="h-6 fz-small font-black bg-rose-50 border-rose-200 rounded text-rose-700" />
                    </div>
                </div>
                <div className="flex justify-end gap-2 pt-2.5 border-t border-slate-200">
                    <button onClick={closeModal}
                        className="h-6 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg fz-mini font-black uppercase tracking-wide transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleModalSave}
                        className="h-6 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg fz-mini font-black uppercase tracking-wide flex items-center gap-1.5 shadow border border-indigo-500 transition-colors">
                        <ShieldCheck size={10} /> Confirm Sanction
                    </button>
                </div>
            </Modal>

            <style>{`
                .lp-sel .ant-select-selector { height: 24px !important; min-height: 24px !important; font-size: 10px !important; font-weight: 600 !important; }
                .lp-sel .ant-select-selection-item { line-height: 22px !important; font-size: 10px !important; }
                .lp-tbl-sel .ant-select-selector { height: 22px !important; min-height: 22px !important; font-size: 10px !important; font-weight: 600 !important; padding: 0 5px !important; }
                .lp-tbl-sel .ant-select-selection-item { line-height: 20px !important; font-size: 10px !important; }
                .lp-dp .ant-picker-input > input { font-size: 10px !important; font-weight: 600 !important; }
                .ant-input::placeholder { font-size: 9px !important; color: #94a3b8 !important; }
                input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
                input[type=number] { -moz-appearance: textfield; }

                /* ── Dark mode ── */
                html.dark .lp-root { background-color: #000000 !important; color: #f5f5f7 !important; }
                html.dark .lp-header { background-image: none !important; background-color: #0c0c0e !important; border-bottom: 1px solid rgba(255,255,255,.08) !important; }
                html.dark .lp-root .bg-white { background-color: #1c1c1e !important; }
                html.dark .lp-root .bg-slate-50,
                html.dark .lp-root .bg-slate-100 { background-color: rgba(255,255,255,.05) !important; }
                html.dark .lp-root .border-slate-200,
                html.dark .lp-root .border-slate-300 { border-color: rgba(255,255,255,.08) !important; }
                html.dark .lp-root .border-slate-100 { border-color: rgba(255,255,255,.07) !important; }
                html.dark .lp-root .bg-slate-300 { background-color: rgba(255,255,255,.08) !important; }
                html.dark .lp-root .text-slate-900,
                html.dark .lp-root .text-slate-800,
                html.dark .lp-root .text-slate-700 { color: #f5f5f7 !important; }
                html.dark .lp-root .text-slate-600,
                html.dark .lp-root .text-slate-500 { color: #8e8e93 !important; }
                html.dark .lp-root .text-slate-400 { color: #71717a !important; }
                html.dark .lp-root label { color: #8e8e93 !important; }
                html.dark .lp-root .text-emerald-600,
                html.dark .lp-root .text-emerald-700,
                html.dark .lp-root .text-emerald-400 { color: #34d399 !important; }
                html.dark .lp-root .text-rose-600,
                html.dark .lp-root .text-rose-500 { color: #ff453a !important; }
                html.dark .lp-root .bg-emerald-50 { background-color: rgba(52,211,153,.12) !important; }
                html.dark .lp-root .border-emerald-200,
                html.dark .lp-root .border-emerald-100 { border-color: rgba(52,211,153,.3) !important; }
                html.dark .lp-root .bg-rose-50 { background-color: rgba(255,69,58,.12) !important; }
                html.dark .lp-root .border-rose-200 { border-color: rgba(255,69,58,.3) !important; }
                html.dark .lp-root .bg-indigo-50 { background-color: rgba(99,102,241,.12) !important; }
                html.dark .lp-root .border-indigo-100 { border-color: rgba(99,102,241,.3) !important; }
                html.dark .lp-root .text-indigo-700,
                html.dark .lp-root .text-blue-700 { color: #60a5fa !important; }
                html.dark .lp-root .text-purple-700 { color: #c4b5fd !important; }
                /* inactive toggle / white buttons */
                html.dark .lp-root button.bg-white { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
                /* footer strip */
                html.dark .lp-footer { background-color: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; }
                /* table */
                html.dark .lp-root table thead { background-color: #1c1c1e !important; }
                html.dark .lp-root table th { color: #8e8e93 !important; border-color: rgba(255,255,255,.07) !important; }
                html.dark .lp-root table td { border-color: rgba(255,255,255,.07) !important; color: #f5f5f7 !important; }
                html.dark .lp-root table tr:hover { background-color: rgba(255,255,255,.05) !important; }
                /* antd inputs / selects / pickers */
                html.dark .lp-root .ant-input,
                html.dark .lp-root input.ant-input,
                html.dark .lp-root .ant-picker,
                html.dark .lp-sel .ant-select-selector,
                html.dark .lp-tbl-sel .ant-select-selector {
                    background-color: rgba(255,255,255,.05) !important; color: #f5f5f7 !important; border-color: rgba(255,255,255,.08) !important;
                }
                html.dark .lp-root .ant-select-selection-item,
                html.dark .lp-root .ant-select-selection-search-input,
                html.dark .lp-root .ant-picker input { color: #f5f5f7 !important; }
                html.dark .lp-root .ant-select-selection-placeholder,
                html.dark .lp-root .ant-input::placeholder,
                html.dark .lp-root .ant-picker input::placeholder { color: #71717a !important; }
                html.dark .lp-root .ant-select-arrow,
                html.dark .lp-root .ant-picker-suffix { color: #8e8e93 !important; }
                html.dark .ant-select-dropdown { background-color: #1c1c1e !important; }
                html.dark .ant-select-dropdown .ant-select-item { color: #f5f5f7 !important; }
                html.dark .ant-select-dropdown .ant-select-item-option-active { background-color: rgba(255,255,255,.08) !important; }
                /* Sanction modal */
                html.dark .lp-modal .ant-modal-content { background-color: #1c1c1e !important; }
                html.dark .lp-modal .ant-modal-header { background-color: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
                html.dark .lp-modal .ant-modal-title { background-color: transparent !important; }
                html.dark .lp-modal .text-slate-800 { color: #f5f5f7 !important; }
                html.dark .lp-modal .bg-slate-50 { background-color: rgba(255,255,255,.05) !important; }
                html.dark .lp-modal .border-slate-200 { border-color: rgba(255,255,255,.08) !important; }
                html.dark .lp-modal .text-slate-400 { color: #8e8e93 !important; }
                html.dark .lp-modal .text-slate-700 { color: #f5f5f7 !important; }
                html.dark .lp-modal .text-emerald-700 { color: #34d399 !important; }
                html.dark .lp-modal .text-indigo-700 { color: #60a5fa !important; }
                html.dark .lp-modal .bg-emerald-50 { background-color: rgba(52,211,153,.12) !important; border-color: rgba(52,211,153,.3) !important; }
                html.dark .lp-modal .bg-indigo-50 { background-color: rgba(99,102,241,.12) !important; border-color: rgba(99,102,241,.3) !important; }
                html.dark .lp-modal .bg-rose-50 { background-color: rgba(255,69,58,.12) !important; border-color: rgba(255,69,58,.3) !important; }
                html.dark .lp-modal .text-rose-700 { color: #ff453a !important; }
                html.dark .lp-modal .bg-slate-100 { background-color: #1c1c1e !important; border: 1px solid rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
            `}</style>
        </ConfigProvider>
    );
};

export default LoanPaymentForm;
