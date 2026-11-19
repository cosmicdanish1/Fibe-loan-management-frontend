import React, { useState } from 'react';
import { Search, AlertTriangle, CheckCircle2, RefreshCw, ChevronDown, ChevronRight, GitMerge, Users, CreditCard, IndianRupee, FileText } from 'lucide-react';
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

// ES-539: yyyy-mm-dd -> "05 Mar 2024" (parsed as a local date so IST never shifts it a day).
const fmtDate = (iso?: string | null) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    if (!m) return '—';
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const TIER_LABEL: Record<number, string> = { 0: 'Grace', 1: 'Same-Month', 2: 'Monthly' };

// Two views of the same quote. Simple shows what the operator needs to close the loan; Detailed shows
// the full working (consolidation, payroll adjustments, the calculation, instalment tables). Both use
// the same figures and the same Close Loan action. Warnings are shown in both, never hidden by Simple.
type ClosureView = 'simple' | 'detailed';
const viewKey = () => {
    let user = '';
    try { user = String(JSON.parse(localStorage.getItem('user') || '{}')?.username || ''); } catch { /* no saved user */ }
    return `lms-loan-closure-view:${user}`;
};
const loadView = (): ClosureView => {
    try { return localStorage.getItem(viewKey()) === 'detailed' ? 'detailed' : 'simple'; } catch { return 'simple'; }
};

const LoanEarlyClosureForm: React.FC<Props> = ({
    form, activeLoans, quote, quoteLoading, loading, message, closed, requireTypeConfirm,
    updateForm, handleMemberLookup, handleLoanSelect, recalculate, toggleApplyRdShare, toggleAdjustPayrollLag, recordPayrollLagRefund,
    applySuggestedAdjustment, handleExecuteClosure, handleReset, holdInfo, toggleNextMonth,
}) => {
  const { t } = useTranslation();
    const [showConfirm, setShowConfirm] = useState(false);
    const [loanSearch, setLoanSearch] = useState('');
    const [confirmTypedCase, setConfirmTypedCase] = useState('');
    const [showClosedLoans, setShowClosedLoans] = useState(false);
    const [showLoanHistory, setShowLoanHistory] = useState(false);
    const [detailTab, setDetailTab] = useState<'overdue' | 'repay' | 'schedule'>('overdue');
    const [view, setViewState] = useState<ClosureView>(loadView);
    const detailed = view === 'detailed';
    const setView = (next: ClosureView) => {
        setViewState(next);
        try { localStorage.setItem(viewKey(), next); } catch { /* storage unavailable */ }
    };

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

    // Tables under the settlement: one tab each, one visible at a time.
    const tabList = quote ? [
        ...(detailed && !selectedLoanIsClosed && quote.unpaidInstallments.length > 0 ? [{ id: 'overdue' as const, label: t('Overdue instalments'), count: quote.unpaidInstallments.length }] : []),
        ...((detailed || selectedLoanIsClosed) && quote.repaymentHistory.length > 0 ? [{ id: 'repay' as const, label: t('Repayment history'), count: quote.repaymentHistory.length }] : []),
        ...(detailed && quote.rbSchedule.length > 0 ? [{ id: 'schedule' as const, label: t('Reducing-balance schedule'), count: quote.rbSchedule.length }] : []),
    ] : [];
    const activeTab = tabList.find(x => x.id === detailTab)?.id ?? tabList[0]?.id;

    usePageToolbarActions({
        onSave: () => setShowConfirm(true),
        saveLabel: loading ? 'Closing...' : 'Close Loan',
        saveEnabled: !(loading || closed || !quote || selectedLoanIsClosed),
    });

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
                <span className="aw-meta">
                    {t('Taken on')} {fmtDate(loan.loan_date)} · {loan.no_of_instal} {t('instalments')}{loan.rate != null ? ` · ${loan.rate}%` : ''}
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
                    <p className="aw-desc">{detailed
                        ? t('Foreclose a loan — outstanding principal + reducing-balance interest + prior dues')
                        : t('Close a loan before its last instalment and collect what is owed')}</p>
                </div>
                <div className="aw-actions">
                    <div className="aw-chips" role="radiogroup" aria-label={t('How much detail to show')}>
                        <button type="button" role="radio" aria-checked={!detailed} className="aw-chip" onClick={() => setView('simple')}
                            data-tip={t('Only what is needed to close the loan')} data-tip-pos="bottom">{t('Simple')}</button>
                        <button type="button" role="radio" aria-checked={detailed} className="aw-chip" onClick={() => setView('detailed')}
                            data-tip={t('The full working: history, calculation and tables')} data-tip-pos="bottom">{t('Detailed')}</button>
                    </div>
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
                                compact={!detailed}
                                collapsible={detailed}
                                onShowDetails={() => setView('detailed')}
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
                                <strong className="aw-strong">{holdInfo ? t('Sent to Past Transaction') : t('Loan Closed')}</strong>
                                <span className="aw-meta" style={{ maxWidth: 340 }}>{message?.text}</span>
                                {holdInfo && holdInfo.nextMonth && (
                                    <span className="aw-meta" style={{ maxWidth: 340 }}>
                                        {t('It stays there until the next EMI is received, then it is passed (automatically if the setting is on, otherwise you are notified).')}
                                    </span>
                                )}
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

                                {/* Loan summary: four figures in Detailed, one line in Simple */}
                                {selectedLoan && detailed && (
                                    <div className="lec-strip">
                                        <div><span className="aw-label">{t('Loan taken on')}</span><strong>{fmtDate(selectedLoan.loan_date)}</strong></div>
                                        <div><span className="aw-label">{t('Loan amount')}</span><strong>₹{fmt(quote.loanAmt)}</strong></div>
                                        {selectedLoan.rate != null && <div><span className="aw-label">{t('Interest rate')}</span><strong>{selectedLoan.rate}%</strong></div>}
                                        <div><span className="aw-label">EMI</span><strong>₹{fmt(selectedLoan.instal_amt)}</strong></div>
                                        {!selectedLoanIsClosed ? (
                                            <>
                                                <div><span className="aw-label">{t('Installments Paid:').replace(/:$/, '')}</span><strong>{t('{{1}} of {{2}}', { 1: quote.paidInstallments, 2: quote.totalInstallments })}</strong></div>
                                                <div><span className="aw-label">{t('Closure date')}</span><strong>{new Date(quote.closureDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></div>
                                            </>
                                        ) : (
                                            <div><span className="aw-label">{t('Status')}</span><strong style={{ color: 'var(--aw-accent)' }}>{t('Closed')}{selectedLoan.consolidatedIntoLoancaseno ? ` — folded into #${selectedLoan.consolidatedIntoLoancaseno}` : ''}</strong></div>
                                        )}
                                    </div>
                                )}
                                {selectedLoan && !detailed && (
                                    <p className="aw-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 22px', borderBottom: '1px solid var(--aw-border)', paddingBottom: 10 }}>
                                        <span>{t('Loan taken on')}: <strong style={{ color: 'var(--aw-text)' }}>{fmtDate(selectedLoan.loan_date)}</strong></span>
                                        {selectedLoan.rate != null && <span>{t('Interest rate')}: <strong style={{ color: 'var(--aw-text)' }}>{selectedLoan.rate}%</strong></span>}
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

                                {/* Simple view: the loan's history in one line each. The full blocks are in Detailed. */}
                                {!detailed && (quote.consolidationHistory.absorbedCases.length > 0 || quote.consolidationHistory.consolidatedIntoLoancaseno || (!selectedLoanIsClosed && quote.payrollAdjustments?.length > 0)) && (
                                    <div className="aw-rows">
                                        {quote.consolidationHistory.absorbedCases.length > 0 && (
                                            <div className="aw-row">
                                                <span className="aw-row-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><GitMerge size={13} /> {t('Includes earlier loan')}</span>
                                                <span className="aw-row-value">{quote.consolidationHistory.absorbedCases.map(c => `#${c.loancaseno}`).join(', ')}</span>
                                            </div>
                                        )}
                                        {quote.consolidationHistory.consolidatedIntoLoancaseno && (
                                            <div className="aw-row">
                                                <span className="aw-row-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><GitMerge size={13} /> {t('Folded into loan')}</span>
                                                <span className="aw-row-value">#{quote.consolidationHistory.consolidatedIntoLoancaseno}</span>
                                            </div>
                                        )}
                                        {!selectedLoanIsClosed && quote.payrollAdjustments?.length > 0 && (
                                            <div className="aw-row">
                                                <span className="aw-row-label">{t('Old-loan payroll deductions already credited')}</span>
                                                <span className="aw-row-value">−₹{fmt(quote.payrollLagPrincipalOffset || 0)}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Loan history (Detailed): what this loan absorbed, where it went, and old-loan payroll credited. One folded section. */}
                                {detailed && (quote.consolidationHistory.absorbedCases.length > 0 || quote.consolidationHistory.consolidatedIntoLoancaseno || (!selectedLoanIsClosed && quote.payrollAdjustments?.length > 0)) && (
                                    <section className="lec-block">
                                        <button type="button" className="lec-block-head" aria-expanded={showLoanHistory} onClick={() => setShowLoanHistory(v => !v)}>
                                            {showLoanHistory ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                            <GitMerge size={14} /> <span className="aw-card-title">{t('Loan history')}</span>
                                            <span className="lec-badges">
                                                {quote.consolidationHistory.absorbedCases.length > 0 && <span className="aw-pill">{t('Absorbed')} {quote.consolidationHistory.absorbedCases.length}</span>}
                                                {quote.consolidationHistory.consolidatedIntoLoancaseno && <span className="aw-pill">{t('Folded into')} #{quote.consolidationHistory.consolidatedIntoLoancaseno}</span>}
                                                {!selectedLoanIsClosed && quote.payrollAdjustments?.length > 0 && <span className="aw-pill">{t('Payroll adjustments')} {quote.payrollAdjustments.length}</span>}
                                            </span>
                                        </button>
                                        {showLoanHistory && (
                                            <div className="aw-stack aw-fade-in" style={{ gap: 12 }}>
                                                {quote.consolidationHistory.absorbedCases.length > 0 && (
                                                    <div>
                                                        <p className="aw-meta" style={{ marginBottom: 6 }}>{t('This loan absorbed')} {quote.consolidationHistory.absorbedCases.length} {t('earlier case')}{quote.consolidationHistory.absorbedCases.length === 1 ? '' : 's'}:</p>
                                                        <div className="aw-table-wrap">
                                                            <table className="aw-table">
                                                                <thead><tr><th>{t('Case')}</th><th>{t('Type')}</th><th className="is-right">{t('Original amount')}</th><th className="is-right">{t('Settlement')}</th><th>{t('Date')}</th></tr></thead>
                                                                <tbody>
                                                                    {quote.consolidationHistory.absorbedCases.map(c => (
                                                                        <tr key={c.loancaseno}>
                                                                            <td><b>#{c.loancaseno}</b></td>
                                                                            <td className="is-muted">{LOAN_TYPE_LABEL[c.loantype] || c.loantype}</td>
                                                                            <td className="is-right">₹{fmt(c.originalLoanAmt)}</td>
                                                                            <td className="is-right">₹{fmt(c.closedBalance)}</td>
                                                                            <td className="is-muted">{c.closureDate || '—'}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                )}
                                                {quote.consolidationHistory.consolidatedIntoLoancaseno && (
                                                    <p className="aw-meta">{t('This loan was settled and consolidated into')} <b>#{quote.consolidationHistory.consolidatedIntoLoancaseno}</b>.</p>
                                                )}
                                                {!selectedLoanIsClosed && quote.payrollAdjustments?.length > 0 && (
                                                    <div>
                                                        <p className="aw-strong" style={{ marginBottom: 6 }}>{t('Previous-Loan Payroll Adjustment')}</p>
                                                        <div className="aw-table-wrap">
                                                            <table className="aw-table">
                                                                <thead><tr><th>{t('Previous loan case')}</th><th>{t('Source payment')}</th><th>{t('Voucher')}</th><th className="is-right">{t('Previous-loan principal')}</th><th className="is-right">{t('Previous-loan interest')}</th><th className="is-right">{t('Total adjustment')}</th></tr></thead>
                                                                <tbody>
                                                                    {quote.payrollAdjustments.map((item, index) => (
                                                                        <React.Fragment key={`${item.date}-${item.receiptNo || index}`}>
                                                                            <tr>
                                                                                <td>{item.predecessorLoanCaseNo || t('Previous loan')}</td>
                                                                                <td className="is-muted">{item.date}</td>
                                                                                <td className="is-muted">{item.receiptNo || t('Not recorded')}</td>
                                                                                <td className="is-right">₹{fmt(item.principal)}</td>
                                                                                <td className="is-right">₹{fmt(item.interest)}</td>
                                                                                <td className="is-right"><b>₹{fmt(item.total)}</b></td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td colSpan={6} className="aw-meta" style={{ paddingTop: 0 }}>
                                                                                    {item.affectsOutstandingBalance
                                                                                        ? t('This principal is included as a one-time reduction in the closure principal below; installment count unchanged.')
                                                                                        : t('This payment predates the current schedule and is already reflected in its opening principal.')}
                                                                                </td>
                                                                            </tr>
                                                                        </React.Fragment>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                        <p className="aw-meta" style={{ marginTop: 6 }}>
                                                            {t('Applied post-consolidation principal offset:')} <b>−₹{fmt(quote.payrollLagPrincipalOffset || 0)}</b>. {t('Pre-consolidation payroll principal is already included in the effective opening principal. No predecessor interest is added again.')}
                                                        </p>
                                                        <details className="lec-why">
                                                            <summary>{t('Why is this here?')}</summary>
                                                            <p className="aw-meta">{t("These BSP deductions belong to predecessor-loan payroll. Principal collected after this loan's consolidation is credited once against closure principal, but never counts as or advances a current-loan installment. The predecessor interest is shown for audit and is not charged again here.")}</p>
                                                        </details>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </section>
                                )}

                                {selectedLoanIsClosed && (
                                    <div className="aw-panel"><span className="aw-meta">{t('This loan is already closed — nothing to collect. Showing its history only.')}</span></div>
                                )}

                                {!selectedLoanIsClosed && <>
                                    {/* ES-522: delayed old-loan payroll money (principal + interest) owed back to the member. First thing under the quote header so it is easy to find. */}
                                    {quote.payrollLagPrincipalOffset > 0 && (
                                        <div className="aw-panel aw-panel-accent" style={{ border: '1px solid var(--aw-accent)' }}>
                                            <div className="aw-stack" style={{ gap: 10 }}>
                                                <div>
                                                    <span className="aw-strong" style={{ display: 'block' }}>{t('Old-loan payroll was still deducted after this loan started')}</span>
                                                    <span className="aw-meta">{t('Collected after the consolidation: principal ₹{{1}} + interest ₹{{2}}. Tick the box to treat it as money owed back to the member instead of reducing the loan.', { 1: fmt(quote.payrollLagPrincipalOffset), 2: fmt(quote.payrollLagInterestOffset ?? 0) })}</span>
                                                </div>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 10px', borderRadius: 8, background: 'var(--aw-surface, transparent)', border: '1px solid var(--aw-border, #ccc)' }}>
                                                    <input type="checkbox" checked={form.adjustPayrollLag} onChange={e => toggleAdjustPayrollLag(e.target.checked)} style={{ width: 20, height: 20, accentColor: 'var(--aw-accent)' }} />
                                                    <span className="aw-strong">{t('Return the delayed payroll principal and interest to the member (do not reduce the loan)')}</span>
                                                </label>
                                                {form.adjustPayrollLag && (
                                                    <div className="aw-stack aw-fade-in" style={{ gap: 6 }}>
                                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontVariantNumeric: 'tabular-nums' }}>
                                                            <thead>
                                                                <tr className="aw-meta" style={{ textAlign: 'right' }}>
                                                                    <th style={{ textAlign: 'left', fontWeight: 600 }}>{t('Part')}</th>
                                                                    <th style={{ fontWeight: 600 }}>{t('Collected')}</th>
                                                                    <th style={{ fontWeight: 600 }}>{t('Already returned')}</th>
                                                                    <th style={{ fontWeight: 600 }}>{t('Still owed back')}</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                <tr style={{ textAlign: 'right' }}>
                                                                    <td style={{ textAlign: 'left' }}>{t('Principal')}</td>
                                                                    <td>₹{fmt(quote.payrollLagPrincipalOffset)}</td>
                                                                    <td>₹{fmt(quote.payrollLagRefunded ?? 0)}</td>
                                                                    <td className="aw-strong">₹{fmt(quote.payrollLagRefundDue ?? 0)}</td>
                                                                </tr>
                                                                <tr style={{ textAlign: 'right' }}>
                                                                    <td style={{ textAlign: 'left' }}>{t('Interest')}</td>
                                                                    <td>₹{fmt(quote.payrollLagInterestOffset ?? 0)}</td>
                                                                    <td>₹{fmt(quote.payrollLagInterestRefunded ?? 0)}</td>
                                                                    <td className="aw-strong">₹{fmt(quote.payrollLagInterestRefundDue ?? 0)}</td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                        <div className="aw-meta">{t('Outstanding principal shown and used for the average interest: ₹{{1}}. What is still owed back is deducted only from the amount the member pays; the loan account closes at ₹{{2}} principal.', { 1: fmt(quote.outstandingPrincipal), 2: fmt(quote.ledgerPrincipal ?? quote.outstandingPrincipal) })}</div>
                                                        {((quote.payrollLagRefundDue ?? 0) > 0 || (quote.payrollLagInterestRefundDue ?? 0) > 0) && (
                                                            <button type="button" className="aw-btn" style={{ alignSelf: 'flex-start' }} onClick={() => {
                                                                const v = window.prompt(t('Voucher no. of the refund already paid to the member (optional)'), '');
                                                                if (v === null) return;
                                                                recordPayrollLagRefund(quote.payrollLagRefundDue ?? 0, quote.payrollLagInterestRefundDue ?? 0, v);
                                                            }}>{t('Record that ₹{{1}} principal + ₹{{2}} interest was already returned to the member', { 1: fmt(quote.payrollLagRefundDue ?? 0), 2: fmt(quote.payrollLagInterestRefundDue ?? 0) })}</button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Future installments note */}
                                    {detailed && quote.totalInstallments - quote.paidInstallments - quote.unpaidInstallments.length > 0 && (
                                        <div className="aw-panel">
                                            <span className="aw-meta">
                                                {t('This closure also settles the remaining principal of')}{' '}
                                                <b>{quote.totalInstallments - quote.paidInstallments - quote.unpaidInstallments.length} {t('installment(s) not yet due')}</b>{' '}
                                                {t('— already included in Outstanding Principal below.')}
                                            </span>
                                        </div>
                                    )}

                                    {/* Simple view: the settlement as one short sum. */}
                                    {!detailed && (
                                        <div className="aw-rows">
                                            <div className="aw-row">
                                                <span className="aw-row-label">{t('Outstanding principal')}</span>
                                                <span className="aw-row-value">₹{fmt(quote.outstandingPrincipal)}</span>
                                            </div>
                                            <div className="aw-row">
                                                <span className="aw-row-label">{t('Closure interest')}</span>
                                                <span className="aw-row-value">₹{fmt(quote.closureInterest)}</span>
                                            </div>
                                            <div className="aw-row">
                                                <span className="aw-row-label">
                                                    {t('Penal interest')}
                                                    {quote.unpaidInstallments.length > 0 && <span className="aw-meta"> · {t('{{1}} instalment{{2}} past due', { 1: quote.unpaidInstallments.length, 2: quote.unpaidInstallments.length === 1 ? '' : 's' })}</span>}
                                                </span>
                                                <span className="aw-row-value" style={Number(quote.penalInterest) > 0 ? { color: 'var(--aw-danger)' } : undefined}>₹{fmt(quote.penalInterest)}</span>
                                            </div>
                                            {quote.adjustment !== 0 && (
                                                <div className="aw-row">
                                                    <span className="aw-row-label">{t('Adjustment')}</span>
                                                    <span className="aw-row-value">₹{fmt(quote.adjustment)}</span>
                                                </div>
                                            )}
                                            <div className="aw-row aw-row-total">
                                                <span className="aw-row-label">{t('Settlement Amount')}</span>
                                                <span className="aw-row-value">₹{fmt(quote.finalClosureAmount)}</span>
                                            </div>
                                        </div>
                                    )}

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

                                    {/* Settlement working (Detailed): the figures, how each was reached, and the total, once. */}
                                    {detailed && (
                                        <section className="lec-block">
                                            <span className="aw-label">{t('Settlement working')} · {t('AP / Average-Principal Method')}</span>
                                            {quote.effectiveSchedule && (
                                                <p className="aw-meta lec-sched">{t('{{1}}{{2}} ({{3}}): effective {{4}}, first due month {{5}}; opening principal ₹{{6}}, fixed principal ₹{{7}} × {{8}} {{9}} {{10}} {{11}}', { 1: t('Current schedule v'), 2: quote.effectiveSchedule.versionNo, 3: quote.effectiveSchedule.source, 4: quote.effectiveSchedule.effectiveDate, 5: quote.effectiveSchedule.firstDueMonth, 6: fmt(quote.effectiveSchedule.openingPrincipal), 7: fmt(quote.effectiveSchedule.monthlyPrincipal), 8: quote.effectiveSchedule.installmentCount, 9: t('installments, slot delay'), 10: quote.effectiveSchedule.delayMonths, 11: t('month(s).') })}</p>
                                            )}
                                            <div className="aw-table-wrap">
                                                <table className="aw-table lec-settle">
                                                    <thead><tr><th>{t('Item')}</th><th>{t('How it is worked out')}</th><th className="is-right">{t('Amount')}</th></tr></thead>
                                                    <tbody>
                                                        <tr>
                                                            <td className="aw-strong">{t('Outstanding Principal')}</td>
                                                            <td className="aw-meta">{quote.effectiveSchedule ? t('Current Schedule Opening Principal') : t('Loan Amount')} (₹{fmt(quote.loanAmt)}) − {t('Current-loan Principal Paid')} (₹{fmt(quote.totalPrincipalPaid)}) − {t('Eligible Post-consolidation Payroll Principal Offset')} (₹{fmt(quote.payrollLagPrincipalOffset || 0)})</td>
                                                            <td className="is-right aw-strong">₹{fmt(quote.outstandingPrincipal)}</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="aw-strong">{t('NR Interest (already-due installments)')}</td>
                                                            <td className="aw-meta">{t('NR Interest = flat interest still due on installments already past their due month (see table below)')}</td>
                                                            <td className="is-right aw-strong">₹{fmt(quote.nrInterest)}</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="aw-strong">{quote.futureInstallmentCount > 0 ? `AP Closure Interest (${quote.futureInstallmentCount} future installment${quote.futureInstallmentCount === 1 ? '' : 's'})` : t('AP Closure Interest')}</td>
                                                            <td className="aw-meta">
                                                                {quote.futureInstallmentCount > 0 ? (
                                                                    <>
                                                                        <div>{t('Average Remaining Principal = (Future Principal Opening + Standard Monthly Principal) / 2')} = <b>₹{fmt(quote.averageRemainingPrincipal)}</b></div>
                                                                        <div>AP Closure Interest = (Monthly Interest on EMI − Average Remaining Principal × Monthly Rate) × Future Installments ({quote.futureInstallmentCount})</div>
                                                                        <div>Average remaining principal ₹{fmt(quote.averageRemainingPrincipal)} × monthly rate = ₹{fmt(quote.averageRbInterest)} average RB interest/month</div>
                                                                    </>
                                                                ) : (
                                                                    <>{t('No installments remain beyond those already due, so AP Closure Interest =')} ₹0.</>
                                                                )}
                                                            </td>
                                                            <td className="is-right aw-strong">₹{fmt(quote.apInterest)}</td>
                                                        </tr>
                                                        <tr className="lec-sub">
                                                            <td className="aw-strong">{t('Closure Interest (NR + AP)')}</td>
                                                            <td className="aw-meta">{t('NR Interest')} (₹{fmt(quote.nrInterest)}) + {t('AP Closure Interest')} (₹{fmt(quote.apInterest)})</td>
                                                            <td className="is-right aw-strong">₹{fmt(quote.closureInterest)}</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="aw-strong">{t('Penal Interest')}</td>
                                                            <td className="aw-meta">
                                                                <div>{t("Penal Interest = sum of each unpaid installment's tiered penalty (see table below)")}</div>
                                                                <div>{quote.penaltyPolicy?.enabled
                                                                    ? `Global rate ${fmt(quote.penaltyPolicy.annualRate)}% p.a.; active from ${quote.penaltyPolicy.activationDate || 'configured activation date'}.`
                                                                    : 'Tiered loan penalty policy is disabled.'}</div>
                                                            </td>
                                                            <td className="is-right aw-strong" style={Number(quote.penalInterest) > 0 ? { color: 'var(--aw-danger)' } : undefined}>₹{fmt(quote.penalInterest)}</td>
                                                        </tr>
                                                        {quote.adjustment !== 0 && (
                                                            <tr>
                                                                <td className="aw-strong">{t('Applicable Adjustment')}</td>
                                                                <td className="aw-meta">{t('Adjustment (₹{{1}})', { 1: fmt(quote.adjustment) })}</td>
                                                                <td className="is-right aw-strong">₹{fmt(quote.adjustment)}</td>
                                                            </tr>
                                                        )}
                                                        <tr className="lec-total">
                                                            <td className="aw-strong">{t('Settlement Amount')}</td>
                                                            <td className="aw-meta">
                                                                {t('Outstanding Principal')} (₹{fmt(quote.outstandingPrincipal)}) + {t('Closure Interest')} (₹{fmt(quote.closureInterest)}) + {t('Penal Interest')} (₹{fmt(quote.penalInterest)})
                                                                {quote.adjustment !== 0 && ' + ' + t('Adjustment (₹{{1}})', { 1: fmt(quote.adjustment) })}
                                                                {quote.suggestedAdjustment !== 0 && (
                                                                    <div style={{ color: 'var(--aw-info)' }}>{t('(a ₹{{1}} payroll-lag credit is available but not yet applied — see above)', { 1: fmt(Math.abs(quote.suggestedAdjustment)) })}</div>
                                                                )}
                                                            </td>
                                                            <td className="is-right aw-strong">₹{fmt(quote.finalClosureAmount)}</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </section>
                                    )}

                                    {quote.currentMonthInGrace && (
                                        <div className="aw-panel aw-meta">
                                            {t('Installment #{{1}} (due {{2}}) is still inside its grace period: it is counted with the remaining installments and no flat interest is charged for this month.', { 1: quote.currentMonthInGrace.installmentNo, 2: quote.currentMonthInGrace.dueDate })}
                                        </div>
                                    )}

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

                                    {!detailed && (
                                        <button type="button" className="aw-btn aw-btn-ghost aw-btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setView('detailed')}>
                                            <ChevronRight size={12} /> {t('See how this was calculated')}
                                        </button>
                                    )}

                                </>}

                                {/* The three tables as tabs: one visible at a time (Detailed), or just the repayments for a closed loan. */}
                                {tabList.length > 0 && activeTab && (
                                    <section className="lec-block lec-tabs-card">
                                        <div className="aw-tabs" role="tablist" aria-label={t('Tables')}>
                                            {tabList.map(x => (
                                                <button key={x.id} type="button" role="tab" id={`lec-tab-${x.id}`} aria-selected={activeTab === x.id} aria-controls={`lec-panel-${x.id}`} className="aw-tab" onClick={() => setDetailTab(x.id)}>
                                                    {x.label} <span className="aw-pill">{x.count}</span>
                                                </button>
                                            ))}
                                        </div>
                                        <div role="tabpanel" id={`lec-panel-${activeTab}`} aria-labelledby={`lec-tab-${activeTab}`} className="aw-fade-in" key={activeTab}>
                                            {activeTab === 'overdue' && (
                                                <>
                                                    <p className="aw-meta" style={{ margin: '8px 0' }}>{quote.unpaidInstallments.length} {t('Installment(s) Contributing to Overdue Interest / Penal')}</p>
                                                    <div className="aw-table-wrap" style={{ maxHeight: 300 }}>
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
                                                                        <td className={`is-right ${inst.penalDue > 0 ? 'is-danger' : ''}`}>₹{fmt(inst.penalDue)}</td>
                                                                        <td className="is-muted">{TIER_LABEL[inst.tier]}</td>
                                                                        <td className="is-muted">{inst.monthsOverdue > 0 ? t('{{1}}mo', { 1: inst.monthsOverdue }) : 'current'}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </>
                                            )}
                                            {activeTab === 'repay' && (
                                                <div className="aw-table-wrap" style={{ maxHeight: 300, marginTop: 8 }}>
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
                                            {activeTab === 'schedule' && (
                                                <div className="aw-table-wrap" style={{ maxHeight: 340, marginTop: 8 }}>
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
                                    </section>
                                )}

                                {/* ES-556: for a member who pays the EMI regularly (no NR). The employee decides from the payment pattern. */}
                                {!closed && !selectedLoanIsClosed && (
                                    <div className="aw-panel">
                                        <div className="aw-stack" style={{ gap: 8 }}>
                                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                                                <input type="checkbox" checked={form.nextMonth} onChange={e => toggleNextMonth(e.target.checked)}
                                                    style={{ width: 20, height: 20, marginTop: 2, accentColor: 'var(--aw-accent)' }} />
                                                <span>
                                                    <span className="aw-strong" style={{ display: 'block' }}>{t("Close on next month's outstanding")}</span>
                                                    <span className="aw-meta">{t("For a member who pays the EMI regularly and has no NR: this month's EMI is cut next month, so it is treated as already received. Interest is calculated on next month's outstanding principal. The closure waits in Past Transaction until that EMI arrives.")}</span>
                                                </span>
                                            </label>
                                            {form.nextMonth && quote.nextMonthInfo && (
                                                <span className="aw-meta aw-fade-in">
                                                    {t('EMI principal treated as received: ₹{{1}}. Outstanding used: ₹{{2}}. No penalty is added.', { 1: fmt(quote.nextMonthInfo.principal), 2: fmt(quote.outstandingPrincipal) })}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* What the member pays and the one action, always in view at the bottom of the quote. */}
                                {!closed && !selectedLoanIsClosed && (
                                    <div className="lec-actionbar">
                                        <div className="min-w-0">
                                            <span className="aw-label" style={{ margin: 0 }}>{t('Payable by Member')}</span>
                                            <span className="lec-pay">₹{fmt(quote.payableByMember)}</span>
                                            <span className="aw-meta" style={{ display: 'block' }}>
                                                {quote.rdShareAdjustment && form.applyRdShare && quote.rdShareAdjustment.appliedFromRdShare > 0
                                                    ? t('Settlement amount less ₹{{1}} from RD / share value', { 1: fmt(quote.rdShareAdjustment.appliedFromRdShare) })
                                                    : t('The amount to collect before closing')}
                                            </span>
                                        </div>
                                        <button type="button" onClick={() => setShowConfirm(true)} disabled={loading} className="aw-btn aw-btn-danger">
                                            {loading ? t('Sending…') : (form.nextMonth ? t('Hold in Past Transaction') : t('Send to Past Transaction'))}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </div>
            </div>

            <style>{`
        .app-window .lec-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: var(--aw-gap); padding-bottom: 12px; border-bottom: 1px solid var(--aw-border); }
        .app-window .lec-strip > div { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .app-window .lec-strip strong { color: var(--aw-text); font-size: calc(var(--type-body-size) + 3px); font-weight: 700; font-variant-numeric: tabular-nums; }
        .app-window .lec-block { padding: 12px 14px; border-radius: calc(var(--aw-radius) * 1.4); border: 1px solid var(--aw-border); background: var(--aw-surface-muted); display: flex; flex-direction: column; gap: 10px; min-width: 0; }
        .app-window .lec-block-head { display: flex; align-items: center; gap: 8px; width: 100%; padding: 0; border: 0; background: transparent; color: var(--aw-text); cursor: pointer; font: inherit; text-align: left; }
        .app-window .lec-block-head:focus-visible { outline: 3px solid var(--aw-focus); outline-offset: 3px; border-radius: 6px; }
        .app-window .lec-badges { display: inline-flex; flex-wrap: wrap; gap: 6px; margin-left: auto; }
        .app-window .lec-why summary { cursor: pointer; color: var(--aw-accent); font-size: calc(var(--type-body-size) - 1px); font-weight: 700; }
        .app-window .lec-why p { margin: 6px 0 0; }
        .app-window .lec-sched { margin: 0; }
        .app-window .lec-settle td { vertical-align: top; }
        .app-window .lec-settle td:nth-child(2) { max-width: 520px; line-height: 1.5; }
        .app-window .lec-settle .lec-sub td { background: color-mix(in srgb, var(--aw-accent) 5%, transparent); }
        .app-window .lec-settle .lec-total td { border-top: 2px solid var(--aw-border-strong); }
        .app-window .lec-settle .lec-total td.is-right { color: var(--aw-accent); font-size: calc(var(--type-body-size) + 3px); }
        .app-window .lec-tabs-card { padding: 0 14px 12px; gap: 0; }
        .app-window .lec-tabs-card .aw-tabs { padding: 0; background: transparent; }
        .app-window .lec-actionbar {
          position: sticky; bottom: 0; z-index: 3; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
          margin: 4px calc(var(--aw-pad) * -1) calc(var(--aw-pad) * -1); padding: 12px var(--aw-pad);
          background: var(--aw-surface); border-top: 1px solid var(--aw-border-strong); box-shadow: 0 -8px 20px -12px rgba(0, 0, 0, .35);
          border-radius: 0 0 calc(var(--aw-radius) * 1.8) calc(var(--aw-radius) * 1.8);
        }
        .app-window .lec-pay { display: block; color: var(--aw-accent); font-size: calc(var(--type-body-size) + 10px); font-weight: 700; line-height: 1.15; font-variant-numeric: tabular-nums; }
      `}</style>

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
                    <p className="aw-meta" style={{ lineHeight: 1.6 }}>
                        {form.nextMonth
                            ? t("This raises the early-closure voucher for loan #{{1}} in Past Transaction, calculated on next month's outstanding. Nothing is posted until the awaited EMI is received and the voucher is passed. The amount is fixed now: ₹{{2}}.", { 1: form.selectedLoanCase, 2: quote ? fmt(quote.finalClosureAmount) : '—' })
                            : t('This raises the early-closure voucher for loan #{{1}} in Past Transaction. Nothing is posted until the voucher is passed there. Closure amount: ₹{{2}}.', { 1: form.selectedLoanCase, 2: quote ? fmt(quote.finalClosureAmount) : '—' })}
                        {quote?.rdShareAdjustment && quote.rdShareAdjustment.appliedFromRdShare > 0 &&
                            ' ' + t('(₹{{1}} will also be applied from their RD/Share Value)', { 1: fmt(quote.rdShareAdjustment.appliedFromRdShare) })}
                    </p>
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
