import React, { useEffect, useState } from 'react';
import { Calendar, CheckCircle2, AlertCircle, Circle, Search as SearchIcon } from 'lucide-react';
import MemberField from '../../../../components/shared/kit/MemberField';
import AwDialog from '../../../../components/shared/kit/AwDialog';
import { useAuth } from '../../../../auth/context/AuthContext';
import { useRdRepayment, RdPendingInstallmentRow } from '../hooks/useRdRepayment';

const fmt = (n: number) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STATUS_STYLE: Record<RdPendingInstallmentRow['status'], { tone: string; icon: React.ReactNode }> = {
    PAID: { tone: 'tone-success', icon: <CheckCircle2 size={13} /> },
    PARTIAL: { tone: 'tone-warning', icon: <AlertCircle size={13} /> },
    UNPAID: { tone: 'tone-muted', icon: <Circle size={13} /> },
};

const RdRepayment: React.FC = () => {
    const { user } = useAuth();
    const recordedBy = user?.username || 'admin';

    const {
        mbno, memberName, yearLabel, months, loading, saving, message,
        loadFinancialYear, loadMember, recordPayment,
    } = useRdRepayment();

    const [lookupInput, setLookupInput] = useState('');
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
        <div className="app-window">
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">RD Repayment</h1>
                    <p className="aw-desc">Record a member's monthly RD payment at the counter</p>
                </div>
                {yearLabel && (
                    <span className="aw-pill" style={{ gap: 6 }}><Calendar size={12} /> {yearLabel}</span>
                )}
            </div>

            <div className="aw-bar-strip">
                <div className="aw-inline" style={{ maxWidth: 520 }}>
                    <div style={{ width: 190, flex: 'none' }}>
                        <MemberField value={lookupInput} onChange={setLookupInput} onSelect={onMemberSelected}
                            onSubmit={v => loadMember(v, '')} />
                    </div>
                    <input type="text" placeholder="Member name" aria-label="Member name" value={memberName} readOnly className="aw-input" />
                    <button type="button" onClick={() => loadMember(lookupInput, '')} disabled={loading || !lookupInput} className="aw-btn aw-btn-secondary">
                        <SearchIcon size={13} /> Search
                    </button>
                </div>
            </div>

            {message && (
                <div className={`aw-alert aw-fade-in ${message.type === 'success' ? 'aw-alert-success' : 'aw-alert-danger'}`} role="status"
                    style={{ margin: 'var(--aw-pad) calc(var(--aw-pad) * 1.4) 0', marginBottom: 0 }}>
                    {message.text}
                </div>
            )}

            <div className="aw-content">
                {!mbno ? (
                    <div className="aw-empty" style={{ minHeight: 240 }}>
                        <Calendar size={34} />
                        <span>Search for a member to see their RD months.</span>
                    </div>
                ) : loading ? (
                    <div className="aw-empty" style={{ minHeight: 240 }}>
                        <span className="aw-meta">Loading…</span>
                    </div>
                ) : (
                    <div className="aw-month-grid aw-fade-in">
                        {months.map(row => {
                            const style = STATUS_STYLE[row.status];
                            return (
                                <div key={`${row.installmentMonth}-${row.installmentYear}`} className="aw-mini-card">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span className="aw-strong">{MONTH_NAMES[row.installmentMonth]} {row.installmentYear}</span>
                                        <span className={`aw-pill ${style.tone}`} style={{ gap: 4 }}>{style.icon} {row.status}</span>
                                    </div>
                                    <div className="aw-meta">
                                        Expected ₹{fmt(row.expectedAmount)} · Paid ₹{fmt(row.paidAmount)}
                                    </div>
                                    <button type="button" onClick={() => openPayment(row)} disabled={row.status === 'PAID'}
                                        className={`aw-btn aw-btn-sm ${row.status === 'PAID' ? 'aw-btn-secondary' : 'aw-btn-primary'}`} style={{ width: '100%' }}>
                                        {row.status === 'UNPAID' ? 'Record Payment' : row.status === 'PARTIAL' ? 'Complete Payment' : 'Paid'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <AwDialog open={!!selected} onClose={() => setSelected(null)} compact maxWidth="26rem"
                title={selected ? `RD Payment — ${MONTH_NAMES[selected.installmentMonth]} ${selected.installmentYear}` : ''}>
                {selected && (
                    <div className="aw-stack">
                        <p className="aw-meta">Expected ₹{fmt(selected.expectedAmount)} · Already paid ₹{fmt(selected.paidAmount)}</p>
                        {selected.paidAmount > 0 && selected.paidAmount < selected.expectedAmount && (
                            <div className="aw-alert aw-alert-warning" style={{ marginBottom: 0 }}>
                                Remaining balance: ₹{fmt(selected.expectedAmount - selected.paidAmount)} — enter the full new total below, not just the top-up amount.
                            </div>
                        )}
                        <div>
                            <label className="aw-label" htmlFor="rr-amount">Amount Paid (₹) — entered exactly as given, not auto-calculated</label>
                            <input id="rr-amount" type="number" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} className="aw-input" />
                        </div>
                        <div>
                            <label className="aw-label" htmlFor="rr-narration">Narration</label>
                            <input id="rr-narration" type="text" value={narration} onChange={e => setNarration(e.target.value)} className="aw-input" />
                        </div>
                        <button type="button" onClick={submitPayment} disabled={saving || amount <= 0} className="aw-btn aw-btn-primary" style={{ width: '100%' }}>
                            {saving ? 'Recording…' : 'Record Payment'}
                        </button>
                    </div>
                )}
            </AwDialog>
        </div>
    );
};

export default RdRepayment;
