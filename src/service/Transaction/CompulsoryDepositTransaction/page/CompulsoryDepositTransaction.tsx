// page/CompulsoryDepositTransaction.tsx

import React from 'react';
import { useCompulsoryDeposit } from '../hook/useCompulsoryDeposit';
import CompulsoryDepositForm from '../components/CompulsoryDepositForm';

const CompulsoryDepositTransaction: React.FC = () => {
  const props = useCompulsoryDeposit();

  return <CompulsoryDepositForm {...props} />;
};

export default CompulsoryDepositTransaction;
