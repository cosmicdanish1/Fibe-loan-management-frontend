import React, { useState } from 'react';
import {
    AlertTriangle, CalendarClock, CheckCircle2, ChevronRight, CreditCard, FileSignature, GitBranch, IndianRupee,
    RefreshCw, Send, TrendingDown, TrendingUp, Users, Wallet, X,
} from 'lucide-react';
import MemberField from '@/components/shared/kit/MemberField';
import AwDialog from '@/components/shared/kit/AwDialog';
import ReagreementDocumentActions from '@/components/shared/loan/ReagreementDocumentActions';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';
import { fmtDate, fmtMoney, fmtMonth, ReagreementDto, STATUS_LABEL, STATUS_TONE } from '../../../../services/reagreementApi';
import type { LoanReagreementHook } from '../hook/useLoanReagreement';
import { localISODate } from '../../../../utils/dates';
import { useTranslation } from 'react-i18next';

const TYPE_LABEL: Record<string, string> = { RLN: 'Regular Loan', ALN: 'Emergency Loan', ELN: 'Loan Against RD' };

// Two views of the same quote (same pattern as Loan Early Closure). Simple = what the operator needs to apply;
// Detailed = the full old-vs-new table, the working and the schedules. Warnings and errors show in both.
type RaView = 'simple' | 'detailed';
const viewKey = () => {
    let user = '';
    try { user = String(JSON.parse(localStorage.getItem('user') || '{}')?.username || ''); } catch { /* no saved user */ }
    return `lms-loan-reagreement-view:${user}`;
};
const loadView = (): RaView => {
    try { return localStorage.getItem(viewKey()) === 'detailed' ? 'detailed' : 'simple'; } catch { return 'simple'; }
};

const delta = (oldV: number, newV: number) => {
    const d = newV - oldV;
    if (Math.abs(d) < 0.005) return null;
    const Icon = d < 0 ? TrendingDown : TrendingUp;
    return <span style={{ marginLeft: 6, color: d < 0 ? 'var(--aw-success)' : 'var(--aw-danger)', display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11 }}>
        <Icon size={11} />{d > 0 ? '+' : ''}{fmtMoney(d)}</span>;
};

const Num = ({ label, value, strong, tone }: { label: string; value: React.ReactNode; strong?: boolean; tone?: 'danger' | 'success' | undefined }) => (
    <div className="lra-num">
        <span className="aw-label">{label}</span>
        <span className={strong ? 'aw-strong lra-num-v' : 'lra-num-v'} style={tone ? { color: `var(--aw-${tone})` } : undefined}>{value}</span>
    </div>
);

const STYLE = `
.app-window .lra-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 12px; align-items: start; }
.app-window .lra-card { display: flex; flex-direction: column; gap: 12px; padding: 14px; min-width: 0; border-radius: 12px; border: 1px solid var(--aw-border); background: var(--aw-surface, transparent); }
.app-window .lra-card.is-key { border-color: var(--aw-accent); background: color-mix(in srgb, var(--aw-accent) 6%, transparent); }
.app-window .lra-card-head { display: flex; align-items: center; gap: 8px; color: var(--aw-muted); }
.app-window .lra-card-head .aw-strong { color: var(--aw-text); }
.app-window .lra-big { font-size: calc(var(--type-body-size) + 10px); font-weight: 700; line-height: 1.15; font-variant-numeric: tabular-nums; color: var(--aw-text); }
.app-window .lra-nums { display: grid; grid-template-columns: repeat(auto-fit, minmax(95px, 1fr)); gap: 10px 14px; padding-top: 10px; border-top: 1px solid var(--aw-border); }
.app-window .lra-num { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.app-window .lra-num-v { font-variant-numeric: tabular-nums; font-size: calc(var(--type-body-size) + 1px); color: var(--aw-text); }
.app-window .lra-block { padding: 12px 14px; border-radius: calc(var(--aw-radius) * 1.4); border: 1px solid var(--aw-border); background: var(--aw-surface-muted); display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.app-window .lra-tabs-card { padding: 0 14px 12px; gap: 0; }
.app-window .lra-tabs-card .aw-tabs { padding: 0; background: transparent; }
.app-window .lra-actionbar {
  position: sticky; bottom: 0; z-index: 3; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
  margin: 4px calc(var(--aw-pad) * -1) calc(var(--aw-pad) * -1); padding: 12px var(--aw-pad);
  background: var(--aw-surface); border-top: 1px solid var(--aw-border-strong); box-shadow: 0 -8px 20px -12px rgba(0, 0, 0, .35);
  border-radius: 0 0 calc(var(--aw-radius) * 1.8) calc(var(--aw-radius) * 1.8);
}
.app-window .lra-pay { display: block; color: var(--aw-accent); font-size: calc(var(--type-body-size) + 10px); font-weight: 700; line-height: 1.15; font-variant-numeric: tabular-nums; }
`;

const LoanReagreementForm: React.FC<LoanReagreementHook> = ({
    mbno, setMbno, memberName, loans, openList, selected, form, quote, quoteLoading, loadingLoans, saving, message, applied,
    updateForm, handleMemberLookup, selectLoan, fieldError, canApply, apply, cancelOpen, handleReset, handleExit,
}) => {
  const { t } = useTranslation();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [cancelTarget, setCancelTarget] = useState<ReagreementDto | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [view, setViewState] = useState<RaView>(loadView);
    const detailed = view === 'detailed';
    const setView = (next: RaView) => { setViewState(next); try { localStorage.setItem(viewKey(), next); } catch { /* storage unavailable */ } };
    const [tab, setTab] = useState<'unpaid' | 'schedule'>('schedule');

    usePageToolbarActions({
        onSave: () => setConfirmOpen(true),
        saveLabel: saving ? 'Applying…' : 'Apply',
        saveEnabled: canApply,
    });

    // ES-556: with one EMI left the decision is the closure, not a re-agreement; show it as a pop-up, once per loan.
    const [oneEmiDismissed, setOneEmiDismissed] = useState('');
    const oneEmiLeft = (quote?.errors as any[] | undefined)?.find(e => e.code === 'ONE_EMI_LEFT');
    const oneEmiKey = String(quote?.loan?.oldCaseNo ?? '');
    const neu = quote?.neu;
    const pos = quote?.position;
    const old = quote?.old;
    const tenureErr = fieldError('tenure');
    const rateErr = fieldError('rate');
    const dateErr = fieldError('applicationDate');
    const generalErrors = (quote?.errors ?? []).filter(e => e.field === 'loan' || e.field === 'general');

    const tabList = quote ? [
        ...(detailed && pos && pos.unpaidInstallments.length > 0 ? [{ id: 'unpaid' as const, label: t('Unpaid installments already due'), count: pos.unpaidInstallments.length }] : []),
        ...(detailed && quote.schedule.length > 0 ? [{ id: 'schedule' as const, label: t('New installment schedule'), count: quote.schedule.length }] : []),
    ] : [];
    const activeTab = tabList.find(x => x.id === tab)?.id ?? tabList[0]?.id;

    return (
        <div className="app-window aw-calm">
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">{t('Loan Re-agreement')}</h1>
                    <p className="aw-desc">{detailed
                        ? t('Restructure an active loan — the outstanding principal carries over; term and rate change. Goes through Sanction → Loan Payment → Pass Transactions.')
                        : t('Change the term and rate of an active loan and see what the member pays')}</p>
                </div>
                <div className="aw-actions">
                    <div className="aw-chips" role="radiogroup" aria-label={t('How much detail to show')}>
                        <button type="button" role="radio" aria-checked={!detailed} className="aw-chip" onClick={() => setView('simple')}
                            data-tip={t('Only what is needed to apply')} data-tip-pos="bottom">{t('Simple')}</button>
                        <button type="button" role="radio" aria-checked={detailed} className="aw-chip" onClick={() => setView('detailed')}
                            data-tip={t('The full working: comparison, position and schedules')} data-tip-pos="bottom">{t('Detailed')}</button>
                    </div>
                    <button type="button" onClick={handleReset} className="aw-btn aw-btn-secondary"><RefreshCw size={13} /> {t('Reset')}</button>
                    <button type="button" onClick={handleExit} className="aw-btn aw-btn-ghost"><X size={13} /> {t('Exit')}</button>
                </div>
            </div>

            <div className="aw-content">
                <div className="aw-split aw-split-form" style={{ height: 'auto', gridTemplateColumns: 'minmax(300px, 4fr) minmax(0, 8fr)', alignItems: 'start' }}>
                    {/* ── left: member, loans, new terms, open re-agreements ── */}
                    <div className="aw-stack" style={{ minWidth: 0 }}>
                        <section className="aw-card">
                            <div className="aw-card-head"><span className="aw-card-icon"><Users size={14} /></span><h2 className="aw-card-title">{t('Member')}</h2></div>
                            <div className="aw-stack">
                                <div className="aw-inline" style={{ alignItems: 'flex-end', gap: 8 }}>
                                    <div style={{ width: 150 }}>
                                        <label className="aw-label" htmlFor="lra-mb">{t('Member No.')}</label>
                                        <MemberField id="lra-mb" value={mbno} onChange={setMbno}
                                            onSelect={(m: any) => handleMemberLookup(String(m.memberNo || ''), m.memberName || m.name || '')}
                                            onSubmit={(v) => handleMemberLookup(v, '')} placeholder={t('Member No.')} />
                                    </div>
                                    <button type="button" className="aw-btn aw-btn-primary" disabled={loadingLoans || !mbno} onClick={() => handleMemberLookup(mbno, memberName)}>{t('Search')}</button>
                                </div>
                                <div>
                                    <label className="aw-label" htmlFor="lra-name">{t('Member name')}</label>
                                    <input id="lra-name" className="aw-input" value={memberName} readOnly placeholder={t('Member name')} />
                                </div>
                            </div>
                        </section>

                        {loans.length > 0 && (
                            <section className="aw-card aw-fade-in">
                                <div className="aw-card-head"><span className="aw-card-icon"><CreditCard size={14} /></span><h2 className="aw-card-title">{t('Active loans')}</h2>
                                    <span className="aw-meta" style={{ marginLeft: 'auto' }}>{loans.length}</span></div>
                                <div className="aw-stack" style={{ gap: 8 }} role="radiogroup" aria-label={t('Active loans')}>
                                    {loans.map(l => {
                                        const isSel = selected?.loanCaseNo === l.loanCaseNo && selected?.loanType === l.loanType;
                                        return (
                                            <button key={`${l.loanType}-${l.loanCaseNo}`} type="button" role="radio" aria-checked={isSel} onClick={() => selectLoan(l)}
                                                className="aw-right-cell"
                                                style={{ flexDirection: 'column', alignItems: 'stretch', gap: 2, padding: '9px 10px', border: `1px solid ${isSel ? 'var(--aw-accent)' : 'var(--aw-border)'}` }}>
                                                <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                                    <span className="aw-strong">{TYPE_LABEL[l.loanType] || l.loanType}</span><span className="aw-meta">#{l.loanCaseNo}</span>
                                                </span>
                                                <span className="aw-meta">{t('Balance')} <strong style={{ color: 'var(--aw-danger)' }}>₹{fmtMoney(l.balance)}</strong> · {l.rate}% · {l.installments} {t('inst.')}</span>
                                                {l.openReagreement && <span className="aw-pill tone-warning" style={{ alignSelf: 'flex-start' }}>{t('Open re-agreement')} {l.openReagreement}</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* New terms — the only inputs; everything else is calculated by the server */}
                        {selected && !selected.openReagreement && (
                            <section className="aw-card aw-fade-in">
                                <div className="aw-card-head"><span className="aw-card-icon"><FileSignature size={14} /></span>
                                    <h2 className="aw-card-title">{t('New terms')}</h2></div>
                                <div className="aw-stack">
                                    <div>
                                        <label className="aw-label" htmlFor="lra-n">{t('Number of installments (tenure)')} <span style={{ color: 'var(--aw-danger)' }}>*</span></label>
                                        <input id="lra-n" className="aw-input" inputMode="numeric" value={form.tenure}
                                            onChange={e => updateForm('tenure', e.target.value.replace(/[^0-9]/g, ''))} aria-invalid={!!tenureErr}
                                            style={tenureErr ? { borderColor: 'var(--aw-danger)' } : undefined} />
                                        {tenureErr && <p className="aw-meta" style={{ color: 'var(--aw-danger)', marginTop: 3 }}>{tenureErr}</p>}
                                    </div>
                                    <div>
                                        <label className="aw-label" htmlFor="lra-r">{t('Interest rate (% p.a.)')} <span style={{ color: 'var(--aw-danger)' }}>*</span></label>
                                        <input id="lra-r" className="aw-input" inputMode="decimal" value={form.rate}
                                            onChange={e => updateForm('rate', e.target.value.replace(/[^0-9.]/g, ''))} aria-invalid={!!rateErr}
                                            style={rateErr ? { borderColor: 'var(--aw-danger)' } : undefined} />
                                        {rateErr && <p className="aw-meta" style={{ color: 'var(--aw-danger)', marginTop: 3 }}>{rateErr}</p>}
                                    </div>
                                    <div>
                                        <label className="aw-label" htmlFor="lra-d">{t('Application date')}</label>
                                        <input id="lra-d" type="date" className="aw-input" value={form.applicationDate}
                                            onChange={e => updateForm('applicationDate', e.target.value)} aria-invalid={!!dateErr}
                                            style={dateErr ? { borderColor: 'var(--aw-danger)' } : undefined} />
                                        {dateErr && <p className="aw-meta" style={{ color: 'var(--aw-danger)', marginTop: 3 }}>{dateErr}</p>}
                                        <p className="aw-meta" style={{ marginTop: 3 }}>{t('Decides the slot (delay months) as for a new loan.')}</p>
                                    </div>
                                    <div>
                                        <label className="aw-label" htmlFor="lra-reason">{t('Reason')}</label>
                                        <input id="lra-reason" className="aw-input" maxLength={200} value={form.reason}
                                            onChange={e => updateForm('reason', e.target.value)} placeholder={t('e.g. member requested a lower EMI')} />
                                    </div>
                                    {detailed && <p className="aw-meta">{t("Everything on the right is calculated by the server from the loan's ledger — principal, interest due, penalty and the carried closure interest cannot be typed in.")}</p>}
                                </div>
                            </section>
                        )}

                        {message && (
                            <div className={`aw-alert aw-fade-in ${message.type === 'success' ? 'aw-alert-success' : 'aw-alert-danger'}`} style={{ marginBottom: 0 }} role="status">
                                <span style={{ display: 'inline-flex', gap: 8, alignItems: 'flex-start' }}>
                                    {message.type === 'error' ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />} {message.text}
                                </span>
                                {applied && message.type === 'success' && (
                                    <p className="aw-meta" style={{ marginTop: 6, fontWeight: 500 }}>
                                        {t('The draft agreement for signing (watermarked) is in “Open re-agreements” below.')}
                                    </p>
                                )}
                            </div>
                        )}

                        {openList.length > 0 && (
                            <section className="aw-card aw-fade-in">
                                <div className="aw-card-head"><span className="aw-card-icon"><GitBranch size={14} /></span><h2 className="aw-card-title">{t('Open re-agreements')}</h2>
                                    <span className="aw-meta" style={{ marginLeft: 'auto' }}>{openList.length}</span></div>
                                <div className="aw-stack" style={{ gap: 8 }}>
                                    {openList.map(r => (
                                        <div key={r.id} className="aw-panel aw-stack" style={{ gap: 10 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                <span className="aw-strong">{r.reagreementNo}</span>
                                                <span className={`aw-pill ${STATUS_TONE[r.status]}`}>{r.status}</span>
                                            </div>
                                            <dl className="aw-facts" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px 12px' }}>
                                                <div><dt>{t('Case')}</dt><dd>#{r.oldLoanCaseNo} → #{r.newLoanCaseNo}</dd></div>
                                                <div><dt>{t('New term')}</dt><dd>{r.neu.installments} {t('inst. @')} {r.neu.rate}%</dd></div>
                                                <div><dt>{t('New EMI')}</dt><dd>₹{fmtMoney(r.neu.monthlyInstallment)}</dd></div>
                                                <div><dt>{t('Applied')}</dt><dd>{fmtDate(r.applicationDate)}</dd></div>
                                                {r.voucherNo && <div><dt>{t('Voucher')}</dt><dd>{r.voucherNo}</dd></div>}
                                            </dl>
                                            <p className="aw-meta">{STATUS_LABEL[r.status]}</p>
                                            <div className="aw-stack" style={{ gap: 6 }}>
                                                <span className="aw-label" style={{ marginBottom: 0 }}>{t('Draft agreement')}</span>
                                                <ReagreementDocumentActions id={r.id} draft baseName={r.reagreementNo} />
                                            </div>
                                            {r.status !== 'VOUCHERED' && (
                                                <button type="button" className="aw-btn aw-btn-danger aw-btn-sm" style={{ alignSelf: 'flex-end' }} onClick={() => { setCancelTarget(r); setCancelReason(''); }}>{t('Cancel re-agreement')}</button>
                                            )}
                                            {r.status === 'VOUCHERED' && <p className="aw-meta">{t('Reject its voucher in Pass Transactions first to cancel it.')}</p>}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    {/* ── right: re-agreement quote ── */}
                    <section className="aw-card" style={{ minWidth: 0 }}>
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><FileSignature size={14} /></span>
                            <div>
                                <h2 className="aw-card-title">{t('Re-agreement quote')}</h2>
                                {selected && (
                                    <p className="aw-meta">
                                        {memberName}{mbno && ` — #${mbno}`} — {TYPE_LABEL[selected.loanType] || selected.loanType} #{selected.loanCaseNo}
                                        {quote?.asOf && ` — ${t('as of')} ${fmtDate(quote.asOf)}`}
                                    </p>
                                )}
                            </div>
                            {neu && <span className="aw-pill tone-success" style={{ marginLeft: 'auto' }}>EMI ₹{fmtMoney(neu.monthlyInstallment)}</span>}
                        </div>

                        {!selected ? (
                            <div className="aw-empty" style={{ padding: 40 }}>
                                <FileSignature size={28} />
                                <span className="aw-meta">{mbno ? t('Select one of their active loans to start a re-agreement.') : t('Search for a member to begin.')}</span>
                            </div>
                        ) : selected.openReagreement ? (
                            <div className="aw-empty" style={{ padding: 40 }}>
                                <AlertTriangle size={26} />
                                <span className="aw-meta" style={{ maxWidth: 380 }}>{t('Loan #{{1}} already has an open re-agreement ({{2}}). Continue it in Loan Payment / Pass Transactions, or cancel it on the left.', { 1: selected.loanCaseNo, 2: selected.openReagreement })}</span>
                            </div>
                        ) : !quote ? (
                            <div className="aw-empty" style={{ padding: 40 }}>
                                {quoteLoading
                                    ? <><RefreshCw size={26} className="aw-spin" style={{ color: 'var(--aw-accent)' }} /><strong className="aw-strong">{t('Calculating…')}</strong></>
                                    : <span className="aw-meta">{t('Enter the new term and rate to see the new agreement.')}</span>}
                            </div>
                        ) : (
                            <div className="aw-stack aw-fade-in" style={{ opacity: quoteLoading ? 0.65 : 1, transition: 'opacity .15s' }}>

                                {/* Problems and warnings first, in both views */}
                                {generalErrors.length > 0 && (
                                    <div className="aw-alert aw-alert-danger" style={{ marginBottom: 0, flexDirection: 'column', alignItems: 'flex-start' }}>
                                        {generalErrors.map((e, i) => <span key={i}>{e.message}</span>)}
                                    </div>
                                )}
                                {quote.warnings?.length > 0 && (
                                    <div className="aw-alert aw-alert-info" style={{ marginBottom: 0, flexDirection: 'column', alignItems: 'flex-start' }}>
                                        {quote.warnings.map((w, i) => <span key={i}>{w}</span>)}
                                    </div>
                                )}

                                {/* Key figures: one dedicated card each, always at the top */}
                                {pos && (
                                    <div className="lra-cards">
                                        <article className="lra-card">
                                            <header className="lra-card-head"><Wallet size={14} /><span className="aw-strong">{t('Principal carried over')}</span></header>
                                            <span className="lra-big">₹{fmtMoney(pos.outstandingPrincipal)}</span>
                                            <div className="lra-nums">
                                                <Num label={t('Paid installments')} value={pos.paidInstallments} />
                                                {detailed && <Num label={t('Closure interest carried (AP)')} value={`₹${fmtMoney(pos.apInterest)}`} />}
                                            </div>
                                        </article>

                                        <article className="lra-card">
                                            <header className="lra-card-head"><IndianRupee size={14} /><span className="aw-strong">{t('Collect now')}</span></header>
                                            <span className="lra-big" style={{ color: quote.collect.total > 0 ? 'var(--aw-danger)' : 'var(--aw-success)' }}>₹{fmtMoney(quote.collect.total)}</span>
                                            <div className="lra-nums">
                                                <Num label={t('NR interest')} value={`₹${fmtMoney(pos.nrInterest)}`} />
                                                <Num label={t('Penalty')} value={`₹${fmtMoney(pos.penaltyDue)}`} tone={pos.penaltyDue > 0 ? 'danger' : undefined} />
                                            </div>
                                        </article>

                                        <article className="lra-card is-key">
                                            <header className="lra-card-head"><FileSignature size={14} /><span className="aw-strong">{t('New agreement')}</span></header>
                                            <span className="lra-big" style={{ color: 'var(--aw-accent)' }}>{neu ? <>₹{fmtMoney(neu.monthlyInstallment)}{old && delta(old.monthlyInstallment, neu.monthlyInstallment)}</> : '—'}</span>
                                            <div className="lra-nums">
                                                <Num label={t('Installments')} value={neu ? neu.installments : '—'} />
                                                <Num label={t('Rate (% p.a.)')} value={neu ? neu.rate.toFixed(2) : '—'} />
                                            </div>
                                        </article>

                                        <article className="lra-card">
                                            <header className="lra-card-head"><CalendarClock size={14} /><span className="aw-strong">{t('First installment')}</span></header>
                                            <span className="lra-big">{neu ? fmtMonth(neu.firstDueMonth) : '—'}</span>
                                            <div className="lra-nums">
                                                {neu && <Num label={t('Slot')} value={neu.slot} />}
                                                {neu && <Num label={t('Delay interest')} value={`₹${fmtMoney(neu.delayInterest)}`} />}
                                            </div>
                                        </article>
                                    </div>
                                )}

                                {/* Simple: old vs new in a few lines */}
                                {!detailed && old && neu && (
                                    <div className="aw-rows">
                                        <div className="aw-row"><span className="aw-row-label">{t('Installments')}</span>
                                            <span className="aw-row-value">{old.installments} <span className="aw-meta">({t('{{1}} left', { 1: old.remainingInstallments })})</span> → {neu.installments}</span></div>
                                        <div className="aw-row"><span className="aw-row-label">{t('Interest rate (% p.a.)')}</span>
                                            <span className="aw-row-value">{old.rate.toFixed(2)} → {neu.rate.toFixed(2)}</span></div>
                                        <div className="aw-row"><span className="aw-row-label">{t('Monthly installment (EMI)')}</span>
                                            <span className="aw-row-value">₹{fmtMoney(old.monthlyInstallment)} → ₹{fmtMoney(neu.monthlyInstallment)}</span></div>
                                    </div>
                                )}

                                {/* Detailed: the full comparison */}
                                {detailed && old && (
                                    <section className="lra-block">
                                        <span className="aw-label">{t('Old agreement vs new agreement')}</span>
                                        <div className="aw-table-wrap">
                                            <table className="aw-table">
                                                <thead>
                                                    <tr><th>{t('Terms')}</th><th className="is-right">{t('Old agreement')}</th><th className="is-right">{t('New agreement')}</th></tr>
                                                </thead>
                                                <tbody>
                                                    <tr><td>{t('Interest rate (% p.a.)')}</td><td className="is-right">{old.rate.toFixed(2)}</td><td className="is-right aw-strong">{neu ? neu.rate.toFixed(2) : '—'}</td></tr>
                                                    <tr><td>{t('Installments')}</td><td className="is-right">{old.installments} <span className="aw-meta">{t('({{1}} left)', { 1: old.remainingInstallments })}</span></td><td className="is-right aw-strong">{neu ? neu.installments : '—'}</td></tr>
                                                    <tr><td>{t('Monthly principal')}</td><td className="is-right">{fmtMoney(old.monthlyPrincipal)}</td><td className="is-right aw-strong">{neu ? <>{fmtMoney(neu.monthlyPrincipal)}{delta(old.monthlyPrincipal, neu.monthlyPrincipal)}</> : '—'}</td></tr>
                                                    <tr><td>{t('Monthly interest')}</td><td className="is-right">{fmtMoney(old.monthlyInterest)}</td><td className="is-right aw-strong">{neu ? <>{fmtMoney(neu.monthlyInterest)}{delta(old.monthlyInterest, neu.monthlyInterest)}</> : '—'}</td></tr>
                                                    <tr><td className="aw-strong">{t('Monthly installment (EMI)')}</td><td className="is-right aw-strong">{fmtMoney(old.monthlyInstallment)}</td>
                                                        <td className="is-right aw-strong" style={{ color: 'var(--aw-accent)' }}>{neu ? <>{fmtMoney(neu.monthlyInstallment)}{delta(old.monthlyInstallment, neu.monthlyInstallment)}</> : '—'}</td></tr>
                                                    <tr><td>{t('Total still payable')}</td><td className="is-right">{fmtMoney(old.remainingPayable)} <span className="aw-meta">{t('if unchanged')}</span></td><td className="is-right">{neu ? fmtMoney(neu.totalPayable) : '—'}</td></tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </section>
                                )}

                                {/* Detailed: what is carried and how the new interest is built */}
                                {detailed && pos && neu && (
                                    <section className="lra-block">
                                        <span className="aw-label">{t('Position and interest working')}</span>
                                        <dl className="aw-facts" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
                                            <div><dt>{t('Principal carried over')}</dt><dd className="aw-strong">₹{fmtMoney(pos.outstandingPrincipal)}</dd></div>
                                            <div><dt>{t('Closure interest carried (AP)')}</dt><dd>₹{fmtMoney(pos.apInterest)}</dd></div>
                                            <div><dt>{t('Delay interest (Slot {{1}})', { 1: neu.slot })}</dt><dd>₹{fmtMoney(neu.delayInterest)}</dd></div>
                                            <div><dt>{t('Total reducing-balance interest')}</dt><dd>₹{fmtMoney(neu.totalRbInterest)}</dd></div>
                                            <div><dt>{t('Total interest for EMI')}</dt><dd>₹{fmtMoney(neu.totalInterestForEmi)}</dd></div>
                                            <div><dt>{t('Interest carried into new loan')}</dt><dd>₹{fmtMoney(neu.carriedInterest)}</dd></div>
                                        </dl>
                                    </section>
                                )}

                                {/* Detailed: the two tables as tabs */}
                                {tabList.length > 0 && activeTab && (
                                    <section className="lra-block lra-tabs-card">
                                        <div className="aw-tabs" role="tablist" aria-label={t('Tables')}>
                                            {tabList.map(x => (
                                                <button key={x.id} type="button" role="tab" id={`lra-tab-${x.id}`} aria-selected={activeTab === x.id} aria-controls={`lra-panel-${x.id}`} className="aw-tab" onClick={() => setTab(x.id)}>
                                                    {x.label} <span className="aw-pill">{x.count}</span>
                                                </button>
                                            ))}
                                        </div>
                                        <div role="tabpanel" id={`lra-panel-${activeTab}`} aria-labelledby={`lra-tab-${activeTab}`} className="aw-fade-in" key={activeTab}>
                                            {activeTab === 'unpaid' && pos && (
                                                <div className="aw-table-wrap" style={{ maxHeight: 300, marginTop: 8 }}><table className="aw-table">
                                                    <thead><tr><th>#</th><th>{t('Due')}</th><th className="is-right">{t('Principal due')}</th><th className="is-right">{t('Interest due')}</th><th className="is-right">{t('Penalty')}</th></tr></thead>
                                                    <tbody>{pos.unpaidInstallments.map(u => (
                                                        <tr key={u.installmentNo}><td>{u.installmentNo}</td><td className="is-muted">{u.dueDate}</td><td className="is-right">{fmtMoney(u.principalDue)}</td><td className="is-right">{fmtMoney(u.interestDue)}</td><td className={`is-right ${u.penalDue > 0 ? 'is-danger' : ''}`}>{fmtMoney(u.penalDue)}</td></tr>
                                                    ))}</tbody>
                                                </table></div>
                                            )}
                                            {activeTab === 'schedule' && (
                                                <div className="aw-table-wrap" style={{ maxHeight: 340, marginTop: 8 }}><table className="aw-table">
                                                    <thead><tr><th>#</th><th>{t('Month')}</th><th className="is-right">{t('Opening')}</th><th className="is-right">{t('Principal')}</th><th className="is-right">{t('Interest')}</th><th className="is-right">{t('Installment')}</th><th className="is-right">{t('Closing')}</th></tr></thead>
                                                    <tbody>{quote.schedule.map(r => (
                                                        <tr key={r.no}><td>{r.no}</td><td className="is-muted">{fmtMonth(r.dueMonth)}</td><td className="is-right">{fmtMoney(r.openingBalance)}</td><td className="is-right">{fmtMoney(r.principal)}</td><td className="is-right">{fmtMoney(r.interest)}</td><td className="is-right">{fmtMoney(r.installment)}</td><td className="is-right">{fmtMoney(r.closingBalance)}</td></tr>
                                                    ))}</tbody>
                                                </table></div>
                                            )}
                                        </div>
                                    </section>
                                )}

                                {!detailed && (
                                    <button type="button" className="aw-btn aw-btn-ghost aw-btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setView('detailed')}>
                                        <ChevronRight size={12} /> {t('See the full comparison and schedule')}
                                    </button>
                                )}

                                {/* What the member pays at Loan Payment, and the one action, always in view at the bottom */}
                                <div className="lra-actionbar">
                                    <div className="min-w-0">
                                        <span className="aw-label" style={{ margin: 0 }}>{t('Collect at Loan Payment')}</span>
                                        <span className="lra-pay">₹{fmtMoney(quote.collect.total)}</span>
                                        <span className="aw-meta" style={{ display: 'block' }}>{t('(NR ₹{{1}} + penalty ₹{{2}}; no new money is paid out)', { 1: fmtMoney(quote.collect.nrInterest), 2: fmtMoney(quote.collect.penalty) })}</span>
                                    </div>
                                    <button type="button" onClick={() => setConfirmOpen(true)} disabled={!canApply} className="aw-btn aw-btn-primary">
                                        <Send size={13} /> {saving ? t('Applying…') : t('Apply')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </div>

            <style>{STYLE}</style>

            <div className="aw-footer">
                <span>{t('Loan Re-agreement')}{selected ? ' · ' + t('Case #{{1}}', { 1: selected.loanCaseNo }) : ''}{mbno ? ' · ' + t('Member {{1}}', { 1: mbno }) : ''}</span>
                <span>{fmtDate(localISODate())}</span>
            </div>

            <AwDialog open={confirmOpen} title={t('Apply for re-agreement')} icon={<Send size={14} />} onClose={() => setConfirmOpen(false)} maxWidth="34rem" compact>
                <div className="aw-stack">
                    {selected && neu && quote?.position && (
                        <dl className="aw-facts aw-panel">
                            <div><dt>{t('Loan')}</dt><dd>#{selected.loanCaseNo} ({TYPE_LABEL[selected.loanType]})</dd></div>
                            <div><dt>{t('Principal carried over')}</dt><dd>₹{fmtMoney(quote.position.outstandingPrincipal)}</dd></div>
                            <div><dt>{t('New term')}</dt><dd>{neu.installments} {t('installments @')} {neu.rate}%</dd></div>
                            <div><dt>{t('New EMI')}</dt><dd className="aw-strong">₹{fmtMoney(neu.monthlyInstallment)}</dd></div>
                            <div><dt>{t('Collect at payment')}</dt><dd>₹{fmtMoney(quote.collect.total)}</dd></div>
                        </dl>
                    )}
                    <p className="aw-meta">{t('This creates a')} <strong>pending</strong> {t('new loan case. The old loan stays active until the re-agreement is passed in Pass Transactions. Next steps: Loan Payment → sanction → save the voucher → Pass Transactions.')}</p>
                    <div className="aw-btn-row" style={{ justifyContent: 'flex-end' }}>
                        <button type="button" className="aw-btn aw-btn-secondary" onClick={() => setConfirmOpen(false)}>{t('Back')}</button>
                        <button type="button" className="aw-btn aw-btn-primary" disabled={saving || !canApply} onClick={async () => { const ok = await apply(); if (ok) setConfirmOpen(false); }}>
                            <Send size={13} /> {saving ? t('Applying…') : t('Confirm & apply')}
                        </button>
                    </div>
                </div>
            </AwDialog>

            <AwDialog open={!!oneEmiLeft && oneEmiDismissed !== oneEmiKey} title={t('Only one EMI left')} icon={<AlertTriangle size={14} />} onClose={() => setOneEmiDismissed(oneEmiKey)} maxWidth="30rem" compact>
                <div className="aw-stack">
                    <p className="aw-meta" style={{ lineHeight: 1.6 }}>{t('This loan has only one EMI left, so it cannot be re-agreed. If the member still wants a re-agreement, please contact support.')}</p>
                    <div className="aw-btn-row" style={{ justifyContent: 'flex-end' }}>
                        <button type="button" className="aw-btn" onClick={() => setOneEmiDismissed(oneEmiKey)}>{t('OK')}</button>
                    </div>
                </div>
            </AwDialog>

            <AwDialog open={!!cancelTarget} title={t('Cancel {{1}}', { 1: cancelTarget?.reagreementNo || '' })} icon={<X size={14} />} onClose={() => setCancelTarget(null)} maxWidth="30rem" compact>
                <div className="aw-stack">
                    <p className="aw-meta">{t('The pending case #{{1}} {{2}}', { 1: cancelTarget?.newLoanCaseNo, 2: t('is removed; the old loan is untouched. The re-agreement record stays in the history as cancelled.') })}</p>
                    <div><label className="aw-label" htmlFor="lra-cr">{t('Reason')}</label>
                        <input id="lra-cr" className="aw-input" value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder={t('Why is it being cancelled?')} /></div>
                    <div className="aw-btn-row" style={{ justifyContent: 'flex-end' }}>
                        <button type="button" className="aw-btn aw-btn-secondary" onClick={() => setCancelTarget(null)}>{t('Keep it')}</button>
                        <button type="button" className="aw-btn aw-btn-danger" onClick={async () => { if (cancelTarget && await cancelOpen(cancelTarget, cancelReason)) setCancelTarget(null); }}>{t('Cancel re-agreement')}</button>
                    </div>
                </div>
            </AwDialog>
        </div>
    );
};

export default LoanReagreementForm;
