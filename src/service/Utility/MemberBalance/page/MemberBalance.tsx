import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText,
  User,
  AlertCircle,
  X,
  Search,
  RefreshCw,
  Calculator,
  TrendingUp,
  IndianRupee,
  Building2,
  Database,
  ShieldCheck,
  Printer,
  PieChart,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { ConfigProvider, Spin } from 'antd';
import { API_ROUTES, getApiBaseUrl } from '../../../../services/apiVersionConfig';

interface BalanceItem {
  code: string;
  headName: string;
  balance: number;
  type: 'asset' | 'liability';
}

interface MemberBalanceData {
  memberNo: string;
  memberName: string;
  officeName: string;
  basicPay: string;
  isActive: boolean;
  regularLoanBalance: string;
  emergencyLoanBalance: string;
  totalLoanBalance: string;
  membershipDeposit: string;
  compulsoryDeposit: string;
  shareAmount: string;
  fixedDepositBalance: string;
  recurringDepositBalance: string;
  savingsBankBalance: string;
  suspenseBalance: string;
  totalAssets: string;
  totalLiabilities: string;
  netBalance: string;
  balanceItems?: BalanceItem[];
  balanceDate: string;
}

const showDialog = async (type: 'info' | 'warning' | 'error', msg: string, detail: string): Promise<void> => {
  if ((window as any).electronAPI?.showMessageBox) {
    await (window as any).electronAPI.showMessageBox({ type, title: 'electron-react-ts', message: msg, detail, buttons: ['OK'], defaultId: 0 });
  } else { alert(`[${type.toUpperCase()}] ${msg}\n\n${detail}`); }
};

const MemberBalance: React.FC = () => {
  const [memberNumber, setMemberNumber] = useState('');
  const [memberData, setMemberData] = useState<MemberBalanceData | null>(null);
  const [balances, setBalances] = useState<BalanceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSearched, setIsSearched] = useState(false);
  const [lastSpaceTime, setLastSpaceTime] = useState<number>(0);

  const handleMemberLookup = useCallback(() => {
    if (window.electronAPI?.openNewWindow) window.electronAPI.openNewWindow('/common/member-lookup');
  }, []);

  const handleMemberNoKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const now = Date.now();
    if (e.key === ' ') {
      if (now - lastSpaceTime < 500) { e.preventDefault(); handleMemberLookup(); setLastSpaceTime(0); }
      else setLastSpaceTime(now);
    } else if (e.key === 'Enter' && memberNumber.trim()) handleSearch();
  }, [lastSpaceTime, memberNumber, handleMemberLookup]);

  const clearSearch = useCallback(() => {
    setMemberNumber(''); setMemberData(null); setBalances([]); setError(null); setIsSearched(false);
  }, []);

  const handleSearch = useCallback(async (searchMemberNo?: string) => {
    const mbNo = searchMemberNo || memberNumber;
    if (!mbNo.trim()) { setError('Please enter a member number'); return; }
    setIsLoading(true); setError(null); setIsSearched(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${await getApiBaseUrl()}${API_ROUTES.members.balance(mbNo)}`, {
        headers: { ...(token && { 'Authorization': `Bearer ${token}` }), 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const result = await res.json();

      let bd: MemberBalanceData;
      if (result.success && result.data) {
        const d = result.data;
        bd = {
          memberNo: d.memberInfo.memberNo, memberName: d.memberInfo.memberName, officeName: d.memberInfo.officeName,
          basicPay: d.memberInfo.basicPay?.toString() || '0', isActive: d.memberInfo.isActive,
          membershipDeposit: '0', compulsoryDeposit: '0', shareAmount: '0', fixedDepositBalance: '0',
          recurringDepositBalance: '0', savingsBankBalance: '0', suspenseBalance: '0',
          regularLoanBalance: d.loans?.balances?.RLN?.toString() || '0',
          emergencyLoanBalance: d.loans?.balances?.ELN?.toString() || '0',
          totalLoanBalance: d.loans?.totalBalance?.toString() || '0',
          totalAssets: d.summary?.totalAssets?.toString() || '0',
          totalLiabilities: d.summary?.totalLiabilities?.toString() || '0',
          netBalance: d.summary?.netBalance?.toString() || '0',
          balanceItems: d.balanceItems || [],
          balanceDate: new Date().toISOString().split('T')[0]
        };
      } else { bd = result; }

      setMemberData(bd);

      let items: BalanceItem[] = [];
      if (bd.balanceItems && bd.balanceItems.length > 0) {
        items = bd.balanceItems.filter(i => i.balance !== 0);
        items.forEach(i => {
          if (i.code === 'SH') bd.shareAmount = Math.abs(i.balance).toString();
          if (i.code === 'CD') bd.compulsoryDeposit = Math.abs(i.balance).toString();
          if (i.code === 'RD') bd.recurringDepositBalance = Math.abs(i.balance).toString();
          if (i.code === 'RLN') bd.regularLoanBalance = Math.abs(i.balance).toString();
          if (i.code === 'ELN') bd.emergencyLoanBalance = Math.abs(i.balance).toString();
        });
      } else {
        const raw = [
          { code: 'MD', headName: 'Membership Deposit', balance: parseFloat(bd.membershipDeposit), type: 'asset' as const },
          { code: 'CD', headName: 'Compulsory Deposit', balance: parseFloat(bd.compulsoryDeposit), type: 'asset' as const },
          { code: 'SH', headName: 'Share Amount', balance: parseFloat(bd.shareAmount), type: 'asset' as const },
          { code: 'FD', headName: 'Fixed Deposit', balance: parseFloat(bd.fixedDepositBalance), type: 'asset' as const },
          { code: 'RD', headName: 'Recurring Deposit', balance: parseFloat(bd.recurringDepositBalance), type: 'asset' as const },
          { code: 'SB', headName: 'Savings Bank', balance: parseFloat(bd.savingsBankBalance || '0'), type: 'asset' as const },
          { code: 'RLN', headName: 'Regular Loan', balance: -parseFloat(bd.regularLoanBalance), type: 'liability' as const },
          { code: 'ELN', headName: 'Emergency Loan', balance: -parseFloat(bd.emergencyLoanBalance), type: 'liability' as const },
          { code: 'SUSP', headName: 'Suspense Balance', balance: parseFloat(bd.suspenseBalance), type: 'asset' as const }
        ];
        items = raw.filter(i => i.balance !== 0);
        if (items.length === 0 && parseFloat(bd.totalLoanBalance) > 0)
          items.push({ code: 'LOAN', headName: 'Total Loans', balance: -parseFloat(bd.totalLoanBalance), type: 'liability' });
      }
      setBalances(items);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch member balance'); setMemberData(null); setBalances([]);
      await showDialog('error', 'Lookup Failed', `Could not fetch balance for member ${mbNo}. The member may not exist, or the server is unreachable.`);
    } finally { setIsLoading(false); }
  }, [memberNumber]);

  const totalBalance = useMemo(() => balances.reduce((s, i) => s + i.balance, 0), [balances]);
  const totalAssets = useMemo(() => balances.filter(i => i.type === 'asset').reduce((s, i) => s + i.balance, 0), [balances]);
  const totalLiabilities = useMemo(() => Math.abs(balances.filter(i => i.type === 'liability').reduce((s, i) => s + i.balance, 0)), [balances]);

  useEffect(() => {
    if (window.electronAPI) {
      const handler = (_: any, data: any) => { setMemberNumber(data.memberNo); handleSearch(data.memberNo); };
      window.electronAPI.ipcRenderer?.on('member-selected', handler);
      return () => { window.electronAPI.ipcRenderer?.removeAllListeners('member-selected'); };
    }
  }, [handleSearch]);

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
              <h1 className="fz-caption font-black text-white tracking-wider uppercase leading-none">Member Balance</h1>
              <p className="fz-micro font-bold text-indigo-300 uppercase tracking-widest mt-0.5">Real-time Financial Position</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={clearSearch} className="h-7 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg fz-tiny font-black transition-all flex items-center gap-1.5 border border-white/20 uppercase tracking-wide">
              <RefreshCw size={11} /> Reset
            </button>
            <button onClick={() => window.close()} className="w-7 h-7 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg flex items-center justify-center transition-all">
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Body */}
        <Spin spinning={isLoading} tip="Syncing Ledger...">
          <div className="flex-1 overflow-hidden p-2">
            <div className="h-full grid grid-cols-12 gap-2">

              {/* Sidebar */}
              <div className="col-span-3 space-y-2 overflow-y-auto pr-0.5">

                {/* Search Card */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                  <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                    <Search size={10} className="text-slate-400" />
                    <span className="fz-mini font-black text-slate-500 uppercase tracking-widest">Member Lookup</span>
                  </div>
                  <div className="p-2 space-y-1.5">
                    <div className="relative">
                      <User size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" value={memberNumber}
                        onChange={(e) => { setMemberNumber(e.target.value.replace(/[^0-9]/g, '')); setMemberData(null); setBalances([]); setError(null); setIsSearched(false); }}
                        onKeyDown={handleMemberNoKeyDown}
                        placeholder="MEMBER ID..."
                        className="w-full h-7 pl-7 pr-8 fz-small font-bold bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-indigo-400 text-slate-700"
                      />
                      <button onClick={handleMemberLookup}
                        className="absolute right-0.5 top-0.5 w-6 h-6 bg-indigo-600 text-white rounded flex items-center justify-center hover:bg-indigo-500 transition-colors">
                        <Search size={10} />
                      </button>
                    </div>
                    <button onClick={() => handleSearch()} disabled={!memberNumber.trim() || isLoading}
                      className="w-full h-7 bg-slate-900 hover:bg-indigo-600 disabled:bg-slate-200 text-white rounded fz-tiny font-black uppercase tracking-wide flex items-center justify-center gap-1.5 transition-all">
                      <Database size={11} /> Scan Balance
                    </button>
                    {error && <div className="fz-mini font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded px-2 py-1">{error}</div>}
                  </div>
                </div>

                {/* Member Profile */}
                {memberData && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-indigo-900 px-3 py-2 flex items-center gap-2">
                      <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center border border-white/10">
                        <User size={13} className="text-white" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="fz-tiny font-black text-white uppercase truncate">{memberData.memberName}</h4>
                        <span className="fz-mini font-bold text-indigo-300 italic">{memberData.memberNo}</span>
                      </div>
                    </div>
                    <div className="p-2 space-y-1.5 fz-tiny">
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-400 uppercase">Status</span>
                        <span className={`px-1.5 py-0.5 rounded-full font-black uppercase fz-mini ${memberData.isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                          {memberData.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Building2 size={10} className="text-slate-400" />
                        <span className="font-semibold text-slate-600 uppercase fz-mini truncate">{memberData.officeName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <IndianRupee size={10} className="text-emerald-500" />
                        <span className="font-black text-slate-800">₹{parseFloat(memberData.basicPay).toLocaleString('en-IN')} Basic</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Position Summary */}
                {balances.length > 0 && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-2.5 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <PieChart size={10} className="text-indigo-600" />
                      <span className="fz-mini font-black text-indigo-900 uppercase tracking-widest">Position Summary</span>
                    </div>
                    <div className="bg-white/60 rounded-lg p-1.5 border border-indigo-100">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="fz-mini font-black text-slate-400 uppercase">Gross Assets</span>
                        <ArrowUpRight size={11} className="text-emerald-500" />
                      </div>
                      <span className="fz-caption font-black text-emerald-600">₹{totalAssets.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="bg-white/60 rounded-lg p-1.5 border border-indigo-100">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="fz-mini font-black text-slate-400 uppercase">Gross Liabilities</span>
                        <ArrowDownRight size={11} className="text-red-500" />
                      </div>
                      <span className="fz-caption font-black text-red-600">₹{totalLiabilities.toLocaleString('en-IN')}</span>
                    </div>
                    <div className={`rounded-lg p-1.5 ${totalBalance >= 0 ? 'bg-indigo-600' : 'bg-red-600'}`}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="fz-mini font-black text-white/60 uppercase">Net Liquidity</span>
                        <ShieldCheck size={10} className="text-white/60" />
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-black text-white">₹{Math.abs(totalBalance).toLocaleString('en-IN')}</span>
                        <span className="fz-mini font-bold text-white/70 italic">{totalBalance >= 0 ? 'Surplus' : 'Deficit'}</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Main Ledger Panel */}
              <div className="col-span-9 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="bg-slate-900 px-3 py-2 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <FileText size={12} className="text-indigo-400" />
                    <div>
                      <h2 className="fz-tiny font-black text-white uppercase tracking-wider">Global Ledger Stream</h2>
                      {memberData && <p className="fz-mini font-bold text-indigo-300 italic mt-0.5">Snapshot: {memberData.balanceDate}</p>}
                    </div>
                  </div>
                  {balances.length > 0 && (
                    <button onClick={() => window.print()}
                      className="h-6 px-2 bg-white/5 hover:bg-white/10 text-white rounded fz-mini font-black uppercase flex items-center gap-1.5 border border-white/5 transition-all">
                      <Printer size={10} className="text-indigo-400" /> Print
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto">
                  {balances.length > 0 ? (
                    <div className="p-3">
                      <table className="w-full text-left border-separate border-spacing-y-1">
                        <thead>
                          <tr>
                            {['Code', 'Account Structure', 'Class', 'Balance'].map((h, i) => (
                              <th key={h} className={`px-3 pb-2 fz-mini font-black text-slate-400 uppercase tracking-wider ${i === 3 ? 'text-right' : i === 2 ? 'text-center' : ''}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {balances.map(item => (
                            <tr key={item.code} className="group bg-slate-50/50 hover:bg-white hover:shadow-md transition-all">
                              <td className="px-3 py-2 rounded-l-lg">
                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-100 group-hover:border-indigo-200 shadow-sm">
                                  <span className="fz-tiny font-black text-indigo-600 font-mono">{item.code}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <p className="fz-small font-black text-slate-700 uppercase group-hover:text-indigo-700 transition-colors">{item.headName}</p>
                                <p className="fz-mini font-bold text-slate-400 uppercase">Ref_{item.code}</p>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className={`px-2 py-0.5 rounded-full fz-micro font-black uppercase border ${item.type === 'asset' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                  {item.type}
                                </span>
                              </td>
                              <td className="px-3 py-2 rounded-r-lg text-right">
                                <span className={`fz-caption font-black ${item.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                  ₹{Math.abs(item.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  {item.balance < 0 && <span className="fz-mini ml-0.5 opacity-60">Dr</span>}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-6 px-3">
                        <div className="text-right">
                          <label className="fz-mini font-black text-slate-400 uppercase tracking-wider block mb-0.5">Computation</label>
                          <span className="fz-tiny font-bold text-slate-600">Dynamic</span>
                        </div>
                        <div className="text-right border-l border-slate-100 pl-6">
                          <label className="fz-mini font-black text-indigo-600 uppercase tracking-wider block mb-0.5">Final Position</label>
                          <div className="flex items-baseline gap-1.5 justify-end">
                            <span className={`text-lg font-black ${totalBalance >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                              ₹{Math.abs(totalBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="fz-tiny font-black text-slate-400 uppercase">{totalBalance >= 0 ? 'CR' : 'DR'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : isSearched && !isLoading ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8">
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-4">
                        <Calculator className="w-10 h-10 text-slate-200 mx-auto" />
                      </div>
                      <h3 className="text-sm font-black text-slate-800 uppercase mb-1">Zero Balance</h3>
                      <p className="fz-tiny text-slate-400 font-bold uppercase">{error ? 'System error occurred.' : 'All accounts at zero.'}</p>
                      <button onClick={clearSearch} className="mt-4 px-4 py-1.5 bg-indigo-600 text-white rounded-lg fz-tiny font-black uppercase hover:bg-indigo-500 transition-all">
                        Select Another
                      </button>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8">
                      <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 mb-4">
                        <Calculator className="w-16 h-16 text-slate-200 mx-auto" />
                      </div>
                      <h3 className="text-base font-black text-slate-800 uppercase mb-2">Sync Member Ledger</h3>
                      <p className="fz-tiny text-slate-400 font-black uppercase max-w-xs leading-relaxed">
                        Enter <span className="text-indigo-600">Member ID</span> to initialize balance discovery
                      </p>
                    </div>
                  )}
                </div>

                <div className="px-3 py-1.5 bg-white border-t border-slate-100 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3 fz-mini font-black text-slate-400 uppercase">
                    <span className="flex items-center gap-1"><div className="w-1 h-1 bg-indigo-500 rounded-full animate-pulse" /> Recon Online</span>
                    <span>Integrity: <span className="text-emerald-500">Verified</span></span>
                  </div>
                  <span className="fz-mini font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">RECON_V12.1</span>
                </div>
              </div>

            </div>
          </div>
        </Spin>

        <style>{`
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
          @media print {
            .h-screen { height: auto !important; overflow: visible !important; }
            .overflow-hidden { overflow: visible !important; }
            .shrink-0, button { display: none !important; }
            .bg-slate-900 { background: #0f172a !important; color-adjust: exact; }
          }
        `}</style>
      </div>
    </ConfigProvider>
  );
};

export default MemberBalance;
