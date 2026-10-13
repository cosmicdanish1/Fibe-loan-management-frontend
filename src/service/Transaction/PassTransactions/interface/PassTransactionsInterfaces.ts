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
    /** 'REAGREEMENT' for a loan re-agreement voucher (a receipt of NR interest + penalty, no payout). */
    kind?: 'VOUCHER' | 'REAGREEMENT';
    /** Full re-agreement summary (old vs new terms, amounts) when kind is REAGREEMENT. */
    reagreement?: any;
}

export interface PassTransactionsHookReturn {
    transactionData: TransactionEntry[];
    isLoading: boolean;
    /** Voucher numbers with a Pass/Reject request currently in flight (their buttons are disabled). */
    busyVouchers: string[];
    handleRefresh: () => void;
    handlePass: (voucherNo: string) => Promise<void>;
    handleDelete: (voucherNo: string) => Promise<void>;
    handleExport: () => void;
    handleExit: () => void;
    /** Set after a re-agreement is passed, so the screen can show the result and the saved agreement. */
    reagreementResult: any | null;
    clearReagreementResult: () => void;
}
