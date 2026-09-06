// page/ModifyMemberBalance.tsx

import React from 'react';
import ModifyBalanceForm from '../components/ModifyBalanceForm';
import { useModifyMemberBalance } from '../hooks/useModifyMemberBalance';

const ModifyMemberBalance: React.FC = () => {
  const balanceProps = useModifyMemberBalance();

  return (
    <div className="modify-member-balance-page h-screen bg-[#f0f0f0] overflow-hidden">
      <ModifyBalanceForm {...balanceProps} />

      <style>{`
        html.dark .modify-member-balance-page { background-color: #000000 !important; }
      `}</style>
    </div>
  );
};

export default ModifyMemberBalance;
