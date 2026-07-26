// interface/CompulsoryDepositInterfaces.ts

export interface CDMember {
    memberNo: number;
    memberName: string;
    currentBalance: number;
    postAmount: number | string; // amount to be credited
}

export interface IncomeHead {
    code: string;
    name: string;
}

export interface DepositTransaction {
    amount: string; // total total amount to distribute
    incomeHead: string;
    narration: string;
}

export interface CompulsoryDepositHookReturn {
    formData: DepositTransaction;
    members: CDMember[];
    incomeHeads: IncomeHead[];
    isLoading: boolean;
    isPosting: boolean;
    updateField: (field: keyof DepositTransaction, value: string) => void;
    updateMemberAmount: (memberNo: number, amount: string) => void;
    handleSave: () => void;
    handleReset: () => void;
    handleExit: () => void;
    distributeEqually: () => void;
}
