import React from 'react';
import { Save, Search, Database, User, ShieldCheck, Info, Users, Calendar, IndianRupee, Loader2, RefreshCcw, X } from 'lucide-react';
import MemberLookup from '@/components/shared/MemberLookup/MemberLookup';
import { useChangeLoanSuretyForm } from '../hooks/useChangeLoanSuretyForm';

const ChangeLoanSuretyForm: React.FC = () => {
  const {
    formData,
    errors,
    loanCases,
    isSubmitting,
    isLoadingCases,
    isLookupOpen,
    setIsLookupOpen,
    handleInputChange,
    handleSubmit,
    resetForm,
    handleLookup,
    handleMemberSelect,
    fetchLoanDetails,
    fetchMemberLoans,
  } = useChangeLoanSuretyForm();

  return (
    <div className="surety-form h-screen flex flex-col bg-slate-50 font-sans selection:bg-indigo-100 overflow-hidden text-slate-900 border border-slate-200">

      {/* Header */}
      <div className="surety-hdr bg-white border-b border-slate-200 px-3 py-1.5 flex items-center justify-between z-10 shadow-md shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg text-white shadow-lg shadow-indigo-200">
            <Database size={14} />
          </div>
          <div>
            <h1 className="fz-body font-black text-slate-800 tracking-tight leading-none uppercase">Change Loan Surety</h1>
            <div className="flex items-center gap-1 mt-0.5 fz-caption font-bold text-slate-400 uppercase tracking-widest leading-none">
              <ShieldCheck size={8} className="text-indigo-500" /> Administrative Guarantor Update
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-1 shadow-sm">
            <Info size={9} className="text-indigo-500 shrink-0" />
            <p className="fz-caption text-indigo-700 font-bold uppercase whitespace-nowrap">
              Verified member required · Syncs to live ledger
            </p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`h-7 px-3 rounded-lg fz-label font-black shadow-md transition-all flex items-center gap-1.5 active:scale-95 uppercase tracking-widest whitespace-nowrap ${isSubmitting
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
              }`}
          >
            {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            {isSubmitting ? 'Processing...' : 'Commit Changes'}
          </button>
        </div>
      </div>

      {/* Workspace */}
      <div className="surety-workspace flex-1 overflow-hidden p-2 bg-slate-50/50">
        <div className="h-full grid grid-cols-12 gap-2 text-slate-900">

          {/* Left: Borrower & Loan Reference */}
          <div className="col-span-8 flex flex-col">
            <div className="surety-left-card bg-white border border-slate-200 rounded-xl overflow-hidden shadow-md flex-1 flex flex-col">
              <div className="surety-left-card-hdr bg-slate-50 border-b border-slate-200 px-3 py-1.5 flex items-center shadow-sm">
                <h3 className="fz-label font-black text-slate-700 tracking-widest uppercase flex items-center gap-2">
                  <User size={12} className="text-indigo-500" />
                  Borrower Identity & Case Reference
                </h3>
              </div>
              <div className="p-2 grid grid-cols-2 gap-2">

                {/* Loan Type */}
                <div className="space-y-1 col-span-2">
                  <label className="fz-caption font-black text-slate-400 uppercase tracking-tight ml-1">Loan Type</label>
                  <select
                    value={formData.loanType}
                    onChange={(e) => handleInputChange('loanType', e.target.value)}
                    className="w-full h-7 px-2.5 bg-slate-50 border border-slate-200 rounded-lg fz-label font-bold text-slate-700 outline-none focus:bg-white focus:border-indigo-400 shadow-sm transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Select Loan Type...</option>
                    <option value="RLN">RLN - Regular Loan</option>
                    <option value="ALN">ALN - Emergency Loan</option>
                    <option value="ELN">ELN - Loan Against Recovery</option>
                  </select>
                </div>

                {/* Member Reference */}
                <div className="space-y-1">
                  <label className="fz-caption font-black text-slate-400 uppercase tracking-tight ml-1">Member Reference</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={formData.memberNumber}
                      onChange={(e) => handleInputChange('memberNumber', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && formData.memberNumber) fetchMemberLoans(formData.memberNumber);
                      }}
                      className={`flex-1 h-7 pl-2.5 pr-2 bg-slate-50 border ${errors.memberNumber ? 'border-red-400' : 'border-slate-200'} rounded-lg fz-label font-bold text-slate-700 outline-none focus:bg-white focus:border-indigo-400 focus:shadow-sm shadow-sm transition-all uppercase`}
                      placeholder="Enter MBNO..."
                    />
                    <button
                      onClick={() => handleLookup('memberNumber')}
                      className="h-7 px-2.5 bg-slate-900 hover:bg-slate-700 text-white rounded-lg transition-all flex items-center justify-center shadow-md active:scale-95"
                    >
                      <Search size={12} />
                    </button>
                  </div>
                </div>

                {/* Legal Name */}
                <div className="space-y-1">
                  <label className="fz-caption font-black text-slate-400 uppercase tracking-tight ml-1">Legal Signature Name</label>
                  <input
                    type="text"
                    value={formData.memberName}
                    readOnly
                    className="w-full h-7 px-2.5 bg-slate-100 border border-slate-200 rounded-lg fz-label font-bold text-slate-500 outline-none cursor-not-allowed shadow-sm"
                    placeholder="Verified borrower name"
                  />
                </div>

                {/* Loan Case - full width */}
                <div className="space-y-1 col-span-2">
                  <label className="fz-caption font-black text-slate-400 uppercase tracking-tight ml-1">Loan Case Resolution</label>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 relative">
                      {isLoadingCases && (
                        <div className="absolute inset-0 z-10 bg-white/50 flex items-center justify-center rounded-lg">
                          <Loader2 size={12} className="animate-spin text-indigo-600" />
                        </div>
                      )}
                      {loanCases.length > 0 ? (
                        <select
                          className={`w-full h-7 px-2.5 bg-slate-50 border ${errors.loanCaseNo ? 'border-red-400' : 'border-slate-200'} rounded-lg fz-label font-bold text-slate-700 outline-none focus:bg-white focus:border-indigo-400 shadow-sm transition-all appearance-none cursor-pointer`}
                          value={formData.loanCaseNo || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleInputChange('loanCaseNo', val);
                            if (val) fetchLoanDetails(val);
                          }}
                        >
                          <option value="">Select Loan Case</option>
                          {loanCases
                            .filter(lc => !formData.loanType || (lc.loanType || lc.loantype || '').toUpperCase() === formData.loanType.toUpperCase())
                            .map(lc => (
                            <option key={lc.loanCaseNo || lc.loancaseno} value={lc.loanCaseNo || lc.loancaseno}>
                              #{lc.loanCaseNo || lc.loancaseno} - {lc.loanType || lc.loantype} | ₹{parseFloat(lc.loanAmount || lc.loan_amt || '0').toLocaleString()} [{lc.status || 'PENDING'}]
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={formData.loanCaseNo}
                          readOnly
                          className="w-full h-7 px-2.5 bg-slate-100 border border-slate-200 rounded-lg fz-label font-bold text-slate-400 cursor-not-allowed shadow-sm"
                          placeholder={isLoadingCases ? 'Loading cases...' : 'Choose member to load cases'}
                        />
                      )}
                    </div>
                    {formData.loanCaseNo && (
                      <div className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-black fz-caption shadow-sm flex items-center gap-1 whitespace-nowrap">
                        <ShieldCheck size={9} /> FOUND: {formData.loanCaseNo}
                      </div>
                    )}
                    {!formData.loanCaseNo && formData.memberNumber && (
                      <button
                        onClick={() => fetchMemberLoans(formData.memberNumber)}
                        className="h-7 px-2 bg-slate-50 hover:bg-white border border-slate-200 text-indigo-600 rounded-lg transition-all flex items-center justify-center shadow-sm active:scale-95"
                        title="Refresh Case List"
                      >
                        <RefreshCcw size={12} className={isLoadingCases ? 'animate-spin' : ''} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Sanction Date */}
                <div className="space-y-1">
                  <label className="fz-caption font-black text-slate-400 uppercase tracking-tight ml-1">Sanction Date</label>
                  <div className="relative">
                    <Calendar size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={formData.sanctionDate}
                      readOnly
                      className="w-full h-7 pl-7 pr-2.5 bg-slate-50 border border-slate-100 rounded-lg fz-label font-bold text-slate-600 outline-none cursor-not-allowed shadow-sm"
                      placeholder="YYYY-MM-DD"
                    />
                  </div>
                </div>

                {/* Sanction Amount */}
                <div className="space-y-1">
                  <label className="fz-caption font-black text-slate-400 uppercase tracking-tight ml-1">Sanction Amount</label>
                  <div className="relative">
                    <IndianRupee size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={formData.sanctionAmount ? `₹ ${parseFloat(formData.sanctionAmount).toLocaleString()}` : ''}
                      readOnly
                      className="w-full h-7 pl-7 pr-2.5 bg-slate-50 border border-slate-100 rounded-lg fz-label font-black text-emerald-600 outline-none cursor-not-allowed shadow-sm text-right"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Office */}
                <div className="space-y-1 col-span-2">
                  <label className="fz-caption font-black text-slate-400 uppercase tracking-tight ml-1">Office / Unit Mapping</label>
                  <input
                    type="text"
                    value={formData.office}
                    readOnly
                    className="w-full h-7 px-2.5 bg-slate-100 border border-slate-200 rounded-lg fz-label font-bold text-slate-500 outline-none cursor-not-allowed shadow-sm"
                    placeholder="Organizational unit..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Guarantor Protocol */}
          <div className="col-span-4 flex flex-col gap-2">
            <div className="surety-right-card bg-white border border-slate-200 rounded-xl overflow-hidden shadow-md flex-1 flex flex-col">
              <div className="bg-slate-900 px-3 py-1.5 flex items-center shrink-0 shadow-sm">
                <h3 className="fz-label font-black text-white tracking-widest uppercase flex items-center gap-2">
                  <Users size={12} className="text-indigo-400" />
                  Guarantor Protocol
                </h3>
              </div>
              <div className="p-2 space-y-2 flex-1">

                {/* Surety 1 */}
                <div className="surety-guarantor-card space-y-1.5 p-2 rounded-lg bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all">
                  <div className="flex items-center justify-between">
                    <label className="fz-caption font-black text-slate-500 uppercase tracking-widest">Guarantor 01 *</label>
                    <button
                      onClick={() => handleLookup('surety1')}
                      className="fz-caption font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-tight"
                    >
                      Lookup Registry
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formData.surety1}
                    onChange={(e) => handleInputChange('surety1', e.target.value)}
                    className={`w-full h-7 px-2.5 bg-white border ${errors.surety1 ? 'border-red-400' : 'border-slate-200'} rounded-lg fz-label font-mono font-black text-indigo-600 outline-none focus:border-indigo-400 focus:shadow-sm shadow-sm transition-all uppercase`}
                    placeholder="MBNO"
                  />
                  {formData.surety1Name && (
                    <div className="px-2 py-1 bg-indigo-50 rounded-lg border border-indigo-100 fz-caption font-black text-indigo-900 truncate shadow-sm">
                      {formData.surety1Name}
                    </div>
                  )}
                </div>

                {/* Surety 2 */}
                <div className="surety-guarantor-card space-y-1.5 p-2 rounded-lg bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all">
                  <div className="flex items-center justify-between">
                    <label className="fz-caption font-black text-slate-500 uppercase tracking-widest">Guarantor 02</label>
                    <button
                      onClick={() => handleLookup('surety2')}
                      className="fz-caption font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-tight"
                    >
                      Lookup Registry
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formData.surety2}
                    onChange={(e) => handleInputChange('surety2', e.target.value)}
                    className="w-full h-7 px-2.5 bg-white border border-slate-200 rounded-lg fz-label font-mono font-black text-indigo-600 outline-none focus:border-indigo-400 focus:shadow-sm shadow-sm transition-all uppercase"
                    placeholder="MBNO"
                  />
                  {formData.surety2Name && (
                    <div className="px-2 py-1 bg-indigo-50 rounded-lg border border-indigo-100 fz-caption font-black text-indigo-900 truncate shadow-sm">
                      {formData.surety2Name}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Reset Button */}
            <button
              onClick={resetForm}
              className="w-full h-7 px-4 bg-white border border-slate-200 text-slate-500 rounded-lg fz-label font-black uppercase tracking-widest hover:bg-slate-50 hover:shadow-md transition-all active:scale-95 shadow-sm shrink-0"
            >
              Reset Ledger
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="surety-footer px-3 py-1 bg-white border-t border-slate-200 flex items-center justify-between shadow-[0_-1px_4px_rgba(0,0,0,0.05)] shrink-0">
        <div className="flex items-center gap-1.5">
          <Database size={9} className="text-slate-400" />
          
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-indigo-500">
            <ShieldCheck size={9} />
            <span className="fz-caption font-black uppercase text-indigo-500">Standard Compliant</span>
          </div>
          <div className="w-px h-3 bg-slate-200" />
          <span className="fz-caption font-bold text-slate-300 uppercase tracking-widest">SURETY_UPDATE_V1.1</span>
        </div>
      </div>

      {/* Member Lookup Modal */}
      {isLookupOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="surety-lookup-modal bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 relative">
            <button
              onClick={() => setIsLookupOpen(false)}
              className="absolute top-4 right-4 z-[110] p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors shadow-sm"
              title="Close"
            >
              <X size={16} className="text-slate-600" />
            </button>
            <MemberLookup
              isModal={true}
              onSelect={(member) => {
                handleMemberSelect(member);
                setIsLookupOpen(false);
              }}
              onClose={() => setIsLookupOpen(false)}
            />
          </div>
        </div>
      )}

      <style>{`
        /* ── Change Loan Surety — dark mode ── */
        html.dark .surety-form { background-color: #0f172a !important; color: #e2e8f0 !important; border-color: #334155 !important; }
        html.dark .surety-hdr { background-color: #1e293b !important; border-color: #334155 !important; }
        html.dark .surety-hdr .bg-indigo-50 { background-color: rgba(99,102,241,0.15) !important; border-color: rgba(99,102,241,0.3) !important; }
        html.dark .surety-hdr .text-indigo-700 { color: #a5b4fc !important; }
        html.dark .surety-workspace { background-color: #0f172a !important; }
        html.dark .surety-left-card { background-color: #1e293b !important; border-color: #334155 !important; }
        html.dark .surety-left-card-hdr { background-color: #0f172a !important; border-color: #334155 !important; }
        html.dark .surety-form input:not([readonly]):not([class*="cursor-not-allowed"]) {
          background-color: #1e293b !important; color: #e2e8f0 !important; border-color: #475569 !important;
        }
        html.dark .surety-form input[readonly], html.dark .surety-form input.cursor-not-allowed {
          background-color: #0f172a !important; color: #64748b !important; border-color: #334155 !important;
        }
        html.dark .surety-form select { background-color: #1e293b !important; color: #e2e8f0 !important; border-color: #475569 !important; }
        html.dark .surety-form label { color: #64748b !important; }
        html.dark .surety-form .text-slate-700 { color: #cbd5e1 !important; }
        html.dark .surety-form .text-slate-500 { color: #64748b !important; }
        html.dark .surety-form .text-slate-400 { color: #475569 !important; }
        html.dark .surety-form .bg-slate-50 { background-color: #1e293b !important; }
        html.dark .surety-form .bg-slate-100 { background-color: #0f172a !important; }
        html.dark .surety-form .bg-white { background-color: #1e293b !important; }
        html.dark .surety-form .border-slate-200 { border-color: #334155 !important; }
        html.dark .surety-form .border-slate-100 { border-color: #1e293b !important; }
        html.dark .surety-right-card { background-color: #1e293b !important; border-color: #334155 !important; }
        html.dark .surety-guarantor-card { background-color: #0f172a !important; border-color: #334155 !important; }
        html.dark .surety-guarantor-card .bg-indigo-50 { background-color: rgba(99,102,241,0.15) !important; border-color: rgba(99,102,241,0.3) !important; }
        html.dark .surety-guarantor-card .text-indigo-900 { color: #a5b4fc !important; }
        html.dark .surety-guarantor-card .text-indigo-600 { color: #818cf8 !important; }
        html.dark .surety-footer { background-color: #1e293b !important; border-color: #334155 !important; }
        html.dark .surety-footer .text-slate-300 { color: #334155 !important; }
        html.dark .surety-lookup-modal { background-color: #1e293b !important; border-color: #334155 !important; }
        html.dark .surety-form .bg-emerald-50 { background-color: rgba(5,150,105,0.15) !important; border-color: rgba(5,150,105,0.3) !important; }
        html.dark .surety-form .text-emerald-700 { color: #34d399 !important; }
        html.dark .surety-form .border-emerald-200 { border-color: rgba(5,150,105,0.3) !important; }
        html.dark .surety-form .text-emerald-600 { color: #34d399 !important; }
        html.dark .surety-form .bg-slate-900 { background-color: #0a0f1e !important; }
      `}</style>
    </div>
  );
};

export default ChangeLoanSuretyForm;
