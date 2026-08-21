// interface/ModifyShortRecoveryInterfaces.ts

export interface ShortRecoveryRecord {
    id: string;
    memberNo: string;
    memberName: string;
    recoveryType: 'Principal' | 'Interest' | 'Installment';
    expectedAmount: number;
    recoveredAmount: number;
    shortfallAmount: number;
    status: 'Pending' | 'Adjusted';
}

export interface ModifyShortRecoveryFormData {
    wing: string;
    month: string;
    year: string;
    selectedMemberId: string;
    adjustmentReason: string;
}

export interface WingOption {
    id: string;
    name: string;
}

export interface ModifyShortRecoveryHookReturn {
    formData: ModifyShortRecoveryFormData;
    updateField: (field: keyof ModifyShortRecoveryFormData, value: any) => void;
    shortRecoveryList: ShortRecoveryRecord[];
    selectedRecord: ShortRecoveryRecord | null;
    handleSelectRecord: (record: ShortRecoveryRecord) => void;
    handleSaveAdjustment: () => void;
    handleRefresh: () => void;
    handleExit: () => void;
    wings: WingOption[];
}
