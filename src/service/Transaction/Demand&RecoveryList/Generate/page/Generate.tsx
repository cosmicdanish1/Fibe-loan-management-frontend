// page/Generate.tsx

import React from 'react';
import { useGenerate } from '../hook/useGenerate';
import GenerateForm from '../components/GenerateForm';

const Generate: React.FC = () => {
  const props = useGenerate();

  return (
    <div className="h-screen bg-slate-50 overflow-hidden">
      <GenerateForm {...props} />
    </div>
  );
};

export default Generate;
