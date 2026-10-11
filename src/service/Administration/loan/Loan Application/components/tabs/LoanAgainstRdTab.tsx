// LoanAgainstRdTab.tsx
// Read-only summary of the RD that secures a Loan Against RD (loan type ELN).
// Nothing is entered here: the RD is looked up from the member's own account, and
// the lock is placed automatically when the loan is paid out and released when it
// closes. Replaces the old "Loan Against Deposit" table, which asked the clerk to
// type FD receipt details by hand.
import React from 'react';
import { Lock, RefreshCw, ShieldCheck } from 'lucide-react';

interface RdStatus {
  isEligible: boolean;
  rdBacked?: boolean;
  totalRd?: number;
  lockedRd?: number;
  freeRd?: number;
  maxLoanAmount?: number;
  rdPct?: number;
  message?: string;
}

interface LoanAgainstRdTabProps {
  loanType: string;
  memberNo: string;
  loanAmount: string;
  eligibilityStatus?: RdStatus | null;
  isCheckingEligibility?: boolean;
}

const inr = (n: number | string | undefined | null) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const LoanAgainstRdTab: React.FC<LoanAgainstRdTabProps> = ({
  loanType,
  memberNo,
  loanAmount,
  eligibilityStatus,
  isCheckingEligibility = false,
}) => {
  const isLoanAgainstRd = (loanType || '').toUpperCase() === 'ELN';
  const amount = parseInt(loanAmount || '0', 10) || 0;

  return (
    <div className="aw-stack">
      <div style={{ marginBottom: 4 }}>
        <h2 className="aw-card-title">Loan Against RD</h2>
        <p className="aw-desc">The member's own RD is the security. It is locked when the loan is paid out and released when the loan closes.</p>
      </div>

      {!isLoanAgainstRd ? (
        <div className="aw-empty" style={{ padding: 32 }}>
          <Lock size={28} />
          <strong className="aw-strong">Not a Loan Against RD</strong>
          <span className="aw-meta">Choose "LOAN AGAINST RD" as the Loan Type on the Loan Details tab to see the RD that secures it.</span>
        </div>
      ) : !memberNo ? (
        <div className="aw-empty" style={{ padding: 32 }}>
          <Lock size={28} />
          <strong className="aw-strong">No Member Selected</strong>
          <span className="aw-meta">Select a member on the Loan Details tab first.</span>
        </div>
      ) : isCheckingEligibility && !eligibilityStatus ? (
        <p className="aw-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={11} className="aw-spin" /> Reading the member's RD...
        </p>
      ) : !eligibilityStatus || !eligibilityStatus.rdBacked ? (
        <div className="aw-alert aw-alert-warning">The member's RD could not be read. Please try again.</div>
      ) : (
        <section className="aw-card aw-fade-in">
          <div className="aw-card-head">
            <span className="aw-card-icon"><ShieldCheck size={14} /></span>
            <h2 className="aw-card-title">RD Security</h2>
          </div>
          <div className="aw-stack">
            <div className="aw-panel">
              <p className="aw-label">Member's RD</p>
              <div className="aw-rows">
                <div className="aw-row"><span className="aw-row-label">Total RD</span><span className="aw-row-value">{inr(eligibilityStatus.totalRd)}</span></div>
                <div className="aw-row"><span className="aw-row-label">Already locked (other loans)</span><span className="aw-row-value">{inr(eligibilityStatus.lockedRd)}</span></div>
                <div className="aw-row aw-row-total"><span className="aw-row-label">Free RD</span><span className="aw-row-value">{inr(eligibilityStatus.freeRd)}</span></div>
              </div>
            </div>

            <div className="aw-panel">
              <p className="aw-label">This loan</p>
              <div className="aw-rows">
                <div className="aw-row"><span className="aw-row-label">Largest loan allowed</span><span className="aw-row-value">{inr(eligibilityStatus.maxLoanAmount)}</span></div>
                <div className="aw-row"><span className="aw-row-label">Loan amount entered</span><span className="aw-row-value">{amount > 0 ? inr(amount) : '—'}</span></div>
                <div className="aw-row"><span className="aw-row-label">RD that will be locked</span><span className="aw-row-value">{amount > 0 ? inr(amount) : '—'}</span></div>
                <div className="aw-row aw-row-total">
                  <span className="aw-row-label">RD left free afterwards</span>
                  <span className="aw-row-value">{amount > 0 ? inr(Math.max(0, (eligibilityStatus.freeRd || 0) - amount)) : '—'}</span>
                </div>
              </div>
            </div>

            {amount > 0 && !eligibilityStatus.isEligible && eligibilityStatus.message && (
              <div className="aw-alert aw-alert-danger">{eligibilityStatus.message}</div>
            )}

            <p className="aw-meta">
              Limits: up to {eligibilityStatus.rdPct ?? 90}% of the member's total RD, within the per-member maximum set on
              the Loan Against RD card in Modify Business Rules, with the minimum RD balance always left free. Only the
              loan amount is locked, never the whole RD. The member cannot withdraw locked RD until the loan is closed.
            </p>
          </div>
        </section>
      )}
    </div>
  );
};

export default LoanAgainstRdTab;
