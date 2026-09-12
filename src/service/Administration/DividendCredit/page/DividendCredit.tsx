import React, { useState } from 'react';
import { Wallet, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Modal } from 'antd';
import { useAuth } from '../../../../auth/context/AuthContext';
import { useDividendCredit } from '../hooks/useDividendCredit';

const fmt = (n: number) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const DividendCredit: React.FC = () => {
    const { user } = useAuth();
    const creditedBy = user?.username || 'admin';
    const [showConfirm, setShowConfirm] = useState(false);

    const { yearcode, setYearcode, preview, loading, crediting, creditResult, error, loadPreview, commit } = useDividendCredit();

    const totalToCredit = preview ? preview.members.reduce((sum, m) => sum + m.dividendAmount, 0) : 0;

    return (
        <div className="flex flex-col h-full overflow-hidden" style={{ background: '#f4f5f7', color: '#1a1d29', fontSize: 13 }}>
            <div className="flex items-center justify-between px-5 py-2.5 shrink-0" style={{ background: '#161822', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-baseline gap-2.5">
                    <h1 className="m-0 font-semibold text-white" style={{ fontSize: 15 }}>Dividend Credit</h1>
                    <span style={{ fontSize: 11.5, color: '#9296a8' }}>
                        Applies the PRIOR financial year's already-calculated dividend into Share Value at this year's close
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-3 px-5 py-2.5 shrink-0" style={{ background: '#fff', borderBottom: '1px solid #e4e6eb' }}>
                <label style={{ fontSize: 12, color: '#4b5160' }}>Closing Year Code</label>
                <input
                    type="number" value={yearcode} onChange={(e) => setYearcode(Number(e.target.value))}
                    style={{ fontSize: 12, padding: '5px 8px', border: '1px solid #d7dae0', borderRadius: 5, width: 70 }}
                />
                <button
                    onClick={loadPreview}
                    disabled={loading}
                    style={{ fontSize: 12, fontWeight: 600, padding: '6px 14px', border: 'none', borderRadius: 6, background: '#161822', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
                >
                    {loading ? 'Loading…' : 'Preview'}
                </button>
                {preview && preview.members.length > 0 && (
                    <button
                        onClick={() => setShowConfirm(true)}
                        disabled={crediting}
                        style={{ fontSize: 12, fontWeight: 600, padding: '6px 14px', border: 'none', borderRadius: 6, background: '#dc2626', color: '#fff', cursor: crediting ? 'not-allowed' : 'pointer', opacity: crediting ? 0.6 : 1, marginLeft: 'auto' }}
                    >
                        {crediting ? 'Crediting…' : `Credit ${preview.members.length} member(s) — ₹${fmt(totalToCredit)}`}
                    </button>
                )}
            </div>

            {error && (
                <div className="px-5 py-2 shrink-0" style={{ background: '#fef2f2', color: '#b91c1c', fontSize: 12, borderBottom: '1px solid #fecaca' }}>
                    {error}
                </div>
            )}

            {creditResult && (
                <div className="px-5 py-2 shrink-0" style={{ background: '#f0fdf4', color: '#15803d', fontSize: 12, borderBottom: '1px solid #bbf7d0' }}>
                    <div className="flex items-center gap-2"><CheckCircle2 size={14} /> Credited {creditResult.credited.length} member(s).</div>
                    {creditResult.failed.length > 0 && (
                        <div style={{ color: '#b91c1c', marginTop: 3 }}>
                            {creditResult.failed.length} failed: {creditResult.failed.map((f) => `${f.mbno} (${f.error})`).join('; ')}
                        </div>
                    )}
                </div>
            )}

            <div className="flex-1 overflow-auto px-5 py-3">
                {!preview ? (
                    <div className="flex items-center justify-center" style={{ height: 200, color: '#8b90a0' }}>
                        Set the closing year code, then click Preview.
                    </div>
                ) : preview.previousCalculationYear === null ? (
                    <div className="flex items-center justify-center" style={{ height: 200, color: '#8b90a0' }}>
                        No financial year exists before year code {yearcode} — there is nothing to credit yet.
                    </div>
                ) : preview.members.length === 0 ? (
                    <div className="flex items-center justify-center" style={{ height: 200, color: '#8b90a0' }}>
                        No uncredited dividend found for calculation year {preview.previousCalculationYear}. Either it was never calculated (see Dividend Calculation), or it's already been credited.
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-4 mb-2.5" style={{ fontSize: 12 }}>
                            <span>Crediting dividend calculated for FY <b>{preview.previousCalculationYear}</b></span>
                            <span>Members: <b>{preview.members.length}</b></span>
                            <span>Total to Credit: <b>₹{fmt(totalToCredit)}</b></span>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', border: '1px solid #e4e6eb', borderRadius: 8 }}>
                            <thead>
                                <tr>
                                    {['Member', 'Current Share Value', 'Dividend to Credit', 'New Share Value'].map((h) => (
                                        <th key={h} style={{ textAlign: 'left', fontSize: 10.5, fontWeight: 600, color: '#8b90a0', padding: '8px 10px', borderBottom: '1px solid #eceef1', background: '#f7f8fa' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {preview.members.map((m) => (
                                    <tr key={m.mbno}>
                                        <td style={{ fontSize: 12, padding: '8px 10px', borderBottom: '1px solid #f2f3f5' }}>
                                            <div style={{ fontWeight: 600 }}>{m.mbno}</div>
                                            {m.memberName && <div style={{ fontSize: 11, color: '#8b90a0' }}>{m.memberName}</div>}
                                        </td>
                                        <td style={{ fontSize: 12, padding: '8px 10px', borderBottom: '1px solid #f2f3f5' }}>₹{fmt(m.currentShareValue)}</td>
                                        <td style={{ fontSize: 12, fontWeight: 600, padding: '8px 10px', borderBottom: '1px solid #f2f3f5', color: '#15803d' }}>+ ₹{fmt(m.dividendAmount)}</td>
                                        <td style={{ fontSize: 12, fontWeight: 600, padding: '8px 10px', borderBottom: '1px solid #f2f3f5' }}>₹{fmt(m.newShareValue)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )}
            </div>

            <Modal
                open={showConfirm}
                onCancel={() => setShowConfirm(false)}
                onOk={() => { setShowConfirm(false); commit(creditedBy); }}
                okText="Yes, Credit Dividend"
                okButtonProps={{ danger: true }}
                cancelText="Cancel"
                title="Confirm dividend credit"
            >
                <p style={{ fontSize: 13, color: '#4b5160', lineHeight: 1.6, margin: 0 }}>
                    <AlertTriangle size={14} style={{ verticalAlign: 'text-bottom', marginRight: 4, color: '#b45309' }} />
                    This credits ₹{fmt(totalToCredit)} across {preview?.members.length ?? 0} member(s) into their Share Value, with a real ledger entry each. This cannot be undone from this screen.
                </p>
            </Modal>

            <div className="flex items-center gap-1.5 px-5 py-2 shrink-0" style={{ background: '#fff', borderTop: '1px solid #e4e6eb', fontSize: 11, color: '#8b90a0' }}>
                <Wallet size={11} /> Crediting is idempotent — a member already credited for this calculation year is skipped, never credited twice.
            </div>
        </div>
    );
};

export default DividendCredit;
