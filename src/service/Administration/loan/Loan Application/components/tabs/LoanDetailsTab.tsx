// LoanDetailsTab.tsx
import React from 'react';
import FormField from './FormField';
import { type LoanDetails } from '../../types';
import { getLoanTypeOptions } from '../../utils/utilsloanApplication';
import { handleEnterAsTab } from '../../utils/keyboardNav';
import type { EmployeeDetail } from '../../types/employee';
import { ShieldCheck, RefreshCw, User, Users, Wallet, MapPin, Search } from 'lucide-react';
import { Select } from 'antd';
import { useTranslation } from 'react-i18next';

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

  // Loan Against RD (ELN) only — the RD is the security, so these replace the
  // RD%/Share% fields above for that loan type.
  rdBacked?: boolean;
  totalRd?: number;
  lockedRd?: number;
  freeRd?: number;
  maxLoanAmount?: number;
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
  const { t } = useTranslation();
  const isRegularLoan = loanDetails.loanType?.toUpperCase() === 'RLN';
  const isLoanAgainstRd = loanDetails.loanType?.toUpperCase() === 'ELN';
  // The RD panel only when the server actually answered with RD figures for this member.
  const isRdPanel = isLoanAgainstRd && !!eligibilityStatus?.rdBacked;
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
        // Loan Against RD — user specifies amount
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

  const typeCode = (loanDetails.loanType || '').toUpperCase();
  const typeNoun = typeCode === 'ALN' ? t('Emergency') : t('Regular');
  const amountNum = parseFloat(loanDetails.loanAmount || '0') || 0;
  const amountPlaceholder =
    typeCode === 'ALN' ? t('Max ₹5,00,000')
      : typeCode === 'RLN' ? t('Default ₹10,00,000')
        : isLoanAgainstRd
          ? (isRdPanel ? t('Up to {{1}}', { 1: inr(eligibilityStatus!.maxLoanAmount) }) : t("Depends on the member's RD"))
          : undefined;

  const compactCss = `
    .app-window .la-compact { padding: 12px 16px; }
    .app-window .la-compact .aw-card-head { padding-bottom: 8px; margin-bottom: 10px; }
    .app-window .la-compact .aw-table th, .app-window .la-compact .aw-table td { padding-top: 6px; padding-bottom: 6px; }
    .app-window .la-member { display: flex; align-items: center; gap: 28px; flex-wrap: wrap; }
    .app-window .la-cell { margin: 0; min-width: 0; }
    .app-window .la-cell dt { margin: 0; color: var(--aw-muted); font-size: calc(var(--type-label-size) + 1px); font-weight: 500; }
    .app-window .la-cell dd { margin: 1px 0 0; color: var(--aw-text); font-size: var(--type-body-size); font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .app-window .la-grid { display: grid; grid-template-columns: minmax(340px, 400px) minmax(0, 1fr); gap: 12px; align-items: start; }
    .app-window .la-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 12px; }
    .app-window .la-span2 { grid-column: 1 / -1; }
    .app-window .la-elig td, .app-window .la-elig th { font-variant-numeric: tabular-nums; }
    .app-window .la-result { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; padding-top: 10px; margin-top: 4px; border-top: 1px solid var(--aw-border); }
    .app-window .la-three { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
    .app-window .la-hint { display: flex; align-items: center; gap: 8px; padding: 16px; border: 1px dashed var(--aw-border-strong); border-radius: calc(var(--aw-radius) * 1.8); color: var(--aw-muted); }
    @media (max-width: 900px) { .app-window .la-grid { grid-template-columns: minmax(0, 1fr); } .app-window .la-three { grid-template-columns: minmax(0, 1fr); } }
  `;

  const caseLabel = (c: any) =>
    `${c.loanCaseNo} · ${c.loanType} ${inr(c.loanAmount)} · ${c.sanctioned ? t('Sanctioned') : t('Awaiting sanction')}`;

  const cell = (label: string, value: React.ReactNode, color?: string, title?: string) => (
    <dl className="la-cell"><dt>{label}</dt><dd style={color ? { color } : undefined} title={title}>{value}</dd></dl>
  );

  return (
    <div className="aw-stack" style={{ minHeight: 0, gap: 12 }}>
      <style>{compactCss}</style>

      {/* ── Member strip: who it is, one line. Balances live in the eligibility card. ── */}
      <section className="aw-card la-compact aw-fade-in">
        {selectedMember ? (
          <>
            <div className="la-member">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <span className="aw-card-icon" style={{ width: 34, height: 34, borderRadius: '50%', fontWeight: 600 }}>
                  {(selectedMember.name || '?')[0]}
                </span>
                <div style={{ minWidth: 0 }}>
                  <p className="aw-strong" style={{ whiteSpace: 'nowrap' }}>{selectedMember.name}</p>
                  <p className="aw-meta">{selectedMember.memberNo}</p>
                </div>
                <span className={`aw-pill tone-${selectedMember.isRetired ? 'warning' : 'success'}`}>
                  {selectedMember.isRetired ? t('Retired') : t('Active')}
                </span>
              </div>
              {cell(t('Office'), selectedMember.officeName || selectedMember.officeNo || '—')}
              {cell(t('Basic pay'), selectedMember.basicPay ? inr(selectedMember.basicPay) : '—')}
              {cell(t('Retire date'), selectedMember.dateOfRetire || 'N/A')}
              {cell(t('Regular loan'), inr(selectedMember.regularLoanBal))}
              {cell(t('Emergency loan'), inr(selectedMember.emergencyLoanBal))}
            </div>
            {(selectedMember.presentAddress || selectedMember.permanentAddress) && (
              <p
                className="aw-meta"
                style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                title={selectedMember.presentAddress || selectedMember.permanentAddress}
              >
                <MapPin size={12} style={{ flex: 'none' }} /> {selectedMember.presentAddress || selectedMember.permanentAddress}
              </p>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--aw-muted)' }}>
            <User size={18} />
            <strong className="aw-strong">{t('No Member Selected')}</strong>
            <span className="aw-meta">{t('Click Member No. to search')}</span>
          </div>
        )}
      </section>

      <div className="la-grid">
        {/* ── Left: application form ── */}
        <section className="aw-card la-compact" onKeyDown={handleEnterAsTab}>
          <div className="aw-card-head">
            <span className="aw-card-icon"><Wallet size={14} /></span>
            <h2 className="aw-card-title">{t('Application')}</h2>
          </div>
          <div className="la-form-grid">
            <FormField
              label={t('Appl Date')}
              name="applDate"
              type="date"
              value={loanDetails.applDate}
              onChange={(value: string) => onLoanDetailsChange('applDate', value)}
              readOnly
              required
            />

            <FormField
              label={t('Member No.')}
              name="memberNo"
              type="text"
              value={loanDetails.memberNo}
              onChange={handleMemberNoChange}
              onKeyDown={handleMemberNoKeyDown}
              onClick={() => {
                onLookup?.('memberNo');
                handleMemberNoClick();
              }}
              placeholder={t('Search (Click or F2)')}
              required
            />

            <FormField
              label={t('Loan Type')}
              name="loanType"
              type="select"
              value={loanDetails.loanType}
              onChange={handleLoanTypeChange}
              options={getLoanTypeOptions()}
              required
            />

            {/* Loan Case No. — also the list of the member's open applications */}
            <div>
              <label className="aw-label" htmlFor="loanCaseNo">
                {t('Loan Case No.')}
                {selectedMember && memberLoanCases.length > 0 && (
                  <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500, marginLeft: 6 }}>
                    {t('{{1}} open', { 1: memberLoanCases.length })}
                  </span>
                )}
              </label>
              <Select
                id="loanCaseNo"
                className="aw-select"
                popupClassName="aw-select-popup"
                value={loanDetails.loanCaseNo || undefined}
                onChange={(v) => handleLoanCaseChange(v ?? '')}
                disabled={!selectedMember || isLoadingLoanCases}
                placeholder={isLoadingLoanCases ? t('Loading...') : caseHint}
                allowClear
                optionLabelProp="value"
                options={memberLoanCases.map((loanCase) => ({
                  value: loanCase.loanCaseNo,
                  label: caseLabel(loanCase),
                  title: loanCase.purpose || undefined,
                }))}
                popupMatchSelectWidth={false}
              />
            </div>

            <FormField
              label={t('Loan Amount')}
              name="loanAmount"
              type="text"
              value={loanDetails.loanAmount}
              {...(amountPlaceholder ? { placeholder: amountPlaceholder } : {})}
              onChange={(value: string) => {
                // ES-505: keep the decimal point (one dot, at most 2 decimals); the old rule deleted the dot, so a pasted
                // 100.50 became 10050 (100 times too much). Commas and spaces from a pasted amount are dropped.
                // a sign or an exponent (-500, 1e5) is refused instead of being turned into another amount
                if (/[-+eE]/.test(value)) return;
                let cleaned = value.replace(/[^0-9.]/g, '');
                const firstDot = cleaned.indexOf('.');
                if (firstDot !== -1) {
                  cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '').slice(0, 2);
                }
                onLoanDetailsChange('loanAmount', cleaned);
              }}
              required
            />

            <FormField
              label={t('Form Number')}
              name="formNumber"
              type="text"
              value={loanDetails.formNumber}
              onChange={(value: string) => onLoanDetailsChange('formNumber', value)}
              maxLength={10}
            />

            <div className="la-span2">
              <FormField
                label={t('Reason')}
                name="reason"
                type="textarea"
                value={loanDetails.reason}
                onChange={(value: string) => onLoanDetailsChange('reason', value)}
                required
                maxLength={50}
              />
            </div>
          </div>
        </section>

        {/* ── Right: eligibility ── */}
        <div className="aw-stack" style={{ minWidth: 0, gap: 12 }}>
          {/* Regular / Emergency. A shortfall is NOT a rejection — it is withheld from the
              disbursement. Only breaching the maximum limit blocks the loan. */}
          {!isLoanAgainstRd && (isCheckingEligibility || eligibilityStatus) && (
            <section className="aw-card la-compact aw-fade-in">
              <div className="aw-card-head">
                <span className="aw-card-icon"><ShieldCheck size={14} /></span>
                <h2 className="aw-card-title">{t('Eligibility')}</h2>
                <span style={{ marginLeft: 'auto' }}>
                  {isCheckingEligibility ? (
                    <span className="aw-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <RefreshCw size={11} className="aw-spin" /> {t('Checking...')}
                    </span>
                  ) : (
                    <span className={`aw-pill tone-${eligTone}`}>
                      {blocked ? t('Over limit') : hasShortfall ? t('Shortfall') : t('Eligible')}
                    </span>
                  )}
                </span>
              </div>
              {eligibilityStatus && (
                <div className="la-elig">
                  <p className="aw-meta" style={{ marginBottom: 8, color: eligibilityStatus.withinMaxLimit ? undefined : 'var(--aw-danger)' }}>
                    {t('Exposure')}: {typeNoun} {inr(eligibilityStatus.existingOutstanding)} + {t('new')} {inr(eligibilityStatus.loanAmount)} = <strong>{inr(eligibilityStatus.totalExposure)}</strong> {t('of')} {inr(eligibilityStatus.maxLimit)} {t('limit')}
                  </p>
                  <div className="aw-table-wrap" style={{ maxHeight: 'none' }}>
                    <table className="aw-table">
                      <thead>
                        <tr>
                          <th />
                          <th className="is-right">{t('Current')}</th>
                          <th className="is-right">{t('Required')}</th>
                          <th className="is-right">{t('Shortfall')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>{t('Share value')} <span className="aw-meta">{eligibilityStatus.sharePct}%</span></td>
                          <td className="is-right">{inr(eligibilityStatus.currentShare)}</td>
                          <td className="is-right">{inr(eligibilityStatus.requiredShare)}</td>
                          <td className="is-right" style={eligibilityStatus.shareShortfall > 0 ? { color: 'var(--aw-warning)', fontWeight: 600 } : { color: 'var(--aw-muted)' }}>{eligibilityStatus.shareShortfall > 0 ? inr(eligibilityStatus.shareShortfall) : '—'}</td>
                        </tr>
                        <tr>
                          <td>{t('RD balance')} <span className="aw-meta">{eligibilityStatus.rdPct}%</span></td>
                          <td className="is-right">{inr(eligibilityStatus.currentRd)}</td>
                          <td className="is-right">{inr(eligibilityStatus.requiredRd)}</td>
                          <td className="is-right" style={eligibilityStatus.rdShortfall > 0 ? { color: 'var(--aw-warning)', fontWeight: 600 } : { color: 'var(--aw-muted)' }}>{eligibilityStatus.rdShortfall > 0 ? inr(eligibilityStatus.rdShortfall) : '—'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {hasShortfall && eligibilityStatus.withinMaxLimit && (
                    <div className="la-result" title={t('Withheld towards RD/Share — not added to the loan.')}>
                      <span className="aw-meta">{t('Withheld from payout')} <strong style={{ color: 'var(--aw-warning)' }}>− {inr(eligibilityStatus.totalShortfall)}</strong></span>
                      <span className="aw-strong" style={{ color: 'var(--aw-success)' }}>{t('Net payable')} {inr(eligibilityStatus.netDisbursement)}</span>
                    </div>
                  )}
                  {blocked && eligibilityStatus.message && (
                    <div className="aw-alert aw-alert-danger" style={{ marginTop: 8, marginBottom: 0, padding: '6px 10px' }}>{eligibilityStatus.message}</div>
                  )}
                </div>
              )}
            </section>
          )}

          {!isLoanAgainstRd && !isCheckingEligibility && !eligibilityStatus && (
            <div className="la-hint aw-meta">
              <ShieldCheck size={16} />
              <span>{t('Choose a loan type and amount to check the member\'s share and RD requirement.')}</span>
            </div>
          )}

          {/* Loan Against RD (ELN) — the member's own RD is the security: what they have,
              what is already locked, and the largest loan allowed. The amount stays free
              to edit — the maximum is a ceiling, not a default. */}
          {isLoanAgainstRd && (isCheckingEligibility || eligibilityStatus) && (
            <section className="aw-card la-compact aw-fade-in">
              <div className="aw-card-head">
                <span className="aw-card-icon"><ShieldCheck size={14} /></span>
                <h2 className="aw-card-title">{t('Loan Against RD')}</h2>
                <span style={{ marginLeft: 'auto' }}>
                  {isCheckingEligibility && !isRdPanel ? (
                    <span className="aw-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <RefreshCw size={11} className="aw-spin" /> {t('Checking...')}
                    </span>
                  ) : isRdPanel ? (
                    <span className={`aw-pill tone-${eligibilityStatus!.isEligible ? 'success' : 'danger'}`}>
                      {(eligibilityStatus!.maxLoanAmount ?? 0) <= 0 ? t('No RD available') : eligibilityStatus!.isEligible ? t('Eligible') : t('Over limit')}
                    </span>
                  ) : null}
                </span>
              </div>
              {isRdPanel && (
                <div className="aw-stack" style={{ gap: 10 }}>
                  <div className="la-three">
                    {cell(t('Total RD'), inr(eligibilityStatus!.totalRd))}
                    {cell(t('Locked for other loans'), inr(eligibilityStatus!.lockedRd))}
                    {cell(t('Free RD'), inr(eligibilityStatus!.freeRd))}
                  </div>
                  <div className="la-result" style={{ borderTop: 'none', marginTop: 0, paddingTop: 0 }}>
                    <span className="aw-meta">
                      {t('Largest loan allowed ({{1}}% of free RD)', { 1: eligibilityStatus!.rdPct })}{' '}
                      <strong style={{ color: 'var(--aw-success)' }}>{inr(eligibilityStatus!.maxLoanAmount)}</strong>
                    </span>
                    {(eligibilityStatus!.maxLoanAmount ?? 0) > 0 && (
                      <button
                        type="button"
                        className="aw-btn aw-btn-ghost"
                        onClick={() => onLoanDetailsChange('loanAmount', String(eligibilityStatus!.maxLoanAmount))}
                      >
                        {t('Use maximum')}
                      </button>
                    )}
                  </div>
                  {amountNum > 0 && eligibilityStatus!.isEligible && (
                    <p className="aw-meta" title={t('Only the loan amount is locked, and the lock is released when the loan closes.')}>
                      {t('RD locked for this loan')} <strong>{inr(amountNum)}</strong> · {t('RD left free')} <strong>{inr(Math.max(0, (eligibilityStatus!.freeRd ?? 0) - amountNum))}</strong>
                    </p>
                  )}
                  {!eligibilityStatus!.isEligible && eligibilityStatus!.message && (
                    <div className="aw-alert aw-alert-danger" style={{ marginBottom: 0, padding: '6px 10px' }}>{eligibilityStatus!.message}</div>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      {/* ── Surety table — only for Regular Loan (RLN) ── */}
      {isRegularLoan && (
        <section className="aw-card la-compact aw-fade-in" style={{ flex: 'none' }}>
          <div className="aw-card-head">
            <span className="aw-card-icon"><Users size={14} /></span>
            <h2 className="aw-card-title">{t('Surety details')}</h2>
            <span className="aw-meta">{t('(max 2 sureties)')}</span>
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
                            placeholder={t('Click...')}
                            aria-label={t('Surety {{1}} member number', { 1: idx + 1 })}
                            className="aw-input"
                            style={{ cursor: 'pointer' }}
                            onClick={() => onSuretyLookup?.(idx)}
                          />
                          <button
                            type="button"
                            onClick={() => onSuretyLookup?.(idx)}
                            className="aw-input-action"
                            aria-label={t('Search surety {{1}}', { 1: idx + 1 })}
                            data-tip={t('Search member')}
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
