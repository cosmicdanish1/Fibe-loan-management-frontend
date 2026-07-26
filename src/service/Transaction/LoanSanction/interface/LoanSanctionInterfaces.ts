// interface/LoanSanctionInterfaces.ts

export interface LoanCase {
    loanCaseNo: string;
    memberNo: string;
    memberName: string;
    loanType: string;
    appliedAmount: number;
    applicationDate: string;
    officeNo: string;
    officeName: string;
    sanctioned?: boolean;
}

export interface LoanDetails {
    loanCaseNo: string;
    loanType: string;
    memberNo: string;
    memberName: string;
    officeNo: string;
    officeName: string;
    appliedAmount: string;
    applicationDate: string;
    basicPay: string;
    currentBalance: string;
    shareAmount: string;
    purpose: string;
    formNumber: string;
    surety1Gr: string;
    surety1Name: string;
    surety1Office: string;
    surety1LoanBalance: string;
    surety2Gr: string;
    surety2Name: string;
    surety2Office: string;
    surety2LoanBalance: string;
}

export interface SanctionDetails {
    sanctionedAmount: string;
    sanctionDate: string;
    rate: string;
    penalRate: string;
    noOfInstallments: string;
    installmentAmount: string;
    interestAmount: string;
}

export interface SanctionRules {
    sharesBalance: boolean;
    tenPercentOfLoan: boolean;
}

export interface LoanSanctionHookReturn {
    loanCases: LoanCase[];
    selectedLoanCase: string;
    isLoadingCases: boolean;
    isLoadingDetails: boolean;
    isSaving: boolean;
    loanDetails: LoanDetails;
    sanctionDetails: SanctionDetails;
    rules: SanctionRules;
    toggleRule: (key: keyof SanctionRules) => void;
    handleLoanCaseChange: (caseNo: string) => void;
    updateSanctionField: (field: keyof SanctionDetails, value: string) => void;
    handleSanctionSave: () => void;
    formatCurrency: (amount: string | number) => string;
    handleExit: () => void;
}
