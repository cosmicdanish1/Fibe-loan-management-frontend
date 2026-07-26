import { useState } from 'react';
import { ChangeMemberDivisionData } from '../interfaces';

const useChangeMemberDivision = () => {
  const [formData, setFormData] = useState<ChangeMemberDivisionData>({
    month: 'AUG',
    year: '2025',
    memberNo: '',
    branchNo: '',
    changeToNewBranch: ''
  });

  const updateFormData = (field: keyof ChangeMemberDivisionData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const processMemberTransfer = () => {
    console.log('Processing member transfer with data:', formData);
    // Implementation for processing member transfer
  };

  return {
    formData,
    updateFormData,
    processMemberTransfer
  };
};

export default useChangeMemberDivision;
