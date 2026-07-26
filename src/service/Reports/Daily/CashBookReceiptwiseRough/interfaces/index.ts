export interface CashBookProps {
  // Add any props if needed in the future
}

export interface CashBookState {
  date: string;
  outputType: 'screen' | 'printer';
}

export interface UseCashBookReturnType {
  date: string;
  setDate: (date: string) => void;
  outputType: 'screen' | 'printer';
  setOutputType: (type: 'screen' | 'printer') => void;
}
