export interface LoanFormData {
  accountType: string;
  fromDate: string;
  toDate: string;
  outputType: 'screen' | 'printer';
}

export interface UseLoanFormHook {
  formData: LoanFormData;
  updateFormData: (field: keyof LoanFormData, value: string) => void;
  generateReport: () => void;
  resetForm: () => void;
}
