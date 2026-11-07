import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calculator,
  User,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { Select } from 'antd';
import dayjs from 'dayjs';
import { apiService } from '../../../../../services/api';
import { useTranslation } from 'react-i18next';
import { showDialog3 as showDialog } from '@/utils/dialog';

interface MemberData {
  memberNo: string;
  name: string;
  basicPay: number;
  officeName: string;
}

interface SbHolder {
  memberNo: string;
  memberName: string;
  accountNumber: string;
  balance: string;
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

const PrematureInformationSB: React.FC = () => {
  const { t } = useTranslation();
  const [selectedMember, setSelectedMember] = useState<MemberData | null>(null);
  const [sbAccounts, setSbAccounts] = useState<SBAccountData[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<SBAccountData | null>(null);
  const [calculationResult, setCalculationResult] = useState<PrematureCalculation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // BUG FIX 52: this used to be a free-text Member No. field that only told you
  // "no accounts found" after typing a full member number, via a generic member
  // lookup with no SB scoping. Loading only members who actually have an SB
  // account up front makes the dropdown itself the filter.
  const [sbHolders, setSbHolders] = useState<SbHolder[]>([]);
  const [holdersLoading, setHoldersLoading] = useState(false);

  useEffect(() => {
    setHoldersLoading(true);
    apiService.listSbAccountHolders()
      .then((response: any) => {
        const holders = response?.data?.data || response?.data || [];
        setSbHolders(Array.isArray(holders) ? holders : []);
      })
      .catch(() => setSbHolders([]))
      .finally(() => setHoldersLoading(false));
  }, []);

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
        await showDialog('info', t('No SB Accounts'), t('No SB accounts were found for this member.'));
      }
    } catch { setError('Failed to fetch SB accounts.'); setSbAccounts([]); }
    finally { setLoading(false); }
  }, []);

  const handleMemberSelect = useCallback(async (memberNo: string) => {
    const holder = sbHolders.find(h => h.memberNo === memberNo);
    if (!holder) return;
    const memberData: MemberData = {
      memberNo: holder.memberNo,
      name: holder.memberName,
      basicPay: 0,
      officeName: ''
    };
    setSelectedMember(memberData);
    await fetchSBAccounts(holder.memberNo);
  }, [sbHolders, fetchSBAccounts]);

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

  const resetForm = resetData;

  const formatCurrency = useMemo(() => (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(amount)
  , []);

  return (
    <div className="app-window">

      {/* Header */}
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">{t('SB Premature Information')}</h1>
          <p className="aw-desc">{t('Saving Bank Early Closure Calculation')}</p>
        </div>
        <div className="aw-actions">
          <button type="button" onClick={resetForm} className="aw-btn aw-btn-secondary">
            <RefreshCw size={13} /> {t('Reset')}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="aw-content">

        {error && (
          <div className="aw-alert aw-alert-danger aw-fade-in" role="alert">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <div className="aw-grid">

          {/* Card 1: Member Selection */}
          <section className="aw-card">
            <div className="aw-card-head">
              <span className="aw-card-icon"><User size={14} /></span>
              <h2 className="aw-card-title">{t('Member Selection')}</h2>
            </div>
            <div className="aw-stack">
              <div>
                <label className="aw-label" htmlFor="psb-holder">{t('SB Account Holder')}</label>
                <Select
                  id="psb-holder"
                  showSearch
                  {...(selectedMember?.memberNo ? { value: selectedMember.memberNo } : {})}
                  onChange={handleMemberSelect}
                  loading={holdersLoading}
                  placeholder={holdersLoading ? t('Loading account holders...') : t('Search member no. or name...')}
                  className="aw-select"
                  popupClassName="aw-select-popup"
                  filterOption={(input, option) =>
                    (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  notFoundContent={holdersLoading ? 'Loading...' : 'No members with an SB account'}
                  options={sbHolders.map(h => ({
                    value: h.memberNo,
                    label: `${h.memberNo} — ${h.memberName} (₹${parseFloat(h.balance).toLocaleString('en-IN')})`,
                  }))}
                />
              </div>
              {selectedMember && (
                <div className="aw-panel aw-panel-accent aw-fade-in">
                  <p className="aw-strong" style={{ textTransform: 'uppercase' }}>{selectedMember.name}</p>
                  <div className="aw-meta" style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                    <span>{t('No: {{1}}', { 1: selectedMember.memberNo })}</span>
                    <span>{t('Pay: ₹{{1}}', { 1: selectedMember.basicPay.toLocaleString('en-IN') })}</span>
                  </div>
                </div>
              )}
              {loading && (
                <div className="aw-meta" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RefreshCw size={12} className="aw-spin" /> {t('Loading...')}
                </div>
              )}
            </div>
          </section>

          {/* Card 2: SB Account Information */}
          <section className="aw-card">
            <div className="aw-card-head">
              <span className="aw-card-icon"><Calculator size={14} /></span>
              <h2 className="aw-card-title">{t('SB Account Information')}</h2>
            </div>
            {selectedMember && sbAccounts.length > 0 ? (
              <div className="aw-stack">
                <div>
                  <label className="aw-label" htmlFor="psb-account">{t('Select Account')}</label>
                  <Select
                    id="psb-account"
                    value={selectedAccount?.accountNumber ?? null}
                    onChange={handleAccountSelect}
                    placeholder="— Select Account —"
                    className="aw-select"
                    popupClassName="aw-select-popup"
                    options={sbAccounts.map((account) => ({
                      value: account.accountNumber,
                      label: `${account.accountNumber} — ₹${account.currentBalance.toLocaleString()}`,
                    }))}
                  />
                </div>
                {selectedAccount && (
                  <dl className="aw-panel aw-facts aw-fade-in">
                    <div>
                      <dt>{t('Opening Date')}</dt>
                      <dd>{dayjs(selectedAccount.openingDate).format('DD/MM/YY')}</dd>
                    </div>
                    <div>
                      <dt>{t('Interest Rate')}</dt>
                      <dd>{selectedAccount.interestRate}%</dd>
                    </div>
                    <div>
                      <dt>{t('Balance')}</dt>
                      <dd>₹{selectedAccount.currentBalance.toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt>{t('Min Balance')}</dt>
                      <dd>₹{selectedAccount.minimumBalance || 1000}</dd>
                    </div>
                  </dl>
                )}
              </div>
            ) : (
              <div className="aw-empty">
                <Calculator size={26} />
                <span>{selectedMember ? t('No SB accounts found') : t('Select a member first')}</span>
              </div>
            )}
          </section>

          {/* Card 3: Actions & Results */}
          <section className="aw-card">
            <div className="aw-card-head">
              <span className="aw-card-icon"><CheckCircle size={14} /></span>
              <h2 className="aw-card-title">{t('Actions & Results')}</h2>
            </div>
            <div className="aw-stack">
              <button
                type="button"
                onClick={calculatePremature}
                disabled={!selectedAccount || loading}
                className="aw-btn aw-btn-primary"
                style={{ width: '100%' }}>
                {loading ? <RefreshCw size={13} className="aw-spin" /> : <Calculator size={13} />}
                {t('Calculate')}
              </button>

              {calculationResult ? (
                <div className="aw-stack aw-fade-in">
                  <div className="aw-stats">
                    <div className="aw-stat tone-info">
                      <div className="aw-stat-label">{t('Duration')}</div>
                      <div className="aw-stat-value">{calculationResult.duration}<small>days</small></div>
                    </div>
                    <div className="aw-stat tone-danger">
                      <div className="aw-stat-label">{t('Penalty')}</div>
                      <div className="aw-stat-value">{calculationResult.penalty.toFixed(1)}<small>%</small></div>
                    </div>
                  </div>
                  <div className="aw-panel aw-rows">
                    <div className="aw-row">
                      <span className="aw-row-label">{t('Account Balance')}</span>
                      <span className="aw-row-value">{formatCurrency(calculationResult.balance)}</span>
                    </div>
                    <div className="aw-row">
                      <span className="aw-row-label">{t('Applied Rate')}</span>
                      <span className="aw-row-value">{calculationResult.applicableInterestRate.toFixed(2)}%</span>
                    </div>
                    <div className="aw-row">
                      <span className="aw-row-label">{t('Interest Earned')}</span>
                      <span className="aw-row-value" style={{ color: 'var(--aw-success)' }}>{formatCurrency(calculationResult.interest)}</span>
                    </div>
                    <div className="aw-row aw-row-total">
                      <span className="aw-row-label">{t('Net Payable')}</span>
                      <span className="aw-row-value">{formatCurrency(calculationResult.total)}</span>
                    </div>
                  </div>
                  <div className="aw-alert aw-alert-warning" style={{ marginBottom: 0 }}>
                    <AlertCircle size={14} />
                    <span>
                      <strong>{t('Note:')} </strong>
                      {t('Rate reduced by')} {calculationResult.penalty}% for early closure.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="aw-empty">
                  <CheckCircle size={26} />
                  <span>{selectedAccount ? t('Press Calculate to see the result') : t('Select an account to calculate')}</span>
                </div>
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default PrematureInformationSB;
