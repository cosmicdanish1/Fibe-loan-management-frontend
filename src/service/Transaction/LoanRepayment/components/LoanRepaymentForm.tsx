import React from 'react';
import type { useLoanRepayment } from '../hooks/useLoanRepayment';

type Props = ReturnType<typeof useLoanRepayment>;

const MONTHS = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

const LOAN_TYPE_LABEL: Record<string, string> = {
    RLN: 'Regular Loan', ELN: 'Emergency Loan', ALN: 'Additional Loan',
};

const fmt = (n: number | string) =>
    Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const LoanRepaymentForm: React.FC<Props> = ({
    form, activeLoans, repaymentHistory, loading, historyLoading,
    message, updateForm, handleMemberLookup, handleLoanSelect, handleSubmit, handleReset,
}) => {
    const selectedLoan = activeLoans.find(l => l.loancaseno === form.selectedLoanCase);

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-auto">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
                <div>
                    <h1 className="fz-heading font-semibold text-slate-800">Loan Repayment</h1>
                    <p className="fz-caption text-slate-500">Record monthly installment payments against active loans</p>
                </div>
                <button
                    onClick={handleReset}
                    className="fz-button px-4 py-1.5 border border-slate-300 rounded text-slate-600 hover:bg-slate-50"
                >
                    Reset
                </button>
            </div>

            <div className="flex gap-4 p-4 flex-1 overflow-auto">
                {/* Left Panel — Form */}
                <div className="flex flex-col gap-4 w-[420px] shrink-0">
                    {/* Member Search */}
                    <div className="bg-white border border-slate-200 rounded-lg p-4">
                        <h2 className="fz-label font-semibold text-slate-700 mb-3">Member</h2>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Member No."
                                value={form.mbno}
                                onChange={e => updateForm('mbno', e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleMemberLookup(form.mbno, '')}
                                className="fz-body border border-slate-300 rounded px-3 py-1.5 w-28 focus:outline-none focus:border-blue-400"
                            />
                            <input
                                type="text"
                                placeholder="Member name"
                                value={form.memberName}
                                readOnly
                                className="fz-body border border-slate-200 rounded px-3 py-1.5 flex-1 bg-slate-50 text-slate-600"
                            />
                            <button
                                onClick={() => handleMemberLookup(form.mbno, '')}
                                disabled={loading || !form.mbno}
                                className="fz-button px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                                Search
                            </button>
                        </div>
                    </div>

                    {/* Loan Selection */}
                    {activeLoans.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-lg p-4">
                            <h2 className="fz-label font-semibold text-slate-700 mb-3">Select Loan</h2>
                            <div className="flex flex-col gap-2">
                                {activeLoans.map(loan => (
                                    <label
                                        key={loan.loancaseno}
                                        className={`flex items-start gap-3 p-3 border rounded-md cursor-pointer transition-colors ${
                                            form.selectedLoanCase === loan.loancaseno
                                                ? 'border-blue-400 bg-blue-50'
                                                : 'border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="loanCase"
                                            value={loan.loancaseno}
                                            checked={form.selectedLoanCase === loan.loancaseno}
                                            onChange={() => handleLoanSelect(loan.loancaseno)}
                                            className="mt-0.5"
                                        />
                                        <div className="flex-1">
                                            <div className="flex justify-between">
                                                <span className="fz-body font-medium text-slate-800">
                                                    {LOAN_TYPE_LABEL[loan.loantype] || loan.loantype}
                                                </span>
                                                <span className="fz-caption text-slate-500">#{loan.loancaseno}</span>
                                            </div>
                                            <div className="flex gap-4 mt-1">
                                                <span className="fz-caption text-slate-500">
                                                    Balance: <span className="text-red-600 font-medium">₹{fmt(loan.balance)}</span>
                                                </span>
                                                <span className="fz-caption text-slate-500">
                                                    EMI: <span className="text-slate-700">₹{fmt(loan.instal_amt)}</span>
                                                </span>
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Payment Details */}
                    {form.selectedLoanCase && (
                        <div className="bg-white border border-slate-200 rounded-lg p-4">
                            <h2 className="fz-label font-semibold text-slate-700 mb-3">Payment Details</h2>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="fz-caption text-slate-500 block mb-1">Month</label>
                                    <select
                                        value={form.paymentMonth}
                                        onChange={e => updateForm('paymentMonth', Number(e.target.value))}
                                        className="fz-body border border-slate-300 rounded px-2 py-1.5 w-full focus:outline-none focus:border-blue-400"
                                    >
                                        {MONTHS.map(m => (
                                            <option key={m.value} value={m.value}>{m.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="fz-caption text-slate-500 block mb-1">Year</label>
                                    <input
                                        type="number"
                                        value={form.paymentYear}
                                        onChange={e => updateForm('paymentYear', Number(e.target.value))}
                                        className="fz-body border border-slate-300 rounded px-2 py-1.5 w-full focus:outline-none focus:border-blue-400"
                                    />
                                </div>
                                <div>
                                    <label className="fz-caption text-slate-500 block mb-1">Amount (₹)</label>
                                    <input
                                        type="number"
                                        value={form.paymentAmount || ''}
                                        onChange={e => updateForm('paymentAmount', Number(e.target.value))}
                                        className="fz-body border border-slate-300 rounded px-2 py-1.5 w-full focus:outline-none focus:border-blue-400"
                                        placeholder={selectedLoan ? `EMI: ${fmt(selectedLoan.instal_amt)}` : ''}
                                    />
                                </div>
                                <div>
                                    <label className="fz-caption text-slate-500 block mb-1">Receipt No.</label>
                                    <input
                                        type="text"
                                        value={form.receiptNo}
                                        onChange={e => updateForm('receiptNo', e.target.value)}
                                        className="fz-body border border-slate-300 rounded px-2 py-1.5 w-full focus:outline-none focus:border-blue-400"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="fz-caption text-slate-500 block mb-1">Narration</label>
                                    <input
                                        type="text"
                                        value={form.narration}
                                        onChange={e => updateForm('narration', e.target.value)}
                                        className="fz-body border border-slate-300 rounded px-2 py-1.5 w-full focus:outline-none focus:border-blue-400"
                                    />
                                </div>
                            </div>

                            {selectedLoan && (
                                <div className="mt-3 p-3 bg-slate-50 rounded-md border border-slate-200">
                                    <div className="flex justify-between fz-caption text-slate-500">
                                        <span>Outstanding Balance</span>
                                        <span className="font-medium text-red-600">₹{fmt(selectedLoan.balance)}</span>
                                    </div>
                                    <div className="flex justify-between fz-caption text-slate-500 mt-1">
                                        <span>Balance After Payment</span>
                                        <span className="font-medium text-green-700">
                                            ₹{fmt(Math.max(0, parseFloat(selectedLoan.balance as any) - form.paymentAmount))}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {message && (
                                <div className={`mt-3 p-2 rounded text-sm ${
                                    message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                                }`}>
                                    {message.text}
                                </div>
                            )}

                            <button
                                onClick={handleSubmit}
                                disabled={loading || form.paymentAmount <= 0}
                                className="fz-button mt-4 w-full py-2 bg-green-600 text-white rounded-md font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                                {loading ? 'Recording...' : 'Record Repayment'}
                            </button>
                        </div>
                    )}

                    {/* Message when no loan selected yet */}
                    {message && !form.selectedLoanCase && (
                        <div className={`p-3 rounded-lg text-sm ${
                            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                            {message.text}
                        </div>
                    )}
                </div>

                {/* Right Panel — Repayment History */}
                <div className="flex-1 bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col">
                    <div className="px-4 py-3 border-b border-slate-100">
                        <h2 className="fz-label font-semibold text-slate-700">Repayment History</h2>
                        {form.memberName && <p className="fz-caption text-slate-500">{form.memberName} — #{form.mbno}</p>}
                    </div>
                    <div className="overflow-auto flex-1">
                        {historyLoading ? (
                            <div className="flex items-center justify-center h-32 text-slate-400 fz-body">Loading...</div>
                        ) : repaymentHistory.length === 0 ? (
                            <div className="flex items-center justify-center h-32 text-slate-400 fz-body">
                                {form.mbno ? 'No repayment records found.' : 'Search for a member to view history.'}
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-slate-50 sticky top-0">
                                    <tr>
                                        {['Loan Case', 'Type', 'Month/Year', 'Amount', 'Receipt', 'Remaining', 'Date'].map(h => (
                                            <th key={h} className="px-3 py-2 text-left fz-caption font-semibold text-slate-600 border-b border-slate-200">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {repaymentHistory.map((row, i) => (
                                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="px-3 py-2 fz-caption text-slate-700">{row.loancaseno}</td>
                                            <td className="px-3 py-2 fz-caption text-slate-600">{LOAN_TYPE_LABEL[row.loantype] || row.loantype}</td>
                                            <td className="px-3 py-2 fz-caption text-slate-600">{MONTHS.find(m => m.value === row.payment_month)?.label?.slice(0, 3)} {row.payment_year}</td>
                                            <td className="px-3 py-2 fz-caption text-slate-800 font-medium">₹{fmt(row.payment_amount)}</td>
                                            <td className="px-3 py-2 fz-caption text-slate-500">{row.receipt_no || '—'}</td>
                                            <td className="px-3 py-2 fz-caption text-red-600">₹{fmt(row.remaining_balance)}</td>
                                            <td className="px-3 py-2 fz-caption text-slate-500">{row.payment_date ? new Date(row.payment_date).toLocaleDateString('en-IN') : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoanRepaymentForm;
