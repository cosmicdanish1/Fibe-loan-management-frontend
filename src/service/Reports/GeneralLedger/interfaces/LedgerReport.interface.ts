export interface LedgerReportState {
  headName: string;
  memberNumber: string;
  fromDate: string;
  toDate: string;
  outputType: 'screen' | 'printer';
  isLoading: boolean;
  error: string | null;
  ledgerData: any[]; // Replace 'any' with proper type for ledger data
}

export interface LedgerEntry {
  id: string;
  date: string;
  particulars: string;
  voucherNo: string;
  debit: number;
  credit: number;
  balance: number;
}
