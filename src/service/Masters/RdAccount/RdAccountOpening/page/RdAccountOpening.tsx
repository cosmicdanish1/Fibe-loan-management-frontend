// page/RdAccountOpening.tsx

import React from 'react';
import { useRDMaster } from '../hooks/useRDMaster';
import RDMasterForm from '../components/RDMasterForm';

const RdAccountOpening: React.FC = () => {
  const rdMasterProps = useRDMaster();

  return (
    <div className="h-screen bg-slate-50 overflow-hidden">
      <RDMasterForm {...rdMasterProps} />
    </div>
  );
};

export default RdAccountOpening;
