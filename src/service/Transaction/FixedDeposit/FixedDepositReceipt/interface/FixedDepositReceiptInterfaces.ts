// interface/FixedDepositReceiptInterfaces.ts

export interface NomineeEntry {
    key: string;
    name: string;
    address: string;
    age: number;
    relation: string;
}

export interface FixedDepositData {
    memberNo: string;
    referenceMemberNo: string;
    prefix: string;
    firstName: string;
    middleName: string;
    lastName: string;
    fdHeadName: string;
    fdHeadCode: string;   // BUG FIX: actual head code (e.g. 'A003') separate from display name
    isModify: boolean;
    isAdjustment: boolean;
    isRenewal: boolean;
    certificateNo: string;
    rate: string;
    depositPeriod: string;
    intCalculationMethod: string;
    depositAmount: string;
    maturityAmount: string;
    depositDate: any; // Using any for dayjs object to match state
    depositUnit: string;
    maturityDate: any; // Using any for dayjs object to match state
    modeOfPayment: string;
    intAmount: string;
    paymentMode: string;
    chequeDate: any; // Using any for dayjs object to match state
    chequeNo: string;
    bankName: string;
    bankCode: string;
    customerBankName: string;
}

export interface FixedDepositHookReturn {
    formData: FixedDepositData;
    nomineeData: NomineeEntry[];
    addNominee: () => void;
    updateNominee: (key: string, field: keyof NomineeEntry, value: any) => void;
    removeNominee: (key: string) => void;
    bankBalance: number;
    isLoading: boolean;
    showLookupModal: boolean;
    setShowLookupModal: (show: boolean) => void;
    updateField: (field: keyof FixedDepositData, value: any) => void;
    handleSave: () => Promise<{ certificateNo: string; memberNo: string; amount: number } | null>;
    handlePrint: () => void;
    handleReset: () => void;
    handleExit: () => void;
}
