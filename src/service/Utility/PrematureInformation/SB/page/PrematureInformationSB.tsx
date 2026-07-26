import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calculator,
  User,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  X,
  Search
} from 'lucide-react';
import { ConfigProvider } from 'antd';
import dayjs from 'dayjs';
import { apiService } from '../../../../../services/api';
import MemberLookup from '../../../../../components/shared/MemberLookup/MemberLookup';

interface MemberData {
  memberNo: string;
  name: string;
  basicPay: number;
  officeName: string;
}

interface SBAccountData {
  accountNumber: string;
  memberId: string;
  interestRate: number;
  currentBalance: number;
  openingDate: string;
  minimumBalance: number;
  status: string;
  lastTransactionDate: string;
}

interface PrematureCalculation {
  duration: number;
  applicableInterestRate: number;
  balance: number;
  product: number;
  interest: number;
  total: number;
  penalty: number;
}

const showDialog = async (type: 'info' | 'warning' | 'error', msg: string, detail: string): Promise<void> => {
  if ((window as any).electronAPI?.showMessageBox) {
    await (window as any).electronAPI.showMessageBox({ type, title: 'electron-react-ts', message: msg, detail, buttons: ['OK'], defaultId: 0 });
  } else { alert(`[${type.toUpperCase()}] ${msg}\n\n${detail}`); }
};

const lbl = "block text-[8px] font-black text-slate-500 uppercase tracking-wider mb-0.5";
const inp = "h-7 text-[11px] font-semibold bg-white border-slate-300 rounded";

const PrematureInformationSB: React.FC = () => {
  const [memberNo, setMemberNo] = useState('');
  const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
  const [sbAccounts, setSbAccounts] = useState<SBAccountData[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<SBAccountData | null>(null);
  const [calculationResult, setCalculationResult] = useState<PrematureCalculation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMemberLookup, setShowMemberLookup] = useState(false);

  const resetData = useCallback(() => {
    setSelectedMember(null); setSbAccounts([]); setSelectedAccount(null);
    setCalculationResult(null); setError(null);
  }, []);

  const fetchSBAccounts = useCallback(async (memberNumber: string) => {
    setLoading(true); setError(null);
    try {
      const response = await apiService.searchSBAccounts(memberNumber);
      if (response.success && response.data && response.data.length > 0) {
        setSbAccounts(response.data.map((a: any) => ({
          ...a,
          interestRate: parseFloat(a.interestRate),
          currentBalance: parseFloat(a.currentBalance),
          minimumBalance: parseFloat(a.minimumBalance || '1000')
        })));
      } else {
        setSbAccounts([]);
        setError('No SB accounts found for this member.');
        await showDialog('info', 'No SB Accounts', 'No SB accounts were found for this member.');
      }
    } catch { setError('Failed to fetch SB accounts.'); setSbAccounts([]); }
    finally { setLoading(false); }
  }, []);

  const handleMemberSelect = useCallback(async (member: any) => {
    const memberData: MemberData = {
      memberNo: member.memberNo,
      name: member.memberName || member.name,
      basicPay: parseFloat(member.basicPay || '0'),
      officeName: member.officeName || ''
    };
    setSelectedMember(memberData);
    setMemberNo(member.memberNo);
    setShowMemberLookup(false);
    await fetchSBAccounts(member.memberNo);
  }, [fetchSBAccounts]);

  const handleMemberNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setMemberNo(value);
    if (!value) resetData();
  }, [resetData]);

  const validateMember = useCallback(async (memberNumber: string) => {
    setLoading(true); setError(null);
    try {
      const response = await apiService.validateMember(memberNumber);
      if (response.success && response.data) {
        const memberInfo = response.data.data || response.data;
        if (memberInfo.exists) {
          setSelectedMember({ memberNo: memberNumber, name: memberInfo.memberName || '', basicPay: parseFloat(memberInfo.basicPay || '0'), officeName: memberInfo.officeName || '' });
          await fetchSBAccounts(memberNumber);
        } else {
          setError('Member not found.'); resetData();
          await showDialog('warning', 'Member Not Found', 'No member exists with that number.');
        }
      }
    } catch { setError('Failed to validate member.'); }
    finally { setLoading(false); }
  }, [fetchSBAccounts, resetData]);

  const handleMemberNumberBlur = useCallback(async () => {
    if (memberNo && !selectedMember) await validateMember(memberNo);
  }, [memberNo, selectedMember, validateMember]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && memberNo.trim()) validateMember(memberNo);
  }, [memberNo, validateMember]);

  const handleAccountSelect = useCallback((accountNo: string) => {
    const account = sbAccounts.find(acc => acc.accountNumber === accountNo);
    if (account) { setSelectedAccount(account); setCalculationResult(null); setError(null); }
  }, [sbAccounts]);

  const calculatePremature = useCallback(async () => {
    if (!selectedAccount) { setError('Please select an SB account first.'); return; }
    setLoading(true); setError(null);
    try {
      const openingDate = dayjs(selectedAccount.openingDate);
      const daysCompleted = dayjs().diff(openingDate, 'day');
      const yearsCompleted = daysCompleted / 365;
      const originalRate = selectedAccount.interestRate;
      const prematureRate = Math.max(0, originalRate - 0.5);
      const interestEarned = (selectedAccount.currentBalance * prematureRate * yearsCompleted) / 100;
      setCalculationResult({
        duration: Math.floor(daysCompleted),
        applicableInterestRate: prematureRate,
        balance: selectedAccount.currentBalance,
        product: selectedAccount.currentBalance * yearsCompleted,
        interest: interestEarned,
        total: selectedAccount.currentBalance + interestEarned,
        penalty: originalRate - prematureRate
      });
    } catch { setError('Failed to calculate premature withdrawal.'); }
    finally { setLoading(false); }
  }, [selectedAccount]);

  const resetForm = useCallback(() => { setMemberNo(''); resetData(); }, [resetData]);

  useEffect(() => {
    if (window.electronAPI) {
      const handler = (_event: any, memberData: any) => handleMemberSelect(memberData);
      window.electronAPI.ipcRenderer?.on('member-selected', handler);
      return () => { window.electronAPI.ipcRenderer?.removeAllListeners('member-selected'); };
    }
  }, [handleMemberSelect]);

  const formatCurrency = useMemo(() => (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(amount)
  , []);

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#6366f1', borderRadius: 6 } }}>
      <div className="h-screen flex flex-col bg-[#f5f6fa] font-sans overflow-hidden text-slate-900">

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-3 py-2 flex items-center justify-between shrink-0 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg border border-indigo-400/50 bg-indigo-600">
              <Calculator size={13} className="text-white" />
            </div>
            <div>
              <h1 className="text-[11px] font-black text-white tracking-wider uppercase leading-none">SB Premature Information</h1>
              <p className="text-[7px] font-bold text-indigo-300 uppercase tracking-widest mt-0.5">Saving Bank Early Closure Calculation</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={resetForm}
              className="h-7 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[9px] font-black transition-all flex items-center gap-1.5 border border-white/20 uppercase tracking-wide">
              <RefreshCw size={11} /> Reset
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col min-h-0 p-2 gap-1.5 overflow-auto">

          {error && (
            <div className="shrink-0 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 flex items-center gap-2 text-[9px] font-semibold text-rose-700">
              <AlertCircle size={12} className="text-rose-500 shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-1.5 flex-1 min-h-0">

            {/* Card 1: Member Selection */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
              <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5 shrink-0">
                <User size={10} className="text-slate-400" />
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Member Selection</span>
              </div>
              <div className="p-2.5 space-y-2 flex-1">
                <div>
                  <label className={lbl}>Member No.</label>
                  <div className="flex gap-1">
                    <input
                      type="text" value={memberNo} onChange={handleMemberNumberChange}
                      onBlur={handleMemberNumberBlur} onKeyDown={handleKeyPress}
                      placeholder="Member no..."
                      className={`${inp} flex-1 px-2 border focus:outline-none focus:border-indigo-400`}
                    />
                    <button onClick={() => setShowMemberLookup(true)}
                      className="h-7 w-7 bg-slate-100 hover:bg-indigo-600 hover:text-white rounded text-slate-500 flex items-center justify-center transition-colors shrink-0">
                      <Search size={12} />
                    </button>
                  </div>
                </div>
                {selectedMember && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2 space-y-1">
                    <p className="text-[10px] font-black text-indigo-800 uppercase">{selectedMember.name}</p>
                    <div className="flex gap-3 text-[9px] font-semibold text-indigo-600">
                      <span>No: {selectedMember.memberNo}</span>
                      <span>Pay: ₹{selectedMember.basicPay.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                )}
                {loading && (
                  <div className="flex items-center gap-2 text-[9px] text-slate-400">
                    <RefreshCw size={10} className="animate-spin" /> Loading...
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: SB Account Information */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
              <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5 shrink-0">
                <Calculator size={10} className="text-slate-400" />
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">SB Account Information</span>
              </div>
              <div className="p-2.5 space-y-2 flex-1">
                {selectedMember && sbAccounts.length > 0 ? (
                  <>
                    <div>
                      <label className={lbl}>Select Account</label>
                      <select
                        value={selectedAccount?.accountNumber || ''}
                        onChange={(e) => handleAccountSelect(e.target.value)}
                        className={`${inp} w-full px-2 border focus:outline-none focus:border-indigo-400`}
                      >
                        <option value="">— Select Account —</option>
                        {sbAccounts.map((account) => (
                          <option key={account.accountNumber} value={account.accountNumber}>
                            {account.accountNumber} — ₹{account.currentBalance.toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </div>
                    {selectedAccount && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                        <div>
                          <label className="block text-[7px] font-black text-emerald-600 uppercase tracking-wider">Opening Date</label>
                          <p className="text-[10px] font-black text-emerald-900">{dayjs(selectedAccount.openingDate).format('DD/MM/YY')}</p>
                        </div>
                        <div>
                          <label className="block text-[7px] font-black text-emerald-600 uppercase tracking-wider">Interest Rate</label>
                          <p className="text-[10px] font-black text-emerald-900">{selectedAccount.interestRate}%</p>
                        </div>
                        <div>
                          <label className="block text-[7px] font-black text-emerald-600 uppercase tracking-wider">Balance</label>
                          <p className="text-[10px] font-black text-emerald-900">₹{selectedAccount.currentBalance.toLocaleString()}</p>
                        </div>
                        <div>
                          <label className="block text-[7px] font-black text-emerald-600 uppercase tracking-wider">Min Balance</label>
                          <p className="text-[10px] font-black text-emerald-900">₹{selectedAccount.minimumBalance || 1000}</p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-8 text-slate-400">
                    <Calculator size={24} className="mb-2 opacity-30" />
                    <p className="text-[9px] font-semibold italic">
                      {selectedMember ? 'No SB accounts found' : 'Select member first'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Card 3: Actions & Results */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
              <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5 shrink-0">
                <CheckCircle size={10} className="text-slate-400" />
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Actions &amp; Results</span>
              </div>
              <div className="p-2.5 space-y-2 flex-1 overflow-auto">
                <div className="flex gap-1.5">
                  <button
                    onClick={calculatePremature}
                    disabled={!selectedAccount || loading}
                    className="flex-1 h-7 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 text-white rounded text-[9px] font-black uppercase tracking-wide flex items-center justify-center gap-1.5 transition-all">
                    {loading ? <RefreshCw size={11} className="animate-spin" /> : <Calculator size={11} />}
                    Calculate
                  </button>
                  <button onClick={resetForm}
                    className="h-7 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[9px] font-black uppercase tracking-wide flex items-center gap-1.5 transition-all">
                    <RefreshCw size={11} /> Reset
                  </button>
                </div>

                {calculationResult && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 text-center">
                        <p className="text-[7px] font-black text-blue-600 uppercase tracking-wider">Duration</p>
                        <p className="text-[14px] font-black text-blue-900 leading-none mt-0.5">{calculationResult.duration}<span className="text-[9px] ml-0.5">days</span></p>
                      </div>
                      <div className="bg-rose-50 border border-rose-100 rounded-lg p-2 text-center">
                        <p className="text-[7px] font-black text-rose-600 uppercase tracking-wider">Penalty</p>
                        <p className="text-[14px] font-black text-rose-900 leading-none mt-0.5">{calculationResult.penalty.toFixed(1)}<span className="text-[9px] ml-0.5">%</span></p>
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1.5 text-[9px]">
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500 font-semibold">Account Balance</span>
                        <span className="font-black text-slate-700">{formatCurrency(calculationResult.balance)}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500 font-semibold">Applied Rate</span>
                        <span className="font-black text-orange-600">{calculationResult.applicableInterestRate.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500 font-semibold">Interest Earned</span>
                        <span className="font-black text-emerald-600">{formatCurrency(calculationResult.interest)}</span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className="font-black text-slate-800 uppercase text-[8px]">Net Payable</span>
                        <span className="text-[14px] font-black text-indigo-600 leading-none">{formatCurrency(calculationResult.total)}</span>
                      </div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-start gap-1.5">
                      <AlertCircle size={11} className="text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-[8px] text-amber-800 leading-snug">
                        <span className="font-black uppercase">Note: </span>
                        Rate reduced by {calculationResult.penalty}% for early closure.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Member Lookup Modal */}
        {showMemberLookup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl h-4/5 flex flex-col overflow-hidden">
              <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-4 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <User size={14} className="text-indigo-300" />
                  <h2 className="text-[11px] font-black text-white uppercase tracking-wider">Select Member</h2>
                </div>
                <button onClick={() => setShowMemberLookup(false)}
                  className="w-7 h-7 bg-white/10 hover:bg-white/20 text-white rounded-lg flex items-center justify-center transition-colors">
                  <X size={14} />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <MemberLookup isModal={true} onSelect={handleMemberSelect} onClose={() => setShowMemberLookup(false)} />
              </div>
            </div>
          </div>
        )}

      </div>
    </ConfigProvider>
  );
};

export default PrematureInformationSB;
