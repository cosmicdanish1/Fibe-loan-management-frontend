import React, { useState } from 'react';
import { Modal } from 'antd';
import { Search, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import type { useLoanEarlyClosure } from '../hooks/useLoanEarlyClosure';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';
import MemberLookup from '../../../../components/shared/MemberLookup/MemberLookup';

type Props = ReturnType<typeof useLoanEarlyClosure>;

const LOAN_TYPE_LABEL: Record<string, string> = {
    RLN: 'Regular Loan', ALN: 'Emergency Loan', ELN: 'Loan Against Recovery',
};

const fmt = (n: number | string) =>
    Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TIER_LABEL: Record<number, string> = { 0: 'Grace', 1: 'Same-Month', 2: 'Monthly' };

const LoanEarlyClosureForm: React.FC<Props> = ({
    form, activeLoans, quote, quoteLoading, loading, message, closed, requireTypeConfirm,
    updateForm, handleMemberLookup, handleLoanSelect, recalculate, toggleApplyRdShare, handleExecuteClosure, handleReset,
}) => {
    const [showLookup, setShowLookup] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loanSearch, setLoanSearch] = useState('');
    const [confirmTypedCase, setConfirmTypedCase] = useState('');

    const selectedLoan = activeLoans.find(l => l.loancaseno === form.selectedLoanCase);

    const filteredLoans = activeLoans.filter(l =>
        loanSearch.trim() === '' || l.loancaseno.includes(loanSearch.trim())
    );

    const onMemberSelected = (member: any) => {
        const memberNo = String(member.memberNo || '');
        const memberName = member.memberName || member.name || '';
        handleMemberLookup(memberNo, memberName);
        setShowLookup(false);
        setLoanSearch('');
    };

    usePageToolbarActions({
        onSave: () => setShowConfirm(true),
        saveLabel: loading ? 'Closing...' : 'Close Loan',
        saveEnabled: !(loading || closed || !quote),
    });

    return (
        <div className="lec-root flex flex-col h-full overflow-hidden" style={{ background: '#f4f5f7', color: '#1a1d29', fontSize: 13 }}>

            {/* ── Header ── */}
            <div className="lec-header flex items-center justify-between px-5 py-2.5 shrink-0" style={{ background: '#161822', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-baseline gap-2.5">
                    <h1 className="m-0 font-semibold text-white" style={{ fontSize: 15 }}>Loan Early Closure</h1>
                    <span style={{ fontSize: 11.5, color: '#9296a8' }}>
                        Foreclose a loan — outstanding principal + reducing-balance interest + prior dues
                    </span>
                </div>
                <button
                    onClick={handleReset}
                    className="lec-ghost-btn flex items-center gap-1.5"
                    style={{ fontSize: 12, fontWeight: 500, padding: '5px 12px', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 6, background: 'transparent', color: '#d7d9e3', cursor: 'pointer' }}
                >
                    <RefreshCw size={12} /> Reset
                </button>
            </div>

            {/* ── Body ── */}
            <div className="flex gap-3.5 p-3.5 flex-1 overflow-auto items-start">

                {/* Left column */}
                <div className="flex flex-col gap-3" style={{ width: 320, flexShrink: 0 }}>

                    {/* ① Member search */}
                    <div className="lec-card" style={{ background: '#fff', border: '1px solid #e4e6eb', borderRadius: 8, padding: 12 }}>
                        <div className="lec-section-label">Member</div>
                        <div className="flex gap-1.5">
                            <input
                                type="text"
                                placeholder="Member No."
                                value={form.mbno}
                                onChange={e => updateForm('mbno', e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleMemberLookup(form.mbno, '')}
                                className="lec-input"
                                style={{ width: 80 }}
                            />
                            <input
                                type="text"
                                placeholder="Member name"
                                value={form.memberName}
                                readOnly
                                className="lec-input lec-input-readonly"
                                style={{ flex: 1, minWidth: 0 }}
                            />
                            <button
                                onClick={() => handleMemberLookup(form.mbno, '')}
                                disabled={loading || !form.mbno}
                                className="lec-btn-primary"
                                style={{ whiteSpace: 'nowrap' }}
                            >
                                Search
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowLookup(true)}
                                title="Member Lookup"
                                className="lec-btn-icon"
                                style={{ width: 30, flexShrink: 0 }}
                            >
                                <Search size={13} />
                            </button>
                        </div>
                    </div>

                    {/* ② Loan list */}
                    {activeLoans.length > 0 && (
                        <div className="lec-card" style={{ background: '#fff', border: '1px solid #e4e6eb', borderRadius: 8, padding: 12 }}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="lec-section-label" style={{ marginBottom: 0 }}>Select Loan to Close</div>
                                <span style={{ fontSize: 11, color: '#8b90a0' }}>
                                    {filteredLoans.length} loan{filteredLoans.length !== 1 ? 's' : ''}
                                </span>
                            </div>

                            {/* Search within loan list */}
                            <div className="relative mb-2">
                                <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#8b90a0' }} />
                                <input
                                    type="text"
                                    value={loanSearch}
                                    onChange={e => setLoanSearch(e.target.value)}
                                    placeholder="Search by case no."
                                    className="lec-input"
                                    style={{ width: '100%', paddingLeft: 26 }}
                                />
                            </div>

                            <div className="flex flex-col gap-1.5" style={{ maxHeight: 220, overflowY: 'auto', overflowX: 'hidden', paddingRight: 2 }}>
                                {filteredLoans.map(loan => {
                                    const selected = form.selectedLoanCase === loan.loancaseno;
                                    return (
                                        <label
                                            key={loan.loancaseno}
                                            onClick={() => handleLoanSelect(loan.loancaseno)}
                                            style={{
                                                display: 'flex', gap: 9, alignItems: 'flex-start',
                                                padding: '9px 10px', borderRadius: 6, cursor: 'pointer',
                                                border: `1px solid ${selected ? '#c9b6f0' : '#eceef1'}`,
                                                background: selected ? '#f2edfb' : '#fff',
                                                transition: 'border-color 0.15s, background 0.15s',
                                            }}
                                        >
                                            <input
                                                type="radio"
                                                name="loanCase"
                                                value={loan.loancaseno}
                                                checked={selected}
                                                onChange={() => handleLoanSelect(loan.loancaseno)}
                                                style={{ marginTop: 2, accentColor: '#5b21b6' }}
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
                                                <div style={{ fontSize: 11.5, color: '#8b90a0', whiteSpace: 'nowrap' }}>
                                                    Balance: <span style={{ color: '#dc2626', fontWeight: 600 }}>₹{fmt(loan.balance)}</span>
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

                    {/* ③ Closure parameters */}
                    {form.selectedLoanCase && (
                        <div className="lec-card" style={{ background: '#fff', border: '1px solid #e4e6eb', borderRadius: 8, padding: 12 }}>
                            <div className="lec-section-label">Closure Date, Adjustment &amp; Receipt</div>
                            <div className="flex flex-col gap-2.5">
                                <div>
                                    <label className="lec-field-label">Closure Date</label>
                                    <div className="flex gap-1.5">
                                        <input
                                            type="date"
                                            value={form.closureDate}
                                            onChange={e => updateForm('closureDate', e.target.value)}
                                            className="lec-input"
                                            style={{ flex: 1, minWidth: 0 }}
                                        />
                                        <button
                                            onClick={recalculate}
                                            disabled={quoteLoading}
                                            className="lec-btn-secondary"
                                        >
                                            {quoteLoading ? 'Calculating…' : 'Recalc'}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="lec-field-label">Adjustment (₹, ± optional)</label>
                                    <input
                                        type="number"
                                        value={form.adjustment || ''}
                                        onChange={e => updateForm('adjustment', Number(e.target.value))}
                                        placeholder="0"
                                        className="lec-input"
                                        style={{ width: '100%' }}
                                    />
                                </div>
                                <div>
                                    <label className="lec-field-label">Receipt No.</label>
                                    <input
                                        type="text"
                                        value={form.receiptNo}
                                        onChange={e => updateForm('receiptNo', e.target.value)}
                                        className="lec-input"
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Message */}
                    {message && (
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

                {/* ── Right column — Closure Quote ── */}
                <div style={{ flex: 1, minWidth: 0, background: '#fff', border: '1px solid #e4e6eb', borderRadius: 8, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                    {/* Quote header */}
                    <div className="flex items-center justify-between" style={{ padding: '11px 16px', borderBottom: '1px solid #eceef1' }}>
                        <div>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1a1d29' }}>Closure Quote</div>
                            {form.memberName && (
                                <div style={{ fontSize: 11.5, color: '#8b90a0', marginTop: 1 }}>
                                    {form.memberName}
                                    {form.mbno && ` — #${form.mbno}`}
                                    {quote && ` — as of ${new Date(quote.closureDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                                </div>
                            )}
                        </div>
                        {quote && !closed && (
                            <span className="lec-badge-warn flex items-center gap-1.5">
                                <AlertTriangle size={11} /> Irreversible action
                            </span>
                        )}
                    </div>

                    {/* Quote body */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                        {closed ? (
                            <div className="flex flex-col items-center justify-center h-full text-center" style={{ gap: 12 }}>
                                <CheckCircle2 size={48} style={{ color: '#22c55e' }} />
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1d29' }}>Loan Closed</div>
                                <div style={{ fontSize: 12.5, color: '#6b7280', maxWidth: 340 }}>{message?.text}</div>
                            </div>
                        ) : quoteLoading ? (
                            <div className="flex items-center justify-center" style={{ height: 120, color: '#8b90a0', fontSize: 13 }}>
                                Calculating closure amount…
                            </div>
                        ) : !quote ? (
                            <div className="flex items-center justify-center" style={{ height: 120, color: '#8b90a0', fontSize: 13 }}>
                                {form.mbno ? 'Select a loan case to see its closure quote.' : 'Search for a member to begin.'}
                            </div>
                        ) : (
                            <div className="flex flex-col" style={{ gap: 12 }}>

                                {/* Loan summary bar */}
                                {selectedLoan && (
                                    <div className="flex flex-wrap" style={{ gap: '4px 22px', fontSize: 12, color: '#8b90a0', borderBottom: '1px solid #eceef1', paddingBottom: 11 }}>
                                        <span>Original Loan Amount: <b style={{ color: '#1a1d29', fontWeight: 600 }}>₹{fmt(selectedLoan.loan_amt)}</b></span>
                                        <span>EMI: <b style={{ color: '#1a1d29', fontWeight: 600 }}>₹{fmt(selectedLoan.instal_amt)}</b></span>
                                        <span>Installments Paid: <b style={{ color: '#1a1d29', fontWeight: 600 }}>{quote.paidInstallments} of {quote.totalInstallments}</b></span>
                                    </div>
                                )}

                                {/* Future installments note */}
                                {quote.totalInstallments - quote.paidInstallments - quote.unpaidInstallments.length > 0 && (
                                    <div style={{ fontSize: 11.5, color: '#6b7280', background: '#f7f8fa', border: '1px solid #eceef1', borderRadius: 6, padding: '8px 11px' }}>
                                        This closure also settles the remaining principal of{' '}
                                        <b>{quote.totalInstallments - quote.paidInstallments - quote.unpaidInstallments.length} installment(s) not yet due</b>{' '}
                                        — already included in Outstanding Principal above.
                                    </div>
                                )}

                                {/* Amount grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    <div className="lec-amount-cell">
                                        <div className="lec-amount-label">Outstanding Principal</div>
                                        <div className="lec-amount-value">₹{fmt(quote.outstandingPrincipal)}</div>
                                    </div>
                                    <div className="lec-amount-cell">
                                        <div className="lec-amount-label">Compulsory Slot Interest</div>
                                        <div className="lec-amount-value">₹{fmt(quote.compulsorySlotInterest)}</div>
                                    </div>
                                    <div className="lec-amount-cell" style={{ gridColumn: '1 / -1' }}>
                                        <div className="lec-amount-label">
                                            RB Adjustment ({quote.rbAdjustment >= 0 ? 'member owes the difference' : 'reduces what is owed'})
                                        </div>
                                        <div className="lec-amount-value" style={{ color: quote.rbAdjustment >= 0 ? '#1a1d29' : '#15803d' }}>
                                            ₹{fmt(quote.rbAdjustment)}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#a3a8b3', marginTop: 3 }}>
                                            ₹{fmt(quote.rbInterestTillClosure)} true reducing-balance interest accrued − ₹{fmt(quote.flatInterestCollected)} flat interest actually collected so far
                                        </div>
                                    </div>
                                    <div className="lec-amount-cell">
                                        <div className="lec-amount-label">Closure Interest (Slot + RB Adj)</div>
                                        <div className="lec-amount-value">₹{fmt(quote.closureInterest)}</div>
                                    </div>
                                    <div className="lec-amount-cell">
                                        <div className="lec-amount-label">Penal Interest</div>
                                        <div className="lec-amount-value" style={{ color: '#dc2626' }}>₹{fmt(quote.penalInterest)}</div>
                                    </div>
                                    {quote.adjustment !== 0 && (
                                        <div className="lec-amount-cell" style={{ gridColumn: '1 / -1' }}>
                                            <div className="lec-amount-label">Applicable Adjustment</div>
                                            <div className="lec-amount-value">₹{fmt(quote.adjustment)}</div>
                                        </div>
                                    )}
                                </div>

                                {/* Calculation trace */}
                                <div style={{ background: '#f7f8fa', border: '1px solid #eceef1', borderRadius: 7, padding: '11px 13px' }}>
                                    <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', color: '#6b7280', marginBottom: 7 }}>
                                        How This Was Calculated
                                    </div>
                                    <div style={{ fontFamily: "'IBM Plex Mono', 'Courier New', monospace", fontSize: 11, color: '#5b6072', lineHeight: 1.55, display: 'flex', flexDirection: 'column', gap: 5 }}>
                                        <div>
                                            Outstanding Principal = Loan Amount (₹{fmt(quote.loanAmt)}) − Principal Paid So Far (₹{fmt(quote.totalPrincipalPaid)})
                                            {' '}= <b style={{ color: '#1a1d29' }}>₹{fmt(quote.outstandingPrincipal)}</b>
                                        </div>
                                        {quote.hasRbSchedule ? (
                                            <>
                                                <div>
                                                    Compulsory Slot Interest = (EMI × Installments: ₹{fmt(quote.instalAmt)} × {quote.noOfInstal}) − Loan Amount (₹{fmt(quote.loanAmt)}) − Total RB Interest for the full schedule (₹{fmt(quote.totalRBInterestFullSchedule)})
                                                    {' '}= <b style={{ color: '#1a1d29' }}>₹{fmt(quote.compulsorySlotInterest)}</b>
                                                </div>
                                                <div>
                                                    RB Adjustment = RB Interest Accrued Till Closure (₹{fmt(quote.rbInterestTillClosure)}) − Flat Interest Actually Collected (₹{fmt(quote.flatInterestCollected)})
                                                    {' '}= <b style={{ color: quote.rbAdjustment >= 0 ? '#1a1d29' : '#15803d' }}>₹{fmt(quote.rbAdjustment)}</b>
                                                </div>
                                                <div>
                                                    Closure Interest = Compulsory Slot Interest (₹{fmt(quote.compulsorySlotInterest)}) + RB Adjustment (₹{fmt(quote.rbAdjustment)})
                                                    {' '}= <b style={{ color: '#1a1d29' }}>₹{fmt(quote.closureInterest)}</b>
                                                </div>
                                            </>
                                        ) : (
                                            <div>
                                                This loan predates the RB-schedule feature — Closure Interest falls back to the flat interest still due on unpaid installments (see table below), not the Slot + RB formula.
                                                {' '}= <b style={{ color: '#1a1d29' }}>₹{fmt(quote.closureInterest)}</b>
                                            </div>
                                        )}
                                        <div>
                                            Penal Interest = sum of each unpaid installment's tiered penalty (see table below)
                                            {' '}= <b style={{ color: '#dc2626' }}>₹{fmt(quote.penalInterest)}</b>
                                        </div>
                                        <div style={{ paddingTop: 5, borderTop: '1px solid #e4e6eb', marginTop: 2 }}>
                                            Final Closure Amount = Outstanding Principal (₹{fmt(quote.outstandingPrincipal)}) + Closure Interest (₹{fmt(quote.closureInterest)}) + Penal Interest (₹{fmt(quote.penalInterest)})
                                            {quote.adjustment !== 0 && ` + Adjustment (₹${fmt(quote.adjustment)})`}
                                            {' '}= <b style={{ color: '#5b21b6' }}>₹{fmt(quote.finalClosureAmount)}</b>
                                        </div>
                                    </div>
                                </div>

                                {/* Final amount highlight */}
                                <div className="flex items-center justify-between" style={{ background: '#f2edfb', border: '1.5px solid #d3c3f5', borderRadius: 8, padding: '12px 15px' }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#4c1d95' }}>Final Closure Amount</span>
                                    <span style={{ fontSize: 19, fontWeight: 700, color: '#4c1d95' }}>₹{fmt(quote.finalClosureAmount)}</span>
                                </div>

                                {/* RD / Share Value adjustment */}
                                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '11px 13px' }}>
                                    <label className="flex items-center gap-2" style={{ cursor: 'pointer', marginBottom: form.applyRdShare ? 10 : 0 }}>
                                        <input
                                            type="checkbox"
                                            checked={form.applyRdShare}
                                            onChange={e => toggleApplyRdShare(e.target.checked)}
                                            style={{ accentColor: '#b45309' }}
                                        />
                                        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#92400e' }}>
                                            Adjust RD / Share Value toward closure
                                        </span>
                                    </label>

                                    {form.applyRdShare && quote.rdShareAdjustment && (
                                        <div className="flex flex-col" style={{ gap: 8 }}>
                                            {quote.rdShareAdjustment.rdYearClosed && (
                                                <div style={{ fontSize: 11, color: '#92400e' }}>
                                                    This member's RD financial year is already closed — RD is excluded from this adjustment; only Share Value (if any) applies.
                                                </div>
                                            )}
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                                <div>
                                                    <div style={{ fontSize: 10.5, color: '#92400e' }}>RD Balance</div>
                                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1d29' }}>₹{fmt(quote.rdShareAdjustment.currentRd)}</div>
                                                    <div style={{ fontSize: 10.5, color: '#a3752f' }}>₹{fmt(quote.rdShareAdjustment.rdAvailable)} available above ₹{fmt(quote.rdShareAdjustment.rdMinBalance)} min</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 10.5, color: '#92400e' }}>Share Value</div>
                                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1d29' }}>₹{fmt(quote.rdShareAdjustment.currentShare)}</div>
                                                    <div style={{ fontSize: 10.5, color: '#a3752f' }}>₹{fmt(quote.rdShareAdjustment.shareAvailable)} available above ₹{fmt(quote.rdShareAdjustment.shareMinBalance)} min</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between" style={{ paddingTop: 8, borderTop: '1px solid #fde68a' }}>
                                                <span style={{ fontSize: 12, color: '#92400e' }}>Applied from RD + Share</span>
                                                <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1d29' }}>₹{fmt(quote.rdShareAdjustment.appliedFromRdShare)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Payable by member — the real collection figure */}
                                <div className="flex items-center justify-between" style={{ background: '#f2edfb', border: '1.5px solid #4c1d95', borderRadius: 8, padding: '12px 15px' }}>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#4c1d95' }}>Payable by Member</span>
                                    <span style={{ fontSize: 21, fontWeight: 700, color: '#4c1d95' }}>₹{fmt(quote.payableByMember)}</span>
                                </div>

                                {/* Unpaid installments table */}
                                {quote.unpaidInstallments.length > 0 && (
                                    <div>
                                        <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', color: '#6b7280', marginBottom: 7 }}>
                                            {quote.unpaidInstallments.length} Installment(s) Contributing to Overdue Interest / Penal
                                        </div>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr>
                                                    {['#', 'Due Date', 'Principal Due', 'Interest Due', 'Penal Due', 'Tier', 'Overdue'].map(h => (
                                                        <th key={h} style={{ textAlign: 'left', fontSize: 10.5, fontWeight: 600, color: '#8b90a0', padding: '6px 8px', borderBottom: '1px solid #eceef1', background: '#f7f8fa' }}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {quote.unpaidInstallments.map(inst => (
                                                    <tr key={inst.installmentNo}>
                                                        <td style={{ fontSize: 12, color: '#1a1d29', padding: '7px 8px', borderBottom: '1px solid #f2f3f5' }}>{inst.installmentNo}</td>
                                                        <td style={{ fontSize: 12, color: '#5b6072', padding: '7px 8px', borderBottom: '1px solid #f2f3f5' }}>{inst.dueDate}</td>
                                                        <td style={{ fontSize: 12, color: '#1a1d29', padding: '7px 8px', borderBottom: '1px solid #f2f3f5' }}>₹{fmt(inst.principalDue)}</td>
                                                        <td style={{ fontSize: 12, color: '#1a1d29', padding: '7px 8px', borderBottom: '1px solid #f2f3f5' }}>₹{fmt(inst.interestDue)}</td>
                                                        <td style={{ fontSize: 12, color: '#dc2626', padding: '7px 8px', borderBottom: '1px solid #f2f3f5' }}>₹{fmt(inst.penalDue)}</td>
                                                        <td style={{ fontSize: 12, color: '#8b90a0', padding: '7px 8px', borderBottom: '1px solid #f2f3f5' }}>{TIER_LABEL[inst.tier]}</td>
                                                        <td style={{ fontSize: 12, color: '#8b90a0', padding: '7px 8px', borderBottom: '1px solid #f2f3f5' }}>{inst.monthsOverdue > 0 ? `${inst.monthsOverdue}mo` : 'current'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Sticky footer CTA */}
                    {quote && !closed && (
                        <div style={{ padding: '12px 16px', borderTop: '1px solid #eceef1' }}>
                            <button
                                onClick={() => setShowConfirm(true)}
                                disabled={loading}
                                style={{
                                    width: '100%', padding: 11, background: '#5b21b6', color: '#fff',
                                    border: 'none', borderRadius: 7, fontSize: 13.5, fontWeight: 600,
                                    cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#4c1d95'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#5b21b6'; }}
                            >
                                {loading ? 'Closing…' : `Close Loan — Collect ₹${fmt(quote.payableByMember)}`}
                            </button>
                        </div>
                    )}
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
                onCancel={() => { setShowConfirm(false); setConfirmTypedCase(''); }}
                onOk={() => { setShowConfirm(false); setConfirmTypedCase(''); handleExecuteClosure(); }}
                okText="Yes, Close Loan"
                okButtonProps={{
                    danger: true,
                    disabled: requireTypeConfirm && confirmTypedCase.trim() !== form.selectedLoanCase,
                }}
                cancelText="Cancel"
                title="Confirm early closure"
            >
                <p style={{ fontSize: 13, color: '#4b5160', lineHeight: 1.6, margin: 0 }}>
                    This settles every remaining installment on loan #{form.selectedLoanCase} — including ones not yet due — and reduces its balance to zero.
                    This cannot be undone from this screen. Confirm ₹{quote ? fmt(quote.payableByMember) : '—'} has actually been collected from the member before proceeding
                    {quote?.rdShareAdjustment && quote.rdShareAdjustment.appliedFromRdShare > 0 &&
                        ` (₹${fmt(quote.rdShareAdjustment.appliedFromRdShare)} will also be applied from their RD/Share Value)`}.
                </p>
                {requireTypeConfirm && (
                    <div style={{ marginTop: 14 }}>
                        <label style={{ display: 'block', fontSize: 11.5, color: '#8b90a0', marginBottom: 4 }}>
                            Type loan case number <b style={{ color: '#1a1d29' }}>{form.selectedLoanCase}</b> to confirm
                        </label>
                        <input
                            type="text"
                            value={confirmTypedCase}
                            onChange={e => setConfirmTypedCase(e.target.value)}
                            placeholder={form.selectedLoanCase}
                            autoFocus
                            className="lec-input"
                            style={{ width: '100%' }}
                        />
                    </div>
                )}
            </Modal>

            <style>{`
                .lec-section-label {
                    font-size: 11px; font-weight: 600; text-transform: uppercase;
                    letter-spacing: 0.4px; color: #6b7280; margin-bottom: 8px;
                }
                .lec-field-label {
                    display: block; font-size: 11px; color: #8b90a0; margin-bottom: 4px;
                }
                .lec-input {
                    font-size: 12.5px; padding: 6px 8px;
                    border: 1px solid #d7dae0; border-radius: 6px; outline: none;
                    color: #1a1d29; background: #fff; transition: border-color 0.15s;
                }
                .lec-input:focus { border-color: #7c3aed; }
                .lec-input-readonly { background: #f7f8fa !important; color: #4b5160 !important; border-color: #eceef1 !important; }
                .lec-btn-primary {
                    font-size: 12px; font-weight: 600; padding: 6px 12px;
                    border: none; border-radius: 6px; background: #5b21b6; color: #fff;
                    cursor: pointer; transition: background 0.15s;
                }
                .lec-btn-primary:hover:not(:disabled) { background: #4c1d95; }
                .lec-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
                .lec-btn-secondary {
                    font-size: 12px; font-weight: 500; padding: 6px 10px;
                    border: none; border-radius: 6px; background: #eef0f3; color: #3a3f4b;
                    cursor: pointer; white-space: nowrap; transition: background 0.15s;
                }
                .lec-btn-secondary:hover:not(:disabled) { background: #e1e3e8; }
                .lec-btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
                .lec-btn-icon {
                    display: flex; align-items: center; justify-content: center;
                    border: none; border-radius: 6px; background: #f0f1f4; color: #5b6072;
                    cursor: pointer; transition: background 0.15s, color 0.15s;
                }
                .lec-btn-icon:hover { background: #5b21b6; color: #fff; }
                .lec-ghost-btn { transition: background 0.15s; }
                .lec-ghost-btn:hover { background: rgba(255,255,255,0.08) !important; }
                .lec-badge-warn {
                    font-size: 11px; font-weight: 500;
                    color: #a15c00; background: #fef3e0; border: 1px solid #f3dca8;
                    border-radius: 20px; padding: 4px 10px;
                }
                .lec-amount-cell {
                    background: #f7f8fa; border: 1px solid #eceef1;
                    border-radius: 7px; padding: 10px 12px;
                }
                .lec-amount-label { font-size: 11px; color: #8b90a0; margin-bottom: 3px; }
                .lec-amount-value { font-size: 14px; font-weight: 600; color: #1a1d29; }

                /* ── Dark mode ── */
                html.dark .lec-root { background: #000 !important; color: #f5f5f7 !important; }
                html.dark .lec-header { background: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; }
                html.dark .lec-card,
                html.dark .lec-root > div > div[style*="background:#fff"],
                html.dark .lec-root [style*="background: #fff"],
                html.dark .lec-root [style*="background: rgb(255, 255, 255)"] { background: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
                html.dark .lec-amount-cell { background: rgba(255,255,255,.04) !important; border-color: rgba(255,255,255,.08) !important; }
                html.dark .lec-amount-value { color: #f5f5f7 !important; }
                html.dark .lec-amount-label,
                html.dark .lec-section-label,
                html.dark .lec-field-label { color: #8e8e93 !important; }
                html.dark .lec-input {
                    background: rgba(255,255,255,.05) !important; color: #f5f5f7 !important;
                    border-color: rgba(255,255,255,.08) !important;
                }
                html.dark .lec-input-readonly { background: rgba(255,255,255,.03) !important; color: #8e8e93 !important; }
                html.dark .lec-input::placeholder { color: #71717a !important; }
                html.dark .lec-btn-secondary { background: #2c2c2e !important; color: #f5f5f7 !important; }
                html.dark .lec-btn-secondary:hover { background: rgba(255,255,255,.1) !important; }
                html.dark .lec-btn-icon { background: #2c2c2e !important; color: #f5f5f7 !important; }
                html.dark .lec-badge-warn { background: rgba(251,191,36,.12) !important; border-color: rgba(251,191,36,.3) !important; color: #fbbf24 !important; }
                html.dark .lec-root [style*="background: #f7f8fa"],
                html.dark .lec-root [style*="background:#f7f8fa"] { background: rgba(255,255,255,.04) !important; }
                html.dark .lec-root [style*="background: #f2edfb"],
                html.dark .lec-root [style*="background:#f2edfb"] { background: rgba(167,139,250,.14) !important; }
                html.dark .lec-root [style*="border: 1.5px solid #d3c3f5"],
                html.dark .lec-root [style*="border:1.5px solid #d3c3f5"] { border-color: rgba(167,139,250,.35) !important; }
                html.dark .lec-root [style*="color: #4c1d95"],
                html.dark .lec-root [style*="color:#4c1d95"] { color: #c4b5fd !important; }
                html.dark .lec-root [style*="color: #1a1d29"],
                html.dark .lec-root [style*="color:#1a1d29"] { color: #f5f5f7 !important; }
                html.dark .lec-root [style*="color: #5b6072"],
                html.dark .lec-root [style*="color:#5b6072"],
                html.dark .lec-root [style*="color: #6b7280"],
                html.dark .lec-root [style*="color:#6b7280"],
                html.dark .lec-root [style*="color: #8b90a0"],
                html.dark .lec-root [style*="color:#8b90a0"] { color: #8e8e93 !important; }
                html.dark .lec-root [style*="color: #dc2626"],
                html.dark .lec-root [style*="color:#dc2626"] { color: #ff453a !important; }
                html.dark .lec-root [style*="color: #5b21b6"],
                html.dark .lec-root [style*="color:#5b21b6"] { color: #c4b5fd !important; }
                html.dark .lec-root [style*="borderBottom: '1px solid #eceef1'"],
                html.dark .lec-root [style*="border-bottom: 1px solid #eceef1"],
                html.dark .lec-root [style*="borderTop: '1px solid #eceef1'"],
                html.dark .lec-root [style*="border-top: 1px solid #eceef1"] { border-color: rgba(255,255,255,.07) !important; }
                html.dark .lec-root table th { color: #8e8e93 !important; background: #1c1c1e !important; border-color: rgba(255,255,255,.07) !important; }
                html.dark .lec-root table td { border-color: rgba(255,255,255,.07) !important; }
                html.dark .lec-root [style*="color: #15803d"] { color: #34d399 !important; }
                html.dark .lec-root label[style*="background: #f2edfb"],
                html.dark .lec-root label[style*="background:#f2edfb"] { background: rgba(167,139,250,.15) !important; border-color: rgba(167,139,250,.4) !important; }
                html.dark .lec-root label[style*="background: #fff"],
                html.dark .lec-root label[style*="background:#fff"] { background: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
            `}</style>
        </div>
    );
};

export default LoanEarlyClosureForm;
