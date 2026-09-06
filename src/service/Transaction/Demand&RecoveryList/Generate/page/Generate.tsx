// page/Generate.tsx

import React from 'react';
import { useGenerate } from '../hook/useGenerate';
import GenerateForm from '../components/GenerateForm';

const Generate: React.FC = () => {
  const props = useGenerate();

  return (
    <div className="gen-demand-page h-screen bg-slate-50 overflow-hidden">
      <GenerateForm {...props} />
      <style>{`
        html.dark .gen-demand-page { background-color: #000000 !important; }
      `}</style>
    </div>
  );
};

export default Generate;
