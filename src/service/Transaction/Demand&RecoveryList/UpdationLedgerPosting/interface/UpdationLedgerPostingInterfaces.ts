// interface/UpdationLedgerPostingInterfaces.ts

export interface MemberDemandHead {
    code: string;
    headName: string;
    balance: number;
    demandSend: number;
    demandReceived: number;
    shortRecovery: number;
}

export interface MemberDemandGroup {
    memberNo: string;
    memberName: string;
    heads: MemberDemandHead[];
    totalSend: number;
    totalReceived: number;
    totalShort: number;
}

export interface PostingFormData {
    month: string;
    year: string;
    branch: string;
    fromMember: string;
    toMember: string;
    modeOfReceipt: 'CASH' | 'BANK' | 'OTHER';
    totalOfficeAmount: string;
}

export interface BranchOption {
    officeno: number;
    office_name: string;
    division?: string;
}

export interface UpdationLedgerPostingHookReturn {
    formData: PostingFormData;
    memberGroups: MemberDemandGroup[];
    branches: BranchOption[];
    isLoading: boolean;
    isPosting: boolean;
    grandTotalSend: number;
    grandTotalReceived: number;
    grandTotalShort: number;
    updateField: (field: keyof PostingFormData, value: any) => void;
    handleLoad: () => void;
    handlePosting: () => void;
    handleReset: () => void;
    handleExit: () => void;
}
