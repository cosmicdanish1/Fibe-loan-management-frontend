import React, { useState, useCallback, useMemo } from 'react';
import {
  Calculator,
  TrendingUp,
  User,
  FileText,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Search,
  PieChart,
  ArrowRight,
  ShieldCheck,
  Database,
  ArrowUpRight,
  Printer,
  RefreshCw
} from 'lucide-react';
import {
  emiService,
  LoanData,
  EMIScheduleItem,
  EMIScheduleResponse
} from '../../../../services/emiService';
import MemberLookup from '../../../../components/shared/MemberLookup/MemberLookup';

const showDialog = async (type: 'info' | 'warning' | 'error', msg: string, detail: string): Promise<void> => {
  if ((window as any).electronAPI?.showMessageBox) {
    await (window as any).electronAPI.showMessageBox({ type, title: 'electron-react-ts', message: msg, detail, buttons: ['OK'], defaultId: 0 });
  } else { alert(`[${type.toUpperCase()}] ${msg}\n\n${detail}`); }
};

interface MemberData {
  memberNo: string;
  memberName: string;
  officeNo: number;
  wingNo?: string;
  officeName: string;
  basicPay?: string | number;
}

const EMIChart: React.FC = () => {
  const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
  const [memberLoans, setMemberLoans] = useState<LoanData[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<LoanData | null>(null);
  const [emiSchedule, setEmiSchedule] = useState<EMIScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [memberNumber, setMemberNumber] = useState('');
  const [showMemberLookup, setShowMemberLookup] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const itemsPerPage = 12;

  const handleMemberSelect = useCallback(async (member: any) => {
    const memberData: MemberData = {
      memberNo: member.memberNo, memberName: member.memberName || member.name,
      officeNo: member.officeNo, wingNo: member.wingNo, officeName: member.officeName, basicPay: member.basicPay
    };
    setSelectedMember(memberData); setMemberNumber(member.memberNo); setShowMemberLookup(false);
    setSelectedLoan(null); setEmiSchedule([]); setError(null);
    await fetchMemberLoans(member.memberNo);
  }, []);

  const handleMemberNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setMemberNumber(value);
    if (!value) { setSelectedMember(null); setMemberLoans([]); setSelectedLoan(null); setEmiSchedule([]); setError(null); }
  }, []);

  const fetchMemberLoans = useCallback(async (memberNo: string) => {
    setLoading(true); setError(null);
    try {
      const response = await emiService.getMemberLoans(memberNo);
      const allLoans = [...response.activeLoans, ...response.pendingLoans];
      setMemberLoans(allLoans);
      if (allLoans.length === 0) {
        setError(`No active loans found for member ${memberNo}.`);
        await showDialog('info', 'No Loans Found', `No active or pending loan cases were found for member ${memberNo}.`);
      }
    } catch {
      setError('Failed to fetch member loans.'); setMemberLoans([]);
      await showDialog('error', 'Lookup Failed', `Could not fetch loans for member ${memberNo}. Please check the connection and try again.`);
    }
    finally { setLoading(false); }
  }, []);

  const generateEMISchedule = useCallback(async (loan: LoanData) => {
    setLoading(true); setError(null);
    try {
      const response: EMIScheduleResponse = await emiService.getEMISchedule(loan.loanCaseNo);
      setEmiSchedule(response.schedule);
      setSelectedLoan({ ...loan, ...response.loanDetails });
    } catch { setError(`Consultation for ${loan.loanCaseNo} timed out.`); }
    finally { setLoading(false); }
  }, []);

  const handleLoanSelect = useCallback(async (loan: LoanData) => {
    setSelectedLoan(loan); setError(null);
    await generateEMISchedule(loan);
    setCurrentPage(1);
  }, [generateEMISchedule]);

  const formatCurrency = useMemo(() => (amount: number): string =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
  , []);

  const summaryStats = useMemo(() => {
    if (!selectedLoan || !emiSchedule.length) return null;
    const paid = emiSchedule.filter(i => i.status === 'Paid');
    const paidInstallments = paid.length;
    const pendingInstallments = emiSchedule.filter(i => i.status === 'Pending').length;
    const totalPrincipalPaid = paid.reduce((s, i) => s + i.principalAmount, 0);
    const completionPercentage = selectedLoan.noOfInstallments > 0 ? (paidInstallments / selectedLoan.noOfInstallments) * 100 : 0;
    return { paidInstallments, pendingInstallments, totalPrincipalPaid, completionPercentage };
  }, [selectedLoan, emiSchedule]);

  const paginatedSchedule = useMemo(() => emiSchedule.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [emiSchedule, currentPage]);
  const totalPages = useMemo(() => Math.ceil(emiSchedule.length / itemsPerPage), [emiSchedule.length]);

  // BUG FIX 48: this called emiService.exportEMISchedulePDF(), which hits
  // GET /loans/master/:caseNo/emi-schedule/export — a route that doesn't exist
  // anywhere in the backend (confirmed via full-repo grep), so this button always
  // failed. No PDF-generation library exists in this frontend, and no other
  // screen in the app calls a backend PDF endpoint either — every other
  // print/export button here (e.g. FixedDepositReceipt's handlePrint) just calls
  // window.print() on the already-rendered page. Matching that convention instead
  // of a backend feature that was never actually built.
  const handleExportPDF = useCallback(() => {
    if (!selectedLoan) return;
    window.print();
  }, [selectedLoan]);

  return (
    <div className="app-window">

      {/* Header */}
      <div className="aw-header aw-ambient aw-noprint">
        <div className="min-w-0">
          <h1 className="aw-title">
            EMI Intelligence <span className="aw-pill" style={{ verticalAlign: 'middle', marginLeft: 6 }}>PRO</span>
          </h1>
          <p className="aw-desc">Amortization &amp; Recovery Protocol</p>
        </div>
        <div className="aw-actions">
          {loading && (
            <span className="aw-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} role="status">
              <RefreshCw size={12} className="aw-spin" /> Loading...
            </span>
          )}
          <span className="aw-pill tone-success"><i className="aw-status-dot" style={{ background: 'var(--aw-success)' }} />System Online</span>
          <button type="button" onClick={() => window.close()} className="aw-icon-btn" aria-label="Close window" data-tip="Close window" data-tip-pos="bottom-end">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="aw-fit">
        <div className="aw-split aw-print-full">

          {/* Sidebar */}
          <aside className="aw-side aw-noprint">

            {/* Member Terminal */}
            <section className="aw-card">
              <div className="aw-card-head">
                <span className="aw-card-icon"><User size={14} /></span>
                <h2 className="aw-card-title">Member Terminal</h2>
              </div>
              <div className="aw-stack">
                <div className="aw-input-wrap has-action">
                  <input type="text" value={memberNumber} onChange={handleMemberNumberChange}
                    placeholder="Enter MB No" aria-label="Member number" className="aw-input" />
                  <button type="button" onClick={() => setShowMemberLookup(true)} className="aw-input-action" aria-label="Search members" data-tip="Search members" data-tip-pos="bottom-end">
                    <Search size={13} />
                  </button>
                </div>
                {selectedMember ? (
                  <div className="aw-panel aw-panel-accent aw-fade-in">
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div className="min-w-0">
                        <span className="aw-stat-label">Identified Member</span>
                        <p className="aw-strong" style={{ marginTop: 2 }}>{selectedMember.memberName}</p>
                      </div>
                      <ShieldCheck size={15} style={{ color: 'var(--aw-accent)', flex: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <span className="aw-meta">ID: {selectedMember.memberNo}</span>
                      <span className="aw-pill tone-success">Active</span>
                    </div>
                  </div>
                ) : (
                  <div className="aw-panel aw-panel-dashed">Awaiting member auth...</div>
                )}
              </div>
            </section>

            {/* Loan Matrix */}
            {selectedMember && memberLoans.length > 0 && (
              <section className="aw-stack aw-fade-in">
                <div className="aw-section-head">
                  <h3 className="aw-section-title">Active Liabilities</h3>
                  <span className="aw-pill tone-muted">{memberLoans.length} Cases</span>
                </div>
                <div className="aw-stack" style={{ maxHeight: '50vh', overflowY: 'auto', padding: '2px 4px 8px 2px' }}>
                  {memberLoans.map((loan) => (
                    <button type="button" key={loan.loanCaseNo} onClick={() => handleLoanSelect(loan)}
                      aria-pressed={selectedLoan?.loanCaseNo === loan.loanCaseNo} className="aw-choice">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span className="aw-strong" style={{ textTransform: 'uppercase' }}>{loan.loanCaseNo}</span>
                        <span className={`aw-pill ${loan.loanType === 'RLN' ? '' : 'tone-warning'}`}>{loan.loanType}</span>
                      </div>
                      <dl className="aw-facts">
                        <div>
                          <dt>Liability</dt>
                          <dd>{formatCurrency(loan.loanAmount)}</dd>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <dt>Balance</dt>
                          <dd style={{ color: 'var(--aw-danger)' }}>{formatCurrency(loan.balance)}</dd>
                        </div>
                      </dl>
                      <div className="aw-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--aw-border)' }}>
                        <span>Instal: {formatCurrency(loan.installmentAmount)}</span>
                        <ArrowRight size={13} />
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

          </aside>

          {/* Main Panel */}
          <section className="aw-side" style={{ paddingRight: 0 }}>

            {error && (
              <div className="aw-alert aw-alert-danger aw-fade-in" role="alert" style={{ marginBottom: 0 }}>
                <AlertCircle size={16} />
                <div>
                  <strong style={{ textTransform: 'uppercase' }}>Access Interrupted</strong>
                  <p style={{ marginTop: 2 }}>{error}</p>
                  <button type="button" onClick={() => selectedMember && fetchMemberLoans(selectedMember.memberNo)}
                    className="aw-btn aw-btn-ghost" style={{ marginTop: 6, padding: 0, color: 'inherit', minHeight: 0 }}>
                    <RefreshCw size={12} /> Retry Protocol
                  </button>
                </div>
              </div>
            )}

            {selectedLoan && summaryStats ? (
              <div className="aw-stack aw-fade-in">

                {/* Metrics */}
                <div className="aw-stats aw-stats-3">
                  <div className="aw-stat aw-stat-left">
                    <div className="aw-stat-head">
                      <PieChart size={14} />
                      <span className="aw-stat-label">Debt Clearance</span>
                    </div>
                    <div className="aw-stat-value">{summaryStats.completionPercentage.toFixed(1)}<small>%</small></div>
                    <div className="aw-bar" style={{ marginTop: 10 }} role="img" aria-label="Debt cleared">
                      <span style={{ width: `${summaryStats.completionPercentage}%` }} />
                    </div>
                  </div>
                  <div className="aw-stat aw-stat-left tone-success">
                    <div className="aw-stat-head">
                      <TrendingUp size={14} />
                      <span className="aw-stat-label">Cleared Principal</span>
                    </div>
                    <div className="aw-stat-value">{formatCurrency(summaryStats.totalPrincipalPaid)}</div>
                    <div className="aw-meta" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, color: 'var(--aw-success)' }}>
                      <ArrowUpRight size={12} /><span>Reduction relative to gross</span>
                    </div>
                  </div>
                  <div className="aw-stat aw-stat-left tone-danger">
                    <div className="aw-stat-head">
                      <Clock size={14} />
                      <span className="aw-stat-label">Residual Exposure</span>
                    </div>
                    <div className="aw-stat-value">{formatCurrency(selectedLoan.balance)}</div>
                    <div className="aw-meta" style={{ marginTop: 10 }}>
                      Awaiting Recovery ({summaryStats.pendingInstallments} inst.)
                    </div>
                  </div>
                </div>

                {/* Amortization Table */}
                <section className="aw-card aw-main" style={{ overflow: 'hidden' }}>
                  <div className="aw-main-head">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <span className="aw-card-icon"><FileText size={14} /></span>
                      <div>
                        <h3 className="aw-card-title">Amortization Ledger</h3>
                        <p className="aw-meta">Official Payment Manifest</p>
                      </div>
                    </div>
                    <button type="button" onClick={handleExportPDF} className="aw-btn aw-btn-secondary aw-noprint" data-tip="Print this schedule" data-tip-pos="bottom-end">
                      <Printer size={13} /> Official Printout
                    </button>
                  </div>

                  <div className="aw-main-body" style={{ padding: 0 }}>
                    <table className="aw-table">
                      <thead>
                        <tr>
                          {['Seq', 'Due Date', 'Installment', 'Principal', 'Interest', 'Balance', 'Status'].map((h, i) => (
                            <th key={h} className={i >= 2 && i <= 5 ? 'is-right' : i === 6 ? 'is-center' : ''}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedSchedule.map((item) => (
                          <tr key={item.month}>
                            <td className="is-muted">#{item.month.toString().padStart(2, '0')}</td>
                            <td>{item.dueDate}</td>
                            <td className="is-right">{formatCurrency(item.emiAmount)}</td>
                            <td className="is-right is-accent">{formatCurrency(item.principalAmount)}</td>
                            <td className="is-right is-warning">{formatCurrency(item.interestAmount)}</td>
                            <td className="is-right">{formatCurrency(item.balance)}</td>
                            <td className="is-center">
                              <span className={`aw-pill ${item.status === 'Paid' ? 'tone-success' : item.status === 'Overdue' ? 'tone-danger' : 'tone-muted'}`} style={{ textTransform: 'uppercase' }}>
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="aw-main-foot aw-noprint">
                      <span>
                        {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, emiSchedule.length)} of {emiSchedule.length}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button type="button" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
                          className="aw-btn aw-btn-secondary" style={{ padding: '0 8px' }} aria-label="Previous page" data-tip="Previous page" data-tip-pos="top-end">
                          <ChevronLeft size={15} />
                        </button>
                        <span className="aw-strong" style={{ fontVariantNumeric: 'tabular-nums' }}>{currentPage} / {totalPages}</span>
                        <button type="button" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}
                          className="aw-btn aw-btn-secondary" style={{ padding: '0 8px' }} aria-label="Next page" data-tip="Next page" data-tip-pos="top-end">
                          <ChevronRight size={15} />
                        </button>
                      </div>
                    </div>
                  )}
                </section>

              </div>
            ) : (
              <section className="aw-card" style={{ flex: 1, justifyContent: 'center' }}>
                <div className="aw-empty">
                  <Calculator size={40} />
                  <strong className="aw-strong">Intelligence Module Idle</strong>
                  <span style={{ maxWidth: '22rem' }}>Select member and liability case to generate amortization schedule</span>
                  <div className="aw-tiles">
                    {[{ icon: User, label: 'Member Profile' }, { icon: Database, label: 'Master Sync' }, { icon: TrendingUp, label: 'Projection Logic' }, { icon: Printer, label: 'Secure Export' }].map(({ icon: Icon, label }) => (
                      <div key={label}>
                        <Icon size={15} />
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

          </section>
        </div>
      </div>

      {/* Footer */}
      <div className="aw-footer aw-noprint">
        <span>Matrix v4.2.0 • Secured Amortization Engine</span>
        <span>Documentation • Support</span>
      </div>

      {/* Member Lookup Modal */}
      {showMemberLookup && (
        <div className="aw-modal-backdrop" onClick={() => setShowMemberLookup(false)}>
          <div className="aw-modal" role="dialog" aria-modal="true" aria-label="Select Member" onClick={(e) => e.stopPropagation()}>
            <div className="aw-modal-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="aw-card-icon"><User size={14} /></span>
                <div>
                  <h3 className="aw-card-title">Select Member</h3>
                  <p className="aw-meta">Cross-referencing Global Ledger</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowMemberLookup(false)} className="aw-icon-btn" aria-label="Close">
                <X size={15} />
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <MemberLookup isModal={true} onSelect={handleMemberSelect} onClose={() => setShowMemberLookup(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EMIChart;
