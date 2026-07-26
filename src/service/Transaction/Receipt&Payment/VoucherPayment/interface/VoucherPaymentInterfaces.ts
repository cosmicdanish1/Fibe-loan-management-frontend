// interface/VoucherPaymentInterfaces.ts

export interface ReceiptRow {
  id: string;
  code: string;
  accType: string;
  description: string;
  amount: string;
}

export interface VoucherPaymentData {
  memberNo: string;
  memberName: string;
  voucherNo: string;
  transDate: string;
  paymentType: 'payment' | 'general';
  subDivision: string;
  modeOfPay: 'cash' | 'bank';
  chequeDate: string;
  chequeNo: string;
  bankName: string;
  receiveIntoCode: string; // ledger account debited (cash A1001 or chosen bank account)
  narration: string;
  rows: ReceiptRow[];
}

export interface VoucherPaymentHookReturn {
  formData: VoucherPaymentData;
  totalAmount: number;
  bankAccounts: { code: string; name: string }[];
  accountBalance: number;
  lastSaved: { voucherNo: string; memberNo: string; memberName: string; total: number } | null;
  updateField: (field: keyof VoucherPaymentData, value: any) => void;
  handleMemberSelect: (memberNo: string, memberData?: any) => void;
  addRow: () => void;
  updateRow: (id: string, field: keyof ReceiptRow, value: string) => void;
  removeRow: (id: string) => void;
  handleSave: () => void;
  handleClear: () => void;
  handleExit: () => void;
  isLoading: boolean;
}
