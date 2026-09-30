import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Users, CreditCard, IndianRupee, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import type { useLoanRepayment, UnpaidInstallment } from '../hooks/useLoanRepayment';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';
import MemberField from '@/components/shared/kit/MemberField';

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
        setLoanSearch('');
    };

    usePageToolbarActions({
        onSave: handleSubmit,
        saveLabel: loading ? 'Recording...' : 'Record Repayment',
        saveEnabled: !(loading || form.paymentAmount <= 0),
    });

    return (
        <div className="app-window">
            {/* ── Header ── */}
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">Loan Repayment</h1>
                    <p className="aw-desc">Record monthly installment payments against active loans</p>
                </div>
                <div className="aw-actions">
                    <button type="button" onClick={handleReset} className="aw-btn aw-btn-secondary">
                        <RefreshCw size={13} /> Reset
                    </button>
                </div>
            </div>

            <div className="aw-content">
                <div className="aw-split aw-split-form" style={{ height: 'auto', gridTemplateColumns: 'minmax(320px, 4fr) minmax(0, 8fr)', alignItems: 'start' }}>

                    {/* ── Left column ── */}
                    <div className="aw-stack" style={{ minWidth: 0 }}>

                        {/* ① Member */}
                        <section className="aw-card">
                            <div className="aw-card-head">
                                <span className="aw-card-icon"><Users size={14} /></span>
                                <h2 className="aw-card-title">Member</h2>
                            </div>
                            <div className="aw-stack">
                                <div className="aw-inline" style={{ alignItems: 'flex-end', gap: 8 }}>
                                    <div style={{ width: 150 }}>
                                        <label className="aw-label" htmlFor="lr-mb">Member No.</label>
                                        <MemberField
                                            id="lr-mb"
                                            value={form.mbno}
                                            onChange={v => updateForm('mbno', v)}
                                            onSelect={onMemberSelected}
                                            onSubmit={(v) => handleMemberLookup(v, '')}
                                            placeholder="Member No."
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleMemberLookup(form.mbno, '')}
                                        disabled={loading || !form.mbno}
                                        className="aw-btn aw-btn-primary"
                                    >
                                        Search
                                    </button>
                                </div>
                                <div>
                                    <label className="aw-label" htmlFor="lr-name">Member name</label>
                                    <input id="lr-name" type="text" placeholder="Member name" value={form.memberName} readOnly className="aw-input" />
                                </div>
                            </div>
                        </section>

                        {/* ② Loan list */}
                        {activeLoans.length > 0 && (
                            <section className="aw-card aw-fade-in">
                                <div className="aw-card-head">
                                    <span className="aw-card-icon"><CreditCard size={14} /></span>
                                    <h2 className="aw-card-title">Select Loan</h2>
                                    <span className="aw-meta" style={{ marginLeft: 'auto' }}>{filteredLoans.length} loan{filteredLoans.length !== 1 ? 's' : ''}</span>
                                </div>
                                <div className="aw-input-wrap has-icon">
                                    <Search size={13} />
                                    <input type="text" value={loanSearch} onChange={e => setLoanSearch(e.target.value)} placeholder="Search by case no." aria-label="Search by case number" className="aw-input" />
                                </div>
                                <div className="aw-stack" style={{ gap: 6, maxHeight: 220, overflowY: 'auto' }} role="radiogroup" aria-label="Active loans">
                                    {filteredLoans.map(loan => {
                                        const selected = form.selectedLoanCase === loan.loancaseno;
                                        return (
                                            <button
                                                key={loan.loancaseno}
                                                type="button"
                                                role="radio"
                                                aria-checked={selected}
                                                onClick={() => handleLoanSelect(loan.loancaseno)}
                                                className="aw-right-cell"
                                                style={{ flexDirection: 'column', alignItems: 'stretch', gap: 2, padding: '9px 10px', border: `1px solid ${selected ? 'var(--aw-accent)' : 'var(--aw-border)'}` }}
                                            >
                                                <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                                    <span className="aw-strong">{LOAN_TYPE_LABEL[loan.loantype] || loan.loantype}</span>
                                                    <span className="aw-meta">#{loan.loancaseno}</span>
                                                </span>
                                                <span style={{ display: 'flex', gap: 12 }} className="aw-meta">
                                                    <span>Balance: <strong style={{ color: 'var(--aw-danger)' }}>₹{fmt(loan.balance)}</strong></span>
                                                    <span>EMI: <strong style={{ color: 'var(--aw-text)' }}>₹{fmt(loan.instal_amt)}</strong></span>
                                                </span>
                                            </button>
                                        );
                                    })}
                                    {filteredLoans.length === 0 && loanSearch && (
                                        <p className="aw-meta" style={{ textAlign: 'center', padding: '10px 4px' }}>No loans match "{loanSearch}"</p>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* ③ Payment details */}
                        {form.selectedLoanCase && (
                            <section className="aw-card aw-fade-in">
                                <div className="aw-card-head">
                                    <span className="aw-card-icon"><IndianRupee size={14} /></span>
                                    <h2 className="aw-card-title">Payment Details</h2>
                                </div>

                                <div className="aw-stack">
                                    {selectedLoan && (
                                        <p className="aw-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 16px' }}>
                                            <span>Original: <strong style={{ color: 'var(--aw-text)' }}>₹{fmt(selectedLoan.loan_amt)}</strong></span>
                                            {dueStatus && <span>Paid: <strong style={{ color: 'var(--aw-text)' }}>{dueStatus.paidInstallments} of {dueStatus.totalInstallments}</strong></span>}
                                        </p>
                                    )}

                                    {/* EMI card — click to expand the full "how this EMI was built" trace.
                                        remainingCount uses totalInstallments minus paidInstallments, same as
                                        the "Paid" figure above — an estimate, since some remaining installments
                                        may already be partly covered by advance prepayments not yet counted as
                                        officially due. */}
                                    {selectedLoan && dueStatus && (
                                        <div className="aw-panel">
                                            <button
                                                type="button"
                                                onClick={() => setShowEmiDetail(v => !v)}
                                                aria-expanded={showEmiDetail}
                                                style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}
                                            >
                                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                                    <span>
                                                        <span className="aw-label" style={{ marginBottom: 0 }}>EMI</span>
                                                        <span className="aw-strong" style={{ fontSize: 'calc(var(--type-body-size) + 3px)' }}>₹{fmt(selectedLoan.instal_amt)}</span>
                                                    </span>
                                                    <span style={{ textAlign: 'right' }}>
                                                        <span className="aw-meta" style={{ display: 'block' }}>Remaining: {dueStatus.totalInstallments - dueStatus.paidInstallments} of {dueStatus.totalInstallments}</span>
                                                        <span className="aw-strong" style={{ fontWeight: 600 }}>≈ ₹{fmt((dueStatus.totalInstallments - dueStatus.paidInstallments) * dueStatus.emiBreakdown.instalAmt)} estimated</span>
                                                    </span>
                                                </span>
                                                <span className="aw-meta" style={{ display: 'block', marginTop: 4, color: 'var(--aw-accent)', fontWeight: 700 }}>
                                                    {showEmiDetail ? '▲ Hide calculation' : '▼ Why is the EMI this amount?'}
                                                </span>
                                            </button>

                                            {showEmiDetail && (
                                                <div className="aw-fade-in" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--aw-border)' }}>
                                                    <div className="aw-meta" style={{ fontFamily: "'IBM Plex Mono', 'Courier New', monospace", lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                        <div>
                                                            Monthly Principal = Loan Amount (₹{fmt(dueStatus.emiBreakdown.loanAmt)}) ÷ Installments ({dueStatus.emiBreakdown.noOfInstal})
                                                            {' '}= <b style={{ color: 'var(--aw-text)' }}>₹{fmt(dueStatus.emiBreakdown.monthlyPrincipal)}</b>
                                                        </div>
                                                        {dueStatus.emiBreakdown.hasRbSchedule ? (
                                                            <>
                                                                <div>
                                                                    Compulsory Slot Interest = Total EMI Interest (₹{fmt(dueStatus.emiBreakdown.totalInterestForEMI)}) − True Reducing-Balance Interest for the full schedule (₹{fmt(dueStatus.emiBreakdown.totalRBInterestFullSchedule)})
                                                                    {' '}= <b style={{ color: 'var(--aw-text)' }}>₹{fmt(dueStatus.emiBreakdown.compulsorySlotInterest)}</b>
                                                                </div>
                                                                <div>
                                                                    Monthly Interest = (RB Interest ₹{fmt(dueStatus.emiBreakdown.totalRBInterestFullSchedule)} + Slot Interest ₹{fmt(dueStatus.emiBreakdown.compulsorySlotInterest)}) ÷ Installments ({dueStatus.emiBreakdown.noOfInstal})
                                                                    {' '}= <b style={{ color: 'var(--aw-text)' }}>₹{fmt(dueStatus.emiBreakdown.monthlyInterestForEMI)}</b>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div>
                                                                This loan predates the reducing-balance schedule feature — Monthly Interest is a simple flat split
                                                                {' '}= <b style={{ color: 'var(--aw-text)' }}>₹{fmt(dueStatus.emiBreakdown.monthlyInterestForEMI)}</b>
                                                            </div>
                                                        )}
                                                        <div style={{ paddingTop: 4, borderTop: '1px solid var(--aw-border)' }}>
                                                            EMI = Monthly Principal (₹{fmt(dueStatus.emiBreakdown.monthlyPrincipal)}) + Monthly Interest (₹{fmt(dueStatus.emiBreakdown.monthlyInterestForEMI)})
                                                            {' '}= <b style={{ color: 'var(--aw-accent)' }}>₹{fmt(dueStatus.emiBreakdown.instalAmt)}</b>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {dueStatusLoading ? (
                                        <p className="aw-meta" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><RefreshCw size={12} className="aw-spin" /> Checking outstanding dues…</p>
                                    ) : dueStatus && dueStatus.unpaidInstallments.length > 0 ? (
                                        <div className="aw-alert aw-alert-warning" style={{ marginBottom: 0, justifyContent: 'space-between' }}>
                                            <span>{dueStatus.unpaidInstallments.length} overdue — oldest recovered first</span>
                                            <span>₹{fmt(dueStatus.totalDue)}</span>
                                        </div>
                                    ) : dueStatus ? (
                                        <div className="aw-alert aw-alert-success" style={{ marginBottom: 0 }}>
                                            <CheckCircle2 size={15} />
                                            <span>Fully paid up — nothing currently due. Switch to "Pay in Advance" to prepay a future installment.</span>
                                        </div>
                                    ) : null}

                                    {/* Payment mode */}
                                    <div>
                                        <span className="aw-label">Payment Mode</span>
                                        <div className="aw-seg" role="tablist" style={{ ['--seg-index' as any]: paymentMode === 'due' ? 0 : paymentMode === 'advance' ? 1 : 2, ['--seg-count' as any]: 3 }}>
                                            {([
                                                { key: 'due', label: "Pay What's Due" },
                                                { key: 'advance', label: 'Pay in Advance' },
                                                { key: 'custom', label: 'Custom' },
                                            ] as const).map(m => (
                                                <button key={m.key} type="button" role="tab" aria-selected={paymentMode === m.key} onClick={() => setPaymentMode(m.key)}>
                                                    {m.label}
                                                </button>
                                            ))}
                                        </div>
                                        {paymentMode === 'advance' && (
                                            <div className="aw-inline aw-fade-in" style={{ marginTop: 8, gap: 8, flexWrap: 'wrap' }}>
                                                <label className="aw-meta" htmlFor="lr-adv">Installments ahead:</label>
                                                <input
                                                    id="lr-adv"
                                                    type="number"
                                                    min={1}
                                                    value={advanceCount}
                                                    onChange={e => setAdvanceCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                                    className="aw-input"
                                                    style={{ width: 80, textAlign: 'center' }}
                                                />
                                                <span className="aw-meta">× ₹{fmt(selectedLoan?.instal_amt || 0)} EMI, on top of what's due</span>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="aw-label" htmlFor="lr-amt">Amount (₹)</label>
                                        <input
                                            id="lr-amt"
                                            type="number"
                                            value={form.paymentAmount || ''}
                                            onChange={e => updateForm('paymentAmount', Number(e.target.value))}
                                            readOnly={paymentMode !== 'custom'}
                                            className="aw-input"
                                            placeholder={selectedLoan ? `EMI: ${fmt(selectedLoan.instal_amt)}` : ''}
                                        />
                                        {paymentMode !== 'custom' && (
                                            <p className="aw-meta" style={{ marginTop: 4 }}>Auto-filled by the selected mode — switch to "Custom" to edit directly.</p>
                                        )}
                                    </div>
                                    <div className="aw-two">
                                        <div>
                                            <label className="aw-label" htmlFor="lr-rcpt">Receipt No.</label>
                                            <input id="lr-rcpt" type="text" value={form.receiptNo} onChange={e => updateForm('receiptNo', e.target.value)} className="aw-input" />
                                        </div>
                                        <div>
                                            <label className="aw-label" htmlFor="lr-narr">Narration</label>
                                            <input id="lr-narr" type="text" value={form.narration} onChange={e => updateForm('narration', e.target.value)} className="aw-input" />
                                        </div>
                                    </div>

                                    {selectedLoan && (
                                        <div className="aw-panel">
                                            <div className="aw-rows">
                                                <div className="aw-row"><span className="aw-row-label">Outstanding Balance</span><span className="aw-row-value" style={{ color: 'var(--aw-danger)' }}>₹{fmt(selectedLoan.balance)}</span></div>
                                                <div className="aw-row"><span className="aw-row-label">Balance After Payment</span>
                                                    <span className="aw-row-value" style={{ color: 'var(--aw-success)' }}>
                                                        ₹{fmt(Math.max(0, parseFloat(selectedLoan.balance as any) - (waterfall?.totalPrincipalApplied || 0)))}
                                                    </span>
                                                </div>
                                            </div>
                                            {waterfall && waterfall.leftoverPrepayment > 0 && (
                                                <p className="aw-meta" style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--aw-border)' }}>
                                                    ₹{fmt(waterfall.leftoverPrepayment)} beyond what's currently due will be applied as an advance against principal.
                                                </p>
                                            )}
                                            {waterfall && waterfall.unusedAmount > 0.01 && (
                                                <p className="aw-meta" style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--aw-border)', color: 'var(--aw-warning)', fontWeight: 700 }}>
                                                    ₹{fmt(waterfall.unusedAmount)} exceeds the outstanding balance — it will not be applied (would overpay the loan).
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {message && (
                                        <div className={`aw-alert aw-fade-in ${message.type === 'success' ? 'aw-alert-success' : 'aw-alert-danger'}`} style={{ marginBottom: 0 }} role="status">
                                            <span>{message.text}</span>
                                        </div>
                                    )}

                                    <button type="button" onClick={handleSubmit} disabled={loading || form.paymentAmount <= 0} className="aw-btn aw-btn-primary" style={{ width: '100%' }}>
                                        {loading ? <RefreshCw size={13} className="aw-spin" /> : null}
                                        {loading ? 'Recording…' : 'Record Repayment'}
                                    </button>
                                </div>
                            </section>
                        )}

                        {message && !form.selectedLoanCase && (
                            <div className={`aw-alert aw-fade-in ${message.type === 'success' ? 'aw-alert-success' : 'aw-alert-danger'}`} style={{ marginBottom: 0 }} role="status">
                                <span>{message.text}</span>
                            </div>
                        )}
                    </div>

                    {/* ── Right column ── */}
                    <div className="aw-stack" style={{ minWidth: 0 }}>

                        {/* This payment will cover */}
                        {form.selectedLoanCase && waterfall && waterfall.perInstallment.length > 0 && (
                            <section className="aw-card aw-fade-in">
                                <div className="aw-card-head">
                                    <span className="aw-card-icon"><CheckCircle2 size={14} /></span>
                                    <h2 className="aw-card-title">This Payment Will Cover</h2>
                                </div>
                                <div className="aw-stack" style={{ gap: 6 }}>
                                    {waterfall.perInstallment.map(w => (
                                        <div key={w.installmentNo} className="aw-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                            <span>
                                                Installment #{w.installmentNo}{' '}
                                                <span className={`aw-pill tone-${w.fullyCovered ? 'success' : 'warning'}`}>{w.fullyCovered ? 'fully settled' : 'partially covered'}</span>
                                            </span>
                                            <span className="aw-meta">
                                                {w.penalApplied > 0 && `₹${fmt(w.penalApplied)} penal + `}
                                                {w.interestApplied > 0 && `₹${fmt(w.interestApplied)} interest + `}
                                                ₹{fmt(w.principalApplied)} principal
                                            </span>
                                        </div>
                                    ))}
                                    {waterfall.leftoverPrepayment > 0 && (
                                        <div className="aw-panel" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Advance principal prepayment</span>
                                            <span className="aw-meta">₹{fmt(waterfall.leftoverPrepayment)}</span>
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* Overdue installments */}
                        {form.selectedLoanCase && dueStatus && dueStatus.unpaidInstallments.length > 0 && (
                            <section className="aw-card aw-fade-in">
                                <div className="aw-card-head">
                                    <span className="aw-card-icon" style={{ color: 'var(--aw-warning)' }}><AlertCircle size={14} /></span>
                                    <h2 className="aw-card-title">{dueStatus.unpaidInstallments.length} Installment(s) Overdue — Oldest Recovered First</h2>
                                    <span className="aw-strong" style={{ marginLeft: 'auto', color: 'var(--aw-warning)' }}>₹{fmt(dueStatus.totalDue)}</span>
                                </div>
                                <div className="aw-table-wrap" style={{ maxHeight: 300 }}>
                                    <table className="aw-table">
                                        <thead>
                                            <tr>
                                                <th>#</th><th>Month</th><th>Overdue</th>
                                                <th className="is-right">Principal</th><th className="is-right">Interest</th><th className="is-right">Penal</th>
                                                <th>Tier</th><th className="is-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {dueStatus.unpaidInstallments.map(inst => (
                                                <tr key={inst.installmentNo}>
                                                    <td>{inst.installmentNo}</td>
                                                    <td className="is-muted">{MONTHS[new Date(inst.dueDate).getMonth()]?.label?.slice(0, 3)} {new Date(inst.dueDate).getFullYear()}</td>
                                                    <td className="is-danger">{inst.monthsOverdue > 0 ? `${inst.monthsOverdue}mo` : 'current'}</td>
                                                    <td className="is-right">₹{fmt(inst.principalDue)}</td>
                                                    <td className="is-right">₹{fmt(inst.interestDue)}</td>
                                                    <td className="is-right is-danger">{inst.penalDue > 0 ? `₹${fmt(inst.penalDue)}` : '—'}</td>
                                                    <td className="is-muted">{TIER_LABEL[inst.tier]}</td>
                                                    <td className="is-right">₹{fmt(inst.principalDue + inst.interestDue + inst.penalDue)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}

                        {/* Repayment history — filtered to the selected loan by default, since
                            /repayment-history returns every loan the member has and it's otherwise
                            easy to lose the payment you just made in someone else's history. */}
                        <section className="aw-card">
                            <div className="aw-card-head">
                                <span className="aw-card-icon"><FileText size={14} /></span>
                                <div>
                                    <h2 className="aw-card-title">
                                        Repayment History
                                        {form.selectedLoanCase && !showAllHistory && <span style={{ color: 'var(--aw-muted)', fontWeight: 500 }}> — Loan #{form.selectedLoanCase}</span>}
                                    </h2>
                                    {form.memberName && <p className="aw-meta">{form.memberName} — #{form.mbno}</p>}
                                </div>
                                {form.selectedLoanCase && (
                                    <button type="button" onClick={() => setShowAllHistory(v => !v)} className="aw-btn aw-btn-ghost aw-btn-sm" style={{ marginLeft: 'auto' }}>
                                        {showAllHistory ? 'Show this loan only' : "Show all this member's loans"}
                                    </button>
                                )}
                            </div>
                            {historyLoading ? (
                                <div className="aw-empty" style={{ padding: 28 }}><RefreshCw size={22} className="aw-spin" /><span className="aw-meta">Loading…</span></div>
                            ) : filteredHistory.length === 0 ? (
                                <div className="aw-empty" style={{ padding: 28 }}>
                                    <span className="aw-meta">
                                        {!form.mbno
                                            ? 'Search for a member to view history.'
                                            : form.selectedLoanCase && !showAllHistory
                                                ? 'No repayment records found for this loan yet.'
                                                : 'No repayment records found.'}
                                    </span>
                                </div>
                            ) : (
                                <div className="aw-table-wrap" style={{ maxHeight: '44vh' }}>
                                    <table className="aw-table" style={{ minWidth: 820 }}>
                                        <thead>
                                            <tr>
                                                <th>Loan Case</th><th>Type</th><th>Month/Year</th>
                                                <th className="is-right">Amount</th><th>Receipt</th><th className="is-right">Remaining</th>
                                                <th>Date</th><th>Narration</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredHistory.map((row, i) => (
                                                <tr key={i}>
                                                    <td>{row.loancaseno}</td>
                                                    <td className="is-muted">{LOAN_TYPE_LABEL[row.loantype] || row.loantype}</td>
                                                    <td className="is-muted">{MONTHS.find(m => m.value === row.payment_month)?.label?.slice(0, 3)} {row.payment_year}</td>
                                                    <td className="is-right">₹{fmt(row.payment_amount)}</td>
                                                    <td className="is-muted">{row.receipt_no || '—'}</td>
                                                    <td className="is-right is-danger">₹{fmt(row.remaining_balance)}</td>
                                                    <td className="is-muted">{row.payment_date ? new Date(row.payment_date).toLocaleDateString('en-IN') : '—'}</td>
                                                    {/* Surfaces rows like "Consolidated into loan case #X (principal
                                                        ₹... + closure interest ₹...)" written by passTransaction()'s
                                                        consolidation branch — so a case that hit ₹0 balance via
                                                        consolidation doesn't look like an unexplained data gap. */}
                                                    <td className={row.narration?.startsWith('Consolidated into') ? 'is-warning' : 'is-muted'} style={{ maxWidth: 260 }}>{row.narration || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoanRepaymentForm;
