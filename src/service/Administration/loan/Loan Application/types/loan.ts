import type { NomineeDetail } from './nominee';
import type { EmployeeDetail } from './employee';
import type { LoanAgainstDeposit } from './fdr';

export interface LoanDetails {
  applDate: string;
  memberNo: string;
  loanType: string;
  loanCaseNo: string;
  loanAmount: string;
  formNumber: string;
  reason: string;
  surety1: string;
  surety1Name?: string;
  surety2: string;
  surety2Name?: string;
}

export interface LoanApplicationState {
  activeTab: 'loan-details' | 'nominee-details' | 'loan-against-deposit';
  loanDetails: LoanDetails;
  nomineeDetails: NomineeDetail[];
  employeeDetails: EmployeeDetail[];
  loanAgainstDeposit: LoanAgainstDeposit;
}

export interface TableColumn<T> {
  key: keyof T;
  header: string;
  type: 'text' | 'number' | 'date' | 'checkbox' | 'select';
  width?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
}

export interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'number' | 'date' | 'select' | 'textarea';
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onClick?: (e: React.MouseEvent<HTMLInputElement>) => void;
  required?: boolean;
  options?: { value: string; label: string }[];
  className?: string;
  placeholder?: string;
  readOnly?: boolean;
  maxLength?: number;
}

export interface DataTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  onDataChange: (data: T[]) => void;
  className?: string;
  showAddButton?: boolean;
}
