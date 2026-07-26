export type TransferType = 'headToHead' | 'memberToMember';

export interface JournalEntryRow {
  id: string;
  mbNo: string;
  name: string;
  code: string;
  accountName: string;
  debit: number;
  credit: number;
  rdSdSr: string;
}

export interface JournalEntryFormData {
  voucherNo: string;
  transferType: TransferType;
  narration: string;
  chequeNo: string;
  rows: JournalEntryRow[];
}

export interface FormErrors {
  voucherNo?: string;
  narration?: string;
  rows?: string;
  [key: string]: string | undefined;
}

export interface UseJournalEntryReturn {
  formData: JournalEntryFormData;
  errors: FormErrors;
  updateField: <K extends keyof JournalEntryFormData>(
    field: K,
    value: JournalEntryFormData[K]
  ) => void;
  updateRow: (id: string, field: keyof JournalEntryRow, value: any) => void;
  addRow: () => void;
  removeRow: (id: string) => void;
  validateForm: () => boolean;
  resetForm: () => void;
  handleSubmit: () => void;
}
