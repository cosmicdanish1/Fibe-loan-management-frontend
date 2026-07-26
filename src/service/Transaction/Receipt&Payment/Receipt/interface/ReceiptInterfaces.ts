// interface/ReceiptInterfaces.ts

export interface ReceiptEntry {
    key: string;
    code: string;
    name: string;
    amount: number;
    rdSrNo: string;
}

export interface ReceiptData {
    receiptType: string;
    memberNo: string;
    memberName: string;
    office: string;
    selectedMonth: string;
    selectedYear: string;
    paymentMode: string;
    chequeDate: any;
    chequeNo: string;
    bankName: string;
    customerBankName: string;
    narration: string;
}

export interface ReceiptHookReturn {
    formData: ReceiptData;
    flnBal: number;
    elnBal: number;
    flnBalIntl: number;
    actualAmount: number;
    bankBalance: number;
    data: ReceiptEntry[];
    isLoading: boolean;
    showLookupModal: boolean;
    setShowLookupModal: (show: boolean) => void;
    updateField: (field: keyof ReceiptData, value: any) => void;
    updateEntry: (key: string, amount: number) => void;
    handleSave: () => void;
    handleCancel: () => void;
    handleExit: () => void;
}
