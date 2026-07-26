export interface InterestCalculationData {
  calcInterestFor: string;
  accountType: 'SB' | 'RD' | 'FD';
  fromDate: string;
  toDate: string;
  memberNo: string;
  memberName?: string;
  interestRate?: number;
}

export interface MemberRecord {
  srNo: number;
  mbNo: string;
  name: string;
  openBal: number;
  debit: number;
  credit: number;
  balance: number;
  interest: number;
  avgBalance?: number;
  days?: number;
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
  className?: string;
}

export interface SelectFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  options: { id: string; name: string }[];
  required?: boolean;
  className?: string;
}

export interface DataTableProps {
  data: MemberRecord[];
  onDataChange?: (data: MemberRecord[]) => void;
}
