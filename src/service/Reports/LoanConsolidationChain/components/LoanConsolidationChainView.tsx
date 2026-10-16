import React from 'react';
import { Search, RotateCcw, ArrowDown, GitMerge, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { useLoanConsolidationChain } from '../hooks/useLoanConsolidationChain';
import { ReportShell, ParamCard, ReportEmpty } from '../../../../components/reports/views/ReportShell';
import ReportViewSwitcher from '../../../../components/reports/views/ReportViewSwitcher';
import { useReportViews } from '../../../../components/reports/views/reportViews';
import '../../../../components/reports/views/proViews.css';
import ChainBento from './ChainBento';
import MemberField from '../../../../components/shared/kit/MemberField';

type Props = ReturnType<typeof useLoanConsolidationChain>;

const REPORT_ID = 'account.consolidation-chain';

const fmt = (n: number | null | undefined) =>
    n === null || n === undefined ? '—' : Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const LoanConsolidationChainView: React.FC<Props> = ({
    mbno, setMbno, loancaseno, setLoancaseno, loantype, setLoantype,
    chain, loading, error, fetchChain, reset,
    memberLoans, loansLoading, loadMemberLoans, selectLoan,
}) => {
    const { enabled, view, setView } = useReportViews(REPORT_ID);

    return (
        <ReportShell
            className="lcc-root"
            title="Loan Consolidation Chain"
            desc="Full history of each loan settlement and successor loan in the consolidation chain"
            switcher={chain ? <ReportViewSwitcher enabled={enabled} value={view} onChange={setView} /> : null}
            actions={<button type="button" className="aw-btn aw-btn-ghost" onClick={reset}><RotateCcw size={14} /> Reset</button>}
            asideWidth={300}
            aside={
                <ParamCard title="Find a chain" icon={<GitMerge size={14} />}>
                    <div>
                        <label className="aw-label" htmlFor="lcc-mb">Member No.</label>
                        {/* Picking a member (or pressing Enter) lists their loans and shows the current one's chain. */}
                        <MemberField id="lcc-mb" value={mbno} onChange={setMbno}
                            onSelect={(m: any) => { const no = String(m.memberNo || m.mbno || ''); setMbno(no); void loadMemberLoans(no); }}
                            onSubmit={v => { void loadMemberLoans(v); }} />
                    </div>
                    {(memberLoans.length > 0 || loansLoading) && (
                        <div>
                            <label className="aw-label" htmlFor="lcc-loans">Member's loans</label>
                            <select
                                id="lcc-loans" className="aw-input" disabled={loansLoading}
                                value={`${loantype}-${loancaseno}`}
                                onChange={e => { const l = memberLoans.find(x => `${x.loantype}-${x.loancaseno}` === e.target.value); if (l) selectLoan(l); }}
                            >
                                {loansLoading && <option>Loading loans…</option>}
                                {memberLoans.map(l => (
                                    <option key={`${l.loantype}-${l.loancaseno}`} value={`${l.loantype}-${l.loancaseno}`}>
                                        {l.loantype} #{l.loancaseno} · {l.balance > 0 && !l.consolidatedInto ? `open ₹${fmt(l.balance)}` : l.consolidatedInto ? `settled into #${l.consolidatedInto}` : 'closed'}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="aw-label" htmlFor="lcc-case">Loan case no. (any case in the chain)</label>
                        <input id="lcc-case" type="text" value={loancaseno} onChange={e => setLoancaseno(e.target.value)} className="aw-input"
                            onKeyDown={e => { if (e.key === 'Enter' && mbno && loancaseno) fetchChain(); }} />
                    </div>
                    <div>
                        <label className="aw-label" htmlFor="lcc-type">Loan type</label>
                        <select id="lcc-type" value={loantype} onChange={e => setLoantype(e.target.value as 'RLN' | 'ALN')} className="aw-input">
                            <option value="ALN">Emergency Loan (ALN)</option>
                            <option value="RLN">Regular Loan (RLN)</option>
                        </select>
                    </div>
                    <button type="button" onClick={fetchChain} disabled={loading || !mbno || !loancaseno} className="aw-btn aw-btn-primary" style={{ width: '100%' }}>
                        <Search size={14} className={loading ? 'aw-spin' : undefined} /> {loading ? 'Loading…' : 'Show chain'}
                    </button>
                    {error && (
                        <div className="aw-alert aw-alert-danger" role="alert"><AlertTriangle size={14} /><div>{error}</div></div>
                    )}
                </ParamCard>
            }
            footerLeft="Loan Consolidation Chain"
            footerRight={chain ? `Member ${chain.mbno}` : ''}
        >
            {!chain ? (
                <ReportEmpty icon={<GitMerge size={34} />} title={loading ? 'Loading chain…' : 'No chain shown'} hint="Enter a member and loan case number to see its full consolidation history." />
            ) : view === 'bento' ? (
                <ChainBento chain={chain} />
            ) : (
                /* Legacy view: the chain, exactly as before */
                <div className="flex flex-col" style={{ gap: 0 }}>
                    <div style={{ fontSize: 12, color: 'var(--aw-muted)', marginBottom: 14 }}>
                        Member <b>#{chain.mbno}</b> — {chain.loantype === 'ALN' ? 'Emergency Loan' : 'Regular Loan'} — {chain.chainLength} case{chain.chainLength === 1 ? '' : 's'} in this chain
                    </div>

                    {chain.links.map((link, i) => {
                        const prev = i > 0 ? chain.links[i - 1] : null;
                        const oldBalance = prev ? prev.contributedAtClosure ?? 0 : 0;

                        return (
                            <React.Fragment key={link.loancaseno}>
                                {i > 0 && (
                                    <div className="flex flex-col items-center" style={{ padding: '4px 0' }}>
                                        <ArrowDown size={16} style={{ color: '#8b90a0' }} />
                                        <div style={{
                                            fontSize: 11.5, color: '#2563a8', background: '#eef5fc', border: '1px solid #bcd7ef',
                                            borderRadius: 6, padding: '6px 12px', margin: '2px 0', fontFamily: "'IBM Plex Mono', monospace",
                                        }}>
                                            Settlement Amount from #{prev!.loancaseno}: ₹{fmt(oldBalance)} · Consolidated Loan Amount: ₹{fmt(link.loanAmt)}
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
                                            <div className="lcc-stat-label">{i === 0 ? 'Original Sanctioned Amount' : 'Consolidated Loan Amount'}</div>
                                            <div className="lcc-stat-value">₹{fmt(link.loanAmt)}</div>
                                        </div>
                                        <div className="lcc-stat">
                                            <div className="lcc-stat-label">{link.isActive ? 'Current Balance' : 'Settlement Amount'}</div>
                                            <div className="lcc-stat-value" style={{ color: link.isActive ? '#dc2626' : '#1a1d29' }}>
                                                ₹{fmt(link.isActive ? link.currentBalance : link.contributedAtClosure)}
                                            </div>
                                        </div>
                                        <div className="lcc-stat">
                                            <div className="lcc-stat-label">Status</div>
                                            <div className="lcc-stat-value" style={{ fontSize: 12.5 }}>
                                                {link.isActive
                                                    ? 'Open'
                                                    : <>Settled {fmtDate(link.closedDate)} → #{link.closedIntoLoancaseno}</>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </React.Fragment>
                        );
                    })}
                    {chain.chainLength > 1 && (
                        <p style={{ margin: '14px 0 0', fontSize: 11.5, color: 'var(--aw-muted)', lineHeight: 1.5 }}>
                            Settlement Amount is the value used to close the earlier loan. Net Disbursement Amount is not shown here because the existing report response does not include the final payout after interest and other deductions.
                        </p>
                    )}
                </div>
            )}

            <style>{`
                .lcc-stat-label { font-size: 10.5px; color: #8b90a0; margin-bottom: 3px; }
                .lcc-stat-value { font-size: 13.5px; font-weight: 600; color: #1a1d29; }

                html.dark .lcc-stat-label { color: #8e8e93 !important; }
                html.dark .lcc-stat-value { color: #f5f5f7 !important; }
                html.dark .lcc-node[style*="background: rgb(255, 255, 255)"],
                html.dark .lcc-node[style*="background:#fff"] { background: #1c1c1e !important; border-color: rgba(255,255,255,.12) !important; }
                html.dark .lcc-node[style*="background: #f2edfb"] { background: rgba(167,139,250,.14) !important; border-color: rgba(167,139,250,.5) !important; }
            `}</style>
        </ReportShell>
    );
};

export default LoanConsolidationChainView;
