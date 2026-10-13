import React, { useState } from 'react';
import { AlertTriangle, ArrowDown, CheckCircle2, FileText, GitMerge, History, RefreshCw, Search, Undo2, Users, X } from 'lucide-react';
import MemberField from '@/components/shared/kit/MemberField';
import AwDialog from '@/components/shared/kit/AwDialog';
import ReagreementDocumentActions from '@/components/shared/loan/ReagreementDocumentActions';
import { fmtDate, fmtMoney, fmtMonth, ReagreementDto, STATUS_LABEL, STATUS_TONE } from '../../../../services/reagreementApi';
import type { LoanReagreementHistoryHook } from '../hook/useLoanReagreementHistory';
import { localISODate } from '../../../../utils/dates';

const TYPE_LABEL: Record<string, string> = { RLN: 'Regular Loan', ALN: 'Emergency Loan', ELN: 'Loan Against RD' };

const LoanReagreementHistoryView: React.FC<LoanReagreementHistoryHook> = ({
    mbno, setMbno, memberName, memberLoans, caseNo, setCaseNo, loantype, history, logs, loading, error, notice,
    handleMemberLookup, selectCase, loadHistory, showLog, reverse, reset, handleExit,
}) => {
    const [reverseTarget, setReverseTarget] = useState<ReagreementDto | null>(null);
    const [busy, setBusy] = useState(false);

    const raFrom = (caseNoX: string) => (history?.reagreements || []).filter(r => r.oldLoanCaseNo === caseNoX);

    const card = (r: ReagreementDto) => {
        const log = logs[r.id];
        return (
            <div key={r.id} className="aw-panel aw-fade-in" style={{ borderColor: r.status === 'PASSED' ? 'var(--aw-accent)' : undefined, opacity: r.status === 'CANCELLED' ? 0.75 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className="aw-strong" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><FileText size={14} /> Re-agreement {r.reagreementNo}</span>
                    <span className={`aw-pill ${STATUS_TONE[r.status]}`}>{r.status}</span>
                </div>
                <p className="aw-meta" style={{ margin: '3px 0 8px' }}>
                    {STATUS_LABEL[r.status]} · applied {fmtDate(r.applicationDate)} by {r.createdBy || '—'}
                    {r.status === 'PASSED' && <> · passed {fmtDate(r.passedAt)} by {r.passedBy || '—'} · effective {fmtDate(r.effectiveDate)}</>}
                    {r.voucherNo && <> · voucher {r.voucherNo}</>}
                </p>
                <div className="aw-table-wrap"><table className="aw-table">
                    <thead><tr><th>Terms</th><th className="is-right">Old</th><th className="is-right">New</th></tr></thead>
                    <tbody>
                        <tr><td>Rate (% p.a.)</td><td className="is-right">{r.old.rate.toFixed(2)}</td><td className="is-right aw-strong">{r.neu.rate.toFixed(2)}</td></tr>
                        <tr><td>Installments</td><td className="is-right">{r.old.installments}</td><td className="is-right aw-strong">{r.neu.installments}</td></tr>
                        <tr><td>Monthly principal</td><td className="is-right">{fmtMoney(r.old.monthlyPrincipal)}</td><td className="is-right">{fmtMoney(r.neu.monthlyPrincipal)}</td></tr>
                        <tr><td>Monthly interest</td><td className="is-right">{fmtMoney(r.old.monthlyInterest)}</td><td className="is-right">{fmtMoney(r.neu.monthlyInterest)}</td></tr>
                        <tr><td className="aw-strong">EMI</td><td className="is-right aw-strong">{fmtMoney(r.old.monthlyInstallment)}</td><td className="is-right aw-strong" style={{ color: 'var(--aw-accent)' }}>{fmtMoney(r.neu.monthlyInstallment)}</td></tr>
                    </tbody>
                </table></div>
                <dl className="aw-facts" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginTop: 8 }}>
                    <div><dt>Principal carried</dt><dd>₹{fmtMoney(r.position.outstandingPrincipal)}</dd></div>
                    <div><dt>NR interest collected</dt><dd>₹{fmtMoney(r.position.nrInterest)}</dd></div>
                    <div><dt>Penalty collected</dt><dd>₹{fmtMoney(r.position.penaltyDue)}</dd></div>
                    <div><dt>Closure interest carried</dt><dd>₹{fmtMoney(r.position.apInterest)}</dd></div>
                    <div><dt>First installment</dt><dd>{fmtMonth(r.firstDueMonth)}</dd></div>
                </dl>
                {r.reason && <p className="aw-meta" style={{ marginTop: 6 }}>Reason: {r.reason}</p>}
                {r.reversedAt && r.status !== 'PASSED' && <p className="aw-meta" style={{ marginTop: 4 }}>Reversed {fmtDate(r.reversedAt)} by {r.reversedBy}{r.reversalReason ? ` — ${r.reversalReason}` : ''}</p>}

                {(r.documents || []).length > 0 && (
                    <div style={{ marginTop: 8 }} className="aw-stack">
                        {(r.documents || []).map(d => (
                            <div key={d.issueNo} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                <span className="aw-meta">Saved agreement, copy {d.issueNo} · issued {fmtDate(d.issuedAt)}</span>
                                {d.voided ? <span className="aw-pill tone-muted">voided (re-agreement was reversed)</span> : <span className="aw-pill tone-success">current</span>}
                                <ReagreementDocumentActions id={r.id} issue={d.issueNo} baseName={r.reagreementNo} />
                            </div>
                        ))}
                    </div>
                )}
                <div className="aw-btn-row" style={{ marginTop: 8, flexWrap: 'wrap', gap: 6 }}>
                    <button type="button" className="aw-btn aw-btn-ghost aw-btn-sm" onClick={() => showLog(r.id)}><History size={12} /> {log ? 'Hide log' : 'Event log'}</button>
                    {r.status === 'PASSED' && r.voucherNo && (
                        <button type="button" className="aw-btn aw-btn-danger aw-btn-sm" onClick={() => setReverseTarget(r)}><Undo2 size={12} /> Reverse</button>
                    )}
                </div>
                {log && (
                    <div className="aw-table-wrap aw-fade-in" style={{ maxHeight: 220, marginTop: 6 }}><table className="aw-table">
                        <thead><tr><th>When</th><th>Event</th><th>Status</th><th>By</th><th>Remarks</th></tr></thead>
                        <tbody>{log.map((e: any) => (
                            <tr key={e.id}><td className="is-muted">{new Date(e.at).toLocaleString('en-IN')}</td><td>{e.event}</td>
                                <td>{e.old_status ? `${e.old_status} → ` : ''}{e.new_status || ''}</td><td>{e.actor}</td><td className="is-muted">{e.remarks || ''}</td></tr>
                        ))}</tbody>
                    </table></div>
                )}
            </div>
        );
    };

    return (
        <div className="app-window">
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">Loan Re-agreement History</h1>
                    <p className="aw-desc">Every agreement of a loan — original, each re-agreement, and the saved printed agreements (view, print, PDF, image)</p>
                </div>
                <div className="aw-actions">
                    <button type="button" onClick={reset} className="aw-btn aw-btn-secondary"><RefreshCw size={13} /> Reset</button>
                    <button type="button" onClick={handleExit} className="aw-btn aw-btn-ghost"><X size={13} /> Exit</button>
                </div>
            </div>

            <div className="aw-content">
                {(error || notice) && (
                    <div className="aw-panel aw-fade-in" style={{ marginBottom: 10, borderColor: error ? 'var(--aw-danger)' : undefined }}>
                        <span style={{ display: 'inline-flex', gap: 8, color: error ? 'var(--aw-danger)' : undefined }}>
                            {error ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />} {error || notice}
                        </span>
                    </div>
                )}
                <div className="aw-split aw-split-form" style={{ height: 'auto', gridTemplateColumns: 'minmax(280px, 3fr) minmax(0, 9fr)', alignItems: 'start' }}>
                    <div className="aw-stack" style={{ minWidth: 0 }}>
                        <section className="aw-card">
                            <div className="aw-card-head"><span className="aw-card-icon"><Users size={14} /></span><h2 className="aw-card-title">Find a loan</h2></div>
                            <div className="aw-stack">
                                <div className="aw-inline" style={{ alignItems: 'flex-end', gap: 8 }}>
                                    <div style={{ width: 150 }}>
                                        <label className="aw-label" htmlFor="rh-mb">Member No.</label>
                                        <MemberField id="rh-mb" value={mbno} onChange={setMbno}
                                            onSelect={(m: any) => handleMemberLookup(String(m.memberNo || ''), m.memberName || m.name || '')}
                                            onSubmit={(v) => handleMemberLookup(v, '')} />
                                    </div>
                                    <button type="button" className="aw-btn aw-btn-primary" disabled={!mbno} onClick={() => handleMemberLookup(mbno, memberName)}>Search</button>
                                </div>
                                {memberName && <p className="aw-meta">{memberName}</p>}
                                <div>
                                    <label className="aw-label" htmlFor="rh-case">…or loan case no. (any case of the loan)</label>
                                    <div className="aw-inline" style={{ gap: 6 }}>
                                        <input id="rh-case" className="aw-input" value={caseNo} onChange={e => setCaseNo(e.target.value.replace(/[^0-9]/g, ''))} />
                                        <button type="button" className="aw-btn aw-btn-secondary" disabled={!mbno || !caseNo || loading} onClick={() => loadHistory(mbno, caseNo, loantype)}><Search size={13} /></button>
                                    </div>
                                </div>
                            </div>
                        </section>
                        {memberLoans.length > 0 && (
                            <section className="aw-card aw-fade-in">
                                <div className="aw-card-head"><span className="aw-card-icon"><GitMerge size={14} /></span><h2 className="aw-card-title">Member's loans</h2><span className="aw-meta" style={{ marginLeft: 'auto' }}>{memberLoans.length}</span></div>
                                <div className="aw-stack" style={{ gap: 6, maxHeight: 360, overflowY: 'auto' }}>
                                    {memberLoans.map(l => {
                                        const open = l.balance > 0;
                                        const sel = caseNo === l.loancaseno && loantype === l.loantype;
                                        return (
                                            <button key={`${l.loantype}-${l.loancaseno}`} type="button" onClick={() => selectCase(l)} className="aw-right-cell"
                                                style={{ flexDirection: 'column', alignItems: 'stretch', gap: 2, padding: '8px 10px', border: `1px solid ${sel ? 'var(--aw-accent)' : 'var(--aw-border)'}` }}>
                                                <span style={{ display: 'flex', justifyContent: 'space-between' }}><span className="aw-strong">{TYPE_LABEL[l.loantype] || l.loantype}</span><span className="aw-meta">#{l.loancaseno}</span></span>
                                                <span className="aw-meta">{open ? <>Balance ₹{fmtMoney(l.balance)}</> : l.consolidatedIntoLoancaseno ? <>Closed into #{l.consolidatedIntoLoancaseno}</> : 'Closed'}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        )}
                    </div>

                    <div style={{ minWidth: 0 }}>
                        {!history ? (
                            <section className="aw-card"><div className="aw-empty" style={{ padding: 32 }}>
                                <History size={28} /><span className="aw-meta">{loading ? 'Loading history…' : 'Pick a member and one of their loans to see its agreement history.'}</span>
                            </div></section>
                        ) : (
                            <div className="aw-stack">
                                <p className="aw-meta">Member <strong>#{history.mbno}</strong> · {history.cases.length} case{history.cases.length === 1 ? '' : 's'} in this loan's chain · {history.reagreements.filter(r => r.status === 'PASSED').length} passed re-agreement(s)</p>
                                {history.cases.map((c, i) => (
                                    <React.Fragment key={c.caseNo}>
                                        <section className="aw-card" style={{ borderColor: !c.closedIntoCaseNo && (c.balance ?? 0) > 0 ? 'var(--aw-accent)' : undefined }}>
                                            <div className="aw-card-head">
                                                <span className="aw-card-icon">{!c.closedIntoCaseNo && (c.balance ?? 0) > 0 ? <CheckCircle2 size={14} /> : <GitMerge size={14} />}</span>
                                                <h2 className="aw-card-title">Case #{c.caseNo} {c.loanType ? `· ${TYPE_LABEL[c.loanType] || c.loanType}` : ''}</h2>
                                                <span className="aw-meta" style={{ marginLeft: 'auto' }}>{i === 0 ? 'original agreement' : `agreement ${i + 1}`}</span>
                                            </div>
                                            <dl className="aw-facts" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                                                <div><dt>Loan amount</dt><dd>₹{fmtMoney(c.loanAmount)}</dd></div>
                                                <div><dt>Rate</dt><dd>{c.rate !== undefined ? `${c.rate}%` : '—'}</dd></div>
                                                <div><dt>Installments</dt><dd>{c.installments ?? '—'}</dd></div>
                                                <div><dt>Started</dt><dd>{fmtDate(c.startDate)}</dd></div>
                                                <div><dt>Status</dt><dd>{c.closedIntoCaseNo ? `Re-agreed into #${c.closedIntoCaseNo}` : (c.balance ?? 0) > 0 ? <>Active · balance ₹{fmtMoney(c.balance)}</> : 'Closed'}</dd></div>
                                            </dl>
                                        </section>
                                        {raFrom(c.caseNo).length > 0 && (
                                            <div className="aw-stack" style={{ paddingLeft: 18 }}>
                                                <div style={{ display: 'flex', justifyContent: 'center' }}><ArrowDown size={16} /></div>
                                                {raFrom(c.caseNo).map(card)}
                                                {raFrom(c.caseNo).some(r => r.status === 'PASSED') && <div style={{ display: 'flex', justifyContent: 'center' }}><ArrowDown size={16} /></div>}
                                            </div>
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="aw-footer"><span>Loan Re-agreement History{history ? ` · Member ${history.mbno}` : ''}</span><span>{fmtDate(localISODate())}</span></div>

            <AwDialog open={!!reverseTarget} title={`Reverse ${reverseTarget?.reagreementNo || ''}`} icon={<Undo2 size={14} />} onClose={() => setReverseTarget(null)} maxWidth="32rem" compact>
                <div className="aw-stack">
                    <p className="aw-meta">The new case #{reverseTarget?.newLoanCaseNo} is removed and the old case #{reverseTarget?.oldLoanCaseNo} becomes active again with its balance. The receipts posted for voucher {reverseTarget?.voucherNo} are removed and the issued agreement is voided (kept in the history). The server refuses this once any repayment has been recorded on the new case.</p>
                    <div className="aw-btn-row" style={{ justifyContent: 'flex-end' }}>
                        <button type="button" className="aw-btn aw-btn-secondary" onClick={() => setReverseTarget(null)}>Keep it</button>
                        <button type="button" className="aw-btn aw-btn-danger" disabled={busy} onClick={async () => {
                            if (!reverseTarget?.voucherNo) return;
                            setBusy(true); const ok = await reverse(reverseTarget.voucherNo); setBusy(false); if (ok) setReverseTarget(null);
                        }}><Undo2 size={13} /> {busy ? 'Reversing…' : 'Reverse re-agreement'}</button>
                    </div>
                </div>
            </AwDialog>
        </div>
    );
};

export default LoanReagreementHistoryView;
