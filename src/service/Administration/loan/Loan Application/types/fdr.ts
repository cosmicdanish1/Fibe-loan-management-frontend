export interface FDRDetail {
  id: number;
  srno: string;
  lien: boolean;
  fdrNo: string;
  accountNo: string;
  depDate: string;
  period: string;
  unit: string;
  rate: string;
  amount: string;
  matAmount: string;
  matDate: string;
  lastIntt: string;
  inttPaid: string;
}

export interface LoanAgainstDeposit {
  isEnabled: boolean;
  fdrDetails: FDRDetail[];
}
