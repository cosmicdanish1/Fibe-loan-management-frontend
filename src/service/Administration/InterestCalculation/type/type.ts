// types.ts
export interface CalculationData {
    selectedAccount: string;
    fromDate: string;
    toDate: string;
    rate: string;
    minInterestAmount: string;
    total: number;
    postDate: string;
    postAmount: number;
    errors?: {
      selectedAccount?: string;
      fromDate?: string;
      toDate?: string;
      rate?: string;
      minInterestAmount?: string;
      postDate?: string;
    };
  }
  
  export interface DropdownOption {
    value: string;
    label: string;
  }
  
  export interface ValidationErrors {
    selectedAccount?: string;
    fromDate?: string;
    toDate?: string;
    rate?: string;
    minInterestAmount?: string;
    postDate?: string;
  }
  
  export interface CalculationResult {
    total: number;
    postAmount: number;
    transactions: Transaction[];
  }
  
  export interface Transaction {
    id: string;
    date: string;
    description: string;
    amount: number;
    balance: number;
    interestEarned: number;
  }
  
  export interface FormConfig {
    dateFormat: string;
    currency: string;
    defaultRate: number;
    minInterestThreshold: number;
  }
  
  export type FormField = keyof CalculationData;
  export type ValidationResult = {
    isValid: boolean;
    errors: ValidationErrors;
  };
