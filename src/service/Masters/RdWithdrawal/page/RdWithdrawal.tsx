import React, { useEffect, useState } from 'react';
import { Modal } from 'antd';
import { Search, IndianRupee, Calendar, History, AlertTriangle } from 'lucide-react';
import MemberLookup from '../../../../components/shared/MemberLookup/MemberLookup';
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
    const [showLookup, setShowLookup] = useState(false);

    useEffect(() => { loadFinancialYear(); }, [loadFinancialYear]);

    const onMemberSelected = (member: any) => {
        const memberNo = String(member.memberNo || '');
        const name = member.memberName || member.name || '';
        setLookupInput(memberNo);
        loadMember(memberNo, name);
        setShowLookup(false);
    };

    const overLimit = maxWithdrawable !== null && amount > maxWithdrawable;

    return (
        <div className="flex flex-col h-full overflow-hidden" style={{ background: '#f4f5f7', color: '#1a1d29', fontSize: 13 }}>
            <div className="flex items-center justify-between px-5 py-2.5 shrink-0" style={{ background: '#161822', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-baseline gap-2.5">
                    <h1 className="m-0 font-semibold text-white" style={{ fontSize: 15 }}>RD Withdrawal</h1>
                    <span style={{ fontSize: 11.5, color: '#9296a8' }}>Withdraw from a member's RD balance</span>
                </div>
                {yearLabel && (
                    <div className="flex items-center gap-1.5" style={{ fontSize: 11.5, color: '#9296a8' }}>
                        <Calendar size={12} /> {yearLabel}
                    </div>
                )}
            </div>

            <div className="flex gap-3.5 p-3.5 flex-1 overflow-auto items-start">
                <div className="flex flex-col gap-3" style={{ width: 380, flexShrink: 0 }}>

                    <div style={{ background: '#fff', border: '1px solid #e4e6eb', borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, color: '#6b7280', marginBottom: 8 }}>Member</div>
                        <div className="flex gap-1.5">
                            <input
                                type="text" placeholder="Member No." value={lookupInput}
                                onChange={e => setLookupInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && loadMember(lookupInput, '')}
                                style={{ width: 100, fontSize: 12.5, padding: '6px 8px', border: '1px solid #d7dae0', borderRadius: 6, outline: 'none' }}
                            />
                            <input
                                type="text" placeholder="Member name" value={memberName} readOnly
                                style={{ flex: 1, minWidth: 0, fontSize: 12.5, padding: '6px 8px', border: '1px solid #eceef1', borderRadius: 6, background: '#f7f8fa', color: '#4b5160' }}
                            />
                            <button
                                onClick={() => loadMember(lookupInput, '')}
                                disabled={loading || !lookupInput}
                                style={{ fontSize: 12, fontWeight: 600, padding: '6px 12px', border: 'none', borderRadius: 6, background: '#2563eb', color: '#fff', cursor: 'pointer', opacity: (loading || !lookupInput) ? 0.5 : 1 }}
                            >
                                Search
                            </button>
                            <button
                                type="button" onClick={() => setShowLookup(true)} title="Member Lookup"
                                style={{ width: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: 6, background: '#f0f1f4', color: '#5b6072', cursor: 'pointer' }}
                            >
                                <Search size={13} />
                            </button>
                        </div>
                    </div>

                    {mbno && (
                        <div style={{ background: '#fff', border: '1px solid #e4e6eb', borderRadius: 8, padding: 12 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, color: '#6b7280', marginBottom: 8 }}>Withdraw</div>

                            <div className="flex justify-between" style={{ marginBottom: 10, fontSize: 11.5, color: '#8b90a0' }}>
                                <span>Current Balance: <b style={{ color: '#1a1d29' }}>₹{balance !== null ? fmt(balance) : '—'}</b></span>
                                <span>Max Withdrawable: <b style={{ color: '#15803d' }}>₹{maxWithdrawable !== null ? fmt(maxWithdrawable) : '—'}</b></span>
                            </div>

                            <label style={{ display: 'block', fontSize: 11, color: '#8b90a0', marginBottom: 4 }}>Amount (₹)</label>
                            <div className="relative">
                                <IndianRupee size={11} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#8b90a0' }} />
                                <input
                                    type="number" value={amount || ''}
                                    onChange={e => setAmount(Number(e.target.value))}
                                    style={{ width: '100%', fontSize: 13, fontWeight: 600, padding: '7px 8px 7px 24px', border: `1px solid ${overLimit ? '#fca5a5' : '#d7dae0'}`, borderRadius: 6, outline: 'none' }}
                                />
                            </div>

                            {overLimit && (
                                <div className="flex items-center gap-1.5" style={{ marginTop: 6, fontSize: 11, color: '#b91c1c' }}>
                                    <AlertTriangle size={11} /> Exceeds the maximum withdrawable amount — the minimum balance requirement would be breached.
                                </div>
                            )}

                            <label style={{ display: 'block', fontSize: 11, color: '#8b90a0', marginTop: 10, marginBottom: 4 }}>Narration</label>
                            <input
                                type="text" value={narration} onChange={e => setNarration(e.target.value)}
                                style={{ width: '100%', fontSize: 12.5, padding: '6px 8px', border: '1px solid #d7dae0', borderRadius: 6, outline: 'none' }}
                            />

                            {message && (
                                <div style={{
                                    marginTop: 10, padding: '9px 11px', borderRadius: 6, fontSize: 12,
                                    background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
                                    color: message.type === 'success' ? '#15803d' : '#b91c1c',
                                    border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                                }}>
                                    {message.text}
                                </div>
                            )}

                            <button
                                onClick={withdraw}
                                disabled={saving || loading || amount <= 0 || overLimit}
                                style={{
                                    width: '100%', marginTop: 12, padding: 10, background: '#dc2626', color: '#fff',
                                    border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600,
                                    cursor: (saving || loading || amount <= 0 || overLimit) ? 'not-allowed' : 'pointer',
                                    opacity: (saving || loading || amount <= 0 || overLimit) ? 0.5 : 1,
                                }}
                            >
                                {saving ? 'Processing…' : 'Withdraw'}
                            </button>
                        </div>
                    )}
                </div>

                {mbno && (
                    <div className="flex-1" style={{ minWidth: 0, background: '#fff', border: '1px solid #e4e6eb', borderRadius: 8, overflow: 'hidden' }}>
                        <div className="flex items-center gap-1.5" style={{ padding: '10px 14px', borderBottom: '1px solid #eceef1' }}>
                            <History size={12} className="text-slate-500" />
                            <h2 style={{ fontSize: 12.5, fontWeight: 600, color: '#1a1d29', margin: 0 }}>Balance Timeline — {yearLabel}</h2>
                        </div>
                        <div style={{ overflow: 'auto' }}>
                            {timeline.length === 0 ? (
                                <div className="flex items-center justify-center" style={{ height: 100, color: '#8b90a0', fontSize: 13 }}>
                                    No balance events yet for this financial year.
                                </div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr>
                                            {['Date', 'Event', 'Amount', 'Resulting Balance', 'Narration'].map(h => (
                                                <th key={h} style={{ textAlign: 'left', fontSize: 10.5, fontWeight: 600, color: '#8b90a0', padding: '7px 8px', borderBottom: '1px solid #eceef1', background: '#f7f8fa' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {timeline.map(row => (
                                            <tr key={row.id}>
                                                <td style={{ fontSize: 12, color: '#1a1d29', padding: '7px 8px', borderBottom: '1px solid #f2f3f5' }}>{new Date(row.eventDate).toLocaleDateString('en-IN')}</td>
                                                <td style={{ fontSize: 12, color: '#5b6072', padding: '7px 8px', borderBottom: '1px solid #f2f3f5' }}>{EVENT_LABEL[row.eventType] || row.eventType}</td>
                                                <td style={{ fontSize: 12, color: row.eventType === 'WITHDRAWAL' ? '#dc2626' : '#15803d', fontWeight: 500, padding: '7px 8px', borderBottom: '1px solid #f2f3f5' }}>
                                                    {row.eventType === 'WITHDRAWAL' ? '−' : '+'}₹{fmt(row.amount)}
                                                </td>
                                                <td style={{ fontSize: 12, fontWeight: 600, color: '#1a1d29', padding: '7px 8px', borderBottom: '1px solid #f2f3f5' }}>₹{fmt(row.resultingBalance)}</td>
                                                <td style={{ fontSize: 12, color: '#8b90a0', padding: '7px 8px', borderBottom: '1px solid #f2f3f5' }}>{row.narration || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <Modal open={showLookup} onCancel={() => setShowLookup(false)} footer={null} width={800} styles={{ body: { padding: 0 } }} destroyOnClose>
                <MemberLookup isModal onSelect={onMemberSelected} onClose={() => setShowLookup(false)} />
            </Modal>
        </div>
    );
};

export default RdWithdrawal;
