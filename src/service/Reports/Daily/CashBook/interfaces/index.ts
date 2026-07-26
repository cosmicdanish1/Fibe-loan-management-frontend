export interface CashBookProps {
  // Add any props if needed in the future
}

export interface CashBookState {
  finYear: string;
  date: string;
  outputType: 'screen' | 'printer';
}

export interface UseCashBookReturnType {
  finYear: string;
  setFinYear: (year: string) => void;
  date: string;
  setDate: (date: string) => void;
  outputType: 'screen' | 'printer';
  setOutputType: (type: 'screen' | 'printer') => void;
}
