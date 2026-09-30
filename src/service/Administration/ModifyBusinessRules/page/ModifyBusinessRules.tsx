// page/ModifyBusinessRules.tsx

import React, { useState } from 'react';
import {
  IndianRupee, Calculator, ShieldCheck, Settings,
  Database, TrendingUp, Percent, Users, Building2,
  Save, Info, Trash2, Plus, X, Clock, RefreshCw,
} from 'lucide-react';
import { Select } from 'antd';
import { useBusinessRules, BusinessRulesData, GeneralSettings, LoanType, RdSystemRules } from '../hook/useBusinessRules';
import { usePageToolbarActions } from '../../../../utils/pageToolbarActions';

type TabType = 'loanParameters' | 'generalSettings' | 'fundManagement' | 'rdSystem';

const showDialog = async (
  type: 'info' | 'warning' | 'error',
  title: string,
  msg: string,
  detail = '',
) => {
  const api = (window as any).electronAPI;
  if (api?.showMessageBox) {
    await api.showMessageBox({ type, title, message: msg, detail, buttons: ['OK'], defaultId: 0 });
  } else {
    alert(`[${title}] ${msg}${detail ? '\n\n' + detail : ''}`);
  }
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

// ── Small presentational helpers (layout only) ──
const Field: React.FC<{ label: React.ReactNode; hint?: string; title?: string; htmlFor?: string; children: React.ReactNode }> = ({ label, hint, title, htmlFor, children }) => (
  <div>
    <label className="aw-label" htmlFor={htmlFor} title={title}>{label}</label>
    {children}
    {hint && <p className="aw-meta" style={{ marginTop: 4 }}>{hint}</p>}
  </div>
);

const IconInput: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <div className="aw-input-wrap has-icon">{icon}{children}</div>
);

const ToggleRow: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, checked, onChange }) => (
  <div className="aw-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
    <span className="aw-strong" style={{ fontWeight: 600 }}>{label}</span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="aw-switch"
    />
  </div>
);

const Section: React.FC<{ icon: React.ReactNode; title: string; hint?: string; children: React.ReactNode; action?: React.ReactNode }> = ({ icon, title, hint, children, action }) => (
  <section className="aw-card">
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

const gridAuto = (min: number): React.CSSProperties => ({ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, gap: 'var(--aw-gap)' });

const ModifyBusinessRules: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('loanParameters');
  const { businessRules, setBusinessRules, loading, saveBusinessRules } = useBusinessRules();
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

  const updateOthers = (field: string, value: number) => {
    setBusinessRules(prev => ({ ...prev, others: { ...prev.others, [field]: value } }));
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

  const updateSlot = (patch: Partial<BusinessRulesData['loanSlotDelay']>) => {
    setBusinessRules(prev => ({ ...prev, loanSlotDelay: { ...prev.loanSlotDelay, ...patch } }));
  };

  const handleChartChange = (index: number, field: 'monthlyContribution' | 'yearlyInterest', value: number) => {
    const chart = [...businessRules.fundManagement.interestChart];
    const row = chart[index];
    if (row) { row[field] = value; updateFundManagement('interestChart', chart); }
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const success = await saveBusinessRules(businessRules);
      if (success) {
        await showDialog('info', 'Saved', 'Business rules synchronized successfully.');
      } else {
        await showDialog('error', 'Save Failed', 'Failed to synchronize business rules.', 'Check server connection and try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  usePageToolbarActions({
    onSave: handleSave,
    saveLabel: 'Save Rules',
    saveEnabled: !(saving || loading),
  });

  const num = (v: string) => parseFloat(v) || 0;
  const int = (v: string) => parseInt(v) || 0;
  const elig = businessRules.regularLoanEligibility;
  const slot = businessRules.loanSlotDelay;
  const slotLabels = slotWindowLabels(slot.slot1StartDay, slot.slot1EndDay);
  const gs = businessRules.generalSettings;

  // ── Loan section renderer ──
  const renderLoanSection = (title: string, loanType: keyof BusinessRulesData, data: LoanType) => (
    <Section icon={<Database size={14} />} title={title}>
      <div className="aw-two">
        <Field label="Max.Amount">
          <IconInput icon={<IndianRupee size={13} />}>
            <input type="number" step="0.01" value={data.maxAmount} onChange={e => updateLoanType(loanType, 'maxAmount', num(e.target.value))} className="aw-input" />
          </IconInput>
        </Field>
        <Field label="Rate (%)">
          <IconInput icon={<Percent size={13} />}>
            <input type="number" step="0.01" value={data.rate} onChange={e => updateLoanType(loanType, 'rate', num(e.target.value))} className="aw-input" />
          </IconInput>
        </Field>
        <Field label="No.Of Install">
          <input type="number" value={data.numberOfInstallments} onChange={e => updateLoanType(loanType, 'numberOfInstallments', int(e.target.value))} className="aw-input" />
        </Field>
        <Field label="No. Of Gr">
          <IconInput icon={<Users size={13} />}>
            <input type="number" value={data.numberOfGuarantors} onChange={e => updateLoanType(loanType, 'numberOfGuarantors', int(e.target.value))} className="aw-input" />
          </IconInput>
        </Field>
        {data.penalRate !== undefined && loanType === 'regularLoan' && (
          <Field label="Global Penal Rate (% p.a.)" title="One global annual Tier 2 rate used for every loan type.">
            <IconInput icon={<Percent size={13} />}>
              <input type="number" step="0.01" value={data.penalRate} onChange={e => updateLoanType(loanType, 'penalRate', num(e.target.value))} className="aw-input" />
            </IconInput>
          </Field>
        )}
        {data.graceDays !== undefined && (
          <Field label="Grace Ends (Day of Month)" title="Grace runs from the 1st through this day of an installment's own due month — not a day-count from its due date.">
            <IconInput icon={<Clock size={13} />}>
              <input type="number" min={0} max={31} step="1" value={data.graceDays} onChange={e => updateLoanType(loanType, 'graceDays', parseInt(e.target.value, 10) || 0)} className="aw-input" />
            </IconInput>
          </Field>
        )}
        {data.sameMonthPenalPercent !== undefined && (
          <Field label="Same-Month Late Fee (%)" title="Flat fee charged once grace expires but still within the same due month: (this % × unpaid principal) ÷ the divisor beside it.">
            <IconInput icon={<Percent size={13} />}>
              <input type="number" min={0} step="0.01" value={data.sameMonthPenalPercent} onChange={e => updateLoanType(loanType, 'sameMonthPenalPercent', num(e.target.value))} className="aw-input" />
            </IconInput>
          </Field>
        )}
        {data.sameMonthPenalDivisor !== undefined && (
          <Field label="Same-Month Fee Divisor" title="Divisor in the same-month late fee formula: (percentage × unpaid principal) ÷ this number.">
            <input type="number" min={1} step="0.01" value={data.sameMonthPenalDivisor} onChange={e => updateLoanType(loanType, 'sameMonthPenalDivisor', num(e.target.value))} className="aw-input" />
          </Field>
        )}
      </div>
    </Section>
  );

  const tabs = [
    { key: 'loanParameters' as const, icon: <IndianRupee size={13} />, label: '1. Loan Parameters' },
    { key: 'generalSettings' as const, icon: <Settings size={13} />, label: '2. General Setting' },
    { key: 'fundManagement' as const, icon: <TrendingUp size={13} />, label: '3. Fund Management' },
    { key: 'rdSystem' as const, icon: <Percent size={13} />, label: '4. RD System' },
  ];

  return (
    <div className="app-window">
      {/* ── Header ── */}
      <div className="aw-header aw-ambient">
        <div className="min-w-0">
          <h1 className="aw-title">Modify Business Rules</h1>
          <p className="aw-desc" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Building2 size={12} /> Policy Configuration Ledger
            <span className="aw-pill tone-success" style={{ marginLeft: 4 }}><i className="aw-status-dot" style={{ marginRight: 5 }} />Live ruleset</span>
          </p>
        </div>
        <div className="aw-actions">
          <button type="button" onClick={handleSave} disabled={saving || loading} className="aw-btn aw-btn-primary">
            {saving ? <RefreshCw size={13} className="aw-spin" /> : <Save size={13} />} Save Rules
          </button>
          <button type="button" onClick={closeWindow} className="aw-btn aw-btn-ghost">
            <X size={13} /> Close
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="aw-tabs" role="tablist">
        {tabs.map(tab => (
          <button key={tab.key} type="button" role="tab" aria-selected={activeTab === tab.key} onClick={() => setActiveTab(tab.key)} className="aw-tab">
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="aw-content">
        <div key={activeTab} className="aw-stack aw-fade-in">

          {/* ── 1. Loan Parameters ── */}
          {activeTab === 'loanParameters' && (
            <>
              {/* Titles follow the columns each card actually writes — see the
                  mapping note in useBusinessRules.ts. Only titles differ from the
                  prop names; no stored value moves between columns. */}
              <div style={gridAuto(300)}>
                {renderLoanSection('Regular Loan', 'regularLoan', businessRules.regularLoan)}
                {renderLoanSection('Emergency Loan', 'additionalLoan', businessRules.additionalLoan)}
                {renderLoanSection('Grain Loan', 'mediumTermLoan', businessRules.mediumTermLoan)}
                {renderLoanSection('Loan Against Recovery', 'emergencyLoan', businessRules.emergencyLoan)}
                {renderLoanSection('Loan On Deposit', 'loanOnDeposit', businessRules.loanOnDeposit)}

                {/* Loan Against Deposits — custom layout */}
                <Section icon={<TrendingUp size={14} />} title="Loan Against Deposits">
                  <div className="aw-two">
                    {[
                      { label: 'Share Value%', field: 'shareValue', step: '0.1' },
                      { label: 'FD (%)', field: 'fdPercentage', step: '0.01' },
                      { label: 'Overall Limit', field: 'overallLimit', step: '1' },
                      { label: 'Basic Pay', field: 'basicPay', step: '0.01' },
                    ].map(f => (
                      <Field key={f.field} label={f.label}>
                        <input type="number" step={f.step}
                          value={(businessRules.loanAgainstDeposits as any)[f.field]}
                          onChange={e => setBusinessRules(prev => ({
                            ...prev,
                            loanAgainstDeposits: { ...prev.loanAgainstDeposits, [f.field]: num(e.target.value) },
                          }))}
                          className="aw-input" />
                      </Field>
                    ))}
                  </div>
                </Section>
              </div>

              {/* Regular Loan Eligibility — RD / Share Value rules.
                  These persist to system_configs (not busrules) because that is
                  where the loan services read them at application and
                  disbursement time. */}
              <Section icon={<TrendingUp size={14} />} title="Regular Loan Eligibility (RD / Share Value)">
                <div className="aw-stack">
                  <div style={gridAuto(170)}>
                    <Field label="Max. Regular Loan Limit">
                      <input type="number" step="1" value={elig.maxLimit} onChange={e => updateEligibility({ maxLimit: num(e.target.value) })} className="aw-input" />
                    </Field>
                    <Field label="RD Req. (%)">
                      <input type="number" step="0.01" value={elig.rdPercent} onChange={e => updateEligibility({ rdPercent: num(e.target.value) })} className="aw-input" />
                    </Field>
                    <Field label="Share Req. (%)">
                      <input type="number" step="0.01" value={elig.sharePercent} onChange={e => updateEligibility({ sharePercent: num(e.target.value) })} className="aw-input" />
                    </Field>
                    <Field label="Shortfall Handling">
                      <Select
                        className="aw-select" popupClassName="aw-select-popup"
                        value={elig.shortfallMode}
                        onChange={(v) => updateEligibility({ shortfallMode: v as any })}
                        options={[
                          { value: 'DEDUCT', label: 'Deduct from disbursement' },
                          { value: 'BLOCK', label: 'Block the loan' },
                          { value: 'IGNORE', label: 'Ignore (no deduction)' },
                        ]}
                      />
                    </Field>
                    <Field label="Limit Calculation">
                      <Select
                        className="aw-select" popupClassName="aw-select-popup"
                        value={elig.limitCalc}
                        onChange={(v) => updateEligibility({ limitCalc: v as any })}
                        options={[
                          { value: 'OUTSTANDING_PLUS_NEW', label: 'Existing Regular Outstanding + New Loan' },
                          { value: 'NEW_ONLY', label: 'New Loan only' },
                        ]}
                      />
                    </Field>
                    <Field label="RD Head Code">
                      <input type="text" value={elig.rdHeadCode} onChange={e => updateEligibility({ rdHeadCode: e.target.value })} className="aw-input" />
                    </Field>
                    <Field label="Share Head Code">
                      <input type="text" value={elig.shareHeadCode} onChange={e => updateEligibility({ shareHeadCode: e.target.value })} className="aw-input" />
                    </Field>
                  </div>
                  <div style={gridAuto(240)}>
                    <ToggleRow label="Apply to Regular Loan" checked={elig.applyToRegularLoan} onChange={v => updateEligibility({ applyToRegularLoan: v })} />
                    <ToggleRow label="Apply to Emergency Loan" checked={elig.applyToAdditionalLoan} onChange={v => updateEligibility({ applyToAdditionalLoan: v })} />
                    <ToggleRow label="Apply to Loan Against Recovery" checked={elig.applyToEmergencyLoan} onChange={v => updateEligibility({ applyToEmergencyLoan: v })} />
                  </div>
                  <p className="aw-meta" style={{ lineHeight: 1.5 }}>
                    Independently switchable per loan type (all on by default). RD/Share requirements are
                    calculated on total exposure (existing outstanding of that same loan type + new loan) and
                    are never added to the loan amount — any shortfall is withheld from the disbursement.
                  </p>
                </div>
              </Section>

              {/* Others & Penal Sector */}
              <Section icon={<Calculator size={14} />} title="Others & Penal Sector">
                <div style={gridAuto(170)}>
                  <Field label="Min. Membership (Months)">
                    <input type="number" value={businessRules.others.minMembership} onChange={e => updateOthers('minMembership', int(e.target.value))} className="aw-input" />
                  </Field>
                  {/* Min./Max. CD Amt removed — dead legacy fields, never enforced by
                      any real validation. The real, enforced minimum is the RD System
                      tab's Minimum Monthly RD Amount. */}
                  {[
                    { label: 'Min. Share Amt', field: 'minShareAmt' },
                    { label: 'Max. Share Amt', field: 'maxShareAmt' },
                    { label: 'Security Dep', field: 'securityDep' },
                  ].map(item => (
                    <Field key={item.field} label={item.label}>
                      <input type="number" step="0.01" value={(businessRules.others as any)[item.field]} onChange={e => updateOthers(item.field, num(e.target.value))} className="aw-input" />
                    </Field>
                  ))}
                </div>
              </Section>

              <div className="aw-alert aw-alert-info" style={{ marginBottom: 0 }}>
                <Info size={15} />
                <span>
                  <strong style={{ textTransform: 'uppercase', letterSpacing: '.04em' }}>Policy Notice: </strong>
                  These rules define the financial compliance and operational framework. Changes are applied in real-time to all session calculations. Ensure all parameters align with the latest board resolutions before synchronization.
                </span>
              </div>
            </>
          )}

          {/* ── 2. General Settings ── */}
          {activeTab === 'generalSettings' && (
            <div className="aw-stack aw-narrow" style={{ maxWidth: 980 }}>
              <Section icon={<Settings size={14} />} title="Behaviour">
                <div style={gridAuto(300)}>
                  {[
                    { label: 'DataEntry Mode', field: 'dataEntryMode' },
                    { label: 'Print Demand Format Horizontal', field: 'printDemandFormatHorizontal' },
                    { label: 'Consider Intt. Before 10th', field: 'considerIntBefore10th' },
                    { label: 'Calculate Interest Using Reducing Balance', field: 'calculateInterestUsingReducingBalance' },
                    { label: 'Show Consolidate Intt. Amount in Demand', field: 'showConsolidateIntAmountInDemand' },
                    { label: 'Get Working Charges (Rs.)', field: 'getWorkingCharges' },
                    { label: 'Auto Day-End (Nightly Close, 11:30 PM)', field: 'autoDayEndCloseEnabled' },
                    { label: 'Enable tiered penalties for all loans', field: 'tieredLoanPenaltiesEnabled' },
                  ].map(item => (
                    <ToggleRow key={item.field} label={item.label}
                      checked={(gs as any)[item.field]}
                      onChange={val => updateGeneralSetting(item.field as keyof GeneralSettings, val)} />
                  ))}
                </div>
              </Section>

              <Section icon={<Calculator size={14} />} title="Interest & Charges">
                <div className="aw-stack">
                  <div className="aw-panel aw-panel-accent">
                    <span className="aw-label">Loan Interest Method</span>
                    <p className="aw-strong">Reducing Balance</p>
                    <p className="aw-meta" style={{ marginTop: 4 }}>Fixed application rule. Principal and reducing-balance interest are posted separately.</p>
                  </div>

                  <p className="aw-meta" style={{ lineHeight: 1.5 }}>
                    Existing overdue loans start accruing penalties from the activation date, never retroactively. Re-enabling after a pause starts a new penalty period today. The global annual penal rate is configured on the Regular Loan card and applies to every loan type.
                  </p>

                  <div className="aw-two">
                    {[
                      { label: 'Min. Balance For Saving A/c', field: 'minBalanceForSavingAc', type: 'float' },
                      { label: 'Working Charges Amount', field: 'workingChargesAmount', type: 'int' },
                      { label: 'Average Interest Calculation Slot', field: 'averageInterestCalculationSlot', type: 'int' },
                    ].map(f => (
                      <Field key={f.field} label={f.label}>
                        <input type="number" step={f.type === 'float' ? '0.01' : '1'}
                          value={(gs as any)[f.field]}
                          onChange={e => updateGeneralSetting(f.field as keyof GeneralSettings, f.type === 'float' ? num(e.target.value) : int(e.target.value))}
                          className="aw-input" />
                      </Field>
                    ))}
                    {/* Working Charges Head — income head dropdown (required when Get Working Charges is enabled) */}
                    <Field label={<>Working Charges Head {gs.getWorkingCharges && <span style={{ color: 'var(--aw-danger)' }}>*</span>}</>}>
                      <Select
                        className={`aw-select ${gs.getWorkingCharges && !gs.workingChargesHead ? 'is-invalid' : ''}`}
                        popupClassName="aw-select-popup"
                        value={gs.workingChargesHead || undefined}
                        onChange={(v) => updateGeneralSetting('workingChargesHead' as keyof GeneralSettings, v ?? '')}
                        placeholder="Select head..."
                        options={[
                          { value: 'I1001', label: 'ENTRY FEE' },
                          { value: 'I1002', label: 'INTT FROM MEMBER' },
                          { value: 'I1003', label: 'INTT FROM M BANK' },
                          { value: 'I1004', label: 'INTT FROM STAFF CONSUMER LOAN' },
                          { value: 'I1005', label: 'INTT FROM STAFF S.D. LOAN' },
                          { value: 'I1007', label: 'INTT FORFIT A/C' },
                          { value: 'I1008', label: 'MISC RECEIPTS' },
                          { value: 'I1009', label: 'HOUSE RENT' },
                        ]}
                      />
                    </Field>
                    <Field label="Profit Head">
                      <IconInput icon={<Database size={13} />}>
                        <input type="text" value={gs.profitHead} onChange={e => updateGeneralSetting('profitHead', e.target.value)} placeholder="System ledger head" className="aw-input" />
                      </IconInput>
                    </Field>
                  </div>
                </div>
              </Section>

              {/* Loan Early Closure protection — password re-entry and a minimum-role
                  gate are deliberately deferred; only the type-to-confirm toggle
                  exists so far. */}
              <Section icon={<ShieldCheck size={14} />} title="Loan Early Closure Protection">
                <ToggleRow
                  label="Require typing the loan case number to confirm before executing"
                  checked={businessRules.earlyClosureProtection.requireTypeConfirm}
                  onChange={val => setBusinessRules(prev => ({
                    ...prev,
                    earlyClosureProtection: { ...prev.earlyClosureProtection, requireTypeConfirm: val },
                  }))}
                />
              </Section>

              {/* Slot delay months are added to the disbursement month to get the
                  first due month; the same configured delay also sizes delay
                  interest in the EMI calculation. */}
              <Section icon={<Clock size={14} />} title="Loan Slots (Application Day Window & Delay)">
                <div className="aw-stack">
                  <div className="aw-two">
                    <Field label="Slot 1 Window — From Day">
                      <input type="number" min={1} max={31} step="1" value={slot.slot1StartDay}
                        onChange={e => updateSlot({ slot1StartDay: Math.min(31, Math.max(1, parseInt(e.target.value) || 1)) })} className="aw-input" />
                    </Field>
                    <Field label="Slot 1 Window — To Day">
                      <input type="number" min={1} max={31} step="1" value={slot.slot1EndDay}
                        onChange={e => updateSlot({ slot1EndDay: Math.min(31, Math.max(1, parseInt(e.target.value) || 1)) })} className="aw-input" />
                    </Field>
                  </div>
                  <div className="aw-panel">
                    <span className="aw-strong" style={{ fontWeight: 600 }}>
                      Slot 1 = application day {slotLabels.slot1}{'  ·  '}Slot 2 = application day {slotLabels.slot2}
                    </span>
                  </div>
                  <div className="aw-two">
                    <Field label={`Slot 1 (day ${slotLabels.slot1}) Delay`}>
                      <input type="number" min={0} step="1" value={slot.slot1DelayMonths} onChange={e => updateSlot({ slot1DelayMonths: int(e.target.value) })} className="aw-input" />
                    </Field>
                    <Field label={`Slot 2 (day ${slotLabels.slot2}) Delay`}>
                      <input type="number" min={0} step="1" value={slot.slot2DelayMonths} onChange={e => updateSlot({ slot2DelayMonths: int(e.target.value) })} className="aw-input" />
                    </Field>
                    {/* Governs both the EMI's constant monthly interest at disbursement
                        (frozen into instal_amt) and every early-closure line item.
                        NEAREST reproduces the society's manual whole-rupee worksheets. */}
                    <Field label="Loan Rounding (EMI & Closure)">
                      <Select
                        className="aw-select" popupClassName="aw-select-popup"
                        value={businessRules.loanRounding.mode}
                        onChange={(v) => setBusinessRules(prev => ({ ...prev, loanRounding: { mode: v as typeof prev.loanRounding.mode } }))}
                        options={[
                          { value: 'NEAREST', label: 'Nearest Rupee — .00-.49 down, .50-.99 up (manual)' },
                          { value: 'UP', label: 'Always Round Up (whole rupee)' },
                          { value: 'DOWN', label: 'Always Round Down (whole rupee)' },
                          { value: 'NONE', label: 'No Rounding (paisa precision)' },
                        ]}
                      />
                    </Field>
                  </div>
                </div>
              </Section>
            </div>
          )}

          {/* ── 3. Fund Management ── */}
          {activeTab === 'fundManagement' && (
            <>
              <Section icon={<Settings size={14} />} title="Global Fund Parameters">
                <div style={gridAuto(240)}>
                  <Field label="Annual Fund Interest Rate (%)" hint="Applied on opening balance annually">
                    <IconInput icon={<Percent size={13} />}>
                      <input type="number" step="0.01" value={businessRules.fundManagement.fundInterestRate} onChange={e => updateFundManagement('fundInterestRate', num(e.target.value))} placeholder="0.00" className="aw-input" />
                    </IconInput>
                  </Field>
                  <Field label="Dividend Payout (%)" hint="Percentage of share capital">
                    <IconInput icon={<TrendingUp size={13} />}>
                      <input type="number" step="0.01" value={businessRules.fundManagement.dividendPercent} onChange={e => updateFundManagement('dividendPercent', num(e.target.value))} placeholder="0.00" className="aw-input" />
                    </IconInput>
                  </Field>
                  <Field label="Group Insurance Deduction (₹)" hint="Fixed yearly deduction amount">
                    <IconInput icon={<ShieldCheck size={13} />}>
                      <input type="number" value={businessRules.fundManagement.groupInsuranceAmount} onChange={e => updateFundManagement('groupInsuranceAmount', num(e.target.value))} placeholder="0" className="aw-input" />
                    </IconInput>
                  </Field>
                </div>
              </Section>

              <Section
                icon={<Calculator size={14} />}
                title="Monthly Contribution Interest Chart"
                hint="Define yearly interest for each contribution slab"
                action={<button type="button" onClick={addChartRow} className="aw-btn aw-btn-secondary aw-btn-sm"><Plus size={12} /> Add Slab</button>}
              >
                {businessRules.fundManagement.interestChart.length === 0 ? (
                  <div className="aw-empty" style={{ padding: 32 }}>
                    <Database size={28} />
                    <strong className="aw-strong">No slabs configured</strong>
                    <span className="aw-meta">Click "Add Slab" to start building the chart</span>
                  </div>
                ) : (
                  <div className="aw-table-wrap" style={{ maxHeight: '48vh' }}>
                    <table className="aw-table">
                      <thead>
                        <tr>
                          <th className="is-center" style={{ width: 50 }}>#</th>
                          <th>Monthly Contribution (₹)</th>
                          <th>Yearly Interest Credit (₹)</th>
                          <th style={{ width: 50 }} />
                        </tr>
                      </thead>
                      <tbody>
                        {businessRules.fundManagement.interestChart.map((row, idx) => (
                          <tr key={idx}>
                            <td className="is-muted is-center">{idx + 1}</td>
                            <td className="has-input">
                              <input type="number" aria-label={`Slab ${idx + 1} monthly contribution`} value={row.monthlyContribution}
                                onChange={e => handleChartChange(idx, 'monthlyContribution', num(e.target.value))} placeholder="0" className="aw-input" />
                            </td>
                            <td className="has-input">
                              <input type="number" step="0.01" aria-label={`Slab ${idx + 1} yearly interest`} value={row.yearlyInterest}
                                onChange={e => handleChartChange(idx, 'yearlyInterest', num(e.target.value))} placeholder="0.00" className="aw-input" />
                            </td>
                            <td className="is-center">
                              <button type="button" onClick={() => removeChartRow(idx)} className="aw-icon-btn is-sm is-danger" aria-label={`Remove slab ${idx + 1}`} data-tip="Remove slab" data-tip-pos="left">
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>
            </>
          )}

          {/* ── 4. RD System ── */}
          {activeTab === 'rdSystem' && (
            <>
              <Section icon={<IndianRupee size={14} />} title="Core RD Settings">
                <div style={gridAuto(240)}>
                  <Field label="Minimum Monthly RD Amount (₹)" hint="Floor a member may select for their monthly RD contribution">
                    <IconInput icon={<IndianRupee size={13} />}>
                      <input type="number" step="1" value={businessRules.rdSystem.minMonthlyAmount} onChange={e => updateRdSystem('minMonthlyAmount', num(e.target.value))} className="aw-input" />
                    </IconInput>
                  </Field>
                  <Field label="Opening-Balance Interest Rate (%)" hint="Annual rate on the opening balance timeline — frozen per financial year at closing">
                    <IconInput icon={<Percent size={13} />}>
                      <input type="number" step="0.01" value={businessRules.rdSystem.openingBalanceRate} onChange={e => updateRdSystem('openingBalanceRate', num(e.target.value))} className="aw-input" />
                    </IconInput>
                  </Field>
                  <Field label="Min. Balance After Withdrawal (₹)" hint="A withdrawal must never take the balance below this">
                    <IconInput icon={<IndianRupee size={13} />}>
                      <input type="number" step="1" value={businessRules.rdSystem.minBalanceAfterWithdrawal} onChange={e => updateRdSystem('minBalanceAfterWithdrawal', num(e.target.value))} className="aw-input" />
                    </IconInput>
                  </Field>
                </div>
              </Section>

              {/* Payment-pattern eligibility thresholds */}
              <Section icon={<TrendingUp size={14} />} title="Full-Interest Eligibility Thresholds">
                <div className="aw-stack">
                  <div style={gridAuto(190)}>
                    {([
                      { label: 'Min. Consecutive Installments', field: 'minConsecutiveInstallments' as const },
                      { label: 'Max. Payment Gap (Months)', field: 'maxPaymentGapMonths' as const },
                      { label: 'Max. Missed Installments', field: 'maxMissedInstallments' as const },
                      { label: 'Min. Regular After Recovery', field: 'minRegularAfterRecovery' as const },
                      { label: 'Max. Arrears Clearance (Months)', field: 'maxArrearsClearanceMonths' as const },
                    ]).map(item => (
                      <Field key={item.field} label={item.label}>
                        <input type="number" step="1" value={businessRules.rdSystem[item.field]} onChange={e => updateRdSystem(item.field, parseInt(e.target.value, 10) || 0)} className="aw-input" />
                      </Field>
                    ))}
                  </div>
                  <div style={gridAuto(280)}>
                    <ToggleRow label="Allow Recovery From an Initial-Month Gap" checked={businessRules.rdSystem.allowInitialMissRecovery} onChange={v => updateRdSystem('allowInitialMissRecovery', v)} />
                    <ToggleRow label="Allow Recovery From a Later Gap" checked={businessRules.rdSystem.allowLaterMissRecovery} onChange={v => updateRdSystem('allowLaterMissRecovery', v)} />
                    <ToggleRow label="Allow Multiple Separate Gaps in One Year" checked={businessRules.rdSystem.allowMultipleGaps} onChange={v => updateRdSystem('allowMultipleGaps', v)} />
                  </div>
                  <p className="aw-meta" style={{ lineHeight: 1.5 }}>
                    These thresholds drive one automatic rule engine that evaluates each member's real 12-month
                    payment history — not a fixed list of patterns. A member who doesn't automatically qualify
                    still receives their normal RD interest in full; an authority can separately upgrade them to
                    full annual interest as an exception, never a prerequisite.
                  </p>
                </div>
              </Section>

              <div className="aw-alert aw-alert-warning" style={{ marginBottom: 0 }}>
                <Info size={15} />
                <span>
                  <strong style={{ textTransform: 'uppercase', letterSpacing: '.04em' }}>Placeholder Values: </strong>
                  The numbers shown above are working defaults, not finalized policy. Update them once the society
                  confirms the real thresholds — nothing about the eligibility engine itself is hardcoded to these.
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="aw-footer">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Building2 size={12} /> Policy Governance</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><ShieldCheck size={12} /> Standard Compliant</span>
          <span>RULESET_V3.1.2</span>
        </span>
      </div>

      {/* Loading / saving overlay */}
      {(loading || saving) && (
        <div className="aw-modal-backdrop">
          <div className="aw-modal" role="alertdialog" aria-modal="true" aria-label={saving ? 'Saving rules' : 'Loading rules'} style={{ height: 'auto', maxWidth: '18rem' }}>
            <div className="aw-stack" style={{ alignItems: 'center', textAlign: 'center', padding: 'calc(var(--aw-pad) * 1.4)' }}>
              <RefreshCw size={28} className="aw-spin" style={{ color: 'var(--aw-accent)' }} />
              <span className="aw-strong">{saving ? 'Saving rules…' : 'Loading rules…'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModifyBusinessRules;
