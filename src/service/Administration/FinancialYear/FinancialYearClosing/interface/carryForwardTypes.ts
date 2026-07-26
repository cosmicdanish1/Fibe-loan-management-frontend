// types/carryForwardTypes.ts
export interface CarryForwardBalancesState {
    startDate: string;
    endDate: string;
    isProcessing: boolean;
    isWindowOpen: boolean;
  }
  
  export interface DateRange {
    startDate: string;
    endDate: string;
  }
  
  export interface CarryForwardProps {
    isOpen?: boolean;
    onClose?: () => void;
    onProcess?: (dateRange: DateRange) => void;
    initialStartDate?: string;
    initialEndDate?: string;
  }
