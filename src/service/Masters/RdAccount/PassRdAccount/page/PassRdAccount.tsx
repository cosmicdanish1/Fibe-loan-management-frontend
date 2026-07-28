// page/PassRdAccount.tsx

import React, { useState } from 'react';
import { ConfigProvider, Input, Select, DatePicker, message } from 'antd';
import {
  Lock, RotateCcw, X, ShieldCheck, Building2,
  Hash, Search, IndianRupee, Calendar, Info
} from 'lucide-react';
import dayjs from 'dayjs';
import { usePassRdAccount } from '../hooks/usePassRdAccount';
import MemberLookup from '../../../../../components/shared/MemberLookup/MemberLookup';
import { getApiBaseUrl } from '../../../../../services/apiVersionConfig';
import { Modal } from 'antd';

const { Option } = Select;
const { TextArea } = Input;

const PassRdAccount: React.FC = () => {
  const { formData, updateField, fetchAccount, save, handleClear } = usePassRdAccount();
  const [showMemberLookup, setShowMemberLookup] = useState(false);
  const [memberAccounts, setMemberAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [memberName, setMemberName] = useState('');

  const handleExit = () => {
    if (window.electron?.ipcRenderer) window.electron.ipcRenderer.send('window-close');
  };

  // Shared account loader — used by both the lookup modal and manual member-no entry.
  const loadMemberAccounts = async (memberNo: string, notifyEmpty = true) => {
    if (!memberNo) return;
    setLoadingAccounts(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${await getApiBaseUrl()}/admin/rd-accounts?memberNo=${memberNo}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const result = await res.json();
        const data = result.data || [];
        const accounts = Array.isArray(data) ? data : (data.data || []);
        setMemberAccounts(accounts);
        if (accounts.length === 0 && notifyEmpty) message.info('No RD accounts found for this member');
      }
    } catch {
      setMemberAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleMemberSelect = async (member: any) => {
    const memberNo = String(member.memberNo || member.mbno || member.memberNumber || '');
    updateField('memberNo', memberNo);
    updateField('accountNo', '');
    setMemberName(member.memberName || member.name || '');
    setShowMemberLookup(false);
    await loadMemberAccounts(memberNo);
  };

  // Load accounts when a member number is typed/pasted directly (no lookup modal).
  const handleMemberNoBlur = () => {
    if (formData.memberNo && memberAccounts.length === 0) loadMemberAccounts(formData.memberNo);
  };

  const handleAccountSelect = (accountNo: string) => {
    updateField('accountNo', accountNo);
    fetchAccount(accountNo);
  };

  const onClear = () => {
    handleClear();
    setMemberAccounts([]);
    setMemberName('');
  };

  // Keep money/number fields numeric.
  const numeric = (v: string) => {
    const cleaned = v.replace(/[^0-9.]/g, '');
    const i = cleaned.indexOf('.');
    return i === -1 ? cleaned : cleaned.slice(0, i + 1) + cleaned.slice(i + 1).replace(/\./g, '');
  };
  const intOnly = (v: string) => v.replace(/[^0-9]/g, '');

  const labelCls = "block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-0.5";
  const inputCls = "h-7 text-[11px] font-semibold bg-white border-slate-300 rounded";

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#6366f1', borderRadius: 6 } }}>
      <div className="pass-rd-form h-screen flex flex-col bg-[#f5f6fa] font-sans overflow-hidden text-slate-900">

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-3 py-2 flex items-center justify-between shrink-0 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg border border-indigo-400/50 bg-indigo-600">
              <Lock size={13} className="text-white" />
            </div>
            <div>
              <h1 className="text-[11px] font-black text-white tracking-wider uppercase leading-none">Pass RD Account</h1>
              <p className="text-[7px] font-bold text-indigo-300 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                <ShieldCheck size={7} className="text-indigo-400" /> Edit & Update RD Record
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={onClear} className="h-7 px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[9px] font-black transition-all flex items-center gap-1.5 border border-white/20 uppercase tracking-wide">
              <RotateCcw size={11} /> Purge
            </button>
            <button onClick={save} className="h-7 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[9px] font-black transition-all flex items-center gap-1.5 border border-indigo-400 shadow-lg uppercase tracking-wide">
              <ShieldCheck size={11} /> Save
            </button>
            <div className="h-4 w-px bg-white/20" />
            <button onClick={handleExit} className="h-7 px-3 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg text-[9px] font-black transition-all flex items-center gap-1.5 border border-rose-500/30 uppercase tracking-wide">
              <X size={11} /> Exit
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-3 pb-4 space-y-2">

            {/* ── Member + Account selection ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
                <Hash size={11} className="text-slate-400" />
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Member & Account</span>
                {memberName && (
                  <span className="ml-auto text-[9px] font-black text-indigo-600">{memberName}</span>
                )}
              </div>
              <div className="p-3 grid grid-cols-2 gap-3">
                {/* Member No */}
                <div>
                  <label className={labelCls}>Member No.</label>
                  <div className="flex gap-1">
                    <div className="relative flex-1">
                      <Hash size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={formData.memberNo}
                        onChange={e => { updateField('memberNo', intOnly(e.target.value)); setMemberAccounts([]); }}
                        onBlur={handleMemberNoBlur}
                        onPressEnter={handleMemberNoBlur}
                        inputMode="numeric"
                        placeholder="Member number..."
                        className={`${inputCls} pl-6`}
                      />
                    </div>
                    <button
                      onClick={() => setShowMemberLookup(true)}
                      className="h-7 w-7 bg-slate-100 hover:bg-indigo-600 hover:text-white rounded text-slate-500 flex items-center justify-center transition-colors shrink-0"
                    >
                      <Search size={12} />
                    </button>
                  </div>
                </div>

                {/* Account No dropdown */}
                <div>
                  <label className={labelCls}>
                    Account No. {loadingAccounts && <span className="text-indigo-500 normal-case font-bold">Loading…</span>}
                  </label>
                  <Select
                    value={formData.accountNo || undefined}
                    onChange={handleAccountSelect}
                    className="w-full"
                    style={{ height: 28 }}
                    placeholder={formData.memberNo ? (loadingAccounts ? 'Loading…' : 'Select RD account…') : 'Select member first…'}
                    disabled={!formData.memberNo || loadingAccounts}
                    showSearch
                    filterOption={(input, option) =>
                      String(option?.value || '').toLowerCase().includes(input.toLowerCase())
                    }
                    notFoundContent={
                      <span className="text-[9px] text-slate-400">
                        {formData.memberNo ? 'No RD accounts found' : 'Select member first'}
                      </span>
                    }
                  >
                    {memberAccounts.map((acc: any) => (
                      <Option key={acc.account_number || acc.accountNumber} value={String(acc.account_number || acc.accountNumber)}>
                        <span className="text-[10px] font-bold">
                          {acc.account_number || acc.accountNumber} — ₹{Number(acc.fdamount || acc.amount || 0).toLocaleString('en-IN')}
                        </span>
                      </Option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>

            {/* ── RD Details ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">RD Details</span>
                {formData.accountNo && (
                  <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    A/c #{formData.accountNo}
                  </span>
                )}
              </div>
              <div className="p-3 grid grid-cols-4 gap-x-4 gap-y-2">
                <div>
                  <label className={labelCls}>Deposit Date</label>
                  <DatePicker
                    value={formData.depositDate ? dayjs(formData.depositDate) : null}
                    onChange={d => updateField('depositDate', d ? d.format('YYYY-MM-DD') : '')}
                    format="DD-MMM-YY"
                    className="w-full h-7 text-[11px]"
                  />
                </div>
                <div>
                  <label className={labelCls}>Deposit Unit</label>
                  <Select
                    value={formData.depositUnit}
                    onChange={val => updateField('depositUnit', val)}
                    className="w-full"
                    style={{ height: 28 }}
                  >
                    <Option value="Months">Months</Option>
                    <Option value="Years">Years</Option>
                  </Select>
                </div>
                <div>
                  <label className={labelCls}>Deposit Period</label>
                  <Input
                    value={formData.depositPeriod}
                    onChange={e => updateField('depositPeriod', intOnly(e.target.value))}
                    inputMode="numeric"
                    placeholder="e.g. 12"
                    className={`${inputCls} text-center`}
                  />
                </div>
                <div>
                  <label className={labelCls}>Interest Rate (%)</label>
                  <Input
                    value={formData.rate}
                    onChange={e => updateField('rate', numeric(e.target.value))}
                    inputMode="decimal"
                    placeholder="0.00"
                    className={`${inputCls} text-right font-bold text-indigo-700`}
                  />
                </div>
                <div>
                  <label className={labelCls}>Amount (Monthly)</label>
                  <div className="relative">
                    <IndianRupee size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={formData.amount}
                      onChange={e => updateField('amount', numeric(e.target.value))}
                      inputMode="decimal"
                      placeholder="0.00"
                      className={`${inputCls} pl-6 text-right`}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Maturity Amount</label>
                  <div className="relative">
                    <IndianRupee size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={formData.maturityAmount}
                      onChange={e => updateField('maturityAmount', numeric(e.target.value))}
                      inputMode="decimal"
                      placeholder="0.00"
                      className={`${inputCls} pl-6 text-right font-bold text-emerald-700`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Special Instructions ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
              <label className={labelCls + " flex items-center gap-1"}>
                <Info size={9} /> Special Instructions
              </label>
              <TextArea
                value={formData.specialInstructions}
                onChange={e => updateField('specialInstructions', e.target.value)}
                rows={3}
                placeholder="Additional notes or instructions…"
                className="text-[10px] font-medium bg-slate-50 border-slate-200 rounded resize-none mt-1"
              />
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-3 py-1.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            <Building2 size={9} className="text-slate-400" />
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-wide">Pass RD Registry</span>
            <div className="w-px h-2.5 bg-slate-300" />
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-wide">Authorized</span>
          </div>
          <div className="flex items-center gap-1 text-indigo-500">
            <Calendar size={9} />
            <span className="text-[8px] font-black uppercase tracking-wide">{dayjs().format('DD-MMM-YY')}</span>
          </div>
        </div>

        {/* Member Lookup Modal */}
        <Modal
          open={showMemberLookup}
          onCancel={() => setShowMemberLookup(false)}
          footer={null}
          width={900}
          centered
          styles={{ body: { padding: 0 } }}
          destroyOnClose
        >
          <MemberLookup
            isModal={true}
            onSelect={handleMemberSelect}
            onClose={() => setShowMemberLookup(false)}
          />
        </Modal>

        <style>{`
          .ant-select-selector { font-size: 11px !important; }
          .ant-picker-input > input { font-size: 11px !important; font-weight: 600 !important; }
          .ant-input::placeholder { font-size: 9px !important; color: #94a3b8 !important; }

          /* ── Dark mode: arbitrary bg hex + emerald A/c badge the global layer misses ── */
          html.dark .pass-rd-form { background-color: #0f172a !important; }
          html.dark .pass-rd-form .bg-emerald-50 { background-color: #064e3b !important; }
          html.dark .pass-rd-form .text-emerald-600,
          html.dark .pass-rd-form .text-emerald-700 { color: #6ee7b7 !important; }
        `}</style>
      </div>
    </ConfigProvider>
  );
};

export default PassRdAccount;
