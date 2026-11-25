// page/ModifyBusinessRules.tsx

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Upload, Download,
  IndianRupee, Calculator, ShieldCheck, Settings,
  Database, TrendingUp, Building2,
  Save, Info, Trash2, Plus, X, Clock, RefreshCw, Search,
} from 'lucide-react';
import './ModifyBusinessRules.css';
import { Select, Radio } from 'antd';
import { useBusinessRules, BusinessRulesData, GeneralSettings, LoanType, RdSystemRules } from '../hook/useBusinessRules';
import { buildProfileFile, parseProfileFile, PROFILE_MAX_BYTES, ProfileParseResult } from '../util/rulesProfile';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';
import { useTranslation } from 'react-i18next';
import { showDialog4 as showDialog, notifyError } from '@/utils/dialog';

/**
 * Drop-in replacement for <NumInput>. Keeps the raw text while the
 * user types so clearing the field (Backspace) does not snap back to "0".
 * The parent still receives the normal change event and commits its number.
 */
const NumInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ value, onChange, onBlur, ...rest }) => {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft !== null && (parseFloat(draft) || 0) === (Number(value) || 0) ? draft : value;
  return (
    <input
      {...rest}
      type="number"
      value={shown}
      onChange={e => { setDraft(e.target.value); onChange?.(e); }}
      onBlur={e => { setDraft(null); onBlur?.(e); }}
    />
  );
};

const closeWindow = () => {
  const api = (window as any).electronAPI;
  if (api?.ipcRenderer?.send) api.ipcRenderer.send('window-close');
  else window.close();
};

/**
 * Human-readable day windows for the two loan slots, derived from Slot 1's
 * configured window alone. Slot 2 is always the complement, so its label is
 * computed rather than configured — there is no way to describe a gap or an
 * overlap between them. Handles the wrapping case (25–5) the society's
 * original window uses, and the degenerate case where Slot 1 covers the whole
 * month.
 */
const slotWindowLabels = (startDay: number, endDay: number): { slot1: string; slot2: string } => {
  const s = Math.min(31, Math.max(1, Math.trunc(startDay) || 1));
  const e = Math.min(31, Math.max(1, Math.trunc(endDay) || 1));
  const slot1 = `${s}–${e}`;
  // Slot 1 wrapping (25–5) leaves a contiguous middle for Slot 2 (6–24);
  // a plain Slot 1 range (1–10) leaves a wrapping remainder (11–1 of the
  // next month), written the same inclusive way.
  if (s === 1 && e >= 31) return { slot1, slot2: 'none — Slot 1 covers the whole month' };
  const s2 = e >= 31 ? 1 : e + 1;
  const e2 = s <= 1 ? 31 : s - 1;
  return { slot1, slot2: `${s2}–${e2}` };
};

// Reasons shown on settings that do not drive anything yet. Such a setting is greyed out and locked so
// nobody changes it believing it takes effect (audit ES-53).
const NOT_USED = 'Not in use: this value is saved, but the application does not use it yet.';
const CALC_ONLY = 'Calculator only: shown on the Calculator screen, it does not limit any loan.';
const NO_GUARANTOR_CHECK = 'Not in use: the number of guarantors is not checked anywhere yet.';
const LOOKUP_ONLY = 'Display only: shown in an account lookup, it is not enforced.';
const ALWAYS_ON = 'Always on: a loan against RD is secured by a lock on the member\'s RD, so its limit check (90% of RD, the per-member maximum) cannot be switched off.';

const UnusedTag: React.FC<{ reason: string }> = ({ reason }) => {
  const { t } = useTranslation();
  return (
  <span className="aw-pill tone-muted" style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, textTransform: 'none', letterSpacing: 0 }} title={reason}>
    {reason.startsWith('Always') ? t('Always on') : reason.startsWith('Calculator') ? t('Calculator only') : reason.startsWith('Display') ? t('Display only') : t('Not in use')}
  </span>
);
};

// ── Navigation structure ──
// Five top tabs; each (except "Not in use") has a small section list in the left sidebar.
type TabKey = 'loans' | 'rd' | 'fund' | 'ops' | 'unused';

const TAB_SECTIONS: Record<Exclude<TabKey, 'unused'>, Array<{ key: string; label: string; blurb: string }>> = {
  loans: [
    { key: 'loans/types', label: 'Loan Types', blurb: 'Amount limit, interest rate, instalments and guarantors for each kind of loan.' },
    { key: 'loans/eligibility', label: 'Eligibility', blurb: 'RD and share requirements a member must meet, and what happens on a shortfall.' },
    { key: 'loans/penalties', label: 'Penalties & Grace', blurb: 'Late-payment rules for each loan type, side by side.' },
    { key: 'loans/slots', label: 'Slots & EMI', blurb: 'Which application days fall in which slot, and how EMIs are rounded.' },
    { key: 'loans/closure', label: 'Early Closure', blurb: 'Safeguards and grace handling when a loan is closed early.' },
    { key: 'loans/reagreement', label: 'Re-agreement', blurb: 'Optional guard-rails for restructuring an active loan. 0 means no limit.' },
  ],
  rd: [
    { key: 'rd/core', label: 'Core RD', blurb: 'Minimum contribution, opening-balance interest and withdrawal floor.' },
    { key: 'rd/thresholds', label: 'Full-Interest Thresholds', blurb: "Payment-pattern rules that decide who earns full annual interest." },
  ],
  fund: [
    { key: 'fund/fund', label: 'Fund Parameters', blurb: 'Annual fund interest, dividend payout and group insurance.' },
    { key: 'fund/dividend', label: 'Dividend Rate Rules', blurb: 'Tick a rule to make it active. Only active rules apply when a dividend is calculated.' },
    { key: 'fund/chart', label: 'Interest Chart', blurb: 'Yearly interest for each monthly-contribution slab.' },
  ],
  ops: [
    { key: 'ops/dayend', label: 'Day-End', blurb: 'Nightly close of the day book.' },
    { key: 'ops/import', label: 'Demand Import', blurb: 'How strictly the Import Demand List treats a file with problems.' },
    { key: 'ops/heads', label: 'Ledger Heads', blurb: 'System ledger heads used for posting.' },
  ],
};

const TAB_LABELS: Record<TabKey, string> = { loans: 'Loans', rd: 'Deposits (RD)', fund: 'Dividend & Fund', ops: 'Operations', unused: 'Not in use' };
const TAB_ORDER: TabKey[] = ['loans', 'rd', 'fund', 'ops', 'unused'];
const sectionLabel = (key: string): string => {
  const [tab, sec] = key.split('/') as [TabKey, string];
  if (tab === 'unused') return TAB_LABELS.unused;
  const s = TAB_SECTIONS[tab]?.find(x => x.key === key);
  return `${TAB_LABELS[tab]} › ${s?.label ?? sec}`;
};
// Settings the application saves but does not use yet (shown locked on the "Not in use" tab).
const UNUSED_COUNT = 25;

// Which section a stored setting is shown in (also drives the unsaved-change counts).
const sectionOf = (path: string): string => {
  const [root, field = ''] = path.split('.');
  switch (root) {
    case 'regularLoan': case 'additionalLoan': case 'emergencyLoan':
      return ['penalRate', 'graceDays', 'sameMonthPenalPercent', 'sameMonthPenalDivisor'].includes(field) ? 'loans/penalties' : 'loans/types';
    case 'mediumTermLoan': case 'loanOnDeposit': return 'unused/all';
    case 'loanAgainstDeposits': return field === 'fdPercentage' ? 'loans/types' : 'unused/all';
    case 'regularLoanEligibility': return 'loans/eligibility';
    case 'loanSlotDelay': case 'loanRounding': case 'oldEmiFlag': return 'loans/slots';
    case 'earlyClosureProtection': return 'loans/closure';
    case 'loanReagreement': return 'loans/reagreement';
    case 'rdSystem': return ['minMonthlyAmount', 'openingBalanceRate', 'minBalanceAfterWithdrawal'].includes(field) ? 'rd/core' : 'rd/thresholds';
    case 'fundManagement':
      if (field === 'interestChart') return 'fund/chart';
      return ['fundInterestRate', 'dividendPercent', 'groupInsuranceAmount'].includes(field) ? 'fund/fund' : 'fund/dividend';
    case 'generalSettings':
      if (field === 'tieredLoanPenaltiesEnabled') return 'loans/penalties';
      if (field === 'autoDayEndCloseEnabled') return 'ops/dayend';
      if (field === 'demandImportStrictness') return 'ops/import';
      if (field === 'profitHead') return 'ops/heads';
      return 'unused/all';
    default: return 'unused/all';
  }
};

// Search index: [setting name, section, extra words people might type]
const SEARCH_INDEX: Array<[string, string, string]> = [
  ['Max. amount', 'loans/types', 'limit loan amount'], ['Rate (%)', 'loans/types', 'interest rate'], ['No. of instalments', 'loans/types', 'emi installments'],
  ['FD (%) — borrowable share of RD', 'loans/types', 'loan against rd deposit'],
  ['Max. Regular Loan Limit', 'loans/eligibility', 'maximum'], ['RD Req. (%)', 'loans/eligibility', 'recurring deposit requirement'], ['Share Req. (%)', 'loans/eligibility', 'share capital requirement'],
  ['Shortfall Handling', 'loans/eligibility', 'deduct block ignore'], ['Limit Calculation', 'loans/eligibility', 'outstanding'], ['RD Head Code', 'loans/eligibility', 'ledger'], ['Share Head Code', 'loans/eligibility', 'ledger'],
  ['Apply eligibility to Regular / Emergency / RD loan', 'loans/eligibility', 'switch'],
  ['Penal Rate (% p.a.)', 'loans/penalties', 'penalty late'], ['Grace Ends (day of month)', 'loans/penalties', 'grace days'], ['Same-Month Late Fee (%)', 'loans/penalties', 'penalty fee'], ['Same-Month Fee Divisor', 'loans/penalties', 'penalty'],
  ['Tiered penalties for all loans', 'loans/penalties', 'tier'], ['Loan interest method', 'loans/penalties', 'reducing balance'],
  ['Slot 1 window — from / to day', 'loans/slots', 'application day'], ['Slot 1 / Slot 2 delay', 'loans/slots', 'months first due'], ['Loan rounding (EMI & closure)', 'loans/slots', 'nearest up down paisa'], ['Old EMI check range', 'loans/slots', 'consolidation flag tolerance'],
  ['Require typing the loan case number', 'loans/closure', 'early closure confirm'], ['Pass a held early closure automatically', 'loans/closure', 'auto pass emi'], ['Apply the grace period in a loan closure', 'loans/closure', 'grace'],
  ['Minimum instalments paid before re-agreement', 'loans/reagreement', 'restructure'], ['Minimum outstanding principal', 'loans/reagreement', 'restructure'], ['Maximum tenure', 'loans/reagreement', 'months restructure'], ['Maximum re-agreements per loan', 'loans/reagreement', ''],
  ['Minimum / maximum re-agreement rate', 'loans/reagreement', 'interest'], ['Allow a higher rate', 'loans/reagreement', 'increase'], ['Allow a back-dated application date', 'loans/reagreement', 'backdate'],
  ['Minimum Monthly RD Amount', 'rd/core', 'contribution floor'], ['Opening-Balance Interest Rate (%)', 'rd/core', 'rd interest'], ['Min. Balance After Withdrawal', 'rd/core', 'withdraw'],
  ['Min. Consecutive Installments', 'rd/thresholds', 'full interest'], ['Max. Payment Gap (Months)', 'rd/thresholds', ''], ['Max. Missed Installments', 'rd/thresholds', ''], ['Min. Regular After Recovery', 'rd/thresholds', ''], ['Max. Arrears Clearance (Months)', 'rd/thresholds', ''],
  ['Allow recovery from an initial-month / later gap / multiple gaps', 'rd/thresholds', 'switch'],
  ['Annual Fund Interest Rate (%)', 'fund/fund', 'opening balance'], ['Dividend Payout (%)', 'fund/fund', 'share capital'], ['Group Insurance Deduction', 'fund/fund', 'yearly'],
  ['Fixed dividend rate', 'fund/dividend', 'dividend'], ['Minimum dividend rate', 'fund/dividend', 'dividend'], ['Maximum dividend rate', 'fund/dividend', 'dividend'],
  ['Monthly Contribution Interest Chart', 'fund/chart', 'slab'],
  ['Auto Day-End (nightly close, 11:30 PM)', 'ops/dayend', 'day end'], ['Import strictness', 'ops/import', 'demand import strict standard'], ['Profit Head', 'ops/heads', 'ledger'],
  ['Grain Loan', 'unused/all', ''], ['Loan On Deposit', 'unused/all', ''], ['Min. Membership / Share amounts / Security Dep', 'unused/all', 'others'], ['Min. Balance For Saving A/c', 'unused/all', 'sb'], ['Working charges', 'unused/all', ''],
];

// ── Change tracking ──
const ChgCtx = React.createContext<Set<string>>(new Set());

const flattenRules = (obj: any, prefix = '', out: Record<string, any> = {}): Record<string, any> => {
  if (obj === null || typeof obj !== 'object' || prefix.endsWith('interestChart')) { out[prefix] = typeof obj === 'object' ? JSON.stringify(obj) : obj; return out; }
  for (const k of Object.keys(obj)) flattenRules(obj[k], prefix ? `${prefix}.${k}` : k, out);
  return out;
};

const humanize = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase());


const Card: React.FC<{ icon: React.ReactNode; title: string; hint?: string; action?: React.ReactNode; children: React.ReactNode }> = ({ icon, title, hint, action, children }) => (
  <section className="aw-card br-card">
    <div className="aw-card-head">
      <span className="aw-card-icon">{icon}</span>
      <div>
        <h2 className="aw-card-title">{title}</h2>
        {hint && <p className="aw-meta">{hint}</p>}
      </div>
      {action && <span style={{ marginLeft: 'auto' }}>{action}</span>}
    </div>
    {children}
  </section>
);

/** One setting: name + help on the left, the control on the right. Shows a changed marker and locks unused settings. */
const Row: React.FC<{ label: React.ReactNode; help?: string | undefined; path?: string | string[] | undefined; unused?: string | undefined; children: React.ReactNode }> = ({ label, help, path, unused, children }) => {
  const chg = React.useContext(ChgCtx);
  const changed = !!path && (Array.isArray(path) ? path : [path]).some(p => chg.has(p));
  return (
    <div className={`br-row${changed ? ' is-chg' : ''}${unused ? ' is-off' : ''}`} title={unused}>
      <div className="br-row-text">
        <b>{label}{unused && <UnusedTag reason={unused} />}</b>
        {help && <span className="br-help">{help}</span>}
      </div>
      {unused ? (
        <fieldset disabled className="br-row-ctl" style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>{children}</fieldset>
      ) : (
        <div className="br-row-ctl">{children}</div>
      )}
    </div>
  );
};

const SwitchRow: React.FC<{ label: string; help?: string; path?: string; checked: boolean; onChange: (v: boolean) => void; unused?: string | undefined }> = ({ label, help, path, checked, onChange, unused }) => (
  <Row label={label} help={help} path={path} unused={unused}>
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={!!unused} onClick={() => !unused && onChange(!checked)} className="aw-switch" />
  </Row>
);

/** Number box that highlights itself when its value differs from what is saved. */
const RuleNum: React.FC<{ path: string; value: number; onValue: (n: number) => void; kind?: 'num' | 'int' } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'path'>> = ({ path, value, onValue, kind = 'num', className, ...rest }) => {
  const chg = React.useContext(ChgCtx);
  return (
    <NumInput
      {...rest}
      value={value}
      onChange={e => onValue(kind === 'int' ? (parseInt(e.target.value, 10) || 0) : (parseFloat(e.target.value) || 0))}
      className={`aw-input${chg.has(path) ? ' is-chg' : ''}${className ? ' ' + className : ''}`}
    />
  );
};

/** How many days of the month Slot 1's window covers (handles the wrapping 25–5 case). */
const slotDayCount = (startDay: number, endDay: number): number => {
  const s = Math.min(31, Math.max(1, Math.trunc(startDay) || 1));
  const e = Math.min(31, Math.max(1, Math.trunc(endDay) || 1));
  return s <= e ? e - s + 1 : (31 - s + 1) + e;
};


const ModifyBusinessRules: React.FC = () => {
  const { t } = useTranslation();
  const { businessRules, setBusinessRules, loading, loaded, loadError, saveBusinessRules, getSaveFailure, refresh } = useBusinessRules();
  const [saving, setSaving] = useState(false);

  const updateLoanType = (loanType: keyof BusinessRulesData, field: string, value: number) => {
    setBusinessRules(prev => {
      const cur = prev[loanType];
      if (typeof cur === 'object' && cur !== null) {
        return { ...prev, [loanType]: { ...cur, [field]: value } } as BusinessRulesData;
      }
      return prev;
    });
  };

  const updateGeneralSetting = (field: keyof GeneralSettings, value: any) => {
    setBusinessRules(prev => ({ ...prev, generalSettings: { ...prev.generalSettings, [field]: value } }));
  };

  const updateFundManagement = (field: string, value: any) => {
    setBusinessRules(prev => ({ ...prev, fundManagement: { ...prev.fundManagement, [field]: value } }));
  };

  const updateRdSystem = (field: keyof RdSystemRules, value: any) => {
    setBusinessRules(prev => ({ ...prev, rdSystem: { ...prev.rdSystem, [field]: value } }));
  };

  const updateEligibility = (patch: Partial<BusinessRulesData['regularLoanEligibility']>) => {
    setBusinessRules(prev => ({ ...prev, regularLoanEligibility: { ...prev.regularLoanEligibility, ...patch } }));
  };

  const updateReagreement = (patch: Partial<BusinessRulesData['loanReagreement']>) => {
    setBusinessRules(prev => ({ ...prev, loanReagreement: { ...prev.loanReagreement, ...patch } }));
  };

  const updateSlot = (patch: Partial<BusinessRulesData['loanSlotDelay']>) => {
    setBusinessRules(prev => ({ ...prev, loanSlotDelay: { ...prev.loanSlotDelay, ...patch } }));
  };

  const handleChartChange = (index: number, field: 'monthlyContribution' | 'yearlyInterest', value: number) => {
    // Replace the row with a copy instead of mutating the object held in state
    const chart = businessRules.fundManagement.interestChart.map((r, i) => (i === index ? { ...r, [field]: value } : r));
    updateFundManagement('interestChart', chart);
  };

  const addChartRow = () => {
    updateFundManagement('interestChart', [
      ...businessRules.fundManagement.interestChart,
      { monthlyContribution: 0, yearlyInterest: 0 },
    ]);
  };

  const removeChartRow = (index: number) => {
    updateFundManagement('interestChart', businessRules.fundManagement.interestChart.filter((_, i) => i !== index));
  };

  // Returns human-readable problems (empty = OK). Rates may not be negative, percentages are 0-100,
  // re-agreement min rate may not exceed max rate (0 = no limit), slot days are 1-31 (the Slot 1 window
  // may legitimately wrap the month end, e.g. the default 25-5, so start > end is allowed).
  const validateRules = (rules: BusinessRulesData = businessRules): string[] => {
    const bad: string[] = [];
    const neg = (label: string, v: number | undefined) => { if (v !== undefined && (!Number.isFinite(v) || v < 0)) bad.push(`${label} cannot be negative`); };
    const pct = (label: string, v: number | undefined) => { if (v !== undefined && (!Number.isFinite(v) || v < 0 || v > 100)) bad.push(`${label} must be between 0 and 100`); };
    const loans: Array<[string, LoanType]> = [
      ['Regular Loan', rules.regularLoan], ['Additional Loan', rules.additionalLoan],
      ['Emergency Loan', rules.emergencyLoan], ['Grain Loan', rules.mediumTermLoan],
      ['Loan On Deposit', rules.loanOnDeposit],
    ];
    for (const [name, l] of loans) {
      neg(`${name} Max.Amount`, l.maxAmount);
      pct(`${name} Rate (%)`, l.rate);
      neg(`${name} No.Of Install`, l.numberOfInstallments);
      neg(`${name} No. Of Gr`, l.numberOfGuarantors);
      pct(`${name} Penal Rate (%)`, l.penalRate);
      if (l.graceDays !== undefined && (l.graceDays < 0 || l.graceDays > 31)) bad.push(`${name} Grace Ends day must be between 0 and 31`);
      pct(`${name} Same-Month Late Fee (%)`, l.sameMonthPenalPercent);
      // the divisor only matters when there is a same-month fee to divide (fee = percent x principal / divisor)
      if (l.sameMonthPenalDivisor !== undefined && (l.sameMonthPenalPercent ?? 0) > 0 && !(l.sameMonthPenalDivisor > 0)) bad.push(`${name} Same-Month Fee Divisor must be greater than 0 when a Same-Month Late Fee is set`);
    }
    const el = rules.regularLoanEligibility;
    neg('Max. Regular Loan Limit', el.maxLimit); pct('RD Req. (%)', el.rdPercent); pct('Share Req. (%)', el.sharePercent);
    const lad = rules.loanAgainstDeposits;
    pct('Loan Against Deposits Share Value (%)', lad.shareValue); pct('Loan Against Deposits FD (%)', lad.fdPercentage);
    neg('Loan Against Deposits Overall Limit', lad.overallLimit); neg('Loan Against Deposits Basic Pay', lad.basicPay);
    const o = rules.others;
    neg('Min. Membership (Months)', o.minMembership); neg('Min Share Amount', o.minShareAmt); neg('Max Share Amount', o.maxShareAmt); neg('Security Deposit', o.securityDep);
    if (o.maxShareAmt > 0 && o.minShareAmt > o.maxShareAmt) bad.push('Min Share Amount cannot exceed Max Share Amount');
    neg('Min Balance For Saving A/c', rules.generalSettings.minBalanceForSavingAc);
    neg('Working Charges Amount', rules.generalSettings.workingChargesAmount);
    const fm = rules.fundManagement;
    pct('Annual Fund Interest Rate (%)', fm.fundInterestRate); pct('Dividend Payout (%)', fm.dividendPercent); neg('Group Insurance Amount', fm.groupInsuranceAmount);
    pct('Fixed dividend rate (%)', fm.dividendFixedPercent); pct('Minimum dividend rate (%)', fm.dividendMinPercent); pct('Maximum dividend rate (%)', fm.dividendMaxPercent);
    if (fm.dividendFixedActive && !(fm.dividendFixedPercent > 0)) bad.push('Fixed dividend rate is switched on, so it must be more than 0');
    if (fm.dividendMaxActive && !(fm.dividendMaxPercent > 0)) bad.push('Maximum dividend rate is switched on, so it must be more than 0');
    if (fm.dividendMinActive && fm.dividendMaxActive && fm.dividendMinPercent > fm.dividendMaxPercent) bad.push('Minimum dividend rate cannot be more than the Maximum');
    if (fm.dividendFixedActive && fm.dividendMinActive && fm.dividendFixedPercent < fm.dividendMinPercent) bad.push('Fixed dividend rate is below the Minimum');
    if (fm.dividendFixedActive && fm.dividendMaxActive && fm.dividendFixedPercent > fm.dividendMaxPercent) bad.push('Fixed dividend rate is above the Maximum');
    fm.interestChart.forEach((r, i) => {
      neg(`Interest chart row ${i + 1} monthly contribution`, r.monthlyContribution);
      neg(`Interest chart row ${i + 1} yearly interest`, r.yearlyInterest);
    });
    const rg = rules.loanReagreement;
    neg('Re-agreement minimum installments paid', rg.minInstallmentsPaid); neg('Re-agreement minimum outstanding', rg.minOutstanding);
    neg('Re-agreement maximum tenure', rg.maxTenure); neg('Re-agreement maximum per loan', rg.maxPerLoan);
    pct('Re-agreement minimum rate (%)', rg.minRate); pct('Re-agreement maximum rate (%)', rg.maxRate);
    if (rg.maxRate > 0 && rg.minRate > rg.maxRate) bad.push('Re-agreement minimum rate cannot be greater than the maximum rate');
    const sl = rules.loanSlotDelay;
    for (const [label, d] of [['Slot 1 Window — From Day', sl.slot1StartDay], ['Slot 1 Window — To Day', sl.slot1EndDay]] as Array<[string, number]>) {
      if (!Number.isInteger(d) || d < 1 || d > 31) bad.push(`${label} must be a whole day between 1 and 31`);
    }
    neg('Slot 1 delay months', sl.slot1DelayMonths); neg('Slot 2 delay months', sl.slot2DelayMonths);
    neg('Old EMI flag range', rules.oldEmiFlag.tolerance);
    const rd = rules.rdSystem;
    neg('Minimum Monthly RD Amount', rd.minMonthlyAmount); pct('Opening-Balance Interest Rate (%)', rd.openingBalanceRate); neg('Min. Balance After Withdrawal', rd.minBalanceAfterWithdrawal);
    neg('RD min consecutive installments', rd.minConsecutiveInstallments); neg('RD max payment gap months', rd.maxPaymentGapMonths);
    neg('RD max missed installments', rd.maxMissedInstallments); neg('RD min regular after recovery', rd.minRegularAfterRecovery); neg('RD max arrears clearance months', rd.maxArrearsClearanceMonths);
    return bad;
  };

  const handleSave = async () => {
    if (!loaded) {
      await showDialog('error', t('Rules Not Loaded'), t('The live business rules have not been loaded.'), t('Saving is disabled so the placeholder defaults on screen cannot overwrite the real rules. Use Retry to reload.'));
      return;
    }
    const problems = validateRules();
    if (problems.length > 0) {
      await showDialog('warning', t('Check These Fields'), t('Business rules were not saved.'), problems.slice(0, 15).join('\n') + (problems.length > 15 ? `\n...and ${problems.length - 15} more` : ''));
      return;
    }
    setSaving(true);
    try {
      const success = await saveBusinessRules(businessRules);
      if (success) {
        // what is on screen is now what is saved, so nothing counts as an unsaved change any more
        setBaseline(businessRules);
        await showDialog('info', t('Saved'), t('Business rules synchronized successfully.'));
      } else {
        await notifyError(getSaveFailure(), t('save the business rules'));
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Rules profile file: export / import (ES-540) ──
  // Import only ever happens from this window. It reads the file, shows exactly what would change, and
  // on confirm loads the values onto the screen. Saving stays a separate, deliberate click on Save Rules.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<{ fileName: string; result: Extract<ProfileParseResult, { ok: true }> } | null>(null);

  const handleExport = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    const blob = new Blob([buildProfileFile(businessRules)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `business-rules-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // let the same file be picked again later
    if (!file) return;
    if (file.size > PROFILE_MAX_BYTES) {
      await showDialog('warning', t('Import Rules'), t('This file is too large to be a rules profile.'));
      return;
    }
    const result = parseProfileFile(await file.text(), businessRules);
    if (!result.ok) {
      await showDialog('warning', t('Import Rules'), t('The file was not imported and nothing was changed.'), result.errors.slice(0, 15).join('\n') + (result.errors.length > 15 ? `\n...and ${result.errors.length - 15} more` : ''));
      return;
    }
    setImportPreview({ fileName: file.name, result });
  };

  const handleApplyImport = async () => {
    if (!importPreview) return;
    if (!loaded) {
      await showDialog('error', t('Rules Not Loaded'), t('The live business rules have not been loaded.'));
      return;
    }
    // Import only fills the screen. Nothing is stored (and the application keeps using the old rules)
    // until the operator clicks Save Rules, which runs the usual validation first.
    const { merged, changes } = importPreview.result;
    setBusinessRules(merged);
    setImportPreview(null);
    await showDialog('info', t('Rules Loaded From File'), t('{{1}} value(s) are now on the screen.', { 1: changes.length }), t('Check them, then click Save Rules to make them live. Until you save, the application keeps using the old rules.'));
  };

  usePageToolbarActions({
    onSave: handleSave,
    saveLabel: 'Save Rules',
    saveEnabled: !(saving || loading || !loaded),
  });

  const num = (v: string) => parseFloat(v) || 0;
  const elig = businessRules.regularLoanEligibility;
  const slot = businessRules.loanSlotDelay;
  const ra = businessRules.loanReagreement;
  const slotLabels = slotWindowLabels(slot.slot1StartDay, slot.slot1EndDay);
  const gs = businessRules.generalSettings;
  const fm = businessRules.fundManagement;
  const rdRules = businessRules.rdSystem;

  // ── Navigation, search and unsaved-change tracking ──
  const [route, setRoute] = useState<{ tab: TabKey; section: string }>({ tab: 'loans', section: 'loans/types' });
  const lastSection = useRef<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const [baseline, setBaseline] = useState<BusinessRulesData | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  // The saved rules are whatever the server returned at the last load (or the last successful save).
  useEffect(() => {
    if (loaded && !loading) setBaseline(businessRules);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, loading]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchRef.current?.focus(); searchRef.current?.select(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const changed = useMemo(() => {
    const set = new Set<string>();
    if (!baseline) return set;
    const a = flattenRules(baseline);
    const b = flattenRules(businessRules);
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (a[k] !== b[k]) set.add(k);
    return set;
  }, [baseline, businessRules]);

  const changesBySection = useMemo(() => {
    const m: Record<string, number> = {};
    changed.forEach(p => { const s = sectionOf(p); m[s] = (m[s] || 0) + 1; });
    return m;
  }, [changed]);
  const changesByTab = (tab: TabKey) => Object.entries(changesBySection).filter(([k]) => k.startsWith(tab + '/')).reduce((n, [, c]) => n + c, 0);

  const goTo = (section: string) => {
    const tab = section.split('/')[0] as TabKey;
    lastSection.current[tab] = section;
    setRoute({ tab, section });
    setQuery('');
  };
  const goTab = (tab: TabKey) => {
    const first = tab === 'unused' ? 'unused/all' : TAB_SECTIONS[tab][0]!.key;
    setRoute({ tab, section: lastSection.current[tab] ?? first });
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return SEARCH_INDEX.filter(([label, , words]) => (label + ' ' + words).toLowerCase().includes(q)).slice(0, 8);
  }, [query]);

  const handleDiscard = async () => {
    if (!baseline) return;
    setBusinessRules(baseline);
    setReviewOpen(false);
  };

  const sec = route.section;
  const tabSections = route.tab === 'unused' ? [] : TAB_SECTIONS[route.tab];
  const secMeta = tabSections.find(s => s.key === sec);

  // ── Loan rows shared by the Loan Types and Penalties tables ──
  // Card keys follow the columns each card writes (see the mapping note in useBusinessRules.ts):
  // additionalLoan = Emergency Loan, emergencyLoan = Loan Against RD.
  const LOAN_ROWS: Array<{ key: 'regularLoan' | 'additionalLoan' | 'emergencyLoan'; label: string; sub?: string }> = [
    { key: 'regularLoan', label: t('Regular Loan') },
    { key: 'additionalLoan', label: t('Emergency Loan') },
    { key: 'emergencyLoan', label: t('Loan Against RD'), sub: t("Always secured by a lock on the member's RD") },
  ];

  const renderLoanTypes = () => (
    <>
      <Card icon={<IndianRupee size={14} />} title={t('Loan limits by type')} hint={t('One row per loan. Settings the application does not use yet are locked and tagged.')}>
        <div className="br-table-wrap">
          <table className="br-table">
            <thead>
              <tr><th>{t('Loan type')}</th><th>{t('Max.Amount')} (₹)</th><th>{t('Rate (%)')}</th><th>{t('No.Of Install')}</th><th>{t('No. Of Gr')}</th></tr>
            </thead>
            <tbody>
              {LOAN_ROWS.map(r => {
                const d = businessRules[r.key] as LoanType;
                return (
                  <tr key={r.key}>
                    <td><b>{r.label}</b>{r.sub && <span>{r.sub}</span>}</td>
                    <td><RuleNum path={`${r.key}.maxAmount`} step="0.01" value={d.maxAmount} onValue={v => updateLoanType(r.key, 'maxAmount', v)} aria-label={`${r.label} ${t('Max.Amount')}`} /></td>
                    <td><RuleNum path={`${r.key}.rate`} step="0.01" value={d.rate} onValue={v => updateLoanType(r.key, 'rate', v)} aria-label={`${r.label} ${t('Rate (%)')}`} /></td>
                    <td><RuleNum path={`${r.key}.numberOfInstallments`} kind="int" value={d.numberOfInstallments} onValue={v => updateLoanType(r.key, 'numberOfInstallments', v)} aria-label={`${r.label} ${t('No.Of Install')}`} /></td>
                    <td>
                      <span className="br-cell-off" title={NO_GUARANTOR_CHECK}>
                        <UnusedTag reason={NO_GUARANTOR_CHECK} />
                        <RuleNum path={`${r.key}.numberOfGuarantors`} kind="int" value={d.numberOfGuarantors} onValue={() => undefined} disabled aria-label={`${r.label} ${t('No. Of Gr')}`} />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card icon={<TrendingUp size={14} />} title={t('Loan against deposits')} hint={t("The share of a member's RD that can be borrowed against.")}>
        <Row label={t('FD (%) — borrowable share of RD')} help={t('Used by Loan Against RD when the limit is checked.')} path="loanAgainstDeposits.fdPercentage">
          <RuleNum path="loanAgainstDeposits.fdPercentage" step="0.01" value={businessRules.loanAgainstDeposits.fdPercentage}
            onValue={v => setBusinessRules(prev => ({ ...prev, loanAgainstDeposits: { ...prev.loanAgainstDeposits, fdPercentage: v } }))} aria-label={t('FD (%)')} />
          <span className="br-unit">%</span>
        </Row>
      </Card>

      <div className="aw-alert aw-alert-info" style={{ marginBottom: 0 }}>
        <Info size={15} />
        <span>
          <strong>{t('Policy Notice:')} </strong>
          {t('These rules define the financial compliance and operational framework. Changes are applied in real-time to all session calculations. Ensure all parameters align with the latest board resolutions before synchronization.')}
        </span>
      </div>
    </>
  );

  const renderEligibility = () => (
    <Card icon={<TrendingUp size={14} />} title={t('Regular Loan Eligibility (RD / Share Value)')} hint={t('Stored with the loan services, which read them at application and disbursement time.')}>
      <Row label={t('Max. Regular Loan Limit')} path="regularLoanEligibility.maxLimit">
        <RuleNum path="regularLoanEligibility.maxLimit" step="1" value={elig.maxLimit} onValue={v => updateEligibility({ maxLimit: v })} />
        <span className="br-unit">₹</span>
      </Row>
      <Row label={t('RD Req. (%)')} path="regularLoanEligibility.rdPercent">
        <RuleNum path="regularLoanEligibility.rdPercent" step="0.01" value={elig.rdPercent} onValue={v => updateEligibility({ rdPercent: v })} />
        <span className="br-unit">%</span>
      </Row>
      <Row label={t('Share Req. (%)')} path="regularLoanEligibility.sharePercent">
        <RuleNum path="regularLoanEligibility.sharePercent" step="0.01" value={elig.sharePercent} onValue={v => updateEligibility({ sharePercent: v })} />
        <span className="br-unit">%</span>
      </Row>
      <Row label={t('Shortfall handling')} path="regularLoanEligibility.shortfallMode">
        <Select className={`aw-select${changed.has('regularLoanEligibility.shortfallMode') ? ' is-chg' : ''}`} popupClassName="aw-select-popup" value={elig.shortfallMode}
          onChange={(v) => updateEligibility({ shortfallMode: v as any })}
          options={[
            { value: 'DEDUCT', label: t('Deduct from disbursement') },
            { value: 'BLOCK', label: t('Block the loan') },
            { value: 'IGNORE', label: t('Ignore (no deduction)') },
          ]} />
      </Row>
      <Row label={t('Limit calculation')} path="regularLoanEligibility.limitCalc">
        <Select className={`aw-select${changed.has('regularLoanEligibility.limitCalc') ? ' is-chg' : ''}`} popupClassName="aw-select-popup" value={elig.limitCalc}
          onChange={(v) => updateEligibility({ limitCalc: v as any })}
          options={[
            { value: 'OUTSTANDING_PLUS_NEW', label: t('Existing Regular Outstanding + New Loan') },
            { value: 'NEW_ONLY', label: t('New Loan only') },
          ]} />
      </Row>
      <Row label={t('RD Head Code')} path="regularLoanEligibility.rdHeadCode">
        <input type="text" value={elig.rdHeadCode} onChange={e => updateEligibility({ rdHeadCode: e.target.value })} className={`aw-input${changed.has('regularLoanEligibility.rdHeadCode') ? ' is-chg' : ''}`} />
      </Row>
      <Row label={t('Share Head Code')} path="regularLoanEligibility.shareHeadCode">
        <input type="text" value={elig.shareHeadCode} onChange={e => updateEligibility({ shareHeadCode: e.target.value })} className={`aw-input${changed.has('regularLoanEligibility.shareHeadCode') ? ' is-chg' : ''}`} />
      </Row>
      <SwitchRow label={t('Apply to Regular Loan')} path="regularLoanEligibility.applyToRegularLoan" checked={elig.applyToRegularLoan} onChange={v => updateEligibility({ applyToRegularLoan: v })} />
      <SwitchRow label={t('Apply to Emergency Loan')} path="regularLoanEligibility.applyToAdditionalLoan" checked={elig.applyToAdditionalLoan} onChange={v => updateEligibility({ applyToAdditionalLoan: v })} />
      <SwitchRow label={t('Apply to Loan Against RD')} checked unused={ALWAYS_ON} onChange={() => undefined} />
      <div className="br-row">
        <p className="aw-meta" style={{ lineHeight: 1.5 }}>
          {t('Independently switchable per loan type (all on by default). RD/Share requirements are calculated on total exposure (existing outstanding of that same loan type + new loan) and are never added to the loan amount — any shortfall is withheld from the disbursement.')}
        </p>
      </div>
    </Card>
  );

  const renderPenalties = () => (
    <>
      <Card icon={<Clock size={14} />} title={t('Late penalty by loan type')} hint={t('Grace and penalty settings for each loan type, side by side.')}>
        <div className="br-table-wrap">
          <table className="br-table">
            <thead>
              <tr><th>{t('Loan type')}</th><th>{t('Penal Rate (% p.a.)')}</th><th>{t('Grace Ends (Day of Month)')}</th><th>{t('Same-Month Late Fee (%)')}</th><th>{t('Same-Month Fee Divisor')}</th></tr>
            </thead>
            <tbody>
              {LOAN_ROWS.map(r => {
                const d = businessRules[r.key] as LoanType;
                const cell = (field: 'penalRate' | 'graceDays' | 'sameMonthPenalPercent' | 'sameMonthPenalDivisor', props: { kind?: 'num' | 'int'; step?: string; min?: number; max?: number }) => (
                  d[field] === undefined ? <span className="aw-meta">—</span> : (
                    <RuleNum path={`${r.key}.${field}`} {...props} value={d[field] as number} onValue={v => updateLoanType(r.key, field, v)} aria-label={`${r.label} ${field}`} />
                  )
                );
                return (
                  <tr key={r.key}>
                    <td><b>{r.label}</b></td>
                    <td>{cell('penalRate', { step: '0.01' })}</td>
                    <td>{cell('graceDays', { kind: 'int', min: 0, max: 31, step: '1' })}</td>
                    <td>{cell('sameMonthPenalPercent', { min: 0, step: '0.01' })}</td>
                    <td>{cell('sameMonthPenalDivisor', { min: 1, step: '0.01' })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card icon={<ShieldCheck size={14} />} title={t('Penalty switches')}>
        <SwitchRow label={t('Enable tiered penalties for all loans')} path="generalSettings.tieredLoanPenaltiesEnabled" checked={gs.tieredLoanPenaltiesEnabled} onChange={v => updateGeneralSetting('tieredLoanPenaltiesEnabled', v)} />
        <Row label={t('Loan Interest Method')} help={t('Fixed application rule. Principal and reducing-balance interest are posted separately.')}>
          <span className="aw-pill">{t('Reducing Balance')}</span>
        </Row>
      </Card>

      <div className="aw-alert aw-alert-info" style={{ marginBottom: 0 }}>
        <Info size={15} />
        <span>
          <strong>{t('How it works:')} </strong>
          {t("Penalties are counted from each instalment's real due month. Money posted through the demand master pays its own month only and never pays the same-month fee; cash keeps the same-month fee when it is late in the due month. Each loan type has its own annual penal rate, set in the table above.")}
          {' '}{t("Grace runs from the 1st through the 'Grace Ends' day of an instalment's own due month — not a day-count from its due date. The same-month fee is (this % × unpaid principal) ÷ the divisor.")}
        </span>
      </div>
    </>
  );

  const renderSlots = () => (
    <>
      <Card icon={<Clock size={14} />} title={t('Application-day window')} hint={t('Slot 2 is always the remaining days, so there is no gap or overlap to configure.')}>
        <Row label={t('Slot 1 Window — From Day')} help={t('Day of the month the application is received.')} path="loanSlotDelay.slot1StartDay">
          <NumInput min={1} max={31} step="1" value={slot.slot1StartDay} className={`aw-input${changed.has('loanSlotDelay.slot1StartDay') ? ' is-chg' : ''}`}
            onChange={e => updateSlot({ slot1StartDay: Math.min(31, Math.max(1, parseInt(e.target.value) || 1)) })} />
        </Row>
        <Row label={t('Slot 1 Window — To Day')} help={t('The window may wrap over month end (for example 25 to 5).')} path="loanSlotDelay.slot1EndDay">
          <NumInput min={1} max={31} step="1" value={slot.slot1EndDay} className={`aw-input${changed.has('loanSlotDelay.slot1EndDay') ? ' is-chg' : ''}`}
            onChange={e => updateSlot({ slot1EndDay: Math.min(31, Math.max(1, parseInt(e.target.value) || 1)) })} />
        </Row>
        <div className="br-row" style={{ display: 'block' }}>
          <div className="br-slotbar" role="img" aria-label={`${t('Slot 1 = application day')} ${slotLabels.slot1}, ${t('Slot 2 = application day')} ${slotLabels.slot2}`}>
            <div style={{ flex: Math.max(1, slotDayCount(slot.slot1StartDay, slot.slot1EndDay)), background: 'var(--aw-accent)', color: '#fff' }}>{t('Slot 1 = application day')} {slotLabels.slot1}</div>
            {slotDayCount(slot.slot1StartDay, slot.slot1EndDay) < 31 && (
              <div style={{ flex: Math.max(1, 31 - slotDayCount(slot.slot1StartDay, slot.slot1EndDay)), background: 'var(--aw-accent-soft)', color: 'var(--aw-accent)' }}>{t('Slot 2 = application day')} {slotLabels.slot2}</div>
            )}
          </div>
        </div>
        <Row label={t('Slot 1 (day {{1}}) Delay', { 1: slotLabels.slot1 })} help={t('Months added to the disbursement month to get the first due month.')} path="loanSlotDelay.slot1DelayMonths">
          <RuleNum path="loanSlotDelay.slot1DelayMonths" kind="int" min={0} step="1" value={slot.slot1DelayMonths} onValue={v => updateSlot({ slot1DelayMonths: v })} />
          <span className="br-unit">{t('months')}</span>
        </Row>
        <Row label={t('Slot 2 (day {{1}}) Delay', { 1: slotLabels.slot2 })} help={t('The same configured delay also sizes delay interest in the EMI calculation.')} path="loanSlotDelay.slot2DelayMonths">
          <RuleNum path="loanSlotDelay.slot2DelayMonths" kind="int" min={0} step="1" value={slot.slot2DelayMonths} onValue={v => updateSlot({ slot2DelayMonths: v })} />
          <span className="br-unit">{t('months')}</span>
        </Row>
      </Card>

      <Card icon={<Calculator size={14} />} title={t('Rounding & EMI checks')}>
        <Row label={t('Loan Rounding (EMI & Closure)')} help={t('Applies to the EMI frozen at disbursement and to every early-closure line item. Nearest reproduces the society\'s manual whole-rupee worksheets.')} path="loanRounding.mode">
          <Select className={`aw-select${changed.has('loanRounding.mode') ? ' is-chg' : ''}`} popupClassName="aw-select-popup" value={businessRules.loanRounding.mode}
            onChange={(v) => setBusinessRules(prev => ({ ...prev, loanRounding: { mode: v as typeof prev.loanRounding.mode } }))}
            options={[
              { value: 'NEAREST', label: t('Nearest Rupee — .00-.49 down, .50-.99 up (manual)') },
              { value: 'UP', label: t('Always Round Up (whole rupee)') },
              { value: 'DOWN', label: t('Always Round Down (whole rupee)') },
              { value: 'NONE', label: t('No Rounding (paisa precision)') },
            ]} />
        </Row>
        <Row label={t('Old EMI Check Range (₹)')} help={t('After a consolidation payroll keeps deducting the old EMI for a month or two. A payment this close to the old EMI (but not equal) is flagged "check this".')} path="oldEmiFlag.tolerance">
          <NumInput min={0} step="1" value={businessRules.oldEmiFlag.tolerance} className={`aw-input${changed.has('oldEmiFlag.tolerance') ? ' is-chg' : ''}`}
            onChange={e => setBusinessRules(prev => ({ ...prev, oldEmiFlag: { tolerance: Math.max(0, Number(e.target.value) || 0) } }))} />
          <span className="br-unit">₹</span>
        </Row>
      </Card>
    </>
  );

  const renderClosure = () => (
    <Card icon={<ShieldCheck size={14} />} title={t('Loan early closure protection')}>
      <SwitchRow label={t('Require typing the loan case number to confirm before executing')} path="earlyClosureProtection.requireTypeConfirm" checked={businessRules.earlyClosureProtection.requireTypeConfirm}
        onChange={val => setBusinessRules(prev => ({ ...prev, earlyClosureProtection: { ...prev.earlyClosureProtection, requireTypeConfirm: val } }))} />
      <SwitchRow label={t('Pass a held early closure automatically when its awaited EMI is received')} help={t('Off = notify only.')} path="earlyClosureProtection.autoPass" checked={businessRules.earlyClosureProtection.autoPass}
        onChange={val => setBusinessRules(prev => ({ ...prev, earlyClosureProtection: { ...prev.earlyClosureProtection, autoPass: val } }))} />
      <SwitchRow label={t('Apply the grace period in a loan closure')} help={t("Off = this month's EMI is always settled in the closure, with no penalty.")} path="earlyClosureProtection.graceEnabled" checked={businessRules.earlyClosureProtection.graceEnabled}
        onChange={val => setBusinessRules(prev => ({ ...prev, earlyClosureProtection: { ...prev.earlyClosureProtection, graceEnabled: val } }))} />
      <Row label={t('Close on next month\u0027s outstanding for a member who has NR')} help={t('Allowed (default) = the option can be used for a member with NR; the earlier NR is still settled in the closure. Not allowed = it is greyed out for members with unpaid due instalments (NR).')} path="earlyClosureProtection.nextMonthAllowNr">
        <Radio.Group value={businessRules.earlyClosureProtection.nextMonthAllowNr ? 'allow' : 'block'}
          onChange={e => {
            const allow = e.target.value === 'allow';
            setBusinessRules(prev => ({ ...prev, earlyClosureProtection: { ...prev.earlyClosureProtection, nextMonthAllowNr: allow } }));
            if (!allow) void showDialog('warning', t('Next-month closure will be blocked for NR members'), t('With this set to Not allowed, "Close on next month\u0027s outstanding" is greyed out for every member who has unpaid due instalments (NR).'), t('What this causes: staff cannot close such a member\u0027s loan on next month\u0027s outstanding at all. They must either collect the NR first or close the loan normally on today\u0027s outstanding, which costs the member more and can lead to disputes or manual workarounds outside the system. Keep it Allowed unless the society wants regular payers only. The change takes effect when you press Save.'));
          }}>
          <Radio value="block">{t('Not allowed')}</Radio>
          <Radio value="allow">{t('Allowed')}</Radio>
        </Radio.Group>
      </Row>
    </Card>
  );

  const renderReagreement = () => (
    <Card icon={<ShieldCheck size={14} />} title={t('Loan Re-agreement Limits')} hint={t('The hard checks (loan active, no other open operation, valid term and rate) always apply.')}>
      <Row label={t('Minimum installments paid before the first re-agreement')} path="loanReagreement.minInstallmentsPaid"><RuleNum path="loanReagreement.minInstallmentsPaid" kind="int" min={0} step="1" value={ra.minInstallmentsPaid} onValue={v => updateReagreement({ minInstallmentsPaid: v })} /></Row>
      <Row label={t('Minimum outstanding principal (₹)')} path="loanReagreement.minOutstanding"><RuleNum path="loanReagreement.minOutstanding" min={0} step="1" value={ra.minOutstanding} onValue={v => updateReagreement({ minOutstanding: v })} /></Row>
      <Row label={t('Maximum tenure (months)')} path="loanReagreement.maxTenure"><RuleNum path="loanReagreement.maxTenure" kind="int" min={0} step="1" value={ra.maxTenure} onValue={v => updateReagreement({ maxTenure: v })} /></Row>
      <Row label={t('Maximum re-agreements per loan')} path="loanReagreement.maxPerLoan"><RuleNum path="loanReagreement.maxPerLoan" kind="int" min={0} step="1" value={ra.maxPerLoan} onValue={v => updateReagreement({ maxPerLoan: v })} /></Row>
      <Row label={t('Minimum rate (% p.a.)')} path="loanReagreement.minRate"><RuleNum path="loanReagreement.minRate" min={0} step="0.01" value={ra.minRate} onValue={v => updateReagreement({ minRate: v })} /></Row>
      <Row label={t('Maximum rate (% p.a.)')} path="loanReagreement.maxRate"><RuleNum path="loanReagreement.maxRate" min={0} step="0.01" value={ra.maxRate} onValue={v => updateReagreement({ maxRate: v })} /></Row>
      <SwitchRow label={t('Allow the new rate to be higher than the current rate')} path="loanReagreement.allowRateIncrease" checked={ra.allowRateIncrease} onChange={v => updateReagreement({ allowRateIncrease: v })} />
      <SwitchRow label={t('Allow a back-dated application date (it decides the slot)')} path="loanReagreement.allowBackdate" checked={ra.allowBackdate} onChange={v => updateReagreement({ allowBackdate: v })} />
    </Card>
  );

  const renderRdCore = () => (
    <Card icon={<IndianRupee size={14} />} title={t('Core RD settings')}>
      <Row label={t('Minimum Monthly RD Amount (₹)')} help={t('Floor a member may select for their monthly RD contribution')} path="rdSystem.minMonthlyAmount"><RuleNum path="rdSystem.minMonthlyAmount" step="1" value={rdRules.minMonthlyAmount} onValue={v => updateRdSystem('minMonthlyAmount', v)} /><span className="br-unit">₹</span></Row>
      <Row label={t('Opening-Balance Interest Rate (%)')} help={t('Annual rate on the opening balance timeline — frozen per financial year at closing')} path="rdSystem.openingBalanceRate"><RuleNum path="rdSystem.openingBalanceRate" step="0.01" value={rdRules.openingBalanceRate} onValue={v => updateRdSystem('openingBalanceRate', v)} /><span className="br-unit">%</span></Row>
      <Row label={t('Min. Balance After Withdrawal (₹)')} help={t('A withdrawal must never take the balance below this')} path="rdSystem.minBalanceAfterWithdrawal"><RuleNum path="rdSystem.minBalanceAfterWithdrawal" step="1" value={rdRules.minBalanceAfterWithdrawal} onValue={v => updateRdSystem('minBalanceAfterWithdrawal', v)} /><span className="br-unit">₹</span></Row>
    </Card>
  );

  const renderRdThresholds = () => (
    <>
      <Card icon={<TrendingUp size={14} />} title={t('Full-Interest Eligibility Thresholds')} hint={t("These drive one automatic rule engine that evaluates each member's real 12-month payment history — not a fixed list of patterns.")}>
        {([
          { label: t('Min. Consecutive Installments'), field: 'minConsecutiveInstallments' as const },
          { label: t('Max. Payment Gap (Months)'), field: 'maxPaymentGapMonths' as const },
          { label: t('Max. Missed Installments'), field: 'maxMissedInstallments' as const },
          { label: t('Min. Regular After Recovery'), field: 'minRegularAfterRecovery' as const },
          { label: t('Max. Arrears Clearance (Months)'), field: 'maxArrearsClearanceMonths' as const },
        ]).map(item => (
          <Row key={item.field} label={item.label} path={`rdSystem.${item.field}`}>
            <RuleNum path={`rdSystem.${item.field}`} kind="int" step="1" value={rdRules[item.field]} onValue={v => updateRdSystem(item.field, v)} />
          </Row>
        ))}
        <SwitchRow label={t('Allow Recovery From an Initial-Month Gap')} path="rdSystem.allowInitialMissRecovery" checked={rdRules.allowInitialMissRecovery} onChange={v => updateRdSystem('allowInitialMissRecovery', v)} />
        <SwitchRow label={t('Allow Recovery From a Later Gap')} path="rdSystem.allowLaterMissRecovery" checked={rdRules.allowLaterMissRecovery} onChange={v => updateRdSystem('allowLaterMissRecovery', v)} />
        <SwitchRow label={t('Allow Multiple Separate Gaps in One Year')} path="rdSystem.allowMultipleGaps" checked={rdRules.allowMultipleGaps} onChange={v => updateRdSystem('allowMultipleGaps', v)} />
        <SwitchRow label={t('Automatic Pattern Posting at Year End')} path="rdSystem.autoPatternPosting" checked={rdRules.autoPatternPosting} onChange={v => updateRdSystem('autoPatternPosting', v)} />
        <div className="br-row">
          <p className="aw-meta" style={{ lineHeight: 1.5 }}>
            {t('On: a fully regular member is allowed the full interest automatically; every other member waits for the employee to Allow or Deny (undecided = Deny, interest only from the month the money was actually deposited). Off: nothing is allowed automatically and every undecided member is Denied.')}
          </p>
        </div>
      </Card>
      <div className="aw-alert aw-alert-warning" style={{ marginBottom: 0 }}>
        <Info size={15} />
        <span>
          <strong>{t('Placeholder Values:')} </strong>
          {t('The numbers shown above are working defaults, not finalized policy. Update them once the society confirms the real thresholds — nothing about the eligibility engine itself is hardcoded to these.')}
        </span>
      </div>
    </>
  );

  const renderFundParams = () => (
    <Card icon={<Settings size={14} />} title={t('Global fund parameters')}>
      <Row label={t('Annual Fund Interest Rate (%)')} help={t('Applied on opening balance annually')} path="fundManagement.fundInterestRate"><RuleNum path="fundManagement.fundInterestRate" step="0.01" placeholder="0.00" value={fm.fundInterestRate} onValue={v => updateFundManagement('fundInterestRate', v)} /><span className="br-unit">%</span></Row>
      <Row label={t('Dividend Payout (%)')} help={t('Percentage of share capital')} path="fundManagement.dividendPercent"><RuleNum path="fundManagement.dividendPercent" step="0.01" min={0} max={100} placeholder="0.00" value={fm.dividendPercent} onValue={v => updateFundManagement('dividendPercent', v)} /><span className="br-unit">%</span></Row>
      <Row label={t('Group Insurance Deduction (₹)')} help={t('Fixed yearly deduction amount')} path="fundManagement.groupInsuranceAmount"><RuleNum path="fundManagement.groupInsuranceAmount" placeholder="0" value={fm.groupInsuranceAmount} onValue={v => updateFundManagement('groupInsuranceAmount', v)} /><span className="br-unit">₹</span></Row>
    </Card>
  );

  const renderDividendRules = () => (
    <Card icon={<TrendingUp size={14} />} title={t('Dividend Rate Rules')} hint={t('Tick a rule to make it active. Only active rules are applied when a dividend is calculated.')}>
      {([
        ['dividendFixedActive', 'dividendFixedPercent', 'Fixed dividend rate (%)', 'Every dividend uses exactly this rate'],
        ['dividendMinActive', 'dividendMinPercent', 'Minimum dividend rate (%)', 'A lower rate is refused'],
        ['dividendMaxActive', 'dividendMaxPercent', 'Maximum dividend rate (%)', 'A higher rate is refused'],
      ] as const).map(([activeKey, valueKey, label, hint]) => (
        <Row key={valueKey} label={t(label)} help={t(hint)} path={[`fundManagement.${activeKey}`, `fundManagement.${valueKey}`]}>
          <RuleNum path={`fundManagement.${valueKey}`} step="0.01" min={0} max={100} placeholder="0.00" value={fm[valueKey]} disabled={!fm[activeKey]} onValue={v => updateFundManagement(valueKey, v)} aria-label={t(label)} />
          <span className="br-unit">%</span>
          <button type="button" role="switch" aria-checked={fm[activeKey]} aria-label={`${t('Active')}: ${t(label)}`} className="aw-switch" onClick={() => updateFundManagement(activeKey, !fm[activeKey])} />
        </Row>
      ))}
    </Card>
  );

  const renderInterestChart = () => (
    <Card icon={<Calculator size={14} />} title={t('Monthly Contribution Interest Chart')} hint={t('Define yearly interest for each contribution slab')}
      action={<button type="button" onClick={addChartRow} className="aw-btn aw-btn-secondary aw-btn-sm"><Plus size={12} /> {t('Add Slab')}</button>}>
      {fm.interestChart.length === 0 ? (
        <div className="aw-empty" style={{ padding: 32 }}>
          <Database size={28} />
          <strong className="aw-strong">{t('No slabs configured')}</strong>
          <span className="aw-meta">{t('Click "Add Slab" to start building the chart')}</span>
        </div>
      ) : (
        <div className="aw-table-wrap" style={{ maxHeight: '55vh' }}>
          <table className="aw-table">
            <thead>
              <tr>
                <th className="is-center" style={{ width: 50 }}>#</th>
                <th>{t('Monthly Contribution (₹)')}</th>
                <th>{t('Yearly Interest Credit (₹)')}</th>
                <th style={{ width: 50 }} />
              </tr>
            </thead>
            <tbody>
              {fm.interestChart.map((row, idx) => (
                <tr key={idx}>
                  <td className="is-muted is-center">{idx + 1}</td>
                  <td className="has-input">
                    <NumInput aria-label={t('Slab {{1}} monthly contribution', { 1: idx + 1 })} value={row.monthlyContribution}
                      onChange={e => handleChartChange(idx, 'monthlyContribution', num(e.target.value))} placeholder="0" className="aw-input" />
                  </td>
                  <td className="has-input">
                    <NumInput step="0.01" aria-label={t('Slab {{1}} yearly interest', { 1: idx + 1 })} value={row.yearlyInterest}
                      onChange={e => handleChartChange(idx, 'yearlyInterest', num(e.target.value))} placeholder="0.00" className="aw-input" />
                  </td>
                  <td className="is-center">
                    <button type="button" onClick={() => removeChartRow(idx)} className="aw-icon-btn is-sm is-danger" aria-label={t('Remove slab {{1}}', { 1: idx + 1 })} data-tip={t('Remove slab')} data-tip-pos="left">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );

  const renderDayEnd = () => (
    <Card icon={<Clock size={14} />} title={t('Day-End')}>
      <SwitchRow label={t('Auto Day-End (Nightly Close, 11:30 PM)')} help={t('The nightly job runs only when this switch is on.')} path="generalSettings.autoDayEndCloseEnabled" checked={gs.autoDayEndCloseEnabled} onChange={v => updateGeneralSetting('autoDayEndCloseEnabled', v)} />
    </Card>
  );

  // ES-591: how strictly the Import Demand List treats a file with problems. The server enforces it.
  const renderImport = () => (
    <Card icon={<ShieldCheck size={14} />} title={t('Import Demand')}>
      <Row label={t('Import strictness')} help={t('Applies at the next import, no restart needed.')} path="generalSettings.demandImportStrictness">
        <Select className={`aw-select${changed.has('generalSettings.demandImportStrictness') ? ' is-chg' : ''}`} popupClassName="aw-select-popup" value={gs.demandImportStrictness}
          onChange={(v) => updateGeneralSetting('demandImportStrictness', v)}
          options={[
            { value: 'STRICT', label: t('Strict - any problem and nothing is saved') },
            { value: 'STANDARD', label: t('Standard - skip the bad rows, save the rest') },
          ]} />
      </Row>
      <div className="br-row">
        <p className="aw-meta" style={{ lineHeight: 1.5 }}>
          {t('Strict (recommended): if any row of the file has a problem (member not found, duplicate, wrong total, wrong branch, month already posted, a name or PS.NO. that differs from the member) the whole file is refused and nothing is saved, so a month is never half imported. Standard: rows with a problem are skipped and listed, the clean rows are saved.')}
        </p>
      </div>
    </Card>
  );

  const renderHeads = () => (
    <Card icon={<Database size={14} />} title={t('Ledger Heads')}>
      <Row label={t('Profit Head')} path="generalSettings.profitHead">
        <input type="text" value={gs.profitHead} onChange={e => updateGeneralSetting('profitHead', e.target.value)} placeholder={t('System ledger head')} className={`aw-input${changed.has('generalSettings.profitHead') ? ' is-chg' : ''}`} />
      </Row>
    </Card>
  );

  // ── Not in use: saved but not used by the application yet. Locked, with the reason shown. ──
  const renderUnused = () => {
    const unusedLoans: Array<{ key: 'mediumTermLoan' | 'loanOnDeposit'; label: string; reason: string }> = [
      { key: 'mediumTermLoan', label: t('Grain Loan'), reason: NOT_USED },
      { key: 'loanOnDeposit', label: t('Loan On Deposit'), reason: CALC_ONLY },
    ];
    const lad = businessRules.loanAgainstDeposits;
    return (
      <>
        <div className="aw-alert aw-alert-info" style={{ marginBottom: 0 }}>
          <Info size={15} />
          <span>{t('These values are saved but the application does not use them yet, so they are locked. They are kept here so nothing is lost and can be switched on later.')}</span>
        </div>

        <Card icon={<Database size={14} />} title={t('Grain Loan & Loan On Deposit')}>
          <div className="br-table-wrap">
            <table className="br-table">
              <thead><tr><th>{t('Loan type')}</th><th>{t('Max.Amount')} (₹)</th><th>{t('Rate (%)')}</th><th>{t('No.Of Install')}</th><th>{t('No. Of Gr')}</th></tr></thead>
              <tbody>
                {unusedLoans.map(r => {
                  const d = businessRules[r.key] as LoanType;
                  return (
                    <tr key={r.key}>
                      <td><b>{r.label}</b><span><UnusedTag reason={r.reason} /></span></td>
                      {(['maxAmount', 'rate', 'numberOfInstallments', 'numberOfGuarantors'] as const).map(f => (
                        <td key={f}><span className="br-cell-off"><RuleNum path={`${r.key}.${f}`} value={d[f]} onValue={() => undefined} disabled aria-label={`${r.label} ${f}`} /></span></td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card icon={<TrendingUp size={14} />} title={t('Loan Against Deposits (other fields)')}>
          <Row label={t('Share Value%')} unused={CALC_ONLY}><RuleNum path="loanAgainstDeposits.shareValue" step="0.1" value={lad.shareValue} onValue={() => undefined} /></Row>
          <Row label={t('Overall Limit')} unused={CALC_ONLY}><RuleNum path="loanAgainstDeposits.overallLimit" step="1" value={lad.overallLimit} onValue={() => undefined} /></Row>
          <Row label={t('Basic Pay')} unused={NOT_USED}><RuleNum path="loanAgainstDeposits.basicPay" step="0.01" value={lad.basicPay} onValue={() => undefined} /></Row>
        </Card>

        <Card icon={<Calculator size={14} />} title={t('Membership & Shares')}>
          {/* Min./Max. CD Amt removed — dead legacy fields; the real minimum is Minimum Monthly RD Amount (Deposits tab). */}
          <Row label={t('Min. Membership (Months)')} unused={NOT_USED}><RuleNum path="others.minMembership" kind="int" value={businessRules.others.minMembership} onValue={() => undefined} /></Row>
          <Row label={t('Min. Share Amt')} unused={NOT_USED}><RuleNum path="others.minShareAmt" step="0.01" value={businessRules.others.minShareAmt} onValue={() => undefined} /></Row>
          <Row label={t('Max. Share Amt')} unused={NOT_USED}><RuleNum path="others.maxShareAmt" step="0.01" value={businessRules.others.maxShareAmt} onValue={() => undefined} /></Row>
          <Row label={t('Security Dep')} unused={NOT_USED}><RuleNum path="others.securityDep" step="0.01" value={businessRules.others.securityDep} onValue={() => undefined} /></Row>
        </Card>

        <Card icon={<Settings size={14} />} title={t('Behaviour & Charges')}>
          {[
            { label: t('DataEntry Mode'), field: 'dataEntryMode', unused: NOT_USED },
            { label: t('Print Demand Format Horizontal'), field: 'printDemandFormatHorizontal', unused: NOT_USED },
            { label: t('Consider Intt. Before 10th'), field: 'considerIntBefore10th', unused: NOT_USED },
            { label: t('Calculate Interest Using Reducing Balance'), field: 'calculateInterestUsingReducingBalance', unused: 'Not in use: reducing balance is the only supported method, so this switch changes nothing.' },
            { label: t('Show Consolidate Intt. Amount in Demand'), field: 'showConsolidateIntAmountInDemand', unused: NOT_USED },
            { label: t('Get Working Charges (Rs.)'), field: 'getWorkingCharges', unused: NOT_USED },
          ].map(item => (
            <SwitchRow key={item.field} label={item.label} unused={item.unused} checked={(gs as any)[item.field]} onChange={val => updateGeneralSetting(item.field as keyof GeneralSettings, val)} />
          ))}
          <Row label={t('Min. Balance For Saving A/c')} unused={LOOKUP_ONLY}><RuleNum path="generalSettings.minBalanceForSavingAc" step="0.01" value={gs.minBalanceForSavingAc} onValue={() => undefined} /></Row>
          <Row label={t('Working Charges Amount')} unused={NOT_USED}><RuleNum path="generalSettings.workingChargesAmount" kind="int" value={gs.workingChargesAmount} onValue={() => undefined} /></Row>
          <Row label={t('Average Interest Calculation Slot')} unused={NOT_USED}><RuleNum path="generalSettings.averageInterestCalculationSlot" kind="int" value={gs.averageInterestCalculationSlot} onValue={() => undefined} /></Row>
          <Row label={<>{t('Working Charges Head')} {gs.getWorkingCharges && <span style={{ color: 'var(--aw-danger)' }}>*</span>}</>} unused={NOT_USED}>
            <Select className="aw-select" popupClassName="aw-select-popup" value={gs.workingChargesHead || undefined}
              onChange={(v) => updateGeneralSetting('workingChargesHead' as keyof GeneralSettings, v ?? '')}
              placeholder={t('Select head...')}
              options={[
                { value: 'I1001', label: 'ENTRY FEE' },
                { value: 'I1002', label: 'INTT FROM MEMBER' },
                { value: 'I1003', label: 'INTT FROM M BANK' },
                { value: 'I1004', label: 'INTT FROM STAFF CONSUMER LOAN' },
                { value: 'I1005', label: 'INTT FROM STAFF S.D. LOAN' },
                { value: 'I1007', label: 'INTT FORFIT A/C' },
                { value: 'I1008', label: 'MISC RECEIPTS' },
                { value: 'I1009', label: 'HOUSE RENT' },
              ]} />
          </Row>
        </Card>
      </>
    );
  };

  const renderSection = (): React.ReactNode => {
    switch (sec) {
      case 'loans/types': return renderLoanTypes();
      case 'loans/eligibility': return renderEligibility();
      case 'loans/penalties': return renderPenalties();
      case 'loans/slots': return renderSlots();
      case 'loans/closure': return renderClosure();
      case 'loans/reagreement': return renderReagreement();
      case 'rd/core': return renderRdCore();
      case 'rd/thresholds': return renderRdThresholds();
      case 'fund/fund': return renderFundParams();
      case 'fund/dividend': return renderDividendRules();
      case 'fund/chart': return renderInterestChart();
      case 'ops/dayend': return renderDayEnd();
      case 'ops/import': return renderImport();
      case 'ops/heads': return renderHeads();
      default: return renderUnused();
    }
  };

  const reviewRows = useMemo(() => {
    if (!baseline) return [];
    const a = flattenRules(baseline);
    const b = flattenRules(businessRules);
    return Array.from(changed).sort().map(p => ({
      section: sectionLabel(sectionOf(p)),
      field: p.endsWith('interestChart') ? t('Monthly Contribution Interest Chart') : humanize(p.split('.').slice(-1)[0] ?? p),
      from: p.endsWith('interestChart') ? t('(previous chart)') : String(a[p]),
      to: p.endsWith('interestChart') ? t('(edited chart)') : String(b[p]),
    }));
  }, [changed, baseline, businessRules, t]);

  const changeCount = changed.size;

  return (
    <ChgCtx.Provider value={changed}>
    <div className="app-window aw-calm">
      {/* ── Header ── */}
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">{t('Modify Business Rules')}</h1>
          <p className="aw-desc" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Building2 size={12} /> {t('Policy Configuration Ledger')}
            <span className="aw-pill tone-success" style={{ marginLeft: 4 }}><i className="aw-status-dot" style={{ marginRight: 8 }} />{t('Live ruleset')}</span>
            {changeCount > 0 && <span className="aw-pill tone-warning">{t('{{1}} unsaved change(s)', { 1: changeCount })}</span>}
          </p>
        </div>
        <div className="aw-actions">
          <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleImportFile} style={{ display: 'none' }} />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={saving || loading || !loaded} className="aw-btn aw-btn-secondary" title={t('Load all rules from a profile file onto the screen (click Save Rules afterwards to make them live)')}>
            <Upload size={13} /> {t('Import Rules')}
          </button>
          <button type="button" onClick={handleExport} disabled={saving || loading || !loaded} className="aw-btn aw-btn-secondary" title={t('Save the rules on screen to a profile file')}>
            <Download size={13} /> {t('Export Rules')}
          </button>
          <button type="button" onClick={handleSave} disabled={saving || loading || !loaded} className="aw-btn aw-btn-primary">
            {saving ? <RefreshCw size={13} className="aw-spin" /> : <Save size={13} />} {t('Save Rules')}
          </button>
          <button type="button" onClick={closeWindow} className="aw-btn aw-btn-ghost">
            <X size={13} /> {t('Close')}
          </button>
        </div>
      </div>

      {loadError && !loading && (
        <div className="aw-alert aw-alert-danger" role="alert" style={{ margin: 'var(--aw-pad) var(--aw-pad) 0' }}>
          <span>{t('{{1}} {{2}}. The values below are placeholder defaults and Save is disabled.', { 1: t('Could not load the live business rules:'), 2: loadError })}</span>
          <button type="button" onClick={() => refresh()} className="aw-btn aw-btn-secondary" style={{ marginLeft: 'auto' }}>
            <RefreshCw size={13} /> {t('Retry')}
          </button>
        </div>
      )}

      {/* ── Top tabs + search ── */}
      <div className="br-tabbar">
        <div className="aw-tabs" role="tablist">
          {TAB_ORDER.map(tab => {
            const n = changesByTab(tab);
            return (
              <button key={tab} type="button" role="tab" aria-selected={route.tab === tab} onClick={() => goTab(tab)} className="aw-tab">
                {t(TAB_LABELS[tab])}
                {n > 0 ? <span className="br-count is-chg" title={t('{{1}} unsaved change(s)', { 1: n })}>{n}</span> : tab === 'unused' ? <span className="br-count">{UNUSED_COUNT}</span> : null}
              </button>
            );
          })}
        </div>
        <div className="br-search">
          <Search size={14} />
          <input ref={searchRef} type="text" className="aw-input" value={query} onChange={e => setQuery(e.target.value)} placeholder={t('Search any setting…')} aria-label={t('Search settings')}
            onKeyDown={e => { if (e.key === 'Escape') setQuery(''); if (e.key === 'Enter' && results[0]) goTo(results[0][1]); }} />
          <kbd>Ctrl K</kbd>
          {query.trim() && (
            <div className="br-results" role="listbox">
              {results.length === 0 ? <div className="aw-meta" style={{ padding: '8px 10px' }}>{t('No setting matches')} “{query}”</div> : results.map(([label, section]) => (
                <button key={label + section} type="button" role="option" className="br-result" onClick={() => goTo(section)}>
                  <b>{t(label)}</b><span>{sectionLabel(section)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="br-body">
        {route.tab !== 'unused' && (
          <nav className="br-side" aria-label={t(TAB_LABELS[route.tab])}>
            <h3 className="br-side-title">{t(TAB_LABELS[route.tab])}</h3>
            {tabSections.map(s => {
              const n = changesBySection[s.key] || 0;
              return (
                <button key={s.key} type="button" className="br-nav" aria-current={sec === s.key} onClick={() => goTo(s.key)}>
                  {t(s.label)}{n > 0 && <span className="br-count is-chg">{n}</span>}
                </button>
              );
            })}
          </nav>
        )}

        <div className={`br-main${route.tab === 'unused' ? ' is-full' : ''}`}>
          <div key={sec} className="aw-stack aw-fade-in">
            <div className="br-crumb">
              <h2>{route.tab === 'unused' ? t('Not in use') : t(secMeta?.label ?? '')}</h2>
              <p>{route.tab === 'unused' ? t('Saved but not used by the application yet.') : t(secMeta?.blurb ?? '')}</p>
            </div>
            {renderSection()}
          </div>
        </div>
      </div>

      {changeCount > 0 && (
        <div className="br-savebar" role="region" aria-label={t('Unsaved changes')}>
          <span className="br-msg"><span className="aw-pill tone-warning"><i className="aw-status-dot" style={{ marginRight: 8 }} />{t('{{1}} unsaved change(s)', { 1: changeCount })}</span></span>
          <span className="br-grow" />
          <button type="button" onClick={() => setReviewOpen(true)} className="aw-btn aw-btn-secondary">{t('Review changes')}</button>
          <button type="button" onClick={handleDiscard} disabled={saving} className="aw-btn aw-btn-ghost">{t('Discard')}</button>
          <button type="button" onClick={handleSave} disabled={saving || loading || !loaded} className="aw-btn aw-btn-primary">
            {saving ? <RefreshCw size={13} className="aw-spin" /> : <Save size={13} />} {t('Save Rules')}
          </button>
        </div>
      )}

      <div className="aw-footer">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Building2 size={12} /> {t('Policy Governance')}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><ShieldCheck size={12} /> {t('Standard Compliant')}</span>
          <span>RULESET_V3.1.2</span>
        </span>
      </div>

      {/* Review unsaved changes */}
      {reviewOpen && (
        <div className="aw-modal-backdrop">
          <div className="aw-modal" role="dialog" aria-modal="true" aria-label={t('Review changes')} style={{ height: 'auto', maxHeight: '85vh', maxWidth: '44rem', display: 'flex', flexDirection: 'column' }}>
            <div className="aw-stack" style={{ padding: 'var(--aw-pad)', overflow: 'hidden', minHeight: 0 }}>
              <h2 className="aw-card-title">{t('Review changes')}</h2>
              <p className="aw-meta">{t('{{1}} unsaved change(s)', { 1: changeCount })}</p>
              <div style={{ overflow: 'auto', minHeight: 0, maxHeight: '50vh' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ textAlign: 'left' }}>
                      <th style={{ padding: '4px 8px' }}>{t('Section')}</th><th style={{ padding: '4px 8px' }}>{t('Setting')}</th>
                      <th style={{ padding: '4px 8px' }}>{t('Saved')}</th><th style={{ padding: '4px 8px' }}>{t('Now')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewRows.map((c, i) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--aw-border, rgba(128,128,128,.25))' }}>
                        <td style={{ padding: '4px 8px' }}>{c.section}</td>
                        <td style={{ padding: '4px 8px' }}>{c.field}</td>
                        <td style={{ padding: '4px 8px', wordBreak: 'break-all' }}>{c.from}</td>
                        <td style={{ padding: '4px 8px', wordBreak: 'break-all', fontWeight: 600 }}>{c.to}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" onClick={() => setReviewOpen(false)} className="aw-btn aw-btn-ghost">{t('Close')}</button>
                <button type="button" onClick={handleDiscard} className="aw-btn aw-btn-secondary">{t('Discard all')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import preview — nothing is saved until Apply */}
      {importPreview && (
        <div className="aw-modal-backdrop">
          <div className="aw-modal" role="dialog" aria-modal="true" aria-label={t('Import Rules')} style={{ height: 'auto', maxHeight: '85vh', maxWidth: '44rem', display: 'flex', flexDirection: 'column' }}>
            <div className="aw-stack" style={{ padding: 'var(--aw-pad)', overflow: 'hidden', minHeight: 0 }}>
              <h2 className="aw-card-title">{t('Import Rules')}</h2>
              <p className="aw-meta">
                {importPreview.fileName}
                {importPreview.result.meta.exportedAt ? ` · ${t('exported')} ${new Date(importPreview.result.meta.exportedAt).toLocaleString()}` : ''}
              </p>
              {importPreview.result.changes.length === 0 ? (
                <p className="aw-strong">{t('This file matches the current rules. Nothing would change.')}</p>
              ) : (
                <>
                  <p className="aw-strong">{t('{{1}} value(s) will change ({{2}} already match):', { 1: importPreview.result.changes.length, 2: importPreview.result.unchangedCount })}</p>
                  <div style={{ overflow: 'auto', minHeight: 0, maxHeight: '50vh' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ textAlign: 'left' }}>
                          <th style={{ padding: '4px 8px' }}>{t('Section')}</th>
                          <th style={{ padding: '4px 8px' }}>{t('Setting')}</th>
                          <th style={{ padding: '4px 8px' }}>{t('Now')}</th>
                          <th style={{ padding: '4px 8px' }}>{t('From file')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.result.changes.map((c, i) => (
                          <tr key={i} style={{ borderTop: '1px solid var(--aw-border, rgba(128,128,128,.25))' }}>
                            <td style={{ padding: '4px 8px' }}>{c.group}</td>
                            <td style={{ padding: '4px 8px' }}>{c.field}</td>
                            <td style={{ padding: '4px 8px', wordBreak: 'break-all' }}>{c.from}</td>
                            <td style={{ padding: '4px 8px', wordBreak: 'break-all', fontWeight: 600 }}>{c.to}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" onClick={() => setImportPreview(null)} className="aw-btn aw-btn-ghost">{t('Cancel')}</button>
                <button type="button" onClick={handleApplyImport} disabled={importPreview.result.changes.length === 0} className="aw-btn aw-btn-primary">
                  <Upload size={13} /> {t('Load Into Screen')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading / saving overlay */}
      {(loading || saving) && (
        <div className="aw-modal-backdrop">
          <div className="aw-modal" role="alertdialog" aria-modal="true" aria-label={saving ? t('Saving rules') : t('Loading rules')} style={{ height: 'auto', maxWidth: '18rem' }}>
            <div className="aw-stack" style={{ alignItems: 'center', textAlign: 'center', padding: 'calc(var(--aw-pad) * 1.4)' }}>
              <RefreshCw size={28} className="aw-spin" style={{ color: 'var(--aw-accent)' }} />
              <span className="aw-strong">{saving ? t('Saving rules…') : t('Loading rules…')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
    </ChgCtx.Provider>
  );
};

export default ModifyBusinessRules;
