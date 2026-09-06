import { useState, useEffect } from 'react';
import apiService from '../../../../services/api';

export interface LoanType {
  maxAmount: number;
  rate: number;
  numberOfInstallments: number;
  numberOfGuarantors: number;
  penalRate?: number;
  /** Day of the month (within an installment's own due month) through which no
   *  penal accrues. Waives penal only — the installment's own flat monthly
   *  interest is always charged in full once its due month begins. */
  graceDays?: number;
  /** Same-month-late flat fee, charged once grace expires but the payment is
   *  still within the installment's own due month: (sameMonthPenalPercent% ×
   *  unpaid principal) ÷ sameMonthPenalDivisor. Replaced entirely (not
   *  stacked) by the normal penalRate once a full month has elapsed. */
  sameMonthPenalPercent?: number;
  sameMonthPenalDivisor?: number;
}

export interface LoanAgainstDeposits {
  shareValue: number;
  fdPercentage: number;
  overallLimit: number;
  basicPay: number;
}

export interface GeneralSettings {
  dataEntryMode: boolean;
  printDemandFormatHorizontal: boolean;
  considerIntBefore10th: boolean;
  calculateInterestUsingReducingBalance: boolean;
  minBalanceForSavingAc: number;
  showConsolidateIntAmountInDemand: boolean;
  getWorkingCharges: boolean;
  workingChargesAmount: number;
  workingChargesHead: string;
  averageInterestCalculationSlot: number;
  profitHead: string;
  autoDayEndCloseEnabled: boolean;
}

/**
 * Regular Loan (RLN) eligibility rules. Unlike the rest of this screen — which
 * writes the legacy `busrules` table — these are persisted to `system_configs`,
 * because that is where the loan services actually read them from at
 * application and disbursement time.
 */
export interface RegularLoanEligibility {
  /** Maximum total regular-loan exposure a member may carry. */
  maxLimit: number;
  /** RD required, as a % of total exposure after the new loan. */
  rdPercent: number;
  /** Share Value required, as a % of total exposure after the new loan. */
  sharePercent: number;
  /** DEDUCT (withhold from disbursement) | BLOCK (refuse) | IGNORE. */
  shortfallMode: 'DEDUCT' | 'BLOCK' | 'IGNORE';
  /** OUTSTANDING_PLUS_NEW (existing + new) | NEW_ONLY. */
  limitCalc: 'OUTSTANDING_PLUS_NEW' | 'NEW_ONLY';
  /** GL head the RD shortfall is credited to at disbursement. */
  rdHeadCode: string;
  /** GL head the Share shortfall is credited to at disbursement. */
  shareHeadCode: string;
}

/**
 * BUG FIX: the loan cards on this screen were named for one product and wired
 * to another. `loanAgainstR` edited the rln* (REGULAR loan) columns under the
 * label "Loan Against R" and had no penal-rate field at all, while
 * `longTermLoan` edited the aln* (ADDITIONAL loan) columns under the label
 * "Regular Loan" — so typing a regular-loan penal rate into the card marked
 * "Regular Loan" actually repriced additional loans. A third card,
 * `additionalLoan`, had no backing columns in either direction and could only
 * ever display zeros.
 *
 * The column prefixes are the authority here, because that is what prices a
 * real loan at disbursement (voucher.service.ts: isRLN → rln*, isALN → aln*,
 * ELN → eln*). Names below now follow them:
 *   regularLoan    → rln*  (RULE_LOAN_R_*, plus RULE_PENAL_RATE → rlnpenalrate)
 *   additionalLoan → aln*  (RULE_LOAN_ADD_*)
 *   emergencyLoan  → eln*  (RULE_LOAN_EMG_*)
 *   mediumTermLoan → mln*  ("Grain Loan" — read by nothing at disbursement)
 *   loanOnDeposit  → edl*  (read by nothing at disbursement)
 * No stored value moves between columns; only the labels and the field they
 * are attached to change.
 */
export interface BusinessRulesData {
  regularLoanEligibility: RegularLoanEligibility;
  regularLoan: LoanType;
  additionalLoan: LoanType;
  mediumTermLoan: LoanType;
  emergencyLoan: LoanType;
  loanOnDeposit: LoanType;
  loanAgainstDeposits: LoanAgainstDeposits;
  others: {
    minMembership: number;
    minShareAmt: number;
    maxShareAmt: number;
    minCDAmt: number;
    maxCDAmt: number;
    securityDep: number;
  };
  generalSettings: GeneralSettings;
  fundManagement: FundManagement;
}

export interface FundManagement {
  fundInterestRate: number;
  dividendPercent: number;
  groupInsuranceAmount: number;
  interestChart: Array<{ monthlyContribution: number; yearlyInterest: number }>;
}

const initialData: BusinessRulesData = {
  // Regular Loan eligibility — mirrors REGULAR_LOAN_RULE_DEFAULTS on the backend
  regularLoanEligibility: {
    maxLimit: 1000000,
    rdPercent: 5,
    sharePercent: 5,
    shortfallMode: 'DEDUCT',
    limitCalc: 'OUTSTANDING_PLUS_NEW',
    rdHeadCode: 'L1004', // Compulsory Deposit head — RD has no head of its own; same code used everywhere else RD posts to the ledger
    shareHeadCode: 'L1001',
  },
  // Regular Loan → rln*  (legacy: 1,000,000 / 7% / 120 install / 0 gr / 15% penal)
  regularLoan: { maxAmount: 1000000, rate: 7, numberOfInstallments: 120, numberOfGuarantors: 0, penalRate: 15, graceDays: 0, sameMonthPenalPercent: 1, sameMonthPenalDivisor: 4 },
  // Additional Loan → aln*  (legacy: 1,000,000 / 12% / 50 / 2 gr / 2% penal)
  additionalLoan: { maxAmount: 1000000, rate: 12, numberOfInstallments: 50, numberOfGuarantors: 2, penalRate: 2, graceDays: 0, sameMonthPenalPercent: 1, sameMonthPenalDivisor: 4 },
  // Grain Loan mapped as Medium Term  (legacy: 25,000 / 13% / 10 / 0 gr)
  mediumTermLoan: { maxAmount: 25000, rate: 13, numberOfInstallments: 10, numberOfGuarantors: 0 },
  // Emergency Loan  (legacy: 300,000 / 12% / 80 / 0 gr)
  emergencyLoan: { maxAmount: 300000, rate: 12, numberOfInstallments: 80, numberOfGuarantors: 0, penalRate: 2, graceDays: 0, sameMonthPenalPercent: 1, sameMonthPenalDivisor: 4 },
  // Loan On Deposit  (legacy: 500,000 / 2% / 50 / 0 gr)
  loanOnDeposit: { maxAmount: 500000, rate: 2, numberOfInstallments: 50, numberOfGuarantors: 0 },
  // Loan Against Deposits  (legacy: shareValue=0, FD=90%, overallLimit=500000, basicPay=0)
  loanAgainstDeposits: { shareValue: 0, fdPercentage: 90, overallLimit: 500000, basicPay: 0 },
  // Others  (legacy: minMembership=25 months, minCD=200, maxCD=200)
  others: { minMembership: 25, minShareAmt: 0, maxShareAmt: 0, minCDAmt: 200, maxCDAmt: 200, securityDep: 0 },
  generalSettings: {
    dataEntryMode: false,
    printDemandFormatHorizontal: true,   // legacy: checked
    considerIntBefore10th: false,
    calculateInterestUsingReducingBalance: true,  // legacy: checked
    minBalanceForSavingAc: 0,
    showConsolidateIntAmountInDemand: false,
    getWorkingCharges: false,
    workingChargesAmount: 0,
    workingChargesHead: '',
    averageInterestCalculationSlot: 0,
    profitHead: '',
    // OFF by default — matches legacy's fully-manual Day-End close; staff can
    // keep a heavy-volume business day open across multiple real days until
    // they've finished entering that day's vouchers. Admin-only toggle.
    autoDayEndCloseEnabled: false,
  },
  fundManagement: {
    fundInterestRate: 0,
    dividendPercent: 0,
    groupInsuranceAmount: 0,
    interestChart: []
  }
};

export const useBusinessRules = () => {
  const [businessRules, setBusinessRules] = useState<BusinessRulesData>(initialData);
  const [loading, setLoading] = useState(true);

  const fetchBusinessRules = async () => {
    try {
      setLoading(true);
      const response = await apiService.getBusinessRules();
      if (response.success && response.data) {
        const d = response.data;

        // Parse interest chart safely
        let parsedInterestChart: any[] = [];
        try {
          if (typeof d.RULE_CD_INTEREST_CHART === 'string') {
            parsedInterestChart = JSON.parse(d.RULE_CD_INTEREST_CHART);
          } else if (Array.isArray(d.RULE_CD_INTEREST_CHART)) {
            parsedInterestChart = d.RULE_CD_INTEREST_CHART;
          }
        } catch (e) {
          console.warn('Failed to parse interest chart', e);
        }

        const def = initialData;

        // BUG FIX: these fallbacks were all `d.X || def.y`, which conflates a
        // configured 0 with a missing value. Postgres hands numerics back as
        // strings, so a stored 0 arrived as "0.00" — truthy — and pinned the
        // field at 0 with no way to fall back or to see the real default. The
        // save path then re-wrote those zeros as a new policy row, so once one
        // zero row existed the screen could never recover on its own.
        // A nullish check keeps "the society really did configure 0" working
        // while still letting a genuinely absent value show the default.
        const num = (v: any, fallback: number): number =>
          v === undefined || v === null || v === '' || isNaN(Number(v)) ? fallback : Number(v);
        const bool = (v: any, fallback: boolean): boolean =>
          v === undefined || v === null ? fallback : Boolean(v);
        const str = (v: any, fallback: string): string =>
          v === undefined || v === null || v === '' ? fallback : String(v);

        setBusinessRules({
          regularLoanEligibility: {
            maxLimit: num(d.RULE_LOAN_R_MAX_LIMIT, def.regularLoanEligibility.maxLimit),
            rdPercent: num(d.RULE_LOAN_R_RD_PCT, def.regularLoanEligibility.rdPercent),
            sharePercent: num(d.RULE_LOAN_R_SHARE_PCT, def.regularLoanEligibility.sharePercent),
            shortfallMode: str(d.RULE_LOAN_R_SHORTFALL_MODE, def.regularLoanEligibility.shortfallMode) as RegularLoanEligibility['shortfallMode'],
            limitCalc: str(d.RULE_LOAN_R_LIMIT_CALC, def.regularLoanEligibility.limitCalc) as RegularLoanEligibility['limitCalc'],
            rdHeadCode: str(d.RULE_LOAN_R_RD_HEAD_CODE, def.regularLoanEligibility.rdHeadCode),
            shareHeadCode: str(d.RULE_LOAN_R_SHARE_HEAD_CODE, def.regularLoanEligibility.shareHeadCode),
          },
          regularLoan: {
            maxAmount: num(d.RULE_LOAN_R_MAX_AMT, def.regularLoan.maxAmount),
            rate: num(d.RULE_LOAN_R_RATE, def.regularLoan.rate),
            numberOfInstallments: num(d.RULE_LOAN_R_INSTALLMENTS, def.regularLoan.numberOfInstallments),
            numberOfGuarantors: num(d.RULE_LOAN_R_GUARANTORS, def.regularLoan.numberOfGuarantors),
            // rlnpenalrate — previously only reachable from the generic "Penal
            // Rate" box on the General Setting tab, which gave no hint that it
            // priced regular loans specifically.
            penalRate: num(d.RULE_PENAL_RATE, def.regularLoan.penalRate ?? 0),
            graceDays: num(d.RULE_LOAN_R_GRACE_DAYS, def.regularLoan.graceDays ?? 0),
            sameMonthPenalPercent: num(d.RULE_LOAN_R_SM_PCT, def.regularLoan.sameMonthPenalPercent ?? 1),
            sameMonthPenalDivisor: num(d.RULE_LOAN_R_SM_DIV, def.regularLoan.sameMonthPenalDivisor ?? 4),
          },
          mediumTermLoan: {
            maxAmount: num(d.RULE_LOAN_MT_MAX_AMT, def.mediumTermLoan.maxAmount),
            rate: num(d.RULE_LOAN_MT_RATE, def.mediumTermLoan.rate),
            numberOfInstallments: num(d.RULE_LOAN_MT_INSTALLMENTS, def.mediumTermLoan.numberOfInstallments),
            numberOfGuarantors: num(d.RULE_LOAN_MT_GUARANTORS, def.mediumTermLoan.numberOfGuarantors),
          },
          emergencyLoan: {
            maxAmount: num(d.RULE_LOAN_EMG_MAX_AMT, def.emergencyLoan.maxAmount),
            rate: num(d.RULE_LOAN_EMG_RATE, def.emergencyLoan.rate),
            numberOfInstallments: num(d.RULE_LOAN_EMG_INSTALLMENTS, def.emergencyLoan.numberOfInstallments),
            numberOfGuarantors: num(d.RULE_LOAN_EMG_GUARANTORS, def.emergencyLoan.numberOfGuarantors),
            penalRate: num(d.RULE_LOAN_EMG_PENAL_RATE, def.emergencyLoan.penalRate ?? 0),
            graceDays: num(d.RULE_LOAN_EMG_GRACE_DAYS, def.emergencyLoan.graceDays ?? 0),
            sameMonthPenalPercent: num(d.RULE_LOAN_EMG_SM_PCT, def.emergencyLoan.sameMonthPenalPercent ?? 1),
            sameMonthPenalDivisor: num(d.RULE_LOAN_EMG_SM_DIV, def.emergencyLoan.sameMonthPenalDivisor ?? 4),
          },
          additionalLoan: {
            maxAmount: num(d.RULE_LOAN_ADD_MAX_AMT, def.additionalLoan.maxAmount),
            rate: num(d.RULE_LOAN_ADD_RATE, def.additionalLoan.rate),
            numberOfInstallments: num(d.RULE_LOAN_ADD_INSTALLMENTS, def.additionalLoan.numberOfInstallments),
            numberOfGuarantors: num(d.RULE_LOAN_ADD_GUARANTORS, def.additionalLoan.numberOfGuarantors),
            penalRate: num(d.RULE_LOAN_ADD_PENAL_RATE, def.additionalLoan.penalRate ?? 0),
            graceDays: num(d.RULE_LOAN_ADD_GRACE_DAYS, def.additionalLoan.graceDays ?? 0),
            sameMonthPenalPercent: num(d.RULE_LOAN_ADD_SM_PCT, def.additionalLoan.sameMonthPenalPercent ?? 1),
            sameMonthPenalDivisor: num(d.RULE_LOAN_ADD_SM_DIV, def.additionalLoan.sameMonthPenalDivisor ?? 4),
          },
          loanOnDeposit: {
            maxAmount: num(d.RULE_LOAN_DEP_MAX_AMT, def.loanOnDeposit.maxAmount),
            rate: num(d.RULE_LOAN_DEP_RATE, def.loanOnDeposit.rate),
            numberOfInstallments: num(d.RULE_LOAN_DEP_INSTALLMENTS, def.loanOnDeposit.numberOfInstallments),
            numberOfGuarantors: num(d.RULE_LOAN_DEP_GUARANTORS, def.loanOnDeposit.numberOfGuarantors),
          },
          loanAgainstDeposits: {
            shareValue: num(d.RULE_LOAN_DEP_SHARE_VAL_PCT, def.loanAgainstDeposits.shareValue),
            fdPercentage: num(d.RULE_LOAN_DEP_FD_PCT, def.loanAgainstDeposits.fdPercentage),
            overallLimit: num(d.RULE_LOAN_DEP_OVERALL_LIMIT, def.loanAgainstDeposits.overallLimit),
            basicPay: num(d.RULE_LOAN_DEP_BASIC_PAY, def.loanAgainstDeposits.basicPay),
          },
          others: {
            minMembership: num(d.RULE_MEMBER_MIN_TENURE_MONTHS, def.others.minMembership),
            minShareAmt: num(d.RULE_SHARE_MIN_AMT, def.others.minShareAmt),
            maxShareAmt: num(d.RULE_SHARE_MAX_AMT, def.others.maxShareAmt),
            minCDAmt: num(d.RULE_CD_MIN_AMT, def.others.minCDAmt),
            maxCDAmt: num(d.RULE_CD_MAX_AMT, def.others.maxCDAmt),
            securityDep: num(d.RULE_SECURITY_DEP_AMT, def.others.securityDep),
          },
          generalSettings: {
            dataEntryMode: bool(d.SYS_DATA_ENTRY_MODE, def.generalSettings.dataEntryMode),
            printDemandFormatHorizontal: bool(d.SYS_PRINT_DEMAND_HORIZONTAL, def.generalSettings.printDemandFormatHorizontal),
            considerIntBefore10th: bool(d.SYS_CONSIDER_INT_BEFORE_10TH, def.generalSettings.considerIntBefore10th),
            calculateInterestUsingReducingBalance: bool(d.SYS_USE_REDUCING_BALANCE, def.generalSettings.calculateInterestUsingReducingBalance),
            minBalanceForSavingAc: num(d.SYS_MIN_SAVINGS_BALANCE, def.generalSettings.minBalanceForSavingAc),
            showConsolidateIntAmountInDemand: bool(d.SYS_SHOW_CONSOLIDATED_INT_IN_DEMAND, def.generalSettings.showConsolidateIntAmountInDemand),
            getWorkingCharges: bool(d.SYS_GET_WORKING_CHARGES, def.generalSettings.getWorkingCharges),
            workingChargesAmount: num(d.SYS_WORKING_CHARGES_AMT, def.generalSettings.workingChargesAmount),
            workingChargesHead: str(d.SYS_WORKING_CHARGES_HEAD, def.generalSettings.workingChargesHead),
            averageInterestCalculationSlot: num(d.SYS_AVG_INT_CALC_SLOT, def.generalSettings.averageInterestCalculationSlot),
            profitHead: str(d.SYS_PROFIT_HEAD, def.generalSettings.profitHead),
            autoDayEndCloseEnabled: bool(d.SYS_DAYEND_AUTO_CLOSE, def.generalSettings.autoDayEndCloseEnabled),
          },
          fundManagement: {
            fundInterestRate: num(d.RULE_FUND_INT_RATE, def.fundManagement.fundInterestRate),
            dividendPercent: num(d.RULE_DIVIDEND_PCT, def.fundManagement.dividendPercent),
            groupInsuranceAmount: num(d.RULE_GRP_INSURANCE_AMT, def.fundManagement.groupInsuranceAmount),
            interestChart: parsedInterestChart
          }
        });
      }
    } catch (error) {
      console.error('Error fetching business rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveBusinessRules = async (currentData: BusinessRulesData) => {
    try {
      const flatRules: Record<string, any> = {
        // Regular Loan eligibility (persisted to system_configs, where the
        // loan services read them — see updateBusinessRules on the backend)
        RULE_LOAN_R_MAX_LIMIT: currentData.regularLoanEligibility.maxLimit,
        RULE_LOAN_R_RD_PCT: currentData.regularLoanEligibility.rdPercent,
        RULE_LOAN_R_SHARE_PCT: currentData.regularLoanEligibility.sharePercent,
        RULE_LOAN_R_SHORTFALL_MODE: currentData.regularLoanEligibility.shortfallMode,
        RULE_LOAN_R_LIMIT_CALC: currentData.regularLoanEligibility.limitCalc,
        RULE_LOAN_R_RD_HEAD_CODE: currentData.regularLoanEligibility.rdHeadCode,
        RULE_LOAN_R_SHARE_HEAD_CODE: currentData.regularLoanEligibility.shareHeadCode,

        // Regular Loan → rln* (RULE_PENAL_RATE is rlnpenalrate)
        RULE_LOAN_R_MAX_AMT: currentData.regularLoan.maxAmount,
        RULE_LOAN_R_RATE: currentData.regularLoan.rate,
        RULE_LOAN_R_INSTALLMENTS: currentData.regularLoan.numberOfInstallments,
        RULE_LOAN_R_GUARANTORS: currentData.regularLoan.numberOfGuarantors,
        RULE_PENAL_RATE: currentData.regularLoan.penalRate,
        RULE_LOAN_R_GRACE_DAYS: currentData.regularLoan.graceDays,
        RULE_LOAN_R_SM_PCT: currentData.regularLoan.sameMonthPenalPercent,
        RULE_LOAN_R_SM_DIV: currentData.regularLoan.sameMonthPenalDivisor,

        // Additional Loan → aln*
        RULE_LOAN_ADD_MAX_AMT: currentData.additionalLoan.maxAmount,
        RULE_LOAN_ADD_RATE: currentData.additionalLoan.rate,
        RULE_LOAN_ADD_INSTALLMENTS: currentData.additionalLoan.numberOfInstallments,
        RULE_LOAN_ADD_GUARANTORS: currentData.additionalLoan.numberOfGuarantors,
        RULE_LOAN_ADD_PENAL_RATE: currentData.additionalLoan.penalRate,
        RULE_LOAN_ADD_GRACE_DAYS: currentData.additionalLoan.graceDays,
        RULE_LOAN_ADD_SM_PCT: currentData.additionalLoan.sameMonthPenalPercent,
        RULE_LOAN_ADD_SM_DIV: currentData.additionalLoan.sameMonthPenalDivisor,

        // Medium Term Loan
        RULE_LOAN_MT_MAX_AMT: currentData.mediumTermLoan.maxAmount,
        RULE_LOAN_MT_RATE: currentData.mediumTermLoan.rate,
        RULE_LOAN_MT_INSTALLMENTS: currentData.mediumTermLoan.numberOfInstallments,
        RULE_LOAN_MT_GUARANTORS: currentData.mediumTermLoan.numberOfGuarantors,

        // Emergency Loan
        RULE_LOAN_EMG_MAX_AMT: currentData.emergencyLoan.maxAmount,
        RULE_LOAN_EMG_RATE: currentData.emergencyLoan.rate,
        RULE_LOAN_EMG_INSTALLMENTS: currentData.emergencyLoan.numberOfInstallments,
        RULE_LOAN_EMG_GUARANTORS: currentData.emergencyLoan.numberOfGuarantors,
        RULE_LOAN_EMG_PENAL_RATE: currentData.emergencyLoan.penalRate,
        RULE_LOAN_EMG_GRACE_DAYS: currentData.emergencyLoan.graceDays,
        RULE_LOAN_EMG_SM_PCT: currentData.emergencyLoan.sameMonthPenalPercent,
        RULE_LOAN_EMG_SM_DIV: currentData.emergencyLoan.sameMonthPenalDivisor,

        // Loan on Deposit
        RULE_LOAN_DEP_MAX_AMT: currentData.loanOnDeposit.maxAmount,
        RULE_LOAN_DEP_RATE: currentData.loanOnDeposit.rate,
        RULE_LOAN_DEP_INSTALLMENTS: currentData.loanOnDeposit.numberOfInstallments,
        RULE_LOAN_DEP_GUARANTORS: currentData.loanOnDeposit.numberOfGuarantors,

        // Loan Against Deposits
        RULE_LOAN_DEP_SHARE_VAL_PCT: currentData.loanAgainstDeposits.shareValue,
        RULE_LOAN_DEP_FD_PCT: currentData.loanAgainstDeposits.fdPercentage,
        RULE_LOAN_DEP_OVERALL_LIMIT: currentData.loanAgainstDeposits.overallLimit,
        RULE_LOAN_DEP_BASIC_PAY: currentData.loanAgainstDeposits.basicPay,

        // Others
        RULE_MEMBER_MIN_TENURE_MONTHS: currentData.others.minMembership,
        RULE_SHARE_MIN_AMT: currentData.others.minShareAmt,
        RULE_SHARE_MAX_AMT: currentData.others.maxShareAmt,
        RULE_CD_MIN_AMT: currentData.others.minCDAmt,
        RULE_CD_MAX_AMT: currentData.others.maxCDAmt,
        RULE_SECURITY_DEP_AMT: currentData.others.securityDep,

        // General Settings
        SYS_DATA_ENTRY_MODE: currentData.generalSettings.dataEntryMode,
        SYS_PRINT_DEMAND_HORIZONTAL: currentData.generalSettings.printDemandFormatHorizontal,
        SYS_CONSIDER_INT_BEFORE_10TH: currentData.generalSettings.considerIntBefore10th,
        SYS_USE_REDUCING_BALANCE: currentData.generalSettings.calculateInterestUsingReducingBalance,
        SYS_MIN_SAVINGS_BALANCE: currentData.generalSettings.minBalanceForSavingAc,
        SYS_SHOW_CONSOLIDATED_INT_IN_DEMAND: currentData.generalSettings.showConsolidateIntAmountInDemand,
        SYS_GET_WORKING_CHARGES: currentData.generalSettings.getWorkingCharges,
        SYS_WORKING_CHARGES_AMT: currentData.generalSettings.workingChargesAmount,
        SYS_WORKING_CHARGES_HEAD: currentData.generalSettings.workingChargesHead,
        SYS_AVG_INT_CALC_SLOT: currentData.generalSettings.averageInterestCalculationSlot,
        SYS_PROFIT_HEAD: currentData.generalSettings.profitHead,
        SYS_DAYEND_AUTO_CLOSE: currentData.generalSettings.autoDayEndCloseEnabled,

        // Fund Management — these were missing and never persisted
        RULE_FUND_INT_RATE: currentData.fundManagement.fundInterestRate,
        RULE_DIVIDEND_PCT: currentData.fundManagement.dividendPercent,
        RULE_GRP_INSURANCE_AMT: currentData.fundManagement.groupInsuranceAmount,
        RULE_CD_INTEREST_CHART: JSON.stringify(currentData.fundManagement.interestChart),
      };

      const response = await apiService.updateBusinessRules(flatRules);
      return response.success;
    } catch (error) {
      console.error('Error saving business rules:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchBusinessRules();
  }, []);

  return {
    businessRules,
    setBusinessRules,
    loading,
    saveBusinessRules,
    refresh: fetchBusinessRules
  };
};
