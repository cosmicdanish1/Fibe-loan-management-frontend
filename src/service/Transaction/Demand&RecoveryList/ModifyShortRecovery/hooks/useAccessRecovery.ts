import { useState } from 'react';
import { AccessRecoveryData, MemberRecord } from '../interfaces';

const useAccessRecovery = () => {
  const [formData, setFormData] = useState<AccessRecoveryData>({
    selectedWing: '',
    currentRecord: 1,
    totalRecords: 0,
    memberData: []
  });

  const updateFormData = (field: keyof AccessRecoveryData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const navigateFirst = () => {
    updateFormData('currentRecord', 1);
  };

  const navigatePrevious = () => {
    if (formData.currentRecord > 1) {
      updateFormData('currentRecord', formData.currentRecord - 1);
    }
  };

  const navigateNext = () => {
    if (formData.currentRecord < formData.totalRecords) {
      updateFormData('currentRecord', formData.currentRecord + 1);
    }
  };

  const navigateLast = () => {
    updateFormData('currentRecord', formData.totalRecords);
  };

  const addNewRecord = () => {
    console.log('Adding new record...');
    // Implementation for adding a new record
  };

  const deleteRecord = () => {
    console.log('Deleting record...');
    // Implementation for deleting a record
  };

  const refreshData = () => {
    console.log('Refreshing data...');
    // Implementation for refreshing data
  };

  const saveChanges = () => {
    console.log('Saving changes...', formData);
    // Implementation for saving changes
  };

  return {
    formData,
    updateFormData,
    navigateFirst,
    navigatePrevious,
    navigateNext,
    navigateLast,
    addNewRecord,
    deleteRecord,
    refreshData,
    saveChanges
  };
};

export default useAccessRecovery;
