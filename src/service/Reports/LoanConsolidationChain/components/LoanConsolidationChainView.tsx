import React from 'react';
import { Search, RefreshCw, ArrowDown, GitMerge, CheckCircle2 } from 'lucide-react';
import type { useLoanConsolidationChain } from '../hooks/useLoanConsolidationChain';

type Props = ReturnType<typeof useLoanConsolidationChain>;

const fmt = (n: number | null | undefined) =>
    n === null || n === undefined ? '—' : Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const LoanConsolidationChainView: React.FC<Props> = ({
    mbno, setMbno, loancaseno, setLoancaseno, loantype, setLoantype,
    chain, loading, error, fetchChain, reset,
}) => {
    return (
        <div className="lcc-root flex flex-col h-full overflow-hidden" style={{ background: '#f4f5f7', color: '#1a1d29', fontSize: 13 }}>

            {/* Header */}
            <div className="lcc-header flex items-center justify-between px-5 py-2.5 shrink-0" style={{ background: '#161822', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-baseline gap-2.5">
                    <h1 className="m-0 font-semibold text-white" style={{ fontSize: 15 }}>Loan Consolidation Chain</h1>
                    <span style={{ fontSize: 11.5, color: '#9296a8' }}>
                        Full multi-hop history — every absorbed loan, before-and-after balance at each step
                    </span>
                </div>
                <button onClick={reset} className="lcc-ghost-btn flex items-center gap-1.5"
                    style={{ fontSize: 12, fontWeight: 500, padding: '5px 12px', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 6, background: 'transparent', color: '#d7d9e3', cursor: 'pointer' }}>
                    <RefreshCw size={12} /> Reset
                </button>
            </div>

            <div className="flex gap-3.5 p-3.5 flex-1 overflow-auto items-start">

                {/* Search card */}
                <div className="lcc-card" style={{ width: 300, flexShrink: 0, background: '#fff', border: '1px solid #e4e6eb', borderRadius: 8, padding: 14 }}>
                    <div className="lcc-section-label">Find a Chain</div>
                    <div className="flex flex-col gap-2.5">
                        <div>
                            <label className="lcc-field-label">Member No.</label>
                            <input type="text" value={mbno} onChange={e => setMbno(e.target.value)} className="lcc-input" style={{ width: '100%' }} />
                        </div>
                        <div>
                            <label className="lcc-field-label">Loan Case No. (any case in the chain)</label>
                            <input type="text" value={loancaseno} onChange={e => setLoancaseno(e.target.value)} className="lcc-input" style={{ width: '100%' }} />
                        </div>
                        <div>
                            <label className="lcc-field-label">Loan Type</label>
                            <select value={loantype} onChange={e => setLoantype(e.target.value as 'RLN' | 'ALN')} className="lcc-input" style={{ width: '100%' }}>
                                <option value="ALN">Emergency Loan (ALN)</option>
                                <option value="RLN">Regular Loan (RLN)</option>
                            </select>
                        </div>
                        <button
                            onClick={fetchChain}
                            disabled={loading || !mbno || !loancaseno}
                            className="lcc-btn-primary flex items-center justify-center gap-1.5"
                            style={{ width: '100%', padding: '8px 0' }}
                        >
                            <Search size={13} /> {loading ? 'Loading…' : 'Show Chain'}
                        </button>
                        {error && (
                            <div style={{ padding: '8px 10px', borderRadius: 6, fontSize: 12, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                                {error}
                            </div>
                        )}
                    </div>
                </div>

                {/* Chain display */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    {!chain ? (
                        <div className="flex items-center justify-center" style={{ height: 200, color: '#8b90a0', fontSize: 13 }}>
                            {loading ? 'Loading chain…' : 'Enter a member and loan case number to see its full consolidation history.'}
                        </div>
                    ) : (
                        <div className="flex flex-col" style={{ gap: 0 }}>
                            <div style={{ fontSize: 12, color: '#5b6072', marginBottom: 14 }}>
                                Member <b>#{chain.mbno}</b> — {chain.loantype === 'ALN' ? 'Emergency Loan' : 'Regular Loan'} — {chain.chainLength} case{chain.chainLength === 1 ? '' : 's'} in this chain
                            </div>

                            {chain.links.map((link, i) => {
                                const prev = i > 0 ? chain.links[i - 1] : null;
                                const oldBalance = prev ? prev.contributedAtClosure ?? 0 : 0;
                                const newSanctioned = prev ? Math.max(0, link.loanAmt - oldBalance) : link.loanAmt;

                                return (
                                    <React.Fragment key={link.loancaseno}>
                                        {i > 0 && (
                                            <div className="flex flex-col items-center" style={{ padding: '4px 0' }}>
                                                <ArrowDown size={16} style={{ color: '#8b90a0' }} />
                                                <div style={{
                                                    fontSize: 11.5, color: '#2563a8', background: '#eef5fc', border: '1px solid #bcd7ef',
                                                    borderRadius: 6, padding: '6px 12px', margin: '2px 0', fontFamily: "'IBM Plex Mono', monospace",
                                                }}>
                                                    ₹{fmt(oldBalance)} (from #{prev!.loancaseno}) + ₹{fmt(newSanctioned)} (new) = ₹{fmt(link.loanAmt)}
                                                </div>
                                            </div>
                                        )}
                                        <div
                                            className="lcc-node"
                                            style={{
                                                background: link.isActive ? '#f2edfb' : '#fff',
                                                border: `1.5px solid ${link.isActive ? '#7c3aed' : '#e4e6eb'}`,
                                                borderRadius: 10, padding: '14px 16px',
                                            }}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    {link.isActive
                                                        ? <CheckCircle2 size={15} style={{ color: '#7c3aed' }} />
                                                        : <GitMerge size={15} style={{ color: '#8b90a0' }} />}
                                                    <span style={{ fontSize: 13.5, fontWeight: 700, color: link.isActive ? '#4c1d95' : '#1a1d29' }}>
                                                        Case #{link.loancaseno}
                                                    </span>
                                                    {link.isActive && (
                                                        <span style={{ fontSize: 10.5, fontWeight: 600, color: '#7c3aed', background: '#e9e0fb', borderRadius: 20, padding: '2px 9px' }}>
                                                            ACTIVE — current head
                                                        </span>
                                                    )}
                                                </div>
                                                <span style={{ fontSize: 11.5, color: '#8b90a0' }}>Disbursed {fmtDate(link.disbursementDate)}</span>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                                                <div className="lcc-stat">
                                                    <div className="lcc-stat-label">{i === 0 ? 'Original Amount' : 'Combined Principal (after this consolidation)'}</div>
                                                    <div className="lcc-stat-value">₹{fmt(link.loanAmt)}</div>
                                                </div>
                                                <div className="lcc-stat">
                                                    <div className="lcc-stat-label">{link.isActive ? 'Current Balance' : 'Balance at Closure'}</div>
                                                    <div className="lcc-stat-value" style={{ color: link.isActive ? '#dc2626' : '#1a1d29' }}>
                                                        ₹{fmt(link.isActive ? link.currentBalance : link.contributedAtClosure)}
                                                    </div>
                                                </div>
                                                <div className="lcc-stat">
                                                    <div className="lcc-stat-label">Status</div>
                                                    <div className="lcc-stat-value" style={{ fontSize: 12.5 }}>
                                                        {link.isActive
                                                            ? 'Open'
                                                            : <>Closed {fmtDate(link.closedDate)} → #{link.closedIntoLoancaseno}</>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .lcc-section-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; color: #6b7280; margin-bottom: 8px; }
                .lcc-field-label { display: block; font-size: 11px; color: #8b90a0; margin-bottom: 4px; }
                .lcc-input { font-size: 12.5px; padding: 6px 8px; border: 1px solid #d7dae0; border-radius: 6px; outline: none; color: #1a1d29; background: #fff; }
                .lcc-input:focus { border-color: #7c3aed; }
                .lcc-btn-primary { font-size: 12.5px; font-weight: 600; padding: 8px 12px; border: none; border-radius: 6px; background: #5b21b6; color: #fff; cursor: pointer; }
                .lcc-btn-primary:hover:not(:disabled) { background: #4c1d95; }
                .lcc-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
                .lcc-ghost-btn:hover { background: rgba(255,255,255,0.08) !important; }
                .lcc-stat-label { font-size: 10.5px; color: #8b90a0; margin-bottom: 3px; }
                .lcc-stat-value { font-size: 13.5px; font-weight: 600; color: #1a1d29; }

                html.dark .lcc-root { background: #000 !important; color: #f5f5f7 !important; }
                html.dark .lcc-header { background: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; }
                html.dark .lcc-card { background: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
                html.dark .lcc-input { background: rgba(255,255,255,.05) !important; color: #f5f5f7 !important; border-color: rgba(255,255,255,.08) !important; }
                html.dark .lcc-section-label, html.dark .lcc-field-label, html.dark .lcc-stat-label { color: #8e8e93 !important; }
                html.dark .lcc-stat-value { color: #f5f5f7 !important; }
                html.dark .lcc-node[style*="background: rgb(255, 255, 255)"],
                html.dark .lcc-node[style*="background:#fff"] { background: #1c1c1e !important; border-color: rgba(255,255,255,.12) !important; }
                html.dark .lcc-node[style*="background: #f2edfb"] { background: rgba(167,139,250,.14) !important; border-color: rgba(167,139,250,.5) !important; }
            `}</style>
        </div>
    );
};

export default LoanConsolidationChainView;
