export interface VoucherEntry {
  id: string;
  srNo: number;
  head: string;
  description: string;
  payment: number;
  receipt: number;
}

export interface VoucherState {
  date: string;
  voucherNo: string;
  vchrType: string;
  memberNo: string;
  mode: string;
  narration: string;
  chequeNo: string;
  bank: string;
  chequeDate: string;
  totalAmount: string;
  entries: VoucherEntry[];
  isLoading: boolean;
  error: string | null;
}
