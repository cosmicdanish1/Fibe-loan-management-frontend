import { useState } from 'react';
import { DemandPrintingData } from '../interfaces';

const useDemandPrinting = () => {
  const [formData, setFormData] = useState<DemandPrintingData>({
    divisionRO: '',
    branch: '',
    month: 'AUG',
    year: '2025',
    sortBy: 'Member No.',
    totalPages: '',
    outputType: 'Screen',
    printBalance: false,
    printEmpNo: false,
    printPrevBalance: false
  });

  const updateFormData = (field: keyof DemandPrintingData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generateCrystalReport = () => {
    console.log('Generating Crystal Report with data:', formData);
    // Implementation for generating crystal report
  };

  const exportToDetails = () => {
    console.log('Exporting to details with data:', formData);
    // Implementation for exporting to details
  };

  return {
    formData,
    updateFormData,
    generateCrystalReport,
    exportToDetails
  };
};

export default useDemandPrinting;
