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
    /** 'REAGREEMENT' for a loan re-agreement (restructure); 'NEW' for a normal loan application. */
    applicationKind?: string;
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
    /** Set when the selected case is a re-agreement: principal is locked; tenure and rate are editable. */
    reagreement: any | null;
    /** Live server quote for the re-agreement while tenure / rate are edited. */
    raQuote: import('../../../../services/reagreementApi').ReagreementQuote | null;
    raQuoteLoading: boolean;
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
