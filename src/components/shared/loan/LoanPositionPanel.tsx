import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, RefreshCw, Scale, ChevronDown, ChevronRight } from 'lucide-react';
import { getApiBaseUrl } from '../../../services/serverConfig';

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
}

const LoanPositionPanel: React.FC<Props> = ({ mbno, loancaseno, loantype, showClosure = true, refreshKey }) => {
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
        <section className="aw-card aw-fade-in" aria-label="Loan position">
            <div className="aw-card-head">
                <span className="aw-card-icon"><Scale size={14} /></span>
                <div>
                    <h2 className="aw-card-title">Loan Position</h2>
                    <p className="aw-meta">Worked out now from the ledger and the loan terms. Nothing here is saved; correct anything that looks wrong with Journal/Transfer Entry.</p>
                </div>
                <button type="button" className="aw-btn aw-btn-ghost aw-btn-sm" style={{ marginLeft: 'auto' }} onClick={() => void load()} disabled={loading}>
                    <RefreshCw size={13} className={loading ? 'aw-spin' : undefined} /> Refresh
                </button>
            </div>

            {error && <div className="aw-alert aw-alert-danger" role="alert"><AlertCircle size={14} /><span>{error}</span></div>}
            {loading && !pos && <div className="aw-empty" style={{ padding: 24 }}><RefreshCw size={20} className="aw-spin" /><span className="aw-meta">Working it out…</span></div>}

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
                                            <strong>{n.source === 'DEMAND' ? `Demand ${monthYear(n.date)}` : n.date ? dmy(n.date) : 'Note'}
                                                {n.amount !== null && n.source !== 'LEDGER' ? ` — ${inr(n.amount)}` : ''}</strong>{' '}{n.message}
                                        </span>
                                    </span>
                                    {n.ackable && (
                                        <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" style={{ flexShrink: 0 }} onClick={() => void acknowledge(n)}>
                                            <CheckCircle2 size={13} /> Mark as checked
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    {checkedNotices.length > 0 && (
                        <p className="aw-meta">
                            <CheckCircle2 size={12} style={{ verticalAlign: -2 }} /> {checkedNotices.length} notice{checkedNotices.length === 1 ? '' : 's'} already checked
                            {checkedNotices[checkedNotices.length - 1]?.acknowledgedBy ? ` (last by ${checkedNotices[checkedNotices.length - 1]?.acknowledgedBy})` : ''}.
                        </p>
                    )}

                    <div className="aw-table-wrap">
                        <table className="aw-table">
                            <tbody>
                                <tr><td colSpan={3} className="aw-strong">This loan</td></tr>
                                <Row label="Loan"
                                    value={`${LOAN_TYPE_LABEL[pos.loan.loantype] || pos.loan.loantype} #${pos.loan.loancaseno}`}
                                    hint={pos.loan.source} />
                                <Row label="Amount / EMIs" value={`${inr(pos.loan.loanAmount)} · ${pos.loan.noOfInstalments}`}
                                    hint={`${inr(pos.loan.monthlyPrincipal)} principal + ${inr(pos.loan.monthlyInterest)} interest`} />
                                <Row label="Taken / first EMI month" value={`${dmy(pos.loan.startDate)} / ${monthYear(pos.loan.firstDueMonth)}`} />
                                {pos.loan.absorbedCases.map(a => (
                                    <Row key={a.loancaseno} label={`Folded in: loan #${a.loancaseno}`}
                                        value={a.closedBalance !== null ? inr(a.closedBalance) : '—'}
                                        hint={`${a.date ? dmy(a.date) : ''}${a.closureInterest !== null ? ` · interest cleared ${inr(a.closureInterest)}` : ''}`} />
                                ))}

                                <tr><td colSpan={3} className="aw-strong">What is owed</td></tr>
                                <Row label="By the ledger" strong value={inr(pos.ledger.balance)} hint={`${pos.ledger.account} (${pos.ledger.headCode})`} />
                                <Row label="By the loan record" value={inr(pos.record.balance)}
                                    hint={pos.record.summaryBalance !== null ? `Member summary ${inr(pos.record.summaryBalance)}` : undefined} />
                                <Row label="Difference" value={Math.abs(diff) <= 10 ? 'None' : `Ledger ${diff < 0 ? 'lower' : 'higher'} by ${inr(Math.abs(diff))}`}
                                    tone={Math.abs(diff) <= 10 ? 'success' : 'warning'}
                                    hint={Math.abs(diff) > 10 && pos.record.oldEmiDeductions.principal > 0
                                        ? `Old-EMI deductions kept aside ${inr(pos.record.oldEmiDeductions.principal)}` : undefined} />

                                <tr><td colSpan={3} className="aw-strong">Paid in the ledger{pos.ledger.runStartedOn ? ` since ${dmy(pos.ledger.runStartedOn)}` : ''}</td></tr>
                                <Row label="Demand (D vouchers)" value={inr(pos.ledger.paidByChannel.demand)} />
                                <Row label="Cash receipts (R vouchers)" value={inr(pos.ledger.paidByChannel.cash)} />
                                <Row label="Journal credits" value={inr(pos.ledger.paidByChannel.journal)} />
                                {(pos.ledger.paidByChannel.paymentVoucher > 0 || pos.ledger.paidByChannel.other > 0) && (
                                    <Row label="Other credits" value={inr(pos.ledger.paidByChannel.paymentVoucher + pos.ledger.paidByChannel.other)} />
                                )}
                                <Row label="Total paid" strong value={inr(pos.ledger.paidByChannel.total)}
                                    hint={`Loans taken / added: ${inr(pos.ledger.loansAddedTotal)} (${pos.ledger.loansAdded.length})`} />

                                <tr><td colSpan={3} className="aw-strong">Paid on the loan record</td></tr>
                                <Row label="Principal / interest" value={`${inr(pos.record.principalPaid)} / ${inr(pos.record.interestPaid)}`}
                                    hint={pos.record.penalPaid > 0 ? `Penal ${inr(pos.record.penalPaid)}` : `${pos.record.paymentsRecorded} payments`} />
                                {pos.record.oldEmiDeductions.count > 0 && (
                                    <Row label="Old-loan EMI deductions (kept aside)" value={`${inr(pos.record.oldEmiDeductions.principal)} + ${inr(pos.record.oldEmiDeductions.interest)}`}
                                        hint={`${pos.record.oldEmiDeductions.count} deduction${pos.record.oldEmiDeductions.count === 1 ? '' : 's'}`} />
                                )}

                                {s && (
                                    <>
                                        <tr><td colSpan={3} className="aw-strong">Against the EMI schedule</td></tr>
                                        <Row label="EMIs due so far" value={`${s.instalmentsDueSoFar} · ${inr(s.principalDueSoFar)}`} hint="principal" />
                                        <Row label="Principal paid (loan record)" value={inr(s.principalPaidOnRecord)} />
                                        <Row label={s.aheadOrBehind >= 0 ? 'Ahead of schedule' : 'Behind schedule'}
                                            value={inr(Math.abs(s.aheadOrBehind))} tone={s.aheadOrBehind >= 0 ? 'success' : 'danger'}
                                            hint={s.aheadOrBehindInEmis !== null ? `${Math.abs(s.aheadOrBehindInEmis)} EMIs` : undefined} />
                                        <Row label="Finish at the scheduled pace" value={monthYear(s.projectedFinish)}
                                            hint={s.monthsLeftAtScheduledPace !== null ? `${s.monthsLeftAtScheduledPace} months left (ledger balance)` : undefined} />
                                    </>
                                )}

                                {showClosure && pos.closure && (
                                    <>
                                        <tr><td colSpan={3} className="aw-strong">If closed today</td></tr>
                                        {pos.closure.error ? (
                                            <tr><td colSpan={3} className="aw-meta">{pos.closure.error}</td></tr>
                                        ) : (
                                            <>
                                                <Row label="Outstanding principal" value={inr(pos.closure.outstandingPrincipal)}
                                                    hint={pos.closure.payrollLagPrincipalOffset ? `after ${inr(pos.closure.payrollLagPrincipalOffset)} old-EMI deductions` : undefined} />
                                                <Row label="Interest on due months" value={inr(pos.closure.nrInterest)} />
                                                <Row label="Interest on future months" value={inr(pos.closure.apInterest)}
                                                    hint={pos.closure.futureInstallmentCount !== undefined ? `${pos.closure.futureInstallmentCount} months` : undefined} />
                                                {(pos.closure.penalInterest ?? 0) > 0 && <Row label="Penal interest" value={inr(pos.closure.penalInterest)} />}
                                                <Row label="Closure amount" strong value={inr(pos.closure.finalClosureAmount)}
                                                    hint={pos.closure.payableByMember !== pos.closure.finalClosureAmount ? `Member pays ${inr(pos.closure.payableByMember)}` : undefined} />
                                            </>
                                        )}
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {pos.ledger.adjustments.length > 0 && (
                        <div>
                            <button type="button" className="aw-btn aw-btn-ghost aw-btn-sm" onClick={() => setShowJournals(v => !v)}>
                                {showJournals ? <ChevronDown size={13} /> : <ChevronRight size={13} />} Journal adjustments ({pos.ledger.adjustments.length})
                            </button>
                            {showJournals && (
                                <div className="aw-table-wrap" style={{ marginTop: 6 }}>
                                    <table className="aw-table">
                                        <thead><tr><th>Date</th><th>Voucher</th><th>Type</th><th className="is-right">Amount</th><th>Narration</th></tr></thead>
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
