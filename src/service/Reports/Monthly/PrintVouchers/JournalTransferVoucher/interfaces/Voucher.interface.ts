export interface VoucherEntry {
  id: string;
  srNo: number;
  mbNo: string;
  name: string;
  code: string;
  debit: number;
  credit: number;
}

export interface VoucherState {
  date: string;
  voucherNo: string;
  narration: string;
  chequeNo: string;
  entries: VoucherEntry[];
  isLoading: boolean;
  error: string | null;
}
