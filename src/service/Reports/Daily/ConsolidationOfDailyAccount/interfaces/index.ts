export interface ConsolidationProps {}

export interface ConsolidationState {
  date: string;
  outputType: 'screen' | 'printer';
}

export interface UseConsolidationReturnType {
  date: string;
  setDate: (date: string) => void;
  outputType: 'screen' | 'printer';
  setOutputType: (type: 'screen' | 'printer') => void;
}
