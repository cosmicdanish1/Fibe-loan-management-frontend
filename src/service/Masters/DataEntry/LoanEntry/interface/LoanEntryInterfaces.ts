// interface/LoanEntryInterfaces.ts

export interface LoanEligibilityStatus {
  isEligible: boolean;
  loanAmount: number;
  requiredShare: number;
  currentShare: number;
  additionalShareRequired: number;
  requiredFd: number;
  currentFd: number;
  additionalFdRequired: number;
  message?: string;
}

export interface LoanEntryData {
  memberNo: string;
  memberName: string;
  loanType: string;       // ALN, RLN, ELN
  loanAmount: string;
  rate: string;
  noOfInstal: string;
  instalAmt: string;
  paymentDate: string;
  purpose: string;
  penalRate: string;
  g1MbNo: string;         // Guarantor 1 member no
  g1Name: string;
  g2MbNo: string;         // Guarantor 2 member no
  g2Name: string;
}

export interface LoanEntryHookReturn {
  formData: LoanEntryData;
  updateField: (field: keyof LoanEntryData, value: any) => void;
  handleMemberSelect: (memberNo: string, memberData?: any) => void;
  handleG1Select: (memberNo: string, memberData?: any) => void;
  handleG2Select: (memberNo: string, memberData?: any) => void;
  handleSave: () => void;
  handleClear: () => void;
  handleExit: () => void;
  isLoading: boolean;
  eligibilityStatus: LoanEligibilityStatus | null;
  isCheckingEligibility: boolean;
}
