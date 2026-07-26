// page/DesignationMaster.tsx

import React from 'react';
import { useDesignationMaster } from '../hooks/useDesignationMaster';
import DesignationForm from '../components/DesignationForm';

const DesignationMaster: React.FC = () => {
  const designationProps = useDesignationMaster();

  return (
    <div className="h-screen bg-slate-50 overflow-hidden">
      <DesignationForm {...designationProps} />
    </div>
  );
};

export default DesignationMaster;
