// interface/SavingTransactionInterfaces.ts

export interface SavingTransactionData {
    voucherNo: string;
    accountNo: string;
    transDate: any;
    currentBalance: number;
    minimumBalance: number;
    unpassCr: number;
    unpassDr: number;
    availableBalance: number;
    withdrawableBalance: number;
    transactionType: 'deposit' | 'withdrawal';
    amount: string;
    paymentMode: 'cash' | 'bank';
    actualAmount: number;
    bankBal: number;
    chequeDate: any;
    chequeNo: string;
    bankName: string;
    bankCode: string;
    modeOfOperation: string;
    operators: string;
    narration: string;
}

export interface TransactionHistoryRow {
    transDate: string;
    voucherNo: string;
    accType: string;
    transType: string;
    amount: number;
}

export interface SbAccountOption {
    accountNo: string;
    memberNo: string;
    balance: number;
}

export interface SavingTransactionHookReturn {
    formData: SavingTransactionData;
    bankAccounts: { code: string; name: string }[];
    sbAccounts: SbAccountOption[];
    transactionHistory: TransactionHistoryRow[];
    isLoading: boolean;
    isLoadingAccount: boolean;
    lastSaved: { voucherNo: string; accountNo: string; amount: number; type: string } | null;
    updateField: (field: keyof SavingTransactionData, value: any) => void;
    handleAccountNoChange: (accountNo: string) => void;
    handleSave: () => void;
    handleReset: () => void;
    handleExit: () => void;
}
