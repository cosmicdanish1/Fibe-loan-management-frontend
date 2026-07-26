// types/dayend.ts

export interface DayendData {
    date: string;
    openingBalance: number;
    totalCredit: number;
    totalDebit: number;
    closingBalance: number;
    paymentVouchers?: number;
    receiptVouchers?: number;
    journalVouchers?: number;
    dayendFlag?: string;
  }
  
  export interface DayendDisplayProps {
    label: string;
    value: string | number;
    isAmount?: boolean;
    isDate?: boolean;
    className?: string;
  }
  
  export interface DayendSummaryProps {
    data: DayendData;
    isProcessing?: boolean;
    onProcess?: () => void;
    onRefresh?: () => void;
    className?: string;
  }
  
  export interface UseDayendReturn {
    dayendData: DayendData;
    isProcessing: boolean;
    isLoading: boolean;
    error: string | null;
    processDayend: () => Promise<void>;
    refreshData: () => Promise<void>;
    formatAmount: (amount: number) => string;
    formatDate: (date: string) => string;
  }
