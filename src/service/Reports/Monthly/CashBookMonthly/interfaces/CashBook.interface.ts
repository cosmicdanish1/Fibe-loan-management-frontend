export interface CashBookEntry {
  code: string;
  headName: string;
  receipt: number;
  payment: number;
}

export interface CashBookData {
  month: string;
  year: string;
  entries: CashBookEntry[];
}

export interface CashBookState extends CashBookData {
  isLoading: boolean;
  error: string | null;
}
