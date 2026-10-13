import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, CreditCard, FileSignature, GitBranch, RefreshCw, Users, X, Send } from 'lucide-react';
import MemberField from '@/components/shared/kit/MemberField';
import AwDialog from '@/components/shared/kit/AwDialog';
import ReagreementQuotePanel from '@/components/shared/loan/ReagreementQuotePanel';
import ReagreementDocumentActions from '@/components/shared/loan/ReagreementDocumentActions';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';
import { fmtDate, fmtMoney, ReagreementDto, STATUS_LABEL, STATUS_TONE } from '../../../../services/reagreementApi';
import type { LoanReagreementHook } from '../hook/useLoanReagreement';
import { localISODate } from '../../../../utils/dates';

const TYPE_LABEL: Record<string, string> = { RLN: 'Regular Loan', ALN: 'Emergency Loan', ELN: 'Loan Against RD' };

const LoanReagreementForm: React.FC<LoanReagreementHook> = ({
    mbno, setMbno, memberName, loans, openList, selected, form, quote, quoteLoading, loadingLoans, saving, message, applied,
    updateForm, handleMemberLookup, selectLoan, fieldError, canApply, apply, cancelOpen, handleReset, handleExit,
}) => {
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [cancelTarget, setCancelTarget] = useState<ReagreementDto | null>(null);
    const [cancelReason, setCancelReason] = useState('');

    usePageToolbarActions({
        onSave: () => setConfirmOpen(true),
        saveLabel: saving ? 'Applying…' : 'Apply',
        saveEnabled: canApply,
    });

    const neu = quote?.neu;
    const tenureErr = fieldError('tenure');
    const rateErr = fieldError('rate');
    const dateErr = fieldError('applicationDate');

    return (
        <div className="app-window">
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">Loan Re-agreement</h1>
                    <p className="aw-desc">Restructure an active loan — the outstanding principal carries over; term and rate change. Goes through Sanction → Loan Payment → Pass Transactions.</p>
                </div>
                <div className="aw-actions">
                    <button type="button" onClick={handleReset} className="aw-btn aw-btn-secondary"><RefreshCw size={13} /> Reset</button>
                    <button type="button" onClick={() => setConfirmOpen(true)} disabled={!canApply} className="aw-btn aw-btn-primary"><Send size={13} /> Apply</button>
                    <button type="button" onClick={handleExit} className="aw-btn aw-btn-ghost"><X size={13} /> Exit</button>
                </div>
            </div>

            <div className="aw-content">
                {message && (
                    <div className={`aw-panel aw-fade-in`} style={{ marginBottom: 10, borderColor: message.type === 'error' ? 'var(--aw-danger)' : 'var(--aw-success)' }}>
                        <span style={{ display: 'inline-flex', gap: 8, alignItems: 'flex-start', color: message.type === 'error' ? 'var(--aw-danger)' : 'var(--aw-success)' }}>
                            {message.type === 'error' ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />} {message.text}
                        </span>
                        {applied && message.type === 'success' && (
                            <div style={{ marginTop: 8 }}>
                                <span className="aw-meta">Draft agreement for signing (watermarked, not the saved copy):</span>{' '}
                                <ReagreementDocumentActions id={applied.id} draft baseName={applied.reagreementNo} />
                            </div>
                        )}
                    </div>
                )}

                <div className="aw-split aw-split-form" style={{ height: 'auto', gridTemplateColumns: 'minmax(300px, 4fr) minmax(0, 8fr)', alignItems: 'start' }}>
                    {/* ── left: member, loans, open re-agreements ── */}
                    <div className="aw-stack" style={{ minWidth: 0 }}>
                        <section className="aw-card">
                            <div className="aw-card-head"><span className="aw-card-icon"><Users size={14} /></span><h2 className="aw-card-title">Member</h2></div>
                            <div className="aw-stack">
                                <div className="aw-inline" style={{ alignItems: 'flex-end', gap: 8 }}>
                                    <div style={{ width: 150 }}>
                                        <label className="aw-label" htmlFor="lra-mb">Member No.</label>
                                        <MemberField id="lra-mb" value={mbno} onChange={setMbno}
                                            onSelect={(m: any) => handleMemberLookup(String(m.memberNo || ''), m.memberName || m.name || '')}
                                            onSubmit={(v) => handleMemberLookup(v, '')} placeholder="Member No." />
                                    </div>
                                    <button type="button" className="aw-btn aw-btn-primary" disabled={loadingLoans || !mbno} onClick={() => handleMemberLookup(mbno, memberName)}>Search</button>
                                </div>
                                <div>
                                    <label className="aw-label" htmlFor="lra-name">Member name</label>
                                    <input id="lra-name" className="aw-input" value={memberName} readOnly placeholder="Member name" />
                                </div>
                            </div>
                        </section>

                        {loans.length > 0 && (
                            <section className="aw-card aw-fade-in">
                                <div className="aw-card-head"><span className="aw-card-icon"><CreditCard size={14} /></span><h2 className="aw-card-title">Active loans</h2>
                                    <span className="aw-meta" style={{ marginLeft: 'auto' }}>{loans.length}</span></div>
                                <div className="aw-stack" style={{ gap: 6 }} role="radiogroup" aria-label="Active loans">
                                    {loans.map(l => {
                                        const isSel = selected?.loanCaseNo === l.loanCaseNo && selected?.loanType === l.loanType;
                                        return (
                                            <button key={`${l.loanType}-${l.loanCaseNo}`} type="button" role="radio" aria-checked={isSel} onClick={() => selectLoan(l)}
                                                className="aw-right-cell"
                                                style={{ flexDirection: 'column', alignItems: 'stretch', gap: 2, padding: '9px 10px', border: `1px solid ${isSel ? 'var(--aw-accent)' : 'var(--aw-border)'}` }}>
                                                <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                                    <span className="aw-strong">{TYPE_LABEL[l.loanType] || l.loanType}</span><span className="aw-meta">#{l.loanCaseNo}</span>
                                                </span>
                                                <span className="aw-meta">Balance <strong style={{ color: 'var(--aw-danger)' }}>₹{fmtMoney(l.balance)}</strong> · {l.rate}% · {l.installments} inst.</span>
                                                {l.openReagreement && <span className="aw-pill tone-warning" style={{ alignSelf: 'flex-start' }}>Open re-agreement {l.openReagreement}</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {openList.length > 0 && (
                            <section className="aw-card aw-fade-in">
                                <div className="aw-card-head"><span className="aw-card-icon"><GitBranch size={14} /></span><h2 className="aw-card-title">Open re-agreements</h2>
                                    <span className="aw-meta" style={{ marginLeft: 'auto' }}>{openList.length}</span></div>
                                <div className="aw-stack" style={{ gap: 8 }}>
                                    {openList.map(r => (
                                        <div key={r.id} className="aw-panel">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                                                <span className="aw-strong">{r.reagreementNo}</span>
                                                <span className={`aw-pill ${STATUS_TONE[r.status]}`}>{r.status}</span>
                                            </div>
                                            <p className="aw-meta" style={{ margin: '4px 0' }}>{STATUS_LABEL[r.status]}</p>
                                            <p className="aw-meta" style={{ margin: 0 }}>Case #{r.oldLoanCaseNo} → <strong>#{r.newLoanCaseNo}</strong> · {r.neu.installments} inst. @ {r.neu.rate}% · EMI ₹{fmtMoney(r.neu.monthlyInstallment)}</p>
                                            <p className="aw-meta" style={{ margin: '2px 0 6px' }}>Applied {fmtDate(r.applicationDate)}{r.voucherNo ? ` · voucher ${r.voucherNo}` : ''}</p>
                                            <span className="aw-btn-row" style={{ flexWrap: 'wrap', gap: 6 }}>
                                                <ReagreementDocumentActions id={r.id} draft baseName={r.reagreementNo} />
                                                {r.status !== 'VOUCHERED' && (
                                                    <button type="button" className="aw-btn aw-btn-danger aw-btn-sm" onClick={() => { setCancelTarget(r); setCancelReason(''); }}>Cancel</button>
                                                )}
                                            </span>
                                            {r.status === 'VOUCHERED' && <p className="aw-meta" style={{ marginTop: 4 }}>Reject its voucher in Pass Transactions first to cancel it.</p>}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    {/* ── right: new terms + live quote ── */}
                    <div className="aw-stack" style={{ minWidth: 0 }}>
                        {!selected ? (
                            <section className="aw-card"><div className="aw-empty" style={{ padding: 32 }}>
                                <FileSignature size={28} />
                                <span className="aw-meta">Select a member and one of their active loans to start a re-agreement.</span>
                            </div></section>
                        ) : selected.openReagreement ? (
                            <section className="aw-card"><div className="aw-empty" style={{ padding: 32 }}>
                                <AlertTriangle size={26} />
                                <span className="aw-meta">Loan #{selected.loanCaseNo} already has an open re-agreement ({selected.openReagreement}). Continue it in Loan Payment / Pass Transactions, or cancel it on the left.</span>
                            </div></section>
                        ) : (
                            <>
                                <section className="aw-card aw-fade-in">
                                    <div className="aw-card-head"><span className="aw-card-icon"><FileSignature size={14} /></span>
                                        <h2 className="aw-card-title">New agreement for loan #{selected.loanCaseNo}</h2>
                                        <span className="aw-meta" style={{ marginLeft: 'auto' }}>{TYPE_LABEL[selected.loanType]} · balance ₹{fmtMoney(selected.balance)}</span></div>
                                    <div className="aw-two">
                                        <div>
                                            <label className="aw-label" htmlFor="lra-n">Number of installments (tenure) <span style={{ color: 'var(--aw-danger)' }}>*</span></label>
                                            <input id="lra-n" className="aw-input" inputMode="numeric" value={form.tenure}
                                                onChange={e => updateForm('tenure', e.target.value.replace(/[^0-9]/g, ''))} aria-invalid={!!tenureErr}
                                                style={tenureErr ? { borderColor: 'var(--aw-danger)' } : undefined} />
                                            {tenureErr && <p className="aw-meta" style={{ color: 'var(--aw-danger)', marginTop: 3 }}>{tenureErr}</p>}
                                        </div>
                                        <div>
                                            <label className="aw-label" htmlFor="lra-r">Interest rate (% p.a.) <span style={{ color: 'var(--aw-danger)' }}>*</span></label>
                                            <input id="lra-r" className="aw-input" inputMode="decimal" value={form.rate}
                                                onChange={e => updateForm('rate', e.target.value.replace(/[^0-9.]/g, ''))} aria-invalid={!!rateErr}
                                                style={rateErr ? { borderColor: 'var(--aw-danger)' } : undefined} />
                                            {rateErr && <p className="aw-meta" style={{ color: 'var(--aw-danger)', marginTop: 3 }}>{rateErr}</p>}
                                        </div>
                                        <div>
                                            <label className="aw-label" htmlFor="lra-d">Application date</label>
                                            <input id="lra-d" type="date" className="aw-input" value={form.applicationDate}
                                                onChange={e => updateForm('applicationDate', e.target.value)} aria-invalid={!!dateErr}
                                                style={dateErr ? { borderColor: 'var(--aw-danger)' } : undefined} />
                                            {dateErr && <p className="aw-meta" style={{ color: 'var(--aw-danger)', marginTop: 3 }}>{dateErr}</p>}
                                            <p className="aw-meta" style={{ marginTop: 3 }}>Decides the slot (delay months) as for a new loan.</p>
                                        </div>
                                        <div>
                                            <label className="aw-label" htmlFor="lra-reason">Reason</label>
                                            <input id="lra-reason" className="aw-input" maxLength={200} value={form.reason}
                                                onChange={e => updateForm('reason', e.target.value)} placeholder="e.g. member requested a lower EMI" />
                                        </div>
                                    </div>
                                    <p className="aw-meta" style={{ marginTop: 8 }}>Everything below is calculated by the server from the loan's ledger — principal, interest due, penalty and the carried closure interest cannot be typed in.</p>
                                </section>

                                <section className="aw-card aw-fade-in">
                                    <div className="aw-card-head"><span className="aw-card-icon"><CreditCard size={14} /></span><h2 className="aw-card-title">New agreement — calculated</h2>
                                        {neu && <span className="aw-pill tone-success" style={{ marginLeft: 'auto' }}>EMI ₹{fmtMoney(neu.monthlyInstallment)}</span>}</div>
                                    <ReagreementQuotePanel quote={quote} loading={quoteLoading} />
                                </section>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="aw-footer">
                <span>Loan Re-agreement{selected ? ` · Case #${selected.loanCaseNo}` : ''}{mbno ? ` · Member ${mbno}` : ''}</span>
                <span>{fmtDate(localISODate())}</span>
            </div>

            <AwDialog open={confirmOpen} title="Apply for re-agreement" icon={<Send size={14} />} onClose={() => setConfirmOpen(false)} maxWidth="34rem" compact>
                <div className="aw-stack">
                    {selected && neu && quote?.position && (
                        <dl className="aw-facts aw-panel">
                            <div><dt>Loan</dt><dd>#{selected.loanCaseNo} ({TYPE_LABEL[selected.loanType]})</dd></div>
                            <div><dt>Principal carried over</dt><dd>₹{fmtMoney(quote.position.outstandingPrincipal)}</dd></div>
                            <div><dt>New term</dt><dd>{neu.installments} installments @ {neu.rate}%</dd></div>
                            <div><dt>New EMI</dt><dd className="aw-strong">₹{fmtMoney(neu.monthlyInstallment)}</dd></div>
                            <div><dt>Collect at payment</dt><dd>₹{fmtMoney(quote.collect.total)}</dd></div>
                        </dl>
                    )}
                    <p className="aw-meta">This creates a <strong>pending</strong> new loan case. The old loan stays active until the re-agreement is passed in Pass Transactions. Next steps: Loan Payment → sanction → save the voucher → Pass Transactions.</p>
                    <div className="aw-btn-row" style={{ justifyContent: 'flex-end' }}>
                        <button type="button" className="aw-btn aw-btn-secondary" onClick={() => setConfirmOpen(false)}>Back</button>
                        <button type="button" className="aw-btn aw-btn-primary" disabled={saving || !canApply} onClick={async () => { const ok = await apply(); if (ok) setConfirmOpen(false); }}>
                            <Send size={13} /> {saving ? 'Applying…' : 'Confirm & apply'}
                        </button>
                    </div>
                </div>
            </AwDialog>

            <AwDialog open={!!cancelTarget} title={`Cancel ${cancelTarget?.reagreementNo || ''}`} icon={<X size={14} />} onClose={() => setCancelTarget(null)} maxWidth="30rem" compact>
                <div className="aw-stack">
                    <p className="aw-meta">The pending case #{cancelTarget?.newLoanCaseNo} is removed; the old loan is untouched. The re-agreement record stays in the history as cancelled.</p>
                    <div><label className="aw-label" htmlFor="lra-cr">Reason</label>
                        <input id="lra-cr" className="aw-input" value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Why is it being cancelled?" /></div>
                    <div className="aw-btn-row" style={{ justifyContent: 'flex-end' }}>
                        <button type="button" className="aw-btn aw-btn-secondary" onClick={() => setCancelTarget(null)}>Keep it</button>
                        <button type="button" className="aw-btn aw-btn-danger" onClick={async () => { if (cancelTarget && await cancelOpen(cancelTarget, cancelReason)) setCancelTarget(null); }}>Cancel re-agreement</button>
                    </div>
                </div>
            </AwDialog>
        </div>
    );
};

export default LoanReagreementForm;
