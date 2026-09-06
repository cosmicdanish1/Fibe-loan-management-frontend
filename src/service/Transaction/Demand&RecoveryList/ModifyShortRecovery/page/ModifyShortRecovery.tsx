// page/ModifyShortRecovery.tsx

import React from 'react';
import { useModifyShortRecovery } from '../hook/useModifyShortRecovery';
import ModifyShortRecoveryForm from '../components/ModifyShortRecoveryForm';

const ModifyShortRecovery: React.FC = () => {
  const props = useModifyShortRecovery();

  return (
    <div className="msr-page h-screen bg-slate-50 overflow-hidden">
      <ModifyShortRecoveryForm {...props} />
      <style>{`
        html.dark .msr-page { background-color: #000000 !important; }
      `}</style>
    </div>
  );
};

export default ModifyShortRecovery;
