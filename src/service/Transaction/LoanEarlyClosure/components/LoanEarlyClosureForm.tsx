import React, { useState } from 'react';
import { Modal } from 'antd';
import { Search, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { useLoanEarlyClosure } from '../hooks/useLoanEarlyClosure';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';
import MemberLookup from '../../../../components/shared/MemberLookup/MemberLookup';

type Props = ReturnType<typeof useLoanEarlyClosure>;

const LOAN_TYPE_LABEL: Record<string, string> = {
    RLN: 'Regular Loan', ELN: 'Emergency Loan', ALN: 'Additional Loan',
};

const fmt = (n: number | string) =>
    Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const LoanEarlyClosureForm: React.FC<Props> = ({
    form, activeLoans, quote, quoteLoading, loading, message, closed,
    updateForm, handleMemberLookup, handleLoanSelect, recalculate, handleExecuteClosure, handleReset,
}) => {
    const [showLookup, setShowLookup] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const onMemberSelected = (member: any) => {
        const memberNo = String(member.memberNo || '');
        const memberName = member.memberName || member.name || '';
        handleMemberLookup(memberNo, memberName);
        setShowLookup(false);
    };

    usePageToolbarActions({
        onSave: () => setShowConfirm(true),
        saveLabel: loading ? 'Closing...' : 'Close Loan',
        saveEnabled: !(loading || closed || !quote),
    });

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-900 border-b border-white/5 px-6 py-3 flex items-center justify-between shrink-0 shadow-lg">
                <div>
                    <h1 className="fz-heading font-semibold text-white">Loan Early Closure</h1>
                    <p className="fz-caption text-slate-400">Foreclose a loan — outstanding principal + reducing-balance interest + prior dues, no future interest charged</p>
                </div>
                <button
                    onClick={handleReset}
                    className="fz-button px-4 py-1.5 border border-white/20 rounded text-slate-200 hover:bg-white/10"
                >
                    Reset
                </button>
            </div>

            <div className="flex gap-4 p-4 flex-1 overflow-auto">
                {/* Left Panel — Member + Loan */}
                <div className="flex flex-col gap-4 w-[380px] shrink-0">
                    <div className="bg-white border border-slate-200 rounded-lg p-4">
                        <h2 className="fz-label font-semibold text-slate-700 mb-3">Member</h2>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Member No."
                                value={form.mbno}
                                onChange={e => updateForm('mbno', e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleMemberLookup(form.mbno, '')}
                                className="fz-body border border-slate-300 rounded px-3 py-1.5 w-28 focus:outline-none focus:border-violet-400"
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
                                className="fz-button px-3 py-1.5 bg-violet-600 text-white rounded hover:bg-violet-700 disabled:opacity-50"
                            >
                                Search
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowLookup(true)}
                                title="Member Lookup"
                                className="fz-button px-2.5 py-1.5 bg-slate-100 text-slate-600 rounded hover:bg-violet-600 hover:text-white transition-colors flex items-center justify-center shrink-0"
                            >
                                <Search size={14} />
                            </button>
                        </div>
                    </div>

                    {activeLoans.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-lg p-4">
                            <h2 className="fz-label font-semibold text-slate-700 mb-3">Select Loan to Close</h2>
                            <div className="flex flex-col gap-2">
                                {activeLoans.map(loan => (
                                    <label
                                        key={loan.loancaseno}
                                        className={`flex items-start gap-3 p-3 border rounded-md cursor-pointer transition-colors ${
                                            form.selectedLoanCase === loan.loancaseno
                                                ? 'border-violet-400 bg-violet-50'
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
                                            <span className="fz-caption text-slate-500">
                                                Balance: <span className="text-red-600 font-medium">₹{fmt(loan.balance)}</span>
                                            </span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {form.selectedLoanCase && (
                        <div className="bg-white border border-slate-200 rounded-lg p-4">
                            <h2 className="fz-label font-semibold text-slate-700 mb-3">Adjustment &amp; Receipt</h2>
                            <div className="flex flex-col gap-3">
                                <div>
                                    <label className="fz-caption text-slate-500 block mb-1">Applicable Adjustment (₹, ± optional)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            value={form.adjustment || ''}
                                            onChange={e => updateForm('adjustment', Number(e.target.value))}
                                            placeholder="0"
                                            className="fz-body border border-slate-300 rounded px-2 py-1.5 flex-1 focus:outline-none focus:border-violet-400"
                                        />
                                        <button
                                            onClick={recalculate}
                                            disabled={quoteLoading}
                                            className="fz-button px-3 py-1.5 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 disabled:opacity-50"
                                        >
                                            Recalculate
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="fz-caption text-slate-500 block mb-1">Receipt No.</label>
                                    <input
                                        type="text"
                                        value={form.receiptNo}
                                        onChange={e => updateForm('receiptNo', e.target.value)}
                                        className="fz-body border border-slate-300 rounded px-2 py-1.5 w-full focus:outline-none focus:border-violet-400"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {message && (
                        <div className={`p-3 rounded-lg text-sm ${
                            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                            {message.text}
                        </div>
                    )}
                </div>

                {/* Right Panel — Closure Quote */}
                <div className="flex-1 bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h2 className="fz-label font-semibold text-slate-700">Closure Quote</h2>
                            {form.memberName && <p className="fz-caption text-slate-500">{form.memberName} — #{form.mbno}</p>}
                        </div>
                        {quote && !closed && (
                            <span className="fz-caption text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 flex items-center gap-1">
                                <AlertTriangle size={12} /> Irreversible action
                            </span>
                        )}
                    </div>

                    <div className="flex-1 overflow-auto p-5">
                        {closed ? (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <CheckCircle2 size={48} className="text-green-500 mb-3" />
                                <div className="fz-body font-semibold text-slate-800">Loan closed</div>
                                <div className="fz-caption text-slate-500 mt-1 max-w-sm">{message?.text}</div>
                            </div>
                        ) : quoteLoading ? (
                            <div className="flex items-center justify-center h-32 text-slate-400 fz-body">Calculating closure amount...</div>
                        ) : !quote ? (
                            <div className="flex items-center justify-center h-32 text-slate-400 fz-body">
                                {form.mbno ? 'Select a loan case to see its closure quote.' : 'Search for a member to begin.'}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-slate-50 rounded-md border border-slate-200">
                                        <div className="fz-caption text-slate-500">Outstanding Principal</div>
                                        <div className="fz-body font-semibold text-slate-800">₹{fmt(quote.outstandingPrincipal)}</div>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-md border border-slate-200">
                                        <div className="fz-caption text-slate-500">Actual Interest to Date ({quote.daysSinceLastDue} days, reducing-balance)</div>
                                        <div className="fz-body font-semibold text-slate-800">₹{fmt(quote.actualInterestToDate)}</div>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-md border border-slate-200">
                                        <div className="fz-caption text-slate-500">Previous Overdue Interest</div>
                                        <div className="fz-body font-semibold text-slate-800">₹{fmt(quote.previousOverdueInterest)}</div>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-md border border-slate-200">
                                        <div className="fz-caption text-slate-500">Penal Interest</div>
                                        <div className="fz-body font-semibold text-red-600">₹{fmt(quote.penalInterest)}</div>
                                    </div>
                                    {quote.adjustment !== 0 && (
                                        <div className="p-3 bg-slate-50 rounded-md border border-slate-200 col-span-2">
                                            <div className="fz-caption text-slate-500">Applicable Adjustment</div>
                                            <div className="fz-body font-semibold text-slate-800">₹{fmt(quote.adjustment)}</div>
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 bg-violet-50 border-2 border-violet-200 rounded-lg flex items-center justify-between">
                                    <span className="fz-body font-semibold text-violet-900">Final Closure Amount</span>
                                    <span className="fz-heading font-bold text-violet-900">₹{fmt(quote.finalClosureAmount)}</span>
                                </div>

                                {quote.unpaidInstallments.length > 0 && (
                                    <div>
                                        <h3 className="fz-caption font-semibold text-slate-600 uppercase tracking-wide mb-2">
                                            {quote.unpaidInstallments.length} Installment(s) Contributing to Overdue Interest / Penal
                                        </h3>
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-slate-50">
                                                    {['#', 'Due Date', 'Principal Due', 'Interest Due', 'Penal Due', 'Overdue'].map(h => (
                                                        <th key={h} className="px-2 py-1.5 text-left fz-caption font-semibold text-slate-600 border-b border-slate-200">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {quote.unpaidInstallments.map(inst => (
                                                    <tr key={inst.installmentNo} className="border-b border-slate-100">
                                                        <td className="px-2 py-1.5 fz-caption text-slate-700">{inst.installmentNo}</td>
                                                        <td className="px-2 py-1.5 fz-caption text-slate-600">{inst.dueDate}</td>
                                                        <td className="px-2 py-1.5 fz-caption text-slate-700">₹{fmt(inst.principalDue)}</td>
                                                        <td className="px-2 py-1.5 fz-caption text-slate-700">₹{fmt(inst.interestDue)}</td>
                                                        <td className="px-2 py-1.5 fz-caption text-red-600">₹{fmt(inst.penalDue)}</td>
                                                        <td className="px-2 py-1.5 fz-caption text-slate-500">{inst.monthsOverdue > 0 ? `${inst.monthsOverdue}mo` : 'current'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                <button
                                    onClick={() => setShowConfirm(true)}
                                    disabled={loading}
                                    className="mt-2 w-full py-2.5 bg-violet-600 text-white rounded-md font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors"
                                >
                                    {loading ? 'Closing...' : `Close Loan — Collect ₹${fmt(quote.finalClosureAmount)}`}
                                </button>
                            </div>
                        )}
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

            {/* Confirm irreversible closure */}
            <Modal
                open={showConfirm}
                onCancel={() => setShowConfirm(false)}
                onOk={() => { setShowConfirm(false); handleExecuteClosure(); }}
                okText="Yes, Close Loan"
                okButtonProps={{ danger: true }}
                cancelText="Cancel"
                title="Confirm early closure"
            >
                <p className="fz-body text-slate-700">
                    This settles every remaining installment on loan #{form.selectedLoanCase} — including ones not yet due — and reduces its balance to zero.
                    This cannot be undone from this screen. Confirm ₹{quote ? fmt(quote.finalClosureAmount) : '—'} has actually been collected before proceeding.
                </p>
            </Modal>
        </div>
    );
};

export default LoanEarlyClosureForm;
