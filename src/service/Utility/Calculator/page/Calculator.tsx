import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calculator as CalcIcon,
  IndianRupee,
  Percent,
  Calendar,
  TrendingUp,
  User,
  Search,
  RefreshCw,
  BarChart3,
  PieChart,
  Target,
  AlertCircle,
  CheckCircle,
  X,
  Settings,
  Building2,
  ShieldCheck,
  Info,
  Database,
  ArrowRight
} from 'lucide-react';
import { ConfigProvider, Spin } from 'antd';
import { apiService } from '../../../../services/api';
import MemberLookup from '../../../../components/shared/MemberLookup/MemberLookup';

interface LoanCalculation {
  emi: number;
  totalAmount: number;
  totalInterest: number;
  monthlyBreakdown: Array<{
    month: number;
    emi: number;
    principal: number;
    interest: number;
    balance: number;
  }>;
}

interface LoanType {
  name: string;
  code: string;
  rate: number;
  maxAmount: number;
  maxTenure: number;
  description: string;
}

interface MemberData {
  memberNo: string;
  name: string;
  basicPay: number;
  activeLoans: number;
  totalOutstanding: number;
  eligibleAmount: number;
}

const showDialog = async (type: 'info' | 'warning' | 'error', msg: string, detail: string): Promise<void> => {
  if ((window as any).electronAPI?.showMessageBox) {
    await (window as any).electronAPI.showMessageBox({ type, title: 'electron-react-ts', message: msg, detail, buttons: ['OK'], defaultId: 0 });
  } else { alert(`[${type.toUpperCase()}] ${msg}\n\n${detail}`); }
};

const lbl = "block fz-mini font-black text-slate-500 uppercase tracking-wider mb-0.5";

const Calculator: React.FC = () => {
  const [principal, setPrincipal] = useState<string>('500000');
  const [annualRate, setAnnualRate] = useState<string>('12');
  const [tenure, setTenure] = useState<string>('24');
  const [calculation, setCalculation] = useState<LoanCalculation | null>(null);
  const [activeTab, setActiveTab] = useState('calculator');
  const [selectedLoanType, setSelectedLoanType] = useState<string>('custom');
  const [loanTypes, setLoanTypes] = useState<LoanType[]>([]);
  const [memberNo, setMemberNo] = useState<string>('');
  const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
  const [showMemberLookup, setShowMemberLookup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparisonLoans, setComparisonLoans] = useState<LoanCalculation[]>([]);

  const formatCurrency = useMemo(() => (amount: number): string =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
  , []);

  const loadLoanTypes = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const response = await apiService.getLoanRates();
      if (response.success && response.data) {
        setLoanTypes(response.data.map((loan: any) => ({
          name: loan.name, code: loan.code, rate: parseFloat(loan.rate),
          maxAmount: parseFloat(loan.maxAmount || loan.max_amount || 0),
          maxTenure: parseInt(loan.maxTenure || loan.max_tenure || 60),
          description: loan.description || `${loan.name} with ${loan.rate}% interest rate`
        })));
      } else {
        setLoanTypes([{ name: 'Regular Loan', code: 'RLN', rate: 12.0, maxAmount: 500000, maxTenure: 60, description: 'Standard loan' }]);
      }
    } catch {
      setLoanTypes([{ name: 'Regular Loan', code: 'RLN', rate: 12.0, maxAmount: 500000, maxTenure: 60, description: 'Standard loan' }]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadLoanTypes(); }, []);

  const handleLoanTypeChange = useCallback((code: string) => {
    setSelectedLoanType(code);
    if (code !== 'custom') {
      const lt = loanTypes.find(l => l.code === code);
      if (lt) {
        setAnnualRate(lt.rate.toString());
        if (parseFloat(principal) > lt.maxAmount) setPrincipal(lt.maxAmount.toString());
        if (parseInt(tenure) > lt.maxTenure) setTenure(lt.maxTenure.toString());
      }
    }
  }, [loanTypes, principal, tenure]);

  const fetchMemberEligibility = useCallback(async (memberNumber: string) => {
    try {
      setLoading(true);
      const response = await apiService.getMemberEligibility(memberNumber);
      if (response.success && response.data) {
        const d = response.data;
        setSelectedMember(prev => prev ? { ...prev, basicPay: parseFloat(d.basicPay || 0), activeLoans: parseInt(d.activeLoans || 0), totalOutstanding: parseFloat(d.totalOutstanding || 0), eligibleAmount: parseFloat(d.availableEligibility || 0) } : null);
      }
    } catch { await showDialog('error', 'Eligibility Error', 'Could not load eligibility details for this member.'); }
    finally { setLoading(false); }
  }, []);

  const handleMemberSelect = useCallback(async (member: any) => {
    const md: MemberData = { memberNo: member.memberNo, name: member.memberName || member.name, basicPay: parseFloat(member.basicPay || '0'), activeLoans: 0, totalOutstanding: 0, eligibleAmount: 0 };
    setSelectedMember(md); setMemberNo(member.memberNo); setShowMemberLookup(false);
    await fetchMemberEligibility(member.memberNo);
  }, [fetchMemberEligibility]);

  const calculateEMI = (p: number, r: number, n: number): number => {
    const mr = r / (12 * 100);
    if (mr === 0) return p / n;
    return Math.round((p * mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1) * 100) / 100;
  };

  const generateSchedule = (p: number, r: number, n: number, emi: number) => {
    const mr = r / (12 * 100);
    let balance = p;
    return Array.from({ length: n }, (_, i) => {
      const interest = Math.round(balance * mr * 100) / 100;
      const principal = Math.round((emi - interest) * 100) / 100;
      balance = Math.round((balance - principal) * 100) / 100;
      return { month: i + 1, emi, principal, interest, balance: Math.max(0, balance) };
    });
  };

  const calculateLoan = useCallback(() => {
    const p = parseFloat(principal), r = parseFloat(annualRate), n = parseInt(tenure);
    if (isNaN(p) || isNaN(r) || isNaN(n) || p <= 0 || r < 0 || n <= 0) { setCalculation(null); return; }
    const emi = calculateEMI(p, r, n);
    const totalAmount = Math.round(emi * n * 100) / 100;
    setCalculation({ emi, totalAmount, totalInterest: Math.round((totalAmount - p) * 100) / 100, monthlyBreakdown: generateSchedule(p, r, n, emi) });
  }, [principal, annualRate, tenure]);

  const generateComparison = useCallback(() => {
    const p = parseFloat(principal), n = parseInt(tenure);
    if (isNaN(p) || isNaN(n) || p <= 0 || n <= 0) { setComparisonLoans([]); return; }
    setComparisonLoans(loanTypes.map(lt => {
      const ap = Math.min(p, lt.maxAmount), at = Math.min(n, lt.maxTenure);
      const emi = calculateEMI(ap, lt.rate, at);
      const total = Math.round(emi * at * 100) / 100;
      return { emi, totalAmount: total, totalInterest: Math.round((total - ap) * 100) / 100, monthlyBreakdown: [], loanType: lt.name, rate: lt.rate, adjustedAmount: ap, adjustedTenure: at } as any;
    }));
  }, [principal, tenure, loanTypes]);

  useEffect(() => {
    calculateLoan();
    if (activeTab === 'comparison') generateComparison();
  }, [principal, annualRate, tenure, activeTab, calculateLoan, generateComparison]);

  const resetForm = useCallback(() => {
    setPrincipal('100000'); setAnnualRate('12'); setTenure('24');
    setSelectedLoanType('custom'); setSelectedMember(null); setMemberNo(''); setError(null);
  }, []);

  const tabs = [
    { id: 'calculator', label: 'Results', icon: CalcIcon },
    { id: 'schedule', label: 'Schedule', icon: BarChart3 },
    { id: 'comparison', label: 'Compare', icon: PieChart },
  ];

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#6366f1', borderRadius: 6 } }}>
      <div className="h-screen flex flex-col bg-[#f5f6fa] font-sans overflow-hidden text-slate-900">

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-3 py-2 flex items-center justify-between shrink-0 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg border border-indigo-400/50 bg-indigo-600">
              <CalcIcon size={13} className="text-white" />
            </div>
            <div>
              <h1 className="fz-caption font-black text-white tracking-wider uppercase leading-none">Loan Calculator</h1>
              <p className="fz-micro font-bold text-indigo-300 uppercase tracking-widest mt-0.5">Financial Analyzer</p>
            </div>
          </div>
          <button onClick={resetForm} className="h-7 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-white/20 uppercase tracking-wide">
            <RefreshCw size={11} /> Reset
          </button>
        </div>

        {/* Tab Bar */}
        <div className="bg-white border-b border-slate-200 px-2 flex gap-0.5 shrink-0">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 fz-tiny font-black uppercase tracking-wide transition-all relative whitespace-nowrap flex items-center gap-1.5 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
              <tab.icon size={11} />{tab.label}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600" />}
            </button>
          ))}
        </div>

        {/* Body */}
        <Spin spinning={loading} tip="Loading...">
          <div className="flex-1 overflow-hidden p-2">
            <div className="h-full grid grid-cols-12 gap-2">

              {/* Sidebar */}
              <div className="col-span-3 space-y-2 overflow-y-auto pr-1">

                {/* Member Card */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                  <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                    <User size={10} className="text-slate-400" />
                    <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Member</span>
                  </div>
                  <div className="p-2 space-y-1.5">
                    <div className="relative">
                      <input type="text" value={memberNo} onChange={(e) => setMemberNo(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="Member ID..." className="w-full h-7 pl-2 pr-8 fz-small font-semibold bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-indigo-400" />
                      <button onClick={() => setShowMemberLookup(true)} className="absolute right-0.5 top-0.5 w-6 h-6 bg-indigo-600 text-white flex items-center justify-center rounded hover:bg-indigo-500 transition-colors">
                        <Search size={10} />
                      </button>
                    </div>
                    {selectedMember ? (
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2">
                        <p className="fz-tiny font-black text-indigo-800 uppercase truncate">{selectedMember.name}</p>
                        <div className="grid grid-cols-2 gap-1 mt-1">
                          <div className="bg-white/70 p-1 rounded">
                            <label className="fz-micro font-black text-indigo-500 uppercase block">Salary</label>
                            <span className="fz-tiny font-black text-indigo-700">{formatCurrency(selectedMember.basicPay)}</span>
                          </div>
                          <div className="bg-white/70 p-1 rounded">
                            <label className="fz-micro font-black text-emerald-500 uppercase block">Eligible</label>
                            <span className="fz-tiny font-black text-emerald-600">{formatCurrency(selectedMember.eligibleAmount)}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="fz-mini text-slate-400 italic text-center py-1">No member selected</div>
                    )}
                  </div>
                </div>

                {/* Loan Type Card */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                  <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                    <ShieldCheck size={10} className="text-slate-400" />
                    <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Loan Type</span>
                  </div>
                  <div className="p-2 space-y-1.5">
                    <div>
                      <label className={lbl}>Type</label>
                      <select value={selectedLoanType} onChange={(e) => handleLoanTypeChange(e.target.value)}
                        className="w-full h-7 px-2 fz-small font-semibold bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-indigo-400">
                        <option value="custom">Custom</option>
                        {loanTypes.map(lt => <option key={lt.code} value={lt.code}>{lt.name}</option>)}
                      </select>
                    </div>
                    {selectedLoanType !== 'custom' && (() => {
                      const lt = loanTypes.find(l => l.code === selectedLoanType);
                      return lt ? (
                        <div className="bg-slate-50 border border-slate-100 rounded p-1.5">
                          <p className="fz-mini text-slate-500 italic leading-snug mb-1">{lt.description}</p>
                          <div className="flex items-center justify-between fz-mini font-black text-indigo-600 uppercase">
                            <span>Max: {formatCurrency(lt.maxAmount)}</span>
                            <span>{lt.maxTenure}M</span>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>

                {/* Parameters Card */}
                <div className="bg-indigo-600 rounded-xl border border-indigo-500 shadow-lg">
                  <div className="px-3 py-1.5 border-b border-white/10 flex items-center gap-1.5">
                    <Settings size={10} className="text-indigo-200" />
                    <span className="fz-mini font-black text-indigo-100 uppercase tracking-widest">Parameters</span>
                  </div>
                  <div className="p-2 space-y-2">
                    {[
                      { label: 'Principal (₹)', value: principal, setter: setPrincipal, icon: IndianRupee },
                      { label: 'Rate (%)', value: annualRate, setter: setAnnualRate, icon: Percent, disabled: selectedLoanType !== 'custom' },
                      { label: 'Months', value: tenure, setter: setTenure, icon: Calendar },
                    ].map(({ label, value, setter, icon: Icon, disabled }) => (
                      <div key={label}>
                        <label className="block fz-mini font-black text-indigo-200/70 uppercase tracking-wider mb-0.5">{label}</label>
                        <div className="relative">
                          <Icon size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/50" />
                          <input type="number" value={value} onChange={(e) => setter(e.target.value)} disabled={disabled}
                            className="w-full h-7 pl-7 pr-2 bg-white/10 border border-white/20 rounded fz-small font-black text-white outline-none focus:bg-white/20 transition-all disabled:opacity-50" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Main Workspace */}
              <div className="col-span-9 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">

                {calculation ? (
                  <div className="flex-1 overflow-auto p-3">

                    {activeTab === 'calculator' && (
                      <div className="space-y-3 max-w-3xl mx-auto">
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: 'Monthly EMI', value: formatCurrency(calculation.emi), color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100', icon: TrendingUp },
                            { label: 'Total Amount', value: formatCurrency(calculation.totalAmount), color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100', icon: ShieldCheck },
                            { label: 'Interest', value: formatCurrency(calculation.totalInterest), color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100', icon: Percent },
                          ].map(m => (
                            <div key={m.label} className={`${m.bg} border rounded-xl p-3`}>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <m.icon size={12} className={m.color} />
                                <span className="fz-mini font-black text-slate-500 uppercase tracking-wider">{m.label}</span>
                              </div>
                              <span className={`text-[18px] font-black leading-none ${m.color}`}>{m.value}</span>
                            </div>
                          ))}
                        </div>

                        <div className="bg-white border border-slate-100 rounded-xl p-3">
                          <div className="flex items-center gap-1.5 mb-2">
                            <PieChart size={11} className="text-indigo-500" />
                            <span className="fz-mini font-black text-slate-700 uppercase tracking-wider">Breakdown</span>
                          </div>
                          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                            <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${(parseFloat(principal) / calculation.totalAmount) * 100}%` }} />
                            <div className="flex-1 h-full bg-indigo-200" />
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 fz-mini font-semibold text-slate-500">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" /> Principal</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-200 inline-block" /> Interest</span>
                          </div>
                          <div className="grid grid-cols-4 gap-2 mt-3 fz-tiny">
                            {[
                              { l: 'Principal', v: formatCurrency(parseFloat(principal)) },
                              { l: 'Interest', v: formatCurrency(calculation.totalInterest) },
                              { l: 'Rate', v: `${annualRate}%` },
                              { l: 'Multiplier', v: `${(calculation.totalAmount / parseFloat(principal)).toFixed(2)}x` },
                            ].map(r => (
                              <div key={r.l} className="border-b border-slate-100 pb-1">
                                <span className="text-slate-400 uppercase fz-micro block">{r.l}</span>
                                <span className="font-black text-slate-700">{r.v}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-indigo-50 border-l-4 border-indigo-600 rounded-lg p-2.5 flex items-start gap-2">
                          <ShieldCheck size={13} className="text-indigo-600 shrink-0 mt-0.5" />
                          <p className="fz-tiny text-indigo-700 leading-snug">
                            <strong className="uppercase">Note: </strong>
                            For {formatCurrency(parseFloat(principal))} over {tenure} months at {annualRate}%, your monthly EMI is <strong>{formatCurrency(calculation.emi)}</strong>.
                          </p>
                        </div>
                      </div>
                    )}

                    {activeTab === 'schedule' && (
                      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
                        <div className="bg-slate-900 px-4 py-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <BarChart3 size={12} className="text-indigo-400" />
                            <span className="fz-tiny font-black text-white uppercase tracking-wider">Amortization Schedule</span>
                          </div>
                          <span className="fz-mini font-black text-indigo-300 uppercase">{tenure} installments</span>
                        </div>
                        <div className="max-h-[60vh] overflow-auto">
                          <table className="w-full">
                            <thead className="sticky top-0 bg-[#f8fafc]">
                              <tr>
                                {['#', 'Installment', 'Principal', 'Interest', 'Balance'].map(h => (
                                  <th key={h} className="px-4 py-2 text-left fz-mini font-black text-slate-500 uppercase tracking-wider border-b border-slate-200">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {calculation.monthlyBreakdown.map(row => (
                                <tr key={row.month} className="hover:bg-slate-50 border-b border-slate-100">
                                  <td className="px-4 py-1.5 fz-tiny font-black text-indigo-600">{row.month}</td>
                                  <td className="px-4 py-1.5 fz-tiny font-black text-slate-800">{formatCurrency(row.emi)}</td>
                                  <td className="px-4 py-1.5 fz-tiny font-semibold text-slate-600">{formatCurrency(row.principal)}</td>
                                  <td className="px-4 py-1.5 fz-tiny font-semibold text-indigo-500">{formatCurrency(row.interest)}</td>
                                  <td className="px-4 py-1.5 fz-tiny font-black text-slate-700">{formatCurrency(row.balance)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {activeTab === 'comparison' && (
                      <div className="grid grid-cols-2 gap-2">
                        {comparisonLoans.length > 0 ? (comparisonLoans as any[]).map((loan, i) => (
                          <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-indigo-300 transition-colors flex flex-col">
                            <div className="bg-slate-50 px-3 py-1.5 flex items-center justify-between border-b border-slate-100">
                              <span className="fz-tiny font-black text-slate-800 uppercase">{loan.loanType}</span>
                              <span className="bg-indigo-600 text-white fz-mini font-black px-2 py-0.5 rounded-full">{loan.rate}%</span>
                            </div>
                            <div className="p-2.5 space-y-1.5 flex-1">
                              <div className="grid grid-cols-2 gap-1.5">
                                {[{ l: 'Principal', v: formatCurrency(loan.adjustedAmount) }, { l: 'Tenure', v: `${loan.adjustedTenure}M` }].map(r => (
                                  <div key={r.l} className="bg-slate-50 border border-slate-100 rounded p-1.5">
                                    <label className="fz-micro font-black text-slate-400 uppercase block">{r.l}</label>
                                    <span className="fz-tiny font-black text-slate-700">{r.v}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="space-y-1 fz-tiny">
                                <div className="flex justify-between border-b border-slate-100 pb-1">
                                  <span className="text-slate-400 font-semibold uppercase">EMI</span>
                                  <span className="font-black text-indigo-600">{formatCurrency(loan.emi)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400 font-semibold uppercase">Interest</span>
                                  <span className="font-black text-slate-500">{formatCurrency(loan.totalInterest)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="px-3 py-1.5 bg-slate-900 flex items-center justify-between">
                              <span className="fz-mini font-black text-indigo-300 uppercase">Total</span>
                              <span className="fz-caption font-black text-white">{formatCurrency(loan.totalAmount)}</span>
                            </div>
                          </div>
                        )) : (
                          <div className="col-span-full py-12 flex flex-col items-center text-slate-300">
                            <PieChart size={36} className="mb-2 opacity-20" />
                            <p className="fz-tiny font-black uppercase">No comparison data</p>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                    <CalcIcon size={48} className="mb-3 opacity-10" />
                    <p className="fz-tiny font-black uppercase tracking-widest">Enter parameters to calculate</p>
                  </div>
                )}

                {/* Footer bar inside workspace */}
                <div className="px-4 py-2 bg-white border-t border-slate-100 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3 fz-mini font-black text-slate-400 uppercase tracking-wider">
                    <span>Computation: <span className="text-slate-700">Dynamic</span></span>
                    <span>Audit: <span className="text-emerald-500">Verified</span></span>
                  </div>
                  <span className="fz-mini font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">V4.2 ENGINE</span>
                </div>
              </div>

            </div>
          </div>
        </Spin>

        {/* Member Lookup Modal */}
        {showMemberLookup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl h-4/5 flex flex-col overflow-hidden">
              <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-4 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <User size={14} className="text-indigo-300" />
                  <h2 className="fz-caption font-black text-white uppercase tracking-wider">Select Member</h2>
                </div>
                <button onClick={() => setShowMemberLookup(false)} className="w-7 h-7 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center justify-center">
                  <X size={14} />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <MemberLookup isModal={true} onSelect={handleMemberSelect} onClose={() => setShowMemberLookup(false)} />
              </div>
            </div>
          </div>
        )}

        <style>{`
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
          input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
          input[type=number] { -moz-appearance: textfield; }
        `}</style>
      </div>
    </ConfigProvider>
  );
};

export default Calculator;
