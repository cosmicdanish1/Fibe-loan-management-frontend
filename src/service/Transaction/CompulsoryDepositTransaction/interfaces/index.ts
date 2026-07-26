export interface IncomeHead {
  code: string;
  label: string;
  description: string;
}

export interface CompulsoryDepositState {
  amount: string;
  selectedIncomeHead: IncomeHead | null;
  isDropdownOpen: boolean;
}

export interface UseCompulsoryDepositHook {
  state: CompulsoryDepositState;
  actions: {
    setAmount: (amount: string) => void;
    setSelectedIncomeHead: (head: IncomeHead | null) => void;
    toggleDropdown: () => void;
    closeDropdown: () => void;
    resetForm: () => void;
  };
  incomeHeads: IncomeHead[];
}
