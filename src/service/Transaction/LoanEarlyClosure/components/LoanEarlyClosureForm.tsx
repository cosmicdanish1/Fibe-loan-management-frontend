import React, { useState } from 'react';
import { Search, AlertTriangle, CheckCircle2, RefreshCw, ChevronDown, ChevronRight, GitMerge, History, Table2, Users, CreditCard, IndianRupee, FileText } from 'lucide-react';
import type { useLoanEarlyClosure } from '../hooks/useLoanEarlyClosure';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';
import MemberField from '@/components/shared/kit/MemberField';
import AwDialog from '@/components/shared/kit/AwDialog';
import LoanPositionPanel from '@/components/shared/loan/LoanPositionPanel';
import { useTranslation } from 'react-i18next';

type Props = ReturnType<typeof useLoanEarlyClosure>;

const LOAN_TYPE_LABEL: Record<string, string> = {
    RLN: 'Regular Loan', ALN: 'Emergency Loan', ELN: 'Loan Against RD',
};

const fmt = (n: number | string) =>
    Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TIER_LABEL: Record<number, string> = { 0: 'Grace', 1: 'Same-Month', 2: 'Monthly' };

const LoanEarlyClosureForm: React.FC<Props> = ({
    form, activeLoans, quote, quoteLoading, loading, message, closed, requireTypeConfirm,
    updateForm, handleMemberLookup, handleLoanSelect, recalculate, toggleApplyRdShare,
    applySuggestedAdjustment, handleExecuteClosure, handleReset,
}) => {
  const { t } = useTranslation();
    const [showConfirm, setShowConfirm] = useState(false);
    const [loanSearch, setLoanSearch] = useState('');
    const [confirmTypedCase, setConfirmTypedCase] = useState('');
    const [showClosedLoans, setShowClosedLoans] = useState(false);
    const [showRepaymentHistory, setShowRepaymentHistory] = useState(false);
    const [showRbSchedule, setShowRbSchedule] = useState(false);

    const selectedLoan = activeLoans.find(l => l.loancaseno === form.selectedLoanCase);
    const selectedLoanIsClosed = !!selectedLoan && Number(selectedLoan.balance) <= 0;

    const openLoans = activeLoans.filter(l => Number(l.balance) > 0);
    const closedLoans = activeLoans.filter(l => Number(l.balance) <= 0);

    const matchesSearch = (l: typeof activeLoans[number]) =>
        loanSearch.trim() === '' || l.loancaseno.includes(loanSearch.trim());
    const filteredLoans = openLoans.filter(matchesSearch);
    const filteredClosedLoans = closedLoans.filter(matchesSearch);

    const onMemberSelected = (member: any) => {
        const memberNo = String(member.memberNo || '');
        const memberName = member.memberName || member.name || '';
        handleMemberLookup(memberNo, memberName);
        setLoanSearch('');
    };

    usePageToolbarActions({
        onSave: () => setShowConfirm(true),
        saveLabel: loading ? 'Closing...' : 'Close Loan',
        saveEnabled: !(loading || closed || !quote || selectedLoanIsClosed),
    });

    const amountCell = (label: React.ReactNode, value: React.ReactNode, opts?: { span?: boolean; tone?: string; note?: React.ReactNode }) => (
        <div className="aw-panel" style={opts?.span ? { gridColumn: '1 / -1' } : undefined}>
            <span className="aw-label">{label}</span>
            <div className="aw-strong" style={{ fontSize: 'calc(var(--type-body-size) + 2px)', color: opts?.tone }}>{value}</div>
            {opts?.note && <p className="aw-meta" style={{ marginTop: 3 }}>{opts.note}</p>}
        </div>
    );

    const loanRow = (loan: typeof activeLoans[number], closedRow: boolean) => {
        const selected = form.selectedLoanCase === loan.loancaseno;
        return (
            <button
                key={loan.loancaseno}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => handleLoanSelect(loan.loancaseno)}
                className="aw-right-cell"
                style={{ flexDirection: 'column', alignItems: 'stretch', gap: 2, padding: '9px 10px', border: `1px solid ${selected ? 'var(--aw-accent)' : 'var(--aw-border)'}`, opacity: closedRow ? 0.85 : 1 }}
            >
                <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span className="aw-strong" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {closedRow && <GitMerge size={13} />}
                        {LOAN_TYPE_LABEL[loan.loantype] || loan.loantype}
                    </span>
                    <span className="aw-meta">#{loan.loancaseno}</span>
                </span>
                <span className="aw-meta">
                    {closedRow
                        ? (loan.consolidatedIntoLoancaseno ? <>{t('Closed — folded into #{{1}}', { 1: loan.consolidatedIntoLoancaseno })}</> : <>{t('Closed')}</>)
                        : <>{t('Balance:')} <strong style={{ color: 'var(--aw-danger)' }}>₹{fmt(loan.balance)}</strong></>}
                </span>
                {!closedRow && loan.ledgerShowsRepaid && (
                    <span className="aw-pill tone-warning" style={{ alignSelf: 'flex-start' }}>
                        <AlertTriangle size={11} style={{ marginRight: 5 }} />{t('Ledger shows this loan repaid — check before closing')}
                    </span>
                )}
            </button>
        );
    };

    const toggleRow = (open: boolean, onClick: () => void, icon: React.ReactNode, label: string) => (
        <button type="button" onClick={onClick} aria-expanded={open} className="aw-btn aw-btn-ghost aw-btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }}>
            {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />} {icon} {label}
        </button>
    );

    return (
        <div className="app-window">
            {/* ── Header ── */}
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">{t('Loan Early Closure')}</h1>
                    <p className="aw-desc">{t('Foreclose a loan — outstanding principal + reducing-balance interest + prior dues')}</p>
                </div>
                <div className="aw-actions">
                    {quote && !closed && !selectedLoanIsClosed && (
                        <span className="aw-pill tone-warning aw-fade-in"><AlertTriangle size={11} style={{ marginRight: 5 }} />{t('Irreversible action')}</span>
                    )}
                    <button type="button" onClick={handleReset} className="aw-btn aw-btn-secondary">
                        <RefreshCw size={13} /> {t('Reset')}
                    </button>
                </div>
            </div>

            <div className="aw-content">
                <div className="aw-split aw-split-form" style={{ height: 'auto', gridTemplateColumns: 'minmax(300px, 4fr) minmax(0, 8fr)', alignItems: 'start' }}>

                    {/* ── Left column ── */}
                    <div className="aw-stack" style={{ minWidth: 0 }}>

                        {/* ① Member */}
                        <section className="aw-card">
                            <div className="aw-card-head">
                                <span className="aw-card-icon"><Users size={14} /></span>
                                <h2 className="aw-card-title">{t('Member')}</h2>
                            </div>
                            <div className="aw-stack">
                                <div className="aw-inline" style={{ alignItems: 'flex-end', gap: 8 }}>
                                    <div style={{ width: 150 }}>
                                        <label className="aw-label" htmlFor="lec-mb">{t('Member No.')}</label>
                                        <MemberField
                                            id="lec-mb"
                                            value={form.mbno}
                                            onChange={v => updateForm('mbno', v)}
                                            onSelect={onMemberSelected}
                                            onSubmit={(v) => handleMemberLookup(v, '')}
                                            placeholder={t('Member No.')}
                                        />
                                    </div>
                                    <button type="button" onClick={() => handleMemberLookup(form.mbno, '')} disabled={loading || !form.mbno} className="aw-btn aw-btn-primary">
                                        {t('Search')}
                                    </button>
                                </div>
                                <div>
                                    <label className="aw-label" htmlFor="lec-name">{t('Member name')}</label>
                                    <input id="lec-name" type="text" placeholder={t('Member name')} value={form.memberName} readOnly className="aw-input" />
                                </div>
                            </div>
                        </section>

                        {/* ② Loan list */}
                        {activeLoans.length > 0 && (
                            <section className="aw-card aw-fade-in">
                                <div className="aw-card-head">
                                    <span className="aw-card-icon"><CreditCard size={14} /></span>
                                    <h2 className="aw-card-title">{t('Select Loan to Close')}</h2>
                                    <span className="aw-meta" style={{ marginLeft: 'auto' }}>{t('{{1}} loan{{2}}', { 1: filteredLoans.length, 2: filteredLoans.length !== 1 ? 's' : '' })}</span>
                                </div>
                                <div className="aw-input-wrap has-icon">
                                    <Search size={13} />
                                    <input type="text" value={loanSearch} onChange={e => setLoanSearch(e.target.value)} placeholder={t('Search by case no.')} aria-label={t('Search by case number')} className="aw-input" />
                                </div>
                                <div className="aw-stack" style={{ gap: 6, maxHeight: 240, overflowY: 'auto' }} role="radiogroup" aria-label={t('Open loans')}>
                                    {filteredLoans.map(loan => loanRow(loan, false))}
                                    {filteredLoans.length === 0 && loanSearch && (
                                        <p className="aw-meta" style={{ textAlign: 'center', padding: '10px 4px' }}>{t('No loans match "')}{loanSearch}"</p>
                                    )}
                                </div>

                                {/* Closed / consolidated cases — full history, view-only */}
                                {closedLoans.length > 0 && (
                                    <div style={{ borderTop: '1px solid var(--aw-border)', paddingTop: 8 }}>
                                        {toggleRow(showClosedLoans, () => setShowClosedLoans(v => !v), null, `Closed / Consolidated (${closedLoans.length})`)}
                                        {showClosedLoans && (
                                            <div className="aw-stack aw-fade-in" style={{ gap: 6, maxHeight: 220, overflowY: 'auto', marginTop: 6 }} role="radiogroup" aria-label={t('Closed loans')}>
                                                {filteredClosedLoans.map(loan => loanRow(loan, true))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </section>
                        )}

                        {/* ③ Closure parameters — only for a loan that's still open */}
                        {form.selectedLoanCase && !selectedLoanIsClosed && (
                            <section className="aw-card aw-fade-in">
                                <div className="aw-card-head">
                                    <span className="aw-card-icon"><IndianRupee size={14} /></span>
                                    <h2 className="aw-card-title">{t('Closure Date, Adjustment & Receipt')}</h2>
                                </div>
                                <div className="aw-stack">
                                    <div>
                                        <label className="aw-label" htmlFor="lec-date">{t('Closure Date')}</label>
                                        <div className="aw-inline" style={{ gap: 8 }}>
                                            <input id="lec-date" type="date" value={form.closureDate} onChange={e => updateForm('closureDate', e.target.value)} className="aw-input" style={{ flex: 1, minWidth: 0 }} />
                                            <button type="button" onClick={recalculate} disabled={quoteLoading} className="aw-btn aw-btn-secondary">
                                                {quoteLoading ? t('Calculating…') : t('Recalc')}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="aw-label" htmlFor="lec-adj">{t('Adjustment (₹, ± optional)')}</label>
                                        <input id="lec-adj" type="number" value={form.adjustment || ''} onChange={e => updateForm('adjustment', Number(e.target.value))} placeholder="0" className="aw-input" />
                                    </div>
                                    <div>
                                        <label className="aw-label" htmlFor="lec-rcpt">{t('Receipt No.')}</label>
                                        <input id="lec-rcpt" type="text" value={form.receiptNo} onChange={e => updateForm('receiptNo', e.target.value)} className="aw-input" />
                                    </div>
                                </div>
                            </section>
                        )}

                        {message && (
                            <div className={`aw-alert aw-fade-in ${message.type === 'success' ? 'aw-alert-success' : 'aw-alert-danger'}`} style={{ marginBottom: 0 }} role="status">
                                <span>{message.text}</span>
                            </div>
                        )}

                        {/* Read-only Loan Position: ledger vs loan record, schedule and notices (nothing saved).
                            The closure figures are left out here - this window has its own full quote. */}
                        {form.selectedLoanCase && (
                            <LoanPositionPanel
                                mbno={form.mbno}
                                loancaseno={form.selectedLoanCase}
                                loantype={activeLoans.find(l => l.loancaseno === form.selectedLoanCase)?.loantype}
                                showClosure={false}
                                refreshKey={closed ? 'closed' : 'open'}
                            />
                        )}
                    </div>

                    {/* ── Right column — Settlement Quote ── */}
                    <section className="aw-card" style={{ minWidth: 0 }}>
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><FileText size={14} /></span>
                            <div>
                                <h2 className="aw-card-title">{selectedLoanIsClosed ? t('Loan History') : t('Settlement Quote')}</h2>
                                {form.memberName && (
                                    <p className="aw-meta">
                                        {form.memberName}
                                        {form.mbno && ` — #${form.mbno}`}
                                        {quote && !selectedLoanIsClosed && ` — as of ${new Date(quote.closureDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                                    </p>
                                )}
                            </div>
                        </div>

                        {closed ? (
                            <div className="aw-empty" style={{ padding: 40 }}>
                                <CheckCircle2 size={44} style={{ color: 'var(--aw-success)' }} />
                                <strong className="aw-strong">{t('Loan Closed')}</strong>
                                <span className="aw-meta" style={{ maxWidth: 340 }}>{message?.text}</span>
                            </div>
                        ) : quoteLoading ? (
                            <div className="aw-empty" style={{ padding: 40 }}>
                                <RefreshCw size={26} className="aw-spin" style={{ color: 'var(--aw-accent)' }} />
                                <strong className="aw-strong">{t('Calculating settlement amount…')}</strong>
                            </div>
                        ) : !quote ? (
                            <div className="aw-empty" style={{ padding: 40 }}>
                                <span className="aw-meta">{form.mbno ? (form.selectedLoanCase ? t('Inputs changed - click Recalc to refresh the settlement quote.') : t('Select a loan case to see its settlement quote.')) : t('Search for a member to begin.')}</span>
                            </div>
                        ) : (
                            <div className="aw-stack aw-fade-in">

                                {/* Loan summary bar */}
                                {selectedLoan && (
                                    <p className="aw-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 22px', borderBottom: '1px solid var(--aw-border)', paddingBottom: 10 }}>
                                        <span>{t('Active Loan Amount:')} <strong style={{ color: 'var(--aw-text)' }}>₹{fmt(quote.loanAmt)}</strong></span>
                                        <span>EMI: <strong style={{ color: 'var(--aw-text)' }}>₹{fmt(selectedLoan.instal_amt)}</strong></span>
                                        {!selectedLoanIsClosed && (
                                            <span>{t('Installments Paid:')} <strong style={{ color: 'var(--aw-text)' }}>{t('{{1}} of {{2}}', { 1: quote.paidInstallments, 2: quote.totalInstallments })}</strong></span>
                                        )}
                                        {selectedLoanIsClosed && (
                                            <span style={{ color: 'var(--aw-accent)', fontWeight: 700 }}>{t('Closed')}{selectedLoan.consolidatedIntoLoancaseno ? ` — folded into #${selectedLoan.consolidatedIntoLoancaseno}` : ''}</span>
                                        )}
                                    </p>
                                )}

                                {/* Consolidation History — absorbed cases and/or the case this rolled into. */}
                                {(quote.consolidationHistory.absorbedCases.length > 0 || quote.consolidationHistory.consolidatedIntoLoancaseno) && (
                                    <div className="aw-alert aw-alert-info" style={{ marginBottom: 0, flexDirection: 'column', gap: 6 }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                                            <GitMerge size={13} /> {t('Consolidation History')}
                                        </span>
                                        {quote.consolidationHistory.absorbedCases.length > 0 && (
                                            <div style={{ width: '100%' }}>
                                                <div style={{ fontWeight: 500, marginBottom: 5 }}>
                                                    {t('This loan absorbed')} {quote.consolidationHistory.absorbedCases.length} {t('earlier case')}{quote.consolidationHistory.absorbedCases.length === 1 ? '' : 's'}:
                                                </div>
                                                <div className="aw-stack" style={{ gap: 5 }}>
                                                    {quote.consolidationHistory.absorbedCases.map(c => (
                                                        <div key={c.loancaseno} className="aw-panel" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, color: 'var(--aw-text)', fontWeight: 500 }}>
                                                            <span><b>#{c.loancaseno}</b> ({LOAN_TYPE_LABEL[c.loantype] || c.loantype}) — original ₹{fmt(c.originalLoanAmt)}</span>
                                                            <span className="aw-meta">{t('Settlement ₹{{1}}{{2}}', { 1: fmt(c.closedBalance), 2: c.closureDate ? ` on ${c.closureDate}` : '' })}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {quote.consolidationHistory.consolidatedIntoLoancaseno && (
                                            <div style={{ fontWeight: 500 }}>
                                                {t('This loan was settled and consolidated into')} <b>#{quote.consolidationHistory.consolidatedIntoLoancaseno}</b>.
                                            </div>
                                        )}
                                    </div>
                                )}

                                {selectedLoanIsClosed && (
                                    <div className="aw-panel"><span className="aw-meta">{t('This loan is already closed — nothing to collect. Showing its history only.')}</span></div>
                                )}

                                {!selectedLoanIsClosed && <>
                                    {/* Future installments note */}
                                    {quote.totalInstallments - quote.paidInstallments - quote.unpaidInstallments.length > 0 && (
                                        <div className="aw-panel">
                                            <span className="aw-meta">
                                                {t('This closure also settles the remaining principal of')}{' '}
                                                <b>{quote.totalInstallments - quote.paidInstallments - quote.unpaidInstallments.length} {t('installment(s) not yet due')}</b>{' '}
                                                — already included in Outstanding Principal above.
                                            </span>
                                        </div>
                                    )}

                                    {quote.payrollAdjustments?.length > 0 && (
                                        <div className="aw-alert aw-alert-info" style={{ marginBottom: 0, flexDirection: 'column', gap: 8 }}>
                                            <span style={{ textTransform: 'uppercase', letterSpacing: '.04em' }}>{t('Previous-Loan Payroll Adjustment')}</span>
                                            <span style={{ fontWeight: 500 }}>
                                                {t("These BSP deductions belong to predecessor-loan payroll. Principal collected after this loan's consolidation is credited once against closure principal, but never counts as or advances a current-loan installment. The predecessor interest is shown for audit and is not charged again here.")}
                                            </span>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, width: '100%' }}>
                                                {quote.payrollAdjustments.map((item, index) => (
                                                    <React.Fragment key={`${item.date}-${item.receiptNo || index}`}>
                                                        <div><span className="aw-label">{t('Previous loan case')}</span><div className="aw-strong">{item.predecessorLoanCaseNo || t('Previous loan')}</div></div>
                                                        <div><span className="aw-label">{t('Source payment')}</span><div className="aw-strong">{item.date}</div></div>
                                                        <div><span className="aw-label">{t('Voucher')}</span><div className="aw-strong">{item.receiptNo || t('Not recorded')}</div></div>
                                                        <div><span className="aw-label">{t('Previous-loan principal')}</span><div className="aw-strong" style={{ color: 'var(--aw-success)' }}>₹{fmt(item.principal)}</div></div>
                                                        <div><span className="aw-label">{t('Previous-loan interest')}</span><div className="aw-strong" style={{ color: 'var(--aw-success)' }}>₹{fmt(item.interest)}</div></div>
                                                        <div><span className="aw-label">{t('Total adjustment')}</span><div className="aw-strong" style={{ color: 'var(--aw-success)' }}>₹{fmt(item.total)}</div></div>
                                                        <div className="aw-meta" style={{ gridColumn: '1 / -1' }}>
                                                            {item.affectsOutstandingBalance
                                                                ? t('This principal is included as a one-time reduction in the closure principal below; installment count unchanged.')
                                                                : t('This payment predates the current schedule and is already reflected in its opening principal.')}
                                                        </div>
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                            <span style={{ fontWeight: 500 }}>
                                                {t('Applied post-consolidation principal offset:')} <b>−₹{fmt(quote.payrollLagPrincipalOffset || 0)}</b>. Pre-consolidation payroll principal is already included in the effective opening principal. No predecessor interest is added again.
                                            </span>
                                        </div>
                                    )}

                                    {/* Amount grid */}
                                    <div className="aw-two">
                                        {amountCell('Outstanding Principal', `₹${fmt(quote.outstandingPrincipal)}`)}
                                        {amountCell('NR Interest (already-due installments)', `₹${fmt(quote.nrInterest)}`)}
                                        {quote.futureInstallmentCount > 0 && amountCell(
                                            `AP Closure Interest (${quote.futureInstallmentCount} future installment${quote.futureInstallmentCount === 1 ? '' : 's'})`,
                                            `₹${fmt(quote.apInterest)}`,
                                            { span: true, note: `Average remaining principal ₹${fmt(quote.averageRemainingPrincipal)} × monthly rate = ₹${fmt(quote.averageRbInterest)} average RB interest/month` },
                                        )}
                                        {amountCell('Closure Interest (NR + AP)', `₹${fmt(quote.closureInterest)}`)}
                                        {amountCell('Penal Interest', `₹${fmt(quote.penalInterest)}`, {
                                            tone: 'var(--aw-danger)',
                                            note: quote.penaltyPolicy?.enabled
                                                ? `Global rate ${fmt(quote.penaltyPolicy.annualRate)}% p.a.; active from ${quote.penaltyPolicy.activationDate || 'configured activation date'}.`
                                                : 'Tiered loan penalty policy is disabled.',
                                        })}
                                        {quote.adjustment !== 0 && amountCell('Applicable Adjustment', `₹${fmt(quote.adjustment)}`, { span: true })}
                                    </div>

                                    {quote.suggestedAdjustment !== 0 && (
                                        <div className="aw-alert aw-alert-info" style={{ marginBottom: 0, flexDirection: 'column', gap: 6 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, width: '100%' }}>
                                                <div>
                                                    <span className="aw-label" style={{ color: 'inherit' }}>{t('Detected: Payroll-Lag Credit — not applied yet')}</span>
                                                    <div className="aw-strong" style={{ color: 'var(--aw-success)', fontSize: 'calc(var(--type-body-size) + 2px)' }}>₹{fmt(quote.suggestedAdjustment)}</div>
                                                </div>
                                                <button type="button" onClick={applySuggestedAdjustment} disabled={quoteLoading} className="aw-btn aw-btn-primary aw-btn-sm">
                                                    {t('Apply & Recalc')}
                                                </button>
                                            </div>
                                            <span style={{ fontWeight: 500 }}>
                                                {t("One more EMI at the predecessor loan's old rate was still deducted through BSP's payroll pipeline before it could switch to this loan. This is a suggested credit only — it is")}
                                                <b> not</b> {t('included in the Settlement Amount below. Review it, then click Apply & Recalc to add it to the Adjustment field and see the updated total, or leave it and close without applying it.')}
                                            </span>
                                        </div>
                                    )}

                                    {/* Calculation trace */}
                                    <div className="aw-panel">
                                        <span className="aw-label">{t('How This Was Calculated (AP / Average-Principal Method)')}</span>
                                        <div className="aw-meta" style={{ fontFamily: "'IBM Plex Mono', 'Courier New', monospace", lineHeight: 1.55, display: 'flex', flexDirection: 'column', gap: 5 }}>
                                            {quote.effectiveSchedule && (
                                                <div>{t('{{1}}{{2}} ({{3}}): effective {{4}}, first due month {{5}}; opening principal ₹{{6}}, fixed principal ₹{{7}} × {{8}} {{9}} {{10}} {{11}}', { 1: t('Current schedule v'), 2: quote.effectiveSchedule.versionNo, 3: quote.effectiveSchedule.source, 4: quote.effectiveSchedule.effectiveDate, 5: quote.effectiveSchedule.firstDueMonth, 6: fmt(quote.effectiveSchedule.openingPrincipal), 7: fmt(quote.effectiveSchedule.monthlyPrincipal), 8: quote.effectiveSchedule.installmentCount, 9: t('installments, slot delay'), 10: quote.effectiveSchedule.delayMonths, 11: t('month(s).') })}</div>
                                            )}
                                            <div>
                                                {t('Outstanding Principal =')} {quote.effectiveSchedule ? t('Current Schedule Opening Principal') : t('Loan Amount')} (₹{fmt(quote.loanAmt)}) − Current-loan Principal Paid (₹{fmt(quote.totalPrincipalPaid)}) − Eligible Post-consolidation Payroll Principal Offset (₹{fmt(quote.payrollLagPrincipalOffset || 0)})
                                                {' '}= <b style={{ color: 'var(--aw-text)' }}>₹{fmt(quote.outstandingPrincipal)}</b>
                                            </div>
                                            <div>
                                                {t('NR Interest = flat interest still due on installments already past their due month (see table below)')}
                                                {' '}= <b style={{ color: 'var(--aw-text)' }}>₹{fmt(quote.nrInterest)}</b>
                                            </div>
                                            {quote.futureInstallmentCount > 0 ? (
                                                <>
                                                    <div>
                                                        {t('Average Remaining Principal = (Future Principal Opening + Standard Monthly Principal) / 2')}
                                                        {' '}= <b style={{ color: 'var(--aw-text)' }}>₹{fmt(quote.averageRemainingPrincipal)}</b>
                                                    </div>
                                                    <div>
                                                        AP Closure Interest = (Monthly Interest on EMI − Average Remaining Principal × Monthly Rate) × Future Installments ({quote.futureInstallmentCount})
                                                        {' '}= <b style={{ color: 'var(--aw-text)' }}>₹{fmt(quote.apInterest)}</b>
                                                    </div>
                                                </>
                                            ) : (
                                                <div>
                                                    {t('No installments remain beyond those already due, so AP Closure Interest =')} <b style={{ color: 'var(--aw-text)' }}>₹0</b>.
                                                </div>
                                            )}
                                            <div>
                                                Closure Interest = NR Interest (₹{fmt(quote.nrInterest)}) + AP Closure Interest (₹{fmt(quote.apInterest)})
                                                {' '}= <b style={{ color: 'var(--aw-text)' }}>₹{fmt(quote.closureInterest)}</b>
                                            </div>
                                            <div>
                                                {t("Penal Interest = sum of each unpaid installment's tiered penalty (see table below)")}
                                                {' '}= <b style={{ color: 'var(--aw-danger)' }}>₹{fmt(quote.penalInterest)}</b>
                                            </div>
                                            <div style={{ paddingTop: 5, borderTop: '1px solid var(--aw-border)', marginTop: 2 }}>
                                                Settlement Amount = Outstanding Principal (₹{fmt(quote.outstandingPrincipal)}) + Closure Interest (₹{fmt(quote.closureInterest)}) + Penal Interest (₹{fmt(quote.penalInterest)})
                                                {quote.adjustment !== 0 && ' + ' + t('Adjustment (₹{{1}})', { 1: fmt(quote.adjustment) })}
                                                {' '}= <b style={{ color: 'var(--aw-accent)' }}>₹{fmt(quote.finalClosureAmount)}</b>
                                                {quote.suggestedAdjustment !== 0 && (
                                                    <span style={{ color: 'var(--aw-info)' }}>{t('(a ₹{{1}} payroll-lag credit is available but not yet applied — see above)', { 1: fmt(Math.abs(quote.suggestedAdjustment)) })}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Final amount highlight */}
                                    <div className="aw-panel aw-panel-accent" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span className="aw-strong">{t('Settlement Amount')}</span>
                                        <span className="aw-strong" style={{ fontSize: 'calc(var(--type-body-size) + 7px)', color: 'var(--aw-accent)' }}>₹{fmt(quote.finalClosureAmount)}</span>
                                    </div>

                                    {/* RD / Share Value adjustment */}
                                    <div className="aw-panel">
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: form.applyRdShare ? 10 : 0 }}>
                                            <input type="checkbox" checked={form.applyRdShare} onChange={e => toggleApplyRdShare(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--aw-accent)' }} />
                                            <span className="aw-strong">{t('Adjust RD / Share Value toward closure')}</span>
                                        </label>

                                        {form.applyRdShare && quote.rdShareAdjustment && (
                                            <div className="aw-stack aw-fade-in" style={{ gap: 8 }}>
                                                {quote.rdShareAdjustment.rdYearClosed && (
                                                    <p className="aw-meta" style={{ color: 'var(--aw-warning)' }}>
                                                        {t("This member's RD financial year is already closed — RD is excluded from this adjustment; only Share Value (if any) applies.")}
                                                    </p>
                                                )}
                                                <div className="aw-two">
                                                    <div>
                                                        <span className="aw-label">{t('RD Balance')}</span>
                                                        <div className="aw-strong">₹{fmt(quote.rdShareAdjustment.currentRd)}</div>
                                                        <span className="aw-meta">{t('₹{{1}} available above ₹{{2}} min', { 1: fmt(quote.rdShareAdjustment.rdAvailable), 2: fmt(quote.rdShareAdjustment.rdMinBalance) })}</span>
                                                    </div>
                                                    <div>
                                                        <span className="aw-label">{t('Share Value')}</span>
                                                        <div className="aw-strong">₹{fmt(quote.rdShareAdjustment.currentShare)}</div>
                                                        <span className="aw-meta">{t('₹{{1}} available above ₹{{2}} min', { 1: fmt(quote.rdShareAdjustment.shareAvailable), 2: fmt(quote.rdShareAdjustment.shareMinBalance) })}</span>
                                                    </div>
                                                </div>
                                                <div className="aw-row aw-row-total" style={{ borderTop: '1px solid var(--aw-border)', paddingTop: 8 }}>
                                                    <span className="aw-row-label">{t('Applied from RD + Share')}</span>
                                                    <span className="aw-row-value">₹{fmt(quote.rdShareAdjustment.appliedFromRdShare)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Payable by member — the real collection figure */}
                                    <div className="aw-panel aw-panel-accent" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderColor: 'var(--aw-accent)' }}>
                                        <span className="aw-strong">{t('Payable by Member')}</span>
                                        <span className="aw-strong" style={{ fontSize: 'calc(var(--type-body-size) + 9px)', color: 'var(--aw-accent)' }}>₹{fmt(quote.payableByMember)}</span>
                                    </div>

                                    {/* Unpaid installments table */}
                                    {quote.unpaidInstallments.length > 0 && (
                                        <div>
                                            <span className="aw-label">{quote.unpaidInstallments.length} {t('Installment(s) Contributing to Overdue Interest / Penal')}</span>
                                            <div className="aw-table-wrap" style={{ maxHeight: 280 }}>
                                                <table className="aw-table">
                                                    <thead>
                                                        <tr><th>#</th><th>{t('Due Date')}</th><th className="is-right">{t('Principal Due')}</th><th className="is-right">{t('Interest Due')}</th><th className="is-right">{t('Penal Due')}</th><th>{t('Tier')}</th><th>{t('Overdue')}</th></tr>
                                                    </thead>
                                                    <tbody>
                                                        {quote.unpaidInstallments.map(inst => (
                                                            <tr key={inst.installmentNo}>
                                                                <td>{inst.installmentNo}</td>
                                                                <td className="is-muted">{inst.dueDate}</td>
                                                                <td className="is-right">₹{fmt(inst.principalDue)}</td>
                                                                <td className="is-right">₹{fmt(inst.interestDue)}</td>
                                                                <td className="is-right is-danger">₹{fmt(inst.penalDue)}</td>
                                                                <td className="is-muted">{TIER_LABEL[inst.tier]}</td>
                                                                <td className="is-muted">{inst.monthsOverdue > 0 ? t('{{1}}mo', { 1: inst.monthsOverdue }) : 'current'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </>}

                                {/* Repayment History — collapsible, every real payment on this case */}
                                {quote.repaymentHistory.length > 0 && (
                                    <div>
                                        {toggleRow(showRepaymentHistory, () => setShowRepaymentHistory(v => !v), <History size={12} />, `Repayment History (${quote.repaymentHistory.length})`)}
                                        {showRepaymentHistory && (
                                            <div className="aw-table-wrap aw-fade-in" style={{ maxHeight: 280, marginTop: 6 }}>
                                                <table className="aw-table">
                                                    <thead>
                                                        <tr><th>{t('Date')}</th><th className="is-right">{t('Amount')}</th><th className="is-right">{t('Principal')}</th><th className="is-right">{t('Interest')}</th><th className="is-right">{t('Penal')}</th><th>{t('Receipt No.')}</th></tr>
                                                    </thead>
                                                    <tbody>
                                                        {quote.repaymentHistory.map((r, i) => (
                                                            <tr key={i}>
                                                                <td className="is-muted">{r.date}</td>
                                                                <td className="is-right">₹{fmt(r.amount)}</td>
                                                                <td className="is-right">₹{fmt(r.principal)}</td>
                                                                <td className="is-right">₹{fmt(r.interest)}</td>
                                                                <td className={`is-right ${r.penal > 0 ? 'is-danger' : ''}`}>₹{fmt(r.penal)}</td>
                                                                <td className="is-muted">{r.receiptNo || '—'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* RB Schedule — collapsible, the full amortization plan */}
                                {quote.rbSchedule.length > 0 && (
                                    <div>
                                        {toggleRow(showRbSchedule, () => setShowRbSchedule(v => !v), <Table2 size={12} />, `Reducing-Balance Schedule (${quote.rbSchedule.length} installments)`)}
                                        {showRbSchedule && (
                                            <div className="aw-table-wrap aw-fade-in" style={{ maxHeight: 320, marginTop: 6 }}>
                                                <table className="aw-table">
                                                    <thead>
                                                        <tr><th>#</th><th className="is-right">{t('Opening Balance')}</th><th className="is-right">{t('RB Interest')}</th><th className="is-right">{t('Principal')}</th><th className="is-right">{t('Closing Balance')}</th></tr>
                                                    </thead>
                                                    <tbody>
                                                        {quote.rbSchedule.map(row => (
                                                            <tr key={row.installmentNo}>
                                                                <td>{row.installmentNo}</td>
                                                                <td className="is-right">₹{fmt(row.openingBalance)}</td>
                                                                <td className="is-right">₹{fmt(row.rbInterest)}</td>
                                                                <td className="is-right">₹{fmt(row.principal)}</td>
                                                                <td className="is-right">₹{fmt(row.closingBalance)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* CTA */}
                                {!closed && !selectedLoanIsClosed && (
                                    <button type="button" onClick={() => setShowConfirm(true)} disabled={loading} className="aw-btn aw-btn-danger" style={{ width: '100%', padding: '11px 0' }}>
                                        {loading ? t('Closing…') : t('Close Loan — Collect ₹{{1}}', { 1: fmt(quote.payableByMember) })}
                                    </button>
                                )}
                            </div>
                        )}
                    </section>
                </div>
            </div>

            {/* Confirm irreversible closure */}
            <AwDialog
                open={showConfirm}
                title={t('Confirm early closure')}
                icon={<AlertTriangle size={14} />}
                onClose={() => { setShowConfirm(false); setConfirmTypedCase(''); }}
                maxWidth="32rem"
                compact
            >
                <div className="aw-stack">
                    <p className="aw-meta" style={{ lineHeight: 1.6 }}>{t('{{1}}{{2}} — including ones not yet due — and reduces its balance to zero. This cannot be undone from this screen. Confirm ₹{{3}} {{4}} {{5}}.', { 1: t('This settles every remaining installment on loan #'), 2: form.selectedLoanCase, 3: quote ? fmt(quote.payableByMember) : '—', 4: t('has actually been collected from the member before proceeding'), 5: quote?.rdShareAdjustment && quote.rdShareAdjustment.appliedFromRdShare > 0 &&
                            ' ' + t('(₹{{1}} will also be applied from their RD/Share Value)', { 1: fmt(quote.rdShareAdjustment.appliedFromRdShare) }) })}</p>
                    {requireTypeConfirm && (
                        <div>
                            <label className="aw-label" htmlFor="lec-typed">
                                {t('Type loan case number')} <b style={{ color: 'var(--aw-text)' }}>{form.selectedLoanCase}</b> {t('to confirm')}
                            </label>
                            <input
                                id="lec-typed"
                                type="text"
                                value={confirmTypedCase}
                                onChange={e => setConfirmTypedCase(e.target.value)}
                                placeholder={form.selectedLoanCase}
                                autoFocus
                                className="aw-input"
                            />
                        </div>
                    )}
                    <div className="aw-btn-row" style={{ justifyContent: 'flex-end' }}>
                        <button type="button" onClick={() => { setShowConfirm(false); setConfirmTypedCase(''); }} className="aw-btn aw-btn-secondary">{t('Cancel')}</button>
                        <button
                            type="button"
                            onClick={() => { setShowConfirm(false); setConfirmTypedCase(''); handleExecuteClosure(); }}
                            disabled={requireTypeConfirm && confirmTypedCase.trim() !== form.selectedLoanCase}
                            className="aw-btn aw-btn-danger"
                        >
                            {t('Yes, Close Loan')}
                        </button>
                    </div>
                </div>
            </AwDialog>
        </div>
    );
};

export default LoanEarlyClosureForm;
