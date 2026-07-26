// interface/GenerateInterfaces.ts

export interface DemandGenerationData {
    month: string;
    year: string;
    divisionRO: string;
    from: string;
    to: string;
}

export interface GenerateHookReturn {
    formData: DemandGenerationData;
    updateField: (field: keyof DemandGenerationData, value: string) => void;
    resetForm: () => void;
    generateDemand: () => void;
    handleExit: () => void;
}
