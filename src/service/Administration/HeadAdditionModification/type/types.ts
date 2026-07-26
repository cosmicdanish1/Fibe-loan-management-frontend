// types.ts
export interface AccountEntry {
    code: string;
    headName: string;
    opening: number;
    debit: number;
    credit: number;
    balance: number;
  }
  
  export interface CompanyInfo {
    name: string;
    address: string;
    sector: string;
    postOffice: string;
    district: string;
    pincode: string;
  }
  
  export interface AccountState {
    entries: AccountEntry[];
    selectedEntry: AccountEntry | null;
    isLoading: boolean;
    error: string | null;
  }
  
  export interface AccountActions {
    addEntry: (entry: AccountEntry) => void;
    deleteEntry: (index: number) => void;
    modifyEntry: (index: number, updatedEntry: AccountEntry) => void;
    selectEntry: (entry: AccountEntry | null) => void;
    clearEntries: () => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
  }
