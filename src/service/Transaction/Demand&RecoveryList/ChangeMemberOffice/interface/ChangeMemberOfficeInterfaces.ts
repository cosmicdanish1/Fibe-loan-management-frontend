// interface/ChangeMemberOfficeInterfaces.ts

export interface ChangeMemberOfficeFormData {
    month: string;
    year: string;
    memberNo: string;
    currentBranchNo: string;
    newBranchNo: string;
}

export interface OfficeOption {
    officeId: string;
    officeName: string;
}

export interface ChangeMemberOfficeHookReturn {
    formData: ChangeMemberOfficeFormData;
    updateField: (field: keyof ChangeMemberOfficeFormData, value: any) => void;
    handleTransfer: () => void;
    handleCancel: () => void;
    handleExit: () => void;
    isProcessing: boolean;
    offices: OfficeOption[];
}
