import { useState } from 'react';
import type { NomineeDetail } from '../types/nominee';

export const useNomineeForm = () => {
  const [nomineeDetails, setNomineeDetails] = useState<NomineeDetail[]>([{
    id: 1,
    name: '',
    address: '',
    age: '',
    relation: ''
  }]);

  const updateNomineeDetails = (index: number, field: keyof NomineeDetail, value: string | number) => {
    setNomineeDetails(prev => {
      // Create a new array to ensure immutability
      const updated = [...prev];
      
      // Check if index is valid
      if (index < 0 || index >= updated.length) {
        console.warn('Index out of bounds in updateNomineeDetails');
        return prev;
      }
      
      // Get the current nominee - we know it exists because of the check above
      const current = updated[index] as NomineeDetail;
      
      // Create a new object with all required fields
      const updatedNominee: NomineeDetail = {
        id: field === 'id' ? Number(value) : current.id,
        name: field === 'name' ? String(value) : current.name,
        address: field === 'address' ? String(value) : current.address,
        age: field === 'age' ? String(value) : current.age,
        relation: field === 'relation' ? String(value) : current.relation
      };
      
      updated[index] = updatedNominee;
      return updated;
    });
  };

  const addNomineeDetail = () => {
    setNomineeDetails(prev => [
      ...prev,
      {
        id: prev.length + 1,
        name: '',
        address: '',
        age: '',
        relation: ''
      }
    ]);
  };

  const removeNomineeDetail = (index: number) => {
    if (nomineeDetails.length > 1) {
      setNomineeDetails(prev => prev.filter((_, i) => i !== index));
    }
  };

  return {
    nomineeDetails,
    updateNomineeDetails,
    addNomineeDetail,
    removeNomineeDetail
  };
};
