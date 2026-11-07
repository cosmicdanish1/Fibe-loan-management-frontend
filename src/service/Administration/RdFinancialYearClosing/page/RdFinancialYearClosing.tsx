import React, { useEffect, useState } from 'react';
import { Calendar, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight, Lock, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../../auth/context/AuthContext';
import { useRdFinancialYearClosing } from '../hooks/useRdFinancialYearClosing';
import { useTranslation } from 'react-i18next';

const fmt = (n: number) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PATTERN_LABEL: Record<string, string> = {
    FULLY_REGULAR: 'Fully Regular',
    INITIAL_GAP_RECOVERED: 'Initial Gap (Recovered)',
    LATER_GAP_RECOVERED: 'Later Gap (Recovered)',
    MULTIPLE_GAPS: 'Multiple Gaps',
    GAP_UNRECOVERED: 'Unpaid Installment(s)',
};

const RdFinancialYearClosing: React.FC = () => {
  const { t } = useTranslation();
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
                    <h1 className="aw-title">{t('RD Financial Year Closing')}</h1>
                    <p className="aw-desc">{t('Bulk review, override, and close the RD year')}</p>
                </div>
                <div className="aw-actions">
                    {yearLabel && (
                        <span className="aw-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <Calendar size={12} /> {yearLabel} (yearcode {yearcode})
                        </span>
                    )}
                    <button type="button" onClick={() => closeAll(closedBy)} disabled={closeDisabled} className="aw-btn aw-btn-danger">
                        {closing ? <RefreshCw size={13} className="aw-spin" /> : <Lock size={13} />}
                        {closing ? t('Closing all…') : t('Close Financial Year ({{1}} members)', { 1: total })}
                    </button>
                </div>
            </div>

            <div className="aw-content">
                <div className="aw-stack">
                    {/* ── Summary ── */}
                    <div className="aw-stats aw-stats-3">
                        <div className="aw-stat aw-stat-left">
                            <div className="aw-stat-label">{t('Total members')}</div>
                            <div className="aw-stat-value">{total}</div>
                        </div>
                        <div className="aw-stat aw-stat-left" style={{ ['--aw-tone' as any]: needsReviewCount > 0 ? 'var(--aw-warning)' : 'var(--aw-success)' }}>
                            <div className="aw-stat-label">{t('Needs review (this page)')}</div>
                            <div className="aw-stat-value">{needsReviewCount}</div>
                        </div>
                        <div className="aw-stat aw-stat-left" style={{ ['--aw-tone' as any]: 'var(--aw-info)' }}>
                            <div className="aw-stat-label">{t('Overrides set')}</div>
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
                                {t('Closed')} {closeResult.succeeded.length} {t('member(s).')}
                                {closeResult.failed.length > 0 && (
                                    <> {closeResult.failed.length} {t('failed:')} {closeResult.failed.map((f) => `${f.mbno} (${f.error})`).join('; ')}</>
                                )}
                            </span>
                        </div>
                    )}

                    {/* ── Members ── */}
                    <section className="aw-card">
                        {loading ? (
                            <div className="aw-empty" style={{ padding: 40 }}>
                                <RefreshCw size={28} className="aw-spin" />
                                <strong className="aw-strong">{t('Loading…')}</strong>
                            </div>
                        ) : members.length === 0 ? (
                            <div className="aw-empty" style={{ padding: 40 }}>
                                <Calendar size={28} />
                                <strong className="aw-strong">{t('No members with RD activity this financial year.')}</strong>
                            </div>
                        ) : (
                            <div className="aw-table-wrap" style={{ maxHeight: '58vh' }}>
                                <table className="aw-table" style={{ minWidth: 1000 }}>
                                    <thead>
                                        <tr>
                                            <th>{t('Member')}</th>
                                            <th>{t('Pattern')}</th>
                                            <th className="is-right">{t('Paid/Due')}</th>
                                            <th className="is-right">{t('Installment Int.')}</th>
                                            <th className="is-right">{t('Opening-Bal. Int.')}</th>
                                            <th className="is-right">{t('Total Int.')}</th>
                                            <th className="is-right">{t('Balance')}</th>
                                            <th style={{ minWidth: 230 }}>{t('Decision')}</th>
                                            <th style={{ width: 80 }}>{t('Action')}</th>
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
                                                            <span className="aw-pill tone-success">{t('Auto: Full Interest')}</span>
                                                        ) : override ? (
                                                            <div>
                                                                <span className={`aw-pill tone-${override.eligible ? 'success' : 'danger'}`}>
                                                                    {t('Override:')} {override.eligible ? t('Full Interest') : t('Reduced Interest')}
                                                                </span>
                                                                <span className="aw-meta">{override.reason}</span>
                                                                <button type="button" onClick={() => setOverride(m.mbno, null)} className="aw-btn aw-btn-ghost aw-btn-sm" style={{ padding: '0 6px' }}>{t('Clear')}</button>
                                                            </div>
                                                        ) : (
                                                            <div className="aw-stack" style={{ gap: 6 }}>
                                                                <input
                                                                    type="text"
                                                                    placeholder={t('Reason for override…')}
                                                                    aria-label={t('Override reason for {{1}}', { 1: m.mbno })}
                                                                    value={reasonDrafts[m.mbno] || ''}
                                                                    onChange={(e) => setReasonDrafts((prev) => ({ ...prev, [m.mbno]: e.target.value }))}
                                                                    className="aw-input"
                                                                />
                                                                <div className="aw-btn-row" style={{ gap: 6 }}>
                                                                    <button type="button" onClick={() => applyOverride(m.mbno, true)} disabled={!hasReason} className="aw-btn aw-btn-secondary aw-btn-sm">{t('Grant Full')}</button>
                                                                    <button type="button" onClick={() => applyOverride(m.mbno, false)} disabled={!hasReason} className="aw-btn aw-btn-secondary aw-btn-sm">{t('Keep Reduced')}</button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <button type="button" onClick={() => closeOne(m.mbno, closedBy)} className="aw-btn aw-btn-primary aw-btn-sm">{t('Close')}</button>
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
                <span>{t('{{1}} {{2}} of {{3}}', { 1: t('Page'), 2: page + 1, 3: totalPages })}</span>
                <span style={{ display: 'inline-flex', gap: 6 }}>
                    <button type="button" onClick={() => yearcode && loadPage(yearcode, page - 1)} disabled={page <= 0 || loading} className="aw-btn aw-btn-secondary aw-btn-sm">
                        <ChevronLeft size={12} /> {t('Prev')}
                    </button>
                    <button type="button" onClick={() => yearcode && loadPage(yearcode, page + 1)} disabled={page + 1 >= totalPages || loading} className="aw-btn aw-btn-secondary aw-btn-sm">
                        {t('Next')} <ChevronRight size={12} />
                    </button>
                </span>
            </div>
        </div>
    );
};

export default RdFinancialYearClosing;
