// page/DesignationMaster.tsx

import React from 'react';
import { useDesignationMaster } from '../hooks/useDesignationMaster';
import DesignationForm from '../components/DesignationForm';

const DesignationMaster: React.FC = () => {
  const designationProps = useDesignationMaster();

  return <DesignationForm {...designationProps} />;
};

export default DesignationMaster;
