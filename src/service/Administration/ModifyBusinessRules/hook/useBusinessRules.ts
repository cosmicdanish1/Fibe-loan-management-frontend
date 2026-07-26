import { useState, useEffect } from 'react';
import apiService from '../../../../services/api';

export interface LoanType {
  maxAmount: number;
  rate: number;
  numberOfInstallments: number;
  numberOfGuarantors: number;
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
}

export interface BusinessRulesData {
  loanAgainstR: LoanType;
  longTermLoan: LoanType;
  mediumTermLoan: LoanType;
  emergencyLoan: LoanType;
  additionalLoan: LoanType;
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
  penalRate: number;
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
  // Loan Against R  (legacy: 1,000,000 / 7% / 120 install / 0 gr)
  loanAgainstR: { maxAmount: 1000000, rate: 7, numberOfInstallments: 120, numberOfGuarantors: 0 },
  // Regular Loan mapped as Long Term  (legacy: 1,000,000 / 12% / 50 / 2 gr)
  longTermLoan: { maxAmount: 1000000, rate: 12, numberOfInstallments: 50, numberOfGuarantors: 2 },
  // Grain Loan mapped as Medium Term  (legacy: 25,000 / 13% / 10 / 0 gr)
  mediumTermLoan: { maxAmount: 25000, rate: 13, numberOfInstallments: 10, numberOfGuarantors: 0 },
  // Emergency Loan  (legacy: 300,000 / 12% / 80 / 0 gr)
  emergencyLoan: { maxAmount: 300000, rate: 12, numberOfInstallments: 80, numberOfGuarantors: 0 },
  // Additional Loan  (legacy: 4th unnamed section — all 0)
  additionalLoan: { maxAmount: 0, rate: 0, numberOfInstallments: 0, numberOfGuarantors: 0 },
  // Loan On Deposit  (legacy: 500,000 / 2% / 50 / 0 gr)
  loanOnDeposit: { maxAmount: 500000, rate: 2, numberOfInstallments: 50, numberOfGuarantors: 0 },
  // Loan Against Deposits  (legacy: shareValue=0, FD=90%, overallLimit=500000, basicPay=0)
  loanAgainstDeposits: { shareValue: 0, fdPercentage: 90, overallLimit: 500000, basicPay: 0 },
  // Others  (legacy: minMembership=25 months, minCD=200, maxCD=200)
  others: { minMembership: 25, minShareAmt: 0, maxShareAmt: 0, minCDAmt: 200, maxCDAmt: 200, securityDep: 0 },
  penalRate: 3,
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
    profitHead: ''
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
        setBusinessRules({
          loanAgainstR: {
            maxAmount: d.RULE_LOAN_R_MAX_AMT || def.loanAgainstR.maxAmount,
            rate: d.RULE_LOAN_R_RATE || def.loanAgainstR.rate,
            numberOfInstallments: d.RULE_LOAN_R_INSTALLMENTS || def.loanAgainstR.numberOfInstallments,
            numberOfGuarantors: d.RULE_LOAN_R_GUARANTORS ?? def.loanAgainstR.numberOfGuarantors,
          },
          longTermLoan: {
            maxAmount: d.RULE_LOAN_LT_MAX_AMT || def.longTermLoan.maxAmount,
            rate: d.RULE_LOAN_LT_RATE || def.longTermLoan.rate,
            numberOfInstallments: d.RULE_LOAN_LT_INSTALLMENTS || def.longTermLoan.numberOfInstallments,
            numberOfGuarantors: d.RULE_LOAN_LT_GUARANTORS ?? def.longTermLoan.numberOfGuarantors,
          },
          mediumTermLoan: {
            maxAmount: d.RULE_LOAN_MT_MAX_AMT || def.mediumTermLoan.maxAmount,
            rate: d.RULE_LOAN_MT_RATE || def.mediumTermLoan.rate,
            numberOfInstallments: d.RULE_LOAN_MT_INSTALLMENTS || def.mediumTermLoan.numberOfInstallments,
            numberOfGuarantors: d.RULE_LOAN_MT_GUARANTORS ?? def.mediumTermLoan.numberOfGuarantors,
          },
          emergencyLoan: {
            maxAmount: d.RULE_LOAN_EMG_MAX_AMT || def.emergencyLoan.maxAmount,
            rate: d.RULE_LOAN_EMG_RATE || def.emergencyLoan.rate,
            numberOfInstallments: d.RULE_LOAN_EMG_INSTALLMENTS || def.emergencyLoan.numberOfInstallments,
            numberOfGuarantors: d.RULE_LOAN_EMG_GUARANTORS ?? def.emergencyLoan.numberOfGuarantors,
          },
          additionalLoan: {
            maxAmount: d.RULE_LOAN_ADD_MAX_AMT ?? def.additionalLoan.maxAmount,
            rate: d.RULE_LOAN_ADD_RATE ?? def.additionalLoan.rate,
            numberOfInstallments: d.RULE_LOAN_ADD_INSTALLMENTS ?? def.additionalLoan.numberOfInstallments,
            numberOfGuarantors: d.RULE_LOAN_ADD_GUARANTORS ?? def.additionalLoan.numberOfGuarantors,
          },
          loanOnDeposit: {
            maxAmount: d.RULE_LOAN_DEP_MAX_AMT || def.loanOnDeposit.maxAmount,
            rate: d.RULE_LOAN_DEP_RATE || def.loanOnDeposit.rate,
            numberOfInstallments: d.RULE_LOAN_DEP_INSTALLMENTS || def.loanOnDeposit.numberOfInstallments,
            numberOfGuarantors: d.RULE_LOAN_DEP_GUARANTORS ?? def.loanOnDeposit.numberOfGuarantors,
          },
          loanAgainstDeposits: {
            shareValue: d.RULE_LOAN_DEP_SHARE_VAL_PCT ?? def.loanAgainstDeposits.shareValue,
            fdPercentage: d.RULE_LOAN_DEP_FD_PCT || def.loanAgainstDeposits.fdPercentage,
            overallLimit: d.RULE_LOAN_DEP_OVERALL_LIMIT || def.loanAgainstDeposits.overallLimit,
            basicPay: d.RULE_LOAN_DEP_BASIC_PAY ?? def.loanAgainstDeposits.basicPay,
          },
          others: {
            minMembership: d.RULE_MEMBER_MIN_TENURE_MONTHS || def.others.minMembership,
            minShareAmt: d.RULE_SHARE_MIN_AMT ?? def.others.minShareAmt,
            maxShareAmt: d.RULE_SHARE_MAX_AMT ?? def.others.maxShareAmt,
            minCDAmt: d.RULE_CD_MIN_AMT || def.others.minCDAmt,
            maxCDAmt: d.RULE_CD_MAX_AMT || def.others.maxCDAmt,
            securityDep: d.RULE_SECURITY_DEP_AMT ?? def.others.securityDep,
          },
          penalRate: d.RULE_PENAL_RATE || def.penalRate,
          generalSettings: {
            dataEntryMode: d.SYS_DATA_ENTRY_MODE ?? def.generalSettings.dataEntryMode,
            printDemandFormatHorizontal: d.SYS_PRINT_DEMAND_HORIZONTAL ?? def.generalSettings.printDemandFormatHorizontal,
            considerIntBefore10th: d.SYS_CONSIDER_INT_BEFORE_10TH ?? def.generalSettings.considerIntBefore10th,
            calculateInterestUsingReducingBalance: d.SYS_USE_REDUCING_BALANCE ?? def.generalSettings.calculateInterestUsingReducingBalance,
            minBalanceForSavingAc: d.SYS_MIN_SAVINGS_BALANCE ?? def.generalSettings.minBalanceForSavingAc,
            showConsolidateIntAmountInDemand: d.SYS_SHOW_CONSOLIDATED_INT_IN_DEMAND ?? def.generalSettings.showConsolidateIntAmountInDemand,
            getWorkingCharges: d.SYS_GET_WORKING_CHARGES ?? def.generalSettings.getWorkingCharges,
            workingChargesAmount: d.SYS_WORKING_CHARGES_AMT ?? def.generalSettings.workingChargesAmount,
            workingChargesHead: d.SYS_WORKING_CHARGES_HEAD || def.generalSettings.workingChargesHead,
            averageInterestCalculationSlot: d.SYS_AVG_INT_CALC_SLOT ?? def.generalSettings.averageInterestCalculationSlot,
            profitHead: d.SYS_PROFIT_HEAD ?? def.generalSettings.profitHead,
          },
          fundManagement: {
            fundInterestRate: d.RULE_FUND_INT_RATE || 0,
            dividendPercent: d.RULE_DIVIDEND_PCT || 0,
            groupInsuranceAmount: d.RULE_GRP_INSURANCE_AMT || 0,
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
        // Loan Against R
        RULE_LOAN_R_MAX_AMT: currentData.loanAgainstR.maxAmount,
        RULE_LOAN_R_RATE: currentData.loanAgainstR.rate,
        RULE_LOAN_R_INSTALLMENTS: currentData.loanAgainstR.numberOfInstallments,
        RULE_LOAN_R_GUARANTORS: currentData.loanAgainstR.numberOfGuarantors,

        // Long Term Loan
        RULE_LOAN_LT_MAX_AMT: currentData.longTermLoan.maxAmount,
        RULE_LOAN_LT_RATE: currentData.longTermLoan.rate,
        RULE_LOAN_LT_INSTALLMENTS: currentData.longTermLoan.numberOfInstallments,
        RULE_LOAN_LT_GUARANTORS: currentData.longTermLoan.numberOfGuarantors,

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

        // Additional Loan
        RULE_LOAN_ADD_MAX_AMT: currentData.additionalLoan.maxAmount,
        RULE_LOAN_ADD_RATE: currentData.additionalLoan.rate,
        RULE_LOAN_ADD_INSTALLMENTS: currentData.additionalLoan.numberOfInstallments,
        RULE_LOAN_ADD_GUARANTORS: currentData.additionalLoan.numberOfGuarantors,

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
        RULE_PENAL_RATE: currentData.penalRate,

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
