import React, { useEffect, useState } from 'react';
import { IndianRupee, Calendar, History, User, Wallet } from 'lucide-react';
import MemberField from '../../../../components/shared/kit/MemberField';
import { useRdMemberSetup } from '../hooks/useRdMemberSetup';

const fmt = (n: number) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const RdMemberSetup: React.FC = () => {
    const {
        mbno, memberName, yearLabel,
        currentAmount, newAmount, setNewAmount,
        history, loading, saving, message,
        loadFinancialYear, loadMember, save,
    } = useRdMemberSetup();

    const [lookupInput, setLookupInput] = useState('');

    useEffect(() => { loadFinancialYear(); }, [loadFinancialYear]);

    const onMemberSelected = (member: any) => {
        const memberNo = String(member.memberNo || '');
        const name = member.memberName || member.name || '';
        setLookupInput(memberNo);
        loadMember(memberNo, name);
    };

    return (
        <div className="app-window">
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">RD Member Setup</h1>
                    <p className="aw-desc">Set a member's monthly RD contribution for the current financial year</p>
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
                                    <span className="aw-card-icon"><Wallet size={14} /></span>
                                    <h2 className="aw-card-title">Monthly RD Amount</h2>
                                </div>
                                <div className="aw-stack">
                                    <p className="aw-muted">
                                        Currently effective: <strong className="aw-strong">{currentAmount !== null ? `₹${fmt(currentAmount)}` : '— not set —'}</strong>
                                    </p>

                                    <div>
                                        <label className="aw-label" htmlFor="rms-amount">New Monthly Amount (₹)</label>
                                        <div className="aw-input-wrap has-icon">
                                            <IndianRupee size={13} />
                                            <input id="rms-amount"
                                                type="number" value={newAmount || ''}
                                                onChange={e => setNewAmount(Number(e.target.value))}
                                                className="aw-input"
                                            />
                                        </div>
                                        <p className="aw-meta" style={{ marginTop: 6 }}>
                                            Takes effect immediately (mid-year changes are allowed) — this financial year's earlier months keep whatever amount was in effect at the time.
                                        </p>
                                    </div>

                                    {message && (
                                        <div className={`aw-alert aw-fade-in ${message.type === 'success' ? 'aw-alert-success' : 'aw-alert-danger'}`} role="status" style={{ marginBottom: 0 }}>
                                            {message.text}
                                        </div>
                                    )}

                                    <button type="button" onClick={save} disabled={saving || loading || newAmount <= 0} className="aw-btn aw-btn-primary" style={{ width: '100%' }}>
                                        {saving ? 'Saving…' : 'Save Monthly Amount'}
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
                                    <h2 className="aw-card-title">Amount History — {yearLabel}</h2>
                                </div>
                            </div>
                            <div className="aw-main-body" style={{ padding: 0 }}>
                                {history.length === 0 ? (
                                    <div className="aw-empty">
                                        <History size={32} />
                                        <span>No amount set yet for this financial year.</span>
                                    </div>
                                ) : (
                                    <table className="aw-table">
                                        <thead>
                                            <tr>
                                                {['Effective From', 'Monthly Amount', 'Set By', 'Saved At'].map(h => <th key={h}>{h}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {history.map(row => (
                                                <tr key={row.id}>
                                                    <td>{new Date(row.effectiveFromDate).toLocaleDateString('en-IN')}</td>
                                                    <td>₹{fmt(row.monthlyRdAmount)}</td>
                                                    <td className="is-muted">{row.setBy || '—'}</td>
                                                    <td className="is-muted">{new Date(row.createdAt).toLocaleString('en-IN')}</td>
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

export default RdMemberSetup;
