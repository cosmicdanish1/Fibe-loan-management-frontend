// types.ts
export interface LoanDetails {
    applDate: string;
    memberNo: string;
    loanType: string;
    loanCaseNo: string;
    loanAmount: string;
    formNumber: string;
    reason: string;
  }
  
  export interface NomineeDetail {
    id: number;
    name: string;
    address: string;
    age: string;
    relation: string;
  }
  
  export interface EmployeeDetail {
    id: number;
    mbNo: string;
    name: string;
    netSalary: string;
    dateOfRetire: string;
    officeName: string;
    address: string;
  }
  
  export interface FDRDetail {
    id: number;
    lien: boolean;
    fdrNo: string;
    accountNo: string;
    depDate: string;
    period: string;
    unit: string;
    rate: string;
    amount: string;
    matAmount: string;
  }
  
  export interface LoanAgainstDeposit {
    isEnabled: boolean;
    fdrDetails: FDRDetail[];
  }
  
  export interface LoanApplicationState {
    activeTab: 'loan-details' | 'nominee-details' | 'loan-against-deposit';
    loanDetails: LoanDetails;
    nomineeDetails: NomineeDetail[];
    employeeDetails: EmployeeDetail[];
    loanAgainstDeposit: LoanAgainstDeposit;
  }
  
  export interface TableColumn<T = any> {
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
    required?: boolean;
    options?: { value: string; label: string }[];
    className?: string;
  }
  
  export interface DataTableProps<T> {
    data: T[];
    columns: TableColumn<T>[];
    onDataChange: (data: T[]) => void;
    className?: string;
    showAddButton?: boolean;
  }
