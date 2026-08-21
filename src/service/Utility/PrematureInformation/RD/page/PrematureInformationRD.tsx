import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calculator,
  User,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { ConfigProvider, Select } from 'antd';
import dayjs from 'dayjs';
import { apiService } from '../../../../../services/api';

interface MemberData {
  memberNo: string;
  name: string;
  basicPay: number;
  officeName: string;
}

interface RdHolder {
  memberNo: string;
  memberName: string;
  accountNumber: string;
  monthlyInstallment: string;
}

interface RDAccountData {
  accountNumber: string;
  memberId: string;
  monthlyInstallment: number;
  interestRate: number;
  startDate: string;
  maturityDate: string;
  tenureMonths: number;
  maturityAmount: number;
  totalDeposited: number;
  installmentsPaid: number;
  status: string;
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

const lbl = "block fz-mini font-black text-slate-500 uppercase tracking-wider mb-0.5";
const inp = "h-7 fz-caption font-semibold bg-white border-slate-300 rounded";

const PrematureInformationRD: React.FC = () => {
  const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
  const [rdAccounts, setRdAccounts] = useState<RDAccountData[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<RDAccountData | null>(null);
  const [calculationResult, setCalculationResult] = useState<PrematureCalculation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // BUG FIX 52: this used to be a free-text Member No. field that only told you
  // "no accounts found" after typing a full member number — worse, it opened a
  // generic member lookup with no RD scoping at all. Loading only members who
  // actually have an active RD account up front makes the dropdown itself the
  // filter, so there's nothing to guess.
  const [rdHolders, setRdHolders] = useState<RdHolder[]>([]);
  const [holdersLoading, setHoldersLoading] = useState(false);

  useEffect(() => {
    setHoldersLoading(true);
    apiService.listRdAccountHolders()
      .then((response: any) => {
        const holders = response?.data?.data || response?.data || [];
        setRdHolders(Array.isArray(holders) ? holders : []);
      })
      .catch(() => setRdHolders([]))
      .finally(() => setHoldersLoading(false));
  }, []);

  const handleMemberSelect = useCallback(async (memberNo: string) => {
    const holder = rdHolders.find(h => h.memberNo === memberNo);
    if (!holder) return;
    const memberData: MemberData = {
      memberNo: holder.memberNo,
      name: holder.memberName,
      basicPay: 0,
      officeName: ''
    };
    setSelectedMember(memberData);
    await fetchRDAccounts(holder.memberNo);
  }, [rdHolders]);

  const fetchRDAccounts = useCallback(async (memberNumber: string) => {
    setLoading(true); setError(null);
    try {
      const response = await apiService.searchRDAccounts(memberNumber);
      if (response.success && response.data && response.data.length > 0) {
        setRdAccounts(response.data.map((a: any) => ({
          ...a,
          monthlyInstallment: parseFloat(a.monthlyInstallment || '0'),
          interestRate: parseFloat(a.interestRate || '0'),
          maturityAmount: parseFloat(a.maturityAmount || '0'),
          totalDeposited: parseFloat(a.totalDeposited || '0'),
          installmentsPaid: parseInt(a.installmentsPaid || '0'),
          tenureMonths: parseInt(a.tenureMonths || '0')
        })));
      } else {
        setRdAccounts([]);
        setError('No RD accounts found for this member.');
        await showDialog('info', 'No RD Accounts', 'No RD accounts were found for this member.');
      }
    } catch { setError('Failed to fetch RD accounts.'); setRdAccounts([]); }
    finally { setLoading(false); }
  }, []);

  const handleAccountSelect = useCallback((accountNo: string) => {
    const account = rdAccounts.find(acc => acc.accountNumber === accountNo);
    if (account) { setSelectedAccount(account); setCalculationResult(null); setError(null); }
  }, [rdAccounts]);

  const calculatePremature = useCallback(async () => {
    if (!selectedAccount) { setError('Please select an RD account first.'); return; }
    setLoading(true); setError(null);
    try {
      const startDate = dayjs(selectedAccount.startDate);
      const monthsCompleted = dayjs().diff(startDate, 'month', true);
      const originalRate = selectedAccount.interestRate;
      const prematureRate = Math.max(0, originalRate - 1.0);
      const estimatedInstallmentsPaid = Math.floor(monthsCompleted);
      const totalDeposited = selectedAccount.monthlyInstallment * estimatedInstallmentsPaid;
      const interestEarned = (totalDeposited * prematureRate * (monthsCompleted / 12)) / 100;
      setCalculationResult({
        duration: Math.floor(monthsCompleted),
        applicableInterestRate: prematureRate,
        balance: totalDeposited,
        product: totalDeposited,
        interest: interestEarned,
        total: totalDeposited + interestEarned,
        penalty: originalRate - prematureRate
      });
    } catch { setError('Failed to calculate premature withdrawal.'); }
    finally { setLoading(false); }
  }, [selectedAccount]);

  const resetData = useCallback(() => {
    setSelectedMember(null); setRdAccounts([]); setSelectedAccount(null);
    setCalculationResult(null); setError(null);
  }, []);

  const resetForm = resetData;

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
              <h1 className="fz-caption font-black text-white tracking-wider uppercase leading-none">RD Premature Information</h1>
              <p className="fz-micro font-bold text-indigo-300 uppercase tracking-widest mt-0.5">Interest Calculation on Early Closure</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={resetForm}
              className="h-7 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-white/20 uppercase tracking-wide">
              <RefreshCw size={11} /> Reset
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col min-h-0 p-2 gap-1.5 overflow-auto">

          {error && (
            <div className="shrink-0 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 flex items-center gap-2 fz-tiny font-semibold text-rose-700">
              <AlertCircle size={12} className="text-rose-500 shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-1.5 flex-1 min-h-0">

            {/* Card 1: Member Selection */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
              <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5 shrink-0">
                <User size={10} className="text-slate-400" />
                <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Member Selection</span>
              </div>
              <div className="p-2.5 space-y-2 flex-1">
                <div>
                  <label className={lbl}>RD Account Holder</label>
                  <Select
                    showSearch
                    value={selectedMember?.memberNo || undefined}
                    onChange={handleMemberSelect}
                    loading={holdersLoading}
                    placeholder={holdersLoading ? 'Loading account holders...' : 'Search member no. or name...'}
                    className="w-full"
                    style={{ height: 28 }}
                    filterOption={(input, option) =>
                      (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    notFoundContent={holdersLoading ? 'Loading...' : 'No members with an active RD account'}
                    options={rdHolders.map(h => ({
                      value: h.memberNo,
                      label: `${h.memberNo} — ${h.memberName} (₹${h.monthlyInstallment}/m)`,
                    }))}
                  />
                </div>
                {selectedMember && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2 space-y-1">
                    <p className="fz-small font-black text-indigo-800 uppercase">{selectedMember.name}</p>
                    <div className="flex gap-3 fz-tiny font-semibold text-indigo-600">
                      <span>No: {selectedMember.memberNo}</span>
                      <span>Pay: ₹{selectedMember.basicPay.toLocaleString('en-IN')}</span>
                    </div>
                    {selectedMember.officeName && (
                      <p className="fz-mini text-indigo-500">{selectedMember.officeName}</p>
                    )}
                  </div>
                )}
                {loading && (
                  <div className="flex items-center gap-2 fz-tiny text-slate-400">
                    <RefreshCw size={10} className="animate-spin" /> Loading...
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: RD Account Information */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
              <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5 shrink-0">
                <Calculator size={10} className="text-slate-400" />
                <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">RD Account Information</span>
              </div>
              <div className="p-2.5 space-y-2 flex-1">
                {selectedMember && rdAccounts.length > 0 ? (
                  <>
                    <div>
                      <label className={lbl}>Select Account</label>
                      <select
                        value={selectedAccount?.accountNumber || ''}
                        onChange={(e) => handleAccountSelect(e.target.value)}
                        className={`${inp} w-full px-2 border focus:outline-none focus:border-indigo-400`}
                      >
                        <option value="">— Select Account —</option>
                        {rdAccounts.map((account) => (
                          <option key={account.accountNumber} value={account.accountNumber}>
                            {account.accountNumber} — ₹{account.monthlyInstallment}/m
                          </option>
                        ))}
                      </select>
                    </div>
                    {selectedAccount && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                        <div>
                          <label className="block fz-micro font-black text-emerald-600 uppercase tracking-wider">Start Date</label>
                          <p className="fz-small font-black text-emerald-900">{dayjs(selectedAccount.startDate).format('DD/MM/YY')}</p>
                        </div>
                        <div>
                          <label className="block fz-micro font-black text-emerald-600 uppercase tracking-wider">Interest Rate</label>
                          <p className="fz-small font-black text-emerald-900">{selectedAccount.interestRate}%</p>
                        </div>
                        <div>
                          <label className="block fz-micro font-black text-emerald-600 uppercase tracking-wider">Installment</label>
                          <p className="fz-small font-black text-emerald-900">₹{selectedAccount.monthlyInstallment}</p>
                        </div>
                        <div>
                          <label className="block fz-micro font-black text-emerald-600 uppercase tracking-wider">Maturity</label>
                          <p className="fz-small font-black text-emerald-900">{dayjs(selectedAccount.maturityDate).format('DD/MM/YY')}</p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-8 text-slate-400">
                    <Calculator size={24} className="mb-2 opacity-30" />
                    <p className="fz-tiny font-semibold italic">
                      {selectedMember ? 'No active RD accounts found' : 'Please select a member first'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Card 3: Actions & Results */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
              <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5 shrink-0">
                <CheckCircle size={10} className="text-slate-400" />
                <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Actions &amp; Results</span>
              </div>
              <div className="p-2.5 space-y-2 flex-1 overflow-auto">
                <div className="flex gap-1.5">
                  <button
                    onClick={calculatePremature}
                    disabled={!selectedAccount || loading}
                    className="flex-1 h-7 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 text-white rounded fz-tiny font-black uppercase tracking-wide flex items-center justify-center gap-1.5 transition-all">
                    {loading ? <RefreshCw size={11} className="animate-spin" /> : <Calculator size={11} />}
                    Calculate
                  </button>
                  <button onClick={resetForm}
                    className="h-7 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded fz-tiny font-black uppercase tracking-wide flex items-center gap-1.5 transition-all">
                    <RefreshCw size={11} /> Reset
                  </button>
                </div>

                {calculationResult && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 text-center">
                        <p className="fz-micro font-black text-blue-600 uppercase tracking-wider">Duration</p>
                        <p className="text-[16px] font-black text-blue-900 leading-none mt-0.5">{calculationResult.duration}<span className="fz-small ml-0.5">m</span></p>
                      </div>
                      <div className="bg-rose-50 border border-rose-100 rounded-lg p-2 text-center">
                        <p className="fz-micro font-black text-rose-600 uppercase tracking-wider">Penalty</p>
                        <p className="text-[16px] font-black text-rose-900 leading-none mt-0.5">{calculationResult.penalty.toFixed(1)}<span className="fz-small ml-0.5">%</span></p>
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1.5 fz-tiny">
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500 font-semibold">Principal Deposited</span>
                        <span className="font-black text-slate-700">{formatCurrency(calculationResult.balance)}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500 font-semibold">Adjusted ROI</span>
                        <span className="font-black text-orange-600">{calculationResult.applicableInterestRate.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500 font-semibold">Accrued Interest</span>
                        <span className="font-black text-emerald-600">{formatCurrency(calculationResult.interest)}</span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className="font-black text-slate-800 uppercase fz-mini">Total Payable</span>
                        <span className="fz-heading font-black text-indigo-600 leading-none">{formatCurrency(calculationResult.total)}</span>
                      </div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-start gap-1.5">
                      <AlertCircle size={11} className="text-amber-500 shrink-0 mt-0.5" />
                      <p className="fz-mini text-amber-800 leading-snug">
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

      </div>
    </ConfigProvider>
  );
};

export default PrematureInformationRD;
