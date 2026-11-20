import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Banknote, Calculator as CalcIcon, Gavel, Landmark, PiggyBank, RefreshCw, ShieldCheck, TrendingDown, Users } from 'lucide-react';
import { apiService } from '../../../../services/api';
import LoanEmiTab from '../tabs/LoanEmiTab';
import ClosureTab from '../tabs/ClosureTab';
import ScratchPadTab from '../tabs/ScratchPadTab';
import { DepositsTab, FundsTab, MemberMoneyTab, PenaltyTab } from '../tabs/FormTabs';
import type { CalculatorRules } from '../lib/types';

/**
 * Society Calculator (ES-525). One window for every what-if figure staff need. Nothing is saved or posted and no member is
 * needed. All maths runs on the server with the same functions the real screens use; this window only collects inputs and
 * shows results next to the live Business Rules they were worked out with.
 *
 * To add a calculator: write the tab component, add one line to TABS. Later phases (ES-527..530) extend this list.
 */
interface TabDef {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  Component: React.ComponentType<{ rules: CalculatorRules | null }>;
}

const TABS: TabDef[] = [
  { id: 'loan-emi', label: 'Loan EMI', icon: Banknote, Component: LoanEmiTab },
  { id: 'closure', label: 'Loan Closure', icon: TrendingDown, Component: ClosureTab },
  { id: 'penalty', label: 'Penalty', icon: Gavel, Component: PenaltyTab },
  { id: 'deposits', label: 'Deposit Interest', icon: Landmark, Component: DepositsTab },
  { id: 'member', label: 'Eligibility & Payout', icon: Users, Component: MemberMoneyTab },
  { id: 'funds', label: 'Dividend, Insurance, Score', icon: PiggyBank, Component: FundsTab },
  { id: 'scratch', label: 'Scratch-pad', icon: CalcIcon, Component: ScratchPadTab },
];

const SocietyCalculator: React.FC = () => {
  const { t } = useTranslation();
  const [active, setActive] = useState(TABS[0]!.id);
  const [rules, setRules] = useState<CalculatorRules | null>(null);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [loadingRules, setLoadingRules] = useState(false);

  const loadRules = useCallback(async () => {
    setLoadingRules(true);
    const res: any = await apiService.getSocietyCalculatorRules();
    if (res?.success && res.data) { setRules(res.data as CalculatorRules); setRulesError(null); }
    else setRulesError(res?.error || res?.message || t('Could not load the live Business Rules.'));
    setLoadingRules(false);
  }, [t]);

  useEffect(() => { loadRules(); }, [loadRules]);

  const Tab = TABS.find((x) => x.id === active) ?? TABS[0]!;
  const slotText = rules ? `${rules.slot.startDay}th-${rules.slot.endDay}th = Slot 1` : '';

  return (
    <div className="app-window aw-calm">
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">{t('Society Calculator')}</h1>
          <p className="aw-desc">{t('What-if figures with the society\'s own rules. Nothing is saved.')}</p>
        </div>
        <div className="aw-actions">
          {loadingRules && (
            <span className="aw-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }} role="status">
              <RefreshCw size={12} className="aw-spin" /> {t('Loading rules...')}
            </span>
          )}
          <button type="button" onClick={loadRules} className="aw-btn aw-btn-secondary" data-tip={t('Read the Business Rules again')}>
            <RefreshCw size={13} /> {t('Refresh rules')}
          </button>
        </div>
      </div>

      {/* Live Business Rules in force: a user can see which rates the figures were worked out with */}
      <div className="aw-chips" style={{ padding: '0 var(--aw-pad) 8px', flexWrap: 'wrap' }} aria-label={t('Live Business Rules')}>
        {rules ? (
          <>
            <span className="aw-pill"><ShieldCheck size={11} style={{ marginRight: 4 }} />{t('Live rules')}</span>
            <span className="aw-pill">{t('Regular')} {rules.loanTypes.RLN.rate}%</span>
            <span className="aw-pill">{t('Emergency')} {rules.loanTypes.ALN.rate}%</span>
            <span className="aw-pill">{t('Against RD')} {rules.loanTypes.ELN.rate}%</span>
            <span className="aw-pill">{slotText}</span>
            <span className="aw-pill">{t('Grace day')} {rules.loanTypes.RLN.graceDays}</span>
            <span className="aw-pill">{t('Penalty')} {rules.penaltyEnabled ? `${rules.loanTypes.RLN.penalRate}%/yr` : t('off')}</span>
            <span className="aw-pill">{t('Rounding')} {rules.roundingMode}</span>
          </>
        ) : (
          rulesError && (
            <div className="aw-alert aw-alert-warning" role="alert" style={{ width: '100%' }}>
              <AlertCircle size={14} />
              <span>{rulesError} {t('Figures use the built-in defaults until the rules load.')}</span>
            </div>
          )
        )}
      </div>

      {TABS.length > 1 && (
        <div className="aw-tabs" role="tablist">
          {TABS.map((tab) => (
            <button key={tab.id} type="button" role="tab" aria-selected={active === tab.id} onClick={() => setActive(tab.id)} className="aw-tab">
              <tab.icon size={13} />{t(tab.label)}
            </button>
          ))}
        </div>
      )}

      <div className="aw-fit">
        <Tab.Component rules={rules} />
      </div>
    </div>
  );
};

export default SocietyCalculator;
