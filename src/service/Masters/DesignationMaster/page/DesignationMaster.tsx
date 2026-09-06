// page/DesignationMaster.tsx

import React from 'react';
import { useDesignationMaster } from '../hooks/useDesignationMaster';
import DesignationForm from '../components/DesignationForm';

const DesignationMaster: React.FC = () => {
  const designationProps = useDesignationMaster();

  return (
    <div className="designation-master-page h-screen bg-slate-50 overflow-hidden">
      <DesignationForm {...designationProps} />

      <style>{`
        html.dark .designation-master-page { background-color: #000000 !important; }
      `}</style>
    </div>
  );
};

export default DesignationMaster;
