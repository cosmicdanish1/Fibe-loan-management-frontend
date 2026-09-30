import React, { useState } from 'react';
import { Wallet, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw, Search } from 'lucide-react';
import AwDialog from '@/components/shared/kit/AwDialog';
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
        <div className="app-window">
            {/* ── Header ── */}
            <div className="aw-header aw-ambient">
                <div className="min-w-0">
                    <h1 className="aw-title">Dividend Credit</h1>
                    <p className="aw-desc">Applies the PRIOR financial year's already-calculated dividend into Share Value at this year's close</p>
                </div>
                <div className="aw-actions">
                    <button type="button" onClick={loadPreview} disabled={loading} className="aw-btn aw-btn-secondary">
                        {loading ? <RefreshCw size={13} className="aw-spin" /> : <Search size={13} />}
                        {loading ? 'Loading…' : 'Preview'}
                    </button>
                    {preview && preview.members.length > 0 && (
                        <button type="button" onClick={() => setShowConfirm(true)} disabled={crediting} className="aw-btn aw-btn-danger aw-fade-in">
                            {crediting ? <RefreshCw size={13} className="aw-spin" /> : <Wallet size={13} />}
                            {crediting ? 'Crediting…' : `Credit ${preview.members.length} member(s) — ₹${fmt(totalToCredit)}`}
                        </button>
                    )}
                </div>
            </div>

            <div className="aw-content">
                <div className="aw-stack">
                    <section className="aw-card">
                        <div className="aw-card-head">
                            <span className="aw-card-icon"><Wallet size={14} /></span>
                            <h2 className="aw-card-title">Closing Year</h2>
                        </div>
                        <div style={{ width: 200 }}>
                            <label className="aw-label" htmlFor="dcr-year">Closing Year Code</label>
                            <input id="dcr-year" type="number" value={yearcode} onChange={(e) => setYearcode(Number(e.target.value))} className="aw-input" />
                        </div>
                    </section>

                    {error && (
                        <div className="aw-alert aw-alert-danger aw-fade-in" style={{ marginBottom: 0 }} role="alert">
                            <AlertCircle size={15} /><span>{error}</span>
                        </div>
                    )}

                    {creditResult && (
                        <div className="aw-stack aw-fade-in" style={{ gap: 8 }}>
                            <div className="aw-alert aw-alert-success" style={{ marginBottom: 0 }} role="status">
                                <CheckCircle2 size={15} /><span>Credited {creditResult.credited.length} member(s).</span>
                            </div>
                            {creditResult.failed.length > 0 && (
                                <div className="aw-alert aw-alert-danger" style={{ marginBottom: 0 }}>
                                    <AlertCircle size={15} />
                                    <span>{creditResult.failed.length} failed: {creditResult.failed.map((f) => `${f.mbno} (${f.error})`).join('; ')}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {!preview ? (
                        <section className="aw-card">
                            <div className="aw-empty" style={{ padding: 40 }}>
                                <Search size={28} />
                                <strong className="aw-strong">Set the closing year code, then click Preview.</strong>
                            </div>
                        </section>
                    ) : preview.previousCalculationYear === null ? (
                        <section className="aw-card">
                            <div className="aw-empty" style={{ padding: 40 }}>
                                <Wallet size={28} />
                                <strong className="aw-strong">No financial year exists before year code {yearcode} — there is nothing to credit yet.</strong>
                            </div>
                        </section>
                    ) : preview.members.length === 0 ? (
                        <section className="aw-card">
                            <div className="aw-empty" style={{ padding: 40 }}>
                                <Wallet size={28} />
                                <strong className="aw-strong">No uncredited dividend found for calculation year {preview.previousCalculationYear}.</strong>
                                <span className="aw-meta">Either it was never calculated (see Dividend Calculation), or it's already been credited.</span>
                            </div>
                        </section>
                    ) : (
                        <>
                            <div className="aw-stats aw-stats-3 aw-fade-in">
                                <div className="aw-stat aw-stat-left">
                                    <div className="aw-stat-label">Dividend calculated for FY</div>
                                    <div className="aw-stat-value">{preview.previousCalculationYear}</div>
                                </div>
                                <div className="aw-stat aw-stat-left" style={{ ['--aw-tone' as any]: 'var(--aw-info)' }}>
                                    <div className="aw-stat-label">Members</div>
                                    <div className="aw-stat-value">{preview.members.length}</div>
                                </div>
                                <div className="aw-stat aw-stat-left" style={{ ['--aw-tone' as any]: 'var(--aw-success)' }}>
                                    <div className="aw-stat-label">Total to Credit</div>
                                    <div className="aw-stat-value">₹{fmt(totalToCredit)}</div>
                                </div>
                            </div>

                            <section className="aw-card aw-fade-in">
                                <div className="aw-table-wrap" style={{ maxHeight: '50vh' }}>
                                    <table className="aw-table">
                                        <thead>
                                            <tr>
                                                <th>Member</th>
                                                <th className="is-right">Current Share Value</th>
                                                <th className="is-right">Dividend to Credit</th>
                                                <th className="is-right">New Share Value</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {preview.members.map((m) => (
                                                <tr key={m.mbno}>
                                                    <td>
                                                        <span style={{ color: 'var(--aw-accent)', fontWeight: 700 }}>{m.mbno}</span>
                                                        {m.memberName && <span className="aw-meta">{m.memberName}</span>}
                                                    </td>
                                                    <td className="is-right is-muted">₹{fmt(m.currentShareValue)}</td>
                                                    <td className="is-right is-success">+ ₹{fmt(m.dividendAmount)}</td>
                                                    <td className="is-right">₹{fmt(m.newShareValue)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </>
                    )}
                </div>
            </div>

            <div className="aw-footer">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Wallet size={12} /> Crediting is idempotent — a member already credited for this calculation year is skipped, never credited twice.
                </span>
            </div>

            <AwDialog
                open={showConfirm}
                title="Confirm dividend credit"
                icon={<AlertTriangle size={14} />}
                onClose={() => setShowConfirm(false)}
                maxWidth="28rem"
                compact
            >
                <div className="aw-stack">
                    <p className="aw-meta" style={{ lineHeight: 1.6 }}>
                        <AlertTriangle size={14} style={{ verticalAlign: 'text-bottom', marginRight: 4, color: 'var(--aw-warning)' }} />
                        This credits ₹{fmt(totalToCredit)} across {preview?.members.length ?? 0} member(s) into their Share Value, with a real ledger entry each. This cannot be undone from this screen.
                    </p>
                    <div className="aw-btn-row" style={{ justifyContent: 'flex-end' }}>
                        <button type="button" onClick={() => setShowConfirm(false)} className="aw-btn aw-btn-secondary">Cancel</button>
                        <button type="button" onClick={() => { setShowConfirm(false); commit(creditedBy); }} className="aw-btn aw-btn-danger">Yes, Credit Dividend</button>
                    </div>
                </div>
            </AwDialog>
        </div>
    );
};

export default DividendCredit;
