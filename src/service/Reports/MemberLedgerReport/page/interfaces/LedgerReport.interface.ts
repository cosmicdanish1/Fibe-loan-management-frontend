export interface LedgerReportProps {
  // Add any props if needed in the future
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

export interface LedgerReportState {
  headName?: string;
  memberNumber?: string;
  fromDate?: string;
  toDate?: string;
  outputType?: 'screen' | 'printer';
  isLoading?: boolean;
  error?: string | null;
  ledgerData?: LedgerEntry[];
}
