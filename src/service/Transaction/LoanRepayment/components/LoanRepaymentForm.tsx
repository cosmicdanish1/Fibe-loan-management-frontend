import React, { useState, useEffect } from 'react';
import { Modal } from 'antd';
import { Search, RefreshCw } from 'lucide-react';
import type { useLoanRepayment, UnpaidInstallment } from '../hooks/useLoanRepayment';
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
    RLN: 'Regular Loan', ALN: 'Emergency Loan', ELN: 'Loan Against Recovery',
};

const fmt = (n: number | string) =>
    Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TIER_LABEL: Record<number, string> = { 0: 'Grace', 1: 'Same-Month', 2: 'Monthly' };

interface WaterfallInstallmentResult {
    installmentNo: number;
    penalApplied: number;
    interestApplied: number;
    principalApplied: number;
    fullyCovered: boolean;
}

interface WaterfallResult {
    perInstallment: WaterfallInstallmentResult[];
    leftoverPrepayment: number;
    totalPrincipalApplied: number;
    /** Payment amount left over after even a full-balance prepayment — the
     *  real backend would leave this unapplied (it would overpay the loan). */
    unusedAmount: number;
}

/**
 * Simulates the real backend waterfall (recordLoanRepayment: oldest-first,
 * penal → interest → principal per installment, leftover applied as a
 * straight principal prepayment capped at the remaining balance) so the
 * screen can show exactly how a payment amount will actually be applied
 * before it's submitted — which installments get touched, and by how much —
 * instead of only the final balance-after number.
 */
function simulateWaterfall(paymentAmount: number, unpaidInstallments: UnpaidInstallment[], currentBalance: number): WaterfallResult {
    let remaining = paymentAmount;
    let totalPrincipalApplied = 0;
    const perInstallment: WaterfallInstallmentResult[] = [];
    for (const inst of unpaidInstallments) {
        if (remaining <= 0) break;
        const penalApplied = Math.min(remaining, inst.penalDue);
        remaining -= penalApplied;
        const interestApplied = Math.min(remaining, inst.interestDue);
        remaining -= interestApplied;
        const principalApplied = Math.min(remaining, inst.principalDue);
        remaining -= principalApplied;
        totalPrincipalApplied += principalApplied;
        if (penalApplied > 0 || interestApplied > 0 || principalApplied > 0) {
            perInstallment.push({
                installmentNo: inst.installmentNo,
                penalApplied, interestApplied, principalApplied,
                fullyCovered: penalApplied >= inst.penalDue && interestApplied >= inst.interestDue && principalApplied >= inst.principalDue,
            });
        }
    }
    let leftoverPrepayment = 0;
    if (remaining > 0) {
        leftoverPrepayment = Math.min(remaining, Math.max(0, currentBalance - totalPrincipalApplied));
        totalPrincipalApplied += leftoverPrepayment;
        remaining -= leftoverPrepayment;
    }
    return { perInstallment, leftoverPrepayment, totalPrincipalApplied, unusedAmount: Math.max(0, remaining) };
}

const LoanRepaymentForm: React.FC<Props> = ({
    form, activeLoans, dueStatus, dueStatusLoading, repaymentHistory, loading, historyLoading,
    message, updateForm, handleMemberLookup, handleLoanSelect, handleSubmit, handleReset,
}) => {
    const [showLookup, setShowLookup] = useState(false);
    const [loanSearch, setLoanSearch] = useState('');
    const [paymentMode, setPaymentMode] = useState<'due' | 'advance' | 'custom'>('due');
    const [advanceCount, setAdvanceCount] = useState(1);
    const [showAllHistory, setShowAllHistory] = useState(false);
    const [showEmiDetail, setShowEmiDetail] = useState(false);

    const selectedLoan = activeLoans.find(l => l.loancaseno === form.selectedLoanCase);
    const filteredLoans = activeLoans.filter(l =>
        loanSearch.trim() === '' || l.loancaseno.includes(loanSearch.trim())
    );
    // /repayment-history returns every loan the member has — narrow it to the
    // selected loan by default so a payment doesn't get lost among the rest.
    const filteredHistory = (form.selectedLoanCase && !showAllHistory)
        ? repaymentHistory.filter(r => String(r.loancaseno) === form.selectedLoanCase)
        : repaymentHistory;

    // Reset to "Pay What's Due" whenever a different loan is selected — an
    // advance/custom amount chosen for one loan shouldn't silently carry over.
    useEffect(() => {
        setPaymentMode('due');
        setAdvanceCount(1);
        setShowEmiDetail(false);
    }, [form.selectedLoanCase]);

    // Keep the amount field in sync with the selected mode. "Custom" leaves it
    // alone entirely — the operator types whatever figure they need.
    // "Pay What's Due" means exactly that — 0 when nothing is overdue, not a
    // silent fallback to the next not-yet-due EMI (that's what "Pay in
    // Advance" is for). Otherwise the button stays live after a member is
    // fully caught up, inviting an accidental repeat/advance payment.
    useEffect(() => {
        if (!selectedLoan || paymentMode === 'custom') return;
        const emi = parseFloat(selectedLoan.instal_amt as any) || 0;
        const due = dueStatus?.totalDue || 0;
        const amount = paymentMode === 'advance' ? due + advanceCount * emi : due;
        updateForm('paymentAmount', Math.round(amount * 100) / 100);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paymentMode, advanceCount, dueStatus, selectedLoan?.loancaseno]);

    const waterfall = selectedLoan && form.paymentAmount > 0
        ? simulateWaterfall(form.paymentAmount, dueStatus?.unpaidInstallments || [], parseFloat(selectedLoan.balance as any))
        : null;

    const onMemberSelected = (member: any) => {
        const memberNo = String(member.memberNo || '');
        const memberName = member.memberName || member.name || '';
        handleMemberLookup(memberNo, memberName);
        setShowLookup(false);
        setLoanSearch('');
    };

    usePageToolbarActions({
        onSave: handleSubmit,
        saveLabel: loading ? 'Recording...' : 'Record Repayment',
        saveEnabled: !(loading || form.paymentAmount <= 0),
    });

    return (
        <div className="lr-root flex flex-col h-full overflow-hidden" style={{ background: '#f4f5f7', color: '#1a1d29', fontSize: 13 }}>

            {/* ── Header ── */}
            <div className="lr-header flex items-center justify-between px-5 py-2.5 shrink-0" style={{ background: '#161822', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-baseline gap-2.5">
                    <h1 className="m-0 font-semibold text-white" style={{ fontSize: 15 }}>Loan Repayment</h1>
                    <span style={{ fontSize: 11.5, color: '#9296a8' }}>
                        Record monthly installment payments against active loans
                    </span>
                </div>
                <button
                    onClick={handleReset}
                    className="lr-ghost-btn flex items-center gap-1.5"
                    style={{ fontSize: 12, fontWeight: 500, padding: '5px 12px', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 6, background: 'transparent', color: '#d7d9e3', cursor: 'pointer' }}
                >
                    <RefreshCw size={12} /> Reset
                </button>
            </div>

            {/* ── Body ── */}
            <div className="flex gap-3.5 p-3.5 flex-1 overflow-auto items-start">

                {/* Left column */}
                <div className="flex flex-col gap-3" style={{ width: 340, flexShrink: 0 }}>

                    {/* ① Member search */}
                    <div className="lr-card" style={{ background: '#fff', border: '1px solid #e4e6eb', borderRadius: 8, padding: 12 }}>
                        <div className="lr-section-label">Member</div>
                        <div className="flex gap-1.5">
                            <input
                                type="text"
                                placeholder="Member No."
                                value={form.mbno}
                                onChange={e => updateForm('mbno', e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleMemberLookup(form.mbno, '')}
                                className="lr-input"
                                style={{ width: 80 }}
                            />
                            <input
                                type="text"
                                placeholder="Member name"
                                value={form.memberName}
                                readOnly
                                className="lr-input lr-input-readonly"
                                style={{ flex: 1, minWidth: 0 }}
                            />
                            <button
                                onClick={() => handleMemberLookup(form.mbno, '')}
                                disabled={loading || !form.mbno}
                                className="lr-btn-primary"
                                style={{ whiteSpace: 'nowrap' }}
                            >
                                Search
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowLookup(true)}
                                title="Member Lookup"
                                className="lr-btn-icon"
                                style={{ width: 30, flexShrink: 0 }}
                            >
                                <Search size={13} />
                            </button>
                        </div>
                    </div>

                    {/* ② Loan list */}
                    {activeLoans.length > 0 && (
                        <div className="lr-card" style={{ background: '#fff', border: '1px solid #e4e6eb', borderRadius: 8, padding: 12 }}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="lr-section-label" style={{ marginBottom: 0 }}>Select Loan</div>
                                <span style={{ fontSize: 11, color: '#8b90a0' }}>
                                    {filteredLoans.length} loan{filteredLoans.length !== 1 ? 's' : ''}
                                </span>
                            </div>

                            <div className="relative mb-2">
                                <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#8b90a0' }} />
                                <input
                                    type="text"
                                    value={loanSearch}
                                    onChange={e => setLoanSearch(e.target.value)}
                                    placeholder="Search by case no."
                                    className="lr-input"
                                    style={{ width: '100%', paddingLeft: 26 }}
                                />
                            </div>

                            <div className="flex flex-col gap-1.5" style={{ maxHeight: 200, overflowY: 'auto', overflowX: 'hidden', paddingRight: 2 }}>
                                {filteredLoans.map(loan => {
                                    const selected = form.selectedLoanCase === loan.loancaseno;
                                    return (
                                        <label
                                            key={loan.loancaseno}
                                            onClick={() => handleLoanSelect(loan.loancaseno)}
                                            style={{
                                                display: 'flex', gap: 9, alignItems: 'flex-start',
                                                padding: '9px 10px', borderRadius: 6, cursor: 'pointer',
                                                border: `1px solid ${selected ? '#a8c6f5' : '#eceef1'}`,
                                                background: selected ? '#eef4fd' : '#fff',
                                                transition: 'border-color 0.15s, background 0.15s',
                                            }}
                                        >
                                            <input
                                                type="radio"
                                                name="loanCase"
                                                value={loan.loancaseno}
                                                checked={selected}
                                                onChange={() => handleLoanSelect(loan.loancaseno)}
                                                style={{ marginTop: 2, accentColor: '#2563eb' }}
                                            />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div className="flex justify-between gap-2 mb-0.5">
                                                    <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1a1d29', whiteSpace: 'nowrap' }}>
                                                        {LOAN_TYPE_LABEL[loan.loantype] || loan.loantype}
                                                    </span>
                                                    <span style={{ fontSize: 11.5, color: '#8b90a0', whiteSpace: 'nowrap' }}>
                                                        #{loan.loancaseno}
                                                    </span>
                                                </div>
                                                <div className="flex gap-3" style={{ fontSize: 11.5, color: '#8b90a0', whiteSpace: 'nowrap' }}>
                                                    <span>Balance: <span style={{ color: '#dc2626', fontWeight: 600 }}>₹{fmt(loan.balance)}</span></span>
                                                    <span>EMI: <span style={{ color: '#1a1d29', fontWeight: 500 }}>₹{fmt(loan.instal_amt)}</span></span>
                                                </div>
                                            </div>
                                        </label>
                                    );
                                })}
                                {filteredLoans.length === 0 && loanSearch && (
                                    <div style={{ fontSize: 12, color: '#8b90a0', padding: '10px 4px', textAlign: 'center' }}>
                                        No loans match "{loanSearch}"
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ③ Payment details */}
                    {form.selectedLoanCase && (
                        <div className="lr-card" style={{ background: '#fff', border: '1px solid #e4e6eb', borderRadius: 8, padding: 12 }}>
                            <div className="lr-section-label">Payment Details</div>

                            {selectedLoan && (
                                <div className="flex flex-wrap" style={{ gap: '2px 16px', fontSize: 11.5, color: '#8b90a0', marginBottom: 10 }}>
                                    <span>Original: <b style={{ color: '#1a1d29', fontWeight: 600 }}>₹{fmt(selectedLoan.loan_amt)}</b></span>
                                    {dueStatus && (
                                        <span>Paid: <b style={{ color: '#1a1d29', fontWeight: 600 }}>{dueStatus.paidInstallments} of {dueStatus.totalInstallments}</b></span>
                                    )}
                                </div>
                            )}

                            {/* EMI card — click to expand the full "how this EMI was
                                built" trace. remainingCount uses totalInstallments minus
                                paidInstallments, same as the "Paid" figure above — an
                                estimate, since some remaining installments may already be
                                partly covered by advance prepayments not yet counted as
                                officially due. */}
                            {selectedLoan && dueStatus && (
                                <div
                                    onClick={() => setShowEmiDetail(v => !v)}
                                    style={{ marginBottom: 10, background: '#f7f8fa', border: '1px solid #eceef1', borderRadius: 7, padding: '10px 12px', cursor: 'pointer' }}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div style={{ fontSize: 11, color: '#8b90a0' }}>EMI</div>
                                            <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1d29' }}>₹{fmt(selectedLoan.instal_amt)}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: 11, color: '#8b90a0' }}>
                                                Remaining: {dueStatus.totalInstallments - dueStatus.paidInstallments} of {dueStatus.totalInstallments}
                                            </div>
                                            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#5b6072' }}>
                                                ≈ ₹{fmt((dueStatus.totalInstallments - dueStatus.paidInstallments) * dueStatus.emiBreakdown.instalAmt)} estimated
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 10.5, color: '#2563eb', marginTop: 4, fontWeight: 600 }}>
                                        {showEmiDetail ? '▲ Hide calculation' : '▼ Why is the EMI this amount?'}
                                    </div>

                                    {showEmiDetail && (
                                        <div
                                            onClick={e => e.stopPropagation()}
                                            style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e4e6eb', cursor: 'default' }}
                                        >
                                            <div style={{ fontFamily: "'IBM Plex Mono', 'Courier New', monospace", fontSize: 10.5, color: '#5b6072', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <div>
                                                    Monthly Principal = Loan Amount (₹{fmt(dueStatus.emiBreakdown.loanAmt)}) ÷ Installments ({dueStatus.emiBreakdown.noOfInstal})
                                                    {' '}= <b style={{ color: '#1a1d29' }}>₹{fmt(dueStatus.emiBreakdown.monthlyPrincipal)}</b>
                                                </div>
                                                {dueStatus.emiBreakdown.hasRbSchedule ? (
                                                    <>
                                                        <div>
                                                            Compulsory Slot Interest = Total EMI Interest (₹{fmt(dueStatus.emiBreakdown.totalInterestForEMI)}) − True Reducing-Balance Interest for the full schedule (₹{fmt(dueStatus.emiBreakdown.totalRBInterestFullSchedule)})
                                                            {' '}= <b style={{ color: '#1a1d29' }}>₹{fmt(dueStatus.emiBreakdown.compulsorySlotInterest)}</b>
                                                        </div>
                                                        <div>
                                                            Monthly Interest = (RB Interest ₹{fmt(dueStatus.emiBreakdown.totalRBInterestFullSchedule)} + Slot Interest ₹{fmt(dueStatus.emiBreakdown.compulsorySlotInterest)}) ÷ Installments ({dueStatus.emiBreakdown.noOfInstal})
                                                            {' '}= <b style={{ color: '#1a1d29' }}>₹{fmt(dueStatus.emiBreakdown.monthlyInterestForEMI)}</b>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div>
                                                        This loan predates the reducing-balance schedule feature — Monthly Interest is a simple flat split
                                                        {' '}= <b style={{ color: '#1a1d29' }}>₹{fmt(dueStatus.emiBreakdown.monthlyInterestForEMI)}</b>
                                                    </div>
                                                )}
                                                <div style={{ paddingTop: 4, borderTop: '1px solid #e4e6eb' }}>
                                                    EMI = Monthly Principal (₹{fmt(dueStatus.emiBreakdown.monthlyPrincipal)}) + Monthly Interest (₹{fmt(dueStatus.emiBreakdown.monthlyInterestForEMI)})
                                                    {' '}= <b style={{ color: '#1e40af' }}>₹{fmt(dueStatus.emiBreakdown.instalAmt)}</b>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {dueStatusLoading ? (
                                <div style={{ fontSize: 11.5, color: '#8b90a0', marginBottom: 10 }}>Checking outstanding dues…</div>
                            ) : dueStatus && dueStatus.unpaidInstallments.length > 0 ? (
                                <div className="flex items-center justify-between" style={{ marginBottom: 10, border: '1px solid #f3dca8', background: '#fef3e0', borderRadius: 6, padding: '7px 10px' }}>
                                    <span style={{ fontSize: 11.5, fontWeight: 600, color: '#a15c00' }}>
                                        {dueStatus.unpaidInstallments.length} overdue — oldest recovered first
                                    </span>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#a15c00' }}>₹{fmt(dueStatus.totalDue)}</span>
                                </div>
                            ) : dueStatus ? (
                                <div style={{ marginBottom: 10, fontSize: 11.5, color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '7px 10px' }}>
                                    Fully paid up — nothing currently due. Switch to "Pay in Advance" to prepay a future installment.
                                </div>
                            ) : null}

                            {/* Payment mode */}
                            <div style={{ marginBottom: 10 }}>
                                <label className="lr-field-label">Payment Mode</label>
                                <div className="flex gap-1.5">
                                    {([
                                        { key: 'due', label: "Pay What's Due" },
                                        { key: 'advance', label: 'Pay in Advance' },
                                        { key: 'custom', label: 'Custom' },
                                    ] as const).map(m => (
                                        <button
                                            key={m.key}
                                            type="button"
                                            onClick={() => setPaymentMode(m.key)}
                                            style={{
                                                fontSize: 11.5, fontWeight: 600, padding: '6px 9px', borderRadius: 6,
                                                border: `1px solid ${paymentMode === m.key ? '#2563eb' : '#d7dae0'}`,
                                                background: paymentMode === m.key ? '#2563eb' : '#fff',
                                                color: paymentMode === m.key ? '#fff' : '#5b6072',
                                                cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s',
                                            }}
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                                {paymentMode === 'advance' && (
                                    <div className="flex items-center gap-2" style={{ marginTop: 8 }}>
                                        <label style={{ fontSize: 11.5, color: '#8b90a0' }}>Installments ahead:</label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={advanceCount}
                                            onChange={e => setAdvanceCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                            className="lr-input"
                                            style={{ width: 56, textAlign: 'center' }}
                                        />
                                        <span style={{ fontSize: 11, color: '#a3a8b3' }}>
                                            × ₹{fmt(selectedLoan?.instal_amt || 0)} EMI, on top of what's due
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                                <div>
                                    <label className="lr-field-label">Amount (₹)</label>
                                    <input
                                        type="number"
                                        value={form.paymentAmount || ''}
                                        onChange={e => updateForm('paymentAmount', Number(e.target.value))}
                                        readOnly={paymentMode !== 'custom'}
                                        className={`lr-input ${paymentMode !== 'custom' ? 'lr-input-readonly' : ''}`}
                                        style={{ width: '100%' }}
                                        placeholder={selectedLoan ? `EMI: ${fmt(selectedLoan.instal_amt)}` : ''}
                                    />
                                    {paymentMode !== 'custom' && (
                                        <p style={{ fontSize: 10.5, color: '#a3a8b3', marginTop: 3 }}>
                                            Auto-filled by the selected mode — switch to "Custom" to edit directly.
                                        </p>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="lr-field-label">Receipt No.</label>
                                        <input
                                            type="text"
                                            value={form.receiptNo}
                                            onChange={e => updateForm('receiptNo', e.target.value)}
                                            className="lr-input"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div>
                                        <label className="lr-field-label">Narration</label>
                                        <input
                                            type="text"
                                            value={form.narration}
                                            onChange={e => updateForm('narration', e.target.value)}
                                            className="lr-input"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {selectedLoan && (
                                <div style={{ marginTop: 10, padding: '10px 12px', background: '#f7f8fa', border: '1px solid #eceef1', borderRadius: 7 }}>
                                    <div className="flex justify-between" style={{ fontSize: 11.5, color: '#8b90a0' }}>
                                        <span>Outstanding Balance</span>
                                        <span style={{ fontWeight: 600, color: '#dc2626' }}>₹{fmt(selectedLoan.balance)}</span>
                                    </div>
                                    <div className="flex justify-between" style={{ fontSize: 11.5, color: '#8b90a0', marginTop: 4 }}>
                                        <span>Balance After Payment</span>
                                        <span style={{ fontWeight: 600, color: '#15803d' }}>
                                            ₹{fmt(Math.max(0, parseFloat(selectedLoan.balance as any) - (waterfall?.totalPrincipalApplied || 0)))}
                                        </span>
                                    </div>
                                    {waterfall && waterfall.leftoverPrepayment > 0 && (
                                        <div style={{ fontSize: 10.5, color: '#8b90a0', marginTop: 6, paddingTop: 6, borderTop: '1px solid #e4e6eb' }}>
                                            ₹{fmt(waterfall.leftoverPrepayment)} beyond what's currently due will be applied as an advance against principal.
                                        </div>
                                    )}
                                    {waterfall && waterfall.unusedAmount > 0.01 && (
                                        <div style={{ fontSize: 10.5, color: '#a15c00', marginTop: 6, paddingTop: 6, borderTop: '1px solid #e4e6eb' }}>
                                            ₹{fmt(waterfall.unusedAmount)} exceeds the outstanding balance — it will not be applied (would overpay the loan).
                                        </div>
                                    )}
                                </div>
                            )}

                            {message && (
                                <div style={{
                                    marginTop: 10, padding: '9px 11px', borderRadius: 6, fontSize: 12,
                                    background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
                                    color: message.type === 'success' ? '#15803d' : '#b91c1c',
                                    border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                                }}>
                                    {message.text}
                                </div>
                            )}

                            <button
                                onClick={handleSubmit}
                                disabled={loading || form.paymentAmount <= 0}
                                style={{
                                    width: '100%', marginTop: 12, padding: 10, background: '#16a34a', color: '#fff',
                                    border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600,
                                    cursor: loading || form.paymentAmount <= 0 ? 'not-allowed' : 'pointer',
                                    opacity: loading || form.paymentAmount <= 0 ? 0.5 : 1,
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={e => { if (!loading && form.paymentAmount > 0) (e.currentTarget as HTMLButtonElement).style.background = '#15803d'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#16a34a'; }}
                            >
                                {loading ? 'Recording…' : 'Record Repayment'}
                            </button>
                        </div>
                    )}

                    {message && !form.selectedLoanCase && (
                        <div style={{
                            padding: '10px 12px', borderRadius: 7, fontSize: 12.5,
                            background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
                            color: message.type === 'success' ? '#15803d' : '#b91c1c',
                            border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                        }}>
                            {message.text}
                        </div>
                    )}
                </div>

                {/* Right column */}
                <div className="flex-1 flex flex-col gap-3" style={{ minWidth: 0 }}>

                    {/* This Payment Will Cover */}
                    {form.selectedLoanCase && waterfall && waterfall.perInstallment.length > 0 && (
                        <div style={{ background: '#fff', border: '1px solid #a8c6f5', borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                            <div style={{ padding: '10px 14px', borderBottom: '1px solid #dbeafe', background: '#eef4fd' }}>
                                <h2 style={{ fontSize: 12.5, fontWeight: 600, color: '#1e40af', margin: 0 }}>This Payment Will Cover</h2>
                            </div>
                            <div className="flex flex-col gap-1.5" style={{ padding: 11 }}>
                                {waterfall.perInstallment.map(w => (
                                    <div key={w.installmentNo} className="flex items-center justify-between" style={{ fontSize: 11.5, background: '#f7f8fa', border: '1px solid #eceef1', borderRadius: 6, padding: '7px 10px' }}>
                                        <span style={{ color: '#1a1d29' }}>
                                            Installment #{w.installmentNo}{' '}
                                            <span style={{ fontWeight: 600, color: w.fullyCovered ? '#15803d' : '#a15c00' }}>
                                                {w.fullyCovered ? '(fully settled)' : '(partially covered)'}
                                            </span>
                                        </span>
                                        <span style={{ color: '#5b6072' }}>
                                            {w.penalApplied > 0 && `₹${fmt(w.penalApplied)} penal + `}
                                            {w.interestApplied > 0 && `₹${fmt(w.interestApplied)} interest + `}
                                            ₹{fmt(w.principalApplied)} principal
                                        </span>
                                    </div>
                                ))}
                                {waterfall.leftoverPrepayment > 0 && (
                                    <div className="flex items-center justify-between" style={{ fontSize: 11.5, background: '#f7f8fa', border: '1px solid #eceef1', borderRadius: 6, padding: '7px 10px' }}>
                                        <span style={{ color: '#1a1d29' }}>Advance principal prepayment</span>
                                        <span style={{ color: '#5b6072' }}>₹{fmt(waterfall.leftoverPrepayment)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Overdue installments */}
                    {form.selectedLoanCase && dueStatus && dueStatus.unpaidInstallments.length > 0 && (
                        <div style={{ background: '#fff', border: '1px solid #f3dca8', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column', flexShrink: 0, maxHeight: 300 }}>
                            <div className="flex items-center justify-between" style={{ padding: '10px 14px', borderBottom: '1px solid #f3dca8', background: '#fef3e0' }}>
                                <h2 style={{ fontSize: 12.5, fontWeight: 600, color: '#a15c00', margin: 0 }}>
                                    {dueStatus.unpaidInstallments.length} Installment(s) Overdue — Oldest Recovered First
                                </h2>
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#a15c00' }}>₹{fmt(dueStatus.totalDue)}</span>
                            </div>
                            <div style={{ overflow: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr>
                                            {['#', 'Month', 'Overdue', 'Principal', 'Interest', 'Penal', 'Tier', 'Total'].map(h => (
                                                <th key={h} style={{ textAlign: 'left', fontSize: 10.5, fontWeight: 600, color: '#8b90a0', padding: '6px 8px', borderBottom: '1px solid #eceef1', background: '#f7f8fa' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dueStatus.unpaidInstallments.map(inst => (
                                            <tr key={inst.installmentNo}>
                                                <td style={{ fontSize: 12, color: '#1a1d29', padding: '7px 8px', borderBottom: '1px solid #f2f3f5' }}>{inst.installmentNo}</td>
                                                <td style={{ fontSize: 12, color: '#5b6072', padding: '7px 8px', borderBottom: '1px solid #f2f3f5' }}>
                                                    {MONTHS[new Date(inst.dueDate).getMonth()]?.label?.slice(0, 3)} {new Date(inst.dueDate).getFullYear()}
                                                </td>
                                                <td style={{ fontSize: 12, color: '#dc2626', padding: '7px 8px', borderBottom: '1px solid #f2f3f5' }}>{inst.monthsOverdue > 0 ? `${inst.monthsOverdue}mo` : 'current'}</td>
                                                <td style={{ fontSize: 12, color: '#1a1d29', padding: '7px 8px', borderBottom: '1px solid #f2f3f5' }}>₹{fmt(inst.principalDue)}</td>
                                                <td style={{ fontSize: 12, color: '#1a1d29', padding: '7px 8px', borderBottom: '1px solid #f2f3f5' }}>₹{fmt(inst.interestDue)}</td>
                                                <td style={{ fontSize: 12, color: '#dc2626', padding: '7px 8px', borderBottom: '1px solid #f2f3f5' }}>{inst.penalDue > 0 ? `₹${fmt(inst.penalDue)}` : '—'}</td>
                                                <td style={{ fontSize: 12, color: '#8b90a0', padding: '7px 8px', borderBottom: '1px solid #f2f3f5' }}>{TIER_LABEL[inst.tier]}</td>
                                                <td style={{ fontSize: 12, fontWeight: 500, color: '#1a1d29', padding: '7px 8px', borderBottom: '1px solid #f2f3f5' }}>₹{fmt(inst.principalDue + inst.interestDue + inst.penalDue)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Repayment history — filtered to the selected loan by default,
                        since /repayment-history returns every loan the member has and
                        it's otherwise easy to lose the payment you just made in someone
                        else's history. Toggle to see everything when that's what's needed. */}
                    <div style={{ flex: 1, minHeight: 0, background: '#fff', border: '1px solid #e4e6eb', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div className="flex items-center justify-between" style={{ padding: '10px 14px', borderBottom: '1px solid #eceef1' }}>
                            <div>
                                <h2 style={{ fontSize: 12.5, fontWeight: 600, color: '#1a1d29', margin: 0 }}>
                                    Repayment History
                                    {form.selectedLoanCase && !showAllHistory && <span style={{ color: '#8b90a0', fontWeight: 500 }}> — Loan #{form.selectedLoanCase}</span>}
                                </h2>
                                {form.memberName && <p style={{ fontSize: 11.5, color: '#8b90a0', margin: '1px 0 0' }}>{form.memberName} — #{form.mbno}</p>}
                            </div>
                            {form.selectedLoanCase && (
                                <button
                                    type="button"
                                    onClick={() => setShowAllHistory(v => !v)}
                                    style={{ fontSize: 11, fontWeight: 600, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                >
                                    {showAllHistory ? 'Show this loan only' : "Show all this member's loans"}
                                </button>
                            )}
                        </div>
                        <div style={{ overflow: 'auto', flex: 1 }}>
                            {historyLoading ? (
                                <div className="flex items-center justify-center" style={{ height: 128, color: '#8b90a0', fontSize: 13 }}>Loading…</div>
                            ) : filteredHistory.length === 0 ? (
                                <div className="flex items-center justify-center" style={{ height: 128, color: '#8b90a0', fontSize: 13 }}>
                                    {!form.mbno
                                        ? 'Search for a member to view history.'
                                        : form.selectedLoanCase && !showAllHistory
                                            ? 'No repayment records found for this loan yet.'
                                            : 'No repayment records found.'}
                                </div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr>
                                            {['Loan Case', 'Type', 'Month/Year', 'Amount', 'Receipt', 'Remaining', 'Date'].map(h => (
                                                <th key={h} style={{ textAlign: 'left', fontSize: 10.5, fontWeight: 600, color: '#8b90a0', padding: '7px 8px', borderBottom: '1px solid #eceef1', background: '#f7f8fa' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredHistory.map((row, i) => (
                                            <tr key={i}>
                                                <td style={{ fontSize: 12, color: '#1a1d29', padding: '7px 8px', borderBottom: '1px solid #f2f3f5' }}>{row.loancaseno}</td>
                                                <td style={{ fontSize: 12, color: '#5b6072', padding: '7px 8px', borderBottom: '1px solid #f2f3f5' }}>{LOAN_TYPE_LABEL[row.loantype] || row.loantype}</td>
                                                <td style={{ fontSize: 12, color: '#5b6072', padding: '7px 8px', borderBottom: '1px solid #f2f3f5' }}>{MONTHS.find(m => m.value === row.payment_month)?.label?.slice(0, 3)} {row.payment_year}</td>
                                                <td style={{ fontSize: 12, fontWeight: 500, color: '#1a1d29', padding: '7px 8px', borderBottom: '1px solid #f2f3f5' }}>₹{fmt(row.payment_amount)}</td>
                                                <td style={{ fontSize: 12, color: '#8b90a0', padding: '7px 8px', borderBottom: '1px solid #f2f3f5' }}>{row.receipt_no || '—'}</td>
                                                <td style={{ fontSize: 12, color: '#dc2626', padding: '7px 8px', borderBottom: '1px solid #f2f3f5' }}>₹{fmt(row.remaining_balance)}</td>
                                                <td style={{ fontSize: 12, color: '#8b90a0', padding: '7px 8px', borderBottom: '1px solid #f2f3f5' }}>{row.payment_date ? new Date(row.payment_date).toLocaleDateString('en-IN') : '—'}</td>
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
                .lr-section-label {
                    font-size: 11px; font-weight: 600; text-transform: uppercase;
                    letter-spacing: 0.4px; color: #6b7280; margin-bottom: 8px;
                }
                .lr-field-label {
                    display: block; font-size: 11px; color: #8b90a0; margin-bottom: 4px;
                }
                .lr-input {
                    font-size: 12.5px; padding: 6px 8px;
                    border: 1px solid #d7dae0; border-radius: 6px; outline: none;
                    color: #1a1d29; background: #fff; transition: border-color 0.15s;
                }
                .lr-input:focus { border-color: #2563eb; }
                .lr-input-readonly { background: #f7f8fa !important; color: #4b5160 !important; border-color: #eceef1 !important; }
                .lr-btn-primary {
                    font-size: 12px; font-weight: 600; padding: 6px 12px;
                    border: none; border-radius: 6px; background: #2563eb; color: #fff;
                    cursor: pointer; transition: background 0.15s;
                }
                .lr-btn-primary:hover:not(:disabled) { background: #1d4ed8; }
                .lr-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
                .lr-btn-icon {
                    display: flex; align-items: center; justify-content: center;
                    border: none; border-radius: 6px; background: #f0f1f4; color: #5b6072;
                    cursor: pointer; transition: background 0.15s, color 0.15s;
                }
                .lr-btn-icon:hover { background: #2563eb; color: #fff; }
                .lr-ghost-btn { transition: background 0.15s; }
                .lr-ghost-btn:hover { background: rgba(255,255,255,0.08) !important; }

                /* ── Dark mode ── */
                html.dark .lr-root { background: #000 !important; color: #f5f5f7 !important; }
                html.dark .lr-header { background: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; }
                html.dark .lr-card,
                html.dark .lr-root [style*="background: #fff"],
                html.dark .lr-root [style*="background:#fff"],
                html.dark .lr-root [style*="background: rgb(255, 255, 255)"] { background: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
                html.dark .lr-section-label,
                html.dark .lr-field-label { color: #8e8e93 !important; }
                html.dark .lr-input {
                    background: rgba(255,255,255,.05) !important; color: #f5f5f7 !important;
                    border-color: rgba(255,255,255,.08) !important;
                }
                html.dark .lr-input-readonly { background: rgba(255,255,255,.03) !important; color: #8e8e93 !important; }
                html.dark .lr-input::placeholder { color: #71717a !important; }
                html.dark .lr-btn-icon { background: #2c2c2e !important; color: #f5f5f7 !important; }
                html.dark .lr-root [style*="background: #f7f8fa"],
                html.dark .lr-root [style*="background:#f7f8fa"] { background: rgba(255,255,255,.04) !important; }
                html.dark .lr-root [style*="background: #eef4fd"],
                html.dark .lr-root [style*="background:#eef4fd"] { background: rgba(37,99,235,.14) !important; }
                html.dark .lr-root [style*="background: #fef3e0"],
                html.dark .lr-root [style*="background:#fef3e0"] { background: rgba(251,191,36,.12) !important; }
                html.dark .lr-root [style*="background: #f0fdf4"],
                html.dark .lr-root [style*="background:#f0fdf4"] { background: rgba(52,211,153,.12) !important; }
                html.dark .lr-root [style*="background: #fef2f2"],
                html.dark .lr-root [style*="background:#fef2f2"] { background: rgba(255,69,58,.12) !important; }
                html.dark .lr-root [style*="color: #1a1d29"],
                html.dark .lr-root [style*="color:#1a1d29"] { color: #f5f5f7 !important; }
                html.dark .lr-root [style*="color: #5b6072"],
                html.dark .lr-root [style*="color:#5b6072"],
                html.dark .lr-root [style*="color: #6b7280"],
                html.dark .lr-root [style*="color:#6b7280"],
                html.dark .lr-root [style*="color: #8b90a0"],
                html.dark .lr-root [style*="color:#8b90a0"],
                html.dark .lr-root [style*="color: #a3a8b3"],
                html.dark .lr-root [style*="color:#a3a8b3"] { color: #8e8e93 !important; }
                html.dark .lr-root [style*="color: #dc2626"],
                html.dark .lr-root [style*="color:#dc2626"] { color: #ff453a !important; }
                html.dark .lr-root [style*="color: #15803d"],
                html.dark .lr-root [style*="color:#15803d"] { color: #34d399 !important; }
                html.dark .lr-root [style*="color: #1e40af"],
                html.dark .lr-root [style*="color:#1e40af"] { color: #93c5fd !important; }
                html.dark .lr-root [style*="color: #a15c00"],
                html.dark .lr-root [style*="color:#a15c00"] { color: #fbbf24 !important; }
                html.dark .lr-root [style*="border-bottom: 1px solid #eceef1"],
                html.dark .lr-root [style*="border-top: 1px solid #e4e6eb"] { border-color: rgba(255,255,255,.07) !important; }
                html.dark .lr-root table th { color: #8e8e93 !important; background: #1c1c1e !important; border-color: rgba(255,255,255,.07) !important; }
                html.dark .lr-root table td { border-color: rgba(255,255,255,.07) !important; }
                html.dark .lr-root label[style*="background: #eef4fd"],
                html.dark .lr-root label[style*="background:#eef4fd"] { background: rgba(37,99,235,.15) !important; border-color: rgba(37,99,235,.4) !important; }
                html.dark .lr-root label[style*="background: #fff"],
                html.dark .lr-root label[style*="background:#fff"] { background: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
                html.dark .ant-modal-content, html.dark .ant-modal-header {
                    background-color: #1c1c1e !important; color: #f5f5f7 !important; border-color: rgba(255,255,255,.08) !important;
                }
            `}</style>
        </div>
    );
};

export default LoanRepaymentForm;
