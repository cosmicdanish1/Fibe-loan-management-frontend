// LoanDetailsTab.tsx
import React from 'react';
import FormField from './FormField';
import { type LoanDetails } from '../../types';
import { getLoanTypeOptions } from '../../utils/utilsloanApplication';
import type { EmployeeDetail } from '../../types/employee';
import { ShieldCheck, RotateCcw } from 'lucide-react';

interface LoanEligibilityStatus {
  isEligible: boolean;
  loanAmount: number;
  requiredShare: number;
  currentShare: number;
  additionalShareRequired: number;
  requiredFd: number;
  currentFd: number;
  additionalFdRequired: number;
  message?: string;
}

interface LoanDetailsTabProps {
  loanDetails: LoanDetails;
  selectedMember?: any;
  memberLoanCases?: any[];
  isLoadingLoanCases?: boolean;
  onLoanDetailsChange: (field: keyof LoanDetails, value: string) => void;
  onLookup?: (field: 'memberNo' | 'surety1' | 'surety2') => void;
  suretyDetails?: EmployeeDetail[];
  onSuretyLookup?: (idx: number) => void;
  eligibilityStatus?: LoanEligibilityStatus | null;
  isCheckingEligibility?: boolean;
}

const LoanDetailsTab: React.FC<LoanDetailsTabProps> = ({
  loanDetails,
  selectedMember,
  memberLoanCases = [],
  isLoadingLoanCases = false,
  onLoanDetailsChange,
  onLookup,
  suretyDetails = [],
  onSuretyLookup,
  eligibilityStatus,
  isCheckingEligibility = false,
}) => {
  const isRegularLoan = loanDetails.loanType?.toUpperCase() === 'RLN';
  const [lastSpaceTime, setLastSpaceTime] = React.useState<number>(0);

  const handleMemberLookup = () => {
    // Open member lookup window
    console.log('Opening member lookup window...');
    if (window.electronAPI && window.electronAPI.openNewWindow) {
      window.electronAPI.openNewWindow('/common/member-lookup');
      console.log('Member lookup window opened');
    } else {
      console.error('window.electronAPI.openNewWindow is not available');
    }
  };

  const handleMemberNoClick = () => {
    handleMemberLookup();
  };

  const handleMemberNoKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const currentTime = Date.now();

    // Check for double space (two spaces within 500ms)
    if (e.key === ' ') {
      if (currentTime - lastSpaceTime < 500) {
        e.preventDefault();
        handleMemberLookup();
        setLastSpaceTime(0); // Reset
      } else {
        setLastSpaceTime(currentTime);
      }
    }
  };

  const handleMemberNoChange = (value: string) => {
    // Only allow numbers (no decimals, no letters)
    const numbersOnly = value.replace(/[^0-9]/g, '');
    onLoanDetailsChange('memberNo', numbersOnly);
  };

  // Handle loan case selection
  const handleLoanCaseChange = (value: string) => {
    onLoanDetailsChange('loanCaseNo', value);
  };

  // Handle loan type change with auto-population of loan amount
  const handleLoanTypeChange = (value: string) => {
    onLoanDetailsChange('loanType', value);

    // Auto-populate loan amount based on loan type
    let defaultAmount = '';
    let shouldAutoPopulate = false;

    switch (value.toUpperCase()) {
      case 'ALN':
        defaultAmount = '500000'; // 5 lakh max for Emergency Loan
        shouldAutoPopulate = true;
        break;
      case 'RLN':
        defaultAmount = '1000000'; // 10 lakh max for Regular Loan
        shouldAutoPopulate = true;
        break;
      case 'ELN':
        // Loan Against Recovery — user specifies amount
        shouldAutoPopulate = false;
        break;
      default:
        shouldAutoPopulate = false;
        break;
    }

    // Auto-populate the amount if we should and either no amount exists or user wants to use default
    if (shouldAutoPopulate && defaultAmount) {
      // Always set the default amount when loan type changes
      onLoanDetailsChange('loanAmount', defaultAmount);

      // Show a brief notification (optional - you can remove this if not needed)
      console.log(`Auto-populated loan amount: ₹${parseInt(defaultAmount).toLocaleString('en-IN')} for ${value} loan`);
    }
  };

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Top row: form + member info */}
      <div className="flex gap-2 flex-1 min-h-0">
      {/* Left Panel - Form Fields */}
      <div className="loan-left-panel w-80 bg-slate-50 p-3 rounded border border-slate-200 overflow-y-auto">
        <div className="space-y-2">
          <FormField
            label="Appl Date"
            name="applDate"
            type="date"
            value={loanDetails.applDate}
            onChange={(value: string) => onLoanDetailsChange('applDate', value)}
            required
          />

          <FormField
            label="Member No."
            name="memberNo"
            type="text"
            value={loanDetails.memberNo}
            onChange={handleMemberNoChange}
            onKeyDown={handleMemberNoKeyDown}
            onClick={() => {
              onLookup?.('memberNo');
              handleMemberNoClick();
            }}
            placeholder="Search MBNo (Click or F2)"
            required
          />

          <FormField
            label="Loan Type"
            name="loanType"
            type="select"
            value={loanDetails.loanType}
            onChange={handleLoanTypeChange}
            options={getLoanTypeOptions()}
            required
          />

          {/* Loan Case No. - Dropdown shows existing cases only */}
          <div className="space-y-1">
            <label className="block fz-label font-medium text-slate-700">
              Loan Case No. <span className="text-slate-400 font-normal">(optional — auto-generated)</span>
            </label>
            <select
              value={loanDetails.loanCaseNo}
              onChange={(e) => handleLoanCaseChange(e.target.value)}
              className={`w-full px-2 py-1.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 fz-body ${!selectedMember || isLoadingLoanCases
                ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                : loanDetails.loanCaseNo
                  ? 'bg-white text-slate-900'
                  : 'bg-white text-slate-600'
                }`}
              disabled={!selectedMember || isLoadingLoanCases}
            >
              <option value="" className="text-slate-600">
                {!selectedMember
                  ? "Select member first"
                  : isLoadingLoanCases
                    ? "Loading loan cases..."
                    : memberLoanCases.length > 0
                      ? "Select existing loan case"
                      : "Auto-generated on save"}
              </option>

              {/* Show existing loan cases if any */}
              {memberLoanCases.map((loanCase, index) => (
                <option key={index} value={loanCase.loanCaseNo} className="text-slate-900">
                  {loanCase.loanCaseNo} — {loanCase.loanType} (₹{Number(loanCase.loanAmount || 0).toLocaleString('en-IN')})
                </option>
              ))}
            </select>

            {/* Helper text - more compact */}
            {isLoadingLoanCases && (
              <p className="fz-caption text-blue-600 flex items-center gap-1">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading...
              </p>
            )}
            {selectedMember && !isLoadingLoanCases && memberLoanCases.length === 0 && (
              <p className="fz-caption text-green-600">
                ✓ Auto-generated on save
              </p>
            )}
            {selectedMember && !isLoadingLoanCases && memberLoanCases.length > 0 && !loanDetails.loanCaseNo && (
              <p className="fz-caption text-amber-600">
                ⚠ Select existing or auto-generate new
              </p>
            )}
          </div>

          {/* Loan Amount with formatting and helper text */}
          <div className="space-y-1">
            <FormField
              label="Loan Amount"
              name="loanAmount"
              type="text"
              value={loanDetails.loanAmount}
              onChange={(value: string) => {
                // Only allow numbers
                const numbersOnly = value.replace(/[^0-9]/g, '');
                onLoanDetailsChange('loanAmount', numbersOnly);
              }}
              required
            />
            {/* Show formatted amount and helper text - more compact */}
            {loanDetails.loanAmount && (
              <div className="fz-caption">
                <p className="text-blue-600 font-medium">
                  ₹{parseInt(loanDetails.loanAmount || '0').toLocaleString('en-IN')}
                </p>
                {loanDetails.loanType && (
                  <p className="text-slate-500 text-[10px]">
                    {loanDetails.loanType.toUpperCase() === 'ALN' &&
                      'Emergency Loan - Max: ₹5,00,000'}
                    {loanDetails.loanType.toUpperCase() === 'RLN' &&
                      'Regular Loan - Default: ₹10,00,000'}
                    {loanDetails.loanType.toUpperCase() === 'ELN' &&
                      'Loan Against Recovery - Manual entry'}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── 5% Eligibility Panel (Visible if loanAmount > 5L) ── */}
          {(isCheckingEligibility || eligibilityStatus) && (
            <div className={`rounded border shadow-sm ${eligibilityStatus && !eligibilityStatus.isEligible ? 'border-rose-200' : 'border-emerald-200'}`}>
              <div className={`px-2 py-1 border-b flex items-center justify-between ${eligibilityStatus && !eligibilityStatus.isEligible ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                <div className="flex items-center gap-1">
                  <ShieldCheck size={10} className={eligibilityStatus && !eligibilityStatus.isEligible ? 'text-rose-500' : 'text-emerald-500'} />
                  <span className={`text-[7px] font-black uppercase tracking-widest ${eligibilityStatus && !eligibilityStatus.isEligible ? 'text-rose-600' : 'text-emerald-600'}`}>
                    5% Eligibility
                  </span>
                </div>
                <div>
                  {isCheckingEligibility ? (
                    <span className="text-[8px] font-bold text-slate-500 flex items-center gap-1">
                      <RotateCcw size={8} className="animate-spin" /> Checking...
                    </span>
                  ) : eligibilityStatus?.isEligible ? (
                    <span className="px-1 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[7px] font-black uppercase tracking-widest border border-emerald-200">
                      Eligible
                    </span>
                  ) : (
                    <span className="px-1 py-0.5 rounded bg-rose-100 text-rose-700 text-[7px] font-black uppercase tracking-widest border border-rose-200">
                      Not Eligible
                    </span>
                  )}
                </div>
              </div>
              {eligibilityStatus && (
                <div className="p-2 space-y-1.5">
                  {/* Share */}
                  <div className="bg-slate-50 border border-slate-200 p-1.5 rounded">
                    <div className="text-[8px] font-bold text-slate-500 uppercase mb-0.5">Share</div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-600">Current:</span>
                      <span className="font-mono font-bold">₹{eligibilityStatus.currentShare.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-600">Required (5%):</span>
                      <span className="font-mono font-bold text-indigo-600">₹{eligibilityStatus.requiredShare.toLocaleString('en-IN')}</span>
                    </div>
                    {eligibilityStatus.additionalShareRequired > 0 && (
                      <div className="mt-0.5 pt-0.5 border-t border-rose-200 flex justify-between text-[10px]">
                        <span className="text-rose-600 font-bold">Shortfall:</span>
                        <span className="font-mono font-black text-rose-600">₹{eligibilityStatus.additionalShareRequired.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>
                  {/* FD */}
                  <div className="bg-slate-50 border border-slate-200 p-1.5 rounded">
                    <div className="text-[8px] font-bold text-slate-500 uppercase mb-0.5">FD Balance</div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-600">Current:</span>
                      <span className="font-mono font-bold">₹{eligibilityStatus.currentFd.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-600">Required (5%):</span>
                      <span className="font-mono font-bold text-indigo-600">₹{eligibilityStatus.requiredFd.toLocaleString('en-IN')}</span>
                    </div>
                    {eligibilityStatus.additionalFdRequired > 0 && (
                      <div className="mt-0.5 pt-0.5 border-t border-rose-200 flex justify-between text-[10px]">
                        <span className="text-rose-600 font-bold">Shortfall:</span>
                        <span className="font-mono font-black text-rose-600">₹{eligibilityStatus.additionalFdRequired.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <FormField
            label="Form Number"
            name="formNumber"
            type="text"
            value={loanDetails.formNumber}
            onChange={(value: string) => onLoanDetailsChange('formNumber', value)}
            maxLength={10}
          />

          <FormField
            label="Reason"
            name="reason"
            type="textarea"
            value={loanDetails.reason}
            onChange={(value: string) => onLoanDetailsChange('reason', value)}
            required
            maxLength={50}
          />


        </div>
      </div>

      {/* Right Panel - Member Information Display */}
      <div className="loan-right-panel flex-1 min-w-0 rounded-lg border border-slate-200 overflow-hidden">
        {selectedMember ? (
          <div className="h-full flex flex-col">
            {/* Profile Header */}
            <div className="loan-member-hdr bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                {(selectedMember.name || '?')[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white font-semibold text-sm truncate">{selectedMember.name}</p>
                <p className="text-blue-200 text-xs font-mono">{selectedMember.memberNo}</p>
              </div>
              <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${selectedMember.isRetired ? 'bg-amber-400/20 text-amber-200' : 'bg-emerald-400/20 text-emerald-200'}`}>
                {selectedMember.isRetired ? 'Retired' : 'Active'}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-3 bg-slate-50 overflow-y-auto space-y-3">
              {/* Employment Row */}
              <div className="grid grid-cols-3 gap-2">
                <div className="loan-member-card bg-white rounded-lg p-2 border border-slate-200">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Office</p>
                  <p className="text-xs font-semibold text-slate-800 mt-0.5">{selectedMember.officeName || selectedMember.officeNo || '—'}</p>
                </div>
                <div className="loan-member-card bg-white rounded-lg p-2 border border-slate-200">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Basic Pay</p>
                  <p className="text-xs font-semibold text-emerald-600 mt-0.5">{selectedMember.basicPay ? `₹${Number(selectedMember.basicPay).toLocaleString('en-IN')}` : '—'}</p>
                </div>
                <div className="loan-member-card bg-white rounded-lg p-2 border border-slate-200">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Retire Date</p>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5">{selectedMember.dateOfRetire || 'N/A'}</p>
                </div>
              </div>

              {/* Financial Summary */}
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">Financial Summary</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="loan-member-card bg-white rounded-lg p-2.5 border border-slate-200 text-center">
                    <p className="text-[10px] text-slate-400 font-medium uppercase">Shares</p>
                    <p className="text-sm font-bold text-blue-600 mt-1">{selectedMember.shareBalance ? `₹${Number(selectedMember.shareBalance).toLocaleString('en-IN')}` : '₹0'}</p>
                  </div>
                  <div className="loan-member-card bg-white rounded-lg p-2.5 border border-orange-200 text-center">
                    <p className="text-[10px] text-orange-400 font-medium uppercase">Regular Loan</p>
                    <p className="text-sm font-bold text-orange-600 mt-1">{selectedMember.regularLoanBal ? `₹${Number(selectedMember.regularLoanBal).toLocaleString('en-IN')}` : '₹0'}</p>
                  </div>
                  <div className="loan-member-card bg-white rounded-lg p-2.5 border border-red-200 text-center">
                    <p className="text-[10px] text-red-400 font-medium uppercase">Emergency Loan</p>
                    <p className="text-sm font-bold text-red-600 mt-1">{selectedMember.emergencyLoanBal ? `₹${Number(selectedMember.emergencyLoanBal).toLocaleString('en-IN')}` : '₹0'}</p>
                  </div>
                </div>
              </div>

              {/* Address */}
              {(selectedMember.presentAddress || selectedMember.permanentAddress) && (
                <div className="loan-member-card bg-white rounded-lg p-2.5 border border-slate-200">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Address</p>
                  <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">{selectedMember.presentAddress || selectedMember.permanentAddress}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50">
            <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center mb-3">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h4 className="text-slate-600 font-semibold fz-heading mb-1">No Member Selected</h4>
            <p className="text-slate-400 fz-label">Click Member No. to search</p>
          </div>
        )}
      </div>
      </div>{/* end top row */}

      {/* Surety Table — only for Regular Loan (RLN) */}
      {isRegularLoan && (
        <div className="border border-slate-300 rounded bg-white">
          <div className="surety-hdr flex items-center gap-2 px-3 py-1.5 bg-slate-100 border-b border-slate-300 rounded-t">
            <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="fz-label font-black text-slate-700 uppercase tracking-wide">Surety Details</span>
            <span className="fz-caption text-slate-400">(max 2 sureties)</span>
          </div>
          <table className="surety-table w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Sr. No.', 'MB No.', 'Name', 'Net Salary', 'Date Of Retire', 'Office Name', 'Address'].map(h => (
                  <th key={h} className="px-2 py-1.5 fz-label font-black text-slate-600 uppercase tracking-wide text-left whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[0, 1].map((idx) => {
                const s = suretyDetails[idx] || {};
                return (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-blue-50/30">
                    <td className="px-2 py-1 fz-body text-slate-500 font-medium w-10 text-center">{idx + 1}</td>
                    <td className="px-2 py-1 w-28">
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={s.mbNo || ''}
                          readOnly
                          placeholder="Click..."
                          className="w-16 h-6 px-1.5 border border-slate-200 rounded fz-body bg-white cursor-pointer focus:outline-none focus:border-indigo-400"
                          onClick={() => onSuretyLookup?.(idx)}
                        />
                        <button
                          type="button"
                          onClick={() => onSuretyLookup?.(idx)}
                          className="h-6 px-1.5 bg-slate-200 hover:bg-indigo-500 hover:text-white text-slate-600 rounded fz-label font-black transition-colors"
                          title="Search member"
                        >
                          ...
                        </button>
                      </div>
                    </td>
                    <td className="px-2 py-1 fz-body text-slate-800 font-medium min-w-32">{s.name || <span className="text-slate-300">—</span>}</td>
                    <td className="px-2 py-1 fz-body text-slate-700 w-24">{s.netSalary ? `₹${s.netSalary}` : <span className="text-slate-300">—</span>}</td>
                    <td className="px-2 py-1 fz-body text-slate-700 w-28">{s.dateOfRetire || <span className="text-slate-300">—</span>}</td>
                    <td className="px-2 py-1 fz-body text-slate-700 min-w-28">{s.officeName || <span className="text-slate-300">—</span>}</td>
                    <td className="px-2 py-1 fz-body text-slate-700">{s.address || <span className="text-slate-300">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LoanDetailsTab;
