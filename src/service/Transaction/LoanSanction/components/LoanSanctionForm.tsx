// components/LoanSanctionForm.tsx

import React from 'react';
import {
    ConfigProvider,
    Input,
    Select,
    Button,
    Row,
    Col
} from 'antd';
import {
    BadgeCheck,
    CheckCircle,
    X,
    ShieldCheck,
    Building2,
    Calendar,
    CreditCard,
    User,
    Wallet,
    Briefcase,
    FileText,
    BadgePercent,
    TrendingUp,
    Scale,
    Users
} from 'lucide-react';
import { motion } from 'framer-motion';
import { LoanSanctionHookReturn } from '../interface/LoanSanctionInterfaces';
import dayjs from 'dayjs';

const { Option } = Select;

const LoanSanctionForm: React.FC<LoanSanctionHookReturn> = ({
    loanCases,
    selectedLoanCase,
    isLoadingCases,
    isLoadingDetails,
    isSaving,
    loanDetails,
    sanctionDetails,
    rules,
    toggleRule,
    handleLoanCaseChange,
    updateSanctionField,
    handleSanctionSave,
    formatCurrency,
    handleExit,
}) => {
    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#16a34a', // Green primary for Sanction (Approval)
                    borderRadius: 8,
                },
            }}
        >
            <div className="h-screen flex flex-col bg-slate-50 font-sans selection:bg-green-100 overflow-hidden text-slate-900">

                {/* Compact Admin Header */}
                <div className="bg-slate-900 px-2 py-1 flex items-center justify-between z-10 shrink-0 shadow-lg border-b border-white/5">
                    <div className="flex items-center gap-1.5">
                        <div className="bg-emerald-600 p-1 rounded-lg text-white shadow-lg shadow-emerald-600/20">
                            <BadgeCheck size={14} />
                        </div>
                        <div>
                            <h1 className="fz-caption font-black text-white tracking-tight leading-none uppercase">Loan Sanction Console</h1>
                            <div className="flex items-center gap-1 mt-0.5 fz-label font-black text-slate-400 uppercase tracking-[0.2em] leading-none">
                                <ShieldCheck size={7} className="text-emerald-400" /> Executive Authority
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <div className="px-2 py-0.5 bg-white/5 rounded-lg fz-body font-black text-slate-400 border border-white/5 hidden md:block uppercase tracking-wider">
                            {loanCases.length} PENDING
                        </div>
                        <div className="h-4 w-px bg-slate-700 mx-0.5" />
                        <button onClick={handleSanctionSave} disabled={!selectedLoanCase || isSaving} className="h-6 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white rounded-lg fz-body font-black transition-all flex items-center gap-1 transform active:scale-95 uppercase tracking-widest shadow-lg shadow-emerald-600/20">
                            <CheckCircle size={10} /> {isSaving ? 'Processing...' : 'Sanction'}
                        </button>
                        <button onClick={handleExit} className="h-6 px-3 bg-white/5 hover:bg-rose-600 text-slate-300 hover:text-white rounded-lg fz-body font-black transition-all flex items-center gap-1 transform active:scale-95 uppercase tracking-widest border border-white/5">
                            <X size={10} /> Exit
                        </button>
                    </div>
                </div>

                {/* Workspace */}
                <div className="flex-1 overflow-auto p-1.5 bg-slate-50/50">
                    <div className="max-w-7xl mx-auto space-y-1.5 pb-2">

                        {/* Case Selection Panel */}
                        <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden"
                        >
                            <div className="bg-slate-50 px-2 py-1 border-b border-slate-100 flex items-center gap-1.5">
                                <FileText size={10} className="text-emerald-600" />
                                <span className="fz-body font-black text-slate-700 uppercase tracking-widest">Loan Case No</span>
                            </div>
                            <div className="p-1.5">
                                <Select
                                    showSearch
                                    value={selectedLoanCase}
                                    onChange={handleLoanCaseChange}
                                    loading={isLoadingCases}
                                    className="w-full h-7 custom-select-premium"
                                    placeholder="Select a loan case for review..."
                                    optionFilterProp="children"
                                    listHeight={400}
                                    popupClassName="premium-dropdown-list"
                                >
                                    {loanCases.map(loan => (
                                        <Option key={loan.loanCaseNo} value={loan.loanCaseNo}>
                                            {loan.loanCaseNo} - {loan.memberName} ({loan.loanType}) | {formatCurrency(loan.appliedAmount)}
                                        </Option>
                                    ))}
                                </Select>
                            </div>
                        </motion.div>

                        {selectedLoanCase && (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-1.5">
                                {/* Left Column: Loan Details (Read-only) */}
                                <motion.div
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="lg:col-span-8 space-y-1.5"
                                >
                                    {/* Applicant Identity */}
                                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                                        <div className="bg-slate-50 px-2 py-1 border-b border-slate-100 flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <User size={10} className="text-indigo-600" />
                                                <span className="fz-body font-black text-slate-700 uppercase tracking-widest">Applicant Profile</span>
                                            </div>
                                            <div className="px-1.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded fz-body font-black text-indigo-700 tracking-wide uppercase">
                                                {loanDetails.loanType}
                                            </div>
                                        </div>

                                        <div className="p-2 grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <div className="space-y-0.5">
                                                <span className="fz-label font-black text-slate-400 uppercase tracking-widest">Member No</span>
                                                <div className="fz-caption font-black text-slate-700">{loanDetails.memberNo}</div>
                                            </div>
                                            <div className="space-y-0.5">
                                                <span className="fz-label font-black text-slate-400 uppercase tracking-widest">Application Date</span>
                                                <div className="fz-caption font-black text-slate-700">
                                                    {dayjs(loanDetails.applicationDate).isValid()
                                                        ? dayjs(loanDetails.applicationDate).format('DD-MM-YYYY')
                                                        : '-'}
                                                </div>
                                            </div>
                                            <div className="space-y-0.5 md:col-span-2">
                                                <span className="fz-label font-black text-slate-400 uppercase tracking-widest">Full Name</span>
                                                <div className="fz-caption font-black text-slate-800">{loanDetails.memberName}</div>
                                            </div>
                                            <div className="space-y-0.5">
                                                <span className="fz-label font-black text-slate-400 uppercase tracking-widest">Form No.</span>
                                                <div className="fz-caption font-black text-slate-600">{loanDetails.formNumber}</div>
                                            </div>

                                            <div className="space-y-0.5 md:col-span-2">
                                                <span className="fz-label font-black text-slate-400 uppercase tracking-widest">Office / Dept</span>
                                                <div className="fz-caption font-black text-slate-600 truncate">{loanDetails.officeNo} - {loanDetails.officeName}</div>
                                            </div>
                                            <div className="space-y-0.5">
                                                <span className="fz-label font-black text-slate-400 uppercase tracking-widest">Purpose</span>
                                                <div className="fz-caption font-black text-slate-600 truncate">{loanDetails.purpose}</div>
                                            </div>
                                            <div className="space-y-0.5">
                                                <span className="fz-label font-black text-slate-400 uppercase tracking-widest">Share Amount</span>
                                                <div className="fz-caption font-black text-emerald-600">{formatCurrency(loanDetails.shareAmount)}</div>
                                            </div>

                                            <div className="space-y-0.5">
                                                <span className="fz-label font-black text-slate-400 uppercase tracking-widest">Basic Pay</span>
                                                <div className="fz-caption font-black text-slate-600">{formatCurrency(loanDetails.basicPay)}</div>
                                            </div>
                                            <div className="space-y-0.5">
                                                <span className="fz-label font-black text-slate-400 uppercase tracking-widest">Applied Amount</span>
                                                <div className="fz-caption font-black text-emerald-600">{formatCurrency(loanDetails.appliedAmount)}</div>
                                            </div>
                                            <div className="space-y-0.5">
                                                <span className="fz-label font-black text-slate-400 uppercase tracking-widest">Existing Balance</span>
                                                <div className="fz-caption font-black text-rose-600">{formatCurrency(loanDetails.currentBalance)}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Surety Matrix */}
                                    {/* Surety Matrix - Always Visible */}
                                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                                        <div className="bg-slate-50 px-2 py-1 border-b border-slate-100 flex items-center gap-1.5">
                                            <Users size={10} className="text-orange-600" />
                                            <span className="fz-body font-black text-slate-700 uppercase tracking-widest">Surety Obligations</span>
                                        </div>
                                        <div className="p-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {/* Surety 1 */}
                                            <div className="p-2 bg-orange-50/50 rounded-lg border border-orange-100 flex flex-col gap-0.5">
                                                <div className="flex justify-between items-start">
                                                    <span className="fz-body font-black text-orange-400 uppercase tracking-widest">Surety 01</span>
                                                    <span className="fz-body font-mono font-black text-orange-700">{loanDetails.surety1Gr || '-'}</span>
                                                </div>
                                                <div className="fz-caption font-black text-slate-700 truncate min-h-[1rem]">{loanDetails.surety1Name || '-'}</div>
                                                <div className="fz-body font-bold text-slate-500 truncate min-h-[1rem]">{loanDetails.surety1Office || '-'}</div>
                                                <div className="mt-1 pt-1 border-t border-orange-200/50 flex justify-between">
                                                    <span className="fz-label font-black text-slate-400 uppercase">Loan Bal</span>
                                                    <span className="fz-body font-black text-rose-600">{loanDetails.surety1LoanBalance ? formatCurrency(loanDetails.surety1LoanBalance) : '-'}</span>
                                                </div>
                                            </div>

                                            {/* Surety 2 */}
                                            <div className="p-2 bg-orange-50/50 rounded-lg border border-orange-100 flex flex-col gap-0.5">
                                                <div className="flex justify-between items-start">
                                                    <span className="fz-body font-black text-orange-400 uppercase tracking-widest">Surety 02</span>
                                                    <span className="fz-body font-mono font-black text-orange-700">{loanDetails.surety2Gr || '-'}</span>
                                                </div>
                                                <div className="fz-caption font-black text-slate-700 truncate min-h-[1rem]">{loanDetails.surety2Name || '-'}</div>
                                                <div className="fz-body font-bold text-slate-500 truncate min-h-[1rem]">{loanDetails.surety2Office || '-'}</div>
                                                <div className="mt-1 pt-1 border-t border-orange-200/50 flex justify-between">
                                                    <span className="fz-label font-black text-slate-400 uppercase">Loan Bal</span>
                                                    <span className="fz-body font-black text-rose-600">{loanDetails.surety2LoanBalance ? formatCurrency(loanDetails.surety2LoanBalance) : '-'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Right Column: Sanction Controls */}
                                <motion.div
                                    initial={{ opacity: 0, x: 5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="lg:col-span-4 space-y-1.5"
                                >
                                    {/* Rules Card */}
                                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                                        <div className="grid grid-cols-2 bg-purple-50 border-b border-purple-100">
                                            <div className="px-2 py-0.5 fz-body font-black text-purple-700 border-r border-purple-100 uppercase tracking-wider">Rules</div>
                                            <div className="px-2 py-0.5 fz-body font-black text-purple-700 text-right uppercase tracking-wider">Amount</div>
                                        </div>
                                        <div className="grid grid-cols-2 border-b border-slate-100 last:border-0 bg-emerald-50/50">
                                            <label className="px-2 py-0.5 flex items-center gap-1 border-r border-slate-100 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={rules.sharesBalance}
                                                    onChange={() => toggleRule('sharesBalance')}
                                                    className="w-2.5 h-2.5 rounded-[2px] border-slate-400 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                                                />
                                                <span className="fz-body font-black text-amber-800 uppercase tracking-wider">Shares Balance</span>
                                            </label>
                                            <div className="px-2 py-0.5 fz-body font-mono font-black text-rose-600 text-right">
                                                {formatCurrency(loanDetails.shareAmount).replace('₹', '')}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 bg-white">
                                            <label className="px-2 py-0.5 flex items-center gap-1 border-r border-slate-100 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={rules.tenPercentOfLoan}
                                                    onChange={() => toggleRule('tenPercentOfLoan')}
                                                    className="w-2.5 h-2.5 rounded-[2px] border-slate-400 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                                                />
                                                <span className="fz-body font-black text-fuchsia-700 uppercase tracking-wider">10 % Of Loan</span>
                                            </label>
                                            <div className="px-2 py-0.5 fz-body font-mono font-black text-rose-600 text-right">
                                                {formatCurrency((parseFloat(loanDetails.appliedAmount) || 0) * 0.10).replace('₹', '')}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Approval Parameters (Existing) */}
                                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
                                        <div className="bg-emerald-600 px-2 py-1 border-b border-emerald-700 flex items-center gap-1.5 shrink-0">
                                            <Scale size={12} className="text-emerald-100" />
                                            <span className="fz-body font-black text-white uppercase tracking-widest">Approval Parameters</span>
                                        </div>

                                        <div className="p-2 flex-1 space-y-2">


                                            {/* Amount */}
                                            <div className="space-y-0.5">
                                                <label className="fz-label font-black text-slate-400 uppercase tracking-widest ml-0.5">Sanction Amount</label>
                                                <div className="relative">
                                                    <Input
                                                        value={sanctionDetails.sanctionedAmount}
                                                        onChange={(e) => updateSanctionField('sanctionedAmount', e.target.value)}
                                                        className="h-8 fz-heading font-black text-emerald-600 border-emerald-200 bg-emerald-50/30 focus:bg-white"
                                                    />
                                                    <span className="absolute right-2 top-2 fz-caption font-black text-emerald-300">INR</span>
                                                </div>
                                            </div>

                                            {/* Terms */}
                                            <div className="grid grid-cols-2 gap-1.5">
                                                <div className="space-y-0.5">
                                                    <label className="fz-label font-black text-slate-400 uppercase tracking-widest ml-0.5">Installments</label>
                                                    <Input
                                                        value={sanctionDetails.noOfInstallments}
                                                        onChange={(e) => updateSanctionField('noOfInstallments', e.target.value)}
                                                        className="h-7 font-black text-slate-700 fz-caption"
                                                    />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <label className="fz-label font-black text-slate-400 uppercase tracking-widest ml-0.5">Rate %</label>
                                                    <Input
                                                        value={sanctionDetails.rate}
                                                        onChange={(e) => updateSanctionField('rate', e.target.value)}
                                                        className="h-7 font-black text-slate-700 fz-caption"
                                                        suffix={<span className="fz-body text-slate-400">%</span>}
                                                    />
                                                </div>
                                            </div>

                                            {/* Dates & Penalty */}
                                            <div className="grid grid-cols-2 gap-1.5">
                                                <div className="space-y-0.5">
                                                    <label className="fz-label font-black text-slate-400 uppercase tracking-widest ml-0.5">Sanction Date</label>
                                                    <Input
                                                        value={sanctionDetails.sanctionDate}
                                                        readOnly
                                                        className="h-7 font-black text-slate-500 bg-slate-50 fz-caption"
                                                        placeholder="DD-MM-YYYY"
                                                    />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <label className="fz-label font-black text-slate-400 uppercase tracking-widest ml-0.5">Penalty %</label>
                                                    <Input
                                                        value={sanctionDetails.penalRate}
                                                        onChange={(e) => updateSanctionField('penalRate', e.target.value)}
                                                        className="h-7 font-black text-rose-600 fz-caption"
                                                        suffix={<span className="fz-body text-slate-400">%</span>}
                                                    />
                                                </div>
                                            </div>

                                            {/* Installment & Interest Inputs (Previously Summary) */}
                                            <div className="pt-1 border-t border-slate-100 flex flex-col gap-1.5">
                                                <div className="space-y-0.5">
                                                    <label className="fz-label font-black text-slate-400 uppercase tracking-widest ml-0.5">Installment Amt</label>
                                                    <Input
                                                        value={sanctionDetails.installmentAmount}
                                                        onChange={(e) => updateSanctionField('installmentAmount', e.target.value)}
                                                        className="h-7 font-black text-slate-800 border-slate-200 fz-caption"
                                                        prefix={<span className="fz-body text-slate-400 mr-0.5">₹</span>}
                                                    />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <label className="fz-label font-black text-slate-400 uppercase tracking-widest ml-0.5">Total Interest</label>
                                                    <Input
                                                        value={sanctionDetails.interestAmount}
                                                        onChange={(e) => updateSanctionField('interestAmount', e.target.value)}
                                                        className="h-7 font-black text-emerald-600 border-emerald-100 bg-emerald-50/20 fz-caption"
                                                        prefix={<span className="fz-body text-slate-400 mr-0.5">₹</span>}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        )}


                    </div>
                </div>

                {/* Global Footer Metadata */}
                <div className="px-2 py-1 bg-white border-t border-slate-100 flex items-center justify-between opacity-60 shrink-0">
                    <div className="flex items-center gap-2">
                        <Building2 size={9} className="text-slate-400" />
                        <div className="flex items-center gap-2">
                            <span className="fz-body font-black text-slate-800 uppercase tracking-tight leading-none">Credit Approval Dept</span>
                            <div className="w-px h-2.5 bg-slate-200" />
                            <span className="fz-label font-black text-slate-400 uppercase tracking-[0.2em] leading-none">
                                Auth Level: EXECUTIVE
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-500 fz-label font-black uppercase tracking-widest">
                        <ShieldCheck size={10} /> Secure Transaction
                    </div>
                </div>

            </div>

            <style>{`
        .custom-select-premium .ant-select-selector {
           background-color: #f8fafc !important;
           border: 1px solid #f1f5f9 !important;
           height: 28px !important;
           padding: 0 8px !important;
           display: flex !important;
           align-items: center !important;
           border-radius: 6px !important;
           font-weight: 900 !important;
           font-size: 10px !important;
           color: #334155 !important;
           box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.04) !important;
        }

        .ant-input:focus, .ant-picker-focused, .ant-select-focused .ant-select-selector {
          box-shadow: none !important;
          border-color: #16a34a !important;
        }

        .premium-dropdown-list {
            border-radius: 8px !important;
            padding: 6px !important;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
            border: 1px solid #f1f5f9 !important;
        }
        .premium-dropdown-list .ant-select-item {
            border-radius: 6px !important;
            margin-bottom: 2px !important;
            transition: all 0.2s ease !important;
            font-size: 10px !important;
            font-weight: 700 !important;
            padding: 4px 8px !important;
        }
        .premium-dropdown-list .ant-select-item-option-active {
            background-color: #f0fdf4 !important;
            color: #16a34a !important;
        }
        .premium-dropdown-list .ant-select-item-option-selected {
            background-color: #16a34a !important;
            color: white !important;
        }
        .premium-dropdown-list .rc-virtual-list-scrollbar {
            width: 5px !important;
        }
        .premium-dropdown-list .rc-virtual-list-scrollbar-thumb {
            background: #dcfce7 !important;
            border-radius: 10px !important;
        }
      `}</style>
        </ConfigProvider>
    );
};

export default LoanSanctionForm;
