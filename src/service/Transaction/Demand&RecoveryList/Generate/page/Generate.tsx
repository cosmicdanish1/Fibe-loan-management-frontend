// page/Generate.tsx

import React from 'react';
import { useGenerate } from '../hook/useGenerate';
import GenerateForm from '../components/GenerateForm';

const Generate: React.FC = () => {
  const props = useGenerate();

  return <GenerateForm {...props} />;
};

export default Generate;
