import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, RefreshCw, Scale, ChevronDown, ChevronRight } from 'lucide-react';
import { getApiBaseUrl } from '../../../services/serverConfig';
import { useTranslation } from 'react-i18next';

/**
 * Loan Position — a read-only panel shared by the Loan Repayment and Loan Early Closure windows.
 * Everything shown is worked out by the server when the panel opens (from the ledger and the loan
 * terms); nothing here is saved. The only action is "Mark as checked" on a notice, which saves just
 * that confirmation. If a figure looks wrong, staff correct it themselves (for example with
 * Journal/Transfer Entry).
 */

interface Notice {
    code: string;
    severity: 'check' | 'info';
    source: 'PAYMENT' | 'DEMAND' | 'LEDGER' | 'SCHEDULE';
    date: string | null;
    amount: number | null;
    message: string;
    ackable: boolean;
    acknowledged: boolean;
    acknowledgedBy?: string | null;
    acknowledgedAt?: string | null;
}

interface Position {
    asOf: string;
    loan: {
        mbno: string; loancaseno: string; loantype: string; loanAmount: number; noOfInstalments: number;
        monthlyPrincipal: number; monthlyInterest: number; annualRate: number; startDate: string; firstDueMonth: string;
        source: string; consolidatedIntoCase: string | null;
        absorbedCases: Array<{ loancaseno: string; originalAmount: number; closedBalance: number | null; closureInterest: number | null; date: string | null }>;
    };
    ledger: {
        account: string; headCode: string; runStartedOn: string | null; carriedIn: number; balance: number;
        loansAdded: Array<{ date: string; voucher: string; amount: number; kind: string }>; loansAddedTotal: number;
        paidByChannel: { demand: number; cash: number; journal: number; paymentVoucher: number; other: number; total: number };
        adjustments: Array<{ date: string; voucher: string; direction: string; amount: number; narration: string }>;
    };
    record: {
        balance: number; summaryBalance: number | null; principalPaid: number; interestPaid: number; penalPaid: number;
        oldEmiDeductions: { count: number; principal: number; interest: number }; paymentsRecorded: number;
    };
    difference: { ledgerMinusRecord: number };
    schedule: {
        instalmentsDueSoFar: number; principalDueSoFar: number; principalPaidOnRecord: number;
        aheadOrBehind: number; aheadOrBehindInEmis: number | null; projectedFinish: string | null; monthsLeftAtScheduledPace: number | null;
    };
    closure: null | {
        error?: string; outstandingPrincipal?: number; payrollLagPrincipalOffset?: number; nrInterest?: number; apInterest?: number;
        penalInterest?: number; futureInstallmentCount?: number; averageRemainingPrincipal?: number; averageRbInterest?: number;
        finalClosureAmount?: number; payableByMember?: number;
    };
    notices: Notice[];
}

const LOAN_TYPE_LABEL: Record<string, string> = { RLN: 'Regular Loan', ALN: 'Emergency Loan', ELN: 'Loan Against RD' };
const inr = (n: number | null | undefined) =>
    n === null || n === undefined ? '—' : `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const dmy = (d: string | null | undefined) => {
    if (!d) return '—';
    const x = new Date(`${d.slice(0, 10)}T12:00:00`);
    return isNaN(x.getTime()) ? d : x.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const monthYear = (d: string | null | undefined) => {
    if (!d) return '—';
    const x = new Date(`${d.slice(0, 10)}T12:00:00`);
    return isNaN(x.getTime()) ? d : x.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
};

const Row: React.FC<{ label: React.ReactNode; value: React.ReactNode; hint?: React.ReactNode; strong?: boolean; tone?: 'danger' | 'success' | 'warning' }> = ({ label, value, hint, strong, tone }) => (
    <tr>
        <td className="is-muted" style={{ width: '46%' }}>{label}</td>
        <td className={`is-right ${tone ? `is-${tone}` : ''}`} style={{ fontWeight: strong ? 700 : 500 }}>{value}</td>
        <td className="aw-meta" style={{ width: '30%' }}>{hint}</td>
    </tr>
);

interface Props {
    mbno: string;
    loancaseno: string;
    loantype?: string | undefined;
    /** Show the early-closure lines. Off on the Early Closure window, which has its own full quote. */
    showClosure?: boolean;
    /** Change this to make the panel reload (for example after a payment is recorded). */
    refreshKey?: unknown;
    /**
     * Compact mode (the Early Closure window's Simple view): only what needs the operator's attention.
     * Notices and a ledger-vs-record difference are always shown; the full tables are left out.
     * Nothing that asks for a check is ever hidden by this mode.
     */
    compact?: boolean;
    /** Compact mode: called by "See details", so the window can switch to its detailed view. */
    onShowDetails?: () => void;
}

const LoanPositionPanel: React.FC<Props> = ({ mbno, loancaseno, loantype, showClosure = true, refreshKey, compact = false, onShowDetails }) => {
  const { t } = useTranslation();
    const [pos, setPos] = useState<Position | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showJournals, setShowJournals] = useState(false);

    const load = useCallback(async () => {
        if (!mbno || !loancaseno) { setPos(null); return; }
        setLoading(true);
        setError(null);
        try {
            const base = await getApiBaseUrl();
            const token = localStorage.getItem('accessToken');
            const qs = loantype ? `?loantype=${encodeURIComponent(loantype)}` : '';
            const res = await fetch(`${base}/loans/position/${encodeURIComponent(mbno)}/${encodeURIComponent(loancaseno)}${qs}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.message || 'Could not load the loan position');
            setPos((json.data ?? json) as Position);
        } catch (e: any) {
            setPos(null);
            setError(e?.message || 'Could not load the loan position');
        } finally {
            setLoading(false);
        }
    }, [mbno, loancaseno, loantype]);

    useEffect(() => { void load(); }, [load, refreshKey]);

    const acknowledge = async (n: Notice) => {
        if (!pos || !n.date || n.amount === null) return;
        try {
            const base = await getApiBaseUrl();
            const token = localStorage.getItem('accessToken');
            await fetch(`${base}/loans/position/acknowledge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({
                    mbno: pos.loan.mbno, loancaseno: pos.loan.loancaseno, loantype: pos.loan.loantype,
                    code: n.code, date: n.date, amount: n.amount, message: n.message,
                }),
            });
        } finally {
            await load();
        }
    };

    if (!mbno || !loancaseno) return null;

    const diff = pos?.difference.ledgerMinusRecord ?? 0;
    const openNotices = (pos?.notices ?? []).filter(n => !n.acknowledged);
    const checkedNotices = (pos?.notices ?? []).filter(n => n.acknowledged);
    const s = pos?.schedule;

    return (
        <section className="aw-card aw-fade-in" aria-label={t('Loan position')}>
            <div className="aw-card-head">
                <span className="aw-card-icon"><Scale size={14} /></span>
                <div>
                    <h2 className="aw-card-title">{compact ? t('Checks Before Closing') : t('Loan Position')}</h2>
                    {!compact && <p className="aw-meta">{t('Worked out now from the ledger and the loan terms. Nothing here is saved; correct anything that looks wrong with Journal/Transfer Entry.')}</p>}
                </div>
                <button type="button" className="aw-btn aw-btn-ghost aw-btn-sm" style={{ marginLeft: 'auto' }} onClick={() => void load()} disabled={loading}>
                    <RefreshCw size={13} className={loading ? 'aw-spin' : undefined} /> {t('Refresh')}
                </button>
            </div>

            {error && <div className="aw-alert aw-alert-danger" role="alert"><AlertCircle size={14} /><span>{error}</span></div>}
            {loading && !pos && <div className="aw-empty" style={{ padding: 24 }}><RefreshCw size={20} className="aw-spin" /><span className="aw-meta">{t('Working it out…')}</span></div>}

            {pos && (
                <div className="aw-stack">
                    {/* Notices: worked out fresh each time; only payment / demand ones can be marked checked */}
                    {openNotices.length > 0 && (
                        <div className="aw-stack" style={{ gap: 8 }}>
                            {openNotices.map((n, i) => (
                                <div key={`${n.code}-${n.date}-${n.amount}-${i}`} className={`aw-alert ${n.severity === 'check' ? 'aw-alert-warning' : 'aw-alert-info'}`}
                                    role="alert" style={{ marginBottom: 0, display: 'flex', gap: 10, alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                    <span style={{ display: 'flex', gap: 8, alignItems: 'flex-start', minWidth: 0 }}>
                                        {n.severity === 'check' ? <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} /> : <Info size={14} style={{ flexShrink: 0, marginTop: 2 }} />}
                                        <span>
                                            <strong>{n.source === 'DEMAND' ? t('Demand {{1}}', { 1: monthYear(n.date) }) : n.date ? dmy(n.date) : t('Note')}
                                                {n.amount !== null && n.source !== 'LEDGER' ? ` — ${inr(n.amount)}` : ''}</strong>{' '}{n.message}
                                        </span>
                                    </span>
                                    {n.ackable && (
                                        <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" style={{ flexShrink: 0 }} onClick={() => void acknowledge(n)}>
                                            <CheckCircle2 size={13} /> {t('Mark as checked')}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    {checkedNotices.length > 0 && (
                        <p className="aw-meta">
                            <CheckCircle2 size={12} style={{ verticalAlign: -2 }} /> {checkedNotices.length} notice{checkedNotices.length === 1 ? '' : 's'} {t('already checked')}
                            {checkedNotices[checkedNotices.length - 1]?.acknowledgedBy ? ' ' + t('(last by {{1}})', { 1: checkedNotices[checkedNotices.length - 1]?.acknowledgedBy }) : ''}.
                        </p>
                    )}

                    {/* Compact mode: one line that says whether the ledger and the loan record agree, and a way to the full working. */}
                    {compact && (
                        <>
                            {Math.abs(diff) > 10 ? (
                                <div className="aw-alert aw-alert-warning" role="alert" style={{ marginBottom: 0 }}>
                                    <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                                    <span>
                                        <strong>{t('The ledger and the loan record do not agree.')}</strong>{' '}
                                        {t('Ledger {{1}}, loan record {{2}}: the ledger is {{3}} by {{4}}. Check this before closing.', {
                                            1: inr(pos.ledger.balance), 2: inr(pos.record.balance),
                                            3: diff < 0 ? t('lower') : t('higher'), 4: inr(Math.abs(diff)),
                                        })}
                                    </span>
                                </div>
                            ) : openNotices.length === 0 ? (
                                <p className="aw-meta" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--aw-success)' }}>
                                    <CheckCircle2 size={13} /> {t('Nothing needs checking. The ledger and the loan record agree ({{1}}).', { 1: inr(pos.ledger.balance) })}
                                </p>
                            ) : (
                                <p className="aw-meta">{t('The ledger and the loan record agree ({{1}}).', { 1: inr(pos.ledger.balance) })}</p>
                            )}
                            {onShowDetails && (
                                <button type="button" className="aw-btn aw-btn-ghost aw-btn-sm" style={{ alignSelf: 'flex-start' }} onClick={onShowDetails}>
                                    <ChevronRight size={13} /> {t('See the full loan position')}
                                </button>
                            )}
                        </>
                    )}

                    {!compact && <div className="aw-table-wrap">
                        <table className="aw-table">
                            <tbody>
                                <tr><td colSpan={3} className="aw-strong">{t('This loan')}</td></tr>
                                <Row label={t('Loan')}
                                    value={`${LOAN_TYPE_LABEL[pos.loan.loantype] || pos.loan.loantype} #${pos.loan.loancaseno}`}
                                    hint={pos.loan.source} />
                                <Row label={t('Amount / EMIs')} value={`${inr(pos.loan.loanAmount)} · ${pos.loan.noOfInstalments}`}
                                    hint={t('{{1}} principal + {{2}} interest', { 1: inr(pos.loan.monthlyPrincipal), 2: inr(pos.loan.monthlyInterest) })} />
                                <Row label={t('Taken / first EMI month')} value={`${dmy(pos.loan.startDate)} / ${monthYear(pos.loan.firstDueMonth)}`} />
                                {pos.loan.absorbedCases.map(a => (
                                    <Row key={a.loancaseno} label={t('Folded in: loan #{{1}}', { 1: a.loancaseno })}
                                        value={a.closedBalance !== null ? inr(a.closedBalance) : '—'}
                                        hint={`${a.date ? dmy(a.date) : ''}${a.closureInterest !== null ? ` · interest cleared ${inr(a.closureInterest)}` : ''}`} />
                                ))}

                                <tr><td colSpan={3} className="aw-strong">{t('What is owed')}</td></tr>
                                <Row label={t('By the ledger')} strong value={inr(pos.ledger.balance)} hint={`${pos.ledger.account} (${pos.ledger.headCode})`} />
                                <Row label={t('By the loan record')} value={inr(pos.record.balance)}
                                    hint={pos.record.summaryBalance !== null ? t('Member summary {{1}}', { 1: inr(pos.record.summaryBalance) }) : undefined} />
                                <Row label={t('Difference')} value={Math.abs(diff) <= 10 ? 'None' : `Ledger ${diff < 0 ? 'lower' : 'higher'} by ${inr(Math.abs(diff))}`}
                                    tone={Math.abs(diff) <= 10 ? 'success' : 'warning'}
                                    hint={Math.abs(diff) > 10 && pos.record.oldEmiDeductions.principal > 0
                                        ? t('Old-EMI deductions kept aside {{1}}', { 1: inr(pos.record.oldEmiDeductions.principal) }) : undefined} />

                                <tr><td colSpan={3} className="aw-strong">{t('Paid in the ledger')}{pos.ledger.runStartedOn ? ' ' + t('since {{1}}', { 1: dmy(pos.ledger.runStartedOn) }) : ''}</td></tr>
                                <Row label={t('Demand (D vouchers)')} value={inr(pos.ledger.paidByChannel.demand)} />
                                <Row label={t('Cash receipts (R vouchers)')} value={inr(pos.ledger.paidByChannel.cash)} />
                                <Row label={t('Journal credits')} value={inr(pos.ledger.paidByChannel.journal)} />
                                {(pos.ledger.paidByChannel.paymentVoucher > 0 || pos.ledger.paidByChannel.other > 0) && (
                                    <Row label={t('Other credits')} value={inr(pos.ledger.paidByChannel.paymentVoucher + pos.ledger.paidByChannel.other)} />
                                )}
                                <Row label={t('Total paid')} strong value={inr(pos.ledger.paidByChannel.total)}
                                    hint={t('Loans taken / added: {{1}} ({{2}})', { 1: inr(pos.ledger.loansAddedTotal), 2: pos.ledger.loansAdded.length })} />

                                <tr><td colSpan={3} className="aw-strong">{t('Paid on the loan record')}</td></tr>
                                <Row label={t('Principal / interest')} value={`${inr(pos.record.principalPaid)} / ${inr(pos.record.interestPaid)}`}
                                    hint={pos.record.penalPaid > 0 ? t('Penal {{1}}', { 1: inr(pos.record.penalPaid) }) : t('{{1}} payments', { 1: pos.record.paymentsRecorded })} />
                                {pos.record.oldEmiDeductions.count > 0 && (
                                    <Row label={t('Old-loan EMI deductions (kept aside)')} value={`${inr(pos.record.oldEmiDeductions.principal)} + ${inr(pos.record.oldEmiDeductions.interest)}`}
                                        hint={t('{{1}} deduction{{2}}', { 1: pos.record.oldEmiDeductions.count, 2: pos.record.oldEmiDeductions.count === 1 ? '' : 's' })} />
                                )}

                                {s && (
                                    <>
                                        <tr><td colSpan={3} className="aw-strong">{t('Against the EMI schedule')}</td></tr>
                                        <Row label={t('EMIs due so far')} value={`${s.instalmentsDueSoFar} · ${inr(s.principalDueSoFar)}`} hint="principal" />
                                        <Row label={t('Principal paid (loan record)')} value={inr(s.principalPaidOnRecord)} />
                                        <Row label={s.aheadOrBehind >= 0 ? t('Ahead of schedule') : t('Behind schedule')}
                                            value={inr(Math.abs(s.aheadOrBehind))} tone={s.aheadOrBehind >= 0 ? 'success' : 'danger'}
                                            hint={s.aheadOrBehindInEmis !== null ? t('{{1}} EMIs', { 1: Math.abs(s.aheadOrBehindInEmis) }) : undefined} />
                                        <Row label={t('Finish at the scheduled pace')} value={monthYear(s.projectedFinish)}
                                            hint={s.monthsLeftAtScheduledPace !== null ? t('{{1}} months left (ledger balance)', { 1: s.monthsLeftAtScheduledPace }) : undefined} />
                                    </>
                                )}

                                {showClosure && pos.closure && (
                                    <>
                                        <tr><td colSpan={3} className="aw-strong">{t('If closed today')}</td></tr>
                                        {pos.closure.error ? (
                                            <tr><td colSpan={3} className="aw-meta">{pos.closure.error}</td></tr>
                                        ) : (
                                            <>
                                                <Row label={t('Outstanding principal')} value={inr(pos.closure.outstandingPrincipal)}
                                                    hint={pos.closure.payrollLagPrincipalOffset ? t('after {{1}} old-EMI deductions', { 1: inr(pos.closure.payrollLagPrincipalOffset) }) : undefined} />
                                                <Row label={t('Interest on due months')} value={inr(pos.closure.nrInterest)} />
                                                <Row label={t('Interest on future months')} value={inr(pos.closure.apInterest)}
                                                    hint={pos.closure.futureInstallmentCount !== undefined ? t('{{1}} months', { 1: pos.closure.futureInstallmentCount }) : undefined} />
                                                {(pos.closure.penalInterest ?? 0) > 0 && <Row label={t('Penal interest')} value={inr(pos.closure.penalInterest)} />}
                                                <Row label={t('Closure amount')} strong value={inr(pos.closure.finalClosureAmount)}
                                                    hint={pos.closure.payableByMember !== pos.closure.finalClosureAmount ? t('Member pays {{1}}', { 1: inr(pos.closure.payableByMember) }) : undefined} />
                                            </>
                                        )}
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>}

                    {!compact && pos.ledger.adjustments.length > 0 && (
                        <div>
                            <button type="button" className="aw-btn aw-btn-ghost aw-btn-sm" onClick={() => setShowJournals(v => !v)}>
                                {showJournals ? <ChevronDown size={13} /> : <ChevronRight size={13} />} Journal adjustments ({pos.ledger.adjustments.length})
                            </button>
                            {showJournals && (
                                <div className="aw-table-wrap" style={{ marginTop: 6 }}>
                                    <table className="aw-table">
                                        <thead><tr><th>{t('Date')}</th><th>{t('Voucher')}</th><th>{t('Type')}</th><th className="is-right">{t('Amount')}</th><th>{t('Narration')}</th></tr></thead>
                                        <tbody>
                                            {pos.ledger.adjustments.map((a, i) => (
                                                <tr key={i}><td>{dmy(a.date)}</td><td className="is-muted">{a.voucher}</td><td>{a.direction}</td>
                                                    <td className="is-right">{inr(a.amount)}</td><td className="is-muted">{a.narration || '—'}</td></tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
};

export default LoanPositionPanel;
