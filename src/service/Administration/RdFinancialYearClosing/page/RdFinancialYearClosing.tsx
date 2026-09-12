import React, { useEffect, useState } from 'react';
import { Calendar, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { useAuth } from '../../../../auth/context/AuthContext';
import { useRdFinancialYearClosing } from '../hooks/useRdFinancialYearClosing';

const fmt = (n: number) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PATTERN_LABEL: Record<string, string> = {
    FULLY_REGULAR: 'Fully Regular',
    INITIAL_GAP_RECOVERED: 'Initial Gap (Recovered)',
    LATER_GAP_RECOVERED: 'Later Gap (Recovered)',
    MULTIPLE_GAPS: 'Multiple Gaps',
    GAP_UNRECOVERED: 'Unpaid Installment(s)',
};

const RdFinancialYearClosing: React.FC = () => {
    const { user } = useAuth();
    const closedBy = user?.username || 'admin';

    const {
        yearcode, yearLabel, members, total, page, pageSize,
        loading, closing, overrides, closeResult, error,
        loadForYear, loadPage, setOverride, closeOne, closeAll,
    } = useRdFinancialYearClosing();

    const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});

    useEffect(() => { loadForYear(); }, [loadForYear]);

    const needsReviewCount = members.filter((m) => !m.patternEvaluation.autoEligibleFullInterest).length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const applyOverride = (mbno: string, eligible: boolean) => {
        const reason = (reasonDrafts[mbno] || '').trim();
        if (!reason) return;
        setOverride(mbno, { eligible, reason });
    };

    return (
        <div className="flex flex-col h-full overflow-hidden" style={{ background: '#f4f5f7', color: '#1a1d29', fontSize: 13 }}>
            <div className="flex items-center justify-between px-5 py-2.5 shrink-0" style={{ background: '#161822', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-baseline gap-2.5">
                    <h1 className="m-0 font-semibold text-white" style={{ fontSize: 15 }}>RD Financial Year Closing</h1>
                    <span style={{ fontSize: 11.5, color: '#9296a8' }}>Bulk review, override, and close the RD year</span>
                </div>
                {yearLabel && (
                    <div className="flex items-center gap-1.5" style={{ fontSize: 11.5, color: '#9296a8' }}>
                        <Calendar size={12} /> {yearLabel} (yearcode {yearcode})
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between px-5 py-2.5 shrink-0" style={{ background: '#fff', borderBottom: '1px solid #e4e6eb' }}>
                <div className="flex items-center gap-4" style={{ fontSize: 12 }}>
                    <span>Total members: <b>{total}</b></span>
                    <span style={{ color: needsReviewCount > 0 ? '#b45309' : '#15803d' }}>
                        Needs review (this page): <b>{needsReviewCount}</b>
                    </span>
                    <span>Overrides set: <b>{Object.keys(overrides).length}</b></span>
                </div>
                <button
                    onClick={() => closeAll(closedBy)}
                    disabled={closing || loading || !yearcode || total === 0}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600,
                        padding: '7px 14px', border: 'none', borderRadius: 6, background: '#dc2626', color: '#fff',
                        cursor: (closing || loading || total === 0) ? 'not-allowed' : 'pointer',
                        opacity: (closing || loading || total === 0) ? 0.5 : 1,
                    }}
                >
                    <Lock size={13} /> {closing ? 'Closing all…' : `Close Financial Year (${total} members)`}
                </button>
            </div>

            {error && (
                <div className="px-5 py-2 shrink-0" style={{ background: '#fef2f2', color: '#b91c1c', fontSize: 12, borderBottom: '1px solid #fecaca' }}>
                    {error}
                </div>
            )}

            {closeResult && (
                <div className="px-5 py-2 shrink-0" style={{ background: '#f0fdf4', color: '#15803d', fontSize: 12, borderBottom: '1px solid #bbf7d0' }}>
                    Closed {closeResult.succeeded.length} member(s).
                    {closeResult.failed.length > 0 && (
                        <> {closeResult.failed.length} failed: {closeResult.failed.map((f) => `${f.mbno} (${f.error})`).join('; ')}</>
                    )}
                </div>
            )}

            <div className="flex-1 overflow-auto px-5 py-3">
                {loading ? (
                    <div className="flex items-center justify-center" style={{ height: 200, color: '#8b90a0' }}>Loading…</div>
                ) : members.length === 0 ? (
                    <div className="flex items-center justify-center" style={{ height: 200, color: '#8b90a0' }}>No members with RD activity this financial year.</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', border: '1px solid #e4e6eb', borderRadius: 8 }}>
                        <thead>
                            <tr>
                                {['Member', 'Pattern', 'Paid/Due', 'Installment Int.', 'Opening-Bal. Int.', 'Total Int.', 'Balance', 'Decision', 'Action'].map((h) => (
                                    <th key={h} style={{ textAlign: 'left', fontSize: 10.5, fontWeight: 600, color: '#8b90a0', padding: '8px 10px', borderBottom: '1px solid #eceef1', background: '#f7f8fa' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {members.map((m) => {
                                const auto = m.patternEvaluation.autoEligibleFullInterest;
                                const override = overrides[m.mbno];
                                return (
                                    <tr key={m.mbno}>
                                        <td style={{ fontSize: 12, fontWeight: 600, padding: '8px 10px', borderBottom: '1px solid #f2f3f5' }}>{m.mbno}</td>
                                        <td style={{ fontSize: 11.5, padding: '8px 10px', borderBottom: '1px solid #f2f3f5' }}>
                                            <div className="flex items-center gap-1.5" style={{ color: auto ? '#15803d' : '#b45309' }}>
                                                {auto ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                                                {PATTERN_LABEL[m.patternEvaluation.detectedPattern] || m.patternEvaluation.detectedPattern}
                                            </div>
                                            {!auto && m.patternEvaluation.disqualifyingReasons.length > 0 && (
                                                <div style={{ fontSize: 10.5, color: '#8b90a0', marginTop: 2 }}>{m.patternEvaluation.disqualifyingReasons[0]}</div>
                                            )}
                                        </td>
                                        <td style={{ fontSize: 12, padding: '8px 10px', borderBottom: '1px solid #f2f3f5' }}>
                                            {m.patternEvaluation.totalPaidOnTime + m.patternEvaluation.totalPaidLate}/{m.patternEvaluation.totalDue}
                                        </td>
                                        <td style={{ fontSize: 12, padding: '8px 10px', borderBottom: '1px solid #f2f3f5' }}>₹{fmt(m.installmentInterest.totalInterest)}</td>
                                        <td style={{ fontSize: 12, padding: '8px 10px', borderBottom: '1px solid #f2f3f5' }}>₹{fmt(m.openingBalanceInterest.totalInterest)}</td>
                                        <td style={{ fontSize: 12, fontWeight: 600, padding: '8px 10px', borderBottom: '1px solid #f2f3f5' }}>₹{fmt(m.totalInterestIfClosedNow)}</td>
                                        <td style={{ fontSize: 12, padding: '8px 10px', borderBottom: '1px solid #f2f3f5' }}>₹{fmt(m.currentBalance)}</td>
                                        <td style={{ fontSize: 11.5, padding: '8px 10px', borderBottom: '1px solid #f2f3f5', minWidth: 220 }}>
                                            {auto && !override ? (
                                                <span style={{ color: '#15803d' }}>Auto: Full Interest</span>
                                            ) : override ? (
                                                <div>
                                                    <span style={{ color: override.eligible ? '#15803d' : '#b91c1c', fontWeight: 600 }}>
                                                        Override: {override.eligible ? 'Full Interest' : 'Reduced Interest'}
                                                    </span>
                                                    <div style={{ color: '#8b90a0' }}>{override.reason}</div>
                                                    <button onClick={() => setOverride(m.mbno, null)} style={{ fontSize: 10.5, color: '#6b7280', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>clear</button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-1">
                                                    <input
                                                        type="text" placeholder="Reason for override…"
                                                        value={reasonDrafts[m.mbno] || ''}
                                                        onChange={(e) => setReasonDrafts((prev) => ({ ...prev, [m.mbno]: e.target.value }))}
                                                        style={{ fontSize: 11, padding: '4px 6px', border: '1px solid #d7dae0', borderRadius: 4 }}
                                                    />
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => applyOverride(m.mbno, true)}
                                                            disabled={!(reasonDrafts[m.mbno] || '').trim()}
                                                            style={{ fontSize: 10.5, padding: '3px 8px', border: 'none', borderRadius: 4, background: '#dcfce7', color: '#15803d', cursor: (reasonDrafts[m.mbno] || '').trim() ? 'pointer' : 'not-allowed', opacity: (reasonDrafts[m.mbno] || '').trim() ? 1 : 0.5 }}
                                                        >
                                                            Grant Full
                                                        </button>
                                                        <button
                                                            onClick={() => applyOverride(m.mbno, false)}
                                                            disabled={!(reasonDrafts[m.mbno] || '').trim()}
                                                            style={{ fontSize: 10.5, padding: '3px 8px', border: 'none', borderRadius: 4, background: '#fee2e2', color: '#b91c1c', cursor: (reasonDrafts[m.mbno] || '').trim() ? 'pointer' : 'not-allowed', opacity: (reasonDrafts[m.mbno] || '').trim() ? 1 : 0.5 }}
                                                        >
                                                            Keep Reduced
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '8px 10px', borderBottom: '1px solid #f2f3f5' }}>
                                            <button
                                                onClick={() => closeOne(m.mbno, closedBy)}
                                                style={{ fontSize: 11, fontWeight: 600, padding: '5px 10px', border: 'none', borderRadius: 5, background: '#161822', color: '#fff', cursor: 'pointer' }}
                                            >
                                                Close
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="flex items-center justify-between px-5 py-2 shrink-0" style={{ background: '#fff', borderTop: '1px solid #e4e6eb' }}>
                <span style={{ fontSize: 11.5, color: '#8b90a0' }}>Page {page + 1} of {totalPages}</span>
                <div className="flex gap-1.5">
                    <button
                        onClick={() => yearcode && loadPage(yearcode, page - 1)}
                        disabled={page <= 0 || loading}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, padding: '5px 10px', border: '1px solid #d7dae0', borderRadius: 5, background: '#fff', cursor: page <= 0 ? 'not-allowed' : 'pointer', opacity: page <= 0 ? 0.5 : 1 }}
                    >
                        <ChevronLeft size={12} /> Prev
                    </button>
                    <button
                        onClick={() => yearcode && loadPage(yearcode, page + 1)}
                        disabled={page + 1 >= totalPages || loading}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, padding: '5px 10px', border: '1px solid #d7dae0', borderRadius: 5, background: '#fff', cursor: (page + 1 >= totalPages) ? 'not-allowed' : 'pointer', opacity: (page + 1 >= totalPages) ? 0.5 : 1 }}
                    >
                        Next <ChevronRight size={12} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RdFinancialYearClosing;
