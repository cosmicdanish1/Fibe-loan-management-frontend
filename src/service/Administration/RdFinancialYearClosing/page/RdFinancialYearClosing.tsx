import React, { useEffect, useState } from 'react';
import { Calendar, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight, Lock, RefreshCw, AlertCircle } from 'lucide-react';
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
    const closeDisabled = closing || loading || !yearcode || total === 0;

    const applyOverride = (mbno: string, eligible: boolean) => {
        const reason = (reasonDrafts[mbno] || '').trim();
        if (!reason) return;
        setOverride(mbno, { eligible, reason });
    };

    return (
        <div className="app-window">
            {/* ── Header ── */}
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">RD Financial Year Closing</h1>
                    <p className="aw-desc">Bulk review, override, and close the RD year</p>
                </div>
                <div className="aw-actions">
                    {yearLabel && (
                        <span className="aw-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <Calendar size={12} /> {yearLabel} (yearcode {yearcode})
                        </span>
                    )}
                    <button type="button" onClick={() => closeAll(closedBy)} disabled={closeDisabled} className="aw-btn aw-btn-danger">
                        {closing ? <RefreshCw size={13} className="aw-spin" /> : <Lock size={13} />}
                        {closing ? 'Closing all…' : `Close Financial Year (${total} members)`}
                    </button>
                </div>
            </div>

            <div className="aw-content">
                <div className="aw-stack">
                    {/* ── Summary ── */}
                    <div className="aw-stats aw-stats-3">
                        <div className="aw-stat aw-stat-left">
                            <div className="aw-stat-label">Total members</div>
                            <div className="aw-stat-value">{total}</div>
                        </div>
                        <div className="aw-stat aw-stat-left" style={{ ['--aw-tone' as any]: needsReviewCount > 0 ? 'var(--aw-warning)' : 'var(--aw-success)' }}>
                            <div className="aw-stat-label">Needs review (this page)</div>
                            <div className="aw-stat-value">{needsReviewCount}</div>
                        </div>
                        <div className="aw-stat aw-stat-left" style={{ ['--aw-tone' as any]: 'var(--aw-info)' }}>
                            <div className="aw-stat-label">Overrides set</div>
                            <div className="aw-stat-value">{Object.keys(overrides).length}</div>
                        </div>
                    </div>

                    {error && (
                        <div className="aw-alert aw-alert-danger aw-fade-in" style={{ marginBottom: 0 }} role="alert">
                            <AlertCircle size={15} /><span>{error}</span>
                        </div>
                    )}

                    {closeResult && (
                        <div className="aw-alert aw-alert-success aw-fade-in" style={{ marginBottom: 0 }} role="status">
                            <CheckCircle2 size={15} />
                            <span>
                                Closed {closeResult.succeeded.length} member(s).
                                {closeResult.failed.length > 0 && (
                                    <> {closeResult.failed.length} failed: {closeResult.failed.map((f) => `${f.mbno} (${f.error})`).join('; ')}</>
                                )}
                            </span>
                        </div>
                    )}

                    {/* ── Members ── */}
                    <section className="aw-card">
                        {loading ? (
                            <div className="aw-empty" style={{ padding: 40 }}>
                                <RefreshCw size={28} className="aw-spin" />
                                <strong className="aw-strong">Loading…</strong>
                            </div>
                        ) : members.length === 0 ? (
                            <div className="aw-empty" style={{ padding: 40 }}>
                                <Calendar size={28} />
                                <strong className="aw-strong">No members with RD activity this financial year.</strong>
                            </div>
                        ) : (
                            <div className="aw-table-wrap" style={{ maxHeight: '58vh' }}>
                                <table className="aw-table" style={{ minWidth: 1000 }}>
                                    <thead>
                                        <tr>
                                            <th>Member</th>
                                            <th>Pattern</th>
                                            <th className="is-right">Paid/Due</th>
                                            <th className="is-right">Installment Int.</th>
                                            <th className="is-right">Opening-Bal. Int.</th>
                                            <th className="is-right">Total Int.</th>
                                            <th className="is-right">Balance</th>
                                            <th style={{ minWidth: 230 }}>Decision</th>
                                            <th style={{ width: 80 }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {members.map((m) => {
                                            const auto = m.patternEvaluation.autoEligibleFullInterest;
                                            const override = overrides[m.mbno];
                                            const hasReason = !!(reasonDrafts[m.mbno] || '').trim();
                                            return (
                                                <tr key={m.mbno}>
                                                    <td className="is-accent">{m.mbno}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: auto ? 'var(--aw-success)' : 'var(--aw-warning)' }}>
                                                            {auto ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                                                            {PATTERN_LABEL[m.patternEvaluation.detectedPattern] || m.patternEvaluation.detectedPattern}
                                                        </div>
                                                        {!auto && m.patternEvaluation.disqualifyingReasons.length > 0 && (
                                                            <span className="aw-meta">{m.patternEvaluation.disqualifyingReasons[0]}</span>
                                                        )}
                                                    </td>
                                                    <td className="is-right">
                                                        {m.patternEvaluation.totalPaidOnTime + m.patternEvaluation.totalPaidLate}/{m.patternEvaluation.totalDue}
                                                    </td>
                                                    <td className="is-right">₹{fmt(m.installmentInterest.totalInterest)}</td>
                                                    <td className="is-right">₹{fmt(m.openingBalanceInterest.totalInterest)}</td>
                                                    <td className="is-right is-info">₹{fmt(m.totalInterestIfClosedNow)}</td>
                                                    <td className="is-right">₹{fmt(m.currentBalance)}</td>
                                                    <td>
                                                        {auto && !override ? (
                                                            <span className="aw-pill tone-success">Auto: Full Interest</span>
                                                        ) : override ? (
                                                            <div>
                                                                <span className={`aw-pill tone-${override.eligible ? 'success' : 'danger'}`}>
                                                                    Override: {override.eligible ? 'Full Interest' : 'Reduced Interest'}
                                                                </span>
                                                                <span className="aw-meta">{override.reason}</span>
                                                                <button type="button" onClick={() => setOverride(m.mbno, null)} className="aw-btn aw-btn-ghost aw-btn-sm" style={{ padding: '0 6px' }}>Clear</button>
                                                            </div>
                                                        ) : (
                                                            <div className="aw-stack" style={{ gap: 6 }}>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Reason for override…"
                                                                    aria-label={`Override reason for ${m.mbno}`}
                                                                    value={reasonDrafts[m.mbno] || ''}
                                                                    onChange={(e) => setReasonDrafts((prev) => ({ ...prev, [m.mbno]: e.target.value }))}
                                                                    className="aw-input"
                                                                />
                                                                <div className="aw-btn-row" style={{ gap: 6 }}>
                                                                    <button type="button" onClick={() => applyOverride(m.mbno, true)} disabled={!hasReason} className="aw-btn aw-btn-secondary aw-btn-sm">Grant Full</button>
                                                                    <button type="button" onClick={() => applyOverride(m.mbno, false)} disabled={!hasReason} className="aw-btn aw-btn-secondary aw-btn-sm">Keep Reduced</button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <button type="button" onClick={() => closeOne(m.mbno, closedBy)} className="aw-btn aw-btn-primary aw-btn-sm">Close</button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>
            </div>

            <div className="aw-footer">
                <span>Page {page + 1} of {totalPages}</span>
                <span style={{ display: 'inline-flex', gap: 6 }}>
                    <button type="button" onClick={() => yearcode && loadPage(yearcode, page - 1)} disabled={page <= 0 || loading} className="aw-btn aw-btn-secondary aw-btn-sm">
                        <ChevronLeft size={12} /> Prev
                    </button>
                    <button type="button" onClick={() => yearcode && loadPage(yearcode, page + 1)} disabled={page + 1 >= totalPages || loading} className="aw-btn aw-btn-secondary aw-btn-sm">
                        Next <ChevronRight size={12} />
                    </button>
                </span>
            </div>
        </div>
    );
};

export default RdFinancialYearClosing;
