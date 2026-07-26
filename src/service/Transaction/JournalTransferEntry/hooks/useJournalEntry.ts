import { useState, useCallback } from 'react';
import { validateJournalEntryForm, generateEmptyRow } from '../utils/validation';
import type { 
  JournalEntryFormData, 
  UseJournalEntryReturn,
  TransferType,
  JournalEntryRow
} from '../types/journalEntry.types';

const initialFormData: JournalEntryFormData = {
  voucherNo: '',
  transferType: 'headToHead',
  narration: '',
  chequeNo: '',
  rows: [generateEmptyRow()]
};

export const useJournalEntry = (): UseJournalEntryReturn => {
  const [formData, setFormData] = useState<JournalEntryFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = useCallback(<K extends keyof JournalEntryFormData>(
    field: K,
    value: JournalEntryFormData[K]
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const updateRow = useCallback((id: string, field: keyof JournalEntryRow, value: any) => {
    setFormData(prev => ({
      ...prev,
      rows: prev.rows.map(row => 
        row.id === id ? { ...row, [field]: value } : row
      )
    }));
  }, []);

  const addRow = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      rows: [...prev.rows, generateEmptyRow()]
    }));
  }, []);

  const removeRow = useCallback((id: string) => {
    setFormData(prev => ({
      ...prev,
      rows: prev.rows.filter(row => row.id !== id)
    }));
  }, []);

  const validateForm = useCallback(() => {
    const { isValid, errors: validationErrors } = validateJournalEntryForm(formData);
    setErrors(validationErrors);
    return isValid;
  }, [formData]);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setErrors({});
  }, []);

  const handleSubmit = useCallback(() => {
    if (validateForm()) {
      // TODO: Implement form submission
      console.log('Form submitted:', formData);
    }
  }, [formData, validateForm]);

  return {
    formData,
    errors,
    updateField,
    updateRow,
    addRow,
    removeRow,
    validateForm,
    resetForm,
    handleSubmit
  };
};
