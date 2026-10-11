import React, { useState } from 'react';
import { ArrowRight, ChevronDown, ChevronRight, IndianRupee, TrendingDown, TrendingUp } from 'lucide-react';
import { fmtMoney, fmtMonth, ReagreementQuote } from '../../../services/reagreementApi';

interface Props {
    quote: ReagreementQuote | null;
    loading?: boolean;
    /** Hide the installment-by-installment schedule (e.g. in tight dialogs). */
    hideSchedule?: boolean;
}

const delta = (oldV: number, newV: number) => {
    const d = newV - oldV;
    if (Math.abs(d) < 0.005) return null;
    const Icon = d < 0 ? TrendingDown : TrendingUp;
    return <span style={{ marginLeft: 6, color: d < 0 ? 'var(--aw-success)' : 'var(--aw-danger)', display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11 }}>
        <Icon size={11} />{d > 0 ? '+' : ''}{fmtMoney(d)}</span>;
};

/** Old-vs-new comparison, position on the date, amounts to collect now, and the new schedule — all computed by the server. */
const ReagreementQuotePanel: React.FC<Props> = ({ quote, loading, hideSchedule }) => {
    const [showSchedule, setShowSchedule] = useState(false);
    const [showUnpaid, setShowUnpaid] = useState(false);

    if (!quote) {
        return <p className="aw-meta" style={{ padding: 10 }}>{loading ? 'Calculating…' : 'Enter the new term and rate to see the new agreement.'}</p>;
    }
    const { position: pos, old, neu, collect } = quote;
    const general = quote.errors.filter(e => e.field === 'loan' || e.field === 'general');

    return (
        <div className="aw-stack" style={{ opacity: loading ? 0.65 : 1, transition: 'opacity .15s' }}>
            {general.length > 0 && (
                <div className="aw-panel" style={{ borderColor: 'var(--aw-danger)' }}>
                    {general.map((e, i) => <p key={i} style={{ color: 'var(--aw-danger)', margin: 0 }}>{e.message}</p>)}
                </div>
            )}

            {pos && old && (
                <div className="aw-table-wrap">
                    <table className="aw-table">
                        <thead>
                            <tr><th>Terms</th><th className="is-right">Old agreement</th><th className="is-right">New agreement</th></tr>
                        </thead>
                        <tbody>
                            <tr><td>Interest rate (% p.a.)</td><td className="is-right">{old.rate.toFixed(2)}</td><td className="is-right aw-strong">{neu ? neu.rate.toFixed(2) : '—'}</td></tr>
                            <tr><td>Installments</td><td className="is-right">{old.installments} <span className="aw-meta">({old.remainingInstallments} left)</span></td><td className="is-right aw-strong">{neu ? neu.installments : '—'}</td></tr>
                            <tr><td>Monthly principal</td><td className="is-right">{fmtMoney(old.monthlyPrincipal)}</td><td className="is-right aw-strong">{neu ? <>{fmtMoney(neu.monthlyPrincipal)}{delta(old.monthlyPrincipal, neu.monthlyPrincipal)}</> : '—'}</td></tr>
                            <tr><td>Monthly interest</td><td className="is-right">{fmtMoney(old.monthlyInterest)}</td><td className="is-right aw-strong">{neu ? <>{fmtMoney(neu.monthlyInterest)}{delta(old.monthlyInterest, neu.monthlyInterest)}</> : '—'}</td></tr>
                            <tr><td className="aw-strong">Monthly installment (EMI)</td><td className="is-right aw-strong">{fmtMoney(old.monthlyInstallment)}</td>
                                <td className="is-right aw-strong" style={{ color: 'var(--aw-accent)' }}>{neu ? <>{fmtMoney(neu.monthlyInstallment)}{delta(old.monthlyInstallment, neu.monthlyInstallment)}</> : '—'}</td></tr>
                            <tr><td>Total still payable</td><td className="is-right">{fmtMoney(old.remainingPayable)} <span className="aw-meta">if unchanged</span></td><td className="is-right">{neu ? fmtMoney(neu.totalPayable) : '—'}</td></tr>
                        </tbody>
                    </table>
                </div>
            )}

            {pos && (
                <dl className="aw-facts" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
                    <div><dt>Principal carried over</dt><dd className="aw-strong">₹{fmtMoney(pos.outstandingPrincipal)}</dd></div>
                    <div><dt>NR interest (collect now)</dt><dd>₹{fmtMoney(pos.nrInterest)}</dd></div>
                    <div><dt>Penalty (collect now)</dt><dd>₹{fmtMoney(pos.penaltyDue)}</dd></div>
                    <div><dt>Closure interest carried (AP)</dt><dd>₹{fmtMoney(pos.apInterest)}</dd></div>
                    {neu && <div><dt>Delay interest (Slot {neu.slot})</dt><dd>₹{fmtMoney(neu.delayInterest)}</dd></div>}
                    {neu && <div><dt>First installment</dt><dd>{fmtMonth(neu.firstDueMonth)}</dd></div>}
                    <div><dt>Paid installments</dt><dd>{pos.paidInstallments}</dd></div>
                </dl>
            )}

            <div className="aw-panel" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <IndianRupee size={14} />
                <span>To be collected from the member when the re-agreement is paid out in Loan Payment:</span>
                <strong style={{ fontSize: 'calc(var(--type-body-size) + 2px)', color: collect.total > 0 ? 'var(--aw-danger)' : 'var(--aw-success)' }}>₹{fmtMoney(collect.total)}</strong>
                <span className="aw-meta">(NR ₹{fmtMoney(collect.nrInterest)} + penalty ₹{fmtMoney(collect.penalty)}; no new money is paid out)</span>
            </div>

            {pos && pos.unpaidInstallments.length > 0 && (
                <div>
                    <button type="button" className="aw-btn aw-btn-ghost aw-btn-sm" onClick={() => setShowUnpaid(v => !v)}>
                        {showUnpaid ? <ChevronDown size={12} /> : <ChevronRight size={12} />} Unpaid installments already due ({pos.unpaidInstallments.length})
                    </button>
                    {showUnpaid && (
                        <div className="aw-table-wrap aw-fade-in"><table className="aw-table">
                            <thead><tr><th>#</th><th>Due</th><th className="is-right">Principal due</th><th className="is-right">Interest due</th><th className="is-right">Penalty</th></tr></thead>
                            <tbody>{pos.unpaidInstallments.map(u => (
                                <tr key={u.installmentNo}><td>{u.installmentNo}</td><td>{u.dueDate}</td><td className="is-right">{fmtMoney(u.principalDue)}</td><td className="is-right">{fmtMoney(u.interestDue)}</td><td className="is-right">{fmtMoney(u.penalDue)}</td></tr>
                            ))}</tbody>
                        </table></div>
                    )}
                </div>
            )}

            {!hideSchedule && quote.schedule.length > 0 && (
                <div>
                    <button type="button" className="aw-btn aw-btn-ghost aw-btn-sm" onClick={() => setShowSchedule(v => !v)}>
                        {showSchedule ? <ChevronDown size={12} /> : <ChevronRight size={12} />} New installment schedule ({quote.schedule.length}) <ArrowRight size={11} />
                    </button>
                    {showSchedule && (
                        <div className="aw-table-wrap aw-fade-in" style={{ maxHeight: 280 }}><table className="aw-table">
                            <thead><tr><th>#</th><th>Month</th><th className="is-right">Opening</th><th className="is-right">Principal</th><th className="is-right">Interest</th><th className="is-right">Installment</th><th className="is-right">Closing</th></tr></thead>
                            <tbody>{quote.schedule.map(r => (
                                <tr key={r.no}><td>{r.no}</td><td>{fmtMonth(r.dueMonth)}</td><td className="is-right">{fmtMoney(r.openingBalance)}</td><td className="is-right">{fmtMoney(r.principal)}</td><td className="is-right">{fmtMoney(r.interest)}</td><td className="is-right">{fmtMoney(r.installment)}</td><td className="is-right">{fmtMoney(r.closingBalance)}</td></tr>
                            ))}</tbody>
                        </table></div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ReagreementQuotePanel;
