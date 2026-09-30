import React, { useEffect, useState } from 'react';
import { IndianRupee, Calendar, History, AlertTriangle, User, ArrowDownLeft } from 'lucide-react';
import MemberField from '../../../../components/shared/kit/MemberField';
import { useRdWithdrawal } from '../hooks/useRdWithdrawal';

const fmt = (n: number) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EVENT_LABEL: Record<string, string> = {
    OPENING: 'Opening Balance',
    WITHDRAWAL: 'Withdrawal',
    LOAN_ADDITION: 'Loan-Linked Addition',
    INSTALLMENT_INTEREST_CREDIT: 'Installment Interest Credit',
    OPENING_INTEREST_CREDIT: 'Opening-Balance Interest Credit',
};

const RdWithdrawal: React.FC = () => {
    const {
        mbno, memberName, yearLabel,
        balance, maxWithdrawable, amount, setAmount, narration, setNarration,
        timeline, loading, saving, message,
        loadFinancialYear, loadMember, withdraw,
    } = useRdWithdrawal();

    const [lookupInput, setLookupInput] = useState('');

    useEffect(() => { loadFinancialYear(); }, [loadFinancialYear]);

    const onMemberSelected = (member: any) => {
        const memberNo = String(member.memberNo || '');
        const name = member.memberName || member.name || '';
        setLookupInput(memberNo);
        loadMember(memberNo, name);
    };

    const overLimit = maxWithdrawable !== null && amount > maxWithdrawable;

    return (
        <div className="app-window">
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">RD Withdrawal</h1>
                    <p className="aw-desc">Withdraw from a member's RD balance</p>
                </div>
                {yearLabel && (
                    <span className="aw-pill" style={{ gap: 6 }}><Calendar size={12} /> {yearLabel}</span>
                )}
            </div>

            <div className="aw-content">
                <div className="aw-split aw-split-form">
                    <div className="aw-stack">

                        <section className="aw-card">
                            <div className="aw-card-head">
                                <span className="aw-card-icon"><User size={14} /></span>
                                <h2 className="aw-card-title">Member</h2>
                            </div>
                            <div className="aw-stack">
                                <div className="aw-inline">
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <MemberField value={lookupInput} onChange={setLookupInput} onSelect={onMemberSelected}
                                            onSubmit={v => loadMember(v, '')} />
                                    </div>
                                    <button type="button" onClick={() => loadMember(lookupInput, '')} disabled={loading || !lookupInput} className="aw-btn aw-btn-secondary">
                                        Search
                                    </button>
                                </div>
                                <input type="text" placeholder="Member name" aria-label="Member name" value={memberName} readOnly className="aw-input" />
                            </div>
                        </section>

                        {mbno && (
                            <section className="aw-card aw-fade-in">
                                <div className="aw-card-head">
                                    <span className="aw-card-icon"><ArrowDownLeft size={14} /></span>
                                    <h2 className="aw-card-title">Withdraw</h2>
                                </div>
                                <div className="aw-stack">
                                    <div className="aw-rows">
                                        <div className="aw-row">
                                            <span className="aw-row-label">Current Balance</span>
                                            <span className="aw-row-value">₹{balance !== null ? fmt(balance) : '—'}</span>
                                        </div>
                                        <div className="aw-row">
                                            <span className="aw-row-label">Max Withdrawable</span>
                                            <span className="aw-row-value" style={{ color: 'var(--aw-success)' }}>₹{maxWithdrawable !== null ? fmt(maxWithdrawable) : '—'}</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="aw-label" htmlFor="rw-amount">Amount (₹)</label>
                                        <div className="aw-input-wrap has-icon">
                                            <IndianRupee size={13} />
                                            <input id="rw-amount"
                                                type="number" value={amount || ''}
                                                onChange={e => setAmount(Number(e.target.value))}
                                                className={`aw-input ${overLimit ? 'is-invalid' : ''}`}
                                                aria-invalid={overLimit}
                                            />
                                        </div>
                                        {overLimit && (
                                            <p className="aw-meta aw-fade-in" style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 6, color: 'var(--aw-danger)' }}>
                                                <AlertTriangle size={13} style={{ flex: 'none', marginTop: 2 }} />
                                                Exceeds the maximum withdrawable amount — the minimum balance requirement would be breached.
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="aw-label" htmlFor="rw-narration">Narration</label>
                                        <input id="rw-narration" type="text" value={narration} onChange={e => setNarration(e.target.value)} className="aw-input" />
                                    </div>

                                    {message && (
                                        <div className={`aw-alert aw-fade-in ${message.type === 'success' ? 'aw-alert-success' : 'aw-alert-danger'}`} role="status" style={{ marginBottom: 0 }}>
                                            {message.text}
                                        </div>
                                    )}

                                    <button type="button" onClick={withdraw} disabled={saving || loading || amount <= 0 || overLimit} className="aw-btn aw-btn-primary" style={{ width: '100%' }}>
                                        {saving ? 'Processing…' : 'Withdraw'}
                                    </button>
                                </div>
                            </section>
                        )}
                    </div>

                    {mbno && (
                        <section className="aw-card aw-main aw-fade-in">
                            <div className="aw-main-head">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                    <span className="aw-card-icon"><History size={14} /></span>
                                    <h2 className="aw-card-title">Balance Timeline — {yearLabel}</h2>
                                </div>
                            </div>
                            <div className="aw-main-body" style={{ padding: 0 }}>
                                {timeline.length === 0 ? (
                                    <div className="aw-empty">
                                        <History size={32} />
                                        <span>No balance events yet for this financial year.</span>
                                    </div>
                                ) : (
                                    <table className="aw-table">
                                        <thead>
                                            <tr>
                                                {['Date', 'Event', 'Amount', 'Resulting Balance', 'Narration'].map((h, i) => <th key={h} className={i === 2 || i === 3 ? 'is-right' : ''}>{h}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {timeline.map(row => (
                                                <tr key={row.id}>
                                                    <td>{new Date(row.eventDate).toLocaleDateString('en-IN')}</td>
                                                    <td className="is-muted">{EVENT_LABEL[row.eventType] || row.eventType}</td>
                                                    <td className={`is-right ${row.eventType === 'WITHDRAWAL' ? 'is-danger' : 'is-success'}`}>
                                                        {row.eventType === 'WITHDRAWAL' ? '−' : '+'}₹{fmt(row.amount)}
                                                    </td>
                                                    <td className="is-right">₹{fmt(row.resultingBalance)}</td>
                                                    <td className="is-muted">{row.narration || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RdWithdrawal;
