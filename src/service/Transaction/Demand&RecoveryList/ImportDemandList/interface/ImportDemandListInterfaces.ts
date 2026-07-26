// interface/ImportDemandListInterfaces.ts

export interface DemandListItem {
    key: string;
    period: string;
    branch: string;
    memberNo: string;
    personalNo: string;
    memberName: string;
    totalAmount: number;
    rdAmount: number;
    regularLoanAmt: number;
    emergencyLoanAmt: number;
    loanInterest: number;
    frs1Amount: number;
    frs2Amount: number;
    status: 'Valid' | 'Error';
    remarks?: string;
}

export interface ImportConfig {
    divisionRO: string;
    branch: string;
    monthStr: string;
    yearStr: string;
}

export interface BranchOption {
    officeno: number;
    office_name: string;
    division?: string;
}

export interface ImportDemandListHookReturn {
    importConfig: ImportConfig;
    previewData: DemandListItem[];
    branches: BranchOption[];
    isImporting: boolean;
    isSaving: boolean;
    recordCount: number;
    updateConfig: (field: keyof ImportConfig, value: any) => void;
    handleImport: () => void;
    handleSave: () => void;
    handleClear: () => void;
    handleExit: () => void;
}
