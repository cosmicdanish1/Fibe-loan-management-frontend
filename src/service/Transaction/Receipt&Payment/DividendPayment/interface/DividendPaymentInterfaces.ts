// interface/DividendPaymentInterfaces.ts

export interface DividendEntry {
    key: string;
    id: number;
    wrNo: string;
    year: number;
    shareAmount: number;
    balance: number;
    rate: number;
    dividend: number;
}

export interface DividendPaymentData {
    memberNo: string;
    subDivision: string;
    paymentMode: string;
    transDate: string;
    chequeDate: any;
    chequeNo: string;
    bankName: string;
    bankCode: string; // OUR bank account credited when paying by bank
    narration: string;
}

export interface DividendPaymentHookReturn {
    formData: DividendPaymentData;
    actualAmount: number;
    bankBalance: number;
    bankAccounts: { code: string; name: string }[];
    data: DividendEntry[];
    isLoading: boolean;
    showLookupModal: boolean;
    setShowLookupModal: (show: boolean) => void;
    updateField: (field: keyof DividendPaymentData, value: any) => void;
    handleSave: () => void;
    handleReset: () => void;
    handleExit: () => void;
}
