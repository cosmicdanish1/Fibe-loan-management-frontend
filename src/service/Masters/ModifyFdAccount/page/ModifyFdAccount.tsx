// page/ModifyFdAccount.tsx

import React from 'react';
import { useModifyFD } from '../hooks/useModifyFD';
import ModifyFDForm from '../components/ModifyFDForm';

const ModifyFdAccount: React.FC = () => {
  const modifyFDProps = useModifyFD();

  return (
    <div className="modifyfd-page h-screen bg-slate-50 overflow-hidden">
      <ModifyFDForm {...modifyFDProps} />

      <style>{`
        html.dark .modifyfd-page { background-color: #000000 !important; }
      `}</style>
    </div>
  );
};

export default ModifyFdAccount;
