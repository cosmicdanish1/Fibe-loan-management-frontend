// page/ModifyFdAccount.tsx

import React from 'react';
import { useModifyFD } from '../hooks/useModifyFD';
import ModifyFDForm from '../components/ModifyFDForm';

const ModifyFdAccount: React.FC = () => {
  const modifyFDProps = useModifyFD();

  return (
    <div className="h-screen bg-slate-50 overflow-hidden">
      <ModifyFDForm {...modifyFDProps} />
    </div>
  );
};

export default ModifyFdAccount;
