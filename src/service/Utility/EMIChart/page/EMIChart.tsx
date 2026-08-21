import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calculator,
  Download,
  TrendingUp,
  IndianRupee,
  Calendar,
  User,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  X,
  Search,
  PieChart,
  ArrowRight,
  ShieldCheck,
  Info,
  Building2,
  Database,
  ArrowUpRight,
  Printer,
  RefreshCw
} from 'lucide-react';
import { ConfigProvider, Spin } from 'antd';
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
    <ConfigProvider theme={{ token: { colorPrimary: '#6366f1', borderRadius: 6, fontFamily: 'Inter, system-ui, sans-serif' } }}>
      <div className="h-screen flex flex-col bg-[#f5f6fa] font-sans overflow-hidden text-slate-900">

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-3 py-2 flex items-center justify-between shrink-0 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg border border-indigo-400/50 bg-indigo-600">
              <Calculator size={13} className="text-white" />
            </div>
            <div>
              <h1 className="fz-caption font-black text-white tracking-wider uppercase leading-none">
                EMI Intelligence <span className="px-1 py-0.5 bg-white/10 fz-micro rounded-full border border-white/20 align-middle">PRO</span>
              </h1>
              <p className="fz-micro font-bold text-indigo-300 uppercase tracking-widest mt-0.5">Amortization &amp; Recovery Protocol</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 bg-slate-700/50 px-1.5 py-0.5 rounded-lg border border-white/10">
              <div className="w-1 h-1 bg-slate-400 rounded-full animate-pulse" />
              <span className="fz-micro font-black text-slate-300 uppercase">System Online</span>
            </div>
            <button onClick={() => window.close()} className="p-1 text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all">
              <X size={12} />
            </button>
          </div>
        </div>

        {/* Body */}
        <Spin spinning={loading} tip="Loading...">
          <div className="flex-1 overflow-hidden p-2">
            <div className="h-full grid grid-cols-12 gap-2">

              {/* Sidebar */}
              <aside className="col-span-3 space-y-2 overflow-y-auto">

                {/* Member Terminal */}
                <div className="bg-slate-900 rounded-xl p-2.5 shadow-xl">
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="p-1 bg-white/10 rounded-lg"><User className="text-indigo-400" size={11} /></div>
                    <h2 className="text-white font-black fz-tiny uppercase tracking-wider">Member Terminal</h2>
                  </div>
                  <div className="space-y-1.5">
                    <div className="relative">
                      <input type="text" value={memberNumber} onChange={handleMemberNumberChange}
                        placeholder="ENTER MB NO"
                        className="w-full bg-slate-800 border-2 border-slate-700 rounded-lg px-2 py-1 text-white font-bold fz-tiny outline-none focus:border-slate-600 placeholder:text-slate-600 uppercase tracking-widest h-6 pr-8" />
                      <button onClick={() => setShowMemberLookup(true)}
                        className="absolute right-1 top-1 p-1 bg-slate-700 hover:bg-slate-600 text-white rounded transition-all">
                        <Search size={9} />
                      </button>
                    </div>
                    {selectedMember ? (
                      <div className="bg-slate-700 text-white p-2 rounded-lg space-y-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="fz-micro font-black text-slate-400 uppercase">Identified Member</p>
                            <h3 className="font-black fz-tiny leading-tight mt-0.5">{selectedMember.memberName}</h3>
                          </div>
                          <ShieldCheck size={10} className="text-white" />
                        </div>
                        <div className="pt-1 border-t border-white/10 flex justify-between fz-mini font-bold">
                          <span className="text-slate-400">ID: {selectedMember.memberNo}</span>
                          <span className="bg-white/10 px-1 rounded fz-micro uppercase">Active</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-800/50 border border-dashed border-slate-700/50 rounded-lg p-2 text-center">
                        <p className="fz-mini font-black text-slate-500 uppercase italic">Awaiting member auth...</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Loan Matrix */}
                {selectedMember && memberLoans.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="fz-mini font-black text-slate-400 uppercase tracking-widest">Active Liabilities</h3>
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-600 fz-mini font-black rounded-full uppercase">{memberLoans.length} Cases</span>
                    </div>
                    <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-0.5">
                      {memberLoans.map((loan) => (
                        <div key={loan.loanCaseNo} onClick={() => handleLoanSelect(loan)}
                          className={`p-2.5 rounded-xl cursor-pointer transition-all border-2 ${selectedLoan?.loanCaseNo === loan.loanCaseNo
                            ? 'bg-white border-indigo-600 shadow-lg ring-2 ring-indigo-50'
                            : 'bg-white border-transparent hover:border-slate-200 shadow-sm'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="fz-small font-black text-slate-900 uppercase">{loan.loanCaseNo}</span>
                            <span className={`px-1.5 py-0.5 rounded-full fz-micro font-black uppercase border ${loan.loanType === 'RLN' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                              {loan.loanType}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 fz-tiny">
                            <div>
                              <p className="text-slate-400 uppercase fz-micro">Liability</p>
                              <p className="font-bold text-slate-700">{formatCurrency(loan.loanAmount)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-slate-400 uppercase fz-micro">Balance</p>
                              <p className="font-bold text-rose-600">{formatCurrency(loan.balance)}</p>
                            </div>
                            <div className="col-span-2 pt-1.5 border-t border-slate-50 flex justify-between fz-tiny font-black text-slate-400 uppercase">
                              <span>Instal: {formatCurrency(loan.installmentAmount)}</span>
                              <ArrowRight size={10} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </aside>

              {/* Main Panel */}
              <section className="col-span-9 space-y-2 overflow-y-auto">

                {error && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-3">
                    <div className="p-2 bg-rose-500 text-white rounded-lg shrink-0"><AlertCircle size={14} /></div>
                    <div>
                      <h5 className="fz-tiny font-black text-rose-900 uppercase tracking-wider">Access Interrupted</h5>
                      <p className="fz-small font-bold text-rose-700 mt-0.5">{error}</p>
                      <button onClick={() => selectedMember && fetchMemberLoans(selectedMember.memberNo)}
                        className="mt-1.5 flex items-center gap-1 fz-tiny font-black text-rose-500 uppercase">
                        <RefreshCw size={10} /> Retry Protocol
                      </button>
                    </div>
                  </div>
                )}

                {selectedLoan && summaryStats ? (
                  <div className="space-y-2">

                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100"><PieChart size={14} /></div>
                          <h4 className="fz-mini font-black text-slate-400 uppercase tracking-widest">Debt Clearance</h4>
                        </div>
                        <p className="text-2xl font-black text-slate-800 leading-none">{summaryStats.completionPercentage.toFixed(1)}<span className="text-sm text-slate-400">%</span></p>
                        <div className="mt-2 h-2 bg-slate-50 rounded-full border border-slate-100 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full" style={{ width: `${summaryStats.completionPercentage}%` }} />
                        </div>
                      </div>
                      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100"><TrendingUp size={14} /></div>
                          <h4 className="fz-mini font-black text-slate-400 uppercase tracking-widest">Cleared Principal</h4>
                        </div>
                        <p className="text-xl font-black text-slate-800 leading-none">{formatCurrency(summaryStats.totalPrincipalPaid)}</p>
                        <div className="flex items-center gap-1 mt-2 fz-tiny font-black text-emerald-600 uppercase">
                          <ArrowUpRight size={11} /><span>Reduction relative to gross</span>
                        </div>
                      </div>
                      <div className="bg-slate-900 rounded-xl p-3 shadow-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-2 bg-slate-800 text-rose-400 rounded-xl border border-slate-700"><Clock size={14} /></div>
                          <h4 className="fz-mini font-black text-slate-500 uppercase tracking-widest">Residual Exposure</h4>
                        </div>
                        <p className="text-xl font-black text-white leading-none">{formatCurrency(selectedLoan.balance)}</p>
                        <div className="flex items-center gap-1 mt-2 fz-tiny font-black text-slate-500 uppercase">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                          <span>Awaiting Recovery ({summaryStats.pendingInstallments} inst.)</span>
                        </div>
                      </div>
                    </div>

                    {/* Amortization Table */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                      <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100 shrink-0">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center"><FileText size={18} className="text-slate-600" /></div>
                          <div>
                            <h3 className="fz-caption font-black text-slate-800 uppercase">Amortization Ledger</h3>
                            <p className="fz-mini font-bold text-slate-400 uppercase tracking-widest">Official Payment Manifest</p>
                          </div>
                        </div>
                        <button onClick={handleExportPDF}
                          className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1.5 rounded-lg fz-tiny font-black hover:bg-slate-800 transition-all">
                          <Printer size={11} /> Official Printout
                        </button>
                      </div>

                      <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left">
                          <thead className="bg-[#f8fafc] sticky top-0">
                            <tr>
                              {['Seq', 'Due Date', 'Installment', 'Principal', 'Interest', 'Balance', 'Status'].map((h, i) => (
                                <th key={h} className={`px-3 py-2 fz-mini font-black text-slate-400 uppercase tracking-wider border-b border-slate-200 ${i >= 2 && i <= 5 ? 'text-right' : i === 6 ? 'text-center' : ''}`}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {paginatedSchedule.map((item) => (
                              <tr key={item.month} className="hover:bg-indigo-50/30 transition-colors">
                                <td className="px-3 py-2 fz-tiny font-bold text-slate-400">#{item.month.toString().padStart(2, '0')}</td>
                                <td className="px-3 py-2 fz-small font-black text-slate-700">{item.dueDate}</td>
                                <td className="px-3 py-2 fz-small font-black text-slate-900 text-right">{formatCurrency(item.emiAmount)}</td>
                                <td className="px-3 py-2 fz-small font-bold text-indigo-600 text-right">{formatCurrency(item.principalAmount)}</td>
                                <td className="px-3 py-2 fz-small font-bold text-amber-600 text-right">{formatCurrency(item.interestAmount)}</td>
                                <td className="px-3 py-2 fz-small font-black text-slate-900 text-right">{formatCurrency(item.balance)}</td>
                                <td className="px-3 py-2 text-center">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full fz-mini font-black uppercase border ${item.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : item.status === 'Overdue' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                    {item.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 shrink-0">
                          <p className="fz-tiny font-black text-slate-400 uppercase">
                            {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, emiSchedule.length)} of {emiSchedule.length}
                          </p>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 disabled:opacity-30 border border-slate-200 rounded-lg hover:bg-white shadow-sm">
                              <ChevronDown className="rotate-90" size={14} />
                            </button>
                            <span className="fz-small font-black text-slate-800">{currentPage} / {totalPages}</span>
                            <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 disabled:opacity-30 border border-slate-200 rounded-lg hover:bg-white shadow-sm">
                              <ChevronDown className="-rotate-90" size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center py-16 bg-white rounded-xl border-2 border-dashed border-slate-100">
                    <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4 border border-indigo-100">
                      <Calculator className="text-indigo-600 w-9 h-9" />
                    </div>
                    <h3 className="text-base font-black text-slate-800 uppercase">Intelligence Module Idle</h3>
                    <p className="fz-tiny font-bold text-slate-400 uppercase tracking-wider mt-1 text-center max-w-xs leading-relaxed px-4">
                      Select member and liability case to generate amortization schedule
                    </p>
                    <div className="mt-6 grid grid-cols-4 gap-3 px-8 w-full max-w-lg">
                      {[{ icon: User, label: 'Member Profile', c: 'text-indigo-400' }, { icon: Database, label: 'Master Sync', c: 'text-amber-400' }, { icon: TrendingUp, label: 'Projection Logic', c: 'text-emerald-400' }, { icon: Printer, label: 'Secure Export', c: 'text-indigo-400' }].map(({ icon: Icon, label, c }) => (
                        <div key={label} className="p-3 bg-slate-50 rounded-xl text-center border border-slate-100 hover:border-indigo-200 hover:bg-white transition-all">
                          <Icon size={14} className={`mx-auto mb-1.5 ${c}`} />
                          <p className="fz-mini font-black text-slate-500 uppercase leading-tight">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </section>
            </div>
          </div>
        </Spin>

        {/* Footer */}
        <div className="px-3 py-1 border-t border-slate-200 bg-white shrink-0">
          <div className="flex items-center justify-between">
            <p className="fz-micro font-black text-slate-300 uppercase tracking-wider">Matrix v4.2.0 • Secured Amortization Engine</p>
            <div className="flex items-center gap-2 fz-micro font-black text-slate-400 uppercase tracking-widest">
              <span>Documentation</span><span className="w-0.5 h-0.5 bg-slate-300 rounded-full" /><span>Support</span>
            </div>
          </div>
        </div>

        {/* Member Lookup Modal */}
        {showMemberLookup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
              <div className="bg-slate-900 px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-500/10">
                    <User size={16} className="text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-black text-sm uppercase tracking-tight">Select Member</h3>
                    <p className="fz-mini font-bold text-slate-500 uppercase tracking-widest mt-0.5">Cross-referencing Global Ledger</p>
                  </div>
                </div>
                <button onClick={() => setShowMemberLookup(false)} className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all">
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-auto bg-slate-50 p-2">
                <MemberLookup isModal={true} onSelect={handleMemberSelect} onClose={() => setShowMemberLookup(false)} />
              </div>
            </div>
          </div>
        )}

        <style>{`
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
          @media print {
            aside, header, footer, button { display: none !important; }
            main { padding: 0 !important; }
            .col-span-9 { width: 100% !important; }
          }
        `}</style>
      </div>
    </ConfigProvider>
  );
};

export default EMIChart;
