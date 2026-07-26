export interface BankTransaction {
  id: string;
  date: Date;
  voucherNo: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  isOpening?: boolean;
  referenceNo?: string;
  chequeNo?: string;
}

export interface BankDetailLedgerState {
  bankName: string;
  accountNo: string;
  fromDate: Date;
  toDate: Date;
  transactions: BankTransaction[];
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

export interface BankAccountInfo {
  bankName: string;
  accountNo: string;
  ifscCode: string;
  branch: string;
}
