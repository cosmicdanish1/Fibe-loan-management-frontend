// interface/PaymentVoucherInterfaces.ts

export interface RowData {
  id: string;
  code: string;
  name: string;
  amount: string;
  rdSrNo: string;
}

export interface PaymentVoucherData {
  voucherNo: string;
  transDate: string;
  paymentType: 'payment' | 'general';
  memberNo: string;
  memberName: string;
  officeNo: string;
  narration: string;
  payFromCode: string; // ledger account credited (cash A1001 or a bank account)
}

export interface PaymentVoucherHookReturn {
  formData: PaymentVoucherData;
  rows: RowData[];
  totalAmount: number;
  payFromAccounts: { code: string; name: string }[];
  lastSaved: { voucherNo: string; memberNo: string; memberName: string; total: number; transDate: string } | null;
  updateField: (field: keyof PaymentVoucherData, value: any) => void;
  handleMemberSelect: (memberNo: string, memberData?: any) => void;
  addRow: () => void;
  updateRow: (id: string, field: keyof RowData, value: string) => void;
  removeRow: (id: string) => void;
  handleSave: () => void;
  handleClear: () => void;
  handleExit: () => void;
  isLoading: boolean;
}
