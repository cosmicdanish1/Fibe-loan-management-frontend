import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar, Search as SearchIcon, Wallet, Percent, Landmark, Shapes, AlertTriangle, CheckCircle2, Info, Lock, ChevronDown, ChevronRight, Printer, History } from 'lucide-react';
import MemberField from '../../../../components/shared/kit/MemberField';
import { useAuth } from '../../../../auth/context/AuthContext';
import { useRdInterest, RdDecisionChoice } from '../hooks/useRdInterest';
import { useTranslation } from 'react-i18next';

const fmt = (n: number) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const shortDate = (s: string | null | undefined) => {
    if (!s) return '-';
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? String(s) : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const statStyle = (tone: string): React.CSSProperties => ({ ['--aw-tone' as any]: tone, textAlign: 'left' });
const PATTERN_TONE: Record<string, string> = {
    FULLY_REGULAR: 'var(--aw-success)',
    INITIAL_GAP_RECOVERED: 'var(--aw-warning)',
    LATER_GAP_RECOVERED: 'var(--aw-warning)',
    MULTIPLE_GAPS: 'var(--aw-warning)',
    GAP_UNRECOVERED: 'var(--aw-danger)',
};

/** ES-629: RD/CD interest of ONE member, month by month, with the detected pattern and the employee's Allow / Deny decision. */
const RdInterest: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const closedBy = user?.username || '';
    const [params] = useSearchParams();
    const { yearLabel, data, historyYears, loading, saving, message, loadFinancialYear, loadHistoryYears, load, decide, clearDecision } = useRdInterest();
    // 'current' = the live year with the decision; a number = a past financial year (its start year), read-only
    const [viewYear, setViewYear] = useState<'current' | number>('current');
    const histArg = (y: 'current' | number) => (y === 'current' ? null : y);

    const [lookupInput, setLookupInput] = useState('');
    const [choice, setChoice] = useState<RdDecisionChoice>('DENY');
    const [reason, setReason] = useState('');
    const [openingOpen, setOpeningOpen] = useState(false);

    useEffect(() => {
        (async () => {
            const yc = await loadFinancialYear();
            loadHistoryYears();
            const m = params.get('mbno');
            if (m) { setLookupInput(m); await load(m, params.get('year') ? Number(params.get('year')) : yc); }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // a freshly loaded member starts on the choice that applies to it now
    useEffect(() => {
        if (data) { setChoice(data.decision.effective); setReason(data.decision.reason ?? ''); }
    }, [data?.mbno, data?.decision.saved, data?.decision.effective]); // eslint-disable-line react-hooks/exhaustive-deps

    const same = !!data && Math.abs(data.totals.totalAllowed - data.totals.totalDenied) < 0.005;
    const closed = !!data?.closed;
    const chosenTotal = data ? (choice === 'ALLOW' ? data.totals.totalAllowed : data.totals.totalDenied) : 0;
    const needReason = choice === 'ALLOW' && !same && reason.trim().length < 3;
    const dec = data?.decision;

    const statusPill = (s: string) =>
        s === 'ON_TIME' ? <span className="aw-pill tone-success">{t('On time')}</span>
            : s === 'LATE' ? <span className="aw-pill tone-warning">{t('Paid late')}</span>
                : s === 'NOT_POSTED' ? <span className="aw-pill tone-muted">{t('Imported, not posted')}</span>
                : <span className="aw-pill tone-danger">{t('Not paid')}</span>;

    const submit = (post: boolean) => { if (data && !needReason) decide(choice, choice === 'ALLOW' ? reason.trim() : '', post, closedBy); };

    const historic = !!data?.historic;

    return (
        <div className="app-window aw-calm">
            <style>{`@media print { .aw-bar-strip, .rdi-no-print, .aw-alert-success, .aw-btn { display: none !important; } .app-window { height: auto !important; overflow: visible !important; } .aw-content { overflow: visible !important; height: auto !important; } .aw-table-wrap { max-height: none !important; overflow: visible !important; } .rdi-print-head { display: block !important; } .aw-card, .aw-stat { break-inside: avoid; box-shadow: none !important; } }`}</style>
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">{t('RD/CD Interest')}</h1>
                    <p className="aw-desc">{t("One member's year-end interest, month by month, with the payment pattern and your decision")}</p>
                </div>
                {yearLabel && <span className="aw-pill" style={{ gap: 8 }}><Calendar size={12} /> {yearLabel}</span>}
            </div>

            <div className="aw-bar-strip">
                <div className="aw-inline" style={{ maxWidth: 900 }}>
                    <div style={{ width: 190, flex: 'none' }}>
                        <MemberField value={lookupInput} onChange={setLookupInput} onSelect={(m: any) => { const no = String(m?.memberNo ?? m?.mbno ?? ''); if (no) { setLookupInput(no); load(no, undefined, histArg(viewYear)); } }} onSubmit={(v: string) => load(v, undefined, histArg(viewYear))} />
                    </div>
                    <input type="text" placeholder={t('Member name')} aria-label={t('Member name')} value={data?.memberName ?? ''} readOnly className="aw-input" />
                    <select aria-label={t('Financial year')} value={String(viewYear)} className="aw-input" style={{ width: 190, flex: 'none' }}
                        onChange={(e) => { const v = e.target.value === 'current' ? 'current' : Number(e.target.value); setViewYear(v); if (lookupInput) load(lookupInput, undefined, histArg(v)); }}>
                        <option value="current">{yearLabel ? `${yearLabel} (current)` : t('Current year')}</option>
                        {historyYears.map((y) => <option key={y.fyStartYear} value={y.fyStartYear}>{y.label}</option>)}
                    </select>
                    <button type="button" onClick={() => load(lookupInput, undefined, histArg(viewYear))} disabled={loading || !lookupInput} className="aw-btn aw-btn-secondary">
                        <SearchIcon size={13} /> {t('Search')}
                    </button>
                    <button type="button" onClick={() => window.print()} disabled={!data} className="aw-btn aw-btn-secondary rdi-no-print">
                        <Printer size={13} /> {t('Print')}
                    </button>
                </div>
            </div>

            {message && (
                <div className={`aw-alert aw-fade-in ${message.type === 'success' ? 'aw-alert-success' : 'aw-alert-danger'}`} role="status"
                    style={{ margin: 'var(--aw-pad) calc(var(--aw-pad) * 1.4) 0', marginBottom: 0 }}>
                    <span>{message.text}</span>
                </div>
            )}

            {data && (
                <div className="rdi-print-head" style={{ display: 'none', padding: '4px 16px' }}>
                    <strong>ESPAT KARMCHARI CO-OP. CREDIT SOCIETY LTD., BHILAI NAGAR</strong>
                    <div>{t('RD/CD interest')} · {t('Member')} {data.mbno} {data.memberName} · {historic ? `${data.fyStart} to ${data.fyEnd}` : yearLabel}</div>
                </div>
            )}

            <div className="aw-content">
                {!data && !loading ? (
                    <div className="aw-empty" style={{ minHeight: 240 }}>
                        <Calendar size={34} />
                        <span>{t("Search for a member to see how the year's RD/CD interest is worked out.")}</span>
                    </div>
                ) : loading || !data ? (
                    <div className="aw-empty" style={{ minHeight: 240 }}><span className="aw-meta">{t('Loading…')}</span></div>
                ) : (
                    <div className="aw-stack aw-fade-in">
                        {historic && (
                            <div className="aw-alert aw-alert-info" role="status"><History size={15} /><span>{t('Past financial year, read-only: nothing can be saved or posted here. The figures are worked out from the ledger of that year.')}</span></div>
                        )}
                        <div className="aw-stats" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                            <div className="aw-stat" style={statStyle('var(--aw-info)')}>
                                <div className="aw-stat-head"><Landmark size={14} /><span className="aw-stat-label">{t('Monthly amount')}</span></div>
                                <div className="aw-stat-value">{data.monthlyAmount == null ? t('Not set') : `₹${fmt(data.monthlyAmount)}`}</div>
                                <div className="aw-meta">{historic ? t('Typical monthly deposit of the year') : t('From RD/CD Member Setup')}</div>
                            </div>
                            <div className="aw-stat" style={statStyle('var(--aw-accent)')}>
                                <div className="aw-stat-head"><Wallet size={14} /><span className="aw-stat-label">{t('Opening balance')}</span></div>
                                <div className="aw-stat-value">₹{fmt(data.openingBalance)}</div>
                                <div className="aw-meta">{t('On the first day of the year')}</div>
                            </div>
                            <div className="aw-stat" style={statStyle('var(--aw-text)')}>
                                <div className="aw-stat-head"><Percent size={14} /><span className="aw-stat-label">{t('Yearly rate')}</span></div>
                                <div className="aw-stat-value">{data.rate}%</div>
                                <div className="aw-meta">{t('Society chart, from Business Rules')}</div>
                            </div>
                            <div className="aw-stat" style={statStyle(PATTERN_TONE[data.pattern.code] || 'var(--aw-text)')}>
                                <div className="aw-stat-head"><Shapes size={14} /><span className="aw-stat-label">{t('Detected pattern')}</span></div>
                                <div className="aw-stat-value" style={{ fontSize: '1.05em' }}>{data.pattern.label}</div>
                                <div className="aw-meta">{data.mode === 'INSTALMENTS' || historic ? t('{{1}} months checked', { 1: data.pattern.totalDue }) : t('No instalment rows')}</div>
                            </div>
                        </div>

                        <section className="aw-card">
                            <div className="aw-card-head">
                                <span className="aw-card-icon"><Shapes size={14} /></span>
                                <h2 className="aw-card-title">{t('Payment pattern')}</h2>
                                <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 6 }}>
                                    <span className="aw-pill tone-success">{t('{{1}} on time', { 1: data.pattern.paidOnTime })}</span>
                                    <span className="aw-pill tone-warning">{t('{{1}} late', { 1: data.pattern.paidLate })}</span>
                                    <span className="aw-pill tone-danger">{t('{{1}} not paid', { 1: data.pattern.missed })}</span>
                                </span>
                            </div>
                            <p style={{ margin: '4px 0 0' }}>{data.pattern.summary}</p>
                            {data.pattern.reasons.length > 0 && (
                                <ul className="aw-meta" style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                                    {data.pattern.reasons.map((r, i) => <li key={i}>{r}</li>)}
                                </ul>
                            )}
                        </section>

                        {dec?.needsDecision && !closed && !historic && (
                            <div className="aw-alert aw-alert-warning" role="status"><AlertTriangle size={15} /><span>{t('This member needs your decision. Until you decide, the Deny figure is used.')}</span></div>
                        )}
                        {data.mode === 'LEDGER' && !historic && (
                            <div className="aw-alert aw-alert-info" role="status"><Info size={15} /><span>{t('No instalment rows exist for this member this year, so each deposit counts from the month it was received. Allow and Deny give the same figure.')}</span></div>
                        )}
                        {closed && data.closed && (
                            <div className="aw-alert aw-alert-success" role="status"><Lock size={15} /><span>{t('This year is closed for the member: ₹{{1}} was posted on {{2}} by {{3}}.', { 1: fmt(data.closed.totalInterestCredited), 2: data.closed.closedAt, 3: data.closed.closedBy })}</span></div>
                        )}

                        <section className="aw-card">
                            <div className="aw-card-head">
                                <span className="aw-card-icon"><Calendar size={14} /></span>
                                <h2 className="aw-card-title">{t('Month by month')}</h2>
                                <span className="aw-meta" style={{ marginLeft: 'auto' }}>{t('Interest of an instalment = its value in the society chart for the months it stays in')}</span>
                            </div>
                            <div className="aw-table-wrap" style={{ maxHeight: 'none', overflowY: 'visible' }}>
                                <table className="aw-table" style={{ minWidth: 860 }}>
                                    <thead>
                                        <tr>
                                            <th>{historic ? t('Month') : t('Month due')}</th>
                                            <th>{t('Paid on')}</th>
                                            <th className="is-right">{t('Amount')}</th>
                                            <th>{t('Status')}</th>
                                            <th className="is-right">{historic ? t('Months') : t('Allow: months')}</th>
                                            <th className="is-right">{historic ? t('Interest') : t('Allow: interest')}</th>
                                            {!historic && <th className="is-right">{t('Deny: months')}</th>}
                                            {!historic && <th className="is-right">{t('Deny: interest')}</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.months.length === 0 && (
                                            <tr><td colSpan={historic ? 6 : 8} className="aw-meta" style={{ textAlign: 'center', padding: 18 }}>{t('No deposits or instalments this year.')}</td></tr>
                                        )}
                                        {data.months.map((m, i) => (
                                            <tr key={i} style={m.status === 'LATE' ? { background: 'var(--aw-warning-bg, rgba(245,158,11,0.08))' } : undefined}>
                                                <td>{m.label}</td>
                                                <td>{shortDate(m.paidDate)}</td>
                                                <td className="is-right">{m.amount ? fmt(m.amount) : '-'}</td>
                                                <td>{statusPill(m.status)}</td>
                                                <td className="is-right">{m.allowed.months}</td>
                                                <td className="is-right">{fmt(m.allowed.interest)}</td>
                                                {!historic && <td className="is-right">{m.denied.months}</td>}
                                                {!historic && <td className="is-right">{fmt(m.denied.interest)}</td>}
                                            </tr>
                                        ))}
                                        <tr>
                                            <td colSpan={5} className="aw-strong">{t('Interest on the instalments')}</td>
                                            <td className="is-right aw-strong">{fmt(data.totals.installmentAllowed)}</td>
                                            {!historic && <td />}
                                            {!historic && <td className="is-right aw-strong">{fmt(data.totals.installmentDenied)}</td>}
                                        </tr>
                                        <tr onClick={() => setOpeningOpen((v) => !v)} style={{ cursor: 'pointer' }} aria-expanded={openingOpen}>
                                            <td colSpan={5}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                                    {openingOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                    {historic ? t('Interest on the opening balance') : t('Interest on the opening balance (same either way)')}
                                                    <span className="aw-meta">{openingOpen ? t('Hide the working') : t('Show how this is worked out')}</span>
                                                </span>
                                            </td>
                                            <td className="is-right">{fmt(data.openingInterest)}</td>
                                            {!historic && <td />}
                                            {!historic && <td className="is-right">{fmt(data.openingInterest)}</td>}
                                        </tr>
                                        {openingOpen && (
                                            <tr>
                                                <td colSpan={8} style={{ background: 'var(--aw-surface-2, rgba(0,0,0,0.03))' }}>
                                                    <div className="aw-stack" style={{ gap: 8, padding: '6px 4px' }}>
                                                        <div>
                                                            <strong className="aw-strong">{t('Formula')}</strong>
                                                            <div className="aw-meta">{t('Interest of one period = balance × rate ÷ 100 × months ÷ 12. The balance changes after every withdrawal, so each balance earns only for the whole months it stayed at that level. A withdrawal counts from its own month.')}</div>
                                                        </div>
                                                        {data.openingBreakdown.periods.length === 0 ? (
                                                            <div className="aw-meta">{t('No opening-balance interest: the member has no RD/CD movement this year, or no balance on 1 April.')}</div>
                                                        ) : (
                                                            <table className="aw-table" style={{ minWidth: 0 }}>
                                                                <thead>
                                                                    <tr>
                                                                        <th>{t('Period')}</th>
                                                                        <th className="is-right">{t('Balance')}</th>
                                                                        <th className="is-right">{t('Months')}</th>
                                                                        <th>{t('Working')}</th>
                                                                        <th className="is-right">{t('Interest')}</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {data.openingBreakdown.periods.map((p, i) => (
                                                                        <tr key={i}>
                                                                            <td>{p.from === p.to ? p.from : `${p.from} to ${p.to}`}</td>
                                                                            <td className="is-right">₹{fmt(p.balance)}</td>
                                                                            <td className="is-right">{p.months}</td>
                                                                            <td className="aw-meta">₹{fmt(p.balance)} × {data.openingBreakdown.rate}% × {p.months} ÷ 12</td>
                                                                            <td className="is-right">₹{fmt(p.interest)}</td>
                                                                        </tr>
                                                                    ))}
                                                                    <tr>
                                                                        <td colSpan={4} className="aw-strong">{t('Total interest on the opening balance')}</td>
                                                                        <td className="is-right aw-strong">₹{fmt(data.openingInterest)}</td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        )}
                                                        {data.openingBreakdown.withdrawals.length > 0 && (
                                                            <div className="aw-meta">
                                                                {t('Withdrawals this year (they lower the balance from their own month):')}{' '}
                                                                {data.openingBreakdown.withdrawals.map((w) => `${shortDate(w.date)}: ₹${fmt(w.amount)}`).join(' · ')}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        <tr>
                                            <td colSpan={5} className="aw-strong">{t('Total interest for the year')}</td>
                                            <td className="is-right is-info aw-strong">₹{fmt(data.totals.totalAllowed)}</td>
                                            {!historic && <td />}
                                            {!historic && <td className="is-right is-info aw-strong">₹{fmt(data.totals.totalDenied)}</td>}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {historic && data.legacyPosted && (
                            <section className="aw-card">
                                <div className="aw-card-head">
                                    <span className="aw-card-icon"><History size={14} /></span>
                                    <h2 className="aw-card-title">{t('What the legacy system posted')}</h2>
                                </div>
                                <div className="aw-stats" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                                    <div className="aw-stat" style={statStyle('var(--aw-info)')}>
                                        <div className="aw-stat-label">{t('Worked out now from the ledger')}</div>
                                        <div className="aw-stat-value">₹{fmt(data.totals.totalAllowed)}</div>
                                    </div>
                                    <div className="aw-stat" style={statStyle('var(--aw-accent)')}>
                                        <div className="aw-stat-label">{t('Posted by the legacy (DR E1026)')}</div>
                                        <div className="aw-stat-value">₹{fmt(data.legacyPosted.amount)}</div>
                                        <div className="aw-meta">{data.legacyPosted.date ? shortDate(data.legacyPosted.date) : t('Nothing posted for this member')}</div>
                                    </div>
                                    <div className="aw-stat" style={statStyle(Math.abs(data.legacyPosted.difference) <= 2 ? 'var(--aw-success)' : 'var(--aw-warning)')}>
                                        <div className="aw-stat-label">{t('Difference')}</div>
                                        <div className="aw-stat-value">₹{fmt(data.legacyPosted.difference)}</div>
                                        <div className="aw-meta">{Math.abs(data.legacyPosted.difference) <= 2 ? t('Matches the legacy') : t('Differs from the legacy')}</div>
                                    </div>
                                </div>
                            </section>
                        )}
                        {!historic && (
                        <section className="aw-card">
                            <div className="aw-card-head">
                                <span className="aw-card-icon"><CheckCircle2 size={14} /></span>
                                <h2 className="aw-card-title">{t('Your decision')}</h2>
                                {dec && (
                                    <span className="aw-meta" style={{ marginLeft: 'auto' }}>
                                        {dec.source === 'SAVED' ? t('Saved by {{1}} on {{2}}', { 1: dec.by, 2: dec.at })
                                            : dec.source === 'AUTO' ? t('Fully regular: allowed automatically') : t('Not decided yet: Deny is used')}
                                    </span>
                                )}
                            </div>
                            <div className="aw-stats" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                                {([['ALLOW', t('Allow full interest'), t('A late instalment counts as paid on time (from its due month).'), data.totals.totalAllowed, 'var(--aw-success)'],
                                ['DENY', t('Deny'), t('A late instalment earns only from the month it was actually paid.'), data.totals.totalDenied, 'var(--aw-warning)']] as const).map(([key, title, hint, total, tone]) => (
                                    <button key={key} type="button" disabled={closed}
                                        onClick={() => setChoice(key)}
                                        className="aw-stat"
                                        aria-pressed={choice === key}
                                        style={{ ...statStyle(tone), cursor: closed ? 'default' : 'pointer', outline: choice === key ? `2px solid ${tone}` : 'none', outlineOffset: 0 }}>
                                        <div className="aw-stat-head"><span className="aw-stat-label">{title}</span></div>
                                        <div className="aw-stat-value">₹{fmt(total)}</div>
                                        <div className="aw-meta">{hint}</div>
                                    </button>
                                ))}
                            </div>
                            {choice === 'ALLOW' && !same && (
                                <div style={{ marginTop: 12 }}>
                                    <label className="aw-label" htmlFor="ri-reason">{t('Reason for allowing (needed)')}</label>
                                    <input id="ri-reason" type="text" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} className="aw-input" placeholder={t('For example: paid late because of a payroll delay')} disabled={closed} />
                                </div>
                            )}
                            {same && !closed && <p className="aw-meta" style={{ marginTop: 10 }}>{t('Allow and Deny give the same figure for this member, so the choice changes nothing.')}</p>}
                            <div className="aw-btn-row" style={{ gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
                                {dec?.saved && !closed && (
                                    <button type="button" className="aw-btn aw-btn-ghost" onClick={clearDecision} disabled={saving}>{t('Clear my decision')}</button>
                                )}
                                <button type="button" className="aw-btn aw-btn-secondary" onClick={() => submit(false)} disabled={saving || closed || needReason}>{t('Save decision')}</button>
                                <button type="button" className="aw-btn aw-btn-primary" onClick={() => submit(true)} disabled={saving || closed || needReason || !closedBy}>
                                    {t('Post ₹{{1}} ({{2}})', { 1: fmt(chosenTotal), 2: choice === 'ALLOW' ? t('allow') : t('deny') })}
                                </button>
                            </div>
                        </section>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RdInterest;
