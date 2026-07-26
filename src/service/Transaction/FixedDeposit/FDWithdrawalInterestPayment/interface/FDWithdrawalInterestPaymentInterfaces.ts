// interface/FDWithdrawalInterestPaymentInterfaces.ts

export interface FDEntry {
    key: string;
    acNo: string;
    certNo: string;
    amount: number;
    rate: number;
    lastPayDate: string;
    interest: number;
}

export interface FDWithdrawalData {
    voucherNo: string;
    fdOption: string;
    memberNo: string;
    certNo: string;
    officeNo: string;
    fdCertNo: string;
    fdAccountNumber: string;  // BUG FIX: fdmaster.account_number — required for postFdInterestVoucher
    depositDate: string;
    rate: string;
    depositUnit: string;
    depPer: string;
    maturityDate: string;
    fdInterest: string;
    lastIntPaidDate: string;
    fdAmount: string;
    interestPaid: string;
    intPaymentMode: string;
    maturityAmount: string;
    paymentMode: string;
    transDate: string;
    chequeDate: any; // Using any for dayjs object to match state
    chequeNo: string;
    bankName: string;
    bankCode: string; // OUR bank account credited on bank payout
    narration: string;
}

export interface FDWithdrawalHookReturn {
    formData: FDWithdrawalData;
    actualAmount: number;
    bankBalance: number;
    bankAccounts: { code: string; name: string }[];
    data: FDEntry[];
    updateField: (field: keyof FDWithdrawalData, value: any) => void;
    handleSave: () => void;
    handleReset: () => void;
    handleExit: () => void;
    showLookupModal?: boolean;
    setShowLookupModal?: (show: boolean) => void;
    fetchMemberFDs?: (mbNo: string) => void;
    loading?: boolean;
}
