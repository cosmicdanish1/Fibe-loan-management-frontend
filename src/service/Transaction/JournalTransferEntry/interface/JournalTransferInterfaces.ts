export interface JournalEntry {
    key: string;
    mbno: string;
    name: string;
    code: string;
    accountName: string;
    debit: number | string;
    credit: number | string;
    rdSdSrNo: string;
    narration?: string;
}

export interface VoucherOption {
    voucherNo: string;
    memberNo: string;
    memberName: string;
    amount: number;
    type: string;
}

export interface JournalTransferData {
    voucherNo: string;
    transferType: 'headToHead' | 'memberToMember';
    narration: string;
    chequeNo: string;
}

export interface JournalTransferHookReturn {
    formData: JournalTransferData;
    totalDebit: number;
    totalCredit: number;
    data: JournalEntry[];
    isLoading: boolean;
    voucherList: VoucherOption[];
    headList: { code: string; name: string }[];
    memberList: { mbno: string; name: string }[];
    updateField: (field: keyof JournalTransferData, value: any) => void;
    updateRow: (key: string, field: keyof JournalEntry, value: any) => void;
    addRow: () => void;
    removeRow: (key: string) => void;
    handleVoucherSelect: (voucherNo: string) => void;
    handleSave: () => void;
    handleReset: () => void;
    handleExit: () => void;
}
