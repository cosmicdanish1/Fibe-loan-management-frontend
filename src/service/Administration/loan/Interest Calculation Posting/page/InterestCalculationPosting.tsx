import React from 'react';
import {
  Calculator, FileText, Send, Loader2, Search,
  RotateCcw, ChevronDown, IndianRupee, TrendingUp,
  ArrowUpRight, ArrowDownLeft, Database, User, X
} from 'lucide-react';
import { DatePicker } from 'antd';
import MemberLookup from '@/components/shared/MemberLookup/MemberLookup';
import DataTable from '../components/DataTable';
import dayjs from 'dayjs';
import { useInterestCalculation } from '../hooks/useInterestCalculation';
import { interestCalculationOptions, accountTypeOptions } from '../constants/options';

const InterestCalculationPosting: React.FC = () => {
  const {
    formData,
    memberRecords,
    isLoading,
    handleInputChange,
    handleMemberLookup,
    handlePrintList,
    handlePost,
    resetForm,
    isLookupOpen,
    setIsLookupOpen,
    handleMemberSelect,
  } = useInterestCalculation();

  const isYearly = formData.calcInterestFor === 'yearly_fund_process';
  const isSpecific = formData.calcInterestFor === 'specific_member';

  return (
    <div className="int-calc h-screen flex flex-col bg-slate-50 font-sans selection:bg-indigo-100 overflow-hidden">
      <style>{`
        html.dark .int-calc { background: #0f0f0f; }
        html.dark .int-calc .int-hdr { background: #141414 !important; border-color: #2a2a2a !important; }
        html.dark .int-calc .int-hdr-title { color: #f1f5f9 !important; }
        html.dark .int-calc .int-hdr-sub { color: #64748b !important; }
        html.dark .int-calc .int-version-badge { background: #1e1b4b !important; color: #a5b4fc !important; border-color: #3730a3 !important; }
        html.dark .int-calc .int-reset-btn { color: #94a3b8 !important; border-color: #2a2a2a !important; }
        html.dark .int-calc .int-reset-btn:hover { background: #1e1e1e !important; color: #cbd5e1 !important; }
        html.dark .int-calc .int-close-btn { color: #94a3b8 !important; border-color: #2a2a2a !important; }
        html.dark .int-calc .int-close-btn:hover { background: #2d1515 !important; color: #f87171 !important; border-color: #7f1d1d !important; }

        html.dark .int-calc .int-scope-card { background: linear-gradient(to right,#1a1f2e,#161b30) !important; border-color: #3730a3 !important; }
        html.dark .int-calc .int-scope-card label { color: #a5b4fc !important; }
        html.dark .int-calc .int-scope-card select,
        html.dark .int-calc .int-scope-card input[type="number"],
        html.dark .int-calc .int-scope-card input[type="text"] { background: #1f1f1f !important; border-color: #3730a3 !important; color: #e2e8f0 !important; }
        html.dark .int-calc .int-rate-badge { background: #1e1b4b !important; border-color: #3730a3 !important; color: #a5b4fc !important; }
        html.dark .int-calc .int-all-badge { background: #022c22 !important; border-color: #14532d !important; color: #6ee7b7 !important; }
        html.dark .int-calc .int-member-chip { background: #1e1b4b !important; border-color: #3730a3 !important; color: #a5b4fc !important; }
        html.dark .int-calc .int-yearly-tip { color: #a5b4fc !important; }
        html.dark .int-calc .ant-picker { background: #1f1f1f !important; border-color: #3730a3 !important; }
        html.dark .int-calc .ant-picker input { color: #e2e8f0 !important; background: transparent !important; }
        html.dark .int-calc .ant-picker .ant-picker-suffix { color: #6366f1 !important; }
        html.dark .int-calc .ant-picker-focused,
        html.dark .int-calc .ant-picker:hover { border-color: #6366f1 !important; }

        html.dark .int-calc .int-actions-card { background: linear-gradient(to right,#0d1f1a,#0d1c1e) !important; border-color: #065f46 !important; }
        html.dark .int-calc .int-gl-info { background: #141414 !important; border-color: #065f46 !important; }
        html.dark .int-calc .int-gl-label { color: #94a3b8 !important; }
        html.dark .int-calc .int-gl-value { color: #6ee7b7 !important; }
        html.dark .int-calc .int-preview-btn { background: #141414 !important; border-color: #059669 !important; color: #6ee7b7 !important; }
        html.dark .int-calc .int-preview-btn:hover:not(:disabled) { background: #059669 !important; color: #fff !important; }
        html.dark .int-calc .int-preview-tip { color: #6ee7b7 !important; opacity: 0.7; }

        html.dark .int-calc .int-table-area { background: #141414 !important; border-color: #2a2a2a !important; }
        html.dark .int-calc .int-table-hdr { background: #1a1a1a !important; border-color: #2a2a2a !important; }
        html.dark .int-calc .int-table-hdr h2 { color: #e2e8f0 !important; }
        html.dark .int-calc .int-db-icon-bg { background: #252525 !important; color: #94a3b8 !important; }
        html.dark .int-calc .int-records-badge { background: #1e1b4b !important; color: #a5b4fc !important; border-color: #3730a3 !important; }
        html.dark .int-calc .int-loading-indicator { color: #818cf8 !important; }
        html.dark .int-calc .int-stat-box { background: #1a1a1a !important; border-color: #2a2a2a !important; }
        html.dark .int-calc .int-stat-label { color: #64748b !important; }
        html.dark .int-calc .int-principal-val { color: #e2e8f0 !important; }
        html.dark .int-calc .int-empty-icon { background: #1f1f1f !important; color: #4b5563 !important; }
        html.dark .int-calc .int-empty-txt { color: #4b5563 !important; }

        html.dark .int-calc .int-lookup-overlay { background: rgba(0,0,0,0.75) !important; }
        html.dark .int-calc .int-lookup-modal { background: #1f1f1f !important; border-color: #2a2a2a !important; }

        html.dark .int-data-table { border-color: #2a2a2a !important; }
        html.dark .int-data-table .int-thead-row { background: #1a1a1a !important; border-color: #2a2a2a !important; }
        html.dark .int-data-table .int-th { color: #64748b !important; border-color: #2a2a2a !important; }
        html.dark .int-data-table .int-row { border-color: #222 !important; }
        html.dark .int-data-table .int-row.even-row { background: #141414 !important; }
        html.dark .int-data-table .int-row.odd-row { background: #1a1a1a !important; }
        html.dark .int-data-table .int-row:hover { background: rgba(79,70,229,0.12) !important; }
        html.dark .int-data-table td { border-color: #222 !important; }
        html.dark .int-data-table .td-sr { color: #64748b !important; }
        html.dark .int-data-table .td-mbno { color: #818cf8 !important; }
        html.dark .int-data-table .td-name { color: #cbd5e1 !important; }
        html.dark .int-data-table .td-obal { color: #94a3b8 !important; }
        html.dark .int-data-table .td-debit { color: #f87171 !important; }
        html.dark .int-data-table .td-credit { color: #34d399 !important; }
        html.dark .int-data-table .td-cbal { color: #e2e8f0 !important; }
        html.dark .int-data-table .td-avg { color: #94a3b8 !important; }
        html.dark .int-data-table .td-days { color: #94a3b8 !important; }
        html.dark .int-data-table .td-interest { color: #60a5fa !important; }
      `}</style>

      {/* Header */}
      <div className="int-hdr bg-white border-b border-slate-200 px-3 py-1.5 flex items-center justify-between z-10 shadow-md shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg text-white shadow-lg shadow-indigo-200">
            <Calculator size={14} />
          </div>
          <div>
            <h1 className="int-hdr-title fz-body font-black text-slate-800 tracking-tight leading-none uppercase flex items-center gap-2">
              Interest Calculation & Posting
              <span className="int-version-badge fz-caption bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-md font-black ring-1 ring-indigo-200">v3.0</span>
            </h1>
            <p className="int-hdr-sub fz-caption text-slate-400 font-bold uppercase tracking-widest leading-none mt-0.5">
              Daily Balance Method · Ledger Auto-Post
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetForm}
            className="int-reset-btn h-7 px-3 text-slate-600 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-lg fz-label font-black transition-all flex items-center gap-1.5 uppercase tracking-widest shadow-sm active:scale-95"
          >
            <RotateCcw size={12} /> Reset
          </button>
          <button
            onClick={handlePost}
            disabled={memberRecords.length === 0 || isLoading}
            className="h-7 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg fz-label font-black shadow-md shadow-indigo-200 transition-all flex items-center gap-1.5 uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 whitespace-nowrap"
          >
            {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            Post Transaction
          </button>
          <button
            onClick={() => {
              if (window.electronAPI?.ipcRenderer) {
                window.electronAPI.ipcRenderer.send('close-window');
              } else {
                window.close();
              }
            }}
            className="int-close-btn h-7 px-3 text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-lg fz-label font-black transition-all flex items-center gap-1.5 uppercase tracking-widest shadow-sm active:scale-95"
          >
            <X size={12} /> Close
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="shrink-0 p-2 grid grid-cols-12 gap-2">

        {/* Calculation Scope */}
        <div className="int-scope-card col-span-8 border border-indigo-300 rounded-xl p-2 bg-gradient-to-r from-indigo-50 to-blue-50 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-lg fz-caption font-black uppercase tracking-wider shadow-sm">
              Calculation Scope
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">

            {/* Interest Type */}
            <div className="space-y-1">
              <label className="fz-caption font-black text-indigo-900 uppercase tracking-tight block">Interest Type</label>
              <div className="relative">
                <select
                  value={formData.calcInterestFor}
                  onChange={(e) => handleInputChange('calcInterestFor', e.target.value)}
                  className="w-full h-7 bg-white border border-indigo-200 rounded-lg px-2.5 fz-label font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 transition-all appearance-none cursor-pointer shadow-sm"
                >
                  {interestCalculationOptions.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                  ))}
                </select>
                <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-400" />
              </div>
            </div>

            {/* Account Type (SB / RD / FD) */}
            <div className="space-y-1">
              <label className="fz-caption font-black text-indigo-900 uppercase tracking-tight block">Account Type</label>
              <div className="relative">
                <select
                  value={formData.accountType}
                  onChange={(e) => handleInputChange('accountType', e.target.value)}
                  className="w-full h-7 bg-white border border-indigo-200 rounded-lg px-2.5 fz-label font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 transition-all appearance-none cursor-pointer shadow-sm"
                >
                  {accountTypeOptions.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                  ))}
                </select>
                <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-400" />
              </div>
            </div>

            {/* Interest Rate — hidden for yearly fund */}
            {!isYearly ? (
              <div className="space-y-1">
                <label className="fz-caption font-black text-indigo-900 uppercase tracking-tight block">Annual Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="50"
                  value={formData.interestRate}
                  onChange={(e) => handleInputChange('interestRate', parseFloat(e.target.value))}
                  className="w-full h-7 bg-white border border-indigo-200 rounded-lg px-2.5 fz-label font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm"
                />
              </div>
            ) : (
              <div className="flex items-end pb-0.5">
                <div className="int-rate-badge flex items-center gap-1.5 bg-indigo-100 border border-indigo-200 rounded-lg px-2 py-1 w-full">
                  <TrendingUp size={11} className="text-indigo-600 shrink-0" />
                  <span className="fz-caption font-black text-indigo-800">Rate from Business Rules</span>
                </div>
              </div>
            )}

            {/* From Date */}
            <div className="space-y-1">
              <label className="fz-caption font-black text-indigo-900 uppercase tracking-tight block">
                {isYearly ? 'FY Start Date' : 'From Date'}
              </label>
              <DatePicker
                value={dayjs(formData.fromDate)}
                onChange={(date) => handleInputChange('fromDate', date ? date.format('YYYY-MM-DD') : '')}
                format="DD-MMM-YYYY"
                size="small"
                className="w-full h-7 border border-indigo-200 rounded-lg hover:border-indigo-400 shadow-sm"
              />
            </div>

            {/* To Date */}
            <div className="space-y-1">
              <label className="fz-caption font-black text-indigo-900 uppercase tracking-tight block">
                {isYearly ? 'FY End Date' : 'To Date'}
              </label>
              <DatePicker
                value={dayjs(formData.toDate)}
                onChange={(date) => handleInputChange('toDate', date ? date.format('YYYY-MM-DD') : '')}
                format="DD-MMM-YYYY"
                size="small"
                className="w-full h-7 border border-indigo-200 rounded-lg hover:border-indigo-400 shadow-sm"
              />
            </div>

            {/* Member No — only for specific_member */}
            {isSpecific ? (
              <div className="space-y-1">
                <label className="fz-caption font-black text-indigo-900 uppercase tracking-tight block">Member Number</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={formData.memberNo}
                    onChange={(e) => handleInputChange('memberNo', e.target.value)}
                    placeholder="Enter MBNO"
                    className="flex-1 h-7 bg-white border border-indigo-200 rounded-lg px-2.5 fz-label font-bold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm uppercase"
                  />
                  <button
                    onClick={handleMemberLookup}
                    className="h-7 px-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm active:scale-95"
                  >
                    <Search size={12} />
                  </button>
                </div>
                {formData.memberName && (
                  <div className="int-member-chip px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg fz-caption font-black flex items-center gap-1.5">
                    <User size={10} className="text-indigo-400 shrink-0" />
                    {formData.memberName}
                  </div>
                )}
              </div>
            ) : isYearly ? (
              <div className="flex items-start pt-4 col-span-1">
                <p className="int-yearly-tip fz-caption text-indigo-700 leading-snug">
                  Applies: Opening Balance Interest · Monthly Contribution · Dividend & Group Insurance Deduction
                </p>
              </div>
            ) : (
              <div className="flex items-end pb-0.5">
                <div className="int-all-badge flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1 w-full">
                  <span className="fz-caption font-black text-emerald-700">Processing all eligible members</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="int-actions-card col-span-4 border border-emerald-300 rounded-xl p-2 bg-gradient-to-r from-emerald-50 to-teal-50 shadow-md flex flex-col gap-2">
          <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-lg fz-caption font-black uppercase tracking-wider shadow-sm self-start">
            Actions
          </span>

          {/* GL Account info */}
          <div className="int-gl-info flex items-center gap-2 bg-white border border-emerald-200 rounded-lg px-2.5 py-1.5 shadow-sm">
            <Database size={11} className="text-emerald-600 shrink-0" />
            <div>
              <span className="int-gl-label fz-caption font-black text-slate-500 uppercase">GL Head: </span>
              <span className="int-gl-value fz-caption font-black text-emerald-700">
                {formData.accountType === 'SB' ? 'A1001 — Savings' :
                 formData.accountType === 'RD' ? 'A1002 — Recurring' : 'A1003 — Fixed Deposit'}
              </span>
            </div>
          </div>

          <button
            onClick={handlePrintList}
            disabled={isLoading}
            className="int-preview-btn flex-1 bg-white border border-emerald-500 text-emerald-700 font-black fz-label rounded-lg hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-1.5 shadow-sm uppercase tracking-widest active:scale-95 disabled:opacity-50 min-h-[28px]"
          >
            {isLoading ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
            Preview Interest List
          </button>
          <p className="int-preview-tip fz-caption text-emerald-600 text-center opacity-70 leading-tight">
            Preview records · then click Post Transaction
          </p>
        </div>
      </div>

      {/* Records Table */}
      <div className="int-table-area flex-1 overflow-hidden mx-2 mb-2 bg-white border border-slate-200 rounded-xl shadow-md flex flex-col">
        <div className="int-table-hdr bg-slate-50 border-b border-slate-200 px-3 py-1.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="int-db-icon-bg bg-slate-200 p-1 rounded-lg text-slate-600">
              <Database size={13} />
            </div>
            <h2 className="fz-label font-black text-slate-800 tracking-tight uppercase">Interest Preview Records</h2>
            {memberRecords.length > 0 && (
              <span className="int-records-badge bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full fz-caption font-black border border-indigo-200">
                {memberRecords.length} Records
              </span>
            )}
            {isLoading && (
              <div className="int-loading-indicator flex items-center gap-1.5 text-indigo-600 fz-caption font-black">
                <Loader2 size={12} className="animate-spin" /> Processing...
              </div>
            )}
          </div>

          {/* Inline summary stats */}
          {memberRecords.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="int-stat-box flex items-center gap-1.5 bg-white border border-indigo-100 rounded-lg px-2 py-1 shadow-sm">
                <IndianRupee size={10} className="text-indigo-500" />
                <span className="int-stat-label fz-caption font-black text-slate-500 uppercase">Principal</span>
                <span className="int-principal-val fz-caption font-black text-slate-800">
                  ₹{memberRecords.reduce((s, r) => s + r.balance, 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="int-stat-box flex items-center gap-1.5 bg-white border border-blue-100 rounded-lg px-2 py-1 shadow-sm">
                <TrendingUp size={10} className="text-blue-500" />
                <span className="int-stat-label fz-caption font-black text-slate-500 uppercase">Interest</span>
                <span className="fz-caption font-black text-blue-600">
                  ₹{memberRecords.reduce((s, r) => s + r.interest, 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="int-stat-box flex items-center gap-1.5 bg-white border border-red-100 rounded-lg px-2 py-1 shadow-sm">
                <ArrowUpRight size={10} className="text-red-500" />
                <span className="int-stat-label fz-caption font-black text-slate-500 uppercase">Debit</span>
                <span className="fz-caption font-black text-red-600">
                  ₹{memberRecords.reduce((s, r) => s + r.debit, 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="int-stat-box flex items-center gap-1.5 bg-white border border-emerald-100 rounded-lg px-2 py-1 shadow-sm">
                <ArrowDownLeft size={10} className="text-emerald-500" />
                <span className="int-stat-label fz-caption font-black text-slate-500 uppercase">Credit</span>
                <span className="fz-caption font-black text-emerald-600">
                  ₹{memberRecords.reduce((s, r) => s + r.credit, 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto p-2">
          <DataTable data={memberRecords} />
          {memberRecords.length === 0 && !isLoading && (
            <div className="int-empty-txt flex flex-col items-center justify-center h-full text-slate-400 py-8">
              <div className="int-empty-icon bg-slate-100 p-3 rounded-full mb-3">
                <Search size={24} strokeWidth={1.5} />
              </div>
              <p className="fz-label font-black uppercase tracking-widest">No records loaded</p>
              <p className="fz-caption mt-1">Set parameters and click Preview Interest List</p>
            </div>
          )}
        </div>
      </div>

      {/* Member Lookup Modal */}
      {isLookupOpen && (
        <div className="int-lookup-overlay fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="int-lookup-modal bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 relative">
            <button
              onClick={() => setIsLookupOpen(false)}
              className="absolute top-4 right-4 z-[110] p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors shadow-sm"
              title="Close"
            >
              <X size={16} className="text-slate-600" />
            </button>
            <MemberLookup
              isModal={true}
              onSelect={(member) => handleMemberSelect(member)}
              onClose={() => setIsLookupOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default InterestCalculationPosting;
