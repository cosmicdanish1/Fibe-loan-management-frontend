export interface LedgerEntry {
  id: string;
  date: Date;
  voucherNo: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  isOpening?: boolean;
}

export interface LedgerState {
  headName: string;
  fromDate: Date;
  toDate: Date;
  entries: LedgerEntry[];
  isLoading: boolean;
  error: string | null;
  openingBalance: number;
  closingBalance: number;
}

export type DateFormat = 'DD-MMM-YYYY' | 'YYYY-MM-DD';

export interface DateRange {
  fromDate: Date;
  toDate: Date;
}
