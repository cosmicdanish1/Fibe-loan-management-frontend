// interface/PassTransactionsInterfaces.ts

export interface TransactionEntry {
    key: string;
    id?: number;
    trNo: string;        // Tr. No
    voucherNo: string;   // Vchr No.
    memberNo: string;    // MB No.
    memberName: string;  // Name
    noOfAcc: string;     // No.Of Acc
    head: string;        // Head
    transType: string;   // Trans Type (e.g., Receipt/Payment)
    amount: number;      // Trans Amount
    vchrType: string;    // Vchr Typ
    chequeNo: string;    // Cheque No.
    chequeDate: string;  // Cheque Date
    chequeAmount: number; // Cheque Amount
    bankName: string;    // Bank Name
    passFlag: string;    // Pass Flag (Status)
    narration: string;   // Narration
    loanCaseNo?: string; // Internal mapping
}

export interface PassTransactionsHookReturn {
    transactionData: TransactionEntry[];
    isLoading: boolean;
    handleRefresh: () => void;
    handlePass: (voucherNo: string) => Promise<void>;
    handleDelete: (voucherNo: string) => Promise<void>;
    handleExport: () => void;
    handleExit: () => void;
}
