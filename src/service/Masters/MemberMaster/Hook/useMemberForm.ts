import { useState, useCallback } from 'react';
import type { MemberFormData } from '../interface/interface';
import { defaultFormValues } from '../interface/interface';

export const useMemberForm = (initialValues = defaultFormValues) => {
  const [formData, setFormData] = useState<MemberFormData>(initialValues);

  const handleInputChange = useCallback((field: keyof MemberFormData, value: any) => {
    console.log(`🔄 handleInputChange called: ${field} = `, value);
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };
      console.log(`📝 New formData after ${field}:`, newData);
      return newData;
    });
  }, []);

  const resetForm = useCallback(() => {
    console.log('🔄 resetForm called');
    setFormData(defaultFormValues);
  }, []);

  const setFormValues = useCallback((values: Partial<MemberFormData>) => {
    console.log('🔄 setFormValues called with:', values);
    setFormData(prev => {
      const newData = {
        ...prev,
        ...values
      };
      console.log('📝 New complete formData:', newData);
      return newData;
    });
  }, []);

  return {
    formData,
    handleInputChange,
    resetForm,
    setFormValues
  };
};

export default useMemberForm;
