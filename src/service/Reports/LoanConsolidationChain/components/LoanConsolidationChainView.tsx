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
                <div className="aw-stack">
                    <p className="aw-meta">
                        Member <b>#{chain.mbno}</b> — {chain.loantype === 'ALN' ? 'Emergency Loan' : 'Regular Loan'} — {chain.chainLength} case{chain.chainLength === 1 ? '' : 's'} in this chain
                    </p>

                    {chain.links.map((link, i) => {
                        const prev = i > 0 ? chain.links[i - 1] : null;
                        const oldBalance = prev ? prev.contributedAtClosure ?? 0 : 0;

                        return (
                            <React.Fragment key={link.loancaseno}>
                                {i > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                        <ArrowDown size={16} style={{ color: 'var(--aw-muted)' }} />
                                        <span className="aw-pill tone-info">
                                            Settlement Amount from #{prev!.loancaseno}: ₹{fmt(oldBalance)} · Consolidated Loan Amount: ₹{fmt(link.loanAmt)}
                                        </span>
                                    </div>
                                )}
                                <section className="aw-card" style={link.isActive ? { borderColor: 'var(--aw-accent)', background: 'var(--aw-accent-soft)' } : undefined}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            {link.isActive
                                                ? <CheckCircle2 size={15} style={{ color: 'var(--aw-accent)' }} />
                                                : <GitMerge size={15} style={{ color: 'var(--aw-muted)' }} />}
                                            <span className="aw-strong">Case #{link.loancaseno}</span>
                                            {link.isActive && <span className="aw-pill tone-success">Active — current head</span>}
                                        </div>
                                        <span className="aw-meta">Disbursed {fmtDate(link.disbursementDate)}</span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                                        <div>
                                            <span className="aw-label">{i === 0 ? 'Original Sanctioned Amount' : 'Consolidated Loan Amount'}</span>
                                            <span className="aw-strong">₹{fmt(link.loanAmt)}</span>
                                        </div>
                                        <div>
                                            <span className="aw-label">{link.isActive ? 'Current Balance' : 'Settlement Amount'}</span>
                                            <span className="aw-strong" style={link.isActive ? { color: 'var(--aw-danger)' } : undefined}>
                                                ₹{fmt(link.isActive ? link.currentBalance : link.contributedAtClosure)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="aw-label">Status</span>
                                            <span className="aw-strong">
                                                {link.isActive
                                                    ? 'Open'
                                                    : <>Settled {fmtDate(link.closedDate)} → #{link.closedIntoLoancaseno}</>}
                                            </span>
                                        </div>
                                    </div>
                                </section>
                            </React.Fragment>
                        );
                    })}
                    {chain.chainLength > 1 && (
                        <p className="aw-meta">
                            Settlement Amount is the value used to close the earlier loan. Net Disbursement Amount is not shown here because the existing report response does not include the final payout after interest and other deductions.
                        </p>
                    )}
                </div>
            )}

        </ReportShell>
    );
};

export default LoanConsolidationChainView;
