import React from 'react';
import { Calculator, CheckCircle2, Camera } from 'lucide-react';
import { useDividendCalculation } from '../hooks/useDividendCalculation';

const fmt = (n: number) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DividendCalculation: React.FC = () => {
    const {
        yearcode, setYearcode, dividendRate, setDividendRate,
        preview, loading, committing, commitResult, error,
        loadPreview, commit,
        snapMonth, setSnapMonth, snapYear, setSnapYear, snapshotting, snapshotMessage, captureSnapshot,
    } = useDividendCalculation();

    const totalDividend = preview ? preview.members.reduce((sum, m) => sum + m.dividendAmount, 0) : 0;
    const incompleteCount = preview ? preview.members.filter((m) => m.monthsFound < m.monthsExpected).length : 0;

    return (
        <div className="flex flex-col h-full overflow-hidden" style={{ background: '#f4f5f7', color: '#1a1d29', fontSize: 13 }}>
            <div className="flex items-center justify-between px-5 py-2.5 shrink-0" style={{ background: '#161822', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-baseline gap-2.5">
                    <h1 className="m-0 font-semibold text-white" style={{ fontSize: 15 }}>Dividend Calculation</h1>
                    <span style={{ fontSize: 11.5, color: '#9296a8' }}>
                        Total Product × Approved Rate ÷ 1200 — writes dividend_master only, never touches Share Value
                    </span>
                </div>
            </div>

            {/* Monthly snapshot capture */}
            <div className="flex items-center gap-3 px-5 py-2.5 shrink-0" style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a' }}>
                <Camera size={14} style={{ color: '#92400e', flexShrink: 0 }} />
                <span style={{ fontSize: 11.5, color: '#92400e' }}>Capture this month's Share Capital snapshot (run once per month):</span>
                <select
                    value={snapMonth}
                    onChange={(e) => setSnapMonth(Number(e.target.value))}
                    style={{ fontSize: 12, padding: '4px 6px', border: '1px solid #fde68a', borderRadius: 5 }}
                >
                    {MONTH_NAMES.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
                <input
                    type="number" value={snapYear} onChange={(e) => setSnapYear(Number(e.target.value))}
                    style={{ fontSize: 12, padding: '4px 6px', border: '1px solid #fde68a', borderRadius: 5, width: 80 }}
                />
                <button
                    onClick={captureSnapshot}
                    disabled={snapshotting}
                    style={{ fontSize: 11.5, fontWeight: 600, padding: '5px 12px', border: 'none', borderRadius: 5, background: '#b45309', color: '#fff', cursor: snapshotting ? 'not-allowed' : 'pointer', opacity: snapshotting ? 0.6 : 1 }}
                >
                    {snapshotting ? 'Capturing…' : 'Capture Snapshot'}
                </button>
                {snapshotMessage && <span style={{ fontSize: 11.5, color: '#92400e' }}>{snapshotMessage}</span>}
            </div>

            {/* Calculation controls */}
            <div className="flex items-center gap-3 px-5 py-2.5 shrink-0" style={{ background: '#fff', borderBottom: '1px solid #e4e6eb' }}>
                <label style={{ fontSize: 12, color: '#4b5160' }}>Year Code</label>
                <input
                    type="number" value={yearcode} onChange={(e) => setYearcode(Number(e.target.value))}
                    style={{ fontSize: 12, padding: '5px 8px', border: '1px solid #d7dae0', borderRadius: 5, width: 70 }}
                />
                <label style={{ fontSize: 12, color: '#4b5160' }}>Dividend Rate (%)</label>
                <input
                    type="number" value={dividendRate} onChange={(e) => setDividendRate(Number(e.target.value))}
                    style={{ fontSize: 12, padding: '5px 8px', border: '1px solid #d7dae0', borderRadius: 5, width: 70 }}
                />
                <button
                    onClick={loadPreview}
                    disabled={loading}
                    style={{ fontSize: 12, fontWeight: 600, padding: '6px 14px', border: 'none', borderRadius: 6, background: '#161822', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
                >
                    {loading ? 'Calculating…' : 'Preview'}
                </button>
                {preview && preview.members.length > 0 && (
                    <button
                        onClick={commit}
                        disabled={committing}
                        style={{ fontSize: 12, fontWeight: 600, padding: '6px 14px', border: 'none', borderRadius: 6, background: '#5b21b6', color: '#fff', cursor: committing ? 'not-allowed' : 'pointer', opacity: committing ? 0.6 : 1, marginLeft: 'auto' }}
                    >
                        {committing ? 'Committing…' : `Commit for ${preview.members.length} member(s)`}
                    </button>
                )}
            </div>

            {error && (
                <div className="px-5 py-2 shrink-0" style={{ background: '#fef2f2', color: '#b91c1c', fontSize: 12, borderBottom: '1px solid #fecaca' }}>
                    {error}
                </div>
            )}

            {commitResult && (
                <div className="flex items-center gap-2 px-5 py-2 shrink-0" style={{ background: '#f0fdf4', color: '#15803d', fontSize: 12, borderBottom: '1px solid #bbf7d0' }}>
                    <CheckCircle2 size={14} />
                    Committed dividend calculation for FY {commitResult.calculationYear} — {commitResult.membersCommitted} member(s). Not yet credited to Share Value (that happens at the following year's close).
                </div>
            )}

            <div className="flex-1 overflow-auto px-5 py-3">
                {!preview ? (
                    <div className="flex items-center justify-center" style={{ height: 200, color: '#8b90a0' }}>
                        Set a year code and rate, then click Preview.
                    </div>
                ) : preview.members.length === 0 ? (
                    <div className="flex items-center justify-center" style={{ height: 200, color: '#8b90a0' }}>
                        No Share Capital snapshots found for FY {preview.calculationYear}-{String(preview.calculationYear + 1).slice(2)}. Capture at least one month above first.
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-4 mb-2.5" style={{ fontSize: 12 }}>
                            <span>Calculation Year: <b>{preview.calculationYear}</b></span>
                            <span>Members: <b>{preview.members.length}</b></span>
                            <span>Total Dividend: <b>₹{fmt(totalDividend)}</b></span>
                            {incompleteCount > 0 && (
                                <span style={{ color: '#b45309' }}>
                                    {incompleteCount} member(s) missing month(s) — Total Product may be understated
                                </span>
                            )}
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', border: '1px solid #e4e6eb', borderRadius: 8 }}>
                            <thead>
                                <tr>
                                    {['Member', 'Total Product', 'Months', 'Rate', 'Dividend Amount'].map((h) => (
                                        <th key={h} style={{ textAlign: 'left', fontSize: 10.5, fontWeight: 600, color: '#8b90a0', padding: '8px 10px', borderBottom: '1px solid #eceef1', background: '#f7f8fa' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {preview.members.map((m) => {
                                    const incomplete = m.monthsFound < m.monthsExpected;
                                    return (
                                        <tr key={m.mbno}>
                                            <td style={{ fontSize: 12, padding: '8px 10px', borderBottom: '1px solid #f2f3f5' }}>
                                                <div style={{ fontWeight: 600 }}>{m.mbno}</div>
                                                {m.memberName && <div style={{ fontSize: 11, color: '#8b90a0' }}>{m.memberName}</div>}
                                            </td>
                                            <td style={{ fontSize: 12, padding: '8px 10px', borderBottom: '1px solid #f2f3f5' }}>₹{fmt(m.totalProduct)}</td>
                                            <td style={{ fontSize: 12, padding: '8px 10px', borderBottom: '1px solid #f2f3f5', color: incomplete ? '#b45309' : '#1a1d29' }}>
                                                {m.monthsFound} / {m.monthsExpected}
                                            </td>
                                            <td style={{ fontSize: 12, padding: '8px 10px', borderBottom: '1px solid #f2f3f5' }}>{m.dividendRate}%</td>
                                            <td style={{ fontSize: 12, fontWeight: 600, padding: '8px 10px', borderBottom: '1px solid #f2f3f5' }}>₹{fmt(m.dividendAmount)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </>
                )}
            </div>

            <div className="flex items-center gap-1.5 px-5 py-2 shrink-0" style={{ background: '#fff', borderTop: '1px solid #e4e6eb', fontSize: 11, color: '#8b90a0' }}>
                <Calculator size={11} /> Committing here only records the calculation — crediting it into member Share Value is a separate step (Dividend Credit), run at the following year's close.
            </div>
        </div>
    );
};

export default DividendCalculation;
