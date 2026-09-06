import React, { useState } from 'react';
import { Modal } from 'antd';
import { Search } from 'lucide-react';
import type { useLoanRepayment } from '../hooks/useLoanRepayment';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';
import MemberLookup from '../../../../components/shared/MemberLookup/MemberLookup';

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
    form, activeLoans, dueStatus, dueStatusLoading, repaymentHistory, loading, historyLoading,
    message, updateForm, handleMemberLookup, handleLoanSelect, handleSubmit, handleReset,
}) => {
    const selectedLoan = activeLoans.find(l => l.loancaseno === form.selectedLoanCase);
    const [showLookup, setShowLookup] = useState(false);

    const onMemberSelected = (member: any) => {
        const memberNo = String(member.memberNo || '');
        const memberName = member.memberName || member.name || '';
        handleMemberLookup(memberNo, memberName);
        setShowLookup(false);
    };

    usePageToolbarActions({
        onSave: handleSubmit,
        saveLabel: loading ? 'Recording...' : 'Record Repayment',
        saveEnabled: !(loading || form.paymentAmount <= 0),
    });

    return (
        <div className="lr-root flex flex-col h-full bg-slate-50 overflow-auto">
            {/* Header */}
            <div className="lr-header bg-gradient-to-r from-slate-900 to-slate-900 border-b border-white/5 px-6 py-3 flex items-center justify-between shrink-0 shadow-lg">
                <div>
                    <h1 className="fz-heading font-semibold text-white">Loan Repayment</h1>
                    <p className="fz-caption text-slate-400">Record monthly installment payments against active loans</p>
                </div>
                <button
                    onClick={handleReset}
                    className="fz-button px-4 py-1.5 border border-white/20 rounded text-slate-200 hover:bg-white/10"
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
                            <button
                                type="button"
                                onClick={() => setShowLookup(true)}
                                title="Member Lookup"
                                className="fz-button px-2.5 py-1.5 bg-slate-100 text-slate-600 rounded hover:bg-indigo-600 hover:text-white transition-colors flex items-center justify-center shrink-0"
                            >
                                <Search size={14} />
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

                            {/* Compact summary only — the itemized installment
                                breakdown lives in the right panel so it doesn't push
                                Amount/Submit below the fold on loans with many
                                overdue installments. */}
                            {dueStatusLoading ? (
                                <div className="fz-caption text-slate-400 mb-3">Checking outstanding dues…</div>
                            ) : dueStatus && dueStatus.unpaidInstallments.length > 0 ? (
                                <div className="mb-3 flex justify-between items-center border border-amber-200 bg-amber-50 rounded-md px-3 py-2">
                                    <span className="fz-caption font-semibold text-amber-800">
                                        {dueStatus.unpaidInstallments.length} overdue — oldest recovered first
                                    </span>
                                    <span className="fz-body font-semibold text-amber-900">₹{fmt(dueStatus.totalDue)}</span>
                                </div>
                            ) : dueStatus ? (
                                <div className="mb-3 fz-caption text-green-700 bg-green-50 border border-green-200 rounded-md p-2">
                                    No installment currently overdue — payment will be applied as an advance against principal.
                                </div>
                            ) : null}

                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
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
                                <div>
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
                                            ₹{fmt(Math.max(
                                                0,
                                                parseFloat(selectedLoan.balance as any) -
                                                    // Only the principal portion pays down the balance — interest and
                                                    // penal are collected separately. Approximate here (server does the
                                                    // exact oldest-first waterfall) by taking non-principal dues off first.
                                                    Math.max(0, form.paymentAmount - (dueStatus ? dueStatus.totalInterestDue + dueStatus.totalPenalDue : 0))
                                            ))}
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

                {/* Right Panel — Installments Due + Repayment History */}
                <div className="flex-1 flex flex-col gap-4 min-w-0">
                    {form.selectedLoanCase && dueStatus && dueStatus.unpaidInstallments.length > 0 && (
                        <div className="bg-white border border-amber-200 rounded-lg overflow-hidden flex flex-col shrink-0" style={{ maxHeight: '340px' }}>
                            <div className="px-4 py-3 border-b border-amber-100 bg-amber-50 flex items-center justify-between shrink-0">
                                <h2 className="fz-label font-semibold text-amber-900">
                                    {dueStatus.unpaidInstallments.length} Installment(s) Overdue — Oldest Recovered First
                                </h2>
                                <span className="fz-body font-semibold text-amber-900">₹{fmt(dueStatus.totalDue)}</span>
                            </div>
                            <div className="overflow-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 sticky top-0">
                                        <tr>
                                            {['#', 'Month', 'Overdue', 'Principal', 'Interest', 'Penal', 'Total'].map(h => (
                                                <th key={h} className="px-3 py-1.5 text-left fz-caption font-semibold text-slate-600 border-b border-slate-200">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dueStatus.unpaidInstallments.map(inst => (
                                            <tr key={inst.installmentNo} className="border-b border-slate-100">
                                                <td className="px-3 py-1.5 fz-caption text-slate-700">{inst.installmentNo}</td>
                                                <td className="px-3 py-1.5 fz-caption text-slate-600">
                                                    {MONTHS[new Date(inst.dueDate).getMonth()]?.label?.slice(0, 3)} {new Date(inst.dueDate).getFullYear()}
                                                </td>
                                                <td className="px-3 py-1.5 fz-caption text-red-600">{inst.monthsOverdue > 0 ? `${inst.monthsOverdue}mo` : 'current'}</td>
                                                <td className="px-3 py-1.5 fz-caption text-slate-700">₹{fmt(inst.principalDue)}</td>
                                                <td className="px-3 py-1.5 fz-caption text-slate-700">₹{fmt(inst.interestDue)}</td>
                                                <td className="px-3 py-1.5 fz-caption text-red-600">{inst.penalDue > 0 ? `₹${fmt(inst.penalDue)}` : '—'}</td>
                                                <td className="px-3 py-1.5 fz-caption font-medium text-slate-800">₹{fmt(inst.principalDue + inst.interestDue + inst.penalDue)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col">
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

            {/* Member Lookup Modal */}
            <Modal
                open={showLookup}
                onCancel={() => setShowLookup(false)}
                footer={null}
                width={800}
                styles={{ body: { padding: 0 } }}
                destroyOnClose
            >
                <MemberLookup isModal onSelect={onMemberSelected} onClose={() => setShowLookup(false)} />
            </Modal>

            <style>{`
                /* ── Dark mode ── */
                html.dark .lr-root { background-color: #000000 !important; color: #f5f5f7 !important; }
                html.dark .lr-header { background-image: none !important; background-color: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; }
                html.dark .lr-root .bg-white { background-color: #1c1c1e !important; }
                html.dark .lr-root .bg-slate-50 { background-color: rgba(255,255,255,.05) !important; }
                html.dark .lr-root .border-slate-200,
                html.dark .lr-root .border-slate-300 { border-color: rgba(255,255,255,.08) !important; }
                html.dark .lr-root .border-slate-100 { border-color: rgba(255,255,255,.07) !important; }
                html.dark .lr-root .text-slate-800,
                html.dark .lr-root .text-slate-700 { color: #f5f5f7 !important; }
                html.dark .lr-root .text-slate-600,
                html.dark .lr-root .text-slate-500 { color: #8e8e93 !important; }
                html.dark .lr-root .text-slate-400 { color: #71717a !important; }
                html.dark .lr-root label { color: #8e8e93 !important; }
                html.dark .lr-root .text-green-600,
                html.dark .lr-root .text-green-700 { color: #34d399 !important; }
                html.dark .lr-root .bg-green-50 { background-color: rgba(52,211,153,.12) !important; }
                html.dark .lr-root .border-green-200 { border-color: rgba(52,211,153,.3) !important; }
                html.dark .lr-root .text-red-600 { color: #ff453a !important; }
                html.dark .lr-root .bg-red-50 { background-color: rgba(255,69,58,.12) !important; }
                html.dark .lr-root .border-red-200 { border-color: rgba(255,69,58,.3) !important; }
                html.dark .lr-root .text-amber-800,
                html.dark .lr-root .text-amber-900 { color: #fbbf24 !important; }
                html.dark .lr-root .bg-amber-50 { background-color: rgba(251,191,36,.12) !important; }
                html.dark .lr-root .border-amber-100,
                html.dark .lr-root .border-amber-200 { border-color: rgba(251,191,36,.3) !important; }
                html.dark .lr-root .bg-blue-50 { background-color: rgba(59,130,246,.12) !important; }
                html.dark .lr-root .border-blue-400 { border-color: rgba(96,165,250,.5) !important; }
                /* buttons */
                html.dark .lr-root button.bg-slate-100 { background-color: #1c1c1e !important; color: #f5f5f7 !important; }
                html.dark .lr-root button.border-white\\/20 { border-color: rgba(255,255,255,.2) !important; }
                /* form inputs */
                html.dark .lr-root input[type=text],
                html.dark .lr-root input[type=number] {
                    background-color: rgba(255,255,255,.05) !important; color: #f5f5f7 !important; border-color: rgba(255,255,255,.08) !important;
                }
                html.dark .lr-root input[readonly] { background-color: rgba(255,255,255,.03) !important; color: #8e8e93 !important; }
                html.dark .lr-root input::placeholder { color: #71717a !important; }
                /* tables */
                html.dark .lr-root table thead { background-color: #1c1c1e !important; }
                html.dark .lr-root table th { color: #8e8e93 !important; border-color: rgba(255,255,255,.07) !important; }
                html.dark .lr-root table td { border-color: rgba(255,255,255,.07) !important; color: #f5f5f7 !important; }
                html.dark .lr-root table tr:hover { background-color: rgba(255,255,255,.05) !important; }
            `}</style>
        </div>
    );
};

export default LoanRepaymentForm;
