// interface/LoanPaymentInterfaces.ts

export interface PaymentEntry {
    key: string;
    srNo: string;
    code: string;
    name: string;
    rp: string;
    amount: number;
}

export interface LoanCase {
    loanCaseNo: string;
    memberName: string;
    loanType: string;
    memberNo: string;
    officeNo: string;
    subDivision: string;
    appliedAmount: string;
    applicationDate: string;
    basicPay: string;
    currentBalance: string;
    shareAmount: string;
    purpose: string;
    formNumber: string;
    rate: string;
    penalRate: string;
    noOfInstallments: string;
    installmentAmount: string;
    sanctionedAmount?: string;
    sanctionDate?: string;
    surety1Gr?: string;
    surety1Name?: string;
    surety1Office?: string;
    surety1LoanBalance?: string;
    surety2Gr?: string;
    surety2Name?: string;
    surety2Office?: string;
    surety2LoanBalance?: string;
}

export interface LoanPaymentData {
    loanCaseNo: string;
    memberNo: string;
    memberName: string;
    sanctionAmount: string;
    officeNo: string;
    subDivision: string;
    hCode: string;
    hName: string;
    paymentMode: string;
    chequeDate: any; // dayjs
    chequeNo: string;
    bankName: string;
    narration: string;
    sanctionLoanAmount: string;
    noOfInstallments: string;
}

export interface ModalData {
    isOpen: boolean;
    loanCaseNo: string;
    loanType: string;
    memberNo: string;
    memberName: string;
    officeNo: string;
    subDivision: string;
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
    surety1Division: string;
    surety1LoanBalance: string;
    surety2Gr: string;
    surety2Name: string;
    surety2Office: string;
    surety2Division: string;
    surety2LoanBalance: string;
    sanctionedAmount: string;
    sanctionDate: string;
    noOfInstallments: string;
    rate: string;
    penalRate: string;
    installmentAmount: string;
    intAmount: string;
}

export interface LoanPaymentHookReturn {
    formData: LoanPaymentData;
    modalData: ModalData;
    loanCases: LoanCase[];
    isLoadingCases: boolean;
    actualAmount: number;
    bankBalance: number;
    totalReceipt: number;
    totalPayment: number;
    data: PaymentEntry[];
    updateField: (field: keyof LoanPaymentData, value: any) => void;
    updateModalField: (field: keyof ModalData, value: any) => void;
    headList: { code: string; name: string }[];
    bankList: { code: string; name: string }[];
    addVoucherEntry: () => void;
    updateVoucherEntry: (index: number, field: keyof PaymentEntry, value: any) => void;
    removeVoucherEntry: (index: number) => void;
    handleLoanCaseChange: (caseNo: string) => void;
    openSanctionWindow: () => void;
    closeModal: () => void;
    handleModalSave: () => void;
    handleSave: () => void;
    handleReset: () => void;
    handleExit: () => void;
}
