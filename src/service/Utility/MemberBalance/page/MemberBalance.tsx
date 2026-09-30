import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText,
  User,
  X,
  Search,
  RefreshCw,
  Calculator,
  IndianRupee,
  Building2,
  Database,
  ShieldCheck,
  Printer,
  PieChart,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
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
    <div className="app-window">

      {/* Header */}
      <div className="aw-header aw-ambient aw-noprint">
        <div className="min-w-0">
          <h1 className="aw-title">Member Balance</h1>
          <p className="aw-desc">Real-time Financial Position</p>
        </div>
        <div className="aw-actions">
          {isLoading && (
            <span className="aw-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} role="status">
              <RefreshCw size={12} className="aw-spin" /> Syncing Ledger...
            </span>
          )}
          <button type="button" onClick={clearSearch} className="aw-btn aw-btn-secondary">
            <RefreshCw size={13} /> Reset
          </button>
          <button type="button" onClick={() => window.close()} className="aw-icon-btn" aria-label="Close window" data-tip="Close window" data-tip-pos="bottom-end">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="aw-fit">
        <div className="aw-split">

          {/* Sidebar */}
          <div className="aw-side">

            {/* Search Card */}
            <section className="aw-card">
              <div className="aw-card-head">
                <span className="aw-card-icon"><Search size={14} /></span>
                <h2 className="aw-card-title">Member Lookup</h2>
              </div>
              <div className="aw-stack">
                <div className="aw-input-wrap has-icon has-action">
                  <User size={13} />
                  <input type="text" value={memberNumber}
                    onChange={(e) => { setMemberNumber(e.target.value.replace(/[^0-9]/g, '')); setMemberData(null); setBalances([]); setError(null); setIsSearched(false); }}
                    onKeyDown={handleMemberNoKeyDown}
                    placeholder="Member ID..."
                    aria-label="Member ID"
                    className="aw-input"
                  />
                  <button type="button" onClick={handleMemberLookup} className="aw-input-action" aria-label="Search members" data-tip="Search members" data-tip-pos="bottom-end">
                    <Search size={13} />
                  </button>
                </div>
                <button type="button" onClick={() => handleSearch()} disabled={!memberNumber.trim() || isLoading}
                  className="aw-btn aw-btn-primary" style={{ width: '100%' }}>
                  <Database size={13} /> Scan Balance
                </button>
                {error && <div className="aw-alert aw-alert-danger aw-fade-in" role="alert" style={{ marginBottom: 0 }}>{error}</div>}
              </div>
            </section>

            {/* Member Profile */}
            {memberData && (
              <section className="aw-card aw-fade-in">
                <div className="aw-panel aw-panel-accent" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="aw-avatar"><User size={16} /></span>
                  <div className="min-w-0">
                    <p className="aw-strong" style={{ textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{memberData.memberName}</p>
                    <span className="aw-meta">{memberData.memberNo}</span>
                  </div>
                </div>
                <div className="aw-rows" style={{ marginTop: 6 }}>
                  <div className="aw-row">
                    <span className="aw-row-label">Status</span>
                    <span className={`aw-pill ${memberData.isActive ? 'tone-success' : 'tone-danger'}`}>
                      {memberData.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </div>
                  <div className="aw-row">
                    <span className="aw-row-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Building2 size={13} /> Office</span>
                    <span className="aw-row-value" style={{ textTransform: 'uppercase', textAlign: 'right' }}>{memberData.officeName}</span>
                  </div>
                  <div className="aw-row">
                    <span className="aw-row-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><IndianRupee size={13} /> Basic</span>
                    <span className="aw-row-value">₹{parseFloat(memberData.basicPay).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </section>
            )}

            {/* Position Summary */}
            {balances.length > 0 && (
              <section className="aw-card aw-fade-in">
                <div className="aw-card-head">
                  <span className="aw-card-icon"><PieChart size={14} /></span>
                  <h2 className="aw-card-title">Position Summary</h2>
                </div>
                <div className="aw-stack">
                  <div className="aw-stat aw-stat-left tone-success">
                    <div className="aw-stat-head" style={{ justifyContent: 'space-between' }}>
                      <span className="aw-stat-label">Gross Assets</span>
                      <ArrowUpRight size={14} />
                    </div>
                    <div className="aw-stat-value">₹{totalAssets.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="aw-stat aw-stat-left tone-danger">
                    <div className="aw-stat-head" style={{ justifyContent: 'space-between' }}>
                      <span className="aw-stat-label">Gross Liabilities</span>
                      <ArrowDownRight size={14} />
                    </div>
                    <div className="aw-stat-value">₹{totalLiabilities.toLocaleString('en-IN')}</div>
                  </div>
                  <div className={`aw-stat aw-stat-left ${totalBalance >= 0 ? '' : 'tone-danger'}`}>
                    <div className="aw-stat-head" style={{ justifyContent: 'space-between' }}>
                      <span className="aw-stat-label">Net Liquidity</span>
                      <ShieldCheck size={14} />
                    </div>
                    <div className="aw-stat-value">
                      ₹{Math.abs(totalBalance).toLocaleString('en-IN')}
                      <small>{totalBalance >= 0 ? 'Surplus' : 'Deficit'}</small>
                    </div>
                  </div>
                </div>
              </section>
            )}

          </div>

          {/* Main Ledger Panel */}
          <section className="aw-card aw-main">
            <div className="aw-main-head aw-noprint">
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span className="aw-card-icon"><FileText size={14} /></span>
                <div>
                  <h2 className="aw-card-title">Global Ledger Stream</h2>
                  {memberData && <p className="aw-meta">Snapshot: {memberData.balanceDate}</p>}
                </div>
              </div>
              {balances.length > 0 && (
                <button type="button" onClick={() => window.print()} className="aw-btn aw-btn-secondary" data-tip="Print this balance" data-tip-pos="bottom-end">
                  <Printer size={13} /> Print
                </button>
              )}
            </div>

            <div className="aw-main-body">
              {balances.length > 0 ? (
                <div className="aw-fade-in">
                  <table className="aw-table">
                    <thead>
                      <tr>
                        {['Code', 'Account Structure', 'Class', 'Balance'].map((h, i) => (
                          <th key={h} className={i === 3 ? 'is-right' : i === 2 ? 'is-center' : ''}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {balances.map(item => (
                        <tr key={item.code}>
                          <td><span className="aw-code font-mono">{item.code}</span></td>
                          <td>
                            <span style={{ textTransform: 'uppercase' }}>{item.headName}</span>
                            <span className="aw-meta" style={{ textTransform: 'uppercase' }}>Ref_{item.code}</span>
                          </td>
                          <td className="is-center">
                            <span className={`aw-pill ${item.type === 'asset' ? 'tone-success' : 'tone-danger'}`} style={{ textTransform: 'uppercase' }}>
                              {item.type}
                            </span>
                          </td>
                          <td className={`is-right ${item.balance >= 0 ? 'is-success' : 'is-danger'}`}>
                            ₹{Math.abs(item.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            {item.balance < 0 && <span className="aw-meta" style={{ display: 'inline', marginLeft: 4 }}>Dr</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="aw-totals">
                    <div>
                      <span className="aw-label">Computation</span>
                      <span className="aw-strong">Dynamic</span>
                    </div>
                    <div>
                      <span className="aw-label">Final Position</span>
                      <span className={`aw-total-value ${totalBalance >= 0 ? '' : 'tone-danger'}`}>
                        ₹{Math.abs(totalBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        <small>{totalBalance >= 0 ? 'CR' : 'DR'}</small>
                      </span>
                    </div>
                  </div>
                </div>
              ) : isSearched && !isLoading ? (
                <div className="aw-empty" style={{ minHeight: '100%' }}>
                  <Calculator size={40} />
                  <strong className="aw-strong">Zero Balance</strong>
                  <span>{error ? 'System error occurred.' : 'All accounts at zero.'}</span>
                  <button type="button" onClick={clearSearch} className="aw-btn aw-btn-primary" style={{ marginTop: 8 }}>
                    Select Another
                  </button>
                </div>
              ) : (
                <div className="aw-empty" style={{ minHeight: '100%' }}>
                  <Calculator size={48} />
                  <strong className="aw-strong">Sync Member Ledger</strong>
                  <span>Enter <strong style={{ color: 'var(--aw-accent)' }}>Member ID</strong> to initialize balance discovery</span>
                </div>
              )}
            </div>

            <div className="aw-main-foot aw-noprint">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span><i className="aw-status-dot" />Recon Online</span>
                <span>Integrity: <span style={{ color: 'var(--aw-success)' }}>Verified</span></span>
              </div>
              <span className="aw-pill">RECON_V12.1</span>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default MemberBalance;
