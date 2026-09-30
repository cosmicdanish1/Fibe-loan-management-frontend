// LoanDetailsTab.tsx
import React from 'react';
import FormField from './FormField';
import { type LoanDetails } from '../../types';
import { getLoanTypeOptions } from '../../utils/utilsloanApplication';
import { handleEnterAsTab } from '../../utils/keyboardNav';
import type { EmployeeDetail } from '../../types/employee';
import { ShieldCheck, RefreshCw, User, Users, Wallet, MapPin, Search, FileText } from 'lucide-react';
import { Select } from 'antd';

interface LoanEligibilityStatus {
  isEligible: boolean;
  loanAmount: number;

  // Rule 1 — max limit on total exposure
  existingOutstanding: number;
  totalExposure: number;
  maxLimit: number;
  withinMaxLimit: boolean;

  // Rule 2 — RD requirement
  rdPct: number;
  requiredRd: number;
  currentRd: number;
  rdShortfall: number;

  // Rule 3 — Share Value requirement
  sharePct: number;
  requiredShare: number;
  currentShare: number;
  shareShortfall: number;

  // Rule 4 — shortfall withheld from disbursement
  totalShortfall: number;
  netDisbursement: number;

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

  const inr = (n: number | string | undefined | null) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
  const blocked = !!eligibilityStatus && !eligibilityStatus.isEligible;
  const hasShortfall = !!eligibilityStatus && eligibilityStatus.totalShortfall > 0;
  const eligTone = blocked ? 'danger' : hasShortfall ? 'warning' : 'success';

  const caseHint = !selectedMember
    ? 'Select member first'
    : isLoadingLoanCases
      ? 'Loading loan cases...'
      : memberLoanCases.length > 0
        ? 'Select existing loan case'
        : 'Auto-generated on save';

  return (
    <div className="aw-stack" style={{ minHeight: 0 }}>
      <div className="aw-split aw-split-form" style={{ height: 'auto' }}>
        {/* ── Left: application form ── */}
        <div className="aw-side" style={{ overflow: 'visible' }} onKeyDown={handleEnterAsTab}>
          <section className="aw-card">
            <div className="aw-card-head">
              <span className="aw-card-icon"><Wallet size={14} /></span>
              <h2 className="aw-card-title">Application</h2>
            </div>
            <div className="aw-stack">
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
              <div>
                <label className="aw-label" htmlFor="loanCaseNo">
                  Loan Case No. <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>(optional — auto-generated)</span>
                </label>
                <Select
                  id="loanCaseNo"
                  className="aw-select"
                  popupClassName="aw-select-popup"
                  value={loanDetails.loanCaseNo || undefined}
                  onChange={(v) => handleLoanCaseChange(v ?? '')}
                  disabled={!selectedMember || isLoadingLoanCases}
                  placeholder={caseHint}
                  allowClear
                  options={memberLoanCases.map((loanCase) => ({
                    value: loanCase.loanCaseNo,
                    label: `${loanCase.loanCaseNo} — ${loanCase.loanType} (${inr(loanCase.loanAmount)})`,
                  }))}
                />
                {isLoadingLoanCases && (
                  <p className="aw-meta" style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <RefreshCw size={11} className="aw-spin" /> Loading...
                  </p>
                )}
                {selectedMember && !isLoadingLoanCases && memberLoanCases.length === 0 && (
                  <p className="aw-meta" style={{ marginTop: 4, color: 'var(--aw-success)' }}>✓ Auto-generated on save</p>
                )}
                {selectedMember && !isLoadingLoanCases && memberLoanCases.length > 0 && !loanDetails.loanCaseNo && (
                  <p className="aw-meta" style={{ marginTop: 4, color: 'var(--aw-warning)' }}>⚠ Select existing or auto-generate new</p>
                )}
              </div>

              {/* Loan Amount with formatting and helper text */}
              <div>
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
                {loanDetails.loanAmount && (
                  <div style={{ marginTop: 4 }}>
                    <p className="aw-strong" style={{ color: 'var(--aw-accent)' }}>
                      {inr(parseInt(loanDetails.loanAmount || '0'))}
                    </p>
                    {loanDetails.loanType && (
                      <p className="aw-meta">
                        {loanDetails.loanType.toUpperCase() === 'ALN' && 'Emergency Loan - Max: ₹5,00,000'}
                        {loanDetails.loanType.toUpperCase() === 'RLN' && 'Regular Loan - Default: ₹10,00,000'}
                        {loanDetails.loanType.toUpperCase() === 'ELN' && 'Loan Against Recovery - Manual entry'}
                      </p>
                    )}
                  </div>
                )}
              </div>

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
          </section>
        </div>

        {/* ── Right: member profile, eligibility, pending cases ── */}
        <div className="aw-stack" style={{ minWidth: 0 }}>
        <div className="aw-card aw-main" style={{ overflow: 'visible', padding: 0 }}>
          {selectedMember ? (
            <div className="aw-main-body aw-stack aw-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="aw-card-icon" style={{ width: 40, height: 40, borderRadius: '50%', fontSize: 'calc(var(--type-body-size) + 5px)', fontWeight: 700 }}>
                  {(selectedMember.name || '?')[0]}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p className="aw-strong" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedMember.name}</p>
                  <p className="aw-meta">{selectedMember.memberNo}</p>
                </div>
                <span className={`aw-pill tone-${selectedMember.isRetired ? 'warning' : 'success'}`}>
                  {selectedMember.isRetired ? 'Retired' : 'Active'}
                </span>
              </div>

              <dl className="aw-facts" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                <div><dt>Office</dt><dd>{selectedMember.officeName || selectedMember.officeNo || '—'}</dd></div>
                <div><dt>Basic Pay</dt><dd style={{ color: 'var(--aw-success)' }}>{selectedMember.basicPay ? inr(selectedMember.basicPay) : '—'}</dd></div>
                <div><dt>Retire Date</dt><dd>{selectedMember.dateOfRetire || 'N/A'}</dd></div>
              </dl>

              <div>
                <p className="aw-label">Financial Summary</p>
                <div className="aw-stats aw-stats-3">
                  <div className="aw-stat" style={{ ['--aw-tone' as any]: 'var(--aw-accent)' }}>
                    <div className="aw-stat-label">Shares</div>
                    <div className="aw-stat-value">{inr(selectedMember.shareBalance)}</div>
                  </div>
                  <div className="aw-stat" style={{ ['--aw-tone' as any]: 'var(--aw-warning)' }}>
                    <div className="aw-stat-label">Regular Loan</div>
                    <div className="aw-stat-value">{inr(selectedMember.regularLoanBal)}</div>
                  </div>
                  <div className="aw-stat" style={{ ['--aw-tone' as any]: 'var(--aw-danger)' }}>
                    <div className="aw-stat-label">Emergency Loan</div>
                    <div className="aw-stat-value">{inr(selectedMember.emergencyLoanBal)}</div>
                  </div>
                </div>
              </div>

              {(selectedMember.presentAddress || selectedMember.permanentAddress) && (
                <div className="aw-panel">
                  <p className="aw-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={12} /> Address</p>
                  <p className="aw-strong" style={{ fontWeight: 500 }}>{selectedMember.presentAddress || selectedMember.permanentAddress}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="aw-empty" style={{ margin: 'auto', padding: 40 }}>
              <User size={30} />
              <strong className="aw-strong">No Member Selected</strong>
              <span className="aw-meta">Click Member No. to search</span>
            </div>
          )}
        </div>

          {/* ── Regular Loan Eligibility Panel (RLN only) ──
              A shortfall is NOT a rejection — it is withheld from the
              disbursement. Only breaching the maximum limit blocks the loan. */}
          {(isCheckingEligibility || eligibilityStatus) && (
            <section className="aw-card aw-fade-in">
              <div className="aw-card-head">
                <span className="aw-card-icon"><ShieldCheck size={14} /></span>
                <h2 className="aw-card-title">Regular Loan Eligibility</h2>
                <span style={{ marginLeft: 'auto' }}>
                  {isCheckingEligibility ? (
                    <span className="aw-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <RefreshCw size={11} className="aw-spin" /> Checking...
                    </span>
                  ) : (
                    <span className={`aw-pill tone-${eligTone}`}>
                      {blocked ? 'Over Limit' : hasShortfall ? 'Shortfall' : 'Eligible'}
                    </span>
                  )}
                </span>
              </div>
              {eligibilityStatus && (
                <div className="aw-stack">
                  <div className="aw-panel">
                    <p className="aw-label">Total Exposure</p>
                    <div className="aw-rows">
                      <div className="aw-row"><span className="aw-row-label">Existing Regular</span><span className="aw-row-value">{inr(eligibilityStatus.existingOutstanding)}</span></div>
                      <div className="aw-row"><span className="aw-row-label">+ New Loan</span><span className="aw-row-value">{inr(eligibilityStatus.loanAmount)}</span></div>
                      <div className="aw-row aw-row-total">
                        <span className="aw-row-label">Total / Max</span>
                        <span className="aw-row-value" style={eligibilityStatus.withinMaxLimit ? undefined : { color: 'var(--aw-danger)' }}>
                          {inr(eligibilityStatus.totalExposure)} / {inr(eligibilityStatus.maxLimit)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="aw-panel">
                    <p className="aw-label">Share Value</p>
                    <div className="aw-rows">
                      <div className="aw-row"><span className="aw-row-label">Current</span><span className="aw-row-value">{inr(eligibilityStatus.currentShare)}</span></div>
                      <div className="aw-row"><span className="aw-row-label">Required ({eligibilityStatus.sharePct}%)</span><span className="aw-row-value">{inr(eligibilityStatus.requiredShare)}</span></div>
                      {eligibilityStatus.shareShortfall > 0 && (
                        <div className="aw-row"><span className="aw-row-label" style={{ color: 'var(--aw-warning)' }}>Shortfall</span><span className="aw-row-value" style={{ color: 'var(--aw-warning)' }}>{inr(eligibilityStatus.shareShortfall)}</span></div>
                      )}
                    </div>
                  </div>

                  <div className="aw-panel">
                    <p className="aw-label">RD Balance</p>
                    <div className="aw-rows">
                      <div className="aw-row"><span className="aw-row-label">Current</span><span className="aw-row-value">{inr(eligibilityStatus.currentRd)}</span></div>
                      <div className="aw-row"><span className="aw-row-label">Required ({eligibilityStatus.rdPct}%)</span><span className="aw-row-value">{inr(eligibilityStatus.requiredRd)}</span></div>
                      {eligibilityStatus.rdShortfall > 0 && (
                        <div className="aw-row"><span className="aw-row-label" style={{ color: 'var(--aw-warning)' }}>Shortfall</span><span className="aw-row-value" style={{ color: 'var(--aw-warning)' }}>{inr(eligibilityStatus.rdShortfall)}</span></div>
                      )}
                    </div>
                  </div>

                  {hasShortfall && eligibilityStatus.withinMaxLimit && (
                    <div className="aw-alert aw-alert-warning" style={{ marginBottom: 0, flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><span>Withheld</span><span>− {inr(eligibilityStatus.totalShortfall)}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', color: 'var(--aw-success)' }}><span>Net Payable</span><span>{inr(eligibilityStatus.netDisbursement)}</span></div>
                      <span className="aw-meta" style={{ fontWeight: 500 }}>Withheld towards RD/Share — not added to the loan.</span>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* ── Pending applications for this member (already fetched for the dropdown) ── */}
          {selectedMember && (
            <section className="aw-card aw-fade-in">
              <div className="aw-card-head">
                <span className="aw-card-icon"><FileText size={14} /></span>
                <h2 className="aw-card-title">Pending Applications</h2>
                <span className="aw-meta" style={{ marginLeft: 'auto' }}>{memberLoanCases.length} open</span>
              </div>
              {memberLoanCases.length === 0 ? (
                <p className="aw-meta">No open applications. A new case number is generated on save.</p>
              ) : (
                <div className="aw-table-wrap" style={{ maxHeight: 220 }}>
                  <table className="aw-table">
                    <thead>
                      <tr><th>Case No.</th><th>Type</th><th className="is-right">Amount</th><th>Purpose</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {memberLoanCases.map((c, i) => (
                        <tr
                          key={c.loanCaseNo ?? i}
                          className="is-clickable"
                          onClick={() => handleLoanCaseChange(c.loanCaseNo)}
                          aria-selected={loanDetails.loanCaseNo === c.loanCaseNo}
                        >
                          <td className={loanDetails.loanCaseNo === c.loanCaseNo ? 'is-accent' : ''}>{c.loanCaseNo}</td>
                          <td>{c.loanType}</td>
                          <td className="is-right">{inr(c.loanAmount)}</td>
                          <td className="is-muted">{c.purpose || '—'}</td>
                          <td><span className={`aw-pill tone-${c.sanctioned ? 'success' : 'warning'}`}>{c.sanctioned ? 'Sanctioned' : 'Awaiting sanction'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {memberLoanCases.length > 0 && <p className="aw-meta" style={{ marginTop: 6 }}>Click a row to load that case into the form.</p>}
            </section>
          )}
        </div>
      </div>

      {/* ── Surety table — only for Regular Loan (RLN) ── */}
      {isRegularLoan && (
        <section className="aw-card aw-fade-in" style={{ flex: 'none' }}>
          <div className="aw-card-head">
            <span className="aw-card-icon"><Users size={14} /></span>
            <h2 className="aw-card-title">Surety Details</h2>
            <span className="aw-meta">(max 2 sureties)</span>
          </div>
          <div className="aw-table-wrap" style={{ maxHeight: 'none' }}>
            <table className="aw-table">
              <thead>
                <tr>
                  {['Sr. No.', 'MB No.', 'Name', 'Net Salary', 'Date Of Retire', 'Office Name', 'Address'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[0, 1].map((idx) => {
                  const s: any = suretyDetails[idx] || {};
                  const dash = <span className="aw-meta">—</span>;
                  return (
                    <tr key={idx}>
                      <td className="is-muted is-center">{idx + 1}</td>
                      <td style={{ width: 160 }}>
                        <div className="aw-input-wrap has-action">
                          <input
                            type="text"
                            value={s.mbNo || ''}
                            readOnly
                            placeholder="Click..."
                            aria-label={`Surety ${idx + 1} member number`}
                            className="aw-input"
                            style={{ cursor: 'pointer' }}
                            onClick={() => onSuretyLookup?.(idx)}
                          />
                          <button
                            type="button"
                            onClick={() => onSuretyLookup?.(idx)}
                            className="aw-input-action"
                            aria-label={`Search surety ${idx + 1}`}
                            data-tip="Search member"
                            data-tip-pos="top-end"
                          >
                            <Search size={13} />
                          </button>
                        </div>
                      </td>
                      <td>{s.name || dash}</td>
                      <td>{s.netSalary ? `₹${s.netSalary}` : dash}</td>
                      <td>{s.dateOfRetire || dash}</td>
                      <td>{s.officeName || dash}</td>
                      <td>{s.address || dash}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

export default LoanDetailsTab;
