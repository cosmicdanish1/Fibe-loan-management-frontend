// interfaces/interface.ts

export interface SavingNominee {
    id: number;
    name: string;
    address: string;
    age: string;
    relation: string;
}

export interface SavingAccountData {
    memberNo: string;
    accountNo: string;
    prefix: string;
    firstName: string;
    middleName: string;
    lastName: string;
    openingDate: string;
    openingBalance: string;
    ledgerGroup: string;
    specialInstructions: string;
    nominees: SavingNominee[];
}

export interface SavingAccountHookReturn {
    data: SavingAccountData;
    updateField: (field: keyof SavingAccountData, value: any) => void;
    addNominee: () => void;
    removeNominee: (id: number) => void;
    updateNominee: (id: number, field: keyof SavingNominee, value: string) => void;
    save: () => void;
    reset: () => void;
}
