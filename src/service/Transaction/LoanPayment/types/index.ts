// Types for Member
export interface Member {
  memberNo: string;
  name: string;
  sanctionAmount: number;
  officeNo: string;
  subDivision: string;
}

// Types for Head
export interface Head {
  hCode: string;
  hName: string;
}

// Types for Payment Entry
export interface PaymentEntry {
  srNo: number;
  code: string;
  name: string;
  rpType: 'R' | 'P';
  amount: number;
}

// Types for Cheque Details
export interface ChequeDetails {
  date: string;
  chequeNo: string;
  bank: string;
}

// Main Loan Payment State
export interface LoanPaymentState {
  loanType: string;
  loanCaseNo: string;
  noOfInst: number;
  instAmount: number;
  sanctionLoanAmount: number;
  member: Member | null;
  head: Head | null;
  paymentMode: 'CASH' | 'BANK';
  actualAmount: number;
  bankBal: number;
  chequeDetails: ChequeDetails;
  paymentEntries: PaymentEntry[];
  narration: string;
  totalReceipt: number;
  totalPayment: number;
}

// Props for the LoanPayment component
export interface LoanPaymentProps {
  initialData?: Partial<LoanPaymentState>;
  onSave?: (data: LoanPaymentState) => void;
  onCancel?: () => void;
}
