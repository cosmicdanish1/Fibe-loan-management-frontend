import { useState, useCallback } from 'react';
import type { MemberFormData } from '../interface/interface';
import { defaultFormValues } from '../interface/interface';

export const useMemberForm = (initialValues = defaultFormValues) => {
  const [formData, setFormData] = useState<MemberFormData>(initialValues);

  const handleInputChange = useCallback((field: keyof MemberFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(defaultFormValues);
  }, []);

  const setFormValues = useCallback((values: Partial<MemberFormData>) => {
    setFormData(prev => ({
      ...prev,
      ...values
    }));
  }, []);

  return {
    formData,
    handleInputChange,
    resetForm,
    setFormValues
  };
};

export default useMemberForm;
