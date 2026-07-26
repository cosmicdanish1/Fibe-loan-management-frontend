// interface/PrintMembersDemandListInterfaces.ts

export interface DemandPrintFormData {
    division: string;
    branch: string;
    month: string;
    year: string;
    sortBy: string;
    outputType: 'Screen' | 'Printer';
    printBalance: boolean;
    printEmpNo: boolean;
    printPrevBalance: boolean;
}

export interface PrintMembersDemandListHookReturn {
    formData: DemandPrintFormData;
    updateField: (field: keyof DemandPrintFormData, value: any) => void;
    handlePrint: () => void;
    handleExport: () => void;
    handleReset: () => void;
    handleExit: () => void;
}
