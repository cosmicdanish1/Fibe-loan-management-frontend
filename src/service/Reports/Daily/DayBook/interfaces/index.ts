export interface DayBookEntry {
  mbNo: string;
  name: string;
  voucher: string;
  amount: string;
  user: string;
}

export interface DayBookProps {
  date?: Date;
  onPrint?: () => void;
  onScreenView?: () => void;
}

export interface UseDayBookReturnType {
  entries: DayBookEntry[];
  addEntry: (entry: DayBookEntry) => void;
  clearEntries: () => void;
}
