// page/ModifyShortRecovery.tsx

import React from 'react';
import { useModifyShortRecovery } from '../hook/useModifyShortRecovery';
import ModifyShortRecoveryForm from '../components/ModifyShortRecoveryForm';

const ModifyShortRecovery: React.FC = () => {
  const props = useModifyShortRecovery();

  return <ModifyShortRecoveryForm {...props} />;
};

export default ModifyShortRecovery;
