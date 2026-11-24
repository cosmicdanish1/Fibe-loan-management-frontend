import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight, Lock, RefreshCw, AlertCircle, Users, ShieldCheck, UserCheck, ExternalLink } from 'lucide-react';
import { useAuth } from '../../../../auth/context/AuthContext';
import AwDialog from '../../../../components/shared/kit/AwDialog';
import { useRdFinancialYearClosing, RdClosingMemberRow } from '../hooks/useRdFinancialYearClosing';
import { useTranslation } from 'react-i18next';

const fmt = (n: number) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const statStyle = (tone: string): React.CSSProperties => ({ ['--aw-tone' as any]: tone, textAlign: 'left' });
const PATTERN_TONE: Record<string, string> = {
    FULLY_REGULAR: 'var(--aw-success)',
    GAP_UNRECOVERED: 'var(--aw-danger)',
};

type Filter = 'needs' | 'all' | 'decided';

/** ES-629: bulk year closing. Each member's pattern, the Allow and Deny figures and the decision; one member is opened in RD/CD Interest. */
const RdFinancialYearClosing: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const closedBy = user?.username || '';

    const {
        yearcode, yearLabel, members, total, page, pageSize,
        loading, closing, busyMember, closeResult, error,
        loadForYear, loadPage, denyMember, closeAll,
    } = useRdFinancialYearClosing();

    const [filter, setFilter] = useState<Filter>('all');
    const [confirmOpen, setConfirmOpen] = useState(false);

    useEffect(() => { loadForYear(); }, [loadForYear]);

    const counts = useMemo(() => ({
        regular: members.filter((m) => m.decision.source === 'AUTO').length,
        needs: members.filter((m) => m.decision.needsDecision).length,
        decided: members.filter((m) => m.decision.source === 'SAVED').length,
    }), [members]);

    const shown = useMemo(() => members.filter((m) =>
        filter === 'all' ? true : filter === 'needs' ? m.decision.needsDecision : m.decision.source === 'SAVED'), [members, filter]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const closeDisabled = closing || loading || !yearcode || total === 0 || !closedBy;

    const openMember = (m: RdClosingMemberRow) => {
        const route = `/administration/rd-interest?mbno=${encodeURIComponent(m.mbno)}${yearcode ? `&year=${yearcode}` : ''}`;
        if (window.electronAPI?.openNewWindow) window.electronAPI.openNewWindow(route);
        else window.location.hash = `#${route}`;
    };

    const decisionCell = (m: RdClosingMemberRow) => {
        const d = m.decision;
        if (d.source === 'SAVED') {
            return (
                <div>
                    <span className={`aw-pill tone-${d.saved === 'ALLOW' ? 'success' : 'warning'}`}>{d.saved === 'ALLOW' ? t('Allowed') : t('Denied')}</span>
                    <span className="aw-meta" style={{ display: 'block' }}>{d.by} · {d.at}</span>
                </div>
            );
        }
        if (d.source === 'AUTO') return <span className="aw-pill tone-success">{t('Auto: fully regular')}</span>;
        if (d.needsDecision) return <span className="aw-pill tone-danger">{t('Needs decision')}</span>;
        return <span className="aw-pill tone-muted">{t('Same either way')}</span>;
    };

    const chip = (key: Filter, label: string, n: number) => (
        <button type="button" key={key} onClick={() => setFilter(key)} aria-pressed={filter === key}
            className={`aw-btn aw-btn-sm ${filter === key ? 'aw-btn-primary' : 'aw-btn-secondary'}`}>
            {label} ({n})
        </button>
    );

    return (
        <div className="app-window aw-calm">
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">{t('RD/CD Financial Year Closing')}</h1>
                    <p className="aw-desc">{t('Check every member\'s payment pattern and interest, decide, then close the year')}</p>
                </div>
                <div className="aw-actions">
                    {yearLabel && (
                        <span className="aw-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <Calendar size={12} /> {yearLabel}
                        </span>
                    )}
                    <button type="button" onClick={() => setConfirmOpen(true)} disabled={closeDisabled} className="aw-btn aw-btn-danger">
                        {closing ? <RefreshCw size={13} className="aw-spin" /> : <Lock size={13} />}
                        {closing ? t('Closing all…') : t('Close the year ({{1}} members)', { 1: total })}
                    </button>
                </div>
            </div>

            <div className="aw-content">
                <div className="aw-stack">
                    <div className="aw-stats" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                        <div className="aw-stat aw-stat-left" style={statStyle('var(--aw-accent)')}>
                            <div className="aw-stat-head"><Users size={14} /><span className="aw-stat-label">{t('Members')}</span></div>
                            <div className="aw-stat-value">{total}</div>
                            <div className="aw-meta">{t('With RD/CD this year')}</div>
                        </div>
                        <div className="aw-stat aw-stat-left" style={statStyle('var(--aw-success)')}>
                            <div className="aw-stat-head"><ShieldCheck size={14} /><span className="aw-stat-label">{t('Fully regular (this page)')}</span></div>
                            <div className="aw-stat-value">{counts.regular}</div>
                            <div className="aw-meta">{t('Allowed automatically')}</div>
                        </div>
                        <div className="aw-stat aw-stat-left" style={statStyle(counts.needs > 0 ? 'var(--aw-warning)' : 'var(--aw-success)')}>
                            <div className="aw-stat-head"><AlertTriangle size={14} /><span className="aw-stat-label">{t('Need a decision (this page)')}</span></div>
                            <div className="aw-stat-value">{counts.needs}</div>
                            <div className="aw-meta">{t('Deny is used until you decide')}</div>
                        </div>
                        <div className="aw-stat aw-stat-left" style={statStyle('var(--aw-info)')}>
                            <div className="aw-stat-head"><UserCheck size={14} /><span className="aw-stat-label">{t('Decided (this page)')}</span></div>
                            <div className="aw-stat-value">{counts.decided}</div>
                            <div className="aw-meta">{t('Saved by an employee')}</div>
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
                                    <> {closeResult.failed.length} {t('failed:')} {closeResult.failed.slice(0, 5).map((f) => `${f.mbno} (${f.error})`).join('; ')}</>
                                )}
                            </span>
                        </div>
                    )}

                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><Users size={14} /></span>
                            <h2 className="aw-card-title">{t('Members')}</h2>
                            <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 6 }}>
                                {chip('needs', t('Need a decision'), counts.needs)}
                                {chip('all', t('All'), members.length)}
                                {chip('decided', t('Decided'), counts.decided)}
                            </span>
                        </div>
                        {loading ? (
                            <div className="aw-empty" style={{ padding: 40 }}>
                                <RefreshCw size={28} className="aw-spin" />
                                <strong className="aw-strong">{t('Loading…')}</strong>
                            </div>
                        ) : shown.length === 0 ? (
                            <div className="aw-empty" style={{ padding: 40 }}>
                                <CheckCircle2 size={28} />
                                <strong className="aw-strong">{filter === 'needs' ? t('Nobody on this page needs a decision.') : t('No members to show.')}</strong>
                            </div>
                        ) : (
                            <div className="aw-table-wrap" style={{ maxHeight: '56vh' }}>
                                <table className="aw-table" style={{ minWidth: 1020 }}>
                                    <thead>
                                        <tr>
                                            <th>{t('Member')}</th>
                                            <th>{t('Pattern')}</th>
                                            <th className="is-right">{t('Paid/Due')}</th>
                                            <th className="is-right">{t('If allowed')}</th>
                                            <th className="is-right">{t('If denied')}</th>
                                            <th className="is-right">{t('Will post')}</th>
                                            <th className="is-right">{t('Balance')}</th>
                                            <th style={{ minWidth: 170 }}>{t('Decision')}</th>
                                            <th style={{ width: 200 }}>{t('Action')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {shown.map((m) => (
                                            <tr key={m.mbno}>
                                                <td className="is-accent">{m.mbno}</td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: PATTERN_TONE[m.patternEvaluation.detectedPattern] || 'var(--aw-warning)' }}>
                                                        {m.patternEvaluation.detectedPattern === 'FULLY_REGULAR' ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                                                        {m.patternLabel}
                                                    </div>
                                                </td>
                                                <td className="is-right">{m.patternEvaluation.totalPaidOnTime + m.patternEvaluation.totalPaidLate}/{m.patternEvaluation.totalDue}</td>
                                                <td className="is-right">₹{fmt(m.interestIfAllowed)}</td>
                                                <td className="is-right">₹{fmt(m.interestIfDenied)}</td>
                                                <td className="is-right is-info">₹{fmt(m.totalInterestIfClosedNow)}</td>
                                                <td className="is-right">₹{fmt(m.currentBalance)}</td>
                                                <td>{decisionCell(m)}</td>
                                                <td>
                                                    <div className="aw-btn-row" style={{ gap: 6 }}>
                                                        {m.decision.needsDecision && (
                                                            <button type="button" className="aw-btn aw-btn-secondary aw-btn-sm" disabled={busyMember === m.mbno} onClick={() => denyMember(m.mbno)}>{t('Deny')}</button>
                                                        )}
                                                        <button type="button" className="aw-btn aw-btn-primary aw-btn-sm" onClick={() => openMember(m)}>
                                                            <ExternalLink size={12} /> {t('Open')}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>
            </div>

            <div className="aw-footer">
                <span>{t('{{1}} {{2}} of {{3}}', { 1: t('Page'), 2: page + 1, 3: totalPages })}</span>
                <span style={{ display: 'inline-flex', gap: 8 }}>
                    <button type="button" onClick={() => yearcode && loadPage(yearcode, page - 1)} disabled={page <= 0 || loading} className="aw-btn aw-btn-secondary aw-btn-sm">
                        <ChevronLeft size={12} /> {t('Prev')}
                    </button>
                    <button type="button" onClick={() => yearcode && loadPage(yearcode, page + 1)} disabled={page + 1 >= totalPages || loading} className="aw-btn aw-btn-secondary aw-btn-sm">
                        {t('Next')} <ChevronRight size={12} />
                    </button>
                </span>
            </div>

            <AwDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} compact maxWidth="28rem" title={t('Close the year for all members?')}>
                <div className="aw-stack">
                    <p>{t('The interest of {{1}} members will be posted to their RD/CD (DR E1026 / CR L1004). Members you have not decided are posted with the Deny figure, except fully regular members, who are allowed.', { 1: total })}</p>
                    <p className="aw-meta">{t('A member whose year is already closed is skipped. This cannot be undone from this window.')}</p>
                    <div className="aw-btn-row" style={{ gap: 8, justifyContent: 'flex-end' }}>
                        <button type="button" className="aw-btn aw-btn-secondary" onClick={() => setConfirmOpen(false)}>{t('Cancel')}</button>
                        <button type="button" className="aw-btn aw-btn-danger" onClick={() => { setConfirmOpen(false); closeAll(closedBy); }}>{t('Close the year')}</button>
                    </div>
                </div>
            </AwDialog>
        </div>
    );
};

export default RdFinancialYearClosing;
