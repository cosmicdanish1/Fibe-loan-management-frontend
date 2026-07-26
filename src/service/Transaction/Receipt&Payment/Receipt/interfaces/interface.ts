export interface ReceiptRow {
  id: string;
  code: string;
  name: string;
  amount: string;
  rdSrNo: string;
}

export interface ReceiptData {
  receiptType: 'receipt' | 'general' | 'demand';
  memberNo: string;
  officeNo: string;
  month: string;
  year: string;
  rlnBal: number;
  rlnInt: number;
  elnBal: number;
  elnInt: number;
  flnBal: number;
  flnInt: number;
  bankBal: number;
  paymentMode: 'cash' | 'bank';
  actualAmount: number;
  chequeDetails: {
    date: string;
    chequeNo: string;
    bank: string;
    customerBankName: string;
  };
  items: ReceiptRow[];
  narration: string;
  totalAmount: number;
}

export interface ReceiptHookReturn {
  receiptData: ReceiptData;
  setReceiptData: React.Dispatch<React.SetStateAction<ReceiptData>>;
  handleAddRow: () => void;
  handleUpdateRow: (index: number, field: keyof ReceiptRow, value: string) => void;
  handleRemoveRow: (index: number) => void;
  handleSave: () => void;
  handleCancel: () => void;
  handleExit: () => void;
}
