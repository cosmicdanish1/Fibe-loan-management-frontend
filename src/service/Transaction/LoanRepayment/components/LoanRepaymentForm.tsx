import React, { useState } from 'react';
import { Search, RefreshCw, Users, CreditCard, IndianRupee, CheckCircle2, AlertCircle, FileText, ClipboardList } from 'lucide-react';
import type { useLoanRepayment } from '../hooks/useLoanRepayment';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';
import MemberField from '@/components/shared/kit/MemberField';
import LoanPositionPanel from '@/components/shared/loan/LoanPositionPanel';
import { useTranslation } from 'react-i18next';
import { tLabel } from '../../../../i18n';

type Props = ReturnType<typeof useLoanRepayment>;

const MONTHS = [
    { value: 1, label: tLabel('January') }, { value: 2, label: tLabel('February') }, { value: 3, label: tLabel('March') },
    { value: 4, label: tLabel('April') }, { value: 5, label: tLabel('May') }, { value: 6, label: tLabel('June') },
    { value: 7, label: tLabel('July') }, { value: 8, label: tLabel('August') }, { value: 9, label: tLabel('September') },
    { value: 10, label: tLabel('October') }, { value: 11, label: tLabel('November') }, { value: 12, label: tLabel('December') },
];

const LOAN_TYPE_LABEL: Record<string, string> = {
    RLN: 'Regular Loan', ALN: 'Emergency Loan', ELN: 'Loan Against RD',
};

const fmt = (n: number | string) =>
    Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d: string) => {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const TIER_LABEL: Record<number, string> = { 0: 'Grace', 1: 'Same-Month', 2: 'Monthly' };

// Two views of the same figures. Simple is what the operator needs to collect this month's dues; Detailed adds the
// EMI working, the full loan position and the repayment history. Both use the same dues and the same Save.
type RepaymentView = 'simple' | 'detailed';
const viewKey = () => {
    let user = '';
    try { user = String(JSON.parse(localStorage.getItem('user') || '{}')?.username || ''); } catch { /* no saved user */ }
    return `lms-loan-repayment-view:${user}`;
};
const loadView = (): RepaymentView => {
    try { return localStorage.getItem(viewKey()) === 'detailed' ? 'detailed' : 'simple'; } catch { return 'simple'; }
};

const LoanRepaymentForm: React.FC<Props> = ({
    form, activeLoans, dueStatus, dueStatusLoading, repaymentHistory, loading, historyLoading,
    message, flagNotice, plan, planError, pendingRepayment, sentVoucher,
    updateForm, handleMemberLookup, handleLoanSelect, handleSubmit, handleReset,
}) => {
    const { t } = useTranslation();
    const [loanSearch, setLoanSearch] = useState('');
    const [showAllHistory, setShowAllHistory] = useState(false);
    const [showEmiDetail, setShowEmiDetail] = useState(false);
    const [view, setViewState] = useState<RepaymentView>(loadView);
    const detailed = view === 'detailed';
    const setView = (next: RepaymentView) => {
        setViewState(next);
        try { localStorage.setItem(viewKey(), next); } catch { /* storage unavailable */ }
    };

    const selectedLoan = activeLoans.find(l => l.loancaseno === form.selectedLoanCase);
    const filteredLoans = activeLoans.filter(l =>
        loanSearch.trim() === '' || l.loancaseno.includes(loanSearch.trim())
    );
    // /repayment-history returns every loan the member has — narrow it to the
    // selected loan by default so a payment doesn't get lost among the rest.
    const filteredHistory = (form.selectedLoanCase && !showAllHistory)
        ? repaymentHistory.filter(r => String(r.loancaseno) === form.selectedLoanCase)
        : repaymentHistory;

    const unpaid = dueStatus?.unpaidInstallments || [];
    const totalDue = dueStatus?.totalDue || 0;
    const blockedByPending = !!pendingRepayment;
    const canSave = !(loading || form.paymentAmount <= 0 || !!planError || blockedByPending || !plan);

    const onMemberSelected = (member: any) => {
        const memberNo = String(member.memberNo || '');
        const memberName = member.memberName || member.name || '';
        handleMemberLookup(memberNo, memberName);
        setLoanSearch('');
    };

    usePageToolbarActions({
        onSave: handleSubmit,
        saveLabel: loading ? 'Sending...' : 'Send to Past Transaction',
        saveEnabled: canSave,
    });

    return (
        <div className="app-window aw-calm aw-tint">
            {/* ── Header ── */}
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <div className="aw-crumb">{t('Transaction')}</div>
                    <h1 className="aw-title">{t('NR Repayment')}</h1>
                    <p className="aw-desc">{t("Collect the installments that are due now. The payment is posted when it is passed in Past Transaction.")}</p>
                </div>
                <div className="aw-actions">
                    <div className="aw-chips" role="radiogroup" aria-label={t('How much detail to show')}>
                        <button type="button" role="radio" aria-checked={!detailed} className="aw-chip" onClick={() => setView('simple')}
                            data-tip={t('Only what is needed to collect the dues')} data-tip-pos="bottom">{t('Simple')}</button>
                        <button type="button" role="radio" aria-checked={detailed} className="aw-chip" onClick={() => setView('detailed')}
                            data-tip={t('Adds the EMI working, the loan position and the history')} data-tip-pos="bottom">{t('Detailed')}</button>
                    </div>
                    <button type="button" onClick={handleReset} className="aw-btn aw-btn-secondary">
                        <RefreshCw size={13} /> {t('Reset')}
                    </button>
                </div>
            </div>

            <div className="aw-content">
                <div className="lr-layout">

                    {/* ── Rail: who and which loan ── */}
                    <aside className="lr-rail">

                        {/* ① Member */}
                        <section id="lr-member" className="aw-card">
                            <div className="aw-card-head">
                                <span className="aw-card-icon"><Users size={14} /></span>
                                <h2 className="aw-card-title">{t('Member')}</h2>
                            </div>
                            <div className="aw-stack">
                                <div className="aw-inline" style={{ alignItems: 'flex-end', gap: 8 }}>
                                    <div style={{ width: 150 }}>
                                        <label className="aw-label" htmlFor="lr-mb">{t('Member No.')}</label>
                                        <MemberField
                                            id="lr-mb"
                                            value={form.mbno}
                                            onChange={v => updateForm('mbno', v)}
                                            onSelect={onMemberSelected}
                                            onSubmit={(v) => handleMemberLookup(v, '')}
                                            placeholder={t('Member No.')}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleMemberLookup(form.mbno, '')}
                                        disabled={loading || !form.mbno}
                                        className="aw-btn aw-btn-primary"
                                    >
                                        {t('Search')}
                                    </button>
                                </div>
                                <div>
                                    <label className="aw-label" htmlFor="lr-name">{t('Member name')}</label>
                                    <input id="lr-name" type="text" placeholder={t('Member name')} value={form.memberName} readOnly className="aw-input" />
                                </div>
                            </div>
                        </section>

                        {/* ② Loan list */}
                        {activeLoans.length > 0 && (
                            <section id="lr-loan" className="aw-card aw-fade-in">
                                <div className="aw-card-head">
                                    <span className="aw-card-icon"><CreditCard size={14} /></span>
                                    <h2 className="aw-card-title">{t('Select loan')}</h2>
                                    <span className="aw-meta" style={{ marginLeft: 'auto' }}>{t('{{1}} loan{{2}}', { 1: filteredLoans.length, 2: filteredLoans.length !== 1 ? 's' : '' })}</span>
                                </div>
                                <div className="aw-input-wrap has-icon">
                                    <Search size={13} />
                                    <input type="text" value={loanSearch} onChange={e => setLoanSearch(e.target.value)} placeholder={t('Search by case no.')} aria-label={t('Search by case number')} className="aw-input" />
                                </div>
                                <div className="aw-stack" style={{ gap: 8, maxHeight: 220, overflowY: 'auto' }} role="radiogroup" aria-label={t('Active loans')}>
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
                                                style={{ flexDirection: 'column', alignItems: 'stretch', gap: 2, padding: '8px 12px', border: `1px solid ${selected ? 'var(--aw-accent)' : 'var(--aw-border)'}` }}
                                            >
                                                <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                                    <span className="aw-strong">{LOAN_TYPE_LABEL[loan.loantype] || loan.loantype}</span>
                                                    <span className="aw-meta">#{loan.loancaseno}</span>
                                                </span>
                                                <span style={{ display: 'flex', gap: 12 }} className="aw-meta">
                                                    <span>{t('Balance:')} <strong style={{ color: 'var(--aw-danger)' }}>₹{fmt(loan.balance)}</strong></span>
                                                    <span>EMI: <strong style={{ color: 'var(--aw-text)' }}>₹{fmt(loan.instal_amt)}</strong></span>
                                                </span>
                                            </button>
                                        );
                                    })}
                                    {filteredLoans.length === 0 && loanSearch && (
                                        <p className="aw-meta" style={{ textAlign: 'center', padding: '12px 4px' }}>{t('No loans match "')}{loanSearch}"</p>
                                    )}
                                </div>
                            </section>
                        )}

                        {message && !form.selectedLoanCase && (
                            <div className={`aw-alert aw-fade-in ${message.type === 'success' ? 'aw-alert-success' : 'aw-alert-danger'}`} style={{ marginBottom: 0 }} role="status">
                                <span>{message.text}</span>
                            </div>
                        )}
                    </aside>

                    {/* ── Main: what is due, the payment, and the working ── */}
                    <main className="lr-main">

                        {/* What is due now: one row per installment, with totals */}
                        {form.selectedLoanCase && dueStatus && (
                            <section id="lr-dues" className="aw-card aw-fade-in">
                                <div className="aw-card-head">
                                    <span className="aw-card-icon" style={{ color: unpaid.length ? 'var(--aw-warning)' : undefined }}><AlertCircle size={14} /></span>
                                    <h2 className="aw-card-title">
                                        {unpaid.length > 0 ? t('{{1}} installment(s) due — oldest recovered first', { 1: unpaid.length }) : t('Nothing due')}
                                    </h2>
                                    {unpaid.length > 0 && <span className="aw-strong" style={{ marginLeft: 'auto', color: 'var(--aw-warning)' }}>₹{fmt(totalDue)}</span>}
                                </div>
                                {unpaid.length > 0 && (
                                    <div className="aw-table-wrap" style={{ maxHeight: 360 }}>
                                        <table className="aw-table" style={{ minWidth: 760 }}>
                                            <thead>
                                                <tr>
                                                    <th>{t('Inst. No.')}</th>
                                                    <th className="is-right">EMI</th>
                                                    <th>{t('Due date')}</th>
                                                    <th className="is-right">{t('Principal due')}</th>
                                                    <th className="is-right">{t('Interest due')}</th>
                                                    <th className="is-right">{t('Penalty due')}</th>
                                                    <th>{t('Penalty tier')}</th>
                                                    <th>{t('Overdue')}</th>
                                                    <th className="is-right">{t('Total due')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {unpaid.map(inst => (
                                                    <tr key={inst.installmentNo}>
                                                        <td>{inst.installmentNo}</td>
                                                        <td className="is-right">₹{fmt(inst.emiAmount)}</td>
                                                        <td className="is-muted">{fmtDate(inst.dueDate)}</td>
                                                        <td className="is-right">₹{fmt(inst.principalDue)}</td>
                                                        <td className="is-right">₹{fmt(inst.interestDue)}</td>
                                                        <td className="is-right is-danger">{inst.penalDue > 0 ? `₹${fmt(inst.penalDue)}` : '—'}</td>
                                                        <td className="is-muted">{t(TIER_LABEL[inst.tier] || '—')}</td>
                                                        <td className={inst.monthsOverdue > 0 ? 'is-danger' : 'is-muted'}>{inst.monthsOverdue > 0 ? t('{{1}} mo', { 1: inst.monthsOverdue }) : t('Current')}</td>
                                                        <td className="is-right aw-strong">₹{fmt(inst.principalDue + inst.interestDue + inst.penalDue)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr style={{ fontWeight: 600 }}>
                                                    <td>{t('Total')}</td>
                                                    <td className="is-right">₹{fmt(dueStatus.totalEmi)}</td>
                                                    <td />
                                                    <td className="is-right">₹{fmt(dueStatus.totalPrincipalDue)}</td>
                                                    <td className="is-right">₹{fmt(dueStatus.totalInterestDue)}</td>
                                                    <td className="is-right is-danger">₹{fmt(dueStatus.totalPenalDue)}</td>
                                                    <td />
                                                    <td />
                                                    <td className="is-right">₹{fmt(dueStatus.totalDue)}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                )}
                            </section>
                        )}

                        {/* ③ Payment details */}
                        {form.selectedLoanCase && (
                            <section id="lr-pay" className="aw-card aw-fade-in">
                                <div className="aw-card-head">
                                    <span className="aw-card-icon"><IndianRupee size={14} /></span>
                                    <h2 className="aw-card-title">{t('Payment details')}</h2>
                                </div>

                                <div className="aw-stack">
                                    {selectedLoan && (
                                        <p className="aw-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
                                            <span>{t('Original:')} <strong style={{ color: 'var(--aw-text)' }}>₹{fmt(selectedLoan.loan_amt)}</strong></span>
                                            <span>{t('Balance:')} <strong style={{ color: 'var(--aw-danger)' }}>₹{fmt(selectedLoan.balance)}</strong></span>
                                            {dueStatus && <span>{t('Paid:')} <strong style={{ color: 'var(--aw-text)' }}>{t('{{1}} of {{2}}', { 1: dueStatus.paidInstallments, 2: dueStatus.totalInstallments })}</strong></span>}
                                        </p>
                                    )}

                                    {/* One pending voucher per loan: a repayment already waiting blocks a second one */}
                                    {blockedByPending && (
                                        <div className="aw-alert aw-alert-warning" style={{ marginBottom: 0 }} role="alert">
                                            <ClipboardList size={14} />
                                            <span>{t('A repayment of ₹{{1}} is already waiting in Past Transaction (voucher {{2}}). Accept or reject it there before recording another.', { 1: fmt(pendingRepayment!.amount), 2: pendingRepayment!.voucher_no })}</span>
                                        </div>
                                    )}

                                    {dueStatusLoading ? (
                                        <p className="aw-meta" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><RefreshCw size={12} className="aw-spin" /> {t('Checking outstanding dues…')}</p>
                                    ) : dueStatus && unpaid.length === 0 ? (
                                        <div className="aw-alert aw-alert-success" style={{ marginBottom: 0 }}>
                                            <CheckCircle2 size={15} />
                                            <span>{t('Nothing is due on this loan right now. To pay it off ahead of schedule, use Loan Early Closure.')}</span>
                                        </div>
                                    ) : null}

                                    <div>
                                        <label className="aw-label" htmlFor="lr-amt">{t('Amount (₹)')}</label>
                                        <div className="aw-inline" style={{ gap: 8 }}>
                                            <input
                                                id="lr-amt"
                                                type="number"
                                                min={0}
                                                max={totalDue || undefined}
                                                value={form.paymentAmount || ''}
                                                onChange={e => updateForm('paymentAmount', Number(e.target.value))}
                                                className="aw-input"
                                                placeholder={totalDue ? fmt(totalDue) : ''}
                                                disabled={blockedByPending || unpaid.length === 0}
                                            />
                                            <button
                                                type="button"
                                                className="aw-btn aw-btn-secondary"
                                                onClick={() => updateForm('paymentAmount', totalDue)}
                                                disabled={blockedByPending || unpaid.length === 0 || form.paymentAmount === totalDue}
                                                data-tip={t('Fill in everything that is due')}
                                            >
                                                {t('Full dues')}
                                            </button>
                                        </div>
                                        <p className="aw-meta" style={{ marginTop: 4 }}>
                                            {t('Up to ₹{{1}} (everything due). It is applied penalty, then interest, then principal, oldest installment first.', { 1: fmt(totalDue) })}
                                        </p>
                                        {planError && <p className="aw-meta" style={{ marginTop: 4, color: 'var(--aw-danger)', fontWeight: 600 }} role="alert">{planError}</p>}
                                    </div>
                                    <div className="aw-two">
                                        <div>
                                            <label className="aw-label" htmlFor="lr-rcpt">{t('Receipt No.')}</label>
                                            <input id="lr-rcpt" type="text" value={form.receiptNo} onChange={e => updateForm('receiptNo', e.target.value)} className="aw-input" />
                                        </div>
                                        <div>
                                            <label className="aw-label" htmlFor="lr-narr">{t('Narration')}</label>
                                            <input id="lr-narr" type="text" value={form.narration} onChange={e => updateForm('narration', e.target.value)} className="aw-input" />
                                        </div>
                                    </div>

                                    {plan && !planError && (
                                        <div className="aw-panel">
                                            <div className="aw-rows">
                                                <div className="aw-row"><span className="aw-row-label">{t('Principal')}</span><span className="aw-row-value">₹{fmt(plan.principal)}</span></div>
                                                <div className="aw-row"><span className="aw-row-label">{t('Interest')}</span><span className="aw-row-value">₹{fmt(plan.interest)}</span></div>
                                                <div className="aw-row"><span className="aw-row-label">{t('Penalty')}</span><span className="aw-row-value" style={{ color: plan.penal > 0 ? 'var(--aw-danger)' : undefined }}>₹{fmt(plan.penal)}</span></div>
                                                <div className="aw-row"><span className="aw-row-label aw-strong">{t('Total collected')}</span><span className="aw-row-value aw-strong">₹{fmt(plan.amount)}</span></div>
                                                {plan.amount < totalDue - 0.005 && (
                                                    <div className="aw-row"><span className="aw-row-label">{t('Still due after this')}</span><span className="aw-row-value" style={{ color: 'var(--aw-warning)' }}>₹{fmt(totalDue - plan.amount)}</span></div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {message && (
                                        <div className={`aw-alert aw-fade-in ${message.type === 'success' ? 'aw-alert-success' : 'aw-alert-danger'}`} style={{ marginBottom: 0 }} role="status">
                                            <span>{message.text}</span>
                                        </div>
                                    )}

                                    {sentVoucher && (
                                        <div className="aw-alert aw-alert-info aw-fade-in" style={{ marginBottom: 0 }} role="status">
                                            <ClipboardList size={14} />
                                            <span><strong>{t('Sent to Past Transaction.')}</strong> {t('Voucher {{1}} for ₹{{2}} posts when it is passed. Nothing has been posted yet.', { 1: sentVoucher.voucherNo, 2: fmt(sentVoucher.amount) })}</span>
                                        </div>
                                    )}

                                    {/* Check-this flag raised for this payment (possible old-EMI / new-EMI mix-up).
                                        Only asks someone to look; it never changes how the money is applied. */}
                                    {flagNotice && (
                                        <div className="aw-alert aw-alert-warning aw-fade-in" style={{ marginBottom: 0 }} role="alert">
                                            <AlertCircle size={14} />
                                            <span><strong>{t('Please check this payment.')}</strong> {flagNotice}</span>
                                        </div>
                                    )}

                                    <button type="button" onClick={handleSubmit} disabled={!canSave} className="aw-btn aw-btn-primary" style={{ width: '100%' }}>
                                        {loading ? <RefreshCw size={13} className="aw-spin" /> : null}
                                        {loading ? t('Sending…') : t('Send to Past Transaction')}
                                    </button>
                                </div>
                            </section>
                        )}

                        {/* How the typed amount will be applied (worked out by the server) */}
                        {form.selectedLoanCase && plan && plan.rows.length > 0 && !planError && (
                            <section className="aw-card aw-fade-in">
                                <div className="aw-card-head">
                                    <span className="aw-card-icon"><CheckCircle2 size={14} /></span>
                                    <h2 className="aw-card-title">{t('This payment will cover')}</h2>
                                </div>
                                <div className="aw-stack" style={{ gap: 8 }}>
                                    {plan.rows.map(r => {
                                        const inst = unpaid.find(u => u.installmentNo === r.installmentNo);
                                        const settled = !!inst && r.principal >= inst.principalDue - 0.005 && r.interest >= inst.interestDue - 0.005 && r.penal >= inst.penalDue - 0.005;
                                        return (
                                            <div key={r.installmentNo} className="aw-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                                <span>
                                                    {t('Installment')} #{r.installmentNo}{' '}
                                                    <span className={`aw-pill tone-${settled ? 'success' : 'warning'}`}>{settled ? t('fully settled') : t('partially covered')}</span>
                                                </span>
                                                <span className="aw-meta">
                                                    {r.penal > 0 ? `₹${fmt(r.penal)} ${t('penal')} + ` : ''}{r.interest > 0 ? `₹${fmt(r.interest)} ${t('interest')} + ` : ''}₹{fmt(r.principal)} {t('principal')}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* Detailed view: the working behind the figures, the loan position and the history */}
                        {detailed && form.selectedLoanCase && selectedLoan && dueStatus && (
                            <section className="aw-card aw-fade-in">
                                <div className="aw-card-head">
                                    <span className="aw-card-icon"><FileText size={14} /></span>
                                    <h2 className="aw-card-title">{t('How the EMI was built')}</h2>
                                    <button type="button" className="aw-btn aw-btn-ghost aw-btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setShowEmiDetail(v => !v)} aria-expanded={showEmiDetail}>
                                        {showEmiDetail ? t('Hide calculation') : t('Show calculation')}
                                    </button>
                                </div>
                                <p className="aw-meta">EMI <strong style={{ color: 'var(--aw-text)' }}>₹{fmt(selectedLoan.instal_amt)}</strong> · {t('Remaining:')} {dueStatus.totalInstallments - dueStatus.paidInstallments} {t('of')} {dueStatus.totalInstallments}</p>
                                {showEmiDetail && (
                                    <div className="aw-meta aw-fade-in" style={{ fontFamily: "'IBM Plex Mono', 'Courier New', monospace", lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
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
                                                {t('This loan predates the reducing-balance schedule feature — Monthly Interest is a simple flat split')}
                                                {' '}= <b style={{ color: 'var(--aw-text)' }}>₹{fmt(dueStatus.emiBreakdown.monthlyInterestForEMI)}</b>
                                            </div>
                                        )}
                                        <div style={{ paddingTop: 4, borderTop: '1px solid var(--aw-border)' }}>
                                            EMI = Monthly Principal (₹{fmt(dueStatus.emiBreakdown.monthlyPrincipal)}) + Monthly Interest (₹{fmt(dueStatus.emiBreakdown.monthlyInterestForEMI)})
                                            {' '}= <b style={{ color: 'var(--aw-accent)' }}>₹{fmt(dueStatus.emiBreakdown.instalAmt)}</b>
                                        </div>
                                    </div>
                                )}
                            </section>
                        )}

                        {/* Read-only Loan Position: ledger vs loan record, schedule, closure and notices (nothing saved) */}
                        {detailed && form.selectedLoanCase && (
                            <LoanPositionPanel
                                mbno={form.mbno}
                                loancaseno={form.selectedLoanCase}
                                loantype={selectedLoan?.loantype}
                                refreshKey={`${repaymentHistory.length}|${sentVoucher?.voucherNo ?? ''}`}
                            />
                        )}

                        {detailed && (
                            <section className="aw-card">
                                <div className="aw-card-head">
                                    <span className="aw-card-icon"><FileText size={14} /></span>
                                    <div>
                                        <h2 className="aw-card-title">
                                            {t('Repayment history')}
                                            {form.selectedLoanCase && !showAllHistory && <span style={{ color: 'var(--aw-muted)', fontWeight: 500 }}> — Loan #{form.selectedLoanCase}</span>}
                                        </h2>
                                        {form.memberName && <p className="aw-meta">{form.memberName} — #{form.mbno}</p>}
                                    </div>
                                    {form.selectedLoanCase && (
                                        <button type="button" onClick={() => setShowAllHistory(v => !v)} className="aw-btn aw-btn-ghost aw-btn-sm" style={{ marginLeft: 'auto' }}>
                                            {showAllHistory ? t('Show this loan only') : t("Show all this member's loans")}
                                        </button>
                                    )}
                                </div>
                                {historyLoading ? (
                                    <div className="aw-empty" style={{ padding: 28 }}><RefreshCw size={22} className="aw-spin" /><span className="aw-meta">{t('Loading…')}</span></div>
                                ) : filteredHistory.length === 0 ? (
                                    <div className="aw-empty" style={{ padding: 28 }}>
                                        <span className="aw-meta">
                                            {!form.mbno
                                                ? t('Search for a member to view history.')
                                                : form.selectedLoanCase && !showAllHistory
                                                    ? t('No repayment records found for this loan yet.')
                                                    : t('No repayment records found.')}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="aw-table-wrap" style={{ maxHeight: '44vh' }}>
                                        <table className="aw-table" style={{ minWidth: 820 }}>
                                            <thead>
                                                <tr>
                                                    <th>{t('Loan Case')}</th><th>{t('Type')}</th><th>{t('Month/Year')}</th>
                                                    <th className="is-right">{t('Amount')}</th><th>{t('Receipt')}</th><th className="is-right">{t('Remaining')}</th>
                                                    <th>{t('Date')}</th><th>{t('Narration')}</th>
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
                                                            ₹... + closure interest ₹...)" so a case that hit ₹0 balance via
                                                            consolidation doesn't look like an unexplained data gap. */}
                                                        <td className={row.narration?.startsWith('Consolidated into') ? 'is-warning' : 'is-muted'} style={{ maxWidth: 260 }}>
                                                            {row.narration || '—'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </section>
                        )}
                    </main>
                </div>
            </div>

            <style>{`
        .lr-layout { display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start; max-width: 1440px; }
        .lr-rail { flex: 1 1 300px; max-width: 340px; display: flex; flex-direction: column; gap: var(--aw-gap); position: sticky; top: 0; max-height: calc(100vh - var(--aw-pad) * 2); overflow-y: auto; overflow-x: hidden; padding: 2px; margin: -2px; }
        .lr-main { flex: 999 1 520px; min-width: 0; display: flex; flex-direction: column; gap: var(--aw-gap); }
        @media (max-width: 900px) { .lr-rail { position: static; flex-basis: 100%; max-width: none; max-height: none; overflow: visible; } }
      `}</style>
        </div>
    );
};

export default LoanRepaymentForm;
