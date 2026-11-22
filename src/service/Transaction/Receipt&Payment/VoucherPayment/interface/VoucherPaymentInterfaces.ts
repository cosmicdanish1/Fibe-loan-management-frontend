// interface/VoucherPaymentInterfaces.ts
// Voucher Payment = the cashier's step for payment vouchers: pick a voucher created in Voucher Creation, choose
// cash or bank, and sign. A signed voucher is then passed in Pass Transactions.

export interface UnsignedVoucher {
  voucherNo: string;
  voucherDate: string;
  total: number;
  memberNo: string | number | null;
  memberName: string;
}

export interface VoucherRow {
  code: string;
  name: string;
  amount: number;
  rdSrNo: string;
}

export interface VoucherDetail {
  voucherNo: string;
  voucherDate: string;
  total: number;
  memberNo: string;
  memberName: string;
  officeNo: string | number;
  isGeneral: boolean;
  narration: string;
  rows: VoucherRow[];
}

export interface SignForm {
  modeOfPay: 'cash' | 'bank';
  bankCode: string;     // our bank account the money goes out of (bank mode)
  chequeDate: string;
  chequeNo: string;
  bankName: string;     // customer's bank name
}

export interface VoucherPaymentHookReturn {
  vouchers: UnsignedVoucher[];
  isLoadingList: boolean;
  selectedNo: string;
  detail: VoucherDetail | null;
  isLoadingDetail: boolean;
  /** the member's signature from the member master: image URL, or why there is none */
  signature: { state: 'none' | 'loading' | 'ready' | 'missing'; url: string };
  form: SignForm;
  bankAccounts: { code: string; name: string }[];
  accountBalance: number;
  isSigning: boolean;
  updateForm: (field: keyof SignForm, value: string) => void;
  selectVoucher: (voucherNo: string) => void;
  handleSave: () => void;
  /** Sign (as in the legacy window): shows the member's signature for checking, nothing more */
  signatureOpen: boolean;
  openSignature: () => void;
  closeSignature: () => void;
  handleDelete: () => void;
  handleRefresh: () => void;
  handleClear: () => void;
  handleExit: () => void;
}
