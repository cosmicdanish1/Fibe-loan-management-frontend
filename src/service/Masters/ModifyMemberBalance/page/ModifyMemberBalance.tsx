// page/ModifyMemberBalance.tsx

import React from 'react';
import ModifyBalanceForm from '../components/ModifyBalanceForm';
import { useModifyMemberBalance } from '../hooks/useModifyMemberBalance';

const ModifyMemberBalance: React.FC = () => {
  const balanceProps = useModifyMemberBalance();

  return (
    <div className="h-screen bg-[#f0f0f0] overflow-hidden">
      <ModifyBalanceForm {...balanceProps} />
    </div>
  );
};

export default ModifyMemberBalance;
