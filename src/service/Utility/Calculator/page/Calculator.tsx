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
  X,
  Settings,
  ShieldCheck
} from 'lucide-react';
import { Select } from 'antd';
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
  const [, setError] = useState<string | null>(null);
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

  const principalValue = parseFloat(principal);
  const selectedType = selectedLoanType !== 'custom' ? loanTypes.find(l => l.code === selectedLoanType) : undefined;

  return (
    <div className="app-window">

      {/* Header */}
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">Loan Calculator</h1>
          <p className="aw-desc">Financial Analyzer</p>
        </div>
        <div className="aw-actions">
          {loading && (
            <span className="aw-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} role="status">
              <RefreshCw size={12} className="aw-spin" /> Loading...
            </span>
          )}
          <button type="button" onClick={resetForm} className="aw-btn aw-btn-secondary">
            <RefreshCw size={13} /> Reset
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="aw-tabs" role="tablist">
        {tabs.map(tab => (
          <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)} className="aw-tab">
            <tab.icon size={13} />{tab.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="aw-fit">
        <div className="aw-split">

          {/* Sidebar */}
          <div className="aw-side">

            {/* Member Card */}
            <section className="aw-card">
              <div className="aw-card-head">
                <span className="aw-card-icon"><User size={14} /></span>
                <h2 className="aw-card-title">Member</h2>
              </div>
              <div className="aw-stack">
                <div className="aw-input-wrap has-action">
                  <input type="text" value={memberNo} onChange={(e) => setMemberNo(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Member ID..." aria-label="Member ID" className="aw-input" />
                  <button type="button" onClick={() => setShowMemberLookup(true)} className="aw-input-action" aria-label="Search members" data-tip="Search members" data-tip-pos="bottom-end">
                    <Search size={13} />
                  </button>
                </div>
                {selectedMember ? (
                  <div className="aw-panel aw-panel-accent aw-fade-in">
                    <p className="aw-strong" style={{ textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedMember.name}</p>
                    <dl className="aw-facts" style={{ marginTop: 8 }}>
                      <div>
                        <dt>Salary</dt>
                        <dd>{formatCurrency(selectedMember.basicPay)}</dd>
                      </div>
                      <div>
                        <dt>Eligible</dt>
                        <dd style={{ color: 'var(--aw-success)' }}>{formatCurrency(selectedMember.eligibleAmount)}</dd>
                      </div>
                    </dl>
                  </div>
                ) : (
                  <p className="aw-muted" style={{ textAlign: 'center' }}>No member selected</p>
                )}
              </div>
            </section>

            {/* Loan Type Card */}
            <section className="aw-card">
              <div className="aw-card-head">
                <span className="aw-card-icon"><ShieldCheck size={14} /></span>
                <h2 className="aw-card-title">Loan Type</h2>
              </div>
              <div className="aw-stack">
                <div>
                  <label className="aw-label" htmlFor="calc-type">Type</label>
                  <Select
                    id="calc-type"
                    value={selectedLoanType}
                    onChange={handleLoanTypeChange}
                    className="aw-select"
                    popupClassName="aw-select-popup"
                    options={[
                      { value: 'custom', label: 'Custom' },
                      ...loanTypes.map(lt => ({ value: lt.code, label: lt.name })),
                    ]}
                  />
                </div>
                {selectedType && (
                  <div className="aw-panel aw-fade-in">
                    <p className="aw-muted" style={{ marginBottom: 6 }}>{selectedType.description}</p>
                    <div className="aw-row-value" style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--aw-accent)' }}>
                      <span>Max: {formatCurrency(selectedType.maxAmount)}</span>
                      <span>{selectedType.maxTenure}M</span>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Parameters Card */}
            <section className="aw-card">
              <div className="aw-card-head">
                <span className="aw-card-icon"><Settings size={14} /></span>
                <h2 className="aw-card-title">Parameters</h2>
              </div>
              <div className="aw-stack">
                {[
                  { id: 'calc-principal', label: 'Principal (₹)', value: principal, setter: setPrincipal, icon: IndianRupee, disabled: false },
                  { id: 'calc-rate', label: 'Rate (%)', value: annualRate, setter: setAnnualRate, icon: Percent, disabled: selectedLoanType !== 'custom' },
                  { id: 'calc-months', label: 'Months', value: tenure, setter: setTenure, icon: Calendar, disabled: false },
                ].map(({ id, label, value, setter, icon: Icon, disabled }) => (
                  <div key={id}>
                    <label className="aw-label" htmlFor={id}>{label}</label>
                    <div className="aw-input-wrap has-icon">
                      <Icon size={13} />
                      <input id={id} type="number" value={value} onChange={(e) => setter(e.target.value)} disabled={disabled} className="aw-input" />
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>

          {/* Main Workspace */}
          <section className="aw-card aw-main">

            {calculation ? (
              <div className="aw-main-body">

                {activeTab === 'calculator' && (
                  <div className="aw-stack aw-narrow aw-fade-in">
                    <div className="aw-stats aw-stats-3">
                      {[
                        { label: 'Monthly EMI', value: formatCurrency(calculation.emi), tone: 'tone-info', icon: TrendingUp },
                        { label: 'Total Amount', value: formatCurrency(calculation.totalAmount), tone: 'tone-success', icon: ShieldCheck },
                        { label: 'Interest', value: formatCurrency(calculation.totalInterest), tone: 'tone-warning', icon: Percent },
                      ].map(m => (
                        <div key={m.label} className={`aw-stat aw-stat-left ${m.tone}`}>
                          <div className="aw-stat-head">
                            <m.icon size={14} />
                            <span className="aw-stat-label">{m.label}</span>
                          </div>
                          <div className="aw-stat-value">{m.value}</div>
                        </div>
                      ))}
                    </div>

                    <div className="aw-panel">
                      <div className="aw-stat-head">
                        <PieChart size={14} style={{ color: 'var(--aw-accent)' }} />
                        <span className="aw-stat-label">Breakdown</span>
                      </div>
                      <div className="aw-bar" role="img" aria-label="Principal versus interest">
                        <span style={{ width: `${(principalValue / calculation.totalAmount) * 100}%` }} />
                      </div>
                      <div className="aw-legend">
                        <span><i className="aw-dot" />Principal</span>
                        <span><i className="aw-dot aw-dot-soft" />Interest</span>
                      </div>
                      <dl className="aw-facts aw-facts-4" style={{ marginTop: 12 }}>
                        {[
                          { l: 'Principal', v: formatCurrency(principalValue) },
                          { l: 'Interest', v: formatCurrency(calculation.totalInterest) },
                          { l: 'Rate', v: `${annualRate}%` },
                          { l: 'Multiplier', v: `${(calculation.totalAmount / principalValue).toFixed(2)}x` },
                        ].map(r => (
                          <div key={r.l}>
                            <dt>{r.l}</dt>
                            <dd>{r.v}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>

                    <div className="aw-alert aw-alert-info" style={{ marginBottom: 0 }}>
                      <ShieldCheck size={14} />
                      <p>
                        <strong>Note: </strong>
                        For {formatCurrency(principalValue)} over {tenure} months at {annualRate}%, your monthly EMI is <strong>{formatCurrency(calculation.emi)}</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === 'schedule' && (
                  <div className="aw-fade-in">
                    <div className="aw-stat-head" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <BarChart3 size={14} style={{ color: 'var(--aw-accent)' }} />
                        <span className="aw-stat-label">Amortization Schedule</span>
                      </span>
                      <span className="aw-pill">{tenure} installments</span>
                    </div>
                    <div className="aw-table-wrap">
                      <table className="aw-table">
                        <thead>
                          <tr>
                            {['#', 'Installment', 'Principal', 'Interest', 'Balance'].map(h => (
                              <th key={h}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {calculation.monthlyBreakdown.map(row => (
                            <tr key={row.month}>
                              <td className="is-accent">{row.month}</td>
                              <td>{formatCurrency(row.emi)}</td>
                              <td className="is-muted">{formatCurrency(row.principal)}</td>
                              <td className="is-accent">{formatCurrency(row.interest)}</td>
                              <td>{formatCurrency(row.balance)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === 'comparison' && (
                  <div className="aw-two aw-fade-in">
                    {comparisonLoans.length > 0 ? (comparisonLoans as any[]).map((loan, i) => (
                      <div key={i} className="aw-compare-card">
                        <div className="aw-compare-head">
                          <span className="aw-strong" style={{ textTransform: 'uppercase' }}>{loan.loanType}</span>
                          <span className="aw-pill">{loan.rate}%</span>
                        </div>
                        <div className="aw-compare-body">
                          <dl className="aw-facts">
                            {[{ l: 'Principal', v: formatCurrency(loan.adjustedAmount) }, { l: 'Tenure', v: `${loan.adjustedTenure}M` }].map(r => (
                              <div key={r.l}>
                                <dt>{r.l}</dt>
                                <dd>{r.v}</dd>
                              </div>
                            ))}
                          </dl>
                          <div className="aw-rows">
                            <div className="aw-row">
                              <span className="aw-row-label">EMI</span>
                              <span className="aw-row-value" style={{ color: 'var(--aw-accent)' }}>{formatCurrency(loan.emi)}</span>
                            </div>
                            <div className="aw-row">
                              <span className="aw-row-label">Interest</span>
                              <span className="aw-row-value">{formatCurrency(loan.totalInterest)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="aw-compare-total">
                          <span>Total</span>
                          <span>{formatCurrency(loan.totalAmount)}</span>
                        </div>
                      </div>
                    )) : (
                      <div className="aw-empty" style={{ gridColumn: '1 / -1' }}>
                        <PieChart size={36} />
                        <span>No comparison data</span>
                      </div>
                    )}
                  </div>
                )}

              </div>
            ) : (
              <div className="aw-empty" style={{ flex: 1 }}>
                <CalcIcon size={44} />
                <span>Enter parameters to calculate</span>
              </div>
            )}

            {/* Footer bar inside workspace */}
            <div className="aw-main-foot">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span>Computation: <span style={{ color: 'var(--aw-text)' }}>Dynamic</span></span>
                <span>Audit: <span style={{ color: 'var(--aw-success)' }}>Verified</span></span>
              </div>
              <span className="aw-pill">V4.2 ENGINE</span>
            </div>
          </section>

        </div>
      </div>

      {/* Member Lookup Modal */}
      {showMemberLookup && (
        <div className="aw-modal-backdrop" onClick={() => setShowMemberLookup(false)}>
          <div className="aw-modal" role="dialog" aria-modal="true" aria-label="Select Member" onClick={(e) => e.stopPropagation()}>
            <div className="aw-modal-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="aw-card-icon"><User size={14} /></span>
                <h2 className="aw-card-title">Select Member</h2>
              </div>
              <button type="button" onClick={() => setShowMemberLookup(false)} className="aw-icon-btn" aria-label="Close">
                <X size={15} />
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <MemberLookup isModal={true} onSelect={handleMemberSelect} onClose={() => setShowMemberLookup(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calculator;
