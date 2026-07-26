export interface LoanType {
  id: string;
  name: string;
}

export interface FormData {
  loanType: string;
  memberNumber: string;
  memberName: string;
  office: string;
  loanCaseNo: string;
  sanctionDate: string;
  sanctionAmount: string;
  surety1: string;
  surety1Name: string;
  surety2: string;
  surety2Name: string;
}

export interface FormFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  type?: 'text' | 'date' | 'number';
  required?: boolean;
  placeholder?: string;
  hasLookup?: boolean;
  onLookup?: () => void;
  error?: string;
}

export interface SelectFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  options: LoanType[];
  required?: boolean;
  error?: string;
}
