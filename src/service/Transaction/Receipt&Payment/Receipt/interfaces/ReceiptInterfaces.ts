// interfaces/ReceiptInterfaces.ts

export interface ReceiptRow {
  id: string;
  code: string;
  accType: string;
  description: string;
  amount: string;
  rdSrNo: string;
}

export interface ReceiptData {
  memberNo: string;
  memberName: string;
  voucherNo: string;
  transDate: string;
  receiptType: 'receipt' | 'general' | 'demand';
  officeNo: string;
  month: string;
  year: string;
  // Loan balances (loaded from DB when member selected)
  rlnBal: number;
  rlnIntt: number;
  elnBal: number;
  elnIntt: number;
  flnBal: number;
  flnIntt: number;
  bankBal: number;
  modeOfPay: 'cash' | 'bank';
  bankCode: string;
  chequeDate: string;
  chequeNo: string;
  bankName: string;
  customerBankName: string;
  narration: string;
  rows: ReceiptRow[];
}

export interface ReceiptHookReturn {
  formData: ReceiptData;
  totalAmount: number;
  bankHeads: { code: string; name: string }[];
  lastSaved: { voucherNo: string; memberNo: string; memberName: string; total: number } | null;
  isLoadingMember: boolean;
  updateField: (field: keyof ReceiptData, value: any) => void;
  handleMemberSelect: (memberNo: string, memberData?: any) => void;
  addRow: () => void;
  updateRow: (id: string, field: keyof ReceiptRow, value: string) => void;
  removeRow: (id: string) => void;
  handleSave: () => void;
  handleCancel: () => void;
  handleExit: () => void;
  isLoading: boolean;
}
