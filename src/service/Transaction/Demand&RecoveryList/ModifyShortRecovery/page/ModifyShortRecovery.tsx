// page/ModifyShortRecovery.tsx

import React from 'react';
import { useModifyShortRecovery } from '../hook/useModifyShortRecovery';
import ModifyShortRecoveryForm from '../components/ModifyShortRecoveryForm';

const ModifyShortRecovery: React.FC = () => {
  const props = useModifyShortRecovery();

  return (
    <div className="h-screen bg-slate-50 overflow-hidden">
      <ModifyShortRecoveryForm {...props} />
    </div>
  );
};

export default ModifyShortRecovery;
