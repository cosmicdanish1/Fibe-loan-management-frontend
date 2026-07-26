export interface LedgerRecord {
  id: string;
  headName: string;
  balance: string;
  demandSend: string;
  demandReceived: string;
  shortRecovery: string;
}

export interface PassingLedgerData {
  month: string;
  year: string;
  branch: string;
  fromMember: string;
  toMember: string;
  modeOfReceipt: 'CASH' | 'BANK' | 'OTHER';
  totalOfficeAmount: string;
  head: string;
}

export interface PassingLedgerState {
  formData: PassingLedgerData;
  records: LedgerRecord[];
  dropdowns: {
    month: boolean;
    year: boolean;
    branch: boolean;
    head: boolean;
  };
  selectedRecords: Set<string>;
}

export interface UsePassingLedgerHook {
  state: PassingLedgerState;
  actions: {
    updateField: (field: keyof PassingLedgerData, value: string) => void;
    setModeOfReceipt: (mode: 'CASH' | 'BANK' | 'OTHER') => void;
    toggleDropdown: (dropdown: keyof PassingLedgerState['dropdowns']) => void;
    closeDropdown: (dropdown: keyof PassingLedgerState['dropdowns']) => void;
    closeAllDropdowns: () => void;
    updateRecord: (id: string, field: keyof LedgerRecord, value: string) => void;
    selectRecord: (id: string) => void;
    findMember: () => void;
    resetForm: () => void;
    processPosting: () => void;
  };
  options: {
    months: string[];
    years: string[];
    branches: string[];
    heads: string[];
  };
}
