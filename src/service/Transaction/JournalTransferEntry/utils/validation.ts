import type { JournalEntryFormData, JournalEntryRow } from '../types/journalEntry.types';

export const validateJournalEntryForm = (formData: JournalEntryFormData) => {
  const errors: Record<string, string> = {};

  if (!formData.voucherNo.trim()) {
    errors.voucherNo = 'Voucher number is required';
  }

  if (formData.rows.length === 0) {
    errors.rows = 'At least one entry is required';
  } else {
    // Validate each row
    formData.rows.forEach((row, index) => {
      if (!row.mbNo.trim()) {
        errors[`row-${index}-mbNo`] = 'Member number is required';
      }
      if (!row.code.trim()) {
        errors[`row-${index}-code`] = 'Account code is required';
      }
      if (row.debit < 0 || row.credit < 0) {
        errors[`row-${index}-amount`] = 'Amount cannot be negative';
      }
    });

    // Validate debit-credit balance
    const totalDebit = formData.rows.reduce((sum, row) => sum + row.debit, 0);
    const totalCredit = formData.rows.reduce((sum, row) => sum + row.credit, 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) { // Allow for floating point precision
      errors.balance = 'Total debit and credit must be equal';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const generateEmptyRow = (): JournalEntryRow => ({
  id: crypto.randomUUID(),
  mbNo: '',
  name: '',
  code: '',
  accountName: '',
  debit: 0,
  credit: 0,
  rdSdSr: ''
});
