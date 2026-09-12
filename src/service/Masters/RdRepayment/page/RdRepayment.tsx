import React, { useEffect, useState } from 'react';
import { Modal } from 'antd';
import { Search, Calendar, CheckCircle2, AlertCircle, Circle } from 'lucide-react';
import MemberLookup from '../../../../components/shared/MemberLookup/MemberLookup';
import { useAuth } from '../../../../auth/context/AuthContext';
import { useRdRepayment, RdPendingInstallmentRow } from '../hooks/useRdRepayment';

const fmt = (n: number) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STATUS_STYLE: Record<RdPendingInstallmentRow['status'], { color: string; bg: string; icon: React.ReactNode }> = {
    PAID: { color: '#15803d', bg: '#f0fdf4', icon: <CheckCircle2 size={13} /> },
    PARTIAL: { color: '#b45309', bg: '#fffbeb', icon: <AlertCircle size={13} /> },
    UNPAID: { color: '#8b90a0', bg: '#f7f8fa', icon: <Circle size={13} /> },
};

const RdRepayment: React.FC = () => {
    const { user } = useAuth();
    const recordedBy = user?.username || 'admin';

    const {
        mbno, memberName, yearLabel, months, loading, saving, message,
        loadFinancialYear, loadMember, recordPayment,
    } = useRdRepayment();

    const [lookupInput, setLookupInput] = useState('');
    const [showLookup, setShowLookup] = useState(false);
    const [selected, setSelected] = useState<RdPendingInstallmentRow | null>(null);
    const [amount, setAmount] = useState<number>(0);
    const [narration, setNarration] = useState('');

    useEffect(() => { loadFinancialYear(); }, [loadFinancialYear]);

    const onMemberSelected = (member: any) => {
        const memberNo = String(member.memberNo || '');
        const name = member.memberName || member.name || '';
        setLookupInput(memberNo);
        loadMember(memberNo, name);
        setSelected(null);
        setShowLookup(false);
    };

    const openPayment = (row: RdPendingInstallmentRow) => {
        setSelected(row);
        setAmount(row.expectedAmount || 0);
        setNarration('');
    };

    const submitPayment = async () => {
        if (!selected) return;
        await recordPayment(selected.installmentMonth, selected.installmentYear, amount, recordedBy, narration);
        setSelected(null);
    };

    return (
        <div className="flex flex-col h-full overflow-hidden" style={{ background: '#f4f5f7', color: '#1a1d29', fontSize: 13 }}>
            <div className="flex items-center justify-between px-5 py-2.5 shrink-0" style={{ background: '#161822', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-baseline gap-2.5">
                    <h1 className="m-0 font-semibold text-white" style={{ fontSize: 15 }}>RD Repayment</h1>
                    <span style={{ fontSize: 11.5, color: '#9296a8' }}>Record a member's monthly RD payment at the counter</span>
                </div>
                {yearLabel && (
                    <div className="flex items-center gap-1.5" style={{ fontSize: 11.5, color: '#9296a8' }}>
                        <Calendar size={12} /> {yearLabel}
                    </div>
                )}
            </div>

            <div className="px-5 py-2.5 shrink-0" style={{ background: '#fff', borderBottom: '1px solid #e4e6eb' }}>
                <div className="flex gap-1.5" style={{ maxWidth: 460 }}>
                    <input
                        type="text" placeholder="Member No." value={lookupInput}
                        onChange={e => setLookupInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && loadMember(lookupInput, '')}
                        style={{ width: 110, fontSize: 12.5, padding: '6px 8px', border: '1px solid #d7dae0', borderRadius: 6, outline: 'none' }}
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

            {message && (
                <div className="px-5 py-2 shrink-0" style={{
                    background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
                    color: message.type === 'success' ? '#15803d' : '#b91c1c',
                    fontSize: 12, borderBottom: '1px solid #eceef1',
                }}>
                    {message.text}
                </div>
            )}

            <div className="flex-1 overflow-auto p-3.5">
                {!mbno ? (
                    <div className="flex items-center justify-center" style={{ height: 200, color: '#8b90a0' }}>Search for a member to see their RD months.</div>
                ) : loading ? (
                    <div className="flex items-center justify-center" style={{ height: 200, color: '#8b90a0' }}>Loading…</div>
                ) : (
                    <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                        {months.map(row => {
                            const style = STATUS_STYLE[row.status];
                            return (
                                <div
                                    key={`${row.installmentMonth}-${row.installmentYear}`}
                                    style={{ background: '#fff', border: '1px solid #e4e6eb', borderRadius: 8, padding: 10 }}
                                >
                                    <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                                        <span style={{ fontSize: 12.5, fontWeight: 600 }}>
                                            {MONTH_NAMES[row.installmentMonth]} {row.installmentYear}
                                        </span>
                                        <span className="flex items-center gap-1" style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 6px', borderRadius: 4, color: style.color, background: style.bg }}>
                                            {style.icon} {row.status}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 11.5, color: '#8b90a0', marginBottom: 8 }}>
                                        Expected ₹{fmt(row.expectedAmount)} · Paid ₹{fmt(row.paidAmount)}
                                    </div>
                                    <button
                                        onClick={() => openPayment(row)}
                                        disabled={row.status === 'PAID'}
                                        style={{
                                            width: '100%', fontSize: 11.5, fontWeight: 600, padding: '6px 0', border: 'none', borderRadius: 6,
                                            background: row.status === 'PAID' ? '#f0f1f4' : '#161822', color: row.status === 'PAID' ? '#a3a7b3' : '#fff',
                                            cursor: row.status === 'PAID' ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        {row.status === 'UNPAID' ? 'Record Payment' : row.status === 'PARTIAL' ? 'Complete Payment' : 'Paid'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <Modal
                open={!!selected} onCancel={() => setSelected(null)} footer={null} width={380}
                title={selected ? `RD Payment — ${MONTH_NAMES[selected.installmentMonth]} ${selected.installmentYear}` : ''}
                destroyOnClose
            >
                {selected && (
                    <div className="flex flex-col gap-2.5" style={{ paddingTop: 8 }}>
                        <div style={{ fontSize: 11.5, color: '#8b90a0' }}>
                            Expected ₹{fmt(selected.expectedAmount)} · Already paid ₹{fmt(selected.paidAmount)}
                        </div>
                        {selected.paidAmount > 0 && selected.paidAmount < selected.expectedAmount && (
                            <div style={{ fontSize: 11.5, color: '#b45309', background: '#fffbeb', padding: '5px 8px', borderRadius: 6 }}>
                                Remaining balance: ₹{fmt(selected.expectedAmount - selected.paidAmount)} — enter the full new total below, not just the top-up amount.
                            </div>
                        )}
                        <label style={{ fontSize: 11, color: '#8b90a0' }}>Amount Paid (₹) — entered exactly as given, not auto-calculated</label>
                        <input
                            type="number" value={amount || ''} onChange={e => setAmount(Number(e.target.value))}
                            style={{ fontSize: 13, fontWeight: 600, padding: '7px 8px', border: '1px solid #d7dae0', borderRadius: 6, outline: 'none' }}
                        />
                        <label style={{ fontSize: 11, color: '#8b90a0' }}>Narration</label>
                        <input
                            type="text" value={narration} onChange={e => setNarration(e.target.value)}
                            style={{ fontSize: 12.5, padding: '6px 8px', border: '1px solid #d7dae0', borderRadius: 6, outline: 'none' }}
                        />
                        <button
                            onClick={submitPayment}
                            disabled={saving || amount <= 0}
                            style={{
                                marginTop: 6, padding: 10, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 7,
                                fontSize: 13, fontWeight: 600, cursor: (saving || amount <= 0) ? 'not-allowed' : 'pointer',
                                opacity: (saving || amount <= 0) ? 0.5 : 1,
                            }}
                        >
                            {saving ? 'Recording…' : 'Record Payment'}
                        </button>
                    </div>
                )}
            </Modal>

            <Modal open={showLookup} onCancel={() => setShowLookup(false)} footer={null} width={800} styles={{ body: { padding: 0 } }} destroyOnClose>
                <MemberLookup isModal onSelect={onMemberSelected} onClose={() => setShowLookup(false)} />
            </Modal>
        </div>
    );
};

export default RdRepayment;
