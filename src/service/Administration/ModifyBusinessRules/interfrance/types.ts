// src/components/BusinessRulesConfig/types.ts
export interface LoanParameters {
    maxAmount: number;
    numberOfInstallments: number;
    rate: number;
    numberOfGuarantors: number;
  }
  
  export interface LoanAgainstR extends LoanParameters {}
  export interface RegularLoan extends LoanParameters {}
  export interface EmergencyLoan extends LoanParameters {}
  export interface GrainLoan extends LoanParameters {}
  export interface LoanOnDeposit extends LoanParameters {
    shareValue: number;
    fdPercentage: number;
    overallLimit: number;
  }
  export interface MainLoan extends LoanParameters {}
  export interface LastLoan extends LoanParameters {}
  
  export interface OtherParameters {
    minMembershipMonths: number;
    minShareAmount: number;
    maxShareAmount: number;
    minCDAmount: number;
    maxCDAmount: number;
    securityDeposit: number;
  }
  
  export interface LongShortDeposits {
    shareValuePercentage: number;
    overallLimit: number;
    fdPercentage: number;
    basicPay: number;
    penalRate: number;
  }
  
  export interface DataEntryMode {
    printDemandFormatHorizontal: boolean;
    considerInitBefore10th: boolean;
    calculateInterestUsingReducingBalance: boolean;
    minBalanceForSavingAccount: number;
    showConsolidateInttAmountInDemand: boolean;
    getWorkingChargesEnabled: boolean;
    workingChargesAmount: number;
  }
  
  export interface GeneralServing {
    showConsolidateInitAmountInDemand: boolean;
    getWorkingCharges: boolean;
    averageInterestCalculationSlot: boolean;
    profitHead: string;
  }
  
  export interface BusinessRules {
    loanAgainstR: LoanAgainstR;
    regularLoan: RegularLoan;
    emergencyLoan: EmergencyLoan;
    grainLoan: GrainLoan;
    loanOnDeposit: LoanOnDeposit;
    mainLoan: MainLoan;
    lastLoan: LastLoan;
    otherParameters: OtherParameters;
    longShortDeposits: LongShortDeposits;
    dataEntryMode: DataEntryMode;
    generalServing: GeneralServing;
  }
