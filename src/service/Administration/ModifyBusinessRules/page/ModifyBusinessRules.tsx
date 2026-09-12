// page/ModifyBusinessRules.tsx

import React, { useState } from 'react';
import {
  IndianRupee, Calculator, ShieldCheck, Settings,
  Database, TrendingUp, Percent, Users, Building2,
  Save, Info, Trash2, Plus, ArrowRight, X, Clock,
} from 'lucide-react';
import { ConfigProvider, Switch } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
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

// ── Input shared class ──
const inputCls = 'mbr-input w-full h-6 px-1.5 bg-slate-50 border-2 border-slate-200 rounded-lg fz-body font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-500 focus:ring-2 focus:ring-slate-400/30 transition-all shadow-inner';
const inputIconCls = 'mbr-input w-full h-6 pl-5 pr-1.5 bg-slate-50 border-2 border-slate-200 rounded-lg fz-body font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-500 focus:ring-2 focus:ring-slate-400/30 transition-all shadow-inner';

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

  // ── Loan section renderer ──
  const renderLoanSection = (title: string, loanType: keyof BusinessRulesData, data: LoanType) => (
    <div className="mbr-card bg-white border-2 border-slate-200 rounded-lg overflow-hidden hover:border-slate-400 transition-all shadow-sm">
      <div className="mbr-card-header bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 px-2 py-1 flex items-center">
        <h3 className="mbr-card-title fz-mini font-black text-slate-700 tracking-widest uppercase flex items-center gap-1">
          <Database size={9} className="text-slate-500" /> {title}
        </h3>
      </div>
      <div className="p-2 grid grid-cols-2 gap-x-2 gap-y-1">
        <div className="space-y-0.5">
          <label className="mbr-label fz-label font-black text-slate-400 uppercase tracking-tight ml-0.5">Max.Amount</label>
          <div className="relative">
            <IndianRupee size={8} className="mbr-icon absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
            <input type="number" step="0.01" value={data.maxAmount}
              onChange={e => updateLoanType(loanType, 'maxAmount', parseFloat(e.target.value) || 0)}
              className={inputIconCls} />
          </div>
        </div>
        <div className="space-y-0.5">
          <label className="mbr-label fz-label font-black text-slate-400 uppercase tracking-tight ml-0.5">Rate (%)</label>
          <div className="relative">
            <Percent size={8} className="mbr-icon absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
            <input type="number" step="0.01" value={data.rate}
              onChange={e => updateLoanType(loanType, 'rate', parseFloat(e.target.value) || 0)}
              className={inputIconCls} />
          </div>
        </div>
        <div className="space-y-0.5">
          <label className="mbr-label fz-label font-black text-slate-400 uppercase tracking-tight ml-0.5">No.Of Install</label>
          <input type="number" value={data.numberOfInstallments}
            onChange={e => updateLoanType(loanType, 'numberOfInstallments', parseInt(e.target.value) || 0)}
            className={inputCls} />
        </div>
        <div className="space-y-0.5">
          <label className="mbr-label fz-label font-black text-slate-400 uppercase tracking-tight ml-0.5">No. Of Gr</label>
          <div className="relative">
            <Users size={8} className="mbr-icon absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
            <input type="number" value={data.numberOfGuarantors}
              onChange={e => updateLoanType(loanType, 'numberOfGuarantors', parseInt(e.target.value) || 0)}
              className={inputIconCls} />
          </div>
        </div>
        {data.penalRate !== undefined && (
          <div className="space-y-0.5">
            <label className="mbr-label fz-label font-black text-slate-400 uppercase tracking-tight ml-0.5">Penal Rate (%)</label>
            <div className="relative">
              <Percent size={8} className="mbr-icon absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              <input type="number" step="0.01" value={data.penalRate}
                onChange={e => updateLoanType(loanType, 'penalRate', parseFloat(e.target.value) || 0)}
                className={inputIconCls} />
            </div>
          </div>
        )}
        {data.graceDays !== undefined && (
          <div className="space-y-0.5">
            <label className="mbr-label fz-label font-black text-slate-400 uppercase tracking-tight ml-0.5" title="Grace runs from the 1st through this day of an installment's own due month — not a day-count from its due date.">
              Grace Ends (Day of Month)
            </label>
            <div className="relative">
              <Clock size={8} className="mbr-icon absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              <input type="number" min={0} max={31} step="1" value={data.graceDays}
                onChange={e => updateLoanType(loanType, 'graceDays', parseInt(e.target.value, 10) || 0)}
                className={inputIconCls} />
            </div>
          </div>
        )}
        {data.sameMonthPenalPercent !== undefined && (
          <div className="space-y-0.5">
            <label className="mbr-label fz-label font-black text-slate-400 uppercase tracking-tight ml-0.5" title="Flat fee charged once grace expires but still within the same due month: (this % × unpaid principal) ÷ the divisor beside it.">
              Same-Month Late Fee (%)
            </label>
            <div className="relative">
              <Percent size={8} className="mbr-icon absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              <input type="number" min={0} step="0.01" value={data.sameMonthPenalPercent}
                onChange={e => updateLoanType(loanType, 'sameMonthPenalPercent', parseFloat(e.target.value) || 0)}
                className={inputIconCls} />
            </div>
          </div>
        )}
        {data.sameMonthPenalDivisor !== undefined && (
          <div className="space-y-0.5">
            <label className="mbr-label fz-label font-black text-slate-400 uppercase tracking-tight ml-0.5" title="Divisor in the same-month late fee formula: (percentage × unpaid principal) ÷ this number.">
              Same-Month Fee Divisor
            </label>
            <input type="number" min={1} step="0.01" value={data.sameMonthPenalDivisor}
              onChange={e => updateLoanType(loanType, 'sameMonthPenalDivisor', parseFloat(e.target.value) || 0)}
              className={inputCls} />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#4f46e5', borderRadius: 8 } }}>
      <style>{`
        html.dark .mbr-page { background: #000000 !important; }

        /* Tab bar */
        html.dark .mbr-page .mbr-tabbar { background: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .mbr-page .mbr-tab-btn { color: rgba(255,255,255,.08) !important; }
        html.dark .mbr-page .mbr-tab-btn.active { color: #f5f5f7 !important; }
        html.dark .mbr-page .mbr-tab-indicator { background: #818cf8 !important; }

        /* Workspace background */
        html.dark .mbr-page .mbr-workspace { background: #000000 !important; }

        /* Loan + generic cards */
        html.dark .mbr-page .mbr-card { background: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .mbr-page .mbr-card-header { background: linear-gradient(90deg,#1c1c1e,#000000) !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .mbr-page .mbr-card-title { color: #8e8e93 !important; }

        /* Labels, icons, inputs */
        html.dark .mbr-page .mbr-label { color: rgba(255,255,255,.08) !important; }
        html.dark .mbr-page .mbr-icon { color: rgba(255,255,255,.08) !important; }
        html.dark .mbr-page .mbr-input { background: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
        html.dark .mbr-page .mbr-input:focus { background: rgba(255,255,255,.05) !important; border-color: #6366f1 !important; box-shadow: 0 0 0 2px rgba(99,102,241,0.15) !important; }
        html.dark .mbr-page .mbr-input::placeholder { color: rgba(255,255,255,.08) !important; }

        /* Others & Penal Sector */
        html.dark .mbr-page .mbr-others-card { background: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .mbr-page .mbr-others-header { background: #000000 !important; }
        html.dark .mbr-page .mbr-others-body { background: #1c1c1e !important; }

        /* Policy notice */
        html.dark .mbr-page .mbr-notice { background: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; border-left-color: #6366f1 !important; }
        html.dark .mbr-page .mbr-notice-icon { background: #1c1c1e !important; color: #818cf8 !important; }
        html.dark .mbr-page .mbr-notice-text { color: #71717a !important; }

        /* General Settings toggle rows */
        html.dark .mbr-page .mbr-toggle-row { border-color: rgba(255,255,255,.08) !important; }
        html.dark .mbr-page .mbr-toggle-row:hover { background: #000000 !important; }
        html.dark .mbr-page .mbr-toggle-label { color: #8e8e93 !important; }
        html.dark .mbr-page .mbr-gs-card { background: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .mbr-page .mbr-divider { background: rgba(255,255,255,.07) !important; }

        /* Fund Management */
        html.dark .mbr-page .mbr-fm-card { background: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .mbr-page .mbr-fm-card-header { background: linear-gradient(90deg,#1c1c1e,#000000) !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .mbr-page .mbr-fm-section-title { color: #8e8e93 !important; }
        html.dark .mbr-page .mbr-fm-hint { color: rgba(255,255,255,.08) !important; }
        html.dark .mbr-page .mbr-chart-header { background: #000000 !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .mbr-page .mbr-chart-col-label { color: rgba(255,255,255,.08) !important; }
        html.dark .mbr-page .mbr-chart-row:hover { background: rgba(30,41,59,0.6) !important; }
        html.dark .mbr-page .mbr-chart-num { background: #000000 !important; color: rgba(255,255,255,.08) !important; }
        html.dark .mbr-page .mbr-chart-input { background: #1c1c1e !important; border-color: rgba(255,255,255,.08) !important; color: #f5f5f7 !important; }
        html.dark .mbr-page .mbr-chart-input:focus { border-color: #6366f1 !important; }
        html.dark .mbr-page .mbr-chart-empty { color: rgba(255,255,255,.08) !important; }
        html.dark .mbr-page .mbr-del-btn:hover { background: rgba(127,29,29,0.3) !important; border-color: #7f1d1d !important; }

        /* Footer */
        html.dark .mbr-page .mbr-footer { background: #0c0c0e !important; border-color: rgba(255,255,255,.08) !important; }
        html.dark .mbr-page .mbr-footer-text { color: rgba(255,255,255,.08) !important; }

        /* antd Switch dark mode */
        html.dark .mbr-page .ant-switch { background: rgba(255,255,255,.08) !important; }
        html.dark .mbr-page .ant-switch.ant-switch-checked { background: #6366f1 !important; }
      `}</style>

      <div className="mbr-page h-screen flex flex-col bg-slate-50 font-sans overflow-hidden relative">

        {/* Loading overlay */}
        {(loading || saving) && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl px-6 py-4 flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="fz-caption font-black text-slate-700 uppercase tracking-widest">
                {saving ? 'Saving rules…' : 'Loading rules…'}
              </span>
            </div>
          </div>
        )}

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 border-b border-slate-700 px-2 py-1 flex items-center justify-between z-10 shadow-lg shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="bg-white/10 p-1 rounded-lg text-white backdrop-blur-sm">
              <Settings size={12} />
            </div>
            <div>
              <h1 className="fz-small font-black text-white tracking-tight leading-none uppercase">Modify Business Rules</h1>
              <div className="flex items-center gap-1 mt-0.5 fz-micro font-bold text-slate-300 uppercase tracking-widest leading-none">
                <Building2 size={7} className="text-indigo-300" /> Policy Configuration Ledger
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <div className="hidden sm:flex items-center gap-1 bg-slate-700/50 px-1.5 py-0.5 rounded-full border border-white/10">
              <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" />
              <span className="fz-micro font-black text-slate-300 uppercase">Live Ruleset</span>
            </div>
            <button onClick={handleSave} disabled={saving || loading}
              className="h-5 px-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:opacity-60 text-white rounded-lg fz-micro font-black transition-all flex items-center gap-1 active:scale-95 uppercase tracking-widest">
              <Save size={9} /> Save Rules
            </button>
            <button onClick={closeWindow}
              className="w-5 h-5 flex items-center justify-center text-white/40 hover:text-white hover:bg-red-500/80 rounded transition-all">
              <X size={11} />
            </button>
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div className="mbr-tabbar bg-white border-b border-slate-200 px-3 flex gap-1 shrink-0">
          {([
            { key: 'loanParameters',  icon: <IndianRupee size={11} />, label: '1. Loan Parameters' },
            { key: 'generalSettings', icon: <Settings size={11} />,    label: '2. General Setting' },
            { key: 'fundManagement',  icon: <TrendingUp size={11} />,  label: '3. Fund Management' },
            { key: 'rdSystem',        icon: <Percent size={11} />,     label: '4. RD System' },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`mbr-tab-btn px-3 py-2.5 fz-caption font-black uppercase tracking-widest transition-all relative ${
                activeTab === tab.key ? 'text-slate-700 active' : 'text-slate-400 hover:text-slate-600'
              }`}>
              <div className="flex items-center gap-1.5">{tab.icon} {tab.label}</div>
              {activeTab === tab.key && (
                <motion.div layoutId="activeTab"
                  className="mbr-tab-indicator absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600" />
              )}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">

            {/* ── 1. Loan Parameters ── */}
            {activeTab === 'loanParameters' && (
              <motion.div key="loanParameters"
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="mbr-workspace h-full overflow-auto p-2 bg-slate-50/50">
                <div className="max-w-7xl mx-auto space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {/* Titles follow the columns each card actually writes — see the
                        mapping note in useBusinessRules.ts. The old "Loan Against R"
                        and "Regular Loan" labels were swapped relative to the rln and
                        aln columns the disbursement path reads, and a third
                        "Additional Loan" card had no backing columns at all
                        (always zeros, never saved). */}
                    {renderLoanSection('Regular Loan',      'regularLoan',     businessRules.regularLoan)}
                    {renderLoanSection('Additional Loan',   'additionalLoan',  businessRules.additionalLoan)}
                    {renderLoanSection('Grain Loan',        'mediumTermLoan',  businessRules.mediumTermLoan)}
                    {renderLoanSection('Emergency Loan',    'emergencyLoan',   businessRules.emergencyLoan)}
                    {renderLoanSection('Loan On Deposit',   'loanOnDeposit',   businessRules.loanOnDeposit)}

                    {/* Loan Against Deposits — custom layout */}
                    <div className="mbr-card bg-white border-2 border-slate-200 rounded-lg overflow-hidden shadow-sm">
                      <div className="mbr-card-header bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 px-2 py-1">
                        <h3 className="mbr-card-title fz-mini font-black text-slate-700 tracking-widest uppercase flex items-center gap-1">
                          <TrendingUp size={9} className="text-slate-500" /> Loan Against Deposits
                        </h3>
                      </div>
                      <div className="p-2 grid grid-cols-2 gap-x-2 gap-y-1">
                        {[
                          { label: 'Share Value%', field: 'shareValue', step: '0.1' },
                          { label: 'FD (%)',        field: 'fdPercentage', step: '0.01' },
                          { label: 'Overall Limit', field: 'overallLimit', step: '1' },
                          { label: 'Basic Pay',     field: 'basicPay', step: '0.01' },
                        ].map(f => (
                          <div key={f.field} className="space-y-0.5">
                            <label className="mbr-label fz-label font-black text-slate-400 uppercase tracking-tight ml-0.5">{f.label}</label>
                            <input type="number" step={f.step}
                              value={(businessRules.loanAgainstDeposits as any)[f.field]}
                              onChange={e => setBusinessRules(prev => ({
                                ...prev,
                                loanAgainstDeposits: { ...prev.loanAgainstDeposits, [f.field]: parseFloat(e.target.value) || 0 }
                              }))}
                              className={inputCls} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Regular Loan Eligibility — RD / Share Value rules.
                      These persist to system_configs (not busrules) because
                      that is where the loan services read them at application
                      and disbursement time. */}
                  <div className="mbr-others-card bg-white border-2 border-slate-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="mbr-others-header bg-slate-900 px-2 py-1 flex items-center gap-1">
                      <TrendingUp size={9} className="text-emerald-400" />
                      <h3 className="fz-mini font-black text-white tracking-widest uppercase">
                        Regular Loan Eligibility (RD / Share Value)
                      </h3>
                    </div>
                    <div className="mbr-others-body p-2 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 bg-white">
                      <div className="space-y-0.5 col-span-2">
                        <label className="mbr-label fz-label font-black text-slate-400 uppercase tracking-tight ml-0.5">Max. Regular Loan Limit</label>
                        <input type="number" step="1"
                          value={businessRules.regularLoanEligibility.maxLimit}
                          onChange={e => setBusinessRules(prev => ({
                            ...prev,
                            regularLoanEligibility: { ...prev.regularLoanEligibility, maxLimit: parseFloat(e.target.value) || 0 }
                          }))}
                          className={inputCls} />
                      </div>
                      <div className="space-y-0.5">
                        <label className="mbr-label fz-label font-black text-slate-400 uppercase tracking-tight ml-0.5">RD Req. (%)</label>
                        <input type="number" step="0.01"
                          value={businessRules.regularLoanEligibility.rdPercent}
                          onChange={e => setBusinessRules(prev => ({
                            ...prev,
                            regularLoanEligibility: { ...prev.regularLoanEligibility, rdPercent: parseFloat(e.target.value) || 0 }
                          }))}
                          className={inputCls} />
                      </div>
                      <div className="space-y-0.5">
                        <label className="mbr-label fz-label font-black text-slate-400 uppercase tracking-tight ml-0.5">Share Req. (%)</label>
                        <input type="number" step="0.01"
                          value={businessRules.regularLoanEligibility.sharePercent}
                          onChange={e => setBusinessRules(prev => ({
                            ...prev,
                            regularLoanEligibility: { ...prev.regularLoanEligibility, sharePercent: parseFloat(e.target.value) || 0 }
                          }))}
                          className={inputCls} />
                      </div>
                      <div className="space-y-0.5">
                        <label className="mbr-label fz-label font-black text-slate-400 uppercase tracking-tight ml-0.5">Shortfall Handling</label>
                        <select
                          value={businessRules.regularLoanEligibility.shortfallMode}
                          onChange={e => setBusinessRules(prev => ({
                            ...prev,
                            regularLoanEligibility: { ...prev.regularLoanEligibility, shortfallMode: e.target.value as any }
                          }))}
                          className={inputCls}>
                          <option value="DEDUCT">Deduct from disbursement</option>
                          <option value="BLOCK">Block the loan</option>
                          <option value="IGNORE">Ignore (no deduction)</option>
                        </select>
                      </div>
                      <div className="space-y-0.5 col-span-2">
                        <label className="mbr-label fz-label font-black text-slate-400 uppercase tracking-tight ml-0.5">Limit Calculation</label>
                        <select
                          value={businessRules.regularLoanEligibility.limitCalc}
                          onChange={e => setBusinessRules(prev => ({
                            ...prev,
                            regularLoanEligibility: { ...prev.regularLoanEligibility, limitCalc: e.target.value as any }
                          }))}
                          className={inputCls}>
                          <option value="OUTSTANDING_PLUS_NEW">Existing Regular Outstanding + New Loan</option>
                          <option value="NEW_ONLY">New Loan only</option>
                        </select>
                      </div>
                      <div className="space-y-0.5">
                        <label className="mbr-label fz-label font-black text-slate-400 uppercase tracking-tight ml-0.5">RD Head Code</label>
                        <input type="text"
                          value={businessRules.regularLoanEligibility.rdHeadCode}
                          onChange={e => setBusinessRules(prev => ({
                            ...prev,
                            regularLoanEligibility: { ...prev.regularLoanEligibility, rdHeadCode: e.target.value }
                          }))}
                          className={inputCls} />
                      </div>
                      <div className="space-y-0.5">
                        <label className="mbr-label fz-label font-black text-slate-400 uppercase tracking-tight ml-0.5">Share Head Code</label>
                        <input type="text"
                          value={businessRules.regularLoanEligibility.shareHeadCode}
                          onChange={e => setBusinessRules(prev => ({
                            ...prev,
                            regularLoanEligibility: { ...prev.regularLoanEligibility, shareHeadCode: e.target.value }
                          }))}
                          className={inputCls} />
                      </div>
                      <div className="col-span-full grid grid-cols-3 gap-2 pt-1">
                        <div className="mbr-toggle-row flex items-center justify-between p-1.5 rounded-lg border-2 border-slate-100 hover:bg-slate-50 transition-colors">
                          <span className="mbr-toggle-label fz-mini font-bold text-slate-600">Apply to Regular Loan</span>
                          <Switch size="small"
                            checked={businessRules.regularLoanEligibility.applyToRegularLoan}
                            onChange={val => setBusinessRules(prev => ({
                              ...prev,
                              regularLoanEligibility: { ...prev.regularLoanEligibility, applyToRegularLoan: val }
                            }))} />
                        </div>
                        <div className="mbr-toggle-row flex items-center justify-between p-1.5 rounded-lg border-2 border-slate-100 hover:bg-slate-50 transition-colors">
                          <span className="mbr-toggle-label fz-mini font-bold text-slate-600">Apply to Additional Loan</span>
                          <Switch size="small"
                            checked={businessRules.regularLoanEligibility.applyToAdditionalLoan}
                            onChange={val => setBusinessRules(prev => ({
                              ...prev,
                              regularLoanEligibility: { ...prev.regularLoanEligibility, applyToAdditionalLoan: val }
                            }))} />
                        </div>
                        <div className="mbr-toggle-row flex items-center justify-between p-1.5 rounded-lg border-2 border-slate-100 hover:bg-slate-50 transition-colors">
                          <span className="mbr-toggle-label fz-mini font-bold text-slate-600">Apply to Emergency Loan</span>
                          <Switch size="small"
                            checked={businessRules.regularLoanEligibility.applyToEmergencyLoan}
                            onChange={val => setBusinessRules(prev => ({
                              ...prev,
                              regularLoanEligibility: { ...prev.regularLoanEligibility, applyToEmergencyLoan: val }
                            }))} />
                        </div>
                      </div>
                      <div className="col-span-full fz-mini text-slate-500 leading-tight pt-0.5">
                        Independently switchable per loan type (all on by default). RD/Share requirements are
                        calculated on total exposure (existing outstanding of that same loan type + new loan) and
                        are never added to the loan amount — any shortfall is withheld from the disbursement.
                      </div>
                    </div>
                  </div>

                  {/* Others & Penal Sector */}
                  <div className="mbr-others-card bg-white border-2 border-slate-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="mbr-others-header bg-slate-900 px-2 py-1 flex items-center gap-1">
                      <Calculator size={9} className="text-indigo-400" />
                      <h3 className="fz-mini font-black text-white tracking-widest uppercase">Others & Penal Sector</h3>
                    </div>
                    <div className="mbr-others-body p-2 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 bg-white">
                      <div className="space-y-0.5 col-span-2">
                        <label className="mbr-label fz-label font-black text-slate-400 uppercase tracking-tight ml-0.5">Min. Membership (Months)</label>
                        <input type="number" value={businessRules.others.minMembership}
                          onChange={e => updateOthers('minMembership', parseInt(e.target.value) || 0)}
                          className={inputCls} />
                      </div>
                      {/* Min./Max. CD Amt removed — dead legacy fields, never
                          enforced by any real validation. CD and RD are the
                          same product here; the real, enforced minimum is
                          the RD System tab's Minimum Monthly RD Amount. */}
                      {[
                        { label: 'Min. Share Amt', field: 'minShareAmt' },
                        { label: 'Max. Share Amt', field: 'maxShareAmt' },
                        { label: 'Security Dep',   field: 'securityDep' },
                      ].map(item => (
                        <div key={item.field} className="space-y-0.5">
                          <label className="mbr-label fz-label font-black text-slate-400 uppercase tracking-tight ml-0.5 whitespace-nowrap">{item.label}</label>
                          <input type="number" step="0.01"
                            value={(businessRules.others as any)[item.field]}
                            onChange={e => updateOthers(item.field, parseFloat(e.target.value) || 0)}
                            className={inputCls} />
                        </div>
                      ))}
                      {/* The "Loan Against R Penal Rate" box that used to sit here wrote
                          rlnpenalrate — the REGULAR loan penal rate — from a tab that gave
                          no hint of it. It now lives on the Regular Loan card in tab 1
                          beside the rate it belongs to. Two inputs on one column would
                          just race each other. */}
                    </div>
                  </div>

                  {/* Policy notice */}
                  <div className="mbr-notice bg-white border-2 border-slate-200 border-l-4 border-l-indigo-600 rounded-lg p-2 flex items-center gap-2 shadow-sm">
                    <div className="mbr-notice-icon bg-slate-50 p-1 rounded-lg text-slate-600 shadow-sm shrink-0">
                      <Info size={10} />
                    </div>
                    <p className="mbr-notice-text fz-mini text-slate-600 font-semibold leading-relaxed">
                      <strong className="uppercase tracking-widest font-black mr-1">Policy Notice:</strong>
                      These rules define the financial compliance and operational framework. Changes are applied in real-time to all session calculations. Ensure all parameters align with the latest board resolutions before synchronization.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── 2. General Settings ── */}
            {activeTab === 'generalSettings' && (
              <motion.div key="generalSettings"
                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="mbr-workspace h-full overflow-auto p-2 bg-slate-50/50 flex flex-col items-center justify-center">
                <div className="max-w-5xl w-full">
                  <div className="mbr-gs-card bg-white border-2 border-slate-200 rounded-lg shadow-xl overflow-hidden">
                    <div className="p-2 grid grid-cols-1 gap-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                        {[
                          { label: 'DataEntry Mode',                              field: 'dataEntryMode' },
                          { label: 'Print Demand Format Horizontal',              field: 'printDemandFormatHorizontal' },
                          { label: 'Consider Intt. Before 10th',                 field: 'considerIntBefore10th' },
                          { label: 'Calculate Interest Using Reducing Balance',   field: 'calculateInterestUsingReducingBalance' },
                          { label: 'Show Consolidate Intt. Amount in Demand',    field: 'showConsolidateIntAmountInDemand' },
                          { label: 'Get Working Charges (Rs.)',                  field: 'getWorkingCharges' },
                          { label: 'Auto Day-End (Nightly Close, 11:30 PM)',      field: 'autoDayEndCloseEnabled' },
                        ].map(item => (
                          <div key={item.field}
                            className="mbr-toggle-row flex items-center justify-between p-1.5 rounded-lg border-2 border-slate-100 hover:bg-slate-50 transition-colors">
                            <span className="mbr-toggle-label fz-mini font-bold text-slate-600 max-w-[180px]">{item.label}</span>
                            <Switch size="small"
                              checked={(businessRules.generalSettings as any)[item.field]}
                              onChange={val => updateGeneralSetting(item.field as keyof GeneralSettings, val)} />
                          </div>
                        ))}
                      </div>

                      <div className="mbr-divider h-px bg-slate-100" />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                          { label: 'Min. Balance For Saving A/c',      field: 'minBalanceForSavingAc',          type: 'float' },
                          { label: 'Working Charges Amount',            field: 'workingChargesAmount',           type: 'int' },
                          { label: 'Average Interest Calculation Slot', field: 'averageInterestCalculationSlot', type: 'int' },
                        ].map(f => (
                          <div key={f.field} className="space-y-0.5">
                            <label className="mbr-label fz-label font-black text-slate-400 uppercase tracking-widest ml-0.5">{f.label}</label>
                            <input type="number" step={f.type === 'float' ? '0.01' : '1'}
                              value={(businessRules.generalSettings as any)[f.field]}
                              onChange={e => updateGeneralSetting(f.field as keyof GeneralSettings,
                                f.type === 'float' ? parseFloat(e.target.value) || 0 : parseInt(e.target.value) || 0)}
                              className={`mbr-input w-full h-6 px-2 bg-slate-50 border-2 border-slate-200 rounded-lg fz-body font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-500 focus:ring-2 focus:ring-slate-400/30 transition-all shadow-inner`} />
                          </div>
                        ))}
                        {/* Working Charges Head — income head dropdown (required when Get Working Charges is enabled) */}
                        <div className="space-y-0.5">
                          <label className="mbr-label fz-label font-black text-slate-400 uppercase tracking-widest ml-0.5">
                            Working Charges Head {businessRules.generalSettings.getWorkingCharges && <span className="text-rose-500">*</span>}
                          </label>
                          <select
                            value={businessRules.generalSettings.workingChargesHead}
                            onChange={e => updateGeneralSetting('workingChargesHead' as keyof GeneralSettings, e.target.value)}
                            className={`mbr-input w-full h-6 px-2 bg-slate-50 border-2 rounded-lg fz-body font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-500 transition-all shadow-inner ${
                              businessRules.generalSettings.getWorkingCharges && !businessRules.generalSettings.workingChargesHead
                                ? 'border-rose-400' : 'border-slate-200'
                            }`}
                          >
                            <option value="">Select head...</option>
                            <option value="I1001">ENTRY FEE</option>
                            <option value="I1002">INTT FROM MEMBER</option>
                            <option value="I1003">INTT FROM M BANK</option>
                            <option value="I1004">INTT FROM STAFF CONSUMER LOAN</option>
                            <option value="I1005">INTT FROM STAFF S.D. LOAN</option>
                            <option value="I1007">INTT FORFIT A/C</option>
                            <option value="I1008">MISC RECEIPTS</option>
                            <option value="I1009">HOUSE RENT</option>
                          </select>
                        </div>
                        <div className="space-y-0.5">
                          <label className="mbr-label fz-label font-black text-slate-400 uppercase tracking-widest ml-0.5">Profit Head</label>
                          <div className="relative">
                            <input type="text" value={businessRules.generalSettings.profitHead}
                              onChange={e => updateGeneralSetting('profitHead', e.target.value)}
                              placeholder="System ledger head"
                              className="mbr-input w-full h-6 px-2 pr-6 bg-slate-50 border-2 border-slate-200 rounded-lg fz-tiny font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-500 focus:ring-2 focus:ring-slate-400/30 transition-all shadow-inner" />
                            <Database size={9} className="mbr-icon absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                          </div>
                        </div>
                      </div>

                      <div className="mbr-divider h-px bg-slate-100" />

                      {/* Loan Early Closure protection — password re-entry and a
                          minimum-role gate are deliberately deferred; only the
                          type-to-confirm toggle exists so far. */}
                      <div>
                        <div className="fz-mini font-black text-slate-400 uppercase tracking-widest mb-1">Loan Early Closure Protection</div>
                        <div className="mbr-toggle-row flex items-center justify-between p-1.5 rounded-lg border-2 border-slate-100 hover:bg-slate-50 transition-colors">
                          <span className="mbr-toggle-label fz-mini font-bold text-slate-600 max-w-[280px]">
                            Require typing the loan case number to confirm before executing
                          </span>
                          <Switch size="small"
                            checked={businessRules.earlyClosureProtection.requireTypeConfirm}
                            onChange={val => setBusinessRules(prev => ({
                              ...prev,
                              earlyClosureProtection: { ...prev.earlyClosureProtection, requireTypeConfirm: val }
                            }))} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── 3. Fund Management ── */}
            {activeTab === 'fundManagement' && (
              <motion.div key="fundManagement"
                initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.03 }}
                transition={{ duration: 0.2 }}
                className="mbr-workspace h-full overflow-auto p-2 bg-slate-50/50">
                <div className="max-w-6xl mx-auto space-y-2">

                  {/* Global Fund Parameters */}
                  <div className="mbr-fm-card bg-white border-2 border-slate-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="mbr-fm-card-header bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 px-2 py-1 flex items-center gap-1.5">
                      <div className="bg-slate-100 p-1 rounded-lg text-slate-600"><Settings size={9} /></div>
                      <h3 className="mbr-fm-section-title fz-mini font-black text-slate-700 uppercase tracking-widest">Global Fund Parameters</h3>
                    </div>
                    <div className="p-2 grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div className="space-y-0.5">
                        <label className="mbr-label fz-label font-black text-slate-400 uppercase tracking-widest ml-0.5">Annual Fund Interest Rate (%)</label>
                        <div className="relative">
                          <Percent size={9} className="mbr-icon absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                          <input type="number" step="0.01" value={businessRules.fundManagement.fundInterestRate}
                            onChange={e => updateFundManagement('fundInterestRate', parseFloat(e.target.value) || 0)}
                            className="mbr-input w-full h-6 pl-7 pr-2 bg-slate-50 border-2 border-slate-200 rounded-lg fz-tiny font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-500 focus:ring-2 focus:ring-slate-400/30 transition-all shadow-inner"
                            placeholder="0.00" />
                        </div>
                        <p className="mbr-fm-hint fz-micro text-slate-400 font-medium ml-1">Applied on opening balance annually</p>
                      </div>
                      <div className="space-y-0.5">
                        <label className="mbr-label fz-label font-black text-slate-400 uppercase tracking-widest ml-0.5">Dividend Payout (%)</label>
                        <div className="relative">
                          <TrendingUp size={9} className="mbr-icon absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                          <input type="number" step="0.01" value={businessRules.fundManagement.dividendPercent}
                            onChange={e => updateFundManagement('dividendPercent', parseFloat(e.target.value) || 0)}
                            className="mbr-input w-full h-6 pl-7 pr-2 bg-slate-50 border-2 border-slate-200 rounded-lg fz-tiny font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-500 focus:ring-2 focus:ring-slate-400/30 transition-all shadow-inner"
                            placeholder="0.00" />
                        </div>
                        <p className="mbr-fm-hint fz-micro text-slate-400 font-medium ml-1">Percentage of share capital</p>
                      </div>
                      <div className="space-y-0.5">
                        <label className="mbr-label fz-label font-black text-slate-400 uppercase tracking-widest ml-0.5">Group Insurance Deduction (₹)</label>
                        <div className="relative">
                          <ShieldCheck size={9} className="mbr-icon absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                          <input type="number" value={businessRules.fundManagement.groupInsuranceAmount}
                            onChange={e => updateFundManagement('groupInsuranceAmount', parseFloat(e.target.value) || 0)}
                            className="mbr-input w-full h-6 pl-7 pr-2 bg-slate-50 border-2 border-slate-200 rounded-lg fz-tiny font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-500 focus:ring-2 focus:ring-slate-400/30 transition-all shadow-inner"
                            placeholder="0" />
                        </div>
                        <p className="mbr-fm-hint fz-micro text-slate-400 font-medium ml-1">Fixed yearly deduction amount</p>
                      </div>
                    </div>
                  </div>

                  {/* Interest Chart */}
                  <div className="mbr-fm-card bg-white border-2 border-slate-200 rounded-lg overflow-hidden shadow-sm flex flex-col h-[400px]">
                    <div className="mbr-chart-header bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 px-2 py-1 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-1.5">
                        <div className="bg-slate-100 p-1 rounded-lg text-slate-600"><Calculator size={9} /></div>
                        <div>
                          <h3 className="mbr-fm-section-title fz-mini font-black text-slate-700 uppercase tracking-widest">Monthly Contribution Interest Chart</h3>
                          <p className="mbr-fm-hint fz-micro text-slate-400 font-bold mt-0.5">Define yearly interest for each contribution slab</p>
                        </div>
                      </div>
                      <button onClick={addChartRow}
                        className="px-1.5 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg fz-micro font-black uppercase tracking-widest flex items-center gap-1 transition-all shadow-sm active:scale-95">
                        <Plus size={9} /> Add Slab
                      </button>
                    </div>

                    <div className="flex-1 overflow-auto p-0">
                      {businessRules.fundManagement.interestChart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                          <Database size={32} strokeWidth={1} className="mbr-chart-empty mb-2" />
                          <p className="mbr-chart-empty fz-mini font-bold uppercase tracking-widest">No slabs configured</p>
                          <p className="mbr-chart-empty fz-micro mt-0.5">Click "Add Slab" to start building the chart</p>
                        </div>
                      ) : (
                        <div className="w-full">
                          <div className="sticky top-0 mbr-chart-header bg-slate-50/90 backdrop-blur-sm border-b border-slate-100 grid grid-cols-12 px-2 py-1 z-10">
                            <div className="col-span-1 text-center mbr-chart-col-label fz-micro font-black text-slate-400 uppercase tracking-widest">#</div>
                            <div className="col-span-5 pl-2 mbr-chart-col-label fz-micro font-black text-slate-400 uppercase tracking-widest">Monthly Contribution (₹)</div>
                            <div className="col-span-5 pl-2 mbr-chart-col-label fz-micro font-black text-slate-400 uppercase tracking-widest">Yearly Interest Credit (₹)</div>
                            <div className="col-span-1 mbr-chart-col-label fz-micro font-black text-slate-400 uppercase tracking-widest text-center">Del</div>
                          </div>
                          <div className="divide-y divide-slate-50">
                            {businessRules.fundManagement.interestChart.map((row, idx) => (
                              <div key={idx}
                                className="mbr-chart-row grid grid-cols-12 px-2 py-1.5 items-center hover:bg-slate-50/50 transition-colors group">
                                <div className="col-span-1 text-center">
                                  <span className="mbr-chart-num bg-slate-100 text-slate-500 w-5 h-5 rounded flex items-center justify-center fz-mini font-bold mx-auto">
                                    {idx + 1}
                                  </span>
                                </div>
                                <div className="col-span-10 grid grid-cols-2 gap-4">
                                  <div className="relative flex items-center">
                                    <div className="absolute left-2 text-slate-300 pointer-events-none fz-mini">₹</div>
                                    <input type="number" value={row.monthlyContribution}
                                      onChange={e => handleChartChange(idx, 'monthlyContribution', parseFloat(e.target.value) || 0)}
                                      className="mbr-chart-input w-full h-6 pl-5 pr-2 bg-white border-2 border-slate-200 rounded-lg fz-tiny font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/40 transition-all"
                                      placeholder="0" />
                                    <ArrowRight size={9} className="absolute -right-3 text-slate-300/50" />
                                  </div>
                                  <div className="relative flex items-center">
                                    <div className="absolute left-2 text-slate-300 pointer-events-none fz-micro">Get</div>
                                    <input type="number" step="0.01" value={row.yearlyInterest}
                                      onChange={e => handleChartChange(idx, 'yearlyInterest', parseFloat(e.target.value) || 0)}
                                      className="mbr-chart-input w-full h-6 pl-7 pr-2 bg-white border-2 border-slate-200 rounded-lg fz-tiny font-bold text-slate-600 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/40 transition-all"
                                      placeholder="0.00" />
                                  </div>
                                </div>
                                <div className="col-span-1 flex justify-center">
                                  <button onClick={() => removeChartRow(idx)}
                                    className="mbr-del-btn w-5 h-5 flex items-center justify-center bg-white border-2 border-slate-100 text-slate-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    title="Remove Slab">
                                    <Trash2 size={9} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── 4. RD System ── */}
            {activeTab === 'rdSystem' && (
              <motion.div key="rdSystem"
                initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.03 }}
                transition={{ duration: 0.2 }}
                className="mbr-workspace h-full overflow-auto p-2 bg-slate-50/50">
                <div className="max-w-6xl mx-auto space-y-2">

                  {/* Core settings */}
                  <div className="mbr-fm-card bg-white border-2 border-slate-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="mbr-fm-card-header bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 px-2 py-1 flex items-center gap-1.5">
                      <div className="bg-slate-100 p-1 rounded-lg text-slate-600"><IndianRupee size={9} /></div>
                      <h3 className="mbr-fm-section-title fz-mini font-black text-slate-700 uppercase tracking-widest">Core RD Settings</h3>
                    </div>
                    <div className="p-2 grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div className="space-y-0.5">
                        <label className="mbr-label fz-label font-black text-slate-400 uppercase tracking-widest ml-0.5">Minimum Monthly RD Amount (₹)</label>
                        <div className="relative">
                          <IndianRupee size={9} className="mbr-icon absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                          <input type="number" step="1" value={businessRules.rdSystem.minMonthlyAmount}
                            onChange={e => updateRdSystem('minMonthlyAmount', parseFloat(e.target.value) || 0)}
                            className="mbr-input w-full h-6 pl-7 pr-2 bg-slate-50 border-2 border-slate-200 rounded-lg fz-tiny font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-500 focus:ring-2 focus:ring-slate-400/30 transition-all shadow-inner" />
                        </div>
                        <p className="mbr-fm-hint fz-micro text-slate-400 font-medium ml-1">Floor a member may select for their monthly RD contribution</p>
                      </div>
                      <div className="space-y-0.5">
                        <label className="mbr-label fz-label font-black text-slate-400 uppercase tracking-widest ml-0.5">Opening-Balance Interest Rate (%)</label>
                        <div className="relative">
                          <Percent size={9} className="mbr-icon absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                          <input type="number" step="0.01" value={businessRules.rdSystem.openingBalanceRate}
                            onChange={e => updateRdSystem('openingBalanceRate', parseFloat(e.target.value) || 0)}
                            className="mbr-input w-full h-6 pl-7 pr-2 bg-slate-50 border-2 border-slate-200 rounded-lg fz-tiny font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-500 focus:ring-2 focus:ring-slate-400/30 transition-all shadow-inner" />
                        </div>
                        <p className="mbr-fm-hint fz-micro text-slate-400 font-medium ml-1">Annual rate on the opening balance timeline — frozen per financial year at closing</p>
                      </div>
                      <div className="space-y-0.5">
                        <label className="mbr-label fz-label font-black text-slate-400 uppercase tracking-widest ml-0.5">Min. Balance After Withdrawal (₹)</label>
                        <div className="relative">
                          <IndianRupee size={9} className="mbr-icon absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                          <input type="number" step="1" value={businessRules.rdSystem.minBalanceAfterWithdrawal}
                            onChange={e => updateRdSystem('minBalanceAfterWithdrawal', parseFloat(e.target.value) || 0)}
                            className="mbr-input w-full h-6 pl-7 pr-2 bg-slate-50 border-2 border-slate-200 rounded-lg fz-tiny font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-500 focus:ring-2 focus:ring-slate-400/30 transition-all shadow-inner" />
                        </div>
                        <p className="mbr-fm-hint fz-micro text-slate-400 font-medium ml-1">A withdrawal must never take the balance below this</p>
                      </div>
                    </div>
                  </div>

                  {/* Payment-pattern eligibility thresholds */}
                  <div className="mbr-others-card bg-white border-2 border-slate-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="mbr-others-header bg-slate-900 px-2 py-1 flex items-center gap-1">
                      <TrendingUp size={9} className="text-emerald-400" />
                      <h3 className="fz-mini font-black text-white tracking-widest uppercase">
                        Full-Interest Eligibility Thresholds
                      </h3>
                    </div>
                    <div className="mbr-others-body p-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 bg-white">
                      {([
                        { label: 'Min. Consecutive Installments', field: 'minConsecutiveInstallments' as const },
                        { label: 'Max. Payment Gap (Months)',     field: 'maxPaymentGapMonths' as const },
                        { label: 'Max. Missed Installments',      field: 'maxMissedInstallments' as const },
                        { label: 'Min. Regular After Recovery',   field: 'minRegularAfterRecovery' as const },
                        { label: 'Max. Arrears Clearance (Months)', field: 'maxArrearsClearanceMonths' as const },
                      ]).map(item => (
                        <div key={item.field} className="space-y-0.5">
                          <label className="mbr-label fz-label font-black text-slate-400 uppercase tracking-tight ml-0.5">{item.label}</label>
                          <input type="number" step="1"
                            value={businessRules.rdSystem[item.field]}
                            onChange={e => updateRdSystem(item.field, parseInt(e.target.value, 10) || 0)}
                            className={inputCls} />
                        </div>
                      ))}
                      <div className="col-span-full grid grid-cols-2 gap-2 pt-1">
                        <div className="mbr-toggle-row flex items-center justify-between p-1.5 rounded-lg border-2 border-slate-100 hover:bg-slate-50 transition-colors">
                          <span className="mbr-toggle-label fz-mini font-bold text-slate-600">Allow Recovery From an Initial-Month Gap</span>
                          <Switch size="small"
                            checked={businessRules.rdSystem.allowInitialMissRecovery}
                            onChange={val => updateRdSystem('allowInitialMissRecovery', val)} />
                        </div>
                        <div className="mbr-toggle-row flex items-center justify-between p-1.5 rounded-lg border-2 border-slate-100 hover:bg-slate-50 transition-colors">
                          <span className="mbr-toggle-label fz-mini font-bold text-slate-600">Allow Recovery From a Later Gap</span>
                          <Switch size="small"
                            checked={businessRules.rdSystem.allowLaterMissRecovery}
                            onChange={val => updateRdSystem('allowLaterMissRecovery', val)} />
                        </div>
                        <div className="mbr-toggle-row flex items-center justify-between p-1.5 rounded-lg border-2 border-slate-100 hover:bg-slate-50 transition-colors">
                          <span className="mbr-toggle-label fz-mini font-bold text-slate-600">Allow Multiple Separate Gaps in One Year</span>
                          <Switch size="small"
                            checked={businessRules.rdSystem.allowMultipleGaps}
                            onChange={val => updateRdSystem('allowMultipleGaps', val)} />
                        </div>
                      </div>
                      <div className="col-span-full fz-mini text-slate-500 leading-tight pt-0.5">
                        These thresholds drive one automatic rule engine that evaluates each member's real 12-month
                        payment history — not a fixed list of patterns. A member who doesn't automatically qualify
                        still receives their normal RD interest in full; an authority can separately upgrade them to
                        full annual interest as an exception, never a prerequisite.
                      </div>
                    </div>
                  </div>

                  {/* Policy notice */}
                  <div className="mbr-notice bg-white border-2 border-slate-200 border-l-4 border-l-amber-500 rounded-lg p-2 flex items-center gap-2 shadow-sm">
                    <div className="mbr-notice-icon bg-slate-50 p-1 rounded-lg text-amber-600 shadow-sm shrink-0">
                      <Info size={10} />
                    </div>
                    <p className="mbr-notice-text fz-mini text-slate-600 font-semibold leading-relaxed">
                      <strong className="uppercase tracking-widest font-black mr-1">Placeholder Values:</strong>
                      The numbers shown above are working defaults, not finalized policy. Update them once the society
                      confirms the real thresholds — nothing about the eligibility engine itself is hardcoded to these.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Footer ── */}
        <div className="mbr-footer px-2 py-1 bg-white border-t border-slate-100 flex items-center justify-between shrink-0 opacity-60">
          <div className="flex items-center gap-1">
            <Building2 size={9} className="text-slate-400" />
            <span className="mbr-footer-text fz-micro font-bold text-slate-500 uppercase tracking-tight">Trust Nagpur - Policy Governance</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5 text-slate-600">
              <ShieldCheck size={9} />
              <span className="mbr-footer-text fz-micro font-black uppercase">Standard Compliant</span>
            </div>
            <div className="w-px h-2 bg-slate-200" />
            <span className="mbr-footer-text fz-micro font-bold text-slate-300 uppercase tracking-widest">RULESET_V3.1.2</span>
          </div>
        </div>

      </div>
    </ConfigProvider>
  );
};

export default ModifyBusinessRules;
