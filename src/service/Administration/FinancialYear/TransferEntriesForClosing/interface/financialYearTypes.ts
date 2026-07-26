// types/financialYearTypes.ts
export interface FinancialYearDialogState {
    isOpen: boolean;
    code: string;
    isLoading: boolean;
  }
  
  export interface FinancialYearDialogProps {
    isOpen?: boolean;
    onClose?: () => void;
    onSubmit?: (code: string) => void;
    onCancel?: () => void;
  }
