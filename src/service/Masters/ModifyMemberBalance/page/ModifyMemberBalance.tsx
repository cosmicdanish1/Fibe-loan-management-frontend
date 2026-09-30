// page/ModifyMemberBalance.tsx

import React from 'react';
import ModifyBalanceForm from '../components/ModifyBalanceForm';
import { useModifyMemberBalance } from '../hooks/useModifyMemberBalance';

const ModifyMemberBalance: React.FC = () => {
  const balanceProps = useModifyMemberBalance();

  return <ModifyBalanceForm {...balanceProps} />;
};

export default ModifyMemberBalance;
