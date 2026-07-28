// page/ModifyBusinessRules.tsx

import React, { useState } from 'react';
import {
  IndianRupee, Calculator, ShieldCheck, Settings,
  Database, TrendingUp, Percent, Users, Building2,
  Save, Info, Trash2, Plus, ArrowRight, X,
} from 'lucide-react';
import { ConfigProvider, Switch } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import { useBusinessRules, BusinessRulesData, GeneralSettings, LoanType } from '../hook/useBusinessRules';

type TabType = 'loanParameters' | 'generalSettings' | 'fundManagement';

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

  // ── Loan section renderer ──
  const renderLoanSection = (title: string, loanType: keyof BusinessRulesData, data: LoanType) => (
    <div className="mbr-card bg-white border-2 border-slate-200 rounded-lg overflow-hidden hover:border-slate-400 transition-all shadow-sm">
      <div className="mbr-card-header bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 px-2 py-1 flex items-center">
        <h3 className="mbr-card-title text-[8px] font-black text-slate-700 tracking-widest uppercase flex items-center gap-1">
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
      </div>
    </div>
  );

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#4f46e5', borderRadius: 8 } }}>
      <style>{`
        html.dark .mbr-page { background: #0f172a !important; }

        /* Tab bar */
        html.dark .mbr-page .mbr-tabbar { background: #1e293b !important; border-color: #334155 !important; }
        html.dark .mbr-page .mbr-tab-btn { color: #475569 !important; }
        html.dark .mbr-page .mbr-tab-btn.active { color: #e2e8f0 !important; }
        html.dark .mbr-page .mbr-tab-indicator { background: #818cf8 !important; }

        /* Workspace background */
        html.dark .mbr-page .mbr-workspace { background: #0f172a !important; }

        /* Loan + generic cards */
        html.dark .mbr-page .mbr-card { background: #1e293b !important; border-color: #334155 !important; }
        html.dark .mbr-page .mbr-card-header { background: linear-gradient(90deg,#1e293b,#0f172a) !important; border-color: #334155 !important; }
        html.dark .mbr-page .mbr-card-title { color: #94a3b8 !important; }

        /* Labels, icons, inputs */
        html.dark .mbr-page .mbr-label { color: #475569 !important; }
        html.dark .mbr-page .mbr-icon { color: #475569 !important; }
        html.dark .mbr-page .mbr-input { background: #0f172a !important; border-color: #334155 !important; color: #e2e8f0 !important; }
        html.dark .mbr-page .mbr-input:focus { background: #0f172a !important; border-color: #6366f1 !important; box-shadow: 0 0 0 2px rgba(99,102,241,0.15) !important; }
        html.dark .mbr-page .mbr-input::placeholder { color: #334155 !important; }

        /* Others & Penal Sector */
        html.dark .mbr-page .mbr-others-card { background: #1e293b !important; border-color: #334155 !important; }
        html.dark .mbr-page .mbr-others-header { background: #0f172a !important; }
        html.dark .mbr-page .mbr-others-body { background: #1e293b !important; }

        /* Policy notice */
        html.dark .mbr-page .mbr-notice { background: #1e293b !important; border-color: #334155 !important; border-left-color: #6366f1 !important; }
        html.dark .mbr-page .mbr-notice-icon { background: #1e293b !important; color: #818cf8 !important; }
        html.dark .mbr-page .mbr-notice-text { color: #64748b !important; }

        /* General Settings toggle rows */
        html.dark .mbr-page .mbr-toggle-row { border-color: #334155 !important; }
        html.dark .mbr-page .mbr-toggle-row:hover { background: #0f172a !important; }
        html.dark .mbr-page .mbr-toggle-label { color: #94a3b8 !important; }
        html.dark .mbr-page .mbr-gs-card { background: #1e293b !important; border-color: #334155 !important; }
        html.dark .mbr-page .mbr-divider { background: #334155 !important; }

        /* Fund Management */
        html.dark .mbr-page .mbr-fm-card { background: #1e293b !important; border-color: #334155 !important; }
        html.dark .mbr-page .mbr-fm-card-header { background: linear-gradient(90deg,#1e293b,#0f172a) !important; border-color: #334155 !important; }
        html.dark .mbr-page .mbr-fm-section-title { color: #94a3b8 !important; }
        html.dark .mbr-page .mbr-fm-hint { color: #475569 !important; }
        html.dark .mbr-page .mbr-chart-header { background: #0f172a !important; border-color: #334155 !important; }
        html.dark .mbr-page .mbr-chart-col-label { color: #475569 !important; }
        html.dark .mbr-page .mbr-chart-row:hover { background: rgba(30,41,59,0.6) !important; }
        html.dark .mbr-page .mbr-chart-num { background: #0f172a !important; color: #475569 !important; }
        html.dark .mbr-page .mbr-chart-input { background: #1e293b !important; border-color: #334155 !important; color: #e2e8f0 !important; }
        html.dark .mbr-page .mbr-chart-input:focus { border-color: #6366f1 !important; }
        html.dark .mbr-page .mbr-chart-empty { color: #475569 !important; }
        html.dark .mbr-page .mbr-del-btn:hover { background: rgba(127,29,29,0.3) !important; border-color: #7f1d1d !important; }

        /* Footer */
        html.dark .mbr-page .mbr-footer { background: #1e293b !important; border-color: #334155 !important; }
        html.dark .mbr-page .mbr-footer-text { color: #334155 !important; }

        /* antd Switch dark mode */
        html.dark .mbr-page .ant-switch { background: #334155 !important; }
        html.dark .mbr-page .ant-switch.ant-switch-checked { background: #6366f1 !important; }
      `}</style>

      <div className="mbr-page h-screen flex flex-col bg-slate-50 font-sans overflow-hidden relative">

        {/* Loading overlay */}
        {(loading || saving) && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl px-6 py-4 flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">
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
              <h1 className="text-[10px] font-black text-white tracking-tight leading-none uppercase">Modify Business Rules</h1>
              <div className="flex items-center gap-1 mt-0.5 text-[7px] font-bold text-slate-300 uppercase tracking-widest leading-none">
                <Building2 size={7} className="text-indigo-300" /> Policy Configuration Ledger
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <div className="hidden sm:flex items-center gap-1 bg-slate-700/50 px-1.5 py-0.5 rounded-full border border-white/10">
              <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[7px] font-black text-slate-300 uppercase">Live Ruleset</span>
            </div>
            <button onClick={handleSave} disabled={saving || loading}
              className="h-5 px-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:opacity-60 text-white rounded-lg text-[7px] font-black transition-all flex items-center gap-1 active:scale-95 uppercase tracking-widest">
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
                    {renderLoanSection('Loan Against R',    'loanAgainstR',    businessRules.loanAgainstR)}
                    {renderLoanSection('Regular Loan',      'longTermLoan',    businessRules.longTermLoan)}
                    {renderLoanSection('Grain Loan',        'mediumTermLoan',  businessRules.mediumTermLoan)}
                    {renderLoanSection('Emergency Loan',    'emergencyLoan',   businessRules.emergencyLoan)}
                    {renderLoanSection('Additional Loan',   'additionalLoan',  businessRules.additionalLoan)}
                    {renderLoanSection('Loan On Deposit',   'loanOnDeposit',   businessRules.loanOnDeposit)}

                    {/* Loan Against Deposits — custom layout */}
                    <div className="mbr-card bg-white border-2 border-slate-200 rounded-lg overflow-hidden shadow-sm">
                      <div className="mbr-card-header bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 px-2 py-1">
                        <h3 className="mbr-card-title text-[8px] font-black text-slate-700 tracking-widest uppercase flex items-center gap-1">
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

                  {/* Others & Penal Sector */}
                  <div className="mbr-others-card bg-white border-2 border-slate-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="mbr-others-header bg-slate-900 px-2 py-1 flex items-center gap-1">
                      <Calculator size={9} className="text-indigo-400" />
                      <h3 className="text-[8px] font-black text-white tracking-widest uppercase">Others & Penal Sector</h3>
                    </div>
                    <div className="mbr-others-body p-2 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 bg-white">
                      <div className="space-y-0.5 col-span-2">
                        <label className="mbr-label fz-label font-black text-slate-400 uppercase tracking-tight ml-0.5">Min. Membership (Months)</label>
                        <input type="number" value={businessRules.others.minMembership}
                          onChange={e => updateOthers('minMembership', parseInt(e.target.value) || 0)}
                          className={inputCls} />
                      </div>
                      {[
                        { label: 'Min. CD Amt',    field: 'minCDAmt' },
                        { label: 'Max. CD Amt',    field: 'maxCDAmt' },
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
                      <div className="space-y-0.5">
                        <label className="mbr-label fz-label font-black text-slate-400 uppercase tracking-tight ml-0.5 whitespace-nowrap flex items-center gap-1">
                          <Percent size={8} /> Penal Rate (%)
                        </label>
                        <input type="number" step="0.01" value={businessRules.penalRate}
                          onChange={e => setBusinessRules(prev => ({ ...prev, penalRate: parseFloat(e.target.value) || 0 }))}
                          className={inputCls} />
                      </div>
                    </div>
                  </div>

                  {/* Policy notice */}
                  <div className="mbr-notice bg-white border-2 border-slate-200 border-l-4 border-l-indigo-600 rounded-lg p-2 flex items-center gap-2 shadow-sm">
                    <div className="mbr-notice-icon bg-slate-50 p-1 rounded-lg text-slate-600 shadow-sm shrink-0">
                      <Info size={10} />
                    </div>
                    <p className="mbr-notice-text text-[8px] text-slate-600 font-semibold leading-relaxed">
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
                        ].map(item => (
                          <div key={item.field}
                            className="mbr-toggle-row flex items-center justify-between p-1.5 rounded-lg border-2 border-slate-100 hover:bg-slate-50 transition-colors">
                            <span className="mbr-toggle-label text-[8px] font-bold text-slate-600 max-w-[180px]">{item.label}</span>
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
                              className="mbr-input w-full h-6 px-2 pr-6 bg-slate-50 border-2 border-slate-200 rounded-lg text-[9px] font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-500 focus:ring-2 focus:ring-slate-400/30 transition-all shadow-inner" />
                            <Database size={9} className="mbr-icon absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                          </div>
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
                      <h3 className="mbr-fm-section-title text-[8px] font-black text-slate-700 uppercase tracking-widest">Global Fund Parameters</h3>
                    </div>
                    <div className="p-2 grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div className="space-y-0.5">
                        <label className="mbr-label fz-label font-black text-slate-400 uppercase tracking-widest ml-0.5">Annual Fund Interest Rate (%)</label>
                        <div className="relative">
                          <Percent size={9} className="mbr-icon absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                          <input type="number" step="0.01" value={businessRules.fundManagement.fundInterestRate}
                            onChange={e => updateFundManagement('fundInterestRate', parseFloat(e.target.value) || 0)}
                            className="mbr-input w-full h-6 pl-7 pr-2 bg-slate-50 border-2 border-slate-200 rounded-lg text-[9px] font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-500 focus:ring-2 focus:ring-slate-400/30 transition-all shadow-inner"
                            placeholder="0.00" />
                        </div>
                        <p className="mbr-fm-hint text-[7px] text-slate-400 font-medium ml-1">Applied on opening balance annually</p>
                      </div>
                      <div className="space-y-0.5">
                        <label className="mbr-label fz-label font-black text-slate-400 uppercase tracking-widest ml-0.5">Dividend Payout (%)</label>
                        <div className="relative">
                          <TrendingUp size={9} className="mbr-icon absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                          <input type="number" step="0.01" value={businessRules.fundManagement.dividendPercent}
                            onChange={e => updateFundManagement('dividendPercent', parseFloat(e.target.value) || 0)}
                            className="mbr-input w-full h-6 pl-7 pr-2 bg-slate-50 border-2 border-slate-200 rounded-lg text-[9px] font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-500 focus:ring-2 focus:ring-slate-400/30 transition-all shadow-inner"
                            placeholder="0.00" />
                        </div>
                        <p className="mbr-fm-hint text-[7px] text-slate-400 font-medium ml-1">Percentage of share capital</p>
                      </div>
                      <div className="space-y-0.5">
                        <label className="mbr-label fz-label font-black text-slate-400 uppercase tracking-widest ml-0.5">Group Insurance Deduction (₹)</label>
                        <div className="relative">
                          <ShieldCheck size={9} className="mbr-icon absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                          <input type="number" value={businessRules.fundManagement.groupInsuranceAmount}
                            onChange={e => updateFundManagement('groupInsuranceAmount', parseFloat(e.target.value) || 0)}
                            className="mbr-input w-full h-6 pl-7 pr-2 bg-slate-50 border-2 border-slate-200 rounded-lg text-[9px] font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-500 focus:ring-2 focus:ring-slate-400/30 transition-all shadow-inner"
                            placeholder="0" />
                        </div>
                        <p className="mbr-fm-hint text-[7px] text-slate-400 font-medium ml-1">Fixed yearly deduction amount</p>
                      </div>
                    </div>
                  </div>

                  {/* Interest Chart */}
                  <div className="mbr-fm-card bg-white border-2 border-slate-200 rounded-lg overflow-hidden shadow-sm flex flex-col h-[400px]">
                    <div className="mbr-chart-header bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 px-2 py-1 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-1.5">
                        <div className="bg-slate-100 p-1 rounded-lg text-slate-600"><Calculator size={9} /></div>
                        <div>
                          <h3 className="mbr-fm-section-title text-[8px] font-black text-slate-700 uppercase tracking-widest">Monthly Contribution Interest Chart</h3>
                          <p className="mbr-fm-hint text-[7px] text-slate-400 font-bold mt-0.5">Define yearly interest for each contribution slab</p>
                        </div>
                      </div>
                      <button onClick={addChartRow}
                        className="px-1.5 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[7px] font-black uppercase tracking-widest flex items-center gap-1 transition-all shadow-sm active:scale-95">
                        <Plus size={9} /> Add Slab
                      </button>
                    </div>

                    <div className="flex-1 overflow-auto p-0">
                      {businessRules.fundManagement.interestChart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                          <Database size={32} strokeWidth={1} className="mbr-chart-empty mb-2" />
                          <p className="mbr-chart-empty text-[8px] font-bold uppercase tracking-widest">No slabs configured</p>
                          <p className="mbr-chart-empty text-[7px] mt-0.5">Click "Add Slab" to start building the chart</p>
                        </div>
                      ) : (
                        <div className="w-full">
                          <div className="sticky top-0 mbr-chart-header bg-slate-50/90 backdrop-blur-sm border-b border-slate-100 grid grid-cols-12 px-2 py-1 z-10">
                            <div className="col-span-1 text-center mbr-chart-col-label text-[7px] font-black text-slate-400 uppercase tracking-widest">#</div>
                            <div className="col-span-5 pl-2 mbr-chart-col-label text-[7px] font-black text-slate-400 uppercase tracking-widest">Monthly Contribution (₹)</div>
                            <div className="col-span-5 pl-2 mbr-chart-col-label text-[7px] font-black text-slate-400 uppercase tracking-widest">Yearly Interest Credit (₹)</div>
                            <div className="col-span-1 mbr-chart-col-label text-[7px] font-black text-slate-400 uppercase tracking-widest text-center">Del</div>
                          </div>
                          <div className="divide-y divide-slate-50">
                            {businessRules.fundManagement.interestChart.map((row, idx) => (
                              <div key={idx}
                                className="mbr-chart-row grid grid-cols-12 px-2 py-1.5 items-center hover:bg-slate-50/50 transition-colors group">
                                <div className="col-span-1 text-center">
                                  <span className="mbr-chart-num bg-slate-100 text-slate-500 w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold mx-auto">
                                    {idx + 1}
                                  </span>
                                </div>
                                <div className="col-span-10 grid grid-cols-2 gap-4">
                                  <div className="relative flex items-center">
                                    <div className="absolute left-2 text-slate-300 pointer-events-none text-[8px]">₹</div>
                                    <input type="number" value={row.monthlyContribution}
                                      onChange={e => handleChartChange(idx, 'monthlyContribution', parseFloat(e.target.value) || 0)}
                                      className="mbr-chart-input w-full h-6 pl-5 pr-2 bg-white border-2 border-slate-200 rounded-lg text-[9px] font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/40 transition-all"
                                      placeholder="0" />
                                    <ArrowRight size={9} className="absolute -right-3 text-slate-300/50" />
                                  </div>
                                  <div className="relative flex items-center">
                                    <div className="absolute left-2 text-slate-300 pointer-events-none text-[7px]">Get</div>
                                    <input type="number" step="0.01" value={row.yearlyInterest}
                                      onChange={e => handleChartChange(idx, 'yearlyInterest', parseFloat(e.target.value) || 0)}
                                      className="mbr-chart-input w-full h-6 pl-7 pr-2 bg-white border-2 border-slate-200 rounded-lg text-[9px] font-bold text-slate-600 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/40 transition-all"
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
          </AnimatePresence>
        </div>

        {/* ── Footer ── */}
        <div className="mbr-footer px-2 py-1 bg-white border-t border-slate-100 flex items-center justify-between shrink-0 opacity-60">
          <div className="flex items-center gap-1">
            <Building2 size={9} className="text-slate-400" />
            <span className="mbr-footer-text text-[7px] font-bold text-slate-500 uppercase tracking-tight">Trust Nagpur - Policy Governance</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5 text-slate-600">
              <ShieldCheck size={9} />
              <span className="mbr-footer-text text-[7px] font-black uppercase">Standard Compliant</span>
            </div>
            <div className="w-px h-2 bg-slate-200" />
            <span className="mbr-footer-text text-[7px] font-bold text-slate-300 uppercase tracking-widest">RULESET_V3.1.2</span>
          </div>
        </div>

      </div>
    </ConfigProvider>
  );
};

export default ModifyBusinessRules;
